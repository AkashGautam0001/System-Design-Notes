/** ============================================================
 *  FILE 34: SECURITY FUNDAMENTALS
 *  ============================================================
 *  Topic: Auth vs authz, JWT, OAuth2, encryption, OWASP top 10,
 *         input validation, RBAC, security headers
 *
 *  WHY THIS MATTERS:
 *  India's DigiLocker serves 150 million citizens storing gov
 *  documents linked to Aadhaar. A single security flaw could
 *  expose PII of millions. Security is not a feature to add
 *  later — it must be baked into every layer from day one.
 *  ============================================================ */

// STORY: DigiLocker / Aadhaar Auth
// DigiLocker uses OAuth2 so banks can access gov documents with
// user consent. Each JWT carries Aadhaar-verified claims. When a
// fintech attempted SQL injection on the verification API, UIDAI's
// input validation and rate limiting blocked 2.3 million malicious
// requests in 24 hours. Security is a national-scale imperative.

console.log("=".repeat(70));
console.log("  FILE 34: SECURITY FUNDAMENTALS");
console.log("=".repeat(70));
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 1 — Authentication vs Authorization
// ════════════════════════════════════════════════════════════════

// WHY: Authentication = WHO you are. Authorization = WHAT you can do.
console.log("SECTION 1: Authentication vs Authorization");
console.log("-".repeat(50));

console.log(`
  AUTHENTICATION (WHO are you?)
    Methods: Password, OTP/Aadhaar biometric, Certificates, MFA
    HTTP:    401 Unauthorized
    Example: DigiLocker Aadhaar OTP verifies document owner

  AUTHORIZATION (WHAT can you do?)
    Methods: RBAC, ABAC, ACL, Policy-based (IAM)
    HTTP:    403 Forbidden
    Example: Bank can READ PAN card but cannot DELETE

  COMMON MISTAKE: Checking auth but skipping authz.
    User A is logged in but accesses User B's Aadhaar docs.
    This is IDOR — Insecure Direct Object Reference (OWASP #1).
`);

// ════════════════════════════════════════════════════════════════
// SECTION 2 — JWT Creation and Verification (Simulated)
// ════════════════════════════════════════════════════════════════

// WHY: JWTs are the standard for stateless API authentication.
console.log("SECTION 2: JWT Creation and Verification");
console.log("-".repeat(50));

class JWTSimulator {
  constructor(secret) { this.secret = secret; }

  _b64Encode(obj) {
    return Buffer.from(JSON.stringify(obj)).toString("base64").replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
  }
  _b64Decode(str) {
    let s = str.replace(/-/g,"+").replace(/_/g,"/");
    while (s.length % 4) s += "=";
    return JSON.parse(Buffer.from(s, "base64").toString());
  }
  _hmac(data) {
    let h = 0;
    for (const c of data + this.secret) h = ((h << 5) - h) + c.charCodeAt(0) & 0x7fffffff;
    return h.toString(36);
  }

  create(payload, expSec = 3600) {
    const header = { alg: "HS256_SIM", typ: "JWT" };
    const now = Math.floor(Date.now() / 1000);
    const full = { ...payload, iat: now, exp: now + expSec, iss: "digilocker.gov.in", jti: `jti-${(Math.random()*1e8|0).toString(36)}` };
    const h = this._b64Encode(header);
    const p = this._b64Encode(full);
    return `${h}.${p}.${this._hmac(h+"."+p)}`;
  }

  verify(token) {
    const parts = token.split(".");
    if (parts.length !== 3) return { valid: false, error: "Invalid format" };
    const expected = this._hmac(parts[0]+"."+parts[1]);
    if (parts[2] !== expected) return { valid: false, error: "Signature verification failed" };
    const payload = this._b64Decode(parts[1]);
    if (payload.exp && Math.floor(Date.now()/1000) > payload.exp) return { valid: false, error: "Token expired", payload };
    return { valid: true, payload };
  }

  decode(token) {
    const [h, p, s] = token.split(".");
    return { header: this._b64Decode(h), payload: this._b64Decode(p), signature: s };
  }
}

const jwt = new JWTSimulator("aadhaar-secret-key-2024");
const token = jwt.create({
  sub: "AADHAAR-XXXX-1234", name: "Rajesh Kumar", dob: "1990-05-15",
  scope: ["profile:read", "documents:read"], ekyc_verified: true
});

console.log(`\n  Token: ${token.substring(0, 50)}...`);
const decoded = jwt.decode(token);
console.log("  Header:", JSON.stringify(decoded.header));
console.log("  Payload keys:", Object.keys(decoded.payload).join(", "));
console.log(`  Subject: ${decoded.payload.sub}, Name: ${decoded.payload.name}`);

const valid = jwt.verify(token);
console.log(`\n  Verify valid token: ${valid.valid}`);
const tampered = token.replace("Rajesh", "Hacker");
const tampResult = jwt.verify(tampered);
console.log(`  Verify tampered token: ${tampResult.valid} (${tampResult.error})`);
// Output: Signature verification failed

console.log("\n  JWT Best Practices:");
["Never store secrets in payload (Base64 != encryption)", "Short expiry (15min access, use refresh tokens)",
 "Validate iss, aud, exp on every request", "Use RS256 in production (no shared secret)",
 "Store in httpOnly cookies (not localStorage)", "Implement token blocklist for revocation"].forEach((p,i) => console.log(`    ${i+1}. ${p}`));
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 3 — OAuth2 Flow Simulation
// ════════════════════════════════════════════════════════════════

// WHY: OAuth2 lets third-party apps access user data without sharing passwords.
console.log("SECTION 3: OAuth2 Flow Simulation");
console.log("-".repeat(50));

class OAuth2Server {
  constructor() { this.clients = new Map(); this.codes = new Map(); this.tokens = new Map(); }

  registerClient(id, secret, redirect, name) {
    this.clients.set(id, { secret, redirect, name });
    return { clientId: id, appName: name };
  }

  authorize(clientId, scope, userId) {
    const client = this.clients.get(clientId);
    if (!client) return { error: "invalid_client" };
    const code = `code-${(Math.random()*1e8|0).toString(36)}`;
    this.codes.set(code, { clientId, userId, scope, used: false });
    console.log(`    [OAuth2] User ${userId} grants "${client.name}" access to: ${scope.join(", ")}`);
    return { code, redirect: `${client.redirect}?code=${code}` };
  }

  exchangeCode(clientId, clientSecret, code) {
    const client = this.clients.get(clientId);
    if (!client || client.secret !== clientSecret) return { error: "invalid_client" };
    const auth = this.codes.get(code);
    if (!auth || auth.used || auth.clientId !== clientId) return { error: "invalid_grant" };
    auth.used = true;
    const accessToken = `at-${(Math.random()*1e10|0).toString(36)}`;
    const refreshToken = `rt-${(Math.random()*1e10|0).toString(36)}`;
    this.tokens.set(accessToken, { clientId, userId: auth.userId, scope: auth.scope, exp: Date.now()+3600000 });
    return { access_token: accessToken, refresh_token: refreshToken, expires_in: 3600, scope: auth.scope.join(" ") };
  }

  validateToken(token) {
    const t = this.tokens.get(token);
    if (!t) return { valid: false, error: "invalid_token" };
    if (Date.now() > t.exp) return { valid: false, error: "expired" };
    return { valid: true, userId: t.userId, scope: t.scope };
  }
}

const oauth = new OAuth2Server();
console.log("\n  Step 0: Register client");
const reg = oauth.registerClient("hdfc-client", "hdfc-secret", "https://hdfc.com/callback", "HDFC Bank eKYC");
console.log(`    ${JSON.stringify(reg)}`);

console.log("\n  Step 1: Authorization");
const authRes = oauth.authorize("hdfc-client", ["aadhaar:read", "pan:read"], "user-aadhaar-1234");
console.log(`    Code: ${authRes.code}`);

console.log("\n  Step 2: Exchange code for tokens");
const tokenRes = oauth.exchangeCode("hdfc-client", "hdfc-secret", authRes.code);
console.log(`    Access: ${tokenRes.access_token}, Expires: ${tokenRes.expires_in}s`);

console.log("\n  Step 3: Validate access token");
const valRes = oauth.validateToken(tokenRes.access_token);
console.log(`    Valid: ${valRes.valid}, User: ${valRes.userId}, Scope: ${valRes.scope.join(", ")}`);

console.log("\n  Step 4: Reuse code (should fail)");
const reuseRes = oauth.exchangeCode("hdfc-client", "hdfc-secret", authRes.code);
console.log(`    Result: ${JSON.stringify(reuseRes)}`);
// Output: invalid_grant
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 4 — Encryption Basics
// ════════════════════════════════════════════════════════════════

// WHY: Encryption protects data at rest and in transit.
console.log("SECTION 4: Encryption Basics");
console.log("-".repeat(50));

class SymmetricCipher {
  constructor(key) { this.shift = key.length % 26; }
  encrypt(text) {
    return text.split("").map(c => {
      const code = c.charCodeAt(0);
      if (code >= 65 && code <= 90) return String.fromCharCode(((code-65+this.shift)%26)+65);
      if (code >= 97 && code <= 122) return String.fromCharCode(((code-97+this.shift)%26)+97);
      return c;
    }).join("");
  }
  decrypt(text) {
    return text.split("").map(c => {
      const code = c.charCodeAt(0);
      if (code >= 65 && code <= 90) return String.fromCharCode(((code-65-this.shift+26)%26)+65);
      if (code >= 97 && code <= 122) return String.fromCharCode(((code-97-this.shift+26)%26)+97);
      return c;
    }).join("");
  }
}

class AsymmetricDemo {
  constructor() { this.pub = { n: 3233, e: 17 }; this.priv = { n: 3233, d: 2753 }; }
  _modPow(b, e, m) { let r = 1; b %= m; while (e > 0) { if (e%2) r = (r*b)%m; e >>= 1; b = (b*b)%m; } return r; }
  encrypt(num) { return this._modPow(num, this.pub.e, this.pub.n); }
  decrypt(num) { return this._modPow(num, this.priv.d, this.priv.n); }
}

const sym = new SymmetricCipher("aadhaar-encryption-key");
const plain = "Aadhaar 1234-5678-9012";
const enc = sym.encrypt(plain);
console.log(`\n  Symmetric: "${plain}" -> "${enc}" -> "${sym.decrypt(enc)}" (match: ${plain === sym.decrypt(enc)})`);

const asym = new AsymmetricDemo();
const num = 65;
const eNum = asym.encrypt(num);
console.log(`  Asymmetric: ${num}('${String.fromCharCode(num)}') -> ${eNum} -> ${asym.decrypt(eNum)}('${String.fromCharCode(asym.decrypt(eNum))}') (match: ${num === asym.decrypt(eNum)})`);

console.log("\n  Comparison:");
[["Speed","Fast (100x)","Slow"],["Key Sharing","Same both sides","Public shared freely"],
 ["Use Case","Data at rest","Key exchange, signatures"],["Algorithms","AES-256","RSA-2048, ECDSA"]].forEach(
  ([a,s,as]) => console.log(`    ${a.padEnd(16)} Symmetric: ${s.padEnd(22)} Asymmetric: ${as}`)
);
console.log("\n  TLS uses BOTH: Asymmetric for handshake, Symmetric for bulk data");
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 5 — OWASP Top 10 with Examples
// ════════════════════════════════════════════════════════════════

// WHY: OWASP Top 10 covers the most critical web security risks.
console.log("SECTION 5: OWASP Top 10");
console.log("-".repeat(50));

const owasp = [
  { r: 1, n: "Broken Access Control", ex: "Change /user/123/docs to /user/456/docs", fix: "Server-side authz checks" },
  { r: 2, n: "Cryptographic Failures", ex: "Aadhaar in plaintext DB logs", fix: "AES-256 at rest, TLS 1.3 in transit" },
  { r: 3, n: "Injection", ex: "admin' OR '1'='1' in login", fix: "Parameterized queries, ORM" },
  { r: 4, n: "Insecure Design", ex: "eKYC API with no rate limit", fix: "Threat modeling in design phase" },
  { r: 5, n: "Security Misconfig", ex: "S3 bucket with Aadhaar docs public", fix: "Hardened configs, automated scans" },
  { r: 6, n: "Vulnerable Components", ex: "log4j in DigiLocker's Java stack", fix: "Snyk/Dependabot, update deps" },
  { r: 7, n: "Auth Failures", ex: "No session expiry after OTP login", fix: "MFA, session timeouts, secure cookies" },
  { r: 8, n: "Integrity Failures", ex: "Unsigned container to prod", fix: "Code signing, SBOM" },
  { r: 9, n: "Logging Failures", ex: "Failed auth not logged, breach undetected", fix: "Log auth events, SIEM" },
  { r: 10, n: "SSRF", ex: "Doc preview fetches http://169.254.169.254/", fix: "Whitelist URLs, block internal IPs" }
];

console.log();
owasp.forEach(o => {
  console.log(`  #${o.r}: ${o.n}`);
  console.log(`    Example: ${o.ex}`);
  console.log(`    Fix:     ${o.fix}`);
});
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 6 — Input Validation and Sanitization
// ════════════════════════════════════════════════════════════════

// WHY: 90% of injection attacks succeed due to missing input validation.
console.log("SECTION 6: Input Validation and Sanitization");
console.log("-".repeat(50));

class InputValidator {
  constructor() { this.rules = {}; }
  addRule(field, validators) { this.rules[field] = validators; }

  validate(field, value) {
    const validators = this.rules[field] || [];
    const errors = [];
    validators.forEach(v => { const r = v(value); if (!r.valid) errors.push(r.error); });
    return { valid: errors.length === 0, errors };
  }

  static required() { return v => ({ valid: v !== null && v !== undefined && v !== "", error: "Required" }); }
  static maxLen(n) { return v => ({ valid: typeof v === "string" && v.length <= n, error: `Max ${n} chars` }); }
  static pattern(re, desc) { return v => ({ valid: typeof v === "string" && re.test(v), error: `Invalid: ${desc}` }); }
  static noSQLi() {
    return v => {
      if (typeof v !== "string") return { valid: true };
      const bad = [/('|--|;|\/\*)/i, /(union\s+select|drop\s+table)/i, /(or\s+1\s*=\s*1)/i];
      return { valid: !bad.some(p => p.test(v)), error: "SQL injection detected" };
    };
  }
  static noXSS() {
    return v => {
      if (typeof v !== "string") return { valid: true };
      const bad = [/<script/i, /javascript\s*:/i, /on\w+\s*=/i, /<iframe/i];
      return { valid: !bad.some(p => p.test(v)), error: "XSS detected" };
    };
  }
  static aadhaar() { return v => ({ valid: typeof v === "string" && /^\d{4}\s?\d{4}\s?\d{4}$/.test(v.trim()), error: "Invalid Aadhaar" }); }
  static sanitizeHTML(v) { return v.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
}

const val = new InputValidator();
val.addRule("aadhaar", [InputValidator.required(), InputValidator.aadhaar(), InputValidator.noSQLi()]);
val.addRule("name", [InputValidator.required(), InputValidator.maxLen(100), InputValidator.noXSS(), InputValidator.noSQLi()]);
val.addRule("search", [InputValidator.required(), InputValidator.maxLen(200), InputValidator.noSQLi(), InputValidator.noXSS()]);

const tests = [
  { f: "aadhaar", v: "1234 5678 9012", l: "Valid Aadhaar" },
  { f: "aadhaar", v: "1234' OR '1'='1", l: "SQLi Aadhaar" },
  { f: "name", v: "Rajesh Kumar", l: "Valid name" },
  { f: "name", v: '<script>alert("x")</script>', l: "XSS in name" },
  { f: "name", v: "admin'; DROP TABLE users;--", l: "SQLi in name" },
  { f: "search", v: "PAN card download", l: "Valid search" },
  { f: "search", v: "test<img onerror=alert(1)>", l: "XSS in search" }
];

console.log("\n  " + "Input".padEnd(30) + "Field".padEnd(10) + "Valid".padEnd(8) + "Errors");
tests.forEach(t => {
  const r = val.validate(t.f, t.v);
  console.log(`  ${t.l.padEnd(30)}${t.f.padEnd(10)}${String(r.valid).padEnd(8)}${r.errors.join("; ") || "-"}`);
});

console.log("\n  Sanitization:");
['<script>steal()</script>', '<img onerror="alert(1)">'].forEach(s => {
  console.log(`    "${s}" -> "${InputValidator.sanitizeHTML(s)}"`);
});
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 7 — RBAC (Role-Based Access Control)
// ════════════════════════════════════════════════════════════════

// WHY: RBAC maps users to roles, roles to permissions. Most common authz model.
console.log("SECTION 7: RBAC");
console.log("-".repeat(50));

class RBAC {
  constructor() { this.roles = new Map(); this.users = new Map(); }

  createRole(name, perms) { this.roles.set(name, new Set(perms)); }

  assignRole(userId, role) {
    if (!this.users.has(userId)) this.users.set(userId, new Set());
    this.users.get(userId).add(role);
  }

  check(userId, perm) {
    const userRoles = this.users.get(userId);
    if (!userRoles) return false;
    for (const r of userRoles) {
      const role = this.roles.get(r);
      if (role && role.has(perm)) return true;
    }
    return false;
  }

  allPerms(userId) {
    const all = new Set();
    const userRoles = this.users.get(userId);
    if (!userRoles) return all;
    for (const r of userRoles) { const role = this.roles.get(r); if (role) role.forEach(p => all.add(p)); }
    return all;
  }
}

const rbac = new RBAC();
rbac.createRole("citizen", ["doc:read:own", "doc:download:own", "doc:share", "profile:read:own"]);
rbac.createRole("issuer", ["doc:issue", "doc:revoke", "doc:verify"]);
rbac.createRole("requester", ["doc:read:shared", "doc:verify", "ekyc:request"]);
rbac.createRole("admin", ["doc:read:any", "doc:delete:any", "user:manage", "audit:read"]);

rbac.assignRole("citizen-rajesh", "citizen");
rbac.assignRole("rto-maharashtra", "issuer");
rbac.assignRole("hdfc-bank", "requester");
rbac.assignRole("uidai-admin", "admin");
rbac.assignRole("uidai-admin", "citizen");

console.log("\n  Roles:");
for (const [name, perms] of rbac.roles) console.log(`    ${name}: ${[...perms].join(", ")}`);

console.log("\n  Access Checks:");
const checks = [
  ["citizen-rajesh", "doc:read:own", "Citizen reads own docs"],
  ["citizen-rajesh", "doc:delete:any", "Citizen deletes any doc"],
  ["hdfc-bank", "ekyc:request", "HDFC requests eKYC"],
  ["hdfc-bank", "doc:issue", "HDFC issues doc"],
  ["rto-maharashtra", "doc:issue", "RTO issues license"],
  ["uidai-admin", "doc:read:any", "Admin reads any doc"],
  ["uidai-admin", "doc:read:own", "Admin reads own (citizen role)"]
];
checks.forEach(([u, p, d]) => {
  console.log(`    [${rbac.check(u, p) ? "GRANTED" : "DENIED "}] ${d}`);
});
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 8 — Security Headers and Best Practices
// ════════════════════════════════════════════════════════════════

// WHY: Security headers instruct browsers to enforce protections.
console.log("SECTION 8: Security Headers");
console.log("-".repeat(50));

class HeaderAuditor {
  constructor(headers) { this.headers = headers; }
  audit() {
    const checks = [
      { h: "Content-Security-Policy", test: v => v && v.includes("default-src"), sev: "HIGH" },
      { h: "X-Content-Type-Options", test: v => v === "nosniff", sev: "MED" },
      { h: "X-Frame-Options", test: v => v === "DENY" || v === "SAMEORIGIN", sev: "HIGH" },
      { h: "Strict-Transport-Security", test: v => v && v.includes("max-age"), sev: "HIGH" },
      { h: "Referrer-Policy", test: v => !!v, sev: "MED" },
      { h: "Permissions-Policy", test: v => !!v, sev: "MED" }
    ];
    return checks.map(c => {
      const v = this.headers[c.h];
      return { header: c.h, pass: v !== undefined && c.test(v), value: v || "(missing)", sev: c.sev };
    });
  }
}

console.log("\n  DigiLocker Production Audit:");
const good = new HeaderAuditor({
  "Content-Security-Policy": "default-src 'self'; script-src 'self'",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=()"
});
good.audit().forEach(r => console.log(`    [${r.pass?"PASS":"FAIL"}] ${r.header}`));
console.log(`    Score: ${good.audit().filter(r=>r.pass).length}/${good.audit().length}`);

console.log("\n  Insecure App Audit:");
const bad = new HeaderAuditor({ "X-Content-Type-Options": "nosniff" });
bad.audit().forEach(r => console.log(`    [${r.pass?"PASS":"FAIL"}] ${r.header}: ${r.value}`));

console.log("\n  Security Checklist:");
["HTTPS everywhere (TLS 1.3)", "bcrypt/argon2 for passwords", "Rate limit auth endpoints",
 "CORS whitelist (never *)", "Least privilege for all roles", "Secrets in vault (not code)",
 "Dependency scanning in CI/CD", "Pen testing before major releases"].forEach((p,i) => console.log(`    ${i+1}. ${p}`));
console.log();

// ════════════════════════════════════════════════════════════════
// KEY TAKEAWAYS
// ════════════════════════════════════════════════════════════════

console.log("=".repeat(70));
console.log("  KEY TAKEAWAYS");
console.log("=".repeat(70));
console.log(`
  1. Authentication (WHO) and Authorization (WHAT) are separate —
     always implement both; one does not imply the other.
  2. JWTs are encoded, NOT encrypted — never put secrets in payload.
  3. OAuth2 separates consent from access — codes are single-use,
     access tokens short-lived, refresh tokens long-lived.
  4. Hybrid encryption in practice: asymmetric for key exchange,
     symmetric for bulk data (exactly how TLS works).
  5. OWASP Top 10: Broken Access Control is #1 because devs forget
     server-side authz checks on every API endpoint.
  6. Validate ALL input server-side — client validation is UX only.
  7. RBAC: define roles with minimum permissions, check on every API.
  8. Security headers are free: CSP prevents XSS, HSTS enforces HTTPS.
`);
console.log('  "In a country where 1.4 billion identities are digital,');
console.log('   security is not a feature — it is a fundamental right."');
console.log("   - UIDAI Security Architecture Team");
console.log();
console.log("=".repeat(70));
console.log("  END OF FILE 34");
console.log("=".repeat(70));
