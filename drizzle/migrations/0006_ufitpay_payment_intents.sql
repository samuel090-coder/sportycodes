CREATE TABLE public.ufitpay_deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reference text NOT NULL UNIQUE,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'NGN',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'credited', 'failed', 'cancelled')),
  provider_reference text,
  provider_status text,
  verified_amount numeric(12,2),
  verified_currency text,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz,
  credited_at timestamptz
);
GRANT SELECT ON public.ufitpay_deposits TO authenticated;
GRANT ALL ON public.ufitpay_deposits TO service_role;
ALTER TABLE public.ufitpay_deposits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own UfitPay deposits" ON public.ufitpay_deposits
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin_user(auth.uid()));
CREATE INDEX idx_ufitpay_deposits_user_created ON public.ufitpay_deposits (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.complete_ufitpay_deposit(
  _reference text,
  _provider_reference text,
  _verified_amount numeric,
  _currency text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.ufitpay_deposits%ROWTYPE;
BEGIN
  IF _reference IS NULL OR length(_reference) < 1 OR length(_reference) > 160
     OR _provider_reference IS NULL OR length(_provider_reference) < 1 OR length(_provider_reference) > 200
     OR _verified_amount IS NULL OR _verified_amount <= 0
     OR upper(COALESCE(_currency, '')) <> 'NGN' THEN
    RAISE EXCEPTION 'Invalid verified UfitPay payment';
  END IF;

  SELECT * INTO v_payment
  FROM public.ufitpay_deposits
  WHERE reference = _reference
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'UfitPay payment reference not found';
  END IF;

  IF v_payment.status = 'credited' THEN
    RETURN jsonb_build_object('success', true, 'already_credited', true, 'status', 'credited');
  END IF;

  IF v_payment.status NOT IN ('pending', 'verified') THEN
    RAISE EXCEPTION 'UfitPay payment is not eligible for credit';
  END IF;

  IF upper(v_payment.currency) <> 'NGN' OR _verified_amount < v_payment.amount THEN
    RAISE EXCEPTION 'Verified UfitPay amount or currency does not match the payment intent';
  END IF;

  INSERT INTO public.wallets (user_id, balance, total_deposited)
  VALUES (v_payment.user_id, _verified_amount, _verified_amount)
  ON CONFLICT (user_id) DO UPDATE
  SET balance = COALESCE(public.wallets.balance, 0) + EXCLUDED.balance,
      total_deposited = COALESCE(public.wallets.total_deposited, 0) + EXCLUDED.total_deposited,
      updated_at = now();

  INSERT INTO public.deposit_requests (
    user_id, amount, payment_method, status, admin_note, processed_at
  ) VALUES (
    v_payment.user_id, _verified_amount, 'ufitpay', 'approved',
    'Verified UfitPay reference: ' || _reference, now()
  );

  UPDATE public.ufitpay_deposits
  SET status = 'credited',
      provider_reference = _provider_reference,
      provider_status = 'completed',
      verified_amount = _verified_amount,
      verified_currency = upper(_currency),
      verified_at = COALESCE(verified_at, now()),
      credited_at = now(),
      failure_reason = NULL
  WHERE id = v_payment.id;

  PERFORM public.create_notification(
    v_payment.user_id,
    '✅ UfitPay deposit credited',
    'Your verified deposit of ₦' || _verified_amount::text || ' has been credited to your wallet.',
    'payment',
    '/wallet',
    jsonb_build_object('reference', _reference, 'amount', _verified_amount, 'currency', upper(_currency))
  );

  RETURN jsonb_build_object('success', true, 'already_credited', false, 'status', 'credited');
END;
$$;
REVOKE ALL ON FUNCTION public.complete_ufitpay_deposit(text, text, numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_ufitpay_deposit(text, text, numeric, text) TO service_role;