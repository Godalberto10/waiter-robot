---
description: H12 · teaching extras in the sandbox: alpha/gamma sliders, watch-it-learn mode, info panel
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(uv run pytest:*), Bash(node:*)
---
Milestone H12 (extra). Contract: CLAUDE.md, section "Map sandbox (extra, H9)", lines "H12".
1. In `viz/sandbox-core.js`: let training report random steps taken and give the best value per cell for a destination; keep the H9 functions unchanged.
2. In `viz/sandbox.html`: sliders for α, γ and the episode cap; the two modes ("Watch it learn" and "Already learned"); robots started one after another in separate lanes with labels; the info panel with the mini learning curve and the explanatory sentence.
3. In `tests/test_sandbox.py`: training with α = 0.1 and a 5000 cap still improves over the first block; training with any α never changes the exported original table; the random-step counter adds up.
4. Run `uv run pytest`.

The student reviews: both modes in the browser, that the sliders change the learning speed as the H3/H11 experiment says, and that the texts are understandable for someone with no technical background.
