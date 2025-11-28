import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { currentPin, newPin } = await req.json();

    if (!currentPin || !newPin) {
      return new Response(
        JSON.stringify({ error: 'Current PIN and new PIN are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate new PIN format (4-6 digits)
    if (!/^\d{4,6}$/.test(newPin)) {
      return new Response(
        JSON.stringify({ error: 'New PIN must be 4-6 digits' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adminPin = Deno.env.get('ADMIN_PIN');
    
    if (!adminPin) {
      console.error('ADMIN_PIN environment variable not set');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify current PIN
    if (currentPin !== adminPin) {
      return new Response(
        JSON.stringify({ isValid: false, message: 'Current PIN is incorrect' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Note: In a real implementation, you would update the secret in Supabase
    // For now, we return success but admin needs to update the secret manually
    return new Response(
      JSON.stringify({ 
        isValid: true, 
        message: 'PIN verified. Please update ADMIN_PIN secret in project settings.',
        newPin: newPin
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});