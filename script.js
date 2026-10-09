"use strict";

/* =====================================================
   МУЗЫКА: треки сочиняются прямо в браузере (Web Audio).
   Никаких файлов, всё синтезируется кодом.
   ===================================================== */
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const TRACKS = NyanTracks.TRACKS;
const BARS = 16;
const STEPS = BARS * 16;

function rng(seed) { // mulberry32
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

// аккорд из ступени минора: тоника, терция, квинта (в полутонах от root)
function chordOf(deg) {
  const n = (i) => MINOR[i % 7] + 12 * Math.floor(i / 7);
  return [n(deg), n(deg + 2), n(deg + 4)];
}

// мелодия на 16 тактов: случайное блуждание по гамме, на сильных долях тянется к аккорду
function composeLead(tr) {
  const rand = rng(tr.seed);
  const scale = [];
  for (let o = 0; o < 2; o++) MINOR.forEach((d) => scale.push(d + 12 * o));
  const lead = new Array(STEPS).fill(null);
  let pos = 7;
  for (let bar = 0; bar < BARS; bar++) {
    const chord = chordOf(tr.prog[bar % 4]).map((x) => x % 12);
    for (let s = 0; s < 16; s++) {
      const i = bar * 16 + s;
      const strong = s % 4 === 0;
      const chance = strong ? 0.9 : s % 2 === 0 ? 0.55 : 0.12;
      if (bar === BARS - 1 && s > 0) break;
      if (rand() > chance && !(bar === 0 && s === 0)) continue;
      let step = Math.round((rand() - 0.5) * 4);
      if (step === 0) step = rand() < 0.5 ? -1 : 1;
      pos = Math.max(0, Math.min(scale.length - 1, pos + step));
      if (strong) {
        // подтянуть к ближайшему звуку аккорда
        let best = pos, bd = 99;
        scale.forEach((d, k) => {
          if (chord.includes(d % 12) && Math.abs(k - pos) < bd) { bd = Math.abs(k - pos); best = k; }
        });
        pos = best;
      }
      lead[i] = { n: tr.root + 12 + scale[pos], len: s % 2 === 0 ? 2 : 1 };
    }
  }
  lead[(BARS - 1) * 16] = { n: tr.root + 12, len: 8 };
  return lead;
}

let ctx, master, analyser, noiseBuf;
let cur = 0, lead = null;
let stepIdx = 0, nextTime = 0, startTime = 0, timer = null;
let playing = false, everPlayed = false;
let rate = 1; // скорость воспроизведения: темп делится на неё, высота нот не меняется
const RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];
// режим смены треков: repeat (повтор текущего), order (по порядку), random (случайно)
const MODES = ["repeat", "order", "random"];
const MODE_NAMES = { repeat: "Повтор трека", order: "По порядку", random: "Случайно" };
let mode = "repeat";
try { const m = localStorage.getItem("nyan-play-mode"); if (MODES.includes(m)) mode = m; } catch (e) {}

function initAudio() {
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain();
  master.gain.value = 0.55;
  const comp = ctx.createDynamicsCompressor();
  analyser = ctx.createAnalyser();
  analyser.fftSize = 64;
  master.connect(comp); comp.connect(analyser); analyser.connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}

function tone(type, freq, t, dur, vol) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master);
  o.start(t); o.stop(t + dur + 0.03);
}
function kick(t) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
  g.gain.setValueAtTime(0.7, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
  o.connect(g); g.connect(master);
  o.start(t); o.stop(t + 0.25);
}
function noise(t, dur, vol, type, freq) {
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = noiseBuf; f.type = type; f.frequency.value = freq;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f); f.connect(g); g.connect(master);
  src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.02);
}

function playStep(i, t, stepDur) {
  const tr = TRACKS[cur];
  const bar = Math.floor(i / 16), s = i % 16;
  const chord = chordOf(tr.prog[bar % 4]);
  // ударные
  if (s === 0 || s === 8 || (s === 10 && bar % 2)) kick(t);
  if (s === 4 || s === 12) noise(t, 0.13, 0.22, "bandpass", 1800);
  if (s % 2 === 0) noise(t, 0.04, s % 4 === 2 ? 0.1 : 0.05, "highpass", 7000);
  // бас
  if ([0, 3, 6, 8, 11, 14].includes(s)) {
    const note = tr.root - 24 + (s === 6 || s === 14 ? chord[2] : chord[0]);
    tone("triangle", midi(note), t, stepDur * 2.2, 0.32);
  }
  // арпеджио
  const arp = [chord[0], chord[1], chord[2], chord[1]][s % 4];
  tone("square", midi(tr.root + 12 + arp), t, stepDur * 0.9, 0.03);
  // мелодия
  const L = lead[i];
  if (L) tone(tr.lead, midi(L.n), t, stepDur * L.len * 0.95, tr.lead === "sawtooth" ? 0.07 : 0.11);
}

// трек закончился: следующий по порядку или случайный; ноты идут без паузы
function advance() {
  const t = nextTime;
  let n = cur + 1;
  if (mode === "random" && TRACKS.length > 1) { do { n = Math.floor(Math.random() * TRACKS.length); } while (n === cur); }
  loadTrack(n);
  nextTime = t; startTime = t;
}

function schedule() {
  while (nextTime < ctx.currentTime + 0.15) {
    if (stepIdx >= STEPS) { if (mode === "repeat") stepIdx = 0; else advance(); }
    const stepDur = 60 / TRACKS[cur].bpm / 4 / rate;
    playStep(stepIdx % STEPS, nextTime, stepDur);
    nextTime += stepDur;
    stepIdx++;
  }
}

function loopDur() { return STEPS * 60 / TRACKS[cur].bpm / 4 / rate; }
const fmt = (sec) => Math.floor(sec / 60) + ":" + String(Math.floor(sec % 60)).padStart(2, "0");

function loadTrack(n) {
  cur = (n + TRACKS.length) % TRACKS.length;
  lead = composeLead(TRACKS[cur]);
  $("title").textContent = TRACKS[cur].title;
  $("miniTitle").textContent = TRACKS[cur].title;
  $("cover").src = TRACKS[cur].art;
  // сцена на фоне главного и мини-плеера (подобрана по цвету аватарки трека), при смене трека плавно проявляется
  ["playerBg", "miniBg"].forEach((id) => {
    const bg = $(id);
    bg.style.backgroundImage = 'url("img/bg/' + TRACKS[cur].bg + '.png")';
    bg.classList.remove("is-new"); void bg.offsetWidth; bg.classList.add("is-new");
  });
  $("cover").alt = "Аватарка трека " + TRACKS[cur].title;
  $("num").textContent = String(cur + 1).padStart(2, "0") + " / " + String(TRACKS.length).padStart(2, "0");
  $("tTot").textContent = fmt(loopDur());
  $("tCur").textContent = "0:00";
  $("fill").style.width = "0%";
  if (ctx) {
    stepIdx = 0;
    nextTime = ctx.currentTime + 0.08;
    startTime = nextTime;
  }
  window.dispatchEvent(new Event("musicchange"));
}

function setUi(on) {
  playing = on;
  musicOn = on;
  $("state").classList.toggle("is-on", on);
  $("stateText").textContent = on ? "PLAYING" : "PAUSED";
  $("play").innerHTML = on ? "&#10074;&#10074;" : "&#9654;&#xFE0E;";
  $("miniPlay").innerHTML = on ? "&#10074;&#10074;" : "&#9654;&#xFE0E;";
  $("mini").classList.toggle("is-on", on);
  if (on) everPlayed = true;
  updateMini();
  window.dispatchEvent(new Event("musicchange"));
}

async function startPlayback() {
  if (!ctx) {
    initAudio();
    loadTrack(cur);
    timer = setInterval(schedule, 25);
  }
  await ctx.resume();
  setUi(true);
}
async function pausePlayback() {
  await ctx.suspend();
  setUi(false);
}
function toggle() { return playing ? pausePlayback() : startPlayback(); }
function go(n) {
  loadTrack(n);
  if (!playing) startPlayback();
}

// индикатор и эквалайзер
const bars = [...document.querySelectorAll("#eq i")];
const miniBars = [...document.querySelectorAll("#miniEq i")];
const bins = [1, 2, 4, 6, 9];
const freq = new Uint8Array(32);
const tickEls = { fill: $("fill"), tCur: $("tCur"), bar: $("bar"), miniFill: $("miniFill"), miniTime: $("miniTime") };
let lastPct = "", lastCur = "", lastMini = "", lastAria = "", idleSet = false;
function tick() {
  requestAnimationFrame(tick);
  if (document.hidden || !ctx) return;
  const dur = loopDur();
  const el = Math.max(0, ctx.currentTime - startTime) % dur;
  const pct = ((el / dur) * 100).toFixed(1) + "%";
  if (pct !== lastPct) {
    lastPct = pct;
    tickEls.fill.style.width = pct;
    tickEls.miniFill.style.width = pct;
  }
  const cur = fmt(el);
  if (cur !== lastCur) {
    lastCur = cur;
    tickEls.tCur.textContent = cur;
    const mini = cur + " / " + fmt(dur);
    if (mini !== lastMini) { lastMini = mini; tickEls.miniTime.textContent = mini; }
    const aria = String(Math.round((el / dur) * 100));
    if (aria !== lastAria) { lastAria = aria; tickEls.bar.setAttribute("aria-valuenow", aria); }
  }
  if (playing) {
    idleSet = false;
    analyser.getByteFrequencyData(freq);
    for (let k = 0; k < bars.length; k++) bars[k].style.height = Math.max(10, (freq[bins[k]] / 255) * 100) + "%";
    for (let k = 0; k < miniBars.length; k++) miniBars[k].style.height = Math.max(15, (freq[[1, 4, 8][k]] / 255) * 100) + "%";
  } else if (!idleSet) {
    idleSet = true;
    bars.forEach((b) => { b.style.height = "12%"; });
    miniBars.forEach((b) => { b.style.height = "20%"; });
  }
}

// перемотка по тактам: frac от 0 до 1
function seekFrac(frac) {
  if (!ctx) return;
  const bar = Math.floor(Math.min(0.999, Math.max(0, frac)) * BARS);
  stepIdx = bar * 16;
  nextTime = ctx.currentTime + 0.05;
  startTime = nextTime - bar * 16 * 60 / TRACKS[cur].bpm / 4 / rate;
}
$("bar").addEventListener("click", (e) => {
  const r = $("bar").getBoundingClientRect();
  seekFrac((e.clientX - r.left) / r.width);
});

// кнопки режима: значок меняется с пиксельной анимацией
function updateModeUi(animate) {
  document.querySelectorAll("[data-modebtn]").forEach((b) => {
    const name = tr(MODE_NAMES[mode]);
    b.dataset.mode = mode;
    b.setAttribute("aria-label", name);
    b.title = name;
    if (animate) {
      b.classList.remove("is-anim");
      void b.offsetWidth;
      b.classList.add("is-anim");
    }
  });
}
function setMode(m) {
  if (!MODES.includes(m) || m === mode) return;
  mode = m;
  try { localStorage.setItem("nyan-play-mode", mode); } catch (e) {}
  updateModeUi(true);
  window.dispatchEvent(new Event("musicchange"));
}
document.querySelectorAll("[data-modebtn]").forEach((b) => {
  b.addEventListener("click", () => setMode(MODES[(MODES.indexOf(mode) + 1) % MODES.length]));
  b.addEventListener("animationend", () => b.classList.remove("is-anim"));
});
window.addEventListener("langchange", () => updateModeUi(false));
updateModeUi(false);

function setRate(r) {
  if (!RATES.includes(r) || r === rate) return;
  if (ctx) { // позиция в треке не должна прыгать при смене скорости
    const el = Math.max(0, ctx.currentTime - startTime) % loopDur();
    const frac = el / loopDur();
    rate = r;
    startTime = ctx.currentTime - frac * loopDur();
  } else rate = r;
  $("tTot").textContent = fmt(loopDur());
  window.dispatchEvent(new Event("musicchange"));
}

$("play").addEventListener("click", toggle);
$("next").addEventListener("click", () => go(cur + 1));
$("prev").addEventListener("click", () => go(cur - 1));
$("miniPlay").addEventListener("click", toggle);
$("miniNext").addEventListener("click", () => go(cur + 1));
$("miniPrev").addEventListener("click", () => go(cur - 1));
// крестик: закрывает мини-плеер и ставит музыку на паузу
$("miniClose").addEventListener("click", async () => {
  if (playing) await pausePlayback();
  everPlayed = false;
  updateMini();
});

window.NyanMusic = {
  tracks: TRACKS,
  current: () => cur,
  isPlaying: () => playing,
  select: (i) => go(NyanTracks.wrap(i, TRACKS.length)),
  toggle: () => toggle(),
  next: () => go(cur + 1),
  prev: () => go(cur - 1),
  seek: seekFrac,
  progress() {
    const dur = loopDur();
    const pos = ctx ? Math.max(0, ctx.currentTime - startTime) % dur : 0;
    return { pos, dur, frac: pos / dur };
  },
  rate: () => rate,
  mode: () => mode,
  setMode,
  rates: RATES,
  setRate,
  level() {
    if (!ctx || !playing) return 0;
    analyser.getByteFrequencyData(freq);
    return (freq[1] + freq[2] + freq[3]) / 765;
  }
};

loadTrack(0);
requestAnimationFrame(tick);

/* =====================================================
   РАЗДЕЛЫ: весь сайт в одном документе, поэтому музыка не прерывается при переходах
   ===================================================== */
const navLinks = [...document.querySelectorAll(".nav__a")];
const TITLES = { home: "NYAN", portfolio: "Портфолио — NYAN", mcp: "MCP — NYAN", support: "Поддержка — NYAN", game: "Игра — NYAN" };
let view = "home";

const routeFromHash = () => {
  const m = /^#\/(portfolio|mcp|support|game)$/.exec(location.hash);
  return m ? m[1] : "home";
};

// мини-плеер идёт за пользователем по всем разделам, кроме главной (там есть большой плеер)
function updateMini() {
  $("mini").hidden = !(view !== "home" && view !== "game" && everPlayed);
}

function updateNav() {
  const active = view !== "home" ? "#/" + view : "#top";
  navLinks.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === active));
}

// бургер-меню (телефон): открыть/закрыть, закрывается по ссылке, Esc и клику снаружи
(function () {
  const top = document.querySelector(".top"), btn = document.getElementById("burger");
  if (!top || !btn) return;
  const set = (on) => { top.classList.toggle("is-open", on); btn.setAttribute("aria-expanded", String(on)); };
  btn.addEventListener("click", () => set(!top.classList.contains("is-open")));
  document.getElementById("topMenu").addEventListener("click", (e) => { if (e.target.closest(".nav__a")) set(false); });
  document.addEventListener("click", (e) => { if (top.classList.contains("is-open") && !top.contains(e.target)) set(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && top.classList.contains("is-open")) { set(false); btn.focus(); } });
  window.addEventListener("hashchange", () => set(false));
  window.matchMedia("(min-width: 801px)").addEventListener("change", () => set(false));
})();

function applyRoute(initial) {
  const v = routeFromHash();
  const changed = v !== view || initial;
  view = v;
  if (v === "game" && playing) pausePlayback();
  document.querySelectorAll(".view").forEach((el) => { el.hidden = el.dataset.view !== v; });
  document.title = tr(TITLES[v]);
  if (changed) {
    const anchor = v === "home" && location.hash.length > 1 && location.hash !== "#top" && !location.hash.startsWith("#/") ? document.querySelector(location.hash) : null;
    if (anchor) anchor.scrollIntoView({ behavior: "instant" });
    else window.scrollTo({ top: 0, behavior: "instant" });
    if (!initial) {
      const h = document.querySelector('.view[data-view="' + v + '"] h1, .view[data-view="' + v + '"] [aria-level="1"]');
      if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
    }
  }
  updateNav();
  updateMini();
  if (window.NyanLobby) { if (v === "game") NyanLobby.enter(); else NyanLobby.exit(); }
}
window.addEventListener("hashchange", () => applyRoute(false));
window.addEventListener("langchange", () => { document.title = tr(TITLES[view]); });
window.addEventListener("scroll", updateNav, { passive: true });
applyRoute(true);

// главная состоит из двух экранов: один поворот колёсика мыши плавно переносит в самый низ страницы и обратно наверх
(function () {
  if (!document.getElementById("music")) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const maxScroll = () => document.documentElement.scrollHeight - window.innerHeight;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2); // плавный разгон и плавная остановка

  let busyUntil = 0;
  let baseEnd = 0;
  let raf = 0;

  function glide(target) {
    cancelAnimationFrame(raf);
    const from = window.scrollY;
    const dist = target - from;
    if (reduce || Math.abs(dist) < 2) { window.scrollTo({ top: target, behavior: "instant" }); return 0; }
    const dur = Math.min(1350, 800 + Math.abs(dist) * 0.4);
    const t0 = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      window.scrollTo({ top: from + dist * ease(t), behavior: "instant" });
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return dur;
  }

  window.addEventListener("wheel", (e) => {
    if (e.ctrlKey || Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
    if (window.innerWidth <= 900 || window.innerHeight < 700) return;
    if (view !== "home") return;
    if (document.getElementById("modal") && !document.getElementById("modal").hidden) return;
    if (document.body.classList.contains("tmenu-open")) return;
    const now = Date.now();
    if (now < busyUntil) {
      e.preventDefault();
      if (now >= baseEnd) busyUntil = now + 150; // инерция тачпада: ждём, пока колёсико совсем затихнет
      return;
    }
    const y = window.scrollY;
    const bottom = maxScroll();
    let target = null;
    if (e.deltaY > 0 && y < bottom - 4) target = bottom;
    else if (e.deltaY < 0 && y > 4 && y >= bottom - 4) target = 0;
    if (target === null) return;
    e.preventDefault();
    const dur = glide(target);
    baseEnd = now + dur + 100;
    busyUntil = baseEnd;
  }, { passive: false });
})();
