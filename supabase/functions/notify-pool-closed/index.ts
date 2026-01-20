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

    const { poolId, poolTitle } = await req.json();

    console.log('Sending pool closed notification:', { poolId, poolTitle });

    // Get all participants in this pool
    const { data: entries, error: entriesError } = await supabase
      .from('betting_entries')
      .select('user_id')
      .eq('pool_id', poolId);

    if (entriesError) throw entriesError;

    // Get user emails from profiles
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

    const participantEmails = users
      ?.filter(u => userIds.includes(u.id))
      .map(u => u.email)
      .filter(Boolean) || [];

    // Create notification message
    const title = '🔒 Betting Pool Closed!';
    const body = `"${poolTitle}" has closed. Results will be announced soon!`;

    // Send notification to all participants
    for (const email of participantEmails) {
      await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          body,
          userEmail: email,
          tag: `pool-closed-${poolId}`,
          data: {
            type: 'pool_closed',
            poolId,
            poolTitle
          }
        })
      });
    }

    console.log(`Notified ${participantEmails.length} participants`);

    return new Response(
      JSON.stringify({ success: true, notified: participantEmails.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in notify-pool-closed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
