/** ============================================================
 *  FILE 04: SERIALIZATION AND API PATTERNS
 *  ============================================================
 *  Topics: JSON vs Protobuf, GraphQL vs REST, request batching,
 *          API gateway, BFF pattern
 *
 *  WHY THIS MATTERS:
 *  How you serialize data determines bandwidth usage, parsing
 *  speed, and cross-language compatibility. How you structure
 *  API access (gateway, BFF, batching) determines developer
 *  productivity and system maintainability. PhonePe processes
 *  billions of UPI transactions — every byte and millisecond
 *  in serialization matters at that scale.
 *  ============================================================ */

// STORY: PhonePe UPI Payments
// When you pay your chai-wallah via PhonePe, a JSON request leaves
// your phone — human-readable, like a handwritten receipt. But between
// NPCI (National Payments Corporation of India) and banks, data flies
// as compact binary (like Protobuf) — because when you process 10
// billion transactions a month, every saved byte means terabytes saved.
// The API gateway at PhonePe is like NPCI itself — a central switch
// routing your payment to the right bank, handling auth, rate-limiting,
// and logging, so individual bank APIs stay simple.

console.log("=".repeat(70));
console.log("  FILE 04: SERIALIZATION AND API PATTERNS");
console.log("=".repeat(70));
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 1 — JSON Serialization and Deserialization
// ════════════════════════════════════════════════════════════════

// WHY: JSON is the lingua franca of web APIs. Every REST API
// speaks JSON. Understanding serialization nuances (date handling,
// BigInt issues, circular references) prevents production bugs.

console.log("--- SECTION 1: JSON Serialization/Deserialization ---\n");

class JSONDemo {
  static basicSerialization() {
    const upiTransaction = {
      transactionId: "TXN202401150001",
      from: { vpa: "arjun@phonepe", name: "Arjun Kumar", bank: "ICICI" },
      to: { vpa: "chaiwala@paytm", name: "Raju Tea Stall", bank: "SBI" },
      amount: 30,
      currency: "INR",
      timestamp: new Date().toISOString(),
      status: "SUCCESS",
      metadata: { location: "Koramangala, Bangalore", device: "Android" },
    };

    const jsonString = JSON.stringify(upiTransaction);
    const jsonPretty = JSON.stringify(upiTransaction, null, 2);

    console.log("  UPI Transaction Object -> JSON String:");
    console.log(`  Compact (${jsonString.length} bytes):`);
    console.log(`    ${jsonString.substring(0, 100)}...`);
    console.log(`\n  Pretty-printed:`);
    jsonPretty.split("\n").forEach((line) => console.log(`    ${line}`));

    // Deserialization
    const parsed = JSON.parse(jsonString);
    console.log(`\n  Deserialized back:`);
    console.log(`    from: ${parsed.from.vpa} -> to: ${parsed.to.vpa}`);
    console.log(`    amount: Rs ${parsed.amount}`);
    console.log(`    JSON size: ${jsonString.length} bytes`);
    return jsonString.length;
  }

  static edgeCases() {
    console.log("\n  JSON Edge Cases:");

    // Undefined is dropped
    const obj1 = { a: 1, b: undefined, c: null };
    console.log(`    {a:1, b:undefined, c:null} -> ${JSON.stringify(obj1)}`);
    console.log("    Note: 'undefined' is silently dropped, 'null' is preserved");

    // Date becomes string
    const obj2 = { created: new Date("2024-01-15") };
    const parsed = JSON.parse(JSON.stringify(obj2));
    console.log(`    Date object -> "${parsed.created}" (string, not Date!)`);
    console.log("    Always use new Date(parsed.created) after parsing");

    // BigInt fails
    try {
      JSON.stringify({ amount: BigInt(999999999999) });
    } catch (e) {
      console.log(`    BigInt -> TypeError: ${e.message}`);
      console.log("    Solution: Convert to string before serializing");
    }

    // Custom serializer with replacer
    const withBigInt = { amount: "999999999999", type: "bigint-as-string" };
    console.log(`    Workaround: ${JSON.stringify(withBigInt)}`);

    // toJSON method
    class Transaction {
      constructor(id, amount) {
        this.id = id;
        this.amount = amount;
        this.internalSecret = "should-not-leak";
      }
      toJSON() {
        return { id: this.id, amount: this.amount };
      }
    }
    const txn = new Transaction("TXN001", 500);
    console.log(`    toJSON() method: ${JSON.stringify(txn)}`);
    console.log("    toJSON() controls what gets serialized (hides secrets)");
  }
}

const jsonSize = JSONDemo.basicSerialization();
JSONDemo.edgeCases();
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 2 — Protobuf-Style Binary Encoding
// ════════════════════════════════════════════════════════════════

// WHY: Protobuf encodes data in binary, using field numbers instead
// of field names. This saves 30-80% space over JSON. At PhonePe's
// scale (10B+ transactions/month), this saves petabytes.

console.log("--- SECTION 2: Protobuf-Style Binary Encoding ---\n");

class SimpleBinaryEncoder {
  constructor() {
    this.buffer = [];
  }

  // Simplified varint encoding (like Protobuf)
  encodeVarint(value) {
    const bytes = [];
    while (value > 127) {
      bytes.push((value & 0x7f) | 0x80);
      value = value >>> 7;
    }
    bytes.push(value & 0x7f);
    return bytes;
  }

  encodeString(fieldNumber, value) {
    // Wire type 2 (length-delimited) for strings
    const tag = (fieldNumber << 3) | 2;
    const encoded = Buffer.from(value, "utf-8");
    this.buffer.push(...this.encodeVarint(tag));
    this.buffer.push(...this.encodeVarint(encoded.length));
    this.buffer.push(...encoded);
  }

  encodeInt(fieldNumber, value) {
    // Wire type 0 (varint) for integers
    const tag = (fieldNumber << 3) | 0;
    this.buffer.push(...this.encodeVarint(tag));
    this.buffer.push(...this.encodeVarint(value));
  }

  getBuffer() {
    return Buffer.from(this.buffer);
  }

  getSize() {
    return this.buffer.length;
  }
}

console.log("  Protobuf Schema (conceptual):");
console.log("    message UPITransaction {");
console.log("      string transaction_id = 1;");
console.log("      string from_vpa = 2;");
console.log("      string to_vpa = 3;");
console.log("      int32 amount = 4;");
console.log("      string status = 5;");
console.log("    }\n");

const encoder = new SimpleBinaryEncoder();
encoder.encodeString(1, "TXN202401150001");
encoder.encodeString(2, "arjun@phonepe");
encoder.encodeString(3, "chaiwala@paytm");
encoder.encodeInt(4, 30);
encoder.encodeString(5, "SUCCESS");

const binarySize = encoder.getSize();
const binaryHex = encoder.getBuffer().toString("hex");

console.log(`  Binary encoded: ${binaryHex}`);
console.log(`  Binary size: ${binarySize} bytes`);
console.log(`  JSON size:   ${jsonSize} bytes (from Section 1)`);
console.log(`  Savings:     ${((1 - binarySize / jsonSize) * 100).toFixed(1)}% smaller`);
console.log();

console.log("  Why Protobuf is faster:");
console.log("    - No field name strings (uses 1-byte field numbers)");
console.log("    - Varint encoding for integers (small numbers = fewer bytes)");
console.log("    - No quotes, colons, commas, braces");
console.log("    - Schema-defined: both sides know the structure");
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 3 — Size and Speed Comparison
// ════════════════════════════════════════════════════════════════

// WHY: Choosing between JSON and binary formats is a real
// engineering decision. This section quantifies the difference.

console.log("--- SECTION 3: Size/Speed Comparison ---\n");

function benchmarkSerialization(iterations) {
  const transaction = {
    transactionId: "TXN202401150001",
    fromVpa: "arjun@phonepe",
    toVpa: "chaiwala@paytm",
    amount: 30,
    status: "SUCCESS",
  };

  // JSON benchmark
  const jsonStart = Date.now();
  let jsonSizeTotal = 0;
  for (let i = 0; i < iterations; i++) {
    const str = JSON.stringify(transaction);
    JSON.parse(str);
    jsonSizeTotal += str.length;
  }
  const jsonTime = Date.now() - jsonStart;

  // Simple binary benchmark
  const binStart = Date.now();
  let binSizeTotal = 0;
  for (let i = 0; i < iterations; i++) {
    const enc = new SimpleBinaryEncoder();
    enc.encodeString(1, transaction.transactionId);
    enc.encodeString(2, transaction.fromVpa);
    enc.encodeString(3, transaction.toVpa);
    enc.encodeInt(4, transaction.amount);
    enc.encodeString(5, transaction.status);
    binSizeTotal += enc.getSize();
  }
  const binTime = Date.now() - binStart;

  console.log(`  Benchmark: ${iterations.toLocaleString()} serialization+deserialization cycles`);
  console.log();
  console.log(`  ${"Format".padEnd(15)} ${"Time (ms)".padEnd(15)} ${"Total Size".padEnd(18)} ${"Per Message".padEnd(15)}`);
  console.log(`  ${"─".repeat(15)} ${"─".repeat(15)} ${"─".repeat(18)} ${"─".repeat(15)}`);
  console.log(`  ${"JSON".padEnd(15)} ${String(jsonTime + "ms").padEnd(15)} ${jsonSizeTotal.toLocaleString().padEnd(18)} ${(jsonSizeTotal / iterations).toFixed(0)} bytes`);
  console.log(`  ${"Binary".padEnd(15)} ${String(binTime + "ms").padEnd(15)} ${binSizeTotal.toLocaleString().padEnd(18)} ${(binSizeTotal / iterations).toFixed(0)} bytes`);
  console.log();

  // Scale calculation
  const dailyTransactions = 300000000; // 300M daily UPI transactions
  const jsonDaily = (dailyTransactions * (jsonSizeTotal / iterations)) / (1024 * 1024 * 1024);
  const binDaily = (dailyTransactions * (binSizeTotal / iterations)) / (1024 * 1024 * 1024);
  console.log(`  At PhonePe scale (300M daily transactions):`);
  console.log(`    JSON bandwidth: ~${jsonDaily.toFixed(1)} GB/day`);
  console.log(`    Binary bandwidth: ~${binDaily.toFixed(1)} GB/day`);
  console.log(`    Savings: ~${(jsonDaily - binDaily).toFixed(1)} GB/day`);
}

benchmarkSerialization(10000);
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 4 — GraphQL Concepts
// ════════════════════════════════════════════════════════════════

// WHY: GraphQL lets the client ask for exactly the data it needs —
// no more, no less. It solves REST's over-fetching and
// under-fetching problems, especially for mobile apps with
// limited bandwidth.

console.log("--- SECTION 4: GraphQL Concepts ---\n");

const fullUser = { id: 1, name: "Arjun", vpa: "arjun@phonepe", balance: 15000, transactions: [101, 102, 103] };

console.log("  Problem 1: REST Over-fetching");
console.log(`    REST GET /api/users/1 returns: ${JSON.stringify(fullUser)}`);
console.log("    Mobile only needs name + vpa. Wasted: balance, transactions");
console.log("    GraphQL: query { user(id:1) { name, vpa } }");
console.log(`    Response: ${JSON.stringify({ name: "Arjun", vpa: "arjun@phonepe" })} (zero waste)\n`);

console.log("  Problem 2: REST Under-fetching (N+1)");
console.log("    REST needs 4 calls: GET /users/1, GET /txn/101, /102, /103");
console.log("    GraphQL: single query { user(id:1) { name, transactions { amount, to } } }");
const gqlResult = { name: "Arjun", transactions: [
  { amount: 30, to: "chaiwala@paytm" }, { amount: 500, to: "flipkart@upi" }, { amount: 2000, to: "rent@upi" }
]};
console.log(`    Response: ${JSON.stringify(gqlResult)}`);
console.log("    1 round trip instead of 4!\n");

// ════════════════════════════════════════════════════════════════
// SECTION 5 — Request Batching
// ════════════════════════════════════════════════════════════════

// WHY: Multiple small API calls create overhead (TCP connection,
// headers, latency per request). Batching combines them into a
// single request, reducing round trips — critical for mobile
// apps on slow networks.

console.log("--- SECTION 5: Request Batching ---\n");

const endpoints = ["/api/user/balance", "/api/user/recent-txns", "/api/offers", "/api/bills/pending", "/api/rewards"];

console.log("  Without batching: 5 separate HTTP calls (~100ms each):");
endpoints.forEach((e, i) => console.log(`    ${i + 1}. GET ${e}`));
console.log("    Total: ~500ms sequential, ~150ms parallel (5 connections)\n");

console.log("  With batching: POST /api/batch (single HTTP call):");
console.log(`    Body: ${JSON.stringify({ batch: endpoints.map(p => ({ method: "GET", path: p })) })}`);
console.log("    Total: ~120ms (server parallelizes internally)");
console.log("    Benefits: fewer TCP/TLS handshakes, reduced headers, mobile-friendly\n");

// ════════════════════════════════════════════════════════════════
// SECTION 6 — API Gateway Pattern
// ════════════════════════════════════════════════════════════════

// WHY: An API gateway is the single entry point for all clients.
// It handles cross-cutting concerns (auth, rate-limiting, logging)
// so microservices stay focused on business logic. PhonePe's
// gateway is like NPCI — the central switch for all UPI traffic.

console.log("--- SECTION 6: API Gateway Pattern ---\n");

class APIGateway {
  constructor(name) {
    this.name = name;
    this.services = new Map();
    this.rateLimits = new Map();
    this.requestCount = 0;
  }

  registerService(path, service) {
    this.services.set(path, service);
  }

  setRateLimit(clientId, maxRequests) {
    this.rateLimits.set(clientId, { max: maxRequests, current: 0 });
  }

  handleRequest(clientId, method, path, headers, body) {
    this.requestCount++;
    const reqId = `REQ-${this.requestCount}`;
    console.log(`  [${this.name}] ${reqId}: ${method} ${path}`);

    // Step 1: Authentication
    if (!headers || !headers.Authorization) {
      console.log(`    [AUTH] 401 Unauthorized — missing token`);
      return { status: 401, error: "Missing authorization" };
    }
    console.log(`    [AUTH] Token verified for ${clientId}`);

    // Step 2: Rate limiting
    const limit = this.rateLimits.get(clientId);
    if (limit) {
      limit.current++;
      if (limit.current > limit.max) {
        console.log(`    [RATE] 429 Too Many Requests (${limit.current}/${limit.max})`);
        return { status: 429, error: "Rate limit exceeded" };
      }
      console.log(`    [RATE] ${limit.current}/${limit.max} requests used`);
    }

    // Step 3: Route to service
    const pathPrefix = "/" + path.split("/").filter(Boolean).slice(0, 2).join("/");
    const service = this.services.get(pathPrefix);
    if (!service) {
      console.log(`    [ROUTE] 404 — no service for ${pathPrefix}`);
      return { status: 404, error: "Service not found" };
    }
    console.log(`    [ROUTE] -> ${service.name}`);

    // Step 4: Request transformation
    console.log(`    [TRANSFORM] Added X-Request-ID: ${reqId}`);
    console.log(`    [TRANSFORM] Added X-Client-IP: 192.168.1.${Math.floor(Math.random() * 255)}`);

    // Step 5: Forward to service
    const response = service.handle(method, path, body);
    console.log(`    [RESPONSE] ${response.status} (${JSON.stringify(response.data).substring(0, 60)}...)`);

    // Step 6: Logging
    console.log(`    [LOG] Logged: ${method} ${path} -> ${response.status} (${Date.now()})`);

    return response;
  }
}

// Create microservices
const userService = {
  name: "UserService",
  handle: (method, path, body) => ({
    status: 200,
    data: { userId: 1, name: "Arjun", vpa: "arjun@phonepe", kycStatus: "verified" },
  }),
};

const paymentService = {
  name: "PaymentService",
  handle: (method, path, body) => ({
    status: 201,
    data: { txnId: "TXN" + Date.now(), amount: body?.amount || 0, status: "SUCCESS" },
  }),
};

const offerService = {
  name: "OfferService",
  handle: (method, path, body) => ({
    status: 200,
    data: { offers: [{ code: "PHONEPE50", discount: "50% cashback up to Rs 50" }] },
  }),
};

// Setup gateway
const gateway = new APIGateway("PhonePe-Gateway");
gateway.registerService("/api/users", userService);
gateway.registerService("/api/payments", paymentService);
gateway.registerService("/api/offers", offerService);
gateway.setRateLimit("mobile-app", 5);

console.log("  API Gateway processing requests:\n");
gateway.handleRequest("mobile-app", "GET", "/api/users/1", { Authorization: "Bearer token123" });
console.log();
gateway.handleRequest("mobile-app", "POST", "/api/payments/initiate", { Authorization: "Bearer token123" }, { amount: 30, to: "chaiwala@paytm" });
console.log();
gateway.handleRequest("mobile-app", "GET", "/api/offers", { Authorization: "Bearer token123" });
console.log();

// Missing auth
gateway.handleRequest("anonymous", "GET", "/api/users/1", {});
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 7 — BFF (Backend for Frontend) Pattern
// ════════════════════════════════════════════════════════════════

// WHY: Different clients (mobile, web, TV) need different data
// shapes and amounts. A mobile app needs compact data; a web
// dashboard needs rich data. BFF creates specialized backends
// for each frontend.

console.log("--- SECTION 7: BFF (Backend for Frontend) ---\n");

const txns = [
  { id: 101, amount: 30, to: "Chai" }, { id: 102, amount: 500, to: "Flipkart" },
  { id: 103, amount: 2000, to: "Rent" }, { id: 104, amount: 150, to: "Zomato" },
];

const mobileResp = {
  greeting: "Hi Arjun",
  balance: "Rs 15,000",
  recentTransactions: txns.slice(0, 3).map(t => ({ amount: `Rs ${t.amount}`, to: t.to })),
  topOffer: "50% cashback up to Rs 50",
};

const webResp = {
  user: { id: 1, name: "Arjun", email: "arjun@email.com", vpa: "arjun@phonepe" },
  balance: { amount: 15000, currency: "INR", formatted: "Rs 15,000" },
  transactions: txns,
  offers: [{ code: "PHONEPE50", text: "50% cashback" }, { code: "NEWUSER", text: "Rs 100 cashback" }],
  analytics: { totalSpent: txns.reduce((s, t) => s + t.amount, 0), count: txns.length },
  quickActions: ["Send Money", "Pay Bills", "Recharge", "Bank Transfer"],
};

console.log("  Mobile BFF (compact):");
console.log(`    ${JSON.stringify(mobileResp)}`);
console.log(`    Size: ${JSON.stringify(mobileResp).length} bytes\n`);
console.log("  Web BFF (rich, dashboard-ready):");
console.log(`    ${JSON.stringify(webResp)}`);
console.log(`    Size: ${JSON.stringify(webResp).length} bytes`);
console.log(`\n  Mobile saves ${((1 - JSON.stringify(mobileResp).length / JSON.stringify(webResp).length) * 100).toFixed(0)}% bandwidth. Each frontend gets exactly what it needs.`);
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 8 — Choosing the Right Serialization Format
// ════════════════════════════════════════════════════════════════

// WHY: There is no one-size-fits-all. JSON for external APIs,
// Protobuf for internal services, MessagePack for a middle ground.
// This decision matrix helps choose.

console.log("--- SECTION 8: Choosing Serialization Format ---\n");

const formats = [
  { name: "JSON",     readable: "Yes", size: "Large",  speed: "Moderate", schema: "No",  use: "Mobile app <-> Gateway" },
  { name: "Protobuf", readable: "No",  size: "Small",  speed: "Fast",     schema: "Yes", use: "PhonePe <-> NPCI" },
  { name: "MsgPack",  readable: "No",  size: "Medium", speed: "Fast",     schema: "No",  use: "Redis cache values" },
  { name: "Avro",     readable: "No",  size: "Small",  speed: "Fast",     schema: "Yes", use: "Kafka event streams" },
  { name: "XML",      readable: "Yes", size: "Huge",   speed: "Slow",     schema: "No",  use: "Legacy bank NEFT/RTGS" },
];
console.log(`  ${"Format".padEnd(12)} ${"Readable".padEnd(10)} ${"Size".padEnd(9)} ${"Speed".padEnd(10)} ${"Schema".padEnd(8)} PhonePe Use`);
console.log(`  ${"─".repeat(12)} ${"─".repeat(10)} ${"─".repeat(9)} ${"─".repeat(10)} ${"─".repeat(8)} ${"─".repeat(22)}`);
formats.forEach(f => {
  console.log(`  ${f.name.padEnd(12)} ${f.readable.padEnd(10)} ${f.size.padEnd(9)} ${f.speed.padEnd(10)} ${f.schema.padEnd(8)} ${f.use}`);
});
console.log("\n  Decision: Readable? JSON | Smallest+fastest? Protobuf | No schema binary? MsgPack | Kafka? Avro | Legacy? XML");
console.log();

// ════════════════════════════════════════════════════════════════
// KEY TAKEAWAYS
// ════════════════════════════════════════════════════════════════
console.log("=".repeat(70));
console.log("  KEY TAKEAWAYS");
console.log("=".repeat(70));
console.log();
console.log("  1. JSON is human-readable and universal but verbose. Watch out");
console.log("     for edge cases: undefined is dropped, Dates become strings,");
console.log("     BigInt throws errors.");
console.log();
console.log("  2. Protobuf (binary) is 30-80% smaller than JSON and faster to");
console.log("     parse — critical at PhonePe's scale of billions of transactions.");
console.log();
console.log("  3. GraphQL solves over-fetching (getting too much data) and");
console.log("     under-fetching (N+1 calls) by letting the client specify");
console.log("     exactly what fields it needs.");
console.log();
console.log("  4. Request batching combines multiple API calls into one HTTP");
console.log("     request, reducing network overhead — especially on mobile.");
console.log();
console.log("  5. API Gateway is the single entry point that handles auth,");
console.log("     rate limiting, routing, and logging — so microservices stay");
console.log("     focused on business logic.");
console.log();
console.log("  6. BFF (Backend for Frontend) creates tailored API layers for");
console.log("     each client type — mobile gets compact data, web gets rich data.");
console.log();
console.log("  7. Choose serialization by context: JSON for external APIs,");
console.log("     Protobuf for internal services, Avro for event streams.");
console.log();
console.log('  "In the UPI ecosystem, every byte saved per transaction saves');
console.log('   petabytes at scale. Serialization is not a detail — it is');
console.log('   an architectural decision."');
console.log('                                          — The PhonePe Architect');
console.log();
