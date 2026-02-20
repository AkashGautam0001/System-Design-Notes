// ============================================================
//  FILE 26 : Embedding & Composition
// ============================================================
//  Topic  : struct embedding, method promotion, field access,
//           shadowing, interface embedding, embedding interfaces
//           in structs, multiple embedding, decorator pattern
//
//  WHY THIS MATTERS:
//  Go has no inheritance — no "extends", no class hierarchies.
//  Instead it uses COMPOSITION: you embed one struct inside
//  another and its fields and methods are "promoted" as if they
//  belonged to the outer struct. This is simpler, more explicit,
//  and avoids the fragile base class problem. Understanding
//  embedding is essential for writing idiomatic Go.
// ============================================================

// ============================================================
// STORY: ISRO Modular Rocket
// ISRO engineers build the PSLV by embedding interchangeable
// rocket stages — a booster stage, a second stage, a heat
// shield module. They never build a monolithic rocket; they
// snap stages together. If one stage needs an upgrade they
// swap it out without touching the rest. That's composition
// over inheritance in action.
// ============================================================

package main

import (
	"fmt"
	"strings"
)

// ============================================================
// EXAMPLE BLOCK 1 — Struct Embedding Basics
// ============================================================

// ──────────────────────────────────────────────────────────────
// SECTION 1 — Basic struct embedding
// ──────────────────────────────────────────────────────────────
// WHY: Embedding lets you reuse fields and methods without
// creating deep class hierarchies. The embedded struct's
// exported fields and methods are "promoted" to the outer type.

// BoosterStage is a module every rocket needs.
type BoosterStage struct {
	Thrust   int
	FuelType string
}

// Ignite starts the booster stage.
func (b BoosterStage) Ignite() string {
	return fmt.Sprintf("Booster ignited: %d kN thrust on %s", b.Thrust, b.FuelType)
}

// Status reports booster status.
func (b BoosterStage) Status() string {
	return fmt.Sprintf("Booster [thrust=%d kN, fuel=%s]", b.Thrust, b.FuelType)
}

// HeatShield is a protective module for re-entry.
type HeatShield struct {
	Strength int
	Active   bool
}

// Activate turns the heat shield on.
func (h *HeatShield) Activate() {
	h.Active = true
}

// Deactivate turns the heat shield off.
func (h *HeatShield) Deactivate() {
	h.Active = false
}

// Status reports heat shield status.
func (h HeatShield) Status() string {
	state := "inactive"
	if h.Active {
		state = "active"
	}
	return fmt.Sprintf("HeatShield [strength=%d, %s]", h.Strength, state)
}

// ──────────────────────────────────────────────────────────────
// SECTION 2 — Composing a rocket from stages
// ──────────────────────────────────────────────────────────────
// WHY: PSLV embeds BoosterStage and HeatShield. Their fields and
// methods are promoted — you can call rocket.Ignite() directly.

// PSLV composes multiple rocket stages.
type PSLV struct {
	Name         string
	BoosterStage // embedded — fields & methods promoted
	HeatShield   // embedded — fields & methods promoted
}

// ──────────────────────────────────────────────────────────────
// SECTION 3 — Shadowing (overriding promoted methods)
// ──────────────────────────────────────────────────────────────
// WHY: If the outer struct defines a method with the same name
// as a promoted method, the outer one wins. You can still reach
// the inner one explicitly: rocket.BoosterStage.Status().

// Status on PSLV shadows both BoosterStage.Status and HeatShield.Status.
func (p PSLV) Status() string {
	return fmt.Sprintf("Rocket %q — %s | %s",
		p.Name, p.BoosterStage.Status(), p.HeatShield.Status())
}

// ──────────────────────────────────────────────────────────────
// SECTION 4 — Embedding with pointer receivers
// ──────────────────────────────────────────────────────────────
// WHY: You can embed a pointer to a struct. This is useful when
// multiple outer structs should share the same inner instance
// or when the embedded type must be mutable.

// MissionLog is a simple log collector.
type MissionLog struct {
	Entries []string
}

// Log adds a message.
func (l *MissionLog) Log(msg string) {
	l.Entries = append(l.Entries, msg)
}

// Dump returns all entries.
func (l *MissionLog) Dump() string {
	return strings.Join(l.Entries, "; ")
}

// MissionService embeds a *MissionLog (pointer embedding).
type MissionService struct {
	Name       string
	*MissionLog // pointer embedding — shared logger
}

// ============================================================
// EXAMPLE BLOCK 2 — Interface Embedding & Advanced Patterns
// ============================================================

// ──────────────────────────────────────────────────────────────
// SECTION 5 — Interface embedding (composing interfaces)
// ──────────────────────────────────────────────────────────────
// WHY: Small interfaces are idiomatic Go. You compose larger
// interfaces by embedding smaller ones — like io.ReadWriter
// embeds io.Reader and io.Writer.

// Launcher can launch.
type Launcher interface {
	Launch(trajectory string) string
}

// Deployer can deploy payloads.
type Deployer interface {
	Deploy() string
}

// MissionVehicle composes Launcher + Deployer.
type MissionVehicle interface {
	Launcher
	Deployer
}

// SatelliteCarrier implements MissionVehicle.
type SatelliteCarrier struct {
	Callsign string
}

func (s SatelliteCarrier) Launch(trajectory string) string {
	return fmt.Sprintf("%s launches on %s trajectory", s.Callsign, trajectory)
}

func (s SatelliteCarrier) Deploy() string {
	return fmt.Sprintf("%s deploys satellite payload!", s.Callsign)
}

// ──────────────────────────────────────────────────────────────
// SECTION 6 — Embedding an interface in a struct
// ──────────────────────────────────────────────────────────────
// WHY: Embedding an interface in a struct means the struct
// satisfies that interface automatically. This is the classic
// decorator / wrapper pattern: wrap any implementation, override
// one method, delegate the rest.

// LoudLauncher wraps any Launcher and uppercases its output.
type LoudLauncher struct {
	Launcher // embed the interface — struct satisfies Launcher
}

// Launch overrides the embedded Launcher.Launch.
func (l LoudLauncher) Launch(trajectory string) string {
	original := l.Launcher.Launch(trajectory) // delegate to wrapped Launcher
	return strings.ToUpper(original)
}

// ──────────────────────────────────────────────────────────────
// SECTION 7 — Multiple embedding: combining several interfaces
// ──────────────────────────────────────────────────────────────
// WHY: A struct can embed multiple interfaces. The struct then
// satisfies all of them. This lets you compose behaviour from
// separate concerns.

// Stringer produces a string representation.
type Stringer interface {
	String() string
}

// Validator checks if the value is valid.
type Validator interface {
	Validate() error
}

// Printable composes Stringer + Validator.
type Printable interface {
	Stringer
	Validator
}

// Scientist implements Printable.
type Scientist struct {
	Name  string
	Email string
}

func (s Scientist) String() string {
	return fmt.Sprintf("Scientist(%s, %s)", s.Name, s.Email)
}

func (s Scientist) Validate() error {
	if s.Name == "" {
		return fmt.Errorf("name is required")
	}
	if !strings.Contains(s.Email, "@") {
		return fmt.Errorf("invalid email: %s", s.Email)
	}
	return nil
}

// ──────────────────────────────────────────────────────────────
// SECTION 8 — Practical pattern: Decorator via embedding
// ──────────────────────────────────────────────────────────────
// WHY: The decorator pattern is one of the most useful reasons
// to embed an interface in a struct. You can wrap and extend
// any implementation transparently.

// Notifier sends notifications.
type Notifier interface {
	Notify(msg string) string
}

// EmailNotifier is a concrete notifier.
type EmailNotifier struct {
	Address string
}

func (e EmailNotifier) Notify(msg string) string {
	return fmt.Sprintf("Email to %s: %s", e.Address, msg)
}

// LoggingNotifier decorates any Notifier with logging.
type LoggingNotifier struct {
	Notifier           // embed interface
	Logs     []string
}

func (ln *LoggingNotifier) Notify(msg string) string {
	result := ln.Notifier.Notify(msg) // delegate
	ln.Logs = append(ln.Logs, result)  // add logging
	return result
}

func main() {
	fmt.Println("===== FILE 26: Embedding & Composition =====")
	fmt.Println()

	// ============================================================
	// BLOCK 1 — Struct Embedding Basics
	// ============================================================

	fmt.Println("--- Block 1: Struct Embedding Basics ---")
	fmt.Println()

	// ── Create a rocket with embedded stages ──
	rocket := PSLV{
		Name:         "PSLV-C56",
		BoosterStage: BoosterStage{Thrust: 4800, FuelType: "solid HTPB"},
		HeatShield:   HeatShield{Strength: 500, Active: false},
	}

	// Promoted field access — access BoosterStage.Thrust directly
	fmt.Println("Rocket name:", rocket.Name)
	// Output: Rocket name: PSLV-C56
	fmt.Println("Thrust (promoted):", rocket.Thrust)
	// Output: Thrust (promoted): 4800
	fmt.Println("FuelType (promoted):", rocket.FuelType)
	// Output: FuelType (promoted): solid HTPB
	fmt.Println("HeatShield strength:", rocket.Strength)
	// Output: HeatShield strength: 500

	// WHY: rocket.Thrust is sugar for rocket.BoosterStage.Thrust.
	// Both work, but the short form is idiomatic.

	fmt.Println()

	// ── Promoted method calls ──
	fmt.Println(rocket.Ignite())
	// Output: Booster ignited: 4800 kN thrust on solid HTPB

	// Activate is a pointer-receiver method on HeatShield.
	// It's promoted and works because PSLV contains HeatShield by value
	// and we can take its address.
	rocket.Activate()
	fmt.Println("HeatShield active:", rocket.Active)
	// Output: HeatShield active: true

	fmt.Println()

	// ── Shadowing: PSLV.Status() overrides promoted Status ──
	fmt.Println(rocket.Status())
	// Output: Rocket "PSLV-C56" — Booster [thrust=4800 kN, fuel=solid HTPB] | HeatShield [strength=500, active]

	// You can still reach the embedded methods explicitly:
	fmt.Println("Booster status:", rocket.BoosterStage.Status())
	// Output: Booster status: Booster [thrust=4800 kN, fuel=solid HTPB]
	fmt.Println("HeatShield status:", rocket.HeatShield.Status())
	// Output: HeatShield status: HeatShield [strength=500, active]

	// WHY: Shadowing is NOT inheritance override. The outer method
	// simply takes priority in name resolution. The inner methods
	// still exist and are accessible via the field name.

	fmt.Println()

	// ── Pointer embedding: shared mission log ──
	sharedLog := &MissionLog{}
	svc1 := MissionService{Name: "Telemetry", MissionLog: sharedLog}
	svc2 := MissionService{Name: "Navigation", MissionLog: sharedLog}

	svc1.Log("booster separation confirmed")  // calls sharedLog.Log
	svc2.Log("orbit insertion burn complete")  // same underlying log

	fmt.Println("Shared log:", sharedLog.Dump())
	// Output: Shared log: booster separation confirmed; orbit insertion burn complete

	// WHY: Both services share the same *MissionLog. Changes from
	// either service appear in the same log. This is possible
	// because we embedded a pointer, not a value.

	fmt.Println()

	// ============================================================
	// BLOCK 2 — Interface Embedding & Advanced Patterns
	// ============================================================

	fmt.Println("--- Block 2: Interface Embedding & Advanced Patterns ---")
	fmt.Println()

	// ── Composed interface: MissionVehicle = Launcher + Deployer ──
	carrier := SatelliteCarrier{Callsign: "PSLV-C51"}

	// carrier satisfies MissionVehicle because it implements both Launcher and Deployer.
	var mv MissionVehicle = carrier
	fmt.Println(mv.Launch("polar sun-synchronous"))
	// Output: PSLV-C51 launches on polar sun-synchronous trajectory
	fmt.Println(mv.Deploy())
	// Output: PSLV-C51 deploys satellite payload!

	fmt.Println()

	// ── Decorator pattern: LoudLauncher wraps any Launcher ──
	loud := LoudLauncher{Launcher: carrier}
	fmt.Println(loud.Launch("geostationary"))
	// Output: PSLV-C51 LAUNCHES ON GEOSTATIONARY TRAJECTORY

	// WHY: LoudLauncher embeds the Launcher interface. It overrides
	// Launch to add behaviour, then delegates to the wrapped Launcher.
	// This works with ANY Launcher implementation, not just SatelliteCarrier.

	fmt.Println()

	// ── Multiple interface satisfaction ──
	validScientist := Scientist{Name: "Dr. Sivan", Email: "sivan@isro.gov.in"}
	invalidScientist := Scientist{Name: "", Email: "no-at-sign"}

	// Both satisfy the Printable interface (Stringer + Validator).
	var p Printable = validScientist
	fmt.Println("String:", p.String())
	// Output: String: Scientist(Dr. Sivan, sivan@isro.gov.in)
	fmt.Println("Validate:", p.Validate())
	// Output: Validate: <nil>

	p = invalidScientist
	fmt.Println("String:", p.String())
	// Output: String: Scientist(, no-at-sign)
	fmt.Println("Validate:", p.Validate())
	// Output: Validate: name is required

	fmt.Println()

	// ── Practical decorator: LoggingNotifier ──
	email := EmailNotifier{Address: "somnath@isro.gov.in"}
	logged := &LoggingNotifier{Notifier: email}

	fmt.Println(logged.Notify("PSLV launch successful"))
	// Output: Email to somnath@isro.gov.in: PSLV launch successful
	fmt.Println(logged.Notify("Satellite deployed to orbit"))
	// Output: Email to somnath@isro.gov.in: Satellite deployed to orbit

	fmt.Println("Notification logs:")
	for i, entry := range logged.Logs {
		fmt.Printf("  %d. %s\n", i+1, entry)
	}
	// Output: Notification logs:
	// Output:   1. Email to somnath@isro.gov.in: PSLV launch successful
	// Output:   2. Email to somnath@isro.gov.in: Satellite deployed to orbit

	// WHY: The LoggingNotifier transparently wraps any Notifier.
	// Callers don't know (or care) about the logging. This is
	// the power of embedding interfaces in structs.

	fmt.Println()

	// ── Quick summary: Composition vs Inheritance ──
	fmt.Println("--- Composition vs Inheritance ---")
	fmt.Println("Go says: 'Don't inherit behaviour — compose it.'")
	fmt.Println("  - Embed structs for field & method reuse")
	fmt.Println("  - Embed interfaces for the decorator pattern")
	fmt.Println("  - Shadow methods when the outer type needs custom logic")
	fmt.Println("  - No fragile base class problem, no diamond of death")
}

// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. Struct embedding promotes the inner struct's fields and
//    methods to the outer struct. rocket.Thrust is shorthand for
//    rocket.BoosterStage.Thrust.
//
// 2. Method promotion means you can call rocket.Ignite() even
//    though Ignite is defined on BoosterStage, not PSLV.
//
// 3. Shadowing: if the outer struct defines a method with the
//    same name, it takes priority. The inner method is still
//    accessible via the embedded field name: rocket.BoosterStage.Status().
//
// 4. Pointer embedding (*MissionLog) lets multiple structs share
//    the same instance. Value embedding copies the struct.
//
// 5. Interface embedding composes small interfaces into larger
//    ones: MissionVehicle = Launcher + Deployer. This is idiomatic
//    Go — keep interfaces small and compose them.
//
// 6. Embedding an interface in a struct is the decorator pattern.
//    The struct satisfies the interface, overrides methods it
//    cares about, and delegates the rest to the wrapped value.
//
// 7. Multiple embedding: a struct can embed many types. If two
//    embedded types have the same method name, you must call
//    them explicitly (rocket.BoosterStage.Status()) to disambiguate.
//
// 8. ISRO's engineering principle: "Snap rocket stages together.
//    Never weld a monolithic hull — you'll regret it when you
//    need to upgrade the booster."
// ============================================================
