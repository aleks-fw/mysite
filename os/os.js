"use strict";
(function () {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // приглашение: строки загрузки появляются по очереди, когда блок виден
  const inv = document.getElementById("osInvite");
  if (inv) {
    const lines = [...inv.querySelectorAll(".boot__l")];
    if (!reduce && "IntersectionObserver" in window) {
      lines.forEach((l) => { l.hidden = true; });
      const io = new IntersectionObserver((en) => {
        if (!en[0].isIntersecting) return;
        io.disconnect();
        let i = 0;
        const t = setInterval(() => { if (i >= lines.length) { clearInterval(t); return; } lines[i++].hidden = false; }, 380);
      }, { threshold: 0.4 });
      io.observe(inv);
    }
  }

  const desk = document.getElementById("desk");
  if (!desk || !window.FopkaOSLogic) return;
  const L = window.FopkaOSLogic, area = $("deskArea"), bar = $("deskTasks"), state = L.createState();
  const els = new Map(); // id -> { win, task, dispose }
  let opened = 0;

  function buildFolio() {
    const body = document.createElement("div");
    const src = document.querySelector(".folio__grid");
    if (src) body.appendChild(src.cloneNode(true));
    return { body };
  }
  function buildPlayer() {
    const M = window.FopkaMusic, body = document.createElement("div");
    body.className = "dplayer";
    body.innerHTML = '<img alt="" width="120" height="120"><strong class="dplayer__t"></strong><span class="dplayer__m"></span>' +
      '<div class="dplayer__bar"><i></i></div><div class="dplayer__ctl">' +
      '<button class="pbtn" data-a="prev" type="button" aria-label="Предыдущий трек">&lt;&lt;</button>' +
      '<button class="pbtn pbtn--main" data-a="play" type="button" aria-label="Играть или пауза">&#9654;</button>' +
      '<button class="pbtn" data-a="next" type="button" aria-label="Следующий трек">&gt;&gt;</button>' +
      '<button class="pbtn" data-a="list" type="button">Список</button></div>';
    const img = body.querySelector("img"), t = body.querySelector(".dplayer__t"), mood = body.querySelector(".dplayer__m"), fill = body.querySelector(".dplayer__bar i"), pb = body.querySelector('[data-a="play"]');
    const upd = () => {
      if (!M || document.hidden) return;
      const tr0 = M.tracks[M.current()];
      if (img.getAttribute("src") !== tr0.art) img.src = tr0.art;
      t.textContent = tr0.title; mood.textContent = tr0.mood;
      fill.style.width = Math.round(M.progress().frac * 100) + "%";
      pb.innerHTML = M.isPlaying() ? "&#10074;&#10074;" : "&#9654;";
    };
    body.addEventListener("click", (ev) => {
      const a = ev.target.closest("[data-a]"); if (!a || !M) return;
      ({ prev: M.prev, next: M.next, play: M.toggle, list: () => window.FopkaTracksMenu && window.FopkaTracksMenu.open() })[a.dataset.a]();
      upd();
    });
    upd(); const timer = setInterval(upd, 250);
    return { body, dispose: () => clearInterval(timer) };
  }
  const APPS = {
    folio: { title: "Портфолио", w: 520, h: 400, build: buildFolio },
    player: { title: "Плеер", w: 360, h: 330, build: buildPlayer }
  };

  function render() {
    const act = state.active();
    for (const w of state.list()) {
      const e = els.get(w.id); if (!e) continue;
      e.win.hidden = w.min; e.win.style.zIndex = w.z; e.win.classList.toggle("is-active", w.id === act);
      e.task.setAttribute("aria-pressed", String(w.id === act));
    }
  }

  function closeApp(id) {
    const e = els.get(id); if (!e) return;
    if (e.dispose) e.dispose();
    e.win.remove(); e.task.remove(); els.delete(id); state.close(id); render();
    const a = state.active(); if (a) els.get(a).win.querySelector(".dwin__btn").focus();
  }

  function drag(win, head) {
    head.addEventListener("pointerdown", (ev) => {
      if (ev.target.closest("button") || window.matchMedia("(max-width: 700px)").matches) return;
      const sx = ev.clientX - win.offsetLeft, sy = ev.clientY - win.offsetTop;
      head.setPointerCapture(ev.pointerId);
      const move = (m) => {
        const p = L.clampPos(m.clientX - sx, m.clientY - sy, win.offsetWidth, win.offsetHeight, area.clientWidth, area.clientHeight);
        win.style.left = p.x + "px"; win.style.top = p.y + "px";
      };
      const up = () => { head.removeEventListener("pointermove", move); head.removeEventListener("pointerup", up); };
      head.addEventListener("pointermove", move); head.addEventListener("pointerup", up);
    });
  }

  function openApp(id) {
    const app = APPS[id]; if (!app) return;
    let e = els.get(id);
    if (!e) {
      const win = document.createElement("section");
      win.className = "dwin"; win.dataset.app = id; win.setAttribute("role", "dialog"); win.setAttribute("aria-label", tr(app.title));
      win.style.width = app.w + "px"; win.style.height = app.h + "px";
      const head = document.createElement("div"); head.className = "dwin__head";
      const title = document.createElement("span"); title.className = "dwin__title"; title.textContent = tr(app.title);
      const min = document.createElement("button"); min.type = "button"; min.className = "dwin__btn"; min.textContent = "_"; min.setAttribute("aria-label", tr("Свернуть"));
      const cls = document.createElement("button"); cls.type = "button"; cls.className = "dwin__btn"; cls.textContent = "x"; cls.setAttribute("aria-label", tr("Закрыть"));
      head.append(title, min, cls);
      const built = app.build();
      built.body.classList.add("dwin__body");
      win.append(head, built.body); area.appendChild(win);
      const p = L.clampPos(L.cascade(opened++).x, L.cascade(opened - 1).y, win.offsetWidth, win.offsetHeight, area.clientWidth, area.clientHeight);
      win.style.left = p.x + "px"; win.style.top = p.y + "px";
      const task = document.createElement("button"); task.type = "button"; task.className = "dtask"; task.textContent = tr(app.title);
      bar.appendChild(task);
      e = { win, task, dispose: built.dispose };
      els.set(id, e);
      drag(win, head);
      win.addEventListener("pointerdown", () => { state.focus(id); render(); });
      min.addEventListener("click", () => { state.minimize(id); render(); });
      cls.addEventListener("click", () => closeApp(id));
      task.addEventListener("click", () => { if (state.active() === id) state.minimize(id); else state.open(id); render(); });
    }
    state.open(id); render(); e.win.querySelector(".dwin__btn").focus();
  }

  // иконки: Чат и Игра — не окна
  const ACTIONS = {
    chat() { const b = $("openChat"); if (b) b.click(); },
    game() { location.hash = "#/game"; }
  };
  desk.querySelectorAll(".dicon").forEach((b) => b.addEventListener("click", () => { const a = b.dataset.app; if (ACTIONS[a]) ACTIONS[a](); else openApp(a); }));

  // панель задач: меню, часы
  const start = $("deskStart"), menu = $("deskMenu");
  start.addEventListener("click", () => { menu.hidden = !menu.hidden; start.setAttribute("aria-expanded", String(!menu.hidden)); });
  $("deskExit").addEventListener("click", () => { menu.hidden = true; start.setAttribute("aria-expanded", "false"); location.hash = "#top"; });
  const tick = () => { $("deskClock").textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); };
  tick(); setInterval(tick, 20000);

  // Esc закрывает активное окно, только если не открыты чат и меню треков
  document.addEventListener("keydown", (ev) => {
    if (ev.key !== "Escape" || desk.closest(".view").hidden) return;
    if (!$("modal").hidden || document.body.classList.contains("tmenu-open")) return;
    if (!menu.hidden) { menu.hidden = true; start.setAttribute("aria-expanded", "false"); return; }
    const a = state.active(); if (a) closeApp(a);
  }, true); // фаза захвата: срабатывает раньше обработчика чата, пока чат ещё открыт

  window.addEventListener("langchange", () => { for (const [id, e] of els) { const t = tr(APPS[id].title); e.win.querySelector(".dwin__title").textContent = t; e.win.setAttribute("aria-label", t); e.task.textContent = t; } });

  window.FopkaOS = { openApp, closeApp, APPS };
})();
