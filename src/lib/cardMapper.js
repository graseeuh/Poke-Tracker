import { extractMarketPrice } from './priceUtils.js'

// Maps a raw pokemontcg.io API card object to our `cards` table row shape.
// Pure — no Supabase/Vite dependency, so it's safe to import from the
// plain-Node CLI seed script as well as the browser.
export function toCardRow(c, setId) {
  const { marketPrice, priceUpdatedAt } = extractMarketPrice(c)
  return {
    id: c.id,
    set_id: setId,
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
}
