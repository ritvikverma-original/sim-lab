/* Capex Committee data: two real demand histories, disguised until the debrief.
   Cars: India's domestic passenger-vehicle sales (SIAM), thousand units, by fiscal year ending March (2011 = FY2010-11).
   Phones: worldwide smartphone shipments (IDC press releases), million units by calendar year; 2011, 2012, 2015-2018 derived
   from IDC's reported totals and growth rates. Unit economics, the firms and their rivals are invented. */
(function () {
  'use strict';
  const MARKETS = {
    cars: {
      tag: 'Market A', name: 'The car market', firm: 'Vardhan Motors', what: 'passenger cars', unit: 'cars', unitPl: 'cars', scale: 'thousand', dec: 0,
      teaser: 'A mid-sized carmaker in a large, fast-growing market that has just had two record years.',
      D: { 2006: 1143, 2007: 1380, 2008: 1550, 2009: 1553, 2010: 1951, 2011: 2502, 2012: 2630, 2013: 2665, 2014: 2504, 2015: 2601, 2016: 2789, 2017: 3047, 2018: 3289, 2019: 3377, 2020: 2774, 2021: 2711, 2022: 3070, 2023: 3890, 2024: 4219, 2025: 4302 },
      windows: { full: [2011, 2025], short: [2016, 2025] },
      p: {
        share0: 0.12, cap0: 330, price: 9.5, vc: 7.4, priceTrend: 0, vcTrend: 0, fixedPer: 0.6, overhead: 80, wc: 0.08, tax: 0.25,
        block: 40, blockCost: 140, gf: 120, gfCost: 480, gf2Cost: 300, fullCost: 720, autoCost: 120, autoSave: 0.25, autoMax: 2,
        modelCost: 350, modelLead: 2, decay: 0.15, F0: 0.5, restart: 6, depCap: 12, depModel: 5, depAuto: 8,
        ppe0: 1200, dep0: 120, debt0: 500, cash0: 150, shares: 100, multiple: 8, rate: 0.09, ke: 0.14, life: 15,
        stance: { discount: [0.96, 1.08], list: [1, 1], premium: [1.03, 0.94] }, lr: 0.08, money: 'M', costTrend: 0
      },
      briefs: {
        2011: 'The market grew 26% last year to almost 2 million cars, after a flat year during the global crisis, and this year has started even faster. Rivals are announcing new plants. Inflation is high and the central bank has begun raising interest rates.',
        2012: 'Last year was a record: the market grew 28% to 2.5 million cars. Interest rates have risen again and again, fuel prices are going up, and economists expect growth to slow but stay healthy.',
        2013: 'Growth slowed sharply to 5% last year as high interest rates and fuel prices hit buyers. Several rivals’ new plants are coming on stream. The economy is cooling and the currency is weak.',
        2014: 'The market barely grew last year (+1%). Dealers are discounting heavily, and violent labour unrest shut a rival’s plant for weeks. The currency fell to a record low in the summer before recovering.',
        2015: 'For the first time in more than a decade the market shrank (−6%), despite a cut in excise duty in February. A general election is under way, and investors are hoping for a decisive result and reforms.',
        2016: 'The market recovered 4% last year. Oil prices have halved, which helps fuel costs, and the central bank has started cutting interest rates.',
        2017: 'Sales grew 7% last year. Since the winter, courts have banned new large diesel cars in the capital region, and the budget has added a new tax on cars. Utility vehicles are the fastest-growing segment.',
        2018: 'Sales grew 9% to just over 3 million despite the sudden withdrawal of high-value banknotes in November. A new national goods and services tax arrives in July.',
        2019: 'Another record year: sales grew 8% to 3.3 million. The economy is growing fast and forecasters expect high single-digit growth again, although fuel prices are climbing.',
        2020: 'Growth stalled at 3% last year. In the autumn a large infrastructure lender defaulted, and the non-bank lenders who finance many car loans have struggled to raise money ever since. Stricter emission rules arrive in a year, making every car more expensive.',
        2021: 'Sales fell 18% last year, the worst fall in decades. A nationwide pandemic lockdown began at the end of March; dealers and factories are closed, and April sales will be close to zero.',
        2022: 'The year ended down only 2% after a strong recovery in the second half: buyers want personal transport to avoid crowds. A second pandemic wave is beginning, and a global shortage of chips is limiting production.',
        2023: 'Sales rose 13% last year even though chip shortages capped production and waiting lists stretched for months. Sport-utility vehicles are booming. Inflation is rising and the central bank is expected to raise rates.',
        2024: 'A record year: sales jumped 27% to 3.9 million as supply caught up with pent-up demand. Sport-utility vehicles are now more than half of the market.',
        2025: 'Sales grew 8% to 4.2 million, another record, but growth slowed through the year and dealers are carrying more unsold stock. Forecasters expect low single-digit growth.'
      },
      story: {
        name: 'India’s passenger-vehicle market', years: 'FY2010-11 to FY2024-25',
        lede: 'You faced the real domestic sales of India’s passenger-vehicle industry as reported by SIAM, from the record boom of 2010-11 through a three-year slowdown, the 2019-21 collapse and the post-pandemic SUV boom.',
        events: [
          ['FY2011', 'Sales rise 28% to 2.5 million. The RBI raises its repo rate thirteen times between March 2010 and October 2011.'],
          ['FY2012–14', 'High interest rates and fuel prices stall the market. Violence at Maruti Suzuki’s Manesar plant (July 2012) halts production. FY2014 is the first decline in over a decade (−6.1%), despite the February 2014 excise cut.'],
          ['FY2015–19', 'A long recovery to 3.38 million cars, through demonetisation (November 2016) and the launch of GST (July 2017).'],
          ['FY2019–20', 'IL&FS defaults in September 2018 and the NBFC credit squeeze dries up car finance. FY2020 sales fall 18%, ahead of the switch to BS-VI emission norms on 1 April 2020.'],
          ['FY2021', 'The national lockdown starts on 25 March 2020; domestic sales in April 2020 are close to zero, yet the year ends down only 2%.'],
          ['FY2022–25', 'Despite the global chip shortage, sales reach records: 3.89 million in FY2023 (+27%), 4.22 million in FY2024 and about 4.30 million in FY2025. Utility vehicles pass half of the market.']
        ],
        src: 'Society of Indian Automobile Manufacturers (SIAM), domestic passenger-vehicle sales, as reported in its annual releases and press coverage (Business Today, The Tribune, DT Next, Autocar India).',
        lesson: 'The two record years at the start invited everyone to build. Firms that added capacity in small steps, kept the option to expand and refreshed their models came out ahead; those that built big for the boom carried empty plants through three lean years and again in 2020.'
      }
    },
    phones: {
      tag: 'Market B', name: 'The phone boom', firm: 'Lumora Optics', what: 'camera modules for smartphones', unit: 'modules', unitPl: 'modules', scale: 'million', dec: 1,
      teaser: 'A maker of camera modules for a new kind of phone that is starting to sell in huge numbers.',
      D: { 2008: 151, 2009: 173.5, 2010: 302.6, 2011: 491.4, 2012: 725, 2013: 1019.4, 2014: 1301.1, 2015: 1432.5, 2016: 1470, 2017: 1462.6, 2018: 1402.6, 2019: 1372.6, 2020: 1292.2, 2021: 1359.8, 2022: 1205.5, 2023: 1164.1, 2024: 1238.8 },
      windows: { full: [2010, 2024], short: [2010, 2019] },
      p: {
        share0: 0.09, cap0: 30, price: 12, vc: 8.2, priceTrend: -0.05, vcTrend: -0.055, fixedPer: 0.9, overhead: 25, wc: 0.10, tax: 0.25,
        block: 12, blockCost: 45, gf: 40, gfCost: 130, gf2Cost: 80, fullCost: 200, autoCost: 35, autoSave: 0.35, autoMax: 2,
        modelCost: 50, modelLead: 1, decay: 0.3, F0: 0.6, restart: 2, depCap: 7, depModel: 3, depAuto: 6,
        ppe0: 90, dep0: 12, debt0: 60, cash0: 40, shares: 50, multiple: 7, rate: 0.06, ke: 0.13, life: 9,
        stance: { discount: [0.95, 1.10], list: [1, 1], premium: [1.03, 0.92] }, lr: 0.10, money: 'M', costTrend: -0.05
      },
      briefs: {
        2010: 'Last year the world bought about 174 million smartphones, a small share of all mobile phones, even in a recession. Touchscreen phones with app stores are pulling buyers away from basic handsets, and an open operating system is spreading across many brands.',
        2011: 'Smartphone shipments rose about 74% last year to roughly 300 million. Cheaper touchscreen models are arriving from new brands. Analysts expect strong growth for years.',
        2012: 'Shipments rose about 62% to almost 500 million. A former market leader has abandoned its own operating system for a partner’s, and its sales are collapsing. Customers want sharper cameras in every model.',
        2013: 'Shipments rose almost 50% to about 725 million. Prices are falling fast as low-cost brands grow, and smartphones are close to outselling basic phones.',
        2014: 'More than a billion smartphones were shipped last year, up about 40%. Growth is moving to China, India and other emerging markets; richer markets are nearly saturated.',
        2015: 'Shipments rose 28% to 1.3 billion. Bigger screens are popular. Growth in China, the largest market, is slowing.',
        2016: 'Shipments grew 10% to about 1.43 billion, the slowest growth yet. People are keeping their phones longer.',
        2017: 'Shipments grew only about 3% last year. A flagship phone was recalled after its batteries caught fire. Customers are pressing suppliers for price cuts.',
        2018: 'For the first time ever, smartphone shipments fell slightly last year (−0.5%). Phones are better and more expensive, and people replace them less often.',
        2019: 'Shipments fell about 4% last year, the worst year yet. A trade dispute between the two largest economies is disrupting supply chains. Phones for a new generation of mobile networks are coming.',
        2020: 'Shipments slipped about 2% last year. The first phones for the new networks have launched. Reports of a new virus in China are emerging.',
        2021: 'A pandemic cut shipments about 6% last year, although demand recovered strongly in the second half. A global shortage of chips is starting to limit production.',
        2022: 'Shipments recovered about 5% last year despite the chip shortage. Inflation is rising around the world.',
        2023: 'Shipments fell 11% last year, the steepest fall on record, as inflation squeezed buyers and phone makers cut their stocks.',
        2024: 'Shipments fell again last year, by about 3%, to roughly 1.16 billion, the lowest in a decade. Phone makers are promising new features powered by artificial intelligence.'
      },
      story: {
        name: 'The global smartphone market', years: '2010 to 2024',
        lede: 'You faced real worldwide smartphone shipments as reported by IDC: a fourfold boom in four years, a plateau at about 1.47 billion a year from 2015 to 2017, and a slow decline to a decade low in 2023.',
        events: [
          ['2010–12', 'The iPhone 4 and Android’s spread across many brands. Nokia drops Symbian for Microsoft’s Windows Phone (February 2011). Shipments rise from 303 million to about 725 million.'],
          ['2013–14', 'Shipments pass one billion. Samsung peaks while Chinese brands such as Xiaomi, Huawei, Oppo and Vivo surge.'],
          ['2015–17', 'Growth stalls at about 1.47 billion. Samsung’s Galaxy Note 7 is recalled (2016). 2017 is the first year of decline.'],
          ['2018–19', 'Longer replacement cycles. The US–China trade war, and restrictions on Huawei from May 2019.'],
          ['2020–22', 'Covid (−5.9% in 2020), the chip shortage of 2021, then the largest fall on record in 2022 (−11.3%).'],
          ['2023–24', 'A decade low of 1.16 billion in 2023, then a 6.4% rebound to 1.24 billion in 2024.']
        ],
        src: 'IDC Worldwide Quarterly Mobile Phone Tracker, from IDC press releases (2010–2024). Totals for 2011, 2012 and 2015–2018 are derived from IDC’s reported figures and growth rates.',
        lesson: 'In an S-curve, the dangerous capacity is the capacity ordered at the top. Growth looked endless in 2013–14, but plants ordered then came on stream just as the market stopped growing and prices kept falling. Flexible, quickly built capacity and cost reduction mattered more than scale.'
      }
    }
  };
  window.CapexData = { MARKETS };
})();
