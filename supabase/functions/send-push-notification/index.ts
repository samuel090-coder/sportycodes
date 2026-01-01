import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import * as webpush from "jsr:@negrel/webpush@0.5.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPayload {
  title: string;
  body: string;
  userEmail?: string;
  tag?: string;
  data?: {
    image?: string;
    url?: string;
    [key: string]: any;
  };
}

// Cache for application server
let appServer: webpush.ApplicationServer | null = null;

async function getAppServer(): Promise<webpush.ApplicationServer> {
  if (appServer) return appServer;

  const publicKeyJWK = Deno.env.get('VAPID_PUBLIC_KEY');
  const privateKeyJWK = Deno.env.get('VAPID_PRIVATE_KEY');

  if (!publicKeyJWK || !privateKeyJWK) {
    throw new Error('VAPID keys not configured. Please set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY secrets.');
  }

  try {
    // Parse the JWK strings
    const publicKey = JSON.parse(publicKeyJWK);
    const privateKey = JSON.parse(privateKeyJWK);

    console.log('Importing VAPID keys...');

    // Import VAPID keys
    const vapidKeys = await webpush.importVapidKeys({
      publicKey,
      privateKey,
    });

    console.log('Creating ApplicationServer...');

    // Create application server
    appServer = await webpush.ApplicationServer.new({
      contactInformation: "mailto:admin@sportycodes.com",
      vapidKeys,
    });

    console.log('ApplicationServer created successfully');
    return appServer;
  } catch (error) {
    console.error('Error setting up ApplicationServer:', error);
    throw new Error(`Failed to setup ApplicationServer: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);
    const payload: NotificationPayload = await req.json();

    console.log('Sending notification:', JSON.stringify(payload));

    // Get application server
    const server = await getAppServer();

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

    // Build notification data with rich content support
    const notificationData: any = {
      title: payload.title,
      body: payload.body,
      tag: payload.tag || 'sporty-codes-notification',
      data: payload.data || {},
      icon: '/icon-192.png',
      badge: '/icon-192.png',
    };

    // Add image for rich notifications
    if (payload.data?.image) {
      notificationData.image = payload.data.image;
    }

    const notificationPayloadStr = JSON.stringify(notificationData);
    console.log('Notification payload:', notificationPayloadStr);

    // Send push notification to each subscription using web-push
    const results = await Promise.allSettled(
      subscriptions.map(async (sub: any) => {
        try {
          const subscription = sub.subscription;

          console.log(`Sending push to ${sub.user_email}...`);

          // Create a PushSubscription object for the webpush library
          const pushSubscription = {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.keys.p256dh,
              auth: subscription.keys.auth,
            },
          };

          // Subscribe and send notification
          const subscriber = server.subscribe(pushSubscription);
          
          await subscriber.pushTextMessage(notificationPayloadStr, {
            ttl: 86400,
            urgency: webpush.Urgency.High,
          });

          console.log(`✓ Notification sent to ${sub.user_email}`);
          return { success: true, email: sub.user_email };
        } catch (error: any) {
          console.error(`Failed to send to ${sub.user_email}:`, error.message || error);
          
          // Check if subscription is gone (expired/invalid)
          if (error instanceof webpush.PushMessageError && error.isGone()) {
            await supabase.from('push_subscriptions').delete().eq('id', sub.id);
            console.log(`Deleted invalid subscription for ${sub.user_email}`);
          }
          
          return { success: false, email: sub.user_email, error: error.message || 'Unknown error' };
        }
      })
    );

    const successful = results.filter((r) => {
      return r.status === 'fulfilled' && (r.value as any).success;
    }).length;
    const failed = results.length - successful;

    console.log(`Notification results: ${successful} successful, ${failed} failed out of ${subscriptions.length} total`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successful, 
        failed,
        total: subscriptions.length,
        message: successful > 0 
          ? `Sent to ${successful}/${subscriptions.length} subscribers` 
          : 'No notifications delivered - check VAPID keys configuration'
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
