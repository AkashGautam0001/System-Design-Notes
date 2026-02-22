package pipeline

// ============================================================
// Pipeline — The Heart of VaaniSutra (THE STAR OF CHAPTER 42)
// ============================================================
// This is where Go's concurrency model shines brightest. The
// pipeline combines THREE concurrency patterns:
//
// 1. CHANNEL PIPELINE: Transcripts flow from HTTP handler
//    through a channel to workers — decoupling submission
//    from processing. (Remember ch15 on channels?)
//
// 2. WORKER POOL: A fixed number of goroutines process
//    transcripts from the shared channel — bounded concurrency
//    prevents resource exhaustion. (Remember ch28?)
//
// 3. FAN-OUT/FAN-IN: Within each worker, the three AI analyses
//    (sentiment, entities, summary) run concurrently and their
//    results are collected before proceeding. (This is new!)
//
// At Jio's scale, this pipeline processes millions of call
// transcripts per day. The channel acts as a buffer (backpressure),
// workers provide throughput, and fan-out/fan-in reduces latency
// per transcript.
// ============================================================

import (
	"context"
	"fmt"
	"log"
	"sync"
	"sync/atomic"
	"time"

	"vaanisutra/internal/ai"
	"vaanisutra/internal/model"
	"vaanisutra/internal/vectordb"
)

// Pipeline orchestrates transcript processing through AI stages.
type Pipeline struct {
	// ──────────────────────────────────────────────────────────────
	// Input channel — the queue connecting HTTP handlers to workers.
	// WHY buffered channel? It provides backpressure. When the
	// channel is full, new submissions are rejected with "queue_full"
	// instead of blocking the HTTP handler forever.
	// (Remember ch15: buffered vs unbuffered channels?)
	// ──────────────────────────────────────────────────────────────
	inputCh chan *model.Transcript

	// AI client for text analysis
	aiClient *ai.AIClient

	// Vector store for embedding storage and search
	vectorStore vectordb.VectorStore

	// ──────────────────────────────────────────────────────────────
	// Results store — processed transcripts keyed by ID.
	// WHY sync.Map? It's optimized for the read-heavy, write-rare
	// pattern: many GET requests to read results, but each transcript
	// is written only once. (Remember ch28 on sync.Map?)
	// ──────────────────────────────────────────────────────────────
	results sync.Map

	// ──────────────────────────────────────────────────────────────
	// Metrics — atomic counters for lock-free monitoring.
	// WHY atomic instead of mutex? Metrics are updated on every
	// transcript (hot path). Atomic operations are ~10x faster
	// than mutex lock/unlock for simple increments.
	// (Remember ch28 on sync/atomic?)
	// ──────────────────────────────────────────────────────────────
	queued     atomic.Int64
	processing atomic.Int64
	completed  atomic.Int64
	failed     atomic.Int64

	// Configuration
	workerCount int
	embeddingDim int

	// Lifecycle management
	wg        sync.WaitGroup
	startTime time.Time
}

// ──────────────────────────────────────────────────────────────
// NewPipeline creates a new processing pipeline.
// WHY separate New from Start? It follows Go convention and lets
// us configure the pipeline before starting workers — useful for
// testing.
// ──────────────────────────────────────────────────────────────
func NewPipeline(aiClient *ai.AIClient, vectorStore vectordb.VectorStore, workerCount, queueSize int) *Pipeline {
	return &Pipeline{
		inputCh:      make(chan *model.Transcript, queueSize),
		aiClient:     aiClient,
		vectorStore:  vectorStore,
		workerCount:  workerCount,
		embeddingDim: 256,
	}
}

// ──────────────────────────────────────────────────────────────
// Start launches worker goroutines that read from the input
// channel and process transcripts.
// WHY context? It enables graceful shutdown — when the context
// is cancelled, workers finish their current transcript and stop.
// (Remember ch18 on context?)
// ──────────────────────────────────────────────────────────────
func (p *Pipeline) Start(ctx context.Context) {
	p.startTime = time.Now()

	for i := 0; i < p.workerCount; i++ {
		p.wg.Add(1)
		workerID := i + 1
		go func(id int) {
			defer p.wg.Done()
			log.Printf("[Pipeline] Worker %d started", id)
			p.processWorker(ctx, id)
			log.Printf("[Pipeline] Worker %d stopped", id)
		}(workerID)
	}
}

// ──────────────────────────────────────────────────────────────
// Submit sends a transcript to the pipeline for processing.
// WHY non-blocking with select + default? If the queue is full,
// we return an error immediately instead of blocking the HTTP
// handler. This is BACKPRESSURE — the pipeline tells the caller
// "I'm overloaded, try again later."
// (Remember ch16 on select with default?)
// ──────────────────────────────────────────────────────────────
func (p *Pipeline) Submit(transcript *model.Transcript) error {
	select {
	case p.inputCh <- transcript:
		p.queued.Add(1)
		return nil
	default:
		return fmt.Errorf("pipeline queue is full (capacity: %d)", cap(p.inputCh))
	}
}

// ──────────────────────────────────────────────────────────────
// GetResult retrieves a processed transcript by ID.
// ──────────────────────────────────────────────────────────────
func (p *Pipeline) GetResult(id string) (*model.ProcessedTranscript, bool) {
	val, ok := p.results.Load(id)
	if !ok {
		return nil, false
	}
	result, ok := val.(*model.ProcessedTranscript)
	return result, ok
}

// ──────────────────────────────────────────────────────────────
// GetAllResults returns all processed transcripts.
// WHY iterate sync.Map? For the list endpoint. In production,
// Jio would use a proper database — sync.Map is fine for our
// educational purposes.
// ──────────────────────────────────────────────────────────────
func (p *Pipeline) GetAllResults() []*model.ProcessedTranscript {
	var results []*model.ProcessedTranscript
	p.results.Range(func(key, value interface{}) bool {
		if result, ok := value.(*model.ProcessedTranscript); ok {
			results = append(results, result)
		}
		return true
	})
	return results
}

// ──────────────────────────────────────────────────────────────
// Status returns pipeline metrics for monitoring.
// WHY use atomic Load? It gives a consistent snapshot of each
// counter without locks. The values might not be perfectly
// consistent with each other (queued might be read before
// processing is updated), but for monitoring this is acceptable.
// ──────────────────────────────────────────────────────────────
func (p *Pipeline) Status() model.PipelineStatus {
	return model.PipelineStatus{
		Queued:      p.queued.Load(),
		Processing:  p.processing.Load(),
		Completed:   p.completed.Load(),
		Failed:      p.failed.Load(),
		WorkerCount: p.workerCount,
		Uptime:      time.Since(p.startTime).Round(time.Second),
	}
}

// ──────────────────────────────────────────────────────────────
// Shutdown gracefully stops the pipeline.
// WHY close + WaitGroup? Closing the channel signals workers to
// stop accepting new work (range loop exits). WaitGroup ensures
// we wait for all in-flight transcripts to finish processing.
// This is the GRACEFUL SHUTDOWN pattern from ch28.
// ──────────────────────────────────────────────────────────────
func (p *Pipeline) Shutdown() {
	close(p.inputCh)
	p.wg.Wait()
}

// ============================================================
// Worker — Sequential Processing (Simple Version)
// ============================================================

// ──────────────────────────────────────────────────────────────
// processWorker is the main worker loop. Each worker reads
// transcripts from the input channel and processes them through
// all AI stages sequentially.
//
// WHY range over channel? When the channel is closed (during
// shutdown), the range loop exits naturally — no special
// shutdown logic needed. This is idiomatic Go. (Remember ch15?)
// ──────────────────────────────────────────────────────────────
func (p *Pipeline) processWorker(ctx context.Context, workerID int) {
	for transcript := range p.inputCh {
		// Decrement queued, increment processing
		p.queued.Add(-1)
		p.processing.Add(1)

		startTime := time.Now()
		log.Printf("[Worker %d] Processing transcript %s", workerID, transcript.ID)

		// Process using fan-out/fan-in for parallel AI stages
		result, err := p.processConcurrent(ctx, transcript)
		if err != nil {
			log.Printf("[Worker %d] Error processing %s: %v", workerID, transcript.ID, err)
			p.processing.Add(-1)
			p.failed.Add(1)
			continue
		}

		result.ProcessingDuration = time.Since(startTime)

		// Store in vector database
		if result.Vector != nil {
			payload := map[string]interface{}{
				"transcript_id": result.TranscriptID,
				"summary":       result.Summary,
				"sentiment":     result.Sentiment.Label,
				"score":         result.Sentiment.Score,
				"caller_id":     result.CallerID,
				"agent_id":      result.AgentID,
				"keywords":      result.Keywords,
				"timestamp":     result.Timestamp.Format(time.RFC3339),
			}
			if err := p.vectorStore.Upsert(result.TranscriptID, result.Vector, payload); err != nil {
				log.Printf("[Worker %d] Vector store error for %s: %v", workerID, transcript.ID, err)
				// Continue anyway — vector storage failure is not fatal
			}
		}

		// Store result in memory
		p.results.Store(transcript.ID, result)

		// Update metrics
		p.processing.Add(-1)
		p.completed.Add(1)

		log.Printf("[Worker %d] Completed %s in %v", workerID, transcript.ID, result.ProcessingDuration)
	}
}

// ============================================================
// Fan-Out/Fan-In — Parallel AI Processing (THE KEY PATTERN!)
// ============================================================

// ──────────────────────────────────────────────────────────────
// processConcurrent runs AI analysis stages in parallel using
// the fan-out/fan-in pattern.
//
// SEQUENTIAL approach (DON'T DO THIS):
//   sentiment = AnalyzeSentiment(text)  // 50ms
//   entities  = ExtractEntities(text)   // 50ms
//   summary   = Summarize(text)         // 50ms
//   keywords  = ExtractKeywords(text)   // 30ms
//   Total: 180ms per transcript
//
// FAN-OUT/FAN-IN approach (DO THIS):
//   go AnalyzeSentiment(text)  ─┐
//   go ExtractEntities(text)   ─┼─ wait for all ─> 50ms
//   go Summarize(text)         ─┤
//   go ExtractKeywords(text)   ─┘
//   Total: 50ms per transcript (3.6x faster!)
//
// At Jio's scale of 1 million transcripts/day:
//   Sequential: 1,000,000 * 180ms = 50 hours
//   Fan-out:    1,000,000 *  50ms = 14 hours
//   That is 36 hours saved per day!
// ──────────────────────────────────────────────────────────────
func (p *Pipeline) processConcurrent(ctx context.Context, transcript *model.Transcript) (*model.ProcessedTranscript, error) {
	result := &model.ProcessedTranscript{
		ID:           transcript.ID,
		TranscriptID: transcript.ID,
		CallerID:     transcript.CallerID,
		AgentID:      transcript.AgentID,
		Content:      transcript.Content,
		Duration:     transcript.Duration,
		Timestamp:    transcript.Timestamp,
		Language:     transcript.Language,
		ProcessedAt:  time.Now(),
	}

	text := transcript.Content

	// ──────────────────────────────────────────────────────────
	// FAN-OUT: Launch goroutines for independent AI stages.
	// Each goroutine sends its result to a dedicated channel.
	// WHY buffered channels of size 1? So the goroutine can send
	// its result and exit without waiting for the receiver.
	// (Remember ch15: buffered channels prevent goroutine leaks?)
	// ──────────────────────────────────────────────────────────

	type sentimentOut struct {
		result model.SentimentResult
		err    error
	}
	type entitiesOut struct {
		result []model.Entity
		err    error
	}
	type summaryOut struct {
		result string
		err    error
	}
	type keywordsOut struct {
		result []string
		err    error
	}

	sentimentCh := make(chan sentimentOut, 1)
	entitiesCh := make(chan entitiesOut, 1)
	summaryCh := make(chan summaryOut, 1)
	keywordsCh := make(chan keywordsOut, 1)

	// Fan-out: launch all stages concurrently
	go func() {
		r, err := p.aiClient.AnalyzeSentiment(ctx, text)
		sentimentCh <- sentimentOut{r, err}
	}()

	go func() {
		r, err := p.aiClient.ExtractEntities(ctx, text)
		entitiesCh <- entitiesOut{r, err}
	}()

	go func() {
		r, err := p.aiClient.Summarize(ctx, text)
		summaryCh <- summaryOut{r, err}
	}()

	go func() {
		r, err := p.aiClient.ExtractKeywords(ctx, text)
		keywordsCh <- keywordsOut{r, err}
	}()

	// ──────────────────────────────────────────────────────────
	// FAN-IN: Collect results from all stages.
	// WHY separate receives? We need all four results before
	// proceeding. Each receive blocks until its stage completes.
	// The total wait time = max(sentiment, entities, summary,
	// keywords) instead of the sum.
	// ──────────────────────────────────────────────────────────

	// Collect sentiment
	sentimentResult := <-sentimentCh
	if sentimentResult.err != nil {
		log.Printf("[Pipeline] Sentiment error for %s: %v (using default)", transcript.ID, sentimentResult.err)
		result.Sentiment = model.SentimentResult{Score: 0, Label: "Neutral", Confidence: 0}
	} else {
		result.Sentiment = sentimentResult.result
	}

	// Collect entities
	entitiesResult := <-entitiesCh
	if entitiesResult.err != nil {
		log.Printf("[Pipeline] Entity extraction error for %s: %v (using empty)", transcript.ID, entitiesResult.err)
		result.Entities = []model.Entity{}
	} else {
		result.Entities = entitiesResult.result
	}

	// Collect summary
	summaryResult := <-summaryCh
	if summaryResult.err != nil {
		log.Printf("[Pipeline] Summary error for %s: %v (using first 100 chars)", transcript.ID, summaryResult.err)
		if len(text) > 100 {
			result.Summary = text[:100] + "..."
		} else {
			result.Summary = text
		}
	} else {
		result.Summary = summaryResult.result
	}

	// Collect keywords
	keywordsResult := <-keywordsCh
	if keywordsResult.err != nil {
		log.Printf("[Pipeline] Keywords error for %s: %v (using empty)", transcript.ID, keywordsResult.err)
		result.Keywords = []string{}
	} else {
		result.Keywords = keywordsResult.result
	}

	// ──────────────────────────────────────────────────────────
	// SEQUENTIAL STAGE: Generate embedding (depends on summary
	// and keywords for better vector representation).
	// WHY sequential here? The embedding should incorporate the
	// summary, which is only available after the fan-in above.
	// Not everything should be parallel — dependencies matter!
	// ──────────────────────────────────────────────────────────
	embeddingText := text + " " + result.Summary
	for _, kw := range result.Keywords {
		embeddingText += " " + kw
	}

	embedding, err := p.aiClient.GenerateEmbedding(ctx, embeddingText, p.embeddingDim)
	if err != nil {
		log.Printf("[Pipeline] Embedding error for %s: %v", transcript.ID, err)
		// No embedding means no vector search — but other results are still valid
	} else {
		result.Vector = embedding
	}

	return result, nil
}
