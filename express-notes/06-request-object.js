/** ============================================================
 *  FILE 06 — The Request Object in Express 5
 *  Topic: req properties, methods, and content negotiation
 *  WHY THIS MATTERS: Every route handler receives a request
 *  object — mastering its properties lets you extract any
 *  data a client sends: URL parts, headers, body, query
 *  strings, route params, and content-type metadata.
 *  ============================================================ */

// ─────────────────────────────────────────────────────────────
// STORY: Police Station FIR
// ─────────────────────────────────────────────────────────────
// SHO Pandey never registers an FIR without filling out a
// thorough intake form. Every detail matters — where the
// request came from (ip, hostname), what it carries (body,
// query, params), what language it speaks (headers, accepts),
// and whether it's been seen before (fresh/stale). The Express
// req object IS that FIR form.
// ─────────────────────────────────────────────────────────────

const express = require('express');
const http = require('http');

// ─────────────────────────────────────────────────────────────
// Helper — make an HTTP request and return { status, headers, body }
// ─────────────────────────────────────────────────────────────
function request(port, method, path, { body, headers } = {}) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: '127.0.0.1',
      port,
      path,
      method,
      headers: {
        ...(headers || {}),
      },
    };

    if (body) {
      const payload = typeof body === 'string' ? body : JSON.stringify(body);
      opts.headers['Content-Length'] = Buffer.byteLength(payload);
      if (typeof body === 'object' && !opts.headers['Content-Type']) {
        opts.headers['Content-Type'] = 'application/json';
      }
    }

    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(data); } catch { parsed = data; }
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

// =============================================================
// BLOCK 1 — Inspecting Request Properties
// =============================================================
// "SHO Pandey logs every detail of the FIR form."
//
// Express decorates Node's raw IncomingMessage with helper
// properties so you don't have to parse URLs or headers by hand.
// (See nodejs-notes/06 for raw http.IncomingMessage fundamentals)
// ─────────────────────────────────────────────────────────────

async function block1() {
  console.log('=== BLOCK 1: Inspecting Request Properties ===\n');

  const app = express();

  // WHY: express.json() populates req.body for JSON payloads.
  // Without it req.body is undefined.
  app.use(express.json());

  // ── Route that inspects everything ─────────────────────────
  app.get('/inspect/:id', (req, res) => {
    // WHY: req.method is the HTTP verb — always uppercase.
    // WHY: req.url is relative to where this middleware is mounted.
    // WHY: req.originalUrl preserves the full URL even inside routers.
    // WHY: req.path is just the pathname (no query string).
    const basics = {
      method:      req.method,        // 'GET'
      url:         req.url,           // '/inspect/42?sort=name'
      path:        req.path,          // '/inspect/42'
      originalUrl: req.originalUrl,   // '/inspect/42?sort=name'
      protocol:    req.protocol,      // 'http'
      secure:      req.secure,        // false (not HTTPS)
      hostname:    req.hostname,      // '127.0.0.1'
      ip:          req.ip,            // '127.0.0.1'
    };

    // ── Query string & route params ──────────────────────────
    // WHY: req.query parses ?key=val automatically.
    // WHY: req.params holds :named segments from the route pattern.
    const extracted = {
      query:  req.query,              // { sort: 'name' }
      params: req.params,            // { id: '42' }
    };

    // ── Headers ──────────────────────────────────────────────
    // WHY: req.headers is the raw object (all lowercase keys).
    // WHY: req.get() is a case-insensitive shortcut.
    const headerInfo = {
      allHeaders:    req.headers,
      userAgent:     req.get('User-Agent'),
      contentType:   req.get('Content-Type'),
      customHeader:  req.get('X-FIR-Priority'),
    };

    // ── Freshness — ETags & conditional requests ─────────────
    // WHY: req.fresh is true when the client's cache is still valid.
    // WHY: req.stale is the inverse — stale means "send new data".
    const caching = {
      fresh: req.fresh,
      stale: req.stale,
    };

    res.json({ basics, extracted, headerInfo, caching });
  });

  // ── POST route to show req.body ────────────────────────────
  app.post('/complaints', (req, res) => {
    // WHY: Without express.json() middleware, req.body is undefined.
    res.json({
      receivedBody: req.body,
      bodyType:     typeof req.body,
      contentType:  req.get('Content-Type'),
    });
  });

  // ── Start server on port 0 ────────────────────────────────
  const server = app.listen(0);
  const port = server.address().port;
  console.log(`  SHO Pandey's thana open on port ${port}\n`);

  // ── Test 1: GET with query string and custom header ────────
  console.log('  --- Test 1: GET /inspect/42?sort=name ---');
  const r1 = await request(port, 'GET', '/inspect/42?sort=name', {
    headers: { 'X-FIR-Priority': 'urgent' },
  });
  console.log('  method:      ', r1.body.basics.method);
  // Output: GET
  console.log('  url:         ', r1.body.basics.url);
  // Output: /inspect/42?sort=name
  console.log('  path:        ', r1.body.basics.path);
  // Output: /inspect/42
  console.log('  originalUrl: ', r1.body.basics.originalUrl);
  // Output: /inspect/42?sort=name
  console.log('  protocol:    ', r1.body.basics.protocol);
  // Output: http
  console.log('  secure:      ', r1.body.basics.secure);
  // Output: false
  console.log('  hostname:    ', r1.body.basics.hostname);
  // Output: 127.0.0.1
  console.log('  query:       ', r1.body.extracted.query);
  // Output: { sort: 'name' }
  console.log('  params:      ', r1.body.extracted.params);
  // Output: { id: '42' }
  console.log('  X-FIR-Priority:', r1.body.headerInfo.customHeader);
  // Output: urgent
  console.log('  fresh:       ', r1.body.caching.fresh);
  // Output: false
  console.log('  stale:       ', r1.body.caching.stale);
  // Output: true
  console.log();

  // ── Test 2: POST with JSON body ───────────────────────────
  console.log('  --- Test 2: POST /complaints with JSON body ---');
  const complaintData = { title: 'Chain snatching near Chandni Chowk', suspect: 'Unknown' };
  const r2 = await request(port, 'POST', '/complaints', { body: complaintData });
  console.log('  receivedBody:', r2.body.receivedBody);
  // Output: { title: 'Chain snatching near Chandni Chowk', suspect: 'Unknown' }
  console.log('  bodyType:    ', r2.body.bodyType);
  // Output: object
  console.log('  contentType: ', r2.body.contentType);
  // Output: application/json
  console.log();

  server.close();
  return port;
}

// =============================================================
// BLOCK 2 — Content Negotiation, req.accepts(), req.is()
// =============================================================
// "SHO Pandey checks what language the complainant speaks
//  before recording the statement."
//
// req.accepts() checks what MIME types the client prefers.
// req.is() checks the Content-Type of the INCOMING request.
// These are essential for APIs that serve multiple formats.
// ─────────────────────────────────────────────────────────────

async function block2() {
  console.log('=== BLOCK 2: Content Negotiation ===\n');

  const app = express();
  app.use(express.json());
  app.use(express.text());       // WHY: parses text/plain bodies into req.body as a string
  app.use(express.urlencoded({ extended: true })); // WHY: parses form-encoded bodies

  // ── req.accepts() — what does the client want? ─────────────
  app.get('/evidence', (req, res) => {
    // WHY: req.accepts() returns the best match from the Accept header.
    // It returns false if none match.
    const preferred = req.accepts(['json', 'html', 'text']);

    const report = {
      acceptHeader: req.get('Accept'),
      preferred,
      acceptsJson: req.accepts('json') !== false,
      acceptsXml:  req.accepts('xml') !== false,
      acceptsHtml: req.accepts('html') !== false,
    };

    if (preferred === 'json') {
      res.json(report);
    } else if (preferred === 'html') {
      res.type('html').send(`<pre>${JSON.stringify(report, null, 2)}</pre>`);
    } else {
      res.type('text').send(JSON.stringify(report, null, 2));
    }
  });

  // ── req.is() — what did the client send? ───────────────────
  app.post('/evidence', (req, res) => {
    // WHY: req.is() checks the Content-Type of the REQUEST body.
    // Returns the matched type or false.
    const typeChecks = {
      isJson:       req.is('json'),                // 'json' or false
      isText:       req.is('text/*'),               // 'text/plain' or false
      isUrlEncoded: req.is('urlencoded'),            // 'urlencoded' or false
      isHtml:       req.is('html'),                 // false for json bodies
      rawContentType: req.get('Content-Type'),
      bodyReceived: req.body,
    };

    res.json(typeChecks);
  });

  const server = app.listen(0);
  const port = server.address().port;
  console.log(`  Evidence room open on port ${port}\n`);

  // ── Test 1: Accept: application/json ───────────────────────
  console.log('  --- Test 1: GET /evidence with Accept: application/json ---');
  const r1 = await request(port, 'GET', '/evidence', {
    headers: { 'Accept': 'application/json' },
  });
  console.log('  preferred:   ', r1.body.preferred);
  // Output: json
  console.log('  acceptsJson: ', r1.body.acceptsJson);
  // Output: true
  console.log('  acceptsXml:  ', r1.body.acceptsXml);
  // Output: false
  console.log();

  // ── Test 2: Accept: text/html ──────────────────────────────
  console.log('  --- Test 2: GET /evidence with Accept: text/html ---');
  const r2 = await request(port, 'GET', '/evidence', {
    headers: { 'Accept': 'text/html' },
  });
  console.log('  Content-Type:', r2.headers['content-type']);
  // Output: text/html; charset=utf-8
  console.log('  (Response is HTML-wrapped)');
  console.log();

  // ── Test 3: req.is() with JSON body ───────────────────────
  console.log('  --- Test 3: POST /evidence with JSON body ---');
  const r3 = await request(port, 'POST', '/evidence', {
    body: { clue: 'fingerprint' },
  });
  console.log('  isJson:      ', r3.body.isJson);
  // Output: json
  console.log('  isText:      ', r3.body.isText);
  // Output: false
  console.log('  isUrlEncoded:', r3.body.isUrlEncoded);
  // Output: false
  console.log('  bodyReceived:', r3.body.bodyReceived);
  // Output: { clue: 'fingerprint' }
  console.log();

  // ── Test 4: req.is() with text/plain body ─────────────────
  console.log('  --- Test 4: POST /evidence with text/plain body ---');
  const r4 = await request(port, 'POST', '/evidence', {
    body: 'A suspicious note was found near India Gate',
    headers: { 'Content-Type': 'text/plain' },
  });
  console.log('  isJson:      ', r4.body.isJson);
  // Output: false
  console.log('  isText:      ', r4.body.isText);
  // Output: text/plain
  console.log('  bodyReceived:', r4.body.bodyReceived);
  // Output: A suspicious note was found near India Gate
  console.log();

  // ── Test 5: req.is() with form-encoded body ───────────────
  console.log('  --- Test 5: POST /evidence with urlencoded body ---');
  const r5 = await request(port, 'POST', '/evidence', {
    body: 'weapon=lathi&location=chandni-chowk',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  console.log('  isUrlEncoded:', r5.body.isUrlEncoded);
  // Output: urlencoded
  console.log('  bodyReceived:', r5.body.bodyReceived);
  // Output: { weapon: 'lathi', location: 'chandni-chowk' }
  console.log();

  server.close();
}

// =============================================================
// RUN ALL BLOCKS
// =============================================================
async function main() {
  console.log('============================================================');
  console.log(' FILE 06 — The Request Object (Police Station FIR)');
  console.log('============================================================\n');

  await block1();
  await block2();

  // ─────────────────────────────────────────────────────────────
  // KEY TAKEAWAYS
  // ─────────────────────────────────────────────────────────────
  console.log('=== KEY TAKEAWAYS ===\n');
  console.log('  1. req.method, req.url, req.path, req.originalUrl give you');
  console.log('     every angle on WHAT was requested.');
  console.log('  2. req.params holds :named route segments; req.query holds');
  console.log('     ?key=val pairs — both parsed automatically.');
  console.log('  3. req.body requires middleware (express.json(), express.text(),');
  console.log('     express.urlencoded()) — without it, body is undefined.');
  console.log('  4. req.get(header) is case-insensitive; req.headers is raw.');
  console.log('  5. req.accepts() checks what the CLIENT wants to RECEIVE.');
  console.log('  6. req.is() checks what the CLIENT actually SENT.');
  console.log('  7. req.fresh/req.stale relate to caching (ETag/Last-Modified).');
  console.log('  8. req.protocol, req.secure, req.hostname, req.ip give');
  console.log('     connection metadata useful for logging and security.\n');

  console.log('Done. All servers closed cleanly.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
