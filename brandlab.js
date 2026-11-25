/* Brand Lab: interface for the marketing strategy simulation. The engine lives in brandlab-engine.js. */
(function () {
  'use strict';
  const S = window.SimLab, B = window.BrandLabEngine;
  if (!S || !B) return;
  const { UI, N, U } = S;
  const esc = U.esc, clamp = U.clamp, sum = U.sum, avg = U.avg, clone = U.clone;
  const SEGS = B.SEGS, MK = B.MARKETS, CH = B.CHANNELS;
  const FIRM_VAR = { you: 'var(--c-you)', bor: 'var(--c-b)', cad: 'var(--c-c)', del: 'var(--c-d)', equ: 'var(--c-e)' };
  const fCol = id => FIRM_VAR[id] || 'var(--ink-3)';
  const SEG_CLS = { aud: 's0', com: 's1', act: 's2', trd: 's3', val: 's4', inn: 's2 gx', pro: 's4 gx', fol: 's1 gx' };
  const SEG_VAR = { aud: 'var(--g0)', com: 'var(--g1)', act: 'var(--g2)', trd: 'var(--g3)', val: 'var(--g4)', inn: 'var(--g2)', pro: 'var(--g4)', fol: 'var(--g1)' };
  const MKT_NAME = { E: 'Earbuds', G: 'Audio glasses' };
  const STUDY = {}; B.STUDIES.forEach(s => { STUDY[s.id] = s; });

  /* ---------- Formatting ---------- */
  const F = {
    m: (v, d) => N.m(v, d == null ? 1 : d),
    k: v => (v < 0 ? N.MINUS + '⁠' : '') + '$' + N.int(Math.abs(v)) + 'k',
    u: v => (Math.abs(v) < 0.05 ? '0' : Math.abs(v) >= 100 ? N.int(v) : N.num(v, 1)) + 'k',
    usd: v => N.usd(v),
    pct: (v, d) => N.pct(v, d == null ? 0 : d),
    p: t => 'P' + t,
    a: (at, v) => (at.dec ? N.num(v, at.dec) : N.int(v)) + (at.unit === '/10' ? '' : ' ' + at.unit),
    xy: (x, y) => `(${N.num(x, 1)}, ${N.num(y, 1)})`
  };
  const moneyAxis = v => (v < 0 ? N.MINUS : '') + '$' + Math.abs(v) + 'M';
  const dot = id => `<i class="cdot" style="background:${fCol(id)}" aria-hidden="true"></i>`;
  const segOf = id => SEGS.find(s => s.id === id);
  const segIdx = id => SEGS.findIndex(s => s.id === id);
  const segPill = id => { const s = segOf(id); return s ? `<span class="spill ${SEG_CLS[id]}">${s.name}</span>` : ''; };
  const mktPill = m => `<span class="pill neutral">${MKT_NAME[m]}</span>`;
  const signCls = v => (v > 0.0001 ? 'up' : v < -0.0001 ? 'down' : '');
  const chipBtn = (label, attrs, pressed) => `<button type="button" class="chip" data-act="m" ${attrs}${pressed != null ? ` aria-pressed="${pressed}"` : ''}>${label}</button>`;
  const mapH = () => { const w = typeof window !== 'undefined' && window.innerWidth ? window.innerWidth : 390; return w >= 900 ? 470 : w >= 600 ? 420 : 350; };
  const fieldBox = (label, control, liveKey, hint) => `<div class="fbox"><span class="lbl">${label}</span>${control}${liveKey || hint ? `<span class="hint"${liveKey ? ` data-live="${liveKey}"` : ''}>${hint || ''}</span>` : ''}</div>`;
  const uiStr = (ctx, k, d) => (ctx.ui[k] == null || ctx.ui[k] === '' ? d : ctx.ui[k]);
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

  /* ---------- Game helpers ---------- */
  const me = g => B.you(g);
  const guided = g => g.cfg.difficulty !== 'expert';
  const ideals = g => S.lvlOf(g) === 0;
  const lastRep = g => g.reports[g.reports.length - 1];
  const myBrands = g => B.brandsOf(g, me(g));
  const firmIdx = (g, id) => g.firms.findIndex(f => f.id === id);
  const segNow = (g, id) => B.segAt(g, segIdx(id), g.t);
  const segNext = (g, id) => B.segAt(g, segIdx(id), g.t + 1);
  const openSegs = (g, m, t) => SEGS.filter(s => s.m === m && B.segAt(g, segIdx(s.id), t == null ? g.t : t).size > 0);
  const gOpen = g => openSegs(g, 'G', g.t).length > 0 || openSegs(g, 'G', g.t + 1).length > 0;
  const study = (r, id) => !!(r && r.studies && r.studies.indexOf(id) >= 0);
  const lastStudy = (g, id, upto) => { for (let k = (upto == null ? g.reports.length - 1 : upto); k >= 0; k--) if (study(g.reports[k], id)) return g.reports[k]; return null; };
  const projName = p => p.name || ('Design ' + p.id);
  const doneProjects = (g, m) => g.projects.filter(p => p.firm === 'you' && p.status === 'done' && !p.used && (!m || p.m === m));
  const activeProjects = g => g.projects.filter(p => p.firm === 'you' && p.status === 'active');
  const percOf = (m, a) => MK[m].perc(a);
  const specLine = (m, a) => MK[m].attrs.map(at => `${at.name.split(' ')[0]} ${F.a(at, a[at.k])}`).join(' · ');
  function proforma(g) { return B.proforma(g, g.draft); }

  /* ---------- Perceptual maps ---------- */
  function mapSpec(g, m, opts) {
    const o = opts || {}, t = o.t == null ? g.t : o.t, r = o.rep || null;
    const zones = [], arrows = [], points = [];
    const src = r || lastStudy(g, 'mds');
    const showSegs = SEGS.filter(s => s.m === m);
    showSegs.forEach(s => {
      let x, y, nx = null, ny = null, size, nowSize, base = t;
      if (o.truth) { const i = segIdx(s.id), e = B.segAt(g, i, t), n = B.segAt(g, i, t + 1); x = e.x; y = e.y; nx = n.x; ny = n.y; nowSize = e.size; size = Math.max(e.size, n.size, B.segAt(g, i, t + 2).size); }
      else if (src) { const e = src.segs[segIdx(s.id)]; x = e.x; y = e.y; base = src.t; nowSize = e.size; size = Math.max(e.size || 0, e.next || 0, e.next2 || 0); if (o.arrows) { nx = e.nextX; ny = e.nextY; } }
      if (x == null || !(size > 0)) return;
      const opens = nowSize > 0 ? null : (s.open || 1);
      zones.push({ x, y, rx: B.POS_SD * 0.75, ry: B.POS_SD * 0.75, fill: SEG_VAR[s.id], op: 0.16, ideal: { x, y }, label: opens && opens > base ? `${s.name} (${F.p(opens)})` : s.name });
      if (o.arrows && nx != null && Math.hypot(nx - x, ny - y) > 0.05) arrows.push({ x1: x, y1: y, x2: nx, y2: ny, c: 'var(--ink-3)' });
    });
    if (src && !o.mineOnly) src.brands.filter(b => b.m === m && b.firm !== 'you' && b.active && (b.sold > 0.5 || b.born === src.t)).forEach(b => points.push({ x: b.x, y: b.y, c: fCol(b.firm), r: 3.8, label: o.labelRivals ? b.name : null, lc: fCol(b.firm) }));
    (o.mine || []).forEach(p => points.push(p));
    const all = points.map(p => [p.x, p.y]).concat(zones.map(z => [z.x, z.y]));
    const xs = all.map(a => a[0]), ys = all.map(a => a[1]);
    const lo = v => Math.max(0, Math.floor(Math.min(0.5, ...v) - 0.5)), hi = v => Math.min(14, Math.ceil(Math.max(9.5, ...v) + 0.5));
    return { type: 'map', x: { min: lo(xs), max: hi(xs), label: MK[m].dims[0] + ' →', fmt: v => v }, y: { min: lo(ys), max: hi(ys), label: MK[m].dims[1] + ' →', fmt: v => v }, zones, arrows, points };
  }
  function myPoints(g, m, mode) {
    const d = g.draft, pts = [];
    myBrands(g).filter(b => b.m === m).forEach(b => {
      const pc = B.perceived(b), x = d && d.brands[b.id];
      pts.push({ x: pc.x, y: pc.y, c: fCol('you'), r: 5.5, big: true, label: b.name });
      if (mode === 'brands' && x && x.obj && !x.withdraw) pts.push({ x: x.obj.x, y: x.obj.y, c: fCol('you'), r: 4.5, ring: true });
    });
    if (mode === 'rd') {
      doneProjects(g, m).forEach(p => { const pc = percOf(m, p.a); pts.push({ x: pc.x, y: pc.y, c: fCol('you'), r: 5, ring: true, big: true, label: projName(p) + ' (ready)' }); });
      activeProjects(g).filter(p => p.m === m).forEach(p => { const pc = percOf(m, p.a); pts.push({ x: pc.x, y: pc.y, c: 'var(--ink-3)', r: 5, ring: true, label: projName(p) }); });
      (d ? d.projects : []).forEach((p, i) => { if (p.m !== m) return; const pc = percOf(m, p.a); pts.push({ x: pc.x, y: pc.y, c: 'var(--pen)', r: 5, ring: true, big: true, label: 'New design ' + (i + 1) }); });
    }
    return pts;
  }
  function brandArrows(g, m) {
    const d = g.draft, out = [];
    myBrands(g).filter(b => b.m === m).forEach(b => { const x = d && d.brands[b.id]; if (!x || !x.obj || x.withdraw) return; const pc = B.perceived(b); if (Math.hypot(x.obj.x - pc.x, x.obj.y - pc.y) > 0.05) out.push({ x1: pc.x, y1: pc.y, x2: x.obj.x, y2: x.obj.y, c: fCol('you') }); });
    return out;
  }
  function mapLegend(g, m, extra) {
    const firms = g.firms.map(f => ({ t: f.id === 'you' ? 'Aria (you)' : f.short, c: fCol(f.id) }));
    return firms.concat(extra || []);
  }
  function mapCaption(g, src, arrows) {
    if (!src) return 'No perceptual map study yet. Buy one in Research to see rivals and segment ideal points.';
    const stale = src.t < g.t - 1;
    return `Segment ideal points (+) and rival brands from the ${F.p(src.t)} perceptual map study${stale ? ` <span class="pill warn">${g.t - 1 - src.t} period${g.t - 1 - src.t === 1 ? '' : 's'} old</span>` : ''}. A brand inside a ring keeps at least three quarters of its appeal to that segment.${arrows ? ' Grey arrows show where each ideal point moves next period.' : ''}`;
  }

  /* ---------- Decision checks ---------- */
  function checks(g, P) {
    const out = [], d = g.draft, f = me(g), gd = ideals(g), est = P.guided ? B.estimate(g, d) : null;
    if (P.over > 0.5) out.push({ t: 'bad', m: `This plan spends <strong>${F.k(P.spend.total)}</strong> against a budget of ${F.k(f.budget)}. Advertising would be cut across all brands to fit. Trim advertising, research, R&amp;D or the sales force.` });
    const live = myBrands(g).filter(b => !(d.brands[b.id] || {}).withdraw);
    if (!live.length && !d.launches.length) out.push({ t: 'bad', m: 'Every brand is being withdrawn and nothing new is launching. Aria would have nothing to sell.' });
    myBrands(g).forEach(b => {
      const x = d.brands[b.id]; if (!x) return;
      const nm = `<strong>${esc(b.name)}</strong>`;
      if (x.withdraw) { out.push({ t: 'info', m: `${nm} is being withdrawn. Its ${F.u(b.inv)} of inventory is written off at half its cost.` }); return; }
      const s = x.seg ? segNow(g, x.seg) : null;
      const inv = x.project ? 0 : b.inv, plan = +x.prod || 0;
      if (plan <= 0 && inv < 1) out.push({ t: 'bad', m: `${nm} has no production planned and no stock, so it will sell nothing.` });
      if (s && s.size > 0) {
        const r = (+x.price || 0) / s.price;
        if (r > 1.35) out.push({ t: 'warn', m: `${nm} is priced at ${F.usd(x.price)}, ${F.pct(r - 1)} above what ${s.name} buyers expect to pay (about ${F.usd(s.price)}). Few will buy.` });
        else if (r < 0.7) out.push({ t: 'info', m: `${nm} is priced ${F.pct(1 - r)} below the ${s.name} reference price. Deep discounts win share but give up margin.` });
      } else if (s && s.size <= 0) out.push({ t: 'warn', m: `${nm} is aimed at ${s.name}, which has no buyers yet this period.` });
      if ((+x.ads || 0) < 800) out.push({ t: 'warn', m: `${nm} has almost no advertising. Awareness loses a quarter of its level every period without support.` });
      const rs = +x.rsch || 0;
      if (rs === 0 && (+x.ads || 0) > 0) out.push({ t: 'warn', m: `${nm} spends nothing on advertising research, so its ads are far less effective. 10–15% of the budget is usually best.` });
      else if (rs > 0.3) out.push({ t: 'info', m: `${nm} puts ${F.pct(rs)} of its advertising into research. Above about 15% the extra research costs more than it adds.` });
      const uc = B.unitCost(b.m, x.project ? (doneProjects(g).find(p => p.id === x.project) || b).a : b.a, x.project ? b.cum * 0.3 : b.cum);
      if ((+x.price || 0) * 0.7 < uc) out.push({ t: 'warn', m: `${nm}'s price after retailer margins (about ${F.usd((+x.price || 0) * 0.7)}) barely covers its unit cost of about ${F.usd(uc)}.` });
      if (est && est[b.id]) {
        const e = est[b.id].demand, avail = inv + plan;
        if (e > 5 && avail * 1.2 < e * 0.92) out.push({ t: 'warn', m: `${nm} may run out: even at the 20% flexible maximum, ${F.u(inv + plan * 1.2)} available against an estimate of ${F.u(e)}.` });
        else if (plan > 0 && inv + plan * 0.8 > e * 1.25 + 5) out.push({ t: 'warn', m: `${nm} would build stock: at least ${F.u(inv + plan * 0.8)} available against an estimate of ${F.u(e)}. Unsold units cost ${F.pct(B.HOLD)} of their value a period to hold.` });
      }
      if (x.project) out.push({ t: 'info', m: `${nm} switches to design ${esc(projName(g.projects.find(p => p.id === x.project) || {}))}${b.inv > 0.5 ? `; its ${F.u(b.inv)} of old stock is written off at half cost` : ''}.` });
      if (gd && !x.project && s && s.size > 0) {
        const pc = B.perceived(b), nx = segNext(g, x.seg), dist = Math.hypot(pc.x - nx.x, pc.y - nx.y) / B.POS_SD;
        const busy = activeProjects(g).length || d.projects.length || doneProjects(g, b.m).length;
        if (dist > 1 && !busy && !x.obj) out.push({ t: 'warn', m: `${nm} sits ${N.num(dist, 1)} map units from where ${s.name} buyers will want it next period, and nothing is moving it: no design, no project and no perceptual objective.` });
      }
    });
    d.projects.forEach((p, i) => {
      const bad = B.feasible(p.m, p.a, g.t);
      if (bad.length) out.push({ t: 'bad', m: `New design ${i + 1} is beyond this period's technology on ${bad.map(k => MK[p.m].attrs.find(a => a.k === k).name.toLowerCase()).join(', ')}. It would be cancelled.` });
      else { const c = B.projectCost(p.m, p.a, g.t, p.m === 'G' && !B.gDone(g, f)); if (c.periods > 1) out.push({ t: 'info', m: `New design ${i + 1} is Aria's first glasses project, so it takes ${c.periods} periods (${F.k(c.cost)} in total, half each period). It is ready for ${F.p(g.t + c.periods)}.` }); }
    });
    const names = new Set(myBrands(g).map(b => b.name));
    const all = new Set(g.brands.map(b => b.name));
    d.launches.forEach(L => {
      const nm = String(L.name || '').toUpperCase().trim();
      if (!nm) out.push({ t: 'bad', m: 'A new brand has no name.' });
      else if (all.has(nm) || names.has(nm)) out.push({ t: 'warn', m: `The name ${esc(nm)} is taken; a number will be added to it.` });
      if (!(+L.prod > 0)) out.push({ t: 'bad', m: `${esc(nm || 'The new brand')} has no production planned, so it will launch with nothing to sell.` });
      if ((+L.ads || 0) < 2000) out.push({ t: 'warn', m: `${esc(nm || 'The new brand')} launches with only ${F.k(+L.ads || 0)} of advertising. New brands start almost unknown; most launches need $3,000k or more.` });
    });
    if (myBrands(g).length + d.launches.length > B.MAX_BRANDS) out.push({ t: 'bad', m: `You can run at most ${B.MAX_BRANDS} brands. Withdraw one or launch fewer.` });
    const cur = f.sf, nsf = d.sf.map(v => Math.round(+v || 0));
    const fire = sum(nsf.map((n, j) => Math.max(0, cur[j] - n)));
    if (fire > 0) out.push({ t: 'info', m: `Letting ${plural(fire, 'salesperson')} go costs ${F.k(fire * B.SF_FIRE)} in severance this period.` });
    if (!d.studies.length) out.push({ t: 'warn', m: 'No market research ordered. Next period you will be deciding from the free newsletter alone.' });
    else if (d.studies.indexOf('mds') < 0 && d.studies.indexOf('semantic') < 0) out.push({ t: 'info', m: 'Neither the perceptual map nor the semantic scales is ordered, so your view of segment ideals and rival positions will age by a period.' });
    if (P.over <= 0.5 && f.budget - P.spend.total > f.budget * 0.35 && g.t < g.years) out.push({ t: 'info', m: `${F.k(f.budget - P.spend.total)} of the budget is unspent. Unused budget is not carried forward.` });
    return out;
  }
  const countBad = list => list.filter(x => x.t === 'bad').length;
  const countWarn = list => list.filter(x => x.t === 'warn').length;

  /* ---------- Shared pieces ---------- */
  function header(g, done) {
    const r = lastRep(g), i = 0, R = r.firms[i].res, prev = g.reports.length > 1 ? g.reports[g.reports.length - 2].firms[i].res : null;
    const order = r.firms.slice().sort((a, b) => b.res.spi - a.res.spi), rank = order.findIndex(f => f.id === 'you') + 1;
    return `<section class="sheet hdr"><div class="hdr-top"><div class="sh"><span class="eyebrow">${done ? `Final results · after ${F.p(g.years)}` : `Period ${g.t} of ${g.years} · decisions open`}</span><h2>Aria Audio</h2></div><div class="hdr-pills">${UI.level(g.cfg.difficulty)}${done ? '' : UI.pill('Budget ' + F.m(me(g).budget / 1000), 'pen')}</div></div>${UI.kpis([
      { k: 'Stock price index', v: N.int(R.spi), d: `#${rank} of 5${prev ? ' · ' + N.sign(R.spi - prev.spi, v => N.int(v)) : ''}`, cls: prev ? signCls(R.spi - prev.spi) : '' },
      { k: `Contribution ${F.p(r.t)}`, v: F.m(R.nmc), d: prev ? N.sign(R.nmc - prev.nmc, v => F.m(v)) : 'net marketing', cls: prev ? signCls(R.nmc - prev.nmc) : '' },
      { k: `Value share ${F.p(r.t)}`, v: F.pct(R.valShare, 1), d: prev ? N.sign((R.valShare - prev.valShare) * 100, v => N.num(v, 1) + ' pts') : 'of all sales', cls: prev ? signCls(R.valShare - prev.valShare) : '' },
      { k: `Revenue ${F.p(r.t)}`, v: F.m(R.rev), d: prev ? N.sign(R.rev - prev.rev, v => F.m(v)) : '', cls: prev ? signCls(R.rev - prev.rev) : '' }
    ])}</section>`;
  }
  function stepLink(sub, label) { return `<button type="button" class="link" data-act="tab" data-group="sub" data-value="${sub}" data-top="1">${label}</button>`; }
  function dock(g) {
    return `<div class="dock" role="region" aria-label="Plan summary"><div class="dock-in"><span class="dock-t" data-live="dock">${dockText(g, proforma(g))}</span><button type="button" class="btn btn-primary dock-b" data-act="tab" data-group="sub" data-value="review" data-top="1">Review<span class="dock-lg"> and submit</span></button></div></div>`;
  }
  function dockText(g, P) {
    const list = checks(g, P), b = countBad(list), w = countWarn(list), f = me(g);
    return `<span class="dock-l"><span>Spend <b class="num${P.over > 0.5 ? ' down' : ''}">${F.k(P.spend.total)}</b> of ${F.k(f.budget)}</span>${P.guided ? `<span>Est. contribution <b class="num">${F.m(P.nmc)}</b></span>` : ''}</span><span class="dock-l">${b ? `<span class="pill bad">${plural(b, 'problem')}</span>` : ''}${w ? `<span class="pill warn">${plural(w, 'warning')}</span>` : ''}${!b && !w ? '<span class="pill good">No warnings</span>' : ''}</span>`;
  }
  function caseBrief(open) {
    return UI.brief('Aria Audio', open, `<p>You have just joined <strong>Aria Audio</strong> as head of marketing. Aria is one of five firms selling personal audio: wireless <strong>earbuds</strong> today and, within a few periods, a new category of <strong>audio glasses</strong> with speakers in the frame.</p><p>Aria has two brands. <strong>AURA</strong> is a mid-priced earbud loved by commuters, but its design is a generation old. <strong>ALTO</strong> is a cheap earbud for value buyers that sells in volume on thin margins. Your four rivals each run two brands of their own.</p><p>Each period you set every brand's price, advertising and production; steer how buyers perceive it; fund R&amp;D to redesign brands or create new ones; size the sales force in three retail channels; and buy market research. All five firms decide at the same time, then the market reacts.</p><p>Buyers fall into segments that want different things, and what they want drifts every period. Your board judges you on the <strong>stock price index</strong>, which rewards contribution, value share and growth.</p>`, 'Know where buyers are going, get there first, and make sure they have heard of you.');
  }
  function newsItems(g, r) {
    const out = [];
    if (!r || r.t < 1) return out;
    r.brands.filter(b => b.firm !== 'you').forEach(b => {
      const fn = g.firms.find(f => f.id === b.firm).short;
      if (b.born === r.t) out.push(`${dot(b.firm)}${fn} launched <strong>${esc(b.name)}</strong> in ${MKT_NAME[b.m].toLowerCase()} at ${F.usd(b.price)}.`);
      if (b.revised) out.push(`${dot(b.firm)}${fn} brought out a redesigned <strong>${esc(b.name)}</strong>.`);
      if (b.withdrawn) out.push(`${dot(b.firm)}${fn} withdrew <strong>${esc(b.name)}</strong>.`);
    });
    const prev = g.reports[r.t - 1];
    if (prev) r.firms.slice(1).forEach((f, k) => { const pf = prev.firms[k + 1]; if (f.res.spi > pf.res.spi * 1.15) out.push(`${dot(f.id)}${esc(f.short)}'s stock price index jumped to ${N.int(f.res.spi)}.`); });
    SEGS.filter(s => s.m === 'G').forEach(s => { const i = segIdx(s.id), e = r.segs[i]; if (e.size <= 0 && e.next > 0) out.push(`Analysts expect the first <strong>${s.name}</strong> to buy audio glasses next period: about ${F.u(e.next)} units.`); });
    return out.slice(0, 8);
  }
  function coachTip(g) {
    const t = g.t, tips = {
      1: 'Start with the perceptual map. Which segments have no brand near their ideal point, and where is each ideal moving?',
      2: 'Audio glasses open to their first buyers in period 3. A firm’s first glasses design takes two periods, so the window to be first is now.',
      3: 'Check the consumer panel: which segments buy your brands, and which rival is winning the segments you aim at?',
      4: 'Awareness takes time. New brands need heavy advertising in their first two periods, with 10–15% of it on research.',
      5: 'Followers, the mainstream glasses buyers, arrive now. They want lower prices and comfort more than features.',
      6: 'Look at contribution by brand. A brand that loses money every period is a candidate for repositioning or withdrawal.',
      7: 'Two periods left. A redesign started now reaches the market for the final period only.',
      8: 'Final period. Do not build stock you cannot sell, and spend where it pays back this period.'
    };
    return tips[t] || tips[8];
  }

  /* ---------- Decide: brief ---------- */
  function briefView(g, ctx) {
    const r = lastRep(g), first = g.t === 1, R = r.firms[0].res;
    let h = caseBrief(first && !ctx.ui.seenBrief);
    const lead = r.firms.slice().sort((a, b) => b.res.spi - a.res.spi)[0];
    h += UI.sheet(first ? 'Your starting position' : `Last period · ${F.p(r.t)}`, first ? 'Five firms, ten brands, one category' : `${F.m(R.nmc)} contribution on ${F.m(R.rev)} of revenue`,
      `<p class="case">${first ? `In ${F.p(0)} Aria earned ${F.m(R.nmc)} of net marketing contribution on ${F.m(R.rev)} of revenue, ${F.pct(R.valShare, 1)} of the market by value. Earbud demand grows 1% to 11% a period depending on segment, and audio glasses are coming.` : `Aria took ${F.pct(R.valShare, 1)} of the market by value. ${lead.id === 'you' ? 'Your stock price index leads the industry.' : `${esc(lead.short)} leads on the stock price index at ${N.int(lead.res.spi)}.`}`}</p>` +
      UI.table(['Firm', 'Stock index', 'Revenue', 'Contribution', 'Value share'], r.firms.map(f => ({ cls: f.id === 'you' ? 'me' : '', cells: [dot(f.id) + esc(f.short), N.int(f.res.spi), F.m(f.res.rev), F.m(f.res.nmc), F.pct(f.res.valShare, 1)] })), { sticky: true }) +
      `<div class="actions">${UI.btn('Open the full reports', 'm', 'btn-ghost', 'data-op="goto" data-tab="reports" data-rep="summary"')}</div>`);
    const news = newsItems(g, r);
    if (news.length) h += UI.sheet('Industry newsletter', 'What happened last period', `<ul class="news">${news.map(n => `<li>${n}</li>`).join('')}</ul>`);
    const panel = study(r, 'panel');
    const pr = r.t > 0 ? g.reports[r.t - 1] : null;
    const rows = SEGS.map((s, i) => {
      const e = r.segs[i], nowSize = B.segAt(g, i, g.t).size;
      if (e.size <= 0 && nowSize <= 0 && e.next <= 0) return null;
      const mine = sum(r.brands.filter(b => b.firm === 'you').map(b => b.soldSeg[i]));
      const nB = r.brands.filter(b => b.active && b.m === s.m && b.soldSeg[i] > Math.max(1, e.sold * 0.05)).length;
      const pe = pr ? pr.segs[i] : null, gr = e.size > 0 ? (pe && pe.size > 0 ? N.sign((e.size / pe.size - 1) * 100, v => N.num(v, 0) + '%') : s.m === 'E' ? '+' + F.pct(s.growth) : 'new') : 'opening';
      return [segPill(s.id), e.size > 0 ? F.u(e.size) : '–', gr, panel ? (e.sold > 0 ? F.pct(mine / e.sold, 1) : '–') : '<span class="cap">panel</span>', panel ? String(nB) : '<span class="cap">panel</span>'];
    }).filter(Boolean);
    const who = SEGS.filter((s, i) => r.segs[i].size > 0 || B.segAt(g, i, g.t).size > 0 || r.segs[i].next > 0).map(s => `<dt>${segPill(s.id)}</dt><dd>${esc(s.who)}</dd>`).join('');
    h += UI.sheet(`The market · ${F.p(r.t)}`, 'Segments and who they are', UI.table(['Segment', 'Buyers', 'Growth', 'Your share', 'Brands bought'], rows, { sticky: true }) + `<p class="cap">Potential buyers in thousands, and growth on the period before. Your share and the number of brands each segment really buys come from the consumer panel${panel ? '' : ', which you did not buy last period'}.</p><dl class="gloss segs">${who}</dl>`);
    h += UI.sheet('Plan the period', 'Work through the tabs', `<ol class="steps">
      <li><strong>${stepLink('brands', 'Brands')}</strong>: price, advertising, ad research, production and a perceptual objective for every brand; launch finished designs.</li>
      <li><strong>${stepLink('rd', 'R&amp;D')}</strong>: design new products or redesigns against the segment ideals, within this period's technology.</li>
      <li><strong>${stepLink('sf', 'Sales force')}</strong>: hire or cut salespeople in specialty stores, big-box retail and online.</li>
      <li><strong>${stepLink('research', 'Research')}</strong>: choose the studies you want with this period's results.</li>
      <li><strong>${stepLink('review', 'Review')}</strong>: check the budget and warnings, then submit.</li></ol>${ideals(g) ? `<p class="note">${coachTip(g)}</p>` : ''}`);
    return h;
  }

  /* ---------- Decide: brands ---------- */
  function mapSheet(g, ctx, mode) {
    const mkts = ['E'].concat(mode === 'rd' || gOpen(g) || myBrands(g).some(b => b.m === 'G') ? ['G'] : []);
    let m = uiStr(ctx, 'mkt', 'E'); if (mkts.indexOf(m) < 0) m = 'E';
    const src = lastStudy(g, 'mds'), gd = ideals(g);
    const id = mode === 'rd' ? 'bl-rdmap' : 'bl-bmap';
    const extra = mode === 'rd' ? [{ t: 'Rings: your finished, running and planned designs', c: 'var(--pen)' }] : [{ t: 'Rings and arrows: perceptual objectives', c: fCol('you') }];
    const spec = () => { const sp = mapSpec(g, m, { truth: gd, arrows: gd, mine: myPoints(g, m, mode), labelRivals: true }); if (mode === 'brands') sp.arrows = sp.arrows.concat(brandArrows(g, m)); return sp; };
    const caption = gd ? `Foundation level shows this period's true segment ideal points (+) and, with grey arrows, where they move next period. Rival brands are from the ${src ? F.p(src.t) : '–'} perceptual map study. A brand inside a ring keeps at least three quarters of its appeal to that segment.` : mapCaption(g, src, false);
    return UI.sheet(mode === 'rd' ? `Design space · ${F.p(g.t)}` : `Perceptual map · ${F.p(g.t)}`, mode === 'rd' ? 'Where designs land on the map' : 'How buyers see the brands',
      (mkts.length > 1 ? UI.tabs('mkt', mkts.map(k => ({ v: k, t: MKT_NAME[k] })), m, 'seg-tabs') : '') +
      UI.chart(id, spec, mapH(), mapLegend(g, m, extra), `Perceptual map of ${MKT_NAME[m].toLowerCase()}`) + `<p class="cap">${caption} Axes: ${MK[m].dims[0].toLowerCase()} and ${MK[m].dims[1].toLowerCase()} as buyers perceive them.</p>`);
  }
  function brandsView(g, ctx) {
    const d = g.draft;
    let h = mapSheet(g, ctx, 'brands');
    h += `<div class="pgrid2">${myBrands(g).map(b => brandCard(g, ctx, b, d.brands[b.id])).join('')}</div>`;
    h += launchSheet(g);
    return h;
  }
  function brandCard(g, ctx, b, x) {
    const id = b.id, last = b.last || {}, pc = B.perceived(b);
    const head = `<header class="pc-h"><span class="pc-n">${esc(b.name)}</span>${mktPill(b.m)}${x.seg ? segPill(x.seg) : ''}${b.version > 1 ? `<span class="tag">v${b.version}</span>` : ''}${x.withdraw ? '' : `<button type="button" class="link danger" data-act="m" data-op="wd" data-bid="${id}">Withdraw</button>`}</header>`;
    if (x.withdraw) return `<article class="sheet pcard">${head}<p class="case">${esc(b.name)} will be withdrawn at the start of ${F.p(g.t)}. Its ${F.u(b.inv)} of inventory is written off at half its cost of ${F.usd(b.invCost || 0)} a unit.</p><div class="actions">${UI.btn('Keep this brand', 'm', 'btn-ghost', `data-op="wd-undo" data-bid="${id}"`)}</div></article>`;
    const confirm = ctx.ui.wd === id ? `<div class="banner">Withdraw ${esc(b.name)}? It stops selling this period and its inventory is written off at half cost. <button type="button" class="link danger" data-act="m" data-op="wd-yes" data-bid="${id}">Withdraw</button> <button type="button" class="link" data-act="m" data-op="wd-no">Cancel</button></div>` : '';
    const segChips = UI.chips(`b:${id}:seg`, 'Target segment', SEGS.filter(s => s.m === b.m).map(s => ({ v: s.id, t: s.name, disabled: B.segAt(g, segIdx(s.id), g.t).size <= 0 && B.segAt(g, segIdx(s.id), g.t + 1).size <= 0 })), x.seg);
    const spec = `<p class="spec num">${specLine(b.m, b.a)}</p><p class="cap num">Perceived at ${F.xy(pc.x, pc.y)} · awareness ${F.pct(b.aw)} · ${last.sold != null ? `sold ${F.u(last.sold)} at ${F.usd(b.price)}` : 'new'} · unit cost ${F.usd(b.unitCost || B.unitCost(b.m, b.a, b.cum))} · stock ${F.u(b.inv)}</p>`;
    const fields = `<div class="pgrid">${
      fieldBox('Price ($)', UI.num(`b:${id}:price`, x.price, { min: 10, max: 1500, step: 1, dec: 0, label: b.name + ' price' }))}${
      fieldBox('Advertising ($k)', UI.num(`b:${id}:ads`, x.ads, { min: 0, max: 20000, step: 100, dec: 0, label: b.name + ' advertising' }))}${
      fieldBox('Ad research (%)', UI.num(`b:${id}:rsch`, Math.round((x.rsch || 0) * 100), { min: 0, max: 40, step: 1, dec: 0, label: b.name + ' share of advertising spent on research' }))}${
      fieldBox('Production (k units)', UI.num(`b:${id}:prod`, x.prod, { min: 0, max: 20000, step: 5, dec: 0, label: b.name + ' production plan' }))}</div>`;
    const objOn = !!x.obj;
    const obj = `<div class="field"><span class="lbl">Perceptual objective</span><div class="chips sm" role="group" aria-label="Perceptual objective">${chipBtn('None', `data-op="obj-off" data-bid="${id}"`, String(!objOn))}${chipBtn(objOn ? 'Custom target' : 'Set a target', `data-op="obj-on" data-bid="${id}"`, String(objOn))}${x.seg ? chipBtn(`${esc(segOf(x.seg).name)} ideal${ideals(g) ? ', next period' : ''}`, `data-op="obj-aim" data-bid="${id}"`) : ''}</div>${objOn ? `<div class="pgrid">${fieldBox(MK[b.m].dims[0], UI.num(`b:${id}:ox`, x.obj.x, { min: 0, max: 14, step: 0.1, dec: 1, label: b.name + ' objective ' + MK[b.m].dims[0] }))}${fieldBox(MK[b.m].dims[1], UI.num(`b:${id}:oy`, x.obj.y, { min: 0, max: 14, step: 0.1, dec: 1, label: b.name + ' objective ' + MK[b.m].dims[1] }))}</div>` : ''}</div>`;
    const ready = doneProjects(g, b.m);
    const design = ready.length ? UI.chips(`b:${id}:project`, 'Switch to a finished design', [{ v: '', t: 'Keep current design' }].concat(ready.map(p => { const q = percOf(p.m, p.a); return { v: p.id, t: esc(projName(p)), s: F.xy(q.x, q.y), disabled: myBrands(g).some(o => o.id !== id && (g.draft.brands[o.id] || {}).project === p.id) || g.draft.launches.some(L => L.project === p.id) }; })), x.project || '') : '';
    const quick = `<div class="chips sm">${guided(g) ? chipBtn('Produce to estimate', `data-op="prod-fit" data-bid="${id}"`) : chipBtn('Produce last period’s sales', `data-op="prod-fit" data-bid="${id}"`)}${x.seg && segNow(g, x.seg).size > 0 ? chipBtn(`Price at ${esc(segOf(x.seg).name)} reference`, `data-op="price-seg" data-bid="${id}"`) : ''}</div>`;
    return `<article class="sheet pcard" id="card-${id}">${head}${confirm}${spec}${segChips}${fields}<p class="hint" data-live="bh:${id}">${brandHint(g, b, x)}</p>${quick}${obj}${design}</article>`;
  }
  function brandHint(g, b, x) {
    const est = guided(g) ? B.estimate(g, g.draft) : null, e = est && est[b.id];
    const proj = x.project ? g.projects.find(p => p.id === x.project) : null;
    const a = proj ? proj.a : b.a, uc = B.unitCost(b.m, a, proj ? b.cum * 0.3 : b.cum);
    const eff = B.adEff(+x.ads || 0, +x.rsch || 0), awN = B.awNext(b.aw, eff);
    const s = x.seg ? segNow(g, x.seg) : null, net = (+x.price || 0) * (1 - avgMargin(g, x.seg));
    const parts = [];
    if (e) parts.push(`<strong>Estimate: about ${F.u(e.demand)}</strong>${s && s.size > 0 ? ` (${F.pct(e.seg[segIdx(x.seg)] / Math.max(1, s.size), 1)} of ${esc(s.name)})` : ''}`);
    parts.push(`unit cost ${F.usd(uc)}, about ${F.usd(net - uc)} a unit after retailer margins`);
    parts.push(`awareness ${F.pct(b.aw)} → ${F.pct(awN)}`);
    if (x.obj) { const pc = B.perceived(b), dist = Math.hypot(x.obj.x - pc.x, x.obj.y - pc.y), step = Math.min(dist, 0.55 * eff / 5000); parts.push(`perception moves about ${N.num(step, 2)} of the ${N.num(dist, 1)} points to the target`); }
    if (s && s.size > 0) parts.push(`${esc(s.name)} reference price ${F.usd(s.price)}`);
    const inv = proj ? 0 : b.inv, plan = +x.prod || 0;
    parts.push(`available ${F.u(inv + plan * 0.8)}–${F.u(inv + plan * 1.2)}`);
    return parts.join(' · ');
  }
  function avgMargin(g, segId) {
    const f = me(g), cov = g.draft.sf.map((n, j) => B.coverage(+n || 0, j));
    const s = segId ? segNow(g, segId) : null; if (!s) return 0.3;
    const acc = s.ch.map((c, j) => c * cov[j]), at = sum(acc) || 1;
    void f;
    return sum(acc.map((a, j) => a / at * CH[j].margin));
  }
  function launchSheet(g) {
    const d = g.draft, ready = doneProjects(g).filter(p => !myBrands(g).some(b => (d.brands[b.id] || {}).project === p.id));
    if (!d.launches.length && !ready.length) return '';
    let body = '';
    d.launches.forEach((L, i) => {
      const p = g.projects.find(q => q.id === L.project); if (!p) return;
      const segs = SEGS.filter(s => s.m === p.m);
      body += `<article class="np"><header class="pc-h"><span class="pc-n" data-live="lnn:${i}">${esc(L.name || 'New brand')}</span>${mktPill(p.m)}${segPill(L.seg)}<button type="button" class="link danger" data-act="m" data-op="ln-del" data-i="${i}">Cancel launch</button></header><p class="spec num">Design ${esc(projName(p))}: ${specLine(p.m, p.a)}</p>${UI.chips(`ln:${i}:seg`, 'Target segment', segs.map(s => ({ v: s.id, t: s.name, disabled: B.segAt(g, segIdx(s.id), g.t).size <= 0 })), L.seg)}<div class="pgrid">${
        fieldBox('Brand name', `<input class="ti" type="text" maxlength="12" data-field="ln:${i}:name" value="${esc(L.name)}" aria-label="New brand name" autocomplete="off">`)}${
        fieldBox('Price ($)', UI.num(`ln:${i}:price`, L.price, { min: 10, max: 1500, step: 1, dec: 0, label: 'New brand price' }))}${
        fieldBox('Advertising ($k)', UI.num(`ln:${i}:ads`, L.ads, { min: 0, max: 20000, step: 100, dec: 0, label: 'New brand advertising' }))}${
        fieldBox('Production (k units)', UI.num(`ln:${i}:prod`, L.prod, { min: 0, max: 20000, step: 5, dec: 0, label: 'New brand production' }))}</div><p class="hint" data-live="ln:${i}">${launchHint(g, L, i)}</p>${guided(g) ? `<div class="chips sm">${chipBtn('Produce to estimate', `data-op="ln-fit" data-i="${i}"`)}</div>` : ''}</article>`;
    });
    const left = ready.filter(p => !d.launches.some(L => L.project === p.id));
    if (left.length) body += `<div class="field"><span class="lbl">Finished designs you can launch</span><div class="chips sm">${left.map(p => chipBtn(`Launch ${esc(projName(p))} (${MKT_NAME[p.m].toLowerCase()})`, `data-op="ln-add" data-pid="${p.id}"`)).join('')}</div></div>`;
    if (myBrands(g).length + d.launches.length >= B.MAX_BRANDS) body += `<p class="cap">Aria is at the limit of ${B.MAX_BRANDS} brands. Withdraw a brand to launch another.</p>`;
    return UI.sheet('New brands', d.launches.length ? `${d.launches.length} ${d.launches.length === 1 ? 'launch' : 'launches'} this period` : 'Launch a finished design', `<p class="case">A finished R&amp;D design can become a new brand. It starts with almost no awareness, so it needs heavy advertising, and its first units cost more until production gains experience.</p>${body}`);
  }
  function launchHint(g, L, i) {
    const p = g.projects.find(q => q.id === L.project); if (!p) return '';
    const est = guided(g) ? B.estimate(g, g.draft) : null, e = est && est['new' + i];
    const s = L.seg ? segNow(g, L.seg) : null, uc = B.unitCost(p.m, p.a, (+L.prod || 0) / 2);
    const eff = B.adEff(+L.ads || 0, 0.1), aw = B.awNext(0.05, eff), pc = percOf(p.m, p.a);
    const dist = s ? Math.hypot(pc.x - s.x, pc.y - s.y) / B.POS_SD : null;
    return [e ? `<strong>Estimate: about ${F.u(e.demand)}</strong>` : null, `first-period unit cost about ${F.usd(uc)}`, `awareness 5% → ${F.pct(aw)}`, s ? `${N.num(dist, 2)} map units from the ${esc(s.name)} ideal; reference price ${F.usd(s.price)}` : null].filter(Boolean).join(' · ');
  }

  /* ---------- Decide: R&D ---------- */
  const knownIdeal = (g, segId) => {
    if (ideals(g)) return { now: segNow(g, segId).ideal, next: segNext(g, segId).ideal, src: null };
    const r = lastStudy(g, 'semantic'); if (!r) return null;
    return { now: r.segs[segIdx(segId)].ideal, next: null, src: r.t };
  };
  function attrBounds(g, m, at) {
    const F0 = B.frontier(m, g.t)[at.k], lim = B.onGrid(at, F0, F0);
    return at.low ? { min: lim, max: at.max } : { min: at.min, max: lim };
  }
  function aimDesign(g, m, segId, when) {
    const K = knownIdeal(g, segId); if (!K) return null;
    const ideal = when === 'next' && K.next ? K.next : K.now, F0 = B.frontier(m, g.t), a = {};
    MK[m].attrs.forEach(at => { const v = ideal[at.k]; a[at.k] = B.onGrid(at, at.low ? Math.max(F0[at.k], v) : Math.min(F0[at.k], v), F0[at.k]); });
    return a;
  }
  function frontierTable(g) {
    return ['E', 'G'].map(m => UI.table([MKT_NAME[m], 'Scale', `Best in ${F.p(g.t)}`, `Best in ${F.p(g.t + 1)}`], MK[m].attrs.map(at => {
      const now = B.frontier(m, g.t)[at.k], nx = B.frontier(m, g.t + 1)[at.k];
      return [at.name + (at.low ? ' (lower is better)' : ''), `${at.min}–${at.max}${at.unit === '/10' ? '' : ' ' + at.unit}`, F.a(at, B.onGrid(at, now, now)), F.a(at, B.onGrid(at, nx, nx))];
    }), { sticky: true })).join('');
  }
  function rdView(g, ctx) {
    const d = g.draft, f = me(g);
    let h = mapSheet(g, ctx, 'rd');
    const running = activeProjects(g), ready = doneProjects(g);
    let list = '';
    running.forEach(p => { const pc = percOf(p.m, p.a); list += `<div class="rd-row"><div><span class="pc-n">${esc(projName(p))}</span> ${mktPill(p.m)}${p.seg ? ' ' + segPill(p.seg) : ''} ${UI.pill('Ready for ' + F.p(g.t + p.left), 'pen')}</div><p class="spec num">${specLine(p.m, p.a)}</p><p class="cap num">Perceived at ${F.xy(pc.x, pc.y)} · ${F.k(p.cost)}${p.periods > 1 ? ` over ${p.periods} periods` : ''}</p></div>`; });
    ready.forEach(p => {
      const pc = percOf(p.m, p.a), used = myBrands(g).some(b => (d.brands[b.id] || {}).project === p.id) || d.launches.some(L => L.project === p.id);
      list += `<div class="rd-row"><div><span class="pc-n">${esc(projName(p))}</span> ${mktPill(p.m)}${p.seg ? ' ' + segPill(p.seg) : ''} ${UI.pill(used ? 'In this period’s plan' : 'Ready', used ? 'pen' : 'good')}</div><p class="spec num">${specLine(p.m, p.a)}</p><p class="cap num">Perceived at ${F.xy(pc.x, pc.y)} · unit cost about ${F.usd(B.unitCost(p.m, p.a, MK[p.m].ref / 2))} at launch, ${F.usd(B.unitCost(p.m, p.a, MK[p.m].ref * 5))} with experience</p>${used ? '' : `<div class="chips sm">${chipBtn('Launch as a new brand', `data-op="ln-add" data-pid="${p.id}"`)}${myBrands(g).some(b => b.m === p.m) ? chipBtn('Use it to redesign a brand', `data-op="goto" data-sub="brands"`) : ''}</div>`}</div>`;
    });
    h += UI.sheet('Projects', running.length || ready.length ? `${plural(running.length, 'project')} running, ${ready.length} finished` : 'No projects yet', (list || '<p class="cap">Designs you fund appear here while they run and once they are finished. A finished design waits until you use it.</p>'));
    let body = `<p class="case">Each project creates a design: a set of physical attributes. When it is finished you can switch an existing brand to it, or launch it as a new brand. Earbud projects take one period. A firm’s first audio-glasses projects take two, until one is finished. Cost rises steeply as attributes approach the technology frontier.</p>`;
    d.projects.forEach((p, i) => { body += projectCard(g, p, i); });
    if (d.projects.length < 4) body += `<div class="actions">${UI.btn('New earbud design', 'm', 'btn-ghost', 'data-op="pj-add" data-m="E"')}${UI.btn('New audio-glasses design', 'm', 'btn-ghost', 'data-op="pj-add" data-m="G"')}</div>`;
    else body += '<p class="cap">Four new projects a period is the limit.</p>';
    h += UI.sheet(`New projects · ${F.p(g.t)}`, d.projects.length ? `${plural(d.projects.length, 'design')} to fund` : 'Fund a design', body);
    h += UI.sheet('Technology frontier', 'The best each attribute can be this period', frontierTable(g) + '<p class="cap">The frontier moves every period. Designs beyond it are impossible; designs close to it are expensive.</p>');
    void f;
    return h;
  }
  function projectCard(g, p, i) {
    const m = p.m, segs = SEGS.filter(s => s.m === m), K = p.seg ? knownIdeal(g, p.seg) : null;
    const fields = MK[m].attrs.map(at => { const bd = attrBounds(g, m, at); return fieldBox(`${at.name}${at.unit === '/10' ? '' : ' (' + at.unit + ')'}`, UI.num(`pj:${i}:${at.k}`, p.a[at.k], { min: bd.min, max: bd.max, step: at.step, dec: at.dec, label: `Design ${i + 1} ${at.name}` })); }).join('');
    const aims = p.seg ? `<div class="chips sm">${K ? chipBtn(`${esc(segOf(p.seg).name)} ideal ${K.src != null ? `(${F.p(K.src)} study)` : 'now'}`, `data-op="pj-aim" data-i="${i}" data-when="now"`) : ''}${K && K.next ? chipBtn(`${esc(segOf(p.seg).name)} ideal next period`, `data-op="pj-aim" data-i="${i}" data-when="next"`) : ''}${!K ? '<span class="cap">Buy the semantic scales study to see what this segment wants.</span>' : ''}</div>` : '';
    return `<article class="np"><header class="pc-h"><span class="pc-n">New design ${i + 1}</span>${mktPill(m)}<button type="button" class="link danger" data-act="m" data-op="pj-del" data-i="${i}">Remove</button></header>${UI.chips(`pj:${i}:seg`, 'Designed for', segs.map(s => ({ v: s.id, t: s.name })), p.seg)}<div class="pgrid">${fields}</div>${aims}<p class="hint" data-live="pjh:${i}">${projectHint(g, p)}</p></article>`;
  }
  function projectHint(g, p) {
    const f = me(g), bad = B.feasible(p.m, p.a, g.t);
    const c = B.projectCost(p.m, p.a, g.t, p.m === 'G' && !B.gDone(g, f)), pc = percOf(p.m, p.a);
    const parts = [`Perceived at about ${F.xy(pc.x, pc.y)}`, `<strong>${F.k(c.cost)}</strong>${c.periods > 1 ? ` over ${c.periods} periods (${F.k(c.cost / c.periods)} each)` : ''}`, `ready for ${F.p(g.t + c.periods)}`, `unit cost about ${F.usd(B.unitCost(p.m, p.a, MK[p.m].ref / 2))} at launch`];
    if (p.seg) {
      if (ideals(g)) { const s = B.segAt(g, segIdx(p.seg), g.t + c.periods); if (s.size > 0) parts.push(`${N.num(Math.hypot(pc.x - s.x, pc.y - s.y) / B.POS_SD, 2)} map units from where ${esc(s.name)} buyers will be in ${F.p(g.t + c.periods)}`); }
      else { const r = lastStudy(g, 'mds'); if (r) { const e = r.segs[segIdx(p.seg)]; if (e.size > 0) parts.push(`${N.num(Math.hypot(pc.x - e.x, pc.y - e.y) / B.POS_SD, 2)} map units from the ${esc(e.name)} ideal in the ${F.p(r.t)} map`); } }
    }
    if (bad.length) parts.unshift(`<span class="down">Beyond this period's technology: ${bad.map(k => MK[p.m].attrs.find(a => a.k === k).name.toLowerCase()).join(', ')}</span>`);
    return parts.join(' · ');
  }

  /* ---------- Decide: sales force ---------- */
  function sfTable(g) {
    const d = g.draft, f = me(g);
    const rows = CH.map((c, j) => {
      const now = f.sf[j], nx = Math.max(0, Math.round(+d.sf[j] || 0)), hire = Math.max(0, nx - now), fire = Math.max(0, now - nx);
      return [esc(c.name), F.pct(c.margin), String(now), String(nx), `${F.pct(B.coverage(now, j))} → ${F.pct(B.coverage(nx, j))}`, F.k(nx * B.SF_COST + hire * B.SF_HIRE + fire * B.SF_FIRE)];
    });
    const tot = d.sf.map(v => Math.max(0, Math.round(+v || 0)));
    const sp = B.budgetUse(g, d);
    return UI.table(['Channel', 'Retailer margin', 'Now', 'This period', 'Store coverage', 'Cost'], rows, { sticky: true, foot: ['Total', '', String(sum(f.sf)), String(sum(tot)), '', F.k(sp.sf)] });
  }
  function accTable(g) {
    const d = g.draft, f = me(g), gd = ideals(g), sv = lastStudy(g, 'survey');
    const segs = SEGS.filter(z => B.segAt(g, segIdx(z.id), g.t).size > 0 || B.segAt(g, segIdx(z.id), g.t + 1).size > 0);
    const chOf = z => (gd ? B.segAt(g, segIdx(z.id), Math.max(g.t, z.open || 1)).ch : sv ? sv.segs[segIdx(z.id)].ch : null);
    const reach = (ch, sf) => sum(ch.map((c, j) => c * B.coverage(Math.max(0, Math.round(+sf[j] || 0)), j)));
    const rows = segs.map(z => { const ch = chOf(z); return ch ? [segPill(z.id)].concat(ch.map(c => F.pct(c))).concat([`${F.pct(reach(ch, f.sf))} → ${F.pct(reach(ch, d.sf))}`]) : [segPill(z.id), '–', '–', '–', '–']; });
    return UI.table(['Segment'].concat(CH.map(c => c.name)).concat(['Your reach']), rows, { sticky: true }) + `<p class="cap">${gd ? 'How each segment shops this period, and the share of its buyers your sales force reaches now and with this plan.' : sv ? `How each segment shops, from the ${F.p(sv.t)} consumer survey, and the share of its buyers your sales force reaches.` : 'Buy the consumer survey to see how each segment shops.'}</p>`;
  }
  function sfView(g) {
    const d = g.draft, f = me(g), r = lastRep(g);
    const mine = r.brands.filter(b => b.firm === 'you'), chU = [0, 1, 2].map(j => sum(mine.map(b => b.chU[j] || 0))), tot = sum(chU) || 1;
    let h = UI.sheet(`Sales force · ${F.p(g.t)}`, 'Salespeople by retail channel', `<p class="case">Salespeople win shelf space and recommendations. Store coverage in a channel is the share of its stores that stock and push Aria's brands; it rises with headcount but each extra person adds less. Every segment shops in its own mix of channels, so coverage only matters where your buyers shop. Retailers keep a margin on every sale: specialty stores the most, online the least.</p><p class="cap">Each salesperson costs ${F.k(B.SF_COST)} a period. Hiring costs ${F.k(B.SF_HIRE)} a person and letting someone go ${F.k(B.SF_FIRE)}.</p><div class="pgrid">${CH.map((c, j) => fieldBox(c.name, UI.num(`sf:${j}`, d.sf[j], { min: 0, max: 200, step: 1, dec: 0, label: c.name + ' salespeople' }))).join('')}</div><div data-live="sf-t">${sfTable(g)}</div>`);
    h += UI.sheet('Reach by segment', 'Where your buyers shop', `<div data-live="sf-acc">${accTable(g)}</div>`);
    h += UI.sheet(`Your sales by channel · ${F.p(r.t)}`, null, UI.table(['Channel', 'Units', 'Share'], CH.map((c, j) => [esc(c.name), F.u(chU[j]), F.pct(chU[j] / tot)]), { sticky: true }));
    void f;
    return h;
  }

  /* ---------- Decide: research ---------- */
  function researchView(g) {
    const d = g.draft, cost = sum(d.studies.map(id => (STUDY[id] || { cost: 0 }).cost));
    const cards = B.STUDIES.map(s => {
      const on = d.studies.indexOf(s.id) >= 0;
      return `<article class="study${on ? ' on' : ''}"><div class="st-top"><span class="pc-n">${esc(s.name)}</span><span class="num">${F.k(s.cost)}</span></div><p class="cap">${esc(s.what)}</p>${s.id === 'conjoint' && on ? UI.chips('cj', 'Segment', SEGS.map(z => ({ v: z.id, t: z.name })), d.conjointSeg || 'com') : ''}<button type="button" class="btn ${on ? 'btn-primary' : 'btn-ghost'} btn-block" data-act="m" data-op="study" data-id="${s.id}" aria-pressed="${on}">${on ? 'Ordered' : 'Order'}</button></article>`;
    }).join('');
    void cost;
    return UI.sheet(`Market research · ${F.p(g.t)}`, 'Studies delivered with this period’s results', `<p class="case">Studies describe the market at the end of the period you order them in, and arrive with that period’s reports. What you do not buy, you do not see: rivals’ positions, segment needs and shares go stale fast.</p><div class="studies">${cards}</div><p class="cap" data-live="rs-tot">${studyTotal(d)}</p>`);
  }
  const studyTotal = d => `${d.studies.length} ${d.studies.length === 1 ? 'study' : 'studies'} ordered · ${F.k(sum(d.studies.map(id => (STUDY[id] || { cost: 0 }).cost)))} from the budget`;

  /* ---------- Decide: review and submit ---------- */
  function reviewView(g, ctx) {
    const P = proforma(g), list = checks(g, P), d = g.draft, f = me(g), b = countBad(list), w = countWarn(list), n = list.length - b - w;
    const counts = [b ? plural(b, 'problem') : null, w ? plural(w, 'warning') : null, n ? plural(n, 'note') : null].filter(Boolean).join(', ');
    let h = UI.sheet(`Review · ${F.p(g.t)}`, list.length ? counts.charAt(0).toUpperCase() + counts.slice(1) : 'Nothing flagged', list.length ? UI.warn(list) : '<p class="case">No problems found.</p>');
    const sp = P.spend;
    h += UI.sheet('Budget', `${F.k(sp.total)} of ${F.k(f.budget)}`, UI.table(['Item', 'Spend', 'Share'], [
      ['Advertising', F.k(sp.ads), F.pct(sp.ads / Math.max(1, f.budget))], ['Sales force', F.k(sp.sf), F.pct(sp.sf / Math.max(1, f.budget))], ['R&amp;D', F.k(sp.rd), F.pct(sp.rd / Math.max(1, f.budget))], ['Market research', F.k(sp.studies), F.pct(sp.studies / Math.max(1, f.budget))]
    ], { sticky: true, foot: ['Total', `<span class="${P.over > 0.5 ? 'down' : ''}">${F.k(sp.total)}</span>`, F.pct(sp.total / Math.max(1, f.budget))] }) + `<p class="cap">The budget comes from last period's contribution: ${F.k(10000)} plus 30% of it, up to ${F.k(45000)}.${P.over > 0.5 ? ` <strong class="down">Over budget by ${F.k(P.over)}.</strong>` : ` ${F.k(f.budget - sp.total)} left.`}</p>`);
    const rows = P.lines.map(l => [esc(l.name) + (l.isNew ? ' <span class="tag">new</span>' : ''), P.guided ? F.u(l.demand) : '–', F.u(l.prod), F.u(l.sold), F.usd(l.price), F.m(l.rev), F.m(l.cbm), F.m(l.ads), F.m(l.nmc)]);
    h += UI.sheet('Projection', P.guided ? `Estimated contribution ${F.m(P.nmc)}` : 'Your plan if everything you make sells', UI.table(['Brand', 'Estimate', 'Produced', 'Sold', 'Price', 'Revenue', 'Gross contr.', 'Advertising', 'After ads'], rows, { sticky: true }) + UI.table(['Company', P.guided ? 'Estimate' : 'Plan'], [['Gross contribution', F.m(P.cbm)], ['Advertising', F.m(-P.ads)], ['Sales force', F.m(-P.sf)], ['Market research', F.m(-P.studies)], ['R&amp;D', F.m(-P.rd)]].concat(P.writeOff > 0.005 ? [['Inventory written off', F.m(-P.writeOff)]] : []).map(r => ({ cls: 'sub', cells: r })).concat([{ cls: 'tot', cells: ['Net marketing contribution', F.m(P.nmc)] }]), { cls: 'stmt' }) + `<p class="cap">${P.guided ? 'The estimate assumes rivals keep last period’s prices and spending and keep moving the way they moved. They react, so treat it as a guide.' : 'Advanced level gives no demand estimate. This projection assumes you sell everything you plan to make.'}</p>`);
    const plan = myBrands(g).map(bd => { const x = d.brands[bd.id]; if (x.withdraw) return [esc(bd.name), 'Withdraw', '–', '–', '–', '–', '–']; return [esc(bd.name), x.seg ? segOf(x.seg).name : '–', F.usd(x.price), F.k(x.ads), F.pct(x.rsch), x.obj ? F.xy(x.obj.x, x.obj.y) : 'None', F.u(+x.prod || 0) + (x.project ? ` · design ${esc(projName(g.projects.find(p => p.id === x.project) || {}))}` : '')]; });
    d.launches.forEach(L => plan.push([esc(String(L.name || 'NEW').toUpperCase()) + ' <span class="tag">new</span>', L.seg ? segOf(L.seg).name : '–', F.usd(L.price), F.k(L.ads), '10%', 'None', F.u(+L.prod || 0)]));
    h += UI.sheet('Your plan', 'Decisions to submit', UI.table(['Brand', 'Target', 'Price', 'Advertising', 'Research', 'Objective', 'Production'], plan, { sticky: true }) + `<p class="ops">Sales force: ${CH.map((c, j) => `${c.name.split(' ')[0].toLowerCase()} ${Math.round(+d.sf[j] || 0)}`).join(' · ')} · Research: ${d.studies.length ? d.studies.map(id => STUDY[id].name.toLowerCase()).join(', ') : 'none'} · R&amp;D: ${d.projects.length ? plural(d.projects.length, 'new design') : 'no new designs'}</p>`);
    const confirm = ctx.ui.confirmSubmit === g.t;
    h += `<section class="sheet submit"><p class="case">When you submit, all five firms' decisions for ${F.p(g.t)} go to the market at once. You cannot change them afterwards.</p>${confirm ? `<p class="case"><strong class="down">Your plan has ${plural(b, 'problem')}.</strong> Submit anyway?</p><div class="actions"><button type="button" class="btn btn-danger" data-act="m" data-op="submit" data-force="1">Submit anyway</button><button type="button" class="btn btn-ghost" data-act="m" data-op="submit-cancel">Keep editing</button></div>` : `<button type="button" class="btn btn-primary btn-block" data-act="m" data-op="submit">${g.t === g.years ? 'Submit the final period' : `Submit ${F.p(g.t)} decisions`}</button>`}<div class="actions">${UI.btn('Reset this period’s draft', 'm', 'btn-ghost', 'data-op="reset-draft"')}</div></section>`;
    return h;
  }

  /* ---------- Decide wrapper ---------- */
  const SUBS = [{ v: 'brief', t: 'Brief' }, { v: 'brands', t: 'Brands' }, { v: 'rd', t: 'R&D' }, { v: 'sf', t: 'Sales force' }, { v: 'research', t: 'Research' }, { v: 'review', t: 'Review' }];
  function decideView(g, ctx) {
    const sub = uiStr(ctx, 'sub', 'brief');
    const P = proforma(g), b = countBad(checks(g, P));
    let h = UI.tabs('sub', SUBS.map(s => s.v === 'review' && b ? Object.assign({}, s, { badge: String(b), bt: 'bad' }) : s.v === 'rd' && g.draft.projects.length ? Object.assign({}, s, { badge: String(g.draft.projects.length) }) : s), sub, 'sub-tabs', true);
    if (sub === 'brands') h += brandsView(g, ctx);
    else if (sub === 'rd') h += rdView(g, ctx);
    else if (sub === 'sf') h += sfView(g);
    else if (sub === 'research') h += researchView(g);
    else if (sub === 'review') h += reviewView(g, ctx);
    else h += briefView(g, ctx);
    if (sub !== 'review') {
      const i = SUBS.findIndex(s => s.v === sub), nx = SUBS[i + 1];
      if (nx && nx.v !== 'review') h += `<div class="actions next">${UI.btn(`Next: ${nx.t} →`, 'tab', 'btn-ghost', `data-group="sub" data-value="${nx.v}" data-top="1"`)}</div>`;
      h += dock(g);
    }
    return h;
  }

  /* ---------- Reports ---------- */
  const REPS = [{ v: 'summary', t: 'Summary' }, { v: 'company', t: 'Your company' }, { v: 'news', t: 'Newsletter' }, { v: 'studies', t: 'Studies' }, { v: 'map', t: 'Map' }, { v: 'decisions', t: 'Your decisions' }];
  function reportsView(g, ctx) {
    const lastT = lastRep(g).t;
    let rt = Number(uiStr(ctx, 'rt', lastT)); if (!(rt >= 0 && rt <= lastT)) rt = lastT;
    const rep = uiStr(ctx, 'rep', 'summary'), r = g.reports[rt];
    let h = '';
    if (ctx.ui.justDone != null && Number(ctx.ui.justDone) === lastT && !B.isDone(g)) h += resultsBanner(g, lastT);
    h += `<div class="rep-head">${UI.tabs('rt', g.reports.map(x => ({ v: x.t, t: F.p(x.t) })), rt, 'yr-tabs')}</div>`;
    h += UI.tabs('rep', REPS, rep, 'sub-tabs', false);
    if (rep === 'company') h += repCompany(g, r);
    else if (rep === 'news') h += repNews(g, r);
    else if (rep === 'studies') h += repStudies(g, r, ctx);
    else if (rep === 'map') h += repMap(g, r, ctx);
    else if (rep === 'decisions') h += repDecisions(g, r);
    else h += repSummary(g, r);
    return h;
  }
  function resultsBanner(g, t) {
    const r = g.reports[t], R = r.firms[0].res, P = g.reports[t - 1].firms[0].res;
    const order = r.firms.slice().sort((a, b) => b.res.spi - a.res.spi), rank = order.findIndex(f => f.id === 'you') + 1;
    const lines = [];
    r.brands.filter(b => b.firm === 'you' && b.active).forEach(b => {
      if (b.stockout) lines.push({ t: 'warn', m: `<strong>${esc(b.name)}</strong> sold out: about ${F.u(b.demand)} wanted it and you had ${F.u(b.sold)}.` });
      else if (b.inv > Math.max(5, 0.25 * b.sold)) lines.push({ t: 'warn', m: `<strong>${esc(b.name)}</strong> ended with ${F.u(b.inv)} unsold.` });
      if (b.born === t) lines.push({ t: 'good', m: `<strong>${esc(b.name)}</strong> launched and sold ${F.u(b.sold)}.` });
    });
    if (r.firms[0].res.spent > 0 && me(g).trimmed) lines.unshift({ t: 'bad', m: 'Your plan was over budget, so advertising was cut to fit.' });
    return `<section class="sheet result"><header class="sh"><span class="eyebrow">${F.p(t)} results</span><h2>${F.m(R.nmc)} contribution · stock index ${N.int(R.spi)}</h2></header>${UI.kpis([
      { k: 'Revenue', v: F.m(R.rev), d: N.sign(R.rev - P.rev, v => F.m(v)), cls: signCls(R.rev - P.rev) },
      { k: 'Value share', v: F.pct(R.valShare, 1), d: N.sign((R.valShare - P.valShare) * 100, v => N.num(v, 1) + ' pts'), cls: signCls(R.valShare - P.valShare) },
      { k: 'Stock index rank', v: '#' + rank + ' of 5', d: N.sign(R.spi - P.spi, v => N.int(v)), cls: signCls(R.spi - P.spi) },
      { k: `Budget ${F.p(t + 1)}`, v: F.m(R.budgetNext) }
    ])}${UI.warn(lines.slice(0, 6))}<div class="actions">${UI.btn(`Plan ${F.p(g.t)} →`, 'm', 'btn-primary', 'data-op="goto" data-tab="decide" data-sub="brief"')}</div></section>`;
  }
  function seriesBy(g, upto, fn) { return g.firms.map((f, i) => ({ values: g.reports.slice(0, upto + 1).map(r => fn(r.firms[i], r)), c: fCol(f.id), w: f.id === 'you' ? 3 : 1.6, dots: upto < 3 })); }
  const firmLegend = g => g.firms.map(f => ({ t: f.id === 'you' ? 'Aria (you)' : f.short, c: fCol(f.id) }));
  function repSummary(g, r) {
    const anyG = r.firms.some(f => f.res.gShare > 0);
    let h = UI.sheet(`Industry summary · ${F.p(r.t)}`, r.t === 0 ? 'The starting position' : 'How the five firms did', UI.table(['Firm', 'Stock index', 'Revenue', 'Contribution', 'Value share', 'Unit share'].concat(anyG ? ['Glasses share'] : []).concat(['Budget next']), r.firms.map(f => ({ cls: f.id === 'you' ? 'me' : '', cells: [dot(f.id) + esc(f.short), N.int(f.res.spi), F.m(f.res.rev), F.m(f.res.nmc), F.pct(f.res.valShare, 1), F.pct(f.res.unitShare, 1)].concat(anyG ? [F.pct(f.res.gShare, 1)] : []).concat([F.m(f.res.budgetNext)]) })), { sticky: true }) + '<p class="cap">Contribution is net marketing contribution: revenue after retailer margins, minus cost of goods, inventory holding, advertising, sales force, research and R&amp;D. Value share is of all retail sales, earbuds and glasses together.</p>');
    h += UI.sheet('Trends', 'Stock price index, contribution and value share', UI.chart('bl-spi', () => ({ series: seriesBy(g, r.t, f => f.res.spi), xLabel: i => F.p(i), yMin: 0 }), 200, firmLegend(g), 'Stock price index by firm') + '<p class="cap">Stock price index (1,000 at the start)</p>' +
      UI.chart('bl-nmc', () => ({ series: seriesBy(g, r.t, f => f.res.nmc), xLabel: i => F.p(i), yFmt: moneyAxis, refs: [{ y: 0 }] }), 190, null, 'Net marketing contribution by firm') + '<p class="cap">Net marketing contribution, $M</p>' +
      UI.chart('bl-val', () => ({ series: seriesBy(g, r.t, f => f.res.valShare * 100), xLabel: i => F.p(i), yMin: 0, yFmt: v => v + '%' }), 190, null, 'Value share by firm') + '<p class="cap">Share of all retail sales by value</p>' +
      `<div class="actions">${UI.btn(`Download ${F.p(r.t)} brand data (CSV)`, 'm', 'btn-ghost', 'data-op="csv"')}</div><p class="cap">The file includes only what you can see for ${F.p(r.t)}: rivals' awareness, positions and segment sales appear only if you bought those studies.</p>`);
    return h;
  }
  function repCompany(g, r) {
    const R = r.firms[0].res, mine = r.brands.filter(b => b.firm === 'you');
    let h = UI.sheet(`Aria Audio · ${F.p(r.t)}`, 'Results by brand', UI.kpis([{ k: 'Revenue', v: F.m(R.rev) }, { k: 'Gross contribution', v: F.m(R.cbm) }, { k: 'Net contribution', v: F.m(R.nmc) }, { k: `Budget ${F.p(r.t + 1)}`, v: F.m(R.budgetNext) }]) +
      UI.table(['Brand', 'Units', 'Net price', 'Revenue', 'Cost of goods', 'Holding', 'Gross contr.', 'Advertising', 'After ads'], R.lines.map(l => [esc(l.name), F.u(l.units), F.usd(l.netPrice), F.m(l.rev), F.m(l.cogs), F.m(l.hold), F.m(l.cbm), F.m(l.ads), F.m(l.nmc)]), { sticky: true, foot: ['Total', F.u(R.units), '', F.m(R.rev), F.m(R.cogs), F.m(R.hold), F.m(R.cbm), F.m(R.ads), F.m(R.cbm - R.ads)] }) + '<p class="cap">Revenue is after retailer margins. Net price is revenue per unit. Holding is the cost of carrying unsold stock.</p>');
    h += UI.sheet('Company', 'From gross to net contribution', UI.table(['$M', F.p(r.t)], [['Gross contribution', F.m(R.cbm)], ['Advertising', F.m(-R.ads)], ['Sales force', F.m(-R.sf)], ['Market research', F.m(-R.studies)], ['R&amp;D', F.m(-R.rd)]].concat(R.writeOff > 0.005 ? [['Inventory written off', F.m(-R.writeOff)]] : []).map(x => ({ cls: 'sub', cells: x })).concat([{ cls: 'tot', cells: ['Net marketing contribution', F.m(R.nmc)] }]), { cls: 'stmt' }) + `<p class="cap">Spent ${F.m(R.spent)} of a ${F.m(R.budget)} budget.</p>`);
    h += UI.sheet('Production', 'Plan, output and stock', UI.table(['Brand', 'Plan', 'Produced', 'Demand', 'Sold', 'End stock', 'Unit cost', 'Awareness'], mine.filter(b => b.active || b.withdrawn).map(b => [esc(b.name) + (b.withdrawn ? ' <span class="tag">withdrawn</span>' : b.born === r.t && r.t > 0 ? ' <span class="tag">new</span>' : b.revised ? ' <span class="tag">redesigned</span>' : ''), F.u(b.prodPlan), F.u(b.prod), F.u(b.demand), F.u(b.sold) + (b.stockout ? ' <span class="pill warn">sold out</span>' : b.spill > 0.5 ? ` <small>+${F.u(b.spill)} from rivals' shortages</small>` : ''), F.u(b.inv), F.usd(b.unitCost), F.pct(b.aw)]), { sticky: true }) + '<p class="cap">Production can flex up to 20% either side of the plan to meet demand. Demand is what buyers wanted; a brand that runs out loses most of the rest to rivals with stock.</p>');
    const chU = [0, 1, 2].map(j => sum(mine.map(b => b.chU[j] || 0))), tot = sum(chU) || 1;
    h += UI.sheet('Channels', 'Your sales by channel', UI.table(['Channel', 'Units', 'Share', 'Salespeople', 'Coverage'], CH.map((c, j) => [esc(c.name), F.u(chU[j]), F.pct(chU[j] / tot), String(r.firms[0].sf[j]), F.pct(r.firms[0].cov[j])]), { sticky: true }));
    return h;
  }
  function repNews(g, r) {
    const prev = r.t > 0 ? g.reports[r.t - 1] : null;
    const tot = m => { const bs = r.brands.filter(b => b.m === m && b.active); return { u: sum(bs.map(b => b.sold)), v: sum(bs.map(b => b.sold * b.price)) / 1000 }; };
    const ptot = m => { if (!prev) return null; const bs = prev.brands.filter(b => b.m === m && b.active); return { u: sum(bs.map(b => b.sold)), v: sum(bs.map(b => b.sold * b.price)) / 1000 }; };
    const mrows = ['E', 'G'].map(m => { const a = tot(m), p = ptot(m); return [MKT_NAME[m], F.u(a.u), F.m(a.v), p && p.u > 0 ? N.sign((a.u / p.u - 1) * 100, v => N.num(v, 1) + '%') : a.u > 0 ? 'new' : '–']; });
    let h = UI.sheet(`Newsletter · ${F.p(r.t)}`, 'Free to every firm', UI.table(['Market', 'Units', 'Retail value', 'Growth'], mrows, { sticky: true }) + '<p class="cap">Retail value at shelf prices, before retailer margins.</p>');
    const srows = SEGS.map((s, i) => { const e = r.segs[i]; if (!(e.size > 0)) return null; const pe = prev ? prev.segs[i] : null; return [segPill(s.id), MKT_NAME[s.m], F.u(e.size), pe && pe.size > 0 ? N.sign((e.size / pe.size - 1) * 100, v => N.num(v, 1) + '%') : 'new']; }).filter(Boolean);
    h += UI.sheet('Segments', 'Potential buyers this period', UI.table(['Segment', 'Market', 'Buyers', 'Growth'], srows, { sticky: true }) + '<p class="cap">Thousands of potential buyers. How many actually bought, and which brands, is in the consumer panel.</p>');
    ['E', 'G'].forEach(m => {
      const bs = r.brands.filter(b => b.m === m && (b.active || b.withdrawn)).sort((a, b) => b.sold - a.sold); if (!bs.length) return;
      const T = tot(m);
      h += UI.sheet(MKT_NAME[m], `${bs.length} brands`, UI.table(['Brand', 'Firm', 'Units', 'Price', 'Unit share', 'Value share'], bs.map(b => ({ cls: b.firm === 'you' ? 'me' : '', cells: [dot(b.firm) + esc(b.name) + (b.born === r.t && r.t > 0 ? ' <span class="tag">new</span>' : b.revised ? ' <span class="tag">redesigned</span>' : b.withdrawn ? ' <span class="tag">withdrawn</span>' : ''), esc(g.firms.find(f => f.id === b.firm).short), F.u(b.sold), F.usd(b.price), F.pct(T.u > 0 ? b.sold / T.u : 0, 1), F.pct(T.v > 0 ? b.sold * b.price / 1000 / T.v : 0, 1)] })), { sticky: true }));
    });
    const news = newsItems(g, r);
    if (news.length) h += UI.sheet('News', 'Moves by rivals', `<ul class="news">${news.map(n => `<li>${n}</li>`).join('')}</ul>`);
    return h;
  }
  const STUDY_SHORT = { survey: 'Survey', panel: 'Panel', dist: 'Distribution', semantic: 'Semantic scales', mds: 'Perceptual map', forecast: 'Forecast', compAds: 'Rival advertising', compSF: 'Rival sales forces', conjoint: 'Conjoint' };
  const STUDY_TABS = B.STUDIES.map(s => ({ v: s.id, t: STUDY_SHORT[s.id] || s.name }));
  function repStudies(g, r, ctx) {
    const sid = uiStr(ctx, 'study', 'survey');
    let h = UI.tabs('study', STUDY_TABS.map(t => (study(r, t.v) ? t : { v: t.v, t: `<span class="tab-na">${t.t}</span>` })), sid, 'seg-tabs') + `<p class="cap">Faded studies were not bought for ${F.p(r.t)}.</p>`;
    const S0 = STUDY[sid];
    if (!study(r, sid)) return h + UI.sheet(S0.name, `Not bought for ${F.p(r.t)}`, UI.empty(`${esc(S0.what)} Order it in Research and it arrives with that period's results. It costs ${F.k(S0.cost)}.`));
    const openSeg = SEGS.map((s, i) => ({ s, i, e: r.segs[i] })).filter(x => x.e.size > 0);
    const soonSeg = SEGS.map((s, i) => ({ s, i, e: r.segs[i] })).filter(x => x.e.size > 0 || x.e.next > 0 || x.e.next2 > 0);
    const soonLabel = x => segPill(x.s.id) + (x.e.size > 0 ? '' : ` <small>opens ${F.p(x.s.open)}</small>`);
    const brandsOn = r.brands.filter(b => b.active);
    if (sid === 'survey') {
      h += UI.sheet(`Consumer survey · ${F.p(r.t)}`, 'Awareness', UI.table(['Brand', 'Firm', 'Market', 'Awareness'], brandsOn.sort((a, b) => b.aw - a.aw).map(b => ({ cls: b.firm === 'you' ? 'me' : '', cells: [dot(b.firm) + esc(b.name), esc(g.firms.find(f => f.id === b.firm).short), MKT_NAME[b.m], F.pct(b.aw)] })), { sticky: true }) + '<p class="cap">Share of all buyers who know the brand, at the end of the period.</p>');
      ['E', 'G'].forEach(m => {
        const segs = openSeg.filter(x => x.s.m === m); if (!segs.length) return;
        const bs = brandsOn.filter(b => b.m === m);
        h += UI.sheet(`Purchase intentions · ${MKT_NAME[m]}`, 'Which brand each segment would choose', UI.table(['Brand'].concat(segs.map(x => x.s.name)), bs.map(b => ({ cls: b.firm === 'you' ? 'me' : '', cells: [dot(b.firm) + esc(b.name)].concat(segs.map(x => (x.e.size > 0 && b.dem[x.i] / x.e.size >= 0.001 ? F.pct(b.dem[x.i] / x.e.size, 1) : '–'))) })).concat([{ cls: 'sub', cells: ['No purchase'].concat(segs.map(x => F.pct(1 - sum(bs.map(b => b.dem[x.i])) / x.e.size))) }]), { sticky: true }) + '<p class="cap">Share of each segment that intends to buy each brand, if it were in stock everywhere.</p>');
      });
      h += UI.sheet('Shopping habits', 'Where each segment buys', UI.table(['Segment'].concat(CH.map(c => c.name)), openSeg.map(x => [segPill(x.s.id)].concat(x.e.ch.map(c => F.pct(c)))), { sticky: true }) + '<p class="cap">Online grows a little every period.</p>');
    } else if (sid === 'panel') {
      ['E', 'G'].forEach(m => {
        const segs = openSeg.filter(x => x.s.m === m); if (!segs.length) return;
        const bs = brandsOn.filter(b => b.m === m && b.sold > 0.05);
        h += UI.sheet(`Consumer panel · ${MKT_NAME[m]} · ${F.p(r.t)}`, 'Unit market share by segment', UI.table(['Brand'].concat(segs.map(x => x.s.name)).concat(['Total']), bs.map(b => ({ cls: b.firm === 'you' ? 'me' : '', cells: [dot(b.firm) + esc(b.name)].concat(segs.map(x => (x.e.sold > 0 && b.soldSeg[x.i] / x.e.sold >= 0.001 ? F.pct(b.soldSeg[x.i] / x.e.sold, 1) : '–'))).concat([F.u(b.sold)]) })).concat([{ cls: 'sub', cells: ['Units sold'].concat(segs.map(x => F.u(x.e.sold))).concat([F.u(sum(bs.map(b => b.sold)))]) }]), { sticky: true }) + '<p class="cap">Shares of units sold in each segment. The bottom row is what each segment actually bought.</p>');
      });
    } else if (sid === 'dist') {
      h += UI.sheet(`Distribution panel · ${F.p(r.t)}`, 'Sales by channel', UI.table(['Brand'].concat(CH.map(c => c.name)), brandsOn.filter(b => b.sold > 0.05).map(b => ({ cls: b.firm === 'you' ? 'me' : '', cells: [dot(b.firm) + esc(b.name)].concat([0, 1, 2].map(j => F.u(b.chU[j] || 0))) })), { sticky: true }));
      h += UI.sheet('Store coverage', 'Share of stores each firm reaches', UI.table(['Firm'].concat(CH.map(c => c.name)), r.firms.map(f => ({ cls: f.id === 'you' ? 'me' : '', cells: [dot(f.id) + esc(f.short)].concat(f.cov.map(v => F.pct(v))) })), { sticky: true }));
    } else if (sid === 'semantic') {
      ['E', 'G'].forEach(m => {
        const segs = soonSeg.filter(x => x.s.m === m), atts = MK[m].attrs;
        if (segs.length) h += UI.sheet(`Semantic scales · ${MKT_NAME[m]} · ${F.p(r.t)}`, 'What each segment ideally wants', UI.table(['Segment'].concat(atts.map(a => a.name)), segs.map(x => [soonLabel(x)].concat(atts.map(a => F.a(a, x.e.ideal[a.k])))), { sticky: true }) + `<p class="cap">Ideal attribute levels this period${segs.some(x => !(x.e.size > 0)) ? '; for segments not yet buying, concept tests of what they will want when they arrive' : ''}. Ideals drift every period.</p>`);
        const bs = brandsOn.filter(b => b.m === m);
        if (bs.length) h += UI.sheet(null, `How buyers rate ${MKT_NAME[m].toLowerCase()} brands`, UI.table(['Brand'].concat(atts.map(a => a.name)), bs.map(b => ({ cls: b.firm === 'you' ? 'me' : '', cells: [dot(b.firm) + esc(b.name)].concat(atts.map(a => F.a(a, b.a[a.k]))) })), { sticky: true }));
      });
    } else if (sid === 'mds') {
      h += repMap(g, r, ctx);
      ['E', 'G'].forEach(m => {
        const bs = brandsOn.filter(b => b.m === m), segs = soonSeg.filter(x => x.s.m === m); if (!bs.length && !segs.length) return;
        h += UI.sheet(`Coordinates · ${MKT_NAME[m]}`, null, UI.table(['Brand or segment', MK[m].dims[0], MK[m].dims[1]], segs.map(x => [soonLabel(x) + ' ideal', N.num(x.e.x, 2), N.num(x.e.y, 2)]).concat(bs.map(b => ({ cls: b.firm === 'you' ? 'me' : '', cells: [dot(b.firm) + esc(b.name), N.num(b.x, 2), N.num(b.y, 2)] }))), { sticky: true }));
      });
    } else if (sid === 'forecast') {
      h += UI.sheet(`Market forecast · from ${F.p(r.t)}`, 'Expected potential buyers', UI.table(['Segment', F.p(r.t), F.p(r.t + 1), F.p(r.t + 2)], SEGS.map((s, i) => { const e = r.segs[i]; if (!(e.size > 0 || e.next > 0 || e.next2 > 0)) return null; return [segPill(s.id), e.size > 0 ? F.u(e.size) : '–', e.next > 0 ? F.u(e.next) : '–', e.next2 > 0 ? F.u(e.next2) : '–']; }).filter(Boolean), { sticky: true }) + '<p class="cap">Forecasts are close but not exact; audio-glasses demand is the hardest to call.</p>');
    } else if (sid === 'compAds') {
      h += UI.sheet(`Rival advertising · ${F.p(r.t)}`, 'Estimated budgets by brand', UI.table(['Brand', 'Firm', 'Advertising', 'Ad research'], brandsOn.filter(b => b.firm !== 'you').sort((a, b) => b.ads - a.ads).map(b => [dot(b.firm) + esc(b.name), esc(g.firms.find(f => f.id === b.firm).short), F.k(b.ads), F.pct(b.rsch || 0)]), { sticky: true }));
    } else if (sid === 'compSF') {
      h += UI.sheet(`Rival sales forces · ${F.p(r.t)}`, 'Salespeople by channel', UI.table(['Firm'].concat(CH.map(c => c.name)).concat(['Total']), r.firms.map(f => ({ cls: f.id === 'you' ? 'me' : '', cells: [dot(f.id) + esc(f.short)].concat(f.sf.map(v => String(v))).concat([String(sum(f.sf))]) })), { sticky: true }));
    } else if (sid === 'conjoint') {
      const c = r.conjoint;
      if (c) {
        const bar = v => `<span class="cjb"><i style="width:${clamp(v, 0, 150) / 1.5}%"></i></span><span class="num">${v}</span>`;
        h += UI.sheet(`Conjoint analysis · ${esc(c.name)} · ${F.p(r.t)}`, 'How much each attribute level is worth', UI.table(['Attribute', 'Importance'].concat(['Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5']), c.attrs.map(a => [esc(a.name), F.pct(a.importance)].concat(a.levels.map((lv, k) => `<span class="cjl">${F.a(MK[c.m].attrs.find(x => x.k === a.k), lv)}</span>${bar(a.utils[k])}`))), { sticky: true, cls: 'cj' }) +
          UI.table(['Price', 'Utility'], c.prices.map(p => [F.usd(p.price), bar(p.util)]), { sticky: true, cls: 'cj' }) + `<p class="cap">Utility 100 is the best level with everything else at the segment's ideal. Price importance ${F.pct(c.priceImportance)}. Levels span each attribute's full scale.</p>`);
      }
    }
    return h;
  }
  function repMap(g, r, ctx) {
    const mkts = ['E'].concat(r.brands.some(b => b.m === 'G' && b.active) || r.segs.some(e => e.m === 'G' && (e.size > 0 || e.next > 0 || e.next2 > 0)) ? ['G'] : []);
    let m = uiStr(ctx, 'rmkt', 'E'); if (mkts.indexOf(m) < 0) m = 'E';
    if (!study(r, 'mds')) return UI.sheet(`Perceptual map · ${F.p(r.t)}`, 'Not bought', UI.empty(`The perceptual map study was not bought for ${F.p(r.t)}. It costs ${F.k(STUDY.mds.cost)}.`));
    const spec = () => { const sp = mapSpec(g, m, { rep: r, labelRivals: true }); r.brands.filter(b => b.firm === 'you' && b.active && b.m === m).forEach(b => sp.points.push({ x: b.x, y: b.y, c: fCol('you'), r: 5.5, big: true, label: b.name })); return sp; };
    return UI.sheet(`Perceptual map · end of ${F.p(r.t)}`, 'All brands and segment ideal points', (mkts.length > 1 ? UI.tabs('rmkt', mkts.map(k => ({ v: k, t: MKT_NAME[k] })), m, 'seg-tabs') : '') + UI.chart('bl-rmap', spec, mapH(), firmLegend(g), `Perceptual map of ${MKT_NAME[m].toLowerCase()}`) + `<p class="cap">Brands as buyers perceived them at the end of ${F.p(r.t)}, with each segment's ideal point (+).</p>`);
  }
  function repDecisions(g, r) {
    const d = r.you;
    if (!d || r.t === 0) return UI.sheet('Your decisions', F.p(0), UI.empty(`${F.p(0)} was run by the previous management.`));
    const rows = Object.keys(d.brands || {}).map(id => { const x = d.brands[id], b = r.brands.find(z => z.id === id) || g.brands.find(z => z.id === id) || {}; return [esc(b.name || id), x.withdraw ? 'Withdrawn' : x.seg ? segOf(x.seg).name : '–', F.usd(x.price), F.k(x.ads), F.pct(x.rsch || 0), x.obj ? F.xy(x.obj.x, x.obj.y) : 'None', F.u(+x.prod || 0), x.project ? esc(projName(g.projects.find(p => p.id === x.project) || {})) : '–', F.u(b.sold || 0)]; });
    (d.launches || []).forEach(L => { const b = r.brands.find(z => z.born === r.t && z.firm === 'you' && z.name.indexOf(String(L.name || '').toUpperCase().slice(0, 10)) === 0); rows.push([esc(String(L.name || '').toUpperCase()) + ' <span class="tag">new</span>', L.seg ? segOf(L.seg).name : '–', F.usd(L.price), F.k(L.ads), '10%', 'None', F.u(+L.prod || 0), esc(projName(g.projects.find(p => p.id === L.project) || {})), F.u(b ? b.sold : 0)]); });
    const pj = (d.projects || []).map((p, i) => `design ${i + 1} (${MKT_NAME[p.m].toLowerCase()}: ${specLine(p.m, p.a)})`);
    return UI.sheet(`Your decisions · ${F.p(r.t)}`, 'What you submitted', UI.table(['Brand', 'Target', 'Price', 'Advertising', 'Research', 'Objective', 'Production', 'Design', 'Sold'], rows, { sticky: true }) + `<p class="ops">Sales force: ${CH.map((c, j) => `${c.name.split(' ')[0].toLowerCase()} ${(d.sf || [])[j]}`).join(' · ')}</p><p class="ops">Research: ${(d.studies || []).length ? d.studies.map(id => STUDY[id].name.toLowerCase()).join(', ') : 'none'}</p><p class="ops">R&amp;D: ${pj.length ? pj.join('; ') : 'no new designs'}</p>`);
  }

  /* ---------- Guide ---------- */
  function guideView(g) {
    const sens = el => (el <= 1.0 ? 'Low' : el <= 1.6 ? 'Medium' : 'High');
    const segRows = SEGS.map((s, i) => { const e = B.segAt(g, i, s.m === 'G' ? (s.id === 'fol' ? 5 : 3) : 1); return [segPill(s.id), MKT_NAME[s.m], s.m === 'G' ? `from ${F.p(s.id === 'fol' ? 5 : 3)}` : F.u(e.size), s.m === 'E' ? F.pct(s.growth, 0) : 'fast', F.usd(e.price), sens(s.el), e.ch.map(c => F.pct(c)).join(' / '), esc(s.who)]; });
    let h = `<section class="hero"><span class="eyebrow">Participant guide</span><h1>How Brand Lab works</h1><p class="lede">The rules the market uses. Rival strategies are revealed in the debrief.</p></section>`;
    h += UI.fold('The industry', `<div class="case"><p>Five firms sell personal audio. Each starts with two <strong>earbud</strong> brands. From ${F.p(3)} a new category, <strong>audio glasses</strong>, opens to its first buyers and grows fast. The rivals are run by the computer, each with its own strategy. Units are thousands; money is in thousands ($k) for decisions and millions ($M) in reports.</p><p>A full game is 8 periods (a short one, 6). ${F.p(0)} already happened under the previous management.</p></div>`, true, '1');
    h += UI.fold('Segments', UI.table(['Segment', 'Market', 'Buyers', 'Growth', 'Ref. price', 'Price sensitivity', 'Specialty / big-box / online', 'Who they are'], segRows, { sticky: true, cls: 'wrap' }) + `<div class="case"><p>Each segment has an <strong>ideal</strong> set of attributes, which drifts every period: buyers want more battery, more noise cancelling, more smart features and lighter products over time. Reference prices drift down a little every period, faster for glasses.</p></div>`, false, '2');
    h += UI.fold('Perception and the map', `<div class="case"><p>Buyers do not see attributes directly. They see two <strong>perceptual dimensions</strong>, built from the attributes:</p></div>` + UI.table(['Market', 'Horizontal', 'Vertical'], [['Earbuds', 'Performance = 0.45 × sound + 0.35 × noise cancelling + 0.20 × (battery − 4)', 'Lifestyle = 0.55 × design + 1.0 × (8 − weight)'], ['Audio glasses', 'Tech = 0.5 × smart features + 0.3 × sound + 0.2 × (battery − 2)', 'Comfort = 0.5 × design + 0.125 × (70 − weight)']], { cls: 'wrap' }) + `<div class="case"><p>A brand's appeal to a segment falls with its distance from the segment's ideal point. One map unit is ${N.num(B.POS_SD, 1)} points on the scale: a brand one unit away keeps about 60% of its appeal, two units away about 14%. On the maps, each ring is 0.75 units from its ideal point: inside it a brand keeps at least three quarters of its appeal.</p><p>Advertising can move <strong>perception</strong> without changing the product: set a perceptual objective and the brand drifts toward it, faster with more effective advertising. The shift is limited to 1.5 points, fades 30% a period unless you keep pushing, and mostly resets when the brand is redesigned.</p></div>`, false, '3');
    h += UI.fold('How buyers choose', `<div class="case"><p>For every brand and segment the market computes an appeal: closeness to the ideal point, times price appeal, times awareness, times accessibility through the channels the segment uses. Demand is shared in proportion to appeal squared, so a clear lead wins a large share. Some buyers walk away if nothing appeals to them, so a segment with no good brand under-buys.</p><p>Price appeal compares your price with the segment's reference price. Above it, appeal falls quickly, and faster in price-sensitive segments; below it, appeal rises, but with diminishing returns.</p></div>`, false, '4');
    h += UI.fold('Advertising', `<div class="case"><p><strong>Awareness</strong> loses a quarter of its level every period and is rebuilt by advertising, with diminishing returns: about $3,000k a period keeps a brand at roughly 80%, $1,500k at about 67%. A new brand starts at 5%.</p><p><strong>Ad research</strong> is the share of a brand's advertising spent on testing the message. Spending nothing wastes much of the budget; about 10–15% makes advertising nearly twice as effective; beyond 25% the research costs more than it adds.</p></div>`, false, '5');
    h += UI.fold('Sales force and channels', UI.table(['Channel', 'Retailer margin', 'Coverage with 20', 'With 40'], CH.map((c, j) => [esc(c.name), F.pct(c.margin), F.pct(B.coverage(20, j)), F.pct(B.coverage(40, j))])) + `<div class="case"><p>Coverage is the share of stores in a channel that stock and push your brands. A segment's <strong>accessibility</strong> is your coverage weighted by how that segment shops. Salespeople cost ${F.k(B.SF_COST)} a period, ${F.k(B.SF_HIRE)} to hire and ${F.k(B.SF_FIRE)} to let go. Revenue is what remains after the retailer's margin.</p></div>`, false, '6');
    h += UI.fold('R&D', `<div class="case"><p>An R&amp;D project creates a design. You set every attribute, within the <strong>technology frontier</strong>, which improves each period. Cost grows steeply as attributes approach the frontier: from about ${F.k(Math.round(MK.E.rdBase * 0.7))} for a modest earbud to over ${F.k(Math.round(MK.E.rdBase * 3))} for one at the frontier; glasses cost over three times as much. Earbud projects finish in one period. A firm's first audio-glasses projects take two periods; once one is finished, later ones take one.</p><p>A finished design waits until you use it. <strong>Redesigning</strong> a brand switches it to the design at the start of a period: stock of the old version is written off at half its cost, most of its advertising-driven perception shift is lost, and production experience partly resets. <strong>Launching</strong> a design creates a new brand. Aria can run at most ${B.MAX_BRANDS} brands.</p></div>`, false, '7');
    h += UI.fold('Production and costs', `<div class="case"><p>You plan production for each brand. Actual output flexes up to 20% either side of the plan to meet demand. Stock left at the end of a period costs ${F.pct(B.HOLD)} of its value to hold and is sold first next period. A brand that runs out loses the rest of its demand; about 60% of it goes to rival brands that still have stock.</p><p>Unit cost depends on the attributes (more of everything costs more, lighter costs more) and falls about 8% with every doubling of the brand's cumulative production.</p></div>`, false, '8');
    h += UI.fold('Market research', UI.table(['Study', 'Cost', 'What it shows'], B.STUDIES.map(s => [esc(s.name), F.k(s.cost), esc(s.what)]), { cls: 'wrap' }) + `<div class="case"><p>Studies describe the market at the end of the period you order them in. The newsletter, your own company report and your own brands' awareness are free.${ideals(g) ? ' Foundation level also shows this period’s true segment ideal points and a demand estimate.' : guided(g) ? ' Intermediate level shows a demand estimate; ideal points come only from your research.' : ''}</p></div>`, false, '9');
    h += UI.fold('Budget, contribution and the stock price index', `<div class="case"><p>Your marketing budget each period is ${F.k(10000)} plus 30% of last period's net marketing contribution, up to ${F.k(45000)}. Advertising, sales force, R&amp;D and research all come out of it. If you overspend, advertising is cut across your brands to fit. Unspent budget is lost.</p><p><strong>Net marketing contribution</strong> is revenue after retailer margins, minus cost of goods and holding costs, minus advertising, sales force, research, R&amp;D and any inventory written off.</p><p>The <strong>stock price index</strong> starts at 1,000. Each period it moves halfway toward a value built from contribution (42%), value share of the whole market (33%) and revenue growth (25%).</p></div>`, false, '10');
    h += UI.fold('Scoring', `<div class="case"><p>Your final score is half your <strong>rank</strong> among the five firms on the final stock price index (first earns 100, last 0) and half the <strong>gap</strong> between your index and the best rival's: matching 1.25 times the best rival's index earns the full half.</p></div>`, false, '11');
    h += UI.fold('Glossary', `<dl class="gloss">${[['Perceptual map', 'A two-dimensional picture of how buyers see brands, with each segment’s ideal point.'], ['Ideal point', 'Where on the map a segment would most like a brand to be.'], ['Perceptual objective', 'A target point on the map that advertising tries to move a brand’s perception toward.'], ['Awareness', 'The share of buyers who know a brand.'], ['Coverage', 'The share of a channel’s stores that stock and push your brands.'], ['Accessibility', 'Your coverage weighted by where a segment shops.'], ['Technology frontier', 'The best level each attribute can reach this period.'], ['Value share', 'Your share of all retail sales by value.'], ['Net marketing contribution', 'What marketing earns after every marketing cost.'], ['Stock price index', 'The board’s overall measure of your performance.']].map(([t, dd]) => `<dt>${t}</dt><dd>${dd}</dd>`).join('')}</dl>`, false, '12');
    return h;
  }

  /* ---------- Debrief ---------- */
  function cumBrand(g, id) { return sum(g.reports.slice(1).map(r => { const l = r.firms[0].res.lines.find(x => x.id === id); return l ? l.nmc : 0; })); }
  function coachNotes(g) {
    const notes = [], st = B.standings(g), mine = st[0], R = g.reports.slice(1), lastR = g.reports[g.reports.length - 1];
    const order = st.slice().sort((a, b) => a.place - b.place), lead = order[0];
    notes.push(mine.place === 1 ? `First of five, with a final stock price index of ${N.int(mine.spi)} and ${F.m(mine.cumNmc)} of cumulative contribution.` : `You finished #${mine.place} of five. ${esc(lead.short)} led with an index of ${N.int(lead.spi)} and ${F.m(lead.cumNmc)} of contribution, against your ${N.int(mine.spi)} and ${F.m(mine.cumNmc)}.`);
    const firstG = f => { const r = R.find(x => x.brands.some(b => b.firm === f && b.m === 'G' && b.active)); return r ? r.t : null; };
    const myG = firstG('you'), rivalG = Math.min(...g.firms.slice(1).map(f => firstG(f.id)).filter(x => x != null), 99);
    const gVal = sum(lastR.brands.filter(b => b.m === 'G' && b.active).map(b => b.sold * b.price)), allVal = sum(lastR.brands.filter(b => b.active).map(b => b.sold * b.price));
    if (myG == null && gVal > 0) notes.push(`You never entered audio glasses. By ${F.p(lastR.t)} they were ${F.pct(gVal / Math.max(1, allVal))} of the market by value${rivalG < 99 ? `, and the first rival was selling them from ${F.p(rivalG)}` : ''}.`);
    else if (myG != null) {
      const when = myG <= rivalG ? `You were first into audio glasses, in ${F.p(myG)},` : `You entered audio glasses in ${F.p(myG)}, ${myG - rivalG} period${myG - rivalG === 1 ? '' : 's'} after the first rival,`;
      notes.push(mine.gShare < 0.03 ? `${when} but finished with almost none of that market. Being early only pays if the design keeps up with what glasses buyers want as the technology improves.` : `${when} and finished with ${F.pct(mine.gShare, 1)} of that market by value.`);
    }
    let mono = null;
    SEGS.forEach((s, i) => { let run = 0, best = 0, who = null; R.forEach(r => { const e = r.segs[i]; if (!(e.sold > 0)) { run = 0; return; } const top = r.brands.filter(b => b.active).reduce((a, b) => (b.soldSeg[i] > (a ? a.soldSeg[i] : -1) ? b : a), null); if (top && top.firm !== 'you' && top.soldSeg[i] / e.sold > 0.6) { run++; if (run > best) { best = run; who = top; } } else run = 0; }); if (best >= 3 && (!mono || best > mono.n)) mono = { s, n: best, who }; });
    if (mono) notes.push(`${esc(g.firms.find(f => f.id === mono.who.firm).short)}'s ${esc(mono.who.name)} took over 60% of ${mono.s.name} for ${mono.n} periods in a row. A segment one brand dominates is either a fortress or an opening.`);
    let far = null;
    R.forEach(r => { const d = r.you; if (!d) return; r.brands.filter(b => b.firm === 'you' && b.active && b.target).forEach(b => { const e = r.segs[segIdx(b.target)]; if (!(e.size > 0)) return; const dist = Math.hypot(b.x - e.x, b.y - e.y) / B.POS_SD; if (!far || dist > far.dist) far = { b, e, dist, t: r.t }; }); });
    if (far && far.dist > 1.1) notes.push(`In ${F.p(far.t)}, ${esc(far.b.name)} sat ${N.num(far.dist, 1)} map units from the ${far.e.name} ideal it was aimed at. Ideals drift every period, so designs and perceptual objectives need to lead them.`);
    let lost = 0, held = 0; R.forEach(r => { r.brands.filter(b => b.firm === 'you' && b.stockout).forEach(b => { lost += Math.max(0, b.demand - b.sold); }); held += r.firms[0].res.hold; });
    if (lost > 20) notes.push(`You ran out of stock and left about ${F.u(lost)} units of demand on the table, most of which went to rivals. Production can flex 20% around the plan, so plan close to expected demand.`);
    if (held > 3) notes.push(`Holding unsold stock cost ${F.m(held)} over the game. Plan production from your estimate minus the stock you already have.`);
    const blind = R.filter(r => !study(r, 'mds') && !study(r, 'semantic')).length;
    if (blind >= 3) notes.push(`In ${blind} periods you bought neither the perceptual map nor the semantic scales, so you were positioning brands against old information.`);
    const lowR = R.some(r => r.you && Object.values(r.you.brands || {}).some(x => !x.withdraw && (x.rsch || 0) < 0.03 && (x.ads || 0) > 500));
    if (lowR) notes.push('Some of your advertising ran with almost no ad research. About 10–15% of each budget on research nearly doubles what the rest achieves.');
    const unused = avg(R.map(r => Math.max(0, r.firms[0].res.budget - r.firms[0].res.spent) / Math.max(1, r.firms[0].res.budget)));
    if (unused > 0.3) notes.push(`On average you left ${F.pct(unused)} of the budget unspent. Budget does not carry over; well-targeted spending builds next period's contribution and the budget after it.`);
    return notes.slice(0, 7);
  }
  function debriefView(g, ctx) {
    const score = B.finalScore(g), st = B.standings(g), mine = st[0], order = st.slice().sort((a, b) => a.place - b.place), lastT = g.years;
    let h = `<section class="sheet"><header class="sh"><span class="eyebrow">Debrief · Brand Lab</span></header><div class="grade"><span class="letter" aria-label="Grade ${S.grade(score)}"><span class="hl draw">${S.grade(score)}</span></span><div class="grade-txt"><span class="h2">${S.gradeWord(score)}</span><span class="score num">${score} / 100</span></div></div><p class="case">Aria Audio finished <strong>#${mine.place} of 5</strong> after ${g.years} periods with a stock price index of ${N.int(mine.spi)}, ${F.m(mine.cumNmc)} of cumulative contribution and ${F.pct(mine.valShare, 1)} of the market by value.</p>${UI.kpis([
      { k: 'Final stock index', v: N.int(mine.spi) }, { k: 'Cumulative contribution', v: F.m(mine.cumNmc) }, { k: 'Value share', v: F.pct(mine.valShare, 1) }, { k: 'Glasses share', v: F.pct(mine.gShare, 1) }
    ])}<p class="cap">Score: half from your rank on the final index, half from how close you came to 1.25 times the best rival's index.</p></section>`;
    h += UI.sheet('Final standings', `Five firms after ${g.years} periods`, UI.table(['Firm', 'Place', 'Stock index', 'Cum. contribution', 'Value share', 'Glasses share'], order.map(f => ({ cls: f.id === 'you' ? 'me' : '', cells: [dot(f.id) + esc(f.short), '#' + f.place, N.int(f.spi), F.m(f.cumNmc), F.pct(f.valShare, 1), F.pct(f.gShare, 1)] })), { sticky: true }));
    h += UI.sheet('The race', 'Stock price index and contribution', UI.chart('bl-db-spi', () => ({ series: seriesBy(g, lastT, f => f.res.spi), xLabel: i => F.p(i), yMin: 0 }), 220, firmLegend(g), 'Stock price index by firm') + '<p class="cap">Stock price index</p>' +
      UI.chart('bl-db-nmc', () => ({ series: g.firms.map((f, i) => { let acc = 0; return { values: g.reports.map(r => (r.t === 0 ? 0 : (acc += r.firms[i].res.nmc))), c: fCol(f.id), w: f.id === 'you' ? 3 : 1.6 }; }), xLabel: i => F.p(i), yFmt: moneyAxis, refs: [{ y: 0 }] }), 210, null, 'Cumulative contribution by firm') + '<p class="cap">Cumulative net marketing contribution from P1, $M</p>');
    h += `<section class="sheet"><header class="sh"><span class="eyebrow">Coach’s notes</span><h2>What to take away</h2></header><ul class="notes plain">${coachNotes(g).map(n => `<li>${n}</li>`).join('')}</ul></section>`;
    const lastR = g.reports[g.reports.length - 1], allMine = g.brands.filter(b => b.firm === 'you');
    h += UI.sheet('Your brands', 'Every brand Aria ran', UI.table(['Brand', 'Market', 'Launched', 'Versions', 'Final units', 'Final price', 'Cum. contribution after ads'], allMine.map(b => { const lb = lastR.brands.find(x => x.id === b.id); return [esc(b.name) + (b.active ? '' : ' <span class="tag">withdrawn</span>'), MKT_NAME[b.m], b.born === 0 ? 'Inherited' : F.p(b.born), String(b.version), lb && b.active ? F.u(lb.sold) : '–', lb && b.active ? F.usd(lb.price) : '–', F.m(cumBrand(g, b.id))]; }), { sticky: true }));
    h += UI.sheet('Rivals revealed', 'What each competitor was trying to do', `<div class="ideas">${g.firms.slice(1).map(f => { const A = B.AI[f.ai], s = st.find(x => x.id === f.id); return `<p>${dot(f.id)}<strong>${esc(f.short)}: ${A.label}.</strong> ${A.blurb} Finished #${s.place} with an index of ${N.int(s.spi)}.</p>`; }).join('')}</div>`);
    h += UI.sheet('Concepts', 'The ideas behind the simulation', `<div class="ideas">${[
      ['Segmentation, targeting, positioning.', 'Pick the segments you can win, then build and communicate a position close to what they want. A brand aimed at everyone is close to no one.'],
      ['Perceptual maps.', 'Buyers judge brands on a few perceived dimensions. Physical changes (R&amp;D) and communication (perceptual objectives) both move a brand on the map, at very different costs and speeds.'],
      ['Moving targets.', 'Segment needs drift. A design aimed where buyers are today is behind by the time it ships.'],
      ['First-mover advantage.', 'Entering a new category early builds awareness and experience before rivals arrive, at the risk of designing for a market you cannot yet see clearly.'],
      ['Marketing mix efficiency.', 'Advertising, ad research, sales coverage and price all show diminishing returns. The best plans balance them brand by brand.'],
      ['Value of information.', 'Research costs money but stale information is expensive in a different way.']
    ].map(([a, b]) => `<p><strong>${a}</strong> ${b}</p>`).join('')}</div>`);
    h += `<div class="actions"><button type="button" class="btn btn-primary" data-act="retry-run" data-id="${ctx.meta.id}">Replay this market</button><button type="button" class="btn btn-ghost" data-act="new-run" data-module="brandlab">New market</button><button type="button" class="btn btn-ghost" data-act="leave-run">Back to home</button></div>`;
    return h;
  }

  /* ---------- CSV export of a period's reports ---------- */
  function csvFor(g, r) {
    const rows = [['period', 'brand', 'firm', 'market', 'units', 'price', 'awareness', 'perceived_x', 'perceived_y'].concat(SEGS.map(s => 'units_' + s.id))];
    const panel = study(r, 'panel'), mds = study(r, 'mds');
    r.brands.filter(b => b.active).forEach(b => rows.push([r.t, b.name, b.firm, b.m, b.sold.toFixed(1), b.price, b.firm === 'you' || study(r, 'survey') ? b.aw.toFixed(3) : '', b.firm === 'you' || mds ? b.x.toFixed(2) : '', b.firm === 'you' || mds ? b.y.toFixed(2) : ''].concat(SEGS.map((z, i) => (panel ? b.soldSeg[i].toFixed(1) : '')))));
    return rows.map(x => x.join(',')).join('\n');
  }

  /* ---------- Live updates ---------- */
  function live(g, ctx) {
    if (B.isDone(g) || uiStr(ctx, 'tab', 'decide') !== 'decide') return {};
    const sub = uiStr(ctx, 'sub', 'brief'), d = g.draft, L = { dock: dockText(g, proforma(g)) };
    if (sub === 'brands') {
      myBrands(g).forEach(b => { const x = d.brands[b.id]; if (x && !x.withdraw) L['bh:' + b.id] = brandHint(g, b, x); });
      d.launches.forEach((ln, i) => { L['ln:' + i] = launchHint(g, ln, i); L['lnn:' + i] = esc(ln.name || 'New brand'); });
      L._charts = ['bl-bmap'];
    } else if (sub === 'rd') {
      d.projects.forEach((p, i) => { L['pjh:' + i] = projectHint(g, p); });
      L._charts = ['bl-rdmap'];
    } else if (sub === 'sf') { L['sf-t'] = sfTable(g); L['sf-acc'] = accTable(g); }
    else if (sub === 'research') L['rs-tot'] = studyTotal(d);
    return L;
  }

  /* ---------- Module ---------- */
  function newProject(g, m) {
    const segId = m === 'G' ? 'inn' : (myBrands(g).find(b => b.m === 'E') ? (g.draft.brands[myBrands(g).find(b => b.m === 'E').id] || {}).seg || 'com' : 'com');
    const a = aimDesign(g, m, segId, ideals(g) ? 'next' : 'now') || (() => { const F0 = B.frontier(m, g.t), o = {}; MK[m].attrs.forEach(at => { o[at.k] = B.onGrid(at, at.low ? (at.max + F0[at.k]) / 2 : (at.min + F0[at.k]) / 2, F0[at.k]); }); return o; })();
    return { m, a, seg: segId };
  }
  S.App.register({
    id: 'brandlab', cat: 'marketing', title: 'Brand Lab', area: 'Marketing strategy', length: '8 periods · 60–90 min', depth: 'Full simulation', version: 1, persist: 'replay', wide: true,
    practises: 'Segmentation and positioning · brand portfolio · marketing budgets and research',
    blurb: 'Run marketing at Aria Audio against four rival firms. Position earbud brands on a perceptual map, buy market research, set prices, advertising and sales forces by channel, fund R&D within a moving technology frontier, launch brands and open up a new category: audio glasses.',
    detail: '<p>A marketing strategy simulation. Eight segments across two categories with drifting needs; brands placed on perceptual maps by their physical attributes and by advertising objectives; awareness, ad research and three retail channels with their own margins and coverage; R&amp;D projects that create designs within a technology frontier; redesigns, launches and withdrawals; nine market research studies, including a conjoint analysis; budgets earned from contribution; a stock price index; and a debrief that reveals each rival’s strategy.</p>',
    options: [
      { id: 'difficulty', label: 'Difficulty', default: 'guided', choices: [{ v: 'guided', t: 'Foundation', s: 'True ideal points, demand estimates, coaching' }, { v: 'standard', t: 'Intermediate', s: 'Demand estimates; ideal points only from research' }, { v: 'expert', t: 'Advanced', s: 'Only what your research shows' }] },
      { id: 'length', label: 'Length', default: 'full', choices: [{ v: 'full', t: '8 periods', s: 'About 60–90 minutes' }, { v: 'short', t: '6 periods', s: 'About 45 minutes' }] }
    ],
    create: (seed, config) => B.create(seed, config),
    apply: (g, d) => B.apply(g, d),
    isDone: g => B.isDone(g),
    progress: g => (B.isDone(g) ? `Complete · ${g.years} periods` : `Period ${g.t} of ${g.years}`),
    view(g, ctx) {
      const done = B.isDone(g);
      let tab = uiStr(ctx, 'tab', done ? 'debrief' : 'decide');
      if (done && tab === 'decide') tab = 'debrief';
      if (!done && tab === 'debrief') tab = 'decide';
      ctx.ui.tab = tab;
      let h = header(g, done);
      h += UI.tabs('tab', [{ v: done ? 'debrief' : 'decide', t: done ? 'Debrief' : `Decide ${F.p(g.t)}` }, { v: 'reports', t: 'Reports' }, { v: 'guide', t: 'Guide' }], tab, 'main-tabs', true);
      if (tab === 'decide') h += decideView(g, ctx);
      else if (tab === 'reports') h += reportsView(g, ctx);
      else if (tab === 'guide') h += guideView(g);
      else h += debriefView(g, ctx);
      return h;
    },
    live,
    onTab(g, group, value, ctx) {
      if (group === 'sub' && value !== 'review') ctx.ui.confirmSubmit = null;
      if (group === 'tab' && value === 'decide') ctx.ui.justDone = null;
      if (group === 'sub' && value !== 'brief') ctx.ui.seenBrief = true;
      ctx.ui.wd = null;
    },
    field(g, name, value, el, ctx) {
      const d = g.draft; if (!d) return null;
      const p = String(name).split(':');
      if (p[0] === 'b') {
        const x = d.brands[p[1]]; if (!x) return null;
        if (p[2] === 'rsch') { x.rsch = clamp((+value || 0) / 100, 0, 0.4); return null; }
        if (p[2] === 'ox' || p[2] === 'oy') { if (!x.obj) return null; x.obj[p[2] === 'ox' ? 'x' : 'y'] = +value; return null; }
        if (p[2] === 'seg') { x.seg = String(value); return { rerender: true }; }
        if (p[2] === 'project') { x.project = value ? String(value) : null; return { rerender: true }; }
        x[p[2]] = +value; return null;
      }
      if (p[0] === 'sf') { d.sf[+p[1]] = clamp(Math.round(+value || 0), 0, 200); return null; }
      if (p[0] === 'cj') { d.conjointSeg = String(value); return null; }
      if (p[0] === 'pj') {
        const q = d.projects[+p[1]]; if (!q) return null;
        if (p[2] === 'seg') { q.seg = String(value); return { rerender: true }; }
        q.a[p[2]] = +value; return null;
      }
      if (p[0] === 'ln') {
        const L = d.launches[+p[1]]; if (!L) return null;
        if (p[2] === 'name') { L.name = String(value).toUpperCase().replace(/[^A-Z0-9 -]/g, '').slice(0, 12); return null; }
        if (p[2] === 'seg') { L.seg = String(value); const s = segNow(g, L.seg); if (s.size > 0) L.price = Math.round(s.price); return { rerender: true }; }
        L[p[2]] = +value; return null;
      }
      return null;
    },
    act(g, op, el, ctx) {
      const d = g.draft, ds = el.dataset;
      if (op === 'goto') { if (ds.tab) ctx.ui.tab = ds.tab; if (ds.sub) ctx.ui.sub = ds.sub; if (ds.rep) ctx.ui.rep = ds.rep; if (ds.tab === 'decide') ctx.ui.justDone = null; if (!ds.tab && ds.sub) ctx.ui.tab = 'decide'; return { rerender: true, top: true }; }
      if (op === 'csv') { const r = g.reports[Number(uiStr(ctx, 'rt', lastRep(g).t))] || lastRep(g); S.downloadText(`aria-audio-${F.p(r.t)}.csv`, csvFor(g, r), 'text/csv'); return null; }
      if (!d) return null;
      const bid = ds.bid, x = bid ? d.brands[bid] : null, b = bid ? g.brands.find(q => q.id === bid) : null;
      if (op === 'study') { const i = d.studies.indexOf(ds.id); if (i >= 0) d.studies.splice(i, 1); else d.studies.push(ds.id); return { rerender: true }; }
      if (op === 'wd') { ctx.ui.wd = bid; return { rerender: true }; }
      if (op === 'wd-no') { ctx.ui.wd = null; return { rerender: true }; }
      if (op === 'wd-yes' && x) { x.withdraw = true; ctx.ui.wd = null; return { rerender: true, toast: `${b.name} will be withdrawn.` }; }
      if (op === 'wd-undo' && x) { x.withdraw = false; return { rerender: true }; }
      if (op === 'obj-off' && x) { x.obj = null; return { rerender: true }; }
      if (op === 'obj-on' && x && b) { if (!x.obj) { const pc = B.perceived(b); x.obj = { x: Math.round(pc.x * 10) / 10, y: Math.round(pc.y * 10) / 10 }; } return { rerender: true }; }
      if (op === 'obj-aim' && x && x.seg) {
        let tx, ty;
        if (ideals(g)) { const s = segNext(g, x.seg); tx = s.x; ty = s.y; }
        else { const r = lastStudy(g, 'mds'); if (!r) return { toast: 'Buy the perceptual map study to see where this segment’s ideal point is.' }; const e = r.segs[segIdx(x.seg)]; tx = e.x; ty = e.y; }
        x.obj = { x: Math.round(tx * 10) / 10, y: Math.round(ty * 10) / 10 }; return { rerender: true };
      }
      if (op === 'prod-fit' && x && b) {
        const inv = x.project ? 0 : b.inv;
        if (guided(g)) { const e = B.estimate(g, d)[bid]; x.prod = Math.max(0, Math.round(((e ? e.demand : 0) * 1.02 - inv) / 5) * 5); }
        else x.prod = Math.max(0, Math.round(((b.last ? b.last.sold : 0) - inv) / 5) * 5);
        return { rerender: true };
      }
      if (op === 'price-seg' && x && x.seg) { x.price = Math.round(segNow(g, x.seg).price); return { rerender: true }; }
      if (op === 'pj-add') { if (d.projects.length < 4) d.projects.push(newProject(g, ds.m === 'G' ? 'G' : 'E')); return { rerender: true }; }
      if (op === 'pj-del') { d.projects.splice(+ds.i, 1); return { rerender: true }; }
      if (op === 'pj-aim') { const q = d.projects[+ds.i]; if (!q || !q.seg) return null; const a = aimDesign(g, q.m, q.seg, ds.when); if (!a) return { toast: 'Buy the semantic scales study to see what this segment wants.' }; q.a = a; return { rerender: true }; }
      if (op === 'ln-add') {
        const pr = g.projects.find(q => q.id === ds.pid); if (!pr) return null;
        if (myBrands(g).length + d.launches.length >= B.MAX_BRANDS) return { toast: `You already run ${B.MAX_BRANDS} brands. Withdraw one first.` };
        if (d.launches.some(L => L.project === pr.id)) return null;
        const seg = pr.seg || SEGS.find(s => s.m === pr.m).id, s = segNow(g, seg), used = new Set(g.brands.map(q => q.name));
        const base = pr.m === 'G' ? ['AXIS', 'APEX', 'ARC', 'ATLAS'] : ['ARIA', 'ALLEGRO', 'AMP', 'ACE', 'AVA'];
        const name = base.find(n => !used.has(n) && !d.launches.some(L => L.name === n)) || 'A' + (g.brands.length + 1);
        const L = { project: pr.id, name, seg, price: Math.round(s.price || SEGS.find(z => z.id === seg).price), ads: 3500, prod: 0 };
        d.launches.push(L);
        if (guided(g)) { const e = B.estimate(g, d)['new' + (d.launches.length - 1)]; L.prod = Math.max(0, Math.round((e ? e.demand : 0) * 1.02 / 5) * 5); }
        ctx.ui.tab = 'decide'; ctx.ui.sub = 'brands';
        return { rerender: true, toast: `${name} added to this period's plan.` };
      }
      if (op === 'ln-del') { d.launches.splice(+ds.i, 1); return { rerender: true }; }
      if (op === 'ln-fit') { const L = d.launches[+ds.i]; if (!L) return null; const e = B.estimate(g, d)['new' + ds.i]; L.prod = Math.max(0, Math.round((e ? e.demand : 0) * 1.02 / 5) * 5); return { rerender: true }; }
      if (op === 'reset-draft') { g.draft = B.defaultDraft(g); return { rerender: true, toast: 'This period’s draft was reset.' }; }
      if (op === 'submit-cancel') { ctx.ui.confirmSubmit = null; return { rerender: true }; }
      if (op === 'submit') {
        const P = proforma(g), list = checks(g, P);
        if (countBad(list) && ds.force !== '1') { ctx.ui.confirmSubmit = g.t; return { rerender: true }; }
        const t = g.t, dec = clone(d);
        dec.launches = dec.launches.filter(L => L.project);
        ctx.ui.confirmSubmit = null; ctx.ui.tab = t >= g.years ? 'debrief' : 'reports'; ctx.ui.rep = 'summary'; ctx.ui.rt = t; ctx.ui.justDone = t; ctx.ui.sub = 'brief'; ctx.ui.wd = null;
        return { commit: dec, top: true, toast: t >= g.years ? 'Final period processed. Here is your debrief.' : `${F.p(t)} processed.` };
      }
      return null;
    },
    summary(g) {
      const score = B.finalScore(g), st = B.standings(g), mine = st[0];
      return { score, line: `Placed #${mine.place} of 5 · stock index ${N.int(mine.spi)} · ${F.m(mine.cumNmc)} cumulative contribution`, metrics: [{ k: 'Place', v: '#' + mine.place }, { k: 'Stock index', v: N.int(mine.spi) }, { k: 'Contribution', v: F.m(mine.cumNmc) }, { k: 'Value share', v: F.pct(mine.valShare, 1) }] };
    }
  });
})();
