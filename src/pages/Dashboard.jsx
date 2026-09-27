import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Dashboard({ session, onSelectSet, onFindSets }) {
  const [sets, setSets] = useState([])
  const [progress, setProgress] = useState({}) // { [setId]: { owned, total } }
  const [favoriteIds, setFavoriteIds] = useState(new Set())
  const [viewMode, setViewMode] = useState('binder') // 'binder' | 'favorites'
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadSets()
  }, [])

  async function loadSets() {
    setLoading(true)
    setError('')

    const [favResp, ownedResp, cardsResp] = await Promise.all([
      supabase.from('favorite_sets').select('set_id').eq('user_id', session.user.id),
      supabase
        .from('user_cards')
        .select('card_id')
        .eq('user_id', session.user.id)
        .eq('owned', true),
      supabase.from('cards').select('id, set_id'),
    ])

    if (favResp.error) {
      setError(favResp.error.message)
      setLoading(false)
      return
    }
    if (ownedResp.error) {
      setError(ownedResp.error.message)
      setLoading(false)
      return
    }

    const nextFavoriteIds = new Set((favResp.data || []).map((r) => r.set_id))
    const ownedCardIds = new Set((ownedResp.data || []).map((r) => r.card_id))

    const totals = {}
    for (const card of cardsResp.data || []) {
      totals[card.set_id] = totals[card.set_id] || { owned: 0, total: 0 }
      totals[card.set_id].total += 1
      if (ownedCardIds.has(card.id)) totals[card.set_id].owned += 1
    }

    // The Binder shows sets with actual progress; Favorites is a separate
    // bookmark you can flip to even for a set you haven't started yet.
    // Load metadata for the union of both so switching views is instant.
    const trackedIds = Object.keys(totals).filter((setId) => totals[setId].owned > 0)
    const relevantIds = Array.from(new Set([...trackedIds, ...nextFavoriteIds]))

    if (relevantIds.length === 0) {
      setSets([])
      setProgress({})
      setFavoriteIds(nextFavoriteIds)
      setLoading(false)
      return
    }

    const { data: setsData, error: setsError } = await supabase
      .from('sets')
      .select('*')
      .in('id', relevantIds)
      .order('release_date', { ascending: true })

    if (setsError) {
      setError(setsError.message)
      setLoading(false)
      return
    }

    setSets(setsData || [])
    setProgress(totals)
    setFavoriteIds(nextFavoriteIds)
    setLoading(false)
  }

  async function toggleFavorite(setId) {
    const isFavorite = favoriteIds.has(setId)
    setError('')
    try {
      if (isFavorite) {
        const { error: delError } = await supabase
          .from('favorite_sets')
          .delete()
          .eq('user_id', session.user.id)
          .eq('set_id', setId)
        if (delError) throw delError
        setFavoriteIds((prev) => {
          const next = new Set(prev)
          next.delete(setId)
          return next
        })
      } else {
        const { error: insError } = await supabase
          .from('favorite_sets')
          .insert({ user_id: session.user.id, set_id: setId })
        if (insError) throw insError
        setFavoriteIds((prev) => new Set(prev).add(setId))
      }
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <p className="status">Loading sets...</p>
  if (error) return <p className="error">{error}</p>

  const trackedSets = sets.filter((s) => (progress[s.id]?.owned || 0) > 0)
  const visibleSets = viewMode === 'favorites' ? sets.filter((s) => favoriteIds.has(s.id)) : trackedSets

  const totalOwned = trackedSets.reduce((sum, s) => sum + (progress[s.id]?.owned || 0), 0)
  const totalCards = trackedSets.reduce((sum, s) => sum + (progress[s.id]?.total || 0), 0)

  return (
    <div className="dashboard">
      <header className="dashboard-hero">
        <div>
          <h1 className="dashboard-title">
            Your <span className="hero-gradient-text">Binder</span>
          </h1>
          <p className="dashboard-subtitle">Every set you're chasing, all in one place.</p>
        </div>
        <button className="dashboard-browse-cta" onClick={onFindSets}>
          Browse all 2026 sets &rarr;
        </button>
      </header>

      {trackedSets.length > 0 && (
        <div className="binder-stats">
          <div className="binder-stat binder-stat-cards">
            <span className="binder-stat-value">{totalOwned}</span>
            <span className="binder-stat-label">cards collected</span>
          </div>
          <div className="binder-stat binder-stat-sets">
            <span className="binder-stat-value">{trackedSets.length}</span>
            <span className="binder-stat-label">sets tracked</span>
          </div>
          <div className="binder-stat binder-stat-pct">
            <span className="binder-stat-value">
              {totalCards ? Math.round((totalOwned / totalCards) * 100) : 0}%
            </span>
            <span className="binder-stat-label">overall complete</span>
          </div>
        </div>
      )}

      <div className="binder-view-toggle" role="tablist">
        <button
          role="tab"
          aria-selected={viewMode === 'binder'}
          className={viewMode === 'binder' ? 'active' : ''}
          onClick={() => setViewMode('binder')}
        >
          My Binder{trackedSets.length > 0 ? ` (${trackedSets.length})` : ''}
        </button>
        <button
          role="tab"
          aria-selected={viewMode === 'favorites'}
          className={viewMode === 'favorites' ? 'active' : ''}
          onClick={() => setViewMode('favorites')}
        >
          Favorites{favoriteIds.size > 0 ? ` (${favoriteIds.size})` : ''}
        </button>
      </div>

      {visibleSets.length === 0 && viewMode === 'binder' && (
        <p className="status">
          You haven't marked any cards owned yet. Click <strong>Browse all 2026 sets</strong>{' '}
          above, open a set, and mark a card owned to start tracking it here.
        </p>
      )}

      {visibleSets.length === 0 && viewMode === 'favorites' && (
        <p className="status">
          No favorites yet. Star a set from the search page (or the &#9734; on a card below) to
          pin it here, whether or not you've started collecting it.
        </p>
      )}

      <div className="binder-grid">
        {visibleSets.map((set, i) => {
          const p = progress[set.id] || { owned: 0, total: set.total }
          const pct = p.total ? Math.round((p.owned / p.total) * 100) : 0
          const isFavorite = favoriteIds.has(set.id)
          return (
            <div
              key={set.id}
              role="button"
              tabIndex={0}
              className={`binder-set-card binder-set-card-${i % 4}`}
              onClick={() => onSelectSet(set.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onSelectSet(set.id)
              }}
            >
              <button
                className={`favorite-star favorite-star-left ${isFavorite ? 'favorited' : ''}`}
                title={isFavorite ? 'Unfavorite' : 'Favorite'}
                onClick={(e) => {
                  e.stopPropagation()
                  toggleFavorite(set.id)
                }}
              >
                {isFavorite ? '★' : '☆'}
              </button>
              <span className="binder-set-pct">{pct}%</span>
              <div className="set-logo">
                {set.logo_url && <img src={set.logo_url} alt={`${set.name} logo`} loading="lazy" />}
              </div>
              <h3>
                {set.symbol_url && (
                  <img className="set-symbol" src={set.symbol_url} alt="" loading="lazy" />
                )}
                {set.name}
              </h3>
              <p className="set-series">{set.series}</p>
              <div className="progress-bar binder-progress-bar">
                <div className="progress-fill" style={{ width: `${pct}%` }} />
              </div>
              <p className="progress-label">
                {p.owned} / {p.total} owned
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
