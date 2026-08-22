(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);

  const salaryInput = $('salary');
  const salaryRange = $('salaryRange');
  const pensionInput = $('pension');
  const pensionRange = $('pensionRange');
  const isaInput = $('isa');
  const isaRange = $('isaRange');
  const giaInput = $('gia');
  const giaRange = $('giaRange');
  const sacrificeButtons = document.querySelectorAll('.pension-mode .seg-btn');

  const baseGrossEl = $('baseGross');
  const baseTaxEl = $('baseTax');
  const baseNiEl = $('baseNi');
  const baseEngineEl = $('baseEngine');
  const baseTakeHomeEl = $('baseTakeHome');
  const baseTakeHomeMonthlyEl = $('baseTakeHomeMonthly');
  const baseTaxPercentEl = $('baseTaxPercent');
  const afterGrossEl = $('afterGross');
  const afterTaxEl = $('afterTax');
  const afterNiEl = $('afterNi');
  const afterEngineEl = $('afterEngine');
  const afterTakeHomeEl = $('afterTakeHome');
  const afterTakeHomeMonthlyEl = $('afterTakeHomeMonthly');
  const afterTaxPercentEl = $('afterTaxPercent');
  const engineTotalEl = $('engineTotal');
  const engineIncome3AnnualEl = $('engineIncome3Annual');
  const engineIncome3MonthlyEl = $('engineIncome3Monthly');
  const engineIncome4AnnualEl = $('engineIncome4Annual');
  const engineIncome4MonthlyEl = $('engineIncome4Monthly');
  const engineIncome5AnnualEl = $('engineIncome5Annual');
  const engineIncome5MonthlyEl = $('engineIncome5Monthly');
  const niEfficiencyNoteEl = $('niEfficiencyNote');
  const allocPensionEl = $('allocPension');
  const allocIsaEl = $('allocIsa');
  const allocGiaEl = $('allocGia');
  const allocTotalEl = $('allocTotal');
  const allocSpendableEl = $('allocSpendable');
  const allocPensionMonthlyEl = $('allocPensionMonthly');
  const allocIsaMonthlyEl = $('allocIsaMonthly');
  const allocGiaMonthlyEl = $('allocGiaMonthly');
  const allocTotalMonthlyEl = $('allocTotalMonthly');
  const allocSpendableMonthlyEl = $('allocSpendableMonthly');

  const pieChartEl = $('salaryPieChart');
  const pieTaxEl = $('pieTax');
  const pieNiEl = $('pieNi');
  const piePensionEl = $('piePension');
  const pieIsaEl = $('pieIsa');
  const pieGiaEl = $('pieGia');
  const pieSpendableEl = $('pieSpendable');

  const themeToggle = $('themeToggle');
  const copyLinkBtn = $('copyLinkBtn');
  const shareLinkBtn = $('shareLinkBtn');
  const bookmarkBtn = $('bookmarkBtn');
  const shareStatus = $('shareStatus');

  let isSacrifice = true;

  // ---------- Formatting helpers ----------
  // GBP only — unlike the other calculators, the thresholds this one is
  // built on (Personal Allowance, NI bands, the £20,000 ISA allowance) are
  // themselves UK-specific figures, not just a display currency choice, so
  // there's no sensible USD/EUR mode to offer.
  const fmtNumber = (n) => new Intl.NumberFormat('en-GB').format(Math.round(n));
  const fmtCurrency = (n) => '£' + fmtNumber(n);
  const fmtPercent = (n) => (n * 100).toFixed(1) + '%';
  const fmtCurrencyPercent = (n, total) => `${fmtCurrency(n)} (${total > 0 ? ((n / total) * 100).toFixed(1) : '0.0'}%)`;

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

  function bindTextAndRange(textEl, rangeEl, { isCurrency = false } = {}) {
    function syncFromText() {
      let val = parseNumber(textEl.value);
      if (val < parseFloat(rangeEl.min)) val = parseFloat(rangeEl.min);
      if (val > parseFloat(rangeEl.max)) val = parseFloat(rangeEl.max);
      rangeEl.value = val;
      updateSliderFill(rangeEl);
      render();
    }
    textEl.addEventListener('input', syncFromText);
    textEl.addEventListener('blur', () => {
      const val = parseNumber(textEl.value);
      textEl.value = isCurrency ? fmtNumber(val) : val;
    });
    rangeEl.addEventListener('input', () => {
      let val = parseFloat(rangeEl.value);
      // Ceilings like the GIA's aren't always a round multiple of the
      // slider's step (e.g. £100 increments) away from zero, so the last
      // step reachable by dragging can fall just short of "everything" —
      // snap the final stretch of the track to the exact ceiling so
      // dragging all the way to the end always invests the full amount.
      const max = parseFloat(rangeEl.max);
      const step = parseFloat(rangeEl.step) || 1;
      if (max - val < step && val !== max) {
        val = max;
        rangeEl.value = val;
      }
      textEl.value = isCurrency ? fmtNumber(val) : val;
      updateSliderFill(rangeEl);
      render();
    });
    updateSliderFill(rangeEl);
  }

  bindTextAndRange(salaryInput, salaryRange, { isCurrency: true });
  bindTextAndRange(pensionInput, pensionRange, { isCurrency: true });
  bindTextAndRange(isaInput, isaRange, { isCurrency: true });
  bindTextAndRange(giaInput, giaRange, { isCurrency: true });

  sacrificeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      sacrificeButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      isSacrifice = btn.dataset.mode === 'sacrifice';
      render();
    });
  });

  // ---------- Tax engine ----------
  // 2026/27 rates, England/Wales/Northern Ireland. Personal Allowance
  // tapers by £1 for every £2 of taxable income (a stand-in for "adjusted
  // net income" — this calculator has no other income sources to adjust
  // for) above £100,000, reaching zero at £125,140. Band edges themselves
  // (£50,270, £125,140) don't move — only how much of the 0% band survives
  // the taper does, which is why the loop below still works unmodified
  // even once personalAllowance has shrunk to 0.
  function incomeTax(taxableIncome) {
    if (taxableIncome <= 0) return 0;
    const personalAllowance = taxableIncome > 100000
      ? Math.max(0, 12570 - (taxableIncome - 100000) / 2)
      : 12570;
    const bands = [
      { from: 0, to: personalAllowance, rate: 0 },
      { from: personalAllowance, to: 50270, rate: 0.20 },
      { from: 50270, to: 125140, rate: 0.40 },
      { from: 125140, to: Infinity, rate: 0.45 },
    ];
    let tax = 0;
    for (const b of bands) {
      if (taxableIncome > b.from) {
        tax += (Math.min(taxableIncome, b.to) - b.from) * b.rate;
      }
    }
    return tax;
  }

  // Pension Annual Allowance, tapered for high earners. The taper is driven
  // by "adjusted income" — broadly, total income for the year with any
  // pension contributions added back in. With no other income sources or
  // employer pension contributions in this model (same simplification as
  // the Personal Allowance taper above), gross salary already doubles as
  // that figure: whichever method reduces the payslip (salary sacrifice,
  // or this calculator's simplified take on Relief at Source), the
  // contribution gets added straight back to arrive at adjusted income, so
  // it always nets back out to salary. Tapers by £1 for every £2 of
  // adjusted income above £260,000, down to a floor of £10,000 once it
  // reaches £360,000. (This doesn't model the separate "threshold income"
  // test that can spare someone from the taper — a niche case for this
  // calculator's scope of a single salary with no other income.)
  function annualAllowance(salary) {
    if (salary <= 260000) return 60000;
    return Math.max(10000, 60000 - (salary - 260000) / 2);
  }

  // Employee Class 1 NI — same Primary Threshold as the Personal Allowance
  // and same Upper Earnings Limit as the higher-rate threshold, by design.
  function nationalInsurance(niableIncome) {
    if (niableIncome <= 0) return 0;
    const PT = 12570;
    const UEL = 50270;
    let ni = 0;
    if (niableIncome > PT) ni += (Math.min(niableIncome, UEL) - PT) * 0.08;
    if (niableIncome > UEL) ni += (niableIncome - UEL) * 0.02;
    return ni;
  }

  // Income tax relief on a pension contribution applies regardless of how
  // it's paid — only whether National Insurance is also calculated on the
  // reduced figure depends on the method: salary sacrifice contractually
  // reduces the salary itself (so NI drops too), while a normal payroll
  // deduction only reduces what's taxable, not what's NI-able. Either way,
  // the contribution itself never reaches the employee's take home pay, so
  // one formula covers both — only the NI base (and so the NI figure)
  // differs between the two.
  function computeScenario(gross, pensionContribution, sacrifice) {
    const taxableIncome = Math.max(0, gross - pensionContribution);
    const niableIncome = sacrifice ? taxableIncome : gross;
    const tax = incomeTax(taxableIncome);
    const ni = nationalInsurance(niableIncome);
    const takeHome = gross - pensionContribution - tax - ni;
    return { tax, ni, takeHome };
  }

  // ---------- Shareable link ----------
  function applyUrlParams() {
    const params = new URLSearchParams(location.search);

    function setField(param, textEl, rangeEl) {
      if (!params.has(param)) return;
      const val = parseNumber(params.get(param));
      let rangeVal = val;
      if (rangeVal < parseFloat(rangeEl.min)) rangeVal = parseFloat(rangeEl.min);
      if (rangeVal > parseFloat(rangeEl.max)) rangeVal = parseFloat(rangeEl.max);
      rangeEl.value = rangeVal;
      textEl.value = fmtNumber(val);
      updateSliderFill(rangeEl);
    }

    setField('income', salaryInput, salaryRange);
    setField('pension', pensionInput, pensionRange);
    setField('isa', isaInput, isaRange);

    const modeParam = params.get('mode');
    if (modeParam === 'sacrifice' || modeParam === 'none') {
      isSacrifice = modeParam === 'sacrifice';
      sacrificeButtons.forEach((b) => b.classList.toggle('active', b.dataset.mode === modeParam));
    }

    // GIA's real ceiling isn't known until render() computes it from the
    // other fields, so just stash the requested value here — render()
    // clamps it against the true max on the next pass, same as pension/ISA
    // above.
    if (params.has('gia')) {
      const val = parseNumber(params.get('gia'));
      giaInput.value = fmtNumber(val);
      giaRange.value = val; // clamped for real once render() knows the true ceiling
    }
  }

  function currentParams() {
    const params = new URLSearchParams();
    params.set('income', Math.round(parseNumber(salaryInput.value)));
    params.set('mode', isSacrifice ? 'sacrifice' : 'none');
    params.set('pension', Math.round(parseNumber(pensionInput.value)));
    params.set('isa', Math.round(parseNumber(isaInput.value)));
    params.set('gia', Math.round(parseNumber(giaInput.value)));
    return params;
  }

  function updateUrl() {
    history.replaceState(null, '', `${location.pathname}?${currentParams().toString()}`);
  }

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

  // ---------- Salary breakdown pie ----------
  const PIE_LABELS = {
    tax: 'Income tax',
    ni: 'National Insurance',
    pension: 'Pension',
    isa: 'ISA',
    gia: 'GIA',
    spendable: 'Spendable cash',
  };
  const SVG_NS = 'http://www.w3.org/2000/svg';

  function polarPoint(cx, cy, r, angleDeg) {
    // 0° = 12 o'clock, sweeping clockwise, matching how the slices are laid
    // out below (rather than SVG's default 0° = 3 o'clock).
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  // Standard "moveto centre, lineto edge, arc, close" wedge path — plus a
  // fallback for the edge case a single category holds 100% of the salary,
  // where start and end angle coincide and a normal wedge path degenerates
  // to nothing. Two half-arcs draw a full disc in that case instead.
  function describeSlice(cx, cy, r, startAngle, endAngle) {
    if (endAngle - startAngle >= 359.99) {
      const mid = startAngle + 180;
      const p1 = polarPoint(cx, cy, r, startAngle);
      const pMid = polarPoint(cx, cy, r, mid);
      const p2 = polarPoint(cx, cy, r, endAngle);
      return `M ${p1.x} ${p1.y} A ${r} ${r} 0 1 1 ${pMid.x} ${pMid.y} A ${r} ${r} 0 1 1 ${p2.x} ${p2.y} Z`;
    }
    const start = polarPoint(cx, cy, r, startAngle);
    const end = polarPoint(cx, cy, r, endAngle);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
  }

  // slices go round the pie in the same Tax&NI / Engine / Spendable order
  // as the legend, so each group forms a contiguous arc — the grouping
  // reads from position as well as shared colour family.
  function drawPieChart(total, slices) {
    pieChartEl.innerHTML = '';
    const cx = 100, cy = 100, r = 96;
    if (total <= 0) return;
    let angle = 0;
    slices.forEach(({ key, amount }) => {
      if (amount <= 0) return;
      const sweep = (amount / total) * 360;
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', describeSlice(cx, cy, r, angle, angle + sweep));
      path.setAttribute('class', `slice-${key}`);
      const title = document.createElementNS(SVG_NS, 'title');
      title.textContent = `${PIE_LABELS[key]}: ${fmtCurrencyPercent(amount, total)}`;
      path.appendChild(title);
      pieChartEl.appendChild(path);
      angle += sweep;
    });
  }

  // ---------- Render ----------
  // Ceilings cascade one way — salary bounds pension, pension (plus salary
  // sacrifice mode) bounds ISA, and ISA bounds GIA — so this recomputes
  // them top to bottom on every change rather than each field trying to
  // track its own dependency separately. A value that no longer fits its
  // new ceiling is clamped down (same pattern as e.g. Freedom Runway's
  // minimum-liquid-assets field); a ceiling that grows back never yanks a
  // value the user deliberately lowered back up.
  function render() {
    const salary = parseNumber(salaryInput.value);

    const pensionMax = Math.min(salary, annualAllowance(salary));
    pensionRange.max = pensionMax;
    let pension = Math.min(parseNumber(pensionInput.value), pensionMax);
    if (pension !== parseNumber(pensionInput.value)) {
      pensionInput.value = fmtNumber(pension);
      pensionRange.value = pension;
    }
    updateSliderFill(pensionRange);

    const scenario = computeScenario(salary, pension, isSacrifice);
    const takeHomeBeforeIsaGia = Math.max(0, scenario.takeHome);

    const isaMax = Math.min(20000, takeHomeBeforeIsaGia);
    isaRange.max = isaMax;
    let isa = Math.min(parseNumber(isaInput.value), isaMax);
    if (isa !== parseNumber(isaInput.value)) {
      isaInput.value = fmtNumber(isa);
      isaRange.value = isa;
    }
    updateSliderFill(isaRange);

    const giaMax = Math.max(0, takeHomeBeforeIsaGia - isa);
    giaRange.max = giaMax;
    let gia = Math.min(parseNumber(giaInput.value), giaMax);
    if (gia !== parseNumber(giaInput.value)) {
      giaInput.value = fmtNumber(gia);
      giaRange.value = gia;
    }
    updateSliderFill(giaRange);

    const spendable = Math.max(0, takeHomeBeforeIsaGia - isa - gia);
    const engineTotal = pension + isa + gia;

    drawPieChart(salary, [
      { key: 'tax', amount: scenario.tax },
      { key: 'ni', amount: scenario.ni },
      { key: 'pension', amount: pension },
      { key: 'isa', amount: isa },
      { key: 'gia', amount: gia },
      { key: 'spendable', amount: spendable },
    ]);
    pieTaxEl.textContent = fmtCurrencyPercent(scenario.tax, salary);
    pieNiEl.textContent = fmtCurrencyPercent(scenario.ni, salary);
    piePensionEl.textContent = fmtCurrencyPercent(pension, salary);
    pieIsaEl.textContent = fmtCurrencyPercent(isa, salary);
    pieGiaEl.textContent = fmtCurrencyPercent(gia, salary);
    pieSpendableEl.textContent = fmtCurrencyPercent(spendable, salary);

    // Baseline: same salary and salary-sacrifice mode, but no pension/ISA/
    // GIA contributions at all — the "what if you didn't invest anything"
    // comparison column.
    const baseline = computeScenario(salary, 0, isSacrifice);

    baseGrossEl.textContent = fmtCurrency(salary);
    baseTaxEl.textContent = fmtCurrency(baseline.tax);
    baseNiEl.textContent = fmtCurrency(baseline.ni);
    baseEngineEl.textContent = fmtCurrency(0);
    baseTakeHomeEl.textContent = fmtCurrency(baseline.takeHome);
    baseTakeHomeMonthlyEl.textContent = fmtCurrency(baseline.takeHome / 12);
    baseTaxPercentEl.textContent = salary > 0 ? fmtPercent((baseline.tax + baseline.ni) / salary) : '0%';

    afterGrossEl.textContent = fmtCurrency(salary);
    afterTaxEl.textContent = fmtCurrency(scenario.tax);
    afterNiEl.textContent = fmtCurrency(scenario.ni);
    afterEngineEl.textContent = fmtCurrency(engineTotal);
    afterTakeHomeEl.textContent = fmtCurrency(spendable);
    afterTakeHomeMonthlyEl.textContent = fmtCurrency(spendable / 12);
    afterTaxPercentEl.textContent = salary > 0 ? fmtPercent((scenario.tax + scenario.ni) / salary) : '0%';

    engineTotalEl.textContent = fmtCurrency(engineTotal);

    // Forever income — what this year's contribution to the investment
    // engine could sustainably pay out every year if invested and never
    // touched again, using the same 3%/4%/5% safe withdrawal rate rules
    // as the other calculators (e.g. Liquid Asset Forecaster).
    engineIncome3AnnualEl.textContent = fmtCurrency(engineTotal * 0.03);
    engineIncome3MonthlyEl.textContent = fmtCurrency((engineTotal * 0.03) / 12);
    engineIncome4AnnualEl.textContent = fmtCurrency(engineTotal * 0.04);
    engineIncome4MonthlyEl.textContent = fmtCurrency((engineTotal * 0.04) / 12);
    engineIncome5AnnualEl.textContent = fmtCurrency(engineTotal * 0.05);
    engineIncome5MonthlyEl.textContent = fmtCurrency((engineTotal * 0.05) / 12);

    allocPensionEl.textContent = fmtCurrency(pension);
    allocIsaEl.textContent = fmtCurrency(isa);
    allocGiaEl.textContent = fmtCurrency(gia);
    allocTotalEl.textContent = fmtCurrency(engineTotal);
    allocSpendableEl.textContent = fmtCurrency(spendable);
    allocPensionMonthlyEl.textContent = fmtCurrency(pension / 12);
    allocIsaMonthlyEl.textContent = fmtCurrency(isa / 12);
    allocGiaMonthlyEl.textContent = fmtCurrency(gia / 12);
    allocTotalMonthlyEl.textContent = fmtCurrency(engineTotal / 12);
    allocSpendableMonthlyEl.textContent = fmtCurrency(spendable / 12);

    // NI efficiency note — always compares both methods at the *current*
    // pension contribution, regardless of which mode is actually selected,
    // so switching the toggle to see the number change isn't required to
    // know what sacrifice would be worth.
    const niWithSacrifice = computeScenario(salary, pension, true).ni;
    const niWithoutSacrifice = computeScenario(salary, pension, false).ni;
    const niSaving = Math.max(0, niWithoutSacrifice - niWithSacrifice);
    niEfficiencyNoteEl.innerHTML = pension > 0
      ? `Using salary sacrifice for a <strong>${fmtCurrency(pension)}</strong> pension contribution saves you <strong>${fmtCurrency(niSaving)}</strong> a year in National Insurance, compared to Not salary sacrifice for the same amount.`
      : `Add a pension contribution above to see how much National Insurance salary sacrifice would save you.`;

    scheduleUrlUpdate();
  }

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

  initTheme();
  render();
})();
