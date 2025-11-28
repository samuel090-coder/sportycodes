import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { sureOddId, oddName, status, matchCount } = await req.json();

    console.log('Sending notification for result update:', { sureOddId, oddName, status });

    // Create notification message based on status
    const isWin = status === 'scored';
    const title = isWin ? '✅ WINNER!' : '❌ Result Update';
    const body = matchCount > 1
      ? `${matchCount} SURE ODDS: ${oddName} - ${isWin ? 'Congratulations! 🎉' : 'Better luck next time'}`
      : `${oddName} - ${isWin ? 'We won! 🎉' : 'Match lost'}`;

    // Call the send-push-notification function
    const response = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        title,
        body,
        tag: `result-${sureOddId}`,
        data: {
          type: 'result_update',
          sureOddId,
          oddName,
          status
        }
      })
    });

    const result = await response.json();
    console.log('Notification result:', result);

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in notify-result-update:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
