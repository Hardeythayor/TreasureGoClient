import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { Compass } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  if (user) {
    return <Navigate to={location.state?.from?.pathname ?? '/'} replace />
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (login(email, password)) {
      navigate(location.state?.from?.pathname ?? '/', { replace: true })
    } else {
      setError('Incorrect email or password.')
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-full max-w-md flex-col items-center justify-center gap-4 bg-navy-deep p-10 text-center text-white md:flex">
        <Compass className="size-9 text-gold-light" />
        <h1 className="font-heading text-2xl font-bold">Welcome back</h1>
        <p className="max-w-56 text-sm text-white/70">
          Your next treasure is already on the map.
        </p>
      </div>
      <div className="flex flex-1 items-center justify-center p-8">
        <form className="w-full max-w-sm" onSubmit={handleSubmit}>
          <h2 className="mb-5 font-heading text-xl font-semibold">Log in</h2>
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
            <Input
              id="password"
              type="password"
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
          {error && <p className="mb-4 text-xs text-destructive">{error}</p>}
          <Button type="submit" className="w-full">
            Log In
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
