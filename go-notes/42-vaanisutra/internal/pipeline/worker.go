package pipeline

// ============================================================
// Worker Pool — Bounded Concurrency for Pipeline Processing
// ============================================================
// WHY a worker pool? Without it, submitting 10,000 transcripts
// would spawn 10,000 goroutines, each calling the AI service.
// Even though Go can handle millions of goroutines, the AI
// service has rate limits and the system has finite memory.
//
// A worker pool of N workers means at most N transcripts are
// processed concurrently. The rest wait in the channel (queue)
// until a worker is free. This is BOUNDED CONCURRENCY.
//
// At Jio, the worker count is tuned based on:
// - CPU cores available (typically 2x cores)
// - AI service rate limits
// - Memory per worker (each holds a transcript + results)
// - Latency requirements (more workers = lower queue wait)
//
// The sweet spot is usually 4-8 workers for a single instance,
// with horizontal scaling across multiple instances for higher
// throughput.
// ============================================================

import (
	"context"
	"log"
	"sync"
	"sync/atomic"
	"time"
)

// WorkerPool manages a pool of pipeline workers.
// WHY a separate struct? It encapsulates worker lifecycle
// management (start, stop, monitoring) separately from the
// pipeline's processing logic. Single responsibility principle.
type WorkerPool struct {
	// ──────────────────────────────────────────────────────────────
	// Pool configuration
	// WHY configurable size? Different environments need different
	// settings. Dev: 2 workers. Staging: 4. Production: 8-16.
	// ──────────────────────────────────────────────────────────────
	size     int
	pipeline *Pipeline

	// ──────────────────────────────────────────────────────────────
	// Lifecycle tracking
	// WHY WaitGroup + atomic? WaitGroup ensures graceful shutdown
	// (wait for all workers). Atomic counter tracks active workers
	// for monitoring without locks.
	// ──────────────────────────────────────────────────────────────
	wg           sync.WaitGroup
	activeCount  atomic.Int32
	startTime    time.Time
	shutdownOnce sync.Once
}

// NewWorkerPool creates a worker pool for the given pipeline.
func NewWorkerPool(size int, pipeline *Pipeline) *WorkerPool {
	return &WorkerPool{
		size:     size,
		pipeline: pipeline,
	}
}

// ──────────────────────────────────────────────────────────────
// Start launches all workers in the pool.
//
// WHY separate goroutines per worker? Each worker independently
// reads from the pipeline's input channel. Go's channel semantics
// guarantee that each transcript is delivered to exactly one
// worker (no duplicates, no lost messages). This is the
// COMPETING CONSUMERS pattern.
//
// Think of it like a Jio call center: multiple agents (workers)
// sit by their phones (channel). When a call comes in, exactly
// one agent picks it up. The others keep waiting.
// ──────────────────────────────────────────────────────────────
func (wp *WorkerPool) Start(ctx context.Context) {
	wp.startTime = time.Now()
	log.Printf("[WorkerPool] Starting %d workers", wp.size)

	for i := 0; i < wp.size; i++ {
		wp.wg.Add(1)
		workerID := i + 1

		go func(id int) {
			defer wp.wg.Done()
			wp.activeCount.Add(1)
			defer wp.activeCount.Add(-1)

			log.Printf("[WorkerPool] Worker %d online", id)
			wp.runWorker(ctx, id)
			log.Printf("[WorkerPool] Worker %d offline", id)
		}(workerID)
	}
}

// ──────────────────────────────────────────────────────────────
// runWorker is the core loop for each worker.
// WHY select with ctx.Done? It allows workers to respond to
// shutdown signals even when waiting for new transcripts.
// Without this, a worker blocked on channel receive would
// not notice the context cancellation.
// (Remember ch16 on select? And ch18 on context cancellation?)
// ──────────────────────────────────────────────────────────────
func (wp *WorkerPool) runWorker(ctx context.Context, id int) {
	for {
		select {
		case <-ctx.Done():
			// Context cancelled — drain remaining items from the channel
			// WHY drain? During graceful shutdown, we want to process
			// any transcripts already in the queue. Closing the context
			// just means "stop accepting new work after the queue is empty."
			wp.drainWorker(id)
			return

		case transcript, ok := <-wp.pipeline.inputCh:
			if !ok {
				// Channel closed — pipeline is shutting down
				log.Printf("[WorkerPool] Worker %d: input channel closed", id)
				return
			}

			// Process the transcript
			wp.pipeline.queued.Add(-1)
			wp.pipeline.processing.Add(1)

			startTime := time.Now()
			log.Printf("[WorkerPool] Worker %d processing %s", id, transcript.ID)

			result, err := wp.pipeline.processConcurrent(ctx, transcript)
			if err != nil {
				log.Printf("[WorkerPool] Worker %d error on %s: %v", id, transcript.ID, err)
				wp.pipeline.processing.Add(-1)
				wp.pipeline.failed.Add(1)
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
				if err := wp.pipeline.vectorStore.Upsert(result.TranscriptID, result.Vector, payload); err != nil {
					log.Printf("[WorkerPool] Worker %d vector store error: %v", id, err)
				}
			}

			// Save result
			wp.pipeline.results.Store(transcript.ID, result)
			wp.pipeline.processing.Add(-1)
			wp.pipeline.completed.Add(1)

			log.Printf("[WorkerPool] Worker %d completed %s in %v", id, transcript.ID, result.ProcessingDuration)
		}
	}
}

// ──────────────────────────────────────────────────────────────
// drainWorker processes remaining items after context cancel.
// WHY drain separately? We want to finish items already in the
// queue but stop accepting new ones. This prevents data loss
// during shutdown while still allowing the process to exit.
// ──────────────────────────────────────────────────────────────
func (wp *WorkerPool) drainWorker(id int) {
	for {
		select {
		case transcript, ok := <-wp.pipeline.inputCh:
			if !ok {
				return
			}
			log.Printf("[WorkerPool] Worker %d draining %s", id, transcript.ID)

			wp.pipeline.queued.Add(-1)
			wp.pipeline.processing.Add(1)

			// Use background context for drain — the original is cancelled
			result, err := wp.pipeline.processConcurrent(context.Background(), transcript)
			if err != nil {
				wp.pipeline.processing.Add(-1)
				wp.pipeline.failed.Add(1)
				continue
			}

			result.ProcessingDuration = time.Duration(0)
			wp.pipeline.results.Store(transcript.ID, result)
			wp.pipeline.processing.Add(-1)
			wp.pipeline.completed.Add(1)

		default:
			// No more items in the queue
			return
		}
	}
}

// ──────────────────────────────────────────────────────────────
// Shutdown gracefully stops all workers.
// WHY sync.Once? Shutdown might be called from multiple places
// (signal handler, test cleanup). Once ensures the cleanup
// logic runs exactly once — preventing double-close panics.
// ──────────────────────────────────────────────────────────────
func (wp *WorkerPool) Shutdown() {
	wp.shutdownOnce.Do(func() {
		log.Println("[WorkerPool] Initiating shutdown...")
		wp.wg.Wait()
		log.Printf("[WorkerPool] All %d workers stopped", wp.size)
	})
}

// ActiveWorkers returns the current number of active workers.
func (wp *WorkerPool) ActiveWorkers() int32 {
	return wp.activeCount.Load()
}

// PoolSize returns the configured pool size.
func (wp *WorkerPool) PoolSize() int {
	return wp.size
}

// Uptime returns the duration since the pool started.
func (wp *WorkerPool) Uptime() time.Duration {
	return time.Since(wp.startTime)
}
