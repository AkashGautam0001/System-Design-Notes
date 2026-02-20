// ============================================================
//  FILE 18: CONTEXT
// ============================================================
//  Topic: context.Background, WithCancel, WithTimeout,
//         WithDeadline, WithValue, propagation, and patterns.
//
//  WHY THIS MATTERS:
//    Context is Go's standard mechanism for cancellation,
//    timeouts, and request-scoped values across API boundaries.
//    Every production Go server passes context through its call
//    chain.  Without context, you can't gracefully cancel work,
//    enforce deadlines, or trace requests through a system.
// ============================================================
//
//  STORY — "ISRO Mission Control"
//  Director Sivan runs ISRO's Sriharikota Launch Control for
//  space operations. Each mission (request) has a context:
//    - WithCancel: manual abort button — Sivan presses it to
//      scrub a mission at any time.
//    - WithTimeout: auto-abort timer — if the fuel check takes
//      too long, the launch is cancelled automatically.
//    - WithDeadline: scheduled end — the mission must complete
//      by a specific time.
//    - WithValue: mission briefcase — carries request-scoped data
//      (mission ID, crew info) without polluting function signatures.
//  Cancellation flows DOWN the chain: cancelling a parent context
//  cancels all its children.  It never flows up.
// ============================================================

package main

import (
	"context"
	"fmt"
	"time"
)

func main() {
	// ============================================================
	//  EXAMPLE BLOCK 1 — WithCancel, WithTimeout, WithDeadline
	// ============================================================

	fmt.Println("============================================================")
	fmt.Println("  BLOCK 1: WithCancel, WithTimeout & WithDeadline")
	fmt.Println("============================================================")

	// ── context.Background() — the root context ─────────────
	// WHY: Background() returns an empty, non-nil context.  It's
	// the root of any context tree — used in main, init, and tests.

	fmt.Println("\n--- context.Background() and context.TODO() ---")
	bg := context.Background()
	fmt.Printf("  Background: %v (never cancelled, no deadline)\n", bg)
	// Output: Background: context.Background (never cancelled, no deadline)

	// context.TODO() — placeholder when you don't know which context to use yet
	todo := context.TODO()
	fmt.Printf("  TODO:       %v (same as Background, signals intent to replace)\n", todo)
	// Output: TODO:       context.TODO (same as Background, signals intent to replace)

	// ── context.WithCancel — manual cancellation ────────────
	// WHY: WithCancel returns a child context and a cancel function.
	// Call cancel() to signal ALL goroutines listening on ctx.Done().

	fmt.Println("\n--- context.WithCancel — mission scrubbed ---")

	ctx, cancel := context.WithCancel(context.Background())

	// Simulate a Chandrayaan subsystem that checks for cancellation
	missionComplete := make(chan string, 1)
	go func(ctx context.Context) {
		for i := 1; ; i++ {
			select {
			case <-ctx.Done():
				fmt.Printf("  Chandrayaan subsystem aborted at step %d: %v\n", i, ctx.Err())
				// Output: Chandrayaan subsystem aborted at step <N>: context canceled
				missionComplete <- "scrubbed"
				return
			default:
				fmt.Printf("  Chandrayaan subsystem step %d executing...\n", i)
				time.Sleep(20 * time.Millisecond)
			}
		}
	}(ctx)

	// Let the mission run for a bit, then cancel
	time.Sleep(55 * time.Millisecond)
	cancel() // Signal cancellation — ctx.Done() channel closes
	result := <-missionComplete
	fmt.Println("  Mission result:", result)
	// Output: Mission result: scrubbed

	// WHY: Always call cancel() even if the context expires naturally.
	// It's safe to call multiple times. Use defer cancel() right
	// after creating the context.

	// ── ctx.Done() and ctx.Err() ────────────────────────────
	fmt.Println("\n--- ctx.Done() and ctx.Err() ---")
	fmt.Println("  ctx.Done() returns a channel that closes when cancelled.")
	fmt.Println("  ctx.Err() returns nil while active, then:")
	fmt.Println("    - context.Canceled: if cancel() was called")
	fmt.Println("    - context.DeadlineExceeded: if timeout/deadline expired")

	// ── context.WithTimeout — auto-cancel after duration ────
	// WHY: WithTimeout is like WithCancel but the runtime calls
	// cancel automatically after the specified duration.

	fmt.Println("\n--- context.WithTimeout — auto-abort timer ---")

	fuelCheck := func(ctx context.Context) error {
		select {
		case <-time.After(200 * time.Millisecond): // Simulates slow fuel check
			fmt.Println("  Fuel check completed successfully!")
			return nil
		case <-ctx.Done():
			fmt.Println("  Fuel check timed out:", ctx.Err())
			return ctx.Err()
		}
	}

	// Give only 50ms for a 200ms fuel check
	timeoutCtx, timeoutCancel := context.WithTimeout(
		context.Background(),
		50*time.Millisecond,
	)
	defer timeoutCancel() // Always defer cancel!

	err := fuelCheck(timeoutCtx)
	if err != nil {
		fmt.Println("  Error:", err)
		// Output: Error: context deadline exceeded
	}

	// Show timeout context details
	if deadline, ok := timeoutCtx.Deadline(); ok {
		fmt.Printf("  Deadline was: %v\n", deadline.Format("15:04:05.000"))
	}

	// ── context.WithDeadline — auto-cancel at specific time ─
	// WHY: WithDeadline is like WithTimeout but you specify an
	// absolute time instead of a duration.

	fmt.Println("\n--- context.WithDeadline — absolute deadline ---")

	deadline := time.Now().Add(60 * time.Millisecond)
	deadlineCtx, deadlineCancel := context.WithDeadline(
		context.Background(),
		deadline,
	)
	defer deadlineCancel()

	fmt.Printf("  Deadline set to: %v\n", deadline.Format("15:04:05.000"))

	select {
	case <-time.After(200 * time.Millisecond):
		fmt.Println("  Finished before deadline (won't happen)")
	case <-deadlineCtx.Done():
		fmt.Println("  Deadline reached:", deadlineCtx.Err())
		// Output: Deadline reached: context deadline exceeded
	}

	// ── Cancellation propagation (parent → children) ────────
	// WHY: Cancelling a parent context automatically cancels all
	// its child contexts.  This is how a single mission abort
	// can cancel an entire tree of subsystem operations.

	fmt.Println("\n--- Cancellation propagates parent → children ---")

	parentCtx, parentCancel := context.WithCancel(context.Background())
	child1Ctx, child1Cancel := context.WithCancel(parentCtx)
	child2Ctx, child2Cancel := context.WithTimeout(parentCtx, 5*time.Second)
	defer child1Cancel()
	defer child2Cancel()

	// Cancel the parent
	parentCancel()

	// Check all children
	time.Sleep(5 * time.Millisecond) // Let cancellation propagate
	fmt.Println("  Parent err:", parentCtx.Err())
	// Output: Parent err: context canceled
	fmt.Println("  Child1 err:", child1Ctx.Err())
	// Output: Child1 err: context canceled
	fmt.Println("  Child2 err:", child2Ctx.Err())
	// Output: Child2 err: context canceled

	fmt.Println("  WHY: Cancelling parent cancels ALL descendants automatically.")
	fmt.Println("  But cancelling a child does NOT cancel the parent.")

	// ============================================================
	//  EXAMPLE BLOCK 2 — WithValue, Propagation, Practical Patterns
	// ============================================================

	fmt.Println("\n============================================================")
	fmt.Println("  BLOCK 2: WithValue, Propagation & Patterns")
	fmt.Println("============================================================")

	// ── context.WithValue — request-scoped values ───────────
	// WHY: WithValue attaches a key-value pair to a context.
	// Use it for request-scoped data like mission IDs, auth tokens,
	// and trace IDs — NOT for passing function parameters.

	fmt.Println("\n--- context.WithValue — request-scoped data ---")

	// WHY: Use a custom type as key to avoid collisions.
	// NEVER use built-in types (string, int) as context keys.
	type contextKey string

	const (
		missionIDKey contextKey = "missionID"
		crewKey      contextKey = "crew"
	)

	// Build a context with values
	valCtx := context.WithValue(context.Background(), missionIDKey, "CHANDRAYAAN-3")
	valCtx = context.WithValue(valCtx, crewKey, []string{"Sivan", "Pradeep", "Annadurai"})

	// Retrieve values (type assertion required)
	if id, ok := valCtx.Value(missionIDKey).(string); ok {
		fmt.Println("  Mission ID:", id)
		// Output: Mission ID: CHANDRAYAAN-3
	}

	if crew, ok := valCtx.Value(crewKey).([]string); ok {
		fmt.Println("  Crew:", crew)
		// Output: Crew: [Sivan Pradeep Annadurai]
	}

	// Non-existent key returns nil
	fmt.Println("  Missing key:", valCtx.Value(contextKey("nonexistent")))
	// Output: Missing key: <nil>

	// ── WithValue rules ─────────────────────────────────────
	fmt.Println("\n--- WithValue rules ---")
	fmt.Println("  DO:")
	fmt.Println("    - Use custom unexported types as keys")
	fmt.Println("    - Store request-scoped values (mission ID, auth token)")
	fmt.Println("    - Keep values immutable")
	fmt.Println("  DON'T:")
	fmt.Println("    - Pass function parameters through context")
	fmt.Println("    - Store mutable state (maps, pointers to shared data)")
	fmt.Println("    - Use string keys (risk of collision)")
	fmt.Println("    - Store large objects (context is copied on every WithValue)")

	// ── Context propagation through a call chain ────────────
	// WHY: In production Go, context flows from the top-level
	// handler through every function in the call chain.

	fmt.Println("\n--- Context propagation through call chain ---")

	// Simulate a launch controller → subsystem → telemetry chain
	type MissionKey string
	const reqIDKey MissionKey = "missionID"

	// Level 3: Telemetry (deepest)
	queryTelemetry := func(ctx context.Context, query string) (string, error) {
		reqID, _ := ctx.Value(reqIDKey).(string)

		select {
		case <-ctx.Done():
			return "", fmt.Errorf("[telemetry] mission %s cancelled: %w", reqID, ctx.Err())
		case <-time.After(20 * time.Millisecond): // Simulate telemetry query
			return fmt.Sprintf("[telemetry] data for '%s' (mission: %s)", query, reqID), nil
		}
	}

	// Level 2: Subsystem layer
	getSubsystemStatus := func(ctx context.Context, subsystemID string) (string, error) {
		// Pass context down — it carries the timeout AND mission ID
		return queryTelemetry(ctx, "SELECT * FROM subsystems WHERE id="+subsystemID)
	}

	// Level 1: Launch Controller (top level)
	handleLaunchCheck := func(missionID string) {
		// Create context with timeout and mission ID
		ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
		defer cancel()

		ctx = context.WithValue(ctx, reqIDKey, missionID)

		result, err := getSubsystemStatus(ctx, "NAV-01")
		if err != nil {
			fmt.Println("  Controller error:", err)
			return
		}
		fmt.Println("  Controller response:", result)
	}

	handleLaunchCheck("MANGALYAAN-2")
	// Output: Controller response: [telemetry] data for 'SELECT * FROM subsystems WHERE id=NAV-01' (mission: MANGALYAAN-2)

	// ── Pattern: HTTP handler timeout ───────────────────────
	fmt.Println("\n--- Pattern: HTTP handler with timeout ---")
	fmt.Println(`  func handler(w http.ResponseWriter, r *http.Request) {
      // r.Context() already has a context from the HTTP server
      ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
      defer cancel()

      result, err := slowService(ctx) // Pass context to service
      if err != nil {
          if errors.Is(err, context.DeadlineExceeded) {
              http.Error(w, "timeout", http.StatusGatewayTimeout)
              return
          }
          http.Error(w, err.Error(), http.StatusInternalServerError)
          return
      }
      fmt.Fprint(w, result)
  }`)

	// ── Pattern: Graceful shutdown ──────────────────────────
	fmt.Println("\n--- Pattern: Graceful shutdown ---")

	// Simulate a Sriharikota ground station with graceful shutdown
	stationCtx, stationCancel := context.WithCancel(context.Background())

	workerDone := make(chan struct{})
	go func() {
		defer close(workerDone)
		ticker := time.NewTicker(15 * time.Millisecond)
		defer ticker.Stop()

		iterations := 0
		for {
			select {
			case <-stationCtx.Done():
				fmt.Printf("  Ground station worker: shutting down after %d ticks\n", iterations)
				// Cleanup: flush buffers, close connections...
				fmt.Println("  Ground station worker: cleanup complete")
				return
			case <-ticker.C:
				iterations++
			}
		}
	}()

	// Simulate running for a while, then shutdown
	time.Sleep(60 * time.Millisecond)
	fmt.Println("  Initiating graceful shutdown...")
	stationCancel() // Signal all workers to stop
	<-workerDone    // Wait for worker to finish cleanup
	fmt.Println("  Sriharikota ground station shut down cleanly.")

	// ── Pattern: context.AfterFunc (Go 1.21+) ───────────────
	fmt.Println("\n--- context.AfterFunc (Go 1.21+) ---")
	fmt.Println("  Registers a function to run when the context is cancelled.")
	fmt.Println("  Runs in its own goroutine, does NOT block the caller.")

	afterCtx, afterCancel := context.WithCancel(context.Background())
	afterDone := make(chan struct{})

	stop := context.AfterFunc(afterCtx, func() {
		fmt.Println("  [AfterFunc] Context cancelled, running cleanup!")
		close(afterDone)
	})
	_ = stop // stop() returns true if the function was successfully unregistered

	afterCancel()
	<-afterDone
	// Output: [AfterFunc] Context cancelled, running cleanup!

	// ── Context best practices ──────────────────────────────
	fmt.Println("\n--- Context best practices ---")
	fmt.Println("  1. ctx is ALWAYS the first parameter: func DoWork(ctx context.Context, ...)")
	fmt.Println("  2. NEVER store context in a struct — pass it through function calls")
	fmt.Println("  3. ALWAYS call defer cancel() right after creating a cancelable context")
	fmt.Println("  4. Use context.Background() in main(), tests, and top-level code")
	fmt.Println("  5. Use context.TODO() when unsure which context to use (temporary)")
	fmt.Println("  6. Check ctx.Err() or select on ctx.Done() in long-running operations")
	fmt.Println("  7. Don't pass nil context — use context.Background() or context.TODO()")

	// ============================================================
	//  KEY TAKEAWAYS
	// ============================================================
	fmt.Println("\n============================================================")
	fmt.Println("  KEY TAKEAWAYS")
	fmt.Println("============================================================")
	fmt.Println(`
  1. context.Background() is the root context. Use it in main,
     init, and tests. context.TODO() is a placeholder.

  2. WithCancel returns a cancel function. Call cancel() to signal
     ALL goroutines listening on ctx.Done(). Always defer cancel().

  3. WithTimeout auto-cancels after a duration. WithDeadline
     auto-cancels at a specific time. Both return cancel functions.

  4. Cancellation propagates DOWN: cancelling a parent cancels
     all children. It NEVER propagates up.

  5. ctx.Done() returns a channel that closes on cancellation.
     ctx.Err() returns context.Canceled or context.DeadlineExceeded.

  6. WithValue attaches request-scoped data (mission IDs, auth).
     Use custom key types to avoid collisions. Don't abuse it
     for passing function parameters.

  7. Context is the first parameter by convention:
     func DoWork(ctx context.Context, arg1 Type1, ...) error

  8. Never store context in a struct. Always pass it explicitly
     through the call chain. This keeps cancellation visible.`)
}
