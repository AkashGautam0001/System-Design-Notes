/** ============================================================
    FILE 24: DNS Module — Name Resolution in Node.js
    ============================================================
    Topic: The `dns` module for hostname lookups and resolution
    WHY THIS MATTERS:
    Every HTTP request starts with a DNS lookup. Understanding
    how Node resolves hostnames — and the two very different
    methods it offers — helps you debug connection issues and
    optimize network performance.
    ============================================================ */

// ============================================================
// STORY: India Post Pincode Directory
// Postmaster Verma works at the India Post sorting office.
// When someone wants to send a letter, Verma looks up the
// delivery post office from the pincode. But Verma has TWO
// directories:
//   1. The local register (OS resolver — dns.lookup)
//   2. The central pincode database (DNS protocol — dns.resolve)
// They can give DIFFERENT answers for the same address!
// DNS resolution = finding the delivery post office from a pincode.
// Reverse lookup = finding the pincode from a post office name.
// ============================================================

const dns = require('dns');
const dnsPromises = dns.promises;

// ============================================================
// EXAMPLE BLOCK 1 — DNS Lookups, Resolution, and Servers
// ============================================================

async function runDNSDemo() {
  console.log('=== Postmaster Verma opens the India Post sorting office ===\n');

  // ──────────────────────────────────────────────────────────
  // dns.getServers() — which DNS servers is Node using?
  // ──────────────────────────────────────────────────────────

  const servers = dns.getServers();
  console.log('DNS servers configured (like India Post regional hubs):');
  console.log(servers);
  // Output: DNS servers configured (like India Post regional hubs):
  // Output: [ '8.8.8.8', '8.8.4.4' ] (varies by system)
  // WHY: getServers() shows the DNS servers from your OS config.
  // These are used by dns.resolve*() methods (not dns.lookup).

  // ──────────────────────────────────────────────────────────
  // dns.lookup() — uses the OS resolver (like getaddrinfo)
  // ──────────────────────────────────────────────────────────
  // WHY: dns.lookup() delegates to the operating system.
  // It reads /etc/hosts, respects nsswitch.conf, and uses
  // whatever the OS uses. It runs on the libuv thread pool
  // (NOT the DNS protocol over the network).
  // Like checking Verma's local register at the sorting office.

  console.log('\n--- dns.lookup (Local Register — OS resolver) ---');

  try {
    const result = await dnsPromises.lookup('localhost');
    console.log(`dns.lookup('localhost'):`);
    console.log(`  address: ${result.address}`);
    console.log(`  family:  IPv${result.family}`);
    // Output: dns.lookup('localhost'):
    // Output:   address: 127.0.0.1
    // Output:   family:  IPv4
    // WHY: 'localhost' is in /etc/hosts on virtually every system.
    // This will work even without internet — like a local register.
  } catch (err) {
    console.log(`  lookup('localhost') failed: ${err.message}`);
  }

  // ──────────────────────────────────────────────────────────
  // dns.lookup with options — specifying address family
  // ──────────────────────────────────────────────────────────

  try {
    const ipv4 = await dnsPromises.lookup('localhost', { family: 4 });
    console.log(`\ndns.lookup('localhost', { family: 4 }):`);
    console.log(`  address: ${ipv4.address}`);
    // Output:   address: 127.0.0.1
    // WHY: family: 4 forces IPv4 result only.
  } catch (err) {
    console.log(`  lookup with family 4 failed: ${err.message}`);
  }

  try {
    const all = await dnsPromises.lookup('localhost', { all: true });
    console.log(`\ndns.lookup('localhost', { all: true }):`);
    console.log(`  results:`, all);
    // Output:   results: [ { address: '127.0.0.1', family: 4 }, ... ]
    // WHY: { all: true } returns an array of ALL matching addresses,
    // not just the first one. Like getting all post offices for a pincode.
  } catch (err) {
    console.log(`  lookup all failed: ${err.message}`);
  }

  // ──────────────────────────────────────────────────────────
  // dns.resolve4() — uses the DNS protocol directly
  // ──────────────────────────────────────────────────────────
  // WHY: dns.resolve4() sends an actual DNS query over the
  // network to the configured DNS servers. It does NOT read
  // /etc/hosts. It uses c-ares, not the thread pool.
  // Like querying the central India Post pincode database.
  //
  // IMPORTANT DIFFERENCE:
  //   dns.lookup('localhost')   -> reads /etc/hosts -> "127.0.0.1"
  //   dns.resolve4('localhost') -> queries DNS server -> may FAIL
  //     because 'localhost' often isn't in public DNS.

  console.log('\n--- dns.resolve4 (Central Pincode Database — DNS protocol) ---');

  try {
    const addresses = await dnsPromises.resolve4('localhost');
    console.log(`dns.resolve4('localhost'):`, addresses);
    // Output: dns.resolve4('localhost'): [ '127.0.0.1' ]
    // (may succeed or fail depending on DNS configuration)
  } catch (err) {
    console.log(`dns.resolve4('localhost') failed: ${err.code} — ${err.message}`);
    // Output: dns.resolve4('localhost') failed: ENOTFOUND — ...
    // WHY: This is expected! 'localhost' is often NOT in DNS servers.
    // Like a local post office not being in the central database.
    console.log('  (This is normal — localhost is in /etc/hosts, not DNS)');
  }

  // ──────────────────────────────────────────────────────────
  // dns.reverse() — reverse DNS lookup (IP -> hostname)
  // ──────────────────────────────────────────────────────────
  // Like finding the pincode from a post office name.

  console.log('\n--- dns.reverse (Reverse Lookup — Post Office to Pincode) ---');

  try {
    const hostnames = await dnsPromises.reverse('127.0.0.1');
    console.log(`dns.reverse('127.0.0.1'):`, hostnames);
    // Output: dns.reverse('127.0.0.1'): [ 'localhost' ]
  } catch (err) {
    console.log(`dns.reverse('127.0.0.1') failed: ${err.code || err.message}`);
    // WHY: Reverse DNS may not be configured for loopback on all systems.
  }

  // ──────────────────────────────────────────────────────────
  // Callback-style API (original dns API)
  // ──────────────────────────────────────────────────────────

  console.log('\n--- Callback-style dns.lookup ---');

  await new Promise((resolve) => {
    dns.lookup('localhost', (err, address, family) => {
      if (err) {
        console.log(`  Callback lookup failed: ${err.message}`);
      } else {
        console.log(`  Callback dns.lookup('localhost'): ${address} (IPv${family})`);
        // Output:   Callback dns.lookup('localhost'): 127.0.0.1 (IPv4)
      }
      resolve();
    });
  });

  // ──────────────────────────────────────────────────────────
  // Trying a public hostname (may fail without internet)
  // ──────────────────────────────────────────────────────────

  console.log('\n--- Attempting external DNS (may fail offline) ---');

  try {
    const result = await dnsPromises.lookup('example.com');
    console.log(`dns.lookup('example.com'): ${result.address}`);
    // Output: dns.lookup('example.com'): 93.184.216.34 (if online)
  } catch (err) {
    console.log(`dns.lookup('example.com') failed: ${err.message}`);
    console.log('  (Expected if running offline)');
  }

  try {
    const mx = await dnsPromises.resolve('example.com', 'MX');
    console.log(`dns.resolve('example.com', 'MX'):`, mx);
    // Output: dns.resolve('example.com', 'MX'): [ { exchange: '...', priority: 0 } ]
    // WHY: resolve() supports record types: A, AAAA, MX, TXT, SRV, NS, CNAME, SOA, PTR
  } catch (err) {
    console.log(`dns.resolve('example.com', 'MX') failed: ${err.message}`);
    console.log('  (Expected if running offline)');
  }

  // ──────────────────────────────────────────────────────────
  // Summary of lookup vs resolve
  // ──────────────────────────────────────────────────────────

  console.log('\n--- lookup vs resolve summary ---');
  console.log('dns.lookup() — Local Register:');
  console.log('  - Uses OS resolver (getaddrinfo)');
  console.log('  - Reads /etc/hosts');
  console.log('  - Runs on libuv thread pool (can be bottleneck)');
  console.log('  - Same result as `ping hostname`');
  console.log('dns.resolve() — Central Pincode Database:');
  console.log('  - Uses DNS protocol directly (c-ares library)');
  console.log('  - Does NOT read /etc/hosts');
  console.log('  - Non-blocking, does not use thread pool');
  console.log('  - Supports all record types (MX, TXT, SRV, etc.)');
  console.log('  - http.get() uses dns.lookup() by default');

  console.log('\n=== Postmaster Verma closes the sorting office for the night ===');
}

// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. dns.lookup() uses the OS resolver (/etc/hosts + system
//    DNS). It runs on the libuv thread pool.
// 2. dns.resolve4() uses the DNS protocol directly via c-ares.
//    It does NOT read /etc/hosts.
// 3. These two can return DIFFERENT results for the same name.
// 4. dns.promises provides async/await versions of all methods.
// 5. dns.getServers() shows configured DNS servers.
// 6. Always wrap DNS calls in try/catch — network may be down.
// 7. http.get() and most Node APIs use dns.lookup() by default,
//    which means /etc/hosts entries are respected.
// 8. dns.resolve() supports record types: A, AAAA, MX, TXT,
//    SRV, NS, CNAME, SOA, PTR, NAPTR.
// ============================================================

runDNSDemo().then(() => {
  console.log('\nAll done.');
});
