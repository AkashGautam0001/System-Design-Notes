/** ============================================================
 *  FILE 03: NETWORKING DEEP DIVE
 *  ============================================================
 *  Topics: TCP handshake, connection pooling, WebSockets,
 *          long polling, SSE, HTTP/2, gRPC basics
 *
 *  WHY THIS MATTERS:
 *  Modern applications demand real-time communication — live
 *  cricket scores, chat messages, stock tickers. Understanding
 *  the trade-offs between polling, WebSockets, SSE, and HTTP/2
 *  determines whether your app feels instant or laggy. Choosing
 *  the wrong protocol costs bandwidth, battery, and users.
 *  ============================================================ */

// STORY: Hotstar Live Cricket Streaming
// During an India vs Australia match, 25 million concurrent users watch
// on Hotstar. The TCP handshake is like the toss — both sides agree on
// rules before the match begins. WebSocket is like live commentary —
// a persistent channel where the server pushes every ball, boundary,
// and wicket instantly. SSE is like push notifications on your phone —
// one-way updates from server to client. Hotstar uses all three
// depending on the feature: WebSocket for live scores, SSE for
// notifications, and HTTP/2 for loading the UI assets in parallel.

console.log("=".repeat(70));
console.log("  FILE 03: NETWORKING DEEP DIVE");
console.log("=".repeat(70));
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 1 — TCP 3-Way Handshake Simulation
// ════════════════════════════════════════════════════════════════

// WHY: TCP is the foundation of reliable communication on the internet.
// Every HTTP request, every WebSocket connection, every database query
// begins with this handshake. Understanding it explains connection
// latency and why keep-alive matters.

console.log("--- SECTION 1: TCP 3-Way Handshake ---\n");

class TCPHandshake {
  static simulate(client, server) {
    const clientISN = Math.floor(Math.random() * 10000);
    const serverISN = Math.floor(Math.random() * 10000);
    console.log(`  ${client} <-> ${server} TCP Handshake`);
    console.log(`  ${"─".repeat(55)}`);
    console.log(`\n  Step 1: SYN — ${client} -> ${server}`);
    console.log(`    Seq: ${clientISN} | "${client} wants to connect" | Cricket: "Captain walks for toss"`);
    console.log(`\n  Step 2: SYN-ACK — ${server} -> ${client}`);
    console.log(`    Seq: ${serverISN}, Ack: ${clientISN + 1} | "Agreed, here is my number" | Cricket: "Other captain agrees"`);
    console.log(`\n  Step 3: ACK — ${client} -> ${server}`);
    console.log(`    Seq: ${clientISN + 1}, Ack: ${serverISN + 1} | "Confirmed!" | Cricket: "Match begins!"`);
    console.log(`\n  Connection ESTABLISHED. Total: ~1.5 RTT. If RTT=50ms, handshake=~75ms`);
  }
  static terminate(client, server) {
    console.log(`\n  4-Way Termination: FIN -> ACK -> FIN -> ACK ("Stumps drawn")\n`);
  }
}

TCPHandshake.simulate("Hotstar App", "Hotstar CDN");
TCPHandshake.terminate("Hotstar App", "Hotstar CDN");

// ════════════════════════════════════════════════════════════════
// SECTION 2 — Connection Pooling
// ════════════════════════════════════════════════════════════════

// WHY: Creating a new TCP connection for every request is expensive
// (handshake + TLS = ~150ms). Connection pooling maintains a pool
// of reusable connections, dramatically improving throughput.

console.log("--- SECTION 2: Connection Pooling ---\n");

class ConnectionPoolAdvanced {
  constructor(name, maxSize) {
    this.name = name;
    this.maxSize = maxSize;
    this.connections = [];
    this.stats = { created: 0, reused: 0, rejected: 0 };
  }
  acquire(requestId) {
    const idle = this.connections.find((c) => c.state === "idle");
    if (idle) {
      idle.state = "active";
      this.stats.reused++;
      console.log(`    [${this.name}] Req#${requestId}: Reused #${idle.id} (${this.connections.length}/${this.maxSize})`);
      return idle;
    }
    if (this.connections.length < this.maxSize) {
      const conn = { id: this.connections.length + 1, state: "active" };
      this.connections.push(conn);
      this.stats.created++;
      console.log(`    [${this.name}] Req#${requestId}: New #${conn.id} (${this.connections.length}/${this.maxSize})`);
      return conn;
    }
    this.stats.rejected++;
    console.log(`    [${this.name}] Req#${requestId}: Pool exhausted! Queued.`);
    return null;
  }
  release(conn) { conn.state = "idle"; }
}

console.log("  Simulating Hotstar during India vs Australia match:\n");
const hotstarPool = new ConnectionPoolAdvanced("Hotstar-API", 5);
const acquired = [];
for (let i = 1; i <= 7; i++) { const c = hotstarPool.acquire(i); if (c) acquired.push(c); }
console.log();
acquired.slice(0, 3).forEach((c) => hotstarPool.release(c));
console.log("    Released 3 connections\n");
for (let i = 8; i <= 10; i++) hotstarPool.acquire(i);
console.log(`\n    Stats: ${JSON.stringify(hotstarPool.stats)}\n`);

// ════════════════════════════════════════════════════════════════
// SECTION 3 — WebSocket Lifecycle
// ════════════════════════════════════════════════════════════════

// WHY: WebSocket provides full-duplex communication over a single
// TCP connection. Unlike HTTP (request-response), data flows both
// ways simultaneously — perfect for live cricket scores.

console.log("--- SECTION 3: WebSocket Lifecycle ---\n");

class WebSocketSimulator {
  constructor(url) {
    this.url = url;
    this.state = "CLOSED";
    this.messageLog = [];
    this.listeners = {};
  }

  connect() {
    console.log(`  [WS] Connecting to ${this.url}...`);
    console.log(`  [WS] HTTP Upgrade Request:`);
    console.log(`    GET /live-score HTTP/1.1`);
    console.log(`    Host: ws.hotstar.com`);
    console.log(`    Upgrade: websocket`);
    console.log(`    Connection: Upgrade`);
    console.log(`    Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==`);
    console.log(`    Sec-WebSocket-Version: 13`);
    console.log();
    console.log(`  [WS] HTTP 101 Switching Protocols`);
    console.log(`    Upgrade: websocket`);
    console.log(`    Connection: Upgrade`);
    console.log(`    Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=`);
    this.state = "OPEN";
    console.log(`\n  [WS] State: ${this.state} — full-duplex channel ready!`);
  }

  send(message) {
    if (this.state !== "OPEN") {
      console.log("  [WS] ERROR: Cannot send, connection not open");
      return;
    }
    this.messageLog.push({ direction: "CLIENT->SERVER", message, time: Date.now() });
    console.log(`  [WS] CLIENT -> SERVER: ${JSON.stringify(message)}`);
  }

  receive(message) {
    if (this.state !== "OPEN") return;
    this.messageLog.push({ direction: "SERVER->CLIENT", message, time: Date.now() });
    console.log(`  [WS] SERVER -> CLIENT: ${JSON.stringify(message)}`);
  }

  ping() {
    console.log(`  [WS] CLIENT -> SERVER: PING (heartbeat)`);
    console.log(`  [WS] SERVER -> CLIENT: PONG`);
    console.log(`  [WS] Connection alive, latency: ~12ms`);
  }

  close(code, reason) {
    console.log(`\n  [WS] Closing: code=${code}, reason="${reason}"`);
    console.log(`  [WS] CLIENT -> SERVER: Close frame`);
    console.log(`  [WS] SERVER -> CLIENT: Close frame (acknowledge)`);
    this.state = "CLOSED";
    console.log(`  [WS] State: ${this.state}`);
  }
}

const ws = new WebSocketSimulator("wss://ws.hotstar.com/live-score");
ws.connect();
console.log();

// Simulate live cricket score updates
ws.send({ type: "subscribe", match: "IND-vs-AUS-2024", channels: ["score", "commentary"] });
console.log();

const liveUpdates = [
  { over: "45.1", event: "FOUR", batsman: "Kohli", score: "156/3", detail: "Cover drive to the boundary!" },
  { over: "45.2", event: "DOT", batsman: "Kohli", score: "156/3", detail: "Defended on the front foot" },
  { over: "45.3", event: "SIX", batsman: "Kohli", score: "162/3", detail: "Massive six over long-on!" },
  { over: "45.4", event: "WICKET", batsman: "Kohli", score: "162/4", detail: "Caught at slip! Kohli departs for 89" },
];

console.log("  --- Live Score Stream ---");
liveUpdates.forEach((update) => {
  ws.receive(update);
});
console.log();

ws.ping();
console.log();
ws.close(1000, "Match ended");
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 4 — Long Polling vs Short Polling
// ════════════════════════════════════════════════════════════════

// WHY: Before WebSockets, polling was the only way to get "live"
// updates. Short polling wastes bandwidth; long polling is more
// efficient but still has overhead. Understanding both helps
// choose the right tool.

console.log("\n--- SECTION 4: Long Polling vs Short Polling ---\n");

class ShortPollingSimulator {
  constructor(serverName) {
    this.serverName = serverName;
    this.currentScore = { runs: 150, wickets: 3, overs: 42.3 };
    this.requestCount = 0;
    this.usefulResponses = 0;
  }

  poll() {
    this.requestCount++;
    const hasUpdate = Math.random() < 0.3;
    if (hasUpdate) {
      this.currentScore.runs += Math.floor(Math.random() * 6);
      this.currentScore.overs = (parseFloat(this.currentScore.overs) + 0.1).toFixed(1);
      this.usefulResponses++;
      return { hasUpdate: true, data: { ...this.currentScore } };
    }
    return { hasUpdate: false, data: null };
  }

  simulate(rounds) {
    console.log(`  Short Polling (every 2 seconds):`);
    console.log(`  Client keeps asking: "Any update? Any update? Any update?"\n`);

    for (let i = 0; i < rounds; i++) {
      const result = this.poll();
      const status = result.hasUpdate ? `200 OK — Score: ${result.data.runs}/${result.data.wickets}` : "304 Not Modified (wasted request)";
      console.log(`    Poll #${this.requestCount}: ${status}`);
    }

    const wastePercent = (((this.requestCount - this.usefulResponses) / this.requestCount) * 100).toFixed(0);
    console.log(`\n    Total requests: ${this.requestCount}`);
    console.log(`    Useful responses: ${this.usefulResponses}`);
    console.log(`    Wasted requests: ${this.requestCount - this.usefulResponses} (${wastePercent}%)`);
    console.log(`    Problem: ${wastePercent}% of requests wasted bandwidth!\n`);
  }
}

class LongPollingSimulator {
  constructor(serverName) {
    this.serverName = serverName;
    this.currentScore = { runs: 150, wickets: 3, overs: 42.3 };
    this.requestCount = 0;
  }

  poll() {
    this.requestCount++;
    // Server holds connection until update is available
    const waitTime = Math.floor(Math.random() * 10) + 1;
    this.currentScore.runs += Math.floor(Math.random() * 6) + 1;
    this.currentScore.overs = (parseFloat(this.currentScore.overs) + 0.1).toFixed(1);
    return { waitedSeconds: waitTime, data: { ...this.currentScore } };
  }

  simulate(rounds) {
    console.log(`  Long Polling:`);
    console.log(`  Client asks, server WAITS until there is an update to send.\n`);

    for (let i = 0; i < rounds; i++) {
      const result = this.poll();
      console.log(`    Request #${this.requestCount}: Server held for ~${result.waitedSeconds}s -> Score: ${result.data.runs}/${result.data.wickets}`);
    }

    console.log(`\n    Total requests: ${this.requestCount}`);
    console.log(`    EVERY response had useful data (0% waste)`);
    console.log(`    Trade-off: Server holds open connections (resource cost)\n`);
  }
}

const shortPoller = new ShortPollingSimulator("Hotstar");
shortPoller.simulate(10);

const longPoller = new LongPollingSimulator("Hotstar");
longPoller.simulate(5);

console.log("  Short Polling: High bandwidth waste, simple, good for low-frequency");
console.log("  Long Polling:  Low waste, server holds connections, near real-time");
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 5 — Server-Sent Events (SSE)
// ════════════════════════════════════════════════════════════════

// WHY: SSE provides a standard way for servers to push updates to
// clients over HTTP. Unlike WebSocket, it is one-directional
// (server to client only), simpler, and works with HTTP/2.

console.log("--- SECTION 5: Server-Sent Events (SSE) ---\n");

class SSESimulator {
  constructor(endpoint) {
    this.endpoint = endpoint;
    this.eventId = 0;
    this.retryMs = 3000;
  }

  connect() {
    console.log(`  [SSE] GET ${this.endpoint}`);
    console.log(`  [SSE] Accept: text/event-stream`);
    console.log(`  [SSE] Response: 200 OK`);
    console.log(`  [SSE] Content-Type: text/event-stream`);
    console.log(`  [SSE] Connection: keep-alive`);
    console.log(`  [SSE] Cache-Control: no-cache\n`);
  }

  pushEvent(eventType, data) {
    this.eventId++;
    console.log(`  id: ${this.eventId}`);
    console.log(`  event: ${eventType}`);
    console.log(`  data: ${JSON.stringify(data)}`);
    console.log(`  retry: ${this.retryMs}`);
    console.log();
  }

  simulateDisconnect() {
    console.log(`  [SSE] Connection dropped!`);
    console.log(`  [SSE] Browser auto-reconnects after ${this.retryMs}ms`);
    console.log(`  [SSE] Sends Last-Event-ID: ${this.eventId}`);
    console.log(`  [SSE] Server resumes from event ${this.eventId + 1}\n`);
  }
}

const sse = new SSESimulator("/api/match/IND-AUS/stream");
sse.connect();

console.log("  --- Hotstar Score Stream via SSE ---\n");
sse.pushEvent("score-update", { over: "46.1", runs: 165, wickets: 4, event: "Single" });
sse.pushEvent("score-update", { over: "46.2", runs: 169, wickets: 4, event: "FOUR! Straight drive!" });
sse.pushEvent("wicket", { over: "46.3", batsman: "Rahul", howOut: "LBW", bowler: "Starc" });
sse.pushEvent("notification", { message: "Strategic timeout called by India" });
sse.simulateDisconnect();

console.log("  SSE vs WebSocket:");
console.log("    SSE: Server->Client only, HTTP, auto-reconnect, text only, HTTP/2 OK");
console.log("    WS:  Bidirectional, upgrade protocol, manual reconnect, binary OK");
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 6 — HTTP/2 Multiplexing
// ════════════════════════════════════════════════════════════════

// WHY: HTTP/1.1 allows only one request per connection at a time
// (head-of-line blocking). HTTP/2 multiplexes many requests over
// a single connection — like multiple trains on parallel tracks.

console.log("--- SECTION 6: HTTP/2 Multiplexing ---\n");

class HTTP1Simulator {
  static simulate(resources) {
    console.log("  HTTP/1.1 (Sequential — one at a time per connection):");
    let totalTime = 0;
    const connCount = Math.min(6, resources.length); // Browser limit: 6 connections
    console.log(`  Browser opens ${connCount} parallel connections\n`);

    resources.forEach((r, i) => {
      const connId = (i % connCount) + 1;
      totalTime += r.size;
      console.log(`    Conn#${connId}: ${r.name.padEnd(25)} ${r.size}ms ${i < connCount ? "" : "(waited for slot)"}`);
    });

    const parallelTime = Math.ceil(resources.length / connCount) * Math.max(...resources.map((r) => r.size));
    console.log(`\n    Effective time (with ${connCount} connections): ~${parallelTime}ms`);
    console.log(`    Problem: Head-of-line blocking — slow resource blocks others on same connection\n`);
    return parallelTime;
  }
}

class HTTP2Simulator {
  static simulate(resources) {
    console.log("  HTTP/2 (Multiplexed — all over ONE connection):");
    console.log("  Single TCP connection, multiple streams in parallel\n");

    resources.forEach((r, i) => {
      console.log(`    Stream#${i + 1}: ${r.name.padEnd(25)} ${r.size}ms (concurrent)`);
    });

    const maxTime = Math.max(...resources.map((r) => r.size));
    console.log(`\n    Effective time: ~${maxTime}ms (limited by slowest resource)`);
    console.log(`    Bonus: Header compression (HPACK) saves ~30% header size`);
    console.log(`    Bonus: Server push — server sends CSS before browser asks\n`);
    return maxTime;
  }
}

const pageResources = [
  { name: "index.html", size: 50 },
  { name: "styles.css", size: 30 },
  { name: "app.js", size: 80 },
  { name: "logo.png", size: 40 },
  { name: "hero-banner.jpg", size: 120 },
  { name: "analytics.js", size: 20 },
  { name: "fonts.woff2", size: 60 },
  { name: "match-data.json", size: 35 },
];

console.log("  Loading Hotstar homepage:\n");
const http1Time = HTTP1Simulator.simulate(pageResources);
const http2Time = HTTP2Simulator.simulate(pageResources);

console.log(`  Improvement: HTTP/2 is ~${((1 - http2Time / http1Time) * 100).toFixed(0)}% faster for this page load`);
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 7 — gRPC Concepts
// ════════════════════════════════════════════════════════════════

// WHY: gRPC is Google's RPC framework using HTTP/2 and Protobuf.
// It is used for internal microservice communication where
// performance matters more than human readability.

console.log("--- SECTION 7: gRPC Concepts ---\n");

class GRPCSimulator {
  constructor(serviceName) {
    this.serviceName = serviceName;
    this.methods = new Map();
  }

  defineService(methods) {
    methods.forEach((m) => this.methods.set(m.name, m));
    console.log(`  service ${this.serviceName} {`);
    methods.forEach((m) => {
      const streamPrefix = m.serverStream ? "stream " : "";
      const clientStream = m.clientStream ? "stream " : "";
      console.log(`    rpc ${m.name}(${clientStream}${m.request}) returns (${streamPrefix}${m.response});`);
    });
    console.log("  }\n");
  }

  call(methodName, request) {
    const method = this.methods.get(methodName);
    if (!method) {
      console.log(`  ERROR: Method ${methodName} not found`);
      return;
    }

    console.log(`  gRPC Call: ${this.serviceName}.${methodName}`);
    console.log(`    Transport: HTTP/2`);
    console.log(`    Serialization: Protocol Buffers (binary)`);
    console.log(`    Request: ${JSON.stringify(request)}`);

    if (method.serverStream) {
      console.log(`    Type: Server Streaming`);
      console.log(`    Response stream:`);
      const responses = method.handler(request);
      responses.forEach((r, i) => console.log(`      [chunk ${i + 1}] ${JSON.stringify(r)}`));
    } else {
      console.log(`    Type: Unary`);
      const response = method.handler(request);
      console.log(`    Response: ${JSON.stringify(response)}`);
    }
    console.log();
  }
}

const matchService = new GRPCSimulator("MatchService");
matchService.defineService([
  {
    name: "GetMatchDetails",
    request: "MatchRequest",
    response: "MatchResponse",
    serverStream: false,
    clientStream: false,
    handler: (req) => ({
      matchId: req.matchId,
      teams: "IND vs AUS",
      venue: "Wankhede Stadium, Mumbai",
      status: "LIVE",
    }),
  },
  {
    name: "StreamScoreUpdates",
    request: "ScoreRequest",
    response: "ScoreUpdate",
    serverStream: true,
    clientStream: false,
    handler: (req) => [
      { over: "47.1", event: "Single", score: "170/4" },
      { over: "47.2", event: "FOUR", score: "174/4" },
      { over: "47.3", event: "Dot ball", score: "174/4" },
    ],
  },
]);

matchService.call("GetMatchDetails", { matchId: "IND-AUS-2024-01" });
matchService.call("StreamScoreUpdates", { matchId: "IND-AUS-2024-01" });

console.log("  gRPC Communication Patterns:");
console.log("    1. Unary:            Client sends 1 request, server sends 1 response");
console.log("    2. Server Streaming: Client sends 1 request, server sends many responses");
console.log("    3. Client Streaming: Client sends many requests, server sends 1 response");
console.log("    4. Bidirectional:    Both sides stream simultaneously");
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 8 — Choosing the Right Protocol
// ════════════════════════════════════════════════════════════════

// WHY: There is no "best" protocol — only the right tool for the
// job. This section provides a decision framework.

console.log("--- SECTION 8: Choosing the Right Protocol ---\n");

const protocolDecisions = [
  {
    scenario: "Hotstar live cricket score",
    requirement: "Real-time, server pushes updates",
    bestChoice: "WebSocket or SSE",
    reason: "Server needs to push instantly; WebSocket for bidirectional (chat), SSE for unidirectional (scores)",
  },
  {
    scenario: "Swiggy order tracking",
    requirement: "Periodic location updates",
    bestChoice: "WebSocket",
    reason: "Delivery partner sends location, user receives — bidirectional, frequent updates",
  },
  {
    scenario: "IRCTC train search",
    requirement: "One-time request-response",
    bestChoice: "REST over HTTP/2",
    reason: "Standard request-response, no real-time need, cacheable",
  },
  {
    scenario: "Hotstar internal microservices",
    requirement: "High throughput, low latency, service-to-service",
    bestChoice: "gRPC",
    reason: "Binary Protobuf encoding, HTTP/2 multiplexing, streaming support",
  },
  {
    scenario: "PhonePe payment status check",
    requirement: "Wait for payment confirmation",
    bestChoice: "Long Polling or WebSocket",
    reason: "Server waits for bank response, then pushes confirmation",
  },
  {
    scenario: "Flipkart price drop alerts",
    requirement: "Infrequent server notifications",
    bestChoice: "SSE or Push Notifications",
    reason: "One-way from server, infrequent, auto-reconnect built into SSE",
  },
];

protocolDecisions.forEach((p) => {
  console.log(`  Scenario: ${p.scenario}`);
  console.log(`    Requirement: ${p.requirement}`);
  console.log(`    Best Choice: ${p.bestChoice}`);
  console.log(`    Reason: ${p.reason}`);
  console.log();
});

// ════════════════════════════════════════════════════════════════
// KEY TAKEAWAYS
// ════════════════════════════════════════════════════════════════
console.log("=".repeat(70));
console.log("  KEY TAKEAWAYS");
console.log("=".repeat(70));
console.log();
console.log("  1. TCP 3-way handshake (SYN, SYN-ACK, ACK) is the cost of");
console.log("     reliable connections — every HTTP and WebSocket starts here.");
console.log();
console.log("  2. Connection pooling avoids repeated handshakes, dramatically");
console.log("     improving throughput for high-traffic services like Hotstar.");
console.log();
console.log("  3. WebSocket provides full-duplex, persistent communication —");
console.log("     ideal for live scores, chat, and collaborative editing.");
console.log();
console.log("  4. Short polling wastes bandwidth (many empty responses);");
console.log("     long polling is better but holds server resources.");
console.log();
console.log("  5. SSE is the simpler, HTTP-native alternative to WebSocket");
console.log("     for server-to-client push (scores, notifications, feeds).");
console.log();
console.log("  6. HTTP/2 multiplexing eliminates head-of-line blocking,");
console.log("     loading all page resources over a single connection.");
console.log();
console.log("  7. gRPC (HTTP/2 + Protobuf) is the go-to for internal");
console.log("     microservice communication where performance is paramount.");
console.log();
console.log("  8. Choose protocol based on requirements: REST for CRUD,");
console.log("     WebSocket for bidirectional real-time, SSE for one-way push,");
console.log("     gRPC for internal high-throughput communication.");
console.log();
console.log('  "In the stadium of distributed systems, the protocol you choose');
console.log('   determines whether you are watching the match live or reading');
console.log('   about it in tomorrow morning newspaper."');
console.log('                                          — The Hotstar Architect');
