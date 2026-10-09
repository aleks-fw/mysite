"use strict";

/* =====================================================
   ПЕРЕВОД САЙТА: русский <-> английский
   Тексты страницы заменяются по словарю, выбор запоминается.
   Динамические тексты (чат, подсказки) берут перевод через tr().
   ===================================================== */
const I18N = {
  // бегущая строка
  "СРОЧНО: нейросеть попросила повышения и отпуск на три пикселя": "BREAKING: a neural network asked for a raise and a three-pixel vacation",
  "Учёные выяснили, что сайт, написанный ИИ, открывается быстрее, чем остывает чай": "Scientists found that a site written by AI opens faster than tea gets cold",
  "Курс пиксельного рубля вырос на 2 квадрата": "The pixel ruble rose by 2 squares",
  "Ночью в игре «Антивирус» заметили вирус, который сам себя ловит. Мы его не трогали": "Overnight, a virus that catches itself was spotted in the Antivirus game. We didn't touch it",
  "Поддержка NYAN отвечает так быстро, что иногда успевает ответить до вопроса": "NYAN support replies so fast it sometimes answers before the question",
  "В Москве задержан баг: он выдавал себя за фичу": "A bug was detained in Moscow: it was passing itself off as a feature",
  "Эксперты советуют: если сайт не открывается, нажмите F5 и подумайте о хорошем": "Experts advise: if the site won't open, press F5 and think of something nice",
  // OS-режим
  "Запустить": "Launch",
  "// legacy mode / как раньше": "// legacy mode / like before",
  "[ OK ] тема загружена": "[ OK ] theme loaded",
  "[ OK ] ~/portfolio, ~/music, ~/games подключены": "[ OK ] ~/portfolio, ~/music, ~/games mounted",
  "[ OK ] демон музыки запущен": "[ OK ] music daemon started",
  "[ READY ] десктоп-режим готов_": "[ READY ] desktop mode ready_",
  "↗ Открыть OS-режим": "↗ Open OS mode",
  "← Остаться на сайте": "← Stay on the site",
  "Эта версия сделана ради прикола: обычного сайта вполне достаточно.": "This version is just for fun: the regular site is plenty.",
  "Плеер": "Player",
  "Чат": "Chat",
  "Свернуть": "Minimize",
  "Список": "List",
  "OS-режим сделан ради прикола.": "OS mode is just for fun.",
  "Выйти на обычный сайт": "Back to the regular site",
  "OS-режим — NYAN": "OS mode — NYAN",
  // меню
  "Меню": "Menu",
  "Главная": "Home",
  "Портфолио": "Portfolio",
  "Поддержка": "Support",
  "Музыка": "Music",
  "Игра": "Game",
  "Игра — NYAN": "Game — NYAN",
  "Графика сброшена": "Graphics reset",
  "Продолжить": "Resume",
  "Завершить забег": "End run",
  "Орудия": "Cannons",
  "Сверх-орудия": "Super Cannons",
  "Крит-шанс": "Crit Chance",
  "Сверх-крит": "Super Crit",
  "Ульта крита": "Ultimate Crit",
  "Крит-урон": "Crit Damage",
  "Сверх-крит-урон": "Super Crit Damage",
  "Ульта крит-урона": "Ultimate Crit Damage",
  "Мульти-залп": "Multi-shot",
  "Пробивание": "Piercing",
  "Корпус": "Hull",
  "Сверх-корпус": "Super Hull",
  "Броня": "Armor",
  "Сверх-броня": "Super Armor",
  "Ремонт": "Repair",
  "Сверх-ремонт": "Super Repair",
  "Щит": "Shield",
  "Регенерация": "Regeneration",
  "Второй шанс": "Second Chance",
  "Уклонение": "Evasion",
  "Сверх-уклонение": "Super Evasion",
  "Ульта уклонения": "Ultimate Evasion",
  "Попутный ветер": "Tailwind",
  "Магнит": "Magnet",
  "Неуязвимость": "Invulnerability",
  "Малый корпус": "Small Hull",
  "Урон ракет": "Rocket Damage",
  "Радиус взрыва": "Blast Radius",
  "Перезарядка ракет": "Rocket Reload",
  "Запас ракет": "Rocket Stock",
  "Бомбы": "Bombs",
  "Мощь бомбы": "Bomb Power",
  "Богатство": "Wealth",
  "Сверх-богатство": "Super Wealth",
  "Удача": "Luck",
  "Бонус волны": "Wave Bonus",
  "Слава": "Glory",
  "Титан": "Titan",
  "Манёвр": "Maneuver",
  "Арсенал": "Arsenal",
  "+{v}% урона": "+{v}% damage",
  "−{v}% задержки выстрела": "−{v}% shot delay",
  "+{v}% шанса крита": "+{v}% crit chance",
  "+{v}% урона крита": "+{v}% crit damage",
  "+{v} ствол(а)": "+{v} barrel(s)",
  "пробивает целей: {v}": "pierces {v} target(s)",
  "+{v} жизн.": "+{v} HP",
  "{v}% блока удара": "{v}% hit block",
  "+{v}% блока удара": "+{v}% hit block",
  "ремонт лечит +{v}": "repair heals +{v}",
  "ремонт лечит ещё +{v}": "repair heals +{v} more",
  "щит, перезарядка {v} с": "shield, {v} s cooldown",
  "+1 жизнь каждые {v} волн": "+1 HP every {v} waves",
  "возрождений за забег: {v}": "revives per run: {v}",
  "{v}% уклонения": "{v}% evasion",
  "+{v}% уклонения": "+{v}% evasion",
  "+{v}% скорости": "+{v}% speed",
  "+{v}% скорости и скорострельности": "+{v}% speed and fire rate",
  "радиус сбора +{v}": "pickup radius +{v}",
  "+{v} с после удара": "+{v} s invulnerability after a hit",
  "−{v}% хитбокса": "−{v}% hitbox",
  "+{v}% урона ракет": "+{v}% rocket damage",
  "+{v}% радиуса": "+{v}% radius",
  "перезарядка {v} с": "reload {v} s",
  "запас ракет: {v}": "rocket stock: {v}",
  "бомб в начале: {v}": "bombs at start: {v}",
  "+{v} урона боссу": "+{v} boss damage",
  "+{v}% бит": "+{v}% bits",
  "+{v}% шанса ремонта": "+{v}% repair chance",
  "+{v} бит за волну": "+{v} bits per wave",
  "+{v}% очков": "+{v}% score",
  "+{v}% урона и крита, +1 жизнь": "+{v}% damage and crit, +1 HP",
  "Таланты": "Talents",
  "Нужно": "Requires",
  "Ядра": "Cores",
  "ядер": "cores",
  "БИТЫ": "BITS",
  "ЯДРА": "CORES",
  "РЕМОНТ": "REPAIR",
  "ЯДРО БОССА": "BOSS CORE",
  "КРИТ": "CRIT",
  "УКЛОН.": "DODGE",
  "БЛОК": "BLOCK",
  "Матка": "Mother",
  "Троян": "Trojan",
  "Червь": "Worm",
  "Шифровальщик": "Ransomware",
  "Ботнет": "Botnet",
  "Вперёд!": "Go!",
  "Млечный путь": "Milky Way",
  "Веди мышью или пальцем: корабль летит за курсором": "Move the mouse or finger: the ship follows",
  "Стрельба автоматическая": "Shooting is automatic",
  "ЛКМ или R: ракета (перезарядка 25 с)": "LMB or R: rocket (25 s cooldown)",
  "ЛКМ": "LMB",
  "Ракета": "Rocket",
  "Звук": "Sound",
  "Включить звук (M)": "Sound on (M)",
  "Выключить звук (M)": "Sound off (M)",
  "ЩИТ": "SHIELD",
  "ДВОЙНОЙ ВЫСТРЕЛ": "DOUBLE SHOT",
  "МАГНИТ": "MAGNET",
  "БОМБА ГОТОВА · ПРОБЕЛ": "BOMB READY · SPACE",
  "АНТИВИРУС": "ANTIVIRUS",
  "Сбивай вирусы и баги. Конца у забега нет.": "Squash viruses and bugs. A run never ends.",
  "Рекорд": "Best",
  "Биты": "Bits",
  "бит": "bits",
  "Улучшения": "Upgrades",
  "Урон": "Damage",
  "Скорострельность": "Fire rate",
  "Прочность": "Hull",
  "Скорость корабля": "Ship speed",
  "МАКС": "MAX",
  "Играть": "Play",
  "Выйти на сайт": "Back to site",
  "Мышь или палец — лететь. Стрелки/WASD — тоже. ЛКМ или R — ракета. Пробел — бомба. Esc — пауза.": "Mouse or finger to fly. Arrows/WASD work too. LMB or R — rocket. Space — bomb. Esc — pause.",
  "Забег окончен": "Run over",
  "Новый рекорд!": "New best!",
  "Волна": "Wave",
  "ВОЛНА": "WAVE",
  "ОЧКИ": "SCORE",
  "Ещё раз": "Again",
  "В лобби": "Lobby",
  "Пауза": "Paused",
  "Esc — продолжить": "Esc to resume",
  "БОСС": "BOSS",
  "Волна пройдена": "Wave clear",
  "Игровое поле": "Game field",
  "Бомба": "Bomb",
  "Не получилось запустить 3D": "Couldn't start 3D",
  "Браузер не даёт включить WebGL. Попробуйте другой браузер или включите аппаратное ускорение.": "Your browser won't enable WebGL. Try another browser or turn on hardware acceleration.",
  "Пропустить": "Skip",
  "Идёт вход в игру": "Entering the game",
  // главная
  "я": "I'm a",
  "ПРОГРАММИСТ": "PROGRAMMER",
  "пишу САЙТЫ": "I build WEBSITES",
  "..а человек я просто неплохой.": "..and I'm just a decent person.",
  "Я вайбкодер: придумываю идею, а ИИ помогает собрать её в код.": "I'm a vibe coder: I come up with the idea and AI helps me turn it into code.",
  "Сайты делаю, потому что мне это нравится.": "I build websites because I enjoy it.",
  "А ещё стараюсь быть добрым и честным с людьми. Ниже можно послушать музыку, которую ИИ написал для меня, и спросить что-нибудь у ИИ-поддержки.": "I also try to be kind and honest with people. Below you can listen to music the AI wrote for me and ask the AI support something.",
  "Слушать треки →": "Listen to tracks →",
  "Связь со мной": "Contact me",
  "маскот сайта": "site mascot",
  "страница не найдена": "the page is not found",
  "год первого жука-бага": "the year of the first bug",
  "пока 2": "just 2",
  "креатор MCP-серверов": "MCP server creator",
  "5 мин": "5 min",
  "«займёт» любая правка": "any change will \"take\"",
  "Делаю сайты не потому что надо, а потому что нравится. Музыку пишет ИИ по моей просьбе.": "I build websites not because I have to, but because I like it. The music is written by AI at my request.",
  "КРАТКО О NYAN": "NYAN IN BRIEF",
  // портфолио
  "мои": "my",
  "РАБОТЫ": "WORK",
  "// PORTFOLIO · сайты и MCP-серверы": "// PORTFOLIO · websites and MCP servers",
  "САЙТ": "SITE",
  "Анна Светлова, семейный психолог": "Anna Svetlova, family psychologist",
  "Сайт для индивидуальных и семейных консультаций.": "A website for individual and family counseling.",
  "Открыть →": "Open →",
  "BASELINE, дома под ключ": "BASELINE, turnkey homes",
  "Сайт строительной компании, которая строит дома под ключ.": "A website for a construction company that builds turnkey homes.",
  "Здрасьте, гости": "Hello, guests",
  "Сайт кафе в городе: меню, отзывы, контакты.": "A website for a city café: menu, reviews, contacts.",
  "Сайт фитнес-клуба с тренировками.": "A fitness club website with workouts.",
  "Учебный интернет-магазин одежды.": "A practice online clothing store.",
  "Hairbar, барбершоп": "Hairbar, barbershop",
  "Сайт стильного и модного барбершопа в Краснодаре.": "A website for a stylish, trendy barbershop in Krasnodar.",
  "Проверяет готовый сайт в настоящем браузере и находит проблемы с доступностью, скоростью, безопасностью и SEO.": "Checks a finished site in a real browser and finds problems with accessibility, speed, security and SEO.",
  "Превращает работу над кодом в RPG: уровень, опыт и квесты из реальных проблем в коде.": "Turns coding into an RPG: level, XP and quests built from real problems in the code.",
  // MCP
  "-серверы": "-servers",
  "// инструменты, которые я сделал": "// tools I have built",
  "Проверка сайтов": "Website checking",
  "Проверяет готовый сайт в настоящем браузере на разных размерах экрана и находит проблемы. К каждой находке прикладывает скриншот, чтобы ИИ мог сразу её исправить.": "Checks a finished site in a real browser at different screen sizes and finds problems. It attaches a screenshot to every finding so AI can fix it right away.",
  "Браузер Playwright": "Playwright browser",
  "Доступность": "Accessibility",
  "Скорость": "Speed",
  "Безопасность": "Security",
  "Игра для разработчика": "A game for developers",
  "Превращает работу над кодом в RPG: у проекта есть уровень, опыт и квесты из реальных проблем в коде. Опыт даётся только после того, как проверка подтвердила, что проблема исправлена.": "Turns coding into an RPG: the project has a level, XP and quests made from real problems in the code. XP is awarded only after the scanner confirms the problem is fixed.",
  "Уровни 1–50": "Levels 1–50",
  "Опыт и статы": "XP and stats",
  "Квесты из кода": "Quests from code",
  "Проверка сканером": "Scanner verification",
  // поддержка
  "ИИ-": "AI-",
  "ПОДДЕРЖКА": "SUPPORT",
  "Если что-то непонятно, спроси помощника. Он отвечает сразу, в любое время. Пока он работает по готовым ответам, настоящую нейросеть подключим позже.": "If something is unclear, ask the assistant. It answers instantly, any time. For now it works from ready-made answers; we'll connect a real neural network later.",
  "онлайн": "online",
  // подвал и чат
  "© 2026 NYAN · сделано на пикселях": "© 2026 NYAN · made of pixels",
  "Связь: Telegram": "Contact: Telegram",
  "ИИ-ПОДДЕРЖКА": "AI SUPPORT",
  "ЗВУК: ВКЛ": "SOUND: ON",
  "ЗВУК: ВЫКЛ": "SOUND: OFF",
  "ОК": "OK",
  // атрибуты (подписи, подсказки, альтернативный текст)
  "Пиксельный уголок NYAN: музыка, цитаты и ИИ-поддержка": "NYAN pixel corner: music, quotes and AI support",
  "Новости": "News",
  "NYAN, на главную": "NYAN, back to home",
  "Разделы": "Sections",
  "Включить тёмную тему": "Switch to dark theme",
  "Включить светлую тему": "Switch to light theme",
  "Сменить тему": "Change theme",
  "Пиксельный кот на тосте с радугой, глаза открыты": "Pixel cat on a toast with a rainbow, eyes open",
  "Пиксельный кот на тосте с радугой спит, глаза закрыты": "Pixel cat on a toast with a rainbow, asleep, eyes closed",
  "Музыкальный плеер": "Music player",
  "Прогресс трека": "Track progress",
  "Предыдущий трек": "Previous track",
  "Играть или пауза": "Play or pause",
  "Следующий трек": "Next track",
  "Нажми, чтобы сменить написание": "Click to change the spelling",
  "Скопировать ссылку": "Copy link",
  "Ссылка скопирована": "Link copied",
  "Скопировано": "Copied",
  "Не удалось скопировать": "Copy failed",
  "Мини-плеер": "Mini player",
  "Закрыть мини-плеер": "Close mini player",
  "Закрыть": "Close",
  "Сообщение": "Message",
  "Напиши вопрос...": "Type a question...",
  "Сменить язык": "Switch language",
  // заголовки вкладки
  "Портфолио — NYAN": "Portfolio — NYAN",
  "Поддержка — NYAN": "Support — NYAN",
  // меню треков
  "Треки": "Tracks", "Повтор трека": "Repeat track", "По порядку": "In order", "Случайно": "Shuffle", "← Назад": "← Back", "Плеер трека": "Track player", "Перемотка": "Seek", "Скорость": "Speed", "Аватарка трека": "Track cover", "Предыдущий фон": "Previous background", "Следующий фон": "Next background", "Без фона": "No background", "Ночной город": "Night city", "Фиолетовый лес": "Purple forest", "Сакура": "Cherry blossom", "Ретро-рабочий стол": "Retro desktop",
  "дождливый": "rainy", "ночной": "night", "сладкий": "sweet", "тихий": "quiet", "бодрый": "upbeat",
  "уютный": "cozy", "странный": "weird", "мечтательный": "dreamy", "быстрый": "fast", "грустный": "sad",
  // динамические тексты чата
  "печатает...": "typing...",
  "Привет! Я ИИ-помощник. Спроси про сайт, музыку или как связаться с оператором.": "Hi! I'm the AI assistant. Ask about the site, the music or how to reach the operator.",
  "Что-то пошло не так. Попробуй ещё раз или напиши оператору: ": "Something went wrong. Try again or message the operator: "
};

const I18N_REV = {};
Object.keys(I18N).forEach((k) => { I18N_REV[I18N[k]] = k; });

let lang = "ru";
try { const s = localStorage.getItem("nyan-lang"); if (s === "en" || s === "ru") lang = s; } catch (e) {}

// перевод строки для динамических текстов
function tr(ru) { return lang === "en" && I18N[ru] ? I18N[ru] : ru; }

function convert(value) {
  const key = value.trim();
  if (!key) return null;
  const to = lang === "en" ? I18N[key] : I18N_REV[key];
  return to === undefined ? null : value.replace(key, to);
}

const ATTRS = ["aria-label", "title", "alt", "placeholder"];

function applyLang() {
  document.documentElement.lang = lang;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    const p = n.parentElement;
    if (!p || p.closest("script, style, #log, #quick")) continue;
    const v = convert(n.nodeValue);
    if (v !== null) n.nodeValue = v;
  }
  document.querySelectorAll("[aria-label], [title], [alt], [placeholder]").forEach((el) => {
    ATTRS.forEach((a) => {
      if (!el.hasAttribute(a)) return;
      const v = convert(el.getAttribute(a));
      if (v !== null) el.setAttribute(a, v);
    });
  });
  const meta = document.querySelector('meta[name="description"]');
  if (meta) { const v = convert(meta.getAttribute("content")); if (v !== null) meta.setAttribute("content", v); }
  const btn = document.getElementById("lang");
  if (btn) {
    btn.querySelector(".lang__cur").textContent = lang.toUpperCase();
    btn.querySelector(".lang__next").textContent = lang === "ru" ? "EN" : "RU";
    btn.setAttribute("aria-label", tr("Сменить язык"));
    btn.title = tr("Сменить язык");
  }
  window.dispatchEvent(new Event("langchange"));
}

const langBtn = document.getElementById("lang");
if (langBtn) {
  langBtn.addEventListener("click", () => {
    lang = lang === "ru" ? "en" : "ru";
    try { localStorage.setItem("nyan-lang", lang); } catch (e) {}
    applyLang();
  });
}
applyLang();
