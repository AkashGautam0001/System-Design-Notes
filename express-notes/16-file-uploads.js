/** ============================================================
 *  FILE 16: File Uploads — Multipart Form-Data Parsing From Scratch
 *  WHY THIS MATTERS: File uploads are among the most complex HTTP
 *  operations. Understanding multipart parsing at the byte level
 *  demystifies libraries like multer and busboy, and teaches you
 *  how HTTP actually transmits binary data.
 *  ============================================================ */

// PASSPORT SEVA KENDRA
// ──────────────────────────────────────────────────────────────
// The Passport Seva Kendra receives document submissions from
// applicants across India. Each application arrives as a
// "multipart" package — multiple documents wrapped together
// with separator labels between them. The document scanning
// counter (Multer) must carefully unwrap each package, catalog
// every document (name, type, size), and store them safely in
// the archive vault. Some documents are too large or the wrong
// type and must be rejected at the counter.
//
// In HTTP, file uploads work the same way. The browser wraps
// files into a multipart/form-data body with boundary separators.
// Our job: parse that raw body, extract the files, validate
// them, and store them on disk.
// ──────────────────────────────────────────────────────────────

const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

// (See nodejs-notes/09 for streams and buffer fundamentals)
// (See nodejs-notes/11 for HTTP protocol details)

// ============================================================
// BLOCK 1 — Building a Basic Multipart Parser Middleware
// ============================================================
//
// HOW MULTIPART FORM-DATA WORKS:
// ──────────────────────────────────────────────────────────────
//
// When a browser submits a form with enctype="multipart/form-data",
// the HTTP body looks like this:
//
//   Content-Type: multipart/form-data; boundary=----abc123
//
//   ------abc123\r\n
//   Content-Disposition: form-data; name="applicant_name"\r\n
//   \r\n
//   Rajesh Sharma\r\n
//   ------abc123\r\n
//   Content-Disposition: form-data; name="file"; filename="photo.jpg"\r\n
//   Content-Type: image/jpeg\r\n
//   \r\n
//   <binary file data>\r\n
//   ------abc123--\r\n
//
// Key rules:
// 1. The boundary string separates each "part"
// 2. Each part has headers (Content-Disposition, optionally Content-Type)
// 3. An empty line (\r\n\r\n) separates part headers from part body
// 4. The final boundary ends with "--" (e.g., ------abc123--)
// 5. Parts WITHOUT a filename are text fields
// 6. Parts WITH a filename are file uploads
// ──────────────────────────────────────────────────────────────

/**
 * Extract the boundary string from the Content-Type header.
 * The boundary is what separates each part in the multipart body.
 *
 * @param {string} contentType - The Content-Type header value
 * @returns {string|null} The boundary string or null if not found
 */
function extractBoundary(contentType) {
  // WHY: The Content-Type header contains the boundary after a semicolon
  // e.g., "multipart/form-data; boundary=----abc123"
  if (!contentType || !contentType.includes('multipart/form-data')) {
    return null;
  }

  const match = contentType.match(/boundary=([^\s;]+)/);
  return match ? match[1] : null;
}

/**
 * Parse the headers of a single multipart part.
 * Each part can have Content-Disposition and Content-Type headers.
 *
 * @param {string} headerSection - The raw header text for one part
 * @returns {object} Parsed headers with name, filename, contentType
 */
function parsePartHeaders(headerSection) {
  const headers = {};
  const lines = headerSection.split('\r\n');

  for (const line of lines) {
    if (line.toLowerCase().startsWith('content-disposition:')) {
      // WHY: Content-Disposition tells us the field name and optional filename
      // e.g., 'form-data; name="passport_photo"; filename="photo.jpg"'
      const nameMatch = line.match(/name="([^"]+)"/);
      const filenameMatch = line.match(/filename="([^"]+)"/);

      if (nameMatch) headers.name = nameMatch[1];
      if (filenameMatch) headers.filename = filenameMatch[1];
    }

    if (line.toLowerCase().startsWith('content-type:')) {
      // WHY: Content-Type tells us the MIME type of uploaded files
      headers.contentType = line.split(':')[1].trim();
    }
  }

  return headers;
}

/**
 * Parse the entire multipart body buffer into individual parts.
 * This is the core parsing logic that splits on boundaries.
 *
 * @param {Buffer} body - The raw request body
 * @param {string} boundary - The boundary string
 * @returns {Array} Array of parsed parts (fields and files)
 */
function parseMultipartBody(body, boundary) {
  const parts = [];

  // WHY: The actual boundary in the body is prefixed with "--"
  // So boundary "abc123" appears as "--abc123" in the body
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const endBoundaryBuffer = Buffer.from(`--${boundary}--`);

  // Split the body by boundary markers
  // We work with the body as a string for header parsing,
  // but keep the Buffer for binary file data
  const bodyStr = body.toString('binary');
  const boundaryStr = `--${boundary}`;

  // Split on boundary, removing the first empty part and last closing part
  const rawParts = bodyStr.split(boundaryStr);

  for (let i = 1; i < rawParts.length; i++) {
    const rawPart = rawParts[i];

    // WHY: The last boundary ends with "--", skip it
    if (rawPart.startsWith('--')) continue;

    // WHY: Headers and body are separated by \r\n\r\n (blank line)
    const headerEndIndex = rawPart.indexOf('\r\n\r\n');
    if (headerEndIndex === -1) continue;

    const headerSection = rawPart.substring(2, headerEndIndex); // skip leading \r\n
    const headers = parsePartHeaders(headerSection);

    // Extract the body (everything after the double CRLF, minus trailing \r\n)
    let partBody = rawPart.substring(headerEndIndex + 4);
    // WHY: Remove the trailing \r\n that comes before the next boundary
    if (partBody.endsWith('\r\n')) {
      partBody = partBody.substring(0, partBody.length - 2);
    }

    if (headers.filename) {
      // WHY: File data might be binary, so convert from binary string back to Buffer
      parts.push({
        type: 'file',
        fieldName: headers.name,
        filename: headers.filename,
        contentType: headers.contentType || 'application/octet-stream',
        data: Buffer.from(partBody, 'binary'),
        size: Buffer.byteLength(partBody, 'binary')
      });
    } else {
      // WHY: Text fields are simple UTF-8 strings
      parts.push({
        type: 'field',
        fieldName: headers.name,
        value: partBody
      });
    }
  }

  return parts;
}

/**
 * Create a basic multipart parser middleware.
 * Collects the raw body, parses multipart parts, saves files to temp dir.
 *
 * @param {object} options - Configuration options
 * @param {string} options.uploadDir - Directory to save uploaded files
 * @returns {Function} Express middleware
 */
function basicMultipartParser(options = {}) {
  const uploadDir = options.uploadDir || os.tmpdir();

  // WHY: Ensure the upload directory exists before we try to write files
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  return (req, res, next) => {
    const contentType = req.headers['content-type'] || '';
    const boundary = extractBoundary(contentType);

    if (!boundary) {
      // WHY: Not a multipart request — pass through to next middleware
      return next();
    }

    // Collect the raw body into a buffer
    // (See nodejs-notes/09 for why we collect chunks into an array first)
    const chunks = [];

    req.on('data', (chunk) => {
      chunks.push(chunk);
    });

    req.on('end', () => {
      try {
        const body = Buffer.concat(chunks);
        const parts = parseMultipartBody(body, boundary);

        // WHY: Separate files and fields for easy access on req object
        req.files = [];
        req.fields = {};

        for (const part of parts) {
          if (part.type === 'file') {
            // Generate a unique filename to prevent collisions
            const ext = path.extname(part.filename);
            const uniqueName = `${crypto.randomBytes(16).toString('hex')}${ext}`;
            const filePath = path.join(uploadDir, uniqueName);

            // WHY: Write synchronously for simplicity in this teaching example
            // In production, use async writes or streams for large files
            fs.writeFileSync(filePath, part.data);

            req.files.push({
              fieldName: part.fieldName,
              originalName: part.filename,
              savedAs: uniqueName,
              path: filePath,
              contentType: part.contentType,
              size: part.size
            });
          } else {
            req.fields[part.fieldName] = part.value;
          }
        }

        next();
      } catch (err) {
        next(err);
      }
    });

    req.on('error', (err) => next(err));
  };
}

// ============================================================
// BLOCK 2 — File Type Validation, Size Limits, Multiple Files, Cleanup
// ============================================================
//
// Real-world uploads need guardrails:
// ──────────────────────────────────────────────────────────────
// 1. FILE SIZE LIMITS — Prevent a single 10GB file from eating your disk
// 2. FILE TYPE VALIDATION — Only accept expected types (photos, PDFs, etc.)
// 3. FILE COUNT LIMITS — Prevent abuse with thousands of tiny files
// 4. CLEANUP — Remove temp files after processing or on error
// ──────────────────────────────────────────────────────────────

/**
 * Enhanced multipart parser with validation and limits.
 *
 * @param {object} options - Configuration
 * @param {string} options.uploadDir - Where to save files
 * @param {number} options.maxFileSize - Max bytes per file (default: 5MB)
 * @param {number} options.maxFiles - Max number of files (default: 10)
 * @param {number} options.maxTotalSize - Max total bytes for all files (default: 20MB)
 * @param {string[]} options.allowedTypes - Array of allowed MIME types
 * @param {string[]} options.allowedExtensions - Array of allowed extensions (e.g., ['.jpg', '.png'])
 * @returns {Function} Express middleware
 */
function enhancedMultipartParser(options = {}) {
  const uploadDir = options.uploadDir || os.tmpdir();
  const maxFileSize = options.maxFileSize || 5 * 1024 * 1024;   // 5MB default
  const maxFiles = options.maxFiles || 10;
  const maxTotalSize = options.maxTotalSize || 20 * 1024 * 1024; // 20MB default
  const allowedTypes = options.allowedTypes || null;              // null = allow all
  const allowedExtensions = options.allowedExtensions || null;    // null = allow all

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  return (req, res, next) => {
    const contentType = req.headers['content-type'] || '';
    const boundary = extractBoundary(contentType);

    if (!boundary) return next();

    const chunks = [];
    let totalBytes = 0;

    req.on('data', (chunk) => {
      totalBytes += chunk.length;

      // WHY: Check total size DURING upload, not after — fail fast
      // to avoid wasting bandwidth and memory
      if (totalBytes > maxTotalSize) {
        req.destroy(new Error(`Total upload size exceeds ${maxTotalSize} bytes`));
        return;
      }

      chunks.push(chunk);
    });

    req.on('end', () => {
      try {
        const body = Buffer.concat(chunks);
        const parts = parseMultipartBody(body, boundary);

        req.files = [];
        req.fields = {};

        const savedPaths = []; // WHY: Track saved files for cleanup on error
        let fileCount = 0;

        for (const part of parts) {
          if (part.type === 'file') {
            fileCount++;

            // ── Validation: File count ────────────────────────────
            if (fileCount > maxFiles) {
              // WHY: Clean up any files already saved before erroring
              cleanupFiles(savedPaths);
              const err = new Error(`Too many files. Maximum is ${maxFiles}`);
              err.status = 400;
              return next(err);
            }

            // ── Validation: Individual file size ──────────────────
            if (part.size > maxFileSize) {
              cleanupFiles(savedPaths);
              const err = new Error(
                `File "${part.filename}" (${part.size} bytes) exceeds ` +
                `limit of ${maxFileSize} bytes`
              );
              err.status = 400;
              return next(err);
            }

            // ── Validation: File type (MIME) ──────────────────────
            if (allowedTypes && !allowedTypes.includes(part.contentType)) {
              cleanupFiles(savedPaths);
              const err = new Error(
                `File type "${part.contentType}" is not allowed. ` +
                `Allowed: ${allowedTypes.join(', ')}`
              );
              err.status = 400;
              return next(err);
            }

            // ── Validation: File extension ────────────────────────
            const ext = path.extname(part.filename).toLowerCase();
            if (allowedExtensions && !allowedExtensions.includes(ext)) {
              cleanupFiles(savedPaths);
              const err = new Error(
                `Extension "${ext}" is not allowed. ` +
                `Allowed: ${allowedExtensions.join(', ')}`
              );
              err.status = 400;
              return next(err);
            }

            // All validations passed — save the file
            const uniqueName = `${crypto.randomBytes(16).toString('hex')}${ext}`;
            const filePath = path.join(uploadDir, uniqueName);
            fs.writeFileSync(filePath, part.data);
            savedPaths.push(filePath);

            req.files.push({
              fieldName: part.fieldName,
              originalName: part.filename,
              savedAs: uniqueName,
              path: filePath,
              contentType: part.contentType,
              size: part.size
            });
          } else {
            req.fields[part.fieldName] = part.value;
          }
        }

        // WHY: Attach a cleanup function so routes can delete temp files
        // after they've processed them (moved to permanent storage, etc.)
        req.cleanupFiles = () => cleanupFiles(savedPaths);

        next();
      } catch (err) {
        next(err);
      }
    });

    req.on('error', (err) => next(err));
  };
}

/**
 * Remove an array of file paths from disk.
 * Silently ignores files that no longer exist.
 *
 * @param {string[]} filePaths - Array of absolute file paths to delete
 */
function cleanupFiles(filePaths) {
  for (const fp of filePaths) {
    try {
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    } catch (e) {
      // WHY: Best-effort cleanup — don't crash if a file is already gone
    }
  }
}

/**
 * Helper: Build a multipart/form-data body programmatically.
 * Used for testing — this is what a browser does under the hood.
 *
 * @param {string} boundary - The boundary string to use
 * @param {Array} parts - Array of { name, value } for fields or
 *                        { name, filename, contentType, data } for files
 * @returns {Buffer} The complete multipart body
 */
function buildMultipartBody(boundary, parts) {
  const chunks = [];

  for (const part of parts) {
    chunks.push(Buffer.from(`--${boundary}\r\n`));

    if (part.filename) {
      // File part
      chunks.push(Buffer.from(
        `Content-Disposition: form-data; name="${part.name}"; filename="${part.filename}"\r\n` +
        `Content-Type: ${part.contentType || 'application/octet-stream'}\r\n` +
        `\r\n`
      ));
      chunks.push(Buffer.isBuffer(part.data) ? part.data : Buffer.from(part.data));
    } else {
      // Text field
      chunks.push(Buffer.from(
        `Content-Disposition: form-data; name="${part.name}"\r\n` +
        `\r\n`
      ));
      chunks.push(Buffer.from(part.value));
    }

    chunks.push(Buffer.from('\r\n'));
  }

  // WHY: The closing boundary has a trailing "--" to signal end of body
  chunks.push(Buffer.from(`--${boundary}--\r\n`));

  return Buffer.concat(chunks);
}


// ============================================================
// SELF-TEST: The Passport Seva Kendra Opens for Business
// ============================================================

async function runTests() {
  const app = express();

  // Create a temporary upload directory for this test run
  const testUploadDir = path.join(os.tmpdir(), `passport-seva-${Date.now()}`);
  fs.mkdirSync(testUploadDir, { recursive: true });

  // ── Route 1: Basic upload (Block 1 parser) ──────────────────
  app.post('/upload/basic',
    basicMultipartParser({ uploadDir: testUploadDir }),
    (req, res) => {
      res.json({
        fields: req.fields,
        files: req.files.map(f => ({
          originalName: f.originalName,
          contentType: f.contentType,
          size: f.size,
          savedAs: f.savedAs
        }))
      });
    }
  );

  // ── Route 2: Validated upload (Block 2 parser) ──────────────
  app.post('/upload/validated',
    enhancedMultipartParser({
      uploadDir: testUploadDir,
      maxFileSize: 1024,              // 1KB limit for testing
      maxFiles: 2,
      allowedTypes: ['image/png', 'image/jpeg', 'text/plain'],
      allowedExtensions: ['.png', '.jpg', '.jpeg', '.txt']
    }),
    (req, res) => {
      res.json({
        fields: req.fields,
        files: req.files.map(f => ({
          originalName: f.originalName,
          contentType: f.contentType,
          size: f.size
        }))
      });
      // WHY: Clean up temp files after responding
      req.cleanupFiles();
    }
  );

  // ── Error handler ───────────────────────────────────────────
  app.use((err, req, res, next) => {
    res.status(err.status || 500).json({ error: err.message });
  });

  // Start server on port 0 (OS-assigned)
  const server = app.listen(0, async () => {
    const port = server.address().port;
    const base = `http://127.0.0.1:${port}`;
    console.log(`Passport Seva Kendra server listening on port ${port}\n`);

    try {
      // ── Test 1: Basic single file upload ────────────────────
      console.log('--- Test 1: Basic Single File Upload ---');
      const boundary1 = 'TestBoundary123';
      const body1 = buildMultipartBody(boundary1, [
        { name: 'applicant_name', value: 'Rajesh Sharma' },
        { name: 'application_type', value: 'Fresh Passport' },
        {
          name: 'address_proof',
          filename: 'aadhaar_card.txt',
          contentType: 'text/plain',
          data: 'This is the Aadhaar card scan for address verification.'
        }
      ]);

      const res1 = await makeRequest(base + '/upload/basic', 'POST', {
        'Content-Type': `multipart/form-data; boundary=${boundary1}`
      }, body1);
      console.log('Status:', res1.status);
      // Output: Status: 200
      console.log('Fields:', JSON.stringify(res1.body.fields));
      // Output: Fields: {"applicant_name":"Rajesh Sharma","application_type":"Fresh Passport"}
      console.log('Files:', JSON.stringify(res1.body.files.map(f => ({
        name: f.originalName, type: f.contentType, size: f.size
      }))));
      // Output: Files: [{"name":"aadhaar_card.txt","type":"text/plain","size":55}]
      console.log();

      // ── Test 2: Multiple file upload ────────────────────────
      console.log('--- Test 2: Multiple File Upload ---');
      const boundary2 = 'MultiBoundary456';
      const body2 = buildMultipartBody(boundary2, [
        { name: 'document_type', value: 'Identity Documents' },
        {
          name: 'photo',
          filename: 'passport_photo.png',
          contentType: 'image/png',
          data: Buffer.alloc(100, 0x89) // Fake PNG data (100 bytes)
        },
        {
          name: 'birth_certificate',
          filename: 'birth_cert.jpg',
          contentType: 'image/jpeg',
          data: Buffer.alloc(200, 0xFF) // Fake JPEG data (200 bytes)
        }
      ]);

      const res2 = await makeRequest(base + '/upload/validated', 'POST', {
        'Content-Type': `multipart/form-data; boundary=${boundary2}`
      }, body2);
      console.log('Status:', res2.status);
      // Output: Status: 200
      console.log('Fields:', JSON.stringify(res2.body.fields));
      // Output: Fields: {"document_type":"Identity Documents"}
      console.log('File count:', res2.body.files.length);
      // Output: File count: 2
      console.log('Files:', res2.body.files.map(f => `${f.originalName} (${f.size}b)`).join(', '));
      // Output: Files: passport_photo.png (100b), birth_cert.jpg (200b)
      console.log();

      // ── Test 3: File too large (rejected) ───────────────────
      console.log('--- Test 3: File Too Large (Rejected) ---');
      const boundary3 = 'SizeBoundary789';
      const body3 = buildMultipartBody(boundary3, [
        {
          name: 'bigfile',
          filename: 'huge_scan.txt',
          contentType: 'text/plain',
          data: Buffer.alloc(2000, 0x41) // 2000 bytes > 1024 limit
        }
      ]);

      const res3 = await makeRequest(base + '/upload/validated', 'POST', {
        'Content-Type': `multipart/form-data; boundary=${boundary3}`
      }, body3);
      console.log('Status:', res3.status);
      // Output: Status: 400
      console.log('Error:', res3.body.error);
      // Output: Error: File "huge_scan.txt" (2000 bytes) exceeds limit of 1024 bytes
      console.log();

      // ── Test 4: Wrong file type (rejected) ──────────────────
      console.log('--- Test 4: Wrong File Type (Rejected) ---');
      const boundary4 = 'TypeBoundary000';
      const body4 = buildMultipartBody(boundary4, [
        {
          name: 'malware',
          filename: 'script.exe',
          contentType: 'application/x-executable',
          data: 'MZ...'
        }
      ]);

      const res4 = await makeRequest(base + '/upload/validated', 'POST', {
        'Content-Type': `multipart/form-data; boundary=${boundary4}`
      }, body4);
      console.log('Status:', res4.status);
      // Output: Status: 400
      console.log('Error:', res4.body.error);
      // Output: Error: File type "application/x-executable" is not allowed. Allowed: image/png, image/jpeg, text/plain
      console.log();

      // ── Test 5: Too many files (rejected) ───────────────────
      console.log('--- Test 5: Too Many Files (Rejected) ---');
      const boundary5 = 'CountBoundary111';
      const body5 = buildMultipartBody(boundary5, [
        { name: 'f1', filename: 'photo.txt', contentType: 'text/plain', data: 'a' },
        { name: 'f2', filename: 'aadhaar.txt', contentType: 'text/plain', data: 'b' },
        { name: 'f3', filename: 'pan.txt', contentType: 'text/plain', data: 'c' }  // 3 > maxFiles(2)
      ]);

      const res5 = await makeRequest(base + '/upload/validated', 'POST', {
        'Content-Type': `multipart/form-data; boundary=${boundary5}`
      }, body5);
      console.log('Status:', res5.status);
      // Output: Status: 400
      console.log('Error:', res5.body.error);
      // Output: Error: Too many files. Maximum is 2
      console.log();

    } catch (err) {
      console.error('Test error:', err.message);
    } finally {
      // ── Cleanup ─────────────────────────────────────────────
      // WHY: Always clean up temp files and directories in tests
      try {
        fs.rmSync(testUploadDir, { recursive: true, force: true });
        console.log('Cleanup: Temp directory removed');
      } catch (e) {
        // Best effort
      }

      server.close(() => {
        console.log('Server closed.\n');

        // ── KEY TAKEAWAYS ─────────────────────────────────────
        console.log('KEY TAKEAWAYS:');
        console.log('1. Multipart form-data uses boundary strings to separate parts in the HTTP body.');
        console.log('2. Each part has headers (Content-Disposition, Content-Type) followed by a blank line, then the body.');
        console.log('3. Parts with a "filename" in Content-Disposition are file uploads; without are text fields.');
        console.log('4. Always validate file size, type, and count BEFORE saving to disk.');
        console.log('5. Track saved file paths so you can clean up on error or after processing.');
        console.log('6. In production, stream large files to disk instead of buffering the entire body in memory.');
        console.log('7. Never trust the client-provided filename or Content-Type — generate unique names and verify content.');
      });
    }
  });
}

/**
 * Helper: Make an HTTP request and return { status, headers, body }.
 *
 * @param {string} url - Full URL to request
 * @param {string} method - HTTP method
 * @param {object} headers - Request headers
 * @param {Buffer|string} body - Request body
 * @returns {Promise<object>} Response with status, headers, body
 */
function makeRequest(url, method, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: headers
    };

    if (body) {
      options.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = http.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString();
        let parsed;
        try {
          parsed = JSON.parse(raw);
        } catch {
          parsed = raw;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

runTests();
