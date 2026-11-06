// ---------------------------------------------------------------------------
// whatsapp.js — bikin link "Hubungi Penjual" ke WhatsApp (wa.me).
// Nomor penjual diambil dari .env: VITE_WA_NUMBER
// ---------------------------------------------------------------------------

import { buildShareUrl, isShareable } from './shareLink'
import { formatPrice } from './helpers'

// Normalisasi nomor: buang selain angka, ubah awalan 0 jadi 62 (Indonesia)
const normalizeNumber = (raw) => {
  const digits = String(raw || '').replace(/\D/g, '')
  if (digits.startsWith('0')) return `62${digits.slice(1)}`
  return digits
}

export const SELLER_NUMBER = normalizeNumber(import.meta.env.VITE_WA_NUMBER)

export const hasSellerNumber = () => Boolean(SELLER_NUMBER)

export const buildWhatsAppUrl = (gun) => {
  const lines = [
    `Halo, saya tertarik dengan *${gun.name}* (${formatPrice(gun.price ?? gun.cook_time ?? 0)}).`,
    'Apakah masih tersedia?',
  ]
  if (isShareable(gun)) lines.push(`Link: ${buildShareUrl(gun.id)}`)

  return `https://wa.me/${SELLER_NUMBER}?text=${encodeURIComponent(lines.join('\n'))}`
}