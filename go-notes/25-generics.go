// ============================================================
//  FILE 25 : Generics
// ============================================================
//  Topic  : type parameters, constraints, any, comparable,
//           custom constraints, type sets, generic functions,
//           generic types, when NOT to use generics
//
//  WHY THIS MATTERS:
//  Before Go 1.18, writing reusable algorithms meant either
//  duplicating code for every type or sacrificing type safety
//  with interface{}/any. Generics let you write functions and
//  types that work with ANY type the caller chooses — while the
//  compiler still checks everything at compile time. No casts,
//  no runtime panics, no code duplication.
// ============================================================

// ============================================================
// STORY: Jugaad Universal Machine
// Deep in his Chandni Chowk workshop, Munna bhai builds jugaad
// machines that adapt to any material — wood, metal, glass. He
// doesn't build a separate cutter for each material. Instead he
// designs a universal jugaad machine whose blade adjusts to
// whatever you feed it. That's generics: one design, many
// materials, zero surprises. Constraint = "must be comparable"
// = must have an Aadhaar number to be identified.
// ============================================================

package main

import (
	"cmp"
	"fmt"
	"strings"
)

// ============================================================
// EXAMPLE BLOCK 1 — Basic Generic Functions
// ============================================================

// ──────────────────────────────────────────────────────────────
// SECTION 1 — A Simple Generic Function: Min
// ──────────────────────────────────────────────────────────────
// WHY: Without generics you'd need MinInt, MinFloat64, MinString…
// With generics you write one function and the compiler
// generates the specialised version for each type used.

// Min returns the smaller of two ordered values.
// cmp.Ordered constrains T to types that support < > <= >=.
func Min[T cmp.Ordered](a, b T) T {
	if a < b {
		return a
	}
	return b
}

// ──────────────────────────────────────────────────────────────
// SECTION 2 — Contains: comparable constraint
// ──────────────────────────────────────────────────────────────
// WHY: comparable is a built-in constraint that allows == and !=.
// Slices of any comparable type can now share one search function.
// Think of comparable as "must have Aadhaar" — only items with
// a unique identity can be compared.

// Contains reports whether needle is in haystack.
func Contains[T comparable](haystack []T, needle T) bool {
	for _, v := range haystack {
		if v == needle {
			return true
		}
	}
	return false
}

// ──────────────────────────────────────────────────────────────
// SECTION 3 — Map and Filter: higher-order generic functions
// ──────────────────────────────────────────────────────────────
// WHY: Map and Filter are bread-and-butter functional patterns.
// Generics let you write them once for all element types.

// Map applies fn to every element and returns a new slice.
func Map[T any, U any](s []T, fn func(T) U) []U {
	result := make([]U, len(s))
	for i, v := range s {
		result[i] = fn(v)
	}
	return result
}

// Filter returns elements for which predicate returns true.
func Filter[T any](s []T, predicate func(T) bool) []T {
	var result []T
	for _, v := range s {
		if predicate(v) {
			result = append(result, v)
		}
	}
	return result
}

// ============================================================
// EXAMPLE BLOCK 2 — Custom Constraints & Type Sets
// ============================================================

// ──────────────────────────────────────────────────────────────
// SECTION 4 — Custom constraint with type sets
// ──────────────────────────────────────────────────────────────
// WHY: Sometimes cmp.Ordered or comparable aren't enough.
// You can define your own constraint interfaces with type sets.
// The ~ (tilde) means "underlying type", so ~int matches both
// int and any named type whose underlying type is int.

// Number constrains T to integer and floating-point types.
type Number interface {
	~int | ~int8 | ~int16 | ~int32 | ~int64 |
		~float32 | ~float64
}

// Sum adds all numbers in a slice.
func Sum[T Number](nums []T) T {
	var total T
	for _, n := range nums {
		total += n
	}
	return total
}

// Average returns the arithmetic mean.
func Average[T Number](nums []T) float64 {
	if len(nums) == 0 {
		return 0
	}
	return float64(Sum(nums)) / float64(len(nums))
}

// ──────────────────────────────────────────────────────────────
// SECTION 5 — The ~ (tilde) in action: named types match too
// ──────────────────────────────────────────────────────────────
// WHY: Without ~, a type like `type Rupees float64` would NOT
// satisfy `float64`. The tilde says "any type whose underlying
// type is float64", which includes Rupees.

// Rupees is a named type with underlying type float64.
type Rupees float64

// ──────────────────────────────────────────────────────────────
// SECTION 6 — Reduce (fold): bringing it all together
// ──────────────────────────────────────────────────────────────
// WHY: Reduce collapses a slice into a single value. Combined
// with custom constraints it handles sums, products, joins, etc.

// Reduce folds a slice into a single value using fn.
func Reduce[T any, U any](s []T, initial U, fn func(U, T) U) U {
	acc := initial
	for _, v := range s {
		acc = fn(acc, v)
	}
	return acc
}

// ============================================================
// EXAMPLE BLOCK 3 — Generic Types
// ============================================================

// ──────────────────────────────────────────────────────────────
// SECTION 7 — Stack[T]: a generic data structure
// ──────────────────────────────────────────────────────────────
// WHY: Before generics you'd use []interface{} and lose all
// type safety. Stack[T] is type-safe at compile time.

// Stack is a LIFO stack for any type T.
type Stack[T any] struct {
	items []T
}

// Push adds an element to the top.
func (s *Stack[T]) Push(v T) {
	s.items = append(s.items, v)
}

// Pop removes and returns the top element and a boolean ok.
func (s *Stack[T]) Pop() (T, bool) {
	if len(s.items) == 0 {
		var zero T
		return zero, false
	}
	top := s.items[len(s.items)-1]
	s.items = s.items[:len(s.items)-1]
	return top, true
}

// Peek returns the top element without removing it.
func (s *Stack[T]) Peek() (T, bool) {
	if len(s.items) == 0 {
		var zero T
		return zero, false
	}
	return s.items[len(s.items)-1], true
}

// Size returns the number of elements.
func (s *Stack[T]) Size() int {
	return len(s.items)
}

// ──────────────────────────────────────────────────────────────
// SECTION 8 — Pair[T, U]: a generic two-value container
// ──────────────────────────────────────────────────────────────
// WHY: Pair is handy for returning two related values without
// defining a new struct every time. Common in maps, caches, etc.

// Pair holds two values of potentially different types.
type Pair[T, U any] struct {
	First  T
	Second U
}

// NewPair creates a Pair (factory function).
func NewPair[T, U any](first T, second U) Pair[T, U] {
	return Pair[T, U]{First: first, Second: second}
}

// ──────────────────────────────────────────────────────────────
// SECTION 9 — Result[T]: success-or-error container
// ──────────────────────────────────────────────────────────────
// WHY: Inspired by Rust's Result type. Wraps a value + error
// into one generic struct, useful for pipeline-style code.

// Result holds either a value or an error, never both.
type Result[T any] struct {
	Value T
	Err   error
}

// NewResult creates a success Result.
func NewResult[T any](v T) Result[T] {
	return Result[T]{Value: v, Err: nil}
}

// NewError creates an error Result.
func NewError[T any](err error) Result[T] {
	return Result[T]{Err: err}
}

// IsOk reports whether the Result is successful.
func (r Result[T]) IsOk() bool {
	return r.Err == nil
}

// Unwrap returns the value or panics on error (use sparingly!).
func (r Result[T]) Unwrap() T {
	if r.Err != nil {
		panic(r.Err)
	}
	return r.Value
}

// ──────────────────────────────────────────────────────────────
// SECTION 10 — Keys and Values: generic map helpers
// ──────────────────────────────────────────────────────────────
// WHY: Extracting keys or values from a map is repetitive.
// One generic function handles maps of any key/value types.

// Keys returns all keys from a map (order is random).
func Keys[K comparable, V any](m map[K]V) []K {
	keys := make([]K, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	return keys
}

// Values returns all values from a map (order is random).
func Values[K comparable, V any](m map[K]V) []V {
	vals := make([]V, 0, len(m))
	for _, v := range m {
		vals = append(vals, v)
	}
	return vals
}

func main() {
	fmt.Println("===== FILE 25: Generics =====")
	fmt.Println()

	// ============================================================
	// BLOCK 1 — Basic Generic Functions
	// ============================================================

	fmt.Println("--- Block 1: Basic Generic Functions ---")
	fmt.Println()

	// ── Min with type inference ──
	fmt.Println("Min(3, 7)       =", Min(3, 7))
	// Output: Min(3, 7)       = 3

	fmt.Println("Min(3.14, 2.71) =", Min(3.14, 2.71))
	// Output: Min(3.14, 2.71) = 2.71

	fmt.Println("Min(\"aam\", \"kela\") =", Min("aam", "kela"))
	// Output: Min("aam", "kela") = aam

	// WHY: The compiler infers T from the arguments — no angle
	// brackets needed at the call site in most cases.

	fmt.Println()

	// ── Contains ──
	prices := []int{10, 20, 30, 40, 50}
	fmt.Println("Contains(prices, 30) =", Contains(prices, 30))
	// Output: Contains(prices, 30) = true
	fmt.Println("Contains(prices, 99) =", Contains(prices, 99))
	// Output: Contains(prices, 99) = false

	items := []string{"atta", "dal", "chawal"}
	fmt.Println("Contains(items, \"atta\") =", Contains(items, "atta"))
	// Output: Contains(items, "atta") = true

	fmt.Println()

	// ── Map ──
	doubled := Map(prices, func(n int) int { return n * 2 })
	fmt.Println("Map(prices, *2) =", doubled)
	// Output: Map(prices, *2) = [20 40 60 80 100]

	lengths := Map(items, func(s string) int { return len(s) })
	fmt.Println("Map(items, len) =", lengths)
	// Output: Map(items, len) = [4 3 6]

	// ── Filter ──
	evens := Filter(prices, func(n int) bool { return n%2 == 0 })
	fmt.Println("Filter(prices, even) =", evens)
	// Output: Filter(prices, even) = [10 20 30 40 50]

	longItems := Filter(items, func(s string) bool { return len(s) > 3 })
	fmt.Println("Filter(items, len>3) =", longItems)
	// Output: Filter(items, len>3) = [atta chawal]

	fmt.Println()

	// ============================================================
	// BLOCK 2 — Custom Constraints & Type Sets
	// ============================================================

	fmt.Println("--- Block 2: Custom Constraints & Type Sets ---")
	fmt.Println()

	// ── Sum and Average with Number constraint ──
	ints := []int{1, 2, 3, 4, 5}
	fmt.Println("Sum(ints) =", Sum(ints))
	// Output: Sum(ints) = 15
	fmt.Printf("Average(ints) = %.2f\n", Average(ints))
	// Output: Average(ints) = 3.00

	floats := []float64{1.5, 2.5, 3.5}
	fmt.Println("Sum(floats) =", Sum(floats))
	// Output: Sum(floats) = 7.5
	fmt.Printf("Average(floats) = %.2f\n", Average(floats))
	// Output: Average(floats) = 2.50

	// ── Tilde in action: named type Rupees ──
	bills := []Rupees{499.0, 150.0, 75.50, 299.0}
	fmt.Printf("Sum(bills) = Rs %.1f\n", Sum(bills))
	// Output: Sum(bills) = Rs 1023.5
	// WHY: Rupees works because Number uses ~float64, which
	// matches any type whose underlying type is float64.

	fmt.Println()

	// ── Reduce ──
	product := Reduce(ints, 1, func(acc, n int) int { return acc * n })
	fmt.Println("Reduce(ints, *, 1) =", product)
	// Output: Reduce(ints, *, 1) = 120

	joined := Reduce(items, "", func(acc, s string) string {
		if acc == "" {
			return s
		}
		return acc + ", " + s
	})
	fmt.Println("Reduce(items, join) =", joined)
	// Output: Reduce(items, join) = atta, dal, chawal

	// Reduce to count characters
	totalChars := Reduce(items, 0, func(acc int, s string) int {
		return acc + len(s)
	})
	fmt.Println("Reduce(items, charCount) =", totalChars)
	// Output: Reduce(items, charCount) = 13

	fmt.Println()

	// ============================================================
	// BLOCK 3 — Generic Types
	// ============================================================

	fmt.Println("--- Block 3: Generic Types ---")
	fmt.Println()

	// ── Stack[int] ──
	var intStack Stack[int]
	intStack.Push(10)
	intStack.Push(20)
	intStack.Push(30)
	fmt.Println("Stack size:", intStack.Size())
	// Output: Stack size: 3

	top, ok := intStack.Peek()
	fmt.Printf("Peek: %d (ok=%v)\n", top, ok)
	// Output: Peek: 30 (ok=true)

	val, _ := intStack.Pop()
	fmt.Println("Pop:", val)
	// Output: Pop: 30

	val, _ = intStack.Pop()
	fmt.Println("Pop:", val)
	// Output: Pop: 20

	fmt.Println("Stack size after pops:", intStack.Size())
	// Output: Stack size after pops: 1

	// ── Stack[string] — same code, different type ──
	var strStack Stack[string]
	strStack.Push("namaste")
	strStack.Push("dhanyavaad")
	word, _ := strStack.Pop()
	fmt.Println("String stack pop:", word)
	// Output: String stack pop: dhanyavaad

	fmt.Println()

	// ── Pair ──
	p1 := NewPair("aadhaar", 123456789012)
	fmt.Printf("Pair: {%s, %d}\n", p1.First, p1.Second)
	// Output: Pair: {aadhaar, 123456789012}

	p2 := NewPair(3.14, true)
	fmt.Printf("Pair: {%.2f, %v}\n", p2.First, p2.Second)
	// Output: Pair: {3.14, true}

	fmt.Println()

	// ── Result[T] ──
	r1 := NewResult(42)
	fmt.Printf("Result: value=%d, ok=%v\n", r1.Value, r1.IsOk())
	// Output: Result: value=42, ok=true

	r2 := NewError[string](fmt.Errorf("Aadhaar not found"))
	fmt.Printf("Result: err=%v, ok=%v\n", r2.Err, r2.IsOk())
	// Output: Result: err=Aadhaar not found, ok=false

	fmt.Println()

	// ── Keys and Values ──
	scores := map[string]int{"Munna": 95, "Raju": 87, "Baburao": 92}
	k := Keys(scores)
	v := Values(scores)
	// Sort for deterministic output
	fmt.Println("Keys count:", len(k))
	// Output: Keys count: 3
	fmt.Println("Values count:", len(v))
	// Output: Values count: 3

	fmt.Println()

	// ── Practical Pattern: generic Transform pipeline ──
	// Chain Map, Filter, Reduce to process data.
	rawNames := []string{"  Munna ", "RAJU", " baburao ", "  CIRCUIT"}

	cleaned := Map(rawNames, func(s string) string {
		return strings.TrimSpace(strings.ToLower(s))
	})
	fmt.Println("Cleaned:", cleaned)
	// Output: Cleaned: [munna raju baburao circuit]

	short := Filter(cleaned, func(s string) bool {
		return len(s) <= 5
	})
	fmt.Println("Short names:", short)
	// Output: Short names: [munna raju]

	csv := Reduce(cleaned, "", func(acc, s string) string {
		if acc == "" {
			return s
		}
		return acc + "," + s
	})
	fmt.Println("CSV:", csv)
	// Output: CSV: munna,raju,baburao,circuit

	fmt.Println()

	// ── When NOT to use generics ──
	// WHY: Generics add complexity. Avoid them when:
	// 1. A concrete type works fine (don't genericize for one type).
	// 2. An interface already solves the problem (io.Reader, etc.).
	// 3. The function body is trivial — generics save duplication,
	//    but if there's nothing to duplicate, don't bother.
	// Rule of thumb: "Don't generalize until you've written the
	// same function for at least three different types."
	fmt.Println("--- When NOT to use generics ---")
	fmt.Println("1. One concrete type is enough? Skip generics.")
	fmt.Println("2. An interface (io.Reader) already works? Use it.")
	fmt.Println("3. Function body is trivial? Keep it simple.")
	fmt.Println("Rule: Write it three times, THEN generalize.")
}

// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. Type parameters go in square brackets: func F[T any](x T) T.
//    The constraint (any, comparable, cmp.Ordered, custom) limits
//    what operations you can perform on T inside the function.
//
// 2. Go infers type arguments at the call site in most cases:
//    Min(3, 7) works without writing Min[int](3, 7).
//
// 3. cmp.Ordered covers all types that support < > <= >=.
//    comparable covers types that support == and !=.
//
// 4. Custom constraints use interface syntax with type sets:
//    type Number interface { ~int | ~float64 }
//    The ~ (tilde) means "underlying type", so named types like
//    Rupees (underlying float64) also satisfy the constraint.
//
// 5. Generic types (Stack[T], Pair[T,U], Result[T]) are type-safe
//    at compile time — no runtime type assertions needed.
//
// 6. Map, Filter, Reduce are the classic generic function trio.
//    Combine them for powerful data pipelines.
//
// 7. Don't over-generalize. Use generics when you find yourself
//    writing the same function for multiple types. If a concrete
//    type or an existing interface suffices, prefer simplicity.
//
// 8. Munna bhai's jugaad rule: "Build one universal machine
//    instead of twenty specialized ones — but only when the
//    blueprint truly works for all materials."
// ============================================================
