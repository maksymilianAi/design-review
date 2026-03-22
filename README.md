<div align="center">

# 🔍 Design Review

**AI-powered visual QA between Figma designs and your frontend — runs entirely inside Claude Code.**

</div>

---

## What it does

Design Review compares a Figma design frame against a live frontend page and produces a structured bug report. You provide a Figma URL, Claude does the comparison, and you get a polished HTML report saved to your Desktop — with side-by-side cropped screenshots of every bug.

No manual diffing. No switching between tabs. No second terminal.

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

On first launch, a dialog will ask for your Figma API token. Paste it and click **Save** — it is stored locally in `config/.env` and never asked again.

---

## Running a design review

### Step 1 — Open the app

Double-click **`Design Review.app`**.

This opens a dedicated Chrome window with the remote debugging port enabled, then launches Claude Code in the project directory.

### Step 2 — Navigate to the page

In the Chrome window that opens, navigate to the frontend page you want to review.

### Step 3 — Start the review in Claude Code

In Claude Code, type:

```
dr
```

Claude will ask for the Figma URL of the design frame you want to compare against.

### Step 4 — Paste the Figma URL

Copy the link from Figma (right-click a frame → **Copy link**) and paste it. The tool will:

- Fetch the latest review manifest from GitHub
- Download the Figma design as a screenshot
- Capture the current frontend page at 1440 px viewport

### Step 5 — Review the bug table

Claude presents a table of visual discrepancies — spacing issues, wrong colors, missing elements, text mismatches — each with a severity rating (`CRIT` or `Minor`).

Confirm with **Y** to generate the report, or **N** to discard.

### Step 6 — Get the report

The HTML report is saved to your **Desktop** and opens automatically. It contains:

- A summary of total, critical, and minor bugs
- Side-by-side cropped screenshots for each bug (Figma vs. Frontend)
- A direct link to the Figma frame
- Severity badges and property details

Screenshots are deleted from the project folder after the report is generated.

---

## Project structure

```
DR/
├── Design Review.app/        # macOS app bundle — double-click to start
├── _core/
│   ├── dr.js                 # Takes screenshots, fetches Figma design
│   └── generate-report.js    # Generates the HTML bug report
├── config/
│   └── .env                  # Stores your Figma token (gitignored)
└── CLAUDE.md                 # Instructions Claude follows during review
```

---

## Figma token

Your token is stored in `config/.env` as `FIGMA_TOKEN=<token>`. If it expires or becomes invalid, a native macOS dialog will prompt you to paste a new one — the file is updated automatically.

To generate a token: Figma → Settings → Security → **Personal access tokens**.

---

<div align="center">
  <sub>Built with Claude Code · Runs locally · No data leaves your machine</sub>
</div>
