# Design Review Manifest V5.1

## About this file
This file defines the operational process for Design Review. Product-specific rules, exclusions, and context are in `manifest-rules.md` — read that file immediately after this one. Both files together are the source of truth.

---

## How to run a review

On startup — immediately begin, do not show a generic greeting:

0. Read `_core/manifest-rules.md` silently before doing anything else.

0a. Verify Figma MCP is available by calling `get_screenshot` with fileKey `"test"` and nodeId `"1:1"` — any response (including an error) confirms the tool is reachable. If the tool itself is unavailable (not just a bad node ID), stop immediately and show:

---
**Figma is not connected to Claude.**

To fix this:
1. Go to **claude.ai** → your profile icon → **Settings** → **Connectors** → **Browse Connectors**
2. Find **Figma** and click **Install**
3. Authorize in the Figma dialog that opens
4. Run the setup command again

---

0b. If `~/Downloads/design-review/_core/launch.sh` exists — run `bash ~/Downloads/design-review/_core/launch.sh`. If it does not exist — check if Chrome is running on port 9222 and launch it if not.

0c. Output exactly this welcome message — nothing before it, nothing after it. Do not ask for the Figma URL yet.

---

```
  *
* | *
  *
```
**Design Review**
*by Maksymilian Soroka · built with Claude Code*

---

1. Then — and only then — ask exactly this, once: "Paste the Figma URL for this review:"
2. Wait for the URL. Parse it — extract `fileKey` and `nodeId` (convert `-` → `:` in nodeId). Store both.
3. Ask: "Open the page you want to review in the Chrome window, then type 'go' here in the chat."
4. Wait for the user to reply "go"
5. Ask: "Anything specific to focus on or skip? — or press Enter to review everything."
   Wait for the user's response. Store as scope instructions.
6. Run via Bash: `node _core/dr.js` — captures the frontend screenshot
7. Call `get_screenshot(fileKey, nodeId)` via Figma MCP to get the design screenshot
8. Read `screenshots/frontend-latest.png`. Use the Figma MCP screenshot as the design reference.
9. Perform the visual comparison following all rules below
10. Present bugs as a markdown table, then ask Y/N
11. On Y — generate the report:
    - For each bug: run `node _core/dr-crop.js "SELECTOR" fe_bugN` to save the frontend crop
    - For each bug: call `get_screenshot(fileKey, bugNodeId)` and save the result as `screenshots/crops/fig_bugN.png`
    - Write `screenshots/bugs.json` with the bug metadata array
    - Run `node _core/generate-report.js feature-name` via Bash
    - Open: `open ~/Desktop/design-review-*.html`
12. Ask: "Any crops to fix? Mention the bug number and which side."

**Technical notes:**
- Figma design is fetched via the Figma MCP connector — no token needed
- Never ask the user for a Figma token
- `bugs.json` format: `[{ "num": 1, "component": "", "property": "", "expected": "", "actual": "", "severity": "CRIT|Minor", "figmaUrl": "" }]`

---

## Viewport
The screenshot is taken automatically at 1440px via CDP — no manual resizing needed.

If the content width needs to be verified: `document.documentElement.clientWidth`
If the result is not 1440 — report it and stop.

---

## Step 0 — Before starting
1. Parse the Figma URL: extract `fileKey` and `nodeId` (convert `-` → `:` in nodeId). Store both for later use.
2. Read both screenshots: frontend (left) and Figma design (right)
3. Begin analysis immediately — do not ask any questions

---

## Output format — MANDATORY

**Bugs MUST be output as a markdown table. This is the only allowed format.**

| # | Component | Property | Expected (Figma) | Actual (Frontend) |
|---|-----------|----------|------------------|-------------------|

FORBIDDEN output formats — never use these:
- Bullet points: `- Bug: ...`
- Numbered prose: `1. Bug: ...`
- Bold labels: `**Component:** ...`
- Paragraphs describing bugs
- Any format other than table rows

If you catch yourself writing a dash, asterisk, or number at the start of a bug — STOP. Delete it. Add a table row instead.

---

## Rules
- Do NOT show a plan, outline, or list of steps — begin immediately
- Do NOT ask for approval before proceeding
- Do NOT show intermediate analysis, check results, or commentary — output the bug table only
- Do NOT take any browser screenshots — they are provided automatically
- When a visual difference is spotted: call `get_design_context(fileKey, nodeId)` with the component's nodeId first — it returns exact hex colors and px values from the design. Fall back to DevTools only for frontend-side values not available from the design context.
- When DevTools is needed, batch ALL queries into a single JS call — never separate calls per element

---

## Core principle — what is dynamic and what is not

**Only the actual data values inside elements are dynamic.** Everything else is always checked.

| Always a bug if different | Never a bug if different |
|--------------------------|--------------------------|
| Element is missing from frontend | The number inside a counter or badge |
| Text color | Value inside a table cell (name, amount, date) |
| Font size or weight | Chart bar heights or segment sizes |
| Background or border color | Pagination count |
| Spacing, padding, margins | |
| Static labels (column headers, section titles, badges) | |
| Counter/badge UI element missing entirely | |
| Icon type, size, color | |
| Component height or border radius | |

Rule: never skip an entire component because it contains dynamic data. Only skip the data values themselves — check everything else.

---

### Label vs. value in detail / form views

Detail pages and settings pages often show field rows with a label on the left and a value on the right (e.g. "Full name · Linda Smith", "Date of birth · 12 Mar 1990", "Gender · Female").

**How to tell them apart:** look at the design. Labels are short, descriptive, and the same across all records. Values are the actual data for that specific record — a name, a date, an ID, a selection.

| Part | Examples | Treat as |
|------|----------|----------|
| Label (left side) | "Full name", "Date of birth", "Gender", "Department" | **Static** — must match design exactly |
| Value (right side) | "Linda Smith", "12 Mar 1990", "Female", "Engineering" | **Dynamic** — content may differ; check styling only |

When reviewing a detail or form page:
- The label text must match the design exactly — flag any difference.
- The value text is dynamic — do NOT flag the content itself as a bug.
- DO still check the value's styling: color, font size/weight, placeholder state, empty state formatting.

---

## Ignore completely
- Sticky header on scrolled screenshots
- Transparent backgrounds that visually match due to parent background
- Claude plugin UI elements (e.g. "Claude is active in this tab group")
- Chart and graph data visualizations — bars, segments, lines, pie slices, progress fills. The data is dynamic. Do NOT flag differences in chart appearance, segment sizes, colors of chart segments, or chart legend labels.

---

## Comparison process

The design screenshot is the source of truth. Work top to bottom through these zones in order — complete each zone fully before moving to the next:

**Zone 1 — Page header / breadcrumbs**
**Zone 2 — Page title, section headings, counters/badges next to titles**
**Zone 3 — Filters, tabs, search bar**
**Zone 4 — Primary content (tables, cards, lists, detail sections, form groups)**
**Zone 5 — Pagination and footer**

For every visible element in each zone, check:
1. **Present?** — exists in design but missing in frontend → bug
2. **Color** — text color, background, border. Never assume similar-looking colors are the same. Pay extra attention to monetary amounts, totals, and summary values — these are commonly the wrong color.
3. **Text content** — static labels, headings, column headers, placeholders must match exactly
4. **Font size and weight**
5. **Spacing** — padding, gaps, margins
6. **Icons** — type, size, color
7. **Component dimensions** — height, border radius
8. **Interactive controls** — for every collapsible section or module, check whether expand/collapse arrows or toggle icons are present, visible, and match the design. A missing arrow on a collapsible section is always a bug.

**Four things that are always missed — check these explicitly every time:**
- **Section title counters** — if a heading has a number or count next to it in the design (e.g. "Expenses 24"), check the frontend has it too. Missing counter = bug.
- **All table column headers including the first one** — count every column header in the design. The first column is the most commonly missing. Every header must be present with exact text.
- **Text color of amounts and totals** — monetary values and summary numbers shown in a brand color (blue, teal, green) when the design shows black or dark = bug.
- **Expand/collapse controls on every module** — scan every section header in the design for an arrow or chevron icon. If the design has it and the frontend does not — bug. If the arrow is only visible on hover in the frontend but always visible in the design — bug.

### Completeness rule — MANDATORY

**Finding bugs does not mean you are done.** The number of bugs found so far is irrelevant — keep going until every element in every zone has been checked.

Before writing the bug table, do a mandatory self-check:

1. **Count sections in the design** — how many named sections or groups are visible (e.g. "General information", "Contact details", "Employment", "Permissions")? Write down that number internally.
2. **Verify you reviewed every section** — if you reviewed fewer sections than you counted, go back and finish.
3. **For each section, count rows/fields** — in detail or form views, count every label row in the design for that section. Verify you checked each one. A section with 8 label rows must produce 8 checked rows, not 3.
4. **Only then write the bug table.**

If unsure whether something is dynamic — flag it in the table. Let the user decide.

When a visual difference is confirmed — get exact values in this order:
1. Call `get_design_context(fileKey, nodeId)` with the component's nodeId → use the returned hex/px values as Expected
2. DevTools for frontend-side values only (computed color, line-height, margin, padding, gap) — batch ALL queries into one JS call

---

## Color rule
Always report colors in hex — convert rgb(23, 106, 246) → #176AF6 before reporting.
If the design shows a color name or variable — resolve it to its hex value.
Plain hex only — never add brackets, parentheses, or labels like "(black)" or "(blue)".

---

## Design audit
- Font "popping" in Figma → ⚠️ Design bug — wrong font in Figma
- Typo in Figma → ⚠️ Typo in design

---

## Bug numbering & formatting
- Number bugs starting from #1
- Do NOT assign priority — the user decides
- Do NOT use bold text in chat responses — plain text only
- Only the bug table uses formatting

---

## After showing all bugs
After presenting the bug table, add a blank line, then ask exactly this — nothing else:

> Proceed with these bugs? Type Y to generate the report · N to make changes

- Y → use the Figma URL already provided at the start of the review — do not ask for it again. Execute immediately:
   - Get today's real date from browser console
   - For each bug: get bounding rect, take real screenshot crop from browser; call `get_screenshot(fileKey, nodeId)` with the component's nodeId for the Figma-side image
   - Generate and write the complete HTML report in one single file operation
   - Respond with exactly one line: "Report generated: [filename]" — nothing else
   - Then ask exactly: "Any crops to fix? Mention the bug number and which side (design or frontend)."
   - Wait for the user's response. If they describe a bad crop — re-crop that side using the same anchor point method, replace the image in the HTML file, and respond: "Bug #N [side] updated." Then ask the same question again until the user says no.
- N → wait for instructions, update the table, then ask Y/N again

---

## Zero bugs case
Respond: "No bugs found. The frontend matches the design."
Then generate the HTML report immediately using the Figma URL already provided.

---

## Screenshot cropping rules

For each bug, crop both screenshots to visually highlight the problem area.

**Focus on the problem element.**
Each crop must be centered on the specific element that differs — not the whole page, not the whole component.

**Same height for both sides.**
Frontend crop and design crop must be scaled to the same pixel height.

**Minimum height: 100px.**
Thin elements (breadcrumb bars, single-line labels) must be scaled up to meet this minimum.

**Zoom level: 2× default, 3× for small/thin elements.**

**Before taking any screenshot: close DevTools completely.**
Never take a screenshot while DevTools is open. The inspector overlay causes orange tinting. If a screenshot has an orange overlay — discard it, close DevTools, and retake.

### How to crop — anchor point method

The bug element is the **anchor point**. The crop is built around its center.

**Step 1 — Find the anchor point**
```js
const r = document.querySelector('SELECTOR').getBoundingClientRect();
const anchorX = r.left + r.width / 2;
const anchorY = r.top + r.height / 2;
```

**Step 2 — Calculate crop window**
- `cropW = Math.max(r.width + 500, 700)`
- `cropH = Math.max(r.height + 200, 220)`
- `cropX = anchorX - cropW / 2`
- `cropY = anchorY - cropH / 2`

The crop must show enough surrounding context that a reader immediately understands where on the page the bug lives — not just the element in isolation.

**Step 3 — Clamp to page bounds**
If `cropX < 0`: set `cropX = 0`, then `cropW = anchorX * 2` so the anchor stays centered.
If `cropY < 0`: set `cropY = 0`.

**Step 4 — Take the frontend crop**
The bug element must appear dead-center horizontally and vertically.

**Step 5 — Get the Figma-side image**
- If the bug element node is smaller than 200px wide or 60px tall — call `get_screenshot` on its **parent section node** instead, not the element itself. Small nodes produce context-free crops that are unreadable.
- Otherwise call `get_screenshot(fileKey, nodeId)` with the element's nodeId.
- Never slice `figma-latest.png` manually.

**Step 6 — Scale and validate**
- Scale both to the same height (taller × zoom multiplier)
- Final height ≥ 150px
- Both crops must show enough context to understand the bug without reading the description

### Before embedding — verify:
- Bug element is visible and identifiable in both crops
- There is meaningful context around the element (not just the element alone)
- Both crops show the same region of the page
- Figma crop came from `get_screenshot`, not from slicing `figma-latest.png`

---

## Report format

**File name:** `design-review-[feature-name]-[YYYY-MM-DD].html`
Get real date: `new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: '2-digit' })`

Generate ONE HTML file only. Write it directly to disk — do NOT open new tabs, use blob URLs, window.open(), or URL.createObjectURL(). Write once. If something fails — report the error.

The report structure must be identical for every session.

**Structure:**
- Header: "[Feature Name] Design review" (sentence case) · date
- Figma link: clickable "🔗 Link to Actual Designs"
- Summary bar: three equal cards — Total Bugs / Critical / Minor
- One card per bug:

```
┌──────────────────────────────────────────────────────────┐
│ COMPONENT NAME (uppercase)          Bug #N  [CRIT/Minor] │
├──────────────────────────────────────────────────────────┤
│  [Design screenshot]    →    [Frontend screenshot]       │
│  "Design — expected"         "Frontend — current"        │
├──────────────────────────────────────────────────────────┤
│  Property  │  Expected (Figma) green  │  Actual (Frontend) red │
└──────────────────────────────────────────────────────────┘
```

CRITICAL: every bug card MUST include both screenshots as real embedded base64 images. Never use placeholders, empty boxes, or HTML/CSS recreations. A card without real images is invalid.

- Design always left, Frontend always right
- Screenshot section background: #fafafa · card header background: #f1f3f7
- Each screenshot container: min-height 200px · vertical divider between sides
- Label pills: "Design — expected" / "Frontend — current" — bg #f8fafc / text #1e293b · 4px radius
- Expected: green #16a34a · Actual: red #dc2626
- CRIT badge: bg #fef2f2 / text #b91c1c / border #fecaca
- Minor badge: bg #f8fafc / text #475569 / border #cbd5e1
- Footer: "Generated by Claude Design Review · [date]"

**Styling:** white cards on #f4f5f7 · 1px border #e2e4e9 · 12px radius · max-width 1040px centered · system font (-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)
