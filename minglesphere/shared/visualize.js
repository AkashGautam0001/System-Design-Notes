import chalk from 'chalk';
import boxen from 'boxen';
import Table from 'cli-table3';

/**
 * Pretty-print a Mongoose document or plain object with colors and a border.
 * @param {Object} doc - Document to display
 * @param {string} [title] - Optional title for the box
 */
export function prettyDoc(doc, title) {
  const obj = doc && typeof doc.toObject === 'function' ? doc.toObject() : doc;
  const json = JSON.stringify(obj, null, 2);

  // Colorize keys and values
  const colored = json
    .replace(/"([^"]+)":/g, (_, key) => `${chalk.cyan(`"${key}"`)}:`)
    .replace(/: "([^"]+)"/g, (_, val) => `: ${chalk.green(`"${val}"`)}`)
    .replace(/: (\d+)/g, (_, val) => `: ${chalk.yellow(val)}`)
    .replace(/: (true|false)/g, (_, val) => `: ${chalk.magenta(val)}`)
    .replace(/: (null)/g, (_, val) => `: ${chalk.gray(val)}`);

  const options = {
    padding: 1,
    borderStyle: 'round',
    borderColor: 'blue',
  };

  if (title) {
    options.title = chalk.bold.white(title);
    options.titleAlignment = 'center';
  }

  console.log(boxen(colored, options));
}

/**
 * Display a tree diagram for a nested object.
 * @param {Object} obj - Object to visualize
 * @param {string} [prefix] - Line prefix for recursion
 * @param {boolean} [isLast] - Whether this is the last sibling
 */
export function asciiTree(obj, prefix = '', isLast = true) {
  const entries = Object.entries(obj || {});
  const lines = [];

  lines.push(chalk.bold.blue('Document Structure'));
  lines.push(chalk.gray('─'.repeat(40)));

  function walk(entries, prefix, isRoot) {
    entries.forEach(([key, value], idx) => {
      const last = idx === entries.length - 1;
      const connector = isRoot ? '' : last ? '└── ' : '├── ';
      const childPrefix = isRoot ? '' : last ? '    ' : '│   ';

      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        lines.push(`${prefix}${connector}${chalk.cyan(key)}`);
        walk(Object.entries(value), prefix + childPrefix, false);
      } else if (Array.isArray(value)) {
        lines.push(`${prefix}${connector}${chalk.cyan(key)} ${chalk.gray(`[${value.length} items]`)}`);
      } else {
        const display = value instanceof Date ? value.toISOString() : String(value);
        lines.push(`${prefix}${connector}${chalk.cyan(key)}: ${chalk.green(display)}`);
      }
    });
  }

  walk(entries, '', true);
  console.log(lines.join('\n'));
}

/**
 * Display documents in a table format.
 * @param {Array} docs - Array of documents
 * @param {Array<string>} fields - Field names to display as columns
 */
export function tableView(docs, fields) {
  const table = new Table({
    head: fields.map((f) => chalk.cyan.bold(f)),
    style: { head: [], border: ['gray'] },
  });

  for (const doc of docs) {
    const obj = doc && typeof doc.toObject === 'function' ? doc.toObject() : doc;
    const row = fields.map((field) => {
      const val = field.split('.').reduce((o, k) => (o ? o[k] : undefined), obj);
      if (val === undefined || val === null) return chalk.gray('null');
      if (val instanceof Date) return chalk.yellow(val.toISOString().split('T')[0]);
      if (typeof val === 'object') return chalk.gray(JSON.stringify(val).slice(0, 40));
      return String(val);
    });
    table.push(row);
  }

  console.log(table.toString());
}

/**
 * Visualize an aggregation pipeline as a flow diagram.
 * @param {Array} stages - Array of pipeline stage objects
 */
export function pipelineViz(stages) {
  const lines = [];
  lines.push(chalk.bold.blue('Aggregation Pipeline'));
  lines.push('');

  stages.forEach((stage, idx) => {
    const stageKey = Object.keys(stage)[0];
    const stageValue = stage[stageKey];
    const stageStr = JSON.stringify(stageValue, null, 2)
      .split('\n')
      .map((l, i) => (i === 0 ? l : `       ${l}`))
      .join('\n');

    const emoji = {
      $match: '?',
      $group: 'G',
      $sort: 'S',
      $project: 'P',
      $limit: 'L',
      $skip: 'K',
      $unwind: 'U',
      $lookup: 'J',
      $addFields: '+',
      $count: '#',
      $bucket: 'B',
      $facet: 'F',
      $replaceRoot: 'R',
      $geoNear: 'N',
    }[stageKey] || '*';

    lines.push(`  ${chalk.white.bgBlue(` ${emoji} `)} ${chalk.bold.yellow(stageKey)}`);
    lines.push(chalk.gray(`       ${stageStr}`));

    if (idx < stages.length - 1) {
      lines.push(chalk.gray('       │'));
      lines.push(chalk.gray('       ▼'));
    }
  });

  lines.push('');
  lines.push(chalk.green(`  ✓ ${stages.length} stage(s) in pipeline`));
  console.log(lines.join('\n'));
}
