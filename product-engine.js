/* Product Studio engine: eight quarters as head of product at a scheduling SaaS.
   All randomness flows through g.rng inside create and apply, so a replay rebuilds every quarter exactly. */
(function () {
  'use strict';
  const S = window.SimLab, PD = window.ProductData;
  if (!S || !PD) return;
  const { RNG } = S;
  const { clamp, sum, avg, round, clone } = S.U;
  const ITEMS = PD.ITEMS, IDX = {}; ITEMS.forEach(it => { IDX[it.id] = it; });
  const lvl = g => S.lvlOf(g);
  const N_Q = 8, PTS = 18, ENG_COST = 37.5, OVERHEAD = 400, HIRE_COST = 15, ARR0 = 4000 * 8 * 4 * 12 / 1e6;
  const LIMITS = { 5: { conv: 1.3, sr: 0.92, cf: 0.005 }, 10: { conv: 1, sr: 1, cf: 0 }, 20: { conv: 0.75, sr: 1.06, cf: -0.002 }, unlimited: { conv: 0.45, sr: 1.12, cf: -0.004 } };
  const PRICES = [3, 4, 5, 6];
  const TARGET = { guided: 3600, standard: 4000, expert: 4500 };
  const REL = ['sr', 'ar', 'conv', 'org', 'ref', 'arpa', 'vel', 'inc'], ABS = ['cf', 'cp', 'nps', 'debt'];
  const NOISE = { guided: 0.3, standard: 0.6, expert: 0.9 };
  const SLOTS = { guided: 3, standard: 2, expert: 2 };
  const nrm = r => RNG.normal(r);

  /* Value proxy used to judge items: roughly the ARR effect of each unit of impact for this business. */
  function valueOf(fx, dealsWon) {
    let v = 0; const f = fx || {};
    v += 3800 * (f.ar || 0) + 2600 * (f.conv || 0) + 900 * (f.sr || 0) + 1100 * (f.org || 0) + 260 * (f.ref || 0) + 2900 * (f.arpa || 0);
    v += -120000 * (f.cf || 0) * 0.25 + -160000 * (f.cp || 0) * 0.6 + 6 * (f.nps || 0) - 8 * (f.debt || 0) + 400 * (f.vel || 0) - 200 * (f.inc || 0);
    if (f.ent) v += dealsWon && dealsWon[f.ent] ? 120 : 40;
    return v;
  }
  function primaryKey(fx) { let best = null, bv = 0; Object.keys(fx).forEach(k => { if (k === 'ent') return; const s = ({ ar: 3800, conv: 2600, sr: 900, org: 1100, ref: 260, arpa: 2900, cf: 30000, cp: 96000, nps: 6, debt: 4, vel: 160, inc: 120 })[k] || 1; const x = Math.abs(fx[k]) * s; if (x > bv) { bv = x; best = k; } }); return best; }

  function create(seed, cfg) {
    const c = cfg || {}, difficulty = S.normLevel(c.difficulty), rng = RNG.make(seed);
    const g = { v: 1, seed, cfg: { difficulty }, rng, q: 1, n: N_Q, done: false, items: {}, order: [],
      base: { org: 50000, sr: 0.05, ar: 0.30, conv: 0.025, cf: 0.07, cp: 0.03, ref: 0.012, seats: 8, nps: 22, debt: 45, incP: 0.1 },
      pools: { AF: 8000, AP: 4000, ent: 0 }, team: { eng: 10, ramp: 0, morale: 70 }, cash: 8000,
      trust: { ceo: 60, sales: 60, eng: 60, cust: 60 }, pricing: { price: 4, limit: '10', newOnly: false, legacyShare: 0, shock: 0, pause: false, annualPush: false, entBoost: 0, priceCut: 0 },
      ent: { caps: [], deals: PD.DEALS.map(d => ({ id: d.id, status: 'future', committed: null, by: d.by, won: false })) },
      hits: [], H: [], research: { used: 0, log: [] }, nps: 22, debt: 45, incidents: 0, eventLog: [], tests: [], draft: null };
    const L = difficulty, sd = NOISE[L];
    ITEMS.forEach(it => {
      const tru = {}; Object.keys(it.fx).forEach(k => { if (k === 'ent') { tru.ent = it.fx.ent; return; } const [m, s] = it.fx[k]; tru[k] = m + s * clamp(nrm(rng), -2.2, 2.2); });
      const effort = Math.round(it.effort * clamp(1 + 0.28 * nrm(rng), 0.75, 1.8));
      const est = {};
      Object.keys(tru).forEach(k => {
        if (k === 'ent') return;
        const m = it.fx[k][0], s = it.fx[k][1];
        if (k === 'debt' || k === 'inc' || k === 'vel') { est[k] = m * (1 + 0.2 * clamp(nrm(rng), -2, 2)); return; }
        if (it.hype && ['ar', 'conv', 'nps', 'cf'].indexOf(k) >= 0) { est[k] = (m === 0 ? s : m) * it.hype * (1 + 0.3 * sd * clamp(nrm(rng), -2, 2)); return; }
        est[k] = tru[k] * (1 + sd * 0.7 * clamp(nrm(rng), -2, 2)) + s * sd * 0.6 * clamp(nrm(rng), -2, 2);
      });
      g.items[it.id] = { id: it.id, tru, est, conf: 'low', effort, estEffort: it.effort, status: 'backlog', prog: 0, test: null, notes: [], shippedQ: null };
      g.order.push(it.id);
    });
    g.draft = defaultDraft(g);
    return g;
  }
  /* A fresh plan for the quarter; unfinished work from the last plan carries over in the same order. */
  function defaultDraft(g, prev) {
    const road = prev ? (prev.roadmap || []).filter((id, i, a) => g.items[id] && ['backlog', 'building'].indexOf(g.items[id].status) >= 0 && a.indexOf(id) === i) : [];
    const tests = {}; if (prev && prev.tests) Object.keys(prev.tests).forEach(id => { if (prev.tests[id] && road.indexOf(id) >= 0 && g.items[id].status === 'backlog' && IDX[id].test) tests[id] = true; });
    return { roadmap: road, tests, marketing: g.H.length ? g.H[g.H.length - 1].marketing : 120, hires: 0, price: g.pricing.price, limit: g.pricing.limit, event: null, decide: {}, deals: {} };
  }
  /* The effects of everything shipped before this quarter. */
  function effects(g, beforeQ) {
    const e = { sr: 0, ar: 0, conv: 0, org: 0, ref: 0, arpa: 0, vel: 0, inc: 0, cf: 0, cp: 0, nps: 0, debt: 0 };
    Object.values(g.items).forEach(it => { if (it.status === 'shipped' && it.shippedQ < beforeQ) Object.keys(it.tru).forEach(k => { if (k !== 'ent' && e[k] != null) e[k] += it.tru[k]; }); });
    e.inc = Math.max(-0.8, e.inc);
    return e;
  }
  const eventOf = g => (PD.EVENTS[g.q] && !g.eventLog.some(x => x.q === g.q) ? PD.EVENTS[g.q] : null);
  function dealsOpen(g) { return g.ent.deals.filter(d => { const D = PD.DEALS.find(x => x.id === d.id); return D.q === g.q && d.status === 'future'; }); }
  /* Points the team can deliver this quarter. With hires given, previews the team after this quarter's hiring or lay-offs. */
  function capacity(g, extra, hires) {
    const t = g.team, e = effects(g, g.q), debt = g.debt;
    const h = hires == null ? null : clamp(Math.round(+hires || 0), -3, 4);
    const eng = h == null ? t.eng : clamp(t.eng + h, 4, 30), ramp = h == null ? t.ramp : Math.max(0, h);
    const morale = h != null && h < 0 ? clamp(t.morale - 8 * -h, 10, 100) : t.morale;
    const f = (1 - debt / 200) * (0.85 + 0.3 * morale / 100) * (1 + e.vel) * (1 + (extra || 0));
    return Math.max(10, Math.round((eng - ramp * 0.5) * PTS * f));
  }
  function remaining(g, id, testOnly) {
    const it = g.items[id];
    if (it.status === 'tested') return Math.max(0, Math.round(it.effort * 0.6) - (it.prog2 || 0));
    const need = testOnly ? Math.round(it.effort * 0.4) : it.effort;
    return Math.max(0, need - it.prog);
  }
  /* What the team expects: catalogue estimates before work starts, the real remainder once it has. */
  function estRemaining(g, id, testOnly) { const it = g.items[id]; if (it.status === 'backlog') return testOnly ? Math.round(it.estEffort * 0.4) : it.estEffort; return remaining(g, id, testOnly); }
  /* A test build, once started, stays a test build. */
  function testMode(g, d, id) { const it = g.items[id]; if (!it) return false; if (it.status === 'building') return !!it.testing; return it.status === 'backlog' && !!(d && d.tests && d.tests[id] && IDX[id].test); }
  /* The order in which the team will work this quarter: tested items going to full build, the inbox's addition, then the roadmap. */
  function plan(g, d, evIn) {
    const ok = id => g.items[id] && ['backlog', 'building'].indexOf(g.items[id].status) >= 0;
    const road = ((d && d.roadmap) || []).filter((id, i, a) => ok(id) && a.indexOf(id) === i);
    const ev = evIn !== undefined ? evIn : eventOf(g), opt = ev && d ? ev.opts.find(o => o.v === d.event) : null;
    if (opt && opt.add && ok(opt.add) && road.indexOf(opt.add) < 0) road.unshift(opt.add);
    const dec = (d && d.decide) || {};
    const ship = g.order.filter(id => { const it = g.items[id]; return it.status === 'tested' && dec[id] !== 'kill' && (it.shipQueued || dec[id] === 'ship'); });
    return ship.concat(road);
  }

  /* ---------- Research (does not advance the quarter) ---------- */
  function slots(g) { return SLOTS[g.cfg.difficulty] - g.research.log.filter(r => r.q === g.q).length; }
  function doResearch(g, method, target) {
    const r = g.rng, L = g.cfg.difficulty, log = { q: g.q, method, target: null, text: '' };
    const narrow = (it, f) => { Object.keys(it.est).forEach(k => { it.est[k] = it.tru[k] + (it.est[k] - it.tru[k]) * f; }); it.nf = (it.nf || 1) * f; it.conf = it.nf <= 0.3 ? 'high' : it.nf <= 0.6 ? 'medium' : 'low'; };
    if (method === 'interviews' && target && g.items[target]) {
      const it = g.items[target], v = valueOf(it.tru), rank = Object.values(g.items).filter(x => valueOf(x.tru) > v).length;
      narrow(it, L === 'expert' ? 0.45 : 0.3);
      const verdict = rank < 7 ? 'Most managers described this as a real problem they would pay to solve.' : rank < 16 ? 'Some managers liked it; few said it would change how they use the product.' : 'Managers were polite but vague; almost nobody said they needed it.';
      it.notes.push(`Interviews (Q${g.q}): ${verdict}`); log.target = target; log.text = `${IDX[target].name}: ${verdict}`;
    } else if (method === 'usability') {
      const cands = Object.values(g.items).filter(x => (x.tru.ar || 0) > 0 && x.status !== 'shipped').sort((a, b) => b.tru.ar - a.tru.ar);
      const top = cands[0];
      if (top) { narrow(top, 0.3); top.notes.push(`Usability test (Q${g.q}): the biggest stumbling block for new managers.`); log.target = top.id; log.text = `Four of five managers got stuck at the step that “${IDX[top.id].name}” would fix.`; }
      else log.text = 'New managers set up without serious trouble.';
    } else if (method === 'funnel') {
      const h = g.H[g.H.length - 1] || snapshot(g), bench = { sr: 0.055, ar: 0.40, conv: 0.03, cf: 0.055, cp: 0.022 };
      const gaps = [['Sign-up rate', h.sr, bench.sr, 1], ['Activation', h.ar, bench.ar, 1], ['Free-to-paid', h.conv, bench.conv, 1], ['Free churn', h.cf, bench.cf, -1], ['Paid churn', h.cp, bench.cp, -1]].map(x => ({ k: x[0], you: x[1], peer: x[2], gap: x[3] > 0 ? x[2] / Math.max(1e-6, x[1]) - 1 : x[1] / Math.max(1e-6, x[2]) - 1 }));
      gaps.sort((a, b) => b.gap - a.gap);
      log.text = `Compared with similar products, your biggest gaps are ${gaps.slice(0, 2).map(x => `${x.k.toLowerCase()} (${(x.you * 100).toFixed(1)}% against ${(x.peer * 100).toFixed(1)}%)`).join(' and ')}.`; log.gaps = gaps;
    } else if (method === 'survey') {
      const top = Object.values(g.items).filter(x => x.status !== 'shipped').sort((a, b) => (b.tru.nps || 0) - (a.tru.nps || 0)).slice(0, 2);
      top.forEach(x => { narrow(x, 0.5); x.notes.push(`NPS survey (Q${g.q}): among the most-mentioned improvements.`); });
      log.text = `Detractors most often mention problems that “${top.map(x => IDX[x.id].name).join('” and “')}” would address.`; log.target = top.map(x => x.id).join(',');
    } else if (method === 'pricing') {
      log.text = `About ${Math.round(100 - 9 * (g.pricing.price - 3))}% of paying managers would accept $${g.pricing.price + 1} a seat; most free teams say the 10-person limit is the reason they would upgrade. Demand for Pro falls roughly 10% for every 10% added to the price.`;
    } else if (method === 'competitor') {
      const next = [3, 5, 6].find(qq => qq >= g.q);
      log.text = next === 3 ? 'The rival has hired a growth team and is testing a much bigger free plan. Expect a move within a quarter or two.' : next === 6 ? 'Rival job ads and customer chatter point to a slowdown among small businesses later this year.' : 'The rival is chasing large customers with single sign-on and multi-site tools.';
    }
    g.research.log.push(log); g.research.used++;
    void r;
  }

  /* ---------- A quarter ---------- */
  function snapshot(g) {
    const e = effects(g, g.q), b = g.base, P = g.pricing, Lm = LIMITS[P.limit];
    return { sr: b.sr * (1 + e.sr) * Lm.sr, ar: b.ar * (1 + e.ar), conv: b.conv * (1 + e.conv) * Lm.conv, cf: b.cf + e.cf, cp: b.cp + e.cp };
  }
  function priceNow(g) { const P = g.pricing; return P.price * (1 - (P.priceCut || 0) * 0.5); }
  function simulate(g, d, extra) {
    const e = effects(g, g.q), b = g.base, P = g.pricing, Lm = LIMITS[P.limit] || LIMITS['10'];
    const hitsNow = g.hits.filter(h => h.from <= g.q && h.to >= g.q && !(h.unless && g.ent.caps.indexOf(h.unless) >= 0));
    const hit = k => sum(hitsNow.map(h => h[k] || 0));
    const nps = g.nps;
    const npsAdj = 1 - (nps - 22) / 220;
    const priceEl = Math.pow(P.price / 4, -1.05) * (1 + (P.priceCut || 0) * 0.6);
    const mk = Math.max(0, +d.marketing || 0) / 3;
    const cpc = 4 * Math.pow(Math.max(1, mk) / 30, 0.4);
    let AF = g.pools.AF, AP = g.pools.AP, entMRR = g.pools.ent;
    const months = []; let signups = 0, activated = 0, conversions = 0, churnP = 0, churnF = 0, rev = 0, visitors = 0, afSum = 0, apSum = 0;
    for (let m = 0; m < 3; m++) {
      afSum += AF; apSum += AP;
      const org = b.org * (1 + e.org) * Math.pow(1.012, (g.q - 1) * 3 + m);
      const paidV = mk > 0 ? mk * 1000 / cpc : 0;
      const ref = (AF + AP) * b.ref * (1 + e.ref) * (1 + nps / 200);
      const su = (org + paidV) * b.sr * (1 + e.sr) * Lm.sr * (1 + hit('sr')) + ref;
      const act = su * clamp(b.ar * (1 + e.ar) * (1 - Math.max(0, g.debt - 60) / 400), 0.05, 0.9);
      const conv = AF * clamp(b.conv * (1 + e.conv) * Lm.conv * priceEl, 0.002, 0.12);
      const cfr = clamp((b.cf + e.cf + Lm.cf + hit('cf') * (P.pause ? 0.5 : 1)) * npsAdj + (extra.incident ? 0.01 : 0), 0.01, 0.3);
      const cpr = clamp((b.cp + e.cp + hit('cp') * (P.pause ? 0.5 : 1) + (P.shock > 0 ? P.shock : 0) - (P.annualPush ? 0.003 : 0)) * npsAdj + (extra.incident ? 0.006 : 0), 0.004, 0.2);
      const cF = AF * cfr, cP = AP * cpr, legacyN = P.newOnly ? P.legacyShare * AP * (1 - cpr) : 0;
      AF = Math.max(0, AF + act - conv - cF); AP = Math.max(0, AP + conv - cP);
      if (P.newOnly) P.legacyShare = AP > 0 ? clamp(legacyN / AP, 0, 1) : 0;
      const arpaNew = g.base.seats * priceNow(g) * (1 + e.arpa) * (P.annualPush ? 0.95 : 1) * (P.pause ? 0.985 : 1);
      const legacy = P.newOnly ? P.legacyShare : 0;
      const arpaOld = g.base.seats * (P.oldPrice || 4) * (1 + e.arpa);
      const mrr = AP * (arpaNew * (1 - legacy) + arpaOld * legacy) / 1000 + entMRR;
      rev += mrr; signups += su; activated += act; conversions += conv; churnP += cP; churnF += cF; visitors += org + paidV;
      months.push({ AF, AP, mrr });
    }
    const rates = { sr: signups / Math.max(1, visitors), ar: activated / Math.max(1, signups), conv: conversions / Math.max(1, afSum), cf: churnF / Math.max(1, afSum), cp: churnP / Math.max(1, apSum) };
    return { AF, AP, entMRR, rev, signups, activated, conversions, churnP, churnF, visitors, months, rates, mrr: months[2].mrr, paidVisitors: mk > 0 ? mk * 3000 / cpc : 0, cac: conversions > 0 ? (+d.marketing || 0) / Math.max(1, conversions) : 0 };
  }
  function apply(g, d) {
    if (g.done || !d) return;
    if (d.kind === 'research') { if (slots(g) > 0) doResearch(g, d.method, d.target); return; }
    const r = g.rng, L = g.cfg.difficulty, ev = eventOf(g), extra = { cap: 0, cost: 0, incident: false };
    /* event */
    if (ev) {
      const opt = ev.opts.find(o => o.v === d.event) || ev.opts[ev.opts.length - 1];
      Object.keys(opt.fx || {}).forEach(k => { if (k === 'morale') g.team.morale = clamp(g.team.morale + opt.fx[k], 10, 100); else g.trust[k] = clamp(g.trust[k] + opt.fx[k], 0, 100); });
      if (opt.cap) extra.cap += opt.cap; if (opt.cost) extra.cost += opt.cost;
      if (opt.set) { const s = opt.set; if (s.limit) g.pricing.limit = s.limit; if (s.priceCut) g.pricing.priceCut = s.priceCut; if (s.price) { g.pricing.oldPrice = g.pricing.price; g.pricing.price = Math.round(g.pricing.price * s.price * 100) / 100; if (s.newOnly) { g.pricing.newOnly = true; g.pricing.legacyShare = 0.9; } else g.pricing.shock = s.shock || 0; } if (s.pause) g.pricing.pause = true; if (s.annualPush) g.pricing.annualPush = true; if (s.entBoost) g.pricing.entBoost = s.entBoost; }
      if (ev.hit) g.hits.push(Object.assign({ from: ev.hit.q, to: ev.hit.q + (ev.hit.len || 2) - 1 }, ev.hit, opt.v === 'match' ? { sr: 0 } : opt.v === 'cut' ? { sr: ev.hit.sr * 0.5 } : {}));
      if (opt.research) doResearch(g, opt.research[0], opt.research[1]);
      g.eventLog.push({ q: g.q, id: ev.id, choice: opt.v });
    }
    /* deals arriving this quarter */
    dealsOpen(g).forEach(dl => { const c = d.deals && d.deals[dl.id]; dl.status = 'open'; dl.committed = c === 'commit' || c === 'later'; if (c === 'later') dl.by += 1; g.trust.sales = clamp(g.trust.sales + (c === 'commit' ? 8 : c === 'later' ? -2 : -10), 0, 100); if (!dl.committed) dl.status = 'declined'; });
    /* pricing changes between events */
    if (PRICES.indexOf(+d.price) >= 0 && +d.price !== g.pricing.price && !(ev && ev.id === 'price')) { g.pricing.oldPrice = g.pricing.price; const up = +d.price > g.pricing.price; g.pricing.price = +d.price; g.pricing.shock = up ? 0.008 : 0; g.pricing.newOnly = false; }
    if (d.limit != null && LIMITS[String(d.limit)] && String(d.limit) !== g.pricing.limit && !(ev && ev.id === 'freetier')) g.pricing.limit = String(d.limit);
    /* team */
    const hires = clamp(Math.round(+d.hires || 0), -3, 4);
    g.team.ramp = Math.max(0, hires); g.team.eng = clamp(g.team.eng + hires, 4, 30); if (hires < 0) g.team.morale = clamp(g.team.morale - 8 * -hires, 10, 100);
    extra.cost += Math.max(0, hires) * HIRE_COST;
    /* tested items: ship or kill */
    Object.keys(d.decide || {}).forEach(id => { const it = g.items[id]; if (!it || it.status !== 'tested') return; if (d.decide[id] === 'kill') it.status = 'killed'; else if (d.decide[id] === 'ship') it.shipQueued = true; });
    /* build */
    const cap = capacity(g, extra.cap); let pts = cap, featurePts = 0, platPts = 0;
    const road = plan(g, d, ev);
    const modes = {}; road.forEach(id => { modes[id] = testMode(g, d, id); });
    const demand = sum(road.map(id => remaining(g, id, modes[id])));
    const shippedNow = [];
    road.forEach(id => {
      const it = g.items[id], testOnly = modes[id];
      if (['backlog', 'building', 'tested'].indexOf(it.status) < 0) return;
      if (it.status === 'tested' && !it.shipQueued) return;
      const need = remaining(g, id, testOnly); if (pts <= 0) return;
      const use = Math.min(pts, need); pts -= use;
      if (IDX[id].cat === 'plat') platPts += use; else featurePts += use;
      if (it.status === 'tested') { it.prog2 = (it.prog2 || 0) + use; if (it.prog2 >= Math.round(it.effort * 0.6)) { it.status = 'shipped'; it.shippedQ = g.q; it.shipQueued = false; shippedNow.push(id); } return; }
      it.prog += use; it.status = 'building'; it.testing = testOnly;
      if (testOnly && it.prog >= Math.round(it.effort * 0.4)) { it.status = 'testing'; }
      else if (!testOnly && it.prog >= it.effort) { it.status = 'shipped'; it.shippedQ = g.q; shippedNow.push(id); }
    });
    const crunch = demand > cap * 1.3;
    /* debt and incidents */
    g.debt = clamp(g.debt + 1 + 0.045 * featurePts + sum(shippedNow.map(id => g.items[id].tru.debt || 0)), 0, 100);
    const pInc = outageRisk(g, g.q + 1);
    if (RNG.next(r) < pInc) { extra.incident = true; g.incidents++; g.trust.cust = clamp(g.trust.cust - 8, 0, 100); }
    /* metrics */
    const res = simulate(g, d, extra);
    g.pools.AF = res.AF; g.pools.AP = res.AP;
    if (g.pricing.shock > 0) g.pricing.shock = Math.max(0, g.pricing.shock - 0.004);
    /* NPS */
    const npsShip = sum(shippedNow.map(id => g.items[id].tru.nps || 0));
    g.nps = clamp(g.nps + npsShip - (extra.incident ? 6 : 0) - (g.debt > 65 ? 1.5 : 0) + 0.5, -40, 80);
    /* enterprise */
    shippedNow.forEach(id => { const t = g.items[id].tru.ent; if (t && g.ent.caps.indexOf(t) < 0) g.ent.caps.push(t); });
    const dealNews = [];
    g.ent.deals.forEach(dl => { const D = PD.DEALS.find(x => x.id === dl.id); if (dl.status !== 'open') return; const ready = D.needs.every(k => g.ent.caps.indexOf(k) >= 0);
      if (ready || g.q >= dl.by) { const p = ready ? clamp(0.72 + (g.pricing.entBoost || 0) + (g.trust.sales - 60) / 400, 0.3, 0.95) : 0; const win = ready && RNG.next(r) < p; dl.status = win ? 'won' : 'lost'; dl.won = win; dl.q = g.q; if (win) { g.pools.ent += D.arr / 12; g.trust.sales = clamp(g.trust.sales + 10, 0, 100); } else g.trust.sales = clamp(g.trust.sales - 10, 0, 100); dealNews.push({ id: dl.id, win }); } });
    /* morale and team */
    g.team.morale = clamp(g.team.morale + (crunch ? -8 : 2) + (platPts >= cap * 0.2 ? 4 : 0) + (70 - g.team.morale) * 0.1, 10, 100);
    let left = 0; if (g.team.morale < 45 && RNG.next(r) < 0.5 + (45 - g.team.morale) / 60) { left = 1; g.team.eng = Math.max(4, g.team.eng - 1); }
    g.trust.eng = clamp(g.trust.eng + (crunch ? -5 : 2) + (platPts >= cap * 0.2 ? 4 : 0), 0, 100);
    g.trust.cust = clamp(g.trust.cust + (npsShip > 0 ? 3 : 0) - (extra.incident ? 0 : -1), 0, 100);
    /* tests resolve */
    const testsNow = [];
    Object.values(g.items).forEach(it => {
      if (it.status !== 'testing') return;
      const k = primaryKey(it.tru), tv = it.tru[k] || 0;
      const vol = k === 'ar' || k === 'sr' ? res.signups : k === 'conv' ? g.pools.AF * 3 : (g.pools.AF + g.pools.AP) * 3;
      const se = (k === 'nps' ? 6 : k === 'cf' || k === 'cp' ? 0.004 : Math.max(0.01, Math.abs(tv) * 0.15 + 0.02)) * Math.sqrt(4000 / Math.max(400, vol)) * (L === 'guided' ? 0.6 : L === 'standard' ? 1 : 1.3);
      const meas = tv + se * clamp(nrm(r), -2.5, 2.5);
      it.test = { k, meas, se, q: g.q }; it.status = 'tested'; testsNow.push(it.id);
      g.tests.push({ id: it.id, k, meas, se, tru: tv, q: g.q });
    });
    /* money */
    const engCost = g.team.eng * ENG_COST, mkt = Math.max(0, +d.marketing || 0);
    const costs = engCost + OVERHEAD + mkt + extra.cost;
    g.cash += res.rev - costs;
    if (g.cash < 0) g.trust.ceo = clamp(g.trust.ceo - 15, 0, 100);
    const arr = res.mrr * 12 / 1000;
    const prevArr = g.H.length ? g.H[g.H.length - 1].arr : ARR0;
    g.trust.ceo = clamp(g.trust.ceo + clamp((arr - prevArr) / prevArr * 60 - 3, -10, 10), 0, 100);
    const snap = res.rates;
    const carried = road.filter(id => shippedNow.indexOf(id) < 0 && testsNow.indexOf(id) < 0 && (g.items[id].status === 'building' || (g.items[id].status === 'tested' && g.items[id].shipQueued)));
    g.H.push({ q: g.q, cap, used: cap - pts, demand, crunch, shipped: shippedNow, tested: testsNow, carried, incident: extra.incident, left, dealNews,
      signups: res.signups, activated: res.activated, conversions: res.conversions, churnP: res.churnP, churnF: res.churnF, visitors: res.visitors,
      AF: res.AF, AP: res.AP, mrr: res.mrr, arr, rev: res.rev, costs, cash: g.cash, marketing: mkt, cac: res.cac, nps: g.nps, debt: g.debt, morale: g.team.morale, eng: g.team.eng,
      sr: snap.sr, ar: snap.ar, conv: snap.conv, cf: snap.cf, cp: snap.cp, price: g.pricing.price, limit: g.pricing.limit, trust: clone(g.trust), entMRR: g.pools.ent });
    if (g.q >= g.n) { g.done = true; g.q = g.n + 1; g.draft = null; return; }
    g.q++;
    g.draft = defaultDraft(g, { roadmap: road, tests: d.tests });
  }
  const isDone = g => !!g.done;
  function outageRisk(g, beforeQ) { const e = effects(g, beforeQ == null ? g.q : beforeQ); return clamp((g.base.incP + g.debt / 300) * (1 + e.inc), 0.02, 0.6); }

  /* ---------- Scoring ---------- */
  function score(g) {
    const H = g.H, L = H[H.length - 1]; if (!L) return { total: 0, parts: [] };
    const target = TARGET[g.cfg.difficulty] / 1000, arr = L.arr, arr0 = ARR0;
    const s1 = clamp(75 + 100 * Math.log(Math.max(0.05, arr / target)), 0, 100);
    const burn = sum(H.map(h => Math.max(0, h.costs - h.rev))) / 1000, gain = Math.max(0.01, arr - arr0);
    const bm = burn / gain;
    const s2 = clamp(100 - 30 * Math.max(0, bm - 0.5), 0, 100) - (g.cash < 0 ? 30 : 0);
    const keepP = H.reduce((a, h) => a * Math.pow(1 - h.cp, 3), 1);
    const s3 = clamp(50 + 160 * (keepP - 0.45), 0, 100);
    const s4 = clamp(45 + (L.nps - 22) * 2.2, 0, 100);
    const s5 = clamp(100 - Math.max(0, L.debt - 30) * 1.4 + (L.morale - 65) * 0.6 - 6 * g.incidents, 0, 100);
    const won = {}; g.ent.deals.forEach(d => { if (d.won) PD.DEALS.find(x => x.id === d.id).needs.forEach(k => { won[k] = true; }); });
    const vals = Object.values(g.items).map(it => ({ id: it.id, v: valueOf(it.tru, won) / Math.max(10, it.effort), st: it.status }));
    const avgAll = avg(vals.map(x => x.v)), shipped = vals.filter(x => x.st === 'shipped');
    const avgShip = shipped.length ? avg(shipped.map(x => x.v)) : 0;
    const harmful = shipped.filter(x => x.v < 0).length;
    const goodTests = g.tests.filter(t => { const it = g.items[t.id]; const pos = t.tru > 0 === (t.k !== 'cf' && t.k !== 'cp'); return (it.status === 'shipped' && pos) || (it.status === 'killed' && !pos); }).length;
    const s6 = clamp(50 + 30 * (avgShip - avgAll) / Math.max(0.5, Math.abs(avgAll)) - 8 * harmful + 4 * goodTests + 2 * Math.min(6, g.research.used), 0, 100);
    const total = Math.round(0.3 * s1 + 0.15 * s2 + 0.15 * s3 + 0.1 * s4 + 0.1 * s5 + 0.2 * s6);
    return { total, arr, target, bm, keepP, harmful, goodTests, parts: [
      { k: 'Annual recurring revenue against the board’s target', v: Math.round(s1), w: 30, d: `$${arr.toFixed(2)}M against a $${target.toFixed(1)}M target` },
      { k: 'Capital efficiency', v: Math.round(s2), w: 15, d: burn > 0 ? `burn multiple ${bm.toFixed(2)} (cash burned per dollar of new ARR)` : 'the business funded its own growth' },
      { k: 'Retention', v: Math.round(s3), w: 15, d: `${(keepP * 100).toFixed(0)}% of paying teams would still be with you after two years at your churn rates` },
      { k: 'Customer satisfaction', v: Math.round(s4), w: 10, d: `NPS ${Math.round(L.nps)} (started at 22)` },
      { k: 'Team and platform health', v: Math.round(s5), w: 10, d: `tech debt ${Math.round(L.debt)} of 100, morale ${Math.round(L.morale)}, ${g.incidents} outage${g.incidents === 1 ? '' : 's'}` },
      { k: 'Product judgement', v: Math.round(s6), w: 20, d: `${shipped.length} items shipped, ${harmful} that did more harm than good, ${goodTests} test${goodTests === 1 ? '' : 's'} acted on correctly` }
    ] };
  }

  const api = { ITEMS, IDX, LIMITS, PRICES, TARGET, NOISE, N_Q, PTS, ENG_COST, OVERHEAD, HIRE_COST, ARR0, REL, ABS, SLOTS, create, apply, isDone, defaultDraft, effects, eventOf, dealsOpen, capacity, remaining, estRemaining, testMode, plan, slots, snapshot, valueOf, primaryKey, score, priceNow, outageRisk };
  window.ProductEngine = api;
})();
