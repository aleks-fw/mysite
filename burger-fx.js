/* Анимация открытия бургера: логотип «лагает», буква «y» течёт синей пиксельной плазмой,
   струя касается картинки, заливает её сверху вниз и стекает за нижнюю кромку.
   Всё рисуется на одном canvas и считается по времени (без накопления состояния). Только мобильная панель. */
(function () {
  const top = document.querySelector(".top");
  const panel = document.getElementById("topMenu");
  const art = top && top.querySelector(".top__art");
  const logo = top && top.querySelector(".logo");
  const letter = top && top.querySelector(".logo__y");
  if (!top || !panel || !art || !logo || !letter) return;

  const S = 3;              // размер «пикселя» плазмы, CSS px
  const GLITCH = 620;       // мс «лага» логотипа до начала течи
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  let cv = null, raf = 0, timer = 0, running = false;
  let onTheme = null;
  new MutationObserver(() => { if (onTheme) onTheme(); }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  const hash = (x, y, z) => { const v = Math.sin(x * 127.1 + y * 311.7 + (z || 0) * 74.7 + seed) * 43758.5453; return v - Math.floor(v); };
  let seed = 0;

  function stop() {
    running = false;
    clearTimeout(timer); cancelAnimationFrame(raf);
    onTheme = null;
    logo.classList.remove("is-glitch"); letter.classList.remove("is-melt"); top.classList.remove("is-fx", "is-revealing");
    if (cv) { cv.remove(); cv = null; }
  }

  function start() {
    if (running || reduce.matches || getComputedStyle(art).display === "none") return;
    running = true;
    seed = Math.random() * 100;

    // геометрия считается до глитча, пока логотип не сдвинут; offset* не зависят от transform
    const tr = top.getBoundingClientRect(), lr = letter.getBoundingClientRect();
    const sx = lr.left + lr.width / 2 - tr.left, sy = lr.top + lr.height * 0.7 - tr.top;
    const ax0 = panel.offsetLeft + art.offsetLeft, ay0 = panel.offsetTop + art.offsetTop;
    const ax1 = ax0 + art.offsetWidth, ay1 = ay0 + art.offsetHeight;
    const W = top.clientWidth, H = panel.offsetTop + panel.offsetHeight - 4;
    if (ax1 - ax0 < 30) { running = false; return; }

    top.classList.add("is-fx");                          // картинка скрыта, пока идёт анимация
    logo.classList.add("is-glitch");
    timer = setTimeout(() => { logo.classList.remove("is-glitch"); run(); }, GLITCH);

    function run() {
      if (!running) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      cv = document.createElement("canvas");
      cv.className = "top__fx"; cv.setAttribute("aria-hidden", "true");
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      cv.style.width = W + "px"; cv.style.height = H + "px";
      top.appendChild(cv);
      const ctx = cv.getContext("2d");
      const D = S * dpr;
      const cell = (cx, cy, col) => {
        const x = Math.round(cx * D), y = Math.round(cy * D);
        ctx.fillStyle = col;
        ctx.fillRect(x, y, Math.round((cx + 1) * D) - x, Math.round((cy + 1) * D) - y);
      };
      // цвета плазмы = цвета картинки текущей темы (CSS-переменные --fx-*)
      const cs = getComputedStyle(document.documentElement);
      const fx = (name) => cs.getPropertyValue(name).trim();
      let TONES;
      const readTones = () => { TONES = [fx("--fx-dark"), fx("--fx-main"), fx("--fx-main"), fx("--fx-light")]; };
      readTones();
      onTheme = readTones;                                // смена темы посреди анимации перекрашивает плазму
      const tone = (n) => TONES[n < 0.06 ? 3 : n < 0.42 ? 2 : n < 0.78 ? 1 : 0];

      // время (с) от начала течи
      const SPEED = 340;                                  // скорость головы струи, px/с
      const ix = Math.min(ax1 - 14, Math.max(ax0 + 14, sx)), iy = ay0;
      const tI = Math.max(0.25, (iy - sy) / SPEED);       // касание картинки
      const tOff = tI + 1.3;                              // источник «закрывается»
      const tD = tI + 1.9;                                // плазма начинает растворяться
      const tEnd = tD + 1.9;

      // клетки заливки картинки (с каймой в 1 клетку вокруг)
      const PAD = 6;
      const c0 = Math.floor((ax0 - PAD) / S) - 2, c1 = Math.ceil((ax1 + PAD) / S) + 2;
      const r0 = Math.floor((ay0 - PAD) / S) - 2, r1 = Math.ceil((ay1 + PAD) / S) + 2;
      const cols = c1 - c0, rows = r1 - r0;
      const arr = new Float32Array(cols * rows), rem = new Float32Array(cols * rows), on = new Uint8Array(cols * rows);
      const arrival = (px, py, cx) => {
        const dx = px - ix, dy = Math.max(0, py - iy) * 0.6;
        return tI + Math.hypot(dx, dy) / 150 + hash(cx >> 1, 3) * 0.28;
      };
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cx = c0 + c, cy = r0 + r, px = (cx + 0.5) * S, py = (cy + 0.5) * S, i = r * cols + c;
          // картинки под плазмой не видно, поэтому края пятна рваные, без чёткой рамки
          const e = Math.min(px - (ax0 - PAD), ax1 + PAD - px, py - (ay0 - PAD), ay1 + PAD - py);
          if (e + (hash(cx, cy, 9) - 0.5) * 16 <= 0) continue;
          if (hash(cx, cy, 5) < 0.06) continue;
          on[i] = 1;
          arr[i] = arrival(px, py, cx) + hash(cx, cy, 2) * 0.05;
          rem[i] = tD + (arr[i] - tI) * 0.8 + hash(cx, cy, 6) * 0.4;
        }
      }
      // капли с нижней кромки
      const drips = [];
      for (let cx = c0; cx < c1 - 1; cx += 2) {
        if (hash(cx, 11) > 0.55) continue;
        const a = arrival((cx + 1) * S, ay1, cx) + 0.1;
        drips.push({ cx, w: hash(cx, 13) > 0.85 ? 3 : 2, len: 14 + hash(cx, 12) * 80, v: 55 + hash(cx, 14) * 45, a, d: tD + (a - tI) * 0.8 });
      }
      // брызги при касании
      const sparks = [];
      for (let k = 0; k < 20; k++) sparks.push({ x: ix + (hash(k, 21) - 0.5) * 10, vx: (hash(k, 22) - 0.5) * 240, vy: -(110 + hash(k, 23) * 170), life: 0.35 + hash(k, 24) * 0.35 });

      letter.classList.add("is-melt");
      let revealed = false;
      const t0 = performance.now();
      let lastHash = 0;

      const frame = (now) => {
        if (!running) return;
        const t = (now - t0) / 1000;
        if (t > tEnd) { stop(); return; }
        ctx.clearRect(0, 0, cv.width, cv.height);
        if (t > tOff + 0.2) letter.classList.remove("is-melt");
        if (!revealed && t > tD + 0.2) { revealed = true; top.classList.add("is-revealing"); top.classList.remove("is-fx"); }   // арт проявляется, пока плазма тает
        const tick = Math.floor(t * 9);                   // «шаги» мерцания плазмы
        if (tick !== lastHash) lastHash = tick;

        // струя от буквы до картинки
        const yHead = Math.min(iy, sy + SPEED * t);
        const yTop = t > tOff ? sy + 380 * (t - tOff) : sy;
        if (yTop < yHead) {
          const rA = Math.floor(yTop / S), rB = Math.floor(yHead / S);
          for (let r = rA; r <= rB; r++) {
            const nearHead = yHead < iy ? rB - r : 9;
            let w = 3 + (hash(r >> 1, 7) > 0.7 ? 1 : 0);
            if (nearHead < 3) w = Math.max(1, w - (2 - nearHead));
            const wob = Math.round(Math.sin(r * 0.35 + t * 7) * 1.2);
            const cx0 = Math.floor(sx / S) - (w >> 1) + wob;
            for (let k = 0; k < w; k++) cell(cx0 + k, r, tone(hash(cx0 + k, r, tick)));
          }
        }
        // брызги
        const ts = t - tI;
        if (ts > 0) {
          for (const p of sparks) {
            if (ts > p.life) continue;
            const x = p.x + p.vx * ts, y = iy + p.vy * ts + 520 * ts * ts;
            cell(Math.floor(x / S), Math.floor(y / S), tone(hash(Math.floor(x), Math.floor(y), 1)));
          }
        }
        // заливка картинки
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const i = r * cols + c;
            if (!on[i] || t < arr[i] || t >= rem[i]) continue;
            const cx = c0 + c, cy = r0 + r;
            if (rem[i] - t < 0.35 && hash(cx, cy, tick + 40) < 0.5) continue;   // перед исчезновением рябит
            const fresh = t - arr[i] < 0.09;
            const blot = hash(cx >> 2, cy >> 2, Math.floor(t * 3));   // неровные пятна, медленно меняются
            cell(cx, cy, fresh ? TONES[1] : tone(0.7 * blot + 0.3 * hash(cx, cy, tick)));
          }
        }
        // капли ниже картинки
        for (const d of drips) {
          if (t < d.a) continue;
          const yH = ay1 - 2 + Math.min(d.len, d.v * (t - d.a));
          const yT = ay1 - 2 + Math.max(0, (t - d.d) * 140);
          const rA = Math.floor(yT / S), rB = Math.floor(yH / S), growing = d.v * (t - d.a) < d.len;
          for (let r = rA; r <= rB; r++) {
            if ((r + 1) * S > H) break;
            const bulb = growing && rB - r < 2;
            for (let k = bulb ? -1 : 0; k < d.w + (bulb ? 1 : 0); k++) cell(d.cx + k, r, tone(hash(d.cx + k, r, tick)));
          }
        }
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    }
  }

  const IDLE = 2 * 60 * 1000;                            // пауза, после которой анимация играет снова
  let lastAct = 0;                                        // время последнего открытия/закрытия меню
  let wasOpen = false;                                    // реагируем только на смену «открыто/закрыто», а не на is-fx
  new MutationObserver(() => {
    const open = top.classList.contains("is-open");
    if (open === wasOpen) return;
    wasOpen = open;
    const now = Date.now();
    // анимация только при первом открытии и после паузы без кликов по бургеру
    if (open && (lastAct === 0 || now - lastAct >= IDLE)) start(); else if (!open) stop();
    lastAct = now;
  })
    .observe(top, { attributes: true, attributeFilter: ["class"] });
})();
