-- Add match_count field to sure_odds table to track single vs multiple matches
ALTER TABLE sure_odds
ADD COLUMN match_count integer NOT NULL DEFAULT 1;

-- Add comment explaining the field
COMMENT ON COLUMN sure_odds.match_count IS 'Number of matches in this bet code. 1 = single match (show teams), >1 = multiple matches (show count instead of teams)';