-- ═══════════════════════════════════════════════
-- RATING TRIGGERS (from 01_rating_functions.sql)
-- ═══════════════════════════════════════════════

-- Movie rating auto-recalculation
CREATE TRIGGER trg_refresh_movie_rating
AFTER INSERT OR UPDATE OR DELETE ON Review
FOR EACH ROW
EXECUTE FUNCTION fn_refresh_movie_rating();

-- Episode → Season → Series cascade
CREATE TRIGGER trg_cascade_episode_rating
AFTER INSERT OR UPDATE OR DELETE ON Review
FOR EACH ROW
EXECUTE FUNCTION fn_cascade_episode_rating();

-- ═══════════════════════════════════════════════
-- AUTO EditedAt TRIGGERS (from 05_utilities.sql)
-- ═══════════════════════════════════════════════

CREATE TRIGGER trg_blog_edited
BEFORE UPDATE ON Blog
FOR EACH ROW
EXECUTE FUNCTION fn_set_edited_at();

CREATE TRIGGER trg_comment_edited
BEFORE UPDATE ON Comments
FOR EACH ROW
EXECUTE FUNCTION fn_set_edited_at();

CREATE TRIGGER trg_review_edited
BEFORE UPDATE ON Review
FOR EACH ROW
EXECUTE FUNCTION fn_set_edited_at();

-- ═══════════════════════════════════════════════
-- PROFANITY FILTER TRIGGERS (from 06_profanity_filter.sql)
-- ═══════════════════════════════════════════════

CREATE TRIGGER trg_filter_blog
BEFORE INSERT OR UPDATE ON Blog
FOR EACH ROW
EXECUTE FUNCTION fn_filter_blog();

CREATE TRIGGER trg_filter_comment
BEFORE INSERT OR UPDATE ON Comments
FOR EACH ROW
EXECUTE FUNCTION fn_filter_comment();

CREATE TRIGGER trg_filter_review
BEFORE INSERT OR UPDATE ON Review
FOR EACH ROW
EXECUTE FUNCTION fn_filter_review();
