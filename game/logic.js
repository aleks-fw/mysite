(function (root) {
  "use strict";
  // Чистая логика игры (без DOM и Three.js): сохранение, дерево постоянных талантов, характеристики, волны, боссы.
  const SAVE_KEY = "fopka-game";
  const clampInt = (v, lo, hi) => { v = Math.floor(Number(v)); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo; };

  // ---------- таланты (по мотивам карт талантов Archero 2: обычные, «супер», «ульта», общие, титан) ----------
  // поля: id, ветка, ярус (1 обычный, 2 супер, 3 ульта: за ядра боссов), название, максимум уровней, цена в битах, требования [[id, уровень]], шаблон описания, прирост за уровень, функция значения
  const BRANCHES = [
    { id: "atk", name: "Орудия" }, { id: "hull", name: "Корпус" }, { id: "mov", name: "Манёвр" }, { id: "arm", name: "Арсенал" }, { id: "eco", name: "Богатство" }
  ];
  const RAW = [
    ["str", "atk", 1, "Орудия", 5, 40, [], "+{v}% урона", 12],
    ["sstr", "atk", 2, "Сверх-орудия", 5, 150, [["str", 5]], "+{v}% урона", 18],
    ["rate", "atk", 1, "Скорострельность", 5, 45, [], "−{v}% задержки выстрела", 6],
    ["crit", "atk", 1, "Крит-шанс", 5, 60, [], "+{v}% шанса крита", 4],
    ["scrit", "atk", 2, "Сверх-крит", 5, 180, [["crit", 5]], "+{v}% шанса крита", 5],
    ["ucrit", "atk", 3, "Ульта крита", 5, 0, [["scrit", 5]], "+{v}% шанса крита", 6],
    ["cdmg", "atk", 1, "Крит-урон", 5, 60, [], "+{v}% урона крита", 20],
    ["scdmg", "atk", 2, "Сверх-крит-урон", 5, 180, [["cdmg", 5]], "+{v}% урона крита", 25],
    ["ucdmg", "atk", 3, "Ульта крит-урона", 5, 0, [["scdmg", 5]], "+{v}% урона крита", 35],
    ["multi", "atk", 2, "Мульти-залп", 3, 220, [["str", 3]], "+{v} ствол(а)", 1],
    ["pierce", "atk", 2, "Пробивание", 3, 240, [["rate", 3]], "пробивает целей: {v}", 1],
    ["vigor", "hull", 1, "Корпус", 5, 50, [], "+{v} жизн.", 1],
    ["svigor", "hull", 2, "Сверх-корпус", 5, 160, [["vigor", 5]], "+{v} жизн.", 1],
    ["armor", "hull", 1, "Броня", 5, 55, [], "{v}% блока удара", 5],
    ["sarmor", "hull", 2, "Сверх-броня", 5, 170, [["armor", 5]], "+{v}% блока удара", 6],
    ["repair", "hull", 1, "Ремонт", 3, 50, [], "ремонт лечит +{v}", 1],
    ["srepair", "hull", 2, "Сверх-ремонт", 2, 150, [["repair", 3]], "ремонт лечит ещё +{v}", 1],
    ["shield", "hull", 2, "Щит", 5, 120, [["vigor", 2]], "щит, перезарядка {v} с", 0, (l) => 34 - 4 * l],
    ["regen", "hull", 2, "Регенерация", 3, 150, [["vigor", 3]], "+1 жизнь каждые {v} волн", 0, (l) => 5 - l],
    ["revive", "hull", 3, "Второй шанс", 2, 0, [["svigor", 2]], "возрождений за забег: {v}", 1],
    ["dodge", "mov", 1, "Уклонение", 5, 60, [], "{v}% уклонения", 4],
    ["sdodge", "mov", 2, "Сверх-уклонение", 5, 180, [["dodge", 5]], "+{v}% уклонения", 5],
    ["udodge", "mov", 3, "Ульта уклонения", 5, 0, [["sdodge", 5]], "+{v}% уклонения", 6],
    ["speed", "mov", 1, "Скорость корабля", 5, 40, [], "+{v}% скорости", 12],
    ["swift", "mov", 2, "Попутный ветер", 5, 90, [["speed", 3]], "+{v}% скорости и скорострельности", 3],
    ["magnet", "mov", 1, "Магнит", 5, 40, [], "радиус сбора +{v}", 1.5],
    ["grace", "mov", 1, "Неуязвимость", 4, 70, [], "+{v} с после удара", 0.25],
    ["hitbox", "mov", 2, "Малый корпус", 3, 130, [["speed", 2]], "−{v}% хитбокса", 8],
    ["rdmg", "arm", 1, "Урон ракет", 5, 70, [], "+{v}% урона ракет", 20],
    ["rrad", "arm", 1, "Радиус взрыва", 5, 70, [], "+{v}% радиуса", 10],
    ["rcd", "arm", 1, "Перезарядка ракет", 5, 80, [], "перезарядка {v} с", 0, (l) => 25 - 2 * l],
    ["rcharge", "arm", 2, "Запас ракет", 3, 250, [["rcd", 3]], "запас ракет: {v}", 0, (l) => 1 + l],
    ["bomb", "arm", 1, "Бомбы", 3, 150, [], "бомб в начале: {v}", 1],
    ["sbomb", "arm", 2, "Мощь бомбы", 3, 200, [["bomb", 2]], "+{v} урона боссу", 15],
    ["wealth", "eco", 1, "Богатство", 5, 50, [], "+{v}% бит", 10],
    ["swealth", "eco", 2, "Сверх-богатство", 5, 160, [["wealth", 5]], "+{v}% бит", 15],
    ["lucky", "eco", 1, "Удача", 5, 60, [], "+{v}% шанса ремонта", 2],
    ["wbonus", "eco", 1, "Бонус волны", 5, 70, [], "+{v} бит за волну", 8],
    ["glory", "eco", 1, "Слава", 5, 60, [], "+{v}% очков", 10],
    ["titan", "eco", 3, "Титан", 3, 0, [["vigor", 5], ["str", 5], ["cdmg", 5]], "+{v}% урона и крита, +1 жизнь", 8]
  ];
  const TALENTS = RAW.map(([id, branch, tier, name, max, base, req, tpl, per, fn]) => ({ id, branch, tier, name, max, base, req, tpl, per, value: fn || ((l) => Math.round(per * l * 100) / 100) }));
  const BY_ID = {}; TALENTS.forEach((t) => { BY_ID[t.id] = t; });
  const talentById = (id) => BY_ID[id] || null;

  const defaultSave = () => ({ bits: 0, cores: 0, best: 0, tal: {} });
  function sanitize(raw) {
    const s = defaultSave();
    if (!raw || typeof raw !== "object") return s;
    s.bits = clampInt(raw.bits, 0, 1e9); s.cores = clampInt(raw.cores, 0, 1e6); s.best = clampInt(raw.best, 0, 1e9);
    if (raw.tal && typeof raw.tal === "object") TALENTS.forEach((t) => { const v = clampInt(raw.tal[t.id], 0, t.max); if (v) s.tal[t.id] = v; });
    else if (raw.up && typeof raw.up === "object") {   // миграция со старой версии: четыре улучшения -> таланты
      const m = { dmg: "str", rate: "rate", hp: "vigor", speed: "speed" };
      Object.keys(m).forEach((k) => { const v = clampInt(Math.ceil(clampInt(raw.up[k], 0, 10) / 2), 0, 5); if (v) s.tal[m[k]] = v; });
    }
    return s;
  }
  function loadSave(storage) { try { return sanitize(JSON.parse(storage.getItem(SAVE_KEY))); } catch (e) { return defaultSave(); } }
  function writeSave(storage, save) { try { storage.setItem(SAVE_KEY, JSON.stringify(save)); return true; } catch (e) { return false; } }

  const level = (save, id) => (save.tal && save.tal[id]) || 0;
  // цена следующего уровня: обычные таланты за биты (растёт на 55% за уровень), ульта и титан — за ядра боссов
  function talentCost(t, lvl) {
    if (t.tier === 3) return { cur: "cores", amount: (lvl + 1) * (t.id === "titan" ? 3 : 1) };
    return { cur: "bits", amount: Math.round(t.base * Math.pow(1.55, lvl)) };
  }
  function missingReq(save, t) { return t.req.filter(([id, l]) => level(save, id) < l); }
  function canBuy(save, id) {
    const t = BY_ID[id]; if (!t) return { ok: false, reason: "unknown" };
    const lvl = level(save, id);
    if (lvl >= t.max) return { ok: false, reason: "max" };
    if (missingReq(save, t).length) return { ok: false, reason: "locked" };
    const c = talentCost(t, lvl);
    if ((c.cur === "cores" ? save.cores : save.bits) < c.amount) return { ok: false, reason: c.cur };
    return { ok: true, cost: c };
  }
  function buyTalent(save, id) {
    const r = canBuy(save, id); if (!r.ok) return r;
    const next = { bits: save.bits, cores: save.cores, best: save.best, tal: Object.assign({}, save.tal, { [id]: level(save, id) + 1 }) };
    next[r.cost.cur] -= r.cost.amount;
    return { ok: true, save: next };
  }
  // текст эффекта для карточки: {v} подставляется значением уровня (по умолчанию следующего)
  const talentValue = (t, lvl) => t.value(lvl);

  // ---------- характеристики корабля из талантов ----------
  function deriveStats(tal) {
    const g = (id) => (tal && tal[id]) || 0, tit = g("titan");
    return {
      damage: 1 + 0.12 * g("str") + 0.18 * g("sstr") + 0.08 * tit,
      fireDelay: 0.28 * Math.pow(0.94, g("rate")) * Math.pow(0.97, g("swift")),
      critChance: Math.min(0.8, 0.04 * g("crit") + 0.05 * g("scrit") + 0.06 * g("ucrit")),
      critMult: 1.5 + 0.2 * g("cdmg") + 0.25 * g("scdmg") + 0.35 * g("ucdmg") + 0.1 * tit,
      barrels: 1 + g("multi"), pierce: g("pierce"),
      maxHp: 5 + g("vigor") + g("svigor") + tit,
      block: Math.min(0.5, 0.05 * g("armor") + 0.06 * g("sarmor")),
      dodge: Math.min(0.5, 0.04 * g("dodge") + 0.05 * g("sdodge") + 0.06 * g("udodge")),
      healAmt: 1 + g("repair") + g("srepair"),
      shieldCd: g("shield") ? 34 - 4 * g("shield") : 0,
      regenEvery: g("regen") ? 5 - g("regen") : 0,
      revives: g("revive"),
      grace: 1 + 0.25 * g("grace"),
      hitR: 0.5 * (1 - 0.08 * g("hitbox")),
      magnetR: 2.5 + 1.5 * g("magnet"),
      follow: 8 * (1 + 0.12 * g("speed") + 0.03 * g("swift")),
      rocketDmgMul: 1 + 0.2 * g("rdmg"), rocketRadiusMul: 1 + 0.1 * g("rrad"), rocketCd: 25 - 2 * g("rcd"), rocketCharges: 1 + g("rcharge"),
      startBombs: g("bomb"), bombBoss: 30 + 15 * g("sbomb"),
      bitsMul: 1 + 0.1 * g("wealth") + 0.15 * g("swealth"),
      repairChance: 0.06 + 0.02 * g("lucky"),
      waveBonus: 8 * g("wbonus"),
      scoreMul: 1 + 0.1 * g("glory")
    };
  }

  // ---------- волны, враги, боссы ----------
  const BOSSES = [
    { id: "mother", name: "Матка" }, { id: "trojan", name: "Троян" }, { id: "worm", name: "Червь" }, { id: "cipher", name: "Шифровальщик" }, { id: "botnet", name: "Ботнет" }
  ];
  function bossFor(wave) { const idx = Math.max(0, wave / 5 - 1); return Object.assign({ tier: Math.floor(idx / BOSSES.length) }, BOSSES[idx % BOSSES.length]); }
  function waveConfig(n) {
    const boss = n % 5 === 0;
    return { wave: n, boss, count: boss ? 1 : Math.min(40, 4 + Math.floor(n * 1.5)), hp: 1 + Math.floor(n / 3),
      speed: Math.min(9, 2 + n * 0.3), gap: Math.max(0.35, 1.4 - n * 0.05), bossHp: boss ? 60 + n * 10 : 0 };
  }
  function createSpawner(rand) {
    let wave = 1, cfg = waveConfig(1), left = cfg.count, timer = 1, pause = 0, announced = false;
    const begin = () => { cfg = waveConfig(wave); left = cfg.count; timer = 1; announced = false; };
    return {
      get wave() { return wave; },
      update(dt, alive) {
        const out = { spawns: [], waveCleared: false };
        if (pause > 0) { pause -= dt; if (pause <= 0) { wave++; begin(); } return out; }
        if (left === 0) { if (alive === 0 && !announced) { announced = true; pause = 2.6; out.waveCleared = true; } return out; }
        timer -= dt;
        if (timer <= 0) {
          left--; timer = cfg.gap;
          const r = rand(), kind = cfg.boss ? "boss" : (wave >= 4 && r < 0.2 ? "shooter" : wave >= 3 && r < 0.5 ? "bug" : "virus");
          const ev = { kind, x: (rand() * 2 - 1) * 7, hp: cfg.boss ? cfg.bossHp : cfg.hp, speed: cfg.boss ? 1.2 : cfg.speed, phase: rand() * Math.PI * 2 };
          if (cfg.boss) { const b = bossFor(wave); ev.boss = b.id; ev.tier = b.tier; ev.hp = Math.round(cfg.bossHp * (1 + 0.5 * b.tier)); }
          out.spawns.push(ev);
        }
        return out;
      }
    };
  }
  const circleHit = (a, b) => { const dx = a.x - b.x, dz = a.z - b.z, r = a.r + b.r; return dx * dx + dz * dz <= r * r; };
  const scoreFor = (kind, combo) => Math.round({ virus: 10, bug: 20, shooter: 30, boss: 200 }[kind] * (1 + Math.min(combo, 40) * 0.05));
  const bitsFor = (kind, wave) => Math.max(1, Math.round(({ virus: 1, bug: 2, shooter: 3, boss: 25 }[kind]) * (1 + (wave || 0) * 0.08)));
  function rollDrop(rand, repairChance) {
    const r = rand(), rc = repairChance == null ? 0.06 : repairChance;
    if (r < rc) return "repair";
    if (r < rc + 0.02) return "bomb";
    return null;
  }
  const ROCKET = { cooldown: 25, damage: 15, splash: 10, radius: 2.6, speed: 16 };

  const api = { ROCKET, SAVE_KEY, BRANCHES, TALENTS, BOSSES, talentById, defaultSave, loadSave, writeSave, level, talentCost, canBuy, buyTalent, missingReq, talentValue, deriveStats, bossFor, waveConfig, createSpawner, circleHit, scoreFor, bitsFor, rollDrop };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.FopkaLogic = api;
})(typeof window !== "undefined" ? window : globalThis);
