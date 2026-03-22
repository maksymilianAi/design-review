<div align="center">

<img src="assets/icon.png" width="120" alt="Design Review" />

# Design Review

**AI-powered visual QA between Figma designs and your frontend — runs entirely inside Claude Code.**

</div>

---

## What it does

Design Review compares a Figma design frame against a live frontend page and produces a polished report with all found bugs — including side-by-side cropped screenshots of every discrepancy.

---

## Requirements

| | |
|---|---|
| [Figma Personal Access Token](https://www.figma.com/developers/api#authentication) | Lets the tool download your Figma designs |
| [Google Chrome](https://www.google.com/chrome) | Recommended for best results — other browsers are not officially supported |

Everything else (Node.js, Claude Code) is installed automatically on first launch.

---

## Setup

### 1. Download the project

**[⬇ Download ZIP](https://github.com/maksymilianAi/design-review/archive/refs/heads/main.zip)**

Unzip the folder anywhere on your Mac.

### 2. Open the app

Double-click **`Design Review.app`** in Finder.

> **First time only:** macOS may block the app with a security warning. Right-click the app → **Open** → **Open** to allow it.

The app will automatically install any missing tools (Node.js, Claude Code) and ask for your Figma API token. Everything is set up for you — you just click through the prompts.

---

## Running a design review

### Step 1 — Launch the app

Double-click **`Design Review.app`**.

This opens a dedicated Chrome window and launches Claude Code.

### Step 2 — Paste the Figma URL

Claude asks for the Figma URL of the design frame you want to compare. Copy the link from Figma (right-click a frame → **Copy link**) and paste it.

### Step 3 — Open the page in Chrome

Claude prompts you to navigate to the frontend page you want to review. Once you're on the right page, type `go`.

### Step 4 — Review the bugs

Claude presents a table of visual discrepancies — missing elements, wrong colors, text mismatches, spacing issues, and more.

Confirm with **Y** to generate the report, or **N** to make changes.

### Step 5 — Get the report

The HTML report opens automatically. It contains:

- A summary of total bugs
- Side-by-side cropped screenshots for each bug (Figma vs. Frontend)
- A direct link to the Figma frame
- Property details for each discrepancy

---

## Project structure

```
DR/
├── Design Review.app/        # macOS app bundle — double-click to start
├── _core/
│   ├── dr.js                 # Takes screenshots, fetches Figma design
│   ├── generate-report.js    # Generates the HTML bug report
│   └── manifest.md           # All review rules and instructions
└── config/
    └── .env                  # Stores your Figma token (gitignored)
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
