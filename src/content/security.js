/**
 * XSS & Clickjacking Protection
 * ISOLATED world content script — runs at document_start.
 * Detects transparent overlays (clickjacking) and reflected XSS patterns.
 * Anti-debugging detection when combined with other suspicious patterns.
 */
(function () {
  "use strict";

  const STYLE_ID = "__osSecurity";
  const BANNER_ID = "__osSecurityBanner";

  function detectClickjackingOverlay() {
    const all = document.querySelectorAll("div, iframe, section, span");
    for (const el of all) {
      const style = window.getComputedStyle(el);
      if (style.position !== "fixed" && style.position !== "absolute") continue;
      const opacity = parseFloat(style.opacity);
      if (opacity > 0 && opacity < 0.05) {
        const rect = el.getBoundingClientRect();
        const viewW = window.innerWidth;
        const viewH = window.innerHeight;
        if (rect.width > viewW * 0.3 && rect.height > viewH * 0.3) {
          return el;
        }
      }
    }
    return null;
  }

  function detectReflectedXSS() {
    try {
      const qs = location.search;
      if (!qs) return false;
      const lower = qs.toLowerCase();
      const patterns = [
        "<script","<img","<svg","<iframe","<object","<embed",
        "onerror=","onload=","onclick=","onmouseover=","onfocus=",
        "javascript:","data:text/html","eval(","expression(",
        "document.cookie","document.write","window.location"
      ];
      for (const p of patterns) {
        if (lower.includes(p)) return true;
      }
      const params = new URLSearchParams(location.search);
      let html = document.documentElement?.outerHTML || "";
      html = html.substring(0, 50000);
      for (const [, v] of params) {
        if (v.length < 4) continue;
        if (v.includes("<") && html.includes(v.substring(0, Math.min(v.length, 200)))) {
          return true;
        }
      }
      return false;
    } catch { return false; }
  }

  function detectAntiDebug() {
    return (window.outerWidth - window.innerWidth > 100) ||
           (window.outerHeight - window.innerHeight > 100);
  }

  function showWarning(type) {
    if (document.getElementById(BANNER_ID)) return;
    const banner = document.createElement("div");
    banner.id = BANNER_ID;
    const messages = {
      clickjack: "This page contains a transparent overlay that may be trying to hijack your clicks.",
      xss: "Suspicious script patterns detected on this page.",
      antiDebug: "This page may be using anti-debugging techniques."
    };
    banner.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:2147483647;background:#d93025;color:#fff;padding:10px 16px;font-family:-apple-system,system-ui,sans-serif;font-size:13px;display:flex;align-items:center;justify-content:space-between;gap:12px;box-shadow:0 2px 8px rgba(0,0,0,.3)";
    const msgSpan = document.createElement("span");
    const strong = document.createElement("strong");
    strong.textContent = "openShield Warning: ";
    msgSpan.appendChild(strong);
    msgSpan.appendChild(document.createTextNode(messages[type] || "Suspicious activity detected."));
    banner.appendChild(msgSpan);
    const dismissBtn = document.createElement("button");
    dismissBtn.id = "__osDismiss";
    dismissBtn.style.cssText = "background:rgba(255,255,255,.2);color:#fff;border:1px solid rgba(255,255,255,.3);border-radius:4px;padding:4px 12px;font-size:12px;cursor:pointer;white-space:nowrap";
    dismissBtn.textContent = "Dismiss";
    banner.appendChild(dismissBtn);
    (document.body || document.documentElement).appendChild(banner);
    document.getElementById("__osDismiss").addEventListener("click", function() {
      banner.remove();
      chrome.runtime.sendMessage({ type: "SECURITY_ALERT_DISMISSED" }).catch(() => {});
    });
    chrome.runtime.sendMessage({ type: "SECURITY_ALERT", alertType: type, url: location.href }).catch(() => {});
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const el = document.createElement("style");
    el.id = STYLE_ID;
    el.textContent = "#__osSecurityBanner ~ * { filter: none !important }";
    const target = document.head || document.documentElement;
    if (target) target.appendChild(el);
  }

  let runCalled = false;
  function run() {
    if (runCalled) return;
    runCalled = true;
    injectStyle();

    const overlay = detectClickjackingOverlay();
    const hasXSS = detectReflectedXSS();
    if (overlay) showWarning("clickjack");
    if (hasXSS) showWarning("xss");
    if (detectAntiDebug() && (overlay || hasXSS)) showWarning("antiDebug");
  }

  if (document.readyState !== "loading") {
    setTimeout(run, 100);
  } else {
    document.addEventListener("DOMContentLoaded", function() { setTimeout(run, 200); }, { once: true });
  }
})();
