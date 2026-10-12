/*
 * AI Receptionist: website chat bubble.
 * Usage: <script src="https://YOUR-APP/widget.js" data-key="wc_..." async></script>
 * Shows a chat button; the chat itself runs in an iframe served by our app.
 */
(function () {
  "use strict";
  var script = document.currentScript;
  if (!script || window.__aiReceptionistLoaded) return;
  var key = script.getAttribute("data-key");
  if (!key) return;
  window.__aiReceptionistLoaded = true;

  var origin = new URL(script.src).origin;
  var lang = (script.getAttribute("data-lang") || navigator.language || "cs").slice(0, 2).toLowerCase();
  if (lang !== "cs" && lang !== "en") lang = lang === "sk" ? "cs" : "en";
  var color = script.getAttribute("data-color") || "#0b8467";
  var label = lang === "cs" ? "Otevřít chat" : "Open chat";
  var closeLabel = lang === "cs" ? "Zavřít chat" : "Close chat";

  var style = document.createElement("style");
  style.textContent =
    ".air-btn{position:fixed;right:20px;bottom:20px;z-index:2147483000;width:60px;height:60px;border:0;border-radius:50%;" +
    "background:" + color + ";color:#fff;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;padding:0}" +
    ".air-btn:focus-visible{outline:3px solid #fff;outline-offset:2px}" +
    ".air-btn svg{width:28px;height:28px}" +
    ".air-frame{position:fixed;right:20px;bottom:92px;z-index:2147483000;width:380px;height:min(620px,calc(100vh - 120px));" +
    "border:0;border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.25);background:#fff;display:none}" +
    "@media (max-width:480px){.air-frame{right:0;bottom:0;width:100%;height:100%;border-radius:0}" +
    ".air-open .air-btn{display:none}}";
  document.head.appendChild(style);

  var chatIcon =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M21 12a8 8 0 0 1-11.8 7L4 20l1.1-4.6A8 8 0 1 1 21 12z"/></svg>';
  var closeIcon =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">' +
    '<path d="M6 6l12 12M18 6L6 18"/></svg>';

  var button = document.createElement("button");
  button.type = "button";
  button.className = "air-btn";
  button.setAttribute("aria-label", label);
  button.setAttribute("aria-expanded", "false");
  button.innerHTML = chatIcon;

  var frame = null;
  var open = false;

  function toggle() {
    if (!frame) {
      frame = document.createElement("iframe");
      frame.className = "air-frame";
      frame.title = "Chat";
      frame.setAttribute("allow", "clipboard-write");
      frame.src = origin + "/widget/" + encodeURIComponent(key) + "?lang=" + lang;
      document.body.appendChild(frame);
    }
    open = !open;
    frame.style.display = open ? "block" : "none";
    document.documentElement.classList.toggle("air-open", open);
    button.innerHTML = open ? closeIcon : chatIcon;
    button.setAttribute("aria-label", open ? closeLabel : label);
    button.setAttribute("aria-expanded", String(open));
    if (!open) button.focus();
  }

  button.addEventListener("click", toggle);
  window.addEventListener("message", function (event) {
    if (event.origin !== origin || !event.data || event.data.type !== "air:close") return;
    if (open) toggle();
  });

  function mount() {
    document.body.appendChild(button);
  }
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();
