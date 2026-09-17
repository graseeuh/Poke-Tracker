import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Login({ onCancel }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login') // 'login' | 'register' | 'forgot'
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    } else if (mode === 'register') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setInfo('Account created. Check your email if confirmation is required, then log in.')
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      })
      if (error) setError(error.message)
      else setInfo('Password reset email sent. Check your inbox for a link to set a new password.')
    }

    setLoading(false)
  }

  const titles = { login: 'Log in', register: 'Register', forgot: 'Reset password' }
  const buttonLabels = { login: 'Log in', register: 'Register', forgot: 'Send reset email' }

  return (
    <div className="auth-page">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h1>Pokemon Master Set Tracker</h1>
        <h2>{titles[mode]}</h2>

        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        {mode !== 'forgot' && (
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </label>
        )}

        {error && <p className="error">{error}</p>}
        {info && <p className="info">{info}</p>}

        <button type="submit" disabled={loading}>
          {loading ? 'Please wait...' : buttonLabels[mode]}
        </button>

        {mode === 'login' && (
          <button type="button" className="link-button" onClick={() => setMode('forgot')}>
            Forgot password?
          </button>
        )}

        <button
          type="button"
          className="link-button"
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
        >
          {mode === 'login' ? 'Need an account? Register' : 'Already have an account? Log in'}
        </button>

        {onCancel && (
          <button type="button" className="link-button" onClick={onCancel}>
            Continue browsing without an account
          </button>
        )}
      </form>
    </div>
  )
}
