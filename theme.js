"use strict";

// переключатель темы (светлая / тёмная); после обновления страницы всегда светлая
const themeBtn = document.getElementById("theme");
const root = document.documentElement;
function applyTheme(mode) {
  root.setAttribute("data-theme", mode);
  themeBtn.setAttribute("aria-pressed", String(mode === "dark"));
  themeBtn.setAttribute("aria-label", tr(mode === "dark" ? "Включить светлую тему" : "Включить тёмную тему"));
  tagLinks(mode);
}
// тема передаётся в ссылках (?theme=...), так она переходит между страницами даже там, где браузер не делит localStorage между файлами
function tagLinks(mode) {
  document.querySelectorAll("a[href]").forEach((a) => {
    const h = a.getAttribute("href");
    if (/^(https?:|mailto:|tel:|#)/.test(h)) return;
    const [path, hash = ""] = h.split("#");
    const base = path.replace(/[?&]theme=(dark|light)/, "");
    a.setAttribute("href", base + (base.includes("?") ? "&" : "?") + "theme=" + mode + (hash ? "#" + hash : ""));
  });
}
applyTheme(root.getAttribute("data-theme") === "dark" ? "dark" : "light");
window.addEventListener("langchange", () => applyTheme(root.getAttribute("data-theme") === "dark" ? "dark" : "light"));
themeBtn.addEventListener("click", () => {
  const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
  applyTheme(next);
});

