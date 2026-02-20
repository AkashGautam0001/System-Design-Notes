// ============================================================
//  FILE 17: THE SYNC PACKAGE
// ============================================================
//  Topic: Mutex, RWMutex, Once, sync.Map, sync.Pool, and
//         sync/atomic — tools for safe concurrent access.
//
//  WHY THIS MATTERS:
//    While channels are Go's preferred concurrency primitive,
//    sometimes you need to protect shared state directly.  The
//    sync package provides low-level building blocks for mutual
//    exclusion, one-time initialization, concurrent-safe maps,
//    object pooling, and atomic operations.
// ============================================================
//
//  STORY — "SBI Locker Room"
//  Guard Raju manages the SBI bank locker room.  The lockers
//  (shared state) must be carefully guarded:
//    - A Mutex is the locker key — only one customer enters at a time.
//    - An RWMutex is the notice board — many can read the notices
//      simultaneously, but updating requires exclusive access.
//    - Once is the vault combination — set exactly once, on the
//      first business day, never changed.
//    - sync.Map is the locker allocation register — optimized for many
//      concurrent customers accessing different locker numbers.
//    - sync.Pool is the token counter — reusable tokens for customers,
//      reducing the cost of issuing new ones (GC pressure).
// ============================================================

package main

import (
	"fmt"
	"sync"
	"sync/atomic"
	"time"
)

func main() {
	// ============================================================
	//  EXAMPLE BLOCK 1 — Mutex, RWMutex, Once
	// ============================================================

	fmt.Println("============================================================")
	fmt.Println("  BLOCK 1: Mutex, RWMutex & Once")
	fmt.Println("============================================================")

	// ── sync.Mutex — exclusive access ───────────────────────
	// WHY: Mutex provides mutual exclusion.  Only one goroutine
	// can hold the lock at a time.  All others block on Lock().

	fmt.Println("\n--- sync.Mutex — protecting a shared counter ---")

	type SafeCounter struct {
		mu    sync.Mutex
		value int
	}

	counter := &SafeCounter{}
	var wg sync.WaitGroup

	for i := 0; i < 1000; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			counter.mu.Lock()
			counter.value++
			counter.mu.Unlock()
		}()
	}

	wg.Wait()
	fmt.Printf("  Counter value (expected 1000): %d\n", counter.value)
	// Output: Counter value (expected 1000): 1000

	// ── defer mu.Unlock() pattern ───────────────────────────
	fmt.Println("\n--- defer Unlock() for safety ---")

	// WHY: Using defer ensures the lock is released even if the
	// function panics.  This prevents deadlocks from uncaught errors.

	safeIncrement := func(c *SafeCounter) {
		c.mu.Lock()
		defer c.mu.Unlock() // Guaranteed release, even on panic
		c.value++
	}

	safeIncrement(counter)
	fmt.Printf("  After safeIncrement: %d\n", counter.value)
	// Output: After safeIncrement: 1001

	// WHY: Never copy a Mutex after first use. Pass by pointer.
	// A copied Mutex has independent state — both copies could Lock.
	fmt.Println("  WARNING: Never copy a sync.Mutex — always pass by pointer!")

	// ── sync.RWMutex — multiple readers, exclusive writer ───
	// WHY: In read-heavy workloads, Mutex is too strict — it
	// serializes ALL access, even reads.  RWMutex allows many
	// concurrent readers OR one exclusive writer.

	fmt.Println("\n--- sync.RWMutex — read-heavy workload ---")

	type LockerRegister struct {
		mu      sync.RWMutex
		lockers map[string]string
	}

	register := &LockerRegister{
		lockers: map[string]string{
			"raju":   "Guard",
			"meena":  "Manager",
			"arvind": "Head Cashier",
		},
	}

	// Read function — multiple goroutines can read simultaneously
	readLocker := func(r *LockerRegister, name string) string {
		r.mu.RLock()         // Shared read lock
		defer r.mu.RUnlock() // Release read lock
		return r.lockers[name]
	}

	// Write function — exclusive access, blocks all readers/writers
	writeLocker := func(r *LockerRegister, name, role string) {
		r.mu.Lock()         // Exclusive write lock
		defer r.mu.Unlock() // Release write lock
		r.lockers[name] = role
	}

	// Launch concurrent readers
	var wg2 sync.WaitGroup
	for i := 0; i < 5; i++ {
		wg2.Add(1)
		go func(id int) {
			defer wg2.Done()
			role := readLocker(register, "raju")
			fmt.Printf("  Reader %d: raju = %s\n", id, role)
		}(i)
	}

	// One writer (will wait for readers to finish)
	wg2.Add(1)
	go func() {
		defer wg2.Done()
		writeLocker(register, "priya", "Clerk")
		fmt.Println("  Writer: added priya = Clerk")
	}()

	wg2.Wait()
	fmt.Println("  Final register:", register.lockers)

	// RWMutex rules:
	fmt.Println("\n  RWMutex rules:")
	fmt.Println("    - Multiple RLock() allowed simultaneously")
	fmt.Println("    - Lock() waits for ALL RLock() to release")
	fmt.Println("    - While Lock() is held, RLock() blocks too")
	fmt.Println("    - Good for: config caches, in-memory stores, read-heavy data")

	// ── sync.Once — exactly-once initialization ─────────────
	// WHY: Once ensures a function runs exactly ONCE, no matter
	// how many goroutines call it.  Perfect for lazy singletons.

	fmt.Println("\n--- sync.Once — singleton pattern ---")

	type BranchConfig struct {
		BranchCode string
		IFSCCode   string
	}

	var (
		once     sync.Once
		instance *BranchConfig
	)

	getBranchConfig := func() *BranchConfig {
		once.Do(func() {
			fmt.Println("  [Once] Initializing branch config (this runs exactly once)...")
			instance = &BranchConfig{BranchCode: "SBI-MUM-001", IFSCCode: "SBIN0001234"}
		})
		return instance
	}

	// Launch multiple goroutines trying to initialize
	var wg3 sync.WaitGroup
	for i := 0; i < 5; i++ {
		wg3.Add(1)
		go func(id int) {
			defer wg3.Done()
			cfg := getBranchConfig()
			fmt.Printf("  Goroutine %d got config: %s (IFSC: %s)\n", id, cfg.BranchCode, cfg.IFSCCode)
		}(i)
	}

	wg3.Wait()
	// Output: [Once] Initializing branch config (this runs exactly once)...
	//         (appears only ONCE, then 5 goroutines print their config)

	// WHY: sync.Once is safe even if Do panics — subsequent calls
	// won't retry.  Use sync.OnceValue (Go 1.21+) to cache a return value.

	fmt.Println("\n  sync.Once guarantees:")
	fmt.Println("    - The function runs at most once")
	fmt.Println("    - All callers wait until the function completes")
	fmt.Println("    - Safe for concurrent access from any number of goroutines")

	// ============================================================
	//  EXAMPLE BLOCK 2 — sync.Map, sync.Pool, Atomic Operations
	// ============================================================

	fmt.Println("\n============================================================")
	fmt.Println("  BLOCK 2: sync.Map, sync.Pool & Atomic Operations")
	fmt.Println("============================================================")

	// ── sync.Map — concurrent-safe map ──────────────────────
	// WHY: Regular Go maps are NOT safe for concurrent access.
	// sync.Map is optimized for two common patterns:
	//   1. Write-once, read-many (like a cache that stabilizes)
	//   2. Many goroutines read/write disjoint key sets

	fmt.Println("\n--- sync.Map — concurrent-safe map ---")

	var lockerAllotment sync.Map

	// Store values (no lock needed)
	lockerAllotment.Store("locker-101", "Gold ornaments")
	lockerAllotment.Store("locker-102", "Property documents")
	lockerAllotment.Store("locker-103", "Fixed deposit certificates")

	// Load a value
	if val, ok := lockerAllotment.Load("locker-101"); ok {
		fmt.Println("  locker-101:", val)
		// Output: locker-101: Gold ornaments
	}

	// LoadOrStore — load if exists, otherwise store
	actual, loaded := lockerAllotment.LoadOrStore("locker-104", "Insurance papers")
	fmt.Printf("  locker-104: %v (loaded existing: %v)\n", actual, loaded)
	// Output: locker-104: Insurance papers (loaded existing: false)

	actual, loaded = lockerAllotment.LoadOrStore("locker-104", "Diamond jewellery")
	fmt.Printf("  locker-104: %v (loaded existing: %v)\n", actual, loaded)
	// Output: locker-104: Insurance papers (loaded existing: true)

	// Delete
	lockerAllotment.Delete("locker-103")

	// Range over all entries
	fmt.Println("  All lockers:")
	lockerAllotment.Range(func(key, value any) bool {
		fmt.Printf("    %s → %s\n", key, value)
		return true // continue iteration (false = stop)
	})

	// When to use sync.Map vs map+Mutex:
	fmt.Println("\n  sync.Map vs map + Mutex:")
	fmt.Println("    sync.Map is BETTER when:")
	fmt.Println("      - Keys are stable (written once, read many times)")
	fmt.Println("      - Many goroutines access disjoint key sets")
	fmt.Println("    map + Mutex is BETTER when:")
	fmt.Println("      - You need type safety (sync.Map uses any)")
	fmt.Println("      - You need to do complex operations atomically")
	fmt.Println("      - Your access pattern doesn't fit sync.Map's sweet spot")

	// ── sync.Pool — object reuse ────────────────────────────
	// WHY: Pool is a cache of reusable objects that reduces GC
	// pressure.  Get() retrieves an object (or creates one via New).
	// Put() returns it to the pool.  The pool may be cleared by GC.

	fmt.Println("\n--- sync.Pool — object reuse for GC reduction ---")

	type Buffer struct {
		data []byte
	}

	bufferPool := &sync.Pool{
		New: func() any {
			fmt.Println("    [Pool] Creating new buffer")
			return &Buffer{data: make([]byte, 0, 1024)}
		},
	}

	// First Get — pool is empty, so New() is called
	buf1 := bufferPool.Get().(*Buffer)
	buf1.data = append(buf1.data, "hello"...)
	fmt.Printf("  Got buffer: %s (len=%d, cap=%d)\n",
		string(buf1.data), len(buf1.data), cap(buf1.data))
	// Output: Got buffer: hello (len=5, cap=1024)

	// Return to pool (reset before returning!)
	buf1.data = buf1.data[:0] // WHY: Always reset state before Put
	bufferPool.Put(buf1)

	// Second Get — reuses the pooled buffer (no New() call)
	buf2 := bufferPool.Get().(*Buffer)
	fmt.Printf("  Reused buffer: len=%d, cap=%d (same underlying array)\n",
		len(buf2.data), cap(buf2.data))
	// Output: Reused buffer: len=0, cap=1024 (same underlying array)

	fmt.Println("  Same buffer reused:", buf1 == buf2)
	// Output: Same buffer reused: true

	bufferPool.Put(buf2)

	fmt.Println("\n  sync.Pool notes:")
	fmt.Println("    - Objects may be garbage collected at any time")
	fmt.Println("    - Do NOT rely on pool for persistent storage")
	fmt.Println("    - Always reset objects before Put()")
	fmt.Println("    - Common use: byte buffers, encoder/decoder objects")
	fmt.Println("    - Used internally by fmt, encoding/json, net/http")

	// ── sync/atomic — lock-free atomic operations ───────────
	// WHY: Atomic operations are the lowest-level synchronization
	// primitive.  They're faster than Mutex for simple counter
	// operations because they use CPU-level instructions.

	fmt.Println("\n--- sync/atomic — atomic operations ---")

	var atomicCounter atomic.Int64

	var wg4 sync.WaitGroup
	for i := 0; i < 1000; i++ {
		wg4.Add(1)
		go func() {
			defer wg4.Done()
			atomicCounter.Add(1) // Atomic increment — no lock needed
		}()
	}

	wg4.Wait()
	fmt.Printf("  Atomic counter (expected 1000): %d\n", atomicCounter.Load())
	// Output: Atomic counter (expected 1000): 1000

	// Other atomic types and operations
	fmt.Println("\n  Atomic types (Go 1.19+):")
	fmt.Println("    atomic.Int32, atomic.Int64, atomic.Uint32, atomic.Uint64")
	fmt.Println("    atomic.Bool, atomic.Pointer[T]")
	fmt.Println("    Methods: Load, Store, Add, Swap, CompareAndSwap")

	// atomic.Bool demo
	var ready atomic.Bool
	ready.Store(true)
	fmt.Printf("  atomic.Bool ready: %v\n", ready.Load())
	// Output: atomic.Bool ready: true

	// CompareAndSwap (CAS) — the foundation of lock-free algorithms
	swapped := atomicCounter.CompareAndSwap(1000, 0) // if value==1000, set to 0
	fmt.Printf("  CAS(1000→0): swapped=%v, value=%d\n",
		swapped, atomicCounter.Load())
	// Output: CAS(1000→0): swapped=true, value=0

	// ── Comparing synchronization approaches ────────────────
	fmt.Println("\n--- Comparing synchronization approaches ---")

	// Benchmark-style comparison (not a real benchmark, just illustration)
	const iterations = 100000

	// Approach 1: Mutex
	start := time.Now()
	var muCounter int
	var benchMu sync.Mutex
	var benchWg sync.WaitGroup
	for i := 0; i < iterations; i++ {
		benchWg.Add(1)
		go func() {
			defer benchWg.Done()
			benchMu.Lock()
			muCounter++
			benchMu.Unlock()
		}()
	}
	benchWg.Wait()
	mutexTime := time.Since(start)

	// Approach 2: Atomic
	start = time.Now()
	var atomCounter atomic.Int64
	for i := 0; i < iterations; i++ {
		benchWg.Add(1)
		go func() {
			defer benchWg.Done()
			atomCounter.Add(1)
		}()
	}
	benchWg.Wait()
	atomicTime := time.Since(start)

	fmt.Printf("  Mutex  (%d ops): %v — result: %d\n",
		iterations, mutexTime, muCounter)
	fmt.Printf("  Atomic (%d ops): %v — result: %d\n",
		iterations, atomicTime, atomCounter.Load())
	fmt.Println("  (Atomic is typically faster for simple counter operations)")

	// ── Decision guide ──────────────────────────────────────
	fmt.Println("\n--- When to use what ---")
	fmt.Println("  Channels:    Communication between goroutines, pipelines")
	fmt.Println("  Mutex:       Protecting complex shared state (structs, maps)")
	fmt.Println("  RWMutex:     Read-heavy workloads with occasional writes")
	fmt.Println("  Once:        One-time initialization (singletons, config)")
	fmt.Println("  sync.Map:    Concurrent map with stable or disjoint keys")
	fmt.Println("  sync.Pool:   Reusable temporary objects (reduce GC)")
	fmt.Println("  atomic:      Simple counters, flags, pointers (fastest)")

	// ============================================================
	//  KEY TAKEAWAYS
	// ============================================================
	fmt.Println("\n============================================================")
	fmt.Println("  KEY TAKEAWAYS")
	fmt.Println("============================================================")
	fmt.Println(`
  1. sync.Mutex provides exclusive access. Lock() and Unlock()
     serialize goroutines. Always use defer Unlock() for safety.

  2. sync.RWMutex allows multiple concurrent readers (RLock) but
     exclusive writers (Lock). Ideal for read-heavy workloads.

  3. sync.Once guarantees a function runs exactly once, even
     across many goroutines. Perfect for lazy initialization.

  4. sync.Map is a concurrent-safe map optimized for stable keys
     and disjoint access. Use map+Mutex for everything else.

  5. sync.Pool caches reusable objects to reduce GC pressure.
     Always reset objects before Put(). Pool contents may be
     garbage collected at any time.

  6. sync/atomic provides lock-free operations for simple types
     (counters, bools, pointers). Fastest for simple operations.

  7. Never copy sync types (Mutex, RWMutex, WaitGroup, Once,
     Pool, Map) after first use. Always pass by pointer.

  8. Choose the right tool: channels for communication, Mutex
     for shared state, atomic for simple counters. Don't reach
     for Mutex when a channel would be clearer.`)
}
