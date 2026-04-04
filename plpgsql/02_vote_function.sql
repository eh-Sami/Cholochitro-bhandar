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
    IF p_target_type = 'blog' THEN
        SELECT VoteType INTO v_existing_vote
        FROM BlogVotes WHERE BlogID = p_target_id AND UserID = p_user_id;
    ELSE
        SELECT VoteType INTO v_existing_vote
        FROM CommentVotes WHERE CommentID = p_target_id AND UserID = p_user_id;
    END IF;

    -- ═══════════════════════════════════════════
    -- CASE 1: Same vote exists → toggle OFF
    -- ═══════════════════════════════════════════
    IF v_existing_vote = p_vote_type THEN
        IF p_target_type = 'blog' THEN
            DELETE FROM BlogVotes WHERE BlogID = p_target_id AND UserID = p_user_id;
            UPDATE Blog SET
                UpvoteCount   = CASE WHEN p_vote_type = 'upvote'   THEN GREATEST(UpvoteCount - 1, 0)   ELSE UpvoteCount END,
                DownvoteCount = CASE WHEN p_vote_type = 'downvote' THEN GREATEST(DownvoteCount - 1, 0) ELSE DownvoteCount END
            WHERE BlogID = p_target_id;
        ELSE
            DELETE FROM CommentVotes WHERE CommentID = p_target_id AND UserID = p_user_id;
            UPDATE Comments SET
                UpvoteCount   = CASE WHEN p_vote_type = 'upvote'   THEN GREATEST(UpvoteCount - 1, 0)   ELSE UpvoteCount END,
                DownvoteCount = CASE WHEN p_vote_type = 'downvote' THEN GREATEST(DownvoteCount - 1, 0) ELSE DownvoteCount END
            WHERE CommentID = p_target_id;
        END IF;
        v_user_vote := NULL;
        v_action := 'removed';

    -- ═══════════════════════════════════════════
    -- CASE 2: Opposite vote exists → switch
    -- ═══════════════════════════════════════════
    ELSIF v_existing_vote IS NOT NULL THEN
        IF p_target_type = 'blog' THEN
            UPDATE BlogVotes SET VoteType = p_vote_type, CreatedAt = CURRENT_TIMESTAMP
            WHERE BlogID = p_target_id AND UserID = p_user_id;
            UPDATE Blog SET
                UpvoteCount   = CASE WHEN p_vote_type = 'upvote'   THEN UpvoteCount + 1              ELSE GREATEST(UpvoteCount - 1, 0) END,
                DownvoteCount = CASE WHEN p_vote_type = 'downvote' THEN DownvoteCount + 1             ELSE GREATEST(DownvoteCount - 1, 0) END
            WHERE BlogID = p_target_id;
        ELSE
            UPDATE CommentVotes SET VoteType = p_vote_type, CreatedAt = CURRENT_TIMESTAMP
            WHERE CommentID = p_target_id AND UserID = p_user_id;
            UPDATE Comments SET
                UpvoteCount   = CASE WHEN p_vote_type = 'upvote'   THEN UpvoteCount + 1              ELSE GREATEST(UpvoteCount - 1, 0) END,
                DownvoteCount = CASE WHEN p_vote_type = 'downvote' THEN DownvoteCount + 1             ELSE GREATEST(DownvoteCount - 1, 0) END
            WHERE CommentID = p_target_id;
        END IF;
        v_action := 'switched';

    -- ═══════════════════════════════════════════
    -- CASE 3: No vote exists → new vote
    -- ═══════════════════════════════════════════
    ELSE
        IF p_target_type = 'blog' THEN
            INSERT INTO BlogVotes (BlogID, UserID, VoteType) VALUES (p_target_id, p_user_id, p_vote_type);
            UPDATE Blog SET
                UpvoteCount   = CASE WHEN p_vote_type = 'upvote'   THEN UpvoteCount + 1   ELSE UpvoteCount END,
                DownvoteCount = CASE WHEN p_vote_type = 'downvote' THEN DownvoteCount + 1  ELSE DownvoteCount END
            WHERE BlogID = p_target_id;
        ELSE
            INSERT INTO CommentVotes (CommentID, UserID, VoteType) VALUES (p_target_id, p_user_id, p_vote_type);
            UPDATE Comments SET
                UpvoteCount   = CASE WHEN p_vote_type = 'upvote'   THEN UpvoteCount + 1   ELSE UpvoteCount END,
                DownvoteCount = CASE WHEN p_vote_type = 'downvote' THEN DownvoteCount + 1  ELSE DownvoteCount END
            WHERE CommentID = p_target_id;
        END IF;
    END IF;

    -- ─── Return updated counts ───
    IF p_target_type = 'blog' THEN
        RETURN QUERY
            SELECT b.UpvoteCount::INT, b.DownvoteCount::INT, v_user_vote, v_action
            FROM Blog b WHERE b.BlogID = p_target_id;
    ELSE
        RETURN QUERY
            SELECT c.UpvoteCount::INT, c.DownvoteCount::INT, v_user_vote, v_action
            FROM Comments c WHERE c.CommentID = p_target_id;
    END IF;
END;
$$ LANGUAGE plpgsql;
