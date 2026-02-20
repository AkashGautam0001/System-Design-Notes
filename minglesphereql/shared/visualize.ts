import chalk from 'chalk';
import Table from 'cli-table3';
import boxen from 'boxen';

/**
 * Display a single row with colorized JSON inside a boxen border.
 */
export function prettyRow(row: Record<string, any>, title?: string): string {
  const lines = Object.entries(row).map(([key, value]) => {
    const coloredKey = chalk.cyan.bold(key);
    const coloredValue = typeof value === 'object' && value !== null
      ? chalk.yellow(JSON.stringify(value, null, 2))
      : typeof value === 'number'
        ? chalk.green(String(value))
        : typeof value === 'boolean'
          ? chalk.magenta(String(value))
          : value === null
            ? chalk.gray('null')
            : chalk.white(String(value));
    return `  ${coloredKey}: ${coloredValue}`;
  });

  const content = lines.join('\n');

  return boxen(content, {
    title: title || 'Row',
    titleAlignment: 'center',
    padding: 1,
    margin: { top: 0, bottom: 0, left: 0, right: 0 },
    borderStyle: 'round',
    borderColor: 'cyan',
  });
}

/**
 * Display an ASCII tree diagram of a nested object.
 */
export function asciiTree(obj: any, prefix: string = '', isLast: boolean = true, isRoot: boolean = true): string {
  const lines: string[] = [];

  if (isRoot) {
    lines.push(chalk.bold.cyan('Root'));
  }

  if (typeof obj !== 'object' || obj === null) {
    return String(obj);
  }

  const entries = Array.isArray(obj)
    ? obj.map((v, i) => [String(i), v] as [string, any])
    : Object.entries(obj);

  entries.forEach(([key, value], index) => {
    const isLastEntry = index === entries.length - 1;
    const connector = isLastEntry ? '└── ' : '├── ';
    const extension = isLastEntry ? '    ' : '│   ';

    if (typeof value === 'object' && value !== null) {
      lines.push(`${prefix}${connector}${chalk.yellow(key)}`);
      const subtree = asciiTree(value, prefix + extension, isLastEntry, false);
      lines.push(subtree);
    } else {
      const displayValue = value === null
        ? chalk.gray('null')
        : chalk.green(String(value));
      lines.push(`${prefix}${connector}${chalk.yellow(key)}: ${displayValue}`);
    }
  });

  return lines.join('\n');
}

/**
 * Display rows in a formatted table using cli-table3.
 */
export function tableView(rows: Record<string, any>[], columns?: string[]): string {
  if (rows.length === 0) {
    return chalk.gray('(no rows)');
  }

  const cols = columns || Object.keys(rows[0]);

  const table = new Table({
    head: cols.map(c => chalk.cyan.bold(c)),
    style: {
      head: [],
      border: ['gray'],
    },
  });

  for (const row of rows) {
    table.push(cols.map(c => {
      const val = row[c];
      if (val === null || val === undefined) return chalk.gray('null');
      if (typeof val === 'object') return chalk.yellow(JSON.stringify(val));
      if (typeof val === 'number') return chalk.green(String(val));
      if (typeof val === 'boolean') return chalk.magenta(String(val));
      return String(val);
    }));
  }

  return table.toString();
}

/**
 * Format EXPLAIN ANALYZE output for display.
 */
export function queryPlanViz(explainResult: any[]): string {
  const lines: string[] = [
    boxen(chalk.bold.white('Query Execution Plan'), {
      padding: { top: 0, bottom: 0, left: 1, right: 1 },
      borderStyle: 'double',
      borderColor: 'yellow',
    }),
    '',
  ];

  if (Array.isArray(explainResult) && explainResult.length > 0) {
    const plan = explainResult[0];

    if (plan['QUERY PLAN']) {
      // JSON format from EXPLAIN (FORMAT JSON)
      const jsonPlan = Array.isArray(plan['QUERY PLAN']) ? plan['QUERY PLAN'][0] : plan['QUERY PLAN'];
      lines.push(formatPlanNode(jsonPlan.Plan || jsonPlan, 0));

      if (jsonPlan['Planning Time'] !== undefined) {
        lines.push('');
        lines.push(chalk.gray(`Planning Time: ${chalk.yellow(jsonPlan['Planning Time'] + ' ms')}`));
      }
      if (jsonPlan['Execution Time'] !== undefined) {
        lines.push(chalk.gray(`Execution Time: ${chalk.yellow(jsonPlan['Execution Time'] + ' ms')}`));
      }
    } else {
      // Text format
      for (const row of explainResult) {
        const text = row['QUERY PLAN'] || Object.values(row)[0] || '';
        lines.push(formatPlanLine(String(text)));
      }
    }
  }

  return lines.join('\n');
}

function formatPlanNode(node: any, depth: number): string {
  const indent = '  '.repeat(depth);
  const lines: string[] = [];

  const nodeType = chalk.bold.white(node['Node Type'] || 'Unknown');
  const cost = node['Total Cost'] ? chalk.gray(`cost=${node['Startup Cost']}..${node['Total Cost']}`) : '';
  const rows = node['Plan Rows'] ? chalk.green(`rows=${node['Plan Rows']}`) : '';
  const width = node['Plan Width'] ? chalk.blue(`width=${node['Plan Width']}`) : '';

  lines.push(`${indent}→ ${nodeType} ${cost} ${rows} ${width}`);

  if (node['Relation Name']) {
    lines.push(`${indent}  on ${chalk.cyan(node['Relation Name'])}`);
  }
  if (node['Filter']) {
    lines.push(`${indent}  ${chalk.yellow('Filter:')} ${node['Filter']}`);
  }
  if (node['Index Cond']) {
    lines.push(`${indent}  ${chalk.yellow('Index Cond:')} ${node['Index Cond']}`);
  }
  if (node['Actual Total Time'] !== undefined) {
    lines.push(`${indent}  ${chalk.gray(`actual time=${node['Actual Startup Time']}..${node['Actual Total Time']}`)} ${chalk.green(`rows=${node['Actual Rows']}`)}`);
  }

  if (node.Plans) {
    for (const child of node.Plans) {
      lines.push(formatPlanNode(child, depth + 1));
    }
  }

  return lines.join('\n');
}

function formatPlanLine(line: string): string {
  if (line.includes('Seq Scan') || line.includes('Index Scan') || line.includes('Bitmap')) {
    return chalk.bold.white(line);
  }
  if (line.includes('cost=')) {
    return line.replace(/(cost=[\d.]+\.\.[\d.]+)/, chalk.gray('$1'));
  }
  if (line.includes('Planning') || line.includes('Execution')) {
    return chalk.yellow(line);
  }
  return chalk.gray(line);
}
