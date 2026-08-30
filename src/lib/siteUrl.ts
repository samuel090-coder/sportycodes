// Canonical public site URL used for shareable links (referrals, invites, emails).
export const SITE_URL = "https://sportycodes.vercel.app";

export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "");

export const buildSiteUrl = (path: string) =>
  `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
