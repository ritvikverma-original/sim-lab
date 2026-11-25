/* Brand Lab engine: five firms, two markets (earbuds and audio glasses), eight segments, brand portfolios,
   perceptual positioning from physical attributes and advertising, sales forces by channel, R&D projects,
   market research studies and a stock price index. Deterministic for a seed and a decision list.
   Units: thousands of units; prices in $; budgets in $k; reports in $M unless noted. */
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

  /* ---------- Markets ---------- */
  const MARKETS = {
    E: { id: 'E', name: 'Earbuds', dims: ['Performance', 'Lifestyle'], ref: 400, rdBase: 650, rdPeriods: 1,
      attrs: [
        { k: 'snd', name: 'Sound fidelity', min: 1, max: 10, step: 0.1, dec: 1, unit: '/10' },
        { k: 'anc', name: 'Noise cancelling', min: 0, max: 10, step: 0.1, dec: 1, unit: '/10' },
        { k: 'bat', name: 'Battery life', min: 3, max: 18, step: 0.5, dec: 1, unit: 'h' },
        { k: 'wt', name: 'Weight per bud', min: 3, max: 8, step: 0.1, dec: 1, unit: 'g', low: true },
        { k: 'dsg', name: 'Design', min: 1, max: 10, step: 0.1, dec: 1, unit: '/10' }],
      perc: a => ({ x: 0.45 * a.snd + 0.35 * a.anc + 0.20 * (a.bat - 4), y: 0.55 * a.dsg + 0.45 * (8 - a.wt) * (10 / 4.5) }),
      cost: a => 9 + 2.6 * a.snd + 3.2 * a.anc + 1.4 * (a.bat - 4) + 2.5 * (8 - a.wt) + 1.8 * a.dsg,
      frontier: t => ({ snd: 8.2 + 0.25 * t, anc: 7.2 + 0.4 * t, bat: 9.5 + 0.7 * t, wt: Math.max(3, 4.4 - 0.13 * t), dsg: 9.6 }) },
    G: { id: 'G', name: 'Audio glasses', dims: ['Tech', 'Comfort'], ref: 60, rdBase: 2200, rdPeriods: 2,
      attrs: [
        { k: 'snd', name: 'Sound fidelity', min: 1, max: 10, step: 0.1, dec: 1, unit: '/10' },
        { k: 'ar', name: 'Smart features', min: 0, max: 10, step: 0.1, dec: 1, unit: '/10' },
        { k: 'bat', name: 'Battery life', min: 2, max: 14, step: 0.5, dec: 1, unit: 'h' },
        { k: 'wt', name: 'Weight', min: 25, max: 70, step: 1, dec: 0, unit: 'g', low: true },
        { k: 'dsg', name: 'Design', min: 1, max: 10, step: 0.1, dec: 1, unit: '/10' }],
      perc: a => ({ x: 0.5 * a.ar + 0.3 * a.snd + 0.2 * (a.bat - 2), y: 0.5 * a.dsg + 0.5 * (70 - a.wt) / 4 }),
      cost: a => 25 + 3.5 * a.snd + 6 * a.ar + 2 * (a.bat - 2) + 1.0 * (70 - a.wt) + 2 * a.dsg,
      frontier: t => ({ snd: 6.2 + 0.35 * t, ar: 4.2 + 0.7 * t, bat: 5 + 0.8 * t, wt: Math.max(25, 56 - 3.2 * t), dsg: 8.5 + 0.15 * t }) }
  };
  const CHANNELS = [{ id: 'spec', name: 'Specialty stores', margin: 0.40, k: 20 }, { id: 'box', name: 'Big-box retail', margin: 0.30, k: 30 }, { id: 'web', name: 'Online', margin: 0.18, k: 12 }];
  const SF_COST = 55, SF_HIRE = 12, SF_FIRE = 20;
  /* Segment ideal attribute vectors at period 1 and their drift per period; ideal (x, y) comes from the market's perception map. */
  const SEGS = [
    { id: 'aud', m: 'E', name: 'Audiophiles', size: 400, growth: 0.04, ideal: { snd: 9.0, anc: 7.5, bat: 9, wt: 6.0, dsg: 5.0 }, drift: { snd: 0.15, anc: 0.2, bat: 0.45, wt: -0.05, dsg: 0.1 }, price: 240, pDrift: -0.01, el: 0.9, ch: [0.55, 0.15, 0.30],
      who: 'Music lovers who judge on sound first and will pay for it. They read reviews and buy in specialty stores.' },
    { id: 'com', m: 'E', name: 'Commuters', size: 1200, growth: 0.08, ideal: { snd: 6.5, anc: 7.0, bat: 10, wt: 5.5, dsg: 6.0 }, drift: { snd: 0.12, anc: 0.25, bat: 0.55, wt: -0.08, dsg: 0.1 }, price: 160, pDrift: -0.02, el: 1.5, ch: [0.25, 0.35, 0.40],
      who: 'Daily travellers who want quiet and all-day battery at a sensible price.' },
    { id: 'act', m: 'E', name: 'Active', size: 900, growth: 0.11, ideal: { snd: 5.0, anc: 2.0, bat: 7, wt: 4.5, dsg: 6.5 }, drift: { snd: 0.1, anc: 0.2, bat: 0.4, wt: -0.1, dsg: 0.15 }, price: 110, pDrift: -0.02, el: 1.8, ch: [0.15, 0.40, 0.45],
      who: 'Runners and gym-goers. Light, secure and good-looking matters more than studio sound.' },
    { id: 'trd', m: 'E', name: 'Trendsetters', size: 550, growth: 0.09, ideal: { snd: 6.5, anc: 6.0, bat: 7, wt: 4.8, dsg: 9.5 }, drift: { snd: 0.1, anc: 0.2, bat: 0.3, wt: -0.08, dsg: 0.05 }, price: 210, pDrift: -0.01, el: 1.0, ch: [0.40, 0.25, 0.35],
      who: 'Style-led buyers for whom earbuds are an accessory. Design and brand image first.' },
    { id: 'val', m: 'E', name: 'Value', size: 1750, growth: 0.01, ideal: { snd: 3.5, anc: 0.5, bat: 5, wt: 6.5, dsg: 3.5 }, drift: { snd: 0.1, anc: 0.15, bat: 0.3, wt: -0.05, dsg: 0.05 }, price: 50, pDrift: -0.02, el: 2.2, ch: [0.05, 0.55, 0.40],
      who: 'Students and replacement buyers. They want something that works, cheaply.' },
    { id: 'inn', m: 'G', name: 'Innovators', open: 3, path: [0, 0, 0, 70, 140, 210, 260, 290, 310], ideal: { snd: 7.0, ar: 8.0, bat: 6, wt: 45, dsg: 6.0 }, drift: { snd: 0.2, ar: 0.4, bat: 0.6, wt: -2, dsg: 0.1 }, price: 420, pDrift: -0.05, el: 0.7, ch: [0.55, 0.10, 0.35],
      who: 'Tech enthusiasts who buy first and forgive rough edges if the features are there.' },
    { id: 'pro', m: 'G', name: 'Professionals', open: 3, path: [0, 0, 0, 40, 100, 180, 280, 380, 460], ideal: { snd: 6.5, ar: 6.0, bat: 9, wt: 38, dsg: 7.5 }, drift: { snd: 0.15, ar: 0.3, bat: 0.6, wt: -2, dsg: 0.1 }, price: 360, pDrift: -0.04, el: 1.1, ch: [0.30, 0.25, 0.45],
      who: 'Consultants and field workers who wear them all day: comfort and battery decide.' },
    { id: 'fol', m: 'G', name: 'Followers', open: 5, path: [0, 0, 0, 0, 0, 80, 220, 420, 680], ideal: { snd: 5.5, ar: 4.0, bat: 6, wt: 42, dsg: 6.5 }, drift: { snd: 0.15, ar: 0.3, bat: 0.5, wt: -1.5, dsg: 0.1 }, price: 260, pDrift: -0.05, el: 2.0, ch: [0.15, 0.45, 0.40],
      who: 'The mainstream, who arrive once the category is proven and prices fall.' }
  ];
  const STUDIES = [
    { id: 'survey', name: 'Consumer survey', cost: 120, what: 'Brand awareness and purchase intentions by segment, and where each segment shops.' },
    { id: 'panel', name: 'Consumer panel', cost: 100, what: 'Unit market shares of every brand in every segment.' },
    { id: 'dist', name: 'Distribution panel', cost: 80, what: 'Sales by channel and each firm’s store coverage.' },
    { id: 'semantic', name: 'Semantic scales', cost: 60, what: 'What each segment ideally wants on every attribute, and how each brand is perceived.' },
    { id: 'mds', name: 'Perceptual map', cost: 100, what: 'Where every brand and every segment’s ideal point sit on the perceptual map.' },
    { id: 'forecast', name: 'Market forecast', cost: 50, what: 'Expected size of every segment next period.' },
    { id: 'compAds', name: 'Competitive advertising', cost: 60, what: 'Rivals’ advertising budgets by brand.' },
    { id: 'compSF', name: 'Competitive sales forces', cost: 40, what: 'Rivals’ salespeople by channel.' },
    { id: 'conjoint', name: 'Conjoint analysis', cost: 80, what: 'How much each attribute level is worth to one segment.' }
  ];
  const FIRMS = [
    { id: 'you', name: 'Aria Audio', short: 'Aria', letter: 'A', sf: [18, 28, 16], brands: [
      { name: 'AURA', m: 'E', a: { snd: 6.3, anc: 6.0, bat: 8.5, wt: 5.8, dsg: 5.6 }, price: 162, aw: 0.55, ads: 3000, cum: 1400 },
      { name: 'ALTO', m: 'E', a: { snd: 3.2, anc: 0.3, bat: 5, wt: 6.6, dsg: 3.2 }, price: 48, aw: 0.55, ads: 1800, cum: 2600 }] },
    { id: 'bor', name: 'Boreal Sound', short: 'Boreal', letter: 'B', ai: 'value', sf: [12, 38, 14], brands: [
      { name: 'BASS', m: 'E', a: { snd: 3.3, anc: 0.5, bat: 5.5, wt: 6.5, dsg: 3.3 }, price: 47, aw: 0.6, ads: 1700, cum: 3200 },
      { name: 'BOLT', m: 'E', a: { snd: 5.0, anc: 2.2, bat: 6.5, wt: 5.0, dsg: 6.4 }, price: 114, aw: 0.75, ads: 3000, cum: 1300 }] },
    { id: 'cad', name: 'Cadence', short: 'Cadence', letter: 'C', ai: 'performance', sf: [26, 16, 14], brands: [
      { name: 'CLEF', m: 'E', a: { snd: 8.4, anc: 7.0, bat: 8.5, wt: 6.3, dsg: 4.8 }, price: 245, aw: 0.55, ads: 3000, cum: 500 },
      { name: 'CORE', m: 'E', a: { snd: 6.1, anc: 6.1, bat: 8.5, wt: 6.0, dsg: 5.2 }, price: 160, aw: 0.55, ads: 2800, cum: 1100 }] },
    { id: 'del', name: 'Delphi', short: 'Delphi', letter: 'D', ai: 'lifestyle', sf: [22, 22, 16], brands: [
      { name: 'DUNE', m: 'E', a: { snd: 5.8, anc: 4.5, bat: 6.0, wt: 5.3, dsg: 8.6 }, price: 215, aw: 0.36, ads: 3000, cum: 700 },
      { name: 'DART', m: 'E', a: { snd: 4.6, anc: 2.0, bat: 6, wt: 5.3, dsg: 6.4 }, price: 104, aw: 0.45, ads: 2600, cum: 1100 }] },
    { id: 'equ', name: 'Equinox', short: 'Equinox', letter: 'E', ai: 'follower', sf: [16, 30, 14], brands: [
      { name: 'ECHO', m: 'E', a: { snd: 6.4, anc: 6.6, bat: 8.5, wt: 5.9, dsg: 5.3 }, price: 156, aw: 0.55, ads: 2800, cum: 1200 },
      { name: 'EASY', m: 'E', a: { snd: 3.1, anc: 0.4, bat: 5.5, wt: 6.6, dsg: 3.5 }, price: 46, aw: 0.6, ads: 2200, cum: 3000 }] }
  ];
  /* AI playbooks: which segment each brand serves, pricing, spending, launches. */
  const AI = {
    value: { label: 'Volume player', blurb: 'Owns the Value segment with low prices and big-box distribution, adds an Active brand and never enters glasses.', priceF: 0.92, adsF: 0.9, sfMix: [0.15, 0.6, 0.25], targets: { BASS: 'val', BOLT: 'act' }, launches: [{ t: 3, m: 'E', seg: 'act', name: 'BRIO' }] },
    performance: { label: 'Performance specialist', blurb: 'Leads on sound and noise cancelling in Audiophiles and Commuters, spends heavily on R&D and enters glasses first.', priceF: 1.05, adsF: 1.0, sfMix: [0.45, 0.25, 0.30], targets: { CLEF: 'aud', CORE: 'com' }, launches: [{ t: 2, m: 'G', seg: 'inn', name: 'CYAN' }, { t: 5, m: 'G', seg: 'pro', name: 'CREW' }] },
    lifestyle: { label: 'Lifestyle brand', blurb: 'Builds image-led brands for Trendsetters and Active buyers with heavy advertising, then a design-led pair of glasses.', priceF: 1.08, adsF: 1.25, sfMix: [0.40, 0.25, 0.35], targets: { DUNE: 'trd', DART: 'act' }, launches: [{ t: 4, m: 'G', seg: 'pro', name: 'DIVA' }] },
    follower: { label: 'Fast follower', blurb: 'Copies whatever leads in Commuters and Value at slightly lower prices and enters glasses late and cheap.', priceF: 0.95, adsF: 0.95, sfMix: [0.25, 0.45, 0.30], targets: { ECHO: 'com', EASY: 'val' }, launches: [{ t: 5, m: 'G', seg: 'fol', name: 'EDGE' }] }
  };
  const MAX_BRANDS = 5, POS_SD = 1.4, U0 = 0.15, GAMMA = 2.0, HOLD = 0.15;

  /* ---------- Segment state by period ---------- */
  function segAt(g, i, t) {
    const S = SEGS[i], M = MARKETS[S.m];
    const k = Math.max(0, t - (S.m === 'G' ? 3 : 1));
    const ideal = {}; Object.keys(S.ideal).forEach(a => { ideal[a] = S.ideal[a] + S.drift[a] * k; });
    const p = M.perc(ideal);
    const last = g.sizes.length - 1;
    const size = S.m === 'E' ? (t <= last ? g.sizes[t][i] : r1(g.sizes[last][i] * Math.pow(1 + S.growth, t - last))) : (S.path[Math.min(t, S.path.length - 1)] || 0) * (t >= S.path.length ? Math.pow(1.08, t - S.path.length + 1) : 1) * g.gScale[i];
    const ch = S.ch.map((c, j) => c + [-0.01, -0.01, 0.02][j] * t); const cs = sum(ch);
    return { i, id: S.id, m: S.m, name: S.name, size, ideal, x: p.x, y: p.y, price: S.price * Math.pow(1 + S.pDrift, Math.max(0, t - (S.open || 1))), el: S.el, ch: ch.map(c => c / cs), growth: S.growth };
  }
  const segsAt = (g, t) => SEGS.map((s, i) => segAt(g, i, t));

  /* ---------- Small models ---------- */
  const coverage = (n, c) => n / (n + CHANNELS[c].k);
  const adEff = (ads, rsch) => ads * (1 - rsch) * (1 + 1.2 * (1 - Math.exp(-rsch / 0.06)));
  const awNext = (aw, eff) => clamp(aw * 0.75 + (1 - aw * 0.75) * 0.72 * (1 - Math.exp(-eff / 4200)), 0, 0.98);
  function priceScore(price, ideal, el) {
    const dr = Math.max(0.05, price / ideal) - 1;
    if (dr >= 0) return Math.exp(-el * dr - 1.5 * el * dr * dr);
    const c = Math.min(-dr, 0.6);
    return Math.exp(el * (c - 0.8 * c * c));
  }
  function unitCost(m, a, cum) { const M = MARKETS[m]; return M.cost(a) * clamp(Math.pow(Math.max(1, cum) / M.ref, -0.12), 0.7, 1.35); }
  function frontier(m, t) { return MARKETS[m].frontier(t); }
  /* Snap a value to the attribute's step without crossing the frontier or the scale. */
  function onGrid(a, v, F) {
    const st = a.step, lim = a.low ? Math.ceil((F - 1e-9) / st) * st : Math.floor((F + 1e-9) / st) * st;
    let x = Math.round(v / st) * st;
    x = a.low ? Math.max(x, lim) : Math.min(x, lim);
    return Math.round(clamp(x, a.min, a.max) * 100) / 100;
  }
  function feasible(m, a, t) {
    const F = frontier(m, t), bad = [];
    MARKETS[m].attrs.forEach(d => { const v = a[d.k], tol = d.step / 2 + 1e-9; if (!isFinite(v) || v < d.min - 1e-9 || v > d.max + 1e-9) bad.push(d.k); else if (d.low ? v < F[d.k] - tol : v > F[d.k] + tol) bad.push(d.k); });
    return bad;
  }
  function projectCost(m, a, t, firstG) {
    const M = MARKETS[m], F = frontier(m, t);
    let k = 0.6;
    M.attrs.forEach(d => { const lo = d.low ? d.max : d.min, hi = F[d.k]; const s = clamp((a[d.k] - lo) / (hi - lo), 0, 1.2); k += 0.5 * s * s * s; });
    return { cost: Math.round(M.rdBase * k), periods: m === 'G' && firstG ? M.rdPeriods : 1 };
  }

  /* ---------- Setup ---------- */
  function create(seed, config) {
    const cfg = config || {};
    const years = cfg.length === 'short' ? 6 : 8;
    const g = { v: 1, seed, years, cfg: { difficulty: (['guided', 'standard', 'expert'].indexOf(cfg.difficulty) >= 0 ? cfg.difficulty : 'guided'), length: years === 6 ? 'short' : 'full' }, t: 0, rng: RNG.make(seed), firms: [], brands: [], projects: [], reports: [], nextBrand: 1, nextProject: 1, draft: null };
    g.sizes = [SEGS.map(s => (s.m === 'E' ? s.size / (1 + s.growth) : 0))];
    for (let t = 1; t <= years + 1; t++) g.sizes.push(SEGS.map((s, i) => (s.m === 'E' ? r1(g.sizes[t - 1][i] * (1 + s.growth + 0.02 * clamp(RNG.normal(g.rng), -2, 2))) : 0)));
    g.gScale = SEGS.map(() => 0.85 + 0.3 * RNG.next(g.rng));
    FIRMS.forEach(F => {
      const f = { id: F.id, name: F.name, short: F.short, letter: F.letter, ai: F.ai || null, sf: F.sf.slice(), budget: 16000, spi: 1000, cumNmc: 0, hist: [], jit: { p: 1 + 0.04 * clamp(RNG.normal(g.rng), -1.5, 1.5), a: 1 + 0.08 * clamp(RNG.normal(g.rng), -1.5, 1.5) }, gProjects: 0 };
      g.firms.push(f);
      F.brands.forEach(b => g.brands.push(newBrand(g, f, b.name, b.m, b.a, { price: b.price, aw: b.aw, ads: b.ads, cum: b.cum })));
    });
    g.brands.forEach(b => { b.inv = 0; });
    processPeriod(g, null);
    g.draft = defaultDraft(g);
    return g;
  }
  function newBrand(g, f, name, m, a, o) {
    const p = MARKETS[m].perc(a);
    return { id: 'b' + (g.nextBrand++), firm: f.id, name: String(name).toUpperCase().slice(0, 12), m, a: clone(a), price: o.price || 100, aw: o.aw != null ? o.aw : 0.05, shift: { x: 0, y: 0 }, px: p.x, py: p.y,
      ads: o.ads || 1500, rsch: 0.1, obj: null, prodPlan: 0, inv: o.inv || 0, invCost: 0, cum: o.cum || 0, active: true, born: g.t, version: 1, last: null };
  }
  const firmOf = (g, id) => g.firms.find(f => f.id === id);
  const brandsOf = (g, f) => g.brands.filter(b => b.firm === f.id && b.active);
  const you = g => g.firms[0];
  const perceived = b => ({ x: b.px + b.shift.x, y: b.py + b.shift.y });

  /* ---------- Decisions ---------- */
  function statusQuo(g, f, E) {
    const d = { brands: {}, sf: f.sf.slice(), studies: STUDIES.map(s => s.id), projects: [], launches: [] };
    brandsOf(g, f).forEach(b => { const fc = forecastNaive(g, b, E); d.brands[b.id] = { price: b.price, ads: b.ads, rsch: 0.1, obj: null, prod: Math.max(0, Math.round(fc - b.inv)), project: null, withdraw: false }; });
    return d;
  }
  function forecastNaive(g, b, E) {
    if (b.last && b.last.sold > 0) { const segs = E.filter(s => s.m === b.m); const gr = segs.length ? sum(segs.map(s => s.size)) / Math.max(1, sum(segs.map(s => segAt(g, s.i, Math.max(0, g.t - 1)).size))) : 1; return b.last.sold * clamp(gr, 0.8, 1.6); }
    const segs = E.filter(s => s.m === b.m && s.size > 0); if (!segs.length) return 0;
    const best = segs.reduce((a, s) => { const pc = perceived(b), d = Math.hypot((pc.x - s.x) / POS_SD, (pc.y - s.y) / POS_SD); return !a || d < a.d ? { s, d } : a; }, null);
    return best.s.size / Math.max(2, g.brands.filter(x => x.active && x.m === b.m).length) * 0.6;
  }
  function aiDecide(g, f, E) {
    const A = AI[f.ai], t = g.t, d = { brands: {}, sf: f.sf.slice(), studies: [], projects: [], launches: [] };
    const budget = f.budget;
    let spend = 0;
    const tot = sum(f.sf), want = Math.round(clamp(tot + (t <= 3 ? 4 : 2), 40, 110));
    d.sf = A.sfMix.map(x => Math.round(want * x));
    spend += sum(d.sf) * SF_COST;
    const segIdx = id => SEGS.findIndex(s => s.id === id);
    brandsOf(g, f).forEach(b => {
      const targetId = b.target || A.targets[b.name] || (b.m === 'G' ? 'inn' : 'com');
      b.target = targetId;
      const s = E[segIdx(targetId)];
      const dec = { price: b.price, ads: b.ads, rsch: 0.1, obj: null, prod: 0, project: null, withdraw: false };
      if (!s || s.size <= 0) { dec.prod = 0; dec.ads = 400; d.brands[b.id] = dec; return; }
      const losing = b.last && b.prev && b.prev.sold > 0 && b.last.sold < 0.88 * b.prev.sold;
      b.defend = losing ? Math.min(3, (b.defend || 0) + 1) : Math.max(0, (b.defend || 0) - 1);
      dec.price = Math.round(s.price * A.priceF * f.jit.p * (1 - 0.03 * b.defend));
      const share = b.last && b.last.sold > 0 ? b.last.sold : s.size * 0.18;
      dec.ads = Math.round(clamp((b.m === 'G' ? 3200 : 2600) * A.adsF * f.jit.a * (s.m === 'E' ? Math.sqrt(s.size / 900) : 1.1) * (1 + 0.15 * b.defend), 900, 8000) / 100) * 100;
      dec.obj = { x: r1(s.x + (segAt(g, s.i, t + 1).x - s.x)), y: r1(s.y + (segAt(g, s.i, t + 1).y - s.y)) };
      const next = segAt(g, s.i, t + 1), pc = perceived(b);
      const dist = Math.hypot((pc.x - next.x) / POS_SD, (pc.y - next.y) / POS_SD);
      const rivalCloser = g.brands.some(o => o.active && o.firm !== f.id && o.m === b.m && Math.hypot((perceived(o).x - s.x) / POS_SD, (perceived(o).y - s.y) / POS_SD) < dist - 0.15);
      const ready = g.projects.find(p => p.firm === f.id && p.status === 'done' && !p.used && p.m === b.m && p.forBrand === b.id);
      if (ready) dec.project = ready.id;
      else if (dist > (rivalCloser ? 0.4 : 0.55) && !g.projects.some(p => p.firm === f.id && p.status === 'active' && p.forBrand === b.id)) {
        const tgt = {}, F = frontier(b.m, t);
        MARKETS[b.m].attrs.forEach(a => { const v = segAt(g, s.i, t + 1).ideal[a.k]; tgt[a.k] = onGrid(a, a.low ? Math.max(F[a.k], v) : Math.min(F[a.k], v), F[a.k]); });
        const pc2 = projectCost(b.m, tgt, t, false);
        if (spend + pc2.cost < budget * 0.35) { d.projects.push({ m: b.m, a: tgt, forBrand: b.id }); spend += pc2.cost; }
      }
      const fc = (b.last && b.last.demand > 0 ? b.last.demand : share) * (s.m === 'G' ? 1.5 : 1 + s.growth);
      dec.prod = Math.max(0, Math.round(fc * 1.02 - b.inv));
      d.brands[b.id] = dec;
      spend += dec.ads;
    });
    (A.launches || []).forEach(L => {
      if (L.t === t && brandsOf(g, f).length + g.projects.filter(p => p.firm === f.id && p.status !== 'used' && !p.used).length < MAX_BRANDS) {
        const s = E[segIdx(L.seg)], F = frontier(L.m, t + MARKETS[L.m].rdPeriods), tgt = {};
        const fut = segAt(g, s.i, t + 2);
        const F0 = frontier(L.m, t);
        MARKETS[L.m].attrs.forEach(a => { const v = fut.ideal[a.k]; tgt[a.k] = onGrid(a, a.low ? Math.max(F0[a.k], v) : Math.min(F0[a.k], v), F0[a.k]); });
        d.projects.push({ m: L.m, a: tgt, launchAs: L.name, seg: L.seg });
        spend += projectCost(L.m, tgt, t, L.m === 'G' && !f.gProjects).cost;
        void F;
      }
    });
    g.projects.filter(p => p.firm === f.id && p.status === 'done' && !p.used && p.launchAs).forEach(p => {
      if (brandsOf(g, f).length >= MAX_BRANDS) return;
      const s = E[segIdx(p.seg)], others = g.brands.filter(b => b.active && b.m === p.m).length;
      d.launches.push({ project: p.id, name: p.launchAs, seg: p.seg, price: Math.round(s.price * A.priceF), ads: 3000, prod: Math.round(s.size * (p.m === 'G' ? 0.5 : 0.25) / Math.max(1, others)) });
      spend += 3000;
    });
    // scale advertising to fit the budget
    if (spend > budget) {
      const over = spend - budget, adsTot = sum(Object.values(d.brands).map(x => x.ads));
      const k = adsTot > 0 ? clamp(1 - over / adsTot, 0.3, 1) : 1;
      Object.values(d.brands).forEach(x => { x.ads = Math.round(x.ads * k / 100) * 100; });
    }
    return d;
  }
  function spendOf(g, f, d) {
    const cur = f.sf, nsf = d.sf || cur;
    const hire = sum(nsf.map((n, c) => Math.max(0, n - cur[c]))), fire = sum(nsf.map((n, c) => Math.max(0, cur[c] - n)));
    const sf = sum(nsf) * SF_COST + hire * SF_HIRE + fire * SF_FIRE;
    const ads = sum(Object.keys(d.brands || {}).map(id => (d.brands[id].withdraw ? 0 : num(d.brands[id].ads, 0))));
    const studies = sum((d.studies || []).map(id => (STUDIES.find(s => s.id === id) || { cost: 0 }).cost));
    let rd = 0;
    const gFirst = !gDone(g, f);
    (d.projects || []).forEach(p => { const c = projectCost(p.m, p.a, g.t, p.m === 'G' && gFirst); rd += c.cost / c.periods; });
    g.projects.filter(p => p.firm === f.id && p.status === 'active').forEach(p => { rd += p.cost / p.periods; });
    return { sf, ads, studies, rd, total: sf + ads + studies + rd, hire, fire };
  }

  const gDone = (g, f) => g.projects.some(q => q.firm === f.id && q.m === 'G' && q.status === 'done');

  /* ---------- Period processing ---------- */
  function prepare(g, f, d, E) {
    const t = g.t;
    f.spend = spendOf(g, f, d);
    if (t > 0 && f.spend.total > f.budget + 1) {
      const over = f.spend.total - f.budget, ads = f.spend.ads, k = ads > 0 ? clamp(1 - over / ads, 0, 1) : 1;
      Object.values(d.brands || {}).forEach(x => { x.ads = Math.floor(num(x.ads, 0) * k / 10) * 10; });
      f.spend = spendOf(g, f, d); f.trimmed = true;
    } else f.trimmed = false;
    f.sf = (d.sf || f.sf).map(n => clamp(Math.round(num(n, 0)), 0, 200));
    f.studies = (d.studies || []).slice();
    f.cov = f.sf.map((n, c) => coverage(n, c));
    f.writeOff = 0;
    const firstG = !gDone(g, f);
    (d.projects || []).slice(0, 6).forEach(p => {
      if (!p || !MARKETS[p.m] || !p.a) return;
      const a = {}; MARKETS[p.m].attrs.forEach(x => { a[x.k] = num(p.a[x.k], NaN); });
      const bad = feasible(p.m, a, t); if (bad.length) return;
      const c = projectCost(p.m, a, t, p.m === 'G' && firstG);
      if (p.m === 'G') f.gProjects++;
      const seq = g.projects.filter(q => q.firm === f.id && q.m === p.m).length + 1;
      g.projects.push({ id: 'p' + (g.nextProject++), firm: f.id, m: p.m, a, cost: c.cost, periods: c.periods, left: c.periods, status: 'active', started: t, used: false, forBrand: p.forBrand || null, launchAs: p.launchAs || null, seg: p.seg || null, name: f.letter + p.m + '-' + seq });
    });
    Object.keys(d.brands || {}).forEach(id => {
      const b = g.brands.find(x => x.id === id && x.firm === f.id && x.active); if (!b) return;
      const x = d.brands[id];
      if (x.withdraw) { f.writeOff += b.inv * b.invCost * 0.5; b.active = false; b.inv = 0; b.withdrawn = t; return; }
      if (x.project) {
        const p = g.projects.find(q => q.id === x.project && q.firm === f.id && q.status === 'done' && !q.used && q.m === b.m);
        if (p) { if (b.inv > 0) { f.writeOff += b.inv * b.invCost * 0.5; b.inv = 0; } b.a = clone(p.a); const pc = MARKETS[b.m].perc(b.a); b.px = pc.x; b.py = pc.y; b.shift = { x: b.shift.x * 0.3, y: b.shift.y * 0.3 }; b.cum = b.cum * 0.3; b.version++; p.used = true; p.usedBy = b.id; b.revised = t; }
      }
      if (x.seg && SEGS.some(z => z.id === x.seg && z.m === b.m)) b.target = x.seg;
      b.price = clamp(Math.round(num(x.price, b.price)), 10, 1500);
      b.ads = clamp(Math.round(num(x.ads, b.ads)), 0, 20000);
      b.rsch = clamp(num(x.rsch, 0.1), 0, 0.4);
      b.obj = x.obj && isFinite(x.obj.x) && isFinite(x.obj.y) ? { x: +x.obj.x, y: +x.obj.y } : null;
      b.prodPlan = clamp(Math.round(num(x.prod, 0)), 0, 20000);
    });
    (d.launches || []).forEach(L => {
      if (brandsOf(g, f).length >= MAX_BRANDS) return;
      const p = g.projects.find(q => q.id === L.project && q.firm === f.id && q.status === 'done' && !q.used); if (!p) return;
      let name = String(L.name || 'NEW').toUpperCase().replace(/[^A-Z0-9 -]/g, '').trim().slice(0, 12) || 'NEW';
      if (g.brands.some(b => b.name === name)) { let k = 2; while (g.brands.some(b => b.name === name.slice(0, 10) + ' ' + k)) k++; name = name.slice(0, 10) + ' ' + k; }
      const s = SEGS.find(z => z.id === (L.seg || p.seg)) || SEGS.find(z => z.m === p.m);
      const nb = newBrand(g, f, name, p.m, p.a, { price: num(L.price, Math.round(segAt(g, SEGS.indexOf(s), t).price)), aw: 0.05, ads: num(L.ads, 2500), cum: 0 });
      nb.target = L.seg || p.seg || null; nb.prodPlan = Math.round(num(L.prod, 0)); nb.rsch = 0.1; nb.obj = null;
      p.used = true; p.usedBy = nb.id; g.brands.push(nb);
    });
    brandsOf(g, f).forEach(b => {
      const eff = adEff(b.ads, b.rsch);
      b.aw0 = b.aw; b.aw = awNext(b.aw, eff);
      b.shift = { x: b.shift.x * 0.7, y: b.shift.y * 0.7 };
      if (b.obj) {
        const pc = perceived(b), dx = b.obj.x - pc.x, dy = b.obj.y - pc.y, dist = Math.hypot(dx, dy);
        if (dist > 1e-6) { const step = Math.min(dist, 0.55 * eff / 5000); b.shift.x += dx / dist * step; b.shift.y += dy / dist * step; }
        const mag = Math.hypot(b.shift.x, b.shift.y); if (mag > 1.5) { b.shift.x *= 1.5 / mag; b.shift.y *= 1.5 / mag; }
      }
    });
  }
  function allocate(g, E) {
    const live = g.brands.filter(b => b.active);
    live.forEach(b => { b.dem = E.map(() => 0); b.soldSeg = E.map(() => 0); b.u = E.map(() => 0); });
    E.forEach((s, i) => {
      if (s.size <= 0) return;
      const cands = live.filter(b => b.m === s.m);
      cands.forEach(b => {
        const f = firmOf(g, b.firm), pc = perceived(b), d = Math.hypot((pc.x - s.x) / POS_SD, (pc.y - s.y) / POS_SD);
        const acc = sum(s.ch.map((c, j) => c * f.cov[j]));
        b.u[i] = Math.exp(-0.5 * d * d) * priceScore(b.price, s.price, s.el) * (0.12 + 0.88 * (b.aw0 + b.aw) / 2) * (0.1 + 0.9 * acc);
      });
      const tot = sum(cands.map(b => Math.pow(b.u[i], GAMMA))), den = tot + Math.pow(U0, GAMMA);
      s.buyRate = den > 0 ? tot / den : 0;
      cands.forEach(b => { b.dem[i] = den > 0 ? s.size * Math.pow(b.u[i], GAMMA) / den : 0; });
    });
    live.forEach(b => {
      b.demand = sum(b.dem);
      const plan = b.prodPlan, need = Math.max(0, b.demand - b.inv);
      b.prod = plan > 0 ? clamp(need, 0.8 * plan, 1.2 * plan) : 0;
      b.avail = b.inv + b.prod;
      const ratio = b.demand > 0 ? Math.min(1, b.avail / b.demand) : 1;
      b.soldSeg = b.dem.map(x => x * ratio);
      b.spare = b.avail - sum(b.soldSeg);
    });
    E.forEach((s, i) => {
      const lost = sum(live.map(b => Math.max(0, b.dem[i] - b.soldSeg[i])));
      if (lost <= 0) return;
      const pool = 0.6 * lost, cands = live.filter(b => b.m === s.m && b.spare > 1e-6 && b.u[i] > 0), w = sum(cands.map(b => Math.pow(b.u[i], GAMMA)));
      cands.forEach(b => { const add = Math.min(b.spare, w > 0 ? pool * Math.pow(b.u[i], GAMMA) / w : 0); b.soldSeg[i] += add; b.spare -= add; });
    });
    live.forEach(b => { b.sold = sum(b.soldSeg); b.spill = Math.max(0, b.sold - Math.min(b.demand, b.avail)); b.stockout = b.demand > 0.5 && b.sold < b.demand * 0.97 && b.spare < 0.5; });
  }
  function close(g, f, E) {
    let rev = 0, cogs = 0, hold = 0, units = 0;
    const lines = [], chUnits = [0, 0, 0];
    brandsOf(g, f).forEach(b => {
      const uc = unitCost(b.m, b.a, b.cum + b.prod / 2);
      const totalUnits = b.inv + b.prod, avgC = totalUnits > 0 ? (b.inv * (b.invCost || uc) + b.prod * uc) / totalUnits : uc;
      let r = 0; const chU = [0, 0, 0];
      E.forEach((s, i) => { if (!b.soldSeg[i]) return; const acc = s.ch.map((c, j) => c * f.cov[j]), at = sum(acc) || 1; acc.forEach((a, j) => { const u = b.soldSeg[i] * a / at; chU[j] += u; r += u * b.price * (1 - CHANNELS[j].margin) / 1000; }); });
      const c = b.sold * avgC / 1000, endInv = Math.max(0, totalUnits - b.sold), h = HOLD * endInv * avgC / 1000;
      b.cum += b.prod; b.inv = endInv; b.invCost = avgC; b.unitCost = uc; b.chU = chU.slice(); b.rev = r;
      rev += r; cogs += c; hold += h; units += b.sold; chU.forEach((u, j) => { chUnits[j] += u; });
      lines.push({ id: b.id, name: b.name, m: b.m, units: b.sold, rev: r, cogs: c, hold: h, cbm: r - c - h, ads: b.ads / 1000, nmc: r - c - h - b.ads / 1000, unitCost: uc, netPrice: b.sold > 0 ? r * 1000 / b.sold : 0 });
    });
    const sp = f.spend;
    const cbm = rev - cogs - hold;
    const nmc = cbm - sp.ads / 1000 - sp.sf / 1000 - sp.studies / 1000 - sp.rd / 1000 - f.writeOff / 1000;
    f.cumNmc += g.t > 0 ? nmc : 0;
    return { rev, cogs, hold, cbm, ads: sp.ads / 1000, sf: sp.sf / 1000, studies: sp.studies / 1000, rd: sp.rd / 1000, writeOff: f.writeOff / 1000, nmc, units, lines, chUnits, budget: f.budget / 1000, spent: sp.total / 1000 };
  }
  function processPeriod(g, userDec) {
    const t = g.t, E = segsAt(g, t);
    const decs = {};
    g.firms.forEach(f => { decs[f.id] = t === 0 ? statusQuo(g, f, E) : f.id === 'you' ? (userDec || statusQuo(g, f, E)) : aiDecide(g, f, E); });
    if (t === 0 && g.cfg.difficulty !== 'guided') decs.you.studies = ['survey', 'panel', 'mds'];
    if (decs.you && decs.you.conjointSeg && SEGS.some(z => z.id === decs.you.conjointSeg)) g.conjointSeg = decs.you.conjointSeg;
    g.firms.forEach(f => prepare(g, f, decs[f.id], E));
    if (t === 0) { g.brands.forEach(b => { b.prodPlan = 1; }); allocate(g, E); g.brands.forEach(b => { b.prodPlan = Math.round(b.demand); b.inv = Math.round(b.demand * 0.08); b.invCost = unitCost(b.m, b.a, b.cum); }); }
    allocate(g, E);
    const res = {};
    g.firms.forEach(f => { res[f.id] = close(g, f, E); f.hist.push(res[f.id]); });
    // market shares and stock price index
    const mkt = { E: { units: 0, value: 0 }, G: { units: 0, value: 0 } };
    g.brands.filter(b => b.active).forEach(b => { mkt[b.m].units += b.sold; mkt[b.m].value += b.sold * b.price; });
    const totVal = mkt.E.value + mkt.G.value;
    if (t === 0) g.nmcRef = Math.max(1, sum(g.firms.map(f => res[f.id].nmc)) / g.firms.length);
    g.firms.forEach(f => {
      const R = res[f.id];
      const val = sum(brandsOf(g, f).map(b => b.sold * b.price));
      R.valShare = totVal > 0 ? val / totVal : 0;
      R.unitShare = (mkt.E.units + mkt.G.units) > 0 ? R.units / (mkt.E.units + mkt.G.units) : 0;
      R.gShare = mkt.G.value > 0 ? sum(brandsOf(g, f).filter(b => b.m === 'G').map(b => b.sold * b.price)) / mkt.G.value : 0;
      if (t === 0) { f.val0 = Math.max(0.01, R.valShare); f.rev0 = R.rev; f.spi = 1000; }
      else {
        const prev = f.hist.length > 1 ? f.hist[f.hist.length - 2] : R;
        const growth = prev.rev > 0 ? R.rev / prev.rev - 1 : 0;
        const V = 1000 * (0.42 * clamp(R.nmc / g.nmcRef, -1, 4) + 0.33 * R.valShare / 0.2 + 0.25 * (1 + 2 * clamp(growth, -0.3, 0.5)));
        f.spi = Math.max(50, Math.round(0.5 * f.spi + 0.5 * V));
      }
      R.spi = f.spi; R.cumNmc = f.cumNmc;
      f.budget = Math.round(clamp(10000 + 0.3 * Math.max(0, R.nmc) * 1000, 10000, 45000) / 100) * 100;
      R.budgetNext = f.budget / 1000;
    });
    snapshot(g, t, E, res, decs);
    advance(g);
  }
  function snapshot(g, t, E, res, decs) {
    const brands = g.brands.filter(b => b.active || b.withdrawn === t).map(b => {
      const pc = perceived(b), f = firmOf(g, b.firm);
      return { id: b.id, firm: b.firm, name: b.name, m: b.m, a: clone(b.a), x: pc.x, y: pc.y, px: b.px, py: b.py, price: b.price, ads: b.ads, rsch: b.rsch, obj: b.obj, aw: b.aw, prodPlan: b.prodPlan, prod: b.prod || 0, inv: b.inv, demand: b.demand || 0, sold: b.sold || 0, stockout: !!b.stockout,
        dem: (b.dem || E.map(() => 0)).slice(), soldSeg: (b.soldSeg || E.map(() => 0)).slice(), u: (b.u || E.map(() => 0)).map(x => Math.round(x * 1000) / 1000), unitCost: b.unitCost || 0, chU: (b.chU || [0, 0, 0]).slice(), spill: b.spill || 0, rev: b.rev || 0, version: b.version, revised: b.revised === t, born: b.born, active: b.active, withdrawn: b.withdrawn === t, target: b.target || null, sfCov: f.cov.slice() };
    });
    const segs = E.map((s, i) => ({ id: s.id, m: s.m, name: s.name, size: s.size, sold: sum(brands.map(b => b.soldSeg[i])), buyRate: s.buyRate || 0, x: s.x, y: s.y, ideal: clone(s.ideal), price: s.price, el: s.el, ch: s.ch.slice(), next: segAt(g, i, t + 1).size, next2: segAt(g, i, t + 2).size, nextX: segAt(g, i, t + 1).x, nextY: segAt(g, i, t + 1).y, nextIdeal: clone(segAt(g, i, t + 1).ideal) }));
    const firms = g.firms.map(f => ({ id: f.id, name: f.name, short: f.short, letter: f.letter, ai: f.ai, res: res[f.id], sf: f.sf.slice(), cov: f.cov.slice(), studies: f.studies.slice() }));
    const studies = (decs.you && decs.you.studies) || [];
    const cj = studies.indexOf('conjoint') >= 0 ? (decs.you.conjointSeg && SEGS.some(z => z.id === decs.you.conjointSeg) ? decs.you.conjointSeg : 'com') : null;
    g.reports.push({ t, segs, brands, firms, you: decs.you ? clone(decs.you) : null, studies, conjoint: cj ? conjoint(g, SEGS.findIndex(z => z.id === cj), t) : null, frontier: { E: frontier('E', t), G: frontier('G', t) }, projects: g.projects.filter(p => p.firm === 'you').map(p => clone(p)) });
    g.brands.forEach(b => { if (b.active) { b.prev = b.last || null; b.last = { demand: b.demand || 0, sold: b.sold || 0, stockout: !!b.stockout }; } });
  }
  function advance(g) {
    g.projects.forEach(p => { if (p.status === 'active') { p.left--; if (p.left <= 0) { p.status = 'done'; p.doneAt = g.t; } } });
    g.t++;
  }

  /* ---------- Interface helpers ---------- */
  function nearestSeg(g, b, t) {
    const pc = perceived(b); let best = null;
    segsAt(g, t).forEach(s => { if (s.m !== b.m) return; const d = Math.hypot(pc.x - s.x, pc.y - s.y) - (s.size > 0 ? 0 : 5); if (!best || d < best.d) best = { id: s.id, d }; });
    return best ? best.id : null;
  }
  function defaultDraft(g) {
    const f = you(g), E = segsAt(g, g.t), prev = g.reports.length ? g.reports[g.reports.length - 1].you : null;
    const d = { brands: {}, sf: f.sf.slice(), studies: prev && prev.studies && g.t > 1 ? prev.studies.slice() : ['survey', 'panel', 'mds', 'semantic'], projects: [], launches: [], conjointSeg: g.conjointSeg || 'com' };
    brandsOf(g, f).forEach(b => { d.brands[b.id] = { price: b.price, ads: b.ads, rsch: b.rsch == null ? 0.1 : b.rsch, obj: b.obj ? clone(b.obj) : null, prod: 0, project: null, withdraw: false, seg: b.target || nearestSeg(g, b, g.t) }; });
    const auto = autoForecast(g, d);
    brandsOf(g, f).forEach(b => { d.brands[b.id].prod = Math.max(0, Math.round(auto[b.id] - b.inv)); });
    void E;
    return d;
  }
  function autoForecast(g, d) {
    const out = {}, E = segsAt(g, g.t), est = g.cfg.difficulty === 'expert' ? null : estimate(g, d);
    brandsOf(g, you(g)).forEach(b => { out[b.id] = est ? est[b.id].demand : forecastNaive(g, b, E); });
    (d.launches || []).forEach((L, k) => { out['new' + k] = est && est['new' + k] ? est['new' + k].demand : 0; });
    return out;
  }
  /* Demand estimate for the user's plan, assuming rivals keep last period's positions, prices and spending. */
  function estimate(g, d) {
    const t = g.t, E = segsAt(g, t), f = you(g), rep = g.reports[g.reports.length - 1], prev = g.reports.length > 1 ? g.reports[g.reports.length - 2] : null;
    const cov = (d.sf || f.sf).map((n, c) => coverage(num(n, 0), c));
    const items = [];
    g.brands.filter(b => b.active).forEach(b => {
      if (b.firm === 'you') {
        const x = d.brands[b.id] || {}; if (x.withdraw) return;
        let a = b.a, px = b.px, py = b.py, shift = { x: b.shift.x * 0.7, y: b.shift.y * 0.7 };
        if (x.project) { const p = g.projects.find(q => q.id === x.project && q.status === 'done' && !q.used); if (p) { a = p.a; const pc = MARKETS[b.m].perc(a); px = pc.x; py = pc.y; shift = { x: b.shift.x * 0.21, y: b.shift.y * 0.21 }; } }
        const eff = adEff(num(x.ads, b.ads), num(x.rsch, 0.1)), aw = awNext(b.aw, eff);
        if (x.obj) { const cx = px + shift.x, cy = py + shift.y, dx = x.obj.x - cx, dy = x.obj.y - cy, dist = Math.hypot(dx, dy); if (dist > 1e-6) { const st = Math.min(dist, 0.55 * eff / 5000); shift.x += dx / dist * st; shift.y += dy / dist * st; } }
        items.push({ id: b.id, mine: true, m: b.m, x: px + shift.x, y: py + shift.y, price: num(x.price, b.price), aw: (b.aw + aw) / 2, cov });
      } else {
        const rb = rep.brands.find(z => z.id === b.id); if (!rb) return;
        const pb = prev && prev.brands.find(z => z.id === b.id), mx = pb ? (rb.x - pb.x) * 0.6 : 0, my = pb ? (rb.y - pb.y) * 0.6 : 0;
        const awR = awNext(b.aw, adEff(rb.ads, rb.rsch || 0.1));
        items.push({ id: b.id, m: b.m, x: rb.x + mx, y: rb.y + my, price: rb.price, aw: (b.aw + awR) / 2, cov: firmOf(g, b.firm).cov });
      }
    });
    (d.launches || []).forEach((L, k) => {
      const p = g.projects.find(q => q.id === L.project && q.firm === 'you' && q.status === 'done' && !q.used); if (!p) return;
      const pc = MARKETS[p.m].perc(p.a), eff = adEff(num(L.ads, 2500), 0.1), aw = awNext(0.05, eff);
      items.push({ id: 'new' + k, mine: true, m: p.m, x: pc.x, y: pc.y, price: num(L.price, 100), aw: (0.05 + aw) / 2, cov });
    });
    const out = {};
    E.forEach((s, i) => {
      if (s.size <= 0) return;
      const cands = items.filter(it => it.m === s.m);
      const us = cands.map(it => { const dd = Math.hypot((it.x - s.x) / POS_SD, (it.y - s.y) / POS_SD); const acc = sum(s.ch.map((c, j) => c * it.cov[j])); return Math.exp(-0.5 * dd * dd) * priceScore(it.price, s.price, s.el) * (0.12 + 0.88 * it.aw) * (0.1 + 0.9 * acc); });
      const tot = sum(us.map(u => Math.pow(u, GAMMA))), den = tot + Math.pow(U0, GAMMA);
      cands.forEach((it, k) => { if (!it.mine) return; const o = out[it.id] || (out[it.id] = { demand: 0, seg: E.map(() => 0) }); const dm = den > 0 ? s.size * Math.pow(us[k], GAMMA) / den : 0; o.seg[i] = dm; o.demand += dm; });
    });
    items.filter(it => it.mine && !out[it.id]).forEach(it => { out[it.id] = { demand: 0, seg: E.map(() => 0) }; });
    return out;
  }
  function budgetUse(g, d) { return spendOf(g, you(g), d); }
  /* Conjoint study: relative utility of attribute levels and prices for one segment, other attributes held at the segment ideal. */
  function conjoint(g, i, t) {
    const s = segAt(g, i, t), M = MARKETS[s.m];
    const util = a => { const p = M.perc(a); const d = Math.hypot((p.x - s.x) / POS_SD, (p.y - s.y) / POS_SD); return Math.exp(-0.5 * d * d); };
    const attrs = M.attrs.map(at => {
      const span = at.max - at.min, lv = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round((at.min + f * span) / at.step) * at.step);
      const vals = lv.map(v => { const a = clone(s.ideal); a[at.k] = v; return util(a); });
      const range = Math.max(...vals) - Math.min(...vals);
      return { k: at.k, name: at.name, unit: at.unit, levels: lv, utils: vals.map(v => Math.round(v * 100)), range };
    });
    const prices = [0.7, 0.85, 1, 1.15, 1.3, 1.5].map(f => ({ price: Math.round(s.price * f), util: Math.round(priceScore(s.price * f, s.price, s.el) * 100) }));
    const pr = Math.max(...prices.map(p => p.util)) - Math.min(...prices.map(p => p.util));
    const tot = attrs.reduce((a, x) => a + x.range * 100, 0) + pr;
    attrs.forEach(x => { x.importance = tot > 0 ? x.range * 100 / tot : 0; });
    return { seg: s.id, name: s.name, m: s.m, attrs, prices, priceImportance: tot > 0 ? pr / tot : 0 };
  }
  /* Projected results of the user's plan: guided mode uses the demand estimate, expert mode assumes everything produced sells. */
  function proforma(g, d) {
    const f = you(g), E = segsAt(g, g.t), est = g.cfg.difficulty === 'expert' ? null : estimate(g, d);
    const cov = (d.sf || f.sf).map((n, c) => coverage(clamp(Math.round(num(n, 0)), 0, 200), c));
    const lines = [];
    const netOf = (price, segUnits, target) => {
      let units = 0, rev = 0;
      E.forEach((s, i) => { const u = segUnits ? segUnits[i] : (s.id === target ? 1 : 0); if (!u) return; const acc = s.ch.map((c, j) => c * cov[j]), at = sum(acc) || 1; acc.forEach((a, j) => { units += u * a / at; rev += u * a / at * price * (1 - CHANNELS[j].margin); }); });
      return units > 0 ? rev / units : price * 0.7;
    };
    const item = (id, name, m, a, cum, inv, invCost, x, isNew) => {
      const plan = clamp(Math.round(num(x.prod, 0)), 0, 20000), price = clamp(Math.round(num(x.price, 100)), 10, 1500);
      const e = est && est[id];
      const dem = e ? e.demand : plan + inv;
      const prod = plan > 0 ? clamp(dem - inv, 0.8 * plan, 1.2 * plan) : 0;
      const sold = Math.min(dem, inv + prod), uc = unitCost(m, a, cum + prod / 2);
      const avgC = inv + prod > 0 ? (inv * (invCost || uc) + prod * uc) / (inv + prod) : uc;
      const net = netOf(price, e ? e.seg : null, x.seg || null);
      const rev = sold * net / 1000, cogs = sold * avgC / 1000, endInv = Math.max(0, inv + prod - sold), hold = HOLD * endInv * avgC / 1000, ads = num(x.ads, 0) / 1000;
      lines.push({ id, name, m, isNew: !!isNew, demand: dem, prod, sold, endInv, price, net, uc, rev, cogs, hold, cbm: rev - cogs - hold, ads, nmc: rev - cogs - hold - ads });
    };
    let writeOff = 0;
    brandsOf(g, f).forEach(b => {
      const x = d.brands[b.id]; if (!x || x.withdraw) { if (x && x.withdraw) writeOff += b.inv * (b.invCost || 0) * 0.5 / 1000; return; }
      let a = b.a, cum = b.cum, inv = b.inv;
      if (x.project) { const p = g.projects.find(q => q.id === x.project && q.firm === 'you' && q.status === 'done' && !q.used && q.m === b.m); if (p) { a = p.a; cum = b.cum * 0.3; writeOff += b.inv * (b.invCost || 0) * 0.5 / 1000; inv = 0; } }
      item(b.id, b.name, b.m, a, cum, inv, b.invCost, Object.assign({ seg: b.target }, x));
    });
    (d.launches || []).forEach((L, k) => { const p = g.projects.find(q => q.id === L.project && q.firm === 'you' && q.status === 'done' && !q.used); if (p) item('new' + k, String(L.name || 'NEW').toUpperCase(), p.m, p.a, 0, 0, 0, L, true); });
    const sp = spendOf(g, f, d);
    const rev = sum(lines.map(l => l.rev)), cogs = sum(lines.map(l => l.cogs)), hold = sum(lines.map(l => l.hold)), cbm = rev - cogs - hold;
    const nmc = cbm - sp.ads / 1000 - sp.sf / 1000 - sp.studies / 1000 - sp.rd / 1000 - writeOff;
    return { lines, rev, cogs, hold, cbm, ads: sp.ads / 1000, sf: sp.sf / 1000, studies: sp.studies / 1000, rd: sp.rd / 1000, writeOff, nmc, spend: sp, budget: f.budget, over: Math.max(0, sp.total - f.budget), guided: !!est };
  }
  function standings(g) {
    const R = g.reports.slice(1);
    const fs = g.firms.map((f, i) => { const h = R.map(r => r.firms[i].res); const lastH = h.length ? h[h.length - 1] : null; return { id: f.id, name: f.name, short: f.short, ai: f.ai, spi: lastH ? lastH.spi : 1000, cumNmc: sum(h.map(x => x.nmc)), valShare: lastH ? lastH.valShare : 0, gShare: lastH ? lastH.gShare : 0 }; });
    const order = fs.slice().sort((a, b) => b.spi - a.spi);
    order.forEach((f, i) => { f.place = i + 1; });
    return fs;
  }
  function finalScore(g) {
    const st = standings(g), me = st[0], best = Math.max(...st.slice(1).map(f => f.spi));
    const rankPart = (5 - me.place) / 4 * 100;
    const spiPart = clamp((me.spi - 700) / Math.max(1, best * 1.25 - 700), 0, 1) * 100;
    return Math.round(clamp(0.5 * rankPart + 0.5 * spiPart, 0, 100));
  }
  function apply(g, d) { processPeriod(g, d); g.draft = g.t <= g.years ? defaultDraft(g) : null; }
  const isDone = g => g.t > g.years;
  function autopilot(g, playbook) { const f = you(g), saved = f.ai; f.ai = playbook || 'follower'; const d = aiDecide(g, f, segsAt(g, g.t)); f.ai = saved; d.studies = ['survey', 'panel', 'mds']; return d; }

  const api = { MARKETS, CHANNELS, SEGS, STUDIES, FIRMS, AI, MAX_BRANDS, POS_SD, SF_COST, SF_HIRE, SF_FIRE, HOLD,
    create, apply, isDone, segAt, segsAt, frontier, onGrid, feasible, projectCost, unitCost, coverage, adEff, awNext, priceScore, estimate, autoForecast, nearestSeg, budgetUse, spendOf, defaultDraft, standings, finalScore, perceived, brandsOf, you, autopilot, conjoint, proforma, gDone, CHANNELS_K: CHANNELS.map(c => c.k) };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BrandLabEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
