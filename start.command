#!/bin/bash

# Go to the folder where this script lives
cd "$(dirname "$0")"

# Open Chrome with debug port (separate profile so existing Chrome stays open)
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir=/tmp/chrome-dr \
  --no-first-run \
  --no-default-browser-check &

# Open Claude Code in this project folder
claude .
