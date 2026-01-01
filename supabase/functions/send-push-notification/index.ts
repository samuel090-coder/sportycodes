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

type VapidJwk = {
  kty: "EC";
  crv: "P-256";
  alg?: "ES256";
  x: string;
  y: string;
  d?: string;
  ext?: boolean;
  key_ops?: string[];
};

const isJsonObjectString = (value: string) => {
  const v = value.trim();
  return v.startsWith("{") && v.endsWith("}");
};

const base64UrlToBytes = (base64Url: string): Uint8Array => {
  const padded = base64Url + "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const bytesToBase64Url = (bytes: Uint8Array): string => {
  let binary = "";
  // chunk to avoid call stack limits
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const toPublicJwk = (secret: string): VapidJwk => {
  const trimmed = secret.trim();

  if (isJsonObjectString(trimmed)) {
    console.log("VAPID_PUBLIC_KEY detected as JWK JSON");
    return JSON.parse(trimmed) as VapidJwk;
  }

  console.log("VAPID_PUBLIC_KEY detected as base64url raw key");
  const raw = base64UrlToBytes(trimmed);

  // Raw uncompressed EC point: 0x04 || X(32) || Y(32)
  if (raw.length === 65 && raw[0] === 0x04) {
    const x = raw.slice(1, 33);
    const y = raw.slice(33, 65);
    return {
      kty: "EC",
      crv: "P-256",
      alg: "ES256",
      x: bytesToBase64Url(x),
      y: bytesToBase64Url(y),
      ext: true,
      key_ops: ["verify"],
    };
  }

  // Some libs omit the 0x04 prefix and store X||Y
  if (raw.length === 64) {
    const x = raw.slice(0, 32);
    const y = raw.slice(32, 64);
    return {
      kty: "EC",
      crv: "P-256",
      alg: "ES256",
      x: bytesToBase64Url(x),
      y: bytesToBase64Url(y),
      ext: true,
      key_ops: ["verify"],
    };
  }

  throw new Error(`Unsupported VAPID public key raw length: ${raw.length}`);
};

const toPrivateJwk = (secret: string, pub: VapidJwk): VapidJwk => {
  const trimmed = secret.trim();

  if (isJsonObjectString(trimmed)) {
    console.log("VAPID_PRIVATE_KEY detected as JWK JSON");
    return JSON.parse(trimmed) as VapidJwk;
  }

  console.log("VAPID_PRIVATE_KEY detected as base64url raw key");
  const raw = base64UrlToBytes(trimmed);

  // Raw private key for P-256 is 32 bytes
  if (raw.length !== 32) {
    throw new Error(`Unsupported VAPID private key raw length: ${raw.length}`);
  }

  return {
    kty: "EC",
    crv: "P-256",
    alg: "ES256",
    x: pub.x,
    y: pub.y,
    d: bytesToBase64Url(raw),
    ext: true,
    key_ops: ["sign"],
  };
};

// Cache for application server
let appServer: webpush.ApplicationServer | null = null;

async function getAppServer(): Promise<webpush.ApplicationServer> {
  if (appServer) return appServer;

  const publicSecret = Deno.env.get('VAPID_PUBLIC_KEY');
  const privateSecret = Deno.env.get('VAPID_PRIVATE_KEY');

  if (!publicSecret || !privateSecret) {
    throw new Error('VAPID keys not configured.');
  }

  try {
    const publicKey = toPublicJwk(publicSecret);
    const privateKey = toPrivateJwk(privateSecret, publicKey);

    console.log('Importing VAPID keys...');

    const vapidKeys = await webpush.importVapidKeys({
      publicKey,
      privateKey,
    });

    console.log('Creating ApplicationServer...');

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
