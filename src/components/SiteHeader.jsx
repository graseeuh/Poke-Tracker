export default function SiteHeader({ session, onLogin, onLogout, onMyTrackedSets, onGoHome }) {
  return (
    <header className="site-header">
      <button className="site-brand" onClick={onGoHome} aria-label="Go to search">
        <span className="site-logo-mark">PT</span>
        <span className="site-wordmark">
          Poke<span>Tracker</span>
        </span>
      </button>

      <nav className="site-header-nav">
        {session ? (
          <>
            <span className="user-email">{session.user.email}</span>
            <button onClick={onMyTrackedSets}>My Binder</button>
            <button onClick={onLogout}>Log out</button>
          </>
        ) : (
          <button onClick={onLogin}>Log in / Register</button>
        )}
      </nav>
    </header>
  )
}
