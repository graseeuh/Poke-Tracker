import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { fetchSetMeta, fetchSetCards } from '../lib/pokemonApi'
import { toCardRow } from '../lib/cardMapper'
import { ensureSetSeeded } from '../lib/seedSet'
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

// Base rarities are grouped together as "Main set"; every other rarity a
// set uses (which varies a lot between eras — "Mega Hyper Rare" and
// "Pikachu Rare" in newer sets, "Rare Holo GX"/"LEGEND"/"Rare Secret" in
// older ones) gets its own showcase section. This is data-driven instead
// of a hardcoded rarity list so every set gets a consistent "common stuff
// grouped, chase cards showcased" layout regardless of which rarity names
// it happens to use.
const BASE_RARITIES = new Set(['Common', 'Uncommon', 'Rare'])
const MAIN_SET_LABEL = 'Main set'

function sectionFor(card) {
  if (!card.rarity || BASE_RARITIES.has(card.rarity)) return MAIN_SET_LABEL
  return card.rarity
}

function sceneClassFor(label) {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  return `rarity-scene-${slug}`
}

export default function SetDetail({ session, setId, onBack, onViewArtist, onRequireLogin }) {
  const [set, setSet] = useState(null)
  const [cards, setCards] = useState([])
  const [ownedMap, setOwnedMap] = useState({}) // { [cardId]: boolean }
  const [justMarked, setJustMarked] = useState(null) // cardId to play the owned-bubble pop animation for
  const [seeded, setSeeded] = useState(true) // false = viewing live API data, not yet tracked
  const [apiSetMeta, setApiSetMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')

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
    setLoadError('')
    setActionError('')

    const { data: setRow } = await supabase.from('sets').select('*').eq('id', setId).maybeSingle()

    if (setRow) {
      setSet(setRow)
      setSeeded(true)
      setApiSetMeta(null)

      const { data: cardsData } = await supabase
        .from('cards')
        .select('*')
        .eq('set_id', setId)
        .order('number', { ascending: true })
      setCards(cardsData || [])
    } else {
      // Nobody has tracked this set yet — show it read-only straight from
      // the public API instead of erroring out.
      try {
        const [meta, apiCards] = await Promise.all([fetchSetMeta(setId), fetchSetCards(setId)])
        setApiSetMeta(meta)
        setSet({ id: meta.id, name: meta.name, series: meta.series, total: meta.total })
        setSeeded(false)
        setCards(
          [...apiCards]
            .sort((a, b) => Number(a.number) - Number(b.number))
            .map((c) => toCardRow(c, setId))
        )
      } catch (err) {
        setLoadError(
          'Could not load this set from the Pokemon TCG API — it may be temporarily down. ' +
            `(${err.message})`
        )
        setLoading(false)
        return
      }
    }

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
    if (!session) {
      onRequireLogin()
      return
    }

    const nextOwned = !ownedMap[cardId]
    setOwnedMap((prev) => ({ ...prev, [cardId]: nextOwned }))

    if (nextOwned) {
      setJustMarked(cardId)
      setTimeout(() => setJustMarked((id) => (id === cardId ? null : id)), 600)
    }

    try {
      if (!seeded) {
        await ensureSetSeeded(apiSetMeta)
        setSeeded(true)
      }

      if (nextOwned) {
        const { error: favError } = await supabase
          .from('favorite_sets')
          .upsert({ user_id: session.user.id, set_id: setId })
        if (favError) throw favError
      }

      const { error } = await supabase.from('user_cards').upsert({
        user_id: session.user.id,
        card_id: cardId,
        owned: nextOwned,
        updated_at: new Date().toISOString(),
      })
      if (error) throw error
    } catch (err) {
      setOwnedMap((prev) => ({ ...prev, [cardId]: !nextOwned }))
      setActionError(err.message)
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
    // Chase sections shown rarest (fewest cards) first, "Main set" last.
    const chaseLabels = Object.keys(groups)
      .filter((label) => label !== MAIN_SET_LABEL)
      .sort((a, b) => groups[a].length - groups[b].length)
    const orderedLabels = groups[MAIN_SET_LABEL]
      ? [...chaseLabels, MAIN_SET_LABEL]
      : chaseLabels
    return orderedLabels.map((label) => ({ label, cards: groups[label] }))
  }, [filteredCards])

  if (loading) return <p className="status">Loading set...</p>

  if (loadError) {
    return (
      <div className="set-detail">
        <button onClick={onBack}>&larr; Back to sets</button>
        <p className="error">{loadError}</p>
      </div>
    )
  }

  const ownedCards = cards.filter((c) => ownedMap[c.id])
  const ownedCount = ownedCards.length
  const ownedPct = cards.length ? Math.round((ownedCount / cards.length) * 100) : 0
  const pricedOwnedCards = ownedCards.filter((c) => typeof c.market_price === 'number')
  const collectionValue = pricedOwnedCards.reduce((sum, c) => sum + c.market_price, 0)

  return (
    <div className="set-detail">
      {actionError && <p className="error action-error">{actionError}</p>}

      <header className="set-detail-header">
        <button onClick={onBack}>&larr; Back to sets</button>
        <h1>{set.name}</h1>
        <div className="set-detail-progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${ownedPct}%` }} />
          </div>
          <p className="progress-label">
            {ownedCount} / {cards.length} owned ({ownedPct}%)
            {!session && ' — log in to track your progress'}
            {session && !seeded && ' — mark a card to start tracking this set'}
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
          <section key={section.label} className={`rarity-section ${sceneClassFor(section.label)}`}>
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
                  {ownedMap[card.id] && (
                    <span className={`owned-bubble ${justMarked === card.id ? 'pop' : ''}`}>
                      ✓
                    </span>
                  )}
                  <div className="card-image-wrap">
                    <img src={card.image_url} alt={card.name} loading="lazy" />
                  </div>
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
