/* Crisis Room scenarios. Each phase: situation, feed, advisors (critical information marked), decisions and events.
   Effects use safety and legal (0–100), cost ($M) and trust by stakeholder: c customers, e employees, r regulators,
   m media, i investors, p partners. Functions receive the flags set by earlier decisions. */
(function (root) {
  'use strict';
  const scenarios = {
    /* ===================================================================================== */
    recall: {
      id: 'recall', title: 'Cold Chain', company: 'Meadowbrook Dairy', area: 'Food safety recall', budget: 30,
      labels: { safety: 'Public safety' },
      role: 'You are the chief executive of Meadowbrook Dairy, a family-owned yogurt and milk maker with one large plant at Riverside and products in 3,000 stores.',
      intro: 'At 06:40 on a Wednesday your head of food safety calls: a routine swab on one of your filling lines has tested positive for Listeria. Over the next six weeks you will decide how to protect the public, who to tell and when, what to say, how to look after the people affected, and how to rebuild.',
      weights: { c: 0.28, e: 0.12, r: 0.2, m: 0.13, i: 0.1, p: 0.17 },
      start: { safety: 55, legal: 15, trust: { c: 72, e: 68, r: 62, m: 55, i: 66, p: 70 } },
      advisors: [
        { id: 'quality', name: 'Dr. Asha Menon', role: 'Head of food safety' },
        { id: 'ops', name: 'Tom Reyes', role: 'Operations' },
        { id: 'legal', name: 'Claire Dubois', role: 'General counsel' },
        { id: 'comms', name: 'Sam Okoro', role: 'Communications' },
        { id: 'finance', name: 'Raj Malhotra', role: 'Finance' }
      ],
      phases: [
        { id: 'swab', clock: 'Day 1 · 06:40', title: 'A positive swab',
          brief: 'A routine environmental swab taken overnight next to the filling head of line 3 at the Riverside plant has come back positive for Listeria monocytogenes. Line 3 fills strawberry and vanilla yogurt cups, about 30% of the plant’s output, and its product from the past ten days has gone to about 1,200 stores in four states. Nobody has reported being ill. Your leadership team is on a call.',
          feed: [
            { src: 'Plant shift log', kind: 'email', text: 'Line 3 running normally overnight. Next full sanitation cycle due Thursday.' },
            { src: 'Sales system', kind: 'data', text: 'Strawberry cups up 12% week on week after the spring promotion.' },
            { src: '@riverside_daily', kind: 'social', text: 'Trucks queuing at Meadowbrook again this morning. Busy times at the dairy.' }
          ],
          advisors: {
            quality: { crit: true, t: 'A positive this close to the filler is serious. Positives next to food-contact surfaces often mean product contamination. Product tests take 48 hours, and I would not ship anything more from line 3 until we know.' },
            legal: { crit: true, t: 'A positive on or next to a food-contact surface has to be reported to the food safety agency within 24 hours. Waiting for a retest is not a reason to delay that notice.' },
            ops: { t: 'Line 3 is about 30% of our volume. Stopping it costs roughly $0.4M a day, and stores will see gaps on the shelf within three days.' },
            comms: { t: 'Nothing is public. A reporter at the Riverside Daily covers the plant and knows several of our people.' },
            finance: { t: 'Our recall insurance covers up to $15M of direct costs, provided we notify the insurer promptly.' }
          },
          decisions: [{ id: 'act1', kind: 'choice', prompt: 'What do you do first?', crit: ['quality', 'legal'],
            why: 'A positive next to a food-contact surface is a credible risk. Stopping the line, holding product and notifying the agency on time protects people without recalling products that are probably safe.',
            options: [
              { id: 'wait', label: 'Retest the swab and keep line 3 running while you wait for confirmation.', fx: { safety: -18, legal: 12, trust: { r: -8 } }, flags: { late: true }, out: 'Line 3 keeps running. Another 60,000 cups ship while the retest runs, and the 24-hour notice window to the agency passes.' },
              { id: 'hold', best: true, label: 'Stop line 3, hold all unshipped product, notify the agency and start product testing.', fx: { safety: 14, cost: 1, trust: { r: 8, e: 2 } }, out: 'Line 3 stops. 38,000 cups go on hold, the agency logs your notice and sends an inspector, and product testing begins.' },
              { id: 'shut', label: 'Shut the whole plant and announce a recall of every Meadowbrook product today.', fx: { safety: 16, cost: 9, legal: -2, trust: { p: -14, i: -10, c: -4, m: -6 } }, flags: { panic: true }, out: 'Every product leaves the shelves. Stores in four states clear their dairy aisles, the story leads the evening news, and you still do not know which products, if any, are contaminated.' }
            ] }]
        },
        { id: 'confirm', clock: 'Day 2 · 14:00', title: 'The lab confirms it',
          brief: f => (f.late ? 'The retest confirms the swab, and the agency wants to know why it was not told yesterday. ' : '') + 'Two finished strawberry cups from lot 0412 have tested positive for Listeria; other lots are still being tested. Separately, the regional health department is investigating two listeriosis cases, a pregnant woman and a 78-year-old man, not yet linked to any food.',
          feed: [
            { src: 'Regional health department', kind: 'email', text: 'We are investigating two listeriosis cases in the North District. Please share distribution data for the past 30 days.' },
            { src: 'Fresh & Co. category buyer', kind: 'email', text: 'We are hearing rumours. Is there anything we should know about Meadowbrook strawberry cups?' },
            { src: 'Local radio', kind: 'news', text: 'Health officials investigating two cases of a rare food-borne illness in the North District.' }
          ],
          advisors: {
            quality: { crit: true, t: 'The sanitation log shows a drain under line 3 was repaired eighteen days ago. Drains are a classic Listeria harbour. If that is the source, any lot made since the repair could be affected, not just 0412.' },
            ops: { crit: true, t: 'Traceability is good. We can identify every line 3 lot made since the repair, twelve lots, and get them off shelves within 48 hours. Recalling everything we make would take two weeks and empty our warehouses.' },
            legal: { t: 'The worst legal outcome is a recall that is too narrow and has to be widened later. Regulators and juries read that as hiding the problem.' },
            finance: { t: 'Recalling lot 0412 costs about $1M; all twelve line 3 lots about $6M; everything we make about $28M.' },
            comms: { t: 'Retailers will want a clear list of lot codes and product photos they can post in stores.' }
          },
          decisions: [
            { id: 'scope', kind: 'choice', prompt: 'How wide is the recall?', crit: ['quality', 'ops'],
              why: 'The drain repair marks the start of the contamination window. Recalling every lot made since then, and nothing else, removes the risk without punishing products that are not involved.',
              options: [
                { id: 'lot', label: 'Recall lot 0412 only, the lot that tested positive.', fx: { cost: 1, safety: -12, trust: { i: 3 } }, flags: { narrow: true }, out: 'Lot 0412 comes off the shelves. Eleven other lots made since the drain repair stay on sale.' },
                { id: 'line', best: true, label: 'Recall all twelve line 3 lots made since the drain repair, by lot code.', fx: { cost: 6, safety: 20, trust: { r: 6, p: 3 } }, out: 'Twelve lots come off the shelves in 1,200 stores within 48 hours. Every other Meadowbrook product stays on sale.' },
                { id: 'all', label: 'Recall every Meadowbrook product nationwide.', fx: { cost: 28, safety: 22, trust: { p: -10, i: -12, e: -4 } }, flags: { recallAll: true }, out: 'Everything is withdrawn. The recall is thorough, but most of what comes back was never at risk, and competitors take your shelf space.' }
              ] },
            { id: 'retail', kind: 'choice', prompt: 'How do you tell retailers?',
              why: 'Retailers carry out the recall. Hearing it from you first, with everything they need to act, gets product off shelves fastest and protects the relationship.',
              options: [
                { id: 'call', best: true, label: 'Phone every key account now, then send written notice with lot codes, photos and shelf signs within two hours.', fx: { safety: 4, trust: { p: 10 } }, out: 'Buyers hear it from you first. Most stores have the lots off shelves by the next morning.' },
                { id: 'email', label: 'Send all retailers a written notice by email.', fx: { safety: 1, trust: { p: -2 } }, out: 'The notice lands in busy inboxes. Some stores act within hours, others take two days.' },
                { id: 'wait', label: 'Wait for the agency to publish its recall notice.', fx: { safety: -4, trust: { p: -12 } }, out: 'Retailers learn about the recall from the agency website. The Fresh & Co. buyer calls, furious.' }
              ] }
          ]
        },
        { id: 'announce', clock: 'Day 2 · 18:00', title: 'The announcement',
          brief: f => `The agency will publish the recall notice at 20:00 and expects a statement from Meadowbrook at the same time. ${f.recallAll ? 'You are recalling every product.' : f.narrow ? 'You are recalling lot 0412.' : 'You are recalling twelve line 3 lots.'} Reporters are already calling. What do you say, who says it, and how?`,
          feed: [
            { src: 'Food safety agency', kind: 'email', text: 'The recall notice will be published at 20:00. Please share your consumer statement and helpline number by 19:30.' },
            { src: '@northdistrictmom', kind: 'social', text: 'Heard something is wrong with Meadowbrook yogurt?? My kids eat it every day. Does anyone know anything?' },
            { src: 'TV news desk', kind: 'email', text: 'We would like to interview your chief executive for the 21:00 bulletin.' }
          ],
          advisors: {
            comms: { crit: true, t: 'People need three things: is my product affected, what do I do, and who do I call. Give the lot codes, a clear instruction not to eat it and a refund. Say it plainly, and say it like you mean it.' },
            legal: { crit: true, t: 'Do not speculate about the cause and do not blame the contractor: we do not know yet. Expressing concern is not admitting liability. Promising things we cannot yet know is the real risk.' },
            quality: { t: 'Pregnant women, older people and anyone with a weak immune system are most at risk, and symptoms can take weeks to appear. That is worth saying.' },
            ops: { t: 'The helpline can take 3,000 calls an hour from 20:00.' },
            finance: { t: 'Refunds will cost a few hundred thousand dollars, small next to the recall itself.' }
          },
          decisions: [{ id: 'statement', kind: 'statement', prompt: 'Build the public statement', max: 5, coreN: 4, minN: 3, crit: ['comms', 'legal'], bestSpoke: 'ceo', bestChannel: 'video',
            elements: [
              { id: 'ack', good: true, label: 'We are recalling these products because they may be contaminated with Listeria.', fx: { trust: { c: 4, m: 4, r: 3 } } },
              { id: 'codes', good: true, label: 'Check your fridge: here are the products and lot codes. Do not eat them; return them for a full refund.', fx: { safety: 6, trust: { c: 6, p: 3 } } },
              { id: 'sorry', good: true, label: 'We are deeply sorry, and we are concerned for anyone who may be affected.', fx: { trust: { c: 5, m: 3, e: 2 } } },
              { id: 'health', good: true, label: 'Listeriosis can be serious for pregnant women, older adults and people with weak immune systems. If you have eaten these products and feel unwell, see a doctor.', fx: { safety: 5, trust: { c: 3, r: 4 } } },
              { id: 'action', good: true, label: 'We have stopped production on the affected line and are working with the food safety agency.', fx: { trust: { r: 4, c: 2, i: 2 } } },
              { id: 'updates', good: true, label: 'We will publish an update every day at 10:00 until this is resolved.', fx: { trust: { m: 5, c: 2 } } },
              { id: 'blame', trap: true, label: 'The contamination was caused by a contractor’s faulty repair work.', fx: { legal: 6, trust: { m: -4, r: -4 } }, flags: { blamed: true } },
              { id: 'low', trap: true, label: 'The risk to consumers is extremely low.', fx: { trust: { c: -2 } }, flags: { minimised: true } },
              { id: 'only', trap: true, label: 'No other Meadowbrook products are affected.', fx: { trust: { c: 2 } }, flags: { promisedOnly: true } },
              { id: 'noliab', trap: true, label: 'Meadowbrook accepts no liability while the investigation continues.', fx: { legal: -2, trust: { c: -6, m: -5 } } }
            ],
            spokes: [
              { id: 'ceo', label: 'You, the chief executive', mult: 1.25, fx: { trust: { e: 2 } } },
              { id: 'quality', label: 'Dr. Asha Menon, head of food safety', mult: 1.1, fx: { trust: { r: 2 } } },
              { id: 'comms', label: 'Sam Okoro, head of communications', mult: 0.9 }
            ],
            channels: [
              { id: 'video', label: 'Statement and on-camera interview at the plant at 20:00', mult: 1.15, fx: { trust: { m: 3 } } },
              { id: 'release', label: 'Written press release at 20:00', mult: 0.95 },
              { id: 'social', label: 'A post on Meadowbrook’s social media accounts', mult: 0.85, fx: { trust: { m: -2 } } }
            ],
            coherent: { trust: { c: 4, m: 3 } }, thin: { trust: { c: -5, m: -5 } },
            outcome: f => (f.goodN >= 4 ? 'The statement is clear and human. Calls to the helpline peak at 2,400 an hour, and most callers already know their lot code.' : 'The statement leaves people unsure what to do, and the helpline is swamped with basic questions.') + (f.traps ? ' Some of its lines will be quoted back at you later.' : '')
          }]
        },
        { id: 'cases', clock: 'Day 4 · 09:00', title: 'The illnesses are linked',
          brief: f => `The health department has linked three listeriosis cases to Meadowbrook strawberry yogurt from lot 0408. One patient is a pregnant woman, now in hospital; her baby is safe so far. ${f.narrow ? 'Lot 0408 was never recalled: it was made after the drain repair, but you recalled only lot 0412. ' : f.recallAll ? 'Lot 0408 was covered by your full recall. ' : 'Lot 0408 is one of the twelve lots you recalled on day 2. '}A television crew is at the plant gates, and plant workers say they are being abused online.`,
          feed: [
            { src: 'National news site', kind: 'news', text: f => (f.narrow ? '“Meadowbrook knew”: yogurt maker recalled one batch while illness spread from another' : 'Three ill after eating recalled Meadowbrook yogurt; pregnant woman in hospital') },
            { src: '@riverside_daily', kind: 'social', text: 'Meadowbrook workers telling us they were shouted at in the supermarket car park. Not on.' },
            { src: 'Lawyer for a patient’s family', kind: 'email', text: 'Our client’s family would like to know what Meadowbrook intends to do.' },
            { src: 'Fresh & Co. category buyer', kind: 'email', text: f => (f.retail === 'call' ? 'Thanks for the early call on Tuesday. What else do you need from us?' : 'We need to talk about whether Meadowbrook stays on our shelves.') }
          ],
          advisors: {
            legal: { crit: true, t: 'We can pay medical costs and help the families without admitting liability. Silence and letters between lawyers are what turn grief into lawsuits.' },
            comms: { crit: true, t: 'People need to see that someone at the top cares. A private visit and a public commitment to the families will do more than any statement.' },
            ops: { t: f => (f.narrow ? 'We need to widen the recall to every line 3 lot today. The agency is already drafting an order to make us.' : 'The recalled lots are off the shelves and returns are coming back to the plant.') },
            finance: { t: 'A fund for medical and related costs for affected families might cost $1–3M.' },
            quality: { t: 'Every other line is testing negative. The positives are confined to line 3.' }
          },
          decisions: [
            { id: 'families', kind: 'choice', prompt: 'How do you respond to the affected families?', crit: ['legal', 'comms'],
              why: 'Care without conditions is the right thing to do, and it is also what reduces legal risk. Conditional payments look like buying silence.',
              options: [
                { id: 'visit', best: true, label: 'Visit the families privately, cover all medical and related costs and offer support, with no conditions.', fx: { cost: 2, legal: -6, trust: { c: 8, m: 6, e: 3 } }, out: 'You meet two of the families. The visit is not publicised, but the families tell reporters Meadowbrook has been decent.' },
                { id: 'fund', label: 'Announce a compensation fund, with payments conditional on waiving legal claims.', fx: { cost: 2, legal: -2, trust: { c: -4, m: -6 } }, out: 'The fund is reported as an attempt to buy silence. Two families refuse it.' },
                { id: 'lawyers', label: 'Leave all contact with the families to the lawyers.', fx: { legal: 8, trust: { c: -8, m: -8 } }, out: 'The families hear from Meadowbrook only through lawyers’ letters. One goes on television that evening.' }
              ] },
            { id: 'staff', kind: 'choice', prompt: 'What do you do for plant employees?',
              why: 'Employees are your most credible voices in the community and they carry out the recovery. They need to hear from you, in person, that they will be looked after.',
              options: [
                { id: 'townhall', best: true, label: 'Hold a town hall at the plant, keep everyone on full pay during the shutdown and arrange security and support.', fx: { cost: 1, trust: { e: 12, m: 2 } }, out: 'The canteen is packed. People ask hard questions and leave knowing their jobs and pay are safe.' },
                { id: 'memo', label: 'Send an internal memo asking staff not to talk to the media.', fx: { trust: { e: -6 } }, out: 'The memo leaks within the hour and is read as a gag order.' },
                { id: 'layoff', label: 'Put line 3 staff on unpaid leave until the line restarts.', fx: { cost: -1, trust: { e: -16, m: -4 } }, out: 'Ninety people lose their pay in the middle of a crisis they did not cause. The union calls a meeting.' }
              ] }
          ],
          events: [
            { when: f => f.narrow, bad: true, text: 'The agency orders Meadowbrook to widen the recall to every line 3 lot. The national story becomes “Meadowbrook knew”.', fx: { cost: 6, safety: -6, legal: 18, all: -10 }, flags: { forced: true } },
            { when: f => f.minimised, bad: true, text: 'Your “extremely low risk” line is replayed on every bulletin next to the news of a pregnant woman in hospital.', fx: { trust: { c: -8, m: -8 } } }
          ]
        },
        { id: 'cause', clock: 'Day 7 · 11:00', title: 'The root cause',
          brief: 'The investigation is complete. The drain repaired under line 3 was badly resealed by a contractor and harboured Listeria. But the review also found that the sanitation team flagged two presumptive Listeria results on line 3 in the past six months, and neither was escalated beyond the shift supervisor. A reporter has a copy of an internal email about one of them.',
          feed: [
            { src: 'Reporter, national news site', kind: 'email', text: 'We have an internal email from March in which a Meadowbrook sanitation lead raises a possible Listeria result on line 3. Did management know? We publish tomorrow.' },
            { src: 'Contractor’s lawyers', kind: 'email', text: f => (f.blamed ? 'Your public statement blaming our client is defamatory. We are considering action.' : 'Our client is cooperating fully with the investigation.') },
            { src: '@foodsafetywatch', kind: 'social', text: 'Two missed warnings in six months. Food safety culture is a management choice.' }
          ],
          advisors: {
            quality: { crit: true, t: 'The real failure is ours: presumptive results were treated as noise. We have to fix escalation and say so, or this will happen again.' },
            legal: { crit: true, t: 'The email will come out whatever we do. If we publish the full findings first, including our own failures, the story is about how we fixed it. If it comes out after we have blamed others, it is about a cover-up.' },
            comms: { t: 'Tomorrow’s story runs either way. The only question is whether our account is in it.' },
            ops: { t: 'The drain has been replaced and the floor rebuilt. Line 3 could restart in about a week.' },
            finance: { t: 'Our litigation reserve depends on how the findings land. A credible fix reduces exposure.' }
          },
          decisions: [{ id: 'findings', kind: 'choice', prompt: 'What do you publish?', crit: ['quality', 'legal'],
            why: 'The internal failure would come out anyway. Owning it first, together with the fix, turns a cover-up story into an accountability story.',
            options: [
              { id: 'full', best: true, label: 'Publish the full findings today, including the missed warnings, what management got wrong and the fixes.', fx: { legal: -6, trust: { r: 10, m: 8, c: 6, e: 4, i: 2 } }, out: 'The next day’s story leads with Meadowbrook’s admission and its fixes. The leaked email adds little.' },
              { id: 'contractor', label: 'Publish the contractor’s failure and the drain fix, but not the missed warnings.', fx: { legal: 10, trust: { r: -6, m: -10, c: -6 } }, flags: { hid: true }, out: 'The email lands the next day. The story becomes what Meadowbrook left out.' },
              { id: 'none', label: 'Decline to comment until legal proceedings are over.', fx: { legal: 4, trust: { m: -12, c: -8, r: -4 } }, flags: { hid: true }, out: '“No comment” runs next to the leaked email.' }
            ] }],
          events: [{ when: f => f.blamed, bad: true, text: 'Having publicly blamed the contractor, Meadowbrook now faces a defamation claim and looks evasive about its own failures.', fx: { legal: 10, trust: { m: -6, r: -4 } } }]
        },
        { id: 'restart', clock: 'Day 12 · 10:00', title: 'The restart',
          brief: 'Line 3 has been rebuilt. Retailers want a credible plan before they restock Meadowbrook, and Fresh & Co., your largest customer, will delist the brand unless it sees one this week. You also have a $10M recovery budget to split.',
          feed: [
            { src: 'Fresh & Co. category buyer', kind: 'email', text: 'Before we restock, we need independent evidence that the problem is fixed.' },
            { src: 'Sales dashboard', kind: 'data', text: 'Sales of products that were never recalled are down 34% since day 2.' },
            { src: '@northdistrictmom', kind: 'social', text: f => (f.findings === 'full' ? 'Honestly respect that Meadowbrook owned up. I would buy again if they prove it is safe.' : 'Not buying Meadowbrook again until someone independent says it is safe.') }
          ],
          advisors: {
            quality: { crit: true, t: 'Three consecutive weeks of negative environmental and product tests is the industry standard for restarting after a Listeria event. An independent audit makes it credible.' },
            comms: { crit: true, t: 'Let retailers send their own quality people to watch the testing. Seeing is believing.' },
            ops: { t: 'Restarting today recovers about $0.5M of sales a week, but a single positive after restart would be catastrophic.' },
            finance: { t: 'The recovery budget can fund refunds and outreach, an independent audit and equipment, retailer support, or advertising. Advertising while trust is low rarely pays back.' },
            legal: { t: 'An independent audit also helps us in court.' }
          },
          decisions: [
            { id: 'restart', kind: 'choice', prompt: 'When does line 3 restart?', crit: ['quality', 'comms'],
              why: 'Evidence, not assurances, is what wins back retailers and regulators, and inviting retailers to watch makes the evidence credible.',
              options: [
                { id: 'now', label: 'Restart line 3 today, after a deep clean, to recover sales.', fx: { cost: -2, safety: -10, trust: { p: -6, r: -6 } }, flags: { rushed: true }, out: 'Line 3 restarts. Retailers refuse to restock it until they see evidence.' },
                { id: 'audit', best: true, label: 'Restart after an independent audit and three weeks of negative tests, with retailer observers.', fx: { cost: 1, safety: 12, trust: { p: 12, r: 8, c: 4 } }, out: 'Fresh & Co. sends two auditors. Three weeks later every test is negative, and they restock.' },
                { id: 'close', label: 'Close line 3 for good and outsource strawberry yogurt to a co-packer.', fx: { cost: 3, safety: 4, trust: { e: -12, p: 2 } }, out: 'Ninety jobs go. The co-packer’s first batches taste different and sales stay low.' }
              ] },
            { id: 'budget', kind: 'allocate', prompt: 'Split the $10M recovery budget', total: 10, unit: '$M',
              advice: 'Most of the value is in proof of safety and in making things right with customers and retailers. Advertising while trust is low rarely pays back.',
              buckets: [
                { id: 'refunds', label: 'Consumer refunds and outreach', half: 3, fx: { trust: { c: 10, m: 3 } } },
                { id: 'audit', label: 'Independent audit and new equipment', half: 2.5, fx: { safety: 10, trust: { r: 8, p: 6 } } },
                { id: 'retail', label: 'Retailer support and promotions', half: 3, fx: { trust: { p: 10, i: 3 } } },
                { id: 'ads', label: 'Brand advertising', half: 4, fx: { trust: { c: 2, i: 2, m: -3 } } }
              ],
              outcome: f => { const a = f.budget || {}; return (a.audit || 0) >= 3 && (a.refunds || 0) >= 2 ? 'The money goes where trust is rebuilt: proof of safety and making things right with customers.' : (a.ads || 0) >= 4 ? 'The advertising lands badly: viewers ask why Meadowbrook is buying airtime instead of fixing things.' : 'The budget is spread without a clear purpose.'; } }
          ]
        },
        { id: 'board', clock: 'Day 20 · 16:00', title: 'The board and investors',
          brief: 'Quarterly results are due next week, and the recall has hit sales and margins hard. Two board members want to protect the quarter. Analysts are asking how large the charge will be.',
          feed: [
            { src: 'Analyst note', kind: 'news', text: 'Meadowbrook: the recall is manageable. The question is whether management understands what went wrong.' },
            { src: 'Board member', kind: 'email', text: 'Could we cut the food safety investment back to last year’s level to protect this quarter’s margin?' },
            { src: 'Investor relations', kind: 'data', text: 'Shares down 18% since day 2.' }
          ],
          advisors: {
            finance: { crit: true, t: 'Investors forgive a one-off charge that is clearly explained. What they punish is surprises, and a second incident.' },
            quality: { crit: true, t: 'Cutting food safety now would undo the fixes we just announced, and it is exactly what the next leak would be about.' },
            legal: { t: 'Our disclosures must be complete. Under-reserving for claims is a legal risk of its own.' },
            comms: { t: 'The results call is where we tell the story of what we fixed.' },
            ops: { t: 'The new testing regime costs about $2M a year.' }
          },
          decisions: [{ id: 'quarter', kind: 'choice', prompt: 'What do you recommend to the board?', crit: ['finance', 'quality'],
            why: 'Clear one-off accounting plus sustained investment is what investors and regulators want to see after a safety failure.',
            options: [
              { id: 'cut', label: 'Cut the food safety programme back to protect this quarter’s margin.', fx: { cost: -2, safety: -14, trust: { e: -6, r: -6, i: 2 } }, flags: { cut: true }, out: 'Margins look better this quarter. The quality team loses two senior people within a month.' },
              { id: 'charge', best: true, label: 'Book a one-time charge, fund the new food safety programme and explain both clearly to investors.', fx: { cost: 2, safety: 6, trust: { i: 8, r: 4, e: 4 } }, out: 'The shares dip on the charge, then recover as analysts credit the clarity.' },
              { id: 'defer', label: 'Spread the recall costs into next quarter to soften the hit.', fx: { legal: 8, trust: { i: -10, r: -4 } }, out: 'The auditors object. The restated numbers become a story of their own.' }
            ] }],
          events: [{ when: f => f.cut || f.rushed, p: f => (f.cut && f.rushed ? 0.8 : 0.35), bad: true, text: 'A positive swab on line 3 in week five forces a second, smaller recall. This time nobody believes it was bad luck.', fx: { safety: -12, cost: 4, legal: 10, all: -10 } }]
        },
        { id: 'after', clock: 'Day 45 · 09:00', title: 'Six weeks on',
          brief: 'The recall is over. The three patients are recovering, and the baby was born healthy. Sales are coming back slowly. One decision remains: what Meadowbrook does from here.',
          feed: [
            { src: 'Trade press', kind: 'news', text: 'After the Meadowbrook recall, retailers tighten food safety audits for all dairy suppliers.' },
            { src: '@northdistrictmom', kind: 'social', text: 'Would love to know what Meadowbrook actually changed.' },
            { src: 'Union representative', kind: 'email', text: 'The team wants to be part of whatever comes next.' }
          ],
          advisors: {
            quality: { crit: true, t: 'Publishing our test data and inviting independent oversight would make Meadowbrook the safest name in dairy. It is the best long-term defence we have.' },
            ops: { crit: true, t: 'The people who catch problems are on the line. Give them the right to stop production without asking permission.' },
            comms: { t: 'People want to know what changed. Showing them beats telling them.' },
            finance: { t: 'An oversight panel and public reporting would cost about $1M a year.' },
            legal: { t: 'Transparency programmes help in litigation, as long as the data is accurate.' }
          },
          decisions: [{ id: 'future', kind: 'choice', prompt: 'What does Meadowbrook do from here?', crit: ['quality', 'ops'],
            why: 'The lasting lesson of a recall is a better safety culture. Making it visible rebuilds trust faster than silence or a new name.',
            options: [
              { id: 'quiet', label: 'Return to normal quietly and let the story fade.', fx: { trust: { c: -2, m: -2 } }, out: 'The story fades, and so does the chance to show what changed.' },
              { id: 'open', best: true, label: 'Publish test data every month, appoint independent overseers and give line workers the right to stop production.', fx: { cost: 1, safety: 10, trust: { c: 8, r: 8, e: 8, m: 6, p: 6 } }, out: 'The trade press picks up the first monthly report. Fresh & Co. asks its other suppliers to do the same.' },
              { id: 'rebrand', label: 'Rebrand the yogurt range to put distance between it and the recall.', fx: { cost: 4, trust: { m: -6, c: -4 } }, out: 'The rebrand is reported as an attempt to hide. Old customers notice the new name on the same cups.' }
            ] }]
        }
      ],
      finale: { text: f => (f.forced ? 'Meadowbrook survives, but the forced expansion of the recall will be taught as a cautionary tale.' : f.findings === 'full' && f.future === 'open' ? 'A year later Meadowbrook’s monthly safety report is an industry benchmark, and sales are above where they were before the recall.' : 'Meadowbrook recovers slowly. The recall is remembered, but so is how it was handled.') }
    },

    /* ===================================================================================== */
    breach: {
      id: 'breach', title: 'Breach', company: 'Lumen Pay', area: 'Cyberattack and data breach', budget: 25,
      labels: { safety: 'Customer protection' },
      role: 'You are the chief executive of Lumen Pay, a payments app with 4 million customers that also runs payroll for 40,000 small businesses.',
      intro: 'At 02:10 on a Saturday your security team sees data streaming out of a database server. Over the next two months you will contain an attack, face a ransom demand, tell millions of customers what happened, deal with regulators, partners and investors, and decide what kind of company Lumen Pay becomes.',
      weights: { c: 0.3, e: 0.1, r: 0.2, m: 0.12, i: 0.13, p: 0.15 },
      start: { safety: 60, legal: 15, trust: { c: 74, e: 70, r: 65, m: 58, i: 70, p: 72 } },
      advisors: [
        { id: 'security', name: 'Nadia Park', role: 'Chief information security officer' },
        { id: 'legal', name: 'Ben Adler', role: 'General counsel' },
        { id: 'comms', name: 'Iris Chen', role: 'Communications' },
        { id: 'ops', name: 'Diego Santos', role: 'Operations' },
        { id: 'finance', name: 'Hannah Wolfe', role: 'Finance' }
      ],
      phases: [
        { id: 'alert', clock: 'Saturday · 02:10', title: 'Unusual traffic',
          brief: 'Monitoring has flagged a stream of data leaving a database server that holds customer records. The transfer is still running. It is 2 a.m. on a Saturday, and your leadership team is on a call.',
          feed: [
            { src: 'Security monitoring', kind: 'data', text: '14 GB sent to an unknown external address since 23:40. Transfer ongoing.' },
            { src: 'On-call engineer', kind: 'email', text: 'That server was patched last month. Not sure how they got in.' },
            { src: 'Status page', kind: 'data', text: 'All systems operational.' }
          ],
          advisors: {
            security: { crit: true, t: 'The transfer is still running. Every hour we watch, more data leaves. We can isolate that server and the systems around it within 20 minutes without taking payments down.' },
            legal: { crit: true, t: 'The regulator expects notice within 72 hours of us becoming aware of a breach; arguably the clock started at 02:10. We must also preserve forensic evidence.' },
            ops: { t: 'Shutting the whole platform would stop payroll for 40,000 businesses on Monday morning.' },
            finance: { t: 'Our cyber insurance requires us to notify the insurer before we hire outside forensics, or we risk the cover.' },
            comms: { t: 'Nothing is public. A few customers have posted that logging in is slow.' }
          },
          decisions: [{ id: 'contain', kind: 'choice', prompt: 'What do you do now?', crit: ['security', 'legal'],
            why: 'Contain the attack precisely and preserve evidence, without stopping services customers depend on. Watching an active theft lets the damage grow.',
            options: [
              { id: 'watch', label: 'Keep monitoring for 24 hours to learn who the attackers are and what they want.', fx: { safety: -16, legal: 8, trust: { r: -6 } }, flags: { watched: true }, out: 'You learn a lot about the attackers. They take another 40 GB while you watch.' },
              { id: 'isolate', best: true, label: 'Activate the incident plan: isolate the affected systems, preserve evidence, notify the insurer and bring in forensics.', fx: { safety: 12, cost: 1, trust: { r: 6 } }, out: 'The transfer stops within 20 minutes and payments keep running. Forensics are on site by 06:00.' },
              { id: 'shutdown', label: 'Shut the whole platform down until you understand what happened.', fx: { safety: 10, cost: 4, trust: { c: -10, p: -10, i: -6 } }, flags: { shutdown: true }, out: 'Every Lumen Pay service goes dark. On Monday morning, 40,000 businesses cannot pay their staff.' }
            ] }]
        },
        { id: 'ransom', clock: 'Saturday · 09:30', title: 'The ransom note',
          brief: f => `${f.watched ? 'While you watched, the attackers took far more. ' : ''}A ransom note has appeared on internal systems. The attackers say they hold records of 2.1 million customers: names, email addresses, the last four digits of card numbers and, for 300,000 customers, scans of identity documents. They want $5M in cryptocurrency within 72 hours or they will publish. Customer support tools are encrypted and offline.`,
          feed: [
            { src: 'Ransom note', kind: 'email', text: 'Pay 5,000,000 USD in Bitcoin within 72 hours and we delete the data. Contact the police and the price doubles.' },
            { src: 'Forensics lead', kind: 'email', text: 'They came in through a flaw in an internal file-sharing tool. Their methods match a known ransomware group.' },
            { src: '@lumenpay_users', kind: 'social', text: 'Lumen Pay support chat has been down all morning. What is going on?' }
          ],
          advisors: {
            security: { crit: true, t: 'Our backups are clean and tested. We can restore the support systems in about three days without paying anything.' },
            legal: { crit: true, t: 'This group is on a government sanctions list. Paying it could itself be illegal, and the authorities strongly advise against it. Paying does not guarantee the data is deleted.' },
            finance: { t: 'Our insurance covers ransom payments, but not payments that would break sanctions law.' },
            ops: { t: 'Three days without support tools is painful, but we can survive it by staffing phones by hand.' },
            comms: { t: 'If we pay and it comes out later, that becomes the story.' }
          },
          decisions: [{ id: 'pay', kind: 'choice', prompt: 'How do you respond to the ransom demand?', crit: ['security', 'legal'],
            why: 'Paying a sanctioned group may be illegal and guarantees nothing. Clean backups and law enforcement are the path that does not reward the attackers.',
            options: [
              { id: 'pay', label: 'Pay the ransom quietly through an intermediary.', fx: { cost: 5, legal: 25, trust: { r: -12, i: -4 } }, flags: { paid: true }, out: 'The payment goes through. The attackers say they have deleted the data. You have no way to check.' },
              { id: 'refuse', best: true, label: 'Refuse to pay, involve law enforcement and restore from backups.', fx: { cost: 1, safety: 6, trust: { r: 8 } }, out: 'Law enforcement opens a case and restoration begins. The deadline will pass.' },
              { id: 'stall', label: 'Open talks with the attackers to buy time while you restore.', fx: { legal: 4, trust: { r: -2 } }, flags: { stalled: true }, out: 'The attackers agree to talk, then raise the price and leak a small sample to show they are serious.' }
            ] }],
          events: [{ when: f => f.paid, p: 0.6, bad: true, text: 'Days later the same group posts a sample of the data anyway. You paid, and the data still leaked.', fx: { all: -8, safety: -8 }, flags: { paidLeak: true } }]
        },
        { id: 'notify', clock: 'Monday · 08:00', title: 'Telling customers',
          brief: 'Forensics confirm the attackers took what they claimed. Your 72-hour notice window to the regulator closes tonight. You need to tell 2.1 million customers what happened and say something publicly.',
          feed: [
            { src: 'Regulator', kind: 'email', text: 'We are aware of reports of an incident at Lumen Pay. Please confirm whether personal data has been affected.' },
            { src: 'Tech news site', kind: 'news', text: 'Payments app Lumen Pay silent as reports of a cyberattack grow' },
            { src: '@lumenpay_users', kind: 'social', text: 'Just got a weird text “from Lumen Pay” asking me to confirm my card. Scam?' }
          ],
          advisors: {
            comms: { crit: true, t: 'Be specific about what was taken and what was not. Tell people exactly what to do: how to spot the phishing, how to reach us, what protection we are giving them. Vague reassurance makes people assume the worst.' },
            legal: { crit: true, t: 'Do not say card details are safe: names and the last four digits were taken, which is enough for convincing phishing. And do not call the attack unstoppable while the investigation is still running.' },
            security: { t: 'Phishing using the stolen data has already started.' },
            ops: { t: 'We can stand up a dedicated helpline with 400 agents by Wednesday.' },
            finance: { t: 'Identity protection costs about $4 per customer per year.' }
          },
          decisions: [{ id: 'notice', kind: 'statement', prompt: 'Build the notice to customers and the public statement', max: 5, coreN: 4, minN: 3, crit: ['comms', 'legal'], bestSpoke: 'ceo', bestChannel: 'direct',
            elements: [
              { id: 'what', good: true, label: 'Criminals accessed our systems and took names, email addresses, the last four digits of card numbers and, for some customers, identity document scans.', fx: { trust: { c: 5, r: 6, m: 4 } } },
              { id: 'notcard', good: true, label: 'Full card numbers, passwords and account balances were not taken.', fx: { trust: { c: 3 } } },
              { id: 'do', good: true, label: 'Watch for messages claiming to be from Lumen Pay. We will never ask for your card number or password. Here is how to reach us safely.', fx: { safety: 8, trust: { c: 5 } } },
              { id: 'protect', good: true, label: 'Every affected customer gets free identity protection, and we have opened a dedicated helpline.', fx: { safety: 4, trust: { c: 6, m: 2 } } },
              { id: 'sorry', good: true, label: 'We are sorry. You trusted us with your data and we did not protect it well enough.', fx: { trust: { c: 5, m: 4, e: 2 } } },
              { id: 'updates', good: true, label: 'We will share what we learn as the investigation continues.', fx: { trust: { m: 4, r: 2 } } },
              { id: 'safe', trap: true, label: 'Your card details are completely safe.', fx: { trust: { c: 2 } }, flags: { overpromised: true } },
              { id: 'sophisticated', trap: true, label: 'This was a highly sophisticated attack that no company could have stopped.', fx: { trust: { m: -5, r: -6 } }, flags: { deflected: true } },
              { id: 'serious', trap: true, label: 'We take the security of your data extremely seriously.', fx: { trust: { m: -2 } } },
              { id: 'small', trap: true, label: 'Only a small fraction of our customers were affected.', fx: { trust: { c: -3, m: -3 } } }
            ],
            spokes: [
              { id: 'ceo', label: 'You, the chief executive', mult: 1.25, fx: { trust: { e: 2 } } },
              { id: 'ciso', label: 'Nadia Park, chief information security officer', mult: 1.1, fx: { trust: { r: 2 } } },
              { id: 'comms', label: 'Iris Chen, head of communications', mult: 0.9 }
            ],
            channels: [
              { id: 'direct', label: 'A direct email and in-app notice to every affected customer, plus a public statement', mult: 1.15, fx: { trust: { c: 3 } } },
              { id: 'release', label: 'A press release and a notice on the website', mult: 0.95 },
              { id: 'social', label: 'A post on social media', mult: 0.85, fx: { trust: { m: -2 } } }
            ],
            coherent: { trust: { c: 4, r: 3 } }, thin: { trust: { c: -5, m: -4 } },
            outcome: f => (f.goodN >= 4 ? 'Customers understand what was taken and what to do. Reports of phishing to the helpline double, which means people are spotting the scams.' : 'Customers are left guessing what was taken, and rumours fill the gap.') + (f.traps ? ' Some of its lines will come back to haunt you.' : '')
          }]
        },
        { id: 'leak', clock: 'Thursday · 14:00', title: 'The data is published',
          brief: f => `${f.paid ? 'Despite the payment, the attackers' : 'The attackers'} have published 10,000 customer records on a leak site, including identity document scans, and journalists have verified them. A thread of customers receiving convincing phishing texts has gone viral. ${f.overpromised ? 'Your line that card details were “completely safe” is being quoted next to screenshots of fraudulent charges.' : ''}`,
          feed: [
            { src: 'National newspaper', kind: 'news', text: 'Lumen Pay customers’ passports and driving licences posted online' },
            { src: '@lumenpay_users', kind: 'social', text: 'Two hours on hold with Lumen Pay. Someone has used my details to open a credit card.' },
            { src: 'Partner bank', kind: 'email', text: 'We are seeing a spike in fraud attempts on accounts linked to Lumen Pay. We need to talk.' }
          ],
          advisors: {
            security: { crit: true, t: 'The 300,000 customers whose identity documents were taken face real identity fraud. The card fragments are mainly a phishing risk, but that risk covers everyone.' },
            ops: { crit: true, t: 'Hold times are over two hours. Temporary agents would bring that under ten minutes within a week; a chatbot cannot handle fraud cases.' },
            finance: { t: 'Identity protection for all 2.1 million: about $8M. For the 300,000 with documents taken: about $2M. Extra agents: about $2M.' },
            legal: { t: 'Regulators will judge us on how we look after the people most at risk.' },
            comms: { t: 'Every unanswered call becomes a social post.' }
          },
          decisions: [
            { id: 'idprotect', kind: 'choice', prompt: 'What protection do you offer?', crit: ['security'],
              why: 'Everyone affected faces phishing, and some face identity fraud. Protecting all of them, with priority for the most exposed, costs far less than the trust it saves.',
              options: [
                { id: 'all', best: true, label: 'Free identity protection and fraud cover for every affected customer, with priority help for those whose documents were taken.', fx: { cost: 8, safety: 10, trust: { c: 10, r: 6, m: 4 } }, out: 'Sign-ups pass 900,000 in three days. Fraud cases are caught early.' },
                { id: 'ids', label: 'Free identity protection only for the 300,000 whose documents were taken.', fx: { cost: 2, safety: 6, trust: { c: 2, r: 2 } }, out: 'The most exposed customers are covered. Everyone else asks why they are not.' },
                { id: 'none', label: 'Point customers to free government advice on identity theft.', fx: { safety: -8, trust: { c: -12, m: -8, r: -6 } }, out: 'The advice page is accurate and nobody reads it. Fraud complaints climb.' }
              ] },
            { id: 'support', kind: 'choice', prompt: 'How do you handle the flood of calls?', crit: ['ops'],
              why: 'In a breach, the helpline is the company. Fraud victims need a person, quickly.',
              options: [
                { id: 'agents', best: true, label: 'Hire 600 temporary agents, open the helpline around the clock and set up a team for fraud cases.', fx: { cost: 2, safety: 4, trust: { c: 8, e: 2 } }, out: 'Hold times fall below ten minutes by the weekend.' },
                { id: 'bot', label: 'Send customers to an automated chatbot and the website FAQ.', fx: { trust: { c: -8, m: -4 } }, out: 'The chatbot cannot reverse a fraudulent charge. Screenshots of its answers circulate.' },
                { id: 'hours', label: 'Ask existing staff to work overtime.', fx: { cost: 0.5, trust: { e: -8, c: 2 } }, out: 'Hold times improve a little. Support staff start calling in sick.' }
              ] }
          ],
          events: [{ when: f => f.overpromised, bad: true, text: 'Fraudsters use the leaked card fragments in phishing texts, and “completely safe” becomes a headline.', fx: { trust: { c: -8, m: -6 } } }]
        },
        { id: 'inquiry', clock: 'Day 8 · 10:00', title: 'The regulator’s inquiry',
          brief: 'The regulator has opened a formal inquiry and wants a full timeline. While preparing it, your team finds that a security researcher reported the file-sharing flaw to Lumen Pay three months ago. The ticket was marked low priority and never fixed.',
          feed: [
            { src: 'Regulator', kind: 'email', text: 'Please provide a complete timeline, including any prior knowledge of the vulnerability exploited.' },
            { src: 'Security researcher’s blog', kind: 'news', text: 'I reported this bug to Lumen Pay in July. Here is the email chain.' },
            { src: '@infosec_daily', kind: 'social', text: 'Lumen Pay was warned. In July.' }
          ],
          advisors: {
            legal: { crit: true, t: 'The regulator asked about prior knowledge, and the researcher is already publishing. Disclosing the missed report fully, and first, is the only option that does not make things much worse.' },
            security: { crit: true, t: 'Our triage process failed. The bug is fixed and we have changed how outside reports are handled.' },
            comms: { t: 'The researcher’s post is spreading. We should respond to it today.' },
            finance: { t: 'Fines are far higher where a firm is found to have misled its regulator.' },
            ops: { t: 'The engineering team is demoralised and worried about blame.' }
          },
          decisions: [{ id: 'candour', kind: 'choice', prompt: 'What do you tell the regulator?', crit: ['legal', 'security'],
            why: 'Candour with a regulator, when the facts are about to come out anyway, is both the ethical path and the legally safer one.',
            options: [
              { id: 'disclose', best: true, label: 'Disclose the missed report in full, thank the researcher publicly and explain the fixes.', fx: { legal: -8, trust: { r: 12, m: 8, e: 4 } }, out: 'The regulator notes your candour. The researcher posts that Lumen Pay handled it well.' },
              { id: 'answer', label: 'Answer the regulator’s questions as asked and say nothing publicly.', fx: { legal: 6, trust: { r: -4, m: -8 } }, out: 'The researcher’s post becomes the public account of what happened.' },
              { id: 'unrelated', label: 'Describe the earlier report as unrelated to the attack.', fx: { legal: 25, trust: { r: -20, m: -12 } }, flags: { misled: true }, out: 'The timeline goes in. Two engineers who worked on the ticket know it is not true.' }
            ] }],
          events: [{ when: f => f.misled, bad: true, text: 'The regulator obtains the July emails from the researcher. Misleading it becomes a separate investigation.', fx: { legal: 15, all: -6 } }]
        },
        { id: 'partners', clock: 'Day 12 · 15:00', title: 'Partners and the fix',
          brief: 'Your partner bank and the card network want proof that Lumen Pay is secure, or they will suspend your access in 30 days. You have $12M for security improvements.',
          feed: [
            { src: 'Card network', kind: 'email', text: 'We require an independent assessment and a remediation plan with dates within two weeks.' },
            { src: 'Partner bank', kind: 'email', text: 'Our board is asking whether we should keep working with you.' },
            { src: 'Security dashboard', kind: 'data', text: 'Account takeover attempts up 400% since the leak.' }
          ],
          advisors: {
            security: { crit: true, t: 'Most account takeovers now come from reused passwords. Two-factor login for everyone would stop the majority of them.' },
            ops: { crit: true, t: 'Partners want evidence and dates, not assurances. An independent assessment they can read themselves is what will move them.' },
            legal: { t: 'Contractually they can suspend us with 30 days’ notice.' },
            finance: { t: 'Losing the card network would cut revenue by two thirds.' },
            comms: { t: 'Customers will notice two-factor login. It is a visible sign that something changed.' }
          },
          decisions: [
            { id: 'partnerplan', kind: 'choice', prompt: 'What do you offer the partner bank and the card network?', crit: ['ops'],
              why: 'Partners carry part of your risk. Independent evidence and dated commitments give them something to take to their own boards.',
              options: [
                { id: 'audit', best: true, label: 'Share an independent security assessment and a remediation plan with dated milestones.', fx: { cost: 1, trust: { p: 14, r: 4 } }, out: 'Both partners accept the plan and agree to monthly reviews.' },
                { id: 'assure', label: 'Assure them in writing that everything has been fixed.', fx: { trust: { p: -6 } }, out: 'The bank asks for evidence you do not yet have.' },
                { id: 'threaten', label: 'Tell them you will move to another bank if they suspend you.', fx: { trust: { p: -14, i: -4 } }, out: 'The bank starts its suspension process the same afternoon.' }
              ] },
            { id: 'remed', kind: 'allocate', prompt: 'Split the $12M security budget', total: 12, unit: '$M',
              advice: 'Two-factor login and independent assurance do the most for customers and partners. Goodwill credits help, but do not reduce risk.',
              buckets: [
                { id: 'mfa', label: 'Two-factor login for every customer', half: 2, fx: { safety: 10, trust: { p: 4, c: 2 } } },
                { id: 'soc', label: 'A 24/7 security operations centre', half: 3, fx: { safety: 8, trust: { p: 6, r: 4 } } },
                { id: 'audit', label: 'Independent security audit shared with partners', half: 2, fx: { trust: { p: 12, r: 6, i: 3 } } },
                { id: 'credits', label: 'Goodwill credits for affected customers', half: 3, fx: { trust: { c: 8, m: 2 } } }
              ],
              outcome: f => { const a = f.remed || {}; return (a.mfa || 0) >= 2 && (a.audit || 0) >= 2 ? 'Account takeovers fall sharply within a month, and partners can see why.' : 'Some of the money buys goodwill, but the risk itself has not fallen much.'; } }
          ]
        },
        { id: 'board', clock: 'Day 20 · 17:00', title: 'The board',
          brief: 'The share price is down 30%. An activist investor demands that the chief information security officer be fired and the board refreshed. The board meets tonight.',
          feed: [
            { src: 'Activist investor’s letter', kind: 'news', text: 'Heads must roll. The CISO and the board failed shareholders.' },
            { src: 'Employee forum', kind: 'social', text: 'If they fire Nadia after she worked 20-hour days on this, I am out.' },
            { src: 'Investor relations', kind: 'data', text: 'Shares down 30% since the attack.' }
          ],
          advisors: {
            finance: { crit: true, t: 'Investors want to see governance change: a board-level technology and risk committee and an independent review.' },
            legal: { crit: true, t: 'The failure was in our triage process and our priorities, which were set above the CISO. Firing her now would look like scapegoating, and she is leading the response.' },
            security: { t: 'My team will follow whatever you decide, but losing leadership mid-response is dangerous.' },
            comms: { t: 'A firing makes one day of headlines. Governance changes make a story about learning.' },
            ops: { t: 'Engineering morale is fragile.' }
          },
          decisions: [{ id: 'governance', kind: 'choice', prompt: 'What do you propose to the board?', crit: ['finance', 'legal'],
            why: 'Accountability means fixing the system that failed, not removing the person fixing it.',
            options: [
              { id: 'fire', label: 'Fire the CISO publicly to show accountability.', fx: { safety: -8, trust: { e: -12, i: 2, r: -4 } }, out: 'The activist claims a win. Three senior security engineers resign within the month.' },
              { id: 'committee', best: true, label: 'Keep the response team, create a board technology and risk committee and commission an independent review.', fx: { trust: { i: 10, r: 6, e: 6 } }, out: 'The activist grumbles, but the largest investors back the plan.' },
              { id: 'buyback', label: 'Announce a share buyback to support the price.', fx: { cost: 5, trust: { i: -4, c: -6, m: -6 } }, out: 'Customers ask why there is money for a buyback but not for their protection.' }
            ] }]
        },
        { id: 'rebuild', clock: 'Day 60 · 09:00', title: 'Two months on',
          brief: 'The leak has faded from the news. Customers are slowly coming back, and partners are watching your milestones. One decision remains: what kind of company Lumen Pay becomes.',
          feed: [
            { src: 'Tech news site', kind: 'news', text: 'Two months after its breach, Lumen Pay is still deciding what it stands for.' },
            { src: '@lumenpay_users', kind: 'social', text: 'Why did a payments app need a scan of my passport from 2019 anyway?' },
            { src: 'Security researcher', kind: 'email', text: 'Happy to help design a proper bug bounty if you want one.' }
          ],
          advisors: {
            security: { crit: true, t: 'Data we do not keep cannot be stolen. We kept identity scans for years after we needed them.' },
            comms: { crit: true, t: 'A transparency report shows what changed. A slogan invites ridicule.' },
            legal: { t: 'Deleting data we no longer need is required by law anyway.' },
            finance: { t: 'A bug bounty costs less than a single incident.' },
            ops: { t: 'Customers want to see the changes in the app itself.' }
          },
          decisions: [{ id: 'future', kind: 'choice', prompt: 'What does Lumen Pay do from here?', crit: ['security', 'comms'],
            why: 'Keeping less data, inviting outside scrutiny and reporting openly reduce future risk and show customers what changed.',
            options: [
              { id: 'quiet', label: 'Return to normal and focus on growth.', fx: { trust: { c: -2, m: -2 } }, out: 'Growth resumes slowly. The questions about data never quite go away.' },
              { id: 'minimise', best: true, label: 'Delete identity documents once checked, publish a security transparency report and launch a bug bounty.', fx: { cost: 1, safety: 10, trust: { c: 8, r: 8, m: 6, p: 6 } }, out: 'The first transparency report is cited by the regulator as good practice.' },
              { id: 'campaign', label: 'Launch an advertising campaign calling Lumen Pay the safest app in payments.', fx: { cost: 4, trust: { m: -8, c: -4 } }, out: 'The campaign is mocked within hours of launch.' }
            ] }]
        }
      ],
      finale: { text: f => (f.misled ? 'The investigation into misleading the regulator outlasts the breach itself.' : f.candour === 'disclose' && f.future === 'minimise' ? 'A year on, Lumen Pay’s transparency report is a model for the industry, and customer numbers are above their pre-breach level.' : 'Lumen Pay survives the breach, but customers and partners remember how it was handled.') }
    },

    /* ===================================================================================== */
    overheat: {
      id: 'overheat', title: 'Overheat', company: 'Brightnode', area: 'Product safety and supplier dispute', budget: 30,
      labels: { safety: 'Product safety' },
      role: 'You chair the response team at Brightnode, which sells about 600,000 Home Hub smart speakers a year through retailers and online.',
      intro: 'Overnight, support logged three reports of hubs overheating while charging, and one customer has a minor burn. Over the next three months you will find the fault, decide who to recall, speak to the public, manage retailers and a battery supplier who denies everything, and answer to the board.',
      weights: { c: 0.3, e: 0.1, r: 0.18, m: 0.14, i: 0.12, p: 0.16 },
      start: { safety: 50, legal: 15, trust: { c: 70, e: 66, r: 62, m: 56, i: 68, p: 70 } },
      advisors: [
        { id: 'maya', name: 'Maya Ortiz', role: 'Quality lead' },
        { id: 'leo', name: 'Leo Grant', role: 'Supply chain' },
        { id: 'ruth', name: 'Ruth Kim', role: 'General counsel' },
        { id: 'sam', name: 'Sam Patel', role: 'Communications' },
        { id: 'nina', name: 'Nina Hart', role: 'Finance' }
      ],
      phases: [
        { id: 'reports', clock: 'Hour 1', title: 'Three hubs overheated overnight',
          brief: 'Support logged three reports of Home Hubs overheating while charging, and one customer has a minor burn. Nothing is public yet.',
          feed: [
            { src: 'Support ticket #44812', kind: 'email', text: 'Hub got too hot to touch while charging and the plastic warped. My daughter burned her finger.' },
            { src: '@hubfan22', kind: 'social', text: 'Anyone else’s Brightnode hub smell like burning plastic when charging?' },
            { src: 'Sales dashboard', kind: 'data', text: 'Hubs shipped this week: 14,000.' }
          ],
          advisors: {
            maya: { crit: true, t: 'Two of the three units come from the same battery batch, B-17. It is early, but that is a pattern.' },
            ruth: { crit: true, t: 'Once we know of a credible safety risk, we have 24 hours to notify the product safety regulator. Waiting a week is not an option.' },
            leo: { t: 'Pausing outbound shipments for a few days is easy. We hold about two weeks of stock.' },
            sam: { t: 'One complaint is on social media with a few thousand views. No press calls yet.' },
            nina: { t: 'Each day of paused shipments costs about $1M in sales.' }
          },
          decisions: [{ id: 'first', kind: 'choice', prompt: 'What do you do first?', crit: ['maya', 'ruth'],
            why: 'A pattern in one battery batch is a credible risk. Pausing, notifying and testing protects customers and keeps you on the right side of the 24-hour rule without scaring 600,000 households.',
            options: [
              { id: 'keep', label: 'Keep shipping and have support collect details for a week.', fx: { safety: -15, legal: 12, trust: { r: -6 } }, flags: { late: true }, out: 'Shipments continue. Two more overheating reports arrive by evening, and the 24-hour notice window passes.' },
              { id: 'pause', best: true, label: 'Pause shipments, notify the regulator and start lab tests.', fx: { safety: 15, cost: 3, trust: { r: 6 } }, out: 'Shipments pause. The regulator logs your notice and asks for lab results within a week.' },
              { id: 'stopall', label: 'Tell every customer to stop using their hub until further notice.', fx: { safety: 18, cost: 8, trust: { c: -8, p: -6, i: -6 } }, flags: { alarm: true }, out: '600,000 customers lose their hubs overnight. Support lines jam and the story starts trending.' }
            ] }]
        },
        { id: 'lab', clock: 'Hour 6', title: 'The lab confirms a fault',
          brief: f => `${f.late ? 'Two more units have overheated since yesterday. ' : ''}Lab tests confirm that some battery cells overheat under fast charging. You need to set the scope of the fix today.`,
          feed: [
            { src: 'Test lab report', kind: 'data', text: 'Batch B-17 cells exceed temperature limits in 6 of 40 fast-charge tests. All other batches: 0 of 200.' },
            { src: 'Retail partner', kind: 'email', text: 'We are hearing about overheating hubs. Should we pull stock?' },
            { src: '@hubfan22', kind: 'social', text: 'Update: Brightnode support told me they are “looking into it”. Not very reassuring.' }
          ],
          advisors: {
            maya: { crit: true, t: 'Only batch B-17 fails the stress test. Every other batch passes with a wide margin.' },
            leo: { crit: true, t: 'B-17 went into about 42,000 hubs, all shipped to the North and West regions. We can find each one by serial number.' },
            nina: { t: 'A targeted recall costs about $6M. Recalling every hub costs about $40M.' },
            ruth: { t: 'The regulator will accept a targeted recall if we can trace the affected units.' },
            sam: { t: 'Customers keep asking whether their hub is affected. They need a quick way to check.' }
          },
          decisions: [{ id: 'scope', kind: 'choice', prompt: 'How wide is the fix?', crit: ['maya', 'leo'],
            why: 'The evidence points to one batch you can trace. Recall it precisely and make every other hub safer, without flooding warehouses with hubs that were never at risk.',
            options: [
              { id: 'all', label: 'Recall all 600,000 hubs.', fx: { safety: 10, cost: 40, trust: { p: -6, i: -10 } }, flags: { recallAll: true }, out: 'The recall is thorough, but warehouses overflow and most returned hubs were never at risk.' },
              { id: 'b17', best: true, label: 'Recall the 42,000 B-17 hubs by serial number and push a safer charging update to every other hub.', fx: { safety: 25, cost: 6, trust: { r: 8, c: 4 } }, out: 'Affected owners get a replacement offer. Everyone else gets a safer charging update overnight.' },
              { id: 'update', label: 'Push a software update that slows charging on every hub. No recall.', fx: { safety: -10, cost: 1, trust: { r: -8 } }, flags: { noRecall: true }, out: 'The update lowers the risk but leaves faulty cells in 42,000 homes.' }
            ] }]
        },
        { id: 'viral', clock: 'Hour 12', title: 'A video passes a million views',
          brief: f => `A video of a smoking hub has passed one million views. Reporters are calling, and the CEO wants a public response tonight.${f.noRecall ? ' Without a recall, every interview will ask why faulty hubs are still in homes.' : ''}`,
          feed: [
            { src: 'Viral video', kind: 'social', text: '“My Brightnode hub started smoking on the kitchen counter.” 1.2M views.' },
            { src: 'Consumer affairs reporter', kind: 'email', text: 'Is Brightnode recalling the Home Hub? We are running a story at 22:00.' },
            { src: 'Search trends', kind: 'data', text: 'Searches for “Brightnode fire” up 4,000% in six hours.' }
          ],
          advisors: {
            sam: { crit: true, t: 'Every hour of silence roughly doubles the story’s reach. People want clear steps: am I affected, and what do I do?' },
            ruth: { crit: true, t: 'Say we are acting out of caution and focus on what customers should do. Do not speculate about fault or name the supplier.' },
            maya: { t: 'The supplier has fixed its process; new cells pass every test.' },
            leo: { t: 'Replacement hubs can ship within five days.' },
            nina: { t: 'A free replacement costs us about $140 a unit; a refund costs $199.' }
          },
          decisions: [{ id: 'statement', kind: 'statement', prompt: 'Build the public response', max: 5, coreN: 4, minN: 3, crit: ['sam', 'ruth'], bestSpoke: 'ceo', bestChannel: 'video',
            elements: [
              { id: 'who', good: true, label: 'Hubs with serial numbers from batch B-17 can overheat when fast-charging.', fx: { trust: { c: 5, m: 4, r: 3 } } },
              { id: 'checker', good: true, label: 'Check your serial number on our website in ten seconds. If yours is affected, unplug it and we will send a free replacement within five days.', fx: { safety: 8, trust: { c: 7 } } },
              { id: 'caution', good: true, label: 'We are acting out of caution, working with the product safety regulator.', fx: { trust: { r: 5, c: 2 } } },
              { id: 'sorry', good: true, label: 'We are sorry for the worry this has caused, and we are in touch with the customer who was hurt.', fx: { trust: { c: 5, m: 3 } } },
              { id: 'update', good: true, label: 'Every other hub gets a safer charging update tonight; there is nothing you need to do.', fx: { safety: 3, trust: { c: 3 } } },
              { id: 'supplier', trap: true, label: 'The fault lies with our battery supplier’s defective cells.', fx: { legal: 8, trust: { m: -3, p: -6 } }, flags: { namedSupplier: true } },
              { id: 'rare', trap: true, label: 'Incidents like this are extremely rare.', fx: { trust: { c: -2 } }, flags: { minimised: true } },
              { id: 'refund', trap: true, label: 'Every customer can return any hub for a full refund, no questions asked.', fx: { cost: 12, trust: { c: 4 } }, flags: { openRefund: true } },
              { id: 'hold', trap: true, label: 'We will comment further once our investigation is complete.', fx: { trust: { m: -5, c: -3 } } }
            ],
            spokes: [
              { id: 'ceo', label: 'The chief executive', mult: 1.25 },
              { id: 'maya', label: 'Maya Ortiz, quality lead', mult: 1.1, fx: { trust: { r: 2 } } },
              { id: 'sam', label: 'Sam Patel, communications', mult: 0.9 }
            ],
            channels: [
              { id: 'video', label: 'A short video from the CEO tonight, with the serial checker live', mult: 1.15, fx: { trust: { m: 2, c: 2 } } },
              { id: 'release', label: 'A press release tonight', mult: 0.95 },
              { id: 'tomorrow', label: 'A full press conference tomorrow morning', mult: 0.9, fx: { trust: { m: -4, c: -3 } } }
            ],
            coherent: { trust: { c: 4, m: 3 } }, thin: { trust: { c: -6, m: -5 } },
            outcome: f => (f.goodN >= 4 ? 'Customers know exactly what to do. Within hours, the serial checker gets 200,000 visits.' : 'Customers are left unsure whether their hub is safe, and the story keeps running.') + (f.traps ? ' Parts of the statement will cause trouble later.' : '')
          }]
        },
        { id: 'retail', clock: 'Day 2 · 10:00', title: 'Getting hubs out of homes',
          brief: f => `${f.recallAll ? 'All 600,000 hubs are being recalled. ' : f.noRecall ? 'There is no recall, but retailers are pulling hubs anyway. ' : '42,000 B-17 hubs need to come back. '}Retailers want to know who handles returns, and every day an affected hub stays plugged in is a risk.`,
          feed: [
            { src: 'Largest retail partner', kind: 'email', text: 'Our stores cannot handle thousands of returns at the service desk. What is your plan?' },
            { src: 'Courier partner', kind: 'email', text: 'We can collect and deliver to 8,000 addresses a day from Thursday.' },
            { src: '@hubfan22', kind: 'social', text: 'Brightnode says I am affected. Do I really have to queue at a store with a hub that might catch fire?' }
          ],
          advisors: {
            leo: { crit: true, t: 'A courier swap, new hub delivered and old one collected at the door, gets affected units out of homes fastest. Store returns take three times as long.' },
            sam: { t: 'People do not want to carry a hub they think might catch fire.' },
            ruth: { t: 'Recalled units must be traceable all the way back to us.' },
            nina: { crit: true, t: 'The courier swap costs about $2M more than store returns, but every week of delay adds risk and refunds.' },
            maya: { t: 'Returned B-17 units should be tested and destroyed, never resold.' }
          },
          decisions: [{ id: 'logistics', kind: 'choice', prompt: 'How do affected hubs come back?', crit: ['leo', 'nina'],
            why: 'Speed and convenience decide how many risky units leave homes. A doorstep swap does both and takes the burden off retailers.',
            options: [
              { id: 'courier', best: true, label: 'Doorstep swap: courier delivers a new hub and collects the old one, booked online in a minute.', fx: { cost: 2, safety: 10, trust: { c: 8, p: 8 } }, out: 'Two thirds of affected hubs are back within ten days.' },
              { id: 'stores', label: 'Ask customers to return hubs to the store where they bought them.', fx: { safety: 2, trust: { p: -10, c: -4 } }, out: 'Service desks are overwhelmed and many customers simply do not go.' },
              { id: 'mail', label: 'Customers mail hubs back and receive a replacement once the return is checked.', fx: { safety: -2, trust: { c: -8 } }, out: 'Customers must post a hub they think is dangerous and wait two weeks without one. Few bother.' }
            ] }]
        },
        { id: 'supplier', clock: 'Day 4 · 15:00', title: 'The supplier pushes back',
          brief: f => `The battery supplier says its cells met the specification and the fault is in Brightnode’s charging design. ${f.namedSupplier ? 'Since you named them in public, its lawyers are threatening to sue for defamation. ' : 'It threatens to stop supplying if Brightnode blames it publicly. '}Your engineers’ data shows the cells were out of specification.`,
          feed: [
            { src: 'Supplier’s chief executive', kind: 'email', text: 'Our cells met the spec. If you want to keep working with us, keep our name out of this.' },
            { src: 'Engineering report', kind: 'data', text: 'B-17 cells show internal resistance 40% above the agreed specification.' },
            { src: 'Trade press', kind: 'news', text: 'Brightnode and battery maker trade blame over overheating hubs' }
          ],
          advisors: {
            ruth: { crit: true, t: 'Our test data is strong. Shared privately with them, it gives us leverage for a cost contribution without a public fight that a court would decide years from now.' },
            leo: { crit: true, t: 'We have no qualified second supplier yet. Switching overnight would stop production for three months.' },
            maya: { t: 'Their fixed process passes our tests. The new cells are fine.' },
            nina: { t: 'A 50% cost contribution from the supplier would be worth about $3–4M to us.' },
            sam: { t: 'A public blame fight keeps the story alive for weeks.' }
          },
          decisions: [{ id: 'dispute', kind: 'choice', prompt: 'How do you handle the supplier?', crit: ['ruth', 'leo'],
            why: 'Use the evidence privately to secure a fix and a fair cost share, while qualifying a second source. Public blame helps nobody, including customers.',
            options: [
              { id: 'public', label: 'Publish the test data and blame the supplier publicly.', fx: { legal: 12, trust: { p: -8, m: -4 } }, flags: { fight: true }, out: 'The trade press runs the fight for a week. The supplier slows deliveries.' },
              { id: 'private', best: true, label: 'Share the test data privately, negotiate a cost contribution and start qualifying a second supplier.', fx: { cost: -3, trust: { p: 6, i: 4 }, legal: -4 }, out: 'The supplier agrees to cover 50% of recall costs and to independent batch testing.' },
              { id: 'switch', label: 'Drop the supplier immediately and source cells elsewhere.', fx: { cost: 6, trust: { i: -8, c: -2 } }, out: 'Production stops for three months while new cells are qualified. Hubs disappear from shelves.' }
            ] }],
          events: [{ when: f => f.namedSupplier || f.fight, bad: true, text: 'The supplier files a defamation claim. The case will run for two years.', fx: { legal: 10, cost: 1 } }]
        },
        { id: 'board', clock: 'Day 7 · 09:00', title: 'The board asks about the cost',
          brief: f => `The board wants to know how Brightnode will absorb the cost this quarter. ${f.openRefund ? 'Your open refund promise has already brought back 60,000 hubs that were never at risk. ' : ''}Analysts are watching the share price.`,
          feed: [
            { src: 'Analyst note', kind: 'news', text: 'Brightnode’s recall looks well run. The open question is the cost.' },
            { src: 'Board member', kind: 'email', text: 'Can we slow the replacement programme into next quarter?' },
            { src: 'Investor relations', kind: 'data', text: 'Shares down 9% this week.' }
          ],
          advisors: {
            nina: { crit: true, t: 'Investors shrug off a one-time charge if we explain it clearly. Surprises later are what hurt.' },
            leo: { crit: true, t: 'If we delay replacements, risky hubs stay in homes for weeks longer.' },
            maya: { t: 'Cutting my team now would remove the people who caught this in six hours.' },
            sam: { t: 'Customers are watching how fast replacements arrive.' },
            ruth: { t: 'Delays increase our liability if another incident happens.' }
          },
          decisions: [{ id: 'cost', kind: 'choice', prompt: 'What do you recommend to the board?', crit: ['nina', 'leo'],
            why: 'A clearly explained one-time charge protects both safety and credibility. Delays and cuts trade a small saving for a large risk.',
            options: [
              { id: 'cutq', label: 'Cut the quality team’s budget by 20% to protect margins.', fx: { cost: -2, safety: -10, trust: { e: -8 } }, flags: { cut: true }, out: 'Margins hold this quarter. Two senior engineers start interviewing elsewhere.' },
              { id: 'charge', best: true, label: 'Book a one-time charge, brief investors and keep the replacement schedule.', fx: { trust: { i: 6, c: 2 } }, out: 'The share price dips 3% and recovers within a week. Replacements arrive on schedule.' },
              { id: 'delay', label: 'Delay replacements to next quarter to spread the cost.', fx: { safety: -18, trust: { c: -12, r: -8 } }, flags: { delayed: true }, out: 'Risky hubs stay in use for weeks longer.' }
            ] }],
          events: [{ when: f => f.delayed || f.noRecall, p: f => (f.delayed && f.noRecall ? 0.9 : 0.6), bad: true, text: 'A B-17 hub catches fire in a kitchen in the West region. Nobody is hurt, but it makes national news.', fx: { safety: -10, legal: 12, all: -10 } }]
        },
        { id: 'after', clock: 'Day 90', title: 'Three months on',
          brief: 'The recall is finished. Most affected hubs are back, and sales are recovering. One decision remains: how Brightnode makes sure this does not happen again, and shows it.',
          feed: [
            { src: 'Consumer magazine', kind: 'news', text: 'Is the Brightnode Home Hub safe to buy now?' },
            { src: 'Retail partner', kind: 'email', text: 'Shoppers still ask about the overheating. What can we tell them?' },
            { src: '@hubfan22', kind: 'social', text: 'Got my replacement in four days. Fair play, Brightnode.' }
          ],
          advisors: {
            maya: { crit: true, t: 'Independent battery testing for every batch, published, would make this the safest hub on the market.' },
            sam: { crit: true, t: 'Retailers need something concrete to tell shoppers. A longer warranty says we stand behind the product.' },
            nina: { t: 'Independent testing costs about $1M a year. A two-year warranty extension costs about $2M.' },
            leo: { t: 'The second supplier is qualified, so we are no longer dependent on one source.' },
            ruth: { t: 'Published testing must be accurate. Done well, it also protects us legally.' }
          },
          decisions: [{ id: 'future', kind: 'choice', prompt: 'What does Brightnode do from here?', crit: ['maya', 'sam'],
            why: 'Visible, independent proof of safety and standing behind the product rebuild trust faster than silence or discounts.',
            options: [
              { id: 'quiet', label: 'Move on quietly.', fx: { trust: { c: -2, p: -2 } }, out: 'The question “is it safe now?” keeps coming up in reviews.' },
              { id: 'program', best: true, label: 'Publish independent test results for every battery batch and extend the warranty by two years.', fx: { cost: 3, safety: 10, trust: { c: 8, p: 8, r: 6, m: 4 } }, out: 'Reviewers start calling the Home Hub the safest smart speaker on the market.' },
              { id: 'discount', label: 'Run a 30% discount campaign to win customers back.', fx: { cost: 5, trust: { i: -4, m: -2 } }, out: 'Sales jump for a month, then fall back. Margins suffer.' }
            ] }]
        }
      ],
      finale: { text: f => (f.delayed || f.noRecall ? 'The kitchen fire defines the crisis. Brightnode survives, but the Home Hub never fully recovers.' : f.scope === 'b17' && f.future === 'program' ? 'A year on, the Home Hub is the best-reviewed smart speaker on the market, and its battery testing is an industry reference.' : 'Brightnode gets through the crisis, and learns from it.') }
    }
  };
  const out = { scenarios };
  if (typeof module !== 'undefined' && module.exports) module.exports = out;
  else root.CrisisRoomData = out;
})(typeof window !== 'undefined' ? window : globalThis);
