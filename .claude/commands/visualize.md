---
description: H8 · export the routes and build the 3D visualization
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(uv run pytest:*), Bash(uv run export-viz)
---
Milestone H8 (extra). Contract: CLAUDE.md, section "3D visualization (extra, H8)".
1. In `src/waiter_robot/tools.py`, move the route loop of `run_policy` into `rollout(table, ...)` and make `run_policy` call it with the loaded table; no change in its behaviour or description.
2. Write `src/waiter_robot/export_viz.py` (`uv run export-viz`) that writes `viz/data.js` with everything listed in the contract; it must not overwrite `q_table.npy`.
3. Write `viz/index.html` with Three.js (pinned version) and the four modes of the contract.
4. Write `tests/test_viz.py` as in the contract. Add the entry point and the command to `README.md`.
5. Run `uv run pytest` (every test passes) and `uv run export-viz`.

The student reviews: the four modes in the browser, that the bar → kitchen comparison shows 12 vs 16 steps, and that `q_table.npy` is unchanged.
