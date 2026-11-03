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
