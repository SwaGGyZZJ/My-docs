import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const directory = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = path.join(directory, 'session-results-2026-09-28.tsv');
const summaryPath = path.join(directory, 'a-baseline-advantage-2026-09-28.tsv');
const workbookPath = path.join(directory, 'a-baseline-advantage-2026-09-28.xlsx');

function parseTsv(contents) {
  const [header, ...lines] = contents.trimEnd().split('\n').map(line => line.split('\t'));
  return lines.map(fields => Object.fromEntries(header.map((name, index) => [name, fields[index] ?? ''])));
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sampleVariance(values) {
  if (values.length < 2) return null;
  const average = mean(values);
  return values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1);
}

const source = parseTsv(await fs.readFile(sourcePath, 'utf8'));
const previous = parseTsv(await fs.readFile(summaryPath, 'utf8'));
const operators = [...new Set(previous.map(row => row['算子']))];
const arms = ['A', 'B', 'C', 'D'];
if (operators.length !== 5 || previous.length !== 20) throw new Error('Unexpected summary coverage');

const metrics = new Map();
for (const operator of operators) {
  const perArm = new Map();
  const commonRounds = operator === 'gf_vect_mul' ? [1, 2] : [1, 2, 3];
  for (const arm of arms) {
    const records = commonRounds.map(round => source.find(row => row['阶段'] === 'formal'
      && row['算子'] === operator && row['组别'] === arm && Number(row['重复']) === round));
    if (records.some(row => !row || row['状态'] !== '正式有效' || row['正确性'] !== 'pass'
      || Number(row['性能样本数']) !== 7)) {
      throw new Error(`Incomplete formal evidence: ${operator}/${arm}`);
    }
    perArm.set(arm, {
      performance: records.map(row => Number(row['性能提升(%)'])),
      totalTokens: records.map(row => Number(row['非缓存Token']) + Number(row['缓存读取Token'])),
      noncachedTokens: records.map(row => Number(row['非缓存Token'])),
    });
  }
  const control = perArm.get('A');
  for (const arm of arms) {
    const current = perArm.get(arm);
    const values = [
      mean(current.performance),
      sampleVariance(current.performance),
      mean(current.performance) - mean(control.performance),
      mean(current.totalTokens),
      sampleVariance(current.totalTokens),
      (mean(current.totalTokens) / mean(control.totalTokens) - 1) * 100,
      mean(current.noncachedTokens),
      sampleVariance(current.noncachedTokens),
      (mean(current.noncachedTokens) / mean(control.noncachedTokens) - 1) * 100,
    ];
    metrics.set(`${operator}\t${arm}`, values);
  }
}

const newHeaders = [
  '性能均值(%)', '性能样本方差(pp²)', '性能均值diff(pp)',
  '总Token均值', '总Token样本方差(Token²)', '总Token均值较A(%)',
  '非缓存Token均值', '非缓存Token样本方差(Token²)', '非缓存Token均值较A(%)',
];
const previousHeaders = (await fs.readFile(summaryPath, 'utf8')).split('\n', 1)[0].split('\t').slice(0, 13);
const summaryRows = previous.map(row => {
  const values = metrics.get(`${row['算子']}\t${row['组别']}`);
  if (!values || Number(row['可比轮次']) !== (row['算子'] === 'gf_vect_mul' ? 2 : 3)) {
    throw new Error(`Summary mismatch: ${row['算子']}/${row['组别']}`);
  }
  return [...previousHeaders.map(header => row[header]), ...values.map((value, index) => {
    if (index === 3 || index === 6) return value.toFixed(2);
    if (index === 4 || index === 7) return value.toExponential(8);
    return value.toFixed(4);
  })];
});

const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(workbookPath));
const sheet = workbook.worksheets.getItem('A组对照');
if (sheet.getRange('A1:M1').values[0].join('\t') !== previousHeaders.join('\t')) {
  throw new Error('Workbook header does not match TSV');
}
for (let row = 0; row < previous.length; row += 1) {
  const actual = sheet.getRange(`A${row + 2}:B${row + 2}`).values[0];
  if (actual[0] !== previous[row]['算子'] || actual[1] !== previous[row]['组别']) {
    throw new Error(`Workbook row mismatch at ${row + 2}`);
  }
}

const styleSources = ['D', 'D', 'E', 'F', 'F', 'G', 'H', 'H', 'I'];
const styleTargets = ['N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V'];
for (let index = 0; index < styleTargets.length; index += 1) {
  sheet.getRange(`${styleTargets[index]}1:${styleTargets[index]}23`)
    .copyFrom(sheet.getRange(`${styleSources[index]}1:${styleSources[index]}23`), 'all');
}
sheet.getRange('N1:V1').values = [newHeaders];
sheet.getRange('N2:V21').values = previous.map(row => metrics.get(`${row['算子']}\t${row['组别']}`));
sheet.getRange('N23:V23').values = [[null, null, null, null, null, null, null, null, null]];
sheet.getRange('N1:V1').format.wrapText = true;
sheet.getRange('N1:V1').format.rowHeight = 36;
sheet.getRange('N1:V1').format.font = { bold: true, color: '#222222' };
sheet.getRange('N1:V21').format.verticalAlignment = 'center';
for (const column of ['N', 'O', 'P', 'S', 'V']) {
  sheet.getRange(`${column}2:${column}21`).setNumberFormat('0.0000');
}
for (const column of ['Q', 'T']) {
  sheet.getRange(`${column}2:${column}21`).setNumberFormat('#,##0.00');
}
for (const column of ['R', 'U']) {
  sheet.getRange(`${column}2:${column}21`).setNumberFormat('0.000E+00');
}
for (const column of styleTargets) {
  sheet.getRange(`${column}1:${column}23`).format.columnWidth = 18;
}
sheet.getRange('O1:O23').format.columnWidth = 21;
sheet.getRange('R1:R23').format.columnWidth = 24;
sheet.getRange('U1:U23').format.columnWidth = 25;
sheet.getRange('V1:V23').format.columnWidth = 23;
for (const firstRow of [2, 6, 10, 14, 18]) {
  sheet.getRange(`N${firstRow}:V${firstRow + 3}`).format.borders = {
    top: { style: 'medium', color: '#333333' },
    bottom: { style: 'medium', color: '#333333' },
    right: { style: 'medium', color: '#333333' },
  };
}
for (let index = 0; index < previous.length; index += 1) {
  if (previous[index]['优势组'] === '是') {
    sheet.getRange(`N${index + 2}:V${index + 2}`).format.font = {
      bold: true, color: '#274C72',
    };
  }
}

const notes = workbook.worksheets.getItem('来源与限制');
notes.getRange('A9:B12').copyFrom(notes.getRange('A5:B8'), 'all');
notes.getRange('A9:B12').values = [
  ['统计样本', '新增均值和方差仅用各算子四组共有的正式有效重复：GF为r1–r2，其他算子为r1–r3；GF其他组r3仍保留在逐次明细中。'],
  ['方差口径', '性能提升、总Token、非缓存Token均使用样本方差（n−1）；性能方差单位为百分点平方，Token方差单位为Token平方。n仅2或3，方差描述波动，不构成显著性结论。'],
  ['均值与A比较', '性能均值diff为本组均值减A组均值（百分点）；Token均值较A为本组均值/A组均值−1（百分比），负值表示节省。'],
  ['优势组标签', '沿用原中位数规则，新增均值和方差不改变优势组判定。原实验性能未完成全算子统一低负载复测；不要将原session结果当作统一环境结论。'],
];

workbook.recalculate();
const check = await workbook.inspect({kind: 'table', sheetId: 'A组对照', range: 'N1:V5', include: 'values,formulas', tableMaxRows: 5, tableMaxCols: 9, maxChars: 3200});
console.log(check.ndjson);
const errors = await workbook.inspect({kind: 'match', searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!', options: {useRegex: true, maxResults: 100}, summary: 'final formula error scan'});
console.log(errors.ndjson);

await fs.writeFile(summaryPath, [previousHeaders.concat(newHeaders).join('\t'), ...summaryRows.map(row => row.join('\t'))].join('\n') + '\n');
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(workbookPath);
console.log(`Updated ${summaryRows.length} groups`);
