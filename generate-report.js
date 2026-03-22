#!/usr/bin/env node

const CDP = require('chrome-remote-interface');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const os = require('os');
const FIGMA_PATH  = path.join(__dirname, 'screenshots/figma-latest.png');
const FRONTEND_PATH = path.join(__dirname, 'screenshots/frontend-latest.png');
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
const OUTPUT_DIR  = path.join(os.homedir(), 'Desktop');
const DESIGN_VIEWPORT = 1440;
const PADDING_H = 16;
const PADDING_V = 10;
const ZOOM = 2;

// ─── Session config (update each run) ────────────────────────────────────────
const FIGMA_LINK    = 'https://www.figma.com/design/i6FM9wHcXPNjV2W3rfd18r/PP-1?node-id=19890-236099&t=rNkksWZJyFwtTpNR-4';
const DATE_ISO      = '2026-03-21';
const DATE_DISPLAY  = 'March 21, 2026';
const FEATURE       = 'expense-details';
const FEATURE_TITLE = 'Expense Details';

const BUGS = [
  { id: 1, component: 'Breadcrumb', property: 'Content & structure', expected: '← Back · Elevate / Expense Details', actual: 'Home / Expense details', elementKey: 'breadcrumb', severity: 'CRIT', paddingH: 80 },
  { id: 2, component: 'Breadcrumb', property: 'Text case', expected: 'Expense Details (capital D)', actual: 'Expense details (lowercase d)', elementKey: 'breadcrumb', severity: 'Minor', paddingH: 80 },
  { id: 3, component: 'Expense Breakdown', property: 'Total amount color', expected: '#000000', actual: '#176AF6', elementKey: 'total', severity: 'CRIT' },
  { id: 4, component: 'Expenses table', property: 'Provider column header', expected: 'Provider', actual: '(empty)', elementKey: 'tableHeader', severity: 'CRIT' },
];
// ─────────────────────────────────────────────────────────────────────────────

const QUERIES = {
  // Breadcrumb: must be near top of page (y < 150) to avoid matching pagination
  breadcrumb: `(() => {
    const tries = ['[aria-label="breadcrumb"]', 'nav[aria-label]', '[class*="breadcrumb" i]', '[class*="Breadcrumb"]'];
    for (const s of tries) {
      const el = document.querySelector(s);
      if (el) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0 && r.height < 80 && r.top < 150) return JSON.stringify(r.toJSON());
      }
    }
    // Fallback: small element with "/" near the top of the page
    const all = [...document.querySelectorAll('*')];
    const match = all.find(el => {
      const r = el.getBoundingClientRect();
      return r.top > 0 && r.top < 150 && r.height > 0 && r.height < 60 && r.width > 100
        && el.textContent.includes('/') && el.children.length < 8;
    });
    if (match) { const r = match.getBoundingClientRect(); return JSON.stringify(r.toJSON()); }
    return null;
  })()`,

  // Table header row for Expenses table
  tableHeader: `(() => {
    const selectors = ['thead tr', '[role="rowgroup"] [role="row"]', '[class*="table-header" i] [role="row"]', '[class*="TableHeader"]', 'table thead tr'];
    for (const s of selectors) {
      const el = document.querySelector(s);
      if (el) { const r = el.getBoundingClientRect(); if (r.width > 300 && r.height > 0) return JSON.stringify(r.toJSON()); }
    }
    // Fallback: find row containing known column headers
    const all = [...document.querySelectorAll('tr, [role="row"]')];
    const match = all.find(el => {
      const t = el.textContent;
      const r = el.getBoundingClientRect();
      return (t.includes('Requested') || t.includes('Provider') || t.includes('Status')) && r.width > 300 && r.height > 0 && r.height < 80;
    });
    if (match) { const r = match.getBoundingClientRect(); return JSON.stringify(r.toJSON()); }
    return null;
  })()`,

  // Total amount: "Total: $X" label in top-right of expense breakdown card
  total: `(() => {
    const all = [...document.querySelectorAll('*')];
    // Find the smallest element whose text starts with "Total" and is in the upper part of the page
    const match = all.find(el => {
      const t = el.textContent.trim();
      const r = el.getBoundingClientRect();
      return t.match(/^Total[:\s]/) && r.width < 400 && r.height < 80 && r.height > 0 && r.top < 400;
    });
    if (match) { const r = match.getBoundingClientRect(); return JSON.stringify(r.toJSON()); }
    return null;
  })()`,
};

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

async function cropImage(srcPath, rect, imgW, imgH, scale = 1, padH = PADDING_H) {
  const l = clamp(Math.round((rect.left - padH) * scale), 0, imgW - 2);
  const t = clamp(Math.round((rect.top  - PADDING_V) * scale), 0, imgH - 2);
  const w = clamp(Math.round((rect.width  + padH * 2) * scale), 1, imgW - l);
  const h = clamp(Math.round((rect.height + PADDING_V * 2) * scale), 1, imgH - t);

  const zoomedW = Math.round(w * ZOOM / scale);
  const zoomedH = Math.round(h * ZOOM / scale);
  const finalH  = Math.max(zoomedH, 100);
  const finalW  = Math.round(zoomedW * finalH / zoomedH);

  const buf = await sharp(srcPath)
    .extract({ left: l, top: t, width: w, height: h })
    .resize({ width: finalW, height: finalH, fit: 'fill' })
    .png()
    .toBuffer();

  return buf.toString('base64');
}

function bugCard(bug, frontendB64, figmaB64) {
  const badgeBg   = bug.severity === 'CRIT' ? '#fef2f2' : '#f8fafc';
  const badgeText = bug.severity === 'CRIT' ? '#b91c1c'  : '#475569';
  const badgeBrd  = bug.severity === 'CRIT' ? '#fecaca'  : '#cbd5e1';

  return `
  <div style="background:#fff;border:1px solid #e2e4e9;border-radius:12px;overflow:hidden;margin-bottom:24px;">
    <div style="background:#f1f3f7;padding:14px 20px;display:flex;align-items:center;justify-content:space-between;">
      <span style="font-weight:600;font-size:13px;letter-spacing:.05em;color:#1e293b;text-transform:uppercase;">${bug.component}</span>
      <div style="display:flex;align-items:center;gap:10px;">
        <span style="font-size:13px;color:#64748b;">Bug #${bug.id}</span>
        <span style="font-size:11px;font-weight:600;padding:3px 8px;border-radius:4px;border:1px solid ${badgeBrd};background:${badgeBg};color:${badgeText};">${bug.severity}</span>
      </div>
    </div>
    <div style="display:flex;border-bottom:1px solid #e2e4e9;">
      <div style="flex:1;padding:16px;background:#fafafa;display:flex;flex-direction:column;align-items:center;gap:8px;border-right:1px solid #e2e4e9;">
        <span style="font-size:11px;font-weight:500;padding:3px 10px;background:#f8fafc;color:#1e293b;border-radius:4px;border:1px solid #e2e4e9;">Design — expected</span>
        <img src="data:image/png;base64,${figmaB64}" style="max-width:100%;border-radius:4px;" />
      </div>
      <div style="flex:1;padding:16px;background:#fafafa;display:flex;flex-direction:column;align-items:center;gap:8px;">
        <span style="font-size:11px;font-weight:500;padding:3px 10px;background:#f8fafc;color:#1e293b;border-radius:4px;border:1px solid #e2e4e9;">Frontend — current</span>
        <img src="data:image/png;base64,${frontendB64}" style="max-width:100%;border-radius:4px;" />
      </div>
    </div>
    <div style="padding:14px 20px;display:grid;grid-template-columns:120px 1fr 1fr;gap:16px;font-size:13px;">
      <span style="color:#64748b;">${bug.property}</span>
      <span style="color:#16a34a;">${bug.expected}</span>
      <span style="color:#dc2626;">${bug.actual}</span>
    </div>
  </div>`;
}

function generateHTML(cards) {
  const total  = BUGS.length;
  const crits  = BUGS.filter(b => b.severity === 'CRIT').length;
  const minors = BUGS.filter(b => b.severity === 'Minor').length;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${FEATURE_TITLE} design review</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #f4f5f7; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px 20px; color: #1e293b; }
  .wrap { max-width: 1040px; margin: 0 auto; }
  h1 { font-size: 22px; font-weight: 700; }
  .meta { font-size: 13px; color: #64748b; margin-top: 4px; }
  .figma-link { display:inline-flex;align-items:center;gap:6px;margin-top:12px;font-size:13px;color:#2563eb;text-decoration:none;border:1px solid #bfdbfe;background:#eff6ff;padding:6px 12px;border-radius:6px; }
  .summary { display:flex;gap:16px;margin:24px 0; }
  .stat { flex:1;background:#fff;border:1px solid #e2e4e9;border-radius:10px;padding:16px;text-align:center; }
  .stat-n { font-size:28px;font-weight:700; }
  .stat-l { font-size:12px;color:#64748b;margin-top:4px; }
  .footer { text-align:center;font-size:12px;color:#94a3b8;margin-top:32px; }
</style>
</head>
<body>
<div class="wrap">
  <div style="margin-bottom:24px;">
    <h1>${FEATURE_TITLE} design review</h1>
    <div class="meta">${DATE_DISPLAY}</div>
    <a class="figma-link" href="${FIGMA_LINK}" target="_blank">🔗 Link to Actual Designs</a>
  </div>
  <div class="summary">
    <div class="stat"><div class="stat-n">${total}</div><div class="stat-l">Total Bugs</div></div>
    <div class="stat"><div class="stat-n" style="color:#b91c1c;">${crits}</div><div class="stat-l">Critical</div></div>
    <div class="stat"><div class="stat-n" style="color:#475569;">${minors}</div><div class="stat-l">Minor</div></div>
  </div>
  ${cards.join('\n')}
  <div class="footer">Generated by Claude Design Review · ${DATE_DISPLAY}</div>
</div>
</body>
</html>`;
}

function cleanup() {
  if (!fs.existsSync(SCREENSHOTS_DIR)) return;
  for (const f of fs.readdirSync(SCREENSHOTS_DIR)) {
    fs.unlinkSync(path.join(SCREENSHOTS_DIR, f));
  }
  fs.rmdirSync(SCREENSHOTS_DIR);
  console.log('Screenshots cleaned up.');
}

async function main() {
  console.log('Connecting to Chrome...');
  let client;
  try {
    client = await CDP({ port: 9222 });
  } catch {
    console.error('❌ Cannot connect to Chrome. Run: npm run chrome');
    process.exit(1);
  }

  const { Runtime } = client;
  await Runtime.enable();

  const frontendMeta = await sharp(FRONTEND_PATH).metadata();
  const figmaMeta    = await sharp(FIGMA_PATH).metadata();
  const figmaScale   = figmaMeta.width / DESIGN_VIEWPORT;

  console.log(`Frontend: ${frontendMeta.width}×${frontendMeta.height}`);
  console.log(`Figma:    ${figmaMeta.width}×${figmaMeta.height} (scale: ${figmaScale.toFixed(2)}x)`);

  const rects = {};
  for (const [key, query] of Object.entries(QUERIES)) {
    const { result } = await Runtime.evaluate({ expression: query });
    if (result.value) {
      rects[key] = JSON.parse(result.value);
      console.log(`✅ Found [${key}]: top=${rects[key].top.toFixed(0)} left=${rects[key].left.toFixed(0)} w=${rects[key].width.toFixed(0)} h=${rects[key].height.toFixed(0)}`);
    } else {
      console.warn(`⚠️  Element not found: ${key}`);
    }
  }

  await client.close();

  const cards = [];
  for (const bug of BUGS) {
    const rect = rects[bug.elementKey];
    if (!rect) {
      console.warn(`⚠️  Skipping crop for bug #${bug.id} — element [${bug.elementKey}] not found`);
      continue;
    }
    const padH = bug.paddingH || PADDING_H;
    const frontendB64 = await cropImage(FRONTEND_PATH, rect, frontendMeta.width, frontendMeta.height, 1,          padH);
    const figmaB64    = await cropImage(FIGMA_PATH,    rect, figmaMeta.width,    figmaMeta.height,    figmaScale, padH);
    cards.push(bugCard(bug, frontendB64, figmaB64));
    console.log(`✅ Bug #${bug.id} cropped`);
  }

  const filename = `design-review-${FEATURE}-${DATE_ISO}.html`;
  fs.writeFileSync(path.join(OUTPUT_DIR, filename), generateHTML(cards));
  console.log(`\nReport generated: ${filename}`);

  cleanup();
}

main();
