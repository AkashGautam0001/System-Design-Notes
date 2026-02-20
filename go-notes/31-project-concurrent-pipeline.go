// ============================================================
//  FILE 31 : Project — Concurrent Pipeline ("DataYantra")
// ============================================================
//  Topic  : goroutines, channels, sync, context, time,
//           math/rand, fmt, fan-out/fan-in, pipeline metrics
//
//  WHY THIS MATTERS:
//  Real-world Go shines in concurrent data processing. ETL
//  jobs, log processors, stream transformers — they all follow
//  the pipeline pattern: generate -> transform -> filter ->
//  aggregate. Mastering this pattern means you can process
//  millions of records with bounded memory and configurable
//  parallelism, all without a single data race.
// ============================================================

// ============================================================
// STORY: DataYantra — The Textile Mill Pipeline
// The Surat textile mill processes fabric through a pipeline:
// weaving (generate raw fabric) -> dyeing (transform with
// colour) -> printing (apply patterns, fan-out to multiple
// looms) -> quality check (filter defects) -> packaging
// (aggregate final output). A foreman (context) can halt
// the entire mill with one signal. Metrics track every
// fabric bolt's journey through the yantra.
// ============================================================

package main

import (
	"context"
	"fmt"
	"math/rand"
	"strings"
	"sync"
	"time"
)

// ============================================================
// SECTION 1 — Data Types
// ============================================================
// WHY: Clear data types make pipeline stages composable.
// Each stage receives and returns the same FabricBolt type, so
// stages can be reordered or removed without refactoring.

// FabricBolt represents a single fabric record flowing through the pipeline.
type FabricBolt struct {
	ID          int
	RawValue    int
	Transformed float64
	Label       string
	ProcessedBy string
	Timestamp   time.Time
}

// PipelineConfig controls loom counts and thresholds.
type PipelineConfig struct {
	ItemCount       int     // how many fabric bolts to weave
	TransformWorkers int    // fan-out width for dyeing stage
	FilterThreshold  float64 // minimum quality score to keep
}

// PipelineMetrics tracks throughput and timing.
type PipelineMetrics struct {
	mu              sync.Mutex
	Generated       int
	Transformed     int
	Passed          int
	Rejected        int
	Aggregated      int
	StartTime       time.Time
	StageTimings    map[string]time.Duration
}

// RecordStage records how long a pipeline stage took.
func (m *PipelineMetrics) RecordStage(name string, d time.Duration) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.StageTimings[name] = d
}

// IncrSafe increments a counter safely.
func (m *PipelineMetrics) IncrSafe(counter *int, n int) {
	m.mu.Lock()
	defer m.mu.Unlock()
	*counter += n
}

// Print displays a summary of pipeline metrics.
func (m *PipelineMetrics) Print() {
	m.mu.Lock()
	defer m.mu.Unlock()
	totalDuration := time.Since(m.StartTime)
	throughput := 0.0
	if totalDuration.Seconds() > 0 {
		throughput = float64(m.Generated) / totalDuration.Seconds()
	}

	fmt.Println("\n  ======================================")
	fmt.Println("       DataYantra Pipeline Metrics")
	fmt.Println("  ======================================")
	fmt.Printf("  Bolts woven        : %d\n", m.Generated)
	fmt.Printf("  Bolts dyed         : %d\n", m.Transformed)
	fmt.Printf("  Bolts passed QC    : %d\n", m.Passed)
	fmt.Printf("  Bolts rejected     : %d\n", m.Rejected)
	fmt.Printf("  Bolts packaged     : %d\n", m.Aggregated)
	fmt.Printf("  Total duration     : %s\n", totalDuration.Round(time.Millisecond))
	fmt.Printf("  Throughput         : %.0f bolts/sec\n", throughput)
	fmt.Println("  --- Stage Timings ---")
	for stage, d := range m.StageTimings {
		fmt.Printf("  %-20s : %s\n", stage, d.Round(time.Millisecond))
	}
	fmt.Println("  ======================================")
}

// ============================================================
// SECTION 2 — Stage 1: Weaving (Generate)
// ============================================================
// WHY: The weaving stage is the pipeline's source. It creates
// fabric bolts and sends them on a channel, closing it when
// done. This is the standard "producer" pattern in Go.

func weave(ctx context.Context, cfg PipelineConfig, metrics *PipelineMetrics) <-chan FabricBolt {
	out := make(chan FabricBolt)
	go func() {
		defer close(out)
		start := time.Now()
		for i := 1; i <= cfg.ItemCount; i++ {
			bolt := FabricBolt{
				ID:        i,
				RawValue:  rand.Intn(100) + 1,
				Timestamp: time.Now(),
			}
			select {
			case out <- bolt:
				metrics.IncrSafe(&metrics.Generated, 1)
			case <-ctx.Done():
				fmt.Printf("    [Weaving] Cancelled after %d bolts\n", i-1)
				metrics.RecordStage("weaving", time.Since(start))
				return
			}
		}
		metrics.RecordStage("weaving", time.Since(start))
		fmt.Printf("    [Weaving] Produced %d fabric bolts\n", cfg.ItemCount)
	}()
	return out
}

// ============================================================
// SECTION 3 — Stage 2: Dyeing (Fan-Out Transform)
// ============================================================
// WHY: Fan-out launches N looms reading from the same input
// channel. Fan-in merges their outputs into one channel. This
// is THE Go concurrency pattern for CPU-bound or I/O-bound
// parallel work.

func dye(ctx context.Context, in <-chan FabricBolt, loomCount int, metrics *PipelineMetrics) <-chan FabricBolt {
	out := make(chan FabricBolt)
	var wg sync.WaitGroup
	start := time.Now()

	for w := 0; w < loomCount; w++ {
		wg.Add(1)
		loomID := fmt.Sprintf("loom-%d", w+1)
		go func(id string) {
			defer wg.Done()
			count := 0
			for bolt := range in {
				select {
				case <-ctx.Done():
					return
				default:
				}
				// Simulate dyeing: apply colour multiplier + noise.
				// WHY: Even trivial math simulates a real transformation.
				multiplier := float64(rand.Intn(5) + 1)
				bolt.Transformed = float64(bolt.RawValue) * multiplier / 10.0
				bolt.ProcessedBy = id
				// Assign a grade based on dye quality.
				switch {
				case bolt.Transformed >= 30:
					bolt.Label = "PREMIUM"
				case bolt.Transformed >= 15:
					bolt.Label = "STANDARD"
				default:
					bolt.Label = "ECONOMY"
				}
				// Simulate variable processing time.
				time.Sleep(time.Duration(rand.Intn(2)) * time.Millisecond)
				count++
				metrics.IncrSafe(&metrics.Transformed, 1)
				select {
				case out <- bolt:
				case <-ctx.Done():
					return
				}
			}
			fmt.Printf("    [Dyeing] %s processed %d bolts\n", id, count)
		}(loomID)
	}

	// Fan-in: close 'out' once all looms finish.
	go func() {
		wg.Wait()
		metrics.RecordStage("dyeing", time.Since(start))
		close(out)
	}()
	return out
}

// ============================================================
// SECTION 4 — Stage 3: Quality Check (Filter)
// ============================================================
// WHY: Quality check is a pure function on a stream — bolts
// that don't meet the threshold are rejected. This stage shows
// how a pipeline can shrink the data volume between stages.

func qualityCheck(ctx context.Context, in <-chan FabricBolt, threshold float64, metrics *PipelineMetrics) <-chan FabricBolt {
	out := make(chan FabricBolt)
	go func() {
		defer close(out)
		start := time.Now()
		passed, rejected := 0, 0
		for bolt := range in {
			select {
			case <-ctx.Done():
				metrics.RecordStage("qualityCheck", time.Since(start))
				return
			default:
			}
			if bolt.Transformed >= threshold {
				passed++
				metrics.IncrSafe(&metrics.Passed, 1)
				select {
				case out <- bolt:
				case <-ctx.Done():
					metrics.RecordStage("qualityCheck", time.Since(start))
					return
				}
			} else {
				rejected++
				metrics.IncrSafe(&metrics.Rejected, 1)
			}
		}
		metrics.RecordStage("qualityCheck", time.Since(start))
		fmt.Printf("    [QualityCheck] Passed: %d, Rejected: %d (threshold: %.1f)\n",
			passed, rejected, threshold)
	}()
	return out
}

// ============================================================
// SECTION 5 — Stage 4: Packaging (Aggregate)
// ============================================================
// WHY: The final stage consumes the stream and produces a
// summary. This is the "reduce" step — collecting results
// into a single packaging report.

// PackagingResult holds the final summary.
type PackagingResult struct {
	TotalItems  int
	SumValues   float64
	AvgValue    float64
	MinValue    float64
	MaxValue    float64
	GradeCounts map[string]int
	LoomCounts  map[string]int
}

func packageBolts(ctx context.Context, in <-chan FabricBolt, metrics *PipelineMetrics) PackagingResult {
	start := time.Now()
	result := PackagingResult{
		MinValue:    1<<63 - 1, // large initial value
		GradeCounts: make(map[string]int),
		LoomCounts:  make(map[string]int),
	}

	for bolt := range in {
		select {
		case <-ctx.Done():
			break
		default:
		}
		result.TotalItems++
		result.SumValues += bolt.Transformed
		if bolt.Transformed < result.MinValue {
			result.MinValue = bolt.Transformed
		}
		if bolt.Transformed > result.MaxValue {
			result.MaxValue = bolt.Transformed
		}
		result.GradeCounts[bolt.Label]++
		result.LoomCounts[bolt.ProcessedBy]++
		metrics.IncrSafe(&metrics.Aggregated, 1)
	}

	if result.TotalItems > 0 {
		result.AvgValue = result.SumValues / float64(result.TotalItems)
	} else {
		result.MinValue = 0
	}
	metrics.RecordStage("packaging", time.Since(start))
	fmt.Printf("    [Packaging] Packaged %d bolts\n", result.TotalItems)
	return result
}

// ============================================================
// SECTION 6 — Pipeline Runner
// ============================================================
// WHY: A single RunPipeline function wires all stages together.
// The caller only specifies config; the runner handles channels,
// goroutines, and metrics.

func RunPipeline(cfg PipelineConfig) (PackagingResult, *PipelineMetrics) {
	metrics := &PipelineMetrics{
		StartTime:    time.Now(),
		StageTimings: make(map[string]time.Duration),
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	fmt.Printf("  Pipeline config: %d bolts, %d looms, QC threshold %.1f\n",
		cfg.ItemCount, cfg.TransformWorkers, cfg.FilterThreshold)
	fmt.Println("  Starting textile pipeline stages...")

	// Wire stages: weave -> dye -> qualityCheck -> package
	stage1 := weave(ctx, cfg, metrics)
	stage2 := dye(ctx, stage1, cfg.TransformWorkers, metrics)
	stage3 := qualityCheck(ctx, stage2, cfg.FilterThreshold, metrics)
	result := packageBolts(ctx, stage3, metrics) // blocks until done

	return result, metrics
}

// ============================================================
// SECTION 7 — Pipeline with Cancellation Demo
// ============================================================
// WHY: Demonstrating context cancellation proves the pipeline
// drains gracefully. This is critical for production services
// that must shut down cleanly.

func RunPipelineWithCancel(cfg PipelineConfig, cancelAfter time.Duration) *PipelineMetrics {
	metrics := &PipelineMetrics{
		StartTime:    time.Now(),
		StageTimings: make(map[string]time.Duration),
	}

	ctx, cancel := context.WithTimeout(context.Background(), cancelAfter)
	defer cancel()

	fmt.Printf("  Pipeline config: %d bolts, cancel after %s\n",
		cfg.ItemCount, cancelAfter)
	fmt.Println("  Starting pipeline (will be cancelled)...")

	stage1 := weave(ctx, cfg, metrics)
	stage2 := dye(ctx, stage1, cfg.TransformWorkers, metrics)
	stage3 := qualityCheck(ctx, stage2, cfg.FilterThreshold, metrics)

	// Drain remaining bolts.
	count := 0
	for range stage3 {
		count++
		metrics.IncrSafe(&metrics.Aggregated, 1)
	}
	fmt.Printf("    [Cancelled Pipeline] Packaged %d bolts before shutdown\n", count)
	return metrics
}

// ============================================================
// SECTION 8 — Result Printer
// ============================================================

func printResult(result PackagingResult) {
	fmt.Println("\n  --- Packaging Results ---")
	fmt.Printf("  Total bolts  : %d\n", result.TotalItems)
	fmt.Printf("  Sum values   : %.2f\n", result.SumValues)
	fmt.Printf("  Avg value    : %.2f\n", result.AvgValue)
	fmt.Printf("  Min value    : %.2f\n", result.MinValue)
	fmt.Printf("  Max value    : %.2f\n", result.MaxValue)
	fmt.Println("  Grade distribution:")
	for grade, count := range result.GradeCounts {
		fmt.Printf("    %-10s : %d\n", grade, count)
	}
	fmt.Println("  Loom distribution:")
	for loom, count := range result.LoomCounts {
		fmt.Printf("    %-10s : %d\n", loom, count)
	}
}

// ============================================================
// SECTION 9 — Main (Self-Test)
// ============================================================

func main() {
	fmt.Println("============================================================")
	fmt.Println("  DataYantra — Surat Textile Mill Pipeline (Self-Test Demo)")
	fmt.Println("============================================================")

	// Seed random for reproducibility across different Go versions
	// that still use the global rand source.

	// --- Run 1: Small batch, 3 looms ---
	fmt.Printf("\n%s\n", strings.Repeat("=", 60))
	fmt.Println("  RUN 1: 50 bolts, 3 looms, QC threshold 10.0")
	fmt.Printf("%s\n", strings.Repeat("=", 60))

	result1, metrics1 := RunPipeline(PipelineConfig{
		ItemCount:        50,
		TransformWorkers: 3,
		FilterThreshold:  10.0,
	})
	printResult(result1)
	metrics1.Print()

	// --- Run 2: Larger batch, 5 looms, stricter QC ---
	fmt.Printf("\n%s\n", strings.Repeat("=", 60))
	fmt.Println("  RUN 2: 200 bolts, 5 looms, QC threshold 25.0")
	fmt.Printf("%s\n", strings.Repeat("=", 60))

	result2, metrics2 := RunPipeline(PipelineConfig{
		ItemCount:        200,
		TransformWorkers: 5,
		FilterThreshold:  25.0,
	})
	printResult(result2)
	metrics2.Print()

	// --- Run 3: Pipeline with cancellation ---
	fmt.Printf("\n%s\n", strings.Repeat("=", 60))
	fmt.Println("  RUN 3: 1000 bolts, cancelled after 30ms")
	fmt.Printf("%s\n", strings.Repeat("=", 60))

	metrics3 := RunPipelineWithCancel(PipelineConfig{
		ItemCount:        1000,
		TransformWorkers: 4,
		FilterThreshold:  5.0,
	}, 30*time.Millisecond)
	metrics3.Print()

	fmt.Println("\n============================================================")
	fmt.Println("  DataYantra self-test complete.")
	fmt.Println("============================================================")
}

// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. Pipeline = chain of (chan T) -> goroutine -> (chan T). Each
//    stage owns its output channel and closes it when done.
// 2. Fan-out: N looms read from one channel. Fan-in: one
//    goroutine (or sync.WaitGroup) merges N outputs into one.
// 3. context.Context is the kill switch — every stage checks
//    ctx.Done() so cancellation propagates instantly.
// 4. Bounded parallelism comes from configurable loom counts,
//    not from spawning a goroutine per fabric bolt.
// 5. sync.Mutex protects shared metrics; channels carry data.
//    Never use one for the other's job.
// 6. Closing a channel is a broadcast signal — all readers
//    see it. This is how stage completion cascades downstream.
// 7. Pipeline metrics (throughput, per-stage timing) turn a
//    black box into an observable system.
// ============================================================
