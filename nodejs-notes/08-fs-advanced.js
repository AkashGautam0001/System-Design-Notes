/** ============================================================
 FILE 8: Advanced File System — Directories, Streams, Watchers
 ============================================================
 Topic: mkdir, readdir, stat, rename, copy, unlink, rm,
        watch, createReadStream, createWriteStream
 WHY THIS MATTERS:
   Beyond reading and writing single files, real applications
   manage directory trees, monitor changes, and stream large
   files without loading them entirely into memory.
 ============================================================ */

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

// ============================================================
// STORY: Doordarshan Newsroom (continued)
//   Editor Kavita now manages the entire DD file archive. She
//   creates folder hierarchies for bulletin categories, inspects
//   metadata, moves stories between desks, watches for breaking
//   news updates (fs.watch), and streams large broadcast
//   recordings to the transmission server.
// ============================================================

const TEMP_DIR = path.join(__dirname, '_temp_dd_newsroom_08');

(async () => {

  // ============================================================
  // EXAMPLE BLOCK 1 — Directories and File Metadata
  // ============================================================

  console.log('=== BLOCK 1: Directories and File Metadata ===\n');

  // ────────────────────────────────────────────────────
  // SECTION 1 — Creating Directories with mkdir
  // ────────────────────────────────────────────────────

  // WHY: recursive:true creates all intermediate directories and
  //      does NOT throw if the directory already exists.
  await fsp.mkdir(path.join(TEMP_DIR, 'archive', 'sports', 'cricket'), { recursive: true });
  await fsp.mkdir(path.join(TEMP_DIR, 'archive', 'politics'), { recursive: true });
  await fsp.mkdir(path.join(TEMP_DIR, 'archive', 'tech'), { recursive: true });

  console.log('Created nested directory tree: archive/{sports/cricket, politics, tech}');
  // Output: Created nested directory tree: archive/{sports/cricket, politics, tech}

  // Seed some files for later sections
  await fsp.writeFile(path.join(TEMP_DIR, 'archive', 'sports', 'scores.txt'), 'India 350/4 — Australia 280\n');
  await fsp.writeFile(path.join(TEMP_DIR, 'archive', 'sports', 'cricket', 'recap.txt'), 'Virat hits century at Eden Gardens!\n');
  await fsp.writeFile(path.join(TEMP_DIR, 'archive', 'politics', 'parliament.txt'), 'Monsoon session concludes.\n');
  await fsp.writeFile(path.join(TEMP_DIR, 'archive', 'tech', 'isro-update.txt'), 'Chandrayaan-4 mission announced!\n');
  await fsp.writeFile(path.join(TEMP_DIR, 'archive', 'README.txt'), 'DD Archive root file.\n');

  // ────────────────────────────────────────────────────
  // SECTION 2 — Reading Directories with readdir
  // ────────────────────────────────────────────────────

  // WHY: Basic readdir returns an array of filename strings.
  const basicList = await fsp.readdir(path.join(TEMP_DIR, 'archive'));
  console.log('\nreaddir (basic):', basicList);
  // Output: readdir (basic): [ 'README.txt', 'politics', 'sports', 'tech' ]

  // WHY: withFileTypes returns Dirent objects with isFile() / isDirectory()
  //      methods — no need for a separate stat call for each entry.
  const dirents = await fsp.readdir(path.join(TEMP_DIR, 'archive'), { withFileTypes: true });
  console.log('\nreaddir (withFileTypes):');
  for (const dirent of dirents) {
    const kind = dirent.isDirectory() ? 'DIR ' : 'FILE';
    console.log(`  [${kind}] ${dirent.name}`);
  }
  // Output:
  //   [FILE] README.txt
  //   [DIR ] politics
  //   [DIR ] sports
  //   [DIR ] tech

  // ────────────────────────────────────────────────────
  // SECTION 3 — File Metadata with stat
  // ────────────────────────────────────────────────────

  const statsFile = path.join(TEMP_DIR, 'archive', 'sports', 'scores.txt');
  const stats = await fsp.stat(statsFile);

  console.log('\n--- stat() for scores.txt ---');
  console.log('  size (bytes):', stats.size);
  // Output:   size (bytes): 28
  console.log('  isFile():', stats.isFile());
  // Output:   isFile(): true
  console.log('  isDirectory():', stats.isDirectory());
  // Output:   isDirectory(): false
  console.log('  mtime (modified):', stats.mtime.toISOString());
  // Output:   mtime (modified): 2024-...T...Z
  console.log('  birthtime (created):', stats.birthtime.toISOString());
  // Output:   birthtime (created): 2024-...T...Z

  const dirStats = await fsp.stat(path.join(TEMP_DIR, 'archive', 'sports'));
  console.log('\n--- stat() for sports/ ---');
  console.log('  isDirectory():', dirStats.isDirectory());
  // Output:   isDirectory(): true

  // ────────────────────────────────────────────────────
  // SECTION 4 — Recursive Directory Listing
  // ────────────────────────────────────────────────────

  // WHY: A real-world utility — recursively walk a directory tree
  //      and list all files with their relative paths.
  async function listFilesRecursive(dir, baseDir) {
    baseDir = baseDir || dir;
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    const results = [];

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const subResults = await listFilesRecursive(fullPath, baseDir);
        results.push(...subResults);
      } else {
        results.push(path.relative(baseDir, fullPath));
      }
    }
    return results;
  }

  const allFiles = await listFilesRecursive(path.join(TEMP_DIR, 'archive'));
  console.log('\n--- Recursive file listing ---');
  allFiles.forEach(f => console.log('  ' + f));
  // Output:
  //   README.txt
  //   politics/parliament.txt
  //   sports/cricket/recap.txt
  //   sports/scores.txt
  //   tech/isro-update.txt

  console.log('\nKavita can see every file in the DD archive!\n');

  // ============================================================
  // EXAMPLE BLOCK 2 — Rename, Copy, Delete
  // ============================================================

  console.log('=== BLOCK 2: Rename, Copy, Delete ===\n');

  // ────────────────────────────────────────────────────
  // SECTION 1 — Renaming (Moving) Files
  // ────────────────────────────────────────────────────

  const oldPath = path.join(TEMP_DIR, 'archive', 'tech', 'isro-update.txt');
  const newPath = path.join(TEMP_DIR, 'archive', 'tech', 'chandrayaan-4-announcement.txt');

  // WHY: rename() works as both rename AND move. If the destination
  //      is in a different directory, the file is moved there.
  await fsp.rename(oldPath, newPath);
  console.log('rename: isro-update.txt -> chandrayaan-4-announcement.txt');
  // Output: rename: isro-update.txt -> chandrayaan-4-announcement.txt

  const techFiles = await fsp.readdir(path.join(TEMP_DIR, 'archive', 'tech'));
  console.log('tech/ now contains:', techFiles);
  // Output: tech/ now contains: [ 'chandrayaan-4-announcement.txt' ]

  // ────────────────────────────────────────────────────
  // SECTION 2 — Copying Files
  // ────────────────────────────────────────────────────

  const srcFile = path.join(TEMP_DIR, 'archive', 'politics', 'parliament.txt');
  const destFile = path.join(TEMP_DIR, 'archive', 'politics', 'parliament-backup.txt');

  // WHY: copyFile creates an independent copy. The original is unchanged.
  await fsp.copyFile(srcFile, destFile);
  console.log('\ncopyFile: parliament.txt -> parliament-backup.txt');
  // Output: copyFile: parliament.txt -> parliament-backup.txt

  const politicsFiles = await fsp.readdir(path.join(TEMP_DIR, 'archive', 'politics'));
  console.log('politics/ now contains:', politicsFiles);
  // Output: politics/ now contains: [ 'parliament-backup.txt', 'parliament.txt' ]

  // Verify the copy is independent
  const origContent = await fsp.readFile(srcFile, 'utf8');
  const copyContent = await fsp.readFile(destFile, 'utf8');
  console.log('Contents match:', origContent === copyContent);
  // Output: Contents match: true

  // ────────────────────────────────────────────────────
  // SECTION 3 — Deleting Individual Files with unlink
  // ────────────────────────────────────────────────────

  // WHY: unlink removes a single file. It throws ENOENT if the
  //      file does not exist.
  await fsp.unlink(destFile);
  console.log('\nunlink: parliament-backup.txt deleted');
  // Output: unlink: parliament-backup.txt deleted

  const afterUnlink = await fsp.readdir(path.join(TEMP_DIR, 'archive', 'politics'));
  console.log('politics/ after unlink:', afterUnlink);
  // Output: politics/ after unlink: [ 'parliament.txt' ]

  // ────────────────────────────────────────────────────
  // SECTION 4 — Deleting Directories with rm
  // ────────────────────────────────────────────────────

  // WHY: rm with recursive + force deletes a directory and all its
  //      contents. force:true prevents errors if the path does not exist.
  await fsp.mkdir(path.join(TEMP_DIR, 'archive', 'temp-desk'), { recursive: true });
  await fsp.writeFile(path.join(TEMP_DIR, 'archive', 'temp-desk', 'draft.txt'), 'Draft bulletin script');
  console.log('\nCreated temp-desk/ with draft.txt');

  await fsp.rm(path.join(TEMP_DIR, 'archive', 'temp-desk'), { recursive: true, force: true });
  console.log('rm (recursive + force): temp-desk/ deleted');
  // Output: rm (recursive + force): temp-desk/ deleted

  const afterRm = await fsp.readdir(path.join(TEMP_DIR, 'archive'));
  console.log('archive/ after rm:', afterRm);
  // Output: archive/ after rm: [ 'README.txt', 'politics', 'sports', 'tech' ]

  console.log('\nKavita has full control over the DD archive!\n');

  // ============================================================
  // EXAMPLE BLOCK 3 — Watching Files and Streaming
  // ============================================================

  console.log('=== BLOCK 3: Watchers and Streams ===\n');

  // ────────────────────────────────────────────────────
  // SECTION 1 — fs.watch() — Monitoring File Changes
  // ────────────────────────────────────────────────────

  const watchedFile = path.join(TEMP_DIR, 'breaking-news.txt');
  await fsp.writeFile(watchedFile, 'Initial content\n');

  // WHY: fs.watch() uses OS-level file system notifications (inotify
  //      on Linux, FSEvents on macOS, ReadDirectoryChangesW on Windows).
  //      It is more efficient than polling but can fire multiple times
  //      for a single change on some platforms.
  console.log('--- fs.watch() demo ---');

  const watchResults = [];

  const watcher = fs.watch(watchedFile, (eventType, filename) => {
    watchResults.push({ eventType, filename });
  });

  // Trigger a change by writing to the file
  await fsp.writeFile(watchedFile, 'BREAKING: DD watch event fired!\n');

  // Give the OS a moment to deliver the event
  await new Promise(resolve => setTimeout(resolve, 200));

  // WHY: Always close the watcher when done to free OS resources.
  watcher.close();

  if (watchResults.length > 0) {
    console.log('Watch event captured:', watchResults[0].eventType);
    // Output: Watch event captured: change
  }
  console.log('Watcher closed.\n');

  // ────────────────────────────────────────────────────
  // SECTION 2 — Streams: createReadStream / createWriteStream
  // ────────────────────────────────────────────────────

  // WHY: Streams process data in chunks instead of loading entire files
  //      into memory. This is essential for large files (videos, logs, DBs).
  //      A 2 GB file read with readFile needs 2 GB of RAM. A stream only
  //      needs the size of one chunk (highWaterMark, default 64 KB).

  const streamSrcFile = path.join(TEMP_DIR, 'large-bulletin.txt');
  const streamDestFile = path.join(TEMP_DIR, 'large-bulletin-copy.txt');

  // Create a file with enough content to see chunked behavior
  const lines = [];
  for (let i = 1; i <= 500; i++) {
    lines.push(`Line ${i}: Kavita's DD archive bulletin entry number ${i} for the evening edition.`);
  }
  await fsp.writeFile(streamSrcFile, lines.join('\n') + '\n');

  const srcStats = await fsp.stat(streamSrcFile);
  console.log('--- Stream copy demo ---');
  console.log('Source file size:', srcStats.size, 'bytes');
  // Output: Source file size: ~40000 bytes

  // WHY: highWaterMark controls the chunk size. Smaller values use
  //      less memory but require more read operations. Default is
  //      65536 (64 KB) for file streams.
  const readable = fs.createReadStream(streamSrcFile, {
    encoding: 'utf8',
    highWaterMark: 1024   // 1 KB chunks to demonstrate multiple events
  });

  const writable = fs.createWriteStream(streamDestFile);

  let chunkCount = 0;
  let totalBytes = 0;

  await new Promise((resolve, reject) => {
    readable.on('data', (chunk) => {
      chunkCount++;
      totalBytes += Buffer.byteLength(chunk, 'utf8');
      writable.write(chunk);
    });

    readable.on('end', () => {
      writable.end();
    });

    writable.on('finish', () => {
      resolve();
    });

    readable.on('error', reject);
    writable.on('error', reject);
  });

  console.log('Chunks processed:', chunkCount);
  // Output: Chunks processed: ~40 (depends on content size)
  console.log('Total bytes copied:', totalBytes);

  const destStats = await fsp.stat(streamDestFile);
  console.log('Dest file size:', destStats.size, 'bytes');
  console.log('Sizes match:', srcStats.size === destStats.size);
  // Output: Sizes match: true

  // ────────────────────────────────────────────────────
  // SECTION 3 — Stream Copy with pipe() (Simpler)
  // ────────────────────────────────────────────────────

  // WHY: pipe() is the idiomatic way to connect a readable to a writable.
  //      It handles backpressure automatically — if the writer is slow,
  //      the reader pauses. Much simpler than manual data/end events.
  const pipeDest = path.join(TEMP_DIR, 'large-bulletin-piped.txt');

  await new Promise((resolve, reject) => {
    const reader = fs.createReadStream(streamSrcFile);
    const writer = fs.createWriteStream(pipeDest);

    reader.pipe(writer);

    writer.on('finish', resolve);
    reader.on('error', reject);
    writer.on('error', reject);
  });

  const pipedStats = await fsp.stat(pipeDest);
  console.log('\npipe() copy — size matches:', pipedStats.size === srcStats.size);
  // Output: pipe() copy — size matches: true

  // WHY: For the simplest file copy, use copyFile. Use streams when
  //      you need to transform data in transit (compression, encryption,
  //      parsing line by line, etc.).

  console.log('\n--- highWaterMark explained ---');
  console.log('Default highWaterMark: 65536 bytes (64 KB)');
  console.log('We used 1024 bytes (1 KB) to show more chunks.');
  console.log('Larger highWaterMark = fewer chunks, more memory per chunk.');
  console.log('Smaller highWaterMark = more chunks, less memory per chunk.');

  console.log('\nKavita has mastered the complete DD archive system!\n');

  // ────────────────────────────────────────────────────
  // CLEANUP — Remove all temp files and directories
  // ────────────────────────────────────────────────────

  await fsp.rm(TEMP_DIR, { recursive: true, force: true });
  console.log('Cleanup complete — temp directory removed.');
  // Output: Cleanup complete — temp directory removed.
  console.log('existsSync after cleanup:', fs.existsSync(TEMP_DIR));
  // Output: existsSync after cleanup: false

})();

// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. Use mkdir with {recursive: true} to create deep directory
//    trees safely. It will not throw if directories exist.
//
// 2. readdir with {withFileTypes: true} returns Dirent objects
//    so you can check isFile()/isDirectory() without extra
//    stat() calls — much more efficient.
//
// 3. stat() reveals size, timestamps (mtime, birthtime), and
//    type checks (isFile, isDirectory, isSymbolicLink).
//
// 4. rename() moves or renames, copyFile() duplicates,
//    unlink() deletes a file, rm({recursive, force}) deletes
//    entire directory trees.
//
// 5. fs.watch() provides OS-level file change notifications.
//    Always close the watcher when done to free resources.
//
// 6. Streams (createReadStream / createWriteStream) process
//    data in chunks. Use pipe() for simple transfers. Set
//    highWaterMark to control chunk size and memory usage.
//
// 7. Use streams for large files (logs, media, databases).
//    Use readFile/writeFile for small files (configs, JSON).
// ============================================================
