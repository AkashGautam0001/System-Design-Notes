/** ============================================================
 *  FILE 2: Routing Basics — HTTP Methods, Paths, and Chaining
 *  WHY THIS MATTERS: Routing is the nervous system of every
 *  Express app.  Each route maps an HTTP method + URL path to
 *  handler code.  Master routing and you control the entire
 *  request flow.
 *  ============================================================ */

// ─── BEST Bus Driver Raju ─────────────────────────────────────
//
// Driver Raju runs every BEST bus route in Mumbai.  Each route
// has a NUMBER (the URL path) and a DIRECTION (the HTTP method).
// Route Dadar-Andheri Northbound is different from Dadar-Andheri
// Southbound — just like GET /users is different from POST /users.
//
// Some buses run on ALL directions (app.all), some share the
// same stop with different services (app.route), and some
// match flexible patterns so new streets don't need new routes.
//
// Let's drive through every routing feature Express offers.
//
// (See nodejs-notes/08 for raw HTTP routing fundamentals)

const express = require('express');
const http = require('http');

// ════════════════════════════════════════════════════════════════
// BLOCK 1 — All HTTP Methods with Test Requests
// ════════════════════════════════════════════════════════════════

// ─── HTTP method overview ─────────────────────────────────────
//
//  app.get(path, handler)    — Read / retrieve
//  app.post(path, handler)   — Create
//  app.put(path, handler)    — Replace entirely
//  app.patch(path, handler)  — Partial update
//  app.delete(path, handler) — Remove
//  app.all(path, handler)    — ANY method
//  app.use(path?, handler)   — Middleware mount (any method, prefix match)

function block1_httpMethods() {
  return new Promise((resolve) => {
    const app = express();
    app.use(express.json());

    // In-memory store for Driver Raju's BEST bus routes
    const routes = {
      1: { id: 1, name: 'Dadar-Andheri Express', direction: 'North' },
      2: { id: 2, name: 'Bandra-Kurla Shuttle', direction: 'East' },
    };
    let nextId = 3;

    // ─── GET — list all bus routes ────────────────────────────
    app.get('/routes', (req, res) => {
      // WHY: GET is for retrieval — it should never modify data.
      res.json(Object.values(routes));
    });

    // ─── GET — single route by id ─────────────────────────────
    app.get('/routes/:id', (req, res) => {
      const route = routes[req.params.id];
      if (!route) return res.status(404).json({ error: 'Route not found' });
      res.json(route);
    });

    // ─── POST — create a new bus route ────────────────────────
    app.post('/routes', (req, res) => {
      // WHY: POST creates a new resource.  The server assigns the id.
      const newRoute = { id: nextId++, ...req.body };
      routes[newRoute.id] = newRoute;
      res.status(201).json(newRoute);
    });

    // ─── PUT — replace a bus route entirely ───────────────────
    app.put('/routes/:id', (req, res) => {
      // WHY: PUT replaces the ENTIRE resource.  If fields are
      // missing from the body, they should be removed/reset.
      const id = req.params.id;
      if (!routes[id]) return res.status(404).json({ error: 'Not found' });
      routes[id] = { id: Number(id), ...req.body };
      res.json(routes[id]);
    });

    // ─── PATCH — partially update a bus route ─────────────────
    app.patch('/routes/:id', (req, res) => {
      // WHY: PATCH updates only the fields provided — the rest
      // stay unchanged.  Use PATCH for small tweaks.
      const id = req.params.id;
      if (!routes[id]) return res.status(404).json({ error: 'Not found' });
      Object.assign(routes[id], req.body);
      res.json(routes[id]);
    });

    // ─── DELETE — remove a bus route ──────────────────────────
    app.delete('/routes/:id', (req, res) => {
      // WHY: DELETE removes the resource.  204 No Content is the
      // conventional success status when there's no body to return.
      const id = req.params.id;
      if (!routes[id]) return res.status(404).json({ error: 'Not found' });
      delete routes[id];
      res.status(204).end();
    });

    const server = app.listen(0, async () => {
      const port = server.address().port;
      const base = `http://127.0.0.1:${port}`;
      console.log('=== BLOCK 1: All HTTP Methods ===');
      console.log(`Server running on port ${port}\n`);

      try {
        // ─── Test GET /routes ─────────────────────────────────
        const listRes = await fetch(`${base}/routes`);
        const listData = await listRes.json();
        console.log('GET /routes:', JSON.stringify(listData));
        // Output: GET /routes: [{"id":1,"name":"Dadar-Andheri Express","direction":"North"},{"id":2,"name":"Bandra-Kurla Shuttle","direction":"East"}]

        // ─── Test POST /routes ────────────────────────────────
        const createRes = await fetch(`${base}/routes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Colaba-Worli Loop', direction: 'South' }),
        });
        const created = await createRes.json();
        console.log('POST /routes:', createRes.status, JSON.stringify(created));
        // Output: POST /routes: 201 {"id":3,"name":"Colaba-Worli Loop","direction":"South"}

        // ─── Test PUT /routes/1 ───────────────────────────────
        const putRes = await fetch(`${base}/routes/1`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Dadar-Andheri Local', direction: 'South' }),
        });
        const putData = await putRes.json();
        console.log('PUT /routes/1:', JSON.stringify(putData));
        // Output: PUT /routes/1: {"id":1,"name":"Dadar-Andheri Local","direction":"South"}

        // ─── Test PATCH /routes/2 ─────────────────────────────
        const patchRes = await fetch(`${base}/routes/2`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ direction: 'West' }),
        });
        const patchData = await patchRes.json();
        console.log('PATCH /routes/2:', JSON.stringify(patchData));
        // Output: PATCH /routes/2: {"id":2,"name":"Bandra-Kurla Shuttle","direction":"West"}

        // ─── Test DELETE /routes/3 ────────────────────────────
        const delRes = await fetch(`${base}/routes/3`, { method: 'DELETE' });
        console.log('DELETE /routes/3 status:', delRes.status);
        // Output: DELETE /routes/3 status: 204

        // ─── Verify deletion ──────────────────────────────────
        const afterDel = await fetch(`${base}/routes`);
        const afterData = await afterDel.json();
        console.log('GET /routes after delete:', JSON.stringify(afterData));
        // Output: GET /routes after delete: [{"id":1,"name":"Dadar-Andheri Local","direction":"South"},{"id":2,"name":"Bandra-Kurla Shuttle","direction":"West"}]
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
// BLOCK 2 — Route Patterns, app.route(), app.all()
// ════════════════════════════════════════════════════════════════

// ─── Express 5 path syntax changes ───────────────────────────
//
// Express 5 uses a stricter path-to-regexp library.  Key changes:
//
//  1. NO optional parameter suffix `?` in path strings.
//     Express 4:  '/users/:id?'          (id is optional)
//     Express 5:  Use TWO separate routes:
//                 app.get('/users', ...)
//                 app.get('/users/:id', ...)
//     Or use a regex: app.get(/^\/users(?:\/(\d+))?$/, ...)
//
//  2. NO regex inside route strings like '/user/:id(\\d+)'.
//     Express 5:  Use separate validation in the handler,
//                 or use a full regex as the path.
//
//  3. Wildcard: use `*name` instead of just `*`.
//     Express 4:  app.get('/files/*', ...)
//     Express 5:  app.get('/files/*filepath', ...)
//
//  WHY: The stricter syntax removes ambiguity and makes routes
//       easier to debug and reason about.

function block2_routePatterns() {
  return new Promise((resolve) => {
    const app = express();

    // ─── Exact path matching ──────────────────────────────────
    app.get('/stops/dadar', (req, res) => {
      // WHY: Most routes are exact — they match one specific path.
      res.json({ stop: 'Dadar Bus Depot', type: 'exact' });
    });

    // ─── Express 5 wildcard with named splat ──────────────────
    app.get('/files/*filepath', (req, res) => {
      // WHY: In Express 5, wildcards MUST be named.  The matched
      // portions land in req.params.filepath as an array of
      // path segments (e.g. ['docs', 'readme.txt']).
      const filepath = req.params.filepath;
      res.json({ filepath, type: 'wildcard' });
    });

    // ─── Express 5 — separate routes instead of optional param ─
    // Instead of '/stops/:id?' (Express 4), we define TWO routes:
    app.get('/stops', (req, res) => {
      // WHY: Express 5 removed the `?` optional syntax.  Two
      // explicit routes are clearer anyway.
      res.json({ stops: ['Dadar', 'Andheri', 'Bandra'], type: 'list' });
    });

    app.get('/stops/:id', (req, res) => {
      res.json({ stop: req.params.id, type: 'single' });
    });

    // ─── Regex route — Express 5 supports full RegExp objects ─
    app.get(/^\/bus-(\d+)$/, (req, res) => {
      // WHY: When you need complex matching (like "digits only"),
      // use a RegExp.  Capture groups become req.params[0], etc.
      res.json({ busNumber: req.params[0], type: 'regex' });
    });

    // ─── app.route() — chaining methods on one path ───────────
    //
    // Driver Raju's schedule board: same stop, different operations.
    app.route('/schedule')
      .get((req, res) => {
        // WHY: app.route() avoids repeating the path string.
        // Chain .get(), .post(), .put(), .delete() for a clean API.
        res.json({ action: 'list schedules', method: 'GET' });
      })
      .post((req, res) => {
        res.json({ action: 'create schedule', method: 'POST' });
      })
      .put((req, res) => {
        res.json({ action: 'replace schedule', method: 'PUT' });
      })
      .delete((req, res) => {
        res.json({ action: 'delete schedule', method: 'DELETE' });
      });

    // ─── app.all() — matches ANY HTTP method ──────────────────
    app.all('/any-method', (req, res) => {
      // WHY: app.all() is useful for logging, pre-checks, or
      // catch-all endpoints that behave the same for every method.
      res.json({ method: req.method, message: 'app.all matched!' });
    });

    // ─── app.use() — prefix matching (not exact) ─────────────
    app.use('/api', (req, res) => {
      // WHY: app.use('/api', ...) matches /api, /api/foo, /api/foo/bar...
      // It's a PREFIX match, unlike app.get() which is EXACT.
      // This is how middleware and sub-apps mount to path prefixes.
      res.json({ originalUrl: req.originalUrl, path: req.path, type: 'use-prefix' });
    });

    const server = app.listen(0, async () => {
      const port = server.address().port;
      const base = `http://127.0.0.1:${port}`;
      console.log('=== BLOCK 2: Route Patterns, app.route(), app.all() ===');
      console.log(`Server running on port ${port}\n`);

      try {
        // ─── Test exact match ─────────────────────────────────
        const exactRes = await fetch(`${base}/stops/dadar`);
        const exactData = await exactRes.json();
        console.log('GET /stops/dadar:', JSON.stringify(exactData));
        // Output: GET /stops/dadar: {"stop":"Dadar Bus Depot","type":"exact"}

        // ─── Test wildcard ────────────────────────────────────
        const wildRes = await fetch(`${base}/files/docs/readme.txt`);
        const wildData = await wildRes.json();
        console.log('GET /files/docs/readme.txt:', JSON.stringify(wildData));
        // Output: GET /files/docs/readme.txt: {"filepath":["docs","readme.txt"],"type":"wildcard"}

        // ─── Test separate routes (no optional param) ─────────
        const listRes = await fetch(`${base}/stops`);
        const listData = await listRes.json();
        console.log('GET /stops:', JSON.stringify(listData));
        // Output: GET /stops: {"stops":["Dadar","Andheri","Bandra"],"type":"list"}

        const singleRes = await fetch(`${base}/stops/andheri`);
        const singleData = await singleRes.json();
        console.log('GET /stops/andheri:', JSON.stringify(singleData));
        // Output: GET /stops/andheri: {"stop":"andheri","type":"single"}

        // ─── Test regex route ─────────────────────────────────
        const regexRes = await fetch(`${base}/bus-42`);
        const regexData = await regexRes.json();
        console.log('GET /bus-42:', JSON.stringify(regexData));
        // Output: GET /bus-42: {"busNumber":"42","type":"regex"}

        // ─── Test app.route() — GET ───────────────────────────
        const schedGetRes = await fetch(`${base}/schedule`);
        const schedGetData = await schedGetRes.json();
        console.log('GET /schedule:', JSON.stringify(schedGetData));
        // Output: GET /schedule: {"action":"list schedules","method":"GET"}

        // ─── Test app.route() — POST ──────────────────────────
        const schedPostRes = await fetch(`${base}/schedule`, { method: 'POST' });
        const schedPostData = await schedPostRes.json();
        console.log('POST /schedule:', JSON.stringify(schedPostData));
        // Output: POST /schedule: {"action":"create schedule","method":"POST"}

        // ─── Test app.route() — DELETE ────────────────────────
        const schedDelRes = await fetch(`${base}/schedule`, { method: 'DELETE' });
        const schedDelData = await schedDelRes.json();
        console.log('DELETE /schedule:', JSON.stringify(schedDelData));
        // Output: DELETE /schedule: {"action":"delete schedule","method":"DELETE"}

        // ─── Test app.all() with different methods ────────────
        const allGet = await fetch(`${base}/any-method`);
        const allGetData = await allGet.json();
        console.log('GET /any-method:', JSON.stringify(allGetData));
        // Output: GET /any-method: {"method":"GET","message":"app.all matched!"}

        const allPatch = await fetch(`${base}/any-method`, { method: 'PATCH' });
        const allPatchData = await allPatch.json();
        console.log('PATCH /any-method:', JSON.stringify(allPatchData));
        // Output: PATCH /any-method: {"method":"PATCH","message":"app.all matched!"}

        // ─── Test app.use() prefix matching ───────────────────
        const useRes = await fetch(`${base}/api/users/123`);
        const useData = await useRes.json();
        console.log('GET /api/users/123:', JSON.stringify(useData));
        // Output: GET /api/users/123: {"originalUrl":"/api/users/123","path":"/users/123","type":"use-prefix"}
      } catch (err) {
        console.error('Test error:', err.message);
      }

      server.close(() => {
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
  await block1_httpMethods();
  await block2_routePatterns();

  console.log('\n=== KEY TAKEAWAYS ===');
  console.log('1. Each HTTP method has a matching app.METHOD() — use the right one for the operation.');
  console.log('2. GET = read, POST = create, PUT = replace, PATCH = update, DELETE = remove.');
  console.log('3. app.route(\'/path\') lets you chain .get().post().put().delete() on one path.');
  console.log('4. app.all() matches ANY method — good for logging or catch-all handlers.');
  console.log('5. app.use() does PREFIX matching; app.get() and friends do EXACT matching.');
  console.log('6. Express 5: no optional `?` in paths — use two routes or regex instead.');
  console.log('7. Express 5: wildcards must be named — `/files/*filepath` not `/files/*`.');
  console.log('8. Express 5: no inline regex in path strings — use full RegExp objects.');

  process.exit(0);
}

main();
