// ============================================================
//  FILE 23 : The time Package
// ============================================================
//  Topic  : time.Now, time.Date, time.Duration, formatting with
//           Go's reference time, parsing, time arithmetic,
//           timers, tickers, time.After, time zones
//
//  WHY THIS MATTERS:
//  Time is everywhere — logging, scheduling, rate limiting,
//  caching, deadlines, and measuring performance. Go's time
//  package is uniquely designed: formatting uses a reference
//  time (Mon Jan 2 15:04:05 MST 2006) instead of cryptic
//  format codes. Understanding durations, timezones, and
//  timers is critical for correct, non-flaky programs.
// ============================================================

// ============================================================
// STORY: The Rajabai Clock Tower
// Keeper Govind manages every clock in Mumbai from the iconic
// Rajabai Clock Tower. He sets clocks to IST, measures chai
// break intervals, schedules the hourly chime, and ensures
// that clocks across India and distant lands show the correct
// local time. His golden rule: "A clock that lies is worse
// than no clock at all."
// ============================================================

package main

import (
	"fmt"
	"time"
)

func main() {
	// ============================================================
	// EXAMPLE BLOCK 1 — Now, Date, Formatting, Parsing, Arithmetic
	// ============================================================

	fmt.Println("--- BLOCK 1: Time Basics, Formatting, Parsing ---")

	// ──────────────────────────────────────────────────────────────
	// SECTION 1 — time.Now() and time.Date()
	// ──────────────────────────────────────────────────────────────
	// WHY: time.Now() gives the current local time. time.Date()
	// creates a specific point in time. Both return time.Time.

	now := time.Now()
	fmt.Println("Current time:", now)
	fmt.Println("Year:", now.Year(), "Month:", now.Month(), "Day:", now.Day())
	fmt.Println("Hour:", now.Hour(), "Minute:", now.Minute())
	fmt.Println("Weekday:", now.Weekday())

	// time.Date — create a specific date/time
	republicDay := time.Date(2026, time.January, 26, 9, 0, 0, 0, time.UTC)
	fmt.Println("\nRepublic Day parade:", republicDay)
	// Output: Republic Day parade: 2026-01-26 09:00:00 +0000 UTC

	// Unix timestamps
	fmt.Println("Unix timestamp:", republicDay.Unix())
	// Output: Unix timestamp: 1769418000
	fmt.Println("Unix nano:", republicDay.UnixNano())

	// ──────────────────────────────────────────────────────────────
	// SECTION 2 — Formatting with Go's reference time
	// ──────────────────────────────────────────────────────────────
	// WHY: Go uses a unique approach — instead of %Y, %m, %d codes,
	// you use the reference time: Mon Jan 2 15:04:05 MST 2006.
	// The mnemonic: 01/02 03:04:05PM '06 -0700
	//               Month/Day Hour:Min:Sec Year Timezone

	fmt.Println("\n--- Formatting (Go's reference time) ---")

	ref := time.Date(2026, time.January, 26, 14, 30, 45, 0, time.UTC)

	// Common formats
	fmt.Println("Default:     ", ref.String())
	// Output: Default:      2026-01-26 14:30:45 +0000 UTC
	fmt.Println("RFC3339:     ", ref.Format(time.RFC3339))
	// Output: RFC3339:      2026-01-26T14:30:45Z
	fmt.Println("Kitchen:     ", ref.Format(time.Kitchen))
	// Output: Kitchen:      2:30PM
	fmt.Println("Date only:   ", ref.Format("2006-01-02"))
	// Output: Date only:    2026-01-26
	fmt.Println("Indian style:", ref.Format("02/01/2006"))
	// Output: Indian style: 26/01/2026
	fmt.Println("EU style:    ", ref.Format("02-Jan-2006"))
	// Output: EU style:     26-Jan-2026
	fmt.Println("Full:        ", ref.Format("Monday, January 2, 2006 at 3:04 PM"))
	// Output: Full:         Monday, January 26, 2026 at 2:30 PM
	fmt.Println("24-hour:     ", ref.Format("2006-01-02 15:04:05"))
	// Output: 24-hour:      2026-01-26 14:30:45
	fmt.Println("With zone:   ", ref.Format("2006-01-02 15:04:05 MST"))
	// Output: With zone:    2026-01-26 14:30:45 UTC

	// WHY: The reference time IS the format. Replace each piece:
	// 2006 -> year, 01 -> month, 02 -> day, 15 -> hour (24h),
	// 3 -> hour (12h), 04 -> minute, 05 -> second

	// ──────────────────────────────────────────────────────────────
	// SECTION 3 — Parsing time strings
	// ──────────────────────────────────────────────────────────────
	// WHY: time.Parse converts a string to time.Time using the
	// same reference-time format. ParseInLocation adds timezone.

	fmt.Println("\n--- Parsing ---")

	// Parse with layout
	t1, err := time.Parse("2006-01-02", "2026-01-26")
	if err != nil {
		fmt.Println("Parse error:", err)
	} else {
		fmt.Println("Parsed date:", t1)
		// Output: Parsed date: 2026-01-26 00:00:00 +0000 UTC
	}

	t2, _ := time.Parse(time.RFC3339, "2026-01-26T14:30:00Z")
	fmt.Println("Parsed RFC3339:", t2)
	// Output: Parsed RFC3339: 2026-01-26 14:30:00 +0000 UTC

	t3, _ := time.Parse("02/01/2006 3:04 PM", "26/01/2026 2:30 PM")
	fmt.Println("Parsed Indian style:", t3)
	// Output: Parsed Indian style: 2026-01-26 14:30:00 +0000 UTC

	// ParseInLocation — parse with a specific timezone
	ist, _ := time.LoadLocation("Asia/Kolkata")
	t4, _ := time.ParseInLocation("2006-01-02 15:04", "2026-01-26 09:00", ist)
	fmt.Println("Parsed in IST:", t4)
	// Output: Parsed in IST: 2026-01-26 09:00:00 +0530 IST

	// Parse error handling
	_, err = time.Parse("2006-01-02", "not-a-date")
	fmt.Println("Parse error:", err != nil)
	// Output: Parse error: true

	// ──────────────────────────────────────────────────────────────
	// SECTION 4 — Duration and arithmetic
	// ──────────────────────────────────────────────────────────────
	// WHY: time.Duration represents elapsed time. Use Add/Sub for
	// time arithmetic — never manipulate hours/minutes directly.

	fmt.Println("\n--- Duration and Arithmetic ---")

	// Predefined duration constants
	fmt.Println("1 second:   ", time.Second)
	// Output: 1 second:    1s
	fmt.Println("5 minutes:  ", 5*time.Minute)
	// Output: 5 minutes:   5m0s
	fmt.Println("2 hours:    ", 2*time.Hour)
	// Output: 2 hours:     2h0m0s
	fmt.Println("500ms:      ", 500*time.Millisecond)
	// Output: 500ms:       500ms

	// Parse a duration string (chai break interval)
	d, _ := time.ParseDuration("1h30m45s")
	fmt.Println("Parsed duration:", d)
	// Output: Parsed duration: 1h30m45s
	fmt.Println("In seconds:", d.Seconds())
	// Output: In seconds: 5445
	fmt.Println("In minutes:", d.Minutes())
	// Output: In minutes: 90.75

	// Time arithmetic: Add, Sub, Since, Until
	baseTime := time.Date(2026, 1, 26, 12, 0, 0, 0, time.UTC)

	future := baseTime.Add(72 * time.Hour)
	fmt.Println("\nBase:         ", baseTime.Format("Jan 2, 2006 15:04"))
	// Output: Base:          Jan 26, 2026 12:00
	fmt.Println("+ 72 hours:   ", future.Format("Jan 2, 2006 15:04"))
	// Output: + 72 hours:    Jan 29, 2026 12:00

	past := baseTime.Add(-24 * time.Hour)
	fmt.Println("- 24 hours:   ", past.Format("Jan 2, 2006 15:04"))
	// Output: - 24 hours:    Jan 25, 2026 12:00

	// Sub — difference between two times
	diff := future.Sub(baseTime)
	fmt.Println("Difference:   ", diff)
	// Output: Difference:    72h0m0s

	// Since and Until (relative to now)
	cricketWorldCup := time.Date(2023, 10, 5, 14, 0, 0, 0, time.UTC)
	fmt.Printf("Since ICC World Cup 2023: %.0f days\n", time.Since(cricketWorldCup).Hours()/24)

	nextRepublicDay := time.Date(2027, 1, 26, 0, 0, 0, 0, time.UTC)
	fmt.Printf("Until Republic Day 2027: %.0f days\n", time.Until(nextRepublicDay).Hours()/24)

	// Comparisons
	fmt.Println("\nbase.Before(future):", baseTime.Before(future))
	// Output: base.Before(future): true
	fmt.Println("base.After(future):", baseTime.After(future))
	// Output: base.After(future): false
	fmt.Println("base.Equal(base):", baseTime.Equal(baseTime))
	// Output: base.Equal(base): true

	// ============================================================
	// EXAMPLE BLOCK 2 — Timers, Tickers, Timezones, Patterns
	// ============================================================

	fmt.Println("\n--- BLOCK 2: Timers, Tickers, Timezones ---")

	// ──────────────────────────────────────────────────────────────
	// SECTION 5 — time.After, time.NewTimer
	// ──────────────────────────────────────────────────────────────
	// WHY: time.After returns a channel that fires once after a
	// duration. NewTimer gives you a timer you can stop/reset.

	fmt.Println("\n--- time.After / time.NewTimer ---")

	// time.After — fires once (like an exam countdown alarm)
	select {
	case t := <-time.After(10 * time.Millisecond):
		fmt.Println("time.After fired at:", t.Format("15:04:05.000"))
	}

	// time.NewTimer — controllable one-shot timer
	timer := time.NewTimer(50 * time.Millisecond)

	// Stop the timer before it fires
	stopped := timer.Stop()
	fmt.Println("Timer stopped before firing:", stopped)
	// Output: Timer stopped before firing: true

	// Reset and let it fire
	timer.Reset(10 * time.Millisecond)
	<-timer.C
	fmt.Println("Timer fired after reset")
	// Output: Timer fired after reset

	// ──────────────────────────────────────────────────────────────
	// SECTION 6 — time.NewTicker (repeating events — the hourly chime)
	// ──────────────────────────────────────────────────────────────
	// WHY: Tickers fire repeatedly at a fixed interval. Always
	// call ticker.Stop() to release resources.

	fmt.Println("\n--- time.NewTicker ---")

	ticker := time.NewTicker(20 * time.Millisecond)
	tickCount := 0

	done := make(chan bool)
	go func() {
		for t := range ticker.C {
			tickCount++
			fmt.Printf("  Chime %d at %s\n", tickCount, t.Format("15:04:05.000"))
			if tickCount >= 3 {
				done <- true
				return
			}
		}
	}()
	<-done
	ticker.Stop() // WHY: always stop tickers to free resources
	fmt.Println("Rajabai chime stopped after", tickCount, "chimes")
	// Output: Rajabai chime stopped after 3 chimes

	// ──────────────────────────────────────────────────────────────
	// SECTION 7 — time.Sleep (blocking)
	// ──────────────────────────────────────────────────────────────
	// WHY: Sleep pauses the current goroutine. Simple but blocks
	// the goroutine entirely. Prefer timers/tickers for non-blocking.

	fmt.Println("\n--- time.Sleep ---")
	start := time.Now()
	time.Sleep(25 * time.Millisecond)
	fmt.Printf("Slept for %v\n", time.Since(start).Round(time.Millisecond))
	// Output: Slept for 25ms (approximately)

	// ──────────────────────────────────────────────────────────────
	// SECTION 8 — Timezones and Locations
	// ──────────────────────────────────────────────────────────────
	// WHY: Timezones are critical for global applications. Go uses
	// the IANA timezone database. Always store times in UTC and
	// convert to local time for display.

	fmt.Println("\n--- Timezones ---")

	utcTime := time.Date(2026, 1, 26, 12, 0, 0, 0, time.UTC)
	fmt.Println("UTC:       ", utcTime.Format("2006-01-02 15:04 MST"))
	// Output: UTC:        2026-01-26 12:00 UTC

	// Load specific timezones
	kolkata, _ := time.LoadLocation("Asia/Kolkata")
	tokyo, _ := time.LoadLocation("Asia/Tokyo")
	london, _ := time.LoadLocation("Europe/London")

	fmt.Println("Mumbai IST:", utcTime.In(kolkata).Format("2006-01-02 15:04 MST"))
	// Output: Mumbai IST: 2026-01-26 17:30 IST
	fmt.Println("Tokyo:     ", utcTime.In(tokyo).Format("2006-01-02 15:04 MST"))
	// Output: Tokyo:      2026-01-26 21:00 JST
	fmt.Println("London:    ", utcTime.In(london).Format("2006-01-02 15:04 MST"))
	// Output: London:     2026-01-26 12:00 GMT

	// Fixed offset timezone (when you don't have IANA name)
	istFixed := time.FixedZone("IST", 5*60*60+30*60) // +05:30
	fmt.Println("IST fixed: ", utcTime.In(istFixed).Format("2006-01-02 15:04 MST"))
	// Output: IST fixed:  2026-01-26 17:30 IST

	// Compare times across zones — they are equal
	istTime := utcTime.In(kolkata)
	fmt.Println("\nUTC == IST?", utcTime.Equal(istTime))
	// Output: UTC == IST? true
	// WHY: Equal compares the instant, not the representation

	// ──────────────────────────────────────────────────────────────
	// SECTION 9 — Practical pattern: measure execution time
	// ──────────────────────────────────────────────────────────────
	// WHY: Measuring how long code takes is one of the most common
	// uses of the time package. time.Since(start) is the idiom.

	fmt.Println("\n--- Pattern: Measure Execution Time ---")

	start = time.Now()
	// Simulate work
	sum := 0
	for i := 0; i < 1_000_000; i++ {
		sum += i
	}
	elapsed := time.Since(start)
	fmt.Printf("Computed sum=%d in %v\n", sum, elapsed)

	// Defer pattern for function timing
	func() {
		defer measureTime("cricket score calculation")()
		total := 0
		for i := 0; i < 2_000_000; i++ {
			total += i
		}
		_ = total
	}()

	// ──────────────────────────────────────────────────────────────
	// SECTION 10 — Practical pattern: timeout / deadline
	// ──────────────────────────────────────────────────────────────
	// WHY: Setting deadlines prevents operations from hanging
	// forever. Combine time.After with select for timeout patterns.

	fmt.Println("\n--- Pattern: Timeout with select ---")

	work := make(chan string, 1)
	go func() {
		time.Sleep(30 * time.Millisecond)
		work <- "result ready"
	}()

	// Wait for work OR timeout — whichever comes first
	select {
	case result := <-work:
		fmt.Println("Got result:", result)
		// Output: Got result: result ready
	case <-time.After(100 * time.Millisecond):
		fmt.Println("Timed out!")
	}

	// Timeout scenario (work takes longer than deadline)
	work2 := make(chan string, 1)
	go func() {
		time.Sleep(200 * time.Millisecond)
		work2 <- "too late"
	}()

	select {
	case result := <-work2:
		fmt.Println("Got result:", result)
	case <-time.After(50 * time.Millisecond):
		fmt.Println("Timed out waiting for slow work (expected)")
		// Output: Timed out waiting for slow work (expected)
	}

	fmt.Println("\nGovind's Rajabai Clock Tower chimes on time. Mumbai runs on IST.")
	// Output: Govind's Rajabai Clock Tower chimes on time. Mumbai runs on IST.
}

// ──────────────────────────────────────────────────────────────
// Helper: measureTime returns a function that prints elapsed time
// ──────────────────────────────────────────────────────────────
func measureTime(label string) func() {
	start := time.Now()
	return func() {
		fmt.Printf("  [TIMER] %s took %v\n", label, time.Since(start))
	}
}

// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. time.Now() returns current time; time.Date() creates a
//    specific time. Both return time.Time (value type).
//
// 2. Go's formatting uses a REFERENCE TIME: Mon Jan 2 15:04:05
//    MST 2006. The mnemonic: 01/02 03:04:05 '06 -0700.
//
// 3. time.Parse and time.Format use the same reference layout.
//    ParseInLocation adds timezone context to parsing.
//
// 4. time.Duration is nanoseconds. Use constants: time.Second,
//    time.Minute, time.Hour. Multiply for custom durations.
//
// 5. Time arithmetic: t.Add(d) adds duration, t.Sub(t2) returns
//    duration. time.Since(t) and time.Until(t) are shortcuts.
//
// 6. time.After fires once on a channel. time.NewTimer is
//    controllable (Stop, Reset). time.NewTicker repeats.
//
// 7. Always Stop tickers and unused timers to free resources.
//
// 8. Store times in UTC. Use time.LoadLocation and t.In(loc)
//    to convert for display. t.Equal() compares instants, not
//    representations.
//
// 9. Measure execution: start := time.Now(); elapsed := time.Since(start).
//    The defer pattern with a closure is elegant for function timing.
//
// 10. Govind's Rajabai Clock Tower rule: "Store in UTC, display
//     in IST, always set a deadline, and never trust a clock
//     you have not tested."
// ============================================================
