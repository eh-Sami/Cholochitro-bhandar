-- ─────────────────────────────────────────────
-- PROFANITY / SLANG FILTER
-- Run ONCE after projectSchema.sql
-- ─────────────────────────────────────────────

-- 1. Table to hold banned words (easy to manage without code changes)
CREATE TABLE IF NOT EXISTS Banned_Words (
    Word VARCHAR(100) PRIMARY KEY
);

-- 2. Seed with example slang/profanity (add your own)
INSERT INTO Banned_Words (Word) VALUES
    ('damn'),
    ('crap'),
    ('idiot'),
    ('stupid'),
    ('dumb'),
    ('sucks'),
    ('trash'),
    ('loser'),
    ('moron'),
    ('jerk')
ON CONFLICT DO NOTHING;

-- 3. Generic check function — returns the first banned word found (or NULL)
CREATE OR REPLACE FUNCTION fn_check_profanity(p_text TEXT)
RETURNS TEXT AS $$
DECLARE
    v_word TEXT;
BEGIN
    IF p_text IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT bw.Word INTO v_word
    FROM Banned_Words bw
    WHERE LOWER(p_text) LIKE '%' || LOWER(bw.Word) || '%'
    LIMIT 1;

    RETURN v_word;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────
-- TRIGGER FUNCTIONS
-- Only check profanity on INSERT or when content fields actually change.
-- This prevents false rejections when vote counts are updated.
-- ─────────────────────────────────────────────

-- Blog filter (checks BlogTitle + Content)
CREATE OR REPLACE FUNCTION fn_filter_blog()
RETURNS TRIGGER AS $$
DECLARE
    v_found TEXT;
BEGIN
    -- Skip profanity check if this is an UPDATE that didn't touch content
    IF TG_OP = 'UPDATE'
       AND NEW.BlogTitle IS NOT DISTINCT FROM OLD.BlogTitle
       AND NEW.Content IS NOT DISTINCT FROM OLD.Content THEN
        RETURN NEW;
    END IF;

    v_found := fn_check_profanity(NEW.BlogTitle);
    IF v_found IS NOT NULL THEN
        RAISE EXCEPTION 'Blog title contains inappropriate language: "%"', v_found;
    END IF;

    v_found := fn_check_profanity(NEW.Content);
    IF v_found IS NOT NULL THEN
        RAISE EXCEPTION 'Blog content contains inappropriate language: "%"', v_found;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Comment filter (checks CommentText)
CREATE OR REPLACE FUNCTION fn_filter_comment()
RETURNS TRIGGER AS $$
DECLARE
    v_found TEXT;
BEGIN
    -- Skip profanity check if this is an UPDATE that didn't touch content
    IF TG_OP = 'UPDATE'
       AND NEW.CommentText IS NOT DISTINCT FROM OLD.CommentText THEN
        RETURN NEW;
    END IF;

    v_found := fn_check_profanity(NEW.CommentText);
    IF v_found IS NOT NULL THEN
        RAISE EXCEPTION 'Comment contains inappropriate language: "%"', v_found;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Review filter (checks ReviewText)
CREATE OR REPLACE FUNCTION fn_filter_review()
RETURNS TRIGGER AS $$
DECLARE
    v_found TEXT;
BEGIN
    -- Skip profanity check if this is an UPDATE that didn't touch content
    IF TG_OP = 'UPDATE'
       AND NEW.ReviewText IS NOT DISTINCT FROM OLD.ReviewText THEN
        RETURN NEW;
    END IF;

    v_found := fn_check_profanity(NEW.ReviewText);
    IF v_found IS NOT NULL THEN
        RAISE EXCEPTION 'Review contains inappropriate language: "%"', v_found;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
