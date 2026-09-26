import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Login({ onCancel }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [mode, setMode] = useState('login') // 'login' | 'register' | 'forgot'
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  function switchMode(nextMode) {
    setMode(nextMode)
    setError('')
    setInfo('')
    setPassword('')
    setConfirmPassword('')
    setShowPassword(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setInfo('')

    const cleanEmail = email.trim().toLowerCase()

    if (mode === 'register' && password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      })
      if (error) setError(error.message)
    } else if (mode === 'register') {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
      })
      if (error) {
        setError(error.message)
      } else if (data.user && data.user.identities && data.user.identities.length === 0) {
        // Supabase returns a "success" response with no identities when the
        // email is already registered, to avoid leaking account existence.
        setError('An account with that email already exists. Try logging in instead.')
      } else if (data.session) {
        // Email confirmation is off, so signUp already logged the user in.
        // App's onAuthStateChange listener takes it from here.
      } else {
        setInfo('Account created! Check your email for a confirmation link, then log in.')
        setPassword('')
        setConfirmPassword('')
      }
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: window.location.origin,
      })
      if (error) {
        setError(error.message)
      } else {
        setInfo(
          `Password reset email sent to ${cleanEmail}. Click the link inside to set a new ` +
            'password. Check your spam/junk folder if it does not show up within a minute or two.'
        )
      }
    }

    setLoading(false)
  }

  const titles = { login: 'Welcome back', register: 'Create your account', forgot: 'Reset password' }
  const buttonLabels = { login: 'Log in', register: 'Register', forgot: 'Send reset email' }

  return (
    <div className="auth-page">
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-brand">
          <div className="auth-brand-mark">PB</div>
          <h1>PokeBind</h1>
        </div>

        {mode !== 'forgot' && (
          <div className="auth-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => switchMode('login')}
            >
              Log in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
              onClick={() => switchMode('register')}
            >
              Register
            </button>
          </div>
        )}

        {mode === 'forgot' && <h2>{titles[mode]}</h2>}

        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>

        {mode !== 'forgot' && (
          <label>
            Password
            <div className="password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                minLength={6}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {mode === 'register' && <span className="field-hint">At least 6 characters.</span>}
          </label>
        )}

        {mode === 'register' && (
          <label>
            Confirm password
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              minLength={6}
              required
            />
          </label>
        )}

        {error && <p className="error">{error}</p>}
        {info && <p className="info">{info}</p>}

        <button type="submit" className="auth-submit" disabled={loading}>
          {loading ? 'Please wait...' : buttonLabels[mode]}
        </button>

        {mode === 'login' && (
          <button type="button" className="link-button" onClick={() => switchMode('forgot')}>
            Forgot password?
          </button>
        )}

        {mode === 'forgot' && (
          <button type="button" className="link-button" onClick={() => switchMode('login')}>
            Back to log in
          </button>
        )}

        {onCancel && (
          <button type="button" className="link-button" onClick={onCancel}>
            Continue browsing without an account
          </button>
        )}
      </form>
    </div>
  )
}
