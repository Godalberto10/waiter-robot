// Q table view shared by viz/index.html and viz/sandbox.html: the map as a grid where every cell
// shows its four Q values (one per action) for one destination, plus the detail of one cell.
// Classic script: `window.WaiterQGrid`. It only reads Q values; it never trains.
(function (root) {
  const GLYPH = ["↑", "→", "↓", "←"];  // 0 up, 1 right, 2 down, 3 left

  const CSS = `
  .qview { position: absolute; inset: 0; z-index: 3; background: var(--bg); display: none;
    flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 14px; }
  .qview.show { display: flex; }
  .qhead { display: flex; align-items: center; gap: 6px 16px; flex-wrap: wrap; justify-content: center; font-size: 13px; color: var(--muted); }
  .qhead b { color: var(--text); }
  .qscale { display: inline-flex; align-items: center; gap: 6px; }
  .qscale i { display: inline-block; width: 90px; height: 9px; border-radius: 5px;
    background: linear-gradient(90deg, hsl(215 45% 15%), hsl(215 70% 50%)); }
  .qgrid { display: grid; gap: 3px; }
  .qc { position: relative; border-radius: 6px; cursor: pointer; color: rgba(255,255,255,.62);
    font-family: Consolas, monospace; outline: 2px solid transparent; outline-offset: -2px; overflow: hidden; }
  .qc:hover { outline-color: rgba(255,255,255,.45); }
  .qc.sel { outline: 3px solid #fff; outline-offset: -3px; }
  .qc .n { position: absolute; line-height: 1; white-space: nowrap; }
  .qc .n.best { color: #fff; font-weight: 700; }
  .qc .a0 { top: 6%; left: 50%; transform: translateX(-50%); }
  .qc .a1 { right: 5%; top: 50%; transform: translateY(-50%); }
  .qc .a2 { bottom: 6%; left: 50%; transform: translateX(-50%); }
  .qc .a3 { left: 5%; top: 50%; transform: translateY(-50%); }
  .qc .mid { position: absolute; inset: 0; display: grid; place-items: center; color: #fff; font-family: system-ui, sans-serif; }
  .qc .tag { position: absolute; left: 4px; top: 3px; font: 700 10px system-ui, sans-serif; color: #fff; opacity: .85; }
  .qc.table { background: repeating-linear-gradient(45deg, #2a2e39 0 6px, #232733 6px 12px); }
  .qc.person { background: repeating-linear-gradient(45deg, #3a3150 0 6px, #2e2840 6px 12px); }
  .qc.person .mid { font-size: 11px !important; color: #cdb8ff; }
  .qc.fryer { background: #5a2a14; color: #ffb48a; }
  .qc.goal { background: #e9eaee; color: #12141a; }
  .qc.goal .mid { color: #12141a; font-weight: 700; }
  .qc.blank .mid { color: rgba(255,255,255,.35); }
  .qc.compact .n { display: none; }
  .qbars { display: grid; grid-template-columns: 22px 1fr 54px; gap: 5px 8px; align-items: center; margin-top: 8px; }
  .qbars .bar { height: 10px; border-radius: 5px; background: #161920; position: relative; overflow: hidden; }
  .qbars .bar i { position: absolute; top: 0; bottom: 0; border-radius: 5px; }
  .qbars .v { text-align: right; font-family: Consolas, monospace; font-size: 12.5px; }
  .qbars .best { color: #fff; font-weight: 700; }
  .formula { font-family: Consolas, monospace; font-size: 12px; color: #c9d4ff; background: #161920; border-radius: 6px; padding: 7px 8px; }`;
  if (root.document) { const st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st); }

  const fmt = v => (Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2)).replace("-", "−");
  function argmax(v) { let b = 0; for (let a = 1; a < v.length; a++) if (v[a] > v[b]) b = a; return b; }

  // rows: map rows (strings); dest: destination letter; qOf(r, c): the 4 Q values of that cell's state.
  function kind(rows, r, c, dest) {
    const ch = rows[r][c];
    if (ch === "#") return "table";
    if (ch === "o") return "person";
    if (ch === "~") return "fryer";
    if (ch === dest) return "goal";
    return "free";
  }

  // Fills the grid element; returns the range of best values (for the scale in the header).
  function draw(gridEl, { rows, dest, qOf, sel }) {
    let lo = Infinity, hi = -Infinity;
    for (let r = 0; r < rows.length; r++) for (let c = 0; c < rows[0].length; c++) if (kind(rows, r, c, dest) === "free") {
      const v = Math.max(...qOf(r, c)); lo = Math.min(lo, v); hi = Math.max(hi, v);
    }
    let html = "";
    for (let r = 0; r < rows.length; r++) for (let c = 0; c < rows[0].length; c++) {
      const k = kind(rows, r, c, dest), ch = rows[r][c];
      const cls = `qc ${k}${sel && sel[0] === r && sel[1] === c ? " sel" : ""}`, at = `data-r="${r}" data-c="${c}"`;
      const tag = /[A-Z]/.test(ch) ? `<span class="tag">${ch}</span>` : "";
      if (k === "table") html += `<div class="${cls}" ${at}></div>`;
      else if (k === "person") html += `<div class="${cls}" ${at}><span class="mid">guest</span></div>`;
      else if (k === "fryer") html += `<div class="${cls}" ${at}><span class="mid">−50</span></div>`;
      else if (k === "goal") html += `<div class="${cls}" ${at}>${tag}<span class="mid">+20</span></div>`;
      else {
        const q = qOf(r, c), b = argmax(q), v = q[b], blank = q.every(x => x === 0);
        const t = hi > lo ? (v - lo) / (hi - lo) : 0;
        const bg = `hsl(215 ${45 + 25 * t}% ${15 + 35 * t}%)`;
        html += `<div class="${cls}${blank ? " blank" : ""}" ${at} style="background:${bg}">${tag}
          ${q.map((val, a) => `<span class="n a${a}${a === b && !blank ? " best" : ""}">${fmt(val)}</span>`).join("")}
          <span class="mid">${blank ? "?" : GLYPH[b]}</span></div>`;
      }
    }
    gridEl.innerHTML = html;
    return { lo: isFinite(lo) ? lo : 0, hi: isFinite(hi) ? hi : 0 };
  }

  // Sizes the cells to fit the view without scrolling.
  function layout(viewEl, headEl, gridEl, nRows, nCols) {
    if (!viewEl.classList.contains("show")) return;
    const w = viewEl.clientWidth - 28, h = viewEl.clientHeight - 28 - headEl.offsetHeight - 12;
    const size = Math.max(26, Math.floor(Math.min((w - 3 * (nCols - 1)) / nCols, (h - 3 * (nRows - 1)) / nRows, 112)));
    gridEl.style.gridTemplateColumns = `repeat(${nCols}, ${size}px)`;
    gridEl.style.gridAutoRows = `${size}px`;
    gridEl.querySelectorAll(".qc").forEach(el => {
      el.classList.toggle("compact", size < 70);
      el.style.fontSize = `${Math.max(9, size * 0.125)}px`;
      const mid = el.querySelector(".mid"); if (mid) mid.style.fontSize = `${size * (size < 70 ? 0.42 : 0.24)}px`;
    });
  }

  const scale = (lo, hi) => `<span class="qscale">best Q ${fmt(lo)} <i></i> ${fmt(hi)}</span>`;

  // Detail card of one cell: state number, the four values as bars and the best action.
  function detail({ rows, dest, destIndex, qOf, cell, placeName }) {
    const [r, c] = cell, k = kind(rows, r, c, dest), ch = rows[r][c], nCols = rows[0].length, nCells = rows.length * nCols;
    const s = destIndex * nCells + r * nCols + c;
    const name = /[A-Z]/.test(ch) ? `${ch} · ${placeName(ch)}` : { "#": "table", o: "guest", "~": "fryer area", ".": "free" }[ch];
    const head = `<div class="kv"><span>cell</span><span>(${r}, ${c}) · ${name}</span>
      <span>state</span><span><code>${destIndex}·${nCells} + ${r}·${nCols} + ${c} = ${s}</code></span></div>`;
    const why = {
      table: "A table cannot be entered, so the robot is never in this state: its row stays at 0.",
      person: "A guest blocks the cell like a table, so the robot is never in this state: its row stays at 0.",
      fryer: "Entering the fryer area gives −50 and ends the episode: the robot never acts from here, so its row stays at 0.",
      goal: "Reaching the destination gives +20 and ends the episode: the robot never acts from here, so its row stays at 0.",
    }[k];
    if (why) return `<div class="card">${head}<p class="hint" style="margin-top:8px">${why}</p></div>`;
    const q = qOf(r, c), b = argmax(q), blank = q.every(x => x === 0);
    const lo = Math.min(-5, ...q), hi = Math.max(20, ...q), zero = (0 - lo) / (hi - lo) * 100;
    const bars = q.map((v, a) => {
      const p = (v - lo) / (hi - lo) * 100, left = Math.min(p, zero), width = Math.abs(p - zero);
      const best = a === b && !blank, col = best ? "var(--blue)" : v < 0 ? "#7a3a3e" : "#4a5266";
      return `<span class="${best ? "best" : ""}">${GLYPH[a]}</span>
        <span class="bar"><i style="left:${left}%;width:${Math.max(width, 1)}%;background:${col}"></i></span>
        <span class="v ${best ? "best" : ""}">${fmt(v)}</span>`;
    }).join("");
    const note = blank ? "All four values are still 0: the robot has not learned anything about this cell yet."
      : `Best action: <b style="color:var(--text)">${GLYPH[b]}</b> (Q = ${fmt(q[b])}). The closer to the destination, the higher the value.`;
    return `<div class="card">${head}<div class="qbars">${bars}</div><p class="hint" style="margin-top:8px">${note}</p></div>`;
  }

  root.WaiterQGrid = { GLYPH, fmt, argmax, kind, draw, layout, scale, detail };
})(typeof window !== "undefined" ? window : globalThis);
