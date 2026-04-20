CREATE TABLE IF NOT EXISTS public.email_send_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_type text NOT NULL,
  recipient text NOT NULL,
  status text NOT NULL,
  provider text NOT NULL DEFAULT 'emailjs',
  message_id text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view email log" ON public.email_send_log;
CREATE POLICY "Admins can view email log"
  ON public.email_send_log FOR SELECT
  TO authenticated
  USING (public.is_admin_user(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_email_send_log_created_at ON public.email_send_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_send_log_status ON public.email_send_log(status);