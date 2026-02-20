/** ============================================================
 *  FILE 14 — Cookies & Sessions from Scratch
 *  Topic: res.cookie(), manual cookie parsing, session system
 *  WHY THIS MATTERS: HTTP is stateless — every request is a
 *  stranger. Cookies and sessions are how we remember users
 *  between requests. Building them from scratch reveals the
 *  mechanism behind express-session, passport, and every
 *  "logged in" experience on the web.
 *  ============================================================ */

// ── THE STORY ──────────────────────────────────────────────
// IRCTC Login Session
// At the IRCTC booking portal, each passenger receives a
// booking reference at login — a unique ticket number. The
// passenger shows this reference (cookie) at every interaction
// — checking PNR status, selecting berth, making payment. The
// IRCTC server (backend) looks up the reference number in
// their booking ledger (session store) to find the passenger's
// name, journey details, and preferences. The cookie itself
// holds no secrets — just a reference number. All the real
// data lives on the server. When the passenger logs out, the
// server tears up the ledger entry. If the reference expires
// (maxAge), it's quietly discarded.
// ───────────────────────────────────────────────────────────

const express = require('express');
const http = require('http');
const crypto = require('crypto');

// ============================================================
// BLOCK 1 — Setting and Reading Cookies (Manual Parser)
// ============================================================
//
// Cookies are sent via the Cookie request header:
//   Cookie: name=value; other=value2
//
// And set via the Set-Cookie response header:
//   Set-Cookie: name=value; HttpOnly; Secure; Max-Age=3600
//
// Express provides res.cookie() for setting, but there's no
// built-in parser for READING cookies. Let's build one.
// (See nodejs-notes/08 for HTTP header fundamentals)

// ── Manual cookie parser middleware ────────────────────────
// WHY: Building this teaches you exactly what the cookie-parser
// npm package does. The Cookie header is just a semicolon-
// separated string of key=value pairs.
function cookieParser() {
  return (req, res, next) => {
    req.cookies = {};

    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) return next();

    // WHY: The Cookie header format is "key=value; key2=value2".
    // We split on "; " and then on "=" (only the first "=",
    // since values can contain "=" in base64).
    cookieHeader.split(';').forEach(pair => {
      const trimmed = pair.trim();
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) return;

      const key = trimmed.substring(0, eqIndex).trim();
      let value = trimmed.substring(eqIndex + 1).trim();

      // WHY: decodeURIComponent handles encoded special chars
      // like spaces (%20) and equals (%3D) in cookie values.
      try {
        value = decodeURIComponent(value);
      } catch (e) {
        // Leave value as-is if decoding fails
      }

      req.cookies[key] = value;
    });

    next();
  };
}

// ============================================================
// BLOCK 2 — Session Middleware from Scratch
// ============================================================
//
// A session system needs:
//   1. A way to generate unique session IDs
//   2. A store to keep session data (Map, Redis, DB, etc.)
//   3. Middleware that:
//      a. Reads the session cookie from the request
//      b. Looks up session data in the store
//      c. Creates a new session if none exists
//      d. Attaches session data to req.session
//      e. Saves changes back to the store after the response
//
// WHY: This is exactly what express-session does. Building it
// yourself means you understand session fixation, cookie flags,
// and store mechanics — critical for security.

class SessionStore {
  constructor() {
    // WHY: Map is perfect for an in-memory store.
    // In production, you'd use Redis or a database.
    this.sessions = new Map();
  }

  create(id) {
    const session = {
      id,
      data: {},
      createdAt: Date.now(),
      lastAccessed: Date.now()
    };
    this.sessions.set(id, session);
    return session;
  }

  get(id) {
    const session = this.sessions.get(id);
    if (session) {
      session.lastAccessed = Date.now();
    }
    return session || null;
  }

  save(id, data) {
    const session = this.sessions.get(id);
    if (session) {
      session.data = data;
      session.lastAccessed = Date.now();
    }
  }

  destroy(id) {
    this.sessions.delete(id);
  }

  // ── Block 3: Session cleanup ─────────────────────────────
  // WHY: Without cleanup, the session store grows forever.
  // In production, Redis TTL handles this. For in-memory,
  // we need a manual sweep.
  cleanup(maxAgeMs) {
    const now = Date.now();
    let cleaned = 0;
    for (const [id, session] of this.sessions) {
      if (now - session.lastAccessed > maxAgeMs) {
        this.sessions.delete(id);
        cleaned++;
      }
    }
    return cleaned;
  }

  get size() {
    return this.sessions.size;
  }
}

// ── Session middleware factory ──────────────────────────────
function sessionMiddleware(options = {}) {
  const {
    cookieName = 'sid',
    secret = 'default-secret-change-me',
    maxAge = 3600000,     // 1 hour in ms
    httpOnly = true,
    secure = false,        // Set true in production with HTTPS
    sameSite = 'lax',
    store = new SessionStore()
  } = options;

  // WHY: We expose the store so tests and cleanup jobs can
  // access it directly.
  const middleware = (req, res, next) => {
    let sessionId = req.cookies?.[cookieName];
    let session = null;

    // Try to load existing session
    if (sessionId) {
      session = store.get(sessionId);
    }

    // Create new session if none found
    if (!session) {
      // WHY: crypto.randomUUID() generates a v4 UUID — 122 bits
      // of randomness, making session ID guessing infeasible.
      sessionId = crypto.randomUUID();
      session = store.create(sessionId);

      // Set the session cookie on the response
      // WHY: We set the cookie here so it's sent with THIS
      // response. The client will include it on future requests.
      res.cookie(cookieName, sessionId, {
        httpOnly,
        secure,
        sameSite,
        maxAge,
        path: '/'
      });
    }

    // Attach session interface to the request
    // WHY: req.session gives route handlers a clean API to
    // read/write session data without knowing about the store.
    req.session = {
      id: sessionId,
      data: session.data,

      // Save current session data
      save() {
        store.save(sessionId, this.data);
      },

      // Destroy the session (logout)
      destroy(callback) {
        store.destroy(sessionId);
        // WHY: Clear the cookie so the browser stops sending it.
        res.clearCookie(cookieName, { path: '/' });
        if (callback) callback();
      },

      // ── Block 3: Flash messages ────────────────────────────
      // WHY: Flash messages are shown ONCE then disappear.
      // They're stored in the session and consumed on the next
      // request — perfect for "Booking confirmed!" after redirect.
      flash(key, message) {
        if (!this.data._flash) this.data._flash = {};
        if (!this.data._flash[key]) this.data._flash[key] = [];
        this.data._flash[key].push(message);
        store.save(sessionId, this.data);
      },

      getFlash(key) {
        if (!this.data._flash || !this.data._flash[key]) return [];
        const messages = this.data._flash[key];
        delete this.data._flash[key];
        // WHY: Delete after reading — that's what makes it "flash"
        store.save(sessionId, this.data);
        return messages;
      }
    };

    // Auto-save session data after the response is sent
    // WHY: The 'finish' event fires after the response is fully
    // sent. This ensures all route handler modifications to
    // req.session.data are persisted automatically.
    res.on('finish', () => {
      if (store.get(sessionId)) {
        store.save(sessionId, req.session.data);
      }
    });

    next();
  };

  middleware.store = store;
  return middleware;
}

// ============================================================
// BUILD THE APP
// ============================================================
function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  const sessionStore = new SessionStore();
  const session = sessionMiddleware({
    cookieName: 'irctc_sid',
    secret: 'irctc-booking-secret',
    maxAge: 5000,       // 5 seconds for testing (short expiry)
    store: sessionStore
  });
  app.use(session);

  // ── Block 1: Cookie demo routes ────────────────────────────

  // Set various cookies
  app.get('/set-cookies', (req, res) => {
    // WHY: Each option serves a security or functionality purpose.
    res.cookie('passenger_name', 'Rajesh Sharma', {
      maxAge: 86400000,    // 24 hours in ms
      httpOnly: true,      // WHY: JS can't read it — prevents XSS theft
      sameSite: 'lax'      // WHY: Sent on same-site requests + top-level navigation
    });

    res.cookie('preference', 'dark-mode', {
      maxAge: 31536000000, // 1 year
      httpOnly: false       // WHY: Frontend JS needs to read this for theming
    });

    res.cookie('tracking', 'abc123', {
      maxAge: 60000,        // 1 minute — short-lived
      httpOnly: true,
      secure: false,        // WHY: In production, set true to require HTTPS
      path: '/'             // WHY: Available on all paths (default)
    });

    res.json({
      message: 'Cookies set!',
      note: 'Check Set-Cookie headers in the response'
    });
  });

  // Read cookies (using our manual parser)
  app.get('/read-cookies', (req, res) => {
    res.json({
      parsedCookies: req.cookies,
      cookieCount: Object.keys(req.cookies).length
    });
  });

  // Delete a cookie
  app.get('/clear-cookie', (req, res) => {
    // WHY: clearCookie sets Max-Age=0, telling the browser
    // to delete the cookie immediately.
    res.clearCookie('tracking', { path: '/' });
    res.json({ message: 'tracking cookie cleared' });
  });

  // ── Block 2: Session-based login/logout ────────────────────

  // Login — creates a session with user data
  app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Simulated user database
    const users = {
      rajesh: { password: 'tatkal123', role: 'admin', fullName: 'Rajesh Sharma' },
      priya:  { password: 'sleeper456', role: 'passenger', fullName: 'Priya Patel' }
    };

    const user = users[username];
    if (!user || user.password !== password) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid credentials' }
      });
    }

    // WHY: Store user info in the session, NOT in the cookie.
    // The cookie only holds the session ID. All sensitive data
    // stays on the server.
    req.session.data.user = {
      username,
      role: user.role,
      fullName: user.fullName,
      loggedInAt: new Date().toISOString()
    };
    req.session.save();

    // Set a flash message for the next request
    req.session.flash('info', `Welcome back, ${user.fullName}!`);

    res.json({
      success: true,
      data: {
        message: 'Login successful',
        sessionId: req.session.id,
        user: req.session.data.user
      }
    });
  });

  // Profile — requires active session with user
  app.get('/profile', (req, res) => {
    if (!req.session.data.user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Not logged in. Please POST /login first.' }
      });
    }

    // Consume flash messages (Block 3)
    const flashMessages = req.session.getFlash('info');

    res.json({
      success: true,
      data: {
        user: req.session.data.user,
        sessionId: req.session.id,
        flashMessages
      }
    });
  });

  // Logout — destroys the session
  app.post('/logout', (req, res) => {
    const username = req.session.data.user?.username || 'unknown';
    req.session.destroy(() => {
      res.json({
        success: true,
        data: { message: `${username} logged out, session destroyed` }
      });
    });
  });

  // ── Block 3: Session info & cleanup ────────────────────────

  // Session store stats
  app.get('/sessions/stats', (req, res) => {
    res.json({
      activeSessions: sessionStore.size,
      currentSessionId: req.session.id
    });
  });

  // Manual cleanup of expired sessions
  app.post('/sessions/cleanup', (req, res) => {
    const maxAgeMs = 5000;  // 5 seconds for testing
    const cleaned = sessionStore.cleanup(maxAgeMs);
    res.json({
      cleaned,
      remaining: sessionStore.size
    });
  });

  // Flash message demo (independent of login)
  app.get('/flash-demo', (req, res) => {
    // Set flash messages
    req.session.flash('success', 'Ticket booked successfully');
    req.session.flash('success', 'Confirmation SMS sent');
    req.session.flash('warning', 'Your Tatkal window closes in 3 minutes');
    req.session.save();

    res.json({ message: 'Flash messages set. GET /flash-read to consume them.' });
  });

  app.get('/flash-read', (req, res) => {
    const success = req.session.getFlash('success');
    const warning = req.session.getFlash('warning');
    const info = req.session.getFlash('info');

    res.json({
      flashMessages: { success, warning, info },
      note: 'These are now consumed. GET /flash-read again to see they are gone.'
    });
  });

  return { app, sessionStore };
}

// ============================================================
// SELF-TEST — Cookies and sessions in action
// ============================================================
async function runTests() {
  const { app, sessionStore } = buildApp();

  const server = app.listen(0, async () => {
    const port = server.address().port;
    const base = `http://localhost:${port}`;
    console.log(`[14-cookies-and-sessions] Server on port ${port}\n`);

    // WHY: We manually track cookies like a browser would,
    // since fetch() in Node doesn't auto-manage cookies.
    let savedCookies = '';

    function extractCookies(response) {
      // WHY: getSetCookie() returns an array of Set-Cookie header values.
      // We parse out just the name=value part (before the first ";")
      // and merge with existing cookies.
      const setCookies = response.headers.getSetCookie?.() || [];
      const cookieMap = {};

      // Parse existing cookies
      if (savedCookies) {
        savedCookies.split('; ').forEach(c => {
          const [k, v] = c.split('=');
          if (k && v) cookieMap[k] = v;
        });
      }

      // Merge new cookies
      setCookies.forEach(sc => {
        const nameValue = sc.split(';')[0].trim();
        const eqIdx = nameValue.indexOf('=');
        if (eqIdx !== -1) {
          const key = nameValue.substring(0, eqIdx);
          const val = nameValue.substring(eqIdx + 1);
          // WHY: Max-Age=0 means "delete this cookie"
          if (sc.includes('Max-Age=0') || sc.includes('Expires=Thu, 01 Jan 1970')) {
            delete cookieMap[key];
          } else {
            cookieMap[key] = val;
          }
        }
      });

      savedCookies = Object.entries(cookieMap).map(([k, v]) => `${k}=${v}`).join('; ');
      return setCookies;
    }

    function fetchWithCookies(url, options = {}) {
      const headers = { ...(options.headers || {}) };
      if (savedCookies) {
        headers['Cookie'] = savedCookies;
      }
      return fetch(url, { ...options, headers, redirect: 'manual' });
    }

    try {
      // ── Block 1: Cookie Setting & Reading ──────────────────

      console.log('=== Block 1 — Setting and Reading Cookies ===\n');

      // Set cookies
      const r1 = await fetchWithCookies(`${base}/set-cookies`);
      const j1 = await r1.json();
      const setCookies = extractCookies(r1);
      console.log('GET /set-cookies');
      console.log('Set-Cookie headers received:', setCookies.length);
      // Output: Set-Cookie headers received: 3
      setCookies.forEach(c => {
        const name = c.split('=')[0];
        const flags = c.split(';').slice(1).map(f => f.trim()).join(', ');
        console.log(`  ${name}: ${flags}`);
      });
      console.log('Cookies being sent:', savedCookies.substring(0, 80) + '...');
      console.log('');

      // Read cookies back
      const r2 = await fetchWithCookies(`${base}/read-cookies`);
      const j2 = await r2.json();
      extractCookies(r2);
      console.log('GET /read-cookies');
      console.log('Parsed cookies:', JSON.stringify(j2.parsedCookies, null, 2));
      // Output: Parsed cookies: { passenger_name, preference, tracking, irctc_sid }
      console.log('Cookie count:', j2.cookieCount);
      // Output: Cookie count: 4
      console.log('');

      // Clear one cookie
      const r3 = await fetchWithCookies(`${base}/clear-cookie`);
      const j3 = await r3.json();
      extractCookies(r3);
      console.log('GET /clear-cookie');
      console.log('Message:', j3.message);
      // Output: Message: tracking cookie cleared
      console.log('');

      // Verify it's gone
      const r4 = await fetchWithCookies(`${base}/read-cookies`);
      const j4 = await r4.json();
      extractCookies(r4);
      console.log('GET /read-cookies (after clear)');
      console.log('Has tracking:', 'tracking' in j4.parsedCookies);
      // Output: Has tracking: false
      console.log('');

      // ── Block 2: Session Login/Logout Flow ─────────────────

      console.log('=== Block 2 — Session Login/Logout ===\n');

      // Try profile without login → 401
      const r5 = await fetchWithCookies(`${base}/profile`);
      const j5 = await r5.json();
      extractCookies(r5);
      console.log('GET /profile (not logged in)');
      console.log('Status:', r5.status);
      // Output: Status: 401
      console.log('Error:', j5.error.message);
      // Output: Error: Not logged in. Please POST /login first.
      console.log('');

      // Login as rajesh
      const r6 = await fetchWithCookies(`${base}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'rajesh', password: 'tatkal123' })
      });
      const j6 = await r6.json();
      extractCookies(r6);
      console.log('POST /login (rajesh)');
      console.log('Status:', r6.status);
      // Output: Status: 200
      console.log('User:', j6.data.user.fullName);
      // Output: User: Rajesh Sharma
      console.log('Role:', j6.data.user.role);
      // Output: Role: admin
      console.log('Session ID:', j6.data.sessionId.substring(0, 8) + '...');
      console.log('');

      // Access profile (now logged in) — also consumes flash
      const r7 = await fetchWithCookies(`${base}/profile`);
      const j7 = await r7.json();
      extractCookies(r7);
      console.log('GET /profile (logged in)');
      console.log('Status:', r7.status);
      // Output: Status: 200
      console.log('Welcome:', j7.data.user.fullName);
      // Output: Welcome: Rajesh Sharma
      console.log('Flash messages:', j7.data.flashMessages);
      // Output: Flash messages: [ 'Welcome back, Rajesh Sharma!' ]
      console.log('');

      // Access profile again — flash should be gone
      const r8 = await fetchWithCookies(`${base}/profile`);
      const j8 = await r8.json();
      extractCookies(r8);
      console.log('GET /profile (second time — flash consumed)');
      console.log('Flash messages:', j8.data.flashMessages);
      // Output: Flash messages: []
      console.log('');

      // Invalid login
      const r9 = await fetchWithCookies(`${base}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'rajesh', password: 'wrong' })
      });
      const j9 = await r9.json();
      extractCookies(r9);
      console.log('POST /login (wrong password)');
      console.log('Status:', r9.status);
      // Output: Status: 401
      console.log('Error:', j9.error.message);
      // Output: Error: Invalid credentials
      console.log('');

      // Session stats
      const r10 = await fetchWithCookies(`${base}/sessions/stats`);
      const j10 = await r10.json();
      extractCookies(r10);
      console.log('GET /sessions/stats');
      console.log('Active sessions:', j10.activeSessions);
      // Output: Active sessions: (number of active sessions)
      console.log('');

      // Logout
      const r11 = await fetchWithCookies(`${base}/logout`, { method: 'POST' });
      const j11 = await r11.json();
      extractCookies(r11);
      console.log('POST /logout');
      console.log('Message:', j11.data.message);
      // Output: Message: rajesh logged out, session destroyed
      console.log('');

      // Verify logged out
      const r12 = await fetchWithCookies(`${base}/profile`);
      const j12 = await r12.json();
      extractCookies(r12);
      console.log('GET /profile (after logout)');
      console.log('Status:', r12.status);
      // Output: Status: 401
      console.log('');

      // ── Block 3: Session Expiry, Cleanup, Flash Messages ───

      console.log('=== Block 3 — Expiry, Cleanup, Flash Messages ===\n');

      // Flash message demo — set then consume
      const r13 = await fetchWithCookies(`${base}/flash-demo`);
      const j13 = await r13.json();
      extractCookies(r13);
      console.log('GET /flash-demo (set messages)');
      console.log('Message:', j13.message);
      // Output: Message: Flash messages set. GET /flash-read to consume them.
      console.log('');

      // Read flash messages (first time — they exist)
      const r14 = await fetchWithCookies(`${base}/flash-read`);
      const j14 = await r14.json();
      extractCookies(r14);
      console.log('GET /flash-read (first — consume messages)');
      console.log('Success messages:', j14.flashMessages.success);
      // Output: Success messages: [ 'Ticket booked successfully', 'Confirmation SMS sent' ]
      console.log('Warning messages:', j14.flashMessages.warning);
      // Output: Warning messages: [ 'Your Tatkal window closes in 3 minutes' ]
      console.log('');

      // Read flash messages again (second time — gone!)
      const r15 = await fetchWithCookies(`${base}/flash-read`);
      const j15 = await r15.json();
      extractCookies(r15);
      console.log('GET /flash-read (second — already consumed)');
      console.log('Success messages:', j15.flashMessages.success);
      // Output: Success messages: []
      console.log('Warning messages:', j15.flashMessages.warning);
      // Output: Warning messages: []
      console.log('');

      // Session expiry test
      console.log('── Testing session expiry (waiting 6 seconds) ──');
      const sessionsBeforeWait = sessionStore.size;
      console.log('Sessions before wait:', sessionsBeforeWait);

      await new Promise(resolve => setTimeout(resolve, 6000));

      // Cleanup expired sessions
      const r16 = await fetchWithCookies(`${base}/sessions/cleanup`, { method: 'POST' });
      const j16 = await r16.json();
      extractCookies(r16);
      console.log('POST /sessions/cleanup (after 6s, maxAge=5s)');
      console.log('Cleaned:', j16.cleaned);
      // Output: Cleaned: (number of expired sessions cleaned)
      console.log('Remaining:', j16.remaining);
      // Output: Remaining: 1
      console.log('(Only current request\'s new session remains)');

    } catch (err) {
      console.error('Test error:', err.message);
    } finally {
      server.close(() => {
        console.log('\n── Server closed ──');

        // ── KEY TAKEAWAYS ─────────────────────────────────────
        // 1. Cookies are just key=value pairs in HTTP headers.
        //    The Cookie header sends them; Set-Cookie creates them.
        //
        // 2. httpOnly prevents JavaScript from reading the cookie
        //    (XSS protection). secure requires HTTPS. sameSite
        //    prevents CSRF by controlling cross-origin sending.
        //
        // 3. Sessions store data on the SERVER, identified by a
        //    cookie that holds only a random session ID. The
        //    client never sees the actual session data.
        //
        // 4. crypto.randomUUID() produces cryptographically random
        //    IDs that are impossible to guess — critical for
        //    session security.
        //
        // 5. Flash messages are session data consumed on first read.
        //    They're the mechanism behind "Booking confirmed!" banners
        //    that appear once after a redirect.
        //
        // 6. Sessions MUST be cleaned up. Without expiry and cleanup,
        //    the store grows unbounded. In production, use Redis
        //    with TTL instead of in-memory Maps.
        //
        // 7. The session middleware pattern — read cookie, load data,
        //    attach to req, auto-save on finish — is exactly what
        //    express-session implements.
      });
    }
  });
}

runTests();
