"""Evaluate a Q table: share of (origin, destination) pairs it solves by a shortest route."""
from collections import deque

import gymnasium as gym
import numpy as np

import waiter_robot.env  # noqa: F401  (registers WaiterRobot-v0)
from waiter_robot.env import MOVES, WaiterRobotEnv
from waiter_robot.q_table import QTable

Q_TABLE_PATH = "q_table.npy"
MAX_STEPS = 100


def bfs_distances(env: WaiterRobotEnv, goal: tuple[int, int]) -> dict[tuple[int, int], int]:
    """Shortest number of steps from every free cell to `goal`, moving only through free cells."""
    dist = {goal: 0}
    frontier = deque([goal])
    while frontier:
        r, c = frontier.popleft()
        for dr, dc in MOVES.values():
            nxt = (r + dr, c + dc)
            if env.is_free(nxt) and nxt not in dist:
                dist[nxt] = dist[(r, c)] + 1
                frontier.append(nxt)
    return dist


def greedy_steps(env: gym.Env, table: QTable, start: tuple[int, int],
                 destination: str) -> int | None:
    """Steps the greedy policy takes from `start` to `destination`, or None if it does not arrive."""
    s, _ = env.reset(options={"start": start, "destination": destination})
    for steps in range(1, MAX_STEPS + 1):
        s, r, terminated, truncated, _ = env.step(table.best_action(s))
        if terminated:
            return steps if r > 0 else None  # positive reward only at the destination
        if truncated:
            return None
    return None


def shortest_routes(table: QTable) -> tuple[int, int]:
    """(pairs solved by a shortest route, total pairs). Never calls `update`."""
    env = gym.make("WaiterRobot-v0", max_episode_steps=MAX_STEPS)
    base: WaiterRobotEnv = env.unwrapped
    good, total = 0, 0
    for letter, goal in base.places.items():
        dist = bfs_distances(base, goal)
        for start in base.free_cells:
            if start == goal:
                continue
            total += 1
            if greedy_steps(env, table, start, letter) == dist.get(start):
                good += 1
    return good, total


def load_table(filename: str = Q_TABLE_PATH) -> QTable:
    """QTable whose values are read from `filename`."""
    q = np.load(filename)
    table = QTable(n_states=q.shape[0], n_actions=q.shape[1])
    table.q = q
    return table


def main() -> None:
    table = load_table()
    good, total = shortest_routes(table)
    print(f"shortest routes: {good}/{total} ({100 * good / total:.1f} %)")


if __name__ == "__main__":
    main()
