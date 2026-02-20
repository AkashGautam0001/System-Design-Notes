// ============================================================
// FILE 14: Destructuring — Unboxing Values
// Topic: Extracting values from arrays and objects into
//        individual variables in a single statement
// Why: Destructuring eliminates repetitive access patterns,
//      makes function signatures self-documenting, and is
//      used everywhere in modern JavaScript and React.
// ============================================================

// =============================================
// STORY: Flipkart Delivery Day
// A delivery truck arrives at the colony with
// Flipkart and Amazon packages. Each parcel has
// items inside that need to be unpacked and
// labelled. Destructuring is the art of opening
// those boxes efficiently.
// =============================================


// =============================================
// SECTION 1: Array Destructuring
// =============================================

// WHY: Array destructuring assigns variables by POSITION.
// It's cleaner than arr[0], arr[1], arr[2].

// --- Basic array destructuring ---
console.log("--- Basic array destructuring ---");
const flipkartBox = ["Smartphone", "Screen Guard", "Back Cover"];

const [phone, screenGuard, backCover] = flipkartBox;
console.log(phone);
// Output: Smartphone
console.log(screenGuard);
// Output: Screen Guard
console.log(backCover);
// Output: Back Cover

// --- Skipping elements ---
// Use commas to skip items you don't need.
console.log("\n--- Skip elements ---");
const deliveryItems = ["Bubble Wrap", "Bubble Wrap", "Wireless Earbuds", "Bubble Wrap", "Laptop Stand"];

const [, , earbuds, , laptopStand] = deliveryItems;
console.log(earbuds);
// Output: Wireless Earbuds
console.log(laptopStand);
// Output: Laptop Stand

// --- Rest pattern (...) — collect the remaining items ---
console.log("\n--- Rest pattern ---");
const packageItems = ["Charger", "USB Cable", "Earphones", "Warranty Card", "User Manual"];

const [firstItem, secondItem, ...remainingItems] = packageItems;
console.log(firstItem);
// Output: Charger
console.log(secondItem);
// Output: USB Cable
console.log(remainingItems);
// Output: [ 'Earphones', 'Warranty Card', 'User Manual' ]

// --- Default values --- when the box has fewer items than expected
console.log("\n--- Default values ---");
const smallParcel = ["Power Bank"];

const [primary, secondary = "No Extra Item"] = smallParcel;
console.log(primary);
// Output: Power Bank
console.log(secondary);
// Output: No Extra Item   (default used because index 1 is undefined)

// Default only kicks in for undefined, NOT for null:
const [a = 10, b = 20] = [null, undefined];
console.log(a);
// Output: null   (null is NOT undefined, so default is NOT used)
console.log(b);
// Output: 20     (undefined triggers the default)

// --- Swapping variables — the classic trick ---
console.log("\n--- Swap variables ---");
let sender = "Flipkart";
let receiver = "Raju";

console.log(`Before: sender=${sender}, receiver=${receiver}`);
// Output: Before: sender=Flipkart, receiver=Raju

[sender, receiver] = [receiver, sender];

console.log(`After:  sender=${sender}, receiver=${receiver}`);
// Output: After:  sender=Raju, receiver=Flipkart

// Works with any number of variables:
let x = 1, y = 2, z = 3;
[x, y, z] = [z, x, y];
console.log(x, y, z);
// Output: 3 1 2


// =============================================
// SECTION 2: Object Destructuring
// =============================================

// WHY: Object destructuring assigns variables by PROPERTY NAME.
// Much cleaner than repeatedly writing obj.prop.

// --- Basic object destructuring ---
console.log("\n--- Basic object destructuring ---");
const orderDetails = {
  name: "Raju Delivery Boy",
  category: "Electronics",
  pincode: 110001,
  cashOnDelivery: true,
  totalAmount: 15999,
};

const { name, pincode, totalAmount } = orderDetails;
console.log(name);
// Output: Raju Delivery Boy
console.log(pincode);
// Output: 110001
console.log(totalAmount);
// Output: 15999

// --- Renaming (aliasing) ---
// When the property name conflicts with an existing variable
// or you want a more descriptive name.
console.log("\n--- Rename with : ---");
const { name: customerName, category: itemCategory } = orderDetails;
console.log(customerName);
// Output: Raju Delivery Boy
console.log(itemCategory);
// Output: Electronics
// Note: "category" could conflict with another variable, so renaming helps.

// --- Default values ---
console.log("\n--- Default values ---");
const { cashOnDelivery: cod, giftWrap: isGiftWrap = false, discount = 0 } = orderDetails;
console.log(cod);
// Output: true
console.log(isGiftWrap);
// Output: false   (not in orderDetails, default used)
console.log(discount);
// Output: 0   (not in orderDetails, default used)

// --- Rename AND default combined ---
const { couponCode: appliedCoupon = "No Coupon" } = orderDetails;
console.log(appliedCoupon);
// Output: No Coupon

// --- Rest pattern in objects ---
console.log("\n--- Object rest pattern ---");
const { name: buyerName, ...otherDetails } = orderDetails;
console.log(buyerName);
// Output: Raju Delivery Boy
console.log(otherDetails);
// Output: { category: 'Electronics', pincode: 110001, cashOnDelivery: true, totalAmount: 15999 }

// --- Nested object destructuring ---
console.log("\n--- Nested destructuring ---");
const shipment = {
  owner: "Raju",
  contents: {
    phoneBox: {
      name: "Samsung Galaxy M34",
      price: 14999,
    },
    accessoryBox: {
      name: "Boult Earbuds",
      price: 1299,
    },
  },
  deliveryCharge: 40,
};

const {
  contents: {
    phoneBox: { name: phoneName, price },
    accessoryBox: { price: accessoryPrice },
  },
  deliveryCharge,
} = shipment;

console.log(phoneName);
// Output: Samsung Galaxy M34
console.log(price);
// Output: 14999
console.log(accessoryPrice);
// Output: 1299
console.log(deliveryCharge);
// Output: 40

// NOTE: "contents" and "accessoryBox" are NOT variables here — they
// are just path selectors. Only the final leaf names become variables.
// console.log(contents); // ReferenceError!


// =============================================
// SECTION 3: Function Parameter Destructuring
// =============================================

// WHY: Destructuring in function parameters makes the expected
// shape of arguments crystal clear — self-documenting code.

// --- Object parameter destructuring ---
console.log("\n--- Function parameter destructuring (object) ---");

function displayOrder({ name, pincode, category: cat = "General" }) {
  console.log(`${name} | Pincode ${pincode} | Category: ${cat}`);
}

displayOrder({ name: "Raju", pincode: 110001, category: "Electronics" });
// Output: Raju | Pincode 110001 | Category: Electronics

displayOrder({ name: "Meena", pincode: 400001 });
// Output: Meena | Pincode 400001 | Category: General

// --- Array parameter destructuring ---
console.log("\n--- Function parameter destructuring (array) ---");

function getCoordinates([x, y, z = 0]) {
  console.log(`Position: x=${x}, y=${y}, z=${z}`);
}

getCoordinates([10, 20]);
// Output: Position: x=10, y=20, z=0

getCoordinates([5, 15, 25]);
// Output: Position: x=5, y=15, z=25

// --- Destructuring return values ---
console.log("\n--- Destructuring function return values ---");

function openFlipkartBox() {
  // Simulates unpacking a delivered item
  return {
    item: "boAt Rockerz 450",
    brand: "boAt",
    sellPrice: 1499,
  };
}

const { item, brand, sellPrice } = openFlipkartBox();
console.log(`Found: ${item} (${brand}) — worth ₹${sellPrice}`);
// Output: Found: boAt Rockerz 450 (boAt) — worth ₹1499

// Array return — common pattern (like React's useState):
function useDelivery(trackingId) {
  let status = "dispatched";
  const updateStatus = () => (status = "delivered");
  return [trackingId, status, updateStatus];
}

const [trackingId, status, updateDelivery] = useDelivery("FLK-78923");
console.log(`Tracking: ${trackingId}, Status: ${status}`);
// Output: Tracking: FLK-78923, Status: dispatched


// =============================================
// SECTION 4: Mixed Destructuring
// =============================================

// WHY: Real-world data often mixes arrays and objects. API
// responses, database rows, and config files have both.

console.log("\n--- Mixed destructuring ---");

// An API response with an array of delivery objects:
const deliveryData = {
  routeName: "South Delhi Morning Route",
  parcels: [
    { name: "Raju", area: "Saket", items: ["Phone", "Charger"] },
    { name: "Meena", area: "Hauz Khas", items: ["Kurta", "Dupatta"] },
    { name: "Amit", area: "Lajpat Nagar", items: ["Books", "Notebook"] },
  ],
  stops: ["Saket", "Hauz Khas", "Lajpat Nagar"],
};

// Destructure the first delivery and the first stop:
const {
  routeName,
  parcels: [firstDelivery, ...otherParcels],
  stops: [firstStop],
} = deliveryData;

console.log(`Route: ${routeName}`);
// Output: Route: South Delhi Morning Route

console.log(`First delivery: ${firstDelivery.name} (${firstDelivery.area})`);
// Output: First delivery: Raju (Saket)

console.log(`Other parcels: ${otherParcels.map(p => p.name).join(", ")}`);
// Output: Other parcels: Meena, Amit

console.log(`First stop: ${firstStop}`);
// Output: First stop: Saket

// Go deeper — get the first delivery's first item:
const {
  parcels: [{ items: [firstItemDelivered] }],
} = deliveryData;
console.log(`First item delivered: ${firstItemDelivered}`);
// Output: First item delivered: Phone

// --- Destructuring in a loop ---
console.log("\n--- Destructuring in loops ---");

const orderList = [
  { name: "Wireless Mouse", type: "electronics", value: 599 },
  { name: "Cotton Kurta", type: "clothing", value: 899 },
  { name: "Masala Dabba", type: "kitchen", value: 450 },
];

for (const { name: itemName, type, value } of orderList) {
  console.log(`  ${itemName} [${type}] — ₹${value}`);
}
// Output:
//   Wireless Mouse [electronics] — ₹599
//   Cotton Kurta [clothing] — ₹899
//   Masala Dabba [kitchen] — ₹450

// --- Destructuring with Object.entries() ---
console.log("\n--- Destructuring with entries() ---");

const ratingsCount = { fivestar: 5, fourstar: 3, threestar: 7, twostar: 2 };

for (const [rating, count] of Object.entries(ratingsCount)) {
  console.log(`  ${rating}: ${"*".repeat(count)} (${count})`);
}
// Output:
//   fivestar: ***** (5)
//   fourstar: *** (3)
//   threestar: ******* (7)
//   twostar: ** (2)


// ============================================================
// KEY TAKEAWAYS
// ------------------------------------------------------------
// 1. Array destructuring assigns by POSITION:
//    const [a, b, c] = array;
//
// 2. Object destructuring assigns by PROPERTY NAME:
//    const { name, level } = object;
//
// 3. Use : to rename:  { name: heroName }
//    Use = for defaults: { armor = 0 }
//    Combine both: { weapon: equippedWeapon = "None" }
//
// 4. Use ... (rest) to collect remaining items:
//    const [first, ...rest] = array;
//    const { name, ...otherProps } = object;
//
// 5. Skipping array elements: const [, , third] = array;
//    Swapping: [a, b] = [b, a];
//
// 6. Function parameter destructuring makes APIs self-documenting:
//    function draw({ color, width = 1 }) { ... }
//
// 7. Nested destructuring follows the data shape:
//    const { a: { b: { c } } } = deepObject;
//    Only the innermost names become variables.
//
// 8. Mix array and object destructuring for complex structures.
//    Common with API responses and database results.
//
// 9. Defaults only activate for undefined, NOT for null.
// ============================================================
