(() => {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';

  // ---------- Elements ----------
  const $ = (id) => document.getElementById(id);

  const priceInput = $('price');
  const priceRange = $('priceRange');
  const currentAgeInput = $('currentAge');
  const currentAgeRange = $('currentAgeRange');
  const futureAgeInput = $('futureAge');
  const futureAgeRange = $('futureAgeRange');
  const returnRateInput = $('returnRate');
  const returnRateRange = $('returnRateRange');
  const inflationInput = $('inflation');
  const inflationRange = $('inflationRange');

  const currencyButtons = document.querySelectorAll('.currency-segmented .seg-btn');
  const priceSymbol = $('priceSymbol');

  const summarySentenceEl = $('summarySentence');
  const priceOut = $('priceOut');
  const futureAgeOut1 = $('futureAgeOut1');
  const yearsOut1 = $('yearsOut1');
  const returnOut = $('returnOut');
  const futureValueEl = $('futureValue');
  const priceOut2 = $('priceOut2');
  const yearsOut2 = $('yearsOut2');
  const inflationOut = $('inflationOut');
  const realCostEl = $('realCost');

  const themeToggle = $('themeToggle');

  const copyLinkBtn = $('copyLinkBtn');
  const shareLinkBtn = $('shareLinkBtn');
  const bookmarkBtn = $('bookmarkBtn');
  const shareStatus = $('shareStatus');

  const barChartSvg = $('barChartSvg');

  const canvas = $('chart');
  const ctx = canvas.getContext('2d');
  const tooltip = $('tooltip');

  const CURRENCY_SYMBOLS = { USD: '$', GBP: '£', EUR: '€' };
  let currentCurrency = 'GBP';

  // ---------- Formatting helpers ----------
  const fmtNumber = (n) => new Intl.NumberFormat('en-US').format(Math.round(n));
  const fmtCurrency = (n) => CURRENCY_SYMBOLS[currentCurrency] + fmtNumber(n);

  // Small caption under each headline value showing how much of that
  // figure is over and above the purchase price itself — e.g. "£1,934
  // more than the price" — so the big number's context (how much of it
  // is the cost of waiting, not just the original price) reads at a
  // glance without doing the subtraction yourself.
  function variance(value, price) {
    const diff = Math.round(value) - Math.round(price);
    const text = diff === 0
      ? 'same as purchase price'
      : `${fmtCurrency(Math.abs(diff))} ${diff > 0 ? 'more' : 'less'} than the price`;
    return `<span class="headline-value-variance">${text}</span>`;
  }

  function parseNumber(str) {
    const cleaned = String(str).replace(/[^0-9.\-]/g, '');
    const val = parseFloat(cleaned);
    return isNaN(val) ? 0 : val;
  }

  function updateSliderFill(rangeEl) {
    const min = parseFloat(rangeEl.min);
    const max = parseFloat(rangeEl.max);
    const val = parseFloat(rangeEl.value);
    const pct = max > min ? ((val - min) / (max - min)) * 100 : 0;
    rangeEl.style.setProperty('--fill', pct + '%');
  }

  function bindTextAndRange(textEl, rangeEl, { isCurrency = false, isInt = false, onChange } = {}) {
    function syncFromText() {
      let val = parseNumber(textEl.value);
      if (isInt) val = Math.round(val);
      let rangeVal = val;
      if (rangeVal < parseFloat(rangeEl.min)) rangeVal = parseFloat(rangeEl.min);
      if (rangeVal > parseFloat(rangeEl.max)) rangeVal = parseFloat(rangeEl.max);
      rangeEl.value = rangeVal;
      updateSliderFill(rangeEl);
      if (onChange) onChange();
      render();
    }
    textEl.addEventListener('input', syncFromText);
    textEl.addEventListener('blur', () => {
      let val = parseNumber(textEl.value);
      if (isInt) val = Math.round(val);
      textEl.value = isCurrency ? fmtNumber(val) : val;
    });
    rangeEl.addEventListener('input', () => {
      const val = parseFloat(rangeEl.value);
      textEl.value = isCurrency ? fmtNumber(val) : val;
      updateSliderFill(rangeEl);
      if (onChange) onChange();
      render();
    });
    updateSliderFill(rangeEl);
  }

  // Future age's slider keeps its full 16-100 track (rather than moving its
  // `min` to match current age, which would shrink/shift the track as
  // current age changes) — instead, any change to either field snaps
  // future age back up to current age whenever it would end up below it,
  // so the thumb simply can't be dragged past that floor.
  function enforceAgeOrder() {
    const current = parseNumber(currentAgeInput.value);
    const future = parseNumber(futureAgeInput.value);
    if (future < current) {
      futureAgeInput.value = current;
      futureAgeRange.value = current;
      updateSliderFill(futureAgeRange);
    }
  }

  bindTextAndRange(priceInput, priceRange, { isCurrency: true });
  bindTextAndRange(currentAgeInput, currentAgeRange, { isInt: true, onChange: enforceAgeOrder });
  bindTextAndRange(futureAgeInput, futureAgeRange, { isInt: true, onChange: enforceAgeOrder });
  bindTextAndRange(returnRateInput, returnRateRange, {});
  bindTextAndRange(inflationInput, inflationRange, {});

  currencyButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      currencyButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentCurrency = btn.dataset.currency;
      priceSymbol.textContent = CURRENCY_SYMBOLS[currentCurrency];
      render();
    });
  });

  // ---------- Shareable link ----------
  // Restore any values passed via the URL (e.g. from a bookmarked or
  // shared link), falling back to the page's defaults for anything absent
  function applyUrlParams() {
    const params = new URLSearchParams(location.search);

    const currencyParam = params.get('currency');
    if (currencyParam && CURRENCY_SYMBOLS[currencyParam]) {
      currentCurrency = currencyParam;
      currencyButtons.forEach((b) => b.classList.toggle('active', b.dataset.currency === currencyParam));
      priceSymbol.textContent = CURRENCY_SYMBOLS[currentCurrency];
    }

    function setField(param, textEl, rangeEl, isCurrency, isInt) {
      if (!params.has(param)) return;
      // Mirror bindTextAndRange: clamp only the slider's own value/fill to
      // its min/max, but keep the text field (and so the real calculation)
      // at the full saved value even if it's past the slider's ceiling
      let val = parseNumber(params.get(param));
      if (isInt) val = Math.round(val);
      let rangeVal = val;
      if (rangeVal < parseFloat(rangeEl.min)) rangeVal = parseFloat(rangeEl.min);
      if (rangeVal > parseFloat(rangeEl.max)) rangeVal = parseFloat(rangeEl.max);
      rangeEl.value = rangeVal;
      textEl.value = isCurrency ? fmtNumber(val) : val;
      updateSliderFill(rangeEl);
    }

    setField('price', priceInput, priceRange, true, false);
    setField('currentAge', currentAgeInput, currentAgeRange, false, true);
    setField('futureAge', futureAgeInput, futureAgeRange, false, true);
    setField('rate', returnRateInput, returnRateRange, false, false);
    setField('inflation', inflationInput, inflationRange, false, false);
    enforceAgeOrder();
  }

  // Param order deliberately mirrors the input boxes' order on the page
  function currentParams() {
    const params = new URLSearchParams();
    params.set('currency', currentCurrency);
    params.set('price', Math.round(parseNumber(priceInput.value)));
    params.set('currentAge', Math.round(parseNumber(currentAgeInput.value)));
    params.set('futureAge', Math.round(parseNumber(futureAgeInput.value)));
    params.set('rate', parseNumber(returnRateInput.value));
    params.set('inflation', parseNumber(inflationInput.value));
    return params;
  }

  // Keep the address bar in sync so the page can be bookmarked directly,
  // without needing an extra history entry per keystroke
  function updateUrl() {
    history.replaceState(null, '', `${location.pathname}?${currentParams().toString()}`);
  }

  // Dragging a slider fires many 'input' events a second, and browsers
  // rate-limit history.replaceState — burst past the limit and further
  // calls are silently dropped, leaving the address bar stuck on a stale
  // value. Trailing-throttle it instead; since updateUrl() reads live DOM
  // state, the eventual call always flushes the current value. Copy
  // link/Share/Bookmark are unaffected either way since they build the URL
  // from live state directly, not from the address bar.
  let urlUpdateTimer = null;
  function scheduleUrlUpdate() {
    if (urlUpdateTimer) return;
    urlUpdateTimer = setTimeout(() => {
      urlUpdateTimer = null;
      updateUrl();
    }, 200);
  }

  function shareUrl() {
    return `${location.origin}${location.pathname}?${currentParams().toString()}`;
  }

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

  bookmarkBtn.addEventListener('click', () => {
    const url = shareUrl();
    const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
    const shortcut = isMac ? '⌘D' : 'Ctrl+D';
    copyToClipboard(url)
      .then(() => setStatus(`Link copied — press ${shortcut} to bookmark this page`, 5000))
      .catch(() => window.prompt(`Copy this link, then press ${shortcut} to bookmark this page:`, url));
  });

  applyUrlParams();

  // ---------- Calculation ----------
  function render() {
    const price = parseNumber(priceInput.value);
    const currentAge = Math.max(0, Math.round(parseNumber(currentAgeInput.value)));
    const futureAge = Math.max(currentAge, Math.round(parseNumber(futureAgeInput.value)));
    const annualReturn = parseNumber(returnRateInput.value) / 100;
    const inflation = parseNumber(inflationInput.value) / 100;
    const years = Math.max(0, futureAge - currentAge);

    // What this money could have grown to by your future age, had you
    // invested it instead of spending it — the opportunity cost, in
    // future (nominal) money.
    const futureValue = price * Math.pow(1 + annualReturn, years);
    // That future value brought back to today's purchasing power, so it
    // reads as a real, comparable-to-today figure rather than an inflated
    // future number.
    const realCost = futureValue / Math.pow(1 + inflation, years);

    priceOut.textContent = fmtCurrency(price);
    futureAgeOut1.textContent = futureAge;
    yearsOut1.textContent = `${years} yrs`;
    returnOut.textContent = `${parseNumber(returnRateInput.value)}%`;
    futureValueEl.innerHTML = `<span>${fmtCurrency(futureValue)}${variance(futureValue, price)}</span>`;

    priceOut2.textContent = fmtCurrency(price);
    yearsOut2.textContent = `${years} yrs`;
    inflationOut.textContent = `${parseNumber(inflationInput.value)}%`;
    realCostEl.innerHTML = `<span>${fmtCurrency(realCost)}${variance(realCost, price)}</span>`;

    let sentence;
    if (years > 0) {
      sentence = `By spending <strong>${fmtCurrency(price)}</strong> now instead of investing it, your ${futureAge} year old self is <strong>${fmtCurrency(futureValue)}</strong> worse off. This is worth <strong>${fmtCurrency(realCost)}</strong> in today&rsquo;s money.`;
    } else {
      sentence = `With no time left to grow, the true cost today is simply <strong>${fmtCurrency(price)}</strong>. Push your future age out to see what this purchase really costs your future self.`;
    }
    summarySentenceEl.innerHTML = sentence;

    drawBarChart(price, realCost);

    const series = calculateGrowthSeries(price, annualReturn, years);
    drawChart(series);

    scheduleUrlUpdate();
  }

  // ---------- Bar chart (SVG, no dependencies) ----------
  // Same two-bar comparison the Tipping Point Game uses, reusing its
  // shared .bar-chart/.bar-rect/etc classes — no "winner" here in the
  // game's sense, but the real cost is the number this whole calculator
  // exists to reveal, so it always gets the highlighted colour while
  // the purchase price sits in the neutral one, regardless of which is
  // larger.
  function drawBarChart(price, realCost) {
    barChartSvg.innerHTML = '';
    const baseline = 148;
    const maxBarHeight = 108;
    const barWidth = 74;
    const priceX = 46;
    const realCostX = 180;
    const maxVal = Math.max(price, realCost, 1);

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

    const priceH = (price / maxVal) * maxBarHeight;
    const realCostH = (realCost / maxVal) * maxBarHeight;

    addRect(priceX, priceH, 'bar-rect bar-rect-loser');
    addRect(realCostX, realCostH, 'bar-rect bar-rect-winner');

    const baseLine = document.createElementNS(SVG_NS, 'line');
    baseLine.setAttribute('x1', 20);
    baseLine.setAttribute('x2', 280);
    baseLine.setAttribute('y1', baseline);
    baseLine.setAttribute('y2', baseline);
    baseLine.setAttribute('class', 'bar-baseline');
    barChartSvg.appendChild(baseLine);

    addText(priceX + barWidth / 2, baseline - priceH - 10, fmtCurrency(price), 'bar-value-label');
    addText(realCostX + barWidth / 2, baseline - realCostH - 10, fmtCurrency(realCost), 'bar-value-label bar-value-label-winner');
    addText(priceX + barWidth / 2, baseline + 22, 'Purchase price today', 'bar-cat-label');
    addText(realCostX + barWidth / 2, baseline + 22, 'Real cost, today’s money', 'bar-cat-label');
  }

  // ---------- Chart (canvas, no dependencies) ----------
  // A single lump sum (the purchase price) left to grow untouched —
  // unlike the other calculators' charts, there's no ongoing monthly
  // contribution, so "contributed" stays flat at the price throughout.
  function calculateGrowthSeries(price, annualReturn, years) {
    const yearly = [];
    for (let y = 1; y <= years; y++) {
      const balance = price * Math.pow(1 + annualReturn, y);
      yearly.push({ year: y, contributed: price, balance, interest: balance - price });
    }
    return yearly;
  }

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

  function drawChart(yearly) {
    lastChartParams = { yearly };

    const { width, height } = setupCanvasSize();
    ctx.clearRect(0, 0, width, height);

    const principal = parseNumber(priceInput.value);
    const points = [{ year: 0, contributed: principal, interest: 0, balance: principal }, ...yearly];
    if (points.length < 2) {
      lastChartGeometry = null;
      return;
    }

    const padding = { top: 16, right: 24, bottom: 28, left: 64 };
    const plotW = width - padding.left - padding.right;
    const plotH = height - padding.top - padding.bottom;

    const maxBalance = Math.max(...points.map((p) => p.balance)) * 1.05;
    const maxYear = points[points.length - 1].year || 1;

    const xForYear = (y) => padding.left + (y / maxYear) * plotW;
    const yForVal = (v) => padding.top + plotH - (v / maxBalance) * plotH;

    const contribColor = cssVar('--contrib');
    const interestColor = cssVar('--interest');
    const textSecondary = cssVar('--text-secondary');
    const gridColor = cssVar('--card-border');

    // Grid + Y axis labels
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

    // X axis labels (years)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const maxLabels = width < 500 ? 10 : 15;
    const xLabelStep = Math.max(1, Math.ceil(maxYear / Math.max(1, maxLabels - 1)));
    for (let y = 0; y <= maxYear; y += xLabelStep) {
      ctx.fillText('Yr ' + y, xForYear(y), height - padding.bottom + 8);
    }

    // Stacked area: purchase price (bottom, flat), investment return (top)
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

    // Lines on top
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

    lastChartGeometry = { padding, plotW, plotH, maxYear, maxBalance, points, xForYear, yForVal, width, height };
  }

  canvas.addEventListener('mousemove', (e) => {
    if (!lastChartGeometry) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const { points, maxYear, padding, plotW } = lastChartGeometry;
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
      Purchase price: ${fmtCurrency(point.contributed)}<br>
      Investment return: ${fmtCurrency(point.interest)}
    `;
  });

  canvas.addEventListener('mouseleave', () => {
    tooltip.style.opacity = '0';
  });

  window.addEventListener('resize', () => {
    if (lastChartParams) drawChart(lastChartParams.yearly);
  });

  // ---------- Theme ----------
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
    render();
  });

  // ---------- Init ----------
  initTheme();
  render();
})();
