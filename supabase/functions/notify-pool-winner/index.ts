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

    const { userId, userEmail, poolTitle, payoutAmount } = await req.json();

    console.log('Sending winner notification:', { userId, userEmail, poolTitle, payoutAmount });

    // Format payout amount with currency
    const formattedPayout = new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(payoutAmount);

    // Create notification message
    const title = '💰 You Won! Money Added to Wallet!';
    const body = `Congratulations! You won ${formattedPayout} from "${poolTitle}". The money has been added to your wallet!`;

    // Send notification to the winner
    const response = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        body,
        userEmail,
        tag: `pool-winner-${userId}`,
        data: {
          type: 'pool_winner',
          poolTitle,
          payoutAmount,
          action: 'view_wallet'
        }
      })
    });

    const result = await response.json();
    console.log('Winner notification result:', result);

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in notify-pool-winner:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
