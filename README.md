# Pantai — GA & SEO Dashboard

A live dashboard that replaces the monthly Pantai SEO & Analytics slide deck.
It's a static site — no backend, no server — that reads its data straight out
of a Google Sheet and renders it as headline KPIs, trend charts, and tables.
Update the Sheet once a month; the dashboard picks it up automatically on the
next page load.

**Gleneagles gets its own separate dashboard/repo/Sheet later, using this one
as the template.**

## How it works

```
Google Sheet  --(Sheets API, read-only)-->  dashboard (static site on Netlify)
```

- The dashboard is plain HTML/CSS/JS — no build framework, no npm dependencies.
- On page load, the browser calls the Google Sheets API directly to read the
  sheet's tabs and renders the charts/cards/tables from that data.
- There is **no Google Analytics API involved** — someone (you, or whoever
  owns the monthly report) copies the numbers from GA / Search Console into
  the Sheet once a month, same as building the old slide deck, just into
  spreadsheet rows instead of slide graphics.
- Until a real Sheet is connected, the dashboard shows **sample data** (from
  `data/sample-data.json`, seeded with the June 2026 numbers from the current
  deck) so it's never a blank page — you'll see a banner saying so.

## One-time setup

You need two things: the Google Sheet, and a restricted Google API key. Both
are one-time setup; after that, the only recurring work is filling in the
Sheet each month.

### 1. Get the data Sheet into Google Sheets

I generated a starter workbook with all the right tabs and June 2026's data
already filled in: **`Pantai_GA_Dashboard_Data.xlsx`** (sent separately in
this conversation).

1. Upload it to Google Drive (drag the file into [drive.google.com](https://drive.google.com)).
2. Right-click the uploaded file → **Open with → Google Sheets** (this converts
   it into a native Google Sheet — the tabs and data carry over).
3. Rename it if you like, then go to **Share → General access → Anyone with
   the link → Viewer**. This step is required — a plain API key (no sign-in)
   can only read Sheets that are publicly viewable. It's read-only access to
   traffic/SEO numbers that already appear in the monthly report, so this is
   a reasonable trade-off for zero-maintenance auth.
4. Copy the Sheet's ID out of its URL:
   `https://docs.google.com/spreadsheets/d/`**`THIS_PART_IS_THE_ID`**`/edit`

The sheet's own **"Read Me"** tab documents what to enter in each tab every
month.

### 2. Create a restricted Google API key

1. Go to [Google Cloud Console](https://console.cloud.google.com/) (create a
   free project if you don't have one already).
2. **APIs & Services → Library** → search "Google Sheets API" → **Enable**.
3. **APIs & Services → Credentials → Create Credentials → API key.**
4. Click into the new key and restrict it — this matters, since the key will
   be visible in the deployed site's page source (normal for browser-side
   Google API keys, e.g. Maps embeds work the same way):
   - **Application restrictions → Websites** → add your Netlify URL, e.g.
     `https://pantai-dashboard.netlify.app/*` (add it again once you know the
     final Netlify domain; you can use `localhost/*` temporarily for testing).
   - **API restrictions → Restrict key** → select only **Google Sheets API**.
5. Copy the key.

### 3. Deploy to Netlify

1. Push this repo to GitHub (or connect it directly) and create a new site
   on [Netlify](https://app.netlify.com/) from it. Netlify will detect
   `netlify.toml` automatically — build command `node build.js`, publish
   directory `.`.
2. In **Site settings → Environment variables**, add:
   | Key | Value |
   |---|---|
   | `PANTAI_SHEET_ID` | the Sheet ID from step 1.4 |
   | `GOOGLE_SHEETS_API_KEY` | the API key from step 2.5 |
3. Trigger a deploy (or push a commit). `build.js` writes these into
   `js/config.js` at build time — this file is gitignored, so the key never
   lives in your repo history.
4. Once deployed, go back to the API key's **Website restrictions** in Google
   Cloud Console and set the real Netlify domain (drop `localhost` unless
   you still need it for local testing).

That's it — the dashboard is now live and will reflect whatever is in the
Sheet, refreshed every time someone loads the page.

## Monthly maintenance

Open the Sheet, go to the **Read Me** tab for the exact column list, and add
one new row (or set of rows) per tab for the new month:

| Tab | What to add |
|---|---|
| `Overview` | Sessions, Users, Pageviews, Avg Session Duration, Views/Session, Engagement Rate |
| `Channels` | One row per traffic channel |
| `AITraffic` | Headline AI-channel Sessions/Users/Bookings |
| `AISources` | One row per AI platform (ChatGPT, Gemini, Perplexity, Copilot, Claude…) |
| `Organic` | Organic Impressions (Search Console) + Organic Sessions (GA) |
| `Keywords` | Top 10 branded + top 10 unbranded queries |
| `Conversions` | Total/Organic Conversions, Appointments, Enquiries |
| `Purchases` | Items Purchased, Revenue, and the organic-only equivalents |
| `Competitors` | One row per competitor (Pantai, Gleneagles, PCMC, Sunway Medical, KPJ, SJMC, Beacon) |

Always use `YYYY-MM` for the Month column so charts sort correctly. Don't
rename tabs or header columns — the dashboard reads them by exact name.

## Local development

```bash
# generate js/config.js from env vars (or leave unset to use sample data)
PANTAI_SHEET_ID=... GOOGLE_SHEETS_API_KEY=... node build.js

# serve the static site
python3 -m http.server 8000
# then open http://localhost:8000
```

With no env vars set, `build.js` writes placeholder values and the dashboard
falls back to the bundled sample data automatically.

## Project structure

```
index.html          Dashboard page shell
css/styles.css       Styling (light/dark aware)
js/sheets.js         Google Sheets API fetch + parsing (falls back to sample data)
js/charts.js         Chart.js rendering helpers
js/app.js            Orchestration: KPI cards, tables, chart wiring
data/sample-data.json  Bundled demo dataset (June 2026 figures from the deck)
build.js             Netlify build step: writes js/config.js from env vars
netlify.toml         Netlify build configuration
```

## Extending this later

Ideas not in this first version, worth adding once the core dashboard is in
regular use: Users by Geolocation, Top Pages, and a Gleneagles-style toggle
if the two dashboards ever need to be viewed side by side (they're currently
kept as fully separate sites/Sheets by design).
