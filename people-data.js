/* People Lab content: the real talent-market series behind the scenario, the quarterly events, and the story revealed at the end.
   Peer A is TCS and Peer B is Infosys. Attrition is last-twelve-months (LTM) attrition as each company reported it:
   TCS for IT services, Infosys voluntary. Quarters run April 2021 (FY22 Q1) to March 2024 (FY24 Q4). */
(function () {
  'use strict';
  const REAL = {
    label: ['FY22 Q1', 'FY22 Q2', 'FY22 Q3', 'FY22 Q4', 'FY23 Q1', 'FY23 Q2', 'FY23 Q3', 'FY23 Q4', 'FY24 Q1', 'FY24 Q2', 'FY24 Q3', 'FY24 Q4'],
    months: ['Apr–Jun 2021', 'Jul–Sep 2021', 'Oct–Dec 2021', 'Jan–Mar 2022', 'Apr–Jun 2022', 'Jul–Sep 2022', 'Oct–Dec 2022', 'Jan–Mar 2023', 'Apr–Jun 2023', 'Jul–Sep 2023', 'Oct–Dec 2023', 'Jan–Mar 2024'],
    tcs: [8.6, 11.9, 15.3, 17.4, 19.7, 21.5, 21.3, 20.1, 17.8, 14.9, 13.3, 12.5],
    infy: [13.9, 20.1, 25.5, 27.7, 28.4, 27.1, 24.3, 20.9, 17.3, 14.6, 12.9, 12.6],
    /* TCS closing headcount; the first value is March 2021. */
    tcsHc: [488649, 509058, 528748, 556986, 592195, 606331, 616171, 613974, 614795, 615318, 608985, 603305, 601546],
    /* Infosys LTM voluntary attrition for January–March 2021, reported with the next quarter's results. */
    infyPrior: 10.9,
    /* TCS LTM attrition in IT services for January–March 2021. */
    tcsPrior: 7.2,
    /* Approximate quarterly average rupees per US dollar; costs are paid in rupees and revenue is earned in dollars. inr0 is March 2021. */
    inr0: 73.5,
    inr: [73.8, 74.1, 74.9, 75.2, 77.2, 79.8, 82.2, 82.2, 82.2, 82.6, 83.2, 83.0]
  };
  /* What each quarter feels like in the game, without dates or names. */
  const MOOD = [
    'Clients are rushing their cloud and data programmes. Deal wins are at a record, and rivals are hiring hard.',
    'Recruiters are calling your engineers daily. Switchers with cloud skills are getting raises of 40% or more.',
    'Every firm in the industry is short of people. Your delivery teams are stretched and campuses are being raided for graduates.',
    'Demand is still rising, but hiring at this pace is pushing wage bills and margins in the wrong direction.',
    'The market is still hot, but clients are starting to ask harder questions about cost.',
    'Growth is slowing in some client sectors. Big tech firms abroad have paused hiring.',
    'Clients are cutting discretionary projects. Fewer recruiters call; fewer people resign.',
    'Global tech layoffs dominate the news. Benches across the industry are growing.',
    'Deal decisions are slow. Clients want cost savings, not new programmes.',
    'Demand has stabilised at a lower level. Resignations are back to pre-boom levels.',
    'Clients are asking about generative AI. Attrition across the industry is the lowest in three years.',
    'A quiet market. The question now is how ready you are for the next upturn.'
  ];
  const EVENTS = [
    { id: 'cloudquit', real: 'The boom had begun. TCS added a record 103,546 people in FY22 and onboarded about 77,000 graduates in nine months.', who: 'Head of delivery', title: 'Three cloud leads resigned in one week', text: 'A rival poached three leads from your largest client’s cloud programme. Delivery heads want authority to keep people with counter-offers.', opts: [
      { v: 'bonus', t: 'Retention bonus for all digital mid-level staff', s: '$22M now; their attrition falls for two quarters', fx: { cost: 22, attr: { band: 'M', k: 'dig', mult: 0.75, n: 2 }, E: 2 } },
      { v: 'counter', t: 'Let managers match outside offers', s: 'Keeps some leavers at higher pay; others see unfairness', fx: { counter: true, E: -1 } },
      { v: 'fair', t: 'No special deals: keep the pay structure fair', s: 'Engagement up a little; the leavers go', fx: { E: 2, csat: -2 } }
    ] },
    { id: 'secondhike', real: 'Infosys ran two pay rounds in FY22, with extra corrections for in-demand skills.', who: 'Compensation team', title: 'Rivals announce a second pay rise this year', text: 'Two large rivals have announced a second salary increase in the same year. Your managers say exit interviews mention pay more than anything else.', opts: [
      { v: 'all', t: 'A second increase of 4% for everyone', s: 'Pay rises across the board from this quarter', fx: { hike: { all: 0.04 }, E: 4 } },
      { v: 'skill', t: 'Raise pay 10% for digital skills only', s: 'Cheaper and targeted; others notice', fx: { hike: { dig: 0.10 }, E: -1 } },
      { v: 'hold', t: 'Hold until the next annual cycle', s: 'No cost now; resentment builds', fx: { E: -4 } }
    ] },
    { id: 'burnout', real: 'Infosys’s utilisation had just reached an all-time high of 89.2% (July to September 2021). TCS promoted more than 110,000 employees in October to December 2021.', who: 'Delivery managers', title: 'Teams are burning out at record utilisation', text: 'Project teams have been running above 88% utilisation for months. Clients report slipping deadlines and quality problems.', opts: [
      { v: 'cap', t: 'Cap utilisation at 85% and turn away some work', s: 'Some revenue lost; engagement and quality recover', fx: { ucap: 0.85, n: 2, E: 5, csat: 2 } },
      { v: 'bonus', t: 'Pay project bonuses for the extra hours', s: '$14M; teams keep going', fx: { cost: 14, E: 1 } },
      { v: 'push', t: 'Push on: clients come first', s: 'Engagement and quality suffer', fx: { E: -6, csat: -4 } }
    ] },
    { id: 'liftout', real: 'Attrition was still climbing. It peaked at 28.4% at Infosys in the next quarter and at 21.5% at TCS three months later.', who: 'Account head', title: 'A rival is trying to hire a whole team', text: 'A rival has offered 50% raises to the 60-person team running your second-largest client. Half have resigned; the rest are deciding.', opts: [
      { v: 'legal', t: 'Enforce the non-solicitation clause', s: 'Legal costs; the rest stay, but the mood sours', fx: { cost: 1, E: -2, brand: -2 } },
      { v: 'match', t: 'Match with 30% raises for the remaining team', s: 'Keeps the account; colleagues notice', fx: { cost: 2, E: -2, csat: 1 } },
      { v: 'backfill', t: 'Let them go and backfill quickly', s: 'The client is unhappy for a while', fx: { csat: -6, demand: -0.01 } }
    ] },
    { id: 'margin', real: 'TCS gave increases of 5 to 8% in FY23, with more for top performers, as wage costs squeezed margins across the industry.', who: 'Chief financial officer', title: 'Margins are down three points; the board wants them back', text: 'Wage increases, lateral premiums and subcontractors have pushed costs up. The board wants a plan to restore margins this year.', opts: [
      { v: 'varcut', t: 'Pay 70% of variable pay this quarter', s: 'Saves money now; staff are angry', fx: { varcap: 0.7, E: -5 } },
      { v: 'mix', t: 'Fix the pyramid: more juniors, fewer subcontractors', s: 'Slower, structural; no cut to pay', fx: { E: 1, subcut: true } },
      { v: 'protect', t: 'Protect pay and explain the trade-off to the board', s: 'Staff trust you; the board is unhappy', fx: { E: 3, board: -10 } }
    ] },
    { id: 'moonlight', real: 'In September 2022 Wipro dismissed 300 employees it found moonlighting for competitors. TCS called moonlighting an ethical issue that went against its values.', who: 'Chief information security officer', title: 'Employees are moonlighting, some for competitors', text: 'Security logs show several hundred employees working second jobs on company laptops. A few are working for direct competitors.', opts: [
      { v: 'fire', t: 'Dismiss those working for competitors and say so publicly', s: 'Sends a message; some see it as heavy-handed', fx: { E: -3, brand: -3, exits: 300 } },
      { v: 'allow', t: 'Allow side work with disclosure, but not for competitors', s: 'A modern policy; small risk of conflicts', fx: { E: 4, brand: 2, csat: -1 } },
      { v: 'warn', t: 'Issue a warning and monitor quietly', s: 'Little changes; the problem lingers', fx: { E: -1, csat: -2 } }
    ] },
    { id: 'freshers', real: 'As demand fell, Infosys, Wipro and TCS postponed joining dates for more than 10,000 graduates who already held offers.', who: 'Campus hiring team', title: 'Graduates are waiting to join, and demand has fallen', text: 'Clients have cut discretionary projects, but {n} graduates hold your offer letters and are due to join over the next two quarters.', opts: [
      { v: 'onboard', t: 'Honour the offers and onboard them as planned', s: 'A bigger bench for a while; your word holds', fx: { brand: 4 } },
      { v: 'defer', t: 'Defer joining dates by two quarters', s: 'Some give up and go elsewhere; campuses notice', fx: { deferAll: 2, brand: -8 } },
      { v: 'revoke', t: 'Withdraw half of the offers', s: 'Saves cost; a lasting hit to your name on campus', fx: { revoke: 0.5, brand: -18, E: -2 } }
    ] },
    { id: 'layoffs', real: 'Infosys’s utilisation fell to 80% in January to March 2023. TCS’s headcount went on to fall by 13,249 in FY24 as hiring slowed, its first fall in 19 years.', who: 'Chief executive', title: 'The bench is growing and global tech is cutting jobs', text: 'Large technology companies abroad have laid off tens of thousands. Your bench is {bench} of staff, and the chief executive wants options.', opts: [
      { v: 'exits', t: 'Performance-based exits of 3% of staff', s: 'Lower costs; fear spreads', fx: { exitsPct: 0.03, E: -8, brand: -6 } },
      { v: 'reskill', t: 'Put the bench through an intensive reskilling bootcamp', s: '$18M; more digital skills, better morale', fx: { cost: 18, reskill: 0.06, E: 3 } },
      { v: 'freeze', t: 'Freeze lateral hiring and let attrition shrink the bench', s: 'Slow; no pain now', fx: { freeze: 2, E: -1 } }
    ] },
    { id: 'increments', real: 'Infosys deferred its FY24 increments by two quarters, to November 2023.', who: 'Chief financial officer', title: 'Rivals are deferring this year’s pay rises', text: 'Several large rivals have announced that this year’s increments will be paid two quarters late. The CFO suggests you do the same.', opts: [
      { v: 'ontime', t: 'Pay the increment on time', s: 'Costs more; staff notice', fx: { E: 3 } },
      { v: 'defer', t: 'Defer the increment by two quarters', s: 'Saves two quarters of cost; top performers may leave', fx: { deferInc: 2, E: -6, attr: { band: 'all', k: 'all', mult: 1.12, n: 3 } } },
      { v: 'top', t: 'Pay it now, but only to top performers', s: 'Saves half the cost; the middle feels left out', fx: { incShare: 0.5, E: -3 } }
    ] },
    { id: 'rto', real: 'TCS called staff back to the office and tied pay rises and promotions to attendance.', who: 'Chief executive', title: 'The chief executive wants everyone back in the office', text: 'Leadership believes collaboration, training and client confidence suffer with remote teams, and wants a clear return-to-office policy.', opts: [
      { v: 'office', t: 'Five days a week, linked to pay and promotions', s: 'Better training and collaboration; some people quit', fx: { work: 'office', E: -4, attr: { band: 'all', k: 'all', mult: 1.1, n: 2 } } },
      { v: 'hybrid', t: 'Three days a week in the office', s: 'A middle path most people accept', fx: { work: 'hybrid', E: 1 } },
      { v: 'remote', t: 'Stay remote-first; meet for team events', s: 'Popular; the CEO is unconvinced', fx: { work: 'remote', E: 3, board: -6 } }
    ] },
    { id: 'genai', real: 'In 2023 both companies launched generative-AI programmes for clients and trained large numbers of their employees in it.', who: 'Head of strategy', title: 'Clients want generative-AI skills', text: 'Clients are asking every account team about generative AI. Rivals are announcing training programmes for tens of thousands of staff.', opts: [
      { v: 'train', t: 'Train 50,000 people in generative AI', s: '$15M; more digital skills and client confidence', fx: { cost: 15, reskill: 0.04, csat: 3, E: 2 } },
      { v: 'hire', t: 'Hire 500 AI specialists at a premium', s: '$9M to hire; their pay adds about $10M a quarter; fast credibility', fx: { cost: 9, csat: 2, aiHire: 500 } },
      { v: 'wait', t: 'Wait until client demand is proven', s: 'Saves money; some clients look elsewhere', fx: { csat: -3, demand: -0.01 } }
    ] },
    { id: 'promos', real: 'By January to March 2024 attrition was back to 12.5% at TCS and 12.6% at Infosys, close to where it had been before the boom.', who: 'Chief financial officer', title: 'Attrition is low; finance wants to cut career spending', text: 'Resignations are back to normal. Finance proposes cutting promotions to one cycle a year and halving the training budget.', opts: [
      { v: 'cut', t: 'Cut to one promotion cycle and halve training', s: 'Saves money; ambition stalls', fx: { E: -5, board: 6, ldcap: 'basic' } },
      { v: 'keep', t: 'Keep investing in careers', s: 'Costs more; people see a future here', fx: { E: 3, board: -3 } },
      { v: 'skills', t: 'Launch a skills-based career framework', s: '$6M; promotions follow certified skills', fx: { cost: 6, E: 4, reskill: 0.02 } }
    ] }
  ];
  const STORY = {
    title: 'The Indian IT talent war',
    years: 'April 2021 to March 2024 · FY22 to FY24',
    lede: 'Your twelve quarters were the Indian IT services cycle from April 2021 to March 2024. Peer A was Tata Consultancy Services (TCS) and Peer B was Infosys. Every attrition figure you saw for them was the one they actually reported.',
    events: [
      'FY22: clients rushed to the cloud after the pandemic. TCS added a record 103,546 people in the year, onboarded about 77,000 graduates in nine months, and promoted more than 110,000 employees in a single quarter (October to December 2021).',
      'Infosys ran two pay rounds in FY22, with extra corrections for in-demand skills, and hired about 85,000 graduates. Its utilisation reached an all-time high of 89.2% in July to September 2021. Most of its leavers had three to six years of experience.',
      'Attrition peaked at 28.4% at Infosys (April to June 2022) and 21.5% at TCS (July to September 2022). TCS gave increases of 5 to 8% in FY23, with more for top performers.',
      'In September 2022, Wipro dismissed 300 employees it found moonlighting for competitors. TCS called moonlighting an ethical issue that went against its values.',
      'As demand fell in 2023, Infosys, Wipro and TCS postponed joining dates for more than 10,000 graduates who already held offers. Infosys’s utilisation fell to 80% in January to March 2023, and it deferred its FY24 increments by two quarters, to November 2023.',
      'TCS called staff back to the office and tied pay rises and promotions to attendance. In FY24 its headcount fell for the first time in 19 years, by 13,249. Infosys’s headcount fell 7.5%, its first annual decline in about 23 years.',
      'By January to March 2024, attrition was back to 12.5% at TCS and 12.6% at Infosys. TCS’s head of HR had called 13.3% “now in our range of comfort” a quarter earlier.'
    ],
    lesson: 'Talent markets move in cycles. Firms that chased the boom with expensive laterals and huge fresher batches carried the cost into the downturn, and the ones that broke promises to graduates paid for it in their reputation on campus. The firms that did best used pay where it mattered most, built people from within through promotions and reskilling, and managed hiring with the pipeline’s lag in mind.',
    sources: 'TCS quarterly fact sheets and press releases (FY22 Q3, FY22 Q4, FY23 Q1, FY23 Q3, FY23 Q4, FY24 Q4); Infosys earnings calls (FY22 Q1, Q2 and Q4; FY23 Q3) and press coverage of its results; Business Standard, Business Today, People Matters, BusinessWorld and Outlook Business reporting, 2021–2024.'
  };
  window.PeopleData = { REAL, MOOD, EVENTS, STORY };
})();
