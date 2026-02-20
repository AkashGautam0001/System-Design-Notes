import { Router } from 'express';
import mongoose from 'mongoose';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const modelNames = mongoose.modelNames();
    const models = modelNames.map((name) => {
      const model = mongoose.model(name);
      const schema = model.schema;
      const paths = {};

      schema.eachPath((pathname, schemaType) => {
        paths[pathname] = {
          type: schemaType.instance || schemaType.constructor.name,
          required: !!schemaType.isRequired,
          unique: !!schemaType.options?.unique,
          ref: schemaType.options?.ref || null,
          default: schemaType.defaultValue !== undefined ? String(schemaType.defaultValue) : null,
          enum: schemaType.enumValues?.length ? schemaType.enumValues : null,
        };
      });

      const virtuals = Object.keys(schema.virtuals).filter((v) => v !== 'id');

      return { name, collection: model.collection.name, paths, virtuals };
    });

    const content = `
      <div class="schemas-grid">
        ${models.map((m) => `
          <div class="schema-card">
            <div class="schema-header">
              <h3>${m.name}</h3>
              <span class="badge">${m.collection}</span>
            </div>
            <table class="schema-table">
              <thead>
                <tr><th>Field</th><th>Type</th><th>Attrs</th></tr>
              </thead>
              <tbody>
                ${Object.entries(m.paths)
                  .filter(([p]) => p !== '__v')
                  .map(([pathname, info]) => `
                    <tr>
                      <td><code>${pathname}</code></td>
                      <td>${info.ref ? `<a href="#" title="References ${info.ref}">${info.type} → ${info.ref}</a>` : info.type}</td>
                      <td>
                        ${info.required ? '<span class="badge badge-unique">required</span>' : ''}
                        ${info.unique ? '<span class="badge badge-unique">unique</span>' : ''}
                        ${info.enum ? `<span class="badge badge-partial">enum</span>` : ''}
                      </td>
                    </tr>
                  `).join('')}
              </tbody>
            </table>
            ${m.virtuals.length ? `
              <div class="virtuals">
                <h4>Virtuals</h4>
                ${m.virtuals.map((v) => `<span class="badge badge-TTL">${v}</span>`).join(' ')}
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
      ${models.length === 0 ? '<p class="empty-state">No Mongoose models registered. Run some chapter exercises first!</p>' : ''}`;

    res.send(req.app.locals.renderPage('Schemas', content, '/schemas'));
  } catch (err) {
    res.status(500).send(req.app.locals.renderPage('Error', `<pre class="error">${err.message}</pre>`));
  }
});

export default router;
