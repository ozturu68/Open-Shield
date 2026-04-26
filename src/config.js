/**
 * Minimal shared configuration. Zero dependencies.
 */

export const DEFAULT_SETTINGS = {
  ads: "standard",      // "standard" | "aggressive" | "off"
  fp: true,             // fingerprinting protection
  fpLevel: "medium",    // "low" | "medium" | "high"
  https: true,          // https upgrade
  cookies: "third-party",
  bounce: true,
  params: true,
  cosmetic: true,
  shred: false
};

export const FP_NOISE_FACTORS = {
  low: 0.25,
  medium: 1,
  high: 3
};

export const KEY = {
  GLOBAL: "globalSettings",
  SITES: "siteSettings",
  META: "filterMeta",
  ALLOW: "customAllowlist",
  BLOCK: "customBlocklist"
};

export const SESSION = {
  COUNTERS: "tabCounters",
  SEEDS: "sessionSeeds",
  LOG: "blockLog",
  ORIGINS: "tabOrigins"
};

export const MSG = {
  GET_STATE: "GET_STATE",
  SET_SITE: "SET_SITE",
  SET_GLOBAL: "SET_GLOBAL",
  GET_LOG: "GET_LOG",
  BOUNCE: "BOUNCE"
};

export const BOUNCE_DOMAINS = [
  "l.facebook.com","l.messenger.com","t.co","ow.ly",
  "bit.ly","tinyurl.com","buff.ly","rebrand.ly","short.link"
];

export const TRACKING_PARAMS = [
  "utm_source","utm_medium","utm_campaign","utm_term","utm_content",
  "fbclid","gclid","gclsrc","dclid","msclkid","yclid",
  "mc_eid","mc_cid","_openstat","igshid","ref","source",
  "affiliate_id","partner_id"
];
