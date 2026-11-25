/* Product Studio content: the backlog catalogue, discovery methods, enterprise deals and quarterly events.
   Effects are the true impact of shipping an item, drawn per run from these means and spreads:
   sr signup rate, ar activation rate, conv free-to-paid conversion, org organic traffic, ref referrals, arpa revenue per account
   (relative changes); cf, cp monthly churn of free and paid teams (absolute); nps points; debt points; inc incident risk (relative);
   vel engineering velocity (relative); ent enterprise capability. */
(function () {
  'use strict';
  const CATS = {
    act: { name: 'Activation', c: 'var(--s1)' }, ret: { name: 'Retention', c: 'var(--s3)' }, mon: { name: 'Monetisation', c: 'var(--c-f)' },
    ent: { name: 'Enterprise', c: 'var(--s4)' }, grow: { name: 'Growth', c: 'var(--s2)' }, plat: { name: 'Platform', c: 'var(--s5)' }, bet: { name: 'Big bet', c: 'var(--c-e)' }
  };
  const ITEMS = [
    { id: 'setup', name: 'Guided setup wizard', cat: 'act', effort: 40, test: true, ask: 'Support', what: 'Walks a new manager through creating the first rota and inviting staff.', fx: { ar: [0.10, 0.05], nps: [2, 2] } },
    { id: 'import', name: 'Import staff from a spreadsheet', cat: 'act', effort: 30, ask: 'Sales', what: 'Upload a staff list instead of typing everyone in.', fx: { ar: [0.06, 0.03] } },
    { id: 'mobile', name: 'Staff mobile app', cat: 'act', effort: 120, ask: 'Customers', what: 'A native app for staff to see shifts and get reminders.', fx: { ar: [0.08, 0.04], cf: [-0.006, 0.003], cp: [-0.003, 0.0015], nps: [6, 3], debt: [8, 3] } },
    { id: 'templates', name: 'Industry schedule templates', cat: 'act', effort: 25, test: true, ask: 'Marketing', what: 'Ready-made rotas for cafés, clinics and shops.', fx: { ar: [0.04, 0.03] } },
    { id: 'emails', name: 'Onboarding email series', cat: 'act', effort: 10, test: true, ask: 'Marketing', what: 'Five emails nudging new teams to finish setting up.', fx: { ar: [0.03, 0.025], nps: [-0.5, 1] } },
    { id: 'swaps', name: 'Shift swaps between staff', cat: 'ret', effort: 60, ask: 'Customers', what: 'Staff trade shifts in the app; the manager approves with one tap.', fx: { cf: [-0.005, 0.002], cp: [-0.004, 0.002], nps: [4, 2] } },
    { id: 'payroll', name: 'Timesheets and payroll export', cat: 'ret', effort: 90, ask: 'Customers', what: 'Clock-in, timesheets and export to common payroll tools.', fx: { cp: [-0.006, 0.002], conv: [0.12, 0.06], arpa: [0.05, 0.03] } },
    { id: 'timeoff', name: 'Availability and time-off', cat: 'ret', effort: 50, ask: 'Support', what: 'Staff set availability and request leave; rotas respect it.', fx: { cf: [-0.003, 0.002], nps: [3, 2] } },
    { id: 'bugs', name: 'Fix the top 20 bugs', cat: 'ret', effort: 30, ask: 'Support', what: 'The most-reported defects, from broken reminders to time-zone errors.', fx: { nps: [5, 2], cf: [-0.002, 0.001], cp: [-0.0015, 0.001], debt: [-5, 2] } },
    { id: 'forecast', name: 'Labour-cost forecasting (Pro)', cat: 'mon', effort: 70, ask: 'Board', what: 'Shows the wage bill of a rota before it is published; Pro plan only.', fx: { conv: [0.18, 0.08], arpa: [0.04, 0.02] } },
    { id: 'paywall', name: 'Upgrade prompts at the free limit', cat: 'mon', effort: 15, test: true, ask: 'Board', what: 'In-app prompts when a free team hits a Pro feature or the size limit.', fx: { conv: [0.10, 0.08], nps: [-3, 2], cf: [0.001, 0.001] } },
    { id: 'annual', name: 'Annual billing', cat: 'mon', effort: 20, ask: 'Finance', what: 'Pay yearly for two months free.', fx: { cp: [-0.004, 0.0015], arpa: [-0.04, 0.01] } },
    { id: 'sso', name: 'Single sign-on', cat: 'ent', effort: 60, ask: 'Sales', what: 'Log in with the company’s identity provider. Every large customer asks for it.', fx: { ent: 'sso' } },
    { id: 'multi', name: 'Multi-location management', cat: 'ent', effort: 100, ask: 'Sales', what: 'One account across many sites, with regional managers.', fx: { ent: 'multi', arpa: [0.05, 0.03] } },
    { id: 'api', name: 'Open API and integrations', cat: 'ent', effort: 80, ask: 'Sales', what: 'Connect to point-of-sale and HR systems.', fx: { ent: 'api', cp: [-0.002, 0.001], org: [0.04, 0.02] } },
    { id: 'audit', name: 'Audit log and admin roles', cat: 'ent', effort: 40, ask: 'Sales', what: 'Who changed what, and fine-grained permissions.', fx: { ent: 'audit' } },
    { id: 'referral', name: 'Refer-a-business reward', cat: 'grow', effort: 30, test: true, ask: 'Marketing', what: 'A free month for every business a customer refers.', fx: { ref: [0.5, 0.35] } },
    { id: 'seo', name: 'SEO landing pages', cat: 'grow', effort: 20, ask: 'Marketing', what: 'Pages for “staff rota template” and similar searches.', fx: { org: [0.12, 0.06] } },
    { id: 'share', name: 'Public schedule links', cat: 'grow', effort: 40, ask: 'Customers', what: 'Share a read-only rota by link; every link advertises the product.', fx: { ref: [0.3, 0.2], org: [0.05, 0.03] } },
    { id: 'landing', name: 'New pricing page', cat: 'grow', effort: 15, test: true, ask: 'Marketing', what: 'A clearer pricing page with a plan comparison.', fx: { sr: [0.06, 0.05], conv: [0.03, 0.03] } },
    { id: 'ai', name: 'AI schedule generator', cat: 'bet', effort: 150, ask: 'Founder', hype: 2.2, what: 'Builds a whole rota from staff availability and forecast demand.', fx: { ar: [0.03, 0.06], conv: [0.04, 0.06], nps: [2, 6], debt: [10, 4] } },
    { id: 'chat', name: 'Team chat', cat: 'bet', effort: 90, ask: 'Founder', hype: 1.8, what: 'Messaging between staff inside the app.', fx: { nps: [0, 3], cf: [-0.001, 0.002], debt: [6, 2] } },
    { id: 'dark', name: 'Dark mode', cat: 'bet', effort: 25, ask: 'Customers', hype: 2.5, what: 'The most up-voted request on the feedback board.', fx: { nps: [1, 1] } },
    { id: 'refactor', name: 'Rebuild the scheduling engine', cat: 'plat', effort: 80, ask: 'Engineering', what: 'Replaces the code everyone is afraid to touch.', fx: { debt: [-25, 5], vel: [0.08, 0.03], inc: [-0.3, 0.1] } },
    { id: 'tests', name: 'Automated test suite', cat: 'plat', effort: 50, ask: 'Engineering', what: 'Catch regressions before customers do.', fx: { debt: [-12, 3], inc: [-0.35, 0.1] } },
    { id: 'db', name: 'Database upgrade', cat: 'plat', effort: 40, ask: 'Engineering', what: 'The database is two versions behind and slow at peak times.', fx: { inc: [-0.4, 0.1], debt: [-6, 2] } }
  ];
  const RESEARCH = [
    { id: 'interviews', name: 'Customer interviews', what: 'Ten calls about one backlog item: how much would it matter?', target: true },
    { id: 'usability', name: 'Usability test', what: 'Watch five new managers set up. Finds the biggest activation blocker.' },
    { id: 'funnel', name: 'Funnel analysis', what: 'Compares each step of your funnel with similar products.' },
    { id: 'survey', name: 'NPS survey', what: 'Asks customers what would make them recommend you.' },
    { id: 'pricing', name: 'Pricing study', what: 'Tests willingness to pay with small panels of managers.' },
    { id: 'competitor', name: 'Competitor teardown', what: 'Studies the main rival’s product, hiring and pricing for clues.' }
  ];
  const DEALS = [
    { id: 'riverside', q: 2, name: 'Riverside Clinics', what: 'a chain of 40 clinics with 1,800 staff', needs: ['sso', 'audit'], by: 4, arr: 160 },
    { id: 'northline', q: 4, name: 'Northline Retail', what: '120 stores and 3,500 staff', needs: ['sso', 'multi'], by: 6, arr: 310 },
    { id: 'urbanbite', q: 5, name: 'UrbanBite restaurants', what: '75 restaurants with 2,400 staff', needs: ['api', 'multi'], by: 7, arr: 220 }
  ];
  const EVENTS = {
    1: { id: 'ai', who: 'Founder and CEO', title: 'The founder wants AI on the roadmap', text: 'Investors keep asking about AI. The founder wants the AI schedule generator started this quarter and says customers will love it.', opts: [
      { v: 'commit', t: 'Start the AI generator this quarter', s: 'Founder trust +10', fx: { ceo: 10 }, add: 'ai' },
      { v: 'discover', t: 'Interview customers about it first', s: 'Founder trust −3; uses a research slot', fx: { ceo: -3 }, research: ['interviews', 'ai'] },
      { v: 'decline', t: 'Not now: it does not fix our biggest problem', s: 'Founder trust −10', fx: { ceo: -10 } }
    ] },
    3: { id: 'freetier', who: 'Market', title: 'A rival makes its product free for any team size', text: 'Your main competitor now offers unlimited staff on its free plan. Sign-ups to your product fell sharply in the last month.', hit: { sr: -0.15, q: 3 }, opts: [
      { v: 'match', t: 'Match it: remove the free-plan size limit', s: 'Sign-ups recover; fewer teams ever need to pay', fx: { ceo: -2 }, set: { limit: 'unlimited' } },
      { v: 'differentiate', t: 'Hold the line and compete on product', s: 'Sign-ups stay lower for a while', fx: { ceo: -4 } },
      { v: 'cut', t: 'Cut the Pro price for small teams by 25%', s: 'More conversions, less revenue per team', fx: { ceo: -2 }, set: { priceCut: 0.25 } }
    ] },
    4: { id: 'burnout', who: 'Engineering', title: 'The team is burning out', text: 'Your lead engineer says the team has worked late for two quarters. Two engineers are interviewing elsewhere.', opts: [
      { v: 'cool', t: 'Cool-down quarter: no late nights', s: 'Capacity −20% this quarter; morale +15', fx: { eng: 12, morale: 15 }, cap: -0.2 },
      { v: 'contract', t: 'Hire two contractors for a quarter', s: '$120k; capacity +10%', fx: { eng: 3, morale: 4 }, cost: 120, cap: 0.1 },
      { v: 'push', t: 'Push on: the roadmap matters', s: 'Morale −15; attrition risk', fx: { eng: -12, morale: -15 } }
    ] },
    5: { id: 'price', who: 'Board', title: 'The board wants a price rise', text: 'The board thinks the product is under-priced and wants revenue per customer up before the next funding round.', opts: [
      { v: 'all', t: 'Raise prices 25% for everyone', s: 'More revenue per team; churn rises for a while', fx: { ceo: 8 }, set: { price: 1.25, shock: 0.012 } },
      { v: 'new', t: 'Raise prices 25% for new customers only', s: 'Existing customers keep their price', fx: { ceo: 4 }, set: { price: 1.25, newOnly: true } },
      { v: 'hold', t: 'Hold prices and invest in value first', s: 'Board trust −8', fx: { ceo: -8 } }
    ] },
    6: { id: 'slowdown', who: 'Market', title: 'Small businesses are cutting costs', text: 'A downturn is hitting cafés and shops. Churn is rising and some customers ask to pause their plans.', hit: { cp: 0.008, cf: 0.01, q: 6, len: 2 }, opts: [
      { v: 'pause', t: 'Launch a pause plan at $1 a month', s: 'Halves the extra churn; slightly lower revenue', fx: { cust: 6 }, set: { pause: true } },
      { v: 'enterprise', t: 'Shift sales effort to large customers', s: 'Enterprise deals more likely', fx: { sales: 6 }, set: { entBoost: 0.15 } },
      { v: 'annual', t: 'Push annual plans with a discount', s: 'Lower churn for those who sign; −5% revenue per team', fx: { ceo: 2 }, set: { annualPush: true } }
    ] },
    7: { id: 'privacy', who: 'Legal', title: 'A new privacy law takes effect next year', text: 'Larger customers must prove who accessed staff records. Without an audit log, some will start leaving next quarter.', hit: { cp: 0.004, q: 8, len: 1, unless: 'audit' }, opts: [
      { v: 'audit', t: 'Put the audit log on the roadmap now', s: 'Adds it to this quarter’s plan', fx: { sales: 4 }, add: 'audit' },
      { v: 'wait', t: 'Wait and see how strictly it is enforced', s: 'Without an audit log by next quarter, paid churn rises', fx: { sales: -6 } }
    ] }
  };
  window.ProductData = { CATS, ITEMS, RESEARCH, DEALS, EVENTS };
})();
