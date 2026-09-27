// This page shows a short hand-picked list of GBP-denominated global
// tracker funds from the full Lookout — see /the-lookout-all/ (unlinked,
// not on the homepage) for every table. Both pages read the same
// data.json, fetched from GitHub's raw CDN rather than calling Twelve
// Data directly from every visitor's browser: refresh-prices.yml
// (hourly — price, all-time high, drawdown, price change over several
// lookback windows) and refresh-fundamentals.yml (weekly — P/E, dividend
// yield), since those cost far more API credits and barely change hour to
// hour. Dividend yield and P/E aren't shown on this page (removed on
// request) even though the underlying data still has them.

// GBP-denominated LSE-listed FTSE All-World trackers — three of the full
// Lookout's four entries for this index (VWRL dropped on request; see the
// comment in .github/scripts/fetch-stock-data.mjs for why these specific
// symbols). VALL (Global All Cap, not All-World) was briefly added here
// too, then removed on request — not confident in its numbers, likely
// down to it being a newly-listed fund with thin trading history (see
// the firstTradeDate comment on loadPrice in fetch-stock-data.mjs for one
// bad data point already caught and corrected). No longer fetched at all,
// since nothing displays it any more.
const INDICES_GBP = [
  { symbol: 'VWRP', name: 'FTSE All-World Vanguard (Acc)' },
  { symbol: 'FWRG', name: 'FTSE All-World Invesco (Acc)', quoteInPence: true },
  { symbol: 'FTAW', name: 'FTSE All-World iShares (Acc)' },
];

function fmtGbp(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return n.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// A couple of Indices GBP entries (flagged quoteInPence) are commonly
// quoted in pence on other sites (e.g. FWRG) and carry sub-penny precision
// from Twelve Data that whole-pound formatting rounds away. data.json
// stores these in pounds like every other index (for consistent maths), so
// this just converts back to pence for display on those specific rows.
function fmtGbx(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return `${n.toLocaleString('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}p`;
}

function fmtGbpAsPence(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return fmtGbx(n * 100);
}

function fmtPercent(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toLocaleString('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

// Drawdown is never positive, so (unlike fmtPercent) the leading "-" is
// dropped — it carries no information since every value in this column is
// already known to be a decline from the all-time high.
function fmtDrawdown(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return `${Math.abs(n).toFixed(1)}%`;
}

function fmtDays(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return n === 0 ? 'Today' : n.toLocaleString('en-US');
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "30 Jul 26, 21:05" — dd mmm yy, hh:mm (local time, 24-hour)
function fmtRefreshedAt(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = MONTH_NAMES[date.getMonth()];
  const year = String(date.getFullYear()).slice(-2);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year}, ${hours}:${minutes}`;
}

// Price fields (quote/time_series) and fundamentals fields (earnings/
// dividends) are fetched by two entirely separate scheduled runs on
// different cadences, so a symbol can legitimately have some fields present
// and others still missing — each field just renders "—" independently
// (via the fmt* helpers) rather than blanking the whole row on any gap.
// No dividend yield or P/E column on this page (removed on request) —
// dividend yield is still in data.json (the full Lookout still shows it),
// just not read here; P/E was always a static dash anyway, since these are
// ETFs with no per-share earnings to compute one from.
function renderIndexRow(index, result) {
  const row = document.getElementById(`idxgbp-${index.symbol}`);
  if (!row) return;
  const r = result || {};
  const fmt = index.quoteInPence ? fmtGbpAsPence : fmtGbp;

  row.querySelector('[data-col="ath"]').textContent = fmt(r.athPrice);
  row.querySelector('[data-col="price"]').textContent = fmt(r.price);
  row.querySelector('[data-col="vsAth"]').textContent = fmtDrawdown(r.vsAth);
  row.querySelector('[data-col="daysSinceAth"]').textContent = fmtDays(r.daysSinceAth);
  row.querySelector('[data-col="change1mo"]').textContent = fmtPercent(r.change1mo);
  row.querySelector('[data-col="change12mo"]').textContent = fmtPercent(r.change12mo);
  row.querySelector('[data-col="change3yr"]').textContent = fmtPercent(r.change3yr);
  row.querySelector('[data-col="change5yr"]').textContent = fmtPercent(r.change5yr);
}

function buildRows() {
  const tbody = document.getElementById('indexGbpTableBody');
  tbody.innerHTML = INDICES_GBP.map((index) => `
    <tr id="idxgbp-${index.symbol}">
      <td>${index.name} <span class="section-note">(${index.symbol})</span></td>
      <td data-col="ath">&hellip;</td>
      <td data-col="price">&hellip;</td>
      <td data-col="vsAth">&hellip;</td>
      <td data-col="daysSinceAth">&hellip;</td>
      <td data-col="change1mo">&hellip;</td>
      <td data-col="change12mo">&hellip;</td>
      <td data-col="change3yr">&hellip;</td>
      <td data-col="change5yr">&hellip;</td>
    </tr>
  `).join('');
}

async function init() {
  const status = document.getElementById('stockWatchStatus');
  buildRows();
  status.textContent = 'Loading…';

  try {
    // Fetched from GitHub's raw CDN rather than this site's own path — the
    // refresh workflow commits with [skip netlify] so data-only updates
    // don't burn a Netlify deploy, so the Netlify-served copy of this file
    // would otherwise only be as fresh as the last real code deploy.
    const res = await fetch('https://raw.githubusercontent.com/alanmillbrow/investing-buffalo/main/the-lookout/data.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to load data (${res.status})`);
    const data = await res.json();
    INDICES_GBP.forEach((index) => renderIndexRow(index, data.indicesGbp?.[index.symbol]));
    status.textContent = `Last refreshed ${fmtRefreshedAt(new Date(data.savedAt))}`;
  } catch (err) {
    status.textContent = `Couldn't load stock data: ${err.message}`;
  }
}

init();
