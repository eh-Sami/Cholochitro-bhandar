import { useState } from 'react'
import { Link, Route, Routes } from 'react-router-dom'
import './App.css'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import MoviesPage from './pages/MoviesPage'
import MovieDetailsPage from './pages/MovieDetailsPage'
import PersonDetailsPage from './pages/PersonDetailsPage'
import SearchPage from './pages/SearchPage'
import SignupPage from './pages/SignupPage'
import TVShowsPage from './pages/TVShowsPage'
import TVShowDetailsPage from './pages/TVShowDetailsPage'
import TVShowSeasonsPage from './pages/TVShowSeasonsPage'
import { clearStoredAuth, getStoredAuth, setStoredAuth } from './utils/auth'

function App() {
  const [authUser, setAuthUser] = useState(() => getStoredAuth().user)

  const handleAuthSuccess = ({ token, user }) => {
    setStoredAuth(token, user)
    setAuthUser(user)
  }

  const handleLogout = () => {
    clearStoredAuth()
    setAuthUser(null)
  }

  return (
    <div className="app">
      <header className="hero">
        <h1><Link to="/">Cholochitro Bhandar</Link></h1>
        <p>IMDb-style movie & TV discovery</p>
        <nav className="nav">
          <Link to="/movies">Movies</Link>
          <Link to="/tvshows">TV Shows</Link>
          <Link to="/search">Search</Link>
          {authUser ? (
            <>
              <span className="nav-user">Hi, {authUser.fullName}</span>
              <button className="nav-logout" type="button" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/signup">Sign Up</Link>
              <Link to="/login">Login</Link>
            </>
          )}
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/signup" element={<SignupPage onAuthSuccess={handleAuthSuccess} />} />
        <Route path="/login" element={<LoginPage onAuthSuccess={handleAuthSuccess} />} />
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
