(function (root) {
  "use strict";
  function webglOk() {
    try { const c = document.createElement("canvas"); return !!(root.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl"))); } catch (e) { return false; }
  }
  function create(canvas) {
    const T = root.THREE;
    const renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    let pr = Math.min(root.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(pr);
    renderer.setClearColor(0x0b0b1a, 1);
    const scene = new T.Scene();
    scene.fog = new T.Fog(0x0b0b1a, 20, 42);
    const camera = new T.PerspectiveCamera(55, 1, 0.1, 80);
    camera.position.set(0, 13, 9); camera.lookAt(0, 0, -4);
    scene.add(new T.HemisphereLight(0xbfd8ff, 0x20204a, 0.95));
    const sun = new T.DirectionalLight(0xffffff, 0.8); sun.position.set(4, 10, 6); scene.add(sun);

    const updaters = new Set();
    const stats = { fps: 60, pixelRatio: pr };
    let raf = 0, last = 0, running = false, slowFrames = 0, ema = 1 / 60;

    function resize() {
      const w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight);
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.fov = camera.aspect < 0.8 ? 72 : 55; camera.updateProjectionMatrix();
    }
    function frame(now) {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      const raw = (now - last) / 1000; last = now;
      const dt = Math.min(0.05, raw > 0 ? raw : 0.016);          // защита от огромного dt после скрытой вкладки
      ema += (Math.min(raw, 0.2) - ema) * 0.05; stats.fps = Math.round(1 / ema);
      if (ema > 1 / 40) { if (++slowFrames > 90 && pr > 1) { pr = Math.max(1, pr - 0.5); renderer.setPixelRatio(pr); stats.pixelRatio = pr; resize(); slowFrames = 0; } } else slowFrames = 0;
      updaters.forEach((fn) => fn(dt));
      renderer.render(scene, camera);
    }
    const onResize = () => resize();
    root.addEventListener("resize", onResize);
    const api = { onLost: null, onRestored: null };
    const onLost = (e) => { e.preventDefault(); running = false; cancelAnimationFrame(raf); if (api.onLost) api.onLost(); };
    const onRestored = () => { resize(); if (api.onRestored) api.onRestored(); };
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);
    resize();
    return Object.assign(api, {
      THREE: T, scene, camera, renderer, stats, resize,
      add(fn) { updaters.add(fn); return () => updaters.delete(fn); },
      start() { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); },
      stop() { running = false; cancelAnimationFrame(raf); },
      dispose() {
        running = false; cancelAnimationFrame(raf); root.removeEventListener("resize", onResize); updaters.clear();
        canvas.removeEventListener("webglcontextlost", onLost); canvas.removeEventListener("webglcontextrestored", onRestored);
        scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach((m) => m.dispose()); });
        renderer.dispose();
      }
    });
  }
  root.NyanEngine = { webglOk, create };
})(window);
