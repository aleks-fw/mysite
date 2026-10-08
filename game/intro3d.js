(function (root) {
  "use strict";
  // 3D-сцена входа: тёмная комната, свет идёт только от экрана ноутбука, камера — глаза человека.
  // ms от начала анимации (те же отметки, что в intro.js): 350–1500 отъезд, 1500–2550 рука берёт чёрные солнцезащитные очки и несёт к лицу.
  const clamp = (v) => Math.max(0, Math.min(1, v));
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  let disabled = false, ready = null;
  const supported = () => { if (disabled) return false; try { const c = document.createElement("canvas"); return !!(root.THREE && root.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl"))); } catch (e) { return false; } };

  function cssVar(n, d) { const v = getComputedStyle(document.documentElement).getPropertyValue(n).trim(); return v || d; }
  function screenCanvas() {
    const cv = document.createElement("canvas"); cv.width = 1280; cv.height = 800; const g = cv.getContext("2d"), k = 1.25;
    const bg = cssVar("--bg", "#faf4ed"), bg2 = cssVar("--bg2", "#f0e6d9"), line = cssVar("--line", "#575279"), text = cssVar("--text", "#575279"), pink = cssVar("--pink", "#a64f69"), onp = cssVar("--on-pink", "#fff");
    g.scale(k, k);
    g.fillStyle = bg; g.fillRect(0, 0, 1024, 640);
    g.fillStyle = bg2; g.fillRect(0, 0, 1024, 64); g.fillStyle = line; g.fillRect(0, 62, 1024, 4);
    g.fillStyle = text; g.font = "800 34px Onest, system-ui, sans-serif"; g.textBaseline = "middle"; g.fillText("nyan", 28, 33);
    g.fillStyle = pink; g.fillRect(132, 21, 13, 22); g.fillStyle = text; g.fillText("fm", 152, 33);
    [0, 1, 2].forEach((i) => { g.fillStyle = line; g.fillRect(780 + i * 78, 29, 60, 8); });
    g.font = "800 92px Onest, system-ui, sans-serif"; g.fillStyle = text; g.fillText("я", 70, 250);
    const w = g.measureText("ПРОГРАММИСТ").width; g.fillStyle = pink; g.fillRect(150, 188, w + 24, 126); g.fillStyle = onp; g.fillText("ПРОГРАММИСТ", 162, 250);
    g.fillStyle = text; g.fillText(",", 162 + w + 8, 250); g.fillText("пишу САЙТЫ", 70, 380);
    g.font = "600 34px Onest, system-ui, sans-serif"; g.fillStyle = line; g.fillText("..а человек я просто неплохой.", 70, 470);
    return cv;
  }
  function keysCanvas() {   // клавиатура с буквами и тёмными кейкапами
    const cv = document.createElement("canvas"); cv.width = 1024; cv.height = 560; const g = cv.getContext("2d");
    g.fillStyle = "#07070b"; g.fillRect(0, 0, 1024, 560);
    const rows = ["1234567890-=", "QWERTYUIOP[]", "ASDFGHJKL;'", "ZXCVBNM,./"]; g.textAlign = "center"; g.textBaseline = "middle";
    const key = (x, y, w, label) => {
      g.fillStyle = "#1b1b24"; g.beginPath(); g.rect(x, y, w, 76); g.fill(); g.fillStyle = "#262633"; g.beginPath(); g.rect(x + 3, y + 3, w - 6, 40); g.fill();
      if (label) { g.fillStyle = "#8b8fb0"; g.font = "600 26px system-ui, sans-serif"; g.fillText(label, x + w / 2, y + 40); }
    };
    rows.forEach((r, ri) => { for (let i = 0; i < r.length; i++) key(14 + ri * 24 + i * 80, 14 + ri * 90, 72, r[i]); });
    key(14 + 4 * 24 + 80, 14 + 4 * 90, 520, ""); key(14, 14 + 4 * 90, 120, "ctrl"); key(150, 14 + 4 * 90, 90, "alt");
    return cv;
  }
  function deskCanvas(bump) {
    const cv = document.createElement("canvas"); cv.width = 512; cv.height = 512; const g = cv.getContext("2d");
    g.fillStyle = bump ? "#808080" : "#241a1d"; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 260; i++) {
      const y = Math.random() * 512, a = 0.04 + Math.random() * 0.12;
      g.fillStyle = bump ? "rgba(" + (Math.random() < 0.5 ? "255,255,255" : "0,0,0") + "," + a + ")" : "rgba(" + (60 + Math.random() * 40) + ",34,30," + a + ")";
      g.fillRect(0, y, 512, 0.6 + Math.random() * 2.2);
    }
    return cv;
  }

  function create(canvas) {
    const T = root.THREE;
    const renderer = new T.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(1); renderer.setClearColor(0x030306, 1);
    renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
        const scene = new T.Scene(); scene.fog = new T.Fog(0x030306, 1.3, 4.8);
    const camera = new T.PerspectiveCamera(50, 1, 0.01, 20);
    const own = []; const keep = (x) => { own.push(x); return x; };
    const phys = (o) => { const m = Object.assign({}, o); ["clearcoat", "clearcoatRoughness", "sheen", "sheenColor", "sheenRoughness", "bumpMap", "bumpScale", "envMapIntensity"].forEach((k) => delete m[k]); return keep(new T.MeshStandardMaterial(m)); };
    const tex = (cv, srgb) => { const t = keep(new T.CanvasTexture(cv)); t.anisotropy = 8; if (srgb !== false) t.colorSpace = T.SRGBColorSpace; return t; };
    const shadow = (m) => m;
    function rbox(w, h, r) {
      const s = new T.Shape(), x = -w / 2, y = -h / 2;
      s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
      return s;
    }
    const extrude = (shape, d, bev) => { const g = keep(new T.ExtrudeGeometry(shape, { depth: d, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 1, curveSegments: 5 })); g.translate(0, 0, -d / 2); return g; };

    scene.add(new T.AmbientLight(0x1a1a2e, 0.6));

    // стол, стена, диван
    const desk = shadow(new T.Mesh(keep(new T.PlaneGeometry(3, 2.2)), phys({ map: tex(deskCanvas(false)), roughness: 0.5, metalness: 0.05, envMapIntensity: 0.5 })), false, true);
    desk.rotation.x = -Math.PI / 2; desk.position.set(0, 0, 0.3); scene.add(desk);
    const wall = new T.Mesh(keep(new T.PlaneGeometry(6, 3)), phys({ color: 0x0a0a14, roughness: 1 })); wall.position.set(0, 0.6, -1.6); scene.add(wall);
    const sofa = new T.Group();
    [[1.1, 0.35, 0.55, 0, -0.45], [1.1, 0.5, 0.14, 0, -0.05], [0.14, 0.45, 0.55, 0.5, -0.32], [0.14, 0.45, 0.55, -0.5, -0.32]].forEach(([w, h, d, x, y], i) => {
      const m = new T.Mesh(keep(new T.BoxGeometry(w, h, d)), phys({ color: 0x14141f, roughness: 1 })); m.position.set(x, y, i === 1 ? -0.25 : 0); sofa.add(m);
    });
    sofa.position.set(-1.25, -0.05, -0.55); sofa.rotation.y = 0.5; scene.add(sofa);

    // ноутбук
    const base = shadow(new T.Mesh(extrude(rbox(0.34, 0.23, 0.012), 0.014, 0.0035), phys({ color: 0x30303a, metalness: 0.85, roughness: 0.32 }))); base.rotation.x = -Math.PI / 2; base.position.set(0, 0.0105, 0); scene.add(base);
    const keys = new T.Mesh(keep(new T.PlaneGeometry(0.31, 0.17)), phys({ map: tex(keysCanvas()), roughness: 0.45, metalness: 0.1, envMapIntensity: 0.4 })); keys.rotation.x = -Math.PI / 2; keys.position.set(0, 0.0223, 0.022); keys.receiveShadow = true; scene.add(keys);
    const pad = new T.Mesh(keep(new T.PlaneGeometry(0.105, 0.065)), phys({ color: 0x23232d, roughness: 0.2, metalness: 0.5 })); pad.rotation.x = -Math.PI / 2; pad.position.set(0, 0.0224, 0.098); scene.add(pad);
    const hinge = new T.Group(); hinge.position.set(0, 0.017, -0.115); hinge.rotation.x = -0.26; scene.add(hinge);
    const lid = shadow(new T.Mesh(extrude(rbox(0.34, 0.22, 0.012), 0.008, 0.003), phys({ color: 0x2b2b35, metalness: 0.85, roughness: 0.3 }))); lid.position.y = 0.11; hinge.add(lid);
    const screen = new T.Mesh(keep(new T.PlaneGeometry(0.312, 0.195)), keep(new T.MeshBasicMaterial({ map: tex(screenCanvas()), toneMapped: false }))); screen.position.set(0, 0.115, 0.0095); hinge.add(screen);
    const glowTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d"), gr = g.createRadialGradient(64, 64, 6, 64, 64, 64); gr.addColorStop(0, "rgba(190,215,255,.34)"); gr.addColorStop(1, "rgba(190,215,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return tex(c); })();
    const halo = new T.Mesh(keep(new T.PlaneGeometry(0.74, 0.6)), keep(new T.MeshBasicMaterial({ map: glowTex, transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false }))); halo.position.set(0, 0.115, 0.017); hinge.add(halo);
    const light = new T.PointLight(0xdfe9ff, 1.0, 3.2, 1.6); light.position.set(0, 0.19, 0.1); scene.add(light);
    const light2 = new T.PointLight(0xdfe9ff, 0.28, 2, 1.4); light2.position.set(0, 0.06, 0.32); scene.add(light2);
    // мышь
    const mouse = shadow(new T.Mesh(keep(new T.SphereGeometry(1, 14, 10)), phys({ color: 0x1c1c26, roughness: 0.3, metalness: 0.4, clearcoat: 0.6 }))); mouse.scale.set(0.035, 0.0165, 0.057); mouse.position.set(0.3, 0.0165, 0.1); scene.add(mouse);
    const split = new T.Mesh(keep(new T.BoxGeometry(0.0008, 0.0006, 0.026)), phys({ color: 0x050507 })); split.position.set(0.3, 0.0326, 0.082); scene.add(split);

    // чёрные солнцезащитные очки (классическая форма): оправа, тёмные линзы, складывающиеся дужки
    const frameMat = phys({ color: 0x08080a, roughness: 0.26, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08 });
    const lensMat = phys({ color: 0x0a0c11, roughness: 0.04, metalness: 0.6, envMapIntensity: 1.5, transparent: true, opacity: 0.95, side: T.DoubleSide });
    const outer = rbox(0.064, 0.048, 0.014), hole = new T.Path(); hole.setFromPoints(rbox(0.053, 0.037, 0.011).getPoints(12).reverse()); outer.holes.push(hole);
    const frameGeo = extrude(outer, 0.007, 0.0012), lensGeo = keep(new T.ShapeGeometry(rbox(0.055, 0.039, 0.012)));
    const glasses = new T.Group(), temples = [];
    [-0.041, 0.041].forEach((x) => { const f = shadow(new T.Mesh(frameGeo, frameMat)); f.position.x = x; glasses.add(f); const l = new T.Mesh(lensGeo, lensMat); l.position.set(x, 0, -0.0012); glasses.add(l); });
    const brow = shadow(new T.Mesh(keep(new T.BoxGeometry(0.146, 0.0065, 0.008)), frameMat)); brow.position.set(0, 0.0235, 0); glasses.add(brow);
    const bridge = shadow(new T.Mesh(keep(new T.BoxGeometry(0.02, 0.006, 0.006)), frameMat)); bridge.position.set(0, 0.009, 0); glasses.add(bridge);
    [-1, 1].forEach((sd) => { const piv = new T.Group(); piv.position.set(sd * 0.0725, 0.013, -0.002); const tm = shadow(new T.Mesh(keep(new T.BoxGeometry(0.0042, 0.0075, 0.14)), frameMat)); tm.position.z = -0.07; piv.add(tm); glasses.add(piv); temples.push([piv, sd]); });
    glasses.position.set(0.24, 0.012, 0.2); scene.add(glasses);
    const lying = new T.Quaternion().setFromEuler(new T.Euler(-Math.PI / 2, 0, 0.5)), qFlip = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), Math.PI), aim = new T.Quaternion();

    // рука: ладонь, пальцы с тремя фалангами, большой палец, рукав толстовки
    const skin = phys({ color: 0xc48c74, roughness: 0.62, sheen: 0.6, sheenColor: new T.Color(0xff8c78), sheenRoughness: 0.6, emissive: 0x1c0a06, emissiveIntensity: 0.5 }), sleeve = phys({ color: 0x1d1d27, roughness: 1 });
    const hand = new T.Group(); hand.visible = false;
    const palm = shadow(new T.Mesh(keep(new T.SphereGeometry(1, 12, 8)), skin)); palm.scale.set(0.04, 0.0125, 0.046); hand.add(palm);
    const segGeo = (len, r) => keep(new T.CapsuleGeometry(r, len, 2, 6));
    const fingers = [];
    [[-0.027, 0.034, 0.0085], [-0.009, 0.039, 0.0088], [0.009, 0.036, 0.0085], [0.027, 0.029, 0.0075]].forEach(([x, len, r], i) => {
      const j1 = new T.Group(); j1.position.set(x, 0, -0.04);
      const s1 = shadow(new T.Mesh(segGeo(len * 0.5, r), skin)); s1.rotation.x = Math.PI / 2; s1.position.z = -len * 0.35; j1.add(s1);
      const j2 = new T.Group(); j2.position.z = -len * 0.62; const s2 = shadow(new T.Mesh(segGeo(len * 0.4, r * 0.92), skin)); s2.rotation.x = Math.PI / 2; s2.position.z = -len * 0.25; j2.add(s2);
      const j3 = new T.Group(); j3.position.z = -len * 0.5; const s3 = shadow(new T.Mesh(segGeo(len * 0.3, r * 0.84), skin)); s3.rotation.x = Math.PI / 2; s3.position.z = -len * 0.2; j3.add(s3);
      j2.add(j3); j1.add(j2); hand.add(j1); fingers.push([j1, j2, j3, i]);
    });
    const tj1 = new T.Group(); tj1.position.set(-0.034, -0.002, -0.012); tj1.rotation.y = 0.8;
    const ts1 = shadow(new T.Mesh(segGeo(0.026, 0.0095), skin)); ts1.rotation.x = Math.PI / 2; ts1.position.z = -0.02; tj1.add(ts1);
    const tj2 = new T.Group(); tj2.position.z = -0.04; const ts2 = shadow(new T.Mesh(segGeo(0.018, 0.008), skin)); ts2.rotation.x = Math.PI / 2; ts2.position.z = -0.014; tj2.add(ts2); tj1.add(tj2); hand.add(tj1);
    const wrist = shadow(new T.Mesh(segGeo(0.05, 0.022), skin)); wrist.rotation.x = Math.PI / 2; wrist.position.z = 0.07; hand.add(wrist);
    const arm = shadow(new T.Mesh(keep(new T.CylinderGeometry(0.036, 0.048, 0.55, 10)), sleeve)); arm.rotation.x = Math.PI / 2; arm.position.z = 0.4; hand.add(arm);
    const cuff = shadow(new T.Mesh(keep(new T.TorusGeometry(0.037, 0.008, 6, 12)), sleeve)); cuff.position.z = 0.125; hand.add(cuff);
    scene.add(hand);

    // пылинки в луче света от экрана
    const DUST = 50, dp = new Float32Array(DUST * 3), dseed = [];
    for (let i = 0; i < DUST; i++) { dp[i * 3] = (Math.random() - 0.5) * 0.9; dp[i * 3 + 1] = 0.02 + Math.random() * 0.5; dp[i * 3 + 2] = -0.1 + Math.random() * 0.7; dseed.push(Math.random() * 6.28); }
    const dg = keep(new T.BufferGeometry()); dg.setAttribute("position", new T.BufferAttribute(dp, 3));
    const dotTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 32; const g = c.getContext("2d"), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); return tex(c); })();
    const dust = new T.Points(dg, keep(new T.PointsMaterial({ color: 0xcfe0ff, size: 0.006, map: dotTex, transparent: true, opacity: 0.5, depthWrite: false, blending: T.AdditiveBlending }))); scene.add(dust);

    // траектории (метры)
    scene.updateMatrixWorld(true);
    const T0 = screen.getWorldPosition(new T.Vector3()), nrm = new T.Vector3(0, 0, 1).applyQuaternion(screen.getWorldQuaternion(new T.Quaternion())), C0 = T0.clone().addScaledVector(nrm, 0.19), C1 = new T.Vector3(0.02, 0.4, 0.55), T1 = new T.Vector3(0.02, 0.07, 0.0);
    const H0 = new T.Vector3(0.52, 0.12, 0.62), H1 = new T.Vector3(0.235, 0.075, 0.27), H2 = new T.Vector3(0.1, 0.27, 0.42);
    const cp = new T.Vector3(), tg = new T.Vector3(), hp = new T.Vector3(), fwd = new T.Vector3(), tmp = new T.Vector3(), tmp2 = new T.Vector3();
    function resize() { const w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight); renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w / h < 1 ? 70 : 50; camera.updateProjectionMatrix(); }
    resize();

    function frame(ms) {
      const pull = ease(clamp((ms - 350) / 1150)), s = ms / 1000;
      cp.lerpVectors(C0, C1, pull); tg.lerpVectors(T0, T1, pull);
      cp.x += Math.sin(s * 1.3) * 0.0013 * pull + Math.sin(s * 7.1) * 0.0004; cp.y += Math.sin(s * 1.7) * 0.0015 * pull + Math.sin(s * 0.7) * 0.001 * pull;
      camera.position.copy(cp); camera.lookAt(tg); camera.rotateZ(Math.sin(s * 0.9) * 0.004 * pull); camera.updateMatrixWorld(true);
      const reach = ease(clamp((ms - 1500) / 450)), lift = ease(clamp((ms - 2000) / 550)), grip = ease(clamp((ms - 1850) / 220));
      camera.getWorldDirection(fwd);
      hand.visible = ms >= 1500 && lift < 0.93;
      if (hand.visible) {
        if (lift <= 0) hp.lerpVectors(H0, H1, reach);
        else if (lift < 0.6) hp.lerpVectors(H1, H2, lift / 0.6);
        else { tmp.copy(camera.position).addScaledVector(fwd, 0.12).add(tmp2.set(0.012, -0.04, 0)); hp.lerpVectors(H2, tmp, (lift - 0.6) / 0.4); }
        hand.position.copy(hp); hand.rotation.set(0.08 + lift * 0.95, 0.55 - lift * 0.45, -0.1 + reach * 0.1 * (1 - lift));
        const open = 0.18 * (1 - reach) + 0.1;
        fingers.forEach(([a, b, c, i]) => { const cu = (i === 0 ? 0.55 : 0.9) * grip + open * 0.3; a.rotation.x = -cu * 0.85; b.rotation.x = -cu * 1.0; c.rotation.x = -cu * 0.7; });
        tj1.rotation.x = -0.25 * grip; tj1.rotation.y = 0.8 - 0.3 * grip; tj2.rotation.x = -0.5 * grip;
      }
      if (ms < 1900) { glasses.position.set(0.24, 0.0125, 0.2); glasses.quaternion.copy(lying); }
      else {
        const e = ease(clamp((ms - 1900) / 650));
        if (lift <= 0) glasses.position.set(hp.x + 0.004, 0.0125 + grip * 0.035, hp.z + 0.02);
        else { tmp.copy(camera.position).addScaledVector(fwd, 0.15); tmp2.copy(hp).add(new T.Vector3(0.004, -0.03, 0.02)); glasses.position.lerpVectors(tmp2, tmp, ease(clamp((lift - 0.35) / 0.65))); }
        aim.copy(camera.quaternion).multiply(qFlip); glasses.quaternion.copy(lying).slerp(aim, e);
      }
      const unfold = ease(clamp((lift - 0.25) / 0.45)); temples.forEach(([piv, sd]) => { piv.rotation.y = sd * (Math.PI / 2) * (1 - unfold); });
      const pa = dg.attributes.position; for (let i = 0; i < DUST; i++) { pa.setY(i, pa.getY(i) + Math.sin(s * 0.6 + dseed[i]) * 0.00012); pa.setX(i, pa.getX(i) + Math.cos(s * 0.4 + dseed[i]) * 0.00012); } pa.needsUpdate = true;
      light.intensity = 1.0;
      renderer.render(scene, camera);
    }
    return { frame, resize, dispose() { own.forEach((o) => o.dispose && o.dispose()); renderer.dispose(); } };
  }
  // заранее собранная сцена: готовится при наведении/фокусе на «Игра»; если подготовка слишком дорогая — включаем плоскую версию
  function prepare() {
    if (ready || !api.supported()) return;
    const cv = document.createElement("canvas"); cv.className = "intro__gl"; cv.style.cssText = "position:fixed;inset:0;width:100%;height:100%;visibility:hidden;pointer-events:none;z-index:-1";
    document.body.appendChild(cv);
    const t0 = performance.now(); let g = null;
    try { g = create(cv); [1700, 2400, 0].forEach((ms) => g.frame(ms)); } catch (e) { if (g) g.dispose(); cv.remove(); disabled = true; return; }
    if (performance.now() - t0 > api.maxCost) { g.dispose(); cv.remove(); disabled = true; return; }
    const r = ready = { cv, g };
    setTimeout(() => { if (ready === r) { ready = null; g.dispose(); cv.remove(); } }, 45000);
  }
  function take() { const r = ready; ready = null; if (r) { r.cv.style.cssText = ""; r.cv.remove(); } return r; }
  const api = { supported, create, prepare, take, maxCost: 3500 };
  root.FopkaIntro3D = api;
})(window);
