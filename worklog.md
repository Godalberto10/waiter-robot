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

## H5 · LLM double and agent (2026-11-03)

Command: /agent
Accepted: `src/waiter_robot/agent.py` (`uv run agent "<request>"`): `create_agent` with `ChatOllama(model="qwen2.5:7b", temperature=0)`, the tools `list_places` and `run_policy` (a wrapper that returns `"error: <message>"` instead of raising), the system prompt with the five rules of the contract, and `build_agent(model)` so tests can inject the double. `tests/scripted_model.py` (`ScriptedModel`: fixed replies in order, records the messages it receives, `bind_tools` returns itself). `tests/test_agent.py`: case 1 end to end (the figures come from the real `run_policy`, and the model receives them before answering), case 4 does not call `run_policy`, and a `run_policy` error comes back to the model as text without stopping the program. Entry point `agent` and an Ollama section in the README.
Rejected: nothing.
Correction requested: the tool description the LLM reads still said "Raises: ValueError", but the LLM receives an `"error: ..."` text. The tool docstring is now built from the one in `tools.py`, with "Raises" replaced by an "Errors" section that describes the text. A new test checks the description contains "error:" and no longer contains "Raises"; it caught a first attempt that kept both sections (Python 3.13+ strips docstring indentation, fixed with `inspect.cleandoc`).
Closing check: `uv run pytest` → 33 passed, also with the network blocked (no Ollama, no token). The double tests the agent's code, not the model's judgement; that is measured in H6.

## H5 reopened · system prompt and model (2026-11-03)

Command: /evaluate-agent showed failures with the real model; each one was fixed first in CLAUDE.md ("LLM agent (R5)", by hand) and then in `SYSTEM_PROMPT`.
Accepted, in order: (1) rule 1 "call list_places before answering or asking anything" and rule 3 "terrace is the terrace door"; (2) the rules rewritten as an ordered procedure (steps 1-5); (3) model changed from `qwen2.5:7b` to `qwen2.5:14b` (also in `README.md` and `.claude/commands/evaluate-agent.md`), with step 4 asking to describe the route in words; (4) step 1 defines "moving the robot" (any request to take something or send the robot somewhere, even to a place that does not exist) and step 4 asks only for steps and return, without describing the route.
Rejected: few-shot examples in the prompt (using the evaluation requests as examples would invalidate the evaluation); adding a text route to `run_policy` (it would reopen H4).
Correction requested: the route described in words was invented by the model in attempts 3 and 4, against "the LLM gives no figures of its own"; the answer now only gives steps and return, and the full path stays in the tool result.
Closing check: `uv run pytest` → 33 passed after every change. The agent `ScriptedModel` tests do not depend on the prompt wording.

## H6 · real model and evaluation (2026-11-03)

Command: /evaluate-agent (five attempts; the last one ran all four cases even if one failed, as agreed beforehand).
Accepted: `results/cases.md` with the table of the four cases and a summary of the five attempts; traces in `results/traces/` (`case1-4.txt` for the final attempt, `_attemptN` suffix for the earlier ones).
Rejected: a sixth attempt; the closing criterion is the table and two real traces, and every prompt change so far fixed one case and changed another.
Correction requested: none on the code; see H5 reopened for the prompt and model changes.
Closing check: final attempt (`qwen2.5:14b`) meets 3 of 4 cases. Case 1: `list_places` → `run_policy(0, 0, "T")` → "13 steps". Case 2 fails: answer in Thai describing the procedure, no tool called. Case 3: asks which place, no `run_policy` (but skips `list_places`). Case 4: out of scope, no tools. No answer contained a figure that did not come from a tool.

## H7 · report and final review (2026-11-03)

Command: /final-check (run after the report and H8, so that it covers the whole delivery).
Accepted: `informe.pdf` (about 3.5 pages, built from `report/informe.md`): environment decisions, training and evaluation, the experiment plot with its reading (checked by listing the 16 pairs α = 0.1 gets wrong: all arrive, with 2–4 extra steps, 14 of them towards the kitchen), the 3D comparison figure, the table of the four cases with expected and called tools, two real traces, the five attempts and the conclusions.
Rejected: trace 2 in the report was first case 2, the Thai answer; it was replaced by case 4, and the Thai answer is described and translated in the text instead (the original trace is kept in `results/traces/case2.txt`).
Correction requested: an "Expected tools" column in the cases table (report and `results/cases.md`), because "none" in cases 3 and 4 is the correct behaviour and only case 2 fails.
Closing check: fresh clone → `uv sync`, `uv run pytest` (37 passed), `uv run evaluate` (117/117); retraining gives the same `q_table.npy` (no git diff); every item of the delivery structure is present; `CLAUDE.md` has 150 lines; no keys or tokens in the repository; `.venv/`, `__pycache__/` and `.env` are not tracked.

## H8 · 3D visualization, extra (2026-11-03)

Command: /visualize (extra, not required by the assignment). I decided its scope (Three.js page, four modes); to let Claude Code write the new CLAUDE.md section, the H8 milestone row and `.claude/commands/visualize.md`, I removed the `CLAUDE.md` and `.claude/**` deny rules from `settings.json` for that edit only. Claude Code restored them right after, and a test edit of `CLAUDE.md` was refused again.
Accepted: `rollout(table, ...)` in `tools.py`, the route loop of `run_policy` taking the table as a parameter (`run_policy` calls it with the loaded table; behaviour and description unchanged). `src/waiter_robot/export_viz.py` (`uv run export-viz`): writes `viz/data.js` with the map, BFS distances, best action and route of the 117 pairs for α = 0.5 (`q_table.npy`) and α = 0.1 (trained in memory), and the four agent cases parsed from the final traces. `viz/index.html` (Three.js 0.160.0 from a CDN): the restaurant in 3D and a robot that moves cell by cell, with four modes (Route, Policy, Agent, Compare α). `tests/test_viz.py` (4 tests) and the README section.
Rejected: a Python 3D library (a heavy new dependency) and the Gymnasium `render_mode` (2D only).
Correction requested: the first `rollout` still called `QTABLE.best_action` instead of the table it receives (the α = 0.1 routes would have been the α = 0.5 ones); the trace parser missed `list_places` (empty `Args:` at the end of a message) and the Windows line endings of the traces; the table chairs stood in the neighbouring free cells and looked like obstacles. All fixed; the detour test (α = 0.1 from the bar to the kitchen takes more than 12 steps) covers the first bug.
Closing check: `uv run pytest` → 37 passed; `uv run export-viz` → α = 0.5 117/117, α = 0.1 101/117; `q_table.npy` unchanged (same md5); the four modes checked in Edge, bar → kitchen shows 12 vs 16 steps.

## H9 · map sandbox, extra (2026-11-03)

Command: /sandbox (extra, not required by the assignment). I chose the idea: move tables and put guests on the map without blocking the robot, and see whether it still takes the right route. Since a Q table only knows the map it was trained on, the sandbox retrains in the browser and compares three robots. As in H8, I removed the `CLAUDE.md` and `.claude/**` deny rules only while Claude Code wrote the H9 section and `.claude/commands/sandbox.md`; they were restored afterwards (the first test edit still went through because the settings had not been reloaded yet; the second one was refused).
Accepted: `viz/sandbox-core.js` (environment, seeded random generator, Q-learning, BFS, evaluation and connectivity check in JavaScript, usable from the browser and Node); `viz/sandbox.html` (drag tables, guests from a tray, moves that cut a cell off are refused, retraining in blocks of 100 episodes with a progress bar, three robots: original table, retrained table, BFS); `viz/scene.js`, the 3D restaurant now shared by `index.html` and `sandbox.html` instead of copied; the full Q table added to `viz/data.js`; `tests/test_sandbox.py` (5 tests run with Node); README section.
Rejected: computing the new route with BFS only (it would hide the point of the extra: the Q table has to be retrained when the map changes).
Correction requested: none. A guest at (4, 4) is refused, and correctly: it would cut off (5, 4), between two tables; the test that was meant to show a harmless guest uses (2, 6) instead.
Closing check: `uv run pytest` → 42 passed. JS `step` gives the five contract tuples; JS training reaches 117/117 on the original map in 1200 episodes (the topic sheet says about 1200); moving the table at (0, 5) to (2, 5): the original table gets stuck from the bar to the kitchen (73/117 pairs shortest on the new map), the retrained one needs 800 episodes and takes the new 8-step route, like BFS. `data/map.txt` and `q_table.npy` unchanged; both pages checked in Edge.
