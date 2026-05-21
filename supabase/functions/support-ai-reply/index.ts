import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { conversationId } = await req.json();
    if (!conversationId) throw new Error("conversationId required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check global AI toggle
    const { data: setting } = await supabase
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "support_ai_enabled")
      .maybeSingle();
    if (setting?.setting_value !== "true") {
      return new Response(JSON.stringify({ skipped: true, reason: "AI disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load conversation + user_id
    const { data: conv } = await supabase
      .from("support_conversations")
      .select("user_id")
      .eq("id", conversationId)
      .maybeSingle();
    if (!conv) throw new Error("Conversation not found");

    // Last 20 messages
    const { data: history } = await supabase
      .from("support_messages")
      .select("sender_role, content, image_url, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(20);

    // Build user context snapshot
    const [profileRes, walletRes, depositsRes, paymentsRes, referralsRes, tapsRes] = await Promise.all([
      supabase.from("profiles").select("display_name, referral_code, referral_earnings, total_earned, country").eq("id", conv.user_id).maybeSingle(),
      supabase.from("wallets").select("balance").eq("user_id", conv.user_id).maybeSingle(),
      supabase.from("deposit_requests").select("amount, status, created_at, admin_note").eq("user_id", conv.user_id).order("created_at", { ascending: false }).limit(5),
      supabase.from("payments").select("amount, status, item_type, created_at").eq("user_email", "").limit(5), // best-effort; payments keyed by email
      supabase.from("referrals").select("status, created_at").eq("referrer_id", conv.user_id).limit(10),
      supabase.from("daily_taps").select("tap_count, earnings, tap_date").eq("user_id", conv.user_id).order("tap_date", { ascending: false }).limit(3),
    ]);

    const ctx = {
      profile: profileRes.data,
      wallet_balance: walletRes.data?.balance ?? 0,
      recent_deposits: depositsRes.data ?? [],
      referrals_total: referralsRes.data?.length ?? 0,
      referrals_completed: (referralsRes.data ?? []).filter((r: any) => r.status === "completed").length,
      recent_taps: tapsRes.data ?? [],
    };

    const systemPrompt = `You are "Sporty Support", a warm, professional human-like customer support agent for SPORTY CODES — a Nigerian sports betting tips platform with wallet deposits, sure odds, betting pools, tap-to-earn, and referrals.

You have access to the user's REAL account data below. Use it to answer with specifics. Be friendly, helpful, and speak naturally (not robotic). Use ₦ for currency. Keep replies short (1-3 short paragraphs) unless detail is asked for.

Rules:
- Never reveal you are an AI unless directly asked.
- Never make up data — only use the snapshot below.
- For deposit/withdrawal disputes: confirm details from snapshot, then say a human admin will follow up if needed.
- Minimum deposit to earn: ₦1000. Withdrawals require 3 valid referrals (each must have deposited ₦1000).
- If user uploads an image (e.g., payment screenshot), describe what you see and help accordingly.

USER ACCOUNT SNAPSHOT:
${JSON.stringify(ctx, null, 2)}`;

    const messages: any[] = [{ role: "system", content: systemPrompt }];
    for (const m of history ?? []) {
      const role = m.sender_role === "user" ? "user" : "assistant";
      if (m.image_url && m.sender_role === "user") {
        messages.push({
          role: "user",
          content: [
            { type: "text", text: m.content || "(image attached)" },
            { type: "image_url", image_url: { url: m.image_url } },
          ],
        });
      } else {
        messages.push({ role, content: m.content || "" });
      }
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI error", aiRes.status, t);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    const aiJson = await aiRes.json();
    const reply = aiJson.choices?.[0]?.message?.content?.trim() || "I'm here — could you tell me a bit more?";

    await supabase.from("support_messages").insert({
      conversation_id: conversationId,
      sender_role: "ai",
      content: reply,
    });

    await supabase
      .from("support_conversations")
      .update({ last_message_at: new Date().toISOString(), unread_for_user: 0 })
      .eq("id", conversationId);

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
