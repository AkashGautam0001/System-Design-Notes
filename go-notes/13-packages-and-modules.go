// ============================================================
//  FILE 13: PACKAGES AND MODULES
// ============================================================
//  Topic: package keyword, imports, exported names, init(),
//         go.mod anatomy, and the Go module system.
//
//  WHY THIS MATTERS:
//    Go organizes code into packages and manages dependencies
//    through modules.  Understanding how packages, imports, and
//    the module system work is fundamental to writing, sharing,
//    and consuming Go code at any scale.
// ============================================================
//
//  STORY — "Nagar Nigam Ward Map"
//  Municipal Commissioner Verma is organizing the city into
//  named wards for Nagar Nigam (Municipal Corporation).
//  Each ward (package) has a clear boundary and purpose.
//  Roads (imports) connect wards so residents can access
//  services.  Some buildings are PUBLIC (Exported, capital letter)
//  and anyone can enter.  Others are private (unexported, lowercase)
//  and only residents of that ward may use them.  Before the
//  city opens each morning, each ward runs its own setup
//  routine (init functions) — turning on streetlights, unlocking
//  gates — all before the Commissioner (main) begins the day.
// ============================================================

package main

import (
	// ── Standard import ─────────────────────────────────────
	"fmt"

	// ── Aliased import ──────────────────────────────────────
	// WHY: You can rename a package at the import site to avoid
	// name collisions or for convenience.
	str "strings"

	// ── Blank import ────────────────────────────────────────
	// WHY: _ "pkg" imports a package ONLY for its init() side
	// effects.  You cannot reference its exported names.
	// Common real-world use: database drivers like _ "github.com/lib/pq"
	// register themselves in their init() function.
	_ "os" // imported for side effects only (demo — os.init runs)

	// ── Grouped stdlib imports ──────────────────────────────
	"math"
	"unicode"
)

// ============================================================
//  init() FUNCTIONS
// ============================================================
// WHY: init() runs automatically before main(). Every file in
// a package can have one or more init() functions.  They run in
// the order they appear within a file, and files are processed
// in alphabetical order within a package.

var nagarName string

// First init — setting up the nagar name
func init() {
	nagarName = "Gopher Nagar"
	fmt.Println("[init #1] Nagar name set to:", nagarName)
	// Output: [init #1] Nagar name set to: Gopher Nagar
}

// Second init — a different setup step
func init() {
	fmt.Println("[init #2] Streetlights turned on in", nagarName)
	// Output: [init #2] Streetlights turned on in Gopher Nagar
}

// ============================================================
//  EXAMPLE BLOCK 1 — Package Basics, Imports, Exported vs
//                     Unexported, init() Function
// ============================================================

func main() {
	fmt.Println("============================================================")
	fmt.Println("  BLOCK 1: Package Basics, Imports, Exported vs Unexported")
	fmt.Println("============================================================")

	// ── package main ────────────────────────────────────────
	// WHY: Every Go executable must have `package main` with a
	// `func main()` entry point.  Library packages use any other
	// name (e.g., `package utils`) and cannot be run directly.

	fmt.Println("\n--- The 'package' keyword ---")
	fmt.Println("This file is 'package main' — it's an executable.")
	// Output: This file is 'package main' — it's an executable.
	fmt.Println("Library packages use names like 'package http', 'package json'.")
	// Output: Library packages use names like 'package http', 'package json'.

	// ── import paths ────────────────────────────────────────
	fmt.Println("\n--- Import paths ---")
	fmt.Println("Standard library:  \"fmt\", \"os\", \"net/http\"")
	// Output: Standard library:  "fmt", "os", "net/http"
	fmt.Println("Third-party:       \"github.com/user/repo/pkg\"")
	// Output: Third-party:       "github.com/user/repo/pkg"

	// ── Aliased import demo ─────────────────────────────────
	fmt.Println("\n--- Aliased import (str = strings) ---")
	greeting := "Namaste, Gopher Nagar!"
	fmt.Println("Upper:", str.ToUpper(greeting))
	// Output: Upper: NAMASTE, GOPHER NAGAR!
	fmt.Println("Contains 'Nagar':", str.Contains(greeting, "Nagar"))
	// Output: Contains 'Nagar': true

	// ── Exported vs unexported ──────────────────────────────
	// WHY: Go uses capitalization as its access control mechanism.
	// Exported = starts with uppercase letter → visible outside package
	// Unexported = starts with lowercase letter → package-private

	fmt.Println("\n--- Exported vs Unexported names ---")

	// math.Pi is exported (capital P) — we can access it
	fmt.Printf("math.Pi (exported)  = %.6f\n", math.Pi)
	// Output: math.Pi (exported)  = 3.141592

	// math.pi does not exist — lowercase would be unexported
	// math.pi → compile error: cannot refer to unexported name
	fmt.Println("math.pi would be a compile error — unexported!")
	// Output: math.pi would be a compile error — unexported!

	// Demonstrate the unicode package's exported function
	fmt.Println("unicode.IsUpper('G'):", unicode.IsUpper('G'))
	// Output: unicode.IsUpper('G'): true
	fmt.Println("unicode.IsUpper('g'):", unicode.IsUpper('g'))
	// Output: unicode.IsUpper('g'): false

	// ── Naming conventions ──────────────────────────────────
	fmt.Println("\n--- Naming conventions for export ---")
	fmt.Println("  PublicFunc()    → exported (visible outside package)")
	fmt.Println("  privateFunc()   → unexported (package-only)")
	fmt.Println("  MyStruct        → exported type")
	fmt.Println("  myStruct        → unexported type")
	fmt.Println("  MaxRetries      → exported constant")
	fmt.Println("  defaultTimeout  → unexported constant")

	// ── init() recap ────────────────────────────────────────
	fmt.Println("\n--- init() function recap ---")
	fmt.Println("Nagar from init():", nagarName)
	// Output: Nagar from init(): Gopher Nagar
	fmt.Println("Both init() functions ran BEFORE main() started.")
	// Output: Both init() functions ran BEFORE main() started.

	// WHY: init() is used for:
	//   - Registering database drivers (blank import + init)
	//   - Validating configuration at startup
	//   - Initializing package-level variables
	//   - Verifying preconditions before the program runs

	// ── Dot import (mentioned, not demonstrated) ────────────
	// WHY: A dot import (import . "fmt") lets you use Println
	// directly instead of fmt.Println.  It's generally discouraged
	// because it pollutes the namespace and makes code harder to read.
	//   import . "fmt"
	//   Println("No prefix needed") // works but not recommended

	// ============================================================
	//  EXAMPLE BLOCK 2 — Module System, go.mod Anatomy, Import
	//                     Paths, Blank Imports, Common Patterns
	// ============================================================

	fmt.Println("\n============================================================")
	fmt.Println("  BLOCK 2: Module System & Common Patterns")
	fmt.Println("============================================================")

	// ── go.mod anatomy ──────────────────────────────────────
	fmt.Println("\n--- go.mod file anatomy (city charter) ---")
	fmt.Println(`
  module go-notes         // module path (import prefix)
  go 1.26.0               // minimum Go version

  require (               // dependencies
    github.com/pkg/errors v0.9.1
    golang.org/x/sync     v0.6.0
  )

  replace (               // local overrides (useful for dev)
    example.com/old => ../local-fork
  )

  exclude (               // excluded versions
    github.com/pkg/errors v0.8.0
  )`)

	// ── go.sum ──────────────────────────────────────────────
	fmt.Println("\n--- go.sum ---")
	fmt.Println("go.sum contains cryptographic hashes of dependencies.")
	// Output: go.sum contains cryptographic hashes of dependencies.
	fmt.Println("It ensures reproducible builds — ALWAYS commit it to VCS.")
	// Output: It ensures reproducible builds — ALWAYS commit it to VCS.

	// ── Module commands ─────────────────────────────────────
	fmt.Println("\n--- Essential module commands ---")
	fmt.Println("  go mod init <module-path>  → create go.mod")
	fmt.Println("  go mod tidy                → add missing, remove unused deps")
	fmt.Println("  go get <pkg>@<version>     → add/update a dependency")
	fmt.Println("  go get <pkg>@latest        → get latest version")
	fmt.Println("  go mod vendor              → copy deps into vendor/")
	fmt.Println("  go mod download            → download deps to module cache")
	fmt.Println("  go mod graph               → print dependency graph")
	fmt.Println("  go mod verify              → verify deps match go.sum")

	// ── Import path conventions ─────────────────────────────
	fmt.Println("\n--- Import path conventions ---")
	fmt.Println(`
  Standard library:     "fmt", "net/http", "encoding/json"
  Third-party:          "github.com/gorilla/mux"
  Internal to project:  "go-notes/internal/config"

  WHY: The module path in go.mod is the prefix for all packages
  in your module.  If go.mod says 'module go-notes', then a
  package in ./utils/ is imported as "go-notes/utils".`)

	// ── internal packages ───────────────────────────────────
	fmt.Println("\n--- internal packages ---")
	fmt.Println(`
  The 'internal' directory is special in Go:

  mymodule/
    internal/
      config/     → only importable by mymodule and its sub-packages
      db/         → same restriction
    cmd/
      server/     → CAN import mymodule/internal/config

  Other modules CANNOT import your internal packages.
  WHY: This is Go's built-in encapsulation boundary for modules.
  It lets you share code within your module without making it
  part of your public API.`)

	// ── Blank import patterns ───────────────────────────────
	fmt.Println("\n--- Blank import patterns ---")
	fmt.Println(`
  _ "image/png"           → registers PNG decoder via init()
  _ "net/http/pprof"      → registers pprof HTTP handlers via init()
  _ "github.com/lib/pq"   → registers PostgreSQL driver via init()

  WHY: Some packages exist purely for their init() side effects.
  The blank identifier _ tells the compiler "I know I'm not using
  any exported names — I just need the init() to run."`)

	// ── Package design principles ───────────────────────────
	fmt.Println("\n--- Package design principles ---")
	fmt.Println("  1. Name packages by what they PROVIDE, not what they contain")
	fmt.Println("     Good: 'http', 'json', 'auth'")
	fmt.Println("     Bad:  'utils', 'helpers', 'common'")
	fmt.Println("  2. Avoid package-level state when possible (testability)")
	fmt.Println("  3. Keep packages focused — one clear responsibility")
	fmt.Println("  4. Exported API surface should be minimal")
	fmt.Println("  5. Document every exported name with a comment")

	// ── Circular imports ────────────────────────────────────
	fmt.Println("\n--- Circular imports (forbidden) ---")
	fmt.Println("  Go does NOT allow circular imports.")
	// Output:   Go does NOT allow circular imports.
	fmt.Println("  If ward Adarsh Nagar imports Civil Lines, then Civil Lines cannot import Adarsh Nagar.")
	// Output:   If ward Adarsh Nagar imports Civil Lines, then Civil Lines cannot import Adarsh Nagar.
	fmt.Println("  Solution: extract shared types into a third ward (Sadar Bazar).")
	// Output:   Solution: extract shared types into a third ward (Sadar Bazar).

	// ============================================================
	//  KEY TAKEAWAYS
	// ============================================================
	fmt.Println("\n============================================================")
	fmt.Println("  KEY TAKEAWAYS")
	fmt.Println("============================================================")
	fmt.Println(`
  1. Every Go file starts with 'package <name>'. Executables use
     'package main' with func main(). Libraries use any other name.

  2. Exported names start with a capital letter. Unexported names
     start with lowercase. This IS the access control system.

  3. init() runs before main(), can appear multiple times per file,
     and is used for setup, registration, and validation.

  4. Blank imports (_ "pkg") run a package's init() without using
     its exports — common for database drivers and image decoders.

  5. go.mod defines your module path and dependencies. go.sum
     ensures reproducible builds. Always commit both to VCS.

  6. 'go mod tidy' is your friend — it adds missing deps and
     removes unused ones. Run it often.

  7. The 'internal' directory restricts package visibility to
     your own module — Go's built-in encapsulation boundary.

  8. Circular imports are forbidden. Use a third package to
     break the cycle.`)
}
