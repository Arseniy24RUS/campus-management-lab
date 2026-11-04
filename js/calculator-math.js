/*
 * Practical calculations for the manuscript dated 20.10.2026.
 * This module deliberately does not change the older educational data/math layer.
 * Amounts use the unit and common valuation date declared by the case owner.
 */
(function (g) {
  'use strict';

  const SOURCE = Object.freeze({
    author: 'Д. В. Филиппов',
    filename: 'Филиппов диссертация 20.10.2026.docx',
    sha256: '8a9b8bbd21207f64b9e016b02adfd38d894c7bab9ecb0fcd80c739701e125aa8',
    economics: '§ 3.4, таблица 3.18, формулы (3.14)–(3.16)',
    lifecycle: '§ 2.3, формула (2.3); § 3.4, формула (3.9)',
    efficiency: '§ 3.4, формулы (3.11)–(3.13)'
  });
  const EPS = 1e-10;
  const GATES = Object.freeze({
    acceptance: 'Независимое подтверждение результата',
    safety: 'Обязательные требования безопасности',
    accessibility: 'Обязательные требования доступности',
    critical: 'Сохранение критических функций',
    readiness: 'Полномочия, компетенции, данные и календарная доступность проверены'
  });

  function number(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
    if (typeof value !== 'string') return NaN;
    const s = value.trim().replace(/\s/g, '').replace(/−/g, '-').replace(/,/g, '.');
    if (s.length > 128) return NaN;
    if (/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)\/[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s)) {
      const parts = s.split('/').map(Number);
      const result = parts[0] / parts[1];
      return parts[1] !== 0 && Number.isFinite(result) ? result : NaN;
    }
    return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(s) && Number.isFinite(+s) ? +s : NaN;
  }

  const sum = values => values.reduce((total, value) => total + value, 0);
  const near = (a, b) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= EPS * Math.max(1, Math.abs(a), Math.abs(b));
  const exceeds = (a, b) => a > b && !near(a, b);
  const cleanZero = value => near(value, 0) ? 0 : value;
  const isBlank = value => value === null || value === undefined || typeof value === 'string' && value.trim() === '';
  const plain = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};

  function numeric(value, label, errors, min = -Infinity, max = Infinity, integer = false) {
    const result = number(value);
    if (!Number.isFinite(result)) {
      errors.push(label + ': ' + (isBlank(value) ? 'значение не задано' : 'нужно конечное число'));
      return null;
    }
    if (result < min || result > max || integer && !Number.isInteger(result)) {
      let domain = integer ? 'целое число' : 'число';
      if (Number.isFinite(min)) domain += ' не меньше ' + min;
      if (Number.isFinite(max)) domain += ' не больше ' + max;
      errors.push(label + ': требуется ' + domain);
      return null;
    }
    return result;
  }

  function readLimits(input) {
    const source = plain(input), errors = [];
    const limits = {
      cash: numeric(source.cash, 'Денежный лимит', errors, 0),
      labor: numeric(source.labor, 'Трудовой лимит', errors, 0),
      hours: numeric(source.hours, 'Предельный срок', errors, 0),
      repeat: numeric(source.repeat, 'Предельная вероятность повторной работы', errors, 0, 1)
    };
    return { ok: errors.length === 0, errors, limits };
  }

  function blankAlternative(id = 'A') {
    return {
      id: String(id), name: '', costMode: 'parts',
      normalCash: '', normalImputed: '', normalLoss: '', stressCash: '', stressImputed: '', stressLoss: '',
      normalTotal: '', stressTotal: '', cashMax: '', laborMax: '', hoursMax: '', repeatMax: '',
      acceptance: 'unknown', safety: 'unknown', accessibility: 'unknown', critical: 'unknown', readiness: 'unknown', sourceRef: ''
    };
  }

  function demo() {
    const rows = [
      ['A', 'Реактивный порядок', 140, 190, 115, 55],
      ['B', 'Упрощение без независимой приёмки', 90, 115, 80, 40],
      ['C', 'Внутреннее исполнение на основе M05', 120, 155, 130, 60],
      ['D', 'Расширенный состав работ на основе M05–M06', 145, 190, 175, 95],
      ['E', 'Внешнее исполнение с независимой приёмкой', 110, 175, 110, 35]
    ];
    return {
      alternatives: rows.map(([id, name, normalTotal, stressTotal, cashMax, laborMax]) => ({
        ...blankAlternative(id), name, costMode: 'total', normalTotal, stressTotal, cashMax, laborMax,
        // These are assumptions of the author's admissibility example, not results
        // of a real safety/accessibility inspection. Exact times are not published.
        acceptance: id === 'B' ? 'no' : 'yes', safety: 'yes', accessibility: 'yes', critical: 'yes', readiness: 'yes',
        sourceRef: 'table-3.18:' + id
      })),
      limits: { cash: 180, labor: 80, hours: 48, repeat: 0.1 },
      decision: { criterion: 'expected', p: 0.4, pLow: 0.2, pHigh: 0.5 },
      diagnostic: { sensitivity: 0.8, specificity: 0.8, price: 2, labor: 2, delay: 0, waitingCost: 0, transitionCost: 0 }
    };
  }

  function sourceBound(alt, kind, limit, extra, errors, missing, evidence) {
    const match = /^table-3\.18:([A-E])$/.exec(alt.sourceRef || '');
    if (!match) return false;
    const id = match[1], bound = kind === 'hours' ? 48 : 0.1;
    const label = kind === 'hours' ? 'Срок' : 'Вероятность повторной работы';
    const threshold = bound + extra;
    if (id === 'A') {
      if (limit !== null && !exceeds(limit, threshold)) {
        errors.push(label + ': нарушение установлено в авторском примере при исходном лимите ' + bound);
      } else {
        missing.push(label + ': в источнике нет точного значения для проверки изменённого лимита');
      }
    } else if (limit !== null && !exceeds(threshold, limit)) {
      evidence.push(label + ': допуск при исходном лимите ' + bound + ' подтверждён авторским примером; точное значение не опубликовано');
    } else {
      missing.push(label + ': авторский допуск не подтверждает соблюдение более строгого ограничения');
    }
    return true;
  }

  function evaluateAlternative(input, limits, extra) {
    const alt = plain(input), errors = [], missing = [], evidence = [];
    const id = typeof alt.id === 'string' ? alt.id : '';
    const name = typeof alt.name === 'string' ? alt.name : '';
    if (!id.trim()) missing.push('Не задан идентификатор варианта');
    let costs = [null, null], cashMax = null;
    if (alt.costMode === 'parts') {
      const cash = [numeric(alt.normalCash, 'Выплаты при обычной нагрузке', missing, 0), numeric(alt.stressCash, 'Выплаты при напряжённой нагрузке', missing, 0)];
      const imputed = [numeric(alt.normalImputed, 'Вменённая стоимость ресурсов при обычной нагрузке', missing, 0), numeric(alt.stressImputed, 'Вменённая стоимость ресурсов при напряжённой нагрузке', missing, 0)];
      const losses = [numeric(alt.normalLoss, 'Потери пользователей при обычной нагрузке', missing, 0), numeric(alt.stressLoss, 'Потери пользователей при напряжённой нагрузке', missing, 0)];
      costs = cash.map((value, index) => value === null || imputed[index] === null || losses[index] === null ? null : value + imputed[index] + losses[index]);
      if (cash.every(value => value !== null)) cashMax = Math.max(...cash);
    } else if (alt.costMode === 'total') {
      costs = [numeric(alt.normalTotal, 'Полные затраты при обычной нагрузке', missing), numeric(alt.stressTotal, 'Полные затраты при напряжённой нагрузке', missing)];
      cashMax = numeric(alt.cashMax, 'Максимальные денежные выплаты', missing, 0);
      // A payment cap is not a discounted economic cost. No ordering constraint
      // between cashMax and net present costs is justified by § 2.3.
    } else {
      missing.push('Выберите способ ввода затрат: составляющие или полные затраты');
    }
    costs = costs.map(value => {
      if (value !== null && !Number.isFinite(value)) {
        missing.push('Полные затраты выходят за диапазон конечных чисел');
        return null;
      }
      return value;
    });
    const laborMax = numeric(alt.laborMax, 'Максимальные трудозатраты', missing, 0);
    let hoursMax = null, repeatMax = null;
    if (isBlank(alt.hoursMax) && sourceBound(alt, 'hours', limits.hours, extra.delay, errors, missing, evidence)) {
      // A certified bound remains a bound; never present it as an observed time.
    } else {
      hoursMax = numeric(alt.hoursMax, 'Максимальный срок', missing, 0);
      if (hoursMax !== null && limits.hours !== null && exceeds(hoursMax + extra.delay, limits.hours)) errors.push('Превышен предельный срок');
    }
    if (isBlank(alt.repeatMax) && sourceBound(alt, 'repeat', limits.repeat, 0, errors, missing, evidence)) {
      // Same distinction for a probability bound in the source example.
    } else {
      repeatMax = numeric(alt.repeatMax, 'Максимальная вероятность повторной работы', missing, 0, 1);
      if (repeatMax !== null && limits.repeat !== null && exceeds(repeatMax, limits.repeat)) errors.push('Превышена допустимая вероятность повторной работы');
    }
    if (cashMax !== null && limits.cash !== null && exceeds(cashMax + extra.cash, limits.cash)) errors.push('Превышен денежный лимит');
    if (laborMax !== null && limits.labor !== null && exceeds(laborMax + extra.labor, limits.labor)) errors.push('Превышен трудовой лимит');
    for (const [key, label] of Object.entries(GATES)) {
      if (alt[key] === 'no') errors.push(label + ': не соблюдено');
      else if (alt[key] !== 'yes') missing.push(label + ': не подтверждено');
    }
    if (Object.values(limits).some(value => value === null)) missing.push('Лимиты для проверки допуска заполнены не полностью');
    const status = errors.length ? 'rejected' : missing.length ? 'incomplete' : 'admitted';
    return { id, name, status, ok: status === 'admitted', errors, missing, evidence, costs, cashMax, laborMax, hoursMax, repeatMax, expected: null, worst: null, regret: null, score: null };
  }

  function evaluateAll(alternatives, limits, extra = { cash: 0, labor: 0, delay: 0 }) {
    return alternatives.map(alt => evaluateAlternative(alt, limits, extra));
  }

  function alternativeList(input, errors) {
    if (!Array.isArray(input) || input.length === 0 || input.length > 50) {
      errors.push('Нужно от 1 до 50 вариантов исполнения');
      return [];
    }
    const ids = new Set();
    for (const alt of input) {
      if (!alt || typeof alt !== 'object' || Array.isArray(alt)) {
        errors.push('Неверный формат варианта исполнения');
        continue;
      }
      if (ids.has(alt.id)) errors.push('Идентификаторы вариантов должны различаться');
      ids.add(alt.id);
    }
    return input;
  }

  const expectedCost = (costs, p) => (1 - p) * costs[0] + p * costs[1];

  function choose(rows, p) {
    if (!rows.length) return { ids: [], cost: null };
    const values = rows.map(row => ({ id: row.id, cost: expectedCost(row.costs, p) }));
    const cost = Math.min(...values.map(row => row.cost));
    return { ids: values.filter(row => near(row.cost, cost)).map(row => row.id), cost };
  }

  function compare(inputAlternatives, inputLimits, inputDecision) {
    const errors = [], list = alternativeList(inputAlternatives, errors), parsed = readLimits(inputLimits);
    errors.push(...parsed.errors);
    const decision = plain(inputDecision), criterion = decision.criterion;
    if (!['expected', 'worst', 'regret'].includes(criterion)) errors.push('Не выбран критерий сравнения');
    const pErrors = [], intervalErrors = [];
    const p = numeric(decision.p, 'Вероятность напряжённого режима', pErrors, 0, 1);
    const pLow = numeric(decision.pLow, 'Нижняя граница вероятности', intervalErrors, 0, 1);
    const pHigh = numeric(decision.pHigh, 'Верхняя граница вероятности', intervalErrors, 0, 1);
    if (pLow !== null && pHigh !== null && pLow > pHigh) intervalErrors.push('Нижняя граница вероятности превышает верхнюю');
    if (criterion === 'expected') errors.push(...pErrors);
    if (criterion === 'regret') errors.push(...intervalErrors);
    const rows = evaluateAll(list, parsed.limits), admitted = parsed.ok ? rows.filter(row => row.ok) : [];
    for (const row of rows) {
      if (row.costs.every(value => value !== null)) {
        row.expected = pErrors.length ? null : expectedCost(row.costs, p);
        row.worst = Math.max(...row.costs);
      }
    }
    if (!intervalErrors.length && admitted.length) {
      // Regret is the maximum of affine differences. It is convex in p, so the
      // supremum over a closed interval occurs at an endpoint, for any number of actions.
      for (const row of admitted) row.regret = Math.max(0, ...[pLow, pHigh].map(probability => expectedCost(row.costs, probability) - choose(admitted, probability).cost));
    }
    if (!admitted.length && !errors.length) errors.push('Нет вариантов с подтверждённым допуском и полными исходными данными');
    const key = criterion === 'expected' ? 'expected' : criterion === 'worst' ? 'worst' : 'regret';
    for (const row of admitted) row.score = row[key];
    if (!errors.length && admitted.some(row => !Number.isFinite(row.score))) errors.push('Критерий сравнения выходит за диапазон конечных чисел; проверьте единицы и величины затрат');
    const bestValue = errors.length || !admitted.length ? null : Math.min(...admitted.map(row => row.score));
    const bestIds = bestValue === null ? [] : admitted.filter(row => near(row.score, bestValue)).map(row => row.id);
    return {
      ok: errors.length === 0, errors, rows, criterion, bestIds, bestValue,
      admittedIds: admitted.map(row => row.id), complete: rows.every(row => row.status !== 'incomplete'),
      warnings: rows.some(row => row.status === 'incomplete') ? ['Сравнение относится только к допущенным вариантам; для части вариантов исходные данные или подтверждения отсутствуют'] : []
    };
  }

  function information(inputAlternatives, inputLimits, inputP, inputDiagnostic) {
    const errors = [], list = alternativeList(inputAlternatives, errors), parsed = readLimits(inputLimits);
    errors.push(...parsed.errors);
    const p = numeric(inputP, 'Вероятность напряжённого режима', errors, 0, 1), source = plain(inputDiagnostic);
    const diagnostic = {
      sensitivity: numeric(source.sensitivity, 'Чувствительность', errors, 0, 1),
      specificity: numeric(source.specificity, 'Специфичность', errors, 0, 1),
      price: numeric(source.price, 'Цена диагностики', errors, 0),
      labor: numeric(source.labor, 'Трудозатраты диагностики', errors, 0),
      delay: numeric(source.delay, 'Задержка обслуживания', errors, 0),
      waitingCost: numeric(source.waitingCost, 'Остаточные потери пользователей из-за ожидания', errors, 0),
      transitionCost: numeric(source.transitionCost, 'Дополнительные денежные расходы перехода', errors, 0)
    };
    const empty = { ok: false, errors, status: 'invalid', baseline: { ids: [], cost: null }, branches: [], conditional: null, cost: null, gross: null, feasibleGross: null, net: null, perfect: null, restricted: false, admittedIds: [], withInfoIds: [], cashMax: null, laborMax: null, extraCost: null };
    if (errors.length) return empty;
    const all = evaluateAll(list, parsed.limits), base = all.filter(row => row.ok);
    if (!base.length) return { ...empty, status: 'unavailable', errors: ['Нет допустимого фиксированного варианта для сравнения с диагностикой'] };
    const baseline = choose(base, p);
    const probabilityHigh = p * diagnostic.sensitivity + (1 - p) * (1 - diagnostic.specificity);
    const probabilityLow = p * (1 - diagnostic.sensitivity) + (1 - p) * diagnostic.specificity;
    const signals = [
      { signal: 'high', probability: probabilityHigh, posterior: probabilityHigh === 0 ? null : p * diagnostic.sensitivity / probabilityHigh },
      { signal: 'low', probability: probabilityLow, posterior: probabilityLow === 0 ? null : p * (1 - diagnostic.sensitivity) / probabilityLow }
    ];
    const policy = candidates => signals.map(signal => ({ ...signal, ...(signal.posterior === null ? { ids: [], cost: 0 } : choose(candidates, signal.posterior)) }));
    const originalBranches = policy(base);
    const originalConditional = sum(originalBranches.map(branch => branch.probability * branch.cost));
    const gross = Math.max(0, cleanZero(baseline.cost - originalConditional));
    const perfect = Math.max(0, cleanZero(baseline.cost - ((1 - p) * choose(base, 0).cost + p * choose(base, 1).cost)));
    if (![baseline.cost, originalConditional, gross, perfect].every(Number.isFinite)) return { ...empty, errors: ['Ценность информации выходит за диапазон конечных чисел; проверьте единицы и величины затрат'] };
    const extraCash = diagnostic.price + diagnostic.transitionCost;
    const extraCost = extraCash + diagnostic.waitingCost;
    if (![extraCash, extraCost].every(Number.isFinite)) return { ...empty, errors: ['Дополнительные затраты выходят за диапазон конечных чисел'] };
    const withInfoRows = evaluateAll(list, parsed.limits, { cash: extraCash, labor: diagnostic.labor, delay: diagnostic.delay });
    const withInfo = withInfoRows.filter(row => row.ok);
    const restricted = withInfo.length !== base.length || base.some(row => !withInfo.some(candidate => candidate.id === row.id));
    const common = { ...empty, baseline, gross, perfect, restricted, extraCost, originalBranches, originalConditional, admittedIds: base.map(row => row.id), withInfoIds: withInfo.map(row => row.id), withInfoRows };
    if (!withInfo.length) return { ...common, status: 'unavailable', errors: ['После учёта цены, трудозатрат и задержки диагностики нет вариантов с подтверждённым допуском'] };
    const branches = policy(withInfo), conditional = sum(branches.map(branch => branch.probability * branch.cost));
    const cost = conditional + extraCost, feasibleGross = cleanZero(baseline.cost - conditional), net = cleanZero(baseline.cost - cost);
    if (![conditional, cost, feasibleGross, net].every(Number.isFinite)) return { ...common, errors: ['Стоимость стратегии выходит за диапазон конечных чисел'] };
    const selected = new Set(branches.filter(branch => branch.probability > 0).flatMap(branch => branch.ids));
    const chosen = withInfo.filter(row => selected.has(row.id));
    return {
      ...common, ok: true, status: 'ready', errors: [], branches, conditional, cost, feasibleGross, net,
      cashMax: Math.max(...chosen.map(row => row.cashMax)) + extraCash,
      laborMax: Math.max(...chosen.map(row => row.laborMax)) + diagnostic.labor,
      warnings: restricted ? ['Диагностика меняет множество допустимых действий. Валовая ценность информации рассчитана отдельно для исходного множества; экономия выполнимой стратегии может быть отрицательной'] : []
    };
  }

  function lifecycle(input) {
    const source = plain(input), errors = [];
    const horizon = numeric(source.horizon, 'Общий горизонт, лет', errors, 1, 100, true);
    const rate = numeric(source.rate, 'Ставка дисконтирования', errors);
    if (rate !== null && rate <= -1) errors.push('Ставка дисконтирования должна быть больше −1');
    const capital = numeric(source.capital, 'Первоначальные капитальные расходы', errors, 0);
    const initialTransaction = numeric(source.initialTransaction, 'Трансакционные расходы в момент 0', errors, 0);
    const initialLoss = numeric(source.initialLoss, 'Остаточные потери пользователей в момент 0', errors, 0);
    const closure = numeric(source.closure, 'Расходы завершения использования', errors, 0);
    const residual = numeric(source.residual, 'Остаточная стоимость в конце горизонта', errors, 0);
    const fields = { operation: 'Эксплуатация', repair: 'Ремонт', replacement: 'Замены', transaction: 'Трансакционные расходы', loss: 'Остаточные потери пользователей' };
    const rows = [], years = new Set();
    if (!Array.isArray(source.annual) || source.annual.length > 100) errors.push('Нужен годовой календарь затрат длиной не более 100 лет');
    else for (let index = 0; index < source.annual.length; index++) {
      const item = plain(source.annual[index]);
      const year = numeric(item.year, 'Год в строке ' + (index + 1), errors, 1, horizon || 100, true);
      if (year !== null && years.has(year)) errors.push('Год ' + year + ' повторяется в календаре');
      years.add(year);
      const row = { year };
      for (const [key, label] of Object.entries(fields)) row[key] = numeric(item[key], label + ', год ' + (year ?? index + 1), errors, 0);
      rows.push(row);
    }
    if (horizon !== null && (rows.length !== horizon || Array.from({ length: horizon }, (_, i) => i + 1).some(year => !years.has(year)))) errors.push('Для каждого года общего горизонта нужна одна строка; отсутствие расходов задаётся явно нулём');
    const empty = { ok: false, errors, rows: [], components: null, tco: null, monetary: null, full: null, undiscountedMonetary: null, economicWithoutUserLoss: null, undiscountedEconomic: null };
    if (errors.length) return empty;
    rows.sort((a, b) => a.year - b.year);
    const components = { capital, initialTransaction, initialLoss, operation: 0, repair: 0, replacement: 0, transaction: 0, loss: 0, closure: 0, residual: 0 };
    for (const row of rows) {
      row.factor = 1 / Math.pow(1 + rate, row.year);
      row.cash = row.operation + row.repair + row.replacement + row.transaction;
      row.full = row.cash + row.loss;
      row.pvCash = row.cash * row.factor;
      row.pvFull = row.full * row.factor;
      // Legacy-compatible property names do not imply actual cash payments:
      // operation/repair may contain the economic valuation of internal labor.
      row.annualEconomic = row.cash;
      row.pvEconomic = row.pvCash;
      for (const key of Object.keys(fields)) components[key] += row[key] * row.factor;
    }
    const terminalFactor = 1 / Math.pow(1 + rate, horizon);
    components.closure = closure * terminalFactor;
    components.residual = residual * terminalFactor;
    const tco = capital + components.operation + components.repair;
    const monetary = tco + initialTransaction + components.replacement + components.transaction + components.closure - components.residual;
    const full = monetary + initialLoss + components.loss;
    const undiscountedMonetary = capital + initialTransaction + sum(rows.map(row => row.cash)) + closure - residual;
    const values = [...Object.values(components), tco, monetary, full, undiscountedMonetary, ...rows.flatMap(row => [row.factor, row.cash, row.full, row.pvCash, row.pvFull])];
    if (!values.every(Number.isFinite)) return { ...empty, errors: ['При заданной ставке и затратах результат выходит за диапазон конечных чисел; проверьте единицы и горизонт'] };
    return { ok: true, errors: [], rows, components, tco, monetary, full, undiscountedMonetary, economicWithoutUserLoss: monetary, undiscountedEconomic: undiscountedMonetary, terminalFactor };
  }

  function efficiency(input) {
    const source = plain(input), errors = [], rows = [], identifiers = new Set();
    if (!Array.isArray(source.indicators) || source.indicators.length === 0 || source.indicators.length > 100) errors.push('Нужно от 1 до 100 показателей');
    else for (let index = 0; index < source.indicators.length; index++) {
      const item = plain(source.indicators[index]), prefix = (typeof item.name === 'string' && item.name) || 'Показатель ' + (index + 1), localErrors = [];
      const value = numeric(item.value, prefix + ': значение', localErrors);
      const min = numeric(item.min, prefix + ': нижняя граница', localErrors);
      const max = numeric(item.max, prefix + ': верхняя граница', localErrors);
      const weight = numeric(item.weight, prefix + ': вес', localErrors, 0, 1);
      if (min !== null && max !== null && min >= max) localErrors.push(prefix + ': нижняя граница должна быть строго меньше верхней');
      if (!['increase', 'decrease'].includes(item.direction)) localErrors.push(prefix + ': не задано направление предпочтительности');
      if (typeof item.id !== 'string' || !item.id.trim() || identifiers.has(item.id)) localErrors.push(prefix + ': нужен уникальный идентификатор');
      identifiers.add(item.id);
      const raw = localErrors.length ? null : item.direction === 'increase' ? (value - min) / (max - min) : (max - value) / (max - min);
      if (raw !== null && !Number.isFinite(raw)) localErrors.push(prefix + ': нормирование выходит за диапазон конечных чисел');
      const normalized = localErrors.length ? null : Math.max(0, Math.min(1, raw));
      rows.push({ id: item.id, name: item.name, value, min, max, direction: item.direction, weight, raw: localErrors.length ? null : raw, normalized, clipped: normalized !== null && normalized !== raw, weighted: normalized === null ? null : weight * normalized, errors: localErrors });
      errors.push(...localErrors);
    }
    const weightSum = rows.length && rows.every(row => row.weight !== null) ? sum(rows.map(row => row.weight)) : null;
    if (weightSum !== null && !near(weightSum, 1)) errors.push('Сумма весов должна быть равна 1; автоматическое перенормирование не применяется');
    const smoothing = plain(source.smoothing);
    let lambda = null, previous = null;
    if (smoothing.enabled === true) {
      lambda = numeric(smoothing.lambda, 'Параметр сглаживания λ', errors, 0, 1);
      if (lambda === 0) errors.push('Параметр сглаживания λ должен быть больше 0');
      previous = numeric(smoothing.previous, 'Предыдущий сглаженный индекс', errors, 0, 1);
    } else if (smoothing.enabled !== false) errors.push('Укажите, применяется ли сглаживание');
    const gates = plain(source.gates), gateErrors = [], gateMissing = [];
    const labels = { safety: 'Безопасность', accessibility: 'Доступность', critical: 'Критические функции', resources: 'Ресурсный допуск' };
    for (const [key, label] of Object.entries(labels)) {
      if (gates[key] === 'no') gateErrors.push(label + ': обязательное условие не соблюдено');
      else if (gates[key] !== 'yes') gateMissing.push(label + ': подтверждение отсутствует');
    }
    const gateStatus = gateErrors.length ? 'rejected' : gateMissing.length ? 'incomplete' : 'admitted';
    const index = errors.length ? null : sum(rows.map(row => row.weighted));
    // The first comparable period initializes the smoothed series with E itself.
    const smoothed = index === null ? null : smoothing.enabled ? lambda * index + (1 - lambda) * previous : index;
    return { ok: errors.length === 0, errors, rows, weightSum, index, smoothed, admissible: gateStatus === 'admitted', gateStatus, gateErrors: [...gateErrors, ...gateMissing] };
  }

  const api = { SOURCE, number, near, blankAlternative, demo, compare, information, lifecycle, efficiency };
  g.CampusCalculatorMath = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
