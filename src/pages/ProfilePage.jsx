import { useState } from 'react'
import {
  Shield,
  Copy,
  Check,
  Heart,
  FileText,
  Play,
  Pencil,
  Trash2,
  ArrowRight,
  MapPin,
  Clock,
  Phone,
} from 'lucide-react'
import userService from '../services/userService'
import { useFavorites } from '../hooks/useFavorites'
import {
  getAllDraftIds,
  loadDraft,
  deleteDraft,
  getDraftTimestamp,
  formatDraftTime,
} from '../utils/draftStorage'

/**
 * Baca semua draft di localStorage jadi list siap tampil (terbaru di atas).
 */
const readDraftItems = () =>
  getAllDraftIds()
    .map((id) => {
      const draft = loadDraft(id)
      const form = draft?.formData || {}
      return {
        id,
        isCreate: id === 'create',
        name:
          form.name?.trim() ||
          (id === 'create' ? 'Produk baru (belum diberi nama)' : `Produk #${id}`),
        type: form.type || '',
        caliber: form.caliber || '',
        savedAt: draft?.savedAt || getDraftTimestamp(id),
      }
    })
    .sort((a, b) => new Date(b.savedAt || 0) - new Date(a.savedAt || 0))

/**
 * ProfilePage — ringkasan profil, draft katalog, About, dan Contact.
 * Edit profil ada di halaman terpisah (EditProfilePage).
 */
export default function ProfilePage({ onReplaySplash, onNavigate }) {
  const [profile] = useState(() => userService.getUserProfile())
  const [copied, setCopied] = useState(false)
  const [drafts, setDrafts] = useState(readDraftItems)

  const { favorites } = useFavorites()

  const handleCopyId = () => {
    if (profile.userId) {
      navigator.clipboard.writeText(profile.userId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleContinueDraft = (draft) => {
    if (!onNavigate) return
    if (draft.isCreate) {
      onNavigate('Create')
    } else {
      // EditGunPage akan fetch data produk dari id, lalu menawarkan restore draft
      onNavigate('Edit', { id: draft.id })
    }
  }

  const handleDeleteDraft = (draft) => {
    deleteDraft(draft.id)
    setDrafts(readDraftItems())
  }

  return (
    <div className="profile-page">
      <section className="masthead masthead--split">
        <div>
          <h1 className="display">Operator Profile</h1>
          <p className="lede">
            Operator credentials, procurement statistics, and armorer details.
          </p>
        </div>
        <div className="masthead-actions">
          {onNavigate && (
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => onNavigate('EditProfile')}
            >
              <Pencil size={14} /> Edit Profile
            </button>
          )}
          {onReplaySplash && (
            <button
              type="button"
              className="btn btn--outline btn--sm"
              onClick={onReplaySplash}
              title="Replay introductory splash animation"
            >
              <Play size={14} /> Replay Intro
            </button>
          )}
        </div>
      </section>

      {/* Operator Card */}
      <div className="profile-card">
        <div className="profile-card-top">
          <div className="avatar-wrap">
            {profile.avatar ? (
              <img src={profile.avatar} alt={profile.username} className="avatar-img" />
            ) : (
              <div className="avatar-placeholder">
                <Shield size={36} stroke="var(--brass)" />
              </div>
            )}
          </div>

          <div className="profile-identity">
            <h2 className="display">{profile.username || 'Shooter'}</h2>
            {profile.bio && <p className="profile-bio">{profile.bio}</p>}
            <div className="profile-id-row">
              <span className="mono-badge">{profile.userId}</span>
              <button
                type="button"
                className="icon-btn"
                onClick={handleCopyId}
                title="Copy User ID to clipboard"
              >
                {copied ? <Check size={14} color="var(--brass)" /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="profile-stats">
          <div className="stat-item">
            <Heart size={20} className="stat-icon" stroke="var(--brass)" />
            <div className="stat-val">{favorites.length}</div>
            <div className="stat-label">Procurement Favorites</div>
          </div>
          <div className="stat-item">
            <FileText size={20} className="stat-icon" stroke="var(--steel)" />
            <div className="stat-val">{drafts.length}</div>
            <div className="stat-label">Saved Offline Drafts</div>
          </div>
        </div>
      </div>

      {/* Drafts */}
      <section className="profile-section">
        <h3 className="section-title">Drafts</h3>
        <p className="profile-section-desc">
          Katalog yang belum selesai disimpan. Lanjutkan editing atau hapus drafnya.
        </p>

        {drafts.length === 0 ? (
          <p className="profile-empty">Belum ada draft.</p>
        ) : (
          <ul className="draft-list">
            {drafts.map((draft) => (
              <li key={draft.id} className="draft-item">
                <div className="draft-info">
                  <span className="draft-name display">{draft.name}</span>
                  <span className="draft-meta">
                    {draft.isCreate ? 'Produk baru' : 'Edit produk'}
                    {draft.type ? ` · ${draft.type}` : ''}
                    {draft.caliber ? ` · ${draft.caliber}` : ''}
                  </span>
                  {draft.savedAt && (
                    <span className="draft-meta">
                      Disimpan {formatDraftTime(draft.savedAt)}
                    </span>
                  )}
                </div>
                <div className="draft-actions">
                  <button
                    type="button"
                    className="btn btn--outline btn--sm"
                    onClick={() => handleContinueDraft(draft)}
                  >
                    Lanjutkan <ArrowRight size={14} />
                  </button>
                  <button
                    type="button"
                    className="btn btn--danger-ghost"
                    onClick={() => handleDeleteDraft(draft)}
                    title="Hapus draft"
                    aria-label={`Hapus draft ${draft.name}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* About */}
      <section className="profile-section">
        <h3 className="section-title">About</h3>
        <h4 className="display profile-about-title">A one-room armory.</h4>
        <p className="lede">
          Bore &amp; Barrel sells a short, honest list of firearms. Each piece is priced
          from the bench — no markup theatre, no filler.
        </p>
      </section>

      {/* Contact */}
      <section className="profile-section">
        <h3 className="section-title">Contact</h3>
        <h4 className="display profile-about-title">Come by the shop.</h4>
        <ul className="contact-list">
          <li><MapPin size={16} /> 123 Range Road</li>
          <li><Clock size={16} /> Open Tuesday to Saturday, 10 to 6</li>
          <li><Phone size={16} /> (555) 010-0100</li>
        </ul>
      </section>
    </div>
  )
}