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

// Lightweight client-side routing via the History API — no router library
// needed at this size. Keeps the URL in sync with what's on screen so
// refreshing or using the browser back/forward buttons lands back on the
// same page instead of always resetting to the home screen.
function routeFromLocation() {
  const path = window.location.pathname
  const setMatch = path.match(/^\/sets\/([^/]+)\/?$/)
  if (setMatch) {
    return { view: 'search', selectedSetId: decodeURIComponent(setMatch[1]), viewingArtist: null }
  }
  const artistMatch = path.match(/^\/artist\/([^/]+)\/?$/)
  if (artistMatch) {
    return { view: 'search', selectedSetId: null, viewingArtist: decodeURIComponent(artistMatch[1]) }
  }
  if (path === '/binder') return { view: 'dashboard', selectedSetId: null, viewingArtist: null }
  if (path === '/login') return { view: 'login', selectedSetId: null, viewingArtist: null }
  return { view: 'search', selectedSetId: null, viewingArtist: null }
}

function pathFor(route) {
  if (route.selectedSetId) return `/sets/${encodeURIComponent(route.selectedSetId)}`
  if (route.viewingArtist) return `/artist/${encodeURIComponent(route.viewingArtist)}`
  if (route.view === 'dashboard') return '/binder'
  if (route.view === 'login') return '/login'
  return '/'
}

function App() {
  const initialRoute = routeFromLocation()
  const [session, setSession] = useState(null)
  const [loadingSession, setLoadingSession] = useState(true)
  const [selectedSetId, setSelectedSetId] = useState(initialRoute.selectedSetId)
  const [passwordRecovery, setPasswordRecovery] = useState(false)
  const [view, setView] = useState(initialRoute.view)
  const [viewingArtist, setViewingArtist] = useState(initialRoute.viewingArtist)

  function navigate(updates, { replace = false } = {}) {
    const nextRoute = {
      view: 'view' in updates ? updates.view : view,
      selectedSetId: 'selectedSetId' in updates ? updates.selectedSetId : selectedSetId,
      viewingArtist: 'viewingArtist' in updates ? updates.viewingArtist : viewingArtist,
    }
    const path = pathFor(nextRoute)
    if (path !== window.location.pathname) {
      if (replace) window.history.replaceState(null, '', path)
      else window.history.pushState(null, '', path)
    }
    setView(nextRoute.view)
    setSelectedSetId(nextRoute.selectedSetId)
    setViewingArtist(nextRoute.viewingArtist)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoadingSession(false)
    })

    // Only force a navigation change on a real sign-in/out transition, not
    // on the initial session hydration or a background token refresh —
    // otherwise every page refresh would bounce a logged-in user off
    // whatever page they were on back to the dashboard/home screen.
    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession)
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true)
      if (event === 'SIGNED_IN') {
        navigate({ view: 'dashboard', selectedSetId: null, viewingArtist: null })
      } else if (event === 'SIGNED_OUT') {
        navigate({ view: 'search', selectedSetId: null, viewingArtist: null }, { replace: true })
      }
    })

    function onPopState() {
      const route = routeFromLocation()
      setView(route.view)
      setSelectedSetId(route.selectedSetId)
      setViewingArtist(route.viewingArtist)
    }
    window.addEventListener('popstate', onPopState)

    return () => {
      listener.subscription.unsubscribe()
      window.removeEventListener('popstate', onPopState)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function requireLogin() {
    navigate({ view: 'login', selectedSetId: null, viewingArtist: null })
  }

  function goHome() {
    navigate({ view: 'search', selectedSetId: null, viewingArtist: null })
  }

  function goToDashboard() {
    navigate({ view: 'dashboard', selectedSetId: null, viewingArtist: null })
  }

  function viewSet(setId) {
    navigate({ selectedSetId: setId, viewingArtist: null })
  }

  function viewArtist(artist) {
    navigate({ selectedSetId: null, viewingArtist: artist })
  }

  function backFromSet() {
    navigate({ selectedSetId: null })
  }

  function backFromArtist() {
    navigate({ viewingArtist: null })
  }

  function renderPage() {
    if (loadingSession) return <p className="status">Loading...</p>
    if (passwordRecovery) return <ResetPassword onDone={() => setPasswordRecovery(false)} />

    if (viewingArtist) {
      return <ArtistWorks artist={viewingArtist} onBack={backFromArtist} />
    }

    if (selectedSetId) {
      return (
        <SetDetail
          session={session}
          setId={selectedSetId}
          onBack={backFromSet}
          onViewArtist={viewArtist}
          onRequireLogin={requireLogin}
        />
      )
    }

    if (view === 'login') {
      return <Login onCancel={goHome} />
    }

    if (session && view === 'dashboard') {
      return <Dashboard session={session} onSelectSet={viewSet} onFindSets={goHome} />
    }

    return (
      <FindSets
        session={session}
        onGoToTrackedSets={() => (session ? goToDashboard() : requireLogin())}
        onRequireLogin={requireLogin}
        onViewSet={viewSet}
      />
    )
  }

  return (
    <>
      <SiteHeader
        session={session}
        onLogin={requireLogin}
        onLogout={() => supabase.auth.signOut()}
        onMyTrackedSets={goToDashboard}
        onGoHome={goHome}
      />
      {renderPage()}
    </>
  )
}

export default App
