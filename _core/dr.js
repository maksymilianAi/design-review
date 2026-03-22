#!/usr/bin/env node

const CDP = require('chrome-remote-interface');
const fs = require('fs');
const path = require('path');
const https = require('https');

const TARGET_WIDTH    = 1440;
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
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

// Load token: Keychain first, fall back to .env
function loadToken() {
  const { execSync } = require('child_process');
  try {
    const token = execSync(`security find-generic-password -a "$USER" -s "DesignReview-FigmaToken" -w 2>/dev/null`, { shell: '/bin/bash' }).toString().trim();
    if (token) { process.env.FIGMA_TOKEN = token; return; }
  } catch {}
  require('dotenv').config({ path: ENV_PATH });
}
loadToken();

async function ensureToken() {
  if (!process.env.FIGMA_TOKEN) {
    console.log('⚠️  No Figma token found.');
    const saved = askNewToken();
    if (!saved) { console.error('❌ No token provided. Cannot proceed.'); process.exit(1); }
  }
  // Validate the token is actually accepted by Figma
  const check = await figmaApiGet('/v1/me');
  if (check.status === 401) {
    console.log('⚠️  Figma token is invalid or expired.');
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
  const tmpScript = '/tmp/dr-token-dialog.applescript';
  const script = `set t to text returned of (display dialog "Your Figma token is invalid or expired.\nPaste a new personal access token from figma.com \u2192 Settings \u2192 Security:" default answer "" with title "Design Review \u2014 Token Expired" buttons {"Cancel", "Save"} default button "Save")\nreturn t`;
  try {
    fs.writeFileSync(tmpScript, script);
    const newToken = execSync(`osascript "${tmpScript}"`).toString().trim();
    fs.unlinkSync(tmpScript);
    if (!newToken) return false;
    // Save to Keychain and .env
    const { execSync } = require('child_process');
    try { execSync(`security add-generic-password -a "$USER" -s "DesignReview-FigmaToken" -w "${newToken}" 2>/dev/null || security add-generic-password -a "$USER" -s "DesignReview-FigmaToken" -w "${newToken}" -U 2>/dev/null`, { shell: '/bin/bash' }); } catch {}
    fs.writeFileSync(ENV_PATH, `FIGMA_TOKEN=${newToken}\n`);
    process.env.FIGMA_TOKEN = newToken;
    return true;
  } catch {
    try { fs.unlinkSync(tmpScript); } catch {}
    return false;
  }
}

function parseFigmaUrl(url) {
  const match = url.match(/figma\.com\/design\/([^/?]+)[^?]*\?.*node-id=([^&]+)/);
  if (!match) throw new Error('Invalid Figma URL. Expected: figma.com/design/FILE_KEY/...?node-id=NODE_ID');
  return { fileKey: match[1], nodeId: match[2].replace(/-/g, ':') };
}


async function downloadFigmaScreenshot(figmaUrl) {
  process.stdout.write('⬇️  Fetching Figma design... ');
  const { fileKey, nodeId } = parseFigmaUrl(figmaUrl);

  let response = await figmaApiGet(`/v1/images/${fileKey}?ids=${encodeURIComponent(nodeId)}&format=png&scale=1`);

  // Only treat HTTP 401 as a token error — everything else is a file/node access problem
  if (response.status === 401) {
    console.log('\n⚠️  Figma token is invalid or expired.');
    const updated = askNewToken();
    if (!updated) throw new Error('No new token provided. Cannot proceed.');
    response = await figmaApiGet(`/v1/images/${fileKey}?ids=${encodeURIComponent(nodeId)}&format=png&scale=1`);
    if (response.status === 401) throw new Error('New token is also invalid.');
  }

  if (response.status === 403 || response.data?.status === 403) {
    throw new Error(`No access to this Figma file. Make sure your token has permission to view it.\n   File key: ${fileKey}`);
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
  if (!fs.existsSync(MANIFEST_PATH)) { console.error('❌ manifest.md not found in _core/. Cannot proceed.'); process.exit(1); }

  // 2. Figma design (optional — skip if no URL provided)
  if (figmaUrl) {
    await ensureToken();
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
    console.error('❌ Cannot connect to Chrome. Make sure the Design Review app is open and the Chrome window it launched is still running.');
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
