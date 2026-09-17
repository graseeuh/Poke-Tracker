import { supabase } from './supabaseClient'
import { fetchSetCards } from './pokemonApi'
import { extractMarketPrice } from './priceUtils'

// Ensures a set's metadata + cards exist in Supabase, fetching from the
// public API and upserting them if not. Safe to call repeatedly.
export async function ensureSetSeeded(apiSet) {
  const { data: existing } = await supabase
    .from('sets')
    .select('id')
    .eq('id', apiSet.id)
    .maybeSingle()

  if (existing) return

  const { error: setError } = await supabase.from('sets').upsert({
    id: apiSet.id,
    name: apiSet.name,
    series: apiSet.series,
    total: apiSet.total,
    release_date: apiSet.releaseDate.replace(/\//g, '-'),
  })
  if (setError) throw setError

  const cards = await fetchSetCards(apiSet.id)
  const rows = cards.map((c) => {
    const { marketPrice, priceUpdatedAt } = extractMarketPrice(c)
    return {
      id: c.id,
      set_id: apiSet.id,
      name: c.name,
      number: c.number,
      image_url: c.images?.large ?? c.images?.small ?? null,
      types: c.types ?? null,
      rarity: c.rarity ?? null,
      supertype: c.supertype ?? null,
      tcgplayer_url: c.tcgplayer?.url ?? null,
      description: c.flavorText || (c.rules && c.rules.length ? c.rules.join(' ') : null),
      artist: c.artist ?? null,
      market_price: marketPrice,
      price_updated_at: priceUpdatedAt,
    }
  })

  const { error: cardsError } = await supabase.from('cards').upsert(rows)
  if (cardsError) throw cardsError
}
