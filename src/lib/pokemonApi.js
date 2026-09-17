// Thin client for the public pokemontcg.io API (no key required for this usage).

const API_BASE = 'https://api.pokemontcg.io/v2'

async function fetchWithRetry(url, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(url)
    if (res.ok) return res.json()
    if (i === attempts - 1) throw new Error(`Request failed (${res.status}): ${url}`)
    await new Promise((r) => setTimeout(r, 500 * 2 ** i))
  }
}

// Sets released in 2026 only, so the tracker stays scoped to current-year master sets.
export async function fetch2026Sets() {
  const resp = await fetchWithRetry(`${API_BASE}/sets?orderBy=releaseDate`)
  return resp.data.filter((s) => s.releaseDate.startsWith('2026'))
}

export async function fetchSetCards(setId) {
  const resp = await fetchWithRetry(`${API_BASE}/cards?q=set.id:${setId}&pageSize=250`)
  return resp.data
}

export async function fetchCardsByArtist(artist) {
  const q = encodeURIComponent(`artist:"${artist}"`)
  const resp = await fetchWithRetry(
    `${API_BASE}/cards?q=${q}&pageSize=60&orderBy=-set.releaseDate`
  )
  return resp.data
}
