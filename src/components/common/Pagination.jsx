import { ChevronLeft, ChevronRight } from 'lucide-react'

// Bikin daftar halaman: 1 … 4 5 6 … 20
const buildPages = (page, totalPages) => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }
  const wanted = new Set([1, totalPages, page - 1, page, page + 1])
  const sorted = [...wanted]
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b)

  const result = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) result.push('gap')
    result.push(p)
  })
  return result
}

/**
 * @param {Object}   props
 * @param {number}   props.page        — halaman aktif (mulai 1)
 * @param {number}   props.totalPages
 * @param {Function} props.onPage      — (page) => void
 * @param {boolean}  [props.disabled]
 */
export default function Pagination({ page, totalPages, onPage, disabled = false }) {
  if (totalPages <= 1) return null

  const items = buildPages(page, totalPages)

  return (
    <nav className="pagination" aria-label="Pagination">
      <button
        type="button"
        className="pagination__btn"
        onClick={() => onPage(page - 1)}
        disabled={disabled || page <= 1}
        aria-label="Previous page"
      >
        <ChevronLeft size={16} />
      </button>

      {items.map((item, i) =>
        item === 'gap' ? (
          <span key={`gap-${i}`} className="pagination__gap">…</span>
        ) : (
          <button
            key={item}
            type="button"
            className={`pagination__btn${item === page ? ' pagination__btn--active' : ''}`}
            onClick={() => onPage(item)}
            disabled={disabled}
            aria-current={item === page ? 'page' : undefined}
          >
            {item}
          </button>
        ),
      )}

      <button
        type="button"
        className="pagination__btn"
        onClick={() => onPage(page + 1)}
        disabled={disabled || page >= totalPages}
        aria-label="Next page"
      >
        <ChevronRight size={16} />
      </button>
    </nav>
  )
}