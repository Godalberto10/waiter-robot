// Shared 3D restaurant for viz/index.html (H8) and viz/sandbox.html (H9).
// A classic script (not an ES module) so both pages open from disk with no server.
// Only looks: models, materials, procedural textures and lighting. The cell layout, the click
// targets (one tile per cell) and the robot movement (Runner) are the same as before.
window.WaiterScene = function (THREE, OrbitControls, map) {
  const ROWS = map.length, COLS = map[0].length;
  const x = c => c - (COLS - 1) / 2;
  const z = r => r - (ROWS - 1) / 2;

  // ---------- helpers ----------
  const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...extra });
  const geoCache = new Map();
  const geo = (key, make) => { if (!geoCache.has(key)) geoCache.set(key, make()); return geoCache.get(key); };
  const shade = o => { o.castShadow = o.receiveShadow = true; return o; };
  const box = (w, h, d, m) => shade(new THREE.Mesh(geo(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d)), m));
  const cyl = (rt, rb, h, m, seg = 24, open = false) =>
    shade(new THREE.Mesh(geo(`c${rt},${rb},${h},${seg},${open}`, () => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open)), m));
  const sph = (r, m, ws = 24, hs = 16, ...rest) =>
    shade(new THREE.Mesh(geo(`s${r},${ws},${hs},${rest}`, () => new THREE.SphereGeometry(r, ws, hs, ...rest)), m));
  const capsule = (r, len, m) => shade(new THREE.Mesh(geo(`k${r},${len}`, () => new THREE.CapsuleGeometry(r, len, 6, 16)), m));
  const lathe = (key, pts, m, seg = 32) =>
    shade(new THREE.Mesh(geo(key, () => new THREE.LatheGeometry(pts.map(([a, b]) => new THREE.Vector2(a, b)), seg)), m));
  const at = (o, px, py, pz) => { o.position.set(px, py, pz); return o; };

  function rng(seed) {  // only for texture noise, so the textures look the same on every load
    let a = seed >>> 0;
    return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function canvasTex(size, draw, { srgb = true, repeat = 1 } = {}) {
    const cv = document.createElement("canvas"); cv.width = cv.height = size;
    draw(cv.getContext("2d"), size);
    const t = new THREE.CanvasTexture(cv);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); t.anisotropy = 8;
    return t;
  }
  function speckle(g, n, rand, size, light, dark, alpha) {
    for (let i = 0; i < n; i++) {
      g.fillStyle = rand() < 0.5 ? `rgba(${light},${alpha * rand()})` : `rgba(${dark},${alpha * rand()})`;
      const s = 1 + rand() * 2.5; g.fillRect(rand() * size, rand() * size, s, s);
    }
  }

  // ---------- procedural textures ----------
  // Floor tile: light stone with soft veins and a darker bevel; tinted per cell by the material colour.
  const tileTex = [0, 1, 2].map(v => canvasTex(256, (g, S) => {
    const rand = rng(11 + v * 7);
    g.fillStyle = "#f1ece4"; g.fillRect(0, 0, S, S);
    speckle(g, 2600, rand, S, "255,255,255", "120,105,85", 0.22);
    g.lineCap = "round";
    for (let i = 0; i < 4; i++) {
      g.strokeStyle = `rgba(150,130,105,${0.08 + rand() * 0.1})`; g.lineWidth = 0.6 + rand() * 1.6;
      g.beginPath(); g.moveTo(rand() * S, 0);
      g.bezierCurveTo(rand() * S, S * 0.33, rand() * S, S * 0.66, rand() * S, S); g.stroke();
    }
    const grad = (x0, y0, x1, y1) => { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, "rgba(70,55,40,.35)"); gr.addColorStop(1, "rgba(70,55,40,0)"); return gr; };
    g.fillStyle = grad(0, 0, 10, 0); g.fillRect(0, 0, 10, S);
    g.fillStyle = grad(S, 0, S - 10, 0); g.fillRect(S - 10, 0, 10, S);
    g.fillStyle = grad(0, 0, 0, 10); g.fillRect(0, 0, S, 10);
    g.fillStyle = grad(0, S, 0, S - 10); g.fillRect(0, S - 10, S, 10);
  }));
  // Hazard floor under the fryers: yellow and black stripes around a dark centre.
  const hazardTex = canvasTex(256, (g, S) => {
    g.fillStyle = "#1c1a18"; g.fillRect(0, 0, S, S);
    g.save(); g.beginPath(); g.rect(0, 0, S, S); g.rect(26, 26, S - 52, S - 52); g.clip("evenodd");
    for (let i = -S; i < 2 * S; i += 36) { g.fillStyle = "#e0b31a"; g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 18, 0); g.lineTo(i + 18 - S, S); g.lineTo(i - S, S); g.fill(); }
    g.restore();
    speckle(g, 1500, rng(5), S, "255,255,255", "0,0,0", 0.18);
  });
  const woodTex = canvasTex(256, (g, S) => {
    const rand = rng(3);
    g.fillStyle = "#b07a4f"; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 70; i++) {
      const y = rand() * S, a = 0.05 + rand() * 0.14;
      g.strokeStyle = rand() < 0.6 ? `rgba(70,40,20,${a})` : `rgba(255,220,180,${a * 0.6})`;
      g.lineWidth = 0.5 + rand() * 2; g.beginPath(); g.moveTo(0, y);
      for (let xx = 0; xx <= S; xx += 16) g.lineTo(xx, y + Math.sin(xx / 30 + i) * 2.5);
      g.stroke();
    }
  });
  const clothTex = canvasTex(128, (g, S) => {
    g.fillStyle = "#ffffff"; g.fillRect(0, 0, S, S);
    for (let i = 0; i < S; i += 2) {
      g.fillStyle = "rgba(160,150,135,.10)"; g.fillRect(i, 0, 1, S); g.fillRect(0, i, S, 1);
    }
    speckle(g, 500, rng(9), S, "255,255,255", "150,140,125", 0.15);
  }, { repeat: 2 });
  const plasterTex = canvasTex(256, (g, S) => {
    g.fillStyle = "#efe6d8"; g.fillRect(0, 0, S, S);
    speckle(g, 4000, rng(21), S, "255,255,255", "140,120,95", 0.16);
  }, { repeat: 3 });
  const brushedTex = canvasTex(256, (g, S) => {  // brushed steel
    const rand = rng(17);
    g.fillStyle = "#c9ccd2"; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(${rand() < 0.5 ? "255,255,255" : "60,64,72"},${rand() * 0.12})`; g.fillRect(0, rand() * S, S, 1); }
  });
  // Soft round shadow under objects (contact shadow), and a warm glow for the fryers.
  const blobTex = canvasTex(128, (g, S) => {
    const gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    gr.addColorStop(0, "rgba(0,0,0,.55)"); gr.addColorStop(0.55, "rgba(0,0,0,.25)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.fillRect(0, 0, S, S);
  }, { srgb: false });
  const glowTex = canvasTex(128, (g, S) => {
    const gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    gr.addColorStop(0, "rgba(255,170,70,.9)"); gr.addColorStop(0.4, "rgba(255,110,20,.35)"); gr.addColorStop(1, "rgba(255,90,0,0)");
    g.fillStyle = gr; g.fillRect(0, 0, S, S);
  });
  const blobM = new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, toneMapped: false });
  function blob(size, opacity = 1) {
    const m = opacity === 1 ? blobM : Object.assign(blobM.clone(), { opacity });
    const o = new THREE.Mesh(geo("blob", () => new THREE.PlaneGeometry(1, 1)), m);
    o.rotation.x = -Math.PI / 2; o.scale.set(size, size, 1); o.position.y = 0.004; o.renderOrder = 1;
    return o;
  }

  // ---------- shared materials ----------
  const cloth = mat(0xf6f1e8, { map: clothTex, roughness: 0.95 });
  const wood = mat(0x8a5a3a, { map: woodTex, roughness: 0.6 });
  const darkWood = mat(0x5a3826, { map: woodTex, roughness: 0.55 });
  const porcelain = mat(0xffffff, { roughness: 0.18 });
  const steel = mat(0xd4d7dd, { map: brushedTex, metalness: 0.85, roughness: 0.32 });
  const darkSteel = mat(0x3a3e46, { metalness: 0.7, roughness: 0.4 });
  const blackMetal = mat(0x23252b, { metalness: 0.6, roughness: 0.45 });
  const glassM = new THREE.MeshStandardMaterial({ color: 0xdff4ff, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.32, depthWrite: false });
  const oilM = new THREE.MeshStandardMaterial({ color: 0xffa531, emissive: 0xff6a00, emissiveIntensity: 0.9, roughness: 0.12 });
  const PLACE_COLOR = { K: 0x3fb37f, B: 0xb36ad6, T: 0x2fa6c9 };

  // Studio-like environment for soft reflections (a small room with bright panels, prefiltered once).
  function environment(renderer) {
    const pm = new THREE.PMREMGenerator(renderer), env = new THREE.Scene();
    const basic = (r, g, b) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b), side: THREE.BackSide });
    env.add(at(new THREE.Mesh(new THREE.BoxGeometry(14, 7, 14), basic(0.32, 0.29, 0.27)), 0, 3, 0));
    const panel = (w, h, px, py, pz, ry, rx, k, warm = 1) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k * (0.93 + 0.05 * warm), k * (0.82 + 0.1 * warm)), side: THREE.DoubleSide }));
      m.position.set(px, py, pz); m.rotation.set(rx, ry, 0); env.add(m);
    };
    panel(6, 4, 0, 6.4, 0, 0, Math.PI / 2, 5);        // ceiling light
    panel(3, 2, -6.8, 3, 1, Math.PI / 2, 0, 3.5, 0);  // window, left
    panel(3, 2, 6.8, 3, -2, -Math.PI / 2, 0, 1.6);    // fill, right
    const tex = pm.fromScene(env, 0.04).texture;
    pm.dispose();
    return tex;
  }

  function setup(container) {
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.92;
    container.prepend(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x12141a);
    scene.environment = environment(renderer);
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0.5, 9.5, 8.2);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0.3);
    controls.maxPolarAngle = Math.PI * 0.47;
    controls.minDistance = 5; controls.maxDistance = 22;
    controls.enableDamping = true;

    scene.add(new THREE.HemisphereLight(0xfff1e0, 0x2a2d36, 0.55));
    const sun = new THREE.DirectionalLight(0xfff0dc, 2.1);
    sun.position.set(-4, 10, 5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.015;
    Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 6, bottom: -6 });
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xa9c2ff, 0.35);
    fill.position.set(6, 5, -4); scene.add(fill);

    // the restaurant shell: a dark plinth with a soft shadow, and low plaster walls with a wooden cap
    const halo = blob(1, 0.9); halo.scale.set(COLS + 3, ROWS + 3, 1); halo.position.y = -0.185; scene.add(halo);  // soft shadow under the room
    const base = box(COLS + 0.5, 0.12, ROWS + 0.5, mat(0x3a3530, { roughness: 0.9 }));
    base.position.y = -0.12; scene.add(base);
    const wallM = mat(0xe6dccb, { map: plasterTex, roughness: 0.95 });
    const capM = darkWood;
    for (const [w, d, px, pz] of [[COLS + 0.5, 0.12, 0, -(ROWS / 2 + 0.19)], [COLS + 0.5, 0.12, 0, ROWS / 2 + 0.19],
                                  [0.12, ROWS + 0.5, -(COLS / 2 + 0.19), 0], [0.12, ROWS + 0.5, COLS / 2 + 0.19, 0]]) {
      const wl = box(w, 0.35, d, wallM); wl.position.set(px, 0.12, pz); scene.add(wl);
      const cap = box(w + 0.04, 0.04, d + 0.04, capM); cap.position.set(px, 0.31, pz); scene.add(cap);
      const skirt = box(w + 0.02, 0.06, d + 0.02, darkWood); skirt.position.set(px, -0.02, pz); scene.add(skirt);
    }

    function resize() {
      const w = container.clientWidth, h = container.clientHeight;
      renderer.setSize(w, h, false); renderer.domElement.style.width = w + "px"; renderer.domElement.style.height = h + "px";
      camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    addEventListener("resize", resize); resize();
    return { renderer, scene, camera, controls };
  }

  // One floor tile per cell; the tiles are the click targets. The fryer cells have a hazard floor.
  function floor(scene) {
    const tones = [0xe6d6ba, 0xcbb38e];
    const mats = tones.map(t => tileTex.map(tex => mat(t, { map: tex, roughness: 0.42 })));
    const danger = mat(0xffffff, { map: hazardTex, roughness: 0.8 });
    const tiles = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const ch = map[r][c];
      const m = ch === "~" ? danger : mats[(r + c) % 2][(r * 7 + c * 3) % 3];
      const t = new THREE.Mesh(geo("tile", () => new THREE.BoxGeometry(0.98, 0.06, 0.98)), m);
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
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, toneMapped: false }));
    s.scale.set(1.75, 0.39, 1); s.renderOrder = 10;
    return s;
  }

  // ---------- furniture ----------
  const PLATE = [[0, 0], [0.06, 0], [0.075, 0.008], [0.1, 0.016], [0.104, 0.02], [0.098, 0.022], [0.07, 0.012], [0, 0.01]];
  function plate(scale = 1) { const p = lathe("plate", PLATE, porcelain, 28); p.scale.setScalar(scale); return p; }
  function wineGlass() {
    const g = new THREE.Group();
    g.add(at(cyl(0.025, 0.028, 0.004, glassM, 16), 0, 0.002, 0));
    g.add(at(cyl(0.004, 0.004, 0.05, glassM, 8), 0, 0.027, 0));
    g.add(at(lathe("bowl", [[0.004, 0], [0.022, 0.012], [0.026, 0.035], [0.024, 0.055], [0.023, 0.056]], glassM, 18), 0, 0.05, 0));
    return g;
  }
  function chair() {  // backrest on local +z
    const g = new THREE.Group();
    g.add(at(box(0.17, 0.025, 0.16, wood), 0, 0.27, 0));
    for (const [lx, lz] of [[-0.07, -0.065], [0.07, -0.065], [-0.07, 0.065], [0.07, 0.065]]) g.add(at(box(0.018, 0.27, 0.018, darkWood), lx, 0.135, lz));
    g.add(at(box(0.17, 0.17, 0.02, wood), 0, 0.37, 0.07));
    return g;
  }
  const flowerM = [0xd2443c, 0xe7b416, 0xf08aa8].map(c => mat(c, { roughness: 0.5 }));
  const leafM = mat(0x3c7a3a, { roughness: 0.7 });
  let tableCount = 0;

  function makeTable() {
    const g = new THREE.Group(), n = tableCount++;
    g.add(blob(0.95, 0.85));
    g.add(at(cyl(0.22, 0.24, 0.03, blackMetal, 32), 0, 0.015, 0));
    g.add(at(cyl(0.035, 0.045, 0.56, blackMetal, 16), 0, 0.31, 0));
    g.add(at(cyl(0.38, 0.38, 0.04, wood, 40), 0, 0.6, 0));
    g.add(at(cyl(0.405, 0.405, 0.012, cloth, 48), 0, 0.626, 0));
    g.add(at(cyl(0.405, 0.415, 0.11, cloth, 48, true), 0, 0.57, 0));  // tablecloth hanging over the edge
    for (const ang of [0.6, 3.7]) {
      const ch = chair(); ch.position.set(Math.cos(ang) * 0.33, 0, Math.sin(ang) * 0.33);
      ch.rotation.y = Math.atan2(Math.cos(ang), Math.sin(ang)); g.add(ch);
      const px = Math.cos(ang) * 0.21, pz = Math.sin(ang) * 0.21;
      g.add(at(plate(), px, 0.632, pz));
      const gl = wineGlass(); gl.position.set(px + Math.cos(ang + 1.2) * 0.12, 0.632, pz + Math.sin(ang + 1.2) * 0.12); g.add(gl);
      const fork = box(0.012, 0.004, 0.12, steel); fork.position.set(px + Math.cos(ang - 1.57) * 0.13, 0.634, pz + Math.sin(ang - 1.57) * 0.13);
      fork.rotation.y = -ang; g.add(fork);
    }
    // small vase with a flower in the middle
    g.add(at(lathe("vase", [[0, 0], [0.025, 0], [0.03, 0.03], [0.018, 0.07], [0.02, 0.08]], porcelain, 20), 0, 0.632, 0));
    g.add(at(cyl(0.003, 0.003, 0.08, leafM, 6), 0, 0.73, 0));
    g.add(at(sph(0.022, flowerM[n % 3], 12, 10), 0, 0.775, 0));
    return g;
  }

  function makeFryer() {
    const g = new THREE.Group();
    g.add(blob(1.15, 0.9));
    g.add(at(box(0.86, 0.72, 0.86, steel), 0, 0.36, 0));
    g.add(at(box(0.88, 0.05, 0.88, steel), 0, 0.745, 0));                  // top rim
    g.add(at(box(0.7, 0.04, 0.7, darkSteel), 0, 0.752, 0));                // well
    const oil = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.02, 0.66), oilM.clone()); oil.position.y = 0.775; g.add(oil);
    // baskets with handles towards the front
    for (const bx of [-0.17, 0.17]) {
      g.add(at(box(0.26, 0.08, 0.36, mat(0x2d3036, { metalness: 0.7, roughness: 0.5, transparent: true, opacity: 0.85 })), bx, 0.8, -0.04));
      g.add(at(box(0.03, 0.03, 0.28, blackMetal), bx, 0.86, 0.27));
    }
    // front control panel with knobs and a pilot light
    g.add(at(box(0.78, 0.18, 0.012, blackMetal), 0, 0.6, 0.436));
    for (const kx of [-0.22, 0, 0.22]) { const k = cyl(0.035, 0.035, 0.03, darkSteel, 16); k.rotation.x = Math.PI / 2; g.add(at(k, kx, 0.6, 0.45)); }
    g.add(at(sph(0.016, mat(0xff3b2f, { emissive: 0xff2a1a, emissiveIntensity: 1.4 }), 10, 8), 0.33, 0.6, 0.445));
    g.add(at(box(0.8, 0.012, 0.012, steel), 0, 0.3, 0.436));               // door line
    // warm glow above the oil
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55, toneMapped: false }));
    glow.scale.set(1.1, 0.6, 1); glow.position.y = 0.95; g.add(glow);
    g.userData.oil = oil;
    return g;
  }

  function placePad(col) {
    const g = new THREE.Group();
    g.add(at(cyl(0.44, 0.44, 0.02, mat(col, { emissive: col, emissiveIntensity: 0.3, roughness: 0.35 }), 48), 0, 0.012, 0));
    const ring = new THREE.Mesh(geo("padRing", () => new THREE.TorusGeometry(0.42, 0.018, 8, 64)), mat(col, { emissive: col, emissiveIntensity: 0.9 }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.025; g.add(ring);
    return g;
  }

  function makePlace(p) {
    const g = new THREE.Group();
    g.add(placePad(PLACE_COLOR[p.letter] ?? 0x888888));
    if (p.letter === "K") {  // kitchen pass: steel counter, heat lamps and plated dishes
      g.add(blob(1.0, 0.5));
      g.add(at(box(0.92, 0.5, 0.24, mat(0xf2f2f0, { roughness: 0.35 })), 0, 0.25, -0.42));
      g.add(at(box(0.96, 0.04, 0.28, steel), 0, 0.52, -0.42));
      for (const px of [-0.44, 0.44]) g.add(at(box(0.025, 0.42, 0.025, steel), px, 0.75, -0.48));
      g.add(at(box(0.92, 0.05, 0.1, steel), 0, 0.96, -0.46));
      const lampM = mat(0xff9a3c, { emissive: 0xff7a1a, emissiveIntensity: 1.6 });
      for (let i = -1; i <= 1; i++) g.add(at(box(0.2, 0.012, 0.05, lampM), i * 0.28, 0.93, -0.46));
      const food = [0xd9822b, 0x6aa84f, 0xc0392b];
      for (let i = -1; i <= 1; i++) {
        g.add(at(plate(1.05), i * 0.28, 0.54, -0.42));
        g.add(at(sph(0.045, mat(food[i + 1], { roughness: 0.6 }), 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), i * 0.28, 0.555, -0.42));
      }
    } else if (p.letter === "B") {  // bar counter with bottles, glasses and a beer tap
      g.add(blob(1.0, 0.5));
      g.add(at(box(0.22, 0.56, 0.92, darkWood), 0.42, 0.28, 0));
      g.add(at(box(0.27, 0.035, 0.96, mat(0x2a1b12, { roughness: 0.25 })), 0.42, 0.575, 0));
      g.add(at(box(0.012, 0.04, 0.9, steel), 0.3, 0.12, 0));  // foot rail
      const bottleCols = [0x2e7d4f, 0x8a2b2b, 0xc9a227, 0x3a5fa8];
      for (let i = 0; i < 4; i++) {
        const bm = new THREE.MeshStandardMaterial({ color: bottleCols[i], roughness: 0.08, transparent: true, opacity: 0.88 });
        const bz = -0.33 + i * 0.16;
        g.add(at(cyl(0.035, 0.038, 0.16, bm, 16), 0.46, 0.67, bz));
        g.add(at(cyl(0.012, 0.03, 0.05, bm, 12), 0.46, 0.775, bz));
        g.add(at(cyl(0.013, 0.013, 0.02, mat(0x222222), 8), 0.46, 0.81, bz));
      }
      for (const gz of [0.3, 0.38]) g.add(at(wineGlass(), 0.36, 0.593, gz));
      g.add(at(cyl(0.012, 0.012, 0.18, steel, 10), 0.36, 0.68, 0.17));
      g.add(at(box(0.07, 0.02, 0.02, steel), 0.33, 0.76, 0.17));
      g.add(at(cyl(0.012, 0.012, 0.06, mat(0x111111), 8), 0.36, 0.8, 0.17));
    } else {  // terrace door: frame, two glass panes with a mullion, handle and a plant
      const fm = mat(0x2f5a40, { roughness: 0.45 });
      g.add(at(box(0.08, 0.98, 0.08, fm), -0.38, 0.49, 0.44));
      g.add(at(box(0.08, 0.98, 0.08, fm), 0.38, 0.49, 0.44));
      g.add(at(box(0.84, 0.08, 0.08, fm), 0, 0.98, 0.44));
      g.add(at(box(0.03, 0.9, 0.04, fm), 0, 0.47, 0.44));
      g.add(at(box(0.68, 0.03, 0.04, fm), 0, 0.3, 0.44));
      const pane = new THREE.Mesh(geo("pane", () => new THREE.PlaneGeometry(0.68, 0.88)), new THREE.MeshStandardMaterial({ color: 0xa8dcf2, roughness: 0.04, transparent: true, opacity: 0.3, depthWrite: false }));
      g.add(at(pane, 0, 0.48, 0.44));
      g.add(at(box(0.02, 0.12, 0.03, steel), 0.06, 0.5, 0.41));
      g.add(at(box(0.02, 0.12, 0.03, steel), -0.06, 0.5, 0.41));
      // potted plant beside the door
      g.add(at(blob(0.3, 0.8), -0.3, 0, 0.3));
      g.add(at(lathe("pot", [[0, 0], [0.06, 0], [0.075, 0.12], [0.08, 0.13], [0, 0.13]], mat(0xb5603a, { roughness: 0.85 }), 20), -0.3, 0, 0.3));
      for (const [lx, ly, lz, s] of [[0, 0.2, 0, 0.07], [0.04, 0.24, 0.02, 0.05], [-0.04, 0.23, -0.02, 0.055], [0, 0.28, 0, 0.045]])
        g.add(at(sph(s, leafM, 12, 10), -0.3 + lx, ly, 0.3 + lz));
    }
    const lb = label(`${p.letter} · ${p.name}`); lb.position.y = 1.35; g.add(lb);
    return g;
  }

  // A standing restaurant guest (H9 obstacle).
  const skinM = mat(0xe0b48f, { roughness: 0.6 }), trousersM = mat(0x2b2f3a, { roughness: 0.8 }), shoeM = mat(0x1a1a1a, { roughness: 0.4 });
  const hairM = mat(0x3b2a20, { roughness: 0.9 });
  function makePerson(shirt = 0x3d6fb6) {
    const g = new THREE.Group(), shirtM = mat(shirt, { roughness: 0.85 });
    g.add(blob(0.5));
    for (const s of [-0.065, 0.065]) {
      g.add(at(capsule(0.045, 0.32, trousersM), s, 0.23, 0));
      g.add(at(box(0.08, 0.04, 0.13, shoeM), s, 0.02, 0.02));
    }
    g.add(at(capsule(0.125, 0.2, shirtM), 0, 0.62, 0));
    for (const s of [-1, 1]) {
      const arm = capsule(0.038, 0.24, shirtM); arm.position.set(s * 0.16, 0.6, 0); arm.rotation.z = s * 0.12; g.add(arm);
      g.add(at(sph(0.035, skinM, 12, 10), s * 0.18, 0.44, 0));
    }
    g.add(at(cyl(0.035, 0.04, 0.06, skinM, 12), 0, 0.81, 0));
    g.add(at(sph(0.1, skinM), 0, 0.92, 0));
    g.add(at(sph(0.106, hairM, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), 0, 0.935, -0.008));
    return g;
  }

  // The waiter robot: front is local +z (the direction it moves in).
  function makeRobot(scene, accent) {
    const g = new THREE.Group();
    const white = mat(0xf5f6f8, { roughness: 0.28, metalness: 0.05 });
    const acc = mat(accent, { emissive: accent, emissiveIntensity: 0.55, roughness: 0.3 });
    const screen = mat(0x0c0f15, { roughness: 0.08, metalness: 0.3 });
    const eye = mat(accent, { emissive: accent, emissiveIntensity: 2.2, toneMapped: false });
    g.add(blob(0.7));
    g.add(at(cyl(0.27, 0.28, 0.08, blackMetal, 32), 0, 0.05, 0));
    const bumper = new THREE.Mesh(geo("bumper", () => new THREE.TorusGeometry(0.275, 0.018, 8, 48)), acc);
    bumper.rotation.x = Math.PI / 2; bumper.position.y = 0.06; g.add(bumper);
    g.add(at(lathe("robotBody", [[0, 0], [0.25, 0], [0.245, 0.08], [0.225, 0.25], [0.2, 0.4], [0.17, 0.46], [0, 0.47]], white, 40), 0, 0.09, 0));
    g.add(at(cyl(0.214, 0.214, 0.045, acc, 40), 0, 0.42, 0));
    g.add(at(cyl(0.06, 0.07, 0.08, blackMetal, 16), 0, 0.59, 0));
    const head = sph(0.17, white, 32, 20); head.position.y = 0.73; g.add(head);
    // dark screen on the front of the head (azimuth centred on +z)
    g.add(at(sph(0.172, screen, 32, 16, Math.PI * 0.18, Math.PI * 0.64, Math.PI * 0.3, Math.PI * 0.32), 0, 0.73, 0));
    for (const s of [-0.05, 0.05]) g.add(at(sph(0.022, eye, 12, 10), s, 0.75, 0.158));
    g.add(at(cyl(0.008, 0.008, 0.1, blackMetal, 8), 0, 0.93, 0));
    g.add(at(sph(0.022, eye, 12, 10), 0, 0.99, 0));
    // arm holding a tray with a covered dish (cloche)
    g.add(at(box(0.05, 0.05, 0.3, white), 0.2, 0.55, 0.14));
    g.add(at(cyl(0.16, 0.16, 0.015, steel, 32), 0.2, 0.585, 0.28));
    g.add(at(plate(0.9), 0.2, 0.593, 0.28));
    g.add(at(sph(0.08, steel, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), 0.2, 0.6, 0.28));
    g.add(at(sph(0.014, steel, 10, 8), 0.2, 0.685, 0.28));
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
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.6, roughness: 0.3 })));
  }

  function marker(group, r, c, color) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.42, 40), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, toneMapped: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(x(c), 0.05, z(r)); group.add(ring);
  }

  function clear(group) { while (group.children.length) group.children.pop().geometry?.dispose(); }

  return { ROWS, COLS, x, z, setup, floor, label, makeTable, makeFryer, makePlace, makePerson, makeRobot, Runner, trail, marker, clear };
};
