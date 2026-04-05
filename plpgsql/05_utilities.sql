CREATE OR REPLACE FUNCTION fn_set_edited_at()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'blog' THEN
        IF NEW.BlogTitle IS DISTINCT FROM OLD.BlogTitle
           OR NEW.Content IS DISTINCT FROM OLD.Content THEN
            NEW.EditedAt := CURRENT_TIMESTAMP;
        END IF;

    ELSIF TG_TABLE_NAME = 'comments' THEN
        IF NEW.CommentText IS DISTINCT FROM OLD.CommentText THEN
            NEW.EditedAt := CURRENT_TIMESTAMP;
        END IF;

    ELSIF TG_TABLE_NAME = 'review' THEN
        IF NEW.ReviewText IS DISTINCT FROM OLD.ReviewText
           OR NEW.Rating IS DISTINCT FROM OLD.Rating
           OR NEW.SpoilerFlag IS DISTINCT FROM OLD.SpoilerFlag THEN
            NEW.EditedAt := CURRENT_TIMESTAMP;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
