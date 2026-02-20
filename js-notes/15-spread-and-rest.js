// ============================================================
// FILE 15: SPREAD & REST OPERATORS
// Topic: The ... syntax — spreading values apart and gathering them together
// WHY: Spread and rest eliminate boilerplate for copying, merging,
//      and handling variable-length data — two sides of the same coin.
// ============================================================

// ============================================================
// EXAMPLE 1 — DJ Bunty: Spreading Tracks for Sangeet Night
// Story: DJ Bunty builds playlists by spreading and merging Bollywood tracks.
// ============================================================

// WHY: Spread in arrays lets you copy, merge, and convert iterables
// without mutating the original — essential for predictable data flow.

// --- Spread in Arrays ---

const baraatPlaylist = ["London Thumakda", "Gallan Goodiyan", "Balam Pichkari"];
const sangeetPlaylist = ["Nachde Ne Saare", "Cutiepie"];

// Copy an array (shallow)
const backupPlaylist = [...baraatPlaylist];
console.log(backupPlaylist);
// Output: [ 'London Thumakda', 'Gallan Goodiyan', 'Balam Pichkari' ]

// Merge arrays into a single setlist
const weddingNightSetlist = [...baraatPlaylist, "--- Dinner Break ---", ...sangeetPlaylist];
console.log(weddingNightSetlist);
// Output: [ 'London Thumakda', 'Gallan Goodiyan', 'Balam Pichkari', '--- Dinner Break ---', 'Nachde Ne Saare', 'Cutiepie' ]

// Convert an iterable (string) into an array of characters
const djName = "DJ Bunty";
const nameLetters = [...djName];
console.log(nameLetters);
// Output: [ 'D', 'J', ' ', 'B', 'u', 'n', 't', 'y' ]

// Convert a Set to an array (remove duplicates)
const requestedSongs = ["Cutiepie", "London Thumakda", "Cutiepie", "Gallan Goodiyan"];
const uniqueRequests = [...new Set(requestedSongs)];
console.log(uniqueRequests);
// Output: [ 'Cutiepie', 'London Thumakda', 'Gallan Goodiyan' ]


// WHY: Spread in objects lets you clone and merge objects.
// Later properties override earlier ones — this is how you apply defaults.

// --- Spread in Objects ---

const defaultSettings = { volume: 50, bass: "medium", echo: false };
const buntyPreferences = { bass: "heavy", echo: true, dhol: "extra" };

// Copy an object (shallow)
const settingsBackup = { ...defaultSettings };
console.log(settingsBackup);
// Output: { volume: 50, bass: 'medium', echo: false }

// Merge objects — later keys override earlier ones
const liveSettings = { ...defaultSettings, ...buntyPreferences };
console.log(liveSettings);
// Output: { volume: 50, bass: 'heavy', echo: true, dhol: 'extra' }

// Override specific fields on the fly
const quietMode = { ...liveSettings, volume: 10, echo: false };
console.log(quietMode);
// Output: { volume: 10, bass: 'heavy', echo: false, dhol: 'extra' }


// WHY: Spread in function calls expands an array into individual arguments,
// replacing the old Function.prototype.apply() pattern.

// --- Spread in Function Calls ---

function announceSong(track1, track2, track3) {
  console.log(`Now playing: ${track1}, then ${track2}, finishing with ${track3}`);
}

const topThree = ["Chaiyya Chaiyya", "Jai Ho", "Kajra Re"];
announceSong(...topThree);
// Output: Now playing: Chaiyya Chaiyya, then Jai Ho, finishing with Kajra Re

// With Math.max (classic use case)
const bpmReadings = [120, 128, 135, 110, 140];
console.log("Peak BPM:", Math.max(...bpmReadings));
// Output: Peak BPM: 140


// ============================================================
// EXAMPLE 2 — DJ Bunty: Collecting Songs with Rest
// Story: Bunty collects an unknown number of song requests and
// separates the first few for the baraat from the rest for dinner.
// ============================================================

// WHY: Rest parameters gather an indefinite number of arguments
// into a real array — cleaner and safer than the old `arguments` object.

// --- Rest in Function Parameters ---

function buildSetlist(headliner, ...openingTracks) {
  console.log(`Headliner song: ${headliner}`);
  console.log(`Opening tracks: ${openingTracks.join(", ")}`);
  console.log(`Total tracks: ${openingTracks.length + 1}`);
}

buildSetlist("Chaiyya Chaiyya", "Dola Re Dola", "Munni Badnaam", "Sheila Ki Jawani");
// Output: Headliner song: Chaiyya Chaiyya
// Output: Opening tracks: Dola Re Dola, Munni Badnaam, Sheila Ki Jawani
// Output: Total tracks: 4


// WHY: Rest in destructuring lets you peel off specific items
// and collect everything else — great for processing head/tail patterns.

// --- Rest in Array Destructuring ---

const playlist = ["Welcome Song", "Mehndi Hai Rachne Wali", "Morni Banke", "Aankh Maare", "Bidaai Song"];
const [intro, ...middleTracks] = playlist;
console.log("Intro:", intro);
// Output: Intro: Welcome Song
console.log("Middle tracks:", middleTracks);
// Output: Middle tracks: [ 'Mehndi Hai Rachne Wali', 'Morni Banke', 'Aankh Maare', 'Bidaai Song' ]

// --- Rest in Object Destructuring ---

const albumInfo = {
  title: "Yeh Jawaani Hai Deewani",
  artist: "Pritam",
  year: 2013,
  genre: "Bollywood",
  label: "T-Series",
};

const { title, artist, ...albumMeta } = albumInfo;
console.log(`"${title}" by ${artist}`);
// Output: "Yeh Jawaani Hai Deewani" by Pritam
console.log("Metadata:", albumMeta);
// Output: Metadata: { year: 2013, genre: 'Bollywood', label: 'T-Series' }


// WHY: The `arguments` object is array-like but NOT an array — it lacks
// .map(), .filter(), etc. Rest params give you a real array from the start.

// --- Rest vs arguments Object ---

// Old way (arguments) — only works in regular functions, NOT arrow functions
function oldStyleMix() {
  console.log("arguments is array?", Array.isArray(arguments)); // false
  const tracksArray = Array.from(arguments); // manual conversion needed
  console.log("Converted:", tracksArray);
}
oldStyleMix("Track 1", "Track 2");
// Output: arguments is array? false
// Output: Converted: [ 'Track 1', 'Track 2' ]

// New way (rest) — cleaner, works everywhere, IS a real array
const newStyleMix = (...tracks) => {
  console.log("rest is array?", Array.isArray(tracks)); // true
  console.log("Tracks:", tracks);
};
newStyleMix("Track 1", "Track 2");
// Output: rest is array? true
// Output: Tracks: [ 'Track 1', 'Track 2' ]


// ============================================================
// EXAMPLE 3 — Shallow Copy vs Deep Copy: The Hidden Trap
// Story: Bunty copies a sangeet playlist config, tweaks the copy,
// and accidentally corrupts the original — or does he?
// ============================================================

// WHY: Spread creates a SHALLOW copy — nested objects still share
// the same reference. Knowing when you need a deep copy prevents
// some of the sneakiest bugs in JavaScript.

// --- Shallow Copy Mutation Bug ---

const originalConfig = {
  djName: "DJ Bunty",
  effects: { reverb: "hall", delay: 300 },
  tracks: ["Kajra Re", "Desi Girl"],
};

// Spread = shallow copy
const shallowCopy = { ...originalConfig };

// Top-level change — safe, does NOT affect original
shallowCopy.djName = "DJ Sonu";
console.log("Original DJ:", originalConfig.djName);
// Output: Original DJ: DJ Bunty
console.log("Copy DJ:", shallowCopy.djName);
// Output: Copy DJ: DJ Sonu

// Nested change — DANGER! Both point to the SAME effects object
shallowCopy.effects.reverb = "plate";
console.log("Original reverb:", originalConfig.effects.reverb);
// Output: Original reverb: plate   <-- BUG! Original was mutated!
console.log("Copy reverb:", shallowCopy.effects.reverb);
// Output: Copy reverb: plate

// Object.assign() has the exact same shallow behavior
const assignCopy = Object.assign({}, originalConfig);
assignCopy.effects.delay = 500;
console.log("Original delay:", originalConfig.effects.delay);
// Output: Original delay: 500   <-- Same bug with Object.assign

// Arrays are also shallow-copied by spread
const arrCopy = [...originalConfig.tracks];
arrCopy.push("Badtameez Dil");
console.log("Original tracks:", originalConfig.tracks);
// Output: Original tracks: [ 'Kajra Re', 'Desi Girl' ]   <-- Safe for top-level push
// (But if array contained objects, editing those objects would mutate the original!)


// --- Deep Copy Methods ---

// Method 1: JSON round-trip — simple but lossy
const configWithExtras = {
  djName: "DJ Bunty",
  effects: { reverb: "hall", delay: 300 },
  createdAt: new Date("2025-01-01"),
  greet: function () { return "Namaste!"; },
  nickname: undefined,
};

const jsonDeepCopy = JSON.parse(JSON.stringify(configWithExtras));
console.log("\n--- JSON Deep Copy Limitations ---");
console.log("Date type:", typeof jsonDeepCopy.createdAt);
// Output: Date type: string   <-- Date became a string!
console.log("Function:", jsonDeepCopy.greet);
// Output: Function: undefined   <-- Functions are lost!
console.log("Undefined field:", jsonDeepCopy.nickname);
// Output: Undefined field: undefined   <-- Key was stripped entirely
console.log("Has nickname key?", "nickname" in jsonDeepCopy);
// Output: Has nickname key? false

// Method 2: structuredClone() — modern, proper deep clone
const structuredDeepCopy = structuredClone({
  djName: "DJ Bunty",
  effects: { reverb: "hall", delay: 300 },
  createdAt: new Date("2025-01-01"),
  tags: new Set(["bollywood", "sangeet"]),
});

// Mutate the deep copy — original stays intact
structuredDeepCopy.effects.reverb = "spring";
console.log("\n--- structuredClone Deep Copy ---");
console.log("Deep copy reverb:", structuredDeepCopy.effects.reverb);
// Output: Deep copy reverb: spring
console.log("Date is still Date?", structuredDeepCopy.createdAt instanceof Date);
// Output: Date is still Date? true

// structuredClone handles circular references too!
const circularObj = { name: "Loop" };
circularObj.self = circularObj;
const clonedCircular = structuredClone(circularObj);
console.log("Circular clone name:", clonedCircular.name);
// Output: Circular clone name: Loop
console.log("Points to itself?", clonedCircular.self === clonedCircular);
// Output: Points to itself? true
console.log("Is same as original?", clonedCircular === circularObj);
// Output: Is same as original? false

// NOTE: structuredClone CANNOT clone functions
// structuredClone({ fn: () => {} }); // Throws DataCloneError


// --- Side-by-Side Comparison: Shallow vs Deep ---

console.log("\n--- Side-by-Side: Shallow vs Deep ---");

const masterPlaylist = {
  name: "Sangeet Night",
  tracks: [
    { title: "Kajra Re", bpm: 120 },
    { title: "Desi Girl", bpm: 128 },
  ],
};

const shallowPlaylist = { ...masterPlaylist, tracks: [...masterPlaylist.tracks] };
const deepPlaylist = structuredClone(masterPlaylist);

// Mutate a nested object in both copies
shallowPlaylist.tracks[0].bpm = 999;
deepPlaylist.tracks[0].bpm = 777;

console.log("Original BPM:", masterPlaylist.tracks[0].bpm);
// Output: Original BPM: 999   <-- Shallow copy mutated the original!
console.log("Shallow BPM:", shallowPlaylist.tracks[0].bpm);
// Output: Shallow BPM: 999
console.log("Deep BPM:", deepPlaylist.tracks[0].bpm);
// Output: Deep BPM: 777   <-- Deep copy is fully independent


// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. SPREAD (...) expands/unpacks elements — use it to copy,
//    merge, or pass arrays/objects into new contexts.
// 2. REST (...) collects/gathers elements — use it in function
//    params and destructuring to handle variable-length data.
// 3. Rest params produce a real Array; `arguments` does not.
// 4. Spread creates SHALLOW copies — nested references are shared.
// 5. Object.assign() is also shallow — no better than spread for depth.
// 6. JSON.parse(JSON.stringify()) deep copies but loses functions,
//    undefined, Date objects, RegExp, Maps, Sets, etc.
// 7. structuredClone() is the modern deep clone — handles circular
//    refs, Dates, Maps, Sets, but CANNOT clone functions.
// 8. When in doubt about nested data, use structuredClone().
// ============================================================
