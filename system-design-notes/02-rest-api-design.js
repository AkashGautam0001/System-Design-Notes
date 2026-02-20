/** ============================================================
 *  FILE 02: REST API DESIGN
 *  ============================================================
 *  Topics: REST principles, URI design, CRUD mapping, versioning,
 *          pagination, filtering, HATEOAS, idempotency
 *
 *  WHY THIS MATTERS:
 *  REST is the dominant architectural style for web APIs. Badly
 *  designed APIs lead to confusion, breaking changes, and angry
 *  developers. A well-designed REST API is intuitive, scalable,
 *  and evolvable — think of it as the contract between frontend
 *  and backend teams.
 *  ============================================================ */

// STORY: Swiggy Restaurant API
// When you open Swiggy, every restaurant is a "resource" with a unique URI.
// Your orders are sub-resources under your user profile. When you scroll
// down and see "Load More Restaurants," that is pagination in action.
// Filtering by cuisine (South Indian, Chinese) maps to query parameters.
// The entire Swiggy experience is a well-designed REST API underneath.

console.log("=".repeat(70));
console.log("  FILE 02: REST API DESIGN");
console.log("=".repeat(70));
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 1 — REST Principles
// ════════════════════════════════════════════════════════════════

// WHY: REST is not just "use HTTP" — it is a set of constraints
// (statelessness, uniform interface, etc.) that, when followed,
// make APIs predictable and scalable.

console.log("--- SECTION 1: REST Principles ---\n");

const restPrinciples = [
  {
    name: "Client-Server Separation",
    description: "Client (Swiggy app) and server (Swiggy backend) evolve independently",
    example: "Swiggy can redesign its app without changing the API",
    violation: "Server sending UI HTML mixed with data",
  },
  {
    name: "Statelessness",
    description: "Each request carries ALL information needed to process it",
    example: "Every Swiggy API call includes auth token — server stores no session",
    violation: "Server remembering which page you were on between requests",
  },
  {
    name: "Cacheability",
    description: "Responses must declare whether they are cacheable",
    example: "Restaurant menu can be cached for 5 minutes; cart total cannot",
    violation: "Dynamic data with no Cache-Control header",
  },
  {
    name: "Uniform Interface",
    description: "Standard methods (GET/POST/PUT/DELETE) and resource-based URIs",
    example: "GET /restaurants/123 always means fetch restaurant 123",
    violation: "POST /getRestaurant with body {id: 123}",
  },
  {
    name: "Layered System",
    description: "Client cannot tell if it is talking to server, CDN, or load balancer",
    example: "Swiggy CDN serves images; API gateway routes to microservices",
    violation: "Client needs to know internal server topology",
  },
  {
    name: "Code on Demand (Optional)",
    description: "Server can send executable code to extend client",
    example: "Swiggy sending a JavaScript widget for offers carousel",
    violation: "N/A — this constraint is optional",
  },
];

restPrinciples.forEach((p, i) => {
  console.log(`  ${i + 1}. ${p.name}`);
  console.log(`     Description: ${p.description}`);
  console.log(`     Swiggy Example: ${p.example}`);
  console.log(`     Violation: ${p.violation}`);
  console.log();
});

// ════════════════════════════════════════════════════════════════
// SECTION 2 — URI Design Best Practices
// ════════════════════════════════════════════════════════════════

// WHY: URIs are the nouns of your API. Good URI design makes
// the API self-documenting. Developers should guess the URI
// without reading documentation.

console.log("--- SECTION 2: URI Design Best Practices ---\n");

const uriExamples = {
  good: [
    { uri: "GET /api/v1/restaurants", description: "List all restaurants" },
    { uri: "GET /api/v1/restaurants/42", description: "Get restaurant 42" },
    { uri: "GET /api/v1/restaurants/42/menu", description: "Get menu for restaurant 42" },
    { uri: "GET /api/v1/restaurants/42/menu/items", description: "List menu items" },
    { uri: "POST /api/v1/orders", description: "Create a new order" },
    { uri: "GET /api/v1/users/me/orders", description: "List my orders" },
    { uri: "GET /api/v1/users/me/orders/789", description: "Get specific order" },
    { uri: "PATCH /api/v1/orders/789", description: "Update order (add item)" },
    { uri: "DELETE /api/v1/orders/789", description: "Cancel order" },
    { uri: "GET /api/v1/restaurants?cuisine=south-indian&city=bangalore", description: "Filter by query params" },
  ],
  bad: [
    { uri: "GET /getRestaurant/42", why: "Verb in URI — REST uses HTTP methods for verbs" },
    { uri: "POST /api/createOrder", why: "Verb in URI — should be POST /api/orders" },
    { uri: "GET /api/Restaurants/42", why: "Uppercase — URIs should be lowercase" },
    { uri: "DELETE /api/v1/deleteOrder/789", why: "Redundant verb — DELETE already means delete" },
  ],
};

console.log("  GOOD URI Design:");
uriExamples.good.forEach((e) => {
  console.log(`    ${e.uri.padEnd(58)} -> ${e.description}`);
});

console.log("\n  BAD URI Design:");
uriExamples.bad.forEach((e) => {
  console.log(`    ${e.uri.padEnd(40)} -> Problem: ${e.why}`);
});

console.log("\n  Rules: Use NOUNS not VERBS | Plural nouns | Lowercase with hyphens");
console.log("         Nest sub-resources: /restaurants/42/reviews | Filter via query params");
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 3 — CRUD to HTTP Method Mapping
// ════════════════════════════════════════════════════════════════

// WHY: Correct mapping between CRUD operations and HTTP methods
// ensures predictable behavior, proper caching, and clear semantics.

console.log("--- SECTION 3: CRUD to HTTP Mapping ---\n");

class SwiggyAPI {
  constructor() {
    this.restaurants = new Map();
    this.orders = new Map();
    this.nextRestId = 1;
    this.nextOrderId = 100;

    // Seed data
    this.restaurants.set(1, { id: 1, name: "Meghana Foods", cuisine: "Biryani", city: "Bangalore", rating: 4.5 });
    this.restaurants.set(2, { id: 2, name: "Saravana Bhavan", cuisine: "South Indian", city: "Chennai", rating: 4.3 });
    this.restaurants.set(3, { id: 3, name: "Bademiya", cuisine: "Kebabs", city: "Mumbai", rating: 4.1 });
    this.nextRestId = 4;
  }

  // CREATE -> POST
  createOrder(orderData) {
    const id = this.nextOrderId++;
    const order = { id, ...orderData, status: "placed", createdAt: new Date().toISOString() };
    this.orders.set(id, order);
    console.log(`  POST /orders -> 201 Created`);
    console.log(`    Response: ${JSON.stringify(order)}`);
    return order;
  }

  // READ (collection) -> GET
  listRestaurants(filters) {
    let results = Array.from(this.restaurants.values());
    if (filters.cuisine) {
      results = results.filter((r) => r.cuisine.toLowerCase() === filters.cuisine.toLowerCase());
    }
    if (filters.city) {
      results = results.filter((r) => r.city.toLowerCase() === filters.city.toLowerCase());
    }
    console.log(`  GET /restaurants?${new URLSearchParams(filters)} -> 200 OK`);
    console.log(`    Found ${results.length} restaurant(s):`);
    results.forEach((r) => console.log(`      - ${r.name} (${r.cuisine}, ${r.city})`));
    return results;
  }

  // READ (single) -> GET
  getRestaurant(id) {
    const rest = this.restaurants.get(id);
    if (!rest) {
      console.log(`  GET /restaurants/${id} -> 404 Not Found`);
      return null;
    }
    console.log(`  GET /restaurants/${id} -> 200 OK`);
    console.log(`    Response: ${JSON.stringify(rest)}`);
    return rest;
  }

  // FULL UPDATE -> PUT
  updateRestaurant(id, data) {
    if (!this.restaurants.has(id)) {
      console.log(`  PUT /restaurants/${id} -> 404 Not Found`);
      return null;
    }
    const updated = { id, ...data };
    this.restaurants.set(id, updated);
    console.log(`  PUT /restaurants/${id} -> 200 OK (full replacement)`);
    console.log(`    Response: ${JSON.stringify(updated)}`);
    return updated;
  }

  // PARTIAL UPDATE -> PATCH
  patchOrder(id, updates) {
    const order = this.orders.get(id);
    if (!order) {
      console.log(`  PATCH /orders/${id} -> 404 Not Found`);
      return null;
    }
    Object.assign(order, updates);
    console.log(`  PATCH /orders/${id} -> 200 OK (partial update)`);
    console.log(`    Response: ${JSON.stringify(order)}`);
    return order;
  }

  // DELETE -> DELETE
  cancelOrder(id) {
    if (!this.orders.has(id)) {
      console.log(`  DELETE /orders/${id} -> 404 Not Found`);
      return false;
    }
    this.orders.delete(id);
    console.log(`  DELETE /orders/${id} -> 204 No Content`);
    return true;
  }
}

const swiggy = new SwiggyAPI();
swiggy.listRestaurants({ city: "bangalore" });
console.log();
swiggy.getRestaurant(1);
console.log();
swiggy.createOrder({ restaurantId: 1, items: ["Biryani", "Raita"], total: 450 });
console.log();
swiggy.patchOrder(100, { status: "preparing" });
console.log();
swiggy.cancelOrder(100);
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 4 — API Versioning Strategies
// ════════════════════════════════════════════════════════════════

// WHY: APIs evolve. Without versioning, every change breaks existing
// clients. Swiggy's Android app v2.0 should still work when the
// API introduces v3 changes.

console.log("--- SECTION 4: API Versioning Strategies ---\n");

const versioningStrategies = [
  { name: "URI Path",      example: "/api/v1/restaurants vs /api/v2/restaurants", pros: "Simple, explicit", cons: "URL pollution", usedBy: "Swiggy, Zomato" },
  { name: "Query Param",   example: "/api/restaurants?version=2",                pros: "Clean URIs",      cons: "Easy to forget", usedBy: "Internal APIs" },
  { name: "Header",        example: "Accept: application/vnd.swiggy.v2+json",   pros: "Cleanest URIs",   cons: "Hard to test",  usedBy: "GitHub API" },
  { name: "Additive Only", example: "Always add fields, never remove",           pros: "No versioning",   cons: "Tech debt",     usedBy: "GraphQL APIs" },
];

versioningStrategies.forEach((v) => {
  console.log(`  ${v.name.padEnd(15)} ${v.example}`);
  console.log(`${"".padEnd(18)}Pros: ${v.pros} | Cons: ${v.cons} | Used by: ${v.usedBy}`);
});

// Simulation
class VersionedAPI {
  static v1GetRestaurant(id) {
    return { id, name: "Meghana Foods", rating: 4.5 };
  }
  static v2GetRestaurant(id) {
    return {
      id,
      name: "Meghana Foods",
      rating: 4.5,
      deliveryTime: "30-35 min",
      offers: [{ code: "SWIGGY50", discount: "50% off up to Rs 100" }],
      sustainabilityScore: "A",
    };
  }
}

console.log("  Version comparison for GET /restaurants/1:");
console.log(`    v1: ${JSON.stringify(VersionedAPI.v1GetRestaurant(1))}`);
console.log(`    v2: ${JSON.stringify(VersionedAPI.v2GetRestaurant(1))}`);
console.log("    Note: v2 adds fields but v1 response still works for old clients");
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 5 — Pagination (Offset and Cursor)
// ════════════════════════════════════════════════════════════════

// WHY: Returning ALL restaurants at once would crash the app and
// waste bandwidth. Pagination returns data in manageable chunks.
// Swiggy's "Load More" button = pagination.

console.log("--- SECTION 5: Pagination ---\n");

class PaginationDemo {
  constructor() {
    this.allRestaurants = [];
    const names = [
      "Meghana Foods", "Saravana Bhavan", "Bademiya", "Paradise Biryani",
      "Dosa Plaza", "Karim's", "MTR", "Haldiram's", "Chai Point",
      "Behrouz Biryani", "Faasos", "Box8", "Rebel Foods", "EatFit",
      "Wow! Momo", "Chaayos", "Burger Singh", "Biryani Blues",
      "The Bowl Company", "Mojo Pizza",
    ];
    names.forEach((name, i) => {
      this.allRestaurants.push({ id: i + 1, name, rating: (3.5 + Math.random() * 1.5).toFixed(1) });
    });
  }

  // Offset-based pagination
  offsetPaginate(page, limit) {
    const offset = (page - 1) * limit;
    const items = this.allRestaurants.slice(offset, offset + limit);
    const totalPages = Math.ceil(this.allRestaurants.length / limit);

    const result = {
      data: items,
      pagination: {
        page,
        limit,
        totalItems: this.allRestaurants.length,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };

    console.log(`  Offset Pagination: GET /restaurants?page=${page}&limit=${limit}`);
    console.log(`    Items: ${items.map((r) => r.name).join(", ")}`);
    console.log(`    Pagination: page ${page}/${totalPages}, total: ${this.allRestaurants.length}`);
    console.log(`    Problem: If a new restaurant is added while user is on page 2,`);
    console.log(`             page 3 may show a duplicate from page 2.`);
    return result;
  }

  // Cursor-based pagination
  cursorPaginate(afterId, limit) {
    let startIndex = 0;
    if (afterId) {
      startIndex = this.allRestaurants.findIndex((r) => r.id === afterId) + 1;
    }
    const items = this.allRestaurants.slice(startIndex, startIndex + limit);
    const lastItem = items[items.length - 1];
    const nextCursor = lastItem ? lastItem.id : null;
    const hasMore = startIndex + limit < this.allRestaurants.length;

    const result = {
      data: items,
      pagination: {
        nextCursor: hasMore ? nextCursor : null,
        hasMore,
      },
    };

    console.log(`\n  Cursor Pagination: GET /restaurants?after=${afterId || "start"}&limit=${limit}`);
    console.log(`    Items: ${items.map((r) => r.name).join(", ")}`);
    console.log(`    Next cursor: ${result.pagination.nextCursor}, hasMore: ${hasMore}`);
    console.log(`    Advantage: Stable results even when new items are inserted.`);
    return result;
  }
}

const paginator = new PaginationDemo();
paginator.offsetPaginate(1, 5);
paginator.offsetPaginate(2, 5);

paginator.cursorPaginate(null, 5);
paginator.cursorPaginate(5, 5);
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 6 — Filtering and Sorting
// ════════════════════════════════════════════════════════════════

// WHY: Users need to narrow down results. Swiggy lets you filter
// by cuisine, price, rating, and delivery time — all via query params.

console.log("\n--- SECTION 6: Filtering and Sorting ---\n");

class FilterEngine {
  constructor(data) {
    this.data = data;
  }

  apply(params) {
    let result = [...this.data];

    console.log(`  Applied filters: ${JSON.stringify(params)}`);

    // Filter
    if (params.cuisine) {
      result = result.filter((r) => r.cuisine === params.cuisine);
    }
    if (params.minRating) {
      result = result.filter((r) => r.rating >= params.minRating);
    }
    if (params.city) {
      result = result.filter((r) => r.city === params.city);
    }
    if (params.maxDeliveryTime) {
      result = result.filter((r) => r.deliveryTime <= params.maxDeliveryTime);
    }

    // Sort
    if (params.sortBy) {
      const order = params.sortOrder === "desc" ? -1 : 1;
      result.sort((a, b) => {
        if (a[params.sortBy] < b[params.sortBy]) return -1 * order;
        if (a[params.sortBy] > b[params.sortBy]) return 1 * order;
        return 0;
      });
    }

    return result;
  }
}

const restaurants = [
  { name: "Meghana Foods", cuisine: "Biryani", city: "Bangalore", rating: 4.5, deliveryTime: 30 },
  { name: "Saravana Bhavan", cuisine: "South Indian", city: "Chennai", rating: 4.3, deliveryTime: 25 },
  { name: "Karim's", cuisine: "Mughlai", city: "Delhi", rating: 4.6, deliveryTime: 45 },
  { name: "MTR", cuisine: "South Indian", city: "Bangalore", rating: 4.4, deliveryTime: 20 },
  { name: "Paradise", cuisine: "Biryani", city: "Hyderabad", rating: 4.7, deliveryTime: 35 },
];

const engine = new FilterEngine(restaurants);

console.log("  GET /restaurants?cuisine=South Indian");
let filtered = engine.apply({ cuisine: "South Indian" });
filtered.forEach((r) => console.log(`    - ${r.name} (${r.city}, ${r.rating})`));

console.log("\n  GET /restaurants?city=Bangalore&sortBy=rating&sortOrder=desc");
filtered = engine.apply({ city: "Bangalore", sortBy: "rating", sortOrder: "desc" });
filtered.forEach((r) => console.log(`    - ${r.name} (Rating: ${r.rating})`));

console.log("\n  GET /restaurants?minRating=4.5&sortBy=deliveryTime&sortOrder=asc");
filtered = engine.apply({ minRating: 4.5, sortBy: "deliveryTime", sortOrder: "asc" });
filtered.forEach((r) => console.log(`    - ${r.name} (Rating: ${r.rating}, Delivery: ${r.deliveryTime}min)`));
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 7 — HATEOAS Links
// ════════════════════════════════════════════════════════════════

// WHY: HATEOAS (Hypermedia As The Engine Of Application State)
// makes APIs self-discoverable. The response tells the client
// what actions are available next — like a waiter handing you
// the dessert menu after your main course.

console.log("--- SECTION 7: HATEOAS Links ---\n");

function buildHATEOASResponse(order) {
  const links = [
    { rel: "self", href: `/api/v1/orders/${order.id}`, method: "GET" },
  ];

  if (order.status === "placed") {
    links.push({ rel: "cancel", href: `/api/v1/orders/${order.id}`, method: "DELETE" });
    links.push({ rel: "track", href: `/api/v1/orders/${order.id}/tracking`, method: "GET" });
  }
  if (order.status === "delivered") {
    links.push({ rel: "rate", href: `/api/v1/orders/${order.id}/rating`, method: "POST" });
    links.push({ rel: "reorder", href: `/api/v1/orders`, method: "POST" });
    links.push({ rel: "invoice", href: `/api/v1/orders/${order.id}/invoice`, method: "GET" });
  }
  if (order.status === "preparing") {
    links.push({ rel: "track", href: `/api/v1/orders/${order.id}/tracking`, method: "GET" });
  }

  links.push({ rel: "restaurant", href: `/api/v1/restaurants/${order.restaurantId}`, method: "GET" });

  return { ...order, _links: links };
}

const orderPlaced = { id: 501, restaurantId: 1, status: "placed", total: 450 };
const orderDelivered = { id: 502, restaurantId: 2, status: "delivered", total: 280 };

console.log("  Order (placed) with HATEOAS links:");
console.log(JSON.stringify(buildHATEOASResponse(orderPlaced), null, 4));
console.log("\n  Order (delivered) with HATEOAS links:");
console.log(JSON.stringify(buildHATEOASResponse(orderDelivered), null, 4));
console.log("\n  Notice: Available actions change based on order status.");
console.log("  The client discovers what it can do from the response itself.");
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 8 — Idempotency (Safe vs Unsafe Methods)
// ════════════════════════════════════════════════════════════════

// WHY: Network failures happen. If a user clicks "Pay" and the
// connection drops, did the payment go through? Idempotency ensures
// that retrying a request produces the same result — no double charge.

console.log("--- SECTION 8: Idempotency ---\n");

class IdempotencyDemo {
  constructor() {
    this.processedKeys = new Map();
    this.balance = 1000;
  }

  processPayment(idempotencyKey, amount, description) {
    console.log(`  Processing: ${description} (Rs ${amount})`);
    console.log(`  Idempotency-Key: ${idempotencyKey}`);

    if (this.processedKeys.has(idempotencyKey)) {
      const cached = this.processedKeys.get(idempotencyKey);
      console.log(`  IDEMPOTENT: Already processed! Returning cached result.`);
      console.log(`  Balance unchanged: Rs ${this.balance}`);
      console.log(`  Response: ${JSON.stringify(cached)}`);
      return cached;
    }

    this.balance -= amount;
    const result = {
      transactionId: "TXN" + Date.now(),
      amount,
      newBalance: this.balance,
      status: "success",
    };
    this.processedKeys.set(idempotencyKey, result);
    console.log(`  NEW transaction processed.`);
    console.log(`  Balance: Rs ${this.balance}`);
    console.log(`  Response: ${JSON.stringify(result)}`);
    return result;
  }
}

const methodProperties = [
  { method: "GET", safe: true, idempotent: true, example: "View menu 10 times — same result" },
  { method: "HEAD", safe: true, idempotent: true, example: "Check if restaurant exists" },
  { method: "OPTIONS", safe: true, idempotent: true, example: "Check allowed methods" },
  { method: "PUT", safe: false, idempotent: true, example: "Set address to 'MG Road' 10 times — still 'MG Road'" },
  { method: "DELETE", safe: false, idempotent: true, example: "Delete order 10 times — same result after first" },
  { method: "POST", safe: false, idempotent: false, example: "Place order 10 times — 10 orders created!" },
  { method: "PATCH", safe: false, idempotent: false, example: "Increment quantity — each call adds more" },
];

console.log("  Method Safety and Idempotency:");
console.log(`  ${"Method".padEnd(10)} ${"Safe".padEnd(8)} ${"Idempotent".padEnd(12)} Example`);
console.log(`  ${"─".repeat(10)} ${"─".repeat(8)} ${"─".repeat(12)} ${"─".repeat(40)}`);
methodProperties.forEach((m) => {
  console.log(`  ${m.method.padEnd(10)} ${String(m.safe).padEnd(8)} ${String(m.idempotent).padEnd(12)} ${m.example}`);
});

console.log("\n  --- Swiggy Payment Idempotency Simulation ---\n");

const payment = new IdempotencyDemo();
const key = "order-501-pay-20240115";

// First attempt
payment.processPayment(key, 450, "Biryani order payment");
console.log();

// Network timeout! User clicks "Pay" again
console.log("  ... Network timeout! User retries ...\n");
payment.processPayment(key, 450, "Biryani order payment (RETRY)");
console.log();

// Third attempt
console.log("  ... Anxious user clicks again ...\n");
payment.processPayment(key, 450, "Biryani order payment (RETRY 2)");
console.log("\n  Result: Only Rs 450 deducted (once), despite 3 attempts.");
console.log("  This is why idempotency keys are critical for payments.");
console.log();

// ════════════════════════════════════════════════════════════════
// KEY TAKEAWAYS
// ════════════════════════════════════════════════════════════════
console.log("=".repeat(70));
console.log("  KEY TAKEAWAYS");
console.log("=".repeat(70));
console.log();
console.log("  1. REST is a set of constraints (stateless, uniform interface),");
console.log("     not just 'using HTTP methods'.");
console.log();
console.log("  2. URIs are nouns (/restaurants), HTTP methods are verbs");
console.log("     (GET, POST). Never put verbs in URIs.");
console.log();
console.log("  3. Version your APIs from day one. URI path versioning (/v1/)");
console.log("     is the most common and simplest approach.");
console.log();
console.log("  4. Cursor-based pagination is superior to offset-based for");
console.log("     large, frequently-changing datasets.");
console.log();
console.log("  5. Use query parameters for filtering and sorting —");
console.log("     keep the URI clean and the API flexible.");
console.log();
console.log("  6. HATEOAS makes APIs self-discoverable — the response tells");
console.log("     the client what it can do next.");
console.log();
console.log("  7. Idempotency keys prevent double-charging. POST is the most");
console.log("     dangerous method because it is NOT idempotent by default.");
console.log();
console.log("  8. A well-designed API is like a well-designed Swiggy menu —");
console.log("     intuitive, consistent, and a joy to consume.");
console.log();
console.log('  "Design your API as if the developer using it is a sleep-deprived');
console.log('   engineer debugging at 3 AM during a Swiggy sale. Be kind."');
console.log('                                            — The Swiggy Architect');
console.log();
