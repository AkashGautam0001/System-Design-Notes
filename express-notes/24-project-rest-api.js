/** ============================================================
 *  FILE 24: PustakBhandar API — Full CRUD REST API Project
 *  WHY THIS MATTERS: A real-world REST API combines routing,
 *  middleware, validation, pagination, filtering, sorting, and
 *  error handling into one cohesive system.  This capstone
 *  project ties together everything from Files 1-23 into a
 *  single, production-style in-memory Book API.
 *  ============================================================ */

// ─── The Sahitya Akademi Digital Catalog ──────────────────────
//
// Sharma ji ran the Sahitya Akademi's small community library.
// At first he kept his catalog in a plain register — search
// meant flipping pages, pagination meant "turn the page," and
// validation meant "trust the volunteers."
//
// When the library went digital, Sharma ji discovered that a
// well-designed REST API gives you ALL of those features for
// free: predictable URLs, query-string filters, middleware
// guardrails, and structured error responses.
//
// This file builds Sharma ji's PustakBhandar API from scratch —
// every layer visible, every decision explained.

const express = require('express');
const http = require('http');
const crypto = require('crypto');

// ════════════════════════════════════════════════════════════════
// SECTION 1 — Custom AppError Class
// ════════════════════════════════════════════════════════════════

// ─── Why a custom error class? ────────────────────────────────
// WHY: Standard Error objects lack HTTP status codes.  By
// extending Error, our error-handling middleware can read
// err.statusCode and send the right HTTP response automatically.

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;  // WHY: distinguish expected errors from bugs
  }
}

// ════════════════════════════════════════════════════════════════
// SECTION 2 — In-Memory Book Store + Seed Data
// ════════════════════════════════════════════════════════════════

// ─── Our "database" — a simple array with UUIDs ──────────────
// WHY: In-memory storage lets us focus on the API layer without
// database setup.  The patterns (CRUD, pagination, filtering)
// transfer directly to MongoDB or PostgreSQL later.

const books = [];

function seedBooks() {
  const seedData = [
    { title: 'Godan', author: 'Munshi Premchand', genre: 'upanyas', year: 1936, pages: 312 },
    { title: 'Gitanjali', author: 'Rabindranath Tagore', genre: 'kavita', year: 1910, pages: 103 },
    { title: 'Malgudi Days', author: 'R.K. Narayan', genre: 'katha', year: 1943, pages: 256 },
    { title: 'Train to Pakistan', author: 'Khushwant Singh', genre: 'sahitya', year: 1956, pages: 181 },
    { title: 'Tamas', author: 'Bhisham Sahni', genre: 'sahitya', year: 1974, pages: 328 },
    { title: 'The Guide', author: 'R.K. Narayan', genre: 'upanyas', year: 1958, pages: 220 },
    { title: 'Pinjar', author: 'Amrita Pritam', genre: 'upanyas', year: 1950, pages: 190 },
    { title: 'Godaan', author: 'Munshi Premchand', genre: 'upanyas', year: 1936, pages: 310 },
    { title: 'A Suitable Boy', author: 'Vikram Seth', genre: 'upanyas', year: 1993, pages: 1349 },
    { title: 'The White Tiger', author: 'Aravind Adiga', genre: 'sahitya', year: 2008, pages: 321 },
  ];

  books.length = 0;
  seedData.forEach(book => {
    books.push({
      id: crypto.randomUUID(),
      ...book,
      createdAt: new Date().toISOString(),
    });
  });
}

// ════════════════════════════════════════════════════════════════
// SECTION 3 — Middleware Functions
// ════════════════════════════════════════════════════════════════

// ─── Request Logger Middleware ─────────────────────────────────
// WHY: Logging every request helps us debug and monitor our API.
// We capture method, URL, and response time — the three essentials.

function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const log = `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} → ${res.statusCode} (${duration}ms)`;
    req.app.locals.logs = req.app.locals.logs || [];
    req.app.locals.logs.push(log);
  });
  next();
}

// ─── Validation Middleware Factory ────────────────────────────
// WHY: Validation logic should be separate from route handlers.
// A factory function lets us create reusable validators.

function validateBook(req, res, next) {
  const { title, year } = req.body;

  // WHY: title is the minimum required field for a book
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return next(new AppError('Title is required and must be a non-empty string', 400));
  }

  // WHY: year must be a reasonable number if provided
  if (year !== undefined) {
    const numYear = Number(year);
    if (isNaN(numYear) || numYear < -3000 || numYear > new Date().getFullYear() + 1) {
      return next(new AppError('Year must be a valid number between -3000 and next year', 400));
    }
    req.body.year = numYear;  // WHY: coerce to number for consistency
  }

  next();
}

// ─── Validate that :id param resolves to an existing book ────
function validateBookId(req, res, next) {
  const book = books.find(b => b.id === req.params.id);
  if (!book) {
    return next(new AppError(`Book with id '${req.params.id}' not found`, 404));
  }
  req.book = book;  // WHY: attach to request so handlers don't re-query
  next();
}

// ════════════════════════════════════════════════════════════════
// SECTION 4 — Response Envelope Helper
// ════════════════════════════════════════════════════════════════

// ─── Consistent JSON envelope ─────────────────────────────────
// WHY: A standard response shape { success, data, pagination }
// makes the API predictable for all consumers.

function envelope(res, data, statusCode = 200, pagination = null) {
  const response = { success: true, data };
  if (pagination) response.pagination = pagination;
  return res.status(statusCode).json(response);
}

// ════════════════════════════════════════════════════════════════
// SECTION 5 — Book Router (CRUD + Pagination + Filter + Sort)
// ════════════════════════════════════════════════════════════════

// ─── Why Express.Router? ──────────────────────────────────────
// WHY: Router creates a mini-application for a resource.  It
// keeps route definitions modular and mountable at any prefix.

function createBookRouter() {
  const router = express.Router();

  // ─── GET /api/books — List with pagination, filter, sort ──
  router.get('/', (req, res) => {
    let result = [...books];

    // ── Filtering by author ────────────────────────────────
    // WHY: case-insensitive partial match is more user-friendly
    if (req.query.author) {
      const authorQuery = req.query.author.toLowerCase();
      result = result.filter(b =>
        b.author.toLowerCase().includes(authorQuery)
      );
    }

    // ── Filtering by genre ─────────────────────────────────
    if (req.query.genre) {
      const genreQuery = req.query.genre.toLowerCase();
      result = result.filter(b =>
        b.genre.toLowerCase() === genreQuery
      );
    }

    // ── Sorting ────────────────────────────────────────────
    // WHY: ?sort=-year means descending by year (the minus prefix
    // convention is borrowed from MongoDB and widely used in REST APIs)
    if (req.query.sort) {
      const sortField = req.query.sort.replace(/^-/, '');
      const sortOrder = req.query.sort.startsWith('-') ? -1 : 1;
      result.sort((a, b) => {
        if (a[sortField] < b[sortField]) return -1 * sortOrder;
        if (a[sortField] > b[sortField]) return 1 * sortOrder;
        return 0;
      });
    }

    // ── Pagination ─────────────────────────────────────────
    // WHY: Returning thousands of records in one response is slow
    // and wasteful.  Pagination limits each response to a fixed window.
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const totalItems = result.length;
    const totalPages = Math.ceil(totalItems / limit);
    const startIndex = (page - 1) * limit;
    const paginatedResult = result.slice(startIndex, startIndex + limit);

    const pagination = {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };

    envelope(res, paginatedResult, 200, pagination);
  });

  // ─── GET /api/books/:id — Get single book ────────────────
  router.get('/:id', validateBookId, (req, res) => {
    envelope(res, req.book);
  });

  // ─── POST /api/books — Create a new book ─────────────────
  router.post('/', validateBook, (req, res) => {
    const { title, author, genre, year, pages } = req.body;
    const newBook = {
      id: crypto.randomUUID(),
      title: title.trim(),
      author: author || 'Unknown',
      genre: genre || 'uncategorized',
      year: year || null,
      pages: pages || null,
      createdAt: new Date().toISOString(),
    };
    books.push(newBook);
    envelope(res, newBook, 201);
  });

  // ─── PUT /api/books/:id — Full update ────────────────────
  router.put('/:id', validateBookId, validateBook, (req, res) => {
    const index = books.findIndex(b => b.id === req.params.id);
    const { title, author, genre, year, pages } = req.body;
    books[index] = {
      ...books[index],
      title: title.trim(),
      author: author || books[index].author,
      genre: genre || books[index].genre,
      year: year !== undefined ? year : books[index].year,
      pages: pages !== undefined ? pages : books[index].pages,
      updatedAt: new Date().toISOString(),
    };
    envelope(res, books[index]);
  });

  // ─── PATCH /api/books/:id — Partial update ───────────────
  // WHY: PATCH updates only the provided fields, unlike PUT
  // which replaces the entire resource.
  router.patch('/:id', validateBookId, (req, res) => {
    const index = books.findIndex(b => b.id === req.params.id);
    const allowed = ['title', 'author', 'genre', 'year', 'pages'];
    const updates = {};

    allowed.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update',
      });
    }

    books[index] = { ...books[index], ...updates, updatedAt: new Date().toISOString() };
    envelope(res, books[index]);
  });

  // ─── DELETE /api/books/:id — Remove a book ───────────────
  router.delete('/:id', validateBookId, (req, res) => {
    const index = books.findIndex(b => b.id === req.params.id);
    const [deleted] = books.splice(index, 1);
    envelope(res, { message: 'Book deleted', book: deleted });
  });

  return router;
}

// ════════════════════════════════════════════════════════════════
// SECTION 6 — Error-Handling Middleware
// ════════════════════════════════════════════════════════════════

// ─── Centralized error handler ────────────────────────────────
// WHY: A single error handler at the END of the middleware stack
// catches every thrown/next(err) error and formats it consistently.
// Express recognizes (err, req, res, next) — four params — as
// an error-handling middleware.

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

// ════════════════════════════════════════════════════════════════
// SECTION 7 — App Assembly
// ════════════════════════════════════════════════════════════════

function createApp() {
  const app = express();

  // ─── Global middleware ───────────────────────────────────
  app.use(requestLogger);
  app.use(express.json());

  // ─── Mount book router ───────────────────────────────────
  app.use('/api/books', createBookRouter());

  // ─── 404 catch-all ───────────────────────────────────────
  // WHY: Any request that didn't match a route above ends up here.
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: `Route ${req.method} ${req.path} not found`,
    });
  });

  // ─── Error handler (must be last) ───────────────────────
  app.use(errorHandler);

  return app;
}

// ════════════════════════════════════════════════════════════════
// SECTION 8 — Self-Test Suite
// ════════════════════════════════════════════════════════════════

// ─── Test runner — verifies every API feature ─────────────────
// WHY: Self-contained tests mean you can run `node 24-project-rest-api.js`
// and immediately see whether every feature works.

async function runTests(baseURL) {
  const results = [];
  let testNum = 0;

  async function test(name, fn) {
    testNum++;
    try {
      await fn();
      results.push({ num: testNum, name, pass: true });
      console.log(`  [PASS] Test ${testNum}: ${name}`);
    } catch (err) {
      results.push({ num: testNum, name, pass: false, error: err.message });
      console.log(`  [FAIL] Test ${testNum}: ${name} — ${err.message}`);
    }
  }

  function assert(condition, message) {
    if (!condition) throw new Error(message);
  }

  async function req(method, path, body = null) {
    const url = `${baseURL}${path}`;
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body) options.body = JSON.stringify(body);
    const res = await fetch(url, options);
    const data = await res.json();
    return { status: res.status, body: data, headers: res.headers };
  }

  console.log('\n  PustakBhandar API — Test Suite');
  console.log('  ' + '─'.repeat(50));

  // ── Test 1: GET all books (seeded 10) ────────────────────
  await test('GET /api/books returns seeded books', async () => {
    const { status, body } = await req('GET', '/api/books');
    assert(status === 200, `Expected 200, got ${status}`);
    assert(body.success === true, 'Expected success: true');
    assert(body.data.length === 10, `Expected 10 books, got ${body.data.length}`);
    assert(body.pagination.totalItems === 10, 'Pagination totalItems should be 10');
  });

  // ── Test 2: Pagination ───────────────────────────────────
  await test('Pagination: page=1&limit=3 returns 3 books', async () => {
    const { body } = await req('GET', '/api/books?page=1&limit=3');
    assert(body.data.length === 3, `Expected 3 books, got ${body.data.length}`);
    assert(body.pagination.page === 1, 'Page should be 1');
    assert(body.pagination.limit === 3, 'Limit should be 3');
    assert(body.pagination.totalPages === 4, `Expected 4 pages, got ${body.pagination.totalPages}`);
    assert(body.pagination.hasNextPage === true, 'Should have next page');
    assert(body.pagination.hasPrevPage === false, 'Should not have prev page');
  });

  // ── Test 3: Pagination page 2 ───────────────────────────
  await test('Pagination: page=2&limit=3 shows hasPrevPage', async () => {
    const { body } = await req('GET', '/api/books?page=2&limit=3');
    assert(body.data.length === 3, `Expected 3 books, got ${body.data.length}`);
    assert(body.pagination.hasPrevPage === true, 'Should have prev page');
  });

  // ── Test 4: Filter by author ─────────────────────────────
  await test('Filter: ?author=premchand returns 2 books', async () => {
    const { body } = await req('GET', '/api/books?author=premchand');
    assert(body.data.length === 2, `Expected 2 books, got ${body.data.length}`);
    assert(body.data.every(b => b.author.toLowerCase().includes('premchand')), 'All should be Premchand');
  });

  // ── Test 5: Filter by genre ──────────────────────────────
  await test('Filter: ?genre=sahitya returns 3 books', async () => {
    const { body } = await req('GET', '/api/books?genre=sahitya');
    assert(body.data.length === 3, `Expected 3 sahitya books, got ${body.data.length}`);
  });

  // ── Test 6: Sort ascending ───────────────────────────────
  await test('Sort: ?sort=year orders oldest first', async () => {
    const { body } = await req('GET', '/api/books?sort=year');
    const years = body.data.map(b => b.year);
    for (let i = 1; i < years.length; i++) {
      assert(years[i] >= years[i - 1], `Year ${years[i]} should be >= ${years[i - 1]}`);
    }
  });

  // ── Test 7: Sort descending ──────────────────────────────
  await test('Sort: ?sort=-year orders newest first', async () => {
    const { body } = await req('GET', '/api/books?sort=-year');
    const years = body.data.map(b => b.year);
    for (let i = 1; i < years.length; i++) {
      assert(years[i] <= years[i - 1], `Year ${years[i]} should be <= ${years[i - 1]}`);
    }
  });

  // ── Test 8: GET single book by ID ────────────────────────
  await test('GET /api/books/:id returns single book', async () => {
    const allBooks = (await req('GET', '/api/books')).body.data;
    const firstId = allBooks[0].id;
    const { status, body } = await req('GET', `/api/books/${firstId}`);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(body.data.id === firstId, 'Should return correct book');
  });

  // ── Test 9: POST create a new book ───────────────────────
  await test('POST /api/books creates a new book', async () => {
    const newBook = { title: 'Sea of Poppies', author: 'Amitav Ghosh', genre: 'sahitya', year: 2008 };
    const { status, body } = await req('POST', '/api/books', newBook);
    assert(status === 201, `Expected 201, got ${status}`);
    assert(body.data.title === 'Sea of Poppies', 'Title should match');
    assert(body.data.id, 'Should have an id');
  });

  // ── Test 10: PUT update a book ───────────────────────────
  await test('PUT /api/books/:id updates a book', async () => {
    const allBooks = (await req('GET', '/api/books')).body.data;
    const targetId = allBooks[0].id;
    const { status, body } = await req('PUT', `/api/books/${targetId}`, {
      title: 'Updated Title', author: 'Updated Author', year: 2000,
    });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(body.data.title === 'Updated Title', 'Title should be updated');
    assert(body.data.updatedAt, 'Should have updatedAt timestamp');
  });

  // ── Test 11: PATCH partial update ────────────────────────
  await test('PATCH /api/books/:id partially updates', async () => {
    const allBooks = (await req('GET', '/api/books')).body.data;
    const targetId = allBooks[1].id;
    const oldTitle = allBooks[1].title;
    const { status, body } = await req('PATCH', `/api/books/${targetId}`, {
      year: 2025,
    });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(body.data.year === 2025, 'Year should be updated');
    assert(body.data.title === oldTitle, 'Title should remain unchanged');
  });

  // ── Test 12: DELETE a book ───────────────────────────────
  await test('DELETE /api/books/:id removes a book', async () => {
    // WHY: Use limit=100 to get ALL books (default limit=10 may paginate)
    const allBooks = (await req('GET', '/api/books?limit=100')).body;
    const countBefore = allBooks.pagination.totalItems;
    const targetId = allBooks.data[allBooks.data.length - 1].id;
    const { status } = await req('DELETE', `/api/books/${targetId}`);
    assert(status === 200, `Expected 200, got ${status}`);
    const afterBooks = (await req('GET', '/api/books?limit=100')).body;
    assert(afterBooks.pagination.totalItems === countBefore - 1, 'Count should decrease by 1');
  });

  // ── Test 13: Validation — missing title ──────────────────
  await test('POST without title returns 400', async () => {
    const { status, body } = await req('POST', '/api/books', { author: 'Nobody' });
    assert(status === 400, `Expected 400, got ${status}`);
    assert(body.success === false, 'Should return success: false');
    assert(body.error.includes('Title'), 'Error should mention title');
  });

  // ── Test 14: Validation — invalid year ───────────────────
  await test('POST with invalid year returns 400', async () => {
    const { status, body } = await req('POST', '/api/books', { title: 'Bad Year', year: 'abc' });
    assert(status === 400, `Expected 400, got ${status}`);
    assert(body.error.includes('Year'), 'Error should mention year');
  });

  // ── Test 15: Not found — invalid book ID ─────────────────
  await test('GET /api/books/invalid-id returns 404', async () => {
    const { status, body } = await req('GET', '/api/books/nonexistent-id-xyz');
    assert(status === 404, `Expected 404, got ${status}`);
    assert(body.success === false, 'success should be false');
  });

  // ── Test 16: Not found — unknown route ───────────────────
  await test('GET /unknown returns 404', async () => {
    const { status, body } = await req('GET', '/unknown');
    assert(status === 404, `Expected 404, got ${status}`);
    assert(body.error.includes('not found'), 'Should say not found');
  });

  // ── Test 17: Filter + sort combined ──────────────────────
  await test('Filter + sort: ?genre=upanyas&sort=-year', async () => {
    const { body } = await req('GET', '/api/books?genre=upanyas&sort=-year');
    assert(body.data.length >= 1, 'Should find upanyas books');
    const years = body.data.map(b => b.year);
    for (let i = 1; i < years.length; i++) {
      assert(years[i] <= years[i - 1], 'Should be sorted descending');
    }
  });

  // ── Summary ──────────────────────────────────────────────
  console.log('  ' + '─'.repeat(50));
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  console.log(`  Results: ${passed} passed, ${failed} failed out of ${results.length} tests`);
  if (failed > 0) {
    console.log('  Failed tests:');
    results.filter(r => !r.pass).forEach(r => {
      console.log(`    - Test ${r.num}: ${r.name} — ${r.error}`);
    });
  }
}

// ════════════════════════════════════════════════════════════════
// SECTION 9 — Start Server, Run Tests, Shut Down
// ════════════════════════════════════════════════════════════════

async function main() {
  console.log('============================================================');
  console.log(' FILE 24 — PustakBhandar API: Full CRUD REST Project');
  console.log('============================================================');

  seedBooks();  // WHY: populate the store before tests
  const app = createApp();

  const server = app.listen(0, async () => {
    const { port } = server.address();
    const baseURL = `http://127.0.0.1:${port}`;
    console.log(`\n  PustakBhandar API running on ${baseURL}`);

    try {
      await runTests(baseURL);
    } catch (err) {
      console.error('  Test suite error:', err.message);
    } finally {
      server.close(() => {
        console.log('\n  Server closed. PustakBhandar API tests complete.\n');

        // ── KEY TAKEAWAYS ──────────────────────────────────
        console.log('  KEY TAKEAWAYS');
        console.log('  ' + '─'.repeat(50));
        console.log('  1. Express.Router groups related routes into');
        console.log('     modular, mountable sub-applications.');
        console.log('  2. Validation middleware keeps route handlers');
        console.log('     clean — they only run when input is valid.');
        console.log('  3. Pagination with ?page and ?limit prevents');
        console.log('     huge responses and improves performance.');
        console.log('  4. The ?sort=-field convention (minus = desc)');
        console.log('     is a widely-adopted REST API pattern.');
        console.log('  5. A custom AppError class with statusCode');
        console.log('     lets one error handler format all errors.');
        console.log('  6. The { success, data, pagination } envelope');
        console.log('     gives API consumers a predictable structure.');
        console.log('  7. Centralized error handling middleware MUST');
        console.log('     be the last app.use() — it catches everything.');
        console.log('  8. Self-testing with fetch() on port 0 makes');
        console.log('     files immediately runnable and verifiable.');
        process.exit(0);
      });
    }
  });
}

main();
