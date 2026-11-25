/* Capex Committee: interface for the capacity and capital-budgeting simulation. The engine lives in capex-engine.js. */
(function () {
  'use strict';
  const S = window.SimLab, E = window.CapexEngine;
  if (!S || !E) return;
  const { UI, N, U } = S;
  const esc = U.esc, clamp = U.clamp, sum = U.sum, avg = U.avg, clone = U.clone;
  const lvl = g => S.lvlOf(g);
  const MK = g => E.MK[g.cfg.market];
  const PP = g => E.P(g);
  const done = g => E.isDone(g);
  const uiStr = (ctx, k, d) => (ctx.ui[k] == null || ctx.ui[k] === '' ? d : ctx.ui[k]);
  const chipBtn = (label, attrs) => `<button type="button" class="chip" data-act="m" ${attrs}>${label}</button>`;
  const fieldBox = (label, control, liveKey, hint) => `<div class="fbox"><span class="lbl">${label}</span>${control}${liveKey || hint ? `<span class="hint"${liveKey ? ` data-live="${liveKey}"` : ''}>${hint || ''}</span>` : ''}</div>`;
  const ti = (g, y) => y - g.y0 + 1;
  const yl = (g, y) => `Y${ti(g, y)}`;
  const realYear = (g, y) => (g.cfg.market === 'cars' ? `FY${y - 1}-${String(y).slice(2)}` : String(y));
  const m = v => N.m(v, Math.abs(v) >= 100 ? 0 : 1);
  const pct = (v, d) => N.pct(v, d == null ? 0 : d);
  const sgn = (v, d) => N.sign(v * 100, x => N.num(x, d == null ? 1 : d) + '%');
  const units = (g, v) => `${N.num(v, MK(g).dec)}${MK(g).scale === 'thousand' ? 'k' : 'M'}`;
  const unitsLong = (g, v) => `${N.num(v, MK(g).dec)} ${MK(g).scale}`;
  const usd2 = (g, v) => (g.cfg.market === 'cars' ? N.usd(v * 1000, 0) : N.usd(v, 2));
  const sp$ = v => N.usd(v, Math.abs(v) >= 100 ? 0 : 2);
  const last = g => g.firm.H[g.firm.H.length - 1];
  const KIND = k => k;

  /* ---------- Header ---------- */
  function header(g) {
    const d = done(g), L = last(g), F = g.firm, cap = E.capTotal(F);
    const spNow = L ? L.sp : g.sp0;
    return `<section class="sheet hdr"><div class="hdr-top"><div class="sh"><span class="eyebrow">${esc(MK(g).tag)} · ${d ? 'Debrief' : `Year ${ti(g, g.y)} of ${g.n} · capital plan open`}</span><h2>${esc(MK(g).firm)}</h2></div><div class="hdr-pills">${UI.pill(esc(MK(g).name), 'neutral')}${UI.level(g.cfg.difficulty)}</div></div>${UI.kpis([
      { k: 'Capacity', v: units(g, cap), d: L ? `${pct(L.util)} used last year${F.idle ? ` · ${units(g, F.idle)} idle` : ''}` : `${MK(g).scale} ${MK(g).unitPl} a year` },
      { k: 'Market share', v: L ? pct(L.share, 1) : pct(E.shareOf(g, F, 'list'), 1), d: L && L.unmet > 0.5 ? `<span class="down">${units(g, L.unmet)} demand lost</span>` : 'of the market' },
      { k: 'EBITDA last year', v: L ? m(L.ebitda) : '–', d: L ? `margin ${pct(L.ebitda / Math.max(1, L.rev))}` : 'no results yet' },
      { k: 'Share price', v: sp$(spNow), d: L ? `${sgn(spNow / g.sp0 - 1, 0)} since the start` : 'starting price', cls: L ? (spNow >= g.sp0 ? 'up' : 'down') : '' }
    ])}</section>`;
  }
  function caseBrief(g, open) {
    const p = PP(g), mk = MK(g), cars = g.cfg.market === 'cars';
    return UI.brief(mk.firm, open, `<p>You chair the capital committee of <strong>${esc(mk.firm)}</strong>, which makes ${esc(mk.what)} with ${units(g, p.cap0)} of capacity a year and about ${pct(p.share0)} of its market. Every year you decide how much capacity to add, idle or keep, which projects to fund and how to pay for them.</p><p>The market’s demand is the <strong>real history of an industry you will not be told</strong> until the end. You see last year’s market and the news, as the managers did at the time. Rivals add capacity too, and when the industry has too much, prices fall.</p><ul class="steps"><li><strong>Brownfield lines</strong> are quick (ready next year) but small.</li><li><strong>A new plant</strong> takes two years. Building it in two phases costs more in total, but the second phase is an option you can take up later, or never.</li><li><strong>Automation</strong> cuts unit costs; a <strong>${cars ? 'new model' : 'new module generation'}</strong> restores your share, which otherwise fades every year.</li><li>When demand outruns capacity you lose sales, and some of those customers do not come back. When capacity sits empty, fixed costs eat your margin; you can idle lines to save most of their running cost.</li></ul><p>Appraise each project with the lab before you approve it. You are judged on shareholder value, return on capital, market position, financial resilience and the quality of your appraisals.</p>`, 'The two hardest questions in capital budgeting: what will demand really be, and what happens if you are wrong?');
  }

  /* ---------- Market view on the plan tab ---------- */
  function briefing(g) {
    const y = g.y, mk = MK(g), txt = mk.briefs[y] || '', gr = E.growth(g, y - 1);
    const cons = E.consensus(g, y);
    const facts = [`Last year’s market: <strong>${unitsLong(g, E.D(g, y - 1))}</strong> ${esc(mk.unitPl)} (${gr == null ? '–' : sgn(gr)})`];
    if (!last(g)) { const p = PP(g), q0 = E.D(g, y - 1) * p.share0 * (0.82 + 0.36 * p.F0), s0 = Math.min(q0, p.cap0); facts.push(`you sold about <strong>${units(g, s0)}</strong>, running at ${pct(s0 / p.cap0)} of capacity`); }
    if (lvl(g) < 2) facts.push(`analyst consensus for this year: <strong>${sgn(cons)}</strong>`);
    return UI.sheet(`The market · start of year ${ti(g, y)}`, 'What managers knew', `<p class="case">${esc(txt)}</p><p class="case">${facts.join(' · ')}.</p>${UI.chart('cx-dem', () => demandSpec(g), 220, [{ t: 'Market demand', c: 'var(--s1)' }].concat(lvl(g) < 2 ? [{ t: 'Consensus path', c: 'var(--ink-3)' }] : []), 'Market demand by year')}${lvl(g) === 0 ? `<p class="note">${coachLine(g)}</p>` : ''}`);
  }
  function knownYears(g) { const ys = Object.keys(MK(g).D).map(Number).sort((a, b) => a - b); return ys.filter(y => y < (done(g) ? g.y1 + 1 : g.y)); }
  function demandSpec(g) {
    const ys = knownYears(g).slice(-12), Dv = ys.map(y => E.D(g, y)), n = ys.length;
    const series = [{ values: Dv.concat([null, null, null]), c: 'var(--s1)', w: 2.4 }];
    if (lvl(g) < 2 && !done(g)) { const c = E.consensus(g, g.y); let v = Dv[n - 1]; const proj = Dv.map((x, i) => (i === n - 1 ? x : null)).concat([1, 2, 3].map(() => (v *= 1 + c))); series.push({ values: proj, c: 'var(--ink-3)', w: 1.6, dash: true, noDot: true }); }
    const labs = ys.map(y => (y < g.y0 ? 'pre' : yl(g, y))).concat(['+1', '+2', '+3']);
    return { series, xLabel: i => (labs[i] === 'pre' ? (i === 0 ? 'Earlier' : '') : labs[i]), yMin: 0, yFmt: v => N.num(v, 0) };
  }
  function coachLine(g) {
    const L = last(g), cons = E.consensus(g, g.y), gr = E.growth(g, g.y - 1), R = g.R;
    const ann = R.announced.filter(a => a.ready >= g.y).reduce((s, a) => s + a.cap, 0);
    if (L && L.util > 0.97) return `You ran at ${pct(L.util)} last year and turned away ${units(g, L.unmet)} of demand. Only a brownfield line can add capacity by next year.`;
    if (ann > 0 && L) return `Rivals have announced ${units(g, ann)} of new capacity arriving soon, about ${pct(ann / E.D(g, g.y - 1))} of the market. Extra industry capacity tends to push prices down.`;
    if (gr != null && cons > gr + 0.04) return `Consensus expects ${sgn(cons)} this year although the market grew only ${sgn(gr)} last year. Forecasters often extrapolate the recent past.`;
    if (L && L.util < 0.75) return `Utilisation was only ${pct(L.util)}. Idling a line saves most of its running cost, and a restart is quick.`;
    return 'Test each project against a growth rate well below consensus. If the NPV only works in the good case, consider the phased or smaller option.';
  }
  function plantSheet(g) {
    const F = g.firm, p = PP(g), L = last(g);
    const rows = F.cap.map(c => [c.kind === 'base' ? 'Existing plants' : E.projInfo(g, c.kind, c.since).name, units(g, c.cap), c.since ? yl(g, c.since) : 'before you', 'running']);
    if (F.idle) rows.push(['Idled lines', `<span class="down">−${units(g, F.idle)}</span>`, '', 'idle']);
    F.orders.forEach(o => rows.push([`${E.projInfo(g, o.kind, o.y0).name} (ordered ${yl(g, o.y0)})`, o.cap ? `+${units(g, o.cap)}` : '–', yl(g, o.ready), 'on order']));
    const R = g.R, ann = lvl(g) === 0 ? R.announced.filter(a => a.ready >= g.y) : [];
    return UI.sheet('Plants', 'Capacity and pipeline', UI.table(['Asset', 'Capacity', 'Ready', 'Status'], rows, { sticky: true }) + `<p class="cap">${L ? `Last year: ${units(g, L.sales)} sold from ${units(g, L.active)} running capacity; the industry ran at about ${pct(Math.min(1, (L.D) / Math.max(1, R.H[R.H.length - 1].cap + L.active)))}.` : 'Results appear after the first year.'}${ann.length ? ` Rivals’ announced additions: ${ann.map(a => `${units(g, a.cap)} in ${yl(g, a.ready)}`).join(', ')}.` : ''}</p>`);
  }

  /* ---------- Appraisal lab ---------- */
  function availability(g, kind) {
    const F = g.firm, p = PP(g), d = g.draft, o = d.orders;
    if (kind === 'plantB') { const free = F.plants.filter(pl => !pl.expanded).length - (o.plantB || 0); return free > 0 ? null : 'Needs a completed phase-1 plant'; }
    if (kind === 'auto') { const used = F.auto + F.orders.filter(x => x.kind === 'auto').length + (o.auto || 0); return used < p.autoMax ? null : `At most ${p.autoMax} upgrades`; }
    if (kind === 'model') return F.orders.some(x => x.kind === 'model') || (o.model || 0) ? 'One programme at a time' : null;
    if (kind === 'line') return (o.line || 0) >= 2 ? 'At most two lines a year' : null;
    if (kind === 'plantA' || kind === 'full') return (o.plantA || 0) + (o.full || 0) >= 1 ? 'One new plant a year' : null;
    return null;
  }
  function labHtml(g, ctx) {
    const d = g.draft, kind = uiStr(ctx, 'pk', 'line'), info = E.projInfo(g, kind), ap = E.appraise(g, kind, d.a), L2 = lvl(g) < 2, why = availability(g, kind);
    const be = ap.breakeven, beTxt = be === Infinity ? 'not reached even at 60% a year' : be === -Infinity ? 'positive even if the market shrinks 30% a year' : sgn(be);
    const kp = [
      { k: 'NPV', v: `<span class="${ap.npv < 0 ? 'down' : 'up'}">${m(ap.npv)}</span>`, d: `at a ${pct(ap.wacc, 1)} cost of capital` },
      { k: 'IRR', v: ap.irr == null ? '–' : pct(ap.irr, 1), d: ap.irr == null ? 'no positive return' : ap.irr > ap.wacc ? 'above the cost of capital' : 'below the cost of capital' },
      { k: 'Payback', v: ap.payback == null ? 'never' : `${ap.payback} yr`, d: 'undiscounted' },
      { k: 'Cost', v: m(info.cost), d: info.lead === 1 ? 'paid this year' : 'half now, half next year' }
    ];
    let h = `<p class="case"><strong>${esc(info.name)}.</strong> ${esc(info.what)}</p>${UI.kpis(kp)}`;
    if (L2) {
      h += `<p class="cap">Breakeven growth (the steady growth rate at which NPV is zero): <strong>${beTxt}</strong>.</p>`;
      h += UI.table(['Growth in the next 3 years', 'NPV'], ap.sens.map(s => [`${sgn(s.g1)}${s.d === 0 ? ' · your assumption' : ''}`, `<span class="${s.npv < 0 ? 'down' : ''}">${m(s.npv)}</span>`]), { sticky: true });
    }
    h += `<div class="actions">${why ? `<span class="cap">${esc(why)}</span>` : chipBtn('Add to this year’s plan', `data-op="approve" data-k="${kind}"`)}</div>`;
    return h;
  }
  function cfSpec(g, ctx) {
    const kind = uiStr(ctx, 'pk', 'line'), ap = E.appraise(g, kind, g.draft.a, { lite: true });
    return { type: 'bars', groups: ap.cf.map((x, k) => (k === 0 ? 'Now' : '+' + k)), series: [{ values: ap.cf, colors: ap.cf.map(x => (x < 0 ? 'var(--bad)' : 'var(--good)')) }], yFmt: v => '$' + Math.round(v) + 'M' };
  }
  function labSheet(g, ctx) {
    const d = g.draft, kind = uiStr(ctx, 'pk', 'line'), p = PP(g);
    const chips = `<div class="chips sm" role="group" aria-label="Project to appraise">${E.KINDS.map(k => `<button type="button" class="chip" data-act="tab" data-group="pk" data-value="${k}" aria-pressed="${k === kind}">${esc(E.projInfo(g, k).name)}</button>`).join('')}</div>`;
    const inputs = `<div class="pgrid">${fieldBox('Market growth, next 3 years', UI.num('a:g1', d.a.g1, { min: -30, max: 80, step: 1, dec: 0, unit: '%', label: 'Market growth next three years' }), null, lvl(g) < 2 ? `consensus ${sgn(E.consensus(g, g.y))}` : 'your own forecast')}${fieldBox('Growth after that', UI.num('a:g2', d.a.g2, { min: -20, max: 40, step: 1, dec: 0, unit: '%', label: 'Market growth after three years' }))}${fieldBox('Your market share', UI.num('a:share', d.a.share, { min: 1, max: 40, step: 0.5, dec: 1, unit: '%', label: 'Assumed market share' }), null, `now ${pct(E.shareOf(g, g.firm, d.stance), 1)}`)}</div>`;
    return UI.sheet('Appraisal lab', 'Test a project before you approve it', `${chips}${inputs}<div data-live="cx-lab">${labHtml(g, ctx)}</div>${UI.chart('cx-cf', () => cfSpec(g, ctx), 190, [{ t: 'Cash in', c: 'var(--good)' }, { t: 'Cash out', c: 'var(--bad)' }], 'Incremental cash flow of the project by year')}<p class="cap">Incremental after-tax cash flows, including the depreciation tax shield, against the plan without this project. Your assumptions also go on record: the debrief audits every approved project against what actually happened.</p>`);
  }

  /* ---------- Plan ---------- */
  function planList(g) {
    const d = g.draft, items = [];
    E.KINDS.forEach(k => { for (let i = 0; i < (d.orders[k] || 0); i++) items.push(k); });
    if (!items.length) return '<p class="case">No projects approved this year. Doing nothing is a decision too: check whether you can meet demand next year.</p>';
    const rows = items.map((k, i) => { const info = E.projInfo(g, k), ap = E.appraise(g, k, d.a, { lite: true }); return [esc(info.name), m(info.cost), info.cap ? `+${units(g, info.cap)} in ${yl(g, g.y + info.lead)}` : yl(g, g.y + info.lead), `<span class="${ap.npv < 0 ? 'down' : ''}">${m(ap.npv)}</span>`, chipBtn('Remove', `data-op="unapprove" data-k="${k}"`)]; });
    return UI.table(['Project', 'Cost', 'Ready', 'NPV', ''], rows, { sticky: true });
  }
  function cashThisYear(g) {
    const d = g.draft, F = g.firm;
    let spend = sum(F.orders.map(o => (o.due && o.due[g.y]) || 0));
    E.KINDS.forEach(k => { const info = E.projInfo(g, k), n = d.orders[k] || 0; spend += n * (info.lead === 1 ? info.cost : info.cost / 2); });
    return spend;
  }
  function financeHtml(g) {
    const d = g.draft, F = g.firm, L = last(g), capex = cashThisYear(g), p = PP(g);
    const ebitda = L ? L.ebitda : 0, ocf = ebitda * (1 - p.tax) - (L ? L.interest : F.debt * p.rate);
    const gap = capex - ocf - F.cash;
    const lev = ebitda > 0 ? (F.debt - F.cash + Math.max(0, capex - ocf)) / ebitda : null;
    const parts = [`Capital spending this year <strong>${m(capex)}</strong>`, `cash on hand ${m(F.cash)}`, `debt ${m(F.debt)}`];
    if (gap > 0) parts.push(`likely funding need about <strong>${m(gap)}</strong>`);
    if (lev != null) parts.push(`net debt to EBITDA about <strong class="${lev > 3.5 ? 'down' : ''}">${N.num(lev, 1)}×</strong>${lev > 3.5 ? ' (above the 3.5× covenant)' : ''}`);
    return parts.join(' · ');
  }
  function opsSheet(g) {
    const d = g.draft, F = g.firm, p = PP(g), cap = E.capReady(F, g.y);
    const stance = UI.chips('stance', 'Pricing', [{ v: 'discount', t: 'Discount', s: `price −${Math.round((1 - p.stance.discount[0]) * 100)}%, more share` }, { v: 'list', t: 'List price', s: 'hold price' }, { v: 'premium', t: 'Premium', s: `price +${Math.round((p.stance.premium[0] - 1) * 100)}%, less share` }], d.stance);
    const idle = fieldBox(`Lines to idle (blocks of ${units(g, p.block)})`, UI.num('idle', d.idle / p.block, { min: 0, max: Math.max(0, Math.floor(cap / p.block) - 1), step: 1, dec: 0, label: 'Number of line blocks to idle' }), 'cx-idle', idleHint(g));
    const fund = UI.chips('fund', 'If cash runs short, raise it with', [{ v: 'debt', t: 'Debt', s: 'cheaper, adds risk' }, { v: 'mix', t: 'Half and half' }, { v: 'equity', t: 'New shares', s: 'safer, dilutes holders' }], d.fund);
    return UI.sheet('Operations and funding', 'Run the plants and pay for the plan', `<div class="fields">${stance}<div class="pgrid">${idle}</div>${fund}</div><div class="summary" data-live="cx-fin">${financeHtml(g)}</div>`);
  }
  function idleHint(g) {
    const d = g.draft, F = g.firm, p = PP(g), cap = E.capReady(F, g.y);
    const save = d.idle * p.fixedPer * 0.7 * Math.pow(1 + (p.costTrend || 0), g.y - g.y0);
    const restart = d.idle < F.idle ? (F.idle - d.idle) / p.block * p.restart : 0;
    return `${units(g, cap - d.idle)} running this year${d.idle ? ` · saves about ${m(save)}` : ''}${restart ? ` · restart costs ${m(restart)}` : ''}`;
  }
  function resultBanner(g) {
    const L = last(g); if (!L || done(g)) return '';
    const parts = [`The market came in at <strong>${unitsLong(g, L.D)}</strong> (${sgn(E.growth(g, L.y))}). You sold <strong>${units(g, L.sales)}</strong> at ${pct(L.util)} utilisation${L.unmet > 0.5 ? `, and turned away <strong class="down">${units(g, L.unmet)}</strong> for lack of capacity` : ''}${L.spill > 0.5 ? `; rivals’ shortages sent you ${units(g, Math.min(L.spill, L.sales))} of extra orders` : ''}.`];
    parts.push(`EBITDA ${m(L.ebitda)}, net income ${m(L.ni)}, share price ${sp$(L.sp)}.`);
    if (L.ind < 0.98) parts.push(`Too much capacity across the industry pushed prices down ${pct(1 - L.ind)}.`);
    if (L.raisedEq > 0.5) parts.push(`You issued ${m(L.raisedEq)} of new shares.`);
    if (L.raisedDebt > 0.5) parts.push(`You borrowed ${m(L.raisedDebt)}.`);
    if (L.lev > 3.5) parts.push('<strong class="down">Net debt is above 3.5× EBITDA: lenders have raised your interest rate.</strong>');
    return `<section class="sheet result"><span class="eyebrow">Year ${ti(g, L.y)} results</span><p class="case">${parts.join(' ')}</p></section>`;
  }
  function planView(g, ctx) {
    let h = '';
    if (g.y === g.y0) h += caseBrief(g, !ctx.ui.seenBrief);
    h += briefing(g) + plantSheet(g) + labSheet(g, ctx);
    h += UI.sheet(`Year ${ti(g, g.y)} · capital plan`, 'Projects approved this year', `<div data-live="cx-plan">${planList(g)}</div>`);
    h += opsSheet(g);
    h += `<section class="sheet result"><div class="actions"><button type="button" class="btn btn-primary btn-block" data-act="m" data-op="submit">${g.y === g.y1 ? 'Approve the final year’s plan' : `Approve the plan for year ${ti(g, g.y)}`}</button></div><p class="cap">The year then plays out: demand, prices, rivals and your results. Decisions cannot be undone.</p></section>`;
    return h;
  }

  /* ---------- Market and company tabs ---------- */
  function marketView(g) {
    const ys = knownYears(g).filter(y => y >= g.y0 - 1), F = g.firm;
    const rows = ys.map(y => { const h = F.H.find(x => x.y === y), r = g.R.H.find(x => x.y === y); return [y < g.y0 ? 'Before you' : yl(g, y), unitsLong(g, E.D(g, y)), E.growth(g, y) == null ? '–' : sgn(E.growth(g, y)), h ? pct(h.share, 1) : '–', h && r && lvl(g) < 2 ? pct(Math.min(1, h.D / Math.max(1, r.cap + h.active))) : '–', h ? (h.ind < 0.995 ? `<span class="down">${sgn(h.ind - 1)}</span>` : h.ind > 1.005 ? sgn(h.ind - 1) : '0%') : '–']; });
    let h = UI.sheet('Market', 'Demand year by year', UI.table(['Year', 'Market', 'Growth', 'Your share', 'Industry use', 'Price pressure'], rows, { sticky: true }) + `<p class="cap">${lvl(g) < 2 ? 'Industry use estimates how full all the industry’s plants were.' : 'At Advanced level you cannot see rivals’ capacity.'} Price pressure is the change in market prices caused by too much or too little capacity.</p>`);
    if (F.H.length) h += UI.sheet('Capacity against demand', 'Your plants and your orders', UI.chart('cx-capd', () => ({ series: [{ values: F.H.map(x => x.q), c: 'var(--s1)', w: 2.2 }, { values: F.H.map(x => x.active), c: 'var(--s2)', w: 2.2 }, { values: F.H.map(x => x.sales), c: 'var(--good)', w: 1.6, dash: true }], xLabel: i => yl(g, F.H[i].y), yMin: 0, yFmt: v => N.num(v, 0) }), 220, [{ t: 'Demand for your products', c: 'var(--s1)' }, { t: 'Running capacity', c: 'var(--s2)' }, { t: 'Sales', c: 'var(--good)' }], 'Demand, capacity and sales by year'));
    return h;
  }
  function companyView(g) {
    const H = g.firm.H; if (!H.length) return UI.sheet('Company', 'No results yet', '<p class="case">Financial statements appear after your first year.</p>');
    const cols = H.map(h => yl(g, h.y));
    const row = (k, f, cls) => ({ cls: cls || '', cells: [k].concat(H.map(f)) });
    const rows = [
      row('Market', h => N.num(h.D, MK(g).dec)), row('Your share', h => pct(h.share, 1)), row('Units sold', h => N.num(h.sales, MK(g).dec)), row('Capacity running', h => N.num(h.active, MK(g).dec)), row('Utilisation', h => pct(h.util)),
      row('Price', h => usd2(g, h.price)), row('Revenue', h => m(h.rev), 'sep'), row('EBITDA', h => m(h.ebitda)), row('Depreciation', h => m(h.dep)), row('EBIT', h => m(h.ebit)), row('Interest', h => m(h.interest)), row('Net income', h => `<span class="${h.ni < 0 ? 'down' : ''}">${m(h.ni)}</span>`),
      row('Capital spending', h => m(h.capexPaid), 'sep'), row('Free cash flow', h => `<span class="${h.cf < 0 ? 'down' : ''}">${m(h.cf)}</span>`), row('Net debt', h => m(h.netDebt)), row('Net debt / EBITDA', h => (h.lev > 50 ? 'n/m' : `<span class="${h.lev > 3.5 ? 'down' : ''}">${N.num(h.lev, 1)}×</span>`)), row('ROCE', h => pct(h.roce, 1)), row('Share price', h => sp$(h.sp), 'sep')
    ];
    let h = UI.sheet('Company', 'Financial statements', UI.table([''].concat(cols), rows, { sticky: true, cls: 'wide-t' }) + '<p class="cap">$ millions unless shown. The share price assumes investors value the company at a fixed multiple of EBITDA, less net debt.</p>');
    h += UI.sheet('Share price', 'Year by year', UI.chart('cx-sp', () => ({ series: [{ values: [g.sp0].concat(H.map(x => x.sp)), c: 'var(--c-you)', w: 2.6 }], xLabel: i => (i === 0 ? 'Start' : yl(g, H[i - 1].y)), yMin: 0, yFmt: v => '$' + Math.round(v) }), 200, null, 'Share price by year'));
    return h;
  }
  function guideView(g) {
    return UI.sheet('Guide', 'Capital budgeting in brief', `<div class="case"><p><strong>NPV.</strong> The value today of a project’s future cash flows, discounted at the cost of capital, minus what it costs. Positive NPV creates value, but only if the forecast behind it is right.</p><p><strong>IRR and payback.</strong> IRR is the discount rate at which NPV is zero; payback is how long it takes to earn the cost back. Both are useful checks, and both ignore the size of the bet.</p><p><strong>Breakeven growth and sensitivity.</strong> The growth rate at which a project stops paying. If it is close to what you expect, the project is fragile.</p><p><strong>Real options.</strong> A phase-1 plant costs more per unit, but it buys the right, not the obligation, to expand cheaply later. When demand is uncertain, flexibility has value.</p><p><strong>Utilisation.</strong> Running near full spreads fixed costs, but past about 92% overtime raises costs, and above 100% you turn customers away for good.</p><p><strong>Leverage.</strong> Debt is cheaper than equity until net debt passes about 2× EBITDA; above 3.5× the covenant is broken and lenders charge much more. New shares are safer but dilute existing holders.</p><p><strong>Post-audit.</strong> Good companies check approved projects against what actually happened. Your debrief does this for every project you approve.</p></div>`) +
      UI.sheet('Scoring', 'How your run is graded', UI.table(['Part', 'Weight', 'What counts'], [['Shareholder value', '45%', 'Your final share price against a cautious follower and a firm with perfect foresight'], ['Return on capital', '15%', 'ROCE over the whole run against the cost of capital'], ['Market position', '15%', 'Your final market share and the demand you turned away'], ['Financial resilience', '10%', 'Years above 3.5× net debt to EBITDA'], ['Appraisal discipline', '15%', 'Approving positive-NPV projects on realistic forecasts, and how they turned out']], { cls: 'wrap' }));
  }

  /* ---------- Debrief ---------- */
  function revealBody(g) {
    const mk = MK(g), st = mk.story, ys = []; for (let y = g.y0; y <= g.y1; y++) ys.push(y);
    const rows = ys.map(y => [`${yl(g, y)} · <strong>${realYear(g, y)}</strong>`, unitsLong(g, E.D(g, y)), sgn(E.growth(g, y))]);
    return `<p class="rv-name">${esc(st.name)}</p><p class="rv-meta">${esc(st.years)}${g.cfg.length === 'short' ? ' (you played the later years)' : ''}</p><p class="case">${esc(st.lede)}</p><ul class="steps">${st.events.map(e => `<li><strong>${esc(e[0])}</strong>: ${esc(e[1])}</li>`).join('')}</ul><p class="case"><strong>The lesson.</strong> ${esc(st.lesson)}</p>${UI.table(['Year', g.cfg.market === 'cars' ? 'Domestic sales' : 'Shipments', 'Growth'], rows, { sticky: true })}<p class="rv-src">Source: ${esc(st.src)} The firm, its costs, its rivals and its prices are invented for the simulation.</p>`;
  }
  function debriefView(g) {
    const sc = E.score(g), F = g.firm, B = g.bench;
    let h = `<section class="sheet result"><span class="eyebrow">Debrief · Capex Committee · ${esc(MK(g).tag)}</span><div class="grade"><span class="letter">${S.grade(sc.total)}</span><div><h2>${S.gradeWord(sc.total)}</h2><span class="num">${sc.total} / 100</span></div></div><p class="case">Your share price ended at ${sp$(sc.sp)} (from ${sp$(g.sp0)}). A cautious follower that added lines only when its plants were full reached ${sp$(sc.spF)}; a firm with perfect foresight reached ${sp$(sc.spH)}.</p><div class="sparts">${sc.parts.map(p => `${UI.meter(`${p.k} <span class="cap">${p.w}%</span>`, p.v / 100, String(p.v), p.v >= 70 ? 'good' : p.v >= 50 ? '' : 'warn')}<p class="cap sp-d">${esc(p.d)}</p>`).join('')}</div></section>`;
    h += UI.reveal('Which market did you just face?', revealBody(g), false);
    const firms = [{ n: 'Your company', F, c: 'var(--c-you)' }, { n: 'Cautious follower', F: B.follower, c: 'var(--c-b)' }, { n: 'Did nothing', F: B.hold, c: 'var(--ink-3)' }, { n: 'Perfect foresight', F: B.hindsight, c: 'var(--c-c)' }];
    h += UI.sheet('Benchmarks', 'Share price against three other ways to run the company', UI.chart('cx-bench', () => ({ series: firms.map(x => ({ values: [g.sp0].concat(x.F.H.map(h => h.sp)), c: x.c, w: x.F === F ? 3 : 1.6 })), xLabel: i => (i === 0 ? 'Start' : yl(g, F.H[i - 1].y)), yMin: 0, yFmt: v => '$' + Math.round(v) }), 230, firms.map(x => ({ t: x.n, c: x.c })), 'Share price for each firm') +
      UI.table(['Firm', 'Final share price', 'Final capacity', 'Final share', 'Lost demand'], firms.map(x => { const L = x.F.H[x.F.H.length - 1], lost = sum(x.F.H.map(h => h.unmet)) / Math.max(1, sum(x.F.H.map(h => h.D * h.share))); return { cls: x.F === F ? 'me' : '', cells: [`<i class="cdot" style="background:${x.c}" aria-hidden="true"></i>${x.n}`, sp$(L.sp), units(g, L.cap), pct(L.share, 1), pct(lost)] }; }), { sticky: true }));
    const pa = sc.audit;
    h += UI.sheet('Post-audit', pa.length ? 'Every project you approved, at approval and in hindsight' : 'You approved no projects', pa.length ? UI.table(['Project', 'Approved', 'Your growth assumption', 'NPV at approval', 'NPV in hindsight'], pa.map(x => [esc(E.projInfo(g, x.kind, x.y).name), yl(g, x.y), `${sgn(x.a.g1 / 100, 0)} (consensus ${sgn(x.cons, 0)})`, `<span class="${x.npv0 < 0 ? 'down' : ''}">${m(x.npv0)}</span>`, `<span class="${x.npv1 < 0 ? 'down' : 'up'}">${m(x.npv1)}</span>`]), { sticky: true, cls: 'wrap' }) + '<p class="cap">Hindsight NPV uses the sales each project actually made (newest capacity is the last to be used), the prices you actually got, and 60% of its remaining book value at the end.</p>' : '<p class="case">Without new capacity the company could not follow the market. Compare your result with the benchmarks above.</p>');
    h += UI.sheet('Capacity against demand', 'Your whole run', UI.chart('cx-capd2', () => ({ series: [{ values: F.H.map(x => x.D * x.share), c: 'var(--s1)', w: 2.2 }, { values: F.H.map(x => x.active), c: 'var(--s2)', w: 2.2 }, { values: B.hindsight.H.map(x => x.active), c: 'var(--c-c)', w: 1.4, dash: true }], xLabel: i => yl(g, F.H[i].y), yMin: 0, yFmt: v => N.num(v, 0) }), 220, [{ t: 'Demand for your products', c: 'var(--s1)' }, { t: 'Your running capacity', c: 'var(--s2)' }, { t: 'Perfect foresight capacity', c: 'var(--c-c)' }], 'Demand and capacity over the run'));
    const notes = coach(g, sc);
    h += UI.sheet('Coach’s notes', 'What to take away', `<ul class="notes plain">${notes.map(t => `<li>${t}</li>`).join('')}</ul>`);
    h += `<div class="actions">${UI.btn('Replay this market', 'retry-run', 'btn-primary', `data-id="${esc(S.App.cur ? S.App.cur.meta.id : '')}"`)}${UI.btn('Back to home', 'leave-run', 'btn-ghost')}</div>`;
    return h;
  }
  function coach(g, sc) {
    const F = g.firm, n = [], H = F.H;
    const lowU = H.filter(h => h.util < 0.75).length, full = H.filter(h => h.unmet > 0.02 * h.D * h.share).length;
    if (lowU) n.push(`Your plants ran below 75% in ${lowU} year${lowU === 1 ? '' : 's'}. Empty capacity still costs money to keep.`);
    if (full) n.push(`You turned customers away in ${full} year${full === 1 ? '' : 's'}; lost customers lowered your share in the years that followed.`);
    const neg = sc.audit.filter(x => x.npv0 < 0).length, bad = sc.audit.filter(x => x.npv1 < 0).length;
    if (neg) n.push(`${neg} project${neg === 1 ? ' was' : 's were'} approved with a negative NPV on your own assumptions.`);
    if (sc.audit.length) n.push(`${sc.audit.length - bad} of ${sc.audit.length} projects earned their cost of capital in hindsight.`);
    const opt = sc.audit.filter(x => x.a && x.a.g1 / 100 > x.cons + 0.06).length;
    if (opt) n.push(`${opt} approval${opt === 1 ? '' : 's'} relied on growth more than 6 points above consensus. Optimistic forecasts are the most common cause of bad capital spending.`);
    if (sc.breaches) n.push(`Net debt ran above 3.5× EBITDA in ${sc.breaches} year${sc.breaches === 1 ? '' : 's'}, which raised your borrowing costs.`);
    const eq = H.reduce((s, h) => s + h.raisedEq, 0); if (eq > 1) n.push(`You raised ${m(eq)} of new equity.`);
    return n.slice(0, 6);
  }

  /* ---------- Module ---------- */
  function live(g, ctx) {
    if (done(g) || uiStr(ctx, 'tab', 'plan') !== 'plan') return {};
    return { 'cx-lab': labHtml(g, ctx), 'cx-plan': planList(g), 'cx-fin': financeHtml(g), 'cx-idle': idleHint(g), _charts: ['cx-cf'] };
  }
  S.App.register({
    id: 'capex', cat: 'finance', title: 'Capex Committee', area: 'Capital budgeting', length: '15 years · 40–60 min', depth: 'Full simulation', version: 1, persist: 'replay', wide: true,
    practises: 'Capital budgeting and corporate finance courses · real options · capacity and investment decisions',
    blurb: 'Decide where a manufacturer puts its capital, year after year, against the real demand history of a disguised industry. Appraise projects with NPV, IRR and breakeven analysis, build in phases or all at once, fund the plan, and live with rivals who overbuild in booms.',
    detail: '<p>Two real markets, each fifteen years long and disguised until the debrief. Brownfield lines, a phased new plant with an option to expand, a full-size plant, automation and new-model programmes, with lead times, depreciation and fixed costs. Idle lines, set prices, choose debt or new shares, and watch covenants. Rival firms add capacity when they see growth, so industry overcapacity pushes prices down. An appraisal lab gives NPV, IRR, payback, breakeven growth and sensitivity on your own forecasts. The debrief benchmarks you against a cautious follower, a firm that did nothing and one with perfect foresight, post-audits every project you approved, and reveals the market, the years and the events behind them.</p>',
    options: [
      { id: 'market', label: 'Market', default: 'cars', choices: E.MKEYS.map(k => ({ v: k, t: E.MK[k].name, s: E.MK[k].tag })) },
      { id: 'length', label: 'Length', default: 'full', choices: [{ v: 'full', t: '15 years', s: 'About 40–60 minutes' }, { v: 'short', t: '10 years', s: 'About 30–40 minutes' }] },
      { id: 'difficulty', label: 'Difficulty', default: 'guided', choices: [{ v: 'guided', t: 'Foundation', s: 'Consensus, rivals’ announcements, breakeven and coaching' }, { v: 'standard', t: 'Intermediate', s: 'Consensus and breakeven, no coaching or rival news' }, { v: 'expert', t: 'Advanced', s: 'Your own forecasts, NPV and IRR only' }] }
    ],
    create: (seed, config) => E.create(seed, config),
    apply: (g, d) => E.apply(g, d),
    isDone: g => E.isDone(g),
    progress: g => (done(g) ? `${MK(g).name} · complete` : `${MK(g).name} · year ${ti(g, g.y)} of ${g.n}`),
    view(g, ctx) {
      const d = done(g);
      let tab = uiStr(ctx, 'tab', d ? 'debrief' : 'plan');
      if (d && tab === 'plan') tab = 'debrief';
      if (!d && tab === 'debrief') tab = 'plan';
      ctx.ui.tab = tab;
      let h = header(g);
      h += UI.tabs('tab', [{ v: d ? 'debrief' : 'plan', t: d ? 'Debrief' : `Year ${ti(g, g.y)}` }, { v: 'market', t: 'Market' }, { v: 'company', t: 'Company' }, { v: 'guide', t: 'Guide' }], tab, 'main-tabs', true);
      if (tab === 'plan') h += resultBanner(g) + planView(g, ctx);
      else if (tab === 'market') h += marketView(g);
      else if (tab === 'company') h += companyView(g);
      else if (tab === 'guide') h += guideView(g);
      else h += debriefView(g);
      return h;
    },
    live,
    onTab(g, group, value, ctx) { if (group === 'tab') ctx.ui.seenBrief = true; },
    field(g, name, value) {
      const d = g.draft; if (!d) return null;
      if (name === 'a:g1') { d.a.g1 = clamp(Math.round(+value || 0), -30, 80); return null; }
      if (name === 'a:g2') { d.a.g2 = clamp(Math.round(+value || 0), -20, 40); return null; }
      if (name === 'a:share') { d.a.share = clamp(Math.round((+value || 0) * 2) / 2, 1, 40); return null; }
      if (name === 'idle') { const p = PP(g); d.idle = clamp(Math.round(+value || 0), 0, 200) * p.block; return null; }
      if (name === 'stance') { d.stance = ['discount', 'list', 'premium'].indexOf(value) >= 0 ? value : 'list'; return { rerender: true }; }
      if (name === 'fund') { d.fund = ['debt', 'mix', 'equity'].indexOf(value) >= 0 ? value : 'debt'; return null; }
      return null;
    },
    act(g, op, el, ctx) {
      const d = g.draft; if (!d) return null;
      const k = el.dataset.k;
      if (op === 'approve') { if (E.KINDS.indexOf(k) < 0 || availability(g, k)) return { toast: availability(g, k) || 'Not available.' }; d.orders[k] = (d.orders[k] || 0) + 1; return { rerender: true, draft: true, toast: `${E.projInfo(g, k).name} added to the plan.` }; }
      if (op === 'unapprove') { if (d.orders[k]) d.orders[k]--; if (!d.orders[k]) delete d.orders[k]; return { rerender: true, draft: true }; }
      if (op === 'submit') { ctx.ui.seenBrief = true; const lastYear = g.y === g.y1; return { commit: { orders: clone(d.orders), idle: d.idle, stance: d.stance, fund: d.fund, a: clone(d.a) }, top: true, toast: lastYear ? 'The final year is done. Here is your debrief.' : `Plan for year ${ti(g, g.y)} approved.` }; }
      return null;
    },
    summary(g) {
      const sc = E.score(g);
      return { score: sc.total, line: `${MK(g).name} · share price ${sp$(sc.sp)} vs follower ${sp$(sc.spF)} · ROCE ${pct(sc.roce, 1)}`, metrics: [{ k: 'Share price', v: sp$(sc.sp) }, { k: 'ROCE', v: pct(sc.roce, 1) }] };
    }
  });
  void KIND;
})();
