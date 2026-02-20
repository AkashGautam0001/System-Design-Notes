/** ============================================================
 *  FILE 01: CLIENT-SERVER MODEL AND PROTOCOLS
 *  ============================================================
 *  Topics: Client-server, HTTP lifecycle, methods, status codes,
 *          headers, HTTPS/TLS, TCP vs UDP, DNS
 *
 *  WHY THIS MATTERS:
 *  Every single interaction on the internet follows the
 *  client-server model. Understanding how a browser talks to a
 *  server — DNS lookup, TCP connection, HTTP request/response,
 *  TLS encryption — is the bedrock of system design. Without
 *  this foundation, concepts like load balancing, caching, and
 *  microservices remain abstract.
 *  ============================================================ */

// STORY: IRCTC Ticket Booking
// Imagine you are booking a Tatkal ticket on IRCTC at 10:00 AM sharp.
// Your browser (the client) needs to find the IRCTC server first — that
// is DNS, like asking the station enquiry counter for the right platform.
// Then it establishes a TCP connection — a confirmed reservation on the
// train. Finally, your HTTP request carries your booking details, and the
// server responds with a confirmed ticket or a waiting-list status code.

console.log("=".repeat(70));
console.log("  FILE 01: CLIENT-SERVER MODEL AND PROTOCOLS");
console.log("=".repeat(70));
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 1 — DNS Resolution Simulation
// ════════════════════════════════════════════════════════════════

// WHY: Before any HTTP request, the browser must resolve the
// domain name (like www.irctc.co.in) to an IP address. This is
// the very first step in any web interaction.

console.log("--- SECTION 1: DNS Resolution Simulation ---\n");

class DNSResolver {
  constructor() {
    this.cache = new Map();
    this.rootServers = {
      ".in": "198.41.0.4",
      ".com": "199.7.91.13",
      ".org": "192.5.6.30",
    };
    this.authoritativeRecords = {
      "www.irctc.co.in": "49.50.68.130",
      "www.swiggy.com": "104.18.10.20",
      "www.flipkart.com": "163.53.78.150",
      "api.phonepe.com": "13.234.100.50",
      "www.hotstar.com": "52.66.120.45",
    };
  }

  resolve(domain) {
    console.log(`  [DNS] Resolving: ${domain}`);

    // Step 1: Check local cache
    if (this.cache.has(domain)) {
      const cached = this.cache.get(domain);
      console.log(`  [DNS] Cache HIT -> ${cached.ip} (TTL: ${cached.ttl}s)`);
      return cached.ip;
    }
    console.log("  [DNS] Cache MISS -> querying hierarchy...");

    // Step 2: Root server lookup
    const tld = "." + domain.split(".").pop();
    console.log(`  [DNS] Root server for '${tld}' -> ${this.rootServers[tld] || "unknown"}`);

    // Step 3: Authoritative lookup
    if (this.authoritativeRecords[domain]) {
      const ip = this.authoritativeRecords[domain];
      this.cache.set(domain, { ip, ttl: 300 });
      console.log(`  [DNS] Authoritative answer: ${domain} -> ${ip}`);
      console.log(`  [DNS] Cached with TTL=300s`);
      return ip;
    }

    console.log(`  [DNS] NXDOMAIN — domain not found`);
    return null;
  }
}

const dns = new DNSResolver();
dns.resolve("www.irctc.co.in");
console.log();
dns.resolve("www.irctc.co.in"); // Should hit cache
console.log();
dns.resolve("www.swiggy.com");
console.log();
dns.resolve("unknown.example.in");
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 2 — HTTP Request/Response Lifecycle
// ════════════════════════════════════════════════════════════════

// WHY: An HTTP transaction is the fundamental unit of web communication.
// Understanding the full lifecycle — connection, request, processing,
// response — is essential for debugging and optimization.

console.log("--- SECTION 2: HTTP Request/Response Lifecycle ---\n");

class HTTPClient {
  constructor(name) {
    this.name = name;
    this.connectionId = 0;
  }

  sendRequest(method, url, headers, body) {
    this.connectionId++;
    const connId = this.connectionId;
    const steps = [];

    steps.push(`[Step 1] ${this.name} resolves DNS for ${url}`);
    steps.push(`[Step 2] TCP 3-way handshake (SYN -> SYN-ACK -> ACK)`);
    steps.push(`[Step 3] Send HTTP request: ${method} ${url}`);
    if (headers) {
      steps.push(`[Step 4] Headers: ${JSON.stringify(headers)}`);
    }
    if (body) {
      steps.push(`[Step 5] Body: ${JSON.stringify(body)}`);
    }
    steps.push(`[Step 6] Server processes request...`);
    steps.push(`[Step 7] Server sends response`);
    steps.push(`[Step 8] Connection closed (or kept alive)`);

    console.log(`  Request #${connId}:`);
    steps.forEach((s) => console.log(`    ${s}`));
    return { status: 200, connId };
  }
}

class HTTPServer {
  constructor(name) {
    this.name = name;
    this.routes = new Map();
  }

  addRoute(method, path, handler) {
    this.routes.set(`${method}:${path}`, handler);
  }

  handleRequest(method, path, body) {
    const key = `${method}:${path}`;
    const handler = this.routes.get(key);
    if (handler) {
      return handler(body);
    }
    return { status: 404, body: { error: "Route not found" } };
  }
}

const irctcServer = new HTTPServer("IRCTC");
irctcServer.addRoute("GET", "/api/trains", () => ({
  status: 200,
  body: { trains: ["Rajdhani Express", "Shatabdi Express", "Duronto Express"] },
}));
irctcServer.addRoute("POST", "/api/booking", (data) => ({
  status: 201,
  body: { pnr: "PNR" + Math.floor(Math.random() * 9000000000 + 1000000000), ...data },
}));

const client = new HTTPClient("Passenger-Browser");
client.sendRequest("GET", "/api/trains", { Accept: "application/json" });
console.log();

const trainResponse = irctcServer.handleRequest("GET", "/api/trains");
console.log("  Server Response:", JSON.stringify(trainResponse, null, 4));
console.log();

const bookingResponse = irctcServer.handleRequest("POST", "/api/booking", {
  train: "Rajdhani Express",
  from: "New Delhi",
  to: "Mumbai Central",
  class: "3A",
});
console.log("  Booking Response:", JSON.stringify(bookingResponse, null, 4));
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 3 — HTTP Methods with IRCTC Examples
// ════════════════════════════════════════════════════════════════

// WHY: Each HTTP method has specific semantics. Using the wrong
// method leads to security holes, caching issues, and confusion.
// GET for retrieval, POST for creation, PUT for full update,
// PATCH for partial update, DELETE for removal.

console.log("--- SECTION 3: HTTP Methods with IRCTC Examples ---\n");

class IRCTCMethodDemo {
  constructor() {
    this.bookings = new Map();
    this.nextId = 1;
  }

  GET(resource) {
    console.log(`  GET ${resource}`);
    console.log("    -> Safe, idempotent, cacheable");
    console.log("    -> IRCTC: Check train availability, view PNR status");
    if (resource === "/trains") {
      return { trains: ["12301 Rajdhani", "12002 Shatabdi"] };
    }
    return { message: "Resource listing" };
  }

  POST(resource, data) {
    console.log(`  POST ${resource}`);
    console.log("    -> NOT safe, NOT idempotent, NOT cacheable");
    console.log("    -> IRCTC: Book a new ticket, create a new journey");
    const id = this.nextId++;
    this.bookings.set(id, { ...data, id, status: "CONFIRMED" });
    return { id, status: "CONFIRMED" };
  }

  PUT(resource, data) {
    console.log(`  PUT ${resource}`);
    console.log("    -> NOT safe, IS idempotent");
    console.log("    -> IRCTC: Change entire passenger list for a booking");
    return { replaced: true, data };
  }

  PATCH(resource, data) {
    console.log(`  PATCH ${resource}`);
    console.log("    -> NOT safe, NOT necessarily idempotent");
    console.log("    -> IRCTC: Update meal preference on existing booking");
    return { patched: true, updated: data };
  }

  DELETE(resource) {
    console.log(`  DELETE ${resource}`);
    console.log("    -> NOT safe, IS idempotent");
    console.log("    -> IRCTC: Cancel a ticket");
    return { deleted: true };
  }
}

const methods = new IRCTCMethodDemo();
console.log("  Result:", JSON.stringify(methods.GET("/trains")));
console.log();
console.log("  Result:", JSON.stringify(methods.POST("/bookings", { passenger: "Arjun", train: "12301" })));
console.log();
console.log("  Result:", JSON.stringify(methods.PUT("/bookings/1", { passenger: "Arjun Kumar", train: "12301", berth: "SL" })));
console.log();
console.log("  Result:", JSON.stringify(methods.PATCH("/bookings/1", { meal: "Veg Thali" })));
console.log();
console.log("  Result:", JSON.stringify(methods.DELETE("/bookings/1")));
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 4 — Status Codes (1xx-5xx with Indian Context)
// ════════════════════════════════════════════════════════════════

// WHY: Status codes are how servers communicate results to clients.
// Misusing them causes poor error handling, broken retries, and
// confused API consumers.

console.log("--- SECTION 4: HTTP Status Codes ---\n");

const statusCodes = [
  { code: 100, text: "Continue", analogy: "IRCTC: 'We received your form, keep sending passenger details...'" },
  { code: 101, text: "Switching Protocols", analogy: "IRCTC: 'Upgrading to WebSocket for live PNR tracking'" },
  { code: 200, text: "OK", analogy: "IRCTC: 'Here is your train availability result'" },
  { code: 201, text: "Created", analogy: "IRCTC: 'Your ticket has been booked! PNR: 4521389076'" },
  { code: 204, text: "No Content", analogy: "IRCTC: 'Meal preference updated, nothing more to show'" },
  { code: 301, text: "Moved Permanently", analogy: "IRCTC: 'Old URL retired, use new irctc.co.in permanently'" },
  { code: 302, text: "Found (Redirect)", analogy: "IRCTC: 'Redirecting to payment gateway (SBI/ICICI)...'" },
  { code: 304, text: "Not Modified", analogy: "IRCTC: 'Train schedule has not changed, use your cached copy'" },
  { code: 400, text: "Bad Request", analogy: "IRCTC: 'Invalid station code entered — check your form'" },
  { code: 401, text: "Unauthorized", analogy: "IRCTC: 'Please login first before booking'" },
  { code: 403, text: "Forbidden", analogy: "IRCTC: 'Your account is blocked for suspicious activity'" },
  { code: 404, text: "Not Found", analogy: "IRCTC: 'No train exists with this number'" },
  { code: 429, text: "Too Many Requests", analogy: "IRCTC: 'Tatkal rush! Slow down, you are being rate-limited'" },
  { code: 500, text: "Internal Server Error", analogy: "IRCTC: 'Server crashed during Tatkal window'" },
  { code: 502, text: "Bad Gateway", analogy: "IRCTC: 'Payment gateway (Paytm/PhonePe) is not responding'" },
  { code: 503, text: "Service Unavailable", analogy: "IRCTC: 'Under maintenance — try after 11:45 PM'" },
  { code: 504, text: "Gateway Timeout", analogy: "IRCTC: 'Bank server took too long to confirm payment'" },
];

function categorizeStatus(code) {
  if (code < 200) return "1xx Informational";
  if (code < 300) return "2xx Success";
  if (code < 400) return "3xx Redirection";
  if (code < 500) return "4xx Client Error";
  return "5xx Server Error";
}

let currentCategory = "";
statusCodes.forEach((s) => {
  const cat = categorizeStatus(s.code);
  if (cat !== currentCategory) {
    currentCategory = cat;
    console.log(`\n  [ ${cat} ]`);
  }
  console.log(`    ${s.code} ${s.text}`);
  console.log(`      ${s.analogy}`);
});
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 5 — HTTP Headers Deep Dive
// ════════════════════════════════════════════════════════════════

// WHY: Headers carry metadata that controls caching, authentication,
// content negotiation, security, and more. They are the invisible
// backbone of every HTTP exchange.

console.log("--- SECTION 5: HTTP Headers Deep Dive ---\n");

const requestHeaders = {
  "Host": "www.irctc.co.in",
  "User-Agent": "Mozilla/5.0 (Linux; Android 12) Chrome/100",
  "Accept": "application/json",
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIs...",
  "Content-Type": "application/json",
  "Cookie": "session_id=abc123; irctc_lang=en",
};
console.log("  Request Headers (Browser -> IRCTC):");
Object.entries(requestHeaders).forEach(([k, v]) => console.log(`    ${k}: ${v}`));

const responseHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, must-revalidate",
  "ETag": '"abc123def456"',
  "Set-Cookie": "session_id=xyz789; HttpOnly; Secure; SameSite=Strict",
  "X-RateLimit-Remaining": "42",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
};
console.log("\n  Response Headers (IRCTC -> Browser):");
Object.entries(responseHeaders).forEach(([k, v]) => console.log(`    ${k}: ${v}`));

console.log("\n  Cache-Control Strategies:");
const cacheScenarios = [
  { resource: "Train schedule (static)", header: "public, max-age=86400", reason: "Cache for 24 hours" },
  { resource: "Seat availability (dynamic)", header: "no-cache, must-revalidate", reason: "Seats change every second" },
  { resource: "Payment page (sensitive)", header: "no-store", reason: "Never cache financial data" },
];
cacheScenarios.forEach((s) => {
  console.log(`    ${s.resource}: ${s.header} — ${s.reason}`);
});
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 6 — HTTPS/TLS Handshake Simulation
// ════════════════════════════════════════════════════════════════

// WHY: HTTPS encrypts data in transit, preventing eavesdropping
// and tampering. The TLS handshake is how client and server agree
// on encryption. Without it, your Tatkal password travels in
// plain text.

console.log("\n--- SECTION 6: HTTPS/TLS Handshake Simulation ---\n");

class TLSHandshake {
  static simulate(clientName, serverName) {
    const steps = [
      {
        step: "1. ClientHello",
        detail: `${clientName} -> ${serverName}: "I support TLS 1.3, ciphers: AES-256-GCM, ChaCha20"`,
        irctc: "Passenger says: 'I can speak Hindi and English'",
      },
      {
        step: "2. ServerHello",
        detail: `${serverName} -> ${clientName}: "Let us use TLS 1.3 with AES-256-GCM"`,
        irctc: "IRCTC says: 'Let us speak Hindi then'",
      },
      {
        step: "3. Certificate",
        detail: `${serverName} sends SSL certificate (signed by DigiCert CA)`,
        irctc: "IRCTC shows its government ID card",
      },
      {
        step: "4. Certificate Verify",
        detail: `${clientName} verifies certificate chain against trusted CAs`,
        irctc: "Passenger verifies the ID card is genuine",
      },
      {
        step: "5. Key Exchange (ECDHE)",
        detail: "Both sides generate ephemeral keys using Diffie-Hellman",
        irctc: "Both agree on a secret code only they know",
      },
      {
        step: "6. Finished",
        detail: "Symmetric encryption established, all data now encrypted",
        irctc: "All further conversation in secret code (encrypted)",
      },
    ];

    console.log(`  TLS Handshake: ${clientName} <-> ${serverName}`);
    console.log(`  ${"─".repeat(55)}`);
    steps.forEach((s) => {
      console.log(`\n    ${s.step}`);
      console.log(`      Technical: ${s.detail}`);
      console.log(`      Analogy:   ${s.irctc}`);
    });

    console.log(`\n  Result: Secure channel established!`);
    console.log(`  All booking data (passwords, card numbers) now encrypted.`);
  }
}

TLSHandshake.simulate("Chrome Browser", "irctc.co.in");
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 7 — TCP vs UDP Comparison
// ════════════════════════════════════════════════════════════════

// WHY: TCP and UDP are the two main transport protocols.
// TCP guarantees delivery (like a registered post);
// UDP is faster but unreliable (like shouting in a crowd).
// Choosing wrong = either slow apps or lost data.

console.log("\n--- SECTION 7: TCP vs UDP Comparison ---\n");

class TCPSimulator {
  static sendData(sender, receiver, packets) {
    console.log(`  TCP Transmission: ${sender} -> ${receiver}`);
    console.log(`  IRCTC Analogy: Confirmed reservation (guaranteed seat)`);
    console.log();

    let seqNum = 0;
    packets.forEach((pkt, i) => {
      seqNum += pkt.length;
      console.log(`    [SEQ=${seqNum}] Sent: "${pkt}"`);
      console.log(`    [ACK=${seqNum}] ${receiver} acknowledges receipt`);
    });

    console.log(`\n    Result: All ${packets.length} packets delivered IN ORDER`);
    console.log(`    Characteristics: Reliable, ordered, connection-oriented`);
    console.log(`    Use cases: IRCTC booking, bank transactions, file downloads`);
  }
}

class UDPSimulator {
  static sendData(sender, receiver, packets) {
    console.log(`\n  UDP Transmission: ${sender} -> ${receiver}`);
    console.log(`  IRCTC Analogy: Unreserved coach (no guarantee, first come first serve)`);
    console.log();

    packets.forEach((pkt, i) => {
      const lost = Math.random() < 0.2;
      if (lost) {
        console.log(`    [PACKET ${i + 1}] Sent: "${pkt}" -> LOST IN TRANSIT!`);
      } else {
        console.log(`    [PACKET ${i + 1}] Sent: "${pkt}" -> Received`);
      }
    });

    console.log(`\n    Result: Some packets may be lost, NO retransmission`);
    console.log(`    Characteristics: Fast, no connection, no ordering guarantee`);
    console.log(`    Use cases: Live cricket score, video call, DNS lookup, gaming`);
  }
}

TCPSimulator.sendData("Browser", "IRCTC", [
  "Book ticket",
  "Passenger: Arjun",
  "Train: 12301",
  "Payment: Rs 2500",
]);

UDPSimulator.sendData("Hotstar", "Mobile App", [
  "Score: 150/3",
  "Wicket! Kohli out",
  "Boundary by Rohit",
  "Over complete",
  "New bowler",
]);
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 8 — Connection Keep-Alive and Pooling
// ════════════════════════════════════════════════════════════════

// WHY: Opening a new TCP connection for every request is expensive.
// Keep-alive reuses connections, cutting latency drastically.
// This is why IRCTC pages load faster after the first request.

console.log("\n--- SECTION 8: Connection Keep-Alive ---\n");

class ConnectionPool {
  constructor(max) {
    this.max = max;
    this.active = [];
    this.idle = [];
    this.created = 0;
  }
  acquire(host) {
    const idleIdx = this.idle.findIndex((c) => c.host === host);
    if (idleIdx >= 0) {
      const conn = this.idle.splice(idleIdx, 1)[0];
      this.active.push(conn);
      console.log(`    [POOL] Reused connection #${conn.id} to ${host}`);
      return conn;
    }
    if (this.active.length < this.max) {
      this.created++;
      const conn = { id: this.created, host };
      this.active.push(conn);
      console.log(`    [POOL] New connection #${conn.id} to ${host} (TCP handshake...)`);
      return conn;
    }
    console.log(`    [POOL] Max reached! Queued.`);
    return null;
  }
  release(conn) {
    const idx = this.active.indexOf(conn);
    if (idx >= 0) { this.active.splice(idx, 1); this.idle.push(conn); }
    console.log(`    [POOL] Connection #${conn.id} returned to idle pool`);
  }
}

console.log("  Simulating IRCTC page load:\n");
const pool = new ConnectionPool(4);
const conns = [pool.acquire("irctc.co.in"), pool.acquire("irctc.co.in"), pool.acquire("irctc.co.in"), pool.acquire("irctc.co.in")];
pool.acquire("irctc.co.in"); // should queue
console.log();
conns.slice(0, 2).forEach((c) => pool.release(c));
pool.acquire("irctc.co.in"); // reuses
pool.acquire("irctc.co.in"); // reuses
console.log();
console.log("  WITHOUT keep-alive: 6 TCP handshakes = 6 x ~100ms = 600ms");
console.log("  WITH keep-alive:    4 handshakes + 2 reused = 400ms (33% faster)");
console.log();

// ════════════════════════════════════════════════════════════════
// KEY TAKEAWAYS
// ════════════════════════════════════════════════════════════════
console.log("=".repeat(70));
console.log("  KEY TAKEAWAYS");
console.log("=".repeat(70));
console.log();
console.log("  1. DNS translates domain names to IP addresses — it is the");
console.log("     internet's phone book, queried before every first connection.");
console.log();
console.log("  2. HTTP is a request-response protocol: client asks, server answers.");
console.log("     Each method (GET, POST, PUT, DELETE) has specific semantics.");
console.log();
console.log("  3. Status codes are not arbitrary — 2xx means success, 4xx means");
console.log("     the client made a mistake, 5xx means the server failed.");
console.log();
console.log("  4. Headers carry critical metadata: authentication, caching rules,");
console.log("     content types, and security policies.");
console.log();
console.log("  5. TLS/HTTPS encrypts all data in transit. The handshake establishes");
console.log("     trust (certificates) and a shared secret (key exchange).");
console.log();
console.log("  6. TCP guarantees delivery and order (booking transactions);");
console.log("     UDP sacrifices reliability for speed (live scores).");
console.log();
console.log("  7. Connection keep-alive and pooling dramatically reduce latency");
console.log("     by avoiding repeated TCP handshakes.");
console.log();
console.log("  8. Every IRCTC Tatkal booking exercises ALL of these concepts —");
console.log("     DNS, TCP, TLS, HTTP methods, status codes, and headers.");
console.log();
console.log('  "The journey of a single HTTP request through DNS, TCP, TLS, and');
console.log('   back is the foundation upon which all of system design is built."');
console.log('                                        — The IRCTC Architect');
console.log();
