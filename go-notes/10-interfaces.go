// ============================================================
//  FILE 10 : Interfaces
// ============================================================
//  Topic  : Implicit implementation, interface declaration,
//           method sets, empty interface (any), type assertions,
//           type switches, common stdlib interfaces, interface
//           composition, nil interface trap.
//
//  WHY THIS MATTERS:
//  Interfaces are Go's core abstraction mechanism. Unlike Java
//  or C#, Go interfaces are satisfied IMPLICITLY — no
//  "implements" keyword. This enables powerful decoupling and
//  polymorphism while keeping code simple. Understanding
//  interfaces is the gateway to idiomatic Go.
// ============================================================

// ============================================================
// STORY: Jugaad Universal Charger
// Electrician Pappu builds jugaad chargers at his workshop.
// Every Indian appliance has different plugs, but Pappu designs
// universal connectors (interfaces) that work with ANY appliance
// that has the right shape — no registration required. If it
// fits, it works.
// ============================================================

package main

import (
	"fmt"
	"io"
	"math"
	"strings"
)

// ────────────────────────────────────────────────────────────
// Type declarations (must be at package level for methods)
// ────────────────────────────────────────────────────────────

// --- Block 1 types ---

type Shape interface {
	Area() float64
	Perimeter() float64
}

type Rect struct {
	Width, Height float64
}

func (r Rect) Area() float64 {
	return r.Width * r.Height
}

func (r Rect) Perimeter() float64 {
	return 2 * (r.Width + r.Height)
}

type Circle struct {
	Radius float64
}

func (c Circle) Area() float64 {
	return math.Pi * c.Radius * c.Radius
}

func (c Circle) Perimeter() float64 {
	return 2 * math.Pi * c.Radius
}

type Triangle struct {
	A, B, C float64 // side lengths
}

func (t Triangle) Area() float64 {
	s := (t.A + t.B + t.C) / 2
	return math.Sqrt(s * (s - t.A) * (s - t.B) * (s - t.C))
}

func (t Triangle) Perimeter() float64 {
	return t.A + t.B + t.C
}

// --- Block 2 types ---

type Appliance struct {
	Name  string
	Watts int
}

func (a Appliance) String() string {
	return fmt.Sprintf("%s (%dW)", a.Name, a.Watts)
}

type AppError struct {
	Code    int
	Message string
}

func (e *AppError) Error() string {
	return fmt.Sprintf("error %d: %s", e.Code, e.Message)
}

// --- Block 3 types ---

type Reader interface {
	Read() string
}

type Writer interface {
	Write(data string)
}

type ReadWriter interface {
	Reader
	Writer
}

type FileDevice struct {
	name    string
	content string
}

func (f *FileDevice) Read() string {
	return f.content
}

func (f *FileDevice) Write(data string) {
	f.content += data
}

// Animal for nil interface demo
type Animal interface {
	Speak() string
}

type Dog struct {
	Name string
}

func (d *Dog) Speak() string {
	return d.Name + " says: Woof!"
}

func main() {

	// ──────────────────────────────────────────────────────────────
	// EXAMPLE BLOCK 1 — Declaring Interfaces, Implicit Implementation,
	//                    Polymorphism Demo
	// ──────────────────────────────────────────────────────────────

	// ────────────────────────────────────────────────────────────
	// 1.1 — Interface Declaration
	// ────────────────────────────────────────────────────────────
	// WHY: An interface defines a set of method signatures.
	// Any type that implements ALL methods satisfies the interface
	// AUTOMATICALLY — no "implements" keyword needed.

	fmt.Println("--- Interface Declaration ---")
	fmt.Println("Shape interface requires: Area() float64, Perimeter() float64")

	// ────────────────────────────────────────────────────────────
	// 1.2 — Implicit Implementation
	// ────────────────────────────────────────────────────────────
	// WHY: Rect, Circle, and Triangle all implement Shape
	// without declaring it. If it has the methods, it fits.

	fmt.Println("\n--- Implicit Implementation ---")
	r := Rect{Width: 10, Height: 5}
	c := Circle{Radius: 7}
	t := Triangle{A: 3, B: 4, C: 5}

	// All three satisfy Shape — no "implements" needed
	var s Shape

	s = r
	fmt.Printf("Rect:     area=%.2f perimeter=%.2f\n", s.Area(), s.Perimeter())
	// Output: Rect:     area=50.00 perimeter=30.00

	s = c
	fmt.Printf("Circle:   area=%.2f perimeter=%.2f\n", s.Area(), s.Perimeter())
	// Output: Circle:   area=153.94 perimeter=43.98

	s = t
	fmt.Printf("Triangle: area=%.2f perimeter=%.2f\n", s.Area(), s.Perimeter())
	// Output: Triangle: area=6.00 perimeter=12.00

	// ────────────────────────────────────────────────────────────
	// 1.3 — Polymorphism Demo
	// ────────────────────────────────────────────────────────────
	// WHY: Functions accepting interfaces work with ANY type
	// that satisfies them — this is polymorphism in Go.

	fmt.Println("\n--- Polymorphism ---")
	printShapeInfo := func(name string, s Shape) {
		fmt.Printf("  %s — area=%.2f perimeter=%.2f\n", name, s.Area(), s.Perimeter())
	}

	shapes := []Shape{
		Rect{Width: 3, Height: 4},
		Circle{Radius: 5},
		Triangle{A: 5, B: 12, C: 13},
	}

	for _, sh := range shapes {
		switch v := sh.(type) {
		case Rect:
			printShapeInfo("Rectangle", v)
		case Circle:
			printShapeInfo("Circle", v)
		case Triangle:
			printShapeInfo("Triangle", v)
		}
	}
	// Output:
	//   Rectangle — area=12.00 perimeter=14.00
	//   Circle — area=78.54 perimeter=31.42
	//   Triangle — area=30.00 perimeter=30.00

	// Total area of all shapes
	totalArea := 0.0
	for _, sh := range shapes {
		totalArea += sh.Area()
	}
	fmt.Printf("  Total area: %.2f\n", totalArea)
	// Output:   Total area: 120.54

	// ──────────────────────────────────────────────────────────────
	// EXAMPLE BLOCK 2 — Type Assertions, Type Switches, Empty
	//                    Interface, Common Stdlib Interfaces
	// ──────────────────────────────────────────────────────────────

	// ────────────────────────────────────────────────────────────
	// 2.1 — Empty Interface: any (alias for interface{})
	// ────────────────────────────────────────────────────────────
	// WHY: any can hold ANY value — it has zero method requirements.
	// Used when you don't know the type at compile time.

	fmt.Println("\n--- Empty Interface (any) ---")
	var box any

	box = 42
	fmt.Printf("int:    %v (type: %T)\n", box, box)
	// Output: int:    42 (type: int)

	box = "hello"
	fmt.Printf("string: %v (type: %T)\n", box, box)
	// Output: string: hello (type: string)

	box = []int{1, 2, 3}
	fmt.Printf("slice:  %v (type: %T)\n", box, box)
	// Output: slice:  [1 2 3] (type: []int)

	// Slice of any — heterogeneous collection
	mixed := []any{42, "Go", true, 3.14, nil}
	fmt.Println("Mixed slice:", mixed)
	// Output: Mixed slice: [42 Go true 3.14 <nil>]

	// ────────────────────────────────────────────────────────────
	// 2.2 — Type Assertions: value.(Type)
	// ────────────────────────────────────────────────────────────
	// WHY: To extract the concrete type from an interface value.
	// The comma-ok pattern prevents panics on wrong types.

	fmt.Println("\n--- Type Assertions ---")
	var item any = "Pappu's jugaad charger"

	// Direct assertion (panics if wrong type!)
	str := item.(string)
	fmt.Println("Direct assertion:", str)
	// Output: Direct assertion: Pappu's jugaad charger

	// Comma-ok pattern (safe — no panic)
	strVal, ok := item.(string)
	fmt.Printf("String? ok=%t value=%q\n", ok, strVal)
	// Output: String? ok=true value="Pappu's jugaad charger"

	intVal, ok := item.(int)
	fmt.Printf("Int? ok=%t value=%d\n", ok, intVal)
	// Output: Int? ok=false value=0
	// WHY: When ok is false, intVal gets the zero value of int.

	// ────────────────────────────────────────────────────────────
	// 2.3 — Type Switches
	// ────────────────────────────────────────────────────────────
	// WHY: Type switches cleanly handle multiple possible types.
	// Much better than chains of type assertions.

	fmt.Println("\n--- Type Switches ---")
	describeType := func(val any) string {
		switch v := val.(type) {
		case int:
			return fmt.Sprintf("integer: %d", v)
		case float64:
			return fmt.Sprintf("float: %.2f", v)
		case string:
			return fmt.Sprintf("string: %q (len=%d)", v, len(v))
		case bool:
			return fmt.Sprintf("boolean: %t", v)
		case nil:
			return "nil value"
		default:
			return fmt.Sprintf("unknown type: %T", v)
		}
	}

	testValues := []any{42, 3.14, "Go", true, nil, []int{1}}
	for _, v := range testValues {
		fmt.Printf("  %v → %s\n", v, describeType(v))
	}
	// Output:
	//   42 → integer: 42
	//   3.14 → float: 3.14
	//   Go → string: "Go" (len=2)
	//   true → boolean: true
	//   <nil> → nil value
	//   [1] → unknown type: []int

	// ────────────────────────────────────────────────────────────
	// 2.4 — Common Interface: fmt.Stringer
	// ────────────────────────────────────────────────────────────
	// WHY: fmt.Stringer has one method: String() string.
	// Implement it to control how your type prints.

	fmt.Println("\n--- fmt.Stringer ---")
	a := Appliance{Name: "Desert Cooler", Watts: 150}
	fmt.Println("Appliance:", a)
	// Output: Appliance: Desert Cooler (150W)
	// WHY: fmt.Println calls a.String() automatically.

	// ────────────────────────────────────────────────────────────
	// 2.5 — Common Interface: error
	// ────────────────────────────────────────────────────────────
	// WHY: The error interface has one method: Error() string.
	// Custom error types give you structured error information.

	fmt.Println("\n--- error Interface ---")
	appErr := &AppError{Code: 404, Message: "appliance not found"}
	fmt.Println("Error:", appErr.Error())
	// Output: Error: error 404: appliance not found

	// Satisfies the error interface
	var err error = appErr
	fmt.Println("As error:", err)
	// Output: As error: error 404: appliance not found

	// ──────────────────────────────────────────────────────────────
	// EXAMPLE BLOCK 3 — Interface Composition, Nil Interface Trap,
	//                    Best Practices, io.Reader/Writer Demo
	// ──────────────────────────────────────────────────────────────

	// ────────────────────────────────────────────────────────────
	// 3.1 — Interface Composition (Embedding Interfaces)
	// ────────────────────────────────────────────────────────────
	// WHY: Small interfaces compose into larger ones.
	// This follows Go's philosophy: "Accept interfaces, return structs."

	fmt.Println("\n--- Interface Composition ---")
	file := &FileDevice{name: "config.txt", content: ""}
	file.Write("host=localhost\n")
	file.Write("port=8080\n")

	// FileDevice satisfies Reader, Writer, AND ReadWriter
	var rw ReadWriter = file
	fmt.Println("ReadWriter content:", rw.Read())
	// Output: ReadWriter content: host=localhost
	//         port=8080

	// You can assign ReadWriter to Reader or Writer
	var reader Reader = rw
	fmt.Println("As Reader:", reader.Read())

	// ────────────────────────────────────────────────────────────
	// 3.2 — The Nil Interface Trap
	// ────────────────────────────────────────────────────────────
	// WHY: A nil interface and an interface holding a nil concrete
	// value are DIFFERENT. This is Go's most confusing pitfall.

	fmt.Println("\n--- Nil Interface Trap ---")

	// Case 1: truly nil interface
	var a1 Animal // nil interface — both type and value are nil
	fmt.Println("Nil interface == nil?", a1 == nil)
	// Output: Nil interface == nil? true

	// Case 2: interface holding a nil pointer
	var dogPtr *Dog   // nil pointer of type *Dog
	var a2 Animal = dogPtr // interface has type *Dog but value nil
	fmt.Println("Interface with nil value == nil?", a2 == nil)
	// Output: Interface with nil value == nil? false
	// WHY: a2 has type information (*Dog), so it's NOT nil!
	// This is the trap — always check the concrete value.

	fmt.Println("\nExplanation:")
	fmt.Println("  Interface = (type, value)")
	fmt.Printf("  a1 = (%v, %v) → nil interface\n", nil, nil)
	fmt.Printf("  a2 = (*Dog, nil) → NOT nil! Has type info\n")
	fmt.Println("  Lesson: Never assign a typed nil to an interface")

	// ────────────────────────────────────────────────────────────
	// 3.3 — io.Reader and io.Writer Demo
	// ────────────────────────────────────────────────────────────
	// WHY: io.Reader and io.Writer are Go's most important interfaces.
	// Files, HTTP bodies, network connections all implement them.

	fmt.Println("\n--- io.Reader / io.Writer ---")

	// strings.NewReader creates an io.Reader from a string
	sr := strings.NewReader("Namaste from Pappu's workshop!")

	// Read into a byte buffer
	buf := make([]byte, 8)
	fmt.Println("Reading 8 bytes at a time:")
	for {
		n, readErr := sr.Read(buf)
		if n > 0 {
			fmt.Printf("  Read %d bytes: %q\n", n, string(buf[:n]))
		}
		if readErr == io.EOF {
			break
		}
		if readErr != nil {
			fmt.Println("  Error:", readErr)
			break
		}
	}
	// Output:
	//   Reading 8 bytes at a time:
	//   Read 8 bytes: "Namaste "
	//   Read 8 bytes: "from Pap"
	//   Read 8 bytes: "pu's wor"
	//   Read 6 bytes: "kshop!"
	// (exact chunking may vary by implementation)

	// strings.Builder implements io.Writer
	var writer strings.Builder
	fmt.Fprintf(&writer, "Appliance: %s, Status: %s", "Inverter-X", "Chalu")
	fmt.Println("\nBuilder output:", writer.String())
	// Output: Builder output: Appliance: Inverter-X, Status: Chalu

	// ────────────────────────────────────────────────────────────
	// 3.4 — Interface Best Practices
	// ────────────────────────────────────────────────────────────

	fmt.Println("\n--- Interface Best Practices ---")
	fmt.Println("1. Keep interfaces SMALL (1-3 methods)")
	fmt.Println("   io.Reader has just Read([]byte) (int, error)")
	fmt.Println("2. Define interfaces WHERE THEY ARE USED, not where implemented")
	fmt.Println("3. Accept interfaces, return concrete types")
	fmt.Println("4. Don't create interfaces until you need abstraction")
	fmt.Println("5. Use composition to build larger interfaces from small ones")

	// ────────────────────────────────────────────────────────────
	// 3.5 — Interface Satisfaction Check (Compile-time)
	// ────────────────────────────────────────────────────────────
	// WHY: You can verify interface satisfaction at compile time
	// with a blank identifier assignment.

	fmt.Println("\n--- Compile-time Interface Check ---")
	// These lines verify at compile time that our types satisfy interfaces:
	var _ Shape = Rect{}
	var _ Shape = Circle{}
	var _ Shape = Triangle{}
	var _ fmt.Stringer = Appliance{}
	var _ error = &AppError{}
	var _ ReadWriter = &FileDevice{}
	fmt.Println("All interface satisfaction checks passed at compile time!")
	// Output: All interface satisfaction checks passed at compile time!

	// ============================================================
	// KEY TAKEAWAYS
	// ============================================================
	// 1. Interfaces are satisfied IMPLICITLY — if a type has the
	//    methods, it implements the interface. No keyword needed.
	// 2. The empty interface (any) accepts all types but requires
	//    type assertions to extract values.
	// 3. Use comma-ok type assertions to safely extract types.
	// 4. Type switches are cleaner than assertion chains.
	// 5. fmt.Stringer and error are the most commonly implemented
	//    interfaces — implement them for your custom types.
	// 6. Compose small interfaces into larger ones (Reader + Writer
	//    = ReadWriter).
	// 7. NIL TRAP: interface with nil value != nil interface.
	//    Never assign a typed nil pointer to an interface.
	// 8. io.Reader and io.Writer are everywhere — learn them well.
	// 9. Keep interfaces small, define them at the consumer site.
}
