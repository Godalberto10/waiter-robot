# Worklog

One entry per milestone, written when it is closed: the command run, what was accepted, what was rejected and why, the correction requested, and the test or output that closes it.

<!--
## Hn · name (YYYY-MM-DD)

Command: /...
Accepted: ...
Rejected: ...
Correction requested: ...
Closing check: ...
-->

## H0 · setup (2026-11-03)

Command: /setup
Accepted: uv package project (`src/waiter_robot/`), Python pinned to 3.14, dependencies numpy, gymnasium, matplotlib, langchain and langchain-ollama (pytest as dev), `uv.lock`, README skeleton with `uv sync` and `uv run pytest`, `tests/test_setup.py` (map has 6 lines of 9 characters with K, B and T). `.gitignore` already excluded `.env`, `.venv` and `__pycache__/`, so it was left unchanged.
Rejected: the `waiter-robot` entry point and the "Hello from waiter-robot!" `main()` added by `uv init`; they are not in the CLAUDE.md contract, where the entry points are train, evaluate, experiment and agent.
Correction requested: authors with my name only, no email; filter only the langsmith `DeprecationWarning`s (caused by Python 3.14 inside a langchain dependency, not by our code).
Closing check: `uv run pytest` → `1 passed`, no warnings. `deny` covers `CLAUDE.md`, `.claude/`, `data/map.txt` and `.env`: an edit of `CLAUDE.md` by Claude Code was refused.

## H1 · Gymnasium environment (2026-11-03)

Command: /build-env
Accepted: `src/waiter_robot/env.py` (`WaiterRobotEnv`, reads `data/map.txt`, `Discrete(162)` / `Discrete(4)`, registered as `WaiterRobot-v0` with `max_episode_steps=100`) and `tests/test_env.py` with 17 tests: one per `step` rule (1-7) with the exact tuples of CLAUDE.md, the state number (108, 62, 53), `reset` with options, five `ValueError` cases in `reset`, the bare class never truncating, and `check_env`.
Rejected: nothing.
Correction requested: `check_env` calls `reset(options={})`, which the contract did not cover; the first version failed with a `KeyError`. Empty `options` now behave like no `options` (random start), and I updated the CLAUDE.md contract by hand to say so.
Closing check: `uv run pytest` → 17 passed; `check_env` raises no warnings (the test asserts the list of warnings is empty).

## H2 · training and evaluation (2026-11-03)

Command: /train
Accepted: `src/waiter_robot/q_table.py` (Session 5 `QTable` from `codigo-tema-3.zip`, only the `__main__` demo removed), `train.py` (`uv run train`: α = 0.5, γ = 0.9, 3000 episodes, seed 0, random actions, `update(s, a, r, s2, terminated)`), `evaluate.py` (`uv run evaluate`: BFS distances from the map, greedy run with a 100-step limit over the 39 × 3 = 117 pairs), `q_table.npy` (162 × 4), the `train` and `evaluate` entry points and their README lines.
Rejected: nothing.
Correction requested: H2 had no tests; reproducibility and "evaluation does not change the table" had only been checked by hand (md5). Added `tests/test_train.py`: two trainers with seed 0 give identical tables, and `shortest_routes` leaves the table unchanged and returns (117, 117).
Closing check: `uv run evaluate` → `shortest routes: 117/117 (100.0 %)` (criterion: at least 112); `uv run pytest` → 19 passed.

## H3 · experiment (2026-11-03)

Command: /experiment
Accepted: `src/waiter_robot/experiment.py` (`uv run experiment`), which reuses `WaiterTrainer` and `shortest_routes` (no copied loop) and trains α = 0.5 and α = 0.1 (γ = 0.9, seed 0) for 3000 episodes, evaluating the 117 pairs after each block of 100; `results/experiment.png` with one curve per α and the 95 % line; the `experiment` entry point and its README line.
Rejected: nothing.
Correction requested: none.
Closing check: plot with two curves (30 points each). Output: α = 0.5 first reaches 95 % at block 9 (900 episodes) and stays at 100 % from 1200; α = 0.1 never reaches 95 % (peak 90.6 %, final 86.3 %). `q_table.npy` unchanged (same md5); `uv run pytest` → 19 passed.

## H4 · tools (2026-11-03)

Command: /tools
Accepted: `src/waiter_robot/tools.py` with `list_places()` (place names in a dict in `tools.py`, since the map only has letters) and `run_policy(start_row, start_col, destination)`, which validates before moving, places the robot with `reset(options=...)` and only uses `best_action`; the Q table is loaded once with `np.load`. English docstrings tell the LLM to call `list_places` first and to use only the figures `run_policy` returns. `tests/test_tools.py` with 10 tests: the exact `list_places` list, one per `ValueError` case (off the map, table, danger, "X" and "t", start = destination), K→T with `update` patched to fail, and B→K, B→T.
Rejected: nothing.
Correction requested: none. Claude Code fixed two bugs of its first version: the Q table variable was called `TABLE` and shadowed the `TABLE = "#"` constant, so the table check never fired (caught by the table test; renamed to `QTABLE`); and the tools env is created with `disable_env_checker=True`, because the passive checker broke the next `step` after a `reset` that raised (the env is still checked with `check_env` in `test_env.py`). Extra check outside the contract: non-integer row or column raises `ValueError`, in case the LLM passes text.
Closing check: `run_policy(0, 0, "T")` → reached, 13 steps, return 8.0, 14 cells from [0, 0] to [5, 8]; `uv run pytest` → 29 passed.
