/** ============================================================
    FILE 25: Environment and Configuration
    ============================================================
    Topic: process.env, dotenv pattern, config hierarchy
    WHY THIS MATTERS:
    Every real app behaves differently per environment — dev,
    staging, production. Mastering environment variables and
    configuration prevents secrets in code, makes deployments
    flexible, and avoids the classic "works on my machine."
    ============================================================ */

// ============================================================
// STORY: Government Office Config
// The Sarkari Office changes its behavior depending on the
// current posting order. In the district office, everything
// is verbose with full audit trails. In the head office,
// it's streamlined with minimal paperwork.
// The secret? It reads the department circulars (env vars).
// ============================================================

const fs = require('fs');
const path = require('path');
const os = require('os');

// ============================================================
// EXAMPLE BLOCK 1 — process.env and Its Gotchas
// ============================================================

console.log('=== The Sarkari Office checks the posting order ===\n');

// ──────────────────────────────────────────────────────────
// process.env — the environment variable object
// ──────────────────────────────────────────────────────────

// WHY: process.env contains all environment variables as
// key-value pairs. They are ALWAYS strings.

console.log('--- process.env basics ---');
console.log(`HOME: ${process.env.HOME || process.env.USERPROFILE}`);
console.log(`PATH exists: ${!!process.env.PATH}`);
console.log(`NODE_ENV: ${process.env.NODE_ENV || '(not set)'}`);
// Output: NODE_ENV: (not set)
// WHY: NODE_ENV is not set by default. You must set it explicitly.

// ──────────────────────────────────────────────────────────
// GOTCHA: Everything is a string!
// ──────────────────────────────────────────────────────────

// WHY: This is the #1 source of env var bugs.
// Even if you set PORT=3000, process.env.PORT is the STRING "3000".

// Temporarily set some env vars for demonstration
process.env.PORT = '8080';
process.env.ENABLED = 'true';
process.env.MAX_RETRIES = '5';
process.env.TIMEOUT = '0';

console.log('\n--- The "everything is a string" gotcha ---');

console.log(`typeof process.env.PORT: ${typeof process.env.PORT}`);
// Output: typeof process.env.PORT: string

console.log(`process.env.PORT === 8080: ${process.env.PORT === 8080}`);
// Output: process.env.PORT === 8080: false
// WHY: "8080" !== 8080 — string vs number!

console.log(`process.env.PORT === '8080': ${process.env.PORT === '8080'}`);
// Output: process.env.PORT === '8080': true

// ──────────────────────────────────────────────────────────
// The || default pattern — works for PORT but tricky for 0
// ──────────────────────────────────────────────────────────

const port = process.env.PORT || 3000;
console.log(`\nport (|| default): ${port}`);
// Output: port (|| default): 8080
// WHY: "8080" is truthy, so || doesn't kick in. This works.

const timeout = process.env.TIMEOUT || 30;
console.log(`timeout (|| default): ${timeout}`);
// Output: timeout (|| default): 30
// WHY: "0" is FALSY! So || gives us 30, not 0.
// This is a bug. Use ?? (nullish coalescing) instead:

const timeoutFixed = process.env.TIMEOUT ?? 30;
console.log(`timeout (?? default): ${timeoutFixed}`);
// Output: timeout (?? default): 0
// WHY: ?? only triggers on null/undefined, not on "0".

// ──────────────────────────────────────────────────────────
// The boolean gotcha — "true" !== true
// ──────────────────────────────────────────────────────────

console.log('\n--- The boolean gotcha ---');

console.log(`ENABLED === true: ${process.env.ENABLED === true}`);
// Output: ENABLED === true: false
// WHY: "true" (string) is NOT true (boolean). This ALWAYS fails.

console.log(`ENABLED === 'true': ${process.env.ENABLED === 'true'}`);
// Output: ENABLED === 'true': true
// WHY: Compare to string 'true', or use a helper function.

// Helper function for boolean env vars
function envBool(name, defaultVal = false) {
  const val = process.env[name];
  if (val === undefined) return defaultVal;
  return val === 'true' || val === '1' || val === 'yes';
}

console.log(`envBool('ENABLED'): ${envBool('ENABLED')}`);
// Output: envBool('ENABLED'): true

// ──────────────────────────────────────────────────────────
// NODE_ENV conventions
// ──────────────────────────────────────────────────────────

console.log('\n--- NODE_ENV conventions ---');
// WHY: NODE_ENV is the universally agreed-upon variable for
// environment mode. Frameworks like Express check it.
//
// Common values:
//   'development' — verbose logging, detailed errors, hot reload
//   'production'  — minified, no stack traces to users, caching
//   'test'        — test database, mocked services
//
// Express uses NODE_ENV to toggle view caching, error detail, etc.
// Setting NODE_ENV=production can improve Express perf by 3x.

const env = process.env.NODE_ENV || 'development';
const config = {
  development: { logLevel: 'debug', showErrors: true },
  production:  { logLevel: 'error', showErrors: false },
  test:        { logLevel: 'warn',  showErrors: true },
};
console.log(`Current env: ${env}`);
console.log('Config:', config[env] || config.development);
// Output: Current env: development
// Output: Config: { logLevel: 'debug', showErrors: true }

// ──────────────────────────────────────────────────────────
// Useful Node.js environment variables (in comments)
// ──────────────────────────────────────────────────────────
// NODE_DEBUG=http,net    — enables debug output for core modules
// NODE_OPTIONS=--max-old-space-size=4096  — pass CLI flags via env
// NODE_PATH=/extra/modules — additional module search paths
// NODE_EXTRA_CA_CERTS=./ca.pem — extra SSL certificates
// UV_THREADPOOL_SIZE=16  — increase libuv thread pool (default 4)

// Clean up our test env vars
delete process.env.PORT;
delete process.env.ENABLED;
delete process.env.MAX_RETRIES;
delete process.env.TIMEOUT;

// ============================================================
// EXAMPLE BLOCK 2 — Build a Dotenv Reader from Scratch
// ============================================================

console.log('\n=== Building the office manual (.env reader) from scratch ===\n');

// ──────────────────────────────────────────────────────────
// Create a temporary .env file to parse
// ──────────────────────────────────────────────────────────

const tmpDir = os.tmpdir();
const envFilePath = path.join(tmpDir, `.env-demo-${process.pid}`);

const envFileContent = `
# Department configuration (circular no. 2024/ENV/001)
DEPT_HOST=localhost
DEPT_PORT=5432
DEPT_NAME=sarkari_office_dev

# Feature flags
ENABLE_AUDIT=true

# Quoted values (single and double)
OFFICE_NAME="Sarkari Karyalaya"
GREETING='Namaste Adhikari'

# Empty lines are skipped

# Numeric value (still stored as string!)
MAX_BABUS=100

# Value with equals sign in it
DATABASE_URL=postgres://clerk:pass@host:5432/db?ssl=true

# Inline comment after value
CIRCULAR_KEY=secret123   # this is a comment
`.trim();

fs.writeFileSync(envFilePath, envFileContent, 'utf8');
console.log(`Created temp .env file at: ${envFilePath}`);

// ──────────────────────────────────────────────────────────
// The dotenv parser — handles comments, quotes, empty lines
// ──────────────────────────────────────────────────────────

function parseDotenv(filePath) {
  // WHY: We build this to understand what the `dotenv` npm package does.
  // It's surprisingly simple — just reading lines and splitting on '='.

  const result = {};

  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log(`  .env file not found at ${filePath} — skipping`);
      return result;
    }
    throw err;
  }

  const lines = content.split('\n');

  for (const line of lines) {
    // Skip empty lines and comments
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Split on FIRST '=' only (value may contain '=')
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    // Remove inline comments (but not inside quotes)
    if (!value.startsWith('"') && !value.startsWith("'")) {
      const commentIndex = value.indexOf('#');
      if (commentIndex > 0) {
        value = value.slice(0, commentIndex).trim();
      }
    }

    // Remove surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}

const parsed = parseDotenv(envFilePath);
console.log('\nParsed .env contents:');
for (const [key, value] of Object.entries(parsed)) {
  console.log(`  ${key} = ${value}`);
}
// Output:   DEPT_HOST = localhost
// Output:   DEPT_PORT = 5432
// Output:   DEPT_NAME = sarkari_office_dev
// Output:   ENABLE_AUDIT = true
// Output:   OFFICE_NAME = Sarkari Karyalaya
// Output:   GREETING = Namaste Adhikari
// Output:   MAX_BABUS = 100
// Output:   DATABASE_URL = postgres://clerk:pass@host:5432/db?ssl=true
// Output:   CIRCULAR_KEY = secret123

// ──────────────────────────────────────────────────────────
// Config hierarchy: env var > .env file > default
// ──────────────────────────────────────────────────────────
// WHY: Real apps layer configs. Environment variables override
// .env file values, which override hardcoded defaults.
// This lets ops override developer settings without code changes.

console.log('\n--- Config hierarchy demo ---');

function getConfig(envVars) {
  const defaults = {
    DEPT_HOST: 'localhost',
    DEPT_PORT: '5432',
    DEPT_NAME: 'sarkari_office',
    OFFICE_NAME: 'Default Karyalaya',
    MAX_BABUS: '10',
  };

  const config = {};
  for (const key of Object.keys(defaults)) {
    // Priority: real env var > .env file > default
    config[key] = process.env[key] || envVars[key] || defaults[key];
  }
  return config;
}

const finalConfig = getConfig(parsed);
console.log('Final config (env > .env > defaults):');
for (const [key, value] of Object.entries(finalConfig)) {
  console.log(`  ${key}: ${value}`);
}
// Output:   DEPT_HOST: localhost
// Output:   DEPT_PORT: 5432
// Output:   DEPT_NAME: sarkari_office_dev       (from .env, overrides default)
// Output:   OFFICE_NAME: Sarkari Karyalaya      (from .env, overrides default)
// Output:   MAX_BABUS: 100                      (from .env, overrides default)

// ──────────────────────────────────────────────────────────
// Clean up the temp .env file
// ──────────────────────────────────────────────────────────

fs.unlinkSync(envFilePath);
console.log(`\nCleaned up temp .env file`);

// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. process.env values are ALWAYS strings — never numbers or
//    booleans. Always convert explicitly.
// 2. Use ?? (nullish coalescing) instead of || for defaults
//    when 0, "", or "false" are valid values.
// 3. process.env.ENABLED === true is ALWAYS false. Compare
//    to 'true' (string) or use a helper function.
// 4. NODE_ENV is the standard for environment mode. Setting it
//    to 'production' enables optimizations in many frameworks.
// 5. A dotenv reader is just: read file, split lines, parse
//    key=value, skip comments, strip quotes.
// 6. Config hierarchy: env var > .env file > defaults.
//    This lets each layer override the one below it.
// 7. Never commit .env files with secrets to version control.
//    Use .env.example with placeholder values instead.
// 8. NODE_DEBUG, NODE_OPTIONS, UV_THREADPOOL_SIZE are powerful
//    Node-specific environment variables for debugging/tuning.
// ============================================================

console.log('\nThe Sarkari Office rests, perfectly configured by the latest circular.');
