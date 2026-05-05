const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { template, userName, amount, reason, custom } = await req.json();
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) throw new Error('LOVABLE_API_KEY missing');

    const prompt = `You are SPORTY CODES support. Write a short, friendly email (max 120 words) for a user.
Template type: ${template}
User name: ${userName || 'there'}
Deposit amount: ${amount ? '₦' + amount : 'N/A'}
Context/reason: ${reason || custom || 'standard'}

Output JSON: {"subject": "...", "body": "..."}.
Tone: warm, clear, branded "SPORTY CODES".
For "approved": confirm credit, thank them, encourage them to enjoy odds.
For "failed": apologize, ask them to recheck transfer, offer to resubmit.
For "warning": polite caution about suspicious activity, request clarification.
For "reminder": gentle nudge to complete pending deposit.
For "custom": follow the context exactly.
End with: "— SPORTY CODES Team".`;

    const r = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      console.error('AI error', r.status, t);
      return new Response(JSON.stringify({ error: `AI: ${r.status}` }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const data = await r.json();
    const text = data?.choices?.[0]?.message?.content || '{}';
    let parsed: any = {};
    try { parsed = JSON.parse(text); } catch { parsed = { subject: 'SPORTY CODES', body: text }; }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
