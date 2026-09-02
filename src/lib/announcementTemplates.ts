/**
 * Announcement template library.
 * Every template writes into the SAME fields the live surfaces read, and uses
 * the site brand colours, so anything picked here ships looking on-brand.
 */

export interface AnnouncementTemplate {
  id: string;
  name: string;
  category: string;
  display_type: "banner" | "popup" | "toast";
  title: string;
  content: string;
  bg_color: string;
  text_color: string;
  link_text?: string;
  priority?: number;
}

/** Brand palette — sourced from the SPORTY CODES cyberpunk red/dark theme. */
export const BRAND = {
  red: "#dc2626",
  crimson: "#991b1b",
  dark: "#0f172a",
  ink: "#111827",
  green: "#16a34a",
  emerald: "#059669",
  amber: "#d97706",
  gold: "#ca8a04",
  cyan: "#0891b2",
  blue: "#2563eb",
  violet: "#7c3aed",
  pink: "#db2777",
  slate: "#334155",
  white: "#ffffff",
};

type Base = Omit<AnnouncementTemplate, "id" | "display_type"> & {
  display_type?: AnnouncementTemplate["display_type"];
};

const BASES: Base[] = [
  {
    name: "Breaking News",
    category: "News",
    title: "🚨 BREAKING NEWS",
    bg_color: BRAND.red,
    text_color: BRAND.white,
    link_text: "Read More",
    content: `# 🚨 Breaking News
**Something big just dropped on SPORTY CODES.**
!error: This is a developing story — check back for updates.
---
- What happened
- Why it matters
- What comes next
[See the details](https://sportycodes.lovable.app)`,
  },
  {
    name: "Important Update",
    category: "System",
    title: "📢 Important Update",
    bg_color: BRAND.blue,
    text_color: BRAND.white,
    link_text: "Learn More",
    content: `## 📢 Important Update
We have improved how ==sure odds== and payments work.
1. Faster unlocks after payment
2. Cleaner mobile layout
3. Better notifications
> Thanks for riding with SPORTY CODES.`,
  },
  {
    name: "System Maintenance",
    category: "System",
    title: "🛠️ Scheduled Maintenance",
    bg_color: BRAND.slate,
    text_color: BRAND.white,
    content: `## 🛠️ Scheduled Maintenance
!warn: The app may be briefly unavailable while we upgrade.
**Window:** tonight, 30 minutes
@@countdown:2026-12-31T23:00@@
Deposits and withdrawals resume automatically.`,
  },
  {
    name: "Match Alert",
    category: "Match",
    title: "⚽ Match Alert",
    bg_color: BRAND.emerald,
    text_color: BRAND.white,
    link_text: "View Odds",
    content: `# ⚽ Match Alert [[LIVE SOON]]
**Kickoff is close.** Lock your slip before the whistle.
- Verified selections
- Updated odds
- Instant unlock after payment
[Open Sure Odds](/sure-odds)`,
  },
  {
    name: "Winning Announcement",
    category: "Wins",
    title: "🏆 We Cashed Out!",
    bg_color: BRAND.green,
    text_color: BRAND.white,
    link_text: "See Wins",
    content: `# 🏆 Another One Cashed!
!success: Today's slip landed clean.
**Total odds:** ==high== · **Status:** WON
> Congratulations to everyone who played it.
[View winning reviews](/winning-reviews)`,
  },
  {
    name: "Jackpot Alert",
    category: "Promo",
    title: "💰 Jackpot Alert",
    bg_color: BRAND.gold,
    text_color: BRAND.ink,
    link_text: "Enter Now",
    content: `# 💰 Weekly Jackpot [[HOT]]
The pool is filling fast.
@@countdown:2026-12-31T20:00@@
1. Fund your wallet
2. Grab your entries
3. Wait for the draw
[Enter the jackpot](/betting-pools)`,
  },
  {
    name: "New Feature",
    category: "Product",
    title: "✨ New Feature",
    bg_color: BRAND.violet,
    text_color: BRAND.white,
    link_text: "Try It",
    content: `## ✨ Something New Just Landed
We shipped an upgrade you asked for.
!info: Update your app to get it instantly.
- Smoother mobile flow
- Faster loading
- Cleaner design`,
  },
  {
    name: "Security Notice",
    category: "Security",
    title: "🔐 Security Notice",
    bg_color: BRAND.crimson,
    text_color: BRAND.white,
    content: `## 🔐 Security Notice
!error: SPORTY CODES will ==never== ask for your password or OTP.
- Only pay into accounts shown in the app
- Report anything suspicious to support
> Stay safe out there.`,
  },
  {
    name: "Promotion",
    category: "Promo",
    title: "🔥 Limited Promo",
    bg_color: BRAND.red,
    text_color: BRAND.white,
    link_text: "Claim",
    content: `# 🔥 Limited Time Promo [[OFFER]]
!promo: Bonus value on every deposit this week.
@@countdown:2026-12-31T23:59@@
[Deposit now](/wallet)`,
  },
  {
    name: "Giveaway",
    category: "Promo",
    title: "🎁 Giveaway",
    bg_color: BRAND.pink,
    text_color: BRAND.white,
    link_text: "Join",
    content: `# 🎁 Free Giveaway
**No entry fee. Real rewards.**
1. Stay active this week
2. Invite one friend
3. Winners announced Sunday
[Join the giveaway](/rooms)`,
  },
  {
    name: "Live Match",
    category: "Match",
    title: "🔴 LIVE NOW",
    bg_color: BRAND.red,
    text_color: BRAND.white,
    link_text: "Watch",
    content: `# 🔴 LIVE NOW [[STREAMING]]
Scores and the billboard are updating in real time.
[Open live scores](/scores)`,
  },
  {
    name: "Success Message",
    category: "Status",
    title: "✅ All Clear",
    bg_color: BRAND.green,
    text_color: BRAND.white,
    content: `## ✅ Everything Is Back To Normal
!success: Services are fully restored. Thanks for your patience.`,
  },
  {
    name: "Error Notice",
    category: "Status",
    title: "⚠️ Service Issue",
    bg_color: BRAND.amber,
    text_color: BRAND.ink,
    content: `## ⚠️ We Are On It
!warn: Some users may see delays on deposits.
Our team is fixing it right now — no funds are at risk.`,
  },
  {
    name: "Holiday Announcement",
    category: "News",
    title: "🎄 Holiday Special",
    bg_color: BRAND.emerald,
    text_color: BRAND.white,
    link_text: "See Offer",
    content: `# 🎄 Happy Holidays From SPORTY CODES
Enjoy special slips all season.
- Holiday odds drops
- Bonus wheel boosts
- Extra jackpot entries`,
  },
  {
    name: "Weekly Update",
    category: "Reports",
    title: "📅 Weekly Update",
    bg_color: BRAND.blue,
    text_color: BRAND.white,
    content: `## 📅 This Week On SPORTY CODES
1. Slips posted
2. Wins confirmed
3. Payouts processed
> New week, new codes.`,
  },
  {
    name: "Monthly Report",
    category: "Reports",
    title: "📊 Monthly Report",
    bg_color: BRAND.cyan,
    text_color: BRAND.white,
    content: `## 📊 Monthly Performance
- **Win rate:** ==strong==
- **Payouts:** on time
- **New members:** growing
---
Thanks for building this with us.`,
  },
  {
    name: "VIP Announcement",
    category: "VIP",
    title: "👑 VIP Access",
    bg_color: BRAND.gold,
    text_color: BRAND.ink,
    link_text: "Go VIP",
    content: `# 👑 VIP Members Only [[VIP]]
Unlimited odds access, zero per-slip fees.
!promo: One subscription. Every code unlocked.
[Become VIP](/vip)`,
  },
  {
    name: "Featured Match",
    category: "Match",
    title: "⭐ Featured Match",
    bg_color: BRAND.violet,
    text_color: BRAND.white,
    link_text: "View",
    content: `## ⭐ Featured Match Of The Day
**Our analysts' top pick is live on the odds page.**
[See the pick](/sure-odds)`,
  },
  {
    name: "Tournament Update",
    category: "Match",
    title: "🏟️ Tournament Update",
    bg_color: BRAND.slate,
    text_color: BRAND.white,
    content: `## 🏟️ Tournament Update
- Fixtures updated
- Odds refreshed
- Results posted after full time`,
  },
  {
    name: "Community News",
    category: "Community",
    title: "💬 Community News",
    bg_color: BRAND.cyan,
    text_color: BRAND.white,
    link_text: "Open Rooms",
    content: `## 💬 The Rooms Are Buzzing
Join a room, share slips, send cash and play games.
[Open rooms](/rooms)`,
  },
  {
    name: "Tips of the Day",
    category: "Tips",
    title: "🎯 Tips Of The Day",
    bg_color: BRAND.red,
    text_color: BRAND.white,
    link_text: "Get Tips",
    content: `# 🎯 Today's Tips Are Live
1. Check the confidence badge
2. Stake responsibly
3. Cash out smart
[View today's codes](/sure-odds)`,
  },
  {
    name: "Match Results",
    category: "Match",
    title: "📋 Match Results",
    bg_color: BRAND.ink,
    text_color: BRAND.white,
    content: `## 📋 Results Are In
!success: Winning slips have been marked on the odds page.
> Full results update automatically.`,
  },
  {
    name: "AI Prediction Update",
    category: "Product",
    title: "🤖 AI Prediction Update",
    bg_color: BRAND.violet,
    text_color: BRAND.white,
    link_text: "See Predictions",
    content: `# 🤖 AI Predictions Refreshed
Our model just re-scored today's fixtures.
- Match date & time included
- Competition and league tagged
- Confidence scored per slip`,
  },
  {
    name: "Deposit Reminder",
    category: "Wallet",
    title: "💳 Fund Your Wallet",
    bg_color: BRAND.emerald,
    text_color: BRAND.white,
    link_text: "Deposit",
    content: `## 💳 Fund Your Wallet In Seconds
!info: A fresh secure account number is generated for every deposit.
[Deposit now](/wallet)`,
  },
  {
    name: "Withdrawal Notice",
    category: "Wallet",
    title: "🏦 Withdrawals",
    bg_color: BRAND.blue,
    text_color: BRAND.white,
    content: `## 🏦 Withdrawal Processing
Requests are reviewed and paid out by our team.
!info: Keep your bank details accurate to avoid delays.`,
  },
  {
    name: "Referral Push",
    category: "Community",
    title: "🤝 Invite & Earn",
    bg_color: BRAND.pink,
    text_color: BRAND.white,
    link_text: "Invite",
    content: `# 🤝 Invite Friends, Earn Rewards
1. Share your referral link
2. They deposit
3. You get paid
[Grab your link](/profile)`,
  },
  {
    name: "App Install Push",
    category: "Product",
    title: "📱 Install The App",
    bg_color: BRAND.red,
    text_color: BRAND.white,
    content: `## 📱 Install SPORTY CODES
Browser mode is slower. Install for instant loading and push alerts.
!promo: Tap install when the prompt appears.`,
  },
  {
    name: "Daily Bonus",
    category: "Promo",
    title: "🎡 Daily Bonus Wheel",
    bg_color: BRAND.gold,
    text_color: BRAND.ink,
    link_text: "Spin",
    content: `# 🎡 Your Free Spin Is Ready
One spin every day. Real wallet rewards.
[Spin the wheel](/earn)`,
  },
];

const VARIANTS: Array<{
  suffix: string;
  display_type: AnnouncementTemplate["display_type"];
}> = [
  { suffix: "Banner", display_type: "banner" },
  { suffix: "Popup", display_type: "popup" },
  { suffix: "Toast", display_type: "toast" },
];

const TONES: Array<{ suffix: string; bg?: string; text?: string }> = [
  { suffix: "" },
  { suffix: "Dark", bg: BRAND.dark, text: BRAND.white },
  { suffix: "Red", bg: BRAND.red, text: BRAND.white },
  { suffix: "Gold", bg: BRAND.gold, text: BRAND.ink },
];

export const ANNOUNCEMENT_TEMPLATES: AnnouncementTemplate[] = BASES.flatMap((base) =>
  VARIANTS.flatMap((v) =>
    TONES.map((t) => ({
      ...base,
      id: `${base.name}-${v.suffix}-${t.suffix || "brand"}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      name: `${base.name}${t.suffix ? ` · ${t.suffix}` : ""} · ${v.suffix}`,
      category: base.category,
      display_type: v.display_type,
      bg_color: t.bg || base.bg_color,
      text_color: t.text || base.text_color,
    }))
  )
);

export const TEMPLATE_CATEGORIES = Array.from(
  new Set(ANNOUNCEMENT_TEMPLATES.map((t) => t.category))
).sort();
