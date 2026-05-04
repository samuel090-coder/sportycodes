import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageDataUrl } = await req.json();
    if (!imageDataUrl) throw new Error("imageDataUrl is required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const tools = [{
      type: "function",
      function: {
        name: "extract_win",
        description: "Extract winning ticket data from a sports betting win screenshot.",
        parameters: {
          type: "object",
          properties: {
            bookmaker: { type: "string" },
            ticket_id: { type: "string" },
            verify_code: { type: "string" },
            bet_type: { type: "string", description: "e.g. Multiple, Single" },
            total_stake: { type: "number" },
            total_odds: { type: "number" },
            total_return: { type: "number" },
            total_bonus: { type: "number" },
            selections: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  home_team: { type: "string" },
                  away_team: { type: "string" },
                  market: { type: "string" },
                  pick: { type: "string" },
                  odds: { type: "number" },
                  outcome: { type: "string" },
                  final_score: { type: "string" },
                },
                required: ["home_team", "away_team", "market", "pick", "odds"],
              },
            },
          },
          required: ["total_return"],
        },
      },
    }];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Extract winning ticket data from sportsbook win screenshots. Return only via the extract_win tool." },
          { role: "user", content: [
            { type: "text", text: "Extract the bookmaker, ticket id, verify code, total stake, odds, return, bonus, and every selection." },
            { type: "image_url", image_url: { url: imageDataUrl } },
          ]},
        ],
        tools,
        tool_choice: { type: "function", function: { name: "extract_win" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI gateway error: " + await response.text());
    }
    const data = await response.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) throw new Error("No data extracted");
    const parsed = JSON.parse(call.function.arguments);
    return new Response(JSON.stringify({ data: parsed }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("parse-win-screenshot error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
