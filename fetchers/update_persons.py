import requests
import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("TMDB_API_KEY")
BASE_URL = "https://api.themoviedb.org/3"
YOUTUBE_BASE = "https://www.youtube.com/watch?v="

# Use Neon DB connection string
DATABASE_URL = os.getenv("DATABASE_URL")


# ══════════════════════════════════════════════
# API FUNCTIONS
# ══════════════════════════════════════════════

def fetch_person_details(person_id):
    """Fetch person details from TMDB"""
    url = f"{BASE_URL}/person/{person_id}"
    params = {"api_key": API_KEY}
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        return response.json()
    except Exception:
        return None


def fetch_movie_videos(movie_id):
    """Fetch movie trailers from TMDB"""
    url = f"{BASE_URL}/movie/{movie_id}/videos"
    params = {"api_key": API_KEY}
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        return response.json().get("results", [])
    except Exception:
        return []


def fetch_season_videos(tv_id, season_number):
    """Fetch season trailers from TMDB"""
    url = f"{BASE_URL}/tv/{tv_id}/season/{season_number}/videos"
    params = {"api_key": API_KEY}
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        return response.json().get("results", [])
    except Exception:
        return []


def fetch_season_details(tv_id, season_number):
    """Fetch season details including episodes with still images"""
    url = f"{BASE_URL}/tv/{tv_id}/season/{season_number}"
    params = {"api_key": API_KEY}
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        return response.json()
    except Exception:
        return None


def fetch_company_details(company_id):
    """Fetch studio/company details from TMDB"""
    url = f"{BASE_URL}/company/{company_id}"
    params = {"api_key": API_KEY}
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        return response.json()
    except Exception:
        return None


def get_trailer_url(videos):
    """Find the best trailer URL from video list"""
    for video in videos:
        if video.get("site") == "YouTube" and video.get("type") == "Trailer":
            return YOUTUBE_BASE + video["key"]
    for video in videos:
        if video.get("site") == "YouTube":
            return YOUTUBE_BASE + video["key"]
    return None


# ══════════════════════════════════════════════
# UPDATE FUNCTIONS
# ══════════════════════════════════════════════

def update_persons(cur):
    """Update Person bio, DOB, nationality"""
    cur.execute("""
        SELECT PersonID, FullName FROM Person 
        WHERE Biography IS NULL OR DateOfBirth IS NULL OR Nationality IS NULL
        ORDER BY PersonID
    """)
    persons = cur.fetchall()
    print(f"\n👤 Updating persons ({len(persons)} persons)...")

    updated = 0
    for i, (person_id, name) in enumerate(persons, 1):
        print(f"  [{i}/{len(persons)}] {name}...", end=" ")
        details = fetch_person_details(person_id)
        if not details:
            print("⚠️ Not found")
            continue

        biography = details.get("biography") or None
        dob = details.get("birthday") or None
        nationality = details.get("place_of_birth") or None

        cur.execute("""
            UPDATE Person SET Biography = %s, DateOfBirth = %s, Nationality = %s
            WHERE PersonID = %s
        """, (biography, dob, nationality, person_id))
        updated += 1
        print(f"✅")

    print(f"  → Updated {updated}/{len(persons)} persons\n")


def update_movie_trailers(cur):
    """Update TrailerLink for all movies"""
    cur.execute("""
        SELECT m.MediaID, m.Title FROM Media m
        JOIN Movie mv ON m.MediaID = mv.MediaID
        WHERE mv.TrailerLink IS NULL
    """)
    movies = cur.fetchall()
    print(f"📽️ Updating movie trailers ({len(movies)} movies)...")

    updated = 0
    for i, (movie_id, title) in enumerate(movies, 1):
        print(f"  [{i}/{len(movies)}] {title}...", end=" ")
        videos = fetch_movie_videos(movie_id)
        trailer_url = get_trailer_url(videos)
        if trailer_url:
            cur.execute("UPDATE Movie SET TrailerLink = %s WHERE MediaID = %s", (trailer_url, movie_id))
            updated += 1
            print(f"✅")
        else:
            print(f"⚠️ No trailer")

    print(f"  → Updated {updated}/{len(movies)} movies\n")


def update_season_trailers(cur):
    """Update TrailerLink for all seasons"""
    cur.execute("""
        SELECT s.MediaID, s.SeasonNo, m.Title FROM Season s
        JOIN Media m ON s.MediaID = m.MediaID
        WHERE s.TrailerLink IS NULL
    """)
    seasons = cur.fetchall()
    print(f"📺 Updating season trailers ({len(seasons)} seasons)...")

    updated = 0
    for i, (media_id, season_no, title) in enumerate(seasons, 1):
        print(f"  [{i}/{len(seasons)}] {title} S{season_no}...", end=" ")
        videos = fetch_season_videos(media_id, season_no)
        trailer_url = get_trailer_url(videos)
        if trailer_url:
            cur.execute(
                "UPDATE Season SET TrailerLink = %s WHERE MediaID = %s AND SeasonNo = %s",
                (trailer_url, media_id, season_no)
            )
            updated += 1
            print(f"✅")
        else:
            print(f"⚠️ No trailer")

    print(f"  → Updated {updated}/{len(seasons)} seasons\n")


def update_studio_details(cur):
    """Update WebsiteURL for all studios"""
    cur.execute("SELECT StudioID, StudioName FROM Studio WHERE WebsiteURL IS NULL")
    studios = cur.fetchall()
    print(f"🏢 Updating studio details ({len(studios)} studios)...")

    updated = 0
    for i, (studio_id, name) in enumerate(studios, 1):
        print(f"  [{i}/{len(studios)}] {name}...", end=" ")
        details = fetch_company_details(studio_id)
        if details and details.get("homepage"):
            cur.execute("UPDATE Studio SET WebsiteURL = %s WHERE StudioID = %s",
                        (details["homepage"], studio_id))
            updated += 1
            print(f"✅")
        else:
            print(f"⚠️ No website")

    print(f"  → Updated {updated}/{len(studios)} studios\n")


def update_episode_stills(cur):
    """Update StillPath and Description for all episodes missing them"""
    cur.execute("""
        SELECT DISTINCT MediaID, SeasonNo FROM Episode 
        WHERE StillPath IS NULL OR Description IS NULL
        ORDER BY MediaID, SeasonNo
    """)
    seasons = cur.fetchall()
    print(f"🖼️ Updating episode stills & descriptions ({len(seasons)} seasons to fetch)...")

    updated = 0
    total_episodes = 0
    for i, (media_id, season_no) in enumerate(seasons, 1):
        print(f"  [{i}/{len(seasons)}] MediaID {media_id} Season {season_no}...", end=" ")
        season_data = fetch_season_details(media_id, season_no)
        if not season_data:
            print("⚠️ Not found")
            continue

        episodes = season_data.get("episodes", [])
        season_updated = 0
        for ep in episodes:
            still_path = ep.get("still_path")
            overview = ep.get("overview")
            ep_no = ep.get("episode_number")
            if ep_no and (still_path or overview):
                cur.execute("""
                    UPDATE Episode 
                    SET StillPath = COALESCE(StillPath, %s),
                        Description = COALESCE(Description, %s)
                    WHERE MediaID = %s AND SeasonNo = %s AND EpisodeNo = %s 
                      AND (StillPath IS NULL OR Description IS NULL)
                """, (still_path, overview, media_id, season_no, ep_no))
                season_updated += cur.rowcount
        
        updated += season_updated
        total_episodes += len(episodes)
        print(f"✅ {season_updated} stills")

    print(f"  → Updated {updated} episode stills across {len(seasons)} seasons\n")


# ══════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════

def main():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    print("=" * 50)
    print("🔄 Updating all missing data from TMDB...")
    print("=" * 50)

    # update_persons(cur)
    # update_movie_trailers(cur)
    # update_season_trailers(cur)
    # update_studio_details(cur)
    update_episode_stills(cur)

    conn.commit()

    print("=" * 50)
    print("✅ All updates complete!")
    print("=" * 50)

    cur.close()
    conn.close()


if __name__ == "__main__":
    main()
