import { Link } from 'react-router-dom'
import MoviesList from '../components/MoviesList'
import PublicListsPreview from '../components/PublicListsPreview'
import TopActorsPreview from '../components/TopActorsPreview'
import TVShowsList from '../components/TVShowsList'

function HomePage() {
    return (
        <main className="home-page">
            <section className="home-hero premium-hero">
                <div className="home-hero-content text-center">
                    <h1 className="hero-title">
                        Discover your favorite Movies, TV Shows, and Celebrities in <span className="brand-highlight">Cholochitro Bhandar.</span>
                    </h1>
                </div>
            </section>

            <section className="home-section full-width-section">
                <div className="premium-section-head">
                    <Link to="/movies" className="premium-section-link">
                        <h2>TOP MOVIES</h2>
                        <svg className="interactive-arrow" xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </Link>
                </div>
                <MoviesList sectionTitle="" limit={18} queryParams={{ sort: 'rating' }} />
            </section>

            <section className="home-section full-width-section">
                <div className="premium-section-head">
                    <Link to="/tvshows" className="premium-section-link">
                        <h2>TOP TV SHOWS</h2>
                        <svg className="interactive-arrow" xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </Link>
                </div>
                <TVShowsList sectionTitle="" limit={18} queryParams={{ sort: 'rating' }} />
            </section>

            <section className="home-section full-width-section">
                <div className="premium-section-head">
                    <Link to="/celebrities" className="premium-section-link">
                        <h2>TOP CELEBRITIES</h2>
                        <svg className="interactive-arrow" xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </Link>
                </div>
                <TopActorsPreview sectionTitle="" limit={18} />
            </section>
        </main>
    )
}

export default HomePage
