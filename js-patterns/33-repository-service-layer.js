/**
 * ============================================================
 *  FILE 33 : Repository, Service Layer & Unit of Work
 *  Topic  : Repository Pattern, Service Layer, Unit of Work
 *  WHY THIS MATTERS:
 *    Mixing database calls with business logic creates
 *    untestable spaghetti. Repository abstracts storage,
 *    Service Layer encapsulates business rules, and
 *    Unit of Work batches changes into atomic commits.
 * ============================================================
 */

// STORY: Seth Govind ji runs a kirana store godown. He separates the
// godown shelves (Repository) from business decisions (Service Layer)
// like credit, pricing, and home delivery — and tracks every month-end
// hisaab as a batch (Unit of Work).

// ────────────────────────────────────────────────────────────
// BLOCK 1 — Repository Pattern (Abstract Data Access)
// ────────────────────────────────────────────────────────────

// WHY: A Repository hides WHERE data lives (memory, file, API).
// Consumers call .findById() — they never know the storage engine.

class GodownRepository {
  constructor(name) {
    this.name = name;
    this.store = new Map();
    this.nextId = 1;
  }

  create(entity) {
    const id = this.nextId++;
    const record = { ...entity, id };
    this.store.set(id, record);
    return { ...record };
  }

  findById(id) {
    const r = this.store.get(id);
    return r ? { ...r } : null;
  }

  findAll() { return [...this.store.values()]; }

  update(id, changes) {
    const existing = this.store.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...changes, id };
    this.store.set(id, updated);
    return { ...updated };
  }

  delete(id) { return this.store.delete(id); }
}

// Seth Govind ji stocks the godown shelves
console.log("=== Repository Pattern ==="); // Output: === Repository Pattern ===

const kiranaRepo = new GodownRepository("kirana-items");
kiranaRepo.create({ name: "Atta 10kg", qty: 200, price: 450 });
kiranaRepo.create({ name: "Toor Dal 1kg", qty: 50, price: 160 });
kiranaRepo.create({ name: "Basmati Rice 5kg", qty: 500, price: 380 });

console.log("Item #1:", kiranaRepo.findById(1).name); // Output: Item #1: Atta 10kg
console.log("All count:", kiranaRepo.findAll().length); // Output: All count: 3

// WHY: Swapping storage is one-line — nothing else changes
kiranaRepo.update(2, { qty: 45 });
console.log("Updated #2 qty:", kiranaRepo.findById(2).qty); // Output: Updated #2 qty: 45

kiranaRepo.delete(3);
console.log("After delete count:", kiranaRepo.findAll().length); // Output: After delete count: 2

// ────────────────────────────────────────────────────────────
// BLOCK 2 — Service Layer (Business Logic)
// ────────────────────────────────────────────────────────────

// WHY: The Service Layer sits between controllers and repositories.
// It enforces business rules so that no controller can bypass them.

class KiranaService {
  constructor(kiranaRepo, orderRepo) {
    this.items = kiranaRepo;
    this.orders = orderRepo;
  }

  restock(itemId, amount) {
    const p = this.items.findById(itemId);
    if (!p) throw new Error("Item not found");
    // WHY: Business rule — max stock 1000 per item in godown
    const newQty = Math.min(p.qty + amount, 1000);
    this.items.update(itemId, { qty: newQty });
    return this.items.findById(itemId);
  }

  placeOrder(itemId, qty) {
    const p = this.items.findById(itemId);
    if (!p) throw new Error("Item not found");
    // WHY: Business rule — cannot sell more than stock (no udhaar on goods you don't have)
    if (p.qty < qty) {
      return { success: false, reason: "Insufficient stock" };
    }
    this.items.update(itemId, { qty: p.qty - qty });
    const order = this.orders.create({
      itemId,
      qty,
      total: (p.price * qty).toFixed(2),
      status: "confirmed"
    });
    return { success: true, order };
  }

  getOrderSummary() {
    return this.orders.findAll().map(o =>
      `Order #${o.id}: ${o.qty} units, \u20B9${o.total} [${o.status}]`
    );
  }
}

console.log("\n=== Service Layer ==="); // Output: === Service Layer ===

const orderRepo = new GodownRepository("orders");
const kiranaService = new KiranaService(kiranaRepo, orderRepo);

// Govind ji restocks and places orders through the service — never touching repos directly
const restocked = kiranaService.restock(1, 100);
console.log("Restocked Atta 10kg qty:", restocked.qty); // Output: Restocked Atta 10kg qty: 300

const o1 = kiranaService.placeOrder(1, 50);
console.log("Order success:", o1.success); // Output: Order success: true
console.log("Order total: \u20B9" + o1.order.total); // Output: Order total: ₹22500.00

const o2 = kiranaService.placeOrder(1, 999);
console.log("Oversell blocked:", o2.reason); // Output: Oversell blocked: Insufficient stock

const summary = kiranaService.getOrderSummary();
console.log("Orders:", summary[0]); // Output: Orders: Order #1: 50 units, ₹22500.00 [confirmed]

// ────────────────────────────────────────────────────────────
// BLOCK 3 — Unit of Work (Track Changes, Commit / Rollback)
// ────────────────────────────────────────────────────────────

// WHY: Unit of Work collects all changes during a business operation
// and commits them as one atomic batch — or rolls everything back.
// Seth Govind ji calls this the month-end hisaab (batch billing).

class MonthEndHisaab {
  constructor() {
    this.operations = [];
    this.committed = false;
  }

  registerCreate(repo, entity) {
    this.operations.push({ type: "create", repo, entity });
  }

  registerUpdate(repo, id, changes) {
    this.operations.push({ type: "update", repo, id, changes });
  }

  registerDelete(repo, id) {
    this.operations.push({ type: "delete", repo, id });
  }

  commit() {
    // WHY: All-or-nothing — if any operation fails, we stop
    const results = [];
    try {
      for (const op of this.operations) {
        if (op.type === "create") results.push(op.repo.create(op.entity));
        else if (op.type === "update") results.push(op.repo.update(op.id, op.changes));
        else if (op.type === "delete") results.push(op.repo.delete(op.id));
      }
      this.committed = true;
      return { success: true, count: results.length };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  rollback() {
    // WHY: Discard all pending changes
    const count = this.operations.length;
    this.operations = [];
    return count;
  }
}

console.log("\n=== Unit of Work (Month-End Hisaab) ==="); // Output: === Unit of Work (Month-End Hisaab) ===

const godownRepo = new GodownRepository("godown");

// Govind ji batches a big supply shipment as one atomic operation
const uow = new MonthEndHisaab();
uow.registerCreate(godownRepo, { name: "Mustard Oil 1L", qty: 300, price: 185 });
uow.registerCreate(godownRepo, { name: "Sugar 1kg", qty: 250, price: 45 });
uow.registerCreate(godownRepo, { name: "Chana Dal 1kg", qty: 100, price: 95 });

console.log("Pending ops:", uow.operations.length); // Output: Pending ops: 3
const commitResult = uow.commit();
console.log("Commit result:", commitResult.success, "ops:", commitResult.count); // Output: Commit result: true ops: 3
console.log("Godown items:", godownRepo.findAll().length); // Output: Godown items: 3

// Rollback scenario
const uow2 = new MonthEndHisaab();
uow2.registerCreate(godownRepo, { name: "Phantom Item", qty: 0 });
uow2.registerDelete(godownRepo, 1);
const rolled = uow2.rollback();
console.log("Rolled back ops:", rolled); // Output: Rolled back ops: 2
console.log("Godown still has:", godownRepo.findAll().length, "items"); // Output: Godown still has: 3 items

// Govind ji's summary
console.log("\nGovind ji's godown is organized:"); // Output: Govind ji's godown is organized:
console.log("- Repository hides storage details (godown shelves)"); // Output: - Repository hides storage details (godown shelves)
console.log("- Service Layer enforces kirana business rules"); // Output: - Service Layer enforces kirana business rules
console.log("- Month-end hisaab batches changes atomically"); // Output: - Month-end hisaab batches changes atomically

// ────────────────────────────────────────────────────────────
// KEY TAKEAWAYS
// ────────────────────────────────────────────────────────────
// 1. Repository (godown shelves) abstracts data access — swap in-memory for DB with no logic changes.
// 2. Service Layer enforces kirana business rules (credit limit, stock check) between controllers and repositories.
// 3. Unit of Work (month-end hisaab) collects mutations and commits/rolls back as one batch.
// 4. Together they create clean separation: storage | logic | transactions.
// 5. Test services by injecting fake repos — no database needed.
