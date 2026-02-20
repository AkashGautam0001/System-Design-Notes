// ============================================================
//  FILE 16: THE SELECT STATEMENT
// ============================================================
//  Topic: Multiplexing channel operations with select, timeouts,
//         non-blocking ops, done channels, fan-in, and tickers.
//
//  WHY THIS MATTERS:
//    select is to channels what switch is to values.  It lets a
//    goroutine wait on MULTIPLE channel operations simultaneously,
//    enabling timeouts, cancellation, fan-in, and priority patterns.
//    Without select, you'd be stuck waiting on one channel at a
//    time — useless in real concurrent programs.
// ============================================================
//
//  STORY — "Mumbai ATC"
//  ATC Officer Kapoor sits in the tower at CSIA (Chhatrapati
//  Shivaji International Airport) watching multiple runways
//  (channels).  He can't stare at just one runway — flights land
//  on different runways at unpredictable times.  select lets him
//  watch ALL runways simultaneously, respond to whichever one
//  has activity first, set timeout alarms if no flight arrives,
//  and prioritize emergencies over regular traffic.
// ============================================================

package main

import (
	"fmt"
	"math/rand"
	"time"
)

func main() {
	// ============================================================
	//  EXAMPLE BLOCK 1 — Basic Select, Timeout, Non-blocking
	// ============================================================

	fmt.Println("============================================================")
	fmt.Println("  BLOCK 1: Basic Select, Timeout & Non-blocking")
	fmt.Println("============================================================")

	// ── Basic select ────────────────────────────────────────
	// WHY: select waits until ONE of its cases can proceed.
	// If multiple cases are ready, one is chosen at RANDOM.

	fmt.Println("\n--- Basic select — first channel wins ---")

	runway1 := make(chan string, 1)
	runway2 := make(chan string, 1)

	go func() {
		time.Sleep(20 * time.Millisecond)
		runway1 <- "Flight AI-101"
	}()
	go func() {
		time.Sleep(10 * time.Millisecond)
		runway2 <- "Flight 6E-302"
	}()

	// Select waits for whichever channel delivers first
	select {
	case flight := <-runway1:
		fmt.Println("  Runway 1 landing:", flight)
	case flight := <-runway2:
		fmt.Println("  Runway 2 landing:", flight)
	}
	// Output: Runway 2 landing: Flight 6E-302
	// (runway2 arrives first because its sleep is shorter)

	time.Sleep(20 * time.Millisecond) // Let runway1 complete

	// ── Random selection when multiple ready ────────────────
	fmt.Println("\n--- Random selection when multiple cases ready ---")

	ch1 := make(chan string, 1)
	ch2 := make(chan string, 1)

	counts := map[string]int{"ch1": 0, "ch2": 0}

	for i := 0; i < 100; i++ {
		ch1 <- "A"
		ch2 <- "B"
		select {
		case <-ch1:
			counts["ch1"]++
		case <-ch2:
			counts["ch2"]++
		}
		// Drain the other channel
		select {
		case <-ch1:
		case <-ch2:
		default:
		}
	}
	fmt.Printf("  Over 100 iterations — ch1 chosen: %d, ch2 chosen: %d\n",
		counts["ch1"], counts["ch2"])
	// Output: (roughly 50/50 split, demonstrating random selection)

	// WHY: When multiple cases are ready simultaneously, Go picks
	// one uniformly at random.  This prevents starvation and makes
	// select fair.

	// ── Timeout with time.After ─────────────────────────────
	// WHY: time.After(d) returns a channel that receives a value
	// after duration d.  Combined with select, it creates timeouts.

	fmt.Println("\n--- Timeout with time.After ---")

	slowRunway := make(chan string)

	go func() {
		time.Sleep(200 * time.Millisecond) // Takes too long
		slowRunway <- "Flight SG-205"
	}()

	select {
	case flight := <-slowRunway:
		fmt.Println("  Landed:", flight)
	case <-time.After(50 * time.Millisecond):
		fmt.Println("  TIMEOUT: No flight landed in 50ms, diverting!")
		// Output: TIMEOUT: No flight landed in 50ms, diverting!
	}

	// ── Non-blocking with default ───────────────────────────
	// WHY: A select with a default case never blocks.  If no
	// channel is ready, the default case runs immediately.

	fmt.Println("\n--- Non-blocking select with default ---")

	radar := make(chan string)

	select {
	case signal := <-radar:
		fmt.Println("  Signal:", signal)
	default:
		fmt.Println("  No signal on radar right now (non-blocking check).")
		// Output: No signal on radar right now (non-blocking check).
	}

	// ── Non-blocking send ───────────────────────────────────
	fmt.Println("\n--- Non-blocking send ---")

	logCh := make(chan string, 1)
	logCh <- "existing message" // buffer is now full

	select {
	case logCh <- "new message":
		fmt.Println("  Sent 'new message' to log channel.")
	default:
		fmt.Println("  Log channel full, message dropped (back-pressure).")
		// Output: Log channel full, message dropped (back-pressure).
	}

	// WHY: Non-blocking sends are used for "fire and forget" logging,
	// metrics, and applying back-pressure when a consumer is slow.

	// ── select {} blocks forever ────────────────────────────
	fmt.Println("\n--- select {} blocks forever ---")
	fmt.Println("  An empty select{} with no cases blocks the goroutine forever.")
	// Output:   An empty select{} with no cases blocks the goroutine forever.
	fmt.Println("  Use case: keeping main alive when goroutines do all the work.")
	// Output:   Use case: keeping main alive when goroutines do all the work.
	fmt.Println("  Example:")
	fmt.Println("    go startServer()")
	fmt.Println("    select {} // main waits forever")

	// ============================================================
	//  EXAMPLE BLOCK 2 — Done Channel, Fan-In, Ticker, Priority
	// ============================================================

	fmt.Println("\n============================================================")
	fmt.Println("  BLOCK 2: Done Channel, Fan-In, Ticker & Priority")
	fmt.Println("============================================================")

	// ── Done channel pattern ────────────────────────────────
	// WHY: A done channel (usually chan struct{}) signals goroutines
	// to stop.  close(done) unblocks ALL listeners simultaneously.

	fmt.Println("\n--- Done channel for cancellation ---")

	done := make(chan struct{})
	results := make(chan string, 10)

	// Simulate a worker that runs until cancelled
	go func() {
		i := 0
		for {
			select {
			case <-done:
				fmt.Println("  ATC Officer Kapoor: received done signal, shutting down.")
				return
			default:
				i++
				results <- fmt.Sprintf("result-%d", i)
				time.Sleep(15 * time.Millisecond)
			}
		}
	}()

	// Collect some results, then cancel
	time.Sleep(60 * time.Millisecond)
	close(done) // Signal cancellation

	// Drain remaining results
	close(results)
	count := 0
	for r := range results {
		_ = r
		count++
	}
	fmt.Printf("  Collected %d results before cancellation.\n", count)
	// Output: Collected <N> results before cancellation.

	time.Sleep(20 * time.Millisecond) // Let worker print shutdown message

	// ── Fan-in pattern with select ──────────────────────────
	// WHY: Fan-in merges multiple input channels into one output
	// channel.  select makes this elegant.

	fmt.Println("\n--- Fan-in: merging multiple runways ---")

	fanIn := func(ch1, ch2 <-chan string) <-chan string {
		merged := make(chan string)
		go func() {
			defer close(merged)
			// Track which inputs are done
			ch1Done, ch2Done := false, false
			for !ch1Done || !ch2Done {
				select {
				case v, ok := <-ch1:
					if !ok {
						ch1Done = true
						ch1 = nil // WHY: nil channel blocks forever in select, disabling this case
					} else {
						merged <- v
					}
				case v, ok := <-ch2:
					if !ok {
						ch2Done = true
						ch2 = nil // disable this case
					} else {
						merged <- v
					}
				}
			}
		}()
		return merged
	}

	// Two separate data sources
	source1 := make(chan string, 3)
	source2 := make(chan string, 3)

	source1 <- "Runway-27: AI-101 landed"
	source1 <- "Runway-27: 6E-302 landed"
	close(source1)

	source2 <- "Runway-09: SG-205 landed"
	source2 <- "Runway-09: UK-831 landed"
	source2 <- "Runway-09: AI-445 landed"
	close(source2)

	for msg := range fanIn(source1, source2) {
		fmt.Println("  Merged:", msg)
	}
	// Output: (all 5 messages, order may vary)

	// ── Ticker for periodic operations ──────────────────────
	// WHY: time.NewTicker sends values at regular intervals.
	// Combined with select, it creates periodic task execution.

	fmt.Println("\n--- Ticker for periodic operations ---")

	ticker := time.NewTicker(25 * time.Millisecond)
	defer ticker.Stop() // Always stop tickers to free resources

	tickDone := make(chan struct{})
	go func() {
		time.Sleep(90 * time.Millisecond)
		close(tickDone)
	}()

	tickCount := 0
	fmt.Print("  Ticks: ")
tickLoop:
	for {
		select {
		case t := <-ticker.C:
			tickCount++
			fmt.Printf("[%dms] ", t.UnixMilli()%1000)
		case <-tickDone:
			fmt.Println()
			break tickLoop // WHY: bare break only exits select, not the for loop
		}
	}
	fmt.Printf("  Received %d ticks in ~90ms\n", tickCount)
	// Output: Received 3 ticks in ~90ms (approximately)

	// WHY: Always use ticker.Stop() when done.  Unlike time.After
	// (which is one-shot), a ticker keeps firing until stopped.

	// ── Priority select pattern ─────────────────────────────
	// WHY: Go's select doesn't have built-in priority.  To prioritize
	// one channel over another, use a nested select pattern.

	fmt.Println("\n--- Priority select pattern ---")

	emergency := make(chan string, 5)
	regular := make(chan string, 5)

	// Load some messages
	regular <- "Normal landing request from 6E-302"
	regular <- "Normal landing request from SG-205"
	emergency <- "MAYDAY: AI-101 engine failure!"
	regular <- "Normal landing request from UK-831"
	emergency <- "MAYDAY: AI-445 fuel critical!"
	regular <- "Normal landing request from 6E-888"

	// Process with emergency priority
	processed := 0
	for processed < 6 {
		// First, try ONLY emergency (non-blocking)
		select {
		case msg := <-emergency:
			fmt.Println("  [PRIORITY]", msg)
			processed++
			continue
		default:
			// No emergency — fall through to handle both
		}

		// Then handle either channel
		select {
		case msg := <-emergency:
			fmt.Println("  [PRIORITY]", msg)
		case msg := <-regular:
			fmt.Println("  [NORMAL]  ", msg)
		}
		processed++
	}
	// Output:
	//   [PRIORITY] MAYDAY: AI-101 engine failure!
	//   [PRIORITY] MAYDAY: AI-445 fuel critical!
	//   [NORMAL]   Normal landing request from 6E-302
	//   [NORMAL]   Normal landing request from SG-205
	//   [NORMAL]   Normal landing request from UK-831
	//   [NORMAL]   Normal landing request from 6E-888

	// ── Simulated real-world: timeout with retries ──────────
	fmt.Println("\n--- Timeout with retries ---")

	unreliableService := func() <-chan string {
		ch := make(chan string, 1)
		go func() {
			delay := time.Duration(rand.Intn(80)+10) * time.Millisecond
			time.Sleep(delay)
			ch <- fmt.Sprintf("response (took %dms)", delay/time.Millisecond)
		}()
		return ch
	}

	maxRetries := 3
	timeout := 50 * time.Millisecond
	var response string

	for attempt := 1; attempt <= maxRetries; attempt++ {
		select {
		case resp := <-unreliableService():
			response = resp
			fmt.Printf("  Attempt %d: SUCCESS — %s\n", attempt, response)
			goto done
		case <-time.After(timeout):
			fmt.Printf("  Attempt %d: TIMEOUT after %v, retrying...\n",
				attempt, timeout)
		}
	}
	fmt.Println("  All retries exhausted!")
done:

	// ============================================================
	//  KEY TAKEAWAYS
	// ============================================================
	fmt.Println("\n============================================================")
	fmt.Println("  KEY TAKEAWAYS")
	fmt.Println("============================================================")
	fmt.Println(`
  1. select waits on multiple channel operations. When one is
     ready, it executes that case. If multiple are ready, one
     is chosen at RANDOM (uniform, fair selection).

  2. time.After(d) in a select case creates a timeout. The
     goroutine won't wait forever for a slow channel.

  3. default makes select non-blocking. If no channel is ready,
     default runs immediately. Great for polling and back-pressure.

  4. Done channel pattern: close(done) unblocks ALL goroutines
     listening on <-done simultaneously. Use chan struct{} (zero bytes).

  5. Fan-in merges multiple channels into one using select.
     Set a channel to nil in select to disable a drained case.

  6. time.NewTicker fires periodically. Always defer ticker.Stop()
     to avoid resource leaks.

  7. Priority select: nest two selects — first check the high-
     priority channel with default, then fall through to a
     select that handles both channels.

  8. select {} (empty) blocks forever. Useful for keeping main
     alive when goroutines handle all work.`)
}
