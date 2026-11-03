---
description: H0 · create the uv project and check that it starts
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Glob, Bash(uv init:*), Bash(uv python pin:*), Bash(uv add:*), Bash(uv sync:*), Bash(uv run pytest:*)
---
Milestone H0. Contract: CLAUDE.md, sections "Code rules" and "Milestones".
1. Create the uv application project in the current folder with the package `src/waiter_robot/` (`uv init --package`), keeping the existing `README.md`, `.gitignore`, `LICENSE`, `CLAUDE.md` and `data/map.txt`.
2. Pin Python with `uv python pin 3.14`.
3. Add the dependencies listed in "Code rules" (`pytest` as a dev dependency). Nothing else.
4. Check `.gitignore` excludes `.env`, `.venv/` and `__pycache__/`; add only what is missing.
5. Add `tests/test_setup.py` with one test: `data/map.txt` has 6 lines of 9 characters and contains K, B and T.
6. Replace `README.md` with a skeleton: one-line description and a "How to run" section with `uv sync` and `uv run pytest`.
7. Run `uv run pytest`. Expected: `1 passed`.

The student reviews: `pyproject.toml` (name, Python version, dependencies), `.python-version`, that no file listed in step 1 was overwritten, and the test output.
