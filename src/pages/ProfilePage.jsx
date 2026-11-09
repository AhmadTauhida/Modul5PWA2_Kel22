import { useState } from 'react'
import {
  Shield,
  Copy,
  Check,
  Heart,
  FileText,
  Play,
  Info,
  MapPin,
  Clock,
  Phone,
} from 'lucide-react'
import userService from '../services/userService'
import { useFavorites } from '../hooks/useFavorites'

/**
 * Get count of active drafts in localStorage
 */
const getActiveDraftCount = () => {
  try {
    let count = 0
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.startsWith('bore_barrel_draft_') || key.startsWith('recipe_draft_'))) {
        count++
      }
    }
    return count
  } catch {
    return 0
  }
}

/**
 * ProfilePage — User identity and Armory settings.
 * Manages operator profile, identifier, favorites stats, and draft storage.
 */
export default function ProfilePage({ onReplaySplash, onEditProfile }) {
  const [profile] = useState(() => userService.getUserProfile())
  const [copied, setCopied] = useState(false)

  const { favorites } = useFavorites()
  const [draftCount] = useState(getActiveDraftCount)

  const handleCopyId = () => {
    if (profile.userId) {
      navigator.clipboard.writeText(profile.userId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="profile-page">
      <section className="masthead" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="display">Operator Profile</h1>
          <p className="lede">
            Operator credentials, procurement statistics, and armorer details.
          </p>
        </div>
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
            <div className="stat-val">{draftCount}</div>
            <div className="stat-label">Saved Offline Drafts</div>
          </div>
        </div>
      </div>

      <div className="profile-summary">
        <div>
          <h3 className="section-title">Armorer Details</h3>
          <p>{profile.bio || 'No station bio has been added yet.'}</p>
        </div>
        <button type="button" className="btn btn--outline" onClick={onEditProfile}>
          Edit Profile
        </button>
      </div>

      {/* About and contact information */}
      <section className="profile-info-grid" aria-label="About and contact">
        <article className="profile-info-section">
          <div className="profile-info-heading">
            <Info size={20} stroke="var(--brass)" />
            <h2 className="section-title">About Bore &amp; Barrel</h2>
          </div>
          <p className="profile-info-lede">A one-room armory.</p>
          <p>
            Bore &amp; Barrel sells a short, honest list of firearms. Each piece is
            priced from the bench with practical details and no filler.
          </p>
        </article>

        <article className="profile-info-section">
          <div className="profile-info-heading">
            <MapPin size={20} stroke="var(--brass)" />
            <h2 className="section-title">Contact the Shop</h2>
          </div>
          <div className="profile-contact-list">
            <p><MapPin size={16} /> 123 Range Road</p>
            <p><Clock size={16} /> Tuesday to Saturday, 10:00 to 18:00</p>
            <p><Phone size={16} /> (555) 010-0100</p>
          </div>
        </article>
      </section>
    </div>
  )
}
