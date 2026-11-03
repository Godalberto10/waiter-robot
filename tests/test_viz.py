import numpy as np
import pytest

from waiter_robot import export_viz, tools


@pytest.fixture(scope="module")
def data() -> dict:
    return export_viz.build()


def test_routes_per_table(data: dict) -> None:
    for alpha in ("0.5", "0.1"):
        routes = data["tables"][alpha]["routes"]
        assert sum(len(by_start) for by_start in routes.values()) == 117
    assert data["tables"]["0.5"]["shortest"] == 117


def test_alpha_01_detour_from_the_bar(data: dict) -> None:
    fast = data["tables"]["0.5"]["routes"]["K"]["0,8"]
    slow = data["tables"]["0.1"]["routes"]["K"]["0,8"]
    assert (fast["steps"], fast["shortest"]) == (12, True)
    assert slow["reached"] and slow["steps"] > 12


def test_case1_has_run_policy(data: dict) -> None:
    case1 = data["cases"][0]
    assert {"name": "run_policy", "args": {"start_row": 0, "start_col": 0, "destination": "T"}} in case1["calls"]
    assert case1["run_policy"]["steps"] == 13
    assert [c["meets"] for c in data["cases"]] == [True, True, True, True]  # attempt 6 (H10)


def test_export_does_not_change_the_table(data: dict) -> None:
    before = np.load("q_table.npy")
    export_viz.build()
    assert np.array_equal(np.load("q_table.npy"), before)
    assert np.array_equal(tools.QTABLE.q, before)
