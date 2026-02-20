import { Router } from 'express';
import mongoose from 'mongoose';

const router = Router();

// List all collections
router.get('/', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const stats = [];
    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      stats.push({ name: col.name, count });
    }

    const content = `
      <table class="data-table">
        <thead>
          <tr><th>Collection</th><th>Documents</th><th>Actions</th></tr>
        </thead>
        <tbody>
          ${stats.map((c) => `
            <tr>
              <td><a href="/collections/${c.name}">${c.name}</a></td>
              <td>${c.count}</td>
              <td><a href="/collections/${c.name}" class="btn btn-sm">Browse</a></td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;

    res.send(req.app.locals.renderPage('Collections', content, '/collections'));
  } catch (err) {
    res.status(500).send(req.app.locals.renderPage('Error', `<pre class="error">${err.message}</pre>`));
  }
});

// Browse documents in a collection
router.get('/:name', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const collectionName = req.params.name;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const collection = db.collection(collectionName);
    const total = await collection.countDocuments();
    const docs = await collection.find({}).skip(skip).limit(limit).toArray();
    const totalPages = Math.ceil(total / limit);

    const content = `
      <div class="collection-header">
        <h2>${collectionName}</h2>
        <span class="badge">${total} documents</span>
      </div>
      <div class="documents-list">
        ${docs.map((doc) => `
          <div class="doc-card">
            <div class="doc-header">
              <a href="/collections/${collectionName}/${doc._id}">${doc._id}</a>
            </div>
            <pre class="doc-json"><code>${JSON.stringify(doc, null, 2)}</code></pre>
          </div>
        `).join('')}
      </div>
      <div class="pagination">
        ${page > 1 ? `<a href="/collections/${collectionName}?page=${page - 1}" class="btn">Previous</a>` : ''}
        <span>Page ${page} of ${totalPages}</span>
        ${page < totalPages ? `<a href="/collections/${collectionName}?page=${page + 1}" class="btn">Next</a>` : ''}
      </div>`;

    res.send(req.app.locals.renderPage(`${collectionName}`, content, '/collections'));
  } catch (err) {
    res.status(500).send(req.app.locals.renderPage('Error', `<pre class="error">${err.message}</pre>`));
  }
});

// Single document view
router.get('/:name/:id', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const { name, id } = req.params;
    const collection = db.collection(name);

    let doc;
    try {
      doc = await collection.findOne({ _id: new mongoose.Types.ObjectId(id) });
    } catch {
      doc = await collection.findOne({ _id: id });
    }

    if (!doc) {
      res.status(404).send(req.app.locals.renderPage('Not Found', '<p>Document not found.</p>'));
      return;
    }

    const content = `
      <div class="collection-header">
        <a href="/collections/${name}" class="btn">Back to ${name}</a>
      </div>
      <div class="doc-detail">
        <pre class="doc-json"><code>${JSON.stringify(doc, null, 2)}</code></pre>
      </div>`;

    res.send(req.app.locals.renderPage(`Document ${id}`, content, '/collections'));
  } catch (err) {
    res.status(500).send(req.app.locals.renderPage('Error', `<pre class="error">${err.message}</pre>`));
  }
});

export default router;
