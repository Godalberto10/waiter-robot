---
description: H9 · map sandbox in the browser: move tables and people, retrain, compare
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(uv run pytest:*), Bash(uv run export-viz), Bash(node:*)
---
Milestone H9 (extra). Contract: CLAUDE.md, section "Map sandbox (extra, H9)".
1. Add the full Q table of `q_table.npy` to `viz/data.js` in `export_viz.py` (read only), so the page can apply the original table on any map.
2. Write `viz/sandbox-core.js`: environment, seeded random generator, Q-learning training, BFS, evaluation and the connectivity check; usable from the browser and from Node.
3. Write `viz/sandbox.html`: the editable 3D restaurant, the tray of people, and the three robots (original table, retrained table, BFS) for the chosen start and destination.
4. Write `tests/test_sandbox.py` as in the contract. Add the page to `README.md`.
5. Run `uv run export-viz` and `uv run pytest` (every test passes).

The student reviews: that a blocked move is refused, that after moving a table the original table fails or detours while the retrained one follows the BFS length, and that `data/map.txt` and `q_table.npy` are unchanged.
