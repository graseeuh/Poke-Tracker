import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Login({ onCancel }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [code, setCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [mode, setMode] = useState('login') // 'login' | 'register' | 'forgot' | 'reset-code'
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  function switchMode(nextMode) {
    setMode(nextMode)
    setError('')
    setInfo('')
    setPassword('')
    setConfirmPassword('')
    setCode('')
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
    if (mode === 'reset-code' && password !== confirmPassword) {
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
    } else if (mode === 'forgot') {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: window.location.origin,
      })
      if (error) {
        setError(error.message)
      } else {
        setMode('reset-code')
        setInfo(
          `We sent a 6-digit code to ${cleanEmail}. Enter it below with your new password. ` +
            'Check your spam/junk folder if it does not show up within a minute or two.'
        )
      }
    } else if (mode === 'reset-code') {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: code.trim(),
        type: 'recovery',
      })
      if (verifyError) {
        setError(verifyError.message)
      } else {
        const { error: updateError } = await supabase.auth.updateUser({ password })
        if (updateError) {
          setError(updateError.message)
        }
        // On success, verifyOtp already started a session; App's
        // onAuthStateChange listener logs the user in and redirects.
      }
    }

    setLoading(false)
  }

  const titles = {
    login: 'Welcome back',
    register: 'Create your account',
    forgot: 'Reset password',
    'reset-code': 'Enter your code',
  }
  const buttonLabels = {
    login: 'Log in',
    register: 'Register',
    forgot: 'Send reset code',
    'reset-code': 'Update password',
  }

  return (
    <div className="auth-page">
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-brand">
          <div className="auth-brand-mark">PT</div>
          <h1>Pokemon Master Set Tracker</h1>
        </div>

        {(mode === 'login' || mode === 'register') && (
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

        {(mode === 'forgot' || mode === 'reset-code') && <h2>{titles[mode]}</h2>}

        {mode !== 'reset-code' && (
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
        )}

        {mode === 'reset-code' && (
          <label>
            6-digit code
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              autoComplete="one-time-code"
              placeholder="123456"
              required
            />
            <span className="field-hint">Sent to {email.trim().toLowerCase()}</span>
          </label>
        )}

        {(mode === 'login' || mode === 'register' || mode === 'reset-code') && (
          <label>
            {mode === 'reset-code' ? 'New password' : 'Password'}
            <div className="password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
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
            {mode !== 'login' && <span className="field-hint">At least 6 characters.</span>}
          </label>
        )}

        {(mode === 'register' || mode === 'reset-code') && (
          <label>
            Confirm {mode === 'reset-code' ? 'new ' : ''}password
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

        {mode === 'reset-code' && (
          <>
            <button type="button" className="link-button" onClick={() => switchMode('forgot')}>
              Didn't get a code? Send again
            </button>
            <button type="button" className="link-button" onClick={() => switchMode('login')}>
              Back to log in
            </button>
          </>
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
