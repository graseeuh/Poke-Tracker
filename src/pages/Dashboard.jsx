import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { fetch2026Sets } from '../lib/pokemonApi'

export default function Dashboard({ session, onSelectSet, onFindSets }) {
  const [sets, setSets] = useState([])
  const [images, setImages] = useState({}) // { [setId]: { logo, symbol } }
  const [progress, setProgress] = useState({}) // { [setId]: { owned, total } }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadSets()
  }, [])

  async function loadSets() {
    setLoading(true)
    setError('')

    const { data: favData, error: favError } = await supabase
      .from('favorite_sets')
      .select('set_id')
      .eq('user_id', session.user.id)

    if (favError) {
      setError(favError.message)
      setLoading(false)
      return
    }

    const favoriteIds = (favData || []).map((r) => r.set_id)
    if (favoriteIds.length === 0) {
      setSets([])
      setProgress({})
      setLoading(false)
      return
    }

    const { data: setsData, error: setsError } = await supabase
      .from('sets')
      .select('*')
      .in('id', favoriteIds)
      .order('release_date', { ascending: true })

    if (setsError) {
      setError(setsError.message)
      setLoading(false)
      return
    }

    setSets(setsData || [])

    try {
      const apiSets = await fetch2026Sets()
      const imageMap = {}
      for (const s of apiSets) {
        imageMap[s.id] = s.images
      }
      setImages(imageMap)
    } catch {
      // Live API is flaky sometimes; the dashboard still works without logos.
    }

    const { data: cardsData } = await supabase.from('cards').select('id, set_id')
    const { data: ownedData } = await supabase
      .from('user_cards')
      .select('card_id')
      .eq('user_id', session.user.id)
      .eq('owned', true)

    const ownedSet = new Set((ownedData || []).map((r) => r.card_id))
    const totals = {}
    for (const card of cardsData || []) {
      totals[card.set_id] = totals[card.set_id] || { owned: 0, total: 0 }
      totals[card.set_id].total += 1
      if (ownedSet.has(card.id)) {
        totals[card.set_id].owned += 1
      }
    }
    setProgress(totals)
    setLoading(false)
  }

  if (loading) return <p className="status">Loading sets...</p>
  if (error) return <p className="error">{error}</p>

  const totalOwned = Object.values(progress).reduce((sum, p) => sum + p.owned, 0)
  const totalCards = Object.values(progress).reduce((sum, p) => sum + p.total, 0)

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Your Binder</h1>
        <button onClick={onFindSets}>Browse all 2026 sets</button>
      </header>

      {sets.length > 0 && (
        <div className="binder-stats">
          <div className="binder-stat">
            <span className="binder-stat-value">{totalOwned}</span>
            <span className="binder-stat-label">cards collected</span>
          </div>
          <div className="binder-stat">
            <span className="binder-stat-value">{sets.length}</span>
            <span className="binder-stat-label">sets tracked</span>
          </div>
          <div className="binder-stat">
            <span className="binder-stat-value">
              {totalCards ? Math.round((totalOwned / totalCards) * 100) : 0}%
            </span>
            <span className="binder-stat-label">overall complete</span>
          </div>
        </div>
      )}

      {sets.length === 0 && (
        <p className="status">
          You haven't favorited any sets yet. Click <strong>Browse all 2026 sets</strong> above
          to find one to track.
        </p>
      )}

      <div className="set-grid">
        {sets.map((set) => {
          const p = progress[set.id] || { owned: 0, total: set.total }
          const pct = p.total ? Math.round((p.owned / p.total) * 100) : 0
          return (
            <button key={set.id} className="set-card" onClick={() => onSelectSet(set.id)}>
              <div className="set-logo">
                {images[set.id]?.logo && (
                  <img src={images[set.id].logo} alt={`${set.name} logo`} loading="lazy" />
                )}
              </div>
              <h3>
                {images[set.id]?.symbol && (
                  <img className="set-symbol" src={images[set.id].symbol} alt="" loading="lazy" />
                )}
                {set.name}
              </h3>
              <p className="set-series">{set.series}</p>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${pct}%` }} />
              </div>
              <p className="progress-label">
                {p.owned} / {p.total} ({pct}%)
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
