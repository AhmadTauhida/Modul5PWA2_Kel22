import { Plus } from 'lucide-react'
import { useFavorites } from '../hooks/useFavorites'
import { useTrash } from '../hooks/useTrash'

const NAV_ITEMS = [
  { id: 'Catalog', label: 'Catalog' },
  { id: 'Favorites', label: 'Favorites', badge: 'favorites' },
  { id: 'Trash', label: 'Trash', badge: 'trash' },
  { id: 'Profile', label: 'Profile' },
  { id: 'About', label: 'About' },
  { id: 'Contact', label: 'Contact' },
]

function Header({ tab, onTab, onNavigateCreate }) {
  const { favorites } = useFavorites()
  const { trash } = useTrash()
  const favCount = favorites ? favorites.length : 0
  const trashCount = trash.length

  return (
    <header className="header">
      <div className="header-brand-wrap" onClick={() => onTab('Catalog')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div className="header-logo-badge">
          <img src="/logo.png" alt="Bore & Barrel" />
        </div>
        <span className="brand display">Bore &amp; Barrel</span>
      </div>

      <nav className="nav">
        {NAV_ITEMS.map((item) => {
          const badgeCount =
            item.badge === 'favorites'
              ? favCount
              : item.badge === 'trash'
              ? trashCount
              : 0

          return (
            <button
              key={item.id}
              type="button"
              className={tab === item.id ? 'nav-link active' : 'nav-link'}
              onClick={() => onTab(item.id)}
            >
              {item.label}
              {badgeCount > 0 && (
                <span className="nav-badge">{badgeCount}</span>
              )}
            </button>
          )
        })}
      </nav>

      {onNavigateCreate && (
        <button
          type="button"
          className="btn btn--primary btn--sm header-cta"
          onClick={onNavigateCreate}
          title="Register new hardware"
        >
          <Plus size={15} /> Add Hardware
        </button>
      )}
    </header>
  )
}

export default Header
