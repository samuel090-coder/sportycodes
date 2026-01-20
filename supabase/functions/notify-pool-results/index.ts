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

    const { poolId, poolTitle, winningOption, winningOptionLabel } = await req.json();

    console.log('Sending pool results notification:', { poolId, poolTitle, winningOption });

    // Get all participants in this pool
    const { data: entries, error: entriesError } = await supabase
      .from('betting_entries')
      .select('user_id, selected_option')
      .eq('pool_id', poolId);

    if (entriesError) throw entriesError;

    // Get unique user IDs
    const userIds = [...new Set(entries?.map(e => e.user_id) || [])];
    
    if (userIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No participants to notify' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get auth emails for these users
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) throw usersError;

    // Create a map of userId to email
    const userEmailMap = new Map<string, string>();
    users?.forEach(u => {
      if (u.email) userEmailMap.set(u.id, u.email);
    });

    // Send personalized notifications to each participant
    let notifiedCount = 0;
    for (const entry of entries || []) {
      const email = userEmailMap.get(entry.user_id);
      if (!email) continue;

      const isWinner = entry.selected_option === winningOption;
      const title = isWinner ? '🎉 Results Announced - You Won!' : '📊 Results Announced';
      const body = isWinner 
        ? `"${poolTitle}" results are in! "${winningOptionLabel}" won. Check your winnings!`
        : `"${poolTitle}" results are in. "${winningOptionLabel}" won. Better luck next time!`;

      await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          body,
          userEmail: email,
          tag: `pool-results-${poolId}`,
          data: {
            type: 'pool_results',
            poolId,
            poolTitle,
            isWinner,
            winningOption
          }
        })
      });
      notifiedCount++;
    }

    console.log(`Notified ${notifiedCount} participants about results`);

    return new Response(
      JSON.stringify({ success: true, notified: notifiedCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in notify-pool-results:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
