/** ============================================================
 *  FILE 29: DESIGN A PAYMENT SYSTEM
 *  ============================================================
 *  Topic: Payment lifecycle, idempotency keys, double-entry ledger,
 *         reconciliation, refunds, state machines, retry logic
 *
 *  WHY THIS MATTERS:
 *  Payment systems handle real money — bugs mean financial loss.
 *  India's UPI processes 10+ billion transactions monthly. Every
 *  payment must be exactly-once, auditable, and reconcilable.
 *  A single duplicate debit can destroy customer trust forever.
 *  ============================================================ */

// STORY: UPI / RazorPay
// RazorPay processes millions of UPI payments daily for Indian businesses.
// When a customer pays Rs 500 for a Swiggy order, the system must create
// exactly two ledger entries: debit customer's wallet, credit Swiggy's
// account. If the network drops mid-transaction, the idempotency key
// ensures retry doesn't charge the customer twice. At end of day,
// reconciliation matches every ledger entry against bank statements —
// even a Re 1 mismatch triggers an alert and investigation.

console.log("=".repeat(70));
console.log("  FILE 29: DESIGN A PAYMENT SYSTEM");
console.log("=".repeat(70));
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 1 — Payment Lifecycle
// ════════════════════════════════════════════════════════════════

// WHY: Understanding the full lifecycle prevents money leaks and double charges.

console.log("SECTION 1 — Payment Lifecycle");
console.log("-".repeat(50));

console.log("  Payment Lifecycle Stages:");
console.log();
console.log("  Customer    Merchant    Payment Gateway    Bank");
console.log("     |           |              |              |");
console.log("     |--order--->|              |              |");
console.log("     |           |--initiate--->|              |");
console.log("     |           |              |--authorize-->|");
console.log("     |           |              |<--approved---|");
console.log("     |           |<--confirmed--|              |");
console.log("     |<--receipt-|              |              |");
console.log("     |           |              |--capture---->|");
console.log("     |           |              |<--settled----|");
console.log();

const lifecycleStages = [
  { stage: "INITIATE",   description: "Customer clicks 'Pay Now', payment created" },
  { stage: "AUTHORIZE",  description: "Bank verifies funds, places hold" },
  { stage: "CAPTURE",    description: "Merchant confirms, bank moves money" },
  { stage: "SETTLE",     description: "Money transferred to merchant's bank" },
  { stage: "COMPLETE",   description: "Payment fully settled, receipt generated" }
];

lifecycleStages.forEach(s => {
  console.log(`  ${s.stage.padEnd(12)} -> ${s.description}`);
});

console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 2 — Idempotency Keys for Payments
// ════════════════════════════════════════════════════════════════

// WHY: Network retries MUST NOT charge a customer twice. Idempotency prevents this.

console.log("SECTION 2 — Idempotency Keys");
console.log("-".repeat(50));

class IdempotencyStore {
  constructor() {
    this.keys = new Map(); // idempotencyKey -> { result, timestamp }
    this.ttl = 24 * 60 * 60 * 1000; // 24 hours
  }

  check(key) {
    const entry = this.keys.get(key);
    if (!entry) return { exists: false };
    if (Date.now() - entry.timestamp > this.ttl) {
      this.keys.delete(key);
      return { exists: false };
    }
    return { exists: true, result: entry.result };
  }

  store(key, result) {
    this.keys.set(key, { result, timestamp: Date.now() });
  }

  getStats() {
    return { totalKeys: this.keys.size };
  }
}

const idempotencyStore = new IdempotencyStore();

// Simulate payment with retry
function processPaymentWithIdempotency(idempotencyKey, paymentDetails) {
  // Check if this request was already processed
  const existing = idempotencyStore.check(idempotencyKey);
  if (existing.exists) {
    return {
      ...existing.result,
      note: "IDEMPOTENT RESPONSE — returning cached result, no duplicate charge"
    };
  }

  // Process the payment
  const result = {
    paymentId: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    amount: paymentDetails.amount,
    currency: paymentDetails.currency,
    status: "success",
    processedAt: new Date().toISOString()
  };

  // Cache the result
  idempotencyStore.store(idempotencyKey, result);

  return result;
}

const idempotencyKey = "order_12345_payment_attempt";

console.log("First attempt (original request):");
const firstAttempt = processPaymentWithIdempotency(idempotencyKey, {
  amount: 500,
  currency: "INR",
  customerId: "cust_rahul",
  merchantId: "swiggy"
});
console.log(`  Payment ID: ${firstAttempt.paymentId}`);
console.log(`  Amount: Rs ${firstAttempt.amount}`);
console.log(`  Status: ${firstAttempt.status}`);

console.log("\nSecond attempt (network retry — SAME idempotency key):");
const secondAttempt = processPaymentWithIdempotency(idempotencyKey, {
  amount: 500,
  currency: "INR",
  customerId: "cust_rahul",
  merchantId: "swiggy"
});
console.log(`  Payment ID: ${secondAttempt.paymentId}`);
console.log(`  Status: ${secondAttempt.status}`);
console.log(`  Note: ${secondAttempt.note}`);
// Output: Same payment ID, no duplicate charge

console.log("\nThird attempt with DIFFERENT key (new payment):");
const thirdAttempt = processPaymentWithIdempotency("order_12346_payment_attempt", {
  amount: 750,
  currency: "INR",
  customerId: "cust_rahul",
  merchantId: "zomato"
});
console.log(`  Payment ID: ${thirdAttempt.paymentId}`);
console.log(`  Amount: Rs ${thirdAttempt.amount}`);
console.log(`  Note: ${thirdAttempt.note || "New payment processed"}`);

console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 3 — Double-Entry Ledger
// ════════════════════════════════════════════════════════════════

// WHY: Every rupee debited must be credited somewhere. Double-entry ensures this.

console.log("SECTION 3 — Double-Entry Ledger");
console.log("-".repeat(50));

class Ledger {
  constructor() {
    this.entries = [];
    this.balances = new Map(); // accountId -> balance
    this.entryCounter = 0;
  }

  _ensureAccount(accountId, initialBalance = 0) {
    if (!this.balances.has(accountId)) {
      this.balances.set(accountId, initialBalance);
    }
  }

  // Every transaction creates exactly TWO entries: one debit, one credit
  createTransaction(description, debitAccount, creditAccount, amount, metadata = {}) {
    if (amount <= 0) {
      return { success: false, error: "Amount must be positive" };
    }

    this._ensureAccount(debitAccount);
    this._ensureAccount(creditAccount);

    // Check sufficient balance for debit account
    if (this.balances.get(debitAccount) < amount) {
      return { success: false, error: `Insufficient balance in ${debitAccount}: Rs ${this.balances.get(debitAccount)} < Rs ${amount}` };
    }

    const txnId = `txn_${++this.entryCounter}_${Date.now()}`;
    const timestamp = Date.now();

    // Debit entry (money goes OUT)
    const debitEntry = {
      id: `entry_${this.entryCounter}a`,
      txnId,
      account: debitAccount,
      type: "DEBIT",
      amount: -amount,
      balance: this.balances.get(debitAccount) - amount,
      description,
      timestamp,
      metadata
    };

    // Credit entry (money comes IN)
    const creditEntry = {
      id: `entry_${this.entryCounter}b`,
      txnId,
      account: creditAccount,
      type: "CREDIT",
      amount: +amount,
      balance: this.balances.get(creditAccount) + amount,
      description,
      timestamp,
      metadata
    };

    // Update balances
    this.balances.set(debitAccount, debitEntry.balance);
    this.balances.set(creditAccount, creditEntry.balance);

    this.entries.push(debitEntry, creditEntry);

    return {
      success: true,
      txnId,
      debit: debitEntry,
      credit: creditEntry
    };
  }

  getBalance(accountId) {
    return this.balances.get(accountId) || 0;
  }

  getStatement(accountId) {
    return this.entries.filter(e => e.account === accountId);
  }

  // CRITICAL: Sum of all debits must equal sum of all credits
  verifyBalance() {
    let totalDebits = 0;
    let totalCredits = 0;

    this.entries.forEach(e => {
      if (e.type === "DEBIT") totalDebits += Math.abs(e.amount);
      else totalCredits += e.amount;
    });

    return {
      totalDebits,
      totalCredits,
      balanced: Math.abs(totalDebits - totalCredits) < 0.01,
      difference: Math.abs(totalDebits - totalCredits)
    };
  }

  printLedger() {
    console.log("  " + "-".repeat(90));
    console.log(`  ${"Entry ID".padEnd(16)} ${"Txn ID".padEnd(20)} ${"Account".padEnd(20)} ${"Type".padEnd(8)} ${"Amount".padStart(10)} ${"Balance".padStart(10)}`);
    console.log("  " + "-".repeat(90));
    this.entries.forEach(e => {
      const amt = e.type === "DEBIT" ? `-${Math.abs(e.amount)}` : `+${e.amount}`;
      console.log(`  ${e.id.padEnd(16)} ${e.txnId.substring(0, 18).padEnd(20)} ${e.account.padEnd(20)} ${e.type.padEnd(8)} ${amt.padStart(10)} ${String(e.balance).padStart(10)}`);
    });
    console.log("  " + "-".repeat(90));
  }
}

const ledger = new Ledger();

// Set up initial balances
ledger._ensureAccount("rahul_wallet", 10000);
ledger._ensureAccount("priya_wallet", 5000);
ledger._ensureAccount("swiggy_account", 0);
ledger._ensureAccount("zomato_account", 0);
ledger._ensureAccount("razorpay_fees", 0);

console.log("Initial Balances:");
console.log(`  Rahul's Wallet:   Rs ${ledger.getBalance("rahul_wallet")}`);
console.log(`  Priya's Wallet:   Rs ${ledger.getBalance("priya_wallet")}`);
console.log(`  Swiggy Account:   Rs ${ledger.getBalance("swiggy_account")}`);

// Transaction 1: Rahul orders food on Swiggy
console.log("\nTransaction 1: Rahul pays Rs 450 for Swiggy order");
const txn1 = ledger.createTransaction(
  "Swiggy Order #SW123 - Biryani + Raita",
  "rahul_wallet", "swiggy_account", 450,
  { orderId: "SW123", merchant: "Swiggy" }
);
console.log(`  Txn ID: ${txn1.txnId}`);
console.log(`  Rahul balance: Rs ${ledger.getBalance("rahul_wallet")}`);
console.log(`  Swiggy balance: Rs ${ledger.getBalance("swiggy_account")}`);

// Transaction 2: Priya orders on Zomato
console.log("\nTransaction 2: Priya pays Rs 680 for Zomato order");
const txn2 = ledger.createTransaction(
  "Zomato Order #ZM456 - Paneer + Naan",
  "priya_wallet", "zomato_account", 680,
  { orderId: "ZM456", merchant: "Zomato" }
);
console.log(`  Txn ID: ${txn2.txnId}`);
console.log(`  Priya balance: Rs ${ledger.getBalance("priya_wallet")}`);
console.log(`  Zomato balance: Rs ${ledger.getBalance("zomato_account")}`);

// Transaction 3: RazorPay fee
console.log("\nTransaction 3: RazorPay deducts 2% fee from Swiggy");
const fee = Math.round(450 * 0.02);
const txn3 = ledger.createTransaction(
  "RazorPay processing fee (2%)",
  "swiggy_account", "razorpay_fees", fee,
  { feeType: "processing", rate: "2%" }
);
console.log(`  Fee: Rs ${fee}`);
console.log(`  Swiggy after fee: Rs ${ledger.getBalance("swiggy_account")}`);
console.log(`  RazorPay fees: Rs ${ledger.getBalance("razorpay_fees")}`);

// Print full ledger
console.log("\nFull Ledger:");
ledger.printLedger();

// Verify double-entry balance
const verification = ledger.verifyBalance();
console.log(`\n  Double-Entry Verification:`);
console.log(`    Total Debits:  Rs ${verification.totalDebits}`);
console.log(`    Total Credits: Rs ${verification.totalCredits}`);
console.log(`    Balanced: ${verification.balanced} (difference: Rs ${verification.difference})`);
// Output: balanced = true, difference = 0

console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 4 — Payment State Machine
// ════════════════════════════════════════════════════════════════

// WHY: Payments have strict state transitions — invalid transitions cause money errors.

console.log("SECTION 4 — Payment State Machine");
console.log("-".repeat(50));

class PaymentStateMachine {
  constructor() {
    // Define valid state transitions
    this.transitions = {
      "CREATED":     ["PROCESSING", "CANCELLED"],
      "PROCESSING":  ["AUTHORIZED", "FAILED", "TIMEOUT"],
      "AUTHORIZED":  ["CAPTURED", "VOIDED"],
      "CAPTURED":    ["SETTLED", "REFUND_INITIATED"],
      "SETTLED":     ["REFUND_INITIATED", "COMPLETED"],
      "COMPLETED":   ["REFUND_INITIATED"],
      "REFUND_INITIATED": ["REFUNDED", "REFUND_FAILED"],
      "REFUNDED":    [],
      "FAILED":      ["CREATED"], // Can retry
      "TIMEOUT":     ["CREATED"], // Can retry
      "CANCELLED":   [],
      "VOIDED":      [],
      "REFUND_FAILED": ["REFUND_INITIATED"] // Can retry refund
    };
  }

  canTransition(currentState, newState) {
    const allowed = this.transitions[currentState] || [];
    return allowed.includes(newState);
  }

  transition(payment, newState, reason = "") {
    if (!this.canTransition(payment.state, newState)) {
      return {
        success: false,
        error: `Invalid transition: ${payment.state} -> ${newState}`,
        allowedTransitions: this.transitions[payment.state]
      };
    }

    const previousState = payment.state;
    payment.state = newState;
    payment.stateHistory.push({
      from: previousState,
      to: newState,
      reason,
      timestamp: Date.now()
    });

    return { success: true, from: previousState, to: newState };
  }

  printStateDiagram() {
    console.log("  Payment State Machine:");
    console.log("  CREATED -> PROCESSING -> AUTHORIZED -> CAPTURED -> SETTLED -> COMPLETED");
    console.log("     |           |             |                          |");
    console.log("     v           v             v                          v");
    console.log("  CANCELLED   FAILED/       VOIDED               REFUND_INITIATED");
    console.log("              TIMEOUT                              /          \\");
    console.log("                                              REFUNDED    REFUND_FAILED");
  }
}

const stateMachine = new PaymentStateMachine();
stateMachine.printStateDiagram();

// Create a payment and walk through states
const payment = {
  id: "pay_upi_001",
  amount: 999,
  state: "CREATED",
  stateHistory: [{ from: null, to: "CREATED", reason: "Payment initiated", timestamp: Date.now() }]
};

console.log(`\nPayment ${payment.id} lifecycle:`);
const stateChanges = [
  ["PROCESSING", "UPI request sent to NPCI"],
  ["AUTHORIZED", "Bank approved, funds held"],
  ["CAPTURED", "Merchant confirmed order"],
  ["SETTLED", "Money transferred to merchant"],
  ["COMPLETED", "Settlement confirmed"]
];

stateChanges.forEach(([newState, reason]) => {
  const result = stateMachine.transition(payment, newState, reason);
  if (result.success) {
    console.log(`  ${result.from.padEnd(18)} -> ${result.to.padEnd(18)} (${reason})`);
  }
});

// Try invalid transition
console.log("\nAttempting invalid transition:");
const invalidResult = stateMachine.transition(payment, "CREATED", "Reset");
console.log(`  ${payment.state} -> CREATED: ${invalidResult.error}`);
console.log(`  Allowed from COMPLETED: [${invalidResult.allowedTransitions.join(", ")}]`);

console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 5 — Reconciliation Process
// ════════════════════════════════════════════════════════════════

// WHY: Reconciliation catches discrepancies between our ledger and bank statements.

console.log("SECTION 5 — Reconciliation Process");
console.log("-".repeat(50));

class ReconciliationEngine {
  constructor() {
    this.results = [];
  }

  reconcile(internalLedger, bankStatement) {
    const result = {
      timestamp: new Date().toISOString(),
      matched: [],
      missingInBank: [],
      missingInLedger: [],
      amountMismatch: [],
      summary: {}
    };

    const bankMap = new Map();
    bankStatement.forEach(entry => {
      bankMap.set(entry.txnRef, entry);
    });

    const ledgerMap = new Map();
    internalLedger.forEach(entry => {
      ledgerMap.set(entry.txnRef, entry);
    });

    // Check each ledger entry against bank
    internalLedger.forEach(entry => {
      const bankEntry = bankMap.get(entry.txnRef);

      if (!bankEntry) {
        result.missingInBank.push(entry);
      } else if (Math.abs(entry.amount - bankEntry.amount) > 0.01) {
        result.amountMismatch.push({
          txnRef: entry.txnRef,
          ledgerAmount: entry.amount,
          bankAmount: bankEntry.amount,
          difference: entry.amount - bankEntry.amount
        });
      } else {
        result.matched.push(entry.txnRef);
      }
    });

    // Check for entries in bank but not in ledger
    bankStatement.forEach(entry => {
      if (!ledgerMap.has(entry.txnRef)) {
        result.missingInLedger.push(entry);
      }
    });

    result.summary = {
      totalLedgerEntries: internalLedger.length,
      totalBankEntries: bankStatement.length,
      matched: result.matched.length,
      missingInBank: result.missingInBank.length,
      missingInLedger: result.missingInLedger.length,
      amountMismatches: result.amountMismatch.length,
      reconciled: result.missingInBank.length === 0 &&
                  result.missingInLedger.length === 0 &&
                  result.amountMismatch.length === 0
    };

    this.results.push(result);
    return result;
  }
}

const reconciler = new ReconciliationEngine();

// Internal ledger entries
const internalLedger = [
  { txnRef: "UPI/001/2024", amount: 450, description: "Swiggy order", date: "2024-01-15" },
  { txnRef: "UPI/002/2024", amount: 680, description: "Zomato order", date: "2024-01-15" },
  { txnRef: "UPI/003/2024", amount: 200, description: "Amazon order", date: "2024-01-15" },
  { txnRef: "UPI/004/2024", amount: 1500, description: "Flipkart order", date: "2024-01-15" },
  { txnRef: "UPI/005/2024", amount: 99, description: "Netflix subscription", date: "2024-01-15" }
];

// Bank statement (with deliberate discrepancies)
const bankStatement = [
  { txnRef: "UPI/001/2024", amount: 450, description: "UPI Debit" },
  { txnRef: "UPI/002/2024", amount: 680, description: "UPI Debit" },
  { txnRef: "UPI/003/2024", amount: 199, description: "UPI Debit" }, // Amount mismatch!
  // UPI/004 missing from bank!
  { txnRef: "UPI/005/2024", amount: 99, description: "UPI Debit" },
  { txnRef: "UPI/006/2024", amount: 350, description: "UPI Debit" }  // Mystery entry!
];

console.log("Reconciliation: Internal Ledger vs Bank Statement\n");

const reconResult = reconciler.reconcile(internalLedger, bankStatement);

console.log(`  Matched: ${reconResult.summary.matched} transactions`);
reconResult.matched.forEach(ref => {
  console.log(`    [OK] ${ref}`);
});

if (reconResult.missingInBank.length > 0) {
  console.log(`\n  Missing in Bank Statement: ${reconResult.missingInBank.length}`);
  reconResult.missingInBank.forEach(e => {
    console.log(`    [ALERT] ${e.txnRef} - Rs ${e.amount} (${e.description})`);
    console.log(`           Action: Verify with bank, possible delayed settlement`);
  });
}

if (reconResult.missingInLedger.length > 0) {
  console.log(`\n  Missing in Internal Ledger: ${reconResult.missingInLedger.length}`);
  reconResult.missingInLedger.forEach(e => {
    console.log(`    [ALERT] ${e.txnRef} - Rs ${e.amount} (${e.description})`);
    console.log(`           Action: Investigate unknown bank debit`);
  });
}

if (reconResult.amountMismatch.length > 0) {
  console.log(`\n  Amount Mismatches: ${reconResult.amountMismatch.length}`);
  reconResult.amountMismatch.forEach(m => {
    console.log(`    [ALERT] ${m.txnRef}: Ledger=Rs ${m.ledgerAmount}, Bank=Rs ${m.bankAmount}, Diff=Rs ${m.difference}`);
    console.log(`           Action: Investigate Re ${Math.abs(m.difference)} discrepancy`);
  });
}

console.log(`\n  Overall Status: ${reconResult.summary.reconciled ? "RECONCILED" : "DISCREPANCIES FOUND"}`);

console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 6 — Refund Handling
// ════════════════════════════════════════════════════════════════

// WHY: Refunds are reverse transactions — they must also follow double-entry rules.

console.log("SECTION 6 — Refund Handling");
console.log("-".repeat(50));

class RefundProcessor {
  constructor(ledger, stateMachine) {
    this.ledger = ledger;
    this.stateMachine = stateMachine;
    this.refunds = new Map();
  }

  initiateRefund(originalPayment, amount, reason) {
    // Validate
    if (amount > originalPayment.amount) {
      return { success: false, error: "Refund amount exceeds payment amount" };
    }

    const refund = {
      id: `ref_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      originalPaymentId: originalPayment.id,
      amount,
      reason,
      type: amount === originalPayment.amount ? "FULL" : "PARTIAL",
      state: "CREATED",
      stateHistory: [{ from: null, to: "CREATED", timestamp: Date.now() }],
      createdAt: Date.now()
    };

    // Create reverse ledger entries (credit back to customer, debit from merchant)
    const ledgerResult = this.ledger.createTransaction(
      `Refund for ${originalPayment.id}: ${reason}`,
      originalPayment.merchantAccount || "swiggy_account",
      originalPayment.customerAccount || "rahul_wallet",
      amount,
      { refundId: refund.id, originalPaymentId: originalPayment.id }
    );

    if (!ledgerResult.success) {
      return { success: false, error: ledgerResult.error };
    }

    refund.ledgerTxnId = ledgerResult.txnId;
    refund.state = "COMPLETED";
    this.refunds.set(refund.id, refund);

    return { success: true, refund, ledgerTxnId: ledgerResult.txnId };
  }

  getRefund(refundId) {
    return this.refunds.get(refundId);
  }
}

const refundProcessor = new RefundProcessor(ledger, stateMachine);

// Process a refund for Swiggy order (food was cold)
console.log("Refund Scenario: Rahul's Swiggy biryani was cold\n");

const originalPayment = {
  id: "pay_sw_001",
  amount: 450,
  customerAccount: "rahul_wallet",
  merchantAccount: "swiggy_account"
};

console.log(`  Original Payment: Rs ${originalPayment.amount}`);
console.log(`  Rahul's balance before refund: Rs ${ledger.getBalance("rahul_wallet")}`);
console.log(`  Swiggy's balance before refund: Rs ${ledger.getBalance("swiggy_account")}`);

// Full refund
const refundResult = refundProcessor.initiateRefund(
  originalPayment,
  450,
  "Food quality issue - biryani was cold"
);

if (refundResult.success) {
  console.log(`\n  Refund ${refundResult.refund.id}:`);
  console.log(`    Type: ${refundResult.refund.type}`);
  console.log(`    Amount: Rs ${refundResult.refund.amount}`);
  console.log(`    Reason: ${refundResult.refund.reason}`);
  console.log(`    Ledger Txn: ${refundResult.ledgerTxnId}`);
  console.log(`\n  Rahul's balance after refund: Rs ${ledger.getBalance("rahul_wallet")}`);
  console.log(`  Swiggy's balance after refund: Rs ${ledger.getBalance("swiggy_account")}`);
}

// Partial refund scenario
console.log("\n  Partial Refund Scenario: Priya's Zomato naan was stale");
const priyaPayment = {
  id: "pay_zm_001",
  amount: 680,
  customerAccount: "priya_wallet",
  merchantAccount: "zomato_account"
};

const partialRefund = refundProcessor.initiateRefund(priyaPayment, 200, "Stale naan - partial refund");
if (partialRefund.success) {
  console.log(`    Refund: Rs ${partialRefund.refund.amount} (${partialRefund.refund.type})`);
  console.log(`    Priya balance: Rs ${ledger.getBalance("priya_wallet")}`);
  console.log(`    Zomato balance: Rs ${ledger.getBalance("zomato_account")}`);
}

// Verify double-entry still balanced
const postRefundVerify = ledger.verifyBalance();
console.log(`\n  Post-refund double-entry check: Balanced = ${postRefundVerify.balanced}`);

console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 7 — Retry and Timeout Handling
// ════════════════════════════════════════════════════════════════

// WHY: UPI transactions on 2G networks timeout frequently — smart retry saves the day.

console.log("SECTION 7 — Retry and Timeout Handling");
console.log("-".repeat(50));

class PaymentRetryManager {
  constructor(maxRetries = 3) {
    this.maxRetries = maxRetries;
    this.retryDelays = [1000, 2000, 4000]; // Exponential backoff
    this.retryLog = [];
  }

  async processWithRetry(paymentFn, paymentId) {
    let lastError = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      const delay = this.retryDelays[attempt - 1] || this.retryDelays[this.retryDelays.length - 1];

      try {
        const result = paymentFn(attempt);

        if (result.success) {
          this.retryLog.push({
            paymentId,
            attempt,
            status: "success",
            timestamp: Date.now()
          });
          return {
            success: true,
            result,
            attempts: attempt,
            totalRetries: attempt - 1
          };
        }

        lastError = result.error;
      } catch (err) {
        lastError = err.message;
      }

      this.retryLog.push({
        paymentId,
        attempt,
        status: "failed",
        error: lastError,
        nextRetryIn: attempt < this.maxRetries ? delay : null,
        timestamp: Date.now()
      });

      // Simulate delay (not actually waiting for demo)
    }

    return {
      success: false,
      error: lastError,
      attempts: this.maxRetries,
      action: "Manual investigation required"
    };
  }

  getLog() {
    return this.retryLog;
  }
}

const retryManager = new PaymentRetryManager(3);

// Simulate payment that fails twice then succeeds
console.log("Retry simulation: UPI payment on flaky 2G network\n");

let attemptCount = 0;
const flakyPayment = (attempt) => {
  attemptCount++;
  if (attemptCount <= 2) {
    return { success: false, error: "TIMEOUT: Bank server not responding" };
  }
  return { success: true, paymentId: "pay_retry_001", amount: 299 };
};

const retryResult = retryManager.processWithRetry(flakyPayment, "pay_retry_001");

console.log("  Retry Log:");
retryManager.getLog().forEach(entry => {
  const statusIcon = entry.status === "success" ? "[OK]" : "[FAIL]";
  console.log(`    Attempt ${entry.attempt}: ${statusIcon} ${entry.error || "Payment processed"}`);
  if (entry.nextRetryIn) {
    console.log(`               Next retry in ${entry.nextRetryIn}ms (exponential backoff)`);
  }
});

console.log(`\n  Final result: ${retryResult.success ? "SUCCESS" : "FAILED"}`);
console.log(`  Total attempts: ${retryResult.attempts}`);

// Show backoff strategy
console.log("\n  Exponential Backoff Strategy:");
console.log("    Attempt 1: Wait 1s   (1000ms)");
console.log("    Attempt 2: Wait 2s   (2000ms)");
console.log("    Attempt 3: Wait 4s   (4000ms)");
console.log("    After 3 failures: STOP, alert operations team");
console.log("    NEVER retry without idempotency key!");

console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 8 — Payment Analytics
// ════════════════════════════════════════════════════════════════

// WHY: Payment analytics help merchants understand revenue and RazorPay optimize.

console.log("SECTION 8 — Payment Analytics");
console.log("-".repeat(50));

class PaymentAnalytics {
  constructor() {
    this.payments = [];
  }

  recordPayment(payment) {
    this.payments.push(payment);
  }

  getDailyReport() {
    const report = {
      totalTransactions: this.payments.length,
      totalVolume: 0,
      avgTransactionValue: 0,
      successRate: 0,
      byPaymentMethod: {},
      byMerchant: {},
      byHour: {},
      byStatus: { success: 0, failed: 0, timeout: 0, refunded: 0 }
    };

    this.payments.forEach(p => {
      report.totalVolume += p.amount;
      report.byStatus[p.status] = (report.byStatus[p.status] || 0) + 1;

      if (!report.byPaymentMethod[p.method]) {
        report.byPaymentMethod[p.method] = { count: 0, volume: 0 };
      }
      report.byPaymentMethod[p.method].count++;
      report.byPaymentMethod[p.method].volume += p.amount;

      if (!report.byMerchant[p.merchant]) {
        report.byMerchant[p.merchant] = { count: 0, volume: 0 };
      }
      report.byMerchant[p.merchant].count++;
      report.byMerchant[p.merchant].volume += p.amount;

      const hour = new Date(p.timestamp).getHours();
      report.byHour[hour] = (report.byHour[hour] || 0) + 1;
    });

    report.avgTransactionValue = Math.round(report.totalVolume / report.totalTransactions);
    report.successRate = ((report.byStatus.success / report.totalTransactions) * 100).toFixed(1);

    return report;
  }
}

const payAnalytics = new PaymentAnalytics();

// Generate sample payment data
const merchants = ["Swiggy", "Zomato", "Amazon", "Flipkart", "BigBasket"];
const methods = ["UPI", "UPI", "UPI", "Card", "NetBanking", "Wallet"];
const statuses = ["success", "success", "success", "success", "success", "success", "success", "failed", "timeout"];

for (let i = 0; i < 100; i++) {
  payAnalytics.recordPayment({
    id: `pay_${i}`,
    amount: Math.floor(Math.random() * 2000) + 50,
    merchant: merchants[Math.floor(Math.random() * merchants.length)],
    method: methods[Math.floor(Math.random() * methods.length)],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    timestamp: Date.now() - Math.random() * 86400000
  });
}

const dailyReport = payAnalytics.getDailyReport();

console.log("Daily Payment Report (RazorPay Dashboard):\n");
console.log(`  Total Transactions: ${dailyReport.totalTransactions}`);
console.log(`  Total Volume: Rs ${dailyReport.totalVolume.toLocaleString()}`);
console.log(`  Avg Transaction: Rs ${dailyReport.avgTransactionValue}`);
console.log(`  Success Rate: ${dailyReport.successRate}%`);

console.log("\n  By Payment Method:");
Object.entries(dailyReport.byPaymentMethod)
  .sort((a, b) => b[1].count - a[1].count)
  .forEach(([method, data]) => {
    console.log(`    ${method.padEnd(12)} ${String(data.count).padStart(3)} txns | Rs ${data.volume.toLocaleString().padStart(8)}`);
  });

console.log("\n  By Merchant:");
Object.entries(dailyReport.byMerchant)
  .sort((a, b) => b[1].volume - a[1].volume)
  .forEach(([merchant, data]) => {
    console.log(`    ${merchant.padEnd(12)} ${String(data.count).padStart(3)} txns | Rs ${data.volume.toLocaleString().padStart(8)}`);
  });

console.log("\n  By Status:");
Object.entries(dailyReport.byStatus).forEach(([status, count]) => {
  const pct = ((count / dailyReport.totalTransactions) * 100).toFixed(1);
  console.log(`    ${status.padEnd(12)} ${String(count).padStart(3)} (${pct}%)`);
});

console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 9 — Full Payment System Simulation
// ════════════════════════════════════════════════════════════════

// WHY: End-to-end flow shows how all components work together for a UPI payment.

console.log("SECTION 9 — Full Payment System Simulation");
console.log("-".repeat(50));

class PaymentSystem {
  constructor() {
    this.ledger = new Ledger();
    this.idempotencyStore = new IdempotencyStore();
    this.stateMachine = new PaymentStateMachine();
    this.refundProcessor = new RefundProcessor(this.ledger, this.stateMachine);
    this.payments = new Map();
    this.processingLog = [];
  }

  initialize(accounts) {
    accounts.forEach(a => {
      this.ledger._ensureAccount(a.id, a.balance);
    });
  }

  processPayment(idempotencyKey, details) {
    // Step 1: Idempotency check
    const existing = this.idempotencyStore.check(idempotencyKey);
    if (existing.exists) {
      this.processingLog.push({ step: "IDEMPOTENT", detail: "Returning cached result" });
      return existing.result;
    }

    // Step 2: Create payment
    const payment = {
      id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      ...details,
      state: "CREATED",
      stateHistory: [{ from: null, to: "CREATED", timestamp: Date.now() }]
    };

    this.processingLog.push({ step: "CREATED", detail: `Payment ${payment.id}` });

    // Step 3: Processing
    this.stateMachine.transition(payment, "PROCESSING", "Sent to UPI gateway");
    this.processingLog.push({ step: "PROCESSING", detail: "Sent to NPCI" });

    // Step 4: Authorization (simulate bank response)
    const authorized = Math.random() > 0.1; // 90% success rate
    if (!authorized) {
      this.stateMachine.transition(payment, "FAILED", "Bank declined");
      this.processingLog.push({ step: "FAILED", detail: "Bank declined transaction" });
      const result = { success: false, paymentId: payment.id, state: "FAILED" };
      this.idempotencyStore.store(idempotencyKey, result);
      return result;
    }

    this.stateMachine.transition(payment, "AUTHORIZED", "Bank approved");
    this.processingLog.push({ step: "AUTHORIZED", detail: "Funds held by bank" });

    // Step 5: Capture — create ledger entries
    const ledgerResult = this.ledger.createTransaction(
      `Payment ${payment.id}: ${details.description || ""}`,
      details.fromAccount,
      details.toAccount,
      details.amount,
      { paymentId: payment.id }
    );

    if (!ledgerResult.success) {
      this.stateMachine.transition(payment, "FAILED", ledgerResult.error);
      const result = { success: false, paymentId: payment.id, error: ledgerResult.error };
      this.idempotencyStore.store(idempotencyKey, result);
      return result;
    }

    this.stateMachine.transition(payment, "CAPTURED", "Funds captured");
    this.processingLog.push({ step: "CAPTURED", detail: `Ledger txn: ${ledgerResult.txnId}` });

    // Step 6: Settlement
    this.stateMachine.transition(payment, "SETTLED", "Bank settlement confirmed");
    this.stateMachine.transition(payment, "COMPLETED", "Payment complete");
    this.processingLog.push({ step: "COMPLETED", detail: "Payment fully settled" });

    this.payments.set(payment.id, payment);

    const result = {
      success: true,
      paymentId: payment.id,
      amount: details.amount,
      state: "COMPLETED",
      ledgerTxnId: ledgerResult.txnId
    };

    this.idempotencyStore.store(idempotencyKey, result);
    return result;
  }
}

const paymentSystem = new PaymentSystem();

// Initialize accounts
paymentSystem.initialize([
  { id: "customer_wallet", balance: 25000 },
  { id: "merchant_swiggy", balance: 0 },
  { id: "merchant_zomato", balance: 0 }
]);

console.log("=== End-to-End UPI Payment Flow ===\n");

console.log("Step-by-step payment processing:\n");

const payResult = paymentSystem.processPayment(
  "idem_key_swiggy_order_789",
  {
    amount: 599,
    fromAccount: "customer_wallet",
    toAccount: "merchant_swiggy",
    description: "Swiggy Order #789 - Butter Chicken + Garlic Naan",
    method: "UPI"
  }
);

paymentSystem.processingLog.forEach(log => {
  console.log(`  [${log.step.padEnd(12)}] ${log.detail}`);
});

console.log(`\n  Result: ${payResult.success ? "SUCCESS" : "FAILED"}`);
console.log(`  Payment ID: ${payResult.paymentId}`);
console.log(`  Amount: Rs ${payResult.amount}`);
console.log(`  Customer balance: Rs ${paymentSystem.ledger.getBalance("customer_wallet")}`);
console.log(`  Swiggy balance: Rs ${paymentSystem.ledger.getBalance("merchant_swiggy")}`);

// Retry same payment (idempotency)
console.log("\n  Retrying same payment (network retry):");
paymentSystem.processingLog = [];
const retryPayResult = paymentSystem.processPayment("idem_key_swiggy_order_789", {
  amount: 599,
  fromAccount: "customer_wallet",
  toAccount: "merchant_swiggy"
});
console.log(`  Result: ${retryPayResult.success ? "SUCCESS (cached)" : "FAILED"}`);
console.log(`  Same Payment ID: ${retryPayResult.paymentId}`);
console.log(`  Customer NOT charged again: Rs ${paymentSystem.ledger.getBalance("customer_wallet")}`);

// Final ledger verification
const finalVerify = paymentSystem.ledger.verifyBalance();
console.log(`\n  Final double-entry verification: Balanced = ${finalVerify.balanced}`);

console.log();

// ════════════════════════════════════════════════════════════════
// KEY TAKEAWAYS
// ════════════════════════════════════════════════════════════════

console.log("=".repeat(70));
console.log("  KEY TAKEAWAYS");
console.log("=".repeat(70));
console.log();
console.log("  1. Idempotency keys prevent duplicate charges on network retries");
console.log("  2. Double-entry ledger: every debit has a credit — sum must always be zero");
console.log("  3. Payment state machine prevents invalid transitions (e.g., FAILED -> SETTLED)");
console.log("  4. Reconciliation matches internal ledger against bank statements daily");
console.log("  5. Refunds are reverse transactions — they follow the same double-entry rules");
console.log("  6. Exponential backoff prevents thundering herd on payment retries");
console.log("  7. UPI processes 10B+ transactions/month — every one must be exactly-once");
console.log("  8. Even Re 1 mismatch in reconciliation triggers investigation");
console.log();
console.log('  "In payments, there is no such thing as almost correct.');
console.log('   Either the money moved exactly right, or someone lost money."');
console.log('   — RazorPay Engineering Team');
console.log();
