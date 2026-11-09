import { useState } from 'react'
import { ArrowLeft, Camera, Save, Check, AlertCircle } from 'lucide-react'
import userService from '../services/userService'

export default function EditProfilePage({ onBack, onSuccess }) {
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
      setFeedback('Avatar selected.')
    }
    reader.readAsDataURL(file)
  }

  const handleSaveProfile = (e) => {
    e.preventDefault()
    setError('')

    const result = userService.saveUserProfile({
      ...profile,
      username: username.trim() || 'Shooter',
      bio: bio.trim(),
      avatar,
    })

    if (!result.success) {
      setError('Failed to save profile.')
      return
    }

    setFeedback('Profile successfully updated.')
    setTimeout(() => onSuccess?.(result.data), 500)
  }

  return (
    <div className="profile-page">
      <section className="masthead">
        <button type="button" className="detail-back" onClick={onBack}>
          <ArrowLeft size={18} /> Back to Profile
        </button>
        <h1 className="display">Edit Operator Profile</h1>
        <p className="lede">Update your operator alias, station bio, and avatar.</p>
      </section>

      {feedback && (
        <div className="toast toast--success">
          <Check size={18} /> {feedback}
        </div>
      )}

      {error && (
        <div className="toast toast--error">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      <form onSubmit={handleSaveProfile} className="profile-form">
        <div className="edit-profile-avatar">
          <div className="avatar-wrap">
            {avatar ? (
              <img src={avatar} alt={username || 'Operator'} className="avatar-img" />
            ) : (
              <div className="avatar-placeholder">No avatar</div>
            )}
            <label htmlFor="edit-avatar-input" className="avatar-upload-btn" title="Upload avatar">
              <Camera size={14} />
              <input
                id="edit-avatar-input"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden-file-input"
              />
            </label>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="edit-prof-name" className="form-label">Callsign / Operator Alias</label>
          <input
            id="edit-prof-name"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. Operator Delta"
            className="form-input"
            maxLength={60}
          />
        </div>

        <div className="form-group">
          <label htmlFor="edit-prof-bio" className="form-label">Armory Notes / Station Bio</label>
          <textarea
            id="edit-prof-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Qualifications, preferred calibers, unit assignment..."
            rows={5}
            maxLength={500}
            className="form-textarea"
          />
        </div>

        <div className="profile-edit-actions">
          <button type="submit" className="btn btn--primary">
            <Save size={16} /> Save Profile
          </button>
          <button type="button" className="btn btn--outline" onClick={onBack}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}