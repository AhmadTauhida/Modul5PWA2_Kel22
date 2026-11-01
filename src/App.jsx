import { useState, useEffect } from 'react'
import { Loader, AlertCircle } from 'lucide-react'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import Catalog from './pages/Catalog.jsx'
import FavoritesPage from './pages/FavoritesPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import CreateGunPage from './pages/CreateGunPage.jsx'
import EditGunPage from './pages/EditGunPage.jsx'
import GunDetail from './components/gun/GunDetail.jsx'
import About from './pages/About.jsx'
import Contact from './pages/Contact.jsx'
import TrashPage from './pages/TrashPage.jsx'
import PWABadge from './components/PWABadge.jsx'
import ConfirmModal from './components/modals/ConfirmModal.jsx'
import SplashScreen from './components/common/SplashScreen.jsx'
import gunService from './services/gunService.js'
import GUNS_LOCAL from './data/guns.js'
import { useTrash } from './hooks/useTrash.js'
import { isGunTrashed, isGunPurged } from './utils/trashStorage.js'
import {
  getSharedGunId,
  syncGunShareUrl,
  clearGunShareUrl,
} from './utils/share.js'
import './App.css'

const findLocalGun = (id) => {
  const direct = GUNS_LOCAL.find(
    (g) => g.id !== undefined && g.id !== null && String(g.id) === String(id),
  )
  if (direct) return direct

  const key = String(id)
  if (!key.startsWith('local-')) return null

  const index = Number(key.slice('local-'.length))
  if (!Number.isInteger(index) || index < 0 || index >= GUNS_LOCAL.length) {
    return null
  }
  return { ...GUNS_LOCAL[index], id: `local-${index}` }
}

function App() {
  const [showSplash, setShowSplash] = useState(() => !getSharedGunId())
  const [tab, setTab] = useState('Catalog')
  const [mode, setMode] = useState('list') // 'list' | 'create' | 'edit' | 'detail'
  const [selectedGun, setSelectedGun] = useState(null)
  const [editingGun, setEditingGun] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [sharedGunLoading, setSharedGunLoading] = useState(() => {
    const id = getSharedGunId()
    if (!id) return false
    return !(isGunTrashed(id) || isGunPurged(id))
  })
  const [sharedGunError, setSharedGunError] = useState(() => {
    const id = getSharedGunId()
    if (!id) return ''
    return isGunTrashed(id) || isGunPurged(id)
      ? 'This product has been removed from the catalog.'
      : ''
  })
  const { moveToTrash } = useTrash()

  // Resolve a shared product link (?gun=<id>) on first load.
  useEffect(() => {
    const sharedId = getSharedGunId()
    if (!sharedId) return undefined

    if (isGunTrashed(sharedId) || isGunPurged(sharedId)) {
      return undefined
    }

    let cancelled = false

    const loadSharedGun = async () => {
      setSharedGunLoading(true)
      setSharedGunError('')

      const localGun = findLocalGun(sharedId)
      if (localGun) {
        if (!cancelled) {
          setTab('Catalog')
          setSelectedGun(localGun)
          setMode('detail')
          setSharedGunLoading(false)
        }
        return
      }

      try {
        const result = await gunService.getGunById(sharedId)
        const gun = result?.data ?? result
        if (!gun || !gun.name) throw new Error('Product not found.')
        if (!cancelled) {
          setTab('Catalog')
          setSelectedGun(gun)
          setMode('detail')
        }
      } catch (err) {
        if (!cancelled) {
          setSharedGunError(
            err?.message || 'This shared link is invalid or the product no longer exists.',
          )
        }
      } finally {
        if (!cancelled) setSharedGunLoading(false)
      }
    }

    loadSharedGun()
    return () => { cancelled = true }
  }, [])

  // Unified navigation handler
  const handleNavigate = (target, payload) => {
    if (target === 'Create') {
      setMode('create')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (target === 'Edit') {
      setEditingGun(payload)
      setMode('edit')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (target === 'Detail') {
      setSelectedGun(payload)
      setMode('detail')
      syncGunShareUrl(payload)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      // Tab change
      setTab(target)
      setMode('list')
      setSelectedGun(null)
      setEditingGun(null)
      setSharedGunError('')
      clearGunShareUrl()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleBackToList = () => {
    setMode('list')
    setSelectedGun(null)
    setEditingGun(null)
    clearGunShareUrl()
  }

  return (
    <div className="shell">
      {showSplash && (
        <SplashScreen onFinish={() => setShowSplash(false)} />
      )}

      <Header
        tab={mode === 'list' ? tab : ''}
        onTab={(newTab) => handleNavigate(newTab)}
        onNavigateCreate={() => handleNavigate('Create')}
      />

      <main className="main">
        {/* Shared product link resolution */}
        {mode === 'list' && sharedGunLoading && (
          <div className="state-box">
            <Loader size={28} className="spin" />
            <p>Loading shared product…</p>
          </div>
        )}

        {mode === 'list' && !sharedGunLoading && sharedGunError && (
          <div className="state-box state-box--error">
            <AlertCircle size={28} />
            <p>{sharedGunError}</p>
            <button
              type="button"
              className="btn btn--outline"
              onClick={() => {
                setSharedGunError('')
                clearGunShareUrl()
              }}
            >
              Back to Catalog
            </button>
          </div>
        )}

        {/* Sub-page views */}
        {mode === 'create' && (
          <CreateGunPage
            onBack={handleBackToList}
            onSuccess={() => {
              handleBackToList()
              setTab('Catalog')
            }}
          />
        )}

        {mode === 'edit' && (
          <EditGunPage
            gun={editingGun}
            gunId={editingGun?.id}
            onBack={handleBackToList}
            onSuccess={() => {
              handleBackToList()
              setTab('Catalog')
            }}
          />
        )}

        {mode === 'detail' && selectedGun && (
          <GunDetail
            gun={selectedGun}
            onBack={handleBackToList}
            onEdit={(g) => handleNavigate('Edit', g)}
            onDelete={(g) => setDeleteTarget(g)}
          />
        )}

        {/* Top-level Tabs */}
        {mode === 'list' && !sharedGunLoading && !sharedGunError && (
          <>
            {tab === 'Catalog' && (
              <Catalog
                onNavigate={(destination, payload) => handleNavigate(destination, payload)}
              />
            )}
            {tab === 'Favorites' && (
              <FavoritesPage
                onSelectGun={(g) => handleNavigate('Detail', g)}
                onNavigateCatalog={() => setTab('Catalog')}
              />
            )}
            {tab === 'Trash' && (
              <TrashPage onNavigateCatalog={() => setTab('Catalog')} />
            )}
            {tab === 'Profile' && (
              <ProfilePage onReplaySplash={() => setShowSplash(true)} />
            )}
            {tab === 'About' && <About />}
            {tab === 'Contact' && <Contact />}
          </>
        )}
      </main>

      {/* Global soft delete confirmation */}
      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Move Product to Trash"
        message={`Move "${deleteTarget?.name}" to Trash? You can restore it or delete it permanently from the Trash page.`}
        confirmLabel="Move to Trash"
        danger
        onConfirm={() => {
          if (!deleteTarget) return
          moveToTrash(deleteTarget)
          setDeleteTarget(null)
          handleBackToList()
          setTab('Catalog')
        }}
        onCancel={() => setDeleteTarget(null)}
      />

      <PWABadge />
      <Footer />
    </div>
  )
}

export default App
