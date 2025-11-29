import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import * as webpush from "jsr:@negrel/webpush@0.5.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to convert base64url to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Helper function to convert Uint8Array to base64url
function base64UrlEncode(buffer: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...buffer));
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

interface NotificationPayload {
  title: string;
  body: string;
  userEmail?: string;
  tag?: string;
  data?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');

    if (!vapidPrivateKey || !vapidPublicKey) {
      throw new Error('VAPID keys not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const payload: NotificationPayload = await req.json();

    console.log('Sending notification:', payload);

    // Convert base64url VAPID keys to proper format for webpush library
    // The keys are stored as base64url strings, need to convert to JsonWebKey
    const publicKeyBytes = urlBase64ToUint8Array(vapidPublicKey);
    const privateKeyBytes = urlBase64ToUint8Array(vapidPrivateKey);

    // Create JsonWebKey objects from the raw bytes
    const publicKeyJWK: JsonWebKey = {
      kty: "EC",
      crv: "P-256",
      x: base64UrlEncode(publicKeyBytes.slice(1, 33)),
      y: base64UrlEncode(publicKeyBytes.slice(33, 65)),
      ext: true,
    };

    const privateKeyJWK: JsonWebKey = {
      kty: "EC",
      crv: "P-256",
      d: base64UrlEncode(privateKeyBytes),
      ext: true,
    };

    console.log('VAPID keys converted to JWK format');

    // Import VAPID keys
    const vapidKeys = await webpush.importVapidKeys(
      {
        publicKey: publicKeyJWK,
        privateKey: privateKeyJWK,
      },
      { extractable: false }
    );

    // Create application server
    const appServer = await webpush.ApplicationServer.new({
      contactInformation: 'mailto:admin@sportycodes.com',
      vapidKeys,
    });

    // Get subscriptions based on userEmail or all
    let query = supabase.from('push_subscriptions').select('*');
    
    if (payload.userEmail) {
      query = query.eq('user_email', payload.userEmail);
    }

    const { data: subscriptions, error } = await query;

    if (error) {
      console.error('Error fetching subscriptions:', error);
      throw error;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No subscriptions found');
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No subscriptions found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${subscriptions.length} subscriptions`);

    const notificationData = {
      title: payload.title,
      body: payload.body,
      tag: payload.tag || 'sporty-codes-notification',
      data: payload.data || {},
      icon: '/favicon.ico',
      badge: '/favicon.ico',
    };

    // Send push notification to each subscription
    const results = await Promise.allSettled(
      subscriptions.map(async (sub: any) => {
        try {
          const subscription = sub.subscription;

          try {
            // Create a subscriber object
            const subscriber = appServer.subscribe(subscription);

            // Send notification
            await subscriber.pushTextMessage(
              JSON.stringify(notificationData),
              { ttl: 86400 }
            );

            console.log(`✓ Notification sent to ${sub.user_email}`);
            return { success: true, email: sub.user_email };
          } catch (err: any) {
            console.error(`Push error for ${sub.user_email}:`, err?.message);

            // If subscription is no longer valid, delete it
            if (err?.message?.includes('410') || err?.message?.includes('404')) {
              await supabase
                .from('push_subscriptions')
                .delete()
                .eq('id', sub.id);
              console.log(`Deleted invalid subscription for ${sub.user_email}`);
            }

            throw err;
          }
        } catch (error) {
          console.error(`Failed to send to ${sub.user_email}:`, error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          return { success: false, email: sub.user_email, error: errorMessage };
        }
      })
    );

    const successful = results.filter((r) => {
      return r.status === 'fulfilled' && (r.value as any).success;
    }).length;
    const failed = results.length - successful;

    console.log(`Notification sent: ${successful} successful, ${failed} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successful, 
        failed,
        total: subscriptions.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-push-notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
