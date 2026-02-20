// ============================================================
//  FILE 2 : Types & Variables
// ============================================================
//  Topic  : Integer types (int, int8–int64, uint variants),
//           float32/float64, bool, string, byte, rune,
//           explicit type conversions, custom types, type
//           aliases, overflow behavior, comparison rules
//
//  WHY THIS MATTERS:
//  Go is statically typed with NO implicit conversions. You
//  cannot add an int32 to an int64 without explicitly casting.
//  This strictness catches bugs at compile time that other
//  languages only discover at runtime (or silently ignore).
//  Understanding the type system is foundational to writing
//  correct Go code.
// ============================================================

// ============================================================
// STORY: The Minting Press
// Press Operator Suresh works at the Reserve Bank's currency
// printing facility in Nashik where every mold must be exact.
// Feed a ₹500 plate into a ₹100 press? The machine refuses.
// Every denomination (type) has a specific plate (declaration),
// and converting between them requires Suresh's explicit
// approval. No shortcuts, no surprises — that's the press's code.
// ============================================================

package main

import (
	"fmt"
	"math"
	"strings"
	"unicode/utf8"
	"unsafe"
)

func main() {

	// ============================================================
	// EXAMPLE BLOCK 1 — Numeric Types, Conversions & Overflow
	// ============================================================

	// ──────────────────────────────────────────────────────────────
	// SECTION 1 — Integer Types: Signed
	// ──────────────────────────────────────────────────────────────
	// WHY: Go provides integers of specific sizes. Using the right
	// size matters for memory, performance, and interop (e.g., with
	// binary protocols or C libraries).

	var i8 int8 = 127           // -128 to 127
	var i16 int16 = 32767       // -32768 to 32767
	var i32 int32 = 2147483647  // -2^31 to 2^31 - 1
	var i64 int64 = 9223372036854775807 // -2^63 to 2^63 - 1

	fmt.Println("--- Signed Integer Types ---")
	fmt.Printf("int8:  %d  (size: %d byte,  range: %d to %d)\n",
		i8, unsafe.Sizeof(i8), math.MinInt8, math.MaxInt8)
	// Output: int8:  127  (size: 1 byte,  range: -128 to 127)

	fmt.Printf("int16: %d  (size: %d bytes, range: %d to %d)\n",
		i16, unsafe.Sizeof(i16), math.MinInt16, math.MaxInt16)
	// Output: int16: 32767  (size: 2 bytes, range: -32768 to 32767)

	fmt.Printf("int32: %d  (size: %d bytes, range: %d to %d)\n",
		i32, unsafe.Sizeof(i32), math.MinInt32, math.MaxInt32)
	// Output: int32: 2147483647  (size: 4 bytes, range: -2147483648 to 2147483647)

	fmt.Printf("int64: %d  (size: %d bytes)\n", i64, unsafe.Sizeof(i64))
	// Output: int64: 9223372036854775807  (size: 8 bytes)

	// `int` — platform-dependent: 64-bit on 64-bit systems, 32-bit on 32-bit
	var platformInt int = 42
	fmt.Printf("int:   %d  (size: %d bytes on this platform)\n",
		platformInt, unsafe.Sizeof(platformInt))
	// Output: int:   42  (size: 8 bytes on this platform)

	// ──────────────────────────────────────────────────────────────
	// SECTION 2 — Integer Types: Unsigned
	// ──────────────────────────────────────────────────────────────
	// WHY: Unsigned integers cannot be negative. Use them for
	// things that are never negative: array indices, byte counts,
	// bit manipulation.

	fmt.Println("\n--- Unsigned Integer Types ---")
	var u8 uint8 = 255
	var u16 uint16 = 65535
	var u32 uint32 = 4294967295
	var u64 uint64 = 18446744073709551615

	fmt.Printf("uint8:  %d  (size: %d byte,  max: %d)\n",
		u8, unsafe.Sizeof(u8), math.MaxUint8)
	// Output: uint8:  255  (size: 1 byte,  max: 255)

	fmt.Printf("uint16: %d  (size: %d bytes, max: %d)\n",
		u16, unsafe.Sizeof(u16), math.MaxUint16)
	// Output: uint16: 65535  (size: 2 bytes, max: 65535)

	fmt.Printf("uint32: %d  (size: %d bytes, max: %d)\n",
		u32, unsafe.Sizeof(u32), math.MaxUint32)
	// Output: uint32: 4294967295  (size: 4 bytes, max: 4294967295)

	fmt.Printf("uint64: %d  (size: %d bytes)\n", u64, unsafe.Sizeof(u64))
	// Output: uint64: 18446744073709551615  (size: 8 bytes)

	// ──────────────────────────────────────────────────────────────
	// SECTION 3 — Float Types
	// ──────────────────────────────────────────────────────────────
	// WHY: float64 is the default for decimal numbers. float32
	// saves memory but loses precision. Always prefer float64
	// unless you have a compelling reason.

	fmt.Println("\n--- Float Types ---")
	var f32 float32 = 3.14159265358979
	var f64 float64 = 3.14159265358979

	fmt.Printf("float32: %.15f  (size: %d bytes)\n", f32, unsafe.Sizeof(f32))
	// Output: float32: 3.141592741012573  (size: 4 bytes)
	// WHY: Notice the precision loss after ~7 digits!

	fmt.Printf("float64: %.15f  (size: %d bytes)\n", f64, unsafe.Sizeof(f64))
	// Output: float64: 3.141592653589790  (size: 8 bytes)
	// WHY: float64 gives ~15-16 digits of precision.

	// Special float values
	inf := math.Inf(1)
	negInf := math.Inf(-1)
	nan := math.NaN()
	fmt.Printf("Inf: %f, -Inf: %f, NaN: %f\n", inf, negInf, nan)
	// Output: Inf: +Inf, -Inf: -Inf, NaN: NaN

	fmt.Printf("NaN == NaN? %v\n", nan == nan)
	// Output: NaN == NaN? false
	// WHY: NaN is never equal to anything, not even itself!

	// ──────────────────────────────────────────────────────────────
	// SECTION 4 — Type Conversions (Explicit Only!)
	// ──────────────────────────────────────────────────────────────
	// WHY: Go has ZERO implicit conversions. You must explicitly
	// convert between types. This prevents subtle bugs like
	// accidental truncation or precision loss.

	fmt.Println("\n--- Type Conversions ---")

	var intVal int = 42
	var floatVal float64 = float64(intVal) // int -> float64
	var backToInt int = int(floatVal)      // float64 -> int (truncates!)

	fmt.Printf("int -> float64: %d -> %f\n", intVal, floatVal)
	// Output: int -> float64: 42 -> 42.000000
	var pi float64 = 3.99
	fmt.Printf("float64 -> int: %f -> %d\n", pi, int(pi))
	// Output: float64 -> int: 3.990000 -> 3
	// WHY: Conversion to int TRUNCATES, it does NOT round!

	_ = backToInt // use the variable to avoid compiler error

	// Converting between int sizes
	var big int64 = 1000
	var small int8 = int8(big)
	fmt.Printf("int64 -> int8: %d -> %d\n", big, small)
	// Output: int64 -> int8: 1000 -> -24
	// WHY: 1000 overflows int8 (max 127), wraps around silently!

	// This will NOT compile — Go refuses implicit conversion:
	// var x int32 = 10
	// var y int64 = x    // COMPILE ERROR: cannot use x (int32) as int64
	// var y int64 = int64(x) // This is correct

	// ──────────────────────────────────────────────────────────────
	// SECTION 5 — Overflow Behavior
	// ──────────────────────────────────────────────────────────────
	// WHY: Go integers wrap around on overflow at runtime (no panic).
	// The compiler catches constant overflow, but variable overflow
	// is silent. Be careful with boundary values!

	fmt.Println("\n--- Overflow Behavior ---")

	var maxU8 uint8 = 255
	maxU8++ // wraps to 0
	fmt.Printf("uint8 255 + 1 = %d (wraps to 0!)\n", maxU8)
	// Output: uint8 255 + 1 = 0 (wraps to 0!)

	var maxI8 int8 = 127
	maxI8++ // wraps to -128
	fmt.Printf("int8 127 + 1 = %d (wraps to -128!)\n", maxI8)
	// Output: int8 127 + 1 = -128 (wraps to -128!)

	// Compiler catches constant overflow:
	// const tooBig int8 = 200  // COMPILE ERROR: 200 overflows int8

	// ============================================================
	// EXAMPLE BLOCK 2 — Strings, Bytes, Runes, Custom Types
	// ============================================================

	// ──────────────────────────────────────────────────────────────
	// SECTION 6 — bool
	// ──────────────────────────────────────────────────────────────
	// WHY: Go booleans are strictly true/false. Unlike JavaScript,
	// there is no truthy/falsy — you cannot use 0, "", or nil as
	// booleans in conditions.

	fmt.Println("\n--- bool ---")
	var isPressRunning bool = true
	var isInkDry bool // zero value: false

	fmt.Printf("Press running: %v, Ink dry: %v\n", isPressRunning, isInkDry)
	// Output: Press running: true, Ink dry: false

	// This will NOT compile in Go:
	// if 1 { ... }         // COMPILE ERROR: non-bool used as condition
	// if "" { ... }        // COMPILE ERROR: non-bool used as condition

	// ──────────────────────────────────────────────────────────────
	// SECTION 7 — Strings, Bytes, and Runes
	// ──────────────────────────────────────────────────────────────
	// WHY: Go strings are immutable sequences of BYTES, not
	// characters. For Unicode, you need runes (int32 code points).
	// This distinction is critical for internationalization.

	fmt.Println("\n--- Strings ---")
	greeting := "Hello, World!"
	fmt.Printf("String: %s\n", greeting)
	// Output: String: Hello, World!
	fmt.Printf("Length (bytes): %d\n", len(greeting))
	// Output: Length (bytes): 13

	// Strings are immutable — you cannot modify individual bytes:
	// greeting[0] = 'h'  // COMPILE ERROR: cannot assign to greeting[0]

	// String concatenation
	first := "Suresh"
	last := "Sharma"
	full := first + " " + last
	fmt.Printf("Full name: %s\n", full)
	// Output: Full name: Suresh Sharma

	// Multi-line strings with backticks (raw string literal)
	blueprint := `Line 1: ₹10 note plate
Line 2: ₹100 note plate
Line 3: ₹500 note plate`
	fmt.Println(blueprint)
	// Output:
	// Line 1: ₹10 note plate
	// Line 2: ₹100 note plate
	// Line 3: ₹500 note plate

	// Escape sequences (only in double-quoted strings)
	fmt.Println("Tab:\tHere")    // Output: Tab:	Here
	fmt.Println("Newline:\nHere") // Output: Newline:\nHere (two lines)

	// ──────────────────────────────────────────────────────────────
	// SECTION 8 — byte (uint8) vs rune (int32)
	// ──────────────────────────────────────────────────────────────
	// WHY: A byte is an alias for uint8 (one byte). A rune is an
	// alias for int32 (one Unicode code point). ASCII characters
	// fit in one byte; emoji and CJK characters need multiple bytes.

	fmt.Println("\n--- Bytes vs Runes ---")

	ascii := "Go"
	emoji := "Go🔥"

	fmt.Printf("%q: len=%d bytes, %d runes\n",
		ascii, len(ascii), utf8.RuneCountInString(ascii))
	// Output: "Go": len=2 bytes, 2 runes

	fmt.Printf("%q: len=%d bytes, %d runes\n",
		emoji, len(emoji), utf8.RuneCountInString(emoji))
	// Output: "Go🔥": len=6 bytes, 3 runes
	// WHY: 🔥 takes 4 bytes in UTF-8, but counts as 1 rune!

	// Iterating by bytes vs runes
	fmt.Println("\nByte iteration over 'Go🔥':")
	for i := 0; i < len(emoji); i++ {
		fmt.Printf("  byte[%d] = %d (0x%02x)\n", i, emoji[i], emoji[i])
	}
	// Output:
	//   byte[0] = 71 (0x47)    — 'G'
	//   byte[1] = 111 (0x6f)   — 'o'
	//   byte[2] = 240 (0xf0)   — first byte of 🔥
	//   byte[3] = 159 (0x9f)
	//   byte[4] = 148 (0x94)
	//   byte[5] = 165 (0xa5)

	fmt.Println("\nRune iteration over 'Go🔥':")
	for i, r := range emoji {
		fmt.Printf("  index=%d, rune=%c (U+%04X)\n", i, r, r)
	}
	// Output:
	//   index=0, rune=G (U+0047)
	//   index=1, rune=o (U+006F)
	//   index=2, rune=🔥 (U+1F525)
	// WHY: range on strings iterates by rune, not by byte!

	// Converting between strings, bytes, and runes
	byteSlice := []byte("Hello")
	runeSlice := []rune("Hello🔥")

	fmt.Printf("[]byte: %v\n", byteSlice)
	// Output: []byte: [72 101 108 108 111]
	fmt.Printf("[]rune: %v\n", runeSlice)
	// Output: []rune: [72 101 108 108 111 128293]

	// Convert back
	fmt.Printf("string([]byte): %s\n", string(byteSlice))
	// Output: string([]byte): Hello
	fmt.Printf("string([]rune): %s\n", string(runeSlice))
	// Output: string([]rune): Hello🔥

	// ──────────────────────────────────────────────────────────────
	// SECTION 9 — Custom Types and Type Aliases
	// ──────────────────────────────────────────────────────────────
	// WHY: Custom types add semantic meaning and type safety.
	// `type Celsius float64` prevents accidentally passing
	// Fahrenheit where Celsius is expected. Type aliases (=) are
	// different — they're just alternate names for the same type.

	fmt.Println("\n--- Custom Types ---")

	type Celsius float64
	type Fahrenheit float64

	var boiling Celsius = 100.0
	var bodyTemp Fahrenheit = 98.6

	fmt.Printf("Boiling: %.1f°C\n", boiling)
	// Output: Boiling: 100.0°C
	fmt.Printf("Body temp: %.1f°F\n", bodyTemp)
	// Output: Body temp: 98.6°F

	// This will NOT compile — different types!
	// var mixed = boiling + bodyTemp
	// COMPILE ERROR: mismatched types Celsius and Fahrenheit

	// You must convert explicitly:
	converted := Celsius(bodyTemp) // semantically wrong, but compiles
	fmt.Printf("Explicit conversion: %.1f\n", converted)
	// Output: Explicit conversion: 98.6
	// WHY: The compiler enforces type safety; the programmer
	// enforces semantic correctness.

	// Type alias vs custom type
	type MyInt int       // custom type — NEW type, cannot mix with int
	type AliasInt = int  // type alias — SAME as int, fully interchangeable

	var a1 MyInt = 10
	var a2 AliasInt = 20
	var a3 int = 30

	// a1 + a3 would NOT compile — MyInt and int are different types
	// a2 + a3 compiles — AliasInt IS int
	fmt.Printf("MyInt: %d (type: %T)\n", a1, a1)
	// Output: MyInt: 10 (type: main.MyInt)
	fmt.Printf("AliasInt: %d (type: %T)\n", a2, a2)
	// Output: AliasInt: 20 (type: int)  — alias shows the underlying type
	_ = a3

	// ──────────────────────────────────────────────────────────────
	// SECTION 10 — Comparison Rules
	// ──────────────────────────────────────────────────────────────
	// WHY: Not everything in Go is comparable. Knowing what can be
	// compared with == prevents runtime panics.

	fmt.Println("\n--- Comparison Rules ---")

	// Integers and floats — comparable within same type
	fmt.Printf("10 == 10: %v\n", 10 == 10)
	// Output: 10 == 10: true

	// Strings — comparable (lexicographic)
	fmt.Printf("%q < %q: %v\n", "apple", "banana", "apple" < "banana")
	// Output: "apple" < "banana": true

	// Booleans — comparable
	fmt.Printf("true == true: %v\n", true == true)
	// Output: true == true: true

	// Structs — comparable if all fields are comparable
	type Point struct{ X, Y int }
	p1 := Point{1, 2}
	p2 := Point{1, 2}
	p3 := Point{3, 4}
	fmt.Printf("Point{1,2} == Point{1,2}: %v\n", p1 == p2)
	// Output: Point{1,2} == Point{1,2}: true
	fmt.Printf("Point{1,2} == Point{3,4}: %v\n", p1 == p3)
	// Output: Point{1,2} == Point{3,4}: false

	// Arrays — comparable if same size and element type is comparable
	arr1 := [3]int{1, 2, 3}
	arr2 := [3]int{1, 2, 3}
	fmt.Printf("[1,2,3] == [1,2,3]: %v\n", arr1 == arr2)
	// Output: [1,2,3] == [1,2,3]: true

	// Slices, maps, functions — NOT comparable with ==
	// (only comparable to nil)
	// []int{1} == []int{1}  // COMPILE ERROR: slice can only be compared to nil

	// Useful string functions (from strings package)
	fmt.Println("\n--- Bonus: strings package ---")
	fmt.Printf("Contains: %v\n", strings.Contains("currency", "curr"))
	// Output: Contains: true
	fmt.Printf("ToUpper:  %s\n", strings.ToUpper("currency"))
	// Output: ToUpper:  CURRENCY
	fmt.Printf("Split:    %v\n", strings.Split("a,b,c", ","))
	// Output: Split:    [a b c]
	fmt.Printf("Join:     %s\n", strings.Join([]string{"a", "b", "c"}, "-"))
	// Output: Join:     a-b-c
}

// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. Go has specific-width integers (int8 to int64, uint8 to
//    uint64). `int` is platform-dependent (usually 64-bit).
//
// 2. float64 is the default float type with ~15 digits of
//    precision. float32 gives only ~7 digits. Prefer float64.
//
// 3. Go has ZERO implicit type conversions. int + float64 will
//    not compile. You must explicitly convert: float64(myInt).
//
// 4. Integer overflow wraps silently at runtime. The compiler
//    only catches overflow in constants.
//
// 5. Strings are immutable byte sequences. len() returns bytes,
//    not characters. Use utf8.RuneCountInString() for runes.
//
// 6. byte = uint8 (one byte). rune = int32 (one Unicode code
//    point). range on strings iterates runes, not bytes.
//
// 7. Custom types (type X int) create NEW types with type safety.
//    Type aliases (type X = int) are just alternate names.
//
// 8. Slices, maps, and functions cannot be compared with ==
//    (only to nil). Arrays, structs, and basic types can.
//
// 9. Suresh's minting press rule: "Every plate is precise. No
//    denomination flows into the wrong press without the
//    operator's explicit command."
// ============================================================
