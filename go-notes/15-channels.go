// ============================================================
//  FILE 15: CHANNELS
// ============================================================
//  Topic: Unbuffered and buffered channels, directional channels,
//         close/range, channel axioms, and common patterns.
//
//  WHY THIS MATTERS:
//    Channels are Go's primary mechanism for communication
//    between goroutines.  "Don't communicate by sharing memory;
//    share memory by communicating."  Understanding channels
//    unlocks safe, elegant concurrent programs without low-level
//    locking in most cases.
// ============================================================
//
//  STORY — "The Dabbawala Network"
//  Dabbawala Ganesh works in Mumbai's legendary tiffin delivery
//  network.  Each relay point (channel) can carry one tiffin
//  (value) at a time.  An unbuffered relay requires the sender to
//  wait until the receiver grabs the tiffin.  A buffered relay
//  has a holding rack at the station — the sender can drop off
//  tiffins and move on, as long as the rack isn't full.  If a
//  relay point is sealed (closed), trying to send causes an alarm
//  (panic), but receivers can still pick up anything remaining.
// ============================================================

package main

import (
	"fmt"
	"sync"
	"time"
)

func main() {
	// ============================================================
	//  EXAMPLE BLOCK 1 — Unbuffered Channels, Send/Receive,
	//                     Synchronization
	// ============================================================

	fmt.Println("============================================================")
	fmt.Println("  BLOCK 1: Unbuffered Channels — Synchronous Communication")
	fmt.Println("============================================================")

	// ── Creating an unbuffered channel ──────────────────────
	// WHY: make(chan T) creates an unbuffered channel.  Send blocks
	// until a receiver is ready.  Receive blocks until a sender sends.
	// This creates a natural synchronization point.

	fmt.Println("\n--- Unbuffered channel basics ---")

	relay := make(chan string) // unbuffered channel of strings

	// Sender goroutine
	go func() {
		fmt.Println("  Ganesh: Placing tiffin at relay point...")
		relay <- "Urgent tiffin from Andheri" // blocks until receiver reads
		fmt.Println("  Ganesh: Tiffin picked up by the next dabbawala!")
	}()

	// Receiver (main goroutine)
	tiffin := <-relay // blocks until sender sends
	fmt.Println("  Receiver got:", tiffin)
	// Output: Receiver got: Urgent tiffin from Andheri

	time.Sleep(10 * time.Millisecond) // Let sender's print finish

	// ── Channel as synchronization ──────────────────────────
	// WHY: Unbuffered channels act as synchronization primitives.
	// The sender and receiver must "meet" — this is called a
	// rendezvous.

	fmt.Println("\n--- Channel for synchronization (done signal) ---")

	done := make(chan bool)

	go func() {
		fmt.Println("  Dabbawala Mohan: sorting tiffins...")
		time.Sleep(30 * time.Millisecond)
		fmt.Println("  Dabbawala Mohan: done!")
		done <- true // signal completion
	}()

	<-done // wait for signal
	fmt.Println("  Main: Mohan finished, proceeding.")
	// Output: Main: Mohan finished, proceeding.

	// ── Multiple values through a channel ───────────────────
	fmt.Println("\n--- Sending multiple tiffins ---")

	tiffins := make(chan int)

	go func() {
		for i := 1; i <= 5; i++ {
			tiffins <- i
			fmt.Printf("  Sent tiffin: %d\n", i)
		}
		close(tiffins) // signal: no more tiffins coming
	}()

	// Receive until channel is closed
	for n := range tiffins {
		fmt.Printf("  Received tiffin: %d\n", n)
	}
	// Output:
	//   Sent tiffin: 1
	//   Received tiffin: 1
	//   Sent tiffin: 2
	//   Received tiffin: 2
	//   ... (interleaved, since unbuffered forces alternation)

	fmt.Println("  Relay point closed and drained.")
	// Output:   Relay point closed and drained.

	// ── Channel direction in function signatures ────────────
	// WHY: Directional channels document intent and prevent misuse.
	// chan<- T = send-only, <-chan T = receive-only.
	// The compiler enforces these constraints.

	fmt.Println("\n--- Directional channels ---")

	produce := func(out chan<- int) { // send-only
		for i := 10; i <= 12; i++ {
			out <- i
		}
		close(out)
	}

	consume := func(in <-chan int) { // receive-only
		for v := range in {
			fmt.Printf("  Delivered tiffin: %d\n", v)
		}
	}

	pipe := make(chan int)
	go produce(pipe) // bidirectional chan is implicitly converted
	consume(pipe)
	// Output:
	//   Delivered tiffin: 10
	//   Delivered tiffin: 11
	//   Delivered tiffin: 12

	// ============================================================
	//  EXAMPLE BLOCK 2 — Buffered Channels, Directional Channels,
	//                     Range, Close
	// ============================================================

	fmt.Println("\n============================================================")
	fmt.Println("  BLOCK 2: Buffered Channels, Range & Close")
	fmt.Println("============================================================")

	// ── Buffered channels ───────────────────────────────────
	// WHY: make(chan T, size) creates a buffered channel.
	// Send blocks ONLY when the buffer is full.
	// Receive blocks ONLY when the buffer is empty.
	// This decouples sender and receiver timing.

	fmt.Println("\n--- Buffered channel basics ---")

	rack := make(chan string, 3) // holding rack at station holds 3 tiffins

	// All three sends succeed without blocking (rack not full)
	rack <- "Tiffin A"
	rack <- "Tiffin B"
	rack <- "Tiffin C"
	// rack <- "Tiffin D" // This WOULD block — rack is full!

	fmt.Printf("  Rack length: %d, capacity: %d\n", len(rack), cap(rack))
	// Output: Rack length: 3, capacity: 3

	fmt.Println("  Picking up from rack (FIFO order):")
	fmt.Println("   ", <-rack) // Output: Tiffin A
	fmt.Println("   ", <-rack) // Output: Tiffin B
	fmt.Println("   ", <-rack) // Output: Tiffin C

	fmt.Printf("  After draining — length: %d, capacity: %d\n",
		len(rack), cap(rack))
	// Output: After draining — length: 0, capacity: 3

	// ── When to use buffered vs unbuffered ──────────────────
	fmt.Println("\n--- Buffered vs Unbuffered ---")
	fmt.Println("  Unbuffered (make(chan T)):")
	fmt.Println("    - Guarantees synchronization (rendezvous)")
	fmt.Println("    - Sender blocks until receiver is ready")
	fmt.Println("    - Use when you need coordination")
	fmt.Println("  Buffered (make(chan T, n)):")
	fmt.Println("    - Allows sender to proceed if buffer has space")
	fmt.Println("    - Decouples fast producer from slow consumer")
	fmt.Println("    - Use for throughput, rate limiting, semaphores")

	// ── Buffered channel as semaphore ───────────────────────
	fmt.Println("\n--- Buffered channel as semaphore ---")

	// WHY: A buffered channel of capacity N can limit concurrency
	// to N goroutines.  Send to acquire, receive to release.

	sem := make(chan struct{}, 2) // max 2 concurrent dabbawalas
	var wg sync.WaitGroup

	for i := 1; i <= 5; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			sem <- struct{}{} // acquire (blocks if 2 already running)
			fmt.Printf("  Dabbawala %d: delivering (concurrent limit = 2)\n", id)
			time.Sleep(30 * time.Millisecond)
			<-sem // release
		}(i)
	}

	wg.Wait()
	fmt.Println("  All dabbawalas finished with concurrency limit.")

	// ── close() and range ───────────────────────────────────
	fmt.Println("\n--- close() and range over channel ---")

	ch := make(chan int, 5)

	// Fill the buffer
	for i := 1; i <= 5; i++ {
		ch <- i * 10
	}
	close(ch) // Signal: no more values will be sent

	// range automatically stops when channel is closed and drained
	fmt.Print("  Tiffin IDs: ")
	for v := range ch {
		fmt.Printf("%d ", v)
	}
	fmt.Println()
	// Output: Tiffin IDs: 10 20 30 40 50

	// ── Detecting closed channel with comma-ok ──────────────
	fmt.Println("\n--- Comma-ok idiom for closed channels ---")

	ch2 := make(chan int, 1)
	ch2 <- 42
	close(ch2)

	val, ok := <-ch2
	fmt.Printf("  val=%d, ok=%v (tiffin was on the rack)\n", val, ok)
	// Output: val=42, ok=true (tiffin was on the rack)

	val, ok = <-ch2
	fmt.Printf("  val=%d, ok=%v (relay closed, zero value)\n", val, ok)
	// Output: val=0, ok=false (relay closed, zero value)

	// ============================================================
	//  EXAMPLE BLOCK 3 — Channel Axioms, Patterns, Deadlock
	// ============================================================

	fmt.Println("\n============================================================")
	fmt.Println("  BLOCK 3: Channel Axioms, Patterns & Deadlock")
	fmt.Println("============================================================")

	// ── THE THREE CHANNEL AXIOMS ────────────────────────────
	fmt.Println("\n--- The Three Channel Axioms ---")

	// AXIOM 1: Send to a closed channel → PANIC
	fmt.Println("\n  Axiom 1: Send to closed relay = PANIC")
	func() {
		defer func() {
			if r := recover(); r != nil {
				fmt.Println("    Recovered panic:", r)
				// Output: Recovered panic: send on closed channel
			}
		}()
		ch := make(chan int)
		close(ch)
		ch <- 1 // PANIC!
	}()

	// AXIOM 2: Receive from closed channel → zero value (immediately)
	fmt.Println("\n  Axiom 2: Receive from closed relay = zero value")
	func() {
		ch := make(chan int)
		close(ch)
		v := <-ch
		fmt.Printf("    Received from closed chan: %d (zero value for int)\n", v)
		// Output: Received from closed chan: 0 (zero value for int)
	}()

	func() {
		ch := make(chan string)
		close(ch)
		v := <-ch
		fmt.Printf("    Received from closed chan: %q (zero value for string)\n", v)
		// Output: Received from closed chan: "" (zero value for string)
	}()

	// AXIOM 3: Send/receive on nil channel → block FOREVER
	fmt.Println("\n  Axiom 3: Send/receive on nil channel = block forever")
	fmt.Println("    var ch chan int  // ch is nil")
	fmt.Println("    ch <- 1         // blocks forever (deadlock if nothing else runs)")
	fmt.Println("    <-ch            // blocks forever")
	fmt.Println("    WHY: Nil channels are useful in select to disable a case.")

	// ── Summary table ───────────────────────────────────────
	fmt.Println("\n--- Channel behavior summary ---")
	fmt.Println("  Operation      | nil chan  | closed chan  | open chan")
	fmt.Println("  ───────────────┼──────────┼─────────────┼──────────")
	fmt.Println("  send (ch<-)    | block    | PANIC       | send/block")
	fmt.Println("  receive (<-ch) | block    | zero, false | recv/block")
	fmt.Println("  close(ch)      | PANIC    | PANIC       | close OK")

	// ── Pattern: Done channel ───────────────────────────────
	fmt.Println("\n--- Pattern: Done channel for cancellation ---")

	doneCh := make(chan struct{}) // struct{} costs zero bytes

	go func() {
		for i := 0; ; i++ {
			select {
			case <-doneCh:
				fmt.Printf("    Dabbawala Sunil stopped after %d deliveries\n", i)
				return
			default:
				// do work
				time.Sleep(10 * time.Millisecond)
			}
		}
	}()

	time.Sleep(55 * time.Millisecond) // Let dabbawala run a bit
	close(doneCh)                     // Signal cancellation
	time.Sleep(20 * time.Millisecond) // Let dabbawala print

	// WHY: Closing a channel unblocks ALL receivers simultaneously.
	// This is more powerful than sending a single value, because
	// multiple goroutines can listen on the same done channel.

	// ── Pattern: Generator (channel factory) ────────────────
	fmt.Println("\n--- Pattern: Generator function ---")

	// WHY: A function that returns a receive-only channel and
	// populates it in a goroutine is a generator pattern.

	fibonacci := func(n int) <-chan int {
		ch := make(chan int)
		go func() {
			a, b := 0, 1
			for i := 0; i < n; i++ {
				ch <- a
				a, b = b, a+b
			}
			close(ch)
		}()
		return ch
	}

	fmt.Print("  Fibonacci(8): ")
	for v := range fibonacci(8) {
		fmt.Printf("%d ", v)
	}
	fmt.Println()
	// Output: Fibonacci(8): 0 1 1 2 3 5 8 13

	// ── Pattern: Pipeline ───────────────────────────────────
	fmt.Println("\n--- Pattern: Pipeline ---")

	// Stage 1: generate tiffin order numbers
	gen := func(nums ...int) <-chan int {
		out := make(chan int)
		go func() {
			for _, n := range nums {
				out <- n
			}
			close(out)
		}()
		return out
	}

	// Stage 2: square each number
	square := func(in <-chan int) <-chan int {
		out := make(chan int)
		go func() {
			for n := range in {
				out <- n * n
			}
			close(out)
		}()
		return out
	}

	// Connect the pipeline: gen → square → print
	fmt.Print("  Pipeline (gen → square): ")
	for v := range square(gen(2, 3, 4, 5)) {
		fmt.Printf("%d ", v)
	}
	fmt.Println()
	// Output: Pipeline (gen → square): 4 9 16 25

	// ── Deadlock detection ──────────────────────────────────
	fmt.Println("\n--- Deadlock detection ---")
	fmt.Println("  Go runtime detects when ALL goroutines are blocked:")
	fmt.Println("    fatal error: all goroutines are asleep - deadlock!")
	fmt.Println()
	fmt.Println("  Common deadlock causes:")
	fmt.Println("    1. Sending on unbuffered channel with no receiver")
	fmt.Println("    2. Receiving from channel with no sender")
	fmt.Println("    3. Circular wait (dabbawala A waits on B, B waits on A)")
	fmt.Println("    4. Forgetting to close a channel that range is reading")
	fmt.Println()
	fmt.Println("  Note: The detector only catches the case where ALL goroutines")
	fmt.Println("  are stuck. If even one goroutine is running (e.g., a timer),")
	fmt.Println("  a partial deadlock goes undetected at runtime.")

	// ============================================================
	//  KEY TAKEAWAYS
	// ============================================================
	fmt.Println("\n============================================================")
	fmt.Println("  KEY TAKEAWAYS")
	fmt.Println("============================================================")
	fmt.Println(`
  1. Unbuffered channels (make(chan T)) synchronize sender and
     receiver — they must rendezvous. Great for coordination.

  2. Buffered channels (make(chan T, n)) decouple timing. Send
     blocks only when full, receive blocks only when empty.

  3. Directional channels (chan<- T, <-chan T) in function
     signatures document and enforce who sends vs receives.

  4. close(ch) signals "no more values." Use range to drain.
     Only the SENDER should close. Never close from receiver side.

  5. The three axioms:
     - Send to closed channel → panic
     - Receive from closed channel → zero value, ok=false
     - Send/receive on nil channel → block forever

  6. Generator pattern: return <-chan T from a function that
     populates the channel in a goroutine.

  7. Pipeline pattern: chain generators stage by stage.
     Each stage is a goroutine connected by channels.

  8. Go runtime detects deadlocks when ALL goroutines are stuck,
     but partial deadlocks (some goroutines still running) are
     not detected automatically.`)
}
