import { MessageCircle } from 'lucide-react'
import { buildWhatsAppUrl, hasSellerNumber } from '../../utils/whatsapp'

/**
 * Tombol "Hubungi Penjual" -> buka WhatsApp dengan pesan otomatis.
 * Tidak tampil kalau VITE_WA_NUMBER belum diisi di .env.
 *
 * @param {Object} props
 * @param {Object} props.gun         — data produk
 * @param {string} [props.className] — kelas tombol (default: outline kecil)
 */
export default function ContactSellerButton({
  gun,
  className = 'btn btn--outline btn--sm',
}) {
  if (!hasSellerNumber()) return null

  return (
    <a
      className={className}
      href={buildWhatsAppUrl(gun)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Hubungi penjual tentang ${gun.name} lewat WhatsApp`}
    >
      <MessageCircle size={14} /> Hubungi Penjual
    </a>
  )
}