import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

type PaymentIntent = {
  id: string;
  user_id: string;
  reference: string;
  amount: number;
  currency: string;
  status: string;
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

function constantTimeEqual(left: string, right: string): boolean {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  let diff = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i += 1) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

function getAdminClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Payment service unavailable');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function requireUser(req: Request) {
  const auth = req.headers.get('Authorization') || '';
  const token = auth.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !anonKey) return null;
  const client = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

async function readSetting(admin: ReturnType<typeof getAdminClient>, key: string): Promise<string | null> {
  const { data, error } = await admin.from('app_settings')
    .select('setting_value').eq('setting_key', key).maybeSingle();
  if (error) throw new Error('Payment settings unavailable');
  return data?.setting_value ?? null;
}

async function readIntent(admin: ReturnType<typeof getAdminClient>, reference: string): Promise<PaymentIntent | null> {
  const { data, error } = await admin.from('ufitpay_deposits')
    .select('id,user_id,reference,amount,currency,status').eq('reference', reference).maybeSingle();
  if (error) throw new Error('Payment record unavailable');
  return data as PaymentIntent | null;
}

async function verifyAndCredit(admin: ReturnType<typeof getAdminClient>, reference: string) {
  const intent = await readIntent(admin, reference);
  if (!intent) return { success: false, error: 'Payment reference not found.' };
  if (intent.status === 'credited') return { success: true, credited: true, alreadyCredited: true };
  if (intent.status !== 'pending' && intent.status !== 'verified') {
    return { success: false, error: 'This payment is not available for verification.' };
  }

  if (await readSetting(admin, 'ufitpay_auto_credit_enabled') !== 'true') {
    return { success: true, credited: false, status: 'pending' };
  }

  const apiKey = Deno.env.get('UFITPAY_API_KEY');
  const apiToken = Deno.env.get('UFITPAY_API_TOKEN');
  if (!apiKey || !apiToken) throw new Error('Payment service unavailable');

  const response = await fetch('https://ufitpay.com', {
    method: 'POST',
    headers: {
      'Api-Key': apiKey,
      'Api-Token': apiToken,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: new URLSearchParams({ reference }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) return { success: false, error: 'UfitPay could not confirm this payment yet.' };

  let result: Record<string, unknown>;
  try {
    result = await response.json();
  } catch {
    return { success: false, error: 'UfitPay returned an unreadable verification response.' };
  }

  const data = result.data && typeof result.data === 'object'
    ? result.data as Record<string, unknown>
    : null;
  if (result.status !== 'success' || !data) {
    return { success: false, error: 'UfitPay has not confirmed this payment.' };
  }

  const providerStatus = typeof data.payment_status === 'string' ? data.payment_status.toLowerCase() : '';
  const providerReference = typeof data.reference === 'string' ? data.reference : '';
  if (providerStatus === 'failed' || providerStatus === 'cancelled' || providerStatus === 'declined') {
    await admin.from('ufitpay_deposits').update({
      status: 'failed', provider_status: providerStatus, failure_reason: 'Provider reported an unsuccessful payment.',
    }).eq('id', intent.id).eq('status', 'pending');
    return { success: false, error: 'UfitPay reports that this payment did not complete.' };
  }

  // Unknown response fields or states deliberately remain pending; never credit from callback data alone.
  if (providerStatus !== 'completed' || !providerReference) {
    return { success: false, error: 'UfitPay has not confirmed this payment yet.' };
  }

  const verifiedAmount = Number(data.amount);
  const currency = typeof data.currency === 'string' ? data.currency.toUpperCase() : '';
  const amountInCents = Math.round(verifiedAmount * 100);
  const expectedInCents = Math.round(Number(intent.amount) * 100);
  if (providerReference !== intent.reference || currency !== 'NGN' || !Number.isFinite(verifiedAmount)
      || amountInCents < expectedInCents || amountInCents <= 0) {
    await admin.from('ufitpay_deposits').update({
      status: 'failed',
      provider_reference: providerReference || null,
      provider_status: providerStatus,
      verified_amount: Number.isFinite(verifiedAmount) ? verifiedAmount : null,
      verified_currency: currency || null,
      failure_reason: 'Verified payment did not match its reference, amount, or currency.',
      verified_at: new Date().toISOString(),
    }).eq('id', intent.id).eq('status', 'pending');
    return { success: false, error: 'The verified payment details did not match this deposit.' };
  }

  const { data: completed, error } = await admin.rpc('complete_ufitpay_deposit', {
    _reference: intent.reference,
    _provider_reference: providerReference,
    _verified_amount: verifiedAmount,
    _currency: currency,
  });
  if (error || !completed?.success) {
    return { success: false, error: 'Payment verified but could not be credited. Please contact support.' };
  }
  return { success: true, credited: true, alreadyCredited: completed.already_credited === true };
}

function referenceFromForm(form: FormData): string | null {
  const direct = form.get('reference') ?? form.get('transaction_reference');
  if (typeof direct === 'string' && direct.length > 0 && direct.length <= 160) return direct;
  const encoded = form.get('data');
  if (typeof encoded !== 'string' || encoded.length > 12000) return null;
  try {
    const decoded = JSON.parse(atob(encoded)) as Record<string, unknown>;
    const nested = decoded.reference ?? decoded.transaction_reference;
    return typeof nested === 'string' && nested.length > 0 && nested.length <= 160 ? nested : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const admin = getAdminClient();

    if (action === 'webhook') {
      const expectedToken = Deno.env.get('UFITPAY_WEBHOOK_TOKEN');
      const suppliedToken = url.searchParams.get('token') || '';
      if (!expectedToken || !constantTimeEqual(expectedToken, suppliedToken)) return json({ error: 'Unauthorized.' }, 401);
      const form = await req.formData();
      const reference = referenceFromForm(form);
      if (!reference) return json({ error: 'Payment reference required.' }, 400);
      const result = await verifyAndCredit(admin, reference);
      return json({ received: true, verified: result.credited === true });
    }

    const user = await requireUser(req);
    if (!user) return json({ error: 'Please sign in to continue.' }, 401);

    const body = await req.json().catch(() => ({}));
    if (action === 'create_intent') {
      if (await readSetting(admin, 'ufitpay_enabled') !== 'true') {
        return json({ error: 'UfitPay deposits are not enabled yet.' }, 403);
      }
      const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount < 100 || amount > 10_000_000 || Math.round(amount * 100) !== amount * 100) {
        return json({ error: 'Enter a deposit amount between ₦100 and ₦10,000,000.' }, 400);
      }
      if (!user.email) return json({ error: 'Your account needs an email before checkout.' }, 400);

      const apiKey = Deno.env.get('UFITPAY_API_KEY');
      const webhookToken = Deno.env.get('UFITPAY_WEBHOOK_TOKEN');
      const serviceCode = (await readSetting(admin, 'ufitpay_service_code'))?.trim();
      if (!apiKey || !webhookToken || !serviceCode || serviceCode.length > 100) {
        return json({ error: 'UfitPay checkout is not fully configured.' }, 503);
      }

      const reference = `SC-${crypto.randomUUID()}`;
      const { error } = await admin.from('ufitpay_deposits').insert({
        user_id: user.id,
        reference,
        amount,
        currency: 'NGN',
        status: 'pending',
      });
      if (error) throw new Error('Could not start the payment. Please try again.');

      const profile = await admin.from('profiles').select('display_name,username').eq('id', user.id).maybeSingle();
      const callbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/ufitpay-payments?action=webhook&token=${encodeURIComponent(webhookToken)}`;
      return json({
        reference,
        amount: amount.toFixed(2),
        serviceCode,
        embedKey: apiKey,
        payerEmail: user.email,
        payerName: profile.data?.display_name || profile.data?.username || 'SPORTY CODES User',
        customerIdentifier: user.id,
        callbackUrl,
        returnUrl: 'https://sportycodes.lovable.app/wallet',
      });
    }

    if (action === 'verify') {
      const reference = typeof body.reference === 'string' ? body.reference : '';
      if (!/^SC-[0-9a-f-]{36}$/i.test(reference)) return json({ error: 'Invalid payment reference.' }, 400);
      const intent = await readIntent(admin, reference);
      if (!intent || intent.user_id !== user.id) return json({ error: 'Payment reference not found.' }, 404);
      return json(await verifyAndCredit(admin, reference));
    }

    return json({ error: 'Unknown payment action.' }, 400);
  } catch {
    return json({ error: 'The payment service is temporarily unavailable. Please try again.' }, 500);
  }
});