/** ============================================================
 *  FILE 21: App Settings — Configure Express Behavior
 *  WHY THIS MATTERS: Express has a built-in key-value settings
 *  system that controls everything from JSON formatting to
 *  routing sensitivity to proxy trust. Knowing these settings
 *  lets you tune Express behavior without extra packages, and
 *  app.locals / res.locals are the correct way to share data
 *  across middleware and templates.
 *  ============================================================ */

// ─── The Municipal Corporation Config ────────────────────────
//
// Commissioner Meena manages the Nagar Nigam (Municipal
// Corporation) office. Every switch and dial in the office
// changes how city services behave: one controls water supply
// schedules, another sets property tax thresholds, a third
// toggles between development ward and production ward modes.
//
// Express works the same way. app.set() is your control panel.
// Each setting name is a dial that changes framework behavior.
// Some settings are boolean (on/off switches), others take
// values. And app.locals is the shared notice board where
// you post information that every department in the office
// can read.
//
// (See nodejs-notes/08 for raw HTTP server fundamentals)

const express = require('express');
const http = require('http');

// ════════════════════════════════════════════════════════════════
// BLOCK 1 — App Settings Demo (each setting with behavior)
// ════════════════════════════════════════════════════════════════

// ─── Express settings at a glance ─────────────────────────────
//
//  Setting              Default     What it does
//  ──────────────────── ─────────── ────────────────────────────
//  env                  NODE_ENV    'development' or 'production'
//  etag                 'weak'      ETag generation for caching
//  query parser         'simple'    URL query string parser
//  strict routing       false       /foo and /foo/ are same
//  case sensitive routing false     /Foo and /foo are same
//  json spaces          undefined   Pretty-print JSON responses
//  trust proxy          false       Trust X-Forwarded-* headers
//  x-powered-by         true        Send X-Powered-By header
//  json escape          false       Escape JSON for HTML safety

function block1_appSettings() {
  return new Promise((resolve) => {
    const app = express();

    console.log('=== BLOCK 1: App Settings Demo ===\n');

    // ─── app.set() / app.get() — the settings API ────────────
    // WHY: app.set(name, value) stores a setting; app.get(name)
    // retrieves it. Note: app.get(path, handler) is ALSO the
    // route method — Express distinguishes by argument count.

    // ─── Setting: 'env' — environment mode ────────────────────
    console.log('--- Setting: env ---');
    console.log('Default env:', app.get('env'));
    // Output: Default env: development
    // WHY: Defaults to process.env.NODE_ENV or 'development'.
    // Express may change error verbosity based on this.

    // ─── Setting: 'json spaces' — pretty-print JSON ──────────
    console.log('\n--- Setting: json spaces ---');
    console.log('Default json spaces:', app.get('json spaces'));
    // Output: Default json spaces: undefined
    app.set('json spaces', 2);
    console.log('After set:', app.get('json spaces'));
    // Output: After set: 2
    // WHY: With json spaces = 2, res.json() output is indented
    // for readability. Great for development, remove in production
    // to save bandwidth.

    // ─── Setting: 'etag' — response caching ──────────────────
    console.log('\n--- Setting: etag ---');
    console.log('Default etag:', app.get('etag'));
    // Output: Default etag: weak
    // WHY: Weak ETags let browsers cache responses and send
    // If-None-Match headers for 304 Not Modified responses.
    // Options: true, false, 'weak', 'strong', or a function.

    // ─── Setting: 'query parser' — URL query parsing ──────────
    console.log('\n--- Setting: query parser ---');
    console.log('Default query parser:', app.get('query parser'));
    // Output: Default query parser: simple
    // WHY: Express 5 uses 'simple' (Node's querystring module)
    // by default. Set to 'extended' for nested objects with qs,
    // or false to disable, or pass a custom function.

    // ─── Setting: 'strict routing' ────────────────────────────
    console.log('\n--- Setting: strict routing ---');
    console.log('Default strict routing:', app.get('strict routing'));
    // Output: Default strict routing: undefined
    // WHY: When false (default), /foo and /foo/ match the same
    // route. Enable to treat them as different endpoints.

    // ─── Setting: 'case sensitive routing' ────────────────────
    console.log('\n--- Setting: case sensitive routing ---');
    console.log('Default case sensitive routing:', app.get('case sensitive routing'));
    // Output: Default case sensitive routing: undefined
    // WHY: When false (default), /Foo and /foo match the same
    // route. Enable for case-sensitive URL matching.

    // ─── Setting: 'x-powered-by' ─────────────────────────────
    console.log('\n--- Setting: x-powered-by ---');
    console.log('Default x-powered-by:', app.get('x-powered-by'));
    // Output: Default x-powered-by: true
    // WHY: Express sends "X-Powered-By: Express" by default.
    // Disable it in production — it reveals your tech stack to
    // attackers who scan for known Express vulnerabilities.

    // ─── app.enable() / app.disable() — boolean shortcuts ─────
    console.log('\n--- app.enable() / app.disable() ---');
    app.enable('strict routing');
    console.log('After enable strict routing:', app.get('strict routing'));
    // Output: After enable strict routing: true
    // WHY: app.enable(name) is shorthand for app.set(name, true).
    // app.disable(name) is shorthand for app.set(name, false).

    app.enable('case sensitive routing');
    console.log('After enable case sensitive routing:', app.get('case sensitive routing'));
    // Output: After enable case sensitive routing: true

    app.disable('x-powered-by');
    console.log('After disable x-powered-by:', app.get('x-powered-by'));
    // Output: After disable x-powered-by: false

    app.disable('etag');
    // WHY: Disabling etag stops Express from generating ETags —
    // useful if you handle caching at a CDN/reverse proxy layer.

    // ─── Setting: 'trust proxy' — behind a reverse proxy ──────
    console.log('\n--- Setting: trust proxy ---');
    app.set('trust proxy', 'loopback');
    console.log('trust proxy:', app.get('trust proxy'));
    // Output: trust proxy: loopback
    // WHY: When behind nginx/ALB, the client IP is in
    // X-Forwarded-For. trust proxy tells Express to read it.
    // Values: true, false, 'loopback', '10.0.0.0/8', number, function.

    // IMPORTANT: Set routing settings BEFORE any app.use() or
    // route definitions. Express 5 compiles route layers when
    // they are registered, and routing settings like 'strict
    // routing' and 'case sensitive routing' are baked in at
    // that point. Changing them after routes are added has NO
    // effect on those already-registered routes.

    // ─── NOW add middleware (after settings are configured) ────
    app.use(express.json());
    // WHY: express.json() parses incoming JSON request bodies.
    // We add it AFTER setting routing options above.

    // ─── Routes to demonstrate settings behavior ──────────────

    // JSON spaces test
    app.get('/api/config', (req, res) => {
      res.json({ name: 'NagarNigam', version: 3, active: true });
    });

    // Strict routing test — /strict and /strict/ are different
    app.get('/strict', (req, res) => {
      res.json({ route: '/strict', trailing: false });
    });
    app.get('/strict/', (req, res) => {
      res.json({ route: '/strict/', trailing: true });
    });

    // Case sensitive test — we already enabled it above
    app.get('/CasePath', (req, res) => {
      res.json({ route: '/CasePath', matched: true });
    });

    // Trust proxy — show req.ip
    app.get('/my-ip', (req, res) => {
      res.json({
        ip: req.ip,
        ips: req.ips,
        hostname: req.hostname,
        protocol: req.protocol,
      });
    });

    // Query parser demo
    app.get('/search', (req, res) => {
      res.json({ query: req.query, type: typeof req.query });
    });

    const server = app.listen(0, async () => {
      const port = server.address().port;
      const base = `http://127.0.0.1:${port}`;
      console.log(`\nServer running on port ${port}\n`);

      try {
        // ─── Test json spaces = 2 — pretty-printed output ─────
        console.log('--- Test: json spaces ---');
        const configRes = await fetch(`${base}/api/config`);
        const configText = await configRes.text();
        console.log('GET /api/config (pretty-printed):');
        console.log(configText);
        // Output: {
        // Output:   "name": "NagarNigam",
        // Output:   "version": 3,
        // Output:   "active": true
        // Output: }
        // WHY: json spaces = 2 makes res.json() indent the output.

        // ─── Test x-powered-by disabled ───────────────────────
        console.log('--- Test: x-powered-by disabled ---');
        const xpb = configRes.headers.get('x-powered-by');
        console.log('X-Powered-By header:', xpb);
        // Output: X-Powered-By header: null
        // WHY: We disabled it — header is no longer sent.

        // ─── Test etag disabled ───────────────────────────────
        console.log('\n--- Test: etag disabled ---');
        const etag = configRes.headers.get('etag');
        console.log('ETag header:', etag);
        // Output: ETag header: null
        // WHY: With etag disabled, no ETag is generated.

        // ─── Test strict routing ──────────────────────────────
        console.log('\n--- Test: strict routing ---');
        const strictRes = await fetch(`${base}/strict`);
        const strictData = await strictRes.json();
        console.log('GET /strict:', JSON.stringify(strictData));
        // Output: GET /strict: {"route":"/strict","trailing":false}

        const strictSlashRes = await fetch(`${base}/strict/`);
        const strictSlashData = await strictSlashRes.json();
        console.log('GET /strict/:', JSON.stringify(strictSlashData));
        // Output: GET /strict/: {"route":"/strict/","trailing":true}
        // WHY: With strict routing enabled, /strict and /strict/
        // hit DIFFERENT route handlers — they're distinct URLs.

        // ─── Test case sensitive routing ───────────────────────
        console.log('\n--- Test: case sensitive routing ---');
        const caseRes = await fetch(`${base}/CasePath`);
        console.log('GET /CasePath status:', caseRes.status);
        // Output: GET /CasePath status: 200

        const caseLowerRes = await fetch(`${base}/casepath`);
        console.log('GET /casepath status:', caseLowerRes.status);
        // Output: GET /casepath status: 404
        // WHY: With case sensitive routing enabled, /casepath does
        // NOT match /CasePath — they're different routes.

        // ─── Test trust proxy / req.ip ────────────────────────
        console.log('\n--- Test: trust proxy ---');
        const ipRes = await fetch(`${base}/my-ip`, {
          headers: { 'X-Forwarded-For': '203.0.113.50' },
        });
        const ipData = await ipRes.json();
        console.log('req.ip:', ipData.ip);
        // Output: req.ip: 203.0.113.50
        // WHY: With trust proxy = 'loopback', Express trusts that
        // the loopback connection (127.0.0.1) is a proxy and reads
        // the client's real IP from X-Forwarded-For. Without this
        // setting, req.ip would be the proxy's IP (127.0.0.1).

        // ─── Test query parser ────────────────────────────────
        console.log('\n--- Test: query parser ---');
        const searchRes = await fetch(`${base}/search?ward=east&zone=central`);
        const searchData = await searchRes.json();
        console.log('Query result:', JSON.stringify(searchData.query));
        // Output: Query result: {"ward":"east","zone":"central"}
      } catch (err) {
        console.error('Test error:', err.message);
      }

      server.close(() => {
        console.log('\nBlock 1 server closed.\n');
        resolve();
      });
    });
  });
}

// ════════════════════════════════════════════════════════════════
// BLOCK 2 — app.locals, res.locals, Sub-App Mounting
// ════════════════════════════════════════════════════════════════

// ─── Sharing data across the app ──────────────────────────────
//
//  app.locals   — persistent, app-wide data (config, version)
//  res.locals   — per-request data (user info, request ID)
//  mountpath    — the path prefix where a sub-app is mounted
//
// Think of app.locals as the Nagar Nigam's permanent notice
// board, and res.locals as the daily attendance register that
// gets cleared when the shift (request) ends.

function block2_localsAndMounting() {
  return new Promise((resolve) => {
    // ─── Main application ─────────────────────────────────────
    const app = express();

    // ─── app.locals — app-wide variables ──────────────────────
    app.locals.appName = 'NagarNigam';
    app.locals.version = '2.5.0';
    app.locals.startedAt = new Date().toISOString();
    app.locals.config = {
      maxUploadSize: '10mb',
      defaultLanguage: 'hi',
      maintenanceMode: false,
    };
    // WHY: app.locals persists for the lifetime of the app.
    // Perfect for configuration, version strings, and shared
    // utilities. In template engines, app.locals are automatically
    // available in every rendered view.

    // ─── Middleware that sets res.locals ───────────────────────
    app.use((req, res, next) => {
      // Generate a unique request ID for tracing
      res.locals.requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      res.locals.requestTime = Date.now();
      // WHY: res.locals is scoped to this single request/response
      // cycle. Each request gets its own requestId — they never
      // leak between concurrent requests. This is the CORRECT
      // place for per-request data (not req.customProp).
      next();
    });

    // ─── Route that reads both locals ─────────────────────────
    app.get('/status', (req, res) => {
      res.json({
        app: {
          name: req.app.locals.appName,
          version: req.app.locals.version,
          startedAt: req.app.locals.startedAt,
          config: req.app.locals.config,
        },
        request: {
          id: res.locals.requestId,
          elapsed: Date.now() - res.locals.requestTime + 'ms',
        },
      });
      // WHY: Inside a route, req.app.locals gives you the
      // app-level data, and res.locals gives request-level data.
    });

    // ─── Route that modifies res.locals through middleware chain ──
    app.get('/profile',
      // Middleware 1: simulate auth lookup
      (req, res, next) => {
        res.locals.user = { id: 42, name: 'Meena', role: 'commissioner' };
        // WHY: Auth middleware sets res.locals.user so downstream
        // handlers can access the authenticated user without
        // attaching custom properties to req.
        next();
      },
      // Middleware 2: add permissions based on role
      (req, res, next) => {
        const role = res.locals.user.role;
        res.locals.permissions = role === 'commissioner'
          ? ['read', 'write', 'admin']
          : ['read'];
        next();
      },
      // Final handler: use accumulated res.locals
      (req, res) => {
        res.json({
          user: res.locals.user,
          permissions: res.locals.permissions,
          requestId: res.locals.requestId,
        });
      }
    );

    // ─── Sub-app (separate Express instance) ──────────────────
    const taxApp = express();
    // WHY: Sub-apps let you organize code into modules. Each
    // sub-app is a full Express instance with its own settings,
    // middleware, and routes. You mount it at a path prefix.

    // ─── app.on('mount') — fires when sub-app is mounted ──────
    taxApp.on('mount', function onMount(parent) {
      console.log('  Tax sub-app mounted!');
      console.log('  Parent app name:', parent.locals.appName);
      // WHY: The 'mount' event gives the sub-app access to the
      // parent app. Useful for inheriting config or registering
      // cleanup handlers.
    });

    // ─── Sub-app locals (independent from parent) ─────────────
    taxApp.locals.section = 'tax';
    taxApp.locals.requiredRole = 'tax-officer';

    taxApp.get('/dashboard', (req, res) => {
      res.json({
        section: req.app.locals.section,
        mountpath: req.app.mountpath,
        // WHY: app.mountpath tells you WHERE this sub-app was
        // mounted. Inside taxApp, mountpath = '/tax'.
        parentApp: req.app.parent ? req.app.parent.locals.appName : 'none',
        message: 'Welcome to property tax dashboard',
      });
    });

    taxApp.get('/settings', (req, res) => {
      res.json({
        mountpath: req.app.mountpath,
        requiredRole: req.app.locals.requiredRole,
        availableSettings: ['property-tax', 'water-tax', 'trade-license'],
      });
    });

    // ─── Mount sub-app at /tax prefix ─────────────────────────
    console.log('=== BLOCK 2: app.locals, res.locals, Sub-App Mounting ===\n');
    console.log('Mounting tax sub-app at /tax...');
    app.use('/tax', taxApp);
    // WHY: app.use('/tax', taxApp) mounts the entire tax
    // app under /tax. taxApp's '/' route becomes '/tax/',
    // and '/dashboard' becomes '/tax/dashboard'.

    // ─── Second sub-app to show multiple mounts ───────────────
    const apiApp = express();
    apiApp.locals.apiVersion = 'v2';

    apiApp.get('/info', (req, res) => {
      res.json({
        apiVersion: req.app.locals.apiVersion,
        mountpath: req.app.mountpath,
        parentName: req.app.parent ? req.app.parent.locals.appName : 'none',
      });
    });

    app.use('/api/v2', apiApp);

    // ─── Route to show all app.locals ─────────────────────────
    app.get('/locals-dump', (req, res) => {
      // Filter out Express internal properties
      const locals = {};
      for (const key of Object.keys(app.locals)) {
        if (key !== 'settings') {
          locals[key] = app.locals[key];
        }
      }
      res.json({ appLocals: locals });
    });

    const server = app.listen(0, async () => {
      const port = server.address().port;
      const base = `http://127.0.0.1:${port}`;
      console.log(`Server running on port ${port}\n`);

      try {
        // ─── Test app.locals in /status ───────────────────────
        console.log('--- Test: app.locals and res.locals ---');
        const statusRes = await fetch(`${base}/status`);
        const statusData = await statusRes.json();
        console.log('GET /status app.name:', statusData.app.name);
        // Output: GET /status app.name: NagarNigam
        console.log('GET /status app.version:', statusData.app.version);
        // Output: GET /status app.version: 2.5.0
        console.log('GET /status request.id:', statusData.request.id.substring(0, 4) + '...');
        // Output: GET /status request.id: req-...
        console.log('GET /status config:', JSON.stringify(statusData.app.config));
        // Output: GET /status config: {"maxUploadSize":"10mb","defaultLanguage":"hi","maintenanceMode":false}
        // WHY: app.locals.config is accessible from any route handler.

        // ─── Test res.locals chain through middleware ──────────
        console.log('\n--- Test: res.locals middleware chain ---');
        const profileRes = await fetch(`${base}/profile`);
        const profileData = await profileRes.json();
        console.log('GET /profile user:', JSON.stringify(profileData.user));
        // Output: GET /profile user: {"id":42,"name":"Meena","role":"commissioner"}
        console.log('GET /profile permissions:', JSON.stringify(profileData.permissions));
        // Output: GET /profile permissions: ["read","write","admin"]
        console.log('GET /profile requestId:', profileData.requestId.substring(0, 4) + '...');
        // Output: GET /profile requestId: req-...
        // WHY: res.locals accumulates data as it flows through
        // multiple middleware — each adds its piece.

        // ─── Verify res.locals is per-request ─────────────────
        console.log('\n--- Test: res.locals per-request isolation ---');
        const [r1, r2] = await Promise.all([
          fetch(`${base}/status`).then((r) => r.json()),
          fetch(`${base}/status`).then((r) => r.json()),
        ]);
        const id1 = r1.request.id;
        const id2 = r2.request.id;
        console.log('Request 1 ID:', id1.substring(0, 15) + '...');
        console.log('Request 2 ID:', id2.substring(0, 15) + '...');
        console.log('IDs are different:', id1 !== id2);
        // Output: IDs are different: true
        // WHY: Each request gets its own res.locals — proving
        // there's no cross-request contamination.

        // ─── Test sub-app mounting and mountpath ──────────────
        console.log('\n--- Test: Sub-app mounting ---');
        const dashRes = await fetch(`${base}/tax/dashboard`);
        const dashData = await dashRes.json();
        console.log('GET /tax/dashboard:', JSON.stringify(dashData));
        // Output: GET /tax/dashboard: {"section":"tax","mountpath":"/tax","parentApp":"NagarNigam","message":"Welcome to property tax dashboard"}
        // WHY: mountpath is '/tax' — the sub-app knows where
        // it was mounted even though its route is just '/dashboard'.

        const settingsRes = await fetch(`${base}/tax/settings`);
        const settingsData = await settingsRes.json();
        console.log('GET /tax/settings mountpath:', settingsData.mountpath);
        // Output: GET /tax/settings mountpath: /tax

        // ─── Test second sub-app ──────────────────────────────
        console.log('\n--- Test: Second sub-app (API v2) ---');
        const apiRes = await fetch(`${base}/api/v2/info`);
        const apiData = await apiRes.json();
        console.log('GET /api/v2/info:', JSON.stringify(apiData));
        // Output: GET /api/v2/info: {"apiVersion":"v2","mountpath":"/api/v2","parentName":"NagarNigam"}
        // WHY: Each sub-app has its own mountpath and locals, but
        // can reference the parent app for shared configuration.

        // ─── Test locals dump ─────────────────────────────────
        console.log('\n--- Test: All app.locals ---');
        const dumpRes = await fetch(`${base}/locals-dump`);
        const dumpData = await dumpRes.json();
        console.log('All app.locals keys:', Object.keys(dumpData.appLocals).join(', '));
        // Output: All app.locals keys: appName, version, startedAt, config
      } catch (err) {
        console.error('Test error:', err.message);
      }

      server.close(() => {
        console.log('\nBlock 2 server closed.\n');
        resolve();
      });
    });
  });
}

// ════════════════════════════════════════════════════════════════
// Run all blocks sequentially, then exit
// ════════════════════════════════════════════════════════════════

async function main() {
  await block1_appSettings();
  await block2_localsAndMounting();

  console.log('=== KEY TAKEAWAYS ===');
  console.log('1. app.set(name, value) and app.get(name) control Express behavior.');
  console.log('2. app.enable()/app.disable() are shortcuts for boolean settings.');
  console.log('3. "json spaces" pretty-prints res.json() — great for dev, skip in prod.');
  console.log('4. "trust proxy" is REQUIRED behind reverse proxies for correct req.ip.');
  console.log('5. "strict routing" and "case sensitive routing" change URL matching.');
  console.log('6. Disable "x-powered-by" in production to hide your tech stack.');
  console.log('7. app.locals persist for the app lifetime — use for config and constants.');
  console.log('8. res.locals are per-request — use for user data, request IDs, timing.');
  console.log('9. Sub-apps have their own locals and settings, mounted at a path prefix.');
  console.log('10. app.mountpath tells a sub-app where it was mounted in the parent.');

  process.exit(0);
}

main();
