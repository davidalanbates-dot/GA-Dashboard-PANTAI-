# Pantai — GA & SEO Dashboard

A live dashboard that replaces the monthly Pantai SEO & Analytics slide deck.
**It's a single self-contained HTML file** — `index.html` — that reads its
data straight out of a Google Sheet and renders it as headline KPIs, trend
charts, and tables. Update the Sheet once a month; the dashboard picks it up
automatically on the next page load. No build step, no API key, no
environment variables.

Branded to match [pantai.com.my](https://www.pantai.com.my/): the wordmark
blue and "Caring from the heart" teal tagline in the header, the same blue as
the primary chart/KPI accent color.

**Gleneagles gets its own separate dashboard file/Sheet later, using this one
as the template.**

## How it works

```
Google Sheet  --(public CSV export link, no key needed)-->  index.html (on Netlify)
```

- On page load, the browser reads each tab of the Sheet through Google's
  built-in CSV export link — the same mechanism as "File → Publish to web."
  No Google Cloud account, no API key.
- There is **no Google Analytics API involved** — someone (you, or whoever
  owns the monthly report) copies the numbers from GA / Search Console into
  the Sheet once a month, same as building the old slide deck, just into
  spreadsheet rows instead of slide graphics.
- If the Sheet isn't reachable for any reason, the dashboard falls back to
  the sample data built into the file, so it's never a blank page.
- The Sheet ID is already filled into `index.html` near the top (search for
  `DASHBOARD_CONFIG`) — nothing to configure.

## Deploying

Exactly like any plain HTML file:

1. Download `index.html`.
2. Drag it onto [app.netlify.com/drop](https://app.netlify.com/drop).

Done. No build command, no environment variables, nothing else to set up.

(Optional, not required: since the dashboard only ever reads the Sheet, you
could tighten [the Sheet's](https://docs.google.com/spreadsheets/d/12fmna96dAMXd7Jmk5B4g-XWM6ZAtIGoxlRnqtkhcm-s/edit)
Share → General access from "Editor" to "Viewer" so a stray link can't be
used to edit your numbers. Skip this if you'd rather not touch permissions —
the dashboard works either way.)

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

This is the **only** recurring task — the live file re-reads the Sheet every
time someone opens it. No redeploy required.

## Local development

Just open `index.html` directly in a browser — double-click it, no server
needed.

## What's inside `index.html`

It's one file with everything inlined: styling, the Sheet-reading logic, the
chart-rendering logic, the page markup, and a bundled sample dataset (June
2026 figures from the original deck) used as a fallback. The only external
dependency is the Chart.js library, loaded from a public CDN (`cdnjs`) —
normal for a static page, no different from a Google Fonts link.

To make a change, open the file in any text editor:
- **Sheet ID**: near the top, in the `DASHBOARD_CONFIG` script block.
- **Brand colors**: the `:root { ... }` block at the top of `<style>` (look
  for `--brand-blue`, `--brand-teal`, `--brand-navy`, `--series-1`).
- **Logo mark**: the inline `<svg class="mark">` in the header.

## Extending this later

Ideas not in this first version, worth adding once the core dashboard is in
regular use: Users by Geolocation, Top Pages, and a Gleneagles-style toggle
if the two dashboards ever need to be viewed side by side (they're currently
kept as fully separate files/Sheets by design). If you get the actual Pantai
logo file (PNG/SVG) rather than this hand-drawn approximation, it can be
dropped in as a data-URI image in place of the inline SVG mark.
