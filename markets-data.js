/* Markets Desk data: real annual returns and inflation, plus the briefings and reveal stories for each decade.
   Returns: Aswath Damodaran, NYU Stern, "Historical Returns on Stocks, Bonds and Bills" (1928-2025):
   S&P 500 with dividends, 3-month T-bills, 10-year US Treasury bonds, Baa corporate bonds, US house prices, gold.
   Inflation: US CPI, annual average (officialdata.org, from the Bureau of Labor Statistics).
   Each row: [year, equities, cash (T-bills), Treasury bonds, Baa corporate bonds, house prices, gold, CPI inflation]. */
(function () {
  'use strict';
  const RAW = [
    [1928,0.4381,0.0308,0.0084,0.0322,0.0149,0.001,-0.0115],
    [1929,-0.083,0.0316,0.042,0.0302,-0.0206,-0.0015,0.0],
    [1930,-0.2512,0.0455,0.0454,0.0054,-0.043,0.001,-0.0267],
    [1931,-0.4384,0.0231,-0.0256,-0.1568,-0.0815,-0.1738,-0.0893],
    [1932,-0.0864,0.0107,0.0879,0.2359,-0.1047,0.2128,-0.103],
    [1933,0.4998,0.0096,0.0186,0.1297,-0.0381,0.2726,-0.0519],
    [1934,-0.0119,0.0028,0.0796,0.1882,0.0291,0.3175,0.0348],
    [1935,0.4674,0.0017,0.0447,0.1331,0.0977,0.0043,0.0255],
    [1936,0.3194,0.0017,0.0502,0.1138,0.0322,0.0009,0.0103],
    [1937,-0.3534,0.0028,0.0138,-0.0442,0.0256,-0.0023,0.0373],
    [1938,0.2928,0.0007,0.0421,0.0924,-0.0087,0.0017,-0.0203],
    [1939,-0.011,0.0005,0.0441,0.0798,-0.013,-0.0123,-0.013],
    [1940,-0.1067,0.0004,0.054,0.0865,0.0331,-0.0166,0.0072],
    [1941,-0.1277,0.0013,-0.0202,0.0501,-0.0838,0.0,0.0512],
    [1942,0.1917,0.0034,0.0229,0.0518,0.0333,0.0,0.1092],
    [1943,0.2506,0.0038,0.0249,0.0804,0.1145,0.0,0.0597],
    [1944,0.1903,0.0038,0.0258,0.0657,0.1658,0.0,0.0164],
    [1945,0.3582,0.0038,0.038,0.068,0.1178,0.0254,0.0227],
    [1946,-0.0843,0.0038,0.0313,0.0251,0.241,0.0,0.0848],
    [1947,0.052,0.006,0.0092,0.0026,0.2126,0.0,0.1439],
    [1948,0.057,0.0105,0.0195,0.0344,0.0206,0.0,0.0769],
    [1949,0.183,0.0112,0.0466,0.0538,0.0009,-0.087,-0.0097],
    [1950,0.3081,0.012,0.0043,0.0424,0.0364,0.0956,0.0109],
    [1951,0.2368,0.0152,-0.003,-0.0019,0.0605,0.0,0.0786],
    [1952,0.1815,0.0172,0.0227,0.0444,0.0441,-0.0035,0.0228],
    [1953,-0.0121,0.0189,0.0414,0.0162,0.1152,0.0069,0.0082],
    [1954,0.5256,0.0094,0.0329,0.0616,0.0092,0.0057,0.0031],
    [1955,0.326,0.0172,-0.0134,0.0204,0.0,-0.0003,-0.0028],
    [1956,0.0744,0.0262,-0.0226,-0.0235,0.0091,-0.0011,0.0153],
    [1957,-0.1046,0.0322,0.068,-0.0072,0.0272,-0.0011,0.0334],
    [1958,0.4372,0.0177,-0.021,0.0643,0.0066,0.0043,0.0273],
    [1959,0.1206,0.0339,-0.0265,0.0157,0.0011,0.0,0.0101],
    [1960,0.0034,0.0287,0.1164,0.0666,0.0077,0.0048,0.0146],
    [1961,0.2664,0.0235,0.0206,0.051,0.0098,-0.0006,0.0107],
    [1962,-0.0881,0.0277,0.0569,0.065,0.0032,-0.0006,0.012],
    [1963,0.2261,0.0316,0.0168,0.0546,0.0214,-0.004,0.0124],
    [1964,0.1642,0.0355,0.0373,0.0516,0.0126,0.0003,0.0128],
    [1965,0.124,0.0395,0.0072,0.0319,0.0166,0.0006,0.0159],
    [1966,-0.0997,0.0486,0.0291,-0.0345,0.0122,0.0003,0.0302],
    [1967,0.238,0.0429,-0.0158,0.009,0.0232,-0.0051,0.0277],
    [1968,0.1081,0.0534,0.0327,0.0485,0.0413,0.1247,0.0427],
    [1969,-0.0824,0.0667,-0.0501,-0.0203,0.0699,0.0501,0.0546],
    [1970,0.0356,0.0639,0.1675,0.0565,0.0822,-0.0945,0.0584],
    [1971,0.1422,0.0433,0.0979,0.14,0.0424,0.1669,0.0429],
    [1972,0.1876,0.0406,0.0282,0.1141,0.0298,0.4878,0.0327],
    [1973,-0.1431,0.0704,0.0366,0.0432,0.0342,0.7296,0.0618],
    [1974,-0.259,0.0785,0.0199,-0.0438,0.1007,0.6615,0.1105],
    [1975,0.37,0.0579,0.0361,0.1105,0.0677,-0.248,0.0914],
    [1976,0.2383,0.0498,0.1598,0.1975,0.0818,-0.041,0.0574],
    [1977,-0.0698,0.0526,0.0129,0.0995,0.1465,0.2264,0.065],
    [1978,0.0651,0.0718,-0.0078,0.0314,0.1572,0.3701,0.0763],
    [1979,0.1852,0.1005,0.0067,-0.0201,0.1374,1.2655,0.1125],
    [1980,0.3174,0.1139,-0.0299,-0.0332,0.074,0.1519,0.1355],
    [1981,-0.047,0.1404,0.082,0.0846,0.051,-0.326,0.1033],
    [1982,0.2042,0.1109,0.3281,0.2905,0.0056,0.1562,0.0613],
    [1983,0.2234,0.0895,0.032,0.1619,0.0475,-0.168,0.0321],
    [1984,0.0615,0.0992,0.1373,0.1562,0.0468,-0.1938,0.043],
    [1985,0.3124,0.0772,0.2571,0.2386,0.0747,0.06,0.0355],
    [1986,0.1849,0.0615,0.2428,0.2215,0.0961,0.1896,0.019],
    [1987,0.0581,0.0596,-0.0496,0.0112,0.0785,0.2453,0.0366],
    [1988,0.1654,0.0689,0.0822,0.1568,0.0722,-0.1526,0.0408],
    [1989,0.3148,0.0839,0.1769,0.1631,0.0439,-0.0284,0.0483],
    [1990,-0.0306,0.0775,0.0624,0.0565,-0.0069,-0.0311,0.054],
    [1991,0.3023,0.0554,0.15,0.164,-0.0017,-0.0856,0.0423],
    [1992,0.0749,0.0351,0.0936,0.1368,0.0082,-0.0573,0.0303],
    [1993,0.0997,0.0307,0.1421,0.1644,0.0216,0.1768,0.0295],
    [1994,0.0133,0.0437,-0.0804,-0.0123,0.0252,-0.0217,0.0261],
    [1995,0.372,0.0566,0.2348,0.2009,0.0179,0.0098,0.0281],
    [1996,0.2268,0.0515,0.0143,0.0528,0.0243,-0.0459,0.0293],
    [1997,0.331,0.052,0.0994,0.113,0.0402,-0.2141,0.0234],
    [1998,0.2834,0.0491,0.1492,0.081,0.0644,-0.0083,0.0155],
    [1999,0.2089,0.0478,-0.0825,0.0097,0.0768,0.0085,0.0219],
    [2000,-0.0903,0.06,0.1666,0.0938,0.0929,-0.0544,0.0338],
    [2001,-0.1185,0.0348,0.0557,0.086,0.0668,0.0075,0.0283],
    [2002,-0.2197,0.0164,0.1512,0.1206,0.0956,0.2557,0.0159],
    [2003,0.2836,0.0103,0.0038,0.1238,0.0981,0.1989,0.0227],
    [2004,0.1074,0.014,0.0449,0.1033,0.1364,0.0465,0.0268],
    [2005,0.0483,0.0322,0.0287,0.0513,0.1351,0.1777,0.0339],
    [2006,0.1561,0.0485,0.0196,0.0527,0.0173,0.232,0.0323],
    [2007,0.0548,0.0448,0.1021,0.049,-0.054,0.3192,0.0285],
    [2008,-0.3655,0.014,0.201,-0.0344,-0.12,0.0432,0.0384],
    [2009,0.2594,0.0015,-0.1112,0.1996,-0.0385,0.2504,-0.0036],
    [2010,0.1482,0.0014,0.0846,0.094,-0.0412,0.2924,0.0164],
    [2011,0.021,0.0005,0.1604,0.1226,-0.0389,0.1202,0.0316],
    [2012,0.1589,0.0009,0.0297,0.094,0.0644,0.0568,0.0207],
    [2013,0.3215,0.0006,-0.091,-0.0113,0.1072,-0.2761,0.0146],
    [2014,0.1352,0.0003,0.1075,0.1075,0.045,0.0012,0.0162],
    [2015,0.0138,0.0005,0.0128,-0.015,0.0519,-0.1211,0.0012],
    [2016,0.1177,0.0032,0.0069,0.1152,0.0531,0.081,0.0126],
    [2017,0.2161,0.0095,0.028,0.0915,0.0621,0.1266,0.0213],
    [2018,-0.0423,0.0197,-0.0002,-0.0318,0.0452,-0.0093,0.0244],
    [2019,0.3121,0.0211,0.0964,0.1525,0.0369,0.1908,0.0181],
    [2020,0.1802,0.0036,0.1133,0.106,0.1043,0.2417,0.0123],
    [2021,0.2847,0.0004,-0.0442,0.0102,0.1886,-0.0375,0.047],
    [2022,-0.1804,0.0209,-0.1783,-0.1523,0.0565,0.0055,0.08],
    [2023,0.2606,0.0528,0.0388,0.0874,0.0568,0.1326,0.0412],
    [2024,0.2488,0.0518,-0.0164,0.0174,0.0396,0.2596,0.0295],
    [2025,0.1778,0.0421,0.078,0.0696,0.0158,0.6622,0.0271]
  ];

  /* Briefings describe only what an investor knew at the start of each year: last year's markets and the news.
     Keys are real years; the player sees only "Year 1" to "Year 10" until the debrief. */
  const WINDOWS = {
    plateau: {
      start: 1973, name: 'The high plateau', tag: 'Decade A',
      teaser: 'Stocks sit near record highs after a long boom, led by a few celebrated growth companies. Inflation is starting to creep up.',
      briefs: {
        1973: 'Last year large-company stocks returned about 19%, led by a small group of celebrated growth companies whose shares trade at very high multiples of earnings. The economy is growing fast. Inflation was about 3%, but wage and price controls are being loosened, and the currency’s fixed link to gold was cut two years ago. Gold rose 49% last year.',
        1974: 'A hard year: stocks fell 14%. In the autumn an embargo by major oil producers quadrupled crude prices within months. Inflation is accelerating (6% on average last year and rising fast), and the government is consumed by a political scandal. Gold rose another 73%.',
        1975: 'Stocks fell another 26% last year, the worst year in four decades, and are down by almost half from their peak. Inflation averaged 11%, the economy is in its deepest recession since the war and unemployment is climbing. The head of government resigned over the scandal. Gold rose 66%.',
        1976: 'Shares rebounded 37% last year as inflation eased and the recession ended, while gold fell 25%. Inflation averaged about 9%, and the central bank has been cutting rates.',
        1977: 'Another strong year: stocks +24%, government bonds +16%, corporate bonds +20%, as inflation slowed to under 6%. A new government has taken office promising to bring unemployment down.',
        1978: 'Stocks fell 7% last year even though the economy grew. Inflation is creeping back up (6.5%), the currency is weakening, gold rose 23% and house prices rose 15%.',
        1979: 'Inflation reached 7.6% last year, and the currency slid so far that the government announced an emergency rescue package in the autumn. Gold rose 37%. Government bonds lost money; stocks gained 6.5%.',
        1980: 'A revolution in a major oil-exporting country doubled oil prices again. Inflation averaged 11% and is still rising. In October the central bank changed tactics and let short-term interest rates soar to break inflation. Gold more than doubled last year (+127%).',
        1981: 'Stocks gained 32% last year despite a short recession, while inflation reached 13.5%. Short-term rates are close to 20%. Gold rose 15% after spiking to a record early in the year.',
        1982: 'Stocks slipped 5% and gold fell by a third as the central bank kept rates at record highs. Cash paid 14%. Inflation is falling (10% last year), but the economy is sliding into a second recession and unemployment is rising.'
      },
      story: {
        years: '1973 to 1982', title: 'The Great Inflation',
        lede: 'You ran money through the oil shocks and the Great Inflation. The S&P 500 with dividends nearly doubled in dollars, but consumer prices rose 2.3 times, so stock investors lost about a sixth of their purchasing power.',
        events: [
          ['1973', 'The “Nifty Fifty” glamour stocks peak at forty to ninety times earnings, then the 1973–74 bear market begins. The Arab oil embargo (October 1973) quadruples oil prices.'],
          ['1974', 'Watergate ends with President Nixon’s resignation in August. The S&P 500 falls about 48% from its January 1973 peak to its October 1974 low.'],
          ['1975–77', 'Recovery: stocks rally 37% in 1975 while gold, freely traded by Americans again from 1975, falls 25%.'],
          ['1978', 'The dollar crisis: the Carter administration announces a dollar-rescue package on 1 November 1978.'],
          ['1979', 'The Iranian revolution doubles oil prices. Paul Volcker becomes Fed chairman in August and, on 6 October, switches to targeting the money supply.'],
          ['1980–81', 'Gold peaks at $850 an ounce in January 1980. The prime rate reaches 21.5%; 3-month T-bills pay 14% in 1981.'],
          ['1982', 'Inflation breaks. The bull market starts in August 1982, and Treasury bonds return 33% as rates fall.']
        ],
        lesson: 'In an inflationary decade, nominal returns flatter. Cash and bonds lost purchasing power for years, stocks barely kept up, and real assets such as gold and property did the heavy lifting until the central bank broke inflation.'
      }
    },
    network: {
      start: 1995, name: 'The new network', tag: 'Decade B',
      teaser: 'Inflation is tame, interest rates have just jumped and bonds had a terrible year. A new way of linking computers is spreading fast.',
      briefs: {
        1995: 'Government bonds had their worst year in decades last year (−8%) as the central bank raised rates repeatedly from very low levels. Stocks were flat (+1%). Inflation is under 3%. A new network linking computers, and software for browsing it, is spreading quickly.',
        1996: 'A spectacular year: stocks +37%, government bonds +23%, as rates fell and inflation stayed under 3%. Technology companies are leading the market.',
        1997: 'Stocks gained another 23%. In December the central bank chairman asked in a speech whether markets had become “irrationally exuberant”. Inflation is about 3%.',
        1998: 'Stocks rose 33%, a third year in a row above 20%. In the second half, currency crises swept through East Asian economies. Gold fell 21%. Inflation is low (2.3%).',
        1999: 'Stocks gained 28% despite an autumn scare, when a large government defaulted on its debt and a giant hedge fund nearly collapsed. The central bank cut rates three times. Internet shares are soaring and new companies are listing at a record pace.',
        2000: 'Stocks rose 21% last year, and technology-heavy shares nearly doubled. Government bonds lost 8% as the central bank started raising rates. Valuations are at record highs. Computer systems handled the new millennium without incident.',
        2001: 'The technology bubble burst last year: the broad market fell 9% and technology shares lost far more. Government bonds returned 17%. The central bank has just surprised markets with a rate cut.',
        2002: 'Stocks fell 12% last year in a recession. A terrorist attack on the nation’s financial centre closed stock markets for nearly a week, and a giant energy trader collapsed in an accounting scandal. The central bank cut rates eleven times, to under 2%.',
        2003: 'A third losing year: stocks fell 22% as more accounting frauds came to light at large companies. Government bonds (+15%) and gold (+26%) gained. War in the Middle East looks likely. Short-term rates are close to 1%.',
        2004: 'Stocks rebounded 28% last year once a short war ended. Rates are at 1%, the lowest in decades, and house prices are rising fast.'
      },
      story: {
        years: '1995 to 2004', title: 'The dot-com boom and bust',
        lede: 'You ran money through the internet bubble and its collapse. Five straight years of stocks above 20% were followed by three losing years in a row, the first since 1939–41.',
        events: [
          ['1995', 'Netscape’s August IPO kicks off the internet boom. After the 1994 bond rout, the S&P 500 returns 37%.'],
          ['1996', 'Alan Greenspan’s “irrational exuberance” speech, 5 December 1996.'],
          ['1997–98', 'The Asian financial crisis, then Russia’s default (August 1998) and the rescue of Long-Term Capital Management, brokered by the New York Fed in September 1998.'],
          ['2000', 'The Nasdaq peaks on 10 March 2000 at 5,048 and loses 78% by October 2002.'],
          ['2001', 'Recession; the 11 September attacks close the NYSE until 17 September. Enron files for bankruptcy in December.'],
          ['2002', 'WorldCom’s fraud and bankruptcy. The Sarbanes–Oxley Act is passed.'],
          ['2003–04', 'The Iraq war begins in March 2003. The Fed funds rate is cut to 1% and the housing boom gathers pace.']
        ],
        lesson: 'Valuation matters most when everyone ignores it. The investors who rebalanced away from stocks as prices ran up, and held bonds and gold, kept their gains; those who chased the leaders gave back years of returns.'
      }
    },
    credit: {
      start: 2005, name: 'The credit boom', tag: 'Decade C',
      teaser: 'Interest rates are low but rising slowly, house prices have climbed for years and credit is easy to get.',
      briefs: {
        2005: 'Stocks gained 11% last year. House prices rose 14% as mortgage credit became easy, and the central bank has started raising rates in small, regular steps from 1%. Oil prices are climbing.',
        2006: 'Stocks rose 5%, house prices another 14% and gold 18%. The central bank has raised rates at every meeting, to above 4%. Lending to riskier home buyers has boomed.',
        2007: 'Stocks rose 16% and gold 23%, but house prices barely rose (+2%) and some lenders to riskier home buyers have begun to fail. Short-term rates are about 5%.',
        2008: 'House prices fell 5% last year. Losses on risky mortgages are spreading through the banks; two hedge funds run by a large investment bank collapsed, and the central bank cut rates sharply in the autumn. Stocks still returned 5%; gold rose 32%.',
        2009: 'The worst year in seven decades: stocks −37%, house prices −12%. A major investment bank failed in September, governments rescued banks and insurers, and the central bank cut rates to zero and began buying bonds. Government bonds returned 20%.',
        2010: 'Stocks recovered 26% from a deep low in March and corporate bonds returned 20%, while government bonds lost 11%. Rates remain at zero and unemployment is near 10%.',
        2011: 'Stocks gained 15% and gold 29%. A debt crisis has engulfed several European governments, and the central bank has started a second round of bond buying.',
        2012: 'Stocks managed 2%. The government lost its top credit rating in August, yet its bonds returned 16% as investors fled to safety. Gold rose 12% to a record. Europe’s debt crisis deepened.',
        2013: 'Stocks rose 16% after Europe’s central bank promised to do “whatever it takes” to save its currency. The central bank here launched open-ended bond buying. Rates remain at zero.',
        2014: 'Stocks soared 32%, but government bonds lost 9% and gold 28% when the central bank hinted it would slow its bond buying. House prices rose 11%.'
      },
      story: {
        years: '2005 to 2014', title: 'The housing bubble and the global financial crisis',
        lede: 'You ran money through the US housing bubble, the 2008 crash and the zero-rate recovery. The S&P 500 lost 37% in one year, then more than doubled.',
        events: [
          ['2004–06', 'The Fed raises rates seventeen times in a row, from 1% to 5.25%. Subprime lending booms; house prices peak in 2006.'],
          ['2007', 'Two Bear Stearns hedge funds collapse in June. New Century and other subprime lenders fail.'],
          ['2008', 'Bear Stearns is rescued in March; Lehman Brothers files for bankruptcy on 15 September. AIG is bailed out, TARP is passed and the Fed cuts rates to zero in December.'],
          ['2009', 'Stocks bottom on 9 March 2009 (S&P 500 at 676) and rally 26% for the year.'],
          ['2010–12', 'The Greek bailout and euro crisis. S&P downgrades the US from AAA on 5 August 2011. Mario Draghi’s “whatever it takes” speech, 26 July 2012.'],
          ['2013', 'The “taper tantrum”: Ben Bernanke hints at slowing QE in May; Treasuries lose 9% and gold 28%.']
        ],
        lesson: 'Diversification failed exactly when it was most needed for anything tied to credit and property, but high-quality government bonds paid off in 2008. Investors who sold near the bottom missed one of the strongest recoveries on record.'
      }
    },
    zero: {
      start: 2015, name: 'The zero-rate world', tag: 'Decade D',
      teaser: 'Interest rates have been near zero for six years and stocks have roughly tripled from their low.',
      briefs: {
        2015: 'Stocks gained 14% and government bonds 11% last year. Oil prices halved in the second half. The central bank has ended its bond buying, but rates are still at zero.',
        2016: 'A flat year: stocks +1%, government bonds +1%, gold −12%. A surprise currency devaluation in China rattled markets in the summer, and in December the central bank raised rates for the first time in nearly a decade.',
        2017: 'Stocks rose 12% despite two surprise votes: a referendum abroad to leave a major trading bloc, and an upset national election at home. The central bank raised rates again in December.',
        2018: 'A calm, strong year: stocks +22%, gold +13%, with unusually low volatility. A large cut in corporate taxes was passed in December.',
        2019: 'Stocks fell 4% after a sharp sell-off in the last quarter, as a tariff war escalated and the central bank raised rates four times.',
        2020: 'Stocks jumped 31% last year as the central bank cut rates three times and the trade war cooled. Unemployment is at a 50-year low.',
        2021: 'A pandemic crashed markets last spring (stocks fell a third in five weeks), but rates went to zero, governments spent heavily and stocks ended the year up 18%. Gold rose 24% and government bonds 11%.',
        2022: 'Stocks rose 28% and house prices 19% last year. Inflation jumped to almost 5% on average and is still rising. The central bank calls it temporary but plans to start raising rates.',
        2023: 'A rare year when stocks and bonds both crashed: stocks −18%, government bonds −18%, as inflation hit 8% and the central bank raised rates faster than at any time in four decades. War broke out in Europe and energy prices spiked.',
        2024: 'Stocks rebounded 26%, led by a few giant technology companies riding enthusiasm for artificial intelligence. Three regional banks failed in the spring. Inflation eased to about 4%, and short-term rates are above 5%.'
      },
      story: {
        years: '2015 to 2024', title: 'Zero rates, the pandemic and the inflation shock',
        lede: 'You ran money from the end of quantitative easing through Covid and the 2022 inflation shock, when the classic 60/40 portfolio had one of its worst years ever.',
        events: [
          ['2015', 'China’s August devaluation of the yuan. The Fed’s first rate rise since 2006, in December.'],
          ['2016', 'The Brexit vote (23 June) and Donald Trump’s election (8 November).'],
          ['2017–18', 'The Tax Cuts and Jobs Act (December 2017). The US–China tariff war and a fourth-quarter 2018 sell-off.'],
          ['2020', 'Covid: the S&P 500 falls 34% between 19 February and 23 March, then recovers to a record by August.'],
          ['2021–22', 'US inflation peaks at 9.1% in June 2022. Russia invades Ukraine on 24 February 2022. The Fed raises rates from near zero to 4.25–4.5% within the year; 10-year Treasuries lose 18%.'],
          ['2023–24', 'Silicon Valley Bank fails on 10 March 2023, followed by Signature and First Republic. The AI rally, led by Nvidia, lifts the S&P 500 by 26% in 2023 and 25% in 2024.']
        ],
        lesson: 'When inflation returns, stocks and bonds can fall together, so a portfolio diversified only between the two is less diversified than it looks. Gold and cash protected value in 2022; staying invested in stocks paid off over the decade.'
      }
    },
    boom: {
      start: 1929, name: 'The great boom', tag: 'Decade E', hard: true,
      teaser: 'Shares have doubled in a few years on borrowed money and the economy is booming. Prices in the shops are stable.',
      briefs: {
        1929: 'Stocks returned 44% last year in a speculative boom fuelled by borrowed money. The central bank is trying to curb lending to stock speculators. Prices in the shops are stable.',
        1930: 'Stock prices crashed in October. For the year they ended down 8%, after a huge rally earlier on. The economy is slowing, and the central bank is cutting rates. Prices were flat.',
        1931: 'Stocks fell 25% last year and the economy is shrinking. Hundreds of banks failed, a sweeping tariff law has hit trade, and prices fell about 3%.',
        1932: 'Stocks lost 44% last year, the worst year on record. Banking panics spread, a major trading partner abandoned the gold standard, and the central bank raised rates to defend the currency. Prices fell 9% and corporate bonds lost 16%.',
        1933: 'Stocks fell another 9% and are down more than 80% from their peak. Prices fell 10% last year. A new government takes office in March amid a banking collapse, promising sweeping action.',
        1934: 'Stocks rose 50% last year, the best year on record, after a national bank holiday, an end to the gold standard at home and a burst of government spending. Prices fell more slowly (−5%).',
        1935: 'Stocks were flat last year (−1%), while corporate bonds returned 19%. Prices began rising again (+3%).',
        1936: 'Stocks soared 47% last year as the recovery gathered pace. Prices rose about 3%.',
        1937: 'Stocks gained another 32%. The economy has nearly regained its old peak. The central bank has begun raising the reserves banks must hold, and the government is cutting its deficit.',
        1938: 'Stocks crashed 35% last year as the economy fell back into a sharp recession after the tightening. Corporate bonds lost 4%; government bonds and cash held their value.'
      },
      goldBan: 1933,
      story: {
        years: '1929 to 1938', title: 'The Great Crash and the Depression',
        lede: 'You ran money through the 1929 crash, the Great Depression and the 1937 relapse. From its 1929 peak to its 1932 low, the Dow Jones Industrial Average lost 89%.',
        events: [
          ['1929', 'Black Thursday (24 October) and Black Tuesday (29 October). The Dow falls from 381 in September to 198 in November.'],
          ['1930', 'The Smoot–Hawley Tariff Act (June). The first waves of bank failures.'],
          ['1931', 'Britain leaves the gold standard on 21 September; the Fed raises rates to defend the dollar.'],
          ['1932', 'The market bottoms on 8 July 1932, with the Dow at 41. Prices fall 10% for the year.'],
          ['1933', 'Franklin Roosevelt is inaugurated on 4 March; a national bank holiday follows. Executive Order 6102 (5 April) requires Americans to hand in their gold at $20.67 an ounce.'],
          ['1934', 'The Gold Reserve Act revalues gold to $35 an ounce (January 1934), 69% above the price paid to those who handed it in.'],
          ['1937–38', 'The Fed doubles reserve requirements and fiscal policy tightens. Stocks fall 35% in 1937.']
        ],
        lesson: 'Leverage and concentration turned a crash into ruin. Government bonds and cash gained real value as prices fell, which is the opposite of an inflationary decade. Policy itself can be a risk: gold holders were forced to sell before the government revalued it.'
      }
    },
    mystery: {
      start: null, name: 'Mystery decade', tag: 'Decade ?',
      teaser: 'Ten years drawn at random from the past century. You will be told only what investors knew at the start of each year.'
    }
  };

  /* Short notes for notable years, used in the reveal of a mystery decade. */
  const NOTES = {
    1928: 'A speculative boom on margin lending.', 1929: 'The October crash ends the 1920s boom.', 1930: 'The Smoot–Hawley tariff; bank failures begin.',
    1931: 'Britain leaves gold; the worst year for US stocks on record.', 1932: 'The market bottoms in July, 89% below its 1929 peak.',
    1933: 'Roosevelt takes office; the bank holiday; gold must be handed in.', 1934: 'Gold is revalued to $35 an ounce.', 1937: 'Policy tightening triggers the 1937–38 recession.',
    1939: 'War begins in Europe.', 1941: 'Pearl Harbor; the US enters the Second World War.', 1942: 'Wartime price controls; stocks bottom in April.',
    1945: 'The war ends.', 1946: 'Price controls end and inflation surges.', 1947: 'Inflation peaks at 14%.', 1950: 'The Korean War begins.',
    1954: 'Stocks return 53%, the best post-war year.', 1957: 'A recession and a 10% fall in stocks.', 1962: 'The “Kennedy slide” and the Cuban missile crisis.',
    1966: 'A credit crunch; stocks fall 10%.', 1969: 'Inflation rises above 5%; stocks fall.', 1970: 'Penn Central collapses.',
    1971: 'Nixon ends the dollar’s convertibility into gold (August).', 1972: 'The Nifty Fifty boom.', 1973: 'The OPEC oil embargo.', 1974: 'Watergate; stocks fall 26%.',
    1975: 'Recovery begins.', 1978: 'The dollar crisis.', 1979: 'The Iranian revolution; Volcker’s Fed changes course.', 1980: 'Gold peaks at $850; inflation 13.5%.',
    1981: 'Record interest rates; gold falls a third.', 1982: 'Inflation breaks; the great bull market begins in August.', 1984: 'Continental Illinois is rescued.',
    1985: 'The Plaza Accord.', 1987: 'Black Monday: the Dow falls 22.6% on 19 October.', 1990: 'Iraq invades Kuwait; a recession.', 1991: 'The Gulf War.',
    1994: 'The great bond rout.', 1995: 'Netscape’s IPO launches the internet boom.', 1997: 'The Asian financial crisis.', 1998: 'Russia defaults; LTCM is rescued.',
    1999: 'The dot-com mania peaks.', 2000: 'The Nasdaq peaks in March, then crashes.', 2001: 'The 11 September attacks; Enron collapses.', 2002: 'WorldCom’s fraud.',
    2003: 'The Iraq war.', 2006: 'US house prices peak.', 2007: 'The subprime crisis begins.', 2008: 'Lehman Brothers fails.', 2009: 'Stocks bottom in March.',
    2010: 'The euro crisis begins.', 2011: 'The US loses its AAA rating.', 2012: 'Draghi: “whatever it takes”.', 2013: 'The taper tantrum.', 2014: 'The oil price halves.',
    2015: 'China devalues; the Fed raises rates.', 2016: 'Brexit and Trump’s election.', 2018: 'A tariff war and a fourth-quarter sell-off.', 2020: 'The Covid crash and rebound.',
    2021: 'Inflation returns.', 2022: 'Russia invades Ukraine; stocks and bonds both fall.', 2023: 'SVB fails; the AI rally begins.', 2024: 'The AI rally continues.', 2025: 'Gold rises 66%.'
  };

  window.MarketsData = { RAW, WINDOWS, NOTES };
})();
