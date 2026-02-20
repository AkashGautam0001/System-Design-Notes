/**
 * ============================================================
 *  FILE 32 : MVC, MVP, and MVVM Patterns
 *  Topic  : Model-View-Controller, Model-View-Presenter,
 *           Model-View-ViewModel
 *  WHY THIS MATTERS:
 *    Separating data (Model), display (View), and logic
 *    (Controller/Presenter/ViewModel) keeps UI code maintainable.
 *    Each variant shifts responsibility differently.
 * ============================================================
 */

// STORY: Director Rohit runs a Bollywood film set. The script is the
// Model, the camera/set is the View, and Rohit himself is the Controller /
// Presenter / ViewModel depending on the production style.

// ────────────────────────────────────────────────────────────
// BLOCK 1 — MVC (Model-View-Controller) — Scene List
// ────────────────────────────────────────────────────────────

// WHY: In MVC the Controller mediates user actions, updates the Model,
// and the View reads from the Model to render. The View can observe
// the Model directly.

class SceneModel {
  constructor() { this.scenes = []; this.listeners = []; }
  subscribe(fn) { this.listeners.push(fn); }
  notify() { this.listeners.forEach(fn => fn()); }
  add(dialogue) { this.scenes.push({ dialogue, shot: false }); this.notify(); }
  toggle(i) { this.scenes[i].shot = !this.scenes[i].shot; this.notify(); }
  getAll() { return [...this.scenes]; }
}

class CameraView {
  // WHY: The View only knows how to render — it pulls data from the Model
  render(scenes) {
    const lines = scenes.map((s, i) => `  ${i}. [${s.shot ? "x" : " "}] ${s.dialogue}`);
    return "Rohit's Camera (MVC View):\n" + (lines.length ? lines.join("\n") : "  (empty)");
  }
}

class DirectorController {
  constructor(model, view) {
    this.model = model;
    this.view = view;
    // WHY: Controller subscribes the View to Model changes
    model.subscribe(() => console.log(this.view.render(this.model.getAll())));
  }
  addScene(dialogue) { this.model.add(dialogue); }
  markShot(i) { this.model.toggle(i); }
}

console.log("=== MVC Pattern ==="); // Output: === MVC Pattern ===
const mvcModel = new SceneModel();
const mvcView = new CameraView();
const mvcCtrl = new DirectorController(mvcModel, mvcView);

mvcCtrl.addScene("Mere paas maa hai");
// Output: Rohit's Camera (MVC View):
// Output:   0. [ ] Mere paas maa hai

mvcCtrl.addScene("Mogambo khush hua");
// Output: Rohit's Camera (MVC View):
// Output:   0. [ ] Mere paas maa hai
// Output:   1. [ ] Mogambo khush hua

mvcCtrl.markShot(0);
// Output: Rohit's Camera (MVC View):
// Output:   0. [x] Mere paas maa hai
// Output:   1. [ ] Mogambo khush hua

// ────────────────────────────────────────────────────────────
// BLOCK 2 — MVP (Model-View-Presenter) — Passive View
// ────────────────────────────────────────────────────────────

// WHY: In MVP the View is "passive" — it has no logic. The Presenter
// fetches data from the Model and explicitly tells the View what to show.
// This makes the View trivially testable.

class CastModel {
  constructor() { this.actors = []; }
  add(name, role) { this.actors.push({ name, role }); }
  getAll() { return [...this.actors]; }
}

class MonitorView {
  // WHY: Passive view — it only displays what the Presenter pushes to it
  show(displayText) {
    console.log(displayText);
  }
}

class CastPresenter {
  constructor(model, view) {
    this.model = model;
    this.view = view;
  }
  addActor(name, role) {
    this.model.add(name, role);
    this.updateView();
  }
  updateView() {
    // WHY: All formatting logic lives here, NOT in the View
    const actors = this.model.getAll();
    const lines = actors.map(a => `  ${a.name} -> ${a.role}`);
    this.view.show("Rohit's Cast Board (MVP):\n" + lines.join("\n"));
  }
}

console.log("\n=== MVP Pattern ==="); // Output: === MVP Pattern ===
const mvpModel = new CastModel();
const mvpView = new MonitorView();
const presenter = new CastPresenter(mvpModel, mvpView);

presenter.addActor("Shah Rukh", "Raj");
// Output: Rohit's Cast Board (MVP):
// Output:   Shah Rukh -> Raj

presenter.addActor("Kajol", "Simran");
// Output: Rohit's Cast Board (MVP):
// Output:   Shah Rukh -> Raj
// Output:   Kajol -> Simran

// ────────────────────────────────────────────────────────────
// BLOCK 3 — MVVM (Model-View-ViewModel) — Two-way Binding
// ────────────────────────────────────────────────────────────

// WHY: In MVVM the ViewModel exposes observable state and computed
// properties. The View binds to them. Changes in the ViewModel auto-
// reflect in the View and vice-versa. This is how Vue and Angular work.

class TicketModel {
  constructor(price, qty) { this.price = price; this.qty = qty; }
}

class TicketViewModel {
  constructor(model) {
    this._price = model.price;
    this._qty = model.qty;
    this._bindings = [];
  }

  // WHY: Computed property — derived from reactive state
  get total() { return this._price * this._qty; }

  get price() { return this._price; }
  set price(v) { this._price = v; this._notifyView(); }

  get qty() { return this._qty; }
  set qty(v) { this._qty = v; this._notifyView(); }

  bind(renderFn) { this._bindings.push(renderFn); }

  _notifyView() {
    // WHY: Automatic push to all bound views — two-way data binding
    this._bindings.forEach(fn => fn(this));
  }
}

function teleprompterView(vm) {
  console.log(`Rohit's Teleprompter (MVVM): ${vm.qty} tickets @ \u20B9${vm.price} = \u20B9${vm.total}`);
}

console.log("\n=== MVVM Pattern ==="); // Output: === MVVM Pattern ===
const ticketData = new TicketModel(500, 4);
const vm = new TicketViewModel(ticketData);
vm.bind(teleprompterView);

// WHY: Setting a property triggers automatic re-render
vm.qty = 6;
// Output: Rohit's Teleprompter (MVVM): 6 tickets @ ₹500 = ₹3000

vm.price = 750;
// Output: Rohit's Teleprompter (MVVM): 6 tickets @ ₹750 = ₹4500

vm.qty = 10;
// Output: Rohit's Teleprompter (MVVM): 10 tickets @ ₹750 = ₹7500

// Rohit compares all three patterns
console.log("\n--- Pattern Comparison ---"); // Output: --- Pattern Comparison ---
console.log("MVC:  View observes Model, Controller mediates"); // Output: MVC:  View observes Model, Controller mediates
console.log("MVP:  Presenter owns all logic, View is passive"); // Output: MVP:  Presenter owns all logic, View is passive
console.log("MVVM: ViewModel exposes bindings, View auto-syncs"); // Output: MVVM: ViewModel exposes bindings, View auto-syncs

// ────────────────────────────────────────────────────────────
// KEY TAKEAWAYS
// ────────────────────────────────────────────────────────────
// 1. MVC: Controller (Director Rohit) handles input, Model (script) holds state, View (camera) renders.
// 2. MVP: Presenter does ALL logic; View (monitor) is a dumb display surface.
// 3. MVVM: ViewModel binds to View (teleprompter) reactively — Vue/Angular/Knockout style.
// 4. All three separate concerns; the difference is where logic lives.
// 5. Choose MVC for server-side, MVP for testable UIs, MVVM for reactive frameworks.
