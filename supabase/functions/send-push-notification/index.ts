import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPayload {
  title: string;
  body: string;
  userEmail?: string; // If provided, send to specific user, else send to all
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
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvRuwGWYWkSWQPjRnFCnRhJCNaXdyKBkqPLBwOZOiZNLqjEDLRDaWo';

    if (!vapidPrivateKey) {
      throw new Error('VAPID_PRIVATE_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const payload: NotificationPayload = await req.json();

    console.log('Sending notification:', payload);

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

    // Send push notification to each subscription
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          const subscription = sub.subscription;
          
          // Create notification payload
          const notificationData = {
            title: payload.title,
            body: payload.body,
            tag: payload.tag || 'sporty-codes-notification',
            data: payload.data || {}
          };

          // Use Web Push protocol
          const pushSubscription = {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.keys.p256dh,
              auth: subscription.keys.auth
            }
          };

          // Create JWT for VAPID
          const vapidHeaders = createVapidHeaders(
            pushSubscription.endpoint,
            vapidPublicKey,
            vapidPrivateKey
          );

          // Send the notification
          const response = await fetch(pushSubscription.endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': vapidHeaders.Authorization,
              'Crypto-Key': vapidHeaders['Crypto-Key']
            },
            body: JSON.stringify(notificationData)
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Push failed for ${sub.user_email}:`, response.status, errorText);
            
            // If subscription is no longer valid (410 Gone), delete it
            if (response.status === 410) {
              await supabase
                .from('push_subscriptions')
                .delete()
                .eq('id', sub.id);
              console.log(`Deleted invalid subscription for ${sub.user_email}`);
            }
            
            throw new Error(`Push failed: ${response.status}`);
          }

          console.log(`✓ Notification sent to ${sub.user_email}`);
          return { success: true, email: sub.user_email };
        } catch (error) {
          console.error(`Failed to send to ${sub.user_email}:`, error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          return { success: false, email: sub.user_email, error: errorMessage };
        }
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;

    console.log(`Notification sent: ${successful} successful, ${failed} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successful, 
        failed,
        total: subscriptions.length 
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

// Helper function to create VAPID headers
function createVapidHeaders(endpoint: string, publicKey: string, privateKey: string) {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  
  // Create JWT header and payload
  const header = {
    typ: 'JWT',
    alg: 'ES256'
  };
  
  const jwtPayload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, // 12 hours
    sub: 'mailto:admin@sportycodes.com'
  };

  // For now, use a simplified approach - in production you'd use proper JWT signing
  const jwtToken = `${btoa(JSON.stringify(header))}.${btoa(JSON.stringify(jwtPayload))}`;
  
  return {
    'Authorization': `vapid t=${jwtToken}, k=${publicKey}`,
    'Crypto-Key': `p256ecdsa=${publicKey}`
  };
}
