export default function SiteHeader({ session, onLogin, onLogout, onMyTrackedSets }) {
  return (
    <header className="site-header">
      <div className="site-logo-mark">PT</div>
      <span className="site-wordmark">
        Poke<span>Tracker</span>
      </span>

      <nav className="site-header-nav">
        {session ? (
          <>
            <span className="user-email">{session.user.email}</span>
            <button onClick={onMyTrackedSets}>My Tracked Sets</button>
            <button onClick={onLogout}>Log out</button>
          </>
        ) : (
          <button onClick={onLogin}>Log in / Register</button>
        )}
      </nav>
    </header>
  )
}
