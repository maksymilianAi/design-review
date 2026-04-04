# Contributing

---

## Project structure

```
DR/
├── Design Review.app/          macOS launcher (bash script in .app bundle)
│   └── Contents/MacOS/start
├── _core/
│   ├── dr.js                   frontend screenshot via CDP
│   ├── dr-crop.js              element crop by CSS selector
│   ├── dr-audit.js             structured DOM audit → JSON
│   ├── generate-report.js      HTML report builder
│   ├── manifest.md             review process instructions for Claude
│   ├── manifest-rules.md       design rules for Claude (capitalisation, labels, etc.)
│   ├── package.json
│   └── node_modules/           gitignored
├── docs/
│   ├── ARCHITECTURE.md         system design and data flow
│   ├── SCRIPTS.md              scripts reference
│   └── CONTRIBUTING.md         this file
├── assets/                     app icon
├── config/                     local config (gitignored)
├── CLAUDE.md                   Claude Code startup instructions
└── README.md                   user-facing setup guide
```

---

## Local setup

```bash
git clone <repo>
cd DR/_core
npm install
```

No build step. Scripts run directly with `node`.

Launch Chrome for local testing:
```bash
npm run chrome
# or manually:
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir=~/.chrome-dr
```

---

## How Claude gets its instructions

`CLAUDE.md` in the project root is loaded automatically by Claude Code when it starts in this directory. It tells Claude to:
1. Find all `manifest*.md` files in `_core/`
2. Always read `manifest-rules.md` silently
3. If multiple process manifests exist, ask the user which to use

Claude reads `manifest.md` for the review flow and `manifest-rules.md` for the design rules. Edits to these files take effect on the next Claude session.

---

## Adding or changing review rules

**To change the review process** (steps, zones, screenshot algorithm, report format):
→ Edit `_core/manifest.md`

**To add a design rule** (capitalisation, skip a component, label/value behaviour):
→ Edit `_core/manifest-rules.md`

**To add a product-specific rules file:**
→ Create `_core/manifest-rules-productname.md`. CLAUDE.md picks up all `manifest-rules*.md` files automatically.

---

## Modifying scripts

All scripts use CommonJS (`require`). No transpilation needed.

Key dependencies:
- `chrome-remote-interface` — CDP client. See [CDP docs](https://chromedevtools.github.io/devtools-protocol/) for available domains.
- `sharp` — image processing. See [sharp docs](https://sharp.pixelplumbing.com/).

When modifying `dr.js` — be aware of the screenshot-first constraint. Any `Runtime.evaluate` or `Emulation.setDeviceMetricsOverride` call before `Page.captureScreenshot` will trigger SPA re-renders and produce a spinner screenshot. The screenshot must come first.

When modifying `dr-audit.js` — the `AUDIT_SCRIPT` string runs inside the browser via `Runtime.evaluate`. It cannot use Node.js APIs (`fs`, `path`, `require`, etc.). Only browser APIs are available.

---

## Adding a new script

1. Create `_core/your-script.js`
2. Add an entry to `_core/package.json` under `scripts`
3. Document it in `docs/SCRIPTS.md`
4. If Claude should use it during reviews, reference it in `_core/manifest.md`

---

## Modifying the macOS launcher

The launcher is `Design Review.app/Contents/MacOS/start` — a plain bash script.

After editing, make sure it remains executable:
```bash
chmod +x "Design Review.app/Contents/MacOS/start"
```

macOS Gatekeeper may block a re-signed or modified `.app`. If that happens, the user needs to right-click → Open to bypass the security warning once.

---

## Gitignore

The following are intentionally excluded:
```
_core/node_modules/     installed dependencies
_core/screenshots/      generated during reviews
config/.env             local secrets (not used currently)
*.html                  generated reports
.DS_Store
.claude/                local Claude Code settings
```

---

## Known issues and constraints

See `docs/ARCHITECTURE.md` → Known limitations for the full list.

Short version:
- macOS only launcher (`.app`). Windows users run `claude .` manually from the project root.
- Chrome only (CDP requirement).
- SPA screenshot must be taken before any JS evaluation.
- Mobile native app testing is not currently supported.
