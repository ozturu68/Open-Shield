/**
 * openShield Core Configuration
 * All shared constants, defaults, and magic numbers.
 * Zero dependencies. Single source of truth.
 */
export const DEFAULT_SETTINGS = {
  ads: "standard",
  fp: true,
  fpLevel: "medium",
  https: true,
  cookies: "third-party",
  bounce: true,
  params: true,
  cosmetic: true,
  shred: false,
  gpc: true,
  linkProtection: true,
  clickToLoad: true,
  dynamic3p: false,
  proceduralCosmetic: true,
  learningMode: true,
  secureJS: false,
  xssProtection: true,
  ampProtection: true
};

export const FP_NOISE_FACTORS = {
  low: 0.25,
  medium: 1,
  high: 3,
  strict: Infinity
};

export const KEY = {
  GLOBAL: "globalSettings",
  SITES: "siteSettings",
  META: "filterMeta",
  ALLOW: "customAllowlist",
  BLOCK: "customBlocklist",
  COHORT: "cohortDB",
  LEARNING: "learningData",
  JS_BLOCKED: "jsBlockedSites",
  DYNAMIC_3P_ALLOW: "dynamic3pAllowlist"
};

export const SESSION = {
  COUNTERS: "tabCounters",
  SEEDS: "sessionSeeds",
  LOG: "blockLog",
  ORIGINS: "tabOrigins",
  LEARNING_SESSION: "learningSession"
};

export const MSG = {
  GET_STATE: "GET_STATE",
  SET_SITE: "SET_SITE",
  SET_GLOBAL: "SET_GLOBAL",
  GET_LOG: "GET_LOG",
  BOUNCE: "BOUNCE",
  GET_COHORT_STATS: "GET_COHORT_STATS",
  SECURITY_ALERT: "SECURITY_ALERT",
  SECURITY_ALERT_DISMISSED: "SECURITY_ALERT_DISMISSED"
};

export const BOUNCE_DOMAINS = [
  "l.facebook.com","l.messenger.com","t.co","ow.ly",
  "bit.ly","tinyurl.com","buff.ly","rebrand.ly","short.link"
];

export const COHORT_THRESHOLD = 3;
export const MAX_SITES_PER_COHORT = 100;

export const TRACKING_SCORES = {
  thirdPartyCookie: 0.4,
  canvasFingerprint: 0.9,
  localStorage: 0.2,
  beacon: 0.6,
  navigatorProbe: 0.3,
  webRTCEnum: 0.5,
  fontEnum: 0.5
};

export const LEARNING_THRESHOLD = 1.2;

export const TRACKING_PARAMS = [
  "utm_source","utm_medium","utm_campaign","utm_term","utm_content","utm_id",
  "fbclid","gclid","gclsrc","dclid","msclkid","yclid","twclid",
  "mc_eid","mc_cid","_openstat","igshid","ref","source",
  "sc_campaign","sc_channel","sc_content","sc_medium","sc_outcome","sc_geo","sc_country",
  "affiliate_id","partner_id","trkCampaign","trkPartner","trkLink",
  "oly_anon_id","oly_enc_id","oly_enc_ticket_id","_ga","_gl",
  "ck_subscriber_id","hsCtaTracking","hsa_cam","hsa_grp","hsa_mt","hsa_src","hsa_ad","hsa_acc","hsa_net","hsa_ver",
  "vero_id","vero_conv","wickedid","wicked_source","wt_mc","wt_zmc","wt_sr","wt_cd",
  "si","sms_ss","sms_source","sms_clickid","sms_uph",
  "mbid","mb_source","mb_campaign",
  "mtm_campaign","mtm_source","mtm_medium","mtm_content","mtm_cid","mtm_group","mtm_placement",
  "pk_campaign","pk_source","pk_medium","pk_content","pk_keyword","pk_cid",
  "spm","scm","ws_ab_test","share_url_id","jwsource","jwexp",
  "uid","subid","subid1","subid2","subid3","subid4","subid5",
  "click_id","clickid","tracking_id","track_id","trk","trkref",
  "cmpid","cmp","campaign_id","campid","cid","cust_id","customer_id",
  "awtrc","atc","aa_campaign","aa_source","aa_medium","aa_content",
  "igsh","ttclid","rdt_cid","SnapchatShareId","ocid",
  "ncid","nr_email_referer","extlink","ob_marketer_id","ob_campaign_id","ob_ad_id",
  "ob_click_id","ob_ad_group_id","ob_publisher_id",
  "elqTrackId","elq_mid","elq_cid","elqTrack","elq",
  "mkt_tok","mkt_unsubscribe","mkt_seg","mkt_chnl",
  "conversion_id","conversion_type","conversion_source",
  "cvo_campaign","cvo_adgroup","cvo_creative","cvo_pid","cvo_adid",
  "cvo_sid","cvo_format","cvo_lineitem",
  "wp_sc","wp_tc","wp_cp","wp_mkt","wp_ref",
  "zanpid","zarsrc"
];

export const EMBED_DOMAINS = [
  "facebook.com","www.facebook.com","connect.facebook.net",
  "platform.twitter.com","syndication.twitter.com","twitter.com",
  "www.youtube.com","youtube.com","youtube-nocookie.com",
  "www.instagram.com","instagram.com",
  "www.tiktok.com","tiktok.com","www.tiktok.com/embed",
  "platform.linkedin.com","linkedin.com",
  "www.reddit.com","reddit.com",
  "disqus.com","cdn.disqus.com",
  "www.pinterest.com","pinterest.com",
  "assets.pinterest.com",
  "soundcloud.com","w.soundcloud.com",
  "player.vimeo.com","vimeo.com",
  "open.spotify.com","embed.spotify.com",
  "www.dailymotion.com","dailymotion.com",
  "www.twitch.tv","player.twitch.tv",
  "www.snapchat.com","snapchat.com"
];

export const CLICK_TO_LOAD_TEXTS = {
  facebook: "Click to load Facebook content",
  twitter: "Click to load Twitter content",
  youtube: "Click to load YouTube video",
  instagram: "Click to load Instagram content",
  tiktok: "Click to load TikTok content",
  linkedin: "Click to load LinkedIn content",
  reddit: "Click to load Reddit content",
  disqus: "Click to load Disqus comments",
  pinterest: "Click to load Pinterest content",
  soundcloud: "Click to load SoundCloud audio",
  vimeo: "Click to load Vimeo video",
  spotify: "Click to load Spotify content",
  dailymotion: "Click to load Dailymotion video",
  twitch: "Click to load Twitch content",
  snapchat: "Click to load Snapchat content",
  default: "Click to load embedded content"
};

export const AMP_CACHE_DOMAINS = [
  "www.google.com/amp/","ampproject.org",
  "amp.cloudflare.com","bing-amp.com"
];

export const PROCEDURAL_OPERATORS = [
  "has-text","matches-css","xpath","upward","has","not",
  "min-text-length","matches-attr","matches-path"
];

// ── DNR System Constants ──
export const ALLOW_BASE = 100_000;
export const JS_BLOCK_BASE = 200_000;
export const COHORT_DNR_START = 300_000;
export const LOG_MAX = 80;
export const DNR_STATIC_LIMIT = 30_000;
export const DNR_DYNAMIC_LIMIT = 5_000;

// ── Performance Tuning ──
export const COUNTERS_BATCH_MS = 250;
export const LOG_BATCH_MS = 1000;
export const FILTER_FETCH_TIMEOUT_MS = 45_000;
export const FILTER_UPDATE_INTERVAL_MIN = 1440;
export const COHORT_CLEANUP_DAYS = 30;

// ── Filter Update System ──
export const FILTER_META_KEY = "filterMeta";
export const ALARM_FILTER_UPDATE = "filterUpdate";
export const ALARM_COHORT_CLEANUP = "cohortCleanup";
export const MAX_PER_LIST = 4000;

export const ALLOWED_HOSTS = [
  "easylist.to","easylist-downloads.adblockplus.org",
  "raw.githubusercontent.com","filters.adtidy.org",
  "chromium.googlesource.com"
];

export const FILTER_ID_RANGES = {
  "ublock-filters":   { start: 10_000, end: 19_999 },
  "ublock-privacy":   { start: 20_000, end: 29_999 },
  "adguard-base":     { start: 30_000, end: 39_999 },
  "adguard-tracking": { start: 40_000, end: 49_999 },
  "__fallback":       { start: 50_000, end: 59_999 }
};

// ── Message Schemas ──
export const MESSAGE_SCHEMAS = {
  [MSG.GET_STATE]: { tabId: "number" },
  [MSG.SET_SITE]: { h: "string", k: "string" },
  [MSG.SET_GLOBAL]: { k: "string", v: "any" },
  [MSG.GET_LOG]: { tabId: "number" },
  [MSG.GET_COHORT_STATS]: {},
  [MSG.BOUNCE]: { dest: "string" },
  [MSG.SECURITY_ALERT]: { alertType: "string", url: "string" }
};
