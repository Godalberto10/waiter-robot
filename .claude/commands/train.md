---
description: H2 · train the Q table at random, save q_table.npy and evaluate it against BFS
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(uv run pytest:*), Bash(uv run train), Bash(uv run evaluate)
---
Milestone H2. Contract: CLAUDE.md, section "Training and evaluation".
1. Copy the Session 5 `QTable` into `src/waiter_robot/q_table.py` (constructor, `best_action`, `update`) with no behaviour change.
2. Write `src/waiter_robot/train.py` (`uv run train`): α = 0.5, γ = 0.9, 3000 episodes, seed 0, random actions, `update` with `terminated`; saves `q_table.npy`.
3. Write `src/waiter_robot/evaluate.py` (`uv run evaluate`): BFS distances from the map; loads `q_table.npy`; greedy run with a 100-step limit for the 117 pairs; prints `shortest routes: N/117 (P %)`. It never calls `update`.
4. Add the entry points to `pyproject.toml` and the two commands to `README.md`.
5. Run `uv run train`, then `uv run evaluate`. Expected: at least `112/117`.
6. Run `uv run pytest`: nothing broken.

The student reviews: `update` receives `terminated` (not `truncated`), the seeds, the pair count (117), and that evaluation does not change the table.
