// Map sandbox (H9): the environment and Q-learning of the Python package, reimplemented in JavaScript
// so the browser can retrain on an edited map. Classic script: `window.SandboxCore` in the browser,
// `module.exports` in Node (tests/test_sandbox.py). Rules: CLAUDE.md, "States and environment"
// and "Training and evaluation". The random numbers are not NumPy's, so the tables differ in detail.
(function (root) {
  const MOVES = [[-1, 0], [0, 1], [1, 0], [0, -1]];  // 0 up, 1 right, 2 down, 3 left
  const STEP_REWARD = -1, DANGER_REWARD = -50, GOAL_REWARD = 20, MAX_STEPS = 100;
  const TABLE = "#", DANGER = "~", PERSON = "o";  // a person is an obstacle like a table

  // Seeded generator (mulberry32): same sequence for the same seed.
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  class Grid {
    constructor(rows) {
      this.rows = rows.slice();
      this.nRows = rows.length; this.nCols = rows[0].length; this.nCells = this.nRows * this.nCols;
      const found = [];
      rows.forEach((row, r) => [...row].forEach((ch, c) => { if (ch >= "A" && ch <= "Z") found.push([ch, [r, c]]); }));
      found.sort((a, b) => (a[0] < b[0] ? -1 : 1));
      this.places = Object.fromEntries(found);   // letter -> [row, col]
      this.destinations = found.map(f => f[0]);  // alphabetical
    }
    at(r, c) { return this.rows[r][c]; }
    inBounds(r, c) { return r >= 0 && r < this.nRows && c >= 0 && c < this.nCols; }
    isFree(r, c) { return this.inBounds(r, c) && ![TABLE, DANGER, PERSON].includes(this.at(r, c)); }
    freeCells() {
      const out = [];
      for (let r = 0; r < this.nRows; r++) for (let c = 0; c < this.nCols; c++) if (this.isFree(r, c)) out.push([r, c]);
      return out;
    }
    encode(r, c, dest) { return dest * this.nCells + r * this.nCols + c; }
    // A copy with one cell changed.
    with(r, c, ch) {
      const rows = this.rows.slice();
      rows[r] = rows[r].slice(0, c) + ch + rows[r].slice(c + 1);
      return new Grid(rows);
    }
  }

  // Same rules as WaiterRobotEnv, plus the 100-step TimeLimit that gymnasium.make adds.
  class Env {
    constructor(grid, random) { this.grid = grid; this.random = random; this.nStates = grid.destinations.length * grid.nCells; }
    reset(start = null, letter = null) {
      const g = this.grid;
      let dest;
      if (start === null) {
        dest = Math.floor(this.random() * g.destinations.length);
        const goal = g.places[g.destinations[dest]];
        const cand = g.freeCells().filter(([r, c]) => r !== goal[0] || c !== goal[1]);
        start = cand[Math.floor(this.random() * cand.length)];
      } else {
        dest = g.destinations.indexOf(letter);
        if (dest < 0) throw new Error(`destination ${letter} is not a place`);
        if (!g.isFree(start[0], start[1])) throw new Error(`start (${start}) is not a free cell`);
      }
      this.pos = [start[0], start[1]]; this.dest = dest; this.steps = 0; this.terminated = false;
      return g.encode(this.pos[0], this.pos[1], dest);
    }
    step(action) {
      const g = this.grid;
      if (this.terminated) throw new Error("episode has terminated");
      const [dr, dc] = MOVES[action];
      const r = this.pos[0] + dr, c = this.pos[1] + dc;
      let reward = STEP_REWARD;
      if (g.inBounds(r, c) && g.at(r, c) !== TABLE && g.at(r, c) !== PERSON) {
        this.pos = [r, c];
        const goal = g.places[g.destinations[this.dest]];
        if (g.at(r, c) === DANGER) { reward = DANGER_REWARD; this.terminated = true; }
        else if (r === goal[0] && c === goal[1]) { reward = GOAL_REWARD; this.terminated = true; }
      }
      this.steps++;
      const truncated = !this.terminated && this.steps >= MAX_STEPS;
      return [g.encode(this.pos[0], this.pos[1], this.dest), reward, this.terminated, truncated];
    }
  }

  // The Session 5 QTable.
  class QTable {
    constructor(nStates, nActions = 4, alpha = 0.5, gamma = 0.9) {
      this.q = new Float64Array(nStates * nActions); this.nA = nActions; this.alpha = alpha; this.gamma = gamma;
    }
    static from(rows) {  // rows: [[q0, q1, q2, q3], ...] as exported from q_table.npy
      const t = new QTable(rows.length, rows[0].length);
      rows.forEach((row, s) => row.forEach((v, a) => { t.q[s * t.nA + a] = v; }));
      return t;
    }
    bestAction(s) {  // first maximum, like numpy argmax
      let best = 0;
      for (let a = 1; a < this.nA; a++) if (this.q[s * this.nA + a] > this.q[s * this.nA + best]) best = a;
      return best;
    }
    update(s, a, r, s2, done) {
      let future = 0;
      if (!done) { future = this.q[s2 * this.nA]; for (let k = 1; k < this.nA; k++) future = Math.max(future, this.q[s2 * this.nA + k]); }
      const i = s * this.nA + a;
      this.q[i] += this.alpha * (r + this.gamma * future - this.q[i]);
    }
  }

  // Random actions; update receives terminated, never truncated. Returns the number of steps taken.
  function train(env, table, episodes) {
    let steps = 0;
    for (let e = 0; e < episodes; e++) {
      let s = env.reset(), done = false;
      while (!done) {
        const a = Math.floor(env.random() * 4);
        const [s2, r, terminated, truncated] = env.step(a);
        table.update(s, a, r, s2, terminated);
        s = s2; done = terminated || truncated; steps++;
      }
    }
    return steps;
  }

  // H12: best Q value and best action of every free cell for one destination (what the table "knows").
  function cellValues(grid, table, letter) {
    const dest = grid.destinations.indexOf(letter), goal = grid.places[letter], out = [];
    for (const [r, c] of grid.freeCells()) {
      if (r === goal[0] && c === goal[1]) continue;
      const s = grid.encode(r, c, dest);
      let best = table.q[s * table.nA];
      for (let a = 1; a < table.nA; a++) best = Math.max(best, table.q[s * table.nA + a]);
      out.push({ r, c, value: best, action: table.bestAction(s) });
    }
    return out;
  }

  // Follows table.bestAction from start; same format as run_policy.
  function rollout(grid, table, start, letter) {
    const env = new Env(grid, () => 0);
    let s = env.reset(start, letter);
    const path = [[start[0], start[1]]];
    let total = 0, reached = false, done = false;
    while (!done) {
      const [s2, r, terminated, truncated] = env.step(table.bestAction(s));
      path.push([env.pos[0], env.pos[1]]); total += r; s = s2;
      reached = terminated && r === GOAL_REWARD; done = terminated || truncated;
    }
    return { reached, steps: path.length - 1, return: total, path };
  }

  // BFS from the goal over free cells: distance of every reachable free cell.
  function bfs(grid, goal) {
    const dist = new Map([[`${goal[0]},${goal[1]}`, 0]]), queue = [goal];
    while (queue.length) {
      const [r, c] = queue.shift(), d = dist.get(`${r},${c}`);
      for (const [dr, dc] of MOVES) {
        const nr = r + dr, nc = c + dc, k = `${nr},${nc}`;
        if (grid.isFree(nr, nc) && !dist.has(k)) { dist.set(k, d + 1); queue.push([nr, nc]); }
      }
    }
    return dist;
  }

  // One shortest path from start to the goal of `letter` (first neighbour one step closer, in action order).
  function bfsPath(grid, start, letter) {
    const dist = bfs(grid, grid.places[letter]);
    let cur = [start[0], start[1]];
    const path = [cur];
    if (!dist.has(`${cur[0]},${cur[1]}`)) return path;
    while (dist.get(`${cur[0]},${cur[1]}`) > 0) {
      const d = dist.get(`${cur[0]},${cur[1]}`);
      cur = MOVES.map(([dr, dc]) => [cur[0] + dr, cur[1] + dc]).find(([r, c]) => dist.get(`${r},${c}`) === d - 1);
      path.push(cur);
    }
    return path;
  }

  // Pairs whose greedy route reaches the destination in exactly the BFS distance.
  function evaluate(grid, table) {
    let good = 0, total = 0;
    for (const letter of grid.destinations) {
      const goal = grid.places[letter], dist = bfs(grid, goal);
      for (const [r, c] of grid.freeCells()) {
        if (r === goal[0] && c === goal[1]) continue;
        total++;
        const route = rollout(grid, table, [r, c], letter);
        if (route.reached && route.steps === dist.get(`${r},${c}`)) good++;
      }
    }
    return { good, total };
  }

  // True if every free cell can reach every place (one connected free area).
  function isConnected(grid) {
    const first = grid.places[grid.destinations[0]];
    return bfs(grid, first).size === grid.freeCells().length;
  }

  // Trains in blocks of `block` episodes until every pair follows the shortest route or `max` episodes.
  function* trainBlocks(grid, { alpha = 0.5, gamma = 0.9, seed = 0, block = 100, max = 5000 } = {}) {
    const env = new Env(grid, rng(seed));
    const table = new QTable(env.nStates, 4, alpha, gamma);
    let episodes = 0, randomSteps = 0, ms = 0, score = { good: 0, total: 1 };
    const curve = [];
    while (episodes < max && score.good < score.total) {
      const t0 = Date.now();
      randomSteps += train(env, table, block); episodes += block;
      ms += Date.now() - t0;  // training time only, not evaluation
      score = evaluate(grid, table);
      curve.push(100 * score.good / score.total);
      yield { episodes, ...score, table, randomSteps, ms, curve: curve.slice(),
              done: score.good === score.total || episodes >= max };
    }
  }

  const api = { MOVES, PERSON, rng, Grid, Env, QTable, train, rollout, bfs, bfsPath, evaluate, isConnected, trainBlocks, cellValues };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.SandboxCore = api;
})(typeof window !== "undefined" ? window : globalThis);
