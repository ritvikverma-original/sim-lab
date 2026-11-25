/* Boardroom engine: a six-company, five-segment industry for e-bike drive units.
   Pure and deterministic: the same seed and the same decisions always rebuild the same history.
   Units are thousands of drive units; money is $M unless a field says otherwise ($k budgets, $ prices). */
(function (root) {
  'use strict';
  const RNG = {
    make(seed) { return { s: (seed >>> 0) || 1 }; },
    next(r) { r.s = (r.s + 0x6D2B79F5) >>> 0; let t = r.s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; },
    normal(r) { let u = 0, v = 0; while (u === 0) u = RNG.next(r); while (v === 0) v = RNG.next(r); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  };
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const sum = a => a.reduce((s, x) => s + x, 0);
  const num = (v, d) => (v == null || v === '' || !isFinite(v) ? d : +v);
  const r1 = x => Math.round(x * 10) / 10;
  const r2 = x => Math.round(x * 100) / 100;
  const clone = o => JSON.parse(JSON.stringify(o));

  /* ---------- Industry constants ---------- */
  const ROUGH = 2.5, FINE = 1.0, TS = 10, WS = 0.2, PRICE_DRIFT = 3;
  const SEGS = [
    { id: 'commuter', name: 'Commuter', size: 650, growth: 0.075, c: [60, 3.40], drift: [3.0, -0.07], lead: 0.25, price: [290, 380], mtbf: [12000, 17000], age: 2.0, ageSd: 1.6, w: { price: 0.30, age: 0.27, pos: 0.25, mtbf: 0.18 },
      who: 'Daily riders and city fleets. They want a modern, mid-torque unit at a fair price and expect the design to be refreshed every couple of years.' },
    { id: 'value', name: 'Value', size: 750, growth: 0.10, c: [45, 3.90], drift: [1.5, -0.04], lead: -0.3, price: [190, 270], mtbf: [8000, 13000], age: 7.0, ageSd: 2.5, w: { price: 0.52, age: 0.22, mtbf: 0.16, pos: 0.10 },
      who: 'Entry-level bike brands and big-box retailers. Price dominates; they prefer proven, older designs and lag the market on performance.' },
    { id: 'premium', name: 'Premium', size: 220, growth: 0.15, c: [80, 2.90], drift: [4.0, -0.10], lead: 0.7, price: [430, 560], mtbf: [15000, 20000], age: 0.0, ageSd: 1.2, w: { pos: 0.40, age: 0.30, mtbf: 0.18, price: 0.12 },
      who: 'High-end trekking and sport bikes. They want the newest, strongest and lightest unit and buy ahead of the curve.' },
    { id: 'cargo', name: 'Cargo', size: 175, growth: 0.18, c: [95, 3.60], drift: [5.0, -0.06], lead: 0.5, price: [380, 500], mtbf: [18000, 24000], age: 1.0, ageSd: 1.3, w: { mtbf: 0.40, pos: 0.30, price: 0.20, age: 0.10 },
      who: 'Delivery fleets and family cargo bikes. Reliability is everything: downtime costs them money. They need high torque and tolerate weight.' },
    { id: 'folding', name: 'Folding', size: 165, growth: 0.17, c: [50, 2.50], drift: [2.0, -0.09], lead: 0.5, price: [370, 490], mtbf: [13000, 18000], age: 1.5, ageSd: 1.3, w: { pos: 0.43, age: 0.27, mtbf: 0.18, price: 0.12 },
      who: 'Compact and folding bikes for multimodal commuters. Every gram counts; they want light, compact, recent designs.' }
  ];
  const START = [
    { t: 57, w: 3.48, mtbf: 14000, age: 2.1, price: 335, cap: 115, auto: 4.0, inv: 5, promo: 1400, sales: 1500 },
    { t: 43, w: 3.98, mtbf: 10000, age: 6.0, price: 225, cap: 132, auto: 5.0, inv: 7, promo: 1200, sales: 1500 },
    { t: 76, w: 3.00, mtbf: 16500, age: 0.7, price: 495, cap: 39, auto: 3.0, inv: 1.2, promo: 1300, sales: 1300 },
    { t: 90, w: 3.68, mtbf: 20000, age: 1.5, price: 445, cap: 31, auto: 3.0, inv: 1, promo: 1200, sales: 1200 },
    { t: 47, w: 2.62, mtbf: 15000, age: 1.6, price: 425, cap: 30, auto: 3.0, inv: 1, promo: 1200, sales: 1200 }
  ];
  const COS = [
    { id: 'you', name: 'Northstar Drives', short: 'Northstar', letter: 'N', names: ['Nova', 'Nimbus', 'Nitro', 'Nomad', 'Nano', 'Neon', 'Nexus', 'Nyx'] },
    { id: 'bolt', name: 'Bolt Motion', short: 'Bolt', letter: 'B', ai: 'costLeader', names: ['Blaze', 'Brick', 'Bravo', 'Brawn', 'Bitty', 'Breeze', 'Blitz', 'Beacon'] },
    { id: 'cobalt', name: 'Cobalt Drive', short: 'Cobalt', letter: 'C', ai: 'differentiator', names: ['Comet', 'Crate', 'Crown', 'Colossus', 'Cricket', 'Cipher', 'Crest', 'Cyclone'] },
    { id: 'dynamo', name: 'Dynamo Works', short: 'Dynamo', letter: 'D', ai: 'nicheCost', names: ['Dash', 'Dime', 'Diamond', 'Diesel', 'Dot', 'Delta', 'Drift', 'Duke'] },
    { id: 'ember', name: 'Ember Electric', short: 'Ember', letter: 'E', ai: 'nicheDiff', names: ['Echo', 'Elm', 'Elite', 'Everest', 'Elf', 'Envoy', 'Edge', 'Eclipse'] },
    { id: 'fulcrum', name: 'Fulcrum Power', short: 'Fulcrum', letter: 'F', ai: 'balanced', names: ['Flux', 'Frugal', 'Flagship', 'Forge', 'Flick', 'Falcon', 'Fable', 'Fusion'] }
  ];
  const AI = {
    costLeader: { label: 'Broad cost leader', blurb: 'Competes in every segment on price, automates aggressively and keeps designs slightly behind the market.', focus: [0, 1, 2, 3, 4], pricePos: 0.28, mtbfPos: 0.35, lead: 0.1, promo: 1200, sales: 1400, auto: [7, 9, 5, 5, 5], buffer: 1.04, payout: 0.35,
      init: { lean: 450, supplier: 450, workforce: 250, digital: 80, customer: 80 } },
    differentiator: { label: 'Broad differentiator', blurb: 'Competes everywhere with fresh designs, high reliability, premium prices and heavy marketing.', focus: [0, 1, 2, 3, 4], pricePos: 0.58, mtbfPos: 0.95, lead: 0.9, promo: 1700, sales: 1900, auto: [4, 5, 3, 3, 3], buffer: 1.08, payout: 0.15,
      newProd: [{ year: 2, seg: 2 }, { year: 4, seg: 4 }], init: { digital: 450, customer: 450, workforce: 200, lean: 80, supplier: 80 } },
    nicheCost: { label: 'Cost focus: Value and Commuter', blurb: 'Leaves Premium, Cargo and Folding in year 1 and pours everything into automation and low prices in the two volume segments.', focus: [0, 1], exit: [2, 3, 4], pricePos: 0.2, mtbfPos: 0.3, lead: 0.05, promo: 1100, sales: 1600, auto: [8, 10, 3, 3, 3], buffer: 1.03, payout: 0.4,
      init: { lean: 600, supplier: 600, workforce: 300, digital: 0, customer: 80 } },
    nicheDiff: { label: 'Differentiation focus: Premium, Cargo, Folding', blurb: 'Leaves Value at once and Commuter in year 4, adds products in the high-margin segments and leads them on design.', focus: [2, 3, 4], exit: [1], exitLate: { seg: 0, year: 4 }, pricePos: 0.55, mtbfPos: 1.0, lead: 1.0, promo: 1800, sales: 2000, auto: [4, 4, 3.5, 3.5, 3.5], buffer: 1.08, payout: 0.12,
      newProd: [{ year: 2, seg: 2 }, { year: 3, seg: 3 }], init: { digital: 550, customer: 450, workforce: 150, lean: 80, supplier: 80 } },
    balanced: { label: 'Balanced generalist', blurb: 'Stays in every segment with mid-range prices, steady automation and moderate spending on everything.', focus: [0, 1, 2, 3, 4], pricePos: 0.4, mtbfPos: 0.6, lead: 0.6, promo: 1500, sales: 1700, auto: [6, 7, 4, 4, 4], buffer: 1.05, payout: 0.25,
      init: { lean: 250, supplier: 250, digital: 250, customer: 250, workforce: 200 } }
  };
  const PRIME = [5.0, 5.0, 5.5, 6.0, 6.0, 5.5, 5.0, 4.5, 4.5, 4.5];
  const RATINGS = ['AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC'];
  const SPREAD = { AAA: 0, AA: 0.4, A: 0.9, BBB: 1.6, BB: 2.6, B: 3.8, CCC: 5.5 };
  const INIT_KEYS = ['lean', 'supplier', 'digital', 'customer', 'workforce'];
  const INIT_MAX = { lean: 0.10, supplier: 0.07, digital: 0.35, customer: 0.05, workforce: 0.08 };
  const INIT_D = 2000, INIT_CAP = 1500, BUDGET_CAP = 5000;
  const LABOR0 = 120, AUTO_COST = 50, NEW_RD = 2.0, TAX = 0.30;

  /* ---------- Small models ---------- */
  const TECH = 0.96;
  const material = (t, w, m, y) => (30 + 0.8 * t + 25 * (4.2 - w) + 0.003 * m) * Math.pow(TECH, y || 0);
  const capCost = auto => 80 + 50 * auto;
  const awNext = (aw, promo) => aw * 0.67 + (1 - aw * 0.67) * 0.88 * (1 - Math.exp(-promo / 1700));
  const accNext = (acc, budget) => acc * 0.67 + (1 - acc * 0.67) * 0.85 * (1 - Math.exp(-budget / 2600));
  const arFactor = d => (d <= 30 ? 0.92 + 0.08 * d / 30 : d <= 60 ? 1 + 0.03 * (d - 30) / 30 : 1.03 + 0.02 * (Math.min(d, 90) - 60) / 30);
  function initEffFrom(stock) { const e = {}; INIT_KEYS.forEach(k => { e[k] = INIT_MAX[k] * (1 - Math.exp(-(stock[k] || 0) / INIT_D)); }); return e; }
  const initEff = co => initEffFrom(co.initStock);
  const AUTO_CUT = 0.085;
  const laborRate = (co, auto, y) => { const e = initEff(co); return LABOR0 * Math.pow(1.03, y) * (1 - AUTO_CUT * (auto - 1)) * (1 - e.lean - e.workforce); };
  const moved = (p, t, w) => Math.abs(t - p.t) > 0.04 || Math.abs(w - p.w) > 0.004;
  function rdTime(co, p, nt, nw, nm) {
    const d = Math.hypot((nt - p.t) / TS, (nw - p.w) / WS), dm = Math.max(0, nm - p.mtbf) / 1000;
    if (!moved(p, nt, nw) && Math.abs(nm - p.mtbf) < 1) return 0;
    const base = moved(p, nt, nw) ? 0.2 + 0.05 * p.auto + 0.32 * d : 0.12;
    return Math.max(0.1, (base + 0.06 * dm) * (1 - initEff(co).digital));
  }
  const rdCost = (time, p, nm) => 1.0 * time + 0.1 * Math.max(0, nm - p.mtbf) / 1000;
  const newRdCost = m => NEW_RD + 0.1 * Math.max(0, m - 12000) / 1000;

  /* ---------- Environment ---------- */
  function env(g, y) {
    return SEGS.map((s, i) => {
      const cx = s.c[0] + s.drift[0] * y, cy = s.c[1] + s.drift[1] * y;
      return { i, id: s.id, name: s.name, cx, cy, dx: s.drift[0], dy: s.drift[1], ix: cx + s.drift[0] * s.lead, iy: cy + s.drift[1] * s.lead, plo: s.price[0] - PRICE_DRIFT * y, phi: s.price[1] - PRICE_DRIFT * y, mlo: s.mtbf[0], mhi: s.mtbf[1], age: s.age, ageSd: s.ageSd, w: s.w, size: g.sizes[Math.min(y, g.sizes.length - 1)][i], growth: s.growth };
    });
  }
  const expectedSize = (g, y, i) => (y === 0 ? SEGS[i].size : g.sizes[y - 1][i] * (1 + SEGS[i].growth));

  /* ---------- Customer scoring ---------- */
  function baseScore(e, t, w, ageMid, price, mtbf) {
    const dc = Math.hypot((t - e.cx) / TS, (w - e.cy) / WS);
    if (dc > ROUGH || price > e.phi + 15 || mtbf < e.mlo - 1000) return null;
    const d = Math.hypot((t - e.ix) / TS, (w - e.iy) / WS);
    const sPos = Math.exp(-0.5 * Math.pow(d / 0.85, 2));
    const sPrice = price <= e.plo ? 1 : price <= e.phi ? 1 - 0.8 * (price - e.plo) / (e.phi - e.plo) : Math.max(0, 0.2 * (1 - (price - e.phi) / 15));
    const sAge = Math.exp(-0.5 * Math.pow((ageMid - e.age) / e.ageSd, 2));
    const sMtbf = mtbf >= e.mhi ? 1 : mtbf >= e.mlo ? 0.3 + 0.7 * (mtbf - e.mlo) / (e.mhi - e.mlo) : 0.1 * (mtbf - (e.mlo - 1000)) / 1000;
    const W = e.w;
    return { base: W.price * sPrice + W.pos * sPos + W.age * sAge + W.mtbf * sMtbf, sPos, sPrice, sAge, sMtbf, d, dc };
  }
  function productScore(e, p, co, awEff, accEff) {
    const fac = (0.35 + 0.65 * awEff) * (0.35 + 0.65 * accEff) * (1 + initEff(co).customer) * arFactor(co.arDays);
    const f = p.rd && p.rd.left <= 1 ? p.rd.left : null;
    const parts = [];
    if (p.launched) parts.push({ wt: f == null ? 1 : f, s: baseScore(e, p.t, p.w, p.age + (f == null ? 0.5 : f / 2), p.price, p.mtbf) });
    if (f != null) {
      const ageNew = !p.launched ? (1 - f) / 2 : p.rd.pos ? (p.age + f) / 2 + (1 - f) / 2 : p.age + f + (1 - f) / 2;
      parts.push({ wt: 1 - f, s: baseScore(e, p.rd.t, p.rd.w, ageNew, p.price, p.rd.mtbf) });
    }
    let score = 0, detail = null;
    parts.forEach(pt => { if (pt.s) { score += pt.wt * pt.s.base; if (!detail || pt.wt >= 0.5) detail = pt.s; } });
    if (!detail) return { score: 0, detail: null, fac };
    return { score: score * fac, detail, fac };
  }

  /* ---------- Setup ---------- */
  function makeProduct(co, k, segIdx, sp) {
    const lab0 = LABOR0 * (1 - AUTO_CUT * (sp.auto - 1));
    const gross = sp.cap * capCost(sp.auto) / 1000;
    return { id: co.letter + (k + 1), name: co.names[k], co: co.id, seg: segIdx, t: sp.t, w: sp.w, mtbf: sp.mtbf, age: sp.age, price: sp.price, promo: sp.promo, sales: sp.sales,
      prodPlan: 0, prod: 0, cap: sp.cap, auto: sp.auto, capNext: sp.cap, autoNext: sp.auto, inv: sp.inv, invVal: sp.inv * (material(sp.t, sp.w, sp.mtbf, 0) + lab0) / 1000,
      gross, accDep: gross * 0.4, aw: 0.55, rd: null, launched: true, launchYear: -5, retired: false, lastRev: -1, last: null };
  }
  const prodsOf = (g, co) => g.prods.filter(p => p.co === co.id);
  const activeOf = (g, co) => g.prods.filter(p => p.co === co.id && !p.retired);
  const coOf = (g, p) => g.cos.find(c => c.id === p.co);
  const you = g => g.cos[0];
  const bondTotal = co => sum(co.bonds.map(b => b.amt));
  const ppeNet = (g, co) => sum(prodsOf(g, co).map(p => p.gross - p.accDep));
  const curLimit = co => Math.max(3, 0.75 * co.ar + 0.5 * (co.lastInvVal || 0) + 2);
  function create(seed, config) {
    const cfg = config || {};
    const years = cfg.length === 'short' ? 5 : 8;
    const g = { v: 2, seed, years, cfg: { difficulty: (['guided', 'standard', 'expert'].indexOf(cfg.difficulty) >= 0 ? cfg.difficulty : 'guided'), length: years === 5 ? 'short' : 'full' }, year: 0, rng: RNG.make(seed), cos: [], prods: [], reports: [], draft: null };
    g.sizes = [SEGS.map(s => s.size)];
    for (let y = 1; y <= years + 1; y++) g.sizes.push(SEGS.map((s, i) => r1(g.sizes[y - 1][i] * (1 + s.growth + 0.02 * clamp(RNG.normal(g.rng), -2, 2)))));
    COS.forEach(c => {
      const co = { id: c.id, name: c.name, short: c.short, letter: c.letter, names: c.names, ai: c.ai || null,
        cash: 6, ar: 8.8, ap: 3.5, curDebt: 0, emergPrev: 0,
        bonds: [{ amt: 8, rate: 6.4, due: 3, issued: -7 }, { amt: 9, rate: 7.1, due: 6, issued: -4 }, { amt: 9, rate: 7.8, due: 10, issued: 0 }],
        stock: 12, re: 0, shares: 2.0, price: 0, epsPrev: 3.0, dps: 0.8, rating: 'A', arDays: 30, apDays: 30, acc: [0.5, 0.5, 0.5, 0.5, 0.5],
        initStock: { lean: 0, supplier: 0, digital: 0, customer: 0, workforce: 0 }, initSpend: { lean: 0, supplier: 0, digital: 0, customer: 0, workforce: 0 },
        revPrev: 100, nextName: 5, hist: [], lastInvVal: 0 };
      co.jit = co.ai ? { price: 0.04 * clamp(RNG.normal(g.rng), -1.5, 1.5), promo: 1 + 0.08 * clamp(RNG.normal(g.rng), -1.5, 1.5) } : { price: 0, promo: 1 };
      g.cos.push(co);
      START.forEach((sp, k) => g.prods.push(makeProduct(co, k, k, sp)));
    });
    g.cos.forEach(co => {
      co.lastInvVal = sum(prodsOf(g, co).map(p => p.invVal));
      const assets = co.cash + co.ar + co.lastInvVal + ppeNet(g, co);
      co.re = assets - co.ap - co.curDebt - bondTotal(co) - co.stock;
      co.price = stockPrice((co.stock + co.re) / co.shares, 3, 3, co.dps, 0.06, false);
    });
    processYear(g, null);
    g.draft = defaultDraft(g);
    return g;
  }
  function stockPrice(bvps, eps, epsPrev, dps, growth, emergency) {
    const epsW = 0.6 * eps + 0.4 * epsPrev;
    let p = 1.1 * bvps + 6.0 * Math.max(epsW, -3) + 3 * dps + 25 * clamp(growth, -0.2, 0.4);
    if (emergency) p *= 0.85;
    return Math.max(1, r2(p));
  }
  function rate(da, cov, emergency) {
    if (emergency) return 'CCC';
    const steps = [[0.25, 12], [0.35, 8], [0.45, 5], [0.55, 3], [0.65, 2], [0.75, 1.2]];
    for (let i = 0; i < steps.length; i++) if (da < steps[i][0] && cov > steps[i][1]) return RATINGS[i];
    return 'CCC';
  }
  /* Limits as they will apply when the year's financing is processed. */
  function finLimits(g, F) {
    const co = you(g), y = g.year;
    const maturing = sum(co.bonds.filter(b => b.due <= y).map(b => b.amt));
    const after = bondTotal(co) - maturing - clamp(num(F && F.bondRetire, 0), 0, bondTotal(co) - maturing);
    return { cur: curLimit(co), bond: Math.max(0, 0.75 * ppeNet(g, co) - after), retire: Math.max(0, bondTotal(co) - maturing), stockIssue: 0.2 * co.shares * co.price, stockBuy: 0.1 * co.shares * co.price, maturing,
      bondRate: r2(PRIME[Math.min(y, PRIME.length - 1)] + 1.5 + SPREAD[co.rating]), curRate: r2(PRIME[Math.min(y, PRIME.length - 1)] + 1.0 + SPREAD[co.rating]) };
  }

  /* ---------- Decisions ---------- */
  function emptyFin(co) { return { bondIssue: 0, bondRetire: 0, stockIssue: 0, stockBuy: 0, curDebt: 0, dps: co ? co.dps : 0, arDays: co ? co.arDays : 30, apDays: co ? co.apDays : 30 }; }
  function statusQuo(g, co, E) {
    const dec = { products: {}, newProducts: [], fin: emptyFin(co), init: { lean: 0, supplier: 0, digital: 0, customer: 0, workforce: 0 } };
    activeOf(g, co).forEach(p => { const fc = E[p.seg].size / 6; dec.products[p.id] = { t: p.t, w: p.w, mtbf: p.mtbf, price: p.price, promo: p.promo, sales: p.sales, prod: Math.max(0, r1(fc * 1.02 - p.inv)), capChange: 0, autoNext: p.auto }; });
    return dec;
  }
  function peersIn(g, s) { return Math.max(1, g.prods.filter(q => !q.retired && q.launched && q.seg === s && (q.cap > 0 || q.capNext > 0)).length); }
  function naiveForecast(g, p, E) {
    const e = E[p.seg];
    if (!p.last || p.launchYear >= g.year - 0.01 || p.last.sold < 0.05) return expectedSize(g, g.year, p.seg) / peersIn(g, p.seg) * 0.8;
    return p.last.sold * (1 + e.growth);
  }
  function aiForecast(g, p, E) {
    const e = E[p.seg];
    if (!p.last || p.launchYear >= g.year - 0.01 || p.last.demand < 0.05) return expectedSize(g, g.year, p.seg) / peersIn(g, p.seg) * 0.8;
    const base = p.last.stockout ? 0.5 * p.last.demand + 0.5 * p.last.sold : p.last.demand;
    return base * (1 + e.growth);
  }
  function aiDecide(g, co, E, archetype) {
    const A = AI[archetype || co.ai], y = g.year, J = co.jit || { price: 0, promo: 1 }, X = ({ guided: 1, standard: 1.06, expert: 1.12 })[g.cfg.difficulty] || 1;
    const dec = { products: {}, newProducts: [], fin: emptyFin(co), init: {} };
    INIT_KEYS.forEach(k => { dec.init[k] = Math.round((A.init[k] || 0) * X); });
    let capexEst = 0;
    const lastH = co.hist.length ? co.hist[co.hist.length - 1] : null;
    const headroom = Math.max(0, 0.75 * ppeNet(g, co) - bondTotal(co)) + Math.max(0, co.cash - 3);
    co.strained = !!lastH && (lastH.market.emergency > 0 || (lastH.income.ni + lastH.income.writeOff < 0 && headroom < 8));
    const exiting = s => (A.exit && A.exit.indexOf(s) >= 0) || (A.exitLate && A.exitLate.seg === s && y >= A.exitLate.year);
    activeOf(g, co).forEach(p => {
      const e = E[p.seg];
      const d = { t: p.t, w: p.w, mtbf: p.mtbf, price: p.price, promo: p.promo, sales: p.sales, prod: 0, capChange: 0, autoNext: p.auto };
      if (!p.launched) { d.promo = 0; d.sales = 0; d.price = Math.round(e.plo + (A.pricePos + J.price) * (e.phi - e.plo)); dec.products[p.id] = d; return; }
      if (exiting(p.seg)) {
        d.price = Math.round(e.plo - 5); d.promo = 0; d.sales = 0; d.prod = 0; d.capChange = -p.cap;
        dec.products[p.id] = d; return;
      }
      if (!p.rd) {
        const tt = e.cx + e.dx * (A.lead + 1.0), tw = e.cy + e.dy * (A.lead + 1.0);
        const tm = Math.round((e.mlo + A.mtbfPos * (e.mhi - e.mlo)) / 100) * 100;
        let nt = tt, nw = tw;
        const dist = Math.hypot((nt - p.t) / TS, (nw - p.w) / WS);
        const oldFav = SEGS[p.seg].age >= 4;
        const dcNext = Math.hypot((p.t - (e.cx + e.dx)) / TS, (p.w - (e.cy + e.dy)) / WS);
        const wantMove = oldFav ? (p.age >= SEGS[p.seg].age + 2.5 || dcNext > 1.9) : dist > 0.35;
        if (!wantMove) { nt = p.t; nw = p.w; }
        if (wantMove || Math.abs(tm - p.mtbf) > 400) {
          let time = rdTime(co, p, nt, nw, tm), k = 1;
          while (time > 0.95 && k > 0.25) { k -= 0.1; nt = p.t + (tt - p.t) * k; nw = p.w + (tw - p.w) * k; time = rdTime(co, p, nt, nw, tm); }
          d.t = r1(nt); d.w = r2(nw); d.mtbf = tm;
        }
      }
      let price = e.plo + (A.pricePos + J.price) * (e.phi - e.plo);
      if (p.last) { if (p.last.stockout) price = Math.max(price, p.price + 6); if (p.last.invRatio > 0.25) price = Math.min(price, p.price - 8); }
      d.price = Math.round(clamp(price, e.plo - 10, e.phi));
      const core = A.focus.indexOf(p.seg) >= 0 ? 1 : 0.7;
      d.promo = Math.round(A.promo * core * J.promo * X / 100) * 100; d.sales = Math.round(A.sales * core * J.promo * X / 100) * 100;
      const fc = aiForecast(g, p, E);
      d.prod = clamp(r1(fc * A.buffer - p.inv), 0, 2 * p.cap);
      const nextFc = Math.min(fc, (p.last ? Math.max(p.last.sold, 0.8 * fc) : fc) * 1.15) * (1 + e.growth) * (A.focus.length < 5 && A.focus.indexOf(p.seg) >= 0 ? 1.12 : 1);
      if (nextFc > 1.15 * p.cap) d.capChange = Math.round(nextFc / 1.04 - p.cap);
      else if (p.last && p.last.util < 0.55 && nextFc < 0.7 * p.cap) d.capChange = -Math.round(p.cap * 0.15);
      const target = (A.auto[p.seg] || p.auto) + (X > 1 ? 0.5 : 0);
      if (target > p.auto && !co.strained) d.autoNext = Math.min(target, p.auto + 1);
      if (co.strained && d.capChange > 0 && !(p.last && p.last.stockout)) d.capChange = 0;
      if (d.capChange > 0) capexEst += d.capChange * capCost(d.autoNext) / 1000;
      if (d.autoNext > p.auto) capexEst += (d.autoNext - p.auto) * AUTO_COST * (p.cap + d.capChange) / 1000;
      dec.products[p.id] = d;
    });
    (A.newProd || []).forEach(np => {
      if (archetype || np.year !== y || prodsOf(g, co).length >= 8) return;
      const e = E[np.seg];
      const spec = { seg: np.seg, t: r1(e.cx + e.dx * 1.6), w: r2(e.cy + e.dy * 1.6), mtbf: Math.round((e.mlo + 0.9 * (e.mhi - e.mlo)) / 100) * 100, cap: Math.round(expectedSize(g, y + 1, np.seg) / 9), auto: 4 };
      dec.newProducts.push(spec);
      capexEst += spec.cap * capCost(spec.auto) / 1000 + NEW_RD;
    });
    const last = co.hist.length ? co.hist[co.hist.length - 1] : null;
    const lastNi = last ? last.income.ni : 5, lastDep = last ? last.income.dep : 6;
    const maturing = sum(co.bonds.filter(b => b.due <= y).map(b => b.amt));
    const divEst = A.payout * Math.max(0, lastNi);
    const bondRoom = Math.max(0, 0.75 * ppeNet(g, co) - (bondTotal(co) - maturing));
    const funds = co.cash - co.curDebt - maturing + lastNi + lastDep - divEst + 0.8 * bondRoom + (co.price > 15 ? 0.1 * co.shares * co.price : 0) - 4;
    if (capexEst > Math.max(0, funds)) {
      const f = Math.max(0, funds) / capexEst;
      if (f < 0.7) dec.newProducts = [];
      capexEst = 0;
      activeOf(g, co).forEach(p => {
        const d = dec.products[p.id]; if (!d) return;
        if (d.capChange > 0) d.capChange = Math.round(d.capChange * f);
        if (f < 0.6) d.autoNext = Math.min(d.autoNext, p.auto);
        if (d.capChange > 0) capexEst += d.capChange * capCost(d.autoNext) / 1000;
        if (d.autoNext > p.auto) capexEst += (d.autoNext - p.auto) * AUTO_COST * (p.cap + d.capChange) / 1000;
      });
      dec.newProducts.forEach(sp => { capexEst += sp.cap * capCost(sp.auto) / 1000 + NEW_RD; });
    }
    const proj = co.cash - co.curDebt - maturing + lastNi + lastDep - capexEst - divEst;
    if (proj < 4) {
      const need = 4 - proj + 3;
      const lim = 0.75 * ppeNet(g, co) - (bondTotal(co) - maturing);
      const b = clamp(need, 0, Math.max(0, lim));
      dec.fin.bondIssue = r1(b);
      if (need - b > 0.5) dec.fin.stockIssue = r1(Math.min(need - b, 0.2 * co.shares * co.price));
      if (need - b - dec.fin.stockIssue > 0.5) dec.fin.curDebt = r1(Math.min(need - b - dec.fin.stockIssue, curLimit(co)));
    } else if (proj > 20 && bondTotal(co) - maturing > 0) {
      dec.fin.bondRetire = r1(Math.min(bondTotal(co) - maturing, (proj - 14) * 0.6));
    }
    dec.fin.dps = r2(Math.max(0, A.payout * lastNi / co.shares));
    if (proj < 2) dec.fin.dps = 0;
    dec.fin.arDays = archetype ? 30 : co.ai === 'differentiator' || co.ai === 'nicheDiff' ? 45 : 30;
    dec.fin.apDays = archetype ? 30 : co.ai === 'nicheCost' || co.ai === 'costLeader' ? 40 : 30;
    return dec;
  }

  /* ---------- Year processing ---------- */
  function prepare(g, co, dec, E) {
    const y = g.year, prime = PRIME[Math.min(y, PRIME.length - 1)];
    const fl = { bondMature: 0, bondIssue: 0, bondRetire: 0, stockIssue: 0, stockBuy: 0, curOld: co.curDebt, curNew: 0, capex: 0, autoCapex: 0, assetSales: 0, writeOff: 0, dividends: 0, emergency: 0 };
    co.flows = fl;
    const F = Object.assign(emptyFin(co), (dec && dec.fin) || {});
    co.rateCur = prime + 1.0 + SPREAD[co.rating];
    co.emergPrem = co.emergPrev > 0 ? co.emergPrev * 0.075 : 0;
    fl.curNew = clamp(num(F.curDebt, 0), 0, curLimit(co));
    co.cash += fl.curNew - co.curDebt; co.curDebt = fl.curNew;
    co.bonds = co.bonds.filter(b => { if (b.due <= y) { fl.bondMature += b.amt; return false; } return true; });
    co.cash -= fl.bondMature;
    let ret = clamp(num(F.bondRetire, 0), 0, bondTotal(co));
    fl.bondRetire = ret;
    co.bonds.sort((a, b) => b.rate - a.rate);
    while (ret > 1e-9 && co.bonds.length) { const b = co.bonds[0]; const take = Math.min(b.amt, ret); b.amt -= take; ret -= take; if (b.amt < 1e-6) co.bonds.shift(); }
    co.cash -= fl.bondRetire;
    const bi = clamp(num(F.bondIssue, 0), 0, Math.max(0, 0.75 * ppeNet(g, co) - bondTotal(co)));
    if (bi > 1e-4) { co.bonds.push({ amt: bi, rate: r2(prime + 1.5 + SPREAD[co.rating]), due: y + 10, issued: y }); co.cash += bi; fl.bondIssue = bi; }
    const si = clamp(num(F.stockIssue, 0), 0, 0.2 * co.shares * co.price);
    if (si > 1e-4) { co.shares += si / co.price; co.stock += si * 0.95; co.cash += si * 0.95; fl.stockIssue = si * 0.95; }
    const sb = clamp(num(F.stockBuy, 0), 0, 0.1 * co.shares * co.price);
    if (sb > 1e-4) { co.shares -= sb / (co.price * 1.015); const fromStock = Math.min(co.stock, sb); co.stock -= fromStock; co.re -= sb - fromStock; co.cash -= sb; fl.stockBuy = sb; }
    co.dpsPlan = clamp(num(F.dps, 0), 0, 20);
    co.arDays = clamp(Math.round(num(F.arDays, 30)), 0, 90); co.apDays = clamp(Math.round(num(F.apDays, 30)), 0, 90);
    INIT_KEYS.forEach(k => { const s = clamp(Math.round(num(dec && dec.init && dec.init[k], 0)), 0, INIT_CAP); co.initSpend[k] = s; co.initStock[k] = co.initStock[k] * 0.85 + s; });
    activeOf(g, co).forEach(p => {
      const pd = (dec && dec.products && dec.products[p.id]) || {};
      p.price = clamp(Math.round(num(pd.price, p.price)), 50, 900);
      p.promo = clamp(Math.round(num(pd.promo, p.promo)), 0, BUDGET_CAP); p.sales = clamp(Math.round(num(pd.sales, p.sales)), 0, BUDGET_CAP);
      p.prodPlan = p.launched ? clamp(r1(num(pd.prod, 0)), 0, 2 * p.cap) : 0;
      if (!p.rd && p.launched && pd.t != null) {
        const nt = clamp(r1(num(pd.t, p.t)), 20, 180), nw = clamp(r2(num(pd.w, p.w)), 1.2, 5.0), nm = clamp(Math.round(num(pd.mtbf, p.mtbf) / 100) * 100, 5000, 30000);
        if (moved(p, nt, nw) || Math.abs(nm - p.mtbf) > 1) {
          const time = rdTime(co, p, nt, nw, nm);
          p.rd = { t: nt, w: nw, mtbf: nm, left: time, total: time, cost: rdCost(time, p, nm), pos: moved(p, nt, nw), start: y };
        }
      }
      const chg = clamp(Math.round(num(pd.capChange, 0)), -p.cap, 2000);
      const autoNext = clamp(Math.round(num(pd.autoNext, p.auto) * 2) / 2, 1, 10);
      if (chg > 0) { const c = chg * capCost(autoNext) / 1000; fl.capex += c; p.gross += c; }
      if (chg < 0 && p.cap > 0) {
        const frac = -chg / p.cap, book = (p.gross - p.accDep) * frac, proceeds = 0.65 * book;
        p.gross -= p.gross * frac; p.accDep -= p.accDep * frac; fl.assetSales += proceeds; fl.writeOff += book - proceeds;
      }
      if (autoNext > p.auto) { const c = (autoNext - p.auto) * AUTO_COST * Math.max(0, p.cap + chg) / 1000; fl.autoCapex += c; p.gross += c; }
      p.capNext = Math.max(0, p.cap + chg); p.autoNext = autoNext;
    });
    ((dec && dec.newProducts) || []).forEach(np => {
      if (prodsOf(g, co).length >= 8) return;
      const k = co.nextName++, seg = clamp(Math.round(num(np.seg, 0)), 0, 4);
      const auto = clamp(Math.round(num(np.auto, 4) * 2) / 2, 1, 10), cap = clamp(Math.round(num(np.cap, 20)), 1, 500);
      const m = clamp(Math.round(num(np.mtbf, 15000) / 100) * 100, 5000, 30000);
      const p = { id: co.letter + (k + 1), name: String(np.name || co.names[k] || co.letter + (k + 1)).slice(0, 16), co: co.id, seg, t: 0, w: 0, mtbf: 0, age: 0,
        price: Math.round(num(np.price, 0)) || Math.round((E[seg].plo + E[seg].phi) / 2), promo: 0, sales: 0, prodPlan: 0, prod: 0, cap: 0, auto, capNext: cap, autoNext: auto,
        inv: 0, invVal: 0, gross: 0, accDep: 0, aw: 0, launched: false, launchYear: y + 1, retired: false, lastRev: -1, last: null, isNew: true };
      const time = 1.0 * (1 - initEff(co).digital);
      p.rd = { t: clamp(r1(num(np.t, 50)), 20, 180), w: clamp(r2(num(np.w, 3)), 1.2, 5), mtbf: m, left: time, total: time, cost: newRdCost(m), pos: true, start: y, isNew: true };
      const c = cap * capCost(auto) / 1000; fl.capex += c; p.gross += c;
      g.prods.push(p);
    });
    co.cash -= fl.capex + fl.autoCapex; co.cash += fl.assetSales;
    activeOf(g, co).forEach(p => { p.aw0 = p.aw; p.aw = awNext(p.aw, p.promo); });
    co.acc0 = co.acc.slice();
    co.acc = co.acc.map((a, s) => accNext(a, sum(activeOf(g, co).filter(p => p.seg === s && (p.launched || (p.rd && p.rd.left <= 1))).map(p => p.sales))));
    const short = co.apDays > 60 ? clamp((co.apDays - 60) / 10 * 0.03, 0, 0.3) : 0;
    activeOf(g, co).forEach(p => { p.short = short; p.prod = r1(p.prodPlan * (1 - short)); p.avail = p.inv + p.prod; });
  }
  function allocate(g, E) {
    const live = g.prods.filter(p => !p.retired && (p.launched || (p.rd && p.rd.left <= 1)));
    g.prods.forEach(p => { p.score = [0, 0, 0, 0, 0]; p.dem = [0, 0, 0, 0, 0]; p.soldSeg = [0, 0, 0, 0, 0]; p.demand = 0; p.sold = 0; p.spare = 0; p.stockout = false; });
    E.forEach((e, s) => {
      live.forEach(p => { const co = coOf(g, p); p.score[s] = productScore(e, p, co, (p.aw0 + p.aw) / 2, (co.acc0[s] + co.acc[s]) / 2).score; });
      const cands = live.filter(p => p.score[s] > 0);
      const top = cands.length ? Math.max(...cands.map(p => p.score[s])) : 0;
      const D = e.size * clamp(0.82 + 0.18 * top / 0.5, 0.82, 1);
      e.demandEff = D;
      const tot = sum(cands.map(p => Math.pow(p.score[s], 1.6)));
      cands.forEach(p => { p.dem[s] = tot > 0 ? D * Math.pow(p.score[s], 1.6) / tot : 0; });
    });
    live.forEach(p => {
      p.demand = sum(p.dem);
      const ratio = p.demand > 0 ? Math.min(1, p.avail / p.demand) : 1;
      p.soldSeg = p.dem.map(x => x * ratio);
      p.spare = p.avail - sum(p.soldSeg);
    });
    E.forEach((e, s) => {
      let unmet = sum(live.map(p => Math.max(0, p.dem[s] - p.soldSeg[s])));
      for (let pass = 0; pass < 2 && unmet > 1e-6; pass++) {
        const pool = 0.8 * unmet;
        const cands = live.filter(p => p.spare > 1e-6 && p.score[s] > 0);
        const wt = sum(cands.map(p => Math.pow(p.score[s], 1.6)));
        let given = 0;
        cands.forEach(p => { const add = Math.min(p.spare, wt > 0 ? pool * Math.pow(p.score[s], 1.6) / wt : 0); p.soldSeg[s] += add; p.spare -= add; given += add; });
        unmet = Math.max(0, pool - given) / 0.8;
      }
    });
    live.forEach(p => { p.sold = sum(p.soldSeg); p.stockout = p.demand > 0.05 && p.sold < p.demand * 0.985 && p.spare < 0.1; });
  }
  function close(g, co) {
    const y = g.year, fl = co.flows, e = initEff(co);
    let rev = 0, matP = 0, labP = 0, cogs = 0, cogsMat = 0, cogsLab = 0, carry = 0, rd = 0, dep = 0, promo = 0, salesX = 0, nActive = 0;
    const lines = [];
    const invStart = sum(prodsOf(g, co).map(p => p.invVal));
    prodsOf(g, co).forEach(p => {
      if (p.retired) return;
      nActive++;
      const f = p.rd && p.rd.left <= 1 ? p.rd.left : null;
      const mOld = p.launched ? material(p.t, p.w, p.mtbf, y) : 0, mNew = p.rd ? material(p.rd.t, p.rd.w, p.rd.mtbf, y) : mOld;
      const mat = (f != null && p.launched ? f * mOld + (1 - f) * mNew : f != null ? mNew : mOld) * (1 - e.supplier);
      const L = laborRate(co, p.auto, y);
      const first = Math.min(p.prod, p.cap), second = Math.max(0, p.prod - p.cap);
      const pm = p.prod * mat / 1000, pl = (first * L + second * L * 1.5) / 1000, pcost = pm + pl;
      const units = p.inv + p.prod, avgC = units > 0 ? (p.invVal + pcost) / units : 0;
      const pc = p.sold * avgC, endInv = Math.max(0, units - p.sold), endVal = endInv * avgC;
      const pRev = p.sold * p.price / 1000, pCarry = 0.12 * endVal;
      const labShare = pcost > 0 ? pl / pcost : 0.35;
      const pRd = p.rd ? p.rd.cost * Math.min(1, p.rd.left) / p.rd.total : 0;
      const pDep = p.accDep < p.gross - 1e-9 ? Math.min(p.gross / 15, p.gross - p.accDep) : 0;
      p.accDep += pDep;
      rev += pRev; matP += pm; labP += pl; cogs += pc; cogsMat += pc * (1 - labShare); cogsLab += pc * labShare; carry += pCarry; rd += pRd; dep += pDep;
      promo += p.promo / 1000; salesX += p.sales / 1000;
      lines.push({ id: p.id, name: p.name, seg: p.seg, units: p.sold, rev: pRev, labor: pc * labShare, mat: pc * (1 - labShare), carry: pCarry, cm: pRev - pc - pCarry, dep: pDep, rd: pRd, promo: p.promo / 1000, sales: p.sales / 1000, unitMat: mat, unitLab: L, unitCost: avgC, second: p.prod > 0 ? second / p.prod : 0, endInv });
      p.unitMat = mat; p.unitLab = L; p.unitCost = avgC; p.endInv = endInv;
      p.inv = endInv; p.invVal = endVal;
      p.util = p.cap > 0 ? p.prod / p.cap : 0;
    });
    const initX = sum(INIT_KEYS.map(k => co.initSpend[k])) / 1000;
    const admin = 0.25 * nActive + 0.01 * rev;
    const cm = rev - cogs - carry;
    const sga = rd + promo + salesX + admin + initX;
    const ebit = cm - dep - sga - fl.writeOff;
    const interest = sum(co.bonds.map(b => b.amt * b.rate / 100)) + co.curDebt * co.rateCur / 100 + co.emergPrem;
    const ebt = ebit - interest, tax = Math.max(0, ebt) * TAX, ni = ebt - tax;
    const arStart = co.ar, apStart = co.ap;
    const arEnd = rev * co.arDays / 365, apEnd = matP * co.apDays / 365;
    co.cash += (rev - (arEnd - arStart)) - (matP - (apEnd - apStart)) - labP - promo - salesX - rd - admin - initX - interest - tax - carry;
    const div = co.dpsPlan * co.shares; co.cash -= div; fl.dividends = div;
    let emergency = 0;
    if (co.cash < 0) { emergency = -co.cash; co.cash = 0; co.curDebt += emergency; }
    co.emergPrev = emergency; fl.emergency = emergency;
    co.ar = arEnd; co.ap = apEnd; co.re += ni - div; co.dps = co.dpsPlan;
    const inv = sum(prodsOf(g, co).map(p => p.invVal));
    co.lastInvVal = inv;
    const ppeG = sum(prodsOf(g, co).map(p => p.gross)), ppeA = sum(prodsOf(g, co).map(p => p.accDep));
    const assets = co.cash + co.ar + inv + ppeG - ppeA;
    const debt = co.curDebt + bondTotal(co);
    const liab = co.ap + debt, equity = co.stock + co.re;
    const eps = ni / co.shares, bvps = equity / co.shares;
    const growth = co.revPrev > 0 ? rev / co.revPrev - 1 : 0;
    const cov = interest > 0.001 ? ebit / interest : 99;
    co.rating = rate(debt / Math.max(1, assets), cov, emergency > 0);
    co.price = stockPrice(bvps, eps, co.epsPrev, co.dpsPlan, growth, emergency > 0);
    const res = {
      year: y,
      income: { rev, mat: cogsMat, labor: cogsLab, carry, cm, dep, rd, promo, sales: salesX, admin, init: initX, sga, writeOff: fl.writeOff, ebit, interest, ebt, tax, ni },
      balance: { cash: co.cash, ar: co.ar, inv, ca: co.cash + co.ar + inv, ppeGross: ppeG, accDep: ppeA, ppeNet: ppeG - ppeA, assets, ap: co.ap, curDebt: co.curDebt, bonds: bondTotal(co), cl: co.ap + co.curDebt, liab, stock: co.stock, re: co.re, equity, check: assets - liab - equity },
      cash: { ni, dep, writeOff: fl.writeOff, dAP: co.ap - apStart, dAR: -(co.ar - arStart), dInv: -(inv - invStart), cfo: ni + dep + fl.writeOff + (co.ap - apStart) - (co.ar - arStart) - (inv - invStart),
        capex: -(fl.capex + fl.autoCapex), assetSales: fl.assetSales, cfi: fl.assetSales - fl.capex - fl.autoCapex,
        dividends: -div, stockIssued: fl.stockIssue, stockBought: -fl.stockBuy, bondsIssued: fl.bondIssue, bondsRetired: -(fl.bondRetire + fl.bondMature), curDebt: fl.curNew - fl.curOld, emergency,
        cff: fl.curNew - fl.curOld + fl.bondIssue - fl.bondRetire - fl.bondMature + fl.stockIssue - fl.stockBuy - div + emergency, end: co.cash },
      market: { price: co.price, eps, dps: co.dpsPlan, bvps, shares: co.shares, mcap: co.price * co.shares, rating: co.rating, prime: PRIME[Math.min(y, PRIME.length - 1)], ratePaid: co.rateCur, emergency,
        ros: rev > 0 ? ni / rev : 0, turnover: assets > 0 ? rev / assets : 0, roa: assets > 0 ? ni / assets : 0, leverage: equity > 0 ? assets / equity : 99, roe: equity > 0 ? ni / equity : -1, cov, bondList: co.bonds.map(b => Object.assign({}, b)) },
      lines
    };
    co.revPrev = rev; co.epsPrev = eps;
    return res;
  }
  function processYear(g, userDec) {
    const y = g.year, E = env(g, y);
    const decs = {};
    g.cos.forEach(co => { decs[co.id] = y === 0 ? statusQuo(g, co, E) : co.id === 'you' ? (userDec || statusQuo(g, co, E)) : aiDecide(g, co, E); });
    g.cos.forEach(co => prepare(g, co, decs[co.id], E));
    allocate(g, E);
    const results = {};
    g.cos.forEach(co => { results[co.id] = close(g, co); co.hist.push(results[co.id]); });
    const pre = {};
    g.prods.forEach(p => { pre[p.id] = { cap: p.cap, auto: p.auto, live: !p.retired && (p.launched || (p.rd && p.rd.left <= 1)), rdDone: p.rd && p.rd.left <= 1 ? y + p.rd.left : null, wasRetired: p.retired }; });
    advance(g);
    snapshot(g, y, E, results, decs, pre);
  }
  function advance(g) {
    const y = g.year;
    g.prods.forEach(p => {
      if (p.retired) return;
      if (p.rd) {
        if (p.rd.left <= 1) {
          const f = p.rd.left;
          if (!p.launched) { p.age = 1 - f; p.launched = true; }
          else if (p.rd.pos) p.age = (p.age + f) / 2 + (1 - f);
          else p.age += 1;
          p.t = p.rd.t; p.w = p.rd.w; p.mtbf = p.rd.mtbf; p.lastRev = y + f; p.rd = null;
        } else { p.rd.left -= 1; if (p.launched) p.age += 1; }
      } else if (p.launched) p.age += 1;
      p.cap = p.capNext; p.auto = p.autoNext;
      if (p.launched && !p.rd && p.cap <= 0 && p.inv < 0.05) { p.retired = true; p.retiredYear = y; }
    });
    g.year++;
  }
  function snapshot(g, y, E, results, decs, pre) {
    const totalSold = sum(g.prods.map(p => p.sold || 0));
    const prods = g.prods.filter(p => pre[p.id] && !pre[p.id].wasRetired).map(p => {
      const q = pre[p.id];
      return { id: p.id, name: p.name, co: p.co, seg: p.seg, t: p.t, w: p.w, mtbf: p.mtbf, age: p.age, price: p.price, promo: p.promo, sales: p.sales, aw: p.aw, launched: p.launched, isNew: !!p.isNew, launchYear: p.launchYear,
        units: p.sold || 0, demand: p.demand || 0, stockout: !!p.stockout, inv: p.inv, prod: p.prod || 0, cap: q.cap, auto: q.auto, capNext: p.cap, autoNext: p.auto, util: p.util || 0,
        rdDone: q.rdDone, pending: p.rd ? { t: p.rd.t, w: p.rd.w, mtbf: p.rd.mtbf, done: y + 1 + p.rd.left } : null, retired: p.retired, live: q.live,
        mat: p.unitMat || 0, lab: p.unitLab || 0, unitCost: p.unitCost || 0, cm: p.price - (p.unitMat || 0) - (p.unitLab || 0), second: p.prod > 0 ? Math.max(0, p.prod - q.cap) / p.prod : 0,
        score: p.score.map(x => Math.round(x * 100)), soldSeg: p.soldSeg.slice(), dem: p.dem.slice(), share: totalSold > 0 ? (p.sold || 0) / totalSold : 0 };
    });
    const segs = E.map((e, s) => {
      const sold = sum(prods.map(p => p.soldSeg[s]));
      const dem = sum(prods.map(p => p.dem[s]));
      return { id: e.id, name: e.name, size: e.size, demand: e.demandEff, sold, growth: SEGS[s].growth, cx: e.cx, cy: e.cy, ix: e.ix, iy: e.iy, dx: e.dx, dy: e.dy, plo: e.plo, phi: e.phi, mlo: e.mlo, mhi: e.mhi, age: e.age, w: e.w, nextSize: expectedSize(g, y + 1, s),
        acc: g.cos.map(c => c.acc[s]), shares: prods.filter(p => p.soldSeg[s] > 0.05 || p.dem[s] > 0.05).map(p => ({ id: p.id, co: p.co, units: p.soldSeg[s], share: sold > 0 ? p.soldSeg[s] / sold : 0, pot: dem > 0 ? p.dem[s] / dem : 0 })).sort((a, b) => b.units - a.units) };
    });
    const cos = g.cos.map(co => ({ id: co.id, name: co.name, short: co.short, letter: co.letter, ai: co.ai, res: results[co.id], share: totalSold > 0 ? sum(prodsOf(g, co).map(p => p.sold || 0)) / totalSold : 0,
      units: sum(prodsOf(g, co).map(p => p.sold || 0)), acc: co.acc.slice(), init: Object.assign({}, co.initSpend), initEff: initEff(co), arDays: co.arDays, apDays: co.apDays }));
    g.reports.push({ y, segs, prods, cos, you: decs.you ? clone(decs.you) : null, totalSold });
    g.prods.forEach(p => { p.last = { demand: p.demand || 0, sold: p.sold || 0, stockout: !!p.stockout, invRatio: (p.sold || 0) > 0 ? p.inv / p.sold : (p.inv > 0 ? 1 : 0), util: p.util || 0 }; });
  }

  /* ---------- Helpers for the interface ---------- */
  function defaultDraft(g) {
    const co = you(g), E = env(g, g.year);
    const d = { products: {}, newProducts: [], fin: emptyFin(co), init: {} };
    INIT_KEYS.forEach(k => { d.init[k] = co.initSpend[k] || 0; });
    activeOf(g, co).forEach(p => {
      d.products[p.id] = { t: p.rd ? p.rd.t : p.t, w: p.rd ? p.rd.w : p.w, mtbf: p.rd ? p.rd.mtbf : p.mtbf, price: p.price || Math.round((E[p.seg].plo + E[p.seg].phi) / 2), promo: p.launched ? p.promo : 1200, sales: p.launched ? p.sales : 1200, prod: 0, capChange: 0, autoNext: p.auto, forecast: null };
    });
    const auto = autoForecast(g, d);
    activeOf(g, co).forEach(p => { const x = d.products[p.id]; x.prod = p.launched ? clamp(r1(auto[p.id] * 1.04 - p.inv), 0, 2 * p.cap) : 0; });
    return d;
  }
  function autoForecast(g, draft) {
    const co = you(g), E = env(g, g.year), out = {};
    const est = g.cfg.difficulty === 'expert' ? null : estimate(g, draft);
    activeOf(g, co).forEach(p => { out[p.id] = !p.launched ? 0 : est ? (est[p.id] ? est[p.id].demand : 0) : naiveForecast(g, p, E); });
    return out;
  }
  function estimate(g, draft) {
    const y = g.year, E = env(g, y);
    E.forEach((e, i) => { e.size = expectedSize(g, y, i); });
    const yc = you(g), rep = g.reports[g.reports.length - 1];
    const fin = (draft && draft.fin) || {};
    const ycx = Object.assign({}, yc, { arDays: num(fin.arDays, yc.arDays) });
    const sales = {};
    activeOf(g, yc).forEach(p => { const d = draft.products[p.id] || {}; if (p.launched || (p.rd && p.rd.left <= 1)) sales[p.seg] = (sales[p.seg] || 0) + num(d.sales, p.sales); });
    const items = [];
    g.prods.forEach(p => {
      if (p.retired) return;
      if (p.co === 'you') {
        const d = draft.products[p.id] || {};
        const q = Object.assign({}, p, { price: num(d.price, p.price) });
        if (!p.rd && p.launched && d.t != null) {
          const nt = num(d.t, p.t), nw = num(d.w, p.w), nm = num(d.mtbf, p.mtbf);
          if (moved(p, nt, nw) || Math.abs(nm - p.mtbf) > 1) { const time = rdTime(yc, p, nt, nw, nm); q.rd = { t: nt, w: nw, mtbf: nm, left: time, total: time, pos: moved(p, nt, nw) }; }
        }
        if (!q.launched && !(q.rd && q.rd.left <= 1)) return;
        const aw = (p.aw + awNext(p.aw, num(d.promo, p.promo))) / 2;
        items.push({ p: q, co: ycx, aw, acc: s => (yc.acc[s] + accNext(yc.acc[s], sales[s] || 0)) / 2, mine: true });
      } else {
        const rp = rep.prods.find(r => r.id === p.id);
        if (!rp || !p.launched || p.cap <= 0 && p.inv < 0.05) return;
        const co = coOf(g, p);
        items.push({ p: { t: rp.t, w: rp.w, mtbf: rp.mtbf, age: rp.age, price: rp.price, rd: null, launched: true }, co, aw: p.aw, acc: s => co.acc[s] });
      }
    });
    const out = {};
    E.forEach((e, s) => {
      const sc = items.map(it => productScore(e, it.p, it.co, it.aw, it.acc(s)));
      const top = Math.max(0, ...sc.map(x => x.score));
      const D = e.size * clamp(0.82 + 0.18 * top / 0.5, 0.82, 1);
      const tot = sum(sc.map(x => (x.score > 0 ? Math.pow(x.score, 1.6) : 0)));
      items.forEach((it, k) => {
        if (!it.mine) return;
        const id = it.p.id; out[id] = out[id] || { demand: 0, seg: [0, 0, 0, 0, 0], score: [0, 0, 0, 0, 0], detail: [null, null, null, null, null], fac: sc[k].fac };
        out[id].score[s] = Math.round(sc[k].score * 100); out[id].detail[s] = sc[k].detail;
        const dmd = tot > 0 && sc[k].score > 0 ? D * Math.pow(sc[k].score, 1.6) / tot : 0;
        out[id].seg[s] = dmd; out[id].demand += dmd;
      });
    });
    return out;
  }
  function liteCopy(g) {
    const c = clone({ year: g.year, years: g.years, cfg: g.cfg, sizes: g.sizes, prods: g.prods, cos: g.cos.map(co => Object.assign({}, co, { hist: [] })) });
    c.reports = g.reports; c.rng = { s: 1 };
    return c;
  }
  function proforma(g, draft, sales) {
    const c = liteCopy(g), E = env(c, c.year);
    const co = c.cos[0];
    prepare(c, co, clone(draft), E);
    activeOf(c, co).forEach(p => { const s = sales[p.id] != null ? sales[p.id] : 0; p.sold = clamp(s, 0, p.avail || 0); p.demand = s; });
    return close(c, co);
  }
  function rdInfo(g, pid, t, w, m) {
    const p = g.prods.find(x => x.id === pid), co = you(g);
    if (!p || p.rd || !p.launched) return null;
    const time = rdTime(co, p, t, w, m);
    if (time === 0) return { time: 0, cost: 0, done: null, ageAfter: null, moved: false };
    const mv = moved(p, t, w);
    return { time, cost: rdCost(time, p, m), done: g.year + time, ageAfter: mv && time <= 1 ? (p.age + time) / 2 + (1 - time) : null, moved: mv, late: time > 1 };
  }
  function scorecard(g) {
    const rows = [];
    g.reports.slice(1).forEach(r => {
      const me = r.cos[0], res = me.res, m = res.market, inc = res.income;
      const prices = r.cos.map(c => c.res.market.price).sort((a, b) => b - a);
      const priceRank = prices.indexOf(m.price);
      const mine = r.prods.filter(p => p.co === 'you' && p.live && p.units > 0.05);
      const avgScore = mine.length ? sum(mine.map(p => p.score[p.seg])) / mine.length : 0;
      const cmPct = inc.rev > 0 ? inc.cm / inc.rev : 0;
      const capSum = sum(mine.map(p => p.cap)), util = capSum > 0 ? sum(mine.map(p => p.prod)) / capSum : 0;
      const dio = inc.mat + inc.labor > 0.1 ? res.balance.inv / (inc.mat + inc.labor) * 365 : 0;
      const autoAvg = mine.length ? sum(mine.map(p => p.auto * p.cap)) / Math.max(1e-6, capSum) : 0;
      const ie = me.initEff, initScore = (ie.lean / 0.10 + ie.supplier / 0.07 + ie.digital / 0.35 + ie.customer / 0.05 + ie.workforce / 0.08) / 5;
      const awAvg = mine.length ? sum(mine.map(p => p.aw)) / mine.length : 0;
      const segsIn = Array.from(new Set(mine.map(p => p.seg)));
      const accAvg = segsIn.length ? sum(segsIn.map(s => me.acc[s])) / segsIn.length : 0;
      const parts = {
        profit: clamp(m.ros / 0.10, 0, 1) * 10, stock: (5 - priceRank) / 5 * 10,
        leverage: m.leverage >= 1.8 && m.leverage <= 2.8 ? 5 : clamp(5 - Math.min(Math.abs(m.leverage - 1.8), Math.abs(m.leverage - 2.8)) * 5, 0, 5),
        emergency: m.emergency > 0 ? 0 : 10, roe: clamp(m.roe / 0.18, 0, 1) * 5,
        share: clamp(me.share / 0.2, 0, 1) * 10, survey: clamp(avgScore / 55, 0, 1) * 10, reach: clamp((awAvg + accAvg) / 2 / 0.8, 0, 1) * 5,
        margin: clamp((cmPct - 0.15) / 0.17, 0, 1) * 10, util: util >= 0.85 && util <= 1.15 ? 5 : clamp(5 - Math.min(Math.abs(util - 0.85), Math.abs(util - 1.15)) * 12, 0, 5), inventory: clamp((90 - dio) / 70, 0, 1) * 5,
        productivity: clamp((autoAvg - 3) / 4, 0, 1) * 7, initiatives: clamp(initScore / 0.6, 0, 1) * 8
      };
      const fin = parts.profit + parts.stock + parts.leverage + parts.emergency + parts.roe, cust = parts.share + parts.survey + parts.reach, intl = parts.margin + parts.util + parts.inventory, learn = parts.productivity + parts.initiatives;
      rows.push({ y: r.y, fin, cust, intl, learn, total: fin + cust + intl + learn, parts, avgScore, cmPct, util, dio, autoAvg, initScore, awAvg, accAvg });
    });
    return rows;
  }
  function standings(g) {
    const R = g.reports.slice(1);
    const cos = g.cos.map((co, i) => {
      const hist = R.map(r => r.cos[i]);
      const lastH = hist.length ? hist[hist.length - 1] : null;
      return { id: co.id, name: co.name, short: co.short, ai: co.ai, cumProfit: sum(hist.map(h => h.res.income.ni)), price: lastH ? lastH.res.market.price : co.price, share: lastH ? lastH.share : 0,
        roe: hist.length ? sum(hist.map(h => h.res.market.roe)) / hist.length : 0, emergencies: hist.filter(h => h.res.market.emergency > 0).length, sales: lastH ? lastH.res.income.rev : 0, mcap: lastH ? lastH.res.market.mcap : 0 };
    });
    const keys = ['cumProfit', 'price', 'share', 'roe'];
    keys.forEach(k => { const sorted = cos.map(c => c[k]).sort((a, b) => b - a); cos.forEach(c => { c[k + 'Rank'] = sorted.indexOf(c[k]) + 1; }); });
    cos.forEach(c => { c.rankScore = keys.reduce((s, k) => s + (6 - c[k + 'Rank']) / 5, 0) / keys.length * 100; });
    cos.slice().sort((a, b) => b.rankScore - a.rankScore || b.cumProfit - a.cumProfit).forEach((c, i) => { c.place = i + 1; });
    return cos;
  }
  function finalScore(g) {
    const sc = scorecard(g), st = standings(g);
    const card = sc.length ? sum(sc.map(r => r.total)) / sc.length : 0;
    return Math.round(clamp(0.5 * card + 0.5 * st[0].rankScore, 0, 100));
  }
  function apply(g, decision) { processYear(g, decision); g.draft = g.year <= g.years ? defaultDraft(g) : null; }
  function autopilot(g, archetype) { return aiDecide(g, you(g), env(g, g.year), archetype || 'balanced'); }

  const api = { SEGS, COS, AI, PRIME, RATINGS, SPREAD, INIT_KEYS, INIT_MAX, INIT_CAP, BUDGET_CAP, ROUGH, FINE, TS, WS, PRICE_DRIFT, LABOR0, AUTO_COST, NEW_RD, TAX,
    create, apply, env, expectedSize, estimate, autoForecast, proforma, rdInfo, rdTime, rdCost, newRdCost, defaultDraft, scorecard, standings, finalScore, finLimits,
    material, capCost, laborRate, AUTO_CUT, TECH, initEff, initEffFrom, bondTotal, curLimit, prodsOf, activeOf, you, baseScore, productScore, awNext, accNext, arFactor, autopilot, isDone: g => g.year > g.years };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BoardroomEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
