import { useState, useRef, useEffect } from 'react'
import { Link, Route, Routes, Navigate, useNavigate } from 'react-router-dom'
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
import PersonsPage from './pages/PersonsPage'
import BlogsPage from './pages/BlogsPage'
import BlogDetailPage from './pages/BlogDetailPage'
import CreateBlogPage from './pages/CreateBlogPage'
import EditBlogPage from './pages/EditBlogPage'
import ListsPage from './pages/ListsPage'
import ListDetailPage from './pages/ListDetailPage'
import { clearStoredAuth, getStoredAuth, setStoredAuth } from './utils/auth'

function App() {
  const [authUser, setAuthUser] = useState(() => getStoredAuth().user)
  const navigate = useNavigate()
  const [category, setCategory] = useState('all')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const dropdownOptions = [
    { value: 'all', label: 'All' },
    { value: 'movies', label: 'Movies' },
    { value: 'tvshows', label: 'TV Shows' },
    { value: 'people', label: 'Celebrities' },
  ]

  const handleAuthSuccess = ({ token, user }) => {
    setStoredAuth(token, user)
    setAuthUser(user)
  }

  const handleLogout = () => {
    clearStoredAuth()
    setAuthUser(null)
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const query = formData.get('q')
    if (query && query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query)}&type=${category}`)
    }
  }

  return (
    <div className="app">
      <header className="hero">
        <h1 className="brand-logo"><Link to="/">Cholochitro Bhandar</Link></h1>
        
        <form className="header-search" onSubmit={handleSearchSubmit}>
          <input type="text" name="q" placeholder="Explore movies, series, celebrities..." required />
          
          <div className="custom-dropdown" ref={dropdownRef}>
            <div className="custom-dropdown-selected" onClick={() => setDropdownOpen(!dropdownOpen)}>
              {dropdownOptions.find(o => o.value === category)?.label}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`chevron ${dropdownOpen ? 'open' : ''}`}>
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
            
            {dropdownOpen && (
              <div className="custom-dropdown-menu">
                {dropdownOptions.map((opt) => (
                  <div 
                    key={opt.value} 
                    className={`custom-dropdown-item ${category === opt.value ? 'active' : ''}`}
                    onClick={() => {
                      setCategory(opt.value)
                      setDropdownOpen(false)
                    }}
                  >
                    {opt.label}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button type="submit" aria-label="Search">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </button>
        </form>

        <nav className="nav">
          <Link to="/blogs" className="nav-btn">Blogs</Link>
          <Link to="/lists" className="nav-btn">Popular Lists</Link>
          {authUser ? (
            <div className="nav-auth-group">
              <span className="nav-user">Hi, {authUser.fullName}</span>
              <button className="nav-logout" type="button" onClick={handleLogout}>Logout</button>
            </div>
          ) : (
            <div className="nav-auth-group">
              <Link to="/signup" className="nav-btn auth-btn">Sign Up</Link>
              <Link to="/login" className="nav-btn auth-btn primary">Login</Link>
            </div>
          )}
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/signup" element={<SignupPage onAuthSuccess={handleAuthSuccess} />} />
        <Route path="/login" element={<LoginPage onAuthSuccess={handleAuthSuccess} />} />
        <Route path="/movies" element={<MoviesPage />} />
        <Route path="/movies/:id" element={<MovieDetailsPage />} />
        <Route path="/celebrities" element={<PersonsPage />} />
        <Route path="/persons/:id" element={<PersonDetailsPage />} />
        <Route path="/tvshows" element={<TVShowsPage />} />
        <Route path="/tvshows/:id" element={<TVShowDetailsPage />} />
        <Route path="/tvshows/:id/seasons" element={<TVShowSeasonsPage />} />
        <Route path="/blogs" element={<BlogsPage />} />
        <Route path="/lists" element={<ListsPage />} />
        <Route path="/lists/:id" element={<ListDetailPage />} />
        <Route path="/blogs/new" element={authUser ? <CreateBlogPage /> : <Navigate to="/login" />} />
        <Route path="/blogs/:id/edit" element={authUser ? <EditBlogPage /> : <Navigate to="/login" />} />
        <Route path="/blogs/:id" element={<BlogDetailPage />} />
        <Route path="/search" element={<SearchPage />} />
      </Routes>
    </div>
  )
}

export default App
