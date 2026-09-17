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
  const [demoMode, setDemoMode] = useState(false)
  const [view, setView] = useState('search') // 'search' | 'dashboard', only meaningful when logged in
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
      setView('search')
      setViewingArtist(null)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  function renderPage() {
    if (loadingSession) return <p className="status">Loading...</p>
    if (passwordRecovery) return <ResetPassword onDone={() => setPasswordRecovery(false)} />
    if (!session && !demoMode) return <Login onDemo={() => setDemoMode(true)} />

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
        />
      )
    }

    if (session && view === 'search') {
      return <FindSets session={session} onGoToTrackedSets={() => setView('dashboard')} />
    }

    return (
      <Dashboard
        session={session}
        onSelectSet={setSelectedSetId}
        onExitDemo={demoMode ? () => setDemoMode(false) : null}
        onFindSets={() => setView('search')}
      />
    )
  }

  return (
    <>
      <SiteHeader />
      {renderPage()}
    </>
  )
}

export default App
