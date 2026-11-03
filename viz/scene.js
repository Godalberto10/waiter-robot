// Shared 3D restaurant for viz/index.html (H8) and viz/sandbox.html (H9).
// A classic script (not an ES module) so both pages open from disk with no server.
window.WaiterScene = function (THREE, OrbitControls, map) {
  const ROWS = map.length, COLS = map[0].length;
  const x = c => c - (COLS - 1) / 2;
  const z = r => r - (ROWS - 1) / 2;

  const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...extra });
  const box = (w, h, d, m) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.castShadow = o.receiveShadow = true; return o; };
  const cyl = (rt, rb, h, m, seg = 24) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); o.castShadow = o.receiveShadow = true; return o; };

  const cloth = mat(0xf2ede4), wood = mat(0x6b4a33), plateM = mat(0xffffff, { roughness: 0.4 });
  const steel = mat(0xa9adb5, { metalness: 0.7, roughness: 0.35 });
  const oilM = new THREE.MeshStandardMaterial({ color: 0xffa531, emissive: 0xff6a00, emissiveIntensity: 0.9, roughness: 0.2 });
  const PLACE_COLOR = { K: 0x3fb37f, B: 0xb36ad6, T: 0x2fa6c9 };

  function setup(container) {
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.prepend(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x12141a);
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0.5, 9.5, 8.2);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0.3);
    controls.maxPolarAngle = Math.PI * 0.47;
    controls.minDistance = 5; controls.maxDistance = 22;
    controls.enableDamping = true;

    scene.add(new THREE.HemisphereLight(0xfff4e6, 0x30343f, 0.9));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(-4, 10, 5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 6, bottom: -6 });
    scene.add(sun);

    const base = box(COLS + 0.5, 0.12, ROWS + 0.5, mat(0x2a2e39));
    base.position.y = -0.12; scene.add(base);
    const wallM = mat(0x8c6f55);
    for (const [w, d, px, pz] of [[COLS + 0.5, 0.12, 0, -(ROWS / 2 + 0.19)], [COLS + 0.5, 0.12, 0, ROWS / 2 + 0.19],
                                  [0.12, ROWS + 0.5, -(COLS / 2 + 0.19), 0], [0.12, ROWS + 0.5, COLS / 2 + 0.19, 0]]) {
      const wl = box(w, 0.35, d, wallM); wl.position.set(px, 0.12, pz); scene.add(wl);
    }

    function resize() {
      const w = container.clientWidth, h = container.clientHeight;
      renderer.setSize(w, h, false); renderer.domElement.style.width = w + "px"; renderer.domElement.style.height = h + "px";
      camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    addEventListener("resize", resize); resize();
    return { renderer, scene, camera, controls };
  }

  // One floor tile per cell; the tiles are the click targets. The fryer cells have a dark floor.
  function floor(scene) {
    const a = mat(0xd9c7a7), b = mat(0xcdb894), danger = mat(0x5a3a33);
    const tiles = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const ch = map[r][c];
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.06, 0.98), ch === "~" ? danger : ((r + c) % 2 ? a : b));
      t.position.set(x(c), -0.03, z(r)); t.receiveShadow = true;
      t.userData = { r, c };
      scene.add(t); tiles.push(t);
    }
    return tiles;
  }

  function label(text) {
    const cv = document.createElement("canvas"); cv.width = 320; cv.height = 72;
    const g = cv.getContext("2d");
    g.fillStyle = "rgba(20,22,30,.88)"; g.beginPath(); g.roundRect(4, 4, 312, 64, 18); g.fill();
    g.fillStyle = "#fff"; g.font = "600 30px system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(text, 160, 37);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
    s.scale.set(1.75, 0.39, 1); s.renderOrder = 10;
    return s;
  }

  function makeTable() {
    const g = new THREE.Group();
    const top = cyl(0.4, 0.4, 0.06, cloth, 32); top.position.y = 0.62; g.add(top);
    const leg = cyl(0.05, 0.07, 0.6, wood); leg.position.y = 0.31; g.add(leg);
    const foot = cyl(0.22, 0.24, 0.04, wood); foot.position.y = 0.02; g.add(foot);
    for (const ang of [0.6, 3.7]) {
      const p = cyl(0.1, 0.08, 0.02, plateM); p.position.set(Math.cos(ang) * 0.2, 0.66, Math.sin(ang) * 0.2); g.add(p);
      const ch = box(0.2, 0.05, 0.2, wood); ch.position.set(Math.cos(ang) * 0.36, 0.3, Math.sin(ang) * 0.36); g.add(ch);  // inside the cell
    }
    return g;
  }

  function makeFryer() {
    const g = new THREE.Group();
    const body = box(0.86, 0.8, 0.86, steel); body.position.y = 0.4; g.add(body);
    const oil = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.02, 0.66), oilM.clone()); oil.position.y = 0.81; g.add(oil);
    const basket = box(0.3, 0.12, 0.3, mat(0x555a63, { metalness: 0.6 })); basket.position.set(0.12, 0.86, 0.1); g.add(basket);
    g.userData.oil = oil;
    return g;
  }

  function makePlace(p) {
    const g = new THREE.Group();
    const col = PLACE_COLOR[p.letter] ?? 0x888888;
    const pad = cyl(0.44, 0.44, 0.03, mat(col, { emissive: col, emissiveIntensity: 0.35 }), 40);
    pad.position.y = 0.015; g.add(pad);
    if (p.letter === "K") {  // kitchen pass with plates
      const counter = box(0.9, 0.55, 0.22, mat(0xe8e8e8)); counter.position.set(0, 0.28, -0.42); g.add(counter);
      for (let i = -1; i <= 1; i++) { const pl = cyl(0.1, 0.08, 0.03, plateM); pl.position.set(i * 0.27, 0.57, -0.42); g.add(pl); }
    } else if (p.letter === "B") {  // bar counter with bottles
      const counter = box(0.22, 0.6, 0.9, mat(0x5a3b2a)); counter.position.set(0.42, 0.3, 0); g.add(counter);
      for (let i = -1; i <= 1; i++) {
        const bt = cyl(0.04, 0.05, 0.22, mat([0x2e7d4f, 0x8a2b2b, 0xc9a227][i + 1], { roughness: 0.3 }));
        bt.position.set(0.42, 0.71, i * 0.25); g.add(bt);
      }
    } else {  // terrace door frame
      const fm = mat(0x3a6b4d);
      const l = box(0.08, 0.95, 0.08, fm); l.position.set(-0.38, 0.47, 0.44); g.add(l);
      const rr = box(0.08, 0.95, 0.08, fm); rr.position.set(0.38, 0.47, 0.44); g.add(rr);
      const tp = box(0.84, 0.08, 0.08, fm); tp.position.set(0, 0.95, 0.44); g.add(tp);
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.68, 0.86), new THREE.MeshStandardMaterial({ color: 0x9fd7ef, transparent: true, opacity: 0.35 }));
      glass.position.set(0, 0.47, 0.44); g.add(glass);
    }
    const lb = label(`${p.letter} · ${p.name}`); lb.position.y = 1.35; g.add(lb);
    return g;
  }

  // A standing restaurant guest (H9 obstacle).
  function makePerson(shirt = 0x3d6fb6) {
    const g = new THREE.Group();
    const skin = mat(0xe0b48f), dark = mat(0x2b2f3a);
    for (const s of [-0.07, 0.07]) { const leg = cyl(0.05, 0.05, 0.42, dark); leg.position.set(s, 0.21, 0); g.add(leg); }
    const body = cyl(0.14, 0.12, 0.42, mat(shirt)); body.position.y = 0.62; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 14), skin); head.position.y = 0.94; head.castShadow = true; g.add(head);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.115, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x3b2a20)); hair.position.y = 0.95; g.add(hair);
    return g;
  }

  function makeRobot(scene, accent) {
    const g = new THREE.Group();
    const white = mat(0xf3f4f6, { roughness: 0.45 }), dark = mat(0x2b2f3a), acc = mat(accent, { emissive: accent, emissiveIntensity: 0.25 });
    const wheel = cyl(0.26, 0.28, 0.1, dark); wheel.position.y = 0.06; g.add(wheel);
    const body = cyl(0.2, 0.25, 0.5, white); body.position.y = 0.36; g.add(body);
    const band = cyl(0.205, 0.205, 0.06, acc); band.position.y = 0.42; g.add(band);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 24, 16), white); head.position.y = 0.72; head.castShadow = true; g.add(head);
    const visor = box(0.22, 0.06, 0.08, mat(0x11141b, { emissive: accent, emissiveIntensity: 0.6 })); visor.position.set(0, 0.74, 0.14); g.add(visor);
    const arm = box(0.05, 0.05, 0.3, white); arm.position.set(0.2, 0.55, 0.14); g.add(arm);
    const tray = cyl(0.16, 0.16, 0.02, mat(0xb8bcc6, { metalness: 0.6, roughness: 0.3 })); tray.position.set(0.2, 0.6, 0.28); g.add(tray);
    const dish = cyl(0.1, 0.07, 0.04, plateM); dish.position.set(0.2, 0.63, 0.28); g.add(dish);
    const food = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), mat(0xd9822b)); food.position.set(0.2, 0.67, 0.28); g.add(food);
    g.userData.head = head;
    scene.add(g);
    return g;
  }

  // Moves a robot along a path of [row, col] cells, one cell per 1/speed seconds.
  // A bump (same cell twice) takes a short wiggle instead of a full step.
  class Runner {
    constructor(robot, path, offset = 0, speed = 4.2) {
      Object.assign(this, { robot, path, offset, speed, seg: 0, t: 0, done: path.length < 2 });
      robot.visible = true;
      this.pose(0);
      const next = path.find(p => p[0] !== path[0][0] || p[1] !== path[0][1]);
      if (next) robot.rotation.y = Math.atan2(next[1] - path[0][1], next[0] - path[0][0]);
    }
    pose(t) {
      const a = this.path[this.seg], b = this.path[Math.min(this.seg + 1, this.path.length - 1)];
      const still = a[0] === b[0] && a[1] === b[1] && !this.done;
      const wiggle = still ? 0.08 * Math.sin(t * Math.PI * 2) : 0;
      this.robot.position.set(x(a[1] + (b[1] - a[1]) * t) + this.offset + wiggle,
        this.done ? 0 : 0.03 * Math.abs(Math.sin(performance.now() / 120)), z(a[0] + (b[0] - a[0]) * t));
      if (!still && (a[0] !== b[0] || a[1] !== b[1])) {
        const target = Math.atan2(b[1] - a[1], b[0] - a[0]);
        let d = target - this.robot.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
        this.robot.rotation.y += d * 0.25;
      }
    }
    update(dt) {
      if (this.done) { this.pose(0); return; }
      const a = this.path[this.seg], b = this.path[this.seg + 1];
      const bump = a[0] === b[0] && a[1] === b[1];
      this.t += dt * this.speed * (bump ? 3 : 1);
      while (this.t >= 1) {
        this.t -= 1; this.seg++;
        if (this.seg >= this.path.length - 1) { this.seg = this.path.length - 1; this.t = 0; this.done = true; break; }
      }
      this.pose(this.done ? 0 : this.t);
    }
    get step() { return this.seg; }
  }

  function trail(group, path, color, offset = 0) {
    const pts = path.map(([r, c]) => new THREE.Vector3(x(c) + offset, 0.045, z(r)));
    const dedup = pts.filter((p, i) => i === 0 || !p.equals(pts[i - 1]));
    if (dedup.length < 2) return;
    group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(dedup, false, "catmullrom", 0.01), dedup.length * 6, 0.035, 8),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.4 })));
  }

  function marker(group, r, c, color) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.42, 40), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(x(c), 0.05, z(r)); group.add(ring);
  }

  function clear(group) { while (group.children.length) group.children.pop().geometry?.dispose(); }

  return { ROWS, COLS, x, z, setup, floor, label, makeTable, makeFryer, makePlace, makePerson, makeRobot, Runner, trail, marker, clear };
};
