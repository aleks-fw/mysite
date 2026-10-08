(function (root) {
  "use strict";
  // музыка и звуки игры: всё синтезируется кодом (Web Audio), файлов нет. Свой AudioContext, не мешает плееру сайта.
  const MINOR = [0, 2, 3, 5, 7, 8, 10], BPM = 124, ROOT = 57, PROG = [0, 5, 2, 6], BARS = 8, STEPS = BARS * 16, SD = 60 / BPM / 4;
  let ctx = null, master, musicGain, sfxGain, noiseBuf, timer = null, step = 0, nextT = 0, level = -1, running = false, lead = null;
  let muted = false; try { muted = localStorage.getItem("fopka-game-sound") === "off"; } catch (e) {}
  const last = {};
  const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const chordOf = (deg) => { const n = (i) => MINOR[i % 7] + 12 * Math.floor(i / 7); return [n(deg), n(deg + 2), n(deg + 4)]; };
  function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  function composeLead() {
    const rand = rng(21), scale = []; for (let o = 0; o < 2; o++) MINOR.forEach((d) => scale.push(d + 12 * o));
    const out = new Array(STEPS).fill(null); let pos = 7;
    for (let bar = 0; bar < BARS; bar++) {
      const pcs = chordOf(PROG[(bar >> 1) % 4]).map((x) => x % 12);
      for (let s = 0; s < 16; s++) {
        const strong = s % 4 === 0, chance = strong ? 0.85 : s % 2 === 0 ? 0.5 : 0.1;
        if (rand() > chance) continue;
        let d = Math.round((rand() - 0.5) * 4); if (d === 0) d = rand() < 0.5 ? -1 : 1;
        pos = Math.max(0, Math.min(scale.length - 1, pos + d));
        if (strong) { let best = pos, bd = 99; scale.forEach((v, k) => { if (pcs.includes(v % 12) && Math.abs(k - pos) < bd) { bd = Math.abs(k - pos); best = k; } }); pos = best; }
        out[bar * 16 + s] = { n: ROOT + 12 + scale[pos], len: s % 2 === 0 ? 2 : 1 };
      }
    }
    return out;
  }

  function init() {
    ctx = new (root.AudioContext || root.webkitAudioContext)();
    const comp = ctx.createDynamicsCompressor(); master = ctx.createGain(); master.gain.value = muted ? 0 : 1;
    musicGain = ctx.createGain(); musicGain.gain.value = 0.55; sfxGain = ctx.createGain(); sfxGain.gain.value = 0.8;
    musicGain.connect(master); sfxGain.connect(master); master.connect(comp); comp.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    lead = composeLead();
  }
  function tone(type, f, t, dur, vol, dest, attack, f2) {
    const o = ctx.createOscillator(), g = ctx.createGain(), a = attack || 0.006;
    o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || musicGain); o.start(t); o.stop(t + dur + 0.03);
  }
  function noise(t, dur, vol, type, f, dest) {
    const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; fl.type = type; fl.frequency.value = f; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(dest || musicGain); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }
  function kick(t, v) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2); o.connect(g); g.connect(musicGain); o.start(t); o.stop(t + 0.22); }

  // уровни: -1 лобби (пэд и мягкий бас), 0 бас+бочка, 1 +хэт, 2 +снейр и арпеджио, 3 +мелодия, 4 босс (злее и плотнее)
  function playStep(i, t) {
    const bar = i >> 4, s = i % 16, chord = chordOf(PROG[(bar >> 1) % 4]);
    if (s === 0 && bar % 2 === 0) chord.forEach((n) => tone("triangle", midi(ROOT + n), t, SD * 31, 0.045, musicGain, 0.5));
    if (level < 0) { if (s % 8 === 0) tone("triangle", midi(ROOT - 24 + chord[0]), t, SD * 6, 0.2); if (s % 4 === 2) tone("sine", midi(ROOT + 12 + chord[(s >> 2) % 3]), t, SD * 3, 0.03); return; }
    if (s % 2 === 0) tone("sawtooth", midi(ROOT - 24 + chord[0] + (s % 8 === 6 ? 12 : 0)), t, SD * 1.8, 0.11);
    if (s % 4 === 0) kick(t, 0.55);
    if (level >= 1 && (s % 4 === 2 || level >= 4)) noise(t, 0.04, level >= 4 && s % 2 ? 0.05 : 0.08, "highpass", 7000);
    if (level >= 2 && (s === 4 || s === 12)) noise(t, 0.13, 0.2, "bandpass", 1800);
    if (level >= 2) tone("square", midi(ROOT + 12 + [chord[0], chord[1], chord[2], chord[1]][s % 4] + (level >= 3 ? 12 : 0)), t, SD * 0.9, 0.022);
    const L = lead[i]; if (level >= 3 && L) tone(level >= 4 ? "sawtooth" : "square", midi(L.n), t, SD * L.len * 0.95, level >= 4 ? 0.06 : 0.055);
  }
  function schedule() {
    const now = ctx.currentTime; if (nextT < now - 0.2) nextT = now + 0.05; // после долгой паузы не проигрываем накопленное разом
    while (nextT < now + 0.15) { playStep(step % STEPS, nextT); nextT += SD; step++; }
  }

  const SFX = {
    shoot: (t) => tone("square", 880, t, 0.06, 0.05, sfxGain, 0.002, 440),
    hit: (t) => noise(t, 0.05, 0.12, "highpass", 3000, sfxGain),
    boom: (t) => { noise(t, 0.28, 0.4, "lowpass", 900, sfxGain); tone("sawtooth", 160, t, 0.25, 0.2, sfxGain, 0.003, 40); },
    pickup: (t) => [0, 4, 7, 12].forEach((n, i) => tone("square", midi(72 + n), t + i * 0.055, 0.12, 0.08, sfxGain)),
    hurt: (t) => { tone("sawtooth", 220, t, 0.35, 0.25, sfxGain, 0.003, 55); noise(t, 0.25, 0.25, "lowpass", 700, sfxGain); },
    bomb: (t) => { noise(t, 0.9, 0.6, "lowpass", 1200, sfxGain); tone("sawtooth", 120, t, 0.8, 0.35, sfxGain, 0.003, 25); },
    wave: (t) => [0, 7, 12].forEach((n, i) => tone("triangle", midi(64 + n), t + i * 0.09, 0.3, 0.12, sfxGain)),
    over: (t) => [0, -3, -7, -12].forEach((n, i) => tone("triangle", midi(67 + n), t + i * 0.16, 0.4, 0.14, sfxGain)),
    buy: (t) => [0, 12].forEach((n, i) => tone("square", midi(76 + n), t + i * 0.07, 0.1, 0.07, sfxGain)),
    rocket: (t) => { noise(t, 0.55, 0.3, "bandpass", 1400, sfxGain); tone("sawtooth", 90, t, 0.5, 0.18, sfxGain, 0.01, 420); },
    rboom: (t) => { noise(t, 0.7, 0.55, "lowpass", 1000, sfxGain); tone("sawtooth", 140, t, 0.6, 0.3, sfxGain, 0.003, 30); },
    ready: (t) => [0, 7].forEach((n, i) => tone("triangle", midi(79 + n), t + i * 0.08, 0.12, 0.08, sfxGain)),
    warp: (t) => { noise(t, 1.8, 0.32, "bandpass", 500, sfxGain); tone("sawtooth", 70, t, 1.8, 0.14, sfxGain, 0.5, 1100); },
    count: (t) => tone("square", 520, t, 0.1, 0.07, sfxGain, 0.003),
    go: (t) => tone("square", 780, t, 0.25, 0.09, sfxGain, 0.003),
    coin: (t) => tone("square", 1320, t, 0.07, 0.05, sfxGain, 0.002, 1760),
    click: (t) => tone("square", 660, t, 0.04, 0.05, sfxGain, 0.002)
  };
  const MIN_GAP = { shoot: 0.09, hit: 0.04, boom: 0.05, coin: 0.05 };
  // если браузер не дал запустить звук без жеста, ждём первого касания или клавиши (один обработчик на все входы)
  let unlock = null;
  function unbindUnlock() { if (!unlock) return; ["pointerdown", "keydown"].forEach((n) => root.removeEventListener(n, unlock, true)); unlock = null; }
  function bindUnlock() { if (unlock) return; unlock = () => { ctx.resume(); unbindUnlock(); }; ["pointerdown", "keydown"].forEach((n) => root.addEventListener(n, unlock, true)); }
  const api = {
    get muted() { return muted; },
    start() {
      if (!ctx) init();
      if (ctx.state === "suspended") { ctx.resume(); if (ctx.state === "suspended") bindUnlock(); }
      if (!running) { running = true; step = 0; nextT = ctx.currentTime + 0.08; timer = setInterval(schedule, 25); }
    },
    stop() { unbindUnlock(); running = false; clearInterval(timer); timer = null; if (ctx && ctx.state === "running") ctx.suspend(); },
    setLevel(n) { level = n; },
    pause(on) { if (ctx) musicGain.gain.setTargetAtTime(on ? 0.12 : 0.55, ctx.currentTime, 0.05); },
    sfx(name) {
      if (!ctx || muted || ctx.state !== "running") return;
      const now = ctx.currentTime, gap = MIN_GAP[name] || 0;
      if (last[name] && now - last[name] < gap) return;
      last[name] = now; SFX[name](now + 0.005);
    },
    toggleMute() { muted = !muted; try { localStorage.setItem("fopka-game-sound", muted ? "off" : "on"); } catch (e) {} if (ctx) master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.03); return muted; },
    _state() { return { ctx: ctx ? ctx.state : "none", running, level, muted }; }
  };
  root.FopkaAudio = api;
})(window);
