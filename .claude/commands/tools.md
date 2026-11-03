---
description: H4 · list_places and run_policy, with one test per error
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(uv run pytest:*)
---
Milestone H4. Contract: CLAUDE.md, section "Tools (R4)".
1. Write `src/waiter_robot/tools.py`: `list_places()` and `run_policy(start_row, start_col, destination)`, with English docstrings that say what they do and when to use them. The table is loaded once with `np.load`.
2. `run_policy` validates before running and raises `ValueError` for the five cases of the contract; it places the robot with `reset(options=...)`.
3. Write `tests/test_tools.py`: `list_places()` returns the exact list of the contract; one test per `ValueError` case (5); `run_policy(0, 0, "T")` gives `reached=True, steps=13, return=8.0` and 14 cells from `[0, 0]` to `[5, 8]`; the table is identical before and after.
4. Run `uv run pytest`. Expected: every test passes.

The student reviews: the error messages state the cause, the docstrings (the LLM will read them), and that `update` is never called.
