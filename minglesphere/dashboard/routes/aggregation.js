import { Router } from 'express';
import mongoose from 'mongoose';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((c) => c.name);

    const content = `
      <div class="aggregation-playground">
        <div class="playground-controls">
          <div class="form-group">
            <label for="collection">Collection</label>
            <select id="collection">
              ${collectionNames.map((n) => `<option value="${n}">${n}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label for="pipeline">Pipeline (JSON array)</label>
            <textarea id="pipeline" rows="12" placeholder='[
  { "$match": { "role": "user" } },
  { "$group": { "_id": "$role", "count": { "$sum": 1 } } },
  { "$sort": { "count": -1 } }
]'></textarea>
          </div>
          <button id="run-pipeline" class="btn btn-primary">Run Pipeline</button>
        </div>
        <div class="playground-results">
          <h3>Results</h3>
          <pre id="results" class="doc-json"><code>Run a pipeline to see results...</code></pre>
        </div>
      </div>`;

    res.send(req.app.locals.renderPage('Aggregation Playground', content, '/aggregation'));
  } catch (err) {
    res.status(500).send(req.app.locals.renderPage('Error', `<pre class="error">${err.message}</pre>`));
  }
});

// API endpoint to run aggregation
router.post('/run', async (req, res) => {
  try {
    const { collection, pipeline } = req.body;
    if (!collection || !pipeline) {
      return res.status(400).json({ error: 'Collection and pipeline required' });
    }

    const db = mongoose.connection.db;
    let parsedPipeline;
    try {
      parsedPipeline = typeof pipeline === 'string' ? JSON.parse(pipeline) : pipeline;
    } catch {
      return res.status(400).json({ error: 'Invalid JSON pipeline' });
    }

    const results = await db.collection(collection).aggregate(parsedPipeline).toArray();
    res.json({ results, count: results.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
