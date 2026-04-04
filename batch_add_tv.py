import psycopg2
import os
import time
from dotenv import load_dotenv

# Import all functions from TVseries_fetcher
from TVseries_fetcher import (
    search_tv, process_single_tv
)

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

# ══════════════════════════════════════════════
# LIST OF TV SHOWS TO ADD
# ══════════════════════════════════════════════

TV_SHOWS = [
    "Game of Thrones", "Breaking Bad", "Stranger Things", "The Walking Dead",
    "The Simpsons", "Friends", "The Office", "Seinfeld", "The Sopranos",
    "Money Heist", "Grey's Anatomy", "Rick and Morty", "The Big Bang Theory",
    "Squid Game", "Black Mirror", "Doctor Who",
    "Star Trek: The Original Series", "Star Trek: The Next Generation",
    "The Crown", "Narcos", "Better Call Saul", "Mad Men", "Lost", "The Wire",
    "Dexter", "House", "Westworld", "Sherlock", "True Detective", "Chernobyl",
    "Vikings", "Ozark", "Peaky Blinders", "Fargo", "The Mandalorian",
    "Avatar: The Last Airbender", "The Flash", "Arrow", "Supernatural",
    "Sons of Anarchy", "Battlestar Galactica", "The X-Files", "ER", "Fringe",
    "The West Wing", "Lost in Space", "24", "Homeland", "Prison Break",
    "The Blacklist", "Brooklyn Nine-Nine", "Castle", "Bones", "Criminal Minds",
    "NCIS", "CSI: Crime Scene Investigation", "Law & Order",
    "Law & Order: Special Victims Unit",
    "Chicago Fire", "Chicago PD", "Chicago Med", "Hawaii Five-0", "Magnum P.I.",
    "The Shield", "The Good Wife", "Suits", "Scandal",
    "How to Get Away with Murder",
    "Boston Legal", "Ally McBeal", "The Practice", "Night Court",
    "WKRP in Cincinnati", "Taxi", "Mork & Mindy", "New Girl",
    "Everybody Loves Raymond", "King of Queens", "Modern Family",
    "Parks and Recreation", "Community", "Curb Your Enthusiasm",
    "Arrested Development", "Happy Endings", "2 Broke Girls", "Family Ties",
    "Growing Pains", "Boy Meets World", "Full House", "Gilligan's Island",
    "Bewitched", "I Love Lucy", "The Honeymooners", "M*A*S*H", "Cheers",
    "Frasier", "The Jeffersons", "All in the Family", "Happy Days",
    "South Park", "Futurama", "SpongeBob SquarePants", "Rugrats",
    "Peppa Pig", "Bluey", "Family Guy", "Bob's Burgers", "Adventure Time",
    "Steven Universe", "Hey Arnold!", "Naruto", "One Piece",
    "Attack on Titan", "Death Note", "Dragon Ball Z",
    "Fullmetal Alchemist: Brotherhood", "Cowboy Bebop",
    "Neon Genesis Evangelion", "My Hero Academia", "Demon Slayer", "Bleach",
    "Black Clover", "Tokyo Ghoul", "Hunter x Hunter", "Mob Psycho 100",
    "Jujutsu Kaisen", "Chainsaw Man", "Spy x Family", "Tokyo Revengers",
    "Fairy Tail", "Soul Eater", "Blue Exorcist", "Dr. Stone",
    "Yu Yu Hakusho", "Kuroko's Basketball", "Food Wars!",
    "Baki the Grappler", "Great Teacher Onizuka", "Clannad",
    "Fruits Basket", "Toradora!", "Your Lie in April", "Anohana",
    "One Punch Man", "Samurai Champloo", "Vision of Escaflowne",
    "Pokémon", "Yu-Gi-Oh!", "Digimon", "Beyblade", "Bakugan",
    "Dragon Ball Super", "Sailor Moon", "Cardcaptor Sakura", "Ranma ½",
    "Lupin III", "Detective Conan", "Monster", "Parasyte", "Steins;Gate",
    "Code Geass", "Hellsing", "Trigun", "Akame ga Kill!",
    "The Witcher", "Wednesday", "The Queen's Gambit", "Bridgerton", "You",
    "Sex Education", "Elite", "Love, Death & Robots", "Sense8",
    "Daredevil", "Jessica Jones", "Luke Cage", "Iron Fist", "The Defenders",
    "Agents of S.H.I.E.L.D.", "Legion", "Torchwood",
    "The Bachelor", "Survivor", "Big Brother", "MasterChef", "Top Chef",
    "Hell's Kitchen", "The Voice", "America's Got Talent",
    "Britain's Got Talent", "RuPaul's Drag Race", "Love Island",
    "Queer Eye", "Keeping Up with the Kardashians", "The Real World",
    "Jersey Shore", "Vanderpump Rules", "Deadliest Catch",
    "Alaska: The Last Frontier", "Pawn Stars", "Storage Wars", "MythBusters",
    "Planet Earth", "Planet Earth II", "Blue Planet",
    "Cosmos: A Spacetime Odyssey", "Life", "Top Gear",
    "Formula 1: Drive to Survive", "Cheer", "Selling Sunset",
    "Bling Empire", "Tiger King", "The Circle", "Too Hot to Handle",
    "Love Is Blind", "Floor Is Lava", "Big Mouth", "Archer",
    "King of the Hill", "Beavis and Butt-Head", "Tiny Toon Adventures",
    "Animaniacs", "Batman: The Animated Series", "Teen Titans",
    "Justice League", "Young Justice",
    "Miraculous: Tales of Ladybug & Cat Noir", "Winx Club",
    "Sailor Moon Crystal", "Beyblade Burst", "Bakugan Battle Brawlers",
]


def main():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    total = len(TV_SHOWS)
    success = 0
    skipped = 0
    failed = 0
    failed_names = []

    print("=" * 60)
    print(f"📺 BATCH ADD TV SHOWS — {total} shows to process")
    print("=" * 60)

    for i, show_name in enumerate(TV_SHOWS, 1):
        print(f"\n{'─'*60}")
        print(f"[{i}/{total}] 🔍 Searching: \"{show_name}\"")

        try:
            results = search_tv(show_name)

            if not results:
                print(f"   ⚠️ No results found for \"{show_name}\", skipping...")
                skipped += 1
                continue

            # Pick the first (best) result
            tv = results[0]
            tv_id = tv["id"]
            tv_title = tv.get("name", show_name)
            year = tv.get("first_air_date", "")[:4] or "????"
            print(f"   ✓ Found: {tv_title} ({year}) — TMDB ID: {tv_id}")

            if process_single_tv(cur, tv_id, tv_title, fetch_seasons=True):
                success += 1
                # Commit after each show so we don't lose progress
                conn.commit()
            else:
                failed += 1
                failed_names.append(show_name)
                conn.rollback()

        except Exception as e:
            print(f"   ❌ Error: {e}")
            failed += 1
            failed_names.append(show_name)
            conn.rollback()

        # Small delay to respect TMDB rate limit (40 req / 10 sec)
        time.sleep(0.3)

    cur.close()
    conn.close()

    # Summary
    print("\n" + "=" * 60)
    print("📊 BATCH ADD COMPLETE — SUMMARY")
    print("=" * 60)
    print(f"   ✅ Successfully added: {success}")
    print(f"   ⚠️ Skipped (not found): {skipped}")
    print(f"   ❌ Failed:              {failed}")
    if failed_names:
        print(f"\n   Failed shows:")
        for name in failed_names:
            print(f"      • {name}")
    print("=" * 60)


if __name__ == "__main__":
    main()
