<div align="center">

<img src="assets/icon.png" width="120" alt="Design Review" />

# Design Review

**AI-powered visual QA between Figma designs and your frontend — runs entirely inside Claude Code.**

</div>

---

## What it does

Design Review compares a Figma design frame against a live frontend page and produces a structured bug report. You provide a Figma URL, Claude does the comparison, and you get a polished HTML report saved to your Desktop — with side-by-side cropped screenshots of every bug.

---

## Requirements

- macOS
- [Claude Code](https://claude.ai/code) installed
- Google Chrome installed
- A [Figma Personal Access Token](https://www.figma.com/developers/api#authentication)

---

## Setup

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd DR
```

### 2. Install dependencies

```bash
cd _core && npm install && cd ..
```

### 3. Open the app

Double-click **`Design Review.app`** in Finder.

On first launch, a dialog will ask for your Figma API token. Paste it and click **Save** — it is stored securely in your macOS Keychain and never asked again.

---

## Running a design review

### Step 1 — Launch the app

Double-click **`Design Review.app`**.

This opens a dedicated Chrome window with remote debugging enabled, then launches Claude Code in the project directory.

### Step 2 — Paste the Figma URL

Claude automatically starts the review flow and asks for the Figma URL of the design frame you want to compare. Copy the link from Figma (right-click a frame → **Copy link**) and paste it.

### Step 3 — Open the page in Chrome

Claude will prompt you to navigate to the frontend page you want to review in the Chrome window. Once you're on the right page, type `go`.

The tool will then:
- Download the Figma design as a screenshot
- Capture the frontend page at 1440px viewport width

### Step 4 — Review the bug table

Claude presents a table of visual discrepancies — missing elements, wrong colors, text mismatches, spacing issues, and more.

Confirm with **Y** to generate the report, or **N** to make changes.

### Step 5 — Get the report

The HTML report is saved to your **Desktop** and opens automatically. It contains:

- A summary of total bugs
- Side-by-side cropped screenshots for each bug (Figma vs. Frontend)
- A direct link to the Figma frame
- Property details for each discrepancy

Screenshots are deleted from the project folder after the report is generated.

---

## Project structure

```
DR/
├── Design Review.app/        # macOS app bundle — double-click to start
├── _core/
│   ├── dr.js                 # Takes screenshots, fetches Figma design
│   ├── generate-report.js    # Generates the HTML bug report
│   └── manifest.md           # All review rules and instructions
├── config/
│   └── .env                  # Stores your Figma token (gitignored)
└── CLAUDE.md                 # Points Claude Code to manifest.md
```

---

## Figma token

Your token is stored securely in the macOS Keychain. If it expires or becomes invalid, a native macOS dialog will prompt you to paste a new one — it is updated automatically.

To generate a token: Figma → Settings → Security → **Personal access tokens**.

---

## Review rules

All review rules — what to check, what to ignore, how bugs are reported, and how the HTML report is structured — live in `_core/manifest.md`. Edit that file to customize the review behavior.

---

<div align="center">
  <sub>Built with Claude Code · Runs locally · No data leaves your machine</sub>
</div>
