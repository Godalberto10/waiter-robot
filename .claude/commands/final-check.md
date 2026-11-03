---
description: H7 · final check before delivery, from a clean clone
disable-model-invocation: true
allowed-tools: Read, Glob, Grep, Bash(git clone:*), Bash(git status:*), Bash(uv sync:*), Bash(uv run pytest:*), Bash(uv run evaluate)
---
Milestone H7. Contract: CLAUDE.md, sections "Code rules" and "Milestones"; delivery structure of the assignment.
1. Clone the repository into a temporary folder and, there, run the `README.md` commands in order (`uv sync`, `uv run pytest`, `uv run evaluate`). Report each output.
2. Check that the delivery has: `CLAUDE.md` (under 200 lines), `.claude/settings.json`, `.claude/commands/`, `worklog.md` with one entry per milestone, `README.md`, `pyproject.toml`, `uv.lock`, `.python-version`, `data/map.txt`, `src/`, `q_table.npy`, `tests/` and `informe.pdf`.
3. Search the repository for keys or tokens (`hf_`, `token`, `.env`) and check that `.venv/` and `__pycache__/` are not tracked.
4. Do not change any file; list what is missing or wrong.

The student reviews: the list, writes the H7 entry of `worklog.md` and builds the zip.
