// ============================================================
//  FILE 8 : Structs
// ============================================================
//  Topic  : Struct declaration, initialization patterns, field
//           access, zero values, methods (value vs pointer
//           receiver), constructor pattern, anonymous structs,
//           struct as map keys, tags preview.
//
//  WHY THIS MATTERS:
//  Structs are Go's primary way to group related data — they
//  replace classes from OOP languages. Combined with methods,
//  they give you encapsulation and behavior without inheritance
//  complexity. Understanding value vs pointer receivers is
//  essential for writing correct, efficient Go code.
// ============================================================

// ============================================================
// STORY: The Vastu Shastra Room
// Architect Iyer draws house plans following Vastu principles.
// Every house starts as a plan (struct declaration), gets filled
// in with specifics (initialization), and can be modified through
// approved procedures (methods). He learns that some changes
// need the original document (pointer receiver) while others
// can work with a photocopy (value receiver).
// ============================================================

package main

import (
	"fmt"
	"math"
)

// ────────────────────────────────────────────────────────────
// Package-level types (needed for method declarations)
// ────────────────────────────────────────────────────────────

// Circle — used to demonstrate value receiver methods
type Circle struct {
	Radius float64
}

// Area returns the area — value receiver (works on a copy)
func (c Circle) Area() float64 {
	return math.Pi * c.Radius * c.Radius
}

// Circumference — another value receiver method
func (c Circle) Circumference() float64 {
	return 2 * math.Pi * c.Radius
}

// Room — used to demonstrate pointer receiver methods
type Room struct {
	Width  float64
	Height float64
}

// Area — value receiver (read-only)
func (r Room) Area() float64 {
	return r.Width * r.Height
}

// Scale — pointer receiver (modifies original)
func (r *Room) Scale(factor float64) {
	r.Width *= factor
	r.Height *= factor
}

// Counter — used to demonstrate method set rules
type Counter struct {
	count int
}

// GetCount — value receiver
func (c Counter) GetCount() int {
	return c.count
}

// Increment — pointer receiver
func (c *Counter) Increment() {
	c.count++
}

func main() {

	// ──────────────────────────────────────────────────────────────
	// EXAMPLE BLOCK 1 — Declaration, Initialization, Field Access,
	//                    Zero Values, Comparison
	// ──────────────────────────────────────────────────────────────

	// ────────────────────────────────────────────────────────────
	// 1.1 — Struct Declaration
	// ────────────────────────────────────────────────────────────
	// WHY: Structs group related fields into a single type.
	// They are value types (copied on assignment).

	type House struct {
		Name    string
		Floors  int
		Height  float64 // meters
		HasPooja bool
	}

	// ────────────────────────────────────────────────────────────
	// 1.2 — Initialization Patterns
	// ────────────────────────────────────────────────────────────

	fmt.Println("--- Initialization Patterns ---")

	// Named field initialization (preferred — order doesn't matter)
	bungalow := House{
		Name:     "Shanti Nivas",
		Floors:   2,
		Height:   7.5,
		HasPooja: true,
	}
	fmt.Println("Named init:", bungalow)
	// Output: Named init: {Shanti Nivas 2 7.5 true}

	// Positional initialization (fragile — order must match)
	villa := House{"Tulsi Villa", 3, 12.0, true}
	fmt.Println("Positional:", villa)
	// Output: Positional: {Tulsi Villa 3 12 true}
	// WHY: Avoid positional — adding a field later breaks all call sites.

	// Partial initialization (unset fields get zero values)
	storeroom := House{Name: "Store Room", Floors: 1}
	fmt.Println("Partial:", storeroom)
	// Output: Partial: {Store Room 1 0 false}

	// ────────────────────────────────────────────────────────────
	// 1.3 — Zero-Value Struct
	// ────────────────────────────────────────────────────────────
	// WHY: Go always initializes to zero values — no null surprises.

	fmt.Println("\n--- Zero Value Struct ---")
	var empty House
	fmt.Println("Zero struct:", empty)
	// Output: Zero struct: { 0 0 false}
	fmt.Printf("Name=%q Floors=%d Height=%.1f HasPooja=%t\n",
		empty.Name, empty.Floors, empty.Height, empty.HasPooja)
	// Output: Name="" Floors=0 Height=0.0 HasPooja=false

	// ────────────────────────────────────────────────────────────
	// 1.4 — Field Access and Modification
	// ────────────────────────────────────────────────────────────

	fmt.Println("\n--- Field Access ---")
	fmt.Println("Bungalow name:", bungalow.Name)
	// Output: Bungalow name: Shanti Nivas
	fmt.Println("Bungalow floors:", bungalow.Floors)
	// Output: Bungalow floors: 2

	// Modify fields directly
	bungalow.Floors = 3
	fmt.Println("Updated floors:", bungalow.Floors)
	// Output: Updated floors: 3

	// ────────────────────────────────────────────────────────────
	// 1.5 — Structs Are Value Types (Copied on Assignment)
	// ────────────────────────────────────────────────────────────
	// WHY: Unlike maps and slices, structs are fully copied.

	fmt.Println("\n--- Value Semantics ---")
	original := House{Name: "Original", Floors: 10}
	copy1 := original
	copy1.Name = "Copy"
	fmt.Println("Original:", original.Name)
	// Output: Original: Original
	fmt.Println("Copy:", copy1.Name)
	// Output: Copy: Copy
	// WHY: Modifying the copy does NOT affect the original.

	// ────────────────────────────────────────────────────────────
	// 1.6 — Struct Comparison
	// ────────────────────────────────────────────────────────────
	// WHY: Structs are comparable if ALL fields are comparable.
	// (No slices, maps, or functions as fields.)

	fmt.Println("\n--- Struct Comparison ---")
	a := House{Name: "Kutir", Floors: 10}
	b := House{Name: "Kutir", Floors: 10}
	c := House{Name: "Kutir", Floors: 20}

	fmt.Println("a == b:", a == b)
	// Output: a == b: true
	fmt.Println("a == c:", a == c)
	// Output: a == c: false

	// ──────────────────────────────────────────────────────────────
	// EXAMPLE BLOCK 2 — Methods (Value vs Pointer Receiver),
	//                    Constructor Pattern, Method Sets
	// ──────────────────────────────────────────────────────────────

	// ────────────────────────────────────────────────────────────
	// 2.1 — Value Receiver Methods
	// ────────────────────────────────────────────────────────────
	// WHY: Value receivers work on a COPY of the struct.
	// They cannot modify the original. (Circle and its methods
	// are defined at package level above.)

	fmt.Println("\n--- Value Receiver ---")
	c1 := Circle{Radius: 5.0}
	fmt.Printf("Circle radius=%.1f area=%.2f circumference=%.2f\n",
		c1.Radius, c1.Area(), c1.Circumference())
	// Output: Circle radius=5.0 area=78.54 circumference=31.42

	// ────────────────────────────────────────────────────────────
	// 2.2 — Pointer Receiver Methods
	// ────────────────────────────────────────────────────────────
	// WHY: Pointer receivers can MODIFY the original struct.
	// Use them when the method needs to mutate state or the
	// struct is large (avoids copying).
	// (Room and Scale are defined at package level above.)

	fmt.Println("\n--- Pointer Receiver ---")
	poojaRoom := Room{Width: 10, Height: 5}
	fmt.Println("Before scale:", poojaRoom)
	// Output: Before scale: {10 5}

	poojaRoom.Scale(2.0)
	fmt.Println("After Scale(2):", poojaRoom)
	// Output: After Scale(2): {20 10}
	// WHY: The original poojaRoom was modified because Scale uses a pointer receiver.

	fmt.Printf("Area after scaling: %.0f\n", poojaRoom.Area())
	// Output: Area after scaling: 200

	// ────────────────────────────────────────────────────────────
	// 2.3 — Constructor Pattern (NewXxx functions)
	// ────────────────────────────────────────────────────────────
	// WHY: Go has no constructors. By convention, use NewXxx
	// functions that return a validated struct (often a pointer).

	type Server struct {
		Host string
		Port int
	}

	newServer := func(host string, port int) *Server {
		if host == "" {
			host = "localhost"
		}
		if port <= 0 || port > 65535 {
			port = 8080
		}
		return &Server{Host: host, Port: port}
	}

	fmt.Println("\n--- Constructor Pattern ---")
	s1 := newServer("api.gov.in", 443)
	fmt.Printf("Server 1: %s:%d\n", s1.Host, s1.Port)
	// Output: Server 1: api.gov.in:443

	s2 := newServer("", -1)
	fmt.Printf("Server 2: %s:%d\n", s2.Host, s2.Port)
	// Output: Server 2: localhost:8080
	// WHY: Constructor applies defaults and validation.

	// ────────────────────────────────────────────────────────────
	// 2.4 — Method Sets: Value vs Pointer
	// ────────────────────────────────────────────────────────────
	// WHY: Understanding which methods are available matters
	// for interface satisfaction (covered in file 10).
	//
	// Rule:
	//   Value receiver methods  → callable on BOTH value and pointer
	//   Pointer receiver methods → callable ONLY on pointer (or addressable value)
	// (Counter type and methods are defined at package level above.)

	fmt.Println("\n--- Method Set Rules ---")
	ctr := Counter{count: 0}
	ctr.Increment() // Go auto-takes address for pointer receiver
	ctr.Increment()
	ctr.Increment()
	fmt.Println("Count after 3 increments:", ctr.GetCount())
	// Output: Count after 3 increments: 3

	// Value receiver callable on pointer too
	pCtr := &ctr
	fmt.Println("Via pointer, GetCount:", pCtr.GetCount())
	// Output: Via pointer, GetCount: 3

	// ──────────────────────────────────────────────────────────────
	// EXAMPLE BLOCK 3 — Anonymous Structs, Struct Literals, Struct
	//                    as Map Keys, Tags Preview
	// ──────────────────────────────────────────────────────────────

	// ────────────────────────────────────────────────────────────
	// 3.1 — Anonymous Structs
	// ────────────────────────────────────────────────────────────
	// WHY: Handy for one-off data groupings — no need to declare
	// a named type. Common in tests and JSON decoding.

	fmt.Println("\n--- Anonymous Structs ---")
	point := struct {
		X, Y int
	}{X: 10, Y: 20}

	fmt.Printf("Anonymous struct: (%d, %d)\n", point.X, point.Y)
	// Output: Anonymous struct: (10, 20)

	// Anonymous struct in a slice (great for test cases)
	tests := []struct {
		input    string
		expected int
	}{
		{"hello", 5},
		{"Go", 2},
		{"", 0},
	}
	fmt.Println("\nTest cases:")
	for _, tc := range tests {
		fmt.Printf("  len(%q) = %d, expected %d, pass=%t\n",
			tc.input, len(tc.input), tc.expected, len(tc.input) == tc.expected)
	}
	// Output:
	//   len("hello") = 5, expected 5, pass=true
	//   len("Go") = 2, expected 2, pass=true
	//   len("") = 0, expected 0, pass=true

	// ────────────────────────────────────────────────────────────
	// 3.2 — Struct Embedding (Preview)
	// ────────────────────────────────────────────────────────────
	// WHY: Embedding promotes fields and methods of the inner
	// struct — Go's version of composition over inheritance.

	type Address struct {
		Street string
		City   string
	}

	type Office struct {
		Address         // embedded — no field name
		Company string
	}

	fmt.Println("\n--- Struct Embedding ---")
	office := Office{
		Address: Address{Street: "14 Vastu Marg", City: "Chennai"},
		Company: "Iyer & Associates",
	}
	// Promoted fields — access directly
	fmt.Println("Street:", office.Street)
	// Output: Street: 14 Vastu Marg
	fmt.Println("City:", office.City)
	// Output: City: Chennai
	fmt.Println("Company:", office.Company)
	// Output: Company: Iyer & Associates

	// ────────────────────────────────────────────────────────────
	// 3.3 — Struct as Map Key
	// ────────────────────────────────────────────────────────────
	// WHY: Comparable structs can be map keys — great for
	// composite keys without string concatenation.

	fmt.Println("\n--- Struct as Map Key ---")
	type Coord struct {
		X, Y int
	}

	grid := map[Coord]string{
		{0, 0}: "pooja room",
		{1, 0}: "kitchen",
		{0, 1}: "drawing room",
	}

	fmt.Println("Grid[0,0]:", grid[Coord{0, 0}])
	// Output: Grid[0,0]: pooja room
	fmt.Println("Grid[1,0]:", grid[Coord{1, 0}])
	// Output: Grid[1,0]: kitchen

	// ────────────────────────────────────────────────────────────
	// 3.4 — Struct Tags (Preview)
	// ────────────────────────────────────────────────────────────
	// WHY: Tags attach metadata to fields — used by encoding/json,
	// database ORMs, validators. Full coverage in file 22.

	type Resident struct {
		Name  string `json:"name"`
		Email string `json:"email"`
		Age   int    `json:"age,omitempty"`
	}

	fmt.Println("\n--- Struct Tags Preview ---")
	u := Resident{Name: "Iyer", Email: "iyer@vastu.in", Age: 55}
	fmt.Printf("Resident: %+v\n", u)
	// Output: Resident: {Name:Iyer Email:iyer@vastu.in Age:55}
	// WHY: %+v prints field names — very useful for debugging.
	// The json tags control how this struct serializes to JSON.

	// ────────────────────────────────────────────────────────────
	// 3.5 — Putting It All Together: A Mini Project
	// ────────────────────────────────────────────────────────────

	fmt.Println("\n--- Mini Project: Vastu House Registry ---")
	type VastuPlan struct {
		Name     string
		Location Coord
		Rooms    int
		Budget   float64
	}

	plans := []VastuPlan{
		{Name: "Shanti Kutir", Location: Coord{10, 20}, Rooms: 5, Budget: 50_00_000},
		{Name: "Anand Bhavan", Location: Coord{5, 15}, Rooms: 8, Budget: 1_20_00_000},
		{Name: "Lakshmi Nivas", Location: Coord{30, 5}, Rooms: 4, Budget: 35_00_000},
	}

	totalBudget := 0.0
	for _, p := range plans {
		fmt.Printf("  %s at (%d,%d) — %d rooms, ₹%.0f\n",
			p.Name, p.Location.X, p.Location.Y, p.Rooms, p.Budget)
		totalBudget += p.Budget
	}
	fmt.Printf("  Total budget: ₹%.0f\n", totalBudget)
	// Output:
	//   Shanti Kutir at (10,20) — 5 rooms, ₹5000000
	//   Anand Bhavan at (5,15) — 8 rooms, ₹12000000
	//   Lakshmi Nivas at (30,5) — 4 rooms, ₹3500000
	//   Total budget: ₹20500000

	// ============================================================
	// KEY TAKEAWAYS
	// ============================================================
	// 1. Structs are value types — assignment copies all fields.
	// 2. Use named field initialization; avoid positional (fragile).
	// 3. Zero-value structs are always valid — "" for strings,
	//    0 for numbers, false for booleans.
	// 4. Value receiver = works on copy, cannot mutate original.
	//    Pointer receiver = works on original, can mutate.
	// 5. Use NewXxx constructor functions for validation/defaults.
	// 6. Anonymous structs are great for one-off groupings & tests.
	// 7. Struct embedding promotes inner fields/methods (composition).
	// 8. Comparable structs can be map keys — handy for composite keys.
	// 9. Struct tags attach metadata for serialization (json, xml, db).
}
