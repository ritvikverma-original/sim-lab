/* Case Room data, part 4: people and ethics cases. Original write-ups of public facts; companies are disguised until the reveal. */
window.CaseRoomData = (window.CaseRoomData || []).concat([
  {
    id: 'english', cat: 'people', level: 'standard', title: 'English by 2012', firm: 'Shirokane Online', when: '2010', mins: 15,
    role: 'You head HR at a large Japanese internet company whose founder has just announced that English will be the company’s official language.',
    teaches: 'Leading change · global organisations · language and inclusion',
    blurb: 'Your founder has told 7,000 mostly Japanese employees that they must work in English within two years. How do you make the mandate succeed without breaking the company?',
    brief: '<p>Shirokane runs one of Japan’s largest online marketplaces and wants to become a global internet company through acquisitions abroad. Its founder believes that a single working language is the only way to share knowledge across countries, hire globally and stay ahead.</p><p>He announces that all meetings, documents and internal communication will be in English within two years, and that employees must reach a set score on a standard English test, with higher scores for more senior jobs. Most employees speak little English. Some are excited; many are anxious; a few business leaders call the idea foolish in the press.</p>',
    note: 'A mandate sets the destination; support decides how many people arrive.',
    ex: [{ t: 'How employees feel (pulse survey)', h: ['Group', 'Typical reaction'], r: [['Engineers hired from abroad', 'Relieved: they can finally take part'], ['Young Japanese staff', 'Anxious but see a career benefit'], ['Mid-career Japanese managers', 'Threatened: their status rests on Japanese communication'], ['Sales staff with Japanese clients', 'Puzzled: their clients speak Japanese']] }],
    qs: [
      { q: 'How do you frame and run the mandate?', o: [
        ['Make it universal with a firm deadline, clear test targets by job level and visible progress reports', 3, 'Clarity and universality signal seriousness; a mandate with exceptions quickly becomes optional.'],
        ['Apply it only to global teams', 1, 'Easier, but it splits the company into two classes and does not build one global culture.'],
        ['Hire translators instead', 0, 'Translation keeps everyone dependent and slow, the opposite of the goal.']] },
      { q: 'What support do you give?', o: [
        ['Classes, online learning and study time, paid by the company, with extra help for those furthest behind', 3, 'People who believe they can succeed engage; people who feel abandoned resist.'],
        ['None: it is each employee’s responsibility', 0, 'The burden then falls hardest on those already most anxious.'],
        ['Generous bonuses for passing the test', 1, 'Rewards help a little, but without learning support they mostly reward those who already speak English.']] },
      { q: 'At the deadline, many mid-career managers have not reached their targets. What do you do?', o: [
        ['Demote everyone below target immediately', 1, 'Credible, but it may push out experienced people the company needs.'],
        ['Give those making steady progress more time and help, and act only on people who are not trying', 3, 'Firm on effort and fair on pace keeps the mandate credible without losing your best people.'],
        ['Quietly drop the requirement for managers', 0, 'Exceptions for the powerful tell everyone the mandate was never real.']] }
    ],
    rv: { name: 'Rakuten', when: '2010–2012', story: '<p>In 2010 Hiroshi Mikitani announced “Englishnization”: Rakuten’s roughly 7,000 Japanese employees would work in English within two years, with target scores on the TOEIC test by job level and promotion tied to them. The company paid for classes and study support.</p><p>Rakuten met the deadline in 2012, and average test scores rose sharply over the following years. Harvard’s Tsedal Neeley followed the change for years, finding that it opened opportunities for some groups and created real anxiety and status loss for others.</p>', lesson: 'Big cultural mandates succeed when firmness on the goal is matched by heavy support on the journey.', read: 'HBS case “Language and Globalization: ‘Englishnization’ at Rakuten (A)” (Neeley); Tsedal Neeley, The Language of Global Success (2017).' }
  },
  {
    id: 'piecework', cat: 'people', level: 'expert', title: 'Paid by the Piece', firm: 'Erie Arc Works', when: '1990s', mins: 20,
    role: 'You are the new chief executive of an American welding-equipment maker famous for its incentive system.',
    teaches: 'Incentive design · organisational culture · taking a system abroad',
    blurb: 'Your factory workers are paid by the piece, earn a large annual bonus and are promised no layoffs. The system works brilliantly at home. Does it work abroad, and what happens in a bad year?',
    brief: '<p>Erie Arc Works has paid production workers piece rates for most of a century. On top, a yearly bonus pool is shared out by each worker’s merit rating; in good years it has rivalled wages. Workers with three years’ service are guaranteed employment, so they accept moves between jobs and overtime in busy times. Productivity is legendary and turnover tiny.</p><p>To grow, the previous management bought factories in Europe, Latin America and Asia and planned to install the same system there. Now several foreign plants are losing money, and the overseas losses threaten the profits that fund the home bonus.</p>',
    note: 'An incentive system is a social contract, not just a formula.',
    ex: [{ t: 'How the bonus works (case-style figures)', h: ['Item', 'Value'], r: [['Bonus pool this year', '$60 million'], ['Total wages of eligible employees', '$100 million'], ['Bonus factor', 'pool ÷ wages'], ['Individual bonus', 'own wages × bonus factor × merit rating ÷ 100']] }],
    qs: [
      { q: 'A worker earned $40,000 in piecework wages and has a merit rating of 110. What is the bonus, in dollars?', num: { label: 'Bonus', ans: 26400, tol: [100, 1000, 4000], unit: ' $', dec: 0, min: 0, max: 200000, step: 100, hint: 'Bonus factor = 60 ÷ 100 = 0.6.' }, fb: '$40,000 × 0.6 × 1.10 = $26,400, about two-thirds of wages.' },
      { q: 'Should the foreign plants run the same system?', o: [
        ['Yes, exactly as at home', 0, 'Piecework, bonuses and no-layoff promises depend on local law, unions and decades of trust that new plants do not have.'],
        ['Adapt it to each country’s laws and culture, and build trust before adding incentives', 3, 'Transfer the principles, not the formula, and earn the trust first.'],
        ['Drop incentives abroad entirely', 1, 'You lose the system’s strengths everywhere, including where it could work.']] },
      { q: 'Foreign losses mean the company barely breaks even, but the home plants had a record year. What do you do about the home bonus?', o: [
        ['Skip the bonus this year', 1, 'Legally possible, but workers who delivered a record year would see the contract broken.'],
        ['Borrow to pay it, because the home workforce earned it', 3, 'Keeping the bargain in a bad year is what makes the system believable in good ones.'],
        ['Pay half and explain why', 2, 'A defensible compromise, but it still tells workers that others’ mistakes can cost them.']] },
      { q: 'What does the case teach about incentive systems?', o: [
        ['A good formula works anywhere', 0, 'The same formula failed abroad.'],
        ['Incentives work as part of a whole system: pay, job security, trust and culture', 3, 'Remove one part and the others stop working.'],
        ['Piecework is outdated', 0, 'It still delivers outstanding productivity where the whole system is in place.']] }
    ],
    rv: { name: 'Lincoln Electric', when: '1990s', story: '<p>Lincoln Electric, a Cleveland welding company founded in 1895, combined piecework pay, a large annual bonus based on merit ratings and guaranteed employment for long-serving workers. Expansion abroad in the late 1980s and early 1990s went badly, and in the early 1990s Lincoln borrowed money to pay its US bonus while foreign plants lost heavily.</p><p>Chief executive Donald Hastings later described the lessons in Harvard Business Review: the system did not transfer to countries without its culture and trust, and the company had to adapt it and its management abroad.</p>', lesson: 'Incentives are only as strong as the system and the trust around them.', read: 'HBS cases “The Lincoln Electric Company” and “Lincoln Electric: Venturing Abroad”; Donald Hastings, “Lincoln Electric’s Harsh Lessons from International Expansion”, Harvard Business Review (1999).' }
  },
  {
    id: 'rugs', cat: 'decisions', level: 'standard', title: 'The Rug Supplier', firm: 'Nordhem Home', when: 'The mid-1990s', mins: 15,
    role: 'You manage the rugs business of a global home-furnishings retailer known for low prices and a responsible image.',
    teaches: 'Supply-chain ethics · stakeholder responses · fixing root causes',
    blurb: 'A television documentary shows children knotting rugs at one of your suppliers in South Asia. Do you cut the suppliers off, or stay and change things?',
    brief: '<p>Nordhem buys hand-knotted rugs from suppliers in India and Pakistan, where carpet weaving is a large village industry. Child labour is widespread in the carpet belt, often because families are poor and schools are weak. Your contracts already ban child labour, but suppliers subcontract weaving to village homes you never see.</p><p>A documentary has shown children working at a supplier’s subcontractor. Journalists and campaigners want a response; some customers say they will boycott you. Cutting off every supplier is quick and safe for your image, but you know it may push the same children into worse work.</p>',
    note: 'Ask what happens to the children under each option.',
    ex: [{ t: 'Options in front of you', h: ['Option', 'Image', 'Children'], r: [['Cut all suppliers in the region', 'Quickly protected', 'Likely into worse work'], ['Stay and audit', 'At risk if another case appears', 'Depends on enforcement'], ['Stay, audit and invest in schools', 'Slow to explain', 'Addresses causes']] }],
    qs: [
      { q: 'What do you do with the supplier shown on television?', o: [
        ['Cancel all rug contracts in the region at once', 1, 'It protects the brand fast, but the children lose income and may move to more dangerous work.'],
        ['Suspend the supplier, require proof of fixes, and stay in the region with stricter, unannounced checks', 3, 'Consequences plus a route back keep leverage over conditions you can actually influence.'],
        ['Say the contract already bans child labour', 0, 'A clause no one enforces is not a defence.']] },
      { q: 'How do you reach weaving done in village homes?', o: [
        ['Require suppliers to map every subcontractor and allow unannounced visits, and pay for monitoring', 3, 'Visibility down the chain is the precondition for any guarantee.'],
        ['Trust suppliers’ signed declarations', 0, 'Declarations are what failed.'],
        ['Buy only from large factories', 2, 'It reduces risk, but it also cuts out the villages, and the problem moves elsewhere.']] },
      { q: 'What addresses the root cause?', o: [
        ['Fund schools and family support in the weaving villages with a children’s charity', 3, 'Children work because families are poor and schools are weak; tackling both reduces child labour for everyone.'],
        ['A labelling campaign for “child-free” rugs', 1, 'Labels help customers, but only if the checks behind them are real.'],
        ['Lobby governments to ban child labour', 1, 'Laws exist already; enforcement and alternatives are the gap.']] }
    ],
    rv: { name: 'IKEA', when: '1994–2000s', story: '<p>Swedish and German television documentaries in 1994 and 1995 showed child labour at rug suppliers to IKEA in Pakistan and India. Marianne Barner, who ran IKEA’s rugs business, chose to stay and change conditions rather than leave. IKEA added child-labour clauses, unannounced inspections and later a supplier code of conduct, IWAY.</p><p>It also worked with UNICEF and Save the Children to fund schooling and support for families in India’s carpet belt, an approach widely studied in business schools.</p>', lesson: 'Walking away can protect a brand and still hurt the people the brand claims to care about.', read: 'HBS case “IKEA’s Global Sourcing Challenge: Indian Rugs and Child Labor (A)” (Bartlett and others).' }
  },
  {
    id: 'eight', cat: 'decisions', level: 'expert', title: 'Eight Is Great', firm: 'Pacific Union Bank', when: '2013–2016', mins: 20,
    role: 'You sit on the board of a large retail bank famous for selling many products to each customer.',
    teaches: 'Incentives and ethics · board oversight · accountability',
    blurb: 'Branch staff face daily targets to sell eight products per household. A newspaper reports that some are opening accounts customers never asked for. What does the board do?',
    brief: '<p>Pacific Union is admired by investors for cross-selling: its customers hold more products than at any rival, and its slogan is that eight is great. Branch employees on modest pay face daily sales targets, tracked several times a day, and those who miss them risk their jobs.</p><p>A newspaper investigation reports that employees have opened accounts and cards without customers’ consent to meet targets. Management says the problem is a few bad employees, and that it has fired those involved. The numbers involved are small next to the bank’s size.</p>',
    note: 'When thousands of people break the rules in the same way, look at the rules.',
    ex: [{ t: 'What the board hears', h: ['Source', 'Message'], r: [['Management', 'A few bad apples, already dismissed'], ['Investors', 'Cross-selling is our edge'], ['Former employees', 'Targets were impossible without cheating'], ['Customer complaints', 'Fees on accounts they never opened']] }],
    qs: [
      { q: 'What does the board do after the newspaper report?', o: [
        ['Accept management’s view and ask for more training', 0, 'If the targets drive the behaviour, training will not change it.'],
        ['Commission an independent review of the sales incentives and how widespread the problem is', 3, 'Thousands of similar cases point to the system; only an independent review will show its scale.'],
        ['Increase monitoring of branch staff', 1, 'More policing of employees leaves the pressure that causes the problem in place.']] },
      { q: 'The review finds about two million accounts may have been opened without consent, and over 5,000 employees fired. What now?', o: [
        ['Pay the regulators’ fine and move on', 0, 'The fine is the smallest cost; trust is the largest.'],
        ['Scrap product-sales targets, refund every affected customer, and say so publicly', 3, 'Fix the cause, make customers whole and be open, before regulators force it.'],
        ['Lower the targets', 1, 'Lower targets reduce but do not remove the incentive to cheat.']] },
      { q: 'What about the senior executives who ran the sales system?', o: [
        ['Let them retire with full pay; they did not open the accounts', 0, 'Leaders own the systems they design and the warning signs they ignore.'],
        ['Hold them accountable, including clawing back pay', 3, 'Accountability at the top shows the problem was the system, not just the employees.'],
        ['Reassign them quietly', 0, 'Quiet moves look like protecting insiders.']] }
    ],
    rv: { name: 'Wells Fargo', when: '2013–2018', story: '<p>Wells Fargo’s “Eight is great” cross-selling targets put heavy pressure on branch staff. After a Los Angeles Times investigation in 2013, the bank fired employees but kept the targets. In September 2016 regulators fined it $185 million over roughly two million accounts possibly opened without consent; the estimate later rose to about 3.5 million. About 5,300 employees had been dismissed.</p><p>Chief executive John Stumpf resigned in October 2016, and the board clawed back tens of millions of dollars from him and the head of community banking. In 2018 the Federal Reserve capped the bank’s asset growth.</p>', lesson: 'Incentives that only cheating can meet will be met by cheating; boards must look at the system, not just the people.', read: 'IMD case “Wells Fargo: When eight wasn’t great”; Stanford case “The Wells Fargo Cross-Selling Scandal” (Larcker and Tayan).' }
  },
  {
    id: 'max', cat: 'decisions', level: 'expert', title: 'The New Engine', firm: 'Aurora Aerospace', when: '2011–2019', mins: 20,
    role: 'You are a senior engineering leader at a large aircraft maker whose rival has just launched a more fuel-efficient version of its best-selling jet.',
    teaches: 'Engineering ethics · safety culture · decisions under commercial pressure',
    blurb: 'To match a rival quickly, your company fits bigger engines to a 50-year-old design and adds software to keep it flying like the old one. When should commercial pressure give way to safety?',
    brief: '<p>Your rival’s new single-aisle jet uses new engines that burn much less fuel, and one of your biggest customers is about to order it. Designing a new aircraft would take a decade. Instead, leadership decides to fit larger, more efficient engines to your existing best-seller.</p><p>The bigger engines must sit further forward and higher, which makes the nose tend to pitch up in some conditions. Engineers add software that pushes the nose down automatically, using a single angle-of-attack sensor. A key selling point is that pilots of the old model need no simulator training to fly the new one; one customer has been promised a rebate if simulator training is required.</p>',
    note: 'Ask what each choice assumes a pilot will know and do in seconds.',
    ex: [{ t: 'Design choices on the table', h: ['Choice', 'Commercial effect', 'Safety effect'], r: [['Software reads one sensor', 'Simpler, cheaper', 'A single failure can trigger it'], ['Software not described in manuals', 'No new training needed', 'Pilots may not recognise it'], ['Simulator training required', 'Customer rebates, slower sales', 'Pilots practise the failure']] }],
    qs: [
      { q: 'How should the new software be designed and disclosed?', o: [
        ['One sensor, and leave it out of pilot manuals to avoid training', 0, 'A single point of failure that pilots do not know about is a hidden hazard.'],
        ['Use two sensors with cross-checks, describe it to pilots and require training where needed', 3, 'Redundancy and informed pilots cost money and time; they are the price of safety.'],
        ['Use two sensors but keep it out of manuals', 1, 'Better, but pilots still cannot respond to something they have never heard of.']] },
      { q: 'A new jet crashes and the software is suspected. What do you do?', o: [
        ['Issue a bulletin reminding pilots of the existing procedure', 0, 'This assumes pilots, not the design, are the problem.'],
        ['Tell airlines and regulators everything about the software, and support grounding until it is fixed', 3, 'When lives are at risk, full disclosure and caution come before schedules.'],
        ['Wait for the final investigation report', 0, 'Final reports take a year or more; more aircraft fly every day.']] },
      { q: 'What should the company change afterwards?', o: [
        ['Give safety engineers independence and direct access to the board, and slow the schedule when they raise concerns', 3, 'Safety needs a voice that commercial pressure cannot override.'],
        ['Improve public relations', 0, 'The problem was engineering and culture, not communication.'],
        ['Replace the chief executive and change nothing else', 1, 'Leadership change matters, but culture and governance are what failed.']] }
    ],
    rv: { name: 'Boeing (737 MAX)', when: '2011–2020', story: '<p>Airbus launched the A320neo in 2010; to keep American Airlines and others, Boeing re-engined the 737 as the 737 MAX in 2011 instead of designing a new plane. The larger engines changed the aircraft’s handling, and Boeing added MCAS, software that relied on a single angle-of-attack sensor and was not described in pilot manuals. Avoiding simulator training was a major selling point.</p><p>Lion Air Flight 610 crashed in October 2018, killing 189 people, and Ethiopian Airlines Flight 302 in March 2019, killing 157. The MAX was grounded worldwide for about 20 months, chief executive Dennis Muilenburg was fired in December 2019, and the crisis cost Boeing more than $20 billion.</p>', lesson: 'When schedules and selling points start shaping safety decisions, the culture has already failed.', read: 'Harvard Business Publishing: “What Went Wrong with Boeing’s 737 Max?”; IMD case “How Boeing lost altitude”.' }
  }
]);
