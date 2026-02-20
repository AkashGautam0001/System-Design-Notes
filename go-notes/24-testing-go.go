// ============================================================
//  FILE 24 : Testing in Go
// ============================================================
//  Topic  : testing patterns, table-driven tests, sub-tests,
//           benchmarks, test helpers, fixtures, assertions,
//           testing.T methods, best practices
//
//  WHY THIS MATTERS:
//  Go has testing built into its toolchain — no third-party
//  framework needed. The testing package + "go test" command
//  make it trivially easy to write, run, and maintain tests.
//  Table-driven tests are the idiomatic Go pattern that makes
//  adding new test cases a one-line change. Understanding
//  these patterns separates hobbyist code from production code.
//
//  NOTE: This file demonstrates testing concepts by running
//  test-like functions inside main(). In a real project, you
//  would put these in *_test.go files and run with `go test`.
// ============================================================

// ============================================================
// STORY: The ISI Quality Lab
// Inspector Deshmukh at the Bureau of Indian Standards (BIS)
// ISI lab runs every product through rigorous quality checks
// before it gets the ISI mark. She uses tables of expected
// results, groups related checks together, measures performance
// under stress, and keeps her test fixtures perfectly organized.
// A product that has not been tested is a product that cannot
// bear the ISI mark.
// ============================================================

package main

import (
	"fmt"
	"strings"
	"time"
)

func main() {
	// ============================================================
	// EXAMPLE BLOCK 1 — Unit Tests, Table-Driven, Sub-Tests
	// ============================================================

	fmt.Println("--- BLOCK 1: Unit Tests, Table-Driven, Sub-Tests ---")

	// ──────────────────────────────────────────────────────────────
	// SECTION 1 — Simple assertion helper
	// ──────────────────────────────────────────────────────────────
	// WHY: Go's testing.T has Error/Fatal/Log, but no built-in
	// assert. Teams typically write a small helper. Here we
	// simulate it for demonstration.

	fmt.Println("\n--- Simple assertions ---")

	// Our test helper — simulates testing.T behavior
	passed := 0
	failed := 0

	assertEqual := func(testName string, got, want any) {
		if fmt.Sprintf("%v", got) == fmt.Sprintf("%v", want) {
			passed++
			fmt.Printf("  PASS: %s\n", testName)
		} else {
			failed++
			fmt.Printf("  FAIL: %s — got %v, want %v\n", testName, got, want)
		}
	}

	assertTrue := func(testName string, condition bool) {
		if condition {
			passed++
			fmt.Printf("  PASS: %s\n", testName)
		} else {
			failed++
			fmt.Printf("  FAIL: %s — expected true\n", testName)
		}
	}

	// ──────────────────────────────────────────────────────────────
	// SECTION 2 — Functions under test
	// ──────────────────────────────────────────────────────────────
	// WHY: These are the "products" Inspector Deshmukh will test.

	// Test the Add function
	assertEqual("Add(2, 3)", Add(2, 3), 5)
	// Output:   PASS: Add(2, 3)
	assertEqual("Add(-1, 1)", Add(-1, 1), 0)
	// Output:   PASS: Add(-1, 1)
	assertEqual("Add(0, 0)", Add(0, 0), 0)
	// Output:   PASS: Add(0, 0)

	// Test the Greet function
	assertEqual("Greet(Deshmukh)", Greet("Deshmukh"), "Hello, Deshmukh!")
	// Output:   PASS: Greet(Deshmukh)
	assertEqual("Greet(empty)", Greet(""), "Hello, !")
	// Output:   PASS: Greet(empty)

	// ──────────────────────────────────────────────────────────────
	// SECTION 3 — Table-driven tests
	// ──────────────────────────────────────────────────────────────
	// WHY: Table-driven tests are THE idiomatic Go testing pattern.
	// Each test case is a row in a table (slice of structs).
	// Adding a new case is just adding one more struct literal.

	fmt.Println("\n--- Table-driven tests ---")

	// In real Go test files, this would be:
	// func TestIsPalindrome(t *testing.T) { ... }

	palindromeTests := []struct {
		name  string
		input string
		want  bool
	}{
		{"simple palindrome", "racecar", true},
		{"single char", "a", true},
		{"empty string", "", true},
		{"not palindrome", "hello", false},
		{"even length", "abba", true},
		{"with spaces (not stripped)", "race car", false},
		{"mixed case (case sensitive)", "Racecar", false},
	}

	// WHY: Loop over the table — each row is an independent test
	for _, tc := range palindromeTests {
		got := IsPalindrome(tc.input)
		assertEqual(fmt.Sprintf("IsPalindrome(%q)", tc.input), got, tc.want)
	}
	// Output:   PASS: IsPalindrome("racecar")
	// Output:   PASS: IsPalindrome("a")
	// Output:   PASS: IsPalindrome("")
	// Output:   PASS: IsPalindrome("hello")
	// Output:   PASS: IsPalindrome("abba")
	// Output:   PASS: IsPalindrome("race car")
	// Output:   PASS: IsPalindrome("Racecar")

	// ──────────────────────────────────────────────────────────────
	// SECTION 4 — Sub-tests (simulating t.Run)
	// ──────────────────────────────────────────────────────────────
	// WHY: Sub-tests group related tests. In real Go code you use
	// t.Run("name", func(t *testing.T) { ... }). This lets you
	// run specific sub-tests with `go test -run TestFoo/subname`.

	fmt.Println("\n--- Sub-tests (simulating t.Run) ---")

	// Simulating t.Run with a helper
	run := func(group, name string, testFn func()) {
		fmt.Printf("  [%s/%s] ", group, name)
		testFn()
	}

	// Test StringUtils — group of related functions
	run("StringUtils", "Reverse", func() {
		assertEqual("Reverse(hello)", Reverse("hello"), "olleh")
	})
	run("StringUtils", "Reverse empty", func() {
		assertEqual("Reverse(empty)", Reverse(""), "")
	})
	run("StringUtils", "CountVowels", func() {
		assertEqual("CountVowels(hello)", CountVowels("hello"), 2)
	})
	run("StringUtils", "CountVowels none", func() {
		assertEqual("CountVowels(xyz)", CountVowels("xyz"), 0)
	})

	// ──────────────────────────────────────────────────────────────
	// SECTION 5 — Testing errors
	// ──────────────────────────────────────────────────────────────
	// WHY: Go functions return errors. Testing must verify both
	// the happy path AND the error path.

	fmt.Println("\n--- Testing error returns ---")

	// Happy path — no error
	result, err := Divide(10, 3)
	assertTrue("Divide(10,3) no error", err == nil)
	// Output:   PASS: Divide(10,3) no error
	assertEqual("Divide(10,3) result", fmt.Sprintf("%.4f", result), "3.3333")
	// Output:   PASS: Divide(10,3) result

	// Error path — division by zero
	_, err = Divide(10, 0)
	assertTrue("Divide(10,0) returns error", err != nil)
	// Output:   PASS: Divide(10,0) returns error
	assertEqual("Divide(10,0) error msg", err.Error(), "division by zero")
	// Output:   PASS: Divide(10,0) error msg

	// Table-driven error tests
	divTests := []struct {
		name    string
		a, b    float64
		want    float64
		wantErr bool
	}{
		{"positive", 10, 2, 5, false},
		{"negative", -6, 3, -2, false},
		{"zero dividend", 0, 5, 0, false},
		{"zero divisor", 1, 0, 0, true},
	}

	fmt.Println("\n--- Table-driven error tests ---")
	for _, tc := range divTests {
		result, err := Divide(tc.a, tc.b)
		if tc.wantErr {
			assertTrue(tc.name+" has error", err != nil)
		} else {
			assertTrue(tc.name+" no error", err == nil)
			assertEqual(tc.name+" value", result, tc.want)
		}
	}

	// ============================================================
	// EXAMPLE BLOCK 2 — Benchmarks, Fixtures, Best Practices
	// ============================================================

	fmt.Println("\n--- BLOCK 2: Benchmarks, Fixtures, Best Practices ---")

	// ──────────────────────────────────────────────────────────────
	// SECTION 6 — Benchmark simulation
	// ──────────────────────────────────────────────────────────────
	// WHY: Go benchmarks use testing.B with b.N iterations. The
	// framework auto-calibrates b.N. Here we simulate the concept.
	//
	// Real benchmark:
	// func BenchmarkReverse(b *testing.B) {
	//     for i := 0; i < b.N; i++ {
	//         Reverse("hello world")
	//     }
	// }

	fmt.Println("\n--- Benchmark simulation (stress test) ---")

	benchmark := func(name string, iterations int, fn func()) {
		start := time.Now()
		for i := 0; i < iterations; i++ {
			fn()
		}
		elapsed := time.Since(start)
		nsPerOp := float64(elapsed.Nanoseconds()) / float64(iterations)
		fmt.Printf("  Bench: %-30s %d ops\t%.0f ns/op\n", name, iterations, nsPerOp)
	}

	iterations := 100_000

	benchmark("Reverse(short)", iterations, func() {
		Reverse("hello")
	})

	benchmark("Reverse(long)", iterations, func() {
		Reverse("the quick brown fox jumps over the lazy dog")
	})

	benchmark("IsPalindrome(short)", iterations, func() {
		IsPalindrome("racecar")
	})

	benchmark("CountVowels(medium)", iterations, func() {
		CountVowels("Inspector Deshmukh tests ISI products")
	})

	// ──────────────────────────────────────────────────────────────
	// SECTION 7 — Test fixtures pattern
	// ──────────────────────────────────────────────────────────────
	// WHY: Fixtures provide consistent test data. In Go, common
	// patterns include: test helper functions, testdata/ directory,
	// setup/teardown with t.Cleanup.

	fmt.Println("\n--- Test fixtures pattern ---")

	// Fixture: a reusable set of test data
	type ProductSample struct {
		Name     string
		Category string
		Grade    int
	}

	// WHY: Create fixtures as functions so each test gets a fresh copy
	newTestProduct := func() ProductSample {
		return ProductSample{
			Name:     "Portland Cement Grade 53",
			Category: "cement",
			Grade:    53,
		}
	}

	product := newTestProduct()
	assertEqual("Fixture name", product.Name, "Portland Cement Grade 53")
	// Output:   PASS: Fixture name
	assertEqual("Fixture category", product.Category, "cement")
	// Output:   PASS: Fixture category

	// Setup and teardown pattern (simulating t.Cleanup)
	fmt.Println("\n--- Setup/Teardown pattern ---")

	setup := func(name string) func() {
		fmt.Printf("  SETUP: preparing %s\n", name)
		// Return a teardown function (like t.Cleanup)
		return func() {
			fmt.Printf("  TEARDOWN: cleaning up %s\n", name)
		}
	}

	teardown := setup("testing chamber")
	assertEqual("After setup", true, true) // simulate test work
	teardown()
	// Output:   SETUP: preparing testing chamber
	// Output:   PASS: After setup
	// Output:   TEARDOWN: cleaning up testing chamber

	// ──────────────────────────────────────────────────────────────
	// SECTION 8 — testing.T methods reference
	// ──────────────────────────────────────────────────────────────
	// WHY: Understanding what testing.T offers helps you write
	// better tests. Here's a reference of the key methods.

	fmt.Println("\n--- testing.T Methods Reference ---")
	fmt.Println("  t.Error(args...)      — log + mark FAIL (test continues)")
	fmt.Println("  t.Errorf(fmt, args)   — formatted Error")
	fmt.Println("  t.Fatal(args...)      — log + mark FAIL + STOP this test")
	fmt.Println("  t.Fatalf(fmt, args)   — formatted Fatal")
	fmt.Println("  t.Log(args...)        — log (visible with -v flag)")
	fmt.Println("  t.Logf(fmt, args)     — formatted Log")
	fmt.Println("  t.Skip(args...)       — skip this test with a message")
	fmt.Println("  t.Skipf(fmt, args)    — formatted Skip")
	fmt.Println("  t.Helper()            — mark this func as a test helper")
	fmt.Println("  t.Parallel()          — run this test in parallel")
	fmt.Println("  t.Run(name, fn)       — run a sub-test")
	fmt.Println("  t.Cleanup(fn)         — register cleanup (runs after test)")
	fmt.Println("  t.TempDir()           — get auto-cleaned temp directory")

	// ──────────────────────────────────────────────────────────────
	// SECTION 9 — Example functions (testable examples)
	// ──────────────────────────────────────────────────────────────
	// WHY: Go has a unique feature — Example functions serve as
	// both documentation AND tests. They appear in godoc AND
	// are verified by go test.
	//
	// func ExampleReverse() {
	//     fmt.Println(Reverse("hello"))
	//     // Output: olleh
	// }
	//
	// The "// Output:" comment is checked by go test!

	fmt.Println("\n--- Example function pattern ---")
	fmt.Println("  func ExampleReverse() {")
	fmt.Println("      fmt.Println(Reverse(\"hello\"))")
	fmt.Println("      // Output: olleh")
	fmt.Println("  }")
	fmt.Println("  -> go test verifies the output matches!")

	// ──────────────────────────────────────────────────────────────
	// SECTION 10 — Testing best practices
	// ──────────────────────────────────────────────────────────────

	fmt.Println("\n--- Testing Best Practices ---")
	fmt.Println("  1. Name tests: TestFunctionName or TestStruct_Method")
	fmt.Println("  2. Use table-driven tests for multiple inputs")
	fmt.Println("  3. Test BOTH happy path and error cases")
	fmt.Println("  4. Use t.Helper() in assertion helpers for better line numbers")
	fmt.Println("  5. Use t.Parallel() for independent tests")
	fmt.Println("  6. Use t.TempDir() instead of manual temp file cleanup")
	fmt.Println("  7. Put test files next to code: foo.go -> foo_test.go")
	fmt.Println("  8. Use testdata/ directory for test fixtures (ignored by go build)")
	fmt.Println("  9. Run: go test ./... -v -race -count=1")
	fmt.Println(" 10. Coverage: go test -cover -coverprofile=coverage.out")

	// ──────────────────────────────────────────────────────────────
	// Final tally
	// ──────────────────────────────────────────────────────────────

	fmt.Printf("\n=====================================\n")
	fmt.Printf("Inspector Deshmukh's ISI Quality Report\n")
	fmt.Printf("=====================================\n")
	fmt.Printf("  PASSED: %d\n", passed)
	fmt.Printf("  FAILED: %d\n", failed)
	fmt.Printf("  TOTAL:  %d\n", passed+failed)
	if failed == 0 {
		fmt.Println("  STATUS: ALL TESTS PASSED — ISI MARK APPROVED")
	} else {
		fmt.Println("  STATUS: SOME TESTS FAILED — ISI MARK DENIED")
	}
	fmt.Println("\nInspector Deshmukh's ISI lab is closed. Every product has been verified.")
	// Output: Inspector Deshmukh's ISI lab is closed. Every product has been verified.
}

// ============================================================
// Functions under test — these would normally be in a separate file
// ============================================================

// Add returns the sum of two integers.
func Add(a, b int) int {
	return a + b
}

// Greet returns a greeting for the given name.
func Greet(name string) string {
	return fmt.Sprintf("Hello, %s!", name)
}

// IsPalindrome checks if a string reads the same forwards and backwards.
func IsPalindrome(s string) bool {
	for i, j := 0, len(s)-1; i < j; i, j = i+1, j-1 {
		if s[i] != s[j] {
			return false
		}
	}
	return true
}

// Reverse returns the string reversed.
func Reverse(s string) string {
	runes := []rune(s)
	for i, j := 0, len(runes)-1; i < j; i, j = i+1, j-1 {
		runes[i], runes[j] = runes[j], runes[i]
	}
	return string(runes)
}

// CountVowels counts the number of vowels in a string.
func CountVowels(s string) int {
	count := 0
	for _, r := range strings.ToLower(s) {
		if r == 'a' || r == 'e' || r == 'i' || r == 'o' || r == 'u' {
			count++
		}
	}
	return count
}

// Divide divides a by b, returning an error for division by zero.
func Divide(a, b float64) (float64, error) {
	if b == 0 {
		return 0, fmt.Errorf("division by zero")
	}
	return a / b, nil
}

// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. Go tests live in *_test.go files next to the code.
//    Test functions start with Test and take *testing.T.
//
// 2. Table-driven tests are the Go idiom: a slice of structs
//    with name, input, and expected output. One loop runs all.
//
// 3. t.Run("name", fn) creates sub-tests that can be run
//    individually with `go test -run TestFoo/subname`.
//
// 4. Use t.Error for non-fatal failures (test continues),
//    t.Fatal for fatal failures (test stops immediately).
//
// 5. t.Helper() marks functions as test helpers — error
//    messages will point to the caller, not the helper.
//
// 6. Benchmarks use testing.B and b.N. The framework
//    auto-calibrates iterations. Run with `go test -bench=.`
//
// 7. Example functions (ExampleFoo) serve as documentation
//    AND tests — the "// Output:" comment is verified.
//
// 8. Use t.Cleanup for teardown and t.TempDir for temp files.
//    Both auto-clean after the test.
//
// 9. Run tests with: go test ./... -v -race -count=1
//    Get coverage with: go test -cover
//
// 10. Inspector Deshmukh's ISI lab rule: "Every function
//     deserves a table of tests, every error path deserves a
//     check, and no product ships without the ISI mark."
// ============================================================
