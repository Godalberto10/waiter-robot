import numpy as np
import pytest

from waiter_robot import tools
from waiter_robot.q_table import QTable


def test_list_places() -> None:
    assert tools.list_places() == [
        {"letter": "B", "name": "bar", "row": 0, "col": 8},
        {"letter": "K", "name": "kitchen", "row": 0, "col": 0},
        {"letter": "T", "name": "terrace door", "row": 5, "col": 8},
    ]


def test_error_off_the_map() -> None:
    with pytest.raises(ValueError, match="off the map"):
        tools.run_policy(6, 0, "T")


def test_error_table() -> None:
    with pytest.raises(ValueError, match="is a table"):
        tools.run_policy(0, 5, "T")


def test_error_danger() -> None:
    with pytest.raises(ValueError, match="danger"):
        tools.run_policy(1, 2, "T")


@pytest.mark.parametrize("destination", ["X", "t"])
def test_error_not_a_place(destination: str) -> None:
    with pytest.raises(ValueError, match="not a place letter"):
        tools.run_policy(0, 0, destination)


def test_error_start_is_destination() -> None:
    with pytest.raises(ValueError, match="already the destination"):
        tools.run_policy(0, 0, "K")


def test_route_kitchen_to_terrace(monkeypatch: pytest.MonkeyPatch) -> None:
    def no_update(*args: object) -> None:
        raise AssertionError("run_policy must not call update")

    monkeypatch.setattr(QTable, "update", no_update)
    before = tools.QTABLE.q.copy()

    result = tools.run_policy(0, 0, "T")

    assert result["reached"] is True
    assert result["steps"] == 13
    assert result["return"] == 8.0
    assert len(result["path"]) == 14
    assert result["path"][0] == [0, 0]
    assert result["path"][-1] == [5, 8]
    assert np.array_equal(tools.QTABLE.q, before)


@pytest.mark.parametrize(
    ("start", "destination", "steps", "ret"),
    [((0, 8), "K", 12, 9.0), ((0, 8), "T", 5, 16.0)],
)
def test_other_routes(start: tuple[int, int], destination: str, steps: int, ret: float) -> None:
    result = tools.run_policy(*start, destination)
    assert (result["reached"], result["steps"], result["return"]) == (True, steps, ret)
    assert len(result["path"]) == steps + 1
