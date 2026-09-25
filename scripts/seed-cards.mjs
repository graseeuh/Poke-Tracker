// Seeds one Pokemon TCG set (and its cards) into Supabase.
// Usage: npm run seed -- <setId>
// Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment
// (the service role key bypasses RLS, so this must run server-side only,
// never in the browser).

import { createClient } from '@supabase/supabase-js'
import { toCardRow } from '../src/lib/cardMapper.js'

const setId = process.argv[2]
if (!setId) {
  console.error('Usage: npm run seed -- <setId>')
  console.error('Find set IDs at https://api.pokemontcg.io/v2/sets')
  process.exit(1)
}

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
  console.log(`Fetching set ${setId}...`)
  const setResp = await fetchWithRetry(`https://api.pokemontcg.io/v2/sets/${setId}`)
  const set = setResp.data

  const { error: setError } = await supabase.from('sets').upsert({
    id: set.id,
    name: set.name,
    series: set.series,
    total: set.total,
    release_date: set.releaseDate.replace(/\//g, '-'),
  })
  if (setError) throw setError
  console.log(`Saved set: ${set.name} (${set.total} cards)`)

  console.log('Fetching cards...')
  const pageSize = 250
  let page = 1
  let cards = []
  while (true) {
    const cardsResp = await fetchWithRetry(
      `https://api.pokemontcg.io/v2/cards?q=set.id:${setId}&pageSize=${pageSize}&page=${page}`
    )
    cards = cards.concat(cardsResp.data)
    if (cardsResp.data.length < pageSize) break
    page += 1
  }

  const rows = cards.map((c) => toCardRow(c, setId))

  const { error: cardsError } = await supabase.from('cards').upsert(rows)
  if (cardsError) throw cardsError

  console.log(`Saved ${rows.length} cards for set ${set.name}.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
