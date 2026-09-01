import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { toast } from 'sonner'
import PasswordChecklist from 'react-password-checklist'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { FieldError } from '@/components/ui/field-error'
import { useAuth } from '@/context/AuthContext'
import { getFieldErrors } from '@/lib/formErrors'

const PASSWORD_RULES = ['minLength', 'capital', 'number', 'specialChar', 'match']

const EMPTY_FORM = {
  name: '',
  username: '',
  email: '',
  country: '',
  password: '',
  passwordConfirmation: '',
}

// Maps local form state keys to the request body's own key names, which is
// what the backend's validation errors are keyed by.
const FIELD_KEY_MAP = { passwordConfirmation: 'password_confirmation' }

function SignupPage() {
  const { user, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [passwordValid, setPasswordValid] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  if (user) {
    return (
      <Navigate
        to={user.emailVerifiedAt ? (location.state?.from?.pathname ?? '/') : '/verify-email'}
        replace
      />
    )
  }

  function updateField(field) {
    return (e) => {
      setForm((f) => ({ ...f, [field]: e.target.value }))
      const backendKey = FIELD_KEY_MAP[field] ?? field
      setFieldErrors((prev) => {
        if (!prev[backendKey]) return prev
        const next = { ...prev }
        delete next[backendKey]
        return next
      })
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!passwordValid) {
      setError('Please meet all password requirements.')
      return
    }

    setError('')
    setFieldErrors({})
    setSubmitting(true)
    try {
      const loggedIn = await register(form)
      if (loggedIn) {
        navigate('/verify-email', { replace: true })
      } else {
        toast.success('Account created. Please log in.')
        navigate('/login', { replace: true })
      }
    } catch (err) {
      const fields = getFieldErrors(err)
      setFieldErrors(fields)
      setError(Object.keys(fields).length ? '' : err.message || 'Something went wrong. Please try again.')
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
          <h2 className="mb-5 font-heading text-xl font-semibold">
            Create your account
          </h2>
          {error && (
            <div className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
              {error}
            </div>
          )}
          <div className="mb-4 space-y-1.5">
            <label className="text-xs font-semibold text-navy-mid" htmlFor="name">
              Full name
            </label>
            <Input
              id="name"
              placeholder="Amaka Obi"
              required
              value={form.name}
              onChange={updateField('name')}
            />
            <FieldError message={fieldErrors.name} />
          </div>
          <div className="mb-4 space-y-1.5">
            <label className="text-xs font-semibold text-navy-mid" htmlFor="username">
              Username
            </label>
            <Input
              id="username"
              placeholder="amaka.o"
              required
              value={form.username}
              onChange={updateField('username')}
            />
            <FieldError message={fieldErrors.username} />
          </div>
          <div className="mb-4 space-y-1.5">
            <label className="text-xs font-semibold text-navy-mid" htmlFor="email">
              Email address
            </label>
            <Input
              id="email"
              type="email"
              placeholder="amaka@mail.com"
              required
              value={form.email}
              onChange={updateField('email')}
            />
            <FieldError message={fieldErrors.email} />
          </div>
          <div className="mb-4 space-y-1.5">
            <label className="text-xs font-semibold text-navy-mid" htmlFor="country">
              Country
            </label>
            <Input
              id="country"
              placeholder="Nigeria"
              required
              value={form.country}
              onChange={updateField('country')}
            />
            <FieldError message={fieldErrors.country} />
          </div>
          <div className="mb-4 space-y-1.5">
            <label className="text-xs font-semibold text-navy-mid" htmlFor="password">
              Password
            </label>
            <PasswordInput
              id="password"
              placeholder="••••••••"
              required
              autoComplete="new-password"
              value={form.password}
              onChange={updateField('password')}
            />
            <FieldError message={fieldErrors.password} />
          </div>
          <div className="mb-4 space-y-1.5">
            <label className="text-xs font-semibold text-navy-mid" htmlFor="confirm">
              Confirm password
            </label>
            <PasswordInput
              id="confirm"
              placeholder="••••••••"
              required
              autoComplete="new-password"
              value={form.passwordConfirmation}
              onChange={updateField('passwordConfirmation')}
            />
            <FieldError message={fieldErrors.password_confirmation} />
            {form.password && (
              <PasswordChecklist
                rules={PASSWORD_RULES}
                minLength={8}
                value={form.password}
                valueAgain={form.passwordConfirmation}
                onChange={setPasswordValid}
                className="space-y-1"
                itemClassName="text-[11px]"
                iconSize={12}
                validTextColor="#16a34a"
                invalidTextColor="#71717a"
              />
            )}
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Create Account'}
          </Button>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Already have an account?{' '}
            <a className="font-semibold text-navy-mid" href="/login">
              Log in
            </a>
          </p>
        </form>
      </div>
    </div>
  )
}

export default SignupPage
