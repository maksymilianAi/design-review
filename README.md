<div align="center">

<img src="assets/icon.png" width="120" alt="Design Review" />

# Design Review

**AI-powered visual QA between Figma designs and your frontend — runs entirely inside Claude Code.**

</div>

---

## Requirements

| | |
|---|---|
| **Claude Code desktop app** | [claude.ai/download](https://claude.ai/download) |
| **Google Chrome** | Used to capture frontend screenshots via CDP |
| **Figma connected to Claude** | One-time setup — see below |

Node.js is installed automatically on first launch if missing.

---

## Quick start

### 1. Install Claude Code

Download and install from [claude.ai/download](https://claude.ai/download).

### 2. Connect Figma to Claude

> [!IMPORTANT]
> This step is required — Design Review will not work without it.

Open the Claude Code app → Settings → Connectors → **Browse Connectors** → find **Figma** → Install.

You only need to do this once per account.

### 3. Download and open

**[⬇ Download ZIP](https://github.com/maksymilianAi/design-review/archive/refs/heads/main.zip)** — unzip anywhere on your Mac.

Double-click **`Design Review.app`**.

> [!WARNING]
> **First time only — macOS security prompt**
>
> Do not double-click the app. Instead:
>
> 1. **Right-click** `Design Review.app` in Finder → **Open**
> 2. Click **Open** again in the dialog that appears
>
> Double-clicking will show a warning every time without a way through — right-click → Open is the only way to approve it. You only need to do this once.
>
### 4. Run a review

1. Paste the Figma URL when Claude asks
2. Open the page in the Chrome window that launched
3. Type `go` in the Claude chat
4. Review the bug table → confirm with **Y**
5. The HTML report opens on your Desktop

---

## Project documentation

<details>
<summary><strong>How it works</strong></summary>

<br>

Design Review connects three systems: a live browser tab (via Chrome DevTools Protocol), a Figma file (via Figma MCP), and Claude Code as the AI reasoning layer. Everything runs locally — no backend, no cloud.

**Flow:**

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

**Key design decisions:**

- **Screenshot before evaluate** — on React/Vue SPAs, any `Runtime.evaluate` call triggers data re-fetching and shows a loading spinner. `dr.js` takes the screenshot first, before touching the DOM.
- **Scroll+stitch fallback** — if the instant screenshot doesn't capture the full page height, the script scrolls in viewport increments, captures slices, and composites them with `sharp`.
- **Separate Chrome profile** — Chrome runs with `--user-data-dir=~/.chrome-dr`, separate from the user's main Chrome. Cookies and cache persist between sessions, making subsequent launches faster.
- **Figma via MCP** — no API tokens required. Figma access goes through the user's Claude account (OAuth), so nothing sensitive is stored in the project.
- **`bugs.json` as interface** — Claude writes bug metadata to `screenshots/bugs.json` before report generation. This decouples Claude's analysis from the report builder and makes the format explicit.

</details>

<details>
<summary><strong>Project structure</strong></summary>

<br>

```
DR/
├── Design Review.app/        — double-click to launch
├── _core/
│   ├── dr.js                 — captures frontend screenshot via CDP
│   ├── dr-crop.js            — crops a page element by CSS selector
│   ├── dr-audit.js           — structured DOM audit (labels, headings, nav, borders)
│   ├── generate-report.js    — builds the HTML bug report
│   ├── manifest.md           — review process and rules for Claude
│   └── manifest-rules.md     — design rules (capitalisation, labels, what to skip)
└── config/                   — local config (gitignored)
```

</details>

<details>
<summary><strong>Customising the review</strong></summary>

<br>

**`_core/manifest-rules.md`** — add product-specific rules without touching the core process:
- Capitalisation exceptions
- Components or sections to skip
- Label/value pair behaviour
- What counts as a bug vs. expected difference

**`_core/manifest.md`** — the core review flow (zones, screenshot algorithm, report format). Edit this to change how Claude runs the review itself.

To add a rules file for a specific product: create `_core/manifest-rules-productname.md`. It is picked up automatically.

</details>

<details>
<summary><strong>Scripts reference</strong></summary>

<br>

All scripts are in `_core/`. Run from the project root.

**`dr.js`** — full-page frontend screenshot via CDP
```bash
node _core/dr.js
# Output: _core/screenshots/frontend-latest.png
```

**`dr-crop.js`** — crop a page element by CSS selector
```bash
node _core/dr-crop.js "CSS_SELECTOR" output-name [zoom]
# Example: node _core/dr-crop.js ".page-header" fe_bug1 2
# Output: _core/screenshots/crops/output-name.png
```

Crop formula: `width = max(element.width + 500, 700)` · `height = max(element.height + 200, 220)`. Default zoom 2×, use 3× for thin elements.

**`dr-audit.js`** — structured DOM audit → JSON
```bash
node _core/dr-audit.js --pretty
# Returns: sections, fieldLabels, navigation, borders with exact computed values
```

**`generate-report.js`** — build the HTML report
```bash
node _core/generate-report.js [feature-name]
# Reads: screenshots/bugs.json + crops/fe_bugN.png + crops/fig_bugN.png
# Output: ~/Desktop/design-review-[feature-name]-YYYY-MM-DD.html
```

npm shortcuts:
```bash
npm run screenshot
npm run crop -- ".selector" fe_bug1
npm run audit
npm run report
```

</details>

<details>
<summary><strong>Contributing</strong></summary>

<br>

**Local setup:**
```bash
git clone <repo>
cd DR/_core
npm install
```

Launch Chrome for local testing:
```bash
npm run chrome
```

**Modifying scripts** — all scripts use CommonJS (`require`). No build step.

Key dependencies: `chrome-remote-interface` (CDP client) · `sharp` (image processing).

When modifying `dr.js` — the screenshot must come before any `Runtime.evaluate` or `Emulation` call. Any evaluation before the screenshot triggers SPA re-renders.

When modifying `dr-audit.js` — the `AUDIT_SCRIPT` string runs inside the browser via `Runtime.evaluate`. It cannot use Node.js APIs (`fs`, `path`, `require`). Only browser APIs are available.

**Adding a new script:**
1. Create `_core/your-script.js`
2. Add an entry to `_core/package.json` under `scripts`
3. If Claude should use it during reviews, reference it in `_core/manifest.md`

**Modifying the launcher** — after editing `Design Review.app/Contents/MacOS/start`, make sure it stays executable:
```bash
chmod +x "Design Review.app/Contents/MacOS/start"
```

</details>

<details>
<summary><strong>Troubleshooting</strong></summary>

<br>

**"Figma is not connected"**
Open Claude Code → Settings → Connectors → find **Figma** → reconnect. The connection occasionally expires.

**macOS blocked the app — "developer cannot be verified"**
Do not double-click — clicking Cancel on that dialog does not approve the app, and the warning will appear every time. Instead: right-click `Design Review.app` in Finder → **Open** → **Open**. Required once after download.

**Chrome window closed accidentally**
Relaunch `Design Review.app` — it kills the stale Chrome process and opens a fresh one.

**Node.js not found**
The app offers to install it automatically. If you prefer manual: `brew install node` (requires [Homebrew](https://brew.sh)).

**Report has no images**
Claude writes `screenshots/bugs.json` and the crop files before calling `generate-report.js`. If the report is empty, the session likely ended before crops were taken — restart the review.

</details>

---

<div align="center">
  <sub>Built with Claude Code · Runs locally · No data leaves your machine</sub>
</div>
