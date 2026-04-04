-- ─────────────────────────────────────────────
-- GENERIC VOTE TOGGLE FUNCTION
-- Handles upvote/downvote for both Blogs and Comments
-- Run ONCE after projectSchema.sql
-- ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_toggle_vote(
    p_target_type  TEXT,       -- 'blog' or 'comment'
    p_target_id    INT,
    p_user_id      INT,
    p_vote_type    TEXT        -- 'upvote' or 'downvote'
)
RETURNS TABLE(upvote_count INT, downvote_count INT, user_vote TEXT, action TEXT)
AS $$
DECLARE
    v_existing_vote TEXT;
    v_action        TEXT := 'added';
    v_user_vote     TEXT := p_vote_type;
BEGIN
    -- ─── Validate inputs ───
    IF p_target_type NOT IN ('blog', 'comment') THEN
        RAISE EXCEPTION 'target_type must be "blog" or "comment"';
    END IF;
    IF p_vote_type NOT IN ('upvote', 'downvote') THEN
        RAISE EXCEPTION 'vote_type must be "upvote" or "downvote"';
    END IF;

    -- ─── Verify target exists ───
    IF p_target_type = 'blog' THEN
        IF NOT EXISTS (SELECT 1 FROM Blog WHERE BlogID = p_target_id) THEN
            RETURN;  -- Returns empty result set → JS handles as 404
        END IF;
    ELSE
        IF NOT EXISTS (SELECT 1 FROM Comments WHERE CommentID = p_target_id) THEN
            RETURN;  -- Returns empty result set → JS handles as 404
        END IF;
    END IF;

    -- ─── Check existing vote ───
    -- Uses LIMIT 1 to protect against schemas allowing multiple votes per user
    IF p_target_type = 'blog' THEN
        SELECT VoteType INTO v_existing_vote
        FROM BlogVotes WHERE BlogID = p_target_id AND UserID = p_user_id
        LIMIT 1;
    ELSE
        SELECT VoteType INTO v_existing_vote
        FROM CommentVotes WHERE CommentID = p_target_id AND UserID = p_user_id
        LIMIT 1;
    END IF;

    -- ═══════════════════════════════════════════
    -- Handle Vote Logic (Delete/Insert for robustness)
    -- ═══════════════════════════════════════════
    IF v_existing_vote = p_vote_type THEN
        -- Toggle OFF: remove all votes from this user on this target
        IF p_target_type = 'blog' THEN
            DELETE FROM BlogVotes WHERE BlogID = p_target_id AND UserID = p_user_id;
        ELSE
            DELETE FROM CommentVotes WHERE CommentID = p_target_id AND UserID = p_user_id;
        END IF;
        v_user_vote := NULL;
        v_action := 'removed';
    ELSE
        -- Switch or New vote: wipe existing and insert the new single vote
        IF p_target_type = 'blog' THEN
            DELETE FROM BlogVotes WHERE BlogID = p_target_id AND UserID = p_user_id;
            INSERT INTO BlogVotes (BlogID, UserID, VoteType) VALUES (p_target_id, p_user_id, p_vote_type);
        ELSE
            DELETE FROM CommentVotes WHERE CommentID = p_target_id AND UserID = p_user_id;
            INSERT INTO CommentVotes (CommentID, UserID, VoteType) VALUES (p_target_id, p_user_id, p_vote_type);
        END IF;
        
        IF v_existing_vote IS NOT NULL THEN
            v_action := 'switched';
        END IF;
    END IF;

    -- ─── Recalculate Totals & Return ───
    -- Fully resilient counts based on actual vote rows
    IF p_target_type = 'blog' THEN
        UPDATE Blog SET
            UpvoteCount   = COALESCE((SELECT COUNT(*) FROM BlogVotes WHERE BlogID = p_target_id AND VoteType = 'upvote'), 0),
            DownvoteCount = COALESCE((SELECT COUNT(*) FROM BlogVotes WHERE BlogID = p_target_id AND VoteType = 'downvote'), 0)
        WHERE BlogID = p_target_id;
        
        RETURN QUERY
            SELECT b.UpvoteCount::INT, b.DownvoteCount::INT, v_user_vote, v_action
            FROM Blog b WHERE b.BlogID = p_target_id;
    ELSE
        UPDATE Comments SET
            UpvoteCount   = COALESCE((SELECT COUNT(*) FROM CommentVotes WHERE CommentID = p_target_id AND VoteType = 'upvote'), 0),
            DownvoteCount = COALESCE((SELECT COUNT(*) FROM CommentVotes WHERE CommentID = p_target_id AND VoteType = 'downvote'), 0)
        WHERE CommentID = p_target_id;
        
        RETURN QUERY
            SELECT c.UpvoteCount::INT, c.DownvoteCount::INT, v_user_vote, v_action
            FROM Comments c WHERE c.CommentID = p_target_id;
    END IF;
END;
$$ LANGUAGE plpgsql;
