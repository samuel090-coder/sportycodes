import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMAILJS_SERVICE_ID = Deno.env.get("EMAILJS_SERVICE_ID")!;
const EMAILJS_TEMPLATE_ID = Deno.env.get("EMAILJS_TEMPLATE_ID")!;
const EMAILJS_PUBLIC_KEY = Deno.env.get("EMAILJS_PUBLIC_KEY")!;
const EMAILJS_PRIVATE_KEY = Deno.env.get("EMAILJS_PRIVATE_KEY")!;

const SITE_URL = "https://sportycodes.lovable.app";
const SITE_NAME = "SPORTY CODES";
const REPLY_TO = "pncbank364@gmail.com";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// ========= Image proxy (fixes broken images in Gmail/Outlook) =========
// Routes all images through weserv.nl — a free CDN trusted by all major email clients.
// This solves: (1) Supabase signed URLs being blocked, (2) CORS-protected URLs, (3) image stripping.
function proxyImage(url: string | null | undefined, width = 200): string {
  if (!url) return "";
  // Strip protocol because weserv expects host+path only
  let clean = url.trim();
  if (clean.startsWith("http://")) clean = clean.slice(7);
  else if (clean.startsWith("https://")) clean = clean.slice(8);
  // Encode the URL properly for the proxy
  return `https://images.weserv.nl/?url=${encodeURIComponent(clean)}&w=${width}&output=jpg&q=85&default=https://images.weserv.nl/?url=via.placeholder.com/${width}x${width}/dc2626/ffffff?text=SC`;
}

// ========= Branded HTML wrapper =========
function wrap(opts: { title: string; preheader: string; bodyHtml: string; ctaText?: string; ctaUrl?: string }) {
  const { title, preheader, bodyHtml, ctaText, ctaUrl } = opts;
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${title}</title></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;padding:24px 12px;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#0a0a0f;border-radius:16px;overflow:hidden;border:1px solid #1f1f2e;">
      <tr><td style="background:linear-gradient(135deg,#dc2626 0%,#7f1d1d 100%);padding:28px 24px;text-align:center;">
        <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:900;letter-spacing:2px;">⚡ ${SITE_NAME}</h1>
        <p style="margin:6px 0 0;color:#fecaca;font-size:12px;letter-spacing:3px;text-transform:uppercase;">Win Big. Bet Smart.</p>
      </td></tr>
      <tr><td style="padding:32px 28px;color:#e5e7eb;font-size:15px;line-height:1.7;">
        <h2 style="margin:0 0 16px;color:#ffffff;font-size:22px;font-weight:700;">${title}</h2>
        ${bodyHtml}
        ${ctaText && ctaUrl ? `<div style="text-align:center;margin:32px 0 8px;"><a href="${ctaUrl}" style="display:inline-block;background:linear-gradient(135deg,#dc2626,#991b1b);color:#fff;text-decoration:none;font-weight:700;padding:14px 32px;border-radius:10px;font-size:15px;box-shadow:0 4px 14px rgba(220,38,38,0.4);">${ctaText}</a></div>` : ""}
      </td></tr>
      <tr><td style="background:#050507;padding:20px 24px;text-align:center;border-top:1px solid #1f1f2e;">
        <p style="margin:0 0 6px;color:#9ca3af;font-size:12px;">You're receiving this because you have an account on ${SITE_NAME}.</p>
        <p style="margin:0;color:#6b7280;font-size:11px;"><a href="${SITE_URL}" style="color:#dc2626;text-decoration:none;">Visit ${SITE_NAME}</a> · <a href="mailto:${REPLY_TO}" style="color:#dc2626;text-decoration:none;">Contact Support</a></p>
        <p style="margin:10px 0 0;color:#4b5563;font-size:10px;">© ${new Date().getFullYear()} ${SITE_NAME}. All rights reserved.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

// ========= Profile card builder (rich, with proxy images) =========
function profileCard(p: any, label: string) {
  if (!p) return "";
  const initial = (p.display_name || p.username || "?").charAt(0).toUpperCase();
  const avatar = p.avatar_url
    ? `<img src="${proxyImage(p.avatar_url, 128)}" alt="" width="64" height="64" style="border-radius:50%;border:2px solid #dc2626;display:block;width:64px;height:64px;object-fit:cover;" />`
    : `<div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#dc2626,#7f1d1d);color:#fff;font-weight:900;font-size:24px;line-height:64px;text-align:center;">${initial}</div>`;
  const name = p.display_name || p.username || "User";
  const username = p.username ? `@${p.username}` : "";
  const profileUrl = `${SITE_URL}/user/${p.id}`;
  return `
    <div style="background:#111827;border:1px solid #1f2937;border-radius:12px;padding:16px;margin:16px 0;">
      <p style="margin:0 0 12px;color:#9ca3af;font-size:11px;letter-spacing:2px;text-transform:uppercase;">${label}</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;"><tr>
        <td width="80" valign="top">${avatar}</td>
        <td valign="top" style="padding-left:14px;">
          <p style="margin:0;color:#fff;font-size:17px;font-weight:700;">${name}</p>
          ${username ? `<p style="margin:2px 0 0;color:#9ca3af;font-size:13px;">${username}</p>` : ""}
          ${p.bio ? `<p style="margin:8px 0 0;color:#d1d5db;font-size:13px;font-style:italic;">"${p.bio}"</p>` : ""}
          <p style="margin:10px 0 0;color:#6b7280;font-size:12px;">
            <span style="color:#fbbf24;font-weight:700;">${p.followers_count ?? 0}</span> followers ·
            <span style="color:#fbbf24;font-weight:700;">${p.following_count ?? 0}</span> following ·
            <span style="color:#34d399;font-weight:700;">${p.posts_count ?? 0}</span> posts
          </p>
          ${p.country ? `<p style="margin:6px 0 0;color:#9ca3af;font-size:12px;">📍 ${p.country}</p>` : ""}
          <a href="${profileUrl}" style="display:inline-block;margin-top:10px;color:#dc2626;font-size:12px;font-weight:700;text-decoration:none;">View Profile →</a>
        </td>
      </tr></table>
    </div>`;
}

// ========= Short/post card (with media thumbnail via proxy) =========
function shortCard(s: any, label: string) {
  if (!s) return "";
  const isVideo = s.media_type === "video";
  const proxied = s.media_url ? proxyImage(s.media_url, 600) : "";
  const mediaPreview = s.media_url
    ? isVideo
      ? `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:#000;border-radius:8px;overflow:hidden;"><tr><td style="position:relative;text-align:center;">
          <img src="${proxied}" alt="video thumbnail" width="540" style="width:100%;max-width:540px;display:block;max-height:280px;object-fit:cover;" />
          <div style="margin-top:-160px;margin-bottom:130px;display:inline-block;background:rgba(220,38,38,0.95);width:48px;height:48px;line-height:48px;border-radius:50%;color:#fff;font-size:20px;text-align:center;">▶</div>
         </td></tr></table>`
      : `<img src="${proxied}" alt="post image" width="540" style="width:100%;max-width:540px;display:block;max-height:280px;object-fit:cover;border-radius:8px;" />`
    : "";
  return `
    <div style="background:#111827;border:1px solid #1f2937;border-radius:12px;padding:16px;margin:16px 0;">
      <p style="margin:0 0 10px;color:#9ca3af;font-size:11px;letter-spacing:2px;text-transform:uppercase;">${label}</p>
      ${mediaPreview}
      ${s.content ? `<p style="margin:12px 0 0;color:#e5e7eb;font-size:14px;line-height:1.6;">${s.content}</p>` : ""}
      <p style="margin:10px 0 0;color:#6b7280;font-size:12px;">❤️ ${s.likes_count ?? 0} · 💬 ${s.comments_count ?? 0} · 🔁 ${s.shares_count ?? 0}</p>
    </div>`;
}

// ========= Stat box helper =========
function statBox(label: string, value: string, color = "#fbbf24") {
  return `<div style="background:linear-gradient(135deg,#1f2937,#111827);border:1px solid #1f2937;border-radius:12px;padding:18px;margin:16px 0;text-align:center;">
    <p style="margin:0;color:#9ca3af;font-size:11px;letter-spacing:2px;text-transform:uppercase;">${label}</p>
    <p style="margin:6px 0 0;color:${color};font-size:28px;font-weight:900;">${value}</p>
  </div>`;
}

// ========= Templates =========
type EmailType =
  // Original 13
  | "payment_approved" | "payment_declined" | "deposit_approved" | "deposit_declined"
  | "withdrawal_approved" | "withdrawal_declined" | "code_purchased"
  | "win_pool" | "win_game" | "new_follower" | "post_liked" | "post_commented" | "profile_viewed"
  // 10 Social/Engagement
  | "post_shared" | "comment_reply" | "comment_liked" | "mentioned_in_comment"
  | "milestone_followers" | "room_invite" | "room_tagged"
  | "level_up" | "challenge_completed" | "streak_milestone"
  // 10 Money/Activity
  | "wallet_credit" | "wallet_debit" | "p2p_received" | "p2p_sent"
  | "pool_lost" | "pool_refunded" | "weekly_summary"
  | "referral_bonus" | "referral_milestone" | "vip_expiring";

async function fetchProfile(id: string) {
  if (!id) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, username, avatar_url, bio, country, followers_count, following_count, posts_count")
    .eq("id", id)
    .maybeSingle();
  return data;
}

async function fetchShort(id: string) {
  if (!id) return null;
  const { data } = await supabase
    .from("shorts")
    .select("id, content, media_url, media_type, likes_count, comments_count, shares_count")
    .eq("id", id)
    .maybeSingle();
  return data;
}

async function buildEmail(type: EmailType, data: any): Promise<{ subject: string; html: string }> {
  const fmt = (n: number) => `₦${Number(n || 0).toLocaleString()}`;

  switch (type) {
    case "payment_approved":
    case "code_purchased": {
      const { oddName, betCode, prediction, odds } = data;
      return {
        subject: `✅ Payment Approved – Your Bet Code is Ready`,
        html: wrap({
          title: `🎉 Payment Approved!`,
          preheader: `Your bet code for ${oddName} is now unlocked.`,
          bodyHtml: `
            <p>Great news! Your payment for <strong style="color:#fff;">${oddName}</strong> has been approved.</p>
            <div style="background:linear-gradient(135deg,#1f2937,#111827);border:2px dashed #dc2626;border-radius:12px;padding:20px;margin:20px 0;text-align:center;">
              <p style="margin:0 0 8px;color:#9ca3af;font-size:11px;letter-spacing:2px;text-transform:uppercase;">Your Bet Code</p>
              <p style="margin:0;color:#fbbf24;font-size:28px;font-weight:900;letter-spacing:3px;font-family:'Courier New',monospace;">${betCode || "—"}</p>
              ${prediction ? `<p style="margin:12px 0 0;color:#e5e7eb;font-size:13px;">Prediction: <strong>${prediction}</strong>${odds ? ` @ ${odds}` : ""}</p>` : ""}
            </div>
            <p style="color:#9ca3af;font-size:13px;">Copy the code above and use it on your betting platform. Good luck! 🍀</p>`,
          ctaText: "View on SportyCodes", ctaUrl: `${SITE_URL}/sure-odds`,
        }),
      };
    }
    case "payment_declined": {
      const { oddName, reason } = data;
      return {
        subject: `❌ Payment Declined – ${oddName}`,
        html: wrap({
          title: "Payment Declined", preheader: `Your payment for ${oddName} could not be approved.`,
          bodyHtml: `<p>We're sorry — your payment for <strong style="color:#fff;">${oddName}</strong> was not approved.</p>
            ${reason ? `<div style="background:#1f1f2e;border-left:3px solid #dc2626;padding:12px 16px;margin:16px 0;border-radius:6px;"><p style="margin:0;color:#fca5a5;font-size:13px;"><strong>Reason:</strong> ${reason}</p></div>` : ""}
            <p>If you believe this is a mistake, please contact our support team.</p>`,
          ctaText: "Contact Support", ctaUrl: `mailto:${REPLY_TO}`,
        }),
      };
    }
    case "deposit_approved": {
      const { amount } = data;
      return {
        subject: `💰 Deposit Approved – ${fmt(amount)} Added`,
        html: wrap({
          title: "💰 Deposit Approved!", preheader: `${fmt(amount)} has been added to your wallet.`,
          bodyHtml: `<p>Your deposit has been approved and credited to your wallet.</p>
            ${statBox("Amount Credited", fmt(amount), "#34d399")}
            <p>You can now buy codes, join betting pools, and start earning. Let's go! 🚀</p>`,
          ctaText: "Open Wallet", ctaUrl: `${SITE_URL}/wallet`,
        }),
      };
    }
    case "deposit_declined": {
      const { amount, reason } = data;
      return {
        subject: `❌ Deposit Declined`,
        html: wrap({
          title: "Deposit Declined", preheader: `Your deposit of ${fmt(amount)} could not be approved.`,
          bodyHtml: `<p>Your deposit request of <strong style="color:#fff;">${fmt(amount)}</strong> was not approved.</p>
            ${reason ? `<div style="background:#1f1f2e;border-left:3px solid #dc2626;padding:12px 16px;margin:16px 0;border-radius:6px;"><p style="margin:0;color:#fca5a5;font-size:13px;"><strong>Reason:</strong> ${reason}</p></div>` : ""}`,
          ctaText: "Contact Support", ctaUrl: `mailto:${REPLY_TO}`,
        }),
      };
    }
    case "withdrawal_approved": {
      const { amount } = data;
      return {
        subject: `✅ Withdrawal Approved – ${fmt(amount)} Sent`,
        html: wrap({
          title: "✅ Withdrawal Approved!", preheader: `Your withdrawal of ${fmt(amount)} has been processed.`,
          bodyHtml: `<p>Good news! Your withdrawal request has been approved.</p>
            ${statBox("Amount Sent", fmt(amount), "#34d399")}`,
          ctaText: "View Wallet", ctaUrl: `${SITE_URL}/wallet`,
        }),
      };
    }
    case "withdrawal_declined": {
      const { amount, reason } = data;
      return {
        subject: `❌ Withdrawal Declined`,
        html: wrap({
          title: "Withdrawal Declined", preheader: `Your withdrawal request was not approved.`,
          bodyHtml: `<p>Your withdrawal of <strong style="color:#fff;">${fmt(amount)}</strong> was not approved. The funds remain in your wallet.</p>
            ${reason ? `<div style="background:#1f1f2e;border-left:3px solid #dc2626;padding:12px 16px;margin:16px 0;border-radius:6px;"><p style="margin:0;color:#fca5a5;font-size:13px;"><strong>Reason:</strong> ${reason}</p></div>` : ""}`,
          ctaText: "Contact Support", ctaUrl: `mailto:${REPLY_TO}`,
        }),
      };
    }
    case "win_pool": {
      const { poolTitle, payoutAmount } = data;
      return {
        subject: `🏆 You Won! ${fmt(payoutAmount)} from "${poolTitle}"`,
        html: wrap({
          title: "🏆 Congratulations, Champion!", preheader: `You won ${fmt(payoutAmount)} from ${poolTitle}!`,
          bodyHtml: `<p>You absolutely crushed it! 🔥 Your prediction in <strong style="color:#fff;">"${poolTitle}"</strong> was correct.</p>
            ${statBox("Winnings Credited", fmt(payoutAmount))}`,
          ctaText: "View My Wallet", ctaUrl: `${SITE_URL}/wallet`,
        }),
      };
    }
    case "win_game": {
      const { gameTitle, payoutAmount } = data;
      return {
        subject: `🎮 You Won the Game! ${fmt(payoutAmount)}`,
        html: wrap({
          title: "🎮 Game Won!", preheader: `You won ${fmt(payoutAmount)} from ${gameTitle}!`,
          bodyHtml: `<p>Victory! 🎉 You won <strong style="color:#fff;">"${gameTitle}"</strong>.</p>
            ${statBox("Prize Credited", fmt(payoutAmount))}`,
          ctaText: "Back to Rooms", ctaUrl: `${SITE_URL}/rooms`,
        }),
      };
    }
    case "new_follower": {
      const follower = data.followerId ? await fetchProfile(data.followerId) : null;
      const name = follower?.display_name || follower?.username || data.followerName || "Someone";
      return {
        subject: `👤 ${name} started following you!`,
        html: wrap({
          title: "👤 You have a new follower!", preheader: `${name} just started following you on ${SITE_NAME}.`,
          bodyHtml: `<p><strong style="color:#fff;">${name}</strong> just started following you on ${SITE_NAME}.</p>
            ${profileCard(follower, "Follower Profile")}
            <p style="color:#9ca3af;font-size:13px;">Check out their profile and follow back to grow your network!</p>`,
          ctaText: follower ? "View Their Profile" : "Open My Profile",
          ctaUrl: follower ? `${SITE_URL}/user/${follower.id}` : `${SITE_URL}/profile`,
        }),
      };
    }
    case "profile_viewed": {
      const viewer = data.viewerId ? await fetchProfile(data.viewerId) : null;
      const name = viewer?.display_name || viewer?.username || "Someone";
      return {
        subject: `👀 ${name} viewed your profile`,
        html: wrap({
          title: "👀 Someone checked you out!", preheader: `${name} just viewed your profile.`,
          bodyHtml: `<p><strong style="color:#fff;">${name}</strong> just visited your profile on ${SITE_NAME}.</p>
            ${profileCard(viewer, "Visitor Profile")}`,
          ctaText: viewer ? "View Their Profile" : "Open My Profile",
          ctaUrl: viewer ? `${SITE_URL}/user/${viewer.id}` : `${SITE_URL}/profile`,
        }),
      };
    }
    case "post_liked": {
      const liker = data.likerId ? await fetchProfile(data.likerId) : null;
      const short = data.shortId ? await fetchShort(data.shortId) : null;
      const name = liker?.display_name || liker?.username || data.likerName || "Someone";
      return {
        subject: `❤️ ${name} liked your post`,
        html: wrap({
          title: "❤️ Someone loves your content!", preheader: `${name} liked your post on ${SITE_NAME}.`,
          bodyHtml: `<p><strong style="color:#fff;">${name}</strong> just liked one of your posts. Keep creating great content! 🔥</p>
            ${profileCard(liker, "Liked By")}
            ${shortCard(short, "Your Post")}`,
          ctaText: "View Your Post", ctaUrl: `${SITE_URL}/shorts`,
        }),
      };
    }
    case "post_commented": {
      const commenter = data.commenterId ? await fetchProfile(data.commenterId) : null;
      const short = data.shortId ? await fetchShort(data.shortId) : null;
      const name = commenter?.display_name || commenter?.username || data.commenterName || "Someone";
      return {
        subject: `💬 ${name} commented on your post`,
        html: wrap({
          title: "💬 New comment on your post", preheader: `${name} commented on your post.`,
          bodyHtml: `<p><strong style="color:#fff;">${name}</strong> left a comment on your post:</p>
            ${data.commentPreview ? `<div style="background:#1f1f2e;border-left:3px solid #dc2626;padding:12px 16px;margin:16px 0;border-radius:6px;"><p style="margin:0;color:#e5e7eb;font-size:14px;font-style:italic;">"${data.commentPreview}"</p></div>` : ""}
            ${profileCard(commenter, "Commented By")}
            ${shortCard(short, "Your Post")}`,
          ctaText: "Reply to Comment", ctaUrl: `${SITE_URL}/shorts`,
        }),
      };
    }

    // ============ NEW: 10 SOCIAL/ENGAGEMENT ============
    case "post_shared": {
      const sharer = data.sharerId ? await fetchProfile(data.sharerId) : null;
      const short = data.shortId ? await fetchShort(data.shortId) : null;
      const name = sharer?.display_name || sharer?.username || "Someone";
      return {
        subject: `🔁 ${name} shared your post`,
        html: wrap({
          title: "🔁 Your content is going viral!", preheader: `${name} just shared your post.`,
          bodyHtml: `<p><strong style="color:#fff;">${name}</strong> shared one of your posts. Your reach is growing! 📈</p>
            ${profileCard(sharer, "Shared By")}
            ${shortCard(short, "Your Post")}`,
          ctaText: "View Your Post", ctaUrl: `${SITE_URL}/shorts`,
        }),
      };
    }
    case "comment_reply": {
      const replier = data.replierId ? await fetchProfile(data.replierId) : null;
      const short = data.shortId ? await fetchShort(data.shortId) : null;
      const name = replier?.display_name || replier?.username || "Someone";
      return {
        subject: `↩️ ${name} replied to your comment`,
        html: wrap({
          title: "↩️ New reply to your comment", preheader: `${name} replied to your comment.`,
          bodyHtml: `<p><strong style="color:#fff;">${name}</strong> replied to your comment:</p>
            ${data.replyPreview ? `<div style="background:#1f1f2e;border-left:3px solid #dc2626;padding:12px 16px;margin:16px 0;border-radius:6px;"><p style="margin:0;color:#e5e7eb;font-size:14px;font-style:italic;">"${data.replyPreview}"</p></div>` : ""}
            ${profileCard(replier, "Replied By")}
            ${shortCard(short, "On This Post")}`,
          ctaText: "View Conversation", ctaUrl: `${SITE_URL}/shorts`,
        }),
      };
    }
    case "comment_liked": {
      const liker = data.likerId ? await fetchProfile(data.likerId) : null;
      const name = liker?.display_name || liker?.username || "Someone";
      return {
        subject: `❤️ ${name} liked your comment`,
        html: wrap({
          title: "❤️ Your comment got love!", preheader: `${name} liked your comment.`,
          bodyHtml: `<p><strong style="color:#fff;">${name}</strong> liked your comment:</p>
            ${data.commentPreview ? `<div style="background:#1f1f2e;border-left:3px solid #fbbf24;padding:12px 16px;margin:16px 0;border-radius:6px;"><p style="margin:0;color:#e5e7eb;font-size:14px;font-style:italic;">"${data.commentPreview}"</p></div>` : ""}
            ${profileCard(liker, "Liked By")}`,
          ctaText: "Open Shorts", ctaUrl: `${SITE_URL}/shorts`,
        }),
      };
    }
    case "mentioned_in_comment": {
      const mentioner = data.mentionerId ? await fetchProfile(data.mentionerId) : null;
      const short = data.shortId ? await fetchShort(data.shortId) : null;
      const name = mentioner?.display_name || mentioner?.username || "Someone";
      return {
        subject: `📣 ${name} mentioned you`,
        html: wrap({
          title: "📣 You've been mentioned!", preheader: `${name} mentioned you in a comment.`,
          bodyHtml: `<p><strong style="color:#fff;">${name}</strong> tagged you in a comment:</p>
            ${data.commentPreview ? `<div style="background:#1f1f2e;border-left:3px solid #dc2626;padding:12px 16px;margin:16px 0;border-radius:6px;"><p style="margin:0;color:#e5e7eb;font-size:14px;font-style:italic;">"${data.commentPreview}"</p></div>` : ""}
            ${profileCard(mentioner, "Mentioned By")}
            ${shortCard(short, "On This Post")}`,
          ctaText: "View Mention", ctaUrl: `${SITE_URL}/shorts`,
        }),
      };
    }
    case "milestone_followers": {
      const { count } = data;
      return {
        subject: `🎉 You hit ${count} followers!`,
        html: wrap({
          title: `🎉 ${count} Followers Strong!`, preheader: `Massive milestone — ${count} people now follow you.`,
          bodyHtml: `<p>Huge congratulations! You've officially reached <strong style="color:#fbbf24;">${count} followers</strong> on ${SITE_NAME}. 🚀</p>
            ${statBox("Total Followers", String(count), "#fbbf24")}
            <p style="color:#9ca3af;font-size:13px;">Keep posting great content and watch your community grow even bigger!</p>`,
          ctaText: "View Your Profile", ctaUrl: `${SITE_URL}/profile`,
        }),
      };
    }
    case "room_invite": {
      const inviter = data.inviterId ? await fetchProfile(data.inviterId) : null;
      const { roomName, roomId } = data;
      const name = inviter?.display_name || inviter?.username || "Someone";
      return {
        subject: `🚪 ${name} invited you to "${roomName}"`,
        html: wrap({
          title: "🚪 You're invited to a room!", preheader: `${name} wants you to join ${roomName}.`,
          bodyHtml: `<p><strong style="color:#fff;">${name}</strong> invited you to join the room <strong style="color:#fbbf24;">"${roomName}"</strong>.</p>
            ${profileCard(inviter, "Invited By")}
            <p style="color:#9ca3af;font-size:13px;">Rooms are private communities for chat, betting pools, P2P transfers, and games.</p>`,
          ctaText: "Join Room", ctaUrl: roomId ? `${SITE_URL}/rooms/${roomId}` : `${SITE_URL}/rooms`,
        }),
      };
    }
    case "room_tagged": {
      const tagger = data.taggerId ? await fetchProfile(data.taggerId) : null;
      const { roomName, roomId, eventType } = data;
      const name = tagger?.display_name || tagger?.username || "Someone";
      return {
        subject: `🏷️ ${name} tagged ${eventType || "an event"} in "${roomName}"`,
        html: wrap({
          title: "🏷️ New room activity!", preheader: `${name} posted in ${roomName}.`,
          bodyHtml: `<p><strong style="color:#fff;">${name}</strong> just posted ${eventType ? `a <strong>${eventType}</strong>` : "an event"} in the room <strong style="color:#fbbf24;">"${roomName}"</strong>.</p>
            ${profileCard(tagger, "Posted By")}`,
          ctaText: "Open Room", ctaUrl: roomId ? `${SITE_URL}/rooms/${roomId}` : `${SITE_URL}/rooms`,
        }),
      };
    }
    case "level_up": {
      const { newLevel, totalXp } = data;
      return {
        subject: `⬆️ Level Up! You're now Level ${newLevel}`,
        html: wrap({
          title: `⬆️ Welcome to Level ${newLevel}!`, preheader: `You leveled up on ${SITE_NAME}.`,
          bodyHtml: `<p>You're climbing the ranks! 🚀 You just hit <strong style="color:#fbbf24;">Level ${newLevel}</strong>.</p>
            ${statBox("Current Level", `LVL ${newLevel}`, "#fbbf24")}
            ${totalXp ? `<p style="color:#9ca3af;font-size:13px;text-align:center;">Total XP: <strong style="color:#34d399;">${totalXp.toLocaleString()}</strong></p>` : ""}
            <p>Keep playing, betting, and engaging to unlock more rewards!</p>`,
          ctaText: "View Achievements", ctaUrl: `${SITE_URL}/profile`,
        }),
      };
    }
    case "challenge_completed": {
      const { challengeTitle, rewardCoins, rewardXp } = data;
      return {
        subject: `🏅 Challenge Complete: ${challengeTitle}`,
        html: wrap({
          title: "🏅 Challenge Conquered!", preheader: `You completed: ${challengeTitle}`,
          bodyHtml: `<p>You completed the daily challenge <strong style="color:#fff;">"${challengeTitle}"</strong>! 💪</p>
            <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0;"><tr>
              ${rewardCoins ? `<td style="padding:4px;">${statBox("Coins Earned", fmt(rewardCoins), "#34d399")}</td>` : ""}
              ${rewardXp ? `<td style="padding:4px;">${statBox("XP Earned", `+${rewardXp}`, "#fbbf24")}</td>` : ""}
            </tr></table>`,
          ctaText: "More Challenges", ctaUrl: `${SITE_URL}/dashboard`,
        }),
      };
    }
    case "streak_milestone": {
      const { streakDays } = data;
      return {
        subject: `🔥 ${streakDays}-Day Streak!`,
        html: wrap({
          title: `🔥 ${streakDays} Days in a Row!`, preheader: `You hit a ${streakDays}-day streak.`,
          bodyHtml: `<p>You're on FIRE! 🔥 You've maintained a <strong style="color:#fbbf24;">${streakDays}-day streak</strong> on ${SITE_NAME}.</p>
            ${statBox("Current Streak", `${streakDays} 🔥`, "#dc2626")}
            <p style="color:#9ca3af;font-size:13px;">Keep tapping daily to grow your multiplier and unlock bigger rewards!</p>`,
          ctaText: "Open Tap to Earn", ctaUrl: `${SITE_URL}/tap-to-earn`,
        }),
      };
    }

    // ============ NEW: 10 MONEY/ACTIVITY ============
    case "wallet_credit": {
      const { amount, source, newBalance } = data;
      return {
        subject: `💵 ${fmt(amount)} credited to your wallet`,
        html: wrap({
          title: "💵 Wallet Credited", preheader: `${fmt(amount)} added from ${source || "activity"}.`,
          bodyHtml: `<p>Your wallet just received <strong style="color:#34d399;">${fmt(amount)}</strong>${source ? ` from <strong>${source}</strong>` : ""}.</p>
            ${statBox("Amount Credited", fmt(amount), "#34d399")}
            ${newBalance != null ? `<p style="text-align:center;color:#9ca3af;font-size:13px;">New balance: <strong style="color:#fff;">${fmt(newBalance)}</strong></p>` : ""}`,
          ctaText: "Open Wallet", ctaUrl: `${SITE_URL}/wallet`,
        }),
      };
    }
    case "wallet_debit": {
      const { amount, reason, newBalance } = data;
      return {
        subject: `💸 ${fmt(amount)} debited from your wallet`,
        html: wrap({
          title: "💸 Wallet Debit", preheader: `${fmt(amount)} debited${reason ? ` for ${reason}` : ""}.`,
          bodyHtml: `<p><strong style="color:#fff;">${fmt(amount)}</strong> was debited from your wallet${reason ? ` for <strong>${reason}</strong>` : ""}.</p>
            ${statBox("Amount Debited", fmt(amount), "#fca5a5")}
            ${newBalance != null ? `<p style="text-align:center;color:#9ca3af;font-size:13px;">New balance: <strong style="color:#fff;">${fmt(newBalance)}</strong></p>` : ""}
            <p style="color:#9ca3af;font-size:13px;">If you don't recognize this transaction, contact support immediately.</p>`,
          ctaText: "View Transactions", ctaUrl: `${SITE_URL}/wallet`,
        }),
      };
    }
    case "p2p_received": {
      const sender = data.senderId ? await fetchProfile(data.senderId) : null;
      const { amount, note } = data;
      const name = sender?.display_name || sender?.username || "A friend";
      return {
        subject: `💰 ${name} sent you ${fmt(amount)}`,
        html: wrap({
          title: "💰 You received money!", preheader: `${name} sent you ${fmt(amount)}.`,
          bodyHtml: `<p><strong style="color:#fff;">${name}</strong> just sent you <strong style="color:#34d399;">${fmt(amount)}</strong> via P2P transfer.</p>
            ${statBox("Amount Received", fmt(amount), "#34d399")}
            ${note ? `<div style="background:#1f1f2e;border-left:3px solid #34d399;padding:12px 16px;margin:16px 0;border-radius:6px;"><p style="margin:0;color:#e5e7eb;font-size:13px;"><strong>Note:</strong> "${note}"</p></div>` : ""}
            ${profileCard(sender, "Sent By")}`,
          ctaText: "Open Wallet", ctaUrl: `${SITE_URL}/wallet`,
        }),
      };
    }
    case "p2p_sent": {
      const receiver = data.receiverId ? await fetchProfile(data.receiverId) : null;
      const { amount, note } = data;
      const name = receiver?.display_name || receiver?.username || "Recipient";
      return {
        subject: `✅ You sent ${fmt(amount)} to ${name}`,
        html: wrap({
          title: "✅ Transfer Sent", preheader: `Your ${fmt(amount)} transfer to ${name} succeeded.`,
          bodyHtml: `<p>Your transfer of <strong style="color:#fff;">${fmt(amount)}</strong> to <strong>${name}</strong> was successful.</p>
            ${statBox("Amount Sent", fmt(amount), "#fbbf24")}
            ${note ? `<div style="background:#1f1f2e;border-left:3px solid #fbbf24;padding:12px 16px;margin:16px 0;border-radius:6px;"><p style="margin:0;color:#e5e7eb;font-size:13px;"><strong>Note:</strong> "${note}"</p></div>` : ""}
            ${profileCard(receiver, "Sent To")}`,
          ctaText: "View Receipt", ctaUrl: `${SITE_URL}/wallet`,
        }),
      };
    }
    case "pool_lost": {
      const { poolTitle, stake } = data;
      return {
        subject: `😔 Better luck next time on "${poolTitle}"`,
        html: wrap({
          title: "😔 Pool Settled", preheader: `Your prediction in ${poolTitle} didn't win this time.`,
          bodyHtml: `<p>Your prediction on <strong style="color:#fff;">"${poolTitle}"</strong> didn't win this round.</p>
            ${stake ? statBox("Stake", fmt(stake), "#fca5a5") : ""}
            <p style="color:#9ca3af;font-size:13px;">Don't give up — sharper predictions are coming. Check out the latest pools and bounce back stronger! 💪</p>`,
          ctaText: "See Open Pools", ctaUrl: `${SITE_URL}/betting-pools`,
        }),
      };
    }
    case "pool_refunded": {
      const { poolTitle, amount } = data;
      return {
        subject: `↩️ Refund: ${fmt(amount)} from "${poolTitle}"`,
        html: wrap({
          title: "↩️ Pool Refunded", preheader: `Your stake in ${poolTitle} has been refunded.`,
          bodyHtml: `<p>The pool <strong style="color:#fff;">"${poolTitle}"</strong> was cancelled or refunded by the admin.</p>
            ${statBox("Refunded to Wallet", fmt(amount), "#34d399")}
            <p style="color:#9ca3af;font-size:13px;">Your full stake has been returned to your wallet.</p>`,
          ctaText: "Open Wallet", ctaUrl: `${SITE_URL}/wallet`,
        }),
      };
    }
    case "weekly_summary": {
      const { earnings, taps, poolsJoined, gamesPlayed } = data;
      return {
        subject: `📊 Your Week on ${SITE_NAME}`,
        html: wrap({
          title: "📊 Weekly Recap", preheader: `Your activity summary for the past 7 days.`,
          bodyHtml: `<p>Here's how you crushed it this week on ${SITE_NAME} 👇</p>
            ${statBox("Total Earned", fmt(earnings || 0), "#34d399")}
            <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:8px 0;"><tr>
              <td style="padding:4px;">${statBox("Taps", String(taps || 0), "#fbbf24")}</td>
              <td style="padding:4px;">${statBox("Pools", String(poolsJoined || 0), "#dc2626")}</td>
              <td style="padding:4px;">${statBox("Games", String(gamesPlayed || 0), "#a78bfa")}</td>
            </tr></table>
            <p style="color:#9ca3af;font-size:13px;">Keep the momentum going next week — bigger pools, bigger wins! 🚀</p>`,
          ctaText: "View Dashboard", ctaUrl: `${SITE_URL}/dashboard`,
        }),
      };
    }
    case "referral_bonus": {
      const referred = data.referredId ? await fetchProfile(data.referredId) : null;
      const { amount } = data;
      const name = referred?.display_name || referred?.username || "Your referral";
      return {
        subject: `🎁 ${fmt(amount)} referral bonus earned!`,
        html: wrap({
          title: "🎁 Referral Bonus Earned!", preheader: `${name} signed up — you earned ${fmt(amount)}.`,
          bodyHtml: `<p><strong style="color:#fff;">${name}</strong> just signed up and made their first deposit using your referral code. You earned a bonus!</p>
            ${statBox("Bonus Credited", fmt(amount), "#34d399")}
            ${profileCard(referred, "Your Referral")}
            <p style="color:#9ca3af;font-size:13px;">Keep sharing your referral code to earn more bonuses!</p>`,
          ctaText: "Share Your Code", ctaUrl: `${SITE_URL}/profile`,
        }),
      };
    }
    case "referral_milestone": {
      const { count } = data;
      const unlocked = count >= 3;
      return {
        subject: `🎯 ${count} successful referrals!`,
        html: wrap({
          title: `🎯 ${count} Referrals!`, preheader: `You've now referred ${count} people${unlocked ? " — withdrawals unlocked!" : ""}.`,
          bodyHtml: `<p>You've successfully referred <strong style="color:#fbbf24;">${count} people</strong> to ${SITE_NAME}.</p>
            ${statBox("Total Referrals", String(count), "#fbbf24")}
            ${unlocked ? `<div style="background:linear-gradient(135deg,#064e3b,#022c22);border:1px solid #10b981;padding:14px 18px;border-radius:10px;margin:16px 0;"><p style="margin:0;color:#34d399;font-weight:700;">✅ Withdrawals UNLOCKED!</p><p style="margin:6px 0 0;color:#a7f3d0;font-size:13px;">You can now request withdrawals from your wallet.</p></div>` : `<p style="color:#9ca3af;font-size:13px;">Refer ${3 - count} more people to unlock withdrawal access.</p>`}`,
          ctaText: unlocked ? "Open Wallet" : "Share Your Code", ctaUrl: unlocked ? `${SITE_URL}/wallet` : `${SITE_URL}/profile`,
        }),
      };
    }
    case "vip_expiring": {
      const { daysLeft, expiresAt } = data;
      return {
        subject: `⏰ Your VIP expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`,
        html: wrap({
          title: "⏰ VIP Expiring Soon", preheader: `Your VIP subscription expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.`,
          bodyHtml: `<p>Heads up! Your VIP subscription expires in <strong style="color:#fbbf24;">${daysLeft} day${daysLeft === 1 ? "" : "s"}</strong>${expiresAt ? ` (${new Date(expiresAt).toLocaleDateString()})` : ""}.</p>
            ${statBox("Days Remaining", String(daysLeft), daysLeft <= 1 ? "#dc2626" : "#fbbf24")}
            <p>Renew now to keep enjoying unlimited access to all SURE ODDS, premium tips, and exclusive perks.</p>`,
          ctaText: "Renew VIP", ctaUrl: `${SITE_URL}/vip`,
        }),
      };
    }
  }
  throw new Error(`Unknown email type: ${type}`);
}

async function logSend(emailType: string, recipient: string, status: string, messageId?: string, errorMsg?: string) {
  try {
    await supabase.from("email_send_log").insert({
      email_type: emailType,
      recipient,
      status,
      provider: "emailjs",
      message_id: messageId,
      error_message: errorMsg,
    });
  } catch (e) {
    console.error("Failed to log email send:", e);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { type, userId, userEmail, data, previewOnly } = await req.json() as {
      type: EmailType; userId?: string; userEmail?: string; data: any; previewOnly?: boolean;
    };

    if (!type) throw new Error("Missing 'type'");

    // Build subject/html: support ad-hoc AI messages via type "ai_custom"
    const buildOrCustom = async (): Promise<{ subject: string; html: string }> => {
      if (type === "ai_custom") {
        const subj = (data?.subject as string) || `${SITE_NAME}`;
        const bodyText = (data?.body as string) || "";
        const bodyHtml = bodyText
          .split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`).join("");
        return {
          subject: subj,
          html: wrap({
            title: (data?.title as string) || subj,
            preheader: subj,
            bodyHtml,
            ctaText: data?.ctaText, ctaUrl: data?.ctaUrl,
          }),
        };
      }
      return buildEmail(type, data || {});
    };

    // Preview mode
    if (previewOnly) {
      const { subject, html } = await buildOrCustom();
      return new Response(JSON.stringify({ success: true, preview: true, subject, html }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate EmailJS secrets
    if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY || !EMAILJS_PRIVATE_KEY) {
      throw new Error("EmailJS credentials not configured. Set EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY, EMAILJS_PRIVATE_KEY.");
    }

    // Resolve recipient email
    let toEmail = userEmail;
    if (!toEmail && userId) {
      const { data: { user } } = await supabase.auth.admin.getUserById(userId);
      toEmail = user?.email ?? undefined;
    }
    if (!toEmail) throw new Error("Could not resolve recipient email");

    const { subject, html } = await buildOrCustom();

    // ============= Send via EmailJS REST API =============
    const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Origin": SITE_URL },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id: EMAILJS_PUBLIC_KEY,
        accessToken: EMAILJS_PRIVATE_KEY,
        template_params: {
          subject,
          html_body: html,
          to_email: toEmail,
          reply_to: REPLY_TO,
          from_name: SITE_NAME,
        },
      }),
    });

    const responseText = await res.text();
    if (!res.ok) {
      console.error("EmailJS error:", res.status, responseText);
      await logSend(type, toEmail, "failed", undefined, `${res.status}: ${responseText}`);
      return new Response(JSON.stringify({ success: false, error: responseText }), {
        status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const messageId = `emailjs-${Date.now()}`;
    console.log(`Email sent [${type}] to ${toEmail}`);
    await logSend(type, toEmail, "sent", messageId);

    return new Response(JSON.stringify({ success: true, id: messageId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("send-email error:", e);
    return new Response(JSON.stringify({ success: false, error: e.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
