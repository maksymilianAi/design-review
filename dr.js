#!/usr/bin/env node

const CDP = require('chrome-remote-interface');
const fs = require('fs');
const path = require('path');
const https = require('https');

const TARGET_WIDTH = 1440;
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
const MANIFEST_URL = 'https://raw.githubusercontent.com/maksymilianAi/Manifest_DR/main/manifest.md';
const MANIFEST_PATH = path.join(__dirname, 'manifest.md');

function fetchManifest() {
  return new Promise((resolve, reject) => {
    https.get(MANIFEST_URL, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`GitHub returned ${res.statusCode}`));
        return;
      }
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        fs.writeFileSync(MANIFEST_PATH, data);
        resolve();
      });
    }).on('error', reject);
  });
}

async function run() {
  let client;

  // Fetch latest manifest from GitHub
  process.stdout.write('⬇️  Fetching latest manifest... ');
  try {
    await fetchManifest();
    console.log('done');
  } catch (err) {
    console.log(`\n⚠️  Could not fetch manifest: ${err.message}`);
    if (!fs.existsSync(MANIFEST_PATH)) {
      console.error('❌ No local manifest found either. Cannot proceed.');
      process.exit(1);
    }
    console.log('   Using cached local version.');
  }

  try {
    client = await CDP({ port: 9222 });
  } catch (err) {
    console.error('❌ Cannot connect to Chrome.');
    console.error('   Make sure Chrome is running with the debugging port:');
    console.error('\n   npm run chrome\n');
    console.error('   ⚠️  Chrome must be launched fresh (quit it first if already open)');
    process.exit(1);
  }

  try {
    const { Page, Runtime, Emulation } = client;

    await Page.enable();
    await Runtime.enable();

    // Get current URL for reference
    const { result: urlResult } = await Runtime.evaluate({ expression: 'location.href' });
    console.log(`📄 Page: ${urlResult.value}`);

    // Get full page height
    const { contentSize } = await Page.getLayoutMetrics();

    // Set 1440px viewport, full page height
    await Emulation.setDeviceMetricsOverride({
      width: TARGET_WIDTH,
      height: Math.ceil(contentSize.height),
      deviceScaleFactor: 1,
      mobile: false,
    });

    // Verify width
    const { result: widthResult } = await Runtime.evaluate({
      expression: 'document.documentElement.clientWidth',
    });

    const actualWidth = widthResult.value;
    if (actualWidth !== TARGET_WIDTH) {
      console.error(`❌ Viewport is ${actualWidth}px, expected ${TARGET_WIDTH}px. Stopping.`);
      process.exit(1);
    }

    console.log(`✅ Viewport: ${actualWidth}px`);

    // Take screenshot
    const { data } = await Page.captureScreenshot({ format: 'png' });

    // Save files
    if (!fs.existsSync(SCREENSHOTS_DIR)) {
      fs.mkdirSync(SCREENSHOTS_DIR);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `frontend-${timestamp}.png`;
    const filepath = path.join(SCREENSHOTS_DIR, filename);
    const latestPath = path.join(SCREENSHOTS_DIR, 'frontend-latest.png');

    const buffer = Buffer.from(data, 'base64');
    fs.writeFileSync(filepath, buffer);
    fs.writeFileSync(latestPath, buffer);

    console.log(`✅ Screenshot: screenshots/${filename}`);
    console.log(`✅ Also saved:  screenshots/frontend-latest.png`);
    console.log('\n─────────────────────────────────────────────');
    console.log('Next: drag your Figma screenshot into Claude Code and type "dr"');
    console.log('─────────────────────────────────────────────\n');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    if (client) await client.close();
  }
}

run();
