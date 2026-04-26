/**
 * Link Tracking Protection
 * ISOLATED world content script — runs at document_start, all frames.
 * Strips known tracking parameters from anchor hrefs on click,
 * before navigation occurs.
 */
(function () {
  "use strict";

  const TRACKING_PARAMS = new Set([
    "utm_source","utm_medium","utm_campaign","utm_term","utm_content","utm_id",
    "fbclid","gclid","gclsrc","dclid","msclkid","yclid","twclid",
    "mc_eid","mc_cid","_openstat","igshid","igsh",
    "sc_campaign","sc_channel","sc_content","sc_medium","sc_outcome","sc_geo","sc_country",
    "affiliate_id","partner_id","trkCampaign","trkPartner","trkLink",
    "oly_anon_id","oly_enc_id","oly_enc_ticket_id","_ga","_gl",
    "ck_subscriber_id","hsCtaTracking",
    "hsa_cam","hsa_grp","hsa_mt","hsa_src","hsa_ad","hsa_acc","hsa_net","hsa_ver",
    "vero_id","vero_conv","wickedid","wicked_source",
    "wt_mc","wt_zmc","wt_sr","wt_cd",
    "si","sms_ss","sms_source","sms_clickid","sms_uph",
    "mbid","mb_source","mb_campaign",
    "mtm_campaign","mtm_source","mtm_medium","mtm_content","mtm_cid","mtm_group","mtm_placement",
    "pk_campaign","pk_source","pk_medium","pk_content","pk_keyword","pk_cid",
    "spm","scm","ws_ab_test","share_url_id","jwsource","jwexp",
    "click_id","clickid","tracking_id","track_id","trk","trkref",
    "cmpid","cmp","campaign_id","campid","cid","cust_id","customer_id",
    "awtrc","atc","aa_campaign","aa_source","aa_medium","aa_content",
    "ttclid","rdt_cid","SnapchatShareId","ocid",
    "ncid","nr_email_referer","extlink",
    "ob_marketer_id","ob_campaign_id","ob_ad_id",
    "ob_click_id","ob_ad_group_id","ob_publisher_id",
    "elqTrackId","elq_mid","elq_cid","elqTrack","elq",
    "mkt_tok","mkt_unsubscribe","mkt_seg","mkt_chnl",
    "conversion_id","conversion_type","conversion_source",
    "cvo_campaign","cvo_adgroup","cvo_creative","cvo_pid","cvo_adid",
    "cvo_sid","cvo_format","cvo_lineitem",
    "wp_sc","wp_tc","wp_cp","wp_mkt","wp_ref",
    "zanpid","zarsrc"
  ]);

  function hasTrackingParams(url) {
    try {
      const u = new URL(url, location.href);
      for (const key of u.searchParams.keys()) {
        if (TRACKING_PARAMS.has(key)) return true;
      }
      return false;
    } catch { return false; }
  }

  function stripTrackingParams(url) {
    try {
      const u = new URL(url, location.href);
      if (u.hostname !== location.hostname) return url;
      let changed = false;
      for (const key of u.searchParams.keys()) {
        if (TRACKING_PARAMS.has(key)) {
          u.searchParams.delete(key);
          changed = true;
        }
      }
      return changed ? u.toString() : url;
    } catch { return url; }
  }

  document.addEventListener("click", function(e) {
    let target = e.target;
    while (target && target !== document) {
      if (target.href && target.tagName === "A") break;
      target = target.parentElement;
    }
    if (!target || !target.href) return;
    if (target.hostname === location.hostname) return;

    const href = target.getAttribute("href");
    if (!href || !hasTrackingParams(href)) return;

    const clean = stripTrackingParams(href);
    if (clean !== href) {
      target.setAttribute("href", clean);
    }
  }, true);

  function scrubLinks(root) {
    if (!root) return;
    const links = root.querySelectorAll("a[href]");
    for (const link of links) {
      const href = link.getAttribute("href");
      if (!href || !hasTrackingParams(href)) continue;
      const clean = stripTrackingParams(href);
      if (clean !== href) {
        link.setAttribute("href", clean);
        link.setAttribute("data-os-cleaned", "1");
      }
    }
  }

  scrubLinks(document.body || document.documentElement);

  const obs = new MutationObserver(function(mutations) {
    for (const m of mutations) {
      if (m.type === "childList") {
        for (const node of m.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            scrubLinks(node);
          }
        }
      }
    }
  });

  if (document.documentElement) {
    obs.observe(document.documentElement, { childList: true, subtree: true });
  } else {
    document.addEventListener("DOMContentLoaded", function() {
      scrubLinks(document.body);
      if (document.documentElement) obs.observe(document.documentElement, { childList: true, subtree: true });
    }, { once: true });
  }
})();
