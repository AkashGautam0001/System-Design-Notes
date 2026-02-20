// ============================================================
//  FILE 27 : Reflection
// ============================================================
//  Topic  : reflect.TypeOf, reflect.ValueOf, Kind vs Type,
//           iterating struct fields, reading struct tags,
//           setting values, reflect.DeepEqual, practical
//           validation example
//
//  WHY THIS MATTERS:
//  Reflection lets a program examine and manipulate its own
//  types at runtime. Serialization (JSON, XML), ORMs, form
//  validators, and dependency injection all rely on it. But
//  reflection is slow, bypasses compile-time safety, and makes
//  code hard to read — so use it sparingly, only when static
//  types can't solve the problem.
// ============================================================

// ============================================================
// STORY: Ayushman X-Ray Lab
// In the Ayushman Bharat government hospital, the X-ray lab
// examines patients (structs) without knowing their type in
// advance — revealing their bones (fields), their organs
// (methods), and even the labels stitched to their charts
// (struct tags). reflect.TypeOf = reading the patient chart.
// reflect.ValueOf = looking at the X-ray. Powerful, but you
// wouldn't X-ray a patient just to check their name badge.
// Use reflection only when you truly need to see inside the
// unknown.
// ============================================================

package main

import (
	"fmt"
	"reflect"
	"strings"
)

// ============================================================
// EXAMPLE BLOCK 1 — Examining Types and Values
// ============================================================

// ──────────────────────────────────────────────────────────────
// SECTION 1 — reflect.TypeOf and reflect.ValueOf
// ──────────────────────────────────────────────────────────────
// WHY: TypeOf returns the type; ValueOf returns the value.
// These are the two entry points into the reflect package.

// ──────────────────────────────────────────────────────────────
// SECTION 2 — Kind vs Type
// ──────────────────────────────────────────────────────────────
// WHY: Type is the specific declared type (e.g. "Patient").
// Kind is the underlying category (e.g. "struct", "int", "slice").
// A named type like `type AadhaarNumber int` has Type "AadhaarNumber" but Kind "int".

// AadhaarNumber is a named type for demonstration.
type AadhaarNumber int

// ──────────────────────────────────────────────────────────────
// SECTION 3 — Examining struct fields and tags
// ──────────────────────────────────────────────────────────────
// WHY: Struct tags carry metadata (JSON names, validation rules,
// DB column names). Reflection is the ONLY way to read them at
// runtime — this is how encoding/json and ORMs work.

// Patient is a sample struct with tags.
type Patient struct {
	Name    string `json:"name"  validate:"required"`
	Email   string `json:"email" validate:"required,email"`
	Age     int    `json:"age"   validate:"min=0,max=150"`
	Village string `json:"village" validate:""`
}

// ──────────────────────────────────────────────────────────────
// SECTION 4 — Inspecting any value dynamically
// ──────────────────────────────────────────────────────────────
// WHY: A generic inspect function shows how reflection works
// for any type, similar to what a debugger or serializer does.

// Inspect prints type information for any value.
func Inspect(x interface{}) {
	t := reflect.TypeOf(x)
	v := reflect.ValueOf(x)

	fmt.Printf("  Type: %v\n", t)
	fmt.Printf("  Kind: %v\n", t.Kind())
	fmt.Printf("  Value: %v\n", v)

	// If it's a struct, list fields
	if t.Kind() == reflect.Struct {
		fmt.Printf("  Fields (%d):\n", t.NumField())
		for i := 0; i < t.NumField(); i++ {
			field := t.Field(i)
			value := v.Field(i)
			jsonTag := field.Tag.Get("json")
			validateTag := field.Tag.Get("validate")
			fmt.Printf("    %d. %s (%s) = %v  [json:%q validate:%q]\n",
				i+1, field.Name, field.Type, value, jsonTag, validateTag)
		}
	}
}

// ============================================================
// EXAMPLE BLOCK 2 — Setting Values & Practical Patterns
// ============================================================

// ──────────────────────────────────────────────────────────────
// SECTION 5 — Setting values via reflection
// ──────────────────────────────────────────────────────────────
// WHY: To modify a value through reflection it must be
// "addressable" — you must pass a pointer. This is how
// json.Unmarshal populates structs from JSON bytes.

// SetField sets a struct field by name. The target must be a pointer.
func SetField(target interface{}, fieldName string, newValue interface{}) error {
	v := reflect.ValueOf(target)

	// Must be a pointer to a struct
	if v.Kind() != reflect.Pointer || v.Elem().Kind() != reflect.Struct {
		return fmt.Errorf("target must be a pointer to a struct")
	}

	field := v.Elem().FieldByName(fieldName)
	if !field.IsValid() {
		return fmt.Errorf("no field named %q", fieldName)
	}
	if !field.CanSet() {
		return fmt.Errorf("field %q is not settable (unexported?)", fieldName)
	}

	newVal := reflect.ValueOf(newValue)
	if field.Type() != newVal.Type() {
		return fmt.Errorf("type mismatch: field is %s, value is %s",
			field.Type(), newVal.Type())
	}

	field.Set(newVal)
	return nil
}

// ──────────────────────────────────────────────────────────────
// SECTION 6 — reflect.DeepEqual
// ──────────────────────────────────────────────────────────────
// WHY: Slices and maps are not comparable with ==. DeepEqual
// compares them recursively. It's used heavily in testing.

// ──────────────────────────────────────────────────────────────
// SECTION 7 — Practical example: simple struct validator
// ──────────────────────────────────────────────────────────────
// WHY: This is exactly how real validation libraries work.
// Read the "validate" tag, parse the rules, check the fields.
// It demonstrates struct field iteration + tag parsing + value
// inspection — the three pillars of reflection.

// ValidationError holds one field's validation failure.
type ValidationError struct {
	Field   string
	Message string
}

func (e ValidationError) Error() string {
	return fmt.Sprintf("%s: %s", e.Field, e.Message)
}

// Validate checks a struct's fields against "validate" tags.
// Supported rules: required, min=N, max=N, email.
func Validate(s interface{}) []ValidationError {
	var errors []ValidationError

	v := reflect.ValueOf(s)
	t := reflect.TypeOf(s)

	// If pointer, dereference
	if t.Kind() == reflect.Pointer {
		v = v.Elem()
		t = t.Elem()
	}

	if t.Kind() != reflect.Struct {
		return append(errors, ValidationError{
			Field: "(root)", Message: "expected a struct",
		})
	}

	for i := 0; i < t.NumField(); i++ {
		field := t.Field(i)
		value := v.Field(i)
		tag := field.Tag.Get("validate")

		if tag == "" {
			continue
		}

		rules := strings.Split(tag, ",")
		for _, rule := range rules {
			rule = strings.TrimSpace(rule)

			switch {
			case rule == "required":
				if isZero(value) {
					errors = append(errors, ValidationError{
						Field:   field.Name,
						Message: "is required",
					})
				}

			case rule == "email":
				if value.Kind() == reflect.String {
					str := value.String()
					if str != "" && !strings.Contains(str, "@") {
						errors = append(errors, ValidationError{
							Field:   field.Name,
							Message: "must be a valid email",
						})
					}
				}

			case strings.HasPrefix(rule, "min="):
				if value.Kind() == reflect.Int {
					var minVal int
					fmt.Sscanf(rule, "min=%d", &minVal)
					if int(value.Int()) < minVal {
						errors = append(errors, ValidationError{
							Field:   field.Name,
							Message: fmt.Sprintf("must be >= %d", minVal),
						})
					}
				}

			case strings.HasPrefix(rule, "max="):
				if value.Kind() == reflect.Int {
					var maxVal int
					fmt.Sscanf(rule, "max=%d", &maxVal)
					if int(value.Int()) > maxVal {
						errors = append(errors, ValidationError{
							Field:   field.Name,
							Message: fmt.Sprintf("must be <= %d", maxVal),
						})
					}
				}
			}
		}
	}

	return errors
}

// isZero reports whether a reflect.Value is the zero value for its type.
func isZero(v reflect.Value) bool {
	switch v.Kind() {
	case reflect.String:
		return v.String() == ""
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		return v.Int() == 0
	case reflect.Float32, reflect.Float64:
		return v.Float() == 0
	case reflect.Bool:
		return !v.Bool()
	case reflect.Slice, reflect.Map:
		return v.IsNil() || v.Len() == 0
	case reflect.Pointer, reflect.Interface:
		return v.IsNil()
	default:
		return false
	}
}

func main() {
	fmt.Println("===== FILE 27: Reflection =====")
	fmt.Println()

	// ============================================================
	// BLOCK 1 — Examining Types and Values
	// ============================================================

	fmt.Println("--- Block 1: Examining Types and Values ---")
	fmt.Println()

	// ── TypeOf and ValueOf ──
	name := "Dr. Rajesh Kumar"
	score := 42
	pi := 3.14159
	active := true

	fmt.Println("reflect.TypeOf / ValueOf:")
	fmt.Printf("  %q → Type: %v, Value: %v\n",
		name, reflect.TypeOf(name), reflect.ValueOf(name))
	// Output:   "Dr. Rajesh Kumar" → Type: string, Value: Dr. Rajesh Kumar
	fmt.Printf("  %d → Type: %v, Value: %v\n",
		score, reflect.TypeOf(score), reflect.ValueOf(score))
	// Output:   42 → Type: int, Value: 42
	fmt.Printf("  %.5f → Type: %v, Value: %v\n",
		pi, reflect.TypeOf(pi), reflect.ValueOf(pi))
	// Output:   3.14159 → Type: float64, Value: 3.14159
	fmt.Printf("  %v → Type: %v, Value: %v\n",
		active, reflect.TypeOf(active), reflect.ValueOf(active))
	// Output:   true → Type: bool, Value: true

	fmt.Println()

	// ── Kind vs Type ──
	fmt.Println("Kind vs Type:")
	var myAadhaar AadhaarNumber = 123456789012
	t := reflect.TypeOf(myAadhaar)
	fmt.Printf("  AadhaarNumber → Type: %v, Kind: %v\n", t, t.Kind())
	// Output:   AadhaarNumber → Type: main.AadhaarNumber, Kind: int
	// WHY: Type is "main.AadhaarNumber" (the named type), Kind is "int"
	// (the underlying category). They are not the same thing!

	nums := []int{1, 2, 3}
	t2 := reflect.TypeOf(nums)
	fmt.Printf("  []int → Type: %v, Kind: %v, Elem: %v\n", t2, t2.Kind(), t2.Elem())
	// Output:   []int → Type: []int, Kind: slice, Elem: int

	m := map[string]int{"a": 1}
	t3 := reflect.TypeOf(m)
	fmt.Printf("  map → Type: %v, Kind: %v, Key: %v, Elem: %v\n",
		t3, t3.Kind(), t3.Key(), t3.Elem())
	// Output:   map → Type: map[string]int, Kind: map, Key: string, Elem: int

	fmt.Println()

	// ── Examining struct fields and tags ──
	fmt.Println("Inspecting a Patient struct:")
	p := Patient{Name: "Ramesh Gupta", Email: "ramesh@hospital.in", Age: 45, Village: "Sultanpur"}
	Inspect(p)
	// Output:   Type: main.Patient
	// Output:   Kind: struct
	// Output:   Value: {Ramesh Gupta ramesh@hospital.in 45 Sultanpur}
	// Output:   Fields (4):
	// Output:     1. Name (string) = Ramesh Gupta  [json:"name" validate:"required"]
	// Output:     2. Email (string) = ramesh@hospital.in  [json:"email" validate:"required,email"]
	// Output:     3. Age (int) = 45  [json:"age" validate:"min=0,max=150"]
	// Output:     4. Village (string) = Sultanpur  [json:"village" validate:""]

	fmt.Println()

	// ── Reading tags manually ──
	fmt.Println("Reading struct tags manually:")
	pt := reflect.TypeOf(Patient{})
	for i := 0; i < pt.NumField(); i++ {
		f := pt.Field(i)
		fmt.Printf("  %s → json=%q, validate=%q\n",
			f.Name, f.Tag.Get("json"), f.Tag.Get("validate"))
	}
	// Output:   Name → json="name", validate="required"
	// Output:   Email → json="email", validate="required,email"
	// Output:   Age → json="age", validate="min=0,max=150"
	// Output:   Village → json="village", validate=""

	fmt.Println()

	// ============================================================
	// BLOCK 2 — Setting Values & Practical Patterns
	// ============================================================

	fmt.Println("--- Block 2: Setting Values & Practical Patterns ---")
	fmt.Println()

	// ── Setting values via reflection ──
	fmt.Println("Setting values via reflection:")
	target := &Patient{Name: "Suresh", Email: "suresh@hospital.in", Age: 35}
	fmt.Printf("  Before: %+v\n", *target)
	// Output:   Before: {Name:Suresh Email:suresh@hospital.in Age:35 Village:}

	err := SetField(target, "Name", "Suresh Kumar")
	if err != nil {
		fmt.Println("  Error:", err)
	}
	err = SetField(target, "Age", 36)
	if err != nil {
		fmt.Println("  Error:", err)
	}
	fmt.Printf("  After:  %+v\n", *target)
	// Output:   After:  {Name:Suresh Kumar Email:suresh@hospital.in Age:36 Village:}

	// Trying to set a non-existent field
	err = SetField(target, "Nonexistent", "value")
	fmt.Println("  Set Nonexistent:", err)
	// Output:   Set Nonexistent: no field named "Nonexistent"

	// Trying to set with wrong type
	err = SetField(target, "Age", "not an int")
	fmt.Println("  Set wrong type:", err)
	// Output:   Set wrong type: type mismatch: field is int, value is string

	// WHY: You MUST pass a pointer for values to be settable.
	// reflect.ValueOf(struct).Field(i).CanSet() returns false
	// for non-pointer targets. This mirrors how json.Unmarshal
	// requires a pointer argument.

	fmt.Println()

	// ── Why non-pointer fails ──
	fmt.Println("Addressability check:")
	directVal := reflect.ValueOf(Patient{Name: "Test"})
	ptrVal := reflect.ValueOf(&Patient{Name: "Test"}).Elem()
	fmt.Printf("  Value (non-ptr) CanSet: %v\n", directVal.Field(0).CanSet())
	// Output:   Value (non-ptr) CanSet: false
	fmt.Printf("  Value (ptr)     CanSet: %v\n", ptrVal.Field(0).CanSet())
	// Output:   Value (ptr)     CanSet: true

	fmt.Println()

	// ── reflect.DeepEqual ──
	fmt.Println("reflect.DeepEqual:")

	s1 := []int{1, 2, 3}
	s2 := []int{1, 2, 3}
	s3 := []int{1, 2, 4}
	fmt.Printf("  %v == %v → %v\n", s1, s2, reflect.DeepEqual(s1, s2))
	// Output:   [1 2 3] == [1 2 3] → true
	fmt.Printf("  %v == %v → %v\n", s1, s3, reflect.DeepEqual(s1, s3))
	// Output:   [1 2 3] == [1 2 4] → false

	m1 := map[string]int{"a": 1, "b": 2}
	m2 := map[string]int{"b": 2, "a": 1}
	m3 := map[string]int{"a": 1, "b": 3}
	fmt.Printf("  %v == %v → %v\n", m1, m2, reflect.DeepEqual(m1, m2))
	// Output:   map[a:1 b:2] == map[a:1 b:2] → true
	fmt.Printf("  %v == %v → %v\n", m1, m3, reflect.DeepEqual(m1, m3))
	// Output:   map[a:1 b:2] == map[a:1 b:3] → false

	// Structs with nested slices
	p1 := Patient{Name: "Ramesh", Email: "ramesh@hospital.in", Age: 45}
	p2 := Patient{Name: "Ramesh", Email: "ramesh@hospital.in", Age: 45}
	p3 := Patient{Name: "Sunita", Email: "sunita@hospital.in", Age: 38}
	fmt.Printf("  p1 == p2 → %v\n", reflect.DeepEqual(p1, p2))
	// Output:   p1 == p2 → true
	fmt.Printf("  p1 == p3 → %v\n", reflect.DeepEqual(p1, p3))
	// Output:   p1 == p3 → false

	// WHY: DeepEqual works on slices, maps, structs, and nested
	// combinations. It's invaluable in tests (assert.Equal uses
	// it internally). But be careful — it's recursive and uses
	// reflection, so it's slower than manual comparisons.

	fmt.Println()

	// ── Practical: Struct Validator ──
	fmt.Println("Struct Validator (using tags):")
	fmt.Println()

	// Valid patient
	valid := Patient{Name: "Ramesh Gupta", Email: "ramesh@hospital.in", Age: 45}
	errs := Validate(valid)
	fmt.Printf("  Validate(%+v):\n", valid)
	if len(errs) == 0 {
		fmt.Println("    No errors — all valid!")
	}
	// Output:     No errors — all valid!

	fmt.Println()

	// Missing name (required)
	noName := Patient{Name: "", Email: "suresh@hospital.in", Age: 35}
	errs = Validate(noName)
	fmt.Printf("  Validate(%+v):\n", noName)
	for _, e := range errs {
		fmt.Printf("    ERROR: %s\n", e)
	}
	// Output:     ERROR: Name: is required

	fmt.Println()

	// Bad email
	badEmail := Patient{Name: "Sunita Devi", Email: "not-an-email", Age: 38}
	errs = Validate(badEmail)
	fmt.Printf("  Validate(%+v):\n", badEmail)
	for _, e := range errs {
		fmt.Printf("    ERROR: %s\n", e)
	}
	// Output:     ERROR: Email: must be a valid email

	fmt.Println()

	// Age out of range
	badAge := Patient{Name: "Babulal", Email: "babulal@hospital.in", Age: 200}
	errs = Validate(badAge)
	fmt.Printf("  Validate(%+v):\n", badAge)
	for _, e := range errs {
		fmt.Printf("    ERROR: %s\n", e)
	}
	// Output:     ERROR: Age: must be <= 150

	fmt.Println()

	// Multiple errors
	allBad := Patient{Name: "", Email: "nope", Age: -5}
	errs = Validate(allBad)
	fmt.Printf("  Validate(%+v):\n", allBad)
	for _, e := range errs {
		fmt.Printf("    ERROR: %s\n", e)
	}
	// Output:     ERROR: Name: is required
	// Output:     ERROR: Email: must be a valid email
	// Output:     ERROR: Age: must be >= 0

	fmt.Println()

	// ── When to use reflection ──
	fmt.Println("--- When to Use Reflection ---")
	fmt.Println("DO use reflection for:")
	fmt.Println("  - Serialization / deserialization (JSON, XML, etc.)")
	fmt.Println("  - ORM / database mapping (struct → row)")
	fmt.Println("  - Validation frameworks (reading struct tags)")
	fmt.Println("  - Dependency injection containers")
	fmt.Println("  - Test utilities (DeepEqual, test fixtures)")
	fmt.Println()
	fmt.Println("DON'T use reflection for:")
	fmt.Println("  - Normal business logic (too slow, too fragile)")
	fmt.Println("  - Anything solvable with generics or interfaces")
	fmt.Println("  - Performance-critical hot paths")
	fmt.Println()
	fmt.Println("Ayushman X-Ray Lab rule: 'X-ray only what you cannot")
	fmt.Println("identify by reading the patient chart.'")
}

// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. reflect.TypeOf(x) returns the Type; reflect.ValueOf(x)
//    returns the Value. These are the two entry points.
//
// 2. Kind is the underlying category (struct, int, slice, map).
//    Type is the declared name (Patient, AadhaarNumber). A named
//    type like `type AadhaarNumber int` has Kind "int" but Type
//    "main.AadhaarNumber".
//
// 3. Iterate struct fields with Type.NumField() and Type.Field(i).
//    Read tags with Field.Tag.Get("json"). This is how
//    encoding/json discovers field names.
//
// 4. To set a value via reflection, you MUST pass a pointer.
//    reflect.ValueOf(&x).Elem().Field(i).Set(...). Non-pointer
//    values are not addressable and CanSet() returns false.
//
// 5. reflect.DeepEqual compares slices, maps, structs, and
//    nested structures recursively. Essential for testing, but
//    slower than manual comparison.
//
// 6. Struct tags + reflection = powerful metadata system.
//    Validation, JSON mapping, DB columns — all built on tags.
//
// 7. Reflection bypasses compile-time safety. Mistakes become
//    runtime panics. Use it only when static types and generics
//    cannot solve the problem.
//
// 8. Ayushman X-Ray Lab rule: "The X-ray machine is in the back
//    room, behind a locked door, for a reason. Don't drag it
//    out for routine checkups."
// ============================================================
