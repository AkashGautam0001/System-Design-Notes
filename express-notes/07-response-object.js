/** ============================================================
 *  FILE 07 — The Response Object in Express 5
 *  Topic: res methods for status, headers, body, files, and
 *         content negotiation
 *  WHY THIS MATTERS: The response object is your toolkit for
 *  crafting exactly the right HTTP reply — status codes,
 *  headers, body formats, redirects, file downloads, and
 *  content negotiation. Mastering res means full control
 *  over what the client receives.
 *  ============================================================ */

// ─────────────────────────────────────────────────────────────
// STORY: Kumhar's Potter Workshop
// ─────────────────────────────────────────────────────────────
// Kumhar Ramu runs a pottery workshop where every order gets
// custom packaging. Some clients want their goods in a brass
// pot (JSON), others in tissue paper (HTML), some want just
// the raw clay (text). He stamps each package with a status
// tag, wraps it with the right headers, and sometimes
// redirects clients to a different kiln. The Express res
// object is his entire packaging station.
// ─────────────────────────────────────────────────────────────

const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const os = require('os');

// ─────────────────────────────────────────────────────────────
// Helper — make an HTTP request (does NOT follow redirects)
// ─────────────────────────────────────────────────────────────
function request(port, method, urlPath, { body, headers, raw } = {}) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: '127.0.0.1',
      port,
      path: urlPath,
      method,
      headers: { ...(headers || {}) },
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
        if (raw) {
          parsed = data;
        } else {
          try { parsed = JSON.parse(data); } catch { parsed = data; }
        }
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
// BLOCK 1 — Status Codes, JSON Responses, send/end
// =============================================================
// "Kumhar Ramu stamps every pot with the right status tag
//  and fills it with the correct contents."
//
// res.status() sets the code, res.json() sends JSON,
// res.send() auto-detects, res.end() sends nothing,
// res.sendStatus() does both in one call.
// (See nodejs-notes/06 for raw http.ServerResponse fundamentals)
// ─────────────────────────────────────────────────────────────

async function block1() {
  console.log('=== BLOCK 1: Status Codes, JSON, send/end ===\n');

  const app = express();

  // ── res.json() — the workhorse for APIs ────────────────────
  app.get('/api/item', (req, res) => {
    // WHY: res.json() sets Content-Type to application/json
    // and stringifies the object automatically.
    res.json({ name: 'Terracotta matka', price: 250 });
  });

  // ── res.status().json() — chained status + body ────────────
  app.get('/api/created', (req, res) => {
    // WHY: res.status() returns `res` for chaining.
    // It does NOT send the response — you still need .json()/.send().
    res.status(201).json({ message: 'Order created', id: 'ord-99' });
  });

  // ── res.sendStatus() — status + default body in one call ──
  app.delete('/api/item/:id', (req, res) => {
    // WHY: sendStatus() sets status AND sends the status text as body.
    // 204 = No Content — the body will be empty.
    res.sendStatus(204);
  });

  // ── res.send() — auto-detects content type ─────────────────
  app.get('/api/text', (req, res) => {
    // WHY: send() with a string sets Content-Type to text/html.
    // With an object it would behave like json().
    // With a Buffer it sets application/octet-stream.
    res.send('Shaped with care on the potter\'s wheel');
  });

  app.get('/api/buffer', (req, res) => {
    // WHY: Sending a Buffer sets Content-Type to application/octet-stream.
    res.send(Buffer.from('raw-bytes'));
  });

  // ── res.end() — send response with no body ────────────────
  app.head('/api/ping', (req, res) => {
    // WHY: HEAD requests should not have a body.
    // res.end() finalizes the response with no payload.
    res.status(200).end();
  });

  // ── res.status() alone doesn't send! ───────────────────────
  app.get('/api/teapot', (req, res) => {
    // WHY: Classic 418 I'm a Teapot — a real HTTP status code.
    res.status(418).json({ error: 'I\'m a teapot', brew: 'masala chai' });
  });

  const server = app.listen(0);
  const port = server.address().port;
  console.log(`  Potter workshop open on port ${port}\n`);

  // ── Test 1: res.json() ─────────────────────────────────────
  console.log('  --- Test 1: GET /api/item — res.json() ---');
  const r1 = await request(port, 'GET', '/api/item');
  console.log('  status:', r1.status);
  // Output: 200
  console.log('  body:  ', r1.body);
  // Output: { name: 'Terracotta matka', price: 250 }
  console.log('  type:  ', r1.headers['content-type']);
  // Output: application/json; charset=utf-8
  console.log();

  // ── Test 2: res.status(201).json() ─────────────────────────
  console.log('  --- Test 2: GET /api/created — status + json ---');
  const r2 = await request(port, 'GET', '/api/created');
  console.log('  status:', r2.status);
  // Output: 201
  console.log('  body:  ', r2.body);
  // Output: { message: 'Order created', id: 'ord-99' }
  console.log();

  // ── Test 3: res.sendStatus(204) ────────────────────────────
  console.log('  --- Test 3: DELETE /api/item/5 — sendStatus(204) ---');
  const r3 = await request(port, 'DELETE', '/api/item/5');
  console.log('  status:', r3.status);
  // Output: 204
  console.log('  body:  ', JSON.stringify(r3.body));
  // Output: ""
  console.log();

  // ── Test 4: res.send() with string ─────────────────────────
  console.log('  --- Test 4: GET /api/text — res.send(string) ---');
  const r4 = await request(port, 'GET', '/api/text');
  console.log('  status:', r4.status);
  // Output: 200
  console.log('  body:  ', r4.body);
  // Output: Shaped with care on the potter's wheel
  console.log('  type:  ', r4.headers['content-type']);
  // Output: text/html; charset=utf-8
  console.log();

  // ── Test 5: res.send() with Buffer ─────────────────────────
  console.log('  --- Test 5: GET /api/buffer — res.send(Buffer) ---');
  const r5 = await request(port, 'GET', '/api/buffer', { raw: true });
  console.log('  body:  ', r5.body);
  // Output: raw-bytes
  console.log('  type:  ', r5.headers['content-type']);
  // Output: application/octet-stream
  console.log();

  // ── Test 6: 418 I'm a Teapot ──────────────────────────────
  console.log('  --- Test 6: GET /api/teapot — status(418) ---');
  const r6 = await request(port, 'GET', '/api/teapot');
  console.log('  status:', r6.status);
  // Output: 418
  console.log('  body:  ', r6.body);
  // Output: { error: "I'm a teapot", brew: 'masala chai' }
  console.log();

  server.close();
}

// =============================================================
// BLOCK 2 — Headers, Redirect, Content Negotiation (res.format)
// =============================================================
// "Kumhar Ramu labels every pot with custom tags (headers),
//  redirects clients to the right kiln, and wraps goods
//  differently depending on what the customer asked for."
// ─────────────────────────────────────────────────────────────

async function block2() {
  console.log('=== BLOCK 2: Headers, Redirect, Content Negotiation ===\n');

  const app = express();

  // ── res.set() / res.get() / res.append() / res.type() ─────
  app.get('/api/headers-demo', (req, res) => {
    // WHY: res.set() sets a header. Can take an object for multiple.
    res.set('X-Workshop', 'Kumhar-Ramu-Pottery');
    res.set({
      'X-Material': 'terracotta',
      'X-Finish': 'glazed',
    });

    // WHY: res.append() ADDS to a header (doesn't replace).
    // Useful for Set-Cookie or custom multi-value headers.
    res.append('X-Finish', 'painted');

    // WHY: res.type() is shorthand for res.set('Content-Type', ...).
    // It resolves MIME types from extensions.
    res.type('json');

    // WHY: res.get() reads a header you've already set.
    const finish = res.get('X-Finish');

    res.json({
      xWorkshop: res.get('X-Workshop'),
      xMaterial: res.get('X-Material'),
      xFinish:   finish,
    });
  });

  // ── res.redirect() — 301, 302, 307 ────────────────────────
  app.get('/old-catalog', (req, res) => {
    // WHY: Default redirect is 302 (Found / temporary).
    res.redirect('/new-catalog');
  });

  app.get('/legacy', (req, res) => {
    // WHY: 301 = permanent redirect — browsers/search engines cache this.
    res.redirect(301, '/modern');
  });

  app.post('/api/v1/order', (req, res) => {
    // WHY: 307 preserves the HTTP method (POST stays POST).
    // 301/302 may convert POST to GET in some clients.
    res.redirect(307, '/api/v2/order');
  });

  app.get('/new-catalog', (req, res) => res.send('Welcome to the new pottery catalog'));
  app.get('/modern', (req, res) => res.send('Modern pottery workshop'));

  // ── res.location() / res.links() ──────────────────────────
  app.post('/api/orders', (req, res) => {
    // WHY: res.location() sets the Location header without redirecting.
    // Useful for 201 Created responses.
    res.location('/api/orders/42');

    // WHY: res.links() sets the Link header for pagination/HATEOAS.
    res.links({
      next: '/api/orders?page=2',
      last: '/api/orders?page=5',
    });

    res.status(201).json({ id: 42, status: 'created' });
  });

  // ── res.format() — server-driven content negotiation ──────
  app.get('/api/pot', (req, res) => {
    // WHY: res.format() picks the handler matching the Accept header.
    // If nothing matches, it sends 406 Not Acceptable.
    res.format({
      'application/json': () => {
        res.json({ title: 'Surahi', medium: 'terracotta' });
      },
      'text/html': () => {
        res.send('<h1>Surahi</h1><p>Medium: terracotta</p>');
      },
      'text/plain': () => {
        res.send('Surahi — terracotta');
      },
      default: () => {
        // WHY: The default handler runs if no Accept type matched.
        res.status(406).send('Not Acceptable');
      },
    });
  });

  // ── res.cookie() / res.clearCookie() — basic usage ────────
  app.get('/api/login', (req, res) => {
    // WHY: res.cookie() sets a Set-Cookie header.
    // Full cookie coverage belongs in a dedicated cookies file.
    res.cookie('session', 'abc123', { httpOnly: true, maxAge: 60000 });
    res.cookie('theme', 'dark');
    res.json({ message: 'Logged in' });
  });

  app.get('/api/logout', (req, res) => {
    // WHY: clearCookie() sends an expired cookie to delete it.
    res.clearCookie('session');
    res.json({ message: 'Logged out' });
  });

  const server = app.listen(0);
  const port = server.address().port;
  console.log(`  Packaging station on port ${port}\n`);

  // ── Test 1: Custom headers ─────────────────────────────────
  console.log('  --- Test 1: GET /api/headers-demo — custom headers ---');
  const r1 = await request(port, 'GET', '/api/headers-demo');
  console.log('  X-Workshop:', r1.headers['x-workshop']);
  // Output: Kumhar-Ramu-Pottery
  console.log('  X-Material:', r1.headers['x-material']);
  // Output: terracotta
  console.log('  X-Finish:  ', r1.headers['x-finish']);
  // Output: glazed, painted
  console.log('  body:      ', r1.body);
  // Output: { xWorkshop: 'Kumhar-Ramu-Pottery', xMaterial: 'terracotta', xFinish: ['glazed', 'painted'] }
  console.log();

  // ── Test 2: 302 redirect ──────────────────────────────────
  console.log('  --- Test 2: GET /old-catalog — 302 redirect ---');
  const r2 = await request(port, 'GET', '/old-catalog');
  console.log('  status:  ', r2.status);
  // Output: 302
  console.log('  location:', r2.headers['location']);
  // Output: /new-catalog
  console.log();

  // ── Test 3: 301 permanent redirect ─────────────────────────
  console.log('  --- Test 3: GET /legacy — 301 redirect ---');
  const r3 = await request(port, 'GET', '/legacy');
  console.log('  status:  ', r3.status);
  // Output: 301
  console.log('  location:', r3.headers['location']);
  // Output: /modern
  console.log();

  // ── Test 4: 307 method-preserving redirect ─────────────────
  console.log('  --- Test 4: POST /api/v1/order — 307 redirect ---');
  const r4 = await request(port, 'POST', '/api/v1/order');
  console.log('  status:  ', r4.status);
  // Output: 307
  console.log('  location:', r4.headers['location']);
  // Output: /api/v2/order
  console.log();

  // ── Test 5: res.location() + res.links() ───────────────────
  console.log('  --- Test 5: POST /api/orders — location + links ---');
  const r5 = await request(port, 'POST', '/api/orders');
  console.log('  status:  ', r5.status);
  // Output: 201
  console.log('  location:', r5.headers['location']);
  // Output: /api/orders/42
  console.log('  link:    ', r5.headers['link']);
  // Output: </api/orders?page=2>; rel="next", </api/orders?page=5>; rel="last"
  console.log();

  // ── Test 6: res.format() — JSON ───────────────────────────
  console.log('  --- Test 6: GET /api/pot — Accept: application/json ---');
  const r6 = await request(port, 'GET', '/api/pot', {
    headers: { 'Accept': 'application/json' },
  });
  console.log('  body:', r6.body);
  // Output: { title: 'Surahi', medium: 'terracotta' }
  console.log();

  // ── Test 7: res.format() — HTML ───────────────────────────
  console.log('  --- Test 7: GET /api/pot — Accept: text/html ---');
  const r7 = await request(port, 'GET', '/api/pot', {
    headers: { 'Accept': 'text/html' },
  });
  console.log('  body:', r7.body);
  // Output: <h1>Surahi</h1><p>Medium: terracotta</p>
  console.log();

  // ── Test 8: res.format() — text/plain ──────────────────────
  console.log('  --- Test 8: GET /api/pot — Accept: text/plain ---');
  const r8 = await request(port, 'GET', '/api/pot', {
    headers: { 'Accept': 'text/plain' },
  });
  console.log('  body:', r8.body);
  // Output: Surahi — terracotta
  console.log();

  // ── Test 9: res.cookie() ───────────────────────────────────
  console.log('  --- Test 9: GET /api/login — res.cookie() ---');
  const r9 = await request(port, 'GET', '/api/login');
  console.log('  set-cookie:', r9.headers['set-cookie']);
  // Output: [ 'session=abc123; ...HttpOnly', 'theme=dark; ...' ]
  console.log();

  // ── Test 10: res.clearCookie() ─────────────────────────────
  console.log('  --- Test 10: GET /api/logout — res.clearCookie() ---');
  const r10 = await request(port, 'GET', '/api/logout');
  console.log('  set-cookie:', r10.headers['set-cookie']);
  // Output: [ 'session=; Path=/; Expires=Thu, 01 Jan 1970 ...' ]
  console.log();

  server.close();
}

// =============================================================
// BLOCK 3 — sendFile, download with Temp Files, Cleanup
// =============================================================
// "Kumhar Ramu sometimes ships the actual pottery design file
//  — a blueprint or a glaze recipe — directly to the client,
//  either for viewing (sendFile) or downloading (download)."
// (See nodejs-notes/09 for fs and path fundamentals)
// ─────────────────────────────────────────────────────────────

async function block3() {
  console.log('=== BLOCK 3: sendFile, download, temp files ===\n');

  // ── Create temp directory and files ────────────────────────
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'express-workshop-'));
  const blueprintPath = path.join(tmpDir, 'blueprint.txt');
  const designPath = path.join(tmpDir, 'design.html');
  const dataPath = path.join(tmpDir, 'data.csv');

  fs.writeFileSync(blueprintPath, 'Surahi blueprint: height=30cm, diameter=15cm\n');
  fs.writeFileSync(designPath, '<html><body><h1>Surahi Design</h1></body></html>\n');
  fs.writeFileSync(dataPath, 'id,name,price\n1,Matka,250\n2,Kulhad,80\n3,Surahi,450\n');

  console.log(`  Temp dir: ${tmpDir}`);
  console.log(`  Created: blueprint.txt, design.html, data.csv\n`);

  const app = express();

  // ── res.sendFile() — send a file for viewing ──────────────
  app.get('/view/blueprint', (req, res) => {
    // WHY: sendFile() streams a file to the client with correct
    // Content-Type based on extension. Must use absolute path.
    // The callback handles errors (file not found, etc.).
    res.sendFile(blueprintPath, (err) => {
      if (err) {
        console.error('  sendFile error:', err.message);
      }
    });
  });

  app.get('/view/design', (req, res) => {
    // WHY: sendFile() auto-detects text/html for .html files.
    res.sendFile(designPath);
  });

  // ── res.download() — send a file as attachment ─────────────
  app.get('/download/data', (req, res) => {
    // WHY: download() sets Content-Disposition: attachment, which
    // prompts the browser to save the file instead of displaying it.
    // Second argument is the filename the client sees.
    res.download(dataPath, 'pottery-inventory.csv', (err) => {
      if (err) {
        console.error('  download error:', err.message);
      }
    });
  });

  app.get('/download/blueprint', (req, res) => {
    // WHY: Without a custom filename, download() uses the original.
    res.download(blueprintPath);
  });

  // ── res.sendFile() with options ────────────────────────────
  app.get('/view/cached', (req, res) => {
    // WHY: sendFile accepts options like maxAge, headers, dotfiles.
    res.sendFile(blueprintPath, {
      maxAge: '1h',
      headers: {
        'X-Custom': 'from-pottery-workshop',
      },
    });
  });

  const server = app.listen(0);
  const port = server.address().port;
  console.log(`  File delivery on port ${port}\n`);

  // ── Test 1: sendFile — text file ───────────────────────────
  console.log('  --- Test 1: GET /view/blueprint — sendFile (text) ---');
  const r1 = await request(port, 'GET', '/view/blueprint', { raw: true });
  console.log('  status:', r1.status);
  // Output: 200
  console.log('  type:  ', r1.headers['content-type']);
  // Output: text/plain; charset=UTF-8
  console.log('  body:  ', r1.body.trim());
  // Output: Surahi blueprint: height=30cm, diameter=15cm
  console.log();

  // ── Test 2: sendFile — HTML file ───────────────────────────
  console.log('  --- Test 2: GET /view/design — sendFile (html) ---');
  const r2 = await request(port, 'GET', '/view/design', { raw: true });
  console.log('  type:', r2.headers['content-type']);
  // Output: text/html; charset=UTF-8
  console.log('  body:', r2.body.trim());
  // Output: <html><body><h1>Surahi Design</h1></body></html>
  console.log();

  // ── Test 3: download — CSV with custom filename ────────────
  console.log('  --- Test 3: GET /download/data — download(csv) ---');
  const r3 = await request(port, 'GET', '/download/data', { raw: true });
  console.log('  status:     ', r3.status);
  // Output: 200
  console.log('  disposition:', r3.headers['content-disposition']);
  // Output: attachment; filename="pottery-inventory.csv"
  console.log('  body lines: ', r3.body.trim().split('\n').length);
  // Output: 4
  console.log();

  // ── Test 4: download — original filename ───────────────────
  console.log('  --- Test 4: GET /download/blueprint — download (original name) ---');
  const r4 = await request(port, 'GET', '/download/blueprint', { raw: true });
  console.log('  disposition:', r4.headers['content-disposition']);
  // Output: attachment; filename="blueprint.txt"
  console.log();

  // ── Test 5: sendFile with options (cache + custom header) ──
  console.log('  --- Test 5: GET /view/cached — sendFile with maxAge ---');
  const r5 = await request(port, 'GET', '/view/cached', { raw: true });
  console.log('  cache-control:', r5.headers['cache-control']);
  // Output: public, max-age=3600
  console.log('  x-custom:     ', r5.headers['x-custom']);
  // Output: from-pottery-workshop
  console.log();

  // ── Cleanup ────────────────────────────────────────────────
  server.close();

  fs.unlinkSync(blueprintPath);
  fs.unlinkSync(designPath);
  fs.unlinkSync(dataPath);
  fs.rmdirSync(tmpDir);
  console.log(`  Cleaned up temp dir: ${tmpDir}\n`);
}

// =============================================================
// RUN ALL BLOCKS
// =============================================================
async function main() {
  console.log('============================================================');
  console.log(' FILE 07 — The Response Object (Kumhar\'s Potter Workshop)');
  console.log('============================================================\n');

  await block1();
  await block2();
  await block3();

  // ─────────────────────────────────────────────────────────────
  // KEY TAKEAWAYS
  // ─────────────────────────────────────────────────────────────
  console.log('=== KEY TAKEAWAYS ===\n');
  console.log('  1. res.json() is the API workhorse — sets Content-Type and');
  console.log('     stringifies automatically.');
  console.log('  2. res.status() only SETS the code — you must still call');
  console.log('     .json()/.send()/.end() to actually send.');
  console.log('  3. res.sendStatus(code) sends status + status-text body.');
  console.log('  4. res.send() auto-detects: string->html, object->json, Buffer->octet.');
  console.log('  5. res.set()/res.append()/res.type() give full header control.');
  console.log('  6. res.redirect() defaults to 302; use 301 for permanent,');
  console.log('     307 to preserve the HTTP method.');
  console.log('  7. res.format() enables server-driven content negotiation');
  console.log('     based on the Accept header — returns 406 if nothing matches.');
  console.log('  8. res.sendFile() streams for viewing; res.download() sets');
  console.log('     Content-Disposition: attachment for saving.');
  console.log('  9. res.location() sets Location header without redirecting —');
  console.log('     perfect for 201 Created responses.');
  console.log(' 10. res.links() sets the Link header for pagination/HATEOAS.\n');

  console.log('Done. All servers closed, temp files cleaned up.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
