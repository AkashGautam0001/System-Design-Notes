// ============================================================
//  FILE 3 : Control Flow
// ============================================================
//  Topic  : if/else with init statements, for loops (Go's only
//           loop), switch (expression, tagless, type preview,
//           fallthrough), break, continue, labeled loops, goto
//
//  WHY THIS MATTERS:
//  Go has exactly one loop keyword: `for`. No while, no do-while,
//  no forEach. The switch statement replaces long if-else chains
//  and breaks automatically (no fall-through by default — the
//  opposite of C/Java). Mastering control flow in Go means
//  learning fewer keywords used more powerfully.
// ============================================================

// ============================================================
// STORY: The Dak Sorting Office
// Postmaster Brijesh routes letters through different chutes in
// India Post's central sorting office. Each if/else is a gate
// that checks a pincode. Each for loop is a conveyor belt. Each
// switch is a multi-way chute selector. Brijesh must route every
// letter correctly — no parcel gets lost, no infinite loops allowed.
// ============================================================

package main

import "fmt"

func main() {

	// ============================================================
	// EXAMPLE BLOCK 1 — if/else Patterns & for Loop Variants
	// ============================================================

	// ──────────────────────────────────────────────────────────────
	// SECTION 1 — Basic if/else
	// ──────────────────────────────────────────────────────────────
	// WHY: Go's if/else is straightforward. No parentheses around
	// the condition (unlike C/Java), but braces are always required.

	temperature := 72

	if temperature > 80 {
		fmt.Println("Too hot — open the office windows!")
	} else if temperature < 60 {
		fmt.Println("Too cold — turn on the room heater!")
	} else {
		fmt.Println("Temperature is just right.")
	}
	// Output: Temperature is just right.

	// ──────────────────────────────────────────────────────────────
	// SECTION 2 — if with Init Statement
	// ──────────────────────────────────────────────────────────────
	// WHY: Go lets you declare a variable inside the if statement.
	// The variable is scoped to the if/else block — it disappears
	// after. This keeps the outer scope clean.

	fmt.Println("\n--- if with Init Statement ---")

	letters := []string{"letter", "parcel", "postcard", "registered", "speedpost"}

	// letterCount is scoped to this if/else block only
	if letterCount := len(letters); letterCount > 3 {
		fmt.Printf("Heavy load: %d items on the belt\n", letterCount)
	} else {
		fmt.Printf("Light load: %d items on the belt\n", letterCount)
	}
	// Output: Heavy load: 5 items on the belt

	// letterCount is NOT accessible here — scoped to if/else block
	// fmt.Println(letterCount)  // COMPILE ERROR: undefined: letterCount

	// Common pattern: error checking with init statement
	if val, ok := mockLookup("registered"); ok {
		fmt.Printf("Found item: %s\n", val)
	} else {
		fmt.Println("Item not found")
	}
	// Output: Found item: registered dak

	// ──────────────────────────────────────────────────────────────
	// SECTION 3 — for Loop: Classic (C-style)
	// ──────────────────────────────────────────────────────────────
	// WHY: Go has ONE loop keyword: for. It handles everything that
	// other languages split across for, while, do-while, and forEach.

	fmt.Println("\n--- Classic for Loop ---")

	fmt.Print("Letters on belt: ")
	for i := 0; i < 5; i++ {
		fmt.Printf("%d ", i)
	}
	fmt.Println()
	// Output: Letters on belt: 0 1 2 3 4

	// ──────────────────────────────────────────────────────────────
	// SECTION 4 — for Loop: range (foreach-style)
	// ──────────────────────────────────────────────────────────────
	// WHY: range iterates over slices, arrays, maps, strings, and
	// channels. It gives you (index, value) for slices and
	// (key, value) for maps.

	fmt.Println("\n--- for range (slice) ---")

	parcels := []string{"letter", "parcel", "postcard", "registered"}

	// Index and value
	for i, item := range parcels {
		fmt.Printf("  Chute %d: %s\n", i, item)
	}
	// Output:
	//   Chute 0: letter
	//   Chute 1: parcel
	//   Chute 2: postcard
	//   Chute 3: registered

	// Value only (discard index with _)
	fmt.Print("Parcels: ")
	for _, item := range parcels {
		fmt.Printf("%s ", item)
	}
	fmt.Println()
	// Output: Parcels: letter parcel postcard registered

	// Index only
	fmt.Print("Indices: ")
	for i := range parcels {
		fmt.Printf("%d ", i)
	}
	fmt.Println()
	// Output: Indices: 0 1 2 3

	// Range over a string — iterates by rune, not byte!
	fmt.Println("\n--- for range (string) ---")
	for i, ch := range "Go!" {
		fmt.Printf("  index=%d, char=%c\n", i, ch)
	}
	// Output:
	//   index=0, char=G
	//   index=1, char=o
	//   index=2, char=!

	// Range over a map
	fmt.Println("\n--- for range (map) ---")
	pincodeCount := map[string]int{"110001": 100, "400001": 80, "600001": 25}
	for pincode, qty := range pincodeCount {
		fmt.Printf("  %s: %d\n", pincode, qty)
	}
	// Output: (order varies — map iteration is random!)
	//   110001: 100
	//   400001: 80
	//   600001: 25

	// Range over integers (Go 1.22+)
	fmt.Println("\n--- for range (integer, Go 1.22+) ---")
	fmt.Print("Count: ")
	for i := range 5 {
		fmt.Printf("%d ", i)
	}
	fmt.Println()
	// Output: Count: 0 1 2 3 4

	// ──────────────────────────────────────────────────────────────
	// SECTION 5 — for Loop: while-style
	// ──────────────────────────────────────────────────────────────
	// WHY: Drop the init and post statements from `for` and you
	// get a while loop. Go doesn't need a separate `while` keyword.

	fmt.Println("\n--- while-style for ---")
	count := 0
	for count < 3 {
		fmt.Printf("  Processing batch %d\n", count)
		count++
	}
	// Output:
	//   Processing batch 0
	//   Processing batch 1
	//   Processing batch 2

	// ──────────────────────────────────────────────────────────────
	// SECTION 6 — for Loop: Infinite with break
	// ──────────────────────────────────────────────────────────────
	// WHY: `for {}` is an infinite loop. Use break to exit when
	// a condition is met. Common in servers and event loops.

	fmt.Println("\n--- Infinite loop with break ---")
	attempts := 0
	for {
		attempts++
		if attempts >= 3 {
			fmt.Printf("  Sorting machine stopped after %d attempts\n", attempts)
			break // exits the loop
		}
		fmt.Printf("  Attempt %d...\n", attempts)
	}
	// Output:
	//   Attempt 1...
	//   Attempt 2...
	//   Sorting machine stopped after 3 attempts

	// ──────────────────────────────────────────────────────────────
	// SECTION 7 — break and continue
	// ──────────────────────────────────────────────────────────────
	// WHY: break exits the innermost loop. continue skips to the
	// next iteration. Both keep loops clean without deep nesting.

	fmt.Println("\n--- continue (skip damaged parcels) ---")
	batch := []string{"good", "good", "damaged", "good", "damaged"}
	passed := 0
	for _, item := range batch {
		if item == "damaged" {
			fmt.Printf("  Skipping %s item\n", item)
			continue // skip to next iteration
		}
		passed++
		fmt.Printf("  Passed: %s (#%d)\n", item, passed)
	}
	// Output:
	//   Passed: good (#1)
	//   Passed: good (#2)
	//   Skipping damaged item
	//   Passed: good (#3)
	//   Skipping damaged item

	// ============================================================
	// EXAMPLE BLOCK 2 — switch, Labeled Loops & Advanced Control
	// ============================================================

	// ──────────────────────────────────────────────────────────────
	// SECTION 8 — Expression switch
	// ──────────────────────────────────────────────────────────────
	// WHY: switch in Go breaks automatically after each case (no
	// fall-through by default). This is the OPPOSITE of C/Java
	// where you must add break manually.

	fmt.Println("\n--- Expression switch ---")

	zone := "red"
	switch zone {
	case "red":
		fmt.Println("Route to fragile parcels section")
	case "blue":
		fmt.Println("Route to standard letters section")
	case "green":
		fmt.Println("Route to bulk mail section")
	default:
		fmt.Println("Route to manual inspection")
	}
	// Output: Route to fragile parcels section

	// ──────────────────────────────────────────────────────────────
	// SECTION 9 — Multi-case switch
	// ──────────────────────────────────────────────────────────────
	// WHY: Multiple values in one case — cleaner than || chains.

	fmt.Println("\n--- Multi-case switch ---")
	day := "Saturday"
	switch day {
	case "Monday", "Tuesday", "Wednesday", "Thursday", "Friday":
		fmt.Println("Workday — sorting office is running")
	case "Saturday", "Sunday":
		fmt.Println("Weekend — sorting office is closed")
	default:
		fmt.Println("Unknown day")
	}
	// Output: Weekend — sorting office is closed

	// ──────────────────────────────────────────────────────────────
	// SECTION 10 — Tagless switch (replaces if-else chains)
	// ──────────────────────────────────────────────────────────────
	// WHY: A switch without an expression acts like a clean
	// if-else chain. Each case is a boolean condition.

	fmt.Println("\n--- Tagless switch ---")
	score := 85
	switch {
	case score >= 90:
		fmt.Println("Grade: A")
	case score >= 80:
		fmt.Println("Grade: B")
	case score >= 70:
		fmt.Println("Grade: C")
	default:
		fmt.Println("Grade: F")
	}
	// Output: Grade: B

	// ──────────────────────────────────────────────────────────────
	// SECTION 11 — switch with init statement
	// ──────────────────────────────────────────────────────────────
	// WHY: Like if, switch can have an init statement to keep
	// variables scoped to the switch block.

	fmt.Println("\n--- switch with init ---")
	switch size := len(parcels); {
	case size > 10:
		fmt.Println("Large batch")
	case size > 3:
		fmt.Printf("Medium batch (%d items)\n", size)
	default:
		fmt.Println("Small batch")
	}
	// Output: Medium batch (4 items)

	// ──────────────────────────────────────────────────────────────
	// SECTION 12 — fallthrough
	// ──────────────────────────────────────────────────────────────
	// WHY: Go does NOT fall through by default (unlike C/Java).
	// The `fallthrough` keyword forces execution into the next
	// case — use it sparingly, as it can confuse readers.

	fmt.Println("\n--- fallthrough ---")
	level := 1
	fmt.Print("Access levels: ")
	switch level {
	case 1:
		fmt.Print("basic ")
		fallthrough
	case 2:
		fmt.Print("standard ")
		fallthrough
	case 3:
		fmt.Print("premium")
	}
	fmt.Println()
	// Output: Access levels: basic standard premium
	// WHY: fallthrough forces execution into the next case body
	// unconditionally — it does NOT check the next case's condition.

	// ──────────────────────────────────────────────────────────────
	// SECTION 13 — Type switch (preview)
	// ──────────────────────────────────────────────────────────────
	// WHY: Type switches inspect the dynamic type of an interface.
	// Full coverage comes with interfaces, but here's a preview.

	fmt.Println("\n--- Type switch (preview) ---")
	describe := func(val interface{}) string {
		switch v := val.(type) {
		case int:
			return fmt.Sprintf("integer: %d", v)
		case string:
			return fmt.Sprintf("string: %q", v)
		case bool:
			return fmt.Sprintf("boolean: %v", v)
		default:
			return fmt.Sprintf("unknown type: %T", v)
		}
	}

	fmt.Println(describe(42))
	// Output: integer: 42
	fmt.Println(describe("pincode"))
	// Output: string: "pincode"
	fmt.Println(describe(true))
	// Output: boolean: true
	fmt.Println(describe(3.14))
	// Output: unknown type: float64

	// ──────────────────────────────────────────────────────────────
	// SECTION 14 — Labeled break & continue (nested loop escape)
	// ──────────────────────────────────────────────────────────────
	// WHY: break only exits the innermost loop. When you have
	// nested loops and need to break out of an outer loop, use
	// a label. This is cleaner than boolean flags.

	fmt.Println("\n--- Labeled break (nested loop escape) ---")

	matrix := [][]int{
		{1, 2, 3},
		{4, 5, 6},
		{7, 8, 9},
	}

	target := 5
	found := false

outer: // label for the outer loop
	for row, cols := range matrix {
		for col, val := range cols {
			if val == target {
				fmt.Printf("Found %d at [%d][%d]\n", target, row, col)
				found = true
				break outer // breaks out of BOTH loops
			}
		}
	}
	if !found {
		fmt.Printf("%d not found\n", target)
	}
	// Output: Found 5 at [1][1]

	// Labeled continue — skip to next iteration of outer loop
	fmt.Println("\n--- Labeled continue ---")
	fmt.Println("Skip rows containing negative numbers:")

rows:
	for i, row := range [][]int{{1, 2}, {3, -1}, {4, 5}} {
		for _, val := range row {
			if val < 0 {
				fmt.Printf("  Row %d has negative — skipping entire row\n", i)
				continue rows // skip to next iteration of outer loop
			}
		}
		fmt.Printf("  Row %d: all positive\n", i)
	}
	// Output:
	//   Row 0: all positive
	//   Row 1 has negative — skipping entire row
	//   Row 2: all positive

	// ──────────────────────────────────────────────────────────────
	// SECTION 15 — goto (exists but discouraged)
	// ──────────────────────────────────────────────────────────────
	// WHY: Go has goto, but it's rarely used. It cannot jump over
	// variable declarations or into other blocks. Labeled
	// break/continue are almost always a better choice.

	fmt.Println("\n--- goto (exists but discouraged) ---")

	n := 0
loop:
	if n < 3 {
		fmt.Printf("  goto iteration: %d\n", n)
		n++
		goto loop
	}
	fmt.Println("  Done with goto")
	// Output:
	//   goto iteration: 0
	//   goto iteration: 1
	//   goto iteration: 2
	//   Done with goto
	// WHY: This works, but a for loop is far clearer. Use goto only
	// for cleanup patterns in low-level code (if ever).
}

// ──────────────────────────────────────────────────────────────
// Helper function for if-with-init demo
// ──────────────────────────────────────────────────────────────

func mockLookup(name string) (string, bool) {
	registry := map[string]string{
		"letter":     "ordinary dak",
		"registered": "registered dak",
		"speedpost":  "express dak",
	}
	val, ok := registry[name]
	return val, ok
}

// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. Go has ONE loop keyword: `for`. It covers classic for,
//    while-style, infinite, and range (foreach) patterns.
//
// 2. if/else and switch can have init statements that scope
//    variables to the block: if x := compute(); x > 0 { }
//
// 3. switch breaks automatically after each case — NO fall-
//    through by default. Use `fallthrough` explicitly (rare).
//
// 4. Tagless switch (switch { case cond: }) replaces long
//    if-else chains with cleaner, more readable code.
//
// 5. Labeled break/continue let you escape nested loops
//    without boolean flags. Use them instead of goto.
//
// 6. range over strings iterates by rune (Unicode code point),
//    not by byte. range over maps has random iteration order.
//
// 7. goto exists but is discouraged. It cannot jump over
//    variable declarations or into blocks.
//
// 8. Brijesh's sorting rule: "One conveyor belt (for), multi-way
//    chutes (switch), and emergency exits (break/continue) —
//    that's all you need to route every letter."
// ============================================================
