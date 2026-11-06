import { useState, useEffect } from 'react'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import Catalog from './pages/Catalog.jsx'
import FavoritesPage from './pages/FavoritesPage.jsx'
import ArchivePage from './pages/ArchivePage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import EditProfilePage from './pages/EditProfilePage.jsx'
import CreateGunPage from './pages/CreateGunPage.jsx'
import EditGunPage from './pages/EditGunPage.jsx'
import GunDetail from './components/gun/GunDetail.jsx'
import PWABadge from './components/PWABadge.jsx'
import ConfirmModal from './components/modals/ConfirmModal.jsx'
import SplashScreen from './components/common/SplashScreen.jsx'
import gunService from './services/gunService.js'
import { readSharedGunId, clearSharedGunParam } from './utils/shareLink.js'
import './App.css'
import './App.challenge.css'

function App() {
  const [showSplash, setShowSplash] = useState(true)
  const [tab, setTab] = useState('Catalog')
  // 'list' | 'create' | 'edit' | 'detail' | 'edit-profile'
  const [mode, setMode] = useState('list')
  const [selectedGun, setSelectedGun] = useState(null)
  const [editingGun, setEditingGun] = useState(null)
  const [archiveTarget, setArchiveTarget] = useState(null)
  const [archiving, setArchiving] = useState(false)
  const [linkState, setLinkState] = useState({ loading: false, error: '' })

  // Buka produk langsung kalau URL berisi ?gun=<id> (link hasil Share)
  useEffect(() => {
    const sharedId = readSharedGunId()
    if (!sharedId) return

    let cancelled = false
    const openSharedGun = async () => {
      setLinkState({ loading: true, error: '' })
      try {
        const res = await gunService.getGunById(sharedId)
        if (cancelled) return
        setSelectedGun(res.data)
        setMode('detail')
        setLinkState({ loading: false, error: '' })
      } catch {
        if (cancelled) return
        setLinkState({
          loading: false,
          error: 'Produk dari link ini tidak ditemukan atau sudah diarsipkan.',
        })
        clearSharedGunParam()
      }
    }
    openSharedGun()

    return () => {
      cancelled = true
    }
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
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (target === 'EditProfile') {
      setMode('edit-profile')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      // Tab change
      clearSharedGunParam()
      setLinkState((s) => ({ ...s, error: '' }))
      setTab(target)
      setMode('list')
      setSelectedGun(null)
      setEditingGun(null)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleBackToList = () => {
    clearSharedGunParam()
    setMode('list')
    setSelectedGun(null)
    setEditingGun(null)
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
        {/* Status link share */}
        {linkState.loading && (
          <div className="state-box">
            <p>Membuka produk dari link…</p>
          </div>
        )}
        {linkState.error && (
          <div className="toast toast--error">{linkState.error}</div>
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
            onDelete={(g) => setArchiveTarget(g)}
          />
        )}

        {mode === 'edit-profile' && (
          <EditProfilePage onBack={handleBackToList} />
        )}

        {/* Top-level Tabs */}
        {mode === 'list' && (
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
            {tab === 'Archive' && <ArchivePage />}
            {tab === 'Profile' && (
              <ProfilePage
                onReplaySplash={() => setShowSplash(true)}
                onNavigate={(destination, payload) => handleNavigate(destination, payload)}
              />
            )}
          </>
        )}
      </main>

      {/* Global Archive Confirmation (dari halaman detail) */}
      <ConfirmModal
        open={Boolean(archiveTarget)}
        title="Archive Hardware Record"
        message={`"${archiveTarget?.name}" akan dipindahkan ke Archive. Kamu masih bisa restore atau hapus permanen dari sana.`}
        confirmLabel="Archive"
        loading={archiving}
        onConfirm={async () => {
          if (!archiveTarget) return
          try {
            setArchiving(true)
            await gunService.archiveGun(archiveTarget.id)
            setArchiveTarget(null)
            handleBackToList()
            setTab('Catalog')
          } catch (err) {
            alert(err.message || 'Failed to archive record.')
          } finally {
            setArchiving(false)
          }
        }}
        onCancel={() => setArchiveTarget(null)}
      />

      <PWABadge />
      <Footer />
    </div>
  )
}

export default App