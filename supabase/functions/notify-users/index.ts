import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Audience = "user" | "all" | "vip" | "free";

interface Body {
  title: string;
  body: string;
  audience?: Audience;
  userId?: string;
  userEmail?: string;
  category?: string;
  url?: string;
  image?: string;
  tag?: string;
  /** when false, only the in-app notification is stored */
  push?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const payload: Body = await req.json();
    const title = (payload.title || "").trim();
    const body = (payload.body || "").trim();

    if (!title || !body) {
      return new Response(JSON.stringify({ error: "title and body are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const audience: Audience = payload.audience ?? (payload.userId || payload.userEmail ? "user" : "all");
    const isBroadcast = audience !== "user";
    const category = payload.category || (isBroadcast ? "announcement" : "general");

    // ---- resolve recipients (id + email) ----
    const recipients: { id: string; email: string | null }[] = [];

    const listAllUsers = async () => {
      const out: { id: string; email: string | null }[] = [];
      let page = 1;
      while (page < 50) {
        const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) throw error;
        const users = data?.users ?? [];
        users.forEach((u) => out.push({ id: u.id, email: u.email ?? null }));
        if (users.length < 1000) break;
        page += 1;
      }
      return out;
    };

    if (audience === "user") {
      if (payload.userId) {
        const { data } = await supabase.auth.admin.getUserById(payload.userId);
        recipients.push({ id: payload.userId, email: data?.user?.email ?? payload.userEmail ?? null });
      } else if (payload.userEmail) {
        const all = await listAllUsers();
        const match = all.find((u) => u.email?.toLowerCase() === payload.userEmail!.toLowerCase());
        recipients.push({ id: match?.id ?? "", email: payload.userEmail });
      }
    } else {
      const all = await listAllUsers();
      if (audience === "all") {
        recipients.push(...all);
      } else {
        const { data: vips } = await supabase
          .from("vip_subscriptions")
          .select("user_id, expires_at")
          .eq("status", "active")
          .gt("expires_at", new Date().toISOString());
        const vipIds = new Set((vips ?? []).map((v: any) => v.user_id));
        recipients.push(
          ...all.filter((u) => (audience === "vip" ? vipIds.has(u.id) : !vipIds.has(u.id))),
        );
      }
    }

    // ---- store in-app notifications (recipient scoped) ----
    const rows = recipients
      .filter((r) => !!r.id)
      .map((r) => ({
        user_id: r.id,
        title,
        body,
        category,
        url: payload.url ?? null,
        image_url: payload.image ?? null,
        is_broadcast: isBroadcast,
        metadata: { audience },
      }));

    if (rows.length > 0) {
      for (let i = 0; i < rows.length; i += 500) {
        const { error } = await supabase.from("notifications").insert(rows.slice(i, i + 500));
        if (error) console.error("notification insert error", error);
      }
    }

    // ---- push delivery ----
    let pushSent = 0;
    if (payload.push !== false) {
      const emails = recipients.map((r) => r.email).filter((e): e is string => !!e);
      const pushPayload = {
        title,
        body,
        tag: payload.tag,
        data: { url: payload.url, image: payload.image, category },
      };

      const send = async (userEmail?: string) => {
        const res = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
          body: JSON.stringify(userEmail ? { ...pushPayload, userEmail } : pushPayload),
        });
        const json = await res.json().catch(() => ({}));
        return Number(json?.sent ?? 0);
      };

      if (audience === "all") {
        // one call fans out to every stored subscription (covers guest device ids too)
        pushSent = await send();
      } else {
        const results = await Promise.allSettled(emails.map((e) => send(e)));
        pushSent = results.reduce(
          (acc, r) => acc + (r.status === "fulfilled" ? r.value : 0),
          0,
        );
      }
    }

    return new Response(
      JSON.stringify({ success: true, audience, recipients: rows.length, pushSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("notify-users error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
