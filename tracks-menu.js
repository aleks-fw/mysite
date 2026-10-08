"use strict";

/* Меню треков: окно поверх страницы. Работает только через NyanMusic и событие musicchange. */
(function () {
  const box = $("tmenu");
  const list = $("tmenuList");
  const opener = $("openTracks");
  if (!box || !list || !opener || !window.NyanMusic) return;
  const M = window.NyanMusic;
  let items = [];

  function render() {
    list.innerHTML = "";
    items = M.tracks.map((t, i) => {
      const li = document.createElement("li");
      const b = document.createElement("button");
      b.type = "button"; b.className = "tmenu__item"; b.dataset.i = String(i);
      b.innerHTML = '<img class="tmenu__av" alt="" width="40" height="40"><span class="tmenu__n"></span><span class="tmenu__t"></span><span class="tmenu__m"></span><span class="tmenu__eq" aria-hidden="true"><i></i><i></i><i></i></span>';
      b.querySelector(".tmenu__av").src = t.art;
      b.querySelector(".tmenu__n").textContent = String(i + 1).padStart(2, "0");
      b.querySelector(".tmenu__t").textContent = t.title;
      b.querySelector(".tmenu__m").textContent = tr(t.mood) + " · " + t.bpm + " BPM";
      li.appendChild(b); list.appendChild(li);
      return b;
    });
    sync();
  }

  function sync() {
    const cur = M.current(), playing = M.isPlaying();
    items.forEach((b, i) => {
      if (i === cur) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current");
      b.classList.toggle("is-playing", i === cur && playing);
    });
  }

  // второе окно: плеер выбранного трека
  const det = $("tdet"), back = $("tdetBack"), bar = $("tdetBar");
  const fmt = (sec) => Math.floor(sec / 60) + ":" + String(Math.floor(sec % 60)).padStart(2, "0");
  let raf = 0;
  const rateBtns = M.rates.map((r) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "tmenu__x tdet__rb"; b.dataset.rate = String(r); b.textContent = r + "×";
    $("tdetRate").appendChild(b);
    return b;
  });

  function fillDetail() {
    const c = M.current(), t = M.tracks[c];
    $("tdetArt").src = t.art;
    $("tdetArt").alt = tr("Аватарка трека") + " " + t.title;
    $("tdetN").textContent = String(c + 1).padStart(2, "0") + " / " + String(M.tracks.length).padStart(2, "0");
    $("tdetT").textContent = t.title;
    $("tdetM").textContent = tr(t.mood) + " · " + t.bpm + " BPM";
    $("tdetPlay").innerHTML = M.isPlaying() ? "&#10074;&#10074;" : "&#9654;&#xFE0E;";
    rateBtns.forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.rate) === M.rate())));
  }
  function tickDetail() {
    const p = M.progress();
    $("tdetFill").style.width = (p.frac * 100) + "%";
    $("tdetCur").textContent = fmt(p.pos);
    $("tdetTot").textContent = fmt(p.dur);
    bar.setAttribute("aria-valuenow", String(Math.round(p.frac * 100)));
    raf = det.hidden ? 0 : requestAnimationFrame(tickDetail);
  }
  function showDetail() {
    list.hidden = true; det.hidden = false; back.hidden = false;
    fillDetail();
    cancelAnimationFrame(raf); tickDetail();
    $("tdetPlay").focus();
  }
  function showList() {
    det.hidden = true; back.hidden = true; list.hidden = false;
    cancelAnimationFrame(raf); raf = 0;
    sync();
    (items[M.current()] || opener).focus();
  }
  back.addEventListener("click", showList);
  $("tdetPlay").addEventListener("click", M.toggle);
  $("tdetPrev").addEventListener("click", M.prev);
  $("tdetNext").addEventListener("click", M.next);
  $("tdetRate").addEventListener("click", (e) => {
    const b = e.target.closest("[data-rate]");
    if (b) M.setRate(Number(b.dataset.rate));
  });
  const seekAt = (e) => { const r = bar.getBoundingClientRect(); M.seek((e.clientX - r.left) / r.width); };
  bar.addEventListener("click", seekAt);
  bar.addEventListener("keydown", (e) => {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    M.seek(Math.min(0.999, Math.max(0, M.progress().frac + d / 16)));
  });

  function open() {
    if (!box.hidden) return;
    box.hidden = false;
    document.body.classList.add("tmenu-open");
    showList();
  }
  function close() {
    if (box.hidden) return;
    box.hidden = true;
    cancelAnimationFrame(raf); raf = 0;
    document.body.classList.remove("tmenu-open");
    opener.focus();
  }

  opener.addEventListener("click", open);
  box.addEventListener("click", (e) => {
    if (e.target.closest("[data-tclose]")) { close(); return; }
    const it = e.target.closest(".tmenu__item");
    if (it) {
      const i = Number(it.dataset.i);
      if (!(i === M.current() && M.isPlaying())) M.select(i);
      showDetail();
    }
  });
  // пиксельный «пик» при наведении на трек
  box.addEventListener("pointerover", (e) => {
    const it = e.target.closest(".tmenu__item");
    if (!it || it.contains(e.relatedTarget)) return;
    if (typeof sfxTone === "function" && soundOn) sfxTone(880, 0, 0.03, 0.025);
  });
  document.addEventListener("keydown", (e) => {
    if (box.hidden) return;
    if (e.key === "Escape") { e.preventDefault(); close(); return; }
    if (e.key !== "Tab") return;
    const f = [...box.querySelectorAll("button, [tabindex=\"0\"]")].filter((b) => b.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    else if (!box.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
  });
  window.addEventListener("musicchange", () => { sync(); if (!det.hidden) fillDetail(); });
  window.addEventListener("langchange", () => { render(); if (!det.hidden) fillDetail(); });

  render();
  window.NyanTracksMenu = { open, close };
})();
