(function (root) {
  "use strict";
  const t = (s) => (root.tr ? root.tr(s) : s);
  const reduce = () => root.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const STEPS = [[0, "is-screen"], [350, "is-pull"], [1500, "is-grab"], [2500, "is-worn"], [2800, "is-blink"], [3050, "is-open"]];
  const api = { active: false, play, skip };
  let el = null, timers = [], done = null, routed = false, gl = null, raf = 0;

  function build() {
    const o = document.createElement("div"); o.id = "intro"; o.className = "intro"; o.setAttribute("role", "dialog"); o.setAttribute("aria-label", t("Идёт вход в игру"));
    o.innerHTML =
      '<div class="intro__room"><svg class="intro__props" viewBox="0 0 160 90" preserveAspectRatio="xMidYMax slice" shape-rendering="crispEdges" aria-hidden="true">' +
        '<rect class="sofa" x="0" y="38" width="36" height="30"/><rect class="sofa" x="0" y="52" width="46" height="16"/>' +                       // диван: тёмный силуэт слева
        '<rect class="desk" x="0" y="64" width="160" height="26"/><rect class="deskedge" x="0" y="64" width="160" height="2"/>' +                     // стол и его кромка
        '<rect class="base" x="44" y="62" width="72" height="3"/>' +                                                                                // основание ноутбука
        '<rect class="mouse" x="126" y="68" width="7" height="10"/><rect class="mouse2" x="129" y="68" width="1" height="4"/>' +                      // мышь
        '<g class="deskglasses"><rect x="136" y="70" width="6" height="3"/><rect x="144" y="70" width="6" height="3"/><rect x="142" y="71" width="2" height="1"/></g></svg></div>' + // очки на столе
      '<div class="intro__screen"><div class="intro__page"><div class="intro__bar"><b>nyan<i></i>fm</b><span></span><span></span><span></span></div>' +
        '<div class="intro__hero">я <mark>ПРОГРАММИСТ</mark>,<br>пишу САЙТЫ</div></div></div>' +
      '<svg class="intro__grab" viewBox="0 0 40 30" shape-rendering="crispEdges" aria-hidden="true"><rect class="hand" x="14" y="14" width="14" height="16"/><rect class="hand" x="10" y="16" width="5" height="8"/>' +
        '<g class="gl"><rect x="4" y="8" width="13" height="8" fill="none"/><rect x="23" y="8" width="13" height="8" fill="none"/><rect x="17" y="10" width="6" height="2"/></g></svg>' +
      '<div class="intro__frame" aria-hidden="true"><svg viewBox="0 0 160 90" preserveAspectRatio="none"><path class="dim" fill-rule="evenodd" d="M0 0H160V90H0Z M24 20H52A18 18 0 0 1 70 38V54A18 18 0 0 1 52 72H24A18 18 0 0 1 6 54V38A18 18 0 0 1 24 20Z M108 20H136A18 18 0 0 1 154 38V54A18 18 0 0 1 136 72H108A18 18 0 0 1 90 54V38A18 18 0 0 1 108 20Z"/><path class="rim" d="M24 20H52A18 18 0 0 1 70 38V54A18 18 0 0 1 52 72H24A18 18 0 0 1 6 54V38A18 18 0 0 1 24 20Z"/><path class="rim" d="M108 20H136A18 18 0 0 1 154 38V54A18 18 0 0 1 136 72H108A18 18 0 0 1 90 54V38A18 18 0 0 1 108 20Z"/><path class="bridge" d="M70 40Q80 33 90 40"/></svg></div>' +
      '<div class="intro__lid intro__lid--t"></div><div class="intro__lid intro__lid--b"></div>' +
      '<button type="button" class="intro__skip">' + t("Пропустить") + '</button>';
    return o;
  }
  function stop3d() { cancelAnimationFrame(raf); if (gl) { gl.dispose(); gl = null; } }
  function finish(goHash) {
    timers.forEach(clearTimeout); timers = [];
    if (!el) return;
    if (goHash && !routed) { routed = true; location.hash = "#/game"; }
    stop3d();
    const gone = el; el = null; gone.classList.add("is-open", "is-out");
    root.removeEventListener("keydown", onKey, true); root.removeEventListener("hashchange", onHash);
    setTimeout(() => { gone.remove(); api.active = false; const d = done; done = null; d && d(); }, reduce() ? 0 : 300);
  }
  function skip() { finish(true); }
  const onKey = (e) => { if (el) { e.preventDefault(); e.stopPropagation(); skip(); } };
  const onHash = () => { if (el && location.hash !== "#/game") { routed = true; finish(false); } };

  function play() {
    if (api.active) return Promise.resolve();
    api.active = true; routed = false;
    return new Promise((resolve) => {
      done = resolve; el = build(); document.body.appendChild(el);
      const F = root.NyanIntro3D;
      if (!reduce() && F && F.supported()) {
        try {
          let r = F.take(); if (!r) { F.prepare(); r = F.take(); }
          if (r) {
            el.insertBefore(r.cv, el.firstChild); el.classList.add("has-gl"); api.used3d = true; gl = r.g; gl.resize(); const t0 = performance.now();
            const loop = () => { if (!gl) return; gl.frame(performance.now() - t0); raf = requestAnimationFrame(loop); }; loop();
          }
        } catch (e) { stop3d(); if (el) el.classList.remove("has-gl"); }
      }
      el.addEventListener("click", skip); root.addEventListener("keydown", onKey, true); root.addEventListener("hashchange", onHash);
      if (reduce()) { el.classList.add("is-reduced"); timers.push(setTimeout(() => finish(true), 250)); return; }
      STEPS.forEach(([ms, cls]) => timers.push(setTimeout(() => { if (el) { el.classList.add(cls); if (cls === "is-open") stop3d(); } }, ms)));
      timers.push(setTimeout(() => { if (el && !routed) { routed = true; location.hash = "#/game"; } }, 2950));
      timers.push(setTimeout(() => finish(true), 3400));
    });
  }
  // готовим 3D-сцену заранее: при наведении, фокусе или касании пункта «Игра»
  const warm = (e) => { const F = root.NyanIntro3D; if (F && !reduce() && e.target.closest && e.target.closest("#gameLink") && F.supported()) setTimeout(F.prepare, 0); };
  ["pointerover", "focusin", "touchstart"].forEach((n) => document.addEventListener(n, warm, { passive: true }));
  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest("#gameLink"); if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey) return;
    if (location.hash === "#/game") return; e.preventDefault(); play();
  });
  root.NyanIntro = api;
})(window);
