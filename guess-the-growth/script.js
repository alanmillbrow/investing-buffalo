(function () {
  const $ = (id) => document.getElementById(id);
  const SVG_NS = 'http://www.w3.org/2000/svg';

  // ---------- Default scenario ----------
  // The canonical, non-randomised first round — everyone guesses the same
  // scenario, so the "you guessed low" reveal is a shared, comparable
  // experience rather than a different number for every visitor.
  const DEFAULT_SCENARIO = { principal: 10000, monthly: 200, years: 30, rate: 0.07 };
  const MAX_RATE = 0.15; // capped per the brief — protects against a screenshot showing an unrealistic figure

  // ---------- Currency ----------
  const CURRENCY_SYMBOLS = { GBP: '£', USD: '$', EUR: '€' };
  let currentCurrency = 'GBP';

  // ---------- Formatting helpers ----------
  const fmtNumber = (n) => new Intl.NumberFormat('en-GB').format(Math.round(n));
  const fmtCurrency = (n) => CURRENCY_SYMBOLS[currentCurrency] + fmtNumber(n);

  function parseNumber(str) {
    const cleaned = String(str).replace(/[^0-9.\-]/g, '');
    const val = parseFloat(cleaned);
    return isNaN(val) ? 0 : val;
  }

  // ---------- Math ----------
  // Same formulas as the Tipping Point Game, already verified there
  // against a known reference case (a lump sum at a fixed rate over a
  // whole number of years reduces to simple compound interest exactly).
  function annuityFutureValue(monthlyAmount, years, annualRate) {
    const n = Math.round(years * 12);
    if (n <= 0) return 0;
    const rm = Math.pow(1 + annualRate, 1 / 12) - 1;
    if (Math.abs(rm) < 1e-9) return monthlyAmount * n;
    return monthlyAmount * ((Math.pow(1 + rm, n) - 1) / rm);
  }

  function lumpSumFutureValue(principal, years, annualRate) {
    return principal * Math.pow(1 + annualRate, years);
  }

  function totalFutureValue(scenario) {
    return lumpSumFutureValue(scenario.principal, scenario.years, scenario.rate)
      + annuityFutureValue(scenario.monthly, scenario.years, scenario.rate);
  }

  function contributedTotal(scenario) {
    return scenario.principal + scenario.monthly * 12 * scenario.years;
  }

  // "Nice" round number at or above a target, used for the guess slider's
  // ceiling — always comfortably above the real answer without hinting
  // at the exact multiple used.
  function niceRoundUp(value) {
    if (value <= 0) return 0;
    const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
    const step = magnitude / 4; // quarter-magnitude steps (..., 25k, 50k, 75k, 100k, ...)
    return Math.ceil(value / step) * step;
  }

  // ---------- DOM refs ----------
  const screens = { guess: $('screenGuess'), customize: $('screenCustomize'), reveal: $('screenReveal') };

  const scenarioTextEl = $('scenarioText');
  const factPrincipalEl = $('factPrincipal');
  const factMonthlyEl = $('factMonthly');
  const factYearsEl = $('factYears');
  const factRateEl = $('factRate');

  const guessSymbolEl = $('guessSymbol');
  const guessInput = $('guessInput');
  const guessRange = $('guessRange');
  const revealBtn = $('revealBtn');
  const tryOwnNumbersBtn = $('tryOwnNumbersBtn');
  const tryOwnNumbersBtn2 = $('tryOwnNumbersBtn2');
  const backToDefaultBtn = $('backToDefaultBtn');
  const startCustomRoundBtn = $('startCustomRoundBtn');
  const playAgainBtn = $('playAgainBtn');

  const currencyButtons = document.querySelectorAll('.currency-segmented .seg-btn');
  const customPrincipalSymbol = $('customPrincipalSymbol');
  const customMonthlySymbol = $('customMonthlySymbol');
  const customPrincipal = $('customPrincipal');
  const customPrincipalRange = $('customPrincipalRange');
  const customMonthly = $('customMonthly');
  const customMonthlyRange = $('customMonthlyRange');
  const customYears = $('customYears');
  const customYearsRange = $('customYearsRange');
  const customRate = $('customRate');
  const customRateRange = $('customRateRange');

  const revealHeadlineEl = $('revealHeadline');
  const revealSubEl = $('revealSub');
  const actualValueDisplay = $('actualValueDisplay');
  const gapTextEl = $('gapText');
  const breakdownContributedEl = $('breakdownContributed');
  const breakdownGrowthEl = $('breakdownGrowth');
  const growthBarSvg = $('growthBarSvg');

  const copyLinkBtn = $('copyLinkBtn');
  const shareLinkBtn = $('shareLinkBtn');
  const shareStatus = $('shareStatus');

  // ---------- State ----------
  const state = {
    scenario: { ...DEFAULT_SCENARIO },
    guess: null,
  };

  // ---------- URL params ----------
  function readUrlParams() {
    const params = new URLSearchParams(location.search);
    const currencyParam = params.get('currency');
    const currency = CURRENCY_SYMBOLS[currencyParam] ? currencyParam : null;

    const hasScenario = params.has('principal') && params.has('monthly') && params.has('years') && params.has('rate');
    let scenario = null;
    if (hasScenario) {
      scenario = {
        principal: parseNumber(params.get('principal')),
        monthly: parseNumber(params.get('monthly')),
        years: Math.max(1, Math.min(50, parseNumber(params.get('years')))),
        rate: Math.max(0, Math.min(MAX_RATE, parseNumber(params.get('rate')) / 100)),
      };
    }

    let guess = null;
    if (params.has('guess')) {
      const g = parseNumber(params.get('guess'));
      if (!isNaN(g)) guess = g;
    }

    return { currency, scenario, guess };
  }

  function currentParams() {
    const params = new URLSearchParams();
    params.set('currency', currentCurrency);
    params.set('principal', Math.round(state.scenario.principal));
    params.set('monthly', Math.round(state.scenario.monthly));
    params.set('years', state.scenario.years);
    // Rounded to 1dp — state.scenario.rate * 100 alone carries float dust
    // (e.g. 7.000000000000001) that would otherwise leak into the URL.
    params.set('rate', Math.round(state.scenario.rate * 1000) / 10);
    if (state.guess !== null) params.set('guess', Math.round(state.guess));
    return params;
  }

  function updateUrl() {
    history.replaceState(null, '', `${location.pathname}?${currentParams().toString()}`);
  }

  function shareUrl() {
    return `${location.origin}${location.pathname}?${currentParams().toString()}`;
  }

  // ---------- Screens ----------
  function showScreen(name) {
    Object.entries(screens).forEach(([key, el]) => el.classList.toggle('active', key === name));
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  // ---------- Guess screen ----------
  function populateGuessScreen() {
    const scenario = state.scenario;
    const symbol = CURRENCY_SYMBOLS[currentCurrency];

    scenarioTextEl.textContent = `You invest ${fmtCurrency(scenario.principal)} and add ${fmtCurrency(scenario.monthly)} a month for ${scenario.years} years, at a ${(scenario.rate * 100).toFixed(1).replace(/\.0$/, '')}% average annual return.`;
    factPrincipalEl.textContent = fmtCurrency(scenario.principal);
    factMonthlyEl.textContent = fmtCurrency(scenario.monthly);
    factYearsEl.textContent = `${scenario.years} years`;
    factRateEl.textContent = `${(scenario.rate * 100).toFixed(1).replace(/\.0$/, '')}%`;

    guessSymbolEl.textContent = symbol;

    const actual = totalFutureValue(scenario);
    const guessMax = Math.max(niceRoundUp(actual * 2.5), 10000);
    const guessStep = guessMax >= 200000 ? 5000 : guessMax >= 20000 ? 1000 : 100;
    guessRange.max = guessMax;
    guessRange.step = guessStep;
    const startGuess = Math.round(guessMax * 0.2 / guessStep) * guessStep;
    guessInput.value = fmtNumber(startGuess);
    guessRange.value = startGuess;
    updateSliderFill(guessRange);
  }

  // ---------- Reveal ----------
  let countUpFrame = null;

  function animateCountUp(target) {
    if (countUpFrame) cancelAnimationFrame(countUpFrame);
    const duration = 1600;
    const ease = (t) => 1 - Math.pow(1 - t, 3); // easeOutCubic
    let start = null;
    function step(now) {
      if (start === null) start = now;
      const progress = Math.min(1, (now - start) / duration);
      const val = target * ease(progress);
      actualValueDisplay.textContent = fmtCurrency(val);
      if (progress < 1) {
        countUpFrame = requestAnimationFrame(step);
      } else {
        actualValueDisplay.textContent = fmtCurrency(target);
        countUpFrame = null;
      }
    }
    countUpFrame = requestAnimationFrame(step);
  }

  function drawGrowthBar(contributed, growth) {
    growthBarSvg.innerHTML = '';
    const baseline = 148;
    const maxBarHeight = 108;
    const barWidth = 74;
    const contribX = 46;
    const growthX = 180;
    const maxVal = Math.max(contributed, growth, 1);

    function addRect(x, height, cls) {
      const rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('x', x);
      rect.setAttribute('y', baseline - height);
      rect.setAttribute('width', barWidth);
      rect.setAttribute('height', Math.max(height, 0));
      rect.setAttribute('class', cls);
      growthBarSvg.appendChild(rect);
    }
    function addText(x, y, text, cls) {
      const el = document.createElementNS(SVG_NS, 'text');
      el.setAttribute('x', x);
      el.setAttribute('y', y);
      el.setAttribute('text-anchor', 'middle');
      el.setAttribute('class', cls);
      el.textContent = text;
      growthBarSvg.appendChild(el);
    }

    const contribH = (contributed / maxVal) * maxBarHeight;
    const growthH = (growth / maxVal) * maxBarHeight;

    // Growth gets the "important number" terracotta treatment — it's the
    // whole point of the game — contributed stays neutral.
    addRect(contribX, contribH, 'bar-rect bar-rect-loser');
    addRect(growthX, growthH, 'bar-rect bar-rect-winner');

    const baseLine = document.createElementNS(SVG_NS, 'line');
    baseLine.setAttribute('x1', 20);
    baseLine.setAttribute('x2', 280);
    baseLine.setAttribute('y1', baseline);
    baseLine.setAttribute('y2', baseline);
    baseLine.setAttribute('class', 'bar-baseline');
    growthBarSvg.appendChild(baseLine);

    addText(contribX + barWidth / 2, baseline - contribH - 10, fmtCurrency(contributed), 'bar-value-label');
    addText(growthX + barWidth / 2, baseline - growthH - 10, fmtCurrency(growth), 'bar-value-label bar-value-label-winner');
    addText(contribX + barWidth / 2, baseline + 22, 'You contributed', 'bar-cat-label');
    addText(growthX + barWidth / 2, baseline + 22, 'Compounding added', 'bar-cat-label');
  }

  function showReveal() {
    const scenario = state.scenario;
    const guess = state.guess;
    const actual = totalFutureValue(scenario);
    const contributed = contributedTotal(scenario);
    const growth = actual - contributed;
    const gap = actual - guess;

    revealHeadlineEl.textContent = `You guessed ${fmtCurrency(guess)}.`;

    const closeThreshold = actual * 0.02;
    if (Math.abs(gap) <= closeThreshold) {
      revealSubEl.textContent = `Spot on — that's remarkably close.`;
    } else if (gap > 0) {
      revealSubEl.textContent = `You were ${fmtCurrency(gap)} low.`;
    } else {
      revealSubEl.textContent = `You were ${fmtCurrency(Math.abs(gap))} high.`;
    }

    gapTextEl.innerHTML = `You guessed <strong>${fmtCurrency(guess)}</strong>. The real figure is <strong>${fmtCurrency(actual)}</strong>.`;

    breakdownContributedEl.textContent = fmtCurrency(contributed);
    breakdownGrowthEl.textContent = fmtCurrency(growth);
    drawGrowthBar(contributed, growth);

    showScreen('reveal');
    animateCountUp(actual);
    updateUrl();
  }

  // ---------- Customize screen ----------
  function populateCustomizeScreen() {
    const scenario = state.scenario;
    currencyButtons.forEach((b) => b.classList.toggle('active', b.dataset.currency === currentCurrency));
    const symbol = CURRENCY_SYMBOLS[currentCurrency];
    customPrincipalSymbol.textContent = symbol;
    customMonthlySymbol.textContent = symbol;

    customPrincipal.value = fmtNumber(scenario.principal);
    customPrincipalRange.value = Math.min(scenario.principal, parseFloat(customPrincipalRange.max));
    updateSliderFill(customPrincipalRange);

    customMonthly.value = fmtNumber(scenario.monthly);
    customMonthlyRange.value = Math.min(scenario.monthly, parseFloat(customMonthlyRange.max));
    updateSliderFill(customMonthlyRange);

    customYears.value = scenario.years;
    customYearsRange.value = scenario.years;
    updateSliderFill(customYearsRange);

    customRate.value = (scenario.rate * 100).toFixed(1).replace(/\.0$/, '');
    customRateRange.value = scenario.rate * 100;
    updateSliderFill(customRateRange);
  }

  bindTextAndRange(customPrincipal, customPrincipalRange, { isCurrency: true });
  bindTextAndRange(customMonthly, customMonthlyRange, { isCurrency: true });
  bindTextAndRange(customYears, customYearsRange, {});
  bindTextAndRange(customRate, customRateRange, {});
  bindTextAndRange(guessInput, guessRange, { isCurrency: true });

  currencyButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      currentCurrency = btn.dataset.currency;
      currencyButtons.forEach((b) => b.classList.toggle('active', b === btn));
      const symbol = CURRENCY_SYMBOLS[currentCurrency];
      customPrincipalSymbol.textContent = symbol;
      customMonthlySymbol.textContent = symbol;
    });
  });

  // ---------- Navigation ----------
  revealBtn.addEventListener('click', () => {
    state.guess = parseNumber(guessInput.value);
    showReveal();
  });

  function goToCustomize() {
    populateCustomizeScreen();
    showScreen('customize');
  }
  tryOwnNumbersBtn.addEventListener('click', goToCustomize);
  tryOwnNumbersBtn2.addEventListener('click', goToCustomize);

  backToDefaultBtn.addEventListener('click', () => {
    state.scenario = { ...DEFAULT_SCENARIO };
    state.guess = null;
    populateGuessScreen();
    showScreen('guess');
  });

  startCustomRoundBtn.addEventListener('click', () => {
    state.scenario = {
      principal: parseNumber(customPrincipal.value),
      monthly: parseNumber(customMonthly.value),
      years: Math.max(1, Math.min(50, parseNumber(customYears.value))),
      rate: Math.max(0, Math.min(MAX_RATE, parseNumber(customRate.value) / 100)),
    };
    state.guess = null;
    populateGuessScreen();
    showScreen('guess');
  });

  playAgainBtn.addEventListener('click', () => {
    state.scenario = { ...DEFAULT_SCENARIO };
    state.guess = null;
    populateGuessScreen();
    showScreen('guess');
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

  // ---------- Theme ----------
  // Handled by /theme.js — this page's SVG bar chart is coloured purely
  // via CSS classes/custom properties, same as the Tipping Point Game's,
  // so it needs no JS redraw on theme toggle.

  // ---------- Startup ----------
  const initial = readUrlParams();
  if (initial.currency) currentCurrency = initial.currency;
  if (initial.scenario) state.scenario = initial.scenario;

  if (initial.guess !== null && initial.scenario) {
    // Arriving via a shared/bookmarked link — jump straight to the
    // reveal for that exact scenario and guess.
    state.guess = initial.guess;
    showReveal();
  } else {
    populateGuessScreen();
  }
})();
