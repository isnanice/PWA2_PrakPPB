// ---------------------------------------------------------------------------
// queryCache.js — cache sederhana di memori untuk hasil request API.
//
// - TTL: data dianggap segar selama `ttl` ms.
// - In-flight dedupe: request dengan key sama yang sedang jalan dipakai bareng.
// - invalidateQueries(prefix): hapus cache saat data berubah (create/update/dll).
// ---------------------------------------------------------------------------

const DEFAULT_TTL = 60 * 1000

const store = new Map() // key -> { value, expires }
const inflight = new Map() // key -> Promise
let version = 0

export const cachedQuery = (key, fetcher, ttl = DEFAULT_TTL) => {
  const hit = store.get(key)
  if (hit && hit.expires > Date.now()) return Promise.resolve(hit.value)
  if (inflight.has(key)) return inflight.get(key)

  const startVersion = version
  const promise = fetcher()
    .then((value) => {
      // Kalau cache di-invalidate saat request jalan, hasilnya jangan disimpan
      if (startVersion === version) {
        store.set(key, { value, expires: Date.now() + ttl })
      }
      return value
    })
    .finally(() => {
      if (inflight.get(key) === promise) inflight.delete(key)
    })

  inflight.set(key, promise)
  return promise
}

export const invalidateQueries = (prefix = '') => {
  version += 1
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key)
  }
  for (const key of inflight.keys()) {
    if (key.startsWith(prefix)) inflight.delete(key)
  }
}

export const clearQueryCache = () => invalidateQueries('')