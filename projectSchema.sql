-- ─────────────────────────────────────────────
-- 1. ENUMS & INDEPENDENT ENTITIES
-- ─────────────────────────────────────────────

-- Enum for the Superclass discriminator
CREATE TYPE media_type_enum AS ENUM ('Movie', 'TVSeries');

CREATE TABLE Users (
    UserID SERIAL PRIMARY KEY,
    FullName VARCHAR(255) NOT NULL,
    Email VARCHAR(255) UNIQUE NOT NULL,
    PasswordHash VARCHAR(255) NOT NULL,
    DateOfBirth DATE
);

CREATE TABLE Person (
    PersonID SERIAL PRIMARY KEY,
    FullName VARCHAR(255) NOT NULL,
    Picture VARCHAR(512),
    Biography TEXT,
    Nationality VARCHAR(100),
    DateOfBirth DATE
);

CREATE TABLE Studio (
    StudioID SERIAL PRIMARY KEY,
    StudioName VARCHAR(255) NOT NULL,
    FoundingYear INT,
    WebsiteURL VARCHAR(512),
    LogoURL VARCHAR(512)
);

CREATE TABLE Genre (
    GenreID SERIAL PRIMARY KEY,
    GenreName VARCHAR(100) NOT NULL UNIQUE
);

-- ─────────────────────────────────────────────
-- 2. MEDIA HIERARCHY (Superclass/Subclass)
-- ─────────────────────────────────────────────

CREATE TABLE Media (
    MediaID SERIAL PRIMARY KEY,
    Title VARCHAR(255) NOT NULL,
    ReleaseYear INT,
    Description TEXT,
    LanguageName VARCHAR(100),
    Rating DECIMAL(3,1),
    MediaType media_type_enum NOT NULL,
    Poster VARCHAR(512)
);

CREATE TABLE Movie (
    MediaID INT PRIMARY KEY,
    Duration INT CHECK (Duration > 0),
    TrailerLink VARCHAR(512),
    Budget DECIMAL(15, 2),
    Revenue DECIMAL(15, 2),
    Currency VARCHAR(10),
    FOREIGN KEY (MediaID) REFERENCES Media(MediaID) ON DELETE CASCADE
);

CREATE TABLE TVSeries (
    MediaID INT PRIMARY KEY,
    IsOngoing BOOLEAN DEFAULT FALSE,
    NumberOfSeasons INT CHECK (NumberOfSeasons >= 0),
    FOREIGN KEY (MediaID) REFERENCES Media(MediaID) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────
-- 3. WEAK ENTITIES (Seasons & Episodes)
-- ─────────────────────────────────────────────

CREATE TABLE Season (
    MediaID INT,
    SeasonNo INT,
    SeasonTitle VARCHAR(255),
    ReleaseDate DATE,
    Description TEXT,
    AvgRating DECIMAL(3, 1),
    TrailerLink VARCHAR(512),
    EpisodeCount INT,
    
    PRIMARY KEY (MediaID, SeasonNo),
    FOREIGN KEY (MediaID) REFERENCES TVSeries(MediaID) ON DELETE CASCADE
);

CREATE TABLE Episode (
    MediaID INT,
    SeasonNo INT,
    EpisodeNo INT,
    EpisodeTitle VARCHAR(255),
    Duration INT CHECK (Duration > 0),
    AvgRating DECIMAL(3, 1),
    
    PRIMARY KEY (MediaID, SeasonNo, EpisodeNo),
    FOREIGN KEY (MediaID, SeasonNo) REFERENCES Season(MediaID, SeasonNo) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────
-- 4. SOCIAL FEATURES (Strict Alignment)
-- ─────────────────────────────────────────────

CREATE TABLE User_List (
    ListID SERIAL PRIMARY KEY,
    UserID INT NOT NULL,
    ListName VARCHAR(255) NOT NULL,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    IsPublic BOOLEAN DEFAULT FALSE,
    
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE
);

-- Blog Table (Removed MediaID to allow Many-to-Many via 'blog_mentions')
CREATE TABLE Blog (
    BlogID SERIAL PRIMARY KEY,
    UserID INT NOT NULL,
    BlogTitle VARCHAR(255) NOT NULL,
    Content TEXT NOT NULL,
    PostDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpvoteCount INT DEFAULT 0,
    DownvoteCount INT DEFAULT 0,
    EditedAt TIMESTAMP,
    
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE
);

-- Review Table (Handles strict XOR logic for Movie vs Episode targets)
CREATE TABLE Review (
    ReviewID SERIAL PRIMARY KEY,
    UserID INT NOT NULL,

    -- Target A: Movie or Series (Media table)
    MediaID INT,

    -- Target B: Specific Episode (Episode table)
    EpisodeMediaID INT,
    EpisodeSeasonNo INT,
    EpisodeNo INT,

    ReviewText TEXT,
    Rating INT CHECK (Rating BETWEEN 1 AND 10),
    PostDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    SpoilerFlag BOOLEAN DEFAULT FALSE,
    HelpfulCount INT DEFAULT 0,
    NotHelpfulCount INT DEFAULT 0,
    EditedAt TIMESTAMP,

    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
    FOREIGN KEY (MediaID) REFERENCES Media(MediaID) ON DELETE CASCADE,
    FOREIGN KEY (EpisodeMediaID, EpisodeSeasonNo, EpisodeNo) 
        REFERENCES Episode(MediaID, SeasonNo, EpisodeNo) ON DELETE CASCADE,

    -- Ensure a review targets exactly one type of content
    CONSTRAINT chk_review_target CHECK (
        (MediaID IS NOT NULL AND EpisodeMediaID IS NULL) 
        OR 
        (MediaID IS NULL AND EpisodeMediaID IS NOT NULL)
    )
);

-- Comments Table (Strictly Blogs only, no Reviews)
CREATE TABLE Comments (
    CommentID SERIAL PRIMARY KEY,
    UserID INT NOT NULL,
    BlogID INT NOT NULL,
    ReplyToCommentID INT,

    CommentText TEXT NOT NULL,
    PostDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpvoteCount INT DEFAULT 0,
    DownvoteCount INT DEFAULT 0,
    EditedAt TIMESTAMP,

    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
    FOREIGN KEY (BlogID) REFERENCES Blog(BlogID) ON DELETE CASCADE,
    FOREIGN KEY (ReplyToCommentID) REFERENCES Comments(CommentID) ON DELETE SET NULL
);

-- ─────────────────────────────────────────────
-- 5. JUNCTION TABLES (Relationships)
-- ─────────────────────────────────────────────

-- "Mentioned" Relationship (Blog M:N Media)
CREATE TABLE Blog_Mentions (
    BlogID INT,
    MediaID INT,
    
    PRIMARY KEY (BlogID, MediaID),
    FOREIGN KEY (BlogID) REFERENCES Blog(BlogID) ON DELETE CASCADE,
    FOREIGN KEY (MediaID) REFERENCES Media(MediaID) ON DELETE CASCADE
);

-- "Mentioned" Relationship for Comments (Comments M:N Media)
CREATE TABLE Comment_Mentions (
    CommentID INT,
    MediaID INT,
    
    PRIMARY KEY (CommentID, MediaID),
    FOREIGN KEY (CommentID) REFERENCES Comments(CommentID) ON DELETE CASCADE,
    FOREIGN KEY (MediaID) REFERENCES Media(MediaID) ON DELETE CASCADE
);

-- "Production" Relationship (Studio M:N Media)
CREATE TABLE Production (
    StudioID INT,
    MediaID INT,
    
    PRIMARY KEY (StudioID, MediaID),
    FOREIGN KEY (StudioID) REFERENCES Studio(StudioID) ON DELETE CASCADE,
    FOREIGN KEY (MediaID) REFERENCES Media(MediaID) ON DELETE CASCADE
);

-- "Crew" Relationship (Person M:N Media with CrewRole)
CREATE TABLE Crew (
    PersonID INT,
    MediaID INT,
    CrewRole VARCHAR(100),
    CharacterName VARCHAR(255),
    
    PRIMARY KEY (PersonID, MediaID, CrewRole),
    FOREIGN KEY (PersonID) REFERENCES Person(PersonID) ON DELETE CASCADE,
    FOREIGN KEY (MediaID) REFERENCES Media(MediaID) ON DELETE CASCADE
);

-- "Media_Genre" Relationship
CREATE TABLE Media_Genre (
    MediaID INT,
    GenreID INT,
    
    PRIMARY KEY (MediaID, GenreID),
    FOREIGN KEY (MediaID) REFERENCES Media(MediaID) ON DELETE CASCADE,
    FOREIGN KEY (GenreID) REFERENCES Genre(GenreID) ON DELETE CASCADE
);

-- "List_Items" Relationship
CREATE TABLE List_Items (
    ListID INT,
    MediaID INT,
    
    PRIMARY KEY (ListID, MediaID),
    FOREIGN KEY (ListID) REFERENCES User_List(ListID) ON DELETE CASCADE,
    FOREIGN KEY (MediaID) REFERENCES Media(MediaID) ON DELETE CASCADE
);