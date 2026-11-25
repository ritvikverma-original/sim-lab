/* Markets Desk: interface for the ten-year endowment game. The engine lives in markets-engine.js. */
(function () {
  'use strict';
  const S = window.SimLab, E = window.MarketsEngine, MD = window.MarketsData;
  if (!S || !E || !MD) return;
  const { UI, N, U } = S;
  const esc = U.esc, clamp = U.clamp, sum = U.sum, avg = U.avg, clone = U.clone;
  const A = E.ASSETS, RISKY = E.RISKY, KEYS = E.KEYS;
  const COL = { eq: 'var(--s1)', tn: 'var(--s3)', bb: 'var(--s4)', re: 'var(--s2)', au: 'var(--c-f)', tb: 'var(--s5)' };
  const lvl = g => S.lvlOf(g);
  const W = g => MD.WINDOWS[g.cfg.scenario];
  const done = g => E.isDone(g);
  const yr = g => E.yearOf(g, g.t);
  const pct = (v, d) => N.pct(v, d == null ? 0 : d);
  const pct1 = v => N.pct(v, 1);
  const sgn = (v, d) => N.sign(v * 100, x => N.num(x, d == null ? 1 : d) + '%');
  const money = v => (Math.abs(v) >= 1000 ? N.usd(v / 1000, 2) + 'B' : N.m(v, 0));
  const money1 = v => N.m(v, 1);
  const uiStr = (ctx, k, d) => (ctx.ui[k] == null || ctx.ui[k] === '' ? d : ctx.ui[k]);
  const chipBtn = (label, attrs) => `<button type="button" class="chip" data-act="m" ${attrs}>${label}</button>`;
  const yLab = t => `Y${t}`;
  const PRESETS = [
    { id: 'policy', t: 'Policy 60/40', w: { eq: 0.6, tn: 0.4, bb: 0, re: 0, au: 0 } },
    { id: 'keep', t: 'Keep today’s mix', w: null },
    { id: 'balanced', t: 'Balanced', w: { eq: 0.45, tn: 0.25, bb: 0.1, re: 0.1, au: 0.05 } },
    { id: 'defensive', t: 'Defensive', w: { eq: 0.25, tn: 0.4, bb: 0.1, re: 0.05, au: 0.1 } },
    { id: 'real', t: 'Inflation guard', w: { eq: 0.35, tn: 0.1, bb: 0.05, re: 0.2, au: 0.15 } },
    { id: 'growth', t: 'Growth', w: { eq: 0.75, tn: 0.1, bb: 0.05, re: 0.05, au: 0 } }
  ];

  /* ---------- Header ---------- */
  function header(g) {
    const d = done(g), last = g.H[g.H.length - 1], m = E.metricsOf(g.H, g), lim = E.LIMIT[g.cfg.difficulty];
    const bLast = g.rv.bench.H[g.rv.bench.H.length - 1];
    const real = E.realValue(g);
    return `<section class="sheet hdr"><div class="hdr-top"><div class="sh"><span class="eyebrow">${esc(W(g).tag)} · ${d ? 'Debrief' : `Year ${g.t} of ${g.n} · decisions open`}</span><h2>Halden Foundation endowment</h2></div><div class="hdr-pills">${UI.pill(esc(W(g).name), 'neutral')}${UI.level(g.cfg.difficulty)}</div></div>${UI.kpis([
      { k: d ? 'Final value' : 'Fund value', v: money(g.V), d: `${money(real)} in starting dollars` },
      { k: 'Last year', v: last ? sgn(last.net) : '–', d: last ? `policy portfolio ${sgn(bLast.net)}` : 'no results yet', cls: last ? (last.net >= bLast.net ? 'up' : 'down') : '' },
      { k: 'Real return a year', v: m ? sgn(m.realCagr) : '–', d: m ? `after inflation, over ${m.n} year${m.n === 1 ? '' : 's'}` : 'since the start' },
      { k: 'Worst fall', v: m ? pct(m.mdd) : '0%', d: `limit ${pct(lim)}`, cls: m && m.mdd > lim ? 'down' : '' }
    ])}</section>`;
  }
  function mandateList(g) {
    const L = lvl(g), lim = E.LIMIT[g.cfg.difficulty];
    const items = [
      `Pay out ${L === 0 ? '<strong>4.5%</strong> of the fund each year' : '<strong>3.5% to 5.5%</strong> of the fund each year (you choose; 4.5% is the norm)'}, at the start of the year, to fund scholarships.`,
      `Keep the worst fall from a peak under <strong>${pct(lim)}</strong>. The board meets after any year the fund loses 10% or more, or first breaks the limit.`,
      `No more than <strong>75%</strong> in any one asset class. Property can be at most ${pct(E.RE_MAX)} of the fund and moves by at most ${E.RE_MOVE * 100} points a year, because it is slow to buy and sell.`,
      L === 2 ? `You may borrow up to <strong>30%</strong> of the fund at the cash rate plus 1%.` : 'No borrowing: cash is whatever you do not invest.',
      L === 0 ? 'Protective put options are not offered at this level.' : 'You can buy one-year protective puts that cap losses on part of your equities at 10%.'
    ];
    return `<ul class="steps">${items.map(t => `<li>${t}</li>`).join('')}</ul>`;
  }
  function caseBrief(g, open) {
    return UI.brief('The Halden Foundation', open, `<p>You are the new chief investment officer of the Halden Foundation, which pays for scholarships out of a <strong>$500 million endowment</strong>. The trustees want two things that pull against each other: steady grants every year, and a fund that keeps its purchasing power for the students of the future.</p><p>Each year you set the mix of six asset classes. The returns are the <strong>real historical returns of a decade you will not be told</strong> until the end. You see only what investors knew at the start of each year: last year’s markets and the news.</p>${mandateList(g)}<p>You are judged against the policy portfolio (60% equities, 40% government bonds, rebalanced each year) and three other managers who face the same markets.</p>`, 'Nobody knows next year’s returns. Ask what the mix does in a bad year, not what it does in a good one.');
  }

  /* ---------- Briefing ---------- */
  function lastYearTable(g) {
    const y = yr(g), P = E.DATA[y - 1];
    const rows = KEYS.map(k => [`<i class="cdot" style="background:${COL[k]}" aria-hidden="true"></i>${A[k].name}`, `<span class="${P[k] < 0 ? 'down' : ''}">${sgn(P[k])}</span>`, `<span class="${(1 + P[k]) / (1 + P.cpi) - 1 < 0 ? 'down' : ''}">${sgn((1 + P[k]) / (1 + P.cpi) - 1)}</span>`]);
    rows.push({ cls: 'sep', cells: ['Inflation', sgn(P.cpi), '–'] });
    return UI.table(['Last year', 'Return', 'Real'], rows, { sticky: true });
  }
  function dataBrief(g) {
    const y = yr(g), P = E.DATA[y - 1], P2 = E.DATA[y - 2];
    const best = KEYS.slice().sort((a, b) => P[b] - P[a])[0], worst = KEYS.slice().sort((a, b) => P[a] - P[b])[0];
    const parts = [`Last year ${A[best].name.toLowerCase()} did best (${sgn(P[best])}) and ${A[worst].name.toLowerCase()} did worst (${sgn(P[worst])}). Inflation was ${pct1(P.cpi)}.`];
    if (P2) parts.push(`The year before, equities returned ${sgn(P2.eq)} and inflation was ${pct1(P2.cpi)}.`);
    if (P.eq < -0.1) parts.push('Shares are well below their recent peak.'); else if (P.eq > 0.25) parts.push('Shares have just had an exceptional year.');
    if (P.cpi > 0.06) parts.push('Inflation is high, so cash and bonds are losing purchasing power.'); else if (P.cpi < 0) parts.push('Prices are falling, which raises the real value of cash and bonds.');
    return parts.join(' ');
  }
  function briefing(g) {
    const y = yr(g), w = W(g), txt = w.briefs && w.briefs[y] ? w.briefs[y] : dataBrief(g);
    const coach = lvl(g) === 0 ? coachLine(g) : '';
    return UI.sheet(`What investors know · start of year ${g.t}`, g.t === 1 ? 'Where markets stand' : 'Last year in the markets', `<p class="case">${esc(txt)}</p>${lastYearTable(g)}${coach ? `<p class="note">${coach}</p>` : ''}`);
  }
  function coachLine(g) {
    const y = yr(g), P = E.DATA[y - 1], d = g.draft, f = E.full(d.w);
    if (g.board.pending) return 'Big losses tempt boards to sell at the bottom. Ask what the long record says happens after bad years before you choose.';
    if (P.cpi > 0.06 && f.tb + f.tn > 0.5) return 'With inflation this high, more than half the fund in cash and bonds is likely to lose purchasing power.';
    if (P.au > 0.4 && f.au > 0.15) return 'Gold has just had a huge year. Prices that rose that fast can fall fast too, so size the position for a reversal.';
    if (P.eq > 0.25 && f.eq > (g.w.eq || 0) + 0.05) return 'Adding to shares after an exceptional year is buying high. Rebalancing to your target is usually the safer habit.';
    if (P.eq < -0.15 && f.eq < (g.w.eq || 0) - 0.05) return 'Selling shares after a crash locks in the loss. Historically, the years after big falls have often been strong.';
    if (f.eq > 0.75) return 'More than 75% in equities breaks the committee’s concentration rule and makes the drawdown limit hard to keep.';
    return 'Check the risk lab: the worst year in the record for your mix tells you how close a bad year could take you to the drawdown limit.';
  }

  /* ---------- Board meeting and events ---------- */
  function boardSheet(g) {
    const p = g.board.pending; if (!p) return '';
    const d = g.draft, opts = [
      { v: 'hold', t: 'Hold the policy and rebalance', s: 'Board confidence −4 now' },
      { v: 'derisk', t: 'Cut risk: move 20 points out of equities', s: 'Board confidence +6 now' },
      { v: 'dip', t: 'Buy the dip: add 10 points to equities', s: 'Board confidence −8 now' }
    ];
    const why = p.loss <= -0.1 ? `The fund lost ${pct(Math.abs(p.loss))} last year` : `The fund has fallen ${pct(p.dd)} from its peak, beyond the limit`;
    return UI.sheet('Board meeting', 'The trustees want a plan', `<p class="case">${why}. Several trustees want to sell shares before things get worse; others remind the room that the policy exists for years like this. Equities are now <strong>${pct(p.eq)}</strong> of the fund.</p>${UI.chips('board', 'Your recommendation', opts, d.board || '')}<p class="cap">Board confidence is ${Math.round(g.board.conf)} out of 100. It rises when you beat the policy portfolio and falls when you trail it or break the drawdown limit.</p>`, 'board');
  }
  function goldSheet(g) {
    const y = yr(g); if (!E.goldBanned(g, y) || y !== g.ban) return '';
    return UI.sheet('Government order', 'Gold must be handed in', `<p class="case">The new government has ordered all gold to be handed in to the central bank at the official price. ${g.w.au > 0.001 ? `Your gold (${pct(g.w.au)} of the fund) will be exchanged for cash at its value today.` : 'You hold no gold.'} Gold is closed to investors from now on.</p>`, 'warn-sheet');
  }

  /* ---------- Allocation ---------- */
  function allocRows(g) {
    const d = g.draft, y = yr(g), P = E.DATA[y - 1], L = lvl(g), ban = E.goldBanned(g, y);
    return RISKY.map(k => {
      const lock = ban && k === 'au';
      const max = k === 're' ? Math.round(Math.min(E.RE_MAX, (g.w.re || 0) + E.RE_MOVE) * 100) : L === 2 ? 130 : 100;
      const ctl = UI.num(`w:${k}`, Math.round((d.w[k] || 0) * 100), { min: 0, max, step: 5, dec: 0, unit: '%', label: `${A[k].name} target`, disabled: lock });
      return `<div class="al-row"><div class="al-n"><span class="al-t"><i class="cdot" style="background:${COL[k]}" aria-hidden="true"></i>${A[k].name}</span><span class="al-w">${esc(A[k].what)}</span></div><div class="al-c">${ctl}</div><dl class="al-m"><dt>Now</dt><dd class="num">${pct(g.w[k] || 0)}</dd><dt>Policy</dt><dd class="num">${pct(E.POLICY[k] || 0)}</dd><dt>Last year</dt><dd class="num ${P[k] < 0 ? 'down' : ''}">${sgn(P[k])}</dd></dl></div>`;
    }).join('');
  }
  function cashLine(g) {
    const f = E.full(g.draft.w), L = lvl(g), P = E.DATA[yr(g) - 1];
    if (f.tb >= -1e-9) return `<span class="al-t"><i class="cdot" style="background:${COL.tb}" aria-hidden="true"></i>Cash</span> <strong class="num">${pct(f.tb)}</strong> <span class="cap">whatever is not invested · returned ${sgn(P.tb)} last year</span>`;
    if (L < 2) return `<span class="down"><strong>Over-invested by ${pct(-f.tb)}.</strong> Borrowing is not allowed at this level, so targets will be scaled back to 100% when you invest.</span>`;
    return `<span class="al-t">Borrowing</span> <strong class="num down">${pct(-f.tb)}</strong> <span class="cap">at the cash rate plus 1% · gross exposure ${pct(1 - f.tb)}</span>`;
  }
  function warnings(g) {
    const d = g.draft, f = E.full(d.w), out = [], st = E.statsBefore(yr(g)), ps = E.portStats(st, d.w), lim = E.LIMIT[g.cfg.difficulty];
    E.constraints(g, d.w).forEach(c => {
      if (c.m === 'move') out.push({ t: 'warn', m: `Property can move by at most ${E.RE_MOVE * 100} points a year; it will be set to ${pct(clamp(f.re, Math.max(0, (g.w.re || 0) - E.RE_MOVE), (g.w.re || 0) + E.RE_MOVE))}.` });
      if (c.m === 'cap') out.push({ t: 'warn', m: `Property is capped at ${pct(E.RE_MAX)} of the fund.` });
      if (c.m === 'ban') out.push({ t: 'bad', m: 'Gold can no longer be held; it will be set to zero.' });
      if (c.m === 'gross') out.push({ t: 'bad', m: 'Gross exposure is above 130%; it will be scaled back.' });
      if (c.m === 'derisk') out.push({ t: 'bad', m: `You told the board you would cut equities to ${pct(Math.max(0, g.board.pending.eq - 0.2))} or less.` });
      if (c.m === 'dip') out.push({ t: 'bad', m: `You told the board you would raise equities to at least ${pct(Math.min(1, g.board.pending.eq + 0.1))}.` });
    });
    RISKY.forEach(k => { if (f[k] > 0.75 + 1e-9) out.push({ t: 'warn', m: `${A[k].name} at ${pct(f[k])} breaks the committee’s 75% concentration rule.` }); });
    if (-ps.worst > lim) out.push({ t: 'info', m: `In the worst year of the long record this mix would have lost ${pct(-ps.worst)}, more than your ${pct(lim)} drawdown limit.` });
    if (g.board.pending && !d.board) out.push({ t: 'bad', m: 'Choose what you will recommend to the board before you invest.' });
    return out;
  }
  function labHtml(g) {
    const d = g.draft, st = E.statsBefore(yr(g)), me = E.portStats(st, d.w), pol = E.portStats(st, E.POLICY);
    const row = (k, a, b, f) => [k, `<strong class="num">${f(a)}</strong>`, `<span class="num">${f(b)}</span>`];
    return UI.table(['Long-run record', 'Your mix', 'Policy'], [
      row('Average return a year', me.mu, pol.mu, v => pct1(v)),
      row('After inflation', me.real, pol.real, v => pct1(v)),
      row('Volatility', me.sd, pol.sd, v => pct1(v)),
      row('Sharpe ratio', me.sharpe, pol.sharpe, v => N.num(v, 2)),
      row('Worst year on record', me.worst, pol.worst, v => sgn(v)),
      row('A 1-in-20 bad year', me.p5, pol.p5, v => sgn(v)),
      row('Share of losing years', me.lossYears, pol.lossYears, v => pct(v))
    ], { sticky: true }) + `<p class="cap">Computed from every year of the record before this one, the way an analyst would. Past returns are a guide to risk, not a forecast.</p>`;
  }
  function mapSpec(g) {
    const y = yr(g), st = E.statsBefore(y), cl = E.cloud(y), d = g.draft;
    const me = E.portStats(st, d.w), pol = E.portStats(st, E.POLICY), cur = E.portStats(st, { eq: g.w.eq, tn: g.w.tn, bb: g.w.bb, re: g.w.re, au: g.w.au });
    const pts = KEYS.map(k => ({ x: st.sd[k], y: st.mean[k], c: COL[k], r: 4, label: A[k].short, lc: 'var(--ink-2)' }));
    pts.push({ x: pol.sd, y: pol.mu, c: 'var(--ink-3)', r: 5, label: 'Policy' });
    if (g.t > 1) pts.push({ x: cur.sd, y: cur.mu, c: 'var(--c-you)', r: 4, ring: true, label: 'Today' });
    pts.push({ x: me.sd, y: me.mu, c: 'var(--c-you)', r: 6.5, big: true, label: 'Your mix' });
    const xs = pts.map(p => p.x).concat(cl.pts.map(p => p[0])), ys = pts.map(p => p.y).concat(cl.pts.map(p => p[1]));
    const xMax = Math.min(0.45, Math.max(...xs) * 1.08), yMin = Math.min(0, ...ys), yMax = Math.max(...ys) * 1.12;
    return { type: 'map', x: { min: 0, max: Math.max(0.1, xMax), label: 'Volatility (risk) →', fmt: v => Math.round(v * 100) + '%' }, y: { min: Math.min(-0.01, yMin), max: Math.max(0.05, yMax), label: 'Average return →', fmt: v => Math.round(v * 100) + '%' },
      dots: cl.pts.filter(p => p[0] <= xMax), dotR: 1.5, dotOp: 0.28, lines: [{ pts: cl.front, c: 'var(--good)', w: 1.6, dash: true }], points: pts };
  }
  function hedgeSheet(g) {
    if (lvl(g) === 0) return '';
    const d = g.draft, f = E.full(d.w), cost = E.hedgeCost(g), V1 = g.V * (1 - (+d.spend || E.SPEND.base));
    const chips = UI.chips('hedge', 'Protect part of your equities with one-year put options', E.HEDGES.map(h => ({ v: h, t: h === 0 ? 'None' : pct(h), s: h === 0 ? 'no premium' : `costs ${money1(V1 * f.eq * h * cost)}` })), d.hedge);
    return UI.sheet('Protection', 'Insure against a crash', `<p class="case">A put option pays out if equities fall more than 10% this year, so the protected part can lose at most 10%. The premium is ${pct1(cost)} of the protected amount${lvl(g) === 2 ? ' and rises after volatile years' : ''}, paid whether or not a crash comes.</p>${chips}`);
  }
  function spendSheet(g) {
    if (lvl(g) === 0) return '';
    const d = g.draft;
    return UI.sheet('Spending', 'How much goes to scholarships this year', UI.chips('spend', null, E.SPEND.choices.map(s => ({ v: s, t: pct1(s), s: money1(g.V * s) })), d.spend) + '<p class="cap">Paying out more helps students now but leaves less to compound for later ones. Spending above the fund’s real return shrinks it over time.</p>');
  }
  function summary(g) {
    const d = g.draft, f = E.full(d.w), spend = lvl(g) === 0 ? E.SPEND.base : +d.spend || E.SPEND.base, V1 = g.V * (1 - spend);
    const turnover = sum(KEYS.map(k => Math.abs(f[k] - (g.w[k] || 0)))) / 2;
    const tc = V1 * sum(KEYS.map(k => Math.abs(f[k] - (g.w[k] || 0)) * A[k].cost));
    const parts = [`Grants <strong>${money1(g.V * spend)}</strong>`, `trading ${pct(turnover)} of the fund costs <strong>${money1(tc)}</strong>`];
    if (lvl(g) > 0 && +d.hedge > 0) parts.push(`put premium <strong>${money1(V1 * f.eq * d.hedge * E.hedgeCost(g))}</strong>`);
    if (f.tb < 0 && lvl(g) === 2) parts.push(`borrowing <strong>${money1(V1 * -f.tb)}</strong>`);
    return parts.join(' · ');
  }
  function deskView(g, ctx) {
    let h = '';
    if (g.t === 1) h += caseBrief(g, !ctx.ui.seenBrief);
    h += briefing(g) + goldSheet(g) + boardSheet(g);
    const d = g.draft;
    h += UI.sheet(`Year ${g.t} · your decision`, 'Set the mix', `<div class="chips sm" role="group" aria-label="Starting points">${PRESETS.map(p => chipBtn(p.t, `data-op="preset" data-p="${p.id}"`)).join('')}</div><div class="alloc">${allocRows(g)}<div class="al-cash" data-live="md-cash">${cashLine(g)}</div></div><div data-live="md-warn">${UI.warn(warnings(g))}</div>`);
    h += UI.sheet('Risk lab', 'What your mix has done in the past', `<div class="pgrid2"><div data-live="md-lab">${labHtml(g)}</div><div>${UI.chart('md-map', () => mapSpec(g), 300, [{ t: 'Your mix', c: 'var(--c-you)' }, { t: 'Best mixes in the record', c: 'var(--good)' }, { t: 'Random mixes', c: 'var(--ink-3)' }], 'Risk and return of each asset, the policy portfolio and your mix')}<p class="cap">Each dot is a random mix of the six assets. The dashed line traces the best return available for each level of risk in the record so far.</p></div></div>`);
    h += hedgeSheet(g) + spendSheet(g);
    const blocked = g.board.pending && !d.board;
    h += `<section class="sheet result"><div class="summary" data-live="md-sum">${summary(g)}</div><div class="actions"><button type="button" class="btn btn-primary btn-block" data-act="m" data-op="invest"${blocked ? ' disabled' : ''}>${g.t === g.n ? 'Invest for the final year' : `Invest for year ${g.t}`}</button></div><p class="cap">Returns for the year are revealed as soon as you invest. Decisions cannot be undone.</p></section>`;
    return h;
  }
  function resultBanner(g) {
    const h = g.H[g.H.length - 1]; if (!h || done(g)) return '';
    const b = g.rv.bench.H[g.rv.bench.H.length - 1];
    const best = KEYS.slice().sort((a, c) => h.ret[c] - h.ret[a])[0];
    const lines = [`Your fund returned <strong>${sgn(h.net)}</strong> (${sgn(h.real)} after inflation) against <strong>${sgn(b.net)}</strong> for the policy portfolio. ${A[best].name} did best (${sgn(h.ret[best])}); inflation was ${pct1(h.cpi)}.`];
    if (h.payoff > 0.01) lines.push(`Your puts paid out ${money1(h.payoff)}.`); else if (h.prem > 0.01) lines.push(`Your puts cost ${money1(h.prem)} and expired unused.`);
    if (h.banGold) lines.push('Your gold was exchanged for cash at the official price.');
    return `<section class="sheet result"><span class="eyebrow">Year ${h.t} results</span><p class="case">${lines.join(' ')}</p></section>`;
  }

  /* ---------- Markets tab ---------- */
  function marketsView(g) {
    const H = g.H; let h = '';
    if (H.length) {
      const rows = H.map(x => [yLab(x.t)].concat(KEYS.map(k => `<span class="${x.ret[k] < 0 ? 'down' : ''}">${sgn(x.ret[k])}</span>`)).concat([sgn(x.cpi)]));
      h += UI.sheet('This decade so far', 'Returns by year', UI.table(['Year'].concat(KEYS.map(k => A[k].short)).concat(['Inflation']), rows, { sticky: true, cls: 'wide-t' }));
      h += UI.sheet('Growth of $100', 'Each asset this decade', UI.chart('md-grow', () => ({ series: KEYS.map(k => { let v = 100; return { values: [100].concat(H.map(x => (v *= 1 + x.ret[k]))), c: COL[k], w: 2 }; }), xLabel: i => (i === 0 ? 'Start' : yLab(i)), yFmt: v => '$' + Math.round(v) }), 230, KEYS.map(k => ({ t: A[k].short, c: COL[k] })), 'Growth of $100 in each asset'));
    } else h += UI.sheet('This decade so far', 'No results yet', '<p class="case">Each year’s returns appear here once you invest.</p>');
    const st = E.statsBefore(done(g) ? g.start : yr(g));
    const rows = KEYS.map(k => [`<i class="cdot" style="background:${COL[k]}" aria-hidden="true"></i>${A[k].name}`, pct1(st.mean[k]), pct1(st.real[k]), pct1(st.sd[k]), sgn(st.worst[k]), sgn(st.best[k]), N.num(st.corr.eq[k], 2)]);
    h += UI.sheet(done(g) ? 'Before the decade began' : 'The long-run record', 'History an analyst can see', UI.table(['Asset', 'Average', 'After inflation', 'Volatility', 'Worst year', 'Best year', 'Corr. with equities'], rows, { sticky: true, cls: 'wide-t' }) + `<p class="cap">Annual figures from the start of the record to the end of last year (${N.int(st.n)} years). Average inflation over the record: ${pct1(st.infl)}.</p>`);
    return h;
  }

  /* ---------- Portfolio tab ---------- */
  function idxSeries(H) { let v = 100; return [100].concat(H.map(x => (v *= 1 + x.net))); }
  function portfolioView(g) {
    let h = '';
    const st = E.standings(g).filter(r => r.m);
    if (st.length) {
      h += UI.sheet('Managers', 'You against the other funds', UI.table(['Fund', 'Real a year', 'Return a year', 'Volatility', 'Sharpe', 'Worst fall', 'Value'], st.map(r => ({ cls: r.id === 'you' ? 'me' : '', cells: [`<i class="cdot" style="background:${r.c}" aria-hidden="true"></i>${esc(r.name)}`, sgn(r.m.realCagr), sgn(r.m.cagr), pct1(r.m.vol), N.num(r.m.sharpe, 2), pct(r.m.mdd), money(r.V)] })), { sticky: true, cls: 'wide-t' }) + '<p class="cap">Returns are before spending, so funds can be compared fairly; values are after each fund paid out its grants. All four rivals pay out 4.5%.</p>');
      h += UI.sheet('Growth of $100', 'Investment return, before spending', UI.chart('md-vs', () => ({ series: st.map(r => ({ values: idxSeries(r.id === 'you' ? g.H : g.rv[r.id].H), c: r.c, w: r.id === 'you' ? 3 : 1.6 })), xLabel: i => (i === 0 ? 'Start' : yLab(i)), yFmt: v => '$' + Math.round(v) }), 230, st.map(r => ({ t: r.name, c: r.c })), 'Growth of $100 for each fund'));
      const rows = g.H.map(x => { const b = g.rv.bench.H[x.t - 1]; return [yLab(x.t), RISKY.filter(k => x.wT[k] >= 0.005).map(k => `${A[k].short} ${pct(x.wT[k])}`).join(', ') + (x.wT.tb < -0.001 ? `, borrowed ${pct(-x.wT.tb)}` : x.wT.tb > 0.005 ? `, cash ${pct(x.wT.tb)}` : ''), `<span class="${x.net < 0 ? 'down' : ''}">${sgn(x.net)}</span>`, sgn(b.net), money1(x.pay), money1(x.tc + x.prem), x.payoff > 0.01 ? money1(x.payoff) : '–']; });
      h += UI.sheet('Your decisions', 'Year by year', UI.table(['Year', 'Mix', 'Return', 'Policy', 'Grants', 'Costs', 'Puts paid'], rows, { sticky: true, cls: 'wide-t wrap' }));
    } else h += UI.sheet('Managers', 'No results yet', '<p class="case">The league table fills in after your first year.</p>');
    const cur = KEYS.map(k => g.w[k] || 0);
    h += UI.sheet('Holdings', 'Where the fund is today', UI.chart('md-hold', () => ({ type: 'bars', groups: KEYS.map(k => A[k].short), series: [{ values: cur.map(v => v * 100), colors: KEYS.map(k => COL[k]) }], yFmt: v => v + '%' }), 200, null, 'Current weight of each asset') + '<p class="cap">Weights drift as markets move; you reset them each year.</p>');
    return h;
  }

  /* ---------- Guide ---------- */
  function guideView(g) {
    const lim = E.LIMIT[g.cfg.difficulty];
    return UI.sheet('Guide', 'How the desk works', `<div class="case"><p><strong>Real returns.</strong> The fund must pay for scholarships forever, so what matters is return after inflation. A 7% return in a year of 9% inflation loses purchasing power.</p><p><strong>Diversification.</strong> Assets that do not move together reduce risk without giving up much return. The correlation column in Markets shows how each asset moved with equities in the past.</p><p><strong>Sharpe ratio.</strong> Average return above cash divided by volatility: return earned per unit of risk.</p><p><strong>Drawdown.</strong> The fall from the fund’s highest value to a later low. Your limit is ${pct(lim)}; the board meets after any year with a loss of 10% or more.</p><p><strong>Rebalancing.</strong> Setting the mix back to target each year sells what has risen and buys what has fallen. It is a simple, disciplined way to buy low and sell high.</p><p><strong>Spending.</strong> Paying out more than the fund earns after inflation shrinks it for future students. Most endowments aim to spend 4–5%.</p><p><strong>Puts and borrowing.</strong> Puts cap equity losses at 10% for a premium paid every year. Borrowing magnifies gains and losses and costs the cash rate plus 1%.</p></div>`) +
      UI.sheet('Scoring', 'How your run is graded', UI.table(['Part', 'Weight', 'What counts'], [['Real return against the policy portfolio', '45%', 'Your yearly return after inflation, compared with 60/40'], ['Return per unit of risk', '30%', 'Your Sharpe ratio, compared with the policy portfolio'], ['Drawdown mandate', '15%', `Worst fall from a peak, against your ${pct(lim)} limit`], ['Discipline', '10%', 'Diversification, sensible trading, not panic-selling before rebounds']], { cls: 'wrap' }) + '<p class="cap">Holding more than 75% in one asset class also costs up to 15 points: an endowment that bets everything on one market is not doing its job, even when the bet pays off.</p>');
  }

  /* ---------- Debrief ---------- */
  function revealBody(g) {
    const w = W(g), st = w.story, end = g.start + g.n - 1;
    const rows = g.H.map(x => [`${yLab(x.t)} · <strong>${x.y}</strong>`].concat(KEYS.map(k => `<span class="${x.ret[k] < 0 ? 'down' : ''}">${sgn(x.ret[k])}</span>`)).concat([sgn(x.cpi)]));
    const story = st ? `<p class="rv-name">${esc(st.years)}</p><p class="rv-meta">${esc(st.title)}</p><p class="case">${esc(st.lede)}</p><ul class="steps">${st.events.map(e => `<li><strong>${esc(e[0])}</strong>: ${esc(e[1])}</li>`).join('')}</ul><p class="case"><strong>The lesson.</strong> ${esc(st.lesson)}</p>`
      : `<p class="rv-name">${g.start} to ${end}</p><p class="rv-meta">A mystery decade, drawn at random</p><ul class="steps">${g.H.map(x => `<li><strong>${x.y}</strong>: ${esc(MD.NOTES[x.y] || (x.ret.eq >= 0.15 ? 'A strong year for shares.' : x.ret.eq <= -0.1 ? 'A bad year for shares.' : 'A quieter year for markets.'))} Equities ${sgn(x.ret.eq)}, inflation ${pct1(x.cpi)}.</li>`).join('')}</ul>`;
    const goldNote = g.start < 1975 && g.start + g.n - 1 > 1933 ? '<p class="cap">In reality, Americans could not legally hold gold bullion between 1933 and the end of 1974. The simulation let you hold it, as investors in other countries could' + (g.ban ? ', until the 1933 order' : '') + '.</p>' : '';
    return `${story}${UI.table(['Year'].concat(KEYS.map(k => A[k].real)).concat(['Inflation']), rows, { sticky: true, cls: 'wide-t' })}${goldNote}<p class="rv-src">Returns: Aswath Damodaran, NYU Stern, “Historical Returns on Stocks, Bonds and Bills” (S&amp;P 500 with dividends, 3-month T-bills, 10-year Treasury bonds, Baa corporate bonds, US house prices, gold). Inflation: US consumer prices, annual average (Bureau of Labor Statistics, via officialdata.org).</p>`;
  }
  function coachNotes(g, sc) {
    const n = [], H = g.H;
    boardReview(g).forEach(b => {
      if (b.choice === 'derisk') n.push(b.eqRet > 0 ? `In year ${b.t} you cut equities after a loss; equities then returned ${sgn(b.eqRet)}. Selling after a fall usually means missing the rebound.` : `In year ${b.t} you cut equities after a loss, and equities fell another ${pct(-b.eqRet)}. It worked this time, but it rarely does on average.`);
      if (b.choice === 'dip') n.push(b.eqRet > 0 ? `In year ${b.t} you bought the dip, and equities returned ${sgn(b.eqRet)}.` : `In year ${b.t} you bought the dip, and equities fell another ${pct(-b.eqRet)}. Rebalancing into weakness needs patience.`);
    });
    const hedged = H.filter(x => x.prem > 0.01);
    if (hedged.length) { const cost = sum(hedged.map(x => x.prem)), paid = sum(H.map(x => x.payoff)); n.push(`Your puts cost ${money1(cost)} in premiums and paid out ${money1(paid)}${paid > cost ? ', a good trade over the decade' : ''}.`); }
    const infl = avg(H.map(x => x.cpi));
    if (infl > 0.05) { const cashy = avg(H.map(x => x.wT.tb + x.wT.tn)); n.push(cashy > 0.45 ? `Inflation averaged ${pct1(infl)}, and you kept about ${pct(cashy)} in cash and government bonds, which lost purchasing power.` : `Inflation averaged ${pct1(infl)}; keeping cash and bonds to about ${pct(cashy)} protected purchasing power.`); }
    if (sc.conc) n.push(`In ${sc.conc} year${sc.conc === 1 ? '' : 's'} you put more than 75% in one asset class, which cost ${Math.round(sc.concPen)} points.`);
    const spent = avg(H.map(x => x.spend));
    if (lvl(g) > 0 && Math.abs(spent - 0.045) > 0.002) n.push(`You paid out ${pct1(spent)} a year on average, against the usual 4.5%.`);
    if (sc.realRatio < 1) n.push(`After grants and inflation the fund ended at ${pct(sc.realRatio)} of its starting purchasing power.`); else n.push(`After grants and inflation the fund grew to ${pct(sc.realRatio)} of its starting purchasing power.`);
    return n.slice(0, 6);
  }
  const boardReview = g => E.boardReview(g);
  function debriefView(g) {
    const sc = E.score(g), st = E.standings(g);
    let h = `<section class="sheet result"><span class="eyebrow">Debrief · Markets Desk · ${esc(W(g).tag)}</span><div class="grade"><span class="letter">${S.grade(sc.total)}</span><div><h2>${S.gradeWord(sc.total)}</h2><span class="num">${sc.total} / 100</span></div></div><p class="case">Your fund returned ${sgn(sc.me.realCagr)} a year after inflation against ${sgn(sc.b.realCagr)} for the policy portfolio, with a worst fall of ${pct(sc.me.mdd)}.</p><div class="sparts">${sc.parts.map(p => `${UI.meter(`${p.k} <span class="cap">${p.w}%</span>`, p.v / 100, String(p.v), p.v >= 70 ? 'good' : p.v >= 50 ? '' : 'warn')}<p class="cap sp-d">${esc(p.d)}</p>`).join('')}</div>${sc.concPen ? `<p class="cap">Concentration penalty: −${Math.round(sc.concPen)} points.</p>` : ''}</section>`;
    h += UI.reveal('Which decade did you just manage?', revealBody(g), false);
    h += UI.sheet('Managers', 'Final standings', UI.table(['Fund', 'Real a year', 'Sharpe', 'Worst fall', 'Final value'], st.map(r => ({ cls: r.id === 'you' ? 'me' : '', cells: [`<i class="cdot" style="background:${r.c}" aria-hidden="true"></i>${esc(r.name)}`, sgn(r.m.realCagr), N.num(r.m.sharpe, 2), pct(r.m.mdd), money(r.V)] })), { sticky: true }) + UI.chart('md-final', () => ({ series: st.map(r => ({ values: idxSeries(r.id === 'you' ? g.H : g.rv[r.id].H), c: r.c, w: r.id === 'you' ? 3 : 1.6 })), xLabel: i => (i === 0 ? 'Start' : yLab(i)), yFmt: v => '$' + Math.round(v) }), 230, st.map(r => ({ t: r.name, c: r.c })), 'Growth of $100 for each fund'));
    h += UI.sheet('Your mix', 'How you allocated over the decade', UI.chart('md-mix', () => ({ series: KEYS.map(k => ({ values: g.H.map(x => Math.max(0, x.wT[k]) * 100), c: COL[k], w: 2 })), xLabel: i => yLab(i + 1), yMin: 0, yFmt: v => v + '%' }), 220, KEYS.map(k => ({ t: A[k].short, c: COL[k] })), 'Target weight of each asset by year'));
    const notes = coachNotes(g, sc);
    h += UI.sheet('Coach’s notes', 'What to take away', `<ul class="notes plain">${notes.map(t => `<li>${t}</li>`).join('')}</ul>`);
    h += `<div class="actions">${UI.btn('Replay this decade', 'retry-run', 'btn-primary', `data-id="${esc(S.App.cur ? S.App.cur.meta.id : '')}"`)}${UI.btn('Back to home', 'leave-run', 'btn-ghost')}</div>`;
    return h;
  }

  /* ---------- Module ---------- */
  function live(g, ctx) {
    if (done(g) || uiStr(ctx, 'tab', 'desk') !== 'desk') return {};
    return { 'md-cash': cashLine(g), 'md-warn': UI.warn(warnings(g)), 'md-lab': labHtml(g), 'md-sum': summary(g), _charts: ['md-map'] };
  }
  function csv(g) {
    const d = done(g), rows = [['Year', 'Calendar year', 'Equities', 'Govt bonds', 'Corp bonds', 'Property', 'Gold', 'Cash', 'Inflation', 'Your return', 'Policy return']];
    g.H.forEach(x => rows.push([x.t, d ? x.y : 'hidden until the end'].concat(KEYS.map(k => (x.ret[k] * 100).toFixed(2))).concat([(x.cpi * 100).toFixed(2), (x.net * 100).toFixed(2), (g.rv.bench.H[x.t - 1].net * 100).toFixed(2)])));
    return rows.map(r => r.join(',')).join('\n');
  }

  S.App.register({
    id: 'markets', cat: 'finance', title: 'Markets Desk', area: 'Financial markets', length: '10 years · 30–45 min', depth: 'Full simulation', version: 1, persist: 'replay', wide: true,
    practises: 'Portfolio management · asset allocation · risk and rebalancing',
    blurb: 'Run a $500 million endowment for ten years on the real returns of a disguised decade: equities, government and corporate bonds, property, gold and cash. Beat the policy portfolio without breaking the drawdown limit, then find out which years you lived through.',
    detail: '<p>Asset allocation on 98 years of real annual returns and inflation. Each year you read only what investors knew at the time, set the mix of six asset classes under an investment committee’s rules, and test it in a risk lab built from the record up to that year: average and real returns, volatility, Sharpe ratio, worst year, a 1-in-20 loss and a map of the best mixes in history. Trading costs, a slow-moving property allocation, protective puts, spending choices, leverage at Advanced level, board meetings after losses and four rival managers on the same markets. The debrief reveals the real years, the events behind them and every return, with sources.</p>',
    options: [
      { id: 'scenario', label: 'Decade', default: 'plateau', choices: E.SCEN.map(k => ({ v: k, t: MD.WINDOWS[k].name, s: MD.WINDOWS[k].hard ? 'Hardest' : MD.WINDOWS[k].tag })) },
      { id: 'difficulty', label: 'Difficulty', default: 'guided', choices: [{ v: 'guided', t: 'Foundation', s: 'Fixed 4.5% spending, coaching, no puts or borrowing' }, { v: 'standard', t: 'Intermediate', s: 'Choose spending and puts; 22% drawdown limit' }, { v: 'expert', t: 'Advanced', s: 'Borrowing allowed, costlier puts, 20% limit' }] }
    ],
    create: (seed, config) => E.create(seed, config),
    apply: (g, d) => E.apply(g, d),
    isDone: g => E.isDone(g),
    progress: g => (done(g) ? `${W(g).name} · complete` : `${W(g).name} · year ${g.t} of ${g.n}`),
    view(g, ctx) {
      const d = done(g);
      let tab = uiStr(ctx, 'tab', d ? 'debrief' : 'desk');
      if (d && tab === 'desk') tab = 'debrief';
      if (!d && tab === 'debrief') tab = 'desk';
      ctx.ui.tab = tab;
      let h = header(g);
      h += UI.tabs('tab', [{ v: d ? 'debrief' : 'desk', t: d ? 'Debrief' : `Year ${g.t}` }, { v: 'markets', t: 'Markets' }, { v: 'portfolio', t: 'Portfolio' }, { v: 'guide', t: 'Guide' }], tab, 'main-tabs', true);
      if (tab === 'desk') h += resultBanner(g) + deskView(g, ctx);
      else if (tab === 'markets') h += marketsView(g);
      else if (tab === 'portfolio') h += portfolioView(g);
      else if (tab === 'guide') h += guideView(g);
      else h += debriefView(g);
      return h;
    },
    live,
    onTab(g, group, value, ctx) { if (group === 'tab') ctx.ui.seenBrief = true; },
    field(g, name, value) {
      const d = g.draft; if (!d) return null;
      if (name.indexOf('w:') === 0) { const k = name.slice(2); if (RISKY.indexOf(k) < 0) return null; d.w[k] = clamp(Math.round(+value || 0), 0, 130) / 100; return null; }
      if (name === 'spend') { d.spend = E.SPEND.choices.indexOf(+value) >= 0 ? +value : E.SPEND.base; return null; }
      if (name === 'hedge') { d.hedge = E.HEDGES.indexOf(+value) >= 0 ? +value : 0; return null; }
      if (name === 'board') { d.board = ['hold', 'derisk', 'dip'].indexOf(value) >= 0 ? value : null; return { rerender: true }; }
      return null;
    },
    act(g, op, el, ctx) {
      if (op === 'csv') { S.downloadText(`halden-endowment-${done(g) ? g.start : 'decade'}.csv`, csv(g), 'text/csv'); return null; }
      const d = g.draft; if (!d) return null;
      if (op === 'preset') {
        const P = PRESETS.find(p => p.id === el.dataset.p); if (!P) return null;
        const w = P.w ? Object.assign({}, P.w) : { eq: g.w.eq || 0, tn: g.w.tn || 0, bb: g.w.bb || 0, re: g.w.re || 0, au: g.w.au || 0 };
        const fixed = E.legal(g, w, d.board);
        RISKY.forEach(k => { d.w[k] = Math.round(fixed[k] * 100) / 100; });
        const moved = P.w && Math.abs(fixed.re - P.w.re) > 0.001;
        return { rerender: true, toast: moved ? `${P.t}: property limited to ${pct(fixed.re)} this year.` : `${P.t} loaded. Adjust it as you like.` };
      }
      if (op === 'invest') {
        if (g.board.pending && !d.board) return { toast: 'Choose your recommendation to the board first.' };
        ctx.ui.seenBrief = true;
        const w = {}; RISKY.forEach(k => { w[k] = d.w[k] || 0; });
        const last = g.t === g.n;
        return { commit: { w, spend: d.spend, hedge: d.hedge, board: d.board }, top: true, toast: last ? 'The decade is over. Here is your debrief.' : `Invested for year ${g.t}.` };
      }
      return null;
    },
    summary(g) {
      const sc = E.score(g);
      return { score: sc.total, line: `${W(g).name} · real ${sgn(sc.me.realCagr)} a year vs policy ${sgn(sc.b.realCagr)} · worst fall ${pct(sc.me.mdd)}`, metrics: [{ k: 'Real return', v: sgn(sc.me.realCagr) }, { k: 'Worst fall', v: pct(sc.me.mdd) }] };
    }
  });
})();
