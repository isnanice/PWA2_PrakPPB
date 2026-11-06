import { useState } from 'react'
import { Archive, Loader, AlertCircle, RotateCcw, Trash2 } from 'lucide-react'
import { useArchivedGuns } from '../hooks/useGuns'
import gunService from '../services/gunService'
import ConfirmModal from '../components/modals/ConfirmModal'
import { formatPrice } from '../utils/helpers'

/**
 * ArchivePage — daftar produk yang di-soft delete.
 * Aksi: Restore (balik ke katalog) atau Delete Permanently (hapus dari DB).
 */
export default function ArchivePage() {
  const { guns, loading, error, refetch } = useArchivedGuns()
  const [busyId, setBusyId] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [message, setMessage] = useState('')
  const [actionError, setActionError] = useState('')

  const flash = (text) => {
    setMessage(text)
    setTimeout(() => setMessage(''), 3500)
  }

  const handleRestore = async (gun) => {
    try {
      setBusyId(gun.id)
      setActionError('')
      await gunService.restoreGun(gun.id)
      flash(`"${gun.name}" dikembalikan ke katalog.`)
      await refetch()
    } catch (err) {
      setActionError(err.message || 'Failed to restore.')
    } finally {
      setBusyId(null)
    }
  }

  const handleDeleteForever = async () => {
    if (!deleteTarget) return
    try {
      setBusyId(deleteTarget.id)
      setActionError('')
      await gunService.deleteGun(deleteTarget.id)
      flash(`"${deleteTarget.name}" dihapus permanen.`)
      setDeleteTarget(null)
      await refetch()
    } catch (err) {
      setActionError(err.message || 'Failed to delete.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="archive-page">
      <section className="masthead">
        <h1 className="display">Archive</h1>
        <p className="lede">
          Produk yang diarsipkan tidak muncul di katalog. Restore untuk
          mengembalikan, atau hapus permanen (tidak bisa dibatalkan).
        </p>
      </section>

      <section>
        <div className="list-head">
          <h2>Archived items</h2>
          <span className="count">
            {guns.length} item{guns.length !== 1 ? 's' : ''}
          </span>
        </div>

        {message && <div className="toast toast--success">{message}</div>}
        {actionError && <div className="toast toast--error">{actionError}</div>}

        {loading && (
          <div className="state-box">
            <Loader size={28} className="spin" />
            <p>Loading archive…</p>
          </div>
        )}

        {!loading && error && (
          <div className="state-box state-box--error">
            <AlertCircle size={28} />
            <p>{error}</p>
            <button type="button" className="btn btn--outline" onClick={refetch}>
              Retry
            </button>
          </div>
        )}

        {!loading && !error && guns.length === 0 && (
          <div className="state-box">
            <Archive size={32} />
            <p>Archive kosong.</p>
          </div>
        )}

        {guns.length > 0 && (
          <ul className="archive-list">
            {guns.map((gun) => (
              <li key={gun.id} className="archive-item">
                <img
                  className="archive-thumb"
                  src={gun.image_url}
                  alt={gun.name}
                  loading="lazy"
                />
                <div className="archive-info">
                  <span className="archive-name display">{gun.name}</span>
                  <span className="archive-meta">
                    {gun.type} · {gun.caliber} · {formatPrice(gun.price)}
                  </span>
                  <span className="archive-meta">
                    Diarsipkan {gun.deleted_at ? new Date(gun.deleted_at).toLocaleString() : ''}
                  </span>
                </div>
                <div className="archive-actions">
                  <button
                    type="button"
                    className="btn btn--outline btn--sm"
                    onClick={() => handleRestore(gun)}
                    disabled={busyId === gun.id}
                  >
                    <RotateCcw size={14} /> Restore
                  </button>
                  <button
                    type="button"
                    className="btn btn--danger btn--sm"
                    onClick={() => setDeleteTarget(gun)}
                    disabled={busyId === gun.id}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Permanently"
        message={`"${deleteTarget?.name}" akan dihapus selamanya beserta review dan favoritnya. Aksi ini tidak bisa dibatalkan.`}
        confirmLabel="Delete Forever"
        danger
        loading={busyId !== null && busyId === deleteTarget?.id}
        onConfirm={handleDeleteForever}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}