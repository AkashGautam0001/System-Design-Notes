/** ============================================================
 *  FILE 18: Security Headers — Fortifying Your Express App
 *  WHY THIS MATTERS: Security headers are your first line of
 *  defense against XSS, clickjacking, MIME-sniffing, and other
 *  attacks. Understanding each header's purpose lets you configure
 *  them correctly instead of cargo-culting helmet defaults.
 *  ============================================================ */

// THE CASTLE FORTIFICATIONS
// ──────────────────────────────────────────────────────────────
// The Master Builder surveys the castle walls. Each fortification
// serves a specific purpose:
//
// - The DRAWBRIDGE (X-Frame-Options) prevents enemies from
//   embedding the castle inside their own fortress (clickjacking).
// - The FOOD TASTER (X-Content-Type-Options) ensures provisions
//   are what they claim to be (MIME-sniffing).
// - The HERALD (Referrer-Policy) controls what information
//   messengers carry when leaving the castle.
// - The ROYAL DECREE (Content-Security-Policy) dictates exactly
//   which resources the kingdom trusts.
// - The SEALED ROAD (Strict-Transport-Security) forces all
//   travelers to use the secure, encrypted highway.
// - The BANNER REMOVER (X-Powered-By) hides which kingdom
//   built the castle, denying attackers reconnaissance.
//
// We build each fortification by hand, understanding its purpose.
// ──────────────────────────────────────────────────────────────

const express = require('express');
const http = require('http');

// (See nodejs-notes/11 for HTTP headers fundamentals)


// ============================================================
// BLOCK 1 — Security Headers Middleware
// ============================================================
//
// THE HEADERS AND WHY EACH EXISTS:
// ──────────────────────────────────────────────────────────────
//
// 1. X-Content-Type-Options: nosniff
//    ATTACK: Browser guesses MIME type, executes JS hidden in an image
//    FIX: Force browser to trust the Content-Type header only
//
// 2. X-Frame-Options: DENY (or SAMEORIGIN)
//    ATTACK: Attacker embeds your site in an <iframe> with a transparent
//            overlay, tricking users into clicking your buttons (clickjacking)
//    FIX: Prevent your site from being framed
//
// 3. X-XSS-Protection: 0
//    HISTORY: Old browsers had a built-in XSS filter, but it was
//             unreliable and could be exploited. Modern best practice
//             is to DISABLE it and rely on CSP instead.
//
// 4. Strict-Transport-Security (HSTS)
//    ATTACK: Man-in-the-middle downgrades HTTPS to HTTP
//    FIX: Tell the browser "ONLY use HTTPS for this domain, forever"
//
// 5. Content-Security-Policy (CSP)
//    ATTACK: XSS — attacker injects a <script> tag that runs their code
//    FIX: Whitelist exactly which sources can provide scripts, styles, etc.
//
// 6. Referrer-Policy
//    LEAK: When a user clicks a link, the Referer header reveals the full URL
//          (possibly including tokens, user IDs, private paths)
//    FIX: Control how much URL info is sent to other sites
//
// 7. Permissions-Policy
//    ATTACK: Malicious iframe accesses camera, microphone, geolocation
//    FIX: Explicitly disable browser features your app doesn't need
//
// 8. X-Powered-By removal
//    RISK: "X-Powered-By: Express" tells attackers your exact framework
//    FIX: Remove or disable the header
// ──────────────────────────────────────────────────────────────

/**
 * Create a security headers middleware that sets all recommended
 * security headers on every response. Like helmet, but transparent.
 *
 * @param {object} options - Configuration for each header
 * @param {string} options.frameOptions - "DENY" | "SAMEORIGIN" (default: "DENY")
 * @param {boolean} options.noSniff - Set X-Content-Type-Options (default: true)
 * @param {boolean} options.xssProtection - Disable legacy XSS filter (default: true, sets to "0")
 * @param {object} options.hsts - HSTS options { maxAge, includeSubDomains, preload }
 * @param {string} options.referrerPolicy - Referrer-Policy value (default: "strict-origin-when-cross-origin")
 * @param {object} options.permissionsPolicy - Map of feature => allowlist
 * @param {string} options.csp - Content-Security-Policy string (or null to skip)
 * @param {boolean} options.removePoweredBy - Remove X-Powered-By header (default: true)
 * @returns {Function} Express middleware
 */
function securityHeaders(options = {}) {
  const {
    frameOptions = 'DENY',
    noSniff = true,
    xssProtection = true,
    hsts = null,
    referrerPolicy = 'strict-origin-when-cross-origin',
    permissionsPolicy = null,
    csp = null,
    removePoweredBy = true
  } = options;

  return (req, res, next) => {
    // ── 1. X-Content-Type-Options ─────────────────────────────
    if (noSniff) {
      // WHY: Without this, a browser might interpret a text file as JavaScript
      // if it "looks like" JS. "nosniff" forces the browser to respect the
      // declared Content-Type and refuse to execute mismatched types.
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }

    // ── 2. X-Frame-Options ────────────────────────────────────
    if (frameOptions) {
      // WHY: DENY = never allow framing. SAMEORIGIN = only your own site
      // can frame itself. Prevents clickjacking attacks.
      res.setHeader('X-Frame-Options', frameOptions);
    }

    // ── 3. X-XSS-Protection ──────────────────────────────────
    if (xssProtection) {
      // WHY: Setting to "0" DISABLES the legacy XSS auditor.
      // The old "1; mode=block" setting was found to INTRODUCE
      // vulnerabilities in some browsers. Modern defense uses CSP.
      res.setHeader('X-XSS-Protection', '0');
    }

    // ── 4. Strict-Transport-Security (HSTS) ──────────────────
    if (hsts) {
      // WHY: After the browser sees this header once (over HTTPS),
      // it will REFUSE to connect over HTTP for the specified duration.
      // This prevents SSL-stripping attacks.
      let value = `max-age=${hsts.maxAge || 31536000}`; // default 1 year

      if (hsts.includeSubDomains) {
        // WHY: Protects all subdomains too (api.example.com, cdn.example.com)
        value += '; includeSubDomains';
      }

      if (hsts.preload) {
        // WHY: Allows your domain to be added to browsers' built-in
        // HSTS list, so HTTPS is enforced even on the FIRST visit.
        // Submit to: https://hstspreload.org
        value += '; preload';
      }

      res.setHeader('Strict-Transport-Security', value);
    }

    // ── 5. Content-Security-Policy ────────────────────────────
    if (csp) {
      // WHY: CSP is the most powerful anti-XSS defense.
      // It tells the browser: "Only load scripts/styles/images from
      // these exact sources. Block everything else."
      res.setHeader('Content-Security-Policy', csp);
    }

    // ── 6. Referrer-Policy ────────────────────────────────────
    if (referrerPolicy) {
      // WHY: Controls the Referer header sent when navigating away.
      // "strict-origin-when-cross-origin" sends:
      //   - Full URL for same-origin requests
      //   - Only the origin (no path) for cross-origin
      //   - Nothing when downgrading HTTPS -> HTTP
      res.setHeader('Referrer-Policy', referrerPolicy);
    }

    // ── 7. Permissions-Policy ─────────────────────────────────
    if (permissionsPolicy) {
      // WHY: Restricts browser features (camera, mic, geolocation).
      // If your app doesn't use the camera, disable it so even XSS
      // can't access it.
      //
      // Format: feature=(allowlist), feature2=(allowlist)
      // Examples: camera=(), geolocation=(self), microphone=(self "https://partner.com")
      const directives = Object.entries(permissionsPolicy)
        .map(([feature, allowlist]) => `${feature}=(${allowlist})`)
        .join(', ');
      res.setHeader('Permissions-Policy', directives);
    }

    // ── 8. Remove X-Powered-By ────────────────────────────────
    if (removePoweredBy) {
      // WHY: "X-Powered-By: Express" is free reconnaissance for attackers.
      // They can look up known Express vulnerabilities.
      res.removeHeader('X-Powered-By');
    }

    next();
  };
}


// ============================================================
// BLOCK 2 — CSP Configuration Builder, HSTS Options, Per-Route Overrides
// ============================================================

/**
 * CSP Directive Builder — Construct Content-Security-Policy strings
 * using a fluent, readable API instead of error-prone string concatenation.
 *
 * Common directives:
 * ──────────────────────────────────────────────────────────────
 * default-src  — Fallback for all other directives
 * script-src   — Where JavaScript can be loaded from
 * style-src    — Where CSS can be loaded from
 * img-src      — Where images can be loaded from
 * font-src     — Where fonts can be loaded from
 * connect-src  — Where fetch/XHR/WebSocket can connect to
 * frame-src    — Where <iframe> sources are allowed from
 * object-src   — Where <object>/<embed> sources are allowed from
 * base-uri     — What <base> tag URLs are allowed
 * form-action  — Where forms can submit to
 * report-uri   — Where violation reports are sent
 * ──────────────────────────────────────────────────────────────
 *
 * Source values:
 *   'self'          — Same origin only
 *   'none'          — Block everything
 *   'unsafe-inline' — Allow inline <script>/<style> (defeats CSP purpose)
 *   'unsafe-eval'   — Allow eval() (dangerous)
 *   'nonce-<value>' — Allow specific inline scripts with matching nonce
 *   https:          — Any HTTPS source
 *   *.example.com   — Any subdomain of example.com
 */
class CSPBuilder {
  constructor() {
    this.directives = {};
  }

  /**
   * Add a directive with its sources.
   * @param {string} directive - CSP directive name
   * @param  {...string} sources - Allowed sources
   * @returns {CSPBuilder} this (for chaining)
   */
  add(directive, ...sources) {
    this.directives[directive] = sources;
    return this;
  }

  // ── Convenience methods for common directives ─────────────
  defaultSrc(...sources)  { return this.add('default-src', ...sources); }
  scriptSrc(...sources)   { return this.add('script-src', ...sources); }
  styleSrc(...sources)    { return this.add('style-src', ...sources); }
  imgSrc(...sources)      { return this.add('img-src', ...sources); }
  fontSrc(...sources)     { return this.add('font-src', ...sources); }
  connectSrc(...sources)  { return this.add('connect-src', ...sources); }
  frameSrc(...sources)    { return this.add('frame-src', ...sources); }
  objectSrc(...sources)   { return this.add('object-src', ...sources); }
  baseUri(...sources)     { return this.add('base-uri', ...sources); }
  formAction(...sources)  { return this.add('form-action', ...sources); }

  /**
   * Build the CSP header string.
   * @returns {string} The complete Content-Security-Policy value
   */
  build() {
    // WHY: Each directive is separated by a semicolon.
    // Sources within a directive are space-separated.
    return Object.entries(this.directives)
      .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
      .join('; ');
  }
}

/**
 * Create per-route security header overrides.
 * Some routes need different security settings — e.g., an API
 * route might not need X-Frame-Options, or an admin panel might
 * need a stricter CSP.
 *
 * @param {object} headerOverrides - Map of header name => value (or null to remove)
 * @returns {Function} Express middleware
 */
function overrideHeaders(headerOverrides) {
  return (req, res, next) => {
    // WHY: We wrap res.end to apply overrides just before the response is sent.
    // This ensures our overrides happen AFTER the global middleware.
    const originalEnd = res.end.bind(res);

    res.end = function (...args) {
      for (const [header, value] of Object.entries(headerOverrides)) {
        if (value === null) {
          // WHY: null means "remove this header for this route"
          res.removeHeader(header);
        } else {
          res.setHeader(header, value);
        }
      }
      return originalEnd(...args);
    };

    next();
  };
}


// ============================================================
// SELF-TEST: The Castle Fortifications Are Inspected
// ============================================================

async function runTests() {
  const app = express();

  // WHY: Disable Express's default X-Powered-By at the app level
  app.disable('x-powered-by');

  // ── Build a CSP using our builder ───────────────────────────
  const cspPolicy = new CSPBuilder()
    .defaultSrc("'self'")
    .scriptSrc("'self'", 'https://cdn.example.com')
    .styleSrc("'self'", "'unsafe-inline'")  // Many CSS frameworks need inline styles
    .imgSrc("'self'", 'data:', 'https:')
    .fontSrc("'self'", 'https://fonts.googleapis.com')
    .connectSrc("'self'", 'https://api.example.com')
    .frameSrc("'none'")
    .objectSrc("'none'")
    .baseUri("'self'")
    .formAction("'self'")
    .build();

  // ── Apply global security headers ──────────────────────────
  app.use(securityHeaders({
    frameOptions: 'DENY',
    noSniff: true,
    xssProtection: true,
    hsts: {
      maxAge: 31536000,       // 1 year
      includeSubDomains: true,
      preload: true
    },
    referrerPolicy: 'strict-origin-when-cross-origin',
    permissionsPolicy: {
      camera: '',                    // Block camera access entirely
      microphone: '',                // Block microphone
      geolocation: 'self',           // Only allow for same origin
      'payment': '',                 // Block Payment API
      'interest-cohort': ''          // Block FLoC tracking
    },
    csp: cspPolicy,
    removePoweredBy: true
  }));

  // ── Route 1: Standard page (gets all global headers) ────────
  app.get('/page', (req, res) => {
    res.json({ page: 'standard', message: 'All fortifications active' });
  });

  // ── Route 2: API route with relaxed frame policy ────────────
  app.get('/api/data',
    overrideHeaders({
      'X-Frame-Options': 'SAMEORIGIN',  // Allow same-origin framing for API docs
      'Content-Security-Policy': null    // Remove CSP for API (returns JSON, not HTML)
    }),
    (req, res) => {
      res.json({ api: true, data: [1, 2, 3] });
    }
  );

  // ── Route 3: Embeddable widget (no frame restriction) ───────
  app.get('/widget',
    overrideHeaders({
      'X-Frame-Options': null,  // Remove entirely — allow framing from anywhere
      'Content-Security-Policy': new CSPBuilder()
        .defaultSrc("'self'")
        .scriptSrc("'self'")
        .styleSrc("'self'", "'unsafe-inline'")
        .frameSrc("'none'")
        .build()
    }),
    (req, res) => {
      res.json({ widget: true, embeddable: true });
    }
  );

  const server = app.listen(0, async () => {
    const port = server.address().port;
    const base = `http://127.0.0.1:${port}`;
    console.log(`Castle Fortifications server listening on port ${port}\n`);

    try {
      // ── Test 1: Standard page — all headers present ─────────
      console.log('--- Test 1: Standard Page — All Security Headers ---');
      const res1 = await makeRequest(`${base}/page`);
      console.log('Status:', res1.status);
      // Output: Status: 200
      console.log('X-Content-Type-Options:', res1.headers['x-content-type-options']);
      // Output: X-Content-Type-Options: nosniff
      console.log('X-Frame-Options:', res1.headers['x-frame-options']);
      // Output: X-Frame-Options: DENY
      console.log('X-XSS-Protection:', res1.headers['x-xss-protection']);
      // Output: X-XSS-Protection: 0
      console.log('Strict-Transport-Security:', res1.headers['strict-transport-security']);
      // Output: Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
      console.log('Referrer-Policy:', res1.headers['referrer-policy']);
      // Output: Referrer-Policy: strict-origin-when-cross-origin
      console.log('Permissions-Policy:', res1.headers['permissions-policy']);
      // Output: Permissions-Policy: camera=(), microphone=(), geolocation=(self), payment=(), interest-cohort=()
      console.log('X-Powered-By:', res1.headers['x-powered-by']);
      // Output: X-Powered-By: undefined
      console.log();

      // ── Test 2: Verify CSP header content ───────────────────
      console.log('--- Test 2: CSP Header Content ---');
      const cspHeader = res1.headers['content-security-policy'];
      console.log('CSP:', cspHeader);
      // Output: CSP: default-src 'self'; script-src 'self' https://cdn.example.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https://fonts.googleapis.com; connect-src 'self' https://api.example.com; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'

      // Verify key directives are present
      console.log('Has default-src:', cspHeader.includes("default-src 'self'"));
      // Output: Has default-src: true
      console.log('Has script-src:', cspHeader.includes('script-src'));
      // Output: Has script-src: true
      console.log('Blocks objects:', cspHeader.includes("object-src 'none'"));
      // Output: Blocks objects: true
      console.log();

      // ── Test 3: API route — relaxed headers ─────────────────
      console.log('--- Test 3: API Route — Relaxed Frame Options, No CSP ---');
      const res3 = await makeRequest(`${base}/api/data`);
      console.log('Status:', res3.status);
      // Output: Status: 200
      console.log('X-Frame-Options:', res3.headers['x-frame-options']);
      // Output: X-Frame-Options: SAMEORIGIN
      console.log('CSP present:', res3.headers['content-security-policy'] !== undefined);
      // Output: CSP present: false
      // WHY: API returns JSON, not HTML — CSP is irrelevant
      console.log('Still has nosniff:', res3.headers['x-content-type-options']);
      // Output: Still has nosniff: nosniff
      console.log();

      // ── Test 4: Widget route — no frame restriction ─────────
      console.log('--- Test 4: Widget Route — Embeddable, Custom CSP ---');
      const res4 = await makeRequest(`${base}/widget`);
      console.log('Status:', res4.status);
      // Output: Status: 200
      console.log('X-Frame-Options:', res4.headers['x-frame-options']);
      // Output: X-Frame-Options: undefined
      // WHY: Removed so the widget can be embedded in iframes
      console.log('Custom CSP:', res4.headers['content-security-policy']);
      // Output: Custom CSP: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; frame-src 'none'
      console.log('Still has HSTS:', res4.headers['strict-transport-security'] !== undefined);
      // Output: Still has HSTS: true
      console.log();

      // ── Test 5: Verify X-Powered-By is removed ─────────────
      console.log('--- Test 5: X-Powered-By Removal ---');
      const res5 = await makeRequest(`${base}/page`);
      const hasPoweredBy = 'x-powered-by' in res5.headers;
      console.log('X-Powered-By header exists:', hasPoweredBy);
      // Output: X-Powered-By header exists: false
      // WHY: Removing this header denies attackers framework-specific
      // exploit knowledge. Security through obscurity alone is weak,
      // but it's a free win — why give attackers any information?
      console.log();

      // ── Test 6: CSP Builder demonstration ───────────────────
      console.log('--- Test 6: CSP Builder API Demo ---');
      const strictCSP = new CSPBuilder()
        .defaultSrc("'none'")         // Block everything by default
        .scriptSrc("'self'")          // Only own scripts
        .styleSrc("'self'")           // Only own styles
        .imgSrc("'self'")             // Only own images
        .connectSrc("'self'")         // Only own APIs
        .baseUri("'self'")
        .formAction("'self'")
        .build();
      console.log('Strict CSP:', strictCSP);
      // Output: Strict CSP: default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self'

      const relaxedCSP = new CSPBuilder()
        .defaultSrc("'self'", 'https:')
        .scriptSrc("'self'", "'unsafe-inline'", 'https://cdn.example.com')
        .imgSrc('*')                  // Images from anywhere
        .build();
      console.log('Relaxed CSP:', relaxedCSP);
      // Output: Relaxed CSP: default-src 'self' https:; script-src 'self' 'unsafe-inline' https://cdn.example.com; img-src *
      console.log();

    } catch (err) {
      console.error('Test error:', err.message);
    } finally {
      server.close(() => {
        console.log('Server closed.\n');

        // ── KEY TAKEAWAYS ─────────────────────────────────────
        console.log('KEY TAKEAWAYS:');
        console.log('1. X-Content-Type-Options: nosniff prevents browsers from guessing MIME types (stops script injection via uploads).');
        console.log('2. X-Frame-Options: DENY blocks clickjacking by preventing your site from being embedded in iframes.');
        console.log('3. X-XSS-Protection should be "0" (disabled) — the legacy XSS auditor has known bypasses. Use CSP instead.');
        console.log('4. HSTS (Strict-Transport-Security) prevents HTTPS downgrade attacks — once set, browsers refuse HTTP.');
        console.log('5. Content-Security-Policy is the most powerful XSS defense — whitelist exactly which sources can provide scripts, styles, etc.');
        console.log('6. Referrer-Policy controls what URL information leaks when users navigate away from your site.');
        console.log('7. Permissions-Policy disables browser features (camera, mic) your app does not need, limiting XSS damage.');
        console.log('8. Always remove X-Powered-By — it is free reconnaissance for attackers.');
        console.log('9. Use per-route overrides: APIs may not need CSP, embeddable widgets need relaxed framing rules.');
      });
    }
  });
}

/**
 * Helper: Make an HTTP request and return { status, headers, body }.
 */
function makeRequest(url, method = 'GET', headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method,
      headers
    };

    const req = http.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString();
        let parsed;
        try {
          parsed = JSON.parse(raw);
        } catch {
          parsed = raw;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });

    req.on('error', reject);
    req.end();
  });
}

runTests();
