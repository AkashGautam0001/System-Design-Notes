/** ============================================================
 *  FILE 5: Built-in Middleware — JSON, URL-encoded, and Static
 *  WHY THIS MATTERS: Express ships three built-in middleware
 *  functions that handle the most common server tasks: parsing
 *  JSON bodies, parsing form submissions, and serving static
 *  files.  You will use at least one of these in every Express
 *  app you build.
 *  ============================================================ */

// ─── Swiggy Order Processing ──────────────────────────────────
//
// At Swiggy's order processing center, orders arrive in
// different formats: some as JSON order slips from the app,
// some as form-encoded requests from restaurant partners, and
// some are static files like restaurant images and menus to be
// served directly.  Three automated processing machines handle these:
//
//   1. express.json()       — reads the JSON order slip
//   2. express.urlencoded() — reads the form-encoded address fields
//   3. express.static()     — serves restaurant images directly
//
// Each machine has settings: size limits, content type filters,
// and special options.  Let's configure them all.
//
// (See nodejs-notes/08 for body parsing fundamentals)
// (See nodejs-notes/10 for file system fundamentals)

const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ════════════════════════════════════════════════════════════════
// BLOCK 1 — express.json() and express.urlencoded()
// ════════════════════════════════════════════════════════════════

// ─── express.json() options ───────────────────────────────────
//
//   express.json({
//     limit:   '100kb',   // Max body size (default '100kb')
//     strict:  true,      // Only accept arrays and objects (default true)
//     type:    'application/json',  // Content-Type to parse
//     reviver: null,      // JSON.parse reviver function
//   })
//
// ─── express.urlencoded() options ─────────────────────────────
//
//   express.urlencoded({
//     extended: true,     // Use qs library (true) or querystring (false)
//                         // Extended supports nested objects: a[b]=c
//     limit:    '100kb',  // Max body size
//     type:     'application/x-www-form-urlencoded',
//   })

function block1_bodyParsing() {
  return new Promise((resolve) => {
    const app = express();

    // ─── Mount JSON parser ────────────────────────────────────
    app.use(express.json({ limit: '50kb' }));
    // WHY: express.json() parses request bodies with
    // Content-Type: application/json.  The parsed object
    // is placed in req.body.  Without this, req.body is undefined.

    // ─── Mount URL-encoded parser ─────────────────────────────
    app.use(express.urlencoded({ extended: true, limit: '50kb' }));
    // WHY: express.urlencoded() parses form submissions
    // (Content-Type: application/x-www-form-urlencoded).
    // `extended: true` supports nested objects like address[city]=Mumbai.

    // ─── POST endpoint accepting JSON ─────────────────────────
    app.post('/orders/json', (req, res) => {
      // WHY: After express.json() runs, req.body contains the
      // parsed JavaScript object — no manual JSON.parse needed.
      res.json({
        received: 'json',
        body: req.body,
        bodyType: typeof req.body,
      });
    });

    // ─── POST endpoint accepting URL-encoded forms ────────────
    app.post('/orders/form', (req, res) => {
      // WHY: After express.urlencoded() runs, req.body contains
      // the parsed form fields as key-value pairs.
      res.json({
        received: 'urlencoded',
        body: req.body,
        bodyType: typeof req.body,
      });
    });

    // ─── POST endpoint demonstrating both parsers coexist ─────
    app.post('/orders/any', (req, res) => {
      // WHY: Both parsers can be mounted simultaneously.  Each
      // one checks Content-Type and only parses if it matches.
      // A JSON request triggers express.json(); a form request
      // triggers express.urlencoded().  Both populate req.body.
      const contentType = req.headers['content-type'] || 'unknown';
      res.json({
        contentType,
        body: req.body,
        hasBody: req.body !== undefined && Object.keys(req.body).length > 0,
      });
    });

    // ─── Endpoint showing what happens WITHOUT a body ─────────
    app.post('/orders/empty', (req, res) => {
      // WHY: If no Content-Type matches or body is empty,
      // req.body may be undefined or an empty object — always
      // check before using it.
      res.json({
        body: req.body,
        isEmpty: !req.body || Object.keys(req.body).length === 0,
      });
    });

    const server = app.listen(0, async () => {
      const port = server.address().port;
      const base = `http://127.0.0.1:${port}`;
      console.log('=== BLOCK 1: express.json() and express.urlencoded() ===');
      console.log(`Server running on port ${port}\n`);

      try {
        // ─── Test JSON body parsing ───────────────────────────
        const jsonRes = await fetch(`${base}/orders/json`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ restaurant: 'Biryani House', amount: 349, express: true }),
        });
        const jsonData = await jsonRes.json();
        console.log('POST /orders/json (JSON):', JSON.stringify(jsonData));
        // Output: POST /orders/json (JSON): {"received":"json","body":{"restaurant":"Biryani House","amount":349,"express":true},"bodyType":"object"}

        // ─── Test URL-encoded body parsing ────────────────────
        const formRes = await fetch(`${base}/orders/form`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'restaurant=Tandoor+Nights&amount=199&type=delivery',
        });
        const formData = await formRes.json();
        console.log('POST /orders/form (form):', JSON.stringify(formData));
        // Output: POST /orders/form (form): {"received":"urlencoded","body":{"restaurant":"Tandoor Nights","amount":"199","type":"delivery"},"bodyType":"object"}

        // ─── Test extended nested object parsing ──────────────
        const nestedRes = await fetch(`${base}/orders/form`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'address[city]=Mumbai&address[pin]=400001&items[0]=biryani&items[1]=naan',
        });
        const nestedData = await nestedRes.json();
        console.log('POST /orders/form (nested):', JSON.stringify(nestedData));
        // Output: POST /orders/form (nested): {"received":"urlencoded","body":{"address":{"city":"Mumbai","pin":"400001"},"items":["biryani","naan"]},"bodyType":"object"}

        // ─── Test both parsers on /orders/any ───────────────
        const anyJsonRes = await fetch(`${base}/orders/any`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ format: 'json' }),
        });
        const anyJsonData = await anyJsonRes.json();
        console.log('POST /orders/any (json):', JSON.stringify(anyJsonData));
        // Output: POST /orders/any (json): {"contentType":"application/json","body":{"format":"json"},"hasBody":true}

        const anyFormRes = await fetch(`${base}/orders/any`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'format=form',
        });
        const anyFormData = await anyFormRes.json();
        console.log('POST /orders/any (form):', JSON.stringify(anyFormData));
        // Output: POST /orders/any (form): {"contentType":"application/x-www-form-urlencoded","body":{"format":"form"},"hasBody":true}

        // ─── Test empty body ──────────────────────────────────
        const emptyRes = await fetch(`${base}/orders/empty`, {
          method: 'POST',
        });
        const emptyData = await emptyRes.json();
        console.log('POST /orders/empty:', JSON.stringify(emptyData));
        // Output: POST /orders/empty: {"isEmpty":true}
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
// BLOCK 2 — express.static() with Temp Directory
// ════════════════════════════════════════════════════════════════

// ─── express.static() options ─────────────────────────────────
//
//   express.static(root, {
//     dotfiles:    'ignore',  // 'allow', 'deny', 'ignore'
//     extensions:  false,     // Fallback extensions ['html','htm']
//     index:       'index.html',  // Directory index file
//     maxAge:      0,         // Cache-Control max-age in ms
//     redirect:    true,      // Redirect /dir to /dir/
//     etag:        true,      // Enable ETag generation
//     lastModified:true,      // Set Last-Modified header
//   })

function block2_staticFiles() {
  return new Promise((resolve) => {
    // ─── Create temporary directory with test files ───────────
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'express-static-'));
    const publicDir = path.join(tmpDir, 'public');
    const cssDir = path.join(publicDir, 'css');
    const dataDir = path.join(publicDir, 'data');

    fs.mkdirSync(publicDir, { recursive: true });
    fs.mkdirSync(cssDir, { recursive: true });
    fs.mkdirSync(dataDir, { recursive: true });

    // Write test files
    fs.writeFileSync(
      path.join(publicDir, 'index.html'),
      '<!DOCTYPE html><html><body><h1>Swiggy Order Center</h1></body></html>'
    );
    fs.writeFileSync(
      path.join(cssDir, 'style.css'),
      'body { font-family: Noto Sans, sans-serif; color: #333; }'
    );
    fs.writeFileSync(
      path.join(dataDir, 'info.json'),
      JSON.stringify({ platform: 'Swiggy', established: 2014 })
    );
    fs.writeFileSync(
      path.join(publicDir, 'about.txt'),
      'Swiggy: delivering happiness since 2014.'
    );
    // Hidden dotfile for testing
    fs.writeFileSync(
      path.join(publicDir, '.secret'),
      'This should not be served.'
    );

    console.log(`  [SETUP] Created temp static files in: ${tmpDir}`);

    const app = express();

    // ─── Mount static file server ─────────────────────────────
    app.use(
      '/static',
      express.static(publicDir, {
        dotfiles: 'ignore',        // Ignore dotfiles like .secret
        extensions: ['html'],      // Try .html extension if no match
        index: 'index.html',       // Serve index.html for directory requests
        maxAge: '1h',              // Browser cache for 1 hour
        etag: true,                // Generate ETag headers
        lastModified: true,        // Set Last-Modified header
      })
    );
    // WHY: express.static() serves files from a directory.
    // Mounting it at '/static' means /static/style.css serves
    // publicDir/style.css.  It handles Content-Type, caching
    // headers, conditional requests (304), and security.

    // ─── Mount a second static directory at root ──────────────
    // You can mount multiple static middleware — they're checked
    // in order until one finds a matching file.
    app.use(express.static(publicDir));
    // WHY: This serves the same files but at the root URL.
    // GET /about.txt serves publicDir/about.txt.
    // Multiple static mounts let you layer virtual directories.

    // ─── Dynamic route that coexists with static ──────────────
    app.get('/api/status', (req, res) => {
      // WHY: Static middleware only handles files it finds.
      // Unmatched requests pass through to your routes.
      res.json({ status: 'operational', staticDir: publicDir });
    });

    const server = app.listen(0, async () => {
      const port = server.address().port;
      const base = `http://127.0.0.1:${port}`;
      console.log('=== BLOCK 2: express.static() ===');
      console.log(`Server running on port ${port}\n`);

      try {
        // ─── Test serving HTML file via /static prefix ────────
        const htmlRes = await fetch(`${base}/static/index.html`);
        const htmlBody = await htmlRes.text();
        console.log('GET /static/index.html status:', htmlRes.status);
        // Output: GET /static/index.html status: 200
        console.log('  Content-Type:', htmlRes.headers.get('content-type'));
        // Output:   Content-Type: text/html; charset=utf-8
        console.log('  Body:', htmlBody.substring(0, 60) + '...');
        // Output:   Body: <!DOCTYPE html><html><body><h1>Swiggy Order Center</h1></b...

        // ─── Test directory index (serves index.html) ─────────
        const dirRes = await fetch(`${base}/static/`, { redirect: 'follow' });
        const dirBody = await dirRes.text();
        console.log('GET /static/ serves index.html:', dirBody.includes('Swiggy'));
        // Output: GET /static/ serves index.html: true

        // ─── Test CSS file ────────────────────────────────────
        const cssRes = await fetch(`${base}/static/css/style.css`);
        const cssBody = await cssRes.text();
        console.log('GET /static/css/style.css:', cssRes.status);
        // Output: GET /static/css/style.css: 200
        console.log('  Content-Type:', cssRes.headers.get('content-type'));
        // Output:   Content-Type: text/css; charset=utf-8
        console.log('  Body:', cssBody);
        // Output:   Body: body { font-family: Noto Sans, sans-serif; color: #333; }

        // ─── Test JSON data file ──────────────────────────────
        const dataRes = await fetch(`${base}/static/data/info.json`);
        const dataBody = await dataRes.json();
        console.log('GET /static/data/info.json:', JSON.stringify(dataBody));
        // Output: GET /static/data/info.json: {"platform":"Swiggy","established":2014}

        // ─── Test text file ───────────────────────────────────
        const txtRes = await fetch(`${base}/static/about.txt`);
        const txtBody = await txtRes.text();
        console.log('GET /static/about.txt:', txtBody);
        // Output: GET /static/about.txt: Swiggy: delivering happiness since 2014.

        // ─── Test dotfile ignored ─────────────────────────────
        const dotRes = await fetch(`${base}/static/.secret`);
        console.log('GET /static/.secret status:', dotRes.status);
        // Output: GET /static/.secret status: 404
        // WHY: dotfiles: 'ignore' makes the server pretend
        // the file doesn't exist — a security best practice.

        // ─── Test cache headers ───────────────────────────────
        const cacheRes = await fetch(`${base}/static/about.txt`);
        console.log('Cache-Control:', cacheRes.headers.get('cache-control'));
        // Output: Cache-Control: public, max-age=3600
        console.log('ETag present:', cacheRes.headers.has('etag'));
        // Output: ETag present: true
        console.log('Last-Modified present:', cacheRes.headers.has('last-modified'));
        // Output: Last-Modified present: true

        // ─── Test extension fallback ──────────────────────────
        // Requesting /static/index should find /static/index.html
        const extRes = await fetch(`${base}/static/index`);
        const extBody = await extRes.text();
        console.log('GET /static/index (extension fallback):', extRes.status);
        // Output: GET /static/index (extension fallback): 200
        console.log('  Found index.html:', extBody.includes('Swiggy'));
        // Output:   Found index.html: true

        // ─── Test root-mounted static (no /static prefix) ────
        const rootRes = await fetch(`${base}/about.txt`);
        const rootBody = await rootRes.text();
        console.log('GET /about.txt (root mount):', rootBody);
        // Output: GET /about.txt (root mount): Swiggy: delivering happiness since 2014.

        // ─── Test coexistence with dynamic routes ─────────────
        const apiRes = await fetch(`${base}/api/status`);
        const apiData = await apiRes.json();
        console.log('GET /api/status:', JSON.stringify({ status: apiData.status }));
        // Output: GET /api/status: {"status":"operational"}

        // ─── Test non-existent file ───────────────────────────
        const missingRes = await fetch(`${base}/static/nope.txt`);
        console.log('GET /static/nope.txt status:', missingRes.status);
        // Output: GET /static/nope.txt status: 404
      } catch (err) {
        console.error('Test error:', err.message);
      }

      server.close(() => {
        // ─── Clean up temp directory ──────────────────────────
        fs.rmSync(tmpDir, { recursive: true, force: true });
        console.log(`  [CLEANUP] Removed temp dir: ${tmpDir}`);
        console.log('\nBlock 2 server closed.');
        resolve();
      });
    });
  });
}

// ════════════════════════════════════════════════════════════════
// Run all blocks sequentially, then exit
// ════════════════════════════════════════════════════════════════

async function main() {
  await block1_bodyParsing();
  await block2_staticFiles();

  console.log('\n=== KEY TAKEAWAYS ===');
  console.log('1. express.json() parses JSON bodies — without it, req.body is undefined for JSON.');
  console.log('2. express.urlencoded({ extended: true }) parses form data, including nested objects.');
  console.log('3. Both parsers check Content-Type — they only parse matching requests.');
  console.log('4. express.static(dir) serves files from a directory with proper MIME types.');
  console.log('5. Static options: dotfiles, extensions, index, maxAge, etag, lastModified.');
  console.log('6. Mount static at a prefix (app.use(\'/static\', ...)) or at root (app.use(...)).');
  console.log('7. Multiple static mounts are checked in order — first match wins.');
  console.log('8. Static middleware passes through to routes when no file matches — they coexist.');

  process.exit(0);
}

main();
