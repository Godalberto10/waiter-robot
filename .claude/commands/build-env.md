---
description: H1 · the Gymnasium environment WaiterRobot-v0 and its tests
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(uv run pytest:*)
---
Milestone H1. Contract: CLAUDE.md, sections "Map" and "States and environment (Gymnasium)".
1. Write `src/waiter_robot/env.py`: a `gymnasium.Env` subclass that reads `data/map.txt`, with `observation_space`, `action_space`, `reset(seed, options)` and `step`, registered as `WaiterRobot-v0` with `max_episode_steps=100`.
2. Write `tests/test_env.py`: one test per `step` rule (rules 1-7, with the exact tuples of the contract), one for the state number (108, 62, 53), one for `reset` with options, one for `ValueError` in `reset`, and one that runs `check_env`.
3. Run `uv run pytest`. Expected: every test passes and `check_env` gives no warnings.
4. Update `README.md` only if a new command is needed.

The student reviews: each expected tuple in the tests matches CLAUDE.md, the state formula, that `truncated` comes only from `make`, and that the map is read from the file.
