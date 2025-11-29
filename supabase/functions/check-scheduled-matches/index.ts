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

    console.log('Checking for scheduled matches that should go live...');

    const now = new Date().toISOString();

    // Find all sure odds that:
    // 1. Have a scheduled time
    // 2. Scheduled time has passed
    // 3. Status is still "not-started"
    const { data: readyMatches, error: fetchError } = await supabase
      .from('sure_odds')
      .select('*')
      .eq('status', 'not-started')
      .not('scheduled_time', 'is', null)
      .lte('scheduled_time', now);

    if (fetchError) {
      console.error('Error fetching scheduled matches:', fetchError);
      throw fetchError;
    }

    if (!readyMatches || readyMatches.length === 0) {
      console.log('No matches ready to go live');
      return new Response(
        JSON.stringify({ success: true, message: 'No matches to update', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${readyMatches.length} matches ready to go live`);

    // Process each match
    const results = await Promise.allSettled(
      readyMatches.map(async (match) => {
        try {
          // Send notification
          const oddName = match.match_count > 1 
            ? `${match.match_count} SURE ODDS`
            : `${match.home_team} vs ${match.away_team}`;

          await supabase.functions.invoke('notify-match-live', {
            body: {
              sureOddId: match.id,
              oddName,
              matchCount: match.match_count
            }
          });

          console.log(`✓ Sent live notification for: ${oddName}`);
          return { success: true, id: match.id, name: oddName };
        } catch (error) {
          console.error(`Failed to notify for match ${match.id}:`, error);
          return { success: false, id: match.id, error };
        }
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;

    console.log(`Processed ${results.length} matches: ${successful} notified, ${failed} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        total: results.length,
        notified: successful,
        failed 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in check-scheduled-matches:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
