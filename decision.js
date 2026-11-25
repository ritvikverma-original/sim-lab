/* Decision Making Lab: practice and timed mock sets of original decision-making caselets, with negative marking.
   Questions come from window.DecisionData (decision-data*.js). A run stores one answer per step, so it replays exactly. */
(function () {
  'use strict';
  const S = window.SimLab, BANK = window.DecisionData;
  if (!S || !BANK) return;
  const { UI, U, N, RNG } = S;
  const esc = U.esc;
  const LET = 'ABCDE';
  const POOL = { guided: [1, 2], standard: [1, 2, 3], expert: [2, 3] };
  const MIN_PER_Q = 45 / 21;
  /* Spread the correct answers across A–E with a fixed shuffle per question, so letters stay the same between sessions. */
  BANK.forEach(set => set.qs.forEach((q, i) => {
    if (q.keep || q._mixed) return;
    let h = 2166136261; for (const ch of set.id + ':' + i) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
    const r = RNG.make(h), idx = q.o.map((_, k) => k);
    for (let k = idx.length - 1; k > 0; k--) { const j = Math.floor(RNG.next(r) * (k + 1)); const t = idx[k]; idx[k] = idx[j]; idx[j] = t; }
    q.o = idx.map(k => q.o[k]); q.a = idx.indexOf(q.a); q._mixed = true;
  }));

  /* Runs saved before the bank grew have no topic in their settings; they draw from the original eight sets so they replay exactly. */
  const V1 = ['gift', 'kitchen', 'dairy', 'wfh', 'cement', 'audit', 'training', 'flour'];
  const TOPICS = ['Ethics', 'Business', 'People', 'Analytical'];
  const qCount = arr => arr.reduce((n, s) => n + s.qs.length, 0);
  function create(seed, cfg) {
    const c = cfg || {}, mode = c.mode === 'mock' ? 'mock' : 'practice', difficulty = S.normLevel(c.difficulty), rng = RNG.make(seed);
    const grown = c.topic != null, topic = mode === 'practice' && TOPICS.indexOf(c.topic) >= 0 ? c.topic : 'all';
    const want = mode === 'mock' ? 21 : 12, base = grown ? BANK : BANK.filter(s => V1.indexOf(s.id) >= 0);
    const pool = base.filter(s => POOL[difficulty].indexOf(s.level) >= 0 && (topic === 'all' || s.topic === topic));
    const mix = arr => arr.map(s => ({ s, k: RNG.next(rng) })).sort((x, y) => x.k - y.k).map(x => x.s);
    let sets = mix(pool);
    /* A topic with too few questions at this level is topped up from the nearest other levels. */
    if (topic !== 'all' && qCount(pool) < want) sets = sets.concat(mix(base.filter(s => s.topic === topic && pool.indexOf(s) < 0)).sort((x, y) => Math.abs(x.level - 2) - Math.abs(y.level - 2)));
    const items = [];
    for (const s of sets) { if (items.length >= want) break; s.qs.forEach((q, i) => items.push({ set: s.id, i })); }
    return { v: 1, seed, cfg: grown ? { mode, difficulty, topic } : { mode, difficulty }, items, ans: [], step: 0, started: mode === 'practice', t0: null, t1: null, done: false, draft: { pick: null } };
  }
  const setOf = id => BANK.find(s => s.id === id);
  const qOf = it => setOf(it.set).qs[it.i];
  function apply(g, d) {
    if (g.done || !d) return;
    if (d.op === 'start') { g.started = true; g.t0 = d.t || null; return; }
    const pick = d.pick == null || d.pick < 0 ? -1 : +d.pick;
    g.ans.push({ pick, t: d.t || null });
    if (g.t0 == null && d.t) g.t0 = d.t;
    g.step++;
    if (g.step >= g.items.length) { g.done = true; g.t1 = d.t || null; g.draft = null; } else g.draft = { pick: null };
  }
  function tally(g) {
    let right = 0, wrong = 0, skip = 0; const byTopic = {};
    g.ans.forEach((a, k) => {
      const it = g.items[k], q = qOf(it), tp = setOf(it.set).topic, b = byTopic[tp] || (byTopic[tp] = { n: 0, right: 0, wrong: 0 });
      b.n++;
      if (a.pick < 0) skip++; else if (a.pick === q.a) { right++; b.right++; } else { wrong++; b.wrong++; }
    });
    const marks = right - 0.25 * wrong - 0.1 * Math.max(0, skip - 8);
    return { right, wrong, skip, marks, byTopic, n: g.items.length };
  }
  const score = g => { const t = tally(g); return Math.round(100 * Math.max(0, t.marks) / Math.max(1, t.n)); };
  const marksTxt = v => N.num(v, 2);
  const minsOf = g => Math.round(g.items.length * MIN_PER_Q);
  function clockTxt(g) {
    if (!g.t0) return '';
    const left = minsOf(g) * 60 - Math.floor((Date.now() - g.t0) / 1000);
    if (left <= 0) return 'Time is up: finish and see your result';
    return `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')} left`;
  }

  function header(g) {
    const t = tally(g), mock = g.cfg.mode === 'mock';
    const items = [{ k: 'Question', v: g.done ? 'Done' : `${Math.min(g.step + 1, t.n)} of ${t.n}` }];
    if (!mock || g.done) items.push({ k: 'Correct', v: String(t.right) }, { k: 'Wrong', v: String(t.wrong) }, { k: 'Marks', v: marksTxt(t.marks), d: `${t.skip} skipped` });
    else items.push({ k: 'Answered', v: String(t.right + t.wrong) }, { k: 'Skipped', v: String(t.skip) }, { k: 'Clock', v: `<span id="dm-clock">${clockTxt(g) || '–'}</span>` });
    return `<section class="sheet hdr"><div class="hdr-top"><div class="sh"><span class="eyebrow">Decision Making · ${mock ? 'Timed mock' : 'Practice'}${g.cfg.topic && g.cfg.topic !== 'all' ? ' · ' + esc(g.cfg.topic) : ''}</span><h2>Decision Making Lab</h2></div><div class="hdr-pills">${UI.level(g.cfg.difficulty)}</div></div>${UI.kpis(items)}</section>`;
  }
  function startView(g) {
    return UI.sheet('Timed mock', `${g.items.length} questions in ${minsOf(g)} minutes`, `<div class="case"><p>This mock follows the decision-making sections of MBA entrance tests: caselets on ethics, business, people and analytical reasoning, each with five options.</p><p><strong>Marking:</strong> +1 for a correct answer, −0.25 for a wrong one, and −0.10 for each unanswered question beyond the first eight. You see answers and explanations at the end.</p></div><div class="actions"><button type="button" class="btn btn-primary btn-block" data-act="m" data-op="start">Start the clock</button></div>`);
  }
  function feedback(g) {
    if (g.cfg.mode === 'mock' || !g.step || g.done) return '';
    const k = g.step - 1, q = qOf(g.items[k]), a = g.ans[k];
    const v = a.pick < 0 ? ['Skipped', 'neutral'] : a.pick === q.a ? ['Correct · +1', 'good'] : ['Wrong · −0.25', 'warn'];
    return `<section class="sheet result"><span class="eyebrow">Question ${g.step}</span><p class="case">${UI.pill(v[0], v[1])} The answer is <strong>${LET[q.a]}. ${esc(q.o[q.a])}</strong>${a.pick >= 0 && a.pick !== q.a ? `; you chose ${LET[a.pick]}` : ''}.</p><p class="case">${esc(q.x)}</p></section>`;
  }
  function questionView(g) {
    const it = g.items[g.step], set = setOf(it.set), q = qOf(it), d = g.draft || {};
    const opts = q.o.map((o, i) => `<button type="button" class="opt" data-act="m" data-op="pick" data-i="${i}" aria-pressed="${d.pick === i}"><b>${LET[i]}</b><span>${esc(o)}</span></button>`).join('');
    return UI.sheet(`Read the situation · ${set.topic}`, '', `<div class="case">${set.text}</div>`) + `<section class="sheet" id="dm-q"><header class="sh"><span class="eyebrow">Question ${g.step + 1} of ${g.items.length}</span><h2>${esc(q.q)}</h2></header><div class="opts" role="group" aria-label="Options">${opts}</div><div class="actions"><button type="button" class="btn btn-primary" data-act="m" data-op="go">Lock answer</button><button type="button" class="btn btn-ghost" data-act="m" data-op="skip">Skip</button></div></section>`;
  }
  function debrief(g) {
    const t = tally(g), sc = score(g), mins = g.t0 && g.t1 ? Math.round((g.t1 - g.t0) / 60000) : null;
    let h = `<section class="sheet result"><span class="eyebrow">Result · ${g.cfg.mode === 'mock' ? 'Timed mock' : 'Practice'}</span><div class="grade"><span class="letter">${S.grade(sc)}</span><div><h2>${marksTxt(t.marks)} marks out of ${t.n}</h2><span class="num">${t.right} correct · ${t.wrong} wrong · ${t.skip} skipped${mins != null ? ` · ${mins} min` : ''}</span></div></div><p class="case">Accuracy on attempted questions: ${t.right + t.wrong ? N.pct(t.right / (t.right + t.wrong), 0) : '–'}. With negative marking, a wrong answer costs a quarter of a mark, so attempt a question when you can rule out at least two options.</p></section>`;
    h += UI.sheet('By topic', 'Where you gained and lost marks', UI.table(['Topic', 'Questions', 'Correct', 'Wrong', 'Marks'], Object.keys(t.byTopic).map(k => { const b = t.byTopic[k]; return [k, String(b.n), String(b.right), String(b.wrong), marksTxt(b.right - 0.25 * b.wrong)]; })));
    h += UI.sheet('Review', 'Every question, with the reasoning', `<ol class="steps">${g.items.map((it, k) => { const q = qOf(it), a = g.ans[k], ok = a && a.pick === q.a; return `<li><strong>${esc(q.q)}</strong><br>${UI.pill(!a || a.pick < 0 ? 'Skipped' : ok ? 'Correct' : 'Wrong', !a || a.pick < 0 ? 'neutral' : ok ? 'good' : 'warn')} Answer: ${LET[q.a]}. ${esc(q.o[q.a])}${a && a.pick >= 0 && !ok ? `; you chose ${LET[a.pick]}` : ''}.<br><span class="cap">${esc(q.x)}</span></li>`; }).join('')}</ol>`);
    h += `<div class="actions">${UI.btn('Try another set', 'new-run', 'btn-primary', 'data-module="xat"')}${UI.btn('Back to home', 'leave-run', 'btn-ghost')}</div>`;
    return h;
  }
  let timer = null;
  S.App.register({
    id: 'xat', cat: 'decisions', title: 'Decision Making Lab', area: 'Decision making', length: '12 or 21 questions · 20–45 min', depth: 'Practice set', format: 'practice', version: 1, persist: 'replay', wide: false,
    practises: 'MBA entrance decision making · ethical dilemmas · managerial judgement · analytical decision sets',
    blurb: `${BANK.reduce((n, x) => n + x.qs.length, 0)} original questions in the style of MBA entrance decision-making tests: ethics, business, people and analytical sets with five options each. Practise by topic with explanations after every answer, or sit a timed mock with negative marking.`,
    options: [
      { id: 'mode', label: 'Mode', default: 'practice', choices: [{ v: 'practice', t: 'Practice', s: '12 questions, explanations after each' }, { v: 'mock', t: 'Timed mock', s: '21 questions, about 45 minutes' }] },
      { id: 'topic', label: 'Topic (practice only; mocks mix all four)', default: 'all', choices: [{ v: 'all', t: 'All topics' }].concat(TOPICS.map(t => ({ v: t, t, s: `${qCount(BANK.filter(x => x.topic === t))} questions` }))) },
      { id: 'difficulty', label: 'Difficulty', default: 'guided', choices: [{ v: 'guided', t: 'Foundation', s: 'Clear-cut judgement questions' }, { v: 'standard', t: 'Intermediate', s: 'The full mix' }, { v: 'expert', t: 'Advanced', s: 'Harder dilemmas and analytical sets' }] }
    ],
    create, apply,
    isDone: g => !!g.done,
    progress: g => (g.done ? 'Complete' : g.started ? `Question ${g.step + 1} of ${g.items.length}` : 'Not started'),
    view(g) {
      let h = header(g);
      if (g.done) return h + debrief(g);
      if (!g.started) return h + startView(g);
      return h + feedback(g) + questionView(g);
    },
    afterRender(g) {
      clearInterval(timer); timer = null;
      if (g.cfg.mode !== 'mock' || g.done || !g.t0) return;
      timer = setInterval(() => { const el = document.getElementById('dm-clock'); if (!el) { clearInterval(timer); timer = null; return; } el.textContent = clockTxt(g); }, 1000);
    },
    act(g, op, el) {
      const d = g.draft; if (!d) return null;
      if (op === 'start') return { commit: { op: 'start', t: Date.now() }, top: true, toast: 'The clock is running.' };
      if (op === 'pick') { d.pick = +el.dataset.i; return { rerender: true, draft: true }; }
      if (op === 'go' || op === 'skip') {
        if (op === 'go' && d.pick == null) return { toast: 'Choose an option, or skip the question.', scrollTo: 'dm-q' };
        const last = g.step === g.items.length - 1;
        return { commit: { op: 'ans', pick: op === 'skip' ? -1 : d.pick, t: Date.now() }, top: true, toast: last ? 'Set complete.' : null };
      }
      return null;
    },
    summary(g) { const t = tally(g); return { score: score(g), line: `${marksTxt(t.marks)} marks from ${t.n} questions · ${t.right} correct, ${t.wrong} wrong, ${t.skip} skipped`, metrics: [{ k: 'Marks', v: marksTxt(t.marks) }] }; }
  });
})();
