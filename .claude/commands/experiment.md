---
description: H3 · learning curves for alpha 0.5 and 0.1
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Glob, Bash(uv run experiment), Bash(uv run pytest:*)
---
Milestone H3. Contract: CLAUDE.md, section "Experiment (R3)".
1. Write `src/waiter_robot/experiment.py` (`uv run experiment`), reusing the training loop and the evaluation of H2 (no copies of them).
2. For α = 0.5 and α = 0.1 (γ = 0.9, seed 0): 3000 episodes, evaluating the 117 pairs after each block of 100.
3. Save the plot to `results/experiment.png`: x = episodes, y = % shortest routes, one curve per α, horizontal line at 95 %.
4. Print one line per configuration: first block reaching 95 % and final %.
5. Add the entry point and the command to `README.md`; run `uv run experiment` and `uv run pytest`.
6. It must not overwrite `q_table.npy`.

The student reviews: the plot (axes, legend, two curves), the printed lines, and writes the reading of the curves for the report.
