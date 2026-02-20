// ============================================================
//  FILE 19 : I/O and Files
// ============================================================
//  Topic  : os.Open, os.Create, os.ReadFile, os.WriteFile,
//           bufio.Scanner, bufio.Reader, bufio.Writer,
//           io.Reader, io.Writer, io.Copy, io.TeeReader,
//           io.MultiWriter, os.Stat, os.Mkdir, os.MkdirAll,
//           os.ReadDir, os.CreateTemp, os.MkdirTemp
//
//  WHY THIS MATTERS:
//  Every real program reads or writes data — config files, logs,
//  user uploads, database exports. Go's I/O model is built on
//  two tiny interfaces (io.Reader and io.Writer) that compose
//  beautifully: once you learn them, you can plug together
//  files, network connections, compression, and encryption
//  like LEGO bricks.
// ============================================================

// ============================================================
// STORY: The National Archives of India
// Archivist Mehra manages the historical manuscript collection
// at the National Archives of India in Delhi. Every day he
// catalogs new records, copies fragile manuscripts to fresh
// preservation sheets, organises them into labelled sections,
// and keeps a meticulous index. His tools are simple — read,
// write, copy, organise — but combined they preserve centuries
// of India's heritage.
// ============================================================

package main

import (
	"bufio"
	"bytes"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

func main() {
	// ============================================================
	// EXAMPLE BLOCK 1 — Read/Write Files, Buffered I/O, io.Copy
	// ============================================================

	// We'll work inside a temp directory so we leave no mess
	baseDir, err := os.MkdirTemp("", "mehra-archive-*")
	if err != nil {
		fmt.Println("Failed to create temp dir:", err)
		return
	}
	defer os.RemoveAll(baseDir) // WHY: clean up everything when done

	fmt.Println("Mehra's archive directory:", baseDir)

	// ──────────────────────────────────────────────────────────────
	// SECTION 1 — os.WriteFile / os.ReadFile (simple all-at-once)
	// ──────────────────────────────────────────────────────────────
	// WHY: For small files, ReadFile and WriteFile are the easiest
	// approach — one call, no open/close ceremony.

	manuscriptPath := filepath.Join(baseDir, "manuscript_001.txt")
	content := []byte("The ancient manuscript speaks of the Maurya dynasty.\nLine two of the record.\nLine three: the end.")

	err = os.WriteFile(manuscriptPath, content, 0644)
	if err != nil {
		fmt.Println("WriteFile error:", err)
		return
	}
	fmt.Println("\n--- os.WriteFile / os.ReadFile ---")
	fmt.Println("Mehra wrote manuscript_001.txt")
	// Output: Mehra wrote manuscript_001.txt

	data, err := os.ReadFile(manuscriptPath)
	if err != nil {
		fmt.Println("ReadFile error:", err)
		return
	}
	fmt.Println("Mehra reads back:", string(data[:52]))
	// Output: Mehra reads back: The ancient manuscript speaks of the Maurya dynasty.

	// ──────────────────────────────────────────────────────────────
	// SECTION 2 — os.Create, os.Open, os.OpenFile
	// ──────────────────────────────────────────────────────────────
	// WHY: When you need streaming writes, append mode, or
	// fine-grained control, use these lower-level calls.

	fmt.Println("\n--- os.Create / os.Open / os.OpenFile ---")

	// os.Create — creates (or truncates) a file for writing
	catalogPath := filepath.Join(baseDir, "catalog.txt")
	f, err := os.Create(catalogPath)
	if err != nil {
		fmt.Println("Create error:", err)
		return
	}
	f.WriteString("=== National Archives Catalog ===\n")
	f.WriteString("Entry 1: Manuscript of the Maurya Dynasty\n")
	f.Close()
	fmt.Println("Mehra created catalog.txt")
	// Output: Mehra created catalog.txt

	// os.OpenFile with append flag — add without overwriting
	f, err = os.OpenFile(catalogPath, os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		fmt.Println("OpenFile error:", err)
		return
	}
	f.WriteString("Entry 2: Mughal Era Revenue Records\n")
	f.Close()
	fmt.Println("Mehra appended an entry to catalog.txt")
	// Output: Mehra appended an entry to catalog.txt

	// os.Open — opens for reading only
	f, err = os.Open(catalogPath)
	if err != nil {
		fmt.Println("Open error:", err)
		return
	}
	catalogData, _ := io.ReadAll(f)
	f.Close()
	fmt.Println("Catalog contents:")
	fmt.Println(string(catalogData))
	// Output: === National Archives Catalog ===
	// Output: Entry 1: Manuscript of the Maurya Dynasty
	// Output: Entry 2: Mughal Era Revenue Records

	// ──────────────────────────────────────────────────────────────
	// SECTION 3 — bufio.Scanner (line-by-line reading)
	// ──────────────────────────────────────────────────────────────
	// WHY: Scanner is the idiomatic way to process a file line by
	// line. It handles newline stripping and EOF automatically.

	fmt.Println("--- bufio.Scanner (line-by-line) ---")

	f, _ = os.Open(manuscriptPath)
	defer f.Close()

	scanner := bufio.NewScanner(f)
	lineNum := 1
	for scanner.Scan() {
		fmt.Printf("  Line %d: %s\n", lineNum, scanner.Text())
		lineNum++
	}
	// Output:   Line 1: The ancient manuscript speaks of the Maurya dynasty.
	// Output:   Line 2: Line two of the record.
	// Output:   Line 3: Line three: the end.

	if err := scanner.Err(); err != nil {
		fmt.Println("Scanner error:", err)
	}

	// ──────────────────────────────────────────────────────────────
	// SECTION 4 — bufio.Writer (buffered writing)
	// ──────────────────────────────────────────────────────────────
	// WHY: Buffered writing batches small writes into larger chunks,
	// reducing system calls and improving performance for many writes.

	fmt.Println("\n--- bufio.Writer ---")

	logPath := filepath.Join(baseDir, "archive_log.txt")
	logFile, _ := os.Create(logPath)
	writer := bufio.NewWriter(logFile)

	writer.WriteString("Log entry 1: Mehra cataloged 5 manuscripts\n")
	writer.WriteString("Log entry 2: Mehra restored 2 damaged records\n")
	writer.WriteString("Log entry 3: New shipment from Kolkata arrived\n")
	writer.Flush() // WHY: must flush to ensure data reaches the file
	logFile.Close()

	logData, _ := os.ReadFile(logPath)
	fmt.Println("Archive log written with", strings.Count(string(logData), "\n"), "entries")
	// Output: Archive log written with 3 entries

	// ──────────────────────────────────────────────────────────────
	// SECTION 5 — io.Copy, io.TeeReader, io.MultiWriter
	// ──────────────────────────────────────────────────────────────
	// WHY: These composable functions let you wire readers and
	// writers together — copy a file, tee output to two places,
	// or write to multiple destinations at once.

	fmt.Println("\n--- io.Copy ---")

	// io.Copy — copy one reader to one writer
	copyPath := filepath.Join(baseDir, "manuscript_001_copy.txt")
	src, _ := os.Open(manuscriptPath)
	dst, _ := os.Create(copyPath)
	bytesCopied, err := io.Copy(dst, src)
	src.Close()
	dst.Close()
	fmt.Printf("Mehra copied %d bytes to manuscript_001_copy.txt\n", bytesCopied)
	// Output: Mehra copied 91 bytes to manuscript_001_copy.txt

	// io.MultiWriter — write to multiple destinations at once
	fmt.Println("\n--- io.MultiWriter ---")
	var buf1, buf2 bytes.Buffer
	multi := io.MultiWriter(&buf1, &buf2)
	multi.Write([]byte("This text goes to TWO buffers"))
	fmt.Println("Buffer 1:", buf1.String())
	// Output: Buffer 1: This text goes to TWO buffers
	fmt.Println("Buffer 2:", buf2.String())
	// Output: Buffer 2: This text goes to TWO buffers

	// io.TeeReader — read from source, tee to a writer
	fmt.Println("\n--- io.TeeReader ---")
	source := strings.NewReader("Mehra reads and logs simultaneously")
	var logBuf bytes.Buffer
	tee := io.TeeReader(source, &logBuf)
	result, _ := io.ReadAll(tee)
	fmt.Println("Read result:", string(result))
	// Output: Read result: Mehra reads and logs simultaneously
	fmt.Println("Log copy:  ", logBuf.String())
	// Output: Log copy:   Mehra reads and logs simultaneously

	// ============================================================
	// EXAMPLE BLOCK 2 — Directories, Temp Files, File Info, Patterns
	// ============================================================

	// ──────────────────────────────────────────────────────────────
	// SECTION 6 — File info with os.Stat
	// ──────────────────────────────────────────────────────────────
	// WHY: os.Stat lets you check if a file exists, get its size,
	// modification time, and permissions — essential for validation.

	fmt.Println("\n--- os.Stat / os.IsNotExist ---")

	info, err := os.Stat(manuscriptPath)
	if err != nil {
		fmt.Println("Stat error:", err)
	} else {
		fmt.Printf("File: %s\n", info.Name())
		// Output: File: manuscript_001.txt
		fmt.Printf("Size: %d bytes\n", info.Size())
		// Output: Size: 91 bytes
		fmt.Printf("Is directory: %v\n", info.IsDir())
		// Output: Is directory: false
		fmt.Printf("Permissions: %s\n", info.Mode())
		// Output: Permissions: -rw-r--r--
	}

	// Check for a file that does NOT exist
	_, err = os.Stat(filepath.Join(baseDir, "nonexistent.txt"))
	fmt.Printf("nonexistent.txt exists? %v\n", !os.IsNotExist(err))
	// Output: nonexistent.txt exists? false

	// ──────────────────────────────────────────────────────────────
	// SECTION 7 — Directories: os.Mkdir, os.MkdirAll, os.ReadDir
	// ──────────────────────────────────────────────────────────────
	// WHY: Organising files into directories is fundamental.
	// MkdirAll creates nested paths in one call. ReadDir lists
	// directory contents without loading file data.

	fmt.Println("\n--- Directories ---")

	// os.Mkdir — create a single directory
	sectionA := filepath.Join(baseDir, "section-Mughal")
	err = os.Mkdir(sectionA, 0755)
	if err != nil {
		fmt.Println("Mkdir error:", err)
	}
	fmt.Println("Created section-Mughal")
	// Output: Created section-Mughal

	// os.MkdirAll — create nested directories in one call
	nested := filepath.Join(baseDir, "section-British", "shelf-1", "drawer-top")
	err = os.MkdirAll(nested, 0755)
	if err != nil {
		fmt.Println("MkdirAll error:", err)
	}
	fmt.Println("Created nested path: section-British/shelf-1/drawer-top")
	// Output: Created nested path: section-British/shelf-1/drawer-top

	// Write a file inside the nested directory
	nestedFile := filepath.Join(nested, "rare_manuscript.txt")
	os.WriteFile(nestedFile, []byte("A very rare Chola dynasty manuscript"), 0644)

	// os.ReadDir — list directory contents
	fmt.Println("\nContents of archive root:")
	entries, _ := os.ReadDir(baseDir)
	for _, entry := range entries {
		kind := "FILE"
		if entry.IsDir() {
			kind = "DIR "
		}
		fmt.Printf("  [%s] %s\n", kind, entry.Name())
	}
	// Output:   [FILE] archive_log.txt
	// Output:   [FILE] catalog.txt
	// Output:   [FILE] manuscript_001.txt
	// Output:   [FILE] manuscript_001_copy.txt
	// Output:   [DIR ] section-British
	// Output:   [DIR ] section-Mughal

	// ──────────────────────────────────────────────────────────────
	// SECTION 8 — Temp files and temp directories
	// ──────────────────────────────────────────────────────────────
	// WHY: Temp files are perfect for intermediate processing —
	// the OS provides a safe location and unique names.

	fmt.Println("\n--- Temp Files and Directories ---")

	// os.CreateTemp — creates a temp file
	tmpFile, err := os.CreateTemp("", "mehra-temp-*.txt")
	if err != nil {
		fmt.Println("CreateTemp error:", err)
		return
	}
	tmpFile.WriteString("Temporary processing data")
	fmt.Println("Temp file created:", filepath.Base(tmpFile.Name()))
	tmpFile.Close()
	os.Remove(tmpFile.Name()) // WHY: always clean up temp files

	// os.MkdirTemp — creates a temp directory
	tmpDir, err := os.MkdirTemp("", "mehra-workdir-*")
	if err != nil {
		fmt.Println("MkdirTemp error:", err)
		return
	}
	fmt.Println("Temp dir created:", filepath.Base(tmpDir))
	os.RemoveAll(tmpDir) // WHY: clean up temp directories too

	// ──────────────────────────────────────────────────────────────
	// SECTION 9 — Practical pattern: process large file line by line
	// ──────────────────────────────────────────────────────────────
	// WHY: For large files, you cannot load everything into memory.
	// The Scanner approach reads one line at a time with constant
	// memory usage — critical for log processing, CSV parsing, etc.

	fmt.Println("\n--- Pattern: Process Large File Line by Line ---")

	// Create a simulated large file
	largePath := filepath.Join(baseDir, "large_register.txt")
	func() {
		lf, _ := os.Create(largePath)
		defer lf.Close()
		w := bufio.NewWriter(lf)
		for i := 1; i <= 1000; i++ {
			fmt.Fprintf(w, "Record %04d: data-entry\n", i)
		}
		w.Flush()
	}()

	// Process it line by line, counting matches
	func() {
		lf, _ := os.Open(largePath)
		defer lf.Close()

		sc := bufio.NewScanner(lf)
		total := 0
		matches := 0
		for sc.Scan() {
			total++
			if strings.Contains(sc.Text(), "Record 0500") {
				matches++
				fmt.Println("  Found:", sc.Text())
				// Output:   Found: Record 0500: data-entry
			}
		}
		fmt.Printf("  Processed %d lines, found %d matches\n", total, matches)
		// Output:   Processed 1000 lines, found 1 matches
	}()

	// ──────────────────────────────────────────────────────────────
	// SECTION 10 — io.Reader and io.Writer interfaces
	// ──────────────────────────────────────────────────────────────
	// WHY: These two interfaces are the foundation of all Go I/O.
	// Any type implementing Read([]byte) (int, error) is an
	// io.Reader. This lets you write functions that work with
	// files, network connections, strings, and buffers identically.

	fmt.Println("\n--- io.Reader / io.Writer interfaces ---")

	// strings.NewReader implements io.Reader
	r := strings.NewReader("Mehra's universal reader")
	// bytes.Buffer implements both io.Reader and io.Writer
	var output bytes.Buffer

	// This function accepts ANY io.Reader and ANY io.Writer
	n, _ := io.Copy(&output, r)
	fmt.Printf("Copied %d bytes via interfaces: %s\n", n, output.String())
	// Output: Copied 23 bytes via interfaces: Mehra's universal reader

	fmt.Println("\nMehra's archive operations complete. All temp files cleaned up.")
	// Output: Mehra's archive operations complete. All temp files cleaned up.
}

// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. os.ReadFile / os.WriteFile are the simplest way to handle
//    small files — one call, no open/close needed.
//
// 2. os.Open (read-only), os.Create (write/truncate), and
//    os.OpenFile (full control with flags) handle streaming I/O.
//    Always close files — defer f.Close() is idiomatic.
//
// 3. bufio.Scanner reads line by line with constant memory —
//    essential for large file processing.
//
// 4. bufio.Writer batches small writes for performance.
//    Always call Flush() to ensure data reaches the file.
//
// 5. io.Reader and io.Writer are Go's composable I/O building
//    blocks. Any function accepting these interfaces works with
//    files, buffers, network connections, and more.
//
// 6. io.Copy streams data between a Reader and Writer.
//    io.MultiWriter fans out to multiple writers.
//    io.TeeReader lets you read and copy simultaneously.
//
// 7. os.Stat checks file existence and metadata.
//    os.IsNotExist(err) is the idiomatic existence check.
//
// 8. os.MkdirAll creates nested directories in one call.
//    os.ReadDir lists contents without loading file data.
//
// 9. os.CreateTemp / os.MkdirTemp create safe temporary files.
//    Always clean them up with os.Remove / os.RemoveAll.
//
// 10. Mehra's archive rule: "Read with Scanner, write with bufio,
//     compose with interfaces, and always close your manuscripts."
// ============================================================
