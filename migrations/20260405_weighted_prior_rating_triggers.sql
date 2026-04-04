-- Replace rating triggers with weighted-prior calculations.
-- No schema changes required.

CREATE OR REPLACE FUNCTION fn_refresh_movie_rating()
RETURNS TRIGGER AS $$
DECLARE
    v_media_id INT;
    v_old_rating DECIMAL(3, 1);
    v_old_count INT;
    v_new_rating DECIMAL(3, 1);
    v_new_count INT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_media_id := OLD.MediaID;
    ELSIF TG_OP = 'UPDATE' THEN
        v_media_id := NEW.MediaID;
    ELSE
        v_media_id := NEW.MediaID;
    END IF;

    IF v_media_id IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT Rating, RatingCount
    INTO v_old_rating, v_old_count
    FROM Media
    WHERE MediaID = v_media_id
      AND MediaType = 'Movie';

    IF v_old_count IS NULL THEN
        RETURN NULL;
    END IF;

    IF TG_OP = 'INSERT' THEN
        v_new_count := v_old_count + 1;
        v_new_rating := ROUND(((v_old_rating * v_old_count) + NEW.Rating)::numeric / v_new_count, 1);
    ELSIF TG_OP = 'DELETE' THEN
        v_new_count := GREATEST(v_old_count - 1, 1);
        v_new_rating := ROUND(((v_old_rating * v_old_count) - OLD.Rating)::numeric / v_new_count, 1);
    ELSE
        v_new_count := v_old_count;
        v_new_rating := ROUND(((v_old_rating * v_old_count) - OLD.Rating + NEW.Rating)::numeric / v_new_count, 1);
    END IF;

    UPDATE Media
    SET Rating = v_new_rating,
        RatingCount = v_new_count
    WHERE MediaID = v_media_id
      AND MediaType = 'Movie';

    IF TG_OP = 'UPDATE' AND OLD.MediaID IS NOT NULL AND OLD.MediaID <> NEW.MediaID THEN
        SELECT Rating, RatingCount
        INTO v_old_rating, v_old_count
        FROM Media
        WHERE MediaID = OLD.MediaID
          AND MediaType = 'Movie';

        IF v_old_count IS NOT NULL AND v_old_count > 1 THEN
            v_new_count := v_old_count - 1;
            v_new_rating := ROUND(((v_old_rating * v_old_count) - OLD.Rating)::numeric / v_new_count, 1);

            UPDATE Media
            SET Rating = v_new_rating,
                RatingCount = v_new_count
            WHERE MediaID = OLD.MediaID
              AND MediaType = 'Movie';
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_cascade_episode_rating()
RETURNS TRIGGER AS $$
DECLARE
    v_media_id   INT;
    v_season_no  INT;
    v_episode_no INT;
    v_episode_rating DECIMAL(3, 1);
    v_episode_count INT;
    v_episode_new_rating DECIMAL(3, 1);
    v_episode_new_count INT;
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

    IF v_media_id IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT AvgRating, RatingCount
    INTO v_episode_rating, v_episode_count
    FROM Episode
    WHERE MediaID = v_media_id
      AND SeasonNo = v_season_no
      AND EpisodeNo = v_episode_no;

    IF v_episode_count IS NULL THEN
        RETURN NULL;
    END IF;

    IF TG_OP = 'INSERT' THEN
        v_episode_new_count := v_episode_count + 1;
        v_episode_new_rating := ROUND(((v_episode_rating * v_episode_count) + NEW.Rating)::numeric / v_episode_new_count, 1);
    ELSIF TG_OP = 'DELETE' THEN
        v_episode_new_count := GREATEST(v_episode_count - 1, 1);
        v_episode_new_rating := ROUND(((v_episode_rating * v_episode_count) - OLD.Rating)::numeric / v_episode_new_count, 1);
    ELSE
        v_episode_new_count := v_episode_count;
        v_episode_new_rating := ROUND(((v_episode_rating * v_episode_count) - OLD.Rating + NEW.Rating)::numeric / v_episode_new_count, 1);
    END IF;

    UPDATE Episode e
    SET AvgRating   = v_episode_new_rating,
        RatingCount = v_episode_new_count
    WHERE e.MediaID   = v_media_id
      AND e.SeasonNo  = v_season_no
      AND e.EpisodeNo = v_episode_no;

    UPDATE Season s
    SET AvgRating = sub.avg_r
    FROM (
        SELECT ROUND(AVG(AvgRating)::numeric, 1) AS avg_r
        FROM Episode
        WHERE MediaID = v_media_id AND SeasonNo = v_season_no
    ) sub
    WHERE s.MediaID = v_media_id AND s.SeasonNo = v_season_no;

    UPDATE Media m
    SET Rating      = sub.avg_r,
        RatingCount = COALESCE((SELECT SUM(RatingCount)::int FROM Episode WHERE MediaID = v_media_id), 0)
    FROM (
        SELECT ROUND(AVG(season_avg)::numeric, 1) AS avg_r
        FROM (
            SELECT AVG(AvgRating) AS season_avg
            FROM Episode
            WHERE MediaID = v_media_id
            GROUP BY SeasonNo
        ) per_season
    ) sub
    WHERE m.MediaID = v_media_id AND m.MediaType = 'TVSeries';

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
