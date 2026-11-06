import { useState } from 'react'
import { ArrowLeft, Camera, Save, Shield, Check, AlertCircle } from 'lucide-react'
import userService from '../services/userService'

/**
 * EditProfilePage — halaman terpisah untuk ubah username, bio, dan avatar.
 */
export default function EditProfilePage({ onBack }) {
  const [profile] = useState(() => userService.getUserProfile())
  const [username, setUsername] = useState(profile.username || 'Shooter')
  const [bio, setBio] = useState(profile.bio || '')
  const [avatar, setAvatar] = useState(profile.avatar || null)
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      setError('Avatar image must be under 2MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      setAvatar(event.target.result)
      setError('')
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')

    const result = userService.saveUserProfile({
      ...profile,
      username: username.trim() || 'Shooter',
      bio: bio.trim(),
      avatar,
    })

    if (result.success) {
      setFeedback('Profile successfully updated.')
      setTimeout(() => onBack && onBack(), 700)
    } else {
      setError(result.message || 'Failed to save profile.')
    }
  }

  return (
    <div className="form-page">
      <div className="form-head">
        <button type="button" className="detail-back" onClick={onBack}>
          <ArrowLeft size={18} /> Back to Profile
        </button>
      </div>

      <div className="form-title-group">
        <h1 className="display">Edit Profile</h1>
        <p className="lede">Ubah callsign, bio, dan foto profil kamu.</p>
      </div>

      {error && (
        <div className="toast toast--error">
          <AlertCircle size={18} /> {error}
        </div>
      )}
      {feedback && (
        <div className="toast toast--success">
          <Check size={18} /> {feedback}
        </div>
      )}

      <form onSubmit={handleSubmit} className="entry-form">
        <div className="card-box edit-profile-avatar">
          <div className="avatar-wrap">
            {avatar ? (
              <img src={avatar} alt="Avatar preview" className="avatar-img" />
            ) : (
              <div className="avatar-placeholder">
                <Shield size={36} stroke="var(--brass)" />
              </div>
            )}
            <label htmlFor="avatar-file-input" className="avatar-upload-btn" title="Upload avatar">
              <Camera size={14} />
              <input
                id="avatar-file-input"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden-file-input"
              />
            </label>
          </div>
          {avatar && (
            <button
              type="button"
              className="btn btn--outline btn--sm"
              onClick={() => setAvatar(null)}
            >
              Remove photo
            </button>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="prof-name" className="form-label">
            Callsign / Operator Alias
          </label>
          <input
            id="prof-name"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. Operator Delta, Master Gunsmith"
            maxLength={30}
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="prof-bio" className="form-label">
            Armory Notes / Station Bio
          </label>
          <textarea
            id="prof-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Qualifications, preferred calibers, unit assignment..."
            rows={3}
            maxLength={200}
            className="form-textarea"
          />
        </div>

        <div className="form-actions-bar">
          <button type="button" className="btn btn--outline" onClick={onBack}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary">
            <Save size={16} /> Save Profile
          </button>
        </div>
      </form>
    </div>
  )
}