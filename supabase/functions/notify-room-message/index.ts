import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { room_id, sender_id, message_preview } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get room name
    const { data: room } = await supabase.from("rooms").select("name").eq("id", room_id).single();
    if (!room) throw new Error("Room not found");

    // Get sender name
    const { data: sender } = await supabase.from("profiles").select("display_name, username").eq("id", sender_id).single();
    const senderName = sender?.display_name || sender?.username || "Someone";

    // Get all room members except sender
    const { data: members } = await supabase
      .from("room_members")
      .select("user_id")
      .eq("room_id", room_id)
      .eq("is_blocked", false)
      .neq("user_id", sender_id);

    if (!members || members.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const memberIds = members.map(m => m.user_id);

    // Get member emails from auth
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id")
      .in("id", memberIds);

    // Get push subscriptions for these users via their auth emails
    const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const memberEmails = (authUsers?.users || [])
      .filter(u => memberIds.includes(u.id))
      .map(u => u.email)
      .filter(Boolean);

    if (memberEmails.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("subscription")
      .in("user_email", memberEmails);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");

    if (!vapidPrivateKey || !vapidPublicKey) {
      return new Response(JSON.stringify({ sent: 0, error: "VAPID keys not set" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Send notifications via the existing send-push-notification function
    let sent = 0;
    const title = `💬 ${room.name}`;
    const body = `${senderName}: ${message_preview || "sent a message"}`;

    for (const sub of subscriptions) {
      try {
        await supabase.functions.invoke("send-push-notification", {
          body: {
            subscription: sub.subscription,
            title,
            body,
            icon: "/icon-192.png",
            data: { url: `/rooms/${room_id}` },
          },
        });
        sent++;
      } catch {
        // Skip failed sends
      }
    }

    return new Response(JSON.stringify({ sent }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
