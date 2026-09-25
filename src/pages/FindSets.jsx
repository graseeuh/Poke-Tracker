import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { fetch2026Sets } from '../lib/pokemonApi'
import { ensureSetSeeded } from '../lib/seedSet'

export default function FindSets({ session, onGoToTrackedSets, onRequireLogin, onViewSet }) {
  const [sets, setSets] = useState([])
  const [favoriteIds, setFavoriteIds] = useState(new Set())
  const [pendingId, setPendingId] = useState(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [stats, setStats] = useState(null)

  useEffect(() => {
    loadSets()
    loadStats()
  }, [session])

  async function loadStats() {
    const [cardsCount, setsCount, artistRows] = await Promise.all([
      supabase.from('cards').select('id', { count: 'exact', head: true }),
      supabase.from('sets').select('id', { count: 'exact', head: true }),
      supabase.from('cards').select('artist').not('artist', 'is', null),
    ])
    const artistCount = new Set((artistRows.data || []).map((r) => r.artist)).size
    setStats({
      cards: cardsCount.count || 0,
      sets: setsCount.count || 0,
      artists: artistCount,
    })
  }

  async function loadSets() {
    setLoading(true)
    setError('')
    try {
      const [apiSets, favResp] = await Promise.all([
        fetch2026Sets(),
        session
          ? supabase.from('favorite_sets').select('set_id').eq('user_id', session.user.id)
          : Promise.resolve({ data: [] }),
      ])
      setSets(apiSets)
      setFavoriteIds(new Set((favResp.data || []).map((r) => r.set_id)))
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  async function toggleFavorite(apiSet) {
    if (!session) {
      onRequireLogin()
      return
    }

    const isFavorite = favoriteIds.has(apiSet.id)
    setPendingId(apiSet.id)
    setError('')

    try {
      if (isFavorite) {
        const { error: delError } = await supabase
          .from('favorite_sets')
          .delete()
          .eq('user_id', session.user.id)
          .eq('set_id', apiSet.id)
        if (delError) throw delError
        setFavoriteIds((prev) => {
          const next = new Set(prev)
          next.delete(apiSet.id)
          return next
        })
      } else {
        await ensureSetSeeded(apiSet)
        const { error: insError } = await supabase
          .from('favorite_sets')
          .insert({ user_id: session.user.id, set_id: apiSet.id })
        if (insError) throw insError
        setFavoriteIds((prev) => new Set(prev).add(apiSet.id))
      }
    } catch (err) {
      setError(err.message)
    }
    setPendingId(null)
  }

  const filteredSets = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return sets
    return sets.filter((s) => s.name.toLowerCase().includes(q))
  }, [sets, search])

  return (
    <div className="find-sets">
      <header className="hero">
        <div className="hero-callouts">
          <div className="hero-callout hero-callout-1">
            <span className="hero-callout-tag">NEW</span>
            <strong>Rarity showcases</strong>
            <span>Chase cards get their own themed section, every set.</span>
          </div>
          <div className="hero-callout hero-callout-2">
            <span className="hero-callout-tag">TRACKED</span>
            <strong>Card-by-card progress</strong>
            <span>Mark what you own and watch your binder fill in.</span>
          </div>
        </div>

        <div className="hero-content">
          <h1 className="hero-title">
            TRACK EVERY
            <br />
            <span className="hero-gradient-text">MASTER SET</span>
          </h1>
          <p className="hero-subtitle">
            {session
              ? 'Favorite a set to start tracking it.'
              : 'Browse freely — log in to favorite a set and track your progress.'}
          </p>

          <div className="hero-search-row">
            <input
              type="search"
              className="search-input find-sets-search"
              placeholder="Search 2026 sets by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {session && (
              <button className="tracked-sets-cta" onClick={onGoToTrackedSets}>
                My Binder{favoriteIds.size > 0 ? ` (${favoriteIds.size})` : ''} &rarr;
              </button>
            )}
          </div>

          {stats && (
            <div className="hero-stats">
              <div className="hero-stat">
                <strong>{stats.cards.toLocaleString()}</strong>
                <span>cards indexed</span>
              </div>
              <div className="hero-stat">
                <strong>{stats.sets}</strong>
                <span>sets tracked</span>
              </div>
              <div className="hero-stat">
                <strong>{stats.artists}</strong>
                <span>illustrators credited</span>
              </div>
            </div>
          )}
        </div>
      </header>

      {error && <p className="error">{error}</p>}
      {loading && <p className="status">Loading 2026 sets...</p>}

      {!loading && !error && filteredSets.length === 0 && (
        <p className="status">No 2026 sets match your search.</p>
      )}

      <div className="set-grid">
        {filteredSets.map((s) => {
          const isFavorite = favoriteIds.has(s.id)
          const isPending = pendingId === s.id
          return (
            <div
              key={s.id}
              className="set-card find-set-card"
              onClick={() => onViewSet(s.id)}
            >
              <button
                className={`favorite-star ${isFavorite ? 'favorited' : ''}`}
                disabled={isPending}
                title={
                  session
                    ? isFavorite
                      ? 'Unfavorite'
                      : 'Favorite'
                    : 'Log in to favorite'
                }
                onClick={(e) => {
                  e.stopPropagation()
                  toggleFavorite(s)
                }}
              >
                {isFavorite ? '★' : '☆'}
              </button>
              <div className="set-logo">
                {s.images?.logo && <img src={s.images.logo} alt={`${s.name} logo`} loading="lazy" />}
              </div>
              <h3>
                {s.images?.symbol && (
                  <img className="set-symbol" src={s.images.symbol} alt="" loading="lazy" />
                )}
                {s.name}
              </h3>
              <p className="set-series">{s.series}</p>
              <p className="progress-label">{s.total} cards &middot; {s.releaseDate}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
