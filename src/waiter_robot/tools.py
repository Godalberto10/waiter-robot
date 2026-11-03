"""Tools the LLM agent can call: list the places and run the trained policy.

The Q table is loaded once, when this module is imported. It is never trained
here: only `best_action` is used, never `update`.
"""
import gymnasium as gym
import numpy as np

import waiter_robot.env  # noqa: F401  (registers WaiterRobot-v0)
from waiter_robot.env import DANGER, GOAL_REWARD, TABLE, WaiterRobotEnv
from waiter_robot.q_table import QTable

Q_TABLE_PATH = "q_table.npy"
MAX_STEPS = 100
PLACE_NAMES = {"B": "bar", "K": "kitchen", "T": "terrace door"}

_q = np.load(Q_TABLE_PATH)
QTABLE = QTable(n_states=_q.shape[0], n_actions=_q.shape[1])
QTABLE.q = _q

# The passive checker breaks after a reset that raises; check_env covers the env in tests.
ENV = gym.make("WaiterRobot-v0", max_episode_steps=MAX_STEPS, disable_env_checker=True)
MAP: WaiterRobotEnv = ENV.unwrapped


def list_places() -> list[dict]:
    """List the places of the restaurant the robot can go to.

    Call this first, before any route, to translate the place names in the
    request (kitchen, bar, terrace door) into a letter and a cell. A place
    that is not in this list does not exist on the map.

    Returns:
        One dict per place, in alphabetical order of letter, with keys
        "letter", "name", "row" and "col".
    """
    return [
        {"letter": letter, "name": PLACE_NAMES.get(letter, letter),
         "row": row, "col": col}
        for letter, (row, col) in MAP.places.items()
    ]


def _validate(start_row: int, start_col: int, destination: str) -> None:
    """Raise ValueError with the cause if the request cannot be run."""
    for name, value in (("start_row", start_row), ("start_col", start_col)):
        if not isinstance(value, int) or isinstance(value, bool):
            raise ValueError(f"{name} must be an integer, got {value!r}")
    cell = (start_row, start_col)
    if not MAP.in_bounds(cell):
        raise ValueError(
            f"start {cell} is off the map: rows go from 0 to {MAP.n_rows - 1} "
            f"and columns from 0 to {MAP.n_cols - 1}"
        )
    content = MAP.grid[start_row][start_col]
    if content == TABLE:
        raise ValueError(f"start {cell} is a table; the robot cannot stand there")
    if content == DANGER:
        raise ValueError(f"start {cell} is in the fryer area (danger); the robot cannot stand there")
    if destination not in MAP.places:
        letters = ", ".join(MAP.places)
        raise ValueError(
            f"destination {destination!r} is not a place letter; "
            f"use one of {letters} (uppercase)"
        )
    if cell == MAP.places[destination]:
        name = PLACE_NAMES.get(destination, destination)
        raise ValueError(f"start {cell} is already the destination {destination} ({name})")


def _cell(state: int) -> list[int]:
    """[row, col] of the robot in `state`."""
    row, col = divmod(state % MAP.n_cells, MAP.n_cols)
    return [row, col]


def run_policy(start_row: int, start_col: int, destination: str) -> dict:
    """Move the robot from a start cell to a destination with the trained policy.

    Use it for every route request, after `list_places` has given the cells
    and letters. Use the figures it returns; do not compute routes yourself.

    Args:
        start_row: row of the cell where the robot is now (0 is the top row).
        start_col: column of the cell where the robot is now (0 is the left column).
        destination: letter of the destination place: "B", "K" or "T" (uppercase).

    Returns:
        {"reached": bool, "steps": int, "return": float, "path": [[row, col], ...]}.
        "reached" is True if the robot arrived; "steps" is the number of moves;
        "return" is the total reward; "path" lists every cell visited, from the
        start to the last cell (steps + 1 cells).

    Raises:
        ValueError: the start is off the map, a table or the fryer area; the
            destination is not a place letter; or the start is the destination.
    """
    _validate(start_row, start_col, destination)
    return rollout(QTABLE, start_row, start_col, destination)


def rollout(table: QTable, start_row: int, start_col: int, destination: str) -> dict:
    """Follow `table.best_action` from the start cell; same result format as `run_policy`.

    The start and destination must already be valid. The table is only read.
    """
    s, _ = ENV.reset(options={"start": (start_row, start_col), "destination": destination})
    path = [_cell(s)]
    total = 0.0
    reached = False
    done = False
    while not done:
        s, r, terminated, truncated, _ = ENV.step(table.best_action(s))
        path.append(_cell(s))
        total += float(r)
        reached = terminated and r == GOAL_REWARD
        done = terminated or truncated
    return {"reached": reached, "steps": len(path) - 1, "return": total, "path": path}
