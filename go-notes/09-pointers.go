// ============================================================
//  FILE 9 : Pointers
// ============================================================
//  Topic  : Address-of (&), dereference (*), new(), pointer to
//           struct, value vs pointer semantics, nil pointers,
//           no pointer arithmetic, when to use pointers.
//
//  WHY THIS MATTERS:
//  Go is pass-by-value for everything. Pointers let you share
//  data efficiently, mutate values across function boundaries,
//  and avoid copying large structs. Understanding pointers is
//  essential for writing correct and performant Go code, and
//  Go's design prevents the footguns of C pointer arithmetic.
// ============================================================

// ============================================================
// STORY: India Post Dak System
// Postman Lakhan delivers letters (chithi) across the mohalla
// using house addresses (pointers). Some letters carry the
// actual content (value semantics), while others carry the
// address of a letterbox/dabba (pointer semantics). Knowing
// when to send the chithi vs the address determines whether
// the recipient sees the original or just a copy.
// ============================================================

package main

import "fmt"

func main() {

	// ──────────────────────────────────────────────────────────────
	// EXAMPLE BLOCK 1 — Basic Pointers, &, *, new(), nil, Pointer
	//                    to Struct
	// ──────────────────────────────────────────────────────────────

	// ────────────────────────────────────────────────────────────
	// 1.1 — The & (Address-of) and * (Dereference) Operators
	// ────────────────────────────────────────────────────────────
	// WHY: & gets the memory address; * reads/writes the value
	// at that address. This is how you "point to" data.

	fmt.Println("--- & and * Basics ---")
	dabba := 42
	ptr := &dabba // ptr holds the ADDRESS of dabba

	fmt.Println("dabba value:", dabba)
	// Output: dabba value: 42
	fmt.Println("dabba address (&dabba):", ptr)
	// Output: dabba address (&dabba): 0x... (some hex address)
	fmt.Println("dereferenced (*ptr):", *ptr)
	// Output: dereferenced (*ptr): 42

	// Modify through the pointer — opening the letter at the address
	*ptr = 100
	fmt.Println("After *ptr = 100, dabba:", dabba)
	// Output: After *ptr = 100, dabba: 100
	// WHY: *ptr and dabba refer to the SAME memory location.

	// ────────────────────────────────────────────────────────────
	// 1.2 — Pointer Type Declaration
	// ────────────────────────────────────────────────────────────
	// WHY: *T is a pointer to type T. The zero value of any
	// pointer is nil.

	fmt.Println("\n--- Pointer Types ---")
	var intPtr *int     // pointer to int, zero value is nil
	fmt.Println("nil pointer:", intPtr)
	// Output: nil pointer: <nil>

	num := 7
	intPtr = &num
	fmt.Printf("Type: %T  Value: %v  Points to: %d\n", intPtr, intPtr, *intPtr)
	// Output: Type: *int  Value: 0x...  Points to: 7

	// ────────────────────────────────────────────────────────────
	// 1.3 — The new() Function
	// ────────────────────────────────────────────────────────────
	// WHY: new(T) allocates memory for type T, zeroes it, and
	// returns a *T. Rarely used — &T{} is more common.

	fmt.Println("\n--- new() Function ---")
	p := new(int)       // allocates an int, returns *int
	fmt.Println("new(int) value:", *p)
	// Output: new(int) value: 0
	*p = 99
	fmt.Println("After *p = 99:", *p)
	// Output: After *p = 99: 99

	// Equivalent to:
	val := 0
	p2 := &val          // same effect as new(int)
	_ = p2

	// ────────────────────────────────────────────────────────────
	// 1.4 — Nil Pointer and Safety
	// ────────────────────────────────────────────────────────────
	// WHY: Dereferencing a nil pointer causes a runtime panic.
	// Always check before dereferencing.

	fmt.Println("\n--- Nil Pointer Safety ---")
	var safePtr *string
	if safePtr == nil {
		fmt.Println("Pointer is nil — safe to skip dereference")
		// Output: Pointer is nil — safe to skip dereference
	}

	// Safe dereference pattern
	safeDeref := func(p *string) string {
		if p == nil {
			return "(nil)"
		}
		return *p
	}

	fmt.Println("Nil deref:", safeDeref(nil))
	// Output: Nil deref: (nil)
	greeting := "Namaste, Lakhan!"
	fmt.Println("Valid deref:", safeDeref(&greeting))
	// Output: Valid deref: Namaste, Lakhan!

	// ────────────────────────────────────────────────────────────
	// 1.5 — Pointer to Struct (Automatic Dereferencing)
	// ────────────────────────────────────────────────────────────
	// WHY: Go automatically dereferences struct pointers when
	// accessing fields. (*p).Field and p.Field are identical.

	fmt.Println("\n--- Pointer to Struct ---")
	type Chithi struct {
		From    string
		To      string
		Content string
	}

	chithi := &Chithi{
		From:    "Ramesh",
		To:      "Suresh",
		Content: "Shaadi mein zaroor aana",
	}

	// Both work — Go auto-dereferences
	fmt.Println("To (auto-deref):", chithi.To)
	// Output: To (auto-deref): Suresh
	fmt.Println("To (explicit):", (*chithi).To)
	// Output: To (explicit): Suresh
	// WHY: chithi.To is syntactic sugar — cleaner and preferred.

	// Modify through pointer
	chithi.Content = "Shaadi 3 baje hai"
	fmt.Println("Updated content:", chithi.Content)
	// Output: Updated content: Shaadi 3 baje hai

	// ────────────────────────────────────────────────────────────
	// 1.6 — No Pointer Arithmetic in Go
	// ────────────────────────────────────────────────────────────
	// WHY: Unlike C/C++, Go forbids pointer arithmetic.
	// This prevents buffer overflows and memory corruption.
	// You CANNOT do ptr++ or ptr + offset.

	fmt.Println("\n--- No Pointer Arithmetic ---")
	fmt.Println("Go forbids pointer arithmetic — no ptr++, no ptr+offset")
	fmt.Println("This prevents buffer overflows and makes Go memory-safe")
	// WHY: Safety by design. Use slices for sequential access.

	// ──────────────────────────────────────────────────────────────
	// EXAMPLE BLOCK 2 — Value vs Pointer Semantics, Pointer
	//                    Receivers, When to Use Pointers
	// ──────────────────────────────────────────────────────────────

	// ────────────────────────────────────────────────────────────
	// 2.1 — Value Semantics: Pass by Value
	// ────────────────────────────────────────────────────────────
	// WHY: Go copies everything on assignment and function call.
	// Functions receive a COPY — changes don't affect the caller.

	fmt.Println("\n--- Value Semantics ---")
	doubleValue := func(n int) {
		n *= 2
		fmt.Println("  Inside function:", n)
	}

	x := 10
	doubleValue(x)
	// Output:   Inside function: 20
	fmt.Println("  Outside function:", x)
	// Output:   Outside function: 10
	// WHY: x is unchanged — the function modified a copy.

	// ────────────────────────────────────────────────────────────
	// 2.2 — Pointer Semantics: Pass by Pointer
	// ────────────────────────────────────────────────────────────
	// WHY: Pass a pointer to let the function modify the original.

	fmt.Println("\n--- Pointer Semantics ---")
	doublePointer := func(n *int) {
		*n *= 2
		fmt.Println("  Inside function:", *n)
	}

	y := 10
	doublePointer(&y)
	// Output:   Inside function: 20
	fmt.Println("  Outside function:", y)
	// Output:   Outside function: 20
	// WHY: y IS changed — the function modified the original via pointer.

	// ────────────────────────────────────────────────────────────
	// 2.3 — Struct: Value vs Pointer Demo
	// ────────────────────────────────────────────────────────────

	fmt.Println("\n--- Struct Value vs Pointer ---")
	type Parcel struct {
		Recipient string
		Weight    float64
	}

	// Value — gets a copy
	stampValue := func(pkg Parcel) {
		pkg.Weight += 0.1 // add stamp weight
		fmt.Printf("  Inside (value): %.1f kg\n", pkg.Weight)
	}

	// Pointer — modifies original
	stampPointer := func(pkg *Parcel) {
		pkg.Weight += 0.1
		fmt.Printf("  Inside (pointer): %.1f kg\n", pkg.Weight)
	}

	pkg := Parcel{Recipient: "Lakhan", Weight: 2.0}

	stampValue(pkg)
	// Output:   Inside (value): 2.1 kg
	fmt.Printf("  After value func: %.1f kg\n", pkg.Weight)
	// Output:   After value func: 2.0 kg

	stampPointer(&pkg)
	// Output:   Inside (pointer): 2.1 kg
	fmt.Printf("  After pointer func: %.1f kg\n", pkg.Weight)
	// Output:   After pointer func: 2.1 kg

	// ────────────────────────────────────────────────────────────
	// 2.4 — Pointer Receivers on Methods
	// ────────────────────────────────────────────────────────────
	// WHY: Methods with pointer receivers can modify the struct.
	// Go auto-takes the address when calling on an addressable value.

	fmt.Println("\n--- Pointer Receivers ---")
	type Letterbox struct {
		Chithis []string
	}

	// Simulating methods via closures (types in main can't have methods)
	addChithi := func(lb *Letterbox, chithi string) {
		lb.Chithis = append(lb.Chithis, chithi)
	}

	count := func(lb Letterbox) int {
		return len(lb.Chithis)
	}

	lb := Letterbox{}
	addChithi(&lb, "Bijli ka bill")
	addChithi(&lb, "Janamdin ka card")
	addChithi(&lb, "Income tax notice")

	fmt.Printf("Letterbox has %d chithis: %v\n", count(lb), lb.Chithis)
	// Output: Letterbox has 3 chithis: [Bijli ka bill Janamdin ka card Income tax notice]

	// ────────────────────────────────────────────────────────────
	// 2.5 — Returning Pointers from Functions
	// ────────────────────────────────────────────────────────────
	// WHY: In Go, it's safe to return a pointer to a local variable.
	// The compiler detects this and allocates on the heap (escape analysis).

	fmt.Println("\n--- Returning Pointers ---")
	createChithi := func(from, to string) *Chithi {
		l := Chithi{From: from, To: to, Content: "Default sandesh"}
		return &l // safe! Go's escape analysis moves l to heap
	}

	newChithi := createChithi("Lakhan", "Post Office")
	fmt.Printf("Created chithi: from=%s to=%s\n", newChithi.From, newChithi.To)
	// Output: Created chithi: from=Lakhan to=Post Office
	// WHY: Unlike C, this is NOT a dangling pointer — Go manages it.

	// ────────────────────────────────────────────────────────────
	// 2.6 — Pointer to Pointer (Rare but Valid)
	// ────────────────────────────────────────────────────────────

	fmt.Println("\n--- Pointer to Pointer ---")
	base := 5
	p1 := &base
	pp := &p1 // **int — pointer to pointer to int

	fmt.Println("base:", base)
	// Output: base: 5
	fmt.Println("*p1:", *p1)
	// Output: *p1: 5
	fmt.Println("**pp:", **pp)
	// Output: **pp: 5

	**pp = 999
	fmt.Println("After **pp = 999, base:", base)
	// Output: After **pp = 999, base: 999
	// WHY: Rarely needed — usually one level of indirection suffices.

	// ────────────────────────────────────────────────────────────
	// 2.7 — When to Use Pointers (Decision Guide)
	// ────────────────────────────────────────────────────────────

	fmt.Println("\n--- When to Use Pointers ---")
	fmt.Println("USE pointers when:")
	fmt.Println("  1. The function needs to MODIFY the original value")
	fmt.Println("  2. The struct is LARGE (avoids expensive copying)")
	fmt.Println("  3. You need to represent ABSENCE (nil = not set)")
	fmt.Println("  4. Implementing certain interfaces requires pointer receiver")
	fmt.Println("")
	fmt.Println("Use VALUES when:")
	fmt.Println("  1. The data is SMALL (int, bool, small structs)")
	fmt.Println("  2. You want IMMUTABILITY (no side effects)")
	fmt.Println("  3. The type needs to be a MAP KEY (must be comparable)")
	fmt.Println("  4. Concurrent access without mutex (copies are safe)")

	// ────────────────────────────────────────────────────────────
	// 2.8 — Common Pattern: Optional Values with Pointers
	// ────────────────────────────────────────────────────────────
	// WHY: Go has no Optional/Maybe type. A pointer can represent
	// "value present" (*T) vs "absent" (nil).

	fmt.Println("\n--- Optional Values Pattern ---")
	type Config struct {
		Host    string
		Port    int
		Timeout *int // nil means "use default"
	}

	printConfig := func(c Config) {
		timeout := 30 // default
		if c.Timeout != nil {
			timeout = *c.Timeout
		}
		fmt.Printf("  %s:%d timeout=%ds\n", c.Host, c.Port, timeout)
	}

	customTimeout := 60
	c1 := Config{Host: "indiapost.gov.in", Port: 443, Timeout: &customTimeout}
	c2 := Config{Host: "localhost", Port: 8080, Timeout: nil}

	printConfig(c1)
	// Output:   indiapost.gov.in:443 timeout=60s
	printConfig(c2)
	// Output:   localhost:8080 timeout=30s
	// WHY: nil Timeout means "use default" — a clean pattern.

	// ============================================================
	// KEY TAKEAWAYS
	// ============================================================
	// 1. & gets the address, * dereferences (reads/writes the value).
	// 2. Go is always pass-by-value; pointers let you share data.
	// 3. new(T) allocates zeroed memory; &T{} is more idiomatic.
	// 4. Nil pointer dereference causes panic — always check first.
	// 5. Go auto-dereferences struct pointers: p.Field == (*p).Field.
	// 6. No pointer arithmetic — Go is memory-safe by design.
	// 7. Returning &localVar is safe — escape analysis handles it.
	// 8. Use pointers for mutation, large structs, and optional values.
	//    Use values for small data, immutability, and map keys.
}
