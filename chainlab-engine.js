/* Chain Lab engine: a four-echelon beverage supply chain in the tradition of the MIT Beer Distribution Game.
   Retailer, wholesaler, distributor and factory each hold stock, fill orders from downstream and order from upstream,
   with an information delay on orders, a shipping delay on goods and a production delay at the factory.
   Computer teammates order with the anchoring-and-adjustment heuristic Sterman (1989) estimated from real players.
   Deterministic for a seed, a configuration and a list of decisions. Units are cases; money is dollars. */
(function (root) {
  'use strict';
  const RNG = {
    make(seed) { return { s: (seed >>> 0) || 1 }; },
    next(r) { r.s = (r.s + 0x6D2B79F5) >>> 0; let t = r.s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; },
    normal(r) { let u = 0, v = 0; while (u === 0) u = RNG.next(r); while (v === 0) v = RNG.next(r); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  };
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const sum = a => a.reduce((s, x) => s + x, 0);
  const avg = a => (a.length ? sum(a) / a.length : 0);
  const variance = a => { const m = avg(a); return avg(a.map(x => (x - m) * (x - m))); };
  const clone = o => JSON.parse(JSON.stringify(o));

  const ROLES = [
    { id: 'retailer', name: 'Retailer', who: 'A supermarket chain’s stores. Sells to shoppers and orders from the wholesaler.' },
    { id: 'wholesaler', name: 'Wholesaler', who: 'A regional warehouse. Supplies the retailer and orders from the distributor.' },
    { id: 'distributor', name: 'Distributor', who: 'The national distribution centre. Supplies the wholesaler and orders from the factory.' },
    { id: 'factory', name: 'Factory', who: 'The bottling plant. Supplies the distributor and decides how much to bottle.' }
  ];
  const HOLD = 0.5, BACK = 1.0, INFO_DELAY = 1, SHIP_DELAY = 2, PROD_DELAY = 3;
  const SCENARIOS = {
    classic: { name: 'Classic step', blurb: 'Shoppers buy 4 cases a week, then from week 5 they buy 8 a week and keep buying 8. Nothing else changes.' },
    noisy: { name: 'Noisy step', blurb: 'The same step from 4 to 8 cases a week, with random week-to-week swings of a few cases.' },
    seasonal: { name: 'Seasonal', blurb: 'Demand follows the weather: a summer peak around 13 cases a week and a winter trough around 4, with noise.' },
    promo: { name: 'Promotions', blurb: 'Demand runs around 6 cases a week, but two price promotions roughly double it for two weeks, and shoppers then buy less while they use up what they stocked.' },
    shock: { name: 'Supply shock', blurb: 'The classic step in demand, then a breakdown at the bottling plant cuts its capacity to 3 cases a week for four weeks.' }
  };
  const INFO = {
    none: { name: 'Classic', blurb: 'Each firm sees only its own stock, its own orders and what arrives. Nobody but the retailer sees what shoppers buy.' },
    pos: { name: 'Shared sales data', blurb: 'Every firm sees the retailer’s point-of-sale data: what shoppers bought each week.' },
    full: { name: 'Full visibility', blurb: 'Every firm sees shoppers’ demand and every firm’s stock, backlog and pipeline.' }
  };
  const SHOCK = { from: 14, to: 17, cap: 3 };
  const CALC = { theta: 0.8, adj: 0.33, adjSL: 0.75, cover: 1 };

  function demandSeries(seed, scen, weeks) {
    const r = RNG.make((seed ^ 0x5bd1e995) >>> 0), out = [];
    for (let w = 1; w <= weeks; w++) {
      let d;
      if (scen === 'classic' || scen === 'shock') d = w <= 4 ? 4 : 8;
      else if (scen === 'noisy') { const b = w <= 4 ? 4 : 8; d = clamp(Math.round(b + 1.3 * RNG.normal(r)), 0, b + 5); }
      else if (scen === 'seasonal') d = clamp(Math.round(8.5 + 4.5 * Math.sin(2 * Math.PI * (w - 6) / 26) + 1.1 * RNG.normal(r)), 1, 20);
      else if (scen === 'promo') {
        const pr = [10, 11, 26, 27], dip = [12, 13, 28, 29];
        const base = 6 + 1.0 * RNG.normal(r);
        d = clamp(Math.round(pr.indexOf(w) >= 0 ? base * 2.2 : dip.indexOf(w) >= 0 ? base * 0.65 : base), 0, 25);
      } else d = 4;
      out.push(d);
    }
    return out;
  }

  /* Computer teammates: expected demand by exponential smoothing; order = expectation + alpha × (desired stock − stock − beta × supply line). */
  function teamParams(seed) {
    const r = RNG.make((seed ^ 0x27d4eb2f) >>> 0);
    return [0, 1, 2, 3].map(() => ({ theta: 0.25 + 0.2 * RNG.next(r), alpha: 0.2 + 0.15 * RNG.next(r), beta: 0.2 + 0.25 * RNG.next(r) }));
  }

  function create(seed, config) {
    const cfg = config || {};
    const weeks = cfg.weeks === 52 || cfg.weeks === '52' ? 52 : 36;
    const scen = SCENARIOS[cfg.scenario] ? cfg.scenario : 'classic';
    const info = INFO[cfg.info] ? cfg.info : 'none';
    const role = clamp(ROLES.findIndex(x => x.id === cfg.role) >= 0 ? ROLES.findIndex(x => x.id === cfg.role) : 1, 0, 3);
    const dem = demandSeries(seed, scen, weeks + 4);
    const L0 = Math.max(2, Math.round(scen === 'seasonal' ? avg(dem.slice(0, 3)) : dem[0]));
    const g = { v: 1, seed, weeks, t: 1, cfg: { scenario: scen, info, role: ROLES[role].id, weeks, difficulty: (['guided', 'standard', 'expert'].indexOf(cfg.difficulty) >= 0 ? cfg.difficulty : 'guided') }, role, dem, L0, done: false,
      params: teamParams(seed), log: [], draft: null };
    g.E = [0, 1, 2, 3].map(() => ({
      inv: 3 * L0, back: 0, ship: [L0, L0], ord: [L0], exp: L0, d: L0, sent: L0, arr: L0, cost: 0,
      target: 3 * L0, slTarget: L0 * (INFO_DELAY + SHIP_DELAY - 1)
    }));
    g.E[3].prod = [L0, L0, L0]; g.E[3].slTarget = L0 * (PROD_DELAY - 1); g.E[3].ship = null;
    g.H = { dem: [], served: [], E: [0, 1, 2, 3].map(() => []) };
    begin(g);
    g.draft = defaultDraft(g);
    return g;
  }
  const supplyLine = (g, i) => { const e = g.E[i]; return i < 3 ? sum(e.ord) + g.E[i + 1].back + sum(e.ship) : sum(e.prod); };
  const owed = (g, i) => (i < 3 ? sum(g.E[i].ord) + g.E[i + 1].back : 0);
  const capAt = (g, w) => (g.cfg.scenario === 'shock' && w >= SHOCK.from && w <= SHOCK.to ? SHOCK.cap : Infinity);
  const leadTime = i => (i < 3 ? INFO_DELAY + SHIP_DELAY : PROD_DELAY);

  /* Start of week t: goods arrive, orders arrive, each firm ships what it can. */
  function begin(g) {
    const t = g.t, E = g.E;
    for (let i = 0; i < 4; i++) { const e = E[i]; const a = i < 3 ? e.ship.shift() : e.prod.shift(); e.inv += a; e.arr = a; }
    for (let i = 0; i < 4; i++) E[i].d = i === 0 ? g.dem[t - 1] : E[i - 1].ord.shift();
    for (let i = 3; i >= 0; i--) {
      const e = E[i], need = e.back + e.d, s = Math.min(e.inv, need);
      e.inv -= s; e.back = need - s; e.sent = s;
      if (i > 0) E[i - 1].ship.push(s);
    }
    for (let i = 0; i < 4; i++) { const e = E[i]; e.weekCost = HOLD * e.inv + BACK * e.back; }
  }
  /* What a computer teammate (or a benchmark policy) orders this week. */
  function signalFor(g, i, info) { return info === 'none' ? g.E[i].d : g.dem[g.t - 1]; }
  function heuristic(g, i, p) {
    const e = g.E[i], info = g.cfg.info, sig = signalFor(g, i, info);
    const beta = info === 'full' ? Math.max(p.beta, 0.7) : p.beta;
    const exp = p.theta * sig + (1 - p.theta) * e.exp;
    const desired = e.target + beta * e.slTarget;
    return { order: Math.max(0, Math.round(exp + p.alpha * (desired - (e.inv - e.back) - beta * supplyLine(g, i)))), exp };
  }
  /* The order-up-to calculator: forecast + adjust (target − stock) + adjust (forecast × lead time − supply line). */
  function suggest(g, i, opt) {
    const o = opt || {}, e = g.E[i], info = g.cfg.info;
    const sig = i === 0 || info !== 'none' ? g.dem[g.t - 1] : e.d;
    const theta = o.theta == null ? CALC.theta : o.theta, adj = o.adj == null ? CALC.adj : o.adj, adjSL = o.adjSL == null ? CALC.adjSL : o.adjSL;
    const fc = theta * sig + (1 - theta) * (o.fc0 == null ? e.myExp == null ? e.exp : e.myExp : o.fc0);
    const cover = o.cover == null ? CALC.cover : o.cover;
    const target = fc * cover, slWant = fc * (leadTime(i) - 1), sl = supplyLine(g, i), net = e.inv - e.back;
    const order = Math.max(0, Math.round(fc + adj * (target - net) + adjSL * (slWant - sl)));
    return { fc, target, slWant, sl, net, adj, adjSL, cover, theta, order, sig };
  }
  function place(g, orders) {
    const t = g.t, E = g.E;
    for (let i = 0; i < 4; i++) {
      const e = E[i];
      let o = Math.max(0, Math.round(+orders[i] || 0));
      if (i === 3) { const cap = capAt(g, t); if (o > cap) { e.capped = o - cap; o = cap; } else e.capped = 0; }
      e.lastOrder = o;
      if (i < 3) e.ord.push(o); else e.prod.push(o);
      e.cost += e.weekCost;
      g.H.E[i].push({ t, d: e.d, sent: e.sent, arr: e.arr, inv: e.inv, back: e.back, order: o, sl: supplyLine(g, i), cost: e.weekCost, capped: e.capped || 0 });
    }
    g.H.dem.push(g.dem[t - 1]); g.H.served.push(E[0].sent);
  }
  function step(g, myOrder, mode) {
    const orders = [0, 1, 2, 3].map(i => {
      if (i !== g.role) { const h = heuristic(g, i, g.params[i]); g.E[i].exp = h.exp; return h.order; }
      return null;
    });
    const me = g.E[g.role];
    if (mode && mode.kind === 'typical') { const h = heuristic(g, g.role, { theta: 0.36, alpha: 0.26, beta: 0.34 }); me.exp = h.exp; orders[g.role] = h.order; }
    else if (mode && mode.kind === 'pass') orders[g.role] = me.d;
    else if (mode && mode.kind === 'policy') { const s = suggest(g, g.role, mode.opt); me.myExp = s.fc; orders[g.role] = s.order; }
    else { const s = suggest(g, g.role, {}); me.myExp = s.fc; orders[g.role] = myOrder; me.exp = 0.36 * signalFor(g, g.role, g.cfg.info) + 0.64 * me.exp; }
    place(g, orders);
    g.t++;
    if (g.t > g.weeks) { g.done = true; g.t = g.weeks + 1; } else begin(g);
  }
  function apply(g, d) {
    if (g.done) return;
    const dec = d || {};
    if (dec.calc) g.calc = cleanCalc(dec.calc);
    if (dec.policy) {
      const P = dec.policy, opt = cleanCalc(P);
      const weeks = clamp(Math.round(isFinite(+P.weeks) ? +P.weeks : 1), 1, 8);
      g.calc = opt;
      g.log.push({ t: g.t, kind: 'policy', weeks, opt });
      for (let k = 0; k < weeks && !g.done; k++) step(g, null, { kind: 'policy', opt });
    } else {
      const o = clamp(Math.round(+dec.order || 0), 0, 500);
      g.log.push({ t: g.t, kind: 'order', order: o });
      step(g, o, null);
    }
    g.draft = g.done ? null : defaultDraft(g);
  }
  function calcOf(g) { return Object.assign({}, CALC, g.calc || {}); }
  function defaultDraft(g) {
    const me = g.E[g.role], c = calcOf(g), s = suggest(g, g.role, c);
    return { order: g.cfg.difficulty === 'expert' ? me.lastOrder != null ? me.lastOrder : g.L0 : s.order, calc: c, weeks: 4 };
  }
  function cleanCalc(c) {
    const num = (v, d) => (v == null || v === '' || !isFinite(+v) ? d : +v), x = c || {};
    return { cover: clamp(num(x.cover, CALC.cover), 0, 8), adj: clamp(num(x.adj, CALC.adj), 0, 1), adjSL: clamp(num(x.adjSL, CALC.adjSL), 0, 1), theta: clamp(num(x.theta, CALC.theta), 0.05, 1) };
  }
  const isDone = g => g.done;
  const week = g => Math.min(g.t, g.weeks);

  /* Benchmarks on the same demand and teammates: a disciplined planner and a typical player in your seat. */
  function runWith(g0, mode) {
    const g = create(g0.seed, g0.cfg);
    while (!g.done) step(g, null, mode);
    return g;
  }
  function benchmarks(g) {
    if (g._bench) return g._bench;
    let best = null;
    [0, 0.5, 1, 2, 3, 5].forEach(cover => [0.1, 0.25, 0.5, 0.8].forEach(adj => [0, 0.25, 0.5, 0.8].forEach(adjSL => [0.25, 0.5, 1].forEach(theta => {
      const r = runWith(g, { kind: 'policy', opt: { cover, adj, adjSL, theta } });
      const c = r.E[g.role].cost;
      if (!best || c < best.cost) best = { cost: c, team: sum(r.E.map(e => e.cost)), cover, adj, adjSL, theta, run: r };
    }))));
    const pass = runWith(g, { kind: 'pass' });
    const typ = runWith(g, { kind: 'typical' });
    const disc = (() => { const x = create(g.seed, g.cfg); while (!x.done) { const sg = [0, 1, 2, 3].map(i => suggest(x, i, {})); sg.forEach((v, i) => { x.E[i].myExp = v.fc; }); place(x, sg.map(v => v.order)); x.t++; if (x.t > x.weeks) { x.done = true; x.t = x.weeks + 1; } else begin(x); } return x; })();
    const cum = h => { let a = 0; return h.map(x => (a += x.cost)); };
    g._bench = {
      pass: { cost: pass.E[g.role].cost, team: sum(pass.E.map(e => e.cost)), cum: cum(pass.H.E[g.role]) },
      plan: { cost: best.cost, team: best.team, cover: best.cover, adj: best.adj, adjSL: best.adjSL, theta: best.theta, orders: best.run.H.E[g.role].map(h => h.order), net: best.run.H.E[g.role].map(h => h.inv - h.back), cum: cum(best.run.H.E[g.role]) },
      typical: { cost: typ.E[g.role].cost, team: sum(typ.E.map(e => e.cost)), orders: typ.H.E[g.role].map(h => h.order), net: typ.H.E[g.role].map(h => h.inv - h.back), cum: cum(typ.H.E[g.role]) },
      team: { cost: sum(disc.E.map(e => e.cost)), byE: disc.E.map(e => e.cost) }
    };
    Object.defineProperty(g, '_bench', { enumerable: false, value: g._bench, writable: true });
    return g._bench;
  }
  const lin = (c, at80, at40) => {
    if (!(at40 > at80)) at40 = at80 * 1.6;
    if (c <= at80) return clamp(80 + 20 * (at80 - c) / Math.max(1, 0.2 * at80), 80, 100);
    if (c <= at40) return 80 - 40 * (c - at80) / (at40 - at80);
    return clamp(40 - 40 * (c - at40) / Math.max(1, at40), 0, 40);
  };
  function score(g) {
    const Bm = benchmarks(g), mine = g.E[g.role].cost, team = sum(g.E.map(e => e.cost));
    const se = lin(mine, Bm.plan.cost, Bm.typical.cost), st = lin(team, Bm.plan.team, Bm.typical.team);
    return { total: Math.round(clamp(0.7 * se + 0.3 * st, 0, 100)), seat: Math.round(se), team: Math.round(st), mine, teamCost: team };
  }
  function bullwhip(g) {
    const n = g.H.dem.length; if (n < 6) return null;
    const vd = variance(g.H.dem.slice(0, n)) || 0.25;
    return g.H.E.map(h => variance(h.map(x => x.order)) / vd);
  }
  /* Share of each week's new orders shipped the same week (backlog is served first). */
  function fillRate(g, i) {
    const h = g.H.E[i]; let ok = 0, asked = 0;
    h.forEach((x, k) => { const prevBack = k ? h[k - 1].back : 0; ok += clamp(x.sent - prevBack, 0, x.d); asked += x.d; });
    return asked > 0 ? ok / asked : 1;
  }
  function serviceLevel(g, i) { const h = g.H.E[i]; if (!h.length) return 1; return h.filter(x => x.back === 0).length / h.length; }
  /* Supply-line weight implied by the player's orders: regress order − expectation on stock and supply line gaps. */
  function impliedBeta(g) {
    const h = g.H.E[g.role]; if (h.length < 10) return null;
    const rows = h.slice(2).map((x, k) => { const prev = h[k + 1]; return { y: x.order - prev.d, s: (prev.inv - prev.back), sl: prev.sl }; });
    const ms = avg(rows.map(r => r.s)), msl = avg(rows.map(r => r.sl)), my = avg(rows.map(r => r.y));
    let sss = 0, ssl = 0, sxy1 = 0, sxy2 = 0, s12 = 0;
    rows.forEach(r => { const a = r.s - ms, b = r.sl - msl, y = r.y - my; sss += a * a; ssl += b * b; s12 += a * b; sxy1 += a * y; sxy2 += b * y; });
    const det = sss * ssl - s12 * s12; if (Math.abs(det) < 1e-6) return null;
    const bS = (sxy1 * ssl - sxy2 * s12) / det, bSL = (sxy2 * sss - sxy1 * s12) / det;
    if (!(bS < -0.02)) return null;
    return clamp(bSL / bS, -0.5, 2);
  }
  const visible = (g, i) => i === g.role || g.cfg.info === 'full';

  const api = { ROLES, SCENARIOS, INFO, CALC, calcOf, HOLD, BACK, INFO_DELAY, SHIP_DELAY, PROD_DELAY, SHOCK, create, apply, isDone, week, suggest, supplyLine, owed, leadTime, capAt, benchmarks, score, bullwhip, fillRate, serviceLevel, impliedBeta, visible, demandSeries };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ChainLabEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
