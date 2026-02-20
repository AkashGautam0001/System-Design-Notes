/** ============================================================
 *  FILE 05: LOAD BALANCING
 *  ============================================================
 *  Topics: Round-robin, weighted, least-connections, IP hash,
 *          consistent hashing intro, health checks, L4 vs L7
 *
 *  WHY THIS MATTERS:
 *  When millions of users hit your servers simultaneously — like
 *  Flipkart Big Billion Days — a single server cannot handle the
 *  load. Load balancers distribute traffic across multiple servers,
 *  ensuring no single machine is overwhelmed. Choosing the wrong
 *  algorithm means some servers crash while others sit idle.
 *  ============================================================ */

// STORY: Flipkart Big Billion Days
// Imagine the Big Billion Days sale at Flipkart. It is like the
// biggest mela (fair) in India. Millions of people rush in at once.
// The load balancer is the traffic police at the mela entrance,
// directing crowds to different counters. Round-robin is like
// sending one person to each counter in turn. Weighted round-robin
// gives more people to bigger counters. Least-connections sends
// people to the counter with the shortest queue. Without this
// traffic police, one counter would be crushed while others are empty.

console.log("=".repeat(70));
console.log("  FILE 05: LOAD BALANCING");
console.log("=".repeat(70));
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 1 — Round-Robin Load Balancing
// ════════════════════════════════════════════════════════════════

// WHY: Round-robin is the simplest algorithm — distribute requests
// to servers in a circular order. Easy to understand, easy to
// implement, but ignores server capacity and current load.

console.log("--- SECTION 1: Round-Robin Load Balancing ---\n");

class RoundRobinBalancer {
  constructor(servers) {
    this.servers = servers.map((s) => ({ ...s, requestCount: 0 }));
    this.currentIndex = 0;
  }

  getNextServer() {
    const server = this.servers[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.servers.length;
    server.requestCount++;
    return server;
  }

  distribute(requests) {
    console.log(`  Distributing ${requests.length} requests across ${this.servers.length} servers:\n`);
    requests.forEach((req, i) => {
      const server = this.getNextServer();
      console.log(`    Request ${(i + 1).toString().padStart(2)}: "${req}" -> ${server.name}`);
    });
    this.printStats();
  }

  printStats() {
    console.log(`\n  Distribution Stats:`);
    this.servers.forEach((s) => {
      const bar = "#".repeat(s.requestCount * 2);
      console.log(`    ${s.name.padEnd(15)} ${String(s.requestCount).padStart(3)} requests  ${bar}`);
    });
    console.log();
  }
}

const rrBalancer = new RoundRobinBalancer([
  { name: "Server-A", capacity: "8 CPU" },
  { name: "Server-B", capacity: "8 CPU" },
  { name: "Server-C", capacity: "8 CPU" },
]);

const saleRequests = [
  "iPhone search", "Add to cart", "Checkout", "Payment",
  "Order confirm", "Track order", "Browse deals", "Wishlist",
  "Review submit", "Return request", "Refund check", "Support chat",
];
rrBalancer.distribute(saleRequests);

console.log("  Pros: Simple, even distribution when servers are identical");
console.log("  Cons: Ignores server capacity and current load");
console.log("  Flipkart: Fair when all counters are the same size\n");

// ════════════════════════════════════════════════════════════════
// SECTION 2 — Weighted Round-Robin
// ════════════════════════════════════════════════════════════════

// WHY: Not all servers are equal. A 32-core server should handle
// more requests than an 8-core server. Weighted round-robin
// assigns more traffic to more powerful servers.

console.log("--- SECTION 2: Weighted Round-Robin ---\n");

class WeightedRoundRobinBalancer {
  constructor(servers) {
    this.servers = servers.map((s) => ({ ...s, requestCount: 0 }));
    this.expanded = [];
    // Build expanded list based on weights
    this.servers.forEach((s) => {
      for (let i = 0; i < s.weight; i++) {
        this.expanded.push(s);
      }
    });
    this.currentIndex = 0;
  }

  getNextServer() {
    const server = this.expanded[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.expanded.length;
    server.requestCount++;
    return server;
  }

  distribute(requestCount) {
    console.log(`  Server weights:`);
    this.servers.forEach((s) => {
      console.log(`    ${s.name.padEnd(18)} weight=${s.weight} (${s.spec})`);
    });
    console.log(`\n  Distributing ${requestCount} requests:\n`);

    for (let i = 0; i < requestCount; i++) {
      const server = this.getNextServer();
      if (i < 12) {
        console.log(`    Request ${(i + 1).toString().padStart(2)} -> ${server.name}`);
      } else if (i === 12) {
        console.log(`    ... (remaining requests distributed similarly) ...`);
      }
    }

    this.printStats();
  }

  printStats() {
    console.log(`\n  Distribution Stats:`);
    const total = this.servers.reduce((sum, s) => sum + s.requestCount, 0);
    this.servers.forEach((s) => {
      const pct = ((s.requestCount / total) * 100).toFixed(1);
      const bar = "#".repeat(Math.round(s.requestCount / 2));
      console.log(`    ${s.name.padEnd(18)} ${String(s.requestCount).padStart(3)} requests (${pct}%)  ${bar}`);
    });
    console.log();
  }
}

const wrrBalancer = new WeightedRoundRobinBalancer([
  { name: "Mega-Server-1", weight: 5, spec: "32 CPU, 128GB RAM" },
  { name: "Standard-Server-2", weight: 3, spec: "16 CPU, 64GB RAM" },
  { name: "Small-Server-3", weight: 1, spec: "4 CPU, 16GB RAM" },
  { name: "Small-Server-4", weight: 1, spec: "4 CPU, 16GB RAM" },
]);

wrrBalancer.distribute(30);
console.log("  Flipkart: The big counter at the mela entrance gets 5x the crowd");
console.log("  because it has 5x the staff (CPUs)\n");

// ════════════════════════════════════════════════════════════════
// SECTION 3 — Least Connections
// ════════════════════════════════════════════════════════════════

// WHY: Some requests take longer than others (a checkout is heavier
// than a search). Least-connections sends new requests to the
// server currently handling the fewest active connections,
// accounting for actual load, not just count.

console.log("--- SECTION 3: Least Connections ---\n");

class LeastConnectionsBalancer {
  constructor(servers) {
    this.servers = servers.map((s) => ({
      ...s,
      activeConnections: 0,
      totalRequests: 0,
    }));
  }

  getNextServer() {
    // Find server with fewest active connections
    let minConn = Infinity;
    let selected = null;
    for (const server of this.servers) {
      if (server.activeConnections < minConn) {
        minConn = server.activeConnections;
        selected = server;
      }
    }
    selected.activeConnections++;
    selected.totalRequests++;
    return selected;
  }

  releaseConnection(server) {
    if (server.activeConnections > 0) {
      server.activeConnections--;
    }
  }

  simulate() {
    console.log("  Simulating Big Billion Days checkout traffic:\n");

    const requests = [
      { name: "Search iPhone",     duration: 1, type: "fast" },
      { name: "Add to cart",       duration: 1, type: "fast" },
      { name: "Checkout (heavy!)", duration: 5, type: "slow" },
      { name: "Browse deals",     duration: 1, type: "fast" },
      { name: "Payment (heavy!)", duration: 4, type: "slow" },
      { name: "Search laptop",    duration: 1, type: "fast" },
      { name: "Order confirm",    duration: 3, type: "medium" },
      { name: "Quick view",       duration: 1, type: "fast" },
      { name: "Invoice gen",      duration: 2, type: "medium" },
      { name: "Add to wishlist",  duration: 1, type: "fast" },
    ];

    const activeRequests = [];

    requests.forEach((req, i) => {
      // Simulate time passing: release completed requests
      activeRequests.forEach((ar) => {
        ar.remaining--;
        if (ar.remaining <= 0) {
          this.releaseConnection(ar.server);
        }
      });

      // Remove completed
      const stillActive = activeRequests.filter((ar) => ar.remaining > 0);
      activeRequests.length = 0;
      activeRequests.push(...stillActive);

      // Route new request
      const server = this.getNextServer();
      activeRequests.push({ server, remaining: req.duration });

      const connStatus = this.servers.map((s) => `${s.name}:${s.activeConnections}`).join(", ");
      console.log(`    Req ${(i + 1).toString().padStart(2)}: "${req.name.padEnd(20)}" -> ${server.name} (Active: ${connStatus})`);
    });

    console.log(`\n  Final Distribution:`);
    this.servers.forEach((s) => {
      const bar = "#".repeat(s.totalRequests * 2);
      console.log(`    ${s.name.padEnd(12)} total=${String(s.totalRequests).padStart(2)}, active=${s.activeConnections}  ${bar}`);
    });
    console.log();
  }
}

const lcBalancer = new LeastConnectionsBalancer([
  { name: "Server-A" },
  { name: "Server-B" },
  { name: "Server-C" },
]);
lcBalancer.simulate();

console.log("  Flipkart: Send new customers to the counter with the shortest queue,");
console.log("  not just the next one in line. Smart for mixed workloads.\n");

// ════════════════════════════════════════════════════════════════
// SECTION 4 — IP Hash
// ════════════════════════════════════════════════════════════════

// WHY: Sometimes you need the same user to always reach the same
// server (session affinity). IP hash ensures consistent routing
// based on client IP — useful for server-side sessions and caching.

console.log("--- SECTION 4: IP Hash Load Balancing ---\n");

class IPHashBalancer {
  constructor(servers) {
    this.servers = servers.map((s) => ({ ...s, requestCount: 0, clients: new Set() }));
  }

  hashIP(ip) {
    let hash = 0;
    for (let i = 0; i < ip.length; i++) {
      const char = ip.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  getServer(clientIP) {
    const hash = this.hashIP(clientIP);
    const index = hash % this.servers.length;
    const server = this.servers[index];
    server.requestCount++;
    server.clients.add(clientIP);
    return { server, hash, index };
  }

  demonstrate() {
    const clientIPs = [
      "192.168.1.10",  // User from Delhi
      "10.0.0.25",     // User from Mumbai
      "172.16.0.100",  // User from Bangalore
      "192.168.1.10",  // Same user from Delhi (should go to same server!)
      "10.0.0.25",     // Same user from Mumbai (should go to same server!)
      "192.168.2.50",  // User from Chennai
      "172.16.0.100",  // Same Bangalore user (should go to same server!)
      "10.0.1.75",     // User from Pune
      "192.168.3.30",  // User from Hyderabad
    ];

    console.log("  IP Hash ensures same IP always goes to same server:\n");

    clientIPs.forEach((ip, i) => {
      const result = this.getServer(ip);
      const isRepeat = i > 0 && clientIPs.indexOf(ip) < i;
      const note = isRepeat ? " <-- same server as before (session affinity!)" : "";
      console.log(`    ${ip.padEnd(18)} hash=${String(result.hash).padStart(12)} -> ${result.server.name}${note}`);
    });

    console.log(`\n  Server Assignment:`);
    this.servers.forEach((s) => {
      console.log(`    ${s.name.padEnd(12)} ${s.requestCount} requests from IPs: [${Array.from(s.clients).join(", ")}]`);
    });

    console.log(`\n  Use case: User's shopping cart stored in server memory.`);
    console.log(`  IP hash ensures they always reach the server with their cart.\n`);
  }
}

const ipHashBalancer = new IPHashBalancer([
  { name: "Server-A" },
  { name: "Server-B" },
  { name: "Server-C" },
]);
ipHashBalancer.demonstrate();

// ════════════════════════════════════════════════════════════════
// SECTION 5 — Consistent Hashing Introduction
// ════════════════════════════════════════════════════════════════

// WHY: When you add or remove a server, IP hash remaps almost ALL
// clients (disastrous for caches). Consistent hashing minimizes
// disruption — only K/N keys need to move (K=keys, N=servers).

console.log("--- SECTION 5: Consistent Hashing Intro ---\n");

class ConsistentHashRing {
  constructor(replicas) {
    this.replicas = replicas || 3;
    this.ring = new Map(); // position -> server
    this.sortedPositions = [];
    this.serverKeys = new Map(); // server -> assigned keys
  }

  hash(key) {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = ((hash << 5) - hash) + key.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash) % 360; // Map to 0-359 degree circle
  }

  addServer(server) {
    const positions = [];
    for (let i = 0; i < this.replicas; i++) {
      const pos = this.hash(`${server}-replica-${i}`);
      this.ring.set(pos, server);
      positions.push(pos);
    }
    this.sortedPositions = Array.from(this.ring.keys()).sort((a, b) => a - b);
    this.serverKeys.set(server, []);
    console.log(`    Added ${server} at positions: [${positions.join(", ")}] degrees`);
  }

  removeServer(server) {
    const removedPositions = [];
    for (const [pos, srv] of this.ring) {
      if (srv === server) {
        removedPositions.push(pos);
      }
    }
    removedPositions.forEach((pos) => this.ring.delete(pos));
    this.sortedPositions = Array.from(this.ring.keys()).sort((a, b) => a - b);
    this.serverKeys.delete(server);
    console.log(`    Removed ${server} from positions: [${removedPositions.join(", ")}]`);
  }

  getServer(key) {
    const keyPos = this.hash(key);
    // Find first server position >= key position (clockwise)
    for (const pos of this.sortedPositions) {
      if (pos >= keyPos) {
        const server = this.ring.get(pos);
        if (this.serverKeys.has(server)) {
          this.serverKeys.get(server).push(key);
        }
        return { server, keyPos, serverPos: pos };
      }
    }
    // Wrap around to first server
    const server = this.ring.get(this.sortedPositions[0]);
    if (this.serverKeys.has(server)) {
      this.serverKeys.get(server).push(key);
    }
    return { server, keyPos, serverPos: this.sortedPositions[0] };
  }

  visualize() {
    console.log("\n    Hash Ring (360 degrees):");
    console.log("    " + "─".repeat(50));
    const display = [];
    for (const pos of this.sortedPositions) {
      display.push(`${pos}deg:${this.ring.get(pos)}`);
    }
    console.log(`    Positions: ${display.join(" | ")}`);
    console.log();
  }
}

console.log("  Building consistent hash ring:\n");
const ring = new ConsistentHashRing(3);
ring.addServer("Flipkart-Cache-1");
ring.addServer("Flipkart-Cache-2");
ring.addServer("Flipkart-Cache-3");
ring.visualize();

// Assign product cache keys
const products = [
  "iphone-15", "samsung-s24", "oneplus-12", "pixel-8",
  "macbook-pro", "dell-xps", "hp-spectre", "thinkpad",
];

console.log("    Key assignment (before adding server):");
products.forEach((p) => {
  const result = ring.getServer(p);
  console.log(`      "${p.padEnd(14)}" (pos=${String(result.keyPos).padStart(3)}) -> ${result.server}`);
});

// Now add a new server
console.log("\n    --- Adding Flipkart-Cache-4 (scaling up for BBD) ---\n");
ring.addServer("Flipkart-Cache-4");
ring.visualize();

// Clear previous assignments
ring.serverKeys.forEach((keys, server) => {
  ring.serverKeys.set(server, []);
});

console.log("    Key assignment (after adding server):");
products.forEach((p) => {
  const result = ring.getServer(p);
  console.log(`      "${p.padEnd(14)}" (pos=${String(result.keyPos).padStart(3)}) -> ${result.server}`);
});

console.log("\n    Only a fraction of keys moved to the new server!");
console.log("    With simple hash: ALL keys would be reshuffled.\n");

// ════════════════════════════════════════════════════════════════
// SECTION 6 — Health Checks
// ════════════════════════════════════════════════════════════════

// WHY: Load balancers must know which servers are healthy. Without
// health checks, requests go to dead servers, causing errors.

console.log("--- SECTION 6: Health Checks ---\n");

const healthServers = [
  { name: "Server-A", responseTime: 45 },
  { name: "Server-B", responseTime: 52 },
  { name: "Server-C", responseTime: 200 },
  { name: "Server-D", responseTime: -1 },
];

console.log(`  ${"Server".padEnd(12)} ${"Response".padEnd(12)} ${"Status"}`);
console.log(`  ${"─".repeat(12)} ${"─".repeat(12)} ${"─".repeat(20)}`);
healthServers.forEach(s => {
  const status = s.responseTime < 0 ? "UNHEALTHY (no response)" :
    s.responseTime > 150 ? "DEGRADED (slow: " + s.responseTime + "ms)" : "HEALTHY (" + s.responseTime + "ms)";
  console.log(`  ${s.name.padEnd(12)} ${String(s.responseTime + "ms").padEnd(12)} ${status}`);
});

console.log("\n  Health Check Types:");
console.log("    TCP (L4):        Open port check, ~1ms, shallow");
console.log("    HTTP (L7):       GET /health -> 200, ~10ms, medium depth");
console.log("    Deep:            Check DB + Redis + disk, ~100ms, thorough");
console.log("    Liveness Probe:  Is process alive? (K8s: restart if fails)");
console.log("    Readiness Probe: Ready for traffic? (K8s: remove from LB, no restart)");
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 7 — L4 vs L7 Load Balancing
// ════════════════════════════════════════════════════════════════

// WHY: L4 balancers route based on IP/port (fast, dumb).
// L7 balancers inspect HTTP content (smart, slower). Choosing
// the right layer determines cost, performance, and flexibility.

console.log("--- SECTION 7: L4 vs L7 Load Balancing ---\n");

// L4: Routes by IP/port only (fast, dumb)
console.log("  L4 (Transport Layer) — Flipkart NLB:");
console.log("  Sees: IP + Port only. Cannot see URLs or headers.\n");
const l4Rules = { 80: ["web-1:80", "web-2:80", "web-3:80"], 443: ["web-1:443", "web-2:443"] };
let l4Idx = { 80: 0, 443: 0 };
[{ ip: "203.0.113.10", port: 80 }, { ip: "198.51.100.20", port: 443 }, { ip: "192.0.2.30", port: 80 }].forEach(r => {
  const servers = l4Rules[r.port];
  const dest = servers[l4Idx[r.port] % servers.length];
  l4Idx[r.port]++;
  console.log(`    ${r.ip}:${r.port} -> ${dest}`);
});

// L7: Routes by URL/headers (smart, slower)
console.log("\n  L7 (Application Layer) — Flipkart ALB:");
console.log("  Sees: URL, method, headers, cookies. Smart content-based routing.\n");
const l7Routes = [["/api/search", "search-svc"], ["/api/cart", "cart-svc"], ["/api/payment", "payment-svc"], ["/static", "cdn-edge"]];
["GET /api/search?q=iphone", "POST /api/cart/add", "POST /api/payment/process", "GET /static/logo.png"].forEach(req => {
  const [method, path] = req.split(" ");
  const match = l7Routes.find(([p]) => path.startsWith(p));
  console.log(`    ${method.padEnd(5)} ${path.padEnd(28)} -> ${match ? match[1] : "default"}`);
});

console.log("\n  L4 vs L7: L4 is fast+cheap (NLB), L7 is smart+expensive (ALB)");
console.log("  L4: no SSL termination, no content routing");
console.log("  L7: SSL termination, path-based routing, header inspection");
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 8 — Real-World Load Balancer Simulation
// ════════════════════════════════════════════════════════════════

// WHY: This section ties everything together — a realistic simulation
// of Flipkart Big Billion Days traffic showing how different
// algorithms handle the same workload.

console.log("--- SECTION 8: Big Billion Days Simulation ---\n");

const servers = [
  { name: "Mumbai-1", maxRPS: 5000, weight: 5 }, { name: "Mumbai-2", maxRPS: 3000, weight: 3 },
  { name: "Delhi-1", maxRPS: 4000, weight: 4 },  { name: "Chennai-1", maxRPS: 2000, weight: 2 },
  { name: "Bangalore-1", maxRPS: 3000, weight: 3 },
];
const totalCap = servers.reduce((s, srv) => s + srv.maxRPS, 0);
console.log(`  Infrastructure: ${servers.map(s => s.name + ":" + s.maxRPS + "RPS").join(", ")}`);
console.log(`  Total Capacity: ${totalCap.toLocaleString()} RPS\n`);

const traffic = [
  { time: "11:55 PM", rps: 2000 }, { time: "12:00 AM (SALE!)", rps: 15000 },
  { time: "12:01 AM (PEAK)", rps: 18000 }, { time: "12:05 AM", rps: 12000 },
  { time: "12:30 AM", rps: 8000 }, { time: "1:00 AM", rps: 5000 },
];
traffic.forEach(t => {
  const load = (t.rps / totalCap * 100).toFixed(0);
  const status = t.rps > totalCap ? "OVERLOADED" : t.rps > totalCap * 0.7 ? "HIGH" : "OK";
  const bar = "|".repeat(Math.min(20, Math.round(t.rps / 1000)));
  console.log(`    ${t.time.padEnd(22)} ${String(t.rps).padEnd(8)} ${(status + " " + load + "%").padEnd(16)} ${bar}`);
});

const totalWt = servers.reduce((s, srv) => s + srv.weight, 0);
console.log("\n  Peak Distribution (18,000 RPS):");
servers.forEach(s => {
  const assigned = Math.round((s.weight / totalWt) * 18000);
  console.log(`    ${s.name.padEnd(14)} ${assigned} RPS (${((assigned/s.maxRPS)*100).toFixed(0)}% of max) ${assigned > s.maxRPS ? "[OVERLOADED]" : "[OK]"}`);
});
console.log("\n  ALERT: All servers over capacity! Auto-scaling adds 3 servers -> 25,000 RPS capacity -> crisis averted!");
console.log();

// ════════════════════════════════════════════════════════════════
// KEY TAKEAWAYS
// ════════════════════════════════════════════════════════════════
console.log("=".repeat(70));
console.log("  KEY TAKEAWAYS");
console.log("=".repeat(70));
console.log();
console.log("  1. Round-robin is simple but assumes all servers are equal.");
console.log("     Use weighted round-robin when servers have different capacities.");
console.log();
console.log("  2. Least-connections is ideal for mixed workloads where some");
console.log("     requests are fast (search) and others are slow (checkout).");
console.log();
console.log("  3. IP hash provides session affinity — same client always");
console.log("     reaches the same server. Useful for server-side sessions.");
console.log();
console.log("  4. Consistent hashing minimizes disruption when adding or");
console.log("     removing servers — only K/N keys need to move, not all.");
console.log();
console.log("  5. Health checks are non-negotiable. Without them, the load");
console.log("     balancer sends traffic to dead servers.");
console.log();
console.log("  6. L4 balancers are fast but dumb (IP/port only). L7 balancers");
console.log("     are smarter (URL/header routing) but add latency.");
console.log();
console.log("  7. Auto-scaling + load balancing together handle traffic spikes.");
console.log("     Neither works well alone.");
console.log();
console.log("  8. At Flipkart scale, load balancing is not optional — it is");
console.log("     the difference between a successful sale and a crashed website.");
console.log();
console.log('  "A load balancer without health checks is like a traffic police');
console.log('   officer directing cars into a road that has already collapsed.');
console.log('   Always check before you route."');
console.log('                                       — The Flipkart Architect');
console.log();
