// ============================================================
//  FILE 5 : Arrays & Slices
// ============================================================
//  Topic  : Arrays (fixed size, value semantics), slices
//           (dynamic, reference semantics), make, append, copy,
//           slice expressions [low:high:max], capacity growth,
//           nil vs empty slice, multi-dimensional slices,
//           slices package (Go 1.21+), common patterns
//
//  WHY THIS MATTERS:
//  Slices are Go's workhorse data structure — you'll use them
//  far more than arrays. Understanding the difference (value vs
//  reference semantics), the backing array model, and capacity
//  growth prevents subtle bugs where mutations unexpectedly
//  affect other slices sharing the same backing array.
// ============================================================

// ============================================================
// STORY: The FCI Godown
// Godown Manager Pandey organizes grain inventory in sacks and
// bins at the Food Corporation of India's Hapur warehouse.
// Arrays are fixed shelves bolted to the wall — you cannot add
// more slots. Slices are flexible grain sacks on wheels — they
// grow as needed, but they all sit on the same godown floor
// (backing array). Moving one sack might shift others if they
// share the same floor space.
// ============================================================

package main

import (
	"fmt"
	"slices"
)

func main() {

	// ============================================================
	// EXAMPLE BLOCK 1 — Arrays & Slice Fundamentals
	// ============================================================

	// ──────────────────────────────────────────────────────────────
	// SECTION 1 — Arrays: Fixed Size, Value Semantics
	// ──────────────────────────────────────────────────────────────
	// WHY: Arrays in Go are fixed-length, and assigning one array
	// to another COPIES all elements. This is different from most
	// languages where arrays are reference types.

	fmt.Println("--- Arrays ---")

	// Declaration — size is part of the type!
	var rack [5]int // five ints, all zero-valued
	fmt.Printf("Empty rack: %v\n", rack)
	// Output: Empty rack: [0 0 0 0 0]

	// Array literal
	grains := [4]string{"wheat", "rice", "bajra", "jowar"}
	fmt.Printf("Grains: %v\n", grains)
	// Output: Grains: [wheat rice bajra jowar]

	// Ellipsis — compiler counts the elements
	seasons := [...]string{"kharif", "rabi", "zaid"}
	fmt.Printf("Seasons: %v (len=%d)\n", seasons, len(seasons))
	// Output: Seasons: [kharif rabi zaid] (len=3)

	// Arrays are values — assignment copies!
	original := [3]int{1, 2, 3}
	copied := original
	copied[0] = 999
	fmt.Printf("Original: %v (unchanged)\n", original)
	// Output: Original: [1 2 3] (unchanged)
	fmt.Printf("Copied:   %v (modified)\n", copied)
	// Output: Copied:   [999 2 3] (modified)
	// WHY: Changing copied does NOT affect original — full copy!

	// Arrays are comparable (same size + same element type)
	a1 := [3]int{1, 2, 3}
	a2 := [3]int{1, 2, 3}
	a3 := [3]int{4, 5, 6}
	fmt.Printf("[1,2,3] == [1,2,3]: %v\n", a1 == a2)
	// Output: [1,2,3] == [1,2,3]: true
	fmt.Printf("[1,2,3] == [4,5,6]: %v\n", a1 == a3)
	// Output: [1,2,3] == [4,5,6]: false

	// [3]int and [4]int are DIFFERENT types — cannot compare or assign
	// var x [4]int = a1  // COMPILE ERROR: cannot use [3]int as [4]int

	// ──────────────────────────────────────────────────────────────
	// SECTION 2 — Slices: Dynamic, Reference Semantics
	// ──────────────────────────────────────────────────────────────
	// WHY: Slices are Go's dynamic arrays. They reference a backing
	// array and have both a length and a capacity. 99% of the time
	// you want a slice, not an array.

	fmt.Println("\n--- Slices ---")

	// Slice literal (no size specified — that makes it a slice!)
	sacks := []string{"wheat sack", "rice sack", "maize sack"}
	fmt.Printf("Sacks: %v (len=%d, cap=%d)\n", sacks, len(sacks), cap(sacks))
	// Output: Sacks: [wheat sack rice sack maize sack] (len=3, cap=3)

	// Slice from an array
	inventory := [5]string{"wheat", "rice", "bajra", "jowar", "maize"}
	bin := inventory[1:4] // elements at index 1, 2, 3
	fmt.Printf("Bin (slice of array): %v\n", bin)
	// Output: Bin (slice of array): [rice bajra jowar]

	// make() — create a slice with specified length and capacity
	buffer := make([]int, 3, 10) // len=3, cap=10
	fmt.Printf("Buffer: %v (len=%d, cap=%d)\n", buffer, len(buffer), cap(buffer))
	// Output: Buffer: [0 0 0] (len=3, cap=10)

	// make() with just length (capacity defaults to length)
	weights := make([]int, 5) // len=5, cap=5
	fmt.Printf("Weights: %v (len=%d, cap=%d)\n", weights, len(weights), cap(weights))
	// Output: Weights: [0 0 0 0 0] (len=5, cap=5)

	// ──────────────────────────────────────────────────────────────
	// SECTION 3 — nil Slice vs Empty Slice
	// ──────────────────────────────────────────────────────────────
	// WHY: A nil slice has no backing array. An empty slice has a
	// backing array of size 0. Both have len=0 and can be appended
	// to. For most purposes they behave the same, but nil checks
	// can distinguish them.

	fmt.Println("\n--- nil vs Empty Slice ---")

	var nilSlice []int             // nil slice — no allocation
	emptySlice := []int{}          // empty slice — allocated, len 0
	madeSlice := make([]int, 0)    // empty slice via make

	fmt.Printf("nil slice:   %v, len=%d, cap=%d, nil? %v\n",
		nilSlice, len(nilSlice), cap(nilSlice), nilSlice == nil)
	// Output: nil slice:   [], len=0, cap=0, nil? true

	fmt.Printf("empty slice: %v, len=%d, cap=%d, nil? %v\n",
		emptySlice, len(emptySlice), cap(emptySlice), emptySlice == nil)
	// Output: empty slice: [], len=0, cap=0, nil? false

	fmt.Printf("make slice:  %v, len=%d, cap=%d, nil? %v\n",
		madeSlice, len(madeSlice), cap(madeSlice), madeSlice == nil)
	// Output: make slice:  [], len=0, cap=0, nil? false

	// Both can be appended to — append handles nil gracefully
	nilSlice = append(nilSlice, 1, 2, 3)
	fmt.Printf("After append to nil: %v\n", nilSlice)
	// Output: After append to nil: [1 2 3]

	// ============================================================
	// EXAMPLE BLOCK 2 — Append, Copy, Slice Expressions & Growth
	// ============================================================

	// ──────────────────────────────────────────────────────────────
	// SECTION 4 — append()
	// ──────────────────────────────────────────────────────────────
	// WHY: append is the primary way to grow slices. It returns a
	// new slice (which may or may not point to the same backing
	// array). ALWAYS reassign the result: s = append(s, elem).

	fmt.Println("\n--- append ---")

	items := []string{"wheat"}
	fmt.Printf("Before: %v (len=%d, cap=%d)\n", items, len(items), cap(items))
	// Output: Before: [wheat] (len=1, cap=1)

	items = append(items, "rice")
	fmt.Printf("After 1: %v (len=%d, cap=%d)\n", items, len(items), cap(items))
	// Output: After 1: [wheat rice] (len=2, cap=2)

	items = append(items, "bajra", "jowar", "maize")
	fmt.Printf("After 3: %v (len=%d, cap=%d)\n", items, len(items), cap(items))
	// Output: After 3: [wheat rice bajra jowar maize] (len=5, cap=...)

	// Append one slice to another with ...
	extras := []string{"ragi", "barley"}
	items = append(items, extras...)
	fmt.Printf("After append slice: %v\n", items)
	// Output: After append slice: [wheat rice bajra jowar maize ragi barley]

	// ──────────────────────────────────────────────────────────────
	// SECTION 5 — copy()
	// ──────────────────────────────────────────────────────────────
	// WHY: copy() copies elements from a source to a destination
	// slice. It copies min(len(dst), len(src)) elements. Use it
	// when you need a truly independent copy.

	fmt.Println("\n--- copy ---")

	src := []int{10, 20, 30, 40, 50}
	dst := make([]int, 3) // only 3 slots

	n := copy(dst, src) // copies first 3 elements
	fmt.Printf("Copied %d elements: %v\n", n, dst)
	// Output: Copied 3 elements: [10 20 30]

	// Modifying dst does NOT affect src
	dst[0] = 999
	fmt.Printf("src: %v (unchanged)\n", src)
	// Output: src: [10 20 30 40 50] (unchanged)
	fmt.Printf("dst: %v (modified)\n", dst)
	// Output: dst: [999 20 30] (modified)

	// Full independent copy pattern
	fullCopy := make([]int, len(src))
	copy(fullCopy, src)
	fmt.Printf("Full copy: %v\n", fullCopy)
	// Output: Full copy: [10 20 30 40 50]

	// ──────────────────────────────────────────────────────────────
	// SECTION 6 — Slice Expressions [low:high:max]
	// ──────────────────────────────────────────────────────────────
	// WHY: The three-index slice [low:high:max] controls capacity.
	// This prevents the new slice from accidentally accessing or
	// overwriting elements beyond what you intended.

	fmt.Println("\n--- Slice Expressions ---")

	data := []int{0, 1, 2, 3, 4, 5, 6, 7, 8, 9}

	// Two-index: s[low:high] — len = high-low, cap = cap(s)-low
	s1 := data[2:5]
	fmt.Printf("data[2:5]:   %v (len=%d, cap=%d)\n", s1, len(s1), cap(s1))
	// Output: data[2:5]:   [2 3 4] (len=3, cap=8)

	// Three-index: s[low:high:max] — len = high-low, cap = max-low
	s2 := data[2:5:6]
	fmt.Printf("data[2:5:6]: %v (len=%d, cap=%d)\n", s2, len(s2), cap(s2))
	// Output: data[2:5:6]: [2 3 4] (len=3, cap=4)
	// WHY: Cap is now 4 (6-2), not 8. This limits how far s2 can
	// grow before needing a new backing array.

	// ──────────────────────────────────────────────────────────────
	// SECTION 7 — Capacity Growth Strategy
	// ──────────────────────────────────────────────────────────────
	// WHY: When append exceeds capacity, Go allocates a new, larger
	// backing array. The growth factor is roughly 2x for small
	// slices, decreasing as slices get larger.

	fmt.Println("\n--- Capacity Growth ---")

	var growing []int
	prevCap := 0
	for i := 0; i < 20; i++ {
		growing = append(growing, i)
		if cap(growing) != prevCap {
			fmt.Printf("  len=%2d, cap=%2d (grew from %d)\n",
				len(growing), cap(growing), prevCap)
			prevCap = cap(growing)
		}
	}
	// Output: (capacity doubles initially, then grows more slowly)
	//   len= 1, cap= 1 (grew from 0)
	//   len= 2, cap= 2 (grew from 1)
	//   len= 3, cap= 4 (grew from 2)
	//   len= 5, cap= 8 (grew from 4)
	//   len= 9, cap=16 (grew from 8)
	//   len=17, cap=32 (grew from 16)

	// ──────────────────────────────────────────────────────────────
	// SECTION 8 — Gotcha: Shared Backing Array
	// ──────────────────────────────────────────────────────────────
	// WHY: Slicing does NOT copy. The new slice shares the same
	// backing array. Modifying one affects the other!

	fmt.Println("\n--- Shared Backing Array Gotcha ---")

	original2 := []int{1, 2, 3, 4, 5}
	sub := original2[1:3] // [2, 3] — shares backing array

	fmt.Printf("Before: original=%v, sub=%v\n", original2, sub)
	// Output: Before: original=[1 2 3 4 5], sub=[2 3]

	sub[0] = 999
	fmt.Printf("After:  original=%v, sub=%v\n", original2, sub)
	// Output: After:  original=[1 999 3 4 5], sub=[999 3]
	// WHY: sub[0] IS original[1] — same memory!

	// Fix: use copy or three-index slice to decouple
	safe := make([]int, 2)
	copy(safe, original2[1:3])
	safe[0] = 888
	fmt.Printf("Safe:   original=%v, safe=%v\n", original2, safe)
	// Output: Safe:   original=[1 999 3 4 5], safe=[888 3]

	// ============================================================
	// EXAMPLE BLOCK 3 — Multi-Dimensional, slices Package & Patterns
	// ============================================================

	// ──────────────────────────────────────────────────────────────
	// SECTION 9 — Multi-Dimensional Slices
	// ──────────────────────────────────────────────────────────────
	// WHY: Go doesn't have built-in 2D arrays/slices. You create
	// a slice of slices. Each inner slice can have a different
	// length (jagged arrays are possible).

	fmt.Println("\n--- Multi-Dimensional Slices ---")

	// 3x4 grid (godown floor plan)
	grid := [][]string{
		{"A1", "A2", "A3", "A4"},
		{"B1", "B2", "B3", "B4"},
		{"C1", "C2", "C3", "C4"},
	}

	fmt.Printf("Grid[1][2] = %s\n", grid[1][2])
	// Output: Grid[1][2] = B3

	// Print the grid
	for _, row := range grid {
		fmt.Printf("  %v\n", row)
	}
	// Output:
	//   [A1 A2 A3 A4]
	//   [B1 B2 B3 B4]
	//   [C1 C2 C3 C4]

	// Creating a dynamic 2D slice with make
	rows, cols := 3, 4
	matrix := make([][]int, rows)
	for i := range matrix {
		matrix[i] = make([]int, cols)
		for j := range matrix[i] {
			matrix[i][j] = i*cols + j
		}
	}
	fmt.Printf("Matrix: %v\n", matrix)
	// Output: Matrix: [[0 1 2 3] [4 5 6 7] [8 9 10 11]]

	// ──────────────────────────────────────────────────────────────
	// SECTION 10 — slices Package (Go 1.21+)
	// ──────────────────────────────────────────────────────────────
	// WHY: The slices package provides generic helper functions
	// that replace common boilerplate: sorting, searching,
	// comparing, and more.

	fmt.Println("\n--- slices Package (Go 1.21+) ---")

	nums := []int{5, 3, 8, 1, 9, 2, 7}

	// slices.Contains — check if an element exists
	fmt.Printf("Contains 8? %v\n", slices.Contains(nums, 8))
	// Output: Contains 8? true
	fmt.Printf("Contains 6? %v\n", slices.Contains(nums, 6))
	// Output: Contains 6? false

	// slices.Index — find the index of an element
	fmt.Printf("Index of 9: %d\n", slices.Index(nums, 9))
	// Output: Index of 9: 4
	fmt.Printf("Index of 6: %d\n", slices.Index(nums, 6))
	// Output: Index of 6: -1

	// slices.Sort — sorts in place (modifies the slice)
	sorted := slices.Clone(nums) // clone first to preserve original
	slices.Sort(sorted)
	fmt.Printf("Original: %v\n", nums)
	// Output: Original: [5 3 8 1 9 2 7]
	fmt.Printf("Sorted:   %v\n", sorted)
	// Output: Sorted:   [1 2 3 5 7 8 9]

	// slices.Min, slices.Max
	fmt.Printf("Min: %d, Max: %d\n", slices.Min(nums), slices.Max(nums))
	// Output: Min: 1, Max: 9

	// slices.Reverse — reverses in place
	rev := slices.Clone(sorted)
	slices.Reverse(rev)
	fmt.Printf("Reversed: %v\n", rev)
	// Output: Reversed: [9 8 7 5 3 2 1]

	// slices.Equal — compare two slices
	a := []int{1, 2, 3}
	b := []int{1, 2, 3}
	c := []int{1, 2, 4}
	fmt.Printf("[1,2,3] == [1,2,3]: %v\n", slices.Equal(a, b))
	// Output: [1,2,3] == [1,2,3]: true
	fmt.Printf("[1,2,3] == [1,2,4]: %v\n", slices.Equal(a, c))
	// Output: [1,2,3] == [1,2,4]: false

	// slices.Compact — remove consecutive duplicates (sort first!)
	dupes := []int{1, 1, 2, 2, 2, 3, 3, 1}
	compacted := slices.Compact(slices.Clone(dupes))
	fmt.Printf("Compact(%v) = %v\n", dupes, compacted)
	// Output: Compact([1 1 2 2 2 3 3 1]) = [1 2 3 1]
	// WHY: Only removes CONSECUTIVE duplicates. Sort first for full dedup.

	// ──────────────────────────────────────────────────────────────
	// SECTION 11 — Common Patterns
	// ──────────────────────────────────────────────────────────────
	// WHY: These patterns come up constantly in Go code. Knowing
	// them saves time and prevents bugs.

	fmt.Println("\n--- Common Patterns ---")

	// Pattern 1: Filter
	fmt.Println("Filter (even numbers):")
	allNums := []int{1, 2, 3, 4, 5, 6, 7, 8, 9, 10}
	evens := filter(allNums, func(n int) bool { return n%2 == 0 })
	fmt.Printf("  %v -> %v\n", allNums, evens)
	// Output:   [1 2 3 4 5 6 7 8 9 10] -> [2 4 6 8 10]

	// Pattern 2: Map (transform)
	fmt.Println("Map (square each):")
	squares := mapSlice([]int{1, 2, 3, 4, 5}, func(n int) int { return n * n })
	fmt.Printf("  [1,2,3,4,5] -> %v\n", squares)
	// Output:   [1,2,3,4,5] -> [1 4 9 16 25]

	// Pattern 3: Stack (LIFO) using slice
	fmt.Println("Stack (LIFO):")
	var stack []string
	stack = append(stack, "wheat")
	stack = append(stack, "rice")
	stack = append(stack, "bajra")
	fmt.Printf("  Stack: %v\n", stack)
	// Output:   Stack: [wheat rice bajra]

	// Pop from stack
	top := stack[len(stack)-1]
	stack = stack[:len(stack)-1]
	fmt.Printf("  Popped: %s, Remaining: %v\n", top, stack)
	// Output:   Popped: bajra, Remaining: [wheat rice]

	// Pattern 4: Queue (FIFO) using slice
	fmt.Println("Queue (FIFO):")
	var queue []string
	queue = append(queue, "wheat")
	queue = append(queue, "rice")
	queue = append(queue, "bajra")
	fmt.Printf("  Queue: %v\n", queue)
	// Output:   Queue: [wheat rice bajra]

	// Dequeue from front
	front := queue[0]
	queue = queue[1:]
	fmt.Printf("  Dequeued: %s, Remaining: %v\n", front, queue)
	// Output:   Dequeued: wheat, Remaining: [rice bajra]

	// Pattern 5: Remove element at index (order-preserving)
	fmt.Println("Remove at index (preserve order):")
	grainList := []string{"wheat", "rice", "bajra", "jowar", "maize"}
	idx := 2 // remove "bajra"
	grainList = append(grainList[:idx], grainList[idx+1:]...)
	fmt.Printf("  After removing index 2: %v\n", grainList)
	// Output:   After removing index 2: [wheat rice jowar maize]
}

// ──────────────────────────────────────────────────────────────
// Helper functions
// ──────────────────────────────────────────────────────────────

func filter(nums []int, predicate func(int) bool) []int {
	var result []int
	for _, n := range nums {
		if predicate(n) {
			result = append(result, n)
		}
	}
	return result
}

func mapSlice(nums []int, transform func(int) int) []int {
	result := make([]int, len(nums))
	for i, n := range nums {
		result[i] = transform(n)
	}
	return result
}

// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. Arrays are fixed-size VALUE types. [3]int and [4]int are
//    different types. Assigning an array copies all elements.
//
// 2. Slices are dynamic REFERENCE types backed by an array.
//    They have length (elements in use) and capacity (total
//    allocated space).
//
// 3. Always reassign append: s = append(s, elem). append may
//    allocate a new backing array if capacity is exceeded.
//
// 4. Slicing does NOT copy — the new slice shares the backing
//    array. Use copy() or three-index slices to decouple.
//
// 5. nil slice and empty slice both have len=0, but nil slice
//    == nil is true. Both work with append.
//
// 6. Three-index slice [low:high:max] limits capacity, which
//    controls when append creates a new backing array.
//
// 7. The slices package (Go 1.21+) provides Sort, Contains,
//    Index, Min, Max, Equal, Reverse, Clone, and Compact.
//
// 8. Common patterns: filter, map, stack (append/pop from end),
//    queue (append/dequeue from front), remove at index.
//
// 9. Pandey's godown rule: "Know which sacks share the same
//    floor. Move one and the other shifts — unless you put
//    them on separate floors (copy)."
// ============================================================
