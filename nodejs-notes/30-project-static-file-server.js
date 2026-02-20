/** ============================================================
    FILE 30: Doordarshan Media Server — Static File Server
    ============================================================
    Topic: HTTP server with streaming file delivery
    Combines: http, fs, path, url, streams

    WHY THIS MATTERS:
    Every web developer needs to understand how static files
    reach the browser. This project shows MIME mapping,
    security (directory traversal), streaming, and proper
    HTTP status codes — the same fundamentals behind Nginx
    and Express.static.

    FULL USAGE (interactive mode):
      node 30-project-static-file-server.js serve [port]
      Then open http://localhost:<port> in a browser.

    DEMO MODE (no arguments or --demo):
      node 30-project-static-file-server.js
      Creates temp public dir, starts server, runs test
      requests, then shuts down and cleans up.
    ============================================================ */

'use strict';

const http = require('http');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const url = require('url');
const os = require('os');

// ============================================================
// SECTION 1: Configuration
// ============================================================
const DEMO_MODE = process.argv.length <= 2 || process.argv[2] === '--demo';

const DEMO_PUBLIC = path.join(os.tmpdir(), 'dd-media-demo-public-' + process.pid);

const RESET  = '\x1b[0m';
const GREEN  = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED    = '\x1b[31m';
const CYAN   = '\x1b[36m';
const DIM    = '\x1b[2m';
const BOLD   = '\x1b[1m';

function banner(text) {
  const rule = '='.repeat(60);
  console.log(`\n${CYAN}${rule}${RESET}`);
  console.log(`${BOLD}  ${text}${RESET}`);
  console.log(`${CYAN}${rule}${RESET}`);
}

function thinRule() {
  console.log(DIM + '\u2500'.repeat(60) + RESET);
}

// ============================================================
// SECTION 2: MIME Type Mapping
// ============================================================

/** ──────────────────────────────────────────────────────────
    Story: Browsers decide how to handle a response based on
    Content-Type. Serving a DD bulletin HTML file as text/plain
    means the browser shows raw markup. We map extensions to
    the correct MIME types so bulletins render properly.
    ────────────────────────────────────────────────────────── */

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.txt':  'text/plain; charset=utf-8',
  '.ico':  'image/x-icon'
};

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
  // Output: returns correct MIME or fallback binary type
}

// ============================================================
// SECTION 3: Security — Directory Traversal Protection
// ============================================================

/** ──────────────────────────────────────────────────────────
    Story: An attacker might request /../../etc/passwd to
    escape the DD media root. We resolve the full path and
    verify it still starts with our root directory.
    ────────────────────────────────────────────────────────── */

function isSafePath(publicRoot, requestedPath) {
  const resolved = path.resolve(publicRoot, requestedPath);
  return resolved.startsWith(path.resolve(publicRoot));
  // Output: true if path stays within publicRoot, false otherwise
}

// ============================================================
// SECTION 4: Response Helpers
// ============================================================

function send404(res) {
  const body = `<!DOCTYPE html>
<html><head><title>404</title></head>
<body style="font-family:monospace;text-align:center;padding:60px">
<h1>404 &mdash; Not Found</h1>
<p>The requested media file does not exist on this DD server.</p>
</body></html>`;
  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(body);
}

function send403(res) {
  res.writeHead(403, { 'Content-Type': 'text/plain' });
  res.end('403 Forbidden\n');
}

function send500(res, err) {
  res.writeHead(500, { 'Content-Type': 'text/plain' });
  res.end('500 Internal Server Error\n');
}

// ============================================================
// SECTION 5: Request Handler (Stream-Based File Serving)
// ============================================================

/** ──────────────────────────────────────────────────────────
    Story: Instead of fs.readFileSync (which loads the whole
    bulletin video into memory), we pipe a read stream directly
    to the HTTP response. This handles large media files with
    constant memory usage — essential for DD's video content.
    ────────────────────────────────────────────────────────── */

function createHandler(publicRoot) {
  return (req, res) => {
    const parsedUrl = url.parse(req.url);
    let pathname = decodeURIComponent(parsedUrl.pathname);

    // Default to bulletin.html for root
    if (pathname === '/') pathname = '/bulletin.html';

    // Security: reject directory traversal
    if (!isSafePath(publicRoot, '.' + pathname)) {
      const logLine = `  [${req.method}] ${pathname} \u2014 ${RED}403${RESET}`;
      console.log(logLine);
      // Output: [GET] /../../etc/passwd -- 403
      send403(res);
      return;
    }

    const filePath = path.join(publicRoot, pathname);
    const mime = getMimeType(filePath);

    // Check if file exists, then stream it
    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        const logLine = `  [${req.method}] ${pathname} \u2014 ${YELLOW}404${RESET}`;
        console.log(logLine);
        // Output: [GET] /nonexistent.html -- 404
        send404(res);
        return;
      }

      res.writeHead(200, {
        'Content-Type': mime,
        'Content-Length': stats.size
      });

      const stream = fs.createReadStream(filePath);
      stream.pipe(res);

      stream.on('error', (streamErr) => {
        console.error(`  Stream error: ${streamErr.message}`);
        send500(res, streamErr);
      });

      const logLine = `  [${req.method}] ${pathname} \u2014 ${GREEN}200${RESET} (${mime.split(';')[0]}, ${stats.size}B)`;
      console.log(logLine);
      // Output: [GET] /bulletin.html -- 200 (text/html, 234B)
    });
  };
}

// ============================================================
// SECTION 6: Server Factory
// ============================================================

function createServer(publicRoot, port) {
  return new Promise((resolve) => {
    const handler = createHandler(publicRoot);
    const server = http.createServer(handler);
    server.listen(port, '127.0.0.1', () => {
      const addr = server.address();
      console.log(`\n  DD Media Server listening on http://127.0.0.1:${addr.port}`);
      console.log(`  Serving from: ${DIM}${publicRoot}${RESET}\n`);
      resolve(server);
    });
  });
}

// ============================================================
// SECTION 7: Demo Assets
// ============================================================

async function createDemoAssets() {
  await fsp.mkdir(DEMO_PUBLIC, { recursive: true });

  const bulletinHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Doordarshan News Bulletin</title>
  <link rel="stylesheet" href="/ticker.css">
</head>
<body>
  <h1>Doordarshan Samachar</h1>
  <p>This bulletin was served by the DD Node.js static media server.</p>
  <p>Samachar at 9 PM — India's most trusted news source.</p>
</body>
</html>`;

  const tickerCss = `body {
  font-family: system-ui, sans-serif;
  max-width: 640px;
  margin: 40px auto;
  background: #1a1a2e;
  color: #e0e0e0;
}
h1 { color: #ff9933; }`;

  const dataJson = JSON.stringify({
    server: 'DD Media Server',
    version: '1.0.0',
    features: ['streaming', 'MIME types', 'security']
  }, null, 2);

  await Promise.all([
    fsp.writeFile(path.join(DEMO_PUBLIC, 'bulletin.html'), bulletinHtml),
    fsp.writeFile(path.join(DEMO_PUBLIC, 'ticker.css'), tickerCss),
    fsp.writeFile(path.join(DEMO_PUBLIC, 'schedule.json'), dataJson)
  ]);

  console.log(`  Created DD demo assets in ${DIM}${DEMO_PUBLIC}${RESET}`);
  console.log(`    \u2514 bulletin.html, ticker.css, schedule.json`);
}

// ============================================================
// SECTION 8: HTTP Test Client (for demo)
// ============================================================

function httpGet(port, reqPath) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port,
      path: reqPath,
      method: 'GET'
    };
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        resolve({ status: res.statusCode, headers: res.headers, body });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// ============================================================
// SECTION 9: Demo Mode
// ============================================================

/** ──────────────────────────────────────────────────────────
    Story: The demo creates DD sample files, starts the media
    server on a random port, fires off test requests covering
    all status codes (200, 403, 404), then tears everything
    down. DD broadcasts must reach every TV in the nation.
    ────────────────────────────────────────────────────────── */

async function runDemo() {
  banner('Doordarshan Media Server \u2014 Static File Server (DEMO MODE)');

  // Step 1 — Create demo assets
  thinRule();
  console.log(`${BOLD}  Step 1: Creating DD media directory${RESET}`);
  thinRule();
  await createDemoAssets();

  // Step 2 — Start server on random port
  thinRule();
  console.log(`${BOLD}  Step 2: Starting DD server on random port${RESET}`);
  thinRule();
  const server = await createServer(DEMO_PUBLIC, 0);
  const port = server.address().port;

  // Step 3 — Test requests
  thinRule();
  console.log(`${BOLD}  Step 3: Running test requests${RESET}`);
  thinRule();

  // 3a — GET / (serves bulletin.html)
  console.log(`\n  ${CYAN}Request: GET /${RESET}`);
  const r1 = await httpGet(port, '/');
  console.log(`  Response: ${r1.status}, ${r1.body.length} bytes`);
  console.log(`  Content-Type: ${r1.headers['content-type']}`);
  // Output: [GET] /bulletin.html -- 200 (text/html, ...B)

  // 3b — GET /ticker.css
  console.log(`\n  ${CYAN}Request: GET /ticker.css${RESET}`);
  const r2 = await httpGet(port, '/ticker.css');
  console.log(`  Response: ${r2.status}, ${r2.body.length} bytes`);
  console.log(`  Content-Type: ${r2.headers['content-type']}`);
  // Output: [GET] /ticker.css -- 200 (text/css, ...B)

  // 3c — GET /schedule.json
  console.log(`\n  ${CYAN}Request: GET /schedule.json${RESET}`);
  const r3 = await httpGet(port, '/schedule.json');
  console.log(`  Response: ${r3.status}, parsed:`);
  console.log(`  ${DIM}${r3.body}${RESET}`);
  // Output: [GET] /schedule.json -- 200 (application/json, ...B)

  // 3d — GET /news-anchor.jpg (404)
  console.log(`\n  ${CYAN}Request: GET /news-anchor.jpg${RESET}`);
  const r4 = await httpGet(port, '/news-anchor.jpg');
  console.log(`  Response: ${YELLOW}${r4.status}${RESET} Not Found`);
  // Output: [GET] /news-anchor.jpg -- 404

  // 3e — Directory traversal attempt (403)
  console.log(`\n  ${CYAN}Request: GET /../../etc/passwd (traversal attack)${RESET}`);
  const r5 = await httpGet(port, '/../../etc/passwd');
  console.log(`  Response: ${RED}${r5.status}${RESET} Forbidden`);
  // Output: [GET] /../../etc/passwd -- 403

  // Step 4 — Summary
  console.log('');
  thinRule();
  console.log(`${BOLD}  Step 4: Test Summary${RESET}`);
  thinRule();
  const results = [
    { path: '/',                   expected: 200, got: r1.status },
    { path: '/ticker.css',         expected: 200, got: r2.status },
    { path: '/schedule.json',      expected: 200, got: r3.status },
    { path: '/news-anchor.jpg',    expected: 404, got: r4.status },
    { path: '/../../etc/passwd',   expected: 403, got: r5.status }
  ];
  for (const r of results) {
    const ok = r.expected === r.got;
    const icon = ok ? `${GREEN}\u2713${RESET}` : `${RED}\u2717${RESET}`;
    console.log(`  ${icon}  ${r.path.padEnd(28)} expected=${r.expected}  got=${r.got}`);
  }
  // Output: all checks should show green checkmarks

  // Step 5 — Shutdown and cleanup
  console.log('');
  thinRule();
  console.log(`${BOLD}  Step 5: Shutting down and cleaning up${RESET}`);
  thinRule();

  await new Promise((resolve) => server.close(resolve));
  console.log('  DD Media Server closed.');

  await fsp.rm(DEMO_PUBLIC, { recursive: true, force: true });
  console.log(`  Removed ${DIM}${DEMO_PUBLIC}${RESET}`);

  // ============================================================
  // KEY TAKEAWAYS
  // ============================================================
  banner('KEY TAKEAWAYS');
  console.log(`
  1. fs.createReadStream().pipe(res) serves files with O(1) memory
  2. MIME types are essential — browsers need Content-Type
  3. path.resolve + startsWith blocks directory traversal attacks
  4. url.parse + decodeURIComponent handles encoded paths safely
  5. Random port (port 0) avoids conflicts in tests and demos
  6. Stream error handling prevents server crashes on read failure
  7. A single request handler function keeps the server clean
`);
}

// ============================================================
// SECTION 10: Interactive Mode
// ============================================================

async function runInteractive() {
  const port = parseInt(process.argv[3], 10) || 3000;
  const publicDir = path.join(process.cwd(), 'public');

  try {
    await fsp.access(publicDir);
  } catch {
    console.log(`${RED}Error: ./public directory not found${RESET}`);
    console.log('Create a "public" directory with files to serve.');
    process.exit(1);
  }

  const server = await createServer(publicDir, port);
  console.log(`  Press Ctrl+C to stop.\n`);

  process.on('SIGINT', () => {
    console.log('\n  Shutting down...');
    server.close(() => process.exit(0));
  });
}

// ============================================================
// SECTION 11: Entry Point
// ============================================================

async function main() {
  if (DEMO_MODE) {
    await runDemo();
  } else if (process.argv[2] === 'serve') {
    await runInteractive();
  } else {
    console.log('Usage:');
    console.log('  node 30-project-static-file-server.js           # demo mode');
    console.log('  node 30-project-static-file-server.js serve [port]  # serve ./public');
  }
}

main().catch(err => {
  console.error(`${RED}Fatal: ${err.message}${RESET}`);
  process.exit(1);
});
