/**
 * ============================================================
 *  FILE 3 : Data Types
 * ============================================================
 *  Topic  : 7 primitives (string, number, bigint, boolean,
 *           undefined, null, symbol) + 1 non-primitive (object).
 *           typeof operator & quirks. Primitive vs reference
 *           types (copy behaviour).
 *
 *  WHY THIS MATTERS:
 *  Every value in JavaScript belongs to a type. Understanding
 *  types prevents mysterious bugs like "Why did my object change
 *  when I only edited the copy?" and "Why is typeof null 'object'?"
 * ============================================================
 */

// ============================================================
// STORY: You're the billing clerk at Sharma ji's Kirana Store.
// Every product, price, and customer detail is stored as a
// JavaScript data type. The billing system teaches you how each
// type behaves — especially when you try to copy things.
// ============================================================

// ────────────────────────────────────────────────────────────
// SECTION 1 — The 7 Primitive Types
// ────────────────────────────────────────────────────────────
// WHY: Primitives are the simplest building blocks. They are
// immutable and compared by *value*.

// 1. String — text data
const productName = "Toor Dal";
console.log("Product:", productName, "| type:", typeof productName);
// Output: Product: Toor Dal | type: string

// 2. Number — integers and floats (64-bit IEEE 754)
const pricePerKg = 75;
const gstRate = 1.5;
console.log("Price:", pricePerKg, "| type:", typeof pricePerKg);
// Output: Price: 75 | type: number
console.log("GST:", gstRate, "| type:", typeof gstRate);
// Output: GST: 1.5 | type: number

// 3. BigInt — arbitrarily large integers
const annualRevenue = 9007199254740993n; // note the 'n' suffix
console.log("Revenue:", annualRevenue, "| type:", typeof annualRevenue);
// Output: Revenue: 9007199254740993n | type: bigint

// 4. Boolean — true / false
const inStock = true;
console.log("In stock?", inStock, "| type:", typeof inStock);
// Output: In stock? true | type: boolean

// 5. Undefined — declared but no value assigned
let discountCoupon;
console.log("Coupon:", discountCoupon, "| type:", typeof discountCoupon);
// Output: Coupon: undefined | type: undefined

// 6. Null — intentional absence of a value
const pendingReturn = null;
console.log("Return:", pendingReturn, "| type:", typeof pendingReturn);
// Output: Return: null | type: object     <-- FAMOUS QUIRK!

// 7. Symbol — unique, immutable identifier
const uniqueReceiptId = Symbol("receipt_001");
console.log("Receipt:", uniqueReceiptId.toString(), "| type:", typeof uniqueReceiptId);
// Output: Receipt: Symbol(receipt_001) | type: symbol

// ────────────────────────────────────────────────────────────
// SECTION 2 — The 1 Non-Primitive: Object
// ────────────────────────────────────────────────────────────
// WHY: Objects (including arrays, functions, dates, etc.) are
// *reference* types. They're stored by reference, not by value.

const customerDetails = {
  name: "Verma ji",
  loyaltyPoints: 12,
  category: "Regular",
};
console.log("Customer:", customerDetails, "| type:", typeof customerDetails);
// Output: Customer: { name: 'Verma ji', loyaltyPoints: 12, category: 'Regular' } | type: object

const shoppingList = ["Toor Dal", "Amul Butter", "Aashirvaad Atta"];
console.log("Shopping list:", shoppingList, "| type:", typeof shoppingList);
// Output: Shopping list: [ 'Toor Dal', 'Amul Butter', 'Aashirvaad Atta' ] | type: object

// Functions are objects too
function generateBill() { return "Bill printed!"; }
console.log("Bill type:", typeof generateBill);
// Output: Bill type: function
// (typeof has a special case for functions, even though they are objects)

// ────────────────────────────────────────────────────────────
// SECTION 3 — typeof Operator & Its Quirks
// ────────────────────────────────────────────────────────────
// WHY: typeof is the primary way to check a value's type at
// runtime, but it has some historical quirks you must know.

console.log("--- typeof cheat sheet ---");
console.log(typeof "hello");        // Output: string
console.log(typeof 42);             // Output: number
console.log(typeof 42n);            // Output: bigint
console.log(typeof true);           // Output: boolean
console.log(typeof undefined);      // Output: undefined
console.log(typeof Symbol());       // Output: symbol
console.log(typeof {});             // Output: object
console.log(typeof []);             // Output: object    <-- arrays are objects!
console.log(typeof null);           // Output: object    <-- BUG from 1995, kept for compat
console.log(typeof function(){});   // Output: function  <-- special case

// How to properly check for null
const maybeReturned = null;
console.log("Is null?", maybeReturned === null);
// Output: Is null? true

// How to properly check for an array
console.log("Is array?", Array.isArray(shoppingList));
// Output: Is array? true

// ────────────────────────────────────────────────────────────
// SECTION 4 — Primitive vs Reference: Copy Behaviour
// ────────────────────────────────────────────────────────────
// WHY: This is where beginners get burned. Primitives copy by
// *value* (independent copies). Objects copy by *reference*
// (both variables point to the SAME data in memory).

// --- Primitives: copy by value ---
let originalStock = 100;
let clonedStock = originalStock;  // a fresh, independent copy

clonedStock = 80;              // only clonedStock changes

console.log("Original stock:", originalStock); // Output: Original stock: 100
console.log("Cloned stock:",   clonedStock);   // Output: Cloned stock: 80
// They are completely independent.

// --- Objects: copy by reference ---
const originalProduct = {
  name: "Toor Dal",
  price: 50,
  brand: "Tata Sampann",
};

const clonedProduct = originalProduct; // NOT a copy — both point to the same object!

clonedProduct.price = 999;          // mutating through the "clone"...

console.log("Original product price:", originalProduct.price);
// Output: Original product price: 999   <-- OOPS! The original changed too!

console.log("Cloned product price:", clonedProduct.price);
// Output: Cloned product price: 999

console.log("Same object?", originalProduct === clonedProduct);
// Output: Same object? true

// ────────────────────────────────────────────────────────────
// SECTION 5 — How to Actually Copy an Object
// ────────────────────────────────────────────────────────────
// WHY: Since assignment only copies the *reference*, you need
// explicit techniques to create a true independent copy.

// Shallow copy with spread operator
const originalItem = { name: "Amul Butter", price: 40, offers: { festive: 10 } };
const itemCopy = { ...originalItem };

itemCopy.price = 60;
console.log("Original price:", originalItem.price);
// Output: Original price: 40   <-- safe! top-level is independent

// BUT nested objects are still shared (shallow copy!)
itemCopy.offers.festive = 99;
console.log("Original festive offer:", originalItem.offers.festive);
// Output: Original festive offer: 99   <-- nested object is still shared!

// Deep copy with structuredClone (modern JS)
const originalCombo = { name: "Festival Pack", contents: { dal: 50, ghee: 30 } };
const comboDeep = structuredClone(originalCombo);

comboDeep.contents.dal = 999;
console.log("Original dal:", originalCombo.contents.dal);
// Output: Original dal: 50   <-- fully independent!
console.log("Deep copy dal:", comboDeep.contents.dal);
// Output: Deep copy dal: 999

// ────────────────────────────────────────────────────────────
// SECTION 6 — Quick Type Summary Table
// ────────────────────────────────────────────────────────────

console.log("\n--- Type Summary ---");
const typeSummary = [
  { type: "string",    example: '"hello"',      typeof: "string",    category: "Primitive" },
  { type: "number",    example: "42 / 3.14",    typeof: "number",    category: "Primitive" },
  { type: "bigint",    example: "123n",          typeof: "bigint",    category: "Primitive" },
  { type: "boolean",   example: "true / false",  typeof: "boolean",   category: "Primitive" },
  { type: "undefined", example: "undefined",     typeof: "undefined", category: "Primitive" },
  { type: "null",      example: "null",          typeof: "object*",   category: "Primitive" },
  { type: "symbol",    example: "Symbol('id')",  typeof: "symbol",    category: "Primitive" },
  { type: "object",    example: "{ } / [ ]",     typeof: "object",    category: "Reference" },
];
console.table(typeSummary);

// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. JavaScript has 7 primitive types + 1 non-primitive (object).
// 2. typeof null === "object" is a legacy bug — check with
//    value === null instead.
// 3. Arrays are objects; use Array.isArray() to check.
// 4. Primitives copy by VALUE — changes to the copy don't
//    affect the original.
// 5. Objects copy by REFERENCE — both variables point to the
//    same data. Mutating one mutates the other.
// 6. Use the spread operator { ...obj } for shallow copies
//    and structuredClone(obj) for deep copies.
// 7. Think of it like Sharma ji's Kirana Store: duplicating a
//    number (stock count) gives you an independent copy,
//    but "duplicating" a product entry just gives you another
//    label for the SAME entry.
// ============================================================
