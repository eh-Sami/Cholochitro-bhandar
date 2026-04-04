BEGIN;

-- Remove all user reviews in one shot so triggers do not recalculate row by row.
TRUNCATE TABLE Review RESTART IDENTITY;

-- Restore the prior-weight baseline for top-level media rows.
UPDATE Media
SET RatingCount = 1000;

-- Restore the prior-weight baseline for episodes.
UPDATE Episode
SET RatingCount = 1000;

COMMIT;