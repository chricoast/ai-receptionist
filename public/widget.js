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
  var label = lang === "cs" ? "Otevřít chat" : "Open chat";
  var closeLabel = lang === "cs" ? "Zavřít chat" : "Close chat";

  var style = document.createElement("style");
  style.textContent =
    // The lime smiley is the receptionist's mark; the chat window itself is neutral.
    ".air-btn{position:fixed;right:20px;bottom:20px;z-index:2147483000;width:60px;height:60px;border:0;border-radius:20px;" +
    "background:#c6f02e;color:#000;cursor:pointer;box-shadow:0 10px 24px rgba(0,0,0,.18);display:flex;align-items:center;" +
    "justify-content:center;padding:0;transform:rotate(-6deg);transition:transform .2s cubic-bezier(.34,1.56,.64,1)}" +
    ".air-btn:hover{transform:rotate(-6deg) scale(1.06)}" +
    ".air-btn:focus-visible{outline:3px solid #000;outline-offset:3px}" +
    ".air-btn svg{width:34px;height:34px}" +
    ".air-frame{position:fixed;right:20px;bottom:96px;z-index:2147483000;width:380px;height:min(620px,calc(100vh - 124px));" +
    "border:1px solid rgba(0,0,0,.08);border-radius:20px;box-shadow:0 20px 50px rgba(0,0,0,.14);background:#fff;display:none}" +
    "@media (max-width:480px){.air-frame{right:0;bottom:0;width:100%;height:100%;border-radius:0}" +
    ".air-open .air-btn{display:none}}";
  document.head.appendChild(style);

  var chatIcon =
    '<svg viewBox="0 0 30 30" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true">' +
    '<path d="M9 12.5c.6-1 1.8-1 2.4 0M18.6 12.5c.6-1 1.8-1 2.4 0"/><path d="M10 17.5c2.8 3 7.2 3 10 0"/></svg>';
  var closeIcon =
    '<svg viewBox="0 0 30 30" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true">' +
    '<path d="M10 10l10 10M20 10L10 20"/></svg>';

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
    // Lets the chat check for team replies only while it is open.
    if (frame.contentWindow) frame.contentWindow.postMessage({ type: "air:visibility", open: open }, origin);
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
