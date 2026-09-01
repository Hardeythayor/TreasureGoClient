import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FieldError } from '@/components/ui/field-error'
import { useAuth } from '@/context/AuthContext'
import { getFieldErrors } from '@/lib/formErrors'

function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  function handleEmailChange(e) {
    setEmail(e.target.value)
    if (fieldErrors.email) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next.email
        return next
      })
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setFieldErrors({})
    setSubmitting(true)
    try {
      await requestPasswordReset(email)
      toast.success('Verification code sent to your email.')
      navigate('/verify-reset-code', { state: { email }, replace: true })
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
      <div className="hidden w-full max-w-md flex-col items-center justify-center gap-4 bg-navy-deep p-10 text-center text-white md:flex">
        <KeyRound className="size-9 text-gold-light" />
        <h1 className="font-heading text-2xl font-bold">Forgot your password?</h1>
        <p className="max-w-56 text-sm text-white/70">
          No worries — we&apos;ll send a code to your email to reset it.
        </p>
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
          <h2 className="mb-1.5 font-heading text-xl font-semibold">Reset your password</h2>
          <p className="mb-5 text-sm text-muted-foreground">
            Enter the email address linked to your account and we&apos;ll send you a 6-digit code.
          </p>
          {error && (
            <div className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
              {error}
            </div>
          )}
          <div className="mb-4 space-y-1.5">
            <label className="text-xs font-semibold text-navy-mid" htmlFor="email">
              Email address
            </label>
            <Input
              id="email"
              type="email"
              placeholder="amaka@mail.com"
              required
              autoComplete="email"
              value={email}
              onChange={handleEmailChange}
            />
            <FieldError message={fieldErrors.email} />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Sending code…' : 'Send Reset Code'}
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

export default ForgotPasswordPage
