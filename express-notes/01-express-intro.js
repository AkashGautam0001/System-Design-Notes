/** ============================================================
 *  FILE 1: Express.js Introduction — From Raw HTTP to Express
 *  WHY THIS MATTERS: Express eliminates the repetitive plumbing
 *  of Node's raw http module so you can focus on your app logic.
 *  Express is the most widely-used Node.js web framework — it
 *  sits on TOP of the built-in http module and adds routing,
 *  middleware, and convenient request/response helpers.
 *  ============================================================ */

// ─── Amma's Dhaba Upgrade ─────────────────────────────────────
//
// Amma ran her highway dhaba's online ordering with raw
// Node.js http.createServer (see nodejs-notes for that story).
// She parsed URLs by hand, matched methods with if/else chains,
// and set Content-Type headers manually on every response.
//
// One day a friend said: "Amma, you're grinding masala by hand
// when a mixer is RIGHT THERE."  That mixer is Express.  Same
// kitchen (Node http module), but with the tedious work already
// done for you.
//
// Let's see the upgrade side by side, then explore every
// response helper Express gives us.
//
// (See nodejs-notes/08 for raw HTTP server fundamentals)

const express = require('express');
const http = require('http');

// ════════════════════════════════════════════════════════════════
// BLOCK 1 — Basic Server with GET/POST Routes
// ════════════════════════════════════════════════════════════════

// ─── Raw http vs Express — side by side (comments only) ───────
//
// RAW HTTP:
//   const server = http.createServer((req, res) => {
//     if (req.method === 'GET' && req.url === '/menu') {
//       res.writeHead(200, { 'Content-Type': 'application/json' });
//       res.end(JSON.stringify({ items: ['thali', 'biryani'] }));
//     } else if (req.method === 'POST' && req.url === '/order') {
//       let body = '';
//       req.on('data', chunk => body += chunk);
//       req.on('end', () => {
//         const order = JSON.parse(body);
//         res.writeHead(201, { 'Content-Type': 'application/json' });
//         res.end(JSON.stringify({ status: 'received', order }));
//       });
//     } else {
//       res.writeHead(404);
//       res.end('Not found');
//     }
//   });
//
// EXPRESS:
//   const app = express();
//   app.use(express.json());
//   app.get('/menu',  (req, res) => res.json({ items: ['thali','biryani'] }));
//   app.post('/order', (req, res) => res.status(201).json({ status: 'received', order: req.body }));
//
// WHY: Express removes the manual URL parsing, method checking,
//      header setting, and body accumulation.  Same http module
//      underneath — far less boilerplate on top.

function block1_basicServer() {
  return new Promise((resolve) => {
    const app = express();

    // ─── express.json() parses incoming JSON bodies ───────────
    app.use(express.json());

    // ─── GET route — Amma's menu ──────────────────────────────
    app.get('/menu', (req, res) => {
      // WHY: app.get() registers a handler for GET requests at this path.
      // No manual url parsing or method checking needed.
      res.json({ items: ['thali', 'biryani', 'gulab-jamun'] });
      // WHY: res.json() sets Content-Type to application/json AND
      // serialises the object — two steps handled in one call.
    });

    // ─── GET with query string — filtering the menu ───────────
    app.get('/search', (req, res) => {
      // req.query is automatically parsed from the URL query string
      const { q, limit } = req.query;
      // WHY: Express parses ?q=biryani&limit=5 into { q: 'biryani', limit: '5' }
      // automatically — no url.parse() or URLSearchParams needed.
      res.json({ query: q, limit: limit || '10', results: [`${q} found!`] });
    });

    // ─── GET with route parameter — single item ───────────────
    app.get('/menu/:id', (req, res) => {
      // req.params holds named route segments
      const { id } = req.params;
      // WHY: :id in the path becomes req.params.id — Express
      // extracts it for you, no regex or string splitting.
      res.json({ item: id, price: 149 });
    });

    // ─── POST route — placing an order ────────────────────────
    app.post('/order', (req, res) => {
      // WHY: app.post() matches only POST requests.  The JSON body
      // is already parsed by express.json() middleware above.
      const order = req.body;
      res.status(201).json({ status: 'received', order });
      // WHY: res.status(201) sets the HTTP status, .json() sends
      // the body — chainable for clean one-liners.
    });

    // ─── Start on port 0 (OS assigns a free port) ─────────────
    const server = app.listen(0, async () => {
      const port = server.address().port;
      const base = `http://127.0.0.1:${port}`;
      console.log('=== BLOCK 1: Basic Express Server ===');
      console.log(`Server running on port ${port}\n`);

      try {
        // ─── Test GET /menu ───────────────────────────────────
        const menuRes = await fetch(`${base}/menu`);
        const menuData = await menuRes.json();
        console.log('GET /menu:', JSON.stringify(menuData));
        // Output: GET /menu: {"items":["thali","biryani","gulab-jamun"]}

        // ─── Test GET /search?q=biryani&limit=5 ─────────────────
        const searchRes = await fetch(`${base}/search?q=biryani&limit=5`);
        const searchData = await searchRes.json();
        console.log('GET /search?q=biryani&limit=5:', JSON.stringify(searchData));
        // Output: GET /search?q=biryani&limit=5: {"query":"biryani","limit":"5","results":["biryani found!"]}

        // ─── Test GET /menu/42 ────────────────────────────────
        const itemRes = await fetch(`${base}/menu/42`);
        const itemData = await itemRes.json();
        console.log('GET /menu/42:', JSON.stringify(itemData));
        // Output: GET /menu/42: {"item":"42","price":149}

        // ─── Test POST /order ─────────────────────────────────
        const orderRes = await fetch(`${base}/order`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dish: 'biryani', qty: 2 }),
        });
        const orderData = await orderRes.json();
        console.log('POST /order:', JSON.stringify(orderData));
        // Output: POST /order: {"status":"received","order":{"dish":"biryani","qty":2}}
        console.log(`POST status code: ${orderRes.status}`);
        // Output: POST status code: 201
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
// BLOCK 2 — Response Methods (send, json, status, redirect, end)
// ════════════════════════════════════════════════════════════════

// ─── Express response helpers at a glance ─────────────────────
//
//  res.send(body)     — smart send: sets Content-Type by type
//  res.json(obj)      — always JSON, calls JSON.stringify
//  res.status(code)   — sets status, returns res for chaining
//  res.redirect(url)  — 302 redirect (or supply status first)
//  res.end()          — end response with no body
//  res.type(mime)     — sets Content-Type header
//  res.set(h, v)      — set any response header
//  res.sendStatus(c)  — sets status AND sends status text as body

function block2_responseMethods() {
  return new Promise((resolve) => {
    const app = express();

    // ─── res.send() — auto-detects content type ───────────────
    app.get('/text', (req, res) => {
      res.send('Namaste from Amma\'s Dhaba!');
      // WHY: When you pass a string, res.send() sets
      // Content-Type to text/html automatically.
    });

    // ─── res.json() — always application/json ─────────────────
    app.get('/json', (req, res) => {
      res.json({ framework: 'Express', version: '5.x' });
      // WHY: res.json() ensures proper JSON serialisation and
      // the correct Content-Type header every time.
    });

    // ─── res.status() + chaining ──────────────────────────────
    app.get('/not-found', (req, res) => {
      res.status(404).json({ error: 'Resource not found' });
      // WHY: .status() returns `res` so you can chain .json(),
      // .send(), or .end() right after it.
    });

    // ─── res.sendStatus() — status + text body in one call ────
    app.get('/health', (req, res) => {
      res.sendStatus(200);
      // WHY: Sends "OK" as the body and sets status 200.
      // Handy for simple health-check endpoints.
    });

    // ─── res.redirect() — HTTP redirect ───────────────────────
    app.get('/old-menu', (req, res) => {
      res.redirect(301, '/new-menu');
      // WHY: First arg is optional status (default 302).
      // 301 = permanent redirect, 302 = temporary.
    });

    app.get('/new-menu', (req, res) => {
      res.json({ menu: 'This is the new menu!' });
    });

    // ─── res.type() + res.send() — explicit Content-Type ──────
    app.get('/xml', (req, res) => {
      res.type('application/xml').send('<dish><name>Biryani</name></dish>');
      // WHY: res.type() lets you override the auto-detected type
      // when you need a specific MIME type like XML.
    });

    // ─── res.set() — custom headers ───────────────────────────
    app.get('/custom-header', (req, res) => {
      res.set('X-Powered-By', 'Amma-Dhaba');
      res.set('X-Request-Id', '12345');
      res.json({ headers: 'check the response headers!' });
      // WHY: res.set() adds any header you want — useful for
      // CORS, caching, tracing, and custom metadata.
    });

    // ─── res.end() — end with no body ─────────────────────────
    app.get('/no-content', (req, res) => {
      res.status(204).end();
      // WHY: Some responses (204 No Content) should have no body.
      // res.end() closes the response without sending data.
    });

    const server = app.listen(0, async () => {
      const port = server.address().port;
      const base = `http://127.0.0.1:${port}`;
      console.log('=== BLOCK 2: Response Methods ===');
      console.log(`Server running on port ${port}\n`);

      try {
        // ─── Test res.send() ──────────────────────────────────
        const textRes = await fetch(`${base}/text`);
        const textBody = await textRes.text();
        console.log('GET /text:', textBody);
        // Output: GET /text: Namaste from Amma's Dhaba!
        console.log('  Content-Type:', textRes.headers.get('content-type'));
        // Output:   Content-Type: text/html; charset=utf-8

        // ─── Test res.json() ──────────────────────────────────
        const jsonRes = await fetch(`${base}/json`);
        const jsonData = await jsonRes.json();
        console.log('GET /json:', JSON.stringify(jsonData));
        // Output: GET /json: {"framework":"Express","version":"5.x"}

        // ─── Test res.status(404) ─────────────────────────────
        const nfRes = await fetch(`${base}/not-found`);
        console.log('GET /not-found status:', nfRes.status);
        // Output: GET /not-found status: 404
        const nfData = await nfRes.json();
        console.log('GET /not-found body:', JSON.stringify(nfData));
        // Output: GET /not-found body: {"error":"Resource not found"}

        // ─── Test res.sendStatus() ────────────────────────────
        const healthRes = await fetch(`${base}/health`);
        const healthBody = await healthRes.text();
        console.log('GET /health:', healthRes.status, healthBody);
        // Output: GET /health: 200 OK

        // ─── Test res.redirect() ──────────────────────────────
        // fetch follows redirects by default; use redirect:'manual' to inspect
        const redirRes = await fetch(`${base}/old-menu`, { redirect: 'manual' });
        console.log('GET /old-menu status:', redirRes.status);
        // Output: GET /old-menu status: 301
        console.log('  Location:', redirRes.headers.get('location'));
        // Output:   Location: /new-menu

        // ─── Test res.type() for XML ──────────────────────────
        const xmlRes = await fetch(`${base}/xml`);
        console.log('GET /xml Content-Type:', xmlRes.headers.get('content-type'));
        // Output: GET /xml Content-Type: application/xml; charset=utf-8
        const xmlBody = await xmlRes.text();
        console.log('GET /xml body:', xmlBody);
        // Output: GET /xml body: <dish><name>Biryani</name></dish>

        // ─── Test res.set() custom headers ────────────────────
        const chRes = await fetch(`${base}/custom-header`);
        console.log('GET /custom-header X-Request-Id:', chRes.headers.get('x-request-id'));
        // Output: GET /custom-header X-Request-Id: 12345

        // ─── Test res.end() with 204 ─────────────────────────
        const ncRes = await fetch(`${base}/no-content`);
        console.log('GET /no-content status:', ncRes.status);
        // Output: GET /no-content status: 204
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
  await block1_basicServer();
  await block2_responseMethods();

  console.log('\n=== KEY TAKEAWAYS ===');
  console.log('1. express() creates an application — it wraps Node\'s http module.');
  console.log('2. app.get/post/put/delete register route handlers by HTTP method.');
  console.log('3. req.params holds :named segments, req.query holds ?key=value pairs.');
  console.log('4. res.json() sends JSON; res.send() auto-detects; res.status() is chainable.');
  console.log('5. res.redirect(), res.sendStatus(), res.type(), res.set() cover common needs.');
  console.log('6. app.listen(0) lets the OS pick a free port — perfect for testing.');
  console.log('7. Express sits ON TOP of http — same server, less boilerplate.');

  process.exit(0);
}

main();
