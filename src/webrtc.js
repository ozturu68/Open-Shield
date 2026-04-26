/**
 * WebRTC Leak Prevention
 * Injected into MAIN world at document_start.
 * Prevents sites from obtaining local IP addresses via WebRTC.
 */
(function () {
  "use strict";

  if (window.__osWebRTC) return;
  window.__osWebRTC = true;

  const orig = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
  if (!orig) return;

  function WrappedRTCPeerConnection(...args) {
    const pc = new orig(...args);
    // Block legacy getStats that leaks IPs
    const origGetStats = pc.getStats.bind(pc);
    pc.getStats = function(selector) {
      return origGetStats(selector).then(report => {
        // Remove candidate stats that contain local IPs
        const filtered = new Map();
        report.forEach((stat, id) => {
          if (stat.type === "local-candidate" || stat.type === "remote-candidate") {
            const ip = stat.ip || stat.address;
            if (ip && !ip.includes(":") && !ip.startsWith("192.168.") && !ip.startsWith("10.") && !ip.startsWith("172.")) {
              filtered.set(id, stat);
            }
            return;
          }
          filtered.set(id, stat);
        });
        return filtered;
      });
    };
    return pc;
  }

  Object.setPrototypeOf(WrappedRTCPeerConnection, orig);
  WrappedRTCPeerConnection.prototype = orig.prototype;

  // Copy static properties
  for (const key of Object.keys(orig)) {
    try { WrappedRTCPeerConnection[key] = orig[key]; } catch {}
  }

  window.RTCPeerConnection = WrappedRTCPeerConnection;
  if (window.webkitRTCPeerConnection) window.webkitRTCPeerConnection = WrappedRTCPeerConnection;
  if (window.mozRTCPeerConnection) window.mozRTCPeerConnection = WrappedRTCPeerConnection;
})();
