#!/usr/bin/env node
require('dotenv').config({ path: require('path').join(__dirname, '../config/.env') });

const CDP = require('chrome-remote-interface');
const fs = require('fs');
const path = require('path');
const https = require('https');

const TARGET_WIDTH    = 1440;
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
const MANIFEST_URL    = 'https://raw.githubusercontent.com/maksymilianAi/Manifest_DR/main/manifest.md';
const MANIFEST_PATH   = path.join(__dirname, 'manifest.md');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'design-review-tool' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(httpsGet(res.headers.location)); // follow redirect
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }));
    }).on('error', reject);
  });
}

const ENV_PATH = path.join(__dirname, '../config/.env');

function ensureToken() {
  if (!process.env.FIGMA_TOKEN) {
    console.log('⚠️  No Figma token found.');
    const saved = askNewToken();
    if (!saved) { console.error('❌ No token provided. Cannot proceed.'); process.exit(1); }
  }
}

function figmaApiGet(apiPath) {
  const token = process.env.FIGMA_TOKEN;
  if (!token) throw new Error('FIGMA_TOKEN not set');
  return new Promise((resolve, reject) => {
    https.get(
      { hostname: 'api.figma.com', path: apiPath, headers: { 'X-Figma-Token': token } },
      (res) => {
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(Buffer.concat(chunks).toString()) }));
      }
    ).on('error', reject);
  });
}

function askNewToken() {
  const { execSync } = require('child_process');
  const script = `
    set t to text returned of (display dialog "Your Figma token is invalid or expired. Paste a new one:" ¬
      default answer "" ¬
      with title "Design Review — Token Expired" ¬
      buttons {"Cancel", "Save"} default button "Save")
    return t
  `;
  try {
    const newToken = execSync(`osascript -e '${script.replace(/'/g, "'\"'\"'")}'`).toString().trim();
    if (!newToken) return false;
    require('fs').writeFileSync(ENV_PATH, `FIGMA_TOKEN=${newToken}\n`);
    process.env.FIGMA_TOKEN = newToken;
    return true;
  } catch {
    return false;
  }
}

function parseFigmaUrl(url) {
  const match = url.match(/figma\.com\/design\/([^/?]+)[^?]*\?.*node-id=([^&]+)/);
  if (!match) throw new Error('Invalid Figma URL. Expected: figma.com/design/FILE_KEY/...?node-id=NODE_ID');
  return { fileKey: match[1], nodeId: match[2].replace(/-/g, ':') };
}

async function fetchManifest() {
  const { status, body } = await httpsGet(MANIFEST_URL);
  if (status !== 200) throw new Error(`GitHub returned ${status}`);
  fs.writeFileSync(MANIFEST_PATH, body);
}

async function downloadFigmaScreenshot(figmaUrl) {
  process.stdout.write('⬇️  Fetching Figma design... ');
  const { fileKey, nodeId } = parseFigmaUrl(figmaUrl);

  let response = await figmaApiGet(`/v1/images/${fileKey}?ids=${encodeURIComponent(nodeId)}&format=png&scale=1`);

  // Handle expired / invalid token
  if (response.status === 401 || response.status === 403 || response.data.status === 403) {
    console.log('\n⚠️  Figma token is invalid or expired.');
    const updated = askNewToken();
    if (!updated) throw new Error('No new token provided. Cannot proceed.');
    response = await figmaApiGet(`/v1/images/${fileKey}?ids=${encodeURIComponent(nodeId)}&format=png&scale=1`);
    if (response.status === 401 || response.status === 403) throw new Error('New token is also invalid.');
  }

  const data = response.data;
  if (data.err) throw new Error(`Figma API: ${data.err}`);

  const imgUrl = Object.values(data.images)[0];
  if (!imgUrl) throw new Error('Figma returned no image URL');

  const { status, body } = await httpsGet(imgUrl);
  if (status !== 200) throw new Error(`Image download failed: ${status}`);

  if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR);
  fs.writeFileSync(path.join(SCREENSHOTS_DIR, 'figma-latest.png'), body);
  console.log('done');
}

function askFigmaUrl() {
  return new Promise((resolve) => {
    const readline = require('readline').createInterface({ input: process.stdin, output: process.stdout });
    readline.question('🔗 Figma URL (paste and press Enter): ', (answer) => {
      readline.close();
      resolve(answer.trim());
    });
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  let figmaUrl = process.argv[2] || null;
  if (!figmaUrl) figmaUrl = await askFigmaUrl();

  // 1. Manifest
  process.stdout.write('⬇️  Fetching latest manifest... ');
  try {
    await fetchManifest();
    console.log('done');
  } catch (err) {
    console.log(`\n⚠️  ${err.message}`);
    if (!fs.existsSync(MANIFEST_PATH)) { console.error('❌ No local manifest. Cannot proceed.'); process.exit(1); }
    console.log('   Using cached local version.');
  }

  // 2. Figma design (optional — skip if no URL provided)
  if (figmaUrl) {
    ensureToken();
    try {
      await downloadFigmaScreenshot(figmaUrl);
    } catch (err) {
      console.error(`❌ Figma download failed: ${err.message}`);
      process.exit(1);
    }
  }

  // 3. Connect to Chrome
  let client;
  try {
    client = await CDP({ port: 9222 });
  } catch {
    console.error('❌ Cannot connect to Chrome. Run: npm run chrome');
    process.exit(1);
  }

  try {
    const { Page, Runtime, Emulation } = client;
    await Page.enable();
    await Runtime.enable();

    const { result: urlResult } = await Runtime.evaluate({ expression: 'location.href' });
    console.log(`📄 Page: ${urlResult.value}`);

    const { contentSize } = await Page.getLayoutMetrics();
    await Emulation.setDeviceMetricsOverride({
      width: TARGET_WIDTH,
      height: Math.ceil(contentSize.height),
      deviceScaleFactor: 1,
      mobile: false,
    });

    const { result: widthResult } = await Runtime.evaluate({ expression: 'document.documentElement.clientWidth' });
    const actualWidth = widthResult.value;
    if (actualWidth !== TARGET_WIDTH) {
      console.error(`❌ Viewport is ${actualWidth}px, expected ${TARGET_WIDTH}px. Stopping.`);
      process.exit(1);
    }
    console.log(`✅ Viewport: ${actualWidth}px`);

    const { data } = await Page.captureScreenshot({ format: 'png' });

    if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename  = `frontend-${timestamp}.png`;
    const buffer    = Buffer.from(data, 'base64');
    fs.writeFileSync(path.join(SCREENSHOTS_DIR, filename), buffer);
    fs.writeFileSync(path.join(SCREENSHOTS_DIR, 'frontend-latest.png'), buffer);
    console.log(`✅ Frontend screenshot: screenshots/${filename}`);

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    if (client) await client.close();
  }

  console.log('\n─────────────────────────────────────────────');
  if (figmaUrl) {
    console.log('Both screenshots ready. In Claude Code type: dr');
  } else {
    console.log('Frontend screenshot ready.');
    console.log('Now run again with Figma URL to also grab the design:');
    console.log('  node dr.js https://figma.com/design/FILE_KEY/...?node-id=NODE_ID');
  }
  console.log('─────────────────────────────────────────────\n');
}

run();
