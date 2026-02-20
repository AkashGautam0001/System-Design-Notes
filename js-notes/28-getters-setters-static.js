/**
 * ============================================================
 *  FILE 28: Getters, Setters, Static Members & Private Fields
 * ============================================================
 *  Topic: Controlling property access with get/set, class-level
 *         behavior with static, and true encapsulation with #.
 *
 *  Why it matters: Real-world objects need guardrails — you
 *  don't want someone setting an account balance to -Infinity.
 *  Getters, setters, and private fields let you expose a clean
 *  public API while keeping internals safe. Static members let
 *  you attach utility methods to the class itself rather than
 *  to every instance.
 * ============================================================
 *
 *  STORY: The State Bank of India (SBI). Every customer has an
 *  SBIAccount with access controls: you can read your balance
 *  (getter), but deposits and withdrawals must pass validation
 *  (setter). The bank itself (static) tracks all accounts and
 *  the total money in the system. Internally, the account
 *  number and transaction log are private — no outsider can
 *  tamper with them.
 * ============================================================
 */

// ============================================================
//  EXAMPLE 1 — Getters & Setters in Plain Objects and Classes
// ============================================================

// WHY: Getters and setters look like regular property access
// (obj.prop) but run a function behind the scenes. This lets
// you compute derived values (getters) and validate or
// transform input (setters) without changing the API surface.

// ----- 1a. In plain objects -----
console.log("--- 1a. Getters/Setters in plain objects ---");

const thermometer = {
  _celsius: 0, // convention: underscore = "treat as private"

  get celsius() {
    return this._celsius;
  },

  set celsius(value) {
    if (typeof value !== "number" || isNaN(value)) {
      console.log("Rejected: temperature must be a number");
      return;
    }
    if (value < -273.15) {
      console.log("Rejected: below absolute zero!");
      return;
    }
    this._celsius = value;
  },

  // Computed/derived value — no stored data, just a calculation.
  get fahrenheit() {
    return this._celsius * 9 / 5 + 32;
  },

  get kelvin() {
    return this._celsius + 273.15;
  },
};

thermometer.celsius = 25;
console.log(`Celsius: ${thermometer.celsius}`);
// Output: Celsius: 25

console.log(`Fahrenheit: ${thermometer.fahrenheit}`);
// Output: Fahrenheit: 77

console.log(`Kelvin: ${thermometer.kelvin}`);
// Output: Kelvin: 298.15

thermometer.celsius = -300; // validation kicks in
// Output: Rejected: below absolute zero!

console.log(`Still: ${thermometer.celsius}`);
// Output: Still: 25

thermometer.celsius = "hot"; // type check kicks in
// Output: Rejected: temperature must be a number

// ----- 1b. In classes -----
console.log("\n--- 1b. Getters/Setters in classes ---");

class KhataHolder {
  constructor(name) {
    this.name = name;
    this._score = 0;
  }

  get score() {
    return this._score;
  }

  set score(value) {
    if (value < 0) {
      console.log(`${this.name}: score cannot be negative. Keeping ${this._score}.`);
      return;
    }
    this._score = value;
  }

  // Derived getter — rank is computed from score, never stored.
  get rank() {
    if (this._score >= 1000) return "Platinum";
    if (this._score >= 500) return "Gold";
    if (this._score >= 100) return "Silver";
    return "Bronze";
  }
}

const holder = new KhataHolder("Priya");
holder.score = 750;
console.log(`${holder.name}: score=${holder.score}, rank=${holder.rank}`);
// Output: Priya: score=750, rank=Gold

holder.score = -50; // validation
// Output: Priya: score cannot be negative. Keeping 750.

console.log(`Score unchanged: ${holder.score}`);
// Output: Score unchanged: 750


// ============================================================
//  EXAMPLE 2 — The SBI Account (Full Feature Demo)
// ============================================================

// WHY: This example combines getters, setters, static members,
// and private fields (#) into a realistic class that enforces
// real business rules.

class SBIAccount {
  // ----- Private fields (true encapsulation with #) -----
  // These are NOT accessible outside the class body.
  #accountNumber;
  #balance;
  #transactionLog;
  #frozen;

  // ----- Static property: tracks all accounts at the bank level -----
  static #totalAccounts = 0;
  static #bankName = "State Bank of India";

  constructor(ownerName, initialDeposit = 0) {
    SBIAccount.#totalAccounts++;
    this.#accountNumber = `SBI-${String(SBIAccount.#totalAccounts).padStart(6, "0")}`;
    this.ownerName = ownerName;
    this.#balance = initialDeposit;
    this.#transactionLog = [];
    this.#frozen = false;

    if (initialDeposit > 0) {
      this.#log("OPEN", initialDeposit);
    }
  }

  // ----- Getter: read balance like a property -----
  get balance() {
    return this.#balance;
  }

  // ----- Setter: no direct balance manipulation allowed -----
  set balance(value) {
    console.log("Direct balance assignment blocked. Use deposit() or withdraw().");
  }

  // ----- Getter: derived/computed property -----
  get accountInfo() {
    return `[${this.#accountNumber}] ${this.ownerName} — Balance: \u20B9${this.#balance.toFixed(2)}`;
  }

  get isFrozen() {
    return this.#frozen;
  }

  // ----- Private method -----
  #log(type, amount) {
    this.#transactionLog.push({
      type,
      amount,
      date: new Date().toISOString().split("T")[0],
      resultingBalance: this.#balance,
    });
  }

  // ----- Public methods -----
  deposit(amount) {
    if (this.#frozen) return `Account ${this.#accountNumber} is frozen.`;
    if (amount <= 0) return "Deposit amount must be positive.";

    this.#balance += amount;
    this.#log("DEPOSIT", amount);
    return `Deposited \u20B9${amount.toFixed(2)}. New balance: \u20B9${this.#balance.toFixed(2)}`;
  }

  withdraw(amount) {
    if (this.#frozen) return `Account ${this.#accountNumber} is frozen.`;
    if (amount <= 0) return "Withdrawal amount must be positive.";
    if (amount > this.#balance) return `Insufficient funds. Balance: \u20B9${this.#balance.toFixed(2)}`;

    this.#balance -= amount;
    this.#log("WITHDRAW", amount);
    return `Withdrew \u20B9${amount.toFixed(2)}. New balance: \u20B9${this.#balance.toFixed(2)}`;
  }

  freeze() {
    this.#frozen = true;
    return `Account ${this.#accountNumber} has been FROZEN.`;
  }

  unfreeze() {
    this.#frozen = false;
    return `Account ${this.#accountNumber} has been UNFROZEN.`;
  }

  getStatement() {
    if (this.#transactionLog.length === 0) return "No transactions.";
    return this.#transactionLog
      .map((t) => `  ${t.date} | ${t.type.padEnd(8)} | \u20B9${t.amount.toFixed(2)} | Balance: \u20B9${t.resultingBalance.toFixed(2)}`)
      .join("\n");
  }

  // ----- Static methods: belong to the class, not instances -----
  static getBankName() {
    return SBIAccount.#bankName;
  }

  static getTotalAccounts() {
    return SBIAccount.#totalAccounts;
  }

  static isValidAmount(amount) {
    return typeof amount === "number" && amount > 0 && isFinite(amount);
  }
}

console.log("\n--- The SBI Account ---");

// Static method — called on the class, not an instance.
console.log(`Bank: ${SBIAccount.getBankName()}`);
// Output: Bank: State Bank of India

const ramesh = new SBIAccount("Ramesh Kapoor", 1000);
const sunil = new SBIAccount("Sunil Verma", 500);

console.log(ramesh.accountInfo);
// Output: [SBI-000001] Ramesh Kapoor — Balance: \u20B91000.00

console.log(sunil.accountInfo);
// Output: [SBI-000002] Sunil Verma — Balance: \u20B9500.00

console.log(ramesh.deposit(250));
// Output: Deposited \u20B9250.00. New balance: \u20B91250.00

console.log(ramesh.withdraw(100));
// Output: Withdrew \u20B9100.00. New balance: \u20B91150.00

console.log(ramesh.withdraw(5000));
// Output: Insufficient funds. Balance: \u20B91150.00

// Try to set balance directly — setter blocks it.
ramesh.balance = 999999;
// Output: Direct balance assignment blocked. Use deposit() or withdraw().

console.log(`Ramesh balance: \u20B9${ramesh.balance}`);
// Output: Ramesh balance: \u20B91150

// Freeze account
console.log(ramesh.freeze());
// Output: Account SBI-000001 has been FROZEN.

console.log(ramesh.deposit(100));
// Output: Account SBI-000001 is frozen.

console.log(ramesh.isFrozen);
// Output: true

console.log(ramesh.unfreeze());
// Output: Account SBI-000001 has been UNFROZEN.

// Statement
console.log("\n--- Ramesh's Statement ---");
console.log(ramesh.getStatement());
// Output:   2026-02-16 | OPEN     | \u20B91000.00 | Balance: \u20B91000.00
// Output:   2026-02-16 | DEPOSIT  | \u20B9250.00  | Balance: \u20B91250.00
// Output:   2026-02-16 | WITHDRAW | \u20B9100.00  | Balance: \u20B91150.00

// ----- Private fields are truly private -----
console.log("\n--- Private field access ---");
// Attempting ramesh.#balance outside the class is a SYNTAX ERROR,
// not a runtime error. You literally can't write it in outside code.
// This means private fields are enforced at the language level:
//
//   console.log(ramesh.#balance);
//   // SyntaxError: Private field '#balance' must be declared in an enclosing class
//
// The underscore convention (_balance) was just a polite hint.
// The # syntax actually ENFORCES privacy — the engine won't even parse it.
console.log("ramesh.#balance => SyntaxError (cannot access private fields outside class)");

// ----- Static members -----
console.log("\n--- Static members ---");
console.log(`Total accounts: ${SBIAccount.getTotalAccounts()}`);
// Output: Total accounts: 2

console.log(`Is 100 valid? ${SBIAccount.isValidAmount(100)}`);
// Output: Is 100 valid? true

console.log(`Is -5 valid? ${SBIAccount.isValidAmount(-5)}`);
// Output: Is -5 valid? false

// Static methods don't exist on instances:
try {
  ramesh.getTotalAccounts();
} catch (e) {
  console.log(`ramesh.getTotalAccounts() => Error: ${e.message}`);
  // Output: ramesh.getTotalAccounts() => Error: ramesh.getTotalAccounts is not a function
}


// ============================================================
//  KEY TAKEAWAYS
// ============================================================
// 1. `get` defines a getter — accessed like a property but
//    runs a function. Great for computed/derived values.
// 2. `set` defines a setter — looks like assignment but runs
//    validation logic. Prevents invalid state.
// 3. Getters and setters work in both plain objects and
//    classes with the same syntax.
// 4. `static` members belong to the class itself, not to
//    instances. Call them as ClassName.method(). Use them for
//    factory methods, counters, and utility functions.
// 5. Private fields (#field) and private methods (#method())
//    provide TRUE encapsulation — not accessible outside the
//    class body, enforced by the engine.
// 6. The underscore convention (_prop) was just a polite hint.
//    The # syntax is a hard guarantee.
// 7. Combine all three for robust APIs: getters expose safe
//    reads, setters validate writes, statics provide class-
//    level utilities, and private fields hide internals.
// ============================================================
