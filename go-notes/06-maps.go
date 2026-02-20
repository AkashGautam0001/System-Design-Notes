// ============================================================
//  FILE 6 : Maps
// ============================================================
//  Topic  : Map creation (literal, make, zero value), access
//           with comma-ok idiom, delete, iteration (random
//           order), reference semantics, nil map gotcha,
//           nested maps, maps of slices, counting/grouping,
//           maps package (Go 1.21+), set implementation
//
//  WHY THIS MATTERS:
//  Maps are Go's built-in hash table — the go-to structure for
//  key-value lookups, caching, counting, and grouping. Unlike
//  slices, map iteration order is intentionally random (Go
//  randomizes it to prevent code from depending on order).
//  Understanding nil maps, the comma-ok idiom, and reference
//  semantics prevents the most common map-related bugs.
// ============================================================

// ============================================================
// STORY: The Aadhaar Enrollment Center
// Operator Meena maintains the UIDAI enrollment register at
// her center. Each citizen has a unique Aadhaar number (key)
// and a record (value). Meena can look up any record instantly,
// add new enrollments, and remove old entries. But she must be
// careful: if she hands a copy of the register to another
// operator, they're BOTH looking at the same book — changes
// by one affect the other.
// ============================================================

package main

import (
	"fmt"
	"maps"
	"slices"
	"sort"
	"strings"
)

func main() {

	// ============================================================
	// EXAMPLE BLOCK 1 — Create, Access, Delete & Iterate
	// ============================================================

	// ──────────────────────────────────────────────────────────────
	// SECTION 1 — Creating Maps
	// ──────────────────────────────────────────────────────────────
	// WHY: There are three ways to create maps. Understanding the
	// difference (especially nil maps) prevents panics.

	fmt.Println("--- Creating Maps ---")

	// Map literal — most common
	population := map[string]int{
		"Mumbai":    12440000,
		"Delhi":     11030000,
		"Bangalore": 8440000,
		"Hyderabad": 6810000,
	}
	fmt.Printf("Population: %v\n", population)
	// Output: Population: map[Bangalore:8440000 Delhi:11030000 Hyderabad:6810000 Mumbai:12440000]

	// make() — creates an empty map (optionally with capacity hint)
	enrollment := make(map[string]string)
	enrollment["1234-5678-9012"] = "Meena Kumari"
	enrollment["9876-5432-1098"] = "Rajan Sharma"
	fmt.Printf("Enrollment: %v\n", enrollment)
	// Output: Enrollment: map[1234-5678-9012:Meena Kumari 9876-5432-1098:Rajan Sharma]

	// make with capacity hint — does NOT limit size, just preallocates
	largeMap := make(map[string]int, 1000)
	largeMap["key1"] = 1
	fmt.Printf("Large map len: %d\n", len(largeMap))
	// Output: Large map len: 1

	// Zero value — nil map
	var nilMap map[string]int
	fmt.Printf("nil map: %v, nil? %v, len=%d\n", nilMap, nilMap == nil, len(nilMap))
	// Output: nil map: map[], nil? true, len=0

	// ──────────────────────────────────────────────────────────────
	// SECTION 2 — nil Map Gotcha
	// ──────────────────────────────────────────────────────────────
	// WHY: You can READ from a nil map (returns zero value), but
	// WRITING to a nil map causes a runtime PANIC!

	fmt.Println("\n--- nil Map Gotcha ---")

	var safeRead map[string]int
	val := safeRead["missing"]
	fmt.Printf("Read from nil map: %d (no panic — returns zero value)\n", val)
	// Output: Read from nil map: 0 (no panic — returns zero value)

	// Uncommenting this would PANIC:
	// safeRead["key"] = 1  // PANIC: assignment to entry in nil map

	// Always initialize before writing:
	safeRead = make(map[string]int)
	safeRead["key"] = 1
	fmt.Printf("After init: %v\n", safeRead)
	// Output: After init: map[key:1]

	// ──────────────────────────────────────────────────────────────
	// SECTION 3 — Access & the Comma-Ok Idiom
	// ──────────────────────────────────────────────────────────────
	// WHY: Accessing a missing key returns the zero value — which
	// might be a valid value (e.g., 0 for int). The comma-ok idiom
	// tells you whether the key actually existed.

	fmt.Println("\n--- Comma-Ok Idiom ---")

	ages := map[string]int{
		"Meena": 32,
		"Rajan": 28,
		"Gita":  0, // Gita is a newborn!
	}

	// Without comma-ok — ambiguous for zero values
	fmt.Printf("Meena's age: %d\n", ages["Meena"])
	// Output: Meena's age: 32
	fmt.Printf("Unknown's age: %d\n", ages["Unknown"])
	// Output: Unknown's age: 0  (zero value — but does Unknown exist?)
	fmt.Printf("Gita's age: %d\n", ages["Gita"])
	// Output: Gita's age: 0  (is Gita missing or actually 0?)

	// With comma-ok — unambiguous
	if age, ok := ages["Gita"]; ok {
		fmt.Printf("Gita exists, age=%d\n", age)
	} else {
		fmt.Println("Gita not found")
	}
	// Output: Gita exists, age=0

	if age, ok := ages["Unknown"]; ok {
		fmt.Printf("Unknown exists, age=%d\n", age)
	} else {
		fmt.Println("Unknown not found")
	}
	// Output: Unknown not found

	// ──────────────────────────────────────────────────────────────
	// SECTION 4 — delete() and len()
	// ──────────────────────────────────────────────────────────────
	// WHY: delete() removes a key. It's a no-op if the key doesn't
	// exist (no panic). len() returns the number of key-value pairs.

	fmt.Println("\n--- delete and len ---")

	states := map[string]string{
		"MH": "Maharashtra",
		"KA": "Karnataka",
		"TN": "Tamil Nadu",
	}
	fmt.Printf("Before: len=%d, %v\n", len(states), states)
	// Output: Before: len=3, map[KA:Karnataka MH:Maharashtra TN:Tamil Nadu]

	delete(states, "KA")
	fmt.Printf("After delete: len=%d, %v\n", len(states), states)
	// Output: After delete: len=2, map[MH:Maharashtra TN:Tamil Nadu]

	delete(states, "nonexistent") // no panic — silent no-op
	fmt.Println("Deleting nonexistent key: no panic")
	// Output: Deleting nonexistent key: no panic

	// ──────────────────────────────────────────────────────────────
	// SECTION 5 — Iteration (Random Order!)
	// ──────────────────────────────────────────────────────────────
	// WHY: Map iteration order in Go is intentionally randomized.
	// If you need sorted output, extract keys, sort them, then
	// iterate by key.

	fmt.Println("\n--- Iteration (random order) ---")

	capitals := map[string]string{
		"India":     "New Delhi",
		"Sri Lanka": "Colombo",
		"Nepal":     "Kathmandu",
		"Bangladesh":"Dhaka",
	}

	// Iteration — order will vary between runs!
	fmt.Println("Random order:")
	for country, capital := range capitals {
		fmt.Printf("  %s: %s\n", country, capital)
	}

	// Sorted iteration — extract keys, sort, iterate
	fmt.Println("Sorted order:")
	keys := make([]string, 0, len(capitals))
	for k := range capitals {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	for _, k := range keys {
		fmt.Printf("  %s: %s\n", k, capitals[k])
	}
	// Output:
	//   Bangladesh: Dhaka
	//   India: New Delhi
	//   Nepal: Kathmandu
	//   Sri Lanka: Colombo

	// ──────────────────────────────────────────────────────────────
	// SECTION 6 — Maps are Reference Types
	// ──────────────────────────────────────────────────────────────
	// WHY: Assigning a map to another variable or passing it to a
	// function does NOT copy it. Both variables point to the same
	// underlying hash table. Mutations through one affect the other.

	fmt.Println("\n--- Reference Semantics ---")

	original := map[string]int{"a": 1, "b": 2}
	alias := original // alias points to the SAME map

	alias["c"] = 3
	fmt.Printf("Original: %v\n", original)
	// Output: Original: map[a:1 b:2 c:3]
	fmt.Printf("Alias:    %v\n", alias)
	// Output: Alias:    map[a:1 b:2 c:3]
	// WHY: Both see "c" because they share the same map!

	// To make an independent copy, use maps.Clone() or copy manually
	independent := make(map[string]int, len(original))
	for k, v := range original {
		independent[k] = v
	}
	independent["d"] = 4
	fmt.Printf("Original (unchanged): %v\n", original)
	// Output: Original (unchanged): map[a:1 b:2 c:3]
	fmt.Printf("Independent: %v\n", independent)
	// Output: Independent: map[a:1 b:2 c:3 d:4]

	// Maps are NOT safe for concurrent use! If multiple goroutines
	// read/write the same map, you need sync.Mutex or sync.Map.
	// (Covered in concurrency topics.)

	// ============================================================
	// EXAMPLE BLOCK 2 — Nested Maps, Patterns & maps Package
	// ============================================================

	// ──────────────────────────────────────────────────────────────
	// SECTION 7 — Nested Maps
	// ──────────────────────────────────────────────────────────────
	// WHY: Maps of maps are common for hierarchical data. But each
	// inner map must be initialized before use!

	fmt.Println("\n--- Nested Maps ---")

	// District registry — zone -> name -> age
	districtRegistry := map[string]map[string]int{
		"North Delhi": {
			"Meena": 32,
			"Rajan": 28,
		},
		"South Delhi": {
			"Gita":   25,
			"Suresh": 30,
		},
	}

	fmt.Printf("North Delhi/Meena: %d\n", districtRegistry["North Delhi"]["Meena"])
	// Output: North Delhi/Meena: 32

	// Adding to nested map — inner map must exist!
	// districtRegistry["East Delhi"]["Priya"] = 22  // PANIC: nil inner map

	// Safe way: initialize inner map first
	if districtRegistry["East Delhi"] == nil {
		districtRegistry["East Delhi"] = make(map[string]int)
	}
	districtRegistry["East Delhi"]["Priya"] = 22
	fmt.Printf("East Delhi/Priya: %d\n", districtRegistry["East Delhi"]["Priya"])
	// Output: East Delhi/Priya: 22

	// ──────────────────────────────────────────────────────────────
	// SECTION 8 — Map of Slices
	// ──────────────────────────────────────────────────────────────
	// WHY: Maps where each value is a slice are perfect for
	// grouping. The zero value of a nil slice works with append,
	// so you don't need to initialize.

	fmt.Println("\n--- Map of Slices ---")

	// Group citizens by verification status
	citizens := map[string][]string{}
	citizens["verified"] = append(citizens["verified"], "Meena", "Rajan")
	citizens["pending"] = append(citizens["pending"], "Gita")
	citizens["verified"] = append(citizens["verified"], "Suresh")

	for status, names := range citizens {
		fmt.Printf("  %s: %v\n", status, names)
	}
	// Output (order varies):
	//   verified: [Meena Rajan Suresh]
	//   pending: [Gita]

	// ──────────────────────────────────────────────────────────────
	// SECTION 9 — Counting Pattern
	// ──────────────────────────────────────────────────────────────
	// WHY: Counting occurrences is one of the most common map uses.
	// Zero value of int (0) makes counting trivial — no need to
	// check if the key exists first.

	fmt.Println("\n--- Counting Pattern ---")

	words := strings.Fields("chai pani chai roti chai pani dal roti")
	wordCount := make(map[string]int)

	for _, word := range words {
		wordCount[word]++ // works even if key doesn't exist (zero value = 0)
	}

	// Sort keys for consistent output
	sortedWords := make([]string, 0, len(wordCount))
	for w := range wordCount {
		sortedWords = append(sortedWords, w)
	}
	sort.Strings(sortedWords)

	for _, w := range sortedWords {
		fmt.Printf("  %q: %d\n", w, wordCount[w])
	}
	// Output:
	//   "chai": 3
	//   "dal": 1
	//   "pani": 2
	//   "roti": 2

	// ──────────────────────────────────────────────────────────────
	// SECTION 10 — Grouping Pattern
	// ──────────────────────────────────────────────────────────────
	// WHY: Group items by a computed key — a natural extension of
	// the counting pattern.

	fmt.Println("\n--- Grouping Pattern ---")

	type Item struct {
		Name     string
		Category string
	}

	inventory := []Item{
		{"Rasgulla", "Bengali Sweets"},
		{"Sandesh", "Bengali Sweets"},
		{"Jalebi", "North Indian Sweets"},
		{"Gulab Jamun", "North Indian Sweets"},
		{"Mysore Pak", "South Indian Sweets"},
		{"Laddu", "North Indian Sweets"},
	}

	grouped := make(map[string][]string)
	for _, item := range inventory {
		grouped[item.Category] = append(grouped[item.Category], item.Name)
	}

	// Sort categories for consistent output
	categories := make([]string, 0, len(grouped))
	for cat := range grouped {
		categories = append(categories, cat)
	}
	sort.Strings(categories)

	for _, cat := range categories {
		fmt.Printf("  %s: %v\n", cat, grouped[cat])
	}
	// Output:
	//   Bengali Sweets: [Rasgulla Sandesh]
	//   North Indian Sweets: [Jalebi Gulab Jamun Laddu]
	//   South Indian Sweets: [Mysore Pak]

	// ──────────────────────────────────────────────────────────────
	// SECTION 11 — maps Package (Go 1.21+)
	// ──────────────────────────────────────────────────────────────
	// WHY: The maps package provides generic helper functions for
	// common operations: collecting keys/values, cloning, comparing.

	fmt.Println("\n--- maps Package (Go 1.21+) ---")

	scores := map[string]int{
		"Meena":  95,
		"Rajan":  88,
		"Gita":   92,
		"Suresh": 79,
	}

	// maps.Clone — independent copy
	scoresCopy := maps.Clone(scores)
	scoresCopy["Meena"] = 100
	fmt.Printf("Original Meena: %d\n", scores["Meena"])
	// Output: Original Meena: 95
	fmt.Printf("Copy Meena:     %d\n", scoresCopy["Meena"])
	// Output: Copy Meena:     100

	// maps.Equal — compare two maps
	m1 := map[string]int{"a": 1, "b": 2}
	m2 := map[string]int{"a": 1, "b": 2}
	m3 := map[string]int{"a": 1, "b": 3}
	fmt.Printf("m1 == m2: %v\n", maps.Equal(m1, m2))
	// Output: m1 == m2: true
	fmt.Printf("m1 == m3: %v\n", maps.Equal(m1, m3))
	// Output: m1 == m3: false

	// maps.Keys and maps.Values — return iterators (Go 1.23+)
	// Collect keys into a sorted slice
	keySlice := slices.Sorted(maps.Keys(scores))
	fmt.Printf("Sorted keys: %v\n", keySlice)
	// Output: Sorted keys: [Gita Meena Rajan Suresh]

	// Collect values into a slice
	valSlice := slices.Collect(maps.Values(scores))
	slices.Sort(valSlice)
	fmt.Printf("Sorted values: %v\n", valSlice)
	// Output: Sorted values: [79 88 92 95]

	// maps.DeleteFunc — delete entries matching a condition
	lowScores := maps.Clone(scores)
	maps.DeleteFunc(lowScores, func(name string, score int) bool {
		return score >= 90 // delete those with score >= 90
	})
	fmt.Printf("Scores < 90: %v\n", lowScores)
	// Output: Scores < 90: map[Rajan:88 Suresh:79]

	// ──────────────────────────────────────────────────────────────
	// SECTION 12 — Set Implementation with map[T]struct{}
	// ──────────────────────────────────────────────────────────────
	// WHY: Go has no built-in Set type. The idiomatic way is to
	// use map[T]struct{}. struct{} takes zero bytes of memory,
	// making it more efficient than map[T]bool.

	fmt.Println("\n--- Set Implementation ---")

	// Create a set
	type StringSet map[string]struct{}

	pincodes := StringSet{}
	pincodes["110001"] = struct{}{}
	pincodes["400001"] = struct{}{}
	pincodes["600001"] = struct{}{}
	pincodes["110001"] = struct{}{} // duplicate — no effect

	fmt.Printf("Set size: %d\n", len(pincodes))
	// Output: Set size: 3

	// Check membership
	if _, exists := pincodes["400001"]; exists {
		fmt.Println("400001 is in the set")
	}
	// Output: 400001 is in the set

	if _, exists := pincodes["500001"]; !exists {
		fmt.Println("500001 is NOT in the set")
	}
	// Output: 500001 is NOT in the set

	// Remove from set
	delete(pincodes, "600001")
	fmt.Printf("After removing 600001, size: %d\n", len(pincodes))
	// Output: After removing 600001, size: 2

	// Iterate over set
	fmt.Print("Set contents: ")
	setKeys := make([]string, 0, len(pincodes))
	for pincode := range pincodes {
		setKeys = append(setKeys, pincode)
	}
	sort.Strings(setKeys)
	fmt.Println(strings.Join(setKeys, ", "))
	// Output: Set contents: 110001, 400001

	// Set operations
	setA := StringSet{"110001": {}, "400001": {}, "600001": {}}
	setB := StringSet{"400001": {}, "600001": {}, "500001": {}}

	// Intersection
	intersection := StringSet{}
	for k := range setA {
		if _, ok := setB[k]; ok {
			intersection[k] = struct{}{}
		}
	}
	interKeys := make([]string, 0, len(intersection))
	for k := range intersection {
		interKeys = append(interKeys, k)
	}
	sort.Strings(interKeys)
	fmt.Printf("Intersection: %v\n", interKeys)
	// Output: Intersection: [400001 600001]

	// Union
	union := StringSet{}
	for k := range setA {
		union[k] = struct{}{}
	}
	for k := range setB {
		union[k] = struct{}{}
	}
	unionKeys := make([]string, 0, len(union))
	for k := range union {
		unionKeys = append(unionKeys, k)
	}
	sort.Strings(unionKeys)
	fmt.Printf("Union: %v\n", unionKeys)
	// Output: Union: [110001 400001 500001 600001]
}

// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. Create maps with literals, make(), or var. A nil map can
//    be read (returns zero value) but PANICS on write.
//
// 2. Always use the comma-ok idiom when zero values are valid:
//    val, ok := m[key]. This distinguishes "key missing" from
//    "key exists with zero value."
//
// 3. Map iteration order is intentionally RANDOM. Sort keys
//    first if you need deterministic output.
//
// 4. Maps are reference types. Assigning or passing a map does
//    NOT copy it. Use maps.Clone() for an independent copy.
//
// 5. Maps are NOT safe for concurrent access. Use sync.Mutex
//    or sync.Map for goroutine-safe access.
//
// 6. Nested maps: always check/initialize inner maps before
//    writing, or you'll hit a nil map panic.
//
// 7. Counting pattern: m[key]++ works because missing keys
//    return the zero value (0 for int).
//
// 8. Set pattern: use map[T]struct{} — struct{} is zero bytes.
//    More memory-efficient than map[T]bool.
//
// 9. The maps package (Go 1.21+) provides Clone, Equal, Keys,
//    Values, and DeleteFunc for common operations.
//
// 10. Meena's enrollment rule: "Every citizen has a unique
//     Aadhaar number. Check if the number exists before
//     assuming its value. And remember — handing someone
//     your register means they can change YOUR records."
// ============================================================
