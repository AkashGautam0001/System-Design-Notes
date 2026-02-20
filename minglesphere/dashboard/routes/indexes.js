import { Router } from 'express';
import mongoose from 'mongoose';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const allIndexes = [];

    for (const col of collections) {
      const indexes = await db.collection(col.name).indexes();
      for (const idx of indexes) {
        const typeBadges = [];
        if (idx.unique) typeBadges.push('unique');
        if (idx.sparse) typeBadges.push('sparse');
        if (idx.expireAfterSeconds !== undefined) typeBadges.push('TTL');
        if (idx.partialFilterExpression) typeBadges.push('partial');

        const keyEntries = Object.entries(idx.key);
        for (const [, val] of keyEntries) {
          if (val === 'text') { typeBadges.push('text'); break; }
          if (val === '2dsphere') { typeBadges.push('2dsphere'); break; }
          if (val === '2d') { typeBadges.push('2d'); break; }
        }
        if (keyEntries.length > 1 && !typeBadges.includes('text')) {
          typeBadges.push('compound');
        }
        if (typeBadges.length === 0) typeBadges.push('single');

        allIndexes.push({
          collection: col.name,
          name: idx.name,
          key: JSON.stringify(idx.key),
          types: typeBadges,
          ttl: idx.expireAfterSeconds,
        });
      }
    }

    const content = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Collection</th>
            <th>Index Name</th>
            <th>Key</th>
            <th>Type</th>
          </tr>
        </thead>
        <tbody>
          ${allIndexes.map((idx) => `
            <tr>
              <td><a href="/collections/${idx.collection}">${idx.collection}</a></td>
              <td>${idx.name}</td>
              <td><code>${idx.key}</code></td>
              <td>${idx.types.map((t) => `<span class="badge badge-${t}">${t}</span>`).join(' ')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;

    res.send(req.app.locals.renderPage('Indexes', content, '/indexes'));
  } catch (err) {
    res.status(500).send(req.app.locals.renderPage('Error', `<pre class="error">${err.message}</pre>`));
  }
});

export default router;
