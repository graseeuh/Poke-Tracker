import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import SetDetail from './pages/SetDetail'
import './App.css'

function App() {
  const [session, setSession] = useState(null)
  const [loadingSession, setLoadingSession] = useState(true)
  const [selectedSetId, setSelectedSetId] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoadingSession(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setSelectedSetId(null)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  if (loadingSession) return <p className="status">Loading...</p>
  if (!session) return <Login />

  if (selectedSetId) {
    return (
      <SetDetail
        session={session}
        setId={selectedSetId}
        onBack={() => setSelectedSetId(null)}
      />
    )
  }

  return <Dashboard session={session} onSelectSet={setSelectedSetId} />
}

export default App
