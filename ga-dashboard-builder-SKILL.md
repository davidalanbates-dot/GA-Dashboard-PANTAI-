---
name: ga-dashboard-builder
description: Build or maintain a hospital GA/SEO analytics dashboard (Pantai, Gleneagles, or a future brand) — a single self-contained HTML file reading live data from a Google Sheet with zero API key, styled to the brand's CI. Use whenever the user asks to build a new hospital dashboard, add a monthly report's data to an existing one, or restyle/fix an existing dashboard built this way.
---

# GA/SEO Dashboard Builder

This skill captures the working pattern established building the **Pantai**
dashboard, so it can be reused as-is for **Gleneagles** or any future brand,
in a fresh session with no memory of that build.

## What this produces

A single self-contained `index.html` file — no build step, no npm, no
backend — that a non-technical user deploys by dragging the one file onto
Netlify's manual deploy page (app.netlify.com/drop). Nothing else to
configure. Re-deploying only matters if the file's code changes; monthly
data updates never require a redeploy because the page re-reads the Sheet
live on every page load.

**One dashboard = one brand = one repo.** Don't combine two hospital brands
into one file or one Sheet — even when they're covered in the same source
report deck, keep them as fully separate dashboards, repos, and Sheets, each
with its own CI.

## Architecture (non-negotiable — this is what made it maintainable)

- **No Google Analytics API, no OAuth, no Google Cloud project.** The
  client-side JS reads each Sheet tab via Google's public CSV export
  endpoint:
  `https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&sheet={TAB_NAME}`
  This works for any Sheet shared as "Anyone with the link," with zero
  credentials. Do not reach for the Sheets API + API key path — it was tried
  first and explicitly walked back because it added Google Cloud Console
  setup the user didn't want.
- **Chart.js is inlined, not loaded from a CDN.** `npm install chart.js` in
  a scratch dir, then paste the UMD build's contents directly into a
  `<script>` tag in the HTML. A CDN `<script src>` will get silently
  blocked on some networks/browsers (this broke the dashboard once already
  — "Chart is not defined" with no other symptom). The only remaining
  external dependency should be the live Sheet fetch itself.
- **Sample data is bundled inline** (`window.__SAMPLE_DATA__`) as a
  fallback so the page is never blank — if the Sheet is unreachable or
  `SHEET_ID` is still a placeholder, it silently renders the sample data
  instead of erroring, with a small non-alarming banner explaining that.
- **The only thing meant to be hand-edited is `DASHBOARD_CONFIG.SHEET_ID`**
  near the top of the file. Keep it that way — no separate config file, no
  build step to inject secrets, because there's no secret to inject.

## Data schema (the Google Sheet)

One Sheet, one tab per topic, **one row per month per entity** (tidy/long
format so a new month is just new rows, and month-over-month deltas fall
out automatically by sorting on `Month` = `YYYY-MM` and comparing adjacent
rows). This exact schema is what the dashboard's JS expects — reproduce it
for any new brand's Sheet with the same tab names and headers:

| Tab | Columns | Notes |
|---|---|---|
| `Overview` | Month, Sessions, Users, Pageviews, AvgSessionDurationSec, ViewsPerSession, EngagementRatePct | One row per month |
| `Channels` | Month, Channel, Sessions, Users, EngagementRatePct, SessionDurationSec | One row per month **per channel** — channel names vary over time (e.g. "AI Assistant" and "Cross-network" appeared only in later months); that's fine, just add new channel name rows as they show up |
| `AITraffic` | Month, AISessions, AIUsers, AIAvgSessionDurationSec, AIBookings | Headline AI-channel summary. `AIBookings` = the brand's own ChatGPT-attributed appointment count, since that's the one figure the source reports themselves compare month-to-month — don't substitute a differently-scoped "AI conversions network-wide" number, it won't be comparable |
| `AISources` | Month, Source, Sessions, Users | One row per month per AI platform (ChatGPT, Gemini, Perplexity, Copilot, Claude, Meta AI, Grok, Poe) |
| `Organic` | Month, OrganicImpressions, OrganicSessions | |
| `Keywords` | Month, Type (Branded/Unbranded), Keyword, Clicks, Impressions, Position | Top 10 of each type per month |
| `Conversions` | Month, TotalConversions, Appointments, Enquiries, OrganicConversions, OrganicAppointments, OrganicEnquiries | |
| `Purchases` | Month, ItemsPurchased, RevenueRM, OrganicItemsPurchased, OrganicRevenueRM | |
| `Competitors` | Month, Competitor, SEOScore, DomainAuthority, AIVisibility, AISearchHealth, AIOAuditScore | One row per month per competitor (include the brand itself plus its named competitors) — this is the one tab that legitimately references the *other* brand for benchmarking, that's not scope creep |
| `Read Me` | (free text) | First tab, documents the schema in plain language for whoever edits the Sheet monthly. Always include one. |

Rules that matter:
- Sheet **must** be shared "Anyone with the link" (Viewer is enough; the
  gviz endpoint needs public-read, not the write-permissive default some
  users leave it on — flag that if you notice it, but it's optional to fix).
- Never rename tabs or headers — the dashboard's JS reads them by exact
  string match.
- When a month's data is missing or unreliable for a tab, **leave that row
  out rather than fabricating or estimating it.** Note the gap in the Read
  Me tab. Never invent numbers.
- When two source reports give conflicting figures for the same
  month/metric, prefer whichever report was **written for that specific
  month** over a later report's backward-looking summary table (this
  already caught real bugs — a rollup table once mislabeled an appointments
  sub-total as the full conversions figure).
- Sheet updates for an existing dashboard: since there's no Sheets-write
  API in play, deliver an updated **xlsx** (openpyxl works well, no
  internet needed) covering all months to date, and tell the user to
  reopen their live Sheet → File → Import → Upload → "Replace spreadsheet"
  — this keeps the same Sheet ID/URL the dashboard already points to.

## Extracting data from source report decks

Reports arrive as Google Slides links. Read via
`mcp__Google_Drive__read_file_content` (falls back to a saved file + `jq`/
`python` if the content exceeds the tool's token limit — grep for section
headers like `# Traffic Overview` first rather than dumping the whole
thing). Extract **only the target brand's** figures even when the deck
covers two brands together.

Before touching the Sheet, **diagnose format differences out loud and ask
before acting** whenever a new report deck:
- Uses a different structure than the last one processed (section
  ordering, brand-combined vs brand-only, new "old metric" labels, etc.)
- Contains numbers that are internally inconsistent (e.g. Users > Sessions
  for a channel — structurally impossible, almost certainly a
  transcription/alignment error in the slide) or byte-for-byte identical to
  a different month's figures (almost certainly a copy-paste error in the
  source deck)
- Requires a judgment call with no clean answer (e.g. a month's traffic is
  known to be bot-contaminated with no clean alternative figure given)

Present the specific numbers and the specific conflict, propose a default,
and let the user decide — don't silently pick one. Document whatever was
decided in the Read Me tab so it's traceable later, not just in chat.

## Branding a new instance (this is the part that changes per-brand)

For each new brand, gather (ask if not given):
1. **Logo** — get the actual file. Images pasted inline into chat are
   **not** accessible as files even though they render — only a real file
   upload or a shared-link URL (Google Drive, etc.) can be downloaded and
   embedded losslessly. If only a pasted image is available, hand-recreate
   it as SVG as a stopgap and say plainly that it's an approximation
   pending the real asset. Once a real file/URL is available, embed it as
   a `data:image/png;base64,...` `<img>` — check the PNG's own dimensions
   first (IHDR chunk, no PIL needed: bytes 16-24 are big-endian width/height
   uint32) to know whether it's just an icon mark or the full lockup
   (icon+wordmark+tagline combined) — the Pantai file turned out to be the
   full lockup, which meant replacing the separate icon+text markup
   entirely rather than placing them side by side.
2. **Primary brand color** — becomes `--series-1` (the chart palette's blue
   slot) and the highlighted-competitor color in the benchmark charts.
   Re-run the CVD-safety validator after retinting:
   `node <dataviz-skill-dir>/scripts/validate_palette.js "<8 hex colors>" --mode light`
   (and `--mode dark` with the dark surface) — swap in a brightened variant
   for the dark-mode palette, same relationship as the light→dark step used
   for Pantai's blue (#1e6fb0 → #3591d1).
3. **Secondary CI colors** (from the brand's site, typically a category/CTA
   button bar) — used **sparingly** as section accent markers only: an h2
   left-border (4px) and the section's KPI-card top-border, cycling through
   sections. Never repaint the validated chart-series palette with these —
   decorative brand accents and data-encoding colors are different jobs and
   should stay visually distinct.
4. **Header treatment** — a full-width band, fixed white background with
   fixed dark text (`#33322f`/`#1e6fb0`-style hex, not the page's
   light/dark theme CSS variables), independent of whether the page body is
   in light or dark mode. Getting this right the first time avoids a
   redo: making the header a *rounded card* sitting inside the same padded
   container as the page content looks fine in light mode but reads as
   "broken" in dark mode, because the near-black page background shows all
   around it. (A full-bleed edge-to-edge header was tried as the fix for
   that — the user later asked to roll it back as not worth it, so the
   current shipped Pantai header is the plain white-background bar, not
   full-bleed. Ask before assuming which one a new brand wants.)

## Mobile / responsiveness

CSS Grid items (`.card`, KPI cards, chart containers) don't shrink below
their content's natural width by default — a wide data table inside one
will silently force the whole page wider than the viewport instead of
scrolling within its own `.table-scroll` container. Always set
`min-width: 0` on grid items (`.card`, `.grid-2`, `.grid-3`,
`.chart-holder`) plus `html, body { overflow-x: hidden; max-width: 100% }`
and `img, svg, canvas { max-width: 100% }` as a baseline, and actually test
at 320–375px width (Playwright + a `document.documentElement.scrollWidth`
vs `window.innerWidth` check) rather than assuming it's fine.

## Verifying changes before showing the user

This environment usually can't reach the public internet (docs.google.com,
cdnjs, the brand's own site are all typically blocked), which is exactly
why Chart.js must be inlined rather than fetched. To verify a change
without a live Sheet:
- Playwright + Chromium is pre-installed at `/opt/pw-browsers/chromium`.
- For a quick visual check without real Chart.js, stub `window.Chart` via
  `page.addInitScript` before navigating.
- For a full pipeline check (real Chart.js, real chart rendering), install
  `chart.js` via npm in a scratch dir (registry.npmjs.org is normally
  reachable even when general web egress isn't) and intercept the `gviz/tq`
  requests with `page.route` to serve CSV built from the bundled sample
  data — this exercises the actual fetch → parse → render path end to end.
- Always screenshot and actually look at the image before telling the user
  it's fixed — several real bugs here (header contrast in dark mode, a grid
  overflow bug) were only caught by looking, not by absence of console
  errors.

## Current state (as of this hand-off)

- **Pantai**: live at repo `davidalanbates-dot/GA-Dashboard-PANTAI-`,
  branch `claude/practical-einstein-tnygy7`. Sheet populated March–August
  2026 (a few tabs have documented gaps — see that Sheet's Read Me tab).
  Real logo embedded. Footer reads "Powered by technologies built by
  Fishermen Analytics" (no logo in the footer — was tried and explicitly
  removed as looking out of place).
- **Gleneagles**: not started. Needs its own repo, its own Sheet (same
  schema as above), its own logo, and its own CI colors — nothing shared
  with Pantai except this architecture and schema.

## Company/agency context

The user is deploying these for **Fishermen Analytics** (their own agency)
building GA/SEO dashboards for hospital clients (currently Pantai Hospitals
and Gleneagles, both under the IHH Healthcare network per the source
reports). Monthly reports arrive as Google Slides decks from Fishermen's
own SEO/analytics team.
