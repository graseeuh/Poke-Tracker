import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { fetch2026Sets } from '../lib/pokemonApi'
import { ensureSetSeeded } from '../lib/seedSet'

export default function FindSets({ session, onBack }) {
  const [sets, setSets] = useState([])
  const [favoriteIds, setFavoriteIds] = useState(new Set())
  const [pendingId, setPendingId] = useState(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadSets()
  }, [])

  async function loadSets() {
    setLoading(true)
    setError('')
    try {
      const [apiSets, favResp] = await Promise.all([
        fetch2026Sets(),
        supabase.from('favorite_sets').select('set_id').eq('user_id', session.user.id),
      ])
      setSets(apiSets)
      setFavoriteIds(new Set((favResp.data || []).map((r) => r.set_id)))
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  async function toggleFavorite(apiSet) {
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
      <header className="find-sets-header">
        <div className="find-sets-title-row">
          <div>
            <h1>Find 2026 Sets</h1>
            <p className="status-line">Favorite a set to add it to your tracked sets.</p>
          </div>
          <button className="tracked-sets-cta" onClick={onBack}>
            My Tracked Sets ({favoriteIds.size}) &rarr;
          </button>
        </div>
      </header>

      <input
        type="search"
        className="search-input find-sets-search"
        placeholder="Search 2026 sets by name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {error && <p className="error">{error}</p>}
      {loading && <p className="status">Loading 2026 sets...</p>}

      {!loading && filteredSets.length === 0 && (
        <p className="status">No 2026 sets match your search.</p>
      )}

      <div className="set-grid">
        {filteredSets.map((s) => {
          const isFavorite = favoriteIds.has(s.id)
          const isPending = pendingId === s.id
          return (
            <div key={s.id} className="set-card find-set-card">
              <h3>{s.name}</h3>
              <p className="set-series">{s.series}</p>
              <p className="progress-label">{s.total} cards &middot; {s.releaseDate}</p>
              <button
                className={`favorite-toggle ${isFavorite ? 'favorited' : ''}`}
                disabled={isPending}
                onClick={() => toggleFavorite(s)}
              >
                {isPending ? 'Working...' : isFavorite ? '★ Favorited' : '☆ Favorite'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
