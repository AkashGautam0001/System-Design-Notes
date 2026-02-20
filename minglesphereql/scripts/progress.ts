#!/usr/bin/env tsx
import { execSync } from 'child_process';
import chalk from 'chalk';
import Table from 'cli-table3';
import boxen from 'boxen';

const CHAPTERS = [
  { num: 1, title: 'The Genesis of MingleSphereQL', part: 'I: Foundations' },
  { num: 2, title: 'The Schema Forge', part: 'I: Foundations' },
  { num: 3, title: 'Opening the Gates', part: 'I: Foundations' },
  { num: 4, title: 'Finding Your People', part: 'I: Foundations' },
  { num: 5, title: 'The Column Codex', part: 'I: Foundations' },
  { num: 6, title: 'The Gatekeepers', part: 'II: Data Integrity' },
  { num: 7, title: 'The Migration Trail', part: 'II: Data Integrity' },
  { num: 8, title: 'The Query Masters', part: 'II: Data Integrity' },
  { num: 9, title: 'Select, Sort, and Slice', part: 'II: Data Integrity' },
  { num: 10, title: 'The Great Edit', part: 'III: Data Manipulation' },
  { num: 11, title: 'The JSON Vault', part: 'III: Data Manipulation' },
  { num: 12, title: 'The Clean Sweep', part: 'III: Data Manipulation' },
  { num: 13, title: 'The Batch Express', part: 'III: Data Manipulation' },
  { num: 14, title: 'The Relational Web', part: 'IV: Relationships' },
  { num: 15, title: 'Many to Many', part: 'IV: Relationships' },
  { num: 16, title: 'Going Deeper', part: 'IV: Relationships' },
  { num: 17, title: 'The Computed Fields', part: 'IV: Relationships' },
  { num: 18, title: 'The Aggregation Engine', part: 'V: Advanced Queries' },
  { num: 19, title: 'Window into the Data', part: 'V: Advanced Queries' },
  { num: 20, title: 'The Common Path', part: 'V: Advanced Queries' },
  { num: 21, title: 'The View from Above', part: 'V: Advanced Queries' },
  { num: 22, title: 'The Trigger Mechanism', part: 'VI: Behavior & Structure' },
  { num: 23, title: 'The Vault', part: 'VI: Behavior & Structure' },
  { num: 24, title: 'The Watchtower', part: 'VI: Behavior & Structure' },
  { num: 25, title: 'The Pipeline', part: 'VI: Behavior & Structure' },
  { num: 26, title: 'The Invisible Walls', part: 'VII: Row-Level Security' },
  { num: 27, title: 'The Policy Workshop', part: 'VII: Row-Level Security' },
  { num: 28, title: 'The Fortress in Production', part: 'VII: Row-Level Security' },
  { num: 29, title: 'Speed Lanes', part: 'VIII: Indexing & Search' },
  { num: 30, title: 'The Search Engine', part: 'VIII: Indexing & Search' },
  { num: 31, title: 'The Similarity Engine', part: 'VIII: Indexing & Search' },
  { num: 32, title: 'The Map', part: 'IX: Advanced Features' },
  { num: 33, title: 'The Time Machine', part: 'IX: Advanced Features' },
  { num: 34, title: 'The Production Countdown', part: 'IX: Advanced Features' },
];

interface ChapterResult {
  num: number;
  title: string;
  part: string;
  passed: number;
  failed: number;
  total: number;
  status: 'pass' | 'fail' | 'untested';
}

async function main() {
  console.log(
    boxen(chalk.bold.cyan('MingleSphereQL Progress Tracker'), {
      padding: 1,
      margin: { top: 1, bottom: 1, left: 0, right: 0 },
      borderStyle: 'double',
      borderColor: 'cyan',
    })
  );

  const results: ChapterResult[] = [];

  for (const chapter of CHAPTERS) {
    const num = String(chapter.num).padStart(2, '0');
    try {
      const output = execSync(
        `npx vitest run chapters/${num} --reporter=json 2>/dev/null`,
        { encoding: 'utf-8', timeout: 60000 }
      );
      const json = JSON.parse(output);
      const testResults = json.testResults?.[0];
      const passed = testResults?.assertionResults?.filter((t: any) => t.status === 'passed').length || 0;
      const failed = testResults?.assertionResults?.filter((t: any) => t.status === 'failed').length || 0;
      const total = passed + failed;
      results.push({
        ...chapter,
        passed,
        failed,
        total,
        status: failed === 0 && passed > 0 ? 'pass' : 'fail',
      });
    } catch {
      results.push({
        ...chapter,
        passed: 0,
        failed: 0,
        total: 5,
        status: 'untested',
      });
    }
  }

  // Display results by part
  let currentPart = '';
  const table = new Table({
    head: ['#', 'Chapter', 'Status', 'Tests'].map(h => chalk.cyan.bold(h)),
    style: { head: [], border: ['gray'] },
    colWidths: [5, 40, 10, 12],
  });

  let totalPassed = 0;
  let totalTests = 0;
  let chaptersComplete = 0;

  for (const result of results) {
    if (result.part !== currentPart) {
      currentPart = result.part;
      table.push([{ colSpan: 4, content: chalk.bold.yellow(`\n  Part ${currentPart}`) }]);
    }

    const statusIcon = result.status === 'pass'
      ? chalk.green('PASS')
      : result.status === 'fail'
        ? chalk.red('FAIL')
        : chalk.gray('----');

    const testInfo = result.status === 'untested'
      ? chalk.gray('0/5')
      : result.status === 'pass'
        ? chalk.green(`${result.passed}/${result.total}`)
        : chalk.red(`${result.passed}/${result.total}`);

    table.push([
      chalk.white(String(result.num)),
      chalk.white(result.title),
      statusIcon,
      testInfo,
    ]);

    totalPassed += result.passed;
    totalTests += result.total || 5;
    if (result.status === 'pass') chaptersComplete++;
  }

  console.log(table.toString());

  // Summary
  const percentage = Math.round((chaptersComplete / CHAPTERS.length) * 100);
  const barLength = 30;
  const filled = Math.round((percentage / 100) * barLength);
  const bar = chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(barLength - filled));

  console.log(
    boxen(
      [
        `${chalk.bold('Progress:')} ${bar} ${chalk.bold(`${percentage}%`)}`,
        '',
        `${chalk.cyan('Chapters Complete:')} ${chalk.bold(`${chaptersComplete}/${CHAPTERS.length}`)}`,
        `${chalk.cyan('Tests Passing:')}     ${chalk.bold(`${totalPassed}/${totalTests}`)}`,
      ].join('\n'),
      {
        padding: 1,
        margin: { top: 1, bottom: 0, left: 0, right: 0 },
        borderStyle: 'round',
        borderColor: percentage === 100 ? 'green' : 'yellow',
      }
    )
  );
}

main().catch(console.error);
