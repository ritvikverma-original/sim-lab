/* Quick simulations: the short v1 exercises on the new platform. Each saves its whole state after every move. */
(function () {
  'use strict';
  const S = window.SimLab; if (!S) return;
  const { UI, U } = S;
  const QS = { focusLast: false, id: null, metaId: null };
  const MINUS = S.N.MINUS;
  const esc = U.esc;
  const N = Object.assign({}, S.N, { dec: (v, d) => S.N.num(v, d == null ? 1 : d) });
  const grade = S.grade, gradeWord = S.gradeWord;
  const moneyAxis = v => (v < 0 ? MINUS : '') + '$' + Math.abs(v) + 'M';
  const sheet = (eyebrow, title, body, cls) => UI.sheet(eyebrow, title, body, cls);
  const brief = (title, open, body, note) => UI.brief(title, open, body, note);
  const kpis = items => UI.kpis(items);
  const table = (head, a, b) => { const cls = b ? a : '', rows = b || a; return UI.table(head, rows, { cls }); };
  const meter = (label, frac, txt, tone) => UI.meter(label, frac, txt, tone);
  const runBtn = t => `<button class="btn btn-primary btn-block" data-act="m" data-op="run" type="button">${t}</button>`;
  const endButtons = () => `<div class="actions"><button class="btn btn-primary" data-act="new-run" data-module="${QS.id}" type="button">Play again</button>${QS.metaId ? `<button class="btn btn-ghost" data-act="retry-run" data-id="${QS.metaId}" type="button">Replay the same case</button>` : ''}<button class="btn btn-ghost" data-act="leave-run" type="button">Back to home</button></div>`;
  const slider = (id, label, val, min, max, step, fmt, hint) => UI.slider(id, label, val, min, max, step, fmt, hint);
  const stepper = (id, label, val, min, max, step, fmt, hint) => UI.field(label, UI.num(id, val, { min, max, step, dec: String(step).indexOf('.') >= 0 ? String(step).split('.')[1].length : 0, label, wide: true }), hint, id + '-hint');
  const chips = (id, label, opts, val) => UI.chips(id, label, opts, val);
  const chart = (id, specFn, h, legend, label) => UI.chart(id, specFn, h, legend, label);
  function debriefHead(M, score, line) {
    return `<section class="sheet"><header class="sh"><span class="eyebrow">Debrief · ${M.title}</span></header><div class="grade"><span class="letter" aria-label="Grade ${grade(score)}"><span class="hl draw">${grade(score)}</span></span><div class="grade-txt"><span class="h2">${gradeWord(score)}</span><span class="score num">${score} / 100</span></div></div><p class="case">${line}</p></section>`;
  }
  function takeaways(notes, ideas) {
    return sheet('Coach’s notes', 'What to take away', `<ul class="notes">${notes.map(n => `<li>${n}</li>`).join('')}</ul><hr class="rule"><div class="ideas">${ideas.map(i => `<p><strong>${i[0]}</strong> ${i[1]}</p>`).join('')}</div>`);
  }

  /* ---------- Engines (from Sim Lab v1) ---------- */
  const RNG = {
    make(seed){ return { s: (seed >>> 0) || 1 }; },
    next(r){ r.s = (r.s + 0x6D2B79F5) >>> 0; let t = r.s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; },
    normal(r){ let u = 0, v = 0; while (u === 0) u = RNG.next(r); while (v === 0) v = RNG.next(r); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); },
    poisson(r, lam){ if (lam <= 0) return 0; const L = Math.exp(-lam); let k = 0, p = 1; do { k++; p *= RNG.next(r); } while (p > L); return k - 1; },
    expo(r, mean){ return -Math.log(1 - RNG.next(r)) * mean; }
  };
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const sum = a => a.reduce((s, x) => s + x, 0);
  const avg = a => (a.length ? sum(a) / a.length : 0);
  const sdev = a => { const m = avg(a); return Math.sqrt(avg(a.map(x => (x - m) * (x - m)))); };
  
  /* ---------- Brand Manager: segments, positioning, contribution ---------- */
  const MK = {
    periods: 5, survey: 150, lo: 6, hi: 38,
    segDefs: [
      { id: 'budget', name: 'Budget buyers', size: 420, growth: 0.02, perf: 3.5, price: 45, dPerf: 0.15, dPrice: -1, wPerf: 0.8, wPrice: 1.7 },
      { id: 'everyday', name: 'Everyday users', size: 300, growth: 0.06, perf: 6.0, price: 85, dPerf: 0.35, dPrice: 0, wPerf: 1.2, wPrice: 1.0 },
      { id: 'enthusiast', name: 'Enthusiasts', size: 100, growth: 0.18, perf: 8.5, price: 160, dPerf: 0.2, dPrice: 3, wPerf: 1.7, wPrice: 0.45 }
    ],
    brandDefs: [
      { id: 'you', name: 'Pulse', perf: 5, price: 80, aw: 0.35, dist: 0.5, ad: 1000, sales: 900 },
      { id: 'budly', name: 'Budly', home: 'budget', perf: 3.8, price: 44, aw: 0.6, dist: 0.62, ad: 800, sales: 700, prevShare: null },
      { id: 'kivo', name: 'Kivo', home: 'everyday', perf: 6.2, price: 88, aw: 0.5, dist: 0.55, ad: 900, sales: 700, prevShare: null },
      { id: 'orrin', name: 'Orrin', home: 'enthusiast', perf: 8.6, price: 168, aw: 0.42, dist: 0.45, ad: 600, sales: 450, prevShare: null }
    ],
    unitCost(perf){ return 12 + 2.2 * Math.pow(perf, 1.25); },
    appeal(b, s){
      let dp = (b.perf - s.perf) / 1.5; if (dp > 0) dp *= 0.45;
      let dq = (b.price - s.price) / (0.3 * s.price); if (dq < 0) dq *= 0.35;
      return Math.exp(-0.5 * (s.wPerf * dp * dp + s.wPrice * dq * dq));
    },
    awNext(aw, ad){ return aw * 0.7 + (1 - aw * 0.7) * 0.9 * (1 - Math.exp(-ad / 1500)); },
    distNext(ds, sales){ return 0.5 * ds + 0.5 * (0.2 + 0.75 * (1 - Math.exp(-sales / 1000))); },
    init(seed){
      const g = { kind: 'brand', seed, rng: RNG.make(seed), period: 1, done: false, total: 0, knownPeriod: 1,
        segs: MK.segDefs.map(s => ({ ...s })), brands: MK.brandDefs.map(b => ({ ...b })), hist: [], last: null };
      g.known = g.segs.map(s => ({ perf: s.perf, price: s.price }));
      g.draft = { perf: 5, price: 80, ad: 1000, sales: 900, survey: false };
      return g;
    },
    rdCost(g, d){ return 250 * Math.abs(d.perf - g.brands[0].perf); },
    spend(g, d){ return d.ad + d.sales + MK.rdCost(g, d) + (d.survey ? MK.survey : 0); },
    step(g, d){
      const you = g.brands[0];
      const rd = MK.rdCost(g, d);
      you.price = d.price; you.ad = d.ad; you.sales = d.sales;
      for (const b of g.brands){ b.aw = MK.awNext(b.aw, b.ad); b.dist = MK.distNext(b.dist, b.sales); }
      const tot = g.brands.map(() => ({ units: 0, rev: 0, cogs: 0 }));
      const segRes = g.segs.map(s => {
        const U = g.brands.map(b => MK.appeal(b, s) * (0.15 + b.aw) * (0.15 + b.dist));
        const den = 0.06 + sum(U);
        const share = U.map(u => u / den);
        g.brands.forEach((b, i) => { const u = s.size * share[i]; tot[i].units += u; tot[i].rev += u * b.price; tot[i].cogs += u * MK.unitCost(b.perf); });
        return { share, units: share.map(x => x * s.size) };
      });
      const allUnits = sum(tot.map(t => t.units));
      const y = tot[0];
      const gross = y.rev - y.cogs;
      const spend = d.ad + d.sales + rd + (d.survey ? MK.survey : 0);
      const net = gross - spend;
      g.total += net;
      const rec = { period: g.period, perf: you.perf, nextPerf: d.perf, price: d.price, ad: d.ad, sales: d.sales, rd, survey: !!d.survey,
        units: y.units, rev: y.rev, gross, spend, net, share: y.units / allUnits, aw: you.aw, dist: you.dist,
        segShare: segRes.map(r => r.share[0]), segUnits: segRes.map(r => r.units[0]),
        segIdeal: g.segs.map(s => ({ perf: s.perf, price: s.price, size: s.size })),
        rivals: g.brands.slice(1).map((b, i) => ({ perf: b.perf, price: b.price, share: tot[i + 1].units / allUnits })) };
      g.hist.push(rec); g.last = rec;
      g.brands.slice(1).forEach((b, k) => {
        const si = g.segs.findIndex(s => s.id === b.home);
        const sh = segRes[si].share[k + 1];
        if (b.prevShare != null){ if (sh < b.prevShare - 0.03) b.price *= 0.95; else if (sh > b.prevShare + 0.03) b.price *= 1.03; }
        if (MK.appeal(you, g.segs[si]) > 0.6 && you.price < b.price) b.price *= 0.97;
        b.prevShare = sh;
      });
      for (const s of g.segs){ s.perf = clamp(s.perf + s.dPerf, 1, 10); s.price += s.dPrice; s.size *= 1 + s.growth + 0.015 * clamp(RNG.normal(g.rng), -2, 2); }
      g.brands.slice(1).forEach(b => { const s = g.segs.find(x => x.id === b.home); b.perf += 0.5 * (s.perf - b.perf); b.price = Math.round(clamp(b.price, 0.78 * s.price, 1.2 * s.price)); });
      if (d.survey){ g.known = g.segs.map(s => ({ perf: s.perf, price: s.price })); g.knownPeriod = g.period + 1; }
      you.perf = d.perf;
      g.period++;
      if (g.period > MK.periods){ g.done = true; g.period = MK.periods; }
      g.draft = { ...d, survey: false };
    },
    score(g){ return clamp(Math.round(100 * (g.total / 1000 - MK.lo) / (MK.hi - MK.lo)), 0, 100); }
  };
  
  /* ---------- Factory Floor: queueing line with kits and contracts ---------- */
  const FF = {
    days: 100, block: 20, startCash: 150, resale: 15, lo: 100, hi: 370,
    st: [{ name: 'Prep', mean: 2.5, buy: 60 }, { name: 'Test', mean: 4.0, buy: 80 }, { name: 'Pack', mean: 1.5, buy: 40 }],
    contracts: {
      standard: { name: 'Standard', full: 500, quote: 3, zero: 6 },
      priority: { name: 'Priority', full: 650, quote: 1, zero: 2 },
      express: { name: 'Express', full: 800, quote: 0.5, zero: 1 }
    },
    kit: 0.12, fee: 0.8, lead: 2, hold: 0.001,
    lambda(day){ return day < 60 ? 4 + 8 * day / 60 : 12; },
    pay(c, lt){ const k = FF.contracts[c], full = k.full / 1000; if (lt <= k.quote) return full; if (lt >= k.zero) return 0; return full * (k.zero - lt) / (k.zero - k.quote); },
    init(seed){
      const g = { kind: 'factory', seed, rng: RNG.make(seed), hour: 0, done: false, cash: FF.startCash,
        mach: [0, 1, 2].map(() => [{ job: null, rem: 0, ret: false }]),
        q: [[], [], []], wait: [], inv: 40, orders: [], rop: 20, oq: 60, contract: 'standard', nid: 1,
        days: [], blocks: [], last: null, tot: { rev: 0, kits: 0, fees: 0, hold: 0, buy: 0, sold: 0, done: 0, onTime: 0, lt: 0 } };
      for (let s = 0; s < 3; s++) g.q[s].push({ id: g.nid++, t0: -8, c: 'standard' });
      g.draft = { m0: 1, m1: 1, m2: 1, contract: 'standard', rop: 20, oq: 60 };
      return g;
    },
    active(g){ return g.mach.map(ms => ms.filter(m => !m.ret).length); },
    svc(g, s){ const m = FF.st[s].mean; return RNG.expo(g.rng, m / 2) + RNG.expo(g.rng, m / 2); },
    apply(g, d){
      const want = [d.m0, d.m1, d.m2];
      for (let s = 0; s < 3; s++){
        const target = clamp(Math.round(want[s]), 1, 6);
        const act = g.mach[s].filter(x => !x.ret);
        while (act.length < target){ const nm = { job: null, rem: 0, ret: false }; g.mach[s].push(nm); act.push(nm); g.cash -= FF.st[s].buy; g.tot.buy += FF.st[s].buy; }
        while (act.length > target){ let i = act.findIndex(x => !x.job); if (i < 0) i = act.length - 1; act[i].ret = true; act.splice(i, 1); g.cash += FF.resale; g.tot.sold += FF.resale; }
        g.mach[s] = g.mach[s].filter(x => !(x.ret && !x.job));
      }
      g.contract = d.contract; g.rop = d.rop; g.oq = d.oq;
    },
    tick(g, acc){
      const h = g.hour;
      for (const o of g.orders) if (o.at <= h){ g.inv += o.qty; o.done = true; }
      g.orders = g.orders.filter(o => !o.done);
      for (let s = 0; s < 3; s++){
        for (const m of g.mach[s]){
          let cap = 1;
          while (cap > 1e-9){
            if (!m.job){ if (m.ret || !g.q[s].length) break; m.job = g.q[s].shift(); m.rem = FF.svc(g, s); }
            const w = Math.min(cap, m.rem); m.rem -= w; cap -= w; acc.busy[s] += w;
            if (m.rem <= 1e-9){
              const job = m.job; m.job = null;
              if (s < 2) g.q[s + 1].push(job);
              else {
                const lt = (h + 1 - cap - job.t0) / 24, pay = FF.pay(job.c, lt), ok = lt <= FF.contracts[job.c].quote;
                g.cash += pay; g.tot.rev += pay; g.tot.done++; g.tot.lt += lt; if (ok) g.tot.onTime++;
                acc.done++; acc.lt += lt; acc.rev += pay; if (ok) acc.onTime++;
              }
            }
          }
        }
        g.mach[s] = g.mach[s].filter(x => !(x.ret && !x.job));
        acc.mh[s] += g.mach[s].length;
      }
      const n = RNG.poisson(g.rng, FF.lambda(h / 24) / 24);
      for (let i = 0; i < n; i++) g.wait.push({ id: g.nid++, t0: h + RNG.next(g.rng), c: g.contract });
      acc.arr += n;
      while (g.wait.length && g.inv > 0){ g.inv--; g.q[0].push(g.wait.shift()); }
      if (g.wait.length && g.inv === 0) acc.starve++;
      const pos = g.inv + sum(g.orders.map(o => o.qty));
      if (pos <= g.rop && g.oq > 0){ g.cash -= g.oq * FF.kit + FF.fee; g.tot.kits += g.oq * FF.kit; g.tot.fees += FF.fee; g.orders.push({ qty: g.oq, at: h + FF.lead * 24 }); }
      const hc = g.inv * FF.hold / 24; g.cash -= hc; g.tot.hold += hc;
      g.hour++;
    },
    runDay(g){
      const acc = { busy: [0, 0, 0], mh: [0, 0, 0], arr: 0, done: 0, lt: 0, rev: 0, onTime: 0, starve: 0 };
      for (let i = 0; i < 24; i++) FF.tick(g, acc);
      const inMach = g.mach.map(ms => ms.filter(m => m.job).length);
      const queue = g.q.map((q, s) => q.length + inMach[s]);
      g.days.push({ day: g.hour / 24, arr: acc.arr, done: acc.done, lt: acc.done ? acc.lt / acc.done : null, rev: acc.rev, onTime: acc.onTime,
        util: acc.busy.map((b, s) => (acc.mh[s] ? b / acc.mh[s] : 0)), queue, wip: g.wait.length + sum(queue), inv: g.inv, cash: g.cash, starve: acc.starve });
    },
    step(g, d){
      FF.apply(g, d);
      const from = g.days.length, machines = FF.active(g), cashStart = g.cash;
      for (let i = 0; i < FF.block; i++) FF.runDay(g);
      const ds = g.days.slice(from), done = sum(ds.map(x => x.done));
      g.last = { from: from + 1, to: g.days.length, machines, contract: g.contract, rop: g.rop, oq: g.oq,
        util: [0, 1, 2].map(s => avg(ds.map(x => x.util[s]))), arr: sum(ds.map(x => x.arr)), done,
        lt: done ? sum(ds.map(x => (x.lt || 0) * x.done)) / done : null, onTime: done ? sum(ds.map(x => x.onTime)) / done : 0,
        rev: sum(ds.map(x => x.rev)), wip: avg(ds.map(x => x.wip)), starve: sum(ds.map(x => x.starve)), cash: g.cash, cashStart };
      g.blocks.push(g.last);
      if (g.days.length >= FF.days) g.done = true;
      const a = FF.active(g);
      g.draft = { m0: a[0], m1: a[1], m2: a[2], contract: g.contract, rop: g.rop, oq: g.oq };
    },
    score(g){ return clamp(Math.round(100 * (g.cash - FF.lo) / (FF.hi - FF.lo)), 0, 100); }
  };
  
  /* ---------- Supply Chain Relay: four-tier ordering game ---------- */
  const SC = {
    weeks: 24, roles: ['Retailer', 'Wholesaler', 'Distributor', 'Factory'],
    hold: 0.5, back: 1.0, theta: 0.36, alpha: 0.3, beta: 0.35,
    init(seed, role){
      const g = { kind: 'supply', seed, rng: RNG.make(seed), role: role == null ? 1 : role, week: 1, done: false,
        tiers: [0, 1, 2, 3].map(i => ({ inv: 12, back: 0, ship: i < 3 ? [4, 4] : null, E: 4, d: 4, sent: 0, arrived: 0, cost: 0 })),
        orderPipe: [4, 4, 4], prod: [4, 4], H: { orders: [[], [], [], []], net: [[], [], [], []], seen: [[], [], [], []], cost: [[], [], [], []], cust: [] } };
      g.dem = [];
      for (let w = 1; w <= SC.weeks; w++){ const base = w <= 4 ? 4 : 8; g.dem.push(clamp(base + Math.round(RNG.normal(g.rng)), base - 2, base + 2)); }
      SC.prepare(g);
      g.draft = { order: 4 };
      return g;
    },
    prepare(g){
      const w = g.week, T = g.tiers;
      for (let i = 0; i < 3; i++){ const a = T[i].ship.shift(); T[i].inv += a; T[i].arrived = a; }
      { const a = g.prod.shift(); T[3].inv += a; T[3].arrived = a; }
      for (let i = 0; i < 4; i++) T[i].d = i === 0 ? g.dem[w - 1] : g.orderPipe[i - 1];
      for (let i = 0; i < 4; i++){ const need = T[i].back + T[i].d, s = Math.min(T[i].inv, need); T[i].inv -= s; T[i].back = need - s; T[i].sent = s; if (i > 0) T[i - 1].ship.push(s); }
      for (let i = 0; i < 4; i++) T[i].E = SC.theta * T[i].d + (1 - SC.theta) * T[i].E;
    },
    sl(g, i){ const T = g.tiers; return i < 3 ? sum(T[i].ship) + T[i + 1].back : sum(g.prod); },
    bot(g, i){ const T = g.tiers[i]; return Math.max(0, Math.round(T.E + SC.alpha * (12 + SC.beta * 8 - (T.inv - T.back) - SC.beta * SC.sl(g, i)))); },
    smart(g, i, target){ const T = g.tiers[i]; return Math.max(0, Math.round(T.E + 0.5 * (target - (T.inv - T.back)) + 0.5 * (2 * T.E - SC.sl(g, i)))); },
    rules: [(g, i) => g.tiers[i].d, (g, i) => SC.smart(g, i, 6), (g, i) => SC.smart(g, i, 10)],
    commit(g, order){
      const w = g.week, T = g.tiers;
      const O = [0, 1, 2, 3].map(i => (i === g.role ? Math.max(0, Math.round(order)) : SC.bot(g, i)));
      for (let i = 0; i < 3; i++) g.orderPipe[i] = O[i];
      g.prod.push(O[3]);
      T.forEach((t, i) => { const c = SC.hold * t.inv + SC.back * t.back; t.cost += c; g.H.orders[i].push(O[i]); g.H.net[i].push(t.inv - t.back); g.H.seen[i].push(t.d); g.H.cost[i].push(c); });
      g.H.cust.push(g.dem[w - 1]);
      g.week++;
      if (g.week > SC.weeks){ g.done = true; g.week = SC.weeks; } else SC.prepare(g);
    },
    step(g){ SC.commit(g, g.draft.order); },
    bench(seed, role){ return Math.min(...SC.rules.map(rule => { const b = SC.init(seed, role); while (!b.done) SC.commit(b, rule(b, role)); return b.tiers[role].cost; })); },
    score(g){
      g.benchCost = SC.bench(g.seed, g.role);
      return clamp(Math.round(100 * g.benchCost / Math.max(1, g.tiers[g.role].cost)), 0, 100);
    }
  };
  
  /* ---------- Deal Table: four-issue negotiation ---------- */
  const NG = {
    rounds: 6, batna: { you: 3000, them: 3500 }, max: { you: 9400, them: 10000, joint: 13000 },
    issues: [
      { id: 'price', name: 'Price per van', opts: ['$28k', '$29k', '$30k', '$31k', '$32k'], you: [0, 1000, 2000, 3000, 4000], them: [4000, 3000, 2000, 1000, 0] },
      { id: 'delivery', name: 'Delivery', opts: ['4 weeks', '6 weeks', '8 weeks', '10 weeks'], you: [0, 600, 1200, 1800], them: [0, 400, 800, 1200] },
      { id: 'warranty', name: 'Warranty', opts: ['1 year', '2 years', '3 years', '4 years'], you: [2400, 1600, 800, 0], them: [0, 400, 800, 1200] },
      { id: 'payment', name: 'Payment terms', opts: ['Net 30', 'Net 60', 'Net 90', 'Net 120'], you: [1200, 800, 400, 0], them: [0, 1200, 2400, 3600] }
    ],
    pts(side, o){ return NG.issues.reduce((s, is, k) => s + is[side][o[k]], 0); },
    _all: null,
    all(){ if (!NG._all){ const a = []; for (let p = 0; p < 5; p++) for (let d = 0; d < 4; d++) for (let w = 0; w < 4; w++) for (let t = 0; t < 4; t++) a.push([p, d, w, t]); NG._all = a; } return NG._all; },
    asp(r){ return 8600 - (8600 - 4300) * (Math.min(r, NG.rounds) - 1) / (NG.rounds - 1); },
    init(seed){ return { kind: 'deal', seed, rng: RNG.make(seed), round: 1, done: false, log: [], asked: false, shared: null, counter: null, deal: null, walked: false, first: null, confirmWalk: false, draft: { i0: 2, i1: 1, i2: 1, i3: 1 } }; },
    offerOf(d){ return [d.i0, d.i1, d.i2, d.i3]; },
    counter(g, offer, r){
      const asp = NG.asp(r), prev = g.counter; let best = null, bk = null;
      for (const p of NG.all()){
        const tp = NG.pts('them', p); if (tp < asp) continue;
        if (prev && p.some((v, k) => Math.abs(v - offer[k]) > Math.abs(prev[k] - offer[k]))) continue;
        const dist = Math.round(100 * p.reduce((s, v, k) => s + Math.abs(v - offer[k]) / (NG.issues[k].opts.length - 1), 0));
        const key = [dist, tp - asp, g.shared != null ? -NG.issues[g.shared].you[p[g.shared]] : 0];
        if (!bk || key[0] < bk[0] || (key[0] === bk[0] && (key[1] < bk[1] || (key[1] === bk[1] && key[2] < bk[2])))){ best = p; bk = key; }
      }
      return best;
    },
    remark(gap, last){
      if (last) return 'This is as far as we can go. Take it or leave it.';
      if (gap > 4000) return 'That is a long way from anything we could sign. Here is what would work for us.';
      if (gap > 2000) return 'We are still apart, but there is a deal here. How about this?';
      return 'We are close. One more move and we can shake hands.';
    },
    send(g){
      if (g.done || g.round > NG.rounds) return;
      const offer = NG.offerOf(g.draft), r = g.round;
      if (!g.first) g.first = offer.slice();
      g.log.push({ who: 'you', offer, r });
      const tp = NG.pts('them', offer);
      if (tp >= NG.asp(r)){ g.deal = { offer, by: 'you', r }; g.done = true; g.log.push({ who: 'them', text: 'Deal. We can sign on those terms.' }); return; }
      const c = NG.counter(g, offer, r);
      g.counter = c; g.log.push({ who: 'them', offer: c, text: NG.remark(NG.asp(r) - tp, r === NG.rounds), r });
      g.round = r + 1;
    },
    accept(g){ if (!g.counter || g.done) return; g.deal = { offer: g.counter.slice(), by: 'them', r: g.round - 1 }; g.done = true; g.log.push({ who: 'you', text: 'We accept your terms.' }); },
    ask(g){ if (g.asked || g.done) return; g.asked = true; g.log.push({ who: 'you', text: 'What matters most to you in this deal?' }); g.log.push({ who: 'them', text: 'Payment terms, by far. We are a young company and cash is tight. Price matters too. Delivery is flexible: our new depot opens in about ten weeks, so earlier vans would sit in a car park. Warranty is nice to have.' }); },
    share(g, k){ if (g.shared != null || g.done) return; g.shared = k; const nm = NG.issues[k].name.toLowerCase(); g.log.push({ who: 'you', text: `For us, ${nm} is the term that matters most.` }); g.log.push({ who: 'them', text: `Noted. We will keep that in mind on ${nm}.` }); },
    walk(g){ if (g.done) return; g.walked = true; g.done = true; g.log.push({ who: 'you', text: 'We will walk away and sell to our other buyer.' }); },
    result(g){ if (!g.deal) return { you: NG.batna.you, them: NG.batna.them, joint: NG.batna.you + NG.batna.them, impasse: true }; const y = NG.pts('you', g.deal.offer), t = NG.pts('them', g.deal.offer); return { you: y, them: t, joint: y + t, impasse: false }; },
    score(g){ const r = NG.result(g); return clamp(Math.round(60 * r.you / NG.max.you + 40 * r.joint / NG.max.joint), 0, 100); }
  };
  
  /* ---------- Crisis Room: hidden-profile team leadership ---------- */
  const CR = {
    people: [
      { id: 'maya', name: 'Maya', role: 'Quality lead', goal: 'Fix the root cause before normal shipping resumes, and keep the quality team intact.' },
      { id: 'leo', name: 'Leo', role: 'Supply chain', goal: 'Avoid recalling every hub, which would swamp the warehouses.' },
      { id: 'ruth', name: 'Ruth', role: 'General counsel', goal: 'Notify the regulator on time and never speculate about fault in public.' },
      { id: 'sam', name: 'Sam', role: 'Communications', goal: 'Speak publicly, with clear steps, within the first day.' },
      { id: 'nina', name: 'Nina', role: 'Finance', goal: 'Keep the total cost of the crisis under $15M.' }
    ],
    phases: [
      { short: 'First reports', time: 'Hour 1', title: 'Three hubs overheated overnight',
        text: 'Brightnode sells about 600,000 Home Hubs a year. Overnight, support logged three reports of hubs overheating while charging, and one customer has a minor burn. Nothing is public yet. You chair the response team.',
        info: {
          maya: { crit: true, k: 'two of the three units came from battery batch B-17', t: 'Two of the three units come from the same battery batch, B-17. It is early, but that is a pattern.' },
          ruth: { crit: true, k: 'the regulator must hear within 24 hours of a credible risk', t: 'Once we know of a credible safety risk, we have 24 hours to notify the regulator. Waiting a week is not an option.' },
          leo: { t: 'Pausing outbound shipments for a few days is easy. We hold about two weeks of stock.' },
          sam: { t: 'One complaint is on social media with a few thousand views. No press calls yet.' },
          nina: { t: 'Each day of paused shipments costs about $1M in sales.' }
        },
        options: [
          { label: 'Keep shipping and have support collect details for a week.', fx: { safety: -15, rep: -5 }, late: true, out: 'Shipments continue. Two more overheating reports arrive by evening, and the 24-hour notice window passes.' },
          { label: 'Pause shipments, notify the regulator and start lab tests.', fx: { safety: 15, rep: 5, cost: 3 }, out: 'Shipments pause. The regulator logs your notice and asks for lab results within a week.' },
          { label: 'Tell every customer to stop using their hub until further notice.', fx: { safety: 18, rep: -8, cost: 8 }, out: '600,000 customers lose their hubs overnight. Support lines jam, and the story starts trending.' }
        ], best: 1 },
      { short: 'Lab results', time: 'Hour 6', title: 'The lab confirms a fault',
        text: 'Lab tests confirm that some battery cells overheat under fast charging. You need to set the scope of the fix today.',
        info: {
          maya: { crit: true, k: 'only batch B-17 fails the test', t: 'Only batch B-17 fails the stress test. Every other batch passes with a wide margin.' },
          leo: { crit: true, k: 'every B-17 hub can be traced by serial number', t: 'B-17 went into about 42,000 hubs, all shipped to the North and West regions. We can find each one by serial number.' },
          nina: { t: 'A targeted recall costs about $6M. Recalling every hub costs about $40M.' },
          ruth: { t: 'The regulator will accept a targeted recall if we can trace the affected units.' },
          sam: { t: 'Customers keep asking whether their hub is affected. They need a quick way to check.' }
        },
        options: [
          { label: 'Recall all 600,000 hubs.', fx: { safety: 10, rep: -3, cost: 40 }, out: 'The recall is thorough, but warehouses overflow and most returned hubs were never at risk.' },
          { label: 'Recall the 42,000 B-17 hubs by serial number and push a charging fix to the rest.', fx: { safety: 25, rep: 8, cost: 6 }, out: 'Affected owners get a replacement offer. Everyone else gets a safer charging update overnight.' },
          { label: 'Push a software update that slows charging on every hub. No recall.', fx: { safety: -10, rep: -5, cost: 1 }, out: 'The update lowers the risk but leaves faulty cells in 42,000 homes.' }
        ], best: 1 },
      { short: 'Video goes viral', time: 'Hour 12', title: 'A video passes a million views',
        text: 'A video of a smoking hub has passed one million views. Reporters are calling, and the CEO wants your recommendation for a public response.',
        info: {
          sam: { crit: true, k: 'every hour of silence roughly doubles the story’s reach', t: 'Every hour we stay silent, the story’s reach roughly doubles. People want clear steps: am I affected, and what do I do?' },
          ruth: { crit: true, k: 'statements should stress caution and avoid speculating about fault', t: 'Say we are acting out of caution and focus on what customers should do. Do not speculate about who is at fault.' },
          maya: { t: 'The supplier has fixed its process. New cells pass every test.' },
          leo: { t: 'Replacement hubs can ship within five days.' },
          nina: { t: 'A free replacement costs us about $140 a unit. A refund costs $199.' }
        },
        options: [
          { label: 'Hold all statements until the investigation is complete.', fx: { rep: -25, safety: -5 }, out: 'Silence fills with speculation. The comments under the video turn to what Brightnode might be hiding.' },
          { label: 'CEO video: apologise, blame the supplier’s faulty batch and offer refunds.', fx: { rep: 5, cost: 3, trust: -4 }, out: 'The apology lands, but naming the supplier invites a legal fight, and refunds cost more than replacements.' },
          { label: 'CEO video: who is affected, a serial-number checker and free replacements, acting out of caution.', fx: { rep: 20, safety: 5 }, out: 'Customers know exactly what to do. Within hours, the serial checker gets 200,000 visits.' }
        ], best: 2 },
      { short: 'The board', time: 'Day 3', title: 'The board asks about the cost',
        text: 'The board wants to know how Brightnode will absorb the cost this quarter. Analysts are watching the share price.',
        info: {
          nina: { crit: true, k: 'investors accept a clearly explained one-time charge', t: 'Investors shrug off a one-time charge if we explain it clearly. Surprises later are what hurt.' },
          leo: { crit: true, k: 'delaying replacements leaves risky hubs in homes for weeks', t: 'If we delay replacements, risky hubs stay in homes for weeks longer.' },
          maya: { t: 'Cutting my team now would remove the people who caught this in six hours.' },
          sam: { t: 'Customers are watching how fast replacements arrive.' },
          ruth: { t: 'Delays increase our liability if another incident happens.' }
        },
        options: [
          { label: 'Cut the quality team’s budget by 20% to protect margins.', fx: { safety: -10, rep: -5, cost: -2, trust: -8 }, out: 'Margins hold this quarter. Morale in quality drops, and two senior engineers start interviewing elsewhere.' },
          { label: 'Book a one-time charge, brief investors and keep the replacement schedule.', fx: { rep: 5, trust: 4 }, out: 'The share price dips 3% and recovers within a week. Replacements arrive on schedule.' },
          { label: 'Delay replacements to next quarter to spread the cost.', fx: { safety: -20, rep: -15 }, out: 'Risky hubs stay in use. A second incident in the West region makes national news.' }
        ], best: 1 }
    ],
    init(seed){ return { kind: 'crisis', seed, rng: RNG.make(seed), phase: 0, done: false, m: { safety: 50, rep: 60, cost: 0, trust: 50 }, consulted: [], huddle: false, choice: null, choices: [], late: false, goalsMet: null, draft: {} }; },
    heard(g, pid){ return g.huddle || g.consulted.indexOf(pid) >= 0; },
    consult(g, pid){ if (g.choice != null || g.huddle || g.consulted.indexOf(pid) >= 0 || g.consulted.length >= 2) return; g.consulted.push(pid); g.m.trust = clamp(g.m.trust + 2, 0, 100); },
    huddleAll(g){ if (g.choice != null || g.huddle) return; g.huddle = true; g.m.rep = clamp(g.m.rep - 3, 0, 100); g.m.trust = clamp(g.m.trust + 4, 0, 100); },
    choose(g, k){
      if (g.choice != null) return;
      const P = CR.phases[g.phase], o = P.options[k], before = { ...g.m };
      for (const key of Object.keys(o.fx)){ const v = o.fx[key]; g.m[key] = key === 'cost' ? Math.max(0, g.m[key] + v) : clamp(g.m[key] + v, 0, 100); }
      let extra = null;
      if (o.late) g.late = true;
      if (g.phase === 2 && g.late){ g.m.cost += 5; g.m.rep = clamp(g.m.rep - 10, 0, 100); extra = 'The regulator also fines Brightnode $5M for notifying late.'; }
      const crit = Object.keys(P.info).filter(pid => P.info[pid].crit);
      g.choice = k;
      g.choices.push({ phase: g.phase, k, best: P.best, crit, heardCrit: crit.filter(pid => CR.heard(g, pid)), huddle: g.huddle, consulted: g.consulted.slice(), extra,
        delta: { safety: g.m.safety - before.safety, rep: g.m.rep - before.rep, cost: g.m.cost - before.cost, trust: g.m.trust - before.trust } });
    },
    next(g){ if (g.choice == null) return; g.phase++; g.consulted = []; g.huddle = false; g.choice = null; if (g.phase >= CR.phases.length){ g.phase = CR.phases.length - 1; CR.finish(g); } },
    goals(g){ const c = g.choices.map(x => x.k); return { maya: c[0] !== 0 && c[3] !== 0, leo: c[1] !== 0, ruth: c[0] !== 0 && c[2] !== 1 && c[3] !== 2, sam: c[2] !== 0, nina: g.m.cost <= 15 }; },
    finish(g){ const G = CR.goals(g); const met = Object.keys(G).filter(k => G[k]).length; g.m.trust = clamp(g.m.trust + 5 * met - 4 * (5 - met), 0, 100); g.goalsMet = G; g.done = true; },
    process(g){ const tot = sum(g.choices.map(c => c.crit.length)), got = sum(g.choices.map(c => c.heardCrit.length)); return tot ? got / tot : 0; },
    score(g){ const m = g.m; return clamp(Math.round(0.3 * m.safety + 0.25 * m.rep + 0.15 * clamp(100 - 2 * m.cost, 0, 100) + 0.15 * m.trust + 15 * CR.process(g)), 0, 100); }
  };

  /* ---------- Screens (from Sim Lab v1) ---------- */
  const MOD = {};
  MOD.brand = {
    title: 'Brand Manager', area: 'Marketing strategy', length: '5 periods · about 8 min',
    practises: 'Segmentation · positioning · marketing mix',
    blurb: 'Position an earbuds brand on a perceptual map, set its price, and fund awareness and distribution while three rivals defend their segments.',
    init: seed => MK.init(seed),
    progress: g => `Period ${g.period} of ${MK.periods}`,
    step: g => MK.step(g, g.draft),
    score: g => MK.score(g),
    mapSpec(g){ const d = g.draft, you = g.brands[0]; return { type: 'map', segs: g.segs.map((s, i) => ({ name: s.name, perf: g.known[i].perf, price: g.known[i].price, size: s.size })), rivals: g.brands.slice(1).map(b => ({ name: b.name, perf: b.perf, price: b.price })), you: { perf: you.perf, next: d.perf, price: d.price } }; },
    live(g){
      const d = g.draft, you = g.brands[0], uc = MK.unitCost(you.perf);
      return {
        'perf-hint': `Now ${you.perf.toFixed(1)} · R&amp;D cost ${N.k(MK.rdCost(g, d))} · unit cost then ${N.usd(MK.unitCost(d.perf))}`,
        'price-hint': `Unit cost ${N.usd(uc)} · margin ${N.usd(d.price - uc)} a unit (${N.pct((d.price - uc) / d.price)})`,
        'ad-hint': `Awareness ${N.pct(you.aw)} now, about ${N.pct(MK.awNext(you.aw, d.ad))} after this spend`,
        'sales-hint': `Distribution ${N.pct(you.dist)} now, about ${N.pct(MK.distNext(you.dist, d.sales))} after this spend`,
        spend: `Spend this period <strong class="num">${N.k(MK.spend(g, d))}</strong> · contribution so far <strong class="num">${N.m(g.total / 1000, 2)}</strong>`,
        _charts: ['map']
      };
    },
    play(g){
      const d = g.draft, L = g.last, LV = this.live(g);
      let h = brief('Pulse earbuds', !L, `<p>You run marketing for <strong>Pulse</strong>, a wireless-earbuds brand. Pulse scores 5 out of 10 on performance and sells for $80, which leaves it between two customer segments without winning either.</p><p>Three rivals each own a segment: <strong>Budly</strong> (budget), <strong>Kivo</strong> (everyday) and <strong>Orrin</strong> (enthusiasts). Over five periods, choose where Pulse sits, what it costs, and how much you spend on advertising and your salesforce.</p><p>Changing performance costs $250k per point and takes effect next period. Segment ideal points drift every period, and a consumer survey ($150k) shows where they will sit next period. Your score is cumulative net contribution: revenue minus product cost minus everything you spend.</p>`, 'Pick one segment and get close to its ideal point.');
      if (L){
        const P = g.hist.length > 1 ? g.hist[g.hist.length - 2] : null;
        h += sheet(`Results · period ${L.period}`, `${N.m(L.net / 1000, 2)} net contribution`,
          kpis([
            { k: 'Units sold', v: N.int(L.units) + 'k', d: P ? N.sign(L.units - P.units, v => N.int(v) + 'k') : 'First period', cls: P ? (L.units >= P.units ? 'up' : 'down') : '' },
            { k: 'Market share', v: N.pct(L.share, 1), d: P ? N.sign((L.share - P.share) * 100, v => v.toFixed(1) + ' pts') : '', cls: P ? (L.share >= P.share ? 'up' : 'down') : '' },
            { k: 'Revenue', v: N.m(L.rev / 1000, 2) },
            { k: 'Cumulative', v: N.m(g.total / 1000, 2) }
          ]) +
          `<p class="ops">Spend: ads ${N.k(L.ad)} · salesforce ${N.k(L.sales)} · R&amp;D ${N.k(L.rd)}${L.survey ? ` · survey ${N.k(MK.survey)}` : ''}</p>` +
          table(['Segment', 'Your units', 'Your share'], g.segs.map((s, i) => ({ cells: [s.name, N.int(L.segUnits[i]) + 'k', N.pct(L.segShare[i])] }))) +
          table(['Rival', 'Perf.', 'Price now', 'Share'], g.brands.slice(1).map((b, i) => { const dp = b.price - L.rivals[i].price; return { cells: [b.name, b.perf.toFixed(1), N.usd(b.price) + (Math.abs(dp) >= 1 ? ` <span class="${dp < 0 ? 'down' : 'up'}" title="${dp < 0 ? 'Price cut' : 'Price rise'}">${dp < 0 ? '▾' : '▴'}</span>` : ''), N.pct(L.rivals[i].share)] }; })));
      }
      h += sheet(`Market · period ${g.period}`, 'Segments and positions',
        table(['Segment', 'Size', 'Growth', 'Ideal perf.', 'Ideal price'], g.segs.map((s, i) => ({ cells: [s.name, N.int(s.size) + 'k', '+' + Math.round(s.growth * 100) + '%', g.known[i].perf.toFixed(1), N.usd(g.known[i].price)] }))) +
        `<p class="cap">Ideal points from the period ${g.knownPeriod} survey.${g.knownPeriod < g.period ? ' They have probably moved since.' : ''} Sizes are thousands of units a period.</p>` +
        chart('map', () => this.mapSpec(g), 290, [{ t: 'Segment ideal point, sized by segment', c: 'var(--hl)' }, { t: 'Pulse', c: 'var(--pen)' }, { t: 'Rivals', c: 'var(--ink-2)' }], 'Perceptual map of performance against price'));
      h += sheet(`Decisions · period ${g.period}`, 'Your moves', `<div class="fields">${
        slider('perf', 'Performance from next period', d.perf, 1, 10, 0.5, v => v.toFixed(1) + ' / 10', LV['perf-hint'])}${
        slider('price', 'Price', d.price, 20, 220, 5, N.usd, LV['price-hint'])}${
        slider('ad', 'Advertising', d.ad, 0, 3000, 100, N.k, LV['ad-hint'])}${
        slider('sales', 'Salesforce and distribution', d.sales, 0, 2500, 100, N.k, LV['sales-hint'])}${
        chips('survey', 'Consumer survey', [{ v: false, t: 'Skip' }, { v: true, t: 'Buy survey', s: '$150k · next period’s ideal points' }], d.survey)}</div><div class="summary" data-live="spend">${LV.spend}</div>`) +
        runBtn(g.period === MK.periods ? 'Run final period' : `Run period ${g.period}`);
      return h;
    },
    notes(g){
      const H = g.hist, n = [];
      const fit = H.map(x => Math.max(...x.segIdeal.map((si, k) => MK.appeal({ perf: x.perf, price: x.price }, { ...MK.segDefs[k], perf: si.perf, price: si.price }))));
      const units = [0, 1, 2].map(k => sum(H.map(x => x.segUnits[k])));
      const main = units.indexOf(Math.max(...units)), seg = g.segs[main].name.toLowerCase();
      if (avg(fit) < 0.55) n.push('Pulse spent most periods between segments. A product close to one segment’s ideal point beats a compromise.');
      else n.push(`Pulse sat close to the ${seg} ideal point most periods. That focus is what wins share.`);
      const last = H[H.length - 1], li = last.segIdeal[main];
      if (last.perf < li.perf - 0.8) n.push(`By period 5 your performance (${last.perf.toFixed(1)}) trailed what ${seg} wanted (${li.perf.toFixed(1)}).`);
      if (!H.some(x => x.survey)) n.push('You never bought a survey. Everyday users wanted 1.4 more performance points by period 5 than in period 1.');
      if (H.some(x => x.ad >= 2500)) n.push('Advertising above about $2M a period added little awareness. Returns diminish.');
      if (H.some(x => x.price > 1.25 * x.segIdeal[main].price)) n.push(`Your price ran well above what ${seg} expected to pay.`);
      n.push(`You averaged ${N.usd(sum(H.map(x => x.gross)) / Math.max(1, sum(H.map(x => x.units))))} of gross margin per unit sold.`);
      return n.slice(0, 4);
    },
    debrief(g){
      const H = g.hist, best = H.reduce((a, b) => (b.net > a.net ? b : a));
      let h = debriefHead(this, g.score, `Pulse earned ${N.m(g.total / 1000, 1)} in net contribution over five periods.`);
      h += sheet('Results', 'Five periods at a glance', kpis([
        { k: 'Total contribution', v: N.m(g.total / 1000, 1) },
        { k: 'Avg market share', v: N.pct(avg(H.map(x => x.share)), 1) },
        { k: 'Best period', v: 'P' + best.period, d: N.m(best.net / 1000, 2) },
        { k: 'Surveys bought', v: String(H.filter(x => x.survey).length) }
      ]) +
        chart('bnet', () => ({ series: [{ values: H.map(x => x.net / 1000), c: 'var(--s1)', area: true }], xLabel: i => 'P' + (i + 1), yFmt: moneyAxis }), 170, [{ t: 'Net contribution per period', c: 'var(--s1)' }], 'Net contribution per period') +
        chart('bseg', () => ({ series: g.segs.map((sg, k) => ({ values: H.map(x => x.segShare[k] * 100), c: `var(--s${k + 2})` })), xLabel: i => 'P' + (i + 1), yFmt: v => v + '%', yMin: 0 }), 170, g.segs.map((sg, k) => ({ t: `Share of ${sg.name.toLowerCase()}`, c: `var(--s${k + 2})` })), 'Pulse share of each segment') +
        table(['Period', 'Perf.', 'Price', 'Share', 'Contribution'], H.map(x => ({ cells: ['P' + x.period, x.perf.toFixed(1), N.usd(x.price), N.pct(x.share, 1), N.m(x.net / 1000, 2)] }))));
      h += takeaways(this.notes(g), [
        ['Segmentation, targeting, positioning.', 'Choose the segment first, then place the product close to what those customers value.'],
        ['Perceptual maps.', 'They show how customers see each product on the attributes they care about. Ideal points move over time.'],
        ['Contribution.', 'Revenue minus variable cost minus marketing spend. Volume at a thin margin rarely pays.'],
        ['Market research.', 'It costs money, but it shows where demand is heading before rivals react.']
      ]) + endButtons();
      return h;
    }
  };
  
  MOD.factory = {
    title: 'Factory Floor', area: 'Operations', length: '100 days · about 6 min',
    practises: 'Capacity · bottlenecks · service operations',
    blurb: 'Keep a three-step assembly line ahead of rising demand. Buy machines, choose a delivery contract and set reorder rules for parts.',
    init: seed => FF.init(seed),
    progress: g => `Days ${g.days.length + 1}–${g.days.length + FF.block}`,
    step: g => FF.step(g, g.draft),
    score: g => FF.score(g),
    live(g){
      const d = g.draft, cur = FF.active(g), want = [d.m0, d.m1, d.m2];
      let spend = 0; want.forEach((w, s) => { const diff = w - cur[s]; spend += diff > 0 ? diff * FF.st[s].buy : diff * FF.resale; });
      const lam = FF.lambda(Math.min(99, g.days.length + FF.block / 2));
      const hint = s => `${N.k(FF.st[s].buy)} each · about ${(24 / FF.st[s].mean * want[s]).toFixed(1)} jobs a day`;
      return {
        'm0-hint': hint(0), 'm1-hint': hint(1), 'm2-hint': hint(2),
        'rop-hint': `Covers about ${(d.rop / lam).toFixed(1)} days of demand`,
        'oq-hint': `${N.k(d.oq * FF.kit + FF.fee)} an order · lasts about ${(d.oq / lam).toFixed(1)} days`,
        'ff-cash': `Machine changes ${spend > 0 ? N.k(-spend) : spend < 0 ? '+' + N.k(-spend) : '$0k'} · cash after <strong class="num">${N.k(g.cash - spend)}</strong> · demand about ${lam.toFixed(1)} orders a day`
      };
    },
    play(g){
      const d = g.draft, L = g.last, day0 = g.days.length, LV = this.live(g);
      let h = brief('Northgate Assembly', !L, `<p>You run <strong>Northgate Assembly</strong>, a contract line that builds circuit boards in three steps: Prep, Test and Pack. Orders arrive at random, about 4 a day now, rising to about 12 a day by day 60 and staying there.</p>${table(['Station', 'Avg time', 'Per machine', 'Price'], FF.st.map(s => ({ cells: [s.name, s.mean.toFixed(1) + ' h', (24 / s.mean).toFixed(1) + ' jobs/day', N.k(s.buy)] })))}<p>Each order needs one parts kit ($120). Kit orders arrive 2 days after you place them and carry an $800 fee. Holding a kit costs $1 a day. Machines resell for $10k.</p>${table(['Contract', 'Pays', 'Full pay within', 'Nothing after'], Object.keys(FF.contracts).map(k => { const c = FF.contracts[k]; return { cells: [c.name, N.usd(c.full), c.quote + ' days', c.zero + ' days'] }; }))}<p>Every 20 days you can buy or sell machines, switch the contract for new orders and change kit rules. Your score is cash on day 100. You start with $150k.</p>`, 'Find the bottleneck before the queue finds you.');
      if (L){
        const bn = L.util.indexOf(Math.max(...L.util));
        h += sheet(`Results · days ${L.from}–${L.to}`, `${N.k(L.cash)} cash`, kpis([
          { k: 'Orders done', v: N.int(L.done), d: `${N.int(L.arr)} arrived` },
          { k: 'Avg lead time', v: L.lt == null ? '—' : L.lt.toFixed(2) + ' d' },
          { k: 'On time', v: N.pct(L.onTime), cls: L.onTime < 0.7 ? 'down' : '' },
          { k: 'Revenue', v: N.k(L.rev) }
        ]) + `<div class="meters">${FF.st.map((s, i) => meter(`${s.name} × ${L.machines[i]}`, L.util[i], N.pct(L.util[i]), L.util[i] > 0.9 ? 'hot' : L.util[i] > 0.75 ? 'warm' : '')).join('')}</div><p class="cap">Machine utilisation. ${FF.st[bn].name} is the busiest station${L.util[bn] > 0.9 ? ' and is acting as the bottleneck' : ''}.${L.starve ? ` Orders waited ${N.int(L.starve)} hours for parts kits.` : ''}</p>` +
          chart('flt', () => ({ series: [{ values: g.days.map(x => x.lt), c: 'var(--s1)' }], refs: [{ y: FF.contracts[L.contract].quote, label: '', c: 'var(--s2)' }], xLabel: i => 'D' + (i + 1), yFmt: v => v + 'd', yMin: 0 }), 170, [{ t: 'Average lead time each day', c: 'var(--s1)' }, { t: 'Contract target', c: 'var(--s2)' }], 'Lead time by day') +
          chart('fflow', () => ({ series: [{ values: g.days.map(x => x.arr), c: 'var(--s5)', w: 1.5 }, { values: g.days.map(x => x.done), c: 'var(--s3)', w: 1.5 }, { values: g.days.map(x => x.wip), c: 'var(--s2)' }], xLabel: i => 'D' + (i + 1), yMin: 0 }), 170, [{ t: 'Orders arriving', c: 'var(--s5)' }, { t: 'Orders finished', c: 'var(--s3)' }, { t: 'Orders in the plant', c: 'var(--s2)' }], 'Order flow by day'));
      }
      h += sheet(`Decisions · days ${day0 + 1}–${day0 + FF.block}`, 'Set up the line', `<div class="fields">${
        stepper('m0', 'Prep machines', d.m0, 1, 6, 1, String, LV['m0-hint'])}${
        stepper('m1', 'Test machines', d.m1, 1, 6, 1, String, LV['m1-hint'])}${
        stepper('m2', 'Pack machines', d.m2, 1, 6, 1, String, LV['m2-hint'])}${
        chips('contract', 'Contract for new orders', Object.keys(FF.contracts).map(k => { const c = FF.contracts[k]; return { v: k, t: c.name, s: `${N.usd(c.full)} within ${c.quote}d` }; }), d.contract)}${
        stepper('rop', 'Reorder point (kits)', d.rop, 0, 300, 5, String, LV['rop-hint'])}${
        stepper('oq', 'Order size (kits)', d.oq, 10, 400, 10, String, LV['oq-hint'])}</div><div class="summary" data-live="ff-cash">${LV['ff-cash']}</div>`) +
        runBtn(day0 + FF.block >= FF.days ? `Run final days ${day0 + 1}–${day0 + FF.block}` : `Run days ${day0 + 1}–${day0 + FF.block}`);
      return h;
    },
    notes(g){
      const n = [], hot = [];
      g.blocks.forEach(b => b.util.forEach((u, s) => { if (u > 0.92) hot.push({ b, s, u }); }));
      if (hot.length){ const x = hot[0]; n.push(`${FF.st[x.s].name} ran at ${N.pct(x.u)} in days ${x.b.from}–${x.b.to}. Near full utilisation, queues and lead times explode.`); }
      else n.push('No station stayed above 92% utilisation for a whole block. You added capacity ahead of demand.');
      const wip = avg(g.days.map(x => x.wip)), thr = g.tot.done / g.days.length, lt = g.tot.lt / Math.max(1, g.tot.done);
      n.push(`Little’s Law check: ${wip.toFixed(1)} orders in the plant ÷ ${thr.toFixed(1)} finished a day ≈ ${(wip / thr).toFixed(1)} days. Measured lead time: ${lt.toFixed(1)} days.`);
      const starve = sum(g.blocks.map(b => b.starve));
      if (starve > 0) n.push(`Orders waited ${N.int(starve)} hours for parts kits. A higher reorder point covers the 2-day supplier lead time.`);
      if (g.blocks.some(b => b.contract !== 'standard' && b.onTime < 0.6)) n.push('Faster contracts only pay when lead times stay under their target. They need spare capacity.');
      else if (g.blocks.some(b => b.contract === 'standard' && b.lt != null && b.lt <= 1)) n.push('Your lead times ran under a day while you sold on the Standard contract. Priority pays 30% more for that speed.');
      n.push('At 12 orders a day, EOQ = √(2 × 12 × $800 ÷ $1) ≈ 140 kits, and a reorder point near 30 kits covers lead time plus a buffer.');
      return n.slice(0, 4);
    },
    debrief(g){
      const t = g.tot;
      let h = debriefHead(this, g.score, `Cash on day 100: ${N.k(g.cash)}. You started with ${N.k(FF.startCash)}.`);
      h += sheet('Results', '100 days on the line', kpis([
        { k: 'Final cash', v: N.k(g.cash) }, { k: 'Orders done', v: N.int(t.done) }, { k: 'Avg lead time', v: (t.lt / Math.max(1, t.done)).toFixed(2) + ' d' }, { k: 'On time', v: N.pct(t.onTime / Math.max(1, t.done)) }
      ]) +
        chart('flt2', () => ({ series: [{ values: g.days.map(x => x.lt), c: 'var(--s1)' }], xLabel: i => 'D' + (i + 1), yFmt: v => v + 'd', yMin: 0 }), 170, [{ t: 'Average lead time each day', c: 'var(--s1)' }], 'Lead time over 100 days') +
        chart('fflow2', () => ({ series: [{ values: g.days.map(x => x.arr), c: 'var(--s5)', w: 1.5 }, { values: g.days.map(x => x.done), c: 'var(--s3)', w: 1.5 }, { values: g.days.map(x => x.wip), c: 'var(--s2)' }], xLabel: i => 'D' + (i + 1), yMin: 0 }), 170, [{ t: 'Orders arriving', c: 'var(--s5)' }, { t: 'Orders finished', c: 'var(--s3)' }, { t: 'Orders in the plant', c: 'var(--s2)' }], 'Order flow over 100 days') +
        table(['Days', 'Setup', 'Busiest', 'Lead', 'Cash'], g.blocks.map(b => { const k = b.util.indexOf(Math.max(...b.util)); return { cells: [`${b.from}–${b.to}`, `${b.machines.join('/')} ${FF.contracts[b.contract].name.slice(0, 3)}`, `${FF.st[k].name} ${N.pct(b.util[k])}`, b.lt == null ? '—' : b.lt.toFixed(2) + 'd', N.k(b.cash)] }; })) +
        '<p class="cap">Setup shows Prep/Test/Pack machines and the contract (Sta, Pri or Exp). Busiest is the station with the highest utilisation.</p>');
      h += takeaways(this.notes(g), [
        ['Bottleneck.', 'The station with the highest utilisation sets the output of the whole line.'],
        ['Queueing.', 'Waiting time grows sharply as utilisation approaches 100%, so plan for spare capacity.'],
        ['Little’s Law.', 'Work in process equals throughput times lead time.'],
        ['EOQ and reorder point.', 'Balance ordering fees against holding cost, and reorder early enough to cover supplier lead time.']
      ]) + endButtons();
      return h;
    }
  };
  
  MOD.supply = {
    title: 'Supply Chain Relay', area: 'Supply chain', length: '24 weeks · about 5 min',
    practises: 'Supply chain coordination · ordering decisions',
    blurb: 'Run one link of a four-company chain. You only see the orders from the company below you, and every shipment takes two weeks.',
    init: seed => SC.init(seed, 1),
    progress: g => `Week ${g.week} of ${SC.weeks}`,
    step: g => SC.step(g),
    score: g => SC.score(g),
    op(g, op, arg){
      if (op === 'role' && g.week === 1){ const ng = SC.init(g.seed, Number(arg)); Object.keys(g).forEach(k => delete g[k]); Object.assign(g, ng); }
      if (op === 'set') g.draft.order = clamp(Number(arg), 0, 60);
    },
    play(g){
      const i = g.role, T = g.tiers[i], role = SC.roles[i];
      const below = i === 0 ? 'shoppers' : 'the ' + SC.roles[i - 1].toLowerCase();
      const above = i === 3 ? 'your brewery line' : 'the ' + SC.roles[i + 1].toLowerCase();
      const next1 = i < 3 ? T.ship[0] : g.prod[0], next2 = i < 3 ? T.ship[1] : g.prod[1];
      const last = g.H.orders[i].length ? g.H.orders[i][g.H.orders[i].length - 1] : 4;
      let h = brief('The crate chain', g.week === 1, `<p>Four companies move crates of sparkling water to shoppers: Retailer, Wholesaler, Distributor and Factory. Each week every company ships what it can to the company below it, then places an order with the company above it.</p><p>Shipments take two weeks to arrive, and the factory needs two weeks to brew. You only see the orders that reach you. Holding a crate costs $0.50 a week, and an unfilled order (backlog) costs $1.00 a week. The computer runs the other three companies.</p><p>Your score compares your cost with the best of three simple ordering rules playing the same role.</p>`, 'Count what is already on its way before you order more.');
      if (g.week === 1) h += sheet('Before you start', 'Pick your role', `<div class="chips" role="group" aria-label="Role">${SC.roles.map((r, k) => `<button type="button" class="chip" data-act="m" data-op="role" data-arg="${k}" aria-pressed="${k === i}">${r}</button>`).join('')}</div><p class="cap">You can change role until you place your first order.</p>`);
      h += sheet(`Week ${g.week} · ${role}`, `${N.int(T.d)} crates ordered by ${below}`, kpis([
        { k: 'Inventory', v: N.int(T.inv) }, { k: 'Backlog', v: N.int(T.back), cls: T.back > 0 ? 'down' : '' }, { k: 'Arriving next week', v: N.int(next1) }, { k: 'Cost so far', v: '$' + T.cost.toFixed(1) }
      ]) + `<p class="ops">Received ${N.int(T.arrived)} · shipped ${N.int(T.sent)} · arriving in two weeks ${N.int(next2)} · ordered but not yet received <strong>${N.int(SC.sl(g, i))}</strong></p>` +
        `<div class="chain" aria-label="Supply chain">${SC.roles.map((n, k) => `<div class="node${k === i ? ' me' : ''}">${n}${k === i ? '<small>You</small>' : ''}</div>`).join('<span class="arr" aria-hidden="true">←</span>')}</div><p class="cap">Crates flow left toward shoppers. Orders flow right toward the factory.</p>` +
        (g.week > 1 ? chart('shist', () => ({ series: [{ values: g.H.seen[i], c: 'var(--s5)', dash: true }, { values: g.H.orders[i], c: 'var(--pen)' }, { values: g.H.net[i], c: 'var(--s3)' }], xLabel: k => 'W' + (k + 1) }), 170, [{ t: 'Orders you received', c: 'var(--s5)' }, { t: 'Orders you placed', c: 'var(--pen)' }, { t: 'Inventory minus backlog', c: 'var(--s3)' }], 'Your weekly orders and stock') : ''));
      h += sheet('Your order', `Order from ${above}`, stepper('order', 'Crates to order', g.draft.order, 0, 60, 1, String, 'Arrives in about three weeks', true) +
        `<div class="chips"><button type="button" class="chip" data-act="m" data-op="set" data-arg="${T.d}">Match incoming (${T.d})</button><button type="button" class="chip" data-act="m" data-op="set" data-arg="${last}">Repeat last (${last})</button></div>`) +
        runBtn(g.week === SC.weeks ? 'Place final order' : `Place order · go to week ${g.week + 1}`);
      return h;
    },
    notes(g){
      const i = g.role, n = [], mine = g.H.orders[i], seen = g.H.seen[i];
      const ratio = sdev(mine) / Math.max(0.01, sdev(seen));
      n.push(ratio > 1.3 ? `Your orders swung ${ratio.toFixed(1)} times as much as the orders you received. That amplification is the bullwhip effect.` : `Your orders were steadier than the orders you received (ratio ${ratio.toFixed(1)}). You damped the bullwhip.`);
      n.push(`Shoppers never bought more than ${Math.max(...g.H.cust)} crates a week, yet factory orders peaked at ${Math.max(...g.H.orders[3])}.`);
      const net = g.H.net[i], mn = Math.min(...net), mx = Math.max(...net);
      if (mn < -5 && mx > 25) n.push(`You swung from a backlog of ${-mn} to ${mx} crates in stock: the classic overshoot when orders already on the way are ignored.`);
      n.push(`The best simple ordering rule would have cost about $${g.benchCost.toFixed(0)} in your role. You spent $${g.tiers[i].cost.toFixed(0)}.`);
      return n.slice(0, 4);
    },
    debrief(g){
      const i = g.role, team = sum(g.tiers.map(t => t.cost));
      const ratio = sdev(g.H.orders[i]) / Math.max(0.01, sdev(g.H.seen[i]));
      const cols = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)'];
      let h = debriefHead(this, g.score, `As the ${SC.roles[i].toLowerCase()}, you spent $${g.tiers[i].cost.toFixed(0)} on holding and backlog. The best simple ordering rule would have spent about $${g.benchCost.toFixed(0)}.`);
      h += sheet('Results', '24 weeks in the chain', kpis([
        { k: 'Your cost', v: '$' + g.tiers[i].cost.toFixed(0) }, { k: 'Rule-based cost', v: '$' + g.benchCost.toFixed(0) }, { k: 'Whole chain', v: '$' + team.toFixed(0) }, { k: 'Order swing', v: ratio.toFixed(1) + '×' }
      ]) +
        chart('sorders', () => ({ series: [{ values: g.H.cust, c: 'var(--ink)', w: 2.5, dash: true }].concat(SC.roles.map((r, k) => ({ values: g.H.orders[k], c: cols[k], w: k === i ? 3 : 1.6 }))), xLabel: k => 'W' + (k + 1), yMin: 0 }), 200, [{ t: 'Shopper demand', c: 'var(--ink)' }].concat(SC.roles.map((r, k) => ({ t: r + (k === i ? ' (you)' : '') + ' orders', c: cols[k] }))), 'Orders placed by each company') +
        chart('snet', () => ({ series: SC.roles.map((r, k) => ({ values: g.H.net[k], c: cols[k], w: k === i ? 3 : 1.6 })), xLabel: k => 'W' + (k + 1), refs: [{ y: 0, label: '' }] }), 180, SC.roles.map((r, k) => ({ t: r + ' stock minus backlog', c: cols[k] })), 'Inventory minus backlog by company') +
        table(['Company', 'Cost', 'Peak order', 'Worst backlog'], SC.roles.map((r, k) => ({ cls: k === i ? 'me' : '', cells: [r, '$' + g.tiers[k].cost.toFixed(0), String(Math.max(...g.H.orders[k])), String(Math.max(0, -Math.min(...g.H.net[k])))] }))));
      h += takeaways(this.notes(g), [
        ['Bullwhip effect.', 'Small changes in shopper demand grow into large swings further up the chain.'],
        ['Supply line.', 'Orders placed but not yet received. Forgetting them is the main cause of over-ordering.'],
        ['Delays.', 'With shipping and information delays, today’s order lands two to three weeks from now.'],
        ['Fixes.', 'Share point-of-sale data, shorten lead times and order steadily.']
      ]) + endButtons();
      return h;
    }
  };
  
  MOD.deal = {
    title: 'Deal Table', area: 'Negotiation', length: '6 offers · about 5 min',
    practises: 'Negotiation · bargaining · trade-offs',
    blurb: 'Sell 40 electric vans across four terms. Claim value on price, and create it by trading the terms the other side cares about more.',
    init: seed => NG.init(seed),
    progress: g => (g.round > NG.rounds ? 'Final offer' : `Offer ${g.round} of ${NG.rounds}`),
    score: g => NG.score(g),
    op(g, op, arg){
      if (op !== 'walk') g.confirmWalk = false;
      if (op === 'send') NG.send(g);
      else if (op === 'accept') NG.accept(g);
      else if (op === 'ask') NG.ask(g);
      else if (op === 'share') NG.share(g, Number(arg));
      else if (op === 'walk'){ if (g.confirmWalk) NG.walk(g); else g.confirmWalk = true; }
      if (op === 'send' || op === 'ask' || op === 'share') QS.focusLast = true;
    },
    live(g){ const p = NG.pts('you', NG.offerOf(g.draft)); return { 'deal-pts': `This offer is worth <strong class="num">${N.int(p)}</strong> points to you${p < NG.batna.you ? ' <span class="pill bad">Below your walk-away</span>' : ''} · walk-away value ${N.int(NG.batna.you)}` }; },
    msg(m, last){
      const terms = m.offer ? `<div class="terms">${m.offer.map((v, k) => `<span>${NG.issues[k].opts[v]}</span>`).join('')}</div><span class="cap">Worth ${N.int(NG.pts('you', m.offer))} points to you</span>` : '';
      return `<div class="msg ${m.who}"${last ? ' data-last' : ''}><span class="who">${m.who === 'you' ? 'You' : 'Swiftlane'}${m.r ? ` · offer ${m.r}` : ''}</span>${m.text ? `<p>${esc(m.text)}</p>` : ''}${terms}</div>`;
    },
    play(g){
      let h = brief('Ferro Motors and Swiftlane', g.log.length === 0, `<p>You sell electric delivery vans for <strong>Ferro Motors</strong>. <strong>Swiftlane</strong>, a fast-growing logistics startup, wants 40 vans. Four terms are open: price, delivery date, warranty and payment terms.</p><p>The points on each option show what it is worth to Ferro. Swiftlane has its own private table. If you walk away, another buyer is worth 3,000 points to you. You can make up to six offers, and Swiftlane answers each one.</p><p>Your score is 60% your own points and 40% the combined points of both sides.</p>`, 'Learn what they care about. Trade what is cheap for you.');
      if (g.log.length) h += sheet('Conversation', null, `<div class="log">${g.log.map((m, k) => this.msg(m, k === g.log.length - 1)).join('')}</div>`);
      const final = g.round > NG.rounds;
      let b = '';
      if (!final){
        b += `<div class="fields">${NG.issues.map((is, k) => chips('i' + k, is.name, is.opts.map((t, v) => ({ v, t, s: N.int(is.you[v]) + ' pts' })), g.draft['i' + k])).join('')}</div>`;
        b += `<div class="summary" data-live="deal-pts">${this.live(g)['deal-pts']}</div>`;
        b += `<button class="btn btn-primary btn-block" data-act="m" data-op="send" type="button">Send offer ${g.round} of ${NG.rounds}</button>`;
      } else b += '<p class="case">Swiftlane has made its final offer. Accept it or walk away.</p>';
      const acts = [];
      if (g.counter) acts.push(`<button class="btn ${final ? 'btn-primary' : 'btn-ghost'}" data-act="m" data-op="accept" type="button">Accept their offer (${N.int(NG.pts('you', g.counter))} pts)</button>`);
      if (!g.asked) acts.push('<button class="btn btn-ghost" data-act="m" data-op="ask" type="button">Ask what matters to them</button>');
      acts.push(g.confirmWalk ? '<button class="btn btn-danger" data-act="m" data-op="walk" type="button">Confirm: walk away for 3,000</button><button class="btn btn-ghost" data-act="m" data-op="stay" type="button">Keep talking</button>' : '<button class="btn btn-ghost" data-act="m" data-op="walk" type="button">Walk away</button>');
      b += `<div class="actions">${acts.join('')}</div>`;
      if (g.shared == null && !final) b += `<div class="field"><span class="lbl">Tell them your top priority (once)</span><div class="chips">${NG.issues.map((is, k) => `<button type="button" class="chip" data-act="m" data-op="share" data-arg="${k}">${is.name}</button>`).join('')}</div></div>`;
      h += sheet(final ? 'Final offer' : `Your offer ${g.round} of ${NG.rounds}`, final ? 'Decide' : 'Build an offer', b);
      return h;
    },
    notes(g){
      const r = NG.result(g), n = [];
      if (r.impasse) n.push('No deal. You took 3,000 and Swiftlane took 3,500, while terms worth up to 13,000 combined were on the table.');
      if (!g.asked) n.push('You never asked what Swiftlane cared about. One question would have revealed their priorities.');
      if (g.deal){
        const o = g.deal.offer, D = NG.issues[1];
        if (o[1] !== 3) n.push(`Delivery was a shared interest: both sides gain from 10 weeks. Settling on ${D.opts[o[1]]} left ${N.int(D.you[3] - D.you[o[1]] + D.them[3] - D.them[o[1]])} combined points unclaimed.`);
        if (o[2] === 0 && o[3] === 3) n.push('You traded Net 120 payment for a 1-year warranty. That trade is where most of the value in this deal sits.');
        else n.push('Swiftlane valued payment terms most and you valued warranty most. Trading Net 120 for a 1-year warranty creates the most value.');
        if (r.you < NG.batna.you) n.push('You accepted less than your 3,000-point walk-away. No deal would have been better.');
      }
      if (g.first){ const t = NG.pts('them', g.first); if (t >= 6000) n.push('Your first offer gave a lot away. Open ambitiously and concede in steps.'); else if (t <= 3000) n.push('You opened with an ambitious anchor, which left room to concede and still claim value.'); }
      return n.slice(0, 4);
    },
    debrief(g){
      const r = NG.result(g);
      let h = debriefHead(this, g.score, r.impasse ? 'No deal. Both sides fell back to their alternatives.' : `Deal after ${g.deal.r} offer${g.deal.r > 1 ? 's' : ''}: ${N.int(r.you)} points for you and ${N.int(r.joint)} combined.`);
      h += sheet('Outcome', r.impasse ? 'No agreement' : 'The agreement', kpis([
        { k: 'Your points', v: N.int(r.you), d: 'walk-away 3,000' }, { k: 'Their points', v: N.int(r.them), d: 'walk-away 3,500' }, { k: 'Combined', v: N.int(r.joint), d: 'best possible 13,000' }, { k: 'Value created', v: N.pct(r.joint / NG.max.joint) }
      ]) + (g.deal ? table(['Term', 'Agreed', 'You', 'Them'], NG.issues.map((is, k) => ({ cells: [is.name, is.opts[g.deal.offer[k]], N.int(is.you[g.deal.offer[k]]), N.int(is.them[g.deal.offer[k]])] }))) : '') +
        '<span class="eyebrow">Both sides’ tables, revealed</span>' +
        table(['Term', 'Worth to you', 'Worth to Swiftlane'], 'wrap', [
          { cells: ['Price per van', '+1,000 per $1k higher', MINUS + '1,000 per $1k higher'] },
          { cells: ['Delivery', '+600 per 2 weeks later', '+400 per 2 weeks later'] },
          { cells: ['Warranty', MINUS + '800 per extra year', '+400 per extra year'] },
          { cells: ['Payment terms', MINUS + '400 per 30 days later', '+1,200 per 30 days later'] }
        ]));
      h += takeaways(this.notes(g), [
        ['BATNA.', 'Your best alternative if talks fail. Never accept less.'],
        ['Distributive issues.', 'Price splits a fixed pie: one side’s gain is the other’s loss.'],
        ['Integrative issues.', 'Terms valued differently by each side. Concede what is cheap for you and valuable to them, which negotiators call logrolling.'],
        ['Compatible issues.', 'Both sides want the same thing. Spot them before you trade them away.']
      ]) + endButtons();
      return h;
    }
  };
  
  MOD.crisis = {
    title: 'Crisis Room', area: 'Leadership and teams', length: '4 phases · about 6 min',
    practises: 'Team decisions · leadership under pressure',
    blurb: 'Lead a five-person response team through a product-safety crisis. The facts you need are spread across the team.',
    init: seed => CR.init(seed),
    progress: g => `Phase ${g.phase + 1} of ${CR.phases.length}`,
    score: g => CR.score(g),
    op(g, op, arg){
      if (op === 'consult') CR.consult(g, arg);
      else if (op === 'huddle') CR.huddleAll(g);
      else if (op === 'choose') CR.choose(g, Number(arg));
      else if (op === 'next') CR.next(g);
    },
    strip(g){
      const m = g.m;
      return `<section class="sheet strip" aria-label="Crisis scorecard">${meter('Safety', m.safety / 100, String(m.safety), m.safety >= 70 ? 'ok' : m.safety >= 45 ? 'warm' : 'hot')}${meter('Reputation', m.rep / 100, String(m.rep), m.rep >= 70 ? 'ok' : m.rep >= 45 ? 'warm' : 'hot')}${meter('Team trust', m.trust / 100, String(m.trust), m.trust >= 70 ? 'ok' : m.trust >= 45 ? 'warm' : 'hot')}${meter('Cost so far', m.cost / 50, N.m(m.cost, 0), m.cost <= 15 ? 'ok' : m.cost <= 30 ? 'warm' : 'hot')}</section>`;
    },
    deltas(dl){
      const lab = { safety: 'Safety', rep: 'Reputation', cost: 'Cost', trust: 'Trust' };
      return Object.keys(lab).filter(k => dl[k]).map(k => { const v = dl[k], good = k === 'cost' ? v < 0 : v > 0; return `<span class="pill ${good ? 'good' : 'bad'}">${lab[k]} ${k === 'cost' ? N.sign(v, x => '$' + x + 'M') : N.sign(v, String)}</span>`; }).join('');
    },
    play(g){
      const P = CR.phases[g.phase], left = 2 - g.consulted.length, open = g.choice == null;
      let h = brief('Brightnode Home Hub', g.phase === 0 && open && !g.consulted.length && !g.huddle, '<p>You are general manager at <strong>Brightnode</strong>, a smart-home company. A possible battery fault in the Home Hub has surfaced overnight. You chair a five-person response team, and each member knows things the others do not.</p><p>In each of four phases you can consult two teammates, or call a full huddle that costs time, and then decide. Every teammate also has a personal goal. You are scored on safety, reputation, cost, team trust and how much of the key information you gathered before deciding.</p>', 'Ask before you decide. The key facts are spread across the team.');
      h += this.strip(g);
      h += sheet(`Phase ${g.phase + 1} of ${CR.phases.length} · ${P.time}`, P.title, `<div class="case"><p>${P.text}</p></div>`);
      const team = CR.people.map(p => {
        const heard = CR.heard(g, p.id), can = open && !heard && !g.huddle && left > 0;
        return `<div class="person${heard ? ' heard' : ''}"><button type="button" class="p-btn" data-act="m" data-op="consult" data-arg="${p.id}"${can ? '' : ' disabled'} aria-pressed="${heard}"><span class="av" aria-hidden="true">${p.name[0]}</span><span class="nm">${p.name}</span><span class="rl">${p.role}</span><span class="p-act">${heard ? 'Heard' : can ? 'Consult' : ''}</span></button>${heard ? `<p class="quote">${P.info[p.id].t}</p>` : ''}</div>`;
      }).join('');
      h += sheet('Your team', g.huddle ? 'Full huddle: everyone spoke' : `${left} consult${left === 1 ? '' : 's'} left this phase`, `<div class="team">${team}</div>${open && !g.huddle ? '<button class="btn btn-ghost" data-act="m" data-op="huddle" type="button">Call a full huddle to hear everyone (costs 3 reputation)</button>' : ''}`);
      let dec = `<div class="opts">${P.options.map((o, k) => `<button type="button" class="opt" data-act="m" data-op="choose" data-arg="${k}" aria-pressed="${g.choice === k}"${open ? '' : ' disabled'}><b aria-hidden="true">${'ABC'[k]}</b><span>${o.label}</span></button>`).join('')}</div>`;
      if (!open){
        const c = g.choices[g.choices.length - 1];
        dec += `<div class="outcome"><p class="case">${P.options[c.k].out}${c.extra ? ' ' + c.extra : ''}</p><div class="deltas">${this.deltas(c.delta)}</div><button class="btn btn-primary btn-block" data-act="m" data-op="next" data-top="1" type="button">${g.phase === CR.phases.length - 1 ? 'See the debrief' : 'Next phase'}</button></div>`;
      }
      h += sheet('Decision', 'What do you do?', dec);
      return h;
    },
    notes(g){
      const n = [];
      g.choices.forEach((c, k) => { const miss = c.crit.filter(pid => c.heardCrit.indexOf(pid) < 0); if (miss.length){ const p = CR.people.find(x => x.id === miss[0]); n.push(`Phase ${k + 1}: you decided without hearing ${p.name}, who knew ${CR.phases[k].info[miss[0]].k}.`); } });
      if (!n.length) n.push('You heard every key fact before deciding. That habit wins hidden-profile problems.');
      const off = g.choices.filter(c => c.k !== c.best).length;
      if (off) n.push(`${off} of your four calls differed from the strongest option.`);
      if (g.choices.filter(c => c.huddle).length >= 3) n.push('Full huddles got you every fact but cost time in each phase. Targeted questions are faster.');
      return n.slice(0, 4);
    },
    debrief(g){
      const G = g.goalsMet, m = g.m;
      let h = debriefHead(this, g.score, `Safety ${m.safety}, reputation ${m.rep}, team trust ${m.trust}, total cost ${N.m(m.cost, 0)}. You gathered ${N.pct(CR.process(g))} of the key facts before deciding.`);
      h += this.strip(g);
      h += sheet('Your calls', 'Phase by phase', table(['Phase', 'Your call', 'Strongest', 'Key facts heard'], g.choices.map((c, k) => ({ cells: [`${k + 1}. ${CR.phases[k].short}`, 'ABC'[c.k], 'ABC'[c.best], `${c.heardCrit.length} of ${c.crit.length}`] }))) +
        `<span class="eyebrow">Personal goals</span><ul class="goals">${CR.people.map(p => `<li><strong>${p.name}</strong>, ${p.role.toLowerCase()}: ${p.goal}<span class="pill ${G[p.id] ? 'good' : 'bad'}">${G[p.id] ? 'Met' : 'Missed'}</span></li>`).join('')}</ul>`);
      h += takeaways(this.notes(g), [
        ['Hidden profiles.', 'Teams spend their time on facts everyone already shares and miss the facts only one person holds.'],
        ['Ask the quiet experts.', 'Decide who speaks before a decision instead of waiting for people to volunteer.'],
        ['Personal and team goals.', 'Surface them openly. Hidden agendas distort the advice you get.'],
        ['Speed versus completeness.', 'A full huddle costs time. Ask the two people most likely to hold the missing fact.']
      ]) + endButtons();
      return h;
    }
  };

  /* ---------- Brand map on the shared chart engine ---------- */
  const origMap = MOD.brand.mapSpec;
  MOD.brand.mapSpec = function (g) {
    const sp = origMap.call(this, g), cy = v => clamp(v, 20, 220);
    const zones = sp.segs.map(s => ({ x: s.perf, y: cy(s.price), r: 7 + Math.sqrt(s.size) * 0.95, label: s.name, op: 0.6 }));
    const points = sp.rivals.map(b => ({ x: b.perf, y: cy(b.price), c: 'var(--ink-2)', r: 4.5, label: b.name }));
    const arrows = [];
    if (Math.abs(sp.you.next - sp.you.perf) > 0.01) { arrows.push({ x1: sp.you.perf, y1: cy(sp.you.price), x2: sp.you.next, y2: cy(sp.you.price), c: 'var(--pen)' }); points.push({ x: sp.you.next, y: cy(sp.you.price), c: 'var(--pen)', r: 6, ring: true, label: 'next period' }); }
    points.push({ x: sp.you.perf, y: cy(sp.you.price), c: 'var(--pen)', r: 7, big: true, label: 'Pulse' });
    return { type: 'map', x: { min: 1, max: 10, label: 'Performance, 1 to 10', ticks: [2, 4, 6, 8, 10] }, y: { min: 20, max: 220, label: 'Price', fmt: v => '$' + v, ticks: [20, 70, 120, 170, 220] }, zones, arrows, points };
  };

  /* ---------- Register on the platform ---------- */
  const LINES = {
    brand: g => `Net contribution ${N.m(g.total / 1000, 1)} over ${MK.periods} periods`,
    factory: g => `Cash on day ${FF.days}: ${N.k(g.cash)}`,
    supply: g => `${SC.roles[g.role]} · cost $${g.tiers[g.role].cost.toFixed(0)} against a $${(g.benchCost || 0).toFixed(0)} benchmark`,
    deal: g => { const r = NG.result(g); return r.impasse ? 'No deal: both sides walked away' : `Deal: ${N.int(r.you)} points for you, ${N.int(r.joint)} combined`; },
    crisis: g => `Safety ${g.m.safety} · reputation ${g.m.rep} · trust ${g.m.trust} · cost ${N.m(g.m.cost, 0)}`
  };
  const DRAFT_OPS = { supply: ['set'], deal: ['stay'] };
  ['brand', 'factory', 'supply', 'deal', 'crisis'].forEach(id => {
    const V = MOD[id];
    S.App.register({
      id, cat: ({ factory: 'ops', brand: 'marketing', supply: 'ops', deal: 'people', crisis: 'people' })[id], title: V.title, area: V.area, length: V.length, practises: V.practises, blurb: V.blurb, depth: 'Quick version', version: 1, persist: 'state', hidden: true,
      create: seed => V.init(seed),
      isDone: g => !!g.done,
      progress: g => (g.done ? 'Complete' : V.progress(g)),
      view(g, ctx) {
        QS.id = id; QS.metaId = ctx && ctx.meta ? ctx.meta.id : null;
        if (g.done && g.score == null) g.score = V.score(g);
        return g.done ? V.debrief(g) : V.play(g);
      },
      live: V.live ? g => V.live(g) : undefined,
      field(g, name, value) { if (!g.draft) return null; g.draft[name] = value; return null; },
      act(g, op, el) {
        if (g.done) return null;
        if (op === 'run') { V.step(g); return { commit: true, top: true }; }
        if (V.op) V.op(g, op, el.dataset.arg);
        if ((DRAFT_OPS[id] || []).indexOf(op) >= 0) return { rerender: true, draft: true };
        return { commit: true, top: el.dataset.top === '1' };
      },
      afterRender() {
        if (QS.focusLast) { const el = document.querySelector('[data-last]'); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center' }); }
        QS.focusLast = false;
      },
      summary(g) { if (g.score == null) g.score = V.score(g); return { score: g.score, line: LINES[id](g), metrics: [] }; }
    });
  });
})();
