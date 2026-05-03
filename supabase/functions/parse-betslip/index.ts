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
        name: "extract_betslip",
        description: "Extract structured betslip data from a betting slip screenshot.",
        parameters: {
          type: "object",
          properties: {
            bookmaker: { type: "string", description: "Bookmaker name (e.g. SportyBet)" },
            booking_code: { type: "string", description: "Booking / bet code" },
            total_odds: { type: "number" },
            max_bonus_pct: { type: "number", description: "Max bonus percentage" },
            stake: { type: "number" },
            bonus: { type: "number" },
            payout: { type: "number" },
            slip_date: { type: "string", description: "Date shown on slip if visible" },
            selections: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  home_team: { type: "string" },
                  away_team: { type: "string" },
                  market: { type: "string", description: "e.g. Correct Score, 1X2, Over/Under" },
                  pick: { type: "string", description: "The selection itself, e.g. 0:3, Home Win" },
                  odds: { type: "number" },
                },
                required: ["home_team", "away_team", "market", "pick", "odds"],
              },
            },
          },
          required: ["booking_code", "total_odds", "selections"],
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
          {
            role: "system",
            content: "You extract structured data from betting slip screenshots. Return only via the extract_betslip tool. Be precise with numbers and team abbreviations exactly as shown.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract every selection and all financial fields from this betslip." },
              { type: "image_url", image_url: { url: imageDataUrl } },
            ],
          },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "extract_betslip" } },
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in workspace settings." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) throw new Error("No structured data extracted");
    const parsed = JSON.parse(call.function.arguments);

    return new Response(JSON.stringify({ data: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-betslip error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
