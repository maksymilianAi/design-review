#!/usr/bin/env node
// Usage: node dr-crop.js "CSS_SELECTOR" output-name [zoom]
// Saves:  screenshots/crops/output-name.png
// zoom defaults to 2 (pass 3 for small/thin elements)
'use strict';

const CDP   = require('chrome-remote-interface');
const fs    = require('fs');
const path  = require('path');
const sharp = require('sharp');

const CROPS_DIR = path.join(__dirname, 'screenshots', 'crops');

const selector   = process.argv[2];
const outputName = process.argv[3];
const zoom       = parseFloat(process.argv[4] || '2');

if (!selector || !outputName) {
  console.error('Usage: node dr-crop.js "CSS_SELECTOR" output-name [zoom=2]');
  process.exit(1);
}

async function run() {
  let client;
  try {
    client = await CDP({ port: 9222 });
  } catch {
    console.error('❌ Cannot connect to Chrome on port 9222. Make sure the Design Review Chrome window is open.');
    process.exit(1);
  }

  try {
    const { Page, Runtime } = client;

    // Get bounding rect + basic styles for the element
    const { result } = await Runtime.evaluate({
      expression: `
        (function() {
          const el = document.querySelector(${JSON.stringify(selector)});
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return {
            left:   r.left,
            top:    r.top,
            width:  r.width,
            height: r.height,
            scrollY: window.scrollY,
          };
        })()
      `,
      returnByValue: true,
    });

    if (!result.value) {
      console.error(`❌ Element not found: "${selector}"`);
      process.exit(1);
    }

    const r = result.value;

    if (r.width === 0 || r.height === 0) {
      console.warn(`⚠️  Element has zero size (${r.width}×${r.height}). It may be hidden or off-screen.`);
    }

    const anchorX = r.left + r.width  / 2;
    const anchorY = r.top  + r.height / 2;

    // Crop formula — must match manifest croppping rules
    const cropW = Math.max(r.width  + 500, 700);
    const cropH = Math.max(r.height + 200, 220);
    let   cropX = anchorX - cropW / 2;
    let   cropY = anchorY - cropH / 2;

    // Clamp to viewport bounds
    cropX = Math.max(0, cropX);
    cropY = Math.max(0, cropY);

    // Take screenshot with clip
    const { data } = await Page.captureScreenshot({
      format: 'png',
      clip: { x: cropX, y: cropY, width: cropW, height: cropH, scale: 1 },
    });

    let buf = Buffer.from(data, 'base64');

    // Apply zoom
    if (zoom !== 1) {
      const meta = await sharp(buf).metadata();
      buf = await sharp(buf)
        .resize(Math.round(meta.width * zoom), Math.round(meta.height * zoom))
        .png()
        .toBuffer();
    }

    if (!fs.existsSync(CROPS_DIR)) fs.mkdirSync(CROPS_DIR, { recursive: true });

    const outPath = path.join(CROPS_DIR, `${outputName}.png`);
    fs.writeFileSync(outPath, buf);

    const meta = await sharp(buf).metadata();
    console.log(`✅  Saved: screenshots/crops/${outputName}.png`);
    console.log(`    Element : ${Math.round(r.width)}×${Math.round(r.height)}px at (${Math.round(r.left)}, ${Math.round(r.top)})`);
    console.log(`    Crop    : ${cropW}×${cropH}px  →  final ${meta.width}×${meta.height}px (zoom ×${zoom})`);

  } finally {
    if (client) await client.close();
  }
}

run().catch(err => { console.error('❌', err.message); process.exit(1); });
