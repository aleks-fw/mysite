(function (root) {
  "use strict";
  // Боссы и поведение вражеских «стрелков». Каждый босс уникален по модели и по атакам.
  // Координаты: x вдоль поля, z вглубь (враги летят от z=-22 к игроку на z≈2). Угол «a» отсчитывается от оси +z к +x.
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TAU = Math.PI * 2;

  function create(ctx) {
    const { world } = ctx;
    const rand = () => Math.random();
    const aimAngle = (e) => { const p = ctx.player(); return Math.atan2(p.x - e.x, p.z - e.z); };
    const shootAngle = (e, a, speed) => ctx.shoot(e.x, e.z, Math.sin(a) * speed, Math.cos(a) * speed);
    function lane(e, x, w, z0, z1, color, op) {   // вертикальная полоса предупреждения/луча
      if (!e.ai.tele) e.ai.tele = world.telegraph();
      const m = e.ai.tele; if (!m) return null;
      m.position.set(x, 0.04, (z0 + z1) / 2); m.scale.set(w, Math.abs(z1 - z0), 1); m.material.color.setHex(color); m.material.opacity = op; return m;
    }
    function dropLane(e) { if (e.ai && e.ai.tele) { world.releaseTele(e.ai.tele); e.ai.tele = null; } e.laser = null; }

    const B = {
      // ---- Матка: плодит мелких вирусов и пускает кольца медленных пуль ----
      mother: {
        r: 2.4, spin: true,
        init(e) { e.ai = { add: 2.5, ring: 3, ang: 0 }; },
        update(e, dt) {
          if (e.z < -9) e.z += 4.8 * dt; else e.x = Math.sin(e.t * 0.8) * 5;
          const ai = e.ai, tier = e.tier || 0;
          ai.add -= dt; if (ai.add <= 0) { ai.add = 3.2; if (ctx.enemies().length < 16) { ctx.addEnemy("virus", e.x - 1.3, e.z + 2, 1 + tier, 5, 0); ctx.addEnemy("virus", e.x + 1.3, e.z + 2, 1 + tier, 5, 0); } }
          ai.ring -= dt; if (ai.ring <= 0) { ai.ring = 4.2; const n = 10 + 4 * tier; for (let i = 0; i < n; i++) shootAngle(e, ai.ang + (i * TAU) / n, 5); ai.ang += 0.3; }
        }
      },
      // ---- Троян: веер выстрелов, затем предупреждающая полоса и таран ----
      trojan: {
        r: 2.0,
        init(e) { e.ai = { s: "patrol", fan: 1.2, dash: 4.5, lane: 0, tele: null, w: 0 }; },
        update(e, dt) {
          const ai = e.ai, p = ctx.player();
          if (ai.s === "patrol") {
            if (e.z < -9) e.z += 6 * dt; else e.z = -9;
            e.x += clamp(p.x - e.x, -1, 1) * dt * 2.2;
            ai.fan -= dt; if (ai.fan <= 0) { ai.fan = 1.8; const a = aimAngle(e); [-0.3, 0, 0.3].forEach((d) => shootAngle(e, a + d, 7)); }
            ai.dash -= dt; if (ai.dash <= 0 && e.z >= -9.1) { ai.s = "tele"; ai.lane = p.x; ai.w = 1.15; }
          } else if (ai.s === "tele") {
            e.x += (ai.lane - e.x) * Math.min(1, dt * 6); ai.w -= dt;
            lane(e, ai.lane, 3.6, e.z, 5, 0xff3a5a, 0.22 + 0.2 * Math.abs(Math.sin(e.t * 14)));
            if (ai.w <= 0) { ai.s = "dash"; world.shake(0.4); }
          } else if (ai.s === "dash") {
            e.z += 18 * dt; lane(e, ai.lane, 3.6, e.z, 5, 0xffffff, 0.35);
            if (e.z > 3.6) { ai.s = "back"; world.shake(0.9); dropLane(e); }
          } else { e.z -= 7 * dt; if (e.z <= -9) { ai.s = "patrol"; ai.dash = 4.5; ai.fan = 0.8; } }
        },
        death: dropLane
      },
      // ---- Червь: длинная цепь сегментов, виляет по всему экрану ----
      wormhead: {
        r: 1.35, spin: false,
        init(e) {
          e.ai = { hist: [], fire: 2, n: 10 + 2 * (e.tier || 0) }; e.segs = [];
          for (let i = 0; i < e.ai.n; i++) { const s = ctx.addEnemy("seg", e.x, e.z, 1, 0, 0); if (s) { s.link = e; s.r = 0.85; e.segs.push(s); } }
        },
        update(e, dt) {
          const ai = e.ai;
          if (e.z < -14) { e.z += 8 * dt; e.x += (0 - e.x) * Math.min(1, dt * 2); } else { e.x = Math.sin(e.t * 1.0) * 6.4; e.z = -8 + Math.sin(e.t * 0.55) * 3.5; }
          ai.hist.unshift({ t: e.t, x: e.x, z: e.z }); if (ai.hist.length > 600) ai.hist.length = 600;
          e.segs.forEach((s, i) => { const want = e.t - (i + 1) * 0.2; let k = 0; while (k < ai.hist.length - 1 && ai.hist[k].t > want) k++; s.x = ai.hist[k].x; s.z = ai.hist[k].z; });
          ai.fire -= dt; if (ai.fire <= 0) { ai.fire = 2.4; shootAngle(e, aimAngle(e), 7.5); }
        },
        death(e) { (e.segs || []).forEach((s) => ctx.kill(s, false)); e.segs = []; }
      },
      // ---- Шифровальщик: телепортируется, бьёт лучом с предупреждением, зовёт дронов ----
      cipher: {
        r: 1.6, spin: false,
        init(e) { e.ai = { s: "idle", timer: 1.2, alpha: 1, lane: 0, tele: null, t2: 0 }; },
        update(e, dt) {
          const ai = e.ai;
          if (e.z < -10) { e.z += 6 * dt; return; }
          e.invuln = ai.s === "vanish" || (ai.s === "appear" && ai.alpha < 0.8);
          if (ai.s === "idle") { ai.timer -= dt; if (ai.timer <= 0) ai.s = "vanish"; }
          else if (ai.s === "vanish") { ai.alpha -= dt / 0.35; if (ai.alpha <= 0) { ai.alpha = 0; e.x = (rand() * 2 - 1) * 6; e.z = -9 + (rand() * 2 - 1) * 1.5; ai.s = "appear"; } }
          else if (ai.s === "appear") { ai.alpha += dt / 0.35; if (ai.alpha >= 1) { ai.alpha = 1; ai.s = "tele"; ai.lane = e.x; ai.t2 = 1.0; } }
          else if (ai.s === "tele") { ai.t2 -= dt; lane(e, ai.lane, 2.2, e.z, 5, 0xff3a5a, 0.2 + 0.25 * Math.abs(Math.sin(e.t * 16))); if (ai.t2 <= 0) { ai.s = "beam"; ai.t2 = 0.6; world.shake(0.3); } }
          else if (ai.s === "beam") {
            ai.t2 -= dt; lane(e, ai.lane, 2.2, e.z, 5, 0xffffff, 0.85); e.laser = { x: ai.lane, w: 2.2, z0: e.z, on: true };
            if (ai.t2 <= 0) { dropLane(e); const tier = e.tier || 0; ctx.addEnemy("bot", e.x - 1.6, e.z + 1.5, 2 + tier, 3.2, 0); ctx.addEnemy("bot", e.x + 1.6, e.z + 1.5, 2 + tier, 3.2, 0); ai.s = "idle"; ai.timer = 1.8; }
          }
        },
        scale(e) { return Math.max(0.01, e.ai.alpha); },
        death: dropLane
      },
      // ---- Ботнет: распадается на копии-преследователей при потере здоровья ----
      botnet: {
        r: 1.9, spin: false,
        init(e) { e.ai = { fire: 2, s1: false, s2: false }; },
        update(e, dt) {
          const ai = e.ai;
          if (e.z < -9) e.z += 5 * dt; else { e.x = Math.sin(e.t * 0.7) * 5.5; e.z = -9 + Math.sin(e.t * 1.1) * 1.2; }
          ai.fire -= dt; if (ai.fire <= 0) { ai.fire = 2.3; shootAngle(e, aimAngle(e), 7); }
          const split = () => { const hp = Math.max(3, Math.ceil(e.maxHp * 0.05)); for (let i = 0; i < 3; i++) { const a = (i * TAU) / 3; ctx.addEnemy("bot", e.x + Math.sin(a) * 2.2, e.z + Math.cos(a) * 2.2, hp, 3.4, 0); } world.burst(e.x, e.z, 0x9b6be8, 24); world.shake(0.6); };
          if (!ai.s1 && e.hp <= e.maxHp * 0.66) { ai.s1 = true; split(); }
          if (!ai.s2 && e.hp <= e.maxHp * 0.33) { ai.s2 = true; split(); }
        }
      }
    };

    // ---- обычные «стрелок» и «бот-преследователь» ----
    const regular = {
      shooter(e, dt) {
        const ai = e.ai || (e.ai = { phase: "in", shots: 3, fire: 0.6 });
        if (ai.phase === "in") { e.z += e.speed * dt; if (e.z >= -7) ai.phase = "hover"; }
        else if (ai.phase === "hover") { e.x = clamp(e.x + Math.sin(e.t * 1.5 + e.phase) * 2 * dt, -7, 7); ai.fire -= dt; if (ai.fire <= 0) { ai.fire = 1.7; shootAngle(e, aimAngle(e), 6); if (--ai.shots <= 0) ai.phase = "out"; } }
        else e.z += 6 * dt;
      },
      bot(e, dt) {
        const p = ctx.player(), dx = p.x - e.x, dz = p.z - e.z, d = Math.hypot(dx, dz) || 1, sp = e.speed || 3.2;
        e.x += (dx / d) * sp * dt; e.z += (dz / d) * sp * dt;
      }
    };

    return {
      def(e) { return e.kind === "boss" ? B[e.boss] : null; },
      meshKind(boss) { return boss; },
      init(e) { const d = B[e.boss]; if (d && d.init) d.init(e); },
      update(e, dt) { if (e.kind === "boss") { const d = B[e.boss]; d.update(e, dt); } else if (regular[e.kind]) regular[e.kind](e, dt); },
      scale(e) { const d = e.kind === "boss" ? B[e.boss] : null; return d && d.scale ? d.scale(e) : 1; },
      death(e) { const d = e.kind === "boss" ? B[e.boss] : null; if (d && d.death) d.death(e); }
    };
  }
  root.FopkaBosses = { create };
})(window);
