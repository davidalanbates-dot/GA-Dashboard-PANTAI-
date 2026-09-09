// Reads the Pantai data Google Sheet via the Sheets API v4 (read-only, API key only).
// The sheet must be shared as "Anyone with the link — Viewer" for this to work,
// since a bare API key (no OAuth) can only read publicly-viewable sheets.

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

function rowsToObjects(values) {
  if (!values || values.length < 2) return [];
  const headers = values[0];
  return values.slice(1)
    .filter((row) => row.some((cell) => cell !== undefined && cell !== ""))
    .map((row) => {
      const obj = {};
      headers.forEach((h, i) => {
        const raw = row[i];
        if (raw === undefined || raw === "") { obj[h] = null; return; }
        const num = Number(raw);
        obj[h] = raw !== "" && !Number.isNaN(num) && /^-?[\d.]+$/.test(String(raw).trim())
          ? num
          : raw;
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

async function fetchDashboardData() {
  const { SHEET_ID, SHEETS_API_KEY } = window.DASHBOARD_CONFIG || {};
  const notConfigured =
    !SHEET_ID || !SHEETS_API_KEY ||
    SHEET_ID.startsWith("REPLACE_") || SHEET_ID.startsWith("PASTE_") ||
    SHEETS_API_KEY.startsWith("REPLACE_") || SHEETS_API_KEY.startsWith("PASTE_");
  if (notConfigured) {
    return fetchSampleData();
  }

  const ranges = TABS.map((t) => `ranges=${encodeURIComponent(t + "!A:Z")}`).join("&");
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values:batchGet?${ranges}&key=${SHEETS_API_KEY}`;

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Sheets API error ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = await res.json();
  const data = {};
  (json.valueRanges || []).forEach((vr, i) => {
    data[TABS[i]] = rowsToObjects(vr.values);
  });
  return data;
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
