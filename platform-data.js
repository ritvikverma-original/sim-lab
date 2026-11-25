/* Platform data: session lengths, the daily drill rotation, goal tracks and the Playbook of concepts.
   Track step order and concept ids are read by saved preferences: append, do not renumber or rename. */
(function () {
  /* Typical minutes per activity, used by the time filter and to size the next step. Cases read theirs from their length line. */
  const MINS = { boardroom: 75, brandlab: 75, opslab: 40, chainlab: 30, dealroom: 25, crisisroom: 25, markets: 40, capex: 50, product: 40, people: 50, xat: 30, guess: 10, roleq: 20, brand: 8, factory: 6, supply: 5, deal: 5, crisis: 6 };

  /* The five quick simulations: built, short, and until now not reachable from the catalogue. */
  const QUICK = ['deal', 'factory', 'supply', 'brand', 'crisis'];

  /* Daily drill: one ten-minute item a day, the same for everyone that day. Four guesstimates, then a quick simulation. */
  const G = (problem, difficulty) => ({ m: 'guess', cfg: { problem, difficulty } });
  const DAILY = [
    G('tea', 'guided'), G('phones', 'guided'), G('atms', 'standard'), G('salons', 'guided'), { m: 'deal' },
    G('toll', 'standard'), G('cars', 'standard'), G('icecream', 'guided'), G('screens', 'standard'), { m: 'factory' },
    G('weddings', 'standard'), G('delivery', 'standard'), G('pumps', 'guided'), G('stall', 'guided'), { m: 'supply' },
    G('flyers', 'standard'), G('lpg', 'standard'), G('bags', 'standard'), G('locals', 'expert'), { m: 'brand' },
    G('upi', 'expert'), G('hotel', 'standard'), G('pcs', 'standard'), G('buses', 'expert'), { m: 'crisis' }
  ];

  /* Goal tracks. Each step: m (activity), optional cfg (preset options), why (one line). Case steps describe the problem, never the company. */
  const TRACKS = [
    { id: 'explore', t: 'First week', goal: 'Not sure yet', who: 'New here, or still choosing a direction', out: 'A taste of every subject in about two hours, and a first read on your strengths', steps: [
      { m: 'deal', why: 'Five minutes of negotiation: anchors, concessions and walking away.' },
      { m: 'guess', cfg: { problem: 'tea', difficulty: 'guided' }, why: 'Your first market sizing, with hints on.' },
      { m: 'factory', why: 'Find the bottleneck before demand outruns it.' },
      { m: 'case-split', why: 'A short case on a platform that has to choose its customers.' },
      { m: 'brand', why: 'Position a brand, price it and fund awareness.' },
      { m: 'roleq', why: 'Turn what you have done so far into a first view of the roles that fit.' }
    ] },
    { id: 'consulting', t: 'Consulting interviews', goal: 'Consulting', who: 'Preparing for case interviews', out: 'Market sizing at speed, structured problem solving and a full strategy simulation', steps: [
      { m: 'guess', cfg: { problem: 'phones', difficulty: 'guided' }, why: 'Warm up: segment a population and keep the maths clean.' },
      { m: 'guess', cfg: { problem: 'atms', difficulty: 'standard' }, why: 'Supply-side sizing, without the coaching.' },
      { m: 'case-memory', why: 'Diagnose a market leader losing its core business.' },
      { m: 'case-brick', why: 'A turnaround: what to cut and what to protect.' },
      { m: 'guess', cfg: { problem: 'toll', difficulty: 'standard' }, why: 'Capacity and throughput: a classic operations sizing.' },
      { m: 'case-yellowbox', why: 'A disruption case: when do you cannibalise yourself?' },
      { m: 'xat', cfg: { topic: 'Analytical', difficulty: 'standard' }, why: 'Analytical reasoning under time pressure.' },
      { m: 'boardroom', cfg: { difficulty: 'standard', length: 'short' }, why: 'Run a company against rivals for four years.' },
      { m: 'guess', cfg: { problem: 'upi', difficulty: 'expert' }, why: 'An advanced sizing with no hints, as an interviewer would run it.' },
      { m: 'boardroom', cfg: { difficulty: 'expert', length: 'full' }, why: 'The full eight years at Advanced level.' }
    ] },
    { id: 'finance', t: 'Finance and markets', goal: 'Finance', who: 'Heading for corporate finance, banking or investing', out: 'Capital budgeting, valuation and portfolio judgement', steps: [
      { m: 'case-cashcycle', why: 'How a business can grow on its suppliers’ money.' },
      { m: 'capex', cfg: { difficulty: 'guided', length: 'short' }, why: 'Approve or reject plants with NPV, IRR and payback.' },
      { m: 'case-hurdle', why: 'Why one company should use three hurdle rates.' },
      { m: 'markets', cfg: { difficulty: 'guided' }, why: 'Build a portfolio through a decade of cycles.' },
      { m: 'case-studio', why: 'Value an acquisition where the asset is the people.' },
      { m: 'markets', cfg: { difficulty: 'standard', scenario: 'credit' }, why: 'A credit crunch without the coaching.' },
      { m: 'capex', cfg: { difficulty: 'expert', length: 'full' }, why: 'Fifteen years of capital decisions at Advanced level.' }
    ] },
    { id: 'marketing', t: 'Marketing and brand', goal: 'Marketing', who: 'Heading for brand management or growth roles', out: 'Positioning, pricing, launches and a full brand simulation', steps: [
      { m: 'brand', why: 'Five quick periods: position, price, spend.' },
      { m: 'case-coffee', why: 'When speed of service is worth forty million.' },
      { m: 'guess', cfg: { problem: 'icecream', difficulty: 'guided' }, why: 'Size a seasonal consumer market.' },
      { m: 'case-fair', why: 'What happens when a retailer stops discounting.' },
      { m: 'case-peoplescar', why: 'A launch built on a price point.' },
      { m: 'brandlab', cfg: { difficulty: 'standard', length: 'short' }, why: 'Run a brand portfolio against rivals.' },
      { m: 'brandlab', cfg: { difficulty: 'expert', length: 'full' }, why: 'The full simulation at Advanced level.' }
    ] },
    { id: 'ops', t: 'Operations and supply chain', goal: 'Operations', who: 'Heading for operations, supply chain or manufacturing', out: 'Bottlenecks, inventory, the bullwhip and network judgement', steps: [
      { m: 'factory', why: 'Six minutes on capacity and flow.' },
      { m: 'supply', why: 'See the bullwhip from inside one link.' },
      { m: 'case-fast', why: 'A supply chain designed for fifteen-day fashion.' },
      { m: 'case-sight', why: 'High volume, low price, high quality: how?' },
      { m: 'opslab', cfg: { difficulty: 'guided' }, why: 'Run a factory for 240 days.' },
      { m: 'case-tiffin', why: 'A delivery network with almost no errors and no technology.' },
      { m: 'chainlab', cfg: { difficulty: 'standard' }, why: 'Four companies, one chain, no shared information.' },
      { m: 'case-seats', why: 'Fix quality at the source, not at inspection.' },
      { m: 'opslab', cfg: { difficulty: 'expert' }, why: 'The factory at Advanced level.' }
    ] },
    { id: 'product', t: 'Product management', goal: 'Product', who: 'Heading for product or digital roles', out: 'Prioritisation, launches, metrics and a full product simulation', steps: [
      { m: 'case-split', why: 'A platform that must choose which side to serve.' },
      { m: 'guess', cfg: { problem: 'delivery', difficulty: 'standard' }, why: 'Size an app-driven market from the ground up.' },
      { m: 'product', cfg: { difficulty: 'guided' }, why: 'Eight quarters of roadmap, pricing and growth.' },
      { m: 'case-coffee', why: 'When a product change is really an operations change.' },
      { m: 'case-managers', why: 'Use data to settle an argument about management.' },
      { m: 'brand', why: 'Positioning and price, in eight minutes.' },
      { m: 'product', cfg: { difficulty: 'expert' }, why: 'The product simulation at Advanced level.' }
    ] },
    { id: 'people', t: 'People and leadership', goal: 'HR and leadership', who: 'Heading for HR, general management or leading teams', out: 'Incentives, negotiation, crisis leadership and workforce planning', steps: [
      { m: 'deal', why: 'Claim value and create it, in five minutes.' },
      { m: 'crisis', why: 'Lead a team while the facts keep changing.' },
      { m: 'case-managers', why: 'Do managers matter? Test it with evidence.' },
      { m: 'case-english', why: 'A company-wide language mandate: was it right?' },
      { m: 'dealroom', cfg: { difficulty: 'standard' }, why: 'Three full negotiations with real trade-offs.' },
      { m: 'case-piecework', why: 'Pay for output and live with what follows.' },
      { m: 'people', cfg: { difficulty: 'guided' }, why: 'Twelve quarters of hiring, pay and retention.' },
      { m: 'crisisroom', cfg: { difficulty: 'standard' }, why: 'The full crisis simulations.' },
      { m: 'people', cfg: { difficulty: 'expert' }, why: 'Workforce planning at Advanced level.' }
    ] },
    { id: 'core', t: 'MBA core year', goal: 'General management', who: 'In the first year, or about to start', out: 'One pass through every core subject, at Foundation and Intermediate', steps: [
      { m: 'boardroom', cfg: { difficulty: 'guided', length: 'short' }, why: 'Strategy: run a company for four years.' },
      { m: 'capex', cfg: { difficulty: 'guided', length: 'short' }, why: 'Finance: approve or reject capital projects.' },
      { m: 'opslab', cfg: { difficulty: 'guided' }, why: 'Operations: capacity and flow.' },
      { m: 'brandlab', cfg: { difficulty: 'guided', length: 'short' }, why: 'Marketing: position and price a brand portfolio.' },
      { m: 'people', cfg: { difficulty: 'guided' }, why: 'People: hiring, pay and retention.' },
      { m: 'xat', cfg: { topic: 'all', difficulty: 'guided' }, why: 'Decision making and ethics.' },
      { m: 'markets', cfg: { difficulty: 'standard' }, why: 'Investing through a decade of cycles.' },
      { m: 'chainlab', cfg: { difficulty: 'standard' }, why: 'Supply chain with partners you cannot see.' },
      { m: 'product', cfg: { difficulty: 'standard' }, why: 'Product management without the coaching.' },
      { m: 'roleq', why: 'Use the year’s results to see which roles fit.' }
    ] },
    { id: 'judgement', t: 'Judgement and ethics', goal: 'Judgement', who: 'Anyone: the cases where the hard part is deciding', out: 'Decisions under pressure, governance and when to say no', steps: [
      { m: 'xat', cfg: { topic: 'Ethics', difficulty: 'guided' }, why: 'Ethical dilemmas with coaching.' },
      { m: 'case-rugs', why: 'A supplier problem that is not about price.' },
      { m: 'crisis', why: 'Decide before the facts are in.' },
      { m: 'case-eight', why: 'When a sales target becomes the culture.' },
      { m: 'xat', cfg: { topic: 'People', difficulty: 'standard' }, why: 'People dilemmas without the coaching.' },
      { m: 'case-max', why: 'Schedule, cost and safety in one decision.' },
      { m: 'crisisroom', cfg: { difficulty: 'expert' }, why: 'The full crisis simulations at Advanced level.' }
    ] }
  ];

  /* The Playbook: concepts the activities practise. cat matches the catalogue subjects; m lists where each one comes up. */
  const C = (id, t, cat, d, rule, trap, m) => ({ id, t, cat, d, rule, trap, m });
  const CONCEPTS = [
    /* Strategy */
    C('five-forces', 'Industry forces', 'strategy', 'Profit in an industry is set by rivalry, buyer and supplier power, substitutes and the threat of entry.', 'Ask who captures the value before asking how big the market is.', 'Treating a big, fast-growing market as an attractive one.', ['boardroom', 'case-memory', 'case-brick']),
    C('disruption', 'Disruption from below', 'strategy', 'A cheaper, simpler product wins the customers incumbents do not care about, then improves until it reaches theirs.', 'Watch the low end and the non-consumers, not just your best customers.', 'Dismissing a rival because its product is worse today.', ['case-memory', 'case-yellowbox', 'boardroom']),
    C('cannibalise', 'Cannibalise yourself', 'strategy', 'Launching a product that eats your own sales is often better than letting a rival do it.', 'Compare against the future without the launch, not against today.', 'Protecting a declining profit pool for one more year.', ['case-yellowbox', 'case-memory']),
    C('core-focus', 'Return to the core', 'strategy', 'Turnarounds usually start by cutting complexity and funding the few things customers pay for.', 'Count which products and channels make the money before deciding what to keep.', 'Cutting evenly across everything.', ['case-brick', 'boardroom']),
    C('first-mover', 'First-mover advantage', 'strategy', 'Moving first helps only when it locks in scale, learning, customers or scarce assets.', 'Name the specific advantage that moving first buys.', 'Assuming speed is always an advantage.', ['boardroom', 'product', 'case-split']),
    C('network-effects', 'Network effects', 'strategy', 'A product becomes more valuable as more people use it, so early share can snowball.', 'Find which side of the network is harder to attract and subsidise it.', 'Charging both sides full price from the start.', ['case-split', 'product', 'markets']),
    C('competitive-response', 'Competitive response', 'strategy', 'Rivals react. A price cut or launch is worth what it earns after their response.', 'Play the next move for each rival before committing.', 'Modelling your move as if the market stands still.', ['boardroom', 'brandlab', 'dealroom']),
    C('segmentation-sizing', 'Top-down and bottom-up sizing', 'strategy', 'Estimate a market from the population down and from a single unit up, then reconcile the two.', 'If the two answers differ by more than double, find the assumption that disagrees.', 'Using one route and trusting the answer.', ['guess']),
    C('mece', 'Structure before numbers', 'strategy', 'Break a problem into parts that do not overlap and together cover the whole.', 'Write the tree before doing any maths.', 'Starting to calculate before agreeing what is being estimated.', ['guess', 'case-memory', 'xat']),
    C('sanity-check', 'Sanity check', 'strategy', 'Test an estimate against a known benchmark, a per-person figure or a physical limit.', 'Convert the answer to a per-day or per-person number and ask if it is plausible.', 'Reporting a number without a reality check.', ['guess']),
    C('portfolio-choice', 'Portfolio choices', 'strategy', 'Allocate money to businesses by their prospects, not by their past or their size.', 'Fund growth from cash generators; fix or exit the rest.', 'Spreading investment evenly to keep everyone happy.', ['boardroom', 'brandlab', 'capex']),
    /* Finance */
    C('npv', 'Net present value', 'finance', 'Today’s value of future cash flows minus the investment, discounted at the cost of capital.', 'Accept projects with positive NPV at the right discount rate.', 'Ranking projects by profit instead of discounted cash.', ['capex', 'case-hurdle', 'case-studio']),
    C('irr', 'Internal rate of return', 'finance', 'The discount rate at which a project’s NPV is zero.', 'Use IRR to compare against the hurdle rate; use NPV to choose between projects.', 'Preferring a small high-IRR project over a large one that creates more value.', ['capex', 'case-hurdle']),
    C('payback', 'Payback period', 'finance', 'How long until cumulative cash flow turns positive.', 'Use payback as a risk check, not as the decision rule.', 'Rejecting long-lived projects that are worth far more.', ['capex']),
    C('wacc', 'Cost of capital', 'finance', 'The blended return lenders and shareholders require, weighted by how the firm is funded.', 'Discount at the risk of the project, not the average risk of the firm.', 'Using one company-wide rate for very different businesses.', ['case-hurdle', 'capex']),
    C('working-capital', 'Working capital', 'finance', 'Cash tied up in stock and customer credit, less what suppliers lend you.', 'Cash days = stock days + debtor days − creditor days.', 'Growing sales faster than the cash to fund them.', ['case-cashcycle', 'opslab', 'people']),
    C('operating-leverage', 'Operating leverage', 'finance', 'With high fixed costs, profit swings much more than sales.', 'Know your break-even volume before adding capacity.', 'Adding fixed cost at the top of a cycle.', ['capex', 'opslab', 'boardroom']),
    C('sunk-cost', 'Sunk costs', 'finance', 'Money already spent cannot be recovered and should not affect the next decision.', 'Decide on the cash flows from here on.', 'Continuing a project because of what it has cost so far.', ['capex', 'case-max', 'xat']),
    C('diversification', 'Diversification', 'finance', 'Combining assets that do not move together lowers risk without giving up as much return.', 'Look at how holdings move together, not just at each one alone.', 'Owning many assets that all fall in the same crisis.', ['markets']),
    C('risk-return', 'Risk and return', 'finance', 'Higher expected return comes with more volatility and deeper losses.', 'Size positions by how much loss you can live through.', 'Judging a strategy by its best year.', ['markets']),
    C('rebalancing', 'Rebalancing', 'finance', 'Selling what has risen and buying what has fallen to return to the target mix.', 'Rebalance on a rule, not on a feeling.', 'Chasing whatever did best last year.', ['markets']),
    C('valuation-synergy', 'Paying for synergies', 'finance', 'An acquirer can pay up to the target’s value plus the synergies it can really capture.', 'Pay for synergies you control; discount the ones that depend on people staying.', 'Paying the seller for synergies the buyer creates.', ['case-studio']),
    C('real-options', 'Real options', 'finance', 'The right, but not the duty, to expand, delay or abandon has value of its own.', 'Stage big investments so you can stop if the market disappoints.', 'Treating every investment as all or nothing.', ['capex', 'product']),
    C('cyclicality', 'Cycles', 'finance', 'Demand, prices and credit move in cycles that are easy to mistake for trends.', 'Ask where in the cycle you are before extrapolating.', 'Building capacity at the peak.', ['markets', 'capex']),
    C('unit-economics', 'Unit economics', 'finance', 'Profit per unit, customer or order, once all variable costs are counted.', 'Fix unit economics before scaling.', 'Growing volume on a unit that loses money.', ['product', 'case-split', 'guess']),
    C('market-sizing-value', 'Value, not volume', 'finance', 'A market’s worth is volume times price times margin, not volume alone.', 'Carry every estimate through to money.', 'Stopping at units sold.', ['guess', 'capex']),
    /* Operations */
    C('bottleneck', 'The bottleneck', 'ops', 'The slowest step sets the output of the whole line.', 'Add capacity only at the bottleneck; an hour lost there is lost for the whole system.', 'Speeding up steps that are not the constraint.', ['factory', 'opslab', 'case-seats']),
    C('littles-law', 'Little’s law', 'ops', 'Work in progress equals throughput times the time each item spends in the system.', 'To cut lead time, cut work in progress.', 'Releasing more work to look busy.', ['opslab', 'factory']),
    C('utilisation', 'Utilisation and queues', 'ops', 'As utilisation approaches 100 per cent, waiting time rises very steeply.', 'Keep spare capacity where variability is high.', 'Treating full utilisation as efficiency.', ['opslab', 'factory', 'case-sight']),
    C('bullwhip', 'The bullwhip effect', 'ops', 'Small changes in customer demand grow into large swings further up the chain.', 'Share real demand data and order steadily.', 'Over-ordering after a shortage, then cutting hard.', ['supply', 'chainlab']),
    C('safety-stock', 'Safety stock', 'ops', 'Extra inventory held to cover variability in demand and lead time.', 'Size safety stock to the service level you need, not to a round number.', 'Holding the same buffer for every item.', ['chainlab', 'opslab', 'supply']),
    C('eoq', 'Order size', 'ops', 'Balancing the cost of ordering against the cost of holding stock.', 'Order more often when holding costs are high.', 'Ordering in big batches to get a discount that costs more in stock.', ['opslab', 'chainlab']),
    C('lean', 'Lean flow', 'ops', 'Remove waiting, rework and excess stock so work flows steadily.', 'Make problems visible and stop the line to fix them.', 'Hiding problems with inventory.', ['case-seats', 'factory', 'opslab']),
    C('quality-source', 'Quality at the source', 'ops', 'Prevent defects where work is done instead of catching them at the end.', 'Give the person doing the work the authority to stop it.', 'Adding inspectors instead of fixing the process.', ['case-seats', 'case-sight']),
    C('responsiveness', 'Responsive versus efficient', 'ops', 'A supply chain built for speed and one built for low cost look very different.', 'Match the chain to the product: fashion needs speed, staples need efficiency.', 'Running a fast-changing product on a cost-first chain.', ['case-fast', 'chainlab']),
    C('standard-work', 'Standard work', 'ops', 'A simple, repeated method that everyone follows makes errors rare and visible.', 'Simplify the process before adding technology.', 'Automating a process nobody has standardised.', ['case-tiffin', 'case-sight']),
    C('capacity-timing', 'Capacity timing', 'ops', 'Capacity takes time to add, so it must be bought before demand arrives.', 'Plan capacity against the demand you will have when it is ready.', 'Waiting for the queue before ordering machines.', ['factory', 'opslab', 'capex']),
    /* Marketing and product */
    C('stp', 'Segment, target, position', 'marketing', 'Split the market by needs, choose who to serve, then decide what you want to mean to them.', 'Pick a segment you can win, not the biggest one.', 'Trying to appeal to everyone.', ['brandlab', 'brand', 'case-peoplescar']),
    C('perceptual-map', 'Perceptual maps', 'marketing', 'A picture of how customers see brands on the attributes they care about.', 'Move toward where demand is and rivals are not.', 'Repositioning onto a crowded spot.', ['brand', 'brandlab']),
    C('price-value', 'Price and value', 'marketing', 'Customers buy when perceived value exceeds price; the gap is your room to price.', 'Price from customer value, then check cost.', 'Cost-plus pricing that leaves money on the table.', ['brandlab', 'brand', 'product', 'case-fair']),
    C('elasticity', 'Price elasticity', 'marketing', 'How much demand changes when price changes.', 'Raise prices where demand barely moves; cut them only where it moves a lot.', 'Cutting price in a market that does not respond to it.', ['brandlab', 'product', 'case-fair']),
    C('everyday-pricing', 'Everyday low pricing', 'marketing', 'Steady prices instead of promotions; customers must believe the price is already fair.', 'Change pricing only as fast as customers can change habits.', 'Removing discounts that shoppers had learned to expect, all at once.', ['case-fair']),
    C('awareness-funnel', 'The purchase funnel', 'marketing', 'Customers move from awareness to consideration to purchase to loyalty.', 'Find the stage where most customers drop out and spend there.', 'Spending on awareness when the problem is conversion.', ['brand', 'brandlab', 'product']),
    C('price-point', 'Designing to a price point', 'marketing', 'Start from the price customers can pay and design the product backwards.', 'Make sure the low price does not send a low-status signal.', 'Making the product so cheap that buyers are embarrassed to own it.', ['case-peoplescar']),
    C('service-speed', 'Speed as a product feature', 'marketing', 'For some customers, how fast the product arrives is part of what they pay for.', 'Measure the experience customers have, not the one you designed.', 'Adding menu items that slow the line.', ['case-coffee']),
    C('roadmap', 'Roadmap prioritisation', 'marketing', 'Choose features by value to customers relative to the effort they cost.', 'Ship the smallest version that tests the riskiest assumption.', 'Building everything stakeholders ask for.', ['product']),
    C('retention', 'Retention before acquisition', 'marketing', 'Growth from new users leaks away if existing users do not stay.', 'Fix retention before spending heavily on acquisition.', 'Celebrating sign-ups while churn rises.', ['product', 'case-split']),
    C('ltv-cac', 'Lifetime value and acquisition cost', 'marketing', 'A customer is worth acquiring when lifetime margin exceeds the cost of winning them.', 'Aim for lifetime value at least three times acquisition cost.', 'Counting revenue, not margin, in lifetime value.', ['product', 'case-split']),
    C('two-sided', 'Two-sided markets', 'marketing', 'A platform must attract two groups who each want the other.', 'Choose which side to serve first, and how to keep the other side from leaving.', 'Optimising for one side until the other leaves.', ['case-split']),
    C('brand-portfolio', 'Brand portfolio', 'marketing', 'Several brands for different segments, each with a clear role.', 'Give each brand its own job; kill the ones that overlap.', 'Launching brands that compete with each other.', ['brandlab']),
    /* People */
    C('batna', 'Walk-away alternative', 'people', 'Your best option if the deal fails sets how much you can demand.', 'Improve your alternative before the negotiation, and estimate theirs.', 'Negotiating without a walk-away point.', ['deal', 'dealroom']),
    C('anchoring', 'Anchoring', 'people', 'The first number on the table pulls the final outcome toward it.', 'Open with a credible, ambitious anchor; re-anchor if theirs is extreme.', 'Letting the other side name the first number when you know the market.', ['deal', 'dealroom', 'xat']),
    C('logrolling', 'Trading across issues', 'people', 'Concede on what matters less to you in return for what matters more.', 'Negotiate several issues at once, never one at a time.', 'Splitting every issue down the middle.', ['dealroom', 'deal']),
    C('incentives', 'Incentives drive behaviour', 'people', 'People do what they are paid and measured on, including the parts you did not intend.', 'Ask how someone could hit the target without doing the job.', 'Rewarding one number and ignoring how it is reached.', ['case-piecework', 'case-eight', 'people']),
    C('piece-rate', 'Pay for output', 'people', 'Paying per unit raises effort but can hurt quality and teamwork.', 'Pair output pay with quality checks and a guarantee.', 'Paying for volume with no quality measure.', ['case-piecework', 'people']),
    C('manager-quality', 'Manager quality', 'people', 'The manager is the biggest factor in whether people stay and perform.', 'Measure managers on how their teams do and feel, and train what predicts it.', 'Promoting the best individual contributor by default.', ['case-managers', 'people']),
    C('change-management', 'Leading change', 'people', 'Change sticks when people understand why, have support, and see early wins.', 'Set a clear deadline and fund the help people need to meet it.', 'Announcing a mandate without support.', ['case-english', 'people']),
    C('retention-pay', 'Pay and attrition', 'people', 'Pay below market raises attrition; replacing people costs far more than keeping them.', 'Price attrition: recruiting, training and lost output.', 'Saving on pay and losing the savings to turnover.', ['people']),
    C('workforce-planning', 'Workforce planning', 'people', 'Hiring takes months, so headcount must be planned ahead of demand.', 'Hire for the workload two quarters out.', 'Hiring only after the team is overloaded.', ['people']),
    C('crisis-comms', 'Crisis communication', 'people', 'Early, honest communication limits damage even before all facts are known.', 'Say what you know, what you are doing and when you will say more.', 'Waiting for complete facts before saying anything.', ['crisis', 'crisisroom']),
    C('team-roles', 'Using the team', 'people', 'In a crisis, delegating clear roles beats a leader doing everything.', 'Assign owners and check in on a fixed rhythm.', 'Pulling every decision to the top.', ['crisis', 'crisisroom']),
    C('psych-safety', 'Speaking up', 'people', 'Teams catch problems early when people feel safe to raise them.', 'Reward bad news delivered early.', 'Punishing the person who raises the alarm.', ['crisisroom', 'case-max', 'case-eight']),
    /* Decisions */
    C('confirmation-bias', 'Confirmation bias', 'decisions', 'We look for evidence that supports what we already believe.', 'Ask what evidence would change your mind, then look for it.', 'Reading only the data that agrees with the plan.', ['xat', 'crisis', 'case-max']),
    C('overconfidence', 'Overconfidence', 'decisions', 'People are surer of their estimates than their accuracy justifies.', 'Give ranges, not single numbers.', 'Planning on the best case.', ['guess', 'markets', 'xat']),
    C('expected-value', 'Expected value', 'decisions', 'Weigh each outcome by its probability and add them up.', 'Compare options by expected value, then check the worst case.', 'Choosing by the most likely outcome alone.', ['xat', 'capex', 'markets']),
    C('stakeholders', 'Stakeholder mapping', 'decisions', 'List everyone affected by a decision and what each one cares about.', 'Check the decision against the people with the least voice.', 'Considering only shareholders and customers.', ['xat', 'case-rugs', 'case-max']),
    C('ethics-tests', 'Ethics tests', 'decisions', 'Would you be comfortable if this were on the front page, or done to you?', 'Run the publicity and reversibility tests before acting.', 'Asking only whether it is legal.', ['xat', 'case-eight', 'case-rugs']),
    C('supplier-ethics', 'Responsibility in the supply chain', 'decisions', 'Customers hold a brand responsible for how its suppliers behave.', 'Fix the cause with the supplier rather than walking away overnight.', 'Cutting a supplier and leaving the problem worse.', ['case-rugs', 'chainlab']),
    C('target-culture', 'When targets become the goal', 'decisions', 'A measure pushed hard enough stops measuring what it was meant to.', 'Watch for gaming, and change targets that people are being pressured to hit at any cost.', 'Raising a target every year without asking how it is met.', ['case-eight', 'people']),
    C('safety-margin', 'Safety and schedule', 'decisions', 'Pressure on cost and time can quietly erode safety margins.', 'Make the safety case independent of the people under schedule pressure.', 'Hiding a design change to avoid retraining costs.', ['case-max', 'crisisroom']),
    C('reversibility', 'One-way and two-way doors', 'decisions', 'Decisions that are easy to reverse can be made fast; irreversible ones deserve care.', 'Spend time in proportion to how hard the decision is to undo.', 'Agonising over small reversible choices and rushing big ones.', ['xat', 'capex', 'boardroom'])
  ];

  window.SimLabPlatform = { MINS, QUICK, DAILY, TRACKS, CONCEPTS };
})();
