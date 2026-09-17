import { supabase } from './supabaseClient'
import { fetchSetCards } from './pokemonApi'
import { toCardRow } from './cardMapper'

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
  const rows = cards.map((c) => toCardRow(c, apiSet.id))

  const { error: cardsError } = await supabase.from('cards').upsert(rows)
  if (cardsError) throw cardsError
}
