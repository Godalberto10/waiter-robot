---
description: H11 · repeat the alpha experiment with 5 seeds (mean and min-max band)
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(uv run pytest:*), Bash(uv run experiment:*)
---
Milestone H11. Contract: CLAUDE.md, section "Experiment (R3)", line "Seeds (H11)".
1. In `src/waiter_robot/experiment.py`, add `--seeds N`: both α with seeds 0..N-1, reusing `learning_curve`; save `results/experiment_seeds.png` (mean line and min-max band per α, 95 % line) and print, per α, the first block whose mean reaches 95 % and the final mean, min and max. Without `--seeds` it behaves as before.
2. Write `tests/test_experiment.py`: the seed-0 curve of the new code equals the H3 curve; the mean and band are computed per block over the seeds (small run).
3. Run `uv run experiment --seeds 5` and `uv run pytest`. `q_table.npy` and `results/experiment.png` must not change.
4. Add the command to `README.md`.

The student reviews: the plot, the printed lines, and how the reading of the curves changes with five seeds.
