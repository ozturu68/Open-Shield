/**
 * Beacon & Ping Blocker
 * Injected into MAIN world at document_start.
 * Blocks navigator.sendBeacon and disables the Ping resource type via fetch override.
 */
(function () {
  "use strict";

  if (window.__osBeacon) return;
  window.__osBeacon = true;

  // Block sendBeacon
  if (navigator.sendBeacon) {
    navigator.sendBeacon = function() { return false; };
    try {
      Object.defineProperty(navigator, "sendBeacon", {
        value: navigator.sendBeacon,
        writable: false,
        configurable: false
      });
    } catch {}
  }

  // Block ping via fetch by filtering keepalive requests
  const origFetch = window.fetch;
  if (origFetch) {
    window.fetch = function(url, options) {
      if (options && options.keepalive) {
        return Promise.resolve(new Response(null, { status: 204 }));
      }
      return origFetch.apply(this, arguments);
    };
  }

  // Block XMLHttpRequest ping
  const origXhr = window.XMLHttpRequest;
  if (origXhr) {
    const origOpen = origXhr.prototype.open;
    origXhr.prototype.open = function(method, url) {
      if (url && String(url).endsWith("/ping")) {
        this.__osBlocked = true;
      }
      return origOpen.apply(this, arguments);
    };
    const origSend = origXhr.prototype.send;
    origXhr.prototype.send = function() {
      if (this.__osBlocked) return;
      return origSend.apply(this, arguments);
    };
  }
})();
