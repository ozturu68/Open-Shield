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

  function isPrivateIPv4(ip) {
    if (!ip || ip.includes(":")) return false;
    const parts = ip.split(".");
    if (parts.length !== 4) return false;
    const b0 = parseInt(parts[0], 10), b1 = parseInt(parts[1], 10);
    if (b0 === 10) return true;
    if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;
    if (b0 === 192 && b1 === 168) return true;
    if (b0 === 127) return true;
    return b0 === 0;
  }
  function isPrivateIPv6(ip) {
    if (!ip || !ip.includes(":")) return false;
    const lower = ip.toLowerCase();
    return lower.startsWith("fe80:") || lower.startsWith("fc") || lower.startsWith("fd") || lower === "::1" || lower.startsWith("::1%");
  }

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
            if (ip && !isPrivateIPv4(ip) && !isPrivateIPv6(ip)) {
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
