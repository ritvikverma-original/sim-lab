/* RoleQuest: career intelligence inside Sim Lab. A candidate builds a profile, adds evidence (their Sim Lab practice record and, optionally, CV text),
   answers an original foundation item bank one question at a time, then adaptive role questions, and receives a transparent report:
   function and role fit, readiness and opportunity kept separate, industries, gaps, a development plan that links back to Sim Lab, and history.
   Content and weights live in roleq-data.js. Every step is one decision, so a run replays exactly and is versioned. */
(function () {
  'use strict';
  const S = window.SimLab, D = window.RoleQuestBank;
  if (!S || !D) return;
  const { UI, U, N } = S;
  const esc = U.esc, clamp = U.clamp, sum = U.sum;
  const r0 = v => Math.round(v);

  /* ---------- Taxonomy indexes ---------- */
  const FN = {}, RL = {}, CL = {}, IND = {}, ROLES = [];
  D.F.forEach(f => {
    FN[f.id] = f;
    f.roles.forEach(r => { const o = { id: r[0], t: r[1], m: r[2], caps: r[3], tilt: r[4], f: f.id }; ROLES.push(o); RL[o.id] = o; });
    const caps = {}; f.roles.forEach(r => Object.keys(r[3]).forEach(k => { caps[k] = (caps[k] || 0) + r[3][k] / f.roles.length; })); f.caps = caps;
  });
  D.C.forEach(c => { CL[c.id] = c; });
  D.IND.forEach(i => { IND[i.id] = i; });

  /* Foundation sequence: constructs interleaved so no single lens dominates early; three consistency checks spread through. */
  const SEQ = (() => {
    const lists = ['int', 'wp', 'trait', 'pref', 'val'].map(k => D.ITEMS[k].map((x, i) => ({ k, i })));
    const out = []; let more = true;
    for (let r = 0; more; r++) { more = false; lists.forEach(L => { if (r < L.length) { out.push(L[r]); more = true; } }); }
    [20, 36, 50].forEach((pos, j) => out.splice(pos, 0, { k: 'cons', i: j }));
    return out;
  })();
  const NQ = SEQ.length, MAX_AD = 16;
  const SECT = { int: 'Interests', wp: 'Work you would choose', trait: 'Work style', pref: 'Preferences', val: 'What matters to you', cons: 'Quick check' };
  const STAGES = [['profile', 'Profile'], ['evidence', 'Evidence'], ['found', 'Foundation'], ['map', 'Provisional map'], ['adapt', 'Role depth'], ['done', 'Report']];
  const LENS = { interests: 'interests', style: 'work style', scenarios: 'scenario choices', values: 'values', prefs: 'preferences' };
  const bandOf = y => (D.BANDS.find(b => y >= b[0] && y <= b[1]) || D.BANDS[0])[2];
  const profOf = g => g.prof || { years: 0, cur: 'none', ind: 'none', hor: 'first', geo: 'open', excl: [] };

  /* ---------- State ---------- */
  function create(seed) {
    return { v: 1, seed, n: 0, stage: 'profile', prof: null, ev: null, ans: [], aa: [], topF: null, val: null, done: false, draft: { years: 2, cur: 'none', ind: 'none', hor: 'first', geo: 'open', excl: [], useP: true, led: {} } };
  }
  function apply(g, d) {
    if (!d) return;
    if (d.op === 'validate') { if (g.done) { g.val = { fit: ['yes', 'partly', 'no'].indexOf(d.fit) >= 0 ? d.fit : 'partly', pick: RL[d.pick] ? d.pick : null }; g.n++; } return; }
    if (g.done) return;
    g.n++;
    if (d.op === 'profile' && g.stage === 'profile') {
      const p = d.p || {};
      g.prof = { years: clamp(Math.round(+p.years || 0), 0, 40), cur: FN[p.cur] ? p.cur : 'none', ind: IND[p.ind] ? p.ind : 'none', hor: p.hor || 'first', geo: p.geo || 'open', excl: (p.excl || []).filter(x => FN[x]).slice(0, 6) };
      g.stage = 'evidence'; return;
    }
    if (d.op === 'evidence' && g.stage === 'evidence') {
      const led = {}; Object.keys(d.led || {}).forEach(k => { if (CL[k]) led[k] = clamp(Math.round(+d.led[k] || 0), 0, 4); });
      g.ev = { cv: d.cv || null, prac: d.prac || {}, led }; g.stage = 'found'; return;
    }
    if (d.op === 'ans' && g.stage === 'found') { g.ans.push(+d.v); if (g.ans.length >= NQ) g.stage = 'map'; return; }
    if (d.op === 'undo') {
      if (g.stage === 'found' && g.ans.length) g.ans.pop();
      else if (g.stage === 'map') { g.ans.pop(); g.stage = 'found'; }
      else if (g.stage === 'adapt' && g.aa.length) g.aa.pop();
      return;
    }
    if (d.op === 'continue' && g.stage === 'map') { g.topF = topFunctions(g); g.stage = 'adapt'; g.n++; if (!nextAdaptive(g)) finish(g); return; }
    if (d.op === 'ad' && g.stage === 'adapt' && RL[d.a] && RL[d.b]) { g.aa.push({ a: d.a, b: d.b, w: d.pick === 0 ? d.a : d.b, kind: d.kind === 'tie' ? 'tie' : 'within', f: d.f || null }); g.n++; if (!nextAdaptive(g)) finish(g); }
  }
  function finish(g) { g.stage = 'done'; g.done = true; g.draft = null; g.n++; }

  /* Derived scores are cached per state; every applied decision bumps g.n, so an undone and re-answered question never reuses stale numbers. */
  const CACHE = new WeakMap();
  function cached(g, key, fn) {
    let c = CACHE.get(g);
    if (!c || c.n !== g.n) { c = { n: g.n, m: {} }; CACHE.set(g, c); }
    if (!(key in c.m)) c.m[key] = fn();
    return c.m[key];
  }

  /* ---------- Constructs ---------- */
  function constructs(g) {
    return cached(g, 'cons', () => {
      const pref = { energy: 0, info: 0, decide: 0, struct: 0 }, prefN = { energy: 0, info: 0, decide: 0, struct: 0 };
      const tr = {}, it = {}, val = {}, valN = {}, wp = {};
      Object.keys(D.TRAIT_T).forEach(k => { tr[k] = []; }); Object.keys(D.INT_T).forEach(k => { it[k] = []; });
      Object.keys(D.VAL_T).forEach(k => { val[k] = 0; valN[k] = 0; }); D.F.forEach(f => { wp[f.id] = 0; });
      const consA = [];
      g.ans.forEach((v, idx) => {
        const s = SEQ[idx], item = D.ITEMS[s.k][s.i];
        if (s.k === 'pref') { pref[item[0]] += v === 0 ? 1 : -1; prefN[item[0]]++; }
        else if (s.k === 'trait') tr[item[0]].push(item[2] ? 1 - (v - 1) / 4 : (v - 1) / 4);
        else if (s.k === 'int') it[item[0]].push((v - 1) / 4);
        else if (s.k === 'val') item.forEach((o, j) => { valN[o[0]]++; if (j === v) val[o[0]]++; });
        else if (s.k === 'wp') wp[item[1][v][0]]++;
        else if (s.k === 'cons') consA.push({ i: s.i, v });
      });
      const mean = a => (a.length ? sum(a) / a.length : 0.5);
      const P = {}, T = {}, I = {}, V = {}, W = {};
      Object.keys(pref).forEach(k => { P[k] = prefN[k] ? pref[k] / prefN[k] : 0; });
      Object.keys(tr).forEach(k => { T[k] = mean(tr[k]); }); Object.keys(it).forEach(k => { I[k] = mean(it[k]); });
      Object.keys(val).forEach(k => { V[k] = valN[k] ? val[k] / valN[k] : 0.5; }); D.F.forEach(f => { W[f.id] = wp[f.id] / 3; });
      /* Consistency: does each check agree with the matching construct, where that construct leans clearly one way? */
      let agree = 0, appl = 0;
      consA.forEach(c => {
        const ci = D.ITEMS.cons[c.i], pick = ci[2][c.v][0];
        if (ci[0] === 'int') { const d = I.E - I.I; if (Math.abs(d) >= 0.25) { appl++; if ((d > 0) === (pick === 'E')) agree++; } }
        else if (ci[0] === 'pref') { if (P.energy !== 0) { appl++; if ((P.energy > 0) === (pick === '+')) agree++; } }
        else if (ci[0] === 'val') { const idx = SEQ.findIndex(s => s.k === 'val' && s.i === 0); if (idx >= 0 && idx < g.ans.length) { appl++; if (D.ITEMS.val[0][g.ans[idx]][0] === pick) agree++; } }
      });
      return { P, T, I, V, W, consistency: appl ? agree / appl : 1, consAppl: appl };
    });
  }
  const wsum = (w, x) => { let s = 0, t = 0; Object.keys(w).forEach(k => { s += w[k] * (x[k] == null ? 0.5 : x[k]); t += Math.abs(w[k]); }); return t ? s / t : 0.5; };
  function prefFit(f, P) { let s = 0, t = 0; Object.keys(f.pr).forEach(k => { s += f.pr[k] * P[k]; t += Math.abs(f.pr[k]); }); return clamp(0.5 + 0.5 * (t ? s / t : 0), 0, 1); }
  function fitParts(g, f) {
    const c = constructs(g);
    return { interests: wsum(f.ri, c.I), style: wsum(f.b5, c.T), scenarios: c.W[f.id], values: wsum(f.va, c.V), prefs: prefFit(f, c.P) };
  }
  const FIT_W = { interests: 0.3, style: 0.2, scenarios: 0.2, values: 0.2, prefs: 0.1 };
  const fitOf = parts => 100 * sum(Object.keys(FIT_W).map(k => FIT_W[k] * parts[k]));

  /* ---------- Evidence ---------- */
  function practiceSnapshot() {
    const best = {};
    Object.values(S.App.runs || {}).forEach(r => {
      const M = r && S.App.modules[r.module];
      if (!M || M.format === 'career' || r.status !== 'done' || r.score == null || !isFinite(r.score)) return;
      best[r.module] = Math.max(best[r.module] || 0, r.score);
    });
    return best;
  }
  const evMap = id => { const M = S.App.modules[id]; return D.P[id] || (M && D.CATMAP[M.cat]) || null; };
  function practiceEvidence(prac) {
    const acc = {}, wt = {};
    Object.keys(prac || {}).forEach(id => {
      const map = evMap(id); if (!map) return;
      Object.keys(map).forEach(c => { acc[c] = (acc[c] || 0) + map[c] * prac[id]; wt[c] = (wt[c] || 0) + map[c]; });
    });
    const out = {}; D.C.forEach(c => { out[c.id] = wt[c.id] ? (acc[c.id] / wt[c.id]) * Math.min(1, wt[c.id] / 1.2) : 0; });
    return out;
  }
  /* CV reading is deterministic and runs in the browser: lines are matched to capability clusters on whole words (allowing plural and verb endings),
     and strengthened by quantified impact and ownership verbs. Only the two strongest matched lines per cluster are kept. */
  const kwEsc = k => k.replace(/[.*+?^${}()|[\]\\]/g, m => '\\' + m);
  const KW = {}; D.C.forEach(c => { KW[c.id] = new RegExp('(?:^|[^a-z0-9])(?:' + c.kw.map(kwEsc).join('|') + ')(?:s|es|d|ed|ing|al)?(?![a-z0-9])', 'i'); });
  const QUANT = /(\d+(?:[.,]\d+)?\s?(?:%|x\b|crore|cr\b|lakh|lac\b|mn\b|million|bn\b|billion|k\b|bps\b|pp\b))|(?:[₹$€£]\s?\d)|(?:\b(?:rs\.?|inr|usd)\s?\d)/i;
  const LEAD = /\b(led|managed|headed|owned|launched|built|drove|grew|delivered|negotiated|designed|founded|set up|scaled|spearheaded|turned around)\b/i;
  function cvLines(raw) {
    const out = [];
    raw.split(/\r?\n|[•▪●■◦►▶]|\s\|\s|;/).forEach(s => {
      s = s.replace(/\s+/g, ' ').replace(/^[\s\-–—*·]+/, '').trim();
      if (s.length > 300) s.split(/[.!?]\s+(?=[A-Z0-9₹$])/).forEach(x => out.push(x.trim())); else out.push(s);
    });
    return out.filter(s => s.length >= 12 && s.length <= 400);
  }
  function parseCV(text) {
    const raw = String(text || ''), lines = cvLines(raw), cl = {};
    let leadN = 0, quantN = 0;
    lines.forEach(l => {
      const q = QUANT.test(l), ld = LEAD.test(l); if (q) quantN++; if (ld) leadN++;
      D.C.forEach(c => { if (KW[c.id].test(l)) (cl[c.id] = cl[c.id] || []).push({ l, s: 1 + (q ? 0.6 : 0) + (ld ? 0.4 : 0), q }); });
    });
    const out = {};
    D.C.forEach(c => {
      const hits = (cl[c.id] || []).sort((a, b) => b.s - a.s);
      if (!hits.length) { out[c.id] = { s: 0, conf: 'none', sn: [] }; return; }
      const qn = hits.filter(h => h.q).length;
      out[c.id] = { s: Math.round(Math.min(100, sum(hits.slice(0, 5).map(h => h.s)) * 18)), conf: hits.length >= 3 && qn >= 1 ? 'High' : hits.length >= 2 || qn >= 1 ? 'Medium' : 'Low', sn: hits.slice(0, 2).map(h => (h.l.length > 150 ? h.l.slice(0, 147) + '…' : h.l)) };
    });
    return { cl: out, scope: Math.min(100, leadN * 12 + quantN * 8), lines: lines.length, low: raw.length < 400 || lines.length < 5 };
  }
  /* Three evidence sources per capability, re-weighted over whichever exist: CV 50%, scored Sim Lab practice 30%, the self-declared ledger 20%.
     Without a CV the result is discounted (×0.85 with practice, ×0.75 on self-report alone), because a claim is weaker than a record. */
  const SRC_W = { cv: 0.5, prac: 0.3, led: 0.2 }, SRC_T = { cv: 'CV', prac: 'Sim Lab', led: 'Ledger' };
  function evidence(g) {
    return cached(g, 'ev', () => {
      const ev = g.ev || {}, pe = practiceEvidence(ev.prac), cv = ev.cv || null, led = ev.led || {}, E = {}, src = {};
      D.C.forEach(c => {
        const parts = [];
        if (cv && cv.cl[c.id]) parts.push(['cv', cv.cl[c.id].s]);
        if (pe[c.id] > 0) parts.push(['prac', pe[c.id]]);
        if (led[c.id] != null) parts.push(['led', led[c.id] * 25]);
        src[c.id] = parts.map(p => p[0]);
        if (!parts.length) { E[c.id] = 0; return; }
        const w = sum(parts.map(p => SRC_W[p[0]])), v = sum(parts.map(p => SRC_W[p[0]] * p[1])) / w;
        E[c.id] = v * (cv ? 1 : src[c.id].indexOf('prac') >= 0 ? 0.85 : 0.75);
      });
      return { E, pe, cv, led, src, nPrac: Object.keys(ev.prac || {}).length, nLed: Object.keys(led).length };
    });
  }

  /* ---------- Scoring ---------- */
  function adjacency(a, b) { if (!FN[a] || !FN[b]) return 0; return a === b ? 2 : (FN[a].adj.indexOf(b) >= 0 || FN[b].adj.indexOf(a) >= 0) ? 1 : 0; }
  function readinessParts(g, caps, fid) {
    const ev = evidence(g), p = profOf(g);
    const tw = sum(Object.values(caps)), capEv = tw ? sum(Object.keys(caps).map(k => caps[k] * ev.E[k])) / tw : 0;
    const adjv = adjacency(p.cur, fid);
    let align = adjv === 2 ? 90 : adjv === 1 ? 65 : 40;
    if (p.years <= 2 && (p.hor === 'intern' || p.hor === 'first')) align = Math.max(align, 60);
    const scope = ev.cv ? ev.cv.scope : (p.years >= 5 ? 45 : 30);
    return { evidence: capEv, experience: align, scope };
  }
  const READY_W = { evidence: 0.6, experience: 0.25, scope: 0.15 };
  const readyOf = parts => sum(Object.keys(READY_W).map(k => READY_W[k] * parts[k]));
  function oppParts(g, fid) {
    const p = profOf(g), f = FN[fid];
    let ind = 60;
    if (IND[p.ind]) { const I = IND[p.ind], ix = I.fx.indexOf(fid); ind = ix >= 0 ? 100 - ix * 8 : I.adj.some(a => IND[a] && IND[a].fx.indexOf(fid) >= 0) ? 60 : 40; }
    const adjv = p.cur === 'none' ? 1 : adjacency(p.cur, fid);
    const friction = adjv === 2 ? 10 : (adjv === 1 ? 30 : 55) + (p.cur === 'none' || adjv === 2 ? 0 : p.years >= 8 ? 15 : p.years >= 4 ? 8 : 0);
    return { demand: f.demand, industry: ind, transition: 100 - friction };
  }
  const OPP_W = { demand: 0.4, industry: 0.3, transition: 0.3 };
  const oppOf = parts => sum(Object.keys(OPP_W).map(k => OPP_W[k] * parts[k]));
  function recOf(fit, ready, opp) { let r = 0.5 * fit + 0.35 * ready + 0.15 * opp; if (fit < 45) r = Math.min(r, fit + 10); return r; }
  function functionScores(g) {
    return cached(g, 'fx', () => {
      const ex = profOf(g).excl;
      return D.F.map(f => {
        const fp = fitParts(g, f), fit = fitOf(fp), rp = readinessParts(g, f.caps, f.id), ready = readyOf(rp), op = oppParts(g, f.id), opp = oppOf(op);
        return { id: f.id, t: f.t, fp, fit, rp, ready, op, opp, rec: recOf(fit, ready, opp), excl: ex.indexOf(f.id) >= 0 };
      }).sort((a, b) => b.rec - a.rec);
    });
  }
  function topFunctions(g) {
    const fs = functionScores(g).filter(x => !x.excl).sort((a, b) => b.fit - a.fit);
    const top = fs.slice(0, 4).map(x => x.id);
    if (fs[4] && fs[3].fit - fs[4].fit <= 2) top.push(fs[4].id);
    return top;
  }
  /* Role questions inside a function only reorder that function's roles: the adjustments are centred on the function, so they cannot lift
     a whole family above another. Tie-breakers are the one place where a choice moves a role across functions. */
  function roleAdj(g) {
    const within = {}, tie = {}, adj = {};
    g.aa.forEach(x => {
      const l = x.w === x.a ? x.b : x.a;
      if (x.kind === 'tie') { tie[x.w] = (tie[x.w] || 0) + 3; tie[l] = (tie[l] || 0) - 1; }
      else { within[x.w] = (within[x.w] || 0) + 4; within[l] = (within[l] || 0) - 2; }
    });
    D.F.forEach(f => {
      const ids = f.roles.map(r => r[0]); if (!ids.some(id => within[id])) return;
      const mean = sum(ids.map(id => within[id] || 0)) / ids.length;
      ids.forEach(id => { adj[id] = clamp((within[id] || 0) - mean, -8, 8); });
    });
    Object.keys(tie).forEach(id => { adj[id] = clamp((adj[id] || 0) + tie[id], -10, 10); });
    return adj;
  }
  function roleScores(g) {
    return cached(g, 'roles', () => {
      const fx = {}; functionScores(g).forEach(x => { fx[x.id] = x; });
      const c = constructs(g), adj = roleAdj(g);
      return ROLES.map(r => {
        const F = fx[r.f], tilt = 8 * ((c.I[r.tilt] == null ? 0.5 : c.I[r.tilt]) - 0.5), fit = clamp(F.fit + tilt + (adj[r.id] || 0), 0, 100);
        const rp = readinessParts(g, r.caps, r.f), ready = readyOf(rp), opp = F.opp;
        return { id: r.id, t: r.t, f: r.f, m: r.m, caps: r.caps, fit, tilt, adj: adj[r.id] || 0, rp, ready, opp, rec: recOf(fit, ready, opp), excl: F.excl };
      }).sort((a, b) => b.rec - a.rec);
    });
  }
  const liveRoles = g => roleScores(g).filter(r => !r.excl);
  /* Adaptive selection: within each top function, a three-question king-of-the-hill between its role mandates (the current leader against the
     strongest role it has not met), then up to four tie-breakers while the two leading roles overall are within three points. */
  function nextAdaptive(g) {
    if (!g.topF || g.aa.length >= MAX_AD) return null;
    return cached(g, 'next', () => {
      const rs = {}; roleScores(g).forEach(r => { rs[r.id] = r; });
      const asked = (a, b) => g.aa.some(x => (x.a === a && x.b === b) || (x.a === b && x.b === a));
      for (const fid of g.topF) {
        if (g.aa.filter(x => x.f === fid).length >= 3) continue;
        const roles = FN[fid].roles.map(r => rs[r[0]]).sort((a, b) => b.fit - a.fit);
        const champ = roles[0], ch = roles.slice(1).find(r => !asked(champ.id, r.id));
        if (ch) return { kind: 'within', f: fid, a: champ.id, b: ch.id };
        const pair = roles.flatMap((x, i) => roles.slice(i + 1).map(y => [x, y])).find(([x, y]) => !asked(x.id, y.id));
        if (pair) return { kind: 'within', f: fid, a: pair[0].id, b: pair[1].id };
      }
      const top = liveRoles(g), ties = g.aa.filter(x => x.kind === 'tie').length;
      if (ties < 4) for (let j = 1; j <= 2; j++) { if (top[j] && top[0].rec - top[j].rec < 3 && !asked(top[0].id, top[j].id)) return { kind: 'tie', f: null, a: top[0].id, b: top[j].id }; }
      return null;
    });
  }
  function confidence(g) {
    const ev = evidence(g), c = constructs(g), top = liveRoles(g), margin = top[1] ? top[0].rec - top[1].rec : 10;
    const why = []; let band = 4;
    if (!ev.cv) {
      const rests = andList([ev.nPrac ? 'your practice record' : '', ev.nLed ? 'your own ledger' : '', 'your profile'].filter(Boolean));
      band += ev.nLed >= 5 ? 3 : 4; why.push(`there is no CV evidence, so readiness rests on ${rests}`);
    } else if (ev.cv.low) { band += 2; why.push('the CV text was short'); }
    if (!ev.nPrac) { band += 2; why.push('there are no completed Sim Lab activities yet'); }
    if (c.consAppl && c.consistency < 0.67) { band += 3; why.push('some answers pointed in different directions'); }
    if (margin < 2) { band += 2; why.push('your top roles are very close'); }
    return { band, level: band <= 6 ? 'High' : band <= 10 ? 'Medium' : 'Low', why, margin };
  }

  /* ---------- Report pieces ---------- */
  function industries(g) {
    const p = profOf(g), fx = functionScores(g).filter(x => !x.excl).slice(0, 3), wt = sum(fx.map(x => x.rec)) || 1;
    return D.IND.map(I => {
      const rel = sum(fx.map(x => { const ix = I.fx.indexOf(x.id); return x.rec * (ix >= 0 ? 1 - ix * 0.1 : 0.3); })) / wt;
      const type = !IND[p.ind] ? 'Open' : I.id === p.ind ? 'Stay' : IND[p.ind].adj.indexOf(I.id) >= 0 ? 'Adjacent' : 'Pivot';
      const factor = { Stay: 1, Adjacent: 0.85, Pivot: 0.7, Open: 0.85 }[type];
      const strong = fx.filter(x => I.fx.indexOf(x.id) >= 0).map(x => FN[x.id].t);
      return { id: I.id, t: I.t, type, score: 100 * rel * factor, why: strong.length ? `Hires heavily for ${andList(strong)}` : 'Your top functions are less central here' };
    }).sort((a, b) => b.score - a.score);
  }
  function gaps(g, role) {
    const ev = evidence(g);
    return Object.keys(role.caps).map(k => { const need = role.caps[k], e = ev.E[k], gap = (need / 3) * (100 - e); return { c: k, need, e, gap, pr: gap >= 45 ? 'High' : gap >= 25 ? 'Medium' : 'Low' }; }).sort((a, b) => b.gap - a.gap);
  }
  function simRecs(cid, prac) {
    return CL[cid].rec.filter(id => S.App.modules[id]).map(id => ({ id, done: prac && prac[id] != null ? prac[id] : null })).sort((a, b) => (a.done == null ? -1 : a.done) - (b.done == null ? -1 : b.done)).slice(0, 2);
  }
  function plan(g) {
    const top = liveRoles(g)[0]; if (!top) return [];
    const prac = (g.ev && g.ev.prac) || {};
    return gaps(g, top).filter(x => x.pr !== 'Low').slice(0, 3).map(x => ({ x, sims: simRecs(x.c, prac), proj: CL[x.c].proj }));
  }
  function sensitivity(g) {
    const rs = liveRoles(g), top = rs[0], out = []; if (!top) return out;
    const gp = gaps(g, top)[0], tw = sum(Object.values(top.caps));
    if (gp && gp.e < 90) out.push(`More evidence in ${CL[gp.c].t.toLowerCase()} would lift your readiness for ${top.t}: 30 more evidence points there add about ${N.num(0.35 * 0.6 * (gp.need / tw) * 30, 1)} points to its score.`);
    if (rs[1]) out.push(`${rs[1].t} is ${N.num(top.rec - rs[1].rec, 1)} points behind. ${rs[1].fit > top.fit ? 'You like it more; it trails on evidence, so proof would close the gap fastest.' : 'It trails on fit; if your interest in that work grows, it could overtake.'}`);
    if (!evidence(g).cv) out.push('Adding your CV would test readiness against real experience and narrow the confidence band by about four points.');
    else if (!evidence(g).nPrac) out.push('Completing a few Sim Lab activities would add a work-sample view of how you decide, and narrow the band by about two points.');
    return out.slice(0, 3);
  }
  /* Each watch-out has a short form for tables and a full sentence for the summary. */
  function watchouts(g, r) {
    const p = profOf(g), w = [];
    if ((r.f === 'GM' || r.id === 'ent_intra' || r.id === 'sal_lead') && p.years < 6) w.push({ s: 'Usually needs a leadership track record', l: 'Titles here usually need years of leadership or P&L evidence; a rotational, founder’s-office or associate role is a realistic first step.' });
    if ((r.caps.people || 0) >= 3 && p.years <= 3) w.push({ s: 'People leadership weighs heavily', l: 'People leadership weighs heavily; build proof by leading teams in projects or clubs.' });
    if (r.fit < 50) w.push({ s: 'Modest fit', l: 'Fit is modest: the ranking leans on evidence and demand, which can change faster than interests.' });
    if (r.opp < 55) w.push({ s: 'A harder move from where you are', l: 'Moving in will take extra effort from your current starting point.' });
    return w;
  }
  const andList = a => (a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`);
  function whyRole(g, r) {
    const F = functionScores(g).find(x => x.id === r.f), ev = evidence(g).E;
    const lens = Object.keys(F.fp).filter(k => F.fp[k] >= 0.6).sort((a, b) => F.fp[b] - F.fp[a]).slice(0, 2).map(k => LENS[k]);
    const caps = Object.keys(r.caps).filter(k => ev[k] >= 40).sort((a, b) => ev[b] - ev[a]).slice(0, 2).map(k => `${CL[k].t.toLowerCase()} (${r0(ev[k])})`);
    const a = lens.length ? `Fit draws on your ${lens.join(' and ')}` : 'Fit is even rather than strong on any one lens';
    const b = caps.length ? `readiness on your ${caps.join(' and ')} evidence` : 'readiness is not yet proven by evidence';
    const c = r.adj >= 2 ? ', and you chose its mandate in the role questions' : r.adj <= -2 ? ', though you preferred other mandates in the role questions' : '';
    return `${a}; ${b}${c}.`;
  }
  function experiments(rs) {
    const fids = rs.slice(0, 3).map(r => r.f).filter((x, i, a) => a.indexOf(x) === i), out = [];
    fids.forEach(f => out.push(FN[f].exp[0]));
    if (fids[0]) FN[fids[0]].exp.forEach(e => out.push(e));
    return out.filter((x, i, a) => a.indexOf(x) === i).slice(0, 3);
  }
  const metricsOf = r => { const m = {}; (r && r.metrics || []).forEach(x => { if (x && x.k) m[x.k] = x.v; }); return m; };

  /* ---------- Shared view pieces ---------- */
  const progFrac = g => {
    const ix = STAGES.findIndex(s => s[0] === g.stage);
    return g.stage === 'found' ? 0.12 + 0.62 * g.ans.length / NQ : g.stage === 'adapt' ? 0.78 + 0.2 * g.aa.length / MAX_AD : [0.02, 0.07, 0.12, 0.75, 0.78, 1][ix];
  };
  const progBar = g => { const f = progFrac(g); return `<div class="rq-prog" role="progressbar" aria-label="RoleQuest progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${r0(f * 100)}"><i style="width:${(f * 100).toFixed(1)}%"></i></div>`; };
  function header(g, title, sub) {
    const ix = STAGES.findIndex(s => s[0] === g.stage);
    return `<section class="sheet hdr rq-hero"><div class="hdr-top"><div class="sh"><span class="eyebrow">RoleQuest · Step ${ix + 1} of ${STAGES.length}</span><h2>${title}</h2></div><div class="hdr-pills">${UI.pill(esc(D.version.assessment), 'neutral')}</div></div>${sub ? `<p class="case">${sub}</p>` : ''}<div class="rq-steps">${STAGES.map((s, i) => UI.pill(`${i + 1}. ${s[1]}`, i < ix ? 'good' : i === ix ? 'pen' : 'neutral')).join('')}</div>${progBar(g)}</section>`;
  }
  function slim(g, label, undoTxt) {
    return `<div class="rq-slim"><div class="rq-slim-t"><span class="eyebrow">RoleQuest · ${label}</span>${undoTxt ? `<button type="button" class="link" data-act="m" data-op="undo">${undoTxt}</button>` : ''}</div>${progBar(g)}</div>`;
  }
  function chipSet(field, opts, val) {
    return `<div class="chips sm" role="group">${opts.map(o => `<button type="button" class="chip" data-act="pick" data-field="${field}" data-value="${o.v}" aria-pressed="${String(o.v) === String(val)}">${esc(o.t)}</button>`).join('')}</div>`;
  }
  const FOPTS = D.F.map(f => ({ v: f.id, t: f.t }));

  /* ---------- Profile and evidence ---------- */
  function profileView(g) {
    const d = g.draft || create(0).draft;
    let h = header(g, 'Start with you', 'RoleQuest triangulates six lenses: preferences, work style, interests, values, the evidence in your CV and the evidence in your Sim Lab results. It gives you role hypotheses to test, not a verdict, and keeps fit, readiness and opportunity apart, so what you like is never confused with what you can show today.');
    let b = UI.field('Years of full-time work experience', UI.num('p:years', d.years, { min: 0, max: 40, step: 1, label: 'Years of work experience', wide: true }), 'Sets the seniority band for role titles. Internships do not count.');
    b += `<div class="field"><span class="lbl">Your current or most recent function</span>${chipSet('p:cur', [{ v: 'none', t: 'None yet / student' }].concat(FOPTS), d.cur)}</div>`;
    b += `<div class="field"><span class="lbl">Your current or most recent industry</span>${chipSet('p:ind', [{ v: 'none', t: 'None yet' }].concat(D.IND.map(i => ({ v: i.id, t: i.t }))), d.ind)}</div>`;
    b += `<div class="field"><span class="lbl">What are you planning for?</span>${chipSet('p:hor', [{ v: 'intern', t: 'A summer internship' }, { v: 'first', t: 'My first role after the MBA' }, { v: 'lateral', t: 'A move from my current role' }, { v: 'unsure', t: 'Not sure yet' }], d.hor)}</div>`;
    b += `<div class="field"><span class="lbl">Where?</span>${chipSet('p:geo', [{ v: 'india', t: 'India' }, { v: 'abroad', t: 'Abroad' }, { v: 'open', t: 'Open to both' }], d.geo)}</div>`;
    b += `<div class="field"><span class="lbl">Functions you want to rule out (optional, up to six)</span><div class="chips sm" role="group">${FOPTS.map(o => `<button type="button" class="chip" data-act="m" data-op="excl" data-v="${o.v}" aria-pressed="${d.excl.indexOf(o.v) >= 0}">${esc(o.t)}</button>`).join('')}</div><span class="hint">Ruled-out functions are still scored, so you can see them, but they never appear among your recommendations.</span></div>`;
    h += UI.sheet('Your profile', 'Where you are starting from', `<div class="fields">${b}</div><p class="cap">RoleQuest never asks for gender, age, religion, caste, health or family status, and none of these could influence a recommendation.</p><div class="actions"><button type="button" class="btn btn-primary btn-block" data-act="m" data-op="profile">Save and continue</button></div>`);
    return h;
  }
  function pracRows(prac) {
    return Object.keys(prac || {}).filter(id => S.App.modules[id]).sort((a, b) => prac[b] - prac[a]).map(id => {
      const M = S.App.modules[id], map = evMap(id) || {};
      return [esc(M.hidden ? `${M.title} (quick)` : M.title), String(r0(prac[id])), Object.keys(map).sort((a, b) => map[b] - map[a]).map(k => CL[k].t).join(', ')];
    });
  }
  function pracTable(prac) {
    const rows = pracRows(prac);
    if (!rows.length) return '<p class="case">No completed Sim Lab activities are on record yet. You can continue: the report will then rest on your answers and your CV, with lower confidence. Every activity you complete later becomes evidence for your next run.</p>';
    return UI.table(['Activity', 'Best score', 'Evidence for'], rows, { sticky: true, cls: 'wrap crit' });
  }
  /* CV evidence as a stacked list: capability, score and confidence, then the matched lines, so nothing hides off-screen on a phone. */
  function cvList(cv, onlyMatched) {
    return `<div class="rq-cvl">${D.C.filter(c => cv.cl[c.id] && (!onlyMatched || cv.cl[c.id].s)).map(c => { const x = cv.cl[c.id]; return `<div class="rq-cvr"><div class="rq-cvh"><b>${esc(c.t)}</b><span class="num">${x.s ? `${x.s} · ${x.conf}` : 'Not seen'}</span></div><div>${x.sn.length ? x.sn.map(s => `<p class="rq-sn">${esc(s)}</p>`).join('') : '<span class="cap">Nothing matched</span>'}</div></div>`; }).join('')}</div>`;
  }
  function evidenceView(g, ctx) {
    const d = g.draft || create(0).draft, prac = practiceSnapshot(), nP = Object.keys(prac).length, cvx = ctx.ui.cvEx || null;
    let h = header(g, 'Show your evidence', 'Preferences describe what energises you; evidence shows what you have already done. RoleQuest triangulates three sources: your Sim Lab record, a work sample of how you decide; your CV; and your own ledger of what you have done. Use any or all of them.');
    h += UI.sheet('Evidence 1 · Sim Lab practice', nP ? `${nP} completed ${nP === 1 ? 'activity' : 'activities'} on record` : 'Your practice record', `${pracTable(prac)}${nP ? `<div class="field"><span class="lbl">Use this record as evidence?</span>${chipSet('useP', [{ v: true, t: 'Yes, use my practice record' }, { v: false, t: 'Leave it out' }], d.useP !== false)}</div>` : ''}`);
    let cvb = `<div class="field"><label class="lbl" for="rq-cv">Paste the text of your CV (optional)</label><textarea id="rq-cv" class="ti rq-ta" data-field="cvText" rows="9" placeholder="Paste your CV here: roles, bullet points, projects and education, one bullet per line.">${esc(ctx.ui.cvText || '')}</textarea></div><div class="actions"><button type="button" class="btn btn-ghost" data-act="m" data-op="parse">Read my CV</button>${cvx ? '<button type="button" class="btn btn-ghost" data-act="m" data-op="clearcv">Remove CV evidence</button>' : ''}</div><p class="cap">Your CV is read in your browser. Only the matched lines, at most two per capability, are saved with your report; the full text is never stored. Leave out contact details.</p>`;
    if (cvx) {
      if (cvx.low) cvb += UI.warn([{ t: 'warn', m: 'Limited CV evidence: the text is short or has few separate lines. Paste the full text with each bullet on its own line for a better reading.' }]);
      cvb += cvList(cvx, false);
      cvb += `<p class="cap">Scope and leadership proof: ${cvx.scope} of 100, from lines that show ownership and quantified results.</p>`;
    }
    h += UI.sheet('Evidence 2 · CV', cvx ? 'What your CV shows' : 'Add your CV', cvb);
    const led = d.led || {}, nL = Object.keys(led).length;
    h += UI.sheet('Evidence 3 · Your ledger', 'What you have actually done, capability by capability', `<p class="case">Answer for what you could show someone, not what you could learn. “Owned it” means you were accountable for the outcome, not that you were in the room. Skip any you are unsure of: a blank is treated as no evidence yet, never as a zero for skill.</p><div class="rq-ledger">${D.C.map(c => `<div class="rq-led"><div class="rq-led-t"><b>${esc(c.t)}</b><span class="cap">${esc(c.hint)}</span></div>${chipSet('l:' + c.id, D.LEDGER.map((t, i) => ({ v: i, t })), led[c.id] == null ? '' : led[c.id])}</div>`).join('')}</div><p class="cap">${nL} of ${D.C.length} logged.${nL ? ' <button type="button" class="link" data-act="m" data-op="clearled">Clear the ledger</button>' : ''} Your ledger counts for a fifth of the evidence wherever a CV or Sim Lab score also exists.</p>`);
    const srcs = [Object.keys(prac).length && d.useP !== false ? 'your practice record' : '', cvx ? 'your CV' : '', nL ? 'your ledger' : ''].filter(Boolean);
    h += `<section class="sheet result"><div class="actions"><button type="button" class="btn btn-primary btn-block" data-act="m" data-op="evidence">${srcs.length ? `Continue with ${andList(srcs)}` : 'Continue without evidence'}</button></div><p class="cap">Next: ${NQ} quick questions, one per screen, about eight to ten minutes. Answers save as you go, and you can change the last one.</p></section>`;
    return h;
  }

  /* ---------- Questions ---------- */
  function itemView(g) {
    const s = SEQ[g.ans.length], item = D.ITEMS[s.k][s.i];
    const card = (i, text, tag) => `<button type="button" class="rq-card" data-act="m" data-op="ans" data-v="${i}"><b>${tag}</b><span>${esc(text)}</span></button>`;
    const scale = labels => `<div class="rq-scale" role="group">${labels.map((l, i) => `<button type="button" class="chip" data-act="m" data-op="ans" data-v="${i + 1}">${esc(l)}</button>`).join('')}</div>`;
    let q = '', body = '';
    if (s.k === 'pref') { q = item[1]; body = `<div class="rq-pair">${card(0, item[2], 'A')}${card(1, item[3], 'B')}</div>`; }
    else if (s.k === 'trait') { q = item[1]; body = `<p class="cap">How much does this sound like you?</p>${scale(['Not like me', 'A little', 'Somewhat', 'Mostly', 'Very like me'])}`; }
    else if (s.k === 'int') { q = item[1]; body = `<p class="cap">How much would you enjoy this?</p>${scale(['Would dislike it', 'Not much', 'Neutral', 'Would like it', 'Would love it'])}`; }
    else if (s.k === 'val') { q = 'Which matters more to you in your next role?'; body = `<div class="rq-pair">${card(0, item[0][1], 'A')}${card(1, item[1][1], 'B')}</div>`; }
    else if (s.k === 'wp') { q = item[0]; body = `<div class="rq-pair rq-three">${item[1].map((o, i) => card(i, o[1], 'ABC'[i])).join('')}</div>`; }
    else { q = item[1]; body = `<div class="rq-pair">${card(0, item[2][0][1], 'A')}${card(1, item[2][1][1], 'B')}</div>`; }
    return slim(g, `Question ${g.ans.length + 1} of ${NQ}`, g.ans.length ? 'Change the last answer' : '') +
      `<section class="sheet rq-qs" id="rq-q"><span class="eyebrow">${SECT[s.k]}</span><h2 class="rq-q">${esc(q)}</h2>${body}<p class="cap">Answer for a normal working day, not for what sounds more senior. There are no right answers.</p></section>`;
  }
  function mapView(g) {
    const fs = functionScores(g).filter(x => !x.excl).sort((a, b) => b.fit - a.fit), top = topFunctions(g);
    let h = header(g, 'Your provisional map', 'These are the function families your answers lean towards. Next, RoleQuest asks sharper questions to separate the specific roles inside them.');
    h += UI.sheet('Intrinsic fit only', `Your top ${top.length} function families`, `<div class="meters">${fs.slice(0, top.length).map(x => UI.meter(esc(x.t), x.fit / 100, String(r0(x.fit)), 'rq')).join('')}</div><p class="cap">How naturally attractive the work looks from your answers. Evidence and opportunity come into the full report.</p>`);
    h += `<section class="sheet result"><p class="case">Up to ${MAX_AD} role questions follow: three for each family, then tie-breakers if two roles are still close.</p><div class="actions"><button type="button" class="btn btn-primary btn-block" data-act="m" data-op="continue">Go deeper into these roles</button></div><p class="cap"><button type="button" class="link" data-act="m" data-op="undo">Change my last answer</button></p></section>`;
    return h;
  }
  function adaptView(g) {
    const q = nextAdaptive(g); if (!q) return slim(g, 'Finishing', '');
    const swap = g.aa.length % 2 === 1, A = RL[swap ? q.b : q.a], B = RL[swap ? q.a : q.b];
    const card = (r, tag) => `<button type="button" class="rq-card" data-act="m" data-op="ad" data-a="${q.a}" data-b="${q.b}" data-kind="${q.kind}" data-f="${q.f || ''}" data-pick="${r.id === q.a ? 0 : 1}"><b>${tag}</b><span>${esc(r.m)}</span></button>`;
    return slim(g, `Role question ${g.aa.length + 1}`, g.aa.length ? 'Change the last answer' : '') +
      `<section class="sheet rq-qs" id="rq-q"><p class="rq-note">${q.kind === 'tie' ? 'Tie-breaker: your two closest roles' : `Inside ${esc(FN[q.f].t)}`}</p><h2 class="rq-q">Which mandate would you rather own for the next three years?</h2><div class="rq-pair">${card(A, 'A')}${card(B, 'B')}</div><p class="cap">Your earlier answers chose these questions. Pick the work that would energise you on a normal day, whatever the title.</p></section>`;
  }

  /* ---------- Report ---------- */
  const TABS = [['sum', 'Summary'], ['fun', 'Functions'], ['roles', 'Roles'], ['ind', 'Industries'], ['prof', 'Profile'], ['ev', 'Evidence'], ['plan', 'Gaps and plan'], ['hist', 'History'], ['meth', 'Method']];
  function validateCard(g, ctx) {
    const rs = liveRoles(g).slice(0, 3);
    if (g.val) {
      const t = { yes: 'You said it fits', partly: 'You said it partly fits', no: 'You said it does not fit yet' }[g.val.fit];
      return UI.sheet('Your check', 'Saved with this report', `<p class="case">${t}.${g.val.pick ? ` You will test <strong>${esc(RL[g.val.pick].t)}</strong> first.` : ''} ${g.val.fit === 'no' ? 'Disagreement is useful: look at the Profile tab for answers that surprised you, and retake once you have new evidence.' : 'Use the experiments below to test it cheaply before you commit.'}</p>`);
    }
    const u = ctx.ui;
    return UI.sheet('Check the fit', 'Does this match how you see yourself?', `${chipSet('vfit', [{ v: 'yes', t: 'Yes, it fits' }, { v: 'partly', t: 'Partly' }, { v: 'no', t: 'Not really' }], u.vfit)}<div class="field"><span class="lbl">Which hypothesis will you test first?</span>${chipSet('vpick', rs.map(r => ({ v: r.id, t: r.t })).concat([{ v: 'none', t: 'None of these' }]), u.vpick)}</div><div class="actions"><button type="button" class="btn btn-primary" data-act="m" data-op="validate"${u.vfit ? '' : ' disabled'}>Save my check</button></div><p class="cap">Your check is stored with this run, so later runs can be compared with what you expected.</p>`);
  }
  function summaryTab(g, ctx) {
    const rs = liveRoles(g), cf = confidence(g), fs = functionScores(g).filter(x => !x.excl), band = bandOf(profOf(g).years);
    let h = `<section class="sheet"><header class="sh"><span class="eyebrow">Top three role hypotheses · ${esc(band)} level</span><h2>Where you fit today</h2></header><div class="rq-tops">${rs.slice(0, 3).map((r, i) => { const w = watchouts(g, r)[0]; return `<div class="rq-top"><span class="eyebrow">${i + 1} · ${esc(FN[r.f].t)}</span><span class="rq-big num">${r0(r.rec)}</span><strong>${esc(r.t)}</strong><span class="cap num">Fit ${r0(r.fit)} · readiness ${r0(r.ready)} · opportunity ${r0(r.opp)}</span><p class="rq-why">${esc(whyRole(g, r))}</p>${w ? `<p class="cap">Watch out: ${esc(w.l)}</p>` : ''}</div>`; }).join('')}</div><p class="case">Confidence: <strong>${cf.level}</strong>, about ±${cf.band} points${cf.why.length ? `, because ${esc(cf.why.join('; '))}` : ''}. Strongest function overall: <strong>${esc(fs[0].t)}</strong>.</p></section>`;
    h += validateCard(g, ctx);
    h += UI.sheet('Sensitivity', 'What would change this?', `<ul class="notes plain">${sensitivity(g).map(x => `<li>${esc(x)}</li>`).join('')}</ul>`);
    h += UI.sheet('Next-step experiments', 'Three cheap ways to test your top roles before a big move', `<ol class="steps">${experiments(rs).map(x => `<li>${esc(x)}</li>`).join('')}</ol>`);
    return h;
  }
  function functionsTab(g) {
    const fs = functionScores(g);
    return UI.sheet('All twelve functions', 'Recommendation', `<div class="meters">${fs.map(x => UI.meter(`${esc(x.t)}${x.excl ? ' <small>(ruled out)</small>' : ''}`, x.rec / 100, String(r0(x.rec)), x.excl ? 'rq-off' : 'rq')).join('')}</div><p class="cap">Recommendation = 50% intrinsic fit + 35% readiness + 15% opportunity. Demand never rescues a weak fit: when fit is below 45, the recommendation is capped at fit plus 10.</p>`) +
      UI.sheet('Kept separate', 'Fit, readiness and opportunity', UI.table(['Function', 'Score', 'Fit', 'Readiness', 'Opportunity'], fs.map(x => ({ cls: x.excl ? 'miss' : '', cells: [`${esc(x.t)}${x.excl ? ' <small>ruled out</small>' : ''}`, `<strong>${r0(x.rec)}</strong>`, String(r0(x.fit)), String(r0(x.ready)), String(r0(x.opp))] })), { sticky: true })) +
      UI.sheet('Inside intrinsic fit', 'Where your fit comes from, top six', UI.table(['Function', 'Interests 30%', 'Work style 20%', 'Scenarios 20%', 'Values 20%', 'Preferences 10%'], fs.filter(x => !x.excl).slice(0, 6).map(x => [esc(x.t), r0(x.fp.interests * 100), r0(x.fp.style * 100), r0(x.fp.scenarios * 100), r0(x.fp.values * 100), r0(x.fp.prefs * 100)].map(String)), { sticky: true }) + '<p class="cap">Each lens scored 0 to 100 against what the function rewards. Scenarios are your choices between concrete pieces of work.</p>');
  }
  function rolesTab(g) {
    const rs = liveRoles(g).slice(0, 12), p = profOf(g), band = bandOf(p.years);
    return UI.sheet('Role hypotheses', `Top ${rs.length} roles at the ${esc(band)} level`, UI.table(['Role', 'Score', 'Fit', 'Ready', 'Opp.', 'Watch out'], rs.map((r, i) => { const w = watchouts(g, r)[0]; return [`<span class="rk">${i + 1}</span>${esc(r.t)}<br><small>${esc(FN[r.f].t)}</small>`, `<strong>${r0(r.rec)}</strong>`, String(r0(r.fit)), String(r0(r.ready)), String(r0(r.opp)), w ? esc(w.s) : '<span class="cap">–</span>']; }), { sticky: true, cls: 'wrap crit' }) + `<p class="cap">Titles are calibrated to ${p.years} year${p.years === 1 ? '' : 's'} of experience. A role moved up when you chose its mandate in the role questions, and down when you passed it over.</p>`);
  }
  function industriesTab(g) {
    const L = industries(g);
    return UI.sheet('Industry map', 'Stay, adjacent or pivot', UI.table(['Industry', 'Move', 'Score', 'Why'], L.map(x => [esc(x.t), UI.pill(x.type, x.type === 'Stay' ? 'good' : x.type === 'Adjacent' ? 'pen' : 'neutral'), String(r0(x.score)), esc(x.why)]), { sticky: true, cls: 'wrap crit' }) + '<p class="cap">Stay builds on your industry evidence; adjacent moves transfer most of it; pivots can fit well but need more proof. Industry demand is a curated, illustrative signal, and a hiring spike today is not a reason to change a long-term direction.</p>');
  }
  function profileTab(g) {
    const c = constructs(g);
    const lean = (v, t) => (Math.abs(v) < 0.01 ? 'Balanced' : `${Math.abs(v) >= 0.99 ? 'Clearly' : 'Leans'} ${(v > 0 ? t[0] : t[1]).toLowerCase()}`);
    return UI.sheet('Preferences', 'How you like to work', `<div class="rq-bis">${Object.keys(D.PREF_T).map(k => { const t = D.PREF_T[k], v = c.P[k]; return `<div class="rq-bi"><div class="rq-bi-h"><b>${t[2]}</b><span class="num">${lean(v, t)}</span></div><div class="rq-bi-r"><span>${t[1]}</span><span class="rq-bt" role="img" aria-label="${esc(`${t[2]}: ${lean(v, t)}`)}"><i style="left:${(((v + 1) / 2) * 100).toFixed(1)}%"></i></span><span>${t[0]}</span></div></div>`; }).join('')}</div><p class="cap">Each pair is a preference, not an ability: both ends work well in the right role.</p>`) +
      UI.sheet('Work style', 'Five broad tendencies', `<div class="meters">${Object.keys(D.TRAIT_T).map(k => UI.meter(D.TRAIT_T[k], c.T[k], String(r0(c.T[k] * 100)), 'rq')).join('')}</div>`) +
      UI.sheet('Interests', 'Six kinds of work, most attractive first', `<div class="meters">${Object.keys(D.INT_T).sort((a, b) => c.I[b] - c.I[a]).map(k => UI.meter(D.INT_T[k], c.I[k], String(r0(c.I[k] * 100)), 'rq')).join('')}</div>`) +
      UI.sheet('Values', 'What you chose in the trade-offs', `<div class="meters">${Object.keys(D.VAL_T).sort((a, b) => c.V[b] - c.V[a]).map(k => UI.meter(D.VAL_T[k], c.V[k], String(r0(c.V[k] * 100)), 'rq')).join('')}</div><p class="cap">Each value appeared in two trade-offs: 100 means you chose it both times. These lenses describe your answers today, for reflection; they are not a type, a diagnosis or a judgement, and they can change.</p>`);
  }
  function evidenceTab(g) {
    const ev = evidence(g), cv = ev.cv;
    let h = UI.sheet('Combined evidence', 'What RoleQuest has seen', UI.table(['Capability', 'Evidence', 'From'], D.C.map(c => [c.t, `<span class="rq-evb"><i style="width:${clamp(ev.E[c.id], 0, 100).toFixed(1)}%"></i></span><span class="num">${r0(ev.E[c.id])}</span>`, ev.src[c.id].length ? ev.src[c.id].map(s => SRC_T[s]).join(' + ') : '<span class="cap">Nothing yet</span>']), { sticky: true, cls: 'wrap crit rq-evt' }) + `<p class="cap">Evidence runs from 0 to 100. The CV counts for 50%, scored Sim Lab practice for 30% and your ledger for 20%, re-weighted over the sources that exist${cv ? '' : '; without a CV the result is discounted to 85% with practice and 75% on your ledger alone'}. A low number means RoleQuest has not seen evidence yet, not that you lack the capability.</p>`);
    h += UI.sheet('Practice evidence', 'Your Sim Lab record when you took this run', pracTable((g.ev || {}).prac));
    if (ev.nLed) h += UI.sheet('Ledger evidence', 'What you declared', UI.table(['Capability', 'Your level'], D.C.filter(c => ev.led[c.id] != null).map(c => [c.t, esc(D.LEDGER[ev.led[c.id]])]), { sticky: true, cls: 'crit' }));
    h += UI.sheet('CV evidence', cv ? 'Matched lines from your CV' : 'No CV in this run', cv ? cvList(cv, true) + `<p class="cap">Scope and leadership proof from your CV: ${cv.scope} of 100.</p>` : '<p class="case">Readiness rests on your practice record and profile. Retake with your CV text to test it against real experience.</p>');
    return h;
  }
  function planTab(g) {
    const rs = liveRoles(g).slice(0, 3), P = plan(g);
    let h = UI.sheet('Capability gaps', 'What your top three roles need, against what RoleQuest has seen', rs.map(r => `<div class="tres"><div><strong>${esc(r.t)}</strong><span class="cap">${esc(FN[r.f].t)}</span></div>${UI.table(['Capability', 'Need', 'Seen', 'Gap'], gaps(g, r).map(x => [CL[x.c].t, `<span aria-label="${x.need} of 3">${'●'.repeat(x.need)}<span class="rq-dim">${'●'.repeat(3 - x.need)}</span></span>`, String(r0(x.e)), UI.pill(`${r0(x.gap)} · ${x.pr}`, x.pr === 'High' ? 'warn' : x.pr === 'Medium' ? 'pen' : 'good')]), { sticky: true, cls: 'rq-gap' })}</div>`).join('') + '<p class="cap">Need runs from one to three dots. Seen is the evidence RoleQuest has, from 0 to 100. Gap = need × the evidence still missing; a high gap means RoleQuest has not seen enough proof yet, not that you lack the capability.</p>');
    h += UI.sheet('Development plan', P.length ? `For ${esc(rs[0].t)}` : 'No high or medium gaps for your top role', P.length ? P.map(p => `<div class="tres"><div><strong>${esc(CL[p.x.c].t)}</strong><span class="cap">Gap ${r0(p.x.gap)} · ${p.x.pr} priority</span></div><ol class="steps"><li><strong>Next 90 days · practise here.</strong> ${p.sims.length ? p.sims.map(s => `${esc(S.App.modules[s.id].title)}${s.done != null ? ` (best so far ${r0(s.done)})` : ''} <button type="button" class="link" data-act="new-run" data-module="${s.id}">Start</button>`).join(' · ') + '. A scored run becomes practice evidence for your next RoleQuest.' : 'Use the projects below.'}</li><li><strong>Next 90 days · prove it.</strong> ${esc(p.proj[0])}. Proof: a piece of work someone else has reviewed.</li><li><strong>3 to 9 months · stretch.</strong> ${esc(p.proj[1])}, or take an internship project that needs ${esc(CL[p.x.c].t.toLowerCase())}. Proof: an outcome you can quantify on your CV.</li></ol></div>`).join('') + '<p class="cap">Finishing a course does not raise readiness on its own; new evidence does, from a scored activity, a reviewed project or a quantified result on your CV.</p>' : '<p class="case">Your evidence already covers what your top role needs. Use the experiments on the Summary tab to test the role in practice.</p>');
    return h;
  }
  function historyTab(g, ctx) {
    const me = ctx.meta || {}, mine = me.completedAt || Date.now();
    const runs = Object.values(S.App.runs || {}).filter(r => r && r.module === 'roleq' && r.status === 'done' && r.id !== me.id).sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
    const prev = runs.find(r => (r.completedAt || 0) < mine);
    let h = '';
    if (prev) {
      const m = metricsOf(prev), nowRole = (liveRoles(g)[0] || {}).t, nowFn = (functionScores(g).filter(x => !x.excl)[0] || {}).t;
      h += UI.sheet('What moved', `Since your run of ${N.date(prev.completedAt || prev.updatedAt)}`, `<ul class="notes plain"><li>Top role: ${m['Top role'] === nowRole ? `still ${esc(nowRole)}` : `${esc(m['Top role'] || '–')} then, ${esc(nowRole)} now`}.</li><li>Top function: ${m['Top function'] === nowFn ? `still ${esc(nowFn)}` : `${esc(m['Top function'] || '–')} then, ${esc(nowFn)} now`}.</li><li>Confidence: ${esc(m.Confidence || '–')} then, ${confidence(g).level} now.</li></ul><p class="cap">A changed result is not a contradiction: new evidence and new experience should move it.</p>`);
    }
    h += UI.sheet('History', 'Your RoleQuest runs', runs.length ? UI.table(['Date', 'Top function', 'Top role', 'Confidence'], runs.map(r => { const m = metricsOf(r); return [N.date(r.completedAt || r.updatedAt), esc(m['Top function'] || '–'), esc(m['Top role'] || '–'), esc(m.Confidence || '–')]; }), { sticky: true }) + '<p class="cap">Retake after a material change, such as a new internship or several new Sim Lab results, rather than every week.</p>' : '<p class="case">This is your first completed run. Retake RoleQuest once you have added evidence, such as a few more Sim Lab activities or a new internship, to see what moved.</p>');
    return h;
  }
  function methodTab() {
    const v = D.version;
    return UI.sheet('Method', 'How RoleQuest scores', `<div class="case"><p><strong>Six lenses, kept apart.</strong> Interests, work style, values and preferences describe what energises you. CV evidence and Sim Lab practice evidence show what you have done. Opportunity describes where demand is. They are combined only at the end, and every component stays visible.</p><p><strong>Intrinsic fit</strong> = interests 30%, work style 20%, scenario choices 20%, values 20%, preferences 10%. <strong>Readiness</strong> = capability evidence 60% (CV 50%, scored Sim Lab practice 30% and your ledger 20%, re-weighted over the sources you gave), experience alignment 25%, scope and leadership proof 15%. <strong>Opportunity</strong> = curated demand 40%, industry adjacency 30%, ease of transition 30%. <strong>Recommendation</strong> = 50% fit, 35% readiness, 15% opportunity, and demand never rescues a weak fit.</p><p><strong>Adaptive questions</strong> come from a fixed, versioned bank of role mandates and are chosen by your earlier answers; nothing is generated on the fly, so every run can be replayed and audited.</p><p><strong>What it is not.</strong> RoleQuest is a career-exploration aid. It is not a clinical or diagnostic instrument, not a licensed personality test and not a selection tool: it must never be used to accept or reject anyone. Its weights are a starting hypothesis, to be validated against real outcomes.</p></div>${UI.table(['Version', 'Value'], [['Assessment', esc(v.assessment)], ['Role taxonomy', esc(v.taxonomy)], ['Scoring', esc(v.scoring)], ['Market signals', esc(v.market)]], { sticky: true })}`);
  }
  function reportHTML(g, ctx) {
    const rs = liveRoles(g), fs = functionScores(g), cf = confidence(g), c = constructs(g), ev = evidence(g), P = plan(g), v = D.version, p = profOf(g);
    const tbl = (head, rows) => `<table><thead><tr>${head.map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(x => `<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    const who = esc((ctx.me && ctx.me.name) || 'Candidate');
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RoleQuest report</title><style>body{font:14px/1.55 Georgia,serif;color:#17201D;background:#F5F3ED;max-width:860px;margin:0 auto;padding:28px 20px}h1,h2,th{font-family:Arial,Helvetica,sans-serif}h1{color:#CF466E;margin:0 0 4px}h2{border-bottom:2px solid #CF466E;padding-bottom:4px;margin-top:28px;font-size:18px}table{border-collapse:collapse;width:100%;margin:8px 0;background:#fff}th,td{border:1px solid #D8DDD9;padding:5px 7px;text-align:left;vertical-align:top}th{background:#E9E6DD;font-size:12px}.cap{color:#5C6863;font-size:12.5px}@media print{body{background:#fff}}</style></head><body>
<h1>RoleQuest report</h1><p class="cap">${who} · ${N.date(Date.now())} · ${p.years} years of experience · assessment ${esc(v.assessment)}, taxonomy ${esc(v.taxonomy)}, scoring ${esc(v.scoring)}, market signals ${esc(v.market)}</p>
<h2>Summary</h2><p>Top role hypotheses at the ${esc(bandOf(p.years))} level. Confidence ${cf.level}, about ±${cf.band} points${cf.why.length ? ', because ' + esc(cf.why.join('; ')) : ''}.</p>${tbl(['#', 'Role', 'Function', 'Score', 'Fit', 'Readiness', 'Opportunity', 'Why'], rs.slice(0, 10).map((r, i) => [i + 1, esc(r.t), esc(FN[r.f].t), r0(r.rec), r0(r.fit), r0(r.ready), r0(r.opp), i < 3 ? esc(whyRole(g, r)) : '']))}
${g.val ? `<p>Your check: ${{ yes: 'it fits', partly: 'it partly fits', no: 'it does not fit yet' }[g.val.fit]}${g.val.pick ? `; first role to test: ${esc(RL[g.val.pick].t)}` : ''}.</p>` : ''}
<h2>All functions</h2>${tbl(['Function', 'Score', 'Fit', 'Readiness', 'Opportunity'], fs.map(x => [esc(x.t) + (x.excl ? ' (ruled out)' : ''), r0(x.rec), r0(x.fit), r0(x.ready), r0(x.opp)]))}
<h2>Industries</h2>${tbl(['Industry', 'Move', 'Score', 'Why'], industries(g).map(x => [esc(x.t), x.type, r0(x.score), esc(x.why)]))}
<h2>Profile</h2>${tbl(['Lens', 'Result'], [['Interests, strongest first', Object.keys(D.INT_T).sort((a, b) => c.I[b] - c.I[a]).slice(0, 3).map(k => esc(D.INT_T[k])).join(', ')], ['Values, strongest first', Object.keys(D.VAL_T).sort((a, b) => c.V[b] - c.V[a]).slice(0, 3).map(k => esc(D.VAL_T[k])).join(', ')], ['Work style', Object.keys(D.TRAIT_T).map(k => `${esc(D.TRAIT_T[k])} ${r0(c.T[k] * 100)}`).join('; ')], ['Preferences', Object.keys(D.PREF_T).map(k => { const t = D.PREF_T[k], x = c.P[k]; return `${t[2]}: ${x > 0.01 ? t[0] : x < -0.01 ? t[1] : 'balanced'}`; }).join('; ')]])}
<h2>Evidence</h2>${tbl(['Capability', 'Evidence', 'From'], D.C.map(x => [esc(x.t), r0(ev.E[x.id]), ev.src[x.id].map(s => SRC_T[s]).join(' + ') || 'nothing yet']))}
<h2>Development plan${rs[0] ? ' for ' + esc(rs[0].t) : ''}</h2>${P.length ? tbl(['Capability', 'Priority', 'Next 90 days', '3 to 9 months'], P.map(q => [esc(CL[q.x.c].t), q.x.pr, esc(q.sims.map(s => S.App.modules[s.id].title).concat([q.proj[0]]).join('; ')), esc(q.proj[1])])) : '<p>No high or medium gaps for the top role.</p>'}
<h2>Next-step experiments</h2><ol>${experiments(rs).map(x => `<li>${esc(x)}</li>`).join('')}</ol>
<h2>Method and limits</h2><p class="cap">Recommendation = 50% intrinsic fit + 35% readiness + 15% opportunity; demand never rescues a weak fit. A career-exploration aid only: not a diagnostic instrument and not a selection tool. Original items; market signals are curated and illustrative. Only matched CV lines are stored.</p></body></html>`;
  }
  function reportView(g, ctx) {
    const tab = ctx.ui.tab || 'sum', rs = liveRoles(g), top = rs[0];
    let h = `<section class="sheet hdr rq-hero"><div class="hdr-top"><div class="sh"><span class="eyebrow">RoleQuest · Your career-fit map</span><h2>${top ? `${esc(top.t)} <span class="rq-sub">${esc(FN[top.f].t)}</span>` : 'Your report'}</h2></div><div class="hdr-pills">${UI.pill(esc(D.version.assessment), 'neutral')}</div></div><p class="case">Preference, evidence and market demand stay apart in this report, so what attracts you is never confused with what you can show today.</p><div class="actions"><button type="button" class="btn btn-ghost" data-act="m" data-op="download">Download report</button>${UI.btn('Retake RoleQuest', 'new-run', 'btn-ghost', 'data-module="roleq"')}</div></section>`;
    h += UI.tabs('tab', TABS.map(t => ({ v: t[0], t: t[1] })), tab, 'main-tabs', true);
    h += tab === 'fun' ? functionsTab(g) : tab === 'roles' ? rolesTab(g) : tab === 'ind' ? industriesTab(g) : tab === 'prof' ? profileTab(g) : tab === 'ev' ? evidenceTab(g) : tab === 'plan' ? planTab(g) : tab === 'hist' ? historyTab(g, ctx) : tab === 'meth' ? methodTab() : summaryTab(g, ctx);
    return h;
  }

  /* ---------- Home band: RoleQuest is the layer that turns Sim Lab practice into career evidence ---------- */
  function homeCard(last, active, runs) {
    const nDone = runs.filter(r => r.status === 'done' && r.score != null).length;
    const loop = [['Practise', 'Simulations, cases and practice sets here'], ['Prove', 'Every scored run becomes evidence of a capability'], ['Map', 'RoleQuest weighs fit, readiness and opportunity'], ['Plan', 'Your gaps point back to the activities that close them']];
    const evLine = nDone ? `${nDone} scored ${nDone === 1 ? 'activity' : 'activities'} on record count as evidence.` : 'Works without any Sim Lab history; every activity you complete later adds evidence.';
    let side;
    if (last) {
      const m = metricsOf(last), since = runs.filter(r => r.status === 'done' && r.score != null && (r.completedAt || 0) > (last.completedAt || 0)).length;
      const nudge = since ? `${since} new scored ${since === 1 ? 'activity' : 'activities'} since this report. Retake to see what moves.` : nDone ? 'Retake after you add evidence to see what moves.' : 'Complete a few Sim Lab activities, then retake to see what moves.';
      side = `<span class="eyebrow">Your latest report · ${N.ago(last.completedAt || last.updatedAt)}</span><strong class="rq-role">${esc(m['Top role'] || 'Report ready')}</strong><span class="cap">${esc(m['Top function'] || '')}${m.Confidence ? ` · confidence ${esc(m.Confidence)}` : ''}</span><div class="actions"><button type="button" class="btn btn-primary" data-act="open-run" data-id="${last.id}">Open report</button><button type="button" class="btn btn-ghost" data-act="new-run" data-module="roleq">Retake</button></div><p class="cap">${nudge}</p>`;
    } else if (active) {
      side = `<span class="eyebrow">In progress</span><strong class="rq-role">${esc(active.progress || 'Started')}</strong><div class="actions"><button type="button" class="btn btn-primary" data-act="open-run" data-id="${active.id}">Continue RoleQuest</button></div><p class="cap">${evLine}</p>`;
    } else {
      side = `<span class="eyebrow">About 20 minutes</span><strong class="rq-role">Twelve functions, ${ROLES.length} roles, one map</strong><div class="actions"><button type="button" class="btn btn-primary" data-act="new-run" data-module="roleq">Start RoleQuest</button></div><p class="cap">${evLine}</p>`;
    }
    return `<div class="rq-home"><div class="rq-pitch"><p class="blurb">RoleQuest asks which MBA roles fit you, then checks the answer against evidence: your CV and the scores you earn here. Its development plan points back to the simulations, cases and practice sets that build the proof you are missing.</p><ol class="rq-loop">${loop.map(x => `<li><b>${x[0]}</b><span>${x[1]}</span></li>`).join('')}</ol></div><div class="rq-last">${side}</div></div>`;
  }

  S.App.register({
    id: 'roleq', cat: 'career', title: 'RoleQuest', area: 'Career intelligence', length: 'About 20 minutes', depth: 'Career assessment', format: 'career', version: 1, persist: 'replay', wide: true,
    cta: 'Start RoleQuest', doneLabel: 'Report', homeEyebrow: 'Careers', homeTitle: 'Which MBA roles fit you?', homeCard,
    practises: 'Role fit · readiness evidence · market opportunity · development planning',
    blurb: 'Find the MBA roles that fit you. RoleQuest weighs your preferences, work style, interests and values against twelve functions and their roles, checks the result against your CV and your Sim Lab scores, and gives you a plan that points back to the activities that build the missing proof.',
    detail: `<p>Six lenses, kept separate: four describe what energises you, two show what you have done. A foundation of ${NQ} one-tap questions comes first, then up to ${MAX_AD} adaptive questions that separate the specific roles inside your strongest function families.</p><p>The report ranks all twelve functions and ${ROLES.length} roles at your experience level, shows fit, readiness and opportunity apart with a confidence band, maps industries as stay, adjacent or pivot, and turns your capability gaps into a 90-day and 3-to-9-month plan that links straight to the Sim Lab activities that build the evidence.</p><p>Your CV is read in your browser and only matched lines are kept. RoleQuest is a career-exploration aid, not a diagnostic or selection test.</p>`,
    options: [],
    create, apply,
    isDone: g => !!g.done,
    progress: g => (g.done ? 'Report ready' : g.stage === 'found' ? `Question ${g.ans.length + 1} of ${NQ}` : g.stage === 'adapt' ? `Role question ${g.aa.length + 1}` : (STAGES.find(s => s[0] === g.stage) || STAGES[0])[1]),
    view(g, ctx) {
      if (g.done) return reportView(g, ctx);
      if (g.stage === 'profile') return profileView(g);
      if (g.stage === 'evidence') return evidenceView(g, ctx);
      if (g.stage === 'found') return itemView(g);
      if (g.stage === 'map') return mapView(g);
      return adaptView(g);
    },
    field(g, name, value, el, ctx) {
      if (name === 'cvText') { ctx.ui.cvText = String(value || '').slice(0, 30000); return null; }
      if (name === 'vfit' || name === 'vpick') { ctx.ui[name] = value; return name === 'vfit' ? { rerender: true } : null; }
      const d = g.draft; if (!d) return null;
      if (name === 'p:years') d.years = clamp(Math.round(+value || 0), 0, 40);
      else if (name.indexOf('p:') === 0) d[name.slice(2)] = value;
      else if (name === 'useP') d.useP = value === true || value === 'true';
      else if (name.indexOf('l:') === 0 && CL[name.slice(2)]) { d.led = d.led || {}; d.led[name.slice(2)] = clamp(Math.round(+value || 0), 0, 4); return { rerender: true }; }
      return null;
    },
    act(g, op, el, ctx) {
      const d = g.draft || {}, now = Date.now();
      if ((op === 'ans' || op === 'ad' || op === 'undo') && ctx.ui.lastTap && now - ctx.ui.lastTap < 300) return null;
      if (op === 'ans' || op === 'ad' || op === 'undo') ctx.ui.lastTap = now;
      if (op === 'excl') {
        const v = el.dataset.v, i = d.excl.indexOf(v);
        if (i >= 0) d.excl.splice(i, 1); else if (d.excl.length < 6) d.excl.push(v); else return { toast: 'You can rule out up to six functions.' };
        return { rerender: true, draft: true };
      }
      if (op === 'profile') return { commit: { op: 'profile', p: { years: d.years, cur: d.cur, ind: d.ind, hor: d.hor, geo: d.geo, excl: d.excl.slice() } }, top: true };
      if (op === 'parse') { const t = ctx.ui.cvText || ''; if (t.trim().length < 40) return { toast: 'Paste more of your CV first.' }; ctx.ui.cvEx = parseCV(t); return { rerender: true }; }
      if (op === 'clearcv') { ctx.ui.cvEx = null; ctx.ui.cvText = ''; return { rerender: true }; }
      if (op === 'clearled') { d.led = {}; return { rerender: true, draft: true }; }
      if (op === 'evidence') { const prac = d.useP === false ? {} : practiceSnapshot(), cv = ctx.ui.cvEx || null; ctx.ui.cvText = ''; return { commit: { op: 'evidence', cv, prac, led: Object.assign({}, d.led || {}) }, top: true }; }
      if (op === 'ans') return { commit: { op: 'ans', v: +el.dataset.v, item: g.ans.length }, top: true };
      if (op === 'undo') return { commit: { op: 'undo' }, top: true };
      if (op === 'continue') return { commit: { op: 'continue' }, top: true };
      if (op === 'ad') return { commit: { op: 'ad', a: el.dataset.a, b: el.dataset.b, kind: el.dataset.kind, f: el.dataset.f || null, pick: +el.dataset.pick }, top: true };
      if (op === 'validate') { if (!ctx.ui.vfit) return { toast: 'Choose how well it fits first.' }; return { commit: { op: 'validate', fit: ctx.ui.vfit, pick: ctx.ui.vpick && ctx.ui.vpick !== 'none' ? ctx.ui.vpick : null }, top: false, toast: 'Your check is saved.' }; }
      if (op === 'download') { S.downloadText('roleq-report.html', reportHTML(g, ctx), 'text/html'); return null; }
      return null;
    },
    summary(g) {
      const rs = liveRoles(g), fs = functionScores(g).filter(x => !x.excl), cf = confidence(g);
      return { score: null, line: `Top role: ${rs[0] ? rs[0].t : '–'} · ${fs[0] ? fs[0].t : '–'} · confidence ${cf.level}`, metrics: [{ k: 'Top function', v: fs[0] ? fs[0].t : '–' }, { k: 'Top role', v: rs[0] ? rs[0].t : '–' }, { k: 'Confidence', v: cf.level }] };
    }
  });
  window.RoleQuestCore = { SEQ, NQ, MAX_AD, ROLES, parseCV, practiceEvidence, evidence, constructs, functionScores, roleScores, liveRoles, nextAdaptive, confidence, industries, gaps, plan, sensitivity, topFunctions, homeCard };
})();
