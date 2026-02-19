import { Link } from 'react-router-dom'
import MoviesList from '../components/MoviesList'
import TopActorsPreview from '../components/TopActorsPreview'
import TVShowsList from '../components/TVShowsList'

function HomePage() {
    return (
        <main className="home-page">
            <section className="home-hero">
                <div className="home-hero-content">
                    <span className="badge">Your Movie Database</span>
                    <h2>Discover movies and TV shows like IMDb</h2>
                    <p>
                        Explore titles, ratings, casts, and details from your own project database.
                        Built for your course demo with a clean, modern browsing experience.
                    </p>
                    <div className="hero-actions">
                        <Link className="btn btn-primary" to="/movies">Browse Movies</Link>
                        <Link className="btn btn-secondary" to="/tvshows">Browse TV Shows</Link>
                        <Link className="btn btn-ghost" to="/search">Search Titles</Link>
                    </div>
                </div>
            </section>

            <section className="home-section">
                <div className="section-head">
                    <h3>Top Movies Right Now</h3>
                    <Link to="/movies">View all</Link>
                </div>
                <MoviesList sectionTitle="" limit={8} queryParams={{ sort: 'rating' }} />
            </section>

            <section className="home-section">
                <div className="section-head">
                    <h3>Top Series Right Now</h3>
                    <Link to="/tvshows">View all</Link>
                </div>
                <TVShowsList sectionTitle="" limit={8} queryParams={{ sort: 'rating' }} />
            </section>

            <section className="home-section">
                <TopActorsPreview limit={8} />
            </section>
        </main>
    )
}

export default HomePage
