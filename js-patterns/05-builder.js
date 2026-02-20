/**
 * ============================================================
 *  FILE 5 : Rajma Chawal Tiffin Service - Builder Pattern
 *  Topic  : Builder, Director, Fluent Builder
 *  WHY THIS MATTERS:
 *    When an object has many optional parts or must be assembled
 *    in a specific order, constructors become unwieldy.  The
 *    Builder separates construction from representation, letting
 *    you build complex objects step by step.
 * ============================================================
 */

// STORY: Amma builds complex thali orders step by step for her
//        tiffin service.  The combinations are endless, but the
//        process is always controlled.

console.log("=== FILE 05: Rajma Chawal Tiffin Service ===\n");

// ────────────────────────────────────
// BLOCK 1 — Classic Builder with Director
// ────────────────────────────────────

// WHY: The Builder separates construction steps from the final
//      product.  The Director knows the RECIPE (preset thali);
//      the Builder knows HOW to perform each step.

class Thali {
  constructor() {
    this.items = [];
    this.drink = null;
    this.notes = "";
  }
  toString() {
    const parts = [`Items: ${this.items.join(", ")}`];
    if (this.drink) parts.push(`Drink: ${this.drink}`);
    if (this.notes) parts.push(`Notes: ${this.notes}`);
    return parts.join(" | ");
  }
}

class ThaliBuilder {
  constructor() {
    this.thali = new Thali();
  }
  addDal(item) {
    this.thali.items.push(`Dal(${item})`);
    return this;
  }
  addRoti(item) {
    this.thali.items.push(`Roti(${item})`);
    return this;
  }
  addSabzi(item) {
    this.thali.items.push(`Sabzi(${item})`);
    return this;
  }
  addRice(item) {
    this.thali.items.push(`Rice(${item})`);
    return this;
  }
  addSweet(item) {
    this.thali.items.push(`Sweet(${item})`);
    return this;
  }
  setDrink(item) {
    this.thali.drink = item;
    return this;
  }
  setNotes(text) {
    this.thali.notes = text;
    return this;
  }
  build() {
    const result = this.thali;
    this.thali = new Thali(); // WHY: Reset so the builder is reusable
    return result;
  }
}

// WHY: The Director encapsulates common presets.  Client code
//      does not need to remember the exact sequence of steps.
class ThaliDirector {
  constructor(builder) {
    this.builder = builder;
  }
  makePunjabiThali() {
    return this.builder
      .addDal("Dal Makhani")
      .addRoti("Butter Naan")
      .addSabzi("Paneer Butter Masala")
      .addRice("Jeera Rice")
      .addSweet("Gulab Jamun")
      .setDrink("Lassi")
      .setNotes("Amma's Punjabi special")
      .build();
  }
  makeSouthIndianThali() {
    return this.builder
      .addDal("Sambar")
      .addRice("Steamed Rice")
      .addSabzi("Avial")
      .setDrink("Buttermilk")
      .build();
  }
}

const builder = new ThaliBuilder();
const director = new ThaliDirector(builder);

const punjabiThali = director.makePunjabiThali();
console.log("Punjabi:", punjabiThali.toString());
// Output: Punjabi: Items: Dal(Dal Makhani), Roti(Butter Naan), Sabzi(Paneer Butter Masala), Rice(Jeera Rice), Sweet(Gulab Jamun) | Drink: Lassi | Notes: Amma's Punjabi special

const southThali = director.makeSouthIndianThali();
console.log("South Indian:", southThali.toString());
// Output: South Indian: Items: Dal(Sambar), Rice(Steamed Rice), Sabzi(Avial) | Drink: Buttermilk

// WHY: You can also use the builder directly for custom thalis
const custom = builder
  .addDal("Rajma")
  .addRice("Chawal")
  .addSabzi("Aloo Gobi")
  .addSweet("Kheer")
  .setDrink("Chaas")
  .build();
console.log("Custom:", custom.toString());
// Output: Custom: Items: Dal(Rajma), Rice(Chawal), Sabzi(Aloo Gobi), Sweet(Kheer) | Drink: Chaas

// ────────────────────────────────────
// BLOCK 2 — Fluent Builder with Method Chaining (Query Builder)
// ────────────────────────────────────

// WHY: Fluent Builders return `this` to create a DSL.  This is
//      the pattern behind ORMs like Knex and query builders.

console.log("\n--- Fluent Query Builder ---");

class QueryBuilder {
  constructor(table) {
    this._table = table;
    this._fields = ["*"];
    this._conditions = [];
    this._orderField = null;
    this._orderDir = "ASC";
    this._limitVal = null;
    this._offsetVal = null;
  }
  select(...fields) {
    this._fields = fields;
    return this;
  } // WHY: Returning `this` enables chaining
  where(condition) {
    this._conditions.push(condition);
    return this;
  }
  orderBy(field, dir = "ASC") {
    this._orderField = field;
    this._orderDir = dir;
    return this;
  }
  limit(n) {
    this._limitVal = n;
    return this;
  }
  offset(n) {
    this._offsetVal = n;
    return this;
  }
  build() {
    let sql = `SELECT ${this._fields.join(", ")} FROM ${this._table}`;
    if (this._conditions.length)
      sql += ` WHERE ${this._conditions.join(" AND ")}`;
    if (this._orderField)
      sql += ` ORDER BY ${this._orderField} ${this._orderDir}`;
    if (this._limitVal !== null) sql += ` LIMIT ${this._limitVal}`;
    if (this._offsetVal !== null) sql += ` OFFSET ${this._offsetVal}`;
    return sql;
  }
}

// Amma queries her tiffin order database
const query1 = new QueryBuilder("tiffin_orders")
  .select("customer", "thali_type", "price")
  .where("thali_type = 'Punjabi'")
  .where("price >= 150")
  .orderBy("price", "DESC")
  .limit(10)
  .build();

console.log("Query 1:", query1);
// Output: Query 1: SELECT customer, thali_type, price FROM tiffin_orders WHERE thali_type = 'Punjabi' AND price >= 150 ORDER BY price DESC LIMIT 10

const query2 = new QueryBuilder("ingredients")
  .where("stock > 0")
  .orderBy("name")
  .limit(50)
  .offset(20)
  .build();

console.log("Query 2:", query2);
// Output: Query 2: SELECT * FROM ingredients WHERE stock > 0 ORDER BY name ASC LIMIT 50 OFFSET 20

// Simplest possible query — all defaults
const query3 = new QueryBuilder("daily_menu").build();
console.log("Query 3:", query3);
// Output: Query 3: SELECT * FROM daily_menu

// ────────────────────────────────────
// BLOCK 3 — Builder for Tiffin Delivery Configuration
// ────────────────────────────────────

// WHY: Real-world scenario.  A Builder prevents mistakes (e.g.,
//      forgetting delivery address when scheduling a tiffin) by
//      encoding sensible defaults and validation into the build step.

console.log("\n--- Tiffin Delivery Builder ---");

class DeliveryBuilder {
  constructor(url) {
    this._url = url;
    this._method = "GET";
    this._headers = {};
    this._body = null;
    this._timeout = 5000;
    this._retries = 0;
  }
  method(m) {
    this._method = m.toUpperCase();
    return this;
  }
  header(key, value) {
    this._headers[key] = value;
    return this;
  }
  jsonBody(data) {
    // WHY: Sets both body AND header — eliminates forgetting Content-Type.
    this._body = JSON.stringify(data);
    this._headers["Content-Type"] = "application/json";
    return this;
  }
  timeout(ms) {
    this._timeout = ms;
    return this;
  }
  retries(n) {
    this._retries = n;
    return this;
  }
  build() {
    // WHY: Validation at build time catches errors early.
    if (this._method !== "GET" && !this._body) {
      console.log("  Warning: Non-GET request with no body");
    }
    return Object.freeze({
      url: this._url,
      method: this._method,
      headers: { ...this._headers },
      body: this._body,
      timeout: this._timeout,
      retries: this._retries,
    });
  }
}

// Amma's tiffin service API calls
const getTiffins = new DeliveryBuilder("https://api.ammatiffin.in/orders")
  .header("Authorization", "Bearer amma-tiffin-token")
  .timeout(3000)
  .retries(2)
  .build();

console.log("GET config:", getTiffins.method, getTiffins.url); // Output: GET config: GET https://api.ammatiffin.in/orders
console.log("  Timeout:", getTiffins.timeout, "Retries:", getTiffins.retries); // Output:   Timeout: 3000 Retries: 2

const postOrder = new DeliveryBuilder("https://api.ammatiffin.in/orders")
  .method("POST")
  .header("Authorization", "Bearer amma-tiffin-token")
  .jsonBody({ thali: "Punjabi", quantity: 3, address: "Sector 15, Noida" })
  .timeout(8000)
  .build();

console.log("POST config:", postOrder.method, postOrder.url); // Output: POST config: POST https://api.ammatiffin.in/orders
console.log("  Content-Type:", postOrder.headers["Content-Type"]); // Output:   Content-Type: application/json
console.log("  Body:", postOrder.body); // Output:   Body: {"thali":"Punjabi","quantity":3,"address":"Sector 15, Noida"}

// WHY: The built object is frozen — immutable after creation.
//      No accidental mutation of a shared config.
try {
  postOrder.method = "DELETE";
} catch (e) {
  // In non-strict mode, this silently fails
}
console.log("Still POST?", postOrder.method); // Output: Still POST? POST

// ────────────────────────────────────
// KEY TAKEAWAYS
// ────────────────────────────────────
// 1. The Builder pattern constructs complex thalis step by step,
//    avoiding constructors with dozens of parameters.
// 2. A Director encapsulates common build sequences (Punjabi Thali,
//    South Indian Thali presets) so client code stays clean and DRY.
// 3. Fluent Builders return `this` from each method, enabling
//    readable method chains like `.addDal().addRoti().addSabzi()`.
// 4. Real-world uses: query builders, HTTP config, form validators,
//    document generators, test data factories.
// 5. Always reset or recreate internal state after `build()` so
//    the builder can be safely reused.
// 6. Freeze the built product to prevent accidental mutation.

console.log("\n=== Amma packs the last tiffin. Khana taiyaar hai! ===");
// Output: === Amma packs the last tiffin. Khana taiyaar hai! ===
