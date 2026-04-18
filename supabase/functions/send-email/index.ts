import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SITE_URL = "https://sportycodes.lovable.app";
const SITE_NAME = "SPORTY CODES";
const FROM = "SPORTY CODES <onboarding@resend.dev>";
const REPLY_TO = "sportycodes@gmail.com";

// ========= Branded HTML wrapper (cyber/dark/red theme matching site) =========
function wrap(opts: { title: string; preheader: string; bodyHtml: string; ctaText?: string; ctaUrl?: string }) {
  const { title, preheader, bodyHtml, ctaText, ctaUrl } = opts;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;padding:24px 12px;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#0a0a0f;border-radius:16px;overflow:hidden;border:1px solid #1f1f2e;">
      <!-- Header -->
      <tr>
        <td style="background:linear-gradient(135deg,#dc2626 0%,#7f1d1d 100%);padding:28px 24px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:900;letter-spacing:2px;text-shadow:0 0 20px rgba(0,0,0,0.5);">⚡ ${SITE_NAME}</h1>
          <p style="margin:6px 0 0;color:#fecaca;font-size:12px;letter-spacing:3px;text-transform:uppercase;">Win Big. Bet Smart.</p>
        </td>
      </tr>
      <!-- Body -->
      <tr>
        <td style="padding:32px 28px;color:#e5e7eb;font-size:15px;line-height:1.7;">
          <h2 style="margin:0 0 16px;color:#ffffff;font-size:22px;font-weight:700;">${title}</h2>
          ${bodyHtml}
          ${ctaText && ctaUrl ? `
          <div style="text-align:center;margin:32px 0 8px;">
            <a href="${ctaUrl}" style="display:inline-block;background:linear-gradient(135deg,#dc2626,#991b1b);color:#fff;text-decoration:none;font-weight:700;padding:14px 32px;border-radius:10px;font-size:15px;letter-spacing:0.5px;box-shadow:0 4px 14px rgba(220,38,38,0.4);">${ctaText}</a>
          </div>` : ""}
        </td>
      </tr>
      <!-- Footer -->
      <tr>
        <td style="background:#050507;padding:20px 24px;text-align:center;border-top:1px solid #1f1f2e;">
          <p style="margin:0 0 6px;color:#9ca3af;font-size:12px;">You're receiving this because you have an account on ${SITE_NAME}.</p>
          <p style="margin:0;color:#6b7280;font-size:11px;">
            <a href="${SITE_URL}" style="color:#dc2626;text-decoration:none;">Visit ${SITE_NAME}</a> · 
            <a href="mailto:${REPLY_TO}" style="color:#dc2626;text-decoration:none;">Contact Support</a>
          </p>
          <p style="margin:10px 0 0;color:#4b5563;font-size:10px;">© ${new Date().getFullYear()} ${SITE_NAME}. All rights reserved.</p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

// ========= Templates =========
type EmailType =
  | "payment_approved"
  | "payment_declined"
  | "deposit_approved"
  | "deposit_declined"
  | "withdrawal_approved"
  | "withdrawal_declined"
  | "code_purchased"
  | "win_pool"
  | "win_game"
  | "new_follower"
  | "post_liked"
  | "post_commented";

function buildEmail(type: EmailType, data: any): { subject: string; html: string } {
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
            <p style="color:#9ca3af;font-size:13px;">Copy the code above and use it on your betting platform. Good luck! 🍀</p>
          `,
          ctaText: "View on SportyCodes",
          ctaUrl: `${SITE_URL}/sure-odds`,
        }),
      };
    }
    case "payment_declined": {
      const { oddName, reason } = data;
      return {
        subject: `❌ Payment Declined – ${oddName}`,
        html: wrap({
          title: "Payment Declined",
          preheader: `Your payment for ${oddName} could not be approved.`,
          bodyHtml: `
            <p>We're sorry — your payment for <strong style="color:#fff;">${oddName}</strong> was not approved.</p>
            ${reason ? `<div style="background:#1f1f2e;border-left:3px solid #dc2626;padding:12px 16px;margin:16px 0;border-radius:6px;"><p style="margin:0;color:#fca5a5;font-size:13px;"><strong>Reason:</strong> ${reason}</p></div>` : ""}
            <p>If you believe this is a mistake, please contact our support team and we'll sort it out.</p>
          `,
          ctaText: "Contact Support",
          ctaUrl: `mailto:${REPLY_TO}`,
        }),
      };
    }
    case "deposit_approved": {
      const { amount } = data;
      return {
        subject: `💰 Deposit Approved – ${fmt(amount)} Added`,
        html: wrap({
          title: "💰 Deposit Approved!",
          preheader: `${fmt(amount)} has been added to your wallet.`,
          bodyHtml: `
            <p>Your deposit has been approved and credited to your wallet.</p>
            <div style="background:linear-gradient(135deg,#064e3b,#022c22);border:1px solid #10b981;border-radius:12px;padding:20px;margin:20px 0;text-align:center;">
              <p style="margin:0;color:#6ee7b7;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Amount Credited</p>
              <p style="margin:6px 0 0;color:#34d399;font-size:32px;font-weight:900;">${fmt(amount)}</p>
            </div>
            <p>You can now buy codes, join betting pools, and start earning. Let's go! 🚀</p>
          `,
          ctaText: "Open Wallet",
          ctaUrl: `${SITE_URL}/wallet`,
        }),
      };
    }
    case "deposit_declined": {
      const { amount, reason } = data;
      return {
        subject: `❌ Deposit Declined`,
        html: wrap({
          title: "Deposit Declined",
          preheader: `Your deposit of ${fmt(amount)} could not be approved.`,
          bodyHtml: `
            <p>Your deposit request of <strong style="color:#fff;">${fmt(amount)}</strong> was not approved.</p>
            ${reason ? `<div style="background:#1f1f2e;border-left:3px solid #dc2626;padding:12px 16px;margin:16px 0;border-radius:6px;"><p style="margin:0;color:#fca5a5;font-size:13px;"><strong>Reason:</strong> ${reason}</p></div>` : ""}
            <p>Please double-check your payment details and try again, or contact support if you need help.</p>
          `,
          ctaText: "Contact Support",
          ctaUrl: `mailto:${REPLY_TO}`,
        }),
      };
    }
    case "withdrawal_approved": {
      const { amount } = data;
      return {
        subject: `✅ Withdrawal Approved – ${fmt(amount)} Sent`,
        html: wrap({
          title: "✅ Withdrawal Approved!",
          preheader: `Your withdrawal of ${fmt(amount)} has been processed.`,
          bodyHtml: `
            <p>Good news! Your withdrawal request has been approved and is on its way.</p>
            <div style="background:linear-gradient(135deg,#064e3b,#022c22);border:1px solid #10b981;border-radius:12px;padding:20px;margin:20px 0;text-align:center;">
              <p style="margin:0;color:#6ee7b7;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Amount Sent</p>
              <p style="margin:6px 0 0;color:#34d399;font-size:32px;font-weight:900;">${fmt(amount)}</p>
            </div>
            <p style="color:#9ca3af;font-size:13px;">Funds typically arrive within a few minutes to a few hours depending on your bank.</p>
          `,
          ctaText: "View Wallet",
          ctaUrl: `${SITE_URL}/wallet`,
        }),
      };
    }
    case "withdrawal_declined": {
      const { amount, reason } = data;
      return {
        subject: `❌ Withdrawal Declined`,
        html: wrap({
          title: "Withdrawal Declined",
          preheader: `Your withdrawal request was not approved.`,
          bodyHtml: `
            <p>Your withdrawal request of <strong style="color:#fff;">${fmt(amount)}</strong> was not approved. The funds remain in your wallet.</p>
            ${reason ? `<div style="background:#1f1f2e;border-left:3px solid #dc2626;padding:12px 16px;margin:16px 0;border-radius:6px;"><p style="margin:0;color:#fca5a5;font-size:13px;"><strong>Reason:</strong> ${reason}</p></div>` : ""}
          `,
          ctaText: "Contact Support",
          ctaUrl: `mailto:${REPLY_TO}`,
        }),
      };
    }
    case "win_pool": {
      const { poolTitle, payoutAmount } = data;
      return {
        subject: `🏆 You Won! ${fmt(payoutAmount)} from "${poolTitle}"`,
        html: wrap({
          title: "🏆 Congratulations, Champion!",
          preheader: `You won ${fmt(payoutAmount)} from ${poolTitle}!`,
          bodyHtml: `
            <p>You absolutely crushed it! 🔥 Your prediction in <strong style="color:#fff;">"${poolTitle}"</strong> was correct.</p>
            <div style="background:linear-gradient(135deg,#78350f,#451a03);border:2px solid #fbbf24;border-radius:12px;padding:24px;margin:20px 0;text-align:center;">
              <p style="margin:0;color:#fde68a;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Winnings Credited</p>
              <p style="margin:8px 0 0;color:#fbbf24;font-size:36px;font-weight:900;">${fmt(payoutAmount)}</p>
            </div>
            <p>The money has been added to your wallet. Keep that winning streak alive! 💪</p>
          `,
          ctaText: "View My Wallet",
          ctaUrl: `${SITE_URL}/wallet`,
        }),
      };
    }
    case "win_game": {
      const { gameTitle, payoutAmount } = data;
      return {
        subject: `🎮 You Won the Game! ${fmt(payoutAmount)}`,
        html: wrap({
          title: "🎮 Game Won!",
          preheader: `You won ${fmt(payoutAmount)} from ${gameTitle}!`,
          bodyHtml: `
            <p>Victory! 🎉 You won <strong style="color:#fff;">"${gameTitle}"</strong>.</p>
            <div style="background:linear-gradient(135deg,#78350f,#451a03);border:2px solid #fbbf24;border-radius:12px;padding:24px;margin:20px 0;text-align:center;">
              <p style="margin:0;color:#fde68a;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Prize Credited</p>
              <p style="margin:8px 0 0;color:#fbbf24;font-size:36px;font-weight:900;">${fmt(payoutAmount)}</p>
            </div>
            <p>Your winnings are already in your wallet. Ready for the next round?</p>
          `,
          ctaText: "Back to Rooms",
          ctaUrl: `${SITE_URL}/rooms`,
        }),
      };
    }
    case "new_follower": {
      const { followerName } = data;
      return {
        subject: `👤 ${followerName} started following you!`,
        html: wrap({
          title: "👤 You have a new follower!",
          preheader: `${followerName} just started following you on ${SITE_NAME}.`,
          bodyHtml: `
            <p><strong style="color:#fff;">${followerName}</strong> just started following you on ${SITE_NAME}.</p>
            <p style="color:#9ca3af;font-size:13px;">Check out their profile and follow back to grow your network!</p>
          `,
          ctaText: "View Profile",
          ctaUrl: `${SITE_URL}/profile`,
        }),
      };
    }
    case "post_liked": {
      const { likerName } = data;
      return {
        subject: `❤️ ${likerName} liked your post`,
        html: wrap({
          title: "❤️ Someone loves your content!",
          preheader: `${likerName} liked your post on ${SITE_NAME}.`,
          bodyHtml: `
            <p><strong style="color:#fff;">${likerName}</strong> just liked one of your posts. Keep creating great content! 🔥</p>
          `,
          ctaText: "View Your Posts",
          ctaUrl: `${SITE_URL}/shorts`,
        }),
      };
    }
    case "post_commented": {
      const { commenterName, commentPreview } = data;
      return {
        subject: `💬 ${commenterName} commented on your post`,
        html: wrap({
          title: "💬 New comment on your post",
          preheader: `${commenterName} commented on your post.`,
          bodyHtml: `
            <p><strong style="color:#fff;">${commenterName}</strong> left a comment on your post:</p>
            ${commentPreview ? `<div style="background:#1f1f2e;border-left:3px solid #dc2626;padding:12px 16px;margin:16px 0;border-radius:6px;"><p style="margin:0;color:#e5e7eb;font-size:14px;font-style:italic;">"${commentPreview}"</p></div>` : ""}
          `,
          ctaText: "Reply to Comment",
          ctaUrl: `${SITE_URL}/shorts`,
        }),
      };
    }
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const { type, userId, userEmail, data, previewOnly } = await req.json() as {
      type: EmailType;
      userId?: string;
      userEmail?: string;
      data: any;
      previewOnly?: boolean;
    };

    if (!type) throw new Error("Missing 'type'");

    // Preview mode — render template & return HTML without sending
    if (previewOnly) {
      const { subject, html } = buildEmail(type, data || {});
      return new Response(JSON.stringify({ success: true, preview: true, subject, html }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve recipient email
    let toEmail = userEmail;
    if (!toEmail && userId) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      const { data: { user } } = await supabase.auth.admin.getUserById(userId);
      toEmail = user?.email ?? undefined;
    }
    if (!toEmail) throw new Error("Could not resolve recipient email");

    const { subject, html } = buildEmail(type, data || {});

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [toEmail],
        reply_to: REPLY_TO,
        subject,
        html,
      }),
    });

    const result = await res.json();
    if (!res.ok) {
      console.error("Resend error:", result);
      return new Response(JSON.stringify({ success: false, error: result }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Email sent [${type}] to ${toEmail}: ${result.id}`);
    return new Response(JSON.stringify({ success: true, id: result.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("send-email error:", e);
    return new Response(JSON.stringify({ success: false, error: e.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
