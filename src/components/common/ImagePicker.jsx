import { useState } from 'react'
import { ImagePlus, X, Loader } from 'lucide-react'
import uploadService from '../../services/uploadService'
import { compressImage } from '../../utils/imageUtils'

const ALLOWED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const MAX_BYTES = 5 * 1024 * 1024

/**
 * Pengelola gambar tambahan (boleh pilih banyak file sekaligus).
 *
 * @param {Object}   props
 * @param {string[]} props.images    — daftar URL gambar tambahan
 * @param {Function} props.onChange  — (newImages: string[]) => void
 * @param {number}   [props.max=4]   — batas jumlah gambar tambahan
 */
export default function ImagePicker({ images, onChange, max = 4 }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || [])
    e.target.value = '' // supaya file yang sama bisa dipilih lagi
    if (files.length === 0) return

    setMessage('')
    const slots = max - images.length
    if (slots <= 0) {
      setMessage(`Maksimal ${max} gambar tambahan.`)
      return
    }

    const picked = files.slice(0, slots)
    const notes = []
    if (files.length > slots) {
      notes.push(`Hanya ${slots} gambar yang muat (maks ${max}).`)
    }

    try {
      setBusy(true)
      const urls = []

      for (const file of picked) {
        if (!ALLOWED.includes(file.type)) {
          notes.push(`${file.name}: format harus jpg, png, atau webp.`)
          continue
        }
        if (file.size > MAX_BYTES) {
          notes.push(`${file.name}: ukuran lebih dari 5MB.`)
          continue
        }
        const small = await compressImage(file)
        const res = await uploadService.uploadImage(small)
        if (res.success && res.data?.url) urls.push(res.data.url)
      }

      if (urls.length > 0) onChange([...images, ...urls])
    } catch (err) {
      notes.push(err.message || 'Gagal memproses gambar.')
    } finally {
      setBusy(false)
      setMessage(notes.join(' '))
    }
  }

  const handleRemove = (index) => {
    onChange(images.filter((_, i) => i !== index))
  }

  return (
    <div className="image-picker-wrap">
      <div className="image-picker">
        {images.map((url, i) => (
          <div key={`${i}-${url.slice(-24)}`} className="image-picker__item">
            <img src={url} alt={`Gambar tambahan ${i + 1}`} />
            <button
              type="button"
              className="image-picker__remove"
              onClick={() => handleRemove(i)}
              disabled={busy}
              aria-label={`Hapus gambar tambahan ${i + 1}`}
            >
              <X size={12} />
            </button>
          </div>
        ))}

        {busy ? (
          <div className="image-picker__add">
            <Loader size={18} className="spin" />
            <span>Memproses…</span>
          </div>
        ) : (
          images.length < max && (
            <label className="image-picker__add">
              <ImagePlus size={18} />
              <span>Tambah</span>
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                multiple
                onChange={handleFiles}
                className="hidden-file-input"
              />
            </label>
          )
        )}
      </div>

      {message && <p className="form-error">{message}</p>}
    </div>
  )
}