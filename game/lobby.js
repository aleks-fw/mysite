(function (root) {
  "use strict";
  const L = root.FopkaLogic;
  const t = (s) => (root.tr ? root.tr(s) : s);
  const TOAST = { repair: "РЕМОНТ", bomb: "БОМБА ГОТОВА · ПРОБЕЛ", core: "ЯДРО БОССА" };
  const TICON = { repair: "heart", bomb: "bomb", core: "coin" };
  const TCOL = { repair: "#f2a0b8", bomb: "#ffffff", core: "#c9a8ff" };
  const BICON = { atk: "double", hull: "shield", mov: "wing", arm: "rocket", eco: "coin" };
  const TIER_MARK = ["", "", "★", "★★"];
  const mk = (tag, cls, txt, attrs) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  const fmtTime = (s) => Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");
  const fmtVal = (v) => String(Math.round(v * 100) / 100).replace(".", ",");
  const desc = (tal, lvl) => t(tal.tpl).replace("{v}", fmtVal(L.talentValue(tal, lvl)));

  let S = null; // текущий экземпляр {stage, eng, world, play, save, phase, tab}
  const api = { phase: "none", enter, exit,
    // только для тестов
    _debugKill() { if (S && S.play && S.play.state === "run") { S.play.debug.skipCountdown(); const sn = S.play.snapshot(); S.play.debug.setHp(1); S.play.debug.spawn("virus", sn.x, sn.z); } },
    _play() { return S.play; },
    _world() { return S.world; },
    _eng() { return S.eng; },
    _save() { return S.save; },
    _fps() { return S && S.eng ? S.eng.stats.fps + "@" + S.eng.stats.pixelRatio : -1; },
    _geo() { return S && S.eng ? S.eng.renderer.info.memory.geometries : -1; } };

  function enter() {
    if (S) return;
    const host = document.getElementById("gameRoot"); if (!host) return;
    S = { host, save: L.loadSave(root.localStorage), cleanup: [], tab: "atk" };
    const stage = mk("div", "game__stage"); S.stage = stage; host.appendChild(stage);
    if (!root.FopkaEngine.webglOk()) return showNoGl();
    const canvas = mk("canvas", "game__canvas", null, { "aria-label": "Игровое поле" }); stage.appendChild(canvas);
    S.eng = root.FopkaEngine.create(canvas); S.world = root.FopkaWorld.create(S.eng);
    buildHud(); buildPanels();
    S.play = root.FopkaPlay.create({ eng: S.eng, world: S.world, canvas, save: S.save, ui: S.ui, onOver });
    S.eng.onLost = () => { S.play.pause(); S.ui.banner("Графика сброшена"); };
    S.eng.onRestored = () => S.eng.start();
    S.eng.start(); setPhase("lobby");
    if (root.FopkaAudio) { root.FopkaAudio.start(); root.FopkaAudio.setLevel(-1); root.FopkaAudio.pause(false); }
    const onLang = () => { S.syncSnd(); S.last = {}; S.shieldLab.textContent = t("ЩИТ"); renderLobby(); }; root.addEventListener("langchange", onLang); S.cleanup.push(() => root.removeEventListener("langchange", onLang));
    const ro = new ResizeObserver(() => S.eng.resize()); ro.observe(stage); S.cleanup.push(() => ro.disconnect());
  }
  function exit() {
    if (!S) return;
    S.cleanup.forEach((f) => f());
    if (S.play) S.play.bank();
    if (root.FopkaAudio) root.FopkaAudio.stop();
    if (S.play) S.play.stop(); if (S.world) S.world.dispose(); if (S.eng) S.eng.dispose();
    S.stage.remove(); S = null; api.phase = "none";
  }
  function setPhase(p) {
    api.phase = p; S.stage.dataset.phase = p;
    S.lobby.hidden = p !== "lobby"; S.hud.hidden = p !== "run" && p !== "paused"; S.over.hidden = p !== "over";
    if (p === "lobby") renderLobby();
  }
  function showNoGl() {
    api.phase = "nogl"; const b = mk("div", "game__nogl");
    b.append(mk("h2", "", t("Не получилось запустить 3D")), mk("p", "", t("Браузер не даёт включить WebGL. Попробуйте другой браузер или включите аппаратное ускорение.")), exitBtn());
    S.stage.appendChild(b);
  }
  const exitBtn = () => { const b = mk("button", "gbtn gbtn--ghost", t("Выйти на сайт"), { type: "button", id: "gameExit" }); b.addEventListener("click", () => { location.hash = "#top"; }); return b; };

  function buildPanels() {
    S.lobby = mk("div", "game__lobby"); S.over = mk("div", "game__over"); S.over.hidden = true;
    S.stage.append(S.lobby, S.over);
  }

  // ---- лобби: слева запуск, справа дерево талантов ----
  function renderLobby() {
    const box = S.lobby; box.replaceChildren();
    const side = mk("div", "lb__side"), head = mk("div", "game__head");
    head.append(mk("h1", "game__title", t("АНТИВИРУС")), mk("p", "game__sub", t("Сбивай вирусы и баги. Конца у забега нет.")));
    S.infoEl = mk("div", "game__info"); fillInfo();
    const play = mk("button", "gbtn gbtn--big", t("Играть"), { type: "button", id: "gamePlay" });
    play.addEventListener("click", () => { setPhase("run"); S.play.start(); });
    side.append(head, S.infoEl, play, exitBtn(), mk("p", "game__help", t("Мышь или палец — лететь. Стрелки/WASD — тоже. ЛКМ или R — ракета. Пробел — бомба. Esc — пауза.")));
    const tree = mk("div", "lb__tree");
    const tabs = mk("div", "lb__tabs", null, { role: "tablist" });
    L.BRANCHES.forEach((b) => {
      const bt = mk("button", "lb__tab" + (b.id === S.tab ? " on" : ""), null, { type: "button", role: "tab", "data-branch": b.id, "aria-selected": String(b.id === S.tab) });
      bt.append(mk("img", "", null, { src: root.FopkaWorld.iconURL(BICON[b.id]), alt: "", width: 20, height: 20 }), mk("span", "", t(b.name)));
      bt.addEventListener("click", () => { S.tab = b.id; if (root.FopkaAudio) root.FopkaAudio.sfx("click"); renderLobby(); });
      tabs.appendChild(bt);
    });
    S.listEl = mk("div", "lb__list"); fillList();
    tree.append(mk("h2", "lb__h", t("Таланты")), tabs, S.listEl);
    box.append(side, tree);
  }
  function fillInfo() {
    const s = S.save; S.infoEl.replaceChildren(mk("span", "", t("Рекорд") + ": " + s.best), mk("span", "", t("Биты") + ": " + s.bits), mk("span", "lb__cores", t("Ядра") + ": " + s.cores));
  }
  function fillList() {
    const s = S.save, list = S.listEl; list.replaceChildren();
    L.TALENTS.filter((x) => x.branch === S.tab).forEach((tal) => {
      const lvl = L.level(s, tal.id), c = L.canBuy(s, tal.id), maxed = lvl >= tal.max, miss = L.missingReq(s, tal);
      const card = mk("div", "tal t" + tal.tier + (maxed ? " maxed" : "") + (miss.length ? " locked" : ""), null, { "data-id": tal.id });
      const ic = mk("img", "tal__ic", null, { src: root.FopkaWorld.iconURL(BICON[tal.branch]), alt: "", width: 28, height: 28 });
      const body = mk("div", "tal__body");
      body.append(mk("b", "tal__name", t(tal.name) + (TIER_MARK[tal.tier] ? " " + TIER_MARK[tal.tier] : "")));
      const pips = mk("span", "game__pips", null, { "aria-label": lvl + " / " + tal.max }); for (let i = 0; i < tal.max; i++) pips.appendChild(mk("i", i < lvl ? "on" : "")); body.appendChild(pips);
      body.appendChild(mk("span", "tal__d", maxed ? t("МАКС") + ": " + desc(tal, lvl) : (lvl ? desc(tal, lvl) + " → " : "") + desc(tal, lvl + 1)));
      if (miss.length) body.appendChild(mk("span", "tal__need", t("Нужно") + ": " + miss.map(([id, l]) => t(L.talentById(id).name) + " " + L.level(s, id) + "/" + l).join(", ")));
      const cost = maxed ? null : L.talentCost(tal, lvl);
      const btn = mk("button", "gbtn gbtn--sm", maxed ? "✓" : miss.length ? "—" : cost.amount + " " + t(cost.cur === "cores" ? "ядер" : "бит"), { type: "button", "aria-label": t(tal.name) });
      btn.disabled = !c.ok;
      btn.addEventListener("click", () => {
        const r = L.buyTalent(S.save, tal.id); if (!r.ok) return;
        if (root.FopkaAudio) root.FopkaAudio.sfx("buy"); S.save = r.save; L.writeSave(root.localStorage, S.save); S.play.setSave(S.save);
        const top = S.listEl.scrollTop; fillInfo(); fillList(); S.listEl.scrollTop = top;
      });
      card.append(ic, body, btn); list.appendChild(card);
    });
  }

  function onOver(r) {
    S.save = L.loadSave(root.localStorage); S.over.replaceChildren();
    S.over.append(mk("h2", "", t("Забег окончен")), mk("p", "game__score", String(r.score)),
      mk("p", "", (r.newBest ? t("Новый рекорд!") + " " : t("Рекорд") + ": " + r.best + " · ") + t("Волна") + " " + r.wave + " · " + fmtTime(r.time) + " · +" + r.bits + " " + t("бит") + (r.cores ? " · +" + r.cores + " " + t("ядер") : "")));
    const again = mk("button", "gbtn gbtn--big", t("Ещё раз"), { type: "button", id: "gameAgain" }), back = mk("button", "gbtn gbtn--ghost", t("В лобби"), { type: "button", id: "gameToLobby" });
    again.addEventListener("click", () => { setPhase("run"); S.play.start(); }); back.addEventListener("click", () => { setPhase("lobby"); if (root.FopkaAudio) root.FopkaAudio.sfx("click"); });
    S.over.append(again, back); setPhase("over"); again.focus();
  }

  // ---- HUD ----
  function buildHud() {
    const h = mk("div", "game__hud"); h.hidden = true; S.hud = h;
    const cell = (id) => mk("div", "hud__cell", null, { id: id });
    h.append(cell("hudScore"), cell("hudTime"), cell("hudWave"), cell("hudHp"), cell("hudBits"), cell("hudCores"), cell("hudCombo"));
    const bomb = mk("button", "hud__bomb", "", { type: "button", id: "hudBomb", "aria-label": "Бомба" }); bomb.addEventListener("click", () => S.play.useBomb());
    const pause = mk("div", "game__pause", null); pause.hidden = true; S.pause = pause;
    const banner = mk("div", "game__banner"); S.banner = banner; const flash = mk("div", "game__flash"); S.flashEl = flash;
    const pbtn = mk("button", "hud__pausebtn", "", { type: "button", id: "hudPause", "aria-label": "Пауза" }); pbtn.addEventListener("click", () => S.play.togglePause());
    const buffs = mk("div", "hud__buffs");
    const chip = mk("div", "hud__chip"); chip.hidden = true; S.shieldLab = mk("span", "", t("ЩИТ")); const bar = mk("b", "hud__bar"), fill = mk("i"); bar.appendChild(fill);
    chip.append(mk("img", "", null, { src: root.FopkaWorld.iconURL("shield"), alt: "", width: 22, height: 22 }), S.shieldLab, bar); buffs.appendChild(chip); S.shieldChip = { chip, fill };
    const snd = mk("button", "game__snd", "", { type: "button", id: "gameSnd", "aria-label": "Звук" });
    const syncSnd = () => { const off = root.FopkaAudio && root.FopkaAudio.muted; snd.classList.toggle("is-off", !!off); snd.setAttribute("aria-pressed", String(!off)); snd.title = t(off ? "Включить звук (M)" : "Выключить звук (M)"); };
    snd.addEventListener("click", () => { root.FopkaAudio.toggleMute(); syncSnd(); }); S.stage.appendChild(snd); S.syncSnd = syncSnd; syncSnd();
    const hurt = mk("div", "game__hurt"); S.hurtEl = hurt; S.stage.appendChild(hurt);
    const cnt = mk("div", "game__count"); S.cnt = cnt; S.stage.appendChild(cnt);
    const hint = mk("div", "game__hint"); S.hintEl = hint; S.stage.appendChild(hint);
    const toast = mk("div", "game__toast"); S.toast = toast;
    const rk = mk("button", "hud__rocket", "", { type: "button", id: "hudRocket", "aria-label": "Ракета" });
    rk.append(mk("img", "", null, { src: root.FopkaWorld.iconURL("rocket"), alt: "", width: 28, height: 28 }), mk("b", "", "")); rk.addEventListener("click", () => S.play.fireRocket()); S.rocketBtn = rk;
    h.append(bomb, pbtn, buffs, rk); S.stage.appendChild(toast); S.stage.append(h, pause, banner, flash);
    S.last = {}; const put = (id, v) => { if (S.last[id] !== v) { S.last[id] = v; document.getElementById(id).textContent = v; } };
    S.ui = {
      set(s) {
        put("hudScore", t("ОЧКИ") + " " + s.score); put("hudTime", fmtTime(s.time)); put("hudWave", t("ВОЛНА") + " " + s.wave);
        put("hudHp", s.maxHp > 10 ? "♥ " + Math.max(0, s.hp) + "/" + s.maxHp : "♥".repeat(Math.max(0, s.hp)) + "·".repeat(Math.max(0, s.maxHp - s.hp))); put("hudCombo", s.combo > 1 ? "x" + s.combo : "");
        put("hudBits", t("БИТЫ") + " " + s.bits); put("hudCores", s.cores ? t("ЯДРА") + " " + s.cores : "");
        const b = document.getElementById("hudBomb"); b.hidden = !s.bomb; if (S.last.bn !== s.bomb) { S.last.bn = s.bomb; b.dataset.n = s.bomb > 1 ? "×" + s.bomb : ""; }
        { const cd = s.rocketCd, rb = S.rocketBtn, key = s.rocketStock >= s.rocketMax ? -1 : Math.ceil(cd), lab = s.rocketStock > 0 ? (s.rocketMax > 1 ? "×" + s.rocketStock : "ЛКМ") : key + "c";
          if (S.last.rk !== lab) { S.last.rk = lab; rb.classList.toggle("ready", s.rocketStock > 0); rb.lastChild.textContent = lab; }
          rb.style.setProperty("--p", s.rocketStock > 0 ? "100%" : Math.round((1 - cd / s.rocketCdMax) * 100) + "%"); }
        { const sc = S.shieldChip, on = s.shield >= 0; if (sc.chip.hidden === on) sc.chip.hidden = !on;
          if (on) { const w = Math.round(s.shield * 50); if (S.last.sh !== w) { S.last.sh = w; sc.fill.style.width = w * 2 + "%"; sc.chip.classList.toggle("warn", false); } } }
      },
      sound() { S.syncSnd(); },
      count(n) { const c = S.cnt; if (n === 0 && !c.textContent) return; c.textContent = n > 0 ? String(n) : t("Вперёд!"); c.classList.remove("on"); void c.offsetWidth; c.classList.add("on"); if (n === 0) setTimeout(() => { c.textContent = ""; }, 700); },
      hint(text) { const h2 = S.hintEl; h2.textContent = t(text); h2.classList.remove("on"); void h2.offsetWidth; h2.classList.add("on"); },
      hurt() { S.hurtEl.classList.remove("on"); void S.hurtEl.offsetWidth; S.hurtEl.classList.add("on"); },
      pop(x, y, text) { const e = mk("span", "game__pop", text); e.style.left = x + "px"; e.style.top = y + "px"; S.stage.appendChild(e); setTimeout(() => e.remove(), 800); const pops = S.stage.querySelectorAll(".game__pop"); if (pops.length > 14) pops[0].remove(); },
      pickup(type, extra) { const tt = S.toast; tt.replaceChildren(mk("img", "", null, { src: root.FopkaWorld.iconURL(TICON[type]), alt: "", width: 36, height: 36 }), mk("span", "", t(TOAST[type]) + (extra ? " " + extra : ""))); tt.style.setProperty("--tc", TCOL[type]); tt.classList.remove("on"); void tt.offsetWidth; tt.classList.add("on"); },
      banner(text) { S.banner.textContent = t(text); S.banner.classList.remove("on"); void S.banner.offsetWidth; S.banner.classList.add("on"); },
      flash() { S.flashEl.classList.remove("on"); void S.flashEl.offsetWidth; S.flashEl.classList.add("on"); },
      paused(on) { S.pause.hidden = !on; if (on) { const rb = mk("button", "gbtn", t("Продолжить"), { type: "button", id: "gameResume" }); rb.addEventListener("click", () => S.play.resume()); const qb = mk("button", "gbtn gbtn--ghost", t("Завершить забег"), { type: "button", id: "gameQuit" }), xb = mk("button", "gbtn gbtn--ghost", t("Выйти на сайт"), { type: "button", id: "gamePauseExit" });
        qb.addEventListener("click", () => { S.play.quit(); S.save = L.loadSave(root.localStorage); S.pause.hidden = true; setPhase("lobby"); if (root.FopkaAudio) root.FopkaAudio.sfx("click"); });
        xb.addEventListener("click", () => { S.play.bank(); location.hash = "#top"; });
        S.pause.replaceChildren(mk("h2", "", t("Пауза")), rb, qb, xb, mk("p", "", t("Esc — продолжить"))); rb.focus(); } if (api.phase !== "over" && api.phase !== "lobby") api.phase = on ? "paused" : "run"; }
    };
  }
  root.FopkaLobby = api;
  if (location.hash === "#/game") enter(); // прямой заход: маршрут разобран раньше, чем загрузился этот файл
})(window);
