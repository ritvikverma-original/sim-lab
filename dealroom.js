/* Deal Room: interface for the multi-issue negotiation cases. The engine lives in dealroom-engine.js. */
(function () {
  'use strict';
  const S = window.SimLab, D = window.DealRoomEngine;
  if (!S || !D) return;
  const { UI, N, U } = S;
  const esc = U.esc, clamp = U.clamp, sum = U.sum, clone = U.clone;
  const uiStr = (ctx, k, d) => (ctx.ui[k] == null || ctx.ui[k] === '' ? d : ctx.ui[k]);
  const K = g => D.caseOf(g);
  const guided = g => g.cfg.difficulty !== 'expert';
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const chipBtn = (label, attrs, pressed) => `<button type="button" class="chip" data-act="m" ${attrs}${pressed != null ? ` aria-pressed="${pressed}"` : ''}>${label}</button>`;
  const fieldBox = (label, control, liveKey, hint) => `<div class="fbox"><span class="lbl">${label}</span>${control}${liveKey || hint ? `<span class="hint"${liveKey ? ` data-live="${liveKey}"` : ''}>${hint || ''}</span>` : ''}</div>`;
  const fmt = (g, v) => { const k = K(g); return k.unitShort === '$M' ? '$' + N.num(v, 0) + 'M' : k.unitShort === '$k' ? '$' + N.int(v) + 'k' : N.int(v) + ' pts'; };
  const fmtShort = (g, v) => { const k = K(g); return k.unitShort === '$M' ? N.num(v, 0) : N.int(v); };
  const TYPE = { distributive: 'Distributive: what one side gains, the other loses', integrative: 'Integrative: matters more to one side than the other, so it can be traded', compatible: 'Compatible: both sides want the same thing' };
  const TRUST = t => (t >= 75 ? ['Warm', 'good'] : t >= 55 ? ['Good', 'good'] : t >= 40 ? ['Cool', 'neutral'] : t >= 25 ? ['Strained', 'warn'] : ['Hostile', 'bad']);
  const best = g => K(g).issues.map(is => is.you.indexOf(Math.max(...is.you)));
  const valYou = (g, p) => D.ptsYou(K(g), p);
  const planLocked = g => !!g.plan;
  const status = g => (g.done ? (g.outcome && g.outcome.deal ? 'Deal signed' : 'No deal') : g.final ? 'Final offer on the table' : `Round ${g.round} of ${g.rounds}`);

  /* ---------- Header ---------- */
  function header(g, done) {
    const k = K(g), lastThem = g.offersThem.length ? g.offersThem[g.offersThem.length - 1] : null, lastYou = g.offersYou.length ? g.offersYou[g.offersYou.length - 1] : null;
    const tr = TRUST(g.trust);
    const items = [
      { k: 'Their latest offer', v: lastThem ? fmt(g, lastThem.you) : '–', d: 'value to you' },
      { k: 'Your latest offer', v: lastYou ? fmt(g, lastYou.you) : '–', d: 'value to you' },
      { k: 'Your walk-away', v: fmt(g, k.batna.you), d: 'best alternative' }
    ];
    if (done && g.outcome) { const R = D.result(g); items[0] = { k: R.deal ? 'Deal value to you' : 'You take your alternative', v: fmt(g, R.you), d: R.deal ? `${N.sign(R.you - k.batna.you, v => fmt(g, v))} vs walk-away` : '' }; }
    items.push(guided(g) || done ? { k: 'Relationship', v: tr[0], d: done ? `trust ${Math.round(g.trust)} / 100` : 'how they feel about you' } : { k: 'Rounds left', v: String(Math.max(0, g.rounds - g.round + 1)) });
    return `<section class="sheet hdr"><div class="hdr-top"><div class="sh"><span class="eyebrow">${esc(k.area)} · ${status(g)}</span><h2>${esc(k.title)}</h2></div><div class="hdr-pills">${UI.pill('With ' + esc(k.themShort), 'pen')}${UI.level(g.cfg.difficulty)}</div></div>${UI.kpis(items)}</section>`;
  }

  /* ---------- Prepare ---------- */
  function valueRows(g, side) {
    const k = K(g);
    return `<div class="valrows">${k.issues.map(is => { const v = is[side], top = Math.max(...v); return `<div class="vr"><span class="vr-n">${esc(is.name)}</span><div class="vr-o">${is.opts.map((o, j) => `<span class="vo${v[j] === top ? ' top' : ''}">${esc(o)}<small class="num">${fmtShort(g, v[j])}</small></span>`).join('')}</div></div>`; }).join('')}</div>`;
  }
  function valuesTable(g) {
    const k = K(g);
    return valueRows(g, 'you') + `<p class="cap">Your value for each option, in ${esc(k.unit)}; your best option on each issue is highlighted. Your best possible deal is worth ${fmt(g, sum(k.issues.map(is => Math.max(...is.you))))}.</p>`;
  }
  function prepareView(g, ctx) {
    const k = K(g), d = g.draft, P = (g.plan || (d && d.plan)) || { guesses: [] }, locked = planLocked(g);
    let h = UI.brief(k.title, !ctx.ui.seenBrief, `<p>${esc(k.setting)}</p><p><strong>You are ${esc(k.you)}.</strong> You are negotiating with ${esc(k.them)}.</p><p>${esc(k.brief)}</p><p><strong>Your alternative if there is no deal:</strong> ${esc(k.batnaText)}</p><p>You have up to ${k.rounds} rounds. In each round you make one offer, or a set of equivalent offers, and ${esc(k.themShort)} replies. You can also ask up to two questions or share information each round.</p>`, 'Know your walk-away before you start, and find out what they care about before you concede.');
    h += UI.sheet('Your values', 'What each term is worth to you', valuesTable(g));
    const gs = P.guesses || [];
    const rows = k.issues.map((is, j) => {
      const G = gs[j] || {};
      const dir = ['same', 'opposed'].map(v => `<button type="button" class="chip" data-act="pick" data-field="pg:${j}:dir" data-value="${v}" aria-pressed="${G.dir === v}"${locked ? ' disabled' : ''}>${v === 'same' ? 'Same as me' : 'Opposite'}</button>`).join('');
      const imp = ['low', 'medium', 'high'].map(v => `<button type="button" class="chip" data-act="pick" data-field="pg:${j}:imp" data-value="${v}" aria-pressed="${G.imp === v}"${locked ? ' disabled' : ''}>${v[0].toUpperCase() + v.slice(1)}</button>`).join('');
      return `<div class="guess"><span class="g-n">${esc(is.name)}</span><div class="chips sm" role="group" aria-label="${esc(is.name)}: what they want">${dir}</div><div class="chips sm" role="group" aria-label="${esc(is.name)}: how much it matters to them">${imp}</div></div>`;
    }).join('');
    h += UI.sheet('Planning sheet', locked ? 'Locked at your first offer' : 'Prepare before you open', `<p class="case">Decide your walk-away and your target, then guess, issue by issue, what ${esc(k.themShort)} wants and how much it matters to them. Your guesses are scored in the debrief against their real priorities.</p><div class="pgrid">${
      fieldBox(`Walk-away (${esc(k.unitShort)})`, UI.num('pl:res', P.reservation == null ? k.batna.you : P.reservation, { min: 0, max: 100000, step: k.unitShort === '$M' ? 1 : 100, dec: 0, label: 'Walk-away value', disabled: locked }), null, `Your alternative is worth ${fmt(g, k.batna.you)}.`)}${
      fieldBox(`Target (${esc(k.unitShort)})`, UI.num('pl:tgt', P.target == null ? Math.round(sum(k.issues.map(is => Math.max(...is.you))) * 0.75) : P.target, { min: 0, max: 100000, step: k.unitShort === '$M' ? 1 : 100, dec: 0, label: 'Target value', disabled: locked }), null, 'An ambitious but defensible goal.')}</div><div class="guesses"><div class="guess head"><span>Issue</span><span>Do they want the same option as you?</span><span>How much does it matter to them?</span></div>${rows}</div>${locked ? '' : `<div class="actions">${UI.btn('Go to the table →', 'tab', 'btn-primary', 'data-group="tab" data-value="talk" data-top="1"')}</div>`}`);
    return h;
  }

  /* ---------- Negotiate ---------- */
  function pkgTable(g, p, them) {
    const k = K(g);
    return `<table class="pkg">${k.issues.map((is, j) => `<tr><th scope="row">${esc(is.name)}</th><td>${esc(is.opts[p[j]])}</td><td class="num">${fmtShort(g, is.you[p[j]])}</td></tr>`).join('')}<tr class="tot"><th scope="row">Value to you</th><td></td><td class="num">${fmt(g, valYou(g, p))}</td></tr>${them != null ? `<tr class="tot"><th scope="row">Value to them</th><td></td><td class="num">${fmt(g, them)}</td></tr>` : ''}</table>`;
  }
  function logView(g, done) {
    const k = K(g), lastIdx = (() => { for (let i = g.log.length - 1; i >= 0; i--) if (g.log[i].kind === 'counter') return i; return -1; })();
    return `<ol class="chat">${g.log.map((m, i) => {
      const who = m.who === 'you' ? 'you' : 'them', name = who === 'you' ? 'You' : esc(k.themShort);
      let body = '';
      if (m.kind === 'offer') body = `<p class="m-t">I propose:</p>${pkgTable(g, m.pkgs[0])}`;
      else if (m.kind === 'meso') body = `<p class="m-t">Here are ${m.pkgs.length} packages that are equally acceptable to us. Which works best for you?</p><div class="mesos">${m.pkgs.map((p, q) => `<div><span class="eyebrow">Option ${q + 1}</span>${pkgTable(g, p)}</div>`).join('')}</div>`;
      else body = `<p class="m-t">${esc(m.text)}</p>`;
      if (m.kind === 'counter' && m.p) body += `${pkgTable(g, m.p, done ? D.ptsThem(k, m.p) : null)}${!done && i === lastIdx ? `<div class="chips sm">${chipBtn('Accept this offer', 'data-op="accept"')}${chipBtn('Start from this offer', 'data-op="use"')}</div>` : ''}`;
      return `<li class="msg ${who}"><span class="m-who">${name}${m.r ? ` <small>round ${m.r}</small>` : ''}</span>${body}</li>`;
    }).join('')}</ol>`;
  }
  function builder(g) {
    const k = K(g), d = g.draft, final = g.final;
    const rows = k.issues.map((is, j) => `<div class="field"><span class="lbl">${esc(is.name)}</span><div class="chips sm" role="group" aria-label="${esc(is.name)}">${is.opts.map((o, q) => `<button type="button" class="chip" data-act="pick" data-field="o:${j}" data-value="${q}" aria-pressed="${d.offer[j] === q}">${esc(o)}<small>${fmtShort(g, is.you[q])}</small></button>`).join('')}</div></div>`).join('');
    const mesoList = d.meso.length ? `<div class="mesos draft">${d.meso.map((p, q) => `<div><span class="eyebrow">Option ${q + 1} · ${fmt(g, valYou(g, p))}</span>${pkgTable(g, p)}<button type="button" class="link danger" data-act="m" data-op="meso-del" data-i="${q}">Remove</button></div>`).join('')}</div>` : '';
    return UI.sheet(final ? 'Their final offer is on the table' : `Your offer · round ${g.round}`, final ? 'Accept it, walk away, or make one last offer' : 'Build a package', `${final ? `<p class="case">${esc(k.themShort)} has said this is their final offer. If your next offer is worse for them than theirs, they will walk away.</p>` : ''}<div class="builder">${rows}</div><p class="hint" data-live="dr-val">${valueHint(g)}</p><div class="chips sm">${chipBtn('Reset to my best package', 'data-op="best"')}${g.lastThem ? chipBtn('Start from their latest offer', 'data-op="use"') : ''}</div>${mesoList}<div class="actions">${UI.btn('Send this offer', 'm', 'btn-primary', 'data-op="send"')}${d.meso.length < 3 && !final ? UI.btn(d.meso.length ? 'Add to the set of options' : 'Start a set of equivalent offers', 'm', 'btn-ghost', 'data-op="meso-add"') : ''}${d.meso.length >= 2 && !final ? UI.btn(`Send the ${d.meso.length} options together`, 'm', 'btn-ghost', 'data-op="meso-send"') : ''}</div><p class="cap">Equivalent offers (MESOs) are two or three packages worth about the same to you. The one they prefer tells you what they value, and offering a choice builds trust.</p>`);
  }
  function valueHint(g) {
    const k = K(g), d = g.draft, v = valYou(g, d.offer), bestV = sum(k.issues.map(is => Math.max(...is.you)));
    const P = g.plan || d.plan || {};
    const parts = [`This package is worth <strong>${fmt(g, v)}</strong> to you (${N.pct(v / bestV)} of your best possible)`];
    parts.push(v < k.batna.you ? `<span class="down">below your walk-away of ${fmt(g, k.batna.you)}</span>` : `${fmt(g, v - k.batna.you)} above your walk-away`);
    if (P.target != null && isFinite(+P.target)) parts.push(v >= +P.target ? 'meets your target' : `${fmt(g, +P.target - v)} short of your target`);
    if (d.meso.length) { const vals = d.meso.map(p => valYou(g, p)); parts.push(`your set of options ranges from ${fmt(g, Math.min(...vals))} to ${fmt(g, Math.max(...vals))}`); }
    if (S.lvlOf(g) === 0 && !g.done && g.round <= g.rounds) {
      const gap = D.aspiration(g, g.round) - D.ptsThem(k, d.offer), scale = Math.max(1, g.ideal - g.res);
      parts.push(`coach’s read: ${gap > 0.5 * scale ? '<span class="down">a long way from what they can sign</span>' : gap > 0.2 * scale ? 'still some distance from what they want' : gap > 0 ? 'close to what they would accept' : '<strong>likely acceptable to them now</strong>'}`);
    }
    return parts.join(' · ');
  }
  function talkPanel(g) {
    const k = K(g), d = g.draft, left = 2 - g.talkThisRound;
    const issueChips = UI.chips('ti', 'About which issue?', k.issues.map((is, j) => ({ v: j, t: esc(is.name) })), d.issue);
    const dis = left <= 0 ? ' disabled' : '';
    return UI.sheet('Talk', left > 0 ? `${left} ${left === 1 ? 'question or remark' : 'questions or remarks'} left this round` : 'Make an offer to continue', `<div class="actions talk">${`<button type="button" class="btn btn-ghost" data-act="m" data-op="talk" data-k="prio"${dis}>Ask what matters most to them</button>`}${`<button type="button" class="btn btn-ghost" data-act="m" data-op="talk" data-k="alt"${dis}>Ask about their alternatives</button>`}</div>${issueChips}<div class="actions talk">${`<button type="button" class="btn btn-ghost" data-act="m" data-op="talk" data-k="why"${dis}>Ask why this issue matters to them</button>`}${`<button type="button" class="btn btn-ghost" data-act="m" data-op="talk" data-k="share"${dis}>Tell them this issue matters most to you</button>`}</div><p class="cap">Questions work better when they trust you. Sharing a priority builds trust and often gets one back, but it also tells them where you will pay.</p>`);
  }
  function walkSheet(g, ctx) {
    const k = K(g), confirm = ctx.ui.confirmWalk;
    return `<section class="sheet submit"><p class="case">Walking away ends the negotiation. You take your alternative: ${esc(k.batnaText)}</p>${confirm ? `<div class="actions"><button type="button" class="btn btn-danger" data-act="m" data-op="walk" data-force="1">Walk away now</button><button type="button" class="btn btn-ghost" data-act="m" data-op="walk-cancel">Keep negotiating</button></div>` : UI.btn('Walk away', 'm', 'btn-ghost', 'data-op="walk"')}</section>`;
  }
  function lowWarning(g, ctx) {
    const op = ctx.ui.confirmLow; if (!op) return '';
    const k = K(g), what = op === 'accept' ? 'Their offer' : op === 'meso-send' ? 'At least one of your options' : 'This offer';
    return `<section class="sheet result" id="dr-low"><p class="case"><strong class="down">${what} is worth less to you than your walk-away (${fmt(g, k.batna.you)}).</strong> If it is accepted, you would be better off with your alternative. ${op === 'accept' ? 'Accept anyway?' : 'Send anyway?'}</p><div class="actions"><button type="button" class="btn btn-danger" data-act="m" data-op="${op}" data-force="1">${op === 'accept' ? 'Accept anyway' : 'Send anyway'}</button><button type="button" class="btn btn-ghost" data-act="m" data-op="low-cancel">Go back</button></div></section>`;
  }
  function talkView(g, ctx) {
    let h = lowWarning(g, ctx) + UI.sheet('The table', status(g), logView(g, false));
    h += builder(g);
    if (!g.final) h += talkPanel(g);
    h += walkSheet(g, ctx);
    return h;
  }

  /* ---------- Guide ---------- */
  function guideView(g) {
    const k = K(g);
    let h = `<section class="hero"><span class="eyebrow">Participant guide</span><h1>How Deal Room works</h1><p class="lede">Multi-issue negotiation against a counterpart with private values, a deadline and a memory.</p></section>`;
    h += UI.fold('The cases', UI.table(['Case', 'You', 'Counterpart', 'Rounds'], Object.values(D.CASES).map(c => [esc(c.title), esc(c.you), esc(c.them), String(c.rounds)]), { cls: 'wrap' }), true, '1');
    h += UI.fold('Rounds and moves', `<div class="case"><p>Each round you make one offer: a complete package with an option for every issue. You can instead send two or three packages together (multiple equivalent simultaneous offers). The counterpart accepts, or replies with a counteroffer. Before your offer you can make up to two conversational moves: ask what matters most to them, ask why an issue matters, ask about their alternatives, or tell them which issue matters most to you.</p><p>In the last round their counteroffer is final: accept it, walk away, or make one last offer that is at least as good for them as theirs.</p></div>`, false, '2');
    h += UI.fold('How the counterpart behaves', `<div class="case"><p>They start near their best possible deal and concede over time toward their own walk-away, which you cannot see. How fast depends on their style and on <strong>reciprocity</strong>: if you move, they move; if you stall, they slow down. Small, token concessions and taking back earlier concessions damage trust.</p><p>They learn what you value from the packages you propose and from what you tell them. When trust is reasonable, their counteroffers trade across issues to give you more of what you seem to care about at little cost to them. When trust is low, they simply haggle toward your position.</p><p>Their answers to questions depend on trust and on their style: some counterparts are open, some guarded, and some will bluff about their alternatives.</p></div>`, false, '3');
    h += UI.fold('Kinds of issue', UI.table(['Kind', 'What it means'], Object.keys(TYPE).map(t => [t[0].toUpperCase() + t.slice(1), TYPE[t].split(': ')[1]]), { cls: 'wrap' }) + `<p class="cap">Each case mixes all three. Finding the integrative and compatible issues is where value is created.</p>`, false, '4');
    h += UI.fold('Scoring', `<div class="case"><p>Your score combines <strong>value claimed</strong> (40%): how far above your walk-away your deal is, against the best deal the counterpart could accept; <strong>value created</strong> (30%): how close the total value of the deal, to both sides, is to the most the two of you could have created; <strong>relationship</strong> (20%): their trust at the end; and <strong>preparation</strong> (10%): how well your planning sheet read their priorities and set your walk-away. No deal means you take your alternative and earn nothing for value.</p></div>`, false, '5');
    h += UI.fold('Concepts', `<div class="ideas">${[
      ['BATNA and reservation value.', 'Your best alternative to a negotiated agreement sets the floor. Never accept less; never walk away from more.'],
      ['ZOPA.', 'The zone of possible agreement is the set of deals both sides prefer to their alternatives.'],
      ['Anchoring.', 'First offers pull the final deal toward them, if they are ambitious but credible.'],
      ['Logrolling.', 'Trading issues you value less for issues you value more creates value for both sides.'],
      ['MESOs.', 'Multiple equivalent simultaneous offers reveal priorities and signal flexibility without conceding.'],
      ['Pareto efficiency.', 'A deal is efficient if no other deal is better for one side without being worse for the other.'],
      ['Reciprocity.', 'Concessions invite concessions. Stalling invites stalling.']
    ].map(([a, b]) => `<p><strong>${a}</strong> ${b}</p>`).join('')}</div>`, false, '6');
    void k;
    return h;
  }

  /* ---------- Debrief ---------- */
  function paretoSpec(g) {
    const k = K(g), sc = D.scatter(g.cid, 900), R = D.result(g);
    const points = [];
    g.offersYou.forEach(o => points.push({ x: o.you, y: o.them, c: 'var(--c-you)', r: 3.5 }));
    g.offersThem.forEach(o => points.push({ x: o.you, y: o.them, c: 'var(--c-b)', r: 3.5 }));
    if (R.deal) points.push({ x: R.you, y: R.them, c: 'var(--ink)', r: 6.5, big: true, label: 'Deal' });
    const Sp = D.space(g.cid);
    points.push({ x: Sp.you[Sp.jointK], y: Sp.them[Sp.jointK], c: 'var(--good)', r: 5, ring: true, big: true, label: 'Most value' });
    const maxX = Math.max(...sc.pts.map(p => p[0]), ...sc.front.map(p => p[0])), maxY = Math.max(...sc.pts.map(p => p[1]), ...sc.front.map(p => p[1]));
    const tx = S.Charts.niceTicks(0, maxX, 4), ty = S.Charts.niceTicks(0, maxY, 4);
    return { type: 'map', x: { min: 0, max: tx.hi, label: 'Value to you →', ticks: tx.ticks, fmt: v => fmtShort(g, v) }, y: { min: 0, max: ty.hi, label: `Value to ${k.themShort} →`, ticks: ty.ticks, fmt: v => fmtShort(g, v) }, dots: sc.pts, dotOp: 0.22, lines: [{ pts: sc.front, c: 'var(--good)', w: 2 }, { pts: g.offersYou.map(o => [o.you, o.them]), c: 'var(--c-you)', w: 1.6, dash: true }, { pts: g.offersThem.map(o => [o.you, o.them]), c: 'var(--c-b)', w: 1.6, dash: true }], refsX: [{ v: k.batna.you, label: 'your walk-away' }], refsY: [{ v: k.batna.them, label: 'their walk-away' }], points };
  }
  function coachNotes(g, sc) {
    const k = K(g), R = sc.R, P = sc.P, notes = [];
    if (!R.deal) notes.push(g.outcome && g.outcome.by === 'you' ? `You walked away and took your alternative (${fmt(g, k.batna.you)}). A deal worth up to ${fmt(g, D.space(g.cid).bestYouFeasible)} to you was possible.` : `There was no deal, so you took your alternative (${fmt(g, k.batna.you)}). ${g.trust < 15 ? 'Trust collapsed: extreme or retracted offers can end a negotiation that both sides wanted.' : 'A deal both sides preferred to their alternatives existed.'}`);
    else notes.push(R.you >= k.batna.you ? `You agreed a deal worth ${fmt(g, R.you)} to you, ${fmt(g, R.you - k.batna.you)} above your alternative. It was worth ${fmt(g, R.them)} to ${esc(k.themShort)}.` : `You agreed a deal worth ${fmt(g, R.you)} to you: <strong>${fmt(g, k.batna.you - R.you)} less than your alternative</strong>. Walking away would have been better. It was worth ${fmt(g, R.them)} to ${esc(k.themShort)}.`);
    if (R.deal && R.leftOnTable > 0.04 * D.space(g.cid).maxYou) notes.push(`The deal was not efficient: another package was worth ${fmt(g, R.leftOnTable)} more to you without costing ${esc(k.themShort)} anything. That value was left on the table.`);
    const types = k.issues.map(is => D.issueType(is));
    if (R.deal) {
      const p = g.outcome.p;
      const comp = k.issues.map((is, j) => ({ is, j })).filter(x => types[x.j] === 'compatible' && x.is.you[p[x.j]] < Math.max(...x.is.you));
      if (comp.length) notes.push(`${comp.map(x => x.is.name).join(' and ')}: you both wanted the same option, but the deal settled elsewhere. Compatible issues are free value; check whether you really disagree before trading them.`);
      const trades = k.issues.map((is, j) => ({ is, j })).filter(x => types[x.j] === 'integrative');
      const mine = trades.filter(x => (Math.max(...x.is.you) - Math.min(...x.is.you)) > (Math.max(...x.is.them) - Math.min(...x.is.them)) && x.is.you[p[x.j]] < Math.max(...x.is.you) * 0.6);
      if (mine.length) notes.push(`You gave ground on ${mine.map(x => x.is.name.toLowerCase()).join(', ')}, which mattered more to you than to them. Hold firm where you care more, and concede where they do.`);
    }
    const meso = g.log.some(m => m.kind === 'meso'), asked = g.asked.prio + g.asked.why.length + g.asked.alt;
    if (!meso) notes.push('You never sent equivalent offers. Two or three packages of equal value to you would have shown you what they value, without giving anything away.');
    if (!asked) notes.push('You never asked a question. Asking why they hold a position is the fastest way to find trades.');
    if (g.bluffed) notes.push(`${esc(k.themShort)} bluffed about their alternatives at least once. Their real alternative was: ${esc(k.themBatnaText)}`);
    if (g.offersYou.length && g.offersYou[0].you < sum(k.issues.map(is => Math.max(...is.you))) * 0.7) notes.push('Your first offer was modest. Ambitious, well-reasoned first offers anchor the whole negotiation in your favour.');
    if ((g.stalls || 0) >= 2) notes.push(`On ${g.stalls} rounds you barely moved. Token concessions read as stalling and slowed their concessions too.`);
    if (P.done) notes.push(`Your planning sheet read the direction of ${P.dirOk} of ${P.n} issues correctly and their importance on ${P.impOk}.`);
    else notes.push('You skipped the planning sheet. Guessing their priorities before you start sharpens every question you ask.');
    return notes.slice(0, 7);
  }
  function debriefView(g, ctx) {
    const k = K(g), sc = D.score(g), R = sc.R, P = sc.P, Sp = D.space(g.cid);
    let h = `<section class="sheet"><header class="sh"><span class="eyebrow">Debrief · Deal Room · ${esc(k.title)}</span></header><div class="grade"><span class="letter" aria-label="Grade ${S.grade(sc.total)}"><span class="hl draw">${S.grade(sc.total)}</span></span><div class="grade-txt"><span class="h2">${S.gradeWord(sc.total)}</span><span class="score num">${sc.total} / 100</span></div></div><p class="case">${R.deal ? `Deal in round ${g.outcome.r}: worth <strong>${fmt(g, R.you)}</strong> to you and ${fmt(g, R.them)} to ${esc(k.themShort)}.` : `No deal. You took your alternative, worth ${fmt(g, k.batna.you)}.`}</p>${UI.kpis([
      { k: 'Value claimed', v: N.pct(R.share), d: 'of what you could claim' }, { k: 'Value created', v: N.pct(R.eff), d: 'of the most possible' },
      { k: 'Relationship', v: TRUST(g.trust)[0], d: `trust ${Math.round(g.trust)} / 100` }, { k: 'Preparation', v: N.pct(P.score), d: P.done ? 'planning sheet' : 'not done' }
    ])}<p class="cap">Score: 40% value claimed, 30% value created, 20% relationship, 10% preparation.</p></section>`;
    h += UI.sheet('Every possible deal', 'Value to you against value to them', UI.chart('dr-pareto', () => paretoSpec(g), 360, [{ t: 'Efficient frontier', c: 'var(--good)' }, { t: 'Your offers', c: 'var(--c-you)' }, { t: 'Their offers', c: 'var(--c-b)' }, { t: 'Possible packages', c: 'var(--ink-3)' }], 'Possible deals and the efficient frontier') + `<p class="cap">Each grey dot is a possible package. Deals on the green frontier cannot be improved for one side without hurting the other. The dashed lines are each side's walk-away; deals in the top-right corner beat both.</p>`);
    const rounds = Math.max(g.offersYou.length, g.offersThem.length);
    if (rounds > 1) h += UI.sheet('The concession dance', 'Value to you of each offer, round by round', UI.chart('dr-conc', () => ({ series: [{ values: g.offersYou.map(o => o.you), c: 'var(--c-you)', dots: true }, { values: g.offersThem.map(o => o.you), c: 'var(--c-b)', dots: true }, { values: g.offersYou.map(o => o.them), c: 'var(--c-you)', dash: true, w: 1.4 }, { values: g.offersThem.map(o => o.them), c: 'var(--c-b)', dash: true, w: 1.4 }], xLabel: i => 'R' + (i + 1), yMin: 0, refs: [{ y: k.batna.you, label: 'your walk-away' }] }), 220, [{ t: 'Your offers, value to you', c: 'var(--c-you)' }, { t: 'Their offers, value to you', c: 'var(--c-b)' }, { t: 'Dashed: value to them', c: 'var(--ink-3)' }], 'Offers by round'));
    const deal = R.deal ? g.outcome.p : null, joint = Sp.decode(Sp.jointK);
    h += UI.sheet('Issue by issue', 'What was really at stake', UI.table(['Issue', 'Kind', 'Deal', 'Your points', 'Their points', 'Most value together'], k.issues.map((is, j) => [esc(is.name), D.issueType(is), deal ? esc(is.opts[deal[j]]) : '–', deal ? fmtShort(g, is.you[deal[j]]) : '–', deal ? fmtShort(g, is.them[deal[j]]) : '–', esc(is.opts[joint[j]])]), { sticky: true }) + `<p class="cap">${Object.keys(TYPE).map(t => TYPE[t]).join('. ')}. The last column is one package that creates the most total value.</p>`);
    h += UI.sheet(`${esc(k.themShort)}'s values, revealed`, 'Their private points', valueRows(g, 'them') + `<p class="cap">Their best option on each issue is highlighted. Their walk-away was worth ${fmt(g, k.batna.them)} to them: ${esc(k.themBatnaText)}</p>`);
    if (g.plan && g.plan.guesses) {
      const pr = D.prioritiesThem(k), rank = {}; pr.forEach((x, q) => { rank[x.j] = q; });
      h += UI.sheet('Your planning sheet', 'Guesses against reality', UI.table(['Issue', 'You guessed', 'Reality', 'You guessed', 'Reality'], k.issues.map((is, j) => { const G = g.plan.guesses[j] || {}, dir = D.issueType(is) === 'compatible' ? 'same' : 'opposed', lvl = rank[j] < 2 ? 'high' : rank[j] >= k.issues.length - 2 ? 'low' : 'medium'; const ok = (a, b) => (a ? `<span class="${a === b ? 'up' : 'down'}">${a}</span>` : '–'); return [esc(is.name), ok(G.dir, dir), dir, ok(G.imp, lvl), lvl]; }), { sticky: true }) + '<p class="cap">Columns two and three: do they want the same option as you? Columns four and five: how much the issue matters to them.</p>');
    }
    h += `<section class="sheet"><header class="sh"><span class="eyebrow">Coach’s notes</span><h2>What to take away</h2></header><ul class="notes plain">${coachNotes(g, sc).map(n => `<li>${n}</li>`).join('')}</ul></section>`;
    h += UI.sheet('Transcript', `${plural(g.log.length, 'message')}`, logView(g, true));
    h += `<div class="actions"><button type="button" class="btn btn-primary" data-act="retry-run" data-id="${ctx.meta.id}">Replay this case</button><button type="button" class="btn btn-ghost" data-act="new-run" data-module="dealroom">New negotiation</button><button type="button" class="btn btn-ghost" data-act="leave-run">Back to home</button></div>`;
    return h;
  }

  /* ---------- Module ---------- */
  function keep(g) { const d = g.draft; return { offer: d.offer.slice(), meso: clone(d.meso), plan: g.plan ? null : clone(d.plan), issue: d.issue }; }
  function live(g, ctx) {
    if (D.isDone(g) || uiStr(ctx, 'tab', 'talk') !== 'talk') return {};
    return { 'dr-val': valueHint(g) };
  }
  S.App.register({
    id: 'dealroom', cat: 'people', title: 'Deal Room', area: 'Negotiation', length: '3 cases · 20–30 min each', depth: 'Full simulation', version: 1, persist: 'replay', wide: true,
    practises: 'Negotiation · multi-issue bargaining · creating and claiming value',
    blurb: 'Negotiate a job offer, a supply contract or a biotech licence against a counterpart with private values. Prepare a walk-away, ask questions, trade across issues, send equivalent offers and see the efficient frontier you were negotiating on.',
    detail: '<p>Three multi-issue cases with distributive, integrative and compatible issues hidden among seven or eight terms. A planning sheet scored against the counterpart’s real priorities; offers and multiple equivalent simultaneous offers; questions about priorities, interests and alternatives, answered according to trust; a counterpart who concedes by reciprocity, learns your priorities and sometimes bluffs; a deadline with a final offer; and a debrief with the Pareto frontier, the concession dance, the counterpart’s values and a transcript.</p>',
    options: [
      { id: 'case', label: 'Case', default: 'offer', choices: Object.values(D.CASES).map(c => ({ v: c.id, t: c.title, s: c.area })) },
      { id: 'difficulty', label: 'Difficulty', default: 'guided', choices: [{ v: 'guided', t: 'Foundation', s: 'Relationship meter and a coach’s read of each offer' }, { v: 'standard', t: 'Intermediate', s: 'Relationship meter only' }, { v: 'expert', t: 'Advanced', s: 'Read the room yourself' }] }
    ],
    create: (seed, config) => D.create(seed, config),
    apply: (g, d) => D.apply(g, d),
    isDone: g => D.isDone(g),
    progress: g => (D.isDone(g) ? `${K(g).title} · ${g.outcome && g.outcome.deal ? 'deal' : 'no deal'}` : `${K(g).title} · ${status(g).toLowerCase()}`),
    view(g, ctx) {
      const done = D.isDone(g);
      let tab = uiStr(ctx, 'tab', done ? 'debrief' : g.offersYou.length ? 'talk' : 'prepare');
      if (done && (tab === 'talk' || tab === 'prepare')) tab = 'debrief';
      if (!done && tab === 'debrief') tab = 'talk';
      ctx.ui.tab = tab;
      let h = header(g, done);
      const tabs = done ? [{ v: 'debrief', t: 'Debrief' }, { v: 'prepare', t: 'Case' }, { v: 'guide', t: 'Guide' }] : [{ v: 'prepare', t: 'Prepare' }, { v: 'talk', t: 'Negotiate' }, { v: 'guide', t: 'Guide' }];
      h += UI.tabs('tab', tabs, tab, 'main-tabs', true);
      if (tab === 'prepare') h += done ? UI.sheet('Your values', 'What each term was worth to you', valuesTable(g)) : prepareView(g, ctx);
      else if (tab === 'talk') h += talkView(g, ctx);
      else if (tab === 'guide') h += guideView(g);
      else h += debriefView(g, ctx);
      return h;
    },
    live,
    onTab(g, group, value, ctx) { if (group === 'tab') { ctx.ui.seenBrief = true; ctx.ui.confirmWalk = false; ctx.ui.confirmLow = null; } },
    field(g, name, value) {
      const d = g.draft; if (!d) return null;
      const p = String(name).split(':');
      if (p[0] === 'o') { d.offer[+p[1]] = clamp(+value || 0, 0, K(g).issues[+p[1]].opts.length - 1); return null; }
      if (p[0] === 'ti') { d.issue = +value || 0; return null; }
      if (planLocked(g)) return null;
      if (p[0] === 'pl') { d.plan[p[1] === 'res' ? 'reservation' : 'target'] = +value; return null; }
      if (p[0] === 'pg') { const G = d.plan.guesses[+p[1]] || (d.plan.guesses[+p[1]] = {}); G[p[2]] = String(value); return null; }
      return null;
    },
    act(g, op, el, ctx) {
      const d = g.draft; if (!d) return null;
      const ds = el.dataset, plan = g.plan ? null : clone(d.plan);
      if (op === 'best') { d.offer = best(g); return { rerender: true }; }
      if (op === 'use') { if (g.lastThem) d.offer = g.lastThem.slice(); return { rerender: true, toast: 'Their latest offer is in your builder.' }; }
      if (op === 'meso-add') { if (d.meso.length < 3) d.meso.push(d.offer.slice()); return { rerender: true, toast: d.meso.length === 1 ? 'Now change some terms to build an equivalent package, then add it too.' : 'Added to your set of options.' }; }
      if (op === 'meso-del') { d.meso.splice(+ds.i, 1); return { rerender: true }; }
      const below = p => valYou(g, p) < K(g).batna.you;
      if (op === 'send') {
        if (below(d.offer) && ds.force !== '1') { ctx.ui.confirmLow = 'send'; return { rerender: true, scrollTo: 'dr-low' }; }
        ctx.ui.confirmWalk = false; ctx.ui.confirmLow = null; return { commit: { kind: 'offer', offer: d.offer.slice(), plan }, top: false, toast: 'Offer sent.' };
      }
      if (op === 'meso-send') {
        if (d.meso.length < 2) return null;
        if (d.meso.some(below) && ds.force !== '1') { ctx.ui.confirmLow = 'meso-send'; return { rerender: true, scrollTo: 'dr-low' }; }
        ctx.ui.confirmLow = null; return { commit: { kind: 'meso', pkgs: clone(d.meso), plan }, top: false, toast: `${d.meso.length} options sent.` };
      }
      if (op === 'accept') {
        if (g.lastThem && below(g.lastThem) && ds.force !== '1') { ctx.ui.confirmLow = 'accept'; return { rerender: true, scrollTo: 'dr-low' }; }
        ctx.ui.confirmLow = null; return { commit: { kind: 'accept', plan }, top: true, toast: 'Deal signed. Here is your debrief.' };
      }
      if (op === 'low-cancel') { ctx.ui.confirmLow = null; return { rerender: true }; }
      if (op === 'walk-cancel') { ctx.ui.confirmWalk = false; return { rerender: true }; }
      if (op === 'walk') { if (ds.force !== '1') { ctx.ui.confirmWalk = true; return { rerender: true }; } ctx.ui.confirmWalk = false; return { commit: { kind: 'walk', plan }, top: true, toast: 'You walked away.' }; }
      if (op === 'talk') { if (g.talkThisRound >= 2) return null; return { commit: { kind: 'talk', talk: ds.k, issue: d.issue, keep: keep(g) }, top: false }; }
      return null;
    },
    summary(g) {
      const sc = D.score(g), R = sc.R, k = K(g);
      return { score: sc.total, line: `${k.title} · ${R.deal ? `deal worth ${fmt(g, R.you)} to you` : 'no deal'} · value created ${N.pct(R.eff)}`, metrics: [{ k: 'Outcome', v: R.deal ? 'Deal' : 'No deal' }, { k: 'Value to you', v: fmt(g, R.you) }, { k: 'Value created', v: N.pct(R.eff) }] };
    }
  });
})();
