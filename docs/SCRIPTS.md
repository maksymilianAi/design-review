# Scripts reference

All scripts live in `_core/` and require Node.js 18+. Run them from the project root or `_core/` directory.

---

## `dr.js` — Frontend screenshot

Captures a full-page screenshot of the current tab in the debug Chrome window.

```bash
node _core/dr.js
```

**Output:**
- `_core/screenshots/frontend-latest.png` — always overwritten with the latest capture
- `_core/screenshots/frontend-TIMESTAMP.png` — timestamped archive

**Requirements:**
- Chrome must be running with `--remote-debugging-port=9222`
- The active tab must be 1440px wide (checked automatically)

**How it works:**
1. Connects to Chrome via CDP on port 9222
2. Takes a screenshot immediately — before any JS evaluation — to avoid triggering SPA re-renders
3. Compares the screenshot height to the full page scroll height
4. If they differ by more than 5%, falls back to scroll+stitch: scrolls the page in viewport increments, captures slices, and composites them with `sharp`

---

## `dr-crop.js` — Element crop

Crops a specific page element with context padding and saves it as a PNG.

```bash
node _core/dr-crop.js "CSS_SELECTOR" output-name [zoom]
```

| Argument | Required | Description |
|----------|----------|-------------|
| `CSS_SELECTOR` | yes | Any valid CSS selector (e.g. `".header"`, `"h2:first-of-type"`) |
| `output-name` | yes | Filename without extension. Saved as `screenshots/crops/output-name.png` |
| `zoom` | no | Scale multiplier. Default `2`. Use `3` for small/thin elements. |

**Output:** `_core/screenshots/crops/output-name.png`

**Crop formula:**
```
cropW = max(element.width + 500, 700)
cropH = max(element.height + 200, 220)
```
The element is centered in the crop window. The crop is clamped to viewport bounds.

**Examples:**
```bash
# Crop the page title bar
node _core/dr-crop.js ".page-header" fe_bug1

# Crop a specific heading, 3× zoom for a thin element
node _core/dr-crop.js "h2.section-title" fe_bug3 3

# Crop a field label row
node _core/dr-crop.js "[data-field='date-of-birth']" fe_bug6
```

---

## `dr-audit.js` — DOM audit

Runs a structured audit of the current page and returns a JSON report.

```bash
node _core/dr-audit.js [--pretty]
```

| Flag | Description |
|------|-------------|
| `--pretty` | Pretty-print the JSON output (default: minified) |

**Output:** JSON printed to stdout. Pipe to a file or read directly.

**JSON structure:**
```json
{
  "url": "https://...",
  "sections": [
    {
      "text": "Employment Information",
      "fontSize": 20,
      "fontWeight": 600,
      "color": "#1D1D1F",
      "hasCollapseControl": false
    }
  ],
  "fieldLabels": [
    {
      "text": "Date of birth",
      "hasAsterisk": true,
      "fontWeight": 700,
      "color": "#374151",
      "fontSize": 14
    }
  ],
  "navigation": [
    {
      "text": "Personal Information",
      "isActive": true,
      "color": "#2563EB",
      "fontWeight": 600
    }
  ],
  "borders": {
    "element_0": {
      "tag": "header",
      "text": "Linda Smith",
      "borderBottomWidth": "0px",
      "hasBorderBottom": false,
      "boxShadow": null
    }
  }
}
```

**What it detects:**

| Category | What is checked |
|----------|----------------|
| `sections` | All visible headings (font-size ≥ 16px, weight ≥ 500). Checks if a collapse/expand control exists nearby (SVG, button, arrow character, or class containing `chevron`/`arrow`/`collapse`) |
| `fieldLabels` | Left-column elements in flex/grid rows with font-weight ≥ 500. Reports asterisk presence, exact text, color |
| `navigation` | `<nav>`, `<aside>`, `[role="navigation"]` links and list items |
| `borders` | Computed `border-bottom` and `box-shadow` on elements matching `header`, `[class*="header"]`, `[class*="title-bar"]`, `[class*="toolbar"]` |

**Usage in a review session:**
Claude runs `dr-audit.js` at the start of analysis. The JSON gives exact computed values (color as hex, font-weight as number) without Claude needing to run separate DevTools queries per element.

---

## `generate-report.js` — HTML report

Assembles the final HTML report from pre-saved crops and bug metadata.

```bash
node _core/generate-report.js [feature-name]
```

| Argument | Description |
|----------|-------------|
| `feature-name` | Optional. Used in the filename: `design-review-feature-name-YYYY-MM-DD.html`. Defaults to `review`. |

**Input files (must exist before running):**

| File | Written by | Content |
|------|-----------|---------|
| `screenshots/bugs.json` | Claude | Bug metadata array (see format below) |
| `screenshots/crops/fe_bugN.png` | `dr-crop.js` | Frontend crop for bug N |
| `screenshots/crops/fig_bugN.png` | Claude (from Figma MCP) | Figma crop for bug N |

**`bugs.json` format:**
```json
[
  {
    "num": 1,
    "component": "Title bar",
    "property": "Bottom border",
    "expected": "1px solid #E2E4E9",
    "actual": "Missing",
    "severity": "CRIT",
    "figmaUrl": "https://www.figma.com/design/..."
  }
]
```

**Output:** `~/Desktop/design-review-[feature-name]-[date].html`

A self-contained HTML file with all images embedded as base64. No external dependencies — it can be opened offline and shared as a single file.

---

## npm scripts

Convenience shortcuts defined in `_core/package.json`:

```bash
npm run screenshot   # → node dr.js
npm run crop         # → node dr-crop.js (pass args after --)
npm run audit        # → node dr-audit.js --pretty
npm run report       # → node generate-report.js
npm run chrome       # launch debug Chrome manually
```

Example with args:
```bash
npm run crop -- ".header" fe_bug1 2
```
