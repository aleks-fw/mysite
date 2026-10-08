"use strict";

// кнопка «Копировать»: кладёт ссылку в буфер обмена, чтобы вставить её, например, в чат с ИИ
function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
  return new Promise((resolve, reject) => {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;top:0;left:0;opacity:0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (e) {}
    ta.remove();
    ok ? resolve() : reject(new Error("copy failed"));
  });
}

document.querySelectorAll(".copy").forEach((btn) => {
  let timer = null;
  btn.addEventListener("click", async () => {
    let ok = true;
    try { await copyText(btn.dataset.copy); } catch (e) { ok = false; }
    btn.classList.toggle("is-done", ok);
    btn.setAttribute("aria-label", tr(ok ? "Ссылка скопирована" : "Не удалось скопировать"));
    btn.title = tr(ok ? "Скопировано" : "Не удалось скопировать");
    clearTimeout(timer);
    timer = setTimeout(() => {
      btn.classList.remove("is-done");
      btn.setAttribute("aria-label", tr("Скопировать ссылку"));
      btn.title = tr("Скопировать ссылку");
    }, 1800);
  });
});

// метка «MCP» в шапке окна: по нажатию написание меняется на русское «МСП» и обратно
document.querySelectorAll(".win__tag").forEach((tag) => {
  let ru = false;
  tag.addEventListener("click", () => {
    ru = !ru;
    tag.textContent = ru ? "МСП" : "MCP";
  });
});
