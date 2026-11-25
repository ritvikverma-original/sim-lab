/* Case Room data, part 3: operations, marketing and people cases. Original write-ups of public facts; companies are disguised until the reveal. */
window.CaseRoomData = (window.CaseRoomData || []).concat([
  {
    id: 'tiffin', cat: 'ops', level: 'guided', title: 'The Lunchbox Network', firm: 'A lunchbox delivery network in a coastal megacity', when: 'Today', mins: 12,
    role: 'You advise the association of several thousand delivery workers who carry home-cooked lunches across a crowded city every day.',
    teaches: 'Service operations · simple coding systems · organisation and incentives',
    blurb: 'About two hundred thousand lunchboxes cross a megacity by suburban train every day, with almost no mistakes and no computers. A start-up wants to modernise it. What would you change?',
    brief: '<p>Every morning, workers collect home-cooked lunches in metal boxes from homes in the suburbs, carry them by bicycle and handcart to stations, ride the suburban trains into the city and deliver them to offices by lunchtime. In the afternoon the empty boxes go back the same way. The network has run for over a century.</p><p>Boxes change hands several times. Each carries a short painted code of letters, numbers and colours showing the station of origin, the destination station, the building and the floor. Many workers have little formal schooling. They work in small self-managed groups that share income, keep strict timings and are known for mistakes so rare that they are quoted as a few in millions.</p>',
    note: 'Before you add technology, ask what the current system does well, and why.',
    ex: [{ t: 'How a box travels', h: ['Leg', 'Who', 'What makes it reliable'], r: [['Home to local station', 'Collector', 'Fixed routes and times'], ['Sorting at the station', 'Group', 'Colour and letter codes'], ['Train ride', 'Group', 'Fixed trains; boxes stay together by destination'], ['Station to office', 'Deliverer', 'Building and floor codes; same person daily']] }],
    qs: [
      { q: 'A start-up offers to replace the painted codes with an app, barcodes and GPS tracking. What do you advise?', hint: 'What does the painted code need that an app would need too?', o: [
        ['Replace the codes with the app across the network', 1, 'The codes are fast, cheap, robust and readable by everyone; the app adds failure points and training without fixing a real problem.'],
        ['Keep the code and the relay, and use technology at the edges, such as booking and payments', 3, 'Digitise what customers touch, and leave the core that works alone.'],
        ['Centralise sorting in one big hub', 0, 'A hub adds distance and a single point of failure to a system that sorts on the move.']] },
      { q: 'How should the workers be organised?', o: [
        ['As salaried employees of a delivery company', 1, 'Salaries weaken the shared ownership that makes each group cover for each other.'],
        ['In small self-managed groups that share income and enforce their own discipline', 3, 'Shared income and peer pressure keep timings tight without managers.'],
        ['As freelancers paid per box', 0, 'Pay per box rewards individual speed over the hand-offs that make the relay work.']] },
      { q: 'Office workers now eat out more and order food by app. Where should the network grow?', o: [
        ['Carry restaurant and app orders on the same routes and timings', 3, 'It uses the network’s strengths, routes, timings and trust, for a growing market.'],
        ['Deliver parcels anywhere at any time', 1, 'Any-time, any-place delivery breaks the fixed timetable that makes the system reliable.'],
        ['Stay exactly as it is', 1, 'The core should stay, but a shrinking market needs new sources of demand.']] }
    ],
    rv: { name: 'The dabbawalas of Mumbai', when: 'Since 1890', story: '<p>About 5,000 dabbawalas deliver around 200,000 tiffin boxes a day across Mumbai using the suburban trains, a painted code and a relay of hand-offs. Many have little formal education. They work in small groups under an association and share income, and their reliability has been studied by business schools and companies around the world.</p><p>In recent years they have added SMS and online booking and tied up with food businesses, while keeping the coding system and the relay.</p>', lesson: 'Simplicity, standard routines and the right incentives can beat technology in reliability.', read: 'HBS case “Mumbai’s Models of Service Excellence” (Thomke).' }
  },
  {
    id: 'peoplescar', cat: 'marketing', level: 'standard', title: 'The People’s Car', firm: 'Sahyog Motors', when: '2008–2010', mins: 15,
    role: 'You lead marketing for a car designed to cost about one lakh rupees, so that families who ride four to a scooter can afford a car.',
    teaches: 'Positioning · product launch · managing a product crisis',
    blurb: 'Engineers have built a car at an unheard-of price. Now you have to sell it to people who have never owned one, and who care what their neighbours think.',
    brief: '<p>Sahyog Motors’ chairman once saw a family of four riding a scooter in the rain and asked his engineers for a safe, all-weather car that such families could afford. The result is a small four-seater with a rear engine, priced at about one lakh rupees, a fraction of the cheapest car on sale.</p><p>The world’s press calls it the world’s cheapest car. The plant has had to move states after farmers protested about land, which delayed the launch. Demand at the first booking round is huge. But buyers of a first car in India often see it as a statement of success.</p>',
    note: 'A price is a fact; “cheapest” is a label people may not want to be seen with.',
    ex: [{ t: 'Who might buy', h: ['Segment', 'What they want', 'What they fear'], r: [['Two-wheeler families', 'Safety and dignity', 'Being seen in a “cheap” car'], ['Urban second-car buyers', 'Easy parking, low running cost', 'Quality and resale'], ['Small businesses', 'Low-cost transport', 'Durability']] }],
    qs: [
      { q: 'How do you position the car?', o: [
        ['As the world’s cheapest car', 0, 'It got headlines, but it told aspiring buyers that the car was a sign of not being able to afford better.'],
        ['As a safe, modern family car that moves you up from a scooter', 3, 'Lead with aspiration and safety; let the price be the pleasant surprise.'],
        ['As a city car for well-off families', 1, 'A real segment, but it abandons the mission and the volume.']] },
      { q: 'How do you sell and finance it?', o: [
        ['Through existing city dealers, cash or normal car loans', 1, 'First-time buyers in small towns rarely walk into city showrooms or qualify for normal loans.'],
        ['New small-town outlets, easy loans and a buying experience that feels like a car purchase', 3, 'Reach and finance are what turn latent demand into sales.'],
        ['Online only', 0, 'First-time buyers want to see, touch and test the car.']] },
      { q: 'Reports appear of a few cars catching fire. What do you do?', o: [
        ['Say little; the numbers are tiny', 0, 'Silence lets fear define a product whose whole promise is safety.'],
        ['Investigate openly and offer every owner a free safety upgrade', 3, 'A visible, free fix protects trust in a car bought on trust.'],
        ['Cut the price further to restore demand', 0, 'Cheaper only deepens the label you are fighting.']] }
    ],
    rv: { name: 'Tata Nano (Tata Motors)', when: '2008–2018', story: '<p>Ratan Tata unveiled the Nano in January 2008 at a price of about one lakh rupees. Protests over land at Singur in West Bengal forced Tata to move the plant to Sanand in Gujarat. Bookings opened in April 2009 and drew over 200,000 orders, but sales disappointed. Reports of fires in 2010 hurt its image, and Tata offered owners a free upgrade.</p><p>Ratan Tata later said that calling it the cheapest car had been a mistake. Production ended around 2018.</p>', lesson: 'Customers buy what a product says about them as well as what it does.', read: 'HBS case “Tata Nano – The People’s Car” (Palepu and others); Darden case “The Tata Nano: The People’s Car (B)”.' }
  },
  {
    id: 'coffee', cat: 'marketing', level: 'guided', title: 'Forty Million for Speed', firm: 'Cascadia Coffee', when: '2002–2004', mins: 12,
    role: 'You run US store operations at a fast-growing coffee chain whose customer satisfaction is slipping.',
    teaches: 'Customer satisfaction economics · service quality · investment cases for service',
    blurb: 'Drinks have become more complex and queues longer, and satisfaction is falling. Is it worth $40 million a year in extra staff hours to win it back?',
    brief: '<p>Cascadia built its brand on a “third place” between home and work. Growth has been spectacular, but customer surveys show satisfaction scores slipping. Customised drinks take longer to make, peak-hour queues are long, and many baristas are new.</p><p>Research shows that highly satisfied customers visit more often, spend more per visit and stay longer as customers. Operations proposes adding about 20 staff hours a week in every company store, at a cost of about $40 million a year, mainly to cut waiting times.</p>',
    note: 'Service spending is an investment only if you can link it to what customers do.',
    ex: [{ t: 'What drives satisfaction (survey)', h: ['Factor', 'Importance to customers', 'Performance'], r: [['Speed of service', 'High', 'Slipping'], ['Friendly, knowledgeable staff', 'High', 'Good'], ['Drink quality', 'High', 'Good'], ['Store cleanliness', 'Medium', 'Good']] }],
    qs: [
      { q: 'What do you do about the slipping scores?', hint: 'Which factor is both important to customers and slipping?', o: [
        ['Invest in more staff hours at peak times to cut waiting', 3, 'It targets the factor that matters most and is slipping, at the moment when it matters.'],
        ['Cut the menu to speed things up', 1, 'Faster, but it removes the customisation customers come for.'],
        ['Raise prices to fund better pay', 0, 'Higher prices with the same queues makes satisfaction worse.'],
        ['Automate espresso making', 2, 'A real help for speed, but machines alone do not fix understaffed peaks.']] },
      { q: 'Each store would get about $10,000 a year of extra labour. If each extra visit earns $2 of profit, how many extra visits a day, per store, pay for it?', num: { label: 'Extra visits a day', ans: 13.7, tol: [0.5, 2, 5], unit: '', dec: 1, min: 0, max: 500, step: 0.5, hint: '$10,000 ÷ ($2 × 365 days).' }, fb: '$10,000 ÷ $730 ≈ 14 extra visits a day per store, a small number next to the hundreds of customers each store serves.' },
      { q: 'How do you make sure it pays off?', o: [
        ['Track satisfaction, visits and spending by store, and compare stores that got the hours with those that did not', 3, 'A controlled rollout turns a belief into evidence and shows where the hours matter most.'],
        ['Trust that happy customers spend more', 1, 'Probably true, but without measurement you cannot defend the spending in a bad year.'],
        ['Measure only labour cost as a share of sales', 0, 'That measure punishes the investment by design.']] }
    ],
    rv: { name: 'Starbucks', when: '2002–2004', story: '<p>Starbucks’ research showed that highly satisfied customers were worth much more than others, while its satisfaction scores were slipping as drinks became more complex. The company weighed spending about $40 million a year on extra labour to improve service.</p><p>Service quality stayed a recurring theme: in February 2008, after another period of slipping customer experience, Howard Schultz closed more than 7,000 US stores for three hours to retrain baristas.</p>', lesson: 'Link service quality to customer behaviour and money, and test investments before betting on them.', read: 'HBS case “Starbucks: Delivering Customer Service” (Moon and Quelch).' }
  },
  {
    id: 'fair', cat: 'marketing', level: 'standard', title: 'No More Coupons', firm: 'Granton’s', when: '2012', mins: 15,
    role: 'You are chief marketing officer of a 110-year-old department store chain with a new chief executive from the technology industry.',
    teaches: 'Pricing strategy · consumer psychology · testing before rollout',
    blurb: 'A new chief executive wants to end endless sales and coupons and simply charge fair prices every day. Shoppers say they hate coupons. Will they really buy without them?',
    brief: '<p>Granton’s sells clothing and home goods to middle-income families across the country. Like its rivals, it runs hundreds of promotions a year, and most goods sell at a discount. The new chief executive, famous for creating hugely successful technology stores, wants to end the “games”: one everyday price, a few month-long offers and clearance on set Fridays.</p><p>He wants to launch nationally at once, as he did in his previous job, and to redesign stores as collections of small branded shops.</p>',
    note: 'People do not only buy products; some of them buy the feeling of a bargain.',
    ex: [{ t: 'The proposed pricing', h: ['Tier', 'What it means'], r: [['Everyday', 'Prices about 40% below old list prices'], ['Month-long values', 'Themed offers for a whole month'], ['Best prices', 'Clearance on the first and third Fridays']], n: 'Coupons and frequent sales end.' }],
    qs: [
      { q: 'How do you launch the new pricing?', o: [
        ['Nationwide at once, with a big campaign', 0, 'If it fails, it fails everywhere, and you learn too late.'],
        ['Test it in a few regions against similar stores that keep promotions', 3, 'A test shows how real shoppers respond before you bet the company.'],
        ['Keep promotions and focus on the store redesign', 2, 'Safer, though it leaves the pricing question unanswered.']] },
      { q: 'Why might shoppers buy less even though everyday prices are lower?', o: [
        ['They value the thrill of a deal and judge prices against a reference, such as a crossed-out “was” price', 3, 'Without a reference price and a deadline, a fair price feels like no deal at all.'],
        ['They will not notice the change', 0, 'Loyal coupon users notice immediately.'],
        ['Lower prices always mean more sales', 0, 'Not when the perceived value of a deal disappears.']] },
      { q: 'After a year, sales are down by about a quarter. What do you recommend?', o: [
        ['Hold the course; customers need time', 0, 'Every month of waiting costs customers who may not come back.'],
        ['Bring back promotions customers value, keep the best of the store changes, and test any further moves', 3, 'Recover customers first, then rebuild with evidence.'],
        ['Cut prices even further', 0, 'The problem is not the level of prices but how they feel.']] }
    ],
    rv: { name: 'J.C. Penney', when: '2012–2013', story: '<p>Ron Johnson, who created Apple’s retail stores, became J.C. Penney’s chief executive in late 2011. In February 2012 he launched “Fair and Square” pricing nationally, without testing: everyday low prices, month-long values and best prices on the first and third Fridays, with most coupons and sales ended.</p><p>Sales fell by about a quarter in 2012, and the company lost close to $1 billion. Johnson was replaced in April 2013, and his predecessor, Myron Ullman, brought back coupons and sales.</p>', lesson: 'Test big changes in customer behaviour before rolling them out; what customers say and what they do can differ.', read: 'HBS case “J.C. Penney’s ‘Fair and Square’ Pricing Strategy”.' }
  },
  {
    id: 'managers', cat: 'people', level: 'guided', title: 'Do Managers Matter?', firm: 'Quanta Search', when: '2008–2010', mins: 12,
    role: 'You lead people analytics at a fast-growing technology company whose engineers think managers add little.',
    teaches: 'People analytics · management behaviours · evidence-based HR',
    blurb: 'Your engineers think managers are a necessary evil. Your company runs on data. Can you prove whether managers matter, and if they do, what good ones actually do?',
    brief: '<p>Quanta Search hires brilliant engineers and gives them unusual freedom. Many of them distrust management. Years ago the founders even tried removing engineering managers altogether; the experiment was quickly reversed when questions about projects and careers piled up with the founders.</p><p>Your team has data on performance reviews, employee surveys and why people leave. You set out to test a sceptical hypothesis: that managers do not matter.</p>',
    note: 'To convince sceptics, use their own standards of evidence.',
    ex: [{ t: 'Data available', h: ['Source', 'What it shows'], r: [['Annual employee survey', 'How people rate their manager'], ['Performance reviews', 'Ratings of managers and their teams'], ['Exit interviews', 'Why people leave'], ['Award nominations', 'Managers praised by their teams']] }],
    qs: [
      { q: 'How do you find out whether managers matter?', o: [
        ['Remove managers in a few teams and see what happens', 0, 'The company already tried that; it caused chaos and proves little.'],
        ['Compare outcomes of teams with the best- and worst-rated managers, then interview managers at both ends', 3, 'Using existing data first, then structured interviews, meets engineers’ standards of evidence.'],
        ['Survey engineers on whether they want managers', 1, 'Opinions are useful, but they are what you are trying to test.']] },
      { q: 'Which behaviour do you expect to matter least in the results?', hint: 'Engineers might be surprised by the answer.', o: [
        ['Being a good coach', 0, 'Coaching came out as the most important behaviour.'],
        ['Showing interest in team members’ success and well-being', 0, 'This mattered a great deal.'],
        ['Deep technical skill', 3, 'Technical skill mattered, but it came last among the eight behaviours identified.'],
        ['Communicating clearly and listening', 0, 'Communication was among the important behaviours.']] },
      { q: 'How do you get managers to improve?', o: [
        ['Rate managers on the behaviours and tie their pay to the scores', 1, 'Tying pay to it early turns development into a contest and invites gaming.'],
        ['Twice-yearly upward feedback on the behaviours, used for development, with training on the weakest ones', 3, 'Feedback for growth, not punishment, got managers to engage and improve.'],
        ['A poster of the behaviours in every office', 0, 'Awareness without feedback rarely changes behaviour.']] }
    ],
    rv: { name: 'Google (Project Oxygen)', when: '2008–2010', story: '<p>Google had briefly removed engineering managers in 2002. In 2008 its People Operations team set out to show that managers did not matter, and found the opposite: teams with better managers performed better and had lower turnover.</p><p>Project Oxygen identified eight behaviours of good managers, led by being a good coach; technical skill came last. Google introduced twice-yearly upward feedback surveys and training on the behaviours, and many managers’ scores improved.</p>', lesson: 'In HR, as elsewhere, evidence beats opinion, especially with a sceptical audience.', read: 'HBS case “Google’s Project Oxygen: Do Managers Matter?” (Garvin and others).' }
  }
]);
