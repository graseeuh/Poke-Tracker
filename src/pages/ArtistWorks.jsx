import { useEffect, useState } from 'react'
import { fetchCardsByArtist } from '../lib/pokemonApi'

export default function ArtistWorks({ artist, onBack }) {
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    fetchCardsByArtist(artist)
      .then(setCards)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [artist])

  return (
    <div className="find-sets">
      <header className="find-sets-header">
        <button className="back-nav-button" onClick={onBack}>&larr; Back to card</button>
        <h1>Cards illustrated by {artist}</h1>
        <p className="status-line">Pulled live from the Pokemon TCG API, across all sets.</p>
      </header>

      {loading && <p className="status">Loading {artist}'s work...</p>}
      {error && <p className="error">{error}</p>}
      {!loading && cards.length === 0 && !error && (
        <p className="status">No other cards found for this illustrator.</p>
      )}

      <div className="card-grid">
        {cards.map((card) => (
          <div key={card.id} className="card-tile artist-card-tile">
            <img src={card.images?.large ?? card.images?.small} alt={card.name} loading="lazy" />
            <span>
              {card.name}
              <br />
              <small className="text-muted">{card.set?.name}</small>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
