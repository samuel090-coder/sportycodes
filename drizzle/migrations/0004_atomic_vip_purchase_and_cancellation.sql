CREATE OR REPLACE FUNCTION public.purchase_vip_with_wallet(_request_id uuid, _expected_price numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := auth.uid(); v_wallet public.wallets%ROWTYPE; v_sub public.vip_subscriptions%ROWTYPE; v_price numeric; v_expiry timestamptz; v_reference text;
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'Please sign in to continue'; END IF;
 IF _request_id IS NULL THEN RAISE EXCEPTION 'Missing purchase reference'; END IF;
 v_reference := 'wallet_vip:' || _request_id::text;
 SELECT * INTO v_wallet FROM public.wallets WHERE user_id = v_user FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Wallet not found'; END IF;
 SELECT * INTO v_sub FROM public.vip_subscriptions WHERE user_id=v_user AND payment_reference=v_reference LIMIT 1;
 IF FOUND THEN RETURN to_jsonb(v_sub); END IF;
 SELECT setting_value::numeric INTO v_price FROM public.app_settings WHERE setting_key='vip_monthly_price';
 v_price := COALESCE(v_price,2000);
 IF v_price <= 0 THEN RAISE EXCEPTION 'VIP price is unavailable'; END IF;
 IF _expected_price IS DISTINCT FROM v_price THEN RAISE EXCEPTION 'VIP price has changed. Please review the new price and try again'; END IF;
 IF COALESCE(v_wallet.balance,0) < v_price THEN RAISE EXCEPTION 'Insufficient wallet balance'; END IF;
 SELECT GREATEST(now(),COALESCE(MAX(expires_at),now())) INTO v_expiry FROM public.vip_subscriptions WHERE user_id=v_user AND status='active' AND expires_at>now();
 UPDATE public.wallets SET balance=COALESCE(balance,0)-v_price,updated_at=now() WHERE id=v_wallet.id;
 INSERT INTO public.vip_subscriptions(user_id,price,status,payment_reference,starts_at,expires_at)
 VALUES(v_user,v_price,'active',v_reference,now(),v_expiry+interval '1 month') RETURNING * INTO v_sub;
 RETURN to_jsonb(v_sub);
END; $$;
REVOKE ALL ON FUNCTION public.purchase_vip_with_wallet(uuid,numeric) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.purchase_vip_with_wallet(uuid,numeric) TO authenticated;
CREATE OR REPLACE FUNCTION public.cancel_my_vip()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := auth.uid(); v_count integer;
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'Please sign in to continue'; END IF;
 PERFORM id FROM public.wallets WHERE user_id=v_user FOR UPDATE;
 UPDATE public.vip_subscriptions SET status='cancelled',updated_at=now() WHERE user_id=v_user AND status IN ('active','pending');
 GET DIAGNOSTICS v_count = ROW_COUNT;
 IF v_count>0 THEN PERFORM public.create_notification(v_user,'VIP cancelled','Your VIP membership has been cancelled. Premium access has ended.','vip','/vip'); END IF;
 RETURN v_count;
END; $$;
REVOKE ALL ON FUNCTION public.cancel_my_vip() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.cancel_my_vip() TO authenticated;
ALTER POLICY "Users can create their own subscriptions" ON public.vip_subscriptions WITH CHECK (auth.uid()=user_id AND status='pending' AND starts_at IS NULL AND expires_at IS NULL);
CREATE INDEX IF NOT EXISTS vip_purchase_reference_idx ON public.vip_subscriptions(user_id,payment_reference);
