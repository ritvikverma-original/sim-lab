/* RoleQuest MBA — content bank: functions, roles, capability taxonomy, item bank, industries.
   Every item is forced choice between two things a person could plausibly want. Each side carries a small
   weight vector over function ids plus a construct tag, so the psychometric layers stay separable in the
   report instead of collapsing into one score. Market figures are a dated reference set, not a live feed. */
(function () {
  'use strict';

  /* Capability clusters. The evidence ledger and every role demand vector speak this language. */
  const CAPS = [
    { id: 'strat', name: 'Strategy & problem framing', hint: 'Market entry, portfolio choices, diagnosing a messy problem before solving it.' },
    { id: 'comm', name: 'Commercial & revenue', hint: 'Pricing, mix, revenue growth management, key accounts, channel economics.' },
    { id: 'mktg', name: 'Marketing & category', hint: 'Brand, segmentation, positioning, consumer insight, innovation funnels.' },
    { id: 'fin', name: 'Finance & capital', hint: 'P&L ownership, FP&A, valuation, working capital, investment cases.' },
    { id: 'ops', name: 'Operations & supply chain', hint: 'S&OP, sourcing, network design, inventory, service levels, process excellence.' },
    { id: 'prod', name: 'Product & digital', hint: 'Roadmaps, user research, product ops, digital transformation, AI use cases.' },
    { id: 'anl', name: 'Analytics & modelling', hint: 'Forecasting, experimentation, BI, data storytelling, decision science.' },
    { id: 'ppl', name: 'People & leadership', hint: 'Managing managers, hiring, coaching, organisation design, change.' },
    { id: 'exec', name: 'Execution & systems', hint: 'Programme management, operating cadence, CRM and ERP, governance, workflow.' }
  ];

  /* The twelve function families. riasec is the dominant interest pair; demand is the capability profile a
     typical role in the family asks for, 0 to 5. market is the dated opportunity layer. */
  const FUNCTIONS = [
    { id: 'strategy', name: 'Strategy & Consulting', short: 'Strategy', riasec: 'IE',
      blurb: 'Framing the question before the answer. Lives in ambiguity, works through analysis and persuasion.',
      demand: { strat: 5, fin: 3, anl: 3, comm: 2, mktg: 2, ops: 2, prod: 2, ppl: 2, exec: 3 },
      market: { demand: 72, availability: 58, friction: 45 } },
    { id: 'cerev', name: 'Commercial Excellence / RGM', short: 'Commercial Excellence',
      riasec: 'EC', blurb: 'The operating system behind revenue: pricing, mix, sales productivity and the data under them.',
      demand: { comm: 5, anl: 4, exec: 4, strat: 3, fin: 3, mktg: 2, prod: 2, ops: 2, ppl: 2 },
      market: { demand: 80, availability: 62, friction: 38 } },
    { id: 'sales', name: 'Sales & Business Development', short: 'Sales & BD', riasec: 'ES',
      blurb: 'Carrying a number through relationships. Negotiation, pipeline and the discipline of the close.',
      demand: { comm: 5, ppl: 4, exec: 3, strat: 2, mktg: 3, fin: 2, anl: 2, ops: 2, prod: 1 },
      market: { demand: 74, availability: 78, friction: 25 } },
    { id: 'marketing', name: 'Marketing & Category', short: 'Marketing', riasec: 'AE',
      blurb: 'Deciding what the brand means and which consumer problem is worth owning.',
      demand: { mktg: 5, strat: 3, anl: 3, comm: 3, prod: 3, fin: 2, ppl: 2, exec: 2, ops: 1 },
      market: { demand: 66, availability: 70, friction: 32 } },
    { id: 'finance', name: 'Finance', short: 'Finance', riasec: 'CI',
      blurb: 'Where the numbers are the argument. Planning, capital allocation and the honest version of the story.',
      demand: { fin: 5, anl: 4, strat: 3, exec: 3, comm: 2, ops: 2, ppl: 2, mktg: 1, prod: 1 },
      market: { demand: 70, availability: 66, friction: 35 } },
    { id: 'opssc', name: 'Operations & Supply Chain', short: 'Operations', riasec: 'RC',
      blurb: 'Making the physical and procedural world behave. Flow, cost, service and the trade-offs between them.',
      demand: { ops: 5, exec: 4, anl: 3, fin: 3, strat: 2, comm: 2, ppl: 3, prod: 1, mktg: 1 },
      market: { demand: 71, availability: 68, friction: 34 } },
    { id: 'product', name: 'Product', short: 'Product', riasec: 'IA',
      blurb: 'Owning what gets built and why. Sits between users, engineers and the commercial case.',
      demand: { prod: 5, strat: 3, anl: 4, mktg: 3, exec: 3, ppl: 2, comm: 2, fin: 2, ops: 1 },
      market: { demand: 76, availability: 55, friction: 48 } },
    { id: 'analytics', name: 'Analytics & BI', short: 'Analytics', riasec: 'IC',
      blurb: 'Turning data into decisions people actually make. Models, experiments and the argument around them.',
      demand: { anl: 5, prod: 3, strat: 3, fin: 3, exec: 3, comm: 3, ops: 2, mktg: 2, ppl: 1 },
      market: { demand: 82, availability: 60, friction: 40 } },
    { id: 'people', name: 'HR & Organisation', short: 'HR & Org', riasec: 'SE',
      blurb: 'Designing how the company works through people. Talent, structure, capability and change.',
      demand: { ppl: 5, strat: 3, exec: 3, anl: 2, fin: 2, comm: 1, mktg: 1, ops: 2, prod: 1 },
      market: { demand: 58, availability: 72, friction: 30 } },
    { id: 'gm', name: 'General Management', short: 'General Management', riasec: 'EC',
      blurb: 'Owning a whole P&L and every trade-off inside it. Breadth rewarded more than any single depth.',
      demand: { strat: 4, comm: 4, fin: 4, ppl: 4, ops: 3, exec: 4, mktg: 3, anl: 3, prod: 2 },
      market: { demand: 64, availability: 40, friction: 62 } },
    { id: 'venture', name: 'Entrepreneurship & Venture', short: 'Entrepreneurship', riasec: 'EA',
      blurb: 'Building the thing itself, or the venture arm that funds it. High variance, high ownership.',
      demand: { strat: 4, comm: 4, prod: 4, fin: 3, mktg: 3, exec: 3, ppl: 3, anl: 3, ops: 2 },
      market: { demand: 55, availability: 85, friction: 70 } },
    { id: 'digital', name: 'Digital Transformation & AI', short: 'Digital & AI', riasec: 'IE',
      blurb: 'Changing how the business runs using technology, which is mostly a change problem wearing a tech coat.',
      demand: { prod: 4, exec: 5, strat: 4, anl: 4, ppl: 3, ops: 3, comm: 2, fin: 2, mktg: 2 },
      market: { demand: 85, availability: 52, friction: 50 } }
  ];

  /* Roles. band is [minYears, maxYears] of total experience the title usually assumes.
     watch is the honest caution a careers adviser would add. */
  const ROLES = [
    { id: 'r-cs', fn: 'strategy', title: 'Corporate Strategy Manager', band: [3, 9], cap: { strat: 5, fin: 4, anl: 4, exec: 3, comm: 2 }, watch: 'Small teams, few seats, and the work is only as good as the sponsor.' },
    { id: 'r-mc', fn: 'strategy', title: 'Management Consultant', band: [0, 9], cap: { strat: 5, anl: 4, ppl: 3, fin: 3, exec: 3 }, watch: 'Entry is structured and competitive; the lifestyle cost is real and front-loaded.' },
    { id: 'r-td', fn: 'strategy', title: 'Transformation Director', band: [10, 20], cap: { strat: 5, exec: 5, ppl: 4, fin: 4, ops: 3 }, watch: 'Needs a track record of landing change, not just designing it.' },
    { id: 'r-cos', fn: 'strategy', title: 'Chief of Staff', band: [5, 12], cap: { strat: 4, exec: 4, ppl: 4, comm: 3, fin: 3 }, watch: 'Highly leader-dependent; the role dissolves when the principal moves.' },
    { id: 'r-rgm', fn: 'cerev', title: 'Revenue Growth Management Lead', band: [4, 12], cap: { comm: 5, anl: 5, fin: 4, strat: 3, exec: 3 }, watch: 'Expect to prove pricing or mix work with a number attached.' },
    { id: 'r-ced', fn: 'cerev', title: 'Commercial Excellence Director', band: [8, 16], cap: { comm: 5, exec: 5, anl: 4, ppl: 4, strat: 4 }, watch: 'Needs both field credibility and systems fluency; candidates usually have one.' },
    { id: 'r-pri', fn: 'cerev', title: 'Pricing Manager', band: [3, 9], cap: { comm: 5, anl: 5, fin: 4, strat: 3, exec: 2 }, watch: 'Deep but narrow; plan the broadening move early.' },
    { id: 'r-rops', fn: 'cerev', title: 'Revenue Operations Manager', band: [3, 10], cap: { exec: 5, comm: 4, anl: 4, prod: 3, strat: 2 }, watch: 'Can drift into tool administration without a commercial mandate.' },
    { id: 'r-ka', fn: 'sales', title: 'Key Account Manager', band: [2, 9], cap: { comm: 5, ppl: 4, exec: 3, mktg: 2, fin: 2 }, watch: 'Portable only if the relationships were institutional, not personal.' },
    { id: 'r-sd', fn: 'sales', title: 'Sales Director', band: [9, 18], cap: { comm: 5, ppl: 5, exec: 4, strat: 3, fin: 3 }, watch: 'Carrying a number for a team is a different job from carrying your own.' },
    { id: 'r-bd', fn: 'sales', title: 'Business Development Lead', band: [3, 12], cap: { comm: 5, strat: 4, mktg: 3, ppl: 3, fin: 3 }, watch: 'Rewards tolerance for a long, uncertain cycle.' },
    { id: 'r-bm', fn: 'marketing', title: 'Brand Manager', band: [2, 8], cap: { mktg: 5, strat: 3, anl: 3, comm: 3, fin: 2 }, watch: 'FMCG entry usually assumes a prior brand or category stint.' },
    { id: 'r-cl', fn: 'marketing', title: 'Category Lead', band: [5, 12], cap: { mktg: 5, comm: 4, anl: 4, strat: 4, fin: 3 }, watch: 'Needs retailer or channel fluency as much as brand craft.' },
    { id: 'r-gm2', fn: 'marketing', title: 'Growth Marketing Manager', band: [2, 9], cap: { mktg: 5, anl: 5, prod: 3, comm: 3, exec: 2 }, watch: 'Performance-heavy; the craft shifts quickly with platforms.' },
    { id: 'r-ins', fn: 'marketing', title: 'Consumer Insight Manager', band: [3, 10], cap: { mktg: 5, anl: 4, strat: 3, prod: 2, comm: 2 }, watch: 'Influence without authority; proximity to the decision varies hugely.' },
    { id: 'r-fpa', fn: 'finance', title: 'FP&A Manager', band: [3, 10], cap: { fin: 5, anl: 5, exec: 3, strat: 3, comm: 2 }, watch: 'The modelling is table stakes; the differentiator is business partnering.' },
    { id: 'r-cfin', fn: 'finance', title: 'Commercial Finance Lead', band: [4, 12], cap: { fin: 5, comm: 4, anl: 4, strat: 3, exec: 3 }, watch: 'Sits between finance and sales and is trusted by neither by default.' },
    { id: 'r-corpf', fn: 'finance', title: 'Corporate Finance / M&A Manager', band: [3, 10], cap: { fin: 5, strat: 4, anl: 5, exec: 3, comm: 2 }, watch: 'Deal experience is hard to acquire sideways.' },
    { id: 'r-scd', fn: 'opssc', title: 'Supply Chain Director', band: [10, 20], cap: { ops: 5, exec: 5, fin: 4, ppl: 4, anl: 4 }, watch: 'Network and S&OP ownership expected, not just functional depth.' },
    { id: 'r-sop', fn: 'opssc', title: 'S&OP / Planning Manager', band: [3, 10], cap: { ops: 5, anl: 5, exec: 4, comm: 3, fin: 3 }, watch: 'The cross-functional convening matters more than the forecast accuracy.' },
    { id: 'r-proc', fn: 'opssc', title: 'Procurement / Sourcing Manager', band: [3, 10], cap: { ops: 5, comm: 4, fin: 4, anl: 3, exec: 3 }, watch: 'Category expertise is valued; general sourcing travels less well.' },
    { id: 'r-opex', fn: 'opssc', title: 'Operations Excellence Lead', band: [4, 12], cap: { ops: 5, exec: 5, anl: 4, ppl: 3, strat: 3 }, watch: 'Needs demonstrated savings, not certification alone.' },
    { id: 'r-pm', fn: 'product', title: 'Product Manager', band: [2, 9], cap: { prod: 5, anl: 4, strat: 3, mktg: 3, exec: 3 }, watch: 'The most competitive pivot in this list; evidence beats interest.' },
    { id: 'r-ppm', fn: 'product', title: 'Platform / Product Lead', band: [7, 15], cap: { prod: 5, strat: 4, exec: 4, anl: 4, ppl: 4 }, watch: 'Usually requires prior shipped ownership at scale.' },
    { id: 'r-pops', fn: 'product', title: 'Product Operations Manager', band: [3, 10], cap: { prod: 4, exec: 5, anl: 4, comm: 2, ppl: 2 }, watch: 'Newer title; scope varies wildly between companies.' },
    { id: 'r-ba', fn: 'analytics', title: 'Business Analytics Manager', band: [3, 10], cap: { anl: 5, strat: 3, comm: 3, fin: 3, prod: 3 }, watch: 'Tooling fluency assumed; judgement is what gets promoted.' },
    { id: 'r-ds', fn: 'analytics', title: 'Decision Science Lead', band: [5, 13], cap: { anl: 5, prod: 4, strat: 4, exec: 3, ppl: 3 }, watch: 'Expect a technical bar alongside the business one.' },
    { id: 'r-cma', fn: 'analytics', title: 'Commercial Analytics Manager', band: [3, 10], cap: { anl: 5, comm: 5, fin: 3, exec: 3, strat: 3 }, watch: 'Strong adjacency from RGM and commercial finance.' },
    { id: 'r-hrbp', fn: 'people', title: 'HR Business Partner', band: [3, 11], cap: { ppl: 5, strat: 3, exec: 3, anl: 2, fin: 2 }, watch: 'Credibility comes from the business, not the function.' },
    { id: 'r-od', fn: 'people', title: 'Organisation Design / Change Lead', band: [6, 15], cap: { ppl: 5, strat: 4, exec: 4, anl: 3, fin: 2 }, watch: 'Needs evidence of a landed restructure, not a designed one.' },
    { id: 'r-tal', fn: 'people', title: 'Talent & Capability Lead', band: [4, 12], cap: { ppl: 5, exec: 4, strat: 3, anl: 3, mktg: 2 }, watch: 'Budget ownership separates the strategic version from the administrative one.' },
    { id: 'r-buh', fn: 'gm', title: 'Business Unit Head', band: [12, 22], cap: { strat: 5, comm: 5, fin: 5, ppl: 5, ops: 4 }, watch: 'Almost always an internal promotion; plan the path, not the application.' },
    { id: 'r-cgm', fn: 'gm', title: 'Category / Country GM', band: [10, 20], cap: { comm: 5, strat: 4, fin: 5, ppl: 4, mktg: 4 }, watch: 'Breadth with one deep anchor beats uniform breadth.' },
    { id: 'r-rcl', fn: 'gm', title: 'Regional Commercial Leader', band: [9, 18], cap: { comm: 5, ppl: 5, fin: 4, strat: 4, exec: 4 }, watch: 'Field leadership history is usually non-negotiable.' },
    { id: 'r-fnd', fn: 'venture', title: 'Founder / Co-founder', band: [0, 25], cap: { strat: 4, comm: 4, prod: 4, fin: 3, exec: 3 }, watch: 'The only role here where readiness evidence predicts least. Runway and risk appetite dominate.' },
    { id: 'r-vb', fn: 'venture', title: 'Venture Builder / EIR', band: [5, 15], cap: { strat: 5, prod: 4, comm: 4, fin: 4, exec: 3 }, watch: 'Network-led hiring; applications rarely work.' },
    { id: 'r-cvc', fn: 'venture', title: 'Corporate Venture / Investment', band: [4, 12], cap: { fin: 5, strat: 5, anl: 4, comm: 3, prod: 3 }, watch: 'Few seats; prior deal or operating depth expected.' },
    { id: 'r-ais', fn: 'digital', title: 'AI / Digital Strategy Lead', band: [5, 14], cap: { strat: 5, prod: 4, exec: 4, anl: 4, ppl: 3 }, watch: 'Crowded with people claiming it. Shipped use cases separate the field.' },
    { id: 'r-dtl', fn: 'digital', title: 'Digital Transformation Manager', band: [4, 12], cap: { exec: 5, strat: 4, ppl: 4, prod: 3, ops: 3 }, watch: 'Change management is the real job; technology is the occasion.' },
    { id: 'r-wfa', fn: 'digital', title: 'Workflow / Automation Lead', band: [3, 11], cap: { exec: 5, prod: 4, anl: 4, ops: 4, strat: 2 }, watch: 'Strong adjacency from RevOps and operations excellence.' },
    { id: 'r-cai', fn: 'digital', title: 'Commercial AI Lead', band: [5, 13], cap: { anl: 5, comm: 4, prod: 4, strat: 4, exec: 4 }, watch: 'Emerging title; scope and seniority are inconsistent across employers.' }
  ];

  /* Foundation item bank. kind drives which construct layer the item reports into.
     Each side carries function weights; the engine normalises so item count does not bias the result. */
  const ITEMS = [
    /* --- RIASEC: what activity is intrinsically attractive --- */
    { id: 'ri1', kind: 'riasec', c: ['I', 'E'], q: 'Which afternoon would you rather have?', a: { t: 'Pulling apart why a business unit missed its number, with the data in front of you.', w: { strategy: 3, analytics: 3, finance: 2, cerev: 2 } }, b: { t: 'Persuading three sceptical regional heads to back a plan you believe in.', w: { sales: 3, gm: 3, cerev: 2, people: 2 } } },
    { id: 'ri2', kind: 'riasec', c: ['A', 'C'], q: 'Which problem is more satisfying to solve?', a: { t: 'What this brand should stand for, and the idea that makes it land.', w: { marketing: 4, venture: 2, product: 1 } }, b: { t: 'Why the month-end close takes nine days and how to make it four.', w: { finance: 3, opssc: 3, digital: 2, cerev: 1 } } },
    { id: 'ri3', kind: 'riasec', c: ['R', 'S'], q: 'Pick the project you would volunteer for.', a: { t: 'Redesigning the distribution network, warehouse by warehouse.', w: { opssc: 4, digital: 1, analytics: 1 } }, b: { t: 'Rebuilding how the company hires and develops its first-time managers.', w: { people: 4, gm: 1 } } },
    { id: 'ri4', kind: 'riasec', c: ['I', 'S'], q: 'You have a free week. Which do you choose?', a: { t: 'Build a model that forecasts demand better than the one in use.', w: { analytics: 4, finance: 2, opssc: 1 } }, b: { t: 'Coach four people through a problem each of them is stuck on.', w: { people: 4, sales: 1, gm: 1 } } },
    { id: 'ri5', kind: 'riasec', c: ['E', 'C'], q: 'Which risk is easier to live with?', a: { t: 'Owning a target you might miss publicly.', w: { sales: 3, gm: 3, venture: 3, cerev: 1 } }, b: { t: 'Owning a process that must never fail quietly.', w: { opssc: 3, finance: 3, digital: 2 } } },
    { id: 'ri6', kind: 'riasec', c: ['A', 'I'], q: 'Which compliment would you rather receive?', a: { t: '"Nobody had framed it that way before."', w: { marketing: 3, strategy: 3, venture: 2, product: 2 } }, b: { t: '"Your analysis settled the argument."', w: { analytics: 4, finance: 3, strategy: 1 } } },
    { id: 'ri7', kind: 'riasec', c: ['E', 'I'], q: 'A decision is needed and the data is incomplete. You would rather:', a: { t: 'Make the call now and adjust publicly as you learn.', w: { gm: 3, sales: 3, venture: 3 } }, b: { t: 'Buy two more days and reduce the uncertainty first.', w: { analytics: 3, finance: 3, strategy: 2, opssc: 1 } } },
    { id: 'ri8', kind: 'riasec', c: ['S', 'C'], q: 'Which failure would bother you more?', a: { t: 'A capable person left because you managed them badly.', w: { people: 4, gm: 2, sales: 1 } }, b: { t: 'A number you published turned out to be wrong.', w: { finance: 3, analytics: 3, cerev: 2 } } },
    /* --- Work style: broad behavioural tendency --- */
    { id: 'ws1', kind: 'style', c: ['Structure', 'Openness'], q: 'Your natural working week looks more like:', a: { t: 'A planned cadence you defend, with few surprises.', w: { opssc: 3, finance: 3, cerev: 2, digital: 1 } }, b: { t: 'A shifting set of problems you re-prioritise constantly.', w: { venture: 4, strategy: 2, product: 2, gm: 2 } } },
    { id: 'ws2', kind: 'style', c: ['Conscientiousness', 'Improvisation'], q: 'Before a big meeting you are more likely to:', a: { t: 'Have the pack finished two days early and pressure-tested.', w: { finance: 3, strategy: 3, analytics: 2, cerev: 1 } }, b: { t: 'Know the three things you need and work the room live.', w: { sales: 4, gm: 2, venture: 2 } } },
    { id: 'ws3', kind: 'style', c: ['Extraversion', 'Focus'], q: 'Your energy comes back faster after:', a: { t: 'A day of back-to-back conversations.', w: { sales: 4, people: 3, gm: 2 } }, b: { t: 'A day of uninterrupted deep work.', w: { analytics: 4, finance: 2, product: 2, strategy: 2 } } },
    { id: 'ws4', kind: 'style', c: ['Agreeableness', 'Challenge'], q: 'In a disagreement with a senior stakeholder you tend to:', a: { t: 'Find the version both of you can live with.', w: { people: 3, opssc: 2, marketing: 2, gm: 1 } }, b: { t: 'Hold the line if the evidence is on your side.', w: { finance: 3, analytics: 3, strategy: 2, cerev: 2 } } },
    { id: 'ws5', kind: 'style', c: ['Resilience', 'Sensitivity'], q: 'A plan you championed fails publicly. Your first instinct:', a: { t: 'Run the post-mortem yourself, out loud, the same week.', w: { gm: 3, strategy: 2, venture: 3, opssc: 1 } }, b: { t: 'Understand quietly what it did to the team before anything else.', w: { people: 4, marketing: 1, sales: 1 } } },
    { id: 'ws6', kind: 'style', c: ['Detail', 'Synthesis'], q: 'Handed a 60-page report, you:', a: { t: 'Go to the appendix and check how the numbers were built.', w: { finance: 3, analytics: 4, opssc: 2 } }, b: { t: 'Read the first three pages and form a view on the argument.', w: { strategy: 3, gm: 3, marketing: 2, venture: 1 } } },
    /* --- Work values and career anchors --- */
    { id: 'vl1', kind: 'value', c: ['Autonomy', 'Security'], q: 'Choose the offer you would actually take.', a: { t: 'Broad autonomy, unclear structure, outcome judged in a year.', w: { venture: 4, gm: 2, strategy: 2, product: 1 } }, b: { t: 'Clear mandate, strong structure, predictable progression.', w: { finance: 3, opssc: 3, people: 2, cerev: 2 } } },
    { id: 'vl2', kind: 'value', c: ['Influence', 'Mastery'], q: 'Ten years out, which matters more?', a: { t: 'You decide things that move a whole business.', w: { gm: 4, sales: 2, cerev: 2, strategy: 1 } }, b: { t: 'You are genuinely excellent at a craft people seek you out for.', w: { analytics: 3, finance: 3, product: 3, marketing: 2 } } },
    { id: 'vl3', kind: 'value', c: ['Pace', 'Depth'], q: 'Which workplace would wear you down faster?', a: { t: 'One where decisions take six months and three committees.', w: { venture: 4, product: 2, sales: 2, digital: 2 } }, b: { t: 'One where nothing is ever finished properly before the next thing starts.', w: { finance: 3, opssc: 3, analytics: 2, strategy: 1 } } },
    { id: 'vl4', kind: 'value', c: ['Money', 'Meaning'], q: 'Be honest about the trade you would make.', a: { t: 'A materially higher package for work you find merely fine.', w: { finance: 3, sales: 3, cerev: 2, gm: 1 } }, b: { t: 'Less money for work you would explain proudly at a dinner.', w: { people: 3, venture: 3, marketing: 2, product: 2 } } },
    { id: 'vl5', kind: 'value', c: ['Visibility', 'Craft'], q: 'Which recognition would you choose?', a: { t: 'Presenting the result to the board.', w: { gm: 3, strategy: 3, cerev: 2, sales: 2 } }, b: { t: 'Knowing the engine you built keeps working without you.', w: { digital: 3, opssc: 3, analytics: 2, product: 2 } } },
    /* --- Business work-pattern: the function-level choice, asked as a mandate --- */
    { id: 'bp1', kind: 'pattern', c: ['Mandate'], q: 'Which mandate would you rather own for three years?', a: { t: 'Build pricing, mix and revenue growth management across categories.', w: { cerev: 5, finance: 2, analytics: 2 } }, b: { t: 'Build the commercial operating system: CRM, pipeline, productivity, field execution.', w: { digital: 4, cerev: 3, exec: 0, opssc: 1 } } },
    { id: 'bp2', kind: 'pattern', c: ['Mandate'], q: 'Both land on your desk. Which do you keep?', a: { t: 'Launching the company\'s first new category in a decade.', w: { marketing: 4, venture: 3, product: 2, strategy: 1 } }, b: { t: 'Fixing the supply chain that keeps failing the existing categories.', w: { opssc: 5, gm: 1, analytics: 1 } } },
    { id: 'bp3', kind: 'pattern', c: ['Mandate'], q: 'Which problem would you rather be accountable for?', a: { t: 'The forecast is wrong often enough that everyone has stopped trusting it.', w: { analytics: 5, opssc: 2, finance: 2 } }, b: { t: 'The best people keep leaving in their second year.', w: { people: 5, gm: 2 } } },
    { id: 'bp4', kind: 'pattern', c: ['Mandate'], q: 'A board seat opens on one of these. Pick one.', a: { t: 'The capital allocation committee.', w: { finance: 4, strategy: 3, gm: 2 } }, b: { t: 'The customer experience and product council.', w: { product: 4, marketing: 3, digital: 2 } } },
    { id: 'bp5', kind: 'pattern', c: ['Mandate'], q: 'Which would you rather be known for internally?', a: { t: 'The person who can get a hard thing shipped across five teams.', w: { digital: 4, product: 3, opssc: 2, strategy: 1 } }, b: { t: 'The person whose commercial judgement the CEO checks first.', w: { gm: 4, cerev: 3, strategy: 3 } } },
    { id: 'bp6', kind: 'pattern', c: ['Mandate'], q: 'Choose the harder conversation you would rather lead.', a: { t: 'Telling the top customer their price is going up 9%.', w: { sales: 4, cerev: 4, gm: 2 } }, b: { t: 'Telling the founder their favourite product line should be killed.', w: { strategy: 4, analytics: 2, product: 2, finance: 2 } } },
    { id: 'bp7', kind: 'pattern', c: ['Mandate'], q: 'Which capability would you rather build from nothing?', a: { t: 'An analytics function that changes how decisions get made.', w: { analytics: 5, digital: 3 } }, b: { t: 'A key-accounts motion that doubles the top twenty customers.', w: { sales: 5, cerev: 3 } } },
    { id: 'bp8', kind: 'pattern', c: ['Mandate'], q: 'The company can fund one. You choose:', a: { t: 'An AI programme that reshapes three core workflows.', w: { digital: 5, product: 2, analytics: 2 } }, b: { t: 'A brand investment that repositions the portfolio upmarket.', w: { marketing: 5, gm: 2, cerev: 1 } } },
    /* --- Consistency probes: paired against earlier items, never shown as a score --- */
    { id: 'cx1', kind: 'check', pair: 'ri5', q: 'One more on risk, worded differently.', a: { t: 'You would rather be measured on a visible number you control loosely.', w: { sales: 2, gm: 2, venture: 2 } }, b: { t: 'You would rather be measured on a process you control tightly.', w: { opssc: 2, finance: 2, digital: 1 } } },
    { id: 'cx2', kind: 'check', pair: 'ws3', q: 'And one more on energy.', a: { t: 'A day with no meetings would feel like a relief.', w: { analytics: 2, finance: 1, product: 1, strategy: 1 } }, b: { t: 'A day with no meetings would feel like something was wrong.', w: { sales: 2, people: 2, gm: 1 } } }
  ];

  /* Adaptive discriminators: shown only for the shortlisted functions, to separate roles inside a family. */
  const DISC = {
    strategy: [
      { id: 'd-st1', q: 'Inside strategy work, which pull is stronger?', a: { t: 'Framing the question nobody has asked yet.', r: { 'r-cs': 3, 'r-mc': 3 } }, b: { t: 'Making a decided change actually happen.', r: { 'r-td': 4, 'r-cos': 2 } } },
      { id: 'd-st2', q: 'Which would you rather be judged on?', a: { t: 'The quality of the recommendation.', r: { 'r-mc': 3, 'r-cs': 3 } }, b: { t: 'Whether the organisation moved.', r: { 'r-td': 4, 'r-cos': 3 } } }
    ],
    cerev: [
      { id: 'd-ce1', q: 'Which commercial lever would you rather own?', a: { t: 'Price and mix architecture across the portfolio.', r: { 'r-rgm': 4, 'r-pri': 4 } }, b: { t: 'The systems and cadence the sales force runs on.', r: { 'r-rops': 4, 'r-ced': 3 } } },
      { id: 'd-ce2', q: 'Which team would you rather lead?', a: { t: 'A small analytical team with a narrow, deep mandate.', r: { 'r-pri': 4, 'r-rgm': 2 } }, b: { t: 'A cross-functional group spanning sales, finance and IT.', r: { 'r-ced': 4, 'r-rops': 2 } } }
    ],
    sales: [
      { id: 'd-sa1', q: 'Which version of selling appeals more?', a: { t: 'Owning a handful of very large relationships.', r: { 'r-ka': 4, 'r-bd': 2 } }, b: { t: 'Leading a team that carries the number for a region.', r: { 'r-sd': 4 } } },
      { id: 'd-sa2', q: 'Which cycle suits your temperament?', a: { t: 'Long, uncertain, occasionally transformative deals.', r: { 'r-bd': 4 } }, b: { t: 'A rhythm of monthly targets and steady pipeline.', r: { 'r-sd': 3, 'r-ka': 3 } } }
    ],
    marketing: [
      { id: 'd-mk1', q: 'Which marketing problem is more yours?', a: { t: 'What the brand means and how it is expressed.', r: { 'r-bm': 4 } }, b: { t: 'Which segments to serve and what the category needs.', r: { 'r-cl': 4, 'r-ins': 2 } } },
      { id: 'd-mk2', q: 'Which measurement would you rather be held to?', a: { t: 'Brand health over years.', r: { 'r-bm': 3, 'r-ins': 3 } }, b: { t: 'Acquisition cost and conversion this quarter.', r: { 'r-gm2': 4 } } }
    ],
    finance: [
      { id: 'd-fi1', q: 'Which finance seat would you take?', a: { t: 'Close to the business, arguing about commercial choices.', r: { 'r-cfin': 4 } }, b: { t: 'Close to the capital, valuing and structuring.', r: { 'r-corpf': 4 } } },
      { id: 'd-fi2', q: 'Which output feels more like your work?', a: { t: 'The plan everyone runs the year against.', r: { 'r-fpa': 4 } }, b: { t: 'The deal model that justified the price.', r: { 'r-corpf': 4 } } }
    ],
    opssc: [
      { id: 'd-op1', q: 'Which operations problem would you rather own?', a: { t: 'Balancing demand and supply across the whole network.', r: { 'r-sop': 4, 'r-scd': 3 } }, b: { t: 'Getting cost and quality out of what suppliers give you.', r: { 'r-proc': 4 } } },
      { id: 'd-op2', q: 'Your contribution is more about:', a: { t: 'Designing the system.', r: { 'r-scd': 4, 'r-sop': 2 } }, b: { t: 'Removing waste from the system that exists.', r: { 'r-opex': 4 } } }
    ],
    product: [
      { id: 'd-pr1', q: 'Which part of product is the draw?', a: { t: 'Deciding what to build and why.', r: { 'r-pm': 4, 'r-ppm': 3 } }, b: { t: 'Making the product organisation run properly.', r: { 'r-pops': 4 } } },
      { id: 'd-pr2', q: 'Which scope fits where you are now?', a: { t: 'One product, end to end.', r: { 'r-pm': 4 } }, b: { t: 'A platform several teams build on.', r: { 'r-ppm': 4 } } }
    ],
    analytics: [
      { id: 'd-an1', q: 'Which analytics role is closer to you?', a: { t: 'Partnering a business area and changing its decisions.', r: { 'r-ba': 3, 'r-cma': 4 } }, b: { t: 'Building methods and models others rely on.', r: { 'r-ds': 4 } } },
      { id: 'd-an2', q: 'Which would you rather be known for?', a: { t: 'Commercial judgement sharpened by data.', r: { 'r-cma': 4, 'r-ba': 2 } }, b: { t: 'Technical rigour others defer to.', r: { 'r-ds': 4 } } }
    ],
    people: [
      { id: 'd-pe1', q: 'Which people problem would you rather own?', a: { t: 'Being the trusted partner to one business leader.', r: { 'r-hrbp': 4 } }, b: { t: 'Redesigning how the organisation is structured.', r: { 'r-od': 4 } } },
      { id: 'd-pe2', q: 'Where would you rather spend your budget?', a: { t: 'Building capability across the company.', r: { 'r-tal': 4 } }, b: { t: 'Landing a structural change that sticks.', r: { 'r-od': 4 } } }
    ],
    gm: [
      { id: 'd-gm1', q: 'Which route to general management is yours?', a: { t: 'Through commercial leadership of a region.', r: { 'r-rcl': 4, 'r-cgm': 2 } }, b: { t: 'Through running a category or country P&L.', r: { 'r-cgm': 4, 'r-buh': 3 } } },
      { id: 'd-gm2', q: 'Which is the bigger gap for you right now?', a: { t: 'Owning a full P&L.', r: { 'r-buh': 3, 'r-cgm': 3 } }, b: { t: 'Leading leaders rather than individuals.', r: { 'r-rcl': 4 } } }
    ],
    venture: [
      { id: 'd-ve1', q: 'Which version of venture appeals?', a: { t: 'Starting it yourself, with the risk that implies.', r: { 'r-fnd': 5 } }, b: { t: 'Backing or building inside someone else\'s balance sheet.', r: { 'r-cvc': 4, 'r-vb': 3 } } },
      { id: 'd-ve2', q: 'Be honest about the constraint.', a: { t: 'You could go without income for a year if needed.', r: { 'r-fnd': 4, 'r-vb': 2 } }, b: { t: 'You need the salary to continue.', r: { 'r-cvc': 4, 'r-vb': 1 } } }
    ],
    digital: [
      { id: 'd-di1', q: 'Which digital mandate would you take?', a: { t: 'Setting where AI and digital should go.', r: { 'r-ais': 4, 'r-cai': 3 } }, b: { t: 'Getting the change adopted across the business.', r: { 'r-dtl': 4, 'r-wfa': 3 } } },
      { id: 'd-di2', q: 'Which is nearer your evidence today?', a: { t: 'Commercial problems solved with data and automation.', r: { 'r-cai': 4, 'r-wfa': 3 } }, b: { t: 'Large programmes landed across functions.', r: { 'r-dtl': 4, 'r-ais': 2 } } }
    ]
  };

  /* Industry adjacency: how naturally each function travels into each sector. 0 to 5. */
  const INDUSTRIES = [
    { id: 'fmcg', name: 'FMCG & Consumer', adj: { marketing: 5, cerev: 5, sales: 5, opssc: 4, gm: 4, finance: 3, analytics: 3, people: 3, strategy: 3, product: 2, digital: 3, venture: 2 } },
    { id: 'retail', name: 'Retail & Quick Commerce', adj: { cerev: 4, opssc: 5, analytics: 4, marketing: 4, product: 4, digital: 4, sales: 3, gm: 3, finance: 3, strategy: 3, people: 2, venture: 3 } },
    { id: 'tech', name: 'Technology & SaaS', adj: { product: 5, analytics: 5, digital: 5, sales: 4, strategy: 4, marketing: 3, cerev: 3, finance: 3, people: 3, gm: 2, opssc: 2, venture: 4 } },
    { id: 'bfsi', name: 'Financial Services', adj: { finance: 5, analytics: 5, strategy: 4, digital: 4, product: 3, cerev: 3, sales: 3, people: 3, gm: 3, marketing: 2, opssc: 2, venture: 2 } },
    { id: 'pharma', name: 'Pharma & Healthcare', adj: { opssc: 4, cerev: 4, sales: 4, strategy: 4, finance: 3, analytics: 3, marketing: 3, people: 3, gm: 3, product: 2, digital: 3, venture: 2 } },
    { id: 'indl', name: 'Industrial & Manufacturing', adj: { opssc: 5, cerev: 4, sales: 4, finance: 4, gm: 4, strategy: 3, people: 3, analytics: 3, digital: 3, marketing: 2, product: 2, venture: 1 } },
    { id: 'cons', name: 'Consulting & Professional Services', adj: { strategy: 5, analytics: 4, digital: 4, people: 4, finance: 4, opssc: 3, cerev: 3, marketing: 3, product: 2, gm: 2, sales: 3, venture: 2 } },
    { id: 'startup', name: 'Early-stage & Venture', adj: { venture: 5, product: 4, cerev: 4, marketing: 4, sales: 4, analytics: 3, strategy: 3, digital: 3, finance: 3, gm: 3, opssc: 2, people: 2 } }
  ];

  const BANDS = [
    { max: 2, title: 'Analyst / Associate', rule: 'Skill-building and exposure roles. Inflated leadership titles are a red flag at this stage.' },
    { max: 5, title: 'Manager / Senior Manager', rule: 'Ownership of a workstream, client, account, category or functional module.' },
    { max: 9, title: 'Senior Manager / Associate Director', rule: 'Cross-functional leadership and the move from specialist to broader.' },
    { max: 14, title: 'Director / Head', rule: 'Evidence of scope, leadership, business impact and transformation ownership.' },
    { max: 99, title: 'Head / VP / GM', rule: 'P&L and enterprise leadership. Titles vary heavily between companies at this level.' }
  ];

  window.RoleQuestData = { CAPS, FUNCTIONS, ROLES, ITEMS, DISC, INDUSTRIES, BANDS, signalDate: 'October 2026', taxonomyVersion: 'v1.0' };
})();
