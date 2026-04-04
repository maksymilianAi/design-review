# Design Review

## Manifest selection

Before starting, check which manifest files exist in `_core/`:
- Use the Glob tool to find all files matching `_core/manifest*.md`

**Rules files** (`manifest-rules*.md`) are always loaded automatically — they are not version alternatives. Always read `manifest-rules.md` (and any other `manifest-rules-*.md` files present) silently without mentioning it to the user.

**Process files** (`manifest.md`, `manifest-V*.md`, etc.) are version alternatives. If only one process file is found — read it silently. If more than one process file is found — ask the user exactly this, listing only the process files:

> Which manifest would you like to use?
> 1. manifest.md (latest)
> 2. [other filename]

Wait for the user to choose, then read that file. Always read the rules file(s) regardless of which process file is chosen.
