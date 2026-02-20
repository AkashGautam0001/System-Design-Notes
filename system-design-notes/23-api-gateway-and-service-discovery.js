/** ============================================================
 *  FILE 23: API GATEWAY AND SERVICE DISCOVERY
 *  ============================================================
 *  Topic: Gateway responsibilities, service registry, client/
 *         server-side discovery, sidecar pattern
 *
 *  WHY THIS MATTERS:
 *  In a microservices world, clients should not need to know the
 *  addresses of dozens of services. An API Gateway provides a
 *  single entry point handling routing, auth, and rate limiting.
 *  Service discovery ensures services find each other dynamically
 *  as instances scale up and down.
 *  ============================================================ */

// STORY: JioMart E-Commerce
// Imagine JioMart as a shopping mall. The API Gateway is the main
// entrance — it checks your identity (auth), directs you to the
// right shop (routing), and ensures no single shop gets overwhelmed
// (rate limiting). The service registry is the mall directory board
// that updates automatically when shops open or close.

console.log("=".repeat(70));
console.log("  FILE 23: API GATEWAY AND SERVICE DISCOVERY");
console.log("  Routing, Auth, Rate Limiting, Registry, Sidecar");
console.log("=".repeat(70));
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 1 — API Gateway Responsibilities
// ════════════════════════════════════════════════════════════════

// WHY: Without a gateway, every client must know every service
// address, handle auth independently, and manage retries.

console.log("--- SECTION 1: API Gateway Responsibilities ---\n");

[["Request Routing", "Routes /api/products to ProductService", "GET /api/products -> product-service:8081"],
 ["Authentication", "Validates JWT tokens before forwarding", "Authorization: Bearer <token> -> decode, verify"],
 ["Rate Limiting", "Limits requests per user/IP", "User X: 100 req/min, 101st -> 429 Too Many Requests"],
 ["Load Balancing", "Distributes across instances", "Round-robin across product-service:8081, :8082"],
 ["Circuit Breaking", "Stops calls to failing services", "PaymentService down -> graceful error"],
 ["Logging", "Centralized access logs, metrics", "Every request logged with traceId"],
].forEach(([name, desc, example]) => {
  console.log(`  ${name}: ${desc}`);
  console.log(`    E.g.: ${example}\n`);
});

// ════════════════════════════════════════════════════════════════
// SECTION 2 — Gateway Implementation
// ════════════════════════════════════════════════════════════════

// WHY: Building a gateway reveals how routing, auth, and rate
// limiting compose together as middleware.

console.log("--- SECTION 2: Gateway Implementation ---\n");

class APIGateway {
  constructor() { this.routes = {}; this.middleware = []; this.rateLimits = {}; }
  registerRoute(path, service) {
    this.routes[path] = service;
    console.log(`  [Gateway] Registered: ${path} -> ${service.name}`);
  }
  addMiddleware(name, fn) {
    this.middleware.push({ name, fn });
    console.log(`  [Gateway] Added middleware: ${name}`);
  }
  handle(req) {
    console.log(`\n  [Gateway] Incoming: ${req.method} ${req.path}`);
    for (const mw of this.middleware) {
      const r = mw.fn(req, this);
      if (!r.pass) { console.log(`  [Gateway] BLOCKED by ${mw.name}: ${r.reason}`); return { status: r.status }; }
    }
    const route = Object.keys(this.routes).find((r) => req.path.startsWith(r));
    if (!route) { console.log("  [Gateway] 404 — No matching route"); return { status: 404 }; }
    const svc = this.routes[route];
    console.log(`  [Gateway] Routing to ${svc.name}`);
    return svc.handle(req);
  }
}

class MockService {
  constructor(name) { this.name = name; }
  handle(req) {
    console.log(`  [${this.name}] Processing ${req.method} ${req.path}`);
    return { status: 200, body: `Response from ${this.name}` };
  }
}

const gw = new APIGateway();
gw.registerRoute("/api/products", new MockService("ProductService"));
gw.registerRoute("/api/cart", new MockService("CartService"));
gw.registerRoute("/api/orders", new MockService("OrderService"));

// Auth middleware
gw.addMiddleware("auth", (req) => {
  if (req.path.startsWith("/api/products") && req.method === "GET") return { pass: true };
  if (!req.headers || !req.headers.authorization) return { pass: false, status: 401, reason: "Missing auth token" };
  if (req.headers.authorization !== "Bearer valid-token") return { pass: false, status: 403, reason: "Invalid token" };
  return { pass: true };
});
// Rate limit middleware
gw.addMiddleware("rateLimit", (req, gateway) => {
  const id = req.clientId || "anon";
  gateway.rateLimits[id] = (gateway.rateLimits[id] || 0) + 1;
  if (gateway.rateLimits[id] > 5) return { pass: false, status: 429, reason: "Rate limit exceeded" };
  return { pass: true };
});

console.log("\n  === Test: Public endpoint ===");
gw.handle({ method: "GET", path: "/api/products/1", clientId: "u1" });
console.log("\n  === Test: Protected without token ===");
gw.handle({ method: "POST", path: "/api/orders", clientId: "u1" });
console.log("\n  === Test: Protected with valid token ===");
gw.handle({ method: "POST", path: "/api/orders", clientId: "u1", headers: { authorization: "Bearer valid-token" } });
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 3 — Service Registry
// ════════════════════════════════════════════════════════════════

// WHY: In dynamic environments, service instances come and go.
// A registry tracks which instances are alive and their location.

console.log("--- SECTION 3: Service Registry ---\n");

class ServiceRegistry {
  constructor() { this.services = {}; }
  register(name, id, host, port, meta = {}) {
    if (!this.services[name]) this.services[name] = [];
    this.services[name].push({ id, host, port, meta, status: "UP", lastHeartbeat: Date.now() });
    console.log(`  [Registry] Registered: ${name}/${id} at ${host}:${port}`);
  }
  deregister(name, id) {
    if (this.services[name]) this.services[name] = this.services[name].filter((i) => i.id !== id);
    console.log(`  [Registry] Deregistered: ${name}/${id}`);
  }
  getInstances(name) { return (this.services[name] || []).filter((i) => i.status === "UP"); }
  heartbeat(name, id) {
    const inst = (this.services[name] || []).find((i) => i.id === id);
    if (inst) inst.lastHeartbeat = Date.now();
  }
  evictStale(maxAge) {
    const now = Date.now();
    for (const instances of Object.values(this.services)) {
      instances.forEach((i) => { if (now - i.lastHeartbeat > maxAge) { i.status = "DOWN"; console.log(`  [Registry] Evicted stale: ${i.id}`); } });
    }
  }
  printDirectory() {
    console.log("\n  === JioMart Mall Directory Board ===");
    for (const [name, instances] of Object.entries(this.services)) {
      console.log(`  ${name}:`);
      instances.forEach((i) => console.log(`    ${i.id} @ ${i.host}:${i.port} [${i.status}] v${i.meta.version || "?"}`));
    }
    console.log();
  }
}

const reg = new ServiceRegistry();
reg.register("product-service", "prod-1", "10.0.1.1", 8081, { version: "2.1" });
reg.register("product-service", "prod-2", "10.0.1.2", 8081, { version: "2.1" });
reg.register("product-service", "prod-3", "10.0.1.3", 8081, { version: "2.2" });
reg.register("cart-service", "cart-1", "10.0.2.1", 8082, { version: "1.5" });
reg.register("order-service", "order-1", "10.0.3.1", 8083, { version: "3.0" });
reg.printDirectory();

// ════════════════════════════════════════════════════════════════
// SECTION 4 — Service Registration / Deregistration
// ════════════════════════════════════════════════════════════════

// WHY: Services must register on startup and deregister on
// shutdown. Stale entries must be cleaned via heartbeats.

console.log("--- SECTION 4: Registration / Deregistration ---\n");

console.log("  1. STARTUP — instance registers:");
reg.register("delivery-service", "del-1", "10.0.5.1", 8085, { zone: "Mumbai" });
console.log("  2. HEARTBEAT — periodic health signal:");
reg.heartbeat("delivery-service", "del-1");
console.log("    [Registry] Heartbeat received: delivery-service/del-1");
console.log("  3. SCALE UP — new instance joins:");
reg.register("delivery-service", "del-2", "10.0.5.2", 8085, { zone: "Delhi" });
console.log("  4. Available:", reg.getInstances("delivery-service").map((i) => i.id).join(", "));
console.log("  5. GRACEFUL SHUTDOWN:");
reg.deregister("delivery-service", "del-1");
console.log("  6. CRASH — stale heartbeat eviction:");
const delSvc = reg.services["delivery-service"];
if (delSvc && delSvc[0]) delSvc[0].lastHeartbeat = Date.now() - 60000;
reg.evictStale(30000);
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 5 — Client-Side Discovery
// ════════════════════════════════════════════════════════════════

// WHY: The calling service queries the registry and picks an
// instance itself. Avoids extra hop but requires LB logic in client.

console.log("--- SECTION 5: Client-Side Discovery ---\n");

class ClientDiscovery {
  constructor(registry) { this.registry = registry; this.rrIndex = {}; }
  discover(name) {
    const instances = this.registry.getInstances(name);
    if (!instances.length) { console.log(`  [Client] No instances for ${name}`); return null; }
    if (!this.rrIndex[name]) this.rrIndex[name] = 0;
    const idx = this.rrIndex[name] % instances.length;
    this.rrIndex[name]++;
    const chosen = instances[idx];
    console.log(`  [Client] Discovered ${name}: ${chosen.id} @ ${chosen.host}:${chosen.port} (rr index ${idx})`);
    return chosen;
  }
}
const cd = new ClientDiscovery(reg);
cd.discover("product-service"); cd.discover("product-service"); cd.discover("product-service");
console.log("  Pros: No extra hop, client controls LB strategy");
console.log("  Cons: Every client needs discovery logic\n");

// ════════════════════════════════════════════════════════════════
// SECTION 6 — Server-Side Discovery
// ════════════════════════════════════════════════════════════════

// WHY: A load balancer handles discovery. Clients just send
// requests to the LB — simpler for clients.

console.log("--- SECTION 6: Server-Side Discovery ---\n");

class ServerSideLB {
  constructor(registry) { this.registry = registry; this.rrIndex = {}; }
  route(name, req) {
    const inst = this.registry.getInstances(name);
    if (!inst.length) { console.log(`  [LB] No instances — 503`); return { status: 503 }; }
    if (!this.rrIndex[name]) this.rrIndex[name] = 0;
    const target = inst[this.rrIndex[name]++ % inst.length];
    console.log(`  [LB] Routing to ${target.id} @ ${target.host}:${target.port}`);
    return { status: 200, handler: target.id };
  }
}
const lb = new ServerSideLB(reg);
lb.route("product-service", {}); lb.route("product-service", {}); lb.route("product-service", {});
console.log("  Pros: Clients are simple, no discovery logic");
console.log("  Cons: Extra network hop, LB is potential bottleneck\n");

// ════════════════════════════════════════════════════════════════
// SECTION 7 — Sidecar Pattern
// ════════════════════════════════════════════════════════════════

// WHY: A helper process alongside each service handles discovery,
// LB, retries, and observability. Basis of service meshes (Istio).

console.log("--- SECTION 7: Sidecar Pattern ---\n");

class Sidecar {
  constructor(instanceId, registry) { this.instanceId = instanceId; this.registry = registry; this.circuitOpen = false; this.failures = 0; }
  intercept(targetService, request) {
    console.log(`  [Sidecar:${this.instanceId}] Intercepting call to ${targetService}`);
    if (this.circuitOpen) { console.log("    Circuit OPEN — returning fallback"); return { status: 503 }; }
    const inst = this.registry.getInstances(targetService);
    if (!inst.length) { console.log("    No instances!"); return { status: 503 }; }
    const target = inst[0];
    console.log(`    Routing to ${target.id} @ ${target.host}:${target.port}${request.path}`);
    this.failures = 0;
    return { status: 200 };
  }
}
const sc = new Sidecar("cart-1", reg);
sc.intercept("product-service", { path: "/products/42" });
sc.intercept("order-service", { path: "/orders/100" });
console.log("\n  Sidecar handles: discovery, LB, retries, circuit breaking, mTLS, metrics");
console.log("  Used in: Istio (Envoy), Linkerd, Consul Connect\n");

// ════════════════════════════════════════════════════════════════
// SECTION 8 — Health-Check Based Discovery
// ════════════════════════════════════════════════════════════════

// WHY: Active health checks detect degraded instances faster
// than heartbeats and remove them before clients get errors.

console.log("--- SECTION 8: Health-Check Based Discovery ---\n");

class HealthCheckRegistry {
  constructor() { this.services = {}; }
  register(name, id, host, port) {
    if (!this.services[name]) this.services[name] = [];
    this.services[name].push({ id, host, port, healthy: true, failures: 0 });
    console.log(`  [HealthReg] Registered ${name}/${id}`);
  }
  check(name) {
    console.log(`  [HealthCheck] Checking ${name}:`);
    (this.services[name] || []).forEach((i) => {
      const ok = Math.random() > 0.3;
      if (ok) { i.failures = 0; console.log(`    ${i.id}: HEALTHY`); }
      else { i.failures++; console.log(`    ${i.id}: UNHEALTHY (failures: ${i.failures})`); }
      if (i.failures >= 3) { i.healthy = false; console.log(`    ${i.id}: REMOVED from pool`); }
    });
  }
}
const hReg = new HealthCheckRegistry();
hReg.register("jiomart-search", "s-1", "10.0.6.1", 9090);
hReg.register("jiomart-search", "s-2", "10.0.6.2", 9090);
hReg.register("jiomart-search", "s-3", "10.0.6.3", 9090);
for (let i = 1; i <= 3; i++) { console.log(`\n  --- Round ${i} ---`); hReg.check("jiomart-search"); }

console.log("\n  Health check types: HTTP GET /health, TCP port check, custom script, deep health\n");

// ════════════════════════════════════════════════════════════════
// SECTION 9 — Gateway Patterns in Production
// ════════════════════════════════════════════════════════════════

// WHY: Real gateways implement BFF, aggregation, canary routing.

console.log("--- SECTION 9: Gateway Patterns in Production ---\n");

[["Backend for Frontend (BFF)", "Separate gateways for mobile, web, third-party", "Mobile BFF aggregates product+price+image"],
 ["Request Aggregation", "Combine multiple service calls into one response", "Product page: Product + Reviews + Price"],
 ["Canary Routing", "Route 5% traffic to new version", "Header X-Canary:true -> v2, else v1"],
 ["Edge Authentication", "Validate tokens at gateway", "Gateway validates JWT, passes X-User-Id downstream"],
 ["Response Caching", "Cache frequent data at gateway", "Cache catalog 60s, reduce load 80%"],
].forEach(([name, desc, ex]) => console.log(`  ${name}: ${desc}\n    Example: ${ex}\n`));

// ════════════════════════════════════════════════════════════════
// SECTION 10 — Technology Comparison
// ════════════════════════════════════════════════════════════════

// WHY: Choosing between technologies is a practical decision.

console.log("--- SECTION 10: Technology Comparison ---\n");

console.log("  API Gateways:");
[["Kong", "Open Source", "Plugin ecosystem, Lua-based"],
 ["AWS API Gateway", "Managed", "Lambda integration, pay-per-call"],
 ["Envoy", "Open Source", "L7 proxy, service mesh, gRPC-native"],
 ["Traefik", "Open Source", "Auto-discovery, Docker/K8s native"],
].forEach(([n, t, s]) => console.log(`    ${n.padEnd(18)} [${t.padEnd(12)}] ${s}`));

console.log("\n  Service Discovery:");
[["Consul", "HashiCorp", "Multi-DC, health checks, KV store"],
 ["etcd", "CNCF", "Raft consensus, Kubernetes backbone"],
 ["ZooKeeper", "Apache", "Battle-tested, hierarchical namespace"],
 ["Eureka", "Netflix OSS", "Spring Cloud native, AP system"],
 ["Kubernetes DNS", "Built-in", "Zero config in K8s"],
].forEach(([n, t, s]) => console.log(`    ${n.padEnd(18)} [${t.padEnd(12)}] ${s}`));
console.log();

// ════════════════════════════════════════════════════════════════
// KEY TAKEAWAYS
// ════════════════════════════════════════════════════════════════

console.log("=".repeat(70));
console.log("  KEY TAKEAWAYS");
console.log("=".repeat(70));
console.log();
console.log("  1. API Gateway is the single entry point: routing, auth, rate limiting.");
console.log("  2. Service Registry keeps a live directory of running instances.");
console.log("  3. Client-side discovery: client queries registry, controls LB.");
console.log("  4. Server-side discovery: LB sits between client and registry.");
console.log("  5. Sidecar pattern offloads discovery and security from app code.");
console.log("  6. Health checks detect degraded instances faster than heartbeats.");
console.log("  7. BFF gives each client type its own optimized gateway.");
console.log("  8. Combine gateway + service mesh for north-south and east-west traffic.");
console.log();
console.log('  "Just as JioMart\'s mall entrance guides every customer to the right');
console.log('   shop without revealing back-office complexity, an API Gateway shields');
console.log('   clients from the chaos of microservices scaling behind the scenes."');
console.log();
