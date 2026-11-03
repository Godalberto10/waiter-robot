"""Train the waiter robot's Q table with random actions and save it."""
import gymnasium as gym
import numpy as np

import waiter_robot.env  # noqa: F401  (registers WaiterRobot-v0)
from waiter_robot.q_table import QTable

ALPHA = 0.5
GAMMA = 0.9
EPISODES = 3000
SEED = 0
Q_TABLE_PATH = "q_table.npy"


class WaiterTrainer:
    def __init__(self, alpha: float = ALPHA, gamma: float = GAMMA,
                 seed: int = SEED) -> None:
        self.env = gym.make("WaiterRobot-v0")
        self.env.reset(seed=seed)  # fixes the random numbers of the env
        self.env.action_space.seed(seed)  # same random actions every run
        self.table = QTable(n_states=self.env.observation_space.n,
                            n_actions=self.env.action_space.n,
                            alpha=alpha, gamma=gamma)

    def train(self, episodes: int) -> None:
        for _ in range(episodes):
            s, _ = self.env.reset()
            done = False
            while not done:
                a = self.env.action_space.sample()  # random action
                s2, r, terminated, truncated, _ = self.env.step(a)
                # terminated, never truncated: a cut at 100 steps does not
                # make the future worth 0
                self.table.update(s, a, r, s2, terminated)
                s = s2
                done = terminated or truncated

    def save(self, filename: str) -> None:
        np.save(filename, self.table.q)  # 162 rows x 4 columns


def main() -> None:
    trainer = WaiterTrainer()
    trainer.train(EPISODES)
    trainer.save(Q_TABLE_PATH)
    print(f"trained {EPISODES} episodes (alpha={ALPHA}, gamma={GAMMA}, "
          f"seed={SEED})")
    print(f"saved {Q_TABLE_PATH}: {trainer.table.q.shape}")


if __name__ == "__main__":
    main()
