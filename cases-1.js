/* Case Room data, part 1: strategy and finance cases. Original write-ups of public facts; companies are disguised until the reveal. */
window.CaseRoomData = (window.CaseRoomData || []).concat([
  {
    id: 'memory', cat: 'strategy', level: 'standard', title: 'The Memory Maker', firm: 'Mesa Ridge Semiconductor', when: 'The mid-1980s', mins: 15,
    role: 'You run a chip company, with your co-founder as chairman, and the business that made your name is losing money.',
    teaches: 'Strategic inflection points · exit decisions · how resource allocation shapes strategy',
    blurb: 'A pioneer of memory chips watches overseas rivals take the market it invented. Do you fight for memories, or bet the company on a newer product line?',
    brief: '<p>Mesa Ridge invented the market for dynamic memory chips in the early 1970s, and its engineers still see memories as the company’s identity and its “technology driver”: the product that proves each new manufacturing process.</p><p>Since the late 1970s, large overseas manufacturers have built enormous memory plants with patient, low-cost capital. They now sell most of the world’s memory chips, and your share has shrunk to a few per cent. When the industry cycle turned in 1985, memory prices collapsed and every memory line you run loses money.</p><p>Meanwhile a smaller business has grown almost unnoticed: microprocessors, the chips at the heart of the personal computer, where your designs are the industry standard. Your newest 32-bit processor is ready to launch.</p>',
    note: 'Ask what a new chief executive with no history here would do.',
    ex: [{ t: 'Company results, $ millions', h: ['Year', 'Revenue', 'Net income'], r: [['1983', '1,122', '116'], ['1984', '1,629', '198'], ['1985', '1,365', '2'], ['1986 (forecast if nothing changes)', 'falling', 'heavy loss']], n: 'Memory prices fell sharply through 1985 as overseas capacity came on stream.' }],
    qs: [
      { q: 'What do you do about the memory business?', hint: 'Where do you still have an advantage, and where are you just one supplier among many?', o: [
        ['Build a new plant for the next memory generation to win back scale', 0, 'This is a capital war against rivals with cheaper money and bigger plants, in a product where you no longer lead.'],
        ['Leave memories and put the company’s plants and talent behind microprocessors', 3, 'You leave the commodity fight and concentrate where you set the standard. It is painful, but it plays to your one durable advantage.'],
        ['Stay in memories at small scale as the “technology driver”', 1, 'Comforting, but a money-losing product is a costly way to develop processes, and it keeps the organisation’s attention split.'],
        ['Lobby for trade protection and wait for prices to recover', 1, 'Trade action may help at the margin, but it is not a strategy, and the cost gap remains.']] },
      { q: 'Your plants assign wafer capacity by margin per wafer. What has that rule been doing for the last few years?', o: [
        ['Quietly moving capacity away from memories towards processors and other higher-margin chips', 3, 'Exactly. Middle managers following a simple rule had already shifted the company before top management decided to. Strategy is what you do, not what you say.'],
        ['Protecting memories, because they run in such high volume', 0, 'Volume is not margin. A margin-based rule starves a commodity product of capacity.'],
        ['Nothing much; capacity follows the official strategy', 0, 'Official strategy said memories mattered most, yet the allocation rule pointed elsewhere. That gap is the point of the case.']] },
      { q: 'Your new 32-bit processor is ready. Large customers want a second supplier licensed to make it, as before. What do you do?', o: [
        ['License two or three second sources, as customers ask', 1, 'Second sources reassure customers but hand rivals your design and cap your prices.'],
        ['Be the only source, and invest heavily in reliable supply to earn customers’ trust', 3, 'Sole sourcing captures the value of the standard, provided you never let customers down on supply.'],
        ['License it widely so it becomes the standard faster', 1, 'It already is the standard path. Wide licensing gives away the margin you need to fund the next generation.']] },
      { q: 'The exit means closing older plants. How do you handle the workforce?', o: [
        ['Close the memory plants and cut about a quarter of jobs at once, protecting processor research', 3, 'A clean, fast cut is painful but credible, and it keeps the money flowing to where the future is.'],
        ['Cut everyone’s pay and keep all jobs until the cycle turns', 1, 'Shared pain can work in a short downturn, but this is not a cycle: the memory business is not coming back.'],
        ['Keep everyone and wait for memory prices to recover', 0, 'Waiting turns a hard decision into a crisis.']] }
    ],
    rv: { name: 'Intel', when: '1985–1986', story: '<p>Intel invented the dynamic memory market with the 1103 in 1970, but Japanese producers took it over in the early 1980s. In 1985 Andy Grove asked Gordon Moore what a new CEO would do if the board threw them out. “He would get us out of memories,” Moore said. “Why shouldn’t you and I walk out the door, come back, and do it ourselves?” asked Grove.</p><p>Intel left memories in 1985, cut about a third of its workforce, closed plants and lost $173 million in 1986. It had launched the 386 processor in late 1985 and chose to be its only source. Researchers later found that Intel’s margin-per-wafer rule had already moved capacity out of memories before the decision was made.</p>', lesson: 'Strategic inflection points are visible first to the people closest to the money; leaders must be willing to fire themselves from the business they love.', read: 'Stanford GSB case “Intel Corporation (A): The DRAM Decision” (Burgelman); HBS case “Intel Corp.—1968–1997” (Yoffie); Andrew Grove, Only the Paranoid Survive (1996).' }
  },
  {
    id: 'yellowbox', cat: 'strategy', level: 'standard', title: 'The Yellow Box', firm: 'Ellery Imaging', when: '1990s and 2000s', mins: 15,
    role: 'You lead strategy at the world’s most famous photography company as digital imaging arrives.',
    teaches: 'Disruptive technology · cannibalisation · where profit moves in a new value chain',
    blurb: 'Your own engineers built a digital camera years ago. Film still earns extraordinary margins. How do you move a giant before the market moves without you?',
    brief: '<p>Ellery Imaging sells film, paper, chemicals and processing: a “razor and blades” business in which the camera is cheap and every photograph earns money. Film margins are among the highest of any manufacturer, and the company employs about 100,000 people.</p><p>In 1975 one of your engineers built a working digital camera. Through the 1980s and 1990s the company spent billions on digital research and holds valuable patents. But a digital photograph needs no film, no paper and no processing, and in digital the profit sits with chips, software, cameras sold by electronics firms, and whoever controls how pictures are shared.</p>',
    note: 'The question is not whether digital wins; it is who captures the profit when it does.',
    ex: [{ t: 'Where the money is', h: ['Step', 'Film world', 'Digital world'], r: [['Capture', 'Camera (low margin)', 'Camera or phone (electronics makers)'], ['Medium', 'Film (very high margin)', 'Memory card (commodity)'], ['Processing', 'Labs and chemicals (high margin)', 'Software (free or bundled)'], ['Output', 'Prints on paper', 'Screens; some home or kiosk prints'], ['Sharing', 'Envelopes and albums', 'Online services']] }],
    qs: [
      { q: 'In the 1990s, how do you organise your digital effort?', hint: 'Think about which part of the company would have to lose for digital to win.', o: [
        ['A separate digital business with its own profit target and freedom to cannibalise film', 3, 'A unit that is not judged against film’s margins can build a digital business on digital economics.'],
        ['Use digital to enhance film: scan film to discs and add features to film cameras', 1, 'Hybrids protect the core for a while but delay learning the real digital business.'],
        ['Launch digital cameras through the film division as fast as possible', 2, 'Speed helps, but managers rewarded on film margins will slow-walk products that kill film.'],
        ['Wait until digital quality matches film', 0, 'By then electronics firms own the customer and the standards.']] },
      { q: 'By the early 2000s you are a top seller of consumer digital cameras, at thin margins. Where do you bet on future profit?', o: [
        ['Printing digital photos at home and in shops: inks, paper and kiosks', 1, 'A logical extension of the old model, but people stopped printing as screens and sharing took over.'],
        ['Online photo sharing, building the place where people keep and show their pictures', 3, 'In hindsight the value moved to sharing. The company even owned an early photo-sharing site and later sold it.'],
        ['Selling imaging chemistry and materials to other industries', 2, 'This is the path a major rival took into cosmetics, medical and materials; it saved that company.'],
        ['Cameras, by being the biggest maker', 0, 'Cameras became a commodity, and then phones replaced them.']] },
      { q: 'Film sales now fall by a quarter a year. What is your priority?', o: [
        ['Shrink film fast and diversify the chemistry into new markets', 3, 'Cutting fast and redeploying capabilities is what kept the rival alive.'],
        ['Bet the company on inkjet printers with cheaper ink', 1, 'This is what the company did; it never earned enough to replace film.'],
        ['Defend film with price cuts to keep volume', 0, 'This accelerates the cash drain in a market that is not coming back.'],
        ['Earn licence income from your digital patents while you restructure', 2, 'Patents brought in real money, but royalties alone cannot carry a company of this size.']] }
    ],
    rv: { name: 'Eastman Kodak', when: '1975–2012', story: '<p>Kodak engineer Steve Sasson built the first digital camera in 1975. Kodak invested heavily in digital, launched hybrid film formats, led US digital camera sales in the mid-2000s at thin margins, bet on consumer inkjet printers in 2007, and owned the photo site Ofoto (later Kodak Gallery).</p><p>Film demand collapsed in the 2000s. Kodak filed for Chapter 11 bankruptcy in January 2012, sold its digital imaging patents and emerged in 2013 as a much smaller commercial imaging company. Its rival Fujifilm cut film early and redeployed its chemistry into cosmetics, pharmaceuticals and materials.</p>', lesson: 'Incumbents rarely miss the technology; they miss the business model, because the old model’s margins judge every new idea.', read: 'HBS case “Kodak and the Digital Revolution (A)” (Gavetti, Henderson and Giorgi).' }
  },
  {
    id: 'split', cat: 'strategy', level: 'guided', title: 'The Split', firm: 'Reelbox', when: '2011', mins: 12,
    role: 'You are chief executive of a fast-growing home entertainment service with 24 million subscribers.',
    teaches: 'Pricing changes · customer communication · managing a business in transition',
    blurb: 'Streaming is the future, discs are the profitable present, and content costs are about to jump. How do you reprice and reorganise without losing your customers’ trust?',
    brief: '<p>Reelbox began by mailing DVDs and now streams films and TV online. Most of its 24 million US members pay $9.99 a month for unlimited streaming plus one DVD at a time. Streaming is growing fast; the DVD business is shrinking but profitable.</p><p>Studios have realised what streaming rights are worth: licence fees are set to rise several-fold over the next few years. You want to fund streaming and stop subsidising discs. One option on your desk splits the bundle into two plans of $7.99 each, a 60% rise for anyone who wants both. Another goes further and spins the DVD business off under a new brand and website.</p>',
    note: 'Customers judge a price change by what it says about how you see them.',
    ex: [{ t: 'Plans before and after the proposed split', h: ['Plan', 'Before', 'Proposed'], r: [['Streaming only', '$7.99', '$7.99'], ['One DVD at a time only', '–', '$7.99'], ['Streaming plus one DVD', '$9.99', '$15.98']], n: 'Most members are on the combined plan.' }],
    qs: [
      { q: 'How do you change prices?', hint: 'Who bears the change, how suddenly, and how is it explained?', o: [
        ['Split the plans now and announce it in a short blog post', 1, 'Economically defensible, but a 60% rise announced abruptly feels like a betrayal to loyal members.'],
        ['Raise prices in steps, protect existing members for a while, and explain the content costs openly', 3, 'Same destination, far less anger: customers accept costs they understand and that do not ambush them.'],
        ['Keep $9.99 and absorb the content costs', 1, 'Safe for now, but it starves the streaming investment the business needs.'],
        ['Drop DVDs entirely', 0, 'You would throw away a profitable business and millions of members who still rely on it.']] },
      { q: 'Members are furious and cancelling. Do you also spin off the DVD business under a new brand and website?', o: [
        ['Yes: a separate brand lets each business focus', 0, 'Two websites, two bills and two queues add a second shock to the first. Customers see more hassle, not more focus.'],
        ['No: keep one brand and one site, apologise for how the change was handled', 3, 'Owning the mistake and removing hassle is the fastest way to stop the bleeding.'],
        ['Sell the DVD business to a rival', 1, 'It may come later, but selling in the middle of a backlash locks in a poor price and more disruption.']] },
      { q: 'Content costs keep rising. What protects the business in the long run?', o: [
        ['Exclusive and original shows that members cannot get anywhere else', 3, 'Owning content turns a cost that studios can raise into an asset that you control.'],
        ['Licensing large libraries of older films more cheaply', 1, 'Useful filler, but it does not make anyone join.'],
        ['Competing mainly on a lower price', 0, 'A price war against companies with deeper pockets is not a defence.']] }
    ],
    rv: { name: 'Netflix', when: 'July to October 2011', story: '<p>In July 2011 Netflix split its $9.99 streaming-and-DVD plan into two $7.99 plans. In September Reed Hastings apologised for the way it was handled, then announced Qwikster, a separate DVD brand and website. Netflix dropped Qwikster within weeks, in October 2011.</p><p>Netflix lost about 800,000 US subscribers in the July–September quarter, and its share price fell by roughly three-quarters between July and November. It then turned to original shows, starting with House of Cards in 2013, and became the world’s largest streaming service.</p>', lesson: 'A correct strategy can still fail if customers learn about it as a surprise bill.', read: 'HBS case “Netflix in 2011” (Shih and Kaufman); IMD case “Netflix (B): The 2011 fiasco”.' }
  },
  {
    id: 'brick', cat: 'strategy', level: 'standard', title: 'The Brick Maker', firm: 'Kubik Toys', when: '2004', mins: 15,
    role: 'You have just become chief executive of a family-owned toy maker that is close to running out of cash.',
    teaches: 'Turnarounds · focus and complexity · innovation within constraints',
    blurb: 'A beloved toy company has diversified into everything from theme parks to clothing, and it is losing money fast. What do you cut, what do you keep, and how do you innovate again?',
    brief: '<p>Kubik’s plastic building bricks are loved worldwide, but children have more choices than ever: video games, licensed toys and cheap imitations. Over the past decade management chased growth into theme parks, clothing, video games, TV and new toy lines that had little to do with the brick.</p><p>Sales fell by about a quarter in 2003 and the company made a heavy loss; 2004 is worse. The number of distinct parts and colours has roughly doubled, to over 12,000, so most parts are made in tiny volumes. The family owners have asked you, a 35-year-old former consultant, to save the company.</p>',
    note: 'Turnarounds run in order: survive, then focus, then grow.',
    ex: [{ t: 'Where the complexity sits', h: ['Measure', 'About'], r: [['Distinct parts and colours', '12,000+'], ['Share of parts used in only one set', 'Very high'], ['Theme parks owned', 'Four'], ['New product lines in the last decade', 'Dozens, many outside building toys']] }],
    qs: [
      { q: 'What is your first priority?', hint: 'A company that runs out of cash does not get to execute a strategy.', o: [
        ['Cut complexity and costs hard, and run for cash before anything else', 3, 'Survival first: fewer parts, fewer lines and a cash focus buy the time for a strategy.'],
        ['Grow out of trouble with more media and lifestyle products', 0, 'This is the diversification that caused the crisis.'],
        ['Cut prices to win back volume', 1, 'Lower prices on a high-cost range deepen the losses.'],
        ['Sell the company to a large toy rival', 0, 'The owners asked for a turnaround, and a distressed sale destroys the value you could rebuild.']] },
      { q: 'The theme parks need large investments. What do you do?', o: [
        ['Sell a majority stake to a professional parks operator and license the brand', 3, 'Cash now, a partner who knows parks, and the brand stays visible.'],
        ['Keep and expand them; they build the brand', 0, 'They do build the brand, but you cannot fund capital-hungry parks while your core loses money.'],
        ['Close them', 1, 'Closing destroys value that a buyer would pay for.']] },
      { q: 'How do you restart innovation?', o: [
        ['Innovate within the brick system: themes, sets and ideas from adult fans', 3, 'Constraints focus creativity, and the brick system is your unique asset.'],
        ['Let designers create freely across any category', 1, 'Unconstrained creativity created the complexity you are now cutting.'],
        ['Freeze all new products until profits return', 0, 'Toys live on novelty; a freeze starves the shelves.']] }
    ],
    rv: { name: 'The LEGO Group', when: '2003–2008', story: '<p>LEGO lost heavily in 2003 and 2004. Jørgen Vig Knudstorp, a former McKinsey consultant, became chief executive in October 2004. He cut the number of unique elements from about 12,900 to roughly 7,000, sold a majority of the LEGOLAND parks to Merlin Entertainments in 2005, and refocused on the core brick, with themes such as Star Wars and City and ideas from adult fans.</p><p>LEGO returned to profit and grew for a decade, overtaking Mattel to become the world’s largest toy maker by revenue in 2014.</p>', lesson: 'In a turnaround, focus is a strategy: fewer, better things, built on what only you can do.', read: 'IMD case “LEGO (A): The Crisis”; HBS Working Knowledge, “Innovation under constraint: constructing a turnaround at LEGO”; David Robertson, Brick by Brick (2013).' }
  },
  {
    id: 'studio', cat: 'finance', level: 'expert', title: 'The Studio Deal', firm: 'Castleton Studios and Lumen Animation', when: '2005–2006', mins: 20,
    role: 'You are the new chief executive of a large entertainment group whose animation studio has lost its touch.',
    teaches: 'Acquisition valuation · paying for capabilities · deal structure',
    blurb: 'Your distribution deal with the world’s best animation studio is ending, and your own animators have produced a string of flops. Do you buy the studio, and what could justify the price?',
    brief: '<p>Castleton is a media group with theme parks, consumer products and TV networks, all fed by animated characters. For a decade it has co-financed and distributed the films of Lumen Animation, a computer-animation studio whose every feature has been a critical and box-office hit. Talks to renew the deal broke down; the last film under it arrives this year.</p><p>Castleton’s own animation studio has made a series of disappointments. Lumen’s owner wants a sale, not a new distribution deal, and a price of about $7.4 billion in your shares is being discussed. Lumen holds about $1 billion in cash.</p>',
    note: 'Separate what the films are worth from what the people might be worth.',
    ex: [{ t: 'Lumen’s features so far', h: ['Year', 'Film type', 'Result'], r: [['1995', 'First computer-animated feature', 'Huge hit'], ['1998–2001', 'Three features', 'All hits'], ['2003', 'Underwater adventure', 'Biggest animated film of its time'], ['2004', 'Superhero family', 'Hit'], ['2006', 'Racing cars (last film under the deal)', 'Expected hit']] }],
    qs: [
      { q: 'What do you do?', o: [
        ['Let the deal lapse and rebuild your own studio', 1, 'Possible, but it takes years and you lose the best creative team in the business to a rival.'],
        ['Offer a richer distribution deal instead of buying', 1, 'The owner wants a sale; a bigger split only postpones the question.'],
        ['Buy Lumen and put its leaders in charge of all your animation', 3, 'You buy a creative process and the people who run it, and use them to fix your own studio.'],
        ['Buy Lumen and fold it into your existing studio', 0, 'Folding the better culture into the weaker one destroys what you paid for.']] },
      { q: 'Value the films alone: assume $250 million of free cash flow a year, growing 3% a year for ever, discounted at 9%. What are they worth, in $ billions?', num: { label: 'Value of the film stream', ans: 4.17, tol: [0.15, 0.5, 1.2], unit: ' $bn', dec: 2, min: 0, max: 50, step: 0.1, hint: 'A growing perpetuity: cash flow ÷ (discount rate − growth).' }, fb: 'Value = $250M ÷ (9% − 3%) ≈ $4.2 billion. Net of $1 billion cash, the $7.4 billion price is about $6.4 billion, well above the films alone.' },
      { q: 'What would you have to believe to justify the price?', o: [
        ['Lumen’s people and process will revive your own animation and feed parks, products and sequels across the group', 3, 'The gap is paid for by capabilities and franchises used across the whole company, not by Lumen’s own films.'],
        ['Lumen’s films will keep growing 20% a year for ever', 0, 'No film studio grows 20% a year for ever; this is wishful arithmetic.'],
        ['Big cost savings from closing one of the two studios', 0, 'Animation value is creative, not overhead; cutting it destroys the asset.'],
        ['Tax benefits from the deal', 0, 'Tax is not the reason to pay a large premium for a studio.']] },
      { q: 'How do you pay?', o: [
        ['In shares, so Lumen’s owner and staff become your shareholders', 3, 'Shares keep the people invested in the combined company and avoid loading it with debt.'],
        ['In cash, borrowed against the group', 1, 'Cash buys out the very people you need to stay motivated, and adds debt.'],
        ['Half cash, half earn-out tied to box office', 2, 'Earn-outs can align incentives, but they invite fights over accounting with creative leaders.']] }
    ],
    rv: { name: 'The Walt Disney Company and Pixar', when: 'January 2006', story: '<p>Pixar’s distribution deal with Disney was running out, and talks had broken down between Steve Jobs and Michael Eisner. Bob Iger became Disney’s chief executive in 2005 and agreed to buy Pixar for about $7.4 billion in Disney shares, announced in January 2006. Jobs became Disney’s largest individual shareholder, and Pixar’s Ed Catmull and John Lasseter took charge of Disney’s own animation studio as well.</p><p>Disney Animation recovered, culminating in Frozen (2013), one of the highest-grossing animated films ever, while Pixar’s Toy Story 3 passed $1 billion at the box office.</p>', lesson: 'When you buy capabilities, the deal is only worth what you do with the people afterwards.', read: 'HBS case “The Walt Disney Company and Pixar, Inc.: To Acquire or Not to Acquire?”; Robert Iger, The Ride of a Lifetime (2019).' }
  }
]);
