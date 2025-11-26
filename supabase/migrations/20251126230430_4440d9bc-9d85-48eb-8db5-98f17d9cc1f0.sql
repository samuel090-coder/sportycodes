-- Fix search_path for trigger functions
DROP FUNCTION IF EXISTS update_updated_at_matches() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_sure_odds() CASCADE;

CREATE OR REPLACE FUNCTION update_updated_at_matches()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_updated_at_sure_odds()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Recreate triggers
CREATE TRIGGER update_matches_updated_at
BEFORE UPDATE ON public.matches
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_matches();

CREATE TRIGGER update_sure_odds_updated_at
BEFORE UPDATE ON public.sure_odds
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_sure_odds();