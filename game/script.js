(function () {
  const $ = (id) => document.getElementById(id);
  const SVG_NS = 'http://www.w3.org/2000/svg';

  // ---------- Scenario data ----------
  // Each row is a "would you rather" pairing: a monthly income stream vs
  // a lump sum. Four variables, per the brief: the monthly amount, how
  // many years it runs, the lump sum, and when that lump sum lands (0 =
  // today, for every row here). A fresh visit picks a row at random; a
  // shared/bookmarked link re-selects the same row via the `scenario` URL
  // param instead.
  //
  // 500 rows, generated rather than hand-written: years spread 5-30,
  // monthly amount spread £2,000-£20,000 (in £500 steps), and the lump
  // sum solved backwards from a tipping-point target spread evenly across
  // 0%-20% (the lump sum that makes that rate the exact crossover, i.e.
  // the annuity's future value discounted back to today), then rounded to
  // a "nice" figure (finer near small amounts, coarser near large ones)
  // and re-verified against the site's own findTippingPoint() below so
  // the rounding never pushes a scenario's real tipping point outside
  // that 0%-20% range. Comments show each row's actual computed tipping
  // point for reference.
  const SCENARIOS = [
    { monthlyAmount: 5000, years: 6, lumpSum: 300000, lumpSumDelayYears: 0 }, // tipping ~6.4%
    { monthlyAmount: 15500, years: 24, lumpSum: 1250000, lumpSumDelayYears: 0 }, // tipping ~15.4%
    { monthlyAmount: 12000, years: 16, lumpSum: 2000000, lumpSumDelayYears: 0 }, // tipping ~1.8%
    { monthlyAmount: 18000, years: 18, lumpSum: 2350000, lumpSumDelayYears: 0 }, // tipping ~6.3%
    { monthlyAmount: 14000, years: 8, lumpSum: 1240000, lumpSumDelayYears: 0 }, // tipping ~2.0%
    { monthlyAmount: 8000, years: 23, lumpSum: 1620000, lumpSumDelayYears: 0 }, // tipping ~2.9%
    { monthlyAmount: 3000, years: 13, lumpSum: 235000, lumpSumDelayYears: 0 }, // tipping ~12.8%
    { monthlyAmount: 15500, years: 27, lumpSum: 2050000, lumpSumDelayYears: 0 }, // tipping ~8.3%
    { monthlyAmount: 18500, years: 5, lumpSum: 1030000, lumpSumDelayYears: 0 }, // tipping ~3.0%
    { monthlyAmount: 19000, years: 30, lumpSum: 1770000, lumpSumDelayYears: 0 }, // tipping ~13.3%
    { monthlyAmount: 8000, years: 26, lumpSum: 620000, lumpSumDelayYears: 0 }, // tipping ~16.3%
    { monthlyAmount: 15500, years: 16, lumpSum: 1100000, lumpSumDelayYears: 0 }, // tipping ~16.6%
    { monthlyAmount: 12500, years: 7, lumpSum: 930000, lumpSumDelayYears: 0 }, // tipping ~3.6%
    { monthlyAmount: 12000, years: 24, lumpSum: 1500000, lumpSumDelayYears: 0 }, // tipping ~8.6%
    { monthlyAmount: 5500, years: 26, lumpSum: 370000, lumpSumDelayYears: 0 }, // tipping ~19.2%
    { monthlyAmount: 11500, years: 28, lumpSum: 2850000, lumpSumDelayYears: 0 }, // tipping ~2.3%
    { monthlyAmount: 11500, years: 21, lumpSum: 940000, lumpSumDelayYears: 0 }, // tipping ~14.8%
    { monthlyAmount: 15000, years: 26, lumpSum: 2300000, lumpSumDelayYears: 0 }, // tipping ~6.5%
    { monthlyAmount: 14500, years: 15, lumpSum: 1510000, lumpSumDelayYears: 0 }, // tipping ~8.4%
    { monthlyAmount: 11000, years: 27, lumpSum: 1270000, lumpSumDelayYears: 0 }, // tipping ~10.0%
    { monthlyAmount: 6000, years: 22, lumpSum: 425000, lumpSumDelayYears: 0 }, // tipping ~17.8%
    { monthlyAmount: 15000, years: 11, lumpSum: 1090000, lumpSumDelayYears: 0 }, // tipping ~12.8%
    { monthlyAmount: 14000, years: 26, lumpSum: 1440000, lumpSumDelayYears: 0 }, // tipping ~11.6%
    { monthlyAmount: 7500, years: 26, lumpSum: 600000, lumpSumDelayYears: 0 }, // tipping ~15.7%
    { monthlyAmount: 20000, years: 24, lumpSum: 5550000, lumpSumDelayYears: 0 }, // tipping ~0.3%
    { monthlyAmount: 14500, years: 14, lumpSum: 920000, lumpSumDelayYears: 0 }, // tipping ~18.6%
    { monthlyAmount: 2000, years: 22, lumpSum: 220000, lumpSumDelayYears: 0 }, // tipping ~10.0%
    { monthlyAmount: 11000, years: 14, lumpSum: 1060000, lumpSumDelayYears: 0 }, // tipping ~9.2%
    { monthlyAmount: 15500, years: 11, lumpSum: 1270000, lumpSumDelayYears: 0 }, // tipping ~9.9%
    { monthlyAmount: 12000, years: 30, lumpSum: 1610000, lumpSumDelayYears: 0 }, // tipping ~8.5%
    { monthlyAmount: 16000, years: 19, lumpSum: 2350000, lumpSumDelayYears: 0 }, // tipping ~5.1%
    { monthlyAmount: 8500, years: 19, lumpSum: 1130000, lumpSumDelayYears: 0 }, // tipping ~6.5%
    { monthlyAmount: 17000, years: 21, lumpSum: 1980000, lumpSumDelayYears: 0 }, // tipping ~8.9%
    { monthlyAmount: 7000, years: 30, lumpSum: 1990000, lumpSumDelayYears: 0 }, // tipping ~1.6%
    { monthlyAmount: 4500, years: 26, lumpSum: 475000, lumpSumDelayYears: 0 }, // tipping ~11.2%
    { monthlyAmount: 18000, years: 14, lumpSum: 2850000, lumpSumDelayYears: 0 }, // tipping ~0.9%
    { monthlyAmount: 12500, years: 26, lumpSum: 910000, lumpSumDelayYears: 0 }, // tipping ~17.5%
    { monthlyAmount: 9500, years: 7, lumpSum: 730000, lumpSumDelayYears: 0 }, // tipping ~2.6%
    { monthlyAmount: 11500, years: 26, lumpSum: 1410000, lumpSumDelayYears: 0 }, // tipping ~9.1%
    { monthlyAmount: 8000, years: 12, lumpSum: 820000, lumpSumDelayYears: 0 }, // tipping ~6.2%
    { monthlyAmount: 2500, years: 9, lumpSum: 155000, lumpSumDelayYears: 0 }, // tipping ~14.5%
    { monthlyAmount: 9500, years: 6, lumpSum: 540000, lumpSumDelayYears: 0 }, // tipping ~8.4%
    { monthlyAmount: 4000, years: 20, lumpSum: 560000, lumpSumDelayYears: 0 }, // tipping ~6.1%
    { monthlyAmount: 15000, years: 19, lumpSum: 1910000, lumpSumDelayYears: 0 }, // tipping ~7.1%
    { monthlyAmount: 20000, years: 25, lumpSum: 1580000, lumpSumDelayYears: 0 }, // tipping ~15.9%
    { monthlyAmount: 14000, years: 11, lumpSum: 1390000, lumpSumDelayYears: 0 }, // tipping ~5.6%
    { monthlyAmount: 14500, years: 20, lumpSum: 2100000, lumpSumDelayYears: 0 }, // tipping ~5.7%
    { monthlyAmount: 6500, years: 12, lumpSum: 485000, lumpSumDelayYears: 0 }, // tipping ~13.2%
    { monthlyAmount: 2000, years: 25, lumpSum: 290000, lumpSumDelayYears: 0 }, // tipping ~6.9%
    { monthlyAmount: 5000, years: 29, lumpSum: 770000, lumpSumDelayYears: 0 }, // tipping ~6.9%
    { monthlyAmount: 15500, years: 29, lumpSum: 3400000, lumpSumDelayYears: 0 }, // tipping ~3.5%
    { monthlyAmount: 7500, years: 12, lumpSum: 870000, lumpSumDelayYears: 0 }, // tipping ~3.8%
    { monthlyAmount: 18500, years: 30, lumpSum: 1350000, lumpSumDelayYears: 0 }, // tipping ~17.6%
    { monthlyAmount: 3500, years: 19, lumpSum: 325000, lumpSumDelayYears: 0 }, // tipping ~12.1%
    { monthlyAmount: 9500, years: 22, lumpSum: 2050000, lumpSumDelayYears: 0 }, // tipping ~1.9%
    { monthlyAmount: 16500, years: 8, lumpSum: 1180000, lumpSumDelayYears: 0 }, // tipping ~8.0%
    { monthlyAmount: 16500, years: 9, lumpSum: 1120000, lumpSumDelayYears: 0 }, // tipping ~11.8%
    { monthlyAmount: 18500, years: 26, lumpSum: 3200000, lumpSumDelayYears: 0 }, // tipping ~5.2%
    { monthlyAmount: 12000, years: 22, lumpSum: 1970000, lumpSumDelayYears: 0 }, // tipping ~4.8%
    { monthlyAmount: 16000, years: 29, lumpSum: 1390000, lumpSumDelayYears: 0 }, // tipping ~14.4%
    { monthlyAmount: 18000, years: 24, lumpSum: 2500000, lumpSumDelayYears: 0 }, // tipping ~7.3%
    { monthlyAmount: 19500, years: 18, lumpSum: 1540000, lumpSumDelayYears: 0 }, // tipping ~14.9%
    { monthlyAmount: 7000, years: 19, lumpSum: 1390000, lumpSumDelayYears: 0 }, // tipping ~1.5%
    { monthlyAmount: 17000, years: 28, lumpSum: 2700000, lumpSumDelayYears: 0 }, // tipping ~6.4%
    { monthlyAmount: 10000, years: 19, lumpSum: 2250000, lumpSumDelayYears: 0 }, // tipping ~0.1%
    { monthlyAmount: 9500, years: 29, lumpSum: 2050000, lumpSumDelayYears: 0 }, // tipping ~3.7%
    { monthlyAmount: 10500, years: 25, lumpSum: 1030000, lumpSumDelayYears: 0 }, // tipping ~12.2%
    { monthlyAmount: 18500, years: 29, lumpSum: 2700000, lumpSumDelayYears: 0 }, // tipping ~7.4%
    { monthlyAmount: 9500, years: 20, lumpSum: 760000, lumpSumDelayYears: 0 }, // tipping ~15.0%
    { monthlyAmount: 16000, years: 13, lumpSum: 1010000, lumpSumDelayYears: 0 }, // tipping ~18.2%
    { monthlyAmount: 11000, years: 7, lumpSum: 810000, lumpSumDelayYears: 0 }, // tipping ~3.9%
    { monthlyAmount: 10500, years: 12, lumpSum: 640000, lumpSumDelayYears: 0 }, // tipping ~18.5%
    { monthlyAmount: 12000, years: 15, lumpSum: 1050000, lumpSumDelayYears: 0 }, // tipping ~11.7%
    { monthlyAmount: 4500, years: 22, lumpSum: 395000, lumpSumDelayYears: 0 }, // tipping ~13.6%
    { monthlyAmount: 6500, years: 9, lumpSum: 380000, lumpSumDelayYears: 0 }, // tipping ~16.4%
    { monthlyAmount: 14000, years: 12, lumpSum: 920000, lumpSumDelayYears: 0 }, // tipping ~16.4%
    { monthlyAmount: 6500, years: 27, lumpSum: 920000, lumpSumDelayYears: 0 }, // tipping ~7.5%
    { monthlyAmount: 8500, years: 27, lumpSum: 780000, lumpSumDelayYears: 0 }, // tipping ~13.4%
    { monthlyAmount: 15000, years: 7, lumpSum: 960000, lumpSumDelayYears: 0 }, // tipping ~8.4%
    { monthlyAmount: 12500, years: 18, lumpSum: 1780000, lumpSumDelayYears: 0 }, // tipping ~5.1%
    { monthlyAmount: 16500, years: 22, lumpSum: 4150000, lumpSumDelayYears: 0 }, // tipping ~0.4%
    { monthlyAmount: 3500, years: 18, lumpSum: 740000, lumpSumDelayYears: 0 }, // tipping ~0.2%
    { monthlyAmount: 15000, years: 11, lumpSum: 910000, lumpSumDelayYears: 0 }, // tipping ~17.8%
    { monthlyAmount: 2500, years: 17, lumpSum: 255000, lumpSumDelayYears: 0 }, // tipping ~9.8%
    { monthlyAmount: 20000, years: 29, lumpSum: 1600000, lumpSumDelayYears: 0 }, // tipping ~15.8%
    { monthlyAmount: 17000, years: 17, lumpSum: 1200000, lumpSumDelayYears: 0 }, // tipping ~17.0%
    { monthlyAmount: 13000, years: 5, lumpSum: 570000, lumpSumDelayYears: 0 }, // tipping ~13.9%
    { monthlyAmount: 14000, years: 14, lumpSum: 1860000, lumpSumDelayYears: 0 }, // tipping ~3.5%
    { monthlyAmount: 19000, years: 18, lumpSum: 1350000, lumpSumDelayYears: 0 }, // tipping ~17.1%
    { monthlyAmount: 19000, years: 28, lumpSum: 5550000, lumpSumDelayYears: 0 }, // tipping ~1.0%
    { monthlyAmount: 9000, years: 30, lumpSum: 2100000, lumpSumDelayYears: 0 }, // tipping ~3.2%
    { monthlyAmount: 9000, years: 20, lumpSum: 1150000, lumpSumDelayYears: 0 }, // tipping ~7.4%
    { monthlyAmount: 15500, years: 13, lumpSum: 1350000, lumpSumDelayYears: 0 }, // tipping ~10.5%
    { monthlyAmount: 2500, years: 20, lumpSum: 300000, lumpSumDelayYears: 0 }, // tipping ~8.2%
    { monthlyAmount: 12500, years: 17, lumpSum: 1480000, lumpSumDelayYears: 0 }, // tipping ~7.3%
    { monthlyAmount: 14500, years: 26, lumpSum: 2900000, lumpSumDelayYears: 0 }, // tipping ~3.8%
    { monthlyAmount: 7000, years: 28, lumpSum: 1420000, lumpSumDelayYears: 0 }, // tipping ~4.0%
    { monthlyAmount: 6000, years: 19, lumpSum: 435000, lumpSumDelayYears: 0 }, // tipping ~16.9%
    { monthlyAmount: 19000, years: 24, lumpSum: 1500000, lumpSumDelayYears: 0 }, // tipping ~15.8%
    { monthlyAmount: 14500, years: 5, lumpSum: 750000, lumpSumDelayYears: 0 }, // tipping ~6.2%
    { monthlyAmount: 20000, years: 23, lumpSum: 2350000, lumpSumDelayYears: 0 }, // tipping ~9.2%
    { monthlyAmount: 2500, years: 26, lumpSum: 215000, lumpSumDelayYears: 0 }, // tipping ~14.4%
    { monthlyAmount: 15500, years: 7, lumpSum: 960000, lumpSumDelayYears: 0 }, // tipping ~9.5%
    { monthlyAmount: 16500, years: 9, lumpSum: 1040000, lumpSumDelayYears: 0 }, // tipping ~14.0%
    { monthlyAmount: 3500, years: 10, lumpSum: 355000, lumpSumDelayYears: 0 }, // tipping ~3.5%
    { monthlyAmount: 14000, years: 13, lumpSum: 1090000, lumpSumDelayYears: 0 }, // tipping ~13.0%
    { monthlyAmount: 8500, years: 15, lumpSum: 970000, lumpSumDelayYears: 0 }, // tipping ~6.8%
    { monthlyAmount: 12000, years: 19, lumpSum: 920000, lumpSumDelayYears: 0 }, // tipping ~15.7%
    { monthlyAmount: 14000, years: 15, lumpSum: 1660000, lumpSumDelayYears: 0 }, // tipping ~6.2%
    { monthlyAmount: 15000, years: 13, lumpSum: 1190000, lumpSumDelayYears: 0 }, // tipping ~12.5%
    { monthlyAmount: 4500, years: 13, lumpSum: 640000, lumpSumDelayYears: 0 }, // tipping ~1.4%
    { monthlyAmount: 2500, years: 20, lumpSum: 195000, lumpSumDelayYears: 0 }, // tipping ~15.5%
    { monthlyAmount: 19000, years: 28, lumpSum: 4450000, lumpSumDelayYears: 0 }, // tipping ~2.8%
    { monthlyAmount: 13000, years: 6, lumpSum: 830000, lumpSumDelayYears: 0 }, // tipping ~4.1%
    { monthlyAmount: 4000, years: 12, lumpSum: 290000, lumpSumDelayYears: 0 }, // tipping ~13.9%
    { monthlyAmount: 3000, years: 29, lumpSum: 200000, lumpSumDelayYears: 0 }, // tipping ~19.4%
    { monthlyAmount: 2500, years: 29, lumpSum: 185000, lumpSumDelayYears: 0 }, // tipping ~17.3%
    { monthlyAmount: 8000, years: 12, lumpSum: 810000, lumpSumDelayYears: 0 }, // tipping ~6.4%
    { monthlyAmount: 6500, years: 5, lumpSum: 380000, lumpSumDelayYears: 0 }, // tipping ~1.0%
    { monthlyAmount: 6000, years: 12, lumpSum: 520000, lumpSumDelayYears: 0 }, // tipping ~9.7%
    { monthlyAmount: 5500, years: 20, lumpSum: 1280000, lumpSumDelayYears: 0 }, // tipping ~0.3%
    { monthlyAmount: 8500, years: 23, lumpSum: 900000, lumpSumDelayYears: 0 }, // tipping ~10.7%
    { monthlyAmount: 10000, years: 19, lumpSum: 650000, lumpSumDelayYears: 0 }, // tipping ~19.4%
    { monthlyAmount: 13500, years: 29, lumpSum: 1670000, lumpSumDelayYears: 0 }, // tipping ~9.4%
    { monthlyAmount: 5500, years: 10, lumpSum: 415000, lumpSumDelayYears: 0 }, // tipping ~10.5%
    { monthlyAmount: 7000, years: 29, lumpSum: 550000, lumpSumDelayYears: 0 }, // tipping ~16.2%
    { monthlyAmount: 5000, years: 14, lumpSum: 425000, lumpSumDelayYears: 0 }, // tipping ~11.7%
    { monthlyAmount: 2500, years: 23, lumpSum: 325000, lumpSumDelayYears: 0 }, // tipping ~7.9%
    { monthlyAmount: 20000, years: 14, lumpSum: 2400000, lumpSumDelayYears: 0 }, // tipping ~5.2%
    { monthlyAmount: 14000, years: 26, lumpSum: 1310000, lumpSumDelayYears: 0 }, // tipping ~13.0%
    { monthlyAmount: 8000, years: 17, lumpSum: 690000, lumpSumDelayYears: 0 }, // tipping ~12.8%
    { monthlyAmount: 11500, years: 8, lumpSum: 1100000, lumpSumDelayYears: 0 }, // tipping ~0.1%
    { monthlyAmount: 5500, years: 26, lumpSum: 1560000, lumpSumDelayYears: 0 }, // tipping ~0.7%
    { monthlyAmount: 20000, years: 30, lumpSum: 1330000, lumpSumDelayYears: 0 }, // tipping ~19.5%
    { monthlyAmount: 3000, years: 30, lumpSum: 340000, lumpSumDelayYears: 0 }, // tipping ~10.5%
    { monthlyAmount: 19000, years: 16, lumpSum: 2900000, lumpSumDelayYears: 0 }, // tipping ~3.0%
    { monthlyAmount: 13500, years: 18, lumpSum: 1380000, lumpSumDelayYears: 0 }, // tipping ~10.1%
    { monthlyAmount: 18000, years: 7, lumpSum: 1020000, lumpSumDelayYears: 0 }, // tipping ~12.7%
    { monthlyAmount: 12500, years: 25, lumpSum: 1090000, lumpSumDelayYears: 0 }, // tipping ~14.1%
    { monthlyAmount: 15000, years: 5, lumpSum: 600000, lumpSumDelayYears: 0 }, // tipping ~18.7%
    { monthlyAmount: 5000, years: 20, lumpSum: 720000, lumpSumDelayYears: 0 }, // tipping ~5.8%
    { monthlyAmount: 13500, years: 18, lumpSum: 920000, lumpSumDelayYears: 0 }, // tipping ~18.1%
    { monthlyAmount: 16500, years: 25, lumpSum: 3650000, lumpSumDelayYears: 0 }, // tipping ~2.6%
    { monthlyAmount: 6500, years: 27, lumpSum: 950000, lumpSumDelayYears: 0 }, // tipping ~7.2%
    { monthlyAmount: 7500, years: 18, lumpSum: 1050000, lumpSumDelayYears: 0 }, // tipping ~5.3%
    { monthlyAmount: 18500, years: 28, lumpSum: 3150000, lumpSumDelayYears: 0 }, // tipping ~5.7%
    { monthlyAmount: 10500, years: 25, lumpSum: 810000, lumpSumDelayYears: 0 }, // tipping ~16.3%
    { monthlyAmount: 19000, years: 24, lumpSum: 1970000, lumpSumDelayYears: 0 }, // tipping ~11.2%
    { monthlyAmount: 17000, years: 29, lumpSum: 1880000, lumpSumDelayYears: 0 }, // tipping ~10.8%
    { monthlyAmount: 15500, years: 19, lumpSum: 1040000, lumpSumDelayYears: 0 }, // tipping ~18.6%
    { monthlyAmount: 10500, years: 28, lumpSum: 1400000, lumpSumDelayYears: 0 }, // tipping ~8.4%
    { monthlyAmount: 9500, years: 15, lumpSum: 1150000, lumpSumDelayYears: 0 }, // tipping ~5.8%
    { monthlyAmount: 10500, years: 7, lumpSum: 530000, lumpSumDelayYears: 0 }, // tipping ~17.1%
    { monthlyAmount: 9500, years: 19, lumpSum: 930000, lumpSumDelayYears: 0 }, // tipping ~11.1%
    { monthlyAmount: 16500, years: 29, lumpSum: 1500000, lumpSumDelayYears: 0 }, // tipping ~13.7%
    { monthlyAmount: 14000, years: 23, lumpSum: 960000, lumpSumDelayYears: 0 }, // tipping ~18.6%
    { monthlyAmount: 2500, years: 15, lumpSum: 210000, lumpSumDelayYears: 0 }, // tipping ~12.5%
    { monthlyAmount: 12000, years: 20, lumpSum: 2700000, lumpSumDelayYears: 0 }, // tipping ~0.7%
    { monthlyAmount: 17500, years: 10, lumpSum: 1020000, lumpSumDelayYears: 0 }, // tipping ~18.0%
    { monthlyAmount: 13000, years: 11, lumpSum: 1640000, lumpSumDelayYears: 0 }, // tipping ~0.8%
    { monthlyAmount: 10000, years: 30, lumpSum: 1840000, lumpSumDelayYears: 0 }, // tipping ~5.2%
    { monthlyAmount: 10500, years: 15, lumpSum: 1030000, lumpSumDelayYears: 0 }, // tipping ~9.5%
    { monthlyAmount: 10500, years: 24, lumpSum: 1040000, lumpSumDelayYears: 0 }, // tipping ~11.9%
    { monthlyAmount: 2000, years: 22, lumpSum: 200000, lumpSumDelayYears: 0 }, // tipping ~11.5%
    { monthlyAmount: 8000, years: 21, lumpSum: 700000, lumpSumDelayYears: 0 }, // tipping ~13.5%
    { monthlyAmount: 9500, years: 7, lumpSum: 550000, lumpSumDelayYears: 0 }, // tipping ~11.9%
    { monthlyAmount: 15000, years: 28, lumpSum: 2500000, lumpSumDelayYears: 0 }, // tipping ~5.9%
    { monthlyAmount: 19500, years: 20, lumpSum: 2350000, lumpSumDelayYears: 0 }, // tipping ~8.2%
    { monthlyAmount: 9500, years: 29, lumpSum: 770000, lumpSumDelayYears: 0 }, // tipping ~15.6%
    { monthlyAmount: 17000, years: 27, lumpSum: 1340000, lumpSumDelayYears: 0 }, // tipping ~16.0%
    { monthlyAmount: 17500, years: 25, lumpSum: 2400000, lumpSumDelayYears: 0 }, // tipping ~7.6%
    { monthlyAmount: 2500, years: 19, lumpSum: 295000, lumpSumDelayYears: 0 }, // tipping ~8.2%
    { monthlyAmount: 11000, years: 7, lumpSum: 560000, lumpSumDelayYears: 0 }, // tipping ~16.8%
    { monthlyAmount: 14500, years: 12, lumpSum: 2000000, lumpSumDelayYears: 0 }, // tipping ~0.7%
    { monthlyAmount: 9500, years: 27, lumpSum: 2300000, lumpSumDelayYears: 0 }, // tipping ~2.3%
    { monthlyAmount: 13500, years: 14, lumpSum: 1850000, lumpSumDelayYears: 0 }, // tipping ~3.0%
    { monthlyAmount: 19500, years: 20, lumpSum: 1910000, lumpSumDelayYears: 0 }, // tipping ~11.4%
    { monthlyAmount: 13000, years: 21, lumpSum: 2800000, lumpSumDelayYears: 0 }, // tipping ~1.5%
    { monthlyAmount: 19500, years: 18, lumpSum: 1480000, lumpSumDelayYears: 0 }, // tipping ~15.7%
    { monthlyAmount: 13000, years: 15, lumpSum: 840000, lumpSumDelayYears: 0 }, // tipping ~18.5%
    { monthlyAmount: 16500, years: 27, lumpSum: 1870000, lumpSumDelayYears: 0 }, // tipping ~10.3%
    { monthlyAmount: 11500, years: 13, lumpSum: 1180000, lumpSumDelayYears: 0 }, // tipping ~7.2%
    { monthlyAmount: 9000, years: 13, lumpSum: 860000, lumpSumDelayYears: 0 }, // tipping ~8.6%
    { monthlyAmount: 8000, years: 8, lumpSum: 415000, lumpSumDelayYears: 0 }, // tipping ~18.7%
    { monthlyAmount: 5500, years: 15, lumpSum: 380000, lumpSumDelayYears: 0 }, // tipping ~16.9%
    { monthlyAmount: 19000, years: 28, lumpSum: 4500000, lumpSumDelayYears: 0 }, // tipping ~2.7%
    { monthlyAmount: 7500, years: 29, lumpSum: 1560000, lumpSumDelayYears: 0 }, // tipping ~4.0%
    { monthlyAmount: 8500, years: 11, lumpSum: 495000, lumpSumDelayYears: 0 }, // tipping ~19.1%
    { monthlyAmount: 17000, years: 28, lumpSum: 3500000, lumpSumDelayYears: 0 }, // tipping ~3.9%
    { monthlyAmount: 18500, years: 13, lumpSum: 1830000, lumpSumDelayYears: 0 }, // tipping ~7.9%
    { monthlyAmount: 11000, years: 24, lumpSum: 980000, lumpSumDelayYears: 0 }, // tipping ~13.6%
    { monthlyAmount: 8000, years: 8, lumpSum: 510000, lumpSumDelayYears: 0 }, // tipping ~11.5%
    { monthlyAmount: 9000, years: 14, lumpSum: 730000, lumpSumDelayYears: 0 }, // tipping ~12.7%
    { monthlyAmount: 7500, years: 16, lumpSum: 495000, lumpSumDelayYears: 0 }, // tipping ~18.3%
    { monthlyAmount: 2000, years: 14, lumpSum: 245000, lumpSumDelayYears: 0 }, // tipping ~4.9%
    { monthlyAmount: 19000, years: 27, lumpSum: 2250000, lumpSumDelayYears: 0 }, // tipping ~9.7%
    { monthlyAmount: 10500, years: 9, lumpSum: 1050000, lumpSumDelayYears: 0 }, // tipping ~1.7%
    { monthlyAmount: 3500, years: 6, lumpSum: 235000, lumpSumDelayYears: 0 }, // tipping ~2.4%
    { monthlyAmount: 11000, years: 22, lumpSum: 1430000, lumpSumDelayYears: 0 }, // tipping ~7.7%
    { monthlyAmount: 6000, years: 27, lumpSum: 450000, lumpSumDelayYears: 0 }, // tipping ~17.0%
    { monthlyAmount: 17500, years: 25, lumpSum: 1900000, lumpSumDelayYears: 0 }, // tipping ~10.7%
    { monthlyAmount: 2000, years: 8, lumpSum: 135000, lumpSumDelayYears: 0 }, // tipping ~9.7%
    { monthlyAmount: 11000, years: 23, lumpSum: 880000, lumpSumDelayYears: 0 }, // tipping ~15.4%
    { monthlyAmount: 17000, years: 20, lumpSum: 1090000, lumpSumDelayYears: 0 }, // tipping ~19.8%
    { monthlyAmount: 12500, years: 19, lumpSum: 1390000, lumpSumDelayYears: 0 }, // tipping ~9.1%
    { monthlyAmount: 3500, years: 10, lumpSum: 195000, lumpSumDelayYears: 0 }, // tipping ~19.4%
    { monthlyAmount: 17000, years: 13, lumpSum: 2000000, lumpSumDelayYears: 0 }, // tipping ~4.6%
    { monthlyAmount: 4000, years: 8, lumpSum: 370000, lumpSumDelayYears: 0 }, // tipping ~0.9%
    { monthlyAmount: 17500, years: 17, lumpSum: 1900000, lumpSumDelayYears: 0 }, // tipping ~8.7%
    { monthlyAmount: 20000, years: 7, lumpSum: 1430000, lumpSumDelayYears: 0 }, // tipping ~4.8%
    { monthlyAmount: 3500, years: 25, lumpSum: 295000, lumpSumDelayYears: 0 }, // tipping ~14.7%
    { monthlyAmount: 6500, years: 9, lumpSum: 390000, lumpSumDelayYears: 0 }, // tipping ~15.6%
    { monthlyAmount: 20000, years: 30, lumpSum: 1470000, lumpSumDelayYears: 0 }, // tipping ~17.5%
    { monthlyAmount: 4500, years: 14, lumpSum: 380000, lumpSumDelayYears: 0 }, // tipping ~11.8%
    { monthlyAmount: 5500, years: 12, lumpSum: 320000, lumpSumDelayYears: 0 }, // tipping ~19.9%
    { monthlyAmount: 15000, years: 22, lumpSum: 1210000, lumpSumDelayYears: 0 }, // tipping ~15.2%
    { monthlyAmount: 9000, years: 24, lumpSum: 1040000, lumpSumDelayYears: 0 }, // tipping ~9.6%
    { monthlyAmount: 18500, years: 29, lumpSum: 1330000, lumpSumDelayYears: 0 }, // tipping ~17.9%
    { monthlyAmount: 16000, years: 17, lumpSum: 1110000, lumpSumDelayYears: 0 }, // tipping ~17.4%
    { monthlyAmount: 11500, years: 19, lumpSum: 2350000, lumpSumDelayYears: 0 }, // tipping ~1.2%
    { monthlyAmount: 15500, years: 23, lumpSum: 1880000, lumpSumDelayYears: 0 }, // tipping ~8.8%
    { monthlyAmount: 20000, years: 14, lumpSum: 1260000, lumpSumDelayYears: 0 }, // tipping ~18.8%
    { monthlyAmount: 3500, years: 24, lumpSum: 690000, lumpSumDelayYears: 0 }, // tipping ~3.4%
    { monthlyAmount: 5000, years: 24, lumpSum: 425000, lumpSumDelayYears: 0 }, // tipping ~14.4%
    { monthlyAmount: 8500, years: 29, lumpSum: 1740000, lumpSumDelayYears: 0 }, // tipping ~4.1%
    { monthlyAmount: 8500, years: 25, lumpSum: 570000, lumpSumDelayYears: 0 }, // tipping ~19.2%
    { monthlyAmount: 4500, years: 13, lumpSum: 660000, lumpSumDelayYears: 0 }, // tipping ~1.0%
    { monthlyAmount: 9500, years: 10, lumpSum: 670000, lumpSumDelayYears: 0 }, // tipping ~12.4%
    { monthlyAmount: 19500, years: 10, lumpSum: 1720000, lumpSumDelayYears: 0 }, // tipping ~6.7%
    { monthlyAmount: 7000, years: 7, lumpSum: 345000, lumpSumDelayYears: 0 }, // tipping ~18.1%
    { monthlyAmount: 17000, years: 19, lumpSum: 1120000, lumpSumDelayYears: 0 }, // tipping ~19.0%
    { monthlyAmount: 3000, years: 14, lumpSum: 205000, lumpSumDelayYears: 0 }, // tipping ~16.7%
    { monthlyAmount: 11000, years: 12, lumpSum: 990000, lumpSumDelayYears: 0 }, // tipping ~8.9%
    { monthlyAmount: 11000, years: 27, lumpSum: 840000, lumpSumDelayYears: 0 }, // tipping ~16.6%
    { monthlyAmount: 16500, years: 27, lumpSum: 3200000, lumpSumDelayYears: 0 }, // tipping ~4.3%
    { monthlyAmount: 9000, years: 7, lumpSum: 480000, lumpSumDelayYears: 0 }, // tipping ~15.0%
    { monthlyAmount: 8000, years: 13, lumpSum: 1000000, lumpSumDelayYears: 0 }, // tipping ~3.6%
    { monthlyAmount: 5500, years: 18, lumpSum: 375000, lumpSumDelayYears: 0 }, // tipping ~18.1%
    { monthlyAmount: 9000, years: 22, lumpSum: 1260000, lumpSumDelayYears: 0 }, // tipping ~6.7%
    { monthlyAmount: 6500, years: 25, lumpSum: 760000, lumpSumDelayYears: 0 }, // tipping ~9.6%
    { monthlyAmount: 6500, years: 13, lumpSum: 445000, lumpSumDelayYears: 0 }, // tipping ~16.1%
    { monthlyAmount: 3500, years: 7, lumpSum: 275000, lumpSumDelayYears: 0 }, // tipping ~1.9%
    { monthlyAmount: 11500, years: 10, lumpSum: 1130000, lumpSumDelayYears: 0 }, // tipping ~4.2%
    { monthlyAmount: 20000, years: 24, lumpSum: 2550000, lumpSumDelayYears: 0 }, // tipping ~8.3%
    { monthlyAmount: 16000, years: 14, lumpSum: 1490000, lumpSumDelayYears: 0 }, // tipping ~9.8%
    { monthlyAmount: 11500, years: 27, lumpSum: 1560000, lumpSumDelayYears: 0 }, // tipping ~8.0%
    { monthlyAmount: 14500, years: 27, lumpSum: 3450000, lumpSumDelayYears: 0 }, // tipping ~2.4%
    { monthlyAmount: 18000, years: 13, lumpSum: 1100000, lumpSumDelayYears: 0 }, // tipping ~19.1%
    { monthlyAmount: 17500, years: 22, lumpSum: 2600000, lumpSumDelayYears: 0 }, // tipping ~6.0%
    { monthlyAmount: 4500, years: 19, lumpSum: 630000, lumpSumDelayYears: 0 }, // tipping ~5.8%
    { monthlyAmount: 3000, years: 24, lumpSum: 365000, lumpSumDelayYears: 0 }, // tipping ~8.9%
    { monthlyAmount: 12000, years: 18, lumpSum: 860000, lumpSumDelayYears: 0 }, // tipping ~16.9%
    { monthlyAmount: 10000, years: 24, lumpSum: 660000, lumpSumDelayYears: 0 }, // tipping ~19.5%
    { monthlyAmount: 20000, years: 12, lumpSum: 1170000, lumpSumDelayYears: 0 }, // tipping ~19.7%
    { monthlyAmount: 2500, years: 23, lumpSum: 175000, lumpSumDelayYears: 0 }, // tipping ~18.1%
    { monthlyAmount: 10500, years: 29, lumpSum: 2100000, lumpSumDelayYears: 0 }, // tipping ~4.3%
    { monthlyAmount: 3000, years: 23, lumpSum: 295000, lumpSumDelayYears: 0 }, // tipping ~11.9%
    { monthlyAmount: 7500, years: 29, lumpSum: 550000, lumpSumDelayYears: 0 }, // tipping ~17.5%
    { monthlyAmount: 18500, years: 20, lumpSum: 2850000, lumpSumDelayYears: 0 }, // tipping ~4.9%
    { monthlyAmount: 16000, years: 25, lumpSum: 1740000, lumpSumDelayYears: 0 }, // tipping ~10.6%
    { monthlyAmount: 7500, years: 13, lumpSum: 790000, lumpSumDelayYears: 0 }, // tipping ~6.7%
    { monthlyAmount: 15500, years: 23, lumpSum: 1250000, lumpSumDelayYears: 0 }, // tipping ~15.3%
    { monthlyAmount: 17500, years: 25, lumpSum: 4450000, lumpSumDelayYears: 0 }, // tipping ~1.4%
    { monthlyAmount: 17000, years: 7, lumpSum: 1020000, lumpSumDelayYears: 0 }, // tipping ~10.6%
    { monthlyAmount: 15000, years: 16, lumpSum: 2600000, lumpSumDelayYears: 0 }, // tipping ~1.3%
    { monthlyAmount: 12000, years: 15, lumpSum: 860000, lumpSumDelayYears: 0 }, // tipping ~16.0%
    { monthlyAmount: 5000, years: 26, lumpSum: 345000, lumpSumDelayYears: 0 }, // tipping ~18.6%
    { monthlyAmount: 12500, years: 10, lumpSum: 830000, lumpSumDelayYears: 0 }, // tipping ~14.0%
    { monthlyAmount: 17500, years: 18, lumpSum: 1350000, lumpSumDelayYears: 0 }, // tipping ~15.4%
    { monthlyAmount: 14500, years: 14, lumpSum: 2350000, lumpSumDelayYears: 0 }, // tipping ~0.5%
    { monthlyAmount: 19500, years: 29, lumpSum: 3000000, lumpSumDelayYears: 0 }, // tipping ~6.9%
    { monthlyAmount: 16500, years: 6, lumpSum: 820000, lumpSumDelayYears: 0 }, // tipping ~13.9%
    { monthlyAmount: 12000, years: 7, lumpSum: 860000, lumpSumDelayYears: 0 }, // tipping ~4.7%
    { monthlyAmount: 12000, years: 13, lumpSum: 870000, lumpSumDelayYears: 0 }, // tipping ~14.7%
    { monthlyAmount: 14500, years: 8, lumpSum: 1260000, lumpSumDelayYears: 0 }, // tipping ~2.5%
    { monthlyAmount: 2000, years: 21, lumpSum: 230000, lumpSumDelayYears: 0 }, // tipping ~9.1%
    { monthlyAmount: 19000, years: 26, lumpSum: 2100000, lumpSumDelayYears: 0 }, // tipping ~10.5%
    { monthlyAmount: 15000, years: 19, lumpSum: 1680000, lumpSumDelayYears: 0 }, // tipping ~9.0%
    { monthlyAmount: 8000, years: 6, lumpSum: 410000, lumpSumDelayYears: 0 }, // tipping ~12.6%
    { monthlyAmount: 13500, years: 21, lumpSum: 1130000, lumpSumDelayYears: 0 }, // tipping ~14.3%
    { monthlyAmount: 17500, years: 24, lumpSum: 2600000, lumpSumDelayYears: 0 }, // tipping ~6.5%
    { monthlyAmount: 16000, years: 25, lumpSum: 3050000, lumpSumDelayYears: 0 }, // tipping ~4.0%
    { monthlyAmount: 3500, years: 29, lumpSum: 345000, lumpSumDelayYears: 0 }, // tipping ~12.4%
    { monthlyAmount: 10500, years: 11, lumpSum: 710000, lumpSumDelayYears: 0 }, // tipping ~14.8%
    { monthlyAmount: 6000, years: 22, lumpSum: 520000, lumpSumDelayYears: 0 }, // tipping ~13.9%
    { monthlyAmount: 16000, years: 14, lumpSum: 1250000, lumpSumDelayYears: 0 }, // tipping ~13.5%
    { monthlyAmount: 17500, years: 27, lumpSum: 1490000, lumpSumDelayYears: 0 }, // tipping ~14.6%
    { monthlyAmount: 2500, years: 8, lumpSum: 210000, lumpSumDelayYears: 0 }, // tipping ~3.4%
    { monthlyAmount: 9500, years: 25, lumpSum: 990000, lumpSumDelayYears: 0 }, // tipping ~11.3%
    { monthlyAmount: 7000, years: 27, lumpSum: 830000, lumpSumDelayYears: 0 }, // tipping ~9.7%
    { monthlyAmount: 19500, years: 14, lumpSum: 2750000, lumpSumDelayYears: 0 }, // tipping ~2.6%
    { monthlyAmount: 19500, years: 5, lumpSum: 1100000, lumpSumDelayYears: 0 }, // tipping ~2.5%
    { monthlyAmount: 4500, years: 18, lumpSum: 440000, lumpSumDelayYears: 0 }, // tipping ~10.9%
    { monthlyAmount: 5500, years: 12, lumpSum: 355000, lumpSumDelayYears: 0 }, // tipping ~16.9%
    { monthlyAmount: 5500, years: 19, lumpSum: 580000, lumpSumDelayYears: 0 }, // tipping ~9.9%
    { monthlyAmount: 6500, years: 25, lumpSum: 1590000, lumpSumDelayYears: 0 }, // tipping ~1.7%
    { monthlyAmount: 11000, years: 20, lumpSum: 810000, lumpSumDelayYears: 0 }, // tipping ~16.7%
    { monthlyAmount: 10500, years: 21, lumpSum: 850000, lumpSumDelayYears: 0 }, // tipping ~15.0%
    { monthlyAmount: 17000, years: 18, lumpSum: 2450000, lumpSumDelayYears: 0 }, // tipping ~4.9%
    { monthlyAmount: 9500, years: 20, lumpSum: 2050000, lumpSumDelayYears: 0 }, // tipping ~1.1%
    { monthlyAmount: 19500, years: 19, lumpSum: 2900000, lumpSumDelayYears: 0 }, // tipping ~5.0%
    { monthlyAmount: 14000, years: 9, lumpSum: 1160000, lumpSumDelayYears: 0 }, // tipping ~6.3%
    { monthlyAmount: 18000, years: 11, lumpSum: 1240000, lumpSumDelayYears: 0 }, // tipping ~14.2%
    { monthlyAmount: 6000, years: 28, lumpSum: 560000, lumpSumDelayYears: 0 }, // tipping ~13.2%
    { monthlyAmount: 10500, years: 7, lumpSum: 870000, lumpSumDelayYears: 0 }, // tipping ~0.4%
    { monthlyAmount: 15000, years: 29, lumpSum: 1760000, lumpSumDelayYears: 0 }, // tipping ~10.0%
    { monthlyAmount: 18000, years: 15, lumpSum: 2100000, lumpSumDelayYears: 0 }, // tipping ~6.4%
    { monthlyAmount: 2000, years: 13, lumpSum: 160000, lumpSumDelayYears: 0 }, // tipping ~12.3%
    { monthlyAmount: 11500, years: 14, lumpSum: 1930000, lumpSumDelayYears: 0 }, // tipping ~0.0%
    { monthlyAmount: 17500, years: 23, lumpSum: 1840000, lumpSumDelayYears: 0 }, // tipping ~10.9%
    { monthlyAmount: 16000, years: 9, lumpSum: 1110000, lumpSumDelayYears: 0 }, // tipping ~11.1%
    { monthlyAmount: 17000, years: 22, lumpSum: 3200000, lumpSumDelayYears: 0 }, // tipping ~3.3%
    { monthlyAmount: 12500, years: 16, lumpSum: 1400000, lumpSumDelayYears: 0 }, // tipping ~7.7%
    { monthlyAmount: 19000, years: 22, lumpSum: 1640000, lumpSumDelayYears: 0 }, // tipping ~13.9%
    { monthlyAmount: 16500, years: 17, lumpSum: 1070000, lumpSumDelayYears: 0 }, // tipping ~19.0%
    { monthlyAmount: 8000, years: 15, lumpSum: 570000, lumpSumDelayYears: 0 }, // tipping ~16.1%
    { monthlyAmount: 9500, years: 27, lumpSum: 910000, lumpSumDelayYears: 0 }, // tipping ~12.7%
    { monthlyAmount: 14000, years: 23, lumpSum: 2100000, lumpSumDelayYears: 0 }, // tipping ~6.1%
    { monthlyAmount: 15000, years: 12, lumpSum: 1900000, lumpSumDelayYears: 0 }, // tipping ~2.2%
    { monthlyAmount: 12000, years: 6, lumpSum: 650000, lumpSumDelayYears: 0 }, // tipping ~10.3%
    { monthlyAmount: 17000, years: 28, lumpSum: 3600000, lumpSumDelayYears: 0 }, // tipping ~3.6%
    { monthlyAmount: 14000, years: 27, lumpSum: 1590000, lumpSumDelayYears: 0 }, // tipping ~10.3%
    { monthlyAmount: 6500, years: 17, lumpSum: 455000, lumpSumDelayYears: 0 }, // tipping ~17.2%
    { monthlyAmount: 3000, years: 20, lumpSum: 720000, lumpSumDelayYears: 0 }, // tipping ~0.0%
    { monthlyAmount: 18000, years: 9, lumpSum: 990000, lumpSumDelayYears: 0 }, // tipping ~18.5%
    { monthlyAmount: 12500, years: 23, lumpSum: 2450000, lumpSumDelayYears: 0 }, // tipping ~3.2%
    { monthlyAmount: 16000, years: 8, lumpSum: 1110000, lumpSumDelayYears: 0 }, // tipping ~8.9%
    { monthlyAmount: 18500, years: 8, lumpSum: 1000000, lumpSumDelayYears: 0 }, // tipping ~17.2%
    { monthlyAmount: 6500, years: 28, lumpSum: 425000, lumpSumDelayYears: 0 }, // tipping ~19.8%
    { monthlyAmount: 6500, years: 18, lumpSum: 440000, lumpSumDelayYears: 0 }, // tipping ~18.2%
    { monthlyAmount: 17000, years: 7, lumpSum: 950000, lumpSumDelayYears: 0 }, // tipping ~13.2%
    { monthlyAmount: 10000, years: 30, lumpSum: 790000, lumpSumDelayYears: 0 }, // tipping ~16.1%
    { monthlyAmount: 14500, years: 15, lumpSum: 980000, lumpSumDelayYears: 0 }, // tipping ~17.4%
    { monthlyAmount: 4500, years: 25, lumpSum: 1030000, lumpSumDelayYears: 0 }, // tipping ~2.3%
    { monthlyAmount: 19000, years: 15, lumpSum: 3350000, lumpSumDelayYears: 0 }, // tipping ~0.3%
    { monthlyAmount: 12000, years: 17, lumpSum: 1120000, lumpSumDelayYears: 0 }, // tipping ~11.3%
    { monthlyAmount: 17500, years: 25, lumpSum: 3000000, lumpSumDelayYears: 0 }, // tipping ~5.1%
    { monthlyAmount: 3000, years: 22, lumpSum: 310000, lumpSumDelayYears: 0 }, // tipping ~10.9%
    { monthlyAmount: 4000, years: 24, lumpSum: 465000, lumpSumDelayYears: 0 }, // tipping ~9.6%
    { monthlyAmount: 11000, years: 12, lumpSum: 730000, lumpSumDelayYears: 0 }, // tipping ~16.2%
    { monthlyAmount: 4500, years: 12, lumpSum: 425000, lumpSumDelayYears: 0 }, // tipping ~7.8%
    { monthlyAmount: 5000, years: 18, lumpSum: 590000, lumpSumDelayYears: 0 }, // tipping ~7.8%
    { monthlyAmount: 5000, years: 29, lumpSum: 1450000, lumpSumDelayYears: 0 }, // tipping ~1.3%
    { monthlyAmount: 7000, years: 19, lumpSum: 640000, lumpSumDelayYears: 0 }, // tipping ~12.3%
    { monthlyAmount: 11500, years: 27, lumpSum: 760000, lumpSumDelayYears: 0 }, // tipping ~19.6%
    { monthlyAmount: 3000, years: 5, lumpSum: 120000, lumpSumDelayYears: 0 }, // tipping ~18.7%
    { monthlyAmount: 3500, years: 15, lumpSum: 240000, lumpSumDelayYears: 0 }, // tipping ~17.1%
    { monthlyAmount: 13000, years: 14, lumpSum: 1770000, lumpSumDelayYears: 0 }, // tipping ~3.1%
    { monthlyAmount: 15500, years: 16, lumpSum: 2500000, lumpSumDelayYears: 0 }, // tipping ~2.3%
    { monthlyAmount: 9500, years: 9, lumpSum: 980000, lumpSumDelayYears: 0 }, // tipping ~1.0%
    { monthlyAmount: 15000, years: 21, lumpSum: 3150000, lumpSumDelayYears: 0 }, // tipping ~1.8%
    { monthlyAmount: 7500, years: 23, lumpSum: 830000, lumpSumDelayYears: 0 }, // tipping ~10.1%
    { monthlyAmount: 7500, years: 10, lumpSum: 570000, lumpSumDelayYears: 0 }, // tipping ~10.4%
    { monthlyAmount: 14000, years: 7, lumpSum: 1070000, lumpSumDelayYears: 0 }, // tipping ~2.7%
    { monthlyAmount: 9500, years: 24, lumpSum: 760000, lumpSumDelayYears: 0 }, // tipping ~15.5%
    { monthlyAmount: 6500, years: 20, lumpSum: 470000, lumpSumDelayYears: 0 }, // tipping ~17.1%
    { monthlyAmount: 16500, years: 12, lumpSum: 1530000, lumpSumDelayYears: 0 }, // tipping ~8.2%
    { monthlyAmount: 10000, years: 25, lumpSum: 1000000, lumpSumDelayYears: 0 }, // tipping ~11.9%
    { monthlyAmount: 10000, years: 19, lumpSum: 1130000, lumpSumDelayYears: 0 }, // tipping ~8.8%
    { monthlyAmount: 2000, years: 26, lumpSum: 200000, lumpSumDelayYears: 0 }, // tipping ~12.0%
    { monthlyAmount: 16500, years: 30, lumpSum: 3000000, lumpSumDelayYears: 0 }, // tipping ~5.3%
    { monthlyAmount: 19000, years: 14, lumpSum: 1670000, lumpSumDelayYears: 0 }, // tipping ~11.0%
    { monthlyAmount: 4000, years: 10, lumpSum: 225000, lumpSumDelayYears: 0 }, // tipping ~19.1%
    { monthlyAmount: 13000, years: 19, lumpSum: 1920000, lumpSumDelayYears: 0 }, // tipping ~5.1%
    { monthlyAmount: 11500, years: 23, lumpSum: 750000, lumpSumDelayYears: 0 }, // tipping ~19.7%
    { monthlyAmount: 15500, years: 25, lumpSum: 1120000, lumpSumDelayYears: 0 }, // tipping ~17.6%
    { monthlyAmount: 10000, years: 27, lumpSum: 2250000, lumpSumDelayYears: 0 }, // tipping ~2.9%
    { monthlyAmount: 11500, years: 19, lumpSum: 1250000, lumpSumDelayYears: 0 }, // tipping ~9.4%
    { monthlyAmount: 14000, years: 11, lumpSum: 1000000, lumpSumDelayYears: 0 }, // tipping ~13.3%
    { monthlyAmount: 5000, years: 20, lumpSum: 610000, lumpSumDelayYears: 0 }, // tipping ~8.0%
    { monthlyAmount: 14000, years: 12, lumpSum: 1180000, lumpSumDelayYears: 0 }, // tipping ~10.3%
    { monthlyAmount: 13000, years: 23, lumpSum: 1160000, lumpSumDelayYears: 0 }, // tipping ~13.5%
    { monthlyAmount: 11000, years: 23, lumpSum: 900000, lumpSumDelayYears: 0 }, // tipping ~15.0%
    { monthlyAmount: 11000, years: 27, lumpSum: 910000, lumpSumDelayYears: 0 }, // tipping ~15.1%
    { monthlyAmount: 14500, years: 5, lumpSum: 630000, lumpSumDelayYears: 0 }, // tipping ~14.4%
    { monthlyAmount: 2000, years: 13, lumpSum: 165000, lumpSumDelayYears: 0 }, // tipping ~11.7%
    { monthlyAmount: 3500, years: 23, lumpSum: 620000, lumpSumDelayYears: 0 }, // tipping ~4.3%
    { monthlyAmount: 17500, years: 24, lumpSum: 4300000, lumpSumDelayYears: 0 }, // tipping ~1.4%
    { monthlyAmount: 9000, years: 14, lumpSum: 1060000, lumpSumDelayYears: 0 }, // tipping ~5.5%
    { monthlyAmount: 13000, years: 24, lumpSum: 1670000, lumpSumDelayYears: 0 }, // tipping ~8.2%
    { monthlyAmount: 10000, years: 24, lumpSum: 1490000, lumpSumDelayYears: 0 }, // tipping ~6.4%
    { monthlyAmount: 6000, years: 26, lumpSum: 400000, lumpSumDelayYears: 0 }, // tipping ~19.3%
    { monthlyAmount: 5000, years: 25, lumpSum: 890000, lumpSumDelayYears: 0 }, // tipping ~4.7%
    { monthlyAmount: 3000, years: 25, lumpSum: 780000, lumpSumDelayYears: 0 }, // tipping ~1.2%
    { monthlyAmount: 16000, years: 14, lumpSum: 1770000, lumpSumDelayYears: 0 }, // tipping ~6.6%
    { monthlyAmount: 13500, years: 6, lumpSum: 670000, lumpSumDelayYears: 0 }, // tipping ~14.0%
    { monthlyAmount: 6000, years: 28, lumpSum: 415000, lumpSumDelayYears: 0 }, // tipping ~18.6%
    { monthlyAmount: 11000, years: 7, lumpSum: 650000, lumpSumDelayYears: 0 }, // tipping ~11.2%
    { monthlyAmount: 15000, years: 15, lumpSum: 1170000, lumpSumDelayYears: 0 }, // tipping ~14.1%
    { monthlyAmount: 8000, years: 10, lumpSum: 440000, lumpSumDelayYears: 0 }, // tipping ~19.9%
    { monthlyAmount: 19000, years: 9, lumpSum: 1620000, lumpSumDelayYears: 0 }, // tipping ~5.6%
    { monthlyAmount: 18500, years: 16, lumpSum: 1210000, lumpSumDelayYears: 0 }, // tipping ~18.6%
    { monthlyAmount: 10500, years: 21, lumpSum: 1180000, lumpSumDelayYears: 0 }, // tipping ~9.5%
    { monthlyAmount: 10000, years: 10, lumpSum: 610000, lumpSumDelayYears: 0 }, // tipping ~16.6%
    { monthlyAmount: 11000, years: 20, lumpSum: 710000, lumpSumDelayYears: 0 }, // tipping ~19.7%
    { monthlyAmount: 12500, years: 28, lumpSum: 910000, lumpSumDelayYears: 0 }, // tipping ~17.6%
    { monthlyAmount: 5500, years: 30, lumpSum: 600000, lumpSumDelayYears: 0 }, // tipping ~11.0%
    { monthlyAmount: 4000, years: 19, lumpSum: 670000, lumpSumDelayYears: 0 }, // tipping ~3.5%
    { monthlyAmount: 9000, years: 9, lumpSum: 530000, lumpSumDelayYears: 0 }, // tipping ~16.2%
    { monthlyAmount: 14500, years: 26, lumpSum: 1400000, lumpSumDelayYears: 0 }, // tipping ~12.5%
    { monthlyAmount: 19500, years: 30, lumpSum: 5700000, lumpSumDelayYears: 0 }, // tipping ~1.4%
    { monthlyAmount: 4500, years: 16, lumpSum: 370000, lumpSumDelayYears: 0 }, // tipping ~13.4%
    { monthlyAmount: 14500, years: 30, lumpSum: 1300000, lumpSumDelayYears: 0 }, // tipping ~13.9%
    { monthlyAmount: 10000, years: 5, lumpSum: 400000, lumpSumDelayYears: 0 }, // tipping ~18.7%
    { monthlyAmount: 5500, years: 22, lumpSum: 850000, lumpSumDelayYears: 0 }, // tipping ~5.5%
    { monthlyAmount: 13500, years: 19, lumpSum: 1140000, lumpSumDelayYears: 0 }, // tipping ~13.8%
    { monthlyAmount: 10000, years: 26, lumpSum: 1900000, lumpSumDelayYears: 0 }, // tipping ~4.3%
    { monthlyAmount: 14000, years: 23, lumpSum: 1910000, lumpSumDelayYears: 0 }, // tipping ~7.3%
    { monthlyAmount: 13500, years: 25, lumpSum: 1860000, lumpSumDelayYears: 0 }, // tipping ~7.5%
    { monthlyAmount: 9000, years: 8, lumpSum: 760000, lumpSumDelayYears: 0 }, // tipping ~3.3%
    { monthlyAmount: 2500, years: 20, lumpSum: 315000, lumpSumDelayYears: 0 }, // tipping ~7.6%
    { monthlyAmount: 19500, years: 24, lumpSum: 1800000, lumpSumDelayYears: 0 }, // tipping ~13.0%
    { monthlyAmount: 9000, years: 15, lumpSum: 890000, lumpSumDelayYears: 0 }, // tipping ~9.3%
    { monthlyAmount: 4000, years: 25, lumpSum: 280000, lumpSumDelayYears: 0 }, // tipping ~18.3%
    { monthlyAmount: 16500, years: 25, lumpSum: 1170000, lumpSumDelayYears: 0 }, // tipping ~18.0%
    { monthlyAmount: 11500, years: 27, lumpSum: 2850000, lumpSumDelayYears: 0 }, // tipping ~2.1%
    { monthlyAmount: 15000, years: 25, lumpSum: 1010000, lumpSumDelayYears: 0 }, // tipping ~19.1%
    { monthlyAmount: 6000, years: 8, lumpSum: 320000, lumpSumDelayYears: 0 }, // tipping ~17.7%
    { monthlyAmount: 3000, years: 6, lumpSum: 180000, lumpSumDelayYears: 0 }, // tipping ~6.4%
    { monthlyAmount: 17500, years: 14, lumpSum: 1240000, lumpSumDelayYears: 0 }, // tipping ~15.8%
    { monthlyAmount: 5000, years: 8, lumpSum: 400000, lumpSumDelayYears: 0 }, // tipping ~4.8%
    { monthlyAmount: 19000, years: 12, lumpSum: 1400000, lumpSumDelayYears: 0 }, // tipping ~13.5%
    { monthlyAmount: 14000, years: 9, lumpSum: 1450000, lumpSumDelayYears: 0 }, // tipping ~0.9%
    { monthlyAmount: 13500, years: 19, lumpSum: 2700000, lumpSumDelayYears: 0 }, // tipping ~1.4%
    { monthlyAmount: 19000, years: 26, lumpSum: 1630000, lumpSumDelayYears: 0 }, // tipping ~14.4%
    { monthlyAmount: 6500, years: 18, lumpSum: 1010000, lumpSumDelayYears: 0 }, // tipping ~3.9%
    { monthlyAmount: 5000, years: 18, lumpSum: 465000, lumpSumDelayYears: 0 }, // tipping ~11.7%
    { monthlyAmount: 15000, years: 20, lumpSum: 1910000, lumpSumDelayYears: 0 }, // tipping ~7.4%
    { monthlyAmount: 13500, years: 27, lumpSum: 1300000, lumpSumDelayYears: 0 }, // tipping ~12.6%
    { monthlyAmount: 16000, years: 11, lumpSum: 1160000, lumpSumDelayYears: 0 }, // tipping ~12.9%
    { monthlyAmount: 9500, years: 19, lumpSum: 690000, lumpSumDelayYears: 0 }, // tipping ~16.8%
    { monthlyAmount: 5000, years: 16, lumpSum: 620000, lumpSumDelayYears: 0 }, // tipping ~6.1%
    { monthlyAmount: 13500, years: 26, lumpSum: 1410000, lumpSumDelayYears: 0 }, // tipping ~11.3%
    { monthlyAmount: 13000, years: 22, lumpSum: 2900000, lumpSumDelayYears: 0 }, // tipping ~1.6%
    { monthlyAmount: 14500, years: 6, lumpSum: 840000, lumpSumDelayYears: 0 }, // tipping ~7.7%
    { monthlyAmount: 8000, years: 13, lumpSum: 1060000, lumpSumDelayYears: 0 }, // tipping ~2.6%
    { monthlyAmount: 16500, years: 8, lumpSum: 1070000, lumpSumDelayYears: 0 }, // tipping ~11.0%
    { monthlyAmount: 8500, years: 7, lumpSum: 530000, lumpSumDelayYears: 0 }, // tipping ~9.3%
    { monthlyAmount: 2500, years: 25, lumpSum: 210000, lumpSumDelayYears: 0 }, // tipping ~14.7%
    { monthlyAmount: 12500, years: 6, lumpSum: 880000, lumpSumDelayYears: 0 }, // tipping ~0.7%
    { monthlyAmount: 6000, years: 12, lumpSum: 395000, lumpSumDelayYears: 0 }, // tipping ~16.4%
    { monthlyAmount: 20000, years: 30, lumpSum: 3600000, lumpSumDelayYears: 0 }, // tipping ~5.4%
    { monthlyAmount: 4000, years: 11, lumpSum: 295000, lumpSumDelayYears: 0 }, // tipping ~12.5%
    { monthlyAmount: 19500, years: 29, lumpSum: 2950000, lumpSumDelayYears: 0 }, // tipping ~7.1%
    { monthlyAmount: 8500, years: 11, lumpSum: 520000, lumpSumDelayYears: 0 }, // tipping ~17.6%
    { monthlyAmount: 12500, years: 12, lumpSum: 1210000, lumpSumDelayYears: 0 }, // tipping ~7.3%
    { monthlyAmount: 6500, years: 29, lumpSum: 1730000, lumpSumDelayYears: 0 }, // tipping ~2.0%
    { monthlyAmount: 2000, years: 30, lumpSum: 285000, lumpSumDelayYears: 0 }, // tipping ~7.8%
    { monthlyAmount: 6500, years: 13, lumpSum: 395000, lumpSumDelayYears: 0 }, // tipping ~19.3%
    { monthlyAmount: 19000, years: 9, lumpSum: 1010000, lumpSumDelayYears: 0 }, // tipping ~19.7%
    { monthlyAmount: 7500, years: 13, lumpSum: 780000, lumpSumDelayYears: 0 }, // tipping ~6.9%
    { monthlyAmount: 2500, years: 8, lumpSum: 140000, lumpSumDelayYears: 0 }, // tipping ~15.9%
    { monthlyAmount: 2000, years: 9, lumpSum: 180000, lumpSumDelayYears: 0 }, // tipping ~4.2%
    { monthlyAmount: 9500, years: 16, lumpSum: 1430000, lumpSumDelayYears: 0 }, // tipping ~3.2%
    { monthlyAmount: 12000, years: 23, lumpSum: 820000, lumpSumDelayYears: 0 }, // tipping ~18.6%
    { monthlyAmount: 7500, years: 5, lumpSum: 380000, lumpSumDelayYears: 0 }, // tipping ~7.1%
    { monthlyAmount: 3500, years: 13, lumpSum: 210000, lumpSumDelayYears: 0 }, // tipping ~19.6%
    { monthlyAmount: 15000, years: 9, lumpSum: 940000, lumpSumDelayYears: 0 }, // tipping ~14.2%
    { monthlyAmount: 5500, years: 21, lumpSum: 1010000, lumpSumDelayYears: 0 }, // tipping ~3.2%
    { monthlyAmount: 4000, years: 28, lumpSum: 310000, lumpSumDelayYears: 0 }, // tipping ~16.4%
    { monthlyAmount: 16000, years: 20, lumpSum: 1250000, lumpSumDelayYears: 0 }, // tipping ~15.5%
    { monthlyAmount: 13500, years: 29, lumpSum: 4600000, lumpSumDelayYears: 0 }, // tipping ~0.1%
    { monthlyAmount: 5000, years: 21, lumpSum: 350000, lumpSumDelayYears: 0 }, // tipping ~17.9%
    { monthlyAmount: 18000, years: 19, lumpSum: 1320000, lumpSumDelayYears: 0 }, // tipping ~16.6%
    { monthlyAmount: 3000, years: 12, lumpSum: 315000, lumpSumDelayYears: 0 }, // tipping ~5.7%
    { monthlyAmount: 18500, years: 28, lumpSum: 1860000, lumpSumDelayYears: 0 }, // tipping ~12.1%
    { monthlyAmount: 16500, years: 14, lumpSum: 1590000, lumpSumDelayYears: 0 }, // tipping ~9.2%
    { monthlyAmount: 2500, years: 25, lumpSum: 455000, lumpSumDelayYears: 0 }, // tipping ~4.5%
    { monthlyAmount: 17000, years: 6, lumpSum: 960000, lumpSumDelayYears: 0 }, // tipping ~8.7%
    { monthlyAmount: 15500, years: 17, lumpSum: 990000, lumpSumDelayYears: 0 }, // tipping ~19.4%
    { monthlyAmount: 5000, years: 26, lumpSum: 430000, lumpSumDelayYears: 0 }, // tipping ~14.4%
    { monthlyAmount: 16000, years: 20, lumpSum: 1400000, lumpSumDelayYears: 0 }, // tipping ~13.3%
    { monthlyAmount: 4500, years: 7, lumpSum: 240000, lumpSumDelayYears: 0 }, // tipping ~15.0%
    { monthlyAmount: 6500, years: 15, lumpSum: 880000, lumpSumDelayYears: 0 }, // tipping ~4.1%
    { monthlyAmount: 6000, years: 7, lumpSum: 350000, lumpSumDelayYears: 0 }, // tipping ~11.6%
    { monthlyAmount: 19500, years: 13, lumpSum: 2950000, lumpSumDelayYears: 0 }, // tipping ~0.5%
    { monthlyAmount: 12000, years: 27, lumpSum: 1180000, lumpSumDelayYears: 0 }, // tipping ~12.3%
    { monthlyAmount: 18500, years: 17, lumpSum: 1830000, lumpSumDelayYears: 0 }, // tipping ~10.3%
    { monthlyAmount: 16500, years: 14, lumpSum: 2050000, lumpSumDelayYears: 0 }, // tipping ~4.6%
    { monthlyAmount: 15500, years: 21, lumpSum: 2550000, lumpSumDelayYears: 0 }, // tipping ~4.5%
    { monthlyAmount: 5500, years: 8, lumpSum: 490000, lumpSumDelayYears: 0 }, // tipping ~1.9%
    { monthlyAmount: 19500, years: 25, lumpSum: 5450000, lumpSumDelayYears: 0 }, // tipping ~0.6%
    { monthlyAmount: 8500, years: 28, lumpSum: 2600000, lumpSumDelayYears: 0 }, // tipping ~0.7%
    { monthlyAmount: 16000, years: 18, lumpSum: 1790000, lumpSumDelayYears: 0 }, // tipping ~8.6%
    { monthlyAmount: 15000, years: 12, lumpSum: 1170000, lumpSumDelayYears: 0 }, // tipping ~12.1%
    { monthlyAmount: 16500, years: 15, lumpSum: 2600000, lumpSumDelayYears: 0 }, // tipping ~1.8%
    { monthlyAmount: 15000, years: 17, lumpSum: 1410000, lumpSumDelayYears: 0 }, // tipping ~11.2%
    { monthlyAmount: 5000, years: 28, lumpSum: 350000, lumpSumDelayYears: 0 }, // tipping ~18.4%
    { monthlyAmount: 15500, years: 15, lumpSum: 950000, lumpSumDelayYears: 0 }, // tipping ~19.9%
    { monthlyAmount: 10000, years: 15, lumpSum: 790000, lumpSumDelayYears: 0 }, // tipping ~13.8%
    { monthlyAmount: 6500, years: 16, lumpSum: 1060000, lumpSumDelayYears: 0 }, // tipping ~2.1%
    { monthlyAmount: 17000, years: 26, lumpSum: 1400000, lumpSumDelayYears: 0 }, // tipping ~15.2%
    { monthlyAmount: 4500, years: 7, lumpSum: 345000, lumpSumDelayYears: 0 }, // tipping ~2.7%
    { monthlyAmount: 4500, years: 7, lumpSum: 325000, lumpSumDelayYears: 0 }, // tipping ~4.5%
    { monthlyAmount: 5000, years: 18, lumpSum: 720000, lumpSumDelayYears: 0 }, // tipping ~4.9%
    { monthlyAmount: 13500, years: 28, lumpSum: 2300000, lumpSumDelayYears: 0 }, // tipping ~5.7%
    { monthlyAmount: 6000, years: 30, lumpSum: 500000, lumpSumDelayYears: 0 }, // tipping ~15.2%
    { monthlyAmount: 3500, years: 22, lumpSum: 880000, lumpSumDelayYears: 0 }, // tipping ~0.4%
    { monthlyAmount: 19500, years: 23, lumpSum: 4200000, lumpSumDelayYears: 0 }, // tipping ~2.3%
    { monthlyAmount: 12500, years: 22, lumpSum: 1130000, lumpSumDelayYears: 0 }, // tipping ~13.1%
  ];

  // Long-run stock market average, used as the "typical" reference point
  // both on the gauge and in the result copy.
  const REFERENCE_RATE = 0.07;

  // ---------- Formatting helpers ----------
  const fmtNumber = (n) => new Intl.NumberFormat('en-GB').format(Math.round(n));
  const fmtCurrency = (n) => '£' + fmtNumber(n);
  const fmtRate = (r) => (r * 100).toFixed(1) + '%';

  function parseNumber(str) {
    const cleaned = String(str).replace(/[^0-9.\-]/g, '');
    const val = parseFloat(cleaned);
    return isNaN(val) ? 0 : val;
  }

  // ---------- Math model ----------
  // Future value of the monthly income stream, compounded monthly at the
  // effective monthly rate implied by the given annual rate.
  function annuityFutureValue(monthlyAmount, years, annualRate) {
    const n = Math.round(years * 12);
    if (n <= 0) return 0;
    const rm = Math.pow(1 + annualRate, 1 / 12) - 1;
    if (Math.abs(rm) < 1e-9) return monthlyAmount * n;
    return monthlyAmount * ((Math.pow(1 + rm, n) - 1) / rm);
  }

  // Future value of the lump sum, grown annually from whenever it's
  // actually received (lumpSumDelayYears) through to the end of the
  // horizon (years).
  function lumpSumFutureValue(lumpSum, years, delayYears, annualRate) {
    const growthYears = Math.max(0, years - delayYears);
    return lumpSum * Math.pow(1 + annualRate, growthYears);
  }

  function bisect(f, lo, hi, iterations) {
    let fLo = f(lo);
    for (let i = 0; i < iterations; i++) {
      const mid = (lo + hi) / 2;
      const fMid = f(mid);
      if ((fLo < 0) === (fMid < 0)) {
        lo = mid;
        fLo = fMid;
      } else {
        hi = mid;
      }
    }
    return (lo + hi) / 2;
  }

  // The tipping point: the average annual return at which both choices
  // are worth exactly the same after `years`. Scans for a sign change in
  // (income FV − lump FV) across a wide rate range, then bisects within
  // it — robust even if the two curves aren't perfectly well-behaved for
  // some future scenario's numbers, rather than assuming a closed form.
  function findTippingPoint(scenario) {
    const f = (r) =>
      annuityFutureValue(scenario.monthlyAmount, scenario.years, r) -
      lumpSumFutureValue(scenario.lumpSum, scenario.years, scenario.lumpSumDelayYears, r);

    const steps = 400;
    const maxScan = 1.0; // scan up to 100% annual return — plenty of headroom
    let prevR = 0;
    let prevF = f(0);
    for (let i = 1; i <= steps; i++) {
      const r = (i / steps) * maxScan;
      const fr = f(r);
      if ((prevF < 0) !== (fr < 0)) {
        return bisect(f, prevR, r, 60);
      }
      prevR = r;
      prevF = fr;
    }
    return null; // no crossing found — shouldn't happen for sane inputs
  }

  function scenarioLabels(scenario) {
    // Value/time split out separately too — the choice buttons on the
    // question screen put each on its own line, while every other use of
    // *Headline elsewhere on the page (sentences, table rows) still wants
    // the single-line combined form.
    const incomeNumber = fmtCurrency(scenario.monthlyAmount);
    const incomeValue = `${incomeNumber} a month`;
    const incomeTime = `for ${scenario.years} years`;
    const lumpNumber = fmtCurrency(scenario.lumpSum);
    const lumpValue = lumpNumber;
    const lumpTime = scenario.lumpSumDelayYears > 0 ? `in ${scenario.lumpSumDelayYears} years` : 'right now';
    return {
      incomeHeadline: `${incomeValue} ${incomeTime}`,
      incomeNumber,
      incomeRest: `a month ${incomeTime}`,
      incomeValue,
      incomeTime,
      incomeSub: `${fmtCurrency(scenario.monthlyAmount * 12 * scenario.years)} total, paid monthly`,
      lumpHeadline: `${lumpValue} ${lumpTime}`,
      lumpNumber,
      lumpRest: lumpTime,
      lumpValue,
      lumpTime,
      lumpSub: scenario.lumpSumDelayYears > 0 ? 'One lump sum, later' : 'One lump sum, today',
    };
  }

  // ---------- DOM refs ----------
  const screens = { choice: $('screenChoice'), email: $('screenEmail'), result: $('screenResult') };

  const choiceIncomeBtn = $('choiceIncomeBtn');
  const choiceLumpBtn = $('choiceLumpBtn');
  const choiceIncomeLabel = $('choiceIncomeLabel');
  const choiceIncomeSub = $('choiceIncomeSub');
  const choiceLumpLabel = $('choiceLumpLabel');
  const choiceLumpSub = $('choiceLumpSub');

  const emailHeadlineEl = $('emailHeadline');
  const continueToResultBtn = $('continueToResultBtn');

  const resultHeadlineEl = $('resultHeadline');
  const resultSubEl = $('resultSub');
  const gaugeSvg = $('gaugeSvg');
  const gaugeValueEl = $('gaugeValue');
  const resultRuleEl = $('resultRule');

  const tippingFvBlockEl = $('tippingFvBlock');
  const tippingFvLabelEl = $('tippingFvLabel');
  const tippingFvValueEl = $('tippingFvValue');

  const rowIncomeLabel = $('rowIncomeLabel');
  const rowLumpLabel = $('rowLumpLabel');
  const assumedRateInput = $('assumedRate');
  const assumedRateRange = $('assumedRateRange');
  const fvIncomeEl = $('fvIncome');
  const fvLumpEl = $('fvLump');
  const barChartSvg = $('barChartSvg');
  const barChartDiffEl = $('barChartDiff');
  const balanceChartCanvas = $('balanceChart');
  const balanceChartCtx = balanceChartCanvas.getContext('2d');
  const balanceLegendIncomeDot = $('balanceLegendIncomeDot');
  const balanceLegendLumpDot = $('balanceLegendLumpDot');
  const winnerIncomeEl = $('winnerIncome');
  const winnerLumpEl = $('winnerLump');

  const copyLinkBtn = $('copyLinkBtn');
  const shareLinkBtn = $('shareLinkBtn');
  const playAgainBtn = $('playAgainBtn');
  const shareStatus = $('shareStatus');

  // ---------- URL params ----------
  function readUrlParams() {
    const params = new URLSearchParams(location.search);
    let scenarioIndex = params.has('scenario') ? parseInt(params.get('scenario'), 10) : Math.floor(Math.random() * SCENARIOS.length);
    if (!(scenarioIndex >= 0 && scenarioIndex < SCENARIOS.length)) scenarioIndex = 0;

    const choiceParam = params.get('choice');
    const choice = choiceParam === 'income' || choiceParam === 'lump' ? choiceParam : null;

    let assumedRate = null;
    if (params.has('rate')) {
      const r = parseFloat(params.get('rate'));
      if (!isNaN(r)) assumedRate = r;
    }

    return { scenarioIndex, choice, assumedRate };
  }

  function updateUrl() {
    const params = new URLSearchParams();
    params.set('scenario', String(state.scenarioIndex));
    if (state.choice) params.set('choice', state.choice);
    if (state.choice) params.set('rate', parseNumber(assumedRateInput.value));
    history.replaceState(null, '', `${location.pathname}?${params.toString()}`);
  }

  function shareUrl() {
    const params = new URLSearchParams();
    params.set('scenario', String(state.scenarioIndex));
    if (state.choice) params.set('choice', state.choice);
    return `${location.origin}${location.pathname}?${params.toString()}`;
  }

  // ---------- State ----------
  const initial = readUrlParams();
  const state = {
    scenarioIndex: initial.scenarioIndex,
    scenario: SCENARIOS[initial.scenarioIndex],
    choice: null,
    tippingRate: null,
  };
  state.tippingRate = findTippingPoint(state.scenario);

  // ---------- Screens ----------
  function showScreen(name) {
    Object.entries(screens).forEach(([key, el]) => el.classList.toggle('active', key === name));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function populateChoiceScreen() {
    const labels = scenarioLabels(state.scenario);
    choiceIncomeLabel.innerHTML = `${labels.incomeValue}<br>${labels.incomeTime}`;
    choiceIncomeSub.textContent = labels.incomeSub;
    choiceLumpLabel.innerHTML = `${labels.lumpValue}<br>${labels.lumpTime}`;
    choiceLumpSub.textContent = labels.lumpSub;
  }

  function selectChoice(choice) {
    state.choice = choice;
    updateUrl();
    const labels = scenarioLabels(state.scenario);
    emailHeadlineEl.textContent = choice === 'income' ? `Nice, you picked ${labels.incomeHeadline}.` : `Nice, you picked ${labels.lumpHeadline}.`;
    showScreen('email');
  }

  choiceIncomeBtn.addEventListener('click', () => selectChoice('income'));
  choiceLumpBtn.addEventListener('click', () => selectChoice('lump'));
  continueToResultBtn.addEventListener('click', () => showResult());

  // ---------- Gauge ----------
  // 0° = right (3 o'clock), 90° = top, 180° = left — standard maths
  // convention, y flipped since SVG's y-axis grows downward.
  function gaugePoint(cx, cy, r, angleDeg) {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
  }

  // Maps a rate onto the gauge's sweep: 0% sits at the left (180°), maxRate
  // sits at the right (0°), running clockwise through the top like a
  // speedometer.
  function rateToAngle(rate, maxRate) {
    const pct = Math.max(0, Math.min(1, rate / maxRate));
    return 180 - pct * 180;
  }

  // Arc from startAngle down to endAngle (startAngle > endAngle, sweeping
  // clockwise through the top). Splits an exact semicircle into two
  // quarter-arcs — a single arc command can't express a 180° sweep
  // unambiguously — matching the same degenerate-case handling as the
  // salary pie's full-circle fallback on Engine Fuel.
  function describeGaugeArc(cx, cy, r, startAngle, endAngle) {
    if (startAngle - endAngle >= 179.99) {
      const mid = (startAngle + endAngle) / 2;
      const p1 = gaugePoint(cx, cy, r, startAngle);
      const pMid = gaugePoint(cx, cy, r, mid);
      const p2 = gaugePoint(cx, cy, r, endAngle);
      return `M ${p1.x} ${p1.y} A ${r} ${r} 0 0 1 ${pMid.x} ${pMid.y} A ${r} ${r} 0 0 1 ${p2.x} ${p2.y}`;
    }
    const start = gaugePoint(cx, cy, r, startAngle);
    const end = gaugePoint(cx, cy, r, endAngle);
    const largeArc = startAngle - endAngle > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  }

  // A "nice" round ceiling comfortably above both the tipping point and
  // the aggressive-growth reference tick, so the needle never pins itself
  // to the far edge of the dial.
  function gaugeMax(tippingRate) {
    const candidate = Math.ceil((tippingRate * 100 + 3) / 5) * 5;
    return Math.max(15, candidate) / 100;
  }

  function drawGauge(tippingRate) {
    const maxRate = gaugeMax(tippingRate);
    // cy sits low enough that a tick label directly above the arc's apex
    // (r + labelOffset above cy) still clears the top of the viewBox.
    const cx = 120, cy = 132, r = 94;
    gaugeSvg.innerHTML = '';

    const track = document.createElementNS(SVG_NS, 'path');
    track.setAttribute('class', 'gauge-track');
    track.setAttribute('d', describeGaugeArc(cx, cy, r, 180, 0));
    gaugeSvg.appendChild(track);

    // Reference ticks: cash & bonds, stock market average, aggressive
    // growth — colour-matched to the legend dots below (contrib/interest/
    // multiple, the same three-tone chart palette used elsewhere on the
    // site) so each dot actually points at something on the dial, rather
    // than the two living as disconnected, same-coloured decoration.
    const ticks = [
      { rate: 0.03, label: '3%', tone: 'multiple' },
      { rate: REFERENCE_RATE, label: '7%', tone: 'contrib' },
      { rate: 0.10, label: '10%', tone: 'interest' },
    ].filter((t) => t.rate <= maxRate);

    ticks.forEach(({ rate, label, tone }) => {
      const angle = rateToAngle(rate, maxRate);
      const inner = gaugePoint(cx, cy, r - 12, angle);
      const outer = gaugePoint(cx, cy, r + 12, angle);
      const tick = document.createElementNS(SVG_NS, 'line');
      tick.setAttribute('class', `gauge-tick gauge-tick-${tone}`);
      tick.setAttribute('x1', inner.x);
      tick.setAttribute('y1', inner.y);
      tick.setAttribute('x2', outer.x);
      tick.setAttribute('y2', outer.y);
      gaugeSvg.appendChild(tick);

      const labelPoint = gaugePoint(cx, cy, r + 26, angle);
      const text = document.createElementNS(SVG_NS, 'text');
      text.setAttribute('class', `gauge-tick-label gauge-tick-label-${tone}`);
      text.setAttribute('x', labelPoint.x);
      // Remembers the un-nudged position so clampTickLabels() below can
      // always re-measure from the same starting point, rather than
      // compounding an earlier nudge if it runs more than once.
      text.dataset.baseX = labelPoint.x;
      text.setAttribute('y', labelPoint.y + 3);
      text.setAttribute('text-anchor', angle > 100 ? 'end' : angle < 80 ? 'start' : 'middle');
      text.textContent = label;
      gaugeSvg.appendChild(text);
    });

    // A tick near the gauge's horizontal extremes (e.g. the 3% tick, on a
    // scenario whose maxRate stretches the dial wide) can land close
    // enough to the edge that its label text overflows the SVG's own
    // viewBox — how close depends on that scenario's maxRate, not
    // something a fixed margin could account for up front. Measure each
    // label's actual rendered width (only knowable once it's in the DOM)
    // and nudge back on-screen anything that overflows, rather than
    // guessing.
    function clampTickLabels() {
      const viewBoxWidth = 240;
      const edgeMargin = 6;
      gaugeSvg.querySelectorAll('.gauge-tick-label').forEach((label) => {
        const baseX = parseFloat(label.dataset.baseX);
        label.setAttribute('x', baseX);
        const bbox = label.getBBox();
        if (bbox.x < edgeMargin) {
          label.setAttribute('x', baseX + (edgeMargin - bbox.x));
        } else if (bbox.x + bbox.width > viewBoxWidth - edgeMargin) {
          label.setAttribute('x', baseX - (bbox.x + bbox.width - (viewBoxWidth - edgeMargin)));
        }
      });
    }
    clampTickLabels();
    // Shackleton loads asynchronously (Adobe Typekit) and can still be
    // mid-swap from its fallback serif when the immediate pass above
    // measures — the fallback and the real display face don't share
    // metrics, so a label judged safe against one can overflow once the
    // other finishes loading. Re-run once the real font is confirmed in,
    // which is what made this "sometimes" rather than every time.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(clampTickLabels);
    }

    // Needle starts pinned at 0% and animates round to the real value on
    // first paint — a little "barometer" flourish. Animated by recomputing
    // the tip's x2/y2 in SVG user-space on each frame rather than via a
    // CSS transform — a CSS `rotate()` on an SVG shape is placed using the
    // element's transform-box, which browsers resolve inconsistently
    // (padding-box/fill-box/view-box) and reliably throws the needle miles
    // off-centre; plain coordinate math has no such ambiguity.
    const needle = document.createElementNS(SVG_NS, 'line');
    needle.setAttribute('class', 'gauge-needle');
    needle.setAttribute('x1', cx);
    needle.setAttribute('y1', cy);
    const needleLength = r - 16;
    function setNeedleAngle(angle) {
      const tip = gaugePoint(cx, cy, needleLength, angle);
      needle.setAttribute('x2', tip.x);
      needle.setAttribute('y2', tip.y);
    }
    setNeedleAngle(180);
    gaugeSvg.appendChild(needle);

    const hub = document.createElementNS(SVG_NS, 'circle');
    hub.setAttribute('class', 'gauge-hub');
    hub.setAttribute('cx', cx);
    hub.setAttribute('cy', cy);
    hub.setAttribute('r', 7);
    gaugeSvg.appendChild(hub);

    const startAngle = 180;
    const finalAngle = rateToAngle(tippingRate, maxRate);
    const duration = 900;
    const ease = (t) => 1 - Math.pow(1 - t, 3); // easeOutCubic
    let startTime = null;
    function animateNeedle(now) {
      if (startTime === null) startTime = now;
      const progress = Math.min(1, (now - startTime) / duration);
      const angle = startAngle + (finalAngle - startAngle) * ease(progress);
      setNeedleAngle(angle);
      if (progress < 1) requestAnimationFrame(animateNeedle);
    }
    requestAnimationFrame(animateNeedle);
  }

  // ---------- Result screen ----------
  // Draws the slider's black "filled" portion up to the thumb — pulled out
  // to module scope (rather than nested inside bindAssumedRate(), where it
  // started) so showResult() can also call it directly after resetting the
  // slider's max/value for a new scenario. Without that second call site,
  // --fill was left stuck at whatever it was calculated for the *previous*
  // scenario's range until the user actually dragged the thumb — which is
  // exactly the "line doesn't match the dot" glitch on first paint.
  function updateSliderFill(rangeEl) {
    const min = parseFloat(rangeEl.min);
    const max = parseFloat(rangeEl.max);
    const val = parseFloat(rangeEl.value);
    const pct = max > min ? ((val - min) / (max - min)) * 100 : 0;
    rangeEl.style.setProperty('--fill', pct + '%');
  }

  function bindAssumedRate() {
    function apply(val) {
      assumedRateInput.value = val;
      assumedRateRange.value = val;
      updateSliderFill(assumedRateRange);
      updateComparisonTable();
      updateUrl();
    }
    assumedRateInput.addEventListener('input', () => apply(parseNumber(assumedRateInput.value)));
    assumedRateRange.addEventListener('input', () => apply(parseFloat(assumedRateRange.value)));
    updateSliderFill(assumedRateRange);
  }

  // Two bars, side by side — the winner in the "important number" accent,
  // the other neutral, same colour language as the .game-winner/.game-
  // loser table cells above. Redrawn from scratch on every slider move,
  // same as the ledger-table figures; the values move in visible jumps as
  // you drag anyway, so there's nothing a transition would smooth over.
  function drawBarChart(fvIncome, fvLump, incomeWins) {
    barChartSvg.innerHTML = '';
    const baseline = 148;
    const maxBarHeight = 108;
    const barWidth = 74;
    const incomeX = 46;
    const lumpX = 180;
    const maxVal = Math.max(fvIncome, fvLump, 1);

    function addRect(x, height, cls) {
      const rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('x', x);
      rect.setAttribute('y', baseline - height);
      rect.setAttribute('width', barWidth);
      rect.setAttribute('height', Math.max(height, 0));
      rect.setAttribute('class', cls);
      barChartSvg.appendChild(rect);
    }

    function addText(x, y, text, cls) {
      const el = document.createElementNS(SVG_NS, 'text');
      el.setAttribute('x', x);
      el.setAttribute('y', y);
      el.setAttribute('text-anchor', 'middle');
      el.setAttribute('class', cls);
      el.textContent = text;
      barChartSvg.appendChild(el);
    }

    const incomeH = (fvIncome / maxVal) * maxBarHeight;
    const lumpH = (fvLump / maxVal) * maxBarHeight;

    addRect(incomeX, incomeH, `bar-rect ${incomeWins ? 'bar-rect-winner' : 'bar-rect-loser'}`);
    addRect(lumpX, lumpH, `bar-rect ${incomeWins ? 'bar-rect-loser' : 'bar-rect-winner'}`);

    const baseLine = document.createElementNS(SVG_NS, 'line');
    baseLine.setAttribute('x1', 20);
    baseLine.setAttribute('x2', 280);
    baseLine.setAttribute('y1', baseline);
    baseLine.setAttribute('y2', baseline);
    baseLine.setAttribute('class', 'bar-baseline');
    barChartSvg.appendChild(baseLine);

    addText(incomeX + barWidth / 2, baseline - incomeH - 10, fmtCurrency(fvIncome), `bar-value-label ${incomeWins ? 'bar-value-label-winner' : ''}`);
    addText(lumpX + barWidth / 2, baseline - lumpH - 10, fmtCurrency(fvLump), `bar-value-label ${incomeWins ? '' : 'bar-value-label-winner'}`);
    addText(incomeX + barWidth / 2, baseline + 22, 'Monthly income', 'bar-cat-label');
    addText(lumpX + barWidth / 2, baseline + 22, 'Lump sum', 'bar-cat-label');
  }

  // ---------- Balance-over-time chart (canvas) ----------
  // Same "computed geometry, CSS/theme-var colour" approach as the other
  // calculators' growth charts (e.g. Freedom Runway), simplified to two
  // independent lines rather than a stacked breakdown — there's no single
  // "total" here, just two competing balances to compare year by year.
  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function hexToRgba(color, alpha) {
    if (color.startsWith('#')) {
      let c = color.substring(1);
      if (c.length === 3) c = c.split('').map((ch) => ch + ch).join('');
      const num = parseInt(c, 16);
      const r = (num >> 16) & 255;
      const g = (num >> 8) & 255;
      const b = num & 255;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    // Already an rgba()/other CSS colour (e.g. --track) — used as-is,
    // same fallback Freedom Runway's chart takes for the same reason.
    return color;
  }

  function compactCurrency(v) {
    const sign = v < 0 ? '-' : '';
    const av = Math.abs(v);
    if (av >= 1_000_000) return sign + '£' + (av / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (av >= 1_000) return sign + '£' + (av / 1_000).toFixed(0) + 'K';
    return sign + '£' + Math.round(av);
  }

  const BALANCE_CHART_HEIGHT = 220;
  function setupBalanceCanvasSize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = balanceChartCanvas.getBoundingClientRect();
    balanceChartCanvas.style.height = BALANCE_CHART_HEIGHT + 'px';
    balanceChartCanvas.width = rect.width * dpr;
    balanceChartCanvas.height = BALANCE_CHART_HEIGHT * dpr;
    balanceChartCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { width: rect.width, height: BALANCE_CHART_HEIGHT };
  }

  let lastBalanceChartParams = null;

  function drawBalanceChart(rate, incomeWins) {
    lastBalanceChartParams = { rate, incomeWins };
    const scenario = state.scenario;
    const { width, height } = setupBalanceCanvasSize();
    balanceChartCtx.clearRect(0, 0, width, height);

    const points = [];
    for (let y = 0; y <= scenario.years; y++) {
      points.push({
        year: y,
        income: annuityFutureValue(scenario.monthlyAmount, y, rate),
        lump: lumpSumFutureValue(scenario.lumpSum, y, scenario.lumpSumDelayYears, rate),
      });
    }

    const padding = { top: 16, right: 16, bottom: 28, left: 64 };
    const plotW = width - padding.left - padding.right;
    const plotH = height - padding.top - padding.bottom;
    const maxYear = scenario.years || 1;
    const maxVal = Math.max(1, ...points.flatMap((p) => [p.income, p.lump]));

    const xForYear = (y) => padding.left + (y / maxYear) * plotW;
    const yForVal = (v) => padding.top + plotH - (v / maxVal) * plotH;

    // Same "winner = terracotta, loser = neutral" colours as the bar
    // chart just above, so the two visuals read as one continuous idea
    // rather than introducing a second colour scheme.
    const winnerColor = cssVar('--badge-free-bg');
    const loserColor = cssVar('--track');
    const textSecondary = cssVar('--text-secondary');
    const gridColor = cssVar('--card-border');
    const incomeColor = incomeWins ? winnerColor : loserColor;
    const lumpColor = incomeWins ? loserColor : winnerColor;
    balanceLegendIncomeDot.style.background = incomeColor;
    balanceLegendLumpDot.style.background = lumpColor;

    balanceChartCtx.font = '11px -apple-system, sans-serif';
    balanceChartCtx.fillStyle = textSecondary;
    balanceChartCtx.strokeStyle = gridColor;
    balanceChartCtx.lineWidth = 1;
    const ySteps = 4;
    for (let i = 0; i <= ySteps; i++) {
      const val = (maxVal / ySteps) * i;
      const yy = yForVal(val);
      balanceChartCtx.beginPath();
      balanceChartCtx.moveTo(padding.left, yy);
      balanceChartCtx.lineTo(width - padding.right, yy);
      balanceChartCtx.stroke();
      balanceChartCtx.textAlign = 'right';
      balanceChartCtx.textBaseline = 'middle';
      balanceChartCtx.fillText(compactCurrency(val), padding.left - 10, yy);
    }

    balanceChartCtx.textAlign = 'center';
    balanceChartCtx.textBaseline = 'top';
    const maxLabels = width < 400 ? 6 : 10;
    const xLabelStep = Math.max(1, Math.ceil(maxYear / Math.max(1, maxLabels - 1)));
    for (let y = 0; y <= maxYear; y += xLabelStep) {
      balanceChartCtx.fillText('Yr ' + y, xForYear(y), height - padding.bottom + 8);
    }

    function drawArea(getVal, color) {
      balanceChartCtx.beginPath();
      points.forEach((p, i) => {
        const x = xForYear(p.year);
        const y = yForVal(Math.max(0, getVal(p)));
        if (i === 0) balanceChartCtx.moveTo(x, y);
        else balanceChartCtx.lineTo(x, y);
      });
      balanceChartCtx.lineTo(xForYear(points[points.length - 1].year), yForVal(0));
      balanceChartCtx.lineTo(xForYear(points[0].year), yForVal(0));
      balanceChartCtx.closePath();
      balanceChartCtx.fillStyle = hexToRgba(color, 0.18);
      balanceChartCtx.fill();
    }

    function drawLine(getVal, color) {
      balanceChartCtx.beginPath();
      points.forEach((p, i) => {
        const x = xForYear(p.year);
        const y = yForVal(Math.max(0, getVal(p)));
        if (i === 0) balanceChartCtx.moveTo(x, y);
        else balanceChartCtx.lineTo(x, y);
      });
      balanceChartCtx.strokeStyle = color;
      balanceChartCtx.lineWidth = 2.25;
      balanceChartCtx.stroke();
    }

    // Loser drawn first, winner drawn on top — keeps the terracotta line
    // fully visible at any point the two balances happen to cross.
    if (incomeWins) {
      drawArea((p) => p.lump, lumpColor);
      drawLine((p) => p.lump, lumpColor);
      drawArea((p) => p.income, incomeColor);
      drawLine((p) => p.income, incomeColor);
    } else {
      drawArea((p) => p.income, incomeColor);
      drawLine((p) => p.income, incomeColor);
      drawArea((p) => p.lump, lumpColor);
      drawLine((p) => p.lump, lumpColor);
    }
  }

  window.addEventListener('resize', () => {
    if (lastBalanceChartParams) {
      drawBalanceChart(lastBalanceChartParams.rate, lastBalanceChartParams.incomeWins);
    }
  });

  function updateComparisonTable() {
    const rate = parseNumber(assumedRateInput.value) / 100;
    const scenario = state.scenario;
    const fvIncome = annuityFutureValue(scenario.monthlyAmount, scenario.years, rate);
    const fvLump = lumpSumFutureValue(scenario.lumpSum, scenario.years, scenario.lumpSumDelayYears, rate);

    fvIncomeEl.textContent = fmtCurrency(fvIncome);
    fvLumpEl.textContent = fmtCurrency(fvLump);

    const incomeWins = fvIncome >= fvLump;
    winnerIncomeEl.textContent = incomeWins ? 'Winner' : '';
    winnerLumpEl.textContent = incomeWins ? '' : 'Winner';
    winnerIncomeEl.className = incomeWins ? 'game-winner' : 'game-loser';
    winnerLumpEl.className = incomeWins ? 'game-loser' : 'game-winner';

    drawBarChart(fvIncome, fvLump, incomeWins);
    drawBalanceChart(rate, incomeWins);
    const winnerLabel = incomeWins ? 'Monthly income' : 'Lump sum';
    const diff = Math.abs(fvIncome - fvLump);
    const smaller = Math.min(fvIncome, fvLump) || 1;
    const diffPct = (diff / smaller) * 100;
    barChartDiffEl.innerHTML = `<strong>${winnerLabel}</strong> comes out <strong>${fmtCurrency(diff)}</strong> ahead, with ${diffPct.toFixed(0)}% more.`;
  }

  function showResult() {
    const scenario = state.scenario;
    const labels = scenarioLabels(scenario);
    const tipping = state.tippingRate;

    rowIncomeLabel.textContent = labels.incomeHeadline;
    rowLumpLabel.textContent = labels.lumpHeadline;

    const chosenNumber = state.choice === 'income' ? labels.incomeNumber : labels.lumpNumber;
    const chosenRest = state.choice === 'income' ? labels.incomeRest : labels.lumpRest;
    resultHeadlineEl.innerHTML = `You picked ${chosenNumber}<br>${chosenRest}.`;

    if (tipping === null) {
      resultSubEl.textContent = `Here's the average annual return where either choice is worth exactly the same after ${scenario.years} years.`;
      gaugeValueEl.textContent = '—';
      resultRuleEl.textContent = "These two numbers don't actually cross within a realistic range of returns — one choice comes out ahead at every plausible rate.";
      tippingFvBlockEl.style.display = 'none';
    } else {
      gaugeValueEl.textContent = fmtRate(tipping);
      drawGauge(tipping);

      resultRuleEl.innerHTML = `At the tipping point, <strong>${fmtRate(tipping)}</strong> a year, both choices are worth exactly the same after ${scenario.years} years. Below that rate, <strong>${labels.incomeHeadline}</strong> comes out ahead. Above it, <strong>${labels.lumpHeadline}</strong> wins instead because compounding on the full lump sum eventually overtakes the monthly payments.`;

      // The personalised payoff line — leads with this under the headline
      // rather than a generic "here's the tipping point" sentence, since
      // it's the actual punchline of the game.
      const winsAtReference = REFERENCE_RATE < tipping ? 'income' : 'lump';
      const otherLabel = state.choice === 'income' ? labels.lumpHeadline : labels.incomeHeadline;
      resultSubEl.innerHTML =
        state.choice === winsAtReference
          ? `At the long-run stock market average of around ${fmtRate(REFERENCE_RATE)}, <strong>the numbers back you up</strong>.`
          : `At the long-run stock market average of around ${fmtRate(REFERENCE_RATE)}, the numbers favour <strong>${otherLabel}</strong> instead.`;

      // The exact pound figure behind the headline gauge value — at the
      // tipping point rate, both choices land on the same future value
      // after `years` years, by definition, so it's shown once rather
      // than as a two-row "look, they match" table. Averaging the two
      // sides cancels out the tiny numerical residual bisection leaves
      // behind, rather than arbitrarily picking one side over the other.
      tippingFvBlockEl.style.display = '';
      tippingFvLabelEl.textContent = `What either choice is worth after ${scenario.years} years`;
      const fvIncomeAtTipping = annuityFutureValue(scenario.monthlyAmount, scenario.years, tipping);
      const fvLumpAtTipping = lumpSumFutureValue(scenario.lumpSum, scenario.years, scenario.lumpSumDelayYears, tipping);
      tippingFvValueEl.textContent = fmtCurrency((fvIncomeAtTipping + fvLumpAtTipping) / 2);
    }

    // Seed the "try your own assumption" slider from any rate carried in
    // the URL, otherwise default to the long-run market reference.
    const startRate = initial.assumedRate !== null ? initial.assumedRate : Math.round(REFERENCE_RATE * 1000) / 10;
    assumedRateRange.max = Math.max(20, Math.ceil((tipping || 0) * 100 / 5) * 5 + 5);
    assumedRateInput.value = startRate;
    assumedRateRange.value = startRate;
    updateSliderFill(assumedRateRange);
    updateUrl();

    // Show the screen before drawing the balance chart, not after — its
    // canvas is sized from getBoundingClientRect(), which reads 0 while
    // the result screen (and everything inside it) is still display:none.
    showScreen('result');
    updateComparisonTable();
  }

  // ---------- Share / play again ----------
  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return Promise.reject(new Error('Clipboard API unavailable'));
  }

  let statusTimer = null;
  function setStatus(msg, duration = 3000) {
    shareStatus.textContent = msg;
    clearTimeout(statusTimer);
    if (duration) statusTimer = setTimeout(() => { shareStatus.textContent = ''; }, duration);
  }

  copyLinkBtn.addEventListener('click', () => {
    const url = shareUrl();
    copyToClipboard(url)
      .then(() => setStatus('Link copied to your clipboard'))
      .catch(() => window.prompt('Copy this link:', url));
  });

  shareLinkBtn.addEventListener('click', () => {
    const url = shareUrl();
    if (navigator.share) {
      navigator.share({ title: document.title, url }).catch((err) => {
        if (err && err.name !== 'AbortError') setStatus('Could not open the share sheet');
      });
    } else {
      copyToClipboard(url)
        .then(() => setStatus('Sharing isn’t supported here — link copied instead'))
        .catch(() => window.prompt('Copy this link to share:', url));
    }
  });

  playAgainBtn.addEventListener('click', () => {
    state.scenarioIndex = Math.floor(Math.random() * SCENARIOS.length);
    state.scenario = SCENARIOS[state.scenarioIndex];
    state.choice = null;
    state.tippingRate = findTippingPoint(state.scenario);
    populateChoiceScreen();
    history.replaceState(null, '', location.pathname);
    showScreen('choice');
  });

  // ---------- Startup ----------
  populateChoiceScreen();
  bindAssumedRate();

  if (initial.choice) {
    // Arriving via a shared/bookmarked link — jump straight to the
    // result, no need to re-run the choice or email screens.
    state.choice = initial.choice;
    showResult();
  }
})();
