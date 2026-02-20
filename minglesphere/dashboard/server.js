import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import collectionsRouter from './routes/collections.js';
import indexesRouter from './routes/indexes.js';
import schemasRouter from './routes/schemas.js';
import aggregationRouter from './routes/aggregation.js';
import progressRouter from './routes/progress.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.DASHBOARD_PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/minglesphere?replicaSet=rs0';

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(join(__dirname, 'public')));

// Template helper
function renderPage(title, content, activeRoute = '/') {
  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - MingleSphere Dashboard</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <nav class="sidebar">
    <div class="logo">
      <h2>MingleSphere</h2>
      <span class="subtitle">Dashboard</span>
    </div>
    <ul class="nav-links">
      <li><a href="/" class="${activeRoute === '/' ? 'active' : ''}">Home</a></li>
      <li><a href="/collections" class="${activeRoute === '/collections' ? 'active' : ''}">Collections</a></li>
      <li><a href="/indexes" class="${activeRoute === '/indexes' ? 'active' : ''}">Indexes</a></li>
      <li><a href="/schemas" class="${activeRoute === '/schemas' ? 'active' : ''}">Schemas</a></li>
      <li><a href="/aggregation" class="${activeRoute === '/aggregation' ? 'active' : ''}">Aggregation</a></li>
      <li><a href="/progress" class="${activeRoute === '/progress' ? 'active' : ''}">Progress</a></li>
    </ul>
  </nav>
  <main class="content">
    <header class="page-header">
      <h1>${title}</h1>
    </header>
    <div class="page-body">
      ${content}
    </div>
  </main>
  <script src="/app.js"></script>
</body>
</html>`;
}

// Make renderPage available to routes
app.locals.renderPage = renderPage;

// Routes
app.get('/', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const adminDb = db.admin();
    let serverStatus = {};
    try {
      serverStatus = await adminDb.serverStatus();
    } catch {
      serverStatus = { version: 'N/A' };
    }
    const collections = await db.listCollections().toArray();
    const collectionStats = [];
    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      collectionStats.push({ name: col.name, count });
    }

    const content = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${collections.length}</div>
          <div class="stat-label">Collections</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${collectionStats.reduce((s, c) => s + c.count, 0)}</div>
          <div class="stat-label">Total Documents</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${serverStatus.version || 'N/A'}</div>
          <div class="stat-label">MongoDB Version</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'}</div>
          <div class="stat-label">Connection Status</div>
        </div>
      </div>
      <h2>Collections Overview</h2>
      <table class="data-table">
        <thead>
          <tr><th>Collection</th><th>Documents</th><th>Actions</th></tr>
        </thead>
        <tbody>
          ${collectionStats.map((c) => `
            <tr>
              <td><a href="/collections/${c.name}">${c.name}</a></td>
              <td>${c.count}</td>
              <td><a href="/collections/${c.name}" class="btn btn-sm">Browse</a></td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;

    res.send(renderPage('Dashboard', content, '/'));
  } catch (err) {
    res.status(500).send(renderPage('Error', `<pre class="error">${err.message}</pre>`, '/'));
  }
});

app.use('/collections', collectionsRouter);
app.use('/indexes', indexesRouter);
app.use('/schemas', schemasRouter);
app.use('/aggregation', aggregationRouter);
app.use('/progress', progressRouter);

// Start server
async function start() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB:', MONGODB_URI);

    app.listen(PORT, () => {
      console.log(`MingleSphere Dashboard running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start dashboard:', err.message);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.disconnect();
  process.exit(0);
});

start();
