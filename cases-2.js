/* Case Room data, part 2: finance and operations cases. Original write-ups of public facts; companies are disguised until the reveal. */
window.CaseRoomData = (window.CaseRoomData || []).concat([
  {
    id: 'hurdle', cat: 'finance', level: 'expert', title: 'Three Hurdle Rates', firm: 'Harlow Hospitality Group', when: '1988', mins: 25,
    role: 'You work for the chief financial officer of a hotel, restaurant and contract food-services group, setting the hurdle rates for new investments.',
    teaches: 'Cost of capital · divisional hurdle rates · levering and unlevering beta',
    blurb: 'One company, three very different businesses. Should every project clear the same hurdle rate? Calculate the group’s cost of capital, then the lodging division’s, and see what one rate would do to investment.',
    brief: '<p>Harlow develops hotels, sells them to investors and keeps long-term contracts to manage them. It also runs restaurants and contract food services for hospitals, schools and airlines. The group plans to borrow heavily, because hotels are real estate with long, steady cash flows that lenders like.</p><p>Each year the finance team sets the hurdle rate that new projects must clear. Some managers want one company-wide rate, for simplicity. Others argue that a hotel, a restaurant and a catering contract carry different risks and support different amounts of debt. Use the case-style inputs in the exhibit; ignore the beta of debt.</p>',
    note: 'The cost of capital belongs to the project, not to the company that happens to own it.',
    ex: [{ t: 'Inputs (case-style, rounded)', h: ['Input', 'Group', 'Lodging', 'Restaurants'], r: [['Target debt share of capital', '60%', '74%', '42%'], ['Equity beta at that debt level', '1.10', 'from peers', 'from peers'], ['Asset (unlevered) beta of peers', '–', '0.40', '0.75'], ['Borrowing spread over government bonds', '1.3%', '1.1%', '1.8%']], n: 'Long-term government bond rate 9.0%. Market risk premium 7.4%. Tax rate 44%. Equity beta = asset beta ÷ (equity share of capital).' }],
    qs: [
      { q: 'Which hurdle rates should the group use?', o: [
        ['One company-wide rate, applied to every project', 0, 'A single rate overcharges the safer businesses and undercharges the riskier ones.'],
        ['A rate for each division, from its own business risk and debt capacity', 3, 'Each division’s rate should match the risk of its cash flows and how much debt they can carry.'],
        ['The group’s borrowing rate, since that is what money costs', 0, 'Debt is only part of the capital; equity holders bear the business risk and want more.'],
        ['A high rate for everything, to be safe', 1, 'Too high a rate rejects good projects; caution has a cost too.']] },
      { q: 'Calculate the group’s weighted average cost of capital (%).', num: { label: 'Group WACC', ans: 10.32, tol: [0.15, 0.4, 1.0], unit: '%', dec: 2, min: 0, max: 30, step: 0.1, hint: 'Cost of equity = 9.0% + beta × 7.4%. After-tax cost of debt = (9.0% + spread) × (1 − 44%). Weight by the target shares.' }, fb: 'Equity: 9.0% + 1.10 × 7.4% = 17.1%. Debt: 10.3% × 0.56 = 5.8%. WACC = 40% × 17.1% + 60% × 5.8% ≈ 10.3%.' },
      { q: 'Calculate the lodging division’s WACC (%).', num: { label: 'Lodging WACC', ans: 9.49, tol: [0.15, 0.4, 1.0], unit: '%', dec: 2, min: 0, max: 30, step: 0.1, hint: 'Relever the peers’ asset beta at 74% debt: equity beta = 0.40 ÷ 0.26.' }, fb: 'Equity beta 0.40 ÷ 0.26 = 1.54, so equity costs 9.0% + 1.54 × 7.4% = 20.4%. Debt: 10.1% × 0.56 = 5.7%. WACC = 26% × 20.4% + 74% × 5.7% ≈ 9.5%. Restaurants work out at about 13.3%.' },
      { q: 'The group rate is about 10.3%, lodging about 9.5% and restaurants about 13.3%. What happens if you use 10.3% for everything?', o: [
        ['Nothing important: the differences are small', 0, 'Three points on a restaurant project is the difference between creating and destroying value.'],
        ['Restaurants get projects that destroy value, and good hotel projects get rejected', 3, 'Exactly: the riskier division is subsidised and the safer one starved, so capital drifts to the wrong places.'],
        ['Hotels are over-funded, restaurants under-funded', 0, 'It is the reverse: the single rate is too low for restaurants and too high for hotels.']] }
    ],
    rv: { name: 'Marriott Corporation', when: '1987–1988', story: '<p>Marriott ran three divisions: lodging, contract services and restaurants. Its financial strategy had four parts: manage hotels rather than own them, invest in projects that raise shareholder value, use debt to an optimal level, and buy back undervalued shares. Dan Cohrs, its vice president of project finance, set a separate hurdle rate for each division to put the second part into practice.</p><p>In 1993 Marriott split into two companies: Host Marriott, which owned the hotel real estate and most of the debt, and Marriott International, which managed and franchised hotels.</p>', lesson: 'Use a hurdle rate that matches each investment’s risk and debt capacity; one company-wide rate quietly moves capital from good projects to bad ones.', read: 'HBS case “Marriott Corp.: The Cost of Capital (Abridged)” (Ruback). The inputs above are rounded for practice.' }
  },
  {
    id: 'cashcycle', cat: 'finance', level: 'standard', title: 'Negative Days', firm: 'Brayfield Computer', when: 'The 1990s', mins: 15,
    role: 'You are the finance director of a personal computer maker that sells directly to customers and is growing about 50% a year.',
    teaches: 'Working capital · the cash conversion cycle · funding growth',
    blurb: 'A fast-growing PC maker turns its inventory over every week and gets paid before it pays suppliers. Work out its cash conversion cycle and what it means for growth.',
    brief: '<p>Brayfield sells PCs by phone and over the internet and builds each one to order. A few years ago it also sold through retail stores, carried large inventories and lost money when component prices fell and some products failed. It left retail and rebuilt the business around direct sales and very low inventory.</p><p>Brayfield now collects from customers, many paying by card, in a few weeks, holds about a week of inventory and pays suppliers in about seven weeks. It wants to keep growing at about 50% a year without raising new equity.</p>',
    note: 'Every day of working capital is cash that is not working for you.',
    ex: [{ t: 'Working capital, in days', h: ['Measure', 'Before the change', 'Now'], r: [['Days of inventory', '32', '7'], ['Days of receivables', '50', '36'], ['Days of payables', '33', '51']], n: 'Cost of sales is now about $26 million a day.' }],
    qs: [
      { q: 'What is the cash conversion cycle now, in days?', num: { label: 'Cash conversion cycle', ans: -8, tol: [0, 2, 5], unit: ' days', dec: 0, min: -100, max: 200, step: 1, hint: 'Inventory days + receivable days − payable days.' }, fb: '7 + 36 − 51 = −8 days. Before the change it was 32 + 50 − 33 = 49 days.' },
      { q: 'With a negative cycle, what does growth do to cash?', o: [
        ['Growth generates cash: suppliers fund the working capital', 3, 'With a negative cycle, every extra dollar of sales brings cash in before the bills fall due.'],
        ['Growth consumes cash, as in most manufacturers', 0, 'That was true at 49 days; it is not true now.'],
        ['Growth has no effect on cash', 0, 'Working capital scales with sales, so the cycle’s sign decides whether growth makes or eats cash.']] },
      { q: 'How much cash, in $ millions, did cutting inventory from 32 days to 7 release?', num: { label: 'Cash released', ans: 650, tol: [20, 60, 150], unit: ' $M', dec: 0, min: 0, max: 5000, step: 10, hint: 'Days saved × cost of sales per day.' }, fb: '25 days × $26 million a day ≈ $650 million.' },
      { q: 'Why is low inventory worth even more to a PC maker than to most manufacturers?', o: [
        ['Components lose value quickly as prices fall and new models arrive', 3, 'Inventory in PCs is a melting asset: every week on the shelf costs value as well as interest.'],
        ['Warehouses are expensive', 1, 'True, but storage is a small cost next to price erosion and obsolescence.'],
        ['Customers prefer new boxes', 0, 'They do, but the economics are about falling component prices.']] }
    ],
    rv: { name: 'Dell Computer', when: '1990s', story: '<p>Dell sold PCs directly, built them to order and held very little inventory. After losses in 1993, linked to inventory and product problems, it left retail stores in 1994 and focused on the direct model. By the late 1990s Dell’s inventory was down to about a week and its cash conversion cycle was negative, so rapid growth generated cash instead of needing it.</p><p>Dell grew from about $2 billion of sales in the early 1990s to more than $12 billion in its 1998 fiscal year.</p>', lesson: 'Working capital is strategy: a business model that is paid before it pays can grow fast without outside money.', read: 'HBS case “Dell’s Working Capital”. The figures above are rounded for practice.' }
  },
  {
    id: 'seats', cat: 'ops', level: 'standard', title: 'The Seat Problem', firm: 'Kentucky assembly plant of a Japanese carmaker', when: '1992', mins: 15,
    role: 'You manage final assembly at a large car plant in the United States, run on the parent company’s production system.',
    teaches: 'Lean production · root-cause problem solving · stopping the line',
    blurb: 'Faulty seats are pulling cars off the line into an overflow lot every day. Do you keep production moving, or stop it and find the root cause?',
    brief: '<p>The plant builds a best-selling family sedan on a moving line. Seats arrive from a single local supplier, delivered in the exact sequence of cars on the line, a few hours before they are fitted. The production system relies on small buffers and on any worker pulling a cord to stop the line when they see a problem.</p><p>Recently, defective seats, broken hooks, flawed materials and wrong parts, have been sending more and more cars off the line. They wait in an overflow area until a replacement seat arrives, sometimes for days. Production targets are being met, but finished-car inventory and rework are growing and nobody owns the seat problem.</p>',
    note: 'A workaround that hides a problem is a decision to keep the problem.',
    ex: [{ t: 'What the overflow lot shows', h: ['Symptom', 'What it means'], r: [['Cars waiting days for seats', 'Inventory and rework are hiding the problem'], ['Several defect types', 'More than one root cause'], ['Targets still met', 'The cost is invisible in the daily numbers']] }],
    qs: [
      { q: 'What do you do on the line?', hint: 'In this production system, what is the cord for?', o: [
        ['Keep the line running and fix seats off-line, to protect output', 0, 'This is the workaround that created the overflow lot: problems pile up instead of being solved.'],
        ['Stop the line whenever a seat defect appears, so the problem surfaces and gets fixed', 3, 'Stopping hurts today and forces everyone to fix causes, which is the core of the system.'],
        ['Hold a larger buffer of spare seats at the line', 1, 'Buffers hide the problem and add cost; the defects keep coming.']] },
      { q: 'How do you find the cause?', o: [
        ['Ask “why” repeatedly with the supplier and design engineers until you reach the root causes', 3, 'Several causes, from a design change to the supplier’s process, only appear when you trace each defect back.'],
        ['Demand the supplier inspect every seat before delivery', 1, 'Inspection catches defects; it does not stop them being made.'],
        ['Add inspectors at the end of your line', 0, 'Late inspection is the most expensive place to find a problem.']] },
      { q: 'What do you do about the overflow lot itself?', o: [
        ['Make it visible: report cars and days waiting daily, and set a target to empty it', 3, 'What gets measured becomes a problem worth solving.'],
        ['Expand it so it never overflows', 0, 'A bigger lot is a bigger hiding place.'],
        ['Ignore it while output targets are met', 0, 'Rework and finished inventory are costs that the output figure hides.']] }
    ],
    rv: { name: 'Toyota Motor Manufacturing, U.S.A. (Georgetown, Kentucky)', when: '1992', story: '<p>Toyota’s Kentucky plant built the Camry using the Toyota Production System, including just-in-time, sequenced seat deliveries from a single supplier and the andon cord that lets any worker stop the line. Seat defects had grown into a chronic problem, with cars waiting in an overflow area for replacement seats.</p><p>The case asks assembly manager Doug Friesen to decide what to do. Its lesson is the system’s own: stop to fix problems, trace them to root causes with suppliers and engineers, and never let buffers and workarounds hide them.</p>', lesson: 'Lean systems work because they expose problems; inventory and workarounds quietly switch that off.', read: 'HBS case “Toyota Motor Manufacturing, U.S.A., Inc.” (Mishina).' }
  },
  {
    id: 'fast', cat: 'ops', level: 'guided', title: 'Fashion in Fifteen Days', firm: 'Vela Moda', when: '2003', mins: 12,
    role: 'You run operations at a European clothing retailer that designs, makes and sells its own fashion.',
    teaches: 'Supply chain responsiveness · near-sourcing · small batches',
    blurb: 'A clothing chain that can get a new design into stores in a few weeks is told it could save money by moving all production to Asia. What do you do?',
    brief: '<p>Vela Moda designs and sells its own clothes in hundreds of stores across Europe and beyond. Instead of committing to most of a season’s range months ahead, it makes much of it close to the season, in small batches, and ships new items to every store twice a week. Popular items are restocked; slow ones disappear quickly.</p><p>A consultant points out that factories in Asia could make the same garments for noticeably less per piece, and that big seasonal orders and national ad campaigns are what most rivals use.</p>',
    note: 'The cheapest garment is not the cheapest one to sell.',
    ex: [{ t: 'Vela Moda against a typical rival', h: ['Measure', 'Vela Moda', 'Typical rival'], r: [['New items a year', 'About 11,000', '2,000 to 4,000'], ['Time to bring a new design to stores', 'A few weeks', 'Six to nine months'], ['Deliveries to each store', 'Twice a week', 'A few times a season'], ['Advertising, share of sales', 'About 0.3%', '3 to 4%']] }],
    qs: [
      { q: 'Where do you make your clothes?', hint: 'Which garments need speed, and which only need low cost?', o: [
        ['Move everything to Asia to cut unit costs', 0, 'You would save on each piece and lose the speed that avoids markdowns and keeps stores fresh.'],
        ['Make fashion items close to home for speed, and basics far away for cost', 3, 'Match the supply chain to the product: speed where trends change, cost where they do not.'],
        ['Make everything close to home', 1, 'Speed everywhere costs too much on basics like plain T-shirts.']] },
      { q: 'How do you plan quantities?', o: [
        ['Small batches, frequent deliveries and quick reorders of what sells', 3, 'Small batches cut the cost of being wrong: fewer markdowns and fewer unsold clothes.'],
        ['Large orders well before the season, for the best price', 0, 'Big early bets lock you into forecasts that fashion will prove wrong.'],
        ['Order everything mid-season', 1, 'Some commitment early is fine; the point is to keep most of it flexible.']] },
      { q: 'Should you spend like rivals on advertising?', o: [
        ['Yes, national campaigns each season', 0, 'Your fresh stock and prime store locations already bring people back often.'],
        ['No: put the money into store locations and windows, and let fast-changing stock bring people back', 3, 'Customers learn that an item may be gone next week, so they visit often and buy now.'],
        ['Only online advertising', 1, 'The store itself is the advertisement in this model.']] }
    ],
    rv: { name: 'Zara (Inditex)', when: '2003', story: '<p>Zara made fashion-sensitive items mainly in Spain, Portugal and Morocco, in small batches, and sourced basics from lower-cost countries. Stores received deliveries twice a week, and the company launched around 11,000 items a year against a few thousand for rivals, while spending only a fraction of a per cent of sales on advertising.</p><p>Inditex became the world’s largest fashion retailer by sales.</p>', lesson: 'Responsiveness can be worth more than low unit cost when demand is hard to forecast.', read: 'HBS case “ZARA: Fast Fashion” (Ghemawat and Nueno).' }
  },
  {
    id: 'sight', cat: 'ops', level: 'guided', title: 'Sight for All', firm: 'Meenakshi Eye Hospitals', when: '1993', mins: 12,
    role: 'You help run a chain of eye hospitals in South India whose mission is to end needless blindness, mostly from cataracts.',
    teaches: 'Service operations · cross-subsidy pricing · high-volume, high-quality processes',
    blurb: 'Millions of people are blind from cataracts that a short operation could cure, and most cannot pay. How do you treat them at scale, with high quality, and still cover your costs?',
    brief: '<p>Founded in 1976 with 11 beds by a retired government eye surgeon, the hospital now treats hundreds of thousands of patients a year. Most of them are poor, many come from village eye camps, and most pay nothing or very little. Yet the hospital covers its costs without relying on donations.</p><p>Its surgeons do several times as many cataract operations as the average Indian eye surgeon, with outcomes that match the best hospitals. Imported artificial lenses, the best treatment, cost many times what most patients could ever pay.</p>',
    note: 'Who pays, and how much, can be a design choice rather than a fixed fact.',
    ex: [{ t: 'How the model works', h: ['Feature', 'Paying patients', 'Free patients'], r: [['Surgeons and outcomes', 'Same', 'Same'], ['Rooms and food', 'Private or semi-private', 'Shared wards'], ['Choice of fee', 'Patients choose', 'No charge'], ['Reached through', 'Referrals and walk-ins', 'Village eye camps']] }],
    qs: [
      { q: 'How do you price surgery?', hint: 'Can the same operation be sold at different prices fairly?', o: [
        ['Charge everyone the same modest fee', 1, 'A fee most villagers cannot afford still excludes the people you exist to serve.'],
        ['Let patients choose: those who pay for comfort subsidise free care with the same surgeons', 3, 'Patients choose by amenities, not medical quality, so the paying wards fund the free ones fairly.'],
        ['Free for everyone, funded by donations', 1, 'Donations rarely scale to millions of operations and can dry up.']] },
      { q: 'How do you raise surgical output without hurting quality?', o: [
        ['Hire many more surgeons', 1, 'Surgeons are the scarcest and most expensive resource; adding them is slow.'],
        ['Redesign the work: trained nurses and technicians do everything except the operation itself, and each surgeon works across two tables', 3, 'Like an assembly line, the scarce skill is used only where it is irreplaceable, and standard routines raise quality.'],
        ['Buy faster equipment', 1, 'Equipment helps, but the bottleneck is how the surgeon’s time is used.']] },
      { q: 'Imported lenses are far too expensive. What do you do?', o: [
        ['Make your own lenses to international standards', 3, 'Making lenses in-house cuts the cost to a fraction and can supply other countries too.'],
        ['Negotiate a bulk discount with importers', 1, 'Discounts help a little; the price is still far beyond your patients.'],
        ['Use older surgery without lenses', 0, 'Worse outcomes for the poor would betray the mission.']] }
    ],
    rv: { name: 'Aravind Eye Hospital, Madurai', when: '1976–1993', story: '<p>Dr G. Venkataswamy (“Dr V”) founded Aravind in 1976 with 11 beds. Paying patients chose their level of comfort and subsidised free patients, who received the same surgery. Aravind’s nurses and technicians took on everything except surgery itself, so its surgeons operated at several times the national average with excellent results.</p><p>In 1992 Aravind founded Aurolab, which made intraocular lenses for a fraction of the imported price and later exported them worldwide. Aravind has since performed millions of eye operations.</p>', lesson: 'Process design and smart pricing can make high quality and low cost go together.', read: 'HBS case “Aravind Eye Hospital, Madurai, India: In Service for Sight” (Rangan).' }
  }
]);
