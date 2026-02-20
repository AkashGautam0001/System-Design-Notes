// ============================================================
//  FILE 11 : Error Handling
// ============================================================
//  Topic  : The error interface, errors.New, fmt.Errorf, error
//           wrapping with %w, errors.Is, errors.As, custom
//           error types, sentinel errors, errors.Join,
//           practical validation patterns.
//
//  WHY THIS MATTERS:
//  Go rejects exceptions in favor of explicit error values.
//  Every function that can fail returns an error, and callers
//  must handle it. This makes error paths visible, testable,
//  and impossible to accidentally ignore (the compiler helps).
//  Mastering Go error patterns is non-negotiable.
// ============================================================

// ============================================================
// STORY: Railway Safety Inspector
// Inspector Sharma checks every railway system for failures.
// He walks the tracks, inspects signals, and examines coaches
// — every anomaly is logged, classified, and either fixed or
// escalated. His motto: "No defect goes unchecked, no failure
// goes unrecorded."
// ============================================================

package main

import (
	"errors"
	"fmt"
	"strconv"
	"strings"
)

// ────────────────────────────────────────────────────────────
// Sentinel Errors (package-level, by convention)
// ────────────────────────────────────────────────────────────
// WHY: Sentinel errors are package-level variables that callers
// can compare against. Prefix with Err by convention.

var (
	ErrNotFound     = errors.New("not found")
	ErrUnauthorized = errors.New("unauthorized")
	ErrTimeout      = errors.New("operation timed out")
)

// ────────────────────────────────────────────────────────────
// Custom Error Types
// ────────────────────────────────────────────────────────────

type ValidationError struct {
	Field   string
	Message string
}

func (e *ValidationError) Error() string {
	return fmt.Sprintf("validation failed on %q: %s", e.Field, e.Message)
}

type InspectionError struct {
	System  string
	Code    int
	Message string
	Err     error // wrapped inner error
}

func (e *InspectionError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("[%s] error %d: %s (caused by: %v)", e.System, e.Code, e.Message, e.Err)
	}
	return fmt.Sprintf("[%s] error %d: %s", e.System, e.Code, e.Message)
}

func (e *InspectionError) Unwrap() error {
	return e.Err
}

func main() {

	// ──────────────────────────────────────────────────────────────
	// EXAMPLE BLOCK 1 — Basic Errors, errors.New, fmt.Errorf,
	//                    The Value+Error Pattern
	// ──────────────────────────────────────────────────────────────

	// ────────────────────────────────────────────────────────────
	// 1.1 — The error Interface
	// ────────────────────────────────────────────────────────────
	// WHY: error is a built-in interface with one method:
	//   type error interface { Error() string }
	// Functions return (value, error) — the "comma error" pattern.

	fmt.Println("--- The error Interface ---")
	fmt.Println("type error interface { Error() string }")
	fmt.Println("Convention: return (value, error) — nil error means success")

	// ────────────────────────────────────────────────────────────
	// 1.2 — errors.New: Simple Error Creation
	// ────────────────────────────────────────────────────────────
	// WHY: errors.New creates a basic error with a message.

	fmt.Println("\n--- errors.New ---")
	inspectTrackPressure := func(psi float64) (string, error) {
		if psi < 0 {
			return "", errors.New("track pressure cannot be negative")
		}
		if psi > 100 {
			return "", errors.New("track pressure exceeds safe limit")
		}
		return fmt.Sprintf("%.1f PSI — within safe range", psi), nil
	}

	result, err := inspectTrackPressure(75.0)
	if err != nil {
		fmt.Println("ERROR:", err)
	} else {
		fmt.Println("OK:", result)
	}
	// Output: OK: 75.0 PSI — within safe range

	_, err = inspectTrackPressure(150.0)
	if err != nil {
		fmt.Println("ERROR:", err)
	}
	// Output: ERROR: track pressure exceeds safe limit

	// ────────────────────────────────────────────────────────────
	// 1.3 — fmt.Errorf: Formatted Error Messages
	// ────────────────────────────────────────────────────────────
	// WHY: fmt.Errorf lets you include dynamic values in errors.

	fmt.Println("\n--- fmt.Errorf ---")
	inspectSignalTemp := func(signalName string, temp float64) error {
		if temp > 200 {
			return fmt.Errorf("signal %q overheating: %.1f°C exceeds 200°C limit", signalName, temp)
		}
		return nil
	}

	err = inspectSignalTemp("Signal-Patna-Jn", 250.3)
	if err != nil {
		fmt.Println("ERROR:", err)
	}
	// Output: ERROR: signal "Signal-Patna-Jn" overheating: 250.3°C exceeds 200°C limit

	// ────────────────────────────────────────────────────────────
	// 1.4 — The Value+Error Pattern
	// ────────────────────────────────────────────────────────────
	// WHY: This is Go's fundamental error handling pattern.
	// Always check error FIRST, before using the value.

	fmt.Println("\n--- Value+Error Pattern ---")
	parseReading := func(input string) (float64, error) {
		val, err := strconv.ParseFloat(input, 64)
		if err != nil {
			return 0, fmt.Errorf("invalid reading %q: %v", input, err)
		}
		return val, nil
	}

	readings := []string{"42.5", "not_a_number", "98.6"}
	for _, r := range readings {
		val, err := parseReading(r)
		if err != nil {
			fmt.Printf("  FAIL: %v\n", err)
		} else {
			fmt.Printf("  OK:   %.1f\n", val)
		}
	}
	// Output:
	//   OK:   42.5
	//   FAIL: invalid reading "not_a_number": strconv.ParseFloat: parsing "not_a_number": invalid syntax
	//   OK:   98.6

	// ────────────────────────────────────────────────────────────
	// 1.5 — Don't Ignore Errors!
	// ────────────────────────────────────────────────────────────
	// WHY: Ignoring errors with _ is a code smell. The only
	// acceptable use is when you truly cannot handle the error.

	fmt.Println("\n--- Don't Ignore Errors ---")
	fmt.Println("BAD:  val, _ := strconv.Atoi(input)  // swallows error")
	fmt.Println("GOOD: val, err := strconv.Atoi(input) // handle error")

	// ──────────────────────────────────────────────────────────────
	// EXAMPLE BLOCK 2 — Error Wrapping with %w, errors.Is(),
	//                    errors.As(), Unwrapping Chains
	// ──────────────────────────────────────────────────────────────

	// ────────────────────────────────────────────────────────────
	// 2.1 — Error Wrapping with %w
	// ────────────────────────────────────────────────────────────
	// WHY: %w wraps an error, preserving the chain. This lets
	// callers inspect the cause with errors.Is/errors.As.

	fmt.Println("\n--- Error Wrapping with %w ---")
	findCoach := func(name string) error {
		if name != "Coach-S1" {
			return ErrNotFound
		}
		return nil
	}

	inspectCoach := func(name string) error {
		err := findCoach(name)
		if err != nil {
			return fmt.Errorf("inspecting %q: %w", name, err)
		}
		return nil
	}

	auditCoach := func(name string) error {
		err := inspectCoach(name)
		if err != nil {
			return fmt.Errorf("audit failed: %w", err)
		}
		return nil
	}

	err = auditCoach("Coach-B2")
	fmt.Println("Wrapped error:", err)
	// Output: Wrapped error: audit failed: inspecting "Coach-B2": not found
	// WHY: Each layer adds context while preserving the original error.

	// ────────────────────────────────────────────────────────────
	// 2.2 — errors.Is: Checking Error Identity
	// ────────────────────────────────────────────────────────────
	// WHY: errors.Is traverses the wrap chain to find a target error.
	// Use it instead of == for wrapped errors.

	fmt.Println("\n--- errors.Is ---")
	fmt.Println("Is ErrNotFound?", errors.Is(err, ErrNotFound))
	// Output: Is ErrNotFound? true
	fmt.Println("Is ErrTimeout?", errors.Is(err, ErrTimeout))
	// Output: Is ErrTimeout? false
	// WHY: errors.Is unwraps the chain automatically.

	// Practical usage pattern
	if errors.Is(err, ErrNotFound) {
		fmt.Println("Action: Coach not found — check coach registry")
	}
	// Output: Action: Coach not found — check coach registry

	// ────────────────────────────────────────────────────────────
	// 2.3 — errors.As: Extracting Error Types
	// ────────────────────────────────────────────────────────────
	// WHY: errors.As extracts a specific error TYPE from the chain.
	// It's the type-assertion equivalent for wrapped errors.

	fmt.Println("\n--- errors.As ---")
	validateCoach := func() error {
		innerErr := &ValidationError{Field: "brake-pressure", Message: "exceeds safe range"}
		return fmt.Errorf("coach check: %w", innerErr)
	}

	err = validateCoach()
	fmt.Println("Wrapped validation error:", err)
	// Output: Wrapped validation error: coach check: validation failed on "brake-pressure": exceeds safe range

	var valErr *ValidationError
	if errors.As(err, &valErr) {
		fmt.Printf("Extracted — Field: %q, Message: %q\n", valErr.Field, valErr.Message)
	}
	// Output: Extracted — Field: "brake-pressure", Message: "exceeds safe range"
	// WHY: errors.As unwraps and type-asserts in one step.

	// ────────────────────────────────────────────────────────────
	// 2.4 — Unwrapping Chains Manually
	// ────────────────────────────────────────────────────────────

	fmt.Println("\n--- Unwrapping Chain ---")
	chain := fmt.Errorf("layer 3: %w",
		fmt.Errorf("layer 2: %w",
			fmt.Errorf("layer 1: %w",
				ErrTimeout)))

	fmt.Println("Full chain:", chain)
	// Output: Full chain: layer 3: layer 2: layer 1: operation timed out

	// Walk the chain
	current := error(chain)
	depth := 0
	for current != nil {
		fmt.Printf("  depth %d: %v\n", depth, current)
		current = errors.Unwrap(current)
		depth++
	}
	// Output:
	//   depth 0: layer 3: layer 2: layer 1: operation timed out
	//   depth 1: layer 2: layer 1: operation timed out
	//   depth 2: layer 1: operation timed out
	//   depth 3: operation timed out

	// ──────────────────────────────────────────────────────────────
	// EXAMPLE BLOCK 3 — Custom Error Types, Sentinel Errors,
	//                    errors.Join, Practical Patterns
	// ──────────────────────────────────────────────────────────────

	// ────────────────────────────────────────────────────────────
	// 3.1 — Custom Error Types
	// ────────────────────────────────────────────────────────────
	// WHY: Struct errors carry structured data — error codes,
	// field names, nested errors. They implement Unwrap() for chains.

	fmt.Println("\n--- Custom Error Types ---")
	checkTrack := func() error {
		return &InspectionError{
			System:  "Track-Rajdhani-Section",
			Code:    5001,
			Message: "track crack detected near km 42",
			Err:     ErrTimeout,
		}
	}

	err = checkTrack()
	fmt.Println("Inspection error:", err)
	// Output: Inspection error: [Track-Rajdhani-Section] error 5001: track crack detected near km 42 (caused by: operation timed out)

	// errors.Is works through Unwrap
	fmt.Println("Caused by timeout?", errors.Is(err, ErrTimeout))
	// Output: Caused by timeout? true

	// errors.As extracts the InspectionError
	var inspErr *InspectionError
	if errors.As(err, &inspErr) {
		fmt.Printf("System: %s, Code: %d\n", inspErr.System, inspErr.Code)
	}
	// Output: System: Track-Rajdhani-Section, Code: 5001

	// ────────────────────────────────────────────────────────────
	// 3.2 — Sentinel Errors
	// ────────────────────────────────────────────────────────────
	// WHY: Sentinel errors are package-level variables that act
	// as known error identities. Callers use errors.Is() to check.

	fmt.Println("\n--- Sentinel Errors ---")
	lookupEmployee := func(id int) (string, error) {
		employees := map[int]string{1: "Sharma", 2: "Pappu"}
		name, ok := employees[id]
		if !ok {
			return "", fmt.Errorf("employee %d: %w", id, ErrNotFound)
		}
		return name, nil
	}

	authorizeEmployee := func(id int, role string) error {
		if role != "inspector" {
			return fmt.Errorf("employee %d with role %q: %w", id, role, ErrUnauthorized)
		}
		return nil
	}

	name, err := lookupEmployee(99)
	if errors.Is(err, ErrNotFound) {
		fmt.Println("Employee lookup:", err)
	}
	// Output: Employee lookup: employee 99: not found

	err = authorizeEmployee(1, "porter")
	if errors.Is(err, ErrUnauthorized) {
		fmt.Println("Auth check:", err)
	}
	// Output: Auth check: employee 1 with role "porter": unauthorized

	name, err = lookupEmployee(1)
	if err == nil {
		fmt.Println("Found employee:", name)
	}
	// Output: Found employee: Sharma

	// ────────────────────────────────────────────────────────────
	// 3.3 — errors.Join (Go 1.20+)
	// ────────────────────────────────────────────────────────────
	// WHY: errors.Join combines multiple errors into one.
	// errors.Is and errors.As work on ALL joined errors.

	fmt.Println("\n--- errors.Join ---")
	validateInspectionForm := func(inspectorName, badgeID string) error {
		var errs []error
		if strings.TrimSpace(inspectorName) == "" {
			errs = append(errs, &ValidationError{Field: "inspector_name", Message: "required"})
		}
		if !strings.Contains(badgeID, "-") {
			errs = append(errs, &ValidationError{Field: "badge_id", Message: "invalid format"})
		}
		if len(inspectorName) > 0 && len(inspectorName) < 3 {
			errs = append(errs, &ValidationError{Field: "inspector_name", Message: "too short (min 3)"})
		}
		if len(errs) > 0 {
			return errors.Join(errs...)
		}
		return nil
	}

	err = validateInspectionForm("", "BADBADGE")
	if err != nil {
		fmt.Println("Validation errors:")
		fmt.Println(" ", err)
	}
	// Output:
	// Validation errors:
	//   validation failed on "inspector_name": required
	//   validation failed on "badge_id": invalid format

	// errors.As finds the FIRST matching error in the joined set
	var vErr *ValidationError
	if errors.As(err, &vErr) {
		fmt.Printf("First validation error — field: %q\n", vErr.Field)
	}
	// Output: First validation error — field: "inspector_name"

	// ────────────────────────────────────────────────────────────
	// 3.4 — Practical Pattern: Multi-step Operation
	// ────────────────────────────────────────────────────────────
	// WHY: Real code chains operations, wrapping errors at each level.

	fmt.Println("\n--- Practical: Multi-step Inspection ---")
	runInspection := func(sectionID string) error {
		// Step 1: Find section
		if sectionID == "" {
			return fmt.Errorf("inspection: %w", errors.New("section ID required"))
		}
		// Step 2: Check status
		if sectionID == "closed-section" {
			return fmt.Errorf("inspection of %q: %w",
				sectionID,
				&InspectionError{System: sectionID, Code: 503, Message: "signal failure on track", Err: ErrTimeout})
		}
		// Step 3: Success
		return nil
	}

	for _, secID := range []string{"rajdhani-section", "", "closed-section"} {
		err := runInspection(secID)
		if err == nil {
			fmt.Printf("  %q: PASSED\n", secID)
		} else {
			fmt.Printf("  %q: FAILED — %v\n", secID, err)
		}
	}
	// Output:
	//   "rajdhani-section": PASSED
	//   "": FAILED — inspection: section ID required
	//   "closed-section": FAILED — inspection of "closed-section": [closed-section] error 503: signal failure on track (caused by: operation timed out)

	// ────────────────────────────────────────────────────────────
	// 3.5 — Error Handling Decision Guide
	// ────────────────────────────────────────────────────────────

	fmt.Println("\n--- Error Handling Decision Guide ---")
	fmt.Println("1. Simple message? → errors.New(\"msg\")")
	guide2 := "2. Dynamic context? → fmt.Errorf(\"context: %v\", val)"
	guide3 := "3. Preserve cause?  → fmt.Errorf(\"context: %w\", err)"
	fmt.Println(guide2)
	fmt.Println(guide3)
	fmt.Println("4. Check identity?  → errors.Is(err, ErrSentinel)")
	fmt.Println("5. Extract type?    → errors.As(err, &target)")
	fmt.Println("6. Structured data? → Custom error type with Unwrap()")
	fmt.Println("7. Multiple errors? → errors.Join(err1, err2, ...)")

	// ============================================================
	// KEY TAKEAWAYS
	// ============================================================
	// 1. error is an interface: { Error() string } — simple but powerful.
	// 2. Return (value, error) — always check error BEFORE using value.
	// 3. errors.New for simple errors, fmt.Errorf for formatted ones.
	// 4. %w wraps errors, preserving the chain for Is/As/Unwrap.
	// 5. errors.Is checks identity through the wrap chain.
	// 6. errors.As extracts a specific error TYPE from the chain.
	// 7. Sentinel errors (ErrNotFound) are package-level comparison targets.
	// 8. Custom error types carry structured data (codes, fields, causes).
	// 9. errors.Join (Go 1.20+) combines multiple errors into one.
	// 10. Never ignore errors — they are Go's explicit control flow.
}
