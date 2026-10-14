/*
 * AI Receptionist: website chat bubble.
 * Usage: <script src="https://YOUR-APP/widget.js" data-key="wc_..." async></script>
 * Optional: data-lang="cs|en", data-label="Text next to the bubble" ("" hides it).
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
  var cs = lang === "cs";
  var label = cs ? "Otevřít chat" : "Open chat";
  var closeLabel = cs ? "Zavřít chat" : "Close chat";
  var custom = script.getAttribute("data-label");
  var invite = custom !== null ? custom : cs ? "Napište nám" : "Chat with us";
  var chatUrl = origin + "/widget/" + encodeURIComponent(key) + "?lang=" + lang;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var style = document.createElement("style");
  style.textContent =
    // The lime smiley is the receptionist's mark; the chat window itself is neutral.
    ".air-btn{position:fixed;right:20px;bottom:20px;z-index:2147483000;display:flex;align-items:center;gap:12px;" +
    "border:0;background:none;padding:0;margin:0;cursor:pointer;font:600 15px/1.2 ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;color:#111}" +
    ".air-btn:focus-visible{outline:none}.air-btn:focus-visible .air-face{outline:3px solid #000;outline-offset:3px}" +
    ".air-label{background:#fff;color:#111;padding:11px 16px;border-radius:999px 999px 6px 999px;" +
    "box-shadow:0 8px 24px rgba(0,0,0,.14),0 0 0 1px rgba(0,0,0,.06);white-space:nowrap;" +
    "opacity:0;transform:translateX(8px);transition:opacity .35s ease,transform .35s cubic-bezier(.34,1.56,.64,1)}" +
    ".air-ready .air-label{opacity:1;transform:none}" +
    ".air-btn:hover .air-label{transform:translateX(-2px)}" +
    ".air-open .air-label{display:none}" +
    ".air-face{position:relative;flex:none;width:60px;height:60px;border-radius:20px;background:#c6f02e;color:#000;" +
    "display:flex;align-items:center;justify-content:center;box-shadow:0 10px 24px rgba(0,0,0,.18);transform:rotate(-6deg);" +
    "transition:transform .3s cubic-bezier(.34,1.56,.64,1)}" +
    ".air-face svg{width:36px;height:36px;overflow:visible}" +
    ".air-face .air-calm,.air-face .air-awake{transition:opacity .18s ease,transform .3s cubic-bezier(.34,1.56,.64,1);transform-origin:15px 15px}" +
    ".air-face .air-awake{opacity:0;transform:scale(.6)}" +
    // Awake: eyes open, mouth opens, a little bounce (hover, keyboard focus, or a tap).
    ".air-btn:hover .air-face,.air-btn:focus-visible .air-face,.air-wake .air-face{transform:rotate(3deg) scale(1.08)}" +
    ".air-btn:hover .air-calm,.air-btn:focus-visible .air-calm,.air-wake .air-calm{opacity:0;transform:scale(1.3)}" +
    ".air-btn:hover .air-awake,.air-btn:focus-visible .air-awake,.air-wake .air-awake{opacity:1;transform:none}" +
    ".air-open .air-face{transform:rotate(-6deg)}" +
    ".air-open .air-calm,.air-open .air-awake{display:none}.air-x{display:none}.air-open .air-x{display:block}" +
    ".air-frame{position:fixed;right:20px;bottom:96px;z-index:2147483000;width:380px;height:min(620px,calc(100vh - 124px));" +
    "border:1px solid rgba(0,0,0,.08);border-radius:20px;box-shadow:0 20px 50px rgba(0,0,0,.14);background:#fff;display:none;color-scheme:light}" +
    ".air-fallback{position:fixed;right:20px;bottom:96px;z-index:2147483000;width:300px;padding:18px;border-radius:20px;background:#fff;color:#111;" +
    "box-shadow:0 20px 50px rgba(0,0,0,.14),0 0 0 1px rgba(0,0,0,.06);font:15px/1.4 ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif}" +
    ".air-fallback a{display:inline-block;margin-top:10px;padding:10px 14px;border-radius:12px;background:#111;color:#fff;text-decoration:none;font-weight:600}" +
    "@media (max-width:480px){.air-frame{right:0;bottom:0;width:100%;height:100%;border-radius:0;border:0}" +
    ".air-open .air-btn{display:none}.air-btn{right:16px;bottom:16px}.air-label{font-size:14px;padding:10px 14px}}" +
    "@media (max-width:340px){.air-label{display:none}}" +
    "@media (prefers-reduced-motion:reduce){.air-btn *{transition:none!important}}";
  document.head.appendChild(style);

  // Calm face: happy closed eyes and a smile. Awake face: open eyes and an open mouth.
  var faceIcon =
    '<svg viewBox="0 0 30 30" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true">' +
    '<g class="air-calm"><path d="M9 12.5c.6-1 1.8-1 2.4 0M18.6 12.5c.6-1 1.8-1 2.4 0"/><path d="M10 17.5c2.8 3 7.2 3 10 0"/></g>' +
    '<g class="air-awake"><circle cx="10.2" cy="12" r="1.9" fill="currentColor" stroke="none"/>' +
    '<circle cx="19.8" cy="12" r="1.9" fill="currentColor" stroke="none"/>' +
    '<path d="M10.5 17h9c0 3-2 4.8-4.5 4.8s-4.5-1.8-4.5-4.8z" fill="currentColor" stroke-width="1.6" stroke-linejoin="round"/></g>' +
    '<path class="air-x" d="M10 10l10 10M20 10L10 20" stroke-width="2.6"/></svg>';

  var button = document.createElement("button");
  button.type = "button";
  button.className = "air-btn";
  button.setAttribute("aria-label", label);
  button.setAttribute("aria-expanded", "false");
  button.innerHTML =
    (invite ? '<span class="air-label" aria-hidden="true"></span>' : "") + '<span class="air-face">' + faceIcon + "</span>";
  if (invite) button.querySelector(".air-label").textContent = invite;

  var frame = null;
  var fallback = null;
  var loaded = false;
  var open = false;
  var wakeTimer = null;

  function wake(ms) {
    button.classList.add("air-wake");
    clearTimeout(wakeTimer);
    wakeTimer = setTimeout(function () { button.classList.remove("air-wake"); }, ms);
  }

  // If the chat window doesn't report back, offer to open the chat in a new tab instead of a blank box.
  function showFallback() {
    if (loaded || !open) return;
    if (frame) frame.style.display = "none";
    fallback = document.createElement("div");
    fallback.className = "air-fallback";
    fallback.setAttribute("role", "status");
    var text = document.createElement("div");
    text.textContent = cs ? "Chat se nepodařilo načíst." : "The chat couldn't load.";
    var link = document.createElement("a");
    link.href = chatUrl;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = cs ? "Otevřít chat v novém okně" : "Open the chat in a new tab";
    fallback.appendChild(text);
    fallback.appendChild(link);
    document.body.appendChild(fallback);
  }

  function toggle() {
    if (!frame) {
      frame = document.createElement("iframe");
      frame.className = "air-frame";
      frame.title = "Chat";
      frame.setAttribute("allow", "clipboard-write");
      frame.src = chatUrl;
      document.body.appendChild(frame);
      setTimeout(showFallback, 12000);
    }
    open = !open;
    if (fallback) fallback.style.display = open ? "block" : "none";
    frame.style.display = open && !fallback ? "block" : "none";
    // Lets the chat check for team replies only while it is open.
    if (frame.contentWindow) frame.contentWindow.postMessage({ type: "air:visibility", open: open }, origin);
    document.documentElement.classList.toggle("air-open", open);
    button.setAttribute("aria-label", open ? closeLabel : label);
    button.setAttribute("aria-expanded", String(open));
    if (!open) button.focus();
  }

  button.addEventListener("click", toggle);
  // Phones have no hover: wake the face up as soon as it's touched.
  button.addEventListener("touchstart", function () { wake(700); }, { passive: true });
  window.addEventListener("message", function (event) {
    if (event.origin !== origin || !event.data) return;
    if (event.data.type === "air:ready") {
      loaded = true;
      if (fallback) { fallback.remove(); fallback = null; if (open && frame) frame.style.display = "block"; }
    }
    if (event.data.type === "air:close" && open) toggle();
  });

  function mount() {
    document.body.appendChild(button);
    // Say hello: the label slides in, and the face wakes up once.
    setTimeout(function () {
      button.classList.add("air-ready");
      if (!reduce) wake(1200);
    }, 1200);
  }
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();
