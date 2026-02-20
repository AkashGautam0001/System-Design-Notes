// ============================================================
//  FILE 12 : Defer, Panic, and Recover
// ============================================================
//  Topic  : defer (LIFO order, argument evaluation), practical
//           defer patterns (close, unlock, cleanup), panic
//           (runtime vs deliberate), recover (catching panics),
//           converting panic to error.
//
//  WHY THIS MATTERS:
//  defer ensures cleanup always happens — files get closed,
//  locks get released, resources get freed. panic and recover
//  handle truly exceptional situations (not normal errors).
//  Understanding these three mechanisms makes your Go code
//  robust and leak-free.
// ============================================================

// ============================================================
// STORY: NDRF Disaster Response
// Commander Rathore leads an NDRF disaster response team.
// Every rescue zone has standard operating procedures: when
// you enter, a cleanup procedure is SCHEDULED (defer). If an
// earthquake strikes (panic), the NDRF recovery unit kicks
// in (recover) to prevent total destruction. But Commander
// Rathore knows: you don't trigger the earthquake alarm for
// a broken window — that's what normal error handling is for.
// ============================================================

package main

import (
	"fmt"
	"strings"
	"sync"
)

func main() {

	// ──────────────────────────────────────────────────────────────
	// EXAMPLE BLOCK 1 — Defer Basics (LIFO, Argument Evaluation,
	//                    Loop Defer), Practical Patterns
	// ──────────────────────────────────────────────────────────────

	// ────────────────────────────────────────────────────────────
	// 1.1 — Defer Basics: LIFO (Last In, First Out) Order
	// ────────────────────────────────────────────────────────────
	// WHY: Deferred calls execute in reverse order when the
	// surrounding function returns. Think of a stack of plates.

	fmt.Println("--- Defer LIFO Order ---")
	deferLIFO := func() {
		fmt.Println("  Start")
		defer fmt.Println("  Deferred 1 (first scheduled)")
		defer fmt.Println("  Deferred 2 (second scheduled)")
		defer fmt.Println("  Deferred 3 (third scheduled)")
		fmt.Println("  End")
	}
	deferLIFO()
	// Output:
	//   Start
	//   End
	//   Deferred 3 (third scheduled)
	//   Deferred 2 (second scheduled)
	//   Deferred 1 (first scheduled)
	// WHY: LIFO ensures matched pairs (open/close) unwind correctly.

	// ────────────────────────────────────────────────────────────
	// 1.2 — Defer Argument Evaluation: At Defer Time!
	// ────────────────────────────────────────────────────────────
	// WHY: Arguments to deferred functions are evaluated WHEN
	// the defer statement executes, NOT when the function runs.

	fmt.Println("\n--- Defer Argument Evaluation ---")
	deferEval := func() {
		x := 10
		defer fmt.Printf("  Deferred x = %d (captured at defer time)\n", x)
		x = 20
		fmt.Printf("  Current x = %d\n", x)
	}
	deferEval()
	// Output:
	//   Current x = 20
	//   Deferred x = 10 (captured at defer time)
	// WHY: x was 10 when defer was called, so 10 is captured.

	// To capture the FINAL value, use a closure:
	fmt.Println("\n--- Defer with Closure (captures final value) ---")
	deferClosure := func() {
		x := 10
		defer func() {
			fmt.Printf("  Closure sees x = %d (final value)\n", x)
		}()
		x = 20
		fmt.Printf("  Current x = %d\n", x)
	}
	deferClosure()
	// Output:
	//   Current x = 20
	//   Closure sees x = 20 (final value)
	// WHY: The closure captures the variable, not the value.

	// ────────────────────────────────────────────────────────────
	// 1.3 — Defer in Loops: Watch Out!
	// ────────────────────────────────────────────────────────────
	// WHY: Defer runs when the FUNCTION exits, not the loop.
	// Deferring in a loop can cause resource leaks.

	fmt.Println("\n--- Defer in Loops (Be Careful) ---")
	deferLoop := func() {
		for i := 0; i < 3; i++ {
			defer fmt.Printf("  Loop defer i=%d\n", i)
		}
		fmt.Println("  Loop finished")
	}
	deferLoop()
	// Output:
	//   Loop finished
	//   Loop defer i=2
	//   Loop defer i=1
	//   Loop defer i=0
	// WHY: All 3 defers stack up and run AFTER the function returns.

	// Better pattern: wrap in an immediately-called function
	fmt.Println("\n--- Defer in Loops (Correct Pattern) ---")
	for i := 0; i < 3; i++ {
		func(n int) {
			defer fmt.Printf("  Cleanup for iteration %d\n", n)
			fmt.Printf("  Processing iteration %d\n", n)
		}(i)
	}
	// Output:
	//   Processing iteration 0
	//   Cleanup for iteration 0
	//   Processing iteration 1
	//   Cleanup for iteration 1
	//   Processing iteration 2
	//   Cleanup for iteration 2
	// WHY: Each iteration's anonymous function has its own defer scope.

	// ────────────────────────────────────────────────────────────
	// 1.4 — Practical Pattern: Simulated File Close
	// ────────────────────────────────────────────────────────────
	// WHY: The most common defer pattern — open a resource,
	// immediately defer its cleanup.

	fmt.Println("\n--- Practical: File Close Pattern ---")
	type MockFile struct {
		Name string
	}
	openFile := func(name string) (*MockFile, error) {
		fmt.Printf("  Opening %s\n", name)
		return &MockFile{Name: name}, nil
	}
	closeFile := func(f *MockFile) {
		fmt.Printf("  Closing %s\n", f.Name)
	}

	processFile := func(filename string) error {
		f, err := openFile(filename)
		if err != nil {
			return err
		}
		defer closeFile(f) // guaranteed cleanup!

		fmt.Printf("  Reading from %s\n", f.Name)
		fmt.Printf("  Processing %s data\n", f.Name)
		return nil
	}

	_ = processFile("disaster-report.txt")
	// Output:
	//   Opening disaster-report.txt
	//   Reading from disaster-report.txt
	//   Processing disaster-report.txt data
	//   Closing disaster-report.txt
	// WHY: closeFile runs even if processing panics or returns early.

	// ────────────────────────────────────────────────────────────
	// 1.5 — Practical Pattern: Mutex Unlock
	// ────────────────────────────────────────────────────────────
	// WHY: defer mu.Unlock() right after mu.Lock() ensures the
	// lock is ALWAYS released, even on panic.

	fmt.Println("\n--- Practical: Mutex Unlock ---")
	var mu sync.Mutex
	counter := 0

	safeIncrement := func() {
		mu.Lock()
		defer mu.Unlock() // runs when function exits
		counter++
		fmt.Printf("  Counter incremented to %d\n", counter)
	}

	safeIncrement()
	safeIncrement()
	safeIncrement()
	fmt.Println("  Final counter:", counter)
	// Output:
	//   Counter incremented to 1
	//   Counter incremented to 2
	//   Counter incremented to 3
	//   Final counter: 3

	// ────────────────────────────────────────────────────────────
	// 1.6 — Practical Pattern: Timing with Defer
	// ────────────────────────────────────────────────────────────

	fmt.Println("\n--- Practical: Trace Enter/Exit ---")
	trace := func(name string) func() {
		fmt.Printf("  ENTER %s\n", name)
		return func() {
			fmt.Printf("  EXIT  %s\n", name)
		}
	}

	simulateWork := func() {
		defer trace("simulateWork")()
		fmt.Println("  ... conducting rescue operation ...")
	}
	simulateWork()
	// Output:
	//   ENTER simulateWork
	//   ... conducting rescue operation ...
	//   EXIT  simulateWork
	// WHY: trace() runs immediately (enter), the returned func
	// is deferred (exit). Elegant enter/exit logging.

	// ──────────────────────────────────────────────────────────────
	// EXAMPLE BLOCK 2 — Panic (Runtime vs Deliberate), Recover,
	//                    Converting Panic to Error, When to Panic
	// ──────────────────────────────────────────────────────────────

	// ────────────────────────────────────────────────────────────
	// 2.1 — Runtime Panics
	// ────────────────────────────────────────────────────────────
	// WHY: Some operations cause runtime panics automatically:
	//   - nil pointer dereference
	//   - index out of bounds
	//   - division by zero (integer)
	//   - closing a closed channel
	//   - type assertion failure

	fmt.Println("\n--- Runtime Panics (examples, recovered safely) ---")
	safeDemo := func(name string, fn func()) {
		defer func() {
			if r := recover(); r != nil {
				fmt.Printf("  RECOVERED [%s]: %v\n", name, r)
			}
		}()
		fn()
	}

	// Index out of bounds
	safeDemo("out of bounds", func() {
		s := []int{1, 2, 3}
		_ = s[10]
	})
	// Output:   RECOVERED [out of bounds]: runtime error: index out of range [10] with length 3

	// Nil pointer dereference
	safeDemo("nil pointer", func() {
		var p *int
		_ = *p
	})
	// Output:   RECOVERED [nil pointer]: runtime error: invalid memory address or nil pointer dereference

	// Nil map write
	safeDemo("nil map", func() {
		var m map[string]int
		m["key"] = 1
	})
	// Output:   RECOVERED [nil map]: assignment to entry in nil map

	// ────────────────────────────────────────────────────────────
	// 2.2 — Deliberate Panic
	// ────────────────────────────────────────────────────────────
	// WHY: Use panic() deliberately only for PROGRAMMER ERRORS —
	// situations that should never happen if the code is correct.

	fmt.Println("\n--- Deliberate Panic ---")
	mustParseConfig := func(configStr string) map[string]string {
		// In real code, this would parse a config file.
		// If the format is wrong, it's a programmer error.
		if configStr == "" {
			panic("mustParseConfig: config string cannot be empty")
		}
		config := make(map[string]string)
		for _, line := range strings.Split(configStr, "\n") {
			parts := strings.SplitN(line, "=", 2)
			if len(parts) == 2 {
				config[strings.TrimSpace(parts[0])] = strings.TrimSpace(parts[1])
			}
		}
		return config
	}

	config := mustParseConfig("zone=earthquake-zone-4\nseverity=high")
	fmt.Println("  Config:", config)
	// Output:   Config: map[severity:high zone:earthquake-zone-4]

	// Recover from bad input
	func() {
		defer func() {
			if r := recover(); r != nil {
				fmt.Println("  Caught panic:", r)
			}
		}()
		mustParseConfig("") // this panics
	}()
	// Output:   Caught panic: mustParseConfig: config string cannot be empty

	// ────────────────────────────────────────────────────────────
	// 2.3 — Recover: Only Works in Deferred Functions
	// ────────────────────────────────────────────────────────────
	// WHY: recover() returns nil if called outside a deferred
	// function or when there's no panic. It STOPS the panic.

	fmt.Println("\n--- Recover Basics ---")
	riskyOperation := func() (result string, err error) {
		defer func() {
			if r := recover(); r != nil {
				err = fmt.Errorf("panic recovered: %v", r)
			}
		}()

		// Simulate something going wrong
		panic("building collapse detected!")

		// This line never executes
		// return "success", nil
	}

	result, err := riskyOperation()
	fmt.Println("Result:", result)
	// Output: Result:
	fmt.Println("Error:", err)
	// Output: Error: panic recovered: building collapse detected!
	// WHY: The panic was caught and converted to an error.

	// ────────────────────────────────────────────────────────────
	// 2.4 — Converting Panic to Error (Production Pattern)
	// ────────────────────────────────────────────────────────────
	// WHY: Library/HTTP handler code should convert panics to
	// errors — never let a panic crash the whole server.

	fmt.Println("\n--- Converting Panic to Error ---")
	safeExecute := func(fn func()) (err error) {
		defer func() {
			if r := recover(); r != nil {
				switch v := r.(type) {
				case error:
					err = fmt.Errorf("caught panic (error): %w", v)
				case string:
					err = fmt.Errorf("caught panic (string): %s", v)
				default:
					err = fmt.Errorf("caught panic (unknown): %v", v)
				}
			}
		}()
		fn()
		return nil
	}

	// Test with string panic
	err = safeExecute(func() {
		panic("earthquake in zone 4")
	})
	fmt.Println("  Recovered:", err)
	// Output:   Recovered: caught panic (string): earthquake in zone 4

	// Test with no panic
	err = safeExecute(func() {
		fmt.Println("  Normal operation — no disaster")
	})
	fmt.Println("  Error:", err)
	// Output:
	//   Normal operation — no disaster
	//   Error: <nil>

	// ────────────────────────────────────────────────────────────
	// 2.5 — Defer Runs Even During Panic
	// ────────────────────────────────────────────────────────────
	// WHY: Deferred functions ALWAYS run — even when unwinding
	// from a panic. This is why defer is reliable for cleanup.

	fmt.Println("\n--- Defer Runs During Panic ---")
	func() {
		defer func() {
			if r := recover(); r != nil {
				fmt.Println("  Recovered panic:", r)
			}
		}()
		defer fmt.Println("  Cleanup 1: evacuating survivors")
		defer fmt.Println("  Cleanup 2: securing perimeter")

		fmt.Println("  About to panic...")
		panic("aftershock detected!")
	}()
	// Output:
	//   About to panic...
	//   Cleanup 2: securing perimeter
	//   Cleanup 1: evacuating survivors
	//   Recovered panic: aftershock detected!
	// WHY: All defers ran in LIFO order before recover caught the panic.

	// ────────────────────────────────────────────────────────────
	// 2.6 — When to Panic vs Return Error
	// ────────────────────────────────────────────────────────────

	fmt.Println("\n--- When to Panic vs Return Error ---")
	fmt.Println("USE panic() when:")
	fmt.Println("  1. Initialization fails (bad config at startup)")
	fmt.Println("  2. Programmer error (impossible state, violated invariant)")
	fmt.Println("  3. Must-succeed functions (MustCompile for regex)")
	fmt.Println("")
	fmt.Println("RETURN error when:")
	fmt.Println("  1. I/O operations (file, network, database)")
	fmt.Println("  2. User input validation")
	fmt.Println("  3. Any expected failure condition")
	fmt.Println("  4. Library functions (let the caller decide)")
	fmt.Println("")
	fmt.Println("GOLDEN RULE: If in doubt, return an error. Panic is exceptional.")

	// ────────────────────────────────────────────────────────────
	// 2.7 — Complete Example: HTTP Handler Safety Wrapper
	// ────────────────────────────────────────────────────────────

	fmt.Println("\n--- Complete: Safe Handler Pattern ---")
	type Request struct {
		Path string
	}
	type Response struct {
		Status int
		Body   string
	}

	safeHandler := func(handler func(Request) Response) func(Request) Response {
		return func(req Request) (resp Response) {
			defer func() {
				if r := recover(); r != nil {
					fmt.Printf("  PANIC in handler for %s: %v\n", req.Path, r)
					resp = Response{Status: 500, Body: "Internal Server Error"}
				}
			}()
			return handler(req)
		}
	}

	// Normal handler
	healthHandler := safeHandler(func(req Request) Response {
		return Response{Status: 200, Body: "OK"}
	})

	// Buggy handler that panics
	buggyHandler := safeHandler(func(req Request) Response {
		panic("null reference in handler")
	})

	resp := healthHandler(Request{Path: "/health"})
	fmt.Printf("  /health → %d %s\n", resp.Status, resp.Body)
	// Output:   /health → 200 OK

	resp = buggyHandler(Request{Path: "/buggy"})
	fmt.Printf("  /buggy  → %d %s\n", resp.Status, resp.Body)
	// Output:
	//   PANIC in handler for /buggy: null reference in handler
	//   /buggy  → 500 Internal Server Error

	// ============================================================
	// KEY TAKEAWAYS
	// ============================================================
	// 1. defer executes in LIFO order when the function returns.
	// 2. Deferred arguments are evaluated at defer time, NOT execution
	//    time. Use closures to capture final values.
	// 3. Defer in loops stacks up — wrap in anonymous func if needed.
	// 4. Common defer patterns: close files, unlock mutexes, log exit.
	// 5. panic stops normal execution and unwinds the stack.
	// 6. recover() only works inside a deferred function.
	// 7. Deferred functions run EVEN during panic — cleanup is safe.
	// 8. Convert panics to errors in library/handler code.
	// 9. Use panic for programmer errors and init failures ONLY.
	// 10. GOLDEN RULE: Return errors for expected failures,
	//     panic only for truly exceptional situations.
}
