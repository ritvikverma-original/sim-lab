/* Deal Room engine: multi-issue negotiation cases against a computer counterpart.
   Each case has issues with options, private point values for both sides, BATNAs and a counterpart style.
   The counterpart concedes along a time-dependent aspiration curve, reciprocates concessions, learns your priorities
   from your offers and what you tell it, answers questions depending on trust, and proposes packages that trade
   across issues when it trusts you. Deterministic for a seed, a case and a list of moves. */
(function (root) {
  'use strict';
  const RNG = {
    make(seed) { return { s: (seed >>> 0) || 1 }; },
    next(r) { r.s = (r.s + 0x6D2B79F5) >>> 0; let t = r.s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; },
    pick(r, a) { return a[Math.floor(RNG.next(r) * a.length)]; }
  };
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const sum = a => a.reduce((s, x) => s + x, 0);
  const clone = o => JSON.parse(JSON.stringify(o));

  /* ---------- Cases ---------- */
  const CASES = {
    offer: {
      id: 'offer', title: 'The Offer', area: 'Job offer', unit: 'points', unitShort: 'pts', rounds: 8,
      you: 'Sam Rivera, an MBA graduate', them: 'Jordan Lee, head of recruiting at Northfield Partners', themShort: 'Jordan', firm: 'Northfield Partners',
      setting: 'Northfield Partners, a fast-growing strategy consultancy, has made you a verbal offer. Before you sign, you and Jordan Lee from recruiting will settle the terms of the contract.',
      brief: 'You liked everyone you met at Northfield and want the job, but you also hold a written offer from Calder Group, which you would accept if this falls through. The points below show how much each term is worth to you. They are private: Jordan has a points table of their own.',
      batnaText: 'Calder Group’s written offer, worth 5,200 points to you.',
      batna: { you: 5200, them: 5600 },
      themBatnaText: 'Their second-choice candidate, who would accept a standard package.',
      style: { beta: 1.25, trust0: 55, openness: 0.75, bluff: 0.2, lambda: 0.35 },
      issues: [
        { id: 'salary', name: 'Salary', opts: ['$90,000', '$95,000', '$100,000', '$105,000', '$110,000'], you: [0, 1500, 3000, 4500, 6000], them: [6000, 4500, 3000, 1500, 0],
          why: 'Our salary bands are set firm-wide. Every step above $100,000 has to be approved by the partners, and it sets a precedent for the whole class.' },
        { id: 'bonus', name: 'Signing bonus', opts: ['$0', '$5,000', '$10,000', '$15,000', '$20,000'], you: [0, 400, 800, 1200, 1600], them: [1600, 1200, 800, 400, 0],
          why: 'Signing bonuses come out of the recruiting budget, which is tight this year.' },
        { id: 'start', name: 'Start date', opts: ['June 1', 'July 1', 'August 1', 'September 1', 'October 1'], you: [0, 600, 1200, 1800, 2400], them: [1600, 1200, 800, 400, 0],
          why: 'We would like people to start early, but honestly the first projects for new hires do not kick off until the autumn, so it is a preference more than a need.' },
        { id: 'office', name: 'Office', opts: ['Boston', 'Chicago', 'Atlanta', 'Denver', 'Seattle'], you: [2000, 1500, 1000, 500, 0], them: [2000, 1500, 1000, 500, 0],
          why: 'Boston is where most of our client work is, so that is where we need people most. Seattle is our smallest office.' },
        { id: 'practice', name: 'Practice area', opts: ['Strategy', 'Operations', 'Technology', 'Marketing', 'Finance'], you: [3000, 2250, 1500, 750, 0], them: [1200, 900, 600, 300, 0],
          why: 'Strategy is our busiest practice and always short of people. Finance is overstaffed right now.' },
        { id: 'vacation', name: 'Vacation days', opts: ['15', '18', '20', '22', '25'], you: [0, 400, 800, 1200, 1600], them: [4000, 3000, 2000, 1000, 0],
          why: 'Vacation is a real problem for us. Staffing is tight, clients notice when teams are thin, and anything above our standard 15 days has knock-on effects for the whole class.' },
        { id: 'moving', name: 'Moving expenses covered', opts: ['0%', '25%', '50%', '75%', '100%'], you: [0, 800, 1600, 2400, 3200], them: [800, 600, 400, 200, 0],
          why: 'Relocation is a small line in our budget. We cover it for some hires and not others.' },
        { id: 'remote', name: 'Remote days a week', opts: ['0', '1', '2', '3', '4'], you: [0, 300, 600, 900, 1200], them: [2400, 1800, 1200, 600, 0],
          why: 'Our culture depends on people being together in the first year. Partners feel strongly about it.' }
      ],
      opening: 'Thanks for making time, Sam. Everyone was impressed, and we would love to have you at Northfield. Let’s agree the details. What would you like to propose?',
      alternatives: { truth: 'We do have another strong candidate, so we have some flexibility, but you are our first choice.', bluff: 'We have several excellent candidates waiting on our answer, so we cannot stretch much.' }
    },
    supply: {
      id: 'supply', title: 'Supply Agreement', area: 'Procurement', unit: '$k of value', unitShort: '$k', rounds: 7,
      you: 'Priya Shah, head of procurement at Greenleaf Kitchens', them: 'Marco Bianchi, sales director at Kairos Equipment', themShort: 'Marco', firm: 'Kairos Equipment',
      setting: 'Greenleaf Kitchens runs 140 fast-casual restaurants and will open 120 more over three years. You need a supplier for its new combination ovens and the service contract that comes with them. Kairos makes the oven your chefs prefer.',
      brief: 'You have a solid fallback: Ardent offers a similar oven on standard terms. The values below are your estimate of what each term is worth to Greenleaf over the contract, in thousands of dollars. Kairos has its own estimates, which you do not know.',
      batnaText: 'Ardent’s standard contract, worth $3,900k to Greenleaf.',
      batna: { you: 3900, them: 4300 },
      themBatnaText: 'Capacity they could sell to other restaurant groups at list prices.',
      style: { beta: 0.95, trust0: 50, openness: 0.55, bluff: 0.45, lambda: 0.3 },
      issues: [
        { id: 'price', name: 'Price per oven', opts: ['$9,000', '$9,500', '$10,000', '$10,500', '$11,000'], you: [2500, 1875, 1250, 625, 0], them: [0, 875, 1750, 2625, 3500],
          why: 'Our margins on this model are thin. Price is the first thing my management will look at.' },
        { id: 'volume', name: 'Committed volume (3 years)', opts: ['150 ovens', '250 ovens', '350 ovens', '450 ovens'], you: [1200, 900, 450, 0], them: [0, 1500, 3000, 4500],
          why: 'Volume is everything for us. A firm commitment lets us plan a production line around you, which is worth far more to us than a few hundred dollars an oven.' },
        { id: 'lead', name: 'Delivery lead time', opts: ['4 weeks', '6 weeks', '8 weeks', '10 weeks'], you: [2000, 1500, 750, 0], them: [0, 250, 450, 600],
          why: 'Faster delivery means holding some stock for you, which costs us a little, but it is manageable once we know your volumes.' },
        { id: 'warranty', name: 'Warranty', opts: ['1 year', '2 years', '3 years', '4 years'], you: [0, 600, 1200, 1800], them: [1200, 800, 400, 0],
          why: 'Longer warranties tie up service capacity and we have to provision for them on our books.' },
        { id: 'payment', name: 'Payment terms', opts: ['Net 30', 'Net 45', 'Net 60', 'Net 90'], you: [0, 400, 800, 1600], them: [2000, 1500, 1000, 0],
          why: 'We are financing a new plant. Getting paid quickly matters a great deal to our cash flow.' },
        { id: 'exclusive', name: 'Exclusivity', opts: ['None', 'Exclusive for new restaurants', 'Exclusive for all restaurants'], you: [1000, 500, 0], them: [0, 700, 1400],
          why: 'Being your only oven supplier would make you a reference customer for us, and that helps us win other chains.' },
        { id: 'escalator', name: 'Price adjustment', opts: ['Fixed for 3 years', 'Indexed to inflation', 'Renegotiated each year'], you: [900, 450, 0], them: [0, 450, 900],
          why: 'Steel prices have been volatile. A fixed price for three years is a real risk for us.' }
      ],
      opening: 'Priya, good to see you. Your chefs loved the trial ovens. We would like to make this work. Where would you like to start?',
      alternatives: { truth: 'We have other groups interested in that production capacity, but none as large as you.', bluff: 'Frankly, our order book for next year is nearly full. We do not need to discount to fill it.' }
    },
    license: {
      id: 'license', title: 'Licensing Deal', area: 'Biotech licensing', unit: '$M of value', unitShort: '$M', rounds: 6,
      you: 'Dr. Lena Okafor, chief executive of Helix Bio', them: 'Richard Hale, head of business development at Meridian Pharma', themShort: 'Richard', firm: 'Meridian Pharma',
      setting: 'Helix Bio, a 40-person biotech, owns HX-27, a compound that looks promising against a hard-to-treat cancer. Meridian Pharma wants to license it to run the late-stage trials and sell it worldwide.',
      brief: 'Your board will back you if the deal is worth more than going it alone: raising another venture round and running the trials yourselves. Values are your estimate of each term’s worth to Helix, in millions of dollars, risk-adjusted. Meridian runs its own numbers.',
      batnaText: 'Raising a new venture round and developing HX-27 alone, worth $30M to Helix.',
      batna: { you: 30, them: 34 },
      themBatnaText: 'Licensing a rival compound from another biotech.',
      style: { beta: 0.65, trust0: 45, openness: 0.4, bluff: 0.7, lambda: 0.25 },
      issues: [
        { id: 'upfront', name: 'Upfront payment', opts: ['$5M', '$10M', '$15M', '$20M', '$25M'], you: [0, 6, 12, 18, 24], them: [24, 18, 12, 6, 0],
          why: 'Upfront cash is the hardest thing to get approved. It is money spent before we know whether the drug works.' },
        { id: 'royalty', name: 'Royalty on sales', opts: ['4%', '6%', '8%', '10%', '12%'], you: [0, 8, 16, 24, 32], them: [40, 30, 20, 10, 0],
          why: 'Our forecasts for this drug are bigger than yours, I suspect. Every point of royalty is worth a lot to us over the life of the product.' },
        { id: 'milestones', name: 'Milestone payments', opts: ['$20M', '$40M', '$60M', '$80M'], you: [0, 6, 12, 18], them: [9, 6, 3, 0],
          why: 'Milestones are only paid if the drug succeeds, so we can be more flexible there. If it works, we will be glad to pay.' },
        { id: 'territory', name: 'Territory', opts: ['Worldwide', 'US and Europe', 'US only'], you: [0, 5, 10], them: [15, 8, 0],
          why: 'We need worldwide rights to justify building a global launch. A partial territory changes our economics a lot.' },
        { id: 'field', name: 'Field of use', opts: ['All indications', 'Oncology only'], you: [0, 12], them: [5, 0],
          why: 'Other indications are a long way off for us. Oncology is what we are paying for.' },
        { id: 'diligence', name: 'Development commitment', opts: ['Best efforts', 'Agreed trial plan', 'Trial plan with penalties'], you: [0, 8, 14], them: [10, 6, 0],
          why: 'Penalties make our lawyers nervous. We do intend to develop the drug fast.' },
        { id: 'committee', name: 'Governance', opts: ['No role for Helix', 'Observer seat', 'Joint steering committee'], you: [0, 3, 6], them: [0, 2, 4],
          why: 'Honestly, your team knows this molecule better than anyone. We would want your scientists involved.' }
      ],
      opening: 'Lena, thanks for coming. We think HX-27 could be important, and Meridian is the right partner to take it worldwide. Let’s see if we can find terms.',
      alternatives: { truth: 'There are other compounds we are looking at, though none quite as far along as yours.', bluff: 'We are in late talks on two other compounds in this space. We will license one of them if this does not work.' }
    }
  };

  /* ---------- Package space ---------- */
  const CACHE = {};
  function space(cid) {
    if (CACHE[cid]) return CACHE[cid];
    const K = CASES[cid], sizes = K.issues.map(i => i.opts.length), n = sizes.reduce((a, b) => a * b, 1);
    const you = new Float64Array(n), them = new Float64Array(n), digits = [];
    const cur = sizes.map(() => 0);
    for (let k = 0; k < n; k++) {
      let y = 0, t = 0;
      for (let j = 0; j < sizes.length; j++) { y += K.issues[j].you[cur[j]]; t += K.issues[j].them[cur[j]]; }
      you[k] = y; them[k] = t;
      for (let j = sizes.length - 1; j >= 0; j--) { cur[j]++; if (cur[j] < sizes[j]) break; cur[j] = 0; }
    }
    void digits;
    const decode = k => { const out = new Array(sizes.length); for (let j = sizes.length - 1; j >= 0; j--) { out[j] = k % sizes[j]; k = Math.floor(k / sizes[j]); } return out; };
    const encode = p => p.reduce((k, v, j) => k * sizes[j] + v, 0);
    // Pareto frontier
    const idx = Array.from({ length: n }, (_, k) => k).sort((a, b) => you[b] - you[a] || them[b] - them[a]);
    const front = []; let best = -Infinity;
    idx.forEach(k => { if (them[k] > best) { front.push(k); best = them[k]; } });
    let maxYou = -Infinity, maxThem = -Infinity; for (let k = 0; k < n; k++) { if (you[k] > maxYou) maxYou = you[k]; if (them[k] > maxThem) maxThem = them[k]; }
    let maxJoint = -Infinity, jointK = 0;
    for (let k = 0; k < n; k++) if (you[k] >= K.batna.you && them[k] >= K.batna.them && you[k] + them[k] > maxJoint) { maxJoint = you[k] + them[k]; jointK = k; }
    let bestYouFeasible = 0; for (let k = 0; k < n; k++) if (them[k] >= K.batna.them && you[k] > bestYouFeasible) bestYouFeasible = you[k];
    let bestThemFeasible = 0; for (let k = 0; k < n; k++) if (you[k] >= K.batna.you && them[k] > bestThemFeasible) bestThemFeasible = them[k];
    CACHE[cid] = { n, sizes, you, them, decode, encode, front, maxYou, maxThem, maxJoint, jointK, bestYouFeasible, bestThemFeasible };
    return CACHE[cid];
  }
  const ptsYou = (K, p) => sum(K.issues.map((is, j) => is.you[p[j]]));
  const ptsThem = (K, p) => sum(K.issues.map((is, j) => is.them[p[j]]));
  const rangeOf = (arr) => Math.max(...arr) - Math.min(...arr);
  function issueType(is) {
    const a = is.you, b = is.them, sameDir = (a[a.length - 1] - a[0]) * (b[b.length - 1] - b[0]) > 0;
    if (sameDir) return 'compatible';
    const ra = rangeOf(a), rb = rangeOf(b);
    return Math.abs(ra - rb) / Math.max(ra, rb) < 0.2 ? 'distributive' : 'integrative';
  }
  const prioritiesThem = K => K.issues.map((is, j) => ({ j, w: rangeOf(is.them) })).sort((a, b) => b.w - a.w);
  const prioritiesYou = K => K.issues.map((is, j) => ({ j, w: rangeOf(is.you) })).sort((a, b) => b.w - a.w);

  /* ---------- Game ---------- */
  function create(seed, config) {
    const cfg = config || {};
    const cid = CASES[cfg.case] ? cfg.case : 'offer', K = CASES[cid];
    const r = RNG.make(seed);
    const g = { v: 1, seed, cid, cfg: { case: cid, difficulty: (['guided', 'standard', 'expert'].indexOf(cfg.difficulty) >= 0 ? cfg.difficulty : 'guided') }, rng: r, round: 1, rounds: K.rounds, done: false, outcome: null,
      trust: K.style.trust0, log: [], offersYou: [], offersThem: [], belief: K.issues.map(() => 1), told: [], asked: { prio: 0, why: [], alt: 0 }, talkThisRound: 0, plan: null, lastThem: null, conceded: 0,
      jitter: 0.96 + 0.08 * RNG.next(r), draft: null };
    g.log.push({ who: 'them', kind: 'say', text: K.opening, r: 0 });
    // their initial ideal and aspiration path
    const Sp = space(cid);
    g.res = K.batna.them * (1.02 + 0.03 * RNG.next(r));
    g.ideal = Sp.maxThem;
    g.draft = defaultDraft(g);
    return g;
  }
  const caseOf = g => CASES[g.cid];
  function defaultDraft(g) {
    const K = caseOf(g);
    const best = K.issues.map(is => is.you.indexOf(Math.max(...is.you)));
    return { offer: g.offersYou.length ? g.offersYou[g.offersYou.length - 1].p.slice() : best, meso: [], plan: g.plan ? clone(g.plan) : { target: null, reservation: null, guesses: K.issues.map(() => ({ dir: '', imp: '' })) }, issue: 0 };
  }
  /* The counterpart's aspiration: from its ideal down to its reservation, faster for conceders, sped up by your concessions. */
  /* Reciprocity: how much you have moved toward them, relative to how much they have moved toward you (in their own points). */
  function reciprocity(g) {
    const K = caseOf(g);
    if (!g.offersYou.length) return 0;
    const first = g.offersYou[0].them, bestYou = Math.max(...g.offersYou.map(o => o.them));
    const userConc = Math.max(0, bestYou - first);
    const aiConc = g.offersThem.length ? Math.max(0, g.offersThem[0].them - g.offersThem[g.offersThem.length - 1].them) : 0;
    const scale = Math.max(1, g.ideal - g.res) * 0.08;
    void K;
    return clamp((userConc + scale) / (aiConc + scale), 0, 2);
  }
  function aspiration(g, round) {
    const K = caseOf(g), s = K.style, R = g.rounds;
    const base = (round - 1) / (R - 1), rec = reciprocity(g);
    const factor = 0.5 + 0.5 * Math.min(1, rec);
    const tt = clamp(base * factor + 0.15 * g.conceded, 0, 1);
    const trustF = 0.85 + 0.3 * (g.trust / 100);
    const frac = Math.pow(tt, 1 / (s.beta * trustF));
    const top = g.ideal * 0.93 * g.jitter;
    const a = Math.max(g.res, top - (top - g.res) * frac);
    return g.aspFloor != null ? Math.min(a, g.aspFloor) : a;
  }
  const PRE = {};
  function pre(K) {
    if (PRE[K.id]) return PRE[K.id];
    PRE[K.id] = { mn: K.issues.map(is => Math.min(...is.you)), rg: K.issues.map(is => rangeOf(is.you) || 1), span: K.issues.map(is => Math.max(1, is.opts.length - 1)) };
    return PRE[K.id];
  }
  function estYou(g, p) { const K = caseOf(g), P = pre(K); let v = 0; for (let j = 0; j < p.length; j++) v += g.belief[j] * (K.issues[j].you[p[j]] - P.mn[j]) / P.rg[j]; return v; }
  function dist(K, a, b) { const P = pre(K); let v = 0; for (let j = 0; j < a.length; j++) v += Math.abs(a[j] - b[j]) / P.span[j]; return v; }
  function counter(g, anchor) {
    const K = caseOf(g), Sp = space(g.cid), asp = aspiration(g, g.round), prev = g.lastThem;
    const integr = g.trust >= 45;
    let best = null, bestV = -Infinity;
    const p = new Array(K.issues.length).fill(0), sizes = Sp.sizes;
    for (let k = 0; k < Sp.n; k++) {
      if (k > 0) for (let j = sizes.length - 1; j >= 0; j--) { p[j]++; if (p[j] < sizes[j]) break; p[j] = 0; }
      if (Sp.them[k] < asp) continue;
      const ey = integr ? estYou(g, p) : -dist(K, p, anchor);
      const v = ey - K.style.lambda * (prev ? dist(K, p, prev) : 0) - 0.15 * dist(K, p, anchor) - 0.00002 * (Sp.them[k] - asp);
      if (v > bestV) { bestV = v; best = p.slice(); }
    }
    return best || Sp.decode(Sp.front[Sp.front.length - 1]);
  }
  /* Learn your priorities from what you keep and what you give. */
  function learn(g, p) {
    const K = caseOf(g);
    K.issues.forEach((is, j) => {
      const r = rangeOf(is.you) || 1, kept = (is.you[p[j]] - Math.min(...is.you)) / r;
      g.belief[j] = clamp(0.75 * g.belief[j] + 0.5 * kept, 0.15, 3);
    });
  }
  function say(g, text, extra) { g.log.push(Object.assign({ who: 'them', kind: 'say', text, r: g.round }, extra || {})); }
  function reactTo(g, p, prevYou) {
    const K = caseOf(g), msgs = [];
    const worst = K.issues.map((is, j) => ({ j, loss: Math.max(...is.them) - is.them[p[j]] })).sort((a, b) => b.loss - a.loss)[0];
    const gap = aspiration(g, g.round) - ptsThem(K, p), scale = Math.max(1, g.ideal - g.res);
    if (gap > 0.5 * scale) msgs.push('That is a long way from anything we could sign.');
    else if (gap > 0.2 * scale) msgs.push('We are still some distance apart.');
    else msgs.push('We are getting close.');
    if (worst && worst.loss > 0.15 * scale) msgs.push(`${K.issues[worst.j].name} at ${K.issues[worst.j].opts[p[worst.j]]} is very hard for us.`);
    if (prevYou) {
      const moved = K.issues.map((is, j) => ({ j, d: is.them[p[j]] - is.them[prevYou[j]] })).filter(x => x.d > 0).sort((a, b) => b.d - a.d);
      if (moved.length) msgs.push(`Thank you for moving on ${K.issues[moved[0].j].name.toLowerCase()}.`);
    }
    return msgs.join(' ');
  }
  function offer(g, packages) {
    const K = caseOf(g), Sp = space(g.cid);
    const list = packages.filter(p => Array.isArray(p) && p.length === K.issues.length).map(p => p.map((v, j) => clamp(Math.round(+v || 0), 0, K.issues[j].opts.length - 1)));
    if (!list.length) return;
    const meso = list.length > 1;
    const prevYou = g.offersYou.length ? g.offersYou[g.offersYou.length - 1].p : null;
    // which package do they like best
    const scored = list.map(p => ({ p, t: ptsThem(K, p), y: ptsYou(K, p) })).sort((a, b) => b.t - a.t);
    const pick = scored[0].p;
    g.log.push({ who: 'you', kind: meso ? 'meso' : 'offer', pkgs: list, r: g.round });
    // trust and concessions
    if (prevYou) {
      const dT = ptsThem(K, pick) - ptsThem(K, prevYou), span = Math.max(1, g.ideal - g.res);
      if (dT > 0.03 * span) { g.conceded = Math.min(2, g.conceded + clamp(dT / span, 0, 0.6)); g.trust = clamp(g.trust + 3, 0, 100); }
      else if (dT < -0.02 * g.ideal) { g.trust = clamp(g.trust - 10, 0, 100); }
      else if (!meso) { g.trust = clamp(g.trust - 4, 0, 100); g.stalls = (g.stalls || 0) + 1; }
    } else {
      const first = ptsThem(K, pick);
      if (first < g.res * 0.55) { g.trust = clamp(g.trust - 12, 0, 100); }
    }
    if (meso) { g.trust = clamp(g.trust + 4, 0, 100); list.forEach(p => learn(g, p)); } else learn(g, pick);
    g.offersYou.push({ r: g.round, p: pick, all: list, you: ptsYou(K, pick), them: ptsThem(K, pick) });
    if (g.final) {
      if (g.lastThem && ptsThem(K, pick) >= ptsThem(K, g.lastThem) - 1e-9) { g.done = true; g.outcome = { deal: true, p: pick, by: 'you', r: g.round }; say(g, 'That works for us. We have a deal.'); }
      else { g.done = true; g.outcome = { deal: false, by: 'them', r: g.round }; say(g, 'We told you that was our final offer. We will go with our other option.'); }
      return;
    }
    const asp = aspiration(g, g.round);
    const last = g.round >= g.rounds;
    // accept if it meets their current aspiration or is at least as good for them as their own last proposal
    if (ptsThem(K, pick) >= asp || (g.lastThem && ptsThem(K, pick) >= ptsThem(K, g.lastThem) - 1e-9)) {
      g.done = true; g.outcome = { deal: true, p: pick, by: 'you', r: g.round };
      say(g, meso ? `Of your options, the ${['first', 'second', 'third'][list.indexOf(pick)]} works for us. We have a deal.` : 'That works for us. We have a deal.');
      return;
    }
    if (g.trust < 12) {
      g.done = true; g.outcome = { deal: false, by: 'them', r: g.round };
      say(g, 'I do not think we are negotiating in good faith any more. We will go with our other option. Thank you for your time.');
      return;
    }
    const c = counter(g, pick);
    g.lastThem = c;
    g.aspFloor = ptsThem(K, c);
    g.offersThem.push({ r: g.round, p: c, you: ptsYou(K, c), them: ptsThem(K, c) });
    const text = (meso ? `Thank you for giving us options; that helps us understand what matters to you. We prefer the ${['first', 'second', 'third'][list.indexOf(pick)]}. ` : '') + reactTo(g, pick, prevYou) + (last ? ' This is our final offer. If you cannot accept it, we will take our other option.' : ' Here is what we could do.');
    say(g, text, { kind: 'counter', p: c });
    if (last) { g.final = true; }
    g.round++;
    g.talkThisRound = 0;
  }
  function accept(g) {
    if (g.done || !g.lastThem) return;
    g.log.push({ who: 'you', kind: 'accept', text: 'We accept your offer.', r: g.round });
    g.done = true; g.outcome = { deal: true, p: g.lastThem.slice(), by: 'them', r: g.round };
    say(g, 'Excellent. We have a deal. I will send the paperwork today.');
  }
  function walk(g) {
    if (g.done) return;
    g.log.push({ who: 'you', kind: 'walk', text: 'I don’t think we can reach an agreement. We will take our other option.', r: g.round });
    g.done = true; g.outcome = { deal: false, by: 'you', r: g.round };
    say(g, 'I am sorry to hear that. The door stays open if things change.');
  }
  function talk(g, kind, j) {
    const K = caseOf(g), r = g.rng;
    if (g.done || g.talkThisRound >= 2) return;
    g.talkThisRound++;
    const pr = prioritiesThem(K);
    if (kind === 'prio') {
      g.log.push({ who: 'you', kind: 'ask', text: 'What matters most to you in this agreement?', r: g.round });
      g.asked.prio++;
      const open = g.trust / 100 * K.style.openness + 0.25 > RNG.next(r);
      const top = pr.slice(0, 2).map(x => K.issues[x.j].name.toLowerCase()), low = K.issues[pr[pr.length - 1].j].name.toLowerCase();
      if (open) { say(g, `Honestly, ${top[0]} and ${top[1]} matter most to us. We are more relaxed about ${low}.`, { reveal: pr.slice(0, 2).map(x => x.j).concat([pr[pr.length - 1].j]) }); g.trust = clamp(g.trust + 2, 0, 100); }
      else say(g, `Everything matters, of course. ${K.issues[pr[0].j].name} is important to us, as you can imagine.`, { reveal: [pr[0].j] });
    } else if (kind === 'why') {
      const is = K.issues[clamp(j, 0, K.issues.length - 1)];
      g.log.push({ who: 'you', kind: 'ask', text: `Can you help me understand what is behind your position on ${is.name.toLowerCase()}?`, r: g.round });
      g.asked.why.push(j);
      const open = g.trust / 100 * K.style.openness + 0.35 > RNG.next(r);
      if (open) { say(g, is.why, { reveal: [j] }); g.trust = clamp(g.trust + 2, 0, 100); }
      else say(g, `It is simply an important point for us. I would rather talk about the whole package.`);
    } else if (kind === 'alt') {
      g.log.push({ who: 'you', kind: 'ask', text: 'What happens on your side if we cannot agree?', r: g.round });
      g.asked.alt++;
      const bluff = RNG.next(r) < K.style.bluff * (1.2 - g.trust / 100);
      say(g, bluff ? K.alternatives.bluff : K.alternatives.truth, { bluff });
      if (bluff) g.bluffed = true;
    } else if (kind === 'share') {
      const is = K.issues[clamp(j, 0, K.issues.length - 1)];
      g.log.push({ who: 'you', kind: 'share', text: `For us, ${is.name.toLowerCase()} is the term that matters most.`, r: g.round });
      g.told.push(j);
      g.belief[j] = clamp(g.belief[j] + 1.2, 0.15, 3.5);
      g.trust = clamp(g.trust + 5, 0, 100);
      const recip = g.trust / 100 * K.style.openness + 0.2 > RNG.next(r);
      if (recip) { const x = pr.find(q => q.j !== j) || pr[0]; say(g, `That is helpful, thank you. In the same spirit: ${K.issues[x.j].name.toLowerCase()} is a big one for us.`, { reveal: [x.j] }); }
      else say(g, 'Noted. We will keep that in mind.');
    }
  }
  function apply(g, d) {
    if (g.done) return;
    const dec = d || {};
    if (dec.plan && !g.plan) g.plan = clone(dec.plan);
    if (dec.kind === 'offer') offer(g, [dec.offer]);
    else if (dec.kind === 'meso') offer(g, dec.pkgs || []);
    else if (dec.kind === 'accept') accept(g);
    else if (dec.kind === 'walk') walk(g);
    else if (dec.kind === 'talk') talk(g, dec.talk, +dec.issue || 0);
    g.draft = g.done ? null : defaultDraft(g);
    if (g.draft && dec.keep) {
      const K = caseOf(g), ok = p => Array.isArray(p) && p.length === K.issues.length;
      if (ok(dec.keep.offer)) g.draft.offer = dec.keep.offer.slice();
      if (Array.isArray(dec.keep.meso)) g.draft.meso = dec.keep.meso.filter(ok).slice(0, 3);
      if (dec.keep.plan && !g.plan) g.draft.plan = clone(dec.keep.plan);
      if (dec.keep.issue != null) g.draft.issue = clamp(+dec.keep.issue || 0, 0, K.issues.length - 1);
    }
  }
  const isDone = g => g.done;

  /* ---------- Results and scoring ---------- */
  function result(g) {
    const K = caseOf(g), Sp = space(g.cid);
    const o = g.outcome || { deal: false };
    const you = o.deal ? ptsYou(K, o.p) : K.batna.you, them = o.deal ? ptsThem(K, o.p) : K.batna.them;
    const zLo = K.batna.you + K.batna.them;
    const eff = clamp((you + them - zLo) / Math.max(1, Sp.maxJoint - zLo), 0, 1);
    const share = clamp((you - K.batna.you) / Math.max(1, Sp.bestYouFeasible - K.batna.you), 0, 1);
    // distance to the frontier: the most extra value you could have had without the counterpart losing
    let better = 0; for (const k of Sp.front) if (Sp.them[k] >= them - 1e-9) better = Math.max(better, Sp.you[k] - you);
    return { deal: !!o.deal, you, them, joint: you + them, eff, share, leftOnTable: Math.max(0, better), maxJoint: Sp.maxJoint, by: o.by };
  }
  function prepScore(g) {
    const K = caseOf(g), P = g.plan; if (!P || !P.guesses) return { score: 0, dirOk: 0, impOk: 0, n: K.issues.length, done: false };
    const pr = prioritiesThem(K), rankOf = {}; pr.forEach((x, k) => { rankOf[x.j] = k; });
    let dirOk = 0, impOk = 0, answered = 0;
    K.issues.forEach((is, j) => {
      const G = P.guesses[j] || {}; if (G.dir || G.imp) answered++;
      const type = issueType(is), dir = type === 'compatible' ? 'same' : 'opposed';
      if (G.dir === dir) dirOk++;
      const level = rankOf[j] < 2 ? 'high' : rankOf[j] >= K.issues.length - 2 ? 'low' : 'medium';
      if (G.imp === level) impOk++;
    });
    let resOk = 0; if (P.reservation != null && isFinite(+P.reservation)) { const rv = +P.reservation; resOk = rv >= K.batna.you * 0.98 && rv <= K.batna.you * 1.25 ? 1 : rv >= K.batna.you * 0.9 ? 0.5 : 0; }
    const n = K.issues.length;
    return { score: clamp((dirOk / n) * 0.45 + (impOk / n) * 0.35 + resOk * 0.2, 0, 1), dirOk, impOk, resOk, n, done: answered > 0 };
  }
  function score(g) {
    const R = result(g), P = prepScore(g);
    const rel = clamp(g.trust, 0, 100) / 100;
    const total = Math.round(100 * (0.40 * R.share + 0.30 * R.eff + 0.20 * rel + 0.10 * P.score));
    return { total: clamp(total, 0, 100), R, P, rel };
  }
  function scatter(cid, n) {
    const Sp = space(cid), r = RNG.make(7), pts = [];
    const m = Math.min(n || 900, Sp.n);
    for (let k = 0; k < m; k++) { const i = Sp.n <= m ? k : Math.floor(RNG.next(r) * Sp.n); pts.push([Sp.you[i], Sp.them[i]]); }
    return { pts, front: Sp.front.map(k => [Sp.you[k], Sp.them[k]]) };
  }

  const api = { CASES, create, apply, isDone, space, ptsYou, ptsThem, issueType, prioritiesThem, prioritiesYou, aspiration, result, score, prepScore, scatter, caseOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DealRoomEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
