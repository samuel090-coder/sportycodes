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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error('VAPID keys not configured. Please run generate-vapid-keys function and update secrets.');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const payload: NotificationPayload = await req.json();

    console.log('Sending notification:', payload);

    // Parse the VAPID keys - they should be JWK format JSON strings
    let publicKeyJWK: JsonWebKey;
    let privateKeyJWK: JsonWebKey;
    
    try {
      publicKeyJWK = JSON.parse(vapidPublicKey);
      privateKeyJWK = JSON.parse(vapidPrivateKey);
      console.log('VAPID keys parsed as JWK successfully');
    } catch (parseError) {
      console.error('VAPID keys are not in JWK format. Current VAPID_PUBLIC_KEY starts with:', vapidPublicKey.substring(0, 20));
      
      // The keys are likely in base64url format, need to regenerate
      throw new Error(
        'VAPID keys must be in JWK JSON format. ' +
        'Please call the generate-vapid-keys edge function to generate new keys, ' +
        'then update VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY secrets with the publicKeyJWK and privateKeyJWK values respectively.'
      );
    }

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
      contactInformation: 'mailto:samuelsunday09066423764@gmail.com',
      vapidKeys,
    });

    console.log('Application server created with VAPID keys');

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

    // Add image for rich notifications (Android big picture style)
    if (payload.data?.image) {
      notificationData.image = payload.data.image;
    }

    console.log('Notification payload:', JSON.stringify(notificationData));

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
