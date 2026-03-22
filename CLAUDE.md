# Design Review Project

## On startup

When this project is opened in Claude Code, **immediately** start the design review — do not show a generic greeting. Go straight to step 1 below.

## How to start a review

When the user types "dr", or on startup:

1. Ask: "Paste the Figma URL for this review:"
2. Wait for the URL
3. Ask: "Open the page you want to review in the Chrome window, then press Enter."
4. Wait for the user to press Enter
5. Run via Bash: `node _core/dr.js "<figma_url>"` — this downloads the Figma design and takes the frontend screenshot
4. Read `manifest.md` in full
5. Read `screenshots/frontend-latest.png` and `screenshots/figma-latest.png`
6. Perform the visual comparison per manifest rules
7. Present bugs as a markdown table with columns: **#** | **Component** | **Property** | **Expected (Figma)** | **Actual (Frontend)**, then ask Y/N
8. On Y: ask once for Figma link (already provided — confirm or use the same URL), then run `node _core/generate-report.js` via Bash
9. Open the generated HTML file via Bash: `open ~/Desktop/design-review-*.html`

## Visual comparison rules

**Skip — do not flag as bugs:**
- Charts, graphs, progress bars, and their legends — these are data-driven and will never match the design exactly
- Any content that is clearly dynamic (user data, counts, percentages, dates)

**Always check carefully — commonly missed:**
- Text colors (headings, labels, amounts) — compare exact color against design, not just presence
- Column headers and legend labels — check every label is present and matches the design text exactly; missing labels (e.g. a "Provider" column header) count as bugs
- Spacing and alignment differences between components

## Important

- Everything runs inside Claude Code — the user never needs a second terminal
- `node dr.js "<url>"` always receives the Figma URL as an argument (non-interactive)
- `manifest.md` lives in `_core/` and is part of this repo — edit it directly here
- Screenshots are auto-deleted after report generation
- HTML reports are saved in this folder
- **Never ask the user for their Figma token.** It is stored in `config/.env`. The script handles missing or expired tokens automatically via a native macOS dialog.
