/* Markets Desk engine: a ten-year endowment run on real annual returns.
   Everything the player can see is computed from years before the current one, so nothing leaks from the future. */
(function () {
  'use strict';
  const S = window.SimLab, MD = window.MarketsData;
  if (!S || !MD) return;
  const { RNG } = S;
  const { clamp, sum, avg, sdev, round, clone } = S.U;

  const KEYS = ['eq', 'tb', 'tn', 'bb', 're', 'au'];
  const RISKY = ['eq', 'tn', 'bb', 're', 'au'];
  const ASSETS = {
    eq: { name: 'Equities', short: 'Equities', what: 'Large-company shares, dividends reinvested', real: 'S&P 500 with dividends', cost: 0.001 },
    tn: { name: 'Government bonds', short: 'Govt bonds', what: '10-year government bonds', real: '10-year US Treasury bonds', cost: 0.0005 },
    bb: { name: 'Corporate bonds', short: 'Corp bonds', what: 'Investment-grade corporate bonds (lower medium grade)', real: 'Baa corporate bonds', cost: 0.0025 },
    re: { name: 'Property', short: 'Property', what: 'Residential property price index, without rent', real: 'US house prices', cost: 0.015 },
    au: { name: 'Gold', short: 'Gold', what: 'Gold bullion', real: 'Gold', cost: 0.004 },
    tb: { name: 'Cash', short: 'Cash', what: '3-month government bills', real: '3-month US Treasury bills', cost: 0 }
  };
  const DATA = {};
  MD.RAW.forEach(r => { DATA[r[0]] = { y: r[0], eq: r[1], tb: r[2], tn: r[3], bb: r[4], re: r[5], au: r[6], cpi: r[7] }; });
  const FIRST = MD.RAW[0][0], LAST = MD.RAW[MD.RAW.length - 1][0];
  const N_YEARS = 10, START_VALUE = 500;
  const RE_MAX = 0.25, RE_MOVE = 0.05, MAX_GROSS = 1.3, BORROW_SPREAD = 0.01, HEDGE_FLOOR = -0.10;
  const POLICY = { eq: 0.6, tn: 0.4, bb: 0, re: 0, au: 0 };
  const LIMIT = { guided: 0.25, standard: 0.22, expert: 0.20 };
  const SPEND = { base: 0.045, choices: [0.035, 0.04, 0.045, 0.05, 0.055] };
  const HEDGES = [0, 0.25, 0.5, 0.75, 1];
  const RIVALS = [
    { id: 'bench', name: 'Policy portfolio', what: '60% equities, 40% government bonds, rebalanced every year', c: 'var(--ink-3)' },
    { id: 'mom', name: 'Momentum Capital', what: 'Buys last year’s winners', c: 'var(--c-b)' },
    { id: 'con', name: 'Contrarian Partners', what: 'Buys last year’s losers', c: 'var(--c-c)' },
    { id: 'cau', name: 'Steady Pension Fund', what: '30% equities, 50% government bonds, 20% cash', c: 'var(--c-d)' }
  ];
  const SCEN = Object.keys(MD.WINDOWS);

  const lvl = g => S.lvlOf(g);
  const yearOf = (g, t) => g.start + t - 1;
  const goldBanned = (g, y) => !!(g.ban && y >= g.ban);

  /* ---------- Statistics from history before a given year ---------- */
  const STATS = {};
  function statsBefore(y) {
    if (STATS[y]) return STATS[y];
    const yrs = []; for (let k = FIRST; k < y; k++) if (DATA[k]) yrs.push(DATA[k]);
    const mean = {}, sd = {}, worst = {}, best = {}, real = {};
    KEYS.forEach(k => { const v = yrs.map(d => d[k]); mean[k] = avg(v); sd[k] = sdev(v); worst[k] = Math.min(...v); best[k] = Math.max(...v); real[k] = avg(yrs.map(d => (1 + d[k]) / (1 + d.cpi) - 1)); });
    const cov = {};
    KEYS.forEach(a => { cov[a] = {}; KEYS.forEach(b => { cov[a][b] = avg(yrs.map(d => (d[a] - mean[a]) * (d[b] - mean[b]))); }); });
    const corr = {};
    KEYS.forEach(a => { corr[a] = {}; KEYS.forEach(b => { corr[a][b] = sd[a] > 0 && sd[b] > 0 ? cov[a][b] / (sd[a] * sd[b]) : (a === b ? 1 : 0); }); });
    STATS[y] = { n: yrs.length, yrs, mean, sd, worst, best, real, cov, corr, infl: avg(yrs.map(d => d.cpi)) };
    return STATS[y];
  }
  /* Full weights from the five risky weights: cash takes the rest (negative cash means borrowing). */
  function full(w) { const o = {}; RISKY.forEach(k => { o[k] = w[k] || 0; }); o.tb = 1 - sum(RISKY.map(k => o[k])); return o; }
  function portStats(st, w) {
    const f = full(w), borrow = Math.max(0, -f.tb);
    const mu = sum(KEYS.map(k => f[k] * st.mean[k])) - borrow * BORROW_SPREAD;
    let v = 0; KEYS.forEach(a => KEYS.forEach(b => { v += f[a] * f[b] * st.cov[a][b]; }));
    const sd = Math.sqrt(Math.max(0, v));
    const hist = st.yrs.map(d => sum(KEYS.map(k => f[k] * d[k])) - borrow * BORROW_SPREAD).sort((a, b) => a - b);
    const worst = hist[0], p5 = hist[Math.max(0, Math.floor(hist.length * 0.05))];
    const real = avg(st.yrs.map(d => (1 + sum(KEYS.map(k => f[k] * d[k])) - borrow * BORROW_SPREAD) / (1 + d.cpi) - 1));
    const sharpe = sd > 0 ? (mu - st.mean.tb) / sd : 0;
    const lossYears = hist.filter(x => x < 0).length / hist.length;
    return { mu, sd, worst, p5, real, sharpe, lossYears, gross: 1 + borrow };
  }
  /* A cloud of long-only mixes (property capped) for the risk-return map, cached by year. */
  const CLOUD = {};
  function cloud(y) {
    if (CLOUD[y]) return CLOUD[y];
    const st = statsBefore(y), r = RNG.make(9173 + y), pts = [];
    for (let i = 0; i < 900; i++) {
      const e = KEYS.map(() => -Math.log(1 - RNG.next(r)));
      const s = sum(e); const w = {}; KEYS.forEach((k, j) => { w[k] = e[j] / s; });
      if (w.re > RE_MAX) { const ex = w.re - RE_MAX; w.re = RE_MAX; w.tb += ex; }
      const p = portStats(st, w); pts.push([p.sd, p.mu]);
    }
    const front = [];
    const sorted = pts.slice().sort((a, b) => a[0] - b[0]); let bestMu = -1;
    sorted.forEach(q => { if (q[1] > bestMu + 1e-4) { front.push(q); bestMu = q[1]; } });
    CLOUD[y] = { pts, front };
    return CLOUD[y];
  }

  /* ---------- Setup ---------- */
  function pickStart(scen, rng) {
    const W = MD.WINDOWS[scen];
    if (W && W.start) return W.start;
    return FIRST + Math.floor(RNG.next(rng) * (LAST - N_YEARS + 2 - FIRST));
  }
  function create(seed, cfg) {
    const c = cfg || {}, rng = RNG.make(seed);
    const scen = SCEN.indexOf(c.scenario) >= 0 ? c.scenario : 'plateau';
    const difficulty = S.normLevel(c.difficulty);
    const start = pickStart(scen, rng);
    const W = MD.WINDOWS[scen];
    const w0 = { eq: 0.55, tn: 0.3, bb: 0.05, re: 0.05, au: 0 };
    const g = {
      v: 1, seed, cfg: { scenario: scen, difficulty }, start, n: N_YEARS, t: 1, done: false,
      ban: W && W.goldBan ? W.goldBan : (start <= 1933 && start + N_YEARS - 1 >= 1933 ? 1933 : null),
      V: START_VALUE, w: full(w0), debt: 0, cpiIdx: 1, grants: 0,
      H: [], rv: {}, board: { conf: 70, pending: null, log: [] }, draft: null, notes: []
    };
    RIVALS.forEach(R => { g.rv[R.id] = { V: START_VALUE, w: full(R.id === 'cau' ? { eq: 0.3, tn: 0.5 } : R.id === 'bench' ? POLICY : w0), H: [] }; });
    g.draft = defaultDraft(g);
    return g;
  }
  function defaultDraft(g) {
    const w = {}; RISKY.forEach(k => { w[k] = round(g.w[k] || 0, 2); });
    if (goldBanned(g, yearOf(g, g.t))) w.au = 0;
    const d = { w, spend: SPEND.base, hedge: 0, board: null };
    return d;
  }

  /* ---------- Rules ---------- */
  function constraints(g, w) {
    const L = lvl(g), y = yearOf(g, g.t), f = full(w), out = [];
    RISKY.forEach(k => { if ((w[k] || 0) < 0) out.push({ k, m: 'negative' }); });
    if (f.re > RE_MAX + 1e-9) out.push({ k: 're', m: 'cap' });
    if (Math.abs(f.re - (g.w.re || 0)) > RE_MOVE + 1e-9) out.push({ k: 're', m: 'move' });
    if (goldBanned(g, y) && f.au > 0) out.push({ k: 'au', m: 'ban' });
    const gross = sum(RISKY.map(k => f[k]));
    if (L < 2 && gross > 1 + 1e-9) out.push({ k: 'tb', m: 'borrow' });
    if (gross > MAX_GROSS + 1e-9) out.push({ k: 'tb', m: 'gross' });
    const p = g.board.pending;
    if (p && g.draft && g.draft.board === 'derisk' && f.eq > Math.max(0, p.eq - 0.2) + 1e-9) out.push({ k: 'eq', m: 'derisk' });
    if (p && g.draft && g.draft.board === 'dip' && f.eq < Math.min(MAX_GROSS, p.eq + 0.1) - 1e-9) out.push({ k: 'eq', m: 'dip' });
    return out;
  }
  /* Make any plan legal: used by apply so a replay can never break. */
  function legal(g, wIn, boardChoice) {
    const L = lvl(g), y = yearOf(g, g.t), w = {};
    RISKY.forEach(k => { w[k] = clamp(+wIn[k] || 0, 0, MAX_GROSS); });
    if (goldBanned(g, y)) w.au = 0;
    const cur = g.w.re || 0;
    w.re = clamp(w.re, Math.max(0, cur - RE_MOVE), Math.min(RE_MAX, cur + RE_MOVE));
    const p = g.board.pending;
    if (p && boardChoice === 'derisk') w.eq = Math.min(w.eq, Math.max(0, p.eq - 0.2));
    if (p && boardChoice === 'dip') w.eq = Math.max(w.eq, Math.min(1, p.eq + 0.1));
    const cap = L < 2 ? 1 : MAX_GROSS, gross = sum(RISKY.map(k => w[k]));
    if (gross > cap) { const fixed = w.re, other = RISKY.filter(k => k !== 're'), os = sum(other.map(k => w[k])), room = Math.max(0, cap - fixed); other.forEach(k => { w[k] = os > 0 ? w[k] * room / os : 0; }); }
    return w;
  }
  function hedgeCost(g) {
    const y = yearOf(g, g.t), prev = DATA[y - 1];
    if (lvl(g) < 2) return 0.025;
    return clamp(0.02 + 0.08 * Math.abs(prev ? prev.eq : 0.1), 0.02, 0.05);
  }
  /* One year of a portfolio: spending first, then trading costs and the hedge, then the market. */
  function yearCalc(Vs, wDrift, wT, spend, hedge, hedgePrem, d, banGold) {
    const pay = spend * Vs, V1 = Vs - pay;
    const f = full(wT), borrow = Math.max(0, -f.tb);
    const turnover = sum(KEYS.map(k => Math.abs(f[k] - (wDrift[k] || 0)))) / 2;
    const tc = V1 * sum(KEYS.map(k => Math.abs(f[k] - (wDrift[k] || 0)) * ASSETS[k].cost));
    const prem = V1 * f.eq * hedge * hedgePrem;
    const base = V1 - tc - prem;
    const r = {}; KEYS.forEach(k => { r[k] = d[k]; });
    if (banGold) r.au = 0;
    const assets = sum(RISKY.map(k => f[k] * (1 + r[k]))) + Math.max(0, f.tb) * (1 + r.tb);
    const debt = borrow * (1 + r.tb + BORROW_SPREAD);
    const payoff = V1 * f.eq * hedge * Math.max(0, HEDGE_FLOOR - r.eq);
    const Ve = base * (assets - debt) + payoff;
    const net = Ve / V1 - 1;
    const hold = {}; RISKY.forEach(k => { hold[k] = base * f[k] * (1 + r[k]); }); hold.tb = base * Math.max(0, f.tb) * (1 + r.tb) - base * debt + payoff;
    if (banGold && hold.au > 0) { hold.tb += hold.au; hold.au = 0; }
    const wEnd = {}; KEYS.forEach(k => { wEnd[k] = Ve > 0 ? hold[k] / Ve : 0; });
    const contrib = {}; RISKY.forEach(k => { contrib[k] = f[k] * r[k]; }); contrib.tb = f.tb * r.tb - borrow * BORROW_SPREAD;
    return { Vs, pay, V1, Ve, net, gross: sum(KEYS.map(k => f[k] * r[k])) - borrow * BORROW_SPREAD, tc, prem, payoff, turnover, wT: f, wEnd, contrib, borrow };
  }
  function rivalTarget(g, id) {
    const y = yearOf(g, g.t), prev = DATA[y - 1], R = g.rv[id], ban = goldBanned(g, y);
    if (id === 'bench') return Object.assign({}, POLICY);
    if (id === 'cau') return { eq: 0.3, tn: 0.5, bb: 0, re: 0, au: 0 };
    const pool = RISKY.filter(k => !(ban && k === 'au')), ranked = pool.slice().sort((a, b) => prev[b] - prev[a]);
    const order = id === 'mom' ? ranked : ranked.slice().reverse();
    const w = { eq: 0, tn: 0, bb: 0, re: 0, au: 0 }; [0.4, 0.3, 0.2].forEach((x, i) => { w[order[i]] = x; });
    const cur = R.w.re || 0; w.re = clamp(w.re, Math.max(0, cur - RE_MOVE), Math.min(RE_MAX, cur + RE_MOVE));
    return w;
  }

  /* ---------- Apply one year ---------- */
  function apply(g, dIn) {
    if (g.done) return;
    const d = dIn || {}, y = yearOf(g, g.t), D = DATA[y], L = lvl(g);
    const banGold = goldBanned(g, y);
    const boardChoice = g.board.pending ? (['hold', 'derisk', 'dip'].indexOf(d.board) >= 0 ? d.board : 'hold') : null;
    if (g.board.pending) {
      const p = g.board.pending;
      g.board.conf = clamp(g.board.conf + ({ hold: -4, derisk: 6, dip: -8 })[boardChoice], 0, 100);
      g.board.log.push({ t: g.t, choice: boardChoice, eqBefore: p.eq });
    }
    const wT = legal(g, d.w || {}, boardChoice);
    const spend = L === 0 ? SPEND.base : (SPEND.choices.indexOf(+d.spend) >= 0 ? +d.spend : SPEND.base);
    const hedge = L === 0 ? 0 : (HEDGES.indexOf(+d.hedge) >= 0 ? +d.hedge : 0);
    const hp = hedgeCost(g);
    const res = yearCalc(g.V, g.w, wT, spend, hedge, hp, D, banGold && (g.w.au > 0 || wT.au > 0));
    g.cpiIdx *= 1 + D.cpi;
    g.grants += res.pay / g.cpiIdx * (1 + D.cpi);
    const rec = Object.assign({ t: g.t, y, spend, hedge, hedgePrem: hp, board: boardChoice, ret: KEYS.reduce((o, k) => (o[k] = D[k], o), {}), cpi: D.cpi, cpiIdx: g.cpiIdx, real: (1 + res.net) / (1 + D.cpi) - 1, banGold: banGold && g.w.au > 0 }, res);
    g.V = res.Ve; g.w = res.wEnd;
    RIVALS.forEach(R => {
      const X = g.rv[R.id], tw = rivalTarget(g, R.id), rr = yearCalc(X.V, X.w, tw, SPEND.base, 0, 0, D, banGold && X.w.au > 0);
      X.H.push({ t: g.t, net: rr.net, real: (1 + rr.net) / (1 + D.cpi) - 1, Ve: rr.Ve, wT: rr.wT, turnover: rr.turnover }); X.V = rr.Ve; X.w = rr.wEnd;
    });
    const bench = g.rv.bench.H[g.rv.bench.H.length - 1];
    g.board.conf = clamp(g.board.conf + clamp(250 * (res.net - bench.net), -12, 12), 0, 100);
    const dd = drawdown(g.H.map(h => h.net).concat([res.net]));
    if (dd > LIMIT[g.cfg.difficulty]) g.board.conf = clamp(g.board.conf - 6, 0, 100);
    rec.conf = g.board.conf; rec.dd = dd;
    g.H.push(rec);
    g.board.pending = null;
    if (g.t < g.n && (res.net <= -0.10 || (dd > LIMIT[g.cfg.difficulty] && !g.H.slice(0, -1).some(h => h.dd > LIMIT[g.cfg.difficulty])))) g.board.pending = { t: g.t + 1, loss: res.net, dd, eq: g.w.eq };
    if (g.t >= g.n) { g.done = true; g.t = g.n + 1; g.draft = null; return; }
    g.t++;
    g.draft = defaultDraft(g);
  }
  const isDone = g => !!g.done;

  /* ---------- Metrics ---------- */
  function drawdown(nets) { let idx = 1, peak = 1, mdd = 0; nets.forEach(r => { idx *= 1 + r; peak = Math.max(peak, idx); mdd = Math.max(mdd, 1 - idx / peak); }); return mdd; }
  function metricsOf(H, g) {
    const n = H.length; if (!n) return null;
    const nets = H.map(h => h.net), reals = H.map((h, i) => h.real != null ? h.real : (1 + h.net) / (1 + g.H[i].cpi) - 1);
    const tb = H.map((h, i) => g.H[i].ret.tb), ex = nets.map((r, i) => r - tb[i]);
    const cum = nets.reduce((a, r) => a * (1 + r), 1), cumReal = reals.reduce((a, r) => a * (1 + r), 1);
    const sx = sdev(ex);
    return { n, cagr: Math.pow(cum, 1 / n) - 1, realCagr: Math.pow(cumReal, 1 / n) - 1, vol: sdev(nets), sharpe: sx > 0 ? avg(ex) / sx : 0, mdd: drawdown(nets), best: Math.max(...nets), worst: Math.min(...nets), cum, cumReal, turnover: avg(H.map(h => h.turnover || 0)) };
  }
  function standings(g) {
    const rows = [{ id: 'you', name: 'Your fund', c: 'var(--c-you)', m: metricsOf(g.H, g), V: g.V }];
    RIVALS.forEach(R => rows.push({ id: R.id, name: R.name, c: R.c, m: metricsOf(g.rv[R.id].H, g), V: g.rv[R.id].V }));
    return rows;
  }
  function realValue(g) { return g.V / g.cpiIdx; }
  /* Did the board's choice help or hurt, judged by what equities did that year? */
  function boardReview(g) {
    return g.board.log.map(b => { const h = g.H.find(x => x.t === b.t); return Object.assign({}, b, { eqRet: h ? h.ret.eq : 0, y: h ? h.y : null }); });
  }
  function score(g) {
    const me = metricsOf(g.H, g), b = metricsOf(g.rv.bench.H, g);
    if (!me || !b) return { total: 0 };
    const diff = (me.realCagr - b.realCagr) * 100;
    const s1 = clamp(52 + 9 * diff, 0, 100);
    const s2 = clamp(52 + 70 * (me.sharpe - b.sharpe), 0, 100);
    const lim = LIMIT[g.cfg.difficulty];
    const s3 = me.mdd <= lim * 0.6 ? 100 : me.mdd <= lim ? 100 - 30 * (me.mdd - lim * 0.6) / (lim * 0.4) : Math.max(0, 70 - 300 * (me.mdd - lim));
    const realRatio = realValue(g) / START_VALUE;
    let s4 = 80; const flags = [];
    if (me.turnover > 0.25) { s4 -= Math.min(30, (me.turnover - 0.25) * 150); flags.push('turnover'); }
    const conc = g.H.filter(h => RISKY.some(k => h.wT[k] > 0.75)).length;
    if (conc) { s4 -= Math.min(40, conc * 8); flags.push('concentration'); }
    boardReview(g).forEach(x => { if (x.choice === 'derisk' && x.eqRet > 0.15) { s4 -= 20; flags.push('panic'); } if ((x.choice === 'dip' || x.choice === 'hold') && x.eqRet > 0.15) s4 += 10; });
    const spread = avg(g.H.map(h => RISKY.filter(k => h.wT[k] >= 0.05).length));
    if (spread >= 3.5) s4 += 10;
    const lev = g.H.filter(h => h.borrow > 0.001).length;
    s4 = clamp(s4, 0, 100);
    const concPen = Math.min(15, 2.5 * conc);
    const total = Math.round(clamp(0.45 * s1 + 0.3 * s2 + 0.15 * s3 + 0.1 * s4 - concPen, 0, 100));
    return { total, parts: [
      { k: 'Real return against the policy portfolio', v: Math.round(s1), w: 45, d: `${diff >= 0 ? '+' : '−'}${Math.abs(diff).toFixed(1)} points a year after inflation` },
      { k: 'Return per unit of risk', v: Math.round(s2), w: 30, d: `Sharpe ratio ${me.sharpe.toFixed(2)} against ${b.sharpe.toFixed(2)}` },
      { k: 'Drawdown mandate', v: Math.round(s3), w: 15, d: `worst fall ${(me.mdd * 100).toFixed(0)}% against a limit of ${(lim * 100).toFixed(0)}%` },
      { k: 'Discipline', v: Math.round(s4), w: 10, d: flags.length ? flags.map(f => ({ turnover: 'heavy trading', concentration: 'concentrated bets', panic: 'cut risk just before a rebound' })[f]).join(', ') : spread >= 3.5 ? 'steady, diversified decisions' : 'steady decisions, few asset classes' }
    ], concPen, conc, me, b, diff, realRatio, lev };
  }

  const api = { KEYS, RISKY, ASSETS, DATA, FIRST, LAST, N_YEARS, START_VALUE, RE_MAX, RE_MOVE, MAX_GROSS, BORROW_SPREAD, HEDGE_FLOOR, POLICY, LIMIT, SPEND, HEDGES, RIVALS, SCEN,
    create, apply, isDone, defaultDraft, yearOf, goldBanned, statsBefore, portStats, cloud, full, constraints, legal, hedgeCost, metricsOf, standings, realValue, boardReview, score, drawdown };
  window.MarketsEngine = api;
})();
