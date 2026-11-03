import warnings

import gymnasium
import pytest
from gymnasium.utils.env_checker import check_env

import waiter_robot.env  # noqa: F401  (registers WaiterRobot-v0)
from waiter_robot.env import WaiterRobotEnv

UP, RIGHT, DOWN, LEFT = 0, 1, 2, 3


def start_at(row: int, col: int, destination: str) -> gymnasium.Env:
    env = gymnasium.make("WaiterRobot-v0")
    env.reset(options={"start": (row, col), "destination": destination})
    return env


def test_state_number() -> None:
    env = WaiterRobotEnv()
    assert env.observation_space.n == 162
    assert env.reset(options={"start": (0, 0), "destination": "T"})[0] == 108
    assert env.reset(options={"start": (0, 8), "destination": "K"})[0] == 62
    assert env.reset(options={"start": (5, 8), "destination": "B"})[0] == 53


def test_reset_with_options() -> None:
    env = gymnasium.make("WaiterRobot-v0")
    assert env.reset(options={"start": (0, 0), "destination": "T"}) == (108, {})


@pytest.mark.parametrize(
    "options",
    [
        {"start": (0, 5), "destination": "T"},  # table
        {"start": (1, 2), "destination": "T"},  # danger
        {"start": (6, 0), "destination": "T"},  # off the map
        {"start": (0, 0), "destination": "X"},  # not a place
        {"start": (0, 0), "destination": "K"},  # start is the destination
    ],
)
def test_reset_value_error(options: dict) -> None:
    env = WaiterRobotEnv()
    with pytest.raises(ValueError):
        env.reset(options=options)


def test_rule1_free_cell() -> None:
    env = start_at(0, 0, "T")
    assert env.step(RIGHT) == (109, -1.0, False, False, {})


def test_rule2_table_stays() -> None:
    env = start_at(0, 4, "T")
    assert env.step(RIGHT) == (112, -1.0, False, False, {})


def test_rule3_danger() -> None:
    env = start_at(0, 2, "T")
    assert env.step(DOWN) == (119, -50.0, True, False, {})


def test_rule4_destination() -> None:
    env = start_at(4, 8, "T")
    assert env.step(DOWN) == (161, 20.0, True, False, {})


def test_rule5_other_place_is_free() -> None:
    env = start_at(1, 8, "T")
    assert env.step(UP) == (116, -1.0, False, False, {})


def test_rule6_truncated_by_make() -> None:
    env = start_at(0, 0, "T")
    for _ in range(99):
        _, _, terminated, truncated, _ = env.step(UP)
        assert not terminated and not truncated
    _, _, terminated, truncated, _ = env.step(UP)
    assert not terminated and truncated


def test_rule6_class_never_truncates() -> None:
    env = WaiterRobotEnv()
    env.reset(options={"start": (0, 0), "destination": "T"})
    for _ in range(150):
        assert env.step(UP)[3] is False


def test_rule7_step_after_terminated() -> None:
    env = start_at(4, 8, "T")
    env.step(DOWN)
    with pytest.raises(RuntimeError):
        env.step(UP)


def test_check_env() -> None:
    env = gymnasium.make("WaiterRobot-v0")
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        check_env(env.unwrapped)
    assert [str(w.message) for w in caught] == []
