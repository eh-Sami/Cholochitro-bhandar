import { useEffect, useMemo, useState } from 'react'
import MoviesList from '../components/MoviesList'
import TopTenChart from '../components/TopTenChart'

const API_BASE = 'http://localhost:3000'

function MoviesPage() {
    const [mode, setMode] = useState('top')
    const [genres, setGenres] = useState([])
    const [selectedGenre, setSelectedGenre] = useState('')

    useEffect(() => {
        const fetchGenres = async () => {
            try {
                const response = await fetch(`${API_BASE}/genres?type=Movie`)
                if (!response.ok) return
                const data = await response.json()
                const genreRows = data.data || []
                setGenres(genreRows)
                if (genreRows.length > 0) {
                    setSelectedGenre(genreRows[0].genrename)
                }
            } catch {
                setGenres([])
            }
        }

        fetchGenres()
    }, [])

    const queryParams = useMemo(() => {
        if (mode === 'year') {
            return { period: 'year', sort: 'rating' }
        }
        if (mode === 'genre' && selectedGenre) {
            return { genre: selectedGenre, sort: 'rating' }
        }
        return { sort: 'rating' }
    }, [mode, selectedGenre])

    const sectionTitle = useMemo(() => {
        if (mode === 'year') return 'Movies Released This Year'
        if (mode === 'genre') return selectedGenre ? `Top ${selectedGenre} Movies` : 'Top Movies by Genre'
        return 'Top Ranked Movies'
    }, [mode, selectedGenre])

    return (
        <main className="page">
            <h2>Movies</h2>

            <section className="category-panel">
                <div className="category-tabs">
                    <button
                        className={mode === 'top' ? 'tab active' : 'tab'}
                        onClick={() => setMode('top')}
                        type="button"
                    >
                        Top Ranked
                    </button>
                    <button
                        className={mode === 'year' ? 'tab active' : 'tab'}
                        onClick={() => setMode('year')}
                        type="button"
                    >
                        Released This Year
                    </button>
                    <button
                        className={mode === 'genre' ? 'tab active' : 'tab'}
                        onClick={() => setMode('genre')}
                        type="button"
                    >
                        By Genre
                    </button>
                </div>

                {mode === 'genre' && (
                    <div className="genre-picker">
                        <label htmlFor="movie-genre">Choose genre:</label>
                        <select
                            id="movie-genre"
                            value={selectedGenre}
                            onChange={(event) => setSelectedGenre(event.target.value)}
                        >
                            {genres.map((genre) => (
                                <option key={genre.genreid} value={genre.genrename}>
                                    {genre.genrename}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </section>

            {mode === 'top' ? (
                <TopTenChart
                    mediaType="movies"
                    title="Top 200 Movies (20 per page)"
                    maxItems={200}
                    perPage={20}
                />
            ) : (
                <MoviesList
                    sectionTitle={sectionTitle}
                    limit={24}
                    queryParams={queryParams}
                    emptyMessage="No movies found in this category."
                />
            )}
        </main>
    )
}

export default MoviesPage
