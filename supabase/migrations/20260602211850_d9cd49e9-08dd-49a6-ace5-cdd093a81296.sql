GRANT SELECT, INSERT, UPDATE ON public.support_conversations TO authenticated;
GRANT ALL ON public.support_conversations TO service_role;

GRANT SELECT, INSERT ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;