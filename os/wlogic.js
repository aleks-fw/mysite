"use strict";
(function (root) {
  function clampPos(x, y, w, h, aw, ah) {
    const mx = Math.max(0, aw - w), my = Math.max(0, ah - h);
    return { x: Math.min(mx, Math.max(0, x)), y: Math.min(my, Math.max(0, y)) };
  }
  function cascade(n) { const k = (n % 6) * 28; return { x: 140 + k, y: 20 + k }; }
  function createState() {
    let z = 0; const wins = new Map();
    return {
      open(id) { let w = wins.get(id); if (!w) { w = { id, z: 0, min: false }; wins.set(id, w); } w.min = false; w.z = ++z; return w; },
      focus(id) { const w = wins.get(id); if (!w || w.min) return null; w.z = ++z; return w; },
      minimize(id) { const w = wins.get(id); if (w) w.min = true; },
      close(id) { wins.delete(id); },
      has(id) { return wins.has(id); },
      active() { let a = null; for (const w of wins.values()) if (!w.min && (!a || w.z > a.z)) a = w; return a ? a.id : null; },
      list() { return [...wins.values()]; }
    };
  }
  const api = { createState, clampPos, cascade };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.FopkaOSLogic = api;
})(typeof window !== "undefined" ? window : globalThis);
