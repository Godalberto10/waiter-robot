"""Gymnasium environment for the waiter robot, built from data/map.txt."""

from pathlib import Path
from typing import Any

import gymnasium
import numpy as np
from gymnasium import spaces

MAP_PATH = Path("data/map.txt")
ENV_ID = "WaiterRobot-v0"

TABLE = "#"
DANGER = "~"

STEP_REWARD = -1.0
DANGER_REWARD = -50.0
GOAL_REWARD = 20.0

# Actions: 0 up, 1 right, 2 down, 3 left, as (row, col) offsets.
MOVES = {0: (-1, 0), 1: (0, 1), 2: (1, 0), 3: (0, -1)}


def read_map(path: Path = MAP_PATH) -> list[str]:
    """Return the map rows read from the file, one string per row."""
    rows = [line for line in path.read_text(encoding="utf-8").splitlines() if line]
    if not rows or any(len(row) != len(rows[0]) for row in rows):
        raise ValueError(f"map {path} must be a non-empty rectangle")
    return rows


class WaiterRobotEnv(gymnasium.Env):
    """Robot moving on a restaurant grid towards one of the places (capital letters).

    State = destination_index * rows * cols + row * cols + col, where destinations
    are numbered in alphabetical order of their letter.
    """

    metadata = {"render_modes": []}

    def __init__(self, map_path: str | Path = MAP_PATH) -> None:
        self.grid = read_map(Path(map_path))
        self.n_rows = len(self.grid)
        self.n_cols = len(self.grid[0])
        self.n_cells = self.n_rows * self.n_cols

        found = {
            ch: (r, c)
            for r, row in enumerate(self.grid)
            for c, ch in enumerate(row)
            if ch.isupper()
        }
        self.places: dict[str, tuple[int, int]] = dict(sorted(found.items()))
        self.destinations: list[str] = list(self.places)
        self.free_cells: list[tuple[int, int]] = [
            (r, c)
            for r in range(self.n_rows)
            for c in range(self.n_cols)
            if self.is_free((r, c))
        ]

        self.observation_space = spaces.Discrete(len(self.destinations) * self.n_cells)
        self.action_space = spaces.Discrete(len(MOVES))

        self._pos: tuple[int, int] | None = None
        self._dest: int | None = None
        self._terminated = False

    def in_bounds(self, cell: tuple[int, int]) -> bool:
        """True if the cell lies inside the map."""
        r, c = cell
        return 0 <= r < self.n_rows and 0 <= c < self.n_cols

    def is_free(self, cell: tuple[int, int]) -> bool:
        """True if the cell is inside the map and is neither a table nor danger."""
        return self.in_bounds(cell) and self.grid[cell[0]][cell[1]] not in (TABLE, DANGER)

    def encode(self, cell: tuple[int, int], destination: int) -> int:
        """State number for the robot at `cell` heading to destination index `destination`."""
        return destination * self.n_cells + cell[0] * self.n_cols + cell[1]

    def reset(
        self, *, seed: int | None = None, options: dict[str, Any] | None = None
    ) -> tuple[int, dict]:
        super().reset(seed=seed)
        if not options:
            dest = int(self.np_random.integers(len(self.destinations)))
            goal = self.places[self.destinations[dest]]
            candidates = [cell for cell in self.free_cells if cell != goal]
            start = candidates[int(self.np_random.integers(len(candidates)))]
        else:
            start = tuple(options["start"])
            letter = options["destination"]
            if letter not in self.places:
                raise ValueError(
                    f"destination {letter!r} is not a place; use one of {self.destinations}"
                )
            if not self.in_bounds(start):
                raise ValueError(f"start {start} is off the map")
            if not self.is_free(start):
                raise ValueError(f"start {start} is not a free cell")
            if start == self.places[letter]:
                raise ValueError(f"start {start} is already the destination {letter!r}")
            dest = self.destinations.index(letter)

        self._pos = (int(start[0]), int(start[1]))
        self._dest = dest
        self._terminated = False
        return self.encode(self._pos, self._dest), {}

    def step(self, action: int) -> tuple[int, float, bool, bool, dict]:
        if self._pos is None or self._dest is None:
            raise RuntimeError("call reset() before step()")
        if self._terminated:
            raise RuntimeError("episode has terminated; call reset() before step()")
        if not self.action_space.contains(action):
            raise ValueError(f"invalid action {action!r}")

        dr, dc = MOVES[int(action)]
        target = (self._pos[0] + dr, self._pos[1] + dc)

        if not self.in_bounds(target) or self.grid[target[0]][target[1]] == TABLE:
            reward = STEP_REWARD
        else:
            self._pos = target
            if self.grid[target[0]][target[1]] == DANGER:
                reward = DANGER_REWARD
                self._terminated = True
            elif target == self.places[self.destinations[self._dest]]:
                reward = GOAL_REWARD
                self._terminated = True
            else:
                reward = STEP_REWARD

        return self.encode(self._pos, self._dest), reward, self._terminated, False, {}


if ENV_ID not in gymnasium.registry:
    gymnasium.register(
        id=ENV_ID,
        entry_point="waiter_robot.env:WaiterRobotEnv",
        max_episode_steps=100,
    )
