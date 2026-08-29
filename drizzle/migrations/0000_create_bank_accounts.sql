CREATE TABLE public.bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name text NOT NULL,
  account_name text NOT NULL,
  account_number text NOT NULL,
  logo_url text,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.bank_accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_accounts TO authenticated;
GRANT ALL ON public.bank_accounts TO service_role;

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view active bank accounts"
ON public.bank_accounts FOR SELECT TO authenticated
USING (is_active = true OR public.is_admin_user(auth.uid()));

CREATE POLICY "Admins manage bank accounts"
ON public.bank_accounts FOR ALL TO authenticated
USING (public.is_admin_user(auth.uid()))
WITH CHECK (public.is_admin_user(auth.uid()));

CREATE TRIGGER bank_accounts_updated_at
BEFORE UPDATE ON public.bank_accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();