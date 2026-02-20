// ============================================================
//  FILE 29 : Project — CLI Tool ("KaamLog")
// ============================================================
//  Topic  : os.Args, fmt, encoding/json, os (file I/O),
//           strings, strconv, time, struct design, slices
//
//  WHY THIS MATTERS:
//  A CLI task manager is the bread-and-butter utility every
//  developer builds eventually. It ties together file I/O,
//  JSON serialization, struct modeling, string formatting,
//  and slice manipulation — all the skills from earlier files
//  converging into a single, useful tool. Building this cements
//  the idea that Go's standard library is production-ready.
// ============================================================

// ============================================================
// STORY: KaamLog — The Kirana Ledger
// Seth Govind ji's kirana store in Chandni Chowk has grown
// busy. Orders pile up, festival stock deadlines blur together.
// Seth ji decides to build a task ledger — a CLI tool that
// reads and writes a JSON file, turning chaos into a neat,
// queryable list. Each command is a stroke of the pen: add,
// list, done, delete, stats. The ledger lives in a temp file
// so nothing pollutes the real filesystem.
// ============================================================

package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// ============================================================
// SECTION 1 — Data Model
// ============================================================
// WHY: A well-defined struct is the backbone of any CLI tool.
// JSON tags control serialization, time.Time gives us proper
// timestamps, and a pointer for CompletedAt lets us represent
// "not yet done" as null in JSON.

// Task represents a single to-do item in the kirana ledger.
type Task struct {
	ID          int        `json:"id"`
	Description string     `json:"description"`
	Done        bool       `json:"done"`
	CreatedAt   time.Time  `json:"created_at"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`
}

// TaskStore holds the full collection and the path to the file.
type TaskStore struct {
	FilePath string
	Tasks    []Task
	NextID   int
}

// ============================================================
// SECTION 2 — Store Operations (CRUD)
// ============================================================
// WHY: Separating load/save from business logic keeps the code
// testable and mirrors real-world CLI architecture.

// NewTaskStore creates a store backed by a temp-directory JSON file.
func NewTaskStore() *TaskStore {
	path := filepath.Join(os.TempDir(), "kaamlog_data.json")
	store := &TaskStore{FilePath: path, NextID: 1}
	store.load() // load existing data if any
	return store
}

// load reads the JSON file into memory.
func (s *TaskStore) load() {
	data, err := os.ReadFile(s.FilePath)
	if err != nil {
		// File doesn't exist yet — that's fine, start fresh.
		return
	}
	var tasks []Task
	if err := json.Unmarshal(data, &tasks); err != nil {
		fmt.Printf("  [WARN] Corrupt data file, starting fresh: %v\n", err)
		return
	}
	s.Tasks = tasks
	// Recalculate NextID from existing tasks.
	for _, t := range s.Tasks {
		if t.ID >= s.NextID {
			s.NextID = t.ID + 1
		}
	}
}

// save writes the in-memory tasks back to the JSON file.
func (s *TaskStore) save() error {
	data, err := json.MarshalIndent(s.Tasks, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal error: %w", err)
	}
	return os.WriteFile(s.FilePath, data, 0644)
}

// ============================================================
// SECTION 3 — Commands
// ============================================================
// WHY: Each command is a method on TaskStore, making the code
// self-documenting. Real CLI tools (cobra, urfave/cli) follow
// the same pattern — a handler per command.

// Add creates a new task with the given description.
func (s *TaskStore) Add(description string) {
	task := Task{
		ID:          s.NextID,
		Description: description,
		Done:        false,
		CreatedAt:   time.Now(),
	}
	s.NextID++
	s.Tasks = append(s.Tasks, task)
	if err := s.save(); err != nil {
		fmt.Printf("  [ERROR] Failed to save: %v\n", err)
		return
	}
	fmt.Printf("  + Added task #%d: %q\n", task.ID, task.Description)
}

// List prints tasks filtered by status: "all", "done", or "pending".
func (s *TaskStore) List(filter string) {
	// WHY: Filtering is a common CLI pattern. Using a simple string
	// parameter avoids enum boilerplate for a small tool.
	var filtered []Task
	for _, t := range s.Tasks {
		switch filter {
		case "done":
			if t.Done {
				filtered = append(filtered, t)
			}
		case "pending":
			if !t.Done {
				filtered = append(filtered, t)
			}
		default:
			filtered = append(filtered, t)
		}
	}

	label := strings.ToUpper(filter)
	if label == "" {
		label = "ALL"
	}
	fmt.Printf("\n  %-4s %-6s %-30s %-20s %s\n",
		"ID", "STATUS", "DESCRIPTION", "CREATED", "COMPLETED")
	fmt.Printf("  %s\n", strings.Repeat("-", 90))

	if len(filtered) == 0 {
		fmt.Printf("  (no %s tasks)\n", strings.ToLower(label))
		return
	}

	for _, t := range filtered {
		status := "[ ]"
		if t.Done {
			status = "[x]"
		}
		completed := "—"
		if t.CompletedAt != nil {
			completed = t.CompletedAt.Format("2006-01-02 15:04:05")
		}
		fmt.Printf("  %-4d %-6s %-30s %-20s %s\n",
			t.ID,
			status,
			truncate(t.Description, 28),
			t.CreatedAt.Format("2006-01-02 15:04:05"),
			completed,
		)
	}
	fmt.Printf("  %s\n", strings.Repeat("-", 90))
	fmt.Printf("  Showing %d %s task(s)\n", len(filtered), strings.ToLower(label))
}

// Done marks a task as completed by its ID.
func (s *TaskStore) Done(id int) {
	for i := range s.Tasks {
		if s.Tasks[i].ID == id {
			if s.Tasks[i].Done {
				fmt.Printf("  ~ Task #%d is already done.\n", id)
				return
			}
			now := time.Now()
			s.Tasks[i].Done = true
			s.Tasks[i].CompletedAt = &now
			if err := s.save(); err != nil {
				fmt.Printf("  [ERROR] Failed to save: %v\n", err)
				return
			}
			fmt.Printf("  * Completed task #%d: %q\n", id, s.Tasks[i].Description)
			return
		}
	}
	fmt.Printf("  [WARN] Task #%d not found.\n", id)
}

// Delete removes a task by its ID.
func (s *TaskStore) Delete(id int) {
	for i, t := range s.Tasks {
		if t.ID == id {
			s.Tasks = append(s.Tasks[:i], s.Tasks[i+1:]...)
			if err := s.save(); err != nil {
				fmt.Printf("  [ERROR] Failed to save: %v\n", err)
				return
			}
			fmt.Printf("  - Deleted task #%d: %q\n", id, t.Description)
			return
		}
	}
	fmt.Printf("  [WARN] Task #%d not found.\n", id)
}

// Stats prints a summary of task counts and completion rate.
func (s *TaskStore) Stats() {
	total := len(s.Tasks)
	done := 0
	for _, t := range s.Tasks {
		if t.Done {
			done++
		}
	}
	pending := total - done
	rate := 0.0
	if total > 0 {
		rate = float64(done) / float64(total) * 100
	}

	fmt.Println("\n  ==============================")
	fmt.Println("       KaamLog Stats")
	fmt.Println("  ==============================")
	fmt.Printf("  Total tasks   : %d\n", total)
	fmt.Printf("  Completed     : %d\n", done)
	fmt.Printf("  Pending       : %d\n", pending)
	fmt.Printf("  Completion %%  : %.1f%%\n", rate)
	fmt.Println("  ==============================")
}

// ============================================================
// SECTION 4 — Helpers
// ============================================================
// WHY: Small utility functions keep the main logic clean.

// truncate shortens a string to maxLen, adding "..." if needed.
func truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen-3] + "..."
}

// printBanner prints a section divider for the self-test output.
func printBanner(title string) {
	fmt.Printf("\n%s\n", strings.Repeat("=", 60))
	fmt.Printf("  COMMAND: %s\n", title)
	fmt.Printf("%s\n", strings.Repeat("=", 60))
}

// ============================================================
// SECTION 5 — File Inspection (show raw JSON)
// ============================================================
// WHY: Peeking at the raw file proves the data is truly
// persisted and properly formatted — not just in memory.

func (s *TaskStore) ShowRawFile() {
	data, err := os.ReadFile(s.FilePath)
	if err != nil {
		fmt.Printf("  [ERROR] Cannot read file: %v\n", err)
		return
	}
	fmt.Println("\n  --- Raw JSON on disk ---")
	// Indent each line for consistent formatting.
	lines := strings.Split(string(data), "\n")
	for _, line := range lines {
		fmt.Printf("  %s\n", line)
	}
	fmt.Println("  --- End of file ---")
}

// ============================================================
// SECTION 6 — Cleanup
// ============================================================
// WHY: Self-testing programs should clean up after themselves.
// os.Remove deletes the temp file so repeated runs start fresh.

func (s *TaskStore) Cleanup() {
	if err := os.Remove(s.FilePath); err != nil && !os.IsNotExist(err) {
		fmt.Printf("  [WARN] Could not remove temp file: %v\n", err)
	} else {
		fmt.Printf("  Cleaned up temp file: %s\n", s.FilePath)
	}
}

// ============================================================
// SECTION 7 — Main (Self-Test)
// ============================================================
// WHY: Instead of reading os.Args (which would require manual
// testing), we embed a full demo sequence. This proves every
// command works and produces visible output.

func main() {
	fmt.Println("============================================================")
	fmt.Println("  KaamLog — Kirana Store Task Manager (Self-Test Demo)")
	fmt.Println("============================================================")

	store := NewTaskStore()
	defer store.Cleanup()

	fmt.Printf("  Data file: %s\n", store.FilePath)

	// --- ADD tasks ---
	printBanner("add (5 tasks)")
	store.Add("Order Toor Dal from wholesaler")
	store.Add("Restock Atta shelf")
	store.Add("Collect payment from Sharma ji")
	store.Add("Call distributor for oil supply")
	store.Add("Update price list for festival season")

	// --- LIST all ---
	printBanner("list all")
	store.List("all")

	// --- DONE: mark tasks 1 and 3 as complete ---
	printBanner("done 1, done 3")
	store.Done(1)
	store.Done(3)

	// --- DONE: try marking #1 again (already done) ---
	printBanner("done 1 (duplicate)")
	store.Done(1)

	// --- LIST done ---
	printBanner("list done")
	store.List("done")

	// --- LIST pending ---
	printBanner("list pending")
	store.List("pending")

	// --- DELETE task 4 ---
	printBanner("delete 4")
	store.Delete(4)

	// --- DELETE non-existent task ---
	printBanner("delete 99 (not found)")
	store.Delete(99)

	// --- LIST all after changes ---
	printBanner("list all (after done + delete)")
	store.List("all")

	// --- STATS ---
	printBanner("stats")
	store.Stats()

	// --- Show raw JSON file ---
	printBanner("show raw JSON file")
	store.ShowRawFile()

	// --- Add one more, mark done, show updated stats ---
	printBanner("add + done + stats (round 2)")
	store.Add("Check weighing scale calibration")
	store.Done(6)
	store.Stats()

	// --- Final list ---
	printBanner("final list (all)")
	store.List("all")

	fmt.Println("\n============================================================")
	fmt.Println("  KaamLog self-test complete.")
	fmt.Println("============================================================")
}

// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. Struct + JSON tags give you free serialization — no ORM,
//    no schema definition language, just Go types.
// 2. *time.Time (pointer) lets JSON encode "null" for missing
//    CompletedAt, while omitempty suppresses the field entirely.
// 3. os.TempDir() is the safe place for throwaway files; it's
//    cross-platform and avoids polluting the project directory.
// 4. Separating store operations (load/save) from commands
//    (Add/Done/Delete) mirrors real CLI architecture.
// 5. Self-testing via embedded commands guarantees the demo
//    always works — no manual typing required.
// 6. strings.Repeat, fmt.Printf alignment, and helper functions
//    like truncate() produce professional CLI output.
// 7. defer store.Cleanup() ensures temp files vanish even if
//    something panics partway through.
// ============================================================
