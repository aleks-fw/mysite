"use strict";

const $ = (id) => document.getElementById(id);

// пиксельные звуки интерфейса: клики и «бипы» печати (отдельный AudioContext, не мешает музыке)
let sfxCtx = null;
let sfxEnd = 0; // момент (по часам AudioContext), когда закончится последний запланированный звук
let soundOn = true;
let musicOn = false; // true, пока на сайте играет музыка: бипы печати в чате тогда молчат
try { soundOn = localStorage.getItem("nyan-blip") !== "off"; } catch (e) {}

function sfxCtxReady() {
  if (!sfxCtx) sfxCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (sfxCtx.state === "suspended") sfxCtx.resume();
  return sfxCtx;
}

// «будим» звук заранее, при касании или нажатии мыши: к моменту клика всё уже готово и звук не опаздывает
function warmUp() { try { sfxCtxReady(); } catch (e) {} }
["pointerdown", "keydown", "touchstart"].forEach((n) => document.addEventListener(n, warmUp, { once: true, passive: true }));

function sfxTone(freq, start, dur, vol) {
  try {
    const ctx = sfxCtxReady();
    const t = ctx.currentTime + start;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "square";
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.01);
    sfxEnd = Math.max(sfxEnd, t + dur);
  } catch (e) {}
}

const BLIP_NOTES = [392, 440, 494, 523, 587, 659];
function blip() {
  if (!soundOn || musicOn) return;
  sfxTone(BLIP_NOTES[Math.floor(Math.random() * BLIP_NOTES.length)], 0, 0.05, 0.035);
}

// клик по любой кнопке или ссылке: короткий «пик», у главных кнопок двойной
document.addEventListener("click", (e) => {
  if (!soundOn || !e.target.closest) return;
  const el = e.target.closest("a, button, .bar");
  if (!el) return;
  if (el.matches(".btn, .hbtn, .pbtn--main, .theme, .nav__a")) {
    sfxTone(523, 0, 0.06, 0.05);
    sfxTone(784, 0.07, 0.08, 0.05);
  } else {
    sfxTone(659, 0, 0.06, 0.045);
  }
});

// переход на другую страницу откладываем ровно настолько, чтобы звук клика доиграл до конца
document.addEventListener("click", (e) => {
  const a = e.target.closest && e.target.closest("a[href]");
  if (!a || !soundOn || a.target === "_blank" || e.defaultPrevented) return;
  if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
  const u = new URL(a.href, location.href);
  if (u.origin !== location.origin && u.protocol !== "file:") return;
  if (u.pathname === location.pathname) return;
  e.preventDefault();
  let wait = 300;
  if (sfxCtx && sfxCtx.state === "running") {
    const latency = (sfxCtx.outputLatency || sfxCtx.baseLatency || 0.1);
    wait = Math.min(600, Math.max(250, (sfxEnd - sfxCtx.currentTime + latency) * 1000 + 80));
  }
  setTimeout(() => { location.href = a.href; }, wait);
});
