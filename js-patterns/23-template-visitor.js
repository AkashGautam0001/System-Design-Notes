/**
 * ============================================================
 *  FILE 23 : Template Method & Visitor Patterns
 *  Topic   : Behavioral Design Patterns (Tough)
 *  WHY THIS MATTERS:
 *    Template Method defines the skeleton of an algorithm and
 *    lets subclasses fill in the steps. Visitor separates an
 *    algorithm from the object structure it operates on. Both
 *    promote open/closed principle — extend without modifying.
 * ============================================================
 */

// STORY: Temple Construction + GST Inspector — Sthapati Vishwakarma
// follows Vastu Shastra blueprints (Template); GST Inspector Mehta
// visits every shop on the street (Visitor).

// ────────────────────────────────────────────────────────────
//  BLOCK 1 : Template Method (fixed skeleton, override steps)
// ────────────────────────────────────────────────────────────

// WHY: The base class locks in the construction order. Subclasses only
//      override specific steps — they can't change the sequence.

class TempleBlueprint {
  // Template method — sealed Vastu Shastra algorithm
  build() {
    const result = [];
    result.push(this.layFoundation());
    result.push(this.erectPillars());
    result.push(this.buildGarbhagriha());
    result.push(this.addShikhara());      // hook — optional override
    return result;
  }

  layFoundation()     { return "generic stone foundation"; }
  erectPillars()      { return "generic pillars"; }
  buildGarbhagriha()  { return "generic sanctum"; }
  addShikhara()       { return "plain shikhara"; }   // default hook
}

class DravidianTemple extends TempleBlueprint {
  layFoundation()     { return "granite platform with Vastu grid"; }
  erectPillars()      { return "ornate carved granite pillars"; }
  buildGarbhagriha()  { return "dark granite garbhagriha with lingam"; }
  addShikhara()       { return "towering gopuram with painted stucco"; }
}

class NagaraTemple extends TempleBlueprint {
  layFoundation()     { return "sandstone jagati platform"; }
  erectPillars()      { return "intricately carved sandstone pillars"; }
  buildGarbhagriha()  { return "marble garbhagriha with deity idol"; }
  // addShikhara() uses default — "plain shikhara"
}

console.log("=== Sthapati Vishwakarma's Temple Blueprints (Template Method) ===");
                                                                     // Output: === Sthapati Vishwakarma's Temple Blueprints (Template Method) ===

const dravidian = new DravidianTemple();
const steps1 = dravidian.build();
console.log(`  Dravidian Temple: ${steps1.join(" -> ")}`);
// Output:   Dravidian Temple: granite platform with Vastu grid -> ornate carved granite pillars -> dark granite garbhagriha with lingam -> towering gopuram with painted stucco

const nagara = new NagaraTemple();
const steps2 = nagara.build();
console.log(`  Nagara Temple:    ${steps2.join(" -> ")}`);
// Output:   Nagara Temple:    sandstone jagati platform -> intricately carved sandstone pillars -> marble garbhagriha with deity idol -> plain shikhara

// WHY: Template method in functional style — pass step functions

function buildWith(foundation, pillars, garbhagriha, shikhara = () => "plain shikhara") {
  return [foundation(), pillars(), garbhagriha(), shikhara()];
}

const vesara = buildWith(
  () => "mixed stone-and-brick base",
  () => "lathe-turned decorative pillars",
  () => "compact garbhagriha with nandi",
  () => "stepped vimana tower"
);
console.log(`  Vesara Temple:    ${vesara.join(" -> ")}`);
// Output:   Vesara Temple:    mixed stone-and-brick base -> lathe-turned decorative pillars -> compact garbhagriha with nandi -> stepped vimana tower

// ────────────────────────────────────────────────────────────
//  BLOCK 2 : Visitor (GST Inspector visits shops on the street)
// ────────────────────────────────────────────────────────────

// WHY: When you have a stable structure but many operations,
//      a visitor lets you add operations without changing the nodes.

class KiranaShop {
  constructor(revenue) { this.revenue = revenue; }
  accept(visitor) { return visitor.visitKirana(this); }
}

class MedicalShop {
  constructor(revenue) { this.revenue = revenue; }
  accept(visitor) { return visitor.visitMedical(this); }
}

// Visitor 1: Calculate GST
class GSTVisitor {
  visitKirana(shop) { return Math.round(shop.revenue * 0.05); }     // 5% GST on kirana
  visitMedical(shop) { return Math.round(shop.revenue * 0.12); }    // 12% GST on medical
}

// Visitor 2: Compliance check
class ComplianceVisitor {
  visitKirana(shop) { return shop.revenue > 2000000 ? "GST registration needed" : "Exempt"; }
  visitMedical(shop) { return shop.revenue > 2000000 ? "GST + Drug License check" : "Drug License only"; }
}

console.log("\n=== GST Inspector Mehta's Shop Visits (Visitor) ==="); // Output: === GST Inspector Mehta's Shop Visits (Visitor) ===

const kirana = new KiranaShop(500000);
const medical = new MedicalShop(3000000);

const gstCalc = new GSTVisitor();
const compliance = new ComplianceVisitor();

console.log(`  Kirana GST:  ₹${kirana.accept(gstCalc)}`);           // Output:   Kirana GST:  ₹25000
console.log(`  Medical GST: ₹${medical.accept(gstCalc)}`);          // Output:   Medical GST: ₹360000

console.log(`  Kirana compliance:  ${kirana.accept(compliance)}`);   // Output:   Kirana compliance:  Exempt
console.log(`  Medical compliance: ${medical.accept(compliance)}`);  // Output:   Medical compliance: GST + Drug License check

// Add a new visitor without touching shop classes
class RevenueAuditVisitor {
  visitKirana(shop) { return shop.revenue > 1000000 ? "Audit required" : "No audit"; }
  visitMedical(shop) { return shop.revenue > 1500000 ? "Audit required" : "No audit"; }
}

console.log(`  Medical audit: ${medical.accept(new RevenueAuditVisitor())}`);
                                                                     // Output:   Medical audit: Audit required

// ────────────────────────────────────────────────────────────
//  BLOCK 3 : Double Dispatch — Market Street Visitor
// ────────────────────────────────────────────────────────────

// WHY: Double dispatch means the call depends on both the node type
//      AND the visitor type — the node calls the right visitor method.

class Market {
  constructor(name, children = []) {
    this.name = name;
    this.children = children;
  }
  accept(visitor) { return visitor.visitMarket(this); }
}

class Shop {
  constructor(name, rent) {
    this.name = name;
    this.rent = rent;
  }
  accept(visitor) { return visitor.visitShop(this); }
}

// Visitor A: Calculate total rent
class RentVisitor {
  visitShop(node) { return node.rent; }
  visitMarket(node) {
    return node.children.reduce((sum, c) => sum + c.accept(this), 0);
  }
}

// Visitor B: Render street map as indented string
class MapVisitor {
  constructor() { this.depth = 0; }
  visitShop(node) {
    return "  ".repeat(this.depth) + `- ${node.name} (₹${node.rent}/mo)`;
  }
  visitMarket(node) {
    const header = "  ".repeat(this.depth) + `[${node.name}]`;
    this.depth++;
    const body = node.children.map((c) => c.accept(this)).join("\n");
    this.depth--;
    return header + "\n" + body;
  }
}

// Visitor C: Serialize to plain object
class SerializeVisitor {
  visitShop(node) { return { type: "shop", name: node.name, rent: node.rent }; }
  visitMarket(node) {
    return { type: "market", name: node.name, children: node.children.map((c) => c.accept(this)) };
  }
}

console.log("\n=== GST Inspector Mehta Inspects the Market ===");    // Output: === GST Inspector Mehta Inspects the Market ===

const chandniChowk = new Market("Chandni Chowk", [
  new Market("Spice Lane", [
    new Shop("Sharma Masala", 25000),
    new Shop("Gupta Dry Fruits", 18000),
  ]),
  new Market("Cloth Lane", [
    new Shop("Bansal Sarees", 40000),
    new Shop("Agarwal Silks", 35000),
  ]),
  new Shop("Jain Chai Stall", 8000),
]);

const rentV = new RentVisitor();
console.log(`  Total rent: ₹${chandniChowk.accept(rentV)}`);        // Output:   Total rent: ₹126000

const mapV = new MapVisitor();
const rendered = chandniChowk.accept(mapV);
console.log(rendered);
// Output: [Chandni Chowk]
// Output:   [Spice Lane]
// Output:     - Sharma Masala (₹25000/mo)
// Output:     - Gupta Dry Fruits (₹18000/mo)
// Output:   [Cloth Lane]
// Output:     - Bansal Sarees (₹40000/mo)
// Output:     - Agarwal Silks (₹35000/mo)
// Output:   - Jain Chai Stall (₹8000/mo)

const serialized = chandniChowk.accept(new SerializeVisitor());
console.log(`  Serialized root: ${serialized.type}, ${serialized.name}`);
                                                                     // Output:   Serialized root: market, Chandni Chowk
console.log(`  Children count:  ${serialized.children.length}`);     // Output:   Children count:  3

// ────────────────────────────────────────────────────────────
//  KEY TAKEAWAYS
// ────────────────────────────────────────────────────────────
// 1. Template Method locks the Vastu Shastra construction sequence
//    in a base class; subclasses override only the material steps.
// 2. Visitor separates GST/compliance/audit algorithms from shop
//    structure via double dispatch: shop.accept(visitor) -> visitor.visitX(shop).
// 3. Adding a new inspection = adding a new visitor class.
//    No existing shop classes need to change.
// 4. The trade-off: adding a new shop type requires updating
//    every visitor — choose Visitor when the structure is stable
//    but operations (tax, compliance, audit) change frequently.
