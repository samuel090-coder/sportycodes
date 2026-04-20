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

// ========= Profile card builder (rich) =========
function profileCard(p: any, label: string) {
  if (!p) return "";
  const avatar = p.avatar_url
    ? `<img src="${p.avatar_url}" alt="" width="64" height="64" style="border-radius:50%;border:2px solid #dc2626;display:block;" />`
    : `<div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#dc2626,#7f1d1d);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:24px;line-height:64px;text-align:center;">${(p.display_name || p.username || "?").charAt(0).toUpperCase()}</div>`;
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

// ========= Short/post card (with media thumbnail) =========
function shortCard(s: any, label: string) {
  if (!s) return "";
  const isVideo = s.media_type === "video";
  const mediaPreview = s.media_url
    ? isVideo
      ? `<div style="position:relative;background:#000;border-radius:8px;overflow:hidden;"><img src="${s.media_url}" alt="video" style="width:100%;display:block;max-height:280px;object-fit:cover;" /><div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(220,38,38,0.9);width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px;">▶</div></div>`
      : `<img src="${s.media_url}" alt="" style="width:100%;display:block;max-height:280px;object-fit:cover;border-radius:8px;" />`
    : "";
  return `
    <div style="background:#111827;border:1px solid #1f2937;border-radius:12px;padding:16px;margin:16px 0;">
      <p style="margin:0 0 10px;color:#9ca3af;font-size:11px;letter-spacing:2px;text-transform:uppercase;">${label}</p>
      ${mediaPreview}
      ${s.content ? `<p style="margin:12px 0 0;color:#e5e7eb;font-size:14px;line-height:1.6;">${s.content}</p>` : ""}
      <p style="margin:10px 0 0;color:#6b7280;font-size:12px;">❤️ ${s.likes_count ?? 0} · 💬 ${s.comments_count ?? 0} · 🔁 ${s.shares_count ?? 0}</p>
    </div>`;
}

// ========= Templates =========
type EmailType =
  | "payment_approved" | "payment_declined" | "deposit_approved" | "deposit_declined"
  | "withdrawal_approved" | "withdrawal_declined" | "code_purchased"
  | "win_pool" | "win_game" | "new_follower" | "post_liked" | "post_commented" | "profile_viewed";

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
            <div style="background:linear-gradient(135deg,#064e3b,#022c22);border:1px solid #10b981;border-radius:12px;padding:20px;margin:20px 0;text-align:center;">
              <p style="margin:0;color:#6ee7b7;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Amount Credited</p>
              <p style="margin:6px 0 0;color:#34d399;font-size:32px;font-weight:900;">${fmt(amount)}</p>
            </div>
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
            <div style="background:linear-gradient(135deg,#064e3b,#022c22);border:1px solid #10b981;border-radius:12px;padding:20px;margin:20px 0;text-align:center;">
              <p style="margin:0;color:#6ee7b7;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Amount Sent</p>
              <p style="margin:6px 0 0;color:#34d399;font-size:32px;font-weight:900;">${fmt(amount)}</p>
            </div>`,
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
            <div style="background:linear-gradient(135deg,#78350f,#451a03);border:2px solid #fbbf24;border-radius:12px;padding:24px;margin:20px 0;text-align:center;">
              <p style="margin:0;color:#fde68a;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Winnings Credited</p>
              <p style="margin:8px 0 0;color:#fbbf24;font-size:36px;font-weight:900;">${fmt(payoutAmount)}</p>
            </div>`,
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
            <div style="background:linear-gradient(135deg,#78350f,#451a03);border:2px solid #fbbf24;border-radius:12px;padding:24px;margin:20px 0;text-align:center;">
              <p style="margin:0;color:#fde68a;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Prize Credited</p>
              <p style="margin:8px 0 0;color:#fbbf24;font-size:36px;font-weight:900;">${fmt(payoutAmount)}</p>
            </div>`,
          ctaText: "Back to Rooms", ctaUrl: `${SITE_URL}/rooms`,
        }),
      };
    }
    case "new_follower": {
      // Try to fetch full follower profile
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

    // Preview mode
    if (previewOnly) {
      const { subject, html } = await buildEmail(type, data || {});
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

    const { subject, html } = await buildEmail(type, data || {});

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
