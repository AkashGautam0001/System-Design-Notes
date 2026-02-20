// ============================================================
// FILE 18: FUNCTIONS
// Topic: Declaration styles, parameters, return values, IIFE,
//        first-class functions, arguments object, pure functions
// WHY: Functions are the fundamental unit of reusable logic in JS.
//      Understanding their many forms and behaviors is non-negotiable.
// ============================================================

// ============================================================
// EXAMPLE 1 — Amma's Masala Kitchen: Recipe Formats
// Story: Amma's kitchen has different recipe formats — each
// illustrates a different way to define and use functions.
// ============================================================

// WHY: JavaScript offers three main ways to define functions.
// Each has different hoisting, `this` binding, and syntax tradeoffs.

// --- Function Declaration ---
// Hoisted entirely — can be called BEFORE it appears in code.

console.log(cookDish("Jeera Rice", 3));
// Output: Cooking Jeera Rice (serves 3)... Dish ready!

function cookDish(dish, servings) {
  return `Cooking ${dish} (serves ${servings})... Dish ready!`;
}


// --- Function Expression ---
// NOT hoisted (only the variable declaration is hoisted with `var`).
// The function itself is assigned at runtime.

// console.log(prepareChutney("Mint")); // ReferenceError if using const/let

const prepareChutney = function (ingredient) {
  return `Grinding chutney with ${ingredient}... Chutney ready!`;
};

console.log(prepareChutney("Mint"));
// Output: Grinding chutney with Mint... Chutney ready!

// Named function expression — the name is only visible INSIDE the function
// (useful for recursion and stack traces)
const factorialRotis = function factorial(n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1); // `factorial` is accessible here
};
console.log("5! =", factorialRotis(5));
// Output: 5! = 120


// --- Arrow Function ---
// Concise syntax, no own `this`, no `arguments` object, not hoisted.

const grindMasala = (spice) => {
  return `Grinding masala with ${spice}...`;
};
console.log(grindMasala("Garam Masala"));
// Output: Grinding masala with Garam Masala...

// Implicit return — when the body is a single expression, omit { } and return
const labelDabba = (name) => `Dabba: ${name}`;
console.log(labelDabba("Mango Pickle"));
// Output: Dabba: Mango Pickle

// Implicit return of an object — wrap in parentheses
const createRecipe = (name, spiceLevel) => ({ name, spiceLevel, created: Date.now() });
console.log(createRecipe("Paneer Tikka", 7));
// Output: { name: 'Paneer Tikka', spiceLevel: 7, created: <timestamp> }


// WHY: Default parameters, rest params, and return values let you
// build flexible APIs without defensive boilerplate.

// --- Parameters: Default Values ---

function prepareIngredient(name, quantity = 2, unit = "tsp") {
  console.log(`Adding ${quantity} ${unit} of ${name}`);
}

prepareIngredient("Red Chilli Powder");
// Output: Adding 2 tsp of Red Chilli Powder
prepareIngredient("Ghee", 3, "tbsp");
// Output: Adding 3 tbsp of Ghee
prepareIngredient("Haldi", undefined, "pinch");
// Output: Adding 2 pinch of Haldi  (undefined triggers default)


// --- Rest Parameters ---

function makeTadka(dishName, ...toppings) {
  console.log(`${dishName} gets toppings: ${toppings.join(", ")}`);
  console.log(`Total toppings: ${toppings.length}`);
}

makeTadka("Dal Fry", "Cumin Seeds", "Curry Leaves", "Hing", "Dried Red Chilli");
// Output: Dal Fry gets toppings: Cumin Seeds, Curry Leaves, Hing, Dried Red Chilli
// Output: Total toppings: 4


// --- Return Values ---

// Returning multiple values via an object
function analyzeDish(name) {
  return {
    name,
    spiceLevel: Math.floor(Math.random() * 100),
    color: "golden yellow",
    isVeg: true,
  };
}

const analysis = analyzeDish("Chole Bhature");
console.log(analysis);
// Output: { name: 'Chole Bhature', spiceLevel: <0-99>, color: 'golden yellow', isVeg: true }

// Returning early for guard clauses
function validateRecipe(recipe) {
  if (!recipe) return "Error: No recipe provided";
  if (!recipe.name) return "Error: Recipe must have a name";
  if (recipe.ingredients.length === 0) return "Error: No ingredients";
  return `Recipe "${recipe.name}" is valid!`;
}

console.log(validateRecipe({ name: "Masala Chai", ingredients: ["Tea Leaves"] }));
// Output: Recipe "Masala Chai" is valid!
console.log(validateRecipe(null));
// Output: Error: No recipe provided


// ============================================================
// EXAMPLE 2 — Amma's Masala Kitchen: Advanced Techniques
// Story: The head cook uses advanced function patterns
// to automate the kitchen.
// ============================================================

// WHY: IIFE (Immediately Invoked Function Expression) creates a
// private scope — historically used for module patterns, still
// useful for one-time initialization.

// --- IIFE ---

const ammasKitchen = (function () {
  // Private variable — not accessible outside
  let dishesCooked = 0;

  return {
    cook() {
      dishesCooked++;
      return `Cooked dish #${dishesCooked}`;
    },
    getCount() {
      return dishesCooked;
    },
  };
})();

console.log(ammasKitchen.cook());
// Output: Cooked dish #1
console.log(ammasKitchen.cook());
// Output: Cooked dish #2
console.log("Total dishes:", ammasKitchen.getCount());
// Output: Total dishes: 2
// console.log(ammasKitchen.dishesCooked); // undefined — truly private


// IIFE with arrow syntax
const kitchenId = (() => {
  const prefix = "KITCHEN";
  const random = Math.floor(Math.random() * 10000);
  return `${prefix}-${random}`;
})();
console.log("Kitchen ID:", kitchenId);
// Output: Kitchen ID: KITCHEN-<random>


// WHY: Functions are "first-class citizens" in JS — they can be
// stored in variables, passed as arguments, and returned from
// other functions. This enables powerful patterns like callbacks,
// factories, and higher-order functions.

// --- Functions as First-Class Citizens ---

// 1. Assigned to a variable (already shown above with expressions)

// 2. Passed as an argument (callback pattern)
function processIngredients(ingredientList, processor) {
  return ingredientList.map(processor);
}

const ingredients = ["haldi", "jeera", "dhania"];
const prepared = processIngredients(ingredients, (item) => item.toUpperCase());
console.log("Prepared:", prepared);
// Output: Prepared: [ 'HALDI', 'JEERA', 'DHANIA' ]

// 3. Returned from another function (factory pattern)
function createRecipeMaker(cuisine) {
  return function (ingredient) {
    return `${cuisine} dish made with ${ingredient}`;
  };
}

const makeSouthIndian = createRecipeMaker("South Indian");
const makeNorthIndian = createRecipeMaker("North Indian");

console.log(makeSouthIndian("Coconut"));
// Output: South Indian dish made with Coconut
console.log(makeNorthIndian("Paneer"));
// Output: North Indian dish made with Paneer

// 4. Stored in a data structure
const kitchenRecipes = {
  dal: (qty) => `Cook ${qty} cups of dal`,
  raita: (qty) => `Mix ${qty} cups of raita`,
  roti: (count) => `Roll ${count} rotis`,
};

console.log(kitchenRecipes.dal(2));
// Output: Cook 2 cups of dal
console.log(kitchenRecipes.roti(10));
// Output: Roll 10 rotis


// WHY: The `arguments` object exists only in regular functions (not arrows).
// It's array-like but NOT an array — rest parameters are the modern replacement.

// --- Arguments Object ---

function oldCookingLog() {
  console.log("Type:", typeof arguments);        // object
  console.log("Is array?", Array.isArray(arguments)); // false
  console.log("Length:", arguments.length);

  // Convert to real array to use array methods
  const argsArray = Array.from(arguments);
  console.log("Ingredients:", argsArray.join(", "));
}

oldCookingLog("Haldi", "Jeera", "Lal Mirch");
// Output: Type: object
// Output: Is array? false
// Output: Length: 3
// Output: Ingredients: Haldi, Jeera, Lal Mirch

// Arrow functions do NOT have their own `arguments`
const arrowCook = () => {
  try {
    console.log(arguments);
  } catch (e) {
    console.log("Arrow functions have no `arguments`:", e.message);
  }
};
// (In module scope or strict mode, `arguments` is not defined for arrows)


// WHY: Pure functions — no side effects, same input always gives same
// output — are easier to test, debug, and reason about. Understanding
// the difference helps you write more reliable code.

// --- Pure Functions vs Side Effects ---

// PURE — depends only on inputs, produces no side effects
function calculateServings(baseServings, multiplier) {
  return baseServings * multiplier;
}

console.log(calculateServings(10, 3)); // Always 30
// Output: 30
console.log(calculateServings(10, 3)); // Always 30
// Output: 30

// IMPURE — depends on external state and mutates it
let globalDishCount = 0;

function cookAndCount(name) {
  globalDishCount++; // Side effect: mutates external state
  console.log(`Cooked ${name}. Total: ${globalDishCount}`);
  return globalDishCount;
}

cookAndCount("Biryani");
// Output: Cooked Biryani. Total: 1
cookAndCount("Biryani");
// Output: Cooked Biryani. Total: 2
// Same input, different output — impure!

// IMPURE — produces a side effect (logging, DOM manipulation, API calls)
function logRecipe(recipe) {
  console.log(`[LOG] ${recipe}`); // Side effect: I/O
  return recipe;
}

// Common side effects to watch for:
// - Modifying external variables or object properties
// - console.log(), DOM manipulation, file I/O
// - Network requests (fetch, HTTP calls)
// - Modifying function arguments (if objects/arrays)

// PURE version of the same idea — returns a new value, no mutation
function addToMenu(menu, newDish) {
  return [...menu, newDish]; // Returns new array, original untouched
}

const todaysMenu = ["Dal Makhani", "Jeera Rice"];
const updatedMenu = addToMenu(todaysMenu, "Gulab Jamun");
console.log("Original:", todaysMenu);
// Output: Original: [ 'Dal Makhani', 'Jeera Rice' ]
console.log("Updated:", updatedMenu);
// Output: Updated: [ 'Dal Makhani', 'Jeera Rice', 'Gulab Jamun' ]


// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. Function declarations are hoisted; expressions and arrows are not.
// 2. Arrow functions have no own `this`, no `arguments`, and no
//    `new` — use them for callbacks and short logic.
// 3. Default params eliminate the need for `param || defaultValue`
//    boilerplate (and they handle `undefined` correctly).
// 4. Rest params (...args) collect arguments into a real array —
//    prefer them over the legacy `arguments` object.
// 5. IIFE creates a one-time private scope — useful for
//    initialization and avoiding global pollution.
// 6. Functions are first-class: store, pass, and return them
//    just like any other value.
// 7. Pure functions (no side effects, deterministic output) are
//    easier to test and reason about. Isolate side effects to
//    the edges of your program.
// ============================================================
