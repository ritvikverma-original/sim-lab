/* Case Room: short decision cases on real companies, disguised until the debrief. Every case in window.CaseRoomData (cases-*.js)
   registers as its own module with format 'case' and a fixed level. A case stores one decision per step, so a run replays exactly. */
(function () {
  'use strict';
  const S = window.SimLab, CASES = window.CaseRoomData || [];
  if (!S) return;
  const { UI, U, N } = S;
  const esc = U.esc;
  const CATN = { strategy: 'Strategy', finance: 'Finance', ops: 'Operations', marketing: 'Marketing', people: 'People and leadership', decisions: 'Ethics and decisions' };
  const NOTE = { guided: 'Foundation: hints, and feedback after each decision.', standard: 'Intermediate: feedback after each decision, no hints.', expert: 'Advanced: no feedback until the debrief, and some decisions need a calculation.' };
  const VERDICT = ['Poor call', 'Weak call', 'Reasonable call', 'Strong call'];
  const TONE = ['warn', 'warn', 'neutral', 'good'];
  const LET = 'ABCDE';

  function pts(q, a) {
    if (!a) return 0;
    if (q.num) { const x = +a.num, t = q.num.tol, e = Math.abs(x - q.num.ans); return !isFinite(x) ? 0 : e <= t[0] + 1e-9 ? 3 : e <= t[1] + 1e-9 ? 2 : e <= t[2] + 1e-9 ? 1 : 0; }
    const o = q.o[a.pick]; return o ? o[1] : 0;
  }
  const bestIdx = q => q.o.reduce((b, o, i) => (o[1] > q.o[b][1] ? i : b), 0);
  const numTxt = (q, v) => `${N.num(+v, q.num.dec || 0)}${q.num.unit || ''}`;
  const answerTxt = (q, a) => (!a ? '–' : q.num ? numTxt(q, a.num) : `${LET[a.pick]}. ${q.o[a.pick][0]}`);
  const bestTxt = q => (q.num ? numTxt(q, q.num.ans) : `${LET[bestIdx(q)]}. ${q.o[bestIdx(q)][0]}`);
  const fbOf = (q, a) => (q.num ? q.fb : (a && q.o[a.pick] ? q.o[a.pick][2] : ''));
  const total = (c, g) => Math.round(100 * g.ans.reduce((s, a, i) => s + pts(c.qs[i], a), 0) / (3 * c.qs.length));
  const exhibit = (x, i) => UI.fold(esc(x.t), `${UI.table(x.h, x.r, { sticky: true, cls: 'wrap' })}${x.n ? `<p class="cap">${x.n}</p>` : ''}`, false, `Exhibit ${i + 1}`);

  function make(c) {
    const n = c.qs.length, lv = c.level;
    function header(g) {
      return `<section class="sheet hdr"><div class="hdr-top"><div class="sh"><span class="eyebrow">Case · ${CATN[c.cat] || ''} · ${esc(c.when)}</span><h2>${esc(c.title)}</h2></div><div class="hdr-pills">${UI.level(lv)}${UI.pill(g.done ? 'Debrief' : `Decision ${g.step + 1} of ${n}`, 'neutral')}</div></div><p class="case"><strong>Your role.</strong> ${c.role}</p></section>`;
    }
    function feedback(g) {
      if (!g.step || g.done || lv === 'expert') return '';
      const q = c.qs[g.step - 1], a = g.ans[g.step - 1], p = pts(q, a);
      return `<section class="sheet result"><span class="eyebrow">Decision ${g.step} · ${VERDICT[p]}</span><p class="case"><strong>You chose:</strong> ${esc(answerTxt(q, a))}.${p < 3 ? ` <strong>Stronger:</strong> ${esc(bestTxt(q))}.` : ''}</p><p class="case">${fbOf(q, a)}</p></section>`;
    }
    function question(g) {
      const q = c.qs[g.step], d = g.draft || {};
      let body = q.ctx ? `<div class="case">${q.ctx}</div>` : '';
      if (q.num) body += UI.field(esc(q.num.label || 'Your answer'), UI.num('num', d.num, { min: q.num.min, max: q.num.max, step: q.num.step || 1, dec: q.num.dec || 0, unit: q.num.unit || '', label: q.num.label || 'Your answer', wide: true }), q.num.hint || '');
      else body += `<div class="opts" role="group" aria-label="Options">${q.o.map((o, i) => `<button type="button" class="opt" data-act="m" data-op="pick" data-i="${i}" aria-pressed="${d.pick === i}"><b>${LET[i]}</b><span>${esc(o[0])}</span></button>`).join('')}</div>`;
      if (lv === 'guided' && q.hint) body += `<p class="note">${esc(q.hint)}</p>`;
      body += `<div class="actions"><button type="button" class="btn btn-primary btn-block" data-act="m" data-op="go">${g.step === n - 1 ? 'Lock in the last decision' : 'Lock in this decision'}</button></div>`;
      return `<section class="sheet" id="cr-q"><header class="sh"><span class="eyebrow">Decision ${g.step + 1} of ${n}</span><h2>${esc(q.q)}</h2></header>${body}</section>`;
    }
    function debrief(g) {
      const sc = total(c, g), rv = c.rv;
      let h = `<section class="sheet result"><span class="eyebrow">Debrief · ${esc(c.title)}</span><div class="grade"><span class="letter">${S.grade(sc)}</span><div><h2>${S.gradeWord(sc)}</h2><span class="num">${sc} / 100</span></div></div></section>`;
      h += UI.reveal('Which company was it?', `<p class="rv-name">${esc(rv.name)}</p><p class="rv-meta">${esc(rv.when)}</p><div class="case">${rv.story}</div><p class="case"><strong>The lesson.</strong> ${rv.lesson}</p><p class="rv-src"><strong>Further reading:</strong> ${rv.read} This write-up is original, based on public sources; figures are rounded.</p>`, true);
      h += UI.sheet('Your decisions', 'Call by call', `<ol class="steps">${c.qs.map((q, i) => { const a = g.ans[i], p = pts(q, a); return `<li><strong>${esc(q.q)}</strong><br>${UI.pill(VERDICT[p], TONE[p])} You chose ${esc(answerTxt(q, a))}.${p < 3 ? ` Stronger: ${esc(bestTxt(q))}.` : ''}<br><span class="cap">${fbOf(q, a)}</span></li>`; }).join('')}</ol>`);
      h += `<div class="actions">${UI.btn('Play this case again', 'retry-run', 'btn-primary', `data-id="${esc(S.App.cur ? S.App.cur.meta.id : '')}"`)}${UI.btn('Back to home', 'leave-run', 'btn-ghost')}</div>`;
      return h;
    }
    return {
      id: 'case-' + c.id, cat: c.cat, title: c.title, area: CATN[c.cat], length: `${n} decisions · ${c.mins || 15} min`, depth: 'Case', format: 'case', level: lv, levelNote: NOTE[lv],
      version: 1, persist: 'replay', wide: false, practises: c.teaches, blurb: c.blurb, options: [],
      create: seed => ({ v: 1, seed, cfg: { difficulty: lv }, step: 0, ans: [], done: false, draft: { pick: null, num: null } }),
      apply(g, d) {
        if (g.done || !d) return;
        const q = c.qs[g.step];
        g.ans.push(q.num ? { num: +d.num } : { pick: +d.pick });
        g.step++;
        if (g.step >= n) { g.done = true; g.draft = null; } else g.draft = { pick: null, num: null };
      },
      isDone: g => !!g.done,
      progress: g => (g.done ? 'Complete' : `Decision ${g.step + 1} of ${n}`),
      view(g, ctx) {
        let h = header(g);
        if (g.done) return h + debrief(g);
        h += feedback(g);
        h += UI.brief(esc(c.firm), g.step === 0 && !ctx.ui.seenBrief, c.brief, c.note ? esc(c.note) : '');
        h += (c.ex || []).map(exhibit).join('');
        return h + question(g);
      },
      field(g, name, value) { if (g.draft && name === 'num') g.draft.num = value; return null; },
      act(g, op, el, ctx) {
        const d = g.draft; if (!d) return null;
        if (op === 'pick') { d.pick = +el.dataset.i; return { rerender: true, draft: true }; }
        if (op === 'go') {
          const q = c.qs[g.step];
          if (q.num ? !isFinite(parseFloat(d.num)) : d.pick == null) return { toast: q.num ? 'Enter a number first.' : 'Choose an option first.', scrollTo: 'cr-q' };
          ctx.ui.seenBrief = true;
          const last = g.step === n - 1;
          return { commit: q.num ? { num: parseFloat(d.num) } : { pick: d.pick }, top: true, toast: last ? 'Case complete. Here is the debrief.' : 'Decision locked in.' };
        }
        return null;
      },
      summary(g) { const sc = total(c, g); return { score: sc, line: `${c.rv.name} · ${c.rv.when}`, metrics: [{ k: 'Decisions', v: String(n) }] }; }
    };
  }
  CASES.forEach(c => S.App.register(make(c)));
})();
