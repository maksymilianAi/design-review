#!/usr/bin/env node
// Generates the HTML design review report from pre-saved crop images.
//
// Expected files in screenshots/crops/ before running:
//   fe_bug1.png  …  fe_bugN.png    — frontend crops (taken by Claude via dr-crop.js)
//   fig_bug1.png …  fig_bugN.png   — Figma crops (saved by Claude via get_screenshot MCP)
//
// Bug metadata is passed as a JSON file: screenshots/bugs.json
// Format:
// [
//   { "num": 1, "component": "...", "property": "...", "expected": "...", "actual": "...", "severity": "CRIT|Minor" },
//   ...
// ]
//
// Usage: node generate-report.js [feature-name]
// Output: ~/Desktop/design-review-[feature-name]-YYYY-MM-DD.html
'use strict';

const fs   = require('fs');
const path = require('path');
const sharp = require('sharp');

const CROPS_DIR  = path.join(__dirname, 'screenshots', 'crops');
const BUGS_PATH  = path.join(__dirname, 'screenshots', 'bugs.json');
const featureName = (process.argv[2] || 'review').toLowerCase().replace(/\s+/g, '-');

// ── Date ─────────────────────────────────────────────────────────────────────
const today = new Date();
const dateISO    = today.toISOString().slice(0, 10);                          // 2026-04-04
const dateHuman  = today.toLocaleDateString('en-US', {                        // April 04, 2026
  year: 'numeric', month: 'long', day: '2-digit',
});

// ── Helpers ───────────────────────────────────────────────────────────────────
const toB64 = buf => `data:image/png;base64,${buf.toString('base64')}`;

async function scaleToHeight(buf, targetH) {
  const meta = await sharp(buf).metadata();
  if (meta.height === targetH) return buf;
  const ratio = targetH / meta.height;
  return sharp(buf).resize(Math.round(meta.width * ratio), targetH).png().toBuffer();
}

// ── Bug card HTML ─────────────────────────────────────────────────────────────
function renderCard(bug, figmaB64, feB64) {
  return `
<div class="card">
  <div class="card-header">
    <span class="comp">${bug.component.toUpperCase()}</span>
    <span class="bug-num">Bug #${bug.num}</span>
  </div>
  <div class="screenshots">
    <div class="side">
      <div class="pill">Design — expected</div>
      <img src="${figmaB64}" alt="Design">
    </div>
    <div class="divider"></div>
    <div class="side">
      <div class="pill">Frontend — current</div>
      <img src="${feB64}" alt="Frontend">
    </div>
  </div>
  <div class="prop-row">
    <div class="prop-cell label-cell">${bug.property}</div>
    <div class="prop-cell expected-cell">${bug.expected}</div>
    <div class="prop-cell actual-cell">${bug.actual}</div>
  </div>
</div>`;
}

// ── Page HTML ─────────────────────────────────────────────────────────────────
function buildPage(cards, bugs, figmaUrl) {
  const total = bugs.length;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${featureName} design review</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #f4f5f7; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; padding: 40px 20px; }
  .wrapper { max-width: 1040px; margin: 0 auto; }

  .page-header { margin-bottom: 28px; }
  .page-header h1 { font-size: 22px; font-weight: 600; color: #0f172a; margin-bottom: 8px; }
  .meta { font-size: 14px; color: #64748b; display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
  .figma-link { color: #2563eb; text-decoration: none; }
  .figma-link:hover { text-decoration: underline; }

  .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 32px; }
  .summary-card { background: #fff; border: 1px solid #e2e4e9; border-radius: 10px; padding: 20px; text-align: center; }
  .s-num   { font-size: 34px; font-weight: 700; color: #0f172a; }
  .s-label { font-size: 13px; color: #64748b; margin-top: 4px; }

  .card { background: #fff; border: 1px solid #e2e4e9; border-radius: 12px; margin-bottom: 24px; overflow: hidden; }
  .card-header { display: flex; align-items: center; justify-content: space-between; background: #f1f3f7; padding: 14px 20px; border-bottom: 1px solid #e2e4e9; }
  .comp    { font-size: 12px; font-weight: 700; letter-spacing: 0.06em; color: #475569; }
  .bug-num { font-size: 13px; color: #64748b; }

  .screenshots { display: flex; align-items: flex-start; background: #fafafa; min-height: 200px; padding: 20px; }
  .side { flex: 1; display: flex; flex-direction: column; gap: 8px; }
  .side img { max-width: 100%; border-radius: 6px; border: 1px solid #e2e4e9; }
  .divider { width: 1px; background: #e2e4e9; align-self: stretch; margin: 0 20px; flex-shrink: 0; }
  .pill { background: #f8fafc; color: #1e293b; font-size: 11px; font-weight: 500; padding: 3px 10px; border-radius: 4px; border: 1px solid #e2e4e9; align-self: flex-start; }

  .prop-row { display: grid; grid-template-columns: 1fr 1fr 1fr; border-top: 1px solid #e2e4e9; }
  .prop-cell { padding: 12px 16px; font-size: 13px; border-right: 1px solid #e2e4e9; }
  .prop-cell:last-child { border-right: none; }
  .label-cell    { color: #475569; font-weight: 500; }
  .expected-cell { color: #16a34a; font-weight: 500; }
  .actual-cell   { color: #dc2626; font-weight: 500; }

  .footer { text-align: center; font-size: 12px; color: #94a3b8; margin-top: 40px; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="page-header">
    <h1>${featureName.replace(/-/g, ' ')} design review</h1>
    <div class="meta">
      <span>${dateHuman}</span>
      ${figmaUrl ? `<a href="${figmaUrl}" class="figma-link" target="_blank">🔗 Link to Actual Designs</a>` : ''}
    </div>
  </div>

  <div class="summary">
    <div class="summary-card"><div class="s-num">${total}</div><div class="s-label">Total Bugs</div></div>
    <div class="summary-card"><div class="s-num">${bugs.filter(b => b.severity === 'CRIT').length}</div><div class="s-label">Critical</div></div>
    <div class="summary-card"><div class="s-num">${bugs.filter(b => b.severity !== 'CRIT').length}</div><div class="s-label">Minor</div></div>
  </div>

  ${cards.join('\n')}

  <div class="footer">Generated by Claude Design Review · ${dateHuman}</div>
</div>
</body>
</html>`;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function run() {
  if (!fs.existsSync(BUGS_PATH)) {
    console.error(`❌ bugs.json not found at ${BUGS_PATH}`);
    console.error('   Claude should write this file before calling generate-report.js');
    process.exit(1);
  }

  let bugs;
  try {
    bugs = JSON.parse(fs.readFileSync(BUGS_PATH, 'utf8'));
  } catch {
    console.error('❌ bugs.json is not valid JSON. Check that Claude wrote it correctly before running this script.');
    process.exit(1);
  }
  if (!Array.isArray(bugs) || bugs.length === 0) {
    console.error('❌ bugs.json must be a non-empty array. Got:', typeof bugs);
    process.exit(1);
  }
  const missingFields = bugs.find(b => !b.num || !b.component || !b.property || !b.expected || !b.actual);
  if (missingFields) {
    console.error(`❌ Bug #${missingFields.num ?? '?'} is missing required fields (num, component, property, expected, actual).`);
    process.exit(1);
  }
  const figmaUrl = bugs[0]?.figmaUrl || null;

  console.log(`Building report for ${bugs.length} bugs…`);
  const cards = [];

  for (const bug of bugs) {
    const figmaPath = path.join(CROPS_DIR, `fig_bug${bug.num}.png`);
    const fePath    = path.join(CROPS_DIR, `fe_bug${bug.num}.png`);

    if (!fs.existsSync(figmaPath)) { console.error(`❌ Missing: ${figmaPath}`); process.exit(1); }
    if (!fs.existsSync(fePath))    { console.error(`❌ Missing: ${fePath}`);    process.exit(1); }

    let figmaBuf = fs.readFileSync(figmaPath);
    let feBuf    = fs.readFileSync(fePath);

    // Scale both sides to the same height
    const figmaMeta = await sharp(figmaBuf).metadata();
    const feMeta    = await sharp(feBuf).metadata();
    const targetH   = Math.max(figmaMeta.height, feMeta.height, 150);

    figmaBuf = await scaleToHeight(figmaBuf, targetH);
    feBuf    = await scaleToHeight(feBuf, targetH);

    cards.push(renderCard(bug, toB64(figmaBuf), toB64(feBuf)));
    console.log(`  Bug ${bug.num} ✓`);
  }

  const outPath = path.join(process.env.HOME, 'Desktop', `design-review-${featureName}-${dateISO}.html`);
  fs.writeFileSync(outPath, buildPage(cards, bugs, figmaUrl), 'utf8');
  console.log(`\nReport generated: design-review-${featureName}-${dateISO}.html`);
}

run().catch(err => { console.error('❌', err.message); process.exit(1); });
