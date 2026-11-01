const CACHE_PREFIX = 'bore_barrel_query:'
const memoryCache = new Map()
const pendingQueries = new Map()

const storageKey = (key) => `${CACHE_PREFIX}${key}`

const readStoredQuery = (key) => {
  try {
    const raw = sessionStorage.getItem(storageKey(key))
    if (!raw) return null

    const cached = JSON.parse(raw)
    if (!cached || cached.expiresAt <= Date.now()) {
      sessionStorage.removeItem(storageKey(key))
      return null
    }
    return cached
  } catch {
    return null
  }
}

const writeStoredQuery = (key, data, ttl) => {
  try {
    sessionStorage.setItem(
      storageKey(key),
      JSON.stringify({ data, expiresAt: Date.now() + ttl }),
    )
  } catch {
    // A full or unavailable sessionStorage should not break API requests.
  }
}

export const queryCache = {
  async fetch(key, fetcher, { ttl = 30000, force = false } = {}) {
    const cached = memoryCache.get(key) || readStoredQuery(key)

    if (!force && cached && cached.expiresAt > Date.now()) {
      memoryCache.set(key, cached)
      return cached.data
    }

    if (!force && pendingQueries.has(key)) {
      return pendingQueries.get(key)
    }

    const request = Promise.resolve()
      .then(fetcher)
      .then((data) => {
        const entry = { data, expiresAt: Date.now() + ttl }
        memoryCache.set(key, entry)
        writeStoredQuery(key, data, ttl)
        return data
      })
      .finally(() => {
        pendingQueries.delete(key)
      })

    pendingQueries.set(key, request)
    return request
  },

  invalidate(key) {
    memoryCache.delete(key)
    try {
      sessionStorage.removeItem(storageKey(key))
    } catch {
      // Ignore unavailable sessionStorage.
    }
  },
}