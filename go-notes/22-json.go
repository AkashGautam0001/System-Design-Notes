// ============================================================
//  FILE 22 : JSON
// ============================================================
//  Topic  : json.Marshal, json.Unmarshal, struct tags,
//           json.Encoder, json.Decoder (streaming),
//           custom MarshalJSON / UnmarshalJSON,
//           json.RawMessage, map[string]any, json.Indent
//
//  WHY THIS MATTERS:
//  JSON is the lingua franca of web APIs, config files, and
//  data exchange. Go's encoding/json package handles the
//  translation between Go structs and JSON text. Mastering
//  struct tags, custom marshaling, and dynamic JSON parsing
//  is essential for any Go developer working with APIs.
// ============================================================

// ============================================================
// STORY: The RTI Data Translator
// Officer Sharma works at the RTI (Right to Information) office,
// translating between two worlds — the Land of Structs (Go) and
// the Land of Curly Braces (JSON). Every day he converts citizen
// requests and government database records back and forth: naming
// fields differently for each system, hiding classified information,
// and sometimes dealing with applications whose shape he does
// not know in advance.
// ============================================================

package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

func main() {
	// ============================================================
	// EXAMPLE BLOCK 1 — Marshal/Unmarshal, Struct Tags, Omitempty
	// ============================================================

	fmt.Println("--- BLOCK 1: Marshal/Unmarshal Basics ---")

	// ──────────────────────────────────────────────────────────────
	// SECTION 1 — json.Marshal (Go struct -> JSON bytes)
	// ──────────────────────────────────────────────────────────────
	// WHY: Marshal converts a Go value into JSON bytes. Without
	// struct tags, field names are used as-is (capitalized).

	type RTIRequest struct {
		From       string
		To         string
		Department string
		Urgent     bool
	}

	req := RTIRequest{
		From:       "Sharma",
		To:         "District Collector",
		Department: "Revenue Department",
		Urgent:     true,
	}

	jsonBytes, err := json.Marshal(req)
	if err != nil {
		fmt.Println("Marshal error:", err)
		return
	}
	fmt.Println("Marshal (no tags):", string(jsonBytes))
	// Output: Marshal (no tags): {"From":"Sharma","To":"District Collector","Department":"Revenue Department","Urgent":true}

	// ──────────────────────────────────────────────────────────────
	// SECTION 2 — Struct tags for field renaming
	// ──────────────────────────────────────────────────────────────
	// WHY: JSON conventions use camelCase or snake_case. Struct
	// tags map Go's PascalCase fields to JSON's naming style.

	type TaggedRTIRequest struct {
		From       string `json:"from"`
		To         string `json:"to"`
		Department string `json:"department"`
		Urgent     bool   `json:"urgent"`
	}

	tagged := TaggedRTIRequest{
		From:       "Sharma",
		To:         "District Collector",
		Department: "Revenue Department",
		Urgent:     true,
	}

	jsonBytes, _ = json.Marshal(tagged)
	fmt.Println("Marshal (tags):   ", string(jsonBytes))
	// Output: Marshal (tags):    {"from":"Sharma","to":"District Collector","department":"Revenue Department","urgent":true}

	// ──────────────────────────────────────────────────────────────
	// SECTION 3 — json.Unmarshal (JSON bytes -> Go struct)
	// ──────────────────────────────────────────────────────────────
	// WHY: Unmarshal parses JSON bytes into a Go value. Fields
	// that don't match are silently ignored. Missing fields get
	// their zero value.

	fmt.Println("\n--- json.Unmarshal ---")

	jsonStr := `{"from":"Citizen Verma","to":"Sharma","department":"Public Works","urgent":false}`

	var received TaggedRTIRequest
	err = json.Unmarshal([]byte(jsonStr), &received)
	if err != nil {
		fmt.Println("Unmarshal error:", err)
		return
	}
	fmt.Printf("Unmarshaled: From=%s, To=%s, Department=%s, Urgent=%v\n",
		received.From, received.To, received.Department, received.Urgent)
	// Output: Unmarshaled: From=Citizen Verma, To=Sharma, Department=Public Works, Urgent=false

	// Extra fields in JSON are ignored
	extraJSON := `{"from":"X","to":"Y","department":"Z","urgent":true,"priority":99}`
	var partial TaggedRTIRequest
	json.Unmarshal([]byte(extraJSON), &partial)
	fmt.Printf("Extra fields ignored: From=%s (priority field silently dropped)\n", partial.From)
	// Output: Extra fields ignored: From=X (priority field silently dropped)

	// ──────────────────────────────────────────────────────────────
	// SECTION 4 — omitempty and json:"-"
	// ──────────────────────────────────────────────────────────────
	// WHY: omitempty skips zero-value fields in output. json:"-"
	// completely hides a field from JSON. These control what the
	// outside world sees.

	fmt.Println("\n--- omitempty and json:\"-\" ---")

	type GovOfficer struct {
		Name       string `json:"name"`
		Grade      int    `json:"grade,omitempty"`      // omit if zero
		Email      string `json:"email,omitempty"`       // omit if empty string
		AadhaarNum string `json:"-"`                     // NEVER include in JSON
		Nickname   string `json:"nickname,omitempty"`    // omit if empty
	}

	officer := GovOfficer{
		Name:       "Sharma",
		Grade:      0,       // zero value — will be omitted
		Email:      "sharma@rti.gov.in",
		AadhaarNum: "1234-5678-9012", // will NEVER appear
		Nickname:   "",                // empty — will be omitted
	}

	jsonBytes, _ = json.Marshal(officer)
	fmt.Println("With omitempty:", string(jsonBytes))
	// Output: With omitempty: {"name":"Sharma","email":"sharma@rti.gov.in"}
	// WHY: Grade (0) and Nickname ("") are omitted; AadhaarNum is hidden

	officer.Grade = 14
	officer.Nickname = "The Translator"
	jsonBytes, _ = json.Marshal(officer)
	fmt.Println("All fields set:", string(jsonBytes))
	// Output: All fields set: {"name":"Sharma","grade":14,"email":"sharma@rti.gov.in","nickname":"The Translator"}

	// ──────────────────────────────────────────────────────────────
	// SECTION 5 — Nested structs and slices
	// ──────────────────────────────────────────────────────────────
	// WHY: Real JSON data is nested. Go handles this naturally
	// with nested structs, slices, and maps.

	fmt.Println("\n--- Nested structs ---")

	type OfficeAddress struct {
		Street string `json:"street"`
		City   string `json:"city"`
	}

	type RTIOfficer struct {
		Name        string        `json:"name"`
		Address     OfficeAddress `json:"address"`
		Departments []string      `json:"departments"`
	}

	rtiOfficer := RTIOfficer{
		Name:        "Sharma",
		Address:     OfficeAddress{Street: "123 Janpath Road", City: "New Delhi"},
		Departments: []string{"Revenue", "Public Works", "Education"},
	}

	jsonBytes, _ = json.Marshal(rtiOfficer)
	fmt.Println("Nested:", string(jsonBytes))
	// Output: Nested: {"name":"Sharma","address":{"street":"123 Janpath Road","city":"New Delhi"},"departments":["Revenue","Public Works","Education"]}

	// Unmarshal nested JSON
	nestedJSON := `{"name":"Director Iyer","address":{"street":"1 Secretariat","city":"Chennai"},"departments":["Finance","Planning"]}`
	var director RTIOfficer
	json.Unmarshal([]byte(nestedJSON), &director)
	fmt.Printf("Director: %s from %s, handles %v\n", director.Name, director.Address.City, director.Departments)
	// Output: Director: Director Iyer from Chennai, handles [Finance Planning]

	// ============================================================
	// EXAMPLE BLOCK 2 — Custom Marshaling, RawMessage, Dynamic JSON
	// ============================================================

	fmt.Println("\n--- BLOCK 2: Custom Marshaling, Dynamic JSON ---")

	// ──────────────────────────────────────────────────────────────
	// SECTION 6 — Custom MarshalJSON / UnmarshalJSON
	// ──────────────────────────────────────────────────────────────
	// WHY: Sometimes the default behavior isn't enough — you need
	// to format dates differently, flatten nested structures, or
	// validate during parsing.

	fmt.Println("\n--- Custom MarshalJSON ---")

	notification := GovNotification{
		Name: "Republic Day Parade",
		When: time.Date(2026, 1, 26, 9, 0, 0, 0, time.UTC),
	}

	jsonBytes, _ = json.Marshal(notification)
	fmt.Println("Custom marshal:", string(jsonBytes))
	// Output: Custom marshal: {"name":"Republic Day Parade","when":"2026-01-26"}

	// Custom unmarshal
	notifJSON := `{"name":"Budget Session Opening","when":"2026-02-01"}`
	var parsed GovNotification
	err = json.Unmarshal([]byte(notifJSON), &parsed)
	if err != nil {
		fmt.Println("Custom unmarshal error:", err)
	} else {
		fmt.Printf("Custom unmarshal: %s on %s\n", parsed.Name, parsed.When.Format("Jan 2, 2006"))
		// Output: Custom unmarshal: Budget Session Opening on Feb 1, 2026
	}

	// ──────────────────────────────────────────────────────────────
	// SECTION 7 — json.RawMessage for delayed parsing
	// ──────────────────────────────────────────────────────────────
	// WHY: Sometimes you don't know the shape of part of the JSON
	// until you read another field. RawMessage keeps it as raw
	// bytes until you're ready to parse.

	fmt.Println("\n--- json.RawMessage ---")

	type RTIEnvelope struct {
		Type    string          `json:"type"`
		Payload json.RawMessage `json:"payload"`
	}

	// Two different payloads with the same envelope
	textMsg := `{"type":"text","payload":{"content":"Request for road budget data"}}`
	numMsg := `{"type":"number","payload":{"value":42}}`

	for _, raw := range []string{textMsg, numMsg} {
		var env RTIEnvelope
		json.Unmarshal([]byte(raw), &env)

		switch env.Type {
		case "text":
			var p struct{ Content string `json:"content"` }
			json.Unmarshal(env.Payload, &p)
			fmt.Printf("  Text application: %s\n", p.Content)
			// Output:   Text application: Request for road budget data
		case "number":
			var p struct{ Value int `json:"value"` }
			json.Unmarshal(env.Payload, &p)
			fmt.Printf("  Number application: %d\n", p.Value)
			// Output:   Number application: 42
		}
	}

	// ──────────────────────────────────────────────────────────────
	// SECTION 8 — Dynamic JSON with map[string]any
	// ──────────────────────────────────────────────────────────────
	// WHY: When you don't know the JSON structure at compile time,
	// unmarshal into map[string]any. Values become Go types:
	// string, float64, bool, nil, []any, map[string]any.

	fmt.Println("\n--- Dynamic JSON with map[string]any ---")

	unknownJSON := `{"department":"Education","budget_crores":7,"active":true,"tags":["primary","secondary"],"meta":{"officer":"Gupta"}}`

	var dynamic map[string]any
	json.Unmarshal([]byte(unknownJSON), &dynamic)

	fmt.Println("Dynamic keys:")
	for k, v := range dynamic {
		fmt.Printf("  %s: %v (type: %T)\n", k, v, v)
	}
	// WHY: Numbers become float64, arrays become []any, objects become map[string]any

	// Access specific fields with type assertion
	name, ok := dynamic["department"].(string)
	fmt.Printf("\nType assertion: department=%q, ok=%v\n", name, ok)
	// Output: Type assertion: department="Education", ok=true

	count, ok := dynamic["budget_crores"].(float64) // WHY: JSON numbers are always float64
	fmt.Printf("Type assertion: budget_crores=%.0f, ok=%v\n", count, ok)
	// Output: Type assertion: budget_crores=7, ok=true

	// ──────────────────────────────────────────────────────────────
	// SECTION 9 — Streaming with json.Encoder / json.Decoder
	// ──────────────────────────────────────────────────────────────
	// WHY: Encoder/Decoder work with io.Writer/io.Reader streams.
	// They're more efficient than Marshal/Unmarshal for HTTP
	// responses and large data because they avoid extra copies.

	fmt.Println("\n--- Streaming json.Encoder / json.Decoder ---")

	// Encode to a buffer (simulating writing to a network connection)
	var buf bytes.Buffer
	encoder := json.NewEncoder(&buf)

	items := []TaggedRTIRequest{
		{From: "Sharma", To: "Collector", Department: "Revenue", Urgent: false},
		{From: "Sharma", To: "Collector", Department: "Education", Urgent: true},
	}

	for _, item := range items {
		encoder.Encode(item) // WHY: each Encode writes one JSON object + newline
	}
	fmt.Println("Encoded stream:")
	fmt.Print(buf.String())
	// Output: {"from":"Sharma","to":"Collector","department":"Revenue","urgent":false}
	// Output: {"from":"Sharma","to":"Collector","department":"Education","urgent":true}

	// Decode from a reader (simulating reading from a network connection)
	decoder := json.NewDecoder(strings.NewReader(buf.String()))
	fmt.Println("Decoded stream:")
	for decoder.More() {
		var m TaggedRTIRequest
		decoder.Decode(&m)
		fmt.Printf("  From=%s, Urgent=%v\n", m.From, m.Urgent)
	}
	// Output:   From=Sharma, Urgent=false
	// Output:   From=Sharma, Urgent=true

	// ──────────────────────────────────────────────────────────────
	// SECTION 10 — Pretty printing with json.MarshalIndent
	// ──────────────────────────────────────────────────────────────
	// WHY: json.MarshalIndent produces human-readable JSON with
	// indentation. json.Indent reformats existing JSON bytes.

	fmt.Println("\n--- Pretty printing ---")

	prettyData := map[string]any{
		"officer":     "Sharma",
		"applications": 3,
		"departments": []string{"Revenue", "Public Works"},
	}

	// MarshalIndent — prefix and indent strings
	pretty, _ := json.MarshalIndent(prettyData, "", "  ")
	fmt.Println("MarshalIndent:")
	fmt.Println(string(pretty))
	// Output: {
	// Output:   "applications": 3,
	// Output:   "departments": [
	// Output:     "Revenue",
	// Output:     "Public Works"
	// Output:   ],
	// Output:   "officer": "Sharma"
	// Output: }

	// json.Indent — reformat existing compact JSON
	compact := []byte(`{"a":1,"b":[2,3]}`)
	var indented bytes.Buffer
	json.Indent(&indented, compact, "", "    ")
	fmt.Println("json.Indent:")
	fmt.Println(indented.String())
	// Output: {
	// Output:     "a": 1,
	// Output:     "b": [
	// Output:         2,
	// Output:         3
	// Output:     ]
	// Output: }

	fmt.Println("\nSharma has finished all RTI translations for the day.")
	// Output: Sharma has finished all RTI translations for the day.
}

// ──────────────────────────────────────────────────────────────
// Custom type with MarshalJSON / UnmarshalJSON
// ──────────────────────────────────────────────────────────────

// GovNotification has a custom date format (date only, no time).
type GovNotification struct {
	Name string    `json:"name"`
	When time.Time `json:"when"`
}

// MarshalJSON formats the date as "YYYY-MM-DD" instead of RFC3339.
func (g GovNotification) MarshalJSON() ([]byte, error) {
	type Alias GovNotification // WHY: Alias prevents infinite recursion
	return json.Marshal(&struct {
		When string `json:"when"`
		*Alias
	}{
		When:  g.When.Format("2006-01-02"),
		Alias: (*Alias)(&g),
	})
}

// UnmarshalJSON parses the "YYYY-MM-DD" date format.
func (g *GovNotification) UnmarshalJSON(data []byte) error {
	type Alias GovNotification
	aux := &struct {
		When string `json:"when"`
		*Alias
	}{
		Alias: (*Alias)(g),
	}
	if err := json.Unmarshal(data, aux); err != nil {
		return err
	}
	t, err := time.Parse("2006-01-02", aux.When)
	if err != nil {
		return err
	}
	g.When = t
	return nil
}

// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. json.Marshal converts Go structs to JSON bytes.
//    json.Unmarshal converts JSON bytes to Go structs.
//
// 2. Struct tags control field names: `json:"field_name"`.
//    Use them to match API naming conventions (camelCase, snake_case).
//
// 3. `json:",omitempty"` omits zero-value fields from output.
//    `json:"-"` completely hides a field (like Aadhaar numbers).
//
// 4. json.Encoder/Decoder stream JSON to/from io.Writer/Reader.
//    Prefer these for HTTP responses and large data.
//
// 5. Implement MarshalJSON/UnmarshalJSON on your types for
//    custom formats (dates, enums, flattening).
//
// 6. json.RawMessage delays parsing of unknown-shape JSON.
//    Parse the envelope first, then decide how to parse payload.
//
// 7. map[string]any handles truly dynamic JSON. Remember:
//    numbers are float64, arrays are []any, objects are
//    map[string]any. Use type assertions to extract values.
//
// 8. json.MarshalIndent and json.Indent produce human-readable
//    output — great for logging and debugging.
//
// 9. Unmarshal silently ignores unknown fields by default.
//    Missing fields get their zero value.
//
// 10. Sharma's RTI rule: "Tag every field, hide secrets
//     with dash, omit empties for clean output, and always
//     check errors — a mistranslation can delay justice."
// ============================================================
