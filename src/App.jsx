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
  const [findingSets, setFindingSets] = useState(false)
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
      // Land on search after a fresh sign-in; otherwise leave the current view alone.
      if (event === 'SIGNED_IN') setFindingSets(true)
      else if (!newSession) setFindingSets(false)
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

    if (findingSets) {
      return <FindSets session={session} onBack={() => setFindingSets(false)} />
    }

    return (
      <Dashboard
        session={session}
        onSelectSet={setSelectedSetId}
        onExitDemo={demoMode ? () => setDemoMode(false) : null}
        onFindSets={() => setFindingSets(true)}
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
