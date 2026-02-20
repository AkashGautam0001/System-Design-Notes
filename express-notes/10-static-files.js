/** ============================================================
 *  FILE 10 — Static File Serving in Express 5
 *  Topic: express.static() middleware, options, virtual paths,
 *         multiple directories, and Cache-Control
 *  WHY THIS MATTERS: Almost every web app serves static assets
 *  — CSS, JS bundles, images, fonts. express.static() is a
 *  built-in middleware that handles this efficiently with
 *  caching, ETag support, and security options. Understanding
 *  its configuration is essential for performance and security.
 *  ============================================================ */

// ─────────────────────────────────────────────────────────────
// STORY: National Gallery of Modern Art (NGMA Delhi)
// ─────────────────────────────────────────────────────────────
// Curator Meera arranges artworks in exhibition halls (static
// directories). Some halls are public, some have restricted
// access (dotfiles). She labels each display with a "do not
// touch" sign (maxAge/Cache-Control) and can create virtual
// halls that map to storage areas in the back (virtual path
// prefixes). Each artwork carries an authentication stamp
// (ETag) so returning visitors can verify nothing has changed.
// Visitors (clients) simply walk to the right hall and the
// artwork is served automatically — no route handler needed.
// ─────────────────────────────────────────────────────────────

const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const os = require('os');

// ─────────────────────────────────────────────────────────────
// Helper — make an HTTP request
// ─────────────────────────────────────────────────────────────
function request(port, method, urlPath, { headers } = {}) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: '127.0.0.1',
      port,
      path: urlPath,
      method,
      headers: { ...(headers || {}) },
    };

    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// ─────────────────────────────────────────────────────────────
// Helper — create temp directories with sample files
// ─────────────────────────────────────────────────────────────
function createTempAssets() {
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ngma-delhi-'));

  // ── Main public directory ──────────────────────────────────
  const publicDir = path.join(baseDir, 'public');
  fs.mkdirSync(publicDir);

  // index.html
  fs.writeFileSync(
    path.join(publicDir, 'index.html'),
    '<!DOCTYPE html><html><body><h1>NGMA Delhi Home</h1></body></html>\n'
  );

  // style.css
  fs.writeFileSync(
    path.join(publicDir, 'style.css'),
    'body { font-family: sans-serif; background: #f5f5f5; }\nh1 { color: #333; }\n'
  );

  // script.js
  fs.writeFileSync(
    path.join(publicDir, 'script.js'),
    'console.log("NGMA Exhibition loaded");\n'
  );

  // about (no extension — tests the `extensions` option)
  fs.writeFileSync(
    path.join(publicDir, 'about.html'),
    '<!DOCTYPE html><html><body><h1>About NGMA Delhi</h1></body></html>\n'
  );

  // .hidden file (tests dotfiles option)
  fs.writeFileSync(
    path.join(publicDir, '.secret'),
    'This is a hidden configuration file\n'
  );

  // subdirectory
  const imgDir = path.join(publicDir, 'images');
  fs.mkdirSync(imgDir);
  fs.writeFileSync(
    path.join(imgDir, 'logo.txt'),
    '[NGMA LOGO PLACEHOLDER — imagine a PNG here]\n'
  );

  // ── Secondary assets directory ─────────────────────────────
  const uploadsDir = path.join(baseDir, 'uploads');
  fs.mkdirSync(uploadsDir);
  fs.writeFileSync(
    path.join(uploadsDir, 'painting1.txt'),
    '[PAINTING 1 — Amrita Sher-Gil submission]\n'
  );
  fs.writeFileSync(
    path.join(uploadsDir, 'painting2.txt'),
    '[PAINTING 2 — Ravi Varma submission]\n'
  );

  // ── Third directory for vendor assets ──────────────────────
  const vendorDir = path.join(baseDir, 'vendor');
  fs.mkdirSync(vendorDir);
  fs.writeFileSync(
    path.join(vendorDir, 'framework.js'),
    '/* Vendor framework v1.0 */\nvar Framework = {};\n'
  );

  return { baseDir, publicDir, uploadsDir, vendorDir };
}

// ─────────────────────────────────────────────────────────────
// Helper — recursively remove a directory
// ─────────────────────────────────────────────────────────────
function cleanupDir(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}

// =============================================================
// BLOCK 1 — Basic Static Serving with Temp Directory
// =============================================================
// "Curator Meera opens the main exhibition hall. Visitors
//  walk in and find artworks (files) displayed automatically."
//
// express.static(root) serves files from the given directory.
// It handles Content-Type, ETag, Last-Modified, and streaming.
// (See nodejs-notes/09 for fs fundamentals)
// ─────────────────────────────────────────────────────────────

async function block1() {
  console.log('=== BLOCK 1: Basic Static File Serving ===\n');

  const dirs = createTempAssets();
  console.log(`  Temp exhibition: ${dirs.baseDir}\n`);

  const app = express();

  // ── Serve the public directory at root ─────────────────────
  // WHY: express.static() is middleware — it checks if the
  // request URL matches a file in the directory. If found, it
  // streams the file. If not, it calls next() silently.
  app.use(express.static(dirs.publicDir));

  // ── A normal route AFTER static — both can coexist ─────────
  app.get('/api/info', (req, res) => {
    res.json({ gallery: 'NGMA Delhi Exhibition', version: 1 });
  });

  const server = app.listen(0);
  const port = server.address().port;
  console.log(`  Exhibition hall open on port ${port}\n`);

  // ── Test 1: Serve index.html ───────────────────────────────
  console.log('  --- Test 1: GET / — serves index.html automatically ---');
  const r1 = await request(port, 'GET', '/');
  console.log('  status:', r1.status);
  // Output: 200
  console.log('  type:  ', r1.headers['content-type']);
  // Output: text/html; charset=UTF-8
  console.log('  body:  ', r1.body.includes('NGMA Delhi Home'));
  // Output: true
  console.log('  etag:  ', r1.headers['etag'] !== undefined);
  // Output: true
  // WHY: express.static() sets ETag by default for caching.
  // ETag = artwork authentication stamp — verifies nothing changed.
  console.log();

  // ── Test 2: Serve CSS file ─────────────────────────────────
  console.log('  --- Test 2: GET /style.css — CSS with correct MIME ---');
  const r2 = await request(port, 'GET', '/style.css');
  console.log('  status:', r2.status);
  // Output: 200
  console.log('  type:  ', r2.headers['content-type']);
  // Output: text/css; charset=UTF-8
  console.log('  body:  ', r2.body.includes('font-family'));
  // Output: true
  console.log();

  // ── Test 3: Serve JS file ─────────────────────────────────
  console.log('  --- Test 3: GET /script.js — JavaScript file ---');
  const r3 = await request(port, 'GET', '/script.js');
  console.log('  status:', r3.status);
  // Output: 200
  console.log('  type:  ', r3.headers['content-type']);
  // Output: text/javascript; charset=UTF-8
  console.log();

  // ── Test 4: Serve file in subdirectory ─────────────────────
  console.log('  --- Test 4: GET /images/logo.txt — subdirectory file ---');
  const r4 = await request(port, 'GET', '/images/logo.txt');
  console.log('  status:', r4.status);
  // Output: 200
  console.log('  body:  ', r4.body.trim());
  // Output: [NGMA LOGO PLACEHOLDER — imagine a PNG here]
  console.log();

  // ── Test 5: Non-existent file falls through ────────────────
  console.log('  --- Test 5: GET /nonexistent.txt — falls through to 404 ---');
  const r5 = await request(port, 'GET', '/nonexistent.txt');
  console.log('  status:', r5.status);
  // Output: 404
  // WHY: express.static() calls next() when file isn't found.
  // Express default handler returns 404.
  console.log();

  // ── Test 6: API route still works alongside static ─────────
  console.log('  --- Test 6: GET /api/info — dynamic route alongside static ---');
  const r6 = await request(port, 'GET', '/api/info');
  console.log('  status:', r6.status);
  // Output: 200
  console.log('  body:  ', r6.body);
  // Output: {"gallery":"NGMA Delhi Exhibition","version":1}
  console.log();

  // ── Test 7: Last-Modified header ───────────────────────────
  console.log('  --- Test 7: GET /style.css — Last-Modified header ---');
  console.log('  last-modified:', r2.headers['last-modified'] !== undefined);
  // Output: true
  // WHY: express.static() sets Last-Modified from file mtime by default.
  console.log('  accept-ranges:', r2.headers['accept-ranges']);
  // Output: bytes
  // WHY: express.static() supports Range requests for partial downloads.
  console.log();

  server.close();
  cleanupDir(dirs.baseDir);
  console.log(`  Cleaned up: ${dirs.baseDir}\n`);
}

// =============================================================
// BLOCK 2 — Options, Virtual Prefix, Multiple Directories
// =============================================================
// "Meera configures exhibition rules: how long a display stays
//  up (maxAge), whether hidden works are visible (dotfiles),
//  creates virtual halls (path prefixes), and opens multiple
//  exhibition halls simultaneously."
// ─────────────────────────────────────────────────────────────

async function block2() {
  console.log('=== BLOCK 2: Options, Virtual Prefix, Multiple Dirs ===\n');

  const dirs = createTempAssets();
  console.log(`  Temp exhibition: ${dirs.baseDir}\n`);

  const app = express();

  // ── Main public with options ───────────────────────────────
  app.use(express.static(dirs.publicDir, {
    // WHY: dotfiles controls access to files starting with '.'
    // 'ignore' = pretend they don't exist, return 404 (default)
    // 'deny'   = actively refuse, return 404 (and stop looking)
    // 'allow'  = serve them normally
    // NOTE: In Express 5 / serve-static 3.x, both 'ignore' and
    // 'deny' return 404. The difference: 'deny' halts the
    // middleware chain for that dotfile, 'ignore' lets it pass.
    dotfiles: 'deny',

    // WHY: extensions tries these extensions when the exact file
    // isn't found. GET /about → tries about.html, about.htm.
    extensions: ['html', 'htm'],

    // WHY: index sets the default file for directory requests.
    // Default is 'index.html'. Set to false to disable.
    index: 'index.html',

    // WHY: maxAge sets Cache-Control max-age in milliseconds.
    // '1d' = 1 day = 86400000ms. Browsers will cache files
    // and not re-request until this expires.
    // Like a "do not touch" sign on artwork — valid for 1 hour.
    maxAge: '1h',

    // WHY: etag enables/disables ETag generation.
    // Default is true. ETags enable 304 Not Modified responses.
    // ETag = artwork authentication stamp.
    etag: true,

    // WHY: lastModified enables/disables Last-Modified header.
    // Default is true.
    lastModified: true,
  }));

  // ── Virtual path prefix — /assets maps to uploads ──────────
  // WHY: The client requests /assets/painting1.txt but the file
  // lives in the uploads directory. The URL path is virtual.
  app.use('/assets', express.static(dirs.uploadsDir, {
    maxAge: '30m',
  }));

  // ── Another virtual prefix — /vendor maps to vendor dir ────
  // WHY: Multiple static directories can coexist, each at
  // a different path. Express tries them in order.
  app.use('/vendor', express.static(dirs.vendorDir, {
    maxAge: '7d',
    // WHY: Long cache for vendor files that rarely change.
  }));

  // ── Fallback: second static dir at root ────────────────────
  // WHY: You can mount multiple static middlewares at the same
  // prefix. Express tries the first, and if the file isn't found,
  // falls through to the next.
  app.use(express.static(dirs.uploadsDir));

  const server = app.listen(0);
  const port = server.address().port;
  console.log(`  Multi-hall exhibition on port ${port}\n`);

  // ── Test 1: maxAge / Cache-Control ─────────────────────────
  console.log('  --- Test 1: GET /style.css — Cache-Control with maxAge ---');
  const r1 = await request(port, 'GET', '/style.css');
  console.log('  status:       ', r1.status);
  // Output: 200
  console.log('  cache-control:', r1.headers['cache-control']);
  // Output: public, max-age=3600
  // WHY: maxAge: '1h' translates to max-age=3600 seconds.
  console.log();

  // ── Test 2: extensions option — GET /about (no extension) ──
  console.log('  --- Test 2: GET /about — extensions: ["html"] resolves about.html ---');
  const r2 = await request(port, 'GET', '/about');
  console.log('  status:', r2.status);
  // Output: 200
  console.log('  body:  ', r2.body.includes('About NGMA Delhi'));
  // Output: true
  // WHY: Express tried /about, didn't find it, then tried
  // /about.html and found it.
  console.log();

  // ── Test 3: dotfiles: 'deny' ───────────────────────────────
  console.log('  --- Test 3: GET /.secret — dotfiles: "deny" blocks access ---');
  const r3 = await request(port, 'GET', '/.secret');
  console.log('  status:', r3.status);
  // Output: 404
  // WHY: dotfiles: 'deny' blocks dotfile access (404 in Express 5 /
  // serve-static 3.x). With 'allow' it would return 200.
  // This prevents leaking .env, .htaccess, .git, etc.
  console.log();

  // ── Test 4: Virtual prefix — /assets ───────────────────────
  console.log('  --- Test 4: GET /assets/painting1.txt — virtual prefix ---');
  const r4 = await request(port, 'GET', '/assets/painting1.txt');
  console.log('  status:       ', r4.status);
  // Output: 200
  console.log('  body:          ', r4.body.trim());
  // Output: [PAINTING 1 — Amrita Sher-Gil submission]
  console.log('  cache-control:', r4.headers['cache-control']);
  // Output: public, max-age=1800
  // WHY: This directory was mounted with maxAge: '30m' = 1800 seconds.
  console.log();

  // ── Test 5: Vendor assets with long cache ──────────────────
  console.log('  --- Test 5: GET /vendor/framework.js — vendor dir ---');
  const r5 = await request(port, 'GET', '/vendor/framework.js');
  console.log('  status:       ', r5.status);
  // Output: 200
  console.log('  cache-control:', r5.headers['cache-control']);
  // Output: public, max-age=604800
  // WHY: maxAge: '7d' = 604800 seconds (7 days).
  console.log('  type:         ', r5.headers['content-type']);
  // Output: text/javascript; charset=UTF-8
  console.log();

  // ── Test 6: Fallback static directory ──────────────────────
  console.log('  --- Test 6: GET /painting2.txt — fallback to second static dir ---');
  const r6 = await request(port, 'GET', '/painting2.txt');
  console.log('  status:', r6.status);
  // Output: 200
  console.log('  body:  ', r6.body.trim());
  // Output: [PAINTING 2 — Ravi Varma submission]
  // WHY: File wasn't in publicDir, so Express fell through
  // to the second static middleware (uploadsDir at root).
  console.log();

  // ── Test 7: ETag and conditional request ───────────────────
  console.log('  --- Test 7: Conditional request with If-None-Match ---');
  const r7a = await request(port, 'GET', '/style.css');
  const etag = r7a.headers['etag'];
  console.log('  First request ETag:', etag);

  const r7b = await request(port, 'GET', '/style.css', {
    headers: { 'If-None-Match': etag },
  });
  console.log('  Second request status:', r7b.status);
  // Output: 304
  // WHY: The ETag matched, so the server returns 304 Not Modified.
  // The authentication stamp matched — no body transferred!
  console.log('  Body length:', r7b.body.length);
  // Output: 0
  console.log();

  // ── Test 8: index option — directory serves index.html ─────
  console.log('  --- Test 8: GET / — index option serves index.html ---');
  const r8 = await request(port, 'GET', '/');
  console.log('  status:', r8.status);
  // Output: 200
  console.log('  body:  ', r8.body.includes('NGMA Delhi Home'));
  // Output: true
  // WHY: The index option (default 'index.html') automatically
  // serves index.html when a directory is requested.
  console.log();

  server.close();
  cleanupDir(dirs.baseDir);
  console.log(`  Cleaned up: ${dirs.baseDir}\n`);
}

// =============================================================
// RUN ALL BLOCKS
// =============================================================
async function main() {
  console.log('============================================================');
  console.log(' FILE 10 — Static File Serving (National Gallery of Modern Art)');
  console.log('============================================================\n');

  await block1();
  await block2();

  // ─────────────────────────────────────────────────────────────
  // KEY TAKEAWAYS
  // ─────────────────────────────────────────────────────────────
  console.log('=== KEY TAKEAWAYS ===\n');
  console.log('  1. express.static(root) serves files from a directory — no');
  console.log('     route handlers needed. It handles MIME types, ETags, and');
  console.log('     Last-Modified automatically.');
  console.log('  2. If the file isn\'t found, express.static() silently calls');
  console.log('     next() — other middleware and routes still run.');
  console.log('  3. Options: dotfiles (ignore/deny/allow), extensions (auto-resolve),');
  console.log('     index (default file), maxAge (Cache-Control), etag, lastModified.');
  console.log('  4. Virtual prefix: app.use(\'/assets\', express.static(dir))');
  console.log('     maps URL /assets/* to files in dir/*.');
  console.log('  5. Multiple static dirs: mount several express.static() middlewares.');
  console.log('     Express tries them in order, falling through on miss.');
  console.log('  6. maxAge sets Cache-Control: public, max-age=N. Use short times');
  console.log('     for frequently-changing assets, long times for vendor files.');
  console.log('  7. dotfiles: "deny" blocks dotfile access — essential security');
  console.log('     to prevent leaking .env, .git, .htaccess.');
  console.log('  8. ETags enable 304 Not Modified responses, saving bandwidth');
  console.log('     when files haven\'t changed.\n');

  console.log('Done. All servers closed, temp files cleaned up.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
