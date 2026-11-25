/* People Lab engine: twelve quarters as head of HR at a 100,000-person Indian IT services firm.
   The market (attrition pressure, wage inflation and client demand) follows the shape of the real FY22–FY24 cycle.
   All randomness flows through g.rng inside create and apply, so a replay rebuilds every quarter exactly. */
(function () {
  'use strict';
  const S = window.SimLab, PDt = window.PeopleData;
  if (!S || !PDt) return;
  const { RNG } = S;
  const { clamp, sum, avg, clone } = S.U;
  const N_Q = 12;
  const BANDS = ['J', 'M', 'S'], KS = ['dig', 'leg'];
  const BN = { J: 'Junior', M: 'Mid-level', S: 'Senior' }, BY = { J: '0–3 years', M: '3–6 years', S: '6+ years' };
  const RATE = { J: 26, M: 48, S: 75 };                 /* $k billed a year per billable person */
  const PAY0 = { J: 8, M: 18, S: 38 };                  /* $k fixed pay a year at the start */
  const PREMK = { dig: 1.1, leg: 0.93 };                /* digital skills earn more */
  const BASE_ATT = { J: 0.105, M: 0.14, S: 0.08 };      /* annual voluntary attrition in a normal market */
  const H0 = { J: 45000, M: 30000, S: 22000 }, T0 = 3000;
  const DIG0 = { J: 0.42, M: 0.45, S: 0.40 };
  const MIX = { J: 0.463, M: 0.312, S: 0.225 };
  const D0 = 82600;
  /* Market pressure on attrition, quarter-on-quarter demand growth and the digital share of demand, shaped on FY22–FY24. */
  const HEAT = [1.15, 1.5, 1.8, 1.95, 1.85, 1.65, 1.35, 1.1, 0.98, 0.94, 0.92, 0.95];
  const GROW = [0.045, 0.055, 0.055, 0.04, 0.035, 0.03, 0.015, -0.005, -0.015, -0.015, -0.005, 0.005];
  const DIGD = [0.46, 0.48, 0.50, 0.52, 0.54, 0.55, 0.56, 0.57, 0.58, 0.59, 0.60, 0.62];
  const PRIOR = [0.09, 0.085, 0.095];                   /* annualised attrition in the three quarters before the game */
  const UMAX = 0.92;
  const LD = {
    basic: { t: 'Basic', cost: 0.1, rs: 0.01, fresh: 0.5, E: -2, ready: 0, csat: -1 },
    standard: { t: 'Standard', cost: 0.2, rs: 0.025, fresh: 0.6, E: 1, ready: 0.05, csat: 0 },
    intensive: { t: 'Intensive', cost: 0.4, rs: 0.05, fresh: 0.75, E: 4, ready: 0.12, csat: 1 }
  };
  /* Work model: remote work keeps people but slows how fast they learn and how close clients feel; offices do the reverse. */
  const WORK = {
    remote: { t: 'Remote-first', E: 3, cost: -6, att: () => 0.94, csat: -2, learn: 0.75, ready: -0.04 },
    hybrid: { t: 'Hybrid', E: 2, cost: 0, att: () => 1, csat: 0, learn: 1, ready: 0 },
    office: { t: 'Office', E: -3, cost: 8, att: h => 1 + 0.08 * h, csat: 1, learn: 1.15, ready: 0.02 }
  };
  const FEE = { M: 3, S: 6 }, SUBC = { J: 20, M: 38, S: 60 };
  const OTHER_FIXED = 100, OTHER_VAR = 0.08, TRAINEE_PAY = 5, TRAIN_COST = 2;
  const FC_ERR = { guided: 0.015, standard: 0.03, expert: 0.05 };
  const nrm = r => RNG.normal(r);
  const lvl = g => S.lvlOf(g);
  const heatOf = q => HEAT[Math.min(N_Q, Math.max(1, q)) - 1];
  const fxIdx = q => PDt.REAL.inr[Math.min(N_Q, Math.max(1, q)) - 1] / PDt.REAL.inr0;
  const mprem = heat => 0.15 + 0.2 * (heat - 1);        /* raise a typical switcher gets */
  const isInc = q => q === 1 || q === 5 || q === 9;
  /* Quarterly growth of market pay: hot digital skills move fastest when the market is hot. */
  const inflOf = (h, b, k) => (0.012 + (k === 'dig' ? 0.025 : 0.006) * (h - 1)) * (b === 'M' ? 1.15 : b === 'J' ? 0.8 : 1);
  function marketInfl(g) { const h = heatOf(g.q), cs = cells(g), hc = sum(cs.map(x => x.c.h)); return sum(cs.map(x => x.c.h * inflOf(h, x.b, x.k))) / Math.max(1, hc); }

  function create(seed, cfg) {
    const c = cfg || {}, difficulty = S.normLevel(c.difficulty), rng = RNG.make(seed);
    const w = {}, mkt = {};
    BANDS.forEach(b => { w[b] = {}; mkt[b] = {}; KS.forEach(k => { const share = k === 'dig' ? DIG0[b] : 1 - DIG0[b]; w[b][k] = { h: H0[b] * share, pay: PAY0[b] * PREMK[k] }; mkt[b][k] = PAY0[b] * PREMK[k]; }); });
    /* demand noise and forecast errors are drawn up front so forecasts and outcomes agree on replay */
    const dn = [], fe = [];
    for (let i = 0; i < N_Q; i++) { dn.push(clamp(nrm(rng), -2, 2) * 0.01); fe.push(clamp(nrm(rng), -2, 2)); }
    const g = { v: 1, seed, cfg: { difficulty }, rng, q: 1, n: N_Q, done: false, w, mkt, T: T0,
      prem: { M: 0, S: 0 }, promDisc: { M: 0, S: 0 }, pipe: [{ due: 1, n: 0 }, { due: 2, n: 2400 }], E: 62, B: 65, csat: 72, board: 65,
      dmult: 1, policy: { counter: false }, mods: [], hist: PRIOR.map(a => ({ ann: a, leavers: 100000 * (1 - Math.pow(1 - a, 0.25)), hc: 100000 })),
      dn, fe, H: [], eventLog: [], fx: { freezeTo: 0, ucapTo: 0, ucap: 1, varcap: null, subcapTo: 0, ldcap: null, deferIncTo: 0, incPending: 0 }, draft: null, lastInc: 0, lastWork: 'hybrid', exitsTotal: 0, revoked: 0, deferred: 0 };
    g.draft = defaultDraft(g);
    return g;
  }
  function defaultDraft(g, prev) {
    const p = prev || {};
    return {
      offers: p.offers != null ? p.offers : 2500, onboard: 'onboard', latM: p.latM != null ? p.latM : 1500, latS: p.latS != null ? p.latS : 600, prem: p.prem != null ? p.prem : 0.25,
      inc: isInc(g.q) ? (g.q === 9 ? 0.06 : 0.08) : 0, digHike: 0, payout: p.payout != null ? p.payout : 1,
      prJ: p.prJ != null ? p.prJ : 0.14, prM: p.prM != null ? p.prM : 0.09, ld: p.ld || 'standard',
      work: p.work || g.lastWork || 'hybrid', sub: p.sub != null ? p.sub : 0.5, exits: 0, event: null
    };
  }

  /* ---------- Helpers shared with the interface ---------- */
  const eventOf = g => (g.q <= N_Q && !g.eventLog.some(x => x.q === g.q) ? PDt.EVENTS[g.q - 1] : null);
  const cells = g => { const out = []; BANDS.forEach(b => KS.forEach(k => out.push({ b, k, c: g.w[b][k], m: g.mkt[b][k] }))); return out; };
  const headcount = g => sum(cells(g).map(x => x.c.h));
  const bandH = (g, b) => g.w[b].dig.h + g.w[b].leg.h;
  const digShare = (g, b) => (b ? g.w[b].dig.h / Math.max(1, bandH(g, b)) : sum(BANDS.map(x => g.w[x].dig.h)) / Math.max(1, headcount(g)));
  const payRatio = (g, b, k) => g.w[b][k].pay / g.mkt[b][k];
  const avgRatio = g => { const cs = cells(g), hc = sum(cs.map(x => x.c.h)); return sum(cs.map(x => x.c.h * x.c.pay / x.m)) / Math.max(1, hc); };
  /* Demand the market offers a firm like yours, before any clients you have lost. */
  function demandBase(g, q) {
    let D = D0; for (let i = 0; i < q; i++) D *= 1 + GROW[i];
    return D * (1 + g.dn[q - 1]);
  }
  const demandAt = (g, q) => demandBase(g, q) * g.dmult * (1 + (g.csat - 72) / 400);
  function forecast(g) {
    const q = g.q, D = demandAt(g, q), e = FC_ERR[g.cfg.difficulty];
    return { mid: D * (1 + e * g.fe[q - 1]), lo: D * (1 + e * g.fe[q - 1] - 1.6 * e), hi: D * (1 + e * g.fe[q - 1] + 1.6 * e), dig: DIGD[q - 1], err: e };
  }
  const pipeDue = (g, q) => sum(g.pipe.filter(p => p.due === q).map(p => p.n));
  const pipeTotal = g => sum(g.pipe.map(p => p.n));
  function accRate(g) { const h = heatOf(g.q); return clamp(0.5 + 0.35 * (g.B - 60) / 40 - 0.08 * (h - 1), 0.25, 0.92); }
  function latFill(g, prem) { const h = heatOf(g.q); return clamp(0.95 - 0.2 * (h - 1) + 2.5 * (prem - mprem(h)), 0.05, 1) * clamp(0.9 + (g.B - 60) / 200, 0.7, 1.1); }
  function attrMult(g, b, k) { let m = 1; g.mods.forEach(x => { if (x.to >= g.q && (x.band === 'all' || x.band === b) && (x.k === 'all' || x.k === k)) m *= x.mult; }); return m; }
  /* Annualised voluntary attrition for one group of staff under the settings in d. */
  function annAttr(g, b, k, d, Eoverride) {
    const h = heatOf(g.q), c = g.w[b][k];
    const pay = c.pay * (1 + (d && isInc(g.q) && g.fx.deferIncTo < g.q ? (+d.inc || 0) * (d.incShare || 1) : 0) + (d && k === 'dig' ? +d.digHike || 0 : 0));
    const r = pay / g.mkt[b][k];
    const E = Eoverride != null ? Eoverride : g.E;
    const pr = d ? (b === 'J' ? (+d.prJ - 0.12) : b === 'M' ? (+d.prM - 0.08) : 0) : 0;
    const work = WORK[(d && d.work) || g.lastWork] || WORK.hybrid;
    const burn = Math.exp(4 * Math.max(0, (g.lastUtil || 0.86) - 0.87));
    let a = BASE_ATT[b] * h * (k === 'dig' ? 1 + 0.15 * Math.max(0, h - 1) : 0.9) * Math.exp(-5 * (r - 1)) * Math.exp(-(E - 60) / 45) * work.att(h) * Math.exp(-2.5 * clamp(pr, -0.1, 0.06)) * burn * attrMult(g, b, k);
    return clamp(a, 0.02, 0.8);
  }
  function previewAttr(g, d) {
    const cs = cells(g), hc = sum(cs.map(x => x.c.h));
    return sum(cs.map(x => x.c.h * annAttr(g, x.b, x.k, d))) / Math.max(1, hc);
  }
  function ltm(g) { const L = g.hist.slice(-4); return sum(L.map(x => x.leavers)) / Math.max(1, avg(L.map(x => x.hc))) * 4 / Math.max(1, L.length); }

  /* ---------- A quarter ---------- */
  function apply(g, d) {
    if (g.done || !d) return;
    const r = g.rng, q = g.q, h = heatOf(q), L = g.cfg.difficulty, ev = eventOf(g);
    const one = { cost: 0, E: 0, B: 0, csat: 0, board: 0, notes: [] };
    const dd = Object.assign({}, d);
    /* event */
    if (ev) {
      const opt = ev.opts.find(o => o.v === d.event) || ev.opts[ev.opts.length - 1], fx = opt.fx || {};
      one.cost += fx.cost || 0; one.E += fx.E || 0; one.B += fx.brand || 0; one.csat += fx.csat || 0; one.board += fx.board || 0;
      if (fx.attr) g.mods.push({ band: fx.attr.band, k: fx.attr.k, mult: fx.attr.mult, to: q + fx.attr.n - 1 });
      if (fx.counter) g.policy.counter = true;
      if (fx.hike) cells(g).forEach(x => { if (fx.hike.all) x.c.pay *= 1 + fx.hike.all; if (fx.hike.dig && x.k === 'dig') x.c.pay *= 1 + fx.hike.dig; });
      if (fx.ucap) { g.fx.ucap = fx.ucap; g.fx.ucapTo = q + (fx.n || 1) - 1; }
      if (fx.demand) g.dmult *= 1 + fx.demand;
      if (fx.varcap) g.fx.varcap = { v: fx.varcap, q };
      if (fx.subcut) g.fx.subcapTo = q + 2;
      if (fx.exits) { exitPeople(g, fx.exits, true); one.notes.push(`${fx.exits} people dismissed`); }
      if (fx.exitsPct) { const n = Math.round(headcount(g) * fx.exitsPct); exitPeople(g, n, false); one.cost += n * 0.25 * 20 / 1000; g.exitsTotal += n; one.notes.push(`${n.toLocaleString('en-US')} performance exits`); }
      if (fx.deferAll) g.pipe.forEach(p => { if (p.due <= q + 2 && p.n > 0) { p.due += fx.deferAll; g.deferred += p.n; p.n *= 0.8; } });
      if (fx.revoke) g.pipe.forEach(p => { if (p.due <= q + 2) { g.revoked += p.n * fx.revoke; p.n *= 1 - fx.revoke; } });
      if (fx.reskill) BANDS.forEach(b => { const mv = g.w[b].leg.h * fx.reskill; g.w[b].leg.h -= mv; g.w[b].dig.h += mv; g.w[b].dig.pay = (g.w[b].dig.pay * (g.w[b].dig.h - mv) + g.w[b].leg.pay * 1.05 * mv) / Math.max(1, g.w[b].dig.h); });
      if (fx.freeze) g.fx.freezeTo = q + fx.freeze - 1;
      if (fx.deferInc) g.fx.deferIncTo = q + fx.deferInc - 1;
      if (fx.incShare) dd.incShare = fx.incShare;
      if (fx.work) dd.work = fx.work;
      if (fx.ldcap) g.fx.ldcap = fx.ldcap;
      if (fx.aiHire) { g.w.S.dig.h += fx.aiHire; g.prem.S += fx.aiHire * g.mkt.S.dig * 0.6; }
      g.eventLog.push({ q, id: ev.id, choice: opt.v });
    }
    /* board pressure: a very unhappy board freezes hiring for a quarter */
    const boardFreeze = g.board < 30;
    /* pay: annual increment (possibly deferred), digital hike, market wage inflation */
    let incApplied = 0;
    if (isInc(q)) { if (g.fx.deferIncTo >= q) g.fx.incPending = clamp(+dd.inc || 0, 0, 0.2) * (dd.incShare || 1); else incApplied = clamp(+dd.inc || 0, 0, 0.2) * (dd.incShare || 1); }
    if (!isInc(q) && g.fx.incPending && g.fx.deferIncTo < q) { incApplied = g.fx.incPending; g.fx.incPending = 0; }
    const digHike = clamp(+dd.digHike || 0, 0, 0.2);
    cells(g).forEach(x => { x.c.pay *= (1 + incApplied) * (x.k === 'dig' ? 1 + digHike : 1); });
    BANDS.forEach(b => KS.forEach(k => { g.mkt[b][k] *= 1 + inflOf(h, b, k); }));
    if (incApplied > 0) { g.lastInc = incApplied; one.E += incApplied > 0.08 ? 3 : incApplied > 0.05 ? 1 : -2; }
    if (isInc(q) && incApplied === 0 && g.fx.deferIncTo < q) one.E -= 6;
    if (digHike > 0) one.E += digHike >= 0.08 ? 1 : 0;
    /* work model */
    const work = WORK[dd.work] ? dd.work : g.lastWork;
    if (work !== g.lastWork) { one.E -= 2; if (work === 'office') one.B -= 2; }
    /* L&D */
    const ld = g.fx.ldcap && dd.ld === 'intensive' ? 'standard' : (LD[dd.ld] ? dd.ld : 'standard');
    /* freshers: pipeline attrition, the batch due now, trainees graduating */
    const renege = clamp(0.03 * h, 0.02, 0.08);
    g.pipe.forEach(p => { if (p.due > q) p.n *= 1 - renege; });
    const grads = g.T; g.T = 0;
    const gradDig = LD[ld].fresh;
    if (grads > 0) { const jd = g.w.J.dig, jl = g.w.J.leg, nd = grads * gradDig, nl = grads - nd; jd.pay = (jd.pay * jd.h + nd * g.mkt.J.dig * 0.9) / Math.max(1, jd.h + nd); jd.h += nd; jl.pay = (jl.pay * jl.h + nl * g.mkt.J.leg * 0.9) / Math.max(1, jl.h + nl); jl.h += nl; }
    let joined = 0, deferredNow = 0;
    g.pipe.forEach(p => { if (p.due === q && p.n > 0) { if (dd.onboard === 'defer') { p.due = q + 1; deferredNow += p.n; p.n *= 0.85; one.B -= 5; } else { joined += p.n; p.n = 0; } } });
    g.deferred += deferredNow;
    g.T = joined;
    /* new offers */
    const offers = boardFreeze ? 0 : clamp(Math.round(+dd.offers || 0), 0, 12000);
    const acc = accRate(g), accepted = offers * acc;
    if (accepted > 0) g.pipe.push({ due: q + 2, n: accepted, offered: offers, q });
    g.pipe = g.pipe.filter(p => p.n > 0.5 || p.due > q);
    /* laterals */
    const frozen = boardFreeze || g.fx.freezeTo >= q;
    const prem = clamp(+dd.prem || 0, 0, 0.6), fill = latFill(g, prem);
    const latM = frozen ? 0 : clamp(Math.round(+dd.latM || 0), 0, 6000) * fill, latS = frozen ? 0 : clamp(Math.round(+dd.latS || 0), 0, 2500) * fill;
    [['M', latM], ['S', latS]].forEach(([b, n]) => { if (n <= 0) return; const c = g.w[b].dig, payIn = g.mkt[b].dig * (1 + prem); c.pay = (c.pay * c.h + Math.min(payIn, c.pay) * n) / (c.h + n); c.h += n; g.prem[b] += n * Math.max(0, payIn - c.pay); });
    /* promotions */
    const ready = LD[ld].ready + (WORK[WORK[dd.work] ? dd.work : g.lastWork] || WORK.hybrid).ready;
    const prJ = clamp(+dd.prJ || 0, 0.04, 0.35), prM = clamp(+dd.prM || 0, 0.02, 0.2);
    const over = Math.max(0, prJ - (0.12 + ready)) + Math.max(0, prM - (0.08 + ready / 2));
    [['J', 'M', prJ], ['M', 'S', prM]].forEach(([a, b2, pr]) => KS.forEach(k => { const src = g.w[a][k], dst = g.w[b2][k], n = src.h * pr / 4; src.h -= n; dst.h += n; g.promDisc[b2] += n * Math.max(0, dst.pay - src.pay * 1.25); }));
    /* attrition */
    const work0 = g.lastWork; g.lastWork = work;
    const dAttr = Object.assign({}, dd, { work, inc: 0, digHike: 0 });
    let leavers = 0; const leftBy = { J: 0, M: 0, S: 0 }, retained = { n: 0 };
    const hcStart = headcount(g) + g.T;
    cells(g).forEach(x => {
      const a = annAttr(g, x.b, x.k, dAttr) * (g.preview ? 1 : 1 + 0.05 * clamp(nrm(r), -2, 2));
      let n = x.c.h * (1 - Math.pow(1 - a, 0.25));
      if (g.policy.counter && x.b !== 'J') { const keep = n * 0.25; n -= keep; retained.n += keep; g.prem[x.b] += keep * x.c.pay * 0.2; }
      x.c.h -= n; leavers += n; leftBy[x.b] += n;
      if (x.k === 'dig' && g.prem[x.b] != null) g.prem[x.b] *= 1 - n / Math.max(1, x.c.h + n);
    });
    leavers += g.T * 0.02; g.T *= 0.98;
    BANDS.forEach(b => { if (g.promDisc[b] != null) g.promDisc[b] *= 0.88; });
    /* reskilling */
    BANDS.forEach(b => { const mv = g.w[b].leg.h * LD[ld].rs * WORK[work].learn; g.w[b].leg.h -= mv; const dg = g.w[b].dig; dg.pay = (dg.pay * dg.h + g.w[b].leg.pay * 1.05 * mv) / Math.max(1, dg.h + mv); dg.h += mv; });
    /* performance exits chosen this quarter */
    const exN = Math.round(headcount(g) * clamp(+dd.exits || 0, 0, 0.05));
    if (exN > 0) { exitPeople(g, exN, false); g.exitsTotal += exN; one.E -= 300 * (+dd.exits); one.B -= 200 * (+dd.exits); }
    /* demand and delivery */
    const D = demandAt(g, q), dig = DIGD[q - 1];
    const ucap = g.fx.ucapTo >= q ? Math.min(UMAX, g.fx.ucap) : UMAX;
    const subMax = g.fx.subcapTo >= q ? 0.25 : 1, subShare = Math.min(clamp(+dd.sub || 0, 0, 1), subMax), avail = clamp(1.25 - 0.25 * h, 0.6, 1);
    let billable = 0, potential = 0, potential0 = 0, revenue = 0, subs = 0, subCost = 0, unmet = 0, unmetDig = 0;
    const byBand = {};
    const rateIdx = 1 + 0.004 * (q - 1), D0q = demandBase(g, q);
    BANDS.forEach(b => {
      const Db = D * MIX[b], Dd = Db * dig, Dl = Db - Dd;
      potential0 += D0q * MIX[b] * RATE[b] * rateIdx / 4 / 1000;
      const capD = g.w[b].dig.h * ucap, capL = g.w[b].leg.h * ucap;
      const bd = Math.min(Dd, capD), bl = Math.min(Dl, capL + capD - bd);
      const un = Db - bd - bl, sb = un * subShare * avail;
      billable += bd + bl; subs += sb; unmet += un - sb; unmetDig += Dd - bd;
      revenue += (bd + bl + sb) * RATE[b] * rateIdx / 4 / 1000; potential += Db * RATE[b] * rateIdx / 4 / 1000;
      subCost += sb * SUBC[b] * (0.85 + 0.15 * h) / 4 / 1000;
      byBand[b] = { D: Db, billable: bd + bl, util: (bd + bl) / Math.max(1, bandH(g, b)), unmet: un - sb, subs: sb };
    });
    const hc = headcount(g), util = billable / Math.max(1, hc), bench = 1 - util;
    /* costs ($M a quarter); pay and most overheads are in rupees, so a weaker rupee lowers their dollar cost */
    const fxi = fxIdx(q);
    const payroll = (sum(cells(g).map(x => x.c.h * x.c.pay)) / 4 / 1000 + (g.prem.M + g.prem.S) / 4 / 1000 - (g.promDisc.M + g.promDisc.S) / 4 / 1000) / fxi;
    const trainee = (g.T * TRAINEE_PAY / 4 / 1000 + joined * TRAIN_COST / 1000) / fxi;
    const varPay = payroll * 0.1 * (g.fx.varcap && g.fx.varcap.q === q ? Math.min(g.fx.varcap.v, +dd.payout || 1) : clamp(+dd.payout || 1, 0.5, 1));
    const payoutEff = g.fx.varcap && g.fx.varcap.q === q ? Math.min(g.fx.varcap.v, +dd.payout || 1) : clamp(+dd.payout || 1, 0.5, 1);
    const hiring = (latM * FEE.M + latS * FEE.S) / 1000 / fxi;
    const ldCost = (hc + g.T) * LD[ld].cost / 1000 / fxi;
    const other = (OTHER_FIXED + WORK[work].cost) / fxi + OTHER_VAR * revenue;
    const severance = exN * 0.25 * 20 / 1000 / fxi;
    const costs = payroll + trainee + varPay + hiring + ldCost + subCost + other + severance + one.cost;
    const profit = revenue - costs, margin = profit / Math.max(1, revenue);
    /* attrition record */
    const hcAvg = (hcStart + hc + g.T) / 2;
    const ann = 1 - Math.pow(1 - leavers / Math.max(1, hcAvg), 4);
    g.hist.push({ ann, leavers, hc: hcAvg });
    const ltmNow = ltm(g);
    /* engagement */
    const comp = (g.prem.M + g.prem.S) / Math.max(1, sum(cells(g).map(x => x.c.h * x.c.pay)));
    const Et = 60 + 60 * (avgRatio(g) - 1) + 35 * (clamp(prJ - 0.12, -0.1, 0.06) + clamp(prM - 0.08, -0.06, 0.04)) - 40 * over + LD[ld].E + WORK[work].E - 90 * Math.max(0, util - 0.87) - 30 * Math.max(0, bench - 0.2) - 60 * comp - 15 * (1 - payoutEff) - (g.policy.counter ? 2 : 0);
    g.E = clamp(g.E + 0.4 * (Et - g.E) + one.E, 10, 95);
    /* employer brand */
    const Bt = 62 + 0.25 * (g.E - 60) + 30 * (avgRatio(g) - 1) + (ld === 'intensive' ? 3 : ld === 'basic' ? -2 : 0);
    g.B = clamp(g.B + 0.25 * (Bt - g.B) + one.B, 5, 95);
    /* client satisfaction; demand you cannot staff for long goes to rivals for good */
    const unmetShare = unmet / Math.max(1, D);
    const lost = 0.25 * Math.max(0, unmetShare - 0.03);
    g.dmult *= 1 - lost;
    g.lastUtil = util;
    const Ct = 72 - 120 * unmetShare - 40 * Math.max(0, ann - 0.15) - 60 * over + LD[ld].csat + WORK[work].csat - 30 * Math.max(0, util - 0.9) - 15 * subs / Math.max(1, D);
    g.csat = clamp(g.csat + 0.35 * (Ct - g.csat) + one.csat, 20, 95);
    /* board: drifts towards a level set by the margin and client satisfaction */
    const boardT = clamp(60 + 6 * (margin * 100 - 21) + 0.4 * (g.csat - 65), 0, 100);
    g.board = clamp(g.board + 0.35 * (boardT - g.board) + one.board, 0, 100);
    /* exit-interview reasons (shares of leavers) */
    const why = exitReasons(g, dAttr, util);
    g.H.push({ q, D, D0: D0q, billable, potential, potential0, lostClients: lost, dmult: g.dmult, revenue, costs, profit, margin, payroll, varPay, trainee, hiring, ldCost, subCost, other, severance, oneOff: one.cost,
      hc, T: g.T, J: bandH(g, 'J'), M: bandH(g, 'M'), S: bandH(g, 'S'), dig: digShare(g), digD: dig, util, bench, unmet, unmetDig, subs, byBand,
      leavers, ann, ltm: ltmNow, joined, offers, accepted, latM, latS, fill, exits: exN + (ev && ev.opts.find(o => o.v === d.event) && (ev.opts.find(o => o.v === d.event).fx.exits || 0) || 0),
      E: g.E, B: g.B, csat: g.csat, board: g.board, ratio: avgRatio(g), ratioBy: { J: avgPay(g, 'J'), M: avgPay(g, 'M'), S: avgPay(g, 'S') }, inc: incApplied, digHike, work, ld, prJ, prM, payout: payoutEff, sub: subShare,
      pipe: pipeTotal(g), retained: retained.n, frozen, boardFreeze, deferredNow, why, heat: h, inr: PDt.REAL.inr[q - 1], mktIdx: mktIndex(g), prem: prem, notes: one.notes });
    if (q >= N_Q) { g.done = true; g.q = N_Q + 1; g.draft = null; return; }
    g.q++;
    g.draft = defaultDraft(g, Object.assign({}, d, { work }));
    void L; void work0;
  }
  function mktIndex(g) { const cs = cells(g), hc = sum(cs.map(x => x.c.h)); return sum(cs.map(x => x.c.h * x.m / (PAY0[x.b] * PREMK[x.k]))) / Math.max(1, hc); }
  function avgPay(g, b) { const d = g.w[b].dig, l = g.w[b].leg; return (d.h * d.pay / g.mkt[b].dig + l.h * l.pay / g.mkt[b].leg) / Math.max(1, d.h + l.h); }
  function exitPeople(g, n, digital) {
    let left = n;
    const order = digital ? [['M', 'dig'], ['J', 'dig'], ['S', 'dig']] : [['J', 'leg'], ['M', 'leg'], ['S', 'leg'], ['J', 'dig'], ['M', 'dig'], ['S', 'dig']];
    order.forEach(([b, k]) => { if (left <= 0) return; const c = g.w[b][k], take = Math.min(left, c.h * 0.3); c.h -= take; left -= take; });
  }
  function exitReasons(g, d, util) {
    const h = heatOf(g.q), r = avgRatio(g);
    const w = { pay: Math.max(0.05, 1.2 * Math.max(0, 1.02 - r) * 10 + 0.15 * h), growth: Math.max(0.05, 0.35 - 1.5 * ((+d.prJ - 0.12) + (+d.prM - 0.08))), manager: 0.18, flexibility: d.work === 'office' ? 0.35 : d.work === 'hybrid' ? 0.12 : 0.06, workload: Math.max(0.03, 3 * Math.max(0, util - 0.84)), onsite: 0.12 * Math.min(1.5, h) };
    const t = sum(Object.values(w)); const out = {}; Object.keys(w).forEach(k => { out[k] = w[k] / t; });
    return out;
  }
  const isDone = g => !!g.done;
  /* A dry run of the quarter on a copy of the game, with demand at the forecast and no attrition noise, so previews never leak the outcome. */
  function preview(g, d) {
    if (g.done || !d) return null;
    const c = clone(g), q = c.q, e = FC_ERR[c.cfg.difficulty];
    c.preview = true;
    c.dn[q - 1] = (1 + c.dn[q - 1]) * (1 + e * c.fe[q - 1]) - 1;
    apply(c, clone(d));
    return c.H[c.H.length - 1];
  }

  /* ---------- Scoring ---------- */
  const PEER_AVG = (avg(PDt.REAL.tcs) + avg(PDt.REAL.infy)) / 2 / 100;
  function score(g) {
    const H = g.H, L = H[H.length - 1]; if (!L) return { total: 0, parts: [] };
    const m = avg(H.map(x => x.margin)), share = sum(H.map(x => x.revenue)) / Math.max(1, sum(H.map(x => x.potential0 || x.potential)));
    const att = avg(H.map(x => x.ltm)), E = avg(H.map(x => x.E)), B = L.B;
    const uDev = avg(H.map(x => Math.abs(x.util - 0.84)));
    const s1 = clamp(60 + 7 * (m * 100 - 22.5), 0, 100);
    const s2 = clamp(100 - 450 * Math.max(0, 0.985 - share), 0, 100);
    const s3 = clamp(50 + 4 * (PEER_AVG - att) * 100, 0, 100);
    const s4 = clamp((E - 35) * 2.5, 0, 100);
    const s5 = clamp((B - 30) * 2, 0, 100) - Math.min(30, g.revoked / 200);
    const s6 = clamp(100 - 450 * uDev - g.exitsTotal / 400, 0, 100);
    const total = Math.round(0.25 * s1 + 0.2 * s2 + 0.15 * s3 + 0.15 * s4 + 0.1 * clamp(s5, 0, 100) + 0.15 * s6);
    return { total, m, share, att, E, B, peer: PEER_AVG, uDev, parts: [
      { k: 'Operating margin', v: Math.round(s1), w: 25, d: `${(m * 100).toFixed(1)}% on average over twelve quarters` },
      { k: 'Client demand served', v: Math.round(s2), w: 20, d: `${(share * 100).toFixed(1)}% of the revenue clients wanted to buy` },
      { k: 'Attrition against peers', v: Math.round(s3), w: 15, d: `${(att * 100).toFixed(1)}% average annual attrition against ${(PEER_AVG * 100).toFixed(1)}% for the two peers` },
      { k: 'Engagement', v: Math.round(s4), w: 15, d: `average engagement ${Math.round(E)} of 100` },
      { k: 'Employer brand', v: Math.round(clamp(s5, 0, 100)), w: 10, d: `brand ${Math.round(B)} of 100 at the end${g.revoked > 0 ? `; ${Math.round(g.revoked).toLocaleString('en-US')} offers withdrawn` : ''}` },
      { k: 'Workforce health', v: Math.round(s6), w: 15, d: `utilisation within ${(uDev * 100).toFixed(1)} points of a healthy 84% on average${g.exitsTotal ? `; ${Math.round(g.exitsTotal).toLocaleString('en-US')} people let go` : ''}` }
    ] };
  }

  window.PeopleEngine = { N_Q, BANDS, KS, BN, BY, RATE, PAY0, PREMK, LD, WORK, HEAT, GROW, DIGD, MIX, UMAX, FC_ERR, PEER_AVG,
    create, apply, isDone, defaultDraft, eventOf, cells, headcount, bandH, digShare, payRatio, avgRatio, avgPay, mktIndex, marketInfl, inflOf, demandAt, demandBase, fxIdx, forecast, pipeDue, pipeTotal, accRate, latFill, mprem, heatOf, isInc, annAttr, previewAttr, preview, ltm, score };
})();
