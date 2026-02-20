// ============================================================
//  FILE 4 : Functions
// ============================================================
//  Topic  : Function declarations, multiple returns, named
//           returns, variadic functions, first-class functions,
//           function types, anonymous functions, closures,
//           defer basics, higher-order functions
//
//  WHY THIS MATTERS:
//  Functions are Go's primary building block. Go functions can
//  return multiple values (the error pattern depends on this),
//  be assigned to variables, passed as arguments, and created
//  inline as closures. Unlike many languages, Go has no
//  classes — functions and methods on types are how you
//  organize all behavior.
// ============================================================

// ============================================================
// STORY: The Mithai Shop
// Halwai Govind ji prepares sweets in his legendary mithai shop.
// Each function is a recipe: it takes raw ingredients (params),
// processes them, and produces a sweet (return values). Some
// recipes produce two outputs (sweet + error). Some recipes
// are invented on the fly (anonymous functions). Closures are
// secret family recipes that remember spice ratios from when
// they were first created.
// ============================================================

package main

import (
	"fmt"
	"math"
	"strings"
)

func main() {

	// ============================================================
	// EXAMPLE BLOCK 1 — Basic Functions, Multiple Returns & Errors
	// ============================================================

	// ──────────────────────────────────────────────────────────────
	// SECTION 1 — Basic Function Calls
	// ──────────────────────────────────────────────────────────────
	// WHY: Functions encapsulate reusable logic. In Go, functions
	// are declared with `func`, and the return type comes AFTER
	// the parameter list (not before, like C/Java).

	greet("Govind ji")
	// Output: Hello, Govind ji! Welcome to the Mithai Shop.

	result := add(10, 25)
	fmt.Printf("add(10, 25) = %d\n", result)
	// Output: add(10, 25) = 35

	area := rectangleArea(5.0, 3.0)
	fmt.Printf("rectangleArea(5, 3) = %.1f\n", area)
	// Output: rectangleArea(5, 3) = 15.0

	// ──────────────────────────────────────────────────────────────
	// SECTION 2 — Multiple Return Values
	// ──────────────────────────────────────────────────────────────
	// WHY: Go functions can return multiple values. This is THE
	// foundation of Go's error handling pattern: (value, error).
	// No exceptions, no try/catch — just explicit return values.

	fmt.Println("\n--- Multiple Return Values ---")

	quotient, remainder := divide(17, 5)
	fmt.Printf("17 / 5 = %d remainder %d\n", quotient, remainder)
	// Output: 17 / 5 = 3 remainder 2

	min, max := minMax([]int{3, 1, 4, 1, 5, 9, 2, 6})
	fmt.Printf("min=%d, max=%d\n", min, max)
	// Output: min=1, max=9

	// ──────────────────────────────────────────────────────────────
	// SECTION 3 — The Error Pattern (value, error)
	// ──────────────────────────────────────────────────────────────
	// WHY: Go does not have exceptions. Functions that can fail
	// return (value, error). The caller checks if error is nil.
	// This is the most important Go idiom to master.

	fmt.Println("\n--- Error Pattern ---")

	val, err := safeDivide(10, 3)
	if err != nil {
		fmt.Printf("Error: %v\n", err)
	} else {
		fmt.Printf("10 / 3 = %.4f\n", val)
	}
	// Output: 10 / 3 = 3.3333

	val, err = safeDivide(10, 0)
	if err != nil {
		fmt.Printf("Error: %v\n", err)
	} else {
		fmt.Printf("Result: %.4f\n", val)
	}
	// Output: Error: division by zero

	// ──────────────────────────────────────────────────────────────
	// SECTION 4 — Named Return Values (Naked Return)
	// ──────────────────────────────────────────────────────────────
	// WHY: Named returns pre-declare return variables. A bare
	// `return` statement returns their current values. Use them
	// sparingly — they can reduce clarity in long functions.

	fmt.Println("\n--- Named Returns ---")

	w, h, a := dimensions(10, 5)
	fmt.Printf("width=%d, height=%d, area=%d\n", w, h, a)
	// Output: width=10, height=5, area=50

	// ============================================================
	// EXAMPLE BLOCK 2 — Variadic Functions & First-Class Functions
	// ============================================================

	// ──────────────────────────────────────────────────────────────
	// SECTION 5 — Variadic Functions (...T)
	// ──────────────────────────────────────────────────────────────
	// WHY: Variadic functions accept a variable number of arguments
	// of the same type. fmt.Println itself is variadic! The ...T
	// parameter is received as a []T slice inside the function.

	fmt.Println("\n--- Variadic Functions ---")

	fmt.Printf("sum() = %d\n", sum())
	// Output: sum() = 0
	fmt.Printf("sum(1) = %d\n", sum(1))
	// Output: sum(1) = 1
	fmt.Printf("sum(1,2,3) = %d\n", sum(1, 2, 3))
	// Output: sum(1,2,3) = 6
	fmt.Printf("sum(1,2,3,4,5) = %d\n", sum(1, 2, 3, 4, 5))
	// Output: sum(1,2,3,4,5) = 15

	// Passing a slice to a variadic function with ...
	numbers := []int{10, 20, 30, 40}
	fmt.Printf("sum(slice...) = %d\n", sum(numbers...))
	// Output: sum(slice...) = 100

	// Variadic with a fixed parameter first
	fmt.Println(joinWith(", ", "rasgulla", "gulab jamun", "jalebi"))
	// Output: rasgulla, gulab jamun, jalebi
	fmt.Println(joinWith(" -> ", "sugar syrup", "frying", "serving"))
	// Output: sugar syrup -> frying -> serving

	// ──────────────────────────────────────────────────────────────
	// SECTION 6 — Functions as Values (First-Class Functions)
	// ──────────────────────────────────────────────────────────────
	// WHY: In Go, functions are first-class citizens. You can
	// assign them to variables, pass them as arguments, and return
	// them from other functions.

	fmt.Println("\n--- Functions as Values ---")

	// Assign a function to a variable
	operation := add
	fmt.Printf("operation(3, 4) = %d\n", operation(3, 4))
	// Output: operation(3, 4) = 7

	// Reassign to a different function
	operation = multiply
	fmt.Printf("operation(3, 4) = %d\n", operation(3, 4))
	// Output: operation(3, 4) = 12

	// ──────────────────────────────────────────────────────────────
	// SECTION 7 — Function Types
	// ──────────────────────────────────────────────────────────────
	// WHY: You can define named function types. This makes function
	// signatures as parameters more readable and reusable.

	fmt.Println("\n--- Function Types ---")

	// type mathFunc is defined below main()
	var op mathFunc = add
	fmt.Printf("mathFunc add: %d\n", op(10, 20))
	// Output: mathFunc add: 30

	op = multiply
	fmt.Printf("mathFunc multiply: %d\n", op(10, 20))
	// Output: mathFunc multiply: 200

	// ──────────────────────────────────────────────────────────────
	// SECTION 8 — Higher-Order Functions
	// ──────────────────────────────────────────────────────────────
	// WHY: Functions that take or return other functions are called
	// higher-order functions. They enable powerful patterns like
	// map, filter, and reduce.

	fmt.Println("\n--- Higher-Order Functions ---")

	// apply() takes a function and applies it to two values
	fmt.Printf("apply(add, 5, 3) = %d\n", apply(add, 5, 3))
	// Output: apply(add, 5, 3) = 8
	fmt.Printf("apply(multiply, 5, 3) = %d\n", apply(multiply, 5, 3))
	// Output: apply(multiply, 5, 3) = 15

	// transform() applies a function to every element
	nums := []int{1, 2, 3, 4, 5}
	doubled := transform(nums, func(n int) int { return n * 2 })
	squared := transform(nums, func(n int) int { return n * n })
	fmt.Printf("Original: %v\n", nums)
	// Output: Original: [1 2 3 4 5]
	fmt.Printf("Doubled:  %v\n", doubled)
	// Output: Doubled:  [2 4 6 8 10]
	fmt.Printf("Squared:  %v\n", squared)
	// Output: Squared:  [1 4 9 16 25]

	// ============================================================
	// EXAMPLE BLOCK 3 — Closures, Defer & Advanced Patterns
	// ============================================================

	// ──────────────────────────────────────────────────────────────
	// SECTION 9 — Anonymous Functions
	// ──────────────────────────────────────────────────────────────
	// WHY: Anonymous functions (function literals) are functions
	// without a name. They're defined inline, often used as
	// callbacks or immediately invoked.

	fmt.Println("\n--- Anonymous Functions ---")

	// Assigned to a variable
	double := func(n int) int {
		return n * 2
	}
	fmt.Printf("double(21) = %d\n", double(21))
	// Output: double(21) = 42

	// Immediately Invoked Function Expression (IIFE)
	result2 := func(a, b int) int {
		return a*a + b*b
	}(3, 4)
	fmt.Printf("IIFE: 3² + 4² = %d\n", result2)
	// Output: IIFE: 3² + 4² = 25

	// ──────────────────────────────────────────────────────────────
	// SECTION 10 — Closures
	// ──────────────────────────────────────────────────────────────
	// WHY: A closure is a function that captures variables from its
	// surrounding scope. The captured variables survive as long as
	// the closure exists. This enables stateful functions without
	// global variables or structs.

	fmt.Println("\n--- Closures ---")

	// Counter — the closure captures and mutates `count`
	counter := makeCounter()
	fmt.Printf("counter() = %d\n", counter())
	// Output: counter() = 1
	fmt.Printf("counter() = %d\n", counter())
	// Output: counter() = 2
	fmt.Printf("counter() = %d\n", counter())
	// Output: counter() = 3

	// Each closure gets its own captured variables
	counterA := makeCounter()
	counterB := makeCounter()
	fmt.Printf("A=%d, A=%d, B=%d, A=%d, B=%d\n",
		counterA(), counterA(), counterB(), counterA(), counterB())
	// Output: A=1, A=2, B=1, A=3, B=2
	// WHY: counterA and counterB have independent count variables!

	// Accumulator — closure captures a running total
	acc := makeAccumulator(100)
	fmt.Printf("acc(10) = %d\n", acc(10))
	// Output: acc(10) = 110
	fmt.Printf("acc(25) = %d\n", acc(25))
	// Output: acc(25) = 135
	fmt.Printf("acc(-5) = %d\n", acc(-5))
	// Output: acc(-5) = 130

	// ──────────────────────────────────────────────────────────────
	// SECTION 11 — Closure Gotcha: Loop Variable Capture
	// ──────────────────────────────────────────────────────────────
	// WHY: In Go 1.22+, loop variables are per-iteration, fixing
	// the classic closure-over-loop-variable bug. But understanding
	// this history matters for reading older Go code.

	fmt.Println("\n--- Closure Over Loop Variable ---")

	funcs := make([]func(), 3)
	for i := 0; i < 3; i++ {
		funcs[i] = func() {
			fmt.Printf("  i = %d\n", i)
		}
	}
	for _, f := range funcs {
		f()
	}
	// Output (Go 1.22+, per-iteration loop variable):
	//   i = 0
	//   i = 1
	//   i = 2

	// ──────────────────────────────────────────────────────────────
	// SECTION 12 — defer Basics
	// ──────────────────────────────────────────────────────────────
	// WHY: defer schedules a function call to run when the
	// surrounding function returns. It's Go's cleanup mechanism
	// (like finally in other languages). Deferred calls execute
	// in LIFO (last in, first out) order.

	fmt.Println("\n--- defer Basics ---")
	demoDefer()
	// Output:
	//   Opening resource
	//   Working with resource
	//   Third defer
	//   Second defer
	//   First defer (cleanup)

	// ──────────────────────────────────────────────────────────────
	// SECTION 13 — defer with Arguments (evaluated immediately)
	// ──────────────────────────────────────────────────────────────
	// WHY: defer evaluates its arguments at the time of the defer
	// statement, NOT when the deferred function runs. This is a
	// common source of confusion.

	fmt.Println("\n--- defer Argument Evaluation ---")
	demoDeferArgs()
	// Output:
	//   x is now: 20
	//   deferred x = 10 (captured at defer time, not at execution time)

	// ──────────────────────────────────────────────────────────────
	// SECTION 14 — Method Values and Method Expressions (Preview)
	// ──────────────────────────────────────────────────────────────
	// WHY: Methods can be used as function values too. This is a
	// preview — full coverage comes with structs and methods.

	fmt.Println("\n--- Method Value Preview ---")

	r := sweetBox{length: 10, breadth: 5}

	// Method value — bound to the specific receiver
	areaFn := r.area
	fmt.Printf("Method value: r.area() = %d\n", areaFn())
	// Output: Method value: r.area() = 50

	// Method expression — unbound, takes receiver as first arg
	areaExpr := sweetBox.area
	fmt.Printf("Method expression: sweetBox.area(r) = %d\n", areaExpr(r))
	// Output: Method expression: sweetBox.area(r) = 50

	// ──────────────────────────────────────────────────────────────
	// SECTION 15 — Practical Patterns
	// ──────────────────────────────────────────────────────────────

	fmt.Println("\n--- Practical: Function Returning a Function ---")

	// Multiplier factory
	triple := multiplier(3)
	quadruple := multiplier(4)
	fmt.Printf("triple(10) = %d\n", triple(10))
	// Output: triple(10) = 30
	fmt.Printf("quadruple(10) = %d\n", quadruple(10))
	// Output: quadruple(10) = 40

	// Practical: applying math operations
	fmt.Println("\n--- Practical: Math Pipeline ---")
	value := 16.0
	operations2 := []struct {
		name string
		fn   func(float64) float64
	}{
		{"sqrt", math.Sqrt},
		{"double", func(x float64) float64 { return x * 2 }},
		{"negate", func(x float64) float64 { return -x }},
	}

	for _, op := range operations2 {
		value = op.fn(value)
		fmt.Printf("  After %s: %.2f\n", op.name, value)
	}
	// Output:
	//   After sqrt: 4.00
	//   After double: 8.00
	//   After negate: -8.00
}

// ============================================================
// Function Declarations (outside main)
// ============================================================

// --- Basic function ---
func greet(name string) {
	fmt.Printf("Hello, %s! Welcome to the Mithai Shop.\n", name)
}

// --- Function with return value ---
func add(a, b int) int {
	return a + b
}

func multiply(a, b int) int {
	return a * b
}

func rectangleArea(width, height float64) float64 {
	return width * height
}

// --- Multiple return values ---
func divide(a, b int) (int, int) {
	return a / b, a % b
}

func minMax(nums []int) (int, int) {
	mn, mx := nums[0], nums[0]
	for _, n := range nums[1:] {
		if n < mn {
			mn = n
		}
		if n > mx {
			mx = n
		}
	}
	return mn, mx
}

// --- Error pattern ---
func safeDivide(a, b float64) (float64, error) {
	if b == 0 {
		return 0, fmt.Errorf("division by zero")
	}
	return a / b, nil
}

// --- Named return values ---
func dimensions(w, h int) (width, height, area int) {
	width = w
	height = h
	area = w * h
	return // naked return — returns width, height, area
}

// --- Variadic function ---
func sum(nums ...int) int {
	total := 0
	for _, n := range nums {
		total += n
	}
	return total
}

func joinWith(sep string, items ...string) string {
	return strings.Join(items, sep)
}

// --- Function type ---
type mathFunc func(int, int) int

// --- Higher-order functions ---
func apply(fn func(int, int) int, a, b int) int {
	return fn(a, b)
}

func transform(nums []int, fn func(int) int) []int {
	result := make([]int, len(nums))
	for i, n := range nums {
		result[i] = fn(n)
	}
	return result
}

// --- Closure factories ---
func makeCounter() func() int {
	count := 0
	return func() int {
		count++
		return count
	}
}

func makeAccumulator(initial int) func(int) int {
	total := initial
	return func(n int) int {
		total += n
		return total
	}
}

func multiplier(factor int) func(int) int {
	return func(n int) int {
		return n * factor
	}
}

// --- defer demos ---
func demoDefer() {
	defer fmt.Println("  First defer (cleanup)")
	defer fmt.Println("  Second defer")
	defer fmt.Println("  Third defer")
	fmt.Println("  Opening resource")
	fmt.Println("  Working with resource")
	// WHY: Deferred calls execute in LIFO order when demoDefer returns
}

func demoDeferArgs() {
	x := 10
	defer fmt.Printf("  deferred x = %d (captured at defer time, not at execution time)\n", x)
	x = 20
	fmt.Printf("  x is now: %d\n", x)
	// WHY: The defer captured x=10 at the time of the defer statement
}

// --- Method value/expression preview ---
type sweetBox struct {
	length, breadth int
}

func (s sweetBox) area() int {
	return s.length * s.breadth
}

// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. Go functions return types come AFTER parameters:
//    func add(a, b int) int { return a + b }
//
// 2. Multiple return values are idiomatic. The (value, error)
//    pattern is Go's primary error handling mechanism.
//
// 3. Named returns pre-declare variables and enable naked
//    return. Use sparingly in short functions only.
//
// 4. Variadic functions use ...T syntax. Pass a slice with
//    slice... to expand it into individual arguments.
//
// 5. Functions are first-class: assign to variables, pass as
//    arguments, return from functions. Define function types
//    for readability.
//
// 6. Closures capture variables from their enclosing scope.
//    Each closure gets its own copy of captured variables.
//
// 7. defer runs cleanup when the function returns, in LIFO
//    order. Arguments are evaluated at defer time, not at
//    execution time.
//
// 8. Govind ji's mithai shop rule: "Every recipe (function) has
//    clear ingredients and output. If it can fail, it returns
//    the error as a second output — never hide spoiled sweets."
// ============================================================
