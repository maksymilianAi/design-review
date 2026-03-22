# Design Review Project

## How to start a review

When the user types "dr":

1. Ask: "Paste the Figma URL for this review:"
2. Wait for the URL
3. Run via Bash: `node _core/dr.js "<figma_url>"` — this fetches the latest manifest, downloads the Figma design, and takes the frontend screenshot
4. Read `manifest.md` in full
5. Read `screenshots/frontend-latest.png` and `screenshots/figma-latest.png`
6. Perform the visual comparison per manifest rules
7. Present the bug table and ask Y/N
8. On Y: ask once for Figma link (already provided — confirm or use the same URL), then run `node _core/generate-report.js` via Bash
9. Open the generated HTML file via Bash: `open ~/Desktop/design-review-*.html`

## Important

- Everything runs inside Claude Code — the user never needs a second terminal
- `node dr.js "<url>"` always receives the Figma URL as an argument (non-interactive)
- `manifest.md` is fetched fresh from GitHub on every run
- Screenshots are auto-deleted after report generation
- HTML reports are saved in this folder
