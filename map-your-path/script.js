(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);

  // ---------- Elements ----------
  const screens = { intake: $('screenIntake'), loading: $('screenLoading'), results: $('screenResults') };

  const incomeInput = $('income');
  const incomeRange = $('incomeRange');
  const currentAgeInput = $('currentAge');
  const currentAgeRange = $('currentAgeRange');
  const targetAgeInput = $('targetAge');
  const targetAgeRange = $('targetAgeRange');
  const assetsInput = $('assets');
  const assetsRange = $('assetsRange');
  const returnRateInput = $('returnRate');
  const returnRateRange = $('returnRateRange');
  const inflationInput = $('inflation');
  const inflationRange = $('inflationRange');
  const leveragedInput = $('leveraged');
  const leveragedRange = $('leveragedRange');
  const withdrawalRateInput = $('withdrawalRate');
  const withdrawalRateRange = $('withdrawalRateRange');

  const currencyButtons = document.querySelectorAll('.currency-segmented .seg-btn');
  const incomeSymbol = $('incomeSymbol');
  const assetsSymbol = $('assetsSymbol');
  const leveragedSymbol = $('leveragedSymbol');

  const mapPathBtn = $('mapPathBtn');
  const startOverBtn = $('startOverBtn');
  const loadingMessageEl = $('loadingMessage');
  const loadingBarFill = $('loadingBarFill');

  const resultsSubEl = $('resultsSub');
  const potRequiredValueEl = $('potRequiredValue');
  const reqIncomeAnnual = $('reqIncomeAnnual');
  const reqIncomeMonthly = $('reqIncomeMonthly');
  const reqPassiveAnnual = $('reqPassiveAnnual');
  const reqPassiveMonthly = $('reqPassiveMonthly');
  const potRequiredEl = $('potRequired');
  const currentAssetsValueEl = $('currentAssetsValue');
  const assetsReturnEl = $('assetsReturn');
  const totalSavedEl = $('totalSaved');
  const savingsReturnEl = $('savingsReturn');
  const savingsNeededEl = $('savingsNeeded');
  const leveragedIdeaSaveEl = $('leveragedIdeaSave');
  const leveragedIdeaSoonerEl = $('leveragedIdeaSooner');
  const chartTargetEl = $('chartTarget');

  const themeToggle = $('themeToggle');
  const copyLinkBtn = $('copyLinkBtn');
  const shareLinkBtn = $('shareLinkBtn');
  const downloadReportBtn = $('downloadReportBtn');
  const downloadImageBtn = $('downloadImageBtn');
  const shareImagePreview = $('shareImagePreview');
  const shareStatus = $('shareStatus');

  const printReturnRateEl = $('printReturnRate');
  const printInflationEl = $('printInflation');
  const printLeveragedEl = $('printLeveraged');
  const printWithdrawalRateEl = $('printWithdrawalRate');

  const canvas = $('chart');
  const ctx = canvas.getContext('2d');
  const tooltip = $('tooltip');

  const CURRENCY_SYMBOLS = { USD: '$', GBP: '£', EUR: '€' };
  let currentCurrency = 'GBP';
  // Snapshot of the last render's figures, read by the share-image card
  // builder — see the end of render() for what it holds.
  let lastResult = null;

  // ---------- Formatting helpers ----------
  const fmtNumber = (n) => new Intl.NumberFormat('en-GB').format(Math.round(n));
  const fmtCurrency = (n) => CURRENCY_SYMBOLS[currentCurrency] + fmtNumber(n);

  function parseNumber(str) {
    const cleaned = String(str).replace(/[^0-9.\-]/g, '');
    const val = parseFloat(cleaned);
    return isNaN(val) ? 0 : val;
  }

  // ---------- Slider binding ----------
  function updateSliderFill(rangeEl) {
    const min = parseFloat(rangeEl.min);
    const max = parseFloat(rangeEl.max);
    const val = parseFloat(rangeEl.value);
    const pct = max > min ? ((val - min) / (max - min)) * 100 : 0;
    rangeEl.style.setProperty('--fill', pct + '%');
  }

  function bindTextAndRange(textEl, rangeEl, { isCurrency = false, onChange } = {}) {
    function syncFromText() {
      let val = parseNumber(textEl.value);
      if (val < parseFloat(rangeEl.min)) val = parseFloat(rangeEl.min);
      if (val > parseFloat(rangeEl.max)) val = parseFloat(rangeEl.max);
      rangeEl.value = val;
      updateSliderFill(rangeEl);
      if (onChange) onChange();
    }
    textEl.addEventListener('input', syncFromText);
    textEl.addEventListener('blur', () => {
      const val = parseNumber(textEl.value);
      textEl.value = isCurrency ? fmtNumber(val) : val;
    });
    rangeEl.addEventListener('input', () => {
      let val = parseFloat(rangeEl.value);
      const max = parseFloat(rangeEl.max);
      const step = parseFloat(rangeEl.step) || 1;
      if (max - val < step && val !== max) {
        val = max;
        rangeEl.value = val;
      }
      textEl.value = isCurrency ? fmtNumber(val) : val;
      updateSliderFill(rangeEl);
      if (onChange) onChange();
    });
    updateSliderFill(rangeEl);
  }

  bindTextAndRange(incomeInput, incomeRange, { isCurrency: true });
  bindTextAndRange(assetsInput, assetsRange, { isCurrency: true });
  bindTextAndRange(currentAgeInput, currentAgeRange, {});
  bindTextAndRange(targetAgeInput, targetAgeRange, {});
  bindTextAndRange(returnRateInput, returnRateRange, { onChange: render });
  bindTextAndRange(inflationInput, inflationRange, { onChange: render });
  bindTextAndRange(leveragedInput, leveragedRange, { isCurrency: true, onChange: render });
  bindTextAndRange(withdrawalRateInput, withdrawalRateRange, { onChange: render });

  currencyButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      currentCurrency = btn.dataset.currency;
      currencyButtons.forEach((b) => b.classList.toggle('active', b === btn));
      const symbol = CURRENCY_SYMBOLS[currentCurrency];
      incomeSymbol.textContent = symbol;
      assetsSymbol.textContent = symbol;
      leveragedSymbol.textContent = symbol;
      render();
    });
  });

  // ---------- Screens ----------
  function showScreen(name) {
    Object.entries(screens).forEach(([key, el]) => el.classList.toggle('active', key === name));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ---------- Math ----------
  // Same formulas as How Much Is Enough — the monthly contribution
  // (paid at the end of each month) required for a lump sum plus a
  // savings annuity to reach `target` after `months` months of
  // compounding at `monthlyRate`. Returns 0 once the lump sum alone is
  // already projected to clear the target, and null when there's no
  // time left for a savings plan to act (months <= 0).
  function requiredMonthlySavings(target, currentAssets, monthlyRate, months) {
    if (months <= 0) return null;
    const growthFactor = Math.pow(1 + monthlyRate, months);
    const futureAssets = currentAssets * growthFactor;
    const shortfall = target - futureAssets;
    if (shortfall <= 0) return 0;
    if (monthlyRate === 0) return shortfall / months;
    const annuityFactor = (growthFactor - 1) / monthlyRate;
    return shortfall / annuityFactor;
  }

  // The inverse question: holding a fixed monthly contribution, how many
  // months does it take a lump sum + savings annuity to reach `target`?
  // Closed-form (no need to search for it) — derived by substituting
  // g = (1+r)^n into the future-value equation and solving for g, then n.
  function monthsToReachTarget(target, currentAssets, monthlyContribution, monthlyRate) {
    if (currentAssets >= target) return 0;
    if (monthlyRate === 0) {
      if (monthlyContribution <= 0) return Infinity;
      return Math.max(0, (target - currentAssets) / monthlyContribution);
    }
    const k = monthlyContribution / monthlyRate;
    const denom = currentAssets + k;
    if (denom <= 0) return Infinity;
    const g = (target + k) / denom;
    if (g <= 0) return Infinity;
    return Math.max(0, Math.log(g) / Math.log(1 + monthlyRate));
  }

  function calculateSavingsSeries(principal, monthlyContribution, monthlyRate, months) {
    let balance = principal;
    let contributed = principal;
    const yearly = [];
    for (let m = 1; m <= months; m++) {
      balance = balance * (1 + monthlyRate) + monthlyContribution;
      contributed += monthlyContribution;
      if (m % 12 === 0) {
        yearly.push({ year: m / 12, contributed, balance, interest: balance - contributed });
      }
    }
    return yearly;
  }

  // ---------- Render ----------
  function render() {
    const desiredIncome = parseNumber(incomeInput.value);
    const currentAge = Math.max(0, Math.round(parseNumber(currentAgeInput.value)));
    const targetAge = Math.max(0, Math.round(parseNumber(targetAgeInput.value)));
    const years = Math.max(0, targetAge - currentAge);
    const assets = parseNumber(assetsInput.value);
    const annualReturn = parseNumber(returnRateInput.value) / 100;
    const inflation = parseNumber(inflationInput.value) / 100;
    const leveraged = parseNumber(leveragedInput.value);
    const withdrawalRate = parseNumber(withdrawalRateInput.value) / 100;

    resultsSubEl.textContent = years > 0
      ? `Based on ${years} years from now, here's the pot you need and what could get you there sooner.`
      : `Your target age is at or before your current age, so there's no time left to invest — showing what you'd need right now instead.`;

    const futureMonthlyIncome = desiredIncome * Math.pow(1 + inflation, years);
    const futureAnnualIncome = futureMonthlyIncome * 12;
    reqIncomeAnnual.textContent = fmtCurrency(futureAnnualIncome);
    reqIncomeMonthly.textContent = fmtCurrency(futureMonthlyIncome);

    const passiveMonthly = Math.max(0, futureMonthlyIncome - leveraged);
    const passiveAnnual = passiveMonthly * 12;
    reqPassiveAnnual.textContent = fmtCurrency(passiveAnnual);
    reqPassiveMonthly.textContent = fmtCurrency(passiveMonthly);

    const monthlyRate = annualReturn === 0 ? 0 : Math.pow(1 + annualReturn, 1 / 12) - 1;
    const months = years * 12;
    const futureAssets = assets * Math.pow(1 + monthlyRate, months);

    const potRequired = withdrawalRate > 0 ? passiveAnnual / withdrawalRate : Infinity;
    potRequiredValueEl.textContent = fmtCurrency(potRequired);
    potRequiredEl.textContent = fmtCurrency(potRequired);

    const pmt = requiredMonthlySavings(potRequired, assets, monthlyRate, months);
    let pmtForChart = 0;
    if (pmt === null) {
      savingsNeededEl.innerHTML = potRequired <= assets
        ? 'On track'
        : `<span>${fmtCurrency(potRequired - futureAssets)}<span class="headline-value-caption">needed now</span></span>`;
    } else if (pmt <= 0) {
      savingsNeededEl.textContent = 'On track';
    } else {
      savingsNeededEl.textContent = fmtCurrency(pmt);
      pmtForChart = pmt;
    }

    // "Your pot" ledger — split each of the two building blocks (what
    // your current assets grow into, and what your future savings grow
    // into) into principal and the investment return on top of it.
    // neededFromSavings is exactly the old "Still to be saved" figure;
    // savingsContributed is the nominal sum of monthly contributions
    // (no growth), so the remainder is what compounding added on top.
    // In the "needed right now" case (pmt === null, no time left for a
    // savings plan) the whole shortfall is a lump sum with no time to
    // grow, so it's attributed entirely to "still to be saved" rather
    // than split — savingsReturn correctly comes out as 0 there.
    const neededFromSavings = Math.max(0, potRequired - futureAssets);
    const savingsContributed = pmt === null ? neededFromSavings : pmtForChart * months;
    currentAssetsValueEl.textContent = fmtCurrency(assets);
    assetsReturnEl.textContent = fmtCurrency(futureAssets - assets);
    totalSavedEl.textContent = fmtCurrency(savingsContributed);
    savingsReturnEl.textContent = fmtCurrency(neededFromSavings - savingsContributed);

    let savingsSentence;
    if (pmt === null) {
      savingsSentence = potRequired <= futureAssets
        ? `You are already on track to reach this, <strong>no further saving required</strong>`
        : `You need <strong>${fmtCurrency(potRequired - futureAssets)}</strong> right now to reach this`;
    } else if (pmt <= 0) {
      savingsSentence = `You are already on track to reach this, <strong>no further saving required</strong>`;
    } else {
      savingsSentence = `You need to save <strong>${fmtCurrency(pmt)}</strong> each month to reach this`;
    }
    let sentence;
    if (leveraged > 0) {
      sentence = `Using the ${fmtNumber(withdrawalRate * 100)}% rule, <strong>${fmtCurrency(potRequired)}</strong> is enough to provide <strong>${fmtCurrency(passiveMonthly)}</strong> a month in passive income.`;
      sentence += ` ${savingsSentence}.`;
      sentence += ` Combined with your expected <strong>${fmtCurrency(leveraged)}</strong> a month leveraged income, that provides your <strong>${fmtCurrency(futureMonthlyIncome)}</strong> desired monthly income.`;
    } else {
      sentence = `Using the ${fmtNumber(withdrawalRate * 100)}% rule, <strong>${fmtCurrency(potRequired)}</strong> is enough to provide your <strong>${fmtCurrency(passiveMonthly)}</strong> desired monthly income.`;
      sentence += ` ${savingsSentence}.`;
    }
    chartTargetEl.innerHTML = sentence;

    // ---------- Leveraged income ideas ----------
    // Two ways leveraged income shortens the path: (a) hold the target
    // date fixed and save less each month, or (b) keep saving what the
    // no-leverage plan already required and get there sooner instead.
    const baseAnnualIncome = futureAnnualIncome; // no leveraged income offset
    const baseTarget = withdrawalRate > 0 ? baseAnnualIncome / withdrawalRate : Infinity;
    const basePmt = requiredMonthlySavings(baseTarget, assets, monthlyRate, months);
    const baseMonthlyForCompare = basePmt === null || basePmt <= 0 ? 0 : basePmt;

    // Hoisted out of the branches below (block-scoped there) — the
    // share-image card needs whichever of these actually got computed,
    // whatever combination of leveraged/on-track applies this render.
    let monthlySavedForCard = 0;
    let yearsSoonerForCard = null;

    if (leveraged <= 0) {
      leveragedIdeaSaveEl.innerHTML = `Right now you&rsquo;re assuming <strong>${fmtCurrency(0)}</strong> in leveraged income. Drag the slider above to see how a side business could shorten your path.`;
      leveragedIdeaSoonerEl.textContent = '';
    } else if (baseMonthlyForCompare <= 0) {
      leveragedIdeaSaveEl.innerHTML = `You&rsquo;re already on track without any leveraged income, so <strong>${fmtCurrency(leveraged)}</strong> a month of leveraged income isn&rsquo;t doing any work here yet — try a bigger target income or a shorter timeframe to see its effect.`;
      leveragedIdeaSoonerEl.textContent = '';
    } else {
      const reducedPmt = pmt === null || pmt <= 0 ? 0 : pmt;
      const monthlySaved = Math.max(0, baseMonthlyForCompare - reducedPmt);
      monthlySavedForCard = monthlySaved;
      leveragedIdeaSaveEl.innerHTML = monthlySaved > 0
        ? `If you generate <strong>${fmtCurrency(leveraged)}</strong> a month in leveraged income, you&rsquo;ll only need to save <strong>${fmtCurrency(reducedPmt)}</strong> a month instead of <strong>${fmtCurrency(baseMonthlyForCompare)}</strong>. That&rsquo;s <strong>${fmtCurrency(monthlySaved)}</strong> less, every month.`
        : `Even without any leveraged income you&rsquo;re already saving enough to reach a smaller pot &mdash; leveraged income here mainly helps you get there sooner instead. See below.`;

      const monthsWithLeverageAtBasePmt = monthsToReachTarget(potRequired, assets, baseMonthlyForCompare, monthlyRate);
      const monthsSooner = Number.isFinite(monthsWithLeverageAtBasePmt) ? Math.max(0, months - monthsWithLeverageAtBasePmt) : 0;
      if (monthsSooner >= 1) {
        const yearsSooner = monthsSooner / 12;
        yearsSoonerForCard = yearsSooner;
        const soonerText = yearsSooner >= 1
          ? `${yearsSooner.toFixed(1).replace(/\.0$/, '')} years`
          : `${Math.round(monthsSooner)} months`;
        leveragedIdeaSoonerEl.innerHTML = `Or, keep saving <strong>${fmtCurrency(baseMonthlyForCompare)}</strong> a month as originally planned, and that same <strong>${fmtCurrency(leveraged)}</strong> a month in leveraged income gets you there roughly <strong>${soonerText} sooner</strong>.`;
      } else {
        leveragedIdeaSoonerEl.textContent = '';
      }
    }

    const series = calculateSavingsSeries(assets, pmtForChart, monthlyRate, months);
    drawChart(series, assets, potRequired);

    // The printed report replaces the interactive assumption sliders
    // with this plain-text summary (see .no-print/.print-only in the
    // print stylesheet) — kept in sync here rather than duplicating the
    // parsing logic at print time.
    const fmtPercent = (n) => (n * 100).toFixed(1).replace(/\.0$/, '') + '%';
    printReturnRateEl.textContent = fmtPercent(annualReturn);
    printInflationEl.textContent = fmtPercent(inflation);
    printLeveragedEl.textContent = fmtCurrency(leveraged);
    printWithdrawalRateEl.textContent = fmtPercent(withdrawalRate);

    // Snapshot of the figures behind this render — the share-image button
    // reads from here rather than recomputing, so the image always
    // matches exactly what's on screen even if a slider moves before the
    // image actually gets generated.
    lastResult = {
      currency: currentCurrency,
      years, currentAge, targetAge,
      assets, futureAssets,
      potRequired,
      pmt: pmt === null ? (potRequired <= assets ? 0 : potRequired - futureAssets) : pmt,
      onTrack: pmt === null ? potRequired <= futureAssets : pmt <= 0,
      pmtIsNow: pmt === null,
      desiredIncome, futureMonthlyIncome, passiveMonthly, leveraged,
      annualReturn, inflation, withdrawalRate,
      monthlySaved: monthlySavedForCard,
      yearsSooner: yearsSoonerForCard,
      // The no-leverage monthly saving figure — the card's copy needs
      // this alongside monthlySaved to spell out the actual alternative
      // ("save £X instead"), not just the size of the reduction.
      baseMonthlyForCompare,
      // The nominal (no-growth) contributions behind "still to be saved"
      // — the card's "Your pot" ledger splits that figure into
      // contributions vs. the investment return on top of them, same as
      // the on-page ledger.
      savingsContributed,
      // Raw chart series + principal — the share-image card redraws the
      // actual growth chart rather than a simplified stand-in, so it
      // needs the same data drawChart() uses, not just its outputs.
      series, principal: assets,
    };
    shareImagePreview.removeAttribute('src');

    scheduleUrlUpdate();
  }

  // ---------- Chart (canvas, no dependencies) ----------
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
    return color;
  }

  function compactCurrency(v) {
    const symbol = CURRENCY_SYMBOLS[currentCurrency];
    if (v >= 1_000_000) return symbol + (v / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (v >= 1_000) return symbol + (v / 1_000).toFixed(0) + 'K';
    return symbol + Math.round(v);
  }

  const CHART_HEIGHT = 260;

  function setupCanvasSize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.style.height = CHART_HEIGHT + 'px';
    canvas.width = rect.width * dpr;
    canvas.height = CHART_HEIGHT * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { width: rect.width, height: CHART_HEIGHT };
  }

  let lastChartGeometry = null;
  let lastChartParams = null;

  function drawChart(yearly, principal, potRequired) {
    lastChartParams = { yearly, principal, potRequired };

    const { width, height } = setupCanvasSize();
    ctx.clearRect(0, 0, width, height);

    const points = [{ year: 0, contributed: principal, interest: 0, balance: principal }, ...yearly];
    if (points.length < 2 || !Number.isFinite(potRequired)) {
      lastChartGeometry = null;
      return;
    }

    const padding = { top: 16, right: 24, bottom: 28, left: 64 };
    const plotW = width - padding.left - padding.right;
    const plotH = height - padding.top - padding.bottom;

    const maxBalance = Math.max(potRequired, ...points.map((p) => p.balance)) * 1.05;
    const maxYear = points[points.length - 1].year || 1;

    const xForYear = (y) => padding.left + (y / maxYear) * plotW;
    const yForVal = (v) => padding.top + plotH - (v / maxBalance) * plotH;

    const contribColor = cssVar('--contrib');
    const interestColor = cssVar('--interest');
    const targetColor = cssVar('--multiple');
    const textSecondary = cssVar('--text-secondary');
    const gridColor = cssVar('--card-border');

    ctx.font = '11px -apple-system, sans-serif';
    ctx.fillStyle = textSecondary;
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    const ySteps = 4;
    for (let i = 0; i <= ySteps; i++) {
      const val = (maxBalance / ySteps) * i;
      const yy = yForVal(val);
      ctx.beginPath();
      ctx.moveTo(padding.left, yy);
      ctx.lineTo(width - padding.right, yy);
      ctx.stroke();
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(compactCurrency(val), padding.left - 10, yy);
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const maxLabels = width < 500 ? 10 : 15;
    const xLabelStep = Math.max(1, Math.ceil(maxYear / Math.max(1, maxLabels - 1)));
    for (let y = 0; y <= maxYear; y += xLabelStep) {
      ctx.fillText('Yr ' + y, xForYear(y), height - padding.bottom + 8);
    }

    function drawArea(getTop, getBottom, color) {
      ctx.beginPath();
      points.forEach((p, i) => {
        const x = xForYear(p.year);
        const y = yForVal(getTop(p));
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      for (let i = points.length - 1; i >= 0; i--) {
        const p = points[i];
        ctx.lineTo(xForYear(p.year), yForVal(getBottom(p)));
      }
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    }

    drawArea((p) => p.contributed, () => 0, hexToRgba(contribColor, 0.35));
    drawArea((p) => p.balance, (p) => p.contributed, hexToRgba(interestColor, 0.35));

    function drawLine(getVal, color) {
      ctx.beginPath();
      points.forEach((p, i) => {
        const x = xForYear(p.year);
        const y = yForVal(getVal(p));
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.25;
      ctx.stroke();
    }

    drawLine((p) => p.contributed, contribColor);
    drawLine((p) => p.balance, interestColor);

    ctx.save();
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    const targetY = yForVal(potRequired);
    ctx.moveTo(padding.left, targetY);
    ctx.lineTo(width - padding.right, targetY);
    ctx.strokeStyle = targetColor;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    lastChartGeometry = { padding, plotW, plotH, maxYear, maxBalance, points, potRequired, xForYear, yForVal, width, height };
  }

  canvas.addEventListener('mousemove', (e) => {
    if (!lastChartGeometry) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const { points, maxYear, padding, plotW, potRequired } = lastChartGeometry;
    const relX = (mx - padding.left) / plotW;
    const yearFloat = relX * maxYear;
    const year = Math.round(Math.max(0, Math.min(maxYear, yearFloat)));
    const point = points.find((p) => p.year === year) || points[points.length - 1];

    tooltip.style.opacity = '1';
    tooltip.style.left = mx + 'px';
    tooltip.style.top = (lastChartGeometry.yForVal(point.balance)) + 'px';
    tooltip.innerHTML = `
      <strong>Year ${point.year}</strong><br>
      Balance: ${fmtCurrency(point.balance)}<br>
      Contributed: ${fmtCurrency(point.contributed)}<br>
      Investment return: ${fmtCurrency(point.interest)}<br>
      Target pot: ${fmtCurrency(potRequired)}
    `;
  });

  canvas.addEventListener('mouseleave', () => {
    tooltip.style.opacity = '0';
  });

  window.addEventListener('resize', () => {
    if (lastChartParams && screens.results.classList.contains('active')) {
      drawChart(lastChartParams.yearly, lastChartParams.principal, lastChartParams.potRequired);
    }
  });

  // ---------- URL params ----------
  function readUrlParams() {
    const params = new URLSearchParams(location.search);
    const currencyParam = params.get('currency');
    const currency = CURRENCY_SYMBOLS[currencyParam] ? currencyParam : null;
    const hasCore = params.has('income') && params.has('currentAge') && params.has('targetAge') && params.has('assets');
    return { currency, hasCore, params };
  }

  function applyUrlParams(params) {
    function setField(param, textEl, rangeEl, isCurrency) {
      if (!params.has(param)) return;
      const val = parseNumber(params.get(param));
      let rangeVal = val;
      if (rangeVal < parseFloat(rangeEl.min)) rangeVal = parseFloat(rangeEl.min);
      if (rangeVal > parseFloat(rangeEl.max)) rangeVal = parseFloat(rangeEl.max);
      rangeEl.value = rangeVal;
      textEl.value = isCurrency ? fmtNumber(val) : val;
      updateSliderFill(rangeEl);
    }
    setField('income', incomeInput, incomeRange, true);
    setField('currentAge', currentAgeInput, currentAgeRange, false);
    setField('targetAge', targetAgeInput, targetAgeRange, false);
    setField('assets', assetsInput, assetsRange, true);
    setField('returnRate', returnRateInput, returnRateRange, false);
    setField('inflation', inflationInput, inflationRange, false);
    setField('leveraged', leveragedInput, leveragedRange, true);
    setField('withdrawalRate', withdrawalRateInput, withdrawalRateRange, false);
  }

  function currentParams() {
    const params = new URLSearchParams();
    params.set('currency', currentCurrency);
    params.set('income', Math.round(parseNumber(incomeInput.value)));
    params.set('currentAge', Math.round(parseNumber(currentAgeInput.value)));
    params.set('targetAge', Math.round(parseNumber(targetAgeInput.value)));
    params.set('assets', Math.round(parseNumber(assetsInput.value)));
    params.set('returnRate', parseNumber(returnRateInput.value));
    params.set('inflation', parseNumber(inflationInput.value));
    params.set('leveraged', Math.round(parseNumber(leveragedInput.value)));
    params.set('withdrawalRate', parseNumber(withdrawalRateInput.value));
    return params;
  }

  let urlUpdateTimer = null;
  function scheduleUrlUpdate() {
    if (urlUpdateTimer) return;
    urlUpdateTimer = setTimeout(() => {
      urlUpdateTimer = null;
      if (screens.results.classList.contains('active')) {
        history.replaceState(null, '', `${location.pathname}?${currentParams().toString()}`);
      }
    }, 200);
  }

  function shareUrl() {
    return `${location.origin}${location.pathname}?${currentParams().toString()}`;
  }

  // ---------- Loading build-up ----------
  const LOADING_MESSAGES = [
    'Crunching your numbers…',
    'Adjusting for inflation…',
    'Sizing your pot…',
    'Mapping your path…',
  ];
  let loadingTimers = [];

  function runLoadingSequence(onDone) {
    loadingTimers.forEach(clearTimeout);
    loadingTimers = [];
    const stepDuration = 550;
    const total = LOADING_MESSAGES.length * stepDuration;
    loadingBarFill.style.width = '0%';
    loadingMessageEl.textContent = LOADING_MESSAGES[0];

    LOADING_MESSAGES.forEach((msg, i) => {
      loadingTimers.push(setTimeout(() => {
        loadingMessageEl.textContent = msg;
        loadingBarFill.style.width = `${((i + 1) / LOADING_MESSAGES.length) * 100}%`;
      }, i * stepDuration));
    });

    loadingTimers.push(setTimeout(onDone, total));
  }

  // ---------- Navigation ----------
  mapPathBtn.addEventListener('click', () => {
    showScreen('loading');
    runLoadingSequence(() => {
      // Show the results screen before rendering, not after — the
      // chart's canvas is sized from getBoundingClientRect(), which
      // reads 0 while the results screen (and everything inside it) is
      // still display:none.
      showScreen('results');
      render();
    });
  });

  startOverBtn.addEventListener('click', () => {
    history.replaceState(null, '', location.pathname);
    showScreen('intake');
  });

  // ---------- Share ----------
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

  downloadReportBtn.addEventListener('click', () => {
    window.print();
  });

  // ---------- Downloadable share-image card ----------
  // Always rendered in the site's light/kraft palette regardless of the
  // viewer's current theme — a shared image needs to look the same and
  // stay recognisably "the site" wherever it lands, rather than shifting
  // with whoever happened to have dark mode on when they generated it.
  // Same palette and technique as Guess the Growth's share card.
  const CARD_COLORS = {
    bg: '#cabb95',
    ink: '#33291f',
    inkSecondary: 'rgba(51, 41, 31, 0.64)',
    inkTertiary: 'rgba(51, 41, 31, 0.44)',
    accent: '#8c3f34',
    accentText: '#f2e9d8',
  };

  let recoloredBuffaloPromise = null;

  // The site's brand mark is a plain PNG used everywhere else purely as a
  // CSS mask (background-color painted through its alpha shape) — canvas
  // has no mask-image equivalent, so this reproduces the same effect via
  // a source-in composite: draw the PNG, then flood-fill through
  // whatever alpha shape it left behind.
  function loadRecoloredBuffalo(color) {
    if (recoloredBuffaloPromise) return recoloredBuffaloPromise;
    recoloredBuffaloPromise = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const cx = c.getContext('2d');
        cx.drawImage(img, 0, 0);
        cx.globalCompositeOperation = 'source-in';
        cx.fillStyle = color;
        cx.fillRect(0, 0, c.width, c.height);
        resolve(c);
      };
      img.onerror = reject;
      img.src = '/BuffaloImage.png';
    });
    return recoloredBuffaloPromise;
  }

  function buildShareCardCanvas(result) {
    const symbol = CURRENCY_SYMBOLS[result.currency];
    const fmt = (n) => symbol + fmtNumber(n);

    // Belt-and-braces alongside the render-twice trick below — Shackleton
    // only genuinely ships a 400 (normal) weight face, so every draw call
    // below deliberately requests 400 only.
    const fontLoads = document.fonts
      ? document.fonts.load("400 130px 'shackleton'").catch(() => {})
      : Promise.resolve();

    return Promise.all([
      loadRecoloredBuffalo(CARD_COLORS.ink),
      document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve(),
      fontLoads,
    ]).then(([buffalo]) => {
      const canvas = document.createElement('canvas');
      const W = 1200, H = 1937;
      // Downloaded/shared images get viewed at all sorts of sizes and
      // pixel densities — render the raster at real supersampled
      // resolution (at least 3x) so text edges stay crisp. All draw calls
      // below stay in the same 1200x1500 logical space — ctx.scale() maps
      // it onto the larger backing buffer transparently.
      const scale = Math.max(3, Math.ceil(window.devicePixelRatio || 1));
      canvas.width = W * scale;
      canvas.height = H * scale;
      const ctx = canvas.getContext('2d');
      ctx.scale(scale, scale);
      const serif = "'shackleton', Georgia, serif";

      // Shackleton only actually ships a normal (400) weight — building
      // the bold look manually (normal weight, stroked then filled in the
      // same colour) sidesteps the rough synthetic-bold rasteriser.
      function boldText(text, x, y, size, color, strokeWidth) {
        ctx.font = `400 ${size}px ${serif}`;
        ctx.lineJoin = 'round';
        ctx.miterLimit = 2;
        ctx.lineWidth = strokeWidth;
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.strokeText(text, x, y);
        ctx.fillText(text, x, y);
      }

      function renderCard() {
        ctx.clearRect(0, 0, W, H);

        // Background + hard border, matching the site's flat kraft-card look
        ctx.fillStyle = CARD_COLORS.bg;
        ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = CARD_COLORS.ink;
        ctx.lineWidth = 4;
        ctx.strokeRect(20, 20, W - 40, H - 40);

        ctx.textBaseline = 'alphabetic';

        // Brand lockup, top-left
        const markSize = 64;
        ctx.drawImage(buffalo, 64, 56, markSize, markSize);
        ctx.textAlign = 'left';
        boldText('Investing Buffalo', 144, 100, 30, CARD_COLORS.ink, 1);

        // Kicker, top-right
        ctx.textAlign = 'right';
        boldText('MAP YOUR PATH', W - 64, 96, 20, CARD_COLORS.inkSecondary, 0.6);

        // ---- Hero: the headline stat ----
        ctx.textAlign = 'center';
        boldText('THE POT YOU NEED', W / 2, 210, 26, CARD_COLORS.inkSecondary, 0.8);
        boldText(fmt(result.potRequired), W / 2, 335, 116, CARD_COLORS.accent, 3);

        ctx.font = `400 27px ${serif}`;
        ctx.fillStyle = CARD_COLORS.ink;
        const heroSub = result.leveraged > 0
          ? `to provide ${fmt(result.passiveMonthly)}/month passive income by age ${result.targetAge}`
          : `to provide ${fmt(result.passiveMonthly)}/month by age ${result.targetAge}`;
        ctx.fillText(heroSub, W / 2, 380, W - 200);

        // ---- Growth chart: the same series drawChart() plots on-page ----
        // Fixed hex values here, not cssVar() lookups — the page chart
        // reads --contrib/--interest/--multiple live off the current
        // theme, but this card is always the light/print palette, so
        // these are simply that palette's values (see style.css :root).
        const contribColor = CARD_COLORS.ink;
        const interestColor = '#786246';
        const targetColor = '#6b5136';

        boldText('REACHING YOUR POT', W / 2, 450, 22, CARD_COLORS.inkSecondary, 0.6);

        function legendRow(cy) {
          const items = [
            { color: contribColor, label: 'Savings' },
            { color: interestColor, label: 'Investment return' },
            { color: targetColor, label: 'Target pot', dashed: true },
          ];
          ctx.font = `400 18px ${serif}`;
          const dotR = 6, gapDotText = 10, gapItems = 30;
          const widths = items.map((it) => dotR * 2 + gapDotText + ctx.measureText(it.label).width);
          const totalW = widths.reduce((a, b) => a + b, 0) + gapItems * (items.length - 1);
          let cx = W / 2 - totalW / 2;
          items.forEach((it, i) => {
            if (it.dashed) {
              ctx.strokeStyle = it.color;
              ctx.lineWidth = 3;
              ctx.setLineDash([5, 4]);
              ctx.beginPath();
              ctx.moveTo(cx, cy - 6);
              ctx.lineTo(cx + dotR * 2, cy - 6);
              ctx.stroke();
              ctx.setLineDash([]);
            } else {
              ctx.beginPath();
              ctx.fillStyle = it.color;
              ctx.arc(cx + dotR, cy - 6, dotR, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.textAlign = 'left';
            ctx.textBaseline = 'alphabetic';
            ctx.fillStyle = CARD_COLORS.inkSecondary;
            ctx.fillText(it.label, cx + dotR * 2 + gapDotText, cy);
            cx += widths[i] + gapItems;
          });
        }
        legendRow(484);

        function compactCurrencyForCard(v) {
          if (v >= 1_000_000) return symbol + (v / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
          if (v >= 1_000) return symbol + (v / 1_000).toFixed(0) + 'K';
          return symbol + Math.round(v);
        }

        function drawCardChart(cx, cy, cw, ch, series, principal, target) {
          const points = [{ year: 0, contributed: principal, interest: 0, balance: principal }, ...series];
          if (points.length < 2 || !Number.isFinite(target)) return;

          const padding = { top: 10, right: 20, bottom: 34, left: 92 };
          const plotW = cw - padding.left - padding.right;
          const plotH = ch - padding.top - padding.bottom;
          const maxBalance = Math.max(target, ...points.map((p) => p.balance)) * 1.05;
          const maxYear = points[points.length - 1].year || 1;
          const xForYear = (yr) => cx + padding.left + (yr / maxYear) * plotW;
          const yForVal = (v) => cy + padding.top + plotH - (v / maxBalance) * plotH;

          ctx.font = `400 15px ${serif}`;
          ctx.textBaseline = 'middle';
          ctx.textAlign = 'right';
          const ySteps = 4;
          for (let i = 0; i <= ySteps; i++) {
            const val = (maxBalance / ySteps) * i;
            const yy = yForVal(val);
            ctx.strokeStyle = 'rgba(51, 41, 31, 0.15)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cx + padding.left, yy);
            ctx.lineTo(cx + cw - padding.right, yy);
            ctx.stroke();
            ctx.fillStyle = CARD_COLORS.inkSecondary;
            ctx.fillText(compactCurrencyForCard(val), cx + padding.left - 10, yy);
          }

          ctx.textAlign = 'center';
          ctx.textBaseline = 'alphabetic';
          const maxLabels = 8;
          const xLabelStep = Math.max(1, Math.ceil(maxYear / Math.max(1, maxLabels - 1)));
          for (let yr = 0; yr <= maxYear; yr += xLabelStep) {
            ctx.fillText('Yr ' + yr, xForYear(yr), cy + ch - padding.bottom + 22);
          }

          function drawArea(getTop, getBottom, color) {
            ctx.beginPath();
            points.forEach((p, i) => {
              const px = xForYear(p.year), py = yForVal(getTop(p));
              if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            });
            for (let i = points.length - 1; i >= 0; i--) {
              const p = points[i];
              ctx.lineTo(xForYear(p.year), yForVal(getBottom(p)));
            }
            ctx.closePath();
            ctx.fillStyle = color;
            ctx.fill();
          }
          drawArea((p) => p.contributed, () => 0, 'rgba(51, 41, 31, 0.2)');
          drawArea((p) => p.balance, (p) => p.contributed, 'rgba(120, 98, 70, 0.32)');

          function drawLine(getVal, color) {
            ctx.beginPath();
            points.forEach((p, i) => {
              const px = xForYear(p.year), py = yForVal(getVal(p));
              if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            });
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.stroke();
          }
          drawLine((p) => p.contributed, contribColor);
          drawLine((p) => p.balance, interestColor);

          ctx.save();
          ctx.setLineDash([8, 6]);
          ctx.beginPath();
          const targetY = yForVal(target);
          ctx.moveTo(cx + padding.left, targetY);
          ctx.lineTo(cx + cw - padding.right, targetY);
          ctx.strokeStyle = targetColor;
          ctx.lineWidth = 2.5;
          ctx.stroke();
          ctx.restore();
        }
        drawCardChart(64, 505, W - 128, 320, result.series, result.principal, result.potRequired);

        // ---- Your pot: ledger breakdown ----
        boldText('YOUR POT', W / 2, 890, 22, CARD_COLORS.inkSecondary, 0.6);

        function drawLedgerBox(lx, ly, lw, rows) {
          const rowH = 56;
          ctx.strokeStyle = CARD_COLORS.ink;
          ctx.lineWidth = 2;
          ctx.strokeRect(lx, ly, lw, rowH * rows.length);
          rows.forEach((r, i) => {
            const rowY = ly + i * rowH;
            if (i > 0) {
              ctx.strokeStyle = 'rgba(51, 41, 31, 0.25)';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(lx, rowY);
              ctx.lineTo(lx + lw, rowY);
              ctx.stroke();
            }
            const textY = rowY + rowH / 2 + 8;
            ctx.textAlign = 'left';
            ctx.font = `400 22px ${serif}`;
            ctx.fillStyle = CARD_COLORS.ink;
            ctx.fillText(r.label, lx + 24, textY);
            ctx.textAlign = 'right';
            boldText(r.value, lx + lw - 24, textY, 24, r.accent ? CARD_COLORS.accent : CARD_COLORS.ink, 0.5);
          });
        }
        drawLedgerBox(64, 915, W - 128, [
          { label: 'Pot required (4% rule)', value: fmt(result.potRequired), accent: true },
          { label: 'Current assets', value: fmt(result.principal) },
          { label: 'Return on current assets', value: fmt(result.futureAssets - result.principal) },
          { label: 'Still to be saved', value: fmt(result.savingsContributed) },
          { label: 'Return on still to be saved', value: fmt(Math.max(0, result.potRequired - result.futureAssets) - result.savingsContributed) },
        ]);

        // ---- Stat row ----
        // Four boxes now (was three) — fits "today" alongside "future"
        // desired income as its own equal-weight stat, rather than
        // cramming both values into one box as primary/caption.
        const statY = 1232;
        const statBoxW = 250, statBoxH = 130, statGap = 24;
        const statXs = [0, 1, 2, 3].map((i) => 64 + i * (statBoxW + statGap));
        function statBox(x, label, value) {
          ctx.strokeStyle = CARD_COLORS.ink;
          ctx.lineWidth = 2;
          ctx.strokeRect(x, statY, statBoxW, statBoxH);
          ctx.textAlign = 'center';
          ctx.font = `400 18px ${serif}`;
          ctx.fillStyle = CARD_COLORS.inkSecondary;
          wrapText(ctx, label, x + statBoxW / 2, statY + 32, statBoxW - 28, 22);
          boldText(value, x + statBoxW / 2, statY + statBoxH - 34, 30, CARD_COLORS.ink, 0.6);
        }
        const savingsLabel = result.pmtIsNow ? 'Needed right now' : 'Monthly savings needed';
        const savingsValue = result.onTrack ? 'On track' : fmt(result.pmt);
        statBox(statXs[0], savingsLabel, savingsValue);
        statBox(statXs[1], 'Desired income (today)', fmt(result.desiredIncome) + '/mo');
        statBox(statXs[2], 'Desired income (future)', fmt(result.futureMonthlyIncome) + '/mo');
        statBox(statXs[3], 'Years to go', String(result.years));

        // ---- Leveraged income callout ----
        const boxY = 1402, boxH = 195;
        ctx.fillStyle = 'rgba(140, 63, 52, 0.1)';
        ctx.fillRect(64, boxY, W - 128, boxH);
        ctx.strokeStyle = CARD_COLORS.accent;
        ctx.lineWidth = 2;
        ctx.strokeRect(64, boxY, W - 128, boxH);

        ctx.textAlign = 'left';
        boldText('LEVERAGED INCOME', 96, boxY + 46, 22, CARD_COLORS.accent, 0.6);

        ctx.font = `400 23px ${serif}`;
        ctx.fillStyle = CARD_COLORS.ink;
        ctx.textAlign = 'center';
        const yearsSoonerText = result.yearsSooner ? result.yearsSooner.toFixed(1).replace(/\.0$/, '') : null;
        // Every case below is framed as an assumption ("Assumes...") with
        // the actual alternative spelled out, rather than "cuts your
        // saving by £X" — phrasing that read as if the reduction had
        // already happened, not as conditional on generating that income.
        let leverageText;
        if (result.leveraged <= 0) {
          leverageText = 'A side business could generate leveraged income and shorten this path.';
        } else if (result.monthlySaved > 0) {
          leverageText = `Assumes ${fmt(result.leveraged)}/month in leveraged income, which cuts your monthly saving requirement by ${fmt(result.monthlySaved)} to ${fmt(result.pmt)}`
            + (yearsSoonerText ? `, or save ${fmt(result.baseMonthlyForCompare)}/month as originally planned and get there roughly ${yearsSoonerText} years sooner.` : '.');
        } else if (yearsSoonerText) {
          leverageText = `Assumes ${fmt(result.leveraged)}/month in leveraged income — keep saving ${fmt(result.baseMonthlyForCompare)}/month as planned and get there roughly ${yearsSoonerText} years sooner.`;
        } else {
          leverageText = `Assumes ${fmt(result.leveraged)}/month in leveraged income toward your desired monthly income.`;
        }
        const leverageLines = wrapTextBalanced(ctx, leverageText, W - 200);
        // Vertically centred in the space below the title rather than
        // pinned to a fixed offset — keeps a real gap under "LEVERAGED
        // INCOME" whether the copy wraps to one line or three.
        const leverageLineH = 32;
        const leverageContentTop = boxY + 82;
        const leverageContentBottom = boxY + boxH - 22;
        const leverageBlockH = (leverageLines.length - 1) * leverageLineH;
        const leverageStartY = Math.max(
          leverageContentTop,
          leverageContentTop + (leverageContentBottom - leverageContentTop - leverageBlockH) / 2
        );
        leverageLines.forEach((line, i) => ctx.fillText(line, W / 2, leverageStartY + i * leverageLineH));

        // ---- Assumptions used ----
        // The fine print behind the headline numbers — muted styling so
        // it reads as reference detail, not another competing headline.
        boldText('ASSUMPTIONS USED', W / 2, 1657, 20, CARD_COLORS.inkSecondary, 0.5);

        const fmtPercentForCard = (n) => (n * 100).toFixed(1).replace(/\.0$/, '') + '%';
        const assumeY = 1682, assumeH = 110, assumeX = 64, assumeW = W - 128;
        const assumeCols = [
          { label: 'Expected annual return', value: fmtPercentForCard(result.annualReturn) },
          { label: 'Expected annual inflation', value: fmtPercentForCard(result.inflation) },
          { label: 'Safe withdrawal rate', value: fmtPercentForCard(result.withdrawalRate) },
          { label: 'Leveraged income assumed', value: fmt(result.leveraged) + '/mo' },
        ];
        const colW = assumeW / assumeCols.length;
        ctx.strokeStyle = 'rgba(51, 41, 31, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(assumeX, assumeY, assumeW, assumeH);
        assumeCols.forEach((col, i) => {
          const colX = assumeX + i * colW;
          if (i > 0) {
            ctx.beginPath();
            ctx.moveTo(colX, assumeY);
            ctx.lineTo(colX, assumeY + assumeH);
            ctx.stroke();
          }
          ctx.textAlign = 'center';
          ctx.font = `400 15px ${serif}`;
          ctx.fillStyle = CARD_COLORS.inkSecondary;
          wrapText(ctx, col.label, colX + colW / 2, assumeY + 24, colW - 24, 18);
          boldText(col.value, colX + colW / 2, assumeY + assumeH - 26, 26, CARD_COLORS.ink, 0.5);
        });

        // ---- Footer ----
        ctx.textAlign = 'center';
        boldText('Map your own path at investingbuffalo.com', W / 2, H - 90, 26, CARD_COLORS.accent, 0.8);
        ctx.font = `italic 400 17px ${serif}`;
        ctx.fillStyle = CARD_COLORS.inkTertiary;
        ctx.fillText('Illustrative only — assumes a constant return and inflation, and is not financial advice.', W / 2, H - 58);
      }

      // document.fonts.load() resolving still isn't a hard guarantee the
      // canvas rasteriser has the glyphs ready — render once as a
      // throwaway warm-up pass, wait a real paint cycle, then render
      // again to reliably land on the far side of that gap.
      renderCard();
      return new Promise((resolve) => {
        let done = false;
        function finish() {
          if (done) return;
          done = true;
          renderCard();
          resolve(canvas);
        }
        requestAnimationFrame(() => requestAnimationFrame(finish));
        setTimeout(finish, 400);
      });
    });
  }

  // Simple manual word-wrap for canvas text — fillText has no native
  // wrapping, and the stat-box labels are long enough to occasionally
  // need a second line at this box width.
  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    const lines = [];
    words.forEach((word) => {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    });
    if (line) lines.push(line);
    const startY = y + (lines.length > 1 ? 0 : lineHeight / 2);
    lines.forEach((l, i) => ctx.fillText(l, x, startY + i * lineHeight));
  }

  // Greedy word-wrap (above) always fills each line to the brim before
  // breaking, so the last line ends up conspicuously short — fine for
  // short labels, but it makes a multi-sentence paragraph like the
  // leveraged-income callout look ragged. This finds the narrowest wrap
  // width that still produces the same number of lines the greedy wrap
  // did at the full width — since a narrower budget forces the greedy
  // algorithm to break earlier, that redistributes words more evenly
  // across the fixed line count, without a full min-raggedness solver.
  function wrapTextBalanced(ctx, text, maxWidth) {
    function wrapAt(width) {
      const words = text.split(' ');
      let line = '';
      const lines = [];
      words.forEach((word) => {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > width && line) {
          lines.push(line);
          line = word;
        } else {
          line = test;
        }
      });
      if (line) lines.push(line);
      return lines;
    }
    const fullLines = wrapAt(maxWidth);
    if (fullLines.length <= 1) return fullLines;
    const targetCount = fullLines.length;
    let lo = 0, hi = maxWidth;
    for (let i = 0; i < 25; i++) {
      const mid = (lo + hi) / 2;
      if (wrapAt(mid).length <= targetCount) hi = mid; else lo = mid;
    }
    const balanced = wrapAt(hi);
    return balanced.length === targetCount ? balanced : fullLines;
  }

  let lastShareImageUrl = null;

  downloadImageBtn.addEventListener('click', () => {
    if (!lastResult) return;
    downloadImageBtn.disabled = true;
    setStatus('Generating your image…', 0);
    buildShareCardCanvas(lastResult)
      .then((canvas) => new Promise((resolve) => canvas.toBlob(resolve, 'image/png')))
      .then((blob) => {
        if (!blob) throw new Error('Could not create image');
        if (lastShareImageUrl) URL.revokeObjectURL(lastShareImageUrl);
        const url = URL.createObjectURL(blob);
        lastShareImageUrl = url;
        shareImagePreview.src = url;
        const link = document.createElement('a');
        link.href = url;
        link.download = 'map-your-path-result.png';
        document.body.appendChild(link);
        link.click();
        link.remove();
        setStatus('Image downloaded');
      })
      .catch(() => {
        setStatus('Could not generate the image — try again');
      })
      .finally(() => {
        downloadImageBtn.disabled = false;
      });
  });

  // The chart's colours are baked into its pixels at whatever moment it
  // was last drawn — they don't update on their own just because print
  // styles kick in, unlike CSS-driven elements. Redraw right before
  // printing (once the @media print rules are actually active, so
  // cssVar() picks up the light, ink-friendly print palette instead of
  // the current on-screen theme), then redraw again afterwards to
  // restore whatever the visitor was actually looking at.
  window.addEventListener('beforeprint', () => {
    if (lastChartParams) drawChart(lastChartParams.yearly, lastChartParams.principal, lastChartParams.potRequired);
  });
  window.addEventListener('afterprint', () => {
    if (lastChartParams) drawChart(lastChartParams.yearly, lastChartParams.principal, lastChartParams.potRequired);
  });

  // ---------- Theme ----------
  // Handled inline rather than via /theme.js — the chart is a canvas
  // redrawn from CSS custom properties read at draw time (like Freedom
  // Runway/How Much Is Enough's charts), so toggling needs a re-render,
  // not just a CSS variable swap.
  function initTheme() {
    const saved = localStorage.getItem('cic-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', saved || (prefersDark ? 'dark' : 'light'));
  }
  themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('cic-theme', next);
    if (screens.results.classList.contains('active')) render();
  });

  // ---------- Startup ----------
  initTheme();
  const initial = readUrlParams();
  if (initial.currency) {
    currentCurrency = initial.currency;
    currencyButtons.forEach((b) => b.classList.toggle('active', b.dataset.currency === currentCurrency));
    const symbol = CURRENCY_SYMBOLS[currentCurrency];
    incomeSymbol.textContent = symbol;
    assetsSymbol.textContent = symbol;
    leveragedSymbol.textContent = symbol;
  }

  if (initial.hasCore) {
    // Arriving via a shared/bookmarked link — jump straight to the
    // results for those exact numbers, no need to re-run the intake
    // questions or the loading build-up.
    applyUrlParams(initial.params);
    showScreen('results');
    render();
  }
})();
