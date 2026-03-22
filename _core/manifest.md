# Design Review Manifest V3.9

## About this file
This file contains personal preferences and rules for design review sessions.
Always follow these rules when asked to do a design review.

---

## Viewport
The page content must render at exactly 1440px width. The Claude panel occupies ~365px, so the total browser window width must be set to 1805px.

At the start of every session, before taking any screenshot, run this in the browser console:
`window.resizeTo(1805, window.outerHeight)`

Then verify the content width is 1440px:
`document.documentElement.clientWidth`

If the result is not 1440 — report it and stop. Do not proceed with a wrong viewport.

---

## How I work
- I provide one screenshot: Figma design only
- You take one screenshot of the current browser page — timing defined in Step 0
- To verify a Figma value, ask me: "Please provide Figma link for: [component]"
- Do not fetch Figma on your own

---

## Step 0 — Before starting
1. Run `window.resizeTo(1805, window.outerHeight)` to set the viewport to 1440px content width
2. Take one screenshot of the current browser page
3. Begin analysis immediately — do not ask any questions

---

## Rules
- Do NOT show a plan, outline, or list of steps — begin immediately
- Do NOT ask for approval before proceeding
- Take MAXIMUM 1 screenshot of the browser for comparison
- Only check what looks visually different in the provided screenshots
- Use DevTools only to verify values of elements where a visual difference is already spotted — never proactively on elements that look correct
- When DevTools is needed, batch ALL queries into a single JS call — never separate calls per element

---

## Ignore completely
- Top navigation header with logo and menu
- Sidebar navigation
- Sticky header on scrolled screenshots
- Transparent backgrounds that visually match due to parent background
- Pagination page count (dynamic data)
- Claude plugin UI elements (e.g. "Claude is active in this tab group")
- Charts, graphs, progress bars and their legends — data-driven, will never match exactly
- Any content that is clearly dynamic (user data, counts, percentages, dates)

**Must check:** Page header with breadcrumbs — must match the design exactly

---

## What to check
Check these visually from the screenshots — use DevTools only if a difference is spotted:
- Button HEIGHT (even 1px difference = bug) · WIDTH tolerance: ±10px acceptable
- Border-radius, padding, gap between components
- Icon type and size
- Text size and color
- Background and UI colors
- Spacing between icon and adjacent text
- Static text must match exactly — flag with ❌ Text mismatch / ⚠️ Typo in frontend / ⚠️ Typo in design

## Mandatory checks — never skip these

**Text colors:** For every visible text element (headings, labels, totals, amounts, status text) — compare the color in the frontend screenshot against the design. A color difference is a bug even if everything else looks correct. Use DevTools to get the exact hex value when a difference is spotted.

**Table column headers:** Count every column header in the design and verify each one exists in the frontend with the exact same label. A missing column header (e.g. "Provider") is a bug. A wrong label is a bug. Do this before anything else on pages with tables.

**Legend labels:** Count every label in any legend (chart legend, filter legend, category list) in the design and verify each exists in the frontend. Missing labels are bugs regardless of whether the chart data is dynamic.

DevTools only when visual difference is confirmed:
- Line height
- Exact margin between blocks
- Exact padding or gap values

---

## Static vs dynamic text
**Static — must match exactly:** button labels, page titles, headings, table column headers, description/helper text, status labels, placeholders

**Dynamic — do NOT flag:** table cell values, pagination count, user-generated content, backend data

If unsure: ask me "Is '[value]' in [component] static or dynamic?"

---

## Pagination rules
- Pagination component itself (arrows, page buttons, styling) must match the design exactly
- Number of pages shown is dynamic — do NOT flag as a bug
- Everything else in pagination (button size, color, font, spacing) must match

---

## Color rule
Always evaluate the visual result, not the raw CSS value.
Always report colors in hex — convert rgb(23, 106, 246) → #176AF6 before reporting.
If the design shows a color name or variable — resolve it to its hex value.
Plain hex only in the bug table — never add brackets, parentheses, or color name labels like "(black)" or "(blue)".

---

## Design audit
- Font "popping" in Figma → ⚠️ Design bug — wrong font in Figma
- Typo in Figma → ⚠️ Typo in design

---

## Bug numbering & formatting
- Number bugs starting from #1
- Do NOT assign priority — I decide
- Do NOT use bold text in chat responses — plain text only
- Only the bug table uses formatting

---

## Output table
Always output bugs as a markdown table — never as a list, never as prose.

The table has exactly 5 columns in this exact order — no more, no less:

| # | Component | Property | Expected (Figma) | Actual (Frontend) |
|---|-----------|----------|------------------|-------------------|
| 1 | Button | Height | 40px | 42px |

- Column 1 is #, column 2 is Component — there is NO column between them
- Every cell in every row must be filled — no empty cells
- No Priority column, no extra columns of any kind

---

## After showing all bugs
After presenting the bug table, add a blank line, then ask exactly this as a standalone paragraph outside the table — nothing else:

> Proceed with these bugs? Type Y to generate the report · N to make changes

- Y → ask once: "Would you like to add a Figma link to the report? (optional)" then execute immediately:
   - Get today's real date from browser console
   - For each bug: get bounding rect, take real screenshot crop from browser, crop matching area from Figma screenshot
   - Generate and write the complete HTML report in one single file operation
   - Respond with exactly one line: "Report generated: [filename]" — nothing else
- N → wait for instructions, update the table, then ask Y/N again

---

## Zero bugs case
Respond: "No bugs found. The frontend matches the design."
Ask once about Figma link, then generate the HTML report with an empty bug list.

---

## Screenshot cropping rules

For each bug, crop both screenshots to visually highlight the problem area.

**Focus on the problem place.**
Each crop must be centered on the specific element that differs — not the whole page, not the whole component. The viewer should immediately see what is wrong without scanning.

**Same height for both sides.**
The frontend crop and design crop in each bug card must be scaled to the same pixel height. Never let one side be taller or shorter than the other.

**Minimum height: 100px.**
No screenshot may render shorter than 100px. Thin strips (e.g. breadcrumb bars) must be scaled up to meet this minimum.

**Exclude the sidebar.**
Never include the sidebar navigation in any crop. Use DevTools `getBoundingClientRect()` or pixel scanning to find where the sidebar ends before cropping.

**Zoom level: 2× default, 3× for small/thin elements.**
Scale crops up by 2× for normal elements. Use 3× for thin rows (table headers, breadcrumbs, single-line labels).

**Before taking any screenshot: close DevTools completely.**
After running any JS console command, close DevTools entirely before taking the screenshot. Never take a screenshot while DevTools is open, the console is visible, or any element is highlighted by the inspector. The DevTools inspector overlay causes orange/yellow tinting that covers the element and makes the screenshot unusable. If a screenshot comes out with an orange overlay — discard it, close DevTools, and retake it.

### How to crop

For each bug individually:
1. Get the bounding box of the problem element:
   `const r = document.querySelector('SELECTOR').getBoundingClientRect(); console.log(r.top, r.left, r.width, r.height)`
2. Determine the crop window:
   - Center the crop on the element: `cropX = r.left + r.width/2 - cropWidth/2`
   - Use cropWidth = element width + 120px padding each side (minimum 300px total)
   - Use cropHeight = element height + 40px padding top and bottom (minimum 100px)
   - **The element must appear in the horizontal center of the crop — never at the left or right edge**
3. Strip the sidebar: if `cropX < sidebarWidth`, shift cropX right so the crop starts at `sidebarWidth + 8px`. Then re-center: recalculate so the element is still centered within the remaining crop window.
4. Take the browser screenshot crop of that exact window.

5. Find the matching area in the Figma screenshot:
   - Locate the exact same element in the Figma image (same component, same layout position)
   - Crop the same relative area around that element — same padding, same centering logic
   - If the bug is about a text element, crop that text in Figma — not the surrounding container
   - Visually verify: both crops must show the same UI element, just styled differently. If they look like different things, re-crop.

6. Scale both crops to the same height (use the taller of the two, then apply zoom multiplier)
7. Ensure height ≥ 100px after scaling

### Centering checklist — verify before embedding
- [ ] The bug element is horizontally centered in the frontend crop (equal space left and right)
- [ ] The bug element is horizontally centered in the Figma crop (equal space left and right)
- [ ] No sidebar pixels appear in either crop
- [ ] The text or element being compared is fully visible — not cut off at any edge

---

## Report format

**File name:** `design-review-[feature-name]-[YYYY-MM-DD].html`
Get real date before generating: `new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: '2-digit' })`

Generate ONE HTML file only. Write it directly to disk using the file write tool — nothing else. Do NOT open new tabs, do NOT use blob URLs, do NOT use window.open(), do NOT use URL.createObjectURL(), do NOT trigger any browser navigation. Write it once and only once. If something fails — report the error.

The report structure and visual design must be identical for every session — never improvise or vary the layout.

**Structure:**
- Header: title as "[Feature Name] Design review" (sentence case) · date
- If Figma link provided: show as clickable "🔗 Link to Actual Designs"
- If no Figma link: show a visible notice banner — "No design link attached. Ask the designer for the Figma link before reviewing." — bg #fffbeb / border #fde68a / text #92400e
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

CRITICAL: every bug card MUST include both screenshots as actual embedded base64 images — Design on the left, Frontend on the right. Never replace a screenshot with text, a description, a placeholder, an empty box, or HTML/CSS recreations of the element. Only real cropped screenshots from the browser and Figma image are allowed. A card without real embedded images is invalid and must not be generated.

- Design always left, Frontend always right
- Screenshot section background: #fafafa · card header background: #f1f3f7
- Each screenshot container: min-height 200px · vertical divider between the two sides
- Label pills: "Design — expected" / "Frontend — current" — bg #f8fafc / text #1e293b · 4px radius · small padding
- Expected: green #16a34a · Actual: red #dc2626
- CRIT badge: bg #fef2f2 / text #b91c1c / border #fecaca
- Minor badge: bg #f8fafc / text #475569 / border #cbd5e1
- Footer: "Generated by Claude Design Review · [date]"

**Styling:** white cards on #f4f5f7 page · 1px border #e2e4e9 · 12px radius · max-width 1040px centered · system font stack (-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)

---

## Start
The Figma screenshot is provided above. Begin with Step 0.
