/** ============================================================
 FILE 13: HTTP Client — Making Requests
 ============================================================
 Topic: http.get, http.request, global fetch (Node 18+),
        GET and POST requests, response handling
 WHY THIS MATTERS:
   Node.js is not just a server — it is also a powerful HTTP
   client. From calling APIs to microservice communication,
   knowing how to make requests is essential. And with
   global fetch(), the ergonomics just got much better.
 ============================================================ */

// ============================================================
// STORY: HIGHWAY DHABA CLIENT (continued)
//   Now we are on the other side of the window — the customer.
//   We place orders (requests), wait for food (responses),
//   and discover that some ordering methods are much easier
//   than others.
// ============================================================

const http = require("http");

const PORT = 0; // OS picks an available port

// ──────────────────────────────────────────────────────────────
// Temp Server — a simple API to make requests against
// ──────────────────────────────────────────────────────────────

function createTestServer() {
  return http.createServer((req, res) => {
    const { url, method } = req;

    if (method === "GET" && url === "/api/greeting") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Namaste from the dhaba!", time: new Date().toISOString() }));
      return;
    }

    if (method === "GET" && url === "/api/specials") {
      res.writeHead(200, {
        "Content-Type": "application/json",
        "X-Daily-Special": "Paneer Tikka",
      });
      res.end(JSON.stringify({
        specials: [
          { name: "Paneer Tikka", price: 220 },
          { name: "Aloo Paratha", price: 90 },
        ],
      }));
      return;
    }

    if (method === "POST" && url === "/api/order") {
      const chunks = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", () => {
        const body = JSON.parse(Buffer.concat(chunks).toString());
        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          confirmed: true,
          order: body,
          estimatedMinutes: 15,
        }));
      });
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  });
}

// ──────────────────────────────────────────────────────────────
// Helper: collect response body from an http response
// ──────────────────────────────────────────────────────────────

function collectBody(res) {
  return new Promise((resolve) => {
    const chunks = [];
    res.on("data", (chunk) => chunks.push(chunk));
    res.on("end", () => resolve(Buffer.concat(chunks).toString()));
  });
}

// ============================================================
// EXAMPLE BLOCK 1 — http.get() and http.request() for GET
// ============================================================

async function block1_httpGetAndRequest(port) {
  console.log("=== BLOCK 1: http.get() and http.request() ===\n");

  // ──────────────────────────────────────────────────────────
  // 1a — http.get() — shorthand for GET requests
  // ──────────────────────────────────────────────────────────

  console.log("  --- http.get() ---\n");

  // WHY: http.get() is a convenience method that automatically
  //   sets method to GET and calls req.end(). For GET requests
  //   it saves a couple lines of boilerplate.

  const getResult = await new Promise((resolve, reject) => {
    http.get(`http://localhost:${port}/api/greeting`, async (res) => {
      const body = await collectBody(res);
      resolve({ statusCode: res.statusCode, headers: res.headers, body });
    }).on("error", reject);
  });

  console.log(`  Status: ${getResult.statusCode}`);
  // Output: Status: 200
  console.log(`  Content-Type: ${getResult.headers["content-type"]}`);
  // Output: Content-Type: application/json
  const greeting = JSON.parse(getResult.body);
  console.log(`  Message: ${greeting.message}`);
  // Output: Message: Namaste from the dhaba!

  // ──────────────────────────────────────────────────────────
  // 1b — http.request() for GET — more control
  // ──────────────────────────────────────────────────────────

  console.log("\n  --- http.request() for GET ---\n");

  // WHY: http.request() gives you full control over method,
  //   headers, timeout, etc. You must call req.end() yourself.

  const reqResult = await new Promise((resolve, reject) => {
    const options = {
      hostname: "localhost",
      port: port,
      path: "/api/specials",
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Customer-Id": "cust-42",
      },
    };

    const req = http.request(options, async (res) => {
      const body = await collectBody(res);
      resolve({
        statusCode: res.statusCode,
        headers: res.headers,
        body,
      });
    });

    req.on("error", reject);
    req.end(); // WHY: Must call end() — http.request does NOT auto-call it.
  });

  console.log(`  Status: ${reqResult.statusCode}`);
  // Output: Status: 200
  console.log(`  X-Daily-Special header: ${reqResult.headers["x-daily-special"]}`);
  // Output: X-Daily-Special header: Paneer Tikka
  const specials = JSON.parse(reqResult.body);
  console.log(`  Specials: ${specials.specials.map((s) => s.name).join(", ")}`);
  // Output: Specials: Paneer Tikka, Aloo Paratha

  // ──────────────────────────────────────────────────────────
  // 1c — Handling a 404
  // ──────────────────────────────────────────────────────────

  console.log("\n  --- Handling 404 ---\n");

  const notFound = await new Promise((resolve, reject) => {
    http.get(`http://localhost:${port}/api/nonexistent`, async (res) => {
      const body = await collectBody(res);
      resolve({ statusCode: res.statusCode, body });
    }).on("error", reject);
  });

  console.log(`  Status: ${notFound.statusCode}`);
  // Output: Status: 404
  console.log(`  Body: ${notFound.body}`);
  // Output: Body: {"error":"Not found"}

  // WHY: http.get/request do NOT throw on 4xx/5xx — they just
  //   set the status code. You must check it yourself. This is
  //   unlike fetch() which also doesn't throw but has res.ok.

  console.log("");
}

// ============================================================
// EXAMPLE BLOCK 2 — POST Requests and Global fetch()
// ============================================================

async function block2_postAndFetch(port) {
  console.log("=== BLOCK 2: POST Requests & Global fetch() ===\n");

  // ──────────────────────────────────────────────────────────
  // 2a — POST with http.request()
  // ──────────────────────────────────────────────────────────

  console.log("  --- POST with http.request() ---\n");

  const postBody = JSON.stringify({
    item: "Tandoori Chicken",
    quantity: 3,
    notes: "Extra green chutney please",
  });

  const postResult = await new Promise((resolve, reject) => {
    const options = {
      hostname: "localhost",
      port: port,
      path: "/api/order",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postBody),
      },
    };

    const req = http.request(options, async (res) => {
      const body = await collectBody(res);
      resolve({ statusCode: res.statusCode, body });
    });

    req.on("error", reject);
    // WHY: For POST, you write the body to the request stream
    //   before calling end(). The request IS a writable stream.
    req.write(postBody);
    req.end();
  });

  console.log(`  Status: ${postResult.statusCode}`);
  // Output: Status: 201
  const orderConfirm = JSON.parse(postResult.body);
  console.log(`  Confirmed: ${orderConfirm.confirmed}`);
  console.log(`  Item: ${orderConfirm.order.item}`);
  console.log(`  ETA: ${orderConfirm.estimatedMinutes} minutes`);
  // Output: Confirmed: true

  // ──────────────────────────────────────────────────────────
  // 2b — Global fetch() for GET (Node 18+)
  // ──────────────────────────────────────────────────────────

  console.log("\n  --- Global fetch() — GET ---\n");

  // WHY: fetch() is built into Node 18+ (no node-fetch needed).
  //   It is MUCH simpler than http.request — no manual chunk
  //   collection, no req.end(), no callback nesting. This is
  //   the same API browsers have used for years.

  const fetchGetRes = await fetch(`http://localhost:${port}/api/greeting`);
  const fetchGetData = await fetchGetRes.json();

  console.log(`  Status: ${fetchGetRes.status}`);
  // Output: Status: 200
  console.log(`  ok: ${fetchGetRes.ok}`);
  // Output: ok: true
  console.log(`  Message: ${fetchGetData.message}`);
  // Output: Message: Namaste from the dhaba!

  // ──────────────────────────────────────────────────────────
  // 2c — Global fetch() for POST
  // ──────────────────────────────────────────────────────────

  console.log("\n  --- Global fetch() — POST ---\n");

  const fetchPostRes = await fetch(`http://localhost:${port}/api/order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      item: "Butter Naan",
      quantity: 4,
      notes: "Extra butter on the naan",
    }),
  });
  const fetchPostData = await fetchPostRes.json();

  console.log(`  Status: ${fetchPostRes.status}`);
  // Output: Status: 201
  console.log(`  Confirmed: ${fetchPostData.confirmed}`);
  console.log(`  Item: ${fetchPostData.order.item}`);
  // Output: Item: Butter Naan

  // ──────────────────────────────────────────────────────────
  // 2d — Ergonomics comparison
  // ──────────────────────────────────────────────────────────

  console.log("\n  --- Ergonomics Comparison ---\n");
  console.log("  http.request():                     fetch():");
  console.log("  ─────────────────────────────────    ─────────────────────────────");
  console.log("  • Callback-based                    • Promise-based (async/await)");
  console.log("  • Manual chunk collection            • res.json() / res.text()");
  console.log("  • Must call req.end()                • Automatic");
  console.log("  • Must set Content-Length             • Automatic");
  console.log("  • No res.ok / res.status sugar        • res.ok, res.status built in");
  console.log("  • Available since Node 0.x            • Available since Node 18");
  console.log("  • Full stream-level control           • Higher-level abstraction");

  // WHY: Use fetch() for most HTTP client needs. Fall back to
  //   http.request() when you need stream-level control, custom
  //   agents, or compatibility with older Node versions.

  console.log("");
}

// ──────────────────────────────────────────────────────────────
// Main — start server, run blocks, close server
// ──────────────────────────────────────────────────────────────

async function main() {
  const server = createTestServer();

  // Start server
  const port = await new Promise((resolve) => {
    server.listen(PORT, "localhost", () => {
      const addr = server.address();
      console.log(`  [Test Server] Listening on http://localhost:${addr.port}\n`);
      resolve(addr.port);
    });
  });

  // Run test blocks
  await block1_httpGetAndRequest(port);
  await block2_postAndFetch(port);

  // Close server
  await new Promise((resolve) => {
    server.close(() => {
      console.log("  [Test Server] Closed.\n");
      resolve();
    });
  });

  // ============================================================
  // KEY TAKEAWAYS
  // ============================================================
  console.log("============================================================");
  console.log("KEY TAKEAWAYS");
  console.log("============================================================");
  console.log("1. http.get() is a shorthand for GET — auto-calls req.end().");
  console.log("2. http.request() gives full control but requires manual req.end().");
  console.log("3. Response body arrives as chunks — collect and concat them.");
  console.log("4. 4xx/5xx do NOT throw — always check res.statusCode yourself.");
  console.log("5. For POST, write the body to the request stream before end().");
  console.log("6. fetch() (Node 18+) is promise-based and much more ergonomic.");
  console.log("7. fetch() has res.json(), res.text(), res.ok — no chunk wrangling.");
  console.log("8. Use http.request() when you need stream-level control or old Node.");
  console.log("============================================================\n");
}

main();
