"use strict";

/* =====================================================
   ИМИТАЦИЯ ИИ-ПОДДЕРЖКИ
   ===================================================== */
const OPERATOR = "Telegram @fopa";
const RULES = [
  { re: /привет|здравств|добр(ый|ое)|хай|hello|\bhi\b|\bhey\b|good (morning|day|evening)/,
    a: "Привет! Я ИИ-помощник NYAN. Могу рассказать про сайт, музыку и как со мной связаться.",
    en: "Hi! I'm NYAN's AI assistant. I can tell you about the site, the music and how to reach me." },
  { re: /не игра|нет звука|не слышу|тихо|громк|no sound|can't hear|cannot hear|too quiet|too loud|volume/,
    a: "Музыка сама не включается: нажми кнопку Play в плеере. Проверь, что звук на вкладке и в системе включён.",
    en: "The music doesn't start by itself: press Play in the player. Make sure the sound is on in the tab and in your system." },
  { re: /музык|песн|трек|играет|плеер|звук|мелоди|music|song|track|player|sound|melod/,
    a: "Музыку я сочиняю прямо в браузере: десять треков, кнопки << и >> переключают их. Чтобы включить, нажми Play в плеере, сама она не запускается.",
    en: "The music is composed right in the browser: ten tracks, the << and >> buttons switch them. Press Play in the player to start it; it never starts on its own." },
  { re: /сайт|nyan|нян|фопка|fopka|что тут|что здесь|о чем|о чём|\bsite\b|website|what.*here|what is this|about/,
    a: "NYAN — пиксельный уголок: музыка, цитаты и ИИ-поддержка. Сайт сделан вручную в пиксельном стиле.",
    en: "NYAN is a pixel corner: music, quotes and AI support. The site is built by hand in a pixel style." },
  { re: /новост|news/,
    a: "Новости сверху — шуточные, всё выдумано. Любое совпадение с реальностью случайно.",
    en: "The news on top is a joke, everything is made up. Any resemblance to reality is accidental." },
  { re: /контакт|оператор|человек|менеджер|связ|автор|админ|contact|operator|human|manager|admin|author/,
    a: "Оператор на связи: " + OPERATOR + ".",
    en: "The operator is available: " + OPERATOR + "." },
  { re: /спасиб|благодар|пока|до свидан|thank|bye|goodbye/,
    a: "Рад помочь! Если появятся вопросы, пиши в любое время.",
    en: "Glad to help! Ask me anything, any time." }
];
const FALLBACK = {
  ru: "Не уверен, что понял вопрос. Передам оператору: " + OPERATOR + ". Или переформулируй, попробую ещё раз.",
  en: "I'm not sure I understood. I'll pass it to the operator: " + OPERATOR + ". Or rephrase and I'll try again."
};
const QUICK = {
  ru: ["Что тут есть?", "Как включить музыку?", "Связаться с оператором"],
  en: ["What's here?", "How do I start the music?", "Contact the operator"]
};

// Единственное место, которое надо заменить, чтобы подключить настоящий ИИ.
async function getReply(text) {
  const q = text.toLowerCase();
  const hit = RULES.find((r) => r.re.test(q));
  return hit ? (lang === "en" ? hit.en : hit.a) : FALLBACK[lang];
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let busy = false;

function addMsg(who, text = "") {
  const el = document.createElement("div");
  el.className = "msg msg--" + who;
  el.textContent = text;
  $("log").appendChild(el);
  $("log").scrollTop = $("log").scrollHeight;
  return el;
}

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// текст печатается по буквам, на каждую буквы играет «бип»
async function typeInto(el, text) {
  el.classList.remove("msg--typing");
  el.textContent = "";
  if (reduceMotion) { el.textContent = text; return; }
  for (let i = 0; i < text.length; i++) {
    // чат закрыли: дописываем остаток молча и сразу
    if ($("modal").hidden) { el.textContent = text; return; }
    const ch = text[i];
    el.textContent += ch;
    if (ch.trim() && !/[.,!?;:\-—…]/.test(ch)) blip();
    $("log").scrollTop = $("log").scrollHeight;
    await sleep(/[.!?]/.test(ch) ? 220 : /[,;:]/.test(ch) ? 110 : 34);
  }
}

async function send(text) {
  text = text.trim();
  if (!text || busy) return;
  busy = true;
  addMsg("me", text);
  const bot = addMsg("bot", tr("печатает..."));
  bot.classList.add("msg--typing");
  try {
    const [reply] = await Promise.all([getReply(text), sleep(700)]);
    await typeInto(bot, reply);
  } catch (e) {
    await typeInto(bot, tr("Что-то пошло не так. Попробуй ещё раз или напиши оператору: ") + OPERATOR);
  }
  busy = false;
}

function renderQuick() {
  $("quick").innerHTML = QUICK[lang].map((q) => `<button class="chip" type="button">${q}</button>`).join("");
}

function openChat(e) {
  chatOpener = e && e.currentTarget ? e.currentTarget : $("openChat");
  $("modal").hidden = false;
  if (!$("log").children.length) {
    renderQuick();
    busy = true;
    typeInto(addMsg("bot"), tr("Привет! Я ИИ-помощник. Спроси про сайт, музыку или как связаться с оператором.")).then(() => { busy = false; });
  }
  $("input").focus();
}
let chatOpener = null;
function closeChat() {
  $("modal").hidden = true;
  if (chatOpener) chatOpener.focus();
}

const soundBtn = $("sound");
function showSound() {
  soundBtn.textContent = tr(soundOn ? "ЗВУК: ВКЛ" : "ЗВУК: ВЫКЛ");
  soundBtn.setAttribute("aria-pressed", String(soundOn));
}
showSound();
window.addEventListener("langchange", () => { showSound(); if ($("log").children.length) renderQuick(); });
soundBtn.addEventListener("click", () => {
  soundOn = !soundOn;
  showSound();
  try { localStorage.setItem("nyan-blip", soundOn ? "on" : "off"); } catch (e) {}
  blip();
});

if ($("openChat")) $("openChat").addEventListener("click", openChat);
if ($("heroChat")) $("heroChat").addEventListener("click", openChat);
document.querySelectorAll("[data-close]").forEach((el) => el.addEventListener("click", closeChat));
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("modal").hidden) closeChat(); });
$("form").addEventListener("submit", (e) => {
  e.preventDefault();
  const v = $("input").value;
  $("input").value = "";
  send(v);
});
$("quick").addEventListener("click", (e) => {
  if (e.target.classList.contains("chip")) send(e.target.textContent);
});
