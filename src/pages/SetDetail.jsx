import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function SetDetail({ session, setId, onBack }) {
  const [set, setSet] = useState(null)
  const [cards, setCards] = useState([])
  const [ownedMap, setOwnedMap] = useState({}) // { [cardId]: boolean }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadSetDetail()
  }, [setId])

  async function loadSetDetail() {
    setLoading(true)
    setError('')

    const { data: setData, error: setError_ } = await supabase
      .from('sets')
      .select('*')
      .eq('id', setId)
      .single()

    if (setError_) {
      setError(setError_.message)
      setLoading(false)
      return
    }
    setSet(setData)

    const { data: cardsData } = await supabase
      .from('cards')
      .select('*')
      .eq('set_id', setId)
      .order('number', { ascending: true })
    setCards(cardsData || [])

    const { data: ownedData } = await supabase
      .from('user_cards')
      .select('card_id, owned')
      .eq('user_id', session.user.id)

    const map = {}
    for (const row of ownedData || []) map[row.card_id] = row.owned
    setOwnedMap(map)
    setLoading(false)
  }

  async function toggleOwned(cardId) {
    const nextOwned = !ownedMap[cardId]
    setOwnedMap((prev) => ({ ...prev, [cardId]: nextOwned }))

    const { error } = await supabase.from('user_cards').upsert({
      user_id: session.user.id,
      card_id: cardId,
      owned: nextOwned,
      updated_at: new Date().toISOString(),
    })

    if (error) {
      setOwnedMap((prev) => ({ ...prev, [cardId]: !nextOwned }))
      setError(error.message)
    }
  }

  if (loading) return <p className="status">Loading set...</p>
  if (error) return <p className="error">{error}</p>

  const ownedCount = cards.filter((c) => ownedMap[c.id]).length

  return (
    <div className="set-detail">
      <header className="dashboard-header">
        <button onClick={onBack}>&larr; Back to sets</button>
        <h1>{set.name}</h1>
        <p>
          {ownedCount} / {cards.length} owned
        </p>
      </header>

      <div className="card-grid">
        {cards.map((card) => (
          <label key={card.id} className={`card-tile ${ownedMap[card.id] ? 'owned' : ''}`}>
            <img src={card.image_url} alt={card.name} loading="lazy" />
            <span>{card.number}. {card.name}</span>
            <input
              type="checkbox"
              checked={!!ownedMap[card.id]}
              onChange={() => toggleOwned(card.id)}
            />
          </label>
        ))}
      </div>
    </div>
  )
}
