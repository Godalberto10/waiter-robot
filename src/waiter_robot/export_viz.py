"""Export the map, the routes of both tables and the agent cases for the 3D visualization."""
import json
import re
from pathlib import Path

from waiter_robot.evaluate import bfs_distances, load_table
from waiter_robot.q_table import QTable
from waiter_robot.tools import MAP, list_places, rollout
from waiter_robot.train import EPISODES, GAMMA, SEED, WaiterTrainer

VIZ_PATH = Path("viz/data.js")
TRACES_DIR = Path("results/traces")
CASES_TABLE = Path("results/cases.md")

# Expected tools of the four cases, as in CLAUDE.md, section "Cases (R5, H6)" (since H10).
EXPECTED_TOOLS = [
    'run_policy(0, 0, "T")',
    'run_policy(0, 8, "K")',
    "no run_policy",
    "none",
]

HEADER = re.compile(r"^=+ (Human|Ai|Tool) Message =+$", re.MULTILINE)


def key(cell: tuple[int, int]) -> str:
    """JSON key of a cell: "row,col"."""
    return f"{cell[0]},{cell[1]}"


def table_data(table: QTable) -> dict:
    """Best action of every free cell and route of every pair, for each destination."""
    policy, routes, good = {}, {}, 0
    for letter, goal in MAP.places.items():
        dest = MAP.destinations.index(letter)
        dist = bfs_distances(MAP, goal)
        policy[letter] = {key(c): table.best_action(MAP.encode(c, dest))
                          for c in MAP.free_cells if c != goal}
        routes[letter] = {}
        for start in MAP.free_cells:
            if start == goal:
                continue
            route = rollout(table, start[0], start[1], letter)
            route["shortest"] = route["reached"] and route["steps"] == dist[start]
            good += route["shortest"]
            routes[letter][key(start)] = route
    return {"policy": policy, "routes": routes, "shortest": good}


def parse_trace(text: str) -> dict:
    """Request, tool calls, tool results and final answer of a `pretty_print` trace."""
    parts = HEADER.split(text)
    request, answer, calls, results = "", "", [], {}
    for kind, body in zip(parts[1::2], parts[2::2]):
        body = body.strip("\n")
        if kind == "Human":
            request = body.strip()
        elif kind == "Ai" and "Tool Calls:" in body:
            for name, args in re.findall(r"^  (\w+) \(.*\)\n Call ID: .*\n  Args:(?:\n|$)((?:    .*\n?)*)",
                                         body, re.MULTILINE):
                parsed = dict(re.findall(r"^    (\w+): (.*)$", args, re.MULTILINE))
                calls.append({"name": name, "args": {k: int(v) if v.isdigit() else v
                                                     for k, v in parsed.items()}})
        elif kind == "Ai":
            answer = body.strip()
        elif kind == "Tool":
            name = re.match(r"Name: (\w+)", body).group(1)
            results[name] = json.loads(body.split("\n", 2)[2].strip())
    return {"request": request, "calls": calls, "answer": answer,
            "run_policy": results.get("run_policy")}


def cases_meet() -> list[bool]:
    """The "Meets" column of results/cases.md, one value per case."""
    rows = re.findall(r"^\| [1-4] \|.*\| (yes|no)[^|]*\|$", CASES_TABLE.read_text(encoding="utf-8"),
                      re.MULTILINE)
    return [row == "yes" for row in rows]


def agent_cases() -> list[dict]:
    """The four agent cases of the final attempt."""
    meets = cases_meet()
    cases = []
    for n in range(1, 5):
        text = (TRACES_DIR / f"case{n}.txt").read_text(encoding="utf-8-sig")
        case = parse_trace(text.replace("\r\n", "\n"))
        case.update(n=n, expected=EXPECTED_TOOLS[n - 1], meets=meets[n - 1])
        cases.append(case)
    return cases


def build() -> dict:
    """Everything the page needs. `q_table.npy` is only read."""
    slow = WaiterTrainer(alpha=0.1, gamma=GAMMA, seed=SEED)
    slow.train(EPISODES)  # in memory only
    bfs = {letter: {key(c): d for c, d in bfs_distances(MAP, goal).items() if c != goal}
           for letter, goal in MAP.places.items()}
    table = load_table()
    return {
        "q": table.q.round(6).tolist(),  # full table, for the sandbox (H9) on edited maps
        "map": MAP.grid,
        "places": list_places(),
        "bfs": bfs,
        "pairs": sum(len(d) for d in bfs.values()),
        "tables": {"0.5": table_data(table), "0.1": table_data(slow.table)},
        "episodes": EPISODES,
        "cases": agent_cases(),
    }


def main() -> None:
    data = build()
    VIZ_PATH.parent.mkdir(parents=True, exist_ok=True)
    VIZ_PATH.write_text("window.VIZ_DATA = " + json.dumps(data, ensure_ascii=False) + ";\n",
                        encoding="utf-8")
    for alpha, table in data["tables"].items():
        print(f"alpha={alpha}: shortest routes {table['shortest']}/{data['pairs']}")
    print(f"agent cases: {len(data['cases'])}; saved {VIZ_PATH}")


if __name__ == "__main__":
    main()
