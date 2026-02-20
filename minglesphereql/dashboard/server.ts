import express from 'express';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.DASHBOARD_PORT || 3000;

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/minglesphereql',
});

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Template helper
function renderPage(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - MingleSphereQL Dashboard</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <nav class="sidebar">
    <div class="logo">
      <h2>MingleSphereQL</h2>
      <span class="subtitle">Dashboard</span>
    </div>
    <ul class="nav-links">
      <li><a href="/">Home</a></li>
      <li><a href="/tables">Tables</a></li>
      <li><a href="/indexes">Indexes</a></li>
      <li><a href="/schemas">Schema</a></li>
      <li><a href="/query">Query Playground</a></li>
      <li><a href="/progress">Progress</a></li>
    </ul>
  </nav>
  <main class="content">
    <header>
      <h1>${title}</h1>
    </header>
    <div class="page-content">
      ${content}
    </div>
  </main>
  <script src="/app.js"></script>
</body>
</html>`;
}

// Routes

// Home
app.get('/', async (_req, res) => {
  try {
    const dbSize = await pool.query("SELECT pg_size_pretty(pg_database_size(current_database())) as size");
    const tableCount = await pool.query("SELECT COUNT(*)::int as count FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'");
    const indexCount = await pool.query("SELECT COUNT(*)::int as count FROM pg_indexes WHERE schemaname = 'public'");
    const extensionList = await pool.query("SELECT extname, extversion FROM pg_extension ORDER BY extname");

    const tables = await pool.query(`
      SELECT schemaname, relname as table_name, n_live_tup as row_count
      FROM pg_stat_user_tables ORDER BY n_live_tup DESC LIMIT 10
    `);

    let content = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${dbSize.rows[0].size}</div>
          <div class="stat-label">Database Size</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${tableCount.rows[0].count}</div>
          <div class="stat-label">Tables</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${indexCount.rows[0].count}</div>
          <div class="stat-label">Indexes</div>
        </div>
      </div>

      <h2>Extensions</h2>
      <div class="badge-list">
        ${extensionList.rows.map(e => `<span class="badge">${e.extname} v${e.extversion}</span>`).join('')}
      </div>

      <h2>Top Tables by Row Count</h2>
      <table class="data-table">
        <thead><tr><th>Table</th><th>Rows</th></tr></thead>
        <tbody>
          ${tables.rows.map(t => `<tr><td><a href="/tables/${t.table_name}">${t.table_name}</a></td><td>${t.row_count}</td></tr>`).join('')}
        </tbody>
      </table>
    `;

    res.send(renderPage('Dashboard Home', content));
  } catch (err: any) {
    res.status(500).send(renderPage('Error', `<pre class="error">${err.message}</pre>`));
  }
});

// Tables list
app.get('/tables', async (_req, res) => {
  try {
    const tables = await pool.query(`
      SELECT t.table_name,
        pg_size_pretty(pg_total_relation_size(quote_ident(t.table_name))) as total_size,
        (SELECT COUNT(*)::int FROM information_schema.columns c WHERE c.table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_name
    `);

    let content = `
      <table class="data-table">
        <thead><tr><th>Table Name</th><th>Columns</th><th>Size</th><th>Actions</th></tr></thead>
        <tbody>
          ${tables.rows.map(t => `
            <tr>
              <td><a href="/tables/${t.table_name}">${t.table_name}</a></td>
              <td>${t.column_count}</td>
              <td>${t.total_size}</td>
              <td><a href="/tables/${t.table_name}" class="btn btn-sm">Browse</a></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    res.send(renderPage('Tables', content));
  } catch (err: any) {
    res.status(500).send(renderPage('Error', `<pre class="error">${err.message}</pre>`));
  }
});

// Table detail
app.get('/tables/:name', async (req, res) => {
  const tableName = req.params.name;
  const page = parseInt(req.query.page as string) || 1;
  const limit = 25;
  const offset = (page - 1) * limit;

  try {
    const columns = await pool.query(
      "SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position",
      [tableName]
    );

    const countResult = await pool.query(`SELECT COUNT(*)::int as count FROM ${tableName}`);
    const totalRows = countResult.rows[0].count;
    const totalPages = Math.ceil(totalRows / limit);

    const rows = await pool.query(`SELECT * FROM ${tableName} ORDER BY 1 LIMIT $1 OFFSET $2`, [limit, offset]);

    let content = `
      <h2>Columns</h2>
      <table class="data-table">
        <thead><tr><th>Name</th><th>Type</th><th>Nullable</th><th>Default</th></tr></thead>
        <tbody>
          ${columns.rows.map(c => `
            <tr>
              <td>${c.column_name}</td>
              <td><span class="badge badge-type">${c.data_type}</span></td>
              <td>${c.is_nullable}</td>
              <td><code>${c.column_default || '-'}</code></td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <h2>Data (${totalRows} rows)</h2>
      ${rows.rows.length > 0 ? `
        <div class="table-scroll">
        <table class="data-table">
          <thead><tr>${rows.fields.map(f => `<th>${f.name}</th>`).join('')}</tr></thead>
          <tbody>
            ${rows.rows.map(row => `
              <tr>${rows.fields.map(f => {
                const val = row[f.name];
                if (val === null) return '<td class="null">null</td>';
                if (typeof val === 'object') return `<td><pre class="json-cell">${JSON.stringify(val, null, 2)}</pre></td>`;
                return `<td>${val}</td>`;
              }).join('')}</tr>
            `).join('')}
          </tbody>
        </table>
        </div>

        <div class="pagination">
          ${page > 1 ? `<a href="/tables/${tableName}?page=${page - 1}" class="btn">Previous</a>` : ''}
          <span>Page ${page} of ${totalPages}</span>
          ${page < totalPages ? `<a href="/tables/${tableName}?page=${page + 1}" class="btn">Next</a>` : ''}
        </div>
      ` : '<p class="empty">No rows in this table.</p>'}
    `;

    res.send(renderPage(`Table: ${tableName}`, content));
  } catch (err: any) {
    res.status(500).send(renderPage('Error', `<pre class="error">${err.message}</pre>`));
  }
});

// Single row
app.get('/tables/:name/:id', async (req, res) => {
  const { name, id } = req.params;
  try {
    const result = await pool.query(`SELECT * FROM ${name} WHERE id = $1`, [id]);
    if (result.rows.length === 0) {
      res.status(404).send(renderPage('Not Found', '<p>Row not found.</p>'));
      return;
    }

    const row = result.rows[0];
    let content = `
      <div class="row-detail">
        ${Object.entries(row).map(([key, value]) => `
          <div class="field">
            <label>${key}</label>
            <div class="value">${value === null ? '<span class="null">null</span>' : typeof value === 'object' ? `<pre class="json-cell">${JSON.stringify(value, null, 2)}</pre>` : value}</div>
          </div>
        `).join('')}
      </div>
      <a href="/tables/${name}" class="btn">Back to ${name}</a>
    `;

    res.send(renderPage(`${name} #${id}`, content));
  } catch (err: any) {
    res.status(500).send(renderPage('Error', `<pre class="error">${err.message}</pre>`));
  }
});

// Indexes
app.get('/indexes', async (_req, res) => {
  try {
    const indexes = await pool.query(`
      SELECT indexname, tablename, indexdef,
        CASE
          WHEN indexdef LIKE '%USING btree%' THEN 'btree'
          WHEN indexdef LIKE '%USING hash%' THEN 'hash'
          WHEN indexdef LIKE '%USING gin%' THEN 'gin'
          WHEN indexdef LIKE '%USING gist%' THEN 'gist'
          WHEN indexdef LIKE '%USING hnsw%' THEN 'hnsw'
          WHEN indexdef LIKE '%USING ivfflat%' THEN 'ivfflat'
          ELSE 'btree'
        END as index_type
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `);

    const badgeColors: Record<string, string> = {
      btree: 'badge-blue', hash: 'badge-purple', gin: 'badge-green',
      gist: 'badge-orange', hnsw: 'badge-red', ivfflat: 'badge-yellow',
    };

    let content = `
      <table class="data-table">
        <thead><tr><th>Index</th><th>Table</th><th>Type</th><th>Definition</th></tr></thead>
        <tbody>
          ${indexes.rows.map(i => `
            <tr>
              <td>${i.indexname}</td>
              <td><a href="/tables/${i.tablename}">${i.tablename}</a></td>
              <td><span class="badge ${badgeColors[i.index_type] || 'badge-blue'}">${i.index_type}</span></td>
              <td><code>${i.indexdef}</code></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    res.send(renderPage('Indexes', content));
  } catch (err: any) {
    res.status(500).send(renderPage('Error', `<pre class="error">${err.message}</pre>`));
  }
});

// Schemas (ER diagram)
app.get('/schemas', async (_req, res) => {
  try {
    const tables = await pool.query(`
      SELECT t.table_name
      FROM information_schema.tables t
      WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_name
    `);

    const fks = await pool.query(`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table,
        ccu.column_name AS foreign_column
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
      ORDER BY tc.table_name
    `);

    let content = `
      <h2>Tables</h2>
      <div class="schema-grid">
        ${await Promise.all(tables.rows.map(async (t: any) => {
          const cols = await pool.query(
            "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position",
            [t.table_name]
          );
          return `
            <div class="schema-card">
              <h3>${t.table_name}</h3>
              <ul>
                ${cols.rows.map((c: any) => `
                  <li>
                    <span class="col-name">${c.column_name}</span>
                    <span class="col-type">${c.data_type}</span>
                    ${c.is_nullable === 'NO' ? '<span class="badge badge-red">NOT NULL</span>' : ''}
                  </li>
                `).join('')}
              </ul>
            </div>
          `;
        })).then(cards => cards.join(''))}
      </div>

      <h2>Foreign Key Relationships</h2>
      <table class="data-table">
        <thead><tr><th>Table</th><th>Column</th><th>References</th><th>Foreign Column</th></tr></thead>
        <tbody>
          ${fks.rows.map(fk => `
            <tr>
              <td>${fk.table_name}</td>
              <td>${fk.column_name}</td>
              <td><a href="/tables/${fk.foreign_table}">${fk.foreign_table}</a></td>
              <td>${fk.foreign_column}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    res.send(renderPage('Database Schema', content));
  } catch (err: any) {
    res.status(500).send(renderPage('Error', `<pre class="error">${err.message}</pre>`));
  }
});

// Query playground
app.get('/query', (_req, res) => {
  const content = `
    <div class="query-playground">
      <form method="POST" action="/query">
        <textarea name="sql" id="sql-input" rows="6" placeholder="SELECT * FROM users LIMIT 10;"></textarea>
        <div class="query-actions">
          <button type="submit" class="btn btn-primary">Run Query</button>
          <label><input type="checkbox" name="explain" value="1"> EXPLAIN ANALYZE</label>
        </div>
      </form>
      <div id="query-results"></div>
    </div>
  `;
  res.send(renderPage('Query Playground', content));
});

app.post('/query', async (req, res) => {
  let sql = req.body.sql?.trim();
  const explain = req.body.explain;

  if (!sql) {
    res.send(renderPage('Query Playground', '<p class="error">No query provided.</p>'));
    return;
  }

  try {
    if (explain) {
      sql = `EXPLAIN (ANALYZE, FORMAT TEXT) ${sql}`;
    }

    const start = Date.now();
    const result = await pool.query(sql);
    const duration = Date.now() - start;

    let resultsHtml = '';
    if (result.rows.length > 0) {
      resultsHtml = `
        <div class="query-meta">
          <span>${result.rowCount} rows returned in ${duration}ms</span>
        </div>
        <div class="table-scroll">
        <table class="data-table">
          <thead><tr>${result.fields.map(f => `<th>${f.name}</th>`).join('')}</tr></thead>
          <tbody>
            ${result.rows.slice(0, 100).map(row => `
              <tr>${result.fields.map(f => {
                const val = row[f.name];
                if (val === null) return '<td class="null">null</td>';
                if (typeof val === 'object') return `<td><pre class="json-cell">${JSON.stringify(val, null, 2)}</pre></td>`;
                return `<td>${val}</td>`;
              }).join('')}</tr>
            `).join('')}
          </tbody>
        </table>
        </div>
      `;
    } else {
      resultsHtml = `<p class="success">Query executed successfully. ${result.rowCount} rows affected. (${duration}ms)</p>`;
    }

    const content = `
      <div class="query-playground">
        <form method="POST" action="/query">
          <textarea name="sql" id="sql-input" rows="6">${req.body.sql}</textarea>
          <div class="query-actions">
            <button type="submit" class="btn btn-primary">Run Query</button>
            <label><input type="checkbox" name="explain" value="1" ${explain ? 'checked' : ''}> EXPLAIN ANALYZE</label>
          </div>
        </form>
        ${resultsHtml}
      </div>
    `;

    res.send(renderPage('Query Playground', content));
  } catch (err: any) {
    const content = `
      <div class="query-playground">
        <form method="POST" action="/query">
          <textarea name="sql" id="sql-input" rows="6">${req.body.sql}</textarea>
          <div class="query-actions">
            <button type="submit" class="btn btn-primary">Run Query</button>
            <label><input type="checkbox" name="explain" value="1" ${explain ? 'checked' : ''}> EXPLAIN ANALYZE</label>
          </div>
        </form>
        <pre class="error">${err.message}</pre>
      </div>
    `;
    res.send(renderPage('Query Playground', content));
  }
});

// Progress
app.get('/progress', async (_req, res) => {
  const chapters = [
    { num: 1, title: 'The Genesis of MingleSphereQL' },
    { num: 2, title: 'The Schema Forge' },
    { num: 3, title: 'Opening the Gates' },
    { num: 4, title: 'Finding Your People' },
    { num: 5, title: 'The Column Codex' },
    { num: 6, title: 'The Gatekeepers' },
    { num: 7, title: 'The Migration Trail' },
    { num: 8, title: 'The Query Masters' },
    { num: 9, title: 'Select, Sort, and Slice' },
    { num: 10, title: 'The Great Edit' },
    { num: 11, title: 'The JSON Vault' },
    { num: 12, title: 'The Clean Sweep' },
    { num: 13, title: 'The Batch Express' },
    { num: 14, title: 'The Relational Web' },
    { num: 15, title: 'Many to Many' },
    { num: 16, title: 'Going Deeper' },
    { num: 17, title: 'The Computed Fields' },
    { num: 18, title: 'The Aggregation Engine' },
    { num: 19, title: 'Window into the Data' },
    { num: 20, title: 'The Common Path' },
    { num: 21, title: 'The View from Above' },
    { num: 22, title: 'The Trigger Mechanism' },
    { num: 23, title: 'The Vault' },
    { num: 24, title: 'The Watchtower' },
    { num: 25, title: 'The Pipeline' },
    { num: 26, title: 'The Invisible Walls' },
    { num: 27, title: 'The Policy Workshop' },
    { num: 28, title: 'The Fortress in Production' },
    { num: 29, title: 'Speed Lanes' },
    { num: 30, title: 'The Search Engine' },
    { num: 31, title: 'The Similarity Engine' },
    { num: 32, title: 'The Map' },
    { num: 33, title: 'The Time Machine' },
    { num: 34, title: 'The Production Countdown' },
  ];

  const content = `
    <div class="progress-grid">
      ${chapters.map(ch => `
        <div class="progress-card">
          <span class="chapter-num">${String(ch.num).padStart(2, '0')}</span>
          <span class="chapter-title">${ch.title}</span>
          <span class="chapter-status badge badge-blue">5 tests</span>
        </div>
      `).join('')}
    </div>
    <p class="hint">Run <code>npm run progress</code> in your terminal for detailed test results.</p>
  `;

  res.send(renderPage('Chapter Progress', content));
});

// Start server
app.listen(PORT, () => {
  console.log(`MingleSphereQL Dashboard running at http://localhost:${PORT}`);
});
