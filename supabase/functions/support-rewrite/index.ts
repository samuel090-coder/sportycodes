const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { draft } = await req.json();
    if (!draft || typeof draft !== "string") throw new Error("draft required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are an official customer support copy editor for SPORTY CODES. Rewrite the admin's draft reply into polished, intensive, professional, courteous English. Keep the original meaning, names, amounts, and facts. Do not add greetings if absent. Reply with ONLY the rewritten message — no preamble, no quotes, no labels.",
          },
          { role: "user", content: draft },
        ],
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("rewrite error", aiRes.status, t);
      throw new Error("rewrite failed");
    }
    const j = await aiRes.json();
    const text = j.choices?.[0]?.message?.content?.trim() || draft;
    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
