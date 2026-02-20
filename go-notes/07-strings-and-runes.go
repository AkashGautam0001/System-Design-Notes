// ============================================================
//  FILE 7 : Strings and Runes
// ============================================================
//  Topic  : String internals, byte vs rune iteration, UTF-8
//           encoding, strings package, strconv conversions,
//           string builder, practical string patterns.
//
//  WHY THIS MATTERS:
//  Strings are everywhere — user input, API responses, logs,
//  config files. Go strings are UTF-8 encoded byte slices, and
//  understanding the byte-vs-rune distinction is critical for
//  correctly handling international text, emojis, and CJK
//  characters without corrupting data.
// ============================================================

// ============================================================
// STORY: Doordarshan Subtitle Desk
// Subtitle editor Lakshmi at DD's broadcast center decodes
// scripts in every language — Hindi (हिंदी), Tamil (தமிழ்),
// Bengali (বাংলা), English. She must understand that each
// glyph may occupy a different number of bytes, and that Go
// gives her the tools to handle all of them correctly.
// ============================================================

package main

import (
	"fmt"
	"strings"
	"strconv"
	"unicode/utf8"
)

func main() {

	// ──────────────────────────────────────────────────────────────
	// EXAMPLE BLOCK 1 — String Basics, Byte vs Rune, Multi-byte,
	//                    String Builder
	// ──────────────────────────────────────────────────────────────

	// ────────────────────────────────────────────────────────────
	// 1.1 — String Internals: Immutable Byte Slices
	// ────────────────────────────────────────────────────────────
	// WHY: Go strings are read-only slices of bytes. You cannot
	// modify a string in place — every "change" creates a new one.

	message := "Hello, Lakshmi!"
	fmt.Println("Original:", message)
	// Output: Original: Hello, Lakshmi!

	fmt.Println("len() returns bytes:", len(message))
	// Output: len() returns bytes: 15

	// Attempting message[0] = 'h' would cause a compile error.
	// WHY: Immutability makes strings safe for concurrent use.

	// Raw string literals — no escape processing
	rawPath := `C:\Users\Lakshmi\subtitles`
	fmt.Println("Raw string:", rawPath)
	// Output: Raw string: C:\Users\Lakshmi\subtitles

	// Multi-line raw string
	poem := `नमस्ते दर्शकों,
आज का समाचार,
दूरदर्शन पर,
सुनिए और देखिए।`
	fmt.Println("\nPoem:\n" + poem)
	// Output:
	// Poem:
	// नमस्ते दर्शकों,
	// आज का समाचार,
	// दूरदर्शन पर,
	// सुनिए और देखिए।

	// ────────────────────────────────────────────────────────────
	// 1.2 — len() Returns Bytes, NOT Characters
	// ────────────────────────────────────────────────────────────
	// WHY: This is the #1 Go string gotcha. Multi-byte characters
	// make len() and rune count differ.

	fmt.Println("\n--- Byte Count vs Rune Count ---")

	ascii := "Go"
	hindi := "हिंदी"       // Hindi in Devanagari script
	tamil := "தமிழ்"      // Tamil script

	fmt.Printf("%-12s len=%d  runes=%d\n", ascii, len(ascii), utf8.RuneCountInString(ascii))
	// Output: Go           len=2  runes=2
	fmt.Printf("%-12s len=%d  runes=%d\n", hindi, len(hindi), utf8.RuneCountInString(hindi))
	// Output: हिंदी         len=15  runes=5
	fmt.Printf("%-12s len=%d  runes=%d\n", tamil, len(tamil), utf8.RuneCountInString(tamil))
	// Output: தமிழ்         len=15  runes=5

	// WHY: Each Devanagari/Tamil character takes 3 bytes in UTF-8.

	// ────────────────────────────────────────────────────────────
	// 1.3 — Byte-by-Byte vs Rune-by-Rune Iteration
	// ────────────────────────────────────────────────────────────
	// WHY: Byte iteration can split multi-byte characters.
	// The `for range` loop iterates by rune — always prefer it
	// for text processing.

	word := "café"
	fmt.Println("\n--- Byte-by-byte (indexed for) ---")
	for i := 0; i < len(word); i++ {
		fmt.Printf("  byte[%d] = %x (%c)\n", i, word[i], word[i])
	}
	// Output:
	//   byte[0] = 63 (c)
	//   byte[1] = 61 (a)
	//   byte[2] = 66 (f)
	//   byte[3] = c3 (Ã)
	//   byte[4] = a9 (©)
	// WHY: 'é' is 2 bytes (c3 a9) — byte loop breaks it apart!

	fmt.Println("\n--- Rune-by-rune (for range) ---")
	for i, r := range word {
		fmt.Printf("  index=%d rune=%c (U+%04X)\n", i, r, r)
	}
	// Output:
	//   index=0 rune=c (U+0063)
	//   index=1 rune=a (U+0061)
	//   index=2 rune=f (U+0066)
	//   index=3 rune=é (U+00E9)
	// WHY: for-range correctly yields 'é' as a single rune.
	// Note: index jumps from 3 to — no index 4 because é is 2 bytes.

	// ────────────────────────────────────────────────────────────
	// 1.4 — Multi-byte Characters: Devanagari and Tamil
	// ────────────────────────────────────────────────────────────

	fmt.Println("\n--- Multi-byte Characters ---")
	devanagari := "नमस्ते"
	fmt.Printf("String: %s\n", devanagari)
	fmt.Printf("Byte length: %d\n", len(devanagari))
	fmt.Printf("Rune count:  %d\n", utf8.RuneCountInString(devanagari))

	for i, r := range devanagari {
		fmt.Printf("  [%2d] U+%04X  %c  (%d bytes)\n", i, r, r, utf8.RuneLen(r))
	}
	// WHY: Devanagari characters are 3 bytes each in UTF-8.
	// Combining marks (like the virama ्) are separate runes.

	// ────────────────────────────────────────────────────────────
	// 1.5 — Rune Type and Conversions
	// ────────────────────────────────────────────────────────────

	fmt.Println("\n--- Rune Basics ---")
	var r rune = 'अ'           // rune is alias for int32
	fmt.Printf("Rune: %c  Unicode: U+%04X  Int: %d\n", r, r, r)
	// Output: Rune: अ  Unicode: U+0905  Int: 2309

	// String to rune slice and back
	original := "नमस्ते दुनिया"
	runes := []rune(original)
	fmt.Printf("Rune slice: %v\n", runes)
	fmt.Printf("Back to string: %s\n", string(runes))

	// Single rune to string
	fmt.Println("Rune to string:", string('क'))
	// Output: Rune to string: क

	// ────────────────────────────────────────────────────────────
	// 1.6 — strings.Builder for Efficient Concatenation
	// ────────────────────────────────────────────────────────────
	// WHY: String concatenation with + creates a new string each
	// time. Builder avoids repeated allocation — use it in loops.

	fmt.Println("\n--- strings.Builder ---")
	var b strings.Builder
	greetings := []string{"Namaste", "Vanakkam", "Namaskar", "নমস্কার"}
	for i, t := range greetings {
		if i > 0 {
			b.WriteString(", ")
		}
		b.WriteString(t)
	}
	result := b.String()
	fmt.Println("Built string:", result)
	// Output: Built string: Namaste, Vanakkam, Namaskar, নমস্কার

	// Builder also supports WriteRune and WriteByte
	var b2 strings.Builder
	b2.WriteRune('ॐ')
	b2.WriteRune(' ')
	b2.WriteByte('!')
	fmt.Println("Rune builder:", b2.String())
	// Output: Rune builder: ॐ !

	// ──────────────────────────────────────────────────────────────
	// EXAMPLE BLOCK 2 — strings Package, strconv, Practical Patterns
	// ──────────────────────────────────────────────────────────────

	// ────────────────────────────────────────────────────────────
	// 2.1 — strings Package: Searching
	// ────────────────────────────────────────────────────────────
	// WHY: The strings package is your Swiss army knife for text.

	fmt.Println("\n--- strings: Searching ---")
	msg := "Doordarshan brings news to every household"

	fmt.Println("Contains 'news':", strings.Contains(msg, "news"))
	// Output: Contains 'news': true
	fmt.Println("HasPrefix 'Door':", strings.HasPrefix(msg, "Door"))
	// Output: HasPrefix 'Door': true
	fmt.Println("HasSuffix 'household':", strings.HasSuffix(msg, "household"))
	// Output: HasSuffix 'household': true
	fmt.Println("Index 'brings':", strings.Index(msg, "brings"))
	// Output: Index 'brings': 13
	fmt.Println("Count 'o':", strings.Count(msg, "o"))
	// Output: Count 'o': 4

	// ────────────────────────────────────────────────────────────
	// 2.2 — strings Package: Transforming
	// ────────────────────────────────────────────────────────────

	fmt.Println("\n--- strings: Transforming ---")
	raw := "  Lakshmi's Subtitle Desk  "
	fmt.Printf("ToUpper:    %q\n", strings.ToUpper(raw))
	// Output: ToUpper:    "  LAKSHMI'S SUBTITLE DESK  "
	fmt.Printf("ToLower:    %q\n", strings.ToLower(raw))
	// Output: ToLower:    "  lakshmi's subtitle desk  "
	fmt.Printf("TrimSpace:  %q\n", strings.TrimSpace(raw))
	// Output: TrimSpace:  "Lakshmi's Subtitle Desk"
	fmt.Printf("Replace:    %q\n", strings.Replace(raw, "Subtitle", "Caption", 1))
	// Output: Replace:    "  Lakshmi's Caption Desk  "
	fmt.Printf("Repeat:     %q\n", strings.Repeat("DD! ", 3))
	// Output: Repeat:     "DD! DD! DD! "

	// ────────────────────────────────────────────────────────────
	// 2.3 — strings Package: Split, Join, Fields
	// ────────────────────────────────────────────────────────────

	fmt.Println("\n--- strings: Split, Join, Fields ---")
	csv := "Hindi,Tamil,Bengali,English"
	parts := strings.Split(csv, ",")
	fmt.Println("Split:", parts)
	// Output: Split: [Hindi Tamil Bengali English]

	joined := strings.Join(parts, " | ")
	fmt.Println("Join:", joined)
	// Output: Join: Hindi | Tamil | Bengali | English

	// Fields splits on any whitespace (better than Split for words)
	sentence := "  Doordarshan   is   timeless  "
	words := strings.Fields(sentence)
	fmt.Println("Fields:", words)
	// Output: Fields: [Doordarshan is timeless]
	// WHY: Fields handles multiple spaces; Split(" ") would give empty strings.

	// ────────────────────────────────────────────────────────────
	// 2.4 — strconv: Number and String Conversions
	// ────────────────────────────────────────────────────────────
	// WHY: Go doesn't implicitly convert between types.
	// strconv bridges numbers and strings explicitly.

	fmt.Println("\n--- strconv Conversions ---")

	// Int to string
	age := 42
	ageStr := strconv.Itoa(age)
	fmt.Printf("Itoa: %q (type string)\n", ageStr)
	// Output: Itoa: "42" (type string)

	// String to int (can fail — always check error!)
	parsed, err := strconv.Atoi("256")
	if err == nil {
		fmt.Println("Atoi:", parsed)
		// Output: Atoi: 256
	}

	// Bad input
	_, err2 := strconv.Atoi("not_a_number")
	if err2 != nil {
		fmt.Println("Atoi error:", err2)
		// Output: Atoi error: strconv.Atoi: parsing "not_a_number": invalid syntax
	}

	// Float conversions
	pi := 3.14159
	piStr := strconv.FormatFloat(pi, 'f', 2, 64)
	fmt.Println("FormatFloat:", piStr)
	// Output: FormatFloat: 3.14

	parsedFloat, _ := strconv.ParseFloat("2.718", 64)
	fmt.Println("ParseFloat:", parsedFloat)
	// Output: ParseFloat: 2.718

	// Bool conversions
	fmt.Println("FormatBool:", strconv.FormatBool(true))
	// Output: FormatBool: true
	bVal, _ := strconv.ParseBool("true")
	fmt.Println("ParseBool:", bVal)
	// Output: ParseBool: true

	// ────────────────────────────────────────────────────────────
	// 2.5 — Practical Pattern: Reverse a String (rune-safe)
	// ────────────────────────────────────────────────────────────
	// WHY: Naively reversing bytes corrupts multi-byte characters.
	// Always convert to []rune first.

	fmt.Println("\n--- Practical: Reverse String ---")
	reverseStr := func(s string) string {
		runes := []rune(s)
		for i, j := 0, len(runes)-1; i < j; i, j = i+1, j-1 {
			runes[i], runes[j] = runes[j], runes[i]
		}
		return string(runes)
	}

	fmt.Println("Reverse 'Hello':", reverseStr("Hello"))
	// Output: Reverse 'Hello': olleH
	fmt.Println("Reverse 'नमस्ते':", reverseStr("नमस्ते"))
	// Output: Reverse 'नमस्ते': ेत्समन

	// ────────────────────────────────────────────────────────────
	// 2.6 — Practical Pattern: Word Count
	// ────────────────────────────────────────────────────────────

	fmt.Println("\n--- Practical: Word Count ---")
	wordCount := func(s string) map[string]int {
		counts := make(map[string]int)
		for _, w := range strings.Fields(s) {
			counts[strings.ToLower(w)]++
		}
		return counts
	}

	text := "Go is great and Go is fast"
	wc := wordCount(text)
	fmt.Println("Word counts for:", text)
	for word, count := range wc {
		fmt.Printf("  %q: %d\n", word, count)
	}
	// Output (order may vary):
	//   "go": 2
	//   "is": 2
	//   "great": 1
	//   "and": 1
	//   "fast": 1

	// ────────────────────────────────────────────────────────────
	// 2.7 — Practical Pattern: Palindrome Check (rune-safe)
	// ────────────────────────────────────────────────────────────

	fmt.Println("\n--- Practical: Palindrome Check ---")
	isPalindrome := func(s string) bool {
		s = strings.ToLower(strings.TrimSpace(s))
		runes := []rune(s)
		for i, j := 0, len(runes)-1; i < j; i, j = i+1, j-1 {
			if runes[i] != runes[j] {
				return false
			}
		}
		return true
	}

	fmt.Println("'racecar':", isPalindrome("racecar"))
	// Output: 'racecar': true
	fmt.Println("'hello':", isPalindrome("hello"))
	// Output: 'hello': false
	fmt.Println("'level':", isPalindrome("level"))
	// Output: 'level': true

	// ============================================================
	// KEY TAKEAWAYS
	// ============================================================
	// 1. Go strings are immutable, UTF-8 encoded byte slices.
	// 2. len(s) returns BYTES, not characters — use
	//    utf8.RuneCountInString(s) for character count.
	// 3. for-range on a string iterates by rune (correct for text);
	//    indexed for iterates by byte (can break multi-byte chars).
	// 4. Always convert to []rune for character-level operations
	//    like reversing or palindrome checks.
	// 5. strings.Builder is the efficient way to concatenate in loops.
	// 6. strings package covers searching, transforming, splitting.
	// 7. strconv bridges strings and numbers — always handle errors
	//    from Atoi/ParseFloat.
	// 8. strings.Fields is superior to Split(" ") for word splitting.
}
