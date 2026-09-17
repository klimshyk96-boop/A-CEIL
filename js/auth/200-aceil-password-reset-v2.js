(function () {
  "use strict";
  if (window.__A_CEIL_PASSWORD_RESET_V2) return;
  window.__A_CEIL_PASSWORD_RESET_V2 = true;

  function client() {
    try { return (typeof _sb !== "undefined" && _sb) || window._sb || null; }
    catch (_) { return window._sb || null; }
  }

  function waitForClient(timeoutMs) {
    return new Promise(function (resolve, reject) {
      var started = Date.now();
      (function check() {
        var sb = client();
        if (sb) return resolve(sb);
        if (Date.now() - started >= timeoutMs) return reject(new Error("Немає з’єднання із сервером"));
        setTimeout(check, 120);
      })();
    });
  }

  function styleOnce() {
    if (document.getElementById("aceilPwResetStyle")) return;
    var style = document.createElement("style");
    style.id = "aceilPwResetStyle";
    style.textContent =
      "#aceilPwResetLink{display:block;text-align:right;margin:-8px 0 10px;font-size:13px;color:#93c5fd;cursor:pointer;text-decoration:underline}" +
      "#aceilPwResetOverlay{position:fixed;inset:0;background:rgba(15,23,42,.62);display:flex;align-items:center;justify-content:center;z-index:2147483646;padding:16px}" +
      "#aceilPwResetBox{background:#fff;border-radius:18px;padding:22px;max-width:370px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.35);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}" +
      "#aceilPwResetBox h3{margin:0 0 7px;font-size:19px;color:#0f172a}#aceilPwResetBox p{margin:0 0 14px;font-size:13px;color:#64748b;line-height:1.45}" +
      "#aceilPwResetBox input{width:100%;box-sizing:border-box;padding:12px;border-radius:11px;border:1.5px solid #cbd5e1;font-size:15px;margin-bottom:10px}" +
      "#aceilPwResetBox .row{display:flex;gap:8px;margin-top:4px}#aceilPwResetBox button{flex:1;padding:12px;border-radius:11px;border:0;font-weight:800;font-size:14px}" +
      "#aceilPwResetBox .primary{background:#2563eb;color:#fff}#aceilPwResetBox .secondary{background:#f1f5f9;color:#334155}" +
      "#aceilPwResetBox .msg{font-size:13px;margin-top:11px;min-height:18px}.msg.ok{color:#15803d}.msg.err{color:#b91c1c}";
    document.head.appendChild(style);
  }

  function close() { var el = document.getElementById("aceilPwResetOverlay"); if (el) el.remove(); }
  function message(text, error) {
    var el = document.getElementById("aceilPwResetMsg");
    if (!el) return;
    el.textContent = text || "";
    el.className = "msg " + (error ? "err" : "ok");
  }

  function requestForm() {
    styleOnce(); close();
    var overlay = document.createElement("div");
    overlay.id = "aceilPwResetOverlay";
    overlay.innerHTML = '<div id="aceilPwResetBox"><h3>Відновлення пароля</h3><p>Введіть email акаунта. На нього буде надіслано захищене посилання.</p><input type="email" id="aceilPwResetEmail" autocomplete="email" placeholder="email@example.com"><div class="row"><button type="button" class="secondary" id="aceilPwResetCancel">Скасувати</button><button type="button" class="primary" id="aceilPwResetSend">Надіслати</button></div><div class="msg" id="aceilPwResetMsg"></div></div>';
    document.body.appendChild(overlay);
    overlay.onclick = function (event) { if (event.target === overlay) close(); };
    document.getElementById("aceilPwResetCancel").onclick = close;
    var input = document.getElementById("aceilPwResetEmail");
    var login = document.getElementById("authEmail");
    if (login && /@/.test(login.value || "")) input.value = login.value;

    async function send() {
      var email = String(input.value || "").trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return message("Введіть коректний email.", true);
      var button = document.getElementById("aceilPwResetSend");
      button.disabled = true; button.textContent = "Надсилаємо…";
      try {
        var sb = await waitForClient(12000);
        var result = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
        if (result.error) throw result.error;
        message("Якщо такий акаунт існує, лист уже надіслано. Перевірте також папку «Спам».", false);
      } catch (error) {
        message("Не вдалося надіслати лист: " + (error && error.message || error), true);
      } finally {
        button.disabled = false; button.textContent = "Надіслати";
      }
    }
    document.getElementById("aceilPwResetSend").onclick = send;
    input.onkeydown = function (event) { if (event.key === "Enter") send(); };
    setTimeout(function () { input.focus(); }, 80);
  }

  function newPasswordForm() {
    styleOnce(); close();
    var overlay = document.createElement("div");
    overlay.id = "aceilPwResetOverlay";
    overlay.innerHTML = '<div id="aceilPwResetBox"><h3>Новий пароль</h3><p>Введіть новий пароль двічі.</p><input type="password" id="aceilPwNew1" autocomplete="new-password" placeholder="Новий пароль"><input type="password" id="aceilPwNew2" autocomplete="new-password" placeholder="Повторіть пароль"><div class="row"><button type="button" class="primary" id="aceilPwNewSave">Зберегти пароль</button></div><div class="msg" id="aceilPwResetMsg"></div></div>';
    document.body.appendChild(overlay);
    document.getElementById("aceilPwNewSave").onclick = async function () {
      var first = document.getElementById("aceilPwNew1").value || "";
      var second = document.getElementById("aceilPwNew2").value || "";
      if (first.length < 8) return message("Пароль має містити щонайменше 8 символів.", true);
      if (first !== second) return message("Паролі не збігаються.", true);
      var button = this; button.disabled = true; button.textContent = "Зберігаємо…";
      try {
        var sb = await waitForClient(12000);
        var result = await sb.auth.updateUser({ password: first });
        if (result.error) throw result.error;
        message("Пароль змінено. Зараз відкриється A·CEIL…", false);
        setTimeout(function () { location.replace(location.origin + location.pathname); }, 1200);
      } catch (error) {
        message("Не вдалося змінити пароль: " + (error && error.message || error), true);
        button.disabled = false; button.textContent = "Зберегти пароль";
      }
    };
  }

  function inject() {
    if (document.getElementById("aceilPwResetLink")) return;
    var row = document.getElementById("rememberRow");
    if (!row || !row.parentNode) return;
    var link = document.createElement("button");
    link.type = "button"; link.id = "aceilPwResetLink"; link.textContent = "Забули пароль?";
    link.style.background = "none"; link.style.border = "0"; link.style.boxShadow = "none";
    link.onclick = requestForm;
    row.parentNode.insertBefore(link, row.nextSibling);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", inject, { once: true });
  else inject();

  (async function () {
    try {
      var sb = await waitForClient(15000);
      sb.auth.onAuthStateChange(function (event) { if (event === "PASSWORD_RECOVERY") newPasswordForm(); });
    } catch (_) {}
  })();
})();
