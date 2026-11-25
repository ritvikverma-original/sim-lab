/* Crisis Room engine: branching crisis-management scenarios.
   A scenario is a sequence of phases. Each phase has a situation, a news and social feed, five advisors who each hold
   part of the picture (some of it critical), and one or more decisions: a choice between courses of action, a public
   statement built from elements with a spokesperson and a channel, or a budget split. Decisions move safety, legal
   exposure, cost and the trust of six stakeholder groups, set flags that change later phases, and can trigger events.
   Content lives in crisisroom-data.js. Deterministic for a seed, a scenario and a list of moves. */
(function (root) {
  'use strict';
  const RNG = {
    make(seed) { return { s: (seed >>> 0) || 1 }; },
    next(r) { r.s = (r.s + 0x6D2B79F5) >>> 0; let t = r.s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  };
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const sum = a => a.reduce((s, x) => s + x, 0);
  const clone = o => JSON.parse(JSON.stringify(o));
  const SH = [
    { k: 'c', name: 'Customers' }, { k: 'e', name: 'Employees' }, { k: 'r', name: 'Regulators' },
    { k: 'm', name: 'Media' }, { k: 'i', name: 'Investors' }, { k: 'p', name: 'Partners' }
  ];
  const ASKS = 2, HUDDLE_FX = { trust: { c: -2, m: -3 } };
  const data = () => (typeof module !== 'undefined' && module.exports ? require('./crisisroom-data.js') : root.CrisisRoomData);
  const SC = sid => data().scenarios[sid];
  const val = (v, f) => (typeof v === 'function' ? v(f) : v);
  const ok = (when, f, g) => (when == null ? true : typeof when === 'function' ? !!when(f, g) : true);

  function create(seed, config) {
    const cfg = config || {}, all = data().scenarios;
    const sid = all[cfg.scenario] ? cfg.scenario : Object.keys(all)[0], S0 = all[sid];
    const g = { v: 1, seed, sid, cfg: { scenario: sid, difficulty: (['guided', 'standard', 'expert'].indexOf(cfg.difficulty) >= 0 ? cfg.difficulty : 'guided') }, rng: RNG.make(seed),
      phase: 0, done: false, flags: {}, m: { safety: S0.start.safety, legal: S0.start.legal, cost: 0, trust: clone(S0.start.trust) },
      heard: [], huddle: false, asks: 0, hist: [], log: [], record: [], last: null, draft: { choices: {} } };
    g.hist.push(snap(g, 'start'));
    return g;
  }
  function snap(g, label) { return { label, phase: g.phase, safety: g.m.safety, legal: g.m.legal, cost: g.m.cost, trust: clone(g.m.trust), index: trustIndex(g) }; }
  function trustIndex(g) { const W = SC(g.sid).weights; return sum(SH.map(s => W[s.k] * g.m.trust[s.k])) / sum(SH.map(s => W[s.k])); }
  function applyFx(g, fx, mult) {
    if (!fx) return {};
    const k = mult == null ? 1 : mult, d = { trust: {} };
    if (fx.safety) { const v = g.m.safety; g.m.safety = clamp(v + fx.safety * k, 0, 100); d.safety = g.m.safety - v; }
    if (fx.legal) { const v = g.m.legal; g.m.legal = clamp(v + fx.legal * k, 0, 100); d.legal = g.m.legal - v; }
    if (fx.cost) { g.m.cost = Math.max(0, g.m.cost + fx.cost * k); d.cost = fx.cost * k; }
    const T = Object.assign({}, fx.all != null ? Object.fromEntries(SH.map(s => [s.k, fx.all])) : {}, fx.trust || {});
    Object.keys(T).forEach(key => { if (g.m.trust[key] == null) return; const v = g.m.trust[key]; g.m.trust[key] = clamp(v + T[key] * k, 0, 100); d.trust[key] = g.m.trust[key] - v; });
    return d;
  }
  const merge = (a, b) => { const out = { trust: Object.assign({}, a.trust) }; ['safety', 'legal', 'cost'].forEach(x => { if (a[x] || b[x]) out[x] = (a[x] || 0) + (b[x] || 0); }); Object.keys(b.trust || {}).forEach(x => { out.trust[x] = (out.trust[x] || 0) + b.trust[x]; }); return out; };

  /* Resolve a phase's content against the current flags. */
  function phaseOf(g, idx) {
    const S = SC(g.sid), P = S.phases[idx == null ? g.phase : idx], f = g.flags;
    if (!P) return null;
    return {
      id: P.id, clock: val(P.clock, f), title: val(P.title, f), brief: val(P.brief, f),
      feed: (P.feed || []).filter(x => ok(x.when, f, g)).map(x => ({ src: x.src, kind: x.kind || 'news', text: val(x.text, f) })),
      advisors: S.advisors.map(a => { const A = P.advisors && P.advisors[a.id]; if (!A) return { id: a.id, t: null }; const t = val(A.t, f); return { id: a.id, t, crit: !!A.crit && ok(A.when, f, g), key: A.key || null }; }),
      decisions: (P.decisions || []).filter(D => ok(D.when, f, g)).map(D => Object.assign({}, D, { prompt: val(D.prompt, f), options: (D.options || []).filter(o => ok(o.when, f, g)).map(o => Object.assign({}, o, { label: val(o.label, f) })) }))
    };
  }
  function consult(g, who) {
    if (g.done || g.huddle || g.heard.indexOf(who) >= 0 || g.asks >= ASKS) return;
    const S = SC(g.sid); if (!S.advisors.some(a => a.id === who)) return;
    g.heard.push(who); g.asks++;
  }
  function huddle(g) {
    if (g.done || g.huddle) return;
    g.huddle = true;
    const d = applyFx(g, HUDDLE_FX);
    g.huddleFx = d;
  }
  const heardOf = (g, who) => g.huddle || g.heard.indexOf(who) >= 0;

  /* Statement: elements chosen (up to max), a spokesperson and a channel. Some elements backfire later through flags. */
  function statementFx(D, sel) {
    const els = (sel && sel.els || []).filter(id => D.elements.some(e => e.id === id)).slice(0, D.max || 5);
    const spoke = D.spokes.find(s => s.id === (sel && sel.spoke)) || D.spokes[0];
    const chan = D.channels.find(c => c.id === (sel && sel.channel)) || D.channels[0];
    let fx = { trust: {} }, flags = {};
    const add = x => { if (!x) return; ['safety', 'legal', 'cost'].forEach(k => { if (x[k]) fx[k] = (fx[k] || 0) + x[k]; }); const T = Object.assign({}, x.all != null ? Object.fromEntries(SH.map(s => [s.k, x.all])) : {}, x.trust || {}); Object.keys(T).forEach(k => { fx.trust[k] = (fx.trust[k] || 0) + T[k]; }); };
    els.forEach(id => { const e = D.elements.find(z => z.id === id); add(e.fx); Object.assign(flags, e.flags || {}); });
    const goodN = els.filter(id => D.elements.find(z => z.id === id).good).length;
    // a good message delivered by a credible spokesperson through a fitting channel counts for more
    const mult = (spoke.mult || 1) * (chan.mult || 1);
    Object.keys(fx.trust).forEach(k => { if (fx.trust[k] > 0) fx.trust[k] *= mult; });
    add(spoke.fx); add(chan.fx);
    if (goodN >= (D.coreN || 4)) add(D.coherent);
    if (els.length < (D.minN || 2)) add(D.thin);
    flags[D.id + 'Spoke'] = spoke.id; flags[D.id + 'Channel'] = chan.id; flags[D.id + 'Els'] = els;
    return { fx, flags, els, spoke, chan, goodN };
  }
  /* Budget split: each bucket's effect grows with diminishing returns up to its cap. */
  function allocateFx(D, sel) {
    const total = D.total, amounts = {}; let used = 0;
    D.buckets.forEach(b => { const v = clamp(Math.round(+((sel || {})[b.id]) || 0), 0, total); amounts[b.id] = v; used += v; });
    if (used > total) { const k = total / used; Object.keys(amounts).forEach(id => { amounts[id] = Math.floor(amounts[id] * k); }); }
    let fx = { trust: {}, cost: sum(Object.values(amounts)) };
    D.buckets.forEach(b => {
      const share = 1 - Math.exp(-amounts[b.id] / (b.half || 3));
      const x = b.fx || {};
      ['safety', 'legal'].forEach(k => { if (x[k]) fx[k] = (fx[k] || 0) + x[k] * share; });
      Object.keys(x.trust || {}).forEach(k => { fx.trust[k] = (fx.trust[k] || 0) + x.trust[k] * share; });
    });
    const flags = {}; flags[D.id] = amounts;
    return { fx, flags, amounts };
  }
  function decide(g, choices) {
    if (g.done) return;
    const S = SC(g.sid), P = phaseOf(g), raw = S.phases[g.phase], f = g.flags, sel = choices || {};
    const out = { phase: g.phase, title: P.title, clock: P.clock, items: [], delta: { trust: {} }, crit: P.advisors.filter(a => a.crit).map(a => a.id), heardCrit: [] };
    out.heardCrit = out.crit.filter(id => heardOf(g, id));
    out.huddle = g.huddle; out.consulted = g.heard.slice();
    if (g.huddleFx) out.delta = merge(out.delta, g.huddleFx);
    P.decisions.forEach(D => {
      const v = sel[D.id];
      if (D.kind === 'statement') {
        const r = statementFx(D, v), d = applyFx(g, r.fx);
        Object.assign(g.flags, r.flags);
        out.delta = merge(out.delta, d);
        const best = D.elements.filter(e => e.good).map(e => e.id);
        out.items.push({ id: D.id, kind: 'statement', prompt: D.prompt, els: r.els, spoke: r.spoke.id, channel: r.chan.id, goodN: r.goodN, traps: r.els.filter(id => D.elements.find(e => e.id === id).trap), best, bestSpoke: D.bestSpoke, bestChannel: D.bestChannel, text: (D.outcome ? val(D.outcome, Object.assign({}, g.flags, { goodN: r.goodN, traps: r.els.filter(id => D.elements.find(e => e.id === id).trap).length })) : '') });
      } else if (D.kind === 'allocate') {
        const r = allocateFx(D, v), d = applyFx(g, r.fx);
        Object.assign(g.flags, r.flags);
        out.delta = merge(out.delta, d);
        out.items.push({ id: D.id, kind: 'allocate', prompt: D.prompt, amounts: r.amounts, text: val(D.outcome, Object.assign({}, g.flags)) || '', advice: D.advice || '' });
      } else {
        const o = D.options.find(x => x.id === v) || D.options[0];
        const d = applyFx(g, o.fx);
        Object.assign(g.flags, o.flags || {});
        g.flags[D.id] = o.id;
        out.delta = merge(out.delta, d);
        const bestO = D.options.find(x => x.best);
        out.items.push({ id: D.id, kind: 'choice', prompt: D.prompt, choice: o.id, label: o.label, best: bestO ? bestO.id : null, bestLabel: bestO ? bestO.label : null, why: D.why || (bestO && bestO.why) || '', text: val(o.out, g.flags), crit: D.crit || [], heardNeeded: (D.crit || []).filter(id => heardOf(g, id)).length });
      }
    });
    // events
    (raw.events || []).forEach(E => {
      if (!ok(E.when, g.flags, g)) return;
      const p = E.p == null ? 1 : val(E.p, g.flags);
      if (RNG.next(g.rng) >= p) return;
      const d = applyFx(g, val(E.fx, g.flags));
      Object.assign(g.flags, E.flags || {});
      out.delta = merge(out.delta, d);
      out.items.push({ kind: 'event', text: val(E.text, g.flags), bad: !!E.bad, good: !!E.good });
    });
    g.record.push(out);
    g.last = out;
    g.log.push({ phase: g.phase, clock: P.clock, title: P.title, items: out.items.map(x => x.kind === 'event' ? { event: true, text: x.text, bad: x.bad } : { label: x.label || (x.kind === 'statement' ? 'Statement issued' : x.kind === 'allocate' ? 'Budget allocated' : ''), text: x.text }) });
    g.phase++; g.heard = []; g.huddle = false; g.huddleFx = null; g.asks = 0; g.draft = { choices: {} };
    g.hist.push(snap(g, P.title));
    if (g.phase >= S.phases.length) { g.done = true; g.draft = null; if (S.finale) { const fin = S.finale; const d = applyFx(g, val(fin.fx, g.flags) || {}); g.finale = { text: val(fin.text, g.flags), delta: d }; } }
  }
  function apply(g, d) {
    const dec = d || {};
    if (dec.kind === 'consult') consult(g, dec.who);
    else if (dec.kind === 'huddle') huddle(g);
    else if (dec.kind === 'decide') decide(g, dec.choices);
  }
  const isDone = g => g.done;
  function processScore(g) { const tot = sum(g.record.map(r => r.crit.length)), got = sum(g.record.map(r => r.heardCrit.length)); return tot ? got / tot : 1; }
  function bestShare(g) { const ch = []; g.record.forEach(r => r.items.forEach(x => { if (x.kind === 'choice' && x.best) ch.push(x.choice === x.best ? 1 : 0); })); return ch.length ? sum(ch) / ch.length : 0; }
  function score(g) {
    const S = SC(g.sid), m = g.m, B = S.budget;
    const cost = m.cost <= B ? 1 - 0.3 * m.cost / B : clamp(0.7 - 0.7 * (m.cost - B) / B, 0, 0.7);
    const parts = { safety: m.safety / 100, trust: trustIndex(g) / 100, cost, legal: 1 - m.legal / 100, process: processScore(g) };
    const total = Math.round(100 * (0.25 * parts.safety + 0.35 * parts.trust + 0.15 * parts.cost + 0.10 * parts.legal + 0.15 * parts.process));
    return { total: clamp(total, 0, 100), parts, best: bestShare(g) };
  }
  function scenarios() { const all = data().scenarios; return Object.keys(all).map(k => ({ id: k, title: all[k].title, area: all[k].area, company: all[k].company, phases: all[k].phases.length })); }

  const api = { SH, ASKS, create, apply, isDone, phaseOf, trustIndex, score, processScore, bestShare, scenarios, sc: SC, heardOf, statementFx, allocateFx };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CrisisRoomEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
