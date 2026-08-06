import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { Shield } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function AdminLoginPage() {
  const { admin, adminLogin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  if (admin) {
    return <Navigate to={location.state?.from?.pathname ?? '/admin'} replace />
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (adminLogin(email, password)) {
      navigate(location.state?.from?.pathname ?? '/admin', { replace: true })
    } else {
      setError('Incorrect email or password.')
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-full max-w-md flex-col items-center justify-center gap-4 bg-navy-deep p-10 text-center text-white md:flex">
        <Shield className="size-9 text-gold-light" />
        <h1 className="font-heading text-2xl font-bold">Admin Control Center</h1>
      </div>
      <div className="flex flex-1 items-center justify-center p-8">
        <form className="w-full max-w-sm" onSubmit={handleSubmit}>
          <h2 className="mb-5 font-heading text-xl font-semibold">Admin Log In</h2>
          <div className="mb-4 space-y-1.5">
            <label className="text-xs font-semibold text-navy-mid" htmlFor="email">
              Email
            </label>
            <Input
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@treasurego.com"
              autoComplete="email"
            />
          </div>
          <div className="mb-4 space-y-1.5">
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
          <label className="mb-4 flex items-center gap-2 text-xs text-neutral">
            <input type="checkbox" className="size-3.5" />
            Remember me
          </label>
          {error && <p className="mb-4 text-xs text-destructive">{error}</p>}
          <Button type="submit" className="w-full">
            Log In
          </Button>
        </form>
      </div>
    </div>
  )
}

export default AdminLoginPage
