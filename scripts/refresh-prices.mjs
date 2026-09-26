// Re-pulls real market_price/tcgplayer_url data from the live pokemontcg.io
// API for every card already in the DB and updates those columns only.
// Never invents a price: cards with no tcgplayer pricing data yet are left
// null, same as at seed time. Meant to run on a schedule (see
// .github/workflows/refresh-prices.yml) so prices fill in automatically as
// TCGplayer publishes them for newer sets, without a manual reseed.
//
// Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.

import { createClient } from '@supabase/supabase-js'
import { extractMarketPrice } from '../src/lib/priceUtils.js'

const supabaseUrl = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !serviceKey) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment first.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)

async function fetchWithRetry(url, attempts = 5) {
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(url)
    if (res.ok) return res.json()
    const delay = 1000 * 2 ** i
    console.warn(`Request failed (${res.status}), retrying in ${delay}ms...`)
    await new Promise((r) => setTimeout(r, delay))
  }
  throw new Error(`Failed to fetch ${url} after ${attempts} attempts`)
}

async function main() {
  const { data: sets, error: setsError } = await supabase.from('sets').select('id, name')
  if (setsError) throw setsError

  let totalUpdated = 0
  let totalNewlyPriced = 0

  for (const set of sets) {
    console.log(`Refreshing prices for ${set.name} (${set.id})...`)
    const pageSize = 250
    let page = 1
    let cards = []
    while (true) {
      const resp = await fetchWithRetry(
        `https://api.pokemontcg.io/v2/cards?q=set.id:${set.id}&pageSize=${pageSize}&page=${page}`
      )
      cards = cards.concat(resp.data)
      if (resp.data.length < pageSize) break
      page += 1
    }

    const { data: existing } = await supabase
      .from('cards')
      .select('id, market_price')
      .eq('set_id', set.id)
    const priorPriced = new Set((existing || []).filter((c) => c.market_price != null).map((c) => c.id))

    const rows = cards.map((c) => {
      const { marketPrice, priceUpdatedAt } = extractMarketPrice(c)
      return {
        id: c.id,
        market_price: marketPrice,
        price_updated_at: priceUpdatedAt,
        tcgplayer_url: c.tcgplayer?.url ?? null,
      }
    })

    const newlyPriced = rows.filter((r) => r.market_price != null && !priorPriced.has(r.id)).length
    totalNewlyPriced += newlyPriced

    const chunkSize = 20
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize)
      const results = await Promise.all(
        chunk.map(({ id, ...fields }) => supabase.from('cards').update(fields).eq('id', id))
      )
      const failed = results.find((r) => r.error)
      if (failed) throw failed.error
    }

    totalUpdated += rows.length
    console.log(`  ${rows.length} cards refreshed, ${newlyPriced} newly priced.`)
  }

  console.log(`Done. ${totalUpdated} cards refreshed, ${totalNewlyPriced} newly priced overall.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
