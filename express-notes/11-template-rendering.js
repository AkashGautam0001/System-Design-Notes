/** ============================================================
 *  FILE 11 — Template Rendering & Custom Engines
 *  Topic: app.engine(), app.set('view engine'), res.render()
 *  WHY THIS MATTERS: Server-side rendering lets you build
 *  dynamic HTML pages from data — the foundation of every
 *  web app that isn't a pure SPA. Understanding how template
 *  engines integrate with Express demystifies "magic" like
 *  EJS, Pug, and Handlebars.
 *  ============================================================ */

// ── THE STORY ──────────────────────────────────────────────
// Bollywood Poster Generator
// In a bustling Mumbai design studio, the poster designer
// doesn't create each film poster from scratch. Instead, she
// builds reusable poster templates with blank slots for
// title, hero, heroine, director, and release date. When the
// producer arrives with data — "Shah Rukh Khan, Deepika
// Padukone, directed by Sanjay Leela Bhansali, releasing
// Diwali 2025" — she locks the data into the template, rolls
// the printer, and produces a perfect poster. Express template
// rendering works the same way: register an engine (the
// printer), point to a views folder (the template drawer),
// and call res.render() with data (the producer's brief).
// The engine reads the template, fills slots, and sends
// finished HTML to the client.
// ───────────────────────────────────────────────────────────

const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ── Temp directory for our template files ──────────────────
const VIEWS_DIR = path.join(__dirname, '_tmp_views_11');

// ============================================================
// BLOCK 1 — Register a Custom Template Engine, Render Data
// ============================================================
//
// Express doesn't ship with a template engine. You install one
// (EJS, Pug, Handlebars) or — and this is the enlightening
// part — you build your own with app.engine().
//
// The contract is simple:
//   app.engine(ext, function (filePath, options, callback) {
//       // 1. Read the template file at filePath
//       // 2. Replace placeholders with values from options
//       // 3. Call callback(null, renderedHTML) or callback(err)
//   });
//
// WHY: Knowing the engine contract means you can debug any
// template rendering issue, and you understand exactly what
// res.render() does under the hood.

// ── Custom engine: "simplehtml" ────────────────────────────
// Supports:
//   {{variable}}         — replaced with options[variable]
//   {{#each items}}...{{/each}} — loop over arrays
//   {{#if cond}}...{{/if}}      — conditional rendering
function simpleHtmlEngine(filePath, options, callback) {
  fs.readFile(filePath, 'utf8', (err, template) => {
    if (err) return callback(err);

    let rendered = template;

    // ── Step 1: Process {{#each collection}}...{{/each}} ──
    // WHY: Loops are essential — almost every page renders a list.
    const eachRegex = /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g;
    rendered = rendered.replace(eachRegex, (_, key, body) => {
      const arr = options[key];
      if (!Array.isArray(arr)) return '';
      return arr.map((item, index) => {
        let row = body;
        // Replace {{this}} with the item itself (for simple arrays)
        row = row.replace(/\{\{this\}\}/g, String(item));
        // Replace {{@index}} with loop index
        row = row.replace(/\{\{@index\}\}/g, String(index));
        // Replace {{prop}} with item.prop (for object arrays)
        if (typeof item === 'object' && item !== null) {
          row = row.replace(/\{\{(\w+)\}\}/g, (__, prop) => {
            return item[prop] !== undefined ? String(item[prop]) : '';
          });
        }
        return row;
      }).join('');
    });

    // ── Step 2: Process {{#if condition}}...{{/if}} ────────
    // WHY: Conditional rendering lets you show/hide sections
    // based on data — "show producer panel only for producers".
    const ifRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
    rendered = rendered.replace(ifRegex, (_, key, body) => {
      return options[key] ? body : '';
    });

    // ── Step 3: Replace remaining {{variable}} placeholders ─
    rendered = rendered.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return options[key] !== undefined ? String(options[key]) : '';
    });

    // WHY: The callback pattern matches Express's internal API.
    // callback(null, html) sends the rendered string as the response.
    callback(null, rendered);
  });
}

// ============================================================
// BLOCK 2 — Layouts/Partials Pattern, Conditional Rendering,
//           Lists in Templates
// ============================================================
//
// Real apps need layouts (header/footer wrapping every page)
// and partials (reusable snippets). Without a full engine like
// Pug, we simulate layouts by rendering the "inner" template
// first, then injecting it into a layout template.
//
// WHY: Understanding the layout/partial pattern helps you
// architect larger apps regardless of which engine you use.

// ── Helper: render a template file with data (sync-ish) ────
function renderFile(filePath, data) {
  return new Promise((resolve, reject) => {
    simpleHtmlEngine(filePath, data, (err, html) => {
      if (err) reject(err);
      else resolve(html);
    });
  });
}

// ── Create template files on disk ──────────────────────────
function createTemplateFiles() {
  fs.mkdirSync(VIEWS_DIR, { recursive: true });

  // Layout template — wraps every page
  fs.writeFileSync(path.join(VIEWS_DIR, 'layout.simplehtml'), [
    '<!DOCTYPE html>',
    '<html><head><title>{{pageTitle}}</title></head>',
    '<body>',
    '<header><h1>Bollywood Poster Studio</h1><nav>Home | About</nav></header>',
    '<main>{{body}}</main>',
    '<footer>Poster generated at {{timestamp}}</footer>',
    '</body></html>'
  ].join('\n'));

  // Home page template
  fs.writeFileSync(path.join(VIEWS_DIR, 'home.simplehtml'), [
    '<h2>Welcome, {{username}}!</h2>',
    '{{#if isProducer}}<p class="producer-badge">Producer Access</p>{{/if}}',
    '<h3>Upcoming Films:</h3>',
    '<ul>',
    '{{#each films}}<li>#{{@index}} — {{title}} ({{status}})</li>{{/each}}',
    '</ul>',
    '{{#if noFilms}}<p>No films assigned.</p>{{/if}}'
  ].join('\n'));

  // Simple greeting template (for Block 1 basic demo)
  fs.writeFileSync(path.join(VIEWS_DIR, 'greeting.simplehtml'), [
    '<h1>Hello, {{name}}!</h1>',
    '<p>You have {{count}} unread scripts.</p>',
    '<p>Your role: {{role}}</p>'
  ].join('\n'));

  // List-only template (for demonstrating iteration)
  fs.writeFileSync(path.join(VIEWS_DIR, 'film-list.simplehtml'), [
    '<h2>Film Poster Catalog</h2>',
    '<table>',
    '<tr><th>#</th><th>Film</th><th>Budget</th></tr>',
    '{{#each films}}<tr><td>{{@index}}</td><td>{{title}}</td><td>₹{{budget}}</td></tr>{{/each}}',
    '</table>',
    '<p>Total films: {{totalFilms}}</p>'
  ].join('\n'));
}

// ── Clean up temp files ────────────────────────────────────
function cleanupTemplateFiles() {
  fs.rmSync(VIEWS_DIR, { recursive: true, force: true });
}

// ── Build the Express app ──────────────────────────────────
function buildApp() {
  const app = express();

  // Register our custom engine for ".simplehtml" files
  // WHY: app.engine(ext, fn) tells Express "when res.render()
  // encounters a file ending in .ext, use this function to
  // process it." This is the ENTIRE plugin system for views.
  app.engine('simplehtml', simpleHtmlEngine);

  // Tell Express which engine to use by default
  // WHY: Without this, you'd have to write
  // res.render('greeting.simplehtml') every time.
  app.set('view engine', 'simplehtml');

  // Tell Express where to find template files
  // WHY: By default Express looks in ./views. We override it
  // to point to our temp directory.
  app.set('views', VIEWS_DIR);

  // ── Block 1 routes ────────────────────────────────────────

  // Basic render — simplest possible case
  // (See nodejs-notes/08 for HTTP response fundamentals)
  app.get('/greeting', (req, res) => {
    // WHY: res.render(viewName, data) does three things:
    // 1. Finds the file: views/greeting.simplehtml
    // 2. Calls our engine function with (filePath, data, cb)
    // 3. Sends the resulting HTML with Content-Type: text/html
    res.render('greeting', {
      name: 'Shah Rukh Khan',
      count: 7,
      role: 'Lead Actor'
    });
  });

  // ── Block 2 routes ────────────────────────────────────────

  // Layout pattern — render inner template, inject into layout
  app.get('/home', async (req, res) => {
    // WHY: We render the "inner" page first, then inject its
    // HTML into the layout's {{body}} placeholder. This is
    // exactly what layout systems in EJS/Handlebars do.
    const innerData = {
      username: 'Sanjay Leela Bhansali',
      isProducer: true,
      films: [
        { title: 'Design poster for Devdas 2', status: 'in-progress' },
        { title: 'Print Padmaavat banner', status: 'done' },
        { title: 'Proof the Gangubai title card', status: 'pending' }
      ],
      noFilms: false
    };

    try {
      const innerHtml = await renderFile(
        path.join(VIEWS_DIR, 'home.simplehtml'),
        innerData
      );

      // Now render the layout with the inner HTML injected
      res.render('layout', {
        pageTitle: 'Dashboard',
        body: innerHtml,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      res.status(500).send('Render error: ' + err.message);
    }
  });

  // Conditional rendering demo — producer vs junior artist
  app.get('/home-regular', async (req, res) => {
    const innerData = {
      username: 'Junior Artist Raju',
      isProducer: false,          // WHY: {{#if isProducer}} block won't render
      films: [],
      noFilms: true               // WHY: {{#if noFilms}} block WILL render
    };

    try {
      const innerHtml = await renderFile(
        path.join(VIEWS_DIR, 'home.simplehtml'),
        innerData
      );
      res.render('layout', {
        pageTitle: 'Dashboard',
        body: innerHtml,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      res.status(500).send('Render error: ' + err.message);
    }
  });

  // List rendering demo — film poster catalog
  app.get('/films', (req, res) => {
    // WHY: The {{#each films}} block iterates over the array,
    // and {{title}}/{{budget}} resolve to each object's properties.
    res.render('film-list', {
      films: [
        { title: 'Pathaan', budget: '250 Cr' },
        { title: 'RRR', budget: '550 Cr' },
        { title: 'Jawan', budget: '300 Cr' },
        { title: 'Brahmastra', budget: '410 Cr' }
      ],
      totalFilms: 4
    });
  });

  return app;
}

// ============================================================
// SELF-TEST — Start server, make requests, print, shut down
// ============================================================
async function runTests() {
  createTemplateFiles();
  const app = buildApp();

  const server = app.listen(0, async () => {
    const port = server.address().port;
    const base = `http://localhost:${port}`;
    console.log(`[11-template-rendering] Server on port ${port}\n`);

    try {
      // ── Test 1: Basic greeting render ──────────────────────
      console.log('=== Block 1 — Basic Template Rendering ===\n');

      const res1 = await fetch(`${base}/greeting`);
      const html1 = await res1.text();
      console.log('GET /greeting');
      console.log('Status:', res1.status);
      // Output: Status: 200
      console.log('Content-Type:', res1.headers.get('content-type'));
      // Output: Content-Type: text/html; charset=utf-8
      console.log('Body:\n' + html1);
      // Output: <h1>Hello, Shah Rukh Khan!</h1>
      // Output: <p>You have 7 unread scripts.</p>
      // Output: <p>Your role: Lead Actor</p>
      console.log('');

      // ── Test 2: Layout + conditional (producer) ────────────
      console.log('=== Block 2 — Layout Pattern (Producer User) ===\n');

      const res2 = await fetch(`${base}/home`);
      const html2 = await res2.text();
      console.log('GET /home');
      console.log('Status:', res2.status);
      // Output: Status: 200
      console.log('Contains layout header:', html2.includes('Bollywood Poster Studio'));
      // Output: Contains layout header: true
      console.log('Contains producer badge:', html2.includes('Producer Access'));
      // Output: Contains producer badge: true
      console.log('Contains film list:', html2.includes('Design poster for Devdas 2'));
      // Output: Contains film list: true
      console.log('Contains footer:', html2.includes('Poster generated at'));
      // Output: Contains footer: true
      console.log('');

      // ── Test 3: Layout + conditional (regular user) ────────
      console.log('=== Block 2 — Conditional Rendering (Regular User) ===\n');

      const res3 = await fetch(`${base}/home-regular`);
      const html3 = await res3.text();
      console.log('GET /home-regular');
      console.log('Has producer badge:', html3.includes('Producer Access'));
      // Output: Has producer badge: false
      console.log('Has "no films" message:', html3.includes('No films assigned'));
      // Output: Has "no films" message: true
      console.log('');

      // ── Test 4: List rendering ─────────────────────────────
      console.log('=== Block 2 — List Rendering (Film Poster Catalog) ===\n');

      const res4 = await fetch(`${base}/films`);
      const html4 = await res4.text();
      console.log('GET /films');
      console.log('Status:', res4.status);
      // Output: Status: 200
      console.log('Contains table rows:', html4.includes('Pathaan'));
      // Output: Contains table rows: true
      console.log('Contains budget:', html4.includes('₹550 Cr'));
      // Output: Contains budget: true
      console.log('Contains total:', html4.includes('Total films: 4'));
      // Output: Contains total: true
      console.log('Full HTML:\n' + html4);
      // Output: (full film table HTML)

    } catch (err) {
      console.error('Test error:', err.message);
    } finally {
      server.close(() => {
        cleanupTemplateFiles();
        console.log('\n── Server closed, temp files cleaned up ──');

        // ── KEY TAKEAWAYS ─────────────────────────────────────
        // 1. app.engine(ext, fn) registers a function that converts
        //    template files into HTML strings. The fn signature is
        //    (filePath, options, callback).
        //
        // 2. app.set('view engine', ext) sets the default extension
        //    so you can write res.render('home') instead of
        //    res.render('home.ejs').
        //
        // 3. app.set('views', dir) tells Express where to find
        //    template files. Default is ./views.
        //
        // 4. res.render(view, data) finds the template, runs it
        //    through the engine, and sends the result as text/html.
        //
        // 5. Layouts and partials are just patterns — render inner
        //    content first, inject into an outer template. Most
        //    engines automate this, but it's the same concept.
        //
        // 6. Building a custom engine teaches you the exact contract
        //    Express expects, making every other engine trivial
        //    to understand and debug.
      });
    }
  });
}

runTests();
