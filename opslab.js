/* Ops Lab: interface for the factory simulation. The engine lives in opslab-engine.js. */
(function () {
  'use strict';
  const S = window.SimLab, OE = window.OpsLabEngine;
  if (!S || !OE) return;
  const { UI, N, U } = S;
  const esc = U.esc, clamp = U.clamp, sum = U.sum, avg = U.avg, clone = U.clone;
  const ST = OE.STATIONS, C = OE.CONTRACTS;
  const guided = g => g.cfg.difficulty !== 'expert';
  const kUSD = v => (v < 0 ? N.MINUS + '⁠' : '') + '$' + N.int(Math.abs(v) / 1000) + 'k';
  const mUSD = v => N.m(v / 1e6, 2);
  const money = v => (Math.abs(v) >= 1e6 ? mUSD(v) : kUSD(v));
  const days1 = v => (v == null ? '–' : N.num(v, 2) + ' d');
  const hrs = v => N.num(v, 1) + ' h';
  const STEP_NAMES = ['', 'Assembly', 'First test', 'Calibration', 'Final test'];
  const PRIO = { fifo: 'First in, first out', test: 'First tests first', final: 'Final tests first' };
  const uiStr = (ctx, k, d) => (ctx.ui[k] == null || ctx.ui[k] === '' ? d : ctx.ui[k]);
  const last = (g, n) => g.days.slice(-n);
  const mean = (arr, f) => { const v = arr.map(f).filter(x => x != null && isFinite(x)); return v.length ? avg(v) : null; };
  const net = g => g.cash - g.loan;
  const mAxis = v => (v < 0 ? N.MINUS : '') + '$' + Math.abs(Math.round(v * 10) / 10) + 'M';

  /* ---------- Derived views of the draft ---------- */
  function capTable(g, set) {
    const lots = +set.lot, L = OE.stationLoad(lots), cap = OE.capacity(set.m, lots);
    const now = OE.demandRate(g, 7), d = OE.day(g), f30 = OE.lambda(g, Math.min(OE.END_DAY - 1, d + 30));
    return ST.map((st, s) => ({ s, name: st.name, m: set.m[s], load: L[s], cap: cap[s], uNow: now / cap[s], uF: f30 / cap[s] }));
  }
  function utilTone(u) { return u >= 0.9 ? 'hot' : u >= 0.75 ? 'warm' : 'ok'; }
  function costLine(g, set, loan) {
    const c = OE.purchaseCost(g, set);
    const after = g.cash + (loan > 0 ? Math.min(loan, OE.LOAN_MAX - g.loan) : 0) - c - (loan < 0 ? Math.min(-loan, g.loan) : 0);
    return { c, after };
  }

  /* ---------- Header and flow ---------- */
  function header(g, done) {
    const D = last(g, 7), d = OE.day(g);
    const lt = mean(D, x => x.lt), rj = mean(D, x => x.revJob), arr = mean(D, x => x.arr);
    const phase = done ? `Final results · day ${OE.END_DAY}` : d >= OE.CONTROL_END ? `Day ${d} · autopilot phase` : `Day ${d} of ${OE.END_DAY} · you control until day ${OE.CONTROL_END}`;
    return `<section class="sheet hdr"><div class="hdr-top"><div class="sh"><span class="eyebrow">${phase}</span><h2>Kestrel Labs</h2></div><div class="hdr-pills">${UI.level(g.cfg.difficulty)}${UI.pill(C[g.set.contract].name + ' contract', 'pen')}</div></div>${UI.kpis([
      { k: 'Cash', v: money(g.cash), d: g.loan > 0 ? 'loan ' + kUSD(g.loan) : '' },
      { k: 'Orders a day', v: arr == null ? '–' : N.num(arr, 1), d: 'last 7 days' },
      { k: 'Lead time', v: days1(lt), d: `quote ${C[g.set.contract].quote} d`, cls: lt != null && lt > C[g.set.contract].quote ? 'down' : '' },
      { k: 'Revenue per order', v: rj == null ? '–' : N.usd(rj), d: `full price ${N.usd(C[g.set.contract].full)}`, cls: rj != null && rj < C[g.set.contract].full * 0.98 ? 'down' : '' }
    ])}</section>`;
  }
  function flow(g) {
    const D = last(g, 7), today = g.days[g.days.length - 1] || {};
    const u = s => mean(D, x => x.util[s]) || 0;
    const node = (title, sub, body, tone) => `<div class="fnode ${tone || ''}"><span class="fn-t">${title}</span>${sub ? `<span class="fn-s">${sub}</span>` : ''}${body || ''}</div>`;
    const meterRow = s => `<div class="fn-m"><span class="track"><span class="fill ${utilTone(u(s))}" style="width:${(clamp(u(s), 0, 1) * 100).toFixed(0)}%"></span></span><span class="num">${N.pct(u(s))}</span></div>`;
    const q = today.q || [0, 0, 0, 0];
    return `<div class="flow" aria-label="Process flow">${[
      node('Orders in', `${N.num(mean(D, x => x.arr) || 0, 1)} a day`, `<span class="fn-q num">${today.waitKits ? `${today.waitKits} waiting for kits` : 'none waiting for kits'}</span>`, today.waitKits ? 'warn' : ''),
      node('Kits', `${N.int(g.kits)} on hand`, `<span class="fn-q num">${N.int(sum(g.onOrder.map(o => o.qty)))} on order</span>`, g.kits === 0 ? 'warn' : ''),
      node(`1 · Assembly × ${g.set.m[0]}`, `${q[0]} job${q[0] === 1 ? '' : 's'} queued`, meterRow(0), utilTone(u(0))),
      node(`2 · First test × ${g.set.m[1]}`, `${q[1]} job${q[1] === 1 ? '' : 's'} queued`, meterRow(1), utilTone(u(1))),
      node(`3 · Calibration × ${g.set.m[2]}`, `${q[2]} job${q[2] === 1 ? '' : 's'} queued`, meterRow(2), utilTone(u(2))),
      node('4 · Final test', `${q[3]} job${q[3] === 1 ? '' : 's'} queued`, '<span class="fn-q">same testing machines</span>', ''),
      node('Shipped', `${N.num(mean(D, x => x.done) || 0, 1)} a day`, `<span class="fn-q num">lead time ${days1(mean(D, x => x.lt))}</span>`, '')
    ].join('<span class="farr" aria-hidden="true">→</span>')}</div><p class="cap">Queues at the end of day ${today.d != null ? today.d : OE.day(g) - 1}; utilisation over the last 7 days. Testing machines handle both the first and the final test.</p>`;
  }

  /* ---------- Plant tab ---------- */
  function plantView(g, ctx) {
    const d = g.draft, set = d.set, D = OE.day(g), auto = D >= OE.CONTROL_END;
    let h = '';
    if (D === OE.START_DAY && !g.log.some(l => l.kind === 'set')) h += caseBrief(true);
    h += UI.sheet('The plant', auto ? 'Final settings run the last 60 days' : 'Where the work is', flow(g));
    h += UI.sheet('Capacity check', guided(g) ? 'Capacity against demand' : 'Station load', `<div data-live="op-cap">${capHtml(g, set)}</div>`);
    const mach = `<div class="pgrid">${ST.map((st, s) => `<div class="fbox"><span class="lbl">${st.short} machines</span>${UI.num(`m:${s}`, set.m[s], { min: 1, max: 8, step: 1, dec: 0, label: st.name + ' machines' })}<span class="hint" data-live="op-m${s}">${machHint(g, set, s)}</span></div>`).join('')}</div>`;
    const contractChips = UI.chips('contract', 'Contract for new orders', Object.keys(C).map(k => ({ v: k, t: `${C[k].name}`, s: `${N.usd(C[k].full)} within ${C[k].quote} d · $0 after ${C[k].zero} d` })), set.contract);
    const lotChips = UI.chips('lot', 'Lot size', OE.LOTS.map(L => ({ v: L, t: L === 1 ? 'Whole order' : `${L} lots`, s: `${OE.UNITS / L} units each` })), set.lot);
    const prioChips = UI.chips('prio', 'Testing priority', Object.keys(PRIO).map(k => ({ v: k, t: PRIO[k] })), set.prio);
    h += UI.sheet(auto ? 'Final settings' : `Decisions · day ${D}`, auto ? 'Set the autopilot' : 'Change the plant', `<div class="fields">${mach}${contractChips}${lotChips}${prioChips}<div class="pgrid">${
      `<div class="fbox"><span class="lbl">Reorder point (kits)</span>${UI.num('rop', set.rop, { min: 0, max: 2000, step: 5, dec: 0, label: 'Reorder point' })}</div>`}${
      `<div class="fbox"><span class="lbl">Order quantity (kits)</span>${UI.num('q', set.q, { min: 0, max: 3000, step: 10, dec: 0, label: 'Order quantity' })}</div>`}</div><p class="hint" data-live="op-kits">${kitHint(g, set)}</p>${
      UI.field(`Loan · balance ${kUSD(g.loan)}`, UI.num('loan', d.loan, { min: -Math.round(g.loan / 1000) * 1000, max: OE.LOAN_MAX - g.loan, step: 10000, dec: 0, label: 'Borrow (positive) or repay (negative)' }), loanHint(g, d.loan), 'op-loan')}</div><div class="summary" data-live="op-sum">${sumLine(g)}</div>`);
    h += runControls(g, auto);
    return h;
  }
  function capHtml(g, set) {
    const rows = capTable(g, set), gd = guided(g), fc = S.lvlOf(g) === 0;
    const now = OE.demandRate(g, 7), f30 = OE.lambda(g, Math.min(OE.END_DAY - 1, OE.day(g) + 30));
    const head = gd ? ['Station', 'Mach.', 'Max a day', 'Use now'].concat(fc ? ['In 30 d'] : []).concat(['Hours/order']) : ['Station', 'Mach.', 'Max a day', 'Hours/order'];
    const body = rows.map(r => {
      const cells = [ST[r.s].short, String(r.m), N.num(r.cap, 1)];
      if (gd) cells.push(`<span class="${r.uNow >= 0.9 ? 'down' : ''}">${N.pct(r.uNow)}</span>`);
      if (fc) cells.push(`<span class="${r.uF >= 0.9 ? 'down' : ''}">${N.pct(r.uF)}</span>`);
      cells.push(N.num(r.load, 2));
      return cells;
    });
    const bott = rows.reduce((a, b) => (b.cap < a.cap ? b : a));
    return UI.table(head, body, { sticky: true }) + `<p class="cap">Hours per order include setups for your lot size. Demand is running at ${N.num(now, 1)} orders a day${fc ? `; market research expects about ${N.num(f30, 1)} a day in 30 days` : ''}. ${bott.name} limits output to ${N.num(bott.cap, 1)} orders a day.${fc ? ' Queues grow sharply once any station passes about 85% use.' : ''}</p>`;
  }
  function machHint(g, set, s) {
    const cur = g.set.m[s], w = clamp(Math.round(+set.m[s] || 1), 1, 8);
    if (w > cur) return `Buy ${w - cur} at ${kUSD(ST[s].buy)} each: ${kUSD((w - cur) * ST[s].buy)}`;
    if (w < cur) return `Retire ${cur - w}: returns ${kUSD((cur - w) * OE.RETIRE)}`;
    return `${kUSD(ST[s].buy)} to buy, ${kUSD(OE.RETIRE)} back if retired`;
  }
  function kitHint(g, set) {
    const rate = Math.max(0.1, OE.demandRate(g, 7));
    const cost = (+set.q || 0) * OE.KIT_COST + OE.KIT_FEE;
    return `At ${N.num(rate, 1)} orders a day, the reorder point covers ${N.num((+set.rop || 0) / rate, 1)} days (supplier lead time ${OE.KIT_LEAD} days) and each order lasts ${N.num((+set.q || 0) / rate, 1)} days. An order costs ${kUSD(cost)} (${N.usd(OE.KIT_COST)} a kit plus ${N.usd(OE.KIT_FEE)}). On hand ${N.int(g.kits)}, on order ${N.int(sum(g.onOrder.map(o => o.qty)))}.`;
  }
  function loanHint(g, v) {
    v = +v || 0;
    if (v > 0) return `Borrow ${kUSD(Math.min(v, OE.LOAN_MAX - g.loan))} at 20% a year. Cash earns 10%.`;
    if (v < 0) return `Repay ${kUSD(Math.min(-v, g.loan))}.`;
    return `Borrow up to ${kUSD(OE.LOAN_MAX - g.loan)} more at 20% a year; cash earns 10%.`;
  }
  function sumLine(g) {
    const d = g.draft, cl = costLine(g, d.set, +d.loan || 0);
    return `Machine changes ${cl.c > 0 ? kUSD(-cl.c) : cl.c < 0 ? '+' + kUSD(-cl.c) : '$0k'} · cash after <strong class="num${cl.after < 0 ? ' down' : ''}">${kUSD(cl.after)}</strong>${cl.after < 0 ? ' <span class="pill bad">Not enough cash: borrow or buy less</span>' : ''}`;
  }
  function runControls(g, auto) {
    const D = OE.day(g), left = OE.CONTROL_END - D;
    const btn = (days, label, primary) => `<button type="button" class="btn ${primary ? 'btn-primary' : 'btn-ghost'}" data-act="m" data-op="run" data-days="${days}">${label}</button>`;
    if (auto) return `<section class="sheet submit"><p class="case">From day ${OE.CONTROL_END} the plant runs on its own until day ${OE.END_DAY} with the settings above, while you move to a new plant. Demand is falling: plan capacity, kits and the contract for that.</p>${btn(OE.END_DAY - D, `Run the final ${OE.END_DAY - D} days`, true)}</section>`;
    return `<section class="sheet submit"><span class="eyebrow">Run the clock</span><p class="cap">Your changes apply now, then the plant runs. ${left} day${left === 1 ? '' : 's'} left before autopilot.</p><div class="actions run">${btn(1, 'Run 1 day')}${btn(Math.min(7, left), `Run ${Math.min(7, left)} days`, true)}${left > 7 ? btn(Math.min(30, left), `Run ${Math.min(30, left)} days`) : ''}${left > 30 ? btn(left, `Run to day ${OE.CONTROL_END}`) : ''}</div></section>`;
  }
  function caseBrief(open) {
    return UI.brief('Kestrel Labs', open, `<p>You have just taken over <strong>Kestrel Labs</strong>, a contract factory that builds flight-control sensor boards for drone makers. Each customer order is a batch of 60 boards and needs one parts kit.</p><p>Every order follows four steps on three kinds of machine: <strong>assembly</strong>, a <strong>first test</strong>, <strong>calibration</strong>, then a <strong>final test</strong> back on the testing machines. The plant has one machine of each kind, and calibration is already struggling.</p><p>You take over on day 60 and run the plant until day 240. Then you move on, and the plant runs by itself until day 300 with whatever settings you leave behind. Market research expects demand to keep growing until about day 150, hold steady until about day 220, then fall away as customers switch to a new product.</p><p>Your score is the cash you leave at day 300, net of any loan, against two benchmarks: the plant left exactly as you found it, and a disciplined planner.</p>`, 'Find the bottleneck before the queue finds you.');
  }

  /* ---------- Data tab ---------- */
  const METRICS = [
    { v: 'orders', t: 'Orders' }, { v: 'lead', t: 'Lead time' }, { v: 'rev', t: 'Revenue per order' }, { v: 'queues', t: 'Queues' },
    { v: 'util', t: 'Utilisation' }, { v: 'kits', t: 'Kits' }, { v: 'cash', t: 'Cash' }, { v: 'wip', t: 'Work in process' }
  ];
  const ma = (arr, n) => arr.map((v, i) => { const w = arr.slice(Math.max(0, i - n + 1), i + 1).filter(x => x != null); return w.length ? avg(w) : null; });
  function dataSpec(g, m) {
    const D = g.days, X = i => 'D' + D[i].d, band = [{ from: 0, to: Math.min(D.length - 1, OE.START_DAY - 1), c: 'var(--ink-3)' }];
    const line = (vals, c, w, dash) => ({ values: vals, c, w: w || 2, noDot: true, dash });
    if (m === 'orders') { const a = D.map(x => x.arr), b = D.map(x => x.done); return { series: [line(a, 'var(--s5)', 1), line(ma(a, 7), 'var(--s1)', 2.5), line(ma(b, 7), 'var(--s3)', 2.5)], xLabel: X, yMin: 0, bands: band }; }
    if (m === 'lead') { const a = D.map(x => x.lt); const quotes = Array.from(new Set(D.map(x => x.contract))); return { series: [line(a, 'var(--s5)', 1), line(ma(a, 7), 'var(--s1)', 2.5)], xLabel: X, yMin: 0, refs: quotes.map(k => ({ y: C[k].quote, label: `${C[k].name} quote`, c: 'var(--s2)' })), bands: band, yFmt: v => v + 'd' }; }
    if (m === 'rev') { const a = D.map(x => x.revJob); return { series: [line(a, 'var(--s5)', 1), line(ma(a, 7), 'var(--s1)', 2.5)], xLabel: X, yMin: 0, bands: band, yFmt: v => '$' + v }; }
    if (m === 'queues') return { series: [0, 1, 2, 3].map(k => line(D.map(x => x.q[k]), ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)'][k], 2)), xLabel: X, yMin: 0, bands: band };
    if (m === 'util') return { series: [0, 1, 2].map(s => line(ma(D.map(x => x.util[s] * 100), 3), ['var(--s1)', 'var(--s2)', 'var(--s3)'][s], 2)), xLabel: X, yMin: 0, yMax: 100, refs: [{ y: 85, label: '85%', c: 'var(--bad)' }], bands: band, yFmt: v => v + '%' };
    if (m === 'kits') return { series: [line(D.map(x => x.kits), 'var(--s1)', 2), line(D.map(x => x.onOrder), 'var(--s5)', 1.5, true), line(D.map(x => x.waitKits), 'var(--bad)', 2)], xLabel: X, yMin: 0, bands: band };
    if (m === 'cash') return { series: [line(D.map(x => (x.cash - x.loan) / 1e6), 'var(--s1)', 2.5), line(D.map(x => x.loan / 1e6), 'var(--s2)', 1.5, true)], xLabel: X, bands: band, yFmt: mAxis };
    return { series: [line(D.map(x => x.wip), 'var(--s1)', 2.5)], xLabel: X, yMin: 0, bands: band };
  }
  const LEG = {
    orders: [{ t: 'Orders arriving (daily)', c: 'var(--s5)' }, { t: '7-day average', c: 'var(--s1)' }, { t: 'Orders shipped, 7-day average', c: 'var(--s3)' }],
    lead: [{ t: 'Average lead time (daily)', c: 'var(--s5)' }, { t: '7-day average', c: 'var(--s1)' }, { t: 'Contract quote', c: 'var(--s2)' }],
    rev: [{ t: 'Revenue per order shipped (daily)', c: 'var(--s5)' }, { t: '7-day average', c: 'var(--s1)' }],
    queues: [{ t: 'Assembly', c: 'var(--s1)' }, { t: 'First test', c: 'var(--s2)' }, { t: 'Calibration', c: 'var(--s3)' }, { t: 'Final test', c: 'var(--s4)' }],
    util: [{ t: 'Assembly', c: 'var(--s1)' }, { t: 'Testing', c: 'var(--s2)' }, { t: 'Calibration', c: 'var(--s3)' }],
    kits: [{ t: 'Kits on hand', c: 'var(--s1)' }, { t: 'Kits on order', c: 'var(--s5)' }, { t: 'Orders waiting for kits', c: 'var(--bad)' }],
    cash: [{ t: 'Cash net of loan', c: 'var(--s1)' }, { t: 'Loan balance', c: 'var(--s2)' }],
    wip: [{ t: 'Orders in the plant, end of day', c: 'var(--s1)' }]
  };
  function dataView(g, ctx) {
    const m = uiStr(ctx, 'metric', 'orders');
    let h = UI.sheet('Plant data', 'Daily history', UI.tabs('metric', METRICS, m, 'seg-tabs') + UI.chart('op-data', () => dataSpec(g, m), 260, LEG[m], 'Daily plant data') + `<p class="cap">The shaded area is the first 60 days, before you took over. Queues are jobs waiting at the end of each day.</p><div class="actions">${UI.btn('Download all daily data (CSV)', 'm', 'btn-ghost', 'data-op="csv"')}</div>`);
    const rows = g.days.slice(-14).reverse().map(x => [`D${x.d}`, String(x.arr), String(x.done), x.lt == null ? '–' : N.num(x.lt, 2), x.revJob == null ? '–' : N.usd(x.revJob), x.q.join('/'), x.util.map(u => N.pct(u)).join(' '), String(x.kits), kUSD(x.cash - x.loan)]);
    h += UI.sheet('Last 14 days', null, UI.table(['Day', 'Orders', 'Shipped', 'Lead (d)', 'Rev/order', 'Queues', 'Utilisation', 'Kits', 'Cash'], rows, { sticky: true }) + '<p class="cap">Queues: assembly / first test / calibration / final test. Utilisation: assembly, testing, calibration.</p>');
    return h;
  }
  function csv(g) {
    const head = ['day', 'orders', 'shipped', 'lead_time_days', 'max_lead_time_days', 'revenue', 'revenue_per_order', 'on_time_share', 'queue_assembly', 'queue_first_test', 'queue_calibration', 'queue_final_test', 'util_assembly', 'util_testing', 'util_calibration', 'machines_assembly', 'machines_testing', 'machines_calibration', 'kits_on_hand', 'kits_on_order', 'orders_waiting_for_kits', 'orders_in_plant', 'cash', 'loan', 'contract', 'lots_per_order'];
    const f = v => (v == null ? '' : typeof v === 'number' ? (Math.round(v * 1000) / 1000) : v);
    const rows = g.days.map(x => [x.d, x.arr, x.done, x.lt, x.ltMax, x.rev, x.revJob, x.onTime, x.q[0], x.q[1], x.q[2], x.q[3], x.util[0], x.util[1], x.util[2], x.m[0], x.m[1], x.m[2], x.kits, x.onOrder, x.waitKits, x.wip, x.cash, x.loan, x.contract, x.lot].map(f).join(','));
    return head.join(',') + '\n' + rows.join('\n');
  }

  /* ---------- Log tab ---------- */
  function logView(g) {
    const items = g.log.slice().reverse().slice(0, 200);
    return UI.sheet('Plant log', `${g.log.length} entries`, items.length ? `<ul class="olog">${items.map(l => `<li class="${l.kind}"><span class="num">D${l.day}</span><span>${esc(l.msg)}</span></li>`).join('')}</ul>` : UI.empty('Nothing has happened yet.'));
  }

  /* ---------- Guide ---------- */
  function guideView(g) {
    const steps = [1, 2, 3, 4].map(k => [`${k}. ${STEP_NAMES[k]}`, ST[OE.STEPS[k].s].name, hrs(OE.STEPS[k].setup), N.num(OE.STEPS[k].unit * 60, 2) + ' min', hrs(OE.procHours(k, 60))]);
    let h = `<section class="hero"><span class="eyebrow">Participant guide</span><h1>How Ops Lab works</h1><p class="lede">A queueing factory with random orders, setups, a shared testing station, lead-time contracts and a supplier with a four-day lead time.</p></section>`;
    h += UI.fold('The process', UI.table(['Step', 'Machine', 'Setup per lot', 'Per board', 'Whole order'], steps, { sticky: true }) + `<div class="case"><p>Each order is 60 boards and needs one kit. Orders split into lots of equal size; each lot pays the setup at every step, then moves on alone. Smaller lots finish the first boards sooner and keep machines busy in parallel, but add setup time. Processing times vary by about ±12% from lot to lot.</p><p>Testing machines run both the first test (step 2) and the final test (step 4). The priority rule decides which lot they take when both are waiting.</p></div>`, true, '1');
    h += UI.fold('Orders and contracts', UI.table(['Contract', 'Full price', 'Full price within', 'Price falls to $0 at'], Object.keys(C).map(k => [C[k].name, N.usd(C[k].full), C[k].quote + ' days', C[k].zero + ' days'])) + `<div class="case"><p>Orders arrive at random, on average about 7 a day at day 60. The contract you choose applies to orders arriving after the change. Lead time runs from the moment an order arrives to the moment its last lot ships, including any wait for kits. Between the quoted and the zero lead time, the price falls in a straight line.</p></div>`, false, '2');
    h += UI.fold('Kits and the supplier', `<div class="case"><p>Each kit costs ${N.usd(OE.KIT_COST)}, and every order to the supplier adds a fixed ${N.usd(OE.KIT_FEE)}. Kits arrive ${OE.KIT_LEAD} days after you order. Whenever kits on hand plus kits on order fall to the reorder point, the plant orders the order quantity automatically, paying at once. If cash is short, the order is skipped. Orders that arrive with no kits wait, and the wait counts toward lead time. Kits left at day 300 are worth nothing.</p></div>`, false, '3');
    h += UI.fold('Machines, cash and loans', `<div class="case"><p>Machines cost ${ST.map(st => `${kUSD(st.buy)} (${st.name.toLowerCase()})`).join(', ')} and start work at once. A retired machine sells for ${kUSD(OE.RETIRE)}, after finishing its current lot. You can run up to eight of each. Cash earns 10% a year. You can borrow up to ${kUSD(OE.LOAN_MAX)} at 20% a year and repay at any time; if cash would go negative, the bank lends the gap automatically.</p></div>`, false, '4');
    h += UI.fold('Time and the end game', `<div class="case"><p>Days 0 to 59 already happened under the old settings. You run the plant from day 60 to day ${OE.CONTROL_END}, choosing how many days to run between decisions. From day ${OE.CONTROL_END} to day ${OE.END_DAY} the plant runs on autopilot with your final settings. Demand grows until about day 150, holds until about day 220, then declines.</p></div>`, false, '5');
    h += UI.fold('Scoring', `<div class="case"><p>Your result is cash at day 300 minus any loan. It is compared with two benchmarks run on exactly the same orders: the plant left exactly as you found it, and a disciplined planner that buys capacity ahead of forecast, moves to the Priority contract when it can, and sizes kit orders from demand. Matching the planner scores 80. Beating it by 12% of the gap between the two benchmarks scores 100.</p></div>`, false, '6');
    h += UI.fold('Concepts', `<div class="ideas">${[
      ['Bottleneck.', 'The station with the least capacity sets the output of the whole line. Adding capacity anywhere else changes nothing.'],
      ['Utilisation and queues.', 'With random arrivals, waiting time grows slowly at first and then explodes as utilisation approaches 100%.'],
      ['Little’s Law.', 'Work in process equals throughput times lead time. If you know two, you know the third.'],
      ['Lot sizing.', 'Splitting orders shortens lead times by overlapping steps, at the cost of extra setups.'],
      ['Reorder point and EOQ.', 'Reorder when stock would just last the supplier lead time plus a buffer. The economic order quantity balances fixed ordering fees against the cost of tying up cash.'],
      ['Capacity versus price.', 'Faster delivery commands higher prices only if the plant has the slack to deliver it reliably.']
    ].map(([a, b]) => `<p><strong>${a}</strong> ${b}</p>`).join('')}</div>`, false, '7');
    return h;
  }

  /* ---------- Debrief ---------- */
  function lostToLateness(g) { return sum(g.days.filter(x => x.d >= OE.START_DAY).map(x => Math.max(0, x.done * C[x.contract].full - x.rev))); }
  function coachNotes(g, B) {
    const notes = [], D = g.days.filter(x => x.d >= OE.START_DAY);
    const v = OE.finalValue(g);
    notes.push(v >= B.plan ? `You beat the planner by ${money(v - B.plan)}. That takes faster contracts, timely capacity and a clean end game.` : `You finished ${money(B.plan - v)} behind the planner and ${money(v - B.handsOff)} ahead of leaving the plant alone.`);
    let best = null;
    [0, 1, 2].forEach(s => { let run = null; D.forEach(x => { if (x.util[s] >= 0.9) { if (!run) run = { s, from: x.d, to: x.d, lt: [] }; run.to = x.d; if (x.lt != null) run.lt.push(x.lt); } else { if (run && (!best || run.to - run.from > best.to - best.from)) best = run; run = null; } }); if (run && (!best || run.to - run.from > best.to - best.from)) best = run; });
    if (best && best.to - best.from >= 4) notes.push(`${ST[best.s].name} ran above 90% from day ${best.from} to day ${best.to}. Lead times averaged ${N.num(avg(best.lt.length ? best.lt : [0]), 1)} days in that stretch: near full use, queues explode.`);
    const lost = lostToLateness(g);
    if (lost > 20000) notes.push(`Late deliveries cost ${money(lost)}: orders shipped after the contract quote were paid less than full price.`);
    const fastOnA = D.filter(x => x.contract === 'A' && x.lt != null && x.lt <= 1).length;
    if (fastOnA >= 15) notes.push(`On ${fastOnA} days you shipped within a day while selling on the Standard contract. Priority pays $500 more for that speed.`);
    const starve = D.filter(x => x.waitKits > 0);
    if (starve.length) { const worst = starve.reduce((a, b) => (b.waitKits > a.waitKits ? b : a)); notes.push(`Orders waited for kits on ${starve.length} day${starve.length === 1 ? '' : 's'} (${worst.waitKits} on day ${worst.d}). Set the reorder point to cover the ${OE.KIT_LEAD}-day supplier lead time plus a buffer.`); }
    if (g.kits > 20) notes.push(`You ended with ${N.int(g.kits)} unused kits, worth ${money(g.kits * OE.KIT_COST)} at cost. Before autopilot, cut the order quantity to what the last 60 days need.`);
    const wip = mean(D, x => x.wip), thr = mean(D, x => x.done), lt = g.tot.done ? g.tot.lt / g.tot.done : 0;
    if (thr) notes.push(`Little’s Law check: ${N.num(wip, 1)} orders in the plant ÷ ${N.num(thr, 1)} shipped a day ≈ ${N.num(wip / thr, 2)} days, against a measured lead time of ${N.num(lt, 2)} days (which also counts waits for kits).`);
    if (g.tot.loanInt > 2000) notes.push(`Loan interest cost ${money(g.tot.loanInt)}. Borrowing pays when it buys capacity that earns more than 20% a year.`);
    return notes.slice(0, 6);
  }
  function debriefView(g, ctx) {
    const B = OE.benchmarks(g), sc = OE.score(g), v = OE.finalValue(g), D = g.days.filter(x => x.d >= OE.START_DAY);
    let h = `<section class="sheet"><header class="sh"><span class="eyebrow">Debrief · Ops Lab</span></header><div class="grade"><span class="letter" aria-label="Grade ${S.grade(sc)}"><span class="hl draw">${S.grade(sc)}</span></span><div class="grade-txt"><span class="h2">${S.gradeWord(sc)}</span><span class="score num">${sc} / 100</span></div></div><p class="case">Kestrel Labs finished day 300 with <strong>${money(v)}</strong> net of loans. Left exactly as you found it, the plant would have ended with ${money(B.handsOff)}; the planner ended with ${money(B.plan)}.</p>${UI.kpis([
      { k: 'Orders shipped', v: N.int(g.tot.done), d: `of ${N.int(g.tot.arrivals)} received` }, { k: 'Average lead time', v: days1(g.tot.done ? g.tot.lt / g.tot.done : null) },
      { k: 'Revenue', v: money(g.tot.rev), d: `${N.pct(g.tot.max ? g.tot.rev / g.tot.max : 0)} of full price` }, { k: 'Machines bought', v: money(g.tot.machines) }
    ])}</section>`;
    h += UI.sheet('The race', 'Cash, net of loans, against the benchmarks', UI.chart('op-db-cash', () => ({ series: [{ values: g.days.map(x => (x.cash - x.loan) / 1e6), c: 'var(--c-you)', w: 3, noDot: true }, { values: B.curves.plan.map(x => x / 1e6), c: 'var(--s3)', w: 1.8, noDot: true }, { values: B.curves.handsOff.map(x => x / 1e6), c: 'var(--s5)', w: 1.8, noDot: true, dash: true }], xLabel: i => 'D' + i, yFmt: mAxis, bands: [{ from: OE.CONTROL_END, to: OE.END_DAY - 1, c: 'var(--ink-3)' }] }), 230, [{ t: 'You', c: 'var(--c-you)' }, { t: 'Planner', c: 'var(--s3)' }, { t: 'Hands off', c: 'var(--s5)' }], 'Cash over time') + '<p class="cap">The shaded area is the autopilot phase.</p>' +
      UI.chart('op-db-lt', () => ({ series: [{ values: ma(g.days.map(x => x.lt), 7), c: 'var(--c-you)', w: 2.5, noDot: true }, { values: ma(B.planDays.map(x => x.lt), 7), c: 'var(--s3)', w: 1.6, noDot: true }], xLabel: i => 'D' + i, yMin: 0, yFmt: v => v + 'd' }), 190, [{ t: 'Your lead time, 7-day average', c: 'var(--c-you)' }, { t: 'Planner', c: 'var(--s3)' }], 'Lead time over time'));
    const decisions = g.log.filter(l => l.kind === 'set').slice(0, 60);
    h += `<section class="sheet"><header class="sh"><span class="eyebrow">Coach’s notes</span><h2>What to take away</h2></header><ul class="notes plain">${coachNotes(g, B).map(n => `<li>${n}</li>`).join('')}</ul></section>`;
    if (decisions.length) h += UI.fold(`Your decisions (${decisions.length})`, `<ul class="olog">${decisions.map(l => `<li><span class="num">D${l.day}</span><span>${esc(l.msg)}</span></li>`).join('')}</ul>`, false);
    h += `<div class="actions"><button type="button" class="btn btn-primary" data-act="retry-run" data-id="${ctx.meta.id}">Replay the same orders</button><button type="button" class="btn btn-ghost" data-act="new-run" data-module="opslab">New factory</button><button type="button" class="btn btn-ghost" data-act="leave-run">Back to home</button></div>`;
    void D;
    return h;
  }

  /* ---------- Live ---------- */
  function live(g, ctx) {
    if (OE.isDone(g) || uiStr(ctx, 'tab', 'plant') !== 'plant') return {};
    const d = g.draft, L = { 'op-cap': capHtml(g, d.set), 'op-kits': kitHint(g, d.set), 'op-loan': loanHint(g, d.loan), 'op-sum': sumLine(g) };
    [0, 1, 2].forEach(s => { L['op-m' + s] = machHint(g, d.set, s); });
    return L;
  }

  S.App.register({
    id: 'opslab', cat: 'ops', title: 'Ops Lab', area: 'Operations', length: '240 days · 30–45 min', depth: 'Full simulation', version: 1, persist: 'replay', wide: true,
    practises: 'Capacity and bottlenecks · queues and lead times · inventory and contracts',
    blurb: 'Take over a contract factory on day 60. Orders arrive at random and flow through four steps on three machine types. Buy capacity, pick lead-time contracts, split lots, set the testing priority and manage parts kits until the plant runs alone.',
    detail: '<p>A discrete-event factory: random arrivals that grow, peak and fall; setups and lot sizing; a testing station visited twice with a priority rule; three lead-time contracts; a supplier with a four-day lead time; machine purchases, cash interest and loans; 60 days of history; daily data with CSV export; an autopilot end game; and a debrief against two benchmarks on the same orders.</p>',
    options: [{ id: 'difficulty', label: 'Difficulty', default: 'guided', choices: [{ v: 'guided', t: 'Foundation', s: 'Capacity check with a 30-day demand forecast' }, { v: 'standard', t: 'Intermediate', s: 'Today’s utilisation, no forecast' }, { v: 'expert', t: 'Advanced', s: 'Work out capacity yourself' }] }],
    create: (seed, config) => OE.create(seed, config),
    apply: (g, d) => OE.apply(g, d),
    isDone: g => OE.isDone(g),
    progress: g => (OE.isDone(g) ? 'Complete · day 300' : `Day ${OE.day(g)} of ${OE.END_DAY}`),
    view(g, ctx) {
      const done = OE.isDone(g);
      let tab = uiStr(ctx, 'tab', done ? 'debrief' : 'plant');
      if (done && tab === 'plant') tab = 'debrief';
      if (!done && tab === 'debrief') tab = 'plant';
      ctx.ui.tab = tab;
      let h = header(g, done);
      h += UI.tabs('tab', [{ v: done ? 'debrief' : 'plant', t: done ? 'Debrief' : 'Plant' }, { v: 'data', t: 'Data' }, { v: 'log', t: 'Log' }, { v: 'guide', t: 'Guide' }], tab, 'main-tabs', true);
      if (tab === 'plant') h += plantView(g, ctx);
      else if (tab === 'data') h += dataView(g, ctx);
      else if (tab === 'log') h += logView(g);
      else if (tab === 'guide') h += guideView(g);
      else h += debriefView(g, ctx);
      return h;
    },
    live,
    field(g, name, value) {
      const d = g.draft; if (!d) return null;
      if (name.indexOf('m:') === 0) { d.set.m[+name.slice(2)] = clamp(Math.round(+value || 1), 1, 8); return null; }
      if (name === 'loan') { d.loan = Math.round(+value || 0); return null; }
      if (name === 'rop' || name === 'q') { d.set[name] = Math.max(0, Math.round(+value || 0)); return null; }
      if (name === 'contract' || name === 'prio') { d.set[name] = String(value); return null; }
      if (name === 'lot') { d.set.lot = +value; return null; }
      return null;
    },
    act(g, op, el, ctx) {
      if (op === 'csv') { S.downloadText(`kestrel-labs-day-${OE.day(g)}.csv`, csv(g), 'text/csv'); return null; }
      const d = g.draft; if (!d) return null;
      if (op === 'run') {
        const cl = costLine(g, d.set, +d.loan || 0);
        if (cl.after < -0.5) return { toast: 'Not enough cash for those machines. Borrow or buy fewer.' };
        const dec = { set: clone(d.set), loan: +d.loan || 0, days: Math.max(1, Math.round(+el.dataset.days || 1)) };
        ctx.ui.tab = 'plant';
        return { commit: dec, top: false, toast: OE.day(g) + dec.days >= OE.END_DAY ? 'Day 300 reached. Here is your debrief.' : `Ran ${dec.days} day${dec.days === 1 ? '' : 's'}.` };
      }
      return null;
    },
    summary(g) {
      const sc = OE.score(g), B = OE.benchmarks(g), v = OE.finalValue(g);
      return { score: sc, line: `Day-300 cash ${money(v)} · planner ${money(B.plan)} · hands off ${money(B.handsOff)}`, metrics: [{ k: 'Cash', v: money(v) }, { k: 'Orders shipped', v: N.int(g.tot.done) }] };
    }
  });
})();
