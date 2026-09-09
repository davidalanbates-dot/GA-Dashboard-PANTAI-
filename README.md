# Pantai — GA & SEO Dashboard

A live dashboard that replaces the monthly Pantai SEO & Analytics slide deck.
It's a static site — plain HTML/CSS/JS, no build step, no server — that reads
its data straight out of a Google Sheet and renders it as headline KPIs,
trend charts, and tables. Update the Sheet once a month; the dashboard picks
it up automatically on the next page load. No redeploy needed for data
updates — only if the site's code itself changes.

**Gleneagles gets its own separate dashboard/repo/Sheet later, using this one
as the template.**

## How it works

```
Google Sheet  --(Sheets API, read-only)-->  dashboard (static files on Netlify)
```

- On page load, the browser calls the Google Sheets API directly to read the
  sheet's tabs and renders the charts/cards/tables from that data.
- There is **no Google Analytics API involved** — someone (you, or whoever
  owns the monthly report) copies the numbers from GA / Search Console into
  the Sheet once a month, same as building the old slide deck, just into
  spreadsheet rows instead of slide graphics.
- Until a real API key is added, the dashboard shows **sample data** (from
  `data/sample-data.json`) so it's never a blank page — you'll see a banner
  saying so.

## Deploying

This is a **drag-and-drop deploy** — same as any plain HTML site: no build
step, no environment variables. You just need one thing set up first.

### 1. Fix the Sheet's sharing permission

The Sheet ([open it here](https://docs.google.com/spreadsheets/d/12fmna96dAMXd7Jmk5B4g-XWM6ZAtIGoxlRnqtkhcm-s/edit))
must be shared as **"Anyone with the link — Viewer"** (not Editor) — a plain
API key with no sign-in can only read Sheets that are publicly viewable, and
Viewer-only keeps randoms from editing your numbers.

Share → General access → Anyone with the link → set the role to **Viewer**.

### 2. Get a restricted Google API key

1. Go to [Google Cloud Console](https://console.cloud.google.com/) (any free
   project works).
2. **APIs & Services → Library** → search "Google Sheets API" → **Enable**.
3. **APIs & Services → Credentials → Create Credentials → API key.**
4. Click into the new key and restrict it (this matters, since the key will
   be visible in the deployed site's page source — normal for browser-side
   Google API keys, e.g. Maps embeds work the same way):
   - **Application restrictions → Websites** → add your Netlify URL once you
     know it, e.g. `https://pantai-dashboard.netlify.app/*`.
   - **API restrictions → Restrict key** → select only **Google Sheets API**.
5. Copy the key.

### 3. Add the key to the project

Open `js/config.js` in any text editor and replace the placeholder:

```js
window.DASHBOARD_CONFIG = {
  SHEET_ID: "12fmna96dAMXd7Jmk5B4g-XWM6ZAtIGoxlRnqtkhcm-s",   // already set
  SHEETS_API_KEY: "PASTE_YOUR_GOOGLE_SHEETS_API_KEY_HERE",     // <- paste your key here
};
```

Save the file. (If you'd rather not edit this yourself, send the API key to
whoever is managing this repo and they can do it for you.)

### 4. Deploy to Netlify

Same as before: download/export this project folder (containing `index.html`,
`css/`, `js/`, `data/`) and drag the whole folder onto
[app.netlify.com/drop](https://app.netlify.com/drop). That's it — no build
command, nothing else to configure.

Once it's live, go back to the API key's **Website restrictions** in Google
Cloud Console and lock it to the real Netlify domain you were given (drop
any temporary `localhost` entry).

> **Prefer zero manual re-uploads forever?** Connect this GitHub repo to
> Netlify instead (New site from Git). Since the API key already lives in
> `js/config.js`, there's still no build step or environment variables to
> configure — every future push just deploys automatically. Either approach
> works equally well; drag-and-drop just means re-dragging the folder if the
> site's code ever changes (monthly data updates never require this).

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

This is the **only** recurring task — the live site updates itself, no
redeploy required.

## Local development

Just open `index.html` directly in a browser, or serve the folder:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

With the placeholder API key still in `js/config.js`, the dashboard
automatically falls back to the bundled sample data.

## Project structure

```
index.html             Dashboard page shell
css/styles.css          Styling (light/dark aware)
js/config.js            Sheet ID + API key (edit this one file to go live)
js/sheets.js            Google Sheets API fetch + parsing (falls back to sample data)
js/charts.js            Chart.js rendering helpers
js/app.js               Orchestration: KPI cards, tables, chart wiring
data/sample-data.json   Bundled demo dataset (June 2026 figures from the deck)
netlify.toml            Netlify static-site config (security headers only)
```

## Extending this later

Ideas not in this first version, worth adding once the core dashboard is in
regular use: Users by Geolocation, Top Pages, and a Gleneagles-style toggle
if the two dashboards ever need to be viewed side by side (they're currently
kept as fully separate sites/Sheets by design).
