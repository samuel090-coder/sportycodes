-- Drop existing restrictive RLS policies for sure_odds
DROP POLICY IF EXISTS "Authenticated users can insert sure odds" ON sure_odds;
DROP POLICY IF EXISTS "Authenticated users can update sure odds" ON sure_odds;
DROP POLICY IF EXISTS "Authenticated users can delete sure odds" ON sure_odds;

-- Create admin-friendly policies that allow anyone to manage sure odds
-- In production, you should add proper authentication
CREATE POLICY "Anyone can insert sure odds"
ON sure_odds
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update sure odds"
ON sure_odds
FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete sure odds"
ON sure_odds
FOR DELETE
USING (true);

-- Do the same for matches table
DROP POLICY IF EXISTS "Authenticated users can insert matches" ON matches;
DROP POLICY IF EXISTS "Authenticated users can update matches" ON matches;
DROP POLICY IF EXISTS "Authenticated users can delete matches" ON matches;

CREATE POLICY "Anyone can insert matches"
ON matches
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update matches"
ON matches
FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete matches"
ON matches
FOR DELETE
USING (true);