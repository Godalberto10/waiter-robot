import json
import shutil
import subprocess
from pathlib import Path

import pytest

NODE = shutil.which("node")
pytestmark = pytest.mark.skipif(NODE is None, reason="Node is needed to run viz/sandbox-core.js")

# Loads the exported data and the JS core, then runs `body`, which must print one JSON value.
PRELUDE = """
global.window = {};
require(process.cwd() + "/viz/data.js");
const S = require(process.cwd() + "/viz/sandbox-core.js");
const g = new S.Grid(window.VIZ_DATA.map);
"""


def node(body: str):
    if not Path("viz/data.js").exists():
        pytest.skip("run `uv run export-viz` first")
    out = subprocess.run([NODE, "-e", PRELUDE + body], capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


def test_js_step_matches_the_contract() -> None:
    # The five step tuples of CLAUDE.md, "States and environment"; heading to T.
    steps = node("""
    const step = (r, c, a) => { const e = new S.Env(g, () => 0); e.reset([r, c], "T"); return e.step(a); };
    console.log(JSON.stringify([step(0, 0, 1), step(0, 4, 1), step(0, 2, 2), step(4, 8, 2), step(1, 8, 0)]));
    """)
    assert steps == [
        [109, -1, False, False],
        [112, -1, False, False],
        [119, -50, True, False],
        [161, 20, True, False],
        [116, -1, False, False],
    ]


def test_js_training_reaches_all_pairs_on_the_original_map() -> None:
    last = node("""
    let last; for (const b of S.trainBlocks(g)) last = b;
    console.log(JSON.stringify({episodes: last.episodes, good: last.good, total: last.total}));
    """)
    assert (last["good"], last["total"]) == (117, 117)
    assert last["episodes"] <= 5000


def test_original_table_is_exported_whole() -> None:
    assert node("console.log(JSON.stringify(S.evaluate(g, S.QTable.from(window.VIZ_DATA.q))));") == {
        "good": 117, "total": 117}


def test_blocking_placements_are_rejected() -> None:
    result = node("""
    console.log(JSON.stringify({
      isolate_kitchen: S.isConnected(g.with(0, 1, "o").with(1, 0, "o")),
      pocket_between_tables: S.isConnected(g.with(4, 4, "o")),
      harmless_guest: S.isConnected(g.with(2, 6, "o")),
    }));
    """)
    assert result == {"isolate_kitchen": False, "pocket_between_tables": False, "harmless_guest": True}


def test_moved_table_breaks_the_original_table_but_not_a_retrained_one() -> None:
    result = node("""
    const moved = g.with(2, 5, "#").with(0, 5, ".");
    const orig = S.QTable.from(window.VIZ_DATA.q);
    let last; for (const b of S.trainBlocks(moved)) last = b;
    console.log(JSON.stringify({
      original: S.rollout(moved, orig, [0, 8], "K").reached,
      retrained: S.rollout(moved, last.table, [0, 8], "K").steps,
      bfs: S.bfsPath(moved, [0, 8], "K").length - 1,
    }));
    """)
    assert result == {"original": False, "retrained": 8, "bfs": 8}
