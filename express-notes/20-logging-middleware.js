/** ============================================================
 *  FILE 20: Logging Middleware — Build It from Scratch
 *  WHY THIS MATTERS: Every production app needs request logging
 *  for debugging, auditing, and performance monitoring. Building
 *  a logger from scratch teaches you the res.end() interception
 *  pattern that libraries like morgan use internally. Once you
 *  understand this, you can build ANY response-tracking middleware.
 *  ============================================================ */

// ─── The RTI Office Log Register ─────────────────────────────
//
// Clerk Ramesh maintains the log register at the RTI (Right to
// Information) office. Every application that arrives at the
// office, every officer who processes it, every dispatch time —
// it all goes in the register. Without it, the department head
// cannot review what happened, the vigilance officer cannot
// audit file movements, and the staff cannot diagnose why that
// one RTI response was delayed beyond 30 days.
//
// An Express logging middleware works the same way: it sits at
// the front of the middleware chain, records when a request
// arrives, intercepts res.end() to capture when the response
// finishes, and writes a structured log entry with timing,
// status codes, and client details.
//
// (See nodejs-notes/08 for raw HTTP server fundamentals)
// (See nodejs-notes/11 for Node.js streams and writable interception)

const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ════════════════════════════════════════════════════════════════
// BLOCK 1 — Build Logger Middleware with Response Time Tracking
// ════════════════════════════════════════════════════════════════

// ─── The core interception pattern — wrapping res.end() ───────
//
// The trick to logging response details is that when your
// middleware runs, the response hasn't been sent yet. You don't
// know the status code, content-length, or how long it took.
//
// Solution: replace res.end() with a wrapper that captures
// these details BEFORE calling the original res.end().
//
// This is the SAME pattern morgan and other loggers use.

function createLogger(options = {}) {
  const format = options.format || 'dev';
  const skipFn = options.skip || null;
  const output = options.stream || process.stdout;

  // ─── Color codes for terminal output ────────────────────────
  const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m',
  };

  function colorForStatus(status) {
    if (status >= 500) return colors.red;
    if (status >= 400) return colors.yellow;
    if (status >= 300) return colors.cyan;
    if (status >= 200) return colors.green;
    return colors.gray;
  }

  // ─── Format functions — each produces a different log line ──
  const formatters = {
    // ─── 'dev' format — colorized, concise ────────────────────
    dev(info) {
      const statusColor = colorForStatus(info.status);
      return `${info.method} ${info.url} ${statusColor}${info.status}${colors.reset} ${info.responseTime}ms - ${info.contentLength}`;
    },

    // ─── 'combined' format — Apache-style ─────────────────────
    combined(info) {
      // WHY: The Combined Log Format is the industry standard for
      // web server logs, understood by log analysis tools everywhere.
      return `${info.ip} - - [${info.timestamp}] "${info.method} ${info.url} HTTP/${info.httpVersion}" ${info.status} ${info.contentLength} "-" "${info.userAgent}"`;
    },

    // ─── 'json' format — structured logging ───────────────────
    json(info) {
      // WHY: JSON logs are machine-parseable — perfect for log
      // aggregation services like ELK, Datadog, or CloudWatch.
      return JSON.stringify({
        method: info.method,
        url: info.url,
        status: info.status,
        responseTime: info.responseTime,
        contentLength: info.contentLength,
        ip: info.ip,
        userAgent: info.userAgent,
        timestamp: info.timestamp,
      });
    },
  };

  // ─── The middleware function itself ──────────────────────────
  return function loggerMiddleware(req, res, next) {
    const startTime = process.hrtime.bigint();
    // WHY: process.hrtime.bigint() gives nanosecond precision —
    // far more accurate than Date.now() for measuring response times.

    // ─── Capture request details immediately ──────────────────
    const reqInfo = {
      method: req.method,
      url: req.originalUrl || req.url,
      ip: req.ip || req.socket.remoteAddress || '127.0.0.1',
      userAgent: req.get('user-agent') || '-',
      httpVersion: req.httpVersion,
    };

    // ─── Intercept res.end() to capture response details ──────
    const originalEnd = res.end;
    // WHY: We save the original res.end() reference so we can
    // call it after logging. This is monkey-patching — powerful
    // but must be done carefully to avoid breaking the response.

    res.end = function patchedEnd(chunk, encoding) {
      // Restore original immediately to prevent double-logging
      res.end = originalEnd;

      // ─── Calculate response time in milliseconds ────────────
      const elapsed = process.hrtime.bigint() - startTime;
      const responseTimeMs = Number(elapsed) / 1e6;

      // ─── Build the full log info object ─────────────────────
      const info = {
        ...reqInfo,
        status: res.statusCode,
        responseTime: responseTimeMs.toFixed(2),
        contentLength: res.get('content-length') || '0',
        timestamp: new Date().toISOString(),
      };

      // ─── Check skip condition ───────────────────────────────
      if (skipFn && skipFn(req, res)) {
        return res.end(chunk, encoding);
      }

      // ─── Format and write the log entry ─────────────────────
      const formatter = formatters[format] || formatters.dev;
      const logLine = formatter(info) + '\n';
      output.write(logLine);

      // ─── Call the REAL res.end() ────────────────────────────
      return res.end(chunk, encoding);
    };

    next();
  };
}

function block1_loggerMiddleware() {
  return new Promise((resolve) => {
    const app = express();

    // ─── Collect log output into a buffer for verification ────
    const logLines = [];
    const mockStream = {
      write(line) {
        logLines.push(line.trim());
      },
    };

    // ─── Attach our custom logger in 'dev' format ─────────────
    app.use(createLogger({ format: 'dev', stream: mockStream }));
    // WHY: By passing a mock stream, we capture log output for
    // testing instead of printing directly to stdout.

    // ─── Sample routes ────────────────────────────────────────
    app.get('/api/applications', (req, res) => {
      res.json([{ id: 1, name: 'Ramesh Verma' }, { id: 2, name: 'Sunita Devi' }]);
    });

    app.post('/api/applications', express.json(), (req, res) => {
      res.status(201).json({ id: 3, ...req.body });
    });

    app.get('/api/missing', (req, res) => {
      res.status(404).json({ error: 'Not found' });
    });

    app.get('/health', (req, res) => {
      res.sendStatus(200);
    });

    const server = app.listen(0, async () => {
      const port = server.address().port;
      const base = `http://127.0.0.1:${port}`;
      console.log('=== BLOCK 1: Logger Middleware with Response Time ===');
      console.log(`Server running on port ${port}\n`);

      try {
        // ─── Test GET request logging ─────────────────────────
        const applicationsRes = await fetch(`${base}/api/applications`);
        const applicationsData = await applicationsRes.json();
        console.log('GET /api/applications:', JSON.stringify(applicationsData));
        // Output: GET /api/applications: [{"id":1,"name":"Ramesh Verma"},{"id":2,"name":"Sunita Devi"}]
        console.log('Log entry:', logLines[0]);
        // Output: Log entry: GET /api/applications [green]200[reset] X.XXms - 56
        // WHY: The dev format shows method, url, colorized status, time, and size.

        // ─── Test POST request logging ────────────────────────
        const postRes = await fetch(`${base}/api/applications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Kavita Singh' }),
        });
        const postData = await postRes.json();
        console.log('POST /api/applications:', postRes.status, JSON.stringify(postData));
        // Output: POST /api/applications: 201 {"id":3,"name":"Kavita Singh"}
        console.log('Log entry:', logLines[1]);
        // Output: Log entry: POST /api/applications [green]201[reset] X.XXms - 28

        // ─── Test 404 logging ─────────────────────────────────
        const missRes = await fetch(`${base}/api/missing`);
        await missRes.json();
        console.log('Log entry for 404:', logLines[2]);
        // Output: Log entry for 404: GET /api/missing [yellow]404[reset] X.XXms - 23
        // WHY: 4xx responses get yellow coloring in dev format
        // so errors stand out visually in the terminal.

        // ─── Test health check logging ────────────────────────
        await fetch(`${base}/health`);
        console.log('Log entry for /health:', logLines[3]);
        // Output: Log entry for /health: GET /health [green]200[reset] X.XXms - 2

        console.log(`\nTotal log entries captured: ${logLines.length}`);
        // Output: Total log entries captured: 4

        // ─── Verify response time is captured ─────────────────
        const hasTime = logLines.every((line) => /\d+\.\d+ms/.test(line));
        console.log('All entries have response time:', hasTime);
        // Output: All entries have response time: true
        // WHY: response time tracking is the whole reason we
        // intercept res.end() — it's the only way to measure
        // how long Express took to process the request.
      } catch (err) {
        console.error('Test error:', err.message);
      }

      server.close(() => {
        console.log('\nBlock 1 server closed.\n');
        resolve();
      });
    });
  });
}

// ════════════════════════════════════════════════════════════════
// BLOCK 2 — Multiple Log Formats, Conditional Skip, File Logging
// ════════════════════════════════════════════════════════════════

// ─── Why multiple formats matter ──────────────────────────────
//
// Different consumers need different log formats:
//   - Officers want colorized 'dev' format in the terminal
//   - Audit departments expect Apache 'combined' format
//   - RTI dashboards (ELK, Datadog) prefer structured 'json'
//   - Health check endpoints should be SKIPPED to reduce noise

function block2_formatsAndFileLogging() {
  return new Promise((resolve) => {
    const logFile = path.join(__dirname, '_test_access.log');

    // ─── Clean up any leftover log file ───────────────────────
    if (fs.existsSync(logFile)) {
      fs.unlinkSync(logFile);
    }

    const app = express();

    // ─── Collect outputs from each format ─────────────────────
    const devLogs = [];
    const combinedLogs = [];
    const jsonLogs = [];

    const devStream = { write(line) { devLogs.push(line.trim()); } };
    const combinedStream = { write(line) { combinedLogs.push(line.trim()); } };
    const jsonStream = { write(line) { jsonLogs.push(line.trim()); } };

    // ─── Skip function — ignores health check endpoints ───────
    function skipHealthChecks(req) {
      return req.url === '/health' || req.url === '/ready';
    }
    // WHY: Health check endpoints are hit constantly by load
    // balancers and Kubernetes probes. Logging them creates
    // enormous noise that buries the entries you actually need.

    // ─── Layer 1: dev format (skip health) ────────────────────
    app.use(createLogger({
      format: 'dev',
      stream: devStream,
      skip: skipHealthChecks,
    }));

    // ─── Layer 2: combined format (skip health) ───────────────
    app.use(createLogger({
      format: 'combined',
      stream: combinedStream,
      skip: skipHealthChecks,
    }));

    // ─── Layer 3: JSON format to file (no skipping) ───────────
    const fileStream = fs.createWriteStream(logFile, { flags: 'a' });
    // WHY: Using a write stream with 'a' (append) flag is more
    // efficient than appendFileSync for high-traffic servers —
    // it buffers writes and doesn't block the event loop.
    app.use(createLogger({
      format: 'json',
      stream: jsonStream, // also capture for verification
    }));

    // ─── Also write JSON logs to file ─────────────────────────
    app.use(createLogger({
      format: 'json',
      stream: fileStream,
    }));

    // ─── Sample routes ────────────────────────────────────────
    app.get('/api/departments', (req, res) => {
      res.json([{ id: 1, name: 'Revenue' }, { id: 2, name: 'Education' }]);
    });

    app.get('/api/departments/:id', (req, res) => {
      res.json({ id: req.params.id, name: 'Revenue', pendingRTIs: 42 });
    });

    app.get('/health', (req, res) => {
      res.sendStatus(200);
    });

    app.get('/ready', (req, res) => {
      res.sendStatus(200);
    });

    app.get('/api/error-demo', (req, res) => {
      res.status(500).json({ error: 'Internal server error' });
    });

    const server = app.listen(0, async () => {
      const port = server.address().port;
      const base = `http://127.0.0.1:${port}`;
      console.log('=== BLOCK 2: Multiple Formats, Skip, File Logging ===');
      console.log(`Server running on port ${port}\n`);

      try {
        // ─── Make various requests ────────────────────────────
        await fetch(`${base}/api/departments`);
        await fetch(`${base}/health`);
        await fetch(`${base}/api/departments/42`);
        await fetch(`${base}/ready`);
        await fetch(`${base}/api/error-demo`);

        // ─── Verify dev format output ─────────────────────────
        console.log('--- Dev Format (colorized, health skipped) ---');
        devLogs.forEach((line, i) => console.log(`  dev[${i}]: ${line}`));
        // Output:   dev[0]: GET /api/departments [green]200[reset] X.XXms - 52
        // Output:   dev[1]: GET /api/departments/42 [green]200[reset] X.XXms - 46
        // Output:   dev[2]: GET /api/error-demo [red]500[reset] X.XXms - 36
        console.log(`  Dev log count: ${devLogs.length} (health checks skipped)`);
        // Output:   Dev log count: 3 (health checks skipped)
        // WHY: /health and /ready were skipped — only 3 entries remain.

        // ─── Verify combined format output ────────────────────
        console.log('\n--- Combined Format (Apache-style, health skipped) ---');
        combinedLogs.forEach((line, i) => console.log(`  combined[${i}]: ${line}`));
        // Output:   combined[0]: 127.0.0.1 - - [timestamp] "GET /api/departments HTTP/1.1" 200 52 "-" "node"
        // Output:   combined[1]: 127.0.0.1 - - [timestamp] "GET /api/departments/42 HTTP/1.1" 200 46 "-" "node"
        // Output:   combined[2]: 127.0.0.1 - - [timestamp] "GET /api/error-demo HTTP/1.1" 500 36 "-" "node"
        console.log(`  Combined log count: ${combinedLogs.length}`);
        // Output:   Combined log count: 3

        // ─── Verify JSON format output (no skipping) ──────────
        console.log('\n--- JSON Format (structured, ALL requests) ---');
        console.log(`  JSON log count: ${jsonLogs.length} (includes health checks)`);
        // Output:   JSON log count: 5 (includes health checks)
        // WHY: The JSON logger has no skip function — it logs everything,
        // which is what you want for comprehensive audit trails.

        const parsedFirst = JSON.parse(jsonLogs[0]);
        console.log('  First JSON entry parsed:');
        console.log(`    method: ${parsedFirst.method}`);
        // Output:     method: GET
        console.log(`    url: ${parsedFirst.url}`);
        // Output:     url: /api/departments
        console.log(`    status: ${parsedFirst.status}`);
        // Output:     status: 200
        console.log(`    has responseTime: ${'responseTime' in parsedFirst}`);
        // Output:     has responseTime: true

        // ─── Verify file logging ──────────────────────────────
        // Close the file stream first to flush buffers
        await new Promise((res) => fileStream.end(res));

        const fileContents = fs.readFileSync(logFile, 'utf8').trim();
        const fileLines = fileContents.split('\n');
        console.log(`\n--- File Logging (${logFile}) ---`);
        console.log(`  Lines written to file: ${fileLines.length}`);
        // Output:   Lines written to file: 5
        // WHY: File received all 5 requests because file logger
        // has no skip function — complete audit trail on disk.

        // Verify each line is valid JSON
        const allValidJson = fileLines.every((line) => {
          try { JSON.parse(line); return true; } catch { return false; }
        });
        console.log(`  All lines valid JSON: ${allValidJson}`);
        // Output:   All lines valid JSON: true

        // ─── Show the conditional skip in action ──────────────
        console.log('\n--- Conditional Skip Verification ---');
        const healthInDev = devLogs.some((l) => l.includes('/health'));
        const healthInJson = jsonLogs.some((l) => l.includes('/health'));
        console.log(`  /health in dev logs: ${healthInDev}`);
        // Output:   /health in dev logs: false
        console.log(`  /health in json logs: ${healthInJson}`);
        // Output:   /health in json logs: true
        // WHY: This proves skip works per-logger — you can have
        // verbose file logs and quiet console logs simultaneously.
      } catch (err) {
        console.error('Test error:', err.message);
      }

      // ─── Clean up temp log file ─────────────────────────────
      if (fs.existsSync(logFile)) {
        fs.unlinkSync(logFile);
        console.log(`\nCleaned up: ${logFile}`);
      }

      server.close(() => {
        console.log('Block 2 server closed.\n');
        resolve();
      });
    });
  });
}

// ════════════════════════════════════════════════════════════════
// Run all blocks sequentially, then exit
// ════════════════════════════════════════════════════════════════

async function main() {
  await block1_loggerMiddleware();
  await block2_formatsAndFileLogging();

  console.log('=== KEY TAKEAWAYS ===');
  console.log('1. Intercept res.end() to capture response details (status, time, size).');
  console.log('2. process.hrtime.bigint() gives nanosecond-precision timing.');
  console.log('3. Save the original res.end() and restore it BEFORE calling it to avoid loops.');
  console.log('4. Multiple log formats serve different consumers: dev, combined, json.');
  console.log('5. Skip functions reduce noise by filtering out health checks and probes.');
  console.log('6. Use fs.createWriteStream with append flag for non-blocking file logging.');
  console.log('7. You can stack multiple loggers — each with its own format and skip rules.');
  console.log('8. This res.end() interception pattern is how morgan works internally.');

  process.exit(0);
}

main();
