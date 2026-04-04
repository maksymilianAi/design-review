#!/usr/bin/env node
// Captures a full-page screenshot of the current browser tab via CDP.
// Usage: node dr.js
// Saves: screenshots/frontend-latest.png  +  screenshots/frontend-TIMESTAMP.png
'use strict';

const CDP  = require('chrome-remote-interface');
const fs   = require('fs');
const path = require('path');

const TARGET_WIDTH    = 1440;
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

async function run() {
  // ── Connect to Chrome ────────────────────────────────────────────────────
  let client;
  try {
    client = await CDP({ port: 9222 });
  } catch {
    console.error('❌ Cannot connect to Chrome. Make sure the Design Review app is open and the Chrome window it launched is still running.');
    process.exit(1);
  }

  try {
    const { Page, Runtime, Emulation } = client;

    // Take screenshot FIRST — before any JS evaluation.
    // Evaluations can trigger SPA data re-fetches and show a loading spinner.
    const { data: immediateData } = await Page.captureScreenshot({ format: 'png' });

    // Now safe to evaluate
    const { result: urlResult } = await Runtime.evaluate({ expression: 'location.href' });
    console.log(`📄 Page: ${urlResult.value}`);

    const { result: widthResult } = await Runtime.evaluate({ expression: 'document.documentElement.clientWidth' });
    const actualWidth = widthResult.value;
    if (actualWidth !== TARGET_WIDTH) {
      console.error(`❌ Viewport is ${actualWidth}px wide, expected ${TARGET_WIDTH}px. Stopping.`);
      process.exit(1);
    }
    console.log(`✅ Viewport: ${actualWidth}px`);

    const { result: scrollHeightResult } = await Runtime.evaluate({
      expression: 'Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)',
    });
    const fullHeight = Math.ceil(scrollHeightResult.value);
    console.log(`✅ Full page height: ${fullHeight}px`);

    let buffer = Buffer.from(immediateData, 'base64');

    // If the instant screenshot didn't capture the full page, scroll+stitch
    const sharp = require('sharp');
    const meta  = await sharp(buffer).metadata();

    if (meta.height < fullHeight * 0.95) {
      console.log(`⚠️  Screenshot height ${meta.height}px < expected ${fullHeight}px — falling back to scroll+stitch`);

      const VIEWPORT_HEIGHT = 900;
      await Emulation.setDeviceMetricsOverride({
        width: TARGET_WIDTH, height: VIEWPORT_HEIGHT, deviceScaleFactor: 1, mobile: false,
      });
      await new Promise(r => setTimeout(r, 200));

      const slices = [];
      let scrollY = 0;
      while (scrollY < fullHeight) {
        await Runtime.evaluate({ expression: `window.scrollTo(0, ${scrollY})` });
        await new Promise(r => setTimeout(r, 150));
        const { data: sliceData } = await Page.captureScreenshot({ format: 'png' });
        const sliceHeight = Math.min(VIEWPORT_HEIGHT, fullHeight - scrollY);
        const sliceBuf = await sharp(Buffer.from(sliceData, 'base64'))
          .extract({ left: 0, top: 0, width: TARGET_WIDTH, height: sliceHeight })
          .toBuffer();
        slices.push(sliceBuf);
        scrollY += sliceHeight;
      }

      await Runtime.evaluate({ expression: 'window.scrollTo(0, 0)' });

      const compositeInput = [];
      let yOffset = 0;
      for (const slice of slices) {
        compositeInput.push({ input: slice, top: yOffset, left: 0 });
        const sm = await sharp(slice).metadata();
        yOffset += sm.height;
      }
      buffer = await sharp({
        create: { width: TARGET_WIDTH, height: fullHeight, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
      }).composite(compositeInput).png().toBuffer();
      console.log(`✅ Scroll+stitch: ${slices.length} slices → ${fullHeight}px`);
    }

    if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename  = `frontend-${timestamp}.png`;

    fs.writeFileSync(path.join(SCREENSHOTS_DIR, filename), buffer);
    fs.writeFileSync(path.join(SCREENSHOTS_DIR, 'frontend-latest.png'), buffer);
    console.log(`✅ Screenshot saved: screenshots/${filename}`);

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    if (client) await client.close();
  }

  console.log('\n─────────────────────────────────────────────');
  console.log('Frontend screenshot ready. In Claude Code type: dr');
  console.log('─────────────────────────────────────────────\n');
}

run();
