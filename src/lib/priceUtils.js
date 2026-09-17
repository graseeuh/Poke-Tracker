// Picks a representative "market price" out of a card's tcgplayer.prices
// object, which has one sub-object per printing (holofoil, normal, etc.).
// Pokemontcg.io hasn't backfilled price data for the newest sets yet, so
// this is frequently absent — callers should treat a null return as
// "not priced yet," not an error.
const PRICE_VARIANT_PRIORITY = [
  'holofoil',
  'reverseHolofoil',
  'normal',
  '1stEditionHolofoil',
  'unlimitedHolofoil',
]

export function extractMarketPrice(card) {
  const prices = card.tcgplayer?.prices
  if (!prices) return { marketPrice: null, priceUpdatedAt: null }

  let market = null
  for (const variant of PRICE_VARIANT_PRIORITY) {
    if (typeof prices[variant]?.market === 'number') {
      market = prices[variant].market
      break
    }
  }
  if (market === null) {
    const firstVariant = Object.values(prices).find((v) => typeof v?.market === 'number')
    market = firstVariant?.market ?? null
  }

  return {
    marketPrice: market,
    priceUpdatedAt: card.tcgplayer?.updatedAt
      ? new Date(card.tcgplayer.updatedAt).toISOString()
      : null,
  }
}
