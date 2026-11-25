/* Crisis Room: interface for the branching crisis-management scenarios. Engine: crisisroom-engine.js; content: crisisroom-data.js. */
(function () {
  'use strict';
  const S = window.SimLab, CE = window.CrisisRoomEngine;
  if (!S || !CE || !window.CrisisRoomData) return;
  const { UI, N, U } = S;
  const esc = U.esc, clamp = U.clamp, sum = U.sum, clone = U.clone;
  const SH = CE.SH, SH_NAME = Object.fromEntries(SH.map(s => [s.k, s.name]));
  const SH_COL = { c: 'var(--s1)', e: 'var(--s2)', r: 'var(--s3)', m: 'var(--s4)', i: 'var(--c-e)', p: 'var(--c-f)' };
  const KIND = { news: 'News', social: 'Social', email: 'Email', data: 'Data' };
  const uiStr = (ctx, k, d) => (ctx.ui[k] == null || ctx.ui[k] === '' ? d : ctx.ui[k]);
  const guided = g => g.cfg.difficulty !== 'expert';
  const Sc = g => CE.sc(g.sid);
  const advisor = (g, id) => Sc(g).advisors.find(a => a.id === id);
  const money = v => '$' + N.num(v, v >= 10 || v === 0 ? 0 : 1) + 'M';
  const signed = v => N.sign(v, x => N.num(x, 0));
  const draft = g => { if (!g.draft) g.draft = { choices: {} }; if (!g.draft.choices) g.draft.choices = {}; return g.draft; };
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const LETTERS = ['A', 'B', 'C', 'D'];
  const stop = t => String(t || '').replace(/[.?!]+$/, '');
  const sentence = t => { const x = String(t || '').trim(); return /[.?!]$/.test(x) ? x : x + '.'; };

  /* ---------- Header ---------- */
  function header(g, done) {
    const sc = Sc(g), P = done ? null : CE.phaseOf(g), n = sc.phases.length;
    const ti = CE.trustIndex(g), start = g.hist[0].index;
    return `<section class="sheet hdr"><div class="hdr-top"><div class="sh"><span class="eyebrow">${esc(sc.area)} · ${done ? 'Debrief' : `${esc(P.clock)} · phase ${g.phase + 1} of ${n}`}</span><h2>${esc(sc.company)}</h2></div><div class="hdr-pills">${UI.pill(esc(sc.title), 'pen')}${UI.level(g.cfg.difficulty)}</div></div>${UI.kpis([
      { k: sc.labels.safety, v: N.int(g.m.safety), d: `of 100 · ${signed(g.m.safety - g.hist[0].safety)} since start`, cls: g.m.safety >= g.hist[0].safety ? 'up' : 'down' },
      { k: 'Stakeholder trust', v: N.int(ti), d: `of 100 · ${signed(ti - start)} since start`, cls: ti >= start ? 'up' : 'down' },
      { k: 'Cost so far', v: money(g.m.cost), d: `budget ${money(sc.budget)}`, cls: g.m.cost > sc.budget ? 'down' : '' },
      { k: 'Legal exposure', v: N.int(g.m.legal), d: 'of 100, lower is better', cls: g.m.legal > g.hist[0].legal + 10 ? 'down' : '' }
    ])}</section>`;
  }

  /* ---------- Results of the last phase ---------- */
  function deltaChips(g, d) {
    const out = [];
    if (d.safety) out.push(`<span class="pill ${d.safety > 0 ? 'good' : 'bad'}">${esc(Sc(g).labels.safety)} ${signed(d.safety)}</span>`);
    if (d.legal) out.push(`<span class="pill ${d.legal < 0 ? 'good' : 'bad'}">Legal exposure ${signed(d.legal)}</span>`);
    if (d.cost) out.push(`<span class="pill ${d.cost < 0 ? 'good' : 'warn'}">Cost ${d.cost > 0 ? '+' : N.MINUS}${money(Math.abs(d.cost))}</span>`);
    if (S.lvlOf(g) === 0) Object.keys(d.trust || {}).filter(k => Math.abs(d.trust[k]) >= 0.5).sort((a, b) => Math.abs(d.trust[b]) - Math.abs(d.trust[a])).forEach(k => out.push(`<span class="pill ${d.trust[k] > 0 ? 'good' : 'bad'}">${SH_NAME[k]} ${signed(d.trust[k])}</span>`));
    else { const t = sum(SH.map(s => (d.trust[s.k] || 0) * Sc(g).weights[s.k])) / sum(SH.map(s => Sc(g).weights[s.k])); if (Math.abs(t) >= 0.5) out.push(`<span class="pill ${t > 0 ? 'good' : 'bad'}">Trust ${signed(t)}</span>`); }
    return out.length ? `<div class="dchips">${out.join('')}</div>` : '';
  }
  function resultsBanner(g) {
    const r = g.last; if (!r) return '';
    const items = r.items.map(x => {
      if (x.kind === 'event') return `<li class="${x.bad ? 'bad' : x.good ? 'good' : 'info'}"><span class="wdot" aria-hidden="true"></span><span><strong>${x.bad ? 'Then: ' : ''}</strong>${esc(x.text)}</span></li>`;
      const label = x.kind === 'statement' ? 'Your statement' : x.kind === 'allocate' ? 'Your budget' : esc(stop(x.label));
      return `<li class="info"><span class="wdot" aria-hidden="true"></span><span><strong>${label}.</strong> ${esc(x.text || '')}</span></li>`;
    }).join('');
    return `<section class="sheet result"><header class="sh"><span class="eyebrow">What happened · ${esc(r.clock)}</span><h2>${esc(r.title)}</h2></header><ul class="warns">${items}</ul>${deltaChips(g, r.delta)}</section>`;
  }

  /* ---------- Situation ---------- */
  function feedView(P) {
    return `<ul class="feed">${P.feed.map(x => `<li class="fd ${x.kind}"><span class="fd-k">${KIND[x.kind] || 'News'}</span><span class="fd-s">${esc(x.src)}</span><span class="fd-t">${esc(x.text)}</span></li>`).join('')}</ul>`;
  }
  function advisorsView(g, P) {
    const left = CE.ASKS - g.asks, huddled = g.huddle;
    const cards = P.advisors.map(a => {
      const A = advisor(g, a.id), heard = CE.heardOf(g, a.id);
      const body = heard ? `<p class="adv-t">${a.t ? esc(a.t) : '<span class="cap">Nothing to add on this one.</span>'}</p>` : `<button type="button" class="btn btn-ghost btn-block" data-act="m" data-op="ask" data-who="${a.id}"${left <= 0 || huddled ? ' disabled' : ''}>Ask ${esc(A.name.split(' ')[0])}</button>`;
      return `<article class="adv${heard ? ' heard' : ''}"><header><span class="adv-n">${esc(A.name)}</span><span class="adv-r">${esc(A.role)}</span></header>${body}</article>`;
    }).join('');
    const status = huddled ? 'You called the whole team together and heard everyone.' : left > 0 ? `You can ask ${plural(left, 'more advisor')} privately this phase, or call the whole team together.` : 'You have used your private conversations for this phase.';
    return UI.sheet('Your team', 'Who do you listen to?', `<p class="cap">${status} Each advisor sees part of the picture. A full team meeting means you hear everyone, but it takes time, and customers and the media notice the wait.</p><div class="advs">${cards}</div>${huddled ? '' : `<div class="actions">${UI.btn('Call the whole team together', 'm', 'btn-ghost', 'data-op="huddle"')}</div>`}`);
  }
  function choiceView(g, D, sel) {
    return `<div class="opts" role="group" aria-label="${esc(D.prompt)}">${D.options.map((o, k) => `<button type="button" class="opt" data-act="m" data-op="pick" data-d="${D.id}" data-v="${o.id}" aria-pressed="${sel === o.id}"><b>${LETTERS[k]}</b><span>${esc(o.label)}</span></button>`).join('')}</div>`;
  }
  function statementView(g, D, sel) {
    const v = sel || {}, els = v.els || [];
    const chips = D.elements.map(e => `<button type="button" class="stel" data-act="m" data-op="el" data-d="${D.id}" data-v="${e.id}" aria-pressed="${els.indexOf(e.id) >= 0}"${els.indexOf(e.id) < 0 && els.length >= D.max ? ' disabled' : ''}><span class="box" aria-hidden="true"></span><span>${esc(e.label)}</span></button>`).join('');
    const spokes = D.spokes.map(s => `<button type="button" class="chip" data-act="m" data-op="spoke" data-d="${D.id}" data-v="${s.id}" aria-pressed="${v.spoke === s.id}">${esc(s.label)}</button>`).join('');
    const chans = D.channels.map(c => `<button type="button" class="chip" data-act="m" data-op="chan" data-d="${D.id}" data-v="${c.id}" aria-pressed="${v.channel === c.id}">${esc(c.label)}</button>`).join('');
    return `<p class="cap">Choose up to ${D.max} lines. ${els.length} chosen.</p><div class="stels">${chips}</div><div class="field"><span class="lbl">Who delivers it?</span><div class="chips sm" role="group" aria-label="Spokesperson">${spokes}</div></div><div class="field"><span class="lbl">How and when?</span><div class="chips sm" role="group" aria-label="Channel">${chans}</div></div>`;
  }
  function allocateView(g, D, sel) {
    const v = sel || {}, used = sum(D.buckets.map(b => +v[b.id] || 0));
    return `<div class="pgrid">${D.buckets.map(b => `<div class="fbox"><span class="lbl">${esc(b.label)}</span>${UI.num(`al:${D.id}:${b.id}`, +v[b.id] || 0, { min: 0, max: D.total, step: 1, dec: 0, label: b.label, pre: '$', unit: 'M' })}</div>`).join('')}</div><p class="hint" data-live="al:${D.id}">${allocHint(D, used)}</p>`;
  }
  const allocHint = (D, used) => (used > D.total ? `<span class="down">Allocated $${used}M of $${D.total}M: take out $${used - D.total}M.</span>` : `Allocated <strong>$${used}M</strong> of $${D.total}M${used < D.total ? ` · $${D.total - used}M unallocated` : ''}.`);
  function complete(g, P) {
    const d = draft(g), missing = [];
    P.decisions.forEach(D => {
      const v = d.choices[D.id];
      if (D.kind === 'choice' && !v) missing.push(D.prompt);
      if (D.kind === 'statement' && (!v || !(v.els || []).length || !v.spoke || !v.channel)) missing.push(D.prompt);
      if (D.kind === 'allocate') { const used = sum(D.buckets.map(b => +((v || {})[b.id]) || 0)); if (used > D.total) missing.push(`${D.prompt} (over by $${used - D.total}M)`); }
    });
    return missing;
  }
  function decisionsView(g, P) {
    const d = draft(g);
    let h = P.decisions.map((D, k) => {
      const sel = d.choices[D.id];
      const body = D.kind === 'statement' ? statementView(g, D, sel) : D.kind === 'allocate' ? allocateView(g, D, sel) : choiceView(g, D, sel);
      return UI.sheet(`Decision ${k + 1} of ${P.decisions.length}`, esc(D.prompt), body);
    }).join('');
    const miss = complete(g, P), last = g.phase === Sc(g).phases.length - 1;
    h += `<section class="sheet submit"><p class="case">${miss.length ? `Still to decide: ${esc(sentence(miss.map(stop).join('; ')))}` : 'Your decisions are ready. Once you move on they cannot be changed, and the next phase begins.'}</p><button type="button" class="btn btn-primary btn-block" data-act="m" data-op="decide"${miss.length ? ' disabled' : ''}>${last ? 'Make the final decision' : 'Decide and move on'}</button></section>`;
    return h;
  }
  function situationView(g, ctx) {
    const sc = Sc(g), P = CE.phaseOf(g);
    let h = '';
    if (ctx.ui.showLast && g.last) h += resultsBanner(g);
    if (g.phase === 0) h += UI.brief(sc.company, !ctx.ui.seenBrief, `<p>${esc(sc.role)}</p><p>${esc(sc.intro)}</p><p>Each phase brings new information. You can ask two advisors privately or call the whole team together, then you decide. Your choices move public safety, legal exposure, cost and the trust of six groups: customers, employees, regulators, the media, investors and partners. Some choices change what happens later.</p>`, 'In a crisis, the facts you have not heard are the ones that hurt you.');
    h += UI.sheet(esc(P.clock), esc(P.title), `<p class="case">${P.brief}</p>${feedView(P)}`);
    h += advisorsView(g, P);
    h += decisionsView(g, P);
    return h;
  }

  /* ---------- Stakeholders ---------- */
  function stakeholdersView(g) {
    const sc = Sc(g), W = sc.weights, H = g.hist;
    const rows = SH.map(s => { const now = g.m.trust[s.k], st = H[0].trust[s.k]; return [`<i class="cdot" style="background:${SH_COL[s.k]}" aria-hidden="true"></i>${s.name}`, N.pct(W[s.k] / sum(Object.values(W))), guided(g) || g.done ? N.int(now) : '–', guided(g) || g.done ? `<span class="${now >= st ? 'up' : 'down'}">${signed(now - st)}</span>` : '–']; });
    let h = UI.sheet('Stakeholders', 'Who you have to keep with you', UI.table(['Group', 'Weight', 'Trust', 'Since start'], rows, { sticky: true, foot: ['Weighted trust', '100%', N.int(CE.trustIndex(g)), signed(CE.trustIndex(g) - H[0].index)] }) + `<p class="cap">${guided(g) || g.done ? 'Trust runs from 0 to 100. The weights show how much each group counts in this crisis.' : 'Advanced level shows only the weighted trust while the crisis runs. Each group’s trust is revealed in the debrief.'}</p>`);
    if (H.length > 1) {
      const X = i => (i === 0 ? 'Start' : 'P' + i);
      h += UI.sheet('Over time', 'Trust after each phase', UI.chart('cr-trust', () => ({ series: (guided(g) || g.done ? SH.map(s => ({ values: H.map(x => x.trust[s.k]), c: SH_COL[s.k], w: 1.6 })) : []).concat([{ values: H.map(x => x.index), c: 'var(--ink)', w: 3 }]), xLabel: X, yMin: 0, yMax: 100 }), 220, (guided(g) || g.done ? SH.map(s => ({ t: s.name, c: SH_COL[s.k] })) : []).concat([{ t: 'Weighted trust', c: 'var(--ink)' }]), 'Trust over time') +
        UI.chart('cr-metrics', () => ({ series: [{ values: H.map(x => x.safety), c: 'var(--good)', w: 2.5 }, { values: H.map(x => x.legal), c: 'var(--bad)', w: 2 }], xLabel: X, yMin: 0, yMax: 100 }), 190, [{ t: sc.labels.safety, c: 'var(--good)' }, { t: 'Legal exposure', c: 'var(--bad)' }], 'Safety and legal exposure over time') +
        UI.chart('cr-cost', () => ({ series: [{ values: H.map(x => x.cost), c: 'var(--s2)', w: 2.5, area: true }], xLabel: X, yMin: 0, refs: [{ y: sc.budget, label: 'budget' }], yFmt: v => '$' + v + 'M' }), 170, [{ t: 'Cumulative cost', c: 'var(--s2)' }], 'Cost over time'));
    }
    return h;
  }

  /* ---------- Log ---------- */
  function logView(g) {
    if (!g.record.length) return UI.sheet('Crisis log', 'Nothing yet', UI.empty('Your decisions and what followed will appear here.'));
    return UI.sheet('Crisis log', plural(g.record.length, 'phase'), `<ol class="tl">${g.record.map(r => `<li><span class="tl-c">${esc(r.clock)}</span><span class="tl-t">${esc(r.title)}</span><ul>${r.items.map(x => x.kind === 'event' ? `<li class="${x.bad ? 'down' : ''}">${esc(x.text)}</li>` : `<li><strong>${x.kind === 'statement' ? 'Statement' : x.kind === 'allocate' ? 'Budget' : esc(stop(x.label))}.</strong> ${esc(x.text || '')}</li>`).join('')}</ul></li>`).join('')}</ol>`);
  }

  /* ---------- Guide ---------- */
  function guideView(g) {
    let h = `<section class="hero"><span class="eyebrow">Participant guide</span><h1>How Crisis Room works</h1><p class="lede">A crisis in phases. Information arrives in pieces, advisors each see part of it, and early choices shape what happens later.</p></section>`;
    h += UI.fold('The scenarios', UI.table(['Scenario', 'Company', 'Crisis', 'Phases'], CE.scenarios().map(s => [esc(s.title), esc(s.company), esc(s.area), String(s.phases)]), { cls: 'wrap' }), true, '1');
    h += UI.fold('Each phase', `<div class="case"><p>Each phase opens with a situation and a feed of news, social posts, emails and data. Five advisors each hold part of the picture, and some of what they know is critical to the decision. You can talk to two of them privately, or call the whole team together: you then hear everyone, but the delay costs a little trust with customers and the media.</p><p>Decisions come in three forms: a choice between courses of action; a public statement, built from up to five lines with a spokesperson and a channel; and a budget split, where returns diminish in each area. Then the next phase begins, and earlier choices can trigger events.</p></div>`, false, '2');
    h += UI.fold('What is measured', `<div class="case"><p><strong>Safety</strong> (public safety, customer protection or product safety, 0–100): how well the people at risk are protected. <strong>Stakeholder trust</strong> (0–100 for each of six groups, weighted by how much each matters in this crisis). <strong>Cost</strong> in millions of dollars, against a budget. <strong>Legal exposure</strong> (0–100, lower is better).</p></div>`, false, '3');
    h += UI.fold('Scoring', `<div class="case"><p>Safety 25%, weighted trust 35%, cost 15% (full marks fall gently up to the budget, then faster), legal exposure 10%, and <strong>process</strong> 15%: the share of the critical information you heard before deciding.</p></div>`, false, '4');
    h += UI.fold('Concepts', `<div class="ideas">${[
      ['Speed and transparency.', 'The first hours set the story. Acting early on credible risk, and saying so, beats waiting for certainty.'],
      ['Situational crisis communication.', 'Match the response to responsibility: concern and clear instructions always; apology and accountability once the facts support them.'],
      ['Instructing information.', 'Tell people exactly what to do to protect themselves before anything else.'],
      ['Stakeholder mapping.', 'Customers, employees, regulators, media, investors and partners want different things, and neglecting any one becomes a second crisis.'],
      ['Hidden profiles.', 'Teams fail when members do not share the unique information they hold. Leaders must draw it out before deciding.'],
      ['Narrow scope versus over-reaction.', 'Too narrow a response looks like a cover-up; too broad a response does damage of its own. Evidence decides the scope.']
    ].map(([a, b]) => `<p><strong>${a}</strong> ${b}</p>`).join('')}</div>`, false, '5');
    void g;
    return h;
  }

  /* ---------- Debrief ---------- */
  function coachNotes(g, s) {
    const notes = [], sc = Sc(g), R = g.record;
    const missed = [];
    R.forEach(r => r.crit.forEach(id => { if (r.heardCrit.indexOf(id) < 0) missed.push({ r, id }); }));
    const pr = s.parts.process;
    notes.push(pr >= 0.99 ? 'You heard every piece of critical information before deciding. That is the habit that matters most.' : `You heard ${N.pct(pr)} of the critical information before deciding. ${missed.length ? `For example, in “${missed[0].r.title}” you did not hear from ${advisor(g, missed[0].id).name} (${advisor(g, missed[0].id).role.toLowerCase()}).` : ''}`);
    const choices = []; R.forEach(r => r.items.forEach(x => { if (x.kind === 'choice' && x.best) choices.push(Object.assign({ phase: r.title }, x)); }));
    const wrong = choices.filter(x => x.choice !== x.best);
    if (wrong.length) { const w = wrong[0]; notes.push(`In “${w.phase}”, the strongest option was: ${w.bestLabel} ${w.why}`); }
    const st = []; R.forEach(r => r.items.forEach(x => { if (x.kind === 'statement') st.push(Object.assign({ phase: r.title }, x)); }));
    st.forEach(x => {
      if (x.traps.length) notes.push(`Your statement in “${x.phase}” included ${plural(x.traps.length, 'line')} that tend to backfire: blaming others, minimising the risk or promising what you cannot yet know.`);
      else if (x.goodN >= 4) notes.push(`Your statement in “${x.phase}” covered what people needed: what happened, what to do, concern, action and when they will hear more.`);
    });
    const bad = []; R.forEach(r => r.items.forEach(x => { if (x.kind === 'event' && x.bad) bad.push(x.text); }));
    if (bad.length) notes.push(`${plural(bad.length, 'event')} turned against you because of earlier choices, such as: ${bad[0]}`);
    if (g.m.cost > sc.budget) notes.push(`The crisis cost ${money(g.m.cost)}, above the ${money(sc.budget)} budget.`);
    const worst = SH.slice().sort((a, b) => g.m.trust[a.k] - g.m.trust[b.k])[0];
    if (g.m.trust[worst.k] < 50) notes.push(`${worst.name} ended with the lowest trust (${N.int(g.m.trust[worst.k])} of 100). Look at which decisions cost you their support.`);
    return notes.slice(0, 7);
  }
  function debriefView(g, ctx) {
    const sc = Sc(g), s = CE.score(g), P = s.parts;
    let h = `<section class="sheet"><header class="sh"><span class="eyebrow">Debrief · Crisis Room · ${esc(sc.title)}</span></header><div class="grade"><span class="letter" aria-label="Grade ${S.grade(s.total)}"><span class="hl draw">${S.grade(s.total)}</span></span><div class="grade-txt"><span class="h2">${S.gradeWord(s.total)}</span><span class="score num">${s.total} / 100</span></div></div>${g.finale ? `<p class="case">${esc(g.finale.text)}</p>` : ''}${UI.kpis([
      { k: sc.labels.safety, v: N.int(g.m.safety), d: '25% of the score' }, { k: 'Weighted trust', v: N.int(CE.trustIndex(g)), d: '35%' },
      { k: 'Cost', v: money(g.m.cost), d: `budget ${money(sc.budget)} · 15%` }, { k: 'Critical information heard', v: N.pct(P.process), d: '15%' }
    ])}<p class="cap">Legal exposure ended at ${N.int(g.m.legal)} of 100 (10% of the score). You chose the strongest option in ${N.pct(s.best)} of choices.</p></section>`;
    h += stakeholdersView(g);
    const rows = [];
    g.record.forEach(r => r.items.forEach(x => {
      if (x.kind === 'choice') rows.push({ cls: x.choice === x.best ? '' : 'miss', cells: [esc(r.title), esc(x.prompt), `${x.choice === x.best ? '<span class="up">✓</span> ' : ''}${esc(x.label)}`, x.choice === x.best ? '–' : esc(x.bestLabel || '')] });
      else if (x.kind === 'statement') rows.push({ cells: [esc(r.title), 'Public statement', `${x.goodN} strong line${x.goodN === 1 ? '' : 's'}${x.traps.length ? `, <span class="down">${plural(x.traps.length, 'risky line')}</span>` : ''}`, x.goodN >= 4 && !x.traps.length ? '–' : 'What happened, what to do, concern, action, updates'] });
      else if (x.kind === 'allocate') rows.push({ cells: [esc(r.title), 'Budget', Object.keys(x.amounts).map(k => `${k} $${x.amounts[k]}M`).join(', '), esc(x.advice)] });
    }));
    h += UI.sheet('Decision review', 'Your choices against the strongest options', UI.table(['Phase', 'Decision', 'You chose', 'Strongest option'], rows, { sticky: true, cls: 'wrap' }));
    const whys = []; g.record.forEach(r => r.items.forEach(x => { if (x.kind === 'choice' && x.why) whys.push(`<p><strong>${esc(r.title)}: ${esc(x.prompt)}</strong> ${esc(x.why)}</p>`); }));
    if (whys.length) h += UI.fold('Why those options', `<div class="ideas">${whys.join('')}</div>`, false, 'Expert view');
    h += UI.sheet('Process', 'Critical information, phase by phase', UI.table(['Phase', 'Critical advisors', 'You heard'], g.record.map(r => [esc(r.title), r.crit.map(id => esc(advisor(g, id).name)).join(', ') || '–', r.huddle ? 'Everyone (team meeting)' : r.heardCrit.length + ' of ' + r.crit.length + (r.consulted.length ? ` · asked ${r.consulted.map(id => esc(advisor(g, id).name.split(' ')[0])).join(', ')}` : ' · asked nobody')]), { sticky: true, cls: 'wrap' }));
    h += `<section class="sheet"><header class="sh"><span class="eyebrow">Coach’s notes</span><h2>What to take away</h2></header><ul class="notes plain">${coachNotes(g, s).map(n => `<li>${esc(n)}</li>`).join('')}</ul></section>`;
    h += logView(g);
    h += `<div class="actions"><button type="button" class="btn btn-primary" data-act="retry-run" data-id="${ctx.meta.id}">Replay this crisis</button><button type="button" class="btn btn-ghost" data-act="new-run" data-module="crisisroom">New crisis</button><button type="button" class="btn btn-ghost" data-act="leave-run">Back to home</button></div>`;
    return h;
  }

  /* ---------- Module ---------- */
  function findDecision(g, id) { const P = CE.phaseOf(g); return P ? P.decisions.find(D => D.id === id) : null; }
  S.App.register({
    id: 'crisisroom', cat: 'people', title: 'Crisis Room', area: 'Crisis leadership', length: '3 scenarios · 20–30 min each', depth: 'Full simulation', version: 1, persist: 'replay', wide: true,
    practises: 'Crisis management · leading under pressure · sharing information in teams',
    blurb: 'Lead a company through a food recall, a cyberattack or a product safety crisis over seven or eight phases. Draw information out of your team, decide under pressure, write the public statement and keep six stakeholder groups with you as early choices come back to bite.',
    detail: '<p>Three branching crisis scenarios. Each phase brings a situation, a feed of news, social posts and emails, and five advisors who each hold part of the picture. You can ask two of them or call the whole team. Decisions include courses of action, public statements built line by line with a spokesperson and a channel, and budget splits. Choices move safety, legal exposure, cost and the trust of customers, employees, regulators, the media, investors and partners, and set off later events. The debrief scores your process as well as your outcomes.</p>',
    options: [
      { id: 'scenario', label: 'Scenario', default: 'recall', choices: CE.scenarios().map(s => ({ v: s.id, t: s.title, s: s.area })) },
      { id: 'difficulty', label: 'Difficulty', default: 'guided', choices: [{ v: 'guided', t: 'Foundation', s: 'See how each group reacts to every decision' }, { v: 'standard', t: 'Intermediate', s: 'Group trust after each phase, no per-decision reactions' }, { v: 'expert', t: 'Advanced', s: 'Only overall trust until the end' }] }
    ],
    create: (seed, config) => CE.create(seed, config),
    apply: (g, d) => CE.apply(g, d),
    isDone: g => CE.isDone(g),
    progress: g => (CE.isDone(g) ? `${Sc(g).title} · complete` : `${Sc(g).title} · phase ${g.phase + 1} of ${Sc(g).phases.length}`),
    view(g, ctx) {
      const done = CE.isDone(g);
      let tab = uiStr(ctx, 'tab', done ? 'debrief' : 'situation');
      if (done && tab === 'situation') tab = 'debrief';
      if (!done && tab === 'debrief') tab = 'situation';
      ctx.ui.tab = tab;
      let h = header(g, done);
      h += UI.tabs('tab', [{ v: done ? 'debrief' : 'situation', t: done ? 'Debrief' : 'Situation' }, { v: 'stake', t: 'Stakeholders' }, { v: 'log', t: 'Log' }, { v: 'guide', t: 'Guide' }], tab, 'main-tabs', true);
      if (tab === 'situation') h += situationView(g, ctx);
      else if (tab === 'stake') h += stakeholdersView(g);
      else if (tab === 'log') h += logView(g);
      else if (tab === 'guide') h += guideView(g);
      else h += debriefView(g, ctx);
      return h;
    },
    live(g, ctx) {
      if (CE.isDone(g) || uiStr(ctx, 'tab', 'situation') !== 'situation') return {};
      const P = CE.phaseOf(g), d = draft(g), L = {};
      P.decisions.filter(D => D.kind === 'allocate').forEach(D => { const v = d.choices[D.id] || {}; L['al:' + D.id] = allocHint(D, sum(D.buckets.map(b => +v[b.id] || 0))); });
      return L;
    },
    onTab(g, group, value, ctx) { if (group === 'tab') ctx.ui.seenBrief = true; },
    field(g, name, value) {
      const p = String(name).split(':');
      if (p[0] === 'al') { const d = draft(g), v = d.choices[p[1]] || (d.choices[p[1]] = {}); v[p[2]] = Math.max(0, Math.round(+value || 0)); return null; }
      return null;
    },
    act(g, op, el, ctx) {
      if (CE.isDone(g)) return null;
      const ds = el.dataset, d = draft(g);
      if (op === 'ask') { ctx.ui.seenBrief = true; return { commit: { kind: 'consult', who: ds.who }, top: false }; }
      if (op === 'huddle') { ctx.ui.seenBrief = true; return { commit: { kind: 'huddle' }, top: false, toast: 'The whole team is in the room.' }; }
      if (op === 'pick') { d.choices[ds.d] = ds.v; return { rerender: true }; }
      if (op === 'el' || op === 'spoke' || op === 'chan') {
        const D = findDecision(g, ds.d); if (!D) return null;
        const v = d.choices[D.id] || (d.choices[D.id] = { els: [], spoke: null, channel: null });
        if (op === 'el') { const i = v.els.indexOf(ds.v); if (i >= 0) v.els.splice(i, 1); else if (v.els.length < D.max) v.els.push(ds.v); }
        else if (op === 'spoke') v.spoke = ds.v; else v.channel = ds.v;
        return { rerender: true };
      }
      if (op === 'decide') {
        const P = CE.phaseOf(g), miss = complete(g, P);
        if (miss.length) return { toast: `Still to decide: ${sentence(stop(miss[0]))}` };
        ctx.ui.showLast = true; ctx.ui.seenBrief = true;
        const choices = clone(d.choices);
        const last = g.phase === Sc(g).phases.length - 1;
        return { commit: { kind: 'decide', choices }, top: true, toast: last ? 'The crisis is over. Here is your debrief.' : 'Decided. The next phase begins.' };
      }
      return null;
    },
    summary(g) {
      const s = CE.score(g), sc = Sc(g);
      return { score: s.total, line: `${sc.title} · trust ${N.int(CE.trustIndex(g))} · ${sc.labels.safety.toLowerCase()} ${N.int(g.m.safety)} · cost ${money(g.m.cost)}`, metrics: [{ k: 'Trust', v: N.int(CE.trustIndex(g)) }, { k: sc.labels.safety, v: N.int(g.m.safety) }, { k: 'Cost', v: money(g.m.cost) }] };
    }
  });
})();
