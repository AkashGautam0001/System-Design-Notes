/** ============================================================
 *  FILE 22: Express 5 Features — Breaking Changes & New Wins
 *  WHY THIS MATTERS: Express 5 is the first major version bump
 *  in a decade. The biggest win is automatic promise rejection
 *  handling — no more try/catch in every async handler. But
 *  there are also breaking changes in path matching, removed
 *  APIs, and changed defaults that WILL break Express 4 code
 *  if you don't know about them.
 *  ============================================================ */

// ─── The Metro Phase 2 Upgrade ────────────────────────────────
//
// Delhi Metro is upgrading from Phase 1 (Express 4) to Phase 2
// (Express 5). The foundation is solid — the tunnels and tracks
// are proven — but the signaling system is outdated, some
// stations need to be rebuilt, and new safety codes require
// changes. The engineers can't just repaint the coaches — some
// lines need entirely new routes, and commuters need to know
// which stations moved and which interchanges changed.
//
// Express 5 is that Phase 2 upgrade. Same foundation (Node http),
// but promises are caught automatically (automatic fault detection),
// path matching syntax changed (new routes), several legacy APIs
// were removed (old stations decommissioned), and defaults
// shifted. This file covers every change you need to know.
//
// (See nodejs-notes/07 for async/await and Promise fundamentals)
// (See nodejs-notes/08 for raw HTTP server fundamentals)

const express = require('express');
const http = require('http');

// ════════════════════════════════════════════════════════════════
// BLOCK 1 — Async Error Handling & Path Matching (Biggest Wins)
// ════════════════════════════════════════════════════════════════

// ─── The #1 Express 5 feature — async error handling ──────────
//
// In Express 4, if an async handler threw or a promise rejected,
// the error was SILENTLY SWALLOWED and the request hung forever:
//
//   // Express 4 — BROKEN, request hangs on error:
//   app.get('/data', async (req, res) => {
//     const data = await fetchFromDB();  // if this throws → hang
//     res.json(data);
//   });
//
//   // Express 4 — workaround needed:
//   app.get('/data', async (req, res, next) => {
//     try {
//       const data = await fetchFromDB();
//       res.json(data);
//     } catch (err) {
//       next(err);  // manually forward to error handler
//     }
//   });
//
// In Express 5, rejected promises are caught AUTOMATICALLY
// and forwarded to the error handler. No try/catch needed.

function block1_asyncAndPaths() {
  return new Promise((resolve) => {
    const app = express();

    console.log('=== BLOCK 1: Async Error Handling & Path Matching ===\n');

    // ─── Demo 1: Async handler — promise rejection caught ─────
    app.get('/async-success', async (req, res) => {
      // Simulate async database call
      const data = await Promise.resolve({ id: 1, name: 'Rajiv Kumar', role: 'station-master' });
      res.json(data);
      // WHY: Async handlers work naturally in Express 5 — just
      // use async/await without wrapping in try/catch.
    });

    app.get('/async-error', async (req, res) => {
      // Simulate a signaling system failure
      const result = await Promise.reject(new Error('Signal relay connection lost'));
      res.json(result); // never reached
      // WHY: In Express 5, this rejection is caught automatically
      // and forwarded to the error handler below. In Express 4,
      // this would hang the request indefinitely.
    });

    // ─── Demo 2: Throwing in async handler — also caught ──────
    app.get('/async-throw', async (req, res) => {
      throw new Error('Unexpected null reference');
      // WHY: throw inside async function creates a rejection,
      // which Express 5 catches. Same behavior as returning
      // a rejected promise.
    });

    // ─── Demo 3: Nested async — still caught ─────────────────
    app.get('/async-nested', async (req, res) => {
      async function validateInput() {
        throw new Error('Validation failed: missing required field');
      }
      await validateInput();
      res.json({ ok: true }); // never reached
      // WHY: Even deeply nested async errors bubble up through
      // the promise chain and get caught by Express 5.
    });

    // ─── Demo 4: Sync errors — still caught as before ─────────
    app.get('/sync-error', (req, res) => {
      throw new Error('Sync explosion');
      // WHY: Synchronous throws were always caught by Express.
      // This hasn't changed in Express 5.
    });

    // ─── Path matching changes in Express 5 ───────────────────
    //
    // Express 5 uses a new path-to-regexp version with stricter
    // syntax. Key changes:
    //
    //   Express 4              Express 5
    //   ────────────────────── ──────────────────────
    //   /station/:id           /station/:id     (same)
    //   /line/*                /line/*name (named, returns array)
    //   /ab?cd (regex-like)    REMOVED — no regex in path strings
    //   /:id(\d+)              REMOVED — use param validation instead
    //   /station/:id?          /station{/:id}  (braces wrap slash+param)
    //
    // WHY: The old regex-in-string syntax was confusing and
    // error-prone. Express 5 separates path matching from
    // validation — match the route, validate in the handler.

    // ─── Standard parameter — unchanged ───────────────────────
    app.get('/station/:id', (req, res) => {
      res.json({
        pattern: '/station/:id',
        params: req.params,
        // WHY: Basic :param syntax works the same in Express 5.
      });
    });

    // ─── Wildcard — must be named in Express 5 ────────────────
    app.get('/files/*filepath', (req, res) => {
      res.json({
        pattern: '/files/*filepath',
        filepath: req.params.filepath,
        joined: req.params.filepath.join('/'),
        // WHY: Express 5 requires wildcards to be named.
        // /files/*filepath captures everything after /files/.
        // In Express 5, wildcard params return an ARRAY of path
        // segments: ['docs','report','final.pdf']. Join with '/'
        // if you need the original path string.
      });
    });

    // ─── Optional parameters — use braces in Express 5 ────────
    app.get('/schedule/:line{/:month}', (req, res) => {
      res.json({
        pattern: '/schedule/:line{/:month}',
        line: req.params.line,
        month: req.params.month || 'not provided',
        // WHY: In Express 5, {/:param} makes BOTH the slash and
        // the parameter optional. Express 4 used :param? but that
        // syntax is removed. The braces must wrap the slash too,
        // otherwise /schedule/blue (no month) would 404 because
        // the slash before month would still be required.
      });
    });

    // ─── Multiple parameters — unchanged ──────────────────────
    app.get('/metro/:line/:station', (req, res) => {
      res.json({
        line: req.params.line,
        station: req.params.station,
      });
    });

    // ─── req.params — decoded by default in Express 5 ─────────
    app.get('/search/:query', (req, res) => {
      res.json({
        rawQuery: req.params.query,
        // WHY: In Express 5, req.params values are automatically
        // URI-decoded. If someone requests /search/hello%20world,
        // req.params.query is 'hello world', not 'hello%20world'.
        // In Express 4, you had to decode manually.
      });
    });

    // ─── Error handler — catches all the async errors above ───
    app.use((err, req, res, next) => {
      // WHY: This single error handler catches BOTH sync throws
      // and async rejections in Express 5. In Express 4, async
      // errors never reached here without manual try/catch + next(err).
      res.status(500).json({
        error: err.message,
        caught: true,
        handler: 'centralized-error-handler',
      });
    });

    const server = app.listen(0, async () => {
      const port = server.address().port;
      const base = `http://127.0.0.1:${port}`;
      console.log(`Server running on port ${port}\n`);

      try {
        // ─── Test async success ───────────────────────────────
        console.log('--- Async Error Handling (Express 5 #1 Feature) ---');
        const successRes = await fetch(`${base}/async-success`);
        const successData = await successRes.json();
        console.log('GET /async-success:', JSON.stringify(successData));
        // Output: GET /async-success: {"id":1,"name":"Rajiv Kumar","role":"station-master"}

        // ─── Test async rejection — caught automatically ──────
        const errorRes = await fetch(`${base}/async-error`);
        const errorData = await errorRes.json();
        console.log('GET /async-error status:', errorRes.status);
        // Output: GET /async-error status: 500
        console.log('GET /async-error:', JSON.stringify(errorData));
        // Output: GET /async-error: {"error":"Signal relay connection lost","caught":true,"handler":"centralized-error-handler"}
        // WHY: The rejection was caught and routed to the error
        // handler — no try/catch needed in the route handler!

        // ─── Test async throw — also caught ───────────────────
        const throwRes = await fetch(`${base}/async-throw`);
        const throwData = await throwRes.json();
        console.log('GET /async-throw:', JSON.stringify(throwData));
        // Output: GET /async-throw: {"error":"Unexpected null reference","caught":true,"handler":"centralized-error-handler"}

        // ─── Test nested async — still caught ─────────────────
        const nestedRes = await fetch(`${base}/async-nested`);
        const nestedData = await nestedRes.json();
        console.log('GET /async-nested:', nestedData.error);
        // Output: GET /async-nested: Validation failed: missing required field

        // ─── Test sync error — unchanged behavior ─────────────
        const syncRes = await fetch(`${base}/sync-error`);
        const syncData = await syncRes.json();
        console.log('GET /sync-error:', syncData.error);
        // Output: GET /sync-error: Sync explosion

        // ─── Test path matching ───────────────────────────────
        console.log('\n--- Path Matching Changes ---');

        // Standard params — unchanged
        const stationRes = await fetch(`${base}/station/42`);
        const stationData = await stationRes.json();
        console.log('GET /station/42:', JSON.stringify(stationData.params));
        // Output: GET /station/42: {"id":"42"}

        // Named wildcard — new in Express 5
        const fileRes = await fetch(`${base}/files/docs/report/final.pdf`);
        const fileData = await fileRes.json();
        console.log('GET /files/docs/report/final.pdf filepath:', JSON.stringify(fileData.filepath));
        // Output: GET /files/docs/report/final.pdf filepath: ["docs","report","final.pdf"]
        console.log('  joined:', fileData.joined);
        // Output:   joined: docs/report/final.pdf
        // WHY: In Express 5, named wildcards return an ARRAY of
        // path segments, not a string. Use .join('/') to reconstruct.

        // Optional param — with value
        const scheduleFullRes = await fetch(`${base}/schedule/blue/march`);
        const scheduleFullData = await scheduleFullRes.json();
        console.log('GET /schedule/blue/march:', JSON.stringify(scheduleFullData));
        // Output: GET /schedule/blue/march: {"pattern":"/schedule/:line{/:month}","line":"blue","month":"march"}

        // Optional param — without value
        const schedulePartRes = await fetch(`${base}/schedule/blue`);
        const schedulePartData = await schedulePartRes.json();
        console.log('GET /schedule/blue:', schedulePartData.month);
        // Output: GET /schedule/blue: not provided
        // WHY: {/:month} is optional — the route matches both
        // /schedule/blue and /schedule/blue/march. The braces wrap
        // the slash AND the param to make the whole segment optional.

        // Decoded params — new default in Express 5
        const searchRes = await fetch(`${base}/search/hello%20world`);
        const searchData = await searchRes.json();
        console.log('GET /search/hello%20world:', searchData.rawQuery);
        // Output: GET /search/hello%20world: hello world
        // WHY: Express 5 auto-decodes params. No more manual
        // decodeURIComponent() calls.
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
// BLOCK 2 — Removed/Changed APIs & Migration Gotchas
// ════════════════════════════════════════════════════════════════

// ─── What's gone in Express 5 ─────────────────────────────────
//
// Removed API               Replacement
// ──────────────────────── ────────────────────────────────────
// app.del()                 app.delete()
// req.param(name)           req.params.name / req.body.name / req.query.name
// res.json(obj, status)     res.status(s).json(obj)
// res.send(status)          res.sendStatus(status) for number
// res.send(obj, status)     res.status(s).send(obj)
// req.host                  req.hostname (no port)
// res.redirect('back')      Check Referer header manually
// app.router                Removed (no-op)
// Regex in path strings     Use param validation or separate regex

function block2_removedAndChanged() {
  return new Promise((resolve) => {
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));

    console.log('=== BLOCK 2: Removed/Changed APIs & Migration ===\n');

    // ─── req.hostname (replaces req.host) ─────────────────────
    app.get('/hostname-demo', (req, res) => {
      res.json({
        hostname: req.hostname,
        // WHY: Express 5 uses req.hostname (no port number).
        // Express 4 had both req.host (with port) and req.hostname.
        // Express 5 removed req.host entirely.
        // Migration: Change all req.host to req.hostname.
      });
    });

    // ─── req.query — uses querystring by default (not qs) ─────
    app.get('/query-demo', (req, res) => {
      res.json({
        query: req.query,
        // WHY: Express 5 uses Node's built-in 'querystring' module
        // (called 'simple') by default, NOT the 'qs' package.
        //
        // Key difference: nested objects don't work by default.
        //   ?yatri[name]=Rajiv  → Express 4 (qs):     { yatri: { name: 'Rajiv' } }
        //   ?yatri[name]=Rajiv  → Express 5 (simple):  { 'yatri[name]': 'Rajiv' }
        //
        // If you need nested query parsing, set:
        //   app.set('query parser', 'extended')
      });
    });

    // ─── Correct Express 5 patterns (replacing removed APIs) ──

    // app.delete() — replaces app.del()
    app.delete('/booking/:id', (req, res) => {
      res.json({
        deleted: req.params.id,
        note: 'Use app.delete(), not app.del() — del() is removed in Express 5',
      });
      // WHY: app.del() was just an alias because 'delete' is a
      // JS reserved word. Modern JS handles it fine as a method
      // name, so the alias was removed.
    });

    // res.status().json() — replaces res.json(obj, status)
    app.get('/correct-status-json', (req, res) => {
      res.status(201).json({ created: true, id: 99 });
      // WHY: The old signature res.json(obj, status) and
      // res.json(status, obj) are REMOVED. Always chain:
      //   res.status(code).json(data)
    });

    // res.sendStatus() — replaces res.send(statusCode)
    app.get('/correct-send-status', (req, res) => {
      res.sendStatus(204);
      // WHY: In Express 4, res.send(200) sent the number 200 as
      // the status. This was confusing (does 200 mean body or status?).
      // Express 5 removes this — use res.sendStatus() for status-only.
    });

    // ─── Explicit param lookup (replaces req.param()) ─────────
    app.post('/explicit-params/:line', (req, res) => {
      // Express 4 had req.param('name') that searched params, body, AND query.
      // Express 5 REMOVED it because that magic search order was dangerous.
      //
      // Migration: be explicit about where data comes from.
      const line = req.params.line;             // from URL path
      const search = req.query.search || '';     // from query string
      const coach = req.body ? req.body.coach : ''; // from request body

      res.json({
        line,        // from :line in path
        search,      // from ?search=... in URL
        coach,       // from POST body
        note: 'Explicit is better than req.param() magic search',
      });
      // WHY: req.param('x') searched req.params, req.body, and
      // req.query in order — an attacker could override a URL param
      // by sending it in the body. Explicit lookups prevent this.
    });

    // ─── res.redirect() — 'back' is removed ──────────────────
    app.get('/redirect-demo', (req, res) => {
      // Express 4: res.redirect('back') used Referer header
      // Express 5: 'back' is removed — do it manually
      const referer = req.get('referer') || '/fallback';
      res.redirect(referer);
      // WHY: The magic 'back' string was implicit and surprising.
      // Express 5 removes it — be explicit about redirect targets.
    });

    app.get('/fallback', (req, res) => {
      res.json({ page: 'fallback', note: 'redirect landed here' });
    });

    // ─── Status code redirect change ──────────────────────────
    app.get('/redirect-status', (req, res) => {
      res.redirect(303, '/api/result');
      // WHY: In Express 5, res.redirect() still accepts
      // (status, url) but the default status remains 302.
      // Express 5 does NOT change the default redirect status.
    });

    app.get('/api/result', (req, res) => {
      res.json({ redirected: true, from: '/redirect-status' });
    });

    // ─── Error handler ────────────────────────────────────────
    app.use((err, req, res, next) => {
      res.status(500).json({ error: err.message });
    });

    const server = app.listen(0, async () => {
      const port = server.address().port;
      const base = `http://127.0.0.1:${port}`;
      console.log(`Server running on port ${port}\n`);

      try {
        // ─── Test req.hostname ────────────────────────────────
        console.log('--- Removed/Changed APIs ---');
        const hostRes = await fetch(`${base}/hostname-demo`);
        const hostData = await hostRes.json();
        console.log('req.hostname:', hostData.hostname);
        // Output: req.hostname: 127.0.0.1
        // WHY: Returns hostname without port number.

        // ─── Test req.query (simple parser) ───────────────────
        console.log('\n--- req.query (simple parser by default) ---');
        const q1Res = await fetch(`${base}/query-demo?line=blue&direction=north`);
        const q1Data = await q1Res.json();
        console.log('Simple query:', JSON.stringify(q1Data.query));
        // Output: Simple query: {"line":"blue","direction":"north"}

        // Nested query — NOT parsed with simple parser
        const q2Res = await fetch(`${base}/query-demo?yatri[name]=Rajiv&yatri[role]=commuter`);
        const q2Data = await q2Res.json();
        console.log('Nested query (simple):', JSON.stringify(q2Data.query));
        // Output: Nested query (simple): {"yatri[name]":"Rajiv","yatri[role]":"commuter"}
        // WHY: Simple parser treats brackets as literal characters.
        // To get { yatri: { name: 'Rajiv' } }, set query parser to 'extended'.

        // ─── Test app.delete() ────────────────────────────────
        console.log('\n--- app.delete() (replaces app.del()) ---');
        const delRes = await fetch(`${base}/booking/42`, { method: 'DELETE' });
        const delData = await delRes.json();
        console.log('DELETE /booking/42:', JSON.stringify(delData));
        // Output: DELETE /booking/42: {"deleted":"42","note":"Use app.delete(), not app.del() — del() is removed in Express 5"}

        // ─── Test res.status().json() ─────────────────────────
        console.log('\n--- res.status().json() (replaces res.json(obj, status)) ---');
        const createRes = await fetch(`${base}/correct-status-json`);
        console.log('Status:', createRes.status);
        // Output: Status: 201
        const createData = await createRes.json();
        console.log('Body:', JSON.stringify(createData));
        // Output: Body: {"created":true,"id":99}

        // ─── Test res.sendStatus() ────────────────────────────
        console.log('\n--- res.sendStatus() (replaces res.send(number)) ---');
        const ssRes = await fetch(`${base}/correct-send-status`);
        console.log('sendStatus(204):', ssRes.status);
        // Output: sendStatus(204): 204

        // ─── Test explicit param lookup ───────────────────────
        console.log('\n--- Explicit param lookup (replaces req.param()) ---');
        const paramRes = await fetch(`${base}/explicit-params/violet?search=hauz-khas`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ coach: 'ladies-special' }),
        });
        const paramData = await paramRes.json();
        console.log('line (from params):', paramData.line);
        // Output: line (from params): violet
        console.log('search (from query):', paramData.search);
        // Output: search (from query): hauz-khas
        console.log('coach (from body):', paramData.coach);
        // Output: coach (from body): ladies-special
        // WHY: Each value comes from a clear, explicit source.

        // ─── Test redirect (no 'back') ────────────────────────
        console.log('\n--- res.redirect() changes ---');
        const redirRes = await fetch(`${base}/redirect-demo`, {
          redirect: 'manual',
          headers: { 'Referer': 'https://delhimetro.net/origin' },
        });
        console.log('Redirect status:', redirRes.status);
        // Output: Redirect status: 302
        console.log('Location:', redirRes.headers.get('location'));
        // Output: Location: https://delhimetro.net/origin
        // WHY: We manually read the Referer header instead of
        // relying on the removed 'back' magic string.

        // Without Referer — falls back to /fallback
        const redirNoRefRes = await fetch(`${base}/redirect-demo`, {
          redirect: 'manual',
        });
        console.log('Redirect without Referer:', redirNoRefRes.headers.get('location'));
        // Output: Redirect without Referer: /fallback

        // ─── Verify removed APIs ──────────────────────────────
        console.log('\n--- Verify removed APIs ---');
        console.log('app.del exists:', typeof app.del);
        // Output: app.del exists: undefined
        // WHY: app.del() is completely removed — not just deprecated.

        // Check that req.param is gone by testing the Express app object
        const appInstance = express();
        const testReq = { params: {}, query: {}, body: {} };
        console.log('req.param exists on fresh req:', typeof testReq.param);
        // Output: req.param exists on fresh req: undefined

        // ─── Migration summary ────────────────────────────────
        console.log('\n--- Express 5 Migration Summary ---');
        console.log('app.del()          → app.delete()');
        console.log('req.param(name)    → req.params.name / req.query.name / req.body.name');
        console.log('req.host           → req.hostname');
        console.log('res.json(obj, st)  → res.status(st).json(obj)');
        console.log('res.send(number)   → res.sendStatus(number)');
        console.log("res.redirect('back')→ Manual Referer check");
        console.log('/route/:id?        → /route{/:id}');
        console.log('/files/*           → /files/*name (returns array)');
        console.log('/id(\\d+) regex    → Validate in handler');
      } catch (err) {
        console.error('Test error:', err.message);
      }

      server.close(() => {
        console.log('\nBlock 2 server closed.\n');
        resolve();
      });
    });
  });
}

// ════════════════════════════════════════════════════════════════
// Run all blocks sequentially, then exit
// ════════════════════════════════════════════════════════════════

async function main() {
  await block1_asyncAndPaths();
  await block2_removedAndChanged();

  console.log('=== KEY TAKEAWAYS ===');
  console.log('1. Express 5 auto-catches rejected promises — no more try/catch wrappers.');
  console.log('2. Wildcards must be named: /files/*filepath, not /files/*.');
  console.log('3. Optional params use braces: /route{/:param}, not /route/:param?.');
  console.log('4. req.params values are auto-decoded (no manual decodeURIComponent).');
  console.log('5. req.query uses simple parser by default — no nested object support.');
  console.log('6. app.del(), req.param(), res.json(obj,status) are REMOVED.');
  console.log('7. req.host is gone — use req.hostname (no port).');
  console.log("8. res.redirect('back') is removed — check Referer manually.");
  console.log('9. No regex in path strings — validate params in handlers instead.');
  console.log('10. Migration: be explicit about data sources, status codes, and redirects.');

  process.exit(0);
}

main();
