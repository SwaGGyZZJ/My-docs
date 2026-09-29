import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const here = path.dirname(fileURLToPath(import.meta.url));
const sourceDir = process.env.OPENWIKI_RETEST_SOURCE_DIR || path.join(here, 'shared-retest-source-2026-09-29');
const operators = ['gf_vect_mul', 'crc32_ieee', 'dftbench_double', 'libm_sin_cos_dp', 'tlfloat_quad_arithmetic'];
const arms = ['A', 'B', 'C', 'D'];
const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
const median = xs => { const s = [...xs].sort((a, b) => a - b); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
const variance = xs => xs.length < 2 ? null : xs.reduce((s, x) => s + (x - mean(xs)) ** 2, 0) / (xs.length - 1);
const pct = (a, b) => 100 * (a / b - 1);
const tsv = rows => rows.map(r => r.map(x => x == null ? 'NA' : String(x).replaceAll('\t', ' ').replaceAll('\n', ' ')).join('\t')).join('\n') + '\n';

const originalLines = (await fs.readFile(path.join(here, 'session-results-2026-09-28.tsv'), 'utf8')).trimEnd().split('\n');
const columns = originalLines.shift().split('\t');
const original = new Map();
for (const line of originalLines) {
  const row = Object.fromEntries(line.split('\t').map((v, i) => [columns[i], v]));
  if (row['阶段'] !== 'formal' || row['状态'] !== '正式有效') continue;
  original.set(`${row['算子']}/r${row['重复']}/${row['组别']}`, row);
}

const raw = new Map();
const roundRows = [];
const sevenRows = [];
await fs.mkdir(path.join(here, 'shared-retest-source-2026-09-29'), {recursive:true});
for (const op of operators) {
  const sourcePath = path.join(sourceDir, `${op}-results.json`);
  const report = JSON.parse(await fs.readFile(sourcePath, 'utf8'));
  if (report.operator !== op || report.rows.length !== (op === 'gf_vect_mul' ? 12 : 13)) throw new Error(`unexpected ${op} inventory`);
  const base = report.rows.find(r => r.key === report.baseline_key);
  if (!base || base.values.length !== 7 || !report.rows.every(r => r.values.length === 7) || !report.rows.filter(r => r.key !== report.baseline_key).every(r => r.treatment_gate_passed === true)) throw new Error(`incomplete seven samples or correctness gate: ${op}`);
  const retainedSource = path.join(here, 'shared-retest-source-2026-09-29', `${op}-results.json`);
  if (sourcePath !== retainedSource) await fs.copyFile(sourcePath, retainedSource);
  raw.set(op, report);
  for (let i = 0; i < 7; i++) sevenRows.push([op, '共同未优化基线', null, null, i + 1, report.metric_unit, base.values[i], null, null]);
  for (const row of report.rows.filter(r => r.key !== report.baseline_key)) {
    const m = row.key.match(/-r([123])-([a-d])$/);
    if (!m) throw new Error(`bad key ${row.key}`);
    const repeat = Number(m[1]), arm = m[2].toUpperCase();
    const old = original.get(`${op}/r${repeat}/${arm}`);
    if (!old || old['正确性'] !== 'pass') throw new Error(`missing old formal row ${row.key}`);
    const ratios = row.values.map((v, i) => 100 * v / base.values[i]);
    for (let i = 0; i < 7; i++) sevenRows.push([op, arm, repeat, row.key, i + 1, report.metric_unit, base.values[i], row.values[i], ratios[i] - 100]);
    const noncache = Number(old['非缓存Token']);
    const cache = Number(old['缓存读取Token']);
    roundRows.push({ op, repeat, arm, key: row.key, unit: report.metric_unit,
      baseMean: mean(base.values), patchMean: mean(row.values), ratioOfMeans: 100 * mean(row.values) / mean(base.values),
      pairedRatioMean: mean(ratios), pairedRatioMedian: median(ratios), pairedRatioVar: variance(ratios),
      oldGain: Number(old['性能提升(%)']), noncache, cache, total: noncache + cache,
      minutes: Number(old['耗时(分钟)']), iterations: Number(old['迭代轮数']),
      sourceGreps: Number(old['源码grep次数']), sourceGrepBytes: Number(old['源码grep输出(字节)']),
      wikiReads: Number(old['Wiki非空读取次数']), correctness: old['正确性'] });
  }
}
if (roundRows.length !== 59 || sevenRows.length !== 448) throw new Error('expected 59 formal patches and 448 seven-run source rows');

const groupRows = [];
for (const op of operators) {
  const validRepeats = op === 'gf_vect_mul' ? [1, 2] : [1, 2, 3];
  const members = arms.map(arm => {
    const rs = roundRows.filter(r => r.op === op && r.arm === arm && validRepeats.includes(r.repeat));
    if (rs.length !== validRepeats.length) throw new Error(`incomplete comparable rounds: ${op}/${arm}`);
    return { op, arm, n: rs.length, unit: rs[0].unit, perfMean: mean(rs.map(r => r.ratioOfMeans)),
      perfVariance: variance(rs.map(r => r.ratioOfMeans)), perfMedian: median(rs.map(r => r.ratioOfMeans)),
      totalMedian: median(rs.map(r => r.total)), noncacheMedian: median(rs.map(r => r.noncache)),
      cacheMedian: median(rs.map(r => r.cache)), timeMedian: median(rs.map(r => r.minutes)),
      iterationMean: mean(rs.map(r => r.iterations)), rows: rs };
  });
  const control = members[0];
  for (const g of members) {
    g.perfDiff = g.perfMean - control.perfMean;
    g.totalDiff = pct(g.totalMedian, control.totalMedian);
    g.noncacheDiff = pct(g.noncacheMedian, control.noncacheMedian);
    g.advantage = g.arm !== 'A' && (g.perfDiff > 0 || g.totalDiff < 0 || g.noncacheDiff < 0);
    g.reasons = [g.perfDiff > 0 && '性能', g.totalDiff < 0 && '总Token', g.noncacheDiff < 0 && '非缓存Token'].filter(Boolean).join('、') || '无';
    groupRows.push(g);
  }
}

const groupHeader = ['算子','组别','可比重复数','共同有效重复','复测单位','复测性能提升均值(%)','组间样本方差(pp²)','复测性能提升中位数(%)','均值较A diff(pp)','总Token中位数','总Token中位数较A(%)','非缓存Token中位数','非缓存Token中位数较A(%)','缓存读取Token中位数','原优化耗时中位数(分钟)','原优化迭代均值','优势组','优势依据'];
const groupMatrix = [groupHeader, ...groupRows.map(g => [g.op,g.arm,g.n,g.op === 'gf_vect_mul' ? 'r1,r2' : 'r1,r2,r3',g.unit,g.perfMean - 100,g.perfVariance,g.perfMedian - 100,g.perfDiff,g.totalMedian,g.totalDiff,g.noncacheMedian,g.noncacheDiff,g.cacheMedian,g.timeMedian,g.iterationMean,g.arm === 'A' ? '对照' : g.advantage ? '是' : '否',g.arm === 'A' ? '无' : g.reasons])];
const roundHeader = ['算子','重复','组别','正式patch键','单位','基线七次均值','patch七次均值','复测性能提升:均值之比(%)','配对七次性能提升均值(%)','配对七次性能提升中位数(%)','配对七次提升样本方差(pp²)','旧session性能提升(%)','非缓存Token','缓存读取Token','总Token','优化耗时(分钟)','优化迭代轮数','源码grep次数','源码grep输出字节','Wiki非空读取次数','正确性'];
const roundMatrix = [roundHeader, ...roundRows.map(r => [r.op,r.repeat,r.arm,r.key,r.unit,r.baseMean,r.patchMean,r.ratioOfMeans - 100,r.pairedRatioMean - 100,r.pairedRatioMedian - 100,r.pairedRatioVar,r.oldGain,r.noncache,r.cache,r.total,r.minutes,r.iterations,r.sourceGreps,r.sourceGrepBytes,r.wikiReads,r.correctness])];
const rawHeader = ['算子','组别','重复','正式patch键','测量序号','单位','共同基线原值','patch原值','同序号性能提升(%)'];
const rawMatrix = [rawHeader, ...sevenRows];
await fs.writeFile(path.join(here, 'shared-retest-group-2026-09-29.tsv'), tsv(groupMatrix));
await fs.writeFile(path.join(here, 'shared-retest-round-2026-09-29.tsv'), tsv(roundMatrix));
await fs.writeFile(path.join(here, 'shared-retest-seven-values-2026-09-29.tsv'), tsv(rawMatrix));

const input = await FileBlob.load(path.join(here, 'a-baseline-advantage-2026-09-28.xlsx'));
const wb = await SpreadsheetFile.importXlsx(input);
const summary = wb.worksheets.getItem('A组对照');
summary.getRange('A1:V23').clear({applyTo:'all'});
summary.getRange('A1:R21').values = groupMatrix;
summary.getRange('A1:R21').format.font = {name:'Arial',size:10};
summary.getRange('A1:R1').format.font = {name:'Arial',size:10,bold:true};
summary.getRange('A1:R1').format.rowHeight = 34;
summary.getRange('A1:R1').format.borders = {bottom:{style:'medium',color:'#333333'}};
summary.getRange('A:A').format.columnWidth = 27;
summary.getRange('B:C').format.columnWidth = 11;
summary.getRange('D:D').format.columnWidth = 17;
summary.getRange('D2:D21').format.horizontalAlignment = 'center';
summary.getRange('E:E').format.columnWidth = 13;
summary.getRange('F:I').format.columnWidth = 22;
summary.getRange('J:N').format.columnWidth = 23;
summary.getRange('O:P').format.columnWidth = 22;
summary.getRange('Q:R').format.columnWidth = 18;
summary.getRange('F2:I21').setNumberFormat('0.0000');
summary.getRange('J2:J21').setNumberFormat('#,##0.00');
summary.getRange('K2:K21').setNumberFormat('0.00');
summary.getRange('L2:L21').setNumberFormat('#,##0.00');
summary.getRange('M2:M21').setNumberFormat('0.00');
summary.getRange('N2:N21').setNumberFormat('#,##0.00');
summary.getRange('O2:P21').setNumberFormat('0.00');
for (let k = 0; k < operators.length; k++) {
  const first = 2 + k * 4, last = first + 3;
  summary.getRange(`A${first}:R${last}`).format.borders = {preset:'outside',style:'medium',color:'#333333'};
  for (let i = 1; i < 4; i++) {
    const g = groupRows[k*4+i];
    if (g.advantage) {
      summary.getRange(`B${first+i}`).format.font = {name:'Arial',size:10,bold:true};
      summary.getRange(`Q${first+i}:R${first+i}`).format.font = {name:'Arial',size:10,bold:true};
      if (g.perfDiff > 0) summary.getRange(`F${first+i}:I${first+i}`).format.font = {name:'Arial',size:10,bold:true};
      if (g.totalDiff < 0) summary.getRange(`J${first+i}:K${first+i}`).format.font = {name:'Arial',size:10,bold:true};
      if (g.noncacheDiff < 0) summary.getRange(`L${first+i}:M${first+i}`).format.font = {name:'Arial',size:10,bold:true};
    }
  }
}
summary.freezePanes.freezeRows(1);
summary.showGridLines = false;

const differences = wb.worksheets.getItem('组别区别');
differences.getRange('A1:E5').values = [
  ['组别','OpenWiki使用','搜索流程','处理约束','比较说明'],
  ['A','不读','原始源码搜索','原始 optimizer skill','每算子 A 为组间对照；未优化源码为性能基线'],
  ['B','搜索阶段读取','Wiki 参考 + 不限源码 grep','OpenWiki 读取门禁','比较性能与 Token 时只用同一算子的共同有效重复'],
  ['C','Wiki 导航','首轮限 5 文件/2 目录，未命中可扩展一次','定向搜索门禁','GF r3C 缺正式可重放 patch，不计入'],
  ['D','AGENTS.md 触发','改架构前 index；构建/测试前 quickstart','禁止无边界全仓搜索','不同组独立运行，不是同一 patch 的不同阶段']
];
differences.getRange('A1:E5').format.font = {name:'Arial',size:10};
differences.getRange('A1:E1').format.font = {name:'Arial',size:10,bold:true};
differences.getRange('A:A').format.columnWidth = 11;
differences.getRange('B:E').format.columnWidth = 40;
differences.showGridLines = false;

const notes = wb.worksheets.getItem('来源与限制');
notes.getRange('A1:B20').clear({applyTo:'all'});
const noteRows = [
  ['项目','说明'],
  ['复测时间','2026-09-29；五个算子分别完成正式统一低负载复测'],
  ['正式有效格','59/60；GF r3C 缺正式 patch，绝不以旧 invalid 代替'],
  ['性能分母','每算子同一次复测的共同未优化源码基线，七次交错测量'],
  ['逐轮性能提升','(patch 七次原值均值 / 共同基线七次原值均值 − 1) × 100'],
  ['组别性能均值','同组共同有效 r1-r2 或 r1-r3 的逐轮性能提升算术均值'],
  ['组间样本方差','逐轮性能提升的样本方差，分母 n−1，单位 pp²；GF n=2，其余 n=3'],
  ['逐轮配对方差','每个 patch 七个同序号 (patch/基线−1)×100 的样本方差，分母 6，单位 pp²'],
  ['Token中位数','先按每个优化 session 计数，再对共同有效重复取中位数；不是复测 benchmark 的 Token'],
  ['非缓存Token','input + output + reasoning + cache write；缓存读取另列，总Token=非缓存+缓存读取'],
  ['缓存读取','跨模型调用累加的缓存命中输入，不代表唯一文档大小或 Wiki 阅读次数'],
  ['A组对照','diff=本组复测性能提升均值−同算子 A 均值；Token 差=(本组中位数/A中位数−1)×100'],
  ['优势组','B/C/D 任一成立：性能提升均值比 A 高、总Token中位数低、非缓存Token中位数低；描述性标签'],
  ['正确性与环境','各 patch 复测正确性通过；性能阶段 CPU0/NUMA0 绑定，七轮轮换交错；详见正式报告'],
  ['统计限制','仅 2–3 次独立优化重复；方差描述波动，不证明显著性或 OpenWiki 因果效应'],
  ['GF正式报告','reports/formal-shared-retest-20260929T023553Z/gf_vect_mul-results.json'],
  ['CRC正式报告','reports/formal-shared-retest-20260929T024903Z/crc32_ieee-results.json'],
  ['DFT正式报告','reports/formal-shared-retest-20260929T030209Z/dftbench_double-results.json'],
  ['libm正式报告','reports/formal-shared-retest-20260929T033330Z/libm_sin_cos_dp-results.json'],
  ['TLFloat正式报告','reports/formal-shared-retest-20260929T035327Z/tlfloat_quad_arithmetic-results.json']
];
notes.getRange('A1:B20').values = noteRows;
notes.getRange('A1:B20').format.font = {name:'Arial',size:10};
notes.getRange('A1:B1').format.font = {name:'Arial',size:10,bold:true};
notes.getRange('A:A').format.columnWidth = 22;
notes.getRange('B:B').format.columnWidth = 120;
notes.showGridLines = false;

const detail = wb.worksheets.add('逐轮复测');
detail.getRange('A1:U60').values = roundMatrix;
detail.getRange('A1:U60').format.font = {name:'Arial',size:10};
detail.getRange('A1:U1').format.font = {name:'Arial',size:10,bold:true};
detail.getRange('A1:U1').format.borders = {bottom:{style:'medium',color:'#333333'}};
detail.getRange('A:A').format.columnWidth = 27;
detail.getRange('B:C').format.columnWidth = 9;
detail.getRange('D:D').format.columnWidth = 43;
detail.getRange('E:E').format.columnWidth = 13;
detail.getRange('F:L').format.columnWidth = 23;
detail.getRange('M:U').format.columnWidth = 19;
detail.getRange('F2:L60').setNumberFormat('0.0000');
detail.getRange('M2:O60').setNumberFormat('#,##0');
detail.freezePanes.freezeRows(1);
detail.showGridLines = false;

const samples = wb.worksheets.add('七次原始性能');
samples.getRange('A1:I449').values = rawMatrix;
samples.getRange('A1:I449').format.font = {name:'Arial',size:10};
samples.getRange('A1:I1').format.font = {name:'Arial',size:10,bold:true};
samples.getRange('A1:I1').format.borders = {bottom:{style:'medium',color:'#333333'}};
samples.getRange('A:A').format.columnWidth = 27;
samples.getRange('B:C').format.columnWidth = 9;
samples.getRange('D:D').format.columnWidth = 43;
samples.getRange('E:F').format.columnWidth = 15;
samples.getRange('G:I').format.columnWidth = 24;
samples.getRange('G2:I449').setNumberFormat('0.0000');
samples.freezePanes.freezeRows(1);
samples.showGridLines = false;

wb.recalculate();
const output = await SpreadsheetFile.exportXlsx(wb);
await output.save(path.join(here, 'a-baseline-shared-retest-2026-09-29.xlsx'));
console.log(JSON.stringify({formalPatches:roundRows.length,rawRecords:sevenRows.length,groups:groupRows.length,advantageGroups:groupRows.filter(g => g.advantage).length,
  libm:groupRows.filter(g => g.op==='libm_sin_cos_dp').map(({arm,perfMean,perfDiff,noncacheDiff,totalDiff,advantage})=>({arm,perfMean,perfDiff,noncacheDiff,totalDiff,advantage})),
  tlfloat:groupRows.filter(g => g.op==='tlfloat_quad_arithmetic').map(({arm,perfMean,perfDiff,noncacheDiff,totalDiff,advantage})=>({arm,perfMean,perfDiff,noncacheDiff,totalDiff,advantage}))},null,2));
