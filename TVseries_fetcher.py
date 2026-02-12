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

def fetch_popular_tv(page=1):
    """Fetch popular TV shows from TMDB"""
    url = f"{BASE_URL}/tv/popular"
    params = {
        "api_key": API_KEY,
        "language": "en-US",
        "page": page
    }
    response = requests.get(url, params=params)
    response.raise_for_status()
    return response.json()["results"]


def fetch_tv_details(tv_id):
    """Fetch TV show details including genres and production companies"""
    url = f"{BASE_URL}/tv/{tv_id}"
    params = {"api_key": API_KEY}
    response = requests.get(url, params=params)
    response.raise_for_status()
    return response.json()


def fetch_tv_credits(tv_id):
    """Fetch TV show credits (cast and crew)"""
    url = f"{BASE_URL}/tv/{tv_id}/credits"
    params = {"api_key": API_KEY}
    response = requests.get(url, params=params)
    response.raise_for_status()
    return response.json()


def fetch_season_details(tv_id, season_number):
    """Fetch season details including episodes"""
    url = f"{BASE_URL}/tv/{tv_id}/season/{season_number}"
    params = {"api_key": API_KEY}
    response = requests.get(url, params=params)
    response.raise_for_status()
    return response.json()


def search_tv(query):
    """Search for a TV show by name"""
    url = f"{BASE_URL}/search/tv"
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

def insert_media(cursor, tv_show):
    """Insert into Media table for TV Series"""
    # Get first air date year
    first_air_date = tv_show.get("first_air_date", "")
    release_year = int(first_air_date[:4]) if first_air_date and len(first_air_date) >= 4 else None
    
    query = """
    INSERT INTO Media
    (MediaID, Title, ReleaseYear, Description, LanguageName, Rating, MediaType, Poster)
    VALUES (%s, %s, %s, %s, %s, %s, 'TVSeries', %s)
    ON CONFLICT (MediaID) DO NOTHING;
    """
    cursor.execute(query, (
        tv_show["id"],
        tv_show.get("name") or tv_show.get("title"),
        release_year,
        tv_show.get("overview"),
        tv_show.get("original_language"),
        tv_show.get("vote_average"),
        tv_show.get("poster_path")
    ))


def insert_tvseries(cursor, details):
    """Insert into TVSeries table"""
    # Check if still in production (ongoing)
    is_ongoing = details.get("in_production", False)
    num_seasons = details.get("number_of_seasons", 0)
    
    query = """
    INSERT INTO TVSeries (MediaID, IsOngoing, NumberOfSeasons)
    VALUES (%s, %s, %s)
    ON CONFLICT (MediaID) DO NOTHING;
    """
    cursor.execute(query, (
        details["id"],
        is_ongoing,
        num_seasons
    ))


def insert_season(cursor, tv_id, season):
    """Insert into Season table"""
    # Get release date
    air_date = season.get("air_date")
    
    query = """
    INSERT INTO Season 
    (MediaID, SeasonNo, SeasonTitle, ReleaseDate, Description, AvgRating, EpisodeCount)
    VALUES (%s, %s, %s, %s, %s, %s, %s)
    ON CONFLICT (MediaID, SeasonNo) DO NOTHING;
    """
    cursor.execute(query, (
        tv_id,
        season.get("season_number"),
        season.get("name"),
        air_date if air_date else None,
        season.get("overview"),
        season.get("vote_average"),
        len(season.get("episodes", []))
    ))


def insert_episode(cursor, tv_id, season_no, episode):
    """Insert into Episode table"""
    # Duration must be > 0 due to CHECK constraint
    runtime = episode.get("runtime")
    if runtime is not None and runtime <= 0:
        runtime = None
    
    query = """
    INSERT INTO Episode 
    (MediaID, SeasonNo, EpisodeNo, EpisodeTitle, Duration, AvgRating)
    VALUES (%s, %s, %s, %s, %s, %s)
    ON CONFLICT (MediaID, SeasonNo, EpisodeNo) DO NOTHING;
    """
    cursor.execute(query, (
        tv_id,
        season_no,
        episode.get("episode_number"),
        episode.get("name"),
        runtime,
        episode.get("vote_average")
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
    """Insert into Studio table (production companies/networks)"""
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
    """Process and insert genres for a TV show"""
    for genre in genres:
        insert_genre(cursor, genre)
        insert_media_genre(cursor, media_id, genre["id"])


def process_studios(cursor, media_id, companies):
    """Process and insert production companies for a TV show"""
    for company in companies:
        insert_studio(cursor, company)
        insert_production(cursor, company["id"], media_id)


def process_networks(cursor, media_id, networks):
    """Process and insert networks (treated as studios) for a TV show"""
    for network in networks:
        insert_studio(cursor, network)
        insert_production(cursor, network["id"], media_id)


def process_credits(cursor, media_id, credits):
    """
    Process cast and crew for a TV show
    
    Crew roles:
    - Actor (from cast): has CharacterName
    - Director (from crew where job='Director'): CharacterName is NULL
    - Writer (from crew where job contains 'Writer'): CharacterName is NULL
    """
    
    # Process ACTORS (from cast array)
    # Limit to top 10 actors to avoid too much data
    for actor in credits.get("cast", [])[:10]:
        insert_person(cursor, actor)
        # For TV shows, character might be in 'character' or 'roles'
        character = actor.get("character") or ""
        if actor.get("roles"):
            character = actor["roles"][0].get("character", "")
        insert_crew(
            cursor,
            person_id=actor["id"],
            media_id=media_id,
            role="Actor",
            character_name=character if character else None
        )
    
    # Process DIRECTORS and WRITERS (from crew array)
    for crew_member in credits.get("crew", []):
        job = crew_member.get("job", "")
        
        if job == "Director":
            insert_person(cursor, crew_member)
            insert_crew(
                cursor,
                person_id=crew_member["id"],
                media_id=media_id,
                role="Director",
                character_name=None
            )
        
        elif "Writer" in job or job in ["Screenplay", "Story", "Creator"]:
            insert_person(cursor, crew_member)
            insert_crew(
                cursor,
                person_id=crew_member["id"],
                media_id=media_id,
                role="Writer",
                character_name=None
            )


def process_seasons_and_episodes(cursor, tv_id, num_seasons):
    """
    Fetch and insert ALL seasons and episodes for a TV show
    """
    for season_num in range(1, num_seasons + 1):
        try:
            print(f"      📺 Fetching Season {season_num}...")
            season_data = fetch_season_details(tv_id, season_num)
            
            # Insert season
            insert_season(cursor, tv_id, season_data)
            
            # Insert episodes
            episodes = season_data.get("episodes", [])
            for episode in episodes:
                insert_episode(cursor, tv_id, season_num, episode)
            
            print(f"         → {len(episodes)} episodes inserted")
            
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 404:
                print(f"      ⚠️ Season {season_num} not found, skipping...")
            else:
                print(f"      ❌ Error fetching season {season_num}: {e}")


# ══════════════════════════════════════════════
# PROCESS SINGLE TV SHOW
# ══════════════════════════════════════════════

def process_single_tv(cur, tv_id, tv_title=None, fetch_seasons=True):
    """Process and insert a single TV show with all its data"""
    try:
        # 1. Fetch detailed TV show info
        details = fetch_tv_details(tv_id)
        tv_title = details.get("name", tv_title or "Unknown")
        print(f"\n📺 Processing: {tv_title}")
        
        # 2. Fetch credits (cast and crew)
        credits = fetch_tv_credits(tv_id)
        
        # 3. Insert Media & TVSeries
        print(f"   → Inserting Media & TVSeries...")
        insert_media(cur, details)
        insert_tvseries(cur, details)
        
        # 4. Insert Genres & Media_Genre
        genres = details.get("genres", [])
        if genres:
            print(f"   → Inserting {len(genres)} genres...")
            process_genres(cur, tv_id, genres)
        
        # 5. Insert Production Companies & Networks
        companies = details.get("production_companies", [])
        networks = details.get("networks", [])
        total_studios = len(companies) + len(networks)
        if total_studios > 0:
            print(f"   → Inserting {total_studios} studios/networks...")
            process_studios(cur, tv_id, companies)
            process_networks(cur, tv_id, networks)
        
        # 6. Insert Person & Crew
        cast_count = len(credits.get("cast", [])[:10])
        crew_count = len([c for c in credits.get("crew", []) 
                         if c.get("job") in ["Director", "Creator"] or "Writer" in c.get("job", "")])
        print(f"   → Inserting {cast_count} actors + {crew_count} directors/writers...")
        process_credits(cur, tv_id, credits)
        
        # 7. Fetch and insert Seasons & Episodes
        if fetch_seasons:
            num_seasons = details.get("number_of_seasons", 0)
            if num_seasons > 0:
                print(f"   → Fetching all {num_seasons} seasons...")
                process_seasons_and_episodes(cur, tv_id, num_seasons)
        
        return True
    except Exception as e:
        print(f"   ❌ Error processing TV show: {e}")
        return False


# ══════════════════════════════════════════════
# MAIN FUNCTIONS
# ══════════════════════════════════════════════

def add_popular_tv(pages=1):
    """Fetch and add popular TV shows"""
    if not API_KEY:
        raise RuntimeError("TMDB_API_KEY not set. Please check your .env file.")

    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        for page in range(1, pages + 1):
            print(f"\n📥 Fetching popular TV shows (page {page})...")
            tv_shows = fetch_popular_tv(page=page)
            print(f"   Found {len(tv_shows)} TV shows")

            for i, tv in enumerate(tv_shows, 1):
                tv_id = tv["id"]
                tv_title = tv.get("name") or tv.get("title")
                print(f"\n[{i}/{len(tv_shows)}] Processing: {tv_title}")
                process_single_tv(cur, tv_id, tv_title, fetch_seasons=True)

        conn.commit()
        print("\n" + "="*50)
        print("✅ SUCCESS! All TV show data inserted.")
        print("   • Media & TVSeries tables")
        print("   • Season & Episode tables")
        print("   • Genre & Media_Genre tables")
        print("   • Studio & Production tables")
        print("   • Person & Crew tables")
        print("="*50)

    except Exception as e:
        conn.rollback()
        print(f"\n❌ Error: {e}")

    finally:
        cur.close()
        conn.close()


def add_tv_by_id(tv_id):
    """Add a single TV show by its TMDB ID"""
    if not API_KEY:
        raise RuntimeError("TMDB_API_KEY not set. Please check your .env file.")

    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        print(f"📥 Fetching TV show with ID: {tv_id}")
        if process_single_tv(cur, tv_id):
            conn.commit()
            print("\n✅ TV show added successfully!")
        else:
            conn.rollback()
            print("\n❌ Failed to add TV show.")

    except requests.exceptions.HTTPError as e:
        conn.rollback()
        if e.response.status_code == 404:
            print(f"\n❌ TV show with ID {tv_id} not found on TMDB.")
        else:
            print(f"\n❌ API Error: {e}")

    except Exception as e:
        conn.rollback()
        print(f"\n❌ Error: {e}")

    finally:
        cur.close()
        conn.close()


def add_tv_by_search(query):
    """Search for a TV show and add it"""
    if not API_KEY:
        raise RuntimeError("TMDB_API_KEY not set. Please check your .env file.")

    print(f"🔍 Searching for: '{query}'")
    results = search_tv(query)
    
    if not results:
        print("❌ No TV shows found with that name.")
        return
    
    # Show search results
    print(f"\nFound {len(results)} results:")
    print("-" * 50)
    for i, tv in enumerate(results[:10], 1):
        year = tv.get("first_air_date", "")[:4] or "????"
        print(f"  {i}. {tv['name']} ({year}) - ID: {tv['id']}")
    print("-" * 50)
    
    # Ask user to select
    try:
        choice = input("\nEnter number to add (or 'q' to quit): ").strip()
        if choice.lower() == 'q':
            print("Cancelled.")
            return
        
        index = int(choice) - 1
        if 0 <= index < len(results[:10]):
            selected_tv = results[index]
            add_tv_by_id(selected_tv["id"])
        else:
            print("❌ Invalid selection.")
    except ValueError:
        print("❌ Invalid input.")


# ══════════════════════════════════════════════
# COMMAND LINE INTERFACE
# ══════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(
        description="Fetch TV show data from TMDB and store in PostgreSQL database",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python TVseries_fetcher.py                       # Fetch 20 popular TV shows
  python TVseries_fetcher.py --pages 2             # Fetch 40 popular TV shows
  python TVseries_fetcher.py --search "Breaking Bad"  # Search and add a specific show
  python TVseries_fetcher.py --id 1396             # Add by TMDB ID (Breaking Bad)
        """
    )
    
    parser.add_argument(
        "--pages", 
        type=int, 
        default=1,
        help="Number of pages of popular TV shows to fetch (20 shows per page)"
    )
    parser.add_argument(
        "--search", 
        type=str,
        help="Search for a TV show by name and add it"
    )
    parser.add_argument(
        "--id", 
        type=int,
        help="Add a TV show by its TMDB ID directly"
    )
    
    args = parser.parse_args()
    
    # Handle different modes
    if args.search:
        add_tv_by_search(args.search)
    elif args.id:
        add_tv_by_id(args.id)
    else:
        add_popular_tv(pages=args.pages)


if __name__ == "__main__":
    main()
