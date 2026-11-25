/* Platform layer: Today (a reasoned next step), the skill profile, goal tracks, the daily drill and weekly rhythm,
   takeaways after every debrief, the Playbook of concepts, and search and time filters for Practise.
   It plugs into core through App.views, App.actions, App.hooks and App.navItems; if anything here fails, core draws its own views. */
(function () {
  const S = window.SimLab, D = window.SimLabPlatform;
  if (!S || !S.X || !D) return;
  const App = S.App, X = S.X, UI = S.UI, esc = S.U.esc, N = S.N;
  const DAY = 864e5;

  const PF = { tab: 'skills', q: '', time: 'all', pbQ: '', pbCat: 'all', track: null, goalOpen: false, clock: null };
  const now = () => (PF.clock ? PF.clock() : Date.now());

  /* ---------- Small helpers ---------- */
  const mod = id => App.modules[id];
  const playable = id => { const M = mod(id); return !!M && !M.retired; };
  const actTitle = id => { const M = mod(id); if (!M) return id; return M.hidden ? X.modLabel(id) : M.title; };
  function mins(id) {
    if (D.MINS[id] != null) return D.MINS[id];
    const M = mod(id), m = M && /(\d+)\s*min/.exec(M.length || '');
    return m ? Number(m[1]) : 20;
  }
  const dayKey = t => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const dayNum = t => { const d = new Date(t); return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) / DAY); };
  const weekStart = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); const wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd); return d.getTime(); };
  const doneRuns = () => X.runsArr().filter(r => r.status === 'done');
  const levelOfCfg = cfg => (cfg && cfg.difficulty ? S.levelName(cfg.difficulty) : '');
  const pref = () => App.prefs || {};
  const track = () => D.TRACKS.find(t => t.id === pref().track) || null;

  /* ---------- Skill profile: the nine capabilities, fed by the best score on every activity ---------- */
  const Bank = () => window.RoleQuestBank || null;
  const Core = () => window.RoleQuestCore || null;
  function weights(id) { const B = Bank(), M = mod(id); if (!B || !M) return null; return B.P[id] || B.CATMAP[M.cat] || null; }
  function skills() {
    const B = Bank(), C = Core(); if (!B || !C) return [];
    const best = X.bestScores(), ev = C.practiceEvidence(best), done = X.scoredOnly(doneRuns());
    return B.C.map(c => {
      const ids = Object.keys(best).filter(id => { const w = weights(id); return w && w[c.id]; });
      const last = done.filter(r => ids.indexOf(r.module) >= 0).sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))[0] || null;
      return { id: c.id, t: c.t, hint: c.hint, ev: Math.round(ev[c.id] || 0), n: ids.length, last };
    });
  }
  const evWord = v => (v >= 70 ? 'Strong' : v >= 50 ? 'Building' : v > 0 ? 'Early' : 'No evidence yet');
  const evTone = v => (v >= 70 ? 'good' : v >= 50 ? 'neutral' : v > 0 ? 'warn' : '');
  function candidates() { return X.visibleMods().concat(D.QUICK).filter((id, i, a) => a.indexOf(id) === i && playable(id) && X.modFmt(mod(id)) !== 'career'); }
  /* The cheapest unplayed activity that gives evidence for a capability; if all are played, the weakest. */
  function forSkill(cid, best, skip) {
    const b = best || X.bestScores(), seen = skip || new Set();
    const pool = candidates().filter(id => !seen.has(id)).map(id => ({ id, w: (weights(id) || {})[cid] || 0 })).filter(x => x.w > 0);
    const fresh = pool.filter(x => b[x.id] == null).sort((x, y) => y.w / Math.sqrt(mins(y.id)) - x.w / Math.sqrt(mins(x.id)));
    if (fresh.length) return fresh[0].id;
    const played = pool.sort((x, y) => b[x.id] - b[y.id]);
    return played.length ? played[0].id : null;
  }

  /* ---------- Tracks ---------- */
  function stepRuns(step, runs) {
    return (runs || X.runsArr()).filter(r => {
      if (r.module !== step.m) return false;
      const cfg = step.cfg || {}, rc = r.config || {};
      return Object.keys(cfg).every(k => (k === 'difficulty' ? X.lvlIdx(rc.difficulty || 'guided') >= X.lvlIdx(cfg.difficulty) : String(rc[k]) === String(cfg[k])));
    });
  }
  function trackState(tr) {
    const runs = X.runsArr();
    let next = null, minsLeft = 0;
    const steps = tr.steps.map((step, i) => {
      const rs = stepRuns(step, runs), done = rs.some(r => r.status === 'done'), active = rs.find(r => r.status === 'active') || null;
      if (!done) { minsLeft += step.mins || mins(step.m); if (!next && playable(step.m)) next = { step, i, active }; }
      return { step, done, active };
    });
    return { steps, nDone: steps.filter(s => s.done).length, n: steps.length, next, mins: minsLeft };
  }

  /* ---------- Daily drill and weekly rhythm ---------- */
  function daily(t) {
    const at = t || now(), n = dayNum(at), pick = D.DAILY[((n % D.DAILY.length) + D.DAILY.length) % D.DAILY.length];
    const tag = 'daily:' + dayKey(at), runs = X.runsArr().filter(r => r.tag === tag);
    const nx = D.DAILY[(((n + 1) % D.DAILY.length) + D.DAILY.length) % D.DAILY.length];
    return { tag, pick, next: nx, seed: (n * 7919 + 13) % 2147483647, done: runs.find(r => r.status === 'done') || null, active: runs.find(r => r.status === 'active') || null };
  }
  function rhythm(t) {
    const at = t || now(), ws = weekStart(at), done = doneRuns();
    const days = {}; done.forEach(r => { if (r.completedAt) days[dayKey(r.completedAt)] = (days[dayKey(r.completedAt)] || 0) + 1; });
    const week = [];
    for (let i = 0; i < 7; i++) { const d = ws + i * DAY + 3 * 36e5; week.push({ key: dayKey(d), n: days[dayKey(d)] || 0, future: d > at && dayKey(d) !== dayKey(at), today: dayKey(d) === dayKey(at) }); }
    const thisWeek = done.filter(r => (r.completedAt || 0) >= ws).length;
    let streak = 0, d = at;
    if (!days[dayKey(d)]) d -= DAY;
    while (days[dayKey(d)]) { streak++; d -= DAY; }
    return { target: pref().weekly || 3, done: thisWeek, streak, today: days[dayKey(at)] || 0, week };
  }

  /* ---------- Coach: what to do next, and why ---------- */
  function coach(skipRunId) {
    const out = [], seen = new Set(), runs = X.runsArr(), done = runs.filter(r => r.status === 'done'), best = X.bestScores();
    const add = rec => { if (!rec || seen.has(rec.m) || !playable(rec.m)) return; seen.add(rec.m); out.push(rec); };
    const act = runs.find(r => r.status === 'active' && r.id !== skipRunId && now() - r.updatedAt < 14 * DAY && !mod(r.module).retired);
    if (act) add({ m: act.module, run: act.id, kind: 'Pick up where you stopped', why: `${act.progress || 'In progress'}, last touched ${N.ago(act.updatedAt)}.`, label: 'Resume' });
    const tr = track();
    if (tr) { const st = trackState(tr); if (st.next) add({ m: st.next.step.m, cfg: st.next.step.cfg, run: st.next.active ? st.next.active.id : null, kind: `${tr.t} · step ${st.next.i + 1} of ${st.n}`, why: st.next.step.why, label: st.next.active ? 'Resume' : 'Start' }); }
    if (!done.length) add({ m: 'deal', kind: 'Start here', why: 'Five minutes and no set-up: a short negotiation that shows how every activity, score and debrief works.' });
    const sk = skills(), gaps = sk.slice().sort((a, b) => a.ev - b.ev || a.n - b.n);
    const gapRec = g => { if (!g) return null; const id = forSkill(g.id, best, seen); return id ? { m: id, kind: `Build ${g.t.toLowerCase()}`, why: g.ev ? `${g.t} is your thinnest capability (${g.ev}/100). This is the quickest way to add evidence.` : `You have no evidence for ${g.t.toLowerCase()} yet. This is the quickest way to start.` } : null; };
    if (done.length) add(gapRec(gaps[0]));
    /* Level up: a strong score at one level, the next level untried. */
    X.scoredOnly(done).filter(r => r.score >= 70).sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0)).some(r => {
      const M = mod(r.module), o = (M.options || []).find(x => x.id === 'difficulty'); if (!o || seen.has(r.module)) return false;
      const lv = X.lvlIdx((r.config || {}).difficulty || 'guided'), nextV = S.LEVELS[lv + 1]; if (!nextV || !o.choices.some(c => c.v === nextV.v)) return false;
      if (runs.some(x => x.module === r.module && X.lvlIdx((x.config || {}).difficulty || 'guided') > lv)) return false;
      add({ m: r.module, cfg: Object.assign({}, r.config || {}, { difficulty: nextV.v }), kind: 'Level up', why: `You scored ${r.score} at ${S.levelName(S.LEVELS[lv].v)}. ${nextV.t} takes ${lv === 0 ? 'the coaching' : 'the estimates'} away.` });
      return true;
    });
    /* Redo: a weak score, not yet bettered; replay the same market. */
    const low = X.scoredOnly(done).filter(r => r.score < 55 && best[r.module] < 55 && !seen.has(r.module)).sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))[0];
    if (low) add({ m: low.module, redo: low.id, kind: 'Try it again', why: `You scored ${low.score}. Replay the same market and test what you would change.`, label: 'Replay' });
    if (playable('roleq')) {
      const reports = done.filter(r => r.module === 'roleq').sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0)), scored = X.scoredOnly(done);
      if (!reports.length && scored.length >= 2) add({ m: 'roleq', kind: 'Career direction', why: `You have ${scored.length} scored results. RoleQuest can use them as evidence for which roles fit.` });
      else if (reports.length) { const fresh = scored.filter(r => (r.completedAt || 0) > (reports[0].completedAt || 0)).length; if (fresh >= 3) add({ m: 'roleq', kind: 'Update your career report', why: `${fresh} new results since your last report.` }); }
    }
    gaps.slice(1).forEach(g => add(gapRec(g)));
    return out;
  }

  /* ---------- Shared bits of markup ---------- */
  function startAttrs(m, cfg, seed, tag) {
    return `data-act="new-run" data-module="${m}"${cfg ? ` data-preset="${esc(JSON.stringify(cfg))}"` : ''}${seed != null ? ` data-seed="${seed}"` : ''}${tag ? ` data-tag="${esc(tag)}"` : ''}`;
  }
  function recBtn(r, cls, label) {
    if (r.redo) return `<button type="button" class="btn ${cls}" data-act="retry-run" data-id="${r.redo}">${label || r.label || 'Replay'}</button>`;
    if (r.run) return `<button type="button" class="btn ${cls}" data-act="open-run" data-id="${r.run}">${label || 'Resume'}</button>`;
    return `<button type="button" class="btn ${cls}" ${startAttrs(r.m, r.cfg, r.seed, r.tag)}>${label || r.label || 'Start'}</button>`;
  }
  function actMeta(m, cfg) {
    const M = mod(m), c = X.catOf(M), lv = levelOfCfg(cfg) || (M.level ? S.levelName(M.level) : '');
    return `<span class="act-meta">${[X.fmtOne(M), c ? c.t : '', `about ${mins(m)} min`, lv].filter(Boolean).map(esc).join(' · ')}</span>`;
  }
  const cfgNote = (m, cfg) => { if (!cfg) return ''; if (m === 'guess' && cfg.problem && cfg.problem !== 'any') { const p = (window.GuessData || []).find(x => x.id === cfg.problem); return p ? ` · ${esc(p.title || p.t)}` : ''; } return ''; };
  function meterRow(s) {
    return `<div class="sk"><div class="sk-top"><span class="sk-t">${esc(s.t)}</span><span class="sk-v num">${s.ev ? s.ev : '–'}</span></div><span class="pbar"><i class="${evTone(s.ev)}" style="width:${Math.max(0, Math.min(100, s.ev))}%"></i></span><span class="sk-s">${evWord(s.ev)}${s.n ? ` · ${s.n} activit${s.n === 1 ? 'y' : 'ies'}` : ''}</span></div>`;
  }
  const heroOf = (eyebrow, title, lede) => `<section class="hero"><span class="eyebrow">${eyebrow}</span><h1>${title}</h1>${lede ? `<p class="lede">${lede}</p>` : ''}</section>`;

  /* ---------- Today ---------- */
  function goalPicker(compact) {
    const cur = pref().track;
    return `<div class="goals-g">${D.TRACKS.map(t => `<button type="button" class="goal-b" data-act="pf-goal" data-track="${t.id}" aria-pressed="${t.id === cur}"><span class="gb-t">${esc(t.goal)}</span><span class="gb-s">${esc(compact ? t.t : t.who)}</span></button>`).join('')}</div>`;
  }
  function viewToday() {
    const runs = X.runsArr(), done = runs.filter(r => r.status === 'done'), active = runs.filter(r => r.status === 'active' && !mod(r.module).retired);
    const first = (App.me.name || '').split(' ')[0], rh = rhythm(), sk = skills(), tr = track(), p = pref();
    const evidenced = sk.filter(s => s.ev > 0).length;
    let h = `<section class="hero td-hero"><span class="eyebrow">${App.mode === 'cloud' ? 'Today' : App.connecting ? 'Connecting' : 'Today · guest mode'}</span><h1>${first ? `${hello()}, ${esc(first)}` : done.length ? hello() : 'Practise business decisions, <span class="hl">one session at a time</span>'}</h1><p class="lede">${done.length ? 'Here is the next thing worth your time, and why.' : 'Full simulations, real cases, guesstimates and decision practice. Pick a goal and the platform plans the next step for you, then tracks what each result says about your strengths.'}</p>${UI.kpis([
      { k: 'This week', v: `${rh.done}/${rh.target}` }, { k: 'Day streak', v: String(rh.streak) },
      { k: 'Completed', v: String(done.length) }, { k: 'Capabilities evidenced', v: sk.length ? `${evidenced}/${sk.length}` : '–' }
    ])}</section>`;
    if ((!tr && !p.goalSkipped && done.length < 3) || PF.goalOpen) {
      h += UI.sheet('Your goal', 'What are you practising for?', `<p class="cap">Choose one and the platform lines up a track of activities for it. You can change it any time.</p>${goalPicker()}<div class="actions"><button type="button" class="link" data-act="pf-goal-skip">${PF.goalOpen ? 'Close' : 'Skip for now'}</button></div>`);
    }
    const recs = coach();
    if (recs.length) {
      const r = recs[0], alts = recs.slice(1, 3);
      h += `<section class="sheet td-next"><header class="sh"><span class="eyebrow">Next step · ${esc(r.kind)}</span><h2>${esc(actTitle(r.m))}${cfgNote(r.m, r.cfg)}</h2></header>${actMeta(r.m, r.cfg)}<p class="blurb">${esc(r.why)}</p><div class="actions">${recBtn(r, 'btn-primary')}</div>${alts.length ? `<div class="alts"><span class="eyebrow">Or</span>${alts.map(a => `<div class="alt"><div class="alt-t"><span class="alt-n">${esc(actTitle(a.m))}${cfgNote(a.m, a.cfg)}</span><span class="alt-w">${esc(a.kind)} · about ${mins(a.m)} min</span></div>${recBtn(a, 'btn-ghost btn-sm')}</div>`).join('')}</div>` : ''}</section>`;
    }
    h += `<div class="td-grid">${dailySheet()}${rhythmSheet(rh)}</div>`;
    if (tr) h += trackSheet(tr, true);
    if (sk.length && done.length) h += UI.sheet('Skill profile', 'Where your evidence stands', `<div class="sks">${sk.slice().sort((a, b) => b.ev - a.ev).map(meterRow).join('')}</div><div class="actions"><button type="button" class="btn btn-ghost btn-sm" data-act="pf-go" data-view="history" data-tab="skills">See what to practise for each</button></div>`);
    if (active.length) h += UI.sheet('Continue', 'Sessions in progress', `<div class="runs">${active.slice(0, 4).map(X.runRow).join('')}</div>${active.length > 4 ? `<button type="button" class="btn btn-ghost btn-block" data-act="pf-go" data-view="history" data-tab="activity">See all ${active.length}</button>` : ''}`);
    X.modsBy('career').forEach(id => {
      const M = mod(id), mine = runs.filter(r => r.module === id);
      if (M.homeCard) h += UI.sheet(M.homeEyebrow || 'Careers', M.homeTitle || M.title, M.homeCard(mine.find(r => r.status === 'done') || null, mine.find(r => r.status === 'active') || null, runs), 'feature');
    });
    h += UI.sheet('Browse', 'By subject', `<div class="cats">${S.CATS.filter(c => c.subject !== false).map(c => `<button type="button" class="cat-t" data-act="go-cat" data-cat="${c.id}"><span class="ct-n">${c.t}</span><span class="ct-c num">${X.catCounts(c.id)}</span><span class="ct-s">${c.s}</span></button>`).join('')}</div><div class="cchips"><span class="eyebrow">Or by</span><button type="button" class="chip" data-act="go-cat" data-fmt="case">All ${X.modsBy('case').length} cases</button><button type="button" class="chip" data-act="go-cat" data-fmt="sim">Simulations</button><button type="button" class="chip" data-act="pf-go" data-view="catalog" data-time="10">10 minutes or less</button><button type="button" class="chip" data-act="pf-go" data-view="catalog" data-time="30">Under half an hour</button></div>`);
    return h;
  }
  function hello() { const hr = new Date(now()).getHours(); return hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening'; }
  function dailySheet() {
    const d = daily(), M = mod(d.pick.m);
    if (!M) return '';
    let body = `<h3 class="td-h">${esc(actTitle(d.pick.m))}${cfgNote(d.pick.m, d.pick.cfg)}</h3>${actMeta(d.pick.m, d.pick.cfg)}`;
    if (d.done) body += `<p class="cap">Done today: <span class="pill ${S.tone(d.done.score || 0)}">${d.done.score == null ? 'Complete' : `${d.done.grade} · ${d.done.score}`}</span></p><p class="cap">Tomorrow: ${esc(actTitle(d.next.m))}${cfgNote(d.next.m, d.next.cfg)}.</p><div class="actions"><button type="button" class="btn btn-ghost btn-sm" data-act="open-run" data-id="${d.done.id}">See debrief</button></div>`;
    else if (d.active) body += `<p class="cap">Started, not finished.</p><div class="actions"><button type="button" class="btn btn-primary btn-sm" data-act="open-run" data-id="${d.active.id}">Resume</button></div>`;
    else body += `<p class="cap">Ten minutes, the same problem for everyone today.</p><div class="actions"><button type="button" class="btn btn-primary btn-sm" ${startAttrs(d.pick.m, d.pick.cfg, d.seed, d.tag)}>Start today’s drill</button></div>`;
    return UI.sheet('Daily drill', null, body, 'td-daily');
  }
  function rhythmSheet(rh) {
    const L = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const dots = `<div class="dots" aria-label="This week">${rh.week.map((d, i) => `<span class="dot${d.n ? ' on' : ''}${d.today ? ' today' : ''}${d.future ? ' fut' : ''}" title="${d.key}${d.n ? ` · ${d.n} completed` : ''}"><i></i><span>${L[i]}</span></span>`).join('')}</div>`;
    const left = Math.max(0, rh.target - rh.done);
    return UI.sheet('This week', null, `<h3 class="td-h num">${rh.done} of ${rh.target} sessions</h3>${dots}<p class="cap">${left ? `${left} more to hit your weekly target.` : 'Weekly target met. Anything more is a bonus.'}${rh.streak > 1 ? ` ${rh.streak}-day streak.` : ''}</p><div class="chips sm" role="group" aria-label="Weekly target">${[2, 3, 5, 7].map(n => `<button type="button" class="chip" data-act="pf-weekly" data-n="${n}" aria-pressed="${n === rh.target}">${n} a week</button>`).join('')}</div>`, 'td-rhythm');
  }
  function stepRows(tr, st) {
    return `<ol class="tsteps">${st.steps.map((s, i) => {
      const isNext = st.next && st.next.i === i, M = mod(s.step.m);
      const btn = !M ? '' : s.done ? '' : s.active ? `<button type="button" class="btn btn-ghost btn-sm" data-act="open-run" data-id="${s.active.id}">Resume</button>` : `<button type="button" class="btn ${isNext ? 'btn-primary' : 'btn-ghost'} btn-sm" ${startAttrs(s.step.m, s.step.cfg)}>Start</button>`;
      return `<li class="ts${s.done ? ' ts-done' : ''}${isNext ? ' ts-next' : ''}"><span class="ts-n num" aria-hidden="true">${s.done ? '✓' : i + 1}</span><div class="ts-b"><span class="ts-t">${esc(actTitle(s.step.m))}${cfgNote(s.step.m, s.step.cfg)}</span><span class="ts-w">${esc(s.step.why)}</span>${M ? actMeta(s.step.m, s.step.cfg) : ''}</div>${btn}</li>`;
    }).join('')}</ol>`;
  }
  function trackSheet(tr, compact) {
    const st = trackState(tr), pct = Math.round(100 * st.nDone / st.n);
    const head = `<p class="cap num">${st.nDone} of ${st.n} steps · ${st.mins ? `about ${Math.round(st.mins / 5) * 5 || st.mins} min left` : 'complete'}</p><span class="pbar"><i class="good" style="width:${pct}%"></i></span>`;
    if (compact) {
      const nextI = st.next ? st.next.i : st.n;
      const sub = { steps: st.steps.slice(Math.max(0, nextI - 1), nextI + 2), next: st.next };
      const offset = Math.max(0, nextI - 1);
      const rows = `<ol class="tsteps" start="${offset + 1}">${sub.steps.map((s, k) => { const i = offset + k, isNext = st.next && st.next.i === i; return `<li class="ts${s.done ? ' ts-done' : ''}${isNext ? ' ts-next' : ''}"><span class="ts-n num" aria-hidden="true">${s.done ? '✓' : i + 1}</span><div class="ts-b"><span class="ts-t">${esc(actTitle(s.step.m))}${cfgNote(s.step.m, s.step.cfg)}</span><span class="ts-w">${esc(s.step.why)}</span></div></li>`; }).join('')}</ol>`;
      return UI.sheet('Your track', esc(tr.t), `${head}${rows}<div class="actions"><button type="button" class="btn btn-ghost btn-sm" data-act="pf-track-open" data-track="${tr.id}">See the whole track</button><button type="button" class="link" data-act="pf-goal-open">Change goal</button></div>`);
    }
    return UI.sheet(esc(tr.who), esc(tr.t), `<p class="blurb">${esc(tr.out)}.</p>${head}${stepRows(tr, st)}`);
  }

  /* ---------- Tracks ---------- */
  function viewTracks() {
    const cur = pref().track;
    if (PF.track) {
      const tr = D.TRACKS.find(t => t.id === PF.track);
      if (tr) return `<div class="tback"><button type="button" class="back" data-act="pf-track-back"><span aria-hidden="true">←</span> All tracks</button></div>` + trackSheet(tr, false) +
        UI.sheet(null, null, `<div class="actions">${tr.id === cur ? '<span class="pill good">Your current goal</span>' : `<button type="button" class="btn btn-primary" data-act="pf-goal" data-track="${tr.id}">Make this my goal</button>`}</div>`);
    }
    let h = heroOf('Tracks', 'Plans for what you are aiming at', 'Each track is an ordered set of activities for one goal, from quick warm-ups to the full simulations at Advanced level. Your progress fills in as you finish runs, whichever way you started them.');
    h += `<div class="tcards">${D.TRACKS.map(t => {
      const st = trackState(t), pct = Math.round(100 * st.nDone / st.n);
      return `<button type="button" class="tcard${t.id === cur ? ' cur' : ''}" data-act="pf-track-open" data-track="${t.id}"><span class="eyebrow">${t.id === cur ? 'Your goal · ' : ''}${st.n} steps</span><span class="tc-t">${esc(t.t)}</span><span class="tc-s">${esc(t.who)}</span><span class="pbar"><i class="good" style="width:${pct}%"></i></span><span class="tc-p num">${st.nDone} of ${st.n} done</span></button>`;
    }).join('')}</div>`;
    return h;
  }

  /* ---------- Progress: skills, activity, journal ---------- */
  function viewProgress() {
    const tabs = [{ v: 'skills', t: 'Skills' }, { v: 'activity', t: 'Activity' }, { v: 'journal', t: 'Journal' }];
    let h = heroOf('Progress', 'Your record', 'What your results say about each capability, every run you have started, and the takeaways you wrote after each debrief.');
    h += `<div class="tabs pf-tabs" role="tablist">${tabs.map(t => `<button type="button" role="tab" class="tab" data-act="pf-tab" data-value="${t.v}" aria-selected="${t.v === PF.tab}">${t.t}</button>`).join('')}</div>`;
    if (PF.tab === 'activity') return h + X.viewHistory().replace(/^<section class="hero">[\s\S]*?<\/section>/, '');
    if (PF.tab === 'journal') return h + journal();
    const sk = skills(), best = X.bestScores();
    if (!sk.length) return h + UI.sheet(null, null, UI.empty('The skill profile is not available in this version.'));
    h += UI.sheet('How this works', null, `<p class="cap">Each capability is scored from your best result on every activity that practises it, weighted by how much that activity tests it. Scores stay modest until several activities back them up, so one lucky run cannot make a capability look strong.</p>`);
    h += `<div class="pf-list">${sk.map(s => {
      const id = forSkill(s.id, best);
      return `<section class="sheet sk-card">${meterRow(s)}<p class="cap">${esc(s.hint)}</p>${s.last ? `<p class="cap">Latest evidence: ${esc(X.runTitle(s.last))} · ${s.last.score} · ${N.ago(s.last.completedAt || s.last.updatedAt)}</p>` : ''}${id ? `<div class="alt"><div class="alt-t"><span class="alt-n">${esc(actTitle(id))}</span><span class="alt-w">${best[id] == null ? 'Not played yet' : `Best ${best[id]}`} · about ${mins(id)} min</span></div><button type="button" class="btn btn-ghost btn-sm" ${startAttrs(id)}>${best[id] == null ? 'Start' : 'Again'}</button></div>` : ''}</section>`;
    }).join('')}</div>`;
    return h;
  }
  function journal() {
    const rs = X.runsArr().filter(r => r.note).sort((a, b) => (b.noteAt || b.updatedAt) - (a.noteAt || a.updatedAt));
    if (!rs.length) return UI.sheet(null, null, UI.empty('No takeaways yet. After each debrief, write one line on what you would do differently. They collect here, and the next time you start that activity you will see the last one.'));
    return UI.sheet(null, `${rs.length} takeaway${rs.length === 1 ? '' : 's'}`, `<div class="jr-l">${rs.map(r => `<div class="jr"><blockquote>${esc(r.note)}</blockquote><div class="jr-m"><span>${esc(X.runTitle(r))}${r.score != null ? ` · ${r.score}` : ''} · ${N.ago(r.noteAt || r.updatedAt)}</span><button type="button" class="link" data-act="open-run" data-id="${r.id}">Open debrief</button></div></div>`).join('')}</div>`);
  }

  /* ---------- Playbook ---------- */
  const CATN = id => { const c = S.CATS.find(x => x.id === id); return c ? c.t : id; };
  function pbMatch(c) {
    const q = PF.pbQ.trim().toLowerCase();
    return (PF.pbCat === 'all' || c.cat === PF.pbCat) && (!q || (c.t + ' ' + c.d + ' ' + c.rule + ' ' + c.trap).toLowerCase().indexOf(q) >= 0);
  }
  function pbList() {
    const list = D.CONCEPTS.filter(pbMatch);
    if (!list.length) return UI.empty('No concept matches that.', `<button type="button" class="btn btn-ghost" data-act="pf-pb-clear">Clear search</button>`);
    return `<p class="cap num">${list.length} of ${D.CONCEPTS.length} concepts</p><div class="pbs">${list.map(pbCard).join('')}</div>`;
  }
  function pbCard(c) {
    const where = c.m.filter(playable);
    return `<article class="pb"><span class="eyebrow">${esc(CATN(c.cat))}</span><h3>${esc(c.t)}</h3><p class="pb-d">${esc(c.d)}</p><p class="pb-r"><span class="eyebrow">Rule of thumb</span>${esc(c.rule)}</p><p class="pb-x"><span class="eyebrow">Common trap</span>${esc(c.trap)}</p>${where.length ? `<div class="pb-w"><span class="eyebrow">Practise it in</span><div class="chips sm">${where.map(id => `<button type="button" class="chip" ${startAttrs(id)}>${esc(actTitle(id))}</button>`).join('')}</div></div>` : ''}</article>`;
  }
  function viewPlaybook() {
    const cats = [{ v: 'all', t: 'All' }].concat(S.CATS.filter(c => D.CONCEPTS.some(x => x.cat === c.id)).map(c => ({ v: c.id, t: c.t })));
    let h = heroOf('Playbook', 'The ideas behind the decisions', `${D.CONCEPTS.length} concepts the activities test, each with a rule of thumb, the trap people fall into, and where to practise it.`);
    h += `<section class="sheet catf"><label class="srch"><span class="lbl">Search</span><input type="search" id="pf-pbq" placeholder="Try ‘bottleneck’ or ‘pricing’" value="${esc(PF.pbQ)}" autocomplete="off"></label><div class="frow"><span class="lbl">Subject</span><div class="chips sm" role="group" aria-label="Subject">${cats.map(c => `<button type="button" class="chip" data-act="pf-pbcat" data-value="${c.v}" aria-pressed="${c.v === PF.pbCat}">${esc(c.t)}</button>`).join('')}</div></div></section>`;
    h += `<div id="pb-list">${pbList()}</div>`;
    return h;
  }
  const conceptsFor = id => D.CONCEPTS.filter(c => c.m.indexOf(id) >= 0);
  function conceptDialog(id) {
    const c = D.CONCEPTS.find(x => x.id === id); if (!c) return '';
    return `<div class="dlg-back" role="dialog" aria-modal="true" aria-label="${esc(c.t)}"><div class="dlg sheet">${pbCard(c).replace('<article class="pb">', '<div class="pb pb-dlg">').replace(/<\/article>$/, '</div>')}<div class="actions"><button type="button" class="btn btn-ghost" data-act="dlg-close">Close</button><button type="button" class="link" data-act="pf-go" data-view="playbook">Open the Playbook</button></div></div></div>`;
  }

  /* ---------- Practise: catalogue with search, time and warm-ups ---------- */
  function prMatch(id) {
    const M = mod(id), F = App.catF, q = PF.q.trim().toLowerCase();
    if (F.cat !== 'all' && M.cat !== F.cat) return false;
    if (F.fmt !== 'all' && X.modFmt(M) !== F.fmt) return false;
    if (F.lvl !== 'all' && X.levelsOf(M).indexOf(F.lvl) < 0) return false;
    if (PF.time !== 'all' && mins(id) > Number(PF.time)) return false;
    if (q && (M.title + ' ' + (M.blurb || '') + ' ' + (M.practises || '') + ' ' + (M.area || '')).toLowerCase().indexOf(q) < 0) return false;
    return true;
  }
  const filtered = () => PF.q || PF.time !== 'all' || App.catF.cat !== 'all' || App.catF.fmt !== 'all' || App.catF.lvl !== 'all';
  function prList() {
    const all = X.visibleMods(), shown = all.filter(prMatch), best = X.bestScores();
    const order = id => X.FORMATS.findIndex(f => f.v === X.modFmt(mod(id)));
    let h = `<p class="cap num">${shown.length} of ${all.length} shown${filtered() ? ` · <button type="button" class="link" data-act="pf-clear">Clear filters</button>` : ''}</p>`;
    S.CATS.forEach(c => {
      const ids = shown.filter(id => mod(id).cat === c.id).sort((a, b) => order(a) - order(b) || mins(a) - mins(b));
      if (ids.length) h += UI.sheet(c.s, c.t, `<div class="mods">${ids.map(id => X.modCard(id, best[id], 'fmt')).join('')}</div>`);
    });
    if (!shown.length) h += UI.sheet(null, null, UI.empty('Nothing matches that.', `<button type="button" class="btn btn-ghost" data-act="pf-clear">Clear filters</button>`));
    return h;
  }
  function frow(k, label, opts, v, act) {
    return `<div class="frow"><span class="lbl">${label}</span><div class="chips sm" role="group" aria-label="${esc(label)}">${opts.map(o => `<button type="button" class="chip" data-act="${act || 'cat-f'}" ${k ? `data-k="${k}"` : ''} data-value="${o.v}" aria-pressed="${String(o.v) === String(v)}">${esc(o.t)}</button>`).join('')}</div></div>`;
  }
  function viewPractise() {
    const F = App.catF, best = X.bestScores();
    let h = heroOf('Practise', 'Everything you can practise', `${X.modsBy('sim').length} full simulations, ${D.QUICK.filter(playable).length} quick warm-ups, ${X.modsBy('case').length} cases, guesstimates and decision practice, by subject, level and the time you have.`);
    h += `<section class="sheet catf"><label class="srch"><span class="lbl">Search</span><input type="search" id="pf-prq" placeholder="Try ‘pricing’ or ‘negotiation’" value="${esc(PF.q)}" autocomplete="off"></label>${frow(null, 'Time', [{ v: 'all', t: 'Any' }, { v: '10', t: '10 min or less' }, { v: '30', t: '30 min or less' }, { v: '60', t: 'An hour or less' }], PF.time, 'pf-time')}${frow('cat', 'Subject', [{ v: 'all', t: 'All' }].concat(S.CATS.map(c => ({ v: c.id, t: c.t }))), F.cat)}${frow('fmt', 'Format', [{ v: 'all', t: 'All' }].concat(X.FORMATS.map(f => ({ v: f.v, t: f.t }))), F.fmt)}${frow('lvl', 'Level', [{ v: 'all', t: 'Any level' }].concat(S.LEVELS.map(l => ({ v: l.v, t: l.t }))), F.lvl)}</section>`;
    const warm = D.QUICK.filter(playable);
    if (warm.length && !PF.q && (F.cat === 'all' || warm.some(id => mod(id).cat === F.cat)) && (F.fmt === 'all' || F.fmt === 'sim')) {
      const ids = warm.filter(id => F.cat === 'all' || mod(id).cat === F.cat);
      h += UI.sheet('Warm-ups', 'Five-minute simulations', `<p class="blurb">Short versions of the full simulations. Good for a first try, a daily habit or a quick check before the full run.</p><div class="mods">${ids.map(id => X.modCard(id, best[id], 'fmt')).join('')}</div>`);
    }
    h += `<div id="pr-list">${prList()}</div>`;
    return h;
  }

  /* ---------- Account: add the plan ---------- */
  function viewAccount() {
    const tr = track(), rh = rhythm();
    return X.viewAccount() + UI.sheet('Plan', 'Your plan', `<p class="case">${tr ? `Goal: <strong>${esc(tr.goal)}</strong>, following the ${esc(tr.t)} track.` : 'No goal set yet.'} Weekly target: ${rh.target} sessions.</p><div class="actions"><button type="button" class="btn btn-ghost" data-act="pf-goal-open">${tr ? 'Change goal' : 'Choose a goal'}</button></div>${frow(null, 'Weekly target', [2, 3, 5, 7].map(n => ({ v: n, t: `${n} a week` })), rh.target, 'pf-weekly-f')}`);
  }

  /* ---------- Hooks into runs ---------- */
  function debrief(c, M) {
    if (X.modFmt(M) === 'career') return '';
    const note = c.meta.note || '', cs = conceptsFor(M.id).slice(0, 5), next = coach(c.meta.id).filter(r => r.m !== M.id).slice(0, 2);
    let h = UI.sheet('Takeaway', 'One thing you would do differently', `<p class="cap">Write it while it is fresh. It is saved with this run, collected in your journal and shown the next time you start ${esc(actTitle(M.id))}.</p><textarea id="pf-note" class="pf-ta" maxlength="280" rows="3" placeholder="Next time I will…">${esc(note)}</textarea><div class="actions"><button type="button" class="btn btn-primary btn-sm" data-act="pf-note-save">${note ? 'Update takeaway' : 'Save takeaway'}</button>${c.meta.noteAt ? `<span class="cap">Saved ${N.ago(c.meta.noteAt)}</span>` : ''}</div>`, 'pf-debrief');
    if (cs.length) h += UI.sheet('Playbook', 'Concepts in play', `<div class="chips sm">${cs.map(x => `<button type="button" class="chip" data-act="pf-concept" data-id="${x.id}">${esc(x.t)}</button>`).join('')}</div>`);
    if (next.length) h += UI.sheet('Next', 'Where to go from here', next.map(r => `<div class="alt"><div class="alt-t"><span class="alt-n">${esc(actTitle(r.m))}${cfgNote(r.m, r.cfg)}</span><span class="alt-w">${esc(r.kind)} · about ${mins(r.m)} min</span></div>${recBtn(r, 'btn-ghost btn-sm')}</div>`).join(''));
    return h;
  }
  function dialogExtra(M) {
    const last = X.runsArr().filter(r => r.module === M.id && r.status === 'done').sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))[0];
    if (!last) return '';
    return `<div class="pf-last"><span class="eyebrow">Last time · ${last.score == null ? 'Complete' : `${last.grade} · ${last.score}`} · ${N.ago(last.completedAt || last.updatedAt)}</span>${last.note ? `<blockquote>${esc(last.note)}</blockquote>` : ''}</div>`;
  }

  /* ---------- Screen links, so the back button works ---------- */
  const ROUTES = { today: 'home', practise: 'catalog', tracks: 'tracks', progress: 'history', playbook: 'playbook', account: 'account' };
  const routeOf = v => Object.keys(ROUTES).find(k => ROUTES[k] === v) || 'today';
  let lastView = null;
  function fromHash() { try { const h = (location.hash || '').replace(/^#/, ''); return h ? ROUTES[h] || null : 'home'; } catch (e) { return null; } }
  function onRendered() {
    if (App.view === 'run' || App.view === 'loading') return;
    if (App.view !== lastView) {
      const want = '#' + routeOf(App.view);
      try { if (location.hash !== want) { if (lastView == null) history.replaceState(null, '', want); else history.pushState(null, '', want); } } catch (e) { /* framed without history */ }
      lastView = App.view;
    }
  }
  window.addEventListener('popstate', () => {
    const v = fromHash(); if (!v || App.view === 'run' || App.view === 'loading' || v === App.view) return;
    lastView = v; App.view = v; App.dialog = null; S.render(true);
  });

  /* Search boxes repaint only their list, so the cursor stays put. */
  document.addEventListener('input', e => {
    const el = e.target;
    if (el.id === 'pf-prq') { PF.q = el.value; const l = document.getElementById('pr-list'); if (l) l.innerHTML = prList(); }
    else if (el.id === 'pf-pbq') { PF.pbQ = el.value; const l = document.getElementById('pb-list'); if (l) l.innerHTML = pbList(); }
  });

  /* ---------- Actions ---------- */
  const go = (view, top) => { App.view = view; App.cur = null; App.dialog = null; S.render(top !== false); };
  Object.assign(App.actions, {
    'pf-goal': el => { const t = D.TRACKS.find(x => x.id === el.dataset.track); if (!t) return; PF.goalOpen = false; PF.track = null; X.Prefs.save({ track: t.id, goalSkipped: false }).then(() => S.render()); S.toast(`Goal set: ${t.goal}. Your next step now follows the ${t.t} track.`); go('home'); },
    'pf-goal-skip': () => { if (PF.goalOpen) { PF.goalOpen = false; S.render(); return; } X.Prefs.save({ goalSkipped: true }); S.render(); },
    'pf-goal-open': () => { PF.goalOpen = true; go('home'); },
    'pf-weekly': el => { X.Prefs.save({ weekly: Number(el.dataset.n) }); S.render(); },
    'pf-weekly-f': el => { X.Prefs.save({ weekly: Number(el.dataset.value) }); S.render(); },
    'pf-go': el => { if (el.dataset.tab) PF.tab = el.dataset.tab; if (el.dataset.time) PF.time = el.dataset.time; go(el.dataset.view || 'home'); },
    'pf-tab': el => { PF.tab = el.dataset.value; S.render(); },
    'pf-track-open': el => { PF.track = el.dataset.track; go('tracks'); },
    'pf-track-back': () => { PF.track = null; S.render(true); },
    'pf-time': el => { PF.time = el.dataset.value; S.render(); },
    'pf-clear': () => { PF.q = ''; PF.time = 'all'; App.catF = { cat: 'all', fmt: 'all', lvl: 'all' }; S.render(); },
    'pf-pbcat': el => { PF.pbCat = el.dataset.value; S.render(); },
    'pf-pb-clear': () => { PF.pbQ = ''; PF.pbCat = 'all'; S.render(); },
    'pf-concept': el => { const id = el.dataset.id; App.dialog = { html: () => conceptDialog(id) }; S.render(); },
    'pf-note-save': () => {
      const c = App.cur, ta = document.getElementById('pf-note'); if (!c || !ta) return;
      const text = ta.value.trim().slice(0, 280);
      c.meta.note = text; c.meta.noteAt = Date.now();
      if (!text) { delete c.meta.note; delete c.meta.noteAt; }
      App.runs[c.meta.id] = Object.assign({}, App.runs[c.meta.id] || {}, c.meta);
      X.Store.saveMeta(c.meta).then(() => S.toast(text ? 'Takeaway saved to your journal.' : 'Takeaway removed.'), () => S.toast('Could not save the takeaway. Try again shortly.'));
      S.render();
    }
  });

  /* ---------- Register ---------- */
  App.navItems = [['home', 'Today'], ['catalog', 'Practise'], ['tracks', 'Tracks'], ['history', 'Progress'], ['playbook', 'Playbook']];
  Object.assign(App.views, { home: viewToday, catalog: viewPractise, tracks: viewTracks, history: viewProgress, playbook: viewPlaybook, account: viewAccount });
  Object.assign(App.hooks, { debrief, dialog: dialogExtra, rendered: onRendered });
  /* The catalogue's own "go-cat" lands on Practise, which honours the same filters. */
  const initial = fromHash(); if (initial && initial !== 'home') App.view = initial;

  window.SimLabCoach = { PF, skills, forSkill, coach, daily, rhythm, track, trackState, stepRuns, actTitle, mins, conceptsFor, dayNum, dayKey, weekStart, playable };
})();
