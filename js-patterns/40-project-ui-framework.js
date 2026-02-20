/**
 * ============================================================
 *  FILE 40 : SwiggyDashboard — Capstone Reactive UI Framework
 *  Topic   : Composite, Observer, Proxy, State, Decorator,
 *            Template Method
 *  WHY THIS MATTERS:
 *  Modern UI frameworks combine many design patterns under the
 *  hood. SwiggyDashboard builds a minimal reactive system from
 *  scratch — a component tree (Composite), Proxy-based live order
 *  tracking, lifecycle hooks via Template Method, a centralized
 *  state store, and decorators for cross-cutting concerns.
 * ============================================================
 */
// STORY: The Swiggy Dashboard system constructs a live restaurant
// dashboard where every component (OrderList, OrderCard) knows its
// children, reacts to order status changes through Proxy-based tracking,
// follows an order lifecycle (Template Method), and draws power from
// the centralized order state store.

// ────────────────────────────────────────────────────────────
//  SECTION 1 — Reactive State (Proxy + Observer)
// ────────────────────────────────────────────────────────────
// WHY: Proxy intercepts property mutation. Combined with an observer
//      list, any state change auto-notifies subscribers.
class ReactiveState {
  constructor(initial = {}) {
    this._subscribers = new Set();
    this._batching = false; this._pendingNotify = false;
    this._state = new Proxy(initial, {
      set: (target, prop, value) => {
        const old = target[prop]; target[prop] = value;
        if (old !== value) {
          if (this._batching) { this._pendingNotify = true; }
          else { this._notify(prop, value, old); }
        }
        return true;
      },
      get: (target, prop) => target[prop],
    });
  }
  get state() { return this._state; }
  subscribe(fn) { this._subscribers.add(fn); return () => this._subscribers.delete(fn); }
  // WHY: Batching groups multiple mutations into one notification.
  batch(fn) {
    this._batching = true; this._pendingNotify = false;
    fn(this._state); this._batching = false;
    if (this._pendingNotify) this._notify("batch", null, null);
  }
  _notify(prop, value, old) {
    for (const fn of this._subscribers) fn({ prop, value, old });
  }
}

// ────────────────────────────────────────────────────────────
//  SECTION 2 — Component Base Class (Composite + Template Method)
// ────────────────────────────────────────────────────────────
// WHY: Composite treats single and tree of components uniformly.
//      Template Method defines the lifecycle skeleton.
class Component {
  constructor(name, props = {}) {
    this.name = name; this.props = props; this.children = [];
    this.parent = null; this._mounted = false; this._renderCount = 0; this._output = "";
  }
  addChild(child) { child.parent = this; this.children.push(child); return this; }
  removeChild(child) { this.children = this.children.filter((c) => c !== child); child.parent = null; return this; }
  // WHY: mount() defines the fixed sequence. Subclasses override hooks, not the skeleton.
  mount() {
    this.onBeforeMount(); this._output = this.render(); this._mounted = true; this._renderCount++;
    for (const child of this.children) child.mount();
    this.onMounted(); return this;
  }
  update(newProps = {}) {
    Object.assign(this.props, newProps); this.onBeforeUpdate();
    this._output = this.render(); this._renderCount++;
    for (const child of this.children) child.update();
    this.onUpdated(); return this;
  }
  unmount() {
    for (const child of [...this.children]) child.unmount();
    this.onUnmounted(); this._mounted = false; return this;
  }
  onBeforeMount() {} onMounted() {} onBeforeUpdate() {} onUpdated() {} onUnmounted() {}
  render() { return `<${this.name}/>`; }
  toTree(indent = 0) {
    const pad = "  ".repeat(indent);
    let result = `${pad}${this._output}`;
    for (const child of this.children) result += "\n" + child.toTree(indent + 1);
    return result;
  }
}

// ────────────────────────────────────────────────────────────
//  SECTION 3 — Concrete Components (Swiggy Dashboard)
// ────────────────────────────────────────────────────────────
class RestaurantDashboard extends Component {
  render() { return `<Dashboard restaurant="${this.props.restaurant || "SwiggyDashboard"}">`; }
  onMounted() { this._log = ["RestaurantDashboard mounted"]; }
}
class RestaurantHeader extends Component {
  render() { return `<RestaurantHeader text="${this.props.text || ""}">`; }
}
class OrderList extends Component {
  render() { return `<OrderList count=${(this.props.orders || []).length}>`; }
}
class OrderCard extends Component {
  render() { const status = this.props.status || "Placed"; return `<OrderCard [${status}] "${this.props.item}">`; }
}
class DeliveryTracker extends Component {
  render() { return `<DeliveryTracker text="${this.props.text || ""}">`; }
}

// ────────────────────────────────────────────────────────────
//  SECTION 4 — Component Decorators
// ────────────────────────────────────────────────────────────
// WHY: Decorators add behavior (logging, memoization) without modifying source.
function withLogging(component) {
  const origMount = component.mount.bind(component);
  const origUpdate = component.update.bind(component);
  component._logs = [];
  component.mount = (...args) => { component._logs.push(`[LOG] ${component.name} mounting`); return origMount(...args); };
  component.update = (...args) => { component._logs.push(`[LOG] ${component.name} updating`); return origUpdate(...args); };
  return component;
}
function withMemo(component) {
  let lastPropsJson = null;
  const origUpdate = component.update.bind(component);
  component._skipped = 0;
  component.update = (newProps = {}) => {
    const nextJson = JSON.stringify({ ...component.props, ...newProps });
    if (nextJson === lastPropsJson) { component._skipped++; return component; }
    lastPropsJson = nextJson; return origUpdate(newProps);
  };
  return component;
}

// ────────────────────────────────────────────────────────────
//  SECTION 5 — Centralized State Store (Order State)
// ────────────────────────────────────────────────────────────
// WHY: A single store holds order state. Components subscribe
//      and re-render automatically when state changes.
class Store {
  constructor(initial) { this._reactive = new ReactiveState(initial); this._connected = new Map(); }
  get state() { return this._reactive.state; }
  connect(component, mapStateFn) {
    const unsub = this._reactive.subscribe(() => { component.update(mapStateFn(this._reactive.state)); });
    this._connected.set(component.name, component);
    Object.assign(component.props, mapStateFn(this._reactive.state));
    return unsub;
  }
  batch(fn) { this._reactive.batch(fn); }
  dispatch(action, payload) {
    if (action === "ADD_ORDER") {
      const orders = this._reactive.state.orders || [];
      orders.push({ item: payload.item, status: "Placed", price: payload.price });
      this._reactive.state.orders = [...orders];
    } else if (action === "UPDATE_STATUS") {
      const orders = this._reactive.state.orders || [];
      if (orders[payload.index]) { orders[payload.index].status = payload.status; this._reactive.state.orders = [...orders]; }
    } else if (action === "SET_RESTAURANT") {
      this._reactive.state.restaurant = payload.restaurant;
    }
  }
}

// ════════════════════════════════════════════════════════════
//  DEMO — All patterns working together
// ════════════════════════════════════════════════════════════
console.log("=== SwiggyDashboard: Capstone Reactive UI Framework ===\n");

// --- 1. Build the component tree (Composite) ---
console.log("--- Building Component Tree ---");
const app = new RestaurantDashboard("Dashboard", { restaurant: "Meghana's Biryani" });
const header = new RestaurantHeader("RestaurantHeader", { text: "Welcome to Swiggy Dashboard" });
const orderList = new OrderList("OrderList", { orders: [] });
const tracker = new DeliveryTracker("DeliveryTracker", { text: "Powered by Swiggy Delivery" });
app.addChild(header); app.addChild(orderList); app.addChild(tracker);
// WHY: Composite — mount() cascades to all children automatically.
app.mount();
console.log("Tree after mount:");
console.log(app.toTree());
// Output: <Dashboard restaurant="Meghana's Biryani">
// Output:   <RestaurantHeader text="Welcome to Swiggy Dashboard">
// Output:   <OrderList count=0>
// Output:   <DeliveryTracker text="Powered by Swiggy Delivery">
console.log("Dashboard mounted:", app._mounted);   // Output: Dashboard mounted: true
console.log("Header mounted:", header._mounted);    // Output: Header mounted: true

// --- 2. Decorators (Logging + Memoization) ---
console.log("\n--- Decorators: Logging & Memoization ---");
withLogging(header);
withMemo(tracker);
header.update({ text: "Updated Restaurant Header" });
console.log("Header log:", header._logs.join(", ")); // Output: Header log: [LOG] RestaurantHeader updating
// WHY: Memoized tracker skips re-render when props haven't changed.
tracker.update({ text: "Powered by Swiggy Delivery" }); // same props — first call caches
tracker.update({ text: "Powered by Swiggy Delivery" }); // same props — skipped
console.log("Tracker skipped renders:", tracker._skipped); // Output: Tracker skipped renders: 1
tracker.update({ text: "Ravi is on the way" }); // different props — re-renders
console.log("Tracker render count:", tracker._renderCount); // Output: Tracker render count: 3

// --- 3. Reactive state store ---
console.log("\n--- Reactive State Store ---");
const store = new Store({ restaurant: "Meghana's Biryani", orders: [] });
const changeLog = [];
store._reactive.subscribe((change) => { changeLog.push(change.prop); });

// --- 4. Connect components to store ---
store.connect(orderList, (state) => ({ orders: state.orders || [] }));
store.connect(header, (state) => ({ text: state.restaurant || "" }));

// --- 5. Dispatch actions ---
console.log("\n--- Dispatching Actions ---");
store.dispatch("ADD_ORDER", { item: "Hyderabadi Biryani", price: 350 });
store.dispatch("ADD_ORDER", { item: "Masala Dosa", price: 120 });
store.dispatch("ADD_ORDER", { item: "Filter Coffee", price: 60 });
console.log("Orders after adds:", store.state.orders.length); // Output: Orders after adds: 3
// WHY: OrderList auto-updated via store connection.
console.log("OrderList render count:", orderList._renderCount); // Output: OrderList render count: 4

// Add OrderCard children dynamically
orderList.children = [];
store.state.orders.forEach((o, i) => {
  const card = new OrderCard(`OrderCard-${i}`, { item: o.item, status: o.status });
  orderList.addChild(card); card.mount();
});
console.log("\nTree with order cards:");
console.log(app.toTree());
// Output: <Dashboard restaurant="Meghana's Biryani">
// Output:   <RestaurantHeader text="Meghana's Biryani">
// Output:   <OrderList count=3>
// Output:     <OrderCard [Placed] "Hyderabadi Biryani">
// Output:     <OrderCard [Placed] "Masala Dosa">
// Output:     <OrderCard [Placed] "Filter Coffee">
// Output:   <DeliveryTracker text="Ravi is on the way">

// --- 6. Update order status ---
console.log("\n--- Updating Order Status ---");
store.dispatch("UPDATE_STATUS", { index: 0, status: "Preparing" });
orderList.children = [];
store.state.orders.forEach((o, i) => {
  const card = new OrderCard(`OrderCard-${i}`, { item: o.item, status: o.status });
  orderList.addChild(card); card.mount();
});
console.log("Order 0 status:", store.state.orders[0].status); // Output: Order 0 status: Preparing
console.log("Order 1 status:", store.state.orders[1].status); // Output: Order 1 status: Placed
console.log("\nTree after status update:");
console.log(app.toTree());
// Output: <Dashboard restaurant="Meghana's Biryani">
// Output:   <RestaurantHeader text="Meghana's Biryani">
// Output:   <OrderList count=3>
// Output:     <OrderCard [Preparing] "Hyderabadi Biryani">
// Output:     <OrderCard [Placed] "Masala Dosa">
// Output:     <OrderCard [Placed] "Filter Coffee">
// Output:   <DeliveryTracker text="Ravi is on the way">

// --- 7. Batch updates ---
console.log("\n--- Batch State Updates ---");
const notifyCountBefore = changeLog.length;
store.batch((state) => {
  state.restaurant = "MTR - Mavalli Tiffin Rooms";
  state.orders = [...state.orders, { item: "Rava Idli", status: "Placed", price: 90 }];
});
const batchNotifications = changeLog.length - notifyCountBefore;
console.log("Notifications from batch:", batchNotifications); // Output: Notifications from batch: 1
console.log("Total orders:", store.state.orders.length);       // Output: Total orders: 4

// --- 8. Unmount lifecycle ---
console.log("\n--- Unmount Lifecycle ---");
const unmountLog = [];
tracker.onUnmounted = function () { unmountLog.push(`${this.name} unmounted`); };
app.removeChild(tracker); tracker.unmount();
console.log("Unmount log:", unmountLog.join(", ")); // Output: Unmount log: DeliveryTracker unmounted
console.log("Tracker mounted:", tracker._mounted);   // Output: Tracker mounted: false
console.log("Dashboard children:", app.children.length); // Output: Dashboard children: 2

// --- 9. Proxy reactivity proof ---
console.log("\n--- Proxy Reactivity Proof ---");
const miniStore = new ReactiveState({ activeOrders: 0 });
const reactions = [];
miniStore.subscribe((change) => { reactions.push(`${change.prop}: ${change.old} -> ${change.value}`); });
miniStore.state.activeOrders = 1;
miniStore.state.activeOrders = 2;
miniStore.state.activeOrders = 2; // same value — no notification
console.log("Reactions:", reactions.join(", ")); // Output: Reactions: activeOrders: 0 -> 1, activeOrders: 1 -> 2
console.log("Reaction count:", reactions.length); // Output: Reaction count: 2

// ────────────────────────────────────────────────────────────
//  KEY TAKEAWAYS
// ────────────────────────────────────────────────────────────
// 1. Composite pattern lets you treat individual components and
//    deep trees with the same mount/update/unmount API.
// 2. Proxy-based reactivity intercepts mutations and auto-notifies
//    subscribers — the same approach Vue 3 uses under the hood.
// 3. Template Method defines the lifecycle skeleton; subclasses
//    override hooks, not the flow.
// 4. Decorators (withLogging, withMemo) add cross-cutting behavior
//    without touching the component's own code.
// 5. A centralized Store + connect() lets any component subscribe
//    to only the state it needs.
// 6. Batch updates group mutations into a single notification,
//    preventing wasteful cascading re-renders.
// 7. The SwiggyDashboard proves that the patterns behind React,
//    Vue, and Svelte are composable building blocks — here tracking
//    live orders from Meghana's Biryani to MTR in real time.
console.log("\nSwiggyDashboard complete. Live orders are flowing!");
// Output: SwiggyDashboard complete. Live orders are flowing!
