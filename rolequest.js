/* RoleQuest MBA — adaptive career-fit module for B-School Sim Lab.
   A guided career investigation, not a personality quiz: preference, evidence and market demand stay separate
   all the way to the report, and every recommendation carries a confidence band and a "what would change this".
   Single-player by design; the institution, recruiter and governance workspaces live in the standalone product. */
(function () {
  'use strict';
  const S = window.SimLab, D = window.RoleQuestData, E = window.RoleQuestEngine;
  if (!S || !D || !E) return;
  const { UI, U, N } = S;
  const esc = U.esc;
  const LET = 'AB';

  const DEPTH = { guided: { found: 14, adapt: 4, bridge: true }, standard: { found: 20, adapt: 8, bridge: true }, expert: { found: 99, adapt: 12, bridge: false } };
  const NOTE = {
    guided: 'Foundation: a shorter item set, the provisional map shown before the adaptive stage, and plain-language explanation throughout.',
    standard: 'Intermediate: the full preference set and a deeper adaptive stage.',
    expert: 'Advanced: every item including the consistency probes, the longest adaptive stage, and no provisional map before the result.'
  };
  const STAGES = ['profile', 'ledger', 'recent', 'found', 'bridge', 'adapt', 'done'];
  const tone = v => (v >= 70 ? 'good' : v >= 50 ? 'neutral' : 'warn');

  /* The foundation set is fixed per difficulty so a saved run replays identically. */
  function foundationOrder(diff) {
    const want = DEPTH[diff].found;
    const base = D.ITEMS.filter(i => i.kind !== 'check');
    const checks = D.ITEMS.filter(i => i.kind === 'check');
    const kinds = ['riasec', 'pattern', 'style', 'value'];
    const out = [];
    let i = 0;
    while (out.length < Math.min(want, base.length)) {
      const k = kinds[i % kinds.length];
      const nextOne = base.find(x => x.kind === k && out.indexOf(x.id) < 0);
      if (nextOne) out.push(nextOne.id);
      else if (base.every(x => out.indexOf(x.id) >= 0)) break;
      i++;
    }
    if (diff === 'expert') checks.forEach(c => out.push(c.id));
    return out;
  }
  function adaptOrder(st) {
    const fns = E.shortlist(st), out = [];
    const max = DEPTH[st.cfg.difficulty].adapt;
    for (let round = 0; round < 2; round++) {
      fns.forEach(f => {
        const fam = D.DISC[f] || [];
        if (fam[round] && out.length < max) out.push({ fn: f, id: fam[round].id });
      });
    }
    return out;
  }

  const stageIdx = g => STAGES.indexOf(g.stage);
  const totalSteps = g => 3 + g.order.length + (DEPTH[g.cfg.difficulty].bridge ? 1 : 0) + (g.adapt || []).length;
  function doneSteps(g) {
    let n = Math.min(3, stageIdx(g));
    n += (g.ans || []).length;
    if (stageIdx(g) > STAGES.indexOf('found') && DEPTH[g.cfg.difficulty].bridge) n += 1;
    n += (g.disc || []).length;
    return n;
  }

  /* ---------- Views ---------- */
  function header(g) {
    const pct = Math.round(100 * doneSteps(g) / Math.max(1, totalSteps(g)));
    const c = E.confidence(g);
    /* While the ledger is open the count follows the draft, so the number moves as the user answers. */
    const evSrc = (!g.done && g.stage === 'ledger' && g.draft && g.draft.ev) ? g.draft.ev : g.ev;
    const items = [
      { k: 'Progress', v: g.done ? 'Complete' : pct + '%' },
      { k: 'Ledger answered', v: `${Object.keys(evSrc).length} / ${D.CAPS.length}` },
      { k: 'Preference items', v: String((g.ans || []).filter(a => a.pick != null).length) },
      { k: 'Confidence', v: c.band, d: g.done ? 'in this result' : 'so far' }
    ];
    return `<section class="sheet hdr"><div class="hdr-top"><div class="sh"><span class="eyebrow">Career intelligence · Role taxonomy ${esc(D.taxonomyVersion)}</span><h2>RoleQuest MBA</h2></div><div class="hdr-pills">${UI.level(g.cfg.difficulty)}${UI.pill(g.done ? 'Career-fit map' : stageLabel(g), 'neutral')}</div></div>${UI.kpis(items)}</section>`;
  }
  function stageLabel(g) {
    return { profile: 'Your context', ledger: 'Evidence ledger', recent: 'Recent work', found: `Preference ${(g.ans || []).length + 1} of ${g.order.length}`, bridge: 'Provisional map', adapt: `Role depth ${(g.disc || []).length + 1} of ${(g.adapt || []).length}` }[g.stage] || '';
  }

  function profileView(g) {
    const d = g.draft || {};
    const inds = D.INDUSTRIES.map(i => `<button type="button" class="chip" data-act="m" data-op="ind" data-v="${i.id}" aria-pressed="${(d.industries || []).indexOf(i.id) >= 0}">${esc(i.name)}</button>`).join('');
    const yrs = d.yrs == null ? 3 : d.yrs;
    const band = E.bandOf(yrs);
    return UI.sheet('Step 1 · Your context', 'Before preferences, the facts that change what a recommendation means',
      `<p class="case">Role recommendations are meaningless without a seniority band. The same interest profile points at an analyst role at two years and a P&L at fifteen.</p>
       ${UI.field('Total years of full-time work experience', UI.num('yrs', yrs, { min: 0, max: 30, step: 1, dec: 0, unit: 'yrs', label: 'Years of experience', wide: true }), `At ${yrs} years the usual title band is <strong>${esc(band.title)}</strong>. ${esc(band.rule)}`)}
       ${UI.field('Industries you would consider', `<div class="chips">${inds}</div>`, 'Pick two or three. This drives the opportunity layer only; it never overrides intrinsic fit. Leave empty and that layer runs on a neutral default.')}
       <div class="actions"><button type="button" class="btn btn-primary btn-block" data-act="m" data-op="go">Continue to the evidence ledger</button></div>`);
  }

  function ledgerView(g) {
    const d = g.draft || {}, ev = d.ev || {};
    const rows = D.CAPS.map(c => {
      const cur = ev[c.id] == null ? -1 : ev[c.id];
      const btns = E.EV_LABEL.map((lab, i) => `<button type="button" class="chip" data-act="m" data-op="ev" data-c="${c.id}" data-v="${i}" aria-pressed="${cur === i}">${esc(lab)}</button>`).join('');
      return `<div class="rd-row"><div><strong>${esc(c.name)}</strong></div><p class="cap">${esc(c.hint)}</p><div class="chips sm">${btns}</div></div>`;
    }).join('');
    const n = Object.keys(ev).length;
    return UI.sheet('Step 2 · Evidence ledger', 'What you have actually done, cluster by cluster',
      `<p class="case">The standalone product reads this from your CV. Here you declare it, which is slower but more honest: you will notice the gaps yourself while filling it in.</p>
       <p class="case"><strong>Answer for what you can evidence</strong>, not what you could learn. "Owned it" means you were accountable for the outcome, not that you were in the room.</p>
       ${rows}
       <div class="actions"><button type="button" class="btn btn-primary btn-block" data-act="m" data-op="go">${n >= D.CAPS.length ? 'Continue' : `Continue (${n} of ${D.CAPS.length} logged)`}</button></div>
       <p class="cap">Leaving a cluster blank is allowed. It lowers confidence rather than scoring you zero, because absence of evidence is not evidence of absence.</p>`);
  }

  function recentView(g) {
    const d = g.draft || {}, set = d.recent || [];
    const btns = D.CAPS.filter(c => (g.ev[c.id] || 0) > 0).map(c => `<button type="button" class="chip" data-act="m" data-op="rec" data-v="${c.id}" aria-pressed="${set.indexOf(c.id) >= 0}">${esc(c.name)}</button>`).join('');
    return UI.sheet('Step 3 · Recency', 'Which of these have you used in the last eighteen months?',
      `<p class="case">Recency separates a capability you have from one you had. Pick up to three.</p>
       <div class="chips">${btns || '<span class="cap">Nothing logged in the ledger yet.</span>'}</div>
       <div class="actions"><button type="button" class="btn btn-primary btn-block" data-act="m" data-op="go">Start the preference set</button></div>`);
  }

  function itemView(g) {
    const id = g.order[(g.ans || []).length], it = D.ITEMS.find(x => x.id === id);
    if (!it) return '';
    const d = g.draft || {};
    const KIND = { riasec: 'Interests', style: 'Work style', value: 'Work values and anchors', pattern: 'Business mandate', check: 'Consistency' };
    const opts = [it.a, it.b].map((side, i) => `<button type="button" class="opt" data-act="m" data-op="pick" data-i="${i}" aria-pressed="${d.pick === i}"><b>${LET[i]}</b><span>${esc(side.t)}</span></button>`).join('');
    const hint = g.cfg.difficulty === 'guided' ? `<p class="note">Choose what is more energising on a normal working day, not what sounds more senior.</p>` : '';
    return `<section class="sheet" id="rq-q"><header class="sh"><span class="eyebrow">${esc(KIND[it.kind] || 'Preference')} · item ${(g.ans || []).length + 1} of ${g.order.length}</span><h2>${esc(it.q)}</h2></header><div class="opts" role="group" aria-label="Options">${opts}</div>${hint}<div class="actions"><button type="button" class="btn btn-primary btn-block" data-act="m" data-op="go">Lock in this answer</button></div></section>`;
  }

  function bridgeView(g) {
    const r = E.rank(g), top = r.funcs.slice(0, 5);
    const meters = top.map(x => UI.meter(esc(x.fn.short), x.score / 100, Math.round(x.score), tone(x.score))).join('');
    const fns = E.shortlist(g).map(id => E.fnById(id).short).join(', ');
    return UI.sheet('Provisional map', 'Where the preference set has pointed so far',
      `<p class="case">This is a direction, not a result. Readiness and market context have not been applied yet.</p>
       <div class="meters">${meters}</div>
       <p class="case" style="margin-top:14px">The next questions change because of these answers. RoleQuest will now go deeper inside <strong>${esc(fns)}</strong> to separate specific roles rather than asking you more general questions.</p>
       <div class="actions"><button type="button" class="btn btn-primary btn-block" data-act="m" data-op="go">Continue to role depth</button></div>`);
  }

  function discView(g) {
    const step = (g.disc || []).length, spec = g.adapt[step];
    if (!spec) return '';
    const fam = D.DISC[spec.fn] || [], it = fam.find(x => x.id === spec.id);
    if (!it) return '';
    const d = g.draft || {}, fn = E.fnById(spec.fn);
    const opts = [it.a, it.b].map((side, i) => `<button type="button" class="opt" data-act="m" data-op="pick" data-i="${i}" aria-pressed="${d.pick === i}"><b>${LET[i]}</b><span>${esc(side.t)}</span></button>`).join('');
    return `<section class="sheet" id="rq-q"><header class="sh"><span class="eyebrow">Adaptive role depth · ${esc(fn.name)} · ${step + 1} of ${g.adapt.length}</span><h2>${esc(it.q)}</h2></header><div class="opts" role="group" aria-label="Options">${opts}</div><p class="cap">You are seeing this because your earlier answers pointed at ${esc(fn.short)}. A different profile gets different questions here.</p><div class="actions"><button type="button" class="btn btn-primary btn-block" data-act="m" data-op="go">${step === g.adapt.length - 1 ? 'Finish and build my map' : 'Lock in this answer'}</button></div></section>`;
  }

  /* ---------- Result ---------- */
  function resultView(g) {
    const r = E.rank(g), c = r.conf, top = r.roles.slice(0, 8), f1 = r.funcs[0], r1 = r.roles[0];
    const band = E.bandOf(g.yrs);
    let h = `<section class="sheet result"><span class="eyebrow">Career-fit map · confidence ${esc(c.band)}</span><div class="grade"><span class="letter">${Math.round(r1.total)}</span><div><h2>${esc(r1.role.title)}</h2><span class="score">Top role hypothesis · ${esc(f1.fn.name)} · ${esc(band.title)} band</span></div></div>
      <p class="case">RoleQuest separates preference, evidence and market demand so an attractive role is not confused with a ready one. ${UI.pill('Confidence ' + c.band, c.tone)}</p></section>`;

    /* Three components, never collapsed. */
    h += UI.sheet('The three layers', 'What the number is made of',
      `${UI.kpis([
        { k: 'Intrinsic fit', v: Math.round(r1.fit), d: `${Math.round(E.BLEND.fit * 100)}% of the score` },
        { k: 'Readiness', v: Math.round(r1.readiness.total), d: `${Math.round(E.BLEND.readiness * 100)}% of the score` },
        { k: 'Opportunity', v: Math.round(r1.opportunity.total), d: `${Math.round(E.BLEND.opportunity * 100)}% of the score` },
        { k: 'Recommendation', v: Math.round(r1.total), d: 'blended' }
      ])}
      <p class="case" style="margin-top:12px">A high fit with low readiness is a development plan. A high readiness with low fit is a trap you can walk into easily and regret slowly.</p>`);

    h += UI.sheet('Function ranking', 'All twelve families, by intrinsic fit',
      `<div class="meters">${r.funcs.map(x => UI.meter(esc(x.fn.short), x.score / 100, Math.round(x.score), tone(x.score))).join('')}</div>`);

    h += UI.sheet('Role hypotheses', 'Ranked, with the layers kept apart',
      UI.table(['Role', 'Function', 'Fit', 'Ready', 'Opp', 'Score', 'Band'],
        top.map(x => [esc(x.role.title), esc(x.fn.short), String(Math.round(x.fit)), String(Math.round(x.readiness.total)), String(Math.round(x.opportunity.total)), `<strong>${Math.round(x.total)}</strong>`, `${x.role.band[0]}–${x.role.band[1]} yrs`]),
        { sticky: true }));

    const watch = top.slice(0, 4).map(x => `<li class="info"><span class="wdot"></span><span><strong>${esc(x.role.title)}.</strong> ${esc(x.role.watch)}</span></li>`).join('');
    h += UI.sheet('Watchouts', 'What a careers adviser would add', `<ul class="warns">${watch}</ul>`);

    /* Gaps for the top role. */
    const gaps = E.gaps(r1, g);
    h += UI.sheet('Gap analysis', `What ${esc(r1.role.title)} asks for, against what you evidenced`,
      `${UI.table(['Capability', 'Role needs', 'You logged', 'Gap'],
        gaps.map(x => [esc(x.cap.name), '★'.repeat(x.need), esc(x.label), `<strong>${x.gap}</strong>`]), { cls: 'wrap' })}
       <p class="cap" style="margin-top:10px">A high gap means RoleQuest has not seen enough evidence, not that you lack the capability.</p>`);

    /* Development plan from the two largest gaps. */
    const plan = gaps.filter(x => x.gap >= 40).slice(0, 3);
    h += UI.sheet('Development plan', 'Evidence to build, not courses to collect',
      plan.length ? `<ol class="steps">${plan.map(x => `<li><strong>${esc(x.cap.name)}</strong> — currently "${esc(x.label)}", the role wants ${'★'.repeat(x.need)}.<br><span class="cap">Why it matters: ${esc(x.cap.hint)}<br>How to prove it: take one piece of work where you are accountable for the outcome, not the analysis, and carry it to a measured result. Horizon: one to two quarters.</span></li>`).join('')}</ol>`
        : `<p class="case">No capability gap above the reporting threshold for this role. The constraint is more likely to be seniority band or market access than capability.</p>`);

    /* Sensitivity — promoted to a required output. */
    const sens = E.sensitivity(r1, g);
    h += UI.sheet('What would change this', 'Interrogate the recommendation before you trust it',
      `<ul class="warns">${sens.map(s => `<li class="info"><span class="wdot"></span><span>${s}</span></li>`).join('')}</ul>`);

    /* Psychometric layers, kept separable and non-diagnostic. */
    const fk = r.fit.byKind, KN = { riasec: 'Interests', style: 'Work style', value: 'Values and anchors', pattern: 'Business mandate', check: 'Consistency' };
    h += UI.fold('Preference layers, kept separate', Object.keys(KN).filter(k => r.fit.counts[k]).map(k => {
      const vals = D.FUNCTIONS.map(f => ({ f, v: fk[k][f.id] })).sort((a, b) => b.v - a.v).slice(0, 3);
      return `<p class="case"><strong>${esc(KN[k])}</strong> (${r.fit.counts[k]} items) leans towards ${vals.map(x => esc(x.f.short)).join(', ')}.</p>`;
    }).join('') + `<p class="cap">These are preference signals, not a clinical instrument. RoleQuest does not administer any licensed personality inventory, and nothing here is a diagnosis of personality, ability or mental health.</p>`, false, 'Methodology');

    h += UI.fold('How the score was built', `
      <p class="case">Recommendation = ${Math.round(E.BLEND.fit * 100)}% intrinsic fit + ${Math.round(E.BLEND.readiness * 100)}% readiness + ${Math.round(E.BLEND.opportunity * 100)}% opportunity.</p>
      <p class="case">Within readiness: ${E.READW.evidence}% evidence match, ${E.READW.experience}% experience-band alignment, ${E.READW.recency}% recency and scope. Within opportunity: ${E.OPPW.demand}% skill demand, ${E.OPPW.adjacency}% industry adjacency, ${E.OPPW.availability}% availability and transition friction.</p>
      <p class="case">Confidence came out <strong>${esc(c.band)}</strong> from ${Math.round(c.coverage * 100)}% item coverage, ${Math.round(c.evDone * 100)}% ledger completeness${c.checks ? `, and ${c.agree === 1 ? 'consistent' : 'partly inconsistent'} answers on the ${c.checks} paired probes` : ''}.</p>
      <p class="cap">These weights are a product hypothesis, not a validated psychometric truth. They need outcome data to earn their keep, and would be revised once enough people report what they actually did next. Market figures are a dated reference set from ${esc(D.signalDate)}, not a live job feed.</p>`, false, 'Methodology');

    h += UI.reveal('What this module deliberately leaves out', `
      <p class="case">RoleQuest as a product has four workspaces: candidate, institution, recruiter and super admin. This module is the candidate one, single-player.</p>
      <p class="case">Not here, and not pretended: CV parsing and evidence extraction from a real document; cohort percentiles, which need a comparison cohort and a minimum cell size before they mean anything; recruiter role profiles and opt-in matching; the outcome record and validation dataset that would let anyone check whether these recommendations predict satisfaction or performance.</p>
      <p class="case">That last one matters most. Until outcomes come back, this is a structured way to think, not a validated predictor, and it should be argued with rather than obeyed.</p>`, false, 'Scope');

    h += `<div class="actions">${UI.btn('Download the full report', 'm', 'btn-ghost', 'data-op="dl"')}${UI.btn('Take the current RoleQuest', 'new-run', 'btn-primary', 'data-module="roleq"')}${UI.btn('Back to home', 'leave-run', 'btn-ghost')}</div>`;
    return h;
  }

  function report(g) {
    const r = E.rank(g), c = r.conf, b = E.bandOf(g.yrs);
    const L = [];
    L.push('ROLEQUEST MBA — CAREER-FIT REPORT');
    L.push('Generated in B-School Sim Lab · role taxonomy ' + D.taxonomyVersion + ' · market signals ' + D.signalDate);
    L.push('');
    L.push('CONTEXT: ' + g.yrs + ' years experience · usual band: ' + b.title);
    L.push('Industries considered: ' + ((g.industries || []).map(i => (D.INDUSTRIES.find(x => x.id === i) || {}).name).filter(Boolean).join(', ') || 'none chosen'));
    L.push('Confidence in this result: ' + c.band);
    L.push('');
    L.push('TOP ROLE HYPOTHESES');
    r.roles.slice(0, 8).forEach((x, i) => L.push(`${i + 1}. ${x.role.title} (${x.fn.name}) — score ${Math.round(x.total)} = fit ${Math.round(x.fit)} / readiness ${Math.round(x.readiness.total)} / opportunity ${Math.round(x.opportunity.total)}. Watchout: ${x.role.watch}`));
    L.push('');
    L.push('FUNCTION RANKING (intrinsic fit)');
    r.funcs.forEach((x, i) => L.push(`${i + 1}. ${x.fn.name} — ${Math.round(x.score)}`));
    L.push('');
    L.push('GAP ANALYSIS for ' + r.roles[0].role.title);
    E.gaps(r.roles[0], g).forEach(x => L.push(`- ${x.cap.name}: role needs ${x.need}/5, you logged "${x.label}", gap ${x.gap}`));
    L.push('');
    L.push('WHAT WOULD CHANGE THIS');
    E.sensitivity(r.roles[0], g).forEach(s => L.push('- ' + s.replace(/<[^>]+>/g, '')));
    L.push('');
    L.push('METHOD: Recommendation = 50% intrinsic fit + 35% readiness + 15% opportunity.');
    L.push('These weights are a product hypothesis, not a validated psychometric truth. This is a structured way to');
    L.push('think about role direction, not a selection instrument, and not a diagnosis of personality or ability.');
    return L.join('\n');
  }

  /* ---------- Module ---------- */
  S.App.register({
    /* Retired in favour of the RoleQuest module (roleq.js): kept so runs saved with this version still open from History. */
    id: 'rolequest', cat: 'career', title: 'RoleQuest MBA (earlier version)', area: 'Career intelligence', retired: true,
    length: '25–45 items · 15–25 min', depth: 'Assessment', format: 'practice', version: 1, persist: 'replay', wide: false,
    practises: 'career direction · role and function fit · evidence audit · gap analysis · development planning',
    blurb: 'An adaptive career-fit assessment that triangulates interests, work style, values, your own evidence and current role demand — then adapts its questions once a direction emerges. Separates what suits you from what you are ready for, and tells you what would change its mind.',
    options: [
      { id: 'difficulty', label: 'Depth', default: 'standard', choices: [
        { v: 'guided', t: 'Foundation', s: '14 items, provisional map shown' },
        { v: 'standard', t: 'Intermediate', s: '20 items, deeper role stage' },
        { v: 'expert', t: 'Advanced', s: 'Full set with consistency probes' }
      ] }
    ],
    create(seed, cfg) {
      const difficulty = S.normLevel((cfg || {}).difficulty || 'standard');
      return { v: 1, seed, cfg: { difficulty }, stage: 'profile', yrs: 3, industries: [], ev: {}, recent: [], ans: [], disc: [], order: foundationOrder(difficulty), adapt: [], done: false, draft: { yrs: 3, industries: [], ev: {}, recent: [], pick: null } };
    },
    apply(g, d) {
      if (g.done || !d) return;
      if (d.op === 'profile') { g.yrs = d.yrs; g.industries = d.industries || []; g.stage = 'ledger'; g.draft = { ev: {}, recent: [], pick: null }; return; }
      if (d.op === 'ledger') { g.ev = d.ev || {}; g.stage = 'recent'; g.draft = { recent: [], pick: null }; return; }
      if (d.op === 'recent') { g.recent = d.recent || []; g.stage = 'found'; g.draft = { pick: null }; return; }
      if (d.op === 'item') {
        g.ans.push({ id: d.id, pick: d.pick });
        g.draft = { pick: null };
        if (g.ans.length >= g.order.length) {
          g.adapt = adaptOrder(g);
          g.stage = DEPTH[g.cfg.difficulty].bridge ? 'bridge' : 'adapt';
          if (!g.adapt.length) { g.stage = 'done'; g.done = true; g.draft = null; }
        }
        return;
      }
      if (d.op === 'bridge') { g.stage = 'adapt'; g.draft = { pick: null }; return; }
      if (d.op === 'disc') {
        g.disc.push({ fn: d.fn, id: d.id, pick: d.pick });
        g.draft = { pick: null };
        if (g.disc.length >= g.adapt.length) { g.stage = 'done'; g.done = true; g.draft = null; }
        return;
      }
    },
    isDone: g => !!g.done,
    progress: g => (g.done ? 'Complete' : stageLabel(g)),
    view(g) {
      let h = header(g);
      if (g.done) return h + resultView(g);
      if (g.stage === 'profile') return h + profileView(g);
      if (g.stage === 'ledger') return h + ledgerView(g);
      if (g.stage === 'recent') return h + recentView(g);
      if (g.stage === 'found') return h + itemView(g);
      if (g.stage === 'bridge') return h + bridgeView(g);
      if (g.stage === 'adapt') return h + discView(g);
      return h;
    },
    field(g, name, value) { if (g.draft && name === 'yrs') g.draft.yrs = value; return null; },
    act(g, op, el) {
      const d = g.draft;
      if (op === 'dl') { S.downloadText && S.downloadText('rolequest-career-fit.txt', report(g), 'text/plain'); return { toast: 'Report downloaded.' }; }
      if (!d) return null;
      if (op === 'ind') { const v = el.dataset.v, a = d.industries || (d.industries = []); const i = a.indexOf(v); if (i >= 0) a.splice(i, 1); else a.push(v); return { rerender: true, draft: true }; }
      if (op === 'ev') { (d.ev || (d.ev = {}))[el.dataset.c] = +el.dataset.v; return { rerender: true, draft: true }; }
      if (op === 'rec') { const v = el.dataset.v, a = d.recent || (d.recent = []); const i = a.indexOf(v); if (i >= 0) a.splice(i, 1); else if (a.length < 3) a.push(v); else return { toast: 'Pick at most three.' }; return { rerender: true, draft: true }; }
      if (op === 'pick') { d.pick = +el.dataset.i; return { rerender: true, draft: true }; }
      if (op === 'go') {
        if (g.stage === 'profile') {
          const y = parseFloat(d.yrs == null ? g.yrs : d.yrs);
          if (!isFinite(y) || y < 0) return { toast: 'Enter your years of experience.' };
          return { commit: { op: 'profile', yrs: Math.round(y), industries: (d.industries || []).slice() }, top: true };
        }
        if (g.stage === 'ledger') {
          if (!Object.keys(d.ev || {}).length) return { toast: 'Log at least one capability to continue.' };
          return { commit: { op: 'ledger', ev: Object.assign({}, d.ev) }, top: true, toast: 'Evidence ledger saved.' };
        }
        if (g.stage === 'recent') return { commit: { op: 'recent', recent: (d.recent || []).slice() }, top: true };
        if (g.stage === 'found') {
          if (d.pick == null) return { toast: 'Choose one.', scrollTo: 'rq-q' };
          const id = g.order[g.ans.length];
          const last = g.ans.length === g.order.length - 1;
          return { commit: { op: 'item', id, pick: d.pick }, top: true, toast: last ? 'Preference set complete.' : null };
        }
        if (g.stage === 'bridge') return { commit: { op: 'bridge' }, top: true };
        if (g.stage === 'adapt') {
          if (d.pick == null) return { toast: 'Choose one.', scrollTo: 'rq-q' };
          const spec = g.adapt[g.disc.length];
          const last = g.disc.length === g.adapt.length - 1;
          return { commit: { op: 'disc', fn: spec.fn, id: spec.id, pick: d.pick }, top: true, toast: last ? 'Your career-fit map is ready.' : null };
        }
      }
      return null;
    },
    summary(g) {
      const r = E.rank(g), c = r.conf, r1 = r.roles[0], f1 = r.funcs[0];
      return {
        score: Math.round(r1.total),
        line: `${r1.role.title} · ${f1.fn.name} · confidence ${c.band}`,
        metrics: [
          { k: 'Top function', v: f1.fn.short },
          { k: 'Fit', v: String(Math.round(r1.fit)) },
          { k: 'Readiness', v: String(Math.round(r1.readiness.total)) },
          { k: 'Confidence', v: c.band }
        ]
      };
    }
  });
})();
