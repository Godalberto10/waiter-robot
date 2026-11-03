# Waiter robot · Lab Assignment II (topic 7)

## Brief
A waiter robot in a restaurant carries dishes and drinks between the kitchen (K), the bar (B) and the terrace door (T).
- Example requests:
  - "Take this dish from the kitchen to the terrace" → origin K, destination T.
  - "The robot is at the bar; send it back to the kitchen" → origin B, destination K.
  - "Take these drinks from the bar to the terrace" → origin B, destination T.
- The LLM (Ollama, `qwen2.5:14b`) understands the request, extracts origin and destination, calls the tools and writes the answer in English.
  It never computes routes or gives its own figures: the steps and return in the answer are the ones `run_policy` returns.
- `run_policy` validates origin and destination, places the robot with `reset(options=...)` and applies the Q table step by step.
  It does not train: the table never changes.
- The Q table (`q_table.npy`) gives the highest-value action in each state. It does not understand language; it is trained once, beforehand.
- If the place does not exist ("take the dish to the storeroom"), the agent asks which place is meant and does not call `run_policy`.
- If the request is not about moving the robot ("what wine do you recommend?"), the agent says so and does not call `run_policy`.

## Map
`data/map.txt`, 6 rows × 9 columns, one row per line. Always read from the file; the map is never hard-coded.
```
K....#..B
..~~.#...
..~~.....
.#.#.#.#.
.........
.#.#.#.#T
```
- `.` free · `#` table (obstacle: cannot be entered) · `~` fryer area (danger: −50 and episode ends) · capital letter = place.
- Places (row, col): K kitchen (0, 0) · B bar (0, 8) · T terrace door (5, 8).
- 54 cells: 40 free (places count as free), 10 tables, 4 danger.
- Shortest routes (BFS): K↔T 13 steps · K↔B 12 steps · B↔T 5 steps.

## States and environment (Gymnasium)
- Own class, subclass of `gymnasium.Env`, reads `data/map.txt` when created.
  Registered with `gymnasium.register(id="WaiterRobot-v0", entry_point=..., max_episode_steps=100)` and created with `gymnasium.make("WaiterRobot-v0")`.
- Destinations numbered in alphabetical order of their letter: B=0, K=1, T=2.
- State = destination · 54 + row · 9 + col. `observation_space = Discrete(162)`.
  Examples: robot at K heading to T = 108 · at B heading to K = 62 · at T heading to B = 53.
- Actions: `action_space = Discrete(4)`: 0 ↑, 1 →, 2 ↓, 3 ←.
- `reset(seed=None, options=None)` calls `super().reset(seed=seed)` and returns `(state, {})`.
  - Without `options` or with empty `options` (as `check_env` calls it): draws with `self.np_random` a destination and a free start cell that is not the destination (may be another place; never a table or danger).
  - With `options={"start": (row, col), "destination": "T"}`: starts there. A non-free start, a destination other than K/B/T, or start equal to destination raise `ValueError`.
  - `reset(options={"start": (0, 0), "destination": "T"})` → `(108, {})`.
- `step(action)` returns `(state, reward, terminated, truncated, {})`. Rules, one test each:
  1. Into a free cell: −1.0, continues. From (0, 0) heading to T, → : `(109, -1.0, False, False, {})`.
  2. Into the border or a table: stays in its cell, −1.0. From (0, 4) heading to T, → : `(112, -1.0, False, False, {})`.
  3. Into the fryer area: −50.0 and `terminated=True`. From (0, 2) heading to T, ↓ : `(119, -50.0, True, False, {})`.
  4. Into the destination: +20.0 (not −1 + 20) and `terminated=True`. From (4, 8) heading to T, ↓ : `(161, 20.0, True, False, {})`.
  5. Another place's cell is free: −1.0, continues. From (1, 8) heading to T, ↑ enters B: `(116, -1.0, False, False, {})`.
  6. Step limit: the class always returns `truncated=False`; the `TimeLimit` added by `make` sets `truncated=True` at step 100.
     With `make`, from K heading to T, ↑ 100 times: step 100 gives `truncated=True`.
  7. `step` after `terminated=True` raises `RuntimeError`.
- `gymnasium.utils.env_checker.check_env` passes with no errors or warnings.

## Training and evaluation
- `QTable` from Session 5 (`q_table.py` from `codigo-tema-3.zip`, copied into `src/` with no behaviour change): `update(s, a, r, s2, done)` and `best_action(s)`.
- Random training, as in `cliff_walking.py`: `env = gymnasium.make("WaiterRobot-v0")`, `env.reset(seed=0)` and `env.action_space.seed(0)` once;
  each episode `reset()`, and until `terminated or truncated`: `a = env.action_space.sample()`, `step`, `update(s, a, r, s2, terminated)`.
  `update` receives `terminated`, never `truncated`: cutting at 100 steps does not make the future worth 0.
- Final table: α = 0.5 · γ = 0.9 · 3000 episodes · seed 0. Saved with `np.save("q_table.npy", table.q)`, shape (162, 4).
  Running training twice with the same seed gives the same table.
- Evaluation over every (origin, destination) pair: origin = any free cell except the destination → 39 × 3 = 117 pairs.
  - A pair is a "shortest route" if, applying `best_action` from the origin (100-step limit), it reaches the destination and `steps` equals the Session 1 BFS distance.
  - Evaluation does not modify the table (never calls `update`).
  - H2 criterion: at least 95 % (112 of 117). Prints: `shortest routes: N/117 (P %)`.

## Experiment (R3)
- Compares α = 0.5 against α = 0.1, both with γ = 0.9 and seed 0.
- Each configuration trains 3000 episodes; after each block of 100 the 117 pairs are evaluated → 30 points per curve.
- One plot (matplotlib): x = episodes, y = % shortest routes, one curve per α, horizontal line at 95 %. Saved to `results/experiment.png`.
- Prints one line per configuration with the first block reaching 95 % and the final %.
- Seeds (H11): `uv run experiment --seeds 5` repeats both configurations with seeds 0-4 and saves `results/experiment_seeds.png`: per α, the mean % after each block and a band from the minimum to the maximum over the seeds; it prints, per α, the first block whose mean reaches 95 % and the final mean, minimum and maximum. `results/experiment.png` (seed 0) stays; `q_table.npy` is not touched.

## Tools (R4)
Docstrings and error messages in English. The table is loaded once with `np.load("q_table.npy")` when the module is imported; it is never trained and `update` is never called.
- `list_places() -> list[dict]`: the places in `data/map.txt`, in alphabetical order of letter.
  `[{"letter": "B", "name": "bar", "row": 0, "col": 8}, {"letter": "K", "name": "kitchen", "row": 0, "col": 0}, {"letter": "T", "name": "terrace door", "row": 5, "col": 8}]`
- `run_policy(start_row: int, start_col: int, destination: str) -> dict`
  1. Receives: the start cell and the destination letter (`"B"`, `"K"` or `"T"`, uppercase only).
  2. Validates before running and raises `ValueError` with a message stating the cause if:
     the start is off the map `(6, 0)` · is a table `(0, 5)` · is danger `(1, 2)` ·
     the destination is not a place letter (`"X"`, `"t"`) · the start is the destination itself `(0, 0, "K")`. One test per case.
  3. Places the robot with `reset(options={"start": (row, col), "destination": letter})` and applies `best_action` until it arrives, enters danger or takes 100 steps.
  4. Returns `{"reached": bool, "steps": int, "return": float, "path": [[row, col], ...]}`; `path` includes the start and the last cell (`steps + 1` cells).
  - `run_policy(0, 0, "T")` → `reached=True, steps=13, return=8.0`, `path` of 14 cells from `[0, 0]` to `[5, 8]`.
  - `run_policy(0, 8, "K")` → `reached=True, steps=12, return=9.0` · `run_policy(0, 8, "T")` → `reached=True, steps=5, return=16.0`.
- Agent tools: wrappers around both functions, with their docstring as description.
  The `run_policy` wrapper catches `ValueError` and returns the text `"error: <message>"` to the LLM; the program does not stop.

## LLM agent (R5)
- Built like `route_agent.py` / `cliff_agent.py`: LangChain `create_agent` with `ChatOllama(model="qwen2.5:14b", temperature=0)`; no token, no `.env`. `qwen2.5:7b` was tried first and failed case 4 in three prompt attempts (see `worklog.md`).
- Tools: `list_places` and `run_policy` (the wrappers above). The system prompt, in English, is a procedure the model follows in order:
  1. Is the request about moving the robot? Any request to take something or send the robot somewhere is, even if the place does not exist (then step 3 asks).
     Only requests that do not ask to move it (wine, bookings, weather) are not: say the robot only carries things between kitchen, bar and terrace door, and stop: no tools.
  2. Use the places given in the system prompt (H10) to map place names to letters and cells; `list_places` stays available as a tool but is not required; never assume a cell.
  3. Find origin and destination in that list; a name that clearly refers to a listed place is that place ("terrace" is the terrace door).
     If the origin is not stated, ask where the robot is; if a place matches none in the list, ask which place is meant; in both cases stop: no `run_policy`.
  4. Call `run_policy` and answer only with the exact steps and return it gives; do not describe or list the route (the full path stays in the tool result).
  5. If a tool returns `"error: ..."`, explain the error to the user instead of retrying with invented values.
- Reinforced in code (H10), so two decisions no longer depend on the model:
  - places: the agent calls `list_places()` itself when it is built and appends the result to the system prompt (`Places (from list_places): [...]`);
  - describing instead of acting: if the final answer names a tool (`list_places` or `run_policy`) as text, the agent sends once more the message `Call the tool; do not describe the steps.` and keeps the new answer. At most one retry; both turns stay in the printed trace.
- Entry point: the request is a command-line argument; it prints every message (`pretty_print`): request, tool calls, tool results and final answer.
- The model is injectable: tests build the agent with the LLM double instead of `ChatOllama`.

## Cases (R5, H6)
| # | Request | Tools called | The answer must |
|---|---|---|---|
| 1 | "Take this dish from the kitchen to the terrace" | `run_policy(0, 0, "T")` | say 13 steps |
| 2 | "The robot is at the bar; send it back to the kitchen" | `run_policy(0, 8, "K")` | say 12 steps |
| 3 | "Take the dish from the kitchen to the storeroom" | no `run_policy` | ask which place "storeroom" is |
| 4 | "What wine do you recommend?" | no `run_policy` | say it is outside the robot's job |
- Since H10 `list_places` is called by the code, so the model may or may not call it again; in H6 (attempts 1-5) it was expected as the first tool call.
- With the double (H5): one test runs case 1 end to end (request → tool calls → answer with 13 steps); another runs case 4 and checks `run_policy` is not called.
  H10 adds: the places are in the system prompt; an answer that names a tool triggers exactly one retry; a normal answer triggers none.
- With the real model (H6, and attempt 6 in H10): the four cases are run, the tools called and the answer are recorded in a table, and two full traces go into the report.

## Code rules
- uv application project, Python pinned with `uv python pin 3.14`. `pyproject.toml`, `uv.lock` and `.python-version` are committed.
- Package `src/waiter_robot/`: `env.py`, `q_table.py`, `train.py`, `evaluate.py`, `experiment.py`, `tools.py`, `agent.py`, `export_viz.py`.
- Entry points in `[project.scripts]`: `uv run train`, `uv run evaluate`, `uv run experiment`, `uv run agent "<request>"`, `uv run export-viz`.
- Dependencies: `numpy`, `gymnasium`, `matplotlib`, `langchain`, `langchain-ollama`; dev: `pytest`. Nothing else without asking.
- Every command runs from the project root; `data/map.txt` and `q_table.npy` live there.
- Everything in English: code, docstrings, messages, README. Type hints on every function.
- Tests in `tests/`: `uv run pytest` passes with no network, no Ollama and no token. The LLM double is `ScriptedModel` in `tests/`:
  a fake chat model with a fixed list of replies (tool calls, then a final text) and a `bind_tools` that returns itself.
- Never edit `data/map.txt`, `CLAUDE.md` or `.claude/`; never read `.env`. Never retrain inside `tools.py` or `agent.py`.
- `README.md` lists the exact commands, in order, to go from a clean clone to every result. Each milestone updates it.
- One milestone at a time: only the files its command names are touched; every diff is reviewed before accepting.

## Milestones
Each milestone has a command in `.claude/commands/`; it is closed when its criterion holds, `worklog.md` has its entry and it is committed.
| Milestone | Command | Delivers | Closing criterion |
|---|---|---|---|
| H0 | `/setup` | uv project, dependencies, `.gitignore`, README skeleton | `uv run pytest` starts; `deny` covers `CLAUDE.md`, `.claude/`, `data/map.txt`, `.env` |
| H1 | `/build-env` | `env.py`, `tests/test_env.py` | `check_env` passes; one test per `step` rule (7) and one for the state number |
| H2 | `/train` | `q_table.py`, `train.py`, `evaluate.py`, `q_table.npy` | `shortest routes:` at least 112/117 |
| H3 | `/experiment` | `experiment.py`, `results/experiment.png` | plot with two curves (α = 0.5 and 0.1) |
| H4 | `/tools` | `tools.py`, `tests/test_tools.py` | one test per `run_policy` error (5) and one correct route |
| H5 | `/agent` | `agent.py`, `tests/scripted_model.py`, `tests/test_agent.py` | case 1 end to end with the double; case 4 does not call `run_policy` |
| H6 | `/evaluate-agent` | `results/cases.md`, `results/traces/` | table of the four cases with the real model; two full traces |
| H7 | `/final-check` | `informe.pdf` (written by the student) | clean clone + README commands work; no keys in the zip |
| H8 | `/visualize` | `export_viz.py`, `viz/index.html`, `viz/data.js`, `tests/test_viz.py` | export tests pass; the page shows the four modes |
| H9 | `/sandbox` | `viz/sandbox-core.js`, `viz/sandbox.html`, `tests/test_sandbox.py` | JS env matches the step tuples; JS training reaches 117/117 on the original map |
| H10 | `/reinforce-agent` | `agent.py`, `tests/test_agent.py`, `results/cases.md`, `results/traces/` | double tests for places and retry pass; attempt 6 with the real model recorded |
| H11 | `/seeds` | `experiment.py`, `tests/test_experiment.py`, `results/experiment_seeds.png` | plot with mean and min-max band over 5 seeds for both α |

## 3D visualization (extra, H8)
- Not required by the assignment: it shows the trained policy and the agent cases. It never retrains `q_table.npy` and never calls the LLM.
- `uv run export-viz` writes `viz/data.js` (`window.VIZ_DATA = {...}`), so `viz/index.html` opens from disk with no server. It contains:
  - the map, the places and the BFS distance of every (origin, destination) pair;
  - for α = 0.5 (`q_table.npy`) and α = 0.1 (trained in memory: 3000 episodes, seed 0): the best action of every free cell for each destination, and the route of the 117 pairs (`steps`, `return`, `path`, shortest yes/no);
  - the four agent cases from `results/traces/case1-4.txt`: request, tools called, final answer and the `run_policy` result if there is one.
- Routes come from `rollout(table, ...)` in `tools.py`, the same loop `run_policy` uses; `run_policy`'s behaviour and description do not change.
- `viz/index.html`: Three.js 0.160.0 from a CDN. The restaurant in 3D (tables, fryer area, kitchen, bar, terrace door) and a robot that moves cell by cell. Four modes:
  1. Route: pick a destination and click a start cell; shows steps, return and whether it is the shortest route; table α = 0.5 or 0.1.
  2. Policy: an arrow on every free cell with its best action for the chosen destination and table.
  3. Agent: the four requests with expected and called tools and the answer; the robot plays the `run_policy` route when there is one.
  4. Compare α: two robots, α = 0.5 and α = 0.1, from the same start (default: bar → kitchen, 12 vs 16 steps).
- Tests (`tests/test_viz.py`): 117 routes per table, all shortest for α = 0.5; α = 0.1 from the bar to the kitchen takes more than 12 steps; case 1 has `run_policy(0, 0, "T")` with 13 steps; the export does not change `q_table.npy`.

## Map sandbox (extra, H9)
- Not required by the assignment and not part of the evaluated system: a browser simulator that shows why a Q table only works for the map it was trained on ("if the map changes, Q-learning must retrain; search recomputes at once").
- `data/map.txt`, `q_table.npy` and the Python code are never changed; edits exist only in the browser.
- `viz/sandbox-core.js`: the environment rules of "States and environment" and the training of "Training and evaluation" reimplemented in JavaScript (α = 0.5, γ = 0.9, random actions, `update` with `terminated`, 100-step limit), with a seeded random generator (seed 0; it does not reproduce NumPy's numbers), BFS and the evaluation over every pair. It runs in the browser and in Node.
- `viz/sandbox.html`: the 3D restaurant of H8 where tables can be dragged to another free cell and people taken from a tray outside the map and dropped on a free cell (or dragged back out). Places and the fryer area do not move.
  - A move is accepted only if every free cell stays connected to the three places (BFS); otherwise the piece goes back and a message says why.
  - For the chosen start and destination, three robots: the original table (`q_table.npy`, exported to `viz/data.js`), a table retrained in the browser on the edited map (blocks of 100 episodes until 100 % of the pairs follow the shortest route, at most 5000; the page shows the episodes used), and the BFS route.
- Tests (`tests/test_sandbox.py`, run with Node; skipped if Node is missing): the JS `step` gives the five tuples of "States and environment"; JS training on the original map reaches 117/117; a person placement that isolates a cell is rejected.
