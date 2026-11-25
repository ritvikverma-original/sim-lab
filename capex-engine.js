/* Capex Committee engine: capacity and capital decisions against a real demand history.
   One firm model is shared by the player and the benchmark firms, so every firm faces the same market and rivals. */
(function () {
  'use strict';
  const S = window.SimLab, CD = window.CapexData;
  if (!S || !CD) return;
  const { clamp, sum, avg, round, clone } = S.U;
  const MK = CD.MARKETS, MKEYS = Object.keys(MK);
  const KINDS = ['line', 'plantA', 'plantB', 'full', 'auto', 'model'];
  const CAPK = ['line', 'plantA', 'plantB', 'full'];
  const lvl = g => S.lvlOf(g);
  const P = g => MK[g.cfg.market].p;
  const D = (g, y) => MK[g.cfg.market].D[y];
  const growth = (g, y) => (D(g, y) != null && D(g, y - 1) ? D(g, y) / D(g, y - 1) - 1 : null);

  function projInfo(g, kind, yAt) {
    const p0 = P(g), cars = g.cfg.market === 'cars', f = Math.pow(1 + (p0.costTrend || 0), Math.max(0, (yAt || g.y) - g.y0));
    const p = Object.assign({}, p0, { blockCost: p0.blockCost * f, gfCost: p0.gfCost * f, gf2Cost: p0.gf2Cost * f, fullCost: p0.fullCost * f, autoCost: p0.autoCost * f, modelCost: p0.modelCost * f });
    const I = {
      line: { name: 'Brownfield line', cap: p.block, cost: p.blockCost, lead: 1, life: p.depCap, what: `Adds ${p.block} ${MK[g.cfg.market].scale} a year to an existing plant. Ready next year.` },
      plantA: { name: 'New plant, phase 1', cap: p.gf, cost: p.gfCost, lead: 2, life: p.depCap, what: `A new site with room to double later. Adds ${p.gf} a year in two years.` },
      plantB: { name: 'New plant, phase 2', cap: p.gf, cost: p.gf2Cost, lead: 1, life: p.depCap, what: `Doubles a completed phase-1 plant for much less, because the site is ready. Adds ${p.gf} next year.` },
      full: { name: 'New plant, full size', cap: 2 * p.gf, cost: p.fullCost, lead: 2, life: p.depCap, what: `Both phases at once, cheaper per unit than building in two steps. Adds ${2 * p.gf} a year in two years.` },
      auto: { name: 'Automation upgrade', cap: 0, cost: p.autoCost, lead: 1, life: p.depAuto, what: `Cuts the variable cost of every ${MK[g.cfg.market].unit.replace(/s$/, '')} by ${N2(p.autoSave)}. Ready next year; at most ${p.autoMax}.` },
      model: { name: cars ? 'New model programme' : 'Next-generation module', cap: 0, cost: p.modelCost, lead: p.modelLead, life: p.depModel, what: cars ? `Launches a new model in ${p.modelLead} years, restoring the line-up’s appeal and market share.` : 'A new module design next year that keeps you in customers’ new phones.' }
    };
    return I[kind];
  }
  function N2(v) { return '$' + (v >= 1 ? v.toFixed(2) + 'k' : (v * 1000).toFixed(0)); }

  /* ---------- Firm model ---------- */
  function newFirm(g) {
    const p = P(g);
    return { cap: [{ kind: 'base', cap: p.cap0, since: 0, plant: null, id: 'base' }], idle: 0, orders: [], assets: [{ cost: p.ppe0, dep: p.dep0, start: g.y0, left: Math.round(p.ppe0 / p.dep0), kind: 'base' }],
      auto: 0, F: p.F0, G: 1, debt: p.debt0, cash: p.cash0, shares: p.shares, wc: 0, nol: 0, H: [], seq: 0, plants: [], lastEbitda: null, issued: 0 };
  }
  const capTotal = F => sum(F.cap.map(c => c.cap));
  const capReady = (F, y) => capTotal(F) + sum(F.orders.filter(o => o.ready <= y && o.cap).map(o => o.cap));
  function shareOf(g, F, stance) { const p = P(g); return clamp(p.share0 * (0.82 + 0.36 * F.F) * F.G * p.stance[stance][1], 0.02, 0.4); }
  function rateOf(g, F) {
    const p = P(g), e = F.lastEbitda;
    const lev = e && e > 0 ? (F.debt - F.cash) / e : (F.debt > F.cash ? 9 : 0);
    return p.rate + (lev > 2 ? 0.015 : 0) + (lev > 3.5 ? 0.025 : 0);
  }
  function equityValue(g, F, ebitda) { const p = P(g); return Math.max(0, p.multiple * Math.max(0, ebitda) - (F.debt - F.cash)); }
  function waccOf(g, F) {
    const p = P(g), E = F.H.length ? Math.max(1, F.H[F.H.length - 1].equity) : Math.max(1, equityValue(g, F, ebitda0(g)));
    const Dt = Math.max(0, F.debt), r = rateOf(g, F);
    return (E * p.ke + Dt * r * (1 - p.tax)) / (E + Dt);
  }
  function ebitda0(g) {
    const p = P(g), q = D(g, g.y0) * p.share0 * (0.82 + 0.36 * p.F0), s = Math.min(q, p.cap0);
    return s * (p.price - p.vc) - p.cap0 * p.fixedPer - p.overhead;
  }
  const trend = (g, y, r) => Math.pow(1 + r, y - g.y0);
  function unitEcon(g, F, y, stance) {
    const p = P(g);
    return { price: p.price * trend(g, y, p.priceTrend) * p.stance[stance][0], vc: (p.vc - F.auto * p.autoSave) * trend(g, y, p.vcTrend) };
  }
  /* One fiscal year for a firm. pol = { orders: {kind: n}, idle, stance, fund }. ind = industry price factor. */
  function stepFirm(g, F, y, pol, ind, rec) {
    const p = P(g), out = { y, events: [] };
    F.orders.filter(o => o.ready === y).forEach(o => {
      if (o.cap) { F.cap.push({ kind: o.kind, cap: o.cap, since: y, plant: o.plant, id: o.id }); if (o.kind === 'plantA') F.plants.push({ id: o.id, expanded: false }); }
      if (o.kind === 'auto') F.auto++;
      if (o.kind === 'model') F.F = 1;
      out.events.push(o.kind);
    });
    F.orders = F.orders.filter(o => o.ready > y);
    let capexPaid = 0;
    F.orders.forEach(o => { if (o.due && o.due[y]) { capexPaid += o.due[y]; delete o.due[y]; } });
    const placed = [];
    const ord = (pol && pol.orders) || {};
    KINDS.forEach(kind => {
      let n = Math.max(0, Math.round(+ord[kind] || 0));
      if (kind === 'line') n = Math.min(n, 2);
      if (kind === 'plantA' || kind === 'full' || kind === 'model') n = Math.min(n, 1);
      if (kind === 'model' && F.orders.some(o => o.kind === 'model')) n = 0;
      if (kind === 'auto') n = Math.min(n, Math.max(0, p.autoMax - F.auto - F.orders.filter(o => o.kind === 'auto').length), 1);
      if (kind === 'plantB') { const free = F.plants.filter(pl => !pl.expanded); n = Math.min(n, free.length); }
      for (let i = 0; i < n; i++) {
        const info = projInfo(g, kind, y), id = `${kind}-${y}-${++F.seq}`;
        const o = { id, kind, cap: info.cap, cost: info.cost, y0: y, ready: y + info.lead, life: info.life, plant: null, due: {} };
        if (kind === 'plantB') { const pl = F.plants.find(x => !x.expanded); pl.expanded = true; o.plant = pl.id; }
        if (info.lead === 1) capexPaid += info.cost; else { capexPaid += info.cost / 2; o.due[y + 1] = info.cost / 2; }
        F.orders.push(o); placed.push(o);
        F.assets.push({ cost: info.cost, dep: info.cost / info.life, start: o.ready, left: info.life, kind, id });
      }
    });
    const tot = capTotal(F), blk = p.block;
    let idle = clamp(Math.round((+(pol && pol.idle) || 0) / blk) * blk, 0, Math.max(0, tot - blk));
    let restart = 0; if (idle < F.idle) restart = (F.idle - idle) / blk * p.restart;
    F.idle = idle;
    const active = tot - idle, stance = pol && p.stance[pol.stance] ? pol.stance : 'list';
    const share = shareOf(g, F, stance), spill = Math.max(0, D(g, y) * (1 - share) - (ind.rivalCap || Infinity)) * 0.5;
    const q = D(g, y) * share + spill, sales = Math.min(q, active), unmet = Math.max(0, D(g, y) * share - sales);
    const ue = unitEcon(g, F, y, stance), price = ue.price * ind.factor, vc = ue.vc;
    const util = active > 0 ? sales / active : 0;
    const overtime = util > 0.92 ? (sales - 0.92 * active) * vc * 0.06 : 0;
    /* Units: cars in thousands at $k each give $M; phones in millions at $ each give $M. */
    const rev = sales * price, varc = sales * vc + overtime;
    const fpu = p.fixedPer * trend(g, y, p.costTrend || 0);
    const fixed = active * fpu + idle * fpu * 0.3 + p.overhead;
    const ebitda = rev - varc - fixed - restart;
    let dep = 0; F.assets.forEach(a => { if (a.start <= y && a.left > 0) { dep += a.dep; a.left--; } });
    const ebit = ebitda - dep, rate = rateOf(g, F), interest = Math.max(0, F.debt) * rate;
    let pbt = ebit - interest, taxable = pbt;
    if (taxable > 0 && F.nol > 0) { const use = Math.min(F.nol, taxable); taxable -= use; F.nol -= use; } else if (taxable < 0) { F.nol += -taxable; taxable = 0; }
    const tax = taxable * p.tax, ni = pbt - tax;
    const wcNew = p.wc * rev, dwc = wcNew - F.wc; F.wc = wcNew;
    const cf = ni + dep - dwc - capexPaid;
    F.cash += cf;
    const minCash = 0.04 * rev + 5;
    let raisedDebt = 0, raisedEq = 0, repaid = 0;
    const eqNow = equityValue(g, F, ebitda), spNow = F.shares > 0 ? eqNow / F.shares : 0;
    if (F.cash < minCash) {
      const need = minCash - F.cash, fund = (pol && pol.fund) || 'debt';
      const eqPart = fund === 'equity' ? 1 : fund === 'mix' ? 0.5 : 0;
      if (eqPart > 0 && spNow > 0.01) { const amt = need * eqPart, px = spNow * 0.93; F.shares += amt / px; F.issued += amt; raisedEq = amt; }
      raisedDebt = need - raisedEq; F.debt += raisedDebt; F.cash += need;
    } else if (F.cash > 2 * minCash && F.debt > 0) { repaid = Math.min(F.debt, F.cash - 1.5 * minCash); F.debt -= repaid; F.cash -= repaid; }
    F.lastEbitda = ebitda;
    const netDebt = F.debt - F.cash, equity = equityValue(g, F, ebitda), sp = F.shares > 0 ? equity / F.shares : 0;
    const capital = sum(F.assets.map(a => a.start <= y ? a.dep * a.left : a.cost)) + F.wc;
    const nopat = ebit * (1 - p.tax);
    const lev = ebitda > 0 ? netDebt / ebitda : (netDebt > 0 ? 99 : 0);
    const own = D(g, y) * share; const G0 = F.G; F.G = clamp(F.G * (1 - 0.35 * (own > 0 ? unmet / own : 0)) + 0.12 * (1 - F.G), 0.5, 1.02);
    const F0 = F.F; F.F = Math.max(0, F.F - p.decay);
    const h = Object.assign(out, { D: D(g, y), share, q, sales, unmet, cap: tot, active, idle, util, price, vc, rev, varc, fixed, overtime, restart, ebitda, dep, ebit, interest, rate, tax, ni, dwc, capexPaid, cf, cash: F.cash, debt: F.debt, netDebt, lev,
      equity, sp, shares: F.shares, raisedDebt, raisedEq, repaid, capital, nopat, roce: capital > 0 ? nopat / capital : 0, G: G0, F: F0, placed: placed.map(o => ({ id: o.id, kind: o.kind, cost: o.cost, ready: o.ready, cap: o.cap })), stance, ind: ind.factor, spill });
    if (rec) F.H.push(h);
    return h;
  }

  /* ---------- Industry (rivals) ---------- */
  function industryFactor(g, y, usActive) { const U = Math.min(1, D(g, y) / Math.max(1, g.R.cap + usActive)); return { factor: 1 + clamp(0.3 * (U - 0.84), -0.08, 0.025), rivalCap: g.R.cap, U }; }
  function rivalsStep(g, y, usSales) {
    const R = g.R, util = (D(g, y) - usSales) / Math.max(1, R.cap), gr = avg([growth(g, y), growth(g, y - 1)].filter(v => v != null));
    R.H.push({ y, cap: R.cap, util: Math.min(1, util), short: Math.max(0, util - 1) * R.cap });
    R.pipe.filter(x => x.ready === y + 1).forEach(x => { R.cap += x.cap; });
    R.pipe = R.pipe.filter(x => x.ready > y + 1);
    R.cap *= util < 0.7 ? 0.94 : 0.985;
    if (util > 0.82 && gr > 0) { const add = R.cap * Math.min(0.45, Math.min(0.35, gr) * 0.85 + 0.4 * Math.min(0.5, Math.max(0, util - 1))); R.pipe.push({ ready: y + 2, cap: add, y0: y }); R.announced.push({ y, ready: y + 2, cap: add }); }
  }

  /* ---------- Benchmark policies ---------- */
  function policyFor(g, F, y, who) {
    const p = P(g), last = F.H[F.H.length - 1];
    const pol = { orders: {}, idle: 0, stance: 'list', fund: 'debt' };
    const modelDue = F.F <= (g.cfg.market === 'cars' ? 0.2 : 0.3) && !F.orders.some(o => o.kind === 'model');
    if (who === 'hold') { if (modelDue) pol.orders.model = 1; return pol; }
    if (who === 'follower') {
      if (modelDue) pol.orders.model = 1;
      if (last && last.util > 0.9) { const gap = last.q * 1.04 - capReady(F, y + 1); pol.orders.line = clamp(Math.ceil(gap / p.block), 0, 2); }
      if (last && last.util < 0.7) pol.idle = Math.floor((last.active - last.q / 0.85) / p.block) * p.block + F.idle;
      else pol.idle = Math.max(0, F.idle - p.block);
      return pol;
    }
    /* hindsight: knows next year's demand */
    if (modelDue || F.F <= 0.45) if (!F.orders.some(o => o.kind === 'model')) pol.orders.model = 1;
    if (F.auto + F.orders.filter(o => o.kind === 'auto').length < p.autoMax && y - g.y0 < 4) pol.orders.auto = 1;
    const nextQ = D(g, y + 1) != null ? D(g, y + 1) * shareOf(g, F, 'list') * 1.02 : 0;
    const gap = nextQ - capReady(F, y + 1); pol.orders.line = clamp(Math.ceil(gap / p.block), 0, 2);
    const thisQ = D(g, y) * shareOf(g, F, 'list'), spare = capReady(F, y) - thisQ;
    pol.idle = spare > p.block * 1.5 ? Math.floor((spare - p.block * 0.5) / p.block) * p.block : 0;
    return pol;
  }

  /* ---------- Setup ---------- */
  function create(seed, cfg) {
    const c = cfg || {}, market = MKEYS.indexOf(c.market) >= 0 ? c.market : 'cars';
    const len = c.length === 'short' ? 'short' : 'full', w = MK[market].windows[len];
    const g = { v: 1, seed, cfg: { market, length: len, difficulty: S.normLevel(c.difficulty) }, y0: w[0], y1: w[1], y: w[0], n: w[1] - w[0] + 1, done: false, firm: null, bench: {}, R: null, draft: null, audit: [] };
    g.firm = newFirm(g);
    ['hold', 'follower', 'hindsight'].forEach(k => { g.bench[k] = newFirm(g); });
    const p = P(g), q0 = D(g, g.y0) * p.share0 * (0.82 + 0.36 * p.F0);
    g.R = { cap: Math.max(1, (D(g, g.y0) - Math.min(q0, p.cap0)) / 0.86), pipe: [], H: [], announced: [] };
    const e0 = ebitda0(g); g.sp0 = Math.max(0.01, (p.multiple * e0 - (p.debt0 - p.cash0)) / p.shares);
    g.draft = defaultDraft(g);
    return g;
  }
  function consensus(g, y) {
    const p = P(g), a = growth(g, y - 1), b = growth(g, y - 2);
    const c = 0.5 * (a == null ? p.lr : a) + 0.3 * (b == null ? p.lr : b) + 0.2 * p.lr;
    return Math.round(c * 200) / 200;
  }
  function defaultDraft(g) {
    const F = g.firm, last = F.H[F.H.length - 1];
    const c = lvl(g) < 2 ? consensus(g, g.y) : (growth(g, g.y - 1) || P(g).lr);
    return { orders: {}, idle: F.idle, stance: last ? last.stance : 'list', fund: 'debt', a: { g1: Math.round(c * 100), g2: Math.round(P(g).lr * 100), share: Math.round(shareOf(g, F, last ? last.stance : 'list') * 1000) / 10 }, approvals: [] };
  }

  /* ---------- Appraisal ---------- */
  function appraise(g, kind, a, opts) {
    const p = P(g), F = g.firm, y = g.y, info = projInfo(g, kind, y), o = opts || {};
    const g1 = (a.g1 != null ? +a.g1 : 8) / 100, g2 = (a.g2 != null ? +a.g2 : 6) / 100, sh = Math.max(0.001, (+a.share || shareOf(g, F, 'list') * 100) / 100);
    const base = D(g, y - 1), wacc = o.wacc != null ? o.wacc : waccOf(g, F), H = p.life;
    const stance = g.draft ? g.draft.stance : 'list', ue = unitEcon(g, F, y, stance);
    const cf = []; let dHat = base;
    const fNow = F.F, mult = f => (0.82 + 0.36 * f), baseShare = sh / mult(fNow);
    const capNoProj = k => capTotal(F) + sum(F.orders.filter(x => x.cap && x.ready <= y + k).map(x => x.cap)) + (o.extraCap ? o.extraCap(y + k) : 0);
    for (let k = 0; k < H; k++) {
      dHat *= 1 + (k < 3 ? g1 : g2);
      const pr = ue.price * Math.pow(1 + p.priceTrend, k), vc = ue.vc * Math.pow(1 + p.vcTrend, k), m = pr - vc;
      const c0 = capNoProj(k), live = y + k >= y + info.lead;
      let inc = 0;
      if (CAPK.indexOf(kind) >= 0) {
        const q = dHat * sh, c1 = c0 + (live ? info.cap : 0);
        inc = (Math.min(q, c1) - Math.min(q, c0)) * m - (live ? info.cap * p.fixedPer * Math.pow(1 + (p.costTrend || 0), y + k - g.y0) : 0);
      } else if (kind === 'auto') {
        inc = live ? Math.min(dHat * sh, c0) * p.autoSave * Math.pow(1 + p.vcTrend, k) : 0;
      } else if (kind === 'model') {
        const f0 = Math.max(0, fNow - p.decay * k), f1 = live ? Math.max(0, 1 - p.decay * (y + k - (y + info.lead))) : f0;
        inc = (Math.min(dHat * baseShare * mult(f1), c0) - Math.min(dHat * baseShare * mult(f0), c0)) * m;
      }
      const capex = info.lead === 1 ? (k === 0 ? info.cost : 0) : (k < 2 ? info.cost / 2 : 0);
      const depShield = live && y + k < y + info.lead + info.life ? info.cost / info.life * p.tax : 0;
      cf.push(inc * (1 - p.tax) + depShield - capex);
    }
    const npvAt = r => cf.reduce((s, x, k) => s + x / Math.pow(1 + r, k), 0);
    const npv = npvAt(wacc);
    let irr = null;
    if (npvAt(-0.5) > 0 && npvAt(3) < 0) { let lo = -0.5, hi = 3; for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (npvAt(mid) > 0) lo = mid; else hi = mid; } irr = (lo + hi) / 2; }
    let cum = 0, payback = null; cf.forEach((x, k) => { cum += x; if (payback == null && cum >= 0 && k > 0) payback = k; });
    const res = { kind, npv, irr, payback, wacc, cf, cost: info.cost };
    if (!o.lite) {
      const at = gg => appraise(g, kind, { g1: gg * 100, g2: gg * 100, share: sh * 100 }, { lite: true, wacc }).npv;
      let lo = -0.3, hi = 0.6, be = null;
      if (at(lo) < 0 && at(hi) > 0) { for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (at(mid) > 0) hi = mid; else lo = mid; } be = (lo + hi) / 2; }
      else if (at(lo) >= 0) be = -Infinity; else be = Infinity;
      res.breakeven = be;
      res.sens = [-10, -5, 0, 5, 10].map(d => ({ d, g1: g1 + d / 100, npv: appraise(g, kind, { g1: (g1 + d / 100) * 100, g2: g2 * 100, share: sh * 100 }, { lite: true, wacc }).npv }));
    }
    return res;
  }

  /* ---------- Apply a year ---------- */
  function cleanPol(g, d) {
    const o = {}, src = (d && d.orders) || {};
    KINDS.forEach(k => { const n = Math.max(0, Math.round(+src[k] || 0)); if (n) o[k] = n; });
    return { orders: o, idle: Math.max(0, +(d && d.idle) || 0), stance: d && P(g).stance[d.stance] ? d.stance : 'list', fund: d && ['debt', 'equity', 'mix'].indexOf(d.fund) >= 0 ? d.fund : 'debt' };
  }
  function apply(g, d) {
    if (g.done) return;
    const y = g.y, pol = cleanPol(g, d), F = g.firm;
    /* audit: record the appraisal of each approved project with the assumptions in force */
    const a = d && d.a ? d.a : (g.draft ? g.draft.a : {});
    const wacc = waccOf(g, F);
    KINDS.forEach(k => { for (let i = 0; i < (pol.orders[k] || 0); i++) { const ap = appraise(g, k, a, { lite: true, wacc }); g.audit.push({ y, kind: k, npv0: ap.npv, irr0: ap.irr, a: clone(a), cons: consensus(g, y), wacc, cost: projInfo(g, k, y).cost }); } });
    const readyCap = capReady(F, y), blk = P(g).block;
    const ind = industryFactor(g, y, readyCap - clamp(Math.round(pol.idle / blk) * blk, 0, Math.max(0, readyCap - blk)));
    const h = stepFirm(g, F, y, pol, ind, true);
    const free = h.placed.slice();
    g.audit.forEach(x => { if (x.y === y && !x.id) { const i = free.findIndex(o => o.kind === x.kind); if (i >= 0) { x.id = free[i].id; free.splice(i, 1); } } });
    g.audit = g.audit.filter(x => x.y !== y || x.id);
    ['hold', 'follower', 'hindsight'].forEach(k => { const B = g.bench[k]; stepFirm(g, B, y, policyFor(g, B, y, k), ind, true); });
    rivalsStep(g, y, h.sales);
    if (y >= g.y1) { g.done = true; g.y = g.y1 + 1; g.draft = null; return; }
    g.y++;
    g.draft = defaultDraft(g);
  }
  const isDone = g => !!g.done;

  /* ---------- Post-audit: sales fill capacity layers oldest first ---------- */
  function postAudit(g) {
    const F = g.firm, p = P(g), H = F.H, end = g.y1;
    return g.audit.map(x => {
      const info = Object.assign({}, projInfo(g, x.kind, x.y)), o = { id: x.id, kind: x.kind, y: x.y, npv0: x.npv0, irr0: x.irr0, cons: x.cons, a: x.a, cost: info.cost };
      let val = 0;
      H.forEach(h => {
        const k = h.y - x.y, disc = Math.pow(1 + x.wacc, k);
        const capex = info.lead === 1 ? (k === 0 ? info.cost : 0) : (k === 0 || k === 1 ? info.cost / 2 : 0);
        let inc = 0;
        if (CAPK.indexOf(x.kind) >= 0 && h.y >= x.y + info.lead) {
          const layers = F.cap.filter(c => c.since <= h.y).sort((a, b) => a.since - b.since || (a.id < b.id ? -1 : 1));
          let rem = h.sales, mine = 0;
          for (const c of layers) { const take = Math.min(rem, c.cap); if (c.id === x.id) mine = take; rem -= take; }
          inc = mine * (h.price - h.vc) - info.cap * p.fixedPer * Math.pow(1 + (p.costTrend || 0), h.y - g.y0) * (h.idle > 0 && mine === 0 ? 0.3 : 1);
        } else if (x.kind === 'auto' && h.y >= x.y + info.lead) inc = h.sales * p.autoSave * Math.pow(1 + p.vcTrend, h.y - g.y0);
        else if (x.kind === 'model' && h.y >= x.y + info.lead) inc = h.sales * 0.12 * (h.price - h.vc) * Math.max(0, 1 - p.decay * (h.y - x.y - info.lead));
        const shield = h.y >= x.y + info.lead && h.y < x.y + info.lead + info.life ? info.cost / info.life * p.tax : 0;
        if (k >= 0) val += (inc * (1 - p.tax) + shield - capex) / disc;
      });
      const usedYears = Math.max(0, end - (x.y + info.lead) + 1), leftLife = Math.max(0, info.life - usedYears);
      const resid = info.cost * leftLife / info.life * 0.6 / Math.pow(1 + x.wacc, end - x.y + 1);
      o.npv1 = val + resid; o.resid = resid;
      return o;
    });
  }

  /* ---------- Scoring ---------- */
  function lastH(F) { return F.H[F.H.length - 1]; }
  function score(g) {
    const F = g.firm, B = g.bench, L = lastH(F), p = P(g);
    if (!L) return { total: 0, parts: [] };
    const sp = L.sp, spF = lastH(B.follower).sp, spH = lastH(B.hindsight).sp, spHold = lastH(B.hold).sp;
    const sp0 = g.sp0 || 1, k0 = 0.25 * sp0, ref = Math.sqrt((spF + k0) * (spH + k0)), ratio = (sp + k0) / ref;
    const s1 = clamp(60 + 70 * Math.log(Math.max(0.05, ratio)), 0, 100);
    const roce = sum(F.H.map(h => h.nopat)) / Math.max(1, sum(F.H.map(h => h.capital))), wacc = avg(F.H.map(h => h.rate * 0.4 + p.ke * 0.6));
    const s2 = clamp(55 + 300 * (roce - wacc), 0, 100);
    const lost = sum(F.H.map(h => h.unmet)) / Math.max(1, sum(F.H.map(h => h.q)));
    const s3 = clamp(62 + 300 * (L.share - p.share0) - 120 * lost, 0, 100);
    const breaches = F.H.filter(h => h.lev > 3.5).length;
    const s4 = clamp(100 - 22 * breaches - (L.equity <= 0 ? 40 : 0), 0, 100);
    let s5 = 70; const flags = [];
    g.audit.forEach(x => {
      if (x.npv0 < 0) { s5 -= 12; flags.push('negative'); }
      if (x.a && x.a.g1 != null && x.a.g1 / 100 > x.cons + 0.06) { s5 -= 8; flags.push('optimistic'); }
    });
    const pa = postAudit(g); pa.forEach(x => { if (x.npv1 > 0) s5 += 4; });
    s5 = clamp(s5, 0, 100);
    const total = Math.round(0.45 * s1 + 0.15 * s2 + 0.15 * s3 + 0.1 * s4 + 0.15 * s5);
    return { total, s: [s1, s2, s3, s4, s5], parts: [
      { k: 'Shareholder value', v: Math.round(s1), w: 45, d: `share price ${N3(sp)} against ${N3(spF)} for a cautious follower and ${N3(spH)} with perfect foresight` },
      { k: 'Return on capital against its cost', v: Math.round(s2), w: 15, d: `ROCE ${(roce * 100).toFixed(1)}% against a cost of capital near ${(wacc * 100).toFixed(1)}%` },
      { k: 'Market position', v: Math.round(s3), w: 15, d: `share ${(L.share * 100).toFixed(1)}% at the end (${(p.share0 * 100).toFixed(0)}% at the start), ${(lost * 100).toFixed(0)}% of demand lost for lack of capacity` },
      { k: 'Financial resilience', v: Math.round(s4), w: 10, d: breaches ? `${breaches} year${breaches === 1 ? '' : 's'} above 3.5× net debt to EBITDA` : 'never above 3.5× net debt to EBITDA' },
      { k: 'Appraisal discipline', v: Math.round(s5), w: 15, d: flags.length ? Array.from(new Set(flags)).map(f => ({ negative: 'approved projects with negative NPV', optimistic: 'leaned on forecasts far above consensus' })[f]).join('; ') : 'approved projects on sound forecasts' }
    ], sp, spF, spH, spHold, roce, wacc, lost, breaches, audit: pa };
  }
  function N3(v) { return '$' + (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(2)); }

  const api = { MK, MKEYS, KINDS, CAPK, projInfo, create, apply, isDone, defaultDraft, consensus, appraise, capTotal, capReady, shareOf, waccOf, rateOf, unitEcon, industryFactor, growth, postAudit, score, P, D };
  window.CapexEngine = api;
})();
