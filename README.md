# 🎬 Cholochitro Bhandar

A full-stack IMDB-inspired movie and TV show database application. Browse movies, TV series, actors, write reviews, create watchlists, and engage with the community through blogs and comments.

## ✨ Features

### 🎥 Media Browsing
- **Movies** — Browse, filter by genre/year/rating, and sort by rating, year, or title
- **TV Shows** — Explore series with full season & episode breakdowns, filter by ongoing status
- **Search** — Full-text search across movie/show titles and descriptions with relevance ranking
- **Person Profiles** — View actor/director biographies, filmographies, and photos

### ⭐ Reviews & Ratings
- **Movie Reviews** — Rate movies (1–10) with text reviews and spoiler flags
- **Episode Reviews** — Per-episode ratings that cascade up to season and series averages
- **Weighted Rating System** — Bayesian-style weighted ratings

### 📝 Social Features
- **Blogs** — Write blog posts with rich mention support (`@media`, `@person`, `@list`)
- **Nested Comments** — Reddit-style threaded comments on blog posts with mention support
- **Voting** — Upvote/downvote system for blogs and comments
- **Watchlists** — Create public or private lists, add/remove movies and shows

### 🔐 Authentication
- JWT-based authentication with signup/login
- Password hashing with bcrypt
- Protected routes for reviews, blogs, lists, and voting

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, React Router 7, Vite 7, Lucide Icons |
| **Backend** | Node.js, Express 5 |
| **Database** | PostgreSQL (Neon Serverless) |
| **Auth** | JWT + bcrypt |
| **Data Source** | TMDB API (via Python fetcher scripts) |

## 📁 Project Structure

```
Cholochitro-bhandar/
├── server.js              # Express API server (~2900 lines, all endpoints)
├── projectSchema.sql      # Database schema
├── package.json           # Backend dependencies
│
├── frontend/              # React + Vite SPA
│   ├── src/
│   │   ├── pages/         # Page components (Home, Movies, TVShows, Blogs, etc.)
│   │   ├── components/    # Reusable components (Reviews, Lists, Charts, Mentions)
│   │   ├── utils/         # Helper utilities
│   │   ├── App.jsx        # Router + layout
│   │   └── App.css        # Global styles
│   └── package.json
│
├── fetchers/              # Python scripts to populate DB from TMDB
│   ├── movie_fetcher.py
│   ├── TVseries_fetcher.py
│   ├── batch_add_tv.py
│   └── update_persons.py
│
└── migrations/            # Incremental schema migrations
```

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18+)
- **Python 3** (for data fetchers only)
- **PostgreSQL** database (or [Neon](https://neon.tech) account)

### 1. Clone the repository
```bash
git clone https://github.com/eh-Sami/Cholochitro-bhandar.git
cd Cholochitro-bhandar
```

### 2. Set up environment variables
Create a `.env` file in the project root:
```env
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
JWT_SECRET=your-secret-key
PORT=3000
```

### 3. Initialize the database
Run the schema file against your PostgreSQL database:
```bash
psql $DATABASE_URL -f projectSchema.sql
```

### 4. Install dependencies & run

**Backend:**
```bash
npm install
npm start
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

The API server runs on `http://localhost:3000` and the frontend dev server on `http://localhost:5173`.

## 📡 API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/auth/signup` | Create account | — |
| `POST` | `/auth/login` | Login | — |
| `GET` | `/movies` | List movies (paginated, filterable) | — |
| `GET` | `/movies/:id` | Movie details with cast, crew, studios | — |
| `GET` | `/tvshows` | List TV shows (paginated, filterable) | — |
| `GET` | `/tvshows/:id` | TV show details | — |
| `GET` | `/tvshows/:id/seasons` | Seasons & episodes | — |
| `GET` | `/search?q=` | Search media | — |
| `GET` | `/genres` | List genres | — |
| `GET` | `/actors/top` | Top actors by filmography size | — |
| `GET` | `/persons/search?q=` | Search persons | — |
| `GET` | `/persons/:id` | Person details | — |
| `GET` | `/persons/:id/filmography` | Person's filmography | — |
| `GET/POST` | `/reviews/media/:id` | Movie reviews | 🔒 POST |
| `GET/POST` | `/reviews/episode/:id/:s/:e` | Episode reviews | 🔒 POST |
| `GET/POST` | `/lists` | User watchlists | 🔒 POST |
| `GET/PUT/DELETE` | `/lists/:id` | Manage a list | 🔒 |
| `POST/DELETE` | `/lists/:id/items` | Add/remove list items | 🔒 |
| `GET/POST` | `/blogs` | Blog posts | 🔒 POST |
| `GET/PUT/DELETE` | `/blogs/:id` | Manage a blog | 🔒 |
| `POST` | `/blogs/:id/upvote` | Upvote blog | 🔒 |
| `POST` | `/blogs/:id/downvote` | Downvote blog | 🔒 |
| `GET/POST` | `/blogs/:id/comments` | Blog comments | 🔒 POST |
| `PUT/DELETE` | `/comments/:id` | Manage a comment | 🔒 |
| `POST` | `/comments/:id/upvote` | Upvote comment | 🔒 |
| `POST` | `/comments/:id/downvote` | Downvote comment | 🔒 |

## 📜 License

ISC
