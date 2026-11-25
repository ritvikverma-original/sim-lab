/* Guesstimate Lab: twenty estimation problems played the way an interview runs them: clarify, choose a structure,
   set assumptions and calculate, then sanity-check. Problems live in guess-data.js (window.GuessData). One decision per step, so runs replay exactly. */
(function () {
  'use strict';
  const S = window.SimLab, P = window.GuessData;
  if (!S || !P) return;
  const { UI, U, N, RNG } = S;
  const esc = U.esc;
  const LET = 'ABCDE';
  const STEPS = ['clarify', 'approach', 'build', 'check'];
  const STEP_T = ['Clarify the question', 'Choose a structure', 'Assumptions and maths', 'Sanity check'];
  const VERDICT = ['Poor call', 'Weak call', 'Reasonable call', 'Strong call'], TONE = ['warn', 'warn', 'neutral', 'good'];
  const TAGLV = ['guided', 'standard', 'expert'];
  const byId = id => P.find(p => p.id === id);
  const modelVals = p => { const o = {}; p.dr.forEach(d => { o[d.k] = d.m; }); return o; };
  const refOf = p => p.calc(modelVals(p));
  const outTxt = (p, v) => `${N.num(v, p.out.d)} ${p.out.u}`;
  const valTxt = (d, v) => (d.u === '₹' ? `₹${N.num(v, d.d)}` : d.u === '%' ? `${N.num(v, d.d)}%` : `${N.num(v, d.d)} ${d.u}`);
  const optsOf = (p, st) => (st === 'clarify' ? p.cl : st === 'approach' ? p.ap : p.ck);
  const qOf = (p, st) => (st === 'clarify' ? 'What would you ask first, before you estimate?' : st === 'approach' ? 'Which structure would you use?' : 'Which sanity check would you run on your answer?');

  function create(seed, cfg) {
    const c = cfg || {}, difficulty = S.normLevel(c.difficulty), rng = RNG.make(seed);
    let id = c.problem;
    if (!byId(id)) { const tag = TAGLV.indexOf(difficulty) + 1, pool = P.filter(p => p.tag === tag), list = pool.length ? pool : P; id = list[Math.floor(RNG.next(rng) * list.length)].id; }
    return { v: 1, seed, cfg: { difficulty, problem: c.problem || 'any' }, id, step: 0, ans: {}, done: false, draft: { pick: null, vals: {}, final: null } };
  }
  function apply(g, d) {
    if (g.done || !d) return;
    const st = STEPS[g.step];
    if (st === 'build') g.ans.build = { vals: Object.assign({}, d.vals || {}), final: d.final == null ? null : +d.final };
    else g.ans[st] = { pick: +d.pick };
    g.step++;
    if (g.step >= STEPS.length) { g.done = true; g.draft = null; } else g.draft = { pick: null, vals: g.ans.build ? Object.assign({}, g.ans.build.vals) : {}, final: null };
  }

  /* ---------- Scoring ---------- */
  function drvScore(d, v) { if (!(v > 0)) return 0; if (v >= d.lo && v <= d.hi) return 1; const r = v < d.lo ? d.lo / v : v / d.hi; return r <= 1.5 ? 0.5 : 0; }
  const filled = (p, vals) => p.dr.every(d => +vals[d.k] > 0);
  function estOf(p, g) {
    const b = g.ans.build; if (!b) return null;
    if (g.cfg.difficulty === 'expert' && b.final > 0) return b.final;
    return filled(p, b.vals) ? p.calc(numVals(b.vals)) : null;
  }
  const numVals = vals => { const o = {}; Object.keys(vals).forEach(k => { o[k] = +vals[k]; }); return o; };
  function estScore(p, est) { if (!(est > 0)) return 0; const e = Math.abs(Math.log10(est / refOf(p))); return e <= 0.1 ? 1 : e <= 0.2 ? 0.75 : e <= 0.3 ? 0.5 : e <= 0.48 ? 0.25 : 0; }
  function parts(p, g) {
    const pk = st => (g.ans[st] ? optsOf(p, st)[g.ans[st].pick][1] / 3 : 0);
    const b = g.ans.build || { vals: {} }, est = estOf(p, g);
    return [
      { k: 'Clarifying the question', w: 10, v: pk('clarify') },
      { k: 'Choosing a structure', w: 20, v: pk('approach') },
      { k: 'Assumptions', w: 30, v: p.dr.reduce((s, d) => s + drvScore(d, +b.vals[d.k]), 0) / p.dr.length },
      { k: 'Final estimate', w: 30, v: est == null ? 0 : estScore(p, est) },
      { k: 'Sanity check', w: 10, v: pk('check') }
    ];
  }
  const total = (p, g) => Math.round(parts(p, g).reduce((s, x) => s + x.w * x.v, 0));

  /* ---------- Views ---------- */
  function header(p, g) {
    const lv = g.cfg.difficulty;
    const steps = STEP_T.map((t, i) => `<span class="pill ${g.done || i < g.step ? 'good' : i === g.step ? 'pen' : 'neutral'}">${i + 1}. ${t}</span>`).join('');
    return `<section class="sheet hdr"><div class="hdr-top"><div class="sh"><span class="eyebrow">Guesstimate · ${esc(p.topic)}</span><h2>${esc(p.q)}</h2></div><div class="hdr-pills">${UI.level(lv)}</div></div><div class="deltas">${steps}</div>${g.done ? '' : `<p class="cap">Interviewers usually allow about ten minutes. Think in steps: clarify, structure, assume, calculate, then sanity-check.${lv === 'expert' ? ' At Advanced level you do the arithmetic yourself and see feedback only at the end.' : ''}</p>`}</section>`;
  }
  function feedback(p, g) {
    if (!g.step || g.done || g.cfg.difficulty === 'expert') return '';
    const st = STEPS[g.step - 1]; if (st === 'build') return '';
    const o = optsOf(p, st), a = g.ans[st], pts = o[a.pick][1], best = o.reduce((b, x, i) => (x[1] > o[b][1] ? i : b), 0);
    return `<section class="sheet result"><span class="eyebrow">${STEP_T[g.step - 1]} · ${VERDICT[pts]}</span><p class="case"><strong>You chose:</strong> ${esc(o[a.pick][0])}.${pts < 3 ? ` <strong>Stronger:</strong> ${esc(o[best][0])}.` : ''}</p><p class="case">${esc(o[a.pick][2])}</p></section>`;
  }
  function mcq(p, g) {
    const st = STEPS[g.step], o = optsOf(p, st), d = g.draft || {};
    const lead = st === 'check' ? `<p class="case">Your estimate: <strong>${estOf(p, g) != null ? esc(outTxt(p, estOf(p, g))) : '–'}</strong>.</p>` : '';
    return `<section class="sheet" id="gs-q"><header class="sh"><span class="eyebrow">Step ${g.step + 1} of 4 · ${STEP_T[g.step]}</span><h2>${qOf(p, st)}</h2></header>${lead}<div class="opts" role="group" aria-label="Options">${o.map((x, i) => `<button type="button" class="opt" data-act="m" data-op="pick" data-i="${i}" aria-pressed="${d.pick === i}"><b>${LET[i]}</b><span>${esc(x[0])}</span></button>`).join('')}</div><div class="actions"><button type="button" class="btn btn-primary btn-block" data-act="m" data-op="go">Lock in</button></div></section>`;
  }
  function resultHtml(p, g) {
    const d = g.draft || { vals: {} };
    if (!filled(p, d.vals)) return '<p class="cap">Fill in every assumption to see the result.</p>';
    return `<p class="case">Your estimate: <strong class="num">${esc(outTxt(p, p.calc(numVals(d.vals))))}</strong></p>`;
  }
  function build(p, g) {
    const lv = g.cfg.difficulty, d = g.draft || { vals: {} };
    let h = `<p class="gs-f">${esc(p.f)}</p><div class="fields">`;
    p.dr.forEach(x => {
      const v = d.vals[x.k];
      const hint = lv === 'guided' ? `${esc(x.h)} Sensible range: ${esc(valTxt(x, x.lo))} to ${esc(valTxt(x, x.hi))}.` : '';
      h += UI.field(esc(x.t), UI.num('v:' + x.k, v == null ? null : +v, { min: 0, step: x.s, dec: x.d, unit: x.u === '₹' ? '' : x.u, pre: x.u === '₹' ? '₹' : '', label: x.t, wide: true }), hint);
    });
    h += '</div>';
    if (lv === 'expert') h += UI.field(`Your final estimate (${esc(p.out.u)})`, UI.num('final', d.final == null ? null : +d.final, { min: 0, step: Math.pow(10, -p.out.d), dec: p.out.d, label: 'Your final estimate', wide: true }), 'Work it out from your assumptions; the platform checks your arithmetic at the end.');
    else h += `<div data-live="gs-res">${resultHtml(p, g)}</div>`;
    return `<section class="sheet" id="gs-q"><header class="sh"><span class="eyebrow">Step 3 of 4 · Assumptions and maths</span><h2>Build the estimate</h2></header><p class="case">Use this structure, whatever you chose in step 2, so your assumptions can be compared with the model answer.</p>${h}<div class="actions"><button type="button" class="btn btn-primary btn-block" data-act="m" data-op="go">Lock in the estimate</button></div></section>`;
  }
  function debrief(p, g) {
    const sc = total(p, g), ps = parts(p, g), est = estOf(p, g), ref = refOf(p), b = g.ans.build || { vals: {} };
    const ratio = est > 0 ? est / ref : null;
    let h = `<section class="sheet result"><span class="eyebrow">Debrief · ${esc(p.title)}</span><div class="grade"><span class="letter">${S.grade(sc)}</span><div><h2>${S.gradeWord(sc)}</h2><span class="num">${sc} / 100</span></div></div><p class="case">Your estimate: <strong>${est != null ? esc(outTxt(p, est)) : '–'}</strong>. Model answer: <strong>${esc(outTxt(p, ref))}</strong>${ratio ? ` (${N.num(ratio, ratio < 1 ? 2 : 1)} times the model answer)` : ''}.</p><div class="sparts">${ps.map(x => `${UI.meter(`${x.k} <span class="cap">${x.w}%</span>`, x.v, String(Math.round(x.v * x.w)), x.v >= 0.7 ? 'good' : x.v >= 0.5 ? '' : 'warn')}`).join('')}</div></section>`;
    if (g.cfg.difficulty === 'expert' && b.final > 0 && filled(p, b.vals)) {
      const calc = p.calc(numVals(b.vals)), off = Math.abs(b.final / calc - 1);
      h += UI.warn([{ t: off > 0.1 ? 'warn' : 'good', m: off > 0.1 ? `Arithmetic check: your assumptions give ${esc(outTxt(p, calc))}, but you entered ${esc(outTxt(p, b.final))}. Write down each multiplication as you go.` : `Arithmetic check: your assumptions give ${esc(outTxt(p, calc))}, close to the ${esc(outTxt(p, b.final))} you entered.` }]);
    }
    if (p.real) h += UI.reveal('What the published figures say', `<p class="case">${esc(p.real)}</p><p class="cap">The model answer is a benchmark built from round assumptions; a good guesstimate lands within a factor of about 1.5 of reality.</p>`, true, 'Reality check');
    h += UI.sheet('Model answer', 'One sensible way to build it', `<p class="gs-f">${esc(p.f)}</p>${UI.table(['Assumption', 'Yours', 'Sensible range', 'Model'], p.dr.map(d => { const v = +b.vals[d.k], ok = drvScore(d, v); return [esc(d.t), v > 0 ? `<span class="${ok < 1 ? 'down' : ''}">${esc(valTxt(d, v))}</span>` : '–', `${esc(valTxt(d, d.lo))} to ${esc(valTxt(d, d.hi))}`, esc(valTxt(d, d.m))]; }), { sticky: true, cls: 'wrap' })}<p class="case">${esc(p.model)}</p><p class="case"><strong>Common pitfalls.</strong> ${esc(p.pit)}</p>`);
    h += UI.sheet('Your calls', 'Clarifying, structuring and checking', `<ol class="steps">${['clarify', 'approach', 'check'].map(st => { const o = optsOf(p, st), a = g.ans[st], pts = a ? o[a.pick][1] : 0, best = o.reduce((bb, x, i) => (x[1] > o[bb][1] ? i : bb), 0); return `<li><strong>${qOf(p, st)}</strong><br>${UI.pill(VERDICT[pts], TONE[pts])} You chose ${a ? esc(o[a.pick][0]) : '–'}.${pts < 3 ? ` Stronger: ${esc(o[best][0])}.` : ''}<br><span class="cap">${a ? esc(o[a.pick][2]) : ''}</span></li>`; }).join('')}</ol>`);
    h += `<div class="actions">${UI.btn('Try another guesstimate', 'new-run', 'btn-primary', 'data-module="guess"')}${UI.btn('Back to home', 'leave-run', 'btn-ghost')}</div>`;
    return h;
  }

  S.App.register({
    id: 'guess', cat: 'strategy', title: 'Guesstimate Lab', area: 'Market sizing', length: '20 problems · about 10 min each', depth: 'Practice set', format: 'practice', version: 1, persist: 'replay', wide: false,
    practises: 'Market sizing · structuring an estimate · sensible assumptions · sanity checks',
    blurb: 'Twenty India-focused guesstimates of the kind asked in business school and consulting interviews. Clarify the question, choose a structure, set your assumptions, do the maths and sanity-check the answer; most problems end with the real published figure.',
    options: [
      { id: 'problem', label: 'Problem', default: 'any', choices: [{ v: 'any', t: 'Surprise me', s: 'one at your level' }].concat(P.map(p => ({ v: p.id, t: p.title, s: `${S.levelName(TAGLV[p.tag - 1])} · ${p.topic}` }))) },
      { id: 'difficulty', label: 'Difficulty', default: 'guided', choices: [{ v: 'guided', t: 'Foundation', s: 'Hints, sensible ranges, a live result and feedback' }, { v: 'standard', t: 'Intermediate', s: 'Live result and feedback, no hints' }, { v: 'expert', t: 'Advanced', s: 'No hints; do the maths yourself; feedback at the end' }] }
    ],
    create, apply,
    isDone: g => !!g.done,
    progress: g => { const p = byId(g.id); return g.done ? `${p.title} · complete` : `${p.title} · step ${g.step + 1} of 4`; },
    view(g, ctx) {
      const p = byId(g.id);
      let h = header(p, g);
      if (g.done) return h + debrief(p, g);
      h += feedback(p, g);
      return h + (STEPS[g.step] === 'build' ? build(p, g) : mcq(p, g));
    },
    live(g) { const p = byId(g.id); return !g.done && STEPS[g.step] === 'build' && g.cfg.difficulty !== 'expert' ? { 'gs-res': resultHtml(p, g) } : {}; },
    field(g, name, value) {
      const d = g.draft; if (!d) return null;
      if (name.indexOf('v:') === 0) d.vals[name.slice(2)] = value;
      else if (name === 'final') d.final = value;
      return null;
    },
    act(g, op, el) {
      const d = g.draft; if (!d) return null;
      const p = byId(g.id), st = STEPS[g.step];
      if (op === 'pick') { d.pick = +el.dataset.i; return { rerender: true, draft: true }; }
      if (op !== 'go') return null;
      if (st === 'build') {
        if (!filled(p, d.vals)) return { toast: 'Fill in every assumption first.', scrollTo: 'gs-q' };
        if (g.cfg.difficulty === 'expert' && !(+d.final > 0)) return { toast: 'Enter your final estimate first.', scrollTo: 'gs-q' };
        const vals = {}; p.dr.forEach(x => { vals[x.k] = +d.vals[x.k]; });
        return { commit: { vals, final: g.cfg.difficulty === 'expert' ? +d.final : null }, top: true, toast: 'Estimate locked in.' };
      }
      if (d.pick == null) return { toast: 'Choose an option first.', scrollTo: 'gs-q' };
      return { commit: { pick: d.pick }, top: true, toast: st === 'check' ? 'Done. Here is your debrief.' : null };
    },
    summary(g) { const p = byId(g.id), est = estOf(p, g); return { score: total(p, g), line: `${p.title}: you ${est != null ? outTxt(p, est) : '–'} · model ${outTxt(p, refOf(p))}`, metrics: [{ k: 'Estimate', v: est != null ? outTxt(p, est) : '–' }] }; }
  });
})();
