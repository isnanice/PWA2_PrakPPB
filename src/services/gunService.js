import { apiClient, IS_SUPABASE } from '../config/api'
import { cachedQuery, invalidateQueries } from '../utils/queryCache'

// ---------------------------------------------------------------------------
// Normalizer — standardizes product shape whether received from Supabase
// (public.products) or from the university API (/api/v1/recipes).
// ---------------------------------------------------------------------------
export const normalizeProduct = (item) => {
  if (!item) return null

  // Resolve specifications from Supabase `specs` (text array) or API `ingredients`
  let specsList = []
  if (Array.isArray(item.specs)) {
    specsList = item.specs.map((s, idx) => {
      if (typeof s === 'string') {
        const colonIndex = s.indexOf(':')
        if (colonIndex > -1) {
          return {
            id: `spec-${idx}`,
            name: s.substring(0, colonIndex).trim(),
            quantity: s.substring(colonIndex + 1).trim(),
          }
        }
        return {
          id: `spec-${idx}`,
          name: 'Specification',
          quantity: s.trim(),
        }
      }
      return s
    })
  } else if (Array.isArray(item.ingredients)) {
    specsList = item.ingredients
  }

  // Resolve steps
  const stepsList =
    Array.isArray(item.steps) && item.steps.length > 0
      ? item.steps
      : ['Verify firearm is completely unloaded and point in safe direction.', 'Inspect receiver and mechanism for maintenance.']

  // Resolve images: pakai kolom `images` (array); kalau kosong, cover tunggal
  const cover = item.image_url || item.image || '/guns/pistol.svg'
  const imageList =
    Array.isArray(item.images) && item.images.filter(Boolean).length > 0
      ? item.images.filter(Boolean)
      : [cover]

  return {
    ...item,
    id: item.id,
    name: item.name || 'Hardware Piece',
    type: item.type || item.category || 'Hardware',
    category: item.type || item.category || 'Hardware',
    caliber: item.caliber || 'Standard',
    price: Number(item.price ?? item.cook_time ?? 0),
    description: item.description || '',
    images: imageList,
    image_url: imageList[0],
    image: imageList[0],
    ingredients: specsList,
    steps: stepsList,
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const SORTABLE = ['name', 'price', 'created_at']

// Setiap data produk berubah, cache produk & favorit (yang join ke produk)
// harus dibuang supaya tidak menampilkan data basi.
const invalidateCatalog = () => {
  invalidateQueries('guns:')
  invalidateQueries('favorites:')
}

// Content-Range: "0-7/23" -> 23
const parseTotal = (contentRange, fallback) => {
  const total = Number(String(contentRange || '').split('/')[1])
  return Number.isFinite(total) ? total : fallback
}

// ---------------------------------------------------------------------------
// GunService — wraps backend CRUD endpoints.
// Supports both Supabase PostgREST table (/rest/v1/products) and
// standard REST API (/api/v1/recipes).
// ---------------------------------------------------------------------------
class GunService {
  /**
   * Fetch a paginated, filterable list of ACTIVE products (deleted_at IS NULL).
   * params: { page, limit, search, category, sort_by, order }
   */
  async getGuns(params = {}) {
    if (IS_SUPABASE) {
      const limit = Math.max(Number(params.limit) || 9, 1)
      const page = Math.max(Number(params.page) || 1, 1)
      const offset = (page - 1) * limit

      const queryParts = ['select=*', 'deleted_at=is.null']

      // Search di name ATAU description. Karakter khusus dibuang agar
      // tidak merusak sintaks or=(...) milik PostgREST.
      const term = (params.search || '').trim().replace(/[(),*]/g, ' ')
      if (term) {
        const enc = encodeURIComponent(term)
        queryParts.push(`or=(name.ilike.*${enc}*,description.ilike.*${enc}*)`)
      }

      if (params.category && params.category !== 'All') {
        queryParts.push(`type=eq.${encodeURIComponent(params.category)}`)
      }

      // Sort pakai whitelist; id sebagai tie-breaker biar urutan halaman stabil
      const hasSort = SORTABLE.includes(params.sort_by)
      const sortBy = hasSort ? params.sort_by : 'created_at'
      const order = hasSort ? (params.order === 'desc' ? 'desc' : 'asc') : 'desc'
      queryParts.push(`order=${sortBy}.${order},id.asc`)

      queryParts.push(`limit=${limit}`)
      queryParts.push(`offset=${offset}`)

      const queryString = queryParts.join('&')

      return cachedQuery(`guns:list:${queryString}`, async () => {
        const res = await apiClient.get(`/rest/v1/products?${queryString}`, {
          fullResponse: true,
          headers: { Prefer: 'count=exact' },
        })
        const rows = Array.isArray(res.data) ? res.data : []

        return {
          success: true,
          data: rows.map(normalizeProduct),
          pagination: {
            total: parseTotal(res.headers?.['content-range'], rows.length),
            page,
            limit,
          },
        }
      })
    }

    // Fallback: university REST API
    const clean = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== '' && v != null),
    )
    return apiClient.get('/api/v1/recipes', { params: clean })
  }

  /**
   * Fetch ARCHIVED (soft-deleted) products, terbaru diarsipkan di atas.
   */
  async getArchivedGuns() {
    if (!IS_SUPABASE) {
      throw new Error('Archive is only supported on the Supabase backend.')
    }
    return cachedQuery('guns:archived', async () => {
      const data = await apiClient.get(
        '/rest/v1/products?select=*&deleted_at=not.is.null&order=deleted_at.desc',
      )
      const list = Array.isArray(data) ? data.map(normalizeProduct) : []
      return { success: true, data: list }
    })
  }

  /**
   * Fetch a single ACTIVE product by ID.
   */
  async getGunById(id) {
    if (IS_SUPABASE) {
      return cachedQuery(`guns:detail:${id}`, async () => {
        const data = await apiClient.get(
          `/rest/v1/products?id=eq.${id}&deleted_at=is.null&select=*`,
        )
        if (Array.isArray(data) && data.length > 0) {
          return { success: true, data: normalizeProduct(data[0]) }
        }
        throw new Error('Hardware item not found.')
      })
    }
    return apiClient.get(`/api/v1/recipes/${id}`)
  }

  /**
   * Create a new product.
   */
  async createGun(data) {
    if (IS_SUPABASE) {
      const specsArray = Array.isArray(data.ingredients)
        ? data.ingredients.map((i) => `${i.name}: ${i.quantity}`)
        : Array.isArray(data.specs)
        ? data.specs
        : []

      // Gambar: pakai `images` kalau ada, kalau tidak pakai `image_url` tunggal
      const imagesArray =
        Array.isArray(data.images) && data.images.length > 0
          ? data.images
          : data.image_url
          ? [data.image_url]
          : []

      const payload = {
        name: data.name,
        type: data.type || (data.category === 'minuman' ? 'Rifle' : 'Pistol'),
        caliber: data.caliber || '9mm',
        price: Number(data.price ?? data.cook_time ?? 0),
        description: data.description || '',
        specs: specsArray,
        images: imagesArray,
        image_url: imagesArray[0] || null,
      }

      const res = await apiClient.post('/rest/v1/products', payload, {
        headers: { Prefer: 'return=representation' },
      })
      const created = Array.isArray(res) ? res[0] : res
      invalidateCatalog()
      return { success: true, data: normalizeProduct(created) }
    }
    return apiClient.post('/api/v1/recipes', data)
  }

  /**
   * Update existing product.
   */
  async updateGun(id, data) {
    if (IS_SUPABASE) {
      const specsArray = Array.isArray(data.ingredients)
        ? data.ingredients.map((i) => `${i.name}: ${i.quantity}`)
        : Array.isArray(data.specs)
        ? data.specs
        : undefined

      const payload = {
        updated_at: new Date().toISOString(),
      }
      if (data.name !== undefined) payload.name = data.name
      if (data.type !== undefined) payload.type = data.type
      if (data.caliber !== undefined) payload.caliber = data.caliber
      if (data.price !== undefined || data.cook_time !== undefined) {
        payload.price = Number(data.price ?? data.cook_time ?? 0)
      }
      if (data.description !== undefined) payload.description = data.description
      if (specsArray !== undefined) payload.specs = specsArray

      // Gambar: `images` menang; image_url selalu mengikuti gambar pertama
      if (Array.isArray(data.images)) {
        payload.images = data.images
        payload.image_url = data.images[0] ?? null
      } else if (data.image_url !== undefined) {
        payload.image_url = data.image_url
      }

      const res = await apiClient.patch(`/rest/v1/products?id=eq.${id}`, payload, {
        headers: { Prefer: 'return=representation' },
      })
      const updated = Array.isArray(res) ? res[0] : res
      invalidateCatalog()
      return { success: true, data: normalizeProduct(updated) }
    }
    return apiClient.put(`/api/v1/recipes/${id}`, data)
  }

  /**
   * Partial update (PATCH).
   */
  async patchGun(id, data) {
    if (IS_SUPABASE) {
      return this.updateGun(id, data)
    }
    return apiClient.patch(`/api/v1/recipes/${id}`, data)
  }

  /**
   * Soft delete — tandai produk sebagai diarsipkan (deleted_at = sekarang).
   */
  async archiveGun(id) {
    if (!IS_SUPABASE) {
      throw new Error('Archive is only supported on the Supabase backend.')
    }
    await apiClient.patch(`/rest/v1/products?id=eq.${id}`, {
      deleted_at: new Date().toISOString(),
    })
    invalidateCatalog()
    return { success: true }
  }

  /**
   * Restore produk dari arsip (deleted_at = null).
   */
  async restoreGun(id) {
    if (!IS_SUPABASE) {
      throw new Error('Restore is only supported on the Supabase backend.')
    }
    await apiClient.patch(`/rest/v1/products?id=eq.${id}`, {
      deleted_at: null,
    })
    invalidateCatalog()
    return { success: true }
  }

  /**
   * Hard delete — hapus PERMANEN dari database
   * (favorites & reviews ikut terhapus lewat ON DELETE CASCADE).
   */
  async deleteGun(id) {
    if (IS_SUPABASE) {
      await apiClient.delete(`/rest/v1/products?id=eq.${id}`)
      invalidateCatalog()
      return { success: true }
    }
    return apiClient.delete(`/api/v1/recipes/${id}`)
  }
}

export default new GunService()