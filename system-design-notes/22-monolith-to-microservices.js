/** ============================================================
 *  FILE 22: MONOLITH TO MICROSERVICES
 *  ============================================================
 *  Topic: Monolith, microservices, service boundaries, strangler
 *         fig, shared DB anti-pattern
 *
 *  WHY THIS MATTERS:
 *  Most companies start with a monolith because it is simple.
 *  As the product grows, a monolith becomes a bottleneck for
 *  development velocity, scaling, and reliability. Understanding
 *  safe decomposition is a critical senior engineer skill.
 *  ============================================================ */

// STORY: MakeMyTrip Evolution
// MakeMyTrip started as a single monolith handling flights, hotels,
// buses, and holidays in one codebase. A small hotel pricing fix
// required redeploying the entire app — risking flight bookings.
// They adopted the strangler fig pattern, peeling off services one
// by one until the monolith was hollow and could be retired.

console.log("=".repeat(70));
console.log("  FILE 22: MONOLITH TO MICROSERVICES");
console.log("  Service Boundaries, Strangler Fig, Shared DB Anti-Pattern");
console.log("=".repeat(70));
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 1 — Monolith Architecture
// ════════════════════════════════════════════════════════════════

// WHY: Before breaking things apart, understand what a monolith
// looks like and why teams choose it initially.

console.log("--- SECTION 1: Monolith Architecture ---\n");

class MakeMyTripMonolith {
  constructor() {
    this.db = { users: [], flights: [], hotels: [], buses: [], bookings: [] };
    this.nextId = 1;
    console.log("  MakeMyTrip Monolith: Single codebase | Single DB | Single deploy");
  }
  registerUser(name) { const u = { id: this.nextId++, name }; this.db.users.push(u); return u; }
  searchFlights(from, to) {
    const r = [{ id: `FL-${this.nextId++}`, from, to, price: 4500, airline: "IndiGo" },
               { id: `FL-${this.nextId++}`, from, to, price: 5500, airline: "Air India" }];
    this.db.flights.push(...r); return r;
  }
  searchHotels(city) {
    const r = [{ id: `HT-${this.nextId++}`, city, price: 2500, name: "OYO" },
               { id: `HT-${this.nextId++}`, city, price: 6000, name: "Taj" }];
    this.db.hotels.push(...r); return r;
  }
  searchBuses(from, to) {
    const r = [{ id: `BUS-${this.nextId++}`, from, to, price: 800, operator: "VRL" }];
    this.db.buses.push(...r); return r;
  }
  book(userId, itemId, type) {
    const b = { id: `BK-${this.nextId++}`, userId, itemId, type, status: "confirmed" };
    this.db.bookings.push(b);
    console.log(`    Booking ${b.id}: ${type} ${itemId} for user ${userId}`);
    return b;
  }
  getStats() { return Object.fromEntries(Object.entries(this.db).map(([k, v]) => [k, v.length])); }
}

const mono = new MakeMyTripMonolith();
const user = mono.registerUser("Rajesh");
const flights = mono.searchFlights("DEL", "BOM");
mono.searchHotels("Mumbai");
mono.searchBuses("Mumbai", "Pune");
mono.book(user.id, flights[0].id, "flight");
mono.book(user.id, "HT-4", "hotel");
console.log("  Stats:", JSON.stringify(mono.getStats()), "\n");

// ════════════════════════════════════════════════════════════════
// SECTION 2 — Benefits and Drawbacks
// ════════════════════════════════════════════════════════════════

// WHY: Understanding trade-offs helps decide WHEN to migrate.

console.log("--- SECTION 2: Benefits and Drawbacks ---\n");

console.log("  BENEFITS:");
["Simple to develop — one codebase, one IDE project",
 "Simple to deploy — one artifact, one server",
 "Low latency — in-process function calls, no network hops",
 "ACID transactions — one database, simple consistency",
].forEach((b, i) => console.log(`    ${i + 1}. ${b}`));
console.log("\n  DRAWBACKS:");
["Scaling is all-or-nothing — cannot scale hotels independently",
 "Deployment risk — one bug in buses breaks flights",
 "Technology lock-in — same language/framework for everything",
 "Team coupling — hotel team waits for flight team's deploy",
].forEach((d, i) => console.log(`    ${i + 1}. ${d}`));
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 3 — Microservices Architecture
// ════════════════════════════════════════════════════════════════

// WHY: Microservices solve scaling and deployment problems by
// isolating each domain into its own deployable unit.

console.log("--- SECTION 3: Microservices Architecture ---\n");

class FlightService {
  constructor() { this.db = []; this.nextId = 1000; }
  search(from, to) {
    const r = [{ id: `FL-${this.nextId++}`, from, to, price: 4500 }];
    this.db.push(...r);
    console.log(`  [FlightService] Found ${r.length} flights ${from}->${to}`);
    return r;
  }
  book(flightId, userId) {
    const b = { id: `FBK-${this.nextId++}`, flightId, userId, status: "confirmed" };
    console.log(`  [FlightService] Booked ${b.id}`);
    return b;
  }
}

class HotelService {
  constructor() { this.db = []; this.nextId = 2000; }
  search(city) {
    const r = [{ id: `HT-${this.nextId++}`, city, price: 2500 }, { id: `HT-${this.nextId++}`, city, price: 6000 }];
    this.db.push(...r);
    console.log(`  [HotelService] Found ${r.length} hotels in ${city}`);
    return r;
  }
  book(hotelId, userId) {
    const b = { id: `HBK-${this.nextId++}`, hotelId, userId, status: "confirmed" };
    console.log(`  [HotelService] Booked ${b.id}`);
    return b;
  }
}

const fSvc = new FlightService();
const hSvc = new HotelService();
fSvc.search("DEL", "BOM"); hSvc.search("Mumbai");
fSvc.book("FL-1000", 1); hSvc.book("HT-2000", 1);
console.log("  Each service has its own database and deploys independently\n");

// ════════════════════════════════════════════════════════════════
// SECTION 4 — Service Boundary Identification (DDD)
// ════════════════════════════════════════════════════════════════

// WHY: Wrong boundaries create a distributed monolith — worst
// of both worlds. DDD bounded contexts guide decomposition.

console.log("--- SECTION 4: Service Boundary Identification (DDD) ---\n");

const domains = {
  "Flight Booking": { entities: ["Flight", "Seat", "Airline"], events: ["FlightBooked", "FlightCancelled"], team: "Flight Squad" },
  "Hotel Booking": { entities: ["Hotel", "Room"], events: ["HotelBooked", "HotelCancelled"], team: "Stay Squad" },
  "Bus Booking": { entities: ["Bus", "Operator"], events: ["BusBooked"], team: "Ground Transport Squad" },
  "Payment": { entities: ["Payment", "Refund", "Invoice"], events: ["PaymentCompleted", "RefundIssued"], team: "Payments Squad" },
  "User Management": { entities: ["User", "Profile"], events: ["UserRegistered"], team: "Identity Squad" },
};
for (const [ctx, d] of Object.entries(domains)) {
  console.log(`  [${ctx}] Entities: ${d.entities.join(", ")} | Events: ${d.events.join(", ")} | Team: ${d.team}`);
}
console.log("\n  RULE: If two modules share no entities and communicate only through events,");
console.log("  they are separate bounded contexts.\n");

// ════════════════════════════════════════════════════════════════
// SECTION 5 — Strangler Fig Pattern Step-by-Step
// ════════════════════════════════════════════════════════════════

// WHY: Rewriting from scratch is risky. The strangler fig lets you
// migrate incrementally via a routing proxy.

console.log("--- SECTION 5: Strangler Fig Pattern ---\n");

class StranglerFigMigration {
  constructor() {
    this.monolith = new MakeMyTripMonolith();
    this.flightSvc = new FlightService();
    this.hotelSvc = new HotelService();
    this.routing = { flights: "monolith", hotels: "monolith", buses: "monolith" };
  }
  route(domain, ...args) {
    const target = this.routing[domain];
    console.log(`    [Router] ${domain} -> ${target.toUpperCase()}`);
    if (target === "microservice") {
      if (domain === "flights") return this.flightSvc.search(...args);
      if (domain === "hotels") return this.hotelSvc.search(...args);
    } else {
      if (domain === "flights") return this.monolith.searchFlights(...args);
      if (domain === "hotels") return this.monolith.searchHotels(...args);
      if (domain === "buses") return this.monolith.searchBuses(...args);
    }
  }
  migrate(domain) {
    this.routing[domain] = "microservice";
    console.log(`  Migrated "${domain}" to microservice. Routing: ${JSON.stringify(this.routing)}`);
  }
}

const mig = new StranglerFigMigration();
console.log("  INITIAL — everything in monolith:");
mig.route("flights", "DEL", "BOM"); mig.route("hotels", "Mumbai");

mig.migrate("flights");
console.log("  After migrating flights:");
mig.route("flights", "DEL", "BOM"); mig.route("hotels", "Mumbai");

mig.migrate("hotels"); mig.migrate("buses");
console.log(`  Final routing: ${JSON.stringify(mig.routing)}`);
console.log("  Monolith is now EMPTY and can be decommissioned!\n");

// ════════════════════════════════════════════════════════════════
// SECTION 6 — Shared Database Anti-Pattern
// ════════════════════════════════════════════════════════════════

// WHY: Multiple services sharing a DB lose independent deployability.
// Schema changes in one service break others.

console.log("--- SECTION 6: Shared Database Anti-Pattern ---\n");

const sharedDB = [
  { id: 1, type: "flight", price: 4500, status: "confirmed" },
  { id: 2, type: "hotel", price: 2500, status: "confirmed" },
];
console.log("  ANTI-PATTERN: Both services read/write same bookings table");
sharedDB[0].seatClass = "economy"; // Flight team adds column
console.log(`  Flight booking: ${JSON.stringify(sharedDB[0])}`);
console.log(`  Hotel booking:  ${JSON.stringify(sharedDB[1])}`);
console.log("  Hotel service breaks: 'seatClass' is undefined!\n");
console.log("  Problems:");
["Tight coupling — schemas cannot evolve independently",
 "Deployment lock — migration requires coordinating all teams",
 "No encapsulation — any service can modify any data",
 "Scaling bottleneck — single DB for all services",
].forEach((p, i) => console.log(`    ${i + 1}. ${p}`));
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 7 — Database Per Service
// ════════════════════════════════════════════════════════════════

// WHY: Each microservice owns its data store for independent
// schema evolution, technology choice, and scaling.

console.log("--- SECTION 7: Database Per Service ---\n");

[["FlightService", "PostgreSQL", "flights, flight_bookings, airlines"],
 ["HotelService", "MongoDB", "hotels, rooms, hotel_bookings"],
 ["BusService", "MySQL", "buses, bus_bookings, operators"],
 ["PaymentService", "PostgreSQL", "payments, refunds, invoices"],
].forEach(([svc, db, tables]) => console.log(`  ${svc} -> ${db}: [${tables}]`));

console.log("\n  Benefits: Each team picks best DB, schema changes are local, independent scaling");
console.log("  Challenge: Cross-service queries need API composition or CQRS read model\n");

// ════════════════════════════════════════════════════════════════
// SECTION 8 — Inter-Service Communication Patterns
// ════════════════════════════════════════════════════════════════

// WHY: Choosing sync vs async profoundly affects latency,
// coupling, and resilience.

console.log("--- SECTION 8: Inter-Service Communication ---\n");

console.log("  1. Synchronous (REST/gRPC):");
console.log("     Client -> FlightService -> PaymentService -> Response");
function callPayment(amount) { return { status: "success", txn: "TXN-" + Math.floor(Math.random() * 10000) }; }
function bookFlight(fId, uId) {
  console.log(`    [FlightService] Booking ${fId} for user ${uId}`);
  const pay = callPayment(4500);
  console.log(`    [PaymentService] Processing Rs.4500 -> ${pay.status}`);
  return { bookingId: "BK-101", payment: pay };
}
const syncResult = bookFlight("FL-100", 1);
console.log(`    Result: ${JSON.stringify(syncResult)}\n`);

console.log("  2. Asynchronous (Events):");
class MsgBus {
  constructor() { this.subs = {}; }
  subscribe(topic, name, fn) { if (!this.subs[topic]) this.subs[topic] = []; this.subs[topic].push({ name, fn }); }
  publish(topic, msg) {
    console.log(`    [Bus] Published "${topic}"`);
    (this.subs[topic] || []).forEach(({ name, fn }) => { console.log(`      -> ${name} handling`); fn(msg); });
  }
}
const bus = new MsgBus();
bus.subscribe("booking.created", "PaymentService", (m) => console.log(`         Processing Rs.${m.amount}`));
bus.subscribe("booking.created", "NotificationService", (m) => console.log(`         Emailing user ${m.userId}`));
bus.publish("booking.created", { bookingId: "BK-201", userId: 1, amount: 4500 });

console.log("\n  Comparison:");
[["Coupling", "Tight", "Loose"], ["Latency", "Waits for response", "Fire and forget"],
 ["Failure", "Cascading", "Isolated"], ["Consistency", "Immediate", "Eventual"],
].forEach(([a, s, as]) => console.log(`    ${a.padEnd(14)} | ${s.padEnd(22)} | ${as}`));
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 9 — Migration Checklist and Timeline
// ════════════════════════════════════════════════════════════════

// WHY: Migration requires organizational, process, and cultural
// changes beyond just technical work.

console.log("--- SECTION 9: Migration Checklist ---\n");

[{ p: "Phase 0 (Month 1-2)", t: ["Identify bounded contexts", "Map dependencies", "Set up CI/CD", "Deploy API gateway"] },
 { p: "Phase 1 (Month 3-4)", t: ["Pick least coupled domain (Bus)", "Build new service with own DB", "Strangler fig routing"] },
 { p: "Phase 2 (Month 4-5)", t: ["Dual-write old + new DB", "Backfill historical data", "Switch reads to new service"] },
 { p: "Phase 3 (Month 5-12)", t: ["Extract Hotel, Flight, Payment", "Add async messaging", "Implement distributed tracing"] },
 { p: "Phase 4 (Month 12+)", t: ["Verify zero monolith traffic", "Archive codebase", "Decommission shared DB"] },
].forEach(({ p, t }) => { console.log(`  ${p}`); t.forEach((s) => console.log(`    - ${s}`)); console.log(); });

// ════════════════════════════════════════════════════════════════
// SECTION 10 — Complete Migration Simulation
// ════════════════════════════════════════════════════════════════

// WHY: Seeing the full journey end-to-end solidifies understanding.

console.log("--- SECTION 10: Complete Migration Simulation ---\n");

const modules = ["flights", "hotels", "buses", "payments", "users"];
const migrated = [];
const steps = [
  [1, "Monolith serving 10M req/day"], [2, "DDD identifies 5 bounded contexts"],
  [3, "API Gateway deployed"], [4, "BusService extracted"], [6, "HotelService extracted"],
  [8, "PaymentService extracted"], [10, "FlightService extracted"], [12, "UserService extracted"],
  [13, "Monolith decommissioned!"],
];
const extractOrder = ["buses", "hotels", "payments", "flights", "users"];
let ei = 0;
steps.forEach(([month, action]) => {
  console.log(`  Month ${String(month).padStart(2)}: ${action}`);
  if (action.includes("extracted")) { migrated.push(extractOrder[ei]); modules.splice(modules.indexOf(extractOrder[ei]), 1); ei++; }
});
console.log(`\n  Monolith remaining: [${modules.join(", ") || "NONE"}]`);
console.log(`  Microservices: [${migrated.join(", ")}]\n`);

// ════════════════════════════════════════════════════════════════
// KEY TAKEAWAYS
// ════════════════════════════════════════════════════════════════

console.log("=".repeat(70));
console.log("  KEY TAKEAWAYS");
console.log("=".repeat(70));
console.log();
console.log("  1. Start with a monolith for small teams and early products.");
console.log("  2. Use DDD bounded contexts to find correct service boundaries.");
console.log("  3. Strangler fig enables incremental migration via routing proxy.");
console.log("  4. Shared database is an anti-pattern — it couples services.");
console.log("  5. Each microservice must own its data store.");
console.log("  6. Use sync (REST/gRPC) for queries, async (events) for commands.");
console.log("  7. Migration is organizational as much as technical.");
console.log("  8. Extract the least coupled, lowest risk service first.");
console.log();
console.log('  "MakeMyTrip did not rewrite overnight. Like the strangler fig that');
console.log('   slowly wraps around a host tree, they built new services around the');
console.log('   old system until it was hollow — and then they turned it off."');
console.log();
