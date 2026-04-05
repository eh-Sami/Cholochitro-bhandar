import requests
import psycopg2
import os
import argparse
from psycopg2 import Error
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# ── TMDB CONFIG ─────────────────────────────
API_KEY = os.getenv("TMDB_API_KEY")
BASE_URL = "https://api.themoviedb.org/3"

# ── DB CONFIG ───────────────────────────────
# Use Neon DB connection string
DATABASE_URL = os.getenv("DATABASE_URL")

# ══════════════════════════════════════════════
# API FETCH FUNCTIONS
# ══════════════════════════════════════════════

def fetch_popular_movies(page=1):
    """Fetch popular movies from TMDB"""
    url = f"{BASE_URL}/movie/popular"
    params = {
        "api_key": API_KEY,
        "language": "en-US",
        "page": page
    }
    response = requests.get(url, params=params)
    response.raise_for_status()
    return response.json()["results"]


def fetch_movie_details(movie_id):
    """Fetch movie details including genres and production companies"""
    url = f"{BASE_URL}/movie/{movie_id}"
    params = {"api_key": API_KEY}
    response = requests.get(url, params=params)
    response.raise_for_status()
    return response.json()


def fetch_movie_credits(movie_id):
    """Fetch movie credits (cast and crew)"""
    url = f"{BASE_URL}/movie/{movie_id}/credits"
    params = {"api_key": API_KEY}
    response = requests.get(url, params=params)
    response.raise_for_status()
    return response.json()


def search_movie(query):
    """Search for a movie by name, returns list of results"""
    url = f"{BASE_URL}/search/movie"
    params = {
        "api_key": API_KEY,
        "query": query,
        "language": "en-US"
    }
    response = requests.get(url, params=params)
    response.raise_for_status()
    return response.json()["results"]


# ══════════════════════════════════════════════
# DATABASE INSERT FUNCTIONS
# ══════════════════════════════════════════════

def insert_media(cursor, movie):
    """Insert into Media table using TMDB movie ID"""
    query = """
    INSERT INTO Media
    (MediaID, Title, ReleaseYear, Description, LanguageName, Rating, MediaType, Poster)
    VALUES (%s, %s, %s, %s, %s, %s, 'Movie', %s)
    ON CONFLICT (MediaID) DO NOTHING;
    """
    cursor.execute(query, (
        movie["id"],
        movie["title"],
        int(movie["release_date"][:4]) if movie.get("release_date") and len(movie["release_date"]) >= 4 else None,
        movie.get("overview"),
        movie.get("original_language"),
        movie.get("vote_average"),
        movie.get("poster_path")
    ))


def insert_movie(cursor, details):
    """Insert into Movie table"""
    # Duration must be > 0 due to CHECK constraint
    runtime = details.get("runtime")
    if runtime is not None and runtime <= 0:
        runtime = None
    
    query = """
    INSERT INTO Movie
    (MediaID, Duration, Budget, Revenue)
    VALUES (%s, %s, %s, %s)
    ON CONFLICT (MediaID) DO NOTHING;
    """
    cursor.execute(query, (
        details["id"],
        runtime,
        details.get("budget") or None,
        details.get("revenue") or None
    ))


def insert_genre(cursor, genre):
    """Insert into Genre table"""
    query = """
    INSERT INTO Genre (GenreID, GenreName)
    VALUES (%s, %s)
    ON CONFLICT (GenreID) DO NOTHING;
    """
    cursor.execute(query, (
        genre["id"],
        genre["name"]
    ))


def insert_media_genre(cursor, media_id, genre_id):
    """Insert into Media_Genre junction table"""
    query = """
    INSERT INTO Media_Genre (MediaID, GenreID)
    VALUES (%s, %s)
    ON CONFLICT (MediaID, GenreID) DO NOTHING;
    """
    cursor.execute(query, (media_id, genre_id))


def insert_studio(cursor, company):
    """Insert into Studio table"""
    query = """
    INSERT INTO Studio (StudioID, StudioName, LogoURL)
    VALUES (%s, %s, %s)
    ON CONFLICT (StudioID) DO NOTHING;
    """
    cursor.execute(query, (
        company["id"],
        company["name"],
        company.get("logo_path")
    ))


def insert_production(cursor, studio_id, media_id):
    """Insert into Production junction table"""
    query = """
    INSERT INTO Production (StudioID, MediaID)
    VALUES (%s, %s)
    ON CONFLICT (StudioID, MediaID) DO NOTHING;
    """
    cursor.execute(query, (studio_id, media_id))


def insert_person(cursor, person):
    """Insert into Person table"""
    query = """
    INSERT INTO Person (PersonID, FullName, Picture)
    VALUES (%s, %s, %s)
    ON CONFLICT (PersonID) DO NOTHING;
    """
    cursor.execute(query, (
        person["id"],
        person["name"],
        person.get("profile_path")
    ))


def insert_crew(cursor, person_id, media_id, role, character_name=None):
    """
    Insert into Crew junction table
    - Actor: has CharacterName
    - Director, Writer: CharacterName is NULL
    """
    query = """
    INSERT INTO Crew (PersonID, MediaID, CrewRole, CharacterName)
    VALUES (%s, %s, %s, %s)
    ON CONFLICT (PersonID, MediaID, CrewRole) DO NOTHING;
    """
    cursor.execute(query, (person_id, media_id, role, character_name))


# ══════════════════════════════════════════════
# PROCESS FUNCTIONS
# ══════════════════════════════════════════════

def process_genres(cursor, media_id, genres):
    """Process and insert genres for a movie"""
    for genre in genres:
        insert_genre(cursor, genre)
        insert_media_genre(cursor, media_id, genre["id"])


def process_studios(cursor, media_id, companies):
    """Process and insert production companies for a movie"""
    for company in companies:
        insert_studio(cursor, company)
        insert_production(cursor, company["id"], media_id)


def process_credits(cursor, media_id, credits):
    """
    Process cast and crew for a movie
    
    Crew roles:
    - Actor (from cast): has CharacterName
    - Director (from crew where job='Director'): CharacterName is NULL
    - Writer (from crew where job='Writer' or 'Screenplay'): CharacterName is NULL
    """
    
    # Process ACTORS (from cast array)
    # Limit to top 10 actors to avoid too much data
    for actor in credits.get("cast", [])[:10]:
        insert_person(cursor, actor)
        insert_crew(
            cursor,
            person_id=actor["id"],
            media_id=media_id,
            role="Actor",
            character_name=actor.get("character")  # Actor has character name
        )
    
    # Process DIRECTORS and WRITERS (from crew array)
    for crew_member in credits.get("crew", []):
        job = crew_member.get("job", "")
        
        # Only process Directors and Writers
        if job == "Director":
            insert_person(cursor, crew_member)
            insert_crew(
                cursor,
                person_id=crew_member["id"],
                media_id=media_id,
                role="Director",
                character_name=None  # Director has no character name
            )
        
        elif job in ["Writer", "Screenplay", "Story"]:
            insert_person(cursor, crew_member)
            insert_crew(
                cursor,
                person_id=crew_member["id"],
                media_id=media_id,
                role="Writer",
                character_name=None  # Writer has no character name
            )


# ══════════════════════════════════════════════
# PROCESS SINGLE MOVIE
# ══════════════════════════════════════════════

def process_single_movie(cur, movie_id, movie_title=None):
    """Process and insert a single movie with all its data"""
    try:
        # 1. Fetch detailed movie info
        details = fetch_movie_details(movie_id)
        movie_title = details.get("title", movie_title or "Unknown")
        print(f"\n🎬 Processing: {movie_title}")
        
        # 2. Fetch credits (cast and crew)
        credits = fetch_movie_credits(movie_id)
        
        # 3. Insert Media & Movie
        print(f"   → Inserting Media & Movie...")
        insert_media(cur, details)
        insert_movie(cur, details)
        
        # 4. Insert Genres & Media_Genre
        genres = details.get("genres", [])
        if genres:
            print(f"   → Inserting {len(genres)} genres...")
            process_genres(cur, movie_id, genres)
        
        # 5. Insert Studios & Production
        companies = details.get("production_companies", [])
        if companies:
            print(f"   → Inserting {len(companies)} studios...")
            process_studios(cur, movie_id, companies)
        
        # 6. Insert Person & Crew
        cast_count = len(credits.get("cast", [])[:10])
        crew_count = len([c for c in credits.get("crew", []) 
                         if c.get("job") in ["Director", "Writer", "Screenplay", "Story"]])
        print(f"   → Inserting {cast_count} actors + {crew_count} directors/writers...")
        process_credits(cur, movie_id, credits)
        
        return True
    except Exception as e:
        print(f"   ❌ Error processing movie: {e}")
        return False


# ══════════════════════════════════════════════
# MAIN FUNCTIONS
# ══════════════════════════════════════════════

def add_popular_movies(pages=1, start_page=1):
    """Fetch and add popular movies starting from start_page"""
    if not API_KEY:
        raise RuntimeError("TMDB_API_KEY not set. Please check your .env file.")

    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    end_page = start_page + pages - 1
    total_movies = pages * 20
    print(f"\n🎯 Plan: Fetch pages {start_page}–{end_page} (~{total_movies} movies)")

    inserted_count = 0
    try:
        for page in range(start_page, end_page + 1):
            print(f"\n📥 Fetching popular movies (page {page}/{end_page})...")
            movies = fetch_popular_movies(page=page)
            print(f"   Found {len(movies)} movies on this page")

            for i, movie in enumerate(movies, 1):
                movie_id = movie["id"]
                movie_title = movie["title"]
                print(f"\n[Page {page} | {i}/{len(movies)}] Processing: {movie_title}")
                if process_single_movie(cur, movie_id, movie_title):
                    inserted_count += 1

        conn.commit()
        print("\n" + "="*50)
        print(f"✅ SUCCESS! {inserted_count} movies processed across pages {start_page}–{end_page}.")
        print("="*50)

    except Exception as e:
        conn.rollback()
        print(f"\n❌ Error: {e}")

    finally:
        cur.close()
        conn.close()


def add_movie_by_id(movie_id):
    """Add a single movie by its TMDB ID"""
    if not API_KEY:
        raise RuntimeError("TMDB_API_KEY not set. Please check your .env file.")

    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        print(f"📥 Fetching movie with ID: {movie_id}")
        if process_single_movie(cur, movie_id):
            conn.commit()
            print("\n✅ Movie added successfully!")
        else:
            conn.rollback()
            print("\n❌ Failed to add movie.")

    except requests.exceptions.HTTPError as e:
        conn.rollback()
        if e.response.status_code == 404:
            print(f"\n❌ Movie with ID {movie_id} not found on TMDB.")
        else:
            print(f"\n❌ API Error: {e}")

    except Exception as e:
        conn.rollback()
        print(f"\n❌ Error: {e}")

    finally:
        cur.close()
        conn.close()


def add_movie_by_search(query):
    """Search for a movie and add it"""
    if not API_KEY:
        raise RuntimeError("TMDB_API_KEY not set. Please check your .env file.")

    print(f"🔍 Searching for: '{query}'")
    results = search_movie(query)
    
    if not results:
        print("❌ No movies found with that name.")
        return
    
    # Show search results
    print(f"\nFound {len(results)} results:")
    print("-" * 50)
    for i, movie in enumerate(results[:10], 1):  # Show top 10
        year = movie.get("release_date", "")[:4] or "????"
        print(f"  {i}. {movie['title']} ({year}) - ID: {movie['id']}")
    print("-" * 50)
    
    # Ask user to select
    try:
        choice = input("\nEnter number to add (or 'q' to quit): ").strip()
        if choice.lower() == 'q':
            print("Cancelled.")
            return
        
        index = int(choice) - 1
        if 0 <= index < len(results[:10]):
            selected_movie = results[index]
            add_movie_by_id(selected_movie["id"])
        else:
            print("❌ Invalid selection.")
    except ValueError:
        print("❌ Invalid input.")


# ══════════════════════════════════════════════
# COMMAND LINE INTERFACE
# ══════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(
        description="Fetch movie data from TMDB and store in PostgreSQL database",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python movie_fetcher.py                         # Fetch 20 popular movies (page 1)
  python movie_fetcher.py --pages 10              # Fetch 200 popular movies (pages 1-10)
  python movie_fetcher.py --pages 10 --start-page 2  # Fetch 200 movies starting from page 2
                                                     # (skips the first 20 already in DB)
  python movie_fetcher.py --search "Inception"    # Search and add a specific movie
  python movie_fetcher.py --id 550                # Add movie by TMDB ID (Fight Club)
        """
    )
    
    parser.add_argument(
        "--pages", 
        type=int, 
        default=1,
        help="Number of pages of popular movies to fetch (20 movies per page, default: 1)"
    )
    parser.add_argument(
        "--start-page",
        type=int,
        default=1,
        help="Page number to start fetching from (default: 1). Use 2 to skip already-fetched page 1."
    )
    parser.add_argument(
        "--search", 
        type=str,
        help="Search for a movie by name and add it"
    )
    parser.add_argument(
        "--id", 
        type=int,
        help="Add a movie by its TMDB ID directly"
    )
    
    args = parser.parse_args()
    
    # Handle different modes
    if args.search:
        add_movie_by_search(args.search)
    elif args.id:
        add_movie_by_id(args.id)
    else:
        add_popular_movies(pages=args.pages, start_page=args.start_page)


if __name__ == "__main__":
    main()
