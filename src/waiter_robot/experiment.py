"""Compare learning rates: % shortest routes after each block of training episodes."""
from pathlib import Path

import matplotlib

matplotlib.use("Agg")  # file output only, no window
import matplotlib.pyplot as plt

from waiter_robot.evaluate import shortest_routes
from waiter_robot.train import EPISODES, GAMMA, SEED, WaiterTrainer

ALPHAS = [0.5, 0.1]
BLOCK = 100
TARGET = 95.0
PLOT_PATH = Path("results/experiment.png")
COLORS = {0.5: "#2a78d6", 0.1: "#eb6834"}  # categorical slots 1 and 2


def learning_curve(alpha: float) -> list[float]:
    """% shortest routes after each block of BLOCK episodes, up to EPISODES."""
    trainer = WaiterTrainer(alpha=alpha, gamma=GAMMA, seed=SEED)
    curve = []
    for _ in range(EPISODES // BLOCK):
        trainer.train(BLOCK)  # keeps training the same table and env
        good, total = shortest_routes(trainer.table)
        curve.append(100 * good / total)
    return curve


def plot(curves: dict[float, list[float]], path: Path) -> None:
    """Save one curve per alpha and the target line to `path`."""
    episodes = [BLOCK * (i + 1) for i in range(EPISODES // BLOCK)]
    fig, ax = plt.subplots(figsize=(8, 4.5))
    for alpha, curve in curves.items():
        ax.plot(episodes, curve, color=COLORS[alpha], linewidth=2,
                marker="o", markersize=4, label=f"α = {alpha}")
    ax.axhline(TARGET, color="#52514e", linewidth=1, linestyle="--",
               label=f"{TARGET:.0f} % target")
    ax.set_xlabel("training episodes")
    ax.set_ylabel("% shortest routes (117 pairs)")
    ax.set_title(f"Greedy policy quality while training (γ = {GAMMA}, seed {SEED})")
    ax.set_xlim(0, EPISODES)
    ax.set_ylim(0, 102)
    ax.grid(color="#e5e4e0", linewidth=0.8)
    ax.spines[["top", "right"]].set_visible(False)
    ax.legend(loc="lower right", frameon=False)
    fig.tight_layout()
    path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(path, dpi=150)
    plt.close(fig)


def main() -> None:
    curves = {alpha: learning_curve(alpha) for alpha in ALPHAS}
    for alpha, curve in curves.items():
        first = next((i for i, p in enumerate(curve) if p >= TARGET), None)
        reached = ("never" if first is None
                   else f"block {first + 1} ({BLOCK * (first + 1)} episodes)")
        print(f"alpha={alpha}: first block >= {TARGET:.0f} %: {reached}; "
              f"final: {curve[-1]:.1f} %")
    plot(curves, PLOT_PATH)
    print(f"saved {PLOT_PATH}")


if __name__ == "__main__":
    main()
