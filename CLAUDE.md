# Design Review

## Manifest selection

Before starting, check which manifest files exist in `_core/`:
- Use the Glob tool to find all files matching `_core/manifest*.md`

If only one file is found — read it and follow all instructions there exactly. Do not mention this check to the user.

If more than one file is found — ask the user exactly this, listing the filenames:

> Which manifest would you like to use?
> 1. manifest.md (latest)
> 2. [other filename]

Wait for the user to choose, then read that file and follow all instructions there exactly.
