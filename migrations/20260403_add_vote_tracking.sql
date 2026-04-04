-- Add vote tracking tables to prevent duplicate votes per user
-- Blog votes tracking
CREATE TABLE IF NOT EXISTS BlogVotes (
    VoteID SERIAL PRIMARY KEY,
    BlogID INT NOT NULL,
    UserID INT NOT NULL,
    VoteType VARCHAR(10) NOT NULL CHECK (VoteType IN ('upvote', 'downvote')),
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (BlogID) REFERENCES Blog(BlogID) ON DELETE CASCADE,
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
    UNIQUE (BlogID, UserID, VoteType)
);

-- Comment votes tracking
CREATE TABLE IF NOT EXISTS CommentVotes (
    VoteID SERIAL PRIMARY KEY,
    CommentID INT NOT NULL,
    UserID INT NOT NULL,
    VoteType VARCHAR(10) NOT NULL CHECK (VoteType IN ('upvote', 'downvote')),
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (CommentID) REFERENCES Comments(CommentID) ON DELETE CASCADE,
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
    UNIQUE (CommentID, UserID, VoteType)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_blog_votes_user_blog ON BlogVotes(UserID, BlogID);
CREATE INDEX IF NOT EXISTS idx_comment_votes_user_comment ON CommentVotes(UserID, CommentID);
