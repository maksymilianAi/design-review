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

Open the Claude Code app → Settings → Integrations → **Figma** → Connect.

> You only need to do this once per account.

### 3. Download and open

**[⬇ Download ZIP](https://github.com/maksymilianAi/design-review/archive/refs/heads/main.zip)** — unzip anywhere on your Mac.

Double-click **`Design Review.app`**.

> First time: macOS may block it. Right-click → **Open** → **Open**.

### 4. Run a review

1. Paste the Figma URL when Claude asks
2. Open the page in the Chrome window that launched
3. Type `go` in the Claude chat
4. Review the bug table → confirm with **Y**
5. The HTML report opens on your Desktop

---

<details>
<summary><strong>How it works</strong></summary>

<br>

Design Review connects three systems: a live browser tab (via Chrome DevTools Protocol), a Figma file (via Figma MCP), and Claude Code as the AI reasoning layer. Everything runs locally — no backend, no cloud.

**Flow:**
1. `node dr.js` captures a full-page screenshot of the Chrome tab via CDP
2. Figma MCP (`get_screenshot`) fetches the design frame directly from your Figma account
3. Claude compares both images and produces a bug table
4. `node dr-crop.js` crops each bug area from the frontend screenshot
5. `get_screenshot` fetches the matching Figma crop for each bug
6. `node generate-report.js` assembles a self-contained HTML report with all images embedded as base64

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
├── docs/
│   ├── ARCHITECTURE.md       — system design, data flow, security notes
│   ├── SCRIPTS.md            — full scripts reference with examples
│   └── CONTRIBUTING.md       — dev setup and how to extend the project
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
<summary><strong>Troubleshooting</strong></summary>

<br>

**"Figma is not connected"**
Open Claude Code → Settings → Integrations → Figma → reconnect. The connection occasionally expires.

**macOS blocked the app**
Right-click `Design Review.app` → Open → Open. Required once after download.

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
