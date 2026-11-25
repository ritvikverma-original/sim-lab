/* People Lab: interface for the HR simulation. You are head of HR at a 100,000-person Indian IT services firm for twelve quarters.
   The engine lives in people-engine.js; the real attrition series, events and reveal live in people-data.js. */
(function () {
  'use strict';
  const S = window.SimLab, E = window.PeopleEngine, PD = window.PeopleData;
  if (!S || !E || !PD) return;
  const { UI, N, U } = S;
  const esc = U.esc, clamp = U.clamp, sum = U.sum, avg = U.avg, clone = U.clone;
  const FIRM = 'Sahyadri Infotech';
  const lvl = g => S.lvlOf(g);
  const done = g => E.isDone(g);
  const uiStr = (ctx, k, d) => (ctx.ui[k] == null || ctx.ui[k] === '' ? d : ctx.ui[k]);
  const yr = q => Math.ceil(q / 4), qy = q => ((q - 1) % 4) + 1;
  const ql = q => `Y${yr(q)} Q${qy(q)}`;
  const QL = q => `year ${yr(q)}, quarter ${qy(q)}`;
  const QLc = q => `Year ${yr(q)}, quarter ${qy(q)}`;
  const ppl = v => N.int(Math.round(v));
  const kp = v => (Math.abs(v) >= 10000 ? `${N.num(v / 1000, 1)}k` : N.int(Math.round(v)));
  const m = v => N.m(v, Math.abs(v) >= 100 ? 0 : 1);
  const pct = (v, d) => N.pct(v, d == null ? 0 : d);
  const pct1 = v => N.pct(v, 1);
  const sgnPct = (v, d) => N.sign(v * 100, x => N.num(x, d == null ? 1 : d) + '%');
  const sgnPts = v => N.sign(v, x => N.num(x, 0));
  const last = g => g.H[g.H.length - 1];
  const fieldBox = (label, control, liveKey, hint) => `<div class="fbox"><span class="lbl">${label}</span>${control}${liveKey || hint ? `<span class="hint"${liveKey ? ` data-live="${liveKey}"` : ''}>${hint || ''}</span>` : ''}</div>`;
  const START = (() => { const g0 = E.create(1, { difficulty: 'guided' }); return { E: g0.E, B: g0.B, csat: g0.csat, board: g0.board }; })();
  const PEAK_A = Math.max(...PD.REAL.tcs) / 100, PEAK_B = Math.max(...PD.REAL.infy) / 100;
  const SKILL = { dig: 'digital', leg: 'traditional' };

  /* Peers' attrition as last reported at the start of quarter q (results come out after each quarter ends). */
  function peerAt(q) {
    if (q <= 1) return { a: PD.REAL.tcsPrior / 100, b: PD.REAL.infyPrior / 100 };
    const i = Math.min(12, q - 1) - 1;
    return { a: PD.REAL.tcs[i] / 100, b: PD.REAL.infy[i] / 100 };
  }
  const inrNow = q => (q <= 1 ? PD.REAL.inr0 : PD.REAL.inr[Math.min(12, q - 1) - 1]);
  const ratioTxt = r => (r >= 1.005 ? `${pct(r - 1, 1)} above` : r <= 0.995 ? `${pct(1 - r, 1)} below` : 'in line with');
  const need = D => D / 0.86;

  /* ---------- Header ---------- */
  function header(g) {
    const d = done(g), L = last(g), pr = peerAt(d ? 13 : g.q);
    return `<section class="sheet hdr"><div class="hdr-top"><div class="sh"><span class="eyebrow">Indian IT services · ${d ? 'Debrief' : `${QLc(g.q)} · quarter ${g.q} of ${E.N_Q}`}</span><h2>${FIRM}</h2></div><div class="hdr-pills">${UI.pill('Head of HR', 'neutral')}${UI.level(g.cfg.difficulty)}</div></div>${UI.kpis([
      { k: 'Headcount', v: ppl(E.headcount(g)), d: `${kp(g.T)} in training · ${kp(E.pipeTotal(g))} waiting to join` },
      { k: 'Attrition, last 12 months', v: pct1(E.ltm(g)), d: `Peer A ${pct1(pr.a)} · Peer B ${pct1(pr.b)}` },
      { k: 'Utilisation', v: L ? pct(L.util) : '–', d: L ? `bench ${pct(L.bench)}${L.unmet > 50 ? ` · ${kp(L.unmet)} unstaffed` : ''}` : 'results after your first quarter', cls: L && L.unmet > 50 ? 'down' : '' },
      { k: 'Operating margin', v: L ? pct1(L.margin) : '–', d: L ? `last quarter · benchmark 22.5%` : 'benchmark 22.5%', cls: L ? (L.margin >= 0.225 ? 'up' : 'down') : '' }
    ])}</section>`;
  }
  function caseBrief(g, open) {
    return UI.brief(`Head of HR at ${FIRM}`, open, `<p>You have just become head of HR at <strong>${FIRM}</strong>, an Indian IT services company with 100,000 employees, about $3.8 billion of revenue a year and clients mostly in the United States and Europe. Your people are the product: clients pay for the hours your teams bill, and pay is three-quarters of the cost base.</p><p>For twelve quarters you decide how many graduates to hire and when, how many experienced people to hire from rivals and at what premium, what to pay, how fast to promote, how much to train and how people work. Most quarters also bring one dilemma that cannot wait.</p><p>The talent market follows the <strong>real history of the industry over three years</strong>, which you learn at the end. Two much larger rivals, <strong>Peer A</strong> and <strong>Peer B</strong>, report their attrition every quarter, and their figures are the ones they really reported.</p><ul class="steps"><li><strong>The pipeline is slow.</strong> A graduate who accepts an offer today joins two quarters later and trains for one more before clients pay for them. Some accept a better offer before they join.</li><li><strong>Experienced hires are fast but dear.</strong> They bill at once, but they want a premium over their current pay, a recruiter takes a fee, and colleagues notice what newcomers earn.</li><li><strong>Leavers go at once.</strong> Attrition is reported over the last twelve months, so a bad quarter stays in the figure for a year.</li><li><strong>Revenue is in dollars and pay in rupees.</strong> When the rupee weakens, your dollar costs fall.</li></ul><p>You are judged on operating margin, how much client demand you serve, attrition against the two peers, engagement, your employer brand and how healthy your utilisation stays.</p>`, 'Every hiring decision lands three quarters later. Hire for the market you expect then, not the one you see now.');
  }

  /* ---------- Market and coaching ---------- */
  function coachLine(g) {
    const q = g.q, fc = E.forecast(g), have = E.headcount(g) + g.T, want = need(fc.mid), L = last(g);
    const att = E.previewAttr(g, g.draft);
    if (g.board < 40) return `Board confidence is ${Math.round(g.board)}. Below 30 the board freezes all hiring for a quarter, and margin moves it most.`;
    if (want > have * 1.04 && q <= 7) return `You are about ${kp(want - have)} people short of a healthy 86% utilisation. Graduates offered now bill from ${QL(q + 3)}; experienced hires bill at once but cost a premium.`;
    if (L && L.bench > 0.16) return `${pct(L.bench)} of your people were unbilled last quarter. Graduate offers made now land in three quarters: will the work be there by then?`;
    if (att > 0.17) return `At these settings about ${pct(att)} of staff would leave over a year. Mid-level digital staff are the most at risk, and targeted pay or faster promotion costs less than replacing them.`;
    return `Demand is forecast at about ${kp(fc.mid)} people this quarter against ${kp(have)} on the payroll. Watch the pipeline: an offer takes three quarters to turn into billable work.`;
  }
  function attSpec(g, all) {
    const n = done(g) ? E.N_Q : g.q - 1;
    const youV = [ltm0(g)].concat(g.H.map(h => h.ltm));
    const known = all ? 12 : Math.max(0, g.q - 1);
    const pa = [PD.REAL.tcsPrior].concat(PD.REAL.tcs).map((v, i) => (i <= known ? v / 100 : null));
    const pb = [PD.REAL.infyPrior].concat(PD.REAL.infy).map((v, i) => (i <= known ? v / 100 : null));
    const len = Math.max(n + 1, all ? 13 : known + 1);
    const pad = a => a.slice(0, len).concat(Array(Math.max(0, len - a.length)).fill(null));
    return { series: [{ values: pad(pb), c: 'var(--c-c)', w: 1.8 }, { values: pad(pa), c: 'var(--c-b)', w: 1.8 }, { values: pad(youV), c: 'var(--c-you)', w: 2.8 }], xLabel: i => (i === 0 ? 'Start' : ql(i)), yMin: 0, yFmt: v => Math.round(v * 100) + '%' };
  }
  function ltm0(g) { const L = g.hist.slice(0, 3); return sum(L.map(x => x.leavers)) / Math.max(1, avg(L.map(x => x.hc))) * 4 / 3; }
  function marketSheet(g) {
    const q = g.q, fc = E.forecast(g), h = E.heatOf(q), have = E.headcount(g) + g.T, pr = peerAt(q);
    const kpis = UI.kpis([
      { k: 'Client demand', v: kp(fc.mid), d: `people · likely ${kp(fc.lo)} to ${kp(fc.hi)}` },
      { k: 'Able to bill', v: kp(have), d: `about ${kp(need(fc.mid))} needed at 86%`, cls: have < need(fc.mid) * 0.97 ? 'down' : '' },
      { k: 'Digital share of demand', v: pct(fc.dig), d: `your staff ${pct(E.digShare(g))}`, cls: E.digShare(g) < fc.dig - 0.03 ? 'down' : '' },
      { k: 'Switchers’ raise', v: pct(E.mprem(h)), d: `rupee ₹${N.num(inrNow(q), 1)} to the dollar` }
    ]);
    const legend = [{ t: 'You', c: 'var(--c-you)' }, { t: 'Peer A', c: 'var(--c-b)' }, { t: 'Peer B', c: 'var(--c-c)' }];
    const att = q >= 3 ? `${UI.chart('pl-att', () => attSpec(g), 200, legend, 'Attrition over the last twelve months: you and the two peers')}<p class="cap">Attrition over the last twelve months. The peers report after each quarter ends, so their latest figure is last quarter’s.</p>` : `<p class="case">Attrition over the last twelve months: you <strong>${pct1(E.ltm(g))}</strong>, Peer A <strong>${pct1(pr.a)}</strong>, Peer B <strong>${pct1(pr.b)}</strong>, as last reported.</p>`;
    return UI.sheet(`The market · start of ${QL(q)}`, 'What you know this quarter', `<p class="case">${esc(PD.MOOD[q - 1])}</p>${kpis}${att}${lvl(g) === 0 ? `<p class="note" data-live="pl-coach">${coachLine(g)}</p>` : ''}`);
  }
  function pulseSheet(g) {
    const L = last(g), P = g.H.length > 1 ? g.H[g.H.length - 2] : null;
    const prev = k => (P ? P[k] : START[k]);
    const row = (k, v, key, why) => `${UI.meter(k, v / 100, `${Math.round(v)}${L ? ` <span class="cap">${sgnPts(v - prev(key))}</span>` : ''}`, v >= 65 ? 'good' : v >= 45 ? '' : 'warn')}${lvl(g) === 0 ? `<p class="cap sp-d">${why}</p>` : ''}`;
    return UI.sheet('Pulse', 'How people, campuses, clients and the board feel', `<div class="sparts">${row('Engagement', g.E, 'E', 'Pay against the market, promotions, training, workload and fairness. Low engagement raises attrition.')}${row('Employer brand', g.B, 'B', 'How campuses and the job market see you. It sets how many graduates accept and how easily roles fill.')}${row('Client satisfaction', g.csat, 'csat', 'Unstaffed work, high attrition and promoting people before they are ready all hurt it, and it moves future demand.')}${row('Board confidence', g.board, 'board', 'Driven mostly by margin. Below 30 the board freezes all hiring for a quarter.')}</div>`);
  }

  /* ---------- The quarter's dilemma ---------- */
  function evText(g, ev) {
    const L = last(g), n = sum(g.pipe.filter(p => p.due <= g.q + 2).map(p => p.n));
    return esc(ev.text).replace('{n}', ppl(n)).replace('{bench}', L ? pct(L.bench) : 'about 12%');
  }
  function eventSheet(g) {
    const ev = E.eventOf(g); if (!ev) return '';
    const d = g.draft;
    const opts = ev.opts.map((o, i) => `<button type="button" class="opt" data-act="m" data-op="event" data-v="${o.v}" aria-pressed="${d.event === o.v}"><b>${'ABC'[i]}</b><span><strong>${esc(o.t)}.</strong> <span class="pl-os">${esc(o.s)}</span></span></button>`).join('');
    return `<section class="sheet" id="pl-ev"><header class="sh"><span class="eyebrow">Needs your decision · from the ${esc(ev.who.charAt(0).toLowerCase() + ev.who.slice(1))}</span><h2>${esc(ev.title)}</h2></header><p class="case">${evText(g, ev)}</p><div class="opts" role="group" aria-label="Your response">${opts}</div>${d.event ? '' : '<p class="cap">Choose one response before you close the quarter.</p>'}</section>`;
  }

  /* ---------- Hiring ---------- */
  function lastAcc(g) { const L = [...g.H].reverse().find(h => h.offers > 0); return L ? L.accepted / L.offers : null; }
  function offersHint(g) {
    const d = g.draft, q = g.q, acc = E.accRate(g), la = lastAcc(g);
    const when = q + 3 > E.N_Q ? 'They would not bill before the run ends, but they are your pipeline for the next upturn.' : `They would join in ${QL(q + 2)} and bill from ${QL(q + 3)}.`;
    if (g.board < 30) return 'No offers can go out this quarter: the board has frozen hiring.';
    if (lvl(g) < 2) return `About ${pct(acc)} accept now, so about <strong>${ppl(d.offers * acc)}</strong> would join. ${when}`;
    return `${la != null ? `Your last batch: ${pct(la)} accepted. ` : ''}${when}`;
  }
  function latHint(g) {
    const d = g.draft, h = E.heatOf(g.q), fill = E.latFill(g, d.prem);
    const fee = (d.latM * fill * 3 + d.latS * fill * 6) / 1000 / E.fxIdx(Math.max(1, g.q - 1));
    if (g.board < 30 || g.fx.freezeTo >= g.q) return 'Lateral hiring is frozen this quarter.';
    if (lvl(g) < 2) return `Switchers expect about ${pct(E.mprem(h))}. At ${pct(d.prem)} about <strong>${pct(fill)}</strong> of the roles would fill: ${ppl(d.latM * fill)} mid-level and ${ppl(d.latS * fill)} senior people, with about ${m(fee)} in recruiter fees.`;
    return `Switchers are getting raises of about ${pct(E.mprem(h))}. Roles you cannot fill cost nothing but stay empty.`;
  }
  function hiringSheet(g) {
    const d = g.draft, q = g.q, due = E.pipeDue(g, q), frozen = g.fx.freezeTo >= q, bf = g.board < 30;
    let h = '';
    if (bf) h += UI.warn([{ t: 'bad', m: 'The board has frozen all hiring this quarter because its confidence has fallen below 30. No offers or lateral hires will go out.' }]);
    else if (frozen) h += UI.warn([{ t: 'warn', m: 'Lateral hiring is frozen this quarter, as you decided earlier.' }]);
    h += UI.field('Campus offers to make', UI.num('offers', d.offers, { min: 0, max: 12000, step: 250, label: 'Campus offers to make', disabled: bf, wide: true }), offersHint(g), 'pl-offers');
    if (due > 0.5) h += UI.chips('onboard', `${ppl(due)} graduates are due to join this quarter`, [{ v: 'onboard', t: 'Onboard as planned', s: 'they train this quarter' }, { v: 'defer', t: 'Defer by a quarter', s: 'about 15% give up; campuses notice' }], d.onboard);
    else h += `<p class="cap">No graduate batch is due to join this quarter.${E.pipeTotal(g) > 0.5 ? ` ${ppl(E.pipeTotal(g))} are waiting to join later.` : ''}</p>`;
    h += `<div class="pgrid">${fieldBox('Experienced mid-level hires', UI.num('latM', d.latM, { min: 0, max: 6000, step: 100, label: 'Experienced mid-level hires', disabled: bf || frozen }))}${fieldBox('Experienced senior hires', UI.num('latS', d.latS, { min: 0, max: 2500, step: 50, label: 'Experienced senior hires', disabled: bf || frozen }))}</div>`;
    h += UI.slider('prem', 'Premium over their current pay', Math.round(d.prem * 100), 0, 60, 1, v => `${v}%`, latHint(g));
    return UI.sheet(`Hiring · ${QL(q)}`, 'Graduates and experienced hires', `<div class="fields">${h}</div><p class="cap">Experienced hires all bring digital skills and start billing at once. Graduates come in with a mix of skills set by your training programme.</p>`);
  }

  /* ---------- Pay ---------- */
  function payroll(g) { return sum(E.cells(g).map(x => x.c.h * x.c.pay)) / 4 / 1000 / E.fxIdx(Math.max(1, g.q - 1)); }
  function digPayroll(g) { return sum(E.BANDS.map(b => g.w[b].dig.h * g.w[b].dig.pay)) / 4 / 1000 / E.fxIdx(Math.max(1, g.q - 1)); }
  function incHint(g) {
    const d = g.draft, r = E.avgRatio(g), infl = E.marketInfl(g);
    const after = r * (1 + d.inc) / (1 + infl);
    const cost = payroll(g) * d.inc;
    if (lvl(g) < 2) return `Market pay is rising about ${pct(infl, 1)} this quarter. At ${pct(d.inc, 1)} your pay would end the quarter about <strong>${ratioTxt(after)}</strong> the market, for about ${m(cost)} more a quarter.`;
    return `At ${pct(d.inc, 1)} the pay bill rises about ${m(cost)} a quarter.`;
  }
  function digHint(g) {
    const d = g.draft, share = E.digShare(g), r = sum(E.BANDS.map(b => g.w[b].dig.h * E.payRatio(g, b, 'dig'))) / Math.max(1, sum(E.BANDS.map(b => g.w[b].dig.h)));
    return `${pct(share)} of your people have digital skills; their pay is ${ratioTxt(r)} their market.${d.digHike > 0 ? ` This rise costs about ${m(digPayroll(g) * d.digHike)} a quarter.` : ''}`;
  }
  function payoutHint(g) {
    const d = g.draft, save = payroll(g) * 0.1 * (1 - d.payout);
    return d.payout >= 1 ? 'Variable pay is a tenth of fixed pay. Paying it in full keeps trust.' : `Saves about ${m(save)} this quarter. People notice a cut in variable pay more than the money suggests.`;
  }
  function paySheet(g) {
    const d = g.draft, q = g.q, inc = E.isInc(q), r = E.avgRatio(g);
    const next = [1, 5, 9].find(x => x > q);
    let h = `<p class="case">Your fixed pay is <strong>${ratioTxt(r)}</strong> the market on average: juniors ${ratioTxt(E.avgPay(g, 'J'))}, mid-level ${ratioTxt(E.avgPay(g, 'M'))} and seniors ${ratioTxt(E.avgPay(g, 'S'))}.</p>`;
    if (inc) h += UI.slider('inc', g.fx.deferIncTo >= q ? 'Annual increment for everyone (deferred: paid two quarters late)' : 'Annual increment for everyone', Math.round(d.inc * 1000) / 10, 0, 20, 0.5, v => `${N.num(v, 1)}%`, incHint(g));
    else h += `<p class="cap">The annual increment is set in quarter 1 of each year${next ? `; the next one is in ${QL(next)}` : ', and there are no more in this run'}.</p>`;
    h += UI.slider('digHike', 'Extra rise for digital skills this quarter', Math.round(d.digHike * 1000) / 10, 0, 20, 0.5, v => `${N.num(v, 1)}%`, digHint(g));
    h += UI.slider('payout', 'Variable pay paid out', Math.round(d.payout * 100), 50, 100, 5, v => `${v}%`, payoutHint(g));
    return UI.sheet(`Pay · ${QL(q)}`, 'Increments, skill premiums and variable pay', `<div class="fields">${h}</div>`);
  }

  /* ---------- Careers and training ---------- */
  function readiness(g) { const d = g.draft, w = E.WORK[d.work] || E.WORK.hybrid; const r = E.LD[d.ld].ready + w.ready; return { J: 0.12 + r, M: 0.08 + r / 2 }; }
  function prJHint(g) {
    const d = g.draft, rd = readiness(g);
    if (lvl(g) < 2) return `About ${pct(rd.J)} of juniors are ready each year with this training and work model.${d.prJ > rd.J + 0.005 ? ' <strong class="down">Promoting more than that hurts delivery and cheapens titles.</strong>' : ''}`;
    return 'Promotion keeps ambitious people, but promoting people before they are ready hurts delivery.';
  }
  function prMHint(g) {
    const d = g.draft, rd = readiness(g);
    if (lvl(g) < 2) return `About ${pct(rd.M)} of mid-level staff are ready each year.${d.prM > rd.M + 0.005 ? ' <strong class="down">You are promoting more than are ready.</strong>' : ''}`;
    return 'Each promotion comes with a raise of about a quarter.';
  }
  function careersSheet(g) {
    const d = g.draft, q = g.q;
    const ld = UI.chips('ld', 'Training programme', Object.keys(E.LD).map(k => { const L = E.LD[k]; return { v: k, t: L.t, s: `$${Math.round(L.cost * 1000)} a head a quarter · reskills ${pct(L.rs, 1)} a quarter` }; }), d.ld);
    let h = UI.slider('prJ', 'Juniors promoted to mid-level, a year', Math.round(d.prJ * 100), 4, 35, 1, v => `${v}%`, prJHint(g));
    h += UI.slider('prM', 'Mid-level promoted to senior, a year', Math.round(d.prM * 100), 2, 20, 1, v => `${v}%`, prMHint(g));
    h += ld;
    return UI.sheet(`Careers · ${QL(q)}`, 'Promotions and training', `<div class="fields">${h}</div><p class="cap">Training also sets how many new graduates arrive with digital skills (50%, 60% or 75%) and how fast traditional staff move into digital work.</p>`);
  }

  /* ---------- Workplace ---------- */
  function subHint(g) {
    const h = E.heatOf(g.q), avail = clamp(1.25 - 0.25 * h, 0.6, 1);
    return `Subcontractors fill work you cannot staff, at thinner margins, and clients rate them lower.${lvl(g) < 2 ? ` In this market about ${pct(avail)} of the gap can be filled.` : ''}${g.fx.subcapTo >= g.q ? ' <strong>You have capped subcontracting at a quarter of the gap.</strong>' : ''}`;
  }
  function exitHint(g) {
    const d = g.draft, n = E.headcount(g) * d.exits;
    return d.exits > 0 ? `About ${ppl(n)} people would leave, with severance of about three months’ pay. Fear spreads: engagement and your brand fall.` : 'Letting low performers go trims cost, at a price in engagement and reputation.';
  }
  function workplaceSheet(g) {
    const d = g.draft, q = g.q, ev = E.eventOf(g);
    const locked = ev && ev.id === 'rto' && d.event;
    const wopts = [{ v: 'remote', t: 'Remote-first', s: 'people stay; learning slower; clients feel distant' }, { v: 'hybrid', t: 'Hybrid', s: 'the middle path' }, { v: 'office', t: 'Office', s: 'faster learning, closer clients; some quit' }].map(o => Object.assign(o, { disabled: !!locked && o.v !== d.work }));
    let h = UI.chips('work', 'Work model', wopts, d.work);
    if (locked) h += '<p class="cap">Set this quarter by your answer to the chief executive.</p>';
    h += UI.chips('sub', 'Fill unstaffed work with subcontractors', [{ v: 0, t: 'None' }, { v: 0.25, t: 'A quarter' }, { v: 0.5, t: 'Half' }, { v: 0.75, t: 'Three-quarters' }, { v: 1, t: 'All we can' }], d.sub);
    h += `<div class="hint" data-live="pl-sub">${subHint(g)}</div>`;
    h += UI.slider('exits', 'Performance-based exits this quarter', Math.round(d.exits * 1000) / 10, 0, 5, 0.5, v => `${N.num(v, 1)}%`, exitHint(g));
    return UI.sheet(`Workplace · ${QL(q)}`, 'How people work, and the gaps', `<div class="fields">${h}</div>`);
  }

  /* ---------- Preview and submit ---------- */
  function previewHtml(g) {
    if (lvl(g) === 2 || done(g)) return '';
    let P = null;
    try { P = E.preview(g, g.draft); } catch (e) { P = null; }
    if (!P) return '';
    const hc0 = E.headcount(g), ev = E.eventOf(g);
    const items = [
      { k: 'Headcount at the end', v: kp(P.hc), d: `${sgnPts(P.hc - hc0)} people`, cls: P.hc < hc0 ? 'down' : '' },
      { k: 'Leaving, a year at this pace', v: pct1(P.ann), d: `about ${ppl(P.leavers)} this quarter`, cls: P.ann > 0.18 ? 'down' : '' },
      { k: 'Utilisation', v: pct(P.util), d: `bench ${pct(P.bench)}`, cls: P.util > 0.9 || P.util < 0.8 ? 'down' : '' },
      { k: 'Work left unstaffed', v: kp(P.unmet), d: `of ${kp(P.D)} demanded`, cls: P.unmet > 0.03 * P.D ? 'down' : '' }
    ];
    if (lvl(g) === 0) items.push({ k: 'Revenue', v: m(P.revenue), d: 'this quarter' }, { k: 'Operating margin', v: pct1(P.margin), d: 'benchmark 22.5%', cls: P.margin < 0.2 ? 'down' : '' }, { k: 'Engagement', v: String(Math.round(P.E)), d: `${sgnPts(P.E - g.E)} on now`, cls: P.E < g.E ? 'down' : '' }, { k: 'Board confidence', v: String(Math.round(P.board)), d: `${sgnPts(P.board - g.board)} on now`, cls: P.board < 30 ? 'down' : '' });
    return `${UI.kpis(items)}<p class="cap">An estimate at the forecast’s middle demand${ev && !g.draft.event ? `, assuming option ${'ABC'[ev.opts.length - 1]} on the dilemma until you choose` : ''}. The real quarter will differ.</p>`;
  }
  function previewSheet(g) {
    if (lvl(g) === 2) return '';
    return UI.sheet('Preview', lvl(g) === 0 ? 'Where this quarter is heading' : 'People this quarter', `<div data-live="pl-prev">${previewHtml(g)}</div>`);
  }
  function resultBanner(g) {
    const L = last(g); if (!L || done(g)) return '';
    const P = g.H.length > 1 ? g.H[g.H.length - 2] : null;
    const prev = k => (P ? P[k] : START[k]);
    const parts = [`Clients wanted work for <strong>${kp(L.D)}</strong> people; you staffed <strong>${kp(L.billable)}</strong>${L.subs > 50 ? ` and subcontracted ${kp(L.subs)}` : ''}${L.unmet > 50 ? `, and <strong class="down">${kp(L.unmet)}</strong> went unstaffed` : ''}.`];
    parts.push(`Utilisation was ${pct(L.util)}. ${ppl(L.leavers)} people left (${pct1(L.ann)} a year at that pace) and ${ppl(L.joined)} graduates joined${L.latM + L.latS > 0.5 ? `, with ${ppl(L.latM + L.latS)} experienced hires` : ''}.`);
    parts.push(`Revenue ${m(L.revenue)}, operating margin <strong>${pct1(L.margin)}</strong>.`);
    if (L.boardFreeze) parts.push('<strong class="down">The board froze hiring this quarter.</strong>');
    if (L.lostClients > 0.001) parts.push(`<strong class="down">Clients moved about ${pct(L.lostClients, 1)} of future demand to rivals because work went unstaffed.</strong>`);
    (L.notes || []).forEach(n => parts.push(`${esc(n.charAt(0).toUpperCase() + n.slice(1))}.`));
    const pill = (k, key) => { const dv = L[key] - prev(key); return UI.pill(`${k} ${Math.round(L[key])} (${sgnPts(dv)})`, dv >= 0.5 ? 'good' : dv <= -0.5 ? 'warn' : 'neutral'); };
    return `<section class="sheet result"><span class="eyebrow">${QLc(L.q)} results</span><p class="case">${parts.join(' ')}</p><div class="deltas">${pill('Engagement', 'E')}${pill('Brand', 'B')}${pill('Clients', 'csat')}${pill('Board', 'board')}</div></section>`;
  }
  function quarterView(g, ctx) {
    let h = '';
    if (g.q === 1) h += caseBrief(g, !ctx.ui.seenBrief);
    h += marketSheet(g) + eventSheet(g) + hiringSheet(g) + paySheet(g) + careersSheet(g) + workplaceSheet(g) + previewSheet(g) + pulseSheet(g);
    h += `<section class="sheet result submit"><div class="actions"><button type="button" class="btn btn-primary btn-block" data-act="m" data-op="submit">${g.q === E.N_Q ? 'Close the final quarter' : `Close ${QL(g.q)}`}</button></div><p class="cap">The quarter then plays out: demand, joiners, leavers and results. Decisions cannot be undone.</p></section>`;
    return h;
  }

  /* ---------- Workforce tab ---------- */
  function workforceView(g) {
    const d = g.draft, L = last(g), showAtt = lvl(g) < 2 && !done(g);
    const rows = [];
    E.BANDS.forEach(b => E.KS.forEach(k => { const c = g.w[b][k]; rows.push([`${E.BN[b]} · ${SKILL[k]}`, ppl(c.h), ratioTxt(E.payRatio(g, b, k)), showAtt ? pct1(E.annAttr(g, b, k, d)) : '–']); }));
    rows.push({ cls: 'tot', cells: ['All staff', ppl(E.headcount(g)), ratioTxt(E.avgRatio(g)), showAtt ? pct1(E.previewAttr(g, d)) : '–'] });
    let h = UI.sheet('Workforce', 'Who works here', UI.table(['Group', 'People', 'Pay against market', 'Leaving a year*'], rows, { sticky: true }) + `<p class="cap">Juniors have 0–3 years’ experience, mid-level 3–6 and seniors more. ${showAtt ? '*At this quarter’s settings, before the dilemma’s effects.' : '*Not shown at this level or after the run.'} ${kp(g.T)} graduates are in training.</p>`);
    const pipe = g.pipe.filter(p => p.n > 0.5).sort((a, b) => a.due - b.due);
    h += UI.sheet('Pipeline', 'Graduates who have accepted and not yet joined', pipe.length ? UI.table(['Due to join', 'Graduates', 'Offered'], pipe.map(p => [p.due > E.N_Q ? 'after the run' : QLc(p.due), ppl(p.n), p.q ? QLc(p.q) : 'before you started']), { sticky: true }) + '<p class="cap">Each quarter some accepted graduates take other offers before they join, more when the market is hot.</p>' : '<p class="case">Nobody is waiting to join.</p>');
    if (g.H.length) {
      const H = g.H;
      h += UI.sheet('Pyramid', 'Headcount by level', UI.chart('pl-pyr', () => ({ series: [{ values: H.map(x => x.J), c: 'var(--s1)', w: 2.2 }, { values: H.map(x => x.M), c: 'var(--s2)', w: 2.2 }, { values: H.map(x => x.S), c: 'var(--s3)', w: 2.2 }, { values: H.map(x => x.T), c: 'var(--ink-3)', w: 1.4, dash: true }], xLabel: i => ql(H[i].q), yMin: 0, yFmt: v => kp(v) }), 210, [{ t: 'Juniors', c: 'var(--s1)' }, { t: 'Mid-level', c: 'var(--s2)' }, { t: 'Seniors', c: 'var(--s3)' }, { t: 'In training', c: 'var(--ink-3)' }], 'Headcount by level each quarter') + UI.table(['Quarter', 'Digital share of staff', 'Digital share of demand'], H.map(x => [ql(x.q), pct(x.dig), pct(x.digD)]), { sticky: true }));
      const why = L.why, labels = { pay: 'Pay', growth: 'Career growth', manager: 'Their manager', flexibility: 'Flexibility', workload: 'Workload', onsite: 'Onsite and abroad' };
      h += UI.sheet('Exit interviews', `Why people left in ${QL(L.q)}`, `<div class="meters">${Object.keys(labels).sort((a, b) => why[b] - why[a]).map(k => UI.meter(labels[k], why[k] / 0.5, pct(why[k]), why[k] > 0.3 ? 'warn' : '')).join('')}</div><p class="cap">Share of leavers giving each main reason.</p>`);
    }
    return h;
  }

  /* ---------- Talent market tab ---------- */
  function talentView(g) {
    const legend = [{ t: 'You', c: 'var(--c-you)' }, { t: 'Peer A', c: 'var(--c-b)' }, { t: 'Peer B', c: 'var(--c-c)' }];
    let h = UI.sheet('Attrition', 'You against the two peers', UI.chart('pl-att2', () => attSpec(g, done(g)), 230, legend, 'Attrition over the last twelve months for you and the peers'));
    const n = done(g) ? E.N_Q : g.q - 1;
    const rows = [];
    for (let q = 1; q <= n; q++) { const H = g.H[q - 1]; rows.push([ql(q), pct1(H.ltm), pct1(PD.REAL.tcs[q - 1] / 100), pct1(PD.REAL.infy[q - 1] / 100), pct(E.mprem(H.heat)), `₹${N.num(H.inr, 1)}`]); }
    h += UI.sheet('By quarter', 'Attrition, switchers’ raises and the rupee', rows.length ? UI.table(['Quarter', 'You', 'Peer A', 'Peer B', 'Switcher raise', 'Rupee per $'], rows, { sticky: true }) + '<p class="cap">Peer figures are each company’s reported attrition over the last twelve months.</p>' : '<p class="case">The table fills in as quarters close.</p>');
    if (g.H.length) {
      const H = g.H;
      h += UI.sheet('Market pay', 'How fast pay for people like yours is moving', UI.chart('pl-mkt', () => ({ series: [{ values: [1].concat(H.map(x => x.mktIdx)), c: 'var(--s2)', w: 2.2 }, { values: [1].concat(H.map(x => x.ratio * x.mktIdx)), c: 'var(--c-you)', w: 2.2 }], xLabel: i => (i === 0 ? 'Start' : ql(H[i - 1].q)), yFmt: v => N.num(v, 2) }), 200, [{ t: 'Market pay index', c: 'var(--s2)' }, { t: 'Your pay index', c: 'var(--c-you)' }], 'Market pay and your pay, indexed to the start') + '<p class="cap">Both indexed to 1.00 at the start, weighted by your current workforce.</p>');
    }
    return h;
  }

  /* ---------- Results tab ---------- */
  function resultsView(g) {
    const H = g.H; if (!H.length) return UI.sheet('Results', 'No results yet', '<p class="case">The quarterly accounts appear after your first quarter.</p>');
    const row = (k, f, cls) => ({ cls: cls || '', cells: [k].concat(H.map(f)) });
    const rows = [
      row('Client demand (people)', h => kp(h.D)), row('Billable people', h => kp(h.billable)), row('Subcontracted', h => kp(h.subs)), row('Unstaffed', h => (h.unmet > 50 ? `<span class="down">${kp(h.unmet)}</span>` : kp(h.unmet))), row('Utilisation', h => pct(h.util)),
      row('Revenue', h => m(h.revenue), 'sep'), row('Fixed pay', h => m(h.payroll)), row('Variable pay', h => m(h.varPay)), row('Trainees', h => m(h.trainee)), row('Recruiter fees', h => m(h.hiring)), row('Training', h => m(h.ldCost)), row('Subcontractors', h => m(h.subCost)), row('Other costs', h => m(h.other)), row('One-off costs', h => m(h.oneOff + h.severance)),
      row('Operating profit', h => `<span class="${h.profit < 0 ? 'down' : ''}">${m(h.profit)}</span>`, 'tot'), row('Operating margin', h => `<span class="${h.margin < 0.2 ? 'down' : ''}">${pct1(h.margin)}</span>`),
      row('Headcount', h => kp(h.hc), 'sep'), row('Graduates joined', h => ppl(h.joined)), row('Experienced hires', h => ppl(h.latM + h.latS)), row('Leavers', h => ppl(h.leavers)), row('Attrition (12 months)', h => pct1(h.ltm))
    ];
    let h = UI.sheet('Results', 'Quarterly accounts', UI.table([''].concat(H.map(x => ql(x.q))), rows, { sticky: true, cls: 'stmt' }) + '<p class="cap">$ millions a quarter. Pay and most overheads are paid in rupees and shown at each quarter’s exchange rate.</p>');
    h += `<div class="pgrid2">${UI.sheet('Margin', 'Operating margin by quarter', UI.chart('pl-mg', () => ({ series: [{ values: H.map(x => x.margin), c: 'var(--c-you)', w: 2.4, dots: true }], refs: [{ y: 0.225, label: 'Benchmark 22.5%' }], xLabel: i => ql(H[i].q), yMin: 0, yFmt: v => Math.round(v * 100) + '%' }), 190, null, 'Operating margin by quarter'))}${UI.sheet('Utilisation', 'Billable share of your people', UI.chart('pl-ut', () => ({ series: [{ values: H.map(x => x.util), c: 'var(--s2)', w: 2.4, dots: true }], refs: [{ y: 0.84, label: 'Healthy 84%' }], xLabel: i => ql(H[i].q), yMin: 0.6, yMax: 1, yFmt: v => Math.round(v * 100) + '%' }), 190, null, 'Utilisation by quarter'))}</div>`;
    h += UI.sheet('Pulse', 'Engagement, brand, clients and board', UI.chart('pl-pulse', () => ({ series: [{ values: [START.E].concat(H.map(x => x.E)), c: 'var(--c-you)', w: 2.2 }, { values: [START.B].concat(H.map(x => x.B)), c: 'var(--c-b)', w: 1.8 }, { values: [START.csat].concat(H.map(x => x.csat)), c: 'var(--c-c)', w: 1.8 }, { values: [START.board].concat(H.map(x => x.board)), c: 'var(--c-d)', w: 1.8 }], refs: [{ y: 30, label: 'Board freezes hiring below 30', c: 'var(--bad)' }], xLabel: i => (i === 0 ? 'Start' : ql(H[i - 1].q)), yMin: 0, yMax: 100 }), 220, [{ t: 'Engagement', c: 'var(--c-you)' }, { t: 'Employer brand', c: 'var(--c-b)' }, { t: 'Client satisfaction', c: 'var(--c-c)' }, { t: 'Board confidence', c: 'var(--c-d)' }], 'Engagement, brand, client satisfaction and board confidence'));
    return h;
  }

  /* ---------- Guide ---------- */
  function guideView() {
    return UI.sheet('Guide', 'Workforce planning in brief', `<div class="case"><p><strong>Attrition.</strong> Leavers over the last twelve months divided by average headcount. Because it looks back a year, it rises slowly and falls slowly: a bad quarter stays in the figure for four.</p><p><strong>The pipeline.</strong> An offer made today joins two quarters later, trains for one, and only then bills. Some accepted graduates renege, more in a hot market. Graduates offered at the top of a boom arrive as it ends.</p><p><strong>Utilisation and the bench.</strong> Billable people divided by all people. Around 84–86% is healthy. Above about 87% people burn out, quality slips and more of them leave; well below 80% the unbilled bench eats the margin.</p><p><strong>Graduates or experienced hires.</strong> A graduate costs a fraction of an experienced hire and, with training, grows into the work. An experienced hire bills at once but wants a premium, a recruiter takes a fee, and paying newcomers more than loyal staff hurts engagement.</p><p><strong>Pay.</strong> The annual increment keeps everyone level with the market. A targeted rise for digital skills costs less and goes where attrition is highest. Cutting variable pay saves money once and costs trust for longer.</p><p><strong>Promotions and training.</strong> Promotion is the cheapest retention tool until you promote people who are not ready: then delivery suffers and titles lose their value. Training sets how many people are ready and moves traditional staff into digital work.</p><p><strong>Unstaffed work.</strong> Subcontractors can fill some of it at a thinner margin. Work nobody staffs for long goes to rivals, and those clients do not come back.</p><p><strong>Currency.</strong> Revenue is in dollars and costs mostly in rupees, so a weaker rupee lifts dollar margins.</p></div>`) +
      UI.sheet('Scoring', 'How your run is graded', UI.table(['Part', 'Weight', 'What counts'], [['Operating margin', '25%', 'Average over twelve quarters against a 22.5% benchmark'], ['Client demand served', '20%', 'Revenue earned against what the market would have bought from a firm your size'], ['Attrition against peers', '15%', 'Your average attrition against the two peers’ real average'], ['Engagement', '15%', 'Average over the run'], ['Employer brand', '10%', 'At the end, less a penalty for withdrawn offers'], ['Workforce health', '15%', 'How close utilisation stays to 84%, less a penalty for people let go']], { cls: 'wrap' }));
  }

  /* ---------- Debrief ---------- */
  function revealBody(g) {
    const st = PD.STORY, R = PD.REAL;
    const rows = g.H.map((H, i) => [`${ql(H.q)} · <strong>${R.label[i]}</strong>`, pct1(R.tcs[i] / 100), pct1(R.infy[i] / 100), pct1(H.ltm)]);
    const evs = PD.EVENTS.map((ev, i) => { const log = g.eventLog.find(x => x.id === ev.id), opt = log ? ev.opts.find(o => o.v === log.choice) : null; return `<li><strong>${ql(i + 1)} · ${R.label[i]} · ${esc(ev.title)}.</strong> You chose: ${opt ? esc(opt.t) : '–'}. <em>What happened:</em> ${esc(ev.real || '')}</li>`; }).join('');
    return `<p class="rv-name">${esc(st.title)}</p><p class="rv-meta">${esc(st.years)} · Peer A was TCS and Peer B was Infosys</p><p class="case">${esc(st.lede)}</p><ul class="steps">${st.events.map(e => `<li>${esc(e)}</li>`).join('')}</ul>${UI.chart('pl-real', () => { const sp = attSpec(g, true); sp.xLabel = i => (i === 0 ? 'FY21 Q4' : R.label[i - 1]); return sp; }, 220, [{ t: 'You', c: 'var(--c-you)' }, { t: 'TCS', c: 'var(--c-b)' }, { t: 'Infosys', c: 'var(--c-c)' }], 'Your attrition against TCS and Infosys')}${UI.table(['Quarter', 'TCS', 'Infosys', 'You'], rows, { sticky: true })}<p class="case"><strong>Your twelve dilemmas, and what really happened.</strong></p><ul class="steps">${evs}</ul><p class="case"><strong>The lesson.</strong> ${esc(st.lesson)}</p><p class="case">The rupee also weakened from about ₹74 to about ₹83 to the dollar over the three years, which cushioned dollar margins for every Indian IT firm.</p><p class="rv-src">Sources: ${esc(st.sources)} ${FIRM}, its pay, clients and results are invented for the simulation; the peers’ attrition, the rupee and the shape of the cycle are real.</p>`;
  }
  function coach(g, sc) {
    const H = g.H, n = [];
    const peak = H.reduce((a, b) => (b.ltm > a.ltm ? b : a));
    n.push(`Your attrition peaked at ${pct1(peak.ltm)} in ${QL(peak.q)}, against peaks of ${pct1(PEAK_A)} at Peer A and ${pct1(PEAK_B)} at Peer B.`);
    const benchMax = H.reduce((a, b) => (b.bench > a.bench ? b : a)), lateOffers = sum(H.filter(h => h.q >= 4 && h.q <= 6).map(h => h.offers));
    if (benchMax.bench > 0.16) n.push(`Your bench reached ${pct(benchMax.bench)} in ${QL(benchMax.q)}.${lateOffers > 0 ? ` You made ${ppl(lateOffers)} graduate offers from ${QL(4)} to ${QL(6)}, and they joined as demand fell.` : ''}`);
    const unmet = sum(H.map(h => h.unmet)) / Math.max(1, sum(H.map(h => h.D)));
    if (unmet > 0.03) n.push(`On average ${pct(unmet)} of client demand went unstaffed${g.dmult < 0.995 ? `, and clients moved work to rivals for good: your demand ended ${pct(1 - g.dmult)} below where it could have been` : ''}.`);
    const lat = sum(H.map(h => h.latM + h.latS)), fees = sum(H.map(h => h.hiring));
    if (lat > 0.5) n.push(`You hired ${ppl(lat)} experienced people and paid ${m(fees)} in recruiter fees, on top of their premiums.`);
    const prom = avg(H.map(h => h.prJ));
    if (prom > 0.2) n.push(`You promoted ${pct(prom)} of juniors a year on average. Above readiness, that hurt delivery and client satisfaction.`);
    if (g.revoked > 0.5) n.push(`You withdrew ${ppl(g.revoked)} offers. Campuses remember: your employer brand ended at ${Math.round(g.B)}.`);
    if (g.exitsTotal > 0.5) n.push(`${ppl(g.exitsTotal)} people were let go in exits you chose.`);
    n.push(`Your operating margin averaged ${pct1(sc.m)} against the 22.5% benchmark.`);
    return n.slice(0, 6);
  }
  function debriefView(g) {
    const sc = E.score(g), legend = [{ t: 'You', c: 'var(--c-you)' }, { t: 'Peer A', c: 'var(--c-b)' }, { t: 'Peer B', c: 'var(--c-c)' }];
    let h = `<section class="sheet result"><span class="eyebrow">Debrief · People Lab · ${FIRM}</span><div class="grade"><span class="letter">${S.grade(sc.total)}</span><div><h2>${S.gradeWord(sc.total)}</h2><span class="num">${sc.total} / 100</span></div></div><p class="case">Your attrition averaged ${pct1(sc.att)} against ${pct1(sc.peer)} for the two peers, your margin ${pct1(sc.m)}, and you served ${pct(sc.share)} of the work clients would have bought.</p><div class="sparts">${sc.parts.map(p => `${UI.meter(`${p.k} <span class="cap">${p.w}%</span>`, p.v / 100, String(p.v), p.v >= 70 ? 'good' : p.v >= 50 ? '' : 'warn')}<p class="cap sp-d">${esc(p.d)}</p>`).join('')}</div></section>`;
    h += UI.reveal('Which talent market did you just face?', revealBody(g), false);
    h += UI.sheet('Attrition', 'You against Peer A and Peer B', UI.chart('pl-att3', () => attSpec(g, true), 230, legend, 'Attrition over the run for you and the peers'));
    const H = g.H;
    h += UI.sheet('Capacity', 'People against client demand', UI.chart('pl-cap', () => ({ series: [{ values: H.map(x => need(x.D0)), c: 'var(--s1)', w: 2, dash: true }, { values: H.map(x => need(x.D)), c: 'var(--s2)', w: 2 }, { values: H.map(x => x.hc), c: 'var(--c-you)', w: 2.6 }], xLabel: i => ql(H[i].q), yMin: 0, yFmt: v => kp(v) }), 220, [{ t: 'People needed for the whole market’s demand', c: 'var(--s1)' }, { t: 'People needed for the demand you kept', c: 'var(--s2)' }, { t: 'Your headcount', c: 'var(--c-you)' }], 'Headcount against demand') + '<p class="cap">People needed at a healthy 86% utilisation.</p>');
    h += UI.sheet('Coach’s notes', 'What to take away', `<ul class="notes plain">${coach(g, sc).map(t => `<li>${t}</li>`).join('')}</ul>`);
    h += `<div class="actions">${UI.btn('Replay this run', 'retry-run', 'btn-primary', `data-id="${esc(S.App.cur ? S.App.cur.meta.id : '')}"`)}${UI.btn('Back to home', 'leave-run', 'btn-ghost')}</div>`;
    return h;
  }

  /* ---------- Module ---------- */
  function live(g, ctx) {
    if (done(g) || uiStr(ctx, 'tab', 'q') !== 'q') return {};
    const out = { 'pl-offers': offersHint(g), 'prem-hint': latHint(g), 'digHike-hint': digHint(g), 'payout-hint': payoutHint(g), 'prJ-hint': prJHint(g), 'prM-hint': prMHint(g), 'pl-sub': subHint(g), 'exits-hint': exitHint(g), 'pl-prev': previewHtml(g) };
    if (E.isInc(g.q)) out['inc-hint'] = incHint(g);
    if (lvl(g) === 0) out['pl-coach'] = coachLine(g);
    return out;
  }
  S.App.register({
    id: 'people', cat: 'people', title: 'People Lab', area: 'Human resources', length: '12 quarters · 40–60 min', depth: 'Full simulation', version: 1, persist: 'replay', wide: true,
    practises: 'HR management and organisational behaviour courses · workforce planning · pay and retention · talent management',
    blurb: 'Run HR for a 100,000-person IT services firm through three years of a real talent war and its hangover. Plan graduate and experienced hiring around a slow pipeline, set pay and promotions, handle twelve live dilemmas, and measure your attrition against two real rivals.',
    detail: '<p>Twelve quarters with a workforce in three levels and two skill sets. Campus offers that join two quarters later and train for one, reneging in hot markets, experienced hires whose fill rate depends on the premium you pay, annual increments, targeted rises for digital skills, variable pay, promotions limited by readiness, three training programmes, remote, hybrid or office work, subcontractors and performance exits.</p><p>Client demand, the switchers’ premium and wage inflation follow the real cycle; the two peers’ attrition is what they actually reported. Each quarter brings a dilemma from that cycle: counter-offers, a second pay rise, burnout, team lift-outs, moonlighting, graduates waiting to join, deferred increments and a return to the office. The debrief reveals the market, the companies and the years, and sets each of your choices beside what really happened.</p>',
    options: [{ id: 'difficulty', label: 'Difficulty', default: 'guided', choices: [{ v: 'guided', t: 'Foundation', s: 'Tight forecasts, a live preview of the quarter and coaching' }, { v: 'standard', t: 'Intermediate', s: 'Wider forecasts; preview of people numbers only' }, { v: 'expert', t: 'Advanced', s: 'Wide forecasts and no preview: only what an HR head would see' }] }],
    create: (seed, config) => E.create(seed, config),
    apply: (g, d) => E.apply(g, d),
    isDone: g => E.isDone(g),
    progress: g => (done(g) ? 'Complete' : `Quarter ${g.q} of ${E.N_Q}`),
    view(g, ctx) {
      const d = done(g);
      let tab = uiStr(ctx, 'tab', d ? 'debrief' : 'q');
      if (d && tab === 'q') tab = 'debrief';
      if (!d && tab === 'debrief') tab = 'q';
      ctx.ui.tab = tab;
      let h = header(g);
      h += UI.tabs('tab', [{ v: d ? 'debrief' : 'q', t: d ? 'Debrief' : `Quarter ${g.q}` }, { v: 'people', t: 'Workforce' }, { v: 'market', t: 'Talent market' }, { v: 'results', t: 'Results' }, { v: 'guide', t: 'Guide' }], tab, 'main-tabs', true);
      if (tab === 'q') h += resultBanner(g) + quarterView(g, ctx);
      else if (tab === 'people') h += workforceView(g);
      else if (tab === 'market') h += talentView(g);
      else if (tab === 'results') h += resultsView(g);
      else if (tab === 'guide') h += guideView(g);
      else h += debriefView(g);
      return h;
    },
    live,
    onTab(g, group, value, ctx) { if (group === 'tab') ctx.ui.seenBrief = true; },
    field(g, name, value) {
      const d = g.draft; if (!d) return null;
      const v = +value;
      switch (name) {
        case 'offers': d.offers = clamp(Math.round(v || 0), 0, 12000); break;
        case 'latM': d.latM = clamp(Math.round(v || 0), 0, 6000); break;
        case 'latS': d.latS = clamp(Math.round(v || 0), 0, 2500); break;
        case 'prem': d.prem = clamp((v || 0) / 100, 0, 0.6); break;
        case 'inc': d.inc = clamp((v || 0) / 100, 0, 0.2); break;
        case 'digHike': d.digHike = clamp((v || 0) / 100, 0, 0.2); break;
        case 'payout': d.payout = clamp((v || 0) / 100, 0.5, 1); break;
        case 'prJ': d.prJ = clamp((v || 0) / 100, 0.04, 0.35); break;
        case 'prM': d.prM = clamp((v || 0) / 100, 0.02, 0.2); break;
        case 'exits': d.exits = clamp((v || 0) / 100, 0, 0.05); break;
        case 'onboard': d.onboard = value === 'defer' ? 'defer' : 'onboard'; break;
        case 'ld': d.ld = E.LD[value] ? value : 'standard'; break;
        case 'work': d.work = E.WORK[value] ? value : 'hybrid'; break;
        case 'sub': d.sub = clamp(isFinite(v) ? v : 0.5, 0, 1); break;
        default: return null;
      }
      return null;
    },
    act(g, op, el, ctx) {
      const d = g.draft; if (!d) return null;
      if (op === 'event') {
        const ev = E.eventOf(g), o = ev && ev.opts.find(x => x.v === el.dataset.v);
        if (!o) return null;
        d.event = o.v;
        if (o.fx && o.fx.work) d.work = o.fx.work;
        return { rerender: true, draft: true };
      }
      if (op === 'submit') {
        const ev = E.eventOf(g);
        if (ev && !d.event) return { toast: 'Choose your response to this quarter’s dilemma first.', scrollTo: 'pl-ev' };
        ctx.ui.seenBrief = true;
        const lastQ = g.q === E.N_Q;
        return { commit: clone(d), top: true, toast: lastQ ? 'That was the last quarter. Here is your debrief.' : `${QLc(g.q)} closed.` };
      }
      return null;
    },
    summary(g) {
      const sc = E.score(g);
      return { score: sc.total, line: `Attrition ${pct1(sc.att)} vs peers ${pct1(sc.peer)} · margin ${pct1(sc.m)} · demand served ${pct(sc.share)}`, metrics: [{ k: 'Average attrition', v: pct1(sc.att) }, { k: 'Operating margin', v: pct1(sc.m) }] };
    }
  });
})();
