import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type VapidJwk = {
  kty: "EC";
  crv: "P-256";
  x: string;
  y: string;
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
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const toRawPublicKeyBase64Url = (secret: string): string => {
  const trimmed = secret.trim();

  // Already base64url raw (what PushManager expects)
  if (!isJsonObjectString(trimmed)) return trimmed;

  // JWK -> raw uncompressed point 0x04 || X || Y
  const jwk = JSON.parse(trimmed) as VapidJwk;
  const x = base64UrlToBytes(jwk.x);
  const y = base64UrlToBytes(jwk.y);
  const raw = new Uint8Array(65);
  raw[0] = 0x04;
  raw.set(x, 1);
  raw.set(y, 33);
  return bytesToBase64Url(raw);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const publicSecret = Deno.env.get("VAPID_PUBLIC_KEY");
    if (!publicSecret) {
      return new Response(JSON.stringify({ error: "VAPID_PUBLIC_KEY not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const publicKey = toRawPublicKeyBase64Url(publicSecret);

    return new Response(JSON.stringify({ publicKey }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
