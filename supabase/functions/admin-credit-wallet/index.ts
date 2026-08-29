import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

async function findUserByEmail(admin: any, email: string) {
  const target = email.trim().toLowerCase();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const hit = data.users.find((u: any) => (u.email || '').toLowerCase() === target);
    if (hit) return hit;
    if (data.users.length < 1000) break;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const jwt = (req.headers.get('Authorization') || '').replace('Bearer ', '');
    if (!jwt) return json({ error: 'unauthorized' }, 401);

    const url = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${jwt}` } } });
    const { data: userData, error: uErr } = await userClient.auth.getUser();
    if (uErr || !userData?.user) return json({ error: 'unauthorized' }, 401);

    const admin = createClient(url, serviceKey);
    const { data: isAdmin } = await admin.rpc('is_admin_user', { _user_id: userData.user.id });
    if (!isAdmin) return json({ error: 'forbidden' }, 403);

    const body = await req.json().catch(() => ({}));
    const email: string = body?.email || '';
    const lookupOnly: boolean = !!body?.lookupOnly;
    const amount = Number(body?.amount || 0);
    const note: string = body?.note || 'Direct credit by admin';

    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return json({ error: 'Valid email required' }, 400);

    const target = await findUserByEmail(admin, email);
    if (!target) return json({ error: 'User not found' }, 404);

    const { data: profile } = await admin.from('profiles').select('display_name, username').eq('id', target.id).maybeSingle();
    const { data: wallet } = await admin.from('wallets').select('balance, total_deposited').eq('user_id', target.id).maybeSingle();

    if (lookupOnly) {
      return json({
        user_id: target.id,
        email: target.email,
        display_name: profile?.display_name || profile?.username || 'User',
        balance: Number(wallet?.balance || 0),
      });
    }

    if (!(amount > 0)) return json({ error: 'Amount must be greater than 0' }, 400);

    if (wallet) {
      const { error } = await admin
        .from('wallets')
        .update({
          balance: Number(wallet.balance || 0) + amount,
          total_deposited: Number(wallet.total_deposited || 0) + amount,
        })
        .eq('user_id', target.id);
      if (error) throw error;
    } else {
      const { error } = await admin
        .from('wallets')
        .insert({ user_id: target.id, balance: amount, total_deposited: amount });
      if (error) throw error;
    }

    const { error: depErr } = await admin.from('deposit_requests').insert({
      user_id: target.id,
      amount,
      payment_method: 'admin_direct_credit',
      status: 'approved',
      processed_at: new Date().toISOString(),
      processed_by: userData.user.id,
      admin_note: note,
    });
    if (depErr) throw depErr;

    const { data: fresh } = await admin.from('wallets').select('balance').eq('user_id', target.id).maybeSingle();

    return json({
      success: true,
      user_id: target.id,
      email: target.email,
      display_name: profile?.display_name || profile?.username || 'User',
      balance: Number(fresh?.balance || 0),
    });
  } catch (e) {
    console.error(e);
    return json({ error: String(e) }, 500);
  }
});
