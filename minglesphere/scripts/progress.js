#!/usr/bin/env node

import { execSync } from 'child_process';
import chalk from 'chalk';
import Table from 'cli-table3';
import boxen from 'boxen';

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

function runChapterTests(chapterNum) {
  try {
    const result = execSync(
      `NODE_OPTIONS='--experimental-vm-modules' npx jest --maxWorkers=1 --json chapters/${chapterNum} 2>/dev/null`,
      { cwd: new URL('..', import.meta.url).pathname, timeout: 60000 }
    );
    const json = JSON.parse(result.toString());
    const suite = json.testResults[0];
    if (!suite) return { passed: 0, total: 0, status: 'error' };
    const passed = suite.assertionResults.filter((t) => t.status === 'passed').length;
    const total = suite.assertionResults.length;
    return { passed, total, status: passed === total ? 'complete' : 'partial' };
  } catch (err) {
    try {
      const json = JSON.parse(err.stdout?.toString() || '{}');
      const suite = json.testResults?.[0];
      if (suite) {
        const passed = suite.assertionResults.filter((t) => t.status === 'passed').length;
        const total = suite.assertionResults.length;
        return { passed, total, status: passed === total ? 'complete' : passed > 0 ? 'partial' : 'failing' };
      }
    } catch {
      // ignore parse errors
    }
    return { passed: 0, total: 5, status: 'failing' };
  }
}

async function main() {
  console.log(
    boxen(chalk.bold.cyan('MingleSphere Progress Tracker'), {
      padding: 1,
      borderStyle: 'round',
      borderColor: 'cyan',
    })
  );
  console.log();
  console.log(chalk.gray('Running tests for each chapter... this may take a moment.\n'));

  const table = new Table({
    head: [
      chalk.cyan('#'),
      chalk.cyan('Chapter'),
      chalk.cyan('Part'),
      chalk.cyan('Tests'),
      chalk.cyan('Status'),
    ],
    style: { head: [], border: ['gray'] },
    colWidths: [6, 35, 25, 12, 12],
  });

  let totalPassed = 0;
  let totalTests = 0;
  let chaptersComplete = 0;

  for (const chapter of chapters) {
    const result = runChapterTests(chapter.num);
    totalPassed += result.passed;
    totalTests += result.total;

    let statusIcon;
    if (result.status === 'complete') {
      statusIcon = chalk.green('PASS');
      chaptersComplete++;
    } else if (result.status === 'partial') {
      statusIcon = chalk.yellow('PARTIAL');
    } else if (result.status === 'error') {
      statusIcon = chalk.red('ERROR');
    } else {
      statusIcon = chalk.red('FAIL');
    }

    const testDisplay =
      result.status === 'complete'
        ? chalk.green(`${result.passed}/${result.total}`)
        : result.passed > 0
          ? chalk.yellow(`${result.passed}/${result.total}`)
          : chalk.red(`${result.passed}/${result.total}`);

    table.push([chalk.white(chapter.num), chapter.title, chalk.gray(chapter.part), testDisplay, statusIcon]);
  }

  console.log(table.toString());
  console.log();

  const pct = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;
  const bar = generateProgressBar(pct, 40);

  console.log(
    boxen(
      [
        chalk.bold('Overall Progress'),
        '',
        bar,
        '',
        `${chalk.green(chaptersComplete)}/${chalk.white(chapters.length)} chapters complete`,
        `${chalk.green(totalPassed)}/${chalk.white(totalTests)} tests passing`,
        `${chalk.cyan(pct + '%')} complete`,
      ].join('\n'),
      { padding: 1, borderStyle: 'round', borderColor: pct === 100 ? 'green' : 'yellow' }
    )
  );

  if (pct === 100) {
    console.log(chalk.bold.green('\nCongratulations! You have completed MingleSphere!\n'));
  }
}

function generateProgressBar(percent, width) {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  const filledBar = chalk.green('█'.repeat(filled));
  const emptyBar = chalk.gray('░'.repeat(empty));
  return `${filledBar}${emptyBar} ${percent}%`;
}

main().catch(console.error);
