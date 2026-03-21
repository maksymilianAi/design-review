# Design Review Project

This folder is a design review tool. When the user types "dr" or asks to start a design review:

1. Read `manifest.md` — it contains all rules for how to conduct the review
2. Read `screenshots/frontend-latest.png` — this is the current frontend screenshot (taken by `dr.js`)
3. The user will provide the Figma design screenshot directly in the chat
4. Follow the manifest exactly — do not improvise or skip steps

## How this works

The user runs `node dr.js` before starting a review. That script:
- Pulls the latest `manifest.md` from GitHub
- Connects to Chrome via CDP on port 9222
- Sets viewport to 1440px
- Takes a full-page screenshot → saves as `screenshots/frontend-latest.png`

Then the user types "dr" in Claude Code and provides the Figma screenshot.

## Important

- The manifest is the single source of truth for review rules
- Always read the manifest fresh from `manifest.md` at the start of each review
- Write HTML reports to this folder with the filename format from the manifest
