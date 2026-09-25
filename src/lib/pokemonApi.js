// Thin client for the public pokemontcg.io API (no key required for this usage).

const API_BASE = 'https://api.pokemontcg.io/v2'

// Kept short on purpose: this public API is often down (500s/502s), and a
// long retry cascade just makes users stare at a loading screen before the
// database fallback (see FindSets.jsx) ever gets a chance to kick in. A
// per-attempt timeout also guards against a request that hangs instead of
// erroring, which a plain fetch() has no protection against on its own.
async function fetchWithRetry(url, attempts = 3, timeoutMs = 6000) {
  for (let i = 0; i < attempts; i++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(url, { signal: controller.signal })
      if (res.ok) return res.json()
      if (i === attempts - 1) throw new Error(`Request failed (${res.status}): ${url}`)
    } catch (err) {
      if (i === attempts - 1) {
        throw err.name === 'AbortError' ? new Error(`Request timed out: ${url}`) : err
      }
    } finally {
      clearTimeout(timer)
    }
    await new Promise((r) => setTimeout(r, 600 * 2 ** i))
  }
}

// Cached in memory so re-mounting the set list (e.g. navigating back from a
// set) doesn't need a fresh round-trip to the flaky public API every time.
let cached2026Sets = null

// Sets released in 2026 only, so the tracker stays scoped to current-year master sets.
export async function fetch2026Sets() {
  if (cached2026Sets) return cached2026Sets
  const resp = await fetchWithRetry(`${API_BASE}/sets?orderBy=releaseDate`)
  cached2026Sets = resp.data.filter((s) => s.releaseDate.startsWith('2026'))
  return cached2026Sets
}

export async function fetchSetMeta(setId) {
  const resp = await fetchWithRetry(`${API_BASE}/sets/${setId}`)
  return resp.data
}

export async function fetchSetCards(setId) {
  const pageSize = 250
  let page = 1
  let cards = []
  while (true) {
    const resp = await fetchWithRetry(
      `${API_BASE}/cards?q=set.id:${setId}&pageSize=${pageSize}&page=${page}`
    )
    cards = cards.concat(resp.data)
    if (resp.data.length < pageSize) break
    page += 1
  }
  return cards
}

export async function fetchCardsByArtist(artist) {
  const q = encodeURIComponent(`artist:"${artist}"`)
  const resp = await fetchWithRetry(
    `${API_BASE}/cards?q=${q}&pageSize=60&orderBy=-set.releaseDate`
  )
  return resp.data
}
