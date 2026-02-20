/** ============================================================
 FILE 15: OS Module — System Information & Diagnostics
 ============================================================
 Topic: The 'os' module — querying system-level information
 WHY THIS MATTERS:
   Applications need system info for resource management,
   platform-specific behavior, logging, and diagnostics.
   The os module gives you everything without external deps.
 ============================================================ */

const os = require('os');

// ============================================================
// STORY: INS VIKRANT DIAGNOSTIC PANEL
// Lt. Commander Mehra runs the morning diagnostic sweep on
// INS Vikrant's (aircraft carrier) systems. Every sensor
// reading maps to an os module call — platform, memory, CPU,
// network, uptime. Mehra compiles them into a single
// diagnostic report for the Captain.
// ============================================================

// ============================================================
// EXAMPLE BLOCK 1 — Full Diagnostic Report
// ============================================================

console.log('='.repeat(60));
console.log('  INS VIKRANT DIAGNOSTIC REPORT');
console.log('  Lt. Commander Mehra — Morning Sweep');
console.log('='.repeat(60));

// ── 1. Platform & Architecture ──────────────────────────────
// WHY: Determine which OS we're running on for platform-specific logic
const platform = os.platform();
const arch = os.arch();
const osType = os.type();
const osRelease = os.release();
const osVersion = os.version();

console.log('\n--- Hull Classification (Platform & Architecture) ---');
console.log(`  Platform  : ${platform}`);
// Output: Platform  : darwin (varies by system)
console.log(`  Arch      : ${arch}`);
// Output: Arch      : arm64 (varies by system)
console.log(`  OS Type   : ${osType}`);
// Output: OS Type   : Darwin (varies by system)
console.log(`  Release   : ${osRelease}`);
// Output: Release   : 24.2.0 (varies by system)
console.log(`  Version   : ${osVersion}`);
// Output: Version   : Darwin Kernel Version 24.2.0... (varies by system)

// ── 2. CPU Information ──────────────────────────────────────
// WHY: Know CPU count for worker/cluster sizing, model for logging
const cpus = os.cpus();
const cpuCount = cpus.length;
const cpuModel = cpus[0].model;

console.log('\n--- Engine Cores (CPU) ---');
console.log(`  Core Count : ${cpuCount}`);
// Output: Core Count : 8 (varies by system)
console.log(`  Model      : ${cpuModel}`);
// Output: Model      : Apple M1 Pro (varies by system)

// ── 3. Memory ───────────────────────────────────────────────
// WHY: Monitor memory for leak detection, capacity planning
const totalMemGB = (os.totalmem() / (1024 ** 3)).toFixed(2);
const freeMemGB = (os.freemem() / (1024 ** 3)).toFixed(2);
const usedMemGB = (totalMemGB - freeMemGB).toFixed(2);
const memUsagePercent = ((usedMemGB / totalMemGB) * 100).toFixed(1);

console.log('\n--- Fuel Capacity (Memory) ---');
console.log(`  Total      : ${totalMemGB} GB`);
// Output: Total      : 16.00 GB (varies by system)
console.log(`  Free       : ${freeMemGB} GB`);
// Output: Free       : 4.23 GB (varies by system)
console.log(`  Used       : ${usedMemGB} GB (${memUsagePercent}%)`);
// Output: Used       : 11.77 GB (73.6%) (varies by system)

// ── 4. Uptime ───────────────────────────────────────────────
// WHY: Monitor system stability, schedule restarts
const uptimeSeconds = os.uptime();
const uptimeHours = (uptimeSeconds / 3600).toFixed(2);
const days = Math.floor(uptimeSeconds / 86400);
const hours = Math.floor((uptimeSeconds % 86400) / 3600);
const minutes = Math.floor((uptimeSeconds % 3600) / 60);

console.log('\n--- Mission Clock (Uptime) ---');
console.log(`  Uptime     : ${uptimeHours} hours`);
// Output: Uptime     : 72.45 hours (varies by system)
console.log(`  Formatted  : ${days}d ${hours}h ${minutes}m`);
// Output: Formatted  : 3d 0h 27m (varies by system)

// ── 5. Host & User Information ──────────────────────────────
// WHY: Identify the machine for logging, config selection
const hostname = os.hostname();
const homeDir = os.homedir();
const tmpDir = os.tmpdir();
const userInfo = os.userInfo();

console.log('\n--- Ship Registry (Host & User) ---');
console.log(`  Hostname   : ${hostname}`);
// Output: Hostname   : INS-Vikrant.local (varies by system)
console.log(`  Home Dir   : ${homeDir}`);
// Output: Home Dir   : /Users/mehra (varies by system)
console.log(`  Temp Dir   : ${tmpDir}`);
// Output: Temp Dir   : /tmp (varies by system)
console.log(`  Username   : ${userInfo.username}`);
// Output: Username   : mehra (varies by system)
console.log(`  UID        : ${userInfo.uid}`);
// Output: UID        : 501 (varies by system)
console.log(`  Shell      : ${userInfo.shell}`);
// Output: Shell      : /bin/zsh (varies by system)

// ── 6. Network Interfaces ───────────────────────────────────
// WHY: Discover IP addresses for server binding, service discovery
const nets = os.networkInterfaces();
const networkEntries = [];

for (const [name, interfaces] of Object.entries(nets)) {
  for (const iface of interfaces) {
    if (iface.family === 'IPv4' && !iface.internal) {
      networkEntries.push({ name, address: iface.address, mac: iface.mac });
    }
  }
}

console.log('\n--- Communication Array (Network — IPv4, External) ---');
if (networkEntries.length > 0) {
  const first = networkEntries[0];
  console.log(`  Interface  : ${first.name}`);
  console.log(`  IPv4 Addr  : ${first.address}`);
  console.log(`  MAC        : ${first.mac}`);
  // Output: Interface  : en0 (varies by system)
  // Output: IPv4 Addr  : 192.168.1.42 (varies by system)
  // Output: MAC        : a1:b2:c3:d4:e5:f6 (varies by system)
  if (networkEntries.length > 1) {
    console.log(`  (${networkEntries.length - 1} more interface(s) available)`);
  }
} else {
  console.log('  No external IPv4 interfaces found');
}

// ── 7. Load Average ─────────────────────────────────────────
// WHY: Gauge system load — values close to CPU count = fully loaded
const loadAvg = os.loadavg();

console.log('\n--- Engine Load (Load Average) ---');
console.log(`  1 min avg  : ${loadAvg[0].toFixed(2)}`);
console.log(`  5 min avg  : ${loadAvg[1].toFixed(2)}`);
console.log(`  15 min avg : ${loadAvg[2].toFixed(2)}`);
// Output: 1 min avg  : 2.45 (varies by system)
// Output: 5 min avg  : 1.89 (varies by system)
// Output: 15 min avg : 1.55 (varies by system)

// ── 8. End-of-Line Character ────────────────────────────────
// WHY: Write cross-platform files with correct line endings
const eolDisplay = os.EOL === '\n' ? '\\n (Unix/macOS)' : '\\r\\n (Windows)';

console.log('\n--- Data Format (EOL) ---');
console.log(`  EOL char   : ${eolDisplay}`);
// Output: EOL char   : \n (Unix/macOS) (varies by system)

// ── Diagnostic Summary ──────────────────────────────────────
console.log('\n' + '='.repeat(60));
console.log('  INS VIKRANT — DIAGNOSTIC SUMMARY');
console.log('─'.repeat(60));

const memStatus = memUsagePercent > 90 ? 'CRITICAL' : memUsagePercent > 70 ? 'WARNING' : 'NOMINAL';
const loadStatus = loadAvg[0] > cpuCount ? 'HIGH' : 'NOMINAL';

console.log(`  Memory     : ${memStatus} (${memUsagePercent}% used)`);
console.log(`  CPU Load   : ${loadStatus} (${loadAvg[0].toFixed(2)} / ${cpuCount} cores)`);
console.log(`  Uptime     : ${days}d ${hours}h ${minutes}m`);
console.log(`  Status     : ALL SYSTEMS OPERATIONAL — Jai Hind`);
console.log('='.repeat(60));

// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. os.platform()/arch()/type() — identify the environment
// 2. os.cpus() — array of CPU info, .length gives core count
// 3. os.totalmem()/freemem() — memory in bytes, divide for GB
// 4. os.uptime() — system uptime in seconds
// 5. os.homedir()/tmpdir()/hostname() — filesystem landmarks
// 6. os.networkInterfaces() — all network adapters with IPs
// 7. os.userInfo() — current user details (uid, shell, etc.)
// 8. os.EOL — platform-correct line ending for file writing
// 9. os.loadavg() — 1/5/15 minute CPU load averages
// 10. os.release()/version() — kernel version details
// ============================================================
