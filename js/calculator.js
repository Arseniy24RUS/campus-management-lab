/* Practical cases use the 20.10.2026 manuscript, independently of the teaching data. */
(function (g) {
  'use strict';
  const M = g.CampusCalculatorMath, U = g.CampusUI;
  const KEY = 'campus-practical-case-v1', FORMAT = 'campus-practical-case';
  const esc = U.esc, fmt = (n, digits = 2) => Number.isFinite(n) ? U.fmt(n, digits) : '—';
  const tabs = [['comparison', 'Выбор и диагностика'], ['lifecycle', 'Стоимость жизненного цикла'], ['efficiency', 'Оценка результата'], ['report', 'Отчёт']];
  const gateOptions = [['unknown', 'Не проверено'], ['yes', 'Выполнено'], ['no', 'Нарушено']];
  let hooks = {}, activeTab = 'comparison', timer, notice = '', storageError = '', lastSaved = null, detailEpoch = 0;
  function annual(year) { return {year, operation:'', repair:'', replacement:'0', transaction:'0', loss:'0'}; }
  function blankIndicator(id) { return {id, name:'', unit:'', value:'', min:'', max:'', direction:'increase', weight:'0', basis:''}; }
  function fresh(example = false) {
    const economy = example ? M.demo() : {
      alternatives:[M.blankAlternative('A'), M.blankAlternative('B')], limits:{cash:'',labor:'',hours:'',repeat:''},
      decision:{criterion:'expected',p:'',pLow:'',pHigh:''},
      diagnostic:{sensitivity:'',specificity:'',price:'',labor:'',delay:'',waitingCost:'0',transitionCost:'0'}
    };
    economy.alternatives.forEach(a=>{a.evidence='';});
    return {
      meta:{kind:example?'example':'own',title:example?'Выбор способа инженерного обслуживания':'Новый расчётный случай',object:example?'Расчётный пример § 3.4, таблица 3.18':'',result:'',owner:'',date:new Date().toISOString().slice(0,10),unit:example?'усл. ден. ед.':'руб.',priceDate:'',basis:example?'Условия автора, а не наблюдения реального объекта. Вероятность напряжённого режима p = 0,4.':'',notes:''},
      economy,
      lifecycle:{horizon:3,rate:'',capital:'',initialTransaction:'0',initialLoss:'0',annual:[annual(1),annual(2),annual(3)],closure:'0',residual:'0',basis:''},
      efficiency:{indicators:[{...blankIndicator('K1'),weight:'1'}],gates:{safety:'unknown',accessibility:'unknown',critical:'unknown',resources:'unknown'},smoothing:{enabled:false,lambda:'',previous:''},basis:''}
    };
  }
  let state = fresh(true);
  function copy(obj) { return JSON.parse(JSON.stringify(obj)); }
  function get(path) { return path.split('.').reduce((o,k)=>o?.[k],state); }
  function set(path,value) {
    const keys = path.split('.');
    if(keys.some(k=>['__proto__','constructor','prototype'].includes(k))) return;
    const last = keys.pop(), parent = keys.reduce((o,k)=>o?.[k],state);
    if(parent && Object.prototype.hasOwnProperty.call(parent,last)) parent[last] = value;
  }
  function save() {
    try { localStorage.setItem(KEY,JSON.stringify({format:FORMAT,schemaVersion:1,source:M.SOURCE,case:state})); lastSaved = new Date(); storageError = ''; }
    catch (_) { storageError = 'Не удалось сохранить кейс в этом браузере. Выгрузите JSON, чтобы сохранить введённые данные.'; }
  }
  function redraw() { clearTimeout(timer); hooks.render?.(); }
  function announce(text) { notice = text; hooks.announce?.(text); }
  function field(path,label,options={}) {
    const value = get(path) ?? '', id = 'calc-'+path.replace(/\./g,'-');
    const help = options.help ? `<small id="${id}-help">${esc(options.help)}</small>` : '';
    const attrs = `id="${id}" data-calc-bind="${esc(path)}" data-focus-key="${id}" ${options.help?`aria-describedby="${id}-help"`:''}`;
    let control;
    if(options.options) control = `<select ${attrs}>${options.options.map(([v,t])=>`<option value="${esc(v)}" ${String(v)===String(value)?'selected':''}>${esc(t)}</option>`).join('')}</select>`;
    else if(options.area) control = `<textarea ${attrs} rows="${options.rows||2}" maxlength="8000">${esc(value)}</textarea>`;
    else control = `<input ${attrs} type="${options.date?'date':'text'}" ${options.number?'inputmode="decimal" autocomplete="off"':''} value="${esc(value)}" maxlength="${options.number?'60':'500'}" ${options.placeholder?`placeholder="${esc(options.placeholder)}"`:''}>`;
    return `<label class="calc-field ${options.wide?'calc-span':''}" for="${id}"><span>${esc(label)}</span>${control}${help}</label>`;
  }
  const num = (path,label,help) => field(path,label,{number:true,help});
  const btn = (text,action,extra='',cls='') => `<button type="button" class="btn ${cls}" data-calc-action="${action}" ${extra}>${esc(text)}</button>`;
  const block = (title,body,aside='') => `<section class="panel calc-panel"><div class="calc-section-title"><h2>${title}</h2>${aside}</div>${body}</section>`;
  const metric = (value,label) => `<div class="calc-metric"><strong>${esc(value)}</strong><span>${esc(label)}</span></div>`;
  const msg = (text,kind='') => `<div class="calc-message ${kind}">${text}</div>`;
  const table = (head,rows,label) => U.table(head,rows,{label});
  function errors(result,empty='Заполните исходные данные для расчёта.') {
    const values = Array.from(new Set(result?.errors || []));
    return msg(`<b>${esc(empty)}</b>${values.length?`<p>${values.slice(0,8).map(esc).join(' · ')}${values.length>8?' · …':''}</p>`:''}`,'pending');
  }
  function calculate() {
    const e = state.economy;
    return {comparison:M.compare(e.alternatives,e.limits,e.decision),diagnostic:M.information(e.alternatives,e.limits,e.decision.p,e.diagnostic),lifecycle:M.lifecycle(state.lifecycle),efficiency:M.efficiency(state.efficiency)};
  }
  function labelIds(ids) { return (ids||[]).join(' / ') || '—'; }
  function criterionName(c) { return ({expected:'Минимум ожидаемых затрат',worst:'Минимум наибольших затрат',regret:'Минимум максимального сожаления'})[c]||c; }
  function passport() {
    const m = state.meta;
    return `<details data-calc-detail="passport-${detailEpoch}" class="panel calc-passport" ${m.kind==='own'?'open':''}><summary><span><b>${esc(m.title||'Название случая')}</b><small>${esc(m.object||'Объект, требуемый результат и основания расчёта')}</small></span><span class="calc-summary-hint">Паспорт случая</span></summary><div class="calc-fields">${field('meta.title','Название случая')}${field('meta.object','Объект и границы расчёта')}${field('meta.result','Требуемый результат')}${field('meta.owner','Ответственный / составитель')}${field('meta.date','Дата расчёта',{date:true})}${field('meta.unit','Общая денежная единица',{help:'Все затраты, потери и лимиты в этой единице.'})}${field('meta.priceDate','Базовая дата и ценовая база',{help:'Например: постоянные цены на 01.11.2026.'})}${field('meta.basis','Основания исходных данных',{area:true,help:'Сметы, акты, нормативы, дата оценки вероятностей.'})}${field('meta.notes','Условия и ограничения применимости',{area:true,wide:true})}</div></details>`;
  }
  function comparisonSummary(c) {
    if(c.rows?.length && c.rows.every(row=>row.status==='rejected')) return msg('<b>Допустимого решения нет.</b><p>Все варианты отклонены по обязательным условиям. Причины приведены в таблице.</p>','error');
    if(!c.ok) return errors(c,'Сравнение пока не завершено');
    if(!c.bestIds?.length) return msg('<b>Допустимого решения нет.</b><p>Проверьте причины отклонения и недостающие сведения по каждому варианту. Стоимость не отменяет обязательные условия.</p>','error');
    const names = c.bestIds.map(id=>state.economy.alternatives.find(a=>a.id===id)?.name||id).join(' / ');
    return `<div class="calc-result"><div><span class="calc-eyebrow">ПРИ ТЕКУЩИХ УСЛОВИЯХ</span><h2>${esc(labelIds(c.bestIds))} <span>· ${esc(names)}</span></h2><p>${esc(criterionName(c.criterion))}. Сравниваются только допустимые варианты.${c.complete?'':' Для части вариантов не хватает данных; сравнение неполное.'}</p></div><div class="calc-result-metrics">${metric(fmt(c.bestValue),state.meta.unit)}${metric(`${c.admittedIds?.length||0} из ${c.rows?.length||0}`,'допущено к сравнению')}</div></div>`;
  }
  function comparisonTable(c) {
    if(!c.rows?.length) return '';
    return table(['Вариант','Допуск','Ожидаемые затраты','Наибольшие затраты','Макс. сожаление','Основание'],c.rows.map(r=>[
      `${r.id} · ${r.name||'Без названия'}`,({admitted:'Допущен',rejected:'Отклонён',incomplete:'Не хватает данных'})[r.status]||r.status,
      fmt(r.expected),fmt(r.worst),fmt(r.regret),[...(r.errors||[]),...(r.missing||[])].join('; ')||(c.bestIds?.includes(r.id)?'Минимум по выбранному критерию':'Условия выполнены')
    ]),'Сравнение способов исполнения');
  }
  function alternativeEditor(a,i,c) {
    const p = `economy.alternatives.${i}`, row = c.rows?.find(r=>r.id===a.id);
    const status = ({admitted:'Допущен',rejected:'Отклонён',incomplete:'Требуются данные'})[row?.status]||'Требуются данные';
    return `<details data-calc-detail="alt-${detailEpoch}-${esc(a.id)}" class="calc-alternative" ${state.meta.kind==='own'&&i===0?'open':''}><summary><span class="calc-alt-code">${esc(a.id)}</span><span class="calc-alt-title">${esc(a.name||'Новый вариант')}</span><span class="calc-status ${row?.status||'incomplete'}">${esc(status)}</span></summary><div class="calc-alt-body"><div class="calc-fields">${field(p+'.name','Наименование варианта')}${field(p+'.costMode','Способ ввода затрат',{options:[['parts','Составляющие полной стоимости'],['total','Готовая полная стоимость']]})}</div>${a.sourceRef?msg('В авторском примере приведены полные затраты и максимальные ресурсы. Численные сроки и вероятности повторной работы не раскрыты; исходный допуск применяется только при не более строгих границах. Формальный допуск примера не подтверждает безопасность реального объекта.'):''}<div class="calc-fields calc-fields-four">${a.costMode==='parts'?num(p+'.normalCash','Выплаты · обычный режим')+num(p+'.normalImputed','Ресурсы без доп. выплат · обычный','Вменённая стоимость труда и иных ресурсов, не включённая в выплаты.')+num(p+'.normalLoss','Потери пользователей · обычный')+num(p+'.stressCash','Выплаты · напряжённый режим')+num(p+'.stressImputed','Ресурсы без доп. выплат · напряжённый','Вменённая стоимость; не учитывайте оплаченную работу повторно.')+num(p+'.stressLoss','Потери пользователей · напряжённый'):num(p+'.normalTotal','Полная стоимость · обычный режим')+num(p+'.stressTotal','Полная стоимость · напряжённый режим')+num(p+'.cashMax','Максимальные денежные выплаты','Проверяются отдельно от полной стоимости.')}${num(p+'.laborMax','Максимальный труд, ч')}${num(p+'.hoursMax','Максимальный срок, ч',a.sourceRef?'Пусто: используется только подтверждённый в источнике допуск.':undefined)}${num(p+'.repeatMax','Макс. вероятность повторной работы','Доля от 0 до 1.')}</div><p class="calc-help">Максимумы задаются по обоим режимам. Выплаты включают прямые и координационные расходы. Вменённая стоимость собственных ресурсов добавляется отдельно; потери пользователей учитываются однократно и не расходуют денежный лимит.</p><div class="calc-fields calc-fields-four">${field(p+'.acceptance','Независимая приёмка',{options:gateOptions})}${field(p+'.safety','Обязательная безопасность',{options:gateOptions})}${field(p+'.accessibility','Минимальная доступность',{options:gateOptions})}${field(p+'.critical','Непрерывность критических функций',{options:gateOptions})}</div>${field(p+'.readiness','Полномочия, компетенции, исходные данные и календарная доступность проверены',{options:gateOptions})}${field(p+'.evidence','Основания допуска и оценки ресурсов',{area:true,help:'Реквизиты проверок, регламентов и расчётов; учтите другие обязательства и применимые ограничения.'})}<div class="calc-alt-footer">${btn('Удалить вариант','remove-alt',`data-calc-index="${i}"`,'small')}</div></div></details>`;
  }
  function diagnosticView(info) {
    const p = 'economy.diagnostic.';
    let output = info.ok ? `<div class="calc-metrics">${metric(fmt(info.gross),'Валовая ценность информации')}${metric(fmt(info.net),'Чистая экономия стратегии')}${metric(fmt(info.cost),'Стоимость стратегии')}${metric(fmt(info.perfect),'Ценность совершенной информации')}</div>${table(['Сигнал','Вероятность сигнала','Вероятность напряжённого режима','Выбор после сигнала'],(info.branches||[]).map(b=>[b.signal==='high'?'Высокий':'Низкий',fmt(b.probability,4),b.posterior===null?'Не определена: сигнал невозможен':fmt(b.posterior,4),b.probability===0?'Ветвь не реализуется':labelIds(b.ids)]),'Условный выбор после диагностики')}${msg(`<b>${info.net>1e-8?'Диагностика снижает ожидаемые полные затраты.':Math.abs(info.net)<=1e-8?'Стратегии равноценны по ожидаемым затратам.':'Диагностика не даёт чистой экономии.'}</b> Фиксированный выбор: ${fmt(info.baseline?.cost)}; после сигнала до сопутствующих расходов: ${fmt(info.conditional)} ${esc(state.meta.unit)}.`)}${info.restricted?msg(`Диагностика изменила набор допустимых действий. Валовая ценность ${fmt(info.gross)} рассчитана при сохранении исходного набора; выигрыш реализуемой стратегии до сопутствующих расходов равен ${fmt(info.feasibleGross)}. Гарантия неотрицательности на изменённую стратегию не распространяется.`,'pending'):''}` : errors(info,'Для оценки диагностики нужны вероятность, параметры сигнала и допустимые действия');
    return `<details data-calc-detail="diagnostic-${detailEpoch}" class="panel calc-diagnostic" open><summary><span><b>Нужна ли дополнительная диагностика?</b><small>Выбор действия после сигнала · формулы (3.15)–(3.16)</small></span></summary><p class="calc-help">Оценка всегда использует ожидаемые затраты и заданную вероятность p. Цена, ожидание и переход не должны быть уже включены в стоимость вариантов. Допустимость ожидания и неизменность самого объекта проверяются до расчёта.</p><div class="calc-fields calc-fields-four">${num(p+'sensitivity','Чувствительность сигнала','P(высокий сигнал | напряжённый режим).')}${num(p+'specificity','Специфичность сигнала','P(низкий сигнал | обычный режим).')}${num(p+'price','Цена диагностики')}${num(p+'labor','Дополнительный труд, ч')}${num(p+'delay','Задержка исполнения, ч')}${num(p+'waitingCost','Доп. потери от ожидания','Неденежные потери в общей денежной оценке.')}${num(p+'transitionCost','Доп. выплаты при переходе','Учитываются один раз, в том числе в лимите выплат.')}</div>${output}</details>`;
  }
  function comparisonView(r) {
    const d = state.economy.decision, p = 'economy.';
    return comparisonSummary(r.comparison)+block('Условия сравнения',`<div class="calc-fields calc-fields-four">${field(p+'decision.criterion','Критерий выбора',{options:[['expected','Ожидаемые затраты'],['worst','Наибольшие затраты'],['regret','Максимальное сожаление']]})}${num(p+'decision.p','Вероятность напряжённого режима p','От 0 до 1; требуется для ожидания и диагностики.')}${d.criterion==='regret'?num(p+'decision.pLow','Нижняя граница вероятности pL')+num(p+'decision.pHigh','Верхняя граница вероятности pU'):''}${num(p+'limits.cash','Денежный лимит, '+state.meta.unit)}${num(p+'limits.labor','Трудовой лимит, ч')}${num(p+'limits.hours','Предельный срок, ч')}${num(p+'limits.repeat','Предельная вероятность повторной работы','Доля от 0 до 1; 0,10 означает 10%.')}</div><p class="calc-help">Два режима должны относиться к одной задаче, дате и ценовой базе. Лимиты означают доступные ресурсы после уже принятых обязательств и проверяются для обоих режимов. Для многоэтапной программы календарь проверяется отдельно.</p>`)+block('Сравнение вариантов',comparisonTable(r.comparison)+`<div class="calc-alternatives">${state.economy.alternatives.map((a,i)=>alternativeEditor(a,i,r.comparison)).join('')}</div><div class="calc-panel-actions">${btn('Добавить вариант','add-alt','','small')}</div>`)+diagnosticView(r.diagnostic);
  }
  function lifecycleView(r) {
    const p='lifecycle.', result=r.lifecycle, fields=[['operation','Эксплуатация'],['repair','Ремонт'],['replacement','Замены'],['transaction','Трансакционные расходы'],['loss','Остаточные потери']];
    const output=result.ok?`<div class="calc-result calc-lifecycle-result"><div><span class="calc-eyebrow">ПРИВЕДЕНО К НАЧАЛЬНОЙ ДАТЕ</span><h2>${esc(fmt(result.full))} <span>${esc(state.meta.unit)}</span></h2><p>Полная стоимость с остаточными потерями и остаточной стоимостью.</p></div></div><div class="calc-metrics">${metric(fmt(result.tco),'Укрупнённый TCO · (3.9)')}${metric(fmt(result.monetary),'Приведённые затраты без потерь пользователей')}${metric(fmt(result.full),'Полная приведённая стоимость · § 2.3')}</div>`:errors(result,'Задайте общую базу и затраты по годам');
    return output+block('Горизонт и начальные затраты',`<p class="calc-help">Вводится один вариант. Все потоки относятся к концу соответствующего года, начальные затраты — к t = 0. Для сопоставления вариантов используйте один горизонт, дату и ценовую базу. Приведённая стоимость не заменяет проверку выплат каждого периода.</p><div class="calc-fields calc-fields-four">${num(p+'horizon','Горизонт, лет','Целое число от 1 до 50.')}${num(p+'rate','Годовая ставка d, доля','Например, 0,08 = 8%. Реальная ставка для постоянных цен.')}${num(p+'capital','Капитальные расходы при t = 0')}${num(p+'initialTransaction','Трансакционные расходы при t = 0')}${num(p+'initialLoss','Остаточные потери при t = 0')}${num(p+'closure','Завершение использования в год T')}${num(p+'residual','Остаточная стоимость в год T','Вычитается один раз.')}</div>${M.number(state.lifecycle.horizon)!==state.lifecycle.annual.length?`<div class="calc-panel-actions">${btn('Применить горизонт','resize-years','','primary')}<span class="calc-help">Количество годовых строк будет изменено.</span></div>`:''}`)+block('Годовые потоки',`<p class="calc-help">Каждая сумма вводится в ${esc(state.meta.unit)}. Проверьте нулевые значения дополнительных статей: ноль означает отсутствие затрат, а пустое поле — отсутствие сведений. Одну затрату нельзя включать в несколько статей.</p><div class="table-wrap calc-flow-table" tabindex="0" role="region" aria-label="Ввод годовых затрат"><table><thead><tr><th>Год</th>${fields.map(([,title])=>`<th>${title}</th>`).join('')}</tr></thead><tbody>${state.lifecycle.annual.map((row,i)=>`<tr><th scope="row">${esc(row.year)}</th>${fields.map(([key,title])=>`<td>${field(`lifecycle.annual.${i}.${key}`,`${title}, год ${row.year}`,{number:true})}</td>`).join('')}</tr>`).join('')}</tbody></table></div><div class="calc-panel-actions">${btn('Повторить первый год во всех годах','repeat-year','','small')}</div>${field(p+'basis','Основание ставки, потока затрат и остаточной стоимости',{area:true})}`)+block('Как сформирован результат',result.ok?table(['Составляющая','Приведённое значение, '+state.meta.unit],[['Капитальные расходы',fmt(result.components.capital)],['Трансакционные расходы при t = 0',fmt(result.components.initialTransaction)],['Остаточные потери при t = 0',fmt(result.components.initialLoss)],['Эксплуатация',fmt(result.components.operation)],['Ремонт',fmt(result.components.repair)],['Замены',fmt(result.components.replacement)],['Трансакционные расходы',fmt(result.components.transaction)],['Остаточные потери',fmt(result.components.loss)],['Завершение использования',fmt(result.components.closure)],['Остаточная стоимость (вычет)',fmt(result.components.residual)]],'Разложение приведённых затрат')+msg('TCO по (3.9) включает капитал, эксплуатацию и ремонт. Расширенный расчёт по § 2.3 дополнительно учитывает замены, трансакционные расходы, завершение использования, остаточную стоимость и остаточные потери.'):msg('После заполнения годовых потоков здесь появится разложение результата.'));
  }
  function efficiencyView(r) {
    const e=r.efficiency,p='efficiency.';
    const output=e.ok?`<div class="calc-result"><div><span class="calc-eyebrow">ИНТЕГРАЛЬНЫЙ ПОКАЗАТЕЛЬ</span><h2>${esc(fmt(e.index,4))}<span> из 1</span></h2><p>Достижение заданных целей при выбранных шкалах и весах.</p></div><div class="calc-result-metrics">${metric(fmt(e.weightSum,4),'сумма весов')}${state.efficiency.smoothing.enabled?metric(fmt(e.smoothed,4),'сглаженный индекс'):''}</div></div>${e.admissible?msg('По введённым подтверждениям обязательные условия выполнены. Значение индекса само по себе не удостоверяет результативность или причинный эффект.'):msg(`<b>Допустимость не подтверждена.</b> ${(e.gateErrors||[]).map(esc).join(' · ')}. Высокий индекс не компенсирует обязательные ограничения.`,'pending')}`:errors(e,'Заполните показатели и задайте веса с суммой 1');
    return output+block('Показатели и шкалы',`<p class="calc-help">Границы и веса фиксируются до сравнения. Значения за границами шкалы ограничиваются диапазоном [0; 1], исходная оценка сохраняется в отчёте. Пересекающиеся показатели проверьте на повторный учёт результата.</p><div class="calc-indicators">${state.efficiency.indicators.map((item,i)=>{const base=`efficiency.indicators.${i}.`;return `<div class="calc-indicator"><div class="calc-row-heading"><h3>${esc(item.id)} · ${esc(item.name||'Новый показатель')}</h3>${btn('Удалить','remove-indicator',`data-calc-index="${i}"`,'small')}</div><div class="calc-fields calc-fields-four">${field(base+'name','Показатель')}${field(base+'unit','Единица показателя')}${num(base+'value','Фактическое значение')}${field(base+'direction','Желательное изменение',{options:[['increase','Рост'],['decrease','Снижение']]})}${num(base+'min','Нижняя граница шкалы')}${num(base+'max','Верхняя граница шкалы')}${num(base+'weight','Вес W','Неотрицательный; сумма всех весов равна 1.')}</div>${field(base+'basis','Источник, объект и период измерения',{area:true})}</div>`;}).join('')}</div><div class="calc-panel-actions">${btn('Добавить показатель','add-indicator','','small')}</div>`)+block('Обязательные условия',`<div class="calc-fields calc-fields-four">${field(p+'gates.safety','Безопасность',{options:gateOptions})}${field(p+'gates.accessibility','Доступность',{options:gateOptions})}${field(p+'gates.critical','Критические функции',{options:gateOptions})}${field(p+'gates.resources','Ресурсные ограничения',{options:gateOptions})}</div>${field(p+'basis','Основания шкал, весов и проверки требований',{area:true})}`)+block('Сглаживание и результаты',`<label class="calc-check"><input type="checkbox" data-calc-bind="efficiency.smoothing.enabled" data-focus-key="calc-smoothing" ${state.efficiency.smoothing.enabled?'checked':''}>Сгладить индекс по формуле (3.13)</label>${state.efficiency.smoothing.enabled?`<div class="calc-fields">${num(p+'smoothing.lambda','Коэффициент λE','Больше 0, не больше 1.')}${num(p+'smoothing.previous','Сглаженный индекс предыдущего периода','При первом периоде начальное значение равно его индексу.')}</div><p class="calc-help">Сравнивайте периоды с одинаковыми показателями, шкалами, весами и охватом.</p>`:''}${e.ok?table(['Показатель','Исходная нормированная оценка','Оценка в [0; 1]','Вес','Вклад в E','Ограничение'],e.rows.map((x,i)=>[x.name||x.id,fmt(x.raw,4),fmt(x.normalized,4),fmt(M.number(state.efficiency.indicators[i].weight),4),fmt(x.weighted,4),x.clipped?'Ограничено диапазоном':'Нет']),'Нормирование и вклад показателей'):''}`);
  }
  function sourcePanel() {
    return `<details class="calc-methods"><summary>Методика, источник и границы расчёта</summary><p>Д. В. Филиппов. «Адаптивно-аддитивная система управления развитием социально-инфраструктурного комплекса высшего учебного заведения». Редакция 20.10.2026. Экономический выбор — § 2.3 и § 3.4, таблица 3.18, формулы (3.14)–(3.16); TCO — (3.9); оценка результата — (3.11)–(3.13).</p><p>Калькулятор проверяет введённые ограничения и математические зависимости. Сведения о безопасности, обязательных требованиях, оценках вероятности и стоимости должны иметь самостоятельное основание. Полные календарные ограничения и причинный эффект мер автоматически не устанавливаются.</p><p>Учебные разделы платформы основаны на другой редакции; номера их формул не следует переносить в этот расчёт.</p><p class="calc-source-hash">SHA-256: ${esc(M.SOURCE.sha256||M.SOURCE.hash||'8a9b8bbd21207f64b9e016b02adfd38d894c7bab9ecb0fcd80c739701e125aa8')}</p><a class="inline-link" href="docs/CALCULATOR.md" target="_blank" rel="noopener">Описание расчётных правил и формата кейса</a></details>`;
  }
  function report(r,print=false) {
    const m=state.meta,c=r.comparison,d=r.diagnostic,l=r.lifecycle,e=r.efficiency;
    return `<article class="calc-report"><h2>${print?'Расчётный отчёт':'Результаты и исходные условия'}</h2><p class="calc-report-title">${esc(m.title)}</p><p>${esc(m.kind==='example'?'Авторский условный пример':m.kind==='edited-example'?'Изменённые условия авторского примера':'Собственный расчётный случай')} · ${esc(m.date)} · ${esc(m.unit)}</p>${table(['Поле','Значение'],[['Объект и границы',m.object||'Не указаны'],['Требуемый результат',m.result||'Не указан'],['Ответственный',m.owner||'Не указан'],['Базовая дата и цены',m.priceDate||'Не указаны'],['Основания',m.basis||'Не указаны'],['Дополнительные условия',m.notes||'Не указаны']],'Паспорт расчёта')}<h3>Выбор способа исполнения</h3><p>Критерий: ${esc(criterionName(state.economy.decision.criterion))}. p = ${esc(String(state.economy.decision.p||state.economy.decision.p===0?state.economy.decision.p:'не задана'))}. Интервал: [${esc(state.economy.decision.pLow)}; ${esc(state.economy.decision.pHigh)}].</p>${comparisonSummary(c)}${comparisonTable(c)}<h3>Заданные ограничения</h3>${table(['Выплаты, '+m.unit,'Труд, ч','Срок, ч','Повторная работа, доля'],[[state.economy.limits.cash,state.economy.limits.labor,state.economy.limits.hours,state.economy.limits.repeat]],'Лимиты')}<h3>Входы по альтернативам</h3>${table(['Вариант','Обычный / напряжённый режим','Макс. выплаты','Макс. труд','Макс. срок','Макс. повторяемость'],state.economy.alternatives.map((a,i)=>[a.id,(c.rows?.[i]?.costs||[]).map(x=>fmt(x)).join(' / '),a.costMode==='total'?a.cashMax:fmt(c.rows?.[i]?.cashMax),a.laborMax,a.hoursMax===''||a.hoursMax===null?(a.sourceRef?'Не раскрыт в источнике':'Не задан'):a.hoursMax,a.repeatMax===''||a.repeatMax===null?(a.sourceRef?'Не раскрыта в источнике':'Не задана'):a.repeatMax]),'Затраты и ресурсы вариантов')}${table(['Вариант','Приёмка / безопасность / доступность / критические функции / готовность','Основания'],state.economy.alternatives.map(a=>[a.id,[a.acceptance,a.safety,a.accessibility,a.critical,a.readiness].map(v=>({yes:'Выполнено',no:'Нарушено',unknown:'Не проверено'})[v]||v).join(' / '),[a.sourceRef,a.evidence].filter(Boolean).join('; ')||'Не указаны']),'Подтверждения допуска')}<h3>Дополнительная диагностика</h3>${d.ok?table(['Показатель','Значение'],[['Фиксированный выбор',labelIds(d.baseline?.ids)],['Стоимость фиксированного выбора',fmt(d.baseline?.cost)],['Валовая ценность информации',fmt(d.gross)],['Выигрыш реализуемой стратегии до доп. расходов',fmt(d.feasibleGross)],['Стоимость стратегии',fmt(d.cost)],['Чистая экономия',fmt(d.net)],['Ценность совершенной информации',fmt(d.perfect)],['Набор действий изменился',d.restricted?'Да':'Нет']],'Эффект диагностики'):errors(d,'Диагностика не рассчитана')}${table(['Параметр','Значение'],Object.entries(state.economy.diagnostic).map(([k,v])=>[({sensitivity:'Чувствительность',specificity:'Специфичность',price:'Цена',labor:'Труд, ч',delay:'Задержка, ч',waitingCost:'Потери от ожидания',transitionCost:'Выплаты при переходе'})[k]||k,v]),'Условия диагностики')}<h3>Стоимость жизненного цикла</h3>${l.ok?`<p>T = ${esc(state.lifecycle.horizon)} лет; d = ${esc(state.lifecycle.rate)}. ${esc(state.lifecycle.basis)}</p>${table(['TCO (3.9)','Приведённые затраты без потерь пользователей','Полная приведённая стоимость'],[[fmt(l.tco),fmt(l.monetary),fmt(l.full)]],'Стоимость жизненного цикла')}${table(['Начальная / конечная статья','Сумма'],[['Капитал при t = 0',state.lifecycle.capital],['Трансакционные расходы при t = 0',state.lifecycle.initialTransaction],['Потери при t = 0',state.lifecycle.initialLoss],['Завершение в год T',state.lifecycle.closure],['Остаточная стоимость в год T (вычет)',state.lifecycle.residual]],'Начальные и конечные затраты')}${table(['Год','Эксплуатация','Ремонт','Замены','Трансакционные','Потери','Коэффициент','Приведённая сумма'],l.rows.map(row=>[row.year,fmt(row.operation),fmt(row.repair),fmt(row.replacement),fmt(row.transaction),fmt(row.loss),fmt(row.factor,6),fmt(row.pvFull)]),'Годовые затраты и дисконтирование')}`:'<p>Не рассчитана: требуется полный годовой поток.</p>'}<h3>Оценка результата</h3>${e.ok?`<p>E = ${fmt(e.index,4)}; сумма весов = ${fmt(e.weightSum,4)}${state.efficiency.smoothing.enabled?`; сглаженный индекс = ${fmt(e.smoothed,4)}`:''}. Обязательные условия: ${e.admissible?'подтверждены введёнными сведениями':'не подтверждены'}.</p>${table(['Показатель','Значение','Шкала','Вес','Нормированная оценка','Вклад'],e.rows.map((x,i)=>{const v=state.efficiency.indicators[i];return [v.name||v.id,v.value+' '+v.unit,`[${v.min}; ${v.max}], ${v.direction==='increase'?'рост':'снижение'}`,v.weight,fmt(x.normalized,4),fmt(x.weighted,4)];}),'Вклад показателей')}`:'<p>Не рассчитана: нужны значения, шкалы и корректные веса.</p>'}<p class="calc-help">Источник: Д. В. Филиппов, редакция диссертации 20.10.2026; § 2.3, § 3.4, формулы (3.9), (3.11)–(3.16), таблица 3.18.</p><p class="calc-help">Результат условен относительно введённых данных. Для воспроизводимости сохраните JSON: он содержит полный набор входов, единицы, основания, версию источника и пересчитанные результаты.</p>${sourcePanel()}</article>`;
  }
  function render() {
    const r=calculate(),kind={example:'Условия автора',own:'Собственный кейс','edited-example':'Изменённый пример'}[state.meta.kind];
    return `<div class="calc-shell"><div class="calc-interactive"><div class="intro calc-intro"><div class="calc-kicker">ОТ МЕТОДИКИ К РЕШЕНИЮ</div><h1>Прикладной калькулятор</h1><p>Сопоставьте способы исполнения на своих данных. Проверьте ограничения, стоимость решения и ценность дополнительной информации.</p><div class="intro-meta"><span class="badge ${state.meta.kind==='own'?'project':'example'}">${esc(kind)}</span><span class="source">Диссертация · редакция 20.10.2026</span></div></div><div class="calc-toolbar">${btn('Новый кейс','new','','primary')}${btn('Пример из диссертации','demo')}${btn('Сохранить JSON','export-json')}${btn('Загрузить JSON','import')}<input id="calc-import-file" type="file" accept=".json,application/json" hidden data-calc-import></div><div class="calc-save-status" role="status">${storageError?esc(storageError):lastSaved?'Изменения сохранены в этом браузере. JSON позволяет перенести кейс.':'Кейс сохраняется в этом браузере. Для переноса используйте JSON.'}</div>${notice?msg(esc(notice)):''}${passport()}<nav class="calc-tabs" aria-label="Разделы калькулятора">${tabs.map(([id,label])=>`<button class="${activeTab===id?'active':''}" data-calc-action="tab" data-calc-tab="${id}" ${activeTab===id?'aria-current="page"':''}>${label}</button>`).join('')}</nav><div id="calc-active-panel">${activeTab==='comparison'?comparisonView(r):activeTab==='lifecycle'?lifecycleView(r):activeTab==='efficiency'?efficiencyView(r):`<div class="calc-toolbar">${btn('Скачать таблицы CSV','export-csv','','primary')}${btn('Печать / PDF','print')}${btn('Сохранить полный кейс JSON','export-json')}</div>${report(r)}`}</div>${activeTab==='report'?'':sourcePanel()}</div><div id="calculator-print">${report(r,true)}</div></div>`;
  }
  function textValue(v,max=8000) { return ['string','number'].includes(typeof v)&&String(v).length<=max ? v : (()=>{throw Error('Недопустимое поле или слишком длинное значение');})(); }
  function normalizeImport(payload) {
    if(!payload || payload.format!==FORMAT || payload.schemaVersion!==1 || !payload.case) throw Error('Ожидается JSON-кейс Campus Management Lab, версия схемы 1.');
    if(payload.source?.sha256!==M.SOURCE.sha256) throw Error('Версия исходной диссертации не совпадает с редакцией калькулятора.');
    const input=payload.case,out=fresh(false);
    if(!input.meta||!input.economy||!input.lifecycle||!input.efficiency) throw Error('Не хватает обязательных разделов кейса.');
    function fields(target,source,keys) { if(!source||typeof source!=='object'||Array.isArray(source)) throw Error('Неверная структура раздела.'); for(const key of keys) { if(!Object.prototype.hasOwnProperty.call(source,key)) throw Error('В JSON отсутствует обязательное поле: '+key); target[key]=textValue(source[key]); } }
    fields(out.meta,input.meta,Object.keys(out.meta));
    for(const key of Object.keys(out.meta)) out.meta[key]=String(out.meta[key]);
    if(!['own','example','edited-example'].includes(out.meta.kind)) out.meta.kind='own';
    fields(out.economy.limits,input.economy.limits,Object.keys(out.economy.limits));
    fields(out.economy.decision,input.economy.decision,Object.keys(out.economy.decision));
    fields(out.economy.diagnostic,input.economy.diagnostic,Object.keys(out.economy.diagnostic));
    if(!Array.isArray(input.economy.alternatives)||input.economy.alternatives.length<1||input.economy.alternatives.length>20) throw Error('Кейс должен содержать от 1 до 20 вариантов.');
    out.economy.alternatives=input.economy.alternatives.map((a,i)=>{const v={...M.blankAlternative(String(i+1)),evidence:''};fields(v,a,Object.keys(v));for(const key of ['id','name','costMode','acceptance','safety','accessibility','critical','readiness','sourceRef','evidence'])v[key]=String(v[key]);return v;});
    fields(out.lifecycle,input.lifecycle,['horizon','rate','capital','initialTransaction','initialLoss','closure','residual','basis']);
    if(!Array.isArray(input.lifecycle.annual)||input.lifecycle.annual.length>50) throw Error('В годовом потоке допускается не более 50 строк.');
    out.lifecycle.annual=input.lifecycle.annual.map((a,i)=>{const v=annual(i+1);fields(v,a,Object.keys(v));return v;});
    if(!Array.isArray(input.efficiency.indicators)||input.efficiency.indicators.length>50) throw Error('Допускается не более 50 показателей.');
    out.efficiency.indicators=input.efficiency.indicators.map((a,i)=>{const v=blankIndicator('K'+(i+1));fields(v,a,Object.keys(v));return v;});
    fields(out.efficiency.gates,input.efficiency.gates,Object.keys(out.efficiency.gates));
    fields(out.efficiency.smoothing,input.efficiency.smoothing,['lambda','previous']);
    if(typeof input.efficiency.smoothing.enabled!=='boolean') throw Error('Неверный флаг сглаживания.');
    out.efficiency.smoothing.enabled=input.efficiency.smoothing.enabled;
    if(input.efficiency.basis!==undefined) out.efficiency.basis=textValue(input.efficiency.basis);
    return out;
  }
  async function importFile(file) {
    if(!file) return;
    try {
      if(file.size>512*1024) throw Error('Файл превышает 512 КБ.');
      const imported=normalizeImport(JSON.parse(await file.text()));
      state=imported;detailEpoch++;activeTab='comparison';save();announce('Кейс загружен. Результаты пересчитаны по входным данным.');redraw();
    } catch(e) { announce('Кейс не загружен: '+e.message);redraw(); }
  }
  function fileName(extension) { return 'campus-case-'+String(state.meta.date||new Date().toISOString().slice(0,10)).replace(/[^0-9-]/g,'')+'.'+extension; }
  function exportJSON() { U.download(fileName('json'),JSON.stringify({format:FORMAT,schemaVersion:1,source:M.SOURCE,exportedAt:new Date().toISOString().slice(0,19)+'Z',case:state,results:calculate()},null,2),'application/json');announce('Полный кейс с исходными данными выгружен в JSON.'); }
  function exportCSV() {
    const r=calculate(),rows=[['Раздел','Объект','Показатель','Значение','Единица / основание']];
    Object.entries(state.meta).forEach(([key,value])=>rows.push(['Паспорт',state.meta.title,key,value,'']));
    function flatten(obj,path) { for(const [key,value] of Object.entries(obj||{})) { const name=path?path+'.'+key:key; if(value&&typeof value==='object') flatten(value,name); else rows.push(['Исходные данные',state.meta.title,name,value??'Нет данных','Схема JSON v1']); } }
    flatten({economy:state.economy,lifecycle:state.lifecycle,efficiency:state.efficiency},'');
    (r.comparison.rows||[]).forEach(v=>{for(const key of ['status','expected','worst','regret','cashMax','laborMax','score']) rows.push(['Сравнение',v.id,key,Number.isFinite(v[key])?v[key]:typeof v[key]==='string'?v[key]:'Не рассчитано',key==='status'?'':key==='laborMax'?'ч':state.meta.unit]);rows.push(['Допуск',v.id,'Причины',[...(v.errors||[]),...(v.missing||[])].join('; '),'']);});
    for(const [section,keys] of [['diagnostic',['gross','feasibleGross','net','conditional','cost','perfect']],['lifecycle',['tco','monetary','full']],['efficiency',['index','smoothed','weightSum','admissible']]]) for(const key of keys) rows.push([({diagnostic:'Диагностика',lifecycle:'Жизненный цикл',efficiency:'Оценка результата'})[section],state.meta.title,({gross:'Валовая ценность информации',feasibleGross:'Выигрыш реализуемой стратегии до доп. расходов',net:'Чистая экономия',conditional:'Стоимость после сигнала до доп. расходов',cost:'Стоимость стратегии',perfect:'Ценность совершенной информации',tco:'Укрупнённый TCO (3.9)',monetary:'Приведённые затраты без потерь пользователей',full:'Полная приведённая стоимость',index:'Индекс E',smoothed:'Сглаженный индекс',weightSum:'Сумма весов',admissible:'Обязательный допуск'})[key]||key,r[section]?.[key]??'Не рассчитано',section==='efficiency'?'Безразмерно':state.meta.unit]);
    rows.push(['Источник','Диссертация','Редакция','20.10.2026',M.SOURCE.sha256||M.SOURCE.hash||'']);
    const cell=v=>{let s=String(v??'');if(typeof v==='string'&&/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
    U.download(fileName('csv'),'\uFEFF'+rows.map(row=>row.map(cell).join(';')).join('\r\n'),'text/csv;charset=utf-8');announce('Исходные данные и результаты выгружены в CSV.');
  }
  function handleInput(event) {
    const el=event.target;
    if(el.matches?.('[data-calc-import]')) { if(event.type==='change') importFile(el.files?.[0]);return true; }
    const path=el.dataset?.calcBind;if(!path) return false;
    if(el.tagName==='SELECT'&&event.type==='input'||el.type==='checkbox'&&event.type==='input') return true;
    set(path,el.type==='checkbox'?el.checked:el.value);
    if(state.meta.kind==='example')state.meta.kind='edited-example';
    notice='';save();clearTimeout(timer);timer=setTimeout(redraw,el.tagName==='SELECT'||el.type==='checkbox'?0:350);return true;
  }
  function handleAction(event) {
    const el=event.target.closest?.('[data-calc-action]');if(!el)return false;
    const action=el.dataset.calcAction;clearTimeout(timer);
    if(action==='tab') {activeTab=el.dataset.calcTab;notice='';redraw();return true;}
    if(action==='import') {document.getElementById('calc-import-file').click();return true;}
    if(action==='export-json') {exportJSON();redraw();return true;}
    if(action==='export-csv') {exportCSV();redraw();return true;}
    if(action==='print') {window.print();return true;}
    if(action==='new'||action==='demo') {
      if(state.meta.kind!=='example'&&!confirm('Заменить текущий кейс? Для сохранения текущей версии сначала выгрузите JSON.'))return true;
      state=fresh(action==='demo');detailEpoch++;activeTab='comparison';announce(action==='demo'?'Загружены точные условия авторского расчётного примера.':'Создан пустой кейс. Задайте свои данные и подтверждения.');
    } else if(action==='add-alt') {
      if(state.economy.alternatives.length>=20){announce('Допускается не более 20 вариантов.');redraw();return true;}
      const ids=new Set(state.economy.alternatives.map(a=>a.id));let id=1;while(ids.has('V'+id))id++;
      state.economy.alternatives.push({...M.blankAlternative('V'+id),evidence:''});announce('Добавлен новый вариант.');
    } else if(action==='remove-alt') {
      if(state.economy.alternatives.length<=1){announce('Для расчёта нужен хотя бы один вариант.');redraw();return true;}
      state.economy.alternatives.splice(+el.dataset.calcIndex,1);
    } else if(action==='resize-years') {
      const n=M.number(state.lifecycle.horizon);if(!Number.isInteger(n)||n<1||n>50){announce('Горизонт должен быть целым числом от 1 до 50.');redraw();return true;}
      state.lifecycle.annual=Array.from({length:n},(_,i)=>state.lifecycle.annual[i]||annual(i+1));
    } else if(action==='repeat-year') {
      const first=state.lifecycle.annual[0];if(first)state.lifecycle.annual=state.lifecycle.annual.map(row=>({...copy(first),year:row.year}));announce('Потоки первого года повторены на всём горизонте.');
    } else if(action==='add-indicator') {
      if(state.efficiency.indicators.length>=50){announce('Допускается не более 50 показателей.');redraw();return true;}
      const ids=new Set(state.efficiency.indicators.map(a=>a.id));let n=1;while(ids.has('K'+n))n++;
      state.efficiency.indicators.push(blankIndicator('K'+n));
    } else if(action==='remove-indicator') {
      if(state.efficiency.indicators.length<=1){announce('Для индекса нужен хотя бы один показатель.');redraw();return true;}
      state.efficiency.indicators.splice(+el.dataset.calcIndex,1);
    }
    if(!['new','demo'].includes(action)&&state.meta.kind==='example')state.meta.kind='edited-example';
    save();redraw();return true;
  }
  function init(callbacks) {
    hooks=callbacks;
    try { const saved=localStorage.getItem(KEY);if(saved){state=normalizeImport(JSON.parse(saved));lastSaved=new Date();} }
    catch(_) {storageError='Сохранённый кейс не удалось прочитать. Открыт авторский пример; используйте JSON-копию для восстановления.';}
    // Evidence fields are user annotations, never an alternative source of numerical facts.
    state.economy.alternatives.forEach(a=>{if(a.evidence===undefined)a.evidence='';});
  }
  g.CampusCalculator={init,render,handleInput,handleAction};
})(window);
