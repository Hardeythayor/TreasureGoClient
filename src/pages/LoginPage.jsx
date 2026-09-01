import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import SplashScreen from '@/components/ui/splash-screen'

function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showSplash, setShowSplash] = useState(false)

  // Checked before the `user` redirect below — once login() succeeds, user
  // becomes truthy on the very next render, and without this the splash
  // would never get a chance to show before that redirect fires.
  if (showSplash) {
    return (
      <SplashScreen
        onFinish={() => navigate(location.state?.from?.pathname ?? '/', { replace: true })}
      />
    )
  }

  // `login()` sets the AuthContext user mid-flight (before it awaits
  // fetchProfile()), which re-renders this component with `user` already
  // truthy while handleSubmit is still running and showSplash hasn't been
  // set yet — `submitting` is still true at that exact moment, so checking
  // it here is what stops that intermediate render from redirecting early
  // and skipping the splash.
  if (user && !submitting) {
    return <Navigate to={location.state?.from?.pathname ?? '/'} replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email, password)
      setShowSplash(true)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-full max-w-md flex-col items-center justify-center bg-navy-deep p-10 text-center text-white md:flex">
        <img
          src="/assets/splash_green.png"
          alt="Treasure Go — Hunt. Find. Win."
          className="w-full max-w-xs"
        />
      </div>
      <div className="flex flex-1 items-center justify-center p-8">
        <form className="w-full max-w-sm" onSubmit={handleSubmit}>
          <div className="mb-6 flex justify-center md:hidden">
            <img
              src="/assets/splash_white.png"
              alt="Treasure Go — Hunt. Find. Win."
              className="w-full max-w-45"
            />
          </div>
          <h2 className="mb-5 font-heading text-xl font-semibold">Log in</h2>
          {error && (
            <div className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
              {error}
            </div>
          )}
          <div className="mb-4 space-y-1.5">
            <label className="text-xs font-semibold text-navy-mid" htmlFor="email">
              Email or username
            </label>
            <Input
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@treasurego.com"
              autoComplete="email"
            />
          </div>
          <div className="mb-2 space-y-1.5">
            <label className="text-xs font-semibold text-navy-mid" htmlFor="password">
              Password
            </label>
            <PasswordInput
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          <div className="mb-4 text-right text-xs">
            <a className="font-semibold text-navy-mid" href="/forgot-password">
              Forgot password?
            </a>
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Logging in…' : 'Log In'}
          </Button>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Don&apos;t have an account?{' '}
            <a className="font-semibold text-navy-mid" href="/signup">
              Sign up
            </a>
          </p>
        </form>
      </div>
    </div>
  )
}

export default LoginPage
