/* Chain Lab: interface for the four-echelon supply chain game. The engine lives in chainlab-engine.js. */
(function () {
  'use strict';
  const S = window.SimLab, C = window.ChainLabEngine;
  if (!S || !C) return;
  const { UI, N, U } = S;
  const esc = U.esc, clamp = U.clamp, sum = U.sum, avg = U.avg, clone = U.clone;
  const R = C.ROLES;
  const E_COL = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)'];
  const usd = v => N.usd(v, 0), usd2 = v => N.usd(v, 2), cs = v => N.int(v);
  const plural = (n, w) => `${N.int(n)} ${w}${Math.round(n) === 1 ? '' : 's'}`;
  const uiStr = (ctx, k, d) => (ctx.ui[k] == null || ctx.ui[k] === '' ? d : ctx.ui[k]);
  const guided = g => g.cfg.difficulty !== 'expert';
  const me = g => g.E[g.role];
  const roleName = i => R[i].name;
  const upName = i => (i < 3 ? roleName(i + 1).toLowerCase() : 'the bottling line');
  const downName = i => (i > 0 ? roleName(i - 1).toLowerCase() : 'shoppers');
  const W = g => C.week(g);
  const lastH = (g, i) => { const h = g.H.E[i]; return h.length ? h[h.length - 1] : null; };
  const fieldBox = (label, control, liveKey, hint) => `<div class="fbox"><span class="lbl">${label}</span>${control}${liveKey || hint ? `<span class="hint"${liveKey ? ` data-live="${liveKey}"` : ''}>${hint || ''}</span>` : ''}</div>`;
  const chipBtn = (label, attrs) => `<button type="button" class="chip" data-act="m" ${attrs}>${label}</button>`;
  const net = e => e.inv - e.back;
  const teamCost = g => sum(g.E.map(e => e.cost));

  /* ---------- Header ---------- */
  function header(g, done) {
    const e = me(g), w = W(g);
    return `<section class="sheet hdr"><div class="hdr-top"><div class="sh"><span class="eyebrow">${done ? `Final results · after week ${g.weeks}` : `Week ${w} of ${g.weeks} · you are the ${roleName(g.role).toLowerCase()}`}</span><h2>Cascade Water</h2></div><div class="hdr-pills">${UI.pill(C.SCENARIOS[g.cfg.scenario].name, 'neutral')}${UI.pill(C.INFO[g.cfg.info].name, 'pen')}${UI.level(g.cfg.difficulty)}</div></div>${UI.kpis([
      { k: done ? 'Your cost' : 'Your cost so far', v: usd2(e.cost), d: done ? `over ${g.weeks} weeks` : `this week ${usd2(e.weekCost)}` },
      { k: done ? 'Chain cost' : 'Chain cost so far', v: usd2(teamCost(g)), d: 'all four firms' },
      { k: done ? 'Final stock' : 'Stock now', v: e.back > 0 ? `<span class="down">${N.MINUS}${cs(e.back)}</span>` : cs(e.inv), d: e.back > 0 ? 'cases owed (backlog)' : 'cases on hand' },
      { k: 'Orders filled on time', v: g.H.E[g.role].length ? N.pct(C.fillRate(g, g.role)) : '–', d: 'share of incoming orders' }
    ])}</section>`;
  }
  function caseBrief(g, open) {
    const i = g.role;
    return UI.brief('Cascade Water', open, `<p>Cascade sparkling water reaches shoppers through four firms: the <strong>factory</strong> bottles it, a national <strong>distributor</strong> and a regional <strong>wholesaler</strong> move it, and a supermarket <strong>retailer</strong> sells it. You run the <strong>${roleName(i).toLowerCase()}</strong>. The other three firms are run by experienced managers.</p><p>Every week you receive an order from ${downName(i)} and ship what you can from stock. Anything you cannot ship becomes <strong>backlog</strong>, which you must ship later. Then you order from ${upName(i)}. ${i < 3 ? `Your order reaches ${upName(i)} a week later, and the cases it ships take two more weeks to arrive.` : 'Bottling takes three weeks from the moment you schedule it.'}</p><p>Every case in stock costs ${usd2(C.HOLD)} a week to hold. Every case of backlog costs ${usd2(C.BACK)} a week, because customers wait. Your goal is the lowest cost, for you and for the chain as a whole. ${g.cfg.info === 'none' ? 'Nobody tells anyone else what they see.' : g.cfg.info === 'pos' ? 'Every firm can see what shoppers buy each week.' : 'Every firm can see shoppers’ demand and every other firm’s stock and pipeline.'}</p>`, 'Orders you already placed are still on their way. Count them before you order more.');
  }

  /* ---------- The chain ---------- */
  function node(g, i) {
    const e = g.E[i], vis = C.visible(g, i), mine = i === g.role, h = lastH(g, i);
    const cls = 'cnode' + (mine ? ' me' : '') + (vis ? '' : ' hid');
    if (!vis) return `<div class="${cls}"><span class="cn-t">${roleName(i)}</span><span class="cn-s">Not shared</span><span class="cap">Their stock and orders are private in this chain.</span></div>`;
    const transit = i < 3 ? e.ship : e.prod;
    return `<div class="${cls}"><span class="cn-t">${roleName(i)}${mine ? ' <span class="tag">you</span>' : ''}</span><span class="cn-big num${e.back > 0 ? ' down' : ''}">${e.back > 0 ? `${N.MINUS}${cs(e.back)}` : cs(e.inv)}</span><span class="cn-s">${e.back > 0 ? 'cases backlog' : 'cases in stock'}</span><dl class="cn-dl"><dt>Order in</dt><dd class="num">${cs(e.d)}</dd><dt>Shipped</dt><dd class="num">${cs(e.sent)}</dd><dt>${i < 3 ? 'Arriving' : 'Bottling'}</dt><dd class="num">${transit.map(cs).join(' · ')}</dd>${h ? `<dt>Last order</dt><dd class="num">${cs(h.order)}</dd>` : ''}</dl></div>`;
  }
  function chainView(g) {
    const showDem = g.role === 0 || g.cfg.info !== 'none';
    const shoppers = `<div class="cnode shop"><span class="cn-t">Shoppers</span>${showDem ? `<span class="cn-big num">${cs(g.dem[W(g) - 1])}</span><span class="cn-s">cases bought this week</span>` : '<span class="cn-s">Demand not shared</span><span class="cap">Only the retailer sees what shoppers buy.</span>'}</div>`;
    const arrow = `<span class="carr" aria-hidden="true">→</span>`;
    return `<div class="chain" aria-label="The supply chain, from factory to shoppers">${[3, 2, 1, 0].map(i => node(g, i)).join(arrow)}${arrow}${shoppers}</div><p class="cap">Goods flow left to right; orders flow right to left. ${g.cfg.info === 'full' ? 'Full visibility: you can see every firm.' : 'You see your own firm' + (showDem ? ' and what shoppers buy' : '') + '.'} Arriving shows the shipments due next week and the week after.</p>`;
  }

  /* ---------- Your week ---------- */
  function weekStory(g) {
    const e = me(g), i = g.role, w = W(g);
    const parts = [`${i === 0 ? 'Shoppers bought' : `The ${downName(i)} ordered`} <strong>${cs(e.d)}</strong> case${e.d === 1 ? '' : 's'}${i === 0 ? '' : ' from you'}.`];
    parts.push(`<strong>${cs(e.arr)}</strong> case${e.arr === 1 ? '' : 's'} arrived${i === 3 ? ' from the bottling line' : ` from the ${upName(i)}`}.`);
    parts.push(e.back > 0 ? `You shipped <strong>${cs(e.sent)}</strong> and still owe <strong class="down">${cs(e.back)}</strong>.` : `You shipped <strong>${cs(e.sent)}</strong> and have <strong>${cs(e.inv)}</strong> left.`);
    if (i === 3 && g.cfg.scenario === 'shock' && w >= C.SHOCK.from && w <= C.SHOCK.to) parts.push(`<span class="down">The bottling line is damaged: it can start at most ${C.SHOCK.cap} cases a week until week ${C.SHOCK.to}.</span>`);
    const h = lastH(g, i); if (h && h.capped > 0) parts.push(`Last week only ${cs(h.order)} could be scheduled.`);
    return parts.join(' ');
  }
  function yourWeek(g) {
    const e = me(g), i = g.role, transit = i < 3 ? e.ship : e.prod, sl = C.supplyLine(g, i), ow = C.owed(g, i);
    const rows = transit.map((v, k) => [k === 0 ? 'Next week' : `In ${k + 1} weeks`, cs(v)]);
    if (i < 3) rows.push(['Ordered, not yet shipped to you', cs(ow)]);
    return UI.sheet(`Your week · week ${W(g)}`, `${roleName(i)}`, `<p class="case">${weekStory(g)}</p>${UI.kpis([
      { k: 'In stock', v: cs(e.inv) }, { k: 'Backlog', v: e.back > 0 ? `<span class="down">${cs(e.back)}</span>` : '0' },
      { k: 'Supply line', v: cs(sl), d: 'ordered, not yet received' }, { k: 'Cost this week', v: usd2(e.weekCost), d: `${usd2(C.HOLD)} stock · ${usd2(C.BACK)} backlog` }
    ])}${UI.table(['Your pipeline', 'Cases'], rows, { sticky: true })}`);
  }

  /* ---------- Ordering ---------- */
  function calcHtml(g) {
    const d = g.draft, s = C.suggest(g, g.role, d.calc), i = g.role, sigName = i === 0 || g.cfg.info !== 'none' ? 'shoppers’ demand' : 'orders you receive';
    const rows = [
      ['Forecast', `${N.num(s.fc, 1)} a week`, `smoothed ${sigName} (${N.pct(s.theta)} weight on this week’s ${N.num(s.sig, 0)})`],
      ['Stock target', N.num(s.target, 1), `${N.num(s.cover, 1)} week${s.cover === 1 ? '' : 's'} of forecast`],
      ['Stock now', N.num(s.net, 0), 'on hand minus backlog'],
      ['Stock correction', N.sign(s.adj * (s.target - s.net), v => N.num(v, 1)), `${N.pct(s.adj)} of the gap`],
      ['Pipeline target', N.num(s.slWant, 1), `forecast × ${C.leadTime(i) - 1} weeks still in the pipe`],
      ['Pipeline now', N.num(s.sl, 0), 'ordered, not yet received'],
      ['Pipeline correction', N.sign(s.adjSL * (s.slWant - s.sl), v => N.num(v, 1)), `${N.pct(s.adjSL)} of the gap`]
    ];
    return UI.table(['Order-up-to calculator', 'Cases'], rows.map(r => ({ cells: [`${r[0]}<small class="cx">${r[2]}</small>`, r[1]] })), { cls: 'stmt calc', foot: ['Suggested order<small class="cx">forecast plus both corrections</small>', `<strong>${cs(s.order)}</strong>`] });
  }
  function orderView(g, ctx) {
    const d = g.draft, e = me(g), i = g.role, h = lastH(g, i), gd = guided(g), s = C.suggest(g, i, d.calc);
    const last = h ? h.order : g.L0, left = g.weeks - W(g) + 1;
    let body = `<div class="pgrid order-grid">${fieldBox(`Order from the ${i < 3 ? upName(i) : 'bottling line'} (cases)`, UI.num('order', d.order, { min: 0, max: 500, step: 1, dec: 0, label: 'Cases to order', wide: true }))}</div><div class="chips sm">${chipBtn(`Same as last week (${cs(last)})`, `data-op="set" data-v="${last}"`)}${chipBtn(`Match the order you received (${cs(e.d)})`, `data-op="set" data-v="${e.d}"`)}${gd ? chipBtn(`Calculator (${cs(s.order)})`, `data-op="set" data-v="${s.order}"`) : ''}</div>`;
    body += `<p class="hint" data-live="ord-hint">${orderHint(g)}</p>`;
    body += `<div class="actions"><button type="button" class="btn btn-primary btn-block" data-act="m" data-op="play">${left <= 1 ? 'Place the final order' : `Order and play week ${W(g)}`}</button></div>`;
    let h2 = UI.sheet(`Your order · week ${W(g)}`, 'How many cases to order', body);
    if (gd) {
      const c = d.calc;
      h2 += UI.sheet('Calculator', 'An order-up-to policy you can tune', `<p class="case">The calculator orders enough to cover the forecast, then closes part of two gaps: between your stock and a target, and between what is in your pipeline and what should be. Leaving the pipeline gap open is how most players end up ordering far too much.</p><div class="pgrid">${
        fieldBox('Stock target (weeks)', UI.num('c:cover', c.cover, { min: 0, max: 8, step: 0.5, dec: 1, label: 'Stock target in weeks of forecast' }))}${
        fieldBox('Stock gap closed (%)', UI.num('c:adj', Math.round(c.adj * 100), { min: 0, max: 100, step: 5, dec: 0, label: 'Share of the stock gap closed each week' }))}${
        fieldBox('Pipeline gap closed (%)', UI.num('c:adjSL', Math.round(c.adjSL * 100), { min: 0, max: 100, step: 5, dec: 0, label: 'Share of the pipeline gap closed each week' }))}${
        fieldBox('Forecast weight (%)', UI.num('c:theta', Math.round(c.theta * 100), { min: 5, max: 100, step: 5, dec: 0, label: 'Weight on this week in the forecast' }))}</div><div data-live="calc">${calcHtml(g)}</div><div class="chips sm">${chipBtn('Reset the calculator', 'data-op="calc-reset"')}</div>`);
      if (S.lvlOf(g) === 0) h2 += UI.sheet('Autopilot', 'Let the calculator order for a while', `<p class="cap">The calculator places your orders for the next weeks with the settings above, recalculating every week. You can take back control at any time.</p><div class="pgrid">${fieldBox('Weeks', UI.num('weeks', d.weeks, { min: 1, max: Math.min(8, left), step: 1, dec: 0, label: 'Weeks to run on autopilot' }))}</div><div class="actions">${UI.btn(`Run ${plural(Math.min(d.weeks, left), 'week')} on the calculator`, 'm', 'btn-ghost', 'data-op="auto"')}</div>`);
    }
    return h2;
  }
  function orderHint(g) {
    const d = g.draft, e = me(g), i = g.role, sl = C.supplyLine(g, i), o = Math.max(0, Math.round(+d.order || 0));
    const pos = net(e) + sl + o;
    return `After this order you will have <strong>${cs(sl + o)}</strong> cases in your pipeline and a stock of ${net(e) < 0 ? `${N.MINUS}${cs(-net(e))}` : cs(net(e))}: <strong>${cs(pos)}</strong> in total, about ${N.num(pos / Math.max(1, e.d || 1), 1)} weeks of this week’s ${i === 0 ? 'demand' : 'incoming order'}. ${i < 3 ? `It arrives in about ${C.leadTime(i)} weeks if the ${upName(i)} has stock.` : `It is bottled in ${C.PROD_DELAY} weeks.`}`;
  }
  function recentTable(g) {
    const h = g.H.E[g.role].slice(-8).reverse();
    if (!h.length) return '';
    return UI.sheet('Recent weeks', 'Your last eight weeks', UI.table(['Week', 'Order in', 'Shipped', 'Arrived', 'Stock', 'Backlog', 'You ordered', 'Supply line', 'Cost'], h.map(x => [String(x.t), cs(x.d), cs(x.sent), cs(x.arr), cs(x.inv), x.back ? `<span class="down">${cs(x.back)}</span>` : '0', cs(x.order) + (x.capped ? ` <small>(${cs(x.order + x.capped)} asked)</small>` : ''), cs(x.sl), usd2(x.cost)]), { sticky: true }));
  }
  function playView(g, ctx) {
    let h = '';
    if (W(g) === 1) h += caseBrief(g, !ctx.ui.seenBrief);
    h += UI.sheet(`The chain · week ${W(g)}`, 'Where the cases are', chainView(g));
    h += yourWeek(g);
    h += orderView(g, ctx);
    h += recentTable(g);
    return h;
  }

  /* ---------- Data ---------- */
  const METRICS = [{ v: 'orders', t: 'Orders' }, { v: 'stock', t: 'Stock' }, { v: 'pipe', t: 'Supply line' }, { v: 'cost', t: 'Cost' }];
  function dataSpec(g, m, all) {
    const i = g.role, H = g.H.E, X = k => 'W' + (k + 1), line = (vals, c, w, dash) => ({ values: vals, c, w: w || 2, noDot: true, dash });
    const showDem = all || i === 0 || g.cfg.info !== 'none', seeAll = all || g.cfg.info === 'full';
    const who = seeAll ? [0, 1, 2, 3] : [i];
    if (m === 'orders') {
      const s = who.map(k => line(H[k].map(x => x.order), E_COL[k], k === i ? 3 : 2));
      if (!seeAll) s.push(line(H[i].map(x => x.d), 'var(--s5)', 1.6, true));
      if (showDem) s.push(line(g.H.dem, 'var(--ink)', 1.6, true));
      return { series: s, xLabel: X, yMin: 0 };
    }
    if (m === 'stock') return { series: who.map(k => line(H[k].map(x => x.inv - x.back), E_COL[k], k === i ? 3 : 2)), xLabel: X, refs: [{ y: 0 }] };
    if (m === 'pipe') return { series: who.map(k => line(H[k].map(x => x.sl), E_COL[k], k === i ? 3 : 2)), xLabel: X, yMin: 0 };
    let acc = 0; return { series: [line(H[i].map(x => x.cost), 'var(--s5)', 1.6), line(H[i].map(x => (acc += x.cost)), E_COL[i], 3)], xLabel: X, yMin: 0, yFmt: v => '$' + v };
  }
  function dataLegend(g, m, all) {
    const i = g.role, seeAll = all || g.cfg.info === 'full', showDem = all || i === 0 || g.cfg.info !== 'none';
    if (m === 'cost') return [{ t: 'Your cost each week', c: 'var(--s5)' }, { t: 'Your cumulative cost', c: E_COL[i] }];
    const L = (seeAll ? [0, 1, 2, 3] : [i]).map(k => ({ t: roleName(k) + (k === i ? ' (you)' : ''), c: E_COL[k] }));
    if (m === 'orders' && !seeAll) L.push({ t: 'Orders you received', c: 'var(--s5)' });
    if (m === 'orders' && showDem) L.push({ t: 'Shoppers’ demand', c: 'var(--ink)' });
    return L;
  }
  function dataView(g, ctx) {
    const m = uiStr(ctx, 'metric', 'orders');
    if (!g.H.E[g.role].length) return UI.sheet('Chain data', 'Nothing yet', UI.empty('Play a week to start the record.'));
    const cap = { orders: 'Cases ordered each week.', stock: 'Stock minus backlog at the end of each week. Below zero means customers are waiting.', pipe: 'Cases ordered but not yet received, at the end of each week.', cost: 'Holding and backlog cost.' }[m];
    let h = UI.sheet('Chain data', 'Week by week', UI.tabs('metric', METRICS, m, 'seg-tabs') + UI.chart('cl-data', () => dataSpec(g, m, false), 250, dataLegend(g, m, false), 'Weekly chain data') + `<p class="cap">${cap} ${g.cfg.info === 'full' ? '' : 'Other firms’ figures are revealed in the debrief.'}</p><div class="actions">${UI.btn('Download your weekly data (CSV)', 'm', 'btn-ghost', 'data-op="csv"')}</div>`);
    const rows = g.H.E[g.role].slice().reverse().map(x => [String(x.t), cs(x.d), cs(x.sent), cs(x.arr), cs(x.inv), cs(x.back), cs(x.order), cs(x.sl), usd2(x.cost)]);
    h += UI.sheet('Your record', `${plural(rows.length, 'week')}`, UI.table(['Week', 'Order in', 'Shipped', 'Arrived', 'Stock', 'Backlog', 'Ordered', 'Supply line', 'Cost'], rows, { sticky: true }));
    return h;
  }
  function csv(g, all) {
    const head = ['week', 'firm', 'order_received', 'shipped', 'arrived', 'stock', 'backlog', 'ordered', 'supply_line', 'cost', 'shopper_demand'];
    const rows = [];
    (all ? [0, 1, 2, 3] : [g.role]).forEach(i => g.H.E[i].forEach((x, k) => rows.push([x.t, R[i].id, x.d, x.sent, x.arr, x.inv, x.back, x.order, x.sl, x.cost, all || g.role === 0 || g.cfg.info !== 'none' ? g.H.dem[k] : ''].join(','))));
    return head.join(',') + '\n' + rows.join('\n');
  }

  /* ---------- Guide ---------- */
  function guideView(g) {
    let h = `<section class="hero"><span class="eyebrow">Participant guide</span><h1>How Chain Lab works</h1><p class="lede">A four-firm supply chain with delays, private information and computer teammates who behave like real players.</p></section>`;
    h += UI.fold('The chain', UI.table(['Firm', 'Role'], R.map(r => [r.name, esc(r.who)]), { cls: 'wrap' }) + `<div class="case"><p>Each week, in order: shipments arrive; each firm receives its incoming order (shoppers' demand for the retailer); each firm ships what it can, backlog first; costs are charged; each firm orders from its supplier (the factory schedules bottling).</p></div>`, true, '1');
    h += UI.fold('Delays', `<div class="case"><p>An order takes ${C.INFO_DELAY} week to reach the supplier. Cases the supplier ships take ${C.SHIP_DELAY} weeks to arrive. So an order placed this week arrives in about ${C.INFO_DELAY + C.SHIP_DELAY} weeks, but only if the supplier has stock; if not, it waits in the supplier's backlog. Bottling takes ${C.PROD_DELAY} weeks from the week it is scheduled. In the supply-shock scenario the bottling line can schedule at most ${C.SHOCK.cap} cases a week from week ${C.SHOCK.from} to week ${C.SHOCK.to}.</p><p>Your <strong>supply line</strong> is everything you have ordered but not yet received: orders on their way to the supplier, cases the supplier owes you, and cases in transit.</p></div>`, false, '2');
    h += UI.fold('Costs and scoring', `<div class="case"><p>A case in stock costs ${usd2(C.HOLD)} a week to hold; a case of backlog costs ${usd2(C.BACK)} a week. Backlog never disappears: it is shipped as soon as stock allows.</p><p>Your score is 70% your own cost and 30% the whole chain's cost, each judged against two benchmarks played on the same shoppers and the same teammates: a <strong>typical player</strong> in your seat, ordering the way most people do (40 points), and the <strong>best simple ordering policy</strong> for your seat, tuned with hindsight (80 points). Beating that policy by 20% earns 100.</p></div>`, false, '3');
    h += UI.fold('Information settings', UI.table(['Setting', 'What you see'], Object.keys(C.INFO).map(k => [C.INFO[k].name, esc(C.INFO[k].blurb)]), { cls: 'wrap' }), false, '4');
    h += UI.fold('Scenarios', UI.table(['Scenario', 'Shoppers'], Object.keys(C.SCENARIOS).map(k => [C.SCENARIOS[k].name, esc(C.SCENARIOS[k].blurb)]), { cls: 'wrap' }) + '<p class="cap">You are not told when demand changes. You see it only through the orders you receive, unless sales data is shared.</p>', false, '5');
    h += UI.fold('Your teammates', `<div class="case"><p>The other firms are run by computer managers who order the way Sterman (1989) found real players do: they forecast by smoothing what they see, aim for a comfortable stock, and correct only part of the gap between what is in their pipeline and what should be. With shared sales data they forecast from shoppers' demand; with full visibility they also pay more attention to their pipeline.</p></div>`, false, '6');
    h += UI.fold('The calculator', `<div class="case"><p>At Foundation and Intermediate level the calculator suggests an order using an order-up-to policy: forecast + (stock target − stock now) × stock correction + (pipeline target − supply line) × pipeline correction. The pipeline target is the forecast times the weeks your orders spend in the pipe. You can tune its four settings and let it order for up to eight weeks at a time.</p></div>`, false, '7');
    h += UI.fold('Concepts', `<div class="ideas">${[
      ['The bullwhip effect.', 'Small swings in shopper demand become larger swings in orders at each step up the chain.'],
      ['Supply-line neglect.', 'Players forget orders already on their way, keep ordering while they wait, and are then swamped when it all arrives.'],
      ['Demand signal processing.', 'Each firm forecasts from the orders it receives, which already include the overreactions of the firms below.'],
      ['Information sharing.', 'Sharing point-of-sale data lets every firm forecast from real demand instead of distorted orders.'],
      ['Rationing and shortage gaming.', 'When supply is short, customers order more than they need to secure a share, which inflates orders further.'],
      ['Little’s law and lead time.', 'Longer pipelines hold more cases in transit and make every correction slower and riskier.']
    ].map(([a, b]) => `<p><strong>${a}</strong> ${b}</p>`).join('')}</div>`, false, '8');
    return h;
  }

  /* ---------- Debrief ---------- */
  function coachNotes(g, Bm, sc) {
    const notes = [], i = g.role, H = g.H.E[i], dem = g.H.dem;
    const mine = me(g).cost;
    notes.push(mine <= Bm.plan.cost ? `You beat the best simple policy for your seat: ${usd(mine)} against ${usd(Bm.plan.cost)}. A typical player would have spent ${usd(Bm.typical.cost)}.` : `Your seat cost ${usd(mine)}. The best simple policy, tuned with hindsight, cost ${usd(Bm.plan.cost)}; a typical player ${usd(Bm.typical.cost)}; simply passing on every order you received, ${usd(Bm.pass.cost)}.`);
    const peakO = Math.max(...H.map(x => x.order)), peakD = Math.max(...dem);
    if (peakO > peakD * 1.6) { const w = H.find(x => x.order === peakO).t; notes.push(`Your largest order was ${cs(peakO)} cases in week ${w}, while shoppers never bought more than ${cs(peakD)} in a week. That spike travels up the chain and comes back as excess stock.`); }
    const b = C.impliedBeta(g);
    if (b != null && b < 0.5) notes.push(`Your orders reacted to your stock but much less to your supply line: you counted about ${N.pct(clamp(b, 0, 1))} of what was already on its way. That is the classic cause of the bullwhip.`);
    else if (b != null && b >= 0.8) notes.push('You took your supply line into account when ordering. That is the single most important habit in this game.');
    const peakB = Math.max(...H.map(x => x.back)), peakS = Math.max(...H.map(x => x.inv));
    if (peakB > 15) { const w = H.find(x => x.back === peakB).t; notes.push(`Your backlog peaked at ${cs(peakB)} cases in week ${w}, costing ${usd2(C.BACK)} a case every week it lasted.`); }
    if (peakS > 40) { const w = H.find(x => x.inv === peakS).t; notes.push(`Your stock peaked at ${cs(peakS)} cases in week ${w}. Most of it was ordered during the shortage and arrived after it ended.`); }
    const bw = C.bullwhip(g);
    if (bw) notes.push(`Order swings grew ${N.num(bw[0], 1)}× at the retailer, ${N.num(bw[1], 1)}× at the wholesaler, ${N.num(bw[2], 1)}× at the distributor and ${N.num(bw[3], 1)}× at the factory, relative to shoppers' demand.`);
    if (g.cfg.info === 'none') notes.push('Try the same scenario with shared sales data: forecasting from real demand instead of incoming orders usually cuts the chain’s cost sharply.');
    void sc;
    return notes.slice(0, 6);
  }
  function debriefView(g, ctx) {
    const Bm = C.benchmarks(g), sc = C.score(g), i = g.role, bw = C.bullwhip(g) || [1, 1, 1, 1];
    let h = `<section class="sheet"><header class="sh"><span class="eyebrow">Debrief · Chain Lab</span></header><div class="grade"><span class="letter" aria-label="Grade ${S.grade(sc.total)}"><span class="hl draw">${S.grade(sc.total)}</span></span><div class="grade-txt"><span class="h2">${S.gradeWord(sc.total)}</span><span class="score num">${sc.total} / 100</span></div></div><p class="case">As the ${roleName(i).toLowerCase()} you spent <strong>${usd2(sc.mine)}</strong> over ${g.weeks} weeks; the whole chain spent ${usd2(sc.teamCost)}.</p>${UI.kpis([
      { k: 'Your seat', v: `${sc.seat} / 100`, d: `best policy ${usd(Bm.plan.cost)}` }, { k: 'The chain', v: `${sc.team} / 100`, d: `with that policy ${usd(Bm.plan.team)}` },
      { k: 'Orders filled on time', v: N.pct(C.fillRate(g, i)) }, { k: 'Your order swings', v: N.num(bw[i], 1) + '×', d: 'variance vs shoppers' }
    ])}<p class="cap">Score: 70% your seat, 30% the chain.</p></section>`;
    h += UI.sheet('The bullwhip, revealed', 'Every firm’s orders against shoppers’ demand', UI.chart('cl-db-orders', () => dataSpec(g, 'orders', true), 260, dataLegend(g, 'orders', true), 'Orders by firm') + '<p class="cap">Cases ordered each week by each firm, and what shoppers bought.</p>' + UI.chart('cl-db-stock', () => dataSpec(g, 'stock', true), 230, dataLegend(g, 'stock', true), 'Stock by firm') + '<p class="cap">Stock minus backlog at each firm.</p>');
    h += UI.sheet('Your seat against the benchmarks', 'Cumulative cost', UI.chart('cl-db-cum', () => { let a = 0; return { series: [{ values: g.H.E[i].map(x => (a += x.cost)), c: E_COL[i], w: 3, noDot: true }, { values: Bm.plan.cum, c: 'var(--good)', w: 1.8, noDot: true }, { values: Bm.typical.cum, c: 'var(--bad)', w: 1.8, noDot: true, dash: true }, { values: Bm.pass.cum, c: 'var(--s5)', w: 1.6, noDot: true, dash: true }], xLabel: k => 'W' + (k + 1), yMin: 0, yFmt: v => '$' + v }; }, 230, [{ t: 'You', c: E_COL[i] }, { t: 'Best simple policy', c: 'var(--good)' }, { t: 'Typical player', c: 'var(--bad)' }, { t: 'Pass every order on', c: 'var(--s5)' }], 'Cumulative cost against benchmarks') +
      `<p class="cap">The best simple policy for your seat used a stock target of ${N.num(Bm.plan.cover, 1)} weeks, closed ${N.pct(Bm.plan.adj)} of the stock gap and ${N.pct(Bm.plan.adjSL)} of the pipeline gap each week, with ${N.pct(Bm.plan.theta)} forecast weight.</p>`);
    h += UI.sheet('The chain', 'Cost by firm', UI.table(['Firm', 'Cost', 'Filled on time', 'Peak backlog', 'Peak stock', 'Order swings'], [0, 1, 2, 3].map(k => { const H = g.H.E[k]; return { cls: k === i ? 'me' : '', cells: [roleName(k) + (k === i ? ' (you)' : ''), usd2(g.E[k].cost), N.pct(C.fillRate(g, k)), cs(Math.max(...H.map(x => x.back))), cs(Math.max(...H.map(x => x.inv))), N.num(bw[k], 1) + '×'] }; }), { sticky: true, foot: ['Chain', usd2(sc.teamCost), '', '', '', ''] }) + `<p class="cap">If all four firms had used the calculator's default settings, the chain would have spent ${usd(Bm.team.cost)}.</p>`);
    h += `<section class="sheet"><header class="sh"><span class="eyebrow">Coach’s notes</span><h2>What to take away</h2></header><ul class="notes plain">${coachNotes(g, Bm, sc).map(n => `<li>${n}</li>`).join('')}</ul></section>`;
    const P = g.params;
    h += UI.sheet('Your teammates, revealed', 'How the computer managers ordered', UI.table(['Firm', 'Forecast weight', 'Stock gap closed', 'Supply line counted'], [0, 1, 2, 3].filter(k => k !== i).map(k => [roleName(k), N.pct(P[k].theta), N.pct(P[k].alpha), N.pct(g.cfg.info === 'full' ? Math.max(P[k].beta, 0.7) : P[k].beta)]), { sticky: true }) + '<p class="cap">Forecast weight is how much each week’s new information moves their forecast. Supply line counted is how much of what was already on its way they remembered when ordering.</p>');
    h += `<div class="actions"><button type="button" class="btn btn-primary" data-act="retry-run" data-id="${ctx.meta.id}">Replay this chain</button><button type="button" class="btn btn-ghost" data-act="new-run" data-module="chainlab">New chain</button>${UI.btn('Download the whole chain (CSV)', 'm', 'btn-ghost', 'data-op="csv-all"')}<button type="button" class="btn btn-ghost" data-act="leave-run">Back to home</button></div>`;
    return h;
  }

  /* ---------- Live ---------- */
  function live(g, ctx) {
    if (C.isDone(g) || uiStr(ctx, 'tab', 'play') !== 'play') return {};
    const L = { 'ord-hint': orderHint(g) };
    if (guided(g)) L.calc = calcHtml(g);
    return L;
  }

  S.App.register({
    id: 'chainlab', cat: 'ops', title: 'Chain Lab', area: 'Supply chain', length: '36 weeks · 25–40 min', depth: 'Full simulation', version: 1, persist: 'replay', wide: true,
    practises: 'Supply chain coordination · the bullwhip effect · ordering and inventory policy',
    blurb: 'Run one firm in a four-firm drinks supply chain, week by week. Orders and shipments take weeks to arrive, nobody shares what they see, and small changes in demand turn into wild swings. Keep your costs and the chain’s costs down.',
    detail: '<p>The classic beer-distribution game at full depth: retailer, wholesaler, distributor and factory, each with stock, backlog, an information delay on orders, a shipping delay and a production delay at the factory. Computer teammates order the way real players do. Five demand scenarios including promotions and a supply shock, three information settings from classic secrecy to full visibility, a pipeline view, an order-up-to calculator with an autopilot, weekly data with CSV export, and a debrief that reveals every firm’s orders against hindsight-tuned benchmarks.</p>',
    options: [
      { id: 'role', label: 'Your firm', default: 'wholesaler', choices: R.map(r => ({ v: r.id, t: r.name })) },
      { id: 'scenario', label: 'Scenario', default: 'classic', choices: Object.keys(C.SCENARIOS).map(k => ({ v: k, t: C.SCENARIOS[k].name })) },
      { id: 'info', label: 'Information', default: 'none', choices: Object.keys(C.INFO).map(k => ({ v: k, t: C.INFO[k].name })) },
      { id: 'weeks', label: 'Length', default: 36, choices: [{ v: 36, t: '36 weeks', s: 'About 25–40 minutes' }, { v: 52, t: '52 weeks', s: 'About 40–60 minutes' }] },
      { id: 'difficulty', label: 'Difficulty', default: 'guided', choices: [{ v: 'guided', t: 'Foundation', s: 'Calculator and autopilot' }, { v: 'standard', t: 'Intermediate', s: 'Calculator, no autopilot' }, { v: 'expert', t: 'Advanced', s: 'Your judgement only' }] }
    ],
    create: (seed, config) => C.create(seed, config),
    apply: (g, d) => C.apply(g, d),
    isDone: g => C.isDone(g),
    progress: g => (C.isDone(g) ? `Complete · ${g.weeks} weeks` : `Week ${W(g)} of ${g.weeks}`),
    view(g, ctx) {
      const done = C.isDone(g);
      let tab = uiStr(ctx, 'tab', done ? 'debrief' : 'play');
      if (done && tab === 'play') tab = 'debrief';
      if (!done && tab === 'debrief') tab = 'play';
      ctx.ui.tab = tab;
      let h = header(g, done);
      h += UI.tabs('tab', [{ v: done ? 'debrief' : 'play', t: done ? 'Debrief' : `Week ${W(g)}` }, { v: 'data', t: 'Data' }, { v: 'guide', t: 'Guide' }], tab, 'main-tabs', true);
      if (tab === 'play') h += playView(g, ctx);
      else if (tab === 'data') h += dataView(g, ctx);
      else if (tab === 'guide') h += guideView(g);
      else h += debriefView(g, ctx);
      return h;
    },
    live,
    onTab(g, group, value, ctx) { if (group === 'tab' && value !== 'play') ctx.ui.seenBrief = true; },
    field(g, name, value) {
      const d = g.draft; if (!d) return null;
      if (name === 'order') { d.order = clamp(Math.round(+value || 0), 0, 500); return null; }
      if (name === 'weeks') { d.weeks = clamp(Math.round(+value || 1), 1, 8); return null; }
      if (name.indexOf('c:') === 0) { const k = name.slice(2); d.calc[k] = k === 'cover' ? clamp(+value, 0, 8) : clamp((+value || 0) / 100, k === 'theta' ? 0.05 : 0, 1); return null; }
      return null;
    },
    act(g, op, el, ctx) {
      if (op === 'csv') { S.downloadText(`cascade-${R[g.role].id}-week-${W(g)}.csv`, csv(g, false), 'text/csv'); return null; }
      if (op === 'csv-all') { S.downloadText(`cascade-chain-${g.weeks}-weeks.csv`, csv(g, true), 'text/csv'); return null; }
      const d = g.draft; if (!d) return null;
      if (op === 'set') { d.order = clamp(Math.round(+el.dataset.v || 0), 0, 500); return { rerender: true }; }
      if (op === 'calc-reset') { d.calc = clone(C.CALC); return { rerender: true }; }
      if (op === 'play') { ctx.ui.seenBrief = true; const last = W(g) >= g.weeks; return { commit: { order: d.order, calc: clone(d.calc) }, top: false, toast: last ? 'Week ' + g.weeks + ' played. Here is your debrief.' : `Ordered ${plural(d.order, 'case')}. Week ${W(g) + 1}.` }; }
      if (op === 'auto' && S.lvlOf(g) !== 0) return null;
      if (op === 'auto') { ctx.ui.seenBrief = true; const n = Math.min(d.weeks, g.weeks - W(g) + 1); return { commit: { policy: Object.assign({ weeks: n }, d.calc), calc: clone(d.calc) }, top: false, toast: `The calculator ordered for ${plural(n, 'week')}.` }; }
      return null;
    },
    summary(g) {
      const sc = C.score(g), Bm = C.benchmarks(g);
      return { score: sc.total, line: `${roleName(g.role)} · your cost ${usd(sc.mine)} vs best policy ${usd(Bm.plan.cost)} · chain ${usd(sc.teamCost)}`, metrics: [{ k: 'Your cost', v: usd(sc.mine) }, { k: 'Chain cost', v: usd(sc.teamCost) }] };
    }
  });
})();
