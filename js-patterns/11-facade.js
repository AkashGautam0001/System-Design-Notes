/**
 * ============================================================
 *  FILE 11 : The Facade Pattern
 *  Topic   : Facade, Simplified Interface
 *  WHY THIS MATTERS:
 *    Complex systems have dozens of moving parts. A Facade
 *    wraps them behind a single, friendly interface so callers
 *    never need to understand the wiring underneath. It reduces
 *    coupling, improves readability, and makes refactoring the
 *    internals painless.
 * ============================================================
 */

// STORY: IRCTC is India's single window for railway bookings.
// Passengers never deal with PNR generation, coach allotment, or
// payment gateways directly — IRCTC handles everything through
// one simple bookTicket() call.

// ────────────────────────────────────────────────────────────
// BLOCK 1 — Facade over a Complex Subsystem
// ────────────────────────────────────────────────────────────

// WHY: Five separate subsystems exist. Without a Facade the
// passenger (caller) would need to call each one in the right order.

class PNRService {
  generatePNR(train) {
    return `PNR generated for train ${train}`;
  }
}

class CoachAllotment {
  assignCoach(passenger) {
    return `Coach B2 allotted to ${passenger}`;
  }
}

class PaymentGateway {
  processPayment(amount) {
    return `Payment of ₹${amount} processed via UPI`;
  }
}

// WHY: The Facade gives callers ONE method instead of three.
class IRCTCBooking {
  constructor() {
    this.pnr = new PNRService();
    this.coach = new CoachAllotment();
    this.payment = new PaymentGateway();
  }

  bookTicket(passenger, train, fare) {
    const results = [];
    results.push(this.pnr.generatePNR(train));
    results.push(this.coach.assignCoach(passenger));
    results.push(this.payment.processPayment(fare));
    return results;
  }
}

console.log("=== BLOCK 1: Facade over Complex Subsystem ===");
const irctc = new IRCTCBooking();
const steps = irctc.bookTicket("Ramesh Kumar", "Rajdhani Express", 2450);

console.log(steps[0]); // Output: PNR generated for train Rajdhani Express
console.log(steps[1]); // Output: Coach B2 allotted to Ramesh Kumar
console.log(steps[2]); // Output: Payment of ₹2450 processed via UPI
console.log(`Total steps handled by facade: ${steps.length}`); // Output: Total steps handled by facade: 3

// ────────────────────────────────────────────────────────────
// BLOCK 2 — API Facade (combining multiple railway API calls)
// ────────────────────────────────────────────────────────────

// WHY: Real apps often need data from several services to build
// a single response. An API Facade composes those calls so the
// consumer sees one clean function.

class PassengerService {
  getPassenger(id) {
    return { id, name: "Sunita Devi" };
  }
}

class TicketService {
  getTickets(passengerId) {
    return [
      { id: "T1", train: "Rajdhani Express", class: "3A" },
      { id: "T2", train: "Shatabdi Express", class: "CC" },
    ];
  }
}

class WaitlistManager {
  getPosition(passengerId) {
    return 7;
  }
}

// WHY: One call replaces three — the caller never imports the
// individual services.
class PassengerDashboardFacade {
  constructor() {
    this.passengers = new PassengerService();
    this.tickets = new TicketService();
    this.waitlist = new WaitlistManager();
  }

  getDashboard(passengerId) {
    const passenger = this.passengers.getPassenger(passengerId);
    const tickets = this.tickets.getTickets(passengerId);
    const waitlistPosition = this.waitlist.getPosition(passengerId);
    return {
      name: passenger.name,
      totalBookings: tickets.length,
      waitlistPosition: waitlistPosition,
    };
  }
}

console.log("\n=== BLOCK 2: API Facade ===");
const dashboard = new PassengerDashboardFacade();
const data = dashboard.getDashboard(1);

console.log(`Passenger: ${data.name}`);              // Output: Passenger: Sunita Devi
console.log(`Bookings: ${data.totalBookings}`);      // Output: Bookings: 2
console.log(`Waitlist: ${data.waitlistPosition}`);    // Output: Waitlist: 7

// ────────────────────────────────────────────────────────────
// BLOCK 3 — Facade for Complex Initialization
// ────────────────────────────────────────────────────────────

// WHY: App startup often requires connecting a database, warming
// a cache, and booting an SMS service — in the right order. A facade
// hides all of that behind IRCTC.init().

class Database {
  connect() {
    this.connected = true;
    return "Database connected";
  }
}

class Cache {
  warm() {
    this.ready = true;
    return "Cache warmed";
  }
}

class SMSService {
  init(provider) {
    this.provider = provider;
    return `SMS service initialized with provider ${provider}`;
  }
}

class IRCTC {
  constructor() {
    this.db = new Database();
    this.cache = new Cache();
    this.sms = new SMSService();
    this.running = false;
  }

  // WHY: Callers just call init() — no need to know the order
  // of operations or which subsystems exist.
  init() {
    const results = [];
    results.push(this.sms.init("BSNL"));
    results.push(this.db.connect());
    results.push(this.cache.warm());
    this.running = true;
    results.push("IRCTC is ready");
    return results;
  }

  status() {
    return {
      db: this.db.connected,
      cache: this.cache.ready,
      smsProvider: this.sms.provider,
      running: this.running,
    };
  }
}

console.log("\n=== BLOCK 3: Complex Initialization Facade ===");
const app = new IRCTC();
const initSteps = app.init();

initSteps.forEach((step) => console.log(step));
// Output: SMS service initialized with provider BSNL
// Output: Database connected
// Output: Cache warmed
// Output: IRCTC is ready

const s = app.status();
console.log(`DB connected: ${s.db}`);        // Output: DB connected: true
console.log(`Cache ready: ${s.cache}`);       // Output: Cache ready: true
console.log(`SMS provider: ${s.smsProvider}`); // Output: SMS provider: BSNL
console.log(`Running: ${s.running}`);         // Output: Running: true

// ────────────────────────────────────────────────────────────
// KEY TAKEAWAYS
// ────────────────────────────────────────────────────────────
// 1. A Facade wraps a complex subsystem behind a simple interface.
// 2. It does NOT add new behavior — it delegates to existing parts.
// 3. Callers stay decoupled from internal classes, so internals
//    can change without breaking consumer code.
// 4. Common uses: SDK wrappers, API aggregation layers, app
//    bootstrap sequences, and library convenience methods.
// 5. IRCTC's bookTicket() is the Facade — passengers never call
//    PNRService or CoachAllotment directly.
