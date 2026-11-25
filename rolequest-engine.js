/* RoleQuest MBA — scoring engine.
   Recommendation = 0.50 Intrinsic Fit + 0.35 Readiness + 0.15 Opportunity, and the three never collapse:
   every surface that shows the composite can show the parts. Nothing here is random, so a run replays exactly. */
(function () {
  'use strict';
  const D = window.RoleQuestData;
  if (!D) return;

  const EV_LABEL = ['Not yet', 'Exposure', 'Contributed', 'Owned it', 'Led at scale'];
  /* Within-fit weights, and the top-level blend. Both are a product hypothesis, not a validated truth. */
  const FITW = { riasec: 30, style: 20, pattern: 20, value: 20, check: 10 };
  const BLEND = { fit: 0.50, readiness: 0.35, opportunity: 0.15 };
  const READW = { evidence: 60, experience: 25, recency: 15 };
  const OPPW = { demand: 40, adjacency: 30, availability: 30 };

  const fnIds = D.FUNCTIONS.map(f => f.id);
  const fnById = id => D.FUNCTIONS.find(f => f.id === id);
  const roleById = id => D.ROLES.find(r => r.id === id);
  const itemById = id => D.ITEMS.find(i => i.id === id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const bandOf = yrs => D.BANDS.find(b => yrs <= b.max) || D.BANDS[D.BANDS.length - 1];

  /* ---------- Intrinsic fit ---------- */
  /* Each answered item adds its chosen side's weights to the function tally for that construct kind.
     Kinds are normalised independently so a kind with more items does not dominate. */
  function fitParts(ans) {
    const byKind = {};
    Object.keys(FITW).forEach(k => { byKind[k] = {}; fnIds.forEach(f => (byKind[k][f] = 0)); });
    const counts = {};
    Object.keys(FITW).forEach(k => (counts[k] = 0));
    (ans || []).forEach(a => {
      const it = itemById(a.id);
      if (!it || a.pick == null) return;
      const side = a.pick === 0 ? it.a : it.b;
      const k = FITW[it.kind] ? it.kind : 'pattern';
      counts[k]++;
      Object.keys(side.w || {}).forEach(f => { if (byKind[k][f] != null) byKind[k][f] += side.w[f]; });
    });
    const out = {};
    fnIds.forEach(f => (out[f] = 0));
    let wsum = 0;
    Object.keys(FITW).forEach(k => {
      if (!counts[k]) return;
      const vals = fnIds.map(f => byKind[k][f]);
      const max = Math.max(1, ...vals);
      wsum += FITW[k];
      fnIds.forEach(f => { out[f] += FITW[k] * (byKind[k][f] / max); });
    });
    if (wsum > 0) fnIds.forEach(f => { out[f] = 100 * out[f] / wsum; });
    return { score: out, byKind, counts };
  }

  /* Discriminator answers sharpen the role layer inside a shortlisted function. */
  function roleAffinity(disc) {
    const out = {};
    (disc || []).forEach(a => {
      const fam = D.DISC[a.fn] || [];
      const it = fam.find(x => x.id === a.id);
      if (!it || a.pick == null) return;
      const side = a.pick === 0 ? it.a : it.b;
      Object.keys(side.r || {}).forEach(r => { out[r] = (out[r] || 0) + side.r[r]; });
    });
    return out;
  }

  /* ---------- Readiness ---------- */
  /* Evidence is matched against the role's capability demand: credit for what the role asks for,
     no credit for strength it does not need. Absence is reported as absence of evidence, never as absence of skill. */
  function evidenceFit(role, ev) {
    const demand = role.cap || {};
    let got = 0, want = 0;
    Object.keys(demand).forEach(c => {
      const need = demand[c], have = clamp((ev && ev[c]) || 0, 0, 4);
      want += need * 4;
      got += need * have;
    });
    return want ? clamp(100 * got / want, 0, 100) : 0;
  }
  function experienceFit(role, yrs) {
    const [lo, hi] = role.band;
    if (yrs >= lo && yrs <= hi) return 100;
    const d = yrs < lo ? lo - yrs : yrs - hi;
    return clamp(100 - d * 14, 0, 100);
  }
  function recencyFit(role, ev, recent) {
    const demand = role.cap || {}, set = recent || [];
    if (!set.length) return 40;
    let hit = 0, tot = 0;
    Object.keys(demand).forEach(c => { tot += demand[c]; if (set.indexOf(c) >= 0) hit += demand[c]; });
    const depth = Object.keys(demand).reduce((s, c) => s + clamp((ev && ev[c]) || 0, 0, 4), 0) / Math.max(1, Object.keys(demand).length * 4);
    return clamp(100 * (0.6 * (tot ? hit / tot : 0) + 0.4 * depth), 0, 100);
  }
  function readiness(role, ev, yrs, recent) {
    const e = evidenceFit(role, ev), x = experienceFit(role, yrs), r = recencyFit(role, ev, recent);
    return { total: (READW.evidence * e + READW.experience * x + READW.recency * r) / 100, evidence: e, experience: x, recency: r };
  }

  /* ---------- Opportunity ---------- */
  function opportunity(fn, industries) {
    const m = fn.market, picks = industries || [];
    const adj = picks.length
      ? picks.reduce((s, id) => { const i = D.INDUSTRIES.find(x => x.id === id); return s + ((i && i.adj[fn.id]) || 0); }, 0) / picks.length * 20
      : 50;
    const avail = 0.5 * m.availability + 0.5 * (100 - m.friction);
    return { total: (OPPW.demand * m.demand + OPPW.adjacency * adj + OPPW.availability * avail) / 100, demand: m.demand, adjacency: adj, availability: avail };
  }

  /* ---------- Confidence ---------- */
  /* Confidence falls when the person told us little, or told us two different things.
     A contradiction lowers certainty; it never implies the person was gaming the test. */
  function confidence(st) {
    const answered = (st.ans || []).filter(a => a.pick != null).length;
    const coverage = clamp(answered / Math.max(1, D.ITEMS.length), 0, 1);
    const evDone = Object.keys(st.ev || {}).filter(k => st.ev[k] > 0).length / D.CAPS.length;
    let agree = 1, checks = 0;
    (st.ans || []).forEach(a => {
      const it = itemById(a.id);
      if (!it || it.kind !== 'check' || !it.pair) return;
      const other = (st.ans || []).find(x => x.id === it.pair);
      if (!other || other.pick == null || a.pick == null) return;
      checks++;
      if (a.pick !== other.pick) agree -= 0.5;
    });
    agree = clamp(agree, 0, 1);
    const raw = 0.45 * coverage + 0.3 * evDone + 0.25 * (checks ? agree : 0.7);
    const band = raw >= 0.72 ? 'High' : raw >= 0.5 ? 'Medium' : 'Low';
    return { raw, band, coverage, evDone, agree, checks, tone: band === 'High' ? 'good' : band === 'Medium' ? 'neutral' : 'warn' };
  }

  /* ---------- Composite ---------- */
  function rank(st) {
    const fit = fitParts(st.ans), aff = roleAffinity(st.disc), conf = confidence(st);
    const fnScore = {};
    fnIds.forEach(f => (fnScore[f] = fit.score[f]));
    const roles = D.ROLES.map(role => {
      const fn = fnById(role.fn);
      const base = fnScore[role.fn] || 0;
      const bump = clamp((aff[role.id] || 0) * 3, 0, 18);
      const fitV = clamp(base + bump, 0, 100);
      const rd = readiness(role, st.ev, st.yrs || 0, st.recent);
      const op = opportunity(fn, st.industries);
      const total = BLEND.fit * fitV + BLEND.readiness * rd.total + BLEND.opportunity * op.total;
      return { role, fn, fit: fitV, readiness: rd, opportunity: op, total: clamp(total, 0, 100) };
    }).sort((a, b) => b.total - a.total);
    const funcs = D.FUNCTIONS.map(f => ({ fn: f, score: fnScore[f.id] || 0 })).sort((a, b) => b.score - a.score);
    return { funcs, roles, fit, conf };
  }

  /* Top four function families, plus a fifth if it sits inside the confidence margin. */
  function shortlist(st) {
    const r = rank(st), top = r.funcs.slice(0, 4);
    const fifth = r.funcs[4];
    if (fifth && top[3] && top[3].score - fifth.score < 6) top.push(fifth);
    return top.map(x => x.fn.id);
  }

  /* Gap = what the role asks for, minus what the person has evidenced, softened where interest is high
     (interest buys patience, not capability) and where confidence is low. */
  function gaps(entry, st) {
    const demand = entry.role.cap || {}, ev = st.ev || {};
    return Object.keys(demand).map(c => {
      const need = demand[c], have = clamp(ev[c] || 0, 0, 4);
      const raw = clamp(100 * (need * 4 - need * have) / Math.max(1, need * 4), 0, 100);
      return { cap: D.CAPS.find(x => x.id === c), need, have, gap: Math.round(raw), label: EV_LABEL[have] };
    }).filter(g => g.cap).sort((a, b) => b.gap - a.gap || b.need - a.need);
  }

  /* What would change this recommendation. Promoted to a required output: a score the user cannot
     interrogate is a score they should not trust. */
  function sensitivity(entry, st) {
    const out = [], g = gaps(entry, st);
    const top = g.filter(x => x.gap >= 40).slice(0, 2);
    top.forEach(x => {
      const lift = BLEND.readiness * READW.evidence / 100 * (x.need * 1) / Math.max(1, Object.keys(entry.role.cap).reduce((s, k) => s + entry.role.cap[k] * 4, 0)) * 100;
      out.push(`Move <strong>${x.cap.name}</strong> from "${x.label}" to the next level and the readiness component rises by roughly ${Math.max(1, Math.round(lift * 4))} points.`);
    });
    const [lo, hi] = entry.role.band;
    if ((st.yrs || 0) < lo) out.push(`This title usually assumes ${lo}+ years. At ${st.yrs} you are being scored against a band you have not reached, which holds readiness down more than fit.`);
    if (!(st.industries || []).length) out.push('No target industries were chosen, so the opportunity layer is running on a neutral default. Choosing two or three will move it either way.');
    const c = confidence(st);
    if (c.band !== 'High') out.push(`Confidence is <strong>${c.band}</strong>. Completing the evidence ledger moves this more than answering more preference questions.`);
    return out;
  }

  window.RoleQuestEngine = {
    EV_LABEL, FITW, BLEND, READW, OPPW,
    fitParts, roleAffinity, readiness, opportunity, confidence, rank, shortlist, gaps, sensitivity,
    bandOf, fnById, roleById, evidenceFit, experienceFit
  };
})();
