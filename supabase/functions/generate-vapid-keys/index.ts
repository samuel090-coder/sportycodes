import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as webpush from "jsr:@negrel/webpush@0.5.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to convert Uint8Array to base64url
function base64UrlEncode(buffer: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...buffer));
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Generating VAPID keys...');
    
    // Generate VAPID keys
    const vapidKeys = await webpush.generateVapidKeys({ extractable: true });
    
    // Export the keys to JWK format
    const publicKeyJWK = await crypto.subtle.exportKey('jwk', vapidKeys.publicKey);
    const privateKeyJWK = await crypto.subtle.exportKey('jwk', vapidKeys.privateKey);
    
    // Also create the raw base64url format for the frontend
    const rawPublicKey = await crypto.subtle.exportKey('raw', vapidKeys.publicKey);
    const publicKeyBase64Url = base64UrlEncode(new Uint8Array(rawPublicKey));
    
    console.log('VAPID keys generated successfully');
    
    return new Response(
      JSON.stringify({
        publicKeyJWK: JSON.stringify(publicKeyJWK),
        privateKeyJWK: JSON.stringify(privateKeyJWK),
        publicKeyBase64Url,
        instructions: {
          step1: 'Copy publicKeyJWK and privateKeyJWK values',
          step2: 'Update VAPID_PUBLIC_KEY secret with publicKeyJWK',
          step3: 'Update VAPID_PRIVATE_KEY secret with privateKeyJWK',
          step4: `Update src/lib/pushNotifications.ts VAPID_PUBLIC_KEY constant to: ${publicKeyBase64Url}`,
        }
      }, null, 2),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating VAPID keys:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
