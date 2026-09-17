import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Dashboard({ session, onSelectSet, onExitDemo, onFindSets }) {
  const [sets, setSets] = useState([])
  const [progress, setProgress] = useState({}) // { [setId]: { owned, total } }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadSets()
  }, [])

  async function loadSets() {
    setLoading(true)
    setError('')

    let setsData
    if (session) {
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

      const { data, error: setsError } = await supabase
        .from('sets')
        .select('*')
        .in('id', favoriteIds)
        .order('release_date', { ascending: true })

      if (setsError) {
        setError(setsError.message)
        setLoading(false)
        return
      }
      setsData = data
    } else {
      const { data, error: setsError } = await supabase
        .from('sets')
        .select('*')
        .order('release_date', { ascending: true })

      if (setsError) {
        setError(setsError.message)
        setLoading(false)
        return
      }
      setsData = data
    }

    setSets(setsData || [])

    const { data: cardsData } = await supabase.from('cards').select('id, set_id, market_price')
    const ownedData = session
      ? (
          await supabase
            .from('user_cards')
            .select('card_id')
            .eq('user_id', session.user.id)
            .eq('owned', true)
        ).data
      : []

    const ownedSet = new Set((ownedData || []).map((r) => r.card_id))
    const totals = {}
    for (const card of cardsData || []) {
      totals[card.set_id] = totals[card.set_id] || { owned: 0, total: 0, value: 0 }
      totals[card.set_id].total += 1
      if (ownedSet.has(card.id)) {
        totals[card.set_id].owned += 1
        if (typeof card.market_price === 'number') {
          totals[card.set_id].value += card.market_price
        }
      }
    }
    setProgress(totals)
    setLoading(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  if (loading) return <p className="status">Loading sets...</p>
  if (error) return <p className="error">{error}</p>

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Your 2026 Sets</h1>
        <div>
          {session ? (
            <>
              <span className="user-email">{session.user.email}</span>
              <button onClick={onFindSets}>Find sets</button>
              <button onClick={handleSignOut}>Log out</button>
            </>
          ) : (
            <>
              <span className="user-email">Guest (demo mode &mdash; progress won't be saved)</span>
              <button onClick={onExitDemo}>Log in / Register</button>
            </>
          )}
        </div>
      </header>

      {sets.length === 0 && session && (
        <p className="status">
          You haven't favorited any sets yet. Click <strong>Find sets</strong> above to browse
          2026 sets and add some.
        </p>
      )}

      {sets.length === 0 && !session && (
        <p className="status">
          No sets loaded yet. Log in and use Find sets to favorite a 2026 set.
        </p>
      )}

      <div className="set-grid">
        {sets.map((set) => {
          const p = progress[set.id] || { owned: 0, total: set.total, value: 0 }
          const pct = p.total ? Math.round((p.owned / p.total) * 100) : 0
          return (
            <button key={set.id} className="set-card" onClick={() => onSelectSet(set.id)}>
              <h3>{set.name}</h3>
              <p className="set-series">{set.series}</p>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${pct}%` }} />
              </div>
              <p className="progress-label">
                {p.owned} / {p.total} ({pct}%)
              </p>
              {p.owned > 0 && (
                <p className="progress-label set-value">${p.value.toFixed(2)} collected</p>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
