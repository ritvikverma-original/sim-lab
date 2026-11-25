/* Sim Lab core: utilities, UI kit, charts, identity, storage, sessions and the app shell.
   Simulation modules register themselves with SimLab.App.register({...}). */
(function () {
  'use strict';

  /* ================= Utilities ================= */
  const RNG = {
    make(seed) { return { s: (seed >>> 0) || 1 }; },
    next(r) { r.s = (r.s + 0x6D2B79F5) >>> 0; let t = r.s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; },
    normal(r) { let u = 0, v = 0; while (u === 0) u = RNG.next(r); while (v === 0) v = RNG.next(r); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); },
    poisson(r, lam) { if (lam <= 0) return 0; if (lam > 40) return Math.max(0, Math.round(lam + Math.sqrt(lam) * RNG.normal(r))); const L = Math.exp(-lam); let k = 0, p = 1; do { k++; p *= RNG.next(r); } while (p > L); return k - 1; },
    expo(r, mean) { return -Math.log(1 - RNG.next(r)) * mean; },
    range(r, a, b) { return a + (b - a) * RNG.next(r); },
    pick(r, arr) { return arr[Math.floor(RNG.next(r) * arr.length)]; }
  };
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const sum = a => a.reduce((s, x) => s + x, 0);
  const avg = a => (a.length ? sum(a) / a.length : 0);
  const sdev = a => { const m = avg(a); return Math.sqrt(avg(a.map(x => (x - m) * (x - m)))); };
  const round = (x, d) => { const m = Math.pow(10, d || 0); return Math.round(x * m) / m; };
  const clone = o => JSON.parse(JSON.stringify(o));
  const uid = p => (p || 'r') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const newSeed = () => ((Date.now() % 2147483647) ^ Math.floor(Math.random() * 2147483647)) >>> 0;
  const U = { clamp, sum, avg, sdev, round, clone, uid, esc, newSeed };

  /* ================= Formatting ================= */
  const MINUS = '−';
  const grp = (v, d) => Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const NEGJ = MINUS + '\u2060';
  const neg = (v, d) => (v < 0 && Math.abs(v) >= 0.5 * Math.pow(10, -d) ? NEGJ : '');
  const N = {
    MINUS,
    int: v => neg(v, 0) + grp(v, 0),
    num: (v, d) => neg(v, d == null ? 1 : d) + grp(v, d == null ? 1 : d),
    usd: (v, d) => neg(v, d || 0) + '$' + grp(v, d || 0),
    k: v => neg(v, 0) + '$' + grp(v, 0) + 'k',
    m: (v, d) => neg(v, d == null ? 1 : d) + '$' + grp(v, d == null ? 1 : d) + 'M',
    pct: (v, d) => neg(v * 100, d || 0) + grp(v * 100, d || 0) + '%',
    units: v => neg(v, 0) + grp(v, 0) + 'k',
    sign: (v, f) => (v > 0 ? '+\u2060' : v < 0 ? NEGJ : '±\u2060') + f(Math.abs(v)),
    date: ts => new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    dateTime: ts => new Date(ts).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
    ago(ts) {
      const s = Math.max(0, (Date.now() - ts) / 1000);
      if (s < 45) return 'just now';
      if (s < 3600) return Math.round(s / 60) + ' min ago';
      if (s < 86400) return Math.round(s / 3600) + ' h ago';
      if (s < 86400 * 7) return Math.round(s / 86400) + ' d ago';
      return N.date(ts);
    }
  };
  const grade = s => (s == null ? '–' : s >= 85 ? 'A' : s >= 70 ? 'B' : s >= 55 ? 'C' : 'D');
  const gradeWord = s => (s >= 85 ? 'Excellent run' : s >= 70 ? 'Solid run' : s >= 55 ? 'Mixed run' : 'Rough run');
  const tone = s => (s >= 70 ? 'good' : s >= 55 ? 'neutral' : 'warn');

  /* ================= Catalogue structure ================= */
  const CATS = [
    { id: 'strategy', t: 'Strategy', s: 'Competitive strategy, disruption, general management and guesstimates' },
    { id: 'finance', t: 'Finance & markets', s: 'Investing, capital budgeting, valuation and risk' },
    { id: 'ops', t: 'Operations & supply chain', s: 'Capacity, flow, quality and supply chains' },
    { id: 'marketing', t: 'Marketing & product', s: 'Positioning, pricing, product management and brands' },
    { id: 'people', t: 'People & leadership', s: 'HR, incentives, negotiation and leading in a crisis' },
    { id: 'decisions', t: 'Decision making & ethics', s: 'Judgement under pressure, governance and decision-making practice' },
    { id: 'career', t: 'Career & role fit', s: 'Role direction, evidence audit, capability gaps and development planning', subject: false }
  ];
  /* Internal level values stay guided / standard / expert so runs saved before levels existed keep working. */
  const LEVELS = [{ v: 'guided', t: 'Foundation', c: 'lv-f' }, { v: 'standard', t: 'Intermediate', c: 'lv-i' }, { v: 'expert', t: 'Advanced', c: 'lv-a' }];
  const FORMATS = [{ v: 'sim', t: 'Simulations', one: 'Simulation' }, { v: 'case', t: 'Cases', one: 'Case' }, { v: 'practice', t: 'Practice', one: 'Practice set' }, { v: 'career', t: 'Assessments', one: 'Assessment' }];
  const lvlIdx = v => Math.max(0, LEVELS.findIndex(l => l.v === v));
  const levelName = v => LEVELS[lvlIdx(v)].t;
  const lvlOf = g => lvlIdx(g && g.cfg ? g.cfg.difficulty : 'guided');
  const normLevel = v => (LEVELS.some(l => l.v === v) ? v : 'guided');

  /* ================= UI kit ================= */
  let FIELDS = {};
  let CHARTS = {};
  const plain = (v, dec) => { if (v == null || !isFinite(v)) return ''; const r = round(v, dec || 0); return String(r); };
  const UI = {
    sheet(eyebrow, title, body, cls, attrs) {
      return `<section class="sheet ${cls || ''}" ${attrs || ''}>${eyebrow || title ? `<header class="sh">${eyebrow ? `<span class="eyebrow">${eyebrow}</span>` : ''}${title ? `<h2>${title}</h2>` : ''}</header>` : ''}${body}</section>`;
    },
    brief(title, open, body, note) {
      return `<details class="sheet brief"${open ? ' open' : ''}><summary><span class="sum-txt"><span class="eyebrow">Case brief</span><span class="h2">${title}</span></span><span class="sum-tog" aria-hidden="true"></span></summary><div class="case">${body}</div>${note ? `<p class="note">${note}</p>` : ''}</details>`;
    },
    fold(title, body, open, eyebrow) {
      return `<details class="fold"${open ? ' open' : ''}><summary><span>${eyebrow ? `<span class="eyebrow">${eyebrow}</span>` : ''}<span class="fold-t">${title}</span></span><span class="sum-tog" aria-hidden="true"></span></summary><div class="fold-b">${body}</div></details>`;
    },
    kpis(items, cols) {
      return `<div class="kpis${cols === 3 ? ' k3' : ''}">${items.map(it => `<div class="kpi"><span class="eyebrow">${it.k}</span><span class="v num">${it.v}</span>${it.d ? `<span class="d num ${it.cls || ''}">${it.d}</span>` : ''}</div>`).join('')}</div>`;
    },
    table(head, rows, opts) {
      const o = opts || {};
      const cls = ['t', o.cls || '', o.sticky ? 'sticky' : ''].join(' ');
      const body = rows.map(r => { const cells = Array.isArray(r) ? r : r.cells; const rc = Array.isArray(r) ? '' : (r.cls || ''); return `<tr${rc ? ` class="${rc}"` : ''}>${cells.map((c, i) => (i === 0 && o.sticky ? `<th scope="row">${c}</th>` : `<td>${c}</td>`)).join('')}</tr>`; }).join('');
      const foot = o.foot ? `<tfoot><tr>${o.foot.map((c, i) => (i === 0 && o.sticky ? `<th scope="row">${c}</th>` : `<td>${c}</td>`)).join('')}</tr></tfoot>` : '';
      return `<div class="tw${o.wrapCls ? ' ' + o.wrapCls : ''}"><table class="${cls}">${head ? `<thead><tr>${head.map(h => `<th scope="col">${h}</th>`).join('')}</tr></thead>` : ''}<tbody>${body}</tbody>${foot}</table></div>`;
    },
    meter(label, frac, txt, toneCls) {
      return `<div class="meter"><span class="m-l">${label}</span><span class="track"><span class="fill ${toneCls || ''}" style="width:${(clamp(frac || 0, 0, 1) * 100).toFixed(1)}%"></span></span><span class="m-v num">${txt}</span></div>`;
    },
    pill: (text, t) => `<span class="pill ${t || 'neutral'}">${text}</span>`,
    num(field, value, o) {
      const op = o || {};
      FIELDS[field] = { min: op.min, max: op.max, step: op.step || 1, dec: op.dec || 0 };
      return `<div class="numf${op.wide ? ' wide' : ''}${op.disabled ? ' off' : ''}"><button type="button" class="nb" data-act="nudge" data-field="${field}" data-dir="-1" aria-label="Decrease ${esc(op.label || '')}"${op.disabled ? ' disabled' : ''}>${MINUS}</button><span class="nw">${op.pre ? `<span class="nu pre" aria-hidden="true">${op.pre}</span>` : ''}<input class="ni num" type="text" inputmode="decimal" data-field="${field}" value="${esc(plain(value, op.dec))}" aria-label="${esc(op.label || field)}" autocomplete="off"${op.disabled ? ' disabled' : ''}>${op.unit ? `<span class="nu" aria-hidden="true">${op.unit}</span>` : ''}</span><button type="button" class="nb" data-act="nudge" data-field="${field}" data-dir="1" aria-label="Increase ${esc(op.label || '')}"${op.disabled ? ' disabled' : ''}>+</button></div>`;
    },
    field(label, control, hint, liveKey, cls) {
      return `<div class="field ${cls || ''}"><span class="lbl">${label}</span>${control}${hint != null || liveKey ? `<div class="hint"${liveKey ? ` data-live="${liveKey}"` : ''}>${hint || ''}</div>` : ''}</div>`;
    },
    slider(field, label, val, min, max, step, fmt, hint) {
      FIELDS[field] = { min, max, step, dec: String(step).includes('.') ? String(step).split('.')[1].length : 0, fmt };
      return `<div class="field"><div class="field-top"><label for="f-${field}">${label}</label><output class="val num" data-val="${field}">${fmt(val)}</output></div><input type="range" id="f-${field}" data-field="${field}" min="${min}" max="${max}" step="${step}" value="${val}"><div class="hint" data-live="${field}-hint">${hint || ''}</div></div>`;
    },
    chips(field, label, opts, val, act) {
      return `<div class="field">${label ? `<span class="lbl">${label}</span>` : ''}<div class="chips" role="group"${label ? ` aria-label="${esc(label)}"` : ''}>${opts.map(o => `<button type="button" class="chip" data-act="${act || 'pick'}" data-field="${field}" data-value="${o.v}" aria-pressed="${String(o.v) === String(val)}"${o.disabled ? ' disabled' : ''}>${o.t}${o.s ? `<small>${o.s}</small>` : ''}</button>`).join('')}</div></div>`;
    },
    tabs(group, items, active, cls, top) {
      return `<div class="tabs ${cls || ''}" role="tablist">${items.map(it => `<button type="button" role="tab" class="tab" data-act="tab" data-group="${group}" data-value="${it.v}"${top ? ' data-top="1"' : ''} aria-selected="${String(it.v) === String(active)}">${it.t}${it.badge ? ` <span class="badge${it.bt ? ' ' + it.bt : ''}">${it.badge}</span>` : ''}</button>`).join('')}</div>`;
    },
    chart(id, specFn, h, legend, label) {
      CHARTS[id] = specFn;
      return `<figure class="fig" role="img"${label ? ` aria-label="${esc(label)}"` : ''}><div class="chart" data-chart="${id}" style="height:${h || 190}px"></div>${legend ? `<figcaption class="legend">${legend.map(l => `<span><i style="background:${l.c}"></i>${l.t}</span>`).join('')}</figcaption>` : ''}</figure>`;
    },
    empty: (text, extra) => `<div class="empty"><p>${text}</p>${extra || ''}</div>`,
    btn: (label, act, cls, attrs) => `<button type="button" class="btn ${cls || 'btn-ghost'}" data-act="${act}" ${attrs || ''}>${label}</button>`,
    reveal: (label, body, open, eyebrow) => `<details class="reveal"${open ? ' open' : ''}><summary><span class="rv-l"><span class="eyebrow">${eyebrow || 'The real story'}</span><span class="rv-t">${label}</span></span><span class="rv-cta" aria-hidden="true"></span></summary><div class="rv-b">${body}</div></details>`,
    level: v => `<span class="lvl ${LEVELS[lvlIdx(v)].c}">${LEVELS[lvlIdx(v)].t}</span>`,
    warn: (items) => (items.length ? `<ul class="warns">${items.map(w => `<li class="${w.t || 'warn'}"><span class="wdot" aria-hidden="true"></span><span>${w.m}</span></li>`).join('')}</ul>` : ''),
    note: t => `<p class="note">${t}</p>`
  };

  /* ================= Charts ================= */
  function niceTicks(lo, hi, n) {
    if (!(hi > lo)) hi = lo + 1;
    const raw = (hi - lo) / n, mag = Math.pow(10, Math.floor(Math.log10(raw))), e = raw / mag;
    const step = (e >= 7.5 ? 10 : e >= 3.5 ? 5 : e >= 1.5 ? 2 : 1) * mag;
    const a = Math.floor(lo / step) * step, b = Math.ceil(hi / step) * step, ticks = [];
    for (let v = a; v <= b + step * 1e-6; v += step) ticks.push(+(Math.round(v / step) * step).toFixed(6));
    return { lo: a, hi: b, ticks };
  }
  function svgOpen(W, H) { return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true" focusable="false">`; }
  function yAxis(t, Y, pad, W, fmt) {
    return t.ticks.map(v => { const y = Y(v).toFixed(1); return `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y}" y2="${y}" style="stroke:var(--rule-2);stroke-width:1"/><text x="${pad.l - 7}" y="${(Y(v) + 3.5).toFixed(1)}" text-anchor="end" class="ax">${fmt ? fmt(v) : v}</text>`; }).join('');
  }
  const Charts = {
    niceTicks,
    lines(sp, W, H) {
      const pad = { l: sp.padL || 50, r: 14, t: 12, b: 24 };
      const n = Math.max(1, ...sp.series.map(s => s.values.length));
      const vals = [];
      sp.series.forEach(s => s.values.forEach(v => { if (v != null && isFinite(v)) vals.push(v); }));
      (sp.refs || []).forEach(r => vals.push(r.y));
      if (!vals.length) vals.push(0, 1);
      let lo = sp.yMin != null ? sp.yMin : Math.min(0, ...vals);
      const t = niceTicks(lo, sp.yMax != null ? sp.yMax : Math.max(...vals), 4); lo = t.lo; const hi = t.hi;
      const X = i => pad.l + (n === 1 ? (W - pad.l - pad.r) / 2 : i / (n - 1) * (W - pad.l - pad.r));
      const Y = v => pad.t + (1 - (v - lo) / (hi - lo)) * (H - pad.t - pad.b);
      let s = svgOpen(W, H) + yAxis(t, Y, pad, W, sp.yFmt);
      const every = Math.max(1, Math.ceil(n / (W < 420 ? 6 : 10)));
      for (let i = 0; i < n; i += every) s += `<text x="${X(i).toFixed(1)}" y="${H - 6}" text-anchor="middle" class="ax">${sp.xLabel ? sp.xLabel(i) : i + 1}</text>`;
      (sp.bands || []).forEach(b => { const x0 = X(b.from), x1 = X(b.to); s += `<rect x="${x0.toFixed(1)}" y="${pad.t}" width="${Math.max(1, x1 - x0).toFixed(1)}" height="${H - pad.t - pad.b}" style="fill:${b.c};fill-opacity:.12"/>`; });
      (sp.refs || []).forEach(r => { const y = Y(r.y).toFixed(1); s += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y}" y2="${y}" style="stroke:${r.c || 'var(--ink-3)'};stroke-width:1.2;stroke-dasharray:4 4"/>${r.label ? `<text x="${pad.l + 4}" y="${(Y(r.y) - 5).toFixed(1)}" class="ax">${r.label}</text>` : ''}`; });
      sp.series.forEach(se => {
        let d = '', on = false, first = null, lastP = null;
        se.values.forEach((v, i) => { if (v == null || !isFinite(v)) { on = false; return; } const p = [X(i), Y(v)]; d += (on ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); on = true; if (!first) first = p; lastP = p; });
        if (!d) return;
        if (se.area && se.values.every(v => v != null)) { const b = Y(Math.max(lo, 0)).toFixed(1); s += `<path d="${d}L${lastP[0].toFixed(1)} ${b}L${first[0].toFixed(1)} ${b}Z" style="fill:${se.c};fill-opacity:.12;stroke:none"/>`; }
        if (se.step) { /* step rendering not needed */ }
        s += `<path d="${d}" style="fill:none;stroke:${se.c};stroke-width:${se.w || 2};stroke-linejoin:round;stroke-linecap:round${se.dash ? ';stroke-dasharray:5 4' : ''}"/>`;
        if (lastP && !se.noDot) s += `<circle cx="${lastP[0].toFixed(1)}" cy="${lastP[1].toFixed(1)}" r="3.5" style="fill:${se.c}"/>`;
        if (se.dots) se.values.forEach((v, i) => { if (v != null && isFinite(v)) s += `<circle cx="${X(i).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="2.6" style="fill:${se.c}"/>`; });
      });
      return s + '</svg>';
    },
    bars(sp, W, H) {
      const pad = { l: sp.padL || 50, r: 10, t: 12, b: 24 };
      const groups = sp.groups, ns = sp.series.length;
      const vals = []; sp.series.forEach(se => se.values.forEach(v => { if (isFinite(v)) vals.push(v); }));
      if (!vals.length) vals.push(0, 1);
      const t = niceTicks(Math.min(0, ...vals), Math.max(0, ...vals), 4);
      const Y = v => pad.t + (1 - (v - t.lo) / (t.hi - t.lo)) * (H - pad.t - pad.b);
      const gw = (W - pad.l - pad.r) / groups.length, bw = Math.max(3, Math.min(26, (gw - 8) / ns));
      let s = svgOpen(W, H) + yAxis(t, Y, pad, W, sp.yFmt);
      groups.forEach((g, gi) => {
        const x0 = pad.l + gi * gw + (gw - bw * ns) / 2;
        sp.series.forEach((se, si) => { const v = se.values[gi]; if (!isFinite(v)) return; const y0 = Y(0), y1 = Y(v); s += `<rect x="${(x0 + si * bw).toFixed(1)}" y="${Math.min(y0, y1).toFixed(1)}" width="${(bw - 1.5).toFixed(1)}" height="${Math.max(1, Math.abs(y1 - y0)).toFixed(1)}" rx="1.5" style="fill:${se.colors ? se.colors[gi] : se.c}"/>`; });
        s += `<text x="${(pad.l + gi * gw + gw / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle" class="ax">${g}</text>`;
      });
      return s + '</svg>';
    },
    map(sp, W, H) {
      const pad = { l: 50, r: 16, t: 16, b: 36 };
      const X = v => pad.l + (v - sp.x.min) / (sp.x.max - sp.x.min) * (W - pad.l - pad.r);
      const Yr = v => (v - sp.y.min) / (sp.y.max - sp.y.min);
      const Y = v => pad.t + (sp.y.reverse ? Yr(v) : 1 - Yr(v)) * (H - pad.t - pad.b);
      let s = svgOpen(W, H);
      (sp.x.ticks || niceTicks(sp.x.min, sp.x.max, 5).ticks).forEach(v => { if (v < sp.x.min || v > sp.x.max) return; const x = X(v).toFixed(1); s += `<line x1="${x}" x2="${x}" y1="${pad.t}" y2="${H - pad.b}" style="stroke:var(--rule-2)"/><text x="${x}" y="${H - pad.b + 15}" text-anchor="middle" class="ax">${sp.x.fmt ? sp.x.fmt(v) : v}</text>`; });
      (sp.y.ticks || niceTicks(sp.y.min, sp.y.max, 5).ticks).forEach(v => { if (v < sp.y.min || v > sp.y.max) return; const y = Y(v).toFixed(1); s += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y}" y2="${y}" style="stroke:var(--rule-2)"/><text x="${pad.l - 7}" y="${(Y(v) + 3.5).toFixed(1)}" text-anchor="end" class="ax">${sp.y.fmt ? sp.y.fmt(v) : v}</text>`; });
      s += `<text x="${((pad.l + W - pad.r) / 2).toFixed(1)}" y="${H - 4}" text-anchor="middle" class="axt">${sp.x.label || ''}</text>`;
      s += `<text transform="translate(12 ${((pad.t + H - pad.b) / 2).toFixed(1)}) rotate(-90)" text-anchor="middle" class="axt">${sp.y.label || ''}</text>`;
      const pxPerX = (W - pad.l - pad.r) / (sp.x.max - sp.x.min), pxPerY = (H - pad.t - pad.b) / (sp.y.max - sp.y.min);
      const boxes = [], labels = [];
      const hit = b => boxes.some(o => b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0);
      const inside = b => b.x0 >= 2 && b.x1 <= W - 2 && b.y0 >= 0 && b.y1 <= H - pad.b + 4;
      const tw = (t, big) => String(t).length * (big ? 6.7 : 6.2) + 2;
      (sp.zones || []).forEach(z => {
        const cx = X(z.x), cy = Y(z.y);
        if (z.rx2 != null) s += `<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${(z.rx2 * pxPerX).toFixed(1)}" ry="${(z.ry2 * pxPerY).toFixed(1)}" style="fill:${z.fill || 'var(--hl-swipe)'};fill-opacity:${z.op2 != null ? z.op2 : .18};stroke:var(--ink-3);stroke-width:1;stroke-dasharray:3 3"/>`;
        const rx = z.rx != null ? z.rx * pxPerX : z.r, ry = z.ry != null ? z.ry * pxPerY : z.r;
        s += `<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" style="fill:${z.fill || 'var(--hl-swipe)'};fill-opacity:${z.op || .55};stroke:var(--ink-3);stroke-width:1${z.dash === false ? '' : ';stroke-dasharray:3 3'}"/>`;
        if (z.ideal) { const ix = X(z.ideal.x), iy = Y(z.ideal.y); s += `<path d="M${(ix - 4).toFixed(1)} ${iy.toFixed(1)}h8M${ix.toFixed(1)} ${(iy - 4).toFixed(1)}v8" style="stroke:var(--ink);stroke-width:1.4"/>`; boxes.push({ x0: ix - 5, x1: ix + 5, y0: iy - 5, y1: iy + 5 }); }
        if (z.label) { const w = tw(z.label, true), ty = cy - ry - 6; labels.push(`<text x="${cx.toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="middle" class="lab zl">${esc(z.label)}</text>`); boxes.push({ x0: cx - w / 2, x1: cx + w / 2, y0: ty - 11, y1: ty + 3 }); }
      });
      (sp.arrows || []).forEach(a => { s += `<line x1="${X(a.x1).toFixed(1)}" y1="${Y(a.y1).toFixed(1)}" x2="${X(a.x2).toFixed(1)}" y2="${Y(a.y2).toFixed(1)}" style="stroke:${a.c || 'var(--pen)'};stroke-width:1.5;stroke-dasharray:3 3"/>`; });
      (sp.dots || []).forEach(d => { s += `<circle cx="${X(d[0]).toFixed(1)}" cy="${Y(d[1]).toFixed(1)}" r="${sp.dotR || 1.6}" style="fill:${sp.dotC || 'var(--ink-3)'};fill-opacity:${sp.dotOp || .35}"/>`; });
      (sp.refsX || []).forEach(r => { const x = X(r.v).toFixed(1); s += `<line x1="${x}" x2="${x}" y1="${pad.t}" y2="${H - pad.b}" style="stroke:${r.c || 'var(--ink-3)'};stroke-width:1.2;stroke-dasharray:4 4"/>${r.label ? `<text x="${(X(r.v) + 4).toFixed(1)}" y="${pad.t + 11}" class="ax">${r.label}</text>` : ''}`; });
      (sp.refsY || []).forEach(r => { const y = Y(r.v).toFixed(1); s += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y}" y2="${y}" style="stroke:${r.c || 'var(--ink-3)'};stroke-width:1.2;stroke-dasharray:4 4"/>${r.label ? `<text x="${W - pad.r - 4}" y="${(Y(r.v) - 5).toFixed(1)}" text-anchor="end" class="ax">${r.label}</text>` : ''}`; });
      (sp.lines || []).forEach(L => { if (!L.pts || L.pts.length < 2) return; s += `<path d="${L.pts.map((q, k) => (k ? 'L' : 'M') + X(q[0]).toFixed(1) + ' ' + Y(q[1]).toFixed(1)).join('')}" style="fill:none;stroke:${L.c || 'var(--pen)'};stroke-width:${L.w || 2};stroke-linejoin:round;stroke-linecap:round${L.dash ? ';stroke-dasharray:5 4' : ''}"/>`; });
      const pts = (sp.points || []).map(p => ({ p, x: X(p.x), y: Y(p.y), r: p.r || 4.5 }));
      pts.forEach(q => {
        const { p, x, y, r } = q;
        if (p.ring) s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r + 2}" style="fill:none;stroke:${p.c};stroke-width:1.5;stroke-dasharray:3 2"/>`;
        else s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" style="fill:${p.c};stroke:var(--sheet);stroke-width:${p.big ? 2 : 1}"/>`;
        boxes.push({ x0: x - r - 1, x1: x + r + 1, y0: y - r - 1, y1: y + r + 1 });
      });
      pts.filter(q => q.p.label).sort((a, b) => (b.p.big ? 1 : 0) - (a.p.big ? 1 : 0)).forEach(q => {
        const { p, x, y, r } = q, w = tw(p.label, p.big), g = r + 3;
        const cands = [
          { a: 'start', tx: x + g, ty: y + 4, b: { x0: x + g - 1, x1: x + g + w, y0: y - 7, y1: y + 6 } },
          { a: 'end', tx: x - g, ty: y + 4, b: { x0: x - g - w, x1: x - g + 1, y0: y - 7, y1: y + 6 } },
          { a: 'middle', tx: x, ty: y - g - 2, b: { x0: x - w / 2, x1: x + w / 2, y0: y - g - 13, y1: y - g + 1 } },
          { a: 'middle', tx: x, ty: y + g + 10, b: { x0: x - w / 2, x1: x + w / 2, y0: y + g - 1, y1: y + g + 13 } },
          { a: 'start', tx: x + g - 2, ty: y - g + 1, b: { x0: x + g - 3, x1: x + g - 2 + w, y0: y - g - 10, y1: y - g + 3 } },
          { a: 'start', tx: x + g - 2, ty: y + g + 7, b: { x0: x + g - 3, x1: x + g - 2 + w, y0: y + g - 4, y1: y + g + 9 } },
          { a: 'end', tx: x - g + 2, ty: y - g + 1, b: { x0: x - g + 2 - w, x1: x - g + 3, y0: y - g - 10, y1: y - g + 3 } },
          { a: 'end', tx: x - g + 2, ty: y + g + 7, b: { x0: x - g + 2 - w, x1: x - g + 3, y0: y + g - 4, y1: y + g + 9 } }
        ];
        const own = { x0: x - r - 1, x1: x + r + 1, y0: y - r - 1, y1: y + r + 1 };
        const ok = c => inside(c.b) && !boxes.some(o => o !== own && !(o.x0 === own.x0 && o.y0 === own.y0) && c.b.x0 < o.x1 && c.b.x1 > o.x0 && c.b.y0 < o.y1 && c.b.y1 > o.y0);
        let c = cands.find(ok);
        if (!c && p.big) c = cands.find(k => inside(k.b)) || cands[0];
        if (!c) return;
        boxes.push(c.b);
        labels.push(`<text x="${c.tx.toFixed(1)}" y="${c.ty.toFixed(1)}" text-anchor="${c.a}" class="${p.big ? 'lab' : 'lab2'}"${p.big ? ` style="fill:${p.c}"` : p.lc ? ` style="fill:${p.lc}"` : ''}>${esc(p.label)}</text>`);
      });
      void hit;
      return s + labels.join('') + '</svg>';
    },
    draw(only) {
      document.querySelectorAll('[data-chart]').forEach(el => {
        const id = el.dataset.chart; if (only && only.indexOf(id) < 0) return;
        const fn = CHARTS[id]; if (!fn) return;
        let sp; try { sp = fn(); } catch (e) { console.error(e); return; }
        if (!sp) { el.innerHTML = ''; return; }
        const W = Math.max(240, Math.floor(el.clientWidth)), H = Math.max(120, Math.floor(el.clientHeight));
        el.innerHTML = sp.type === 'map' ? Charts.map(sp, W, H) : sp.type === 'bars' ? Charts.bars(sp, W, H) : Charts.lines(sp, W, H);
      });
    }
  };

  /* ================= Storage ================= */
  const LOCAL_KEY = 'simlab.v2';
  const Local = {
    read() { try { const v = localStorage.getItem(LOCAL_KEY); const o = v ? JSON.parse(v) : null; return o && o.runs ? o : { runs: {}, data: {} }; } catch (e) { return { runs: {}, data: {} }; } },
    write(o) { try { localStorage.setItem(LOCAL_KEY, JSON.stringify(o)); return true; } catch (e) { return false; } },
    save(meta, data) { const o = Local.read(); o.runs[meta.id] = meta; o.data[meta.id] = data; return Local.write(o); },
    remove(id) { const o = Local.read(); delete o.runs[id]; delete o.data[id]; return Local.write(o); },
    data(id) { return Local.read().data[id] || null; },
    runs() { return Local.read().runs; }
  };
  const Cloud = { db: null, uid: null, metaCol: null, dataCol: null, unsub: null, queues: {}, ready: false };
  function cloudWrite(ref, body, isDelete) {
    const key = ref.path;
    const q = Cloud.queues[key] || (Cloud.queues[key] = { busy: false, next: null });
    return new Promise((resolve, reject) => {
      const waiters = q.next ? q.next.waiters : [];
      waiters.push({ resolve, reject });
      q.next = { body, isDelete, waiters };
      pump(ref, q);
    });
  }
  function pump(ref, q) {
    if (q.busy || !q.next) return;
    const job = q.next; q.next = null; q.busy = true;
    const run = attempt => (job.isDelete ? ref.delete() : ref.set(job.body)).catch(e => {
      if (e && e.code === 'unavailable' && attempt === 0) return new Promise(r => setTimeout(r, 400 + Math.random() * 900)).then(() => run(1));
      throw e;
    });
    run(0).then(() => job.waiters.forEach(w => w.resolve()), e => job.waiters.forEach(w => w.reject(e))).finally(() => { q.busy = false; pump(ref, q); });
  }
  const Store = {
    async save(meta, data) {
      if (App.mode === 'cloud') {
        await cloudWrite(Cloud.dataCol.doc(meta.id), data);
        await cloudWrite(Cloud.metaCol.doc(meta.id), meta);
      } else if (!Local.save(meta, data)) throw { code: 'local_full', message: 'This device has no room left to save.' };
    },
    async saveMeta(meta) {
      if (App.mode === 'cloud') await cloudWrite(Cloud.metaCol.doc(meta.id), meta);
      else { const o = Local.read(); o.runs[meta.id] = meta; Local.write(o); }
    },
    async loadData(id) {
      if (App.mode === 'cloud') { const snap = await Cloud.dataCol.doc(id).get(); return snap.exists ? clone(snap.data()) : null; }
      return Local.data(id);
    },
    async remove(id) {
      if (App.mode === 'cloud') { await cloudWrite(Cloud.metaCol.doc(id), null, true); await cloudWrite(Cloud.dataCol.doc(id), null, true); }
      else Local.remove(id);
    }
  };

  /* Preferences (goal, weekly target): one small document per user, mirrored on the device. */
  const PREFS_KEY = 'simlab.prefs.v1';
  const Prefs = {
    local() { try { return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') || {}; } catch (e) { return {}; } },
    keep(o) { try { localStorage.setItem(PREFS_KEY, JSON.stringify(o)); } catch (e) { /* device storage full */ } },
    async save(patch) {
      App.prefs = Object.assign({}, App.prefs, patch, { updatedAt: Date.now() });
      Prefs.keep(App.prefs);
      if (App.mode === 'cloud' && Cloud.prefsDoc) { try { await cloudWrite(Cloud.prefsDoc, App.prefs); } catch (e) { /* kept on device */ } }
      return App.prefs;
    },
    async sync() {
      if (App.mode !== 'cloud' || !Cloud.prefsDoc) return;
      try {
        const snap = await Cloud.prefsDoc.get(), remote = snap.exists ? snap.data() : null, mine = Prefs.local();
        if (remote && (remote.updatedAt || 0) >= (mine.updatedAt || 0)) { App.prefs = remote; Prefs.keep(remote); }
        else if (mine.updatedAt) await cloudWrite(Cloud.prefsDoc, mine);
      } catch (e) { /* keep device copy */ }
    }
  };

  /* ================= App shell ================= */
  const App = {
    modules: {}, order: [],
    view: 'home', mode: 'local', connecting: true,
    me: { id: null, name: '', email: null, avatar: null, color: null },
    runs: {}, cur: null, sync: 'idle', syncAt: 0, saveTimer: null,
    dialog: null, confirm: null, filter: 'all', histCat: 'all', catF: { cat: 'all', fmt: 'all', lvl: 'all' }, banner: null, toastTimer: null,
    localCount: 0, toastMsg: null,
    /* Platform layer (platform.js) plugs in here; core falls back to its own views if it is missing or fails. */
    views: {}, actions: {}, hooks: {}, navItems: null, prefs: {}, provider: null, isAdmin: false, sbDown: false, sbBypass: false,
    register(def) { this.modules[def.id] = def; if (this.order.indexOf(def.id) < 0) this.order.push(def.id); },
    ctx: null
  };

  function setSync(s) { App.sync = s; if (s === 'saved') App.syncAt = Date.now(); const el = document.getElementById('sync'); if (el) el.outerHTML = syncChip(); }
  function syncChip() {
    const map = { idle: ['', App.mode === 'cloud' ? 'Synced' : 'On this device'], saving: ['busy', 'Saving…'], saved: ['ok', App.mode === 'cloud' ? 'Saved to account' : 'Saved on device'], error: ['bad', 'Not saved'] };
    const m = map[App.sync] || map.idle;
    return `<span id="sync" class="sync ${m[0]}" role="status"><i aria-hidden="true"></i><span class="sync-t">${m[1]}</span></span>`;
  }
  function toast(msg) {
    App.toastMsg = msg; clearTimeout(App.toastTimer);
    const el = document.getElementById('toast');
    if (el) { el.textContent = msg; el.hidden = false; }
    App.toastTimer = setTimeout(() => { App.toastMsg = null; const t = document.getElementById('toast'); if (t) t.hidden = true; }, 3200);
  }

  function avatar(size) {
    const me = App.me;
    if (me.avatar) return `<img class="av-img" src="${esc(me.avatar)}" alt="" width="${size}" height="${size}">`;
    const ini = (me.name || 'You').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
    return `<span class="av-img av-ini" style="width:${size}px;height:${size}px">${esc(ini)}</span>`;
  }

  /* ---- Identity and storage start-up ---- */
  async function connect() {
    const hasClaude = window.claude && typeof window.claude.use === 'function';
    App.runs = Local.runs();
    App.localCount = Object.keys(App.runs).length;
    const SB = !hasClaude && window.SimLabCloud && window.SimLabCloud.configured ? window.SimLabCloud : null;
    if (!hasClaude && !SB) { App.connecting = false; render(); return; }
    let user = null, db = null;
    if (hasClaude) {
      App.provider = 'claude';
      try { [user, db] = await Promise.all([window.claude.use('user'), window.claude.use('db')]); } catch (e) { /* fall back to device storage */ }
    } else {
      App.provider = 'web';
      try { const p = await SB.start(); if (p) { user = p.user; db = p.db; App.isAdmin = !!p.isAdmin; } } catch (e) { App.sbDown = true; App.banner = 'Sign-in is unavailable right now, so progress is saved on this device.'; }
    }
    if (user) {
      try { const me = await user.me(); App.me = { id: me.id, name: me.name || '', email: me.email || null, avatar: me.avatarUrl || null, color: me.color || null }; } catch (e) { /* no identity */ }
    }
    if (db && App.me.id) {
      try {
        Cloud.db = db; Cloud.uid = App.me.id;
        const base = db.doc('data/users/' + App.me.id + '/profile');
        Cloud.metaCol = base.collection('runs'); Cloud.dataCol = base.collection('rundata');
        Cloud.prefsDoc = base.collection('prefs').doc('main');
        App.mode = 'cloud';
        Prefs.sync().then(() => { if (App.view !== 'run') render(); });
        const localRuns = Local.runs();
        App.localCount = Object.keys(localRuns).length;
        App.runs = {};
        Cloud.unsub = Cloud.metaCol.orderBy('updatedAt', 'desc').limit(500).onSnapshot(snap => {
          const runs = {};
          snap.docs.forEach(d => { const v = d.data(); if (v && v.id) runs[v.id] = v; });
          if (App.cur && App.cur.meta && !runs[App.cur.meta.id]) runs[App.cur.meta.id] = App.cur.meta;
          App.runs = runs; Cloud.ready = true;
          if (App.view !== 'run') render(); else refreshChrome();
        }, err => {
          App.mode = 'local'; App.runs = Local.runs();
          App.banner = 'Your account storage is unavailable right now, so progress is saved on this device.';
          render();
        });
        if (App.cur && App.cur.where === 'local') migrateCurrent();
      } catch (e) { App.mode = 'local'; }
    }
    App.connecting = false;
    render();
  }
  async function migrateCurrent() {
    const c = App.cur; if (!c) return;
    try { await Store.save(c.meta, c.data); Local.remove(c.meta.id); c.where = 'cloud'; } catch (e) { /* keep local copy */ }
  }
  async function importLocal() {
    const o = Local.read(); const ids = Object.keys(o.runs); let n = 0;
    for (const id of ids) { try { await Store.save(o.runs[id], o.data[id] || {}); Local.remove(id); n++; } catch (e) { break; } }
    App.localCount = Object.keys(Local.runs()).length;
    toast(n ? `Moved ${n} run${n === 1 ? '' : 's'} to your account.` : 'Nothing was moved.');
    render();
  }
  function handleSaveError(e) {
    if (App.mode === 'cloud' && e && (e.code === 'invalid_argument' || e.code === 'revoked' || e.code === 'not_granted')) {
      App.mode = 'local'; App.banner = 'This view cannot save to your account, so progress is now saved on this device.';
      if (App.cur) { App.cur.where = 'local'; Local.save(App.cur.meta, App.cur.data); }
      setSync('saved'); render(); return;
    }
    if (e && e.code === 'quota_exceeded') toast('Your storage is full. Delete some old runs from History.');
    else toast('Could not save. Your progress is kept on screen; try again shortly.');
    setSync('error');
  }

  /* ---- Runs ---- */
  function persist() {
    const c = App.cur; if (!c) return Promise.resolve();
    clearTimeout(App.saveTimer);
    setSync('saving');
    return Store.save(c.meta, c.data).then(() => setSync('saved'), handleSaveError);
  }
  function touchDraft() {
    const c = App.cur; if (!c) return;
    const M = App.modules[c.meta.module];
    if (M.persist === 'replay') c.data.draft = c.game.draft || null; else c.data.state = c.game;
    clearTimeout(App.saveTimer);
    App.saveTimer = setTimeout(() => { c.meta.updatedAt = Date.now(); persist(); }, 5000);
  }
  function metaFrom(c) {
    const M = App.modules[c.meta.module], g = c.game;
    c.meta.progress = M.progress(g);
    c.meta.updatedAt = Date.now();
    c.meta.round = M.persist === 'replay' ? c.data.decisions.length : (c.meta.round || 0) + 1;
    if (M.isDone(g) && c.meta.status !== 'done') {
      const s = M.summary(g);
      Object.assign(c.meta, { status: 'done', completedAt: Date.now(), score: s.score, grade: grade(s.score), line: s.line || '', metrics: s.metrics || [] });
    }
  }
  function newRun(moduleId, config, seed, tag) {
    const M = App.modules[moduleId]; if (!M) return;
    const id = uid('r'), now = Date.now(), sd = seed != null ? seed : newSeed();
    const game = M.create(sd, config || {});
    const n = Object.values(App.runs).filter(r => r.module === moduleId).length + 1;
    const meta = { id, module: moduleId, title: `${modLabel(moduleId)} · run ${n}`, status: 'active', progress: M.progress(game), round: 0, createdAt: now, updatedAt: now, seed: sd, config: config || {}, score: null, grade: null, line: '', metrics: [], v: M.version };
    if (tag) meta.tag = tag;
    const data = { id, v: M.version, seed: sd, config: config || {}, decisions: [], draft: M.persist === 'replay' ? (game.draft || null) : null, state: M.persist === 'state' ? game : null };
    App.cur = { meta, data, game, ui: {}, where: App.mode };
    App.runs[id] = meta; App.view = 'run'; App.dialog = null;
    render(true); persist();
  }
  function rebuild(M, data) {
    if (M.persist === 'state') return clone(data.state);
    const g = M.create(data.seed, data.config || {});
    for (const d of data.decisions || []) M.apply(g, d);
    if (data.draft && !M.isDone(g)) g.draft = clone(data.draft);
    return g;
  }
  async function openRun(id, ui) {
    const meta = App.runs[id]; if (!meta) return;
    const M = App.modules[meta.module];
    if (!M) { toast('This simulation is not available in this version.'); return; }
    App.view = 'loading'; render();
    let data = null;
    try { data = await Store.loadData(id); } catch (e) { data = null; }
    if (!data) { App.view = 'history'; render(); toast('Could not load that run.'); return; }
    let game;
    try { game = rebuild(M, data); } catch (e) { console.error(e); App.view = 'history'; render(); toast('That run could not be rebuilt in this version.'); return; }
    App.cur = { meta: Object.assign({}, meta), data, game, ui: ui || {}, where: App.mode, stale: data.v !== M.version };
    App.view = 'run'; render(true);
  }
  function commit(decision) {
    const c = App.cur, M = App.modules[c.meta.module];
    if (M.persist === 'replay') { M.apply(c.game, decision); c.data.decisions.push(clone(decision)); c.data.draft = c.game.draft ? clone(c.game.draft) : null; }
    else c.data.state = c.game;
    metaFrom(c);
    App.runs[c.meta.id] = c.meta;
    return persist();
  }

  /* ---- Views ---- */
  function nav(active) {
    const items = App.navItems || [['home', 'Home'], ['catalog', 'Catalogue'], ['history', 'History'], ['account', 'Account']];
    return `<nav class="nav" aria-label="Main">${items.map(([v, t]) => `<button type="button" class="nav-i" data-act="nav" data-view="${v}" aria-current="${v === active ? 'page' : 'false'}">${t}</button>`).join('')}</nav>`;
  }
  function topBar(inner, wide, cls) { return `<div class="bar${cls ? ' ' + cls : ''}"><div class="bar-in${wide ? ' wide' : ''}">${inner}</div></div>`; }
  function shellTop(active) {
    return topBar(`<button type="button" class="brand" data-act="nav" data-view="home">B-School Sim Lab</button><span class="bar-sp"></span>${modeSwitch()}${syncChip()}<button type="button" class="me-btn" data-act="nav" data-view="account" aria-label="Account">${avatar(30)}</button>`, true) +
      `<div class="navwrap"><div class="nav-in wide">${nav(active)}</div></div>`;
  }
  function bannerHtml() {
    let b = '';
    if (App.banner) b += `<div class="banner">${esc(App.banner)} <button type="button" class="link" data-act="dismiss-banner">Dismiss</button></div>`;
    if (App.provider === 'web' && App.mode !== 'cloud' && !App.connecting && !App.sbHide && App.view !== 'account') b += `<div class="banner">Sign in to keep your progress on every device. <button type="button" class="link" data-act="nav" data-view="account">Sign in</button> <button type="button" class="link" data-act="sb-hide">Not now</button></div>`;
    if (App.mode === 'cloud' && App.localCount > 0) b += `<div class="banner">${App.localCount} run${App.localCount === 1 ? ' is' : 's are'} saved only on this device. <button type="button" class="link" data-act="import-local">Move to my account</button></div>`;
    return b;
  }
  const runsArr = () => Object.values(App.runs).filter(r => r && App.modules[r.module]).sort((a, b) => b.updatedAt - a.updatedAt);
  /* Hidden modules are quick versions reached from elsewhere; retired ones stay only so their saved runs still open. */
  const visibleMods = () => App.order.filter(id => !App.modules[id].hidden && !App.modules[id].retired);
  const modLabel = id => { const M = App.modules[id]; return M ? (M.hidden ? `${M.title} (quick)` : M.title) : id; };
  const runTitle = r => { const M = App.modules[r.module]; const t = r.title || M.title; return M.hidden && t.indexOf(M.title + ' · ') === 0 ? modLabel(r.module) + t.slice(M.title.length) : t; };

  function runRow(r) {
    const M = App.modules[r.module], career = modFmt(M) === 'career';
    const st = r.status === 'done' ? (r.score == null ? '<span class="pill good">Report ready</span>' : `<span class="pill ${tone(r.score)}">${r.grade} · ${r.score}</span>`) : r.status === 'abandoned' ? '<span class="pill neutral">Abandoned</span>' : '<span class="pill pen">In progress</span>';
    const confirm = App.confirm === r.id;
    const again = r.status !== 'done' ? '' : career ? `<button type="button" class="link" data-act="new-run" data-module="${r.module}">Retake</button>` : `<button type="button" class="link" data-act="retry-run" data-id="${r.id}">Replay</button>`;
    return `<div class="run-row"><button type="button" class="run-main" data-act="open-run" data-id="${r.id}"><span class="rr-t">${esc(runTitle(r))}</span><span class="rr-s">${M.hidden ? 'Quick version · ' : ''}${esc(r.progress || '')} · ${N.ago(r.updatedAt)}</span>${r.line ? `<span class="rr-l">${esc(r.line)}</span>` : ''}</button><div class="rr-side">${st}<div class="rr-acts">${again}${confirm ? `<button type="button" class="link danger" data-act="del-run" data-id="${r.id}">Confirm delete</button>` : `<button type="button" class="link" data-act="del-run" data-id="${r.id}">Delete</button>`}</div></div></div>`;
  }
  const modFmt = M => M.format || 'sim';
  const fmtOne = M => (FORMATS.find(f => f.v === modFmt(M)) || FORMATS[0]).one;
  const catOf = M => CATS.find(c => c.id === M.cat) || null;
  const scoredOnly = rs => rs.filter(r => r.score != null && isFinite(r.score));
  const levelsOf = M => { if (modFmt(M) === 'career') return LEVELS.map(l => l.v); if (M.level) return [normLevel(M.level)]; const o = (M.options || []).find(x => x.id === 'difficulty'); return o ? o.choices.map(c => normLevel(c.v)) : ['guided']; };
  function levelTag(M) {
    if (modFmt(M) === 'career') return '<span class="lvl lv-r">Any stage</span>';
    const ls = levelsOf(M).map(lvlIdx).sort((a, b) => a - b);
    if (ls.length === 1) return UI.level(LEVELS[ls[0]].v);
    return `<span class="lvl lv-r" title="${ls.map(i => LEVELS[i].t).join(', ')}">${LEVELS[ls[0]].t} to ${LEVELS[ls[ls.length - 1]].t}</span>`;
  }
  function bestScores() { const best = {}; scoredOnly(runsArr().filter(r => r.status === 'done')).forEach(r => { if (best[r.module] == null || r.score > best[r.module]) best[r.module] = r.score; }); return best; }
  const modsBy = (fmt, cat) => visibleMods().filter(id => { const M = App.modules[id]; return (!fmt || modFmt(M) === fmt) && (!cat || M.cat === cat); });
  function catCounts(cat) {
    const parts = FORMATS.map(f => { const n = modsBy(f.v, cat).length; return n ? `${n} ${n === 1 ? f.one.toLowerCase() : f.t.toLowerCase()}` : ''; }).filter(Boolean);
    return parts.join(' · ') || 'Coming soon';
  }
  function viewHome() {
    const runs = runsArr(), active = runs.filter(r => r.status === 'active'), done = runs.filter(r => r.status === 'done');
    const first = (App.me.name || '').split(' ')[0], best = bestScores(), scored = scoredOnly(done);
    const sims = modsBy('sim'), cases = modsBy('case'), prac = modsBy('practice'), career = modsBy('career');
    let h = `<section class="hero"><span class="eyebrow">${App.mode === 'cloud' ? 'Signed in' : App.connecting ? 'Connecting' : 'Guest mode'}</span><h1>${first ? `Welcome back, ${esc(first)}` : 'Practise the <span class="hl">simulations</span> top MBA programmes run'}</h1><p class="lede">${first ? 'Pick up a session where you left it, or start something new.' : `Full-depth practice versions of the classic business simulations, a library of real cases, decision-making and guesstimate practice${career.length ? ', and a career assessment that turns your results into evidence for the roles you want' : ''}. Every session saves, with a record of every run.`}</p>${UI.kpis([
      { k: 'Runs completed', v: String(done.length) }, { k: 'In progress', v: String(active.length) },
      { k: 'Average score', v: scored.length ? String(Math.round(avg(scored.map(r => r.score)))) : '–' }, { k: 'Best grade', v: scored.length ? grade(Math.max(...scored.map(r => r.score))) : '–' }
    ])}</section>`;
    if (active.length) h += UI.sheet('Continue', 'Sessions in progress', `<div class="runs">${active.slice(0, 6).map(runRow).join('')}</div>${active.length > 6 ? UI.btn(`See all ${active.length} in History`, 'nav', 'btn-ghost btn-block', 'data-view="history"') : ''}`);
    career.forEach(id => {
      const M = App.modules[id], mine = runs.filter(r => r.module === id);
      if (M.homeCard) h += UI.sheet(M.homeEyebrow || 'Careers', M.homeTitle || M.title, M.homeCard(mine.find(r => r.status === 'done') || null, mine.find(r => r.status === 'active') || null, runs), 'feature');
    });
    h += UI.sheet('Browse', 'By subject', `<div class="cats">${CATS.filter(c => c.subject !== false).map(c => `<button type="button" class="cat-t" data-act="go-cat" data-cat="${c.id}"><span class="ct-n">${c.t}</span><span class="ct-c num">${catCounts(c.id)}</span><span class="ct-s">${c.s}</span></button>`).join('')}</div><div class="lvl-key"><span class="eyebrow">Levels</span>${LEVELS.map(l => UI.level(l.v)).join('')}<span class="cap">Foundation gives you estimates and coaching. Intermediate takes the coaching away. Advanced leaves you with only what a manager would really see.</span></div>`);
    h += UI.sheet('Simulations', `${sims.length} full simulations`, `<div class="mods">${sims.map(id => modCard(id, best[id], 'cat')).join('')}</div>`);
    if (cases.length) {
      const feat = cases.filter(id => best[id] == null).slice(0, 4);
      h += UI.sheet('Case library', `${cases.length} real situations, disguised until the end`, `<p class="blurb">Each case puts you inside a real company at a real turning point, with the figures it faced. You make three to five decisions, then the debrief reveals the company, the year and what actually happened.</p><div class="mods">${(feat.length ? feat : cases.slice(0, 4)).map(id => modCard(id, best[id], 'cat')).join('')}</div>${UI.btn(`Browse all ${cases.length} cases`, 'go-cat', 'btn-ghost btn-block', 'data-fmt="case"')}`);
    }
    if (prac.length) h += UI.sheet('Practice', 'Decision making and guesstimates', `<div class="mods">${prac.map(id => modCard(id, best[id], 'cat')).join('')}</div>`);
    if (done.length) h += UI.sheet('History', 'Recent results', `<div class="runs">${done.slice(0, 5).map(runRow).join('')}</div>${UI.btn('See full history', 'nav', 'btn-ghost btn-block', 'data-view="history"')}`);
    return h;
  }
  function modCard(id, bestScore, mode) {
    const M = App.modules[id], c = catOf(M);
    const eyebrow = mode === 'fmt' ? `${fmtOne(M)} · ${M.length}` : `${c ? c.t : M.area} · ${M.length}`;
    const career = modFmt(M) === 'career', reports = career ? runsArr().filter(r => r.module === id && r.status === 'done').length : 0;
    const status = career ? (reports ? `<span class="pill good">${reports} report${reports === 1 ? '' : 's'}</span>` : '<span class="pill neutral">Not taken yet</span>') : bestScore != null ? `<span class="pill ${tone(bestScore)}">Best ${grade(bestScore)} · ${bestScore}</span>` : '<span class="pill neutral">Not played yet</span>';
    return `<article class="mod${modFmt(M) !== 'sim' ? ' compact' : ''}"><div class="mod-top"><span class="eyebrow">${eyebrow}</span>${levelTag(M)}</div><h3>${M.title}</h3><p class="blurb">${M.blurb}</p>${M.practises ? `<p class="practises"><span class="eyebrow">${modFmt(M) === 'case' ? 'Teaches' : career ? 'Covers' : 'Practises'}</span>${M.practises}</p>` : ''}<footer>${status}<button type="button" class="btn btn-primary" data-act="new-run" data-module="${id}">${M.cta || (modFmt(M) === 'case' ? 'Open case' : modFmt(M) === 'practice' ? 'Start practice' : 'New run')}</button></footer></article>`;
  }
  function filterRow(k, label, opts) {
    const v = App.catF[k];
    return `<div class="frow"><span class="lbl">${label}</span><div class="chips sm" role="group" aria-label="${esc(label)}">${opts.map(o => `<button type="button" class="chip" data-act="cat-f" data-k="${k}" data-value="${o.v}" aria-pressed="${o.v === v}">${o.t}</button>`).join('')}</div></div>`;
  }
  function viewCatalog() {
    const F = App.catF, best = bestScores(), all = visibleMods();
    const match = id => { const M = App.modules[id]; return (F.cat === 'all' || M.cat === F.cat) && (F.fmt === 'all' || modFmt(M) === F.fmt) && (F.lvl === 'all' || levelsOf(M).indexOf(F.lvl) >= 0); };
    const shown = all.filter(match);
    const order = id => FORMATS.findIndex(f => f.v === modFmt(App.modules[id]));
    let h = `<section class="hero"><span class="eyebrow">Catalogue</span><h1>Everything you can practise</h1><p class="lede">${modsBy('sim').length} full simulations, ${modsBy('case').length} cases and ${modsBy('practice').length ? 'practice sets for decision making and guesstimates' : 'more to come'}, by subject and level${modsBy('career').length ? ', plus a career assessment that uses your results as evidence' : ''}. Every run saves automatically, and every case reveals its real company at the end.</p></section>`;
    h += `<section class="sheet catf">${filterRow('cat', 'Subject', [{ v: 'all', t: 'All' }].concat(CATS.map(c => ({ v: c.id, t: c.t }))))}${filterRow('fmt', 'Format', [{ v: 'all', t: 'All' }].concat(FORMATS.map(f => ({ v: f.v, t: f.t }))))}${filterRow('lvl', 'Level', [{ v: 'all', t: 'Any level' }].concat(LEVELS.map(l => ({ v: l.v, t: l.t }))))}<p class="cap num">${shown.length} of ${all.length} shown${F.cat !== 'all' || F.fmt !== 'all' || F.lvl !== 'all' ? ` · <button type="button" class="link" data-act="cat-clear">Clear filters</button>` : ''}</p></section>`;
    CATS.forEach(c => {
      const ids = shown.filter(id => App.modules[id].cat === c.id).sort((a, b) => order(a) - order(b));
      if (ids.length) h += UI.sheet(c.s, c.t, `<div class="mods">${ids.map(id => modCard(id, best[id], 'fmt')).join('')}</div>`);
    });
    if (!shown.length) h += UI.sheet(null, null, UI.empty('Nothing matches those filters.', UI.btn('Clear filters', 'cat-clear', 'btn-ghost')));
    return h;
  }
  function viewHistory() {
    const all = runsArr(), f = App.filter, hc = App.histCat;
    const inCat = r => hc === 'all' || (App.modules[r.module].cat || 'other') === hc;
    const runs = all.filter(r => inCat(r) && (f === 'all' || r.module === f));
    const done = scoredOnly(runs.filter(r => r.status === 'done')).sort((a, b) => (a.completedAt || 0) - (b.completedAt || 0));
    const catChips = [{ v: 'all', t: 'All' }].concat(CATS.filter(c => all.some(r => App.modules[r.module].cat === c.id)).map(c => ({ v: c.id, t: c.t })));
    const modIds = hc === 'all' ? [] : App.order.filter(id => (App.modules[id].cat || 'other') === hc && all.some(r => r.module === id));
    let h = `<section class="hero"><span class="eyebrow">Your record</span><h1>History</h1><p class="lede">Every run you start is listed here, newest first. Open a finished run to see its debrief again, or replay the same market.</p></section>`;
    h += `<div class="chips filt" role="group" aria-label="Filter by subject">${catChips.map(c => `<button type="button" class="chip" data-act="hist-cat" data-value="${c.v}" aria-pressed="${c.v === hc}">${c.t}</button>`).join('')}</div>`;
    if (modIds.length > 1) h += `<div class="chips sm filt" role="group" aria-label="Filter by simulation">${[{ v: 'all', t: 'All in subject' }].concat(modIds.map(id => ({ v: id, t: modLabel(id) }))).map(c => `<button type="button" class="chip" data-act="filter" data-value="${c.v}" aria-pressed="${c.v === f}">${esc(c.t)}</button>`).join('')}</div>`;
    if (done.length >= 2) {
      h += UI.sheet('Progress', 'Scores over time', UI.chart('hist-trend', () => ({ series: [{ values: done.map(r => r.score), c: 'var(--pen)', dots: true }], xLabel: i => '#' + (i + 1), yMin: 0, yMax: 100 }), 170, [{ t: 'Score per completed run', c: 'var(--pen)' }], 'Scores over time'));
      const byMod = {};
      done.forEach(r => { (byMod[r.module] = byMod[r.module] || []).push(r.score); });
      h += UI.sheet('Summary', 'By simulation', UI.table(['Simulation', 'Runs', 'Best', 'Average', 'Last'], Object.keys(byMod).map(m => { const s = byMod[m]; return [modLabel(m), String(s.length), String(Math.max(...s)), String(Math.round(avg(s))), String(s[s.length - 1])]; })));
    }
    h += UI.sheet(null, `${runs.length} run${runs.length === 1 ? '' : 's'}`, runs.length ? `<div class="runs">${runs.map(runRow).join('')}</div>` : UI.empty('No runs yet. Start one from Simulations.', UI.btn('Browse simulations', 'nav', 'btn-primary', 'data-view="catalog"')));
    return h;
  }
  /* Website copies can require sign-in before anything else shows (cloud-config.js: requireSignIn). */
  function needsSignIn() {
    const SB = window.SimLabCloud, hasClaude = window.claude && typeof window.claude.use === 'function';
    return !!(SB && SB.requireSignIn && !hasClaude && App.mode !== 'cloud' && !App.sbBypass);
  }
  function signInForm() {
    const SB = window.SimLabCloud;
    return `<div class="sb-form"><label class="cap" for="sb-email">Email</label><input id="sb-email" class="sb-in" type="email" autocomplete="email" placeholder="you@example.com"><div class="actions">${UI.btn('Email me a sign-in link', 'sb-email', 'btn-primary')}${SB && SB.google ? UI.btn('Continue with Google', 'sb-google', 'btn-ghost') : ''}</div></div>`;
  }
  function viewSignIn() {
    let body;
    if (App.connecting) body = '<div class="empty"><p>Checking your sign-in…</p></div>';
    else if (App.sbDown) body = UI.sheet('Sign in', null, `<p class="case">Sign-in is unavailable right now. Try again in a minute, or continue on this device; your runs will move to your account the next time you sign in.</p><div class="actions">${UI.btn('Try again', 'sb-retry', 'btn-primary')}${UI.btn('Continue on this device', 'sb-bypass', 'btn-ghost')}</div>`);
    else body = UI.sheet('Sign in', 'Sign in to start practising', `<p class="case">Your runs, scores and drafts save to your account, so you can pick up on any device. Enter your email and we will send you a one-tap sign-in link.</p>${signInForm()}`);
    return topBar('<span class="brand">B-School Sim Lab</span>', true) + `<main class="main"><section class="hero"><span class="eyebrow">Welcome</span><h1>Practise the <span class="hl">simulations</span> top MBA programmes run</h1></section>${body}</main>`;
  }
  function modeSwitch() {
    if (!App.isAdmin) return '';
    return `<span class="mode-sw" role="group" aria-label="Mode"><span class="mode-o on" aria-current="true">User</span><a class="mode-o" href="results.html">Admin</a></span>`;
  }
  function accountNote(cloud) {
    const SB = window.SimLabCloud, web = App.provider === 'web' && SB;
    if (cloud && App.provider === 'web') return `<p class="case">You are signed in to your Sim Lab account. Every run and draft saves to your account, so you can sign in on any device and pick up where you left off. Your scores and grades are visible to the site owner; your answers and drafts are not.</p><div class="actions">${UI.btn('Sign out', 'sb-signout', 'btn-ghost')}</div>`;
    if (cloud) return '<p class="case">You are signed in through your Claude account, with the same Google or email sign-in you use for Claude. Every run, draft and score saves to private storage that only you can read, and you can resume on any device where you open this page.</p>';
    if (App.connecting) return '<p class="case">Connecting to your account…</p>';
    if (web) return `<p class="case">You are playing as a guest, so runs save in this browser only. Sign in to keep your progress on every device. Runs already on this device can be moved to your account after you sign in.</p>${signInForm()}`;
    return '<p class="case">This view has no account connection, so runs save in this browser only. Open the page from your Claude account to sync across devices.</p>';
  }
  function viewAccount() {
    const me = App.me, cloud = App.mode === 'cloud';
    const all = runsArr();
    let h = `<section class="hero"><span class="eyebrow">Account</span><h1>Your profile</h1></section>`;
    h += UI.sheet('Signed in', null, `<div class="ident">${avatar(56)}<div class="ident-t"><span class="h2">${esc(me.name || (cloud ? 'Signed in' : 'Guest'))}</span>${me.email ? `<span class="num ident-e">${esc(me.email)}</span>` : ''}</div></div>${accountNote(cloud)}${UI.kpis([
      { k: 'Storage', v: cloud ? 'Account' : 'This device' }, { k: 'Runs saved', v: String(all.length) }, { k: 'Completed', v: String(all.filter(r => r.status === 'done').length) }, { k: 'Last activity', v: all.length ? N.ago(all[0].updatedAt) : '–' }
    ])}`);
    h += UI.sheet('Data', 'Your records', `<p class="case">Each run stores the market seed and every decision you made, so the platform can rebuild any year of any run exactly as you played it.</p><div class="actions">${UI.btn('Download history (CSV)', 'export-csv')}${cloud && App.localCount ? UI.btn(`Move ${App.localCount} device run${App.localCount === 1 ? '' : 's'} to account`, 'import-local') : ''}</div>`);
    return h;
  }
  function viewNewRun() {
    const d = App.dialog, M = App.modules[d.module], c = catOf(M);
    const opts = (M.options || []).map(o => {
      const choices = o.id === 'difficulty' ? o.choices.map(ch => Object.assign({}, ch, { t: levelName(ch.v) })) : o.choices;
      return UI.chips('opt:' + o.id, o.id === 'difficulty' ? 'Level' : o.label, choices, d.config[o.id], 'dlg-pick');
    }).join('');
    const fixed = M.level ? `<p class="dlg-lvl">${UI.level(M.level)}<span class="cap">${esc(M.levelNote || '')}</span></p>` : '';
    return `<div class="dlg-back" role="dialog" aria-modal="true" aria-label="New run"><div class="dlg sheet"><header class="sh"><span class="eyebrow">${fmtOne(M)}${c ? ' · ' + c.t : ''} · ${M.length}</span><h2>${esc(modLabel(M.id))}</h2></header><p class="blurb">${M.blurb}</p>${M.detail ? UI.fold('What is inside', `<div class="case">${M.detail}</div>`) : ''}${fixed}${opts}${App.hooks.dialog ? hookHtml(() => App.hooks.dialog(M, d)) : ''}${d.seed != null ? `<p class="cap">${d.tag ? 'Everyone gets the same market for this drill today.' : `Replaying from run seed ${d.seed}.`}</p>` : ''}<div class="actions"><button type="button" class="btn btn-primary" data-act="start-run">${M.cta || (modFmt(M) === 'case' ? 'Open the case' : 'Start run')}</button><button type="button" class="btn btn-ghost" data-act="dlg-close">Cancel</button></div></div></div>`;
  }
  function viewRun() {
    const c = App.cur, M = App.modules[c.meta.module], done = M.isDone(c.game);
    const ctx = { ui: c.ui, meta: c.meta, done, mode: App.mode, me: App.me };
    App.ctx = ctx;
    let body;
    try { body = M.view(c.game, ctx); } catch (e) { console.error(e); body = UI.empty('Something went wrong drawing this screen. Your run is saved; go back and reopen it.'); }
    return topBar(`<button type="button" class="back" data-act="leave-run"><span aria-hidden="true">←</span> ${App.navItems ? App.navItems[0][1] : 'Home'}</button><span class="bar-title">${esc(modLabel(M.id))}</span><span class="bar-prog num">${done ? (M.doneLabel || 'Debrief') : esc(M.progress(c.game))}</span>${syncChip()}`, M.wide, 'run-bar') +
      `<main class="main${M.wide ? ' wide' : ''}" id="run-main">${c.stale ? '<div class="banner">This run was saved with an earlier version of the simulation and has been rebuilt with the current rules. Some numbers may differ slightly.</div>' : ''}${body}${done && App.hooks.debrief ? hookHtml(() => App.hooks.debrief(c, M)) : ''}</main>`;
  }
  function hookHtml(fn) { try { return fn() || ''; } catch (e) { console.error(e); return ''; } }
  function refreshChrome() { const el = document.getElementById('sync'); if (el) el.outerHTML = syncChip(); }

  function render(top) {
    FIELDS = {}; CHARTS = {};
    const root = document.getElementById('app'); if (!root) return;
    const active = document.activeElement;
    const focusField = active && active.dataset && active.dataset.field && active.tagName === 'INPUT' ? { f: active.dataset.field, s: active.selectionStart, e: active.selectionEnd } : null;
    let html;
    if (needsSignIn()) html = viewSignIn();
    else if (App.view === 'run' && App.cur) html = viewRun();
    else if (App.view === 'loading') html = shellTop('') + '<main class="main"><div class="empty"><p>Rebuilding your run…</p></div></main>';
    else {
      const v = App.view === 'run' ? 'home' : App.view;
      const builtIn = () => (v === 'catalog' ? viewCatalog() : v === 'history' ? viewHistory() : v === 'account' ? viewAccount() : viewHome());
      let body;
      if (App.views[v]) { try { body = App.views[v](); } catch (e) { console.error(e); body = builtIn(); } } else body = builtIn();
      html = shellTop(v) + `<main class="main wide">${bannerHtml()}${body}<p class="foot">Original practice exercises built on concepts taught in business school courses. Cases are written from public sources.</p></main>`;
    }
    if (App.dialog) html += App.dialog.html ? hookHtml(App.dialog.html) : viewNewRun();
    html += `<div id="toast" class="toast" role="status" aria-live="polite"${App.toastMsg ? '' : ' hidden'}>${App.toastMsg ? esc(App.toastMsg) : ''}</div>`;
    root.innerHTML = html;
    Charts.draw();
    if (top) window.scrollTo(0, 0);
    /* Keep the selected main tab visible on narrow screens, where the tab row scrolls sideways. */
    root.querySelectorAll('.tabs').forEach(bar => {
      const t = bar.querySelector('.tab[aria-selected="true"]'); if (!t || bar.scrollWidth <= bar.clientWidth) return;
      const x = t.getBoundingClientRect().left - bar.getBoundingClientRect().left + bar.scrollLeft;
      if (x + t.offsetWidth > bar.clientWidth) bar.scrollLeft = Math.max(0, x - 24);
    });
    if (focusField) {
      const el = root.querySelector(`input[data-field="${CSS.escape(focusField.f)}"]`);
      if (el) { el.focus({ preventScroll: true }); try { el.setSelectionRange(focusField.s, focusField.e); } catch (e) { /* not a text input */ } }
    }
    const M = App.cur && App.modules[App.cur.meta.module];
    if (App.view === 'run' && M && M.afterRender) M.afterRender(App.cur.game, App.ctx);
    if (App.hooks.rendered) { try { App.hooks.rendered(); } catch (e) { console.error(e); } }
  }
  function applyLive() {
    const c = App.cur; if (!c) return;
    const M = App.modules[c.meta.module]; if (!M.live || M.isDone(c.game)) return;
    let L = {};
    try { L = M.live(c.game, App.ctx) || {}; } catch (e) { console.error(e); return; }
    Object.keys(L).forEach(k => {
      if (k === '_charts') Charts.draw(L[k]);
      else document.querySelectorAll(`[data-live="${k}"]`).forEach(n => { n.innerHTML = L[k]; });
    });
  }
  function handleModuleResult(res) {
    const c = App.cur; if (!c || !res) { applyLive(); return; }
    if (res.commit) {
      commit(res.commit === true ? null : res.commit);
      render(res.top !== false);
      if (res.toast) toast(res.toast);
      return;
    }
    if (res.save) { metaFrom(c); App.runs[c.meta.id] = c.meta; persist(); }
    if (res.draft) touchDraft();
    if (res.rerender) render(!!res.top); else applyLive();
    if (res.scrollTo) { const el = document.getElementById(res.scrollTo); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'start' }); }
    if (res.toast) toast(res.toast);
  }
  function exportCsv() {
    const rows = [['Run', 'Simulation', 'Status', 'Score', 'Grade', 'Progress', 'Started', 'Last update', 'Summary']];
    runsArr().forEach(r => rows.push([runTitle(r), modLabel(r.module), r.status, r.score == null ? '' : r.score, r.grade || '', r.progress || '', new Date(r.createdAt).toISOString(), new Date(r.updatedAt).toISOString(), r.line || '']));
    const csv = rows.map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n');
    return downloadText('sim-lab-history.csv', csv, 'text/csv');
  }
  async function downloadText(filename, text, type) {
    let dl = null;
    try { dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null; } catch (e) { dl = null; }
    if (!dl) { toast('Downloads are not available in this view.'); return; }
    try { await dl.save({ filename, data: new Blob([text], { type: type || 'text/plain' }) }); } catch (e) { if (e && e.code !== 'cancelled') toast('The download did not start.'); }
  }

  /* ---- Events ---- */
  function parseNum(s) { const v = parseFloat(String(s).replace(/[^0-9.\-]/g, '')); return isFinite(v) ? v : null; }
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
    const a = el.dataset.act;
    if (a !== 'del-run' && App.confirm) { App.confirm = null; }
    if (App.actions[a]) { App.actions[a](el, e); return; }
    switch (a) {
      case 'nav': App.view = el.dataset.view; App.cur = null; App.dialog = null; render(true); return;
      case 'dismiss-banner': App.banner = null; render(); return;
      case 'import-local': importLocal(); return;
      case 'sb-email': {
        const inp = document.getElementById('sb-email'), email = inp ? inp.value.trim() : '';
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { toast('Enter a valid email address.'); return; }
        el.disabled = true;
        window.SimLabCloud.signInEmail(email).then(() => toast('Check your inbox for a sign-in link.'), () => toast('Could not send the link. Try again shortly.')).finally(() => { el.disabled = false; });
        return;
      }
      case 'sb-retry': location.reload(); return;
      case 'sb-bypass': App.sbBypass = true; render(true); return;
      case 'sb-hide': App.sbHide = true; render(); return;
      case 'sb-google': window.SimLabCloud.signInGoogle().catch(() => toast('Google sign-in is unavailable right now.')); return;
      case 'sb-signout': window.SimLabCloud.signOut().finally(() => location.reload()); return;
      case 'export-csv': exportCsv(); return;
      case 'filter': App.filter = el.dataset.value; render(); return;
      case 'hist-cat': App.histCat = el.dataset.value; App.filter = 'all'; render(); return;
      case 'cat-f': App.catF[el.dataset.k] = el.dataset.value; render(); return;
      case 'cat-clear': App.catF = { cat: 'all', fmt: 'all', lvl: 'all' }; render(); return;
      case 'go-cat': App.view = 'catalog'; App.cur = null; App.catF = { cat: el.dataset.cat || 'all', fmt: el.dataset.fmt || 'all', lvl: 'all' }; render(true); return;
      case 'new-run': {
        const M = App.modules[el.dataset.module]; const config = {};
        (M.options || []).forEach(o => { config[o.id] = o.default; });
        const want = App.catF.lvl, dOpt = (M.options || []).find(o => o.id === 'difficulty');
        if (dOpt && want !== 'all' && dOpt.choices.some(ch => ch.v === want)) config.difficulty = want;
        if (el.dataset.preset) {
          let pre = {}; try { pre = JSON.parse(el.dataset.preset); } catch (err) { pre = {}; }
          Object.keys(pre).forEach(k => { const o = (M.options || []).find(x => x.id === k); if (o && o.choices.some(ch => String(ch.v) === String(pre[k]))) config[k] = pre[k]; });
        }
        const seed = el.dataset.seed ? Number(el.dataset.seed) : null;
        App.dialog = { module: M.id, config, seed, tag: el.dataset.tag || null }; render(); return;
      }
      case 'dlg-pick': { const k = el.dataset.field.slice(4); let v = el.dataset.value; v = isNaN(Number(v)) ? v : Number(v); App.dialog.config[k] = v; render(); return; }
      case 'dlg-close': App.dialog = null; render(); return;
      case 'start-run': { const d = App.dialog; newRun(d.module, d.config, d.seed, d.tag); return; }
      case 'open-run': { const r = App.runs[el.dataset.id]; if (r) openRun(r.id); return; }
      case 'retry-run': { const r = App.runs[el.dataset.id]; if (!r) return; App.dialog = { module: r.module, config: Object.assign({}, r.config || {}), seed: r.seed }; render(); return; }
      case 'del-run': {
        const id = el.dataset.id;
        if (App.confirm !== id) { App.confirm = id; render(); return; }
        App.confirm = null; delete App.runs[id]; render();
        Store.remove(id).then(() => toast('Run deleted.'), () => toast('Could not delete that run.'));
        return;
      }
      case 'leave-run': { const c = App.cur; if (c) { clearTimeout(App.saveTimer); persist(); } App.cur = null; App.view = 'home'; render(true); return; }
      default: break;
    }
    const c = App.cur; if (!c) return;
    const M = App.modules[c.meta.module], g = c.game;
    if (a === 'tab') { c.ui[el.dataset.group] = el.dataset.value; if (M.onTab) M.onTab(g, el.dataset.group, el.dataset.value, App.ctx); render(el.dataset.top === '1'); return; }
    if (a === 'nudge') {
      const f = el.dataset.field, cfg = FIELDS[f] || { step: 1 }, input = document.querySelector(`input[data-field="${CSS.escape(f)}"]`);
      const cur = input ? parseNum(input.value) : null;
      let v = (cur == null ? 0 : cur) + Number(el.dataset.dir) * cfg.step;
      v = round(v, cfg.dec || 0);
      if (cfg.min != null) v = Math.max(cfg.min, v); if (cfg.max != null) v = Math.min(cfg.max, v);
      if (input) input.value = String(v);
      handleModuleResult(M.field ? M.field(g, f, v, el, App.ctx) : null);
      touchDraft();
      return;
    }
    if (a === 'pick') {
      let v = el.dataset.value; v = v === 'true' ? true : v === 'false' ? false : (v !== '' && !isNaN(Number(v))) ? Number(v) : v;
      el.parentElement.querySelectorAll('[data-act="pick"]').forEach(b => b.setAttribute('aria-pressed', String(b === el)));
      handleModuleResult(M.field ? M.field(g, el.dataset.field, v, el, App.ctx) : null);
      touchDraft();
      return;
    }
    if (a === 'm') { handleModuleResult(M.act ? M.act(g, el.dataset.op, el, App.ctx) : null); if (!M.isDone(g)) touchDraft(); return; }
  });
  document.addEventListener('input', e => {
    const el = e.target; const c = App.cur;
    if (!c || !el.matches || !el.matches('input[data-field], select[data-field], textarea[data-field]')) return;
    const M = App.modules[c.meta.module];
    let v;
    if (el.type === 'range' || el.classList.contains('ni')) { v = parseNum(el.value); if (v == null) return; }
    else v = el.value;
    const cfg = FIELDS[el.dataset.field];
    if (el.type === 'range' && cfg && cfg.fmt) { const out = document.querySelector(`[data-val="${CSS.escape(el.dataset.field)}"]`); if (out) out.textContent = cfg.fmt(v); }
    handleModuleResult(M.field ? M.field(c.game, el.dataset.field, v, el, App.ctx) : null);
    touchDraft();
  });
  document.addEventListener('change', e => {
    const el = e.target; if (!el.classList || !el.classList.contains('ni')) return;
    const cfg = FIELDS[el.dataset.field]; let v = parseNum(el.value); if (v == null || !cfg) return;
    if (cfg.min != null) v = Math.max(cfg.min, v); if (cfg.max != null) v = Math.min(cfg.max, v);
    v = round(v, cfg.dec || 0);
    if (String(v) !== el.value) { el.value = String(v); const c = App.cur; if (c) { const M = App.modules[c.meta.module]; handleModuleResult(M.field ? M.field(c.game, el.dataset.field, v, el, App.ctx) : null); touchDraft(); } }
  });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && App.cur && App.saveTimer) persist(); });
  let resizeTimer = null;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => Charts.draw(), 150); });

  function start() {
    App.runs = Local.runs(); App.prefs = Prefs.local();
    render();
    connect();
  }

  window.SimLab = { RNG, U, N, UI, Charts, App, grade, gradeWord, tone, start, toast, render, applyLive, downloadText, CATS, LEVELS, levelName, lvlOf, normLevel, commit: d => { commit(d); render(true); },
    X: { runsArr, runRow, modCard, bestScores, modsBy, visibleMods, modLabel, runTitle, levelsOf, levelTag, catOf, modFmt, fmtOne, scoredOnly, catCounts, viewHome, viewCatalog, viewHistory, viewAccount, Prefs, Store, openRun, newRun, lvlIdx, FORMATS } };
})();
