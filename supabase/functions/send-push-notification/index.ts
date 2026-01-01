import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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

    const supabase = createClient(supabaseUrl, supabaseKey);
    const payload: NotificationPayload = await req.json();

    console.log('Sending notification:', JSON.stringify(payload));

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

    const notificationPayload = JSON.stringify(notificationData);
    console.log('Notification payload:', notificationPayload);

    // Send push notification to each subscription
    // Note: For Web Push to work properly, we need proper VAPID signing
    // This simplified version attempts direct push which may not work for all browsers
    // For production, consider using a service like OneSignal or Firebase Cloud Messaging
    
    const results = await Promise.allSettled(
      subscriptions.map(async (sub: any) => {
        try {
          const subscription = sub.subscription;
          const endpoint = subscription.endpoint;

          console.log(`Attempting push to ${sub.user_email}, endpoint: ${endpoint.substring(0, 60)}...`);

          // For FCM (Firebase Cloud Messaging) endpoints, we can try direct POST
          // For other endpoints (Mozilla, etc.), VAPID is required
          
          const isFCM = endpoint.includes('fcm.googleapis.com') || endpoint.includes('firebase');
          
          if (isFCM) {
            // FCM endpoints can accept direct push with just the payload
            const response = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'TTL': '86400',
              },
              body: notificationPayload,
            });

            if (!response.ok) {
              const responseText = await response.text();
              console.error(`FCM push failed for ${sub.user_email}: ${response.status} - ${responseText}`);

              // If subscription is expired or invalid, delete it
              if (response.status === 410 || response.status === 404) {
                await supabase.from('push_subscriptions').delete().eq('id', sub.id);
                console.log(`Deleted invalid subscription for ${sub.user_email}`);
              }

              throw new Error(`FCM returned ${response.status}`);
            }

            console.log(`✓ FCM notification sent to ${sub.user_email}`);
            return { success: true, email: sub.user_email, method: 'fcm' };
          } else {
            // For non-FCM endpoints, we need VAPID authentication
            // Store the subscription info and mark as pending
            console.log(`Non-FCM endpoint for ${sub.user_email} - requires VAPID auth`);
            
            // Try anyway with basic headers
            const response = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/octet-stream',
                'TTL': '86400',
                'Urgency': 'high',
              },
              body: new TextEncoder().encode(notificationPayload),
            });

            if (!response.ok) {
              const responseText = await response.text();
              console.log(`Non-FCM push response for ${sub.user_email}: ${response.status} - ${responseText.substring(0, 100)}`);
              
              if (response.status === 410 || response.status === 404) {
                await supabase.from('push_subscriptions').delete().eq('id', sub.id);
                console.log(`Deleted invalid subscription for ${sub.user_email}`);
              }
              
              // Don't throw - just log and continue
              return { success: false, email: sub.user_email, error: `Status ${response.status}`, method: 'direct' };
            }

            console.log(`✓ Direct notification sent to ${sub.user_email}`);
            return { success: true, email: sub.user_email, method: 'direct' };
          }
        } catch (error: any) {
          console.error(`Failed to send to ${sub.user_email}:`, error.message);
          return { success: false, email: sub.user_email, error: error.message };
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
          : 'Push delivery attempted - check device settings'
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