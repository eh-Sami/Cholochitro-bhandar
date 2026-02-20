import { useEffect, useMemo, useState } from 'react'
import TopTenChart from '../components/TopTenChart'
import TVShowsList from '../components/TVShowsList'

const API_BASE = 'http://localhost:3000'

function TVShowsPage() {
    const [mode, setMode] = useState('top')
    const [genres, setGenres] = useState([])
    const [selectedGenre, setSelectedGenre] = useState('')

    useEffect(() => {
        const fetchGenres = async () => {
            try {
                const response = await fetch(`${API_BASE}/genres?type=TVSeries`)
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
        if (mode === 'ongoing') {
            return { ongoing: 'true', sort: 'rating' }
        }
        if (mode === 'genre' && selectedGenre) {
            return { genre: selectedGenre, sort: 'rating' }
        }
        return { sort: 'rating' }
    }, [mode, selectedGenre])

    const sectionTitle = useMemo(() => {
        if (mode === 'ongoing') return 'Top Ongoing Series'
        if (mode === 'genre') return selectedGenre ? `Top ${selectedGenre} Series` : 'Top Series by Genre'
        return 'Top Ranked Series'
    }, [mode, selectedGenre])

    return (
        <main className="page">
            <h2>TV Shows</h2>

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
                        className={mode === 'ongoing' ? 'tab active' : 'tab'}
                        onClick={() => setMode('ongoing')}
                        type="button"
                    >
                        Ongoing Series
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
                        <label htmlFor="series-genre">Choose genre:</label>
                        <select
                            id="series-genre"
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
                    mediaType="series"
                    title="Top 200 Series (20 per page)"
                    maxItems={200}
                    perPage={20}
                />
            ) : (
                <TVShowsList
                    sectionTitle={sectionTitle}
                    limit={24}
                    queryParams={queryParams}
                    emptyMessage="No series found in this category."
                />
            )}
        </main>
    )
}

export default TVShowsPage
