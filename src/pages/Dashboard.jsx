import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Dashboard({ session, onSelectSet }) {
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

    const { data: setsData, error: setsError } = await supabase
      .from('sets')
      .select('*')
      .order('release_date', { ascending: true })

    if (setsError) {
      setError(setsError.message)
      setLoading(false)
      return
    }

    setSets(setsData || [])

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
      if (ownedSet.has(card.id)) totals[card.set_id].owned += 1
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
          <span className="user-email">{session.user.email}</span>
          <button onClick={handleSignOut}>Log out</button>
        </div>
      </header>

      {sets.length === 0 && (
        <p className="status">
          No sets loaded yet. Run <code>npm run seed -- &lt;setId&gt;</code> to load a 2026 set.
        </p>
      )}

      <div className="set-grid">
        {sets.map((set) => {
          const p = progress[set.id] || { owned: 0, total: set.total }
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
            </button>
          )
        })}
      </div>
    </div>
  )
}
