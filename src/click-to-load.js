/**
 * Click-to-Load Social Media Embed Protection
 * ISOLATED world content script — runs at document_start.
 * Blocks social media embed iframes and replaces with click-to-load placeholders.
 */
(function () {
  "use strict";

  const iframeSelector = [
    "iframe[src*='facebook.com']","iframe[src*='connect.facebook.net']",
    "iframe[src*='platform.twitter.com']","iframe[src*='syndication.twitter.com']",
    "iframe[src*='youtube.com/embed']","iframe[src*='youtube-nocookie.com/embed']",
    "iframe[src*='instagram.com']",
    "iframe[src*='tiktok.com/embed']",
    "iframe[src*='platform.linkedin.com']",
    "iframe[src*='redditmedia.com']",
    "iframe[src*='disqus.com']",
    "iframe[src*='pinterest.com']",
    "iframe[src*='soundcloud.com']",
    "iframe[src*='vimeo.com']",
    "iframe[src*='spotify.com/embed']",
    "iframe[src*='dailymotion.com/embed']",
    "iframe[src*='player.twitch.tv']",
    "iframe[src*='snapchat.com/embed']"
  ].join(",");

  const PLACEHOLDER_ID = "__osCtlPlaceholder";
  const STYLE_ID = "__osCtlStyle";

  function getServiceName(src) {
    try {
      const host = new URL(src, location.href).hostname;
      if (host.includes("facebook")) return "Facebook content";
      if (host.includes("twitter")) return "Twitter content";
      if (host.includes("youtube") || host.includes("youtube-nocookie")) return "YouTube video";
      if (host.includes("instagram")) return "Instagram content";
      if (host.includes("tiktok")) return "TikTok content";
      if (host.includes("linkedin")) return "LinkedIn content";
      if (host.includes("reddit")) return "Reddit content";
      if (host.includes("disqus")) return "Disqus comments";
      if (host.includes("pinterest")) return "Pinterest content";
      if (host.includes("soundcloud")) return "SoundCloud audio";
      if (host.includes("vimeo")) return "Vimeo video";
      if (host.includes("spotify")) return "Spotify content";
      if (host.includes("dailymotion")) return "Dailymotion video";
      if (host.includes("twitch")) return "Twitch content";
      if (host.includes("snapchat")) return "Snapchat content";
    } catch {}
    return "embedded content";
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const el = document.createElement("style");
    el.id = STYLE_ID;
    el.textContent = `
      .__osCtlOverlay{position:absolute;inset:0;background:rgba(0,0,0,.03);display:flex;align-items:center;justify-content:center;z-index:1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif}
      .__osCtlBtn{background:#1a73e8;color:#fff;border:none;border-radius:6px;padding:8px 18px;font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px}
      .__osCtlBtn:hover{background:#1557b0}
      .__osCtlBtn svg{width:14px;height:14px}
    `;
    const target = document.head || document.documentElement;
    if (target) target.appendChild(el);
  }

  function createPlaceholder(originalSrc) {
    const wrapper = document.createElement("div");
    wrapper.setAttribute("data-os-placeholder", "1");

    const overlay = document.createElement("div");
    overlay.className = "__osCtlOverlay";

    const btn = document.createElement("button");
    btn.className = "__osCtlBtn";
    const svgSpan = document.createElement("span");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2.5");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    polygon.setAttribute("points", "5 3 19 12 5 21 5 3");
    svg.appendChild(polygon);
    svgSpan.appendChild(svg);
    btn.appendChild(svgSpan);
    btn.appendChild(document.createTextNode(" Click to load " + getServiceName(originalSrc)));
    overlay.appendChild(btn);
    wrapper.appendChild(overlay);

    btn.addEventListener("click", function(e) {
      e.preventDefault();
      e.stopPropagation();
      loadEmbed(wrapper, originalSrc);
    });

    return wrapper;
  }

  function loadEmbed(wrapper, src) {
    const iframe = document.createElement("iframe");
    iframe.src = src;
    iframe.style.cssText = "width:100%;height:100%;border:none;";
    iframe.setAttribute("allowfullscreen", "");
    iframe.setAttribute("loading", "lazy");

    const parent = wrapper.parentNode;
    if (parent) {
      const prevSibling = wrapper.previousSibling;
      wrapper.remove();
      parent.insertBefore(iframe, prevSibling ? prevSibling.nextSibling : null);
    }
  }

  function replaceWithPlaceholder(iframe) {
    if (iframe.hasAttribute("data-os-placeholder")) return;
    const src = iframe.src;
    if (!src) return;

    const placeholder = createPlaceholder(src);

    const rect = iframe.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      placeholder.style.width = rect.width + "px";
      placeholder.style.height = rect.height + "px";
    } else {
      placeholder.style.width = "100%";
      placeholder.style.height = "300px";
    }
    placeholder.style.position = "relative";
    placeholder.style.display = "inline-block";

    const parent = iframe.parentNode;
    if (parent) {
      parent.insertBefore(placeholder, iframe);
      iframe.remove();
    }
  }

  function scanIframes() {
    injectStyle();
    const iframes = document.querySelectorAll(iframeSelector);
    for (const iframe of iframes) {
      replaceWithPlaceholder(iframe);
    }
  }

  scanIframes();

  const obs = new MutationObserver(function(mutations) {
    injectStyle();
    for (const m of mutations) {
      if (m.type === "childList") {
        for (const node of m.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          if (node.tagName === "IFRAME" && node.matches(iframeSelector)) {
            replaceWithPlaceholder(node);
          }
          const nestedIframes = node.querySelectorAll?.(iframeSelector);
          if (nestedIframes) {
            for (const iframe of nestedIframes) {
              replaceWithPlaceholder(iframe);
            }
          }
        }
      }
    }
  });

  if (document.documentElement) {
    obs.observe(document.documentElement, { childList: true, subtree: true });
  } else {
    document.addEventListener("DOMContentLoaded", function() {
      scanIframes();
      if (document.documentElement) obs.observe(document.documentElement, { childList: true, subtree: true });
    }, { once: true });
  }
})();
