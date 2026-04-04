# Architecture

Design Review is a local automation tool that connects three systems: a live browser tab (via Chrome DevTools Protocol), a Figma file (via Figma MCP), and Claude Code (as the AI reasoning layer). It runs entirely on the user's machine — no backend, no cloud.

---

## High-level flow

```
User                  Claude Code            Chrome (CDP)        Figma MCP
 │                        │                      │                   │
 │── paste Figma URL ────▶│                      │                   │
 │── type "go" ──────────▶│                      │                   │
 │                        │── node dr.js ────────▶│                   │
 │                        │                      │ capture screenshot│
 │                        │◀── frontend-latest.png│                   │
 │                        │                      │                   │
 │                        │── get_screenshot ─────────────────────────▶│
 │                        │◀── design image ──────────────────────────│
 │                        │                      │                   │
 │                        │  [visual comparison] │                   │
 │                        │                      │                   │
 │                        │── node dr-crop.js ───▶│                   │
 │                        │◀── fe_bugN.png ───────│                   │
 │                        │── get_screenshot ─────────────────────────▶│
 │                        │◀── fig_bugN.png ──────────────────────────│
 │                        │                      │                   │
 │                        │── node generate-report.js                 │
 │◀── design-review.html ─│                      │                   │
```

---

## Components

### `Design Review.app`
A macOS application bundle (`Design Review.app/Contents/MacOS/start`). It is a bash script that:
1. Checks for required dependencies (Chrome, Node.js, Claude Code) and offers to install missing ones
2. Shows a one-time reminder to connect Figma to Claude
3. Launches a separate Chrome instance with the Chrome DevTools Protocol debug port enabled (`--remote-debugging-port=9222`)
4. Opens a Terminal window and starts `claude .` inside the project directory

The app has no Objective-C or Swift code — it is purely a shell script in a macOS bundle.

### Chrome debug instance
Chrome is launched with a persistent separate profile at `~/.chrome-dr`. This profile is separate from the user's main Chrome to avoid conflicts (two Chrome instances cannot share one profile). Because the profile persists between sessions, auth cookies and cached assets accumulate over time, making subsequent launches faster.

Key flags:
- `--remote-debugging-port=9222` — enables CDP on localhost:9222
- `--user-data-dir=~/.chrome-dr` — separate persistent profile
- `--disable-extensions` — avoids extension interference with screenshots

### `_core/dr.js` — Frontend screenshot capture
Connects to Chrome via CDP using the `chrome-remote-interface` npm package.

**Critical design decision:** the screenshot is taken *before* any `Runtime.evaluate` or `Emulation` calls. On SPA (React/Vue) applications, evaluating JavaScript triggers the SPA's data-fetching lifecycle, which causes a loading spinner to appear. By capturing the screenshot first, we get the rendered page state.

If the screenshot height is less than 95% of the full page scroll height, the script falls back to a scroll+stitch approach: it scrolls the page in viewport-height increments, captures each slice, and composites them into a single image using `sharp`.

### `_core/dr-crop.js` — Element crop
Takes a CSS selector and output filename. Queries the element's bounding rect via CDP, applies a padded crop window (`width + 500px`, `height + 200px`, minimum `700×220px`), and captures a screenshot of that region. Applies optional zoom (default 2×).

Used by Claude to produce per-bug frontend screenshots for the report.

### `_core/dr-audit.js` — Structured DOM audit
Runs a self-contained JavaScript function inside the browser (via `Runtime.evaluate`) that extracts:
- **Section headings** — text, font size/weight, and whether a collapse/expand control is present nearby
- **Field labels** — text, presence of asterisk (`*`), font weight, color
- **Navigation items** — text, active state, color
- **Border status** — computed `border-bottom` on header/toolbar elements

Returns a JSON object. Claude reads this output and compares it against the design instead of running multiple separate DevTools queries.

### Figma MCP (`get_screenshot`, `get_design_context`)
Design Review uses the official Figma MCP server that ships with Claude Code. It authenticates via the user's Claude account (OAuth) — no personal access token required.

- `get_screenshot(fileKey, nodeId)` — returns a PNG image of a specific Figma node
- `get_design_context(fileKey, nodeId)` — returns reference code, design tokens, and a screenshot

In the review flow, `get_screenshot` is the primary tool. `get_design_context` is used sparingly (at most 2–3 times per session) to resolve exact color values or spacing.

### `_core/generate-report.js` — HTML report
Reads:
- `screenshots/crops/fe_bugN.png` — frontend crops (saved by `dr-crop.js`)
- `screenshots/crops/fig_bugN.png` — Figma crops (saved by Claude from MCP output)
- `screenshots/bugs.json` — bug metadata array

Scales both images to the same height for each bug card, embeds them as base64 in a self-contained HTML file, and writes the report to `~/Desktop/design-review-[feature]-[date].html`.

The report contains no external dependencies — it is a single portable HTML file.

### `_core/manifest.md` + `_core/manifest-rules.md`
The manifest files are the instruction set for Claude. They are read by Claude Code at session start via `CLAUDE.md`.

- `manifest.md` — process flow (what steps to take, in what order), screenshot algorithm, report format
- `manifest-rules.md` — design rules (capitalisation, label/value pairs, interactive controls, what to skip)

Separating them allows teams to maintain product-specific rules in `manifest-rules.md` without touching the core process.

---

## Data flow — screenshot files

```
screenshots/
├── frontend-latest.png         ← always the most recent full-page screenshot
├── frontend-TIMESTAMP.png      ← timestamped archive copy
└── crops/
    ├── fe_bug1.png             ← frontend crop for bug #1 (via dr-crop.js)
    ├── fig_bug1.png            ← Figma crop for bug #1 (saved from MCP)
    ├── fe_bug2.png
    ├── fig_bug2.png
    └── ...

screenshots/bugs.json           ← bug metadata written by Claude before report generation
```

All screenshot files are gitignored.

---

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `chrome-remote-interface` | ^0.33.2 | CDP client — communicates with Chrome |
| `sharp` | ^0.34.5 | Image processing — resize, crop, composite |
| `dotenv` | ^17.3.1 | Fallback env loading (legacy, may be removed) |

Node.js >= 18 required (for `structuredClone`, `fetch`, modern `fs/promises`).

---

## Security considerations

- No credentials are stored in the repository. `config/.env` is gitignored.
- The Figma OAuth connection is managed by Claude's own account — no token is exposed to the tool.
- `dr-crop.js` accepts a CSS selector from Claude. The selector is passed through `JSON.stringify` before insertion into the evaluated JavaScript string, which prevents most injection vectors, but arbitrary selectors should not be accepted from untrusted input.
- Chrome is launched with `--disable-extensions` and `--disable-sync` to reduce attack surface and prevent extension interference.
- The CDP port (9222) is bound to localhost only and is not exposed to the network.

---

## Known limitations

- **macOS only** — the `.app` launcher is a macOS shell script. Windows and Linux require running Claude Code manually from the project directory.
- **Single-page applications** — SPAs that re-render on JavaScript evaluation require the screenshot-first approach in `dr.js`. Static sites work without this constraint.
- **Chrome only** — CDP is Chrome-specific. Firefox and Safari are not supported.
- **Mobile apps** — the current architecture captures desktop web pages. Mobile native apps and mobile browser testing require a separate approach.
