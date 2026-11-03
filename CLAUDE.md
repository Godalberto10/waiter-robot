# Waiter robot · Lab Assignment II (topic 7)

## Brief
A waiter robot in a restaurant carries dishes and drinks between the kitchen (K), the bar (B) and the terrace door (T).
- Example requests:
  - "Take this dish from the kitchen to the terrace" → origin K, destination T.
  - "The robot is at the bar; send it back to the kitchen" → origin B, destination K.
  - "Take these drinks from the bar to the terrace" → origin B, destination T.
- The LLM (Ollama, `qwen2.5:7b`) understands the request, extracts origin and destination, calls the tools and writes the answer in English.
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
  - Without `options`: draws with `self.np_random` a destination and a free start cell that is not the destination (may be another place; never a table or danger).
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
- Built like `route_agent.py` / `cliff_agent.py`: LangChain `create_agent` with `ChatOllama(model="qwen2.5:7b", temperature=0)`; no token, no `.env`.
- Tools: `list_places` and `run_policy` (the wrappers above). The system prompt, in English, says:
  - always call `list_places` first to map place names to letters and cells; never assume a cell;
  - call `run_policy` for every route and answer only with the figures it returns (steps, return, path);
  - if the origin is not stated, ask where the robot is; if a place is not in `list_places`, ask which place is meant; in both cases do not call `run_policy`;
  - if the request is not about moving the robot, say the robot only carries things between kitchen, bar and terrace door, and do not call `run_policy`;
  - if a tool returns `"error: ..."`, explain the error to the user instead of retrying with invented values.
- Entry point: the request is a command-line argument; it prints every message (`pretty_print`): request, tool calls, tool results and final answer.
- The model is injectable: tests build the agent with the LLM double instead of `ChatOllama`.

## Cases (R5, H6)
| # | Request | Tools called | The answer must |
|---|---|---|---|
| 1 | "Take this dish from the kitchen to the terrace" | `list_places`, `run_policy(0, 0, "T")` | say 13 steps |
| 2 | "The robot is at the bar; send it back to the kitchen" | `list_places`, `run_policy(0, 8, "K")` | say 12 steps |
| 3 | "Take the dish from the kitchen to the storeroom" | no `run_policy` | ask which place "storeroom" is |
| 4 | "What wine do you recommend?" | no `run_policy` | say it is outside the robot's job |
- With the double (H5): one test runs case 1 end to end (request → tool calls → answer with 13 steps); another runs case 4 and checks `run_policy` is not called.
- With the real model (H6): the four cases are run, the tools called and the answer are recorded in a table, and two full traces go into the report.

## Code rules
- uv application project, Python pinned with `uv python pin 3.14`. `pyproject.toml`, `uv.lock` and `.python-version` are committed.
- Package `src/waiter_robot/`: `env.py`, `q_table.py`, `train.py`, `evaluate.py`, `experiment.py`, `tools.py`, `agent.py`.
- Entry points in `[project.scripts]`: `uv run train`, `uv run evaluate`, `uv run experiment`, `uv run agent "<request>"`.
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
