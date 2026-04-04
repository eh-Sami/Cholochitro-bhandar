-- Add rating count to Media and backfill all media rows
ALTER TABLE Media
ADD COLUMN IF NOT EXISTS RatingCount INT NOT NULL DEFAULT 1000;

UPDATE Media
SET RatingCount = 1000
WHERE RatingCount IS DISTINCT FROM 1000;

-- Add rating count to Episode and backfill existing episode rows
ALTER TABLE Episode
ADD COLUMN IF NOT EXISTS RatingCount INT NOT NULL DEFAULT 1000;

UPDATE Episode
SET RatingCount = 1000
WHERE RatingCount IS DISTINCT FROM 1000;
