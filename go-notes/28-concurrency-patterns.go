// ============================================================
//  FILE 28 : Concurrency Patterns
// ============================================================
//  Topic  : pipeline pattern, fan-out / fan-in, worker pool,
//           rate limiting, semaphore, or-done channel, bounded
//           parallelism, practical parallel fetcher simulation
//
//  WHY THIS MATTERS:
//  Goroutines and channels are Go's primitives, but real systems
//  need PATTERNS — pipeline, fan-out/fan-in, worker pool, rate
//  limiter, semaphore. These patterns turn raw concurrency into
//  controlled, predictable parallelism. They prevent resource
//  exhaustion, manage backpressure, and keep code maintainable.
// ============================================================

// ============================================================
// STORY: Maruti Suzuki Assembly Line
// Plant manager Ramesh oversees the Maruti Suzuki Manesar
// assembly plant. He doesn't throw all shift workers at one
// task — he designs assembly lines (pipelines): chassis → paint
// → QC → dispatch. He hires pools of shift workers, limits how
// many robotic arms run at once (semaphores), and controls the
// pace (rate limiting). Chaos becomes choreography. Cars roll
// off the line: Alto, Swift, Baleno, Brezza.
// ============================================================

package main

import (
	"fmt"
	"math/rand"
	"sync"
	"time"
)

// ============================================================
// EXAMPLE BLOCK 1 — Pipeline Pattern & Fan-Out / Fan-In
// ============================================================

// ──────────────────────────────────────────────────────────────
// SECTION 1 — Pipeline: chain of stages connected by channels
// ──────────────────────────────────────────────────────────────
// WHY: A pipeline breaks work into stages. Each stage is a
// goroutine reading from an input channel and writing to an
// output channel. Data flows like cars through the assembly line.

// generate sends chassis numbers to a channel, then closes it.
func generate(nums ...int) <-chan int {
	out := make(chan int)
	go func() {
		for _, n := range nums {
			out <- n
		}
		close(out)
	}()
	return out
}

// paintShop reads from in, applies paint coat (squares each value), sends to out.
func paintShop(in <-chan int) <-chan int {
	out := make(chan int)
	go func() {
		for n := range in {
			out <- n * n
		}
		close(out)
	}()
	return out
}

// qualityCheck reads from in, doubles each value (QC stamp), sends to out.
func qualityCheck(in <-chan int) <-chan int {
	out := make(chan int)
	go func() {
		for n := range in {
			out <- n * 2
		}
		close(out)
	}()
	return out
}

// ──────────────────────────────────────────────────────────────
// SECTION 2 — Fan-Out / Fan-In
// ──────────────────────────────────────────────────────────────
// WHY: Fan-out distributes work across multiple goroutines.
// Fan-in merges results back into a single channel. This is
// how you parallelise a CPU-bound stage in the Manesar plant.

// fanOut starts n shift workers, each reading from the same input channel.
func fanOut(in <-chan int, workers int) []<-chan int {
	channels := make([]<-chan int, workers)
	for i := 0; i < workers; i++ {
		channels[i] = heavyProcess(in)
	}
	return channels
}

// heavyProcess simulates a heavy assembly operation.
func heavyProcess(in <-chan int) <-chan int {
	out := make(chan int)
	go func() {
		for n := range in {
			// Simulate work
			time.Sleep(time.Millisecond * time.Duration(rand.Intn(5)))
			out <- n * 10
		}
		close(out)
	}()
	return out
}

// fanIn merges multiple channels into one dispatch line.
func fanIn(channels ...<-chan int) <-chan int {
	out := make(chan int)
	var wg sync.WaitGroup

	wg.Add(len(channels))
	for _, ch := range channels {
		go func(c <-chan int) {
			defer wg.Done()
			for val := range c {
				out <- val
			}
		}(ch)
	}

	go func() {
		wg.Wait()
		close(out)
	}()

	return out
}

// ============================================================
// EXAMPLE BLOCK 2 — Worker Pool, Rate Limiting, Semaphore
// ============================================================

// ──────────────────────────────────────────────────────────────
// SECTION 3 — Worker Pool
// ──────────────────────────────────────────────────────────────
// WHY: A fixed pool of shift workers prevents spawning thousands
// of goroutines. Jobs go into a shared channel; each worker
// pulls one at a time. This is Go's most common pattern for
// controlled parallelism — like first shift and second shift
// workers at Manesar.

// Job represents a unit of assembly work.
type Job struct {
	ID    int
	Input int
}

// Result holds a completed job's output.
type Result struct {
	JobID  int
	Output int
}

// shiftWorker reads jobs, processes them, sends results.
func shiftWorker(id int, jobs <-chan Job, results chan<- Result, wg *sync.WaitGroup) {
	defer wg.Done()
	for job := range jobs {
		// Simulate variable processing time
		time.Sleep(time.Millisecond * time.Duration(rand.Intn(10)))
		results <- Result{
			JobID:  job.ID,
			Output: job.Input * job.Input,
		}
	}
}

// ──────────────────────────────────────────────────────────────
// SECTION 4 — Rate Limiting with time.Ticker
// ──────────────────────────────────────────────────────────────
// WHY: Rate limiting controls how fast you process events.
// A time.Ticker emits ticks at a fixed interval — you process
// one event per tick. Essential for API calls, DB writes, etc.

// ──────────────────────────────────────────────────────────────
// SECTION 5 — Semaphore with buffered channel
// ──────────────────────────────────────────────────────────────
// WHY: A buffered channel of capacity N acts as a counting
// semaphore. At most N robotic arms can operate at once.
// Simpler than sync.Semaphore for most use cases.

// ============================================================
// EXAMPLE BLOCK 3 — Or-Done, Bounded Parallelism, URL Fetcher
// ============================================================

// ──────────────────────────────────────────────────────────────
// SECTION 6 — Or-Done channel
// ──────────────────────────────────────────────────────────────
// WHY: When reading from a channel, you often also need to
// check if a "done" signal has arrived. The or-done pattern
// wraps a channel so each receive also checks done.

// orDone wraps a channel so reads also respect a done signal.
func orDone(done <-chan struct{}, in <-chan int) <-chan int {
	out := make(chan int)
	go func() {
		defer close(out)
		for {
			select {
			case <-done:
				return
			case val, ok := <-in:
				if !ok {
					return
				}
				select {
				case out <- val:
				case <-done:
					return
				}
			}
		}
	}()
	return out
}

// ──────────────────────────────────────────────────────────────
// SECTION 7 — Bounded Parallelism
// ──────────────────────────────────────────────────────────────
// WHY: Sometimes you want to process N cars in parallel but
// cap the concurrency at M. Bounded parallelism = semaphore +
// WaitGroup. It's the safe way to do "parallel for loops".

// processCar simulates work on a car with bounded concurrency.
func processCar(id int) string {
	time.Sleep(time.Millisecond * time.Duration(rand.Intn(10)))
	return fmt.Sprintf("car-%d done", id)
}

// ──────────────────────────────────────────────────────────────
// SECTION 8 — Practical: Parallel URL Fetcher (simulated)
// ──────────────────────────────────────────────────────────────
// WHY: Real-world concurrent fetching — limit parallelism,
// collect results, handle timeouts. This combines worker pool
// + semaphore + result collection.

// FetchResult holds a simulated fetch result.
type FetchResult struct {
	URL      string
	Status   int
	Duration time.Duration
}

// simulateFetch pretends to fetch a URL.
func simulateFetch(url string) FetchResult {
	delay := time.Duration(rand.Intn(50)+10) * time.Millisecond
	time.Sleep(delay)
	statuses := []int{200, 200, 200, 200, 404, 500}
	status := statuses[rand.Intn(len(statuses))]
	return FetchResult{URL: url, Status: status, Duration: delay}
}

func main() {
	fmt.Println("===== FILE 28: Concurrency Patterns =====")
	fmt.Println()

	// ============================================================
	// BLOCK 1 — Pipeline & Fan-Out / Fan-In
	// ============================================================

	fmt.Println("--- Block 1: Pipeline & Fan-Out / Fan-In ---")
	fmt.Println()

	// ── Pipeline: chassis → paint shop → dispatch ──
	fmt.Println("Pipeline: chassis → paint shop → dispatch")
	chassisNums := generate(1, 2, 3, 4, 5)
	painted := paintShop(chassisNums)

	var pipelineResults []int
	for val := range painted {
		pipelineResults = append(pipelineResults, val)
	}
	fmt.Println("  Painted:", pipelineResults)
	// Output:   Painted: [1 4 9 16 25]

	// ── Multi-stage pipeline: chassis → paint → QC ──
	fmt.Println()
	fmt.Println("Pipeline: chassis → paint → QC")
	chassisNums2 := generate(1, 2, 3, 4, 5)
	stage2 := paintShop(chassisNums2)
	stage3 := qualityCheck(stage2)

	var multiResults []int
	for val := range stage3 {
		multiResults = append(multiResults, val)
	}
	fmt.Println("  Painted then QC'd:", multiResults)
	// Output:   Painted then QC'd: [2 8 18 32 50]

	// WHY: Each stage runs in its own goroutine. Data flows
	// through channels. Adding a stage is just chaining another
	// function. This is composable and testable.

	fmt.Println()

	// ── Fan-Out / Fan-In ──
	fmt.Println("Fan-Out / Fan-In (3 shift workers):")
	source := generate(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
	workers := fanOut(source, 3)
	merged := fanIn(workers...)

	var fanResults []int
	for val := range merged {
		fanResults = append(fanResults, val)
	}
	fmt.Printf("  Results (unordered, count=%d): ", len(fanResults))
	// Sort for consistent display
	total := 0
	for _, v := range fanResults {
		total += v
	}
	fmt.Printf("sum=%d\n", total)
	// Output:   Results (unordered, count=10): sum=550

	// WHY: Fan-out distributes work across shift workers for
	// parallelism. Fan-in collects results. Order is NOT
	// guaranteed — that's the tradeoff for speed.

	fmt.Println()

	// ============================================================
	// BLOCK 2 — Worker Pool, Rate Limiting, Semaphore
	// ============================================================

	fmt.Println("--- Block 2: Worker Pool, Rate Limiting, Semaphore ---")
	fmt.Println()

	// ── Worker Pool ──
	fmt.Println("Worker Pool (3 shift workers, 6 jobs):")
	const numJobs = 6
	const numWorkers = 3

	jobs := make(chan Job, numJobs)
	results := make(chan Result, numJobs)

	var wg sync.WaitGroup
	wg.Add(numWorkers)

	// Start shift workers
	for w := 1; w <= numWorkers; w++ {
		go shiftWorker(w, jobs, results, &wg)
	}

	// Send jobs (Alto, Swift, Baleno, Brezza, Dzire, Ertiga)
	for j := 1; j <= numJobs; j++ {
		jobs <- Job{ID: j, Input: j}
	}
	close(jobs)

	// Wait for shift workers to finish, then close results
	go func() {
		wg.Wait()
		close(results)
	}()

	// Collect results
	for r := range results {
		fmt.Printf("  Job %d: %d² = %d\n", r.JobID, r.JobID, r.Output)
	}
	// WHY: Jobs channel is shared among shift workers. Each worker
	// pulls one job at a time. This naturally load-balances:
	// fast workers pick up more jobs.

	fmt.Println()

	// ── Rate Limiting ──
	fmt.Println("Rate Limiting (1 car per 50ms, 5 events):")
	rateLimiter := time.NewTicker(50 * time.Millisecond)
	defer rateLimiter.Stop()

	carModels := []string{"Alto", "Swift", "Baleno", "Brezza", "Dzire"}
	rateStart := time.Now()

	for i, model := range carModels {
		<-rateLimiter.C // block until next tick
		elapsed := time.Since(rateStart).Milliseconds()
		fmt.Printf("  [%dms] Car %d: %s dispatched\n", elapsed, i+1, model)
	}
	// WHY: Each event waits for the next tick. This guarantees
	// at most 1 car per 50ms, no matter how fast they arrive.
	// Essential for controlling production line pace.

	fmt.Println()

	// ── Semaphore ──
	fmt.Println("Semaphore (max 2 robotic arms, 5 tasks):")
	const maxConcurrent = 2
	sem := make(chan struct{}, maxConcurrent)
	var semWg sync.WaitGroup

	semStart := time.Now()
	for i := 1; i <= 5; i++ {
		semWg.Add(1)
		go func(id int) {
			defer semWg.Done()
			sem <- struct{}{} // acquire token (blocks if full)
			elapsed := time.Since(semStart).Milliseconds()
			fmt.Printf("  [%dms] Task %d: started\n", elapsed, id)
			time.Sleep(30 * time.Millisecond) // simulate work
			<-sem // release token
		}(i)
	}
	semWg.Wait()
	fmt.Println("  All semaphore tasks complete")
	// WHY: The buffered channel of size 2 means only 2 robotic arms
	// can operate at once. Others block on send until a slot
	// opens. Simple and effective concurrency limiter.

	fmt.Println()

	// ============================================================
	// BLOCK 3 — Or-Done, Bounded Parallelism, URL Fetcher
	// ============================================================

	fmt.Println("--- Block 3: Or-Done, Bounded Parallelism, URL Fetcher ---")
	fmt.Println()

	// ── Or-Done channel ──
	fmt.Println("Or-Done channel (cancel after 3 values):")
	done := make(chan struct{})
	infiniteSource := make(chan int)

	// Producer: sends chassis numbers forever
	go func() {
		defer close(infiniteSource)
		for i := 1; ; i++ {
			select {
			case infiniteSource <- i:
			case <-done:
				return
			}
		}
	}()

	// Consumer: takes from orDone-wrapped channel
	safe := orDone(done, infiniteSource)
	count := 0
	for val := range safe {
		fmt.Printf("  Received: %d\n", val)
		count++
		if count >= 3 {
			close(done) // signal cancellation
			break
		}
	}
	// Output:   Received: 1
	// Output:   Received: 2
	// Output:   Received: 3

	// WHY: Without or-done, the producer would leak. The or-done
	// pattern ensures both sides shut down cleanly when done is
	// closed. This is the foundation of context cancellation.

	// Small delay to let goroutines clean up
	time.Sleep(10 * time.Millisecond)

	fmt.Println()

	// ── Bounded Parallelism ──
	fmt.Println("Bounded Parallelism (10 cars, max 3 concurrent):")
	const maxParallel = 3
	const totalItems = 10

	boundedSem := make(chan struct{}, maxParallel)
	var boundedWg sync.WaitGroup
	resultsCh := make(chan string, totalItems)

	for i := 1; i <= totalItems; i++ {
		boundedWg.Add(1)
		go func(id int) {
			defer boundedWg.Done()
			boundedSem <- struct{}{} // acquire
			result := processCar(id)
			resultsCh <- result
			<-boundedSem // release
		}(i)
	}

	// Close results channel when all goroutines finish
	go func() {
		boundedWg.Wait()
		close(resultsCh)
	}()

	doneCount := 0
	for r := range resultsCh {
		doneCount++
		if doneCount <= 5 { // print first 5 to keep output short
			fmt.Printf("  %s\n", r)
		}
	}
	fmt.Printf("  ... total completed: %d\n", doneCount)
	// WHY: We spawn all goroutines up front, but the semaphore
	// ensures only maxParallel run simultaneously. This is
	// simpler than managing a worker pool for one-off batch jobs.

	fmt.Println()

	// ── Practical: Parallel Dealer Dispatch (simulated) ──
	fmt.Println("Parallel Dealer Dispatch (simulated, max 3 concurrent):")
	urls := []string{
		"https://dealer.maruti.in/delhi",
		"https://dealer.maruti.in/mumbai",
		"https://dealer.maruti.in/chennai",
		"https://dealer.maruti.in/kolkata",
		"https://dealer.maruti.in/bengaluru",
		"https://dealer.maruti.in/hyderabad",
	}

	const fetchConcurrency = 3
	fetchSem := make(chan struct{}, fetchConcurrency)
	fetchResults := make(chan FetchResult, len(urls))
	var fetchWg sync.WaitGroup

	fetchStart := time.Now()

	for _, url := range urls {
		fetchWg.Add(1)
		go func(u string) {
			defer fetchWg.Done()
			fetchSem <- struct{}{} // acquire
			result := simulateFetch(u)
			fetchResults <- result
			<-fetchSem // release
		}(url)
	}

	go func() {
		fetchWg.Wait()
		close(fetchResults)
	}()

	var successes, failures int
	for r := range fetchResults {
		status := "OK"
		if r.Status != 200 {
			status = fmt.Sprintf("FAIL(%d)", r.Status)
			failures++
		} else {
			successes++
		}
		fmt.Printf("  [%s] %s (%dms)\n", status, r.URL, r.Duration.Milliseconds())
	}

	totalTime := time.Since(fetchStart)
	fmt.Printf("  Summary: %d success, %d failed, total time: %dms\n",
		successes, failures, totalTime.Milliseconds())
	fmt.Printf("  (Sequential would take ~%dms — parallelism saved time!)\n",
		len(urls)*30) // rough estimate

	// WHY: This combines semaphore (bounded concurrency) + WaitGroup
	// (completion tracking) + result channel (collection). It's the
	// standard pattern for parallel I/O in production Go code.

	fmt.Println()

	// ── Pattern Summary ──
	fmt.Println("--- Concurrency Patterns Summary ---")
	fmt.Println("  Pipeline:     chassis → paint → QC → dispatch (channels between)")
	fmt.Println("  Fan-Out:      one channel → multiple shift workers (parallelise)")
	fmt.Println("  Fan-In:       multiple channels → one dispatch line")
	fmt.Println("  Worker Pool:  N shift workers reading from shared job channel")
	fmt.Println("  Rate Limit:   time.Ticker gates cars to fixed dispatch rate")
	fmt.Println("  Semaphore:    buffered channel limits concurrent robotic arms")
	fmt.Println("  Or-Done:      wrap channel reads with cancellation check")
	fmt.Println("  Bounded Par:  semaphore + WaitGroup for parallel assembly")
}

// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. Pipeline: chain goroutines with channels. Each stage reads
//    from input, processes, writes to output. Adding stages is
//    just chaining functions. Close channels to signal completion.
//
// 2. Fan-Out / Fan-In: distribute work to N shift workers (fan-out),
//    merge results into one dispatch channel (fan-in). Order is
//    lost, but throughput multiplies.
//
// 3. Worker Pool: fixed N shift workers reading from a shared job
//    channel. Naturally load-balances — fast workers take more
//    jobs. The most common production pattern.
//
// 4. Rate Limiting: time.NewTicker(interval) emits ticks at a
//    fixed rate. Block on <-ticker.C before each car dispatch to
//    enforce the rate. Don't forget ticker.Stop().
//
// 5. Semaphore: a buffered channel of capacity N. Send to acquire
//    a slot, receive to release. At most N robotic arms proceed
//    concurrently. Simpler than sync.Semaphore.
//
// 6. Or-Done: wraps channel reads with a done check. Prevents
//    goroutine leaks when you cancel a pipeline early. This is
//    the manual version of what context.Context does.
//
// 7. Bounded Parallelism: semaphore + WaitGroup. Spawn all
//    goroutines, but the semaphore caps how many run at once.
//    Ideal for batch processing with concurrency limits.
//
// 8. Ramesh's Manesar plant rule: "Never let shift workers stand
//    idle, never let robotic arms run unbounded. Design the
//    assembly line, set the pace, and choreograph the chaos."
// ============================================================
