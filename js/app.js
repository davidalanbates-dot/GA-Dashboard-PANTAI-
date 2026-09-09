const {
  fetchDashboardData: loadDashboardData,
  sortByMonth: sortRowsByMonth,
  pctChange: computePctChange,
} = window.SheetsData;
const { lineChart: renderLineChart, barChart: renderBarChart, cssVar: themeVar } = window.DashCharts;

const fmt = {
  int: (n) => (n == null ? "—" : Math.round(n).toLocaleString("en-US")),
  num: (n, d = 2) => (n == null ? "—" : Number(n).toLocaleString("en-US", { maximumFractionDigits: d })),
  pct: (n, d = 1) => (n == null ? "—" : `${Number(n).toLocaleString("en-US", { maximumFractionDigits: d })}%`),
  rm: (n) => (n == null ? "—" : `RM ${Math.round(n).toLocaleString("en-US")}`),
  dur: (sec) => {
    if (sec == null) return "—";
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  },
  month: (m) => {
    if (!m) return "—";
    const [y, mo] = String(m).split("-");
    const d = new Date(Number(y), Number(mo) - 1, 1);
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  },
};

function deltaEl(pct, invert = false) {
  if (pct == null || Number.isNaN(pct)) return `<span class="delta flat">—</span>`;
  const good = invert ? pct <= 0 : pct >= 0;
  const cls = Math.abs(pct) < 0.05 ? "flat" : good ? "up" : "down";
  const arrow = pct > 0 ? "▲" : pct < 0 ? "▼" : "•";
  return `<span class="delta ${cls}">${arrow} ${fmt.pct(Math.abs(pct))} vs prior month</span>`;
}

function kpiCard(label, value, deltaPct, invert = false) {
  return `
    <div class="kpi-card">
      <div class="label">${label}</div>
      <div class="value">${value}</div>
      ${deltaEl(deltaPct, invert)}
    </div>`;
}

function rowsAtMonth(rows, month) {
  return rows.filter((r) => r.Month === month);
}

function monthsOf(rows) {
  return [...new Set(rows.map((r) => r.Month))].filter(Boolean);
}

function setStatus(msg, isError = false) {
  const el = document.getElementById("status-banner");
  if (!msg) { el.className = "status-banner"; el.textContent = ""; return; }
  el.textContent = msg;
  el.className = "status-banner show" + (isError ? " error" : "");
}

function populateMonthSelect(months, selected, onChange) {
  const sel = document.getElementById("month-select");
  sel.innerHTML = months
    .slice()
    .sort()
    .reverse()
    .map((m) => `<option value="${m}" ${m === selected ? "selected" : ""}>${fmt.month(m)}</option>`)
    .join("");
  sel.onchange = () => onChange(sel.value);
}

function render(data, month) {
  renderOverview(data.Overview, month);
  renderChannels(data.Channels, month);
  renderAITraffic(data.AITraffic, data.AISources, month);
  renderOrganic(data.Organic, month);
  renderKeywords(data.Keywords, month);
  renderConversions(data.Conversions, month);
  renderPurchases(data.Purchases, month);
  renderCompetitors(data.Competitors, month);
}

// ---------- Overview ----------
function renderOverview(rows, month) {
  const sorted = sortRowsByMonth(rows);
  const idx = sorted.findIndex((r) => r.Month === month);
  const curr = sorted[idx];
  const prev = sorted[idx - 1];
  const el = document.getElementById("overview-kpis");
  if (!curr) { el.innerHTML = `<div class="skeleton">No Overview data for this month.</div>`; return; }
  el.innerHTML = [
    kpiCard("Sessions", fmt.int(curr.Sessions), computePctChange(curr.Sessions, prev?.Sessions)),
    kpiCard("Users", fmt.int(curr.Users), computePctChange(curr.Users, prev?.Users)),
    kpiCard("Pageviews", fmt.int(curr.Pageviews), computePctChange(curr.Pageviews, prev?.Pageviews)),
    kpiCard("Avg Session Duration", fmt.dur(curr.AvgSessionDurationSec), computePctChange(curr.AvgSessionDurationSec, prev?.AvgSessionDurationSec)),
    kpiCard("Views / Session", fmt.num(curr.ViewsPerSession), computePctChange(curr.ViewsPerSession, prev?.ViewsPerSession)),
    kpiCard("Engagement Rate", fmt.pct(curr.EngagementRatePct), computePctChange(curr.EngagementRatePct, prev?.EngagementRatePct)),
  ].join("");
}

// ---------- Channels ----------
let channelsChart;
function renderChannels(rows, month) {
  const atMonth = rowsAtMonth(rows, month).sort((a, b) => b.Sessions - a.Sessions);
  const holder = document.getElementById("channels-chart");
  if (channelsChart) channelsChart.destroy();
  if (!atMonth.length) { holder.parentElement.querySelector(".chart-holder").innerHTML = `<div class="skeleton">No channel data for this month.</div>`; }
  else {
    const colors = atMonth.map((_, i) => themeVar(`--series-${(i % 8) + 1}`));
    channelsChart = renderBarChart(holder, {
      labels: atMonth.map((r) => r.Channel),
      data: atMonth.map((r) => r.Sessions),
      colors,
      valueFormatter: (v) => `${fmt.int(v)} sessions`,
    });
  }

  const tbody = document.getElementById("channels-table-body");
  tbody.innerHTML = atMonth.map((r) => `
    <tr>
      <td>${r.Channel}</td>
      <td>${fmt.int(r.Sessions)}</td>
      <td>${fmt.int(r.Users)}</td>
      <td>${fmt.pct(r.EngagementRatePct)}</td>
      <td>${fmt.dur(r.SessionDurationSec)}</td>
    </tr>`).join("") || `<tr><td colspan="5" class="skeleton">No data</td></tr>`;
}

// ---------- AI Traffic ----------
let aiTrendChart, aiSourcesChart;
function renderAITraffic(aiRows, sourceRows, month) {
  const sorted = sortRowsByMonth(aiRows);
  const idx = sorted.findIndex((r) => r.Month === month);
  const curr = sorted[idx];
  const prev = sorted[idx - 1];
  const el = document.getElementById("ai-kpis");
  el.innerHTML = curr ? [
    kpiCard("AI Sessions", fmt.int(curr.AISessions), computePctChange(curr.AISessions, prev?.AISessions)),
    kpiCard("AI Users", fmt.int(curr.AIUsers), computePctChange(curr.AIUsers, prev?.AIUsers)),
    kpiCard("AI Bookings", fmt.int(curr.AIBookings), computePctChange(curr.AIBookings, prev?.AIBookings)),
    kpiCard("Avg Session Duration", fmt.dur(curr.AIAvgSessionDurationSec), computePctChange(curr.AIAvgSessionDurationSec, prev?.AIAvgSessionDurationSec)),
  ].join("") : `<div class="skeleton">No AI traffic data for this month.</div>`;

  const trendCanvas = document.getElementById("ai-trend-chart");
  if (aiTrendChart) aiTrendChart.destroy();
  aiTrendChart = renderLineChart(trendCanvas, {
    labels: sorted.map((r) => fmt.month(r.Month)),
    datasets: [{ label: "AI Sessions", data: sorted.map((r) => r.AISessions) }],
    showLegend: false,
  });

  const atMonth = rowsAtMonth(sourceRows, month).sort((a, b) => b.Sessions - a.Sessions);
  const srcCanvas = document.getElementById("ai-sources-chart");
  if (aiSourcesChart) aiSourcesChart.destroy();
  if (atMonth.length) {
    const colors = atMonth.map((_, i) => themeVar(`--series-${(i % 8) + 1}`));
    aiSourcesChart = renderBarChart(srcCanvas, {
      labels: atMonth.map((r) => r.Source),
      data: atMonth.map((r) => r.Sessions),
      colors,
      horizontal: true,
      valueFormatter: (v) => `${fmt.int(v)} sessions`,
    });
  }
}

// ---------- Organic ----------
let organicImpChart, organicSessChart;
function renderOrganic(rows, month) {
  const sorted = sortRowsByMonth(rows);
  const idx = sorted.findIndex((r) => r.Month === month);
  const curr = sorted[idx];
  const prev = sorted[idx - 1];
  const el = document.getElementById("organic-kpis");
  el.innerHTML = curr ? [
    kpiCard("Organic Impressions", fmt.int(curr.OrganicImpressions), computePctChange(curr.OrganicImpressions, prev?.OrganicImpressions)),
    kpiCard("Organic Sessions", fmt.int(curr.OrganicSessions), computePctChange(curr.OrganicSessions, prev?.OrganicSessions)),
  ].join("") : `<div class="skeleton">No organic data for this month.</div>`;

  const impCanvas = document.getElementById("organic-impressions-chart");
  if (organicImpChart) organicImpChart.destroy();
  organicImpChart = renderLineChart(impCanvas, {
    labels: sorted.map((r) => fmt.month(r.Month)),
    datasets: [{ label: "Impressions", data: sorted.map((r) => r.OrganicImpressions) }],
    showLegend: false,
  });

  const sessCanvas = document.getElementById("organic-sessions-chart");
  if (organicSessChart) organicSessChart.destroy();
  organicSessChart = renderLineChart(sessCanvas, {
    labels: sorted.map((r) => fmt.month(r.Month)),
    datasets: [{ label: "Sessions", data: sorted.map((r) => r.OrganicSessions), color: themeVar("--series-3") }],
    showLegend: false,
  });
}

// ---------- Keywords ----------
function renderKeywords(rows, month) {
  const atMonth = rowsAtMonth(rows, month);
  const branded = atMonth.filter((r) => r.Type === "Branded").sort((a, b) => b.Clicks - a.Clicks);
  const unbranded = atMonth.filter((r) => r.Type === "Unbranded").sort((a, b) => b.Clicks - a.Clicks);

  const fillTable = (id, list) => {
    document.getElementById(id).innerHTML = list.map((r) => `
      <tr>
        <td>${r.Keyword}</td>
        <td>${fmt.int(r.Clicks)}</td>
        <td>${fmt.int(r.Impressions)}</td>
        <td>${fmt.num(r.Position, 2)}</td>
      </tr>`).join("") || `<tr><td colspan="4" class="skeleton">No data</td></tr>`;
  };
  fillTable("branded-keywords-body", branded);
  fillTable("unbranded-keywords-body", unbranded);
}

// ---------- Conversions ----------
let conversionsChart;
function renderConversions(rows, month) {
  const sorted = sortRowsByMonth(rows);
  const idx = sorted.findIndex((r) => r.Month === month);
  const curr = sorted[idx];
  const prev = sorted[idx - 1];
  const el = document.getElementById("conversions-kpis");
  el.innerHTML = curr ? [
    kpiCard("Total Conversions", fmt.int(curr.TotalConversions), computePctChange(curr.TotalConversions, prev?.TotalConversions)),
    kpiCard("Appointments", fmt.int(curr.Appointments), computePctChange(curr.Appointments, prev?.Appointments)),
    kpiCard("Enquiries", fmt.int(curr.Enquiries), computePctChange(curr.Enquiries, prev?.Enquiries)),
    kpiCard("Organic Conversions", fmt.int(curr.OrganicConversions), computePctChange(curr.OrganicConversions, prev?.OrganicConversions)),
  ].join("") : `<div class="skeleton">No conversions data for this month.</div>`;

  const canvas = document.getElementById("conversions-trend-chart");
  if (conversionsChart) conversionsChart.destroy();
  conversionsChart = renderLineChart(canvas, {
    labels: sorted.map((r) => fmt.month(r.Month)),
    datasets: [
      { label: "Total Conversions", data: sorted.map((r) => r.TotalConversions) },
      { label: "Organic Conversions", data: sorted.map((r) => r.OrganicConversions), color: themeVar("--series-3") },
    ],
  });
}

// ---------- Purchases ----------
function renderPurchases(rows, month) {
  const sorted = sortRowsByMonth(rows);
  const idx = sorted.findIndex((r) => r.Month === month);
  const curr = sorted[idx];
  const prev = sorted[idx - 1];
  const el = document.getElementById("purchases-kpis");
  el.innerHTML = curr ? [
    kpiCard("Items Purchased", fmt.int(curr.ItemsPurchased), computePctChange(curr.ItemsPurchased, prev?.ItemsPurchased)),
    kpiCard("Revenue", fmt.rm(curr.RevenueRM), computePctChange(curr.RevenueRM, prev?.RevenueRM)),
    kpiCard("Organic Items Purchased", fmt.int(curr.OrganicItemsPurchased), computePctChange(curr.OrganicItemsPurchased, prev?.OrganicItemsPurchased)),
    kpiCard("Organic Revenue", fmt.rm(curr.OrganicRevenueRM), computePctChange(curr.OrganicRevenueRM, prev?.OrganicRevenueRM)),
  ].join("") : `<div class="skeleton">No purchases data for this month.</div>`;
}

// ---------- Competitors ----------
const COMPETITOR_METRICS = [
  { key: "SEOScore", label: "SEO Audit Score" },
  { key: "DomainAuthority", label: "Domain Authority" },
  { key: "AIVisibility", label: "AI Visibility" },
  { key: "AISearchHealth", label: "AI Search Health" },
  { key: "AIOAuditScore", label: "AIO Audit Score" },
];
const competitorCharts = {};
function renderCompetitors(rows, month) {
  const atMonth = rowsAtMonth(rows, month);
  const holder = document.getElementById("competitors-grid");
  if (!atMonth.length) { holder.innerHTML = `<div class="skeleton">No competitor data for this month.</div>`; return; }
  holder.innerHTML = COMPETITOR_METRICS.map((m) => `
    <div class="card">
      <h3>${m.label}</h3>
      <div class="chart-holder"><canvas id="comp-chart-${m.key}"></canvas></div>
    </div>`).join("");

  COMPETITOR_METRICS.forEach((m) => {
    const sorted = [...atMonth].filter((r) => r[m.key] != null).sort((a, b) => b[m.key] - a[m.key]);
    const colors = sorted.map((r) => (r.Competitor === "Pantai" ? themeVar("--series-1") : themeVar("--text-muted")));
    const canvas = document.getElementById(`comp-chart-${m.key}`);
    if (competitorCharts[m.key]) competitorCharts[m.key].destroy();
    competitorCharts[m.key] = renderBarChart(canvas, {
      labels: sorted.map((r) => r.Competitor),
      data: sorted.map((r) => r[m.key]),
      colors,
      horizontal: true,
    });
  });
}

// ---------- Boot ----------
async function boot() {
  setStatus("Loading live data from Google Sheets…");
  try {
    const data = await loadDashboardData();
    if (window.__DASHBOARD_IS_SAMPLE__) {
      setStatus("Showing sample data — connect your Google Sheet (see README.md) to go live.");
    } else {
      setStatus("");
    }
    const months = monthsOf(data.Overview);
    if (!months.length) {
      setStatus("Connected to the sheet, but the Overview tab has no rows yet. Add a month to get started.", true);
      return;
    }
    const latest = [...months].sort().pop();
    populateMonthSelect(months, latest, (m) => render(data, m));
    render(data, latest);
    document.getElementById("last-updated").textContent = `Data as of ${fmt.month(latest)} · refreshed on page load`;
  } catch (err) {
    console.error(err);
    setStatus(`Could not load dashboard data: ${err.message}`, true);
  }
}

boot();
