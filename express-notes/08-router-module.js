/** ============================================================
 *  FILE 08 — The Router Module in Express 5
 *  Topic: express.Router(), modular routes, nested routers,
 *         router.param(), and route organization patterns
 *  WHY THIS MATTERS: Real applications have dozens or hundreds
 *  of routes. Router lets you split them into logical modules
 *  — like sections in a store — each with their own
 *  middleware, params, and sub-routes.
 *  ============================================================ */

// ─────────────────────────────────────────────────────────────
// STORY: DMart Sections
// ─────────────────────────────────────────────────────────────
// Store manager Gupta organizes his massive DMart store so
// each section runs independently. The grocery section has
// its own staff (middleware), its own billing counter (routes),
// and even a sub-section for spices with specialized helpers
// (nested routers). Gupta (the main app) simply directs
// customers to the right section. That's express.Router().
// ─────────────────────────────────────────────────────────────

const express = require('express');
const http = require('http');

// ─────────────────────────────────────────────────────────────
// Helper — make an HTTP request and return { status, headers, body }
// ─────────────────────────────────────────────────────────────
function request(port, method, urlPath, { body, headers } = {}) {
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
// BLOCK 1 — Basic Router with CRUD Routes, Mounted on App
// =============================================================
// "Gupta sets up the Grocery Section with its own inventory
//  staff and routes for managing products."
//
// express.Router() creates a mini-application that handles
// routes and middleware independently, then gets mounted
// onto the main app at a prefix path.
// (See nodejs-notes/06 for HTTP method fundamentals)
// ─────────────────────────────────────────────────────────────

async function block1() {
  console.log('=== BLOCK 1: Basic Router with CRUD Routes ===\n');

  const app = express();
  app.use(express.json());

  // ── Create a Router — it's a mini-app ──────────────────────
  const groceryRouter = express.Router();

  // WHY: Routers have their own middleware stack. This middleware
  // only runs for requests that reach this router.
  groceryRouter.use((req, res, next) => {
    req.section = 'Grocery';
    // WHY: Attaching data to req is how middleware passes info downstream.
    next();
  });

  // ── In-memory "database" for demonstration ─────────────────
  const products = [
    { id: 1, name: 'Toor Dal', price: 189 },
    { id: 2, name: 'Basmati Rice', price: 299 },
    { id: 3, name: 'Ghee', price: 549 },
  ];

  // ── GET /products — list all ───────────────────────────────
  groceryRouter.get('/', (req, res) => {
    // WHY: Inside the router, paths are relative to the mount point.
    // This handles GET /api/products, not GET /.
    res.json({ section: req.section, products });
  });

  // ── GET /products/:id — get one ────────────────────────────
  groceryRouter.get('/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    const product = products.find((p) => p.id === id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ section: req.section, product });
  });

  // ── POST /products — create ────────────────────────────────
  groceryRouter.post('/', (req, res) => {
    const newProduct = {
      id: products.length + 1,
      name: req.body.name,
      price: req.body.price,
    };
    products.push(newProduct);
    res.status(201).json({ section: req.section, created: newProduct });
  });

  // ── PUT /products/:id — update ─────────────────────────────
  groceryRouter.put('/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    const product = products.find((p) => p.id === id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    if (req.body.name) product.name = req.body.name;
    if (req.body.price) product.price = req.body.price;
    res.json({ section: req.section, updated: product });
  });

  // ── DELETE /products/:id — remove ──────────────────────────
  groceryRouter.delete('/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    const idx = products.findIndex((p) => p.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Product not found' });
    }
    const removed = products.splice(idx, 1)[0];
    res.json({ section: req.section, deleted: removed });
  });

  // ── Mount the router at /api/products ──────────────────────
  // WHY: app.use() with a path prefix means all routes inside
  // the router are relative to that prefix. The router doesn't
  // know or care what prefix it's mounted at.
  app.use('/api/products', groceryRouter);

  // ── Also mount a simple health router ──────────────────────
  const healthRouter = express.Router();
  healthRouter.get('/', (req, res) => {
    res.json({ status: 'healthy', uptime: process.uptime() });
  });
  app.use('/api/health', healthRouter);

  const server = app.listen(0);
  const port = server.address().port;
  console.log(`  DMart store open on port ${port}\n`);

  // ── Test 1: GET all products ───────────────────────────────
  console.log('  --- Test 1: GET /api/products — list all ---');
  const r1 = await request(port, 'GET', '/api/products');
  console.log('  section:', r1.body.section);
  // Output: Grocery
  console.log('  count:  ', r1.body.products.length);
  // Output: 3
  console.log();

  // ── Test 2: GET single product ─────────────────────────────
  console.log('  --- Test 2: GET /api/products/2 — get one ---');
  const r2 = await request(port, 'GET', '/api/products/2');
  console.log('  product:', r2.body.product);
  // Output: { id: 2, name: 'Basmati Rice', price: 299 }
  console.log();

  // ── Test 3: POST new product ───────────────────────────────
  console.log('  --- Test 3: POST /api/products — create ---');
  const r3 = await request(port, 'POST', '/api/products', {
    body: { name: 'Atta', price: 249 },
  });
  console.log('  status: ', r3.status);
  // Output: 201
  console.log('  created:', r3.body.created);
  // Output: { id: 4, name: 'Atta', price: 249 }
  console.log();

  // ── Test 4: PUT update product ─────────────────────────────
  console.log('  --- Test 4: PUT /api/products/1 — update ---');
  const r4 = await request(port, 'PUT', '/api/products/1', {
    body: { price: 169 },
  });
  console.log('  updated:', r4.body.updated);
  // Output: { id: 1, name: 'Toor Dal', price: 169 }
  console.log();

  // ── Test 5: DELETE product ─────────────────────────────────
  console.log('  --- Test 5: DELETE /api/products/3 — delete ---');
  const r5 = await request(port, 'DELETE', '/api/products/3');
  console.log('  deleted:', r5.body.deleted);
  // Output: { id: 3, name: 'Ghee', price: 549 }
  console.log();

  // ── Test 6: 404 for missing product ────────────────────────
  console.log('  --- Test 6: GET /api/products/999 — not found ---');
  const r6 = await request(port, 'GET', '/api/products/999');
  console.log('  status:', r6.status);
  // Output: 404
  console.log('  error: ', r6.body.error);
  // Output: Product not found
  console.log();

  // ── Test 7: Health router ──────────────────────────────────
  console.log('  --- Test 7: GET /api/health — separate router ---');
  const r7 = await request(port, 'GET', '/api/health');
  console.log('  status:', r7.body.status);
  // Output: healthy
  console.log();

  server.close();
}

// =============================================================
// BLOCK 2 — Nested Routers, Router-Level Middleware, router.param()
// =============================================================
// "The Grocery section has a sub-section for Spices, managed
//  by specialist staff. Gupta also uses router.param() to
//  pre-load resources whenever a :customerId appears in the URL."
//
// Routers can be nested inside other routers — this is how
// you build deep, modular route hierarchies.
// ─────────────────────────────────────────────────────────────

async function block2() {
  console.log('=== BLOCK 2: Nested Routers, Middleware, router.param() ===\n');

  const app = express();
  app.use(express.json());

  // ── In-memory data ─────────────────────────────────────────
  const customers = {
    1: { id: 1, name: 'Priya', role: 'premium' },
    2: { id: 2, name: 'Rahul', role: 'regular' },
  };

  const orders = {
    1: [
      { id: 101, title: 'Priya\'s weekly grocery', items: 'Dal, Rice, Atta' },
      { id: 102, title: 'Festival sweets order', items: 'Ghee, Sugar, Mawa' },
    ],
    2: [
      { id: 201, title: 'Rahul\'s snacks haul', items: 'Chips, Biscuits, Namkeen' },
    ],
  };

  // ── Customers Router ────────────────────────────────────────
  const customersRouter = express.Router();

  // ── router.param() — pre-process named parameters ─────────
  // WHY: router.param() runs ONCE per request when :customerId
  // appears in any route on this router. It's perfect for
  // loading a resource from a DB and attaching it to req.
  //
  // Express 5 note: The old router.param(fn) callback style
  // (where you could register a custom param handler function)
  // has been REMOVED. Only router.param(name, handler) works.
  customersRouter.param('customerId', (req, res, next, value) => {
    // WHY: `value` is the actual string from the URL segment.
    const customer = customers[value];
    if (!customer) {
      return res.status(404).json({ error: `Customer ${value} not found` });
    }
    req.customer = customer;
    // WHY: Attach the loaded customer so downstream handlers don't
    // have to look it up again.
    next();
  });

  // ── Router-level middleware — logging ───────────────────────
  // WHY: This middleware runs for EVERY request hitting customersRouter.
  // It's scoped to this router only — other routers won't see it.
  customersRouter.use((req, res, next) => {
    req.requestedAt = new Date().toISOString();
    next();
  });

  // ── GET /customers ──────────────────────────────────────────
  customersRouter.get('/', (req, res) => {
    res.json({
      requestedAt: req.requestedAt,
      customers: Object.values(customers),
    });
  });

  // ── GET /customers/:customerId ──────────────────────────────
  customersRouter.get('/:customerId', (req, res) => {
    // WHY: req.customer was attached by router.param() above.
    // No need to look up the customer again.
    res.json({
      requestedAt: req.requestedAt,
      customer: req.customer,
    });
  });

  // ── Orders Router (nested inside customers) ─────────────────
  // WHY: mergeParams: true lets this child router access
  // :customerId from the parent router's route.
  const ordersRouter = express.Router({ mergeParams: true });

  ordersRouter.get('/', (req, res) => {
    // WHY: req.params.customerId comes from the PARENT router
    // because we set mergeParams: true.
    const customerOrders = orders[req.params.customerId] || [];
    res.json({
      customer: req.customer.name,
      orders: customerOrders,
    });
  });

  ordersRouter.get('/:orderId', (req, res) => {
    const customerOrders = orders[req.params.customerId] || [];
    const order = customerOrders.find((o) => o.id === parseInt(req.params.orderId, 10));
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json({
      customer: req.customer.name,
      order,
    });
  });

  ordersRouter.post('/', (req, res) => {
    const customerId = req.params.customerId;
    if (!orders[customerId]) orders[customerId] = [];
    const newOrder = {
      id: Date.now(),
      title: req.body.title,
      items: req.body.items,
    };
    orders[customerId].push(newOrder);
    res.status(201).json({
      customer: req.customer.name,
      created: newOrder,
    });
  });

  // ── Nest ordersRouter inside customersRouter ─────────────────
  // WHY: This creates the path: /api/customers/:customerId/orders/...
  // The ordersRouter handles everything after /orders.
  customersRouter.use('/:customerId/orders', ordersRouter);

  // ── Mount customersRouter on main app ───────────────────────
  app.use('/api/customers', customersRouter);

  // ── Standalone "sections" router — shows route.route() ──────
  const sectionsRouter = express.Router();

  // WHY: router.route() lets you chain multiple HTTP methods
  // on the same path — reduces repetition.
  sectionsRouter.route('/')
    .get((req, res) => {
      res.json({ sections: ['Grocery', 'Clothing', 'Electronics'] });
    })
    .post((req, res) => {
      res.status(201).json({ created: req.body.name });
    });

  app.use('/api/sections', sectionsRouter);

  const server = app.listen(0);
  const port = server.address().port;
  console.log(`  Nested sections on port ${port}\n`);

  // ── Test 1: List all customers ──────────────────────────────
  console.log('  --- Test 1: GET /api/customers — list all customers ---');
  const r1 = await request(port, 'GET', '/api/customers');
  console.log('  count:      ', r1.body.customers.length);
  // Output: 2
  console.log('  requestedAt:', typeof r1.body.requestedAt);
  // Output: string
  console.log();

  // ── Test 2: Get single customer (router.param fires) ────────
  console.log('  --- Test 2: GET /api/customers/1 — router.param() loads customer ---');
  const r2 = await request(port, 'GET', '/api/customers/1');
  console.log('  customer:', r2.body.customer);
  // Output: { id: 1, name: 'Priya', role: 'premium' }
  console.log();

  // ── Test 3: router.param 404 for missing customer ───────────
  console.log('  --- Test 3: GET /api/customers/99 — router.param 404 ---');
  const r3 = await request(port, 'GET', '/api/customers/99');
  console.log('  status:', r3.status);
  // Output: 404
  console.log('  error: ', r3.body.error);
  // Output: Customer 99 not found
  console.log();

  // ── Test 4: Nested — get customer's orders ──────────────────
  console.log('  --- Test 4: GET /api/customers/1/orders — nested router ---');
  const r4 = await request(port, 'GET', '/api/customers/1/orders');
  console.log('  customer:', r4.body.customer);
  // Output: Priya
  console.log('  count:  ', r4.body.orders.length);
  // Output: 2
  console.log();

  // ── Test 5: Nested — get specific order ──────────────────────
  console.log('  --- Test 5: GET /api/customers/1/orders/101 — nested with orderId ---');
  const r5 = await request(port, 'GET', '/api/customers/1/orders/101');
  console.log('  customer:', r5.body.customer);
  // Output: Priya
  console.log('  order:  ', r5.body.order);
  // Output: { id: 101, title: "Priya's weekly grocery", items: 'Dal, Rice, Atta' }
  console.log();

  // ── Test 6: Nested — create order for customer ───────────────
  console.log('  --- Test 6: POST /api/customers/2/orders — nested create ---');
  const r6 = await request(port, 'POST', '/api/customers/2/orders', {
    body: { title: 'Rahul\'s party supplies', items: 'Cold drinks, Cups, Plates' },
  });
  console.log('  status: ', r6.status);
  // Output: 201
  console.log('  customer:', r6.body.customer);
  // Output: Rahul
  console.log('  title:  ', r6.body.created.title);
  // Output: Rahul's party supplies
  console.log();

  // ── Test 7: router.route() — chained methods ────────────────
  console.log('  --- Test 7: GET /api/sections — route() chaining ---');
  const r7 = await request(port, 'GET', '/api/sections');
  console.log('  sections:', r7.body.sections);
  // Output: [ 'Grocery', 'Clothing', 'Electronics' ]
  console.log();

  console.log('  --- Test 8: POST /api/sections — route() chaining ---');
  const r8 = await request(port, 'POST', '/api/sections', {
    body: { name: 'Home & Kitchen' },
  });
  console.log('  status: ', r8.status);
  // Output: 201
  console.log('  created:', r8.body.created);
  // Output: Home & Kitchen
  console.log();

  server.close();
}

// =============================================================
// RUN ALL BLOCKS
// =============================================================
async function main() {
  console.log('============================================================');
  console.log(' FILE 08 — The Router Module (DMart Sections)');
  console.log('============================================================\n');

  await block1();
  await block2();

  // ─────────────────────────────────────────────────────────────
  // KEY TAKEAWAYS
  // ─────────────────────────────────────────────────────────────
  console.log('=== KEY TAKEAWAYS ===\n');
  console.log('  1. express.Router() creates a mini-app with its own');
  console.log('     middleware stack and route handlers.');
  console.log('  2. Mount routers with app.use(\'/prefix\', router) —');
  console.log('     all routes inside are relative to that prefix.');
  console.log('  3. Router-level middleware (router.use()) only runs');
  console.log('     for requests hitting that specific router.');
  console.log('  4. router.param(name, handler) pre-processes named');
  console.log('     URL parameters — great for loading resources.');
  console.log('  5. Express 5 REMOVED router.param(fn) callback style;');
  console.log('     only router.param(name, handler) is supported.');
  console.log('  6. Nest routers with mergeParams: true to access parent');
  console.log('     params (e.g., :customerId in an orders sub-router).');
  console.log('  7. router.route(\'/path\') chains .get().post().put()');
  console.log('     on the same path — reduces repetition.');
  console.log('  8. Routers enable modular code: one file per resource,');
  console.log('     each exporting a router.\n');

  console.log('Done. All servers closed cleanly.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
