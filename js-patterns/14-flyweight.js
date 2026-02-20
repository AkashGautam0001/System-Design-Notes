/**
 * ============================================================
 *  FILE 14 : The Flyweight Pattern
 *  Topic   : Flyweight, Shared State Optimization
 *  WHY THIS MATTERS:
 *    When your app creates thousands (or millions) of similar
 *    objects, memory balloons. The Flyweight pattern splits
 *    object state into *intrinsic* (shared, immutable) and
 *    *extrinsic* (unique, per-instance) parts, then shares the
 *    intrinsic part so memory stays flat.
 * ============================================================
 */

// STORY: Compositor Ravi ji runs the press room at Dainik Jagran.
// Instead of casting a fresh Devanagari letter block for every
// akshara on every page, Ravi ji casts ONE block per akshara and
// reuses it across the entire press. Thousands of pages, only a
// few hundred metal type blocks.

// ────────────────────────────────────────────────────────────
// BLOCK 1 — Classic Flyweight (shared formatting objects)
// ────────────────────────────────────────────────────────────

// WHY: A newspaper page may have 10,000 aksharas but only a handful
// of unique formatting combos (typeface + size + color). We share
// those combos instead of duplicating them per character.

class AksharaStyle {
  constructor(typeface, size, color) {
    this.typeface = typeface;
    this.size = size;
    this.color = color;
  }

  apply(char, row, col) {
    return `'${char}' at (${row},${col}) [${this.typeface} ${this.size}px ${this.color}]`;
  }
}

// WHY: The factory ensures only one instance per unique combo.
class StyleFactory {
  constructor() {
    this.cache = new Map();
  }

  getStyle(typeface, size, color) {
    const key = `${typeface}-${size}-${color}`;
    if (!this.cache.has(key)) {
      this.cache.set(key, new AksharaStyle(typeface, size, color));
    }
    return this.cache.get(key);
  }

  get count() {
    return this.cache.size;
  }
}

console.log("=== BLOCK 1: Classic Flyweight ===");
const factory = new StyleFactory();

// WHY: Extrinsic state (char, row, col) stays outside the
// flyweight. Intrinsic state (typeface, size, color) is shared.
const chars = [
  { char: "\u0905", row: 0, col: 0, typeface: "Mangal", size: 12, color: "black" },
  { char: "\u0906", row: 0, col: 1, typeface: "Mangal", size: 12, color: "black" },
  { char: "\u0915", row: 0, col: 2, typeface: "Mangal", size: 12, color: "black" },
  { char: "\u0916", row: 0, col: 3, typeface: "Krutidev", size: 16, color: "red" },
  { char: "\u0917", row: 1, col: 0, typeface: "Mangal", size: 12, color: "black" },
  { char: "\u0918", row: 1, col: 1, typeface: "Krutidev", size: 16, color: "red" },
];

const rendered = chars.map((c) => {
  const style = factory.getStyle(c.typeface, c.size, c.color);
  return style.apply(c.char, c.row, c.col);
});

rendered.forEach((r) => console.log(r));
// Output: 'अ' at (0,0) [Mangal 12px black]
// Output: 'आ' at (0,1) [Mangal 12px black]
// Output: 'क' at (0,2) [Mangal 12px black]
// Output: 'ख' at (0,3) [Krutidev 16px red]
// Output: 'ग' at (1,0) [Mangal 12px black]
// Output: 'घ' at (1,1) [Krutidev 16px red]

console.log(`Aksharas rendered: ${chars.length}`); // Output: Aksharas rendered: 6
console.log(`Style objects created: ${factory.count}`); // Output: Style objects created: 2

// ────────────────────────────────────────────────────────────
// BLOCK 2 — Newspaper Page Flyweight
// ────────────────────────────────────────────────────────────

// WHY: A newspaper may have 10,000 aksharas on a page. Each akshara
// shares a heavy metal block (intrinsic) but has unique row, col,
// emphasis (extrinsic). Ravi ji's principle: one carved block, many prints.

class DevanagariBlock {
  constructor(akshara, blockData) {
    this.akshara = akshara;
    this.blockData = blockData;
  }
}

class BlockFactory {
  constructor() { this.blocks = new Map(); }
  getBlock(akshara) {
    if (!this.blocks.has(akshara)) {
      this.blocks.set(akshara, new DevanagariBlock(akshara, `BLOCK_${akshara}_${"x".repeat(100)}`));
    }
    return this.blocks.get(akshara);
  }
  get count() { return this.blocks.size; }
}

class PrintedChar {
  constructor(row, col, emphasis, block) {
    this.row = row; this.col = col; this.emphasis = emphasis;
    this.block = block;
  }
  render() { return `${this.block.akshara} at (${this.row},${this.col}) emphasis=${this.emphasis}`; }
}

console.log("\n=== BLOCK 2: Newspaper Page Flyweight ===");
const blockFactory = new BlockFactory();
const printedChars = [];

// WHY: 1000 aksharas on a page but only 3 unique block objects.
const aksharaTypes = ["\u0905", "\u0915", "\u092E"];
for (let i = 0; i < 1000; i++) {
  const akshara = aksharaTypes[i % 3];
  const block = blockFactory.getBlock(akshara);
  printedChars.push(new PrintedChar(
    Math.floor(Math.random() * 80),
    Math.floor(Math.random() * 60),
    +(0.5 + Math.random() * 1.5).toFixed(1),
    block
  ));
}

console.log(`Total aksharas printed: ${printedChars.length}`); // Output: Total aksharas printed: 1000
console.log(`Block objects in memory: ${blockFactory.count}`); // Output: Block objects in memory: 3

// Show first 3 printed aksharas to prove they work
console.log(printedChars[0].render()); // Output varies (random positions)
console.log(printedChars[1].render()); // Output varies (random positions)
console.log(printedChars[2].render()); // Output varies (random positions)

// WHY: Memory comparison shows the saving.
const withoutFlyweight = 1000; // 1000 separate block objects
const withFlyweight = blockFactory.count; // only 3
console.log(`Without flyweight: ${withoutFlyweight} block allocations`); // Output: Without flyweight: 1000 block allocations
console.log(`With flyweight: ${withFlyweight} block allocations`);       // Output: With flyweight: 3 block allocations
console.log(`Memory saved: ${((1 - withFlyweight / withoutFlyweight) * 100).toFixed(1)}%`); // Output: Memory saved: 99.7%

// ────────────────────────────────────────────────────────────
// BLOCK 3 — Flyweight with Factory & Memory Comparison
// ────────────────────────────────────────────────────────────

// WHY: A concrete memory comparison proves the Flyweight's
// value. We create objects with and without sharing and compare
// the counts.

class AksharaFlyweight {
  constructor(name, svgPath) { this.name = name; this.svgPath = svgPath; }
}

class AksharaFactory {
  constructor() { this.pool = new Map(); this.requestCount = 0; }
  getAkshara(name) {
    this.requestCount++;
    if (!this.pool.has(name)) {
      this.pool.set(name, new AksharaFlyweight(name, `M0 0 L10 10 Z /* ${name} ${"#".repeat(50)} */`));
    }
    return this.pool.get(name);
  }
  report() {
    return { uniqueBlocks: this.pool.size, totalRequests: this.requestCount,
      savedAllocations: this.requestCount - this.pool.size };
  }
}

class Stamp {
  constructor(label, row, col, aksharaFactory) {
    this.label = label;
    this.row = row;
    this.col = col;
    this.akshara = aksharaFactory.getAkshara(label.split(" ")[0].toLowerCase());
  }

  render() {
    return `[${this.akshara.name}] ${this.label} at (${this.row},${this.col})`;
  }
}

console.log("\n=== BLOCK 3: Flyweight Factory & Memory Comparison ===");
const aksharaPool = new AksharaFactory();

// WHY: Ravi ji stamps hundreds of positions but only a few akshara types.
const stamps = [
  new Stamp("ka Headline",    10, 10, aksharaPool),
  new Stamp("ka Subhead",     10, 40, aksharaPool),
  new Stamp("ka Byline",      10, 70, aksharaPool),
  new Stamp("ga Column",      80, 10, aksharaPool),
  new Stamp("ga Footer",      80, 40, aksharaPool),
  new Stamp("ma Masthead",   150, 10, aksharaPool),
  new Stamp("ma Dateline",   150, 40, aksharaPool),
  new Stamp("ma Sidebar",    150, 70, aksharaPool),
  new Stamp("ka Caption",     10,100, aksharaPool),
  new Stamp("ga Pullquote",   80, 70, aksharaPool),
];

stamps.forEach((s) => console.log(s.render()));
// Output: [ka] ka Headline at (10,10)
// Output: [ka] ka Subhead at (10,40)
// Output: [ka] ka Byline at (10,70)
// Output: [ga] ga Column at (80,10)
// Output: [ga] ga Footer at (80,40)
// Output: [ma] ma Masthead at (150,10)
// Output: [ma] ma Dateline at (150,40)
// Output: [ma] ma Sidebar at (150,70)
// Output: [ka] ka Caption at (10,100)
// Output: [ga] ga Pullquote at (80,70)

const report = aksharaPool.report();
console.log(`Total block requests: ${report.totalRequests}`);     // Output: Total block requests: 10
console.log(`Unique block objects: ${report.uniqueBlocks}`);       // Output: Unique block objects: 3
console.log(`Saved allocations: ${report.savedAllocations}`);      // Output: Saved allocations: 7

// WHY: Final proof — same reference check confirms sharing.
const block1 = aksharaPool.getAkshara("ka");
const block2 = aksharaPool.getAkshara("ka");
console.log(`Same reference? ${block1 === block2}`); // Output: Same reference? true

// ────────────────────────────────────────────────────────────
// KEY TAKEAWAYS
// ────────────────────────────────────────────────────────────
// 1. Flyweight splits state into intrinsic (shared) and
//    extrinsic (unique per context) parts.
// 2. A Factory (pool) ensures only one flyweight per unique
//    intrinsic combination.
// 3. Massive memory savings when thousands of objects share
//    common heavy data (metal blocks, typefaces, formatting).
// 4. The caller passes extrinsic state at call time — the
//    flyweight itself stays immutable and shared.
// 5. Ravi ji's press room: one carved Devanagari block serves
//    every page of Dainik Jagran.
