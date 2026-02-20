/**
 * ============================================================
 *  FILE 30 : Async Iterators & Streams
 *  Topic   : Async Generator, Observable, Backpressure, Actor
 *  WHY THIS MATTERS:
 *    Real data arrives over time — from APIs, databases, and
 *    sockets. Async iterators consume streams lazily, observables
 *    push events reactively, and the actor model isolates
 *    concurrent state behind async message queues.
 * ============================================================
 */

// STORY: Ganga Canal Engineer Mira manages water flow through
// barrages and canal locks from Haridwar to the fields —
// controlling the rate, observing sensor readings, and
// dispatching lock operators along the canal.

(async () => {

const delay = ms => new Promise(r => setTimeout(r, ms));

// ────────────────────────────────────────────────────────────
// BLOCK 1 — Async Generators & for-await-of
// ────────────────────────────────────────────────────────────
console.log("=== BLOCK 1: Async Generators ===");

// WHY: Async generators yield values over time — perfect for
// streaming water level data without loading everything into memory.
async function* canalFlow(count) {
  for (let i = 1; i <= count; i++) {
    await delay(5);
    yield { level: i * 10, sensor: `Lock-${i}` };
  }
}

const levels = [];
for await (const reading of canalFlow(4)) levels.push(reading.level);
console.log("Mira's canal levels:", levels);
// Output: Mira's canal levels: [ 10, 20, 30, 40 ]

// WHY: Paginated API — fetch one irrigation zone at a time, yield fields.
async function* paginatedZones(totalZones) {
  for (let zone = 1; zone <= totalZones; zone++) {
    await delay(5);
    const fields = [`field-${zone}a`, `field-${zone}b`];
    yield* fields;  // yield each field individually
  }
}

const allFields = [];
for await (const field of paginatedZones(3)) allFields.push(field);
console.log("Mira's irrigated fields:", allFields);
// Output: Mira's irrigated fields: [ 'field-1a', 'field-1b', 'field-2a', 'field-2b', 'field-3a', 'field-3b' ]

// WHY: Composing async generators — filter and transform streams
async function* filter(source, pred) {
  for await (const item of source) { if (pred(item)) yield item; }
}
async function* map(source, fn) {
  for await (const item of source) yield fn(item);
}

// Mira chains: generate -> filter high water levels -> format
const highLevels = [];
const formatted = map(
  filter(canalFlow(5), r => r.level >= 30),
  r => `${r.sensor}:${r.level}cm`
);
for await (const entry of formatted) highLevels.push(entry);
console.log("Mira's high water levels:", highLevels);
// Output: Mira's high water levels: [ 'Lock-3:30cm', 'Lock-4:40cm', 'Lock-5:50cm' ]

// ────────────────────────────────────────────────────────────
// BLOCK 2 — Basic Observable Implementation
// ────────────────────────────────────────────────────────────
console.log("\n=== BLOCK 2: Observable ===");

// WHY: Observables push values to subscribers — unlike iterators
// where the consumer pulls. Foundation of reactive canal monitoring.
class Observable {
  constructor(subscribeFn) { this._subscribe = subscribeFn; }

  subscribe(observer) {
    const obs = typeof observer === "function"
      ? { next: observer, error: () => {}, complete: () => {} }
      : { next: observer.next || (() => {}), error: observer.error || (() => {}),
          complete: observer.complete || (() => {}) };
    let unsub = false;
    const safe = { next: v => { if (!unsub) obs.next(v); },
      error: e => { if (!unsub) obs.error(e); },
      complete: () => { if (!unsub) obs.complete(); } };
    this._subscribe(safe);
    // WHY: Return unsubscribe to prevent memory leaks
    return { unsubscribe: () => { unsub = true; } };
  }

  // WHY: map transforms emitted values — same as functor map
  map(fn) {
    return new Observable(obs => {
      this.subscribe({ next: v => obs.next(fn(v)), error: e => obs.error(e), complete: () => obs.complete() });
    });
  }
  // WHY: filter only passes values matching a predicate
  filter(pred) {
    return new Observable(obs => {
      this.subscribe({ next: v => { if (pred(v)) obs.next(v); }, error: e => obs.error(e), complete: () => obs.complete() });
    });
  }
}

// Mira observes the canal — water level sensor emits readings
const sensorReadings = await new Promise(resolve => {
  const collected = [];
  const sensor$ = new Observable(observer => {
    let i = 0;
    const id = setInterval(() => {
      i++;
      if (i <= 5) observer.next(i * 12);
      else { observer.complete(); clearInterval(id); }
    }, 5);
  });
  sensor$
    .filter(level => level > 24)
    .map(level => `FloodAlert:${level}cm`)
    .subscribe({ next: val => collected.push(val), complete: () => resolve(collected) });
});
console.log("Mira's canal sensor alerts:", sensorReadings);
// Output: Mira's canal sensor alerts: [ 'FloodAlert:36cm', 'FloodAlert:48cm', 'FloodAlert:60cm' ]

// Unsubscribe demo
const earlyResults = await new Promise(resolve => {
  const got = [];
  const readings$ = new Observable(observer => {
    let i = 0;
    const id = setInterval(() => {
      observer.next(++i);
      if (i >= 10) { clearInterval(id); observer.complete(); }
    }, 5);
  });
  const sub = readings$.subscribe({
    next: v => { got.push(v); if (v >= 3) sub.unsubscribe(); },
    complete: () => {}
  });
  setTimeout(() => resolve(got), 80);
});
console.log("Mira unsubscribes after 3 readings:", earlyResults);
// Output: Mira unsubscribes after 3 readings: [ 1, 2, 3 ]

// ────────────────────────────────────────────────────────────
// BLOCK 3 — Backpressure & Actor Model
// ────────────────────────────────────────────────────────────
console.log("\n=== BLOCK 3: Backpressure & Actor ===");

// WHY: for-await naturally applies backpressure — the canal lock
// pauses water flow until the downstream channel is ready.
async function* barrageRelease(n) { for (let i = 1; i <= n; i++) yield i; }
async function irrigateSlow(src, ms) {
  const out = [];
  for await (const item of src) { await delay(ms); out.push(item * 10); }
  return out;
}
const bpResult = await irrigateSlow(barrageRelease(4), 5);
console.log("Mira's backpressure result:", bpResult);
// Output: Mira's backpressure result: [ 10, 20, 30, 40 ]

// WHY: Bounded canal lock — explicit queue with max capacity.
// Barrage blocks when full; fields block when empty.
class BoundedCanalLock {
  constructor(cap) { this._cap = cap; this._q = []; this._wR = []; this._wS = []; }
  async send(v) {
    if (this._wR.length > 0) { this._wR.shift()(v); return; }
    if (this._q.length >= this._cap) await new Promise(r => this._wS.push(r));
    this._q.push(v);
  }
  async receive() {
    if (this._q.length > 0) {
      const v = this._q.shift(); if (this._wS.length > 0) this._wS.shift()(); return v;
    }
    return new Promise(r => this._wR.push(r));
  }
}

const lock = new BoundedCanalLock(2);
const lockResults = [];
const producer = (async () => { for (let i = 1; i <= 4; i++) await lock.send(i); })();
const consumer = (async () => {
  for (let i = 0; i < 4; i++) { lockResults.push(await lock.receive()); await delay(5); }
})();
await Promise.all([producer, consumer]);
console.log("Mira's bounded canal lock:", lockResults);
// Output: Mira's bounded canal lock: [ 1, 2, 3, 4 ]

// WHY: Lock operators isolate state behind async message queues —
// no shared mutation, no locks, just messages between canal junctions.
class LockOperator {
  constructor(name, handler) {
    this._handler = handler; this._state = {}; this._q = []; this._busy = false;
  }
  async send(msg) { this._q.push(msg); if (!this._busy) this._drain(); }
  async _drain() {
    this._busy = true;
    while (this._q.length) this._state = await this._handler(this._state, this._q.shift());
    this._busy = false;
  }
  get state() { return this._state; }
}

const barrageOperator = new LockOperator("Haridwar Barrage", async (state, msg) => {
  await delay(2);
  const waterLevel = (state.waterLevel || 0) + msg.change;
  return { ...state, waterLevel, lastAction: msg.type };
});
await barrageOperator.send({ type: "monsoon-inflow", change: 30 });
await barrageOperator.send({ type: "gate-release", change: -10 });
await barrageOperator.send({ type: "monsoon-inflow", change: 15 });
await delay(20);
console.log("Mira's barrage operator state:", barrageOperator.state);
// Output: Mira's barrage operator state: { waterLevel: 35, lastAction: 'monsoon-inflow' }

// Multiple lock operators communicating
const alertOperator = new LockOperator("Alert Station", async (state, msg) => {
  const log = state.log || []; log.push(msg.text); return { log };
});
const sensorOperator = new LockOperator("Canal Sensor", async (state, msg) => {
  if (msg.value > 50) await alertOperator.send({ text: `HIGH-WATER:${msg.value}cm` });
  return { ...state, latest: msg.value };
});
await sensorOperator.send({ value: 30 });
await sensorOperator.send({ value: 70 });
await sensorOperator.send({ value: 55 });
await delay(20);
console.log("Mira's sensor operator:", sensorOperator.state);
// Output: Mira's sensor operator: { latest: 55 }
console.log("Mira's alert operator:", alertOperator.state);
// Output: Mira's alert operator: { log: [ 'HIGH-WATER:70cm', 'HIGH-WATER:55cm' ] }

// ────────────────────────────────────────────────────────────
// KEY TAKEAWAYS
// ────────────────────────────────────────────────────────────
// 1. Async generators + for-await-of provide pull-based
//    streaming — the irrigation channel controls the pace.
// 2. yield* delegates to another iterable, flattening zones.
// 3. Observable is push-based — the canal sensor decides when
//    to emit. map/filter compose just like array methods.
// 4. Backpressure emerges naturally from for-await; bounded
//    canal locks make it explicit with capacity limits.
// 5. The Lock Operator (Actor) model isolates state behind
//    async message queues — no shared mutation, just messages
//    between canal junction operators.

})();
