/**
 * ============================================================
 *  FILE 27: Class Inheritance (extends & super)
 * ============================================================
 *  Topic: Building class hierarchies with extends, calling
 *         parent constructors/methods with super, and
 *         composing behavior with mixins.
 *
 *  Why it matters: Inheritance lets you build specialized
 *  classes on top of general ones without duplicating code.
 *  It's used everywhere — from DOM elements to Express error
 *  classes to ORM models. Knowing when to use it (and when
 *  NOT to) is a core design skill.
 * ============================================================
 *
 *  STORY: The Indian Government Service Hierarchy. All officers
 *  share a common base (the SarkariNaukri class). Over time,
 *  services branch out: CivilServant adds administration,
 *  IAS adds district management, IPS adds law enforcement
 *  powers. Each child extends its parent, overriding and adding
 *  abilities as it specializes.
 * ============================================================
 */

// ============================================================
//  EXAMPLE 1 — The Government Service Hierarchy
// ============================================================

// WHY: `extends` sets up the prototype chain so a child class
// inherits all methods and properties from the parent.
// `super()` calls the parent constructor so the parent's
// initialization logic still runs.

// ----- Base ancestor: SarkariNaukri -----
class SarkariNaukri {
  constructor(name, service) {
    this.name = name;
    this.service = service;
    this.active = true;
  }

  describe() {
    return `${this.name} is a ${this.service}`;
  }

  attendTraining(course) {
    return `${this.name} attends ${course}`;
  }
}

// ----- First specialization: CivilServant -----
class CivilServant extends SarkariNaukri {
  constructor(name, service, cadre) {
    // super() MUST be called before accessing `this` in a subclass.
    super(name, service);
    this.cadre = cadre;
  }

  // New method specific to civil servants
  administerDistrict() {
    return `${this.name} administers the ${this.cadre} cadre`;
  }

  // Override parent's describe() — method overriding
  describe() {
    // Use super.method() to call the parent's version
    return `${super.describe()} with ${this.cadre} cadre`;
  }
}

// ----- Second specialization: IAS -----
class IAS extends CivilServant {
  constructor(name, cadre, postingState) {
    super(name, "IAS Officer", cadre);
    this.postingState = postingState;
  }

  postingLocation() {
    return `${this.name} is posted in ${this.postingState}`;
  }

  describe() {
    return `${super.describe()} and posted in ${this.postingState}`;
  }
}

// ----- Third specialization: IPS -----
class IPS extends IAS {
  constructor(name, cadre, postingState, specialUnit) {
    super(name, cadre, postingState);
    this.specialUnit = specialUnit;
    this.service = "IPS Officer";
    this.carriesWeapon = true;
  }

  enforceOrder() {
    return `${this.name} enforces law and order with ${this.specialUnit}!`;
  }

  patrolArea() {
    return `${this.name} patrols the streets of ${this.postingState}!`;
  }

  // Override attendTraining from the base SarkariNaukri class
  attendTraining(course) {
    return `${super.attendTraining(course)}... then practices at the ${this.specialUnit} range first!`;
  }
}

console.log("--- The Government Service Hierarchy ---");

const collector = new IAS("Sharma Ji", "UP", "Uttar Pradesh");
console.log(collector.describe());
// Output: Sharma Ji is a IAS Officer with UP cadre and posted in Uttar Pradesh

console.log(collector.administerDistrict());
// Output: Sharma Ji administers the UP cadre

console.log(collector.attendTraining("LBSNAA Foundation Course"));
// Output: Sharma Ji attends LBSNAA Foundation Course

console.log(collector.postingLocation());
// Output: Sharma Ji is posted in Uttar Pradesh

const commissioner = new IPS("Singh Sahab", "Maharashtra", "Mumbai", "Anti-Terror Squad");
console.log("\n" + commissioner.describe());
// Output: Singh Sahab is a IPS Officer with Maharashtra cadre and posted in Mumbai

console.log(commissioner.enforceOrder());
// Output: Singh Sahab enforces law and order with Anti-Terror Squad!

console.log(commissioner.patrolArea());
// Output: Singh Sahab patrols the streets of Mumbai!

console.log(commissioner.attendTraining("CBI Special Ops Course"));
// Output: Singh Sahab attends CBI Special Ops Course... then practices at the Anti-Terror Squad range first!

console.log(commissioner.administerDistrict());
// Output: Singh Sahab administers the Maharashtra cadre

// ----- instanceof and constructor checks -----
console.log("\n--- instanceof checks ---");
console.log(commissioner instanceof IPS);          // Output: true
console.log(commissioner instanceof IAS);           // Output: true
console.log(commissioner instanceof CivilServant);  // Output: true
console.log(commissioner instanceof SarkariNaukri); // Output: true
console.log(collector instanceof IPS);              // Output: false

console.log("\n--- constructor check ---");
console.log(commissioner.constructor === IPS);          // Output: true
console.log(commissioner.constructor === SarkariNaukri); // Output: false

// ----- The prototype chain -----
console.log("\n--- Prototype chain ---");
console.log(Object.getPrototypeOf(IPS.prototype) === IAS.prototype);
// Output: true
console.log(Object.getPrototypeOf(IAS.prototype) === CivilServant.prototype);
// Output: true
console.log(Object.getPrototypeOf(CivilServant.prototype) === SarkariNaukri.prototype);
// Output: true
console.log(Object.getPrototypeOf(SarkariNaukri.prototype) === Object.prototype);
// Output: true


// ============================================================
//  EXAMPLE 2 — Mixins: Composing Abilities
// ============================================================

// WHY: JavaScript only supports single inheritance (one parent
// class). Mixins are a pattern that lets you "mix in" methods
// from multiple sources — like giving an officer both diplomatic
// and investigative abilities without a rigid class hierarchy.

console.log("\n--- Mixins Pattern ---");

// Mixin: a plain object (or function) with methods to copy
const DiplomaticSkill = (Base) =>
  class extends Base {
    negotiate() {
      return `${this.name} negotiates a bilateral treaty with grace`;
    }
  };

const InvestigativeSkill = (Base) =>
  class extends Base {
    investigate() {
      return `${this.name} launches a high-profile investigation!`;
    }
  };

const CyberSkill = (Base) =>
  class extends Base {
    traceOnline(target) {
      return `${this.name} traces ${target} through digital forensics`;
    }
  };

// An IFS officer can negotiate AND investigate
class IFS extends CyberSkill(DiplomaticSkill(SarkariNaukri)) {
  constructor(name) {
    super(name, "IFS Officer");
  }
}

// A CBI officer can investigate AND has cyber skills
class CBIOfficer extends CyberSkill(InvestigativeSkill(SarkariNaukri)) {
  constructor(name) {
    super(name, "CBI Officer");
  }
}

const ambassador = new IFS("Mehra Ji");
console.log(ambassador.describe());
// Output: Mehra Ji is a IFS Officer

console.log(ambassador.negotiate());
// Output: Mehra Ji negotiates a bilateral treaty with grace

console.log(ambassador.traceOnline("a foreign intelligence network"));
// Output: Mehra Ji traces a foreign intelligence network through digital forensics

const detective = new CBIOfficer("Rathore Sahab");
console.log("\n" + detective.describe());
// Output: Rathore Sahab is a CBI Officer

console.log(detective.investigate());
// Output: Rathore Sahab launches a high-profile investigation!

console.log(detective.traceOnline("the money trail"));
// Output: Rathore Sahab traces the money trail through digital forensics

// instanceof still works through the mixin chain
console.log("\n--- Mixin instanceof ---");
console.log(ambassador instanceof SarkariNaukri);  // Output: true
console.log(ambassador instanceof IFS);            // Output: true
console.log(detective instanceof SarkariNaukri);   // Output: true

// ----- When NOT to use inheritance -----
//
// "Favor composition over inheritance" is a famous design principle.
//
// Use inheritance when: there's a genuine "is-a" relationship
//   (an IPS officer IS a CivilServant IS a SarkariNaukri).
//
// Prefer composition/mixins when: you need shared behavior
//   across unrelated classes (diplomatic, investigative, cyber skills).
//
// Over-deep hierarchies (5+ levels) become brittle — hard to
// change the parent without breaking children.


// ============================================================
//  KEY TAKEAWAYS
// ============================================================
// 1. `extends` sets up prototypal inheritance between classes.
//    The child class gets all parent methods via the chain.
// 2. `super()` in the constructor calls the parent constructor.
//    It MUST be called before using `this` in a child class.
// 3. `super.method()` lets you call the parent version of an
//    overridden method — essential for extending behavior
//    rather than replacing it.
// 4. `instanceof` walks the whole prototype chain, so an IPS
//    officer is also an IAS, CivilServant, and SarkariNaukri.
// 5. JavaScript supports only single inheritance. Use the
//    mixin pattern (functions that return subclasses) to
//    compose behavior from multiple sources.
// 6. Favor composition over inheritance when the relationship
//    is "has-a" or "can-do" rather than "is-a".
// ============================================================
