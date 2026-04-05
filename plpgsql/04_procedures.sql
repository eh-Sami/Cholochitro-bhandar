-- ═══════════════════════════════════════════════
-- Delete User with Full Cascade Cleanup
-- Usage: CALL sp_delete_user(42);
-- ═══════════════════════════════════════════════

CREATE OR REPLACE PROCEDURE sp_delete_user(p_user_id INT)
LANGUAGE plpgsql AS $$
BEGIN
    -- Verify user exists
    IF NOT EXISTS (SELECT 1 FROM Users WHERE UserID = p_user_id) THEN
        RAISE EXCEPTION 'User with ID % does not exist', p_user_id;
    END IF;

    -- Delete votes made by this user
    DELETE FROM BlogVotes    WHERE UserID = p_user_id;
    DELETE FROM CommentVotes WHERE UserID = p_user_id;

    -- Delete mentions in user's comments
    DELETE FROM Comment_Mentions
    WHERE CommentID IN (SELECT CommentID FROM Comments WHERE UserID = p_user_id);

    -- Delete mentions in user's blogs
    DELETE FROM Blog_Mentions
    WHERE BlogID IN (SELECT BlogID FROM Blog WHERE UserID = p_user_id);

    -- Delete user's comments
    DELETE FROM Comments WHERE UserID = p_user_id;

    -- Delete user's blogs
    DELETE FROM Blog WHERE UserID = p_user_id;

    -- Delete user's reviews (rating triggers will auto-recalculate)
    DELETE FROM Review WHERE UserID = p_user_id;

    -- Delete user's list items and lists
    DELETE FROM List_Items
    WHERE ListID IN (SELECT ListID FROM User_List WHERE UserID = p_user_id);
    DELETE FROM User_List WHERE UserID = p_user_id;

    -- Finally, delete the user
    DELETE FROM Users WHERE UserID = p_user_id;
END;
$$;
