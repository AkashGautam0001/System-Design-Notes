// ============================================================
//  FILE 1 : Hello World & Basics
// ============================================================
//  Topic  : package main, import, func main, fmt output,
//           variables, short declarations, constants, iota,
//           zero values, type inference
//
//  WHY THIS MATTERS:
//  Every Go program begins with these building blocks. Unlike
//  scripting languages, Go requires a main package and a main
//  function — the compiler enforces structure from day one.
//  Understanding variable declarations, constants, and zero
//  values prevents an entire class of "undefined" bugs that
//  plague other languages.
// ============================================================

// ============================================================
// STORY: The Chai Tapri Opens
// Ramesh bhaiya walks into his chai tapri for the first
// time each morning. Before serving anyone, Ramesh must label
// the vessels, set out the kettles and glasses, and establish
// the house rules. Every variable is a labeled vessel. Every
// constant is a price carved in stone. Zero values mean no
// glass is ever truly empty — Go always gives you a safe default.
// ============================================================

package main

import "fmt"

// ============================================================
// EXAMPLE BLOCK 1 — Hello World, Variables & Declarations
// ============================================================

// ──────────────────────────────────────────────────────────────
// SECTION 1 — Hello, World!
// ──────────────────────────────────────────────────────────────
// WHY: Every language journey starts here. In Go, you need
// package main + func main() to create a runnable program.

func main() {
	// --- 1a: The simplest Go program output ---
	fmt.Println("Hello, World!")
	// Output: Hello, World!

	fmt.Println("Ramesh bhaiya opens the chai tapri doors.")
	// Output: Ramesh bhaiya opens the chai tapri doors.

	// ──────────────────────────────────────────────────────────────
	// SECTION 2 — fmt.Println, fmt.Printf, fmt.Sprintf
	// ──────────────────────────────────────────────────────────────
	// WHY: Go's fmt package is your primary output tool.
	// Println adds a newline, Printf uses format verbs, and
	// Sprintf returns a formatted string without printing.

	name := "Ramesh"
	age := 45

	// Println — prints with spaces between arguments, newline at end
	fmt.Println("Chaiwala:", name, "| Age:", age)
	// Output: Chaiwala: Ramesh | Age: 45

	// Printf — format verbs: %s (string), %d (int), %v (any), %T (type)
	fmt.Printf("Name: %s, Age: %d\n", name, age)
	// Output: Name: Ramesh, Age: 45

	fmt.Printf("Value: %v, Type: %T\n", name, name)
	// Output: Value: Ramesh, Type: string

	// Sprintf — returns a string (does NOT print)
	greeting := fmt.Sprintf("Welcome to the chai tapri, %s!", name)
	fmt.Println(greeting)
	// Output: Welcome to the chai tapri, Ramesh!

	// ──────────────────────────────────────────────────────────────
	// SECTION 3 — Variables: var keyword
	// ──────────────────────────────────────────────────────────────
	// WHY: var declarations are explicit about type and can appear
	// at package level or inside functions. They always initialize
	// to the zero value if no value is given.

	var glassCount int      // zero value for int is 0
	var tapriName string    // zero value for string is ""
	var isOpen bool         // zero value for bool is false

	fmt.Printf("glassCount: %d, tapriName: %q, isOpen: %v\n",
		glassCount, tapriName, isOpen)
	// Output: glassCount: 0, tapriName: "", isOpen: false

	// var with initialization
	var kettleCount int = 15
	var teaLeaf string = "Assam CTC"
	fmt.Printf("Kettles: %d, Tea Leaf: %s\n", kettleCount, teaLeaf)
	// Output: Kettles: 15, Tea Leaf: Assam CTC

	// var with type inference (type determined from right-hand side)
	var temperature = 22.5 // inferred as float64
	fmt.Printf("Temperature: %.1f (type: %T)\n", temperature, temperature)
	// Output: Temperature: 22.5 (type: float64)

	// ──────────────────────────────────────────────────────────────
	// SECTION 4 — Short Declaration :=
	// ──────────────────────────────────────────────────────────────
	// WHY: := is Go's most common declaration inside functions.
	// It infers the type and is more concise than var. It can
	// ONLY be used inside functions, not at package level.

	orderName := "Festival Order"      // inferred string
	cups := 12                         // inferred int
	pricePerCup := 10.50               // inferred float64
	inProgress := true                 // inferred bool

	fmt.Printf("Order: %s, Cups: %d, Price: ₹%.2f, Active: %v\n",
		orderName, cups, pricePerCup, inProgress)
	// Output: Order: Festival Order, Cups: 12, Price: ₹10.50, Active: true

	// ──────────────────────────────────────────────────────────────
	// SECTION 5 — Multiple Assignment & Swapping
	// ──────────────────────────────────────────────────────────────
	// WHY: Go lets you declare/assign multiple variables in one
	// statement. Swapping without a temp variable is idiomatic.

	// Multiple declaration
	var width, height int = 120, 80
	fmt.Printf("Width: %d, Height: %d\n", width, height)
	// Output: Width: 120, Height: 80

	// Multiple short declaration
	x, y, label := 10, 20, "origin"
	fmt.Printf("x=%d, y=%d, label=%s\n", x, y, label)
	// Output: x=10, y=20, label=origin

	// Swapping — no temp variable needed!
	a, b := "left", "right"
	fmt.Printf("Before swap: a=%s, b=%s\n", a, b)
	// Output: Before swap: a=left, b=right

	a, b = b, a
	fmt.Printf("After swap:  a=%s, b=%s\n", a, b)
	// Output: After swap:  a=right, b=left

	// Grouped var block — useful for related variables
	var (
		tapriFloor  = "cement"
		tapriArea   = 200
		tapriRating = 4.8
	)
	fmt.Printf("Floor: %s, Area: %d sqft, Rating: %.1f\n",
		tapriFloor, tapriArea, tapriRating)
	// Output: Floor: cement, Area: 200 sqft, Rating: 4.8

	// ============================================================
	// EXAMPLE BLOCK 2 — Constants, Iota, Zero Values & Formatting
	// ============================================================

	// ──────────────────────────────────────────────────────────────
	// SECTION 6 — Constants
	// ──────────────────────────────────────────────────────────────
	// WHY: Constants are immutable values fixed at compile time.
	// They prevent accidental reassignment of values that should
	// never change (like pi, max retries, app version).

	const tapriMotto = "Pehle chai, phir kaam"
	const maxCapacity = 50
	const pi = 3.14159265

	fmt.Println("Motto:", tapriMotto)
	// Output: Motto: Pehle chai, phir kaam
	fmt.Printf("Max capacity: %d, Pi: %.4f\n", maxCapacity, pi)
	// Output: Max capacity: 50, Pi: 3.1416

	// Grouped constants
	const (
		appName    = "Tapri Manager"
		appVersion = "1.0.0"
		maxRetries = 3
	)
	fmt.Printf("%s v%s (max retries: %d)\n", appName, appVersion, maxRetries)
	// Output: Tapri Manager v1.0.0 (max retries: 3)

	// ──────────────────────────────────────────────────────────────
	// SECTION 7 — iota for Enumerations
	// ──────────────────────────────────────────────────────────────
	// WHY: iota auto-increments within a const block, starting at 0.
	// It's Go's way of creating enums without a dedicated keyword.

	// Days of the week
	fmt.Println("\n--- Days of the Week (iota) ---")
	fmt.Printf("Sunday=%d, Monday=%d, Tuesday=%d, Wednesday=%d\n",
		Sunday, Monday, Tuesday, Wednesday)
	// Output: Sunday=0, Monday=1, Tuesday=2, Wednesday=3
	fmt.Printf("Thursday=%d, Friday=%d, Saturday=%d\n",
		Thursday, Friday, Saturday)
	// Output: Thursday=4, Friday=5, Saturday=6

	// File permissions using iota with bit shifting
	fmt.Println("\n--- File Permissions (iota + bit shift) ---")
	fmt.Printf("Read:    %03b (%d)\n", Read, Read)
	// Output: Read:    100 (4)
	fmt.Printf("Write:   %03b (%d)\n", Write, Write)
	// Output: Write:   010 (2)
	fmt.Printf("Execute: %03b (%d)\n", Execute, Execute)
	// Output: Execute: 001 (1)

	// Combine permissions with bitwise OR
	readWrite := Read | Write
	fmt.Printf("Read+Write: %03b (%d)\n", readWrite, readWrite)
	// Output: Read+Write: 110 (6)

	allPerms := Read | Write | Execute
	fmt.Printf("All perms:  %03b (%d)\n", allPerms, allPerms)
	// Output: All perms:  111 (7)

	// ──────────────────────────────────────────────────────────────
	// SECTION 8 — Zero Values Demo
	// ──────────────────────────────────────────────────────────────
	// WHY: In Go, every variable has a zero value. There is no
	// "undefined" or "null" for basic types. This eliminates an
	// entire category of nil/undefined bugs common in other languages.

	fmt.Println("\n--- Zero Values for All Types ---")
	var zeroInt int
	var zeroFloat float64
	var zeroBool bool
	var zeroString string
	var zeroByte byte
	var zeroRune rune

	fmt.Printf("int:     %d\n", zeroInt)      // Output: int:     0
	fmt.Printf("float64: %f\n", zeroFloat)     // Output: float64: 0.000000
	fmt.Printf("bool:    %v\n", zeroBool)      // Output: bool:    false
	fmt.Printf("string:  %q\n", zeroString)    // Output: string:  ""
	fmt.Printf("byte:    %d\n", zeroByte)      // Output: byte:    0
	fmt.Printf("rune:    %d\n", zeroRune)      // Output: rune:    0

	// Reference type zero values (nil)
	var zeroSlice []int
	var zeroMap map[string]int
	var zeroPtr *int
	fmt.Printf("slice:   %v (nil? %v)\n", zeroSlice, zeroSlice == nil)
	// Output: slice:   [] (nil? true)
	fmt.Printf("map:     %v (nil? %v)\n", zeroMap, zeroMap == nil)
	// Output: map:     map[] (nil? true)
	fmt.Printf("pointer: %v (nil? %v)\n", zeroPtr, zeroPtr == nil)
	// Output: pointer: <nil> (nil? true)

	// ──────────────────────────────────────────────────────────────
	// SECTION 9 — Printf Formatting Cheat Sheet
	// ──────────────────────────────────────────────────────────────
	// WHY: Knowing format verbs saves debugging time and makes
	// output readable.

	fmt.Println("\n--- Printf Formatting ---")
	val := 42
	fmt.Printf("%%v  (default):    %v\n", val)    // Output: %v  (default):    42
	fmt.Printf("%%d  (decimal):    %d\n", val)    // Output: %d  (decimal):    42
	fmt.Printf("%%b  (binary):     %b\n", val)    // Output: %b  (binary):     101010
	fmt.Printf("%%o  (octal):      %o\n", val)    // Output: %o  (octal):      52
	fmt.Printf("%%x  (hex lower):  %x\n", val)    // Output: %x  (hex lower):  2a
	fmt.Printf("%%X  (hex upper):  %X\n", val)    // Output: %X  (hex upper):  2A
	fmt.Printf("%%e  (scientific): %e\n", 3.14)   // Output: %e  (scientific): 3.140000e+00
	fmt.Printf("%%f  (float):      %.2f\n", 3.14) // Output: %f  (float):      3.14
	fmt.Printf("%%s  (string):     %s\n", "Ramesh")  // Output: %s  (string):     Ramesh
	fmt.Printf("%%q  (quoted):     %q\n", "Ramesh")  // Output: %q  (quoted):     "Ramesh"
	fmt.Printf("%%T  (type):       %T\n", val)    // Output: %T  (type):       int
	fmt.Printf("%%p  (pointer):    %p\n", &val)   // Output: %p  (pointer):    0x... (memory address)

	// Padding and alignment
	fmt.Printf("%%10d  (right-pad): [%10d]\n", val) // Output: %10d  (right-pad): [        42]
	fmt.Printf("%%-10d (left-pad):  [%-10d]\n", val) // Output: %-10d (left-pad):  [42        ]
	fmt.Printf("%%010d (zero-pad):  [%010d]\n", val) // Output: %010d (zero-pad):  [0000000042]
}

// ──────────────────────────────────────────────────────────────
// Package-level constants (must be outside func main)
// ──────────────────────────────────────────────────────────────

// Days of the week — iota starts at 0, increments by 1
const (
	Sunday    = iota // 0
	Monday           // 1
	Tuesday          // 2
	Wednesday        // 3
	Thursday         // 4
	Friday           // 5
	Saturday         // 6
)

// File permissions — iota with bit shifting
const (
	Execute = 1 << iota // 1 << 0 = 1  (001)
	Write               // 1 << 1 = 2  (010)
	Read                // 1 << 2 = 4  (100)
)

// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. Every Go program needs `package main` and `func main()`.
//    The entry point is always main() in the main package.
//
// 2. fmt.Println adds newline automatically; fmt.Printf uses
//    format verbs (%s, %d, %v, %T); fmt.Sprintf returns a string.
//
// 3. `var` declares with explicit type; `:=` infers the type.
//    := can only be used inside functions.
//
// 4. Multiple assignment: a, b := 1, 2. Swap: a, b = b, a.
//    No temp variable needed.
//
// 5. Constants are fixed at compile time. Use const blocks
//    to group related constants.
//
// 6. `iota` auto-increments in const blocks — Go's enum pattern.
//    Combine with bit shifts for flags/permissions.
//
// 7. Every type in Go has a zero value: 0 for numbers, false for
//    bool, "" for string, nil for slices/maps/pointers.
//    There is no "undefined" in Go.
//
// 8. Ramesh bhaiya's tapri rule: "Label every vessel (variable),
//    carve prices in stone (constant), and trust that empty
//    glasses are zero — never undefined."
// ============================================================
