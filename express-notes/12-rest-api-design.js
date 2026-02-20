/** ============================================================
 *  FILE 12 — RESTful API Design Patterns
 *  Topic: CRUD, status codes, pagination, filtering, PATCH
 *  WHY THIS MATTERS: REST is the lingua franca of web APIs.
 *  Knowing the conventions — resource naming, correct status
 *  codes, envelope patterns, pagination — means your APIs are
 *  instantly understandable to any frontend developer, mobile
 *  engineer, or third-party consumer.
 *  ============================================================ */

// ── THE STORY ──────────────────────────────────────────────
// The Tehsildar's Office
// In the grand hall of the Tehsil Office, Tehsildar Sharma ji
// maintains the ledger of all registered citizens and land
// records. Every interaction follows strict procedure: when a
// citizen registers (POST), Sharma ji assigns an ID, stamps
// the date, and files the record. To look someone up (GET),
// he needs either the full roster or a specific ID. Updates
// (PUT) replace the entire record; corrections (PATCH) change
// only specific fields. Removals (DELETE) pull the card and
// mark it void. Every response includes a status seal (HTTP
// code) so the requester knows exactly what happened. Sharma
// ji also handles the flood of requests by paginating results
// — "here are records 1–10 of 847, come back for the next
// page."
// ───────────────────────────────────────────────────────────

const express = require('express');
const http = require('http');

// ============================================================
// BLOCK 1 — Full CRUD with In-Memory Store
// ============================================================
//
// RESTful conventions:
//   GET    /items      → list all       → 200
//   GET    /items/:id  → get one        → 200 / 404
//   POST   /items      → create         → 201
//   PUT    /items/:id  → full replace   → 200 / 404
//   DELETE /items/:id  → remove         → 204 / 404
//
// Response envelope pattern:
//   { success: true, data: ... }          — on success
//   { success: false, error: { ... } }    — on failure
//
// WHY: Consistent envelopes mean the client always knows
// where to find the payload and where to find errors.
// (See nodejs-notes/08 for HTTP method fundamentals)

// ── In-memory data store ───────────────────────────────────
let citizens = [];
let nextId = 1;

function resetStore() {
  citizens = [
    { id: 1, name: 'Aarti Verma', age: 34, status: 'active', occupation: 'teacher', registeredAt: '2025-01-15T10:00:00Z' },
    { id: 2, name: 'Bharat Chauhan', age: 28, status: 'active', occupation: 'farmer', registeredAt: '2025-02-20T14:30:00Z' },
    { id: 3, name: 'Chitra Deshpande', age: 45, status: 'inactive', occupation: 'shopkeeper', registeredAt: '2025-03-10T09:00:00Z' },
    { id: 4, name: 'Dinesh Faujdar', age: 22, status: 'active', occupation: 'clerk', registeredAt: '2025-04-05T11:15:00Z' },
    { id: 5, name: 'Ekta Malhotra', age: 31, status: 'inactive', occupation: 'doctor', registeredAt: '2025-05-12T16:45:00Z' },
    { id: 6, name: 'Farhan Gaur', age: 39, status: 'active', occupation: 'teacher', registeredAt: '2025-06-01T08:00:00Z' },
    { id: 7, name: 'Geeta Hooda', age: 27, status: 'active', occupation: 'farmer', registeredAt: '2025-07-18T13:20:00Z' },
    { id: 8, name: 'Harish Patel', age: 50, status: 'pending', occupation: 'shopkeeper', registeredAt: '2025-08-22T10:30:00Z' }
  ];
  nextId = 9;
}

// ── Envelope helpers ───────────────────────────────────────
// WHY: Wrapping every response in a consistent envelope means
// the client can always do `if (res.success)` without guessing.
function successResponse(data, meta = {}) {
  return { success: true, data, ...meta };
}

function errorResponse(message, details = null) {
  const err = { success: false, error: { message } };
  if (details) err.error.details = details;
  return err;
}

function buildApp() {
  const app = express();
  app.use(express.json());

  // ── GET /citizens — List all (Block 1) ────────────────────
  // In Block 2 we add pagination/filtering; here it's simple.
  app.get('/citizens', (req, res) => {
    // WHY: 200 OK is correct for a successful retrieval,
    // even if the array is empty (empty is not an error).
    res.status(200).json(successResponse(citizens));
  });

  // ============================================================
  // BLOCK 2 — Pagination, Filtering, Sorting
  // ============================================================
  //
  // When you have thousands of records, sending them all in one
  // response is wasteful. Pagination solves this:
  //   GET /citizens/search?page=1&limit=3
  //
  // Filtering narrows results:
  //   GET /citizens/search?status=active
  //
  // Sorting orders them:
  //   GET /citizens/search?sort=name&order=asc
  //
  // WHY: These three patterns are in virtually every production
  // API. Getting them right from the start saves painful rewrites.
  //
  // IMPORTANT: This route MUST be defined BEFORE /citizens/:id
  // because Express matches routes in order of registration.
  // If :id came first, "search" would be captured as an id param.

  app.get('/citizens/search', (req, res) => {
    let results = [...citizens];

    // ── Filtering ──────────────────────────────────────────
    // WHY: Filter BEFORE paginating so counts are accurate.
    const { status, occupation, minAge, maxAge } = req.query;

    if (status) {
      results = results.filter(c => c.status === status);
    }
    if (occupation) {
      results = results.filter(c => c.occupation === occupation);
    }
    if (minAge) {
      const min = parseInt(minAge, 10);
      if (!isNaN(min)) results = results.filter(c => c.age >= min);
    }
    if (maxAge) {
      const max = parseInt(maxAge, 10);
      if (!isNaN(max)) results = results.filter(c => c.age <= max);
    }

    // ── Sorting ────────────────────────────────────────────
    // WHY: Sort AFTER filtering but BEFORE paginating so the
    // client gets a consistent, ordered slice.
    const sortField = req.query.sort || 'id';
    const sortOrder = req.query.order === 'desc' ? -1 : 1;

    results.sort((a, b) => {
      if (a[sortField] < b[sortField]) return -1 * sortOrder;
      if (a[sortField] > b[sortField]) return 1 * sortOrder;
      return 0;
    });

    // ── Pagination ─────────────────────────────────────────
    // WHY: page/limit is the simplest pagination scheme.
    // For cursor-based pagination (better for real-time data),
    // see advanced patterns.
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const total = results.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paginatedResults = results.slice(start, start + limit);

    res.status(200).json({
      success: true,
      data: paginatedResults,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  });

  // ── GET /citizens/:id — Get one ──────────────────────────
  // NOTE: This MUST come AFTER /citizens/search so that the
  // literal path "search" isn't captured by the :id parameter.
  app.get('/citizens/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      // WHY: 400 Bad Request — the client sent a non-numeric ID.
      return res.status(400).json(errorResponse('ID must be a number'));
    }

    const citizen = citizens.find(c => c.id === id);
    if (!citizen) {
      // WHY: 404 Not Found — the resource doesn't exist.
      return res.status(404).json(errorResponse(`Citizen ${id} not found`));
    }

    res.status(200).json(successResponse(citizen));
  });

  // ── POST /citizens — Create ──────────────────────────────
  app.post('/citizens', (req, res) => {
    const { name, age, status, occupation } = req.body;

    // Basic validation (full validation in file 13)
    if (!name || !age) {
      // WHY: 422 Unprocessable Entity — the body was parseable
      // JSON but semantically invalid. Some APIs use 400 here;
      // 422 is more precise per RFC 4918.
      return res.status(422).json(errorResponse('name and age are required'));
    }

    // Check for duplicate name
    if (citizens.some(c => c.name === name)) {
      // WHY: 409 Conflict — the resource already exists.
      return res.status(409).json(errorResponse(`Citizen "${name}" already exists`));
    }

    const newCitizen = {
      id: nextId++,
      name,
      age,
      status: status || 'pending',
      occupation: occupation || 'unspecified',
      registeredAt: new Date().toISOString()
    };

    citizens.push(newCitizen);

    // WHY: 201 Created — a new resource was created.
    // Convention: return the created resource so the client
    // has the server-assigned ID and timestamps.
    res.status(201).json(successResponse(newCitizen));
  });

  // ── PUT /citizens/:id — Full replace ─────────────────────
  // WHY: PUT replaces the ENTIRE resource. The client must
  // send ALL fields. If a field is missing, it's gone.
  // This differs from PATCH (Block 3) which is partial.
  app.put('/citizens/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json(errorResponse('ID must be a number'));
    }

    const index = citizens.findIndex(c => c.id === id);
    if (index === -1) {
      return res.status(404).json(errorResponse(`Citizen ${id} not found`));
    }

    const { name, age, status, occupation } = req.body;
    if (!name || !age || !status || !occupation) {
      // WHY: For PUT, ALL fields are required because we're
      // replacing the entire record.
      return res.status(422).json(errorResponse(
        'PUT requires all fields: name, age, status, occupation'
      ));
    }

    citizens[index] = {
      id,
      name,
      age,
      status,
      occupation,
      registeredAt: citizens[index].registeredAt  // preserve original
    };

    res.status(200).json(successResponse(citizens[index]));
  });

  // ── DELETE /citizens/:id — Remove ────────────────────────
  app.delete('/citizens/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json(errorResponse('ID must be a number'));
    }

    const index = citizens.findIndex(c => c.id === id);
    if (index === -1) {
      return res.status(404).json(errorResponse(`Citizen ${id} not found`));
    }

    citizens.splice(index, 1);

    // WHY: 204 No Content — the deletion succeeded but there's
    // nothing to return. No response body.
    res.status(204).end();
  });

  // ============================================================
  // BLOCK 3 — PATCH Partial Updates, 409 Conflict, Idempotency
  // ============================================================
  //
  // PATCH vs PUT:
  //   PUT   — "Here is the COMPLETE new version of the resource."
  //   PATCH — "Here are the FIELDS I want to change."
  //
  // WHY: PATCH is what clients usually want. If a citizen has
  // 10 fields and you only need to update the status, PATCH
  // lets you send { status: "active" } instead of all 10 fields.
  //
  // Idempotency:
  //   GET    — idempotent (same request, same result)
  //   PUT    — idempotent (same full replacement, same result)
  //   DELETE — idempotent (deleting twice → 404 second time, but no side effect)
  //   POST   — NOT idempotent (each call creates a new resource)
  //   PATCH  — CAN be idempotent if you send absolute values
  //            NOT idempotent if you send relative changes (e.g., "increment by 1")
  //
  // WHY: Idempotency matters for retries. If a network blip
  // causes the client to resend a PUT, no harm done. If they
  // resend a POST, you might create a duplicate.

  app.patch('/citizens/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json(errorResponse('ID must be a number'));
    }

    const index = citizens.findIndex(c => c.id === id);
    if (index === -1) {
      return res.status(404).json(errorResponse(`Citizen ${id} not found`));
    }

    const allowedFields = ['name', 'age', 'status', 'occupation'];
    const updates = {};
    const unknownFields = [];

    for (const [key, value] of Object.entries(req.body)) {
      if (allowedFields.includes(key)) {
        updates[key] = value;
      } else if (key !== 'id' && key !== 'registeredAt') {
        // WHY: Silently ignoring unknown fields hides bugs.
        // Rejecting them forces the client to fix typos.
        unknownFields.push(key);
      }
    }

    if (unknownFields.length > 0) {
      return res.status(400).json(errorResponse(
        `Unknown fields: ${unknownFields.join(', ')}`,
        { allowedFields }
      ));
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json(errorResponse('No valid fields to update'));
    }

    // ── 409 Conflict — name uniqueness ─────────────────────
    if (updates.name) {
      const conflict = citizens.find(
        c => c.name === updates.name && c.id !== id
      );
      if (conflict) {
        // WHY: 409 means "your request conflicts with the
        // current state of the resource." The client should
        // resolve the conflict (pick a different name) and retry.
        return res.status(409).json(errorResponse(
          `Name "${updates.name}" is already taken by citizen ${conflict.id}`
        ));
      }
    }

    // Apply partial update
    // WHY: Object.assign merges only the provided fields,
    // leaving untouched fields intact. This is PATCH semantics.
    Object.assign(citizens[index], updates);

    res.status(200).json(successResponse(citizens[index]));
  });

  return app;
}

// ============================================================
// SELF-TEST — Comprehensive API tests
// ============================================================
async function runTests() {
  resetStore();
  const app = buildApp();

  const server = app.listen(0, async () => {
    const port = server.address().port;
    const base = `http://localhost:${port}`;
    console.log(`[12-rest-api-design] Server on port ${port}\n`);

    try {
      // ── Block 1: CRUD Tests ────────────────────────────────

      console.log('=== Block 1 — Full CRUD Operations ===\n');

      // GET all citizens
      const r1 = await fetch(`${base}/citizens`);
      const j1 = await r1.json();
      console.log('GET /citizens');
      console.log('Status:', r1.status);
      // Output: Status: 200
      console.log('Count:', j1.data.length);
      // Output: Count: 8
      console.log('Envelope has success:', j1.success);
      // Output: Envelope has success: true
      console.log('');

      // GET single citizen
      const r2 = await fetch(`${base}/citizens/1`);
      const j2 = await r2.json();
      console.log('GET /citizens/1');
      console.log('Status:', r2.status);
      // Output: Status: 200
      console.log('Name:', j2.data.name);
      // Output: Name: Aarti Verma
      console.log('');

      // GET non-existent citizen → 404
      const r3 = await fetch(`${base}/citizens/999`);
      const j3 = await r3.json();
      console.log('GET /citizens/999');
      console.log('Status:', r3.status);
      // Output: Status: 404
      console.log('Error:', j3.error.message);
      // Output: Error: Citizen 999 not found
      console.log('');

      // POST — create new citizen → 201
      const r4 = await fetch(`${base}/citizens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Isha Qureshi', age: 29, status: 'active', occupation: 'engineer' })
      });
      const j4 = await r4.json();
      console.log('POST /citizens (new)');
      console.log('Status:', r4.status);
      // Output: Status: 201
      console.log('Created ID:', j4.data.id);
      // Output: Created ID: 9
      console.log('Name:', j4.data.name);
      // Output: Name: Isha Qureshi
      console.log('');

      // POST — duplicate name → 409
      const r5 = await fetch(`${base}/citizens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Isha Qureshi', age: 30 })
      });
      const j5 = await r5.json();
      console.log('POST /citizens (duplicate)');
      console.log('Status:', r5.status);
      // Output: Status: 409
      console.log('Error:', j5.error.message);
      // Output: Error: Citizen "Isha Qureshi" already exists
      console.log('');

      // POST — missing required fields → 422
      const r6 = await fetch(`${base}/citizens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'No Age Given' })
      });
      const j6 = await r6.json();
      console.log('POST /citizens (missing age)');
      console.log('Status:', r6.status);
      // Output: Status: 422
      console.log('');

      // PUT — full replacement → 200
      const r7 = await fetch(`${base}/citizens/2`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Bharat Chauhan Jr.',
          age: 29,
          status: 'active',
          occupation: 'senior farmer'
        })
      });
      const j7 = await r7.json();
      console.log('PUT /citizens/2');
      console.log('Status:', r7.status);
      // Output: Status: 200
      console.log('Updated name:', j7.data.name);
      // Output: Updated name: Bharat Chauhan Jr.
      console.log('Updated occupation:', j7.data.occupation);
      // Output: Updated occupation: senior farmer
      console.log('');

      // PUT — missing fields → 422
      const r8 = await fetch(`${base}/citizens/2`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Incomplete' })
      });
      const j8 = await r8.json();
      console.log('PUT /citizens/2 (incomplete)');
      console.log('Status:', r8.status);
      // Output: Status: 422
      console.log('Error:', j8.error.message);
      // Output: Error: PUT requires all fields: name, age, status, occupation
      console.log('');

      // DELETE → 204
      const r9 = await fetch(`${base}/citizens/3`, { method: 'DELETE' });
      console.log('DELETE /citizens/3');
      console.log('Status:', r9.status);
      // Output: Status: 204
      console.log('');

      // DELETE again → 404 (idempotent in effect but 404 on second call)
      const r10 = await fetch(`${base}/citizens/3`, { method: 'DELETE' });
      console.log('DELETE /citizens/3 (again)');
      console.log('Status:', r10.status);
      // Output: Status: 404
      console.log('');

      // ── Block 2: Pagination, Filtering, Sorting ────────────

      console.log('=== Block 2 — Pagination, Filtering, Sorting ===\n');

      // Pagination: page 1, limit 3
      const r11 = await fetch(`${base}/citizens/search?page=1&limit=3`);
      const j11 = await r11.json();
      console.log('GET /citizens/search?page=1&limit=3');
      console.log('Status:', r11.status);
      // Output: Status: 200
      console.log('Page items:', j11.data.length);
      // Output: Page items: 3
      console.log('Pagination:', JSON.stringify(j11.pagination));
      // Output: Pagination: {"page":1,"limit":3,"total":8,"totalPages":3,"hasNext":true,"hasPrev":false}
      console.log('');

      // Pagination: page 3 (last page, partial)
      const r12 = await fetch(`${base}/citizens/search?page=3&limit=3`);
      const j12 = await r12.json();
      console.log('GET /citizens/search?page=3&limit=3');
      console.log('Page items:', j12.data.length);
      // Output: Page items: 2
      console.log('Has next:', j12.pagination.hasNext);
      // Output: Has next: false
      console.log('Has prev:', j12.pagination.hasPrev);
      // Output: Has prev: true
      console.log('');

      // Filtering: status=active
      const r13 = await fetch(`${base}/citizens/search?status=active`);
      const j13 = await r13.json();
      console.log('GET /citizens/search?status=active');
      console.log('Active count:', j13.data.length);
      // Output: Active count: 6
      console.log('All active:', j13.data.every(c => c.status === 'active'));
      // Output: All active: true
      console.log('');

      // Filtering: occupation=teacher
      const r14 = await fetch(`${base}/citizens/search?occupation=teacher`);
      const j14 = await r14.json();
      console.log('GET /citizens/search?occupation=teacher');
      console.log('Teachers:', j14.data.map(c => c.name).join(', '));
      // Output: Teachers: Aarti Verma, Farhan Gaur
      console.log('');

      // Sorting: by name ascending
      const r15 = await fetch(`${base}/citizens/search?sort=name&order=asc&limit=4`);
      const j15 = await r15.json();
      console.log('GET /citizens/search?sort=name&order=asc&limit=4');
      console.log('Names:', j15.data.map(c => c.name).join(', '));
      // Output: Names: Aarti Verma, Bharat Chauhan Jr., Dinesh Faujdar, Ekta Malhotra
      console.log('');

      // Sorting: by age descending
      const r16 = await fetch(`${base}/citizens/search?sort=age&order=desc&limit=3`);
      const j16 = await r16.json();
      console.log('GET /citizens/search?sort=age&order=desc&limit=3');
      console.log('Ages:', j16.data.map(c => `${c.name}(${c.age})`).join(', '));
      // Output: Ages: Harish Patel(50), Farhan Gaur(39), Aarti Verma(34)
      console.log('');

      // Combined: filter + sort + paginate
      const r17 = await fetch(`${base}/citizens/search?status=active&sort=age&order=asc&page=1&limit=2`);
      const j17 = await r17.json();
      console.log('GET /citizens/search?status=active&sort=age&order=asc&page=1&limit=2');
      console.log('Results:', j17.data.map(c => `${c.name}(${c.age})`).join(', '));
      // Output: Results: Dinesh Faujdar(22), Geeta Hooda(27)
      console.log('Total active:', j17.pagination.total);
      // Output: Total active: 6
      console.log('');

      // ── Block 3: PATCH, Conflict, Idempotency ─────────────

      console.log('=== Block 3 — PATCH, Conflict, Idempotency ===\n');

      // PATCH — partial update (only status)
      const r18 = await fetch(`${base}/citizens/4`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'inactive' })
      });
      const j18 = await r18.json();
      console.log('PATCH /citizens/4 { status: "inactive" }');
      console.log('Status:', r18.status);
      // Output: Status: 200
      console.log('Name unchanged:', j18.data.name);
      // Output: Name unchanged: Dinesh Faujdar
      console.log('Status updated:', j18.data.status);
      // Output: Status updated: inactive
      console.log('Occupation unchanged:', j18.data.occupation);
      // Output: Occupation unchanged: clerk
      console.log('');

      // PATCH — name conflict → 409
      const r19 = await fetch(`${base}/citizens/4`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Aarti Verma' })
      });
      const j19 = await r19.json();
      console.log('PATCH /citizens/4 { name: "Aarti Verma" } (conflict)');
      console.log('Status:', r19.status);
      // Output: Status: 409
      console.log('Error:', j19.error.message);
      // Output: Error: Name "Aarti Verma" is already taken by citizen 1
      console.log('');

      // PATCH — unknown fields → 400
      const r20 = await fetch(`${base}/citizens/4`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favouriteColor: 'blue' })
      });
      const j20 = await r20.json();
      console.log('PATCH /citizens/4 { favouriteColor: "blue" } (unknown field)');
      console.log('Status:', r20.status);
      // Output: Status: 400
      console.log('Error:', j20.error.message);
      // Output: Error: Unknown fields: favouriteColor
      console.log('');

      // PATCH — idempotent demonstration
      // WHY: Sending the same PATCH twice produces the same result,
      // proving this style of PATCH (absolute values) is idempotent.
      const patchBody = JSON.stringify({ age: 99 });
      const r21a = await fetch(`${base}/citizens/1`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: patchBody
      });
      const j21a = await r21a.json();
      const r21b = await fetch(`${base}/citizens/1`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: patchBody
      });
      const j21b = await r21b.json();
      console.log('PATCH /citizens/1 { age: 99 } — sent TWICE');
      console.log('First result age:', j21a.data.age);
      // Output: First result age: 99
      console.log('Second result age:', j21b.data.age);
      // Output: Second result age: 99
      console.log('Idempotent:', j21a.data.age === j21b.data.age);
      // Output: Idempotent: true

    } catch (err) {
      console.error('Test error:', err.message);
    } finally {
      server.close(() => {
        console.log('\n── Server closed ──');

        // ── KEY TAKEAWAYS ─────────────────────────────────────
        // 1. RESTful URLs are nouns (citizens), not verbs
        //    (getCitizens). The HTTP method IS the verb.
        //
        // 2. Status codes tell the client what happened without
        //    parsing the body: 200 OK, 201 Created, 204 No Content,
        //    400 Bad Request, 404 Not Found, 409 Conflict, 422 Invalid.
        //
        // 3. PUT replaces the entire resource (all fields required).
        //    PATCH updates only the fields you send.
        //
        // 4. A response envelope { success, data, error } provides
        //    a consistent structure the client can always rely on.
        //
        // 5. Filter BEFORE paginating, sort AFTER filtering but
        //    BEFORE slicing. Order: filter → sort → paginate.
        //
        // 6. Idempotency: GET, PUT, DELETE are naturally idempotent.
        //    POST is not. PATCH can be if using absolute values.
        //    This matters for safe retries over unreliable networks.
        //
        // 7. 409 Conflict is perfect for uniqueness violations —
        //    it tells the client "the data is valid but conflicts
        //    with existing state."
      });
    }
  });
}

runTests();
