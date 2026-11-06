// ---------------------------------------------------------------------------
// shareLink.js — bikin & baca link unik untuk berbagi produk.
// Format: https://domain-kamu.vercel.app/?gun=<id>
// Pakai query string (bukan /gun/:id) supaya tidak butuh vercel.json rewrite.
// ---------------------------------------------------------------------------

const PARAM = 'gun'

export const isShareable = (gun) =>
  Boolean(gun && gun.id) && !String(gun.id).startsWith('local-')

export const buildShareUrl = (id) =>
  `${window.location.origin}/?${PARAM}=${encodeURIComponent(id)}`

export const readSharedGunId = () => {
  try {
    return new URLSearchParams(window.location.search).get(PARAM)
  } catch {
    return null
  }
}

export const clearSharedGunParam = () => {
  try {
    if (window.location.search.includes(`${PARAM}=`)) {
      window.history.replaceState(null, '', window.location.pathname)
    }
  } catch {
    /* abaikan */
  }
}