import { useState, useMemo, useEffect } from 'react'
import { RefreshCw, Plus, Loader, AlertCircle, PackageOpen } from 'lucide-react'
import { useGuns } from '../hooks/useGuns'
import GUNS_LOCAL from '../data/guns'
import GunCard from '../components/gun/GunCard'
import GunDetail from '../components/gun/GunDetail'
import AdvancedFilter from '../components/common/AdvancedFilter'
import Pagination from '../components/common/Pagination'
import ConfirmModal from '../components/modals/ConfirmModal'
import gunService from '../services/gunService'
import { matchesSearch, matchesCategory, sortItems } from '../utils/helpers'

const PAGE_SIZE = 9
// Kategori statis: dengan paginasi server-side, kategori tidak bisa
// diambil dari 1 halaman data saja.
const CATEGORY_OPTIONS = ['All', 'Pistol', 'Rifle', 'Shotgun', 'Submachine Gun']

/**
 * Catalog page — the main product listing.
 *
 * Data source priority:
 *   1. Live API via useGuns() (paginasi, search, filter, sort di server)
 *   2. Local static array (GUNS_LOCAL) when the API is unreachable
 *
 * Features: pagination, search (debounced), category filter, sort,
 * archive (soft delete), detail view.
 */
export default function Catalog({ onNavigate }) {
  // ---- filters / sort / page ----
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [sortKey, setSortKey] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')
  const [page, setPage] = useState(1)
  const [useLocal, setUseLocal] = useState(false)

  // Debounce search 350ms biar tidak request di tiap ketikan
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim())
      setPage(1)
    }, 350)
    return () => clearTimeout(t)
  }, [search])

  const params = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      search: debouncedSearch,
      category: activeCategory,
      sort_by: sortKey,
      order: sortOrder,
    }),
    [page, debouncedSearch, activeCategory, sortKey, sortOrder],
  )

  // ---- API data ----
  const { guns: apiGuns, loading, error, pagination, refetch } = useGuns(params)

  const isLocal = useLocal || (Boolean(error) && apiGuns.length === 0)

  // Mode lokal: filter + sort + potong halaman di sisi client
  const localSorted = useMemo(() => {
    if (!isLocal) return []
    const all = GUNS_LOCAL.map((g, i) => ({ ...g, id: g.id || `local-${i}` })).filter(
      (g) => matchesSearch(g, debouncedSearch) && matchesCategory(g, activeCategory),
    )
    return sortItems(all, sortKey, sortOrder)
  }, [isLocal, debouncedSearch, activeCategory, sortKey, sortOrder])

  const total = isLocal ? localSorted.length : pagination?.total ?? apiGuns.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const displayGuns = isLocal
    ? localSorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    : apiGuns

  // Kalau halaman terakhir jadi kosong (mis. setelah diarsipkan), mundur
  useEffect(() => {
    if (!loading && page > totalPages) setPage(totalPages)
  }, [loading, page, totalPages])

  const handleCategory = (cat) => {
    setActiveCategory(cat)
    setPage(1)
  }

  const handleSort = ({ key, order }) => {
    setSortKey(key)
    setSortOrder(order)
    setPage(1)
  }

  const handlePage = (next) => {
    setPage(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ---- detail view ----
  const [selectedGun, setSelectedGun] = useState(null)

  // ---- archive (soft delete) ----
  const [archiveTarget, setArchiveTarget] = useState(null)
  const [archiving, setArchiving] = useState(false)
  const [actionError, setActionError] = useState('')
  const [notice, setNotice] = useState('')

  const handleArchive = async () => {
    if (!archiveTarget) return
    try {
      setArchiving(true)
      setActionError('')

      if (String(archiveTarget.id).startsWith('local-')) {
        throw new Error('Item lokal tidak bisa diarsipkan.')
      }

      await gunService.archiveGun(archiveTarget.id)
      setNotice(`"${archiveTarget.name}" dipindahkan ke Archive.`)
      setTimeout(() => setNotice(''), 4000)
      setArchiveTarget(null)
      refetch()
    } catch (err) {
      setActionError(err.message || 'Failed to archive.')
    } finally {
      setArchiving(false)
    }
  }

  // ---- If viewing a single product detail ----
  if (selectedGun) {
    return (
      <GunDetail
        gun={selectedGun}
        onBack={() => setSelectedGun(null)}
        onEdit={(g) => onNavigate && onNavigate('Edit', g)}
        onDelete={(g) => { setSelectedGun(null); setArchiveTarget(g) }}
      />
    )
  }

  // ---- Main catalog view ----
  return (
    <>
      <section className="masthead">
        <h1 className="display">Hardware, by the spec sheet.</h1>
        <p className="lede">
          A small armory of pistols, rifles, and shotguns. Every piece listed
          with its type, caliber, and price — nothing else.
        </p>
      </section>

      <section>
        <div className="list-head">
          <h2>Current stock</h2>
          <div className="list-head-right">
            <span className="count">
              {total} piece{total !== 1 ? 's' : ''}
            </span>
            {onNavigate && (
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => onNavigate('Create')}
              >
                <Plus size={16} /> Add
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <AdvancedFilter
          search={search}
          onSearch={setSearch}
          categories={CATEGORY_OPTIONS}
          activeCategory={activeCategory}
          onCategory={handleCategory}
          sortKey={sortKey}
          sortOrder={sortOrder}
          onSort={handleSort}
        />

        {notice && <div className="toast toast--success">{notice}</div>}

        {/* States */}
        {loading && displayGuns.length === 0 && (
          <div className="state-box">
            <Loader size={28} className="spin" />
            <p>Loading products…</p>
          </div>
        )}

        {!loading && error && !useLocal && (
          <div className="state-box state-box--error">
            <AlertCircle size={28} />
            <p>{error}</p>
            <div className="state-box__actions">
              <button type="button" className="btn btn--outline" onClick={refetch}>
                <RefreshCw size={16} /> Retry
              </button>
              <button
                type="button"
                className="btn btn--outline"
                onClick={() => setUseLocal(true)}
              >
                View Local Catalog
              </button>
            </div>
          </div>
        )}

        {!loading && displayGuns.length === 0 && !error && (
          <div className="state-box">
            <PackageOpen size={28} />
            <p>No products match your search.</p>
          </div>
        )}

        {/* Product grid */}
        {displayGuns.length > 0 && (
          <ul className={`stock${loading ? ' stock--loading' : ''}`}>
            {displayGuns.map((gun) => (
              <GunCard
                key={gun.id || gun.name}
                gun={gun}
                onSelect={setSelectedGun}
                onEdit={onNavigate ? (g) => onNavigate('Edit', g) : undefined}
                onDelete={setArchiveTarget}
              />
            ))}
          </ul>
        )}

        <Pagination
          page={page}
          totalPages={totalPages}
          onPage={handlePage}
          disabled={loading}
        />

        {useLocal && (
          <p className="local-notice">
            Showing local catalog (server unavailable).{' '}
            <button
              type="button"
              className="link-btn"
              onClick={() => { setUseLocal(false); refetch() }}
            >
              Retry server
            </button>
          </p>
        )}
      </section>

      {/* Archive confirmation */}
      <ConfirmModal
        open={!!archiveTarget}
        title="Archive Product"
        message={`"${archiveTarget?.name}" akan dipindahkan ke Archive. Kamu masih bisa restore atau hapus permanen dari sana.`}
        confirmLabel="Archive"
        loading={archiving}
        onConfirm={handleArchive}
        onCancel={() => { setArchiveTarget(null); setActionError('') }}
      />
      {actionError && (
        <div className="toast toast--error">{actionError}</div>
      )}
    </>
  )
}