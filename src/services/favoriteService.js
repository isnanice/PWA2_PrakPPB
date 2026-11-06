import { apiClient, IS_SUPABASE } from '../config/api'
import { normalizeProduct } from './gunService'
import { cachedQuery, invalidateQueries } from '../utils/queryCache'

// ---------------------------------------------------------------------------
// FavoriteService — server-side favourites.
// Supports both Supabase (public.favorites with products foreign key join)
// and university API (/api/v1/favorites).
//
// NOTE: When server/RLS is offline or restricted, useFavorites hook falls back
// to localStorage automatically so favorites always work.
// ---------------------------------------------------------------------------

const FAV_TTL = 30 * 1000

class FavoriteService {
  /**
   * Retrieve all favourited products for the given user.
   * Produk yang sudah diarsipkan tidak ikut ditampilkan (products!inner + filter).
   */
  async getFavorites(userIdentifier) {
    return cachedQuery(
      `favorites:${userIdentifier}`,
      async () => {
        if (IS_SUPABASE) {
          const data = await apiClient.get(
            `/rest/v1/favorites?user_id=eq.${userIdentifier}&select=product_id,created_at,products!inner(*)&products.deleted_at=is.null`,
          )
          const list = Array.isArray(data)
            ? data.map((fav) => {
                const prod = fav.products ? normalizeProduct(fav.products) : null
                return {
                  ...(prod || {}),
                  id: fav.product_id,
                  recipe_id: fav.product_id,
                  product_id: fav.product_id,
                  created_at: fav.created_at,
                }
              })
            : []

          return { success: true, data: list }
        }

        return apiClient.get('/api/v1/favorites', {
          params: { user_identifier: userIdentifier },
        })
      },
      FAV_TTL,
    )
  }

  /**
   * Toggle a product's favourite state (add <-> remove).
   * @param {Object} data  { recipe_id, user_identifier }
   */
  async toggleFavorite(data) {
    if (IS_SUPABASE) {
      const targetId = Number(data.recipe_id || data.gun_id)
      const userId = data.user_identifier

      // Check if already favorited
      const existing = await apiClient.get(
        `/rest/v1/favorites?product_id=eq.${targetId}&user_id=eq.${userId}&select=*`,
      )

      if (Array.isArray(existing) && existing.length > 0) {
        // Remove from favorites
        await apiClient.delete(
          `/rest/v1/favorites?product_id=eq.${targetId}&user_id=eq.${userId}`,
        )
        invalidateQueries('favorites:')
        return { success: true, data: { is_favorited: false } }
      } else {
        // Add to favorites
        await apiClient.post(
          '/rest/v1/favorites',
          { product_id: targetId, user_id: userId },
          { headers: { Prefer: 'return=minimal' } },
        )
        invalidateQueries('favorites:')
        return { success: true, data: { is_favorited: true } }
      }
    }

    const res = await apiClient.post('/api/v1/favorites/toggle', data)
    invalidateQueries('favorites:')
    return res
  }
}

export default new FavoriteService()