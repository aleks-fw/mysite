(function (root) {
  "use strict";
  const L = root.NyanLogic;
  const B = { x: 7.5, zMin: -4, zMax: 3.5 }, BULLET_V = 22, KEYS_V = 12;
  const KIND_COLOR = { virus: 0xf2a0b8, bug: 0xf3d88c, shooter: 0xff7a9a, seg: 0x7bd88f, bot: 0x9b6be8 };
  const BOSS_COLOR = { mother: 0xa64f69, trojan: 0xd9822b, wormhead: 0x57c96f, cipher: 0x3ec8d8, botnet: 0x8a5be0 };
  const PICK_COLOR = { repair: 0xf2a0b8, bomb: 0xffffff };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const A = () => root.NyanAudio, snd = (n) => { const a = A(); if (a) a.sfx(n); };
  const inGame = () => location.hash === "#/game";
  const HINTS = [[0.2, "Веди мышью или пальцем: корабль летит за курсором"], [4.2, "Стрельба автоматическая"], [7.5, "ЛКМ или R: ракета (перезарядка 25 с)"]];

  function create(o) {
    const { eng, world, ui, canvas } = o, T = eng.THREE;
    let save = o.save, stats = L.deriveStats(save.tal);
    const ray = new T.Raycaster(), plane = new T.Plane(new T.Vector3(0, 1, 0), 0), ndc = new T.Vector2(), hit = new T.Vector3();
    const target = { x: 0, z: 2 }, keys = {};
    let state = "idle", r = null, over = false, tutDone = false, bosses = null;
    const dbgFlags = { noSpawn: false };
    try { tutDone = localStorage.getItem("nyan-game-tut") === "1"; } catch (e) {}

    function fresh() {
      return { hp: stats.maxHp, score: 0, bits: 0, cores: 0, time: 0, combo: 0, comboT: 0, fireT: 0, inv: 0, bomb: stats.startBombs, lastWave: 0,
        shieldT: 0, revivesLeft: stats.revives, count: 3, countN: 4, warp: 0, hintT: 0, hintI: 0,
        enemies: [], shots: [], picks: [], coins: [], ebullets: [], rockets: [], rocketStock: stats.rocketCharges, rocketCd: 0, spawner: L.createSpawner(Math.random) };
    }

    // ---------- ввод ----------
    function onPointer(e) {
      if (state !== "run") return;
      if (e.type === "pointerdown" && e.button === 0 && e.pointerType === "mouse") api.fireRocket();
      const b = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1);
      ray.setFromCamera(ndc, eng.camera);
      if (!ray.ray.intersectPlane(plane, hit)) return;
      target.x = clamp(hit.x, -B.x, B.x);
      target.z = clamp(hit.z - (e.pointerType === "touch" ? 2 : 0), B.zMin, B.zMax);
    }
    const GAME_KEYS = ["KeyR", "KeyM", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "KeyA", "KeyD", "KeyW", "KeyS", "Space", "Escape"];
    function onKeyDown(e) {
      if (!inGame() || !GAME_KEYS.includes(e.code)) return;
      const t = e.target; if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      e.preventDefault();
      if (e.code === "KeyR") { if (!e.repeat) api.fireRocket(); return; }
      if (e.code === "KeyM") { if (!e.repeat) { A().toggleMute(); if (ui.sound) ui.sound(); } return; }
      if (e.code === "Escape") { if (!e.repeat) api.togglePause(); return; }
      if (e.code === "Space") { if (!e.repeat) api.useBomb(); return; }
      keys[e.code] = true;
    }
    const onKeyUp = (e) => { delete keys[e.code]; };
    const onHidden = () => { if (document.hidden) api.pause(); };
    const onBlur = () => api.pause();
    canvas.style.touchAction = "none";
    canvas.addEventListener("pointermove", onPointer);
    canvas.addEventListener("pointerdown", onPointer);
    root.addEventListener("keydown", onKeyDown);
    root.addEventListener("keyup", onKeyUp);
    root.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onHidden);

    // ---------- сущности ----------
    const pop = (x, z, text) => { if (ui.pop) { const sp = world.project(x, z); ui.pop(sp.x, sp.y, text); } };
    function addEnemy(kind, x, z, hp, speed, phase, boss, tier) {
      const m = world.spawnEnemy(kind === "boss" ? boss : kind); if (!m) return null;
      const e = { m, kind, boss: boss || null, tier: tier || 0, x, z, hp, maxHp: hp, speed, phase: phase || 0, r: 0.8, t: 0, punch: 0, link: null, segs: null, ai: null, laser: null, invuln: false };
      if (kind === "boss") { e.r = bosses.def(e).r; }
      else if (kind === "seg") e.r = 0.85;
      m.position.set(x, 0, z); r.enemies.push(e);
      if (kind === "boss") bosses.init(e);
      return e;
    }
    function shoot(x, z, vx, vz) {
      if (r.ebullets.length > 85) return;
      const m = world.fireEnemyBullet(x, z); if (m) r.ebullets.push({ m, x, z, vx, vz, r: 0.24 });
    }
    function dropPick(type, x, z) { const m = world.dropPickup(type, x, z); if (m) r.picks.push({ m, type, x, z }); }
    function dropCoins(x, z, total, n) {
      const each = Math.max(1, Math.round(total / n));
      for (let i = 0; i < n; i++) { const cx = x + (Math.random() - 0.5) * (n > 1 ? 3 : 0.4), cz = z + (Math.random() - 0.5) * (n > 1 ? 2 : 0.4), m = world.dropCoin(cx, cz); if (m) r.coins.push({ m, x: cx, z: cz, v: each }); }
    }
    function heal(n) { if (r.hp >= stats.maxHp) return 0; const before = r.hp; r.hp = Math.min(stats.maxHp, r.hp + n); return r.hp - before; }
    function kill(e, reward) {
      const i = r.enemies.indexOf(e); if (i < 0) return;
      r.enemies.splice(i, 1); world.releaseEnemy(e.m); bosses.death(e);
      const isBoss = e.kind === "boss";
      world.burst(e.x, e.z, isBoss ? BOSS_COLOR[e.boss] : KIND_COLOR[e.kind] || 0xffffff, isBoss ? 50 : 14); snd(isBoss ? "bomb" : "boom");
      if (!reward) return;
      const pts = Math.round(L.scoreFor(e.kind, r.combo) * stats.scoreMul); pop(e.x, e.z, "+" + pts);
      r.score += pts; r.combo++; r.comboT = 2.5;
      dropCoins(e.x, e.z, Math.round(L.bitsFor(e.kind, r.lastWave) * stats.bitsMul), isBoss ? 8 : 1);
      if (isBoss) { world.shake(1.4); const c = 1 + e.tier; r.cores += c; dropPick("repair", e.x, e.z); ui.pickup("core", "+" + c); world.pulse(e.x, e.z, 0xc9a8ff); }
      else { const d = L.rollDrop(Math.random, stats.repairChance); if (d) dropPick(d, e.x, e.z); }
    }
    // урон по врагу (с учётом сегментов червя и неуязвимости шифровальщика)
    function damage(e, d, crit) {
      const tgt = e.link || e; if (tgt.invuln) { pop(e.x, e.z, "0"); return; }
      tgt.hp -= d; e.punch = 0.3; if (crit) pop(e.x, e.z, "КРИТ");
      if (tgt.hp <= 0 && r.enemies.includes(tgt)) kill(tgt, true);
    }
    function explode(x, z, direct) {
      const rad = L.ROCKET.radius * stats.rocketRadiusMul, mul = stats.rocketDmgMul * stats.damage;
      world.burst(x, z, 0xf3d88c, 36); world.burst(x, z, 0xf2a0b8, 24); world.pulse(x, z, 0xf3d88c); world.shake(0.6); snd("rboom");
      r.enemies.slice().forEach((e) => {
        if (!r.enemies.includes(e)) return;
        const d = e === direct || (direct && e.link === direct) ? L.ROCKET.damage : (Math.hypot(e.x - x, e.z - z) <= rad + e.r ? L.ROCKET.splash : 0);
        if (d) damage(e, d * mul, false);
      });
    }
    function hurt(n) {
      if (r.inv > 0) return;
      if (Math.random() < stats.dodge) { r.inv = 0.3; pop(world.ship.position.x, world.ship.position.z, "УКЛОН."); return; }
      if (Math.random() < stats.block) { r.inv = 0.3; pop(world.ship.position.x, world.ship.position.z, "БЛОК"); snd("hit"); return; }
      if (stats.shieldCd > 0 && r.shieldT <= 0) { r.shieldT = stats.shieldCd; r.inv = 0.8; world.shake(0.4); snd("hit"); world.pulse(world.ship.position.x, world.ship.position.z, 0x9cc8f0); return; }
      r.hp -= n; r.inv = stats.grace; world.shake(0.8); if (ui.hurt) ui.hurt(); snd("hurt");
      if (r.hp <= 0) {
        if (r.revivesLeft > 0) { r.revivesLeft--; r.hp = Math.ceil(stats.maxHp / 2); r.inv = 3; ui.banner("Второй шанс"); world.burst(world.ship.position.x, world.ship.position.z, 0xffffff, 40); world.pulse(world.ship.position.x, world.ship.position.z, 0xffffff); snd("pickup"); r.ebullets.slice().forEach((b) => { world.releaseEnemyBullet(b.m); }); r.ebullets = []; }
        else finish();
      }
    }
    function finish() {
      if (over) return; over = true; state = "over";
      const best = save.best, newBest = r.score > best;
      save = { bits: save.bits + r.bits, cores: save.cores + r.cores, best: Math.max(best, r.score), tal: save.tal };
      L.writeSave(root.localStorage, save);
      ui.paused(false); snd("over"); if (A()) A().setLevel(-1);
      o.onOver({ score: r.score, bits: r.bits, cores: r.cores, time: r.time, wave: r.lastWave, best: save.best, newBest });
    }

    bosses = root.NyanBosses.create({
      world, player: () => ({ x: world.ship.position.x, z: world.ship.position.z }), enemies: () => r.enemies,
      addEnemy: (k, x, z, hp, sp, ph) => addEnemy(k, x, z, hp, sp, ph), shoot, kill
    });

    // ---------- главный шаг ----------
    function moveShip(dt) {
      const s = world.ship, px = s.position.x;
      const dx = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0);
      const dz = (keys.ArrowDown || keys.KeyS ? 1 : 0) - (keys.ArrowUp || keys.KeyW ? 1 : 0);
      target.x = clamp(target.x + dx * KEYS_V * dt, -B.x, B.x); target.z = clamp(target.z + dz * KEYS_V * dt, B.zMin, B.zMax);
      const k = 1 - Math.exp(-stats.follow * dt);
      s.position.x += (target.x - px) * k; s.position.z += (target.z - s.position.z) * k;
      world.setShipTilt((s.position.x - px) / dt);
    }
    function pushUi() {
      ui.set({ score: r.score, time: r.time, hp: r.hp, maxHp: stats.maxHp, combo: r.combo, wave: r.lastWave, bomb: r.bomb, rocketCd: r.rocketCd, rocketStock: r.rocketStock, rocketMax: stats.rocketCharges, rocketCdMax: stats.rocketCd,
        shield: stats.shieldCd > 0 ? (r.shieldT <= 0 ? 1 : 1 - r.shieldT / stats.shieldCd) : -1, bits: r.bits, cores: r.cores });
    }
    function step(dt) {
      if (state !== "run") return;
      moveShip(dt); const s = world.ship;
      if (r.count > 0) {      // отсчёт перед стартом: можно двигаться, но враги и стрельба ещё спят
        r.count -= dt; const n = Math.max(0, Math.ceil(r.count));
        if (n !== r.countN) { r.countN = n; ui.count(n); snd(n > 0 ? "count" : "go"); }
        if (r.count <= 0) { r.inv = 2; if (A()) A().setLevel(0); }
        pushUi(); return;
      }
      if (!tutDone) { r.hintT += dt; if (r.hintI < HINTS.length && r.hintT >= HINTS[r.hintI][0]) { ui.hint(HINTS[r.hintI][1]); r.hintI++; if (r.hintI === HINTS.length) { tutDone = true; try { localStorage.setItem("nyan-game-tut", "1"); } catch (e) {} } } }
      if (r.warp > 0) { r.warp -= dt; const t = 2.6 - Math.max(0, r.warp), sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }; world.setWarp(sm(t / 0.5) * (1 - sm((t - 2.0) / 0.6))); r.inv = Math.max(r.inv, 0.3); if (r.warp <= 0) world.setWarp(0); }
      r.time += dt; r.inv = Math.max(0, r.inv - dt); r.comboT -= dt; if (r.comboT <= 0) r.combo = 0;
      if (stats.shieldCd > 0) { if (r.shieldT > 0) r.shieldT = Math.max(0, r.shieldT - dt); world.setShield(r.shieldT <= 0); } else world.setShield(false);
      // стрельба: несколько стволов, шанс крита, пробивание
      r.fireT -= dt;
      if (r.fireT <= 0) {
        r.fireT = stats.fireDelay; snd("shoot");
        const n = stats.barrels;
        for (let i = 0; i < n; i++) { const ox = (i - (n - 1) / 2) * 0.38, m = world.fireBullet(s.position.x + ox, s.position.z - 1, n > 1 ? 1 : 0); if (m) r.shots.push({ m, x: s.position.x + ox, z: s.position.z - 1, pierce: stats.pierce, hitSet: [] }); }
      }
      // волны
      const res = dbgFlags.noSpawn ? { spawns: [], waveCleared: false } : r.spawner.update(dt, r.enemies.length);
      if (r.spawner.wave !== r.lastWave) {
        r.lastWave = r.spawner.wave; const wc = L.waveConfig(r.lastWave), bf = wc.boss ? L.bossFor(r.lastWave) : null;
        ui.banner(wc.boss ? bf.name : "Волна " + r.lastWave); snd("wave");
        if (A()) A().setLevel(wc.boss ? 4 : Math.min(3, Math.floor((r.lastWave - 1) / 2))); world.setSpeed(6 + r.lastWave * 0.3);
      }
      if (res.waveCleared) {
        r.score += 50; ui.banner("Млечный путь"); snd("warp"); r.warp = 2.6;
        if (stats.waveBonus) { r.bits += stats.waveBonus; pop(s.position.x, s.position.z - 2, "+" + stats.waveBonus); }
        if (stats.regenEvery && r.lastWave % stats.regenEvery === 0 && heal(1)) pop(s.position.x, s.position.z - 1, "+1");
        r.ebullets.forEach((b) => world.releaseEnemyBullet(b.m)); r.ebullets = [];
      }
      res.spawns.forEach((p) => { if (p.kind === "boss") addEnemy("boss", p.x * 0.3, -22, p.hp, p.speed, p.phase, p.boss, p.tier); else addEnemy(p.kind, p.x, -22, p.kind === "shooter" ? Math.ceil(p.hp * 1.5) : p.hp, p.speed, p.phase); });
      // враги
      const me = { x: s.position.x, z: s.position.z, r: stats.hitR };
      for (const e of r.enemies.slice()) {
        if (!r.enemies.includes(e)) continue;
        e.t += dt; e.punch = Math.max(0, e.punch - dt * 2.5);
        const spin = e.kind === "boss" ? bosses.def(e).spin !== false && e.boss === "mother" : false;
        if (spin) e.m.rotation.y += dt * 1.5;
        else if (e.kind !== "boss") e.m.rotation.z = Math.sin(e.t * 4 + e.phase) * 0.12;
        let sc = Math.min(1, e.t * 3.5) * (1 + e.punch + Math.sin(e.t * 6 + e.phase) * 0.05); if (e.kind === "boss") sc *= bosses.scale(e);
        e.m.scale.setScalar(sc);
        if (e.kind === "virus" || e.kind === "bug") { e.z += e.speed * dt; if (e.kind === "bug") e.x = clamp(e.x + Math.sin(e.t * 3 + e.phase) * 3 * dt, -7, 7); }
        else if (e.kind !== "seg") bosses.update(e, dt);
        e.m.position.set(e.x, 0, e.z);
        if (e.kind === "boss" && e.boss === "trojan") e.m.rotation.y = 0;
        if (e.laser && e.laser.on && s.position.z > e.laser.z0 && Math.abs(s.position.x - e.laser.x) < e.laser.w / 2 + me.r) hurt(1);
        if (L.circleHit(me, e) && !e.invuln) {
          if (e.kind === "boss") { hurt(2); r.inv = Math.max(r.inv, 1); }
          else if (e.kind === "seg") hurt(1);
          else { hurt(1); kill(e, false); }
          continue;
        }
        if (e.z > 5.5 && e.kind !== "boss" && e.kind !== "seg") { r.enemies.splice(r.enemies.indexOf(e), 1); world.releaseEnemy(e.m); r.combo = 0; }
      }
      if (state !== "run") return;
      // вражеские пули
      for (const b of r.ebullets.slice()) {
        b.x += b.vx * dt; b.z += b.vz * dt; b.m.position.set(b.x, 0.1, b.z);
        if (L.circleHit(me, b)) { hurt(1); r.ebullets.splice(r.ebullets.indexOf(b), 1); world.releaseEnemyBullet(b.m); continue; }
        if (b.z > 7 || b.z < -27 || Math.abs(b.x) > 12) { r.ebullets.splice(r.ebullets.indexOf(b), 1); world.releaseEnemyBullet(b.m); }
      }
      if (state !== "run") return;
      // ракеты: запас и перезарядка, полёт, взрыв
      if (r.rocketStock < stats.rocketCharges) { r.rocketCd -= dt; if (r.rocketCd <= 0) { r.rocketStock++; snd("ready"); r.rocketCd = r.rocketStock < stats.rocketCharges ? stats.rocketCd : 0; } }
      for (const rk of r.rockets.slice()) {
        rk.z -= L.ROCKET.speed * dt; rk.m.position.z = rk.z; rk.t += dt;
        if (rk.t > 0.04) { rk.t = 0; world.burst(rk.x, rk.z + 0.8, 0xf3d88c, 1); }
        const hitE = r.enemies.find((e) => !e.invuln && !(e.link && e.link.invuln) && L.circleHit({ x: rk.x, z: rk.z, r: 0.4 }, e));
        if (hitE || rk.z < -24) { r.rockets.splice(r.rockets.indexOf(rk), 1); world.releaseRocket(rk.m); if (hitE) explode(rk.x, rk.z, hitE.link || hitE); }
      }
      // пули игрока
      for (const sh of r.shots.slice()) {
        sh.z -= BULLET_V * dt; sh.m.position.z = sh.z;
        let gone = sh.z < -24;
        if (!gone) for (const e of r.enemies) {
          if (sh.hitSet.includes(e) || !L.circleHit({ x: sh.x, z: sh.z, r: 0.25 }, e)) continue;
          sh.hitSet.push(e);
          const crit = Math.random() < stats.critChance, d = stats.damage * (crit ? stats.critMult : 1);
          world.burst(sh.x, sh.z, crit ? 0xffd34a : 0xd2e6f9, crit ? 6 : 3); snd("hit"); damage(e, d, crit);
          if (sh.pierce > 0) sh.pierce--; else { gone = true; break; }
        }
        if (gone) { r.shots.splice(r.shots.indexOf(sh), 1); world.releaseBullet(sh.m); }
      }
      // монеты и бонусы: магнит притягивает всё в радиусе
      for (const c of r.coins.slice()) {
        const toX = s.position.x - c.x, toZ = s.position.z - c.z, d = Math.hypot(toX, toZ);
        if (d < stats.magnetR) { const sp = 12 + (stats.magnetR - d) * 2; c.x += (toX / d) * sp * dt; c.z += (toZ / d) * sp * dt; } else c.z += 4 * dt;
        c.m.position.set(c.x, 0.15, c.z);
        if (d < 0.9) { r.bits += c.v; snd("coin"); r.coins.splice(r.coins.indexOf(c), 1); world.releaseCoin(c.m); }
        else if (c.z > 6) { r.coins.splice(r.coins.indexOf(c), 1); world.releaseCoin(c.m); }
      }
      for (const p of r.picks.slice()) {
        const toX = s.position.x - p.x, toZ = s.position.z - p.z, d = Math.hypot(toX, toZ);
        if (d < stats.magnetR) { p.x += (toX / d) * 9 * dt; p.z += (toZ / d) * 9 * dt; } else p.z += 4 * dt;
        p.m.position.set(p.x, p.m.position.y, p.z);
        if (L.circleHit({ x: s.position.x, z: s.position.z, r: 0.8 }, { x: p.x, z: p.z, r: 0.6 })) {
          if (p.type === "bomb") { if (r.bomb < 3) r.bomb++; ui.pickup("bomb"); }
          else { const h = heal(stats.healAmt); ui.pickup("repair", h > 0 ? "+" + h : ""); }
          world.burst(p.x, p.z, PICK_COLOR[p.type], 14); world.pulse(p.x, p.z, PICK_COLOR[p.type]); snd("pickup"); r.picks.splice(r.picks.indexOf(p), 1); world.releasePickup(p.m);
        } else if (p.z > 6) { r.picks.splice(r.picks.indexOf(p), 1); world.releasePickup(p.m); }
      }
      pushUi();
    }
    const removeStep = eng.add(step);

    function clearAll() {
      r.enemies.forEach((e) => { bosses.death(e); world.releaseEnemy(e.m); }); r.shots.forEach((x) => world.releaseBullet(x.m)); r.picks.forEach((p) => world.releasePickup(p.m));
      r.rockets.forEach((k) => world.releaseRocket(k.m)); r.coins.forEach((c) => world.releaseCoin(c.m)); r.ebullets.forEach((b) => world.releaseEnemyBullet(b.m));
      r.enemies = []; r.shots = []; r.picks = []; r.rockets = []; r.coins = []; r.ebullets = [];
    }

    const api = {
      get state() { return state; },
      start() {
        if (r) clearAll(); world.reset(); stats = L.deriveStats(save.tal); r = fresh(); over = false; target.x = 0; target.z = 2;
        Object.keys(keys).forEach((k) => delete keys[k]); state = "run"; ui.paused(false); eng.start(); ui.count(3); if (A()) { A().start(); A().setLevel(-1); A().pause(false); }
      },
      setSave(ns) { save = ns; },
      fireRocket() {
        if (state !== "run" || r.count > 0 || r.rocketStock <= 0) return;
        const s = world.ship.position, m = world.fireRocket(s.x, s.z - 1.2); if (!m) return;
        r.rockets.push({ m, x: s.x, z: s.z - 1.2, t: 0 }); r.rocketStock--; if (r.rocketCd <= 0) r.rocketCd = stats.rocketCd; snd("rocket"); world.shake(0.15);
      },
      pause() { if (state === "run") { state = "paused"; ui.paused(true); if (A()) A().pause(true); } },
      resume() { if (state === "paused") { state = "run"; ui.paused(false); if (A()) A().pause(false); } },
      togglePause() { state === "run" ? api.pause() : api.resume(); },
      useBomb() {
        if (state !== "run" || r.count > 0 || r.bomb <= 0) return; r.bomb--; ui.flash(); world.shake(1.2); snd("bomb");
        r.ebullets.forEach((b) => world.releaseEnemyBullet(b.m)); r.ebullets = [];
        r.enemies.slice().forEach((e) => {
          if (!r.enemies.includes(e)) return;
          if (e.kind === "boss" || e.kind === "seg") { damage(e, stats.bombBoss, false); world.burst(e.x, e.z, 0xffffff, 20); } else kill(e, true);
        });
      },
      // сохранить заработанное в текущем забеге (при выходе с паузы или со страницы игры)
      bank() {
        if (!r || over || (state !== "run" && state !== "paused")) return;
        if (!r.bits && !r.cores && r.score <= save.best) return;
        save = { bits: save.bits + r.bits, cores: save.cores + r.cores, best: Math.max(save.best, r.score), tal: save.tal };
        L.writeSave(root.localStorage, save); r.bits = 0; r.cores = 0;
      },
      quit() { api.bank(); if (r) clearAll(); world.reset(); state = "idle"; ui.paused(false); if (A()) { A().setLevel(-1); A().pause(false); } },
      stop() {
        removeStep(); canvas.removeEventListener("pointermove", onPointer); canvas.removeEventListener("pointerdown", onPointer);
        root.removeEventListener("keydown", onKeyDown); root.removeEventListener("keyup", onKeyUp); root.removeEventListener("blur", onBlur);
        document.removeEventListener("visibilitychange", onHidden);
        if (r) clearAll(); world.reset(); state = "idle";
      },
      snapshot() {
        return r ? { state, hp: r.hp, score: r.score, bits: r.bits, cores: r.cores, wave: r.lastWave, time: r.time, combo: r.combo, enemies: r.enemies.length, shots: r.shots.length, picks: r.picks.length, coins: r.coins.length, ebullets: r.ebullets.length,
          rockets: r.rockets.length, rocketCd: r.rocketCd, rocketStock: r.rocketStock, bomb: r.bomb, shieldT: r.shieldT, x: world.ship.position.x, z: world.ship.position.z, count: r.count, warp: r.warp } : { state };
      },
      stats() { return stats; },
      debug: {
        set noSpawn(v) { dbgFlags.noSpawn = !!v; },
        spawn(kind, x, z, hp) { if (kind === "pickup-bomb") return dropPick("bomb", x, z); return addEnemy(kind, x, z, hp || 1, 0.01, 0); },
        spawnBoss(id, tier) { const hp = 200; return addEnemy("boss", 0, -22, hp, 1.2, 0, id, tier || 0); },
        setHp(n) { r.hp = n; },
        skipCountdown() { r.count = 0; r.countN = 0; r.inv = 0; ui.count(0); if (A()) A().setLevel(0); },
        drop(type, x, z) { dropPick(type, x, z); },
        kill(e) { kill(e, true); },
        warp() { r.warp = 2.6; },
        enemies() { return r.enemies; }
      }
    };
    return api;
  }
  root.NyanPlay = { create };
})(window);
