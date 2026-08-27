import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { toast } from 'sonner'
import PasswordChecklist from 'react-password-checklist'
import { ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PasswordInput } from '@/components/ui/password-input'
import { FieldError } from '@/components/ui/field-error'
import { useAuth } from '@/context/AuthContext'
import { getFieldErrors } from '@/lib/formErrors'

const PASSWORD_RULES = ['minLength', 'capital', 'number', 'specialChar', 'match']

function ResetPasswordPage() {
  const { resetPassword } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const email = location.state?.email
  const resetToken = location.state?.resetToken

  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [passwordValid, setPasswordValid] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  // Reaching this page requires the verified reset_token from the previous
  // step — a direct/refreshed visit has nothing to submit with, so send
  // them back to start the flow over.
  if (!email || !resetToken) {
    return <Navigate to="/forgot-password" replace />
  }

  function clearFieldError(field) {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
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
      await resetPassword({ email, password, passwordConfirmation, resetToken })
      toast.success('Password reset. Please log in with your new password.')
      navigate('/login', { replace: true })
    } catch (err) {
      const fields = getFieldErrors(err)
      setFieldErrors(fields)
      setError(
        Object.keys(fields).length ? '' : err.message || 'Something went wrong. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-full max-w-md flex-col items-center justify-center gap-4 bg-navy-deep p-10 text-center text-white md:flex">
        <ShieldCheck className="size-9 text-gold-light" />
        <h1 className="font-heading text-2xl font-bold">Set a new password</h1>
        <p className="max-w-56 text-sm text-white/70">
          Almost done — choose a new password for your account.
        </p>
      </div>
      <div className="flex flex-1 items-center justify-center p-8">
        <form className="w-full max-w-sm" onSubmit={handleSubmit}>
          <h2 className="mb-1.5 font-heading text-xl font-semibold">Reset password</h2>
          <p className="mb-5 text-sm text-muted-foreground">
            Enter a new password for <span className="font-medium text-foreground">{email}</span>.
          </p>
          {error && (
            <div className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
              {error}
            </div>
          )}

          <div className="mb-4 space-y-1.5">
            <label className="text-xs font-semibold text-navy-mid" htmlFor="password">
              New password
            </label>
            <PasswordInput
              id="password"
              placeholder="••••••••"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                clearFieldError('password')
              }}
            />
            <FieldError message={fieldErrors.password} />
          </div>

          <div className="mb-4 space-y-1.5">
            <label className="text-xs font-semibold text-navy-mid" htmlFor="confirm">
              Confirm new password
            </label>
            <PasswordInput
              id="confirm"
              placeholder="••••••••"
              required
              autoComplete="new-password"
              value={passwordConfirmation}
              onChange={(e) => {
                setPasswordConfirmation(e.target.value)
                clearFieldError('password_confirmation')
              }}
            />
            <FieldError message={fieldErrors.password_confirmation} />
            {password && (
              <PasswordChecklist
                rules={PASSWORD_RULES}
                minLength={8}
                value={password}
                valueAgain={passwordConfirmation}
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
            {submitting ? 'Resetting…' : 'Reset Password'}
          </Button>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Remembered your password?{' '}
            <a className="font-semibold text-navy-mid" href="/login">
              Log in
            </a>
          </p>
        </form>
      </div>
    </div>
  )
}

export default ResetPasswordPage
