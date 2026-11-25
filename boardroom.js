/* Boardroom: interface for the full company strategy simulation. The engine lives in boardroom-engine.js. */
(function () {
  'use strict';
  const S = window.SimLab, BE = window.BoardroomEngine;
  if (!S || !BE) return;
  const { UI, N, U } = S;
  const esc = U.esc, clamp = U.clamp, sum = U.sum, avg = U.avg, clone = U.clone;
  const SEGS = BE.SEGS;
  const CO_VAR = { you: 'var(--c-you)', bolt: 'var(--c-b)', cobalt: 'var(--c-c)', dynamo: 'var(--c-d)', ember: 'var(--c-e)', fulcrum: 'var(--c-f)' };
  const coCol = id => CO_VAR[id] || 'var(--ink-3)';
  const SEG_ORDER = [0, 1, 2, 3, 4];

  /* ---------- Formatting ---------- */
  const F = {
    m: (v, d) => N.m(v, d == null ? 1 : d),
    u: v => (Math.abs(v) >= 100 ? N.int(v) : N.num(v, 1)) + 'k',
    usd: v => N.usd(v),
    usd2: v => N.usd(v, 2),
    k: v => '$' + N.int(v) + 'k',
    nm: v => N.num(v, 1),
    kg: v => N.num(v, 2),
    h: v => N.int(v),
    yrs: v => N.num(v, 1),
    pct: (v, d) => N.pct(v, d == null ? 0 : d),
    yr: v => 'Y' + N.num(v, 1),
    x: v => N.num(v, 1),
    s: v => (v == null || !isFinite(v) ? '–' : N.num(v, 1))
  };
  const moneyAxis = v => (v < 0 ? N.MINUS : '') + '$' + Math.abs(v) + 'M';
  const dot = id => `<i class="cdot" style="background:${coCol(id)}" aria-hidden="true"></i>`;
  const segPill = s => `<span class="spill s${s}">${SEGS[s].name}</span>`;
  const signCls = v => (v > 0.0001 ? 'up' : v < -0.0001 ? 'down' : '');
  const chipBtn = (label, attrs) => `<button type="button" class="chip" data-act="m" ${attrs}>${label}</button>`;
  const mapH = big => { const w = typeof window !== 'undefined' && window.innerWidth ? window.innerWidth : 390; return w >= 900 ? (big ? 500 : 460) : w >= 600 ? 400 : (big ? 360 : 340); };

  /* ---------- Game helpers ---------- */
  const you = g => BE.you(g);
  const lastRep = g => g.reports[g.reports.length - 1];
  const active = g => BE.activeOf(g, you(g)).slice().sort((a, b) => a.seg - b.seg || (a.id < b.id ? -1 : 1));
  const envNow = g => BE.env(g, g.year);
  const guided = g => g.cfg.difficulty !== 'expert';
  const coached = g => S.lvlOf(g) === 0;
  const uiStr = (ctx, k, d) => (ctx.ui[k] == null || ctx.ui[k] === '' ? d : ctx.ui[k]);
  function plan(g) {
    const d = g.draft;
    const auto = BE.autoForecast(g, d);
    const fc = {};
    active(g).forEach(p => { const x = d.products[p.id]; fc[p.id] = x && x.forecast != null && isFinite(x.forecast) ? Math.max(0, +x.forecast) : (auto[p.id] || 0); });
    const pf = BE.proforma(g, d, fc);
    const est = guided(g) ? BE.estimate(g, d) : null;
    return { auto, fc, pf, est, cashEnd: pf.balance.cash - pf.cash.emergency };
  }
  function idealFor(g, s, when) {
    const e = envNow(g)[s], k = when === 'next' ? 1 : 0;
    return { t: Math.round((e.ix + e.dx * k) * 10) / 10, w: Math.round((e.iy + e.dy * k) * 100) / 100 };
  }
  function defaultNew(g, seg) {
    const e = envNow(g)[seg];
    return { seg, t: Math.round((e.cx + e.dx * (1 + SEGS[seg].lead) + e.dx * 0.5) * 10) / 10, w: Math.round((e.cy + e.dy * (1 + SEGS[seg].lead) + e.dy * 0.5) * 100) / 100, mtbf: Math.round((e.mlo + 0.8 * (e.mhi - e.mlo)) / 500) * 500, cap: Math.max(5, Math.round(BE.expectedSize(g, g.year + 1, seg) / 12)), auto: 4 };
  }
  function nextName(g) {
    const co = you(g), used = new Set(BE.prodsOf(g, co).map(p => p.name).concat(g.draft.newProducts.map(n => n.name)));
    return co.names.find(n => !used.has(n)) || 'N' + (BE.prodsOf(g, co).length + g.draft.newProducts.length + 1);
  }

  /* ---------- Decision checks ---------- */
  function checks(g, P) {
    const out = [], d = g.draft, E = envNow(g), co = you(g), gd = coached(g);
    if (P.cashEnd < 0) out.push({ t: 'bad', m: `Projected year-end cash is <strong>${F.m(P.cashEnd)}</strong>. The bank would cover the gap with an emergency loan at a 7.5% penalty, and your share price would drop 15%. Borrow in Finance or trim spending.` });
    else if (P.cashEnd < 3) out.push({ t: 'warn', m: `Projected year-end cash is only ${F.m(P.cashEnd)}. If sales miss your forecast, you could still need an emergency loan.` });
    const L = BE.finLimits(g, d.fin);
    if (L.maturing > 0) out.push({ t: 'info', m: `${F.m(L.maturing)} of bonds mature this year and are repaid from cash.` });
    const segBudget = [0, 0, 0, 0, 0], segHas = [0, 0, 0, 0, 0];
    active(g).forEach(p => {
      const x = d.products[p.id], e = E[p.seg]; if (!x) return;
      const nm = `<strong>${esc(p.name)}</strong>`;
      if (!p.launched) return;
      segHas[p.seg]++; segBudget[p.seg] += +x.sales || 0;
      const avail = p.inv + (+x.prod || 0), fc = P.fc[p.id] || 0;
      if (x.price > e.phi + 15) out.push({ t: 'bad', m: `${nm} is priced at ${F.usd(x.price)}, more than $15 above the ${e.name} range (${F.usd(e.plo)}–${F.usd(e.phi)}). Customers will not consider it.` });
      else if (x.price > e.phi) out.push({ t: 'warn', m: `${nm} is priced above the ${e.name} range (${F.usd(e.plo)}–${F.usd(e.phi)}), so it earns almost no price score.` });
      else if (x.price < e.plo - 20) out.push({ t: 'info', m: `${nm} is priced well below the ${e.name} range. Customers do not reward prices below ${F.usd(e.plo)}, so you are giving margin away.` });
      if (P.est && P.est[p.id] && P.est[p.id].score[p.seg] === 0) out.push({ t: 'bad', m: `${nm} falls outside what ${e.name} buyers will consider (position, price or reliability). It would sell almost nothing there.` });
      if (fc > 0.5 && avail < 0.92 * fc) out.push({ t: 'warn', m: `${nm} may stock out: ${F.u(avail)} available against a ${F.u(fc)} forecast.` });
      if (avail > 1.3 * fc + 2) out.push({ t: 'warn', m: `${nm} would end the year with about ${F.u(avail - fc)} unsold. Inventory costs 12% of its value a year to carry.` });
      if ((+x.prod || 0) > p.cap + 0.05) out.push({ t: 'info', m: `${nm} runs a second shift for ${F.pct(((+x.prod) - p.cap) / (+x.prod))} of its output. Those units cost 50% more in labour.` });
      const m = p.rd ? p.rd.mtbf : x.mtbf;
      if (m < e.mlo) out.push({ t: m < e.mlo - 1000 ? 'bad' : 'warn', m: `${nm}'s MTBF (${F.h(m)} h) is below the ${e.name} minimum of ${F.h(e.mlo)} h.` });
      if ((+x.promo || 0) < 300) out.push({ t: 'warn', m: `${nm} has almost no promotion budget. Awareness fades by a third each year without it.` });
      const info = BE.rdInfo(g, p.id, x.t, x.w, x.mtbf);
      if (info && info.time > 1) out.push({ t: 'info', m: `${nm}'s revision runs past year-end and completes in ${F.yr(info.done)}.` });
      if (gd && info && info.moved && SEGS[p.seg].age >= 4 && p.age < SEGS[p.seg].age + 1) out.push({ t: 'info', m: `Repositioning ${nm} halves its age. ${e.name} buyers prefer designs about ${SEGS[p.seg].age} years old.` });
      if (gd && !p.rd && info && info.time === 0) {
        const id = idealFor(g, p.seg, 'next');
        const dist = Math.hypot((p.t - id.t) / BE.TS, (p.w - id.w) / BE.WS);
        if (SEGS[p.seg].age < 4 && dist > 1.2) out.push({ t: 'warn', m: `${nm} is ${N.num(dist, 1)} units from where ${e.name} buyers will want it next year, and no revision is planned.` });
      }
      if (gd && x.capChange >= 0) {
        const nextCap = p.cap + (+x.capChange || 0), nextDem = fc * (1 + SEGS[p.seg].growth);
        if (nextCap > 0 && nextDem > 1.35 * nextCap) out.push({ t: 'info', m: `${nm}: next year's demand could reach ${F.u(nextDem)} against ${F.u(nextCap)} of capacity. Capacity bought now arrives next year.` });
      }
      if (x.capChange <= -p.cap && p.cap > 0) out.push({ t: 'info', m: `Selling all of ${nm}'s capacity retires it once its inventory is sold.` });
    });
    segHas.forEach((n, s) => { if (n && segBudget[s] < 300) out.push({ t: 'warn', m: `You have products in ${SEGS[s].name} but almost no sales budget there. Accessibility will fall.` }); });
    if (d.fin.apDays > 60) out.push({ t: 'warn', m: `Paying suppliers after ${d.fin.apDays} days means they hold back ${F.pct(clamp((d.fin.apDays - 60) / 10 * 0.03, 0, 0.3))} of materials, which cuts production.` });
    if (d.fin.arDays < 30) out.push({ t: 'info', m: `Collecting in ${d.fin.arDays} days frees cash, but customers buy a little less below 30 days.` });
    if ((+d.fin.dps || 0) * co.shares > Math.max(0, P.pf.income.ni) + 0.5) out.push({ t: 'warn', m: `Dividends of ${F.m(d.fin.dps * co.shares)} exceed projected net income of ${F.m(P.pf.income.ni)}.` });
    d.newProducts.forEach(np => out.push({ t: 'info', m: `New product <strong>${esc(np.name)}</strong> for ${SEGS[np.seg].name}: design work runs all year and it launches in Y${g.year + 1} with ${F.u(np.cap)} of capacity.` }));
    return out;
  }
  function finText(f) {
    const parts = [];
    if (+f.curDebt > 0) parts.push(`borrow ${F.m(+f.curDebt)} current debt`);
    if (+f.bondIssue > 0) parts.push(`issue ${F.m(+f.bondIssue)} of bonds`);
    if (+f.bondRetire > 0) parts.push(`retire ${F.m(+f.bondRetire)} of bonds`);
    if (+f.stockIssue > 0) parts.push(`issue ${F.m(+f.stockIssue)} of stock`);
    if (+f.stockBuy > 0) parts.push(`buy back ${F.m(+f.stockBuy)} of stock`);
    if (!parts.length) parts.push('no new borrowing or stock');
    parts.push(`dividend ${F.usd2(+f.dps || 0)} a share`, `receivables ${f.arDays} days`, `payables ${f.apDays} days`);
    return parts.join(' · ');
  }
  const countBad = list => list.filter(x => x.t === 'bad').length;
  const countWarn = list => list.filter(x => x.t === 'warn').length;

  /* ---------- Perceptual maps ---------- */
  function mapBounds(cxs, cys, padX, padY) {
    return { xmin: Math.floor((Math.min(...cxs) - padX) / 10) * 10, xmax: Math.ceil((Math.max(...cxs) + padX) / 10) * 10, ymin: Math.max(1.0, Math.floor((Math.min(...cys) - padY) * 10) / 10), ymax: Math.ceil((Math.max(...cys) + padY) * 10) / 10 };
  }
  function zonesFrom(segs, only) {
    return segs.filter((e, i) => only == null || only === i).map(e => ({ x: e.cx, y: e.cy, rx: BE.FINE * BE.TS, ry: BE.FINE * BE.WS, rx2: BE.ROUGH * BE.TS, ry2: BE.ROUGH * BE.WS, ideal: { x: e.ix, y: e.iy }, label: e.name }));
  }
  function rdMapSpec(g) {
    const E = envNow(g), rep = lastRep(g), d = g.draft;
    const arrows = [], points = [];
    rep.prods.filter(p => p.co !== 'you' && !p.retired && p.launched && (p.capNext > 0 || p.inv > 0.05)).forEach(p => points.push({ x: p.t, y: p.w, c: coCol(p.co), r: 3 }));
    E.forEach(e => arrows.push({ x1: e.ix, y1: e.iy, x2: e.ix + e.dx, y2: e.iy + e.dy, c: 'var(--ink-3)' }));
    active(g).forEach(p => {
      const x = d.products[p.id];
      if (!p.launched) { if (p.rd) points.push({ x: p.rd.t, y: p.rd.w, c: coCol('you'), r: 5, ring: true, big: true, label: p.name + ' (in design)' }); return; }
      const tgt = p.rd ? { t: p.rd.t, w: p.rd.w } : x ? { t: +x.t, w: +x.w } : null;
      points.push({ x: p.t, y: p.w, c: coCol('you'), r: 5.5, big: true, label: p.name });
      if (tgt && (Math.abs(tgt.t - p.t) > 0.04 || Math.abs(tgt.w - p.w) > 0.004)) { arrows.push({ x1: p.t, y1: p.w, x2: tgt.t, y2: tgt.w, c: coCol('you') }); points.push({ x: tgt.t, y: tgt.w, c: coCol('you'), r: 5, ring: true }); }
    });
    d.newProducts.forEach(np => points.push({ x: +np.t, y: +np.w, c: coCol('you'), r: 5, ring: true, big: true, label: (np.name || 'New') + ' (new)' }));
    const b = mapBounds(E.map(e => e.cx).concat(points.map(p => p.x)), E.map(e => e.cy).concat(points.map(p => p.y)), 27, 0.55);
    return { type: 'map', x: { min: b.xmin, max: b.xmax, label: 'Torque, Nm', fmt: v => v }, y: { min: b.ymin, max: b.ymax, reverse: true, label: 'Weight, kg (lighter is higher)', fmt: v => v.toFixed(1) }, zones: zonesFrom(E), arrows, points };
  }
  function repMapSpec(g, r, filterCo) {
    const points = [];
    r.prods.filter(p => !p.retired && p.launched && (p.capNext > 0 || p.inv > 0.05 || p.units > 0.05)).forEach(p => {
      const on = !filterCo || filterCo === 'all' || filterCo === p.co;
      points.push({ x: p.t, y: p.w, c: on ? coCol(p.co) : 'var(--rule)', r: p.co === 'you' ? 5 : 3.6, big: on && p.co === 'you', label: on && (p.co === 'you' || (filterCo && filterCo !== 'all')) ? p.name : null });
    });
    const b = mapBounds(r.segs.map(e => e.cx).concat(points.map(p => p.x)), r.segs.map(e => e.cy).concat(points.map(p => p.y)), 27, 0.55);
    return { type: 'map', x: { min: b.xmin, max: b.xmax, label: 'Torque, Nm', fmt: v => v }, y: { min: b.ymin, max: b.ymax, reverse: true, label: 'Weight, kg (lighter is higher)', fmt: v => v.toFixed(1) }, zones: zonesFrom(r.segs), points };
  }
  function segMapSpec(g, r, s) {
    const e = r.segs[s], points = [];
    r.prods.filter(p => !p.retired && p.launched && (p.dem[s] > 0.05 || p.soldSeg[s] > 0.05 || (p.seg === s && (p.capNext > 0 || p.inv > 0.05)))).forEach(p => points.push({ x: p.t, y: p.w, c: coCol(p.co), r: p.co === 'you' ? 5.5 : 4.2, big: p.co === 'you', label: p.name }));
    const pad = 3.1;
    return { type: 'map', x: { min: Math.floor(e.cx - pad * BE.TS), max: Math.ceil(e.cx + pad * BE.TS), label: 'Torque, Nm', fmt: v => v }, y: { min: Math.round((e.cy - pad * BE.WS) * 10) / 10, max: Math.round((e.cy + pad * BE.WS) * 10) / 10, reverse: true, label: 'Weight, kg', fmt: v => v.toFixed(1) }, zones: zonesFrom(r.segs, s), points };
  }

  /* ---------- Shared pieces ---------- */
  function header(g, done) {
    const r = lastRep(g), me = r.cos[0], R = me.res;
    const prev = g.reports.length > 1 ? g.reports[g.reports.length - 2].cos[0].res : null;
    const rank = r.cos.map(c => c.res.market.price).sort((a, b) => b - a).indexOf(R.market.price) + 1;
    return `<section class="sheet hdr"><div class="hdr-top"><div class="sh"><span class="eyebrow">${done ? `Final results · after year ${g.years}` : `Year ${g.year} of ${g.years} · decisions open`}</span><h2>Northstar Drives</h2></div><div class="hdr-pills">${UI.level(g.cfg.difficulty)}${UI.pill('Rating ' + R.market.rating, /^A/.test(R.market.rating) ? 'good' : R.market.rating === 'CCC' ? 'bad' : 'warn')}</div></div>${UI.kpis([
      { k: done ? 'Closing cash' : 'Cash now', v: F.m(R.balance.cash) },
      { k: 'Share price', v: F.usd2(R.market.price), d: prev ? N.sign(R.market.price - prev.market.price, v => '$' + v.toFixed(2)) + ` · #${rank} of 6` : `#${rank} of 6`, cls: prev ? signCls(R.market.price - prev.market.price) : '' },
      { k: `Net income Y${r.y}`, v: F.m(R.income.ni), d: prev ? N.sign(R.income.ni - prev.income.ni, v => F.m(v)) : '', cls: prev ? signCls(R.income.ni - prev.income.ni) : '' },
      { k: `Market share Y${r.y}`, v: F.pct(me.share, 1), d: g.reports.length > 1 ? N.sign((me.share - g.reports[g.reports.length - 2].cos[0].share) * 100, v => v.toFixed(1) + ' pts') : '', cls: g.reports.length > 1 ? signCls(me.share - g.reports[g.reports.length - 2].cos[0].share) : '' }
    ])}</section>`;
  }
  function stepsLink(sub, label) { return `<button type="button" class="link" data-act="tab" data-group="sub" data-value="${sub}" data-top="1">${label}</button>`; }
  function dock(g) {
    return `<div class="dock" role="region" aria-label="Plan summary"><div class="dock-in"><span class="dock-t" data-live="dock">${dockText(g, plan(g))}</span><button type="button" class="btn btn-primary dock-b" data-act="tab" data-group="sub" data-value="submit" data-top="1">Review<span class="dock-lg"> and submit</span></button></div></div>`;
  }
  function dockText(g, P) {
    const list = checks(g, P), b = countBad(list), w = countWarn(list);
    return `<span class="dock-l"><span>Year-end cash ${P.cashEnd < 0 ? `<b class="num down">${F.m(P.cashEnd)}</b>` : `<b class="num">${F.m(P.cashEnd)}</b>`}</span><span>Profit <b class="num">${F.m(P.pf.income.ni)}</b></span></span><span class="dock-l">${b ? `<span class="pill bad">${b} problem${b === 1 ? '' : 's'}</span>` : ''}${w ? `<span class="pill warn">${w} warning${w === 1 ? '' : 's'}</span>` : ''}${!b && !w ? '<span class="pill good">No warnings</span>' : ''}</span>`;
  }
  function pcardHead(p, extra) {
    return `<header class="pc-h"><span class="pc-n">${esc(p.name)}</span>${segPill(p.seg)}${extra || ''}</header>`;
  }
  function fieldBox(label, control, liveKey, hint) {
    return `<div class="fbox"><span class="lbl">${label}</span>${control}${liveKey || hint ? `<span class="hint"${liveKey ? ` data-live="${liveKey}"` : ''}>${hint || ''}</span>` : ''}</div>`;
  }

  /* ---------- Decide: brief ---------- */
  function caseBrief(open) {
    return UI.brief('Northstar Drives', open, `<p>You have just been named CEO of <strong>Northstar Drives</strong>, one of six companies that build electric drive units, the motor and gearbox at the heart of an e-bike, for bike brands around the world.</p><p>Until last year the industry was a single company. Regulators split it into six identical firms, so every company starts with the same five products, the same plants and the same balance sheet. From here, strategy decides everything.</p><p>Each year you design and reposition products (R&amp;D), set prices and marketing budgets, schedule production and invest in capacity and automation, raise or return money, and fund improvement programmes. All six companies decide at the same time. Then the market reacts and the industry report shows what happened.</p><p>Your board judges you on a <strong>balanced scorecard</strong> and on how you rank against the five rivals for profit, share price, market share and return on equity.</p>`, 'Buyers drift every year. Aim products at where each segment is going, not where it is.');
  }
  function newsItems(g, r) {
    const out = [];
    if (!r || r.y < 1) return out;
    const prev = g.reports[r.y - 1];
    r.prods.filter(p => p.co !== 'you').forEach(p => {
      const co = r.cos.find(c => c.id === p.co).short;
      if (p.isNew && !p.launched && p.pending == null && p.launchYear === r.y + 1) out.push(`${co} is designing <strong>${esc(p.name)}</strong> for ${SEGS[p.seg].name}, due in Y${r.y + 1}.`);
      if (p.isNew && p.launchYear === r.y + 1 && p.launched) out.push(`${co} has finished designing <strong>${esc(p.name)}</strong> for ${SEGS[p.seg].name}. It goes on sale in Y${r.y + 1}.`);
      if (p.cap > 0 && p.capNext === 0) out.push(`${co} sold all ${esc(p.name)} capacity and is leaving ${SEGS[p.seg].name}.`);
      else if (p.cap > 0 && p.capNext > 1.3 * p.cap) out.push(`${co} is adding ${F.pct(p.capNext / p.cap - 1)} capacity to ${esc(p.name)} (${SEGS[p.seg].name}).`);
      if (p.autoNext >= 7 && p.autoNext > p.auto) out.push(`${co} is raising ${esc(p.name)}'s automation to ${N.num(p.autoNext, 1)}.`);
    });
    r.cos.slice(1).forEach(c => { if (c.res.market.emergency > 0) out.push(`${c.short} needed an emergency loan of ${F.m(c.res.market.emergency)}.`); });
    if (prev) r.cos.slice(1).forEach((c, k) => { const pc = prev.cos[k + 1]; if (c.res.market.price > pc.res.market.price * 1.25) out.push(`${c.short}'s share price jumped to ${F.usd2(c.res.market.price)}.`); });
    return out.slice(0, 7);
  }
  function briefView(g, ctx) {
    const r = lastRep(g), E = envNow(g), first = g.year === 1;
    let h = caseBrief(first && !ctx.ui.seenBrief);
    const me = r.cos[0], R = me.res;
    const lead = r.cos.slice().sort((a, b) => b.res.market.price - a.res.market.price)[0];
    h += UI.sheet(first ? 'Your starting position' : `Last year · Y${r.y}`, first ? 'Every company starts level' : `${F.m(R.income.ni)} net income on ${F.m(R.income.rev)} of sales`,
      `<p class="case">${first ? `In the starting year (Y0) each company sold about ${F.u(r.cos[0].units)} drive units for ${F.m(R.income.rev)} and earned ${F.m(R.income.ni)}. The market grows 7.5% to 18% a year depending on segment, so standing still means falling behind.` : `Northstar sold ${F.u(me.units)} units, ${F.pct(me.share, 1)} of the market. ${lead.id === 'you' ? 'Your share price leads the industry.' : `${esc(lead.short)} leads the industry on share price at ${F.usd2(lead.res.market.price)}.`}${R.market.emergency > 0 ? ` <strong class="down">You needed an emergency loan of ${F.m(R.market.emergency)}.</strong>` : ''}`}</p>` +
      UI.table(['Company', 'Share price', 'Sales', 'Net income', 'Market share'], r.cos.map(c => ({ cls: c.id === 'you' ? 'me' : '', cells: [dot(c.id) + esc(c.short), F.usd2(c.res.market.price), F.m(c.res.income.rev), F.m(c.res.income.ni), F.pct(c.share, 1)] })), { sticky: true }) +
      `<div class="actions">${UI.btn('Open the full industry report', 'm', 'btn-ghost', 'data-op="goto" data-tab="reports" data-rep="summary"')}</div>`);
    const news = newsItems(g, r);
    if (news.length) h += UI.sheet('Industry news', 'What rivals did last year', `<ul class="news">${news.map(n => `<li>${n}</li>`).join('')}</ul>`);
    h += UI.sheet(`Market outlook · Y${g.year}`, 'What each segment wants this year', UI.table(['Segment', 'Expected demand', 'Growth', 'Price range', 'Ideal torque', 'Ideal weight', 'MTBF range', 'Ideal age'], E.map(e => ({ cells: [segPill(e.i), F.u(BE.expectedSize(g, g.year, e.i)), '+' + F.pct(e.growth, 1), `${F.usd(e.plo)}–${F.usd(e.phi)}`, F.nm(e.ix) + ' Nm', F.kg(e.iy) + ' kg', `${F.h(e.mlo)}–${F.h(e.mhi)} h`, F.yrs(e.age) + ' yrs'] })), { sticky: true }) +
      `<p class="cap">Demand in thousands of units. Ideal spots move every year: torque rises and weight falls. Each segment's buying criteria are in the Guide.</p>`);
    h += UI.sheet('Plan the year', 'Work through the tabs in order', `<ol class="steps">
      <li><strong>${stepsLink('rd', 'R&amp;D')}</strong>: reposition products toward next year's ideal spot, raise reliability, or design a new product.</li>
      <li><strong>${stepsLink('mkt', 'Marketing')}</strong>: set price, promotion and sales budgets, and your sales forecast for each product.</li>
      <li><strong>${stepsLink('prod', 'Production')}</strong>: schedule production against the forecast, buy capacity for next year, raise automation.</li>
      <li><strong>${stepsLink('fin', 'Finance')}</strong>: fund the plan with debt or stock, set dividends and payment terms.</li>
      <li><strong>${stepsLink('init', 'Initiatives')}</strong>: invest in lean, supplier, digital, customer and workforce programmes.</li>
      <li><strong>${stepsLink('pf', 'Pro forma')}</strong>: check projected statements, then ${stepsLink('submit', 'review and submit')}.</li></ol>${coached(g) ? `<p class="note">${coachTip(g)}</p>` : ''}`);
    return h;
  }
  function coachTip(g) {
    const y = g.year;
    const tips = {
      1: 'Every segment is growing, and capacity takes a year to arrive. Look at next year’s demand before you settle production.',
      2: 'Check the Segments report: whose products have higher survey scores than yours, and why?',
      3: 'Automation cuts labour cost but makes every redesign slower. Automate where buyers care about price, not novelty.',
      4: 'Look for segments where demand outruns everyone’s capacity. A new product there can pay back quickly.',
      5: 'Watch leverage: a little debt raises return on equity, too much raises your interest rate.',
      6: 'Late in the game, investments must pay back within the years you have left.',
      7: 'Two years left. Capacity bought now only produces for one year.',
      8: 'Final year. Do not build inventory you cannot sell, and do not buy capacity you will never use.'
    };
    return tips[y] || tips[8];
  }

  /* ---------- Decide: R&D ---------- */
  function rdView(g) {
    const d = g.draft, E = envNow(g);
    let h = UI.sheet(`Perceptual map · Y${g.year}`, 'Where buyers are and where your products sit',
      UI.chart('rdmap', () => rdMapSpec(g), mapH(), [{ t: 'Northstar products (rings and arrows: planned revisions)', c: 'var(--c-you)' }, { t: 'Rival products, end of last year', c: 'var(--ink-3)' }, { t: 'Segments: inner fine cut, outer rough cut, + ideal spot, grey arrow drift to next year', c: 'var(--hl)' }], 'Perceptual map of torque against weight') +
      `<p class="cap">Buyers only consider products inside a segment's outer ring. Within it, the closer a product sits to the ideal spot (+), the higher its positioning score. Ideal spots move every year.</p>`);
    h += `<div class="pgrid2">${active(g).map(p => rdCard(g, p, d.products[p.id], E[p.seg])).join('')}</div>`;
    h += newProductsSheet(g);
    return h;
  }
  function rdCard(g, p, x, e) {
    if (!p.launched) return `<article class="sheet pcard">${pcardHead(p, UI.pill('In design', 'pen'))}<p class="case">${esc(p.name)} is being designed for ${e.name} and launches in Y${p.launchYear}: ${F.nm(p.rd.t)} Nm, ${F.kg(p.rd.w)} kg, MTBF ${F.h(p.rd.mtbf)} h. Set its price and budgets in Marketing next year.</p></article>`;
    const locked = !!p.rd;
    const now = idealFor(g, p.seg, 'now'), nx = idealFor(g, p.seg, 'next');
    const spec = `<p class="spec num">Now ${F.nm(p.t)} Nm · ${F.kg(p.w)} kg · MTBF ${F.h(p.mtbf)} h · age ${F.yrs(p.age)} yrs</p><p class="cap">${e.name} ideal spot: ${F.nm(now.t)} Nm, ${F.kg(now.w)} kg this year; ${F.nm(nx.t)} Nm, ${F.kg(nx.w)} kg next year · MTBF ${F.h(e.mlo)}–${F.h(e.mhi)} h · ideal age ${SEGS[p.seg].age} yrs</p>`;
    if (locked) return `<article class="sheet pcard">${pcardHead(p, UI.pill('Revision under way', 'pen'))}${spec}<p class="case">The current project moves ${esc(p.name)} to ${F.nm(p.rd.t)} Nm, ${F.kg(p.rd.w)} kg, MTBF ${F.h(p.rd.mtbf)} h and completes in ${F.yr(g.year + p.rd.left)}. You can start a new project once it finishes.</p></article>`;
    const id = p.id;
    return `<article class="sheet pcard">${pcardHead(p)}${spec}<div class="pgrid">${
      fieldBox('Torque (Nm)', UI.num(`p:${id}:t`, x.t, { min: 20, max: 180, step: 0.5, dec: 1, label: p.name + ' torque' }))}${
      fieldBox('Weight (kg)', UI.num(`p:${id}:w`, x.w, { min: 1.2, max: 5, step: 0.02, dec: 2, label: p.name + ' weight' }))}${
      fieldBox('MTBF (hours)', UI.num(`p:${id}:mtbf`, x.mtbf, { min: 5000, max: 30000, step: 500, dec: 0, label: p.name + ' MTBF' }))}</div><p class="hint" data-live="rd:${id}">${rdHint(g, p, x)}</p><div class="chips sm">${chipBtn('This year’s ideal', `data-op="rd-aim" data-pid="${id}" data-when="now"`)}${chipBtn('Next year’s ideal', `data-op="rd-aim" data-pid="${id}" data-when="next"`)}${chipBtn('Keep design', `data-op="rd-keep" data-pid="${id}"`)}</div></article>`;
  }
  function rdHint(g, p, x) {
    const info = BE.rdInfo(g, p.id, +x.t, +x.w, +x.mtbf);
    if (!info || info.time === 0) return 'No revision planned. The design ages one year.';
    const e = envNow(g)[p.seg];
    const dc = Math.hypot((+x.t - (e.cx + e.dx)) / BE.TS, (+x.w - (e.cy + e.dy)) / BE.WS);
    return `Project <strong>${N.num(info.time, 2)} years</strong>, completes <strong>${F.yr(info.done)}</strong> · cost <strong>${F.m(info.cost, 2)}</strong>${info.ageAfter != null ? ` · age after revision about ${F.yrs(info.ageAfter + 0)} yrs at year-end` : info.moved ? ' · age resets when it completes' : ' · reliability only, age unchanged'} · material cost then ${F.usd(BE.material(+x.t, +x.w, +x.mtbf, g.year))}/unit${dc > BE.ROUGH ? ` · <span class="down">outside next year's ${e.name} rough cut</span>` : ''}`;
  }
  function newProductsSheet(g) {
    const d = g.draft, co = you(g);
    const total = BE.prodsOf(g, co).length + d.newProducts.length;
    let body = `<p class="case">A new product takes about a year to design (less with digital development) and costs ${F.m(BE.NEW_RD)} plus extra for high reliability. Buy its capacity now: the plant is built this year and the product goes on sale next year.</p>`;
    d.newProducts.forEach((np, i) => {
      body += `<article class="np"><header class="pc-h"><span class="pc-n" data-live="npn:${i}">${esc(np.name)}</span>${segPill(np.seg)}<button type="button" class="link danger" data-act="m" data-op="np-del" data-i="${i}">Remove</button></header>${UI.chips(`np:${i}:seg`, 'Segment', SEGS.map((s, k) => ({ v: k, t: s.name })), np.seg)}<div class="pgrid">${
        fieldBox('Name', `<input class="ti" type="text" maxlength="16" data-field="np:${i}:name" value="${esc(np.name)}" aria-label="New product name" autocomplete="off">`)}${
        fieldBox('Torque (Nm)', UI.num(`np:${i}:t`, np.t, { min: 20, max: 180, step: 0.5, dec: 1, label: 'New product torque' }))}${
        fieldBox('Weight (kg)', UI.num(`np:${i}:w`, np.w, { min: 1.2, max: 5, step: 0.02, dec: 2, label: 'New product weight' }))}${
        fieldBox('MTBF (hours)', UI.num(`np:${i}:mtbf`, np.mtbf, { min: 5000, max: 30000, step: 500, dec: 0, label: 'New product MTBF' }))}${
        fieldBox('Capacity (k units)', UI.num(`np:${i}:cap`, np.cap, { min: 1, max: 500, step: 1, dec: 0, label: 'New product capacity' }))}${
        fieldBox('Automation', UI.num(`np:${i}:auto`, np.auto, { min: 1, max: 10, step: 0.5, dec: 1, label: 'New product automation' }))}</div><p class="hint" data-live="np:${i}">${npHint(g, np)}</p></article>`;
    });
    if (total < 8) body += `<div class="actions">${UI.btn('Plan a new product', 'm', 'btn-ghost', 'data-op="np-add"')}</div>`;
    else body += '<p class="cap">You have reached the limit of eight products.</p>';
    return UI.sheet('New products', d.newProducts.length ? `${d.newProducts.length} planned this year` : 'Launch a product into a segment', body);
  }
  function npHint(g, np) {
    const co = you(g), time = 1.0 * (1 - BE.initEff(co).digital);
    const cap = (+np.cap || 0) * BE.capCost(+np.auto || 4) / 1000;
    return `Design ${N.num(time, 2)} years, ${F.m(BE.newRdCost(+np.mtbf || 15000), 2)} · plant ${F.u(+np.cap || 0)} at automation ${N.num(+np.auto || 4, 1)}: ${F.m(cap)} · on sale from Y${g.year + 1} · material ${F.usd(BE.material(+np.t, +np.w, +np.mtbf, g.year + 1))}/unit`;
  }

  /* ---------- Decide: marketing ---------- */
  function mktView(g) {
    const d = g.draft, E = envNow(g), P = plan(g);
    let h = UI.sheet(`Pricing and demand · Y${g.year}`, 'Set price, promotion, sales and your forecast', `<p class="case">Price is judged against each segment's range. Promotion builds awareness of a product; the sales budget builds accessibility, which every one of your products in that segment shares. Both fade by a third each year without spending. Your sales forecast drives the pro forma and the default production plan.</p>${guided(g) ? '<p class="cap">The estimate assumes rivals keep last year’s prices and designs. They will not.</p>' : '<p class="cap">Expert mode: no demand estimates. Forecast from the Segments report and last year’s sales.</p>'}`);
    h += `<div class="pgrid2">${active(g).map(p => {
      const x = d.products[p.id], e = E[p.seg], id = p.id;
      if (!p.launched) return `<article class="sheet pcard">${pcardHead(p, UI.pill('Launches Y' + p.launchYear, 'pen'))}<p class="cap">${esc(p.name)} is still in design. You will set its price and budgets next year.</p></article>`;
      const auto = x.forecast == null;
      return `<article class="sheet pcard">${pcardHead(p)}<p class="cap">${e.name} price range ${F.usd(e.plo)}–${F.usd(e.phi)} this year · last year ${F.usd(p.price)}${p.last ? `, sold ${F.u(p.last.sold)}` : ''}</p><div class="pgrid">${
        fieldBox('Price ($/unit)', UI.num(`p:${id}:price`, x.price, { min: 50, max: 900, step: 1, dec: 0, label: p.name + ' price' }))}${
        fieldBox('Promotion ($k)', UI.num(`p:${id}:promo`, x.promo, { min: 0, max: BE.BUDGET_CAP, step: 100, dec: 0, label: p.name + ' promotion budget' }))}${
        fieldBox('Sales budget ($k)', UI.num(`p:${id}:sales`, x.sales, { min: 0, max: BE.BUDGET_CAP, step: 100, dec: 0, label: p.name + ' sales budget' }))}${
        fieldBox(`Forecast (k units)${auto ? ' <span class="tag">auto</span>' : ` <button type="button" class="link" data-act="m" data-op="fc-auto" data-pid="${id}">use auto</button>`}`, UI.num(`p:${id}:forecast`, auto ? Math.round(P.fc[id] * 10) / 10 : x.forecast, { min: 0, max: 3000, step: 1, dec: 1, label: p.name + ' sales forecast' }))}</div><p class="hint" data-live="mk:${id}">${mkHint(g, p, x, P)}</p></article>`;
    }).join('')}</div>`;
    h += UI.sheet('Accessibility', 'Sales coverage by segment', `<div data-live="mk-acc">${accTable(g)}</div><p class="cap">Accessibility is shared by all your products in a segment and is driven by their combined sales budgets.</p>`);
    return h;
  }
  function mkHint(g, p, x, P) {
    const co = you(g), awN = BE.awNext(p.aw, +x.promo || 0);
    const mat = BE.material(p.rd && p.rd.left <= 1 ? p.rd.t : p.t, p.rd && p.rd.left <= 1 ? p.rd.w : p.w, p.rd && p.rd.left <= 1 ? p.rd.mtbf : p.mtbf, g.year) * (1 - BE.initEff(co).supplier);
    const lab = BE.laborRate(co, p.auto, g.year), cost = mat + lab, margin = (+x.price || 0) - cost;
    let s = `Awareness ${F.pct(p.aw)} → ${F.pct(awN)} · unit cost about ${F.usd(cost)}, margin ${F.usd(margin)} (${F.pct(margin / Math.max(1, +x.price || 1))})`;
    if (P.est && P.est[p.id]) { const es = P.est[p.id]; s += ` · <strong>estimate: survey score ${es.score[p.seg]}, demand about ${F.u(es.demand)}</strong>`; }
    return s;
  }
  function accTable(g) {
    const co = you(g), d = g.draft, rows = [];
    SEGS.forEach((s, i) => {
      const prods = active(g).filter(p => p.seg === i && p.launched);
      if (!prods.length && co.acc[i] < 0.05) return;
      const budget = sum(prods.map(p => +(d.products[p.id] || {}).sales || 0));
      rows.push([segPill(i), F.k(budget), F.pct(co.acc[i]), F.pct(BE.accNext(co.acc[i], budget))]);
    });
    return rows.length ? UI.table(['Segment', 'Sales budget', 'Now', 'After this year'], rows) : '<p class="cap">No products on sale.</p>';
  }

  /* ---------- Decide: production ---------- */
  function prodView(g) {
    const d = g.draft, P = plan(g), co = you(g);
    let h = UI.sheet(`Production · Y${g.year}`, 'Schedule output and invest in plant', `<p class="case">You can produce up to twice a line's capacity. Units above capacity run on a second shift and cost 50% more in labour. Capacity you buy or sell takes effect next year. Automation cuts labour cost by about 8.5% of the base rate per point, but every redesign takes longer on a highly automated line.</p><p class="cap">New capacity costs $80 plus $50 per automation point for each unit a year. Raising automation costs $50 per point per unit of capacity. Selling capacity returns 65% of its book value. Labour rates rise 3% a year.</p>`);
    h += `<div class="pgrid2">${active(g).map(p => {
      const x = d.products[p.id], id = p.id;
      if (!p.launched) return `<article class="sheet pcard">${pcardHead(p, UI.pill('Launches Y' + p.launchYear, 'pen'))}<p class="cap">Plant under construction: ${F.u(p.capNext)} at automation ${N.num(p.autoNext, 1)}, ready in Y${p.launchYear}.</p></article>`;
      return `<article class="sheet pcard">${pcardHead(p)}<p class="cap num">Inventory ${F.u(p.inv)} · capacity ${F.u(p.cap)} · automation ${N.num(p.auto, 1)} · forecast ${F.u(P.fc[id])}</p><div class="pgrid">${
        fieldBox('Production (k units)', UI.num(`p:${id}:prod`, x.prod, { min: 0, max: Math.round(2 * p.cap * 10) / 10, step: 1, dec: 1, label: p.name + ' production' }))}${
        fieldBox('Capacity ± (k units)', UI.num(`p:${id}:capChange`, x.capChange, { min: -p.cap, max: 2000, step: 1, dec: 0, label: p.name + ' capacity change' }))}${
        fieldBox('Automation next year', UI.num(`p:${id}:autoNext`, x.autoNext, { min: 1, max: 10, step: 0.5, dec: 1, label: p.name + ' automation next year' }))}</div><p class="hint" data-live="pr:${id}">${prHint(g, p, x, P)}</p><div class="chips sm">${chipBtn('Produce to forecast', `data-op="prod-fit" data-pid="${id}"`)}${chipBtn('Size capacity for next year', `data-op="cap-fit" data-pid="${id}"`)}</div></article>`;
    }).join('')}</div>`;
    h += UI.sheet('Plant investment', 'This year’s capital spending', `<div data-live="pr-tot">${prTotals(g)}</div>`);
    return h;
  }
  function prHint(g, p, x, P) {
    const co = you(g), prod = +x.prod || 0, avail = p.inv + prod;
    const second = Math.max(0, prod - p.cap), chg = Math.round(+x.capChange || 0), autoN = +x.autoNext || p.auto;
    const capCost = chg > 0 ? chg * BE.capCost(autoN) / 1000 : chg < 0 && p.cap > 0 ? -0.65 * (p.gross - p.accDep) * (-chg / p.cap) : 0;
    const autoCost = autoN > p.auto ? (autoN - p.auto) * BE.AUTO_COST * Math.max(0, p.cap + chg) / 1000 : 0;
    const labNow = BE.laborRate(co, p.auto, g.year), labNext = BE.laborRate(co, autoN, g.year + 1);
    return `Available ${F.u(avail)} vs forecast ${F.u(P.fc[p.id])}${second > 0 ? ` · second shift ${F.pct(second / Math.max(0.01, prod))} of output` : ''} · utilisation ${F.pct(prod / Math.max(0.01, p.cap))} · labour ${F.usd(labNow)}/unit now${autoN !== p.auto ? `, ${F.usd(labNext)} next year at ${N.num(autoN, 1)}` : ''}${capCost > 0 ? ` · capacity ${F.m(capCost)}` : capCost < 0 ? ` · sale returns ${F.m(-capCost)}` : ''}${autoCost > 0 ? ` · automation ${F.m(autoCost)}` : ''} · next year ${F.u(Math.max(0, p.cap + chg))}`;
  }
  function prTotals(g) {
    const d = g.draft;
    let capex = 0, sale = 0, auto = 0, units = 0, cap = 0, newCap = 0;
    active(g).forEach(p => {
      const x = d.products[p.id]; if (!x || !p.launched) return;
      const chg = Math.round(+x.capChange || 0), autoN = +x.autoNext || p.auto;
      if (chg > 0) capex += chg * BE.capCost(autoN) / 1000;
      if (chg < 0 && p.cap > 0) sale += 0.65 * (p.gross - p.accDep) * (-chg / p.cap);
      if (autoN > p.auto) auto += (autoN - p.auto) * BE.AUTO_COST * Math.max(0, p.cap + chg) / 1000;
      units += +x.prod || 0; cap += p.cap;
    });
    d.newProducts.forEach(np => { newCap += (+np.cap || 0) * BE.capCost(+np.auto || 4) / 1000; });
    return UI.kpis([{ k: 'New capacity', v: F.m(capex + newCap) }, { k: 'Automation', v: F.m(auto) }, { k: 'Plant sold', v: F.m(sale) }, { k: 'Overall utilisation', v: F.pct(units / Math.max(0.01, cap)) }]);
  }

  /* ---------- Decide: finance ---------- */
  function finView(g) {
    const d = g.draft, co = you(g), L = BE.finLimits(g, d.fin), F2 = d.fin;
    const r = lastRep(g).cos[0].res;
    let h = UI.sheet(`Finance · Y${g.year}`, 'Fund the plan', UI.kpis([
      { k: 'Cash now', v: F.m(co.cash) }, { k: 'Bonds outstanding', v: F.m(BE.bondTotal(co)) }, { k: 'Current debt due', v: F.m(co.curDebt) }, { k: 'Share price', v: F.usd2(co.price), d: `${N.num(co.shares, 3)}M shares` }
    ]) + `<p class="case">Current debt is a one-year loan: last year's balance${co.curDebt > 0 ? ` (${F.m(co.curDebt)})` : ''} is repaid at the start of this year, and what you borrow now is due next year. Bonds run ten years. If cash would end the year below zero, the bank lends you the gap as an emergency loan with a 7.5% penalty, cuts your rating to CCC and your share price falls.</p>`);
    h += `<div class="pgrid2"><article class="sheet pcard"><header class="pc-h"><span class="pc-n">Borrowing</span></header><div class="pgrid">${
      fieldBox('Current debt ($M)', UI.num('f:curDebt', F2.curDebt, { min: 0, max: Math.floor(L.cur * 10) / 10, step: 0.5, dec: 1, label: 'Current debt' }), 'fi:cur')}${
      fieldBox('Issue bonds ($M)', UI.num('f:bondIssue', F2.bondIssue, { min: 0, max: Math.floor(L.bond * 10) / 10, step: 0.5, dec: 1, label: 'Bonds to issue' }), 'fi:bond')}${
      fieldBox('Retire bonds early ($M)', UI.num('f:bondRetire', F2.bondRetire, { min: 0, max: Math.floor(L.retire * 10) / 10, step: 0.5, dec: 1, label: 'Bonds to retire' }), 'fi:ret')}</div></article>` +
      `<article class="sheet pcard"><header class="pc-h"><span class="pc-n">Shareholders</span></header><div class="pgrid">${
      fieldBox('Issue stock ($M)', UI.num('f:stockIssue', F2.stockIssue, { min: 0, max: Math.floor(L.stockIssue * 10) / 10, step: 0.5, dec: 1, label: 'Stock to issue' }), 'fi:si')}${
      fieldBox('Buy back stock ($M)', UI.num('f:stockBuy', F2.stockBuy, { min: 0, max: Math.floor(L.stockBuy * 10) / 10, step: 0.5, dec: 1, label: 'Stock to buy back' }), 'fi:sb')}${
      fieldBox('Dividend per share ($)', UI.num('f:dps', F2.dps, { min: 0, max: 20, step: 0.05, dec: 2, label: 'Dividend per share' }), 'fi:dps')}</div></article>` +
      `<article class="sheet pcard"><header class="pc-h"><span class="pc-n">Working capital</span></header><div class="pgrid">${
      fieldBox('Receivable days', UI.num('f:arDays', F2.arDays, { min: 0, max: 90, step: 5, dec: 0, label: 'Accounts receivable days' }), 'fi:ar')}${
      fieldBox('Payable days', UI.num('f:apDays', F2.apDays, { min: 0, max: 90, step: 5, dec: 0, label: 'Accounts payable days' }), 'fi:ap')}</div></article></div>`;
    h += UI.sheet('Projection', 'Cash and leverage after this plan', `<div data-live="fi-sum">${finSummary(g, plan(g))}</div>${coached(g) ? `<div class="actions">${UI.btn('Cover any shortfall with debt', 'm', 'btn-ghost', 'data-op="fin-cover"')}</div>` : ''}`);
    h += UI.sheet('Bonds', 'Outstanding issues', co.bonds.length ? UI.table(['Amount', 'Coupon', 'Interest a year', 'Matures'], co.bonds.slice().sort((a, b) => a.due - b.due).map(b => [F.m(b.amt), N.num(b.rate, 2) + '%', F.m(b.amt * b.rate / 100, 2), 'Y' + b.due + (b.due <= g.year ? ' (this year)' : '')])) + `<p class="cap">Early retirement repays the highest coupons first. Last year's interest cover was ${N.num(Math.min(99, r.market.cov), 1)}×.</p>` : '<p class="cap">No bonds outstanding.</p>');
    return h;
  }
  function finHints(g) {
    const d = g.draft, L = BE.finLimits(g, d.fin), co = you(g);
    return {
      'fi:cur': `Rate ${N.num(L.curRate, 2)}% · limit ${F.m(L.cur)} (from receivables and inventory)`,
      'fi:bond': `10-year at about ${N.num(L.bondRate, 2)}% · limit ${F.m(L.bond)} (75% of net plant less bonds)`,
      'fi:ret': `Up to ${F.m(L.retire)}, at face value`,
      'fi:si': `At ${F.usd2(co.price)} a share, 5% fee · limit ${F.m(L.stockIssue)}`,
      'fi:sb': `At a 1.5% premium · limit ${F.m(L.stockBuy)}`,
      'fi:dps': `Total ${F.m((+d.fin.dps || 0) * co.shares)} on ${N.num(co.shares, 3)}M shares`,
      'fi:ar': (+d.fin.arDays) < 30 ? 'Below 30 days customers buy a little less' : (+d.fin.arDays) > 30 ? 'Generous terms help sales a little but tie up cash' : 'Industry standard',
      'fi:ap': (+d.fin.apDays) > 60 ? '<span class="down">Above 60 days suppliers hold back materials</span>' : 'Paying later frees cash'
    };
  }
  function finSummary(g, P) {
    const pf = P.pf, B = pf.balance, M = pf.market;
    return UI.kpis([
      { k: 'Year-end cash', v: P.cashEnd < 0 ? `<span class="down">${F.m(P.cashEnd)}</span>` : F.m(P.cashEnd), d: P.cashEnd < 0 ? 'emergency loan' : '' },
      { k: 'Net income', v: F.m(pf.income.ni) },
      { k: 'Debt to assets', v: F.pct((B.curDebt + B.bonds) / Math.max(1, B.assets)) },
      { k: 'Leverage', v: N.num(M.leverage, 2) + '×', d: 'assets ÷ equity' }
    ]) + `<p class="cap">Based on your sales forecasts in Marketing. If you sell less than forecast, cash will be lower.</p>`;
  }

  /* ---------- Decide: initiatives ---------- */
  const INIT_INFO = {
    lean: { t: 'Lean manufacturing', d: 'Cuts labour cost per unit on every line.', fx: v => `labour cost ${N.MINUS}${N.num(v * 100, 1)}%` },
    supplier: { t: 'Supplier partnerships', d: 'Cuts material cost per unit.', fx: v => `material cost ${N.MINUS}${N.num(v * 100, 1)}%` },
    digital: { t: 'Digital product development', d: 'Shortens every R&D project, including new products.', fx: v => `R&D time ${N.MINUS}${N.num(v * 100, 0)}%` },
    customer: { t: 'Customer experience', d: 'Lifts customer survey scores in every segment.', fx: v => `survey scores +${N.num(v * 100, 1)}%` },
    workforce: { t: 'Workforce training', d: 'Cuts labour cost per unit, on top of lean.', fx: v => `labour cost ${N.MINUS}${N.num(v * 100, 1)}%` }
  };
  function initView(g) {
    const d = g.draft;
    let h = UI.sheet(`Initiatives · Y${g.year}`, 'Invest in capabilities', `<p class="case">Each budget builds a capability that fades 15% a year without new spending. Effects are capped and show diminishing returns, so steady funding beats one big year. Initiative spending is expensed this year; the benefits arrive this year and grow over time.</p>`);
    h += `<div class="pgrid2">${BE.INIT_KEYS.map(k => {
      const I = INIT_INFO[k];
      return `<article class="sheet pcard"><header class="pc-h"><span class="pc-n">${I.t}</span></header><p class="cap">${I.d} Maximum effect: ${I.fx(BE.INIT_MAX[k])}.</p>${fieldBox('Budget this year ($k)', UI.num(`i:${k}`, d.init[k], { min: 0, max: BE.INIT_CAP, step: 50, dec: 0, label: I.t + ' budget' }))}<div data-live="in:${k}">${initMeter(g, k)}</div></article>`;
    }).join('')}</div>`;
    return h;
  }
  function initMeter(g, k) {
    const co = you(g), now = BE.initEff(co)[k];
    const stock = Object.assign({}, co.initStock); stock[k] = stock[k] * 0.85 + (+g.draft.init[k] || 0);
    const next = BE.initEffFrom(stock)[k], max = BE.INIT_MAX[k];
    return `<div class="meters">${UI.meter('Now', now / max, INIT_INFO[k].fx(now))}${UI.meter('This year', next / max, INIT_INFO[k].fx(next), 'ok')}</div>`;
  }

  /* ---------- Statements ---------- */
  const fm = v => (v == null || !isFinite(v) ? '–' : (Math.abs(v) < 0.05 ? '0.0' : N.num(v, 1)));
  function stmtTable(title, rows, cols) {
    return UI.table([title].concat(cols), rows.map(r => ({ cls: r[2] || '', cells: [r[0]].concat(r[1].map(fm)) })), { cls: 'stmt' });
  }
  function incomeRows(list) {
    const I = list.map(x => x.income);
    const rows = [
      ['Revenue', I.map(i => i.rev)], ['Materials', I.map(i => -i.mat), 'sub'], ['Labour', I.map(i => -i.labor), 'sub'], ['Inventory carrying', I.map(i => -i.carry), 'sub'],
      ['Contribution margin', I.map(i => i.cm), 'tot'], ['Depreciation', I.map(i => -i.dep), 'sub'], ['R&D', I.map(i => -i.rd), 'sub'], ['Promotion', I.map(i => -i.promo), 'sub'], ['Sales', I.map(i => -i.sales), 'sub'], ['Administration', I.map(i => -i.admin), 'sub'], ['Initiatives', I.map(i => -i.init), 'sub']
    ];
    if (I.some(i => i.writeOff > 0.005)) rows.push(['Plant write-offs', I.map(i => -i.writeOff), 'sub']);
    rows.push(['Operating profit', I.map(i => i.ebit), 'tot'], ['Interest', I.map(i => -i.interest), 'sub'], ['Taxes', I.map(i => -i.tax), 'sub'], ['Net income', I.map(i => i.ni), 'tot']);
    return rows;
  }
  function balanceRows(list) {
    const B = list.map(x => x.balance);
    return [
      ['Cash', B.map(b => b.cash), 'sub'], ['Receivables', B.map(b => b.ar), 'sub'], ['Inventory', B.map(b => b.inv), 'sub'], ['Current assets', B.map(b => b.ca), 'tot'],
      ['Plant and equipment', B.map(b => b.ppeGross), 'sub'], ['Accumulated depreciation', B.map(b => -b.accDep), 'sub'], ['Net plant', B.map(b => b.ppeNet), 'tot'], ['Total assets', B.map(b => b.assets), 'tot'],
      ['Payables', B.map(b => b.ap), 'sub'], ['Current debt', B.map(b => b.curDebt), 'sub'], ['Bonds', B.map(b => b.bonds), 'sub'], ['Total liabilities', B.map(b => b.liab), 'tot'],
      ['Common stock', B.map(b => b.stock), 'sub'], ['Retained earnings', B.map(b => b.re), 'sub'], ['Equity', B.map(b => b.equity), 'tot'], ['Liabilities and equity', B.map(b => b.liab + b.equity), 'tot']
    ];
  }
  function cashRows(list) {
    const C = list.map(x => x.cash);
    const rows = [
      ['Net income', C.map(c => c.ni), 'sub'], ['Depreciation', C.map(c => c.dep), 'sub'], ['Change in payables', C.map(c => c.dAP), 'sub'], ['Change in receivables', C.map(c => c.dAR), 'sub'], ['Change in inventory', C.map(c => c.dInv), 'sub']
    ];
    if (C.some(c => c.writeOff > 0.005)) rows.splice(2, 0, ['Plant write-offs', C.map(c => c.writeOff), 'sub']);
    rows.push(['Operating cash flow', C.map(c => c.cfo), 'tot'], ['Plant investment', C.map(c => c.capex), 'sub'], ['Plant sold', C.map(c => c.assetSales), 'sub'], ['Investing cash flow', C.map(c => c.cfi), 'tot'],
      ['Dividends', C.map(c => c.dividends), 'sub'], ['Stock issued', C.map(c => c.stockIssued), 'sub'], ['Stock bought back', C.map(c => c.stockBought), 'sub'], ['Bonds issued', C.map(c => c.bondsIssued), 'sub'], ['Bonds repaid', C.map(c => c.bondsRetired), 'sub'], ['Change in current debt', C.map(c => c.curDebt), 'sub'], ['Emergency loan', C.map(c => c.emergency), 'sub'], ['Financing cash flow', C.map(c => c.cff), 'tot'],
      ['Change in cash', C.map(c => c.cfo + c.cfi + c.cff), 'tot'], ['Closing cash', C.map(c => c.end), 'tot']);
    return rows;
  }

  /* ---------- Decide: pro forma ---------- */
  function pfView(g) {
    const P = plan(g), pf = P.pf, r = lastRep(g), last = r.cos[0].res;
    const cols = [`Y${g.year} plan`, `Y${r.y} actual`];
    let h = UI.sheet(`Pro forma · Y${g.year}`, 'Projected results of this plan', UI.kpis([
      { k: 'Revenue', v: F.m(pf.income.rev) }, { k: 'Net income', v: F.m(pf.income.ni), d: F.pct(pf.income.rev > 0 ? pf.income.ni / pf.income.rev : 0, 1) + ' of sales' },
      { k: 'Year-end cash', v: P.cashEnd < 0 ? `<span class="down">${F.m(P.cashEnd)}</span>` : F.m(P.cashEnd) }, { k: 'EPS', v: F.usd2(pf.market.eps) }
    ]) + `<p class="cap">Assumes you sell exactly your forecasts. Real sales depend on what rivals do.</p>` +
      UI.table(['Product', 'Forecast', 'Price', 'Revenue', 'Contribution', 'Margin'], pf.lines.filter(l => l.units > 0 || l.rev > 0).map(l => [esc(l.name), F.u(l.units), F.usd(l.units > 0 ? l.rev / l.units * 1000 : 0), F.m(l.rev), F.m(l.cm), F.pct(l.rev > 0 ? l.cm / l.rev : 0)]), { sticky: true }));
    h += `<div class="pgrid2 stmts">${UI.sheet('Income statement', null, stmtTable('$M', incomeRows([pf, last]), cols))}${UI.sheet('Balance sheet, year-end', null, stmtTable('$M', balanceRows([pf, last]), cols))}</div>`;
    h += UI.sheet('Cash flow', null, stmtTable('$M', cashRows([pf, last]), cols));
    return h;
  }

  /* ---------- Decide: submit ---------- */
  function submitView(g, ctx) {
    const P = plan(g), list = checks(g, P), d = g.draft, b = countBad(list);
    let h = UI.sheet(`Review · Y${g.year}`, list.length ? `${b ? b + ' problem' + (b === 1 ? '' : 's') + ', ' : ''}${countWarn(list)} warning${countWarn(list) === 1 ? '' : 's'}, ${list.length - b - countWarn(list)} note${list.length - b - countWarn(list) === 1 ? '' : 's'}` : 'Nothing flagged', (list.length ? UI.warn(list) : '<p class="case">No problems found. Double-check your forecasts: everything else depends on them.</p>') + finSummary(g, P));
    const rows = active(g).map(p => {
      const x = d.products[p.id];
      if (!p.launched) return [esc(p.name), 'In design', '–', '–', '–', '–', '–', '–', F.u(p.capNext)];
      const info = BE.rdInfo(g, p.id, +x.t, +x.w, +x.mtbf);
      const rd = p.rd ? 'Under way' : info && info.time > 0 ? `${F.nm(x.t)}/${F.kg(x.w)}/${F.h(x.mtbf)}` : 'None';
      return [esc(p.name), rd, F.usd(x.price), F.k(x.promo), F.k(x.sales), F.u(P.fc[p.id]), F.u(+x.prod || 0), (x.capChange > 0 ? '+' : '') + N.int(+x.capChange || 0) + 'k', N.num(+x.autoNext, 1)];
    });
    d.newProducts.forEach(np => rows.push([esc(np.name) + ' (new)', `${F.nm(np.t)}/${F.kg(np.w)}/${F.h(np.mtbf)}`, '–', '–', '–', '–', '–', '+' + N.int(np.cap) + 'k', N.num(np.auto, 1)]));
    h += UI.sheet('Your plan', 'Decisions to submit', UI.table(['Product', 'R&D (Nm/kg/h)', 'Price', 'Promo', 'Sales', 'Forecast', 'Produce', 'Capacity', 'Auto'], rows, { sticky: true }) +
      `<p class="ops">Finance: ${finText(d.fin)}</p><p class="ops">Initiatives: ${BE.INIT_KEYS.map(k => `${INIT_INFO[k].t.split(' ')[0]} ${F.k(+(d.init || {})[k] || 0)}`).join(' · ')}</p>`);
    const confirm = ctx.ui.confirmSubmit === g.year;
    h += `<section class="sheet submit"><p class="case">When you submit, all six companies' decisions for Y${g.year} go to the market at once. You cannot change them afterwards.</p>${confirm ? `<p class="case"><strong class="down">Your plan has ${b} problem${b === 1 ? '' : 's'}.</strong> Submit anyway?</p><div class="actions"><button type="button" class="btn btn-danger" data-act="m" data-op="submit" data-force="1">Submit anyway</button><button type="button" class="btn btn-ghost" data-act="m" data-op="submit-cancel">Keep editing</button></div>` : `<button type="button" class="btn btn-primary btn-block" data-act="m" data-op="submit">${g.year === g.years ? 'Submit final year' : `Submit Y${g.year} decisions`}</button>`}<div class="actions">${UI.btn('Reset this year’s draft', 'm', 'btn-ghost', 'data-op="reset-draft"')}</div></section>`;
    return h;
  }

  /* ---------- Decide wrapper ---------- */
  const SUBS = [{ v: 'brief', t: 'Brief' }, { v: 'rd', t: 'R&D' }, { v: 'mkt', t: 'Marketing' }, { v: 'prod', t: 'Production' }, { v: 'fin', t: 'Finance' }, { v: 'init', t: 'Initiatives' }, { v: 'pf', t: 'Pro forma' }, { v: 'submit', t: 'Submit' }];
  function decideView(g, ctx) {
    const sub = uiStr(ctx, 'sub', 'brief');
    const P = plan(g), list = checks(g, P), b = countBad(list);
    let h = UI.tabs('sub', SUBS.map(s => s.v === 'submit' && b ? Object.assign({}, s, { badge: String(b), bt: 'bad' }) : s), sub, 'sub-tabs', true);
    if (sub === 'rd') h += rdView(g);
    else if (sub === 'mkt') h += mktView(g);
    else if (sub === 'prod') h += prodView(g);
    else if (sub === 'fin') h += finView(g);
    else if (sub === 'init') h += initView(g);
    else if (sub === 'pf') h += pfView(g);
    else if (sub === 'submit') h += submitView(g, ctx);
    else h += briefView(g, ctx);
    if (sub !== 'submit') {
      const i = SUBS.findIndex(s => s.v === sub), nx = SUBS[i + 1];
      if (nx && nx.v !== 'submit') h += `<div class="actions next">${UI.btn(`Next: ${nx.t} →`, 'tab', 'btn-ghost', `data-group="sub" data-value="${nx.v}" data-top="1"`)}</div>`;
      h += dock(g);
    }
    return h;
  }

  /* ---------- Reports ---------- */
  const REPS = [{ v: 'summary', t: 'Summary' }, { v: 'segments', t: 'Segments' }, { v: 'map', t: 'Map' }, { v: 'production', t: 'Production' }, { v: 'financials', t: 'Financials' }, { v: 'scorecard', t: 'Scorecard' }, { v: 'decisions', t: 'Your decisions' }];
  function reportsView(g, ctx) {
    const lastY = lastRep(g).y;
    let ry = Number(uiStr(ctx, 'ry', lastY)); if (!(ry >= 0 && ry <= lastY)) ry = lastY;
    const rep = uiStr(ctx, 'rep', 'summary');
    const r = g.reports[ry];
    let h = '';
    if (ctx.ui.justDone != null && Number(ctx.ui.justDone) === lastY && !BE.isDone(g)) h += resultsBanner(g, lastY);
    h += `<div class="rep-head">${UI.tabs('ry', g.reports.map(x => ({ v: x.y, t: 'Y' + x.y })), ry, 'yr-tabs')}</div>`;
    h += UI.tabs('rep', REPS, rep, 'sub-tabs', false);
    if (rep === 'segments') h += repSegments(g, r, ctx);
    else if (rep === 'map') h += repMap(g, r, ctx);
    else if (rep === 'production') h += repProduction(g, r, ctx);
    else if (rep === 'financials') h += repFinancials(g, r, ctx);
    else if (rep === 'scorecard') h += repScorecard(g, r);
    else if (rep === 'decisions') h += repDecisions(g, r);
    else h += repSummary(g, r);
    return h;
  }
  function resultsBanner(g, y) {
    const r = g.reports[y], me = r.cos[0], R = me.res, prev = g.reports[y - 1].cos[0];
    const place = r.cos.map(c => c.res.market.price).sort((a, b) => b - a).indexOf(R.market.price) + 1;
    return `<section class="sheet result"><header class="sh"><span class="eyebrow">Year ${y} results</span><h2>${R.income.ni >= 0 ? `${F.m(R.income.ni)} profit` : `${F.m(R.income.ni)} loss`} · share price ${F.usd2(R.market.price)}</h2></header>${UI.kpis([
      { k: 'Sales', v: F.m(R.income.rev), d: N.sign(R.income.rev - prev.res.income.rev, v => F.m(v)), cls: signCls(R.income.rev - prev.res.income.rev) },
      { k: 'Market share', v: F.pct(me.share, 1), d: N.sign((me.share - prev.share) * 100, v => v.toFixed(1) + ' pts'), cls: signCls(me.share - prev.share) },
      { k: 'Share price rank', v: '#' + place + ' of 6' },
      { k: 'Cash', v: F.m(R.balance.cash), d: R.market.emergency > 0 ? 'emergency loan ' + F.m(R.market.emergency) : '', cls: R.market.emergency > 0 ? 'down' : '' }
    ])}${(() => { const lines = []; r.prods.filter(p => p.co === 'you' && p.live && p.launched).forEach(p => { if (p.stockout) lines.push({ t: 'warn', m: `<strong>${esc(p.name)}</strong> sold out: demand was about ${F.u(p.demand)} and you had ${F.u(p.units)}.` }); else if (p.inv > 0.25 * Math.max(1, p.units) && p.inv > 2) lines.push({ t: 'warn', m: `<strong>${esc(p.name)}</strong> ended with ${F.u(p.inv)} unsold.` }); }); if (R.market.emergency > 0) lines.unshift({ t: 'bad', m: `Cash ran out. The bank lent ${F.m(R.market.emergency)} as an emergency loan.` }); return UI.warn(lines.slice(0, 5)); })()}<div class="actions">${UI.btn(`Plan Y${g.year} →`, 'm', 'btn-primary', 'data-op="goto" data-tab="decide" data-sub="brief"')}</div></section>`;
  }
  function seriesBy(g, upto, fn) { return g.cos.map((co, i) => ({ values: g.reports.slice(0, upto + 1).map(r => fn(r.cos[i], r)), c: coCol(co.id), w: co.id === 'you' ? 3 : 1.6, dots: upto < 3 })); }
  const coLegend = g => g.cos.map(co => ({ t: co.short, c: coCol(co.id) }));
  function repSummary(g, r) {
    const rows = r.cos.map(c => { const R = c.res, m = R.market; return { cls: c.id === 'you' ? 'me' : '', cells: [dot(c.id) + esc(c.short), F.usd2(m.price), F.m(R.income.rev), F.m(R.income.ni), F.pct(c.share, 1), F.pct(m.ros, 1), F.pct(m.roe, 1), N.num(Math.min(99, m.leverage), 2), m.rating, m.emergency > 0 ? `<span class="down">${F.m(m.emergency)}</span>` : '–'] }; });
    let h = UI.sheet(`Industry summary · Y${r.y}`, r.y === 0 ? 'The starting year' : 'How the six companies did', UI.table(['Company', 'Share price', 'Sales', 'Net income', 'Share', 'ROS', 'ROE', 'Leverage', 'Rating', 'Emergency'], rows, { sticky: true }) + `<p class="cap">ROS: net income ÷ sales. ROE: net income ÷ equity. Leverage: assets ÷ equity. Share is of all units sold.</p>`);
    h += UI.sheet('Trends', 'Share price, profit and market share', UI.chart('rs-price', () => ({ series: seriesBy(g, r.y, c => c.res.market.price), xLabel: i => 'Y' + i, yFmt: v => '$' + v, yMin: 0 }), 200, coLegend(g), 'Share price by company') +
      UI.chart('rs-ni', () => ({ series: seriesBy(g, r.y, c => c.res.income.ni), xLabel: i => 'Y' + i, yFmt: moneyAxis, refs: [{ y: 0 }] }), 200, null, 'Net income by company') + '<p class="cap">Net income, $M</p>' +
      UI.chart('rs-share', () => ({ series: seriesBy(g, r.y, c => c.share * 100), xLabel: i => 'Y' + i, yFmt: v => v + '%', yMin: 0 }), 200, null, 'Market share by company') + '<p class="cap">Share of units sold</p>');
    const segRows = r.segs.map((e, s) => [segPill(s), F.u(e.size), F.u(e.sold), '+' + F.pct(e.growth, 1), e.shares.length ? (() => { const top = e.shares[0], p = r.prods.find(q => q.id === top.id); return dot(top.co) + esc(p ? p.name : top.id) + ' ' + F.pct(top.share); })() : '–', F.pct(sum(e.shares.filter(x => x.co === 'you').map(x => x.share)))]);
    h += UI.sheet('Segments', 'Demand and leaders', UI.table(['Segment', 'Demand', 'Sold', 'Growth', 'Top product', 'Your share'], segRows, { sticky: true }) + '<p class="cap">Thousands of units. Sold can fall below demand when products run out or no product fits buyers well.</p>');
    return h;
  }
  function repSegments(g, r, ctx) {
    const s = clamp(Number(uiStr(ctx, 'rseg', 0)) || 0, 0, 4), e = r.segs[s], D = SEGS[s];
    let h = UI.tabs('rseg', SEGS.map((x, i) => ({ v: i, t: x.name })), s, 'seg-tabs');
    const W = D.w, crit = Object.keys(W).sort((a, b) => W[b] - W[a]);
    const cname = { price: 'Price', pos: 'Positioning', age: 'Age', mtbf: 'Reliability (MTBF)' };
    const cval = { price: `${F.usd(e.plo)}–${F.usd(e.phi)}, lower is better`, pos: `ideal ${F.nm(e.ix)} Nm, ${F.kg(e.iy)} kg`, age: `ideal ${D.age} years`, mtbf: `${F.h(e.mlo)}–${F.h(e.mhi)} h, higher is better` };
    h += UI.sheet(`${e.name} · Y${r.y}`, `${F.u(e.size)} demand, growing ${F.pct(e.growth, 1)} a year`, `<p class="case">${esc(D.who)}</p>` + UI.kpis([
      { k: 'Demand', v: F.u(e.size) }, { k: 'Units sold', v: F.u(e.sold) }, { k: 'Next year', v: F.u(e.nextSize), d: 'expected' }, { k: 'Your share', v: F.pct(sum(e.shares.filter(x => x.co === 'you').map(x => x.share)), 1) }
    ]) + UI.table(['Buying criterion', 'Weight', 'This year'], crit.map(k => [cname[k], F.pct(W[k]), cval[k]]), { cls: 'wrap crit' }));
    h += UI.sheet('Segment map', 'Products near this segment', UI.chart('rseg-map', () => segMapSpec(g, r, s), mapH(), [{ t: 'Northstar', c: 'var(--c-you)' }].concat(g.cos.slice(1).map(c => ({ t: c.short, c: coCol(c.id) }))), `${e.name} perceptual map`) + `<p class="cap">Positions at the end of Y${r.y}. Products revised during the year are shown at their new spec.</p>`);
    const rows = e.shares.map(x => {
      const p = r.prods.find(q => q.id === x.id); if (!p) return null;
      const cidx = g.cos.findIndex(c => c.id === p.co);
      return { cls: p.co === 'you' ? 'me' : '', cells: [dot(p.co) + esc(p.name), F.u(x.units), F.pct(x.share, 1), F.pct(x.pot, 1), F.usd(p.price), F.nm(p.t), F.kg(p.w), F.h(p.mtbf), F.yrs(p.age), F.k(p.promo), F.pct(p.aw), F.k(p.sales), F.pct(e.acc[cidx]), String(p.score[s]) + (p.stockout ? ' <span class="pill warn">sold out</span>' : '')] };
    }).filter(Boolean);
    h += UI.sheet('Products', 'Who sold what', rows.length ? UI.table(['Product', 'Units', 'Share', 'Potential', 'Price', 'Nm', 'kg', 'MTBF', 'Age', 'Promo', 'Aware', 'Sales', 'Access', 'Score'], rows, { sticky: true }) + '<p class="cap">Potential is the share each product would have won with unlimited stock. Score is the average customer survey score for the year, 0 to 100. Age and spec at year-end.</p>' : UI.empty('No product sold in this segment.'));
    if (rows.length > 1) h += UI.sheet('Share by company', null, UI.chart('rseg-bars', () => ({ type: 'bars', groups: g.cos.map(c => c.short), series: [{ values: g.cos.map(c => sum(e.shares.filter(x => x.co === c.id).map(x => x.share)) * 100), colors: g.cos.map(c => coCol(c.id)) }], yFmt: v => v + '%' }), 180, null, 'Segment share by company'));
    return h;
  }
  function repMap(g, r, ctx) {
    const f = uiStr(ctx, 'mapco', 'all');
    return UI.sheet(`Perceptual map · end of Y${r.y}`, 'All segments and products', UI.tabs('mapco', [{ v: 'all', t: 'All companies' }].concat(g.cos.map(c => ({ v: c.id, t: c.short }))), f, 'seg-tabs') +
      UI.chart('rmap', () => repMapSpec(g, r, f), mapH(true), g.cos.map(c => ({ t: c.short, c: coCol(c.id) })), 'Perceptual map of all products') + '<p class="cap">Pick a company to label its products. Inner rings are fine cuts, outer rings rough cuts, + marks ideal spots.</p>');
  }
  function repProduction(g, r, ctx) {
    const f = uiStr(ctx, 'pco', 'you');
    const prods = r.prods.filter(p => (f === 'all' || p.co === f) && p.live !== false && (p.launched || p.isNew));
    const rows = prods.sort((a, b) => a.seg - b.seg || (a.co < b.co ? -1 : 1)).map(p => ({ cls: p.co === 'you' ? 'me' : '', cells: [dot(p.co) + esc(p.name), SEGS[p.seg].name, F.u(p.units), F.u(p.inv), p.rdDone != null ? F.yr(p.rdDone) : '–', F.yrs(p.age), F.h(p.mtbf), F.nm(p.t), F.kg(p.w), F.usd(p.price), F.usd(p.mat), F.usd(p.lab), F.usd(p.price - p.mat - p.lab), F.pct(p.second), N.num(p.autoNext, 1), F.u(p.capNext), F.pct(p.util)] }));
    return UI.sheet(`Production analysis · Y${r.y}`, 'Products, costs and plants', UI.tabs('pco', [{ v: 'you', t: 'Northstar' }].concat(g.cos.slice(1).map(c => ({ v: c.id, t: c.short }))).concat([{ v: 'all', t: 'All' }]), f, 'seg-tabs') +
      (rows.length ? UI.table(['Product', 'Segment', 'Sold', 'Inventory', 'Revised', 'Age', 'MTBF', 'Nm', 'kg', 'Price', 'Material', 'Labour', 'Margin', '2nd shift', 'Auto next', 'Cap next', 'Utilisation'], rows, { sticky: true }) : UI.empty('No products.')) +
      '<p class="cap">Material and labour are per unit produced this year. Margin is price minus those costs. Automation and capacity are for next year.</p>');
  }
  function repFinancials(g, r, ctx) {
    const f = uiStr(ctx, 'fco', 'you'), idx = Math.max(0, g.cos.findIndex(c => c.id === f)), c = r.cos[idx];
    const prev = r.y > 0 ? g.reports[r.y - 1].cos[idx] : null;
    const list = prev ? [c.res, prev.res] : [c.res], cols = prev ? ['Y' + r.y, 'Y' + (r.y - 1)] : ['Y' + r.y];
    const m = c.res.market;
    let h = UI.tabs('fco', g.cos.map(x => ({ v: x.id, t: x.short })), g.cos[idx].id, 'seg-tabs');
    h += UI.sheet(`${esc(c.name)} · Y${r.y}`, 'Key figures', UI.kpis([
      { k: 'Share price', v: F.usd2(m.price) }, { k: 'EPS', v: F.usd2(m.eps) }, { k: 'Dividend', v: F.usd2(m.dps) }, { k: 'Market cap', v: F.m(m.mcap) },
      { k: 'ROS', v: F.pct(m.ros, 1) }, { k: 'Asset turnover', v: N.num(m.turnover, 2) + '×' }, { k: 'ROE', v: F.pct(m.roe, 1) }, { k: 'Rating', v: m.rating }
    ]));
    h += `<div class="pgrid2 stmts">${UI.sheet('Income statement', null, stmtTable('$M', incomeRows(list), cols))}${UI.sheet('Balance sheet', null, stmtTable('$M', balanceRows(list), cols))}</div>`;
    h += UI.sheet('Cash flow', null, stmtTable('$M', cashRows(list), cols));
    if (c.res.lines && c.res.lines.length) h += UI.sheet('Product lines', 'Contribution by product', UI.table(['Product', 'Units', 'Revenue', 'Materials', 'Labour', 'Carrying', 'Contribution', 'Margin'], c.res.lines.filter(l => l.units > 0.01 || l.rev > 0).map(l => [esc(l.name), F.u(l.units), F.m(l.rev), F.m(l.mat), F.m(l.labor), F.m(l.carry), F.m(l.cm), F.pct(l.rev > 0 ? l.cm / l.rev : 0)]), { sticky: true }));
    return h;
  }
  const SC_PARTS = [
    ['Financial', 'fin', 40, [['profit', 'Return on sales', 10], ['stock', 'Share price rank', 10], ['leverage', 'Leverage 1.8–2.8×', 5], ['emergency', 'No emergency loan', 10], ['roe', 'Return on equity', 5]]],
    ['Customer', 'cust', 25, [['share', 'Market share', 10], ['survey', 'Survey scores', 10], ['reach', 'Awareness and access', 5]]],
    ['Internal', 'intl', 20, [['margin', 'Contribution margin', 10], ['util', 'Plant utilisation', 5], ['inventory', 'Lean inventory', 5]]],
    ['Learning and growth', 'learn', 15, [['productivity', 'Automation', 7], ['initiatives', 'Initiatives', 8]]]
  ];
  function repScorecard(g, r) {
    const sc = BE.scorecard(g);
    if (!sc.length) return UI.sheet('Balanced scorecard', 'Starts after year 1', UI.empty('The scorecard is calculated from year 1 onwards.'));
    const row = sc.find(x => x.y === r.y) || sc[sc.length - 1];
    let h = UI.sheet(`Balanced scorecard · Y${row.y}`, `${Math.round(row.total)} of 100`, SC_PARTS.map(([t, key, max, parts]) => `<div class="scp"><div class="scp-h"><span class="lbl">${t}</span><span class="num">${N.num(row[key], 1)} / ${max}</span></div><div class="meters">${parts.map(([k, l, mx]) => UI.meter(l, row.parts[k] / mx, `${N.num(row.parts[k], 1)}/${mx}`, row.parts[k] / mx >= 0.75 ? 'ok' : row.parts[k] / mx >= 0.45 ? 'warm' : 'hot')).join('')}</div></div>`).join('') +
      `<p class="cap">Year ${row.y}: contribution margin ${F.pct(row.cmPct, 1)}, utilisation ${F.pct(row.util)}, inventory ${N.int(row.dio)} days, average survey score ${N.int(row.avgScore)}, average automation ${N.num(row.autoAvg, 1)}.</p>`);
    h += UI.sheet('By year', null, UI.table(['Year', 'Financial', 'Customer', 'Internal', 'Learning', 'Total'], sc.map(x => ({ cls: x.y === row.y ? 'me' : '', cells: ['Y' + x.y, N.num(x.fin, 1), N.num(x.cust, 1), N.num(x.intl, 1), N.num(x.learn, 1), N.num(x.total, 1)] })), { sticky: true }) +
      (sc.length > 1 ? UI.chart('rsc', () => ({ series: [{ values: sc.map(x => x.total), c: 'var(--c-you)', dots: true }], xLabel: i => 'Y' + sc[i].y, yMin: 0, yMax: 100 }), 170, [{ t: 'Scorecard total', c: 'var(--c-you)' }], 'Scorecard by year') : ''));
    return h;
  }
  function repDecisions(g, r) {
    const d = r.you;
    if (!d || r.y === 0) return UI.sheet('Your decisions', 'Year 0', UI.empty('Year 0 was run by the previous management.'));
    const rows = Object.keys(d.products).map(id => {
      const x = d.products[id], p = r.prods.find(q => q.id === id) || {};
      return [esc(p.name || id), x.t != null ? `${F.nm(x.t)}/${F.kg(x.w)}/${F.h(x.mtbf)}` : '–', F.usd(x.price), F.k(x.promo), F.k(x.sales), x.forecast != null ? F.u(x.forecast) : 'auto', F.u(+x.prod || 0), (x.capChange > 0 ? '+' : '') + N.int(+x.capChange || 0) + 'k', N.num(+x.autoNext || 0, 1), F.u(p.units || 0)];
    });
    (d.newProducts || []).forEach(np => rows.push([esc(np.name) + ' (new)', `${F.nm(np.t)}/${F.kg(np.w)}/${F.h(np.mtbf)}`, '–', '–', '–', '–', '–', '+' + N.int(np.cap) + 'k', N.num(np.auto, 1), '–']));
    return UI.sheet(`Your decisions · Y${r.y}`, 'What you submitted', UI.table(['Product', 'R&D target', 'Price', 'Promo', 'Sales', 'Forecast', 'Produced', 'Capacity', 'Auto', 'Sold'], rows, { sticky: true }) +
      `<p class="ops">Finance: ${finText(d.fin)}</p><p class="ops">Initiatives: ${BE.INIT_KEYS.map(k => `${INIT_INFO[k].t.split(' ')[0]} ${F.k(+(d.init || {})[k] || 0)}`).join(' · ')}</p>`);
  }

  /* ---------- Guide ---------- */
  function guideView(g) {
    const E0 = BE.env(g, 1);
    const wt = s => Object.keys(s.w).sort((a, b) => s.w[b] - s.w[a]).map(k => `${{ price: 'price', pos: 'position', age: 'age', mtbf: 'MTBF' }[k]} ${F.pct(s.w[k])}`).join(', ');
    let h = `<section class="hero"><span class="eyebrow">Participant guide</span><h1>How Boardroom works</h1><p class="lede">Everything the simulation uses to judge your decisions. Rival strategies are revealed in the debrief.</p></section>`;
    h += UI.fold('The industry', `<div class="case"><p>Six companies make electric drive units (motor, gearbox and controller) and sell them to bike brands. Each drive unit has a <strong>torque</strong> (Nm, more is better), a <strong>weight</strong> (kg, less is better) and a reliability, measured as <strong>MTBF</strong> (mean time between failures, in hours). Units are counted in thousands and money in millions of dollars.</p><p>All six companies start identical: five products, one per segment, the same plants, $26M of bonds and 2 million shares. The rivals are run by the computer, each with its own strategy.</p></div>`, true, '1');
    h += UI.fold('How a year works', `<div class="case"><p>Every company submits its decisions for the year at the same time. The market then plays out: each segment's buyers rate every product, demand is split by those ratings, products that run out send part of their unmet demand to rivals with stock, and the year's financial statements are drawn up. Plant bought this year comes on line next year. R&amp;D projects finish part-way through the year, and buyers judge a blend of the old and new design.</p></div>`, false, '2');
    h += UI.fold('Customers and segments', UI.table(['Segment', 'Y1 demand', 'Growth', 'Y1 price range', 'MTBF range', 'Ideal age', 'Drift a year', 'Buying criteria'], SEGS.map((s, i) => [segPill(i), F.u(BE.expectedSize(g, 1, i)), F.pct(s.growth, 1), `${F.usd(E0[i].plo)}–${F.usd(E0[i].phi)}`, `${F.h(s.mtbf[0])}–${F.h(s.mtbf[1])}`, s.age + ' yrs', `+${s.drift[0]} Nm, ${N.MINUS}${Math.abs(s.drift[1])} kg`, wt(s)]), { sticky: true, cls: 'wrap' }) + `<div class="case"><p>${SEGS.map(s => `<strong>${s.name}.</strong> ${esc(s.who)}`).join(' ')}</p><p>Price ranges fall $${BE.PRICE_DRIFT} a year. A segment's ideal spot leads its centre: Premium buyers want what the market will offer in about nine months, Value buyers want what it offered a few months ago.</p></div>`, false, '3');
    h += UI.fold('The customer survey score', `<div class="case"><p>Each product gets a score from 0 to 100 in each segment. Buyers ignore products outside the segment's <strong>rough cut</strong> (2.5 units from its centre on the map, where 1 unit is 10 Nm or 0.2 kg), priced more than $15 above the range, or with MTBF more than 1,000 hours below it.</p><p>Inside the rough cut, the four buying criteria are scored and weighted. Positioning falls off with distance from the ideal spot: one unit away keeps about half the positioning score, two units about 6%. Price earns full marks at the bottom of the range and 20% at the top. Age is scored around the segment's ideal age. MTBF scores from 30% at the bottom of its range to 100% at the top.</p><p>The result is multiplied by <strong>awareness</strong> and <strong>accessibility</strong> (each counts 35% even at zero), by your customer-experience initiative and slightly by your credit terms. Demand is shared in proportion to each product's score raised to the power 1.6, so small leads become big share gains. If no product scores above 50, the segment buys a little less overall.</p></div>`, false, '4');
    h += UI.fold('R&D', `<div class="case"><p>Changing torque or weight repositions a product. The project takes 0.2 years, plus 0.05 years per automation point of the line, plus 0.32 years per unit moved on the map, plus 0.06 years per 1,000 hours of extra MTBF. Changing only MTBF takes 0.12 years plus the MTBF time. Digital development shortens projects by up to 35%. R&amp;D costs $1M per year of project time plus $100k per 1,000 hours of extra MTBF.</p><p>When a repositioning finishes, the product's age halves: buyers treat it as a fresh design. Higher torque, lower weight and higher MTBF all raise material cost. Technology makes materials about 4% cheaper every year.</p><p><strong>New products</strong> take about a year to design and cost $2M plus extra for high MTBF. Buy their capacity in the same year; they go on sale the following year. You can run up to eight products.</p></div>`, false, '5');
    h += UI.fold('Marketing', `<div class="case"><p><strong>Promotion</strong> builds a product's awareness, which loses a third of its value each year. Returns diminish: around $1.5M–$2M a year keeps a product well known. <strong>Sales budgets</strong> build accessibility in a segment, shared by all your products there; it also fades by a third each year. <strong>Price</strong> is judged against the segment range. The <strong>sales forecast</strong> is your own estimate: it feeds the pro forma and the default production plan.</p></div>`, false, '6');
    h += UI.fold('Production', `<div class="case"><p>Each product has its own line. You can produce up to twice its capacity; units above capacity run on a second shift at 1.5× labour cost. Labour starts at $${BE.LABOR0} a unit at automation 1 and falls 8.5% of that for each automation point; wages rise 3% a year. Unsold inventory costs 12% of its value a year to carry.</p><p>New capacity costs $80 plus $50 per automation point for each unit a year, and is ready next year. Raising automation costs $50 per point per unit of capacity. Selling capacity returns 65% of its book value and the rest is written off. Plant depreciates over 15 years.</p></div>`, false, '7');
    h += UI.fold('Finance', `<div class="case"><p><strong>Current debt</strong> is a one-year loan at prime plus 1% plus a credit spread, limited by receivables and inventory. <strong>Bonds</strong> run ten years at prime plus 1.5% plus the spread, up to 75% of net plant value less bonds already issued. <strong>Stock</strong> can be issued up to 20% of market value a year, with a 5% fee, or bought back up to 10%. The prime rate path is ${BE.PRIME.slice(1, g.years + 1).map(v => N.num(v, 1) + '%').join(', ')} for years 1 to ${g.years}.</p><p>Receivable days below 30 cost a little demand; above 30 they help slightly but tie up cash. Payable days above 60 make suppliers hold back materials. Tax is 30% of profit. Ratings run from AAA to CCC and depend on debt to assets and interest cover; any emergency loan means CCC.</p><p>The <strong>share price</strong> reflects book value per share, earnings per share (this year and last), dividends and sales growth. An emergency loan cuts it 15%.</p></div>`, false, '8');
    h += UI.fold('Initiatives', `<div class="case"><p>Five programmes build lasting capabilities. Each year's budget adds to a stock that fades 15% a year; effects grow with the stock and are capped: lean manufacturing (labour up to ${N.MINUS}10%), supplier partnerships (materials up to ${N.MINUS}7%), digital development (R&amp;D time up to ${N.MINUS}35%), customer experience (survey scores up to +5%) and workforce training (labour up to ${N.MINUS}8%). Budgets run up to $1.5M each.</p></div>`, false, '9');
    h += UI.fold('Scoring', `<div class="case"><p>Your final score is half your average <strong>balanced scorecard</strong> and half your <strong>standing</strong> against the five rivals.</p></div>` + UI.table(['Perspective', 'Points', 'Measures'], SC_PARTS.map(([t, , max, parts]) => [t, String(max), parts.map(p => `${p[1]} (${p[2]})`).join(', ')]), { cls: 'wrap' }) + `<div class="case"><p>The standing ranks all six companies on cumulative profit, final share price, final market share and average return on equity. First place on all four earns the full 100.</p></div>`, false, '10');
    h += UI.fold('Glossary', `<dl class="gloss">${[['Contribution margin', 'Revenue minus materials, labour and inventory carrying cost.'], ['Fine cut / rough cut', 'Rings around a segment centre on the map. Outside the rough cut buyers will not consider a product.'], ['Ideal spot', 'The torque and weight buyers in a segment like best this year.'], ['MTBF', 'Mean time between failures, a measure of reliability.'], ['Second shift', 'Production above capacity, at 1.5× labour cost.'], ['Accessibility', 'How easily buyers in a segment can reach your products, built by sales budgets.'], ['Emergency loan', 'Automatic bank loan when cash would fall below zero, with a 7.5% penalty.'], ['Leverage', 'Assets divided by equity.'], ['ROS, ROE', 'Net income as a share of sales, and of equity.']].map(([t, d]) => `<dt>${t}</dt><dd>${d}</dd>`).join('')}</dl>`, false, '11');
    return h;
  }

  /* ---------- Debrief ---------- */
  function coachNotes(g) {
    const notes = [], st = BE.standings(g), me = st[0], R = g.reports.slice(1);
    const leader = st.slice().sort((a, b) => a.place - b.place)[0];
    notes.push(me.place === 1 ? `First of six. You beat every rival on the combined standing, with ${F.m(me.cumProfit)} of cumulative profit.` : `You finished #${me.place} of six. ${leader.short} led with ${F.m(leader.cumProfit)} of cumulative profit and a ${F.usd2(leader.price)} share price, against your ${F.m(me.cumProfit)} and ${F.usd2(me.price)}.`);
    let worst = null;
    R.forEach(r => r.prods.filter(p => p.co === 'you' && p.live && p.launched && p.units > 0.5).forEach(p => {
      const best = Math.max(0, ...r.prods.filter(q => q.co !== 'you' && q.live).map(q => q.score[p.seg]));
      const gap = best - p.score[p.seg];
      if (!worst || gap > worst.gap) worst = { gap, p, r, best };
    }));
    if (worst && worst.gap > 12) notes.push(`In Y${worst.r.y}, ${worst.p.name} scored ${worst.p.score[worst.p.seg]} with ${SEGS[worst.p.seg].name} buyers while the best rival scored ${worst.best}. Check its positioning, age and price against that segment's criteria.`);
    let lost = 0, yrs = [];
    R.forEach(r => r.prods.filter(p => p.co === 'you' && p.stockout).forEach(p => { lost += Math.max(0, p.demand - p.units); if (yrs.indexOf(r.y) < 0) yrs.push(r.y); }));
    if (lost > 3) notes.push(`You sold out in ${yrs.map(y => 'Y' + y).join(', ')} and left about ${F.u(lost)} units of demand for rivals. Capacity bought a year earlier would have captured it.`);
    const carry = sum(R.map(r => r.cos[0].res.income.carry));
    if (carry > 1.5) notes.push(`Carrying unsold inventory cost ${F.m(carry)} over the game. Forecast first, then produce forecast plus a small buffer minus stock on hand.`);
    const em = R.filter(r => r.cos[0].res.market.emergency > 0);
    if (em.length) notes.push(`You needed emergency loans in ${em.map(r => 'Y' + r.y).join(', ')} (${F.m(sum(em.map(r => r.cos[0].res.market.emergency)))} in total). Each one cut your share price 15% and your rating to CCC. The pro forma would have shown the gap.`);
    const util = avg(R.map(r => { const mine = r.prods.filter(p => p.co === 'you' && p.live && p.cap > 0); return sum(mine.map(p => p.prod)) / Math.max(1, sum(mine.map(p => p.cap))); }));
    if (util < 0.72) notes.push(`Your plants ran at ${F.pct(util)} of capacity on average. Idle plant still depreciates; sell lines you cannot fill.`);
    const lastR = R[R.length - 1];
    const vMine = lastR.prods.filter(p => p.co === 'you' && p.seg === 1 && p.live && p.units > 1);
    const vRiv = lastR.prods.filter(p => p.co !== 'you' && p.seg === 1 && p.live && p.units > 1);
    if (vMine.length && vRiv.length) {
      const myLab = Math.min(...vMine.map(p => p.lab)), best = vRiv.reduce((a, b) => (b.lab < a.lab ? b : a));
      if (myLab > best.lab + 12) notes.push(`In Value, your labour cost was ${F.usd(myLab)} a unit against ${F.usd(best.lab)} at ${lastR.cos.find(c => c.id === best.co).short}. Price-sensitive segments reward automation.`);
    }
    const newCount = g.reports[g.reports.length - 1].prods.filter(p => p.co === 'you' && p.isNew).length;
    if (!newCount) notes.push('You never launched a new product. Premium, Cargo and Folding grow 15–18% a year, and a second product in a fast-growing segment adds share without cannibalising much.');
    const lev = lastR.cos[0].res.market.leverage;
    if (lev < 1.4) notes.push(`You finished with leverage of ${N.num(lev, 2)}×. A little more debt, used to fund profitable growth, would have raised return on equity.`);
    else if (lev > 3.2) notes.push(`You finished with leverage of ${N.num(lev, 2)}×. Heavy debt raises interest costs and the risk of an emergency loan.`);
    return notes.slice(0, 6);
  }
  function debriefView(g, ctx) {
    const score = BE.finalScore(g), sc = BE.scorecard(g), st = BE.standings(g), me = st[0];
    const card = avg(sc.map(r => r.total));
    let h = `<section class="sheet"><header class="sh"><span class="eyebrow">Debrief · Boardroom</span></header><div class="grade"><span class="letter" aria-label="Grade ${S.grade(score)}"><span class="hl draw">${S.grade(score)}</span></span><div class="grade-txt"><span class="h2">${S.gradeWord(score)}</span><span class="score num">${score} / 100</span></div></div><p class="case">Northstar finished <strong>#${me.place} of 6</strong> after ${g.years} years, with ${F.m(me.cumProfit)} of cumulative profit, a ${F.usd2(me.price)} share price and ${F.pct(me.share, 1)} of the market.</p>${UI.kpis([
      { k: 'Scorecard average', v: N.int(card) + ' / 100' }, { k: 'Standing score', v: N.int(me.rankScore) + ' / 100' }, { k: 'Cumulative profit', v: F.m(me.cumProfit) }, { k: 'Emergency loans', v: String(me.emergencies) }
    ])}<p class="cap">Final score is half the scorecard average and half the standing score.</p></section>`;
    const order = st.slice().sort((a, b) => a.place - b.place);
    h += UI.sheet('Final standings', 'Six companies after ' + g.years + ' years', UI.table(['Company', 'Place', 'Cum. profit', 'Share price', 'Share', 'Avg ROE', 'Emerg.'], order.map(c => ({ cls: c.id === 'you' ? 'me' : '', cells: [dot(c.id) + esc(c.short), '#' + c.place, F.m(c.cumProfit) + ` <small>#${c.cumProfitRank}</small>`, F.usd2(c.price) + ` <small>#${c.priceRank}</small>`, F.pct(c.share, 1) + ` <small>#${c.shareRank}</small>`, F.pct(c.roe, 1) + ` <small>#${c.roeRank}</small>`, String(c.emergencies)] })), { sticky: true }) + '<p class="cap">Small numbers show each company’s rank on that measure.</p>');
    const lastY = g.years;
    h += UI.sheet('The race', 'Share price and cumulative profit', UI.chart('db-price', () => ({ series: seriesBy(g, lastY, c => c.res.market.price), xLabel: i => 'Y' + i, yFmt: v => '$' + v, yMin: 0 }), 210, coLegend(g), 'Share price by company') + '<p class="cap">Share price</p>' +
      UI.chart('db-cum', () => ({ series: g.cos.map((co, i) => { let acc = 0; return { values: g.reports.map(r => (r.y === 0 ? 0 : (acc += r.cos[i].res.income.ni))), c: coCol(co.id), w: co.id === 'you' ? 3 : 1.6 }; }), xLabel: i => 'Y' + i, yFmt: moneyAxis, refs: [{ y: 0 }] }), 210, null, 'Cumulative profit by company') + '<p class="cap">Cumulative net income from Y1</p>');
    h += UI.sheet('Balanced scorecard', 'Year by year', UI.chart('db-sc', () => ({ series: [{ values: sc.map(x => x.fin / 40 * 100), c: 'var(--s1)' }, { values: sc.map(x => x.cust / 25 * 100), c: 'var(--s2)' }, { values: sc.map(x => x.intl / 20 * 100), c: 'var(--s3)' }, { values: sc.map(x => x.learn / 15 * 100), c: 'var(--s4)' }, { values: sc.map(x => x.total), c: 'var(--ink)', w: 3 }], xLabel: i => 'Y' + sc[i].y, yMin: 0, yMax: 100, yFmt: v => v + '%' }), 200, [{ t: 'Financial', c: 'var(--s1)' }, { t: 'Customer', c: 'var(--s2)' }, { t: 'Internal', c: 'var(--s3)' }, { t: 'Learning', c: 'var(--s4)' }, { t: 'Total', c: 'var(--ink)' }], 'Scorecard perspectives by year') + '<p class="cap">Each perspective as a percentage of its maximum. Open Reports, then Scorecard, for the detail.</p>');
    h += `<section class="sheet"><header class="sh"><span class="eyebrow">Coach’s notes</span><h2>What to take away</h2></header><ul class="notes plain">${coachNotes(g).map(n => `<li>${n}</li>`).join('')}</ul></section>`;
    h += UI.sheet('Rivals revealed', 'What each competitor was trying to do', `<div class="ideas">${g.cos.slice(1).map(c => { const A = BE.AI[c.ai], s = st.find(x => x.id === c.id); return `<p>${dot(c.id)}<strong>${esc(c.short)}: ${A.label}.</strong> ${A.blurb} Finished #${s.place} with ${F.m(s.cumProfit)} of profit.</p>`; }).join('')}</div>`);
    h += UI.sheet('Concepts', 'The ideas behind the simulation', `<div class="ideas">${[
      ['Generic strategies.', 'Cost leadership, differentiation and focus each work, but straddling them without a cost or design advantage rarely does.'],
      ['Positioning against drift.', 'Customer needs move every year. Products must be aimed at where buyers will be when the redesign lands.'],
      ['Capacity lead time.', 'Plant takes a year to arrive, so growth must be financed and built ahead of demand.'],
      ['Contribution margin and automation.', 'Automation trades fixed investment for lower variable cost. It pays where volume is high and designs change slowly.'],
      ['Liquidity.', 'Profitable companies still fail when cash runs out. Forecast, then fund the plan.'],
      ['Balanced scorecard.', 'Financial results lag. Customer, internal and learning measures show whether the company is building future value.']
    ].map(([a, b]) => `<p><strong>${a}</strong> ${b}</p>`).join('')}</div>`);
    h += `<div class="actions"><button type="button" class="btn btn-primary" data-act="retry-run" data-id="${ctx.meta.id}">Replay this market</button><button type="button" class="btn btn-ghost" data-act="new-run" data-module="boardroom">New market</button><button type="button" class="btn btn-ghost" data-act="leave-run">Back to home</button></div>`;
    return h;
  }

  /* ---------- Live updates ---------- */
  function live(g, ctx) {
    if (BE.isDone(g) || uiStr(ctx, 'tab', 'decide') !== 'decide') return {};
    const sub = uiStr(ctx, 'sub', 'brief'), d = g.draft, P = plan(g), L = { dock: dockText(g, P) };
    if (sub === 'rd') {
      active(g).forEach(p => { const x = d.products[p.id]; if (x && p.launched && !p.rd) L['rd:' + p.id] = rdHint(g, p, x); });
      d.newProducts.forEach((np, i) => { L['np:' + i] = npHint(g, np); L['npn:' + i] = esc(np.name || 'New product'); });
      L._charts = ['rdmap'];
    } else if (sub === 'mkt') {
      active(g).forEach(p => { const x = d.products[p.id]; if (x && p.launched) L['mk:' + p.id] = mkHint(g, p, x, P); });
      L['mk-acc'] = accTable(g);
    } else if (sub === 'prod') {
      active(g).forEach(p => { const x = d.products[p.id]; if (x && p.launched) L['pr:' + p.id] = prHint(g, p, x, P); });
      L['pr-tot'] = prTotals(g);
    } else if (sub === 'fin') {
      Object.assign(L, finHints(g));
      L['fi-sum'] = finSummary(g, P);
    } else if (sub === 'init') {
      BE.INIT_KEYS.forEach(k => { L['in:' + k] = initMeter(g, k); });
    }
    return L;
  }

  /* ---------- Module ---------- */
  S.App.register({
    id: 'boardroom', cat: 'strategy', title: 'Boardroom', area: 'Company strategy', length: '8 years · 60–90 min', depth: 'Full simulation', version: 1, persist: 'replay', wide: true,
    practises: 'Competitive strategy · product portfolio · capacity, finance and marketing in one company',
    blurb: 'Run Northstar Drives, one of six e-bike drive-unit makers, for eight years. Design products for five segments, price and market them, plan capacity and automation, fund growth and beat five AI rivals on a balanced scorecard.',
    detail: '<p>A full-company strategy simulation. Five customer segments with drifting needs and their own buying criteria; product-level R&amp;D on a perceptual map; promotion, sales and pricing; second shifts, capacity and automation; current debt, bonds, stock, dividends and credit terms; improvement initiatives; pro forma statements; a full annual industry report; and a debrief that reveals each rival’s strategy.</p>',
    options: [
      { id: 'difficulty', label: 'Difficulty', default: 'guided', choices: [{ v: 'guided', t: 'Foundation', s: 'Demand estimates, coaching and quick fixes' }, { v: 'standard', t: 'Intermediate', s: 'Demand estimates only; sharper rivals' }, { v: 'expert', t: 'Advanced', s: 'Forecast it yourself; sharpest rivals' }] },
      { id: 'length', label: 'Length', default: 'full', choices: [{ v: 'full', t: '8 years', s: 'About 60–90 minutes' }, { v: 'short', t: '5 years', s: 'About 40 minutes' }] }
    ],
    create: (seed, config) => BE.create(seed, config),
    apply: (g, d) => BE.apply(g, d),
    isDone: g => BE.isDone(g),
    progress: g => (BE.isDone(g) ? `Complete · ${g.years} years` : `Year ${g.year} of ${g.years}`),
    view(g, ctx) {
      const done = BE.isDone(g);
      let tab = uiStr(ctx, 'tab', done ? 'debrief' : 'decide');
      if (done && tab === 'decide') tab = 'debrief';
      if (!done && tab === 'debrief') tab = 'decide';
      ctx.ui.tab = tab;
      let h = header(g, done);
      h += UI.tabs('tab', [{ v: done ? 'debrief' : 'decide', t: done ? 'Debrief' : `Decide Y${g.year}` }, { v: 'reports', t: 'Reports' }, { v: 'guide', t: 'Guide' }], tab, 'main-tabs', true);
      if (tab === 'decide') h += decideView(g, ctx);
      else if (tab === 'reports') h += reportsView(g, ctx);
      else if (tab === 'guide') h += guideView(g);
      else h += debriefView(g, ctx);
      return h;
    },
    live,
    onTab(g, group, value, ctx) {
      if (group === 'sub' && value !== 'submit') ctx.ui.confirmSubmit = null;
      if (group === 'tab' && value === 'decide') ctx.ui.justDone = null;
      if (group === 'sub' && value !== 'brief') ctx.ui.seenBrief = true;
    },
    field(g, name, value, el, ctx) {
      const d = g.draft; if (!d) return null;
      const parts = String(name).split(':');
      if (parts[0] === 'p') { const x = d.products[parts[1]]; if (!x) return null; const was = x.forecast == null; x[parts[2]] = value; return parts[2] === 'forecast' && was ? { rerender: true } : null; }
      if (parts[0] === 'f') { d.fin[parts[1]] = value; return null; }
      if (parts[0] === 'i') { d.init[parts[1]] = value; return null; }
      if (parts[0] === 'np') {
        const np = d.newProducts[+parts[1]]; if (!np) return null;
        if (parts[2] === 'seg') { Object.assign(np, defaultNew(g, clamp(+value, 0, 4))); return { rerender: true }; }
        np[parts[2]] = parts[2] === 'name' ? String(value).slice(0, 16) : value;
        return null;
      }
      return null;
    },
    act(g, op, el, ctx) {
      const d = g.draft, ds = el.dataset;
      if (op === 'goto') { if (ds.tab) ctx.ui.tab = ds.tab; if (ds.sub) ctx.ui.sub = ds.sub; if (ds.rep) ctx.ui.rep = ds.rep; if (ds.tab === 'decide') ctx.ui.justDone = null; return { rerender: true, top: true }; }
      if (!d) return null;
      const p = ds.pid ? g.prods.find(q => q.id === ds.pid) : null, x = p ? d.products[p.id] : null;
      if (op === 'rd-aim' && p && x) { const id = idealFor(g, p.seg, ds.when); x.t = id.t; x.w = id.w; return { rerender: true }; }
      if (op === 'rd-keep' && p && x) { x.t = p.t; x.w = p.w; x.mtbf = p.mtbf; return { rerender: true }; }
      if (op === 'fc-auto' && x) { x.forecast = null; return { rerender: true }; }
      if (op === 'prod-fit' && p && x) { const P = plan(g); x.prod = clamp(Math.round((P.fc[p.id] * 1.04 - p.inv) * 10) / 10, 0, Math.round(2 * p.cap * 10) / 10); return { rerender: true }; }
      if (op === 'cap-fit' && p && x) { const P = plan(g), need = P.fc[p.id] * (1 + SEGS[p.seg].growth) / 1.05; x.capChange = Math.max(-p.cap, Math.round(need - p.cap)); return { rerender: true }; }
      if (op === 'np-add') { const seg = 2; const np = Object.assign({ name: nextName(g) }, defaultNew(g, seg)); d.newProducts.push(np); return { rerender: true }; }
      if (op === 'np-del') { d.newProducts.splice(+ds.i, 1); return { rerender: true }; }
      if (op === 'fin-cover') {
        if (plan(g).cashEnd >= 3) return { rerender: false, toast: 'This plan already ends the year with enough cash.' };
        for (let k = 0; k < 3; k++) {
          const P = plan(g); if (P.cashEnd >= 3) break;
          const L = BE.finLimits(g, d.fin); let need = 3.5 - P.cashEnd;
          const c = Math.min(need, Math.max(0, L.cur - (+d.fin.curDebt || 0))); d.fin.curDebt = Math.round(((+d.fin.curDebt || 0) + c) * 10) / 10; need -= c;
          if (need > 0.05) { const b = Math.min(need, Math.max(0, L.bond - (+d.fin.bondIssue || 0))); d.fin.bondIssue = Math.round(((+d.fin.bondIssue || 0) + b) * 10) / 10; need -= b; }
          if (need > 0.05) { const s = Math.min(need, Math.max(0, L.stockIssue - (+d.fin.stockIssue || 0))); d.fin.stockIssue = Math.round(((+d.fin.stockIssue || 0) + s) * 10) / 10; }
        }
        const P = plan(g);
        return { rerender: true, toast: P.cashEnd >= 0 ? 'Financing added to cover the plan.' : 'Your borrowing limits cannot cover the whole gap. Trim spending.' };
      }
      if (op === 'reset-draft') { g.draft = BE.defaultDraft(g); return { rerender: true, toast: 'This year’s draft was reset.' }; }
      if (op === 'submit-cancel') { ctx.ui.confirmSubmit = null; return { rerender: true }; }
      if (op === 'submit') {
        const P = plan(g), list = checks(g, P);
        if (countBad(list) && ds.force !== '1') { ctx.ui.confirmSubmit = g.year; return { rerender: true }; }
        const y = g.year, dec = clone(d);
        active(g).forEach(q => { const z = dec.products[q.id]; if (z && z.forecast == null) z.forecast = Math.round(P.fc[q.id] * 10) / 10; });
        ctx.ui.confirmSubmit = null; ctx.ui.tab = BE.isDone({ year: y + 1, years: g.years }) ? 'debrief' : 'reports'; ctx.ui.rep = 'summary'; ctx.ui.ry = y; ctx.ui.justDone = y; ctx.ui.sub = 'brief';
        return { commit: dec, top: true, toast: y === g.years ? 'Final year processed. Here is your debrief.' : `Year ${y} processed.` };
      }
      return null;
    },
    summary(g) {
      const score = BE.finalScore(g), st = BE.standings(g), me = st[0];
      return { score, line: `Placed #${me.place} of 6 · ${F.m(me.cumProfit)} cumulative profit · share price ${F.usd2(me.price)}`, metrics: [{ k: 'Place', v: '#' + me.place }, { k: 'Cumulative profit', v: F.m(me.cumProfit) }, { k: 'Share price', v: F.usd2(me.price) }, { k: 'Market share', v: F.pct(me.share, 1) }] };
    }
  });
})();
