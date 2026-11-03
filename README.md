# waiter-robot

Waiter robot in a restaurant: an LLM agent that turns natural-language requests into routes, and a Q-learning table that decides how to move on a grid.

## How to run

Run every command from the project root.

```
uv sync
uv run pytest
uv run train      # trains the Q table (alpha 0.5, gamma 0.9, 3000 episodes, seed 0) -> q_table.npy
uv run evaluate   # greedy run over the 117 pairs -> "shortest routes: N/117 (P %)"
uv run experiment # alpha 0.5 vs 0.1, evaluated every 100 episodes -> results/experiment.png
```

The agent needs [Ollama](https://ollama.com) running locally with the model pulled (`ollama pull qwen2.5:14b`):

```
uv run agent "Take this dish from the kitchen to the terrace"
```

3D visualization (extra): export the routes of both tables and the agent cases, then open the page in a browser (it loads Three.js from a CDN, so it needs internet):

```
uv run export-viz   # -> viz/data.js (q_table.npy is only read)
```

Open `viz/index.html` (double click). Modes: Route, Policy, Agent, Compare α; `viz/index.html#compare` opens a mode directly.

Map sandbox (extra): open `viz/sandbox.html`. Drag tables to other cells or guests from the tray onto the floor; moves that would cut a cell off are refused. Three robots run from the chosen start: the original `q_table.npy`, a table retrained in the browser on the edited map, and BFS. The environment and training are reimplemented in JavaScript (`viz/sandbox-core.js`); `data/map.txt` and `q_table.npy` never change. `viz/sandbox.html#move-table` opens a ready example. Its tests (`tests/test_sandbox.py`) need [Node.js](https://nodejs.org) and are skipped without it.
