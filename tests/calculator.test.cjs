/* Node >= 18; independent source cases and invalid/edge inputs, no dependencies. */
'use strict';
const assert = require('node:assert/strict');
const M = require('../js/calculator-math.js');
let assertions = 0;
const check = (condition, message) => { assertions++; assert.ok(condition, message); };
const equal = (actual, expected, message) => { assertions++; assert.deepEqual(actual, expected, message); };
const near = (actual, expected, message) => check(Number.isFinite(actual) && Math.abs(actual - expected) <= 1e-9 * Math.max(1, Math.abs(expected)), message || `${actual} != ${expected}`);
const clone = value => JSON.parse(JSON.stringify(value));
const d = M.demo();
const result = (changes = {}, limits = d.limits, alternatives = d.alternatives) => M.compare(alternatives, limits, { ...d.decision, ...changes });
const info = (p = 0.4, changes = {}, limits = d.limits, alternatives = d.alternatives) => M.information(alternatives, limits, p, { ...d.diagnostic, ...changes });

// Empty, malformed and non-finite entries must never become zero.
for (const value of ['', ' ', null, undefined, true, [], {}, '1+2', '1/0', '1e999', Infinity, NaN]) check(Number.isNaN(M.number(value)), String(value));
near(M.number('1 250,75'), 1250.75);
near(M.number('−0,25'), -0.25);
near(M.number('1/3'), 1 / 3);
near(M.number('0'), 0);

// Exact table 3.18 and formulas (3.14)–(3.16), not the older repository example.
equal(result().admittedIds, ['C', 'E']);
equal(result().bestIds, ['C']);
near(result().bestValue, 134);
equal(result().rows.map(row => row.costs), [[140, 190], [90, 115], [120, 155], [145, 190], [110, 175]]);
near(result().rows.find(row => row.id === 'E').expected, 136);
equal(result({ p: '1/3' }).bestIds, ['C', 'E']);
equal(result({ p: 0 }).bestIds, ['E']);
equal(result({ p: 1 }).bestIds, ['C']);
equal(result({ criterion: 'worst', p: '', pLow: '', pHigh: '' }).bestIds, ['C']);
near(result({ criterion: 'worst' }).bestValue, 155);
equal(result({ criterion: 'regret', pLow: 0.2, pHigh: 0.5 }).bestIds, ['C']);
near(result({ criterion: 'regret', pLow: 0.2, pHigh: 0.5 }).bestValue, 4);
equal(result({ criterion: 'regret', pLow: 0.1, pHigh: 0.4 }).bestIds, ['E']);
near(result({ criterion: 'regret', pLow: 0.1, pHigh: 0.4 }).bestValue, 2);
equal(result({ criterion: 'regret', pLow: 0.2, pHigh: 7 / 15 }).bestIds, ['C', 'E']);
equal(result({ criterion: 'regret', pLow: 0, pHigh: 0.1 }).bestIds, ['E']);
equal(result({ criterion: 'regret', pLow: 0.8, pHigh: 1 }).bestIds, ['C']);
check(!result({ criterion: 'regret', pLow: 0.8, pHigh: 0.2 }).ok);
check(!result({ p: '' }).ok);
check(!result({ p: 1.01 }).ok);
check(!result({ criterion: 'unknown' }).ok);
check(!result({}, { ...d.limits, cash: '' }).ok);
check(result({}, { ...d.limits, cash: '' }).rows.every(row => !row.ok));
check(!M.compare([], d.limits, d.decision).ok);
check(!M.compare([d.alternatives[2], d.alternatives[2]], d.limits, d.decision).ok);

// No exact duration or repeated-work probability may be fabricated from a pass.
check(d.alternatives.every(alt => alt.hoursMax === '' && alt.repeatMax === ''));
check(result().rows.every(row => row.hoursMax === null && row.repeatMax === null));
check(result().rows.find(row => row.id === 'C').evidence.length === 2);
check(!result({}, { ...d.limits, hours: 47 }).ok);
check(!result({}, { ...d.limits, repeat: 0.09 }).ok);
equal(result({}, { ...d.limits, hours: 49 }).admittedIds, ['C', 'E']);
const clearedEvidence = clone(d.alternatives);
clearedEvidence.forEach(alt => { alt.sourceRef = ''; });
check(!result({}, d.limits, clearedEvidence).ok);

// Real cases separate cash, non-cash resource valuation and residual user loss.
const own = {
  ...M.blankAlternative('OWN'), name: 'Реальный ввод',
  normalCash: 10, normalImputed: 30, normalLoss: 100,
  stressCash: 12, stressImputed: 70, stressLoss: 120,
  laborMax: 10, hoursMax: 12, repeatMax: 0.02,
  acceptance: 'yes', safety: 'yes', accessibility: 'yes', critical: 'yes', readiness: 'yes'
};
let real = M.compare([own], { cash: 12, labor: 10, hours: 12, repeat: 0.02 }, d.decision);
check(real.ok);
equal(real.rows[0].costs, [140, 202]);
near(real.rows[0].cashMax, 12);
near(real.bestValue, 164.8);
const insufficientCash = M.compare([own], { cash: 11, labor: 10, hours: 12, repeat: 0.02 }, d.decision);
check(!insufficientCash.ok && insufficientCash.rows[0].status === 'rejected');
for (const field of ['normalCash', 'normalImputed', 'normalLoss', 'stressCash', 'stressImputed', 'stressLoss', 'hoursMax', 'laborMax', 'repeatMax']) {
  const invalid = { ...own, [field]: '' };
  check(!M.compare([invalid], d.limits, d.decision).ok, field + ' missing');
  check(!M.compare([{ ...own, [field]: -1 }], d.limits, d.decision).ok, field + ' negative');
}
for (const field of ['acceptance', 'safety', 'accessibility', 'critical', 'readiness']) {
  const failed = M.compare([{ ...own, [field]: 'no' }], d.limits, d.decision);
  check(!failed.ok && failed.rows[0].status === 'rejected', field + ' failed');
  const missing = M.compare([{ ...own, [field]: 'unknown' }], d.limits, d.decision);
  check(!missing.ok && missing.rows[0].status === 'incomplete', field + ' unknown');
}
const zero = { ...own, normalCash: 0, normalImputed: 0, normalLoss: 0, stressCash: 0, stressImputed: 0, stressLoss: 0, laborMax: 0, hoursMax: 0, repeatMax: 0 };
near(M.compare([zero], { cash: 0, labor: 0, hours: 0, repeat: 0 }, d.decision).bestValue, 0);
const total = { ...own, costMode: 'total', normalTotal: -10, stressTotal: 5, cashMax: 100 };
const totalResult = M.compare([total], d.limits, d.decision);
check(totalResult.ok, 'Net present costs need not exceed undiscounted payments');
near(totalResult.bestValue, -4);
check(!M.compare([{ ...own, normalCash: 1e308, normalImputed: 1e308 }], d.limits, d.decision).ok, 'Overflow must not rank');
const mixed = M.compare([own, M.blankAlternative('UNKNOWN')], d.limits, d.decision);
check(mixed.ok && !mixed.complete && mixed.warnings.length === 1);

// Binary diagnosis: impossible branches contribute zero, ties remain possible,
// and a worse feasible action set is not mislabeled as nonnegative information value.
const i = info();
check(i.ok);
near(i.baseline.cost, 134);
equal(i.baseline.ids, ['C']);
near(i.branches[0].probability, 0.44);
near(i.branches[0].posterior, 8 / 11);
near(i.branches[1].posterior, 1 / 7);
equal(i.branches.map(branch => branch.ids), [['C'], ['E']]);
near(i.conditional, 130.8);
near(i.gross, 3.2);
near(i.feasibleGross, 3.2);
near(i.net, 1.2);
near(i.cost, 132.8);
near(i.perfect, 6);
near(i.cashMax, 132);
near(i.laborMax, 62);
near(info(0.4, { price: 4 }).net, -0.8);
near(info(0.4, { price: 4 }).cost, 134.8);
near(info(1 / 3).gross, 4);
for (const p of [0, 1 / 9, 2 / 9, 1 / 3, 0.4, 0.5, 2 / 3, 1]) {
  const value = info(p);
  near(value.gross, Math.max(0, Math.min(18 * p - 2, 8 - 12 * p)), 'Source EVSI at p=' + p);
}
near(info(2 / 9).net, 0);
near(info(0.5).net, 0);
check(info(2 / 9 + 0.0001).net > 0 && info(0.5 - 0.0001).net > 0);
check(info(2 / 9 - 0.0001).net < 0 && info(0.5 + 0.0001).net < 0);
for (let step = 0; step <= 40; step++) {
  const p = step / 40, value = info(p);
  near(value.gross, Math.max(0, Math.min(18 * p - 2, 8 - 12 * p)));
  check(value.gross >= -1e-9 && value.gross <= value.perfect + 1e-9);
}
for (const p of [0, 0.4, 1]) for (const sensitivity of [0, 0.8, 1]) for (const specificity of [0, 0.8, 1]) {
  const value = info(p, { sensitivity, specificity });
  check(value.ok && Number.isFinite(value.cost));
  near(value.branches[0].probability + value.branches[1].probability, 1);
  for (const branch of value.branches) if (branch.probability === 0) {
    equal(branch.posterior, null);
    equal(branch.ids, []);
    near(branch.cost, 0);
  }
}
near(info(0.4, { sensitivity: 0.4, specificity: 0.6 }).gross, 0);
near(info(0.4, { sensitivity: 1, specificity: 1 }).gross, 6);
near(info(0.4, { sensitivity: 0, specificity: 0 }).gross, 6);
const restricted = info(0.4, {}, { ...d.limits, cash: 130 });
check(restricted.ok && restricted.restricted);
equal(restricted.withInfoIds, ['E']);
near(restricted.gross, 3.2);
near(restricted.feasibleGross, -2);
near(restricted.net, -4);
near(restricted.cost, 138);
const unavailable = info(0.4, { price: 100 });
check(!unavailable.ok && unavailable.status === 'unavailable');
near(unavailable.gross, 3.2);
check(!info(0.4, { delay: 1 }).ok, 'Source time pass cannot certify a positive added delay');
check(info(0.4, { delay: 1 }, { ...d.limits, hours: 49 }).ok);
const extra = info(0.4, { waitingCost: 1, transitionCost: 3 });
near(extra.cost, 136.8);
near(extra.net, -2.8);
near(extra.cashMax, 135);
near(extra.laborMax, 62);
for (const field of ['sensitivity', 'specificity', 'price', 'labor', 'delay', 'waitingCost', 'transitionCost']) check(!info(0.4, { [field]: '' }).ok, 'Diagnosis missing ' + field);
check(!info(0.4, { sensitivity: 1.1 }).ok);
check(!info(0.4, { specificity: -0.1 }).ok);
check(!info(0.4, { price: -1 }).ok);

// Independently hand-calculated annual lifecycle schedule: discounted subtotal,
// expanded economic costs and user losses have distinct totals.
const life = {
  horizon: 2, rate: 0.1, capital: 100, initialTransaction: 5, initialLoss: 2,
  annual: [
    { year: 1, operation: 11, repair: 0, replacement: 0, transaction: 1.1, loss: 2.2 },
    { year: 2, operation: 12.1, repair: 12.1, replacement: 24.2, transaction: 0, loss: 12.1 }
  ], closure: 12.1, residual: 24.2
};
const l = M.lifecycle(life);
check(l.ok);
near(l.tco, 130);                  // 100 + 10 + 10 + 10
near(l.economicWithoutUserLoss, 146); // 130 + 5 + 20 + 1 + 10 - 20
near(l.full, 160);                 // 146 + 2 + 2 + 10
near(l.undiscountedEconomic, 153.4);
near(l.components.residual, 20);
near(l.rows[0].factor, 1 / 1.1);
near(l.rows[1].pvEconomic, 40);
near(M.lifecycle({ ...life, rate: 0 }).full, 169.7);
check(M.lifecycle({ ...life, rate: -0.1 }).ok, 'Mathematical rate domain is greater than -1');
check(!M.lifecycle({ ...life, rate: -1 }).ok);
check(!M.lifecycle({ ...life, rate: '' }).ok);
check(!M.lifecycle({ ...life, horizon: 1.5 }).ok);
check(!M.lifecycle({ ...life, horizon: 0 }).ok);
check(!M.lifecycle({ ...life, annual: [life.annual[0]] }).ok);
check(!M.lifecycle({ ...life, annual: [life.annual[0], life.annual[0]] }).ok);
check(!M.lifecycle({ ...life, initialTransaction: '' }).ok);
check(!M.lifecycle({ ...life, annual: [{ ...life.annual[0], repair: '' }, life.annual[1]] }).ok);
check(!M.lifecycle({ ...life, annual: [{ ...life.annual[0], loss: -1 }, life.annual[1]] }).ok);
near(M.lifecycle({ ...life, residual: 1000 }).components.residual, 1000 / 1.21);
check(M.lifecycle({ ...life, residual: 1000 }).full < 0, 'A residual value may legitimately exceed costs');
const unsorted = M.lifecycle({ ...life, annual: [...life.annual].reverse() });
equal(unsorted.rows.map(row => row.year), [1, 2]);
near(unsorted.full, l.full);

// Min/max normalization, fixed sum-one weights and obligations outside the index.
const efficiency = {
  indicators: [
    { id: 'quality', name: 'Качество', value: 50, min: 0, max: 100, direction: 'increase', weight: 0.4 },
    { id: 'time', name: 'Время', value: 12, min: 0, max: 10, direction: 'decrease', weight: 0.6 }
  ], gates: { safety: 'yes', accessibility: 'yes', critical: 'yes', resources: 'yes' },
  smoothing: { enabled: false, lambda: '', previous: '' }
};
const e = M.efficiency(efficiency);
check(e.ok && e.admissible);
near(e.rows[0].normalized, 0.5);
near(e.rows[1].raw, -0.2);
near(e.rows[1].normalized, 0);
check(e.rows[1].clipped);
near(e.index, 0.2);
near(e.smoothed, 0.2);
const smoothed = M.efficiency({ ...efficiency, smoothing: { enabled: true, lambda: 0.25, previous: 0.8 } });
near(smoothed.smoothed, 0.65);
for (const lambda of [0, -0.1, 1.1, '']) check(!M.efficiency({ ...efficiency, smoothing: { enabled: true, lambda, previous: 0.8 } }).ok);
near(M.efficiency({ ...efficiency, smoothing: { enabled: true, lambda: 1, previous: 0.8 } }).smoothed, 0.2);
for (const previous of ['', -0.1, 1.1]) check(!M.efficiency({ ...efficiency, smoothing: { enabled: true, lambda: 0.5, previous } }).ok);
for (const key of Object.keys(efficiency.gates)) {
  const failed = M.efficiency({ ...efficiency, gates: { ...efficiency.gates, [key]: 'no' } });
  check(failed.ok && !failed.admissible && failed.gateStatus === 'rejected');
  near(failed.index, 0.2, 'Failed obligations do not change the arithmetic index');
  const unknown = M.efficiency({ ...efficiency, gates: { ...efficiency.gates, [key]: 'unknown' } });
  check(unknown.ok && !unknown.admissible && unknown.gateStatus === 'incomplete');
}
for (const changed of [{ min: 100, max: 100 }, { min: 101, max: 100 }, { value: '' }, { weight: '' }, { weight: -0.1 }, { weight: 0.5 }, { direction: '' }]) {
  const invalid = M.efficiency({ ...efficiency, indicators: [{ ...efficiency.indicators[0], ...changed }, efficiency.indicators[1]] });
  check(!invalid.ok && invalid.index === null, 'Invalid indicator ' + JSON.stringify(changed));
}
const above = M.efficiency({ ...efficiency, indicators: [{ ...efficiency.indicators[0], value: 150 }, { ...efficiency.indicators[1], value: -2 }] });
near(above.rows[0].raw, 1.5);
near(above.rows[1].raw, 1.2);
near(above.index, 1);
check(above.rows.every(row => row.clipped));
check(!M.efficiency({ ...efficiency, indicators: [] }).ok);
check(!M.efficiency({ ...efficiency, indicators: [efficiency.indicators[0], efficiency.indicators[0]] }).ok);

// Pure calculations do not mutate caller data or leak non-finite values to JSON.
const before = JSON.stringify(d);
result(); info();
equal(JSON.stringify(d), before);
check(!JSON.stringify({ result: result(), info: info(), life: l, efficiency: e }).includes('undefined'));
console.log(JSON.stringify({ status: 'passed', assertions, source: M.SOURCE.filename, economics: { fixed: 134, diagnostic: 132.8, net: 1.2 }, lifecycle: { tco: l.tco, full: l.full } }, null, 2));
