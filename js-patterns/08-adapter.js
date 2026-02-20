/**
 * ============================================================
 *  FILE 8 : The Jugaad Adapter — Adapter Pattern
 *  Topic : Adapter (Wrapper)
 *  WHY THIS MATTERS:
 *    You often need to integrate code with incompatible
 *    interfaces — third-party libraries, legacy APIs, or
 *    platform-specific storage. The Adapter pattern wraps
 *    one interface to make it compatible with another,
 *    without modifying either side. It is the software
 *    equivalent of converting a US charger to an Indian 3-pin socket.
 * ============================================================
 */

// STORY: Electrician Pappu runs a shop near Nehru Place where he
// converts foreign laptop chargers (US/EU plugs) to fit Indian
// 3-pin sockets using jugaad adapters — the interface your devices expect.

"use strict";

// ────────────────────────────────────
// BLOCK 1: Object Adapter (wrapping a third-party API to match your interface)
// ────────────────────────────────────

// WHY: A third-party weather service returns data in a format your app
// doesn't understand. Pappu wraps it so your app sees the interface it expects.

console.log("--- Block 1: Object Adapter ---");

// Third-party weather API (foreign charger — we cannot change this)
const foreignWeatherAPI = {
  fetch_weather(city_name) {
    return {
      city_name,
      temp_fahrenheit: 72,
      wind_speed_mph: 5,
      conditions: "partly_cloudy",
    };
  },
};

// Our app expects this interface (Indian 3-pin socket):
//   getWeather(city) -> { city, tempCelsius, windKmh, description }

// WHY: The adapter converts between the two interfaces without modifying either
class WeatherAdapter {
  constructor(foreignAPI) {
    this._api = foreignAPI;
  }

  getWeather(city) {
    const raw = this._api.fetch_weather(city);
    return {
      city: raw.city_name,
      tempCelsius: Math.round((raw.temp_fahrenheit - 32) * (5 / 9)),
      windKmh: Math.round(raw.wind_speed_mph * 1.609),
      description: raw.conditions.replace(/_/g, " "),
    };
  }
}

// Pappu plugs the foreign API into our local adapter
const weather = new WeatherAdapter(foreignWeatherAPI);
const report = weather.getWeather("Delhi");

console.log("City:", report.city); // Output: City: Delhi
console.log("Temp (C):", report.tempCelsius); // Output: Temp (C): 22
console.log("Wind (km/h):", report.windKmh); // Output: Wind (km/h): 8
console.log("Description:", report.description); // Output: Description: partly cloudy

// WHY: Your app code only knows about getWeather() — it never touches the foreign API
function displayWeather(adapter, city) {
  const data = adapter.getWeather(city);
  return `${data.city}: ${data.tempCelsius}C, ${data.windKmh} km/h, ${data.description}`;
}

console.log(displayWeather(weather, "Mumbai")); // Output: Mumbai: 22C, 8 km/h, partly cloudy

// ────────────────────────────────────
// BLOCK 2: Class Adapter using ES6 Class Extension
// ────────────────────────────────────

// WHY: Sometimes you inherit from the foreign class to adapt it.
// Pappu extends a foreign payment processor to match his app's interface.

console.log("\n--- Block 2: Class Adapter ---");

// Foreign payment processor (incompatible interface — like a US 2-pin charger)
class RazorpayishProcessor {
  constructor() {
    this.name = "RazorpayishProcessor";
  }
  createCharge(amountInPaise, currencyCode, upiToken) {
    return {
      id: "pay_" + Math.random().toString(36).slice(2, 10),
      amount: amountInPaise,
      currency: currencyCode,
      status: "succeeded",
    };
  }
}

// Our app expects: pay(rupees, currency) -> { transactionId, amount, success }

// WHY: Class adapter extends the foreign class and adds the expected interface
class PaymentAdapter extends RazorpayishProcessor {
  pay(rupees, currency = "inr") {
    const paise = Math.round(rupees * 100);
    const result = this.createCharge(paise, currency, "upi_mock");
    return {
      transactionId: result.id,
      amount: rupees,
      success: result.status === "succeeded",
    };
  }
}

const payments = new PaymentAdapter();
const txn = payments.pay(499.99);

console.log("Transaction ID starts with pay_:", txn.transactionId.startsWith("pay_")); // Output: Transaction ID starts with pay_: true
console.log("Amount:", txn.amount); // Output: Amount: 499.99
console.log("Success:", txn.success); // Output: Success: true

// WHY: The adapter IS-A RazorpayishProcessor, so it works in both contexts
console.log("Is RazorpayishProcessor?", payments instanceof RazorpayishProcessor); // Output: Is RazorpayishProcessor? true
console.log("Has pay method?", typeof payments.pay); // Output: Has pay method? function
console.log("Has createCharge?", typeof payments.createCharge); // Output: Has createCharge? function

// ────────────────────────────────────
// BLOCK 3: Real-World — Wrapping localStorage to Match Async Storage Interface
// ────────────────────────────────────

// WHY: In cross-platform apps (React Native, Electron, etc.) you might
// need localStorage (sync) to look like AsyncStorage (async). Pappu creates
// an adapter so the same code works on web and mobile.

console.log("\n--- Block 3: localStorage -> Async Storage Adapter ---");

// Simulated localStorage (sync, key-value, strings only)
// WHY: Node.js doesn't have localStorage, so we simulate it with a Map
const localStorageSim = (() => {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
  };
})();

// Our app expects an async storage interface:
//   async getItem(key) -> parsed value
//   async setItem(key, value) -> void
//   async removeItem(key) -> void

// WHY: The adapter wraps the sync API with Promises and adds JSON serialization
class AsyncStorageAdapter {
  constructor(syncStorage) {
    this._storage = syncStorage;
  }

  async getItem(key) {
    const raw = this._storage.getItem(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return raw; // Return as-is if not valid JSON
    }
  }

  async setItem(key, value) {
    // WHY: Automatically serializes objects — the sync API only stores strings
    this._storage.setItem(key, JSON.stringify(value));
  }

  async removeItem(key) {
    this._storage.removeItem(key);
  }

  async clear() {
    this._storage.clear();
  }
}

// Pappu's app code uses the async interface everywhere
async function runAsyncStorageDemo() {
  const storage = new AsyncStorageAdapter(localStorageSim);

  // Store complex data — adapter handles serialization
  await storage.setItem("user", { name: "Pappu", role: "electrician" });
  await storage.setItem("preferences", { theme: "dark", lang: "hi" });

  const user = await storage.getItem("user");
  console.log("User name:", user.name); // Output: User name: Pappu
  console.log("User role:", user.role); // Output: User role: electrician

  const prefs = await storage.getItem("preferences");
  console.log("Theme:", prefs.theme); // Output: Theme: dark
  console.log("Language:", prefs.lang); // Output: Language: hi

  // Missing key returns null
  const missing = await storage.getItem("nonexistent");
  console.log("Missing key:", missing); // Output: Missing key: null

  // Remove and verify
  await storage.removeItem("user");
  const removed = await storage.getItem("user");
  console.log("After removal:", removed); // Output: After removal: null

  // WHY: The consuming code is identical whether backed by localStorage,
  // AsyncStorage, IndexedDB, or a remote API — only the adapter changes
  console.log("Pappu's jugaad adapter makes sync storage look async!");
}

runAsyncStorageDemo().then(() => {
  console.log("\nPappu packs his adapters and heads to the next customer.");
});

// ────────────────────────────────────
// KEY TAKEAWAYS
// ────────────────────────────────────
// 1. Adapter wraps an incompatible interface to match the one you expect
// 2. Object Adapter: compose the foreign object inside the adapter (delegation)
// 3. Class Adapter: extend the foreign class and add the expected interface
// 4. Real-world uses: API wrappers, storage abstraction, payment gateways (Razorpay/UPI)
// 5. The adapter changes the interface, NOT the functionality
// 6. Adapters enable swapping implementations without changing consuming code
// 7. JSON serialization in storage adapters is a common practical pattern
