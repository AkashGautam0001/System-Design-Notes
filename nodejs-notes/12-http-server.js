/** ============================================================
 FILE 12: HTTP Server — Building from Scratch
 ============================================================
 Topic: http.createServer, routing, request parsing, POST
        body handling, static file serving with streams
 WHY THIS MATTERS:
   Every Express/Fastify/Koa app is built on top of Node's
   http module. Understanding it raw gives you superpowers
   when debugging, optimizing, or building custom servers.
 ============================================================ */

// ============================================================
// STORY: HIGHWAY DHABA ORDER WINDOW
//   Amma runs a highway dhaba with a single order window.
//   She reads slips (requests), routes them to the right
//   station, and sends plates (responses) back out. Today
//   she handles simple orders, complex forms, and even
//   streams a full menu page through the window.
// ============================================================

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 0; // WHY: Port 0 lets the OS pick an available port — no conflicts.
const TEMP_DIR = path.join(__dirname, "_temp_http_server");
const TEMP_HTML = path.join(TEMP_DIR, "menu.html");

// ──────────────────────────────────────────────────────────────
// Setup: create temp directory and HTML file for Block 3
// ──────────────────────────────────────────────────────────────

function setup() {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
  const html = `<!DOCTYPE html>
<html>
<head><title>Amma's Highway Dhaba Menu</title></head>
<body>
  <h1>Welcome to Amma's Highway Dhaba</h1>
  <ul>
    <li>Dal Makhani — Rs 180</li>
    <li>Butter Naan — Rs 60</li>
    <li>Tandoori Chicken — Rs 320</li>
    <li>Lassi — Rs 80</li>
  </ul>
</body>
</html>`;
  fs.writeFileSync(TEMP_HTML, html, "utf8");
  console.log("  [Setup] Created temp HTML menu file.\n");
}

function cleanup() {
  if (fs.existsSync(TEMP_HTML)) fs.unlinkSync(TEMP_HTML);
  if (fs.existsSync(TEMP_DIR)) fs.rmdirSync(TEMP_DIR);
  console.log("  [Cleanup] Temp files removed.\n");
}

// ──────────────────────────────────────────────────────────────
// Helper: make an HTTP request and collect the response
// ──────────────────────────────────────────────────────────────

function makeRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks).toString(),
        });
      });
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

// ============================================================
// THE SERVER — handles all three blocks
// ============================================================

function createDhabaServer() {
  const server = http.createServer((req, res) => {
    const { url, method, headers } = req;

    // ──────────────────────────────────────────────────────────
    // BLOCK 1 routes — Basic GET routing
    // ──────────────────────────────────────────────────────────

    if (method === "GET" && url === "/") {
      // WHY: writeHead sets status code AND headers in one call.
      //   You can also use res.statusCode and res.setHeader()
      //   separately, but writeHead is more concise.
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("<h1>Welcome to Amma's Highway Dhaba!</h1>");
      return;
    }

    if (method === "GET" && url === "/api/menu") {
      const menu = {
        dhaba: "Amma's Highway Dhaba",
        items: [
          { name: "Dal Makhani", price: 180 },
          { name: "Butter Naan", price: 60 },
          { name: "Tandoori Chicken", price: 320 },
          { name: "Lassi", price: 80 },
        ],
      };
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(menu, null, 2));
      return;
    }

    if (method === "GET" && url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "healthy", uptime: process.uptime() }));
      return;
    }

    // ──────────────────────────────────────────────────────────
    // BLOCK 2 route — POST body handling
    // ──────────────────────────────────────────────────────────

    if (method === "POST" && url === "/api/order") {
      // WHY: The request body arrives as a stream of chunks.
      //   You must collect them all before parsing. This is
      //   exactly what body-parser middleware does for you.
      const chunks = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", () => {
        try {
          const body = JSON.parse(Buffer.concat(chunks).toString());
          const response = {
            message: `Order received: ${body.item} x${body.quantity}`,
            total: body.quantity * (body.price || 10),
            orderId: Math.floor(Math.random() * 9000) + 1000,
          };
          res.writeHead(201, { "Content-Type": "application/json" });
          res.end(JSON.stringify(response));
        } catch (err) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid JSON in request body" }));
        }
      });
      return;
    }

    // ──────────────────────────────────────────────────────────
    // BLOCK 3 route — Serve static file via streams
    // ──────────────────────────────────────────────────────────

    if (method === "GET" && url === "/menu.html") {
      // WHY: Piping a ReadStream to the response is memory
      //   efficient — the file is never fully loaded into RAM.
      //   This is how static file servers work under the hood.
      const filePath = TEMP_HTML;
      if (!fs.existsSync(filePath)) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Menu file not found");
        return;
      }
      const stat = fs.statSync(filePath);
      res.writeHead(200, {
        "Content-Type": "text/html",
        "Content-Length": stat.size,
      });
      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
      // WHY: pipe() automatically calls res.end() when the
      //   read stream finishes. No manual end() needed.
      return;
    }

    // ──────────────────────────────────────────────────────────
    // 404 — catch-all for unknown routes
    // ──────────────────────────────────────────────────────────

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Route not found", path: url }));
  });

  return server;
}

// ============================================================
// TEST RUNNER — start server, run tests, close server
// ============================================================

async function runTests(server) {
  const address = server.address();
  const base = { hostname: "localhost", port: address.port };

  // ============================================================
  // EXAMPLE BLOCK 1 — Basic GET Routing
  // ============================================================

  console.log("=== BLOCK 1: Basic GET Routing ===\n");

  // ──────────────────────────────────────────────────────────
  // 1a — GET /
  // ──────────────────────────────────────────────────────────

  console.log("  --- GET / ---");
  const homeRes = await makeRequest({ ...base, path: "/", method: "GET" });
  console.log(`  Status: ${homeRes.statusCode}`);
  console.log(`  Body: ${homeRes.body}`);
  // Output: Status: 200

  // ──────────────────────────────────────────────────────────
  // 1b — GET /api/menu (JSON response)
  // ──────────────────────────────────────────────────────────

  console.log("\n  --- GET /api/menu ---");
  const menuRes = await makeRequest({ ...base, path: "/api/menu", method: "GET" });
  console.log(`  Status: ${menuRes.statusCode}`);
  console.log(`  Content-Type: ${menuRes.headers["content-type"]}`);
  const menuData = JSON.parse(menuRes.body);
  console.log(`  Dhaba: ${menuData.dhaba}`);
  console.log(`  Items: ${menuData.items.map((i) => i.name).join(", ")}`);
  // Output: Content-Type: application/json

  // ──────────────────────────────────────────────────────────
  // 1c — GET /health
  // ──────────────────────────────────────────────────────────

  console.log("\n  --- GET /health ---");
  const healthRes = await makeRequest({ ...base, path: "/health", method: "GET" });
  const health = JSON.parse(healthRes.body);
  console.log(`  Status: ${healthRes.statusCode}`);
  console.log(`  Health: ${health.status}`);
  // Output: Health: healthy

  // ──────────────────────────────────────────────────────────
  // 1d — GET unknown route (404)
  // ──────────────────────────────────────────────────────────

  console.log("\n  --- GET /unknown (404) ---");
  const notFound = await makeRequest({ ...base, path: "/unknown", method: "GET" });
  console.log(`  Status: ${notFound.statusCode}`);
  console.log(`  Body: ${notFound.body}`);
  // Output: Status: 404

  // ============================================================
  // EXAMPLE BLOCK 2 — POST Body Handling
  // ============================================================

  console.log("\n=== BLOCK 2: POST Body Handling ===\n");

  // ──────────────────────────────────────────────────────────
  // 2a — POST /api/order with JSON body
  // ──────────────────────────────────────────────────────────

  console.log("  --- POST /api/order ---");
  const orderBody = JSON.stringify({ item: "Dal Makhani", quantity: 2, price: 180 });
  const orderRes = await makeRequest(
    {
      ...base,
      path: "/api/order",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(orderBody),
      },
    },
    orderBody
  );
  console.log(`  Status: ${orderRes.statusCode}`);
  const order = JSON.parse(orderRes.body);
  console.log(`  Message: ${order.message}`);
  console.log(`  Total: Rs ${order.total}`);
  // Output: Status: 201
  // Output: Message: Order received: Dal Makhani x2

  // ──────────────────────────────────────────────────────────
  // 2b — POST with invalid JSON
  // ──────────────────────────────────────────────────────────

  console.log("\n  --- POST /api/order (bad JSON) ---");
  const badBody = "this is not json";
  const badRes = await makeRequest(
    {
      ...base,
      path: "/api/order",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(badBody),
      },
    },
    badBody
  );
  console.log(`  Status: ${badRes.statusCode}`);
  console.log(`  Error: ${JSON.parse(badRes.body).error}`);
  // Output: Status: 400
  // Output: Error: Invalid JSON in request body

  // ============================================================
  // EXAMPLE BLOCK 3 — Static File Serving via Streams
  // ============================================================

  console.log("\n=== BLOCK 3: Static File Serving via Streams ===\n");

  // ──────────────────────────────────────────────────────────
  // 3a — GET /menu.html (streamed response)
  // ──────────────────────────────────────────────────────────

  console.log("  --- GET /menu.html (streamed from file) ---");
  const htmlRes = await makeRequest({ ...base, path: "/menu.html", method: "GET" });
  console.log(`  Status: ${htmlRes.statusCode}`);
  console.log(`  Content-Type: ${htmlRes.headers["content-type"]}`);
  console.log(`  Content-Length: ${htmlRes.headers["content-length"]}`);
  console.log(`  Body preview: ${htmlRes.body.slice(0, 60)}...`);
  // Output: Status: 200
  // Output: Content-Type: text/html

  // WHY: The file was streamed chunk by chunk through pipe().
  //   If this were a 2GB video file, only a small buffer
  //   would be in memory at any time — that is the power
  //   of streams for static file serving.

  console.log("\n  --- Request metadata inspection ---");
  console.log("  req.method:  GET");
  console.log("  req.url:     /menu.html");
  console.log(`  req.headers: host=localhost:${address.port}`);
  console.log("");
}

// ──────────────────────────────────────────────────────────────
// Main — orchestrate setup → server → tests → cleanup
// ──────────────────────────────────────────────────────────────

async function main() {
  setup();

  const server = createDhabaServer();

  // Start server and wait for it to be ready
  await new Promise((resolve) => {
    server.listen(PORT, "localhost", () => {
      const addr = server.address();
      console.log(`  Server listening on http://localhost:${addr.port}\n`);
      resolve();
    });
  });

  // Run all test requests
  await runTests(server);

  // Close server and exit cleanly
  await new Promise((resolve) => {
    server.close(() => {
      console.log("  Server closed.\n");
      resolve();
    });
  });

  cleanup();

  // ============================================================
  // KEY TAKEAWAYS
  // ============================================================
  console.log("============================================================");
  console.log("KEY TAKEAWAYS");
  console.log("============================================================");
  console.log("1. http.createServer(callback) gives you raw (req, res) access.");
  console.log("2. req.url and req.method drive routing — frameworks add sugar on top.");
  console.log("3. res.writeHead(status, headers) sets the response line.");
  console.log("4. POST bodies arrive as streamed chunks — collect, concat, parse.");
  console.log("5. Pipe a ReadStream to res for efficient static file serving.");
  console.log("6. Content-Type headers tell the client how to interpret the body.");
  console.log("7. Port 0 lets the OS pick an available port — great for tests.");
  console.log("8. Always server.close() when done to prevent hanging processes.");
  console.log("============================================================\n");
}

main();
