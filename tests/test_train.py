import numpy as np

from waiter_robot.evaluate import load_table, shortest_routes
from waiter_robot.train import WaiterTrainer


def test_training_is_reproducible() -> None:
    first = WaiterTrainer(seed=0)
    first.train(200)
    second = WaiterTrainer(seed=0)
    second.train(200)
    assert np.array_equal(first.table.q, second.table.q)


def test_evaluation_does_not_change_table() -> None:
    table = load_table()
    before = table.q.copy()
    assert shortest_routes(table) == (117, 117)
    assert np.array_equal(table.q, before)
