// Reads the Pantai data Google Sheet with zero API key / Google Cloud setup.
// Each tab is fetched through Google's public CSV export endpoint, which
// works for any sheet shared as "Anyone with the link" (Viewer or Editor).
// No credentials, no restrictions to configure — just a Sheet ID.

const TABS = [
  "Overview",
  "Channels",
  "AITraffic",
  "AISources",
  "Organic",
  "Keywords",
  "Conversions",
  "Purchases",
  "Competitors",
];

// Minimal RFC4180 CSV parser: handles quoted fields, embedded commas/newlines,
// and "" as an escaped quote.
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field); field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      rows.push(row); row = [];
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((cell) => cell !== ""));
}

function rowsToObjects(rows) {
  if (!rows || rows.length < 2) return [];
  const headers = rows[0];
  return rows.slice(1).map((row) => {
    const obj = {};
    headers.forEach((h, i) => {
      const raw = row[i];
      if (raw === undefined || raw === "") { obj[h] = null; return; }
      const num = Number(raw);
      obj[h] = !Number.isNaN(num) && /^-?[\d.]+$/.test(String(raw).trim()) ? num : raw;
    });
    return obj;
  });
}

async function fetchSampleData() {
  const res = await fetch("data/sample-data.json");
  if (!res.ok) throw new Error("Could not load sample data either — check data/sample-data.json exists.");
  const json = await res.json();
  window.__DASHBOARD_IS_SAMPLE__ = true;
  return json;
}

async function fetchTabCSV(sheetId, tabName) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Could not read the "${tabName}" tab (HTTP ${res.status}). ` +
      `Make sure the Sheet is shared as "Anyone with the link" and the tab name matches exactly.`
    );
  }
  const text = await res.text();
  // Google returns an HTML error page (not CSV) for a missing tab or a
  // not-shared sheet — detect that instead of trying to parse it as CSV.
  if (text.trim().startsWith("<")) {
    throw new Error(`The "${tabName}" tab isn't readable. Check the Sheet's sharing setting and tab name.`);
  }
  return rowsToObjects(parseCSV(text));
}

async function fetchDashboardData() {
  const { SHEET_ID } = window.DASHBOARD_CONFIG || {};
  if (!SHEET_ID || SHEET_ID.startsWith("REPLACE_") || SHEET_ID.startsWith("PASTE_")) {
    return fetchSampleData();
  }

  const entries = await Promise.all(
    TABS.map(async (tab) => [tab, await fetchTabCSV(SHEET_ID, tab)])
  );
  return Object.fromEntries(entries);
}

function sortByMonth(rows) {
  return [...rows].sort((a, b) => String(a.Month).localeCompare(String(b.Month)));
}

function latestMonth(rows) {
  const sorted = sortByMonth(rows);
  return sorted[sorted.length - 1] || null;
}

function previousMonth(rows) {
  const sorted = sortByMonth(rows);
  return sorted[sorted.length - 2] || null;
}

function pctChange(curr, prev) {
  if (curr == null || prev == null || prev === 0) return null;
  return ((curr - prev) / Math.abs(prev)) * 100;
}

window.SheetsData = { fetchDashboardData, sortByMonth, latestMonth, previousMonth, pctChange };
