import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import CardModal from '../components/CardModal'

const RARITY_ORDER = [
  'Common',
  'Uncommon',
  'Rare',
  'Double Rare',
  'Ultra Rare',
  'Illustration Rare',
  'Special Illustration Rare',
  'MEGA_ATTACK_RARE',
  'Mega Hyper Rare',
]

// Chase rarities get their own showcase section, rarest first; everything
// else (Common/Uncommon/Rare/etc.) is grouped together as "Main set".
const SECTION_ORDER = [
  'Mega Hyper Rare',
  'Special Illustration Rare',
  'Illustration Rare',
  'Ultra Rare',
  'Double Rare',
]
const MAIN_SET_LABEL = 'Main set'

function sectionFor(card) {
  return SECTION_ORDER.includes(card.rarity) ? card.rarity : MAIN_SET_LABEL
}

export default function SetDetail({ session, setId, onBack, onViewArtist }) {
  const [set, setSet] = useState(null)
  const [cards, setCards] = useState([])
  const [ownedMap, setOwnedMap] = useState({}) // { [cardId]: boolean }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [rarityFilter, setRarityFilter] = useState('All')
  const [sortBy, setSortBy] = useState('number') // 'number' | 'name'
  const [selectedCard, setSelectedCard] = useState(null)

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

    if (session) {
      const { data: ownedData } = await supabase
        .from('user_cards')
        .select('card_id, owned')
        .eq('user_id', session.user.id)

      const map = {}
      for (const row of ownedData || []) map[row.card_id] = row.owned
      setOwnedMap(map)
    }
    setLoading(false)
  }

  async function toggleOwned(cardId) {
    const nextOwned = !ownedMap[cardId]
    setOwnedMap((prev) => ({ ...prev, [cardId]: nextOwned }))

    if (!session) return // demo mode: local only, nothing to save

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

  const types = useMemo(() => {
    const set = new Set()
    for (const c of cards) for (const t of c.types || []) set.add(t)
    return Array.from(set).sort()
  }, [cards])

  const rarities = useMemo(() => {
    const set = new Set()
    for (const c of cards) if (c.rarity) set.add(c.rarity)
    return Array.from(set).sort(
      (a, b) => RARITY_ORDER.indexOf(a) - RARITY_ORDER.indexOf(b)
    )
  }, [cards])

  const filteredCards = useMemo(() => {
    let result = cards

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter((c) => c.name.toLowerCase().includes(q))
    }
    if (typeFilter !== 'All') {
      result = result.filter((c) => (c.types || []).includes(typeFilter))
    }
    if (rarityFilter !== 'All') {
      result = result.filter((c) => c.rarity === rarityFilter)
    }

    result = [...result].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      return Number(a.number) - Number(b.number)
    })

    return result
  }, [cards, search, typeFilter, rarityFilter, sortBy])

  const sections = useMemo(() => {
    const groups = {}
    for (const card of filteredCards) {
      const label = sectionFor(card)
      groups[label] = groups[label] || []
      groups[label].push(card)
    }
    return [...SECTION_ORDER, MAIN_SET_LABEL]
      .filter((label) => groups[label]?.length)
      .map((label) => ({ label, cards: groups[label] }))
  }, [filteredCards])

  if (loading) return <p className="status">Loading set...</p>
  if (error) return <p className="error">{error}</p>

  const ownedCards = cards.filter((c) => ownedMap[c.id])
  const ownedCount = ownedCards.length
  const ownedPct = cards.length ? Math.round((ownedCount / cards.length) * 100) : 0
  const pricedOwnedCards = ownedCards.filter((c) => typeof c.market_price === 'number')
  const collectionValue = pricedOwnedCards.reduce((sum, c) => sum + c.market_price, 0)

  return (
    <div className="set-detail">
      <header className="set-detail-header">
        <button onClick={onBack}>&larr; Back to sets</button>
        <h1>{set.name}</h1>
        <div className="set-detail-progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${ownedPct}%` }} />
          </div>
          <p className="progress-label">
            {ownedCount} / {cards.length} owned ({ownedPct}%)
            {!session && ' — demo mode, not saved'}
          </p>
          {ownedCount > 0 && (
            <p className="collection-value">
              Collection value: <strong>${collectionValue.toFixed(2)}</strong>
              {pricedOwnedCards.length < ownedCount &&
                ` (${ownedCount - pricedOwnedCards.length} owned card${
                  ownedCount - pricedOwnedCards.length === 1 ? '' : 's'
                } not yet priced)`}
            </p>
          )}
        </div>
      </header>

      <div className="filter-bar">
        <input
          type="search"
          className="search-input"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="All">All types</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <select value={rarityFilter} onChange={(e) => setRarityFilter(e.target.value)}>
          <option value="All">All rarities</option>
          {rarities.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="number">Sort: Number</option>
          <option value="name">Sort: A&ndash;Z</option>
        </select>
      </div>

      {filteredCards.length === 0 && (
        <p className="status">No cards match your filters.</p>
      )}

      {sections.map((section) => {
        const sectionOwned = section.cards.filter((c) => ownedMap[c.id]).length
        return (
          <section key={section.label} className="rarity-section">
            <h2 className="rarity-section-heading">
              {section.label}
              <span className="rarity-section-count">
                {sectionOwned} / {section.cards.length} cards
              </span>
            </h2>
            <div className="card-grid">
              {section.cards.map((card) => (
                <div
                  key={card.id}
                  className={`card-tile ${ownedMap[card.id] ? 'owned' : ''}`}
                  onClick={() => setSelectedCard(card)}
                >
                  <img src={card.image_url} alt={card.name} loading="lazy" />
                  <span>
                    {card.number}. {card.name}
                  </span>
                  <button
                    className="owned-toggle"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleOwned(card.id)
                    }}
                  >
                    {ownedMap[card.id] ? '✓ Owned' : 'Mark owned'}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )
      })}

      <CardModal
        card={selectedCard}
        owned={selectedCard ? !!ownedMap[selectedCard.id] : false}
        onToggleOwned={toggleOwned}
        onClose={() => setSelectedCard(null)}
        onViewArtist={onViewArtist}
      />
    </div>
  )
}
