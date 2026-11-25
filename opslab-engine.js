/* Ops Lab engine: a discrete-event simulation of a four-step, three-station contract factory.
   Deterministic for a given seed and decision list. Time runs in hours; one game day is 24 hours. */
(function (root) {
  'use strict';
  const RNG = {
    make(seed) { return { s: (seed >>> 0) || 1 }; },
    next(r) { r.s = (r.s + 0x6D2B79F5) >>> 0; let t = r.s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; },
    normal(r) { let u = 0, v = 0; while (u === 0) u = RNG.next(r); while (v === 0) v = RNG.next(r); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); },
    poisson(r, lam) { if (lam <= 0) return 0; if (lam > 40) return Math.max(0, Math.round(lam + Math.sqrt(lam) * RNG.normal(r))); const L = Math.exp(-lam); let k = 0, p = 1; do { k++; p *= RNG.next(r); } while (p > L); return k - 1; }
  };
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const sum = a => a.reduce((s, x) => s + x, 0);
  const clone = o => JSON.parse(JSON.stringify(o));

  /* ---------- Factory constants ---------- */
  const START_DAY = 60, CONTROL_END = 240, END_DAY = 300, UNITS = 60;
  const STATIONS = [
    { id: 's1', name: 'Board assembly', short: 'Assembly', buy: 90000 },
    { id: 's2', name: 'Testing', short: 'Testing', buy: 80000 },
    { id: 's3', name: 'Calibration', short: 'Calibration', buy: 100000 }
  ];
  const RETIRE = 10000;
  /* Step 1 assembly at S1, step 2 first test at S2, step 3 calibration at S3, step 4 final test at S2. Hours per lot: setup + per unit. */
  const STEPS = [null, { s: 0, setup: 0.40, unit: 0.025 }, { s: 1, setup: 0.25, unit: 0.020 }, { s: 2, setup: 0.30, unit: 0.050 }, { s: 1, setup: 0.15, unit: 0.010 }];
  const LOTS = [1, 2, 3, 5, 12];
  const CONTRACTS = {
    A: { id: 'A', name: 'Standard', full: 1000, quote: 7, zero: 14 },
    B: { id: 'B', name: 'Priority', full: 1500, quote: 1, zero: 3 },
    C: { id: 'C', name: 'Express', full: 1750, quote: 0.5, zero: 1 }
  };
  const KIT_COST = 400, KIT_FEE = 1200, KIT_LEAD = 4, CASH_RATE = 0.10, LOAN_RATE = 0.20, LOAN_MAX = 300000;
  const INIT = { m: [1, 1, 1], lot: 1, prio: 'fifo', contract: 'A', rop: 24, q: 72 };

  function lambda(g, day) {
    const P = g.peak;
    if (day < 150) return 3 + (P - 3) * day / 150;
    if (day < 220) return P;
    return P - (P - g.tail) * Math.min(1, (day - 220) / 80);
  }
  const procHours = (step, units) => STEPS[step].setup + STEPS[step].unit * units;
  function stationLoad(lots) { const u = UNITS / lots; return [lots * procHours(1, u), lots * (procHours(2, u) + procHours(4, u)), lots * procHours(3, u)]; }
  function capacity(m, lots) { const L = stationLoad(lots); return L.map((h, s) => (m[s] * 24) / h); }
  function pay(cid, lt) { const c = CONTRACTS[cid]; if (lt <= c.quote) return c.full; if (lt >= c.zero) return 0; return c.full * (c.zero - lt) / (c.zero - c.quote); }

  /* ---------- Event heap ---------- */
  function hpush(h, e) { h.push(e); let i = h.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (less(h[i], h[p])) { const t = h[i]; h[i] = h[p]; h[p] = t; i = p; } else break; } }
  function hpop(h) { const top = h[0], last = h.pop(); if (h.length) { h[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < h.length && less(h[l], h[m])) m = l; if (r < h.length && less(h[r], h[m])) m = r; if (m === i) break; const t = h[i]; h[i] = h[m]; h[m] = t; i = m; } } return top; }
  const less = (a, b) => a.t < b.t || (a.t === b.t && a.q < b.q);

  /* ---------- Setup ---------- */
  function create(seed, config) {
    const cfg = config || {};
    const rA = RNG.make(seed), rP = RNG.make((seed ^ 0x9E3779B9) >>> 0);
    const peak = 12 + 2 * RNG.next(rA), tail = 6 + 2 * RNG.next(rA);
    const g = { v: 1, seed, cfg: { difficulty: (['guided', 'standard', 'expert'].indexOf(cfg.difficulty) >= 0 ? cfg.difficulty : 'guided') }, peak, tail, t: 0, q: 0,
      rP, set: clone(INIT), mach: [[], [], []], queue: [[], [], []], waitKits: [], jobs: {}, nextJob: 1,
      kits: 72, onOrder: [], cash: 40000, loan: 0, heap: [], days: [], log: [], dayAcc: null, busy: [{}, {}, {}],
      tot: { rev: 0, kitsBought: 0, fees: 0, interest: 0, loanInt: 0, machines: 0, sold: 0, done: 0, lt: 0, max: 0, arrivals: 0 }, skipNote: -1, draft: null };
    for (let s = 0; s < 3; s++) for (let k = 0; k < INIT.m[s]; k++) g.mach[s].push({ lot: null, until: 0, ret: false });
    // arrivals for the whole horizon, generated up front so every policy faces the same orders
    const arr = [];
    for (let d = 0; d < END_DAY; d++) { const n = RNG.poisson(rA, lambda(g, d + 0.5)); const ts = []; for (let i = 0; i < n; i++) ts.push((d + RNG.next(rA)) * 24); ts.sort((a, b) => a - b); ts.forEach(t => arr.push(Math.round(t * 1000) / 1000)); }
    g.arrTimes = arr;
    arr.forEach((t, i) => hpush(g.heap, { t, q: g.q++, type: 'arr', i }));
    for (let d = 1; d <= END_DAY; d++) hpush(g.heap, { t: d * 24, q: g.q++, type: 'day', d: d - 1 });
    g.dayAcc = newAcc();
    runUntil(g, START_DAY * 24);
    g.log.push({ day: START_DAY, kind: 'start', msg: 'You take over the plant on day 60.' });
    g.draft = defaultDraft(g);
    return g;
  }
  function newAcc() { return { arr: 0, done: 0, lt: 0, rev: 0, onTime: 0, starve: 0, ltMax: 0 }; }
  const day = g => Math.floor(g.t / 24 + 1e-9);

  /* ---------- Core simulation ---------- */
  function noise(g) { return clamp(Math.exp(0.12 * RNG.normal(g.rP)), 0.75, 1.4); }
  function addBusy(g, s, t0, dur) {
    let t = t0, left = dur;
    while (left > 1e-9) { const d = Math.floor(t / 24 + 1e-9), end = (d + 1) * 24, take = Math.min(left, end - t); g.busy[s][d] = (g.busy[s][d] || 0) + take; t += take; left -= take; }
  }
  function pickLot(g, s) {
    const Q = g.queue[s]; if (!Q.length) return -1;
    if (s !== 1 || g.set.prio === 'fifo') return 0;
    const want = g.set.prio === 'test' ? 2 : 4;
    const i = Q.findIndex(l => l.step === want);
    return i >= 0 ? i : 0;
  }
  function dispatch(g, s) {
    const ms = g.mach[s];
    for (let k = 0; k < ms.length; k++) {
      const m = ms[k];
      if (m.lot || m.ret) continue;
      const i = pickLot(g, s); if (i < 0) return;
      const lot = g.queue[s].splice(i, 1)[0];
      const dur = procHours(lot.step, lot.units) * noise(g);
      m.lot = lot; m.until = g.t + dur;
      addBusy(g, s, g.t, dur);
      hpush(g.heap, { t: g.t + dur, q: g.q++, type: 'fin', s, k: m.id != null ? m.id : (m.id = g.q) });
    }
  }
  function enqueue(g, lot) { g.queue[STEPS[lot.step].s].push(lot); }
  function release(g, job) {
    g.kits--;
    const L = g.set.lot, u = UNITS / L;
    job.lots = L; job.rel = g.t;
    for (let i = 0; i < L; i++) enqueue(g, { job: job.id, step: 1, units: u });
    dispatch(g, 0);
    reorder(g);
  }
  function reorder(g) {
    const pos = g.kits + sum(g.onOrder.map(o => o.qty));
    if (pos > g.set.rop || g.set.q <= 0) return;
    const cost = g.set.q * KIT_COST + KIT_FEE;
    if (g.cash < cost) { const d = day(g); if (g.skipNote !== d) { g.skipNote = d; g.log.push({ day: d, kind: 'cash', msg: `A kit order of ${g.set.q} was skipped: not enough cash.` }); } return; }
    g.cash -= cost; g.tot.kitsBought += g.set.q * KIT_COST; g.tot.fees += KIT_FEE;
    g.onOrder.push({ qty: g.set.q, at: g.t + KIT_LEAD * 24 });
    hpush(g.heap, { t: g.t + KIT_LEAD * 24, q: g.q++, type: 'kit', qty: g.set.q });
  }
  function onArrival(g) {
    const id = g.nextJob++;
    const job = { id, t0: g.t, c: g.set.contract, lots: 0, done: 0 };
    g.jobs[id] = job; g.dayAcc.arr++; g.tot.arrivals++;
    if (g.kits > 0) release(g, job); else { g.waitKits.push(id); reorder(g); }
  }
  function onKit(g, e) {
    const i = g.onOrder.findIndex(o => Math.abs(o.at - g.t) < 1e-6 && o.qty === e.qty);
    if (i >= 0) g.onOrder.splice(i, 1); else if (g.onOrder.length) g.onOrder.shift();
    g.kits += e.qty;
    while (g.kits > 0 && g.waitKits.length) release(g, g.jobs[g.waitKits.shift()]);
    reorder(g);
  }
  function onFinish(g, e) {
    const ms = g.mach[e.s], m = ms.find(x => x.id === e.k);
    if (!m || !m.lot) return;
    const lot = m.lot; m.lot = null;
    if (m.ret) ms.splice(ms.indexOf(m), 1);
    if (lot.step < 4) { lot.step++; enqueue(g, lot); dispatch(g, STEPS[lot.step].s); }
    else {
      const job = g.jobs[lot.job]; job.done++;
      if (job.done >= job.lots) {
        const lt = (g.t - job.t0) / 24, p = pay(job.c, lt);
        g.cash += p; g.tot.rev += p; g.tot.done++; g.tot.lt += lt; g.tot.max += CONTRACTS[job.c].full;
        const a = g.dayAcc; a.done++; a.lt += lt; a.rev += p; a.ltMax = Math.max(a.ltMax, lt); if (lt <= CONTRACTS[job.c].quote) a.onTime++;
        delete g.jobs[lot.job];
      }
    }
    dispatch(g, e.s);
  }
  function onDay(g, d) {
    const a = g.dayAcc;
    const intr = g.cash > 0 ? g.cash * CASH_RATE / 365 : 0, li = g.loan * LOAN_RATE / 365;
    g.cash += intr - li; g.tot.interest += intr; g.tot.loanInt += li;
    if (g.cash < 0) { const need = -g.cash; g.loan += need; g.cash = 0; g.log.push({ day: d, kind: 'loan', msg: `The bank covered a cash shortfall of $${Math.round(need).toLocaleString('en-US')} with a loan.` }); }
    const jobsIn = s => new Set(g.queue[s].map(l => l.job)).size;
    const q2 = g.queue[1];
    const busy = [0, 1, 2].map(s => g.busy[s][d] || 0);
    const mcount = g.mach.map(ms => ms.filter(m => !m.ret).length);
    g.days.push({ d, arr: a.arr, done: a.done, lt: a.done ? a.lt / a.done : null, ltMax: a.done ? a.ltMax : null, rev: a.rev, revJob: a.done ? a.rev / a.done : null, onTime: a.done ? a.onTime / a.done : null,
      q: [jobsIn(0), new Set(q2.filter(l => l.step === 2).map(l => l.job)).size, jobsIn(2), new Set(q2.filter(l => l.step === 4).map(l => l.job)).size], lotsQ: g.queue.map(Q => Q.length),
      util: busy.map((b, s) => (mcount[s] ? Math.min(1, b / (mcount[s] * 24)) : 0)), m: mcount, kits: g.kits, onOrder: sum(g.onOrder.map(o => o.qty)), waitKits: g.waitKits.length,
      wip: Object.keys(g.jobs).length, cash: g.cash, loan: g.loan, contract: g.set.contract, lot: g.set.lot });
    [0, 1, 2].forEach(s => { delete g.busy[s][d]; });
    g.dayAcc = newAcc();
  }
  function runUntil(g, T) {
    while (g.heap.length && g.heap[0].t <= T + 1e-9) {
      const e = hpop(g.heap); g.t = e.t;
      if (e.type === 'arr') onArrival(g);
      else if (e.type === 'fin') onFinish(g, e);
      else if (e.type === 'kit') onKit(g, e);
      else if (e.type === 'day') onDay(g, e.d);
    }
    g.t = Math.max(g.t, T);
  }

  /* ---------- Decisions ---------- */
  function applySettings(g, S, loanDelta) {
    const d = day(g), log = m => g.log.push({ day: d, kind: 'set', msg: m });
    const L = +loanDelta || 0;
    if (L > 0) { const b = Math.min(L, LOAN_MAX - g.loan); if (b > 0) { g.loan += b; g.cash += b; log(`Borrowed $${Math.round(b / 1000)}k at 20% a year.`); } }
    const want = (S.m || g.set.m).map(x => clamp(Math.round(x), 1, 8));
    for (let s = 0; s < 3; s++) {
      const act = g.mach[s].filter(m => !m.ret);
      if (want[s] > act.length) {
        const n = want[s] - act.length, cost = n * STATIONS[s].buy;
        if (g.cash + 1e-6 < cost) { log(`Could not buy ${n} ${STATIONS[s].short.toLowerCase()} machine${n > 1 ? 's' : ''}: not enough cash.`); }
        else { for (let i = 0; i < n; i++) g.mach[s].push({ lot: null, until: 0, ret: false, id: g.q++ }); g.cash -= cost; g.tot.machines += cost; log(`Bought ${n} ${STATIONS[s].short.toLowerCase()} machine${n > 1 ? 's' : ''} for $${(cost / 1000).toFixed(0)}k.`); dispatch(g, s); }
      } else if (want[s] < act.length) {
        let n = act.length - want[s]; const idle = act.filter(m => !m.lot), busy = act.filter(m => m.lot);
        const pick = idle.concat(busy).slice(0, n);
        pick.forEach(m => { m.ret = true; if (!m.lot) g.mach[s].splice(g.mach[s].indexOf(m), 1); });
        g.cash += n * RETIRE; g.tot.sold += n * RETIRE; log(`Retired ${n} ${STATIONS[s].short.toLowerCase()} machine${n > 1 ? 's' : ''} for $${(n * RETIRE / 1000).toFixed(0)}k.`);
      }
    }
    if (S.contract && S.contract !== g.set.contract && CONTRACTS[S.contract]) { log(`New orders now on the ${CONTRACTS[S.contract].name} contract.`); g.set.contract = S.contract; }
    if (S.lot && S.lot !== g.set.lot && LOTS.indexOf(+S.lot) >= 0) { log(`Lot size changed to ${S.lot} lot${S.lot > 1 ? 's' : ''} of ${UNITS / S.lot} units.`); g.set.lot = +S.lot; }
    if (S.prio && S.prio !== g.set.prio) { log(`Testing priority set to ${S.prio === 'fifo' ? 'first in, first out' : S.prio === 'test' ? 'first tests first' : 'final tests first'}.`); g.set.prio = S.prio; }
    const rop = clamp(Math.round(+S.rop), 0, 2000), q = clamp(Math.round(+S.q), 0, 3000);
    if (isFinite(rop) && rop !== g.set.rop || isFinite(q) && q !== g.set.q) { log(`Kit policy: reorder at ${rop}, order ${q}.`); g.set.rop = isFinite(rop) ? rop : g.set.rop; g.set.q = isFinite(q) ? q : g.set.q; }
    g.set.m = g.mach.map(ms => ms.filter(m => !m.ret).length);
    if (L < 0) { const r = Math.min(-L, g.loan, Math.max(0, g.cash)); if (r > 0) { g.loan -= r; g.cash -= r; log(`Repaid $${Math.round(r / 1000)}k of the loan.`); } }
    dispatch(g, 0); dispatch(g, 1); dispatch(g, 2);
    reorder(g);
  }
  function apply(g, d) {
    if (isDone(g)) return;
    applySettings(g, d.set || {}, d.loan || 0);
    const now = day(g);
    let to = now >= CONTROL_END ? END_DAY : Math.min(CONTROL_END, now + clamp(Math.round(+d.days || 1), 1, END_DAY));
    runUntil(g, to * 24);
    if (to >= END_DAY) g.log.push({ day: END_DAY, kind: 'end', msg: 'The contract ended on day 300.' });
    g.draft = isDone(g) ? null : defaultDraft(g);
  }
  function defaultDraft(g) { return { set: clone(g.set), loan: 0, days: 7 }; }
  const isDone = g => g.t >= END_DAY * 24 - 1e-6;

  /* ---------- Helpers for the interface ---------- */
  function purchaseCost(g, S) {
    let c = 0;
    for (let s = 0; s < 3; s++) { const cur = g.set.m[s], w = clamp(Math.round(S.m[s]), 1, 8); c += w > cur ? (w - cur) * STATIONS[s].buy : -(cur - w) * RETIRE; }
    return c;
  }
  function recent(g, n) { const D = g.days.slice(-n); return D; }
  function demandRate(g, n) { const D = recent(g, n || 7); return D.length ? sum(D.map(x => x.arr)) / D.length : 0; }
  function forecast(g, dayN) { return lambda(g, dayN); }

  /* ---------- Benchmarks ---------- */
  function planDecision(g) {
    const d = day(g);
    const ahead = Math.max(lambda(g, Math.min(END_DAY - 1, d + 12)), lambda(g, d));
    const lots = 1, L = stationLoad(lots);
    const m = [0, 1, 2].map(s => clamp(Math.ceil(ahead * 1.12 * L[s] / (24 * 0.78)), 1, 6));
    const cap = capacity(m, lots), util = cap.map(c => ahead / c);
    let contract = Math.max(...util) < 0.8 ? 'B' : 'A';
    const left = END_DAY - d;
    const rate = Math.max(1, ahead);
    let rop = Math.ceil(rate * KIT_LEAD * 1.35 + 8);
    let q = clamp(Math.round(Math.sqrt(2 * rate * KIT_FEE / (KIT_COST * CASH_RATE / 365)) / 2), 60, 360);
    let rem = 0; for (let x = d; x < END_DAY; x++) rem += lambda(g, x);
    if (rem < g.kits + 40) { rop = 0; q = 0; } else q = Math.min(q, Math.ceil(rem - g.kits));
    if (d >= CONTROL_END - 1) { for (let s = 0; s < 3; s++) m[s] = clamp(Math.ceil(lambda(g, 225) * 1.12 * L[s] / (24 * 0.78)), 1, 6); }
    const S = { m, lot: lots, prio: 'final', contract, rop, q };
    let cost = purchaseCost(g, S), loan = 0;
    if (cost > g.cash - 20000) loan = Math.min(LOAN_MAX - g.loan, cost - g.cash + 30000);
    else if (g.loan > 0 && g.cash > cost + 120000) loan = -Math.min(g.loan, g.cash - cost - 100000);
    if (cost > g.cash + loan) { for (let s = 2; s >= 0; s--) while (S.m[s] > g.set.m[s] && purchaseCost(g, S) > g.cash + loan) S.m[s]--; }
    return { set: S, loan, days: 1 };
  }
  function runPolicy(seed, config, policy) {
    const g = create(seed, config);
    while (!isDone(g)) {
      const dnow = day(g);
      const dec = policy === 'hands-off' ? { set: clone(INIT), loan: 0, days: CONTROL_END - dnow } : planDecision(g);
      if (dnow >= CONTROL_END) dec.toEnd = true;
      apply(g, dec);
    }
    return { cash: g.cash - g.loan, curve: g.days.map(x => x.cash - x.loan), g };
  }
  function benchmarks(g) {
    if (g._bench) return g._bench;
    const a = runPolicy(g.seed, g.cfg, 'hands-off'), b = runPolicy(g.seed, g.cfg, 'plan');
    g._bench = { handsOff: a.cash, plan: b.cash, curves: { handsOff: a.curve, plan: b.curve }, planDays: b.g.days };
    return g._bench;
  }
  function finalValue(g) { return g.cash - g.loan; }
  function score(g) {
    const B = benchmarks(g), v = finalValue(g), lo = B.handsOff, hi = B.plan;
    const s = v <= hi ? 80 * (v - lo) / Math.max(1, hi - lo) : 80 + 20 * (v - hi) / Math.max(1, 0.12 * (hi - lo));
    return Math.round(clamp(s, 0, 100));
  }

  const api = { STATIONS, STEPS, LOTS, CONTRACTS, KIT_COST, KIT_FEE, KIT_LEAD, CASH_RATE, LOAN_RATE, LOAN_MAX, RETIRE, UNITS, START_DAY, CONTROL_END, END_DAY, INIT,
    create, apply, isDone, day, lambda, forecast, procHours, stationLoad, capacity, pay, purchaseCost, demandRate, defaultDraft, benchmarks, score, finalValue, planDecision, runPolicy };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.OpsLabEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
