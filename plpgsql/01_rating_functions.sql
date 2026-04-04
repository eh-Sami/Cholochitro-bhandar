-- ─────────────────────────────────────────────
-- RATING RECALCULATION FUNCTIONS
-- Run ONCE after projectSchema.sql
-- ─────────────────────────────────────────────

-- ═══════════════════════════════════════════════
-- 1. Auto-Recalculate Movie Ratings
-- Fires on Review INSERT/UPDATE/DELETE for Movie reviews
-- ═══════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_refresh_movie_rating()
RETURNS TRIGGER AS $$
DECLARE
    v_media_id INT;
BEGIN
    -- Determine which MediaID was affected
    IF TG_OP = 'DELETE' THEN
        v_media_id := OLD.MediaID;
    ELSIF TG_OP = 'UPDATE' THEN
        v_media_id := NEW.MediaID;
    ELSE
        v_media_id := NEW.MediaID;
    END IF;

    -- Only for movie reviews (MediaID is non-null for movies, NULL for episodes)
    IF v_media_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Recalculate from ALL reviews for this media
    UPDATE Media
    SET Rating      = sub.avg_rating,
        RatingCount = sub.review_count
    FROM (
        SELECT
            ROUND(AVG(Rating)::numeric, 1) AS avg_rating,
            COUNT(*)::int                  AS review_count
        FROM Review
        WHERE MediaID = v_media_id
    ) sub
    WHERE Media.MediaID = v_media_id
      AND Media.MediaType = 'Movie';

    -- For UPDATE: if MediaID changed, also recalculate the old one
    IF TG_OP = 'UPDATE' AND OLD.MediaID IS NOT NULL AND OLD.MediaID <> NEW.MediaID THEN
        UPDATE Media
        SET Rating      = sub.avg_rating,
            RatingCount = sub.review_count
        FROM (
            SELECT
                ROUND(AVG(Rating)::numeric, 1) AS avg_rating,
                COUNT(*)::int                  AS review_count
            FROM Review
            WHERE MediaID = OLD.MediaID
        ) sub
        WHERE Media.MediaID = OLD.MediaID
          AND Media.MediaType = 'Movie';
    END IF;

    RETURN NULL;  -- AFTER trigger: return value is ignored
END;
$$ LANGUAGE plpgsql;


-- ═══════════════════════════════════════════════
-- 2. Episode → Season → Series Rating Cascade
-- Fires on Review INSERT/UPDATE/DELETE for Episode reviews
-- ═══════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_cascade_episode_rating()
RETURNS TRIGGER AS $$
DECLARE
    v_media_id   INT;
    v_season_no  INT;
    v_episode_no INT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_media_id   := OLD.EpisodeMediaID;
        v_season_no  := OLD.EpisodeSeasonNo;
        v_episode_no := OLD.EpisodeNo;
    ELSE
        v_media_id   := NEW.EpisodeMediaID;
        v_season_no  := NEW.EpisodeSeasonNo;
        v_episode_no := NEW.EpisodeNo;
    END IF;

    -- Skip if this isn't an episode review
    IF v_media_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Step 1: Recalculate this Episode's AvgRating from all its reviews
    UPDATE Episode e
    SET AvgRating   = sub.avg_r,
        RatingCount = sub.cnt
    FROM (
        SELECT
            ROUND(AVG(Rating)::numeric, 1) AS avg_r,
            COUNT(*)::int                  AS cnt
        FROM Review
        WHERE EpisodeMediaID  = v_media_id
          AND EpisodeSeasonNo = v_season_no
          AND EpisodeNo       = v_episode_no
    ) sub
    WHERE e.MediaID   = v_media_id
      AND e.SeasonNo  = v_season_no
      AND e.EpisodeNo = v_episode_no;

    -- Step 2: Recalculate this Season's AvgRating (average of its episodes)
    UPDATE Season s
    SET AvgRating = sub.avg_r
    FROM (
        SELECT ROUND(AVG(AvgRating)::numeric, 1) AS avg_r
        FROM Episode
        WHERE MediaID = v_media_id AND SeasonNo = v_season_no
    ) sub
    WHERE s.MediaID = v_media_id AND s.SeasonNo = v_season_no;

    -- Step 3: Recalculate Series' overall Rating (average of season averages)
    UPDATE Media m
    SET Rating      = sub.avg_r,
        RatingCount = sub.total_cnt
    FROM (
        SELECT
            ROUND(AVG(season_avg)::numeric, 1) AS avg_r,
            SUM(season_cnt)::int               AS total_cnt
        FROM (
            SELECT
                SeasonNo,
                AVG(AvgRating)   AS season_avg,
                SUM(RatingCount) AS season_cnt
            FROM Episode
            WHERE MediaID = v_media_id
            GROUP BY SeasonNo
        ) per_season
    ) sub
    WHERE m.MediaID = v_media_id AND m.MediaType = 'TVSeries';

    RETURN NULL;  -- AFTER trigger: return value is ignored
END;
$$ LANGUAGE plpgsql;
