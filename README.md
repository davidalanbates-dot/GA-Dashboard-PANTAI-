# Pantai — GA & SEO Dashboard

A live dashboard that replaces the monthly Pantai SEO & Analytics slide deck.
It's a static site — plain HTML/CSS/JS, no build step, no server, no API key
— that reads its data straight out of a Google Sheet and renders it as
headline KPIs, trend charts, and tables. Update the Sheet once a month; the
dashboard picks it up automatically on the next page load.

**Gleneagles gets its own separate dashboard/repo/Sheet later, using this one
as the template.**

## How it works

```
Google Sheet  --(public CSV export link, no key needed)-->  dashboard (static files on Netlify)
```

- On page load, the browser reads each tab of the Sheet through Google's
  built-in CSV export link — the same mechanism as "File → Publish to web."
  No Google Cloud account, no API key, no setup beyond sharing the Sheet.
- There is **no Google Analytics API involved** — someone (you, or whoever
  owns the monthly report) copies the numbers from GA / Search Console into
  the Sheet once a month, same as building the old slide deck, just into
  spreadsheet rows instead of slide graphics.
- Until the Sheet is reachable, the dashboard shows **sample data** (from
  `data/sample-data.json`) so it's never a blank page.

## Deploying

Nothing to set up — the Sheet is already shared link-accessible, and the
Sheet ID is already filled in at `js/config.js`. It's a plain drag-and-drop
deploy, same as any static site.

(Optional, not required: since the dashboard only ever reads the Sheet, you
could tighten Share → General access from "Editor" to "Viewer" so a stray
link can't be used to edit your numbers. Skip this if you'd rather not touch
permissions at all — the dashboard works either way.)

### Deploy to Netlify

Download/export this project folder (containing `index.html`, `css/`, `js/`,
`data/`) and drag the whole folder onto
[app.netlify.com/drop](https://app.netlify.com/drop). Done — no build
command, no environment variables, nothing else to set up.

> If this repo is ever connected to Netlify via GitHub instead (New site
> from Git), it deploys the same way with no build command needed — either
> approach works. Drag-and-drop just means re-dragging the folder if the
> site's code ever changes; monthly data updates never require a redeploy.

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

## Project structure

```
index.html             Dashboard page shell
css/styles.css          Styling (light/dark aware)
js/config.js            The Sheet ID (already filled in — nothing else to edit)
js/sheets.js            Reads the Sheet's public CSV export, no API key (falls back to sample data)
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
