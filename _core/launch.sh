#!/bin/bash
# Design Review — bootstrap, update, and launch Chrome

REPO_DIR=~/Downloads/design-review

# Pull latest changes
git -C "$REPO_DIR" pull --ff-only -q 2>/dev/null || true

# Clean up screenshots from previous review
rm -rf "$REPO_DIR/screenshots"
mkdir -p "$REPO_DIR/screenshots/crops"

# Install npm dependencies if needed
if [ ! -d "$REPO_DIR/_core/node_modules" ]; then
  npm install --silent --prefix "$REPO_DIR/_core"
fi

# Kill any stale process on port 9222 and launch a fresh Chrome window
lsof -ti:9222 | xargs kill -9 2>/dev/null || true
sleep 1
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir=~/.chrome-dr \
  --no-first-run \
  --no-default-browser-check \
  --disable-extensions \
  --disable-sync \
  --disable-background-networking \
  --disable-translate \
  --disable-backgrounding-occluded-windows \
  --disable-renderer-backgrounding \
  --new-tab-url=about:blank \
  --disable-features=NetworkPrediction,OptimizationHints &> /dev/null &
sleep 2
