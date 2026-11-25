/* Product Studio: interface for the product-management simulation. The engine lives in product-engine.js. */
(function () {
  'use strict';
  const S = window.SimLab, E = window.ProductEngine, PD = window.ProductData;
  if (!S || !E || !PD) return;
  const { UI, N, U } = S;
  const esc = U.esc, clamp = U.clamp, sum = U.sum, clone = U.clone;
  const lvl = g => S.lvlOf(g);
  const done = g => E.isDone(g);
  const last = g => g.H[g.H.length - 1];
  const ui = (ctx, k, d) => (ctx.ui[k] == null || ctx.ui[k] === '' ? d : ctx.ui[k]);
  const opBtn = (label, attrs, pressed) => `<button type="button" class="chip" data-act="m" ${attrs}${pressed != null ? ` aria-pressed="${pressed}"` : ''}>${label}</button>`;
  const fbox = (label, control, liveKey, hint) => `<div class="fbox"><span class="lbl">${label}</span>${control}<span class="hint"${liveKey ? ` data-live="${liveKey}"` : ''}>${hint || ''}</span></div>`;
  const k$ = v => (Math.abs(v) >= 1000 ? N.usd(v / 1000, 2) + 'M' : N.usd(v, 0) + 'k');
  const M$ = v => N.usd(v, 2) + 'M';
  const pct = (v, d) => N.pct(v, d == null ? 0 : d);
  const CAT = PD.CATS;
  const tag = cat => `<span class="ptag" style="--tc:${CAT[cat].c}">${CAT[cat].name}</span>`;
  const STATUS = { backlog: 'In the backlog', building: 'Being built', testing: 'In test', tested: 'Test result in', shipped: 'Shipped', killed: 'Stopped after its test' };
  const ENTN = { sso: 'single sign-on', multi: 'multi-location management', api: 'an open API', audit: 'an audit log' };
  const dealOf = id => PD.DEALS.find(x => x.id === id);
  const nm = id => esc(E.IDX[id].name);
  const list = a => (a.length <= 1 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]);

  /* ---------- Effects in words ---------- */
  const FX = {
    ar: ['Activation', 'rel'], conv: ['Free-to-paid conversion', 'rel'], sr: ['Sign-up rate', 'rel'], org: ['Organic traffic', 'rel'], ref: ['Referrals', 'rel'], arpa: ['Revenue per team', 'rel'],
    cf: ['Free churn', 'pp'], cp: ['Paid churn', 'pp'], nps: ['NPS', 'pt'], debt: ['Tech debt', 'pt'], inc: ['Outage risk', 'rel'], vel: ['Team speed', 'rel']
  };
  const mag = (k, v) => { const t = FX[k][1]; return t === 'rel' ? Math.abs(v * 100).toFixed(0) : t === 'pp' ? Math.abs(v * 100).toFixed(1) : Math.abs(v).toFixed(0); };
  const unit = k => (FX[k][1] === 'rel' ? '%' : FX[k][1] === 'pp' ? ' pts' : '');
  const sgn = (k, v) => { const m = mag(k, v); return (Number(m) === 0 ? '±' : v > 0 ? '+' : '−') + m; };
  const one = (k, v) => sgn(k, v) + unit(k);
  const span = (k, lo, hi) => { const a = sgn(k, lo), b = sgn(k, hi); return a === b ? a + unit(k) : `${a} to ${b}${unit(k)}`; };
  const weight = (k, v) => Math.abs(E.valueOf({ [k]: v }));
  /* An honest band around the estimate: wider at harder levels, narrower after research. */
  function band(g, it, k) {
    const f = E.IDX[it.id].fx[k] || [0, 0], m = f[0], s = f[1];
    if (k === 'debt' || k === 'inc' || k === 'vel') return 1.28 * 0.2 * Math.abs(m) * (it.nf || 1);
    return 1.28 * E.NOISE[g.cfg.difficulty] * Math.sqrt(Math.pow(0.7 * m, 2) + Math.pow(0.92 * s, 2)) * (it.nf || 1);
  }
  function estText(g, it, max) {
    const keys = Object.keys(it.est).sort((a, b) => weight(b, it.est[b]) - weight(a, it.est[a])).slice(0, max || 2);
    const parts = keys.map(k => { const b = band(g, it, k); return `${FX[k][0]} ${span(k, it.est[k] - b, it.est[k] + b)}`; });
    if (it.tru.ent) parts.unshift(`Gives you ${ENTN[it.tru.ent]}`);
    return parts.join(' · ') || 'No measurable effect expected';
  }
  function truText(it) {
    const keys = Object.keys(it.tru).filter(k => k !== 'ent').sort((a, b) => weight(b, it.tru[b]) - weight(a, it.tru[a])).slice(0, 3);
    const parts = keys.map(k => `${FX[k][0]} ${one(k, it.tru[k])}`); if (it.tru.ent) parts.unshift(`Gave you ${ENTN[it.tru.ent]}`);
    return parts.join(' · ');
  }
  const estVal = it => E.valueOf(Object.assign({}, it.est, it.tru.ent ? { ent: it.tru.ent } : {})) / Math.max(10, it.estEffort);
  const openDealsNeeding = (g, cap) => g.ent.deals.filter(x => x.status === 'open' && dealOf(x.id).needs.indexOf(cap) >= 0 && g.ent.caps.indexOf(cap) < 0);
  function tier(g, it) {
    if (it.tru.ent) { const ds = openDealsNeeding(g, it.tru.ent); return ds.length ? `<span class="vt v-g">Needed for ${list(ds.map(x => `${esc(dealOf(x.id).name)} by Q${x.by}`))}</span>` : '<span class="vt v-m">No signed-up customer is waiting for this yet</span>'; }
    const v = estVal(it);
    return v >= 9 ? '<span class="vt v-s">Strong case for the effort</span>' : v >= 5 ? '<span class="vt v-g">Good case for the effort</span>' : v >= 2.5 ? '<span class="vt v-m">Modest case for the effort</span>' : '<span class="vt v-w">Weak case for the effort</span>';
  }

  /* ---------- Planning arithmetic (estimates only: true efforts stay hidden until work starts) ---------- */
  function eventOpt(g) { const ev = E.eventOf(g), d = g.draft; return ev && d ? ev.opts.find(o => o.v === d.event) || null : null; }
  const capNow = g => { const o = eventOpt(g); return E.capacity(g, o && o.cap ? o.cap : 0, g.draft.hires); };
  const planIds = g => E.plan(g, g.draft);
  const needOf = (g, id) => E.estRemaining(g, id, E.testMode(g, g.draft, id));
  const demand = g => sum(planIds(g).map(id => needOf(g, id)));
  function pending(g) {
    const d = g.draft, out = [];
    if (E.eventOf(g) && !d.event) out.push('the inbox question');
    E.dealsOpen(g).forEach(x => { if (!(d.deals || {})[x.id]) out.push(`${dealOf(x.id).name}’s request`); });
    return out;
  }

  /* ---------- Header and brief ---------- */
  function header(g) {
    const d = done(g), L = last(g), tgt = E.TARGET[g.cfg.difficulty] / 1000, arr = L ? L.arr : E.ARR0;
    return `<section class="sheet hdr"><div class="hdr-top"><div class="sh"><span class="eyebrow">${d ? 'Debrief' : `Quarter ${g.q} of ${g.n} · planning`}</span><h2>Shiftwise</h2></div><div class="hdr-pills">${UI.pill('Head of product', 'neutral')}${UI.level(g.cfg.difficulty)}</div></div>${UI.kpis([
      { k: 'ARR', v: M$(arr), d: `target ${M$(tgt)}`, cls: arr >= tgt ? 'up' : '' },
      { k: 'Paying teams', v: N.int(L ? L.AP : g.pools.AP), d: L ? `${pct(L.cp, 1)} churn a month` : `${N.int(g.pools.AF)} on the free plan` },
      { k: 'NPS', v: N.int(g.nps), d: L && L.incident ? '<span class="down">outage last quarter</span>' : 'started at 22' },
      { k: 'Cash', v: k$(g.cash), d: L ? `${L.rev >= L.costs ? 'profit' : 'burn'} ${k$(Math.abs(L.costs - L.rev))} last quarter` : 'in the bank', cls: g.cash < 1500 ? 'down' : '' }
    ])}</section>`;
  }
  function caseBrief(g, open) {
    const tgt = E.TARGET[g.cfg.difficulty] / 1000;
    return UI.brief('Shiftwise', open, `<p>You have just joined <strong>Shiftwise</strong>, a staff-scheduling app for cafés, clinics and shops, as head of product. About 4,000 teams pay $4 a seat a month and 8,000 more use the free plan, which allows up to 10 staff. Annual recurring revenue (ARR) is ${M$(E.ARR0)}. The board wants <strong>${M$(tgt)} within eight quarters</strong>, without wrecking the product, the team or the bank balance.</p><p>You have ten engineers. Each quarter you choose what they build from a backlog of 26 ideas. Every idea has a <strong>true impact you cannot see</strong>. You see an estimate and how confident it is. Research narrows the estimates. An <strong>A/B test</strong> builds a cheap version first and measures it, with real statistical noise.</p><ul class="steps"><li>Every feature adds tech debt. Debt slows the team and makes outages more likely; platform work pays it down.</li><li>Large customers will want enterprise features by a deadline. Win the deal and the revenue is large; miss it and sales stops trusting you.</li><li>The founder, the board, engineering, sales and the market will all make demands. Not all of them are right.</li></ul>`, 'Your job is not to build the most. It is to build the right things, and to find out which those are.');
  }

  /* ---------- Inbox ---------- */
  function inbox(g) {
    const ev = E.eventOf(g), d = g.draft; let h = '';
    if (ev) h += UI.sheet(`Inbox · ${esc(ev.who)}`, esc(ev.title), `<p class="case">${esc(ev.text)}</p>${UI.chips('event', 'Your response', ev.opts.map(o => ({ v: o.v, t: o.t, s: o.s })), d.event || '')}`);
    E.dealsOpen(g).forEach(x => {
      const D = dealOf(x.id), have = D.needs.filter(k => g.ent.caps.indexOf(k) >= 0);
      h += UI.sheet('Inbox · Sales', `${esc(D.name)} wants to sign`, `<p class="case">${esc(D.name)}, ${esc(D.what)}, would pay about <strong>${k$(D.arr)} a year</strong> if you deliver ${list(D.needs.map(k => ENTN[k]))} by the end of quarter ${D.by}. ${have.length ? `You already have ${list(have.map(k => ENTN[k]))}.` : 'You have none of it yet.'} Sales says customers like this usually sign once the features are live.</p>${UI.chips(`deal:${D.id}`, 'Your answer', [{ v: 'commit', t: `Commit to Q${D.by}`, s: 'Sales trust rises' }, { v: 'later', t: `Ask for Q${D.by + 1}`, s: 'One more quarter; sales trust dips' }, { v: 'decline', t: 'Decline', s: 'Sales trust falls' }], (d.deals || {})[D.id] || '')}`);
    });
    const open = g.ent.deals.filter(x => x.status === 'open');
    if (open.length) h += UI.sheet('Enterprise', 'Deals you have promised', UI.table(['Customer', 'Needs', 'By', 'Worth a year'], open.map(x => { const D = dealOf(x.id); return [esc(D.name), D.needs.map(k => `${g.ent.caps.indexOf(k) >= 0 ? '✓' : '○'} ${ENTN[k]}`).join('<br>'), `Q${x.by}`, k$(D.arr)]; }), { sticky: true, cls: 'wrap txt' }) + '<p class="cap">The deal closes as soon as everything it needs has shipped. If the deadline passes first, the customer walks away.</p>');
    return h;
  }

  /* ---------- Research ---------- */
  const rOpts = g => g.order.map(id => g.items[id]).filter(it => ['backlog', 'building', 'tested'].indexOf(it.status) >= 0);
  function rTarget(g, ctx) { const o = rOpts(g), t = ctx.ui.rtarget; return o.some(it => it.id === t) ? t : (o[0] ? o[0].id : null); }
  function discovery(g, ctx) {
    const left = E.slots(g), all = E.SLOTS[g.cfg.difficulty], tgt = rTarget(g, ctx);
    const sel = `<select class="ti" data-field="rtarget" aria-label="Backlog idea to ask customers about">${rOpts(g).map(it => `<option value="${it.id}"${it.id === tgt ? ' selected' : ''}>${nm(it.id)}</option>`).join('')}</select>`;
    const cards = PD.RESEARCH.map(r => `<div class="rs"><div class="rs-t"><strong>${esc(r.name)}</strong><span class="cap">${esc(r.what)}</span>${r.id === 'interviews' ? sel : ''}</div>${opBtn(left > 0 ? 'Run' : 'Used up', `data-op="research" data-m="${r.id}"${left > 0 ? '' : ' disabled'}`)}</div>`).join('');
    const logs = g.research.log.slice().reverse().slice(0, 6).map(l => `<li><strong>Q${l.q} · ${esc(PD.RESEARCH.find(r => r.id === l.method).name)}.</strong> ${esc(l.text)}</li>`).join('');
    return UI.sheet(`Research · ${left} of ${all} slot${all === 1 ? '' : 's'} left this quarter`, 'Find out before you build', `<div class="rss">${cards}</div>${logs ? `<span class="eyebrow">Findings so far</span><ul class="steps">${logs}</ul>` : '<p class="cap">Research happens at once and costs no engineering time. Findings appear here and on the backlog ideas they concern.</p>'}`);
  }
  function testsSheet(g) {
    const items = g.order.map(id => g.items[id]).filter(it => it.status === 'tested'); if (!items.length) return '';
    const d = g.draft;
    return UI.sheet('Experiments', 'A/B test results to act on', items.map(it => {
      const t = it.test, k = t.k, lo = t.meas - 1.96 * t.se, hi = t.meas + 1.96 * t.se, down = k === 'cf' || k === 'cp' || k === 'debt';
      const good = down ? t.meas < 0 : t.meas > 0, sig = down ? hi < 0 : lo > 0, bad = down ? lo > 0 : hi < 0;
      const verdict = sig ? '<span class="up">a real improvement</span>' : bad ? '<span class="down">it made things worse</span>' : good ? 'positive, but it could be noise' : '<span class="down">no improvement</span>';
      const body = it.shipQueued ? `<p class="cap">Being built in full: about ${N.int(E.remaining(g, it.id))} points left.</p>` : UI.chips(`decide:${it.id}`, null, [{ v: 'ship', t: 'Build it in full', s: `about ${N.int(E.remaining(g, it.id))} more points` }, { v: 'kill', t: 'Stop it', s: 'no more effort' }, { v: 'hold', t: 'Decide later', s: 'leave it as it is' }], (d.decide || {})[it.id] || 'hold');
      return `<div class="tres"><div><strong>${nm(it.id)}</strong><span class="cap">${FX[k][0]}: measured ${one(k, t.meas)}, 95% interval ${span(k, lo, hi)}. Verdict: ${verdict}.</span></div>${body}</div>`;
    }).join('') + '<p class="cap">The interval shows how precise the measurement is. If it includes zero, the effect you saw could be chance.</p>');
  }

  /* ---------- Plan and backlog ---------- */
  function warnings(g) {
    if (lvl(g) !== 0) return '';
    const d = g.draft, w = [], cap = capNow(g), dem = demand(g), ids = planIds(g);
    if (dem > cap * 1.3) w.push({ t: 'bad', m: `The plan asks for ${N.int(dem)} points from a team that can deliver about ${N.int(cap)}. More than 30% over means late nights: morale falls and people may quit.` });
    const big = d.roadmap.map(id => g.items[id]).filter(it => it && it.status === 'backlog' && it.conf === 'low' && it.estEffort >= 80 && !d.tests[it.id]);
    if (big.length) w.push({ m: `${list(big.map(it => nm(it.id)))} ${big.length === 1 ? 'is' : 'are'} large and the estimate is rough. Interview customers before you commit a quarter of the team.` });
    if (g.debt >= 65) w.push({ m: `Tech debt is ${N.int(g.debt)} of 100. It is costing about ${pct(g.debt / 200)} of the team’s capacity, and the chance of an outage this quarter is about ${pct(E.outageRisk(g))}. Platform work pays it down.` });
    g.ent.deals.filter(x => x.status === 'open').forEach(x => {
      const D = dealOf(x.id), off = D.needs.filter(k => g.ent.caps.indexOf(k) < 0).map(k => E.ITEMS.find(it => it.fx.ent === k).id).filter(id => ids.indexOf(id) < 0 && g.items[id].status !== 'shipped');
      if (off.length && x.by - g.q <= 1) w.push({ t: 'warn', m: `${esc(D.name)} needs ${list(off.map(nm))} by the end of Q${x.by}, and ${off.length === 1 ? 'it is' : 'they are'} not in this quarter’s plan.` });
    });
    if (E.slots(g) > 0 && g.q < g.n) w.push({ t: 'info', m: `You have ${E.slots(g)} research slot${E.slots(g) === 1 ? '' : 's'} left this quarter. Research is free; building the wrong thing is not.` });
    return UI.warn(w);
  }
  function capBlock(g) {
    const cap = capNow(g), dem = demand(g), f = dem / Math.max(1, cap);
    const msg = f > 1.3 ? '<strong class="down">More than 30% over capacity: the team will work late, morale will fall, and the bottom of the list will still slip.</strong>' : f > 1 ? 'Slightly over capacity: whatever is at the bottom of the list carries over to next quarter.' : f < 0.75 ? 'Spare capacity is wasted: add more work, or pay down tech debt.' : 'A full plan the team can deliver.';
    return `${UI.meter('Planned work', Math.min(1, f), `${N.int(dem)} of ${N.int(cap)} pts`, f > 1.3 ? 'bad' : f > 1 ? 'warn' : 'good')}<p class="cap">${msg} Points are the team’s estimates; real work can run longer or shorter. Capacity falls when tech debt is high or morale is low (debt ${N.int(g.debt)}, morale ${N.int(g.team.morale)}).</p>${warnings(g)}`;
  }
  function itemCard(g, it, o) {
    const I = E.IDX[it.id], d = g.draft, isTest = E.testMode(g, d, it.id), need = needOf(g, it.id);
    const conf = `<span class="conf c-${it.conf}">${it.conf} confidence</span>`;
    let ctl = '';
    if (o.road) ctl = `${opBtn('↑', `data-op="up" data-id="${it.id}" aria-label="Move ${esc(I.name)} up"${o.first ? ' disabled' : ''}`)}${opBtn('↓', `data-op="down" data-id="${it.id}" aria-label="Move ${esc(I.name)} down"${o.lastOne ? ' disabled' : ''}`)}${opBtn('Remove', `data-op="rm" data-id="${it.id}"`)}`;
    else if (!o.fixed) ctl = opBtn('Add to plan', `data-op="add" data-id="${it.id}"`);
    if (I.test && it.status === 'backlog' && !o.fixed) ctl += opBtn(d.tests[it.id] ? 'A/B test first ✓' : 'A/B test first', `data-op="test" data-id="${it.id}"`, !!d.tests[it.id]);
    const st = it.status === 'building' ? `${it.testing ? 'test version' : 'being built'}, ${N.int(it.prog)} pts done` : '';
    const effort = it.status === 'backlog' ? `About ${N.int(need)} pts${isTest ? ' for the test version' : ''}` : `${N.int(need)} pts left`;
    return `<div class="pitem${o.road || o.fixed ? ' in' : ''}${o.over ? ' over' : ''}"><div class="pi-top">${o.n ? `<span class="pi-n num">${o.n}</span>` : ''}<strong class="pi-t">${esc(I.name)}</strong>${tag(I.cat)}</div>${o.why ? `<p class="pi-m"><strong>${o.why}</strong></p>` : ''}<p class="pi-w">${esc(I.what)} <span class="pi-src">Asked for by ${esc(I.ask)}.</span></p><p class="pi-e">${estText(g, it)} ${conf}</p><p class="pi-m">${effort}${st ? ' · ' + st : ''}${lvl(g) === 0 ? ' · ' + tier(g, it) : ''}${o.over ? ' · <span class="down">beyond this quarter’s capacity</span>' : ''}${it.notes.length ? `<br>${esc(it.notes[it.notes.length - 1])}` : ''}</p>${ctl ? `<div class="chips sm">${ctl}</div>` : ''}</div>`;
  }
  function roadmap(g, ctx) {
    const d = g.draft, cap = capNow(g), ids = planIds(g), opt = eventOpt(g);
    let cum = 0;
    const cards = ids.map((id, i) => {
      const it = g.items[id], ri = d.roadmap.indexOf(id), need = needOf(g, id), over = cum >= cap; cum += need;
      const why = it.status === 'tested' ? 'Finishing after its test' : ri < 0 && opt && opt.add === id ? 'Added by your answer in the inbox' : '';
      return itemCard(g, it, { n: i + 1, road: ri >= 0, fixed: ri < 0, first: ri === 0, lastOne: ri === d.roadmap.length - 1, over, why });
    });
    const filt = ui(ctx, 'ifilter', 'all');
    const avail = g.order.map(id => g.items[id]).filter(it => ['backlog', 'building'].indexOf(it.status) >= 0 && ids.indexOf(it.id) < 0);
    const counts = {}; avail.forEach(it => { const c = E.IDX[it.id].cat; counts[c] = (counts[c] || 0) + 1; });
    const f2 = filt !== 'all' && !counts[filt] ? 'all' : filt;
    const pool = avail.filter(it => f2 === 'all' || E.IDX[it.id].cat === f2);
    if (lvl(g) === 0) pool.sort((a, b) => estVal(b) - estVal(a));
    const chips = `<div class="chips sm" role="group" aria-label="Filter the backlog">${[{ v: 'all', t: `All ${avail.length}` }].concat(Object.keys(CAT).filter(k => counts[k]).map(k => ({ v: k, t: `${CAT[k].name} ${counts[k]}` }))).map(c => `<button type="button" class="chip" data-act="tab" data-group="ifilter" data-value="${c.v}" aria-pressed="${c.v === f2}">${c.t}</button>`).join('')}</div>`;
    return UI.sheet(`Quarter ${g.q} · plan`, 'What the team builds this quarter', `<div class="capb" data-live="pm-cap">${capBlock(g)}</div>${cards.length ? `<div class="pitems">${cards.join('')}</div>` : '<p class="case">Nothing is planned yet. Add ideas from the backlog below, most important first. The team works down the list in order.</p>'}`) +
      UI.sheet('Backlog', `${avail.length} idea${avail.length === 1 ? '' : 's'} not yet planned`, `${chips}${pool.length ? `<div class="pitems">${pool.map(it => itemCard(g, it, {})).join('')}</div>` : '<p class="cap">Nothing left in this group.</p>'}<p class="cap">${lvl(g) === 0 ? 'Sorted by estimated value for the effort, on what you know now. ' : ''}Ranges show where the true effect probably lies. Ideas that someone is pushing hard can be over-sold.</p>`);
  }

  /* ---------- Growth, pricing and hiring ---------- */
  function mkHint(g) { const mk = (+g.draft.marketing || 0) / 3; if (mk <= 0) return 'Organic and referral sign-ups only'; const cpc = 4 * Math.pow(Math.max(1, mk) / 30, 0.4); return `about ${N.int(mk * 1000 / cpc)} paid visitors a month at $${cpc.toFixed(2)} each`; }
  function hireHint(g) { const h = +g.draft.hires || 0; return h > 0 ? `${h} more at half speed this quarter; ${k$(h * (E.ENG_COST + E.HIRE_COST))} this quarter` : h < 0 ? `saves ${k$(-h * E.ENG_COST)} a quarter; morale falls` : `${g.team.eng} engineers at ${k$(E.ENG_COST)} a quarter each`; }
  const money = p => '$' + (p % 1 ? p.toFixed(2) : p);
  function growthSheet(g) {
    const d = g.draft, L = last(g), ev = E.eventOf(g), cur = g.pricing.price;
    const prices = (E.PRICES.indexOf(cur) < 0 ? [cur] : []).concat(E.PRICES).map(p => ({ v: String(p), t: money(p), s: p === cur ? 'current' : p > cur ? 'fewer upgrades; some customers leave' : 'more upgrades; less per team' }));
    const lims = ['5', '10', '20', 'unlimited'].map(v => ({ v, t: v === 'unlimited' ? 'No limit' : `${v} staff`, s: v === g.pricing.limit ? 'current' : (v === 'unlimited' || (g.pricing.limit !== 'unlimited' && +v > +g.pricing.limit)) ? 'more sign-ups, fewer upgrades' : 'more upgrades, fewer sign-ups' }));
    const lockP = ev && ev.id === 'price', lockL = ev && ev.id === 'freetier';
    return UI.sheet('Growth and pricing', 'Marketing, price, free plan and hiring', `<div class="pgrid">${fbox('Paid marketing this quarter', UI.num('marketing', d.marketing, { min: 0, max: 600, step: 30, pre: '$', unit: 'k', label: 'Paid marketing this quarter' }), 'pm-mk', mkHint(g))}${fbox('Engineers to hire (or let go)', UI.num('hires', d.hires, { min: -3, max: 4, step: 1, label: 'Engineers to hire or let go' }), 'pm-hire', hireHint(g))}</div>${lockP ? '<p class="cap">The board’s pricing question is in the inbox this quarter.</p>' : UI.chips('price', 'Pro price per seat a month', prices, String(d.price))}${lockL ? '<p class="cap">The free-plan question is in the inbox this quarter.</p>' : UI.chips('limit', 'Free plan limit', lims, String(d.limit))}<p class="cap">${L ? `Last quarter: ${N.int(L.visitors)} visitors, ${N.int(L.signups)} sign-ups, ${N.int(L.activated)} teams activated and ${N.int(L.conversions)} upgrades to paid.` : 'Funnel results appear after the first quarter.'} Raising the price for existing customers causes a burst of cancellations.</p>`);
  }

  /* ---------- Plan tab ---------- */
  function resultBanner(g) {
    const L = last(g); if (!L) return '';
    const p = [`ARR reached <strong>${M$(L.arr)}</strong> with ${N.int(L.AP)} paying teams.`];
    p.push(L.shipped.length ? `You shipped ${list(L.shipped.map(id => `<strong>${nm(id)}</strong>`))}.` : 'Nothing shipped.');
    if (L.tested.length) p.push(`A/B test results came in for ${list(L.tested.map(nm))}.`);
    if (L.carried && L.carried.length) p.push(`Still in progress: ${list(L.carried.map(nm))}.`);
    if (L.incident) p.push('<strong class="down">An outage took the product down for most of a day.</strong>');
    if (L.crunch) p.push('The team worked late to keep up.');
    if (L.left) p.push('<span class="down">An engineer resigned.</span>');
    (L.dealNews || []).forEach(x => { const D = dealOf(x.id); p.push(x.win ? `<strong class="up">${esc(D.name)} signed: +${k$(D.arr)} ARR.</strong>` : `<span class="down">${esc(D.name)} walked away.</span>`); });
    return `<section class="sheet result"><span class="eyebrow">Quarter ${L.q} results</span><p class="case">${p.join(' ')}</p></section>`;
  }
  function planView(g, ctx) {
    let h = resultBanner(g);
    if (g.q === 1) h += caseBrief(g, !ctx.ui.seenBrief);
    h += inbox(g) + testsSheet(g) + discovery(g, ctx) + roadmap(g, ctx) + growthSheet(g);
    const wait = pending(g);
    h += `<section class="sheet"><div class="actions"><button type="button" class="btn btn-primary btn-block" data-act="m" data-op="submit"${wait.length ? ' disabled' : ''}>${g.q === g.n ? 'Close the final quarter' : `Close quarter ${g.q}`}</button></div><p class="cap">${wait.length ? `<strong>Answer ${list(wait)} first.</strong> ` : ''}The quarter then plays out month by month. Research happens at once; everything else takes effect when you close the quarter.</p></section>`;
    return h;
  }

  /* ---------- Metrics, backlog, team and guide tabs ---------- */
  function metricsView(g) {
    const H = g.H; if (!H.length) return UI.sheet('Metrics', 'No results yet', '<p class="case">Your funnel, revenue and health figures appear after the first quarter.</p>');
    const tgt = E.TARGET[g.cfg.difficulty] / 1000, n = g.n;
    let h = UI.sheet('Revenue', 'ARR against the board’s path', UI.chart('pm-arr', () => ({ series: [{ values: [E.ARR0].concat(H.map(x => x.arr)), c: 'var(--c-you)', w: 2.6, dots: true }, { values: Array.from({ length: n + 1 }, (_, i) => E.ARR0 * Math.pow(tgt / E.ARR0, i / n)), c: 'var(--ink-3)', w: 1.4, dash: true, noDot: true }], xLabel: i => (i === 0 ? 'Start' : 'Q' + i), yMin: 0, yFmt: v => '$' + v.toFixed(1) + 'M' }), 220, [{ t: 'Your ARR', c: 'var(--c-you)' }, { t: 'Steady path to the target', c: 'var(--ink-3)' }], 'ARR by quarter against the path to the target'));
    const row = (k, f, cls) => ({ cls: cls || '', cells: [k].concat(H.map(f)) });
    h += UI.sheet('Funnel', 'Quarter by quarter', UI.table([''].concat(H.map(x => 'Q' + x.q)), [
      row('Visitors', x => N.int(x.visitors)), row('Sign-ups', x => N.int(x.signups)), row('Visitor to sign-up', x => pct(x.sr, 1)), row('Activation', x => pct(x.ar)), row('Teams activated', x => N.int(x.activated)),
      row('Upgrades to paid', x => N.int(x.conversions), 'sep'), row('Upgrade rate a month', x => pct(x.conv, 1)), row('Free churn a month', x => pct(x.cf, 1)), row('Paid churn a month', x => pct(x.cp, 1)), row('Free teams', x => N.int(x.AF)), row('Paying teams', x => N.int(x.AP)),
      row('MRR', x => k$(x.mrr), 'sep'), row('ARR', x => M$(x.arr)), row('Revenue', x => k$(x.rev)), row('Costs', x => k$(x.costs)), row('Marketing', x => k$(x.marketing)), row('Cash', x => k$(x.cash)),
      row('NPS', x => N.int(x.nps), 'sep'), row('Tech debt', x => N.int(x.debt)), row('Morale', x => N.int(x.morale)), row('Engineers', x => String(x.eng)), row('Price a seat', x => money(x.price)), row('Free limit', x => (x.limit === 'unlimited' ? 'none' : x.limit))
    ], { sticky: true }));
    h += UI.sheet('Health', 'Satisfaction and tech debt', UI.chart('pm-health', () => ({ series: [{ values: [22].concat(H.map(x => x.nps)), c: 'var(--good)', w: 2 }, { values: [45].concat(H.map(x => x.debt)), c: 'var(--bad)', w: 2 }], xLabel: i => (i === 0 ? 'Start' : 'Q' + i), yFmt: v => Math.round(v) }), 200, [{ t: 'NPS', c: 'var(--good)' }, { t: 'Tech debt', c: 'var(--bad)' }], 'NPS and tech debt by quarter'));
    return h;
  }
  function backlogView(g) {
    const order = ['shipped', 'tested', 'building', 'backlog', 'killed'];
    const rows = g.order.map(id => g.items[id]).sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status)).map(it => [`${nm(it.id)}<br>${tag(E.IDX[it.id].cat)}`, `${STATUS[it.status]}${it.status === 'shipped' ? ` in Q${it.shippedQ}` : ''}`, `${estText(g, it, 3)}<br><span class="conf c-${it.conf}">${it.conf} confidence</span>`, it.status === 'backlog' ? `about ${it.estEffort}` : it.status === 'shipped' || it.status === 'killed' ? '–' : `${N.int(E.remaining(g, it.id, E.testMode(g, g.draft || {}, it.id)))} left`, it.notes.map(esc).join('<br>') || '–']);
    return UI.sheet('Backlog', 'Every idea and what you know about it', UI.table(['Idea', 'Status', 'Your estimate', 'Points', 'Research notes'], rows, { sticky: true, cls: 'wrap txt' }));
  }
  function teamView(g) {
    const t = g.trust, cap = E.capacity(g, 0, 0), risk = E.outageRisk(g);
    return UI.sheet('Team', 'Engineering', UI.kpis([{ k: 'Engineers', v: String(g.team.eng) }, { k: 'Capacity', v: `${N.int(cap)} pts`, d: 'a quarter, at today’s debt and morale' }, { k: 'Morale', v: N.int(g.team.morale), d: 'of 100' }, { k: 'Tech debt', v: N.int(g.debt), d: lvl(g) < 2 ? `about ${pct(risk)} outage risk a quarter` : `${g.incidents} outage${g.incidents === 1 ? '' : 's'} so far` }])) +
      UI.sheet('Stakeholders', 'How much they trust you', `<div class="meters">${[['Founder and board', t.ceo], ['Sales', t.sales], ['Engineering', t.eng], ['Customers', t.cust]].map(x => UI.meter(x[0], x[1] / 100, N.int(x[1]), x[1] >= 60 ? 'good' : x[1] >= 40 ? '' : 'warn')).join('')}</div><p class="cap">Trust rises when you deliver what people need and falls when you overrule them or let them down. Sales trust changes your chance of closing enterprise deals.</p>`);
  }
  function guideView() {
    return UI.sheet('Guide', 'Product management in brief', `<div class="case"><p><strong>The funnel.</strong> Visitors sign up, activate (set up a real rota), and some upgrade to paid. Churn removes teams every month. Revenue depends on every step, so find the biggest leak first.</p><p><strong>Estimates and confidence.</strong> Every idea comes with an estimate and a range. Low confidence means the true effect could be far smaller, or larger. The ideas that stakeholders push hardest are often over-sold.</p><p><strong>Research.</strong> Interviews test one idea. A usability test finds the biggest stumbling block for new users. Funnel analysis compares each step with similar products. A survey shows what drives satisfaction. A pricing study shows how buyers react to price. A competitor teardown hints at what the rival will do next.</p><p><strong>A/B tests.</strong> Build a cheap version first (about 40% of the effort), show it to half of the users and measure. The result is noisy: if the 95% interval includes zero, you cannot be sure the idea works. Then build it in full (about 60% more) or stop it.</p><p><strong>Tech debt.</strong> Every feature adds some. Debt slows the team and raises the risk of outages, which push up churn and pull down NPS. Platform work pays it down.</p><p><strong>Pricing.</strong> A higher price raises revenue per team but lowers upgrades, and raising prices for existing customers causes a burst of cancellations. The free-plan limit trades sign-ups against upgrades.</p><p><strong>Paid marketing.</strong> It buys visitors at a cost that rises the more you spend. It only pays if activation, upgrades and retention are good enough to earn the money back.</p></div>`) +
      UI.sheet('Scoring', 'How your run is graded', UI.table(['Part', 'Weight', 'What counts'], [['ARR against target', '30%', 'Annual recurring revenue after eight quarters'], ['Capital efficiency', '15%', 'Cash burned for each dollar of new ARR'], ['Retention', '15%', 'How many paying teams you keep'], ['Customer satisfaction', '10%', 'NPS at the end'], ['Team and platform health', '10%', 'Tech debt, morale and outages'], ['Product judgement', '20%', 'Whether what you shipped was truly valuable, and how well you used research and tests']], { cls: 'wrap txt' }));
  }

  /* ---------- Debrief ---------- */
  function debriefView(g, ctx) {
    const sc = E.score(g), L = last(g);
    let h = `<section class="sheet"><header class="sh"><span class="eyebrow">Debrief · Product Studio</span></header><div class="grade"><span class="letter" aria-label="Grade ${S.grade(sc.total)}"><span class="hl draw">${S.grade(sc.total)}</span></span><div class="grade-txt"><span class="h2">${S.gradeWord(sc.total)}</span><span class="score num">${sc.total} / 100</span></div></div><p class="case">ARR ended at <strong>${M$(sc.arr)}</strong> against a target of ${M$(sc.target)}, with ${N.int(L.AP)} paying teams, an NPS of ${N.int(L.nps)} and ${k$(g.cash)} in the bank.</p><div class="sparts">${sc.parts.map(p => `${UI.meter(`${p.k} <span class="cap">${p.w}%</span>`, p.v / 100, String(p.v), p.v >= 70 ? 'good' : p.v >= 50 ? '' : 'warn')}<p class="cap sp-d">${esc(p.d)}</p>`).join('')}</div></section>`;
    const won = {}; g.ent.deals.forEach(x => { if (x.won) dealOf(x.id).needs.forEach(k => { won[k] = true; }); });
    const ranked = g.order.map(id => g.items[id]).map(it => ({ it, pe: E.valueOf(it.tru, won) / Math.max(10, it.effort) })).sort((a, b) => b.pe - a.pe);
    const rows = ranked.map((x, i) => ({ cls: x.it.status === 'shipped' ? 'me' : '', cells: [`<span class="rk num">${i + 1}</span>${nm(x.it.id)}`, truText(x.it) || 'No measurable effect', `${N.int(x.it.effort)} <span class="cap">(est. ${x.it.estEffort})</span>`, x.it.status === 'shipped' ? `Shipped Q${x.it.shippedQ}` : STATUS[x.it.status]] }));
    const tests = g.tests.length ? `<p class="case"><strong>Your experiments.</strong> What each test measured, and the true effect it was trying to measure.</p>${UI.table(['Test', 'Measured', 'True effect', 'Decision'], g.tests.map(t => [nm(t.id), `${FX[t.k][0]} ${one(t.k, t.meas)} <span class="cap">± ${mag(t.k, 1.96 * t.se)}${unit(t.k)}</span>`, one(t.k, t.tru), g.items[t.id].status === 'shipped' ? 'Built in full' : g.items[t.id].status === 'killed' ? 'Stopped' : 'Undecided']), { sticky: true, cls: 'wrap txt' })}` : '';
    h += UI.reveal('What every idea was really worth', `<p class="case">All 26 ideas, ranked by their true value for the effort in this run. What you shipped is highlighted. Compare the true effects with the estimates you were given: the ideas pushed hardest by the founder and the feedback board were the most over-sold.</p>${UI.table(['Idea', 'True effect', 'True effort', 'Outcome'], rows, { sticky: true, cls: 'wrap txt' })}${tests}<p class="rv-src">Shiftwise, its customers and its numbers are invented. The true effects were drawn at random for this run from ranges set for each idea, so another run ranks the backlog differently. Replay this run to try another strategy against the same hidden truth.</p>`, false, 'The hidden truth');
    h += metricsView(g);
    const notes = [];
    const pets = ['ai', 'chat', 'dark'].filter(id => g.items[id].status === 'shipped');
    if (pets.length) notes.push(`You shipped ${list(pets.map(id => E.IDX[id].name))}. ${pets.length === 1 ? 'It' : 'They'} came with inflated estimates from loud supporters; the table above shows what ${pets.length === 1 ? 'it' : 'they'} really did.`);
    const best = ranked.find(x => ['backlog', 'building'].indexOf(x.it.status) >= 0 && !x.it.tru.ent);
    if (best) notes.push(`The most valuable idea you never finished was ${E.IDX[best.it.id].name}.`);
    notes.push(g.research.used ? `You ran ${g.research.used} piece${g.research.used === 1 ? '' : 's'} of research.` : 'You never ran any research, so every build decision rested on first estimates.');
    const fp = g.tests.filter(t => { const down = t.k === 'cf' || t.k === 'cp'; return g.items[t.id].status === 'shipped' && (down ? t.tru >= 0 : t.tru <= 0); }).length;
    const fn = g.tests.filter(t => { const down = t.k === 'cf' || t.k === 'cp'; return g.items[t.id].status === 'killed' && (down ? t.tru < -0.001 : t.tru > 0.02); }).length;
    if (fp) notes.push(`${fp} test${fp === 1 ? '' : 's'} looked good enough to build in full, but the true effect was not positive.`);
    if (fn) notes.push(`You stopped ${fn} idea${fn === 1 ? '' : 's'} after a test even though ${fn === 1 ? 'it' : 'they'} really worked: a noisy result can hide a real gain.`);
    if (!g.tests.length) notes.push('You never ran an A/B test. Testing a cheap version first protects you from building expensive ideas that do not work.');
    if (g.incidents >= 2) notes.push(`${g.incidents} outages pushed churn up and NPS down. High tech debt makes them more likely.`);
    const lost = g.ent.deals.filter(x => x.status === 'lost').length, wonN = g.ent.deals.filter(x => x.won).length;
    if (wonN) notes.push(`You won ${wonN} enterprise deal${wonN === 1 ? '' : 's'}, worth ${k$(sum(g.ent.deals.filter(x => x.won).map(x => dealOf(x.id).arr)))} a year.`);
    if (lost) notes.push(`${lost} enterprise deal${lost === 1 ? '' : 's'} you promised slipped away.`);
    h += UI.sheet('Coach’s notes', 'What to take away', `<ul class="notes plain">${notes.map(t => `<li>${esc(t)}</li>`).join('')}</ul>`);
    h += `<div class="actions">${UI.btn('Replay with the same hidden truth', 'retry-run', 'btn-primary', `data-id="${esc(ctx.meta ? ctx.meta.id : '')}"`)}${UI.btn('Back to home', 'leave-run', 'btn-ghost')}</div>`;
    return h;
  }

  /* ---------- Module ---------- */
  function live(g, ctx) { if (done(g) || ui(ctx, 'tab', 'plan') !== 'plan') return {}; return { 'pm-cap': capBlock(g), 'pm-mk': mkHint(g), 'pm-hire': hireHint(g) }; }
  S.App.register({
    id: 'product', cat: 'marketing', title: 'Product Studio', area: 'Product management', length: '8 quarters · 30–45 min', depth: 'Full simulation', version: 1, persist: 'replay', wide: true,
    practises: 'Product management courses · discovery, experimentation, prioritisation and pricing cases',
    blurb: 'Run product for a scheduling app with 4,000 paying teams. Choose what ten engineers build from 26 ideas whose true value is hidden, use research and A/B tests to find out what matters, and manage tech debt, pricing and enterprise deals to hit the board’s revenue target.',
    detail: '<p>A month-by-month funnel (traffic, sign-up, activation, upgrade, churn and revenue) driven by what you ship. Every backlog idea has a hidden true effect and an estimate whose accuracy depends on your level. Research narrows estimates, and A/B tests measure ideas with real statistical noise. Engineering capacity falls with tech debt and low morale, and debt raises the risk of outages. You also set price and free-plan limits, buy traffic at rising cost, hire, and decide which enterprise deals to promise. Each quarter brings a demand from the founder, the market, engineering, the board or legal. The debrief reveals what every idea was really worth.</p>',
    options: [{ id: 'difficulty', label: 'Difficulty', default: 'guided', choices: [{ v: 'guided', t: 'Foundation', s: 'Closer estimates, three research slots, clearer tests, coaching; $3.6M target' }, { v: 'standard', t: 'Intermediate', s: 'Rougher estimates, two research slots, no coaching; $4.0M target' }, { v: 'expert', t: 'Advanced', s: 'Rough estimates, noisy tests, unsorted backlog; $4.5M target' }] }],
    create: (seed, config) => E.create(seed, config),
    apply: (g, d) => E.apply(g, d),
    isDone: g => E.isDone(g),
    progress: g => (done(g) ? 'Complete · 8 quarters' : `Quarter ${g.q} of ${g.n}`),
    view(g, ctx) {
      const d = done(g);
      let tab = ui(ctx, 'tab', d ? 'debrief' : 'plan');
      if (d && tab === 'plan') tab = 'debrief';
      if (!d && tab === 'debrief') tab = 'plan';
      ctx.ui.tab = tab;
      let h = header(g);
      h += UI.tabs('tab', [{ v: d ? 'debrief' : 'plan', t: d ? 'Debrief' : `Quarter ${g.q}` }, { v: 'metrics', t: 'Metrics' }, { v: 'backlog', t: 'Backlog' }, { v: 'team', t: 'Team' }, { v: 'guide', t: 'Guide' }], tab, 'main-tabs', true);
      if (tab === 'plan') h += planView(g, ctx);
      else if (tab === 'metrics') h += metricsView(g);
      else if (tab === 'backlog') h += backlogView(g);
      else if (tab === 'team') h += teamView(g);
      else if (tab === 'guide') h += guideView(g);
      else h += debriefView(g, ctx);
      return h;
    },
    live,
    onTab(g, group, value, ctx) { if (group === 'tab') ctx.ui.seenBrief = true; },
    field(g, name, value, el, ctx) {
      const d = g.draft; if (!d) return null;
      if (name === 'rtarget') { ctx.ui.rtarget = String(value); return null; }
      if (name === 'marketing') { d.marketing = clamp(Math.round(+value || 0), 0, 600); return null; }
      if (name === 'hires') { d.hires = clamp(Math.round(+value || 0), -3, 4); return null; }
      if (name === 'price') { const p = +value; if (isFinite(p) && p > 0) d.price = p; return null; }
      if (name === 'limit') { d.limit = String(value); return null; }
      if (name === 'event') { d.event = String(value); return { rerender: true }; }
      if (name.indexOf('deal:') === 0) { d.deals = d.deals || {}; d.deals[name.slice(5)] = String(value); return { rerender: true }; }
      if (name.indexOf('decide:') === 0) { d.decide = d.decide || {}; const v = String(value); if (v === 'hold') delete d.decide[name.slice(7)]; else d.decide[name.slice(7)] = v; return { rerender: true }; }
      return null;
    },
    act(g, op, el, ctx) {
      const d = g.draft; if (!d) return null;
      const id = el.dataset.id;
      if (op === 'add') { if (g.items[id] && d.roadmap.indexOf(id) < 0) d.roadmap.push(id); return { rerender: true, draft: true }; }
      if (op === 'rm') { d.roadmap = d.roadmap.filter(x => x !== id); delete d.tests[id]; return { rerender: true, draft: true }; }
      if (op === 'up' || op === 'down') { const i = d.roadmap.indexOf(id), j = op === 'up' ? i - 1 : i + 1; if (i >= 0 && j >= 0 && j < d.roadmap.length) { const t = d.roadmap[i]; d.roadmap[i] = d.roadmap[j]; d.roadmap[j] = t; } return { rerender: true, draft: true }; }
      if (op === 'test') { if (d.tests[id]) delete d.tests[id]; else if (E.IDX[id] && E.IDX[id].test) d.tests[id] = true; return { rerender: true, draft: true }; }
      if (op === 'research') {
        if (E.slots(g) <= 0) return { toast: 'No research slots left this quarter.' };
        const m = el.dataset.m, target = m === 'interviews' ? rTarget(g, ctx) : null;
        return { commit: { kind: 'research', method: m, target }, top: false, toast: 'The findings are in.' };
      }
      if (op === 'submit') {
        const wait = pending(g); if (wait.length) return { toast: `Answer ${list(wait)} first.` };
        ctx.ui.seenBrief = true;
        const lastQ = g.q === g.n;
        return { commit: { kind: 'quarter', roadmap: d.roadmap.slice(), tests: clone(d.tests), decide: clone(d.decide || {}), marketing: d.marketing, hires: d.hires, price: d.price, limit: d.limit, event: d.event, deals: clone(d.deals || {}) }, top: true, toast: lastQ ? 'The final quarter is closed. Here is your debrief.' : `Quarter ${g.q} closed.` };
      }
      return null;
    },
    summary(g) { const sc = E.score(g), L = last(g); return { score: sc.total, line: `ARR ${M$(sc.arr)} against ${M$(sc.target)} · NPS ${N.int(L.nps)} · tech debt ${N.int(L.debt)}`, metrics: [{ k: 'ARR', v: M$(sc.arr) }, { k: 'NPS', v: N.int(L.nps) }] }; }
  });
})();
