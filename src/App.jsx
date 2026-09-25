import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import SetDetail from './pages/SetDetail'
import ResetPassword from './pages/ResetPassword'
import FindSets from './pages/FindSets'
import ArtistWorks from './pages/ArtistWorks'
import SiteHeader from './components/SiteHeader'
import './App.css'

function App() {
  const [session, setSession] = useState(null)
  const [loadingSession, setLoadingSession] = useState(true)
  const [selectedSetId, setSelectedSetId] = useState(null)
  const [passwordRecovery, setPasswordRecovery] = useState(false)
  const [view, setView] = useState('search') // 'search' | 'dashboard' | 'login'
  const [viewingArtist, setViewingArtist] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoadingSession(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true)
      setSession(newSession)
      setSelectedSetId(null)
      setViewingArtist(null)
      setView(newSession ? 'dashboard' : 'search')
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  function requireLogin() {
    setSelectedSetId(null)
    setViewingArtist(null)
    setView('login')
  }

  function goHome() {
    setSelectedSetId(null)
    setViewingArtist(null)
    setView('search')
  }

  function renderPage() {
    if (loadingSession) return <p className="status">Loading...</p>
    if (passwordRecovery) return <ResetPassword onDone={() => setPasswordRecovery(false)} />

    if (viewingArtist) {
      return <ArtistWorks artist={viewingArtist} onBack={() => setViewingArtist(null)} />
    }

    if (selectedSetId) {
      return (
        <SetDetail
          session={session}
          setId={selectedSetId}
          onBack={() => setSelectedSetId(null)}
          onViewArtist={setViewingArtist}
          onRequireLogin={requireLogin}
        />
      )
    }

    if (view === 'login') {
      return <Login onCancel={() => setView('search')} />
    }

    if (session && view === 'dashboard') {
      return (
        <Dashboard
          session={session}
          onSelectSet={setSelectedSetId}
          onFindSets={() => setView('search')}
        />
      )
    }

    return (
      <FindSets
        session={session}
        onGoToTrackedSets={() => setView(session ? 'dashboard' : 'login')}
        onRequireLogin={requireLogin}
        onViewSet={setSelectedSetId}
      />
    )
  }

  return (
    <>
      <SiteHeader
        session={session}
        onLogin={() => setView('login')}
        onLogout={() => supabase.auth.signOut()}
        onMyTrackedSets={() => setView('dashboard')}
        onGoHome={goHome}
      />
      {renderPage()}
    </>
  )
}

export default App
