import { Router } from 'express';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..');

const chapters = [
  { num: '01', title: 'The Birth of MingleSphere', part: 'I: FOUNDATIONS' },
  { num: '02', title: 'The First Blueprint', part: 'I: FOUNDATIONS' },
  { num: '03', title: 'Opening the Doors', part: 'I: FOUNDATIONS' },
  { num: '04', title: 'Finding Your People', part: 'I: FOUNDATIONS' },
  { num: '05', title: 'The Type Vault', part: 'I: FOUNDATIONS' },
  { num: '06', title: 'The Gatekeepers', part: 'II: DATA INTEGRITY' },
  { num: '07', title: 'Schema Superpowers', part: 'II: DATA INTEGRITY' },
  { num: '08', title: 'The Query Masters', part: 'II: DATA INTEGRITY' },
  { num: '09', title: 'Select, Sort, and Slice', part: 'II: DATA INTEGRITY' },
  { num: '10', title: 'The Great Edit', part: 'III: DATA MANIPULATION' },
  { num: '11', title: 'Array Alchemy', part: 'III: DATA MANIPULATION' },
  { num: '12', title: 'The Clean Sweep', part: 'III: DATA MANIPULATION' },
  { num: '13', title: 'The Bulk Express', part: 'III: DATA MANIPULATION' },
  { num: '14', title: 'A Deeper Layer', part: 'IV: RELATIONSHIPS' },
  { num: '15', title: 'The Social Web', part: 'IV: RELATIONSHIPS' },
  { num: '16', title: 'Going Deeper', part: 'IV: RELATIONSHIPS' },
  { num: '17', title: 'The Phantom Fields', part: 'IV: RELATIONSHIPS' },
  { num: '18', title: 'Document Intelligence', part: 'V: BEHAVIOR' },
  { num: '19', title: 'The Watchers', part: 'V: BEHAVIOR' },
  { num: '20', title: 'Family Ties', part: 'V: BEHAVIOR' },
  { num: '21', title: 'Speed Lanes', part: 'VI: INDEXING & SEARCH' },
  { num: '22', title: 'The Search Engine', part: 'VI: INDEXING & SEARCH' },
  { num: '23', title: 'The Data Refinery', part: 'VII: AGGREGATION' },
  { num: '24', title: 'The Data Architect', part: 'VII: AGGREGATION' },
  { num: '25', title: 'The Vault', part: 'VIII: ADVANCED' },
  { num: '26', title: 'The Watchtower', part: 'VIII: ADVANCED' },
  { num: '27', title: 'The Map', part: 'VIII: ADVANCED' },
  { num: '28', title: 'The Production Countdown', part: 'VIII: ADVANCED' },
];

function getChapterResult(chapterNum) {
  try {
    const result = execSync(
      `NODE_OPTIONS='--experimental-vm-modules' npx jest --maxWorkers=1 --json chapters/${chapterNum} 2>/dev/null`,
      { cwd: projectRoot, timeout: 60000 }
    );
    const json = JSON.parse(result.toString());
    const suite = json.testResults?.[0];
    if (!suite) return { passed: 0, total: 0, status: 'error' };
    const passed = suite.assertionResults.filter((t) => t.status === 'passed').length;
    const total = suite.assertionResults.length;
    return { passed, total, status: passed === total ? 'pass' : 'partial' };
  } catch (err) {
    try {
      const json = JSON.parse(err.stdout?.toString() || '{}');
      const suite = json.testResults?.[0];
      if (suite) {
        const passed = suite.assertionResults.filter((t) => t.status === 'passed').length;
        const total = suite.assertionResults.length;
        return { passed, total, status: passed === total ? 'pass' : passed > 0 ? 'partial' : 'fail' };
      }
    } catch {
      // ignore
    }
    return { passed: 0, total: 5, status: 'fail' };
  }
}

router.get('/', async (req, res) => {
  const results = chapters.map((ch) => {
    const result = getChapterResult(ch.num);
    return { ...ch, ...result };
  });

  const totalPassed = results.reduce((s, r) => s + r.passed, 0);
  const totalTests = results.reduce((s, r) => s + r.total, 0);
  const chaptersComplete = results.filter((r) => r.status === 'pass').length;
  const pct = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;

  const content = `
    <div class="progress-overview">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${chaptersComplete}/${chapters.length}</div>
          <div class="stat-label">Chapters Complete</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${totalPassed}/${totalTests}</div>
          <div class="stat-label">Tests Passing</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${pct}%</div>
          <div class="stat-label">Overall Progress</div>
        </div>
      </div>
      <div class="progress-bar-container">
        <div class="progress-bar" style="width: ${pct}%"></div>
      </div>
    </div>
    <table class="data-table">
      <thead>
        <tr><th>#</th><th>Chapter</th><th>Part</th><th>Tests</th><th>Status</th></tr>
      </thead>
      <tbody>
        ${results.map((r) => `
          <tr class="status-${r.status}">
            <td>${r.num}</td>
            <td>${r.title}</td>
            <td>${r.part}</td>
            <td>${r.passed}/${r.total}</td>
            <td><span class="badge badge-${r.status === 'pass' ? 'unique' : r.status === 'partial' ? 'TTL' : 'single'}">${r.status.toUpperCase()}</span></td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;

  res.send(req.app.locals.renderPage('Progress', content, '/progress'));
});

export default router;
