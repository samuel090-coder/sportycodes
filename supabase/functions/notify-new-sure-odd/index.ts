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

    const { sureOddId, oddName, matchCount } = await req.json();

    console.log('Sending notification for new sure odd:', { sureOddId, oddName, matchCount });

    // Create notification message
    const title = '🎯 New Sure Odds Available!';
    const body = matchCount > 1 
      ? `${matchCount} SURE ODDS: ${oddName} is now live! Tap to view.`
      : `New prediction: ${oddName} is now available!`;

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
        tag: `new-odd-${sureOddId}`,
        data: {
          type: 'new_sure_odd',
          sureOddId,
          oddName
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
    console.error('Error in notify-new-sure-odd:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
