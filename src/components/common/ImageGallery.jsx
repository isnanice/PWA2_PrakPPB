import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * Galeri gambar di halaman detail: gambar besar + panah + thumbnail.
 * Kalau cuma 1 gambar, tampil biasa tanpa kontrol.
 *
 * @param {Object}   props
 * @param {string[]} props.images — daftar URL gambar (urutan pertama = cover)
 * @param {string}   props.alt
 */
export default function ImageGallery({ images, alt }) {
  const list = images && images.length > 0 ? images : ['/guns/pistol.svg']
  const [index, setIndex] = useState(0)

  const current = Math.min(index, list.length - 1)
  const go = (step) => setIndex((current + step + list.length) % list.length)

  return (
    <div className="gallery">
      <div className="gallery__main">
        <img
          className="detail-img"
          src={list[current]}
          alt={list.length > 1 ? `${alt} (${current + 1}/${list.length})` : alt}
        />

        {list.length > 1 && (
          <>
            <button
              type="button"
              className="gallery__nav gallery__nav--prev"
              onClick={() => go(-1)}
              aria-label="Gambar sebelumnya"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              className="gallery__nav gallery__nav--next"
              onClick={() => go(1)}
              aria-label="Gambar berikutnya"
            >
              <ChevronRight size={18} />
            </button>
            <span className="gallery__counter">
              {current + 1} / {list.length}
            </span>
          </>
        )}
      </div>

      {list.length > 1 && (
        <div className="gallery__thumbs">
          {list.map((url, i) => (
            <button
              key={`${i}-${url.slice(-24)}`}
              type="button"
              className={`gallery__thumb${i === current ? ' gallery__thumb--active' : ''}`}
              onClick={() => setIndex(i)}
              aria-label={`Lihat gambar ${i + 1}`}
            >
              <img src={url} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}