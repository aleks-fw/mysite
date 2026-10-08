"use strict";
(function (root) {
  // art (аватарка, у каждого трека своя), title, bpm, root (MIDI), prog (ступени минора), seed (мелодия), lead (тембр), mood и hue (для окна треков)
  const TRACKS = [
    { title: "Pixel Rain",      bpm: 88,  root: 57, prog: [0, 5, 2, 6], seed: 11,  lead: "square",   mood: "дождливый",    hue: 210, art: "img/tracks/a1.png" },
    { title: "Night Shift.exe", bpm: 104, root: 62, prog: [0, 3, 5, 4], seed: 42,  lead: "sawtooth", mood: "ночной",       hue: 262, art: "img/tracks/a2.png" },
    { title: "Cream Soda",      bpm: 96,  root: 55, prog: [0, 6, 5, 6], seed: 7,   lead: "triangle", mood: "сладкий",      hue: 340, art: "img/tracks/a3.png" },
    { title: "Rainy Cache",     bpm: 76,  root: 52, prog: [0, 5, 3, 4], seed: 101, lead: "sine",     mood: "тихий",        hue: 195, art: "img/tracks/a4.png" },
    { title: "Boot Sequence",   bpm: 120, root: 60, prog: [0, 2, 5, 6], seed: 202, lead: "square",   mood: "бодрый",       hue: 32, art: "img/tracks/a5.png" },
    { title: "Lo-Fi Debug",     bpm: 82,  root: 58, prog: [0, 4, 5, 3], seed: 303, lead: "triangle", mood: "уютный",       hue: 285, art: "img/tracks/a6.png" },
    { title: "Glitch Garden",   bpm: 112, root: 64, prog: [0, 6, 2, 5], seed: 404, lead: "sawtooth", mood: "странный",     hue: 135, art: "img/tracks/a7.png" },
    { title: "Dial-Up Dreams",  bpm: 92,  root: 53, prog: [0, 3, 6, 4], seed: 505, lead: "sine",     mood: "мечтательный", hue: 318, art: "img/tracks/a8.png" },
    { title: "Turbo Toast",     bpm: 128, root: 59, prog: [0, 5, 6, 5], seed: 606, lead: "square",   mood: "быстрый",      hue: 18, art: "img/tracks/a9.png" },
    { title: "Last Commit",     bpm: 72,  root: 50, prog: [0, 5, 2, 6], seed: 707, lead: "triangle", mood: "грустный",     hue: 225, art: "img/tracks/a10.png" }
  ];
  const wrap = (i, n) => ((i % n) + n) % n;
  const api = { TRACKS, wrap };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.NyanTracks = api;
})(typeof window !== "undefined" ? window : globalThis);
