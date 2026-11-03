from waiter_robot.experiment import first_block, learning_curve, summarize


def test_summarize_is_per_block() -> None:
    stats = summarize([[10.0, 50.0, 100.0], [30.0, 70.0, 100.0]])
    assert stats == {"mean": [20.0, 60.0, 100.0], "min": [10.0, 50.0, 100.0], "max": [30.0, 70.0, 100.0]}


def test_seed_0_curve_is_the_h3_curve() -> None:
    # H3 (seed 0, alpha 0.5): first block >= 95 % is block 9, and it ends at 100 %.
    curve = learning_curve(0.5, seed=0)
    assert len(curve) == 30
    assert first_block(curve) == "block 9 (900 episodes)"
    assert curve[-1] == 100.0


def test_seeds_give_different_curves() -> None:
    assert learning_curve(0.1, seed=0) != learning_curve(0.1, seed=1)
