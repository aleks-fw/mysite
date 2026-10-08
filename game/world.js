(function (root) {
  "use strict";
  // пиксельные значки бонусов 16x16 (рисуются в canvas 64x64), общие для 3D-ромбов и HUD
  function paintIcon(type) {
    const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d");
    const px = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x * 4, y * 4, w * 4, h * 4); };
    const INK = "#1b1a2e", W = "#ffffff";
    if (type === "double") {
      [4, 11].forEach((cx) => { for (let i = 0; i < 4; i++) px(cx - i, 2 + i, 1 + i * 2, 1, INK); px(cx - 1, 6, 3, 7, INK); px(cx, 3, 1, 1, W); });
    } else if (type === "shield") {
      for (let y = 1; y < 14; y++) { const hw = y < 8 ? 6 : Math.max(0, 6 - (y - 7)); px(8 - hw, y, hw * 2, 1, INK); }
      px(7, 3, 2, 8, W); px(5, 5, 6, 2, W);
    } else if (type === "magnet") {
      px(2, 2, 4, 8, INK); px(10, 2, 4, 8, INK); px(2, 10, 12, 3, INK); px(4, 13, 8, 1, INK); px(2, 2, 4, 3, W); px(10, 2, 4, 3, W);
    } else if (type === "heart") {
      px(2, 3, 5, 2, INK); px(9, 3, 5, 2, INK); px(1, 5, 14, 4, INK); px(2, 9, 12, 2, INK); px(4, 11, 8, 1, INK); px(6, 12, 4, 1, INK); px(7, 13, 2, 1, INK); px(3, 5, 3, 2, W);
    } else if (type === "coin") {
      for (let y = 2; y <= 13; y++) { const dy = y - 7.5, hw = Math.round(Math.sqrt(Math.max(0, 31 - dy * dy))); px(8 - hw, y, hw * 2, 1, INK); }
      px(6, 5, 4, 1, W); px(7, 5, 2, 6, W); px(6, 10, 4, 1, W);
    } else if (type === "wing") {
      px(1, 7, 5, 2, INK); px(1, 5, 2, 6, INK); px(10, 7, 5, 2, INK); px(13, 5, 2, 6, INK); px(7, 3, 2, 10, INK); px(6, 4, 4, 1, INK); px(7, 3, 2, 1, W);
    } else if (type === "rocket") {
      px(7, 1, 2, 1, INK); px(6, 2, 4, 1, INK); px(5, 3, 6, 8, INK); px(7, 5, 2, 2, W); px(3, 9, 2, 4, INK); px(11, 9, 2, 4, INK); px(6, 11, 4, 1, INK); px(7, 12, 2, 3, INK);
    } else {
      for (let y = 4; y <= 14; y++) { const dy = y - 9, hw = Math.round(Math.sqrt(Math.max(0, 25 - dy * dy))); px(7 - hw, y, hw * 2 + 1, 1, INK); }
      px(10, 4, 2, 1, INK); px(11, 3, 2, 1, INK); px(12, 2, 1, 1, INK); px(13, 1, 1, 2, W); px(5, 7, 2, 2, W);
    }
    return c;
  }
  function create(eng) {
    const T = eng.THREE, scene = eng.scene, camera = eng.camera;
    const mat = (c, o) => new T.MeshStandardMaterial(Object.assign({ color: c, emissive: c, emissiveIntensity: 0.45, flatShading: true, roughness: 0.6, metalness: 0.1 }, o));
    const glow = (c) => new T.MeshBasicMaterial({ color: c });
    const disposables = [];
    const own = (x) => { disposables.push(x); return x; };

    // --- звёздное небо: Points, прокручиваются вдоль z, затем возвращаются ---
    const STARS = 1400, starGeo = own(new T.BufferGeometry()), sp = new Float32Array(STARS * 3);
    for (let i = 0; i < STARS; i++) { sp[i * 3] = (Math.random() - 0.5) * 120; sp[i * 3 + 1] = -2 - Math.random() * 10; sp[i * 3 + 2] = -76 + Math.random() * 92; }
    starGeo.setAttribute("position", new T.BufferAttribute(sp, 3));
    const stars = new T.Points(starGeo, own(new T.PointsMaterial({ color: 0xd2e6f9, size: 0.13, fog: false }))); scene.add(stars);
    // второй слой: редкие яркие звёзды покрупнее, разных оттенков
    const BIG = 160, bigGeo = own(new T.BufferGeometry()), bp = new Float32Array(BIG * 3), bc = new Float32Array(BIG * 3), tints = [0xffffff, 0xcfe0ff, 0xffe9b8, 0xf2c4ff];
    for (let i = 0; i < BIG; i++) { bp[i * 3] = (Math.random() - 0.5) * 120; bp[i * 3 + 1] = -3 - Math.random() * 9; bp[i * 3 + 2] = -76 + Math.random() * 92; const c = new T.Color(tints[i % 4]); bc[i * 3] = c.r; bc[i * 3 + 1] = c.g; bc[i * 3 + 2] = c.b; }
    bigGeo.setAttribute("position", new T.BufferAttribute(bp, 3)); bigGeo.setAttribute("color", new T.BufferAttribute(bc, 3));
    scene.add(new T.Points(bigGeo, own(new T.PointsMaterial({ size: 0.3, vertexColors: true, fog: false, transparent: true, opacity: 0.9 }))));
    const speedBase = { v: 6, keep: 6 };
    const removeStars = eng.add((dt) => {
      const a = starGeo.attributes.position;
      for (let i = 0; i < STARS; i++) { let z = a.getZ(i) + speedBase.v * dt; if (z > 16) z -= 92; a.setZ(i, z); }
      a.needsUpdate = true;
      const ba = bigGeo.attributes.position; for (let i = 0; i < BIG; i++) { let z = ba.getZ(i) + speedBase.v * 0.7 * dt; if (z > 16) z -= 92; ba.setZ(i, z); } ba.needsUpdate = true;
    });

    // --- корабль: точная копия референса (пиксельный истребитель 15x16: серый корпус, красные и синие детали), каждый «пиксель» — кубик ---
    const ship = new T.Group();
    const SPRITE = [       // W серый, R красный, B синий
      ".......W.......", ".......W.......", ".......W.......", "......WWW......", "......WWW......", "...R..WWW..R...", "...R..WWW..R...", "...W.WWWWW.W...",
      "R..WBWWRWWBW..R", "R..BWWRRRWWB..R", "W..WWWRWRWWW..W", "W.WWWWWWWWWWW.W", "WWWWWRWWWRWWWWW", "WWW.RRWWWRR.WWW", "WW..RR.W.RR..WW", "W......W......W"
    ];
    const SH = { W: [0xcccccc, 0.26], R: [0xa41023, 0.3], B: [0x344d84, 0.3] };
    const cell = 0.2, cells = [];
    SPRITE.forEach((row, ry) => { for (let cx = 0; cx < 15; cx++) { const ch = row[cx]; if (ch !== ".") cells.push([cx, ry, ch]); } });
    const hullMesh = new T.InstancedMesh(own(new T.BoxGeometry(cell, 1, cell)), own(new T.MeshBasicMaterial({})), cells.length);
    { const m4 = new T.Matrix4(), col = new T.Color();
      cells.forEach(([cx, ry, ch], i) => { const [c, h] = SH[ch]; m4.makeScale(1, h, 1); m4.setPosition((cx - 7) * cell, h / 2, (ry - 8) * cell); hullMesh.setMatrixAt(i, m4); hullMesh.setColorAt(i, col.setHex(c)); });
      hullMesh.instanceMatrix.needsUpdate = true; hullMesh.instanceColor.needsUpdate = true; }
    ship.add(hullMesh);
    const flames = [];
    [-0.5, 0.5].forEach((x) => {
      const f = new T.Mesh(own(new T.BoxGeometry(0.2, 0.14, 0.7)), own(glow(0x9cc8f0))); f.position.set(x, 0.1, 1.8); ship.add(f); flames.push(f);
      const f2 = new T.Mesh(own(new T.BoxGeometry(0.1, 0.08, 0.45)), own(glow(0xffffff))); f2.position.set(x, 0.1, 1.68); ship.add(f2); flames.push(f2);
    });
    const shield = new T.Mesh(own(new T.IcosahedronGeometry(1.7, 1)), own(new T.MeshBasicMaterial({ color: 0x9cc8f0, transparent: true, opacity: 0.25, wireframe: true }))); shield.visible = false; ship.add(shield);
    ship.scale.setScalar(0.8); ship.position.set(0, 0, 2); scene.add(ship);
    let t = 0;
    const removeShip = eng.add((dt) => {
      t += dt; const fl = 0.75 + Math.sin(t * 38) * 0.2 + Math.random() * 0.15;
      flames.forEach((f, i) => { f.scale.z = fl * (i % 2 ? 0.8 : 1); });
      ship.position.y = Math.sin(t * 2) * 0.1; shield.rotation.y += dt; shield.rotation.x += dt * 0.4;
    });

    // --- пул: общий механизм ---
    function pool(n, make) {
      const items = []; for (let i = 0; i < n; i++) { const m = make(); m.visible = false; m.userData.free = true; scene.add(m); items.push(m); }
      return {
        take() { const m = items.find((x) => x.userData.free); if (!m) return null; m.userData.free = false; m.visible = true; return m; },
        give(m) { m.userData.free = true; m.visible = false; },
        all: items
      };
    }
    // --- туманность: три больших мягких пятна далеко внизу, медленно плывут ---
    const nebs = [];
    [].forEach(([col, x, z]) => {
      const cv = document.createElement("canvas"); cv.width = cv.height = 128; const g = cv.getContext("2d");
      const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64); const c = new T.Color(col);
      gr.addColorStop(0, "rgba(" + Math.round(c.r * 255) + "," + Math.round(c.g * 255) + "," + Math.round(c.b * 255) + ",0.55)"); gr.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
      const tex = own(new T.CanvasTexture(cv)), m = new T.Mesh(own(new T.PlaneGeometry(26, 26)), own(new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, fog: false })));
      m.rotation.x = -Math.PI / 2; m.position.set(x, -7, z); scene.add(m); nebs.push(m);
    });
    // --- полёт по Млечному пути (между волнами): звёздные полосы, широкий обзор, светящийся пояс ---
    let warpK = 0, lastFov = -1;
    const clamp01 = (v) => Math.max(0, Math.min(1, v));
    const streakGeo = own(new T.BoxGeometry(0.05, 0.05, 1)), streakMat = own(new T.MeshBasicMaterial({ color: 0xd2e6f9, transparent: true, opacity: 0, depthWrite: false, fog: false }));
    const streaks = []; for (let i = 0; i < 110; i++) { const m = new T.Mesh(streakGeo, streakMat); m.visible = false; m.position.set((Math.random() - 0.5) * 30, -2 + Math.random() * 3, -34 + Math.random() * 44); scene.add(m); streaks.push(m); }
    const mw = (() => {
      const cv = document.createElement("canvas"); cv.width = 1024; cv.height = 256; const g = cv.getContext("2d");
      const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "rgba(120,80,255,0)"); gr.addColorStop(0.5, "rgba(190,140,255,.55)"); gr.addColorStop(1, "rgba(120,80,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 1024, 256);
      const gr2 = g.createLinearGradient(0, 0, 0, 256); gr2.addColorStop(0.35, "rgba(255,120,210,0)"); gr2.addColorStop(0.5, "rgba(255,170,230,.35)"); gr2.addColorStop(0.65, "rgba(255,120,210,0)"); g.fillStyle = gr2; g.fillRect(0, 0, 1024, 256);
      for (let i = 0; i < 1500; i++) { const y = 128 + (Math.random() + Math.random() + Math.random() - 1.5) * 85, x = Math.random() * 1024, a = 0.4 + Math.random() * 0.6; g.fillStyle = "rgba(255,255,255," + a + ")"; g.fillRect(x, y, 1 + Math.random() * 1.6, 1 + Math.random() * 1.6); }
      g.globalCompositeOperation = "destination-in"; const fx = g.createLinearGradient(0, 0, 1024, 0); fx.addColorStop(0, "rgba(0,0,0,0)"); fx.addColorStop(0.22, "rgba(0,0,0,1)"); fx.addColorStop(0.78, "rgba(0,0,0,1)"); fx.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = fx; g.fillRect(0, 0, 1024, 256); g.globalCompositeOperation = "source-over";
      const tex = own(new T.CanvasTexture(cv)), m = new T.Mesh(own(new T.PlaneGeometry(150, 26)), own(new T.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, fog: false })));
      m.rotation.x = -Math.PI / 2; m.rotation.z = 0.55; m.position.set(0, -6, -70); m.visible = false; scene.add(m); return m;
    })();
    const removeWarp = eng.add((dt) => {
      const k = warpK, on = k > 0.02;
      speedBase.v = on ? 6 + 90 * k : speedBase.keep;
      if (Math.abs(k - lastFov) > 0.001) { lastFov = k; eng.camera.fov = (eng.camera.aspect < 0.8 ? 72 : 55) + 38 * k; eng.camera.updateProjectionMatrix(); }
      streakMat.opacity = Math.min(1, k * 1.4);
      for (const m of streaks) { m.visible = on; if (!on) continue; m.position.z += (50 + 140 * k) * dt; if (m.position.z > 12) { m.position.z -= 50; m.position.x = (Math.random() - 0.5) * 30; } m.scale.z = 2 + k * 22; }
      mw.visible = false;   // светящийся пояс убран по просьбе; полосы скорости и расширенный обзор остаются
      ship.scale.z = 0.8 * (1 + 0.35 * k);
    });
    const removeNeb = eng.add((dt) => { nebs.forEach((m) => { m.position.z += dt * 1.2; if (m.position.z > 16) m.position.z -= 56; }); });
    // --- след двигателей: маленькие пиксельные кубики ---
    const trailGeo = own(new T.BoxGeometry(0.14, 0.14, 0.14)), trailMats = [own(glow(0x9cc8f0)), own(glow(0xffffff))];
    const trail = []; let trailI = 0, trailT = 0;
    for (let i = 0; i < 36; i++) { const m = new T.Mesh(trailGeo, trailMats[i % 2]); m.visible = false; m.userData.life = 0; scene.add(m); trail.push(m); }
    const removeTrail = eng.add((dt) => {
      trailT += dt;
      while (trailT > 0.03) { trailT -= 0.03; [-0.4, 0.4].forEach((x) => { const m = trail[trailI++ % trail.length]; m.visible = true; m.userData.life = 0.4; m.position.set(ship.position.x + x * ship.scale.x, 0.05, ship.position.z + 1.9); }); }
      for (const m of trail) { if (!m.visible) continue; m.userData.life -= dt; if (m.userData.life <= 0) { m.visible = false; continue; } m.position.z += dt * 7; m.scale.setScalar(m.userData.life / 0.4); }
    });

    // --- враги: обычные, стрелок, и пять уникальных боссов ---
    const G = (g) => own(g);
    // обычные враги: пиксельные спрайты из кубиков (B тело, O контур, E белок, K зрачок), как корабль
    const SPR = {
      virus: [[0xf2a0b8, 0xa64f69], ["....OOO....", "O...OBO...O", ".O.OBBBO.O.", "..OBBBBBO..", ".OBBBBBBBO.", "OBBEEBEEBBO", "OBBEKBKEBBO", ".OBBBBBBBO.", "..OBBBBBO..", ".O.OBBBO.O.", "O...OBO...O", "....OOO...."]],
      bug: [[0xf3d88c, 0xb8923a], ["..O.....O..", "...O...O...", "..OOOOOOO..", ".OBBBBBBBO.", "OBBEEBEEBBO", "OBBEKBKEBBO", "OBBBBBBBBBO", ".OBBBBBBBO.", "O.OOOOOOO.O", "O.O.....O.O"]],
      shooter: [[0xff7a9a, 0x9c2a46], ["O.......O", "OO.....OO", "OBO...OBO", "OBBOOOBBO", "OBBBBBBBO", ".OBEBEBO.", ".OBKBKBO.", "..OBBBO..", "...OBO...", "....O...."]],
      seg: [[0x7bd88f, 0x2f8a46], ["..OOOOO..", ".OBBBBBO.", "OBBBBBBBO", "OBEEBEEBO", "OBEKBKEBO", "OBBBBBBBO", "OBBOOOBBO", ".OBBBBBO.", "..OOOOO.."]],
      bot: [[0x9b6be8, 0x4e2a96], ["....O....", "....B....", ".OOOOOOO.", "OBBBBBBBO", "OBEEBEEBO", "OBEKBKEBO", "OBBBBBBBO", "OBOBOBOBO", ".OOOOOOO."]]
    };
    const pixelGeo = G(new T.BoxGeometry(1, 1, 1)), pixelMat = G(new T.MeshBasicMaterial({}));
    function buildSprite(rows, look, width) {
      const W = Math.max(...rows.map((r) => r.length)), cell = width / W, cells = [];
      rows.forEach((r, ry) => { for (let cx = 0; cx < r.length; cx++) if (r[cx] !== ".") cells.push([cx, ry, r[cx]]); });
      const im = new T.InstancedMesh(pixelGeo, pixelMat, cells.length), m4 = new T.Matrix4(), col = new T.Color();
      cells.forEach(([cx, ry, ch], i) => { const [c, h] = look[ch]; m4.makeScale(cell, h, cell); m4.setPosition((cx - (W - 1) / 2) * cell, h / 2, (ry - (rows.length - 1) / 2) * cell); im.setMatrixAt(i, m4); im.setColorAt(i, col.setHex(c)); });
      im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
      const g = new T.Group(); g.add(im); return g;
    }
    function pixelEnemy(kind) {
      const [[cb, co], rows] = SPR[kind];
      return buildSprite(rows, { B: [cb, 0.34], O: [co, 0.26], E: [0xffffff, 0.4], K: [0x1a1a2e, 0.44] }, 1.5);
    }
    // боссы: у каждого свой силуэт. mir() зеркалит левую половину (последний символ — центр)
    const mir = (h) => h + h.slice(0, -1).split("").reverse().join("");
    const flat = (hs) => hs.map(mir);
    // плоское кольцо из кубиков, вращается вокруг вертикальной оси
    function pixelRing(radius, n, size, color) {
      const g = new T.Group(), im = new T.InstancedMesh(pixelGeo, G(new T.MeshBasicMaterial({ color })), n), m4 = new T.Matrix4();
      for (let i = 0; i < n; i++) { const an = (i / n) * Math.PI * 2; m4.makeScale(size, 0.3, size); m4.setPosition(Math.cos(an) * radius, 0.15, Math.sin(an) * radius); im.setMatrixAt(i, m4); }
      im.instanceMatrix.needsUpdate = true; g.add(im); return g;
    }
    const BOSS = {
      // Матка: круглая клетка с ядром, тёмным кольцом внутри и шипами по восьми сторонам (без лица)
      mother() {
        const N = 27, c = 13, rows = [];
        for (let y = 0; y < N; y++) { let r = ""; for (let x = 0; x < N; x++) {
          const dx = x - c, dy = y - c, d = Math.hypot(dx, dy), an = Math.atan2(dy, dx), k = Math.abs(((an / (Math.PI / 4)) % 1 + 1) % 1 - 0.5);
          let ch = ".";
          if (d <= 2.8) ch = "L"; else if (d <= 4.6) ch = "B"; else if (d <= 5.8) ch = "D"; else if (d <= 10) ch = "B"; else if (d <= 11) ch = "O"; else if (d <= 13.4 && k > 0.42 && d > 10.9) ch = "O";
          if (ch === "B" && ((x * 7 + y * 13) % 11 === 0) && d > 6.5 && d < 9.5) ch = "E";
          r += ch; } rows.push(r); }
        return buildSprite(rows, { L: [0xffd9e4, 0.46], B: [0xa64f69, 0.34], D: [0x5c2236, 0.28], O: [0x3d1424, 0.3], E: [0xf2a0b8, 0.38] }, 6.6);
      },
      // Троян: бронированный танк с башней, пушкой, зубцами на броне и жёлтыми глазами-смотровыми щелями
      trojan() {
        const rows = flat([".O..O..O..O", ".O..O..O..O", "OOOOOOOOOOO", "ODDDDDDDDDD", "ODBBBBTTTTT", "ODBBBTTKKKK", "ODBBBTTKKKK", "ODBBBBTTTTT", "ODBBBBBBBBB", "ODBYYBBBBBB", "ODDDDDDDDDD", "OOOOOOOOOOO", "OXXOXXOXXOO", "OXXOXXOXXOO"]);
        return buildSprite(rows, { O: [0x7a3a0c, 0.28], D: [0xb8651a, 0.3], B: [0xd9822b, 0.34], T: [0x8c4a12, 0.46], K: [0x2b1405, 0.5], Y: [0xf3d88c, 0.42], X: [0x3a3a44, 0.3] }, 6.6);
      },
      // Червь (голова): вытянутая капля с красными глазами и клыкастой пастью
      worm() {
        const rows = flat(["....OOOO", "..OOBBBB", ".OBBBBBB", ".OBBLBBB", "OBBBLBBB", "OBRRBBBB", "OBBBBBBB", "OBBBBBBB", ".OBBDDDD", ".OBDDDDD", ".OWDDDDD", "OWODDDDD", "OOW.DDDD", "..OW.DDD", "...OW..D"]);
        return buildSprite(rows, { O: [0x1e6b36, 0.28], B: [0x57c96f, 0.34], L: [0xb9f2c4, 0.4], R: [0xff4d4d, 0.46], D: [0x14301c, 0.2], W: [0xffffff, 0.44] }, 4.8);
      },
      // Шифровальщик: навесной замок с замочной скважиной; два плоских кольца вращаются вокруг него
      cipher() {
        const rows = flat(["...OOOOOO", "..OO.....", "..LL.....", "..LL.....", "OOOOOOOOO", "OBBBBBBBB", "OBBBBBBBB", "OBBBBBBKK", "OBBBBBBBK", "OBBBBBBBK", "OBBBBBBBB", "OBBBBBBBB", "OOOOOOOOO"]);
        const g = buildSprite(rows, { O: [0x0b4b57, 0.28], B: [0x3ec8d8, 0.34], L: [0xcff8ff, 0.42], K: [0x061c22, 0.46] }, 4.4);
        const r1 = pixelRing(3.5, 34, 0.24, 0x9cf0ff), r2 = pixelRing(4.2, 42, 0.2, 0x3ec8d8); g.add(r1); g.add(r2); g.userData.rings = [r1, r2]; return g;
      },
      // Ботнет: процессорный чип с ножками и глазом-ядром; вокруг крутятся шесть маленьких ботов
      botnet() {
        const rows = flat(["..O.O.O.O", "..O.O.O.O", "OOOOOOOOO", "OBBBBBBBB", "OBDDDDDDD", "OBDDDDDDD", "OBDDDEEEE", "OBDDDEKKK", "OBDDDEEEE", "OBDDDDDDD", "OBDDDDDDD", "OBBBBBBBB", "OOOOOOOOO", "..O.O.O.O", "..O.O.O.O"]);
        const g = buildSprite(rows, { O: [0x3a1d78, 0.28], B: [0x8a5be0, 0.34], D: [0x4a2a8c, 0.3], E: [0xffffff, 0.44], K: [0xff4d9a, 0.5] }, 5);
        const orb = [];
        for (let i = 0; i < 6; i++) { const s = buildSprite(["..O..", ".OBO.", "OBEBO", ".OBO.", "..O.."], { O: [0x5a3aa8, 0.26], B: [0xc9a8ff, 0.34], E: [0xffffff, 0.42] }, 1.1); g.add(s); orb.push(s); }
        g.userData.orbs = orb; return g;
      }
    };
    const addTo = (grp, geo, mt, x, y, z) => { const m = new T.Mesh(geo, mt); m.position.set(x, y, z); grp.add(m); return m; };
    const eyeGeo = G(new T.BoxGeometry(0.34, 0.2, 0.12)), eyeMat = own(glow(0xffffff)), spikeGeo = G(new T.ConeGeometry(0.22, 0.8, 5));
    const enemyPools = {
      virus: pool(40, () => pixelEnemy("virus")),
      bug: pool(40, () => pixelEnemy("bug")),
      shooter: pool(16, () => pixelEnemy("shooter")),
      seg: pool(16, () => pixelEnemy("seg")),
      bot: pool(24, () => pixelEnemy("bot")),
      mother: pool(2, () => BOSS.mother()),
      trojan: pool(2, () => BOSS.trojan()),
      wormhead: pool(2, () => BOSS.worm()),
      cipher: pool(2, () => BOSS.cipher()),
      botnet: pool(2, () => BOSS.botnet())
    };
    // --- вражеские пули, предупреждающие линии, монеты ---
    const ebGeo = G(new T.SphereGeometry(0.2, 8, 6)), ebMat = own(glow(0xff5a7a));
    const enemyBullets = pool(90, () => new T.Mesh(ebGeo, ebMat));
    const teleGeo = G(new T.PlaneGeometry(1, 1));
    const teles = pool(8, () => { const m = new T.Mesh(teleGeo, new T.MeshBasicMaterial({ color: 0xff3a5a, transparent: true, opacity: 0.3, depthWrite: false, side: T.DoubleSide, fog: false })); m.rotation.x = -Math.PI / 2; m.position.y = 0.04; disposables.push(m.material); return m; });
    const coinGeo = G(new T.OctahedronGeometry(0.24, 0)), coinMat = own(glow(0xf3d88c));
    const coins = pool(48, () => { const m = new T.Mesh(coinGeo, coinMat); m.scale.set(1, 0.4, 1); m.scale.y = 1; return m; });
    // --- пули, бонусы, частицы ---
    const bulletGeo = own(new T.CapsuleGeometry(0.1, 0.6, 2, 6)), bulletMats = [own(glow(0xd2e6f9)), own(glow(0xf3d88c)), own(glow(0xf2a0b8))];
    const bullets = pool(64, () => { const m = new T.Mesh(bulletGeo, bulletMats[0]); m.rotation.x = Math.PI / 2; return m; });
    const pickCol = { repair: 0xf2a0b8, bomb: 0xffffff };
    const rimGeo = own(new T.BoxGeometry(1.25, 0.1, 1.25)), tileGeo = own(new T.BoxGeometry(1.05, 0.16, 1.05)), iconGeo = own(new T.PlaneGeometry(0.78, 0.78));
    const rimMat = own(glow(0x1b1a2e)), tileMats = {}, iconMats = {};
    Object.keys(pickCol).forEach((k) => {
      tileMats[k] = own(glow(pickCol[k]));
      const tex = own(new T.CanvasTexture(paintIcon(k === "repair" ? "heart" : k))); tex.magFilter = T.NearestFilter; tex.minFilter = T.NearestFilter;
      iconMats[k] = own(new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    });
    const pickups = pool(8, () => {
      const g = new T.Group(), rim = new T.Mesh(rimGeo, rimMat), tile = new T.Mesh(tileGeo, tileMats.repair), icon = new T.Mesh(iconGeo, iconMats.repair);
      rim.rotation.y = tile.rotation.y = Math.PI / 4; rim.position.y = -0.04; tile.position.y = 0.04; icon.rotation.x = -Math.PI / 2; icon.position.y = 0.14;
      g.add(rim, tile, icon); g.userData.tile = tile; g.userData.icon = icon; g.userData.age = 0; return g;
    });
    // ракеты: пиксельный корпус, носик и огонь
    const rGeo = { body: own(new T.BoxGeometry(0.24, 0.24, 0.8)), nose: own(new T.BoxGeometry(0.16, 0.16, 0.24)), fin: own(new T.BoxGeometry(0.62, 0.05, 0.22)), fire: own(new T.BoxGeometry(0.12, 0.12, 0.5)) };
    const rMat = { body: own(glow(0xd2e6f9)), nose: own(glow(0xf2a0b8)), fin: own(glow(0x8e86c9)), fire: own(glow(0xf3d88c)) };
    const rockets = pool(3, () => {
      const g = new T.Group(), b = new T.Mesh(rGeo.body, rMat.body), n = new T.Mesh(rGeo.nose, rMat.nose), f = new T.Mesh(rGeo.fin, rMat.fin), fr = new T.Mesh(rGeo.fire, rMat.fire);
      n.position.z = -0.52; f.position.z = 0.3; fr.position.z = 0.65; g.add(b, n, f, fr); g.userData.fire = fr; return g;
    });
    // кольца подбора
    const ringGeo = own(new T.RingGeometry(0.6, 0.75, 28)), rings = pool(6, () => { const m = new T.Mesh(ringGeo, new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1, side: T.DoubleSide, depthWrite: false })); m.rotation.x = -Math.PI / 2; disposables.push(m.material); return m; });
    const partGeo = own(new T.BoxGeometry(0.18, 0.18, 0.18));
    const parts = pool(160, () => new T.Mesh(partGeo, own(glow(0xffffff))));
    let shakeP = 0;
    const removeParts = eng.add((dt) => {
      for (const p of pickups.all) { if (p.userData.free) continue; const u = p.userData; u.age += dt; p.rotation.x = Math.sin(u.age * 3) * 0.22; p.rotation.z = Math.cos(u.age * 2.4) * 0.22; p.scale.setScalar(1 + Math.sin(u.age * 6) * 0.07); p.position.y = 0.15 + Math.sin(u.age * 4) * 0.1; }
      for (const cn of coins.all) { if (!cn.userData.free) { cn.rotation.y += dt * 6; cn.rotation.x = Math.sin(cn.rotation.y) * 0.3; } }
      for (const bp of [enemyPools.botnet.all[0], enemyPools.botnet.all[1]]) { if (bp.userData.free) continue; const o = bp.userData.orbs, tt = performance.now() / 1000; o.forEach((s, i) => { const a = tt * 1.6 + i * 1.0472; s.position.set(Math.cos(a) * 3.6, 0, Math.sin(a) * 3.6); }); }
      for (const cp of enemyPools.cipher.all) { if (cp.userData.free) continue; cp.userData.rings[0].rotation.y += dt * 1.5; cp.userData.rings[1].rotation.y -= dt * 1.1; }
      for (const rk of rockets.all) { if (!rk.userData.free) rk.userData.fire.scale.z = 0.8 + Math.random() * 0.5; }
      for (const rg of rings.all) { if (rg.userData.free) continue; const u = rg.userData; u.life += dt; const k = u.life / 0.5; if (k >= 1) { rings.give(rg); continue; } rg.scale.setScalar(1 + k * 3); rg.material.opacity = 1 - k; }
      for (const p of parts.all) { if (p.userData.free) continue; const u = p.userData; u.life -= dt; if (u.life <= 0) { parts.give(p); continue; }
        p.position.x += u.vx * dt; p.position.z += u.vz * dt; p.position.y += u.vy * dt; p.scale.setScalar(Math.max(0.01, u.life / u.max)); }
      if (shakeP > 0) { shakeP = Math.max(0, shakeP - dt * 2.5); camera.position.x = (Math.random() - 0.5) * shakeP; camera.position.y = 13 + (Math.random() - 0.5) * shakeP * 0.6; if (!shakeP) { camera.position.x = 0; camera.position.y = 13; } }
    });
    return {
      ship,
      setShipTilt(vx) { ship.rotation.z = -Math.max(-0.6, Math.min(0.6, vx * 0.05)); },
      setShield(on) { shield.visible = !!on; },
      setSpeed(v) { speedBase.keep = v; if (warpK <= 0.02) speedBase.v = v; },
      setWarp(k) { warpK = k; },
      spawnEnemy(kind) { const m = enemyPools[kind].take(); if (m) { m.userData.kind = kind; m.rotation.set(0, 0, 0); } return m; },
      fireEnemyBullet(x, z) { const m = enemyBullets.take(); if (m) m.position.set(x, 0.1, z); return m; },
      releaseEnemyBullet(m) { enemyBullets.give(m); },
      telegraph() { return teles.take(); },
      releaseTele(m) { teles.give(m); },
      dropCoin(x, z) { const m = coins.take(); if (m) m.position.set(x, 0.15, z); return m; },
      releaseCoin(m) { coins.give(m); },
      releaseEnemy(m) { enemyPools[m.userData.kind].give(m); },
      fireBullet(x, z, tier) { const m = bullets.take(); if (!m) return null; m.material = bulletMats[tier] || bulletMats[0]; m.position.set(x, 0, z); return m; },
      releaseBullet(m) { bullets.give(m); },
      dropPickup(type, x, z) { const m = pickups.take(); if (!m) return null; m.userData.type = type; m.userData.age = 0; m.userData.tile.material = tileMats[type]; m.userData.icon.material = iconMats[type]; m.position.set(x, 0.15, z); return m; },
      releasePickup(m) { pickups.give(m); },
      fireRocket(x, z) { const m = rockets.take(); if (!m) return null; m.position.set(x, 0.1, z); return m; },
      releaseRocket(m) { rockets.give(m); },
      pulse(x, z, color) { const m = rings.take(); if (!m) return; m.userData.life = 0; m.material.color.setHex(color); m.position.set(x, 0.1, z); m.scale.setScalar(1); },
      burst(x, z, color, n) {
        for (let i = 0; i < n; i++) { const p = parts.take(); if (!p) break; const a = Math.random() * 6.283, s = 2 + Math.random() * 5;
          p.material.color.setHex(color); p.position.set(x, 0, z); p.userData.vx = Math.cos(a) * s; p.userData.vz = Math.sin(a) * s; p.userData.vy = Math.random() * 2; p.userData.life = p.userData.max = 0.4 + Math.random() * 0.4; p.scale.setScalar(1); }
      },
      shake(p) { shakeP = Math.max(shakeP, p); },
      reset() { [...Object.values(enemyPools), bullets, pickups, parts, rings, rockets, enemyBullets, teles, coins].forEach((p) => p.all.forEach((m) => p.give(m))); ship.position.set(0, 0, 2); shield.visible = false; shakeP = 0; warpK = 0; trail.forEach((m) => { m.visible = false; }); camera.position.set(0, 13, 9); },
      project(x, z) { const v = new T.Vector3(x, 0, z).project(camera), el = eng.renderer.domElement; return { x: (v.x * 0.5 + 0.5) * el.clientWidth, y: (-v.y * 0.5 + 0.5) * el.clientHeight }; },
      dispose() { removeStars(); removeShip(); removeParts(); removeNeb(); removeTrail(); removeWarp(); eng.camera.fov = eng.camera.aspect < 0.8 ? 72 : 55; eng.camera.updateProjectionMatrix(); disposables.forEach((d) => d.dispose && d.dispose()); }
    };
  }
  root.FopkaWorld = { create, iconURL: (type) => paintIcon(type).toDataURL() };
})(window);
