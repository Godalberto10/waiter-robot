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
