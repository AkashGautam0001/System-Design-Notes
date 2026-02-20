/**
 * ============================================================
 *  FILE 12 : The Composite Pattern
 *  Topic   : Composite, Tree Structure
 *  WHY THIS MATTERS:
 *    When individual objects and groups of objects must be treated
 *    the same way, the Composite pattern lets you build recursive
 *    tree structures with a uniform interface. Calling an
 *    operation on a branch automatically fans it out to every
 *    leaf underneath.
 * ============================================================
 */

// STORY: Colonel Chauhan commands an Indian Army brigade. A single
// jawan and an entire battalion both respond to the same orders —
// "report strength", "march forward", "hold position". Colonel
// Chauhan never cares whether he is addressing one jawan or a
// thousand.

// ────────────────────────────────────────────────────────────
// BLOCK 1 — File System Tree
// ────────────────────────────────────────────────────────────

// WHY: Files and Directories share a common interface (getSize,
// print). A Directory delegates to its children recursively.

class File {
  constructor(name, size) {
    this.name = name;
    this.size = size;
  }

  getSize() {
    return this.size;
  }

  print(indent = "") {
    return `${indent}File: ${this.name} (${this.size}KB)`;
  }
}

class Directory {
  constructor(name) {
    this.name = name;
    this.children = [];
  }

  add(child) {
    this.children.push(child);
    return this;
  }

  remove(child) {
    this.children = this.children.filter((c) => c !== child);
    return this;
  }

  // WHY: getSize recurses into every child — same interface as File.
  getSize() {
    return this.children.reduce((sum, child) => sum + child.getSize(), 0);
  }

  print(indent = "") {
    const lines = [`${indent}Dir: ${this.name}/`];
    this.children.forEach((child) => {
      lines.push(child.print(indent + "  "));
    });
    return lines.join("\n");
  }
}

console.log("=== BLOCK 1: File System Tree ===");
const src = new Directory("src");
const utils = new Directory("utils");
utils.add(new File("helpers.js", 12));
utils.add(new File("logger.js", 8));
src.add(new File("index.js", 25));
src.add(utils);

console.log(src.print());
// Output: Dir: src/
// Output:   File: index.js (25KB)
// Output:   Dir: utils/
// Output:     File: helpers.js (12KB)
// Output:     File: logger.js (8KB)

console.log(`Total size: ${src.getSize()}KB`); // Output: Total size: 45KB

// ────────────────────────────────────────────────────────────
// BLOCK 2 — UI Component Tree
// ────────────────────────────────────────────────────────────

// WHY: A React-like component tree needs render(), addChild(),
// and removeChild(). Both leaf and container components share
// the same interface — exactly the Composite pattern.

class UIComponent {
  constructor(tag, text) {
    this.tag = tag;
    this.text = text || "";
    this.children = [];
  }

  addChild(child) {
    this.children.push(child);
    return this;
  }

  removeChild(child) {
    this.children = this.children.filter((c) => c !== child);
    return this;
  }

  render(depth = 0) {
    const pad = "  ".repeat(depth);
    const lines = [];
    if (this.children.length === 0) {
      lines.push(`${pad}<${this.tag}>${this.text}</${this.tag}>`);
    } else {
      lines.push(`${pad}<${this.tag}>`);
      this.children.forEach((c) => {
        lines.push(c.render(depth + 1));
      });
      lines.push(`${pad}</${this.tag}>`);
    }
    return lines.join("\n");
  }
}

console.log("\n=== BLOCK 2: UI Component Tree ===");
// WHY: Colonel Chauhan's brigade has hierarchy — just like nested UI.
const page = new UIComponent("div");
const header = new UIComponent("header");
header.addChild(new UIComponent("h1", "Chauhan Brigade HQ"));
const nav = new UIComponent("nav");
nav.addChild(new UIComponent("a", "Dashboard"));
nav.addChild(new UIComponent("a", "Jawans"));
header.addChild(nav);
page.addChild(header);
page.addChild(new UIComponent("p", "Welcome, Colonel Chauhan"));

console.log(page.render());
// Output: <div>
// Output:   <header>
// Output:     <h1>Chauhan Brigade HQ</h1>
// Output:     <nav>
// Output:       <a>Dashboard</a>
// Output:       <a>Jawans</a>
// Output:     </nav>
// Output:   </header>
// Output:   <p>Welcome, Colonel Chauhan</p>
// Output: </div>

// Demonstrate removeChild
nav.removeChild(nav.children[1]); // remove "Jawans"
console.log(`Nav children after removal: ${nav.children.length}`); // Output: Nav children after removal: 1

// ────────────────────────────────────────────────────────────
// BLOCK 3 — Mess System with Nested Submenus
// ────────────────────────────────────────────────────────────

// WHY: Army mess halls or canteen menus have items and submenus.
// The Composite lets us call display() or countItems() on any node
// and it fans out recursively.

class MenuItem {
  constructor(name, price) {
    this.name = name;
    this.price = price;
  }

  display(indent = "") {
    return `${indent}${this.name} — ₹${this.price.toFixed(2)}`;
  }

  countItems() {
    return 1;
  }
}

class SubMenu {
  constructor(title) {
    this.title = title;
    this.items = [];
  }

  add(item) {
    this.items.push(item);
    return this;
  }

  display(indent = "") {
    const lines = [`${indent}[${this.title}]`];
    this.items.forEach((item) => {
      lines.push(item.display(indent + "  "));
    });
    return lines.join("\n");
  }

  // WHY: countItems recurses — SubMenu and MenuItem share the
  // same interface so Colonel Chauhan can count jawans at any level.
  countItems() {
    return this.items.reduce((sum, item) => sum + item.countItems(), 0);
  }
}

console.log("\n=== BLOCK 3: Mess System with Nested Submenus ===");
const mainMenu = new SubMenu("Chauhan Brigade Mess Hall");

const breakfast = new SubMenu("Breakfast");
breakfast.add(new MenuItem("Aloo Paratha & Dahi", 45.00));
breakfast.add(new MenuItem("Poha", 25.00));

const drinks = new SubMenu("Drinks");
drinks.add(new MenuItem("Masala Chai", 15.00));
drinks.add(new MenuItem("Nimbu Pani", 10.00));

breakfast.add(drinks); // nested submenu inside breakfast

const dinner = new SubMenu("Dinner");
dinner.add(new MenuItem("Mutton Curry & Roti", 120.00));
dinner.add(new MenuItem("Rajma Chawal", 60.00));

mainMenu.add(breakfast);
mainMenu.add(dinner);

console.log(mainMenu.display());
// Output: [Chauhan Brigade Mess Hall]
// Output:   [Breakfast]
// Output:     Aloo Paratha & Dahi — ₹45.00
// Output:     Poha — ₹25.00
// Output:     [Drinks]
// Output:       Masala Chai — ₹15.00
// Output:       Nimbu Pani — ₹10.00
// Output:   [Dinner]
// Output:     Mutton Curry & Roti — ₹120.00
// Output:     Rajma Chawal — ₹60.00

console.log(`Total menu items: ${mainMenu.countItems()}`); // Output: Total menu items: 6

// ────────────────────────────────────────────────────────────
// KEY TAKEAWAYS
// ────────────────────────────────────────────────────────────
// 1. Composite lets you treat individual objects and groups
//    through the same interface (add, remove, operation).
// 2. Recursive delegation makes operations fan out to every leaf.
// 3. Common uses: file systems, UI component trees, org charts,
//    menus, and — like Colonel Chauhan — military hierarchies.
// 4. The pattern simplifies client code: no if/else to check
//    whether something is a leaf or a branch.
// 5. Add new component types without changing existing code.
