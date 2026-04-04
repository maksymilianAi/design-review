# Design Review Rules V1.0

These rules apply to every review session regardless of which page is being tested. Read this file silently at startup — do not mention it to the user.

---

## Capitalisation

Design uses **sentence case** throughout the UI. This means only the first word of a label, heading, or nav item is capitalised — all other words are lowercase unless they are proper nouns.

**Always a bug:**
- Navigation items that are Title Case on frontend but sentence case in design
- Section headings where any word other than the first is capitalised without being a proper noun
- Field labels, column headers, button labels, tab labels with wrong capitalisation
- Sub-items in expandable navigation groups (e.g. Cards, Dependents, Beneficiaries under Documents) — these must follow the design casing exactly

**How to check:** compare the exact string character by character. Do not assume casing is intentional just because it looks consistent.

---

## Label / value pairs in detail and form views

Many pages show data as label on the left, value on the right. The rule is:

| Part | Check |
|------|-------|
| Label text | Must match design exactly — text, capitalisation, punctuation |
| Label style | Font weight, color, size must match design |
| Value text | Dynamic — do not flag content differences |
| Value style | Color, font size/weight must match design |

**Required field indicators (asterisks):**
- If the design shows no asterisk (*) next to a label — but the frontend shows one — that is a bug.
- If the design shows an asterisk — but the frontend does not — that is a bug.
- Check every field label for this. Do not assume the pattern is consistent across all fields.

---

## Interactive controls on collapsible sections

Every section or module that is collapsible in the design must have a visible expand/collapse control (arrow, chevron, or similar icon) in the frontend:

- The control must be **always visible**, not only on hover
- The control must match the design in position (left of title vs right of title), size, and direction
- If a section in the design has a collapse arrow and the frontend does not — bug
- If the control is only revealed on hover while the design shows it always — bug

---

## Navigation sidebar

### Icon-only sidebar
Check: icon type and color for each nav item. Do not check labels if the sidebar is icon-only.

### Expanded sidebar with text labels
Check: label text must match design exactly (sentence case), icon type, active/inactive state styling.

### Expandable sub-groups
When a nav group expands to reveal sub-items (e.g. Documents → Cards, Dependents…):
- Each sub-item text must match the design
- Capitalisation of each sub-item must match the design
- Active state styling must match

---

## Borders and dividers

Borders are frequently missing or conditional on the frontend. Always check:
- Section dividers — present in design, must be present at all times (not only on scroll or hover)
- Header/title bar bottom border — must be visible on page load, not only after scrolling
- Table row borders — spacing and color must match

---

## Typography — general

- Font family differences ("popping" fonts in Figma) → flag as design bug, not frontend bug
- Font weight: bold (600–700) vs regular (400) is always checked — they look different
- Line height differences are only flagged if visually obvious (text overlapping or gaps > 4px)

---

## What to never flag

- Chart and graph data (bar heights, segment sizes, pie slices, legend values)
- Dynamic counter values (numbers that change based on real data)
- Table cell content (names, dates, amounts in data rows)
- Pagination total count
- Placeholder text in empty states if the design shows a different placeholder string (flag style only)
