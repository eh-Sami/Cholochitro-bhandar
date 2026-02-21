import { Link, Route, Routes } from 'react-router-dom'
import './App.css'
import HomePage from './pages/HomePage'
import MoviesPage from './pages/MoviesPage'
import MovieDetailsPage from './pages/MovieDetailsPage'
import PersonDetailsPage from './pages/PersonDetailsPage'
import SearchPage from './pages/SearchPage'
import TVShowsPage from './pages/TVShowsPage'
import TVShowDetailsPage from './pages/TVShowDetailsPage'
import TVShowSeasonsPage from './pages/TVShowSeasonsPage'

function App() {
  return (
    <div className="app">
      <header className="hero">
        <h1><Link to="/">Cholochitro Bhandar</Link></h1>
        <p>IMDb-style movie & TV discovery for your course project</p>
        <nav className="nav">
          <Link to="/movies">Movies</Link>
          <Link to="/tvshows">TV Shows</Link>
          <Link to="/search">Search</Link>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/movies" element={<MoviesPage />} />
        <Route path="/movies/:id" element={<MovieDetailsPage />} />
        <Route path="/persons/:id" element={<PersonDetailsPage />} />
        <Route path="/tvshows" element={<TVShowsPage />} />
        <Route path="/tvshows/:id" element={<TVShowDetailsPage />} />
        <Route path="/tvshows/:id/seasons" element={<TVShowSeasonsPage />} />
        <Route path="/search" element={<SearchPage />} />
      </Routes>
    </div>
  )
}

export default App
