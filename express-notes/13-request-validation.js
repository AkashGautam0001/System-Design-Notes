/** ============================================================
 *  FILE 13 — Request Validation from Scratch
 *  Topic: Body, param, and query validation middleware
 *  WHY THIS MATTERS: Unvalidated input is the #1 source of
 *  bugs and security holes. Libraries like Joi and Zod are
 *  great, but building validation from scratch teaches you
 *  exactly what they do — and lets you validate anywhere
 *  without adding dependencies.
 *  ============================================================ */

// ── THE STORY ──────────────────────────────────────────────
// Aadhaar Enrollment Validation
// At the UIDAI Aadhaar Enrollment Centre, Operator Priya
// validates every enrollment form before it enters the system.
// Every applicant's data must pass a checklist before being
// processed: Is the name present? Is the age within range?
// Does the Aadhaar number match the 12-digit pattern? Is the
// address complete? Priya doesn't care who the applicant IS
// — she only cares whether the form meets spec. If it fails,
// she writes a detailed rejection slip listing every defect
// so the applicant can fix them all at once, not one at a
// time. Our validation middleware works the same way: define
// the spec (schema), inspect the request, and return ALL
// errors at once in a structured format.
// ───────────────────────────────────────────────────────────

const express = require('express');
const http = require('http');

// ============================================================
// BLOCK 1 — Body Validation Middleware Factory
// ============================================================
//
// We build a function that takes a schema object and returns
// Express middleware. The schema describes each field's rules:
//   {
//     name: { required: true, type: 'string', minLength: 2, maxLength: 50 },
//     age:  { required: true, type: 'number', min: 0, max: 150 },
//     email:{ required: true, type: 'string', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }
//   }
//
// WHY: A declarative schema is easier to read, maintain, and
// test than scattered if-statements throughout your routes.
// (See nodejs-notes/08 for HTTP request body fundamentals)

// ── Core validation engine ─────────────────────────────────
// Returns an array of { field, message } error objects.
function validateValue(field, value, rules) {
  const errors = [];

  // ── Required check ─────────────────────────────────────
  if (rules.required && (value === undefined || value === null || value === '')) {
    errors.push({ field, message: `${field} is required` });
    return errors;  // WHY: No point checking other rules if the value is missing
  }

  // If not required and not provided, skip remaining checks
  if (value === undefined || value === null) {
    return errors;
  }

  // ── Type check ─────────────────────────────────────────
  // WHY: JSON parse gives us the right JS types, but query
  // params are always strings. The type check catches mismatches.
  if (rules.type) {
    const actualType = typeof value;
    if (rules.type === 'number' && actualType !== 'number') {
      errors.push({ field, message: `${field} must be a number (got ${actualType})` });
      return errors;
    }
    if (rules.type === 'string' && actualType !== 'string') {
      errors.push({ field, message: `${field} must be a string (got ${actualType})` });
      return errors;
    }
    if (rules.type === 'boolean' && actualType !== 'boolean') {
      errors.push({ field, message: `${field} must be a boolean (got ${actualType})` });
      return errors;
    }
    if (rules.type === 'array' && !Array.isArray(value)) {
      errors.push({ field, message: `${field} must be an array` });
      return errors;
    }
  }

  // ── String-specific rules ──────────────────────────────
  if (typeof value === 'string') {
    if (rules.minLength !== undefined && value.length < rules.minLength) {
      errors.push({
        field,
        message: `${field} must be at least ${rules.minLength} characters (got ${value.length})`
      });
    }
    if (rules.maxLength !== undefined && value.length > rules.maxLength) {
      errors.push({
        field,
        message: `${field} must be at most ${rules.maxLength} characters (got ${value.length})`
      });
    }
    if (rules.pattern && !rules.pattern.test(value)) {
      errors.push({
        field,
        message: rules.patternMessage || `${field} does not match required pattern`
      });
    }
  }

  // ── Number-specific rules ──────────────────────────────
  if (typeof value === 'number') {
    if (rules.min !== undefined && value < rules.min) {
      errors.push({ field, message: `${field} must be at least ${rules.min} (got ${value})` });
    }
    if (rules.max !== undefined && value > rules.max) {
      errors.push({ field, message: `${field} must be at most ${rules.max} (got ${value})` });
    }
    if (rules.integer && !Number.isInteger(value)) {
      errors.push({ field, message: `${field} must be an integer` });
    }
  }

  // ── Enum check (allowed values) ────────────────────────
  if (rules.enum && !rules.enum.includes(value)) {
    errors.push({
      field,
      message: `${field} must be one of: ${rules.enum.join(', ')} (got "${value}")`
    });
  }

  return errors;
}

// ── Body validation middleware factory ──────────────────────
// WHY: Returns middleware — a function(req, res, next). This
// "factory" pattern lets you configure different schemas for
// different routes while reusing the same validation logic.
function validateBody(schema) {
  return (req, res, next) => {
    const errors = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body[field];
      errors.push(...validateValue(field, value, rules));
    }

    if (errors.length > 0) {
      // WHY: Return ALL errors, not just the first one.
      // This lets the applicant fix everything in one pass
      // instead of playing whack-a-mole.
      return res.status(422).json({
        success: false,
        error: { message: 'Validation failed', errors }
      });
    }

    next();
  };
}

// ============================================================
// BLOCK 2 — Param + Query Validation, Composing Validators,
//           Sanitization
// ============================================================
//
// Params (from URL path) and query strings need validation too.
// Params are always strings, so we need numeric coercion checks.
// Query values need allowed-value and range checks.
//
// Sanitization: trim whitespace, convert to lowercase, etc.
// WHY: Sanitize BEFORE validating so " priya@UIDAI.gov.in  "
// becomes "priya@uidai.gov.in" before the pattern check.

// ── Param validation middleware factory ────────────────────
function validateParams(schema) {
  return (req, res, next) => {
    const errors = [];

    for (const [param, rules] of Object.entries(schema)) {
      const value = req.params[param];

      if (rules.isNumeric) {
        // WHY: URL params are always strings. We check if the
        // string represents a valid number.
        if (!/^\d+$/.test(value)) {
          errors.push({ field: `params.${param}`, message: `${param} must be a numeric value` });
          continue;
        }
        // Coerce to number for downstream use
        req.params[param] = parseInt(value, 10);
      }

      if (rules.isUUID) {
        // WHY: UUID-like pattern check catches malformed IDs
        // before they hit the database.
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidPattern.test(value)) {
          errors.push({ field: `params.${param}`, message: `${param} must be a valid UUID` });
        }
      }

      if (rules.minValue !== undefined && Number(value) < rules.minValue) {
        errors.push({
          field: `params.${param}`,
          message: `${param} must be at least ${rules.minValue}`
        });
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid URL parameters', errors }
      });
    }

    next();
  };
}

// ── Query validation middleware factory ─────────────────────
function validateQuery(schema) {
  return (req, res, next) => {
    const errors = [];

    for (const [param, rules] of Object.entries(schema)) {
      let value = req.query[param];

      // Skip if not provided and not required
      if (value === undefined) {
        if (rules.required) {
          errors.push({ field: `query.${param}`, message: `${param} query parameter is required` });
        }
        continue;
      }

      // ── Sanitization — applied BEFORE validation ─────────
      if (rules.sanitize) {
        if (rules.sanitize.includes('trim')) {
          value = value.trim();
        }
        if (rules.sanitize.includes('toLowerCase')) {
          value = value.toLowerCase();
        }
        if (rules.sanitize.includes('toNumber')) {
          value = Number(value);
          if (isNaN(value)) {
            errors.push({ field: `query.${param}`, message: `${param} must be a valid number` });
            continue;
          }
        }
        // Write sanitized value back
        req.query[param] = value;
      }

      // Allowed values (enum)
      if (rules.enum && !rules.enum.includes(value)) {
        errors.push({
          field: `query.${param}`,
          message: `${param} must be one of: ${rules.enum.join(', ')} (got "${value}")`
        });
      }

      // Numeric range (for query params coerced to number)
      if (rules.min !== undefined && Number(value) < rules.min) {
        errors.push({
          field: `query.${param}`,
          message: `${param} must be at least ${rules.min}`
        });
      }
      if (rules.max !== undefined && Number(value) > rules.max) {
        errors.push({
          field: `query.${param}`,
          message: `${param} must be at most ${rules.max}`
        });
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid query parameters', errors }
      });
    }

    next();
  };
}

// ── Sanitization middleware (standalone) ────────────────────
// WHY: Sometimes you want to sanitize the body before any
// validation runs — trim all strings, normalize emails, etc.
function sanitizeBody(fieldRules) {
  return (req, res, next) => {
    for (const [field, transforms] of Object.entries(fieldRules)) {
      if (req.body[field] === undefined) continue;

      let value = req.body[field];

      if (typeof value === 'string') {
        if (transforms.includes('trim')) value = value.trim();
        if (transforms.includes('toLowerCase')) value = value.toLowerCase();
        if (transforms.includes('escape')) {
          // WHY: Basic HTML escaping prevents XSS when the
          // value is later rendered in a template.
          value = value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
        }
      }

      req.body[field] = value;
    }
    next();
  };
}

// ── Compose validators — chain multiple middleware ──────────
// WHY: compose(fn1, fn2, fn3) runs them in order, stopping
// at the first one that sends a response. This lets you
// build complex validation from simple pieces.
function compose(...middlewares) {
  return (req, res, next) => {
    let index = 0;

    function run() {
      if (index >= middlewares.length) return next();
      const mw = middlewares[index++];
      mw(req, res, (err) => {
        if (err) return next(err);
        // WHY: If the middleware already sent a response
        // (res.headersSent), don't call the next one.
        if (res.headersSent) return;
        run();
      });
    }

    run();
  };
}

// ============================================================
// BUILD THE APP
// ============================================================
function buildApp() {
  const app = express();
  app.use(express.json());

  // ── Sample data ────────────────────────────────────────────
  const enrollments = [
    { id: 1, name: 'Rajesh Kumar', fee: 25.99, category: 'general' },
    { id: 2, name: 'Sunita Devi', fee: 15.50, category: 'general' },
    { id: 3, name: 'Amit Sharma', fee: 89.00, category: 'senior-citizen' }
  ];

  // ── Block 1: Body validation on POST ──────────────────────

  // Schema for creating an enrollment
  const createEnrollmentSchema = {
    name: {
      required: true,
      type: 'string',
      minLength: 2,
      maxLength: 50
    },
    fee: {
      required: true,
      type: 'number',
      min: 0.01,
      max: 99999.99
    },
    category: {
      required: true,
      type: 'string',
      enum: ['general', 'senior-citizen', 'child', 'nri']
    },
    address: {
      required: false,
      type: 'string',
      maxLength: 200
    },
    email: {
      required: true,
      type: 'string',
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      patternMessage: 'email must be a valid email address'
    }
  };

  app.post('/enrollments',
    // WHY: Sanitize FIRST, then validate. This way " PRIYA@Uidai.GOV.IN  "
    // becomes "priya@uidai.gov.in" before the pattern check runs.
    sanitizeBody({
      name: ['trim'],
      email: ['trim', 'toLowerCase'],
      address: ['trim', 'escape']
    }),
    validateBody(createEnrollmentSchema),
    (req, res) => {
      const newEnrollment = {
        id: enrollments.length + 1,
        ...req.body
      };
      enrollments.push(newEnrollment);
      res.status(201).json({ success: true, data: newEnrollment });
    }
  );

  // ── Block 2: Param validation ─────────────────────────────

  app.get('/enrollments/:id',
    validateParams({
      id: { isNumeric: true, minValue: 1 }
    }),
    (req, res) => {
      const enrollment = enrollments.find(p => p.id === req.params.id);
      if (!enrollment) {
        return res.status(404).json({ success: false, error: { message: 'Enrollment not found' } });
      }
      res.json({ success: true, data: enrollment });
    }
  );

  // UUID param validation demo
  app.get('/applications/:applicationId',
    validateParams({
      applicationId: { isUUID: true }
    }),
    (req, res) => {
      // Simulated application lookup
      res.json({
        success: true,
        data: { applicationId: req.params.applicationId, status: 'approved' }
      });
    }
  );

  // ── Block 2: Query validation ─────────────────────────────

  app.get('/enrollments',
    validateQuery({
      category: {
        enum: ['general', 'senior-citizen', 'child', 'nri']
      },
      minFee: {
        sanitize: ['trim', 'toNumber'],
        min: 0
      },
      maxFee: {
        sanitize: ['trim', 'toNumber'],
        max: 100000
      },
      sort: {
        enum: ['name', 'fee', 'category']
      }
    }),
    (req, res) => {
      let results = [...enrollments];

      if (req.query.category) {
        results = results.filter(p => p.category === req.query.category);
      }
      if (req.query.minFee !== undefined) {
        results = results.filter(p => p.fee >= Number(req.query.minFee));
      }
      if (req.query.maxFee !== undefined) {
        results = results.filter(p => p.fee <= Number(req.query.maxFee));
      }

      res.json({ success: true, data: results });
    }
  );

  // ── Composed validators example ───────────────────────────

  app.put('/enrollments/:id',
    compose(
      validateParams({ id: { isNumeric: true, minValue: 1 } }),
      sanitizeBody({ name: ['trim'], email: ['trim', 'toLowerCase'] }),
      validateBody(createEnrollmentSchema)
    ),
    (req, res) => {
      const index = enrollments.findIndex(p => p.id === req.params.id);
      if (index === -1) {
        return res.status(404).json({ success: false, error: { message: 'Enrollment not found' } });
      }
      enrollments[index] = { id: req.params.id, ...req.body };
      res.json({ success: true, data: enrollments[index] });
    }
  );

  return app;
}

// ============================================================
// SELF-TEST — Validate all the things
// ============================================================
async function runTests() {
  const app = buildApp();

  const server = app.listen(0, async () => {
    const port = server.address().port;
    const base = `http://localhost:${port}`;
    console.log(`[13-request-validation] Server on port ${port}\n`);

    try {
      // ── Block 1: Body Validation ───────────────────────────

      console.log('=== Block 1 — Body Validation ===\n');

      // Valid enrollment creation
      const r1 = await fetch(`${base}/enrollments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: '  Vikram Sarabhai  ',       // will be trimmed
          fee: 42.99,
          category: 'general',
          address: '<b>MG Road, Bengaluru</b>',  // will be escaped
          email: '  VIKRAM@Example.COM  '     // will be trimmed + lowered
        })
      });
      const j1 = await r1.json();
      console.log('POST /enrollments (valid, with sanitization)');
      console.log('Status:', r1.status);
      // Output: Status: 201
      console.log('Name trimmed:', JSON.stringify(j1.data.name));
      // Output: Name trimmed: "Vikram Sarabhai"
      console.log('Email sanitized:', j1.data.email);
      // Output: Email sanitized: vikram@example.com
      console.log('HTML escaped:', j1.data.address);
      // Output: HTML escaped: &lt;b&gt;MG Road, Bengaluru&lt;/b&gt;
      console.log('');

      // Missing required fields
      const r2 = await fetch(`${base}/enrollments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const j2 = await r2.json();
      console.log('POST /enrollments (empty body)');
      console.log('Status:', r2.status);
      // Output: Status: 422
      console.log('Error count:', j2.error.errors.length);
      // Output: Error count: 4
      console.log('Errors:');
      j2.error.errors.forEach(e => console.log(`  - ${e.field}: ${e.message}`));
      // Output:   - name: name is required
      // Output:   - fee: fee is required
      // Output:   - category: category is required
      // Output:   - email: email is required
      console.log('');

      // Wrong types
      const r3 = await fetch(`${base}/enrollments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 123,               // should be string
          fee: 'not a number',     // should be number
          category: 'vip',         // not in enum
          email: 'not-an-email'    // fails pattern
        })
      });
      const j3 = await r3.json();
      console.log('POST /enrollments (wrong types + invalid values)');
      console.log('Status:', r3.status);
      // Output: Status: 422
      console.log('Errors:');
      j3.error.errors.forEach(e => console.log(`  - ${e.field}: ${e.message}`));
      // Output:   - name: name must be a string (got number)
      // Output:   - fee: fee must be a number (got string)
      // Output:   - category: category must be one of: general, senior-citizen, child, nri (got "vip")
      // Output:   - email: email must be a valid email address
      console.log('');

      // String length violations
      const r4 = await fetch(`${base}/enrollments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'A',              // minLength 2
          fee: -5,                // min 0.01
          category: 'general',
          email: 'a@b.com'
        })
      });
      const j4 = await r4.json();
      console.log('POST /enrollments (length/range violations)');
      console.log('Status:', r4.status);
      // Output: Status: 422
      console.log('Errors:');
      j4.error.errors.forEach(e => console.log(`  - ${e.field}: ${e.message}`));
      // Output:   - name: name must be at least 2 characters (got 1)
      // Output:   - fee: fee must be at least 0.01 (got -5)
      console.log('');

      // ── Block 2: Param + Query Validation ──────────────────

      console.log('=== Block 2 — Param & Query Validation ===\n');

      // Valid param
      const r5 = await fetch(`${base}/enrollments/1`);
      const j5 = await r5.json();
      console.log('GET /enrollments/1 (valid numeric param)');
      console.log('Status:', r5.status);
      // Output: Status: 200
      console.log('Enrollment:', j5.data.name);
      // Output: Enrollment: Rajesh Kumar
      console.log('');

      // Non-numeric param
      const r6 = await fetch(`${base}/enrollments/abc`);
      const j6 = await r6.json();
      console.log('GET /enrollments/abc (non-numeric param)');
      console.log('Status:', r6.status);
      // Output: Status: 400
      console.log('Error:', j6.error.errors[0].message);
      // Output: Error: id must be a numeric value
      console.log('');

      // UUID param — valid
      const r7 = await fetch(`${base}/applications/550e8400-e29b-41d4-a716-446655440000`);
      const j7 = await r7.json();
      console.log('GET /applications/550e8400-... (valid UUID)');
      console.log('Status:', r7.status);
      // Output: Status: 200
      console.log('');

      // UUID param — invalid
      const r8 = await fetch(`${base}/applications/not-a-uuid`);
      const j8 = await r8.json();
      console.log('GET /applications/not-a-uuid (invalid UUID)');
      console.log('Status:', r8.status);
      // Output: Status: 400
      console.log('Error:', j8.error.errors[0].message);
      // Output: Error: applicationId must be a valid UUID
      console.log('');

      // Query validation — valid
      const r9 = await fetch(`${base}/enrollments?category=general&minFee=10`);
      const j9 = await r9.json();
      console.log('GET /enrollments?category=general&minFee=10 (valid)');
      console.log('Status:', r9.status);
      // Output: Status: 200
      console.log('Results:', j9.data.length);
      // Output: Results: 2
      console.log('');

      // Query validation — invalid category
      const r10 = await fetch(`${base}/enrollments?category=vip`);
      const j10 = await r10.json();
      console.log('GET /enrollments?category=vip (invalid enum)');
      console.log('Status:', r10.status);
      // Output: Status: 400
      console.log('Error:', j10.error.errors[0].message);
      // Output: Error: category must be one of: general, senior-citizen, child, nri (got "vip")
      console.log('');

      // Query validation — invalid sort
      const r11 = await fetch(`${base}/enrollments?sort=hacked`);
      const j11 = await r11.json();
      console.log('GET /enrollments?sort=hacked (invalid sort)');
      console.log('Status:', r11.status);
      // Output: Status: 400
      console.log('Error:', j11.error.errors[0].message);
      // Output: Error: sort must be one of: name, fee, category (got "hacked")
      console.log('');

      // Composed validators — valid PUT
      const r12 = await fetch(`${base}/enrollments/1`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Updated Rajesh Kumar',
          fee: 29.99,
          category: 'general',
          email: 'rajesh@example.com'
        })
      });
      const j12 = await r12.json();
      console.log('PUT /enrollments/1 (composed validators, valid)');
      console.log('Status:', r12.status);
      // Output: Status: 200
      console.log('Updated:', j12.data.name);
      // Output: Updated: Updated Rajesh Kumar
      console.log('');

      // Composed validators — invalid param + body
      const r13 = await fetch(`${base}/enrollments/abc`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'X' })
      });
      const j13 = await r13.json();
      console.log('PUT /enrollments/abc (invalid param catches first)');
      console.log('Status:', r13.status);
      // Output: Status: 400
      console.log('Error:', j13.error.errors[0].message);
      // Output: Error: id must be a numeric value
      console.log('(Body validation never ran — compose stopped at params)');

    } catch (err) {
      console.error('Test error:', err.message);
    } finally {
      server.close(() => {
        console.log('\n── Server closed ──');

        // ── KEY TAKEAWAYS ─────────────────────────────────────
        // 1. Validation middleware should return ALL errors at once,
        //    not bail on the first one. Applicants fix all issues in
        //    one pass instead of playing whack-a-mole.
        //
        // 2. Sanitize BEFORE validating: trim, lowercase, escape
        //    first, then check patterns and lengths.
        //
        // 3. A schema-based approach { field: { rules } } is
        //    declarative, testable, and reusable across routes.
        //
        // 4. Validate ALL input sources: body, params, and query.
        //    Attackers don't just craft bodies — they manipulate
        //    URLs and query strings too.
        //
        // 5. compose() chains middleware so the first failure
        //    short-circuits. Validate params before body — no
        //    point validating the body if the URL is malformed.
        //
        // 6. The factory pattern (validateBody(schema) returns
        //    middleware) is the same approach Joi, Zod, and
        //    express-validator use internally.
      });
    }
  });
}

runTests();
