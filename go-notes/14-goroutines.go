// ============================================================
//  FILE 14: GOROUTINES
// ============================================================
//  Topic: The `go` keyword, lightweight concurrency, WaitGroup,
//         race conditions, runtime functions, and common pitfalls.
//
//  WHY THIS MATTERS:
//    Goroutines are Go's killer feature — lightweight concurrent
//    functions that cost only a few KB of stack each.  Where OS
//    threads cost ~1MB per thread, you can launch millions of
//    goroutines.  Mastering them unlocks Go's full power for
//    servers, pipelines, and parallel computation.
// ============================================================
//
//  STORY — "The Dhaba Kitchen"
//  Head Cook Amma runs a busy highway dhaba.  She doesn't cook
//  every dish herself — she coordinates her team.  Each cook
//  (goroutine) works independently on their tawa or tandoor.
//  Amma (main goroutine) must WAIT for all rotis and sabzi to
//  finish before serving.  If she leaves the dhaba (main exits),
//  every cook stops mid-flip — the meal is ruined.
// ============================================================

package main

import (
	"fmt"
	"runtime"
	"sync"
	"time"
)

func main() {
	// ============================================================
	//  EXAMPLE BLOCK 1 — Basic Goroutines, WaitGroup, No IDs
	// ============================================================

	fmt.Println("============================================================")
	fmt.Println("  BLOCK 1: Basic Goroutines & WaitGroup")
	fmt.Println("============================================================")

	// ── The 'go' keyword ────────────────────────────────────
	// WHY: Prefixing a function call with 'go' launches it as a
	// goroutine — a lightweight concurrent function managed by
	// Go's runtime scheduler, NOT an OS thread.

	fmt.Println("\n--- Launching goroutines ---")

	// Simple goroutine with an anonymous function
	go func() {
		fmt.Println("  [goroutine] Helper is chopping onions for the tawa")
	}()

	// WHY: Without synchronization, main might exit before the
	// goroutine even starts.  This sleep is a BAD solution — we'll
	// fix it properly with WaitGroup next.
	time.Sleep(50 * time.Millisecond)

	// ── sync.WaitGroup — proper synchronization ─────────────
	// WHY: WaitGroup is the simplest way to wait for a collection
	// of goroutines to finish.  Think of it as a counter:
	//   Add(n) → increment counter by n
	//   Done() → decrement counter by 1
	//   Wait() → block until counter reaches 0

	fmt.Println("\n--- sync.WaitGroup for coordination ---")

	var wg sync.WaitGroup

	cooks := []string{"Raju (tandoor)", "Sita (tawa)", "Govind (sabzi)"}

	for _, cook := range cooks {
		wg.Add(1) // Tell WaitGroup: one more goroutine to wait for

		go func(name string) {
			defer wg.Done() // When this goroutine finishes, signal Done

			fmt.Printf("  Cook %s starts cooking\n", name)
			time.Sleep(30 * time.Millisecond) // Simulate work
			fmt.Printf("  Cook %s finishes!\n", name)
		}(cook) // Pass cook as argument to avoid closure capture issue
	}

	wg.Wait() // Block until all cooks are done
	fmt.Println("  Amma: Sab kuch taiyaar! Time to serve.")
	// Output: (order varies)
	//   Cook Raju (tandoor) starts cooking
	//   Cook Sita (tawa) starts cooking
	//   Cook Govind (sabzi) starts cooking
	//   Cook Raju (tandoor) finishes!
	//   Cook Sita (tawa) finishes!
	//   Cook Govind (sabzi) finishes!
	//   Amma: Sab kuch taiyaar! Time to serve.

	// ── Goroutines are LIGHTWEIGHT ──────────────────────────
	fmt.Println("\n--- Goroutine weight ---")
	fmt.Println("  OS thread stack: ~1 MB (fixed)")
	fmt.Println("  Goroutine stack: ~2-8 KB (grows/shrinks dynamically)")
	fmt.Println("  You can run millions of goroutines on modest hardware.")

	// ── Goroutine IDs don't exist (by design) ───────────────
	fmt.Println("\n--- No goroutine IDs ---")
	fmt.Println("  Go deliberately does NOT expose goroutine IDs.")
	// Output:   Go deliberately does NOT expose goroutine IDs.
	fmt.Println("  WHY: To prevent thread-local storage anti-patterns.")
	// Output:   WHY: To prevent thread-local storage anti-patterns.
	fmt.Println("  Instead, pass context explicitly through function args.")
	// Output:   Instead, pass context explicitly through function args.

	// ============================================================
	//  EXAMPLE BLOCK 2 — Race Conditions & Mutex Preview
	// ============================================================

	fmt.Println("\n============================================================")
	fmt.Println("  BLOCK 2: Race Conditions (Shared State Danger)")
	fmt.Println("============================================================")

	// ── Race condition demo — counter WITHOUT synchronization ─
	// WHY: When multiple goroutines read/write the same variable
	// without synchronization, you get a data race.  The result
	// is unpredictable and often wrong.

	fmt.Println("\n--- Unsafe counter (race condition) ---")

	unsafeCounter := 0
	var wg2 sync.WaitGroup

	for i := 0; i < 1000; i++ {
		wg2.Add(1)
		go func() {
			defer wg2.Done()
			unsafeCounter++ // READ + INCREMENT + WRITE — not atomic!
		}()
	}

	wg2.Wait()
	fmt.Printf("  Unsafe counter (expected 1000): %d\n", unsafeCounter)
	// Output: Unsafe counter (expected 1000): <varies, often less than 1000>

	// WHY: unsafeCounter++ is actually three steps:
	//   1. Read current value
	//   2. Add 1
	//   3. Write new value
	// Two goroutines can read the SAME value, both add 1, and both
	// write back — losing one increment.  This is a classic race.

	fmt.Println("  (Result may be less than 1000 — that's the race!)")

	// ── Use 'go run -race' to detect races ──────────────────
	fmt.Println("\n--- Detecting races ---")
	fmt.Println("  Run with: go run -race 14-goroutines.go")
	// Output:   Run with: go run -race 14-goroutines.go
	fmt.Println("  The race detector will report the exact lines involved.")
	// Output:   The race detector will report the exact lines involved.

	// ── Fix with sync.Mutex (preview) ───────────────────────
	// WHY: A Mutex (mutual exclusion) ensures only ONE goroutine
	// can access the critical section at a time.

	fmt.Println("\n--- Safe counter (with Mutex) ---")

	safeCounter := 0
	var mu sync.Mutex
	var wg3 sync.WaitGroup

	for i := 0; i < 1000; i++ {
		wg3.Add(1)
		go func() {
			defer wg3.Done()
			mu.Lock()         // Acquire the lock
			safeCounter++     // Critical section — only one goroutine at a time
			mu.Unlock()       // Release the lock
		}()
	}

	wg3.Wait()
	fmt.Printf("  Safe counter (expected 1000): %d\n", safeCounter)
	// Output: Safe counter (expected 1000): 1000

	fmt.Println("  Mutex guarantees correctness at the cost of serialization.")
	// Output:   Mutex guarantees correctness at the cost of serialization.

	// ============================================================
	//  EXAMPLE BLOCK 3 — Goroutine Lifecycle, Runtime, Leaks,
	//                     Closure Gotcha
	// ============================================================

	fmt.Println("\n============================================================")
	fmt.Println("  BLOCK 3: Lifecycle, Runtime, Leaks & Closure Gotcha")
	fmt.Println("============================================================")

	// ── Main goroutine exits = all goroutines die ───────────
	fmt.Println("\n--- Main exits = everything dies ---")
	fmt.Println("  When main() returns, the Go runtime kills all goroutines.")
	// Output:   When main() returns, the Go runtime kills all goroutines.
	fmt.Println("  There is NO implicit 'wait for all goroutines' behavior.")
	// Output:   There is NO implicit 'wait for all goroutines' behavior.
	fmt.Println("  You MUST synchronize (WaitGroup, channels, etc.).")
	// Output:   You MUST synchronize (WaitGroup, channels, etc.).

	// ── runtime functions ───────────────────────────────────
	fmt.Println("\n--- runtime functions ---")

	fmt.Printf("  runtime.NumGoroutine()  = %d (active goroutines)\n",
		runtime.NumGoroutine())
	// Output: runtime.NumGoroutine()  = <number> (active goroutines)

	fmt.Printf("  runtime.NumCPU()        = %d (logical CPUs)\n",
		runtime.NumCPU())
	// Output: runtime.NumCPU()        = <number> (logical CPUs)

	fmt.Printf("  runtime.GOMAXPROCS(0)   = %d (current GOMAXPROCS)\n",
		runtime.GOMAXPROCS(0))
	// Output: runtime.GOMAXPROCS(0)   = <number> (current GOMAXPROCS)

	// WHY: GOMAXPROCS(0) returns current value without changing it.
	// By default, GOMAXPROCS equals NumCPU.  It controls how many
	// OS threads can execute goroutines simultaneously.

	fmt.Printf("  runtime.GOROOT()        = %s\n", runtime.GOROOT())
	// Output: runtime.GOROOT()        = /path/to/go
	fmt.Printf("  runtime.Version()       = %s\n", runtime.Version())
	// Output: runtime.Version()       = go1.26.0

	// ── Goroutine leak demo ─────────────────────────────────
	// WHY: A goroutine that never finishes is a memory leak.
	// Common causes: blocked on a channel nobody sends to,
	// waiting for a lock that's never released, infinite loop.

	fmt.Println("\n--- Goroutine leak demo ---")

	before := runtime.NumGoroutine()
	fmt.Printf("  Before leak: %d goroutines\n", before)

	// Launch a goroutine that blocks forever on a channel
	leakyChan := make(chan int) // nobody will ever send on this
	go func() {
		<-leakyChan // blocks forever — this goroutine is leaked!
	}()

	time.Sleep(10 * time.Millisecond) // Let it start

	after := runtime.NumGoroutine()
	fmt.Printf("  After leak:  %d goroutines (+1 leaked)\n", after)
	// Output: After leak:  <before+1> goroutines (+1 leaked)

	fmt.Println("  The leaked goroutine will persist until the program exits.")
	// Output:   The leaked goroutine will persist until the program exits.
	fmt.Println("  In production, leaked goroutines consume memory indefinitely.")
	// Output:   In production, leaked goroutines consume memory indefinitely.

	// Fix: close the channel or use context cancellation
	close(leakyChan) // cleanup for this demo

	time.Sleep(10 * time.Millisecond)
	fmt.Printf("  After fix:   %d goroutines (leak resolved)\n",
		runtime.NumGoroutine())

	// ── Closure gotcha in loops ─────────────────────────────
	// WHY: A common bug is launching goroutines inside a loop
	// where the closure captures the loop variable BY REFERENCE.

	fmt.Println("\n--- Closure gotcha in loops ---")

	// WRONG WAY (before Go 1.22 — loop variable was shared):
	// Note: Go 1.22+ changed loop variable semantics so each
	// iteration gets its own copy.  But the pattern is still
	// worth understanding for older code and general closure awareness.

	fmt.Println("  Pre-Go 1.22 gotcha (loop var captured by reference):")
	fmt.Println("    for i := 0; i < 3; i++ {")
	fmt.Println("        go func() { fmt.Println(i) }() // might print 3,3,3")
	fmt.Println("    }")

	fmt.Println("\n  Fix #1 — pass as argument (works in all Go versions):")
	var wg4 sync.WaitGroup
	fmt.Print("    ")
	for i := 0; i < 5; i++ {
		wg4.Add(1)
		go func(n int) { // n is a copy — safe
			defer wg4.Done()
			fmt.Printf("%d ", n)
		}(i) // pass i as argument
	}
	wg4.Wait()
	fmt.Println()
	// Output: 0 1 2 3 4 (order may vary)

	fmt.Println("\n  Fix #2 — shadow the variable (Go 1.22+ does this automatically):")
	fmt.Println("    for i := 0; i < 3; i++ {")
	fmt.Println("        i := i  // shadow — each goroutine gets its own copy")
	fmt.Println("        go func() { fmt.Println(i) }()")
	fmt.Println("    }")

	fmt.Println("\n  Go 1.22+ behavior: loop variables are per-iteration by default.")
	// Output:   Go 1.22+ behavior: loop variables are per-iteration by default.

	// ── Goroutine scheduling ────────────────────────────────
	fmt.Println("\n--- Goroutine scheduling ---")
	fmt.Println("  Go uses M:N scheduling (M goroutines on N OS threads).")
	// Output:   Go uses M:N scheduling (M goroutines on N OS threads).
	fmt.Println("  The runtime scheduler is cooperative AND preemptive (since Go 1.14).")
	// Output:   The runtime scheduler is cooperative AND preemptive (since Go 1.14).
	fmt.Println("  runtime.Gosched() yields the processor to other goroutines.")
	// Output:   runtime.Gosched() yields the processor to other goroutines.

	// ============================================================
	//  KEY TAKEAWAYS
	// ============================================================
	fmt.Println("\n============================================================")
	fmt.Println("  KEY TAKEAWAYS")
	fmt.Println("============================================================")
	fmt.Println(`
  1. 'go f()' launches f as a goroutine — a lightweight concurrent
     function (~2-8 KB stack vs ~1 MB OS thread).

  2. sync.WaitGroup is the simplest synchronization tool:
     Add(n) before launch, Done() in the goroutine, Wait() to block.

  3. When main() returns, ALL goroutines are killed immediately.
     Always synchronize before exiting.

  4. Race conditions occur when goroutines share state without
     synchronization. Use 'go run -race' to detect them.

  5. sync.Mutex serializes access to shared state. Lock before
     access, Unlock after. Use defer mu.Unlock() for safety.

  6. Goroutine IDs are deliberately hidden — pass context through
     function parameters, not thread-local storage.

  7. Goroutine leaks (blocked goroutines that never finish) are
     memory leaks. Always ensure goroutines can exit.

  8. Closure gotcha: in pre-1.22 Go, loop variables are shared.
     Pass them as function arguments or shadow them.

  9. runtime.NumGoroutine(), NumCPU(), GOMAXPROCS() are useful
     for monitoring and tuning concurrent programs.`)
}
