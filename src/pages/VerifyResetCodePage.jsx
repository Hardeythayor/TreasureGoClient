import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { OtpInput } from '@/components/ui/otp-input'
import { FieldError } from '@/components/ui/field-error'
import { useAuth } from '@/context/AuthContext'
import { getFieldErrors } from '@/lib/formErrors'

function VerifyResetCodePage() {
  const { verifyResetCode } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState(location.state?.email ?? '')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [resetKey, setResetKey] = useState(0)

  function clearFieldError(field) {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  async function handleVerify(submittedCode) {
    setError('')
    setFieldErrors({})
    setSubmitting(true)
    try {
      const resetToken = await verifyResetCode(email, submittedCode)
      navigate('/reset-password', { state: { email, resetToken }, replace: true })
    } catch (err) {
      const fields = getFieldErrors(err)
      setFieldErrors(fields)
      setError(
        Object.keys(fields).length
          ? ''
          : err.message || 'Invalid verification code. Please try again.',
      )
      setCode('')
      setResetKey((k) => k + 1)
    } finally {
      setSubmitting(false)
    }
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (code.length !== 6) {
      setError('Enter the 6-digit code sent to your email.')
      return
    }
    handleVerify(code)
  }

  function handleCodeChange(next) {
    setCode(next)
    clearFieldError('code')
    if (next.length === 6) {
      handleVerify(next)
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-full max-w-md flex-col items-center justify-center gap-4 bg-navy-deep p-10 text-center text-white md:flex">
        <KeyRound className="size-9 text-gold-light" />
        <h1 className="font-heading text-2xl font-bold">Check your email</h1>
        <p className="max-w-56 text-sm text-white/70">
          Enter the 6-digit code we sent you to continue resetting your password.
        </p>
      </div>
      <div className="flex flex-1 items-center justify-center p-8">
        <form className="w-full max-w-sm" onSubmit={handleSubmit}>
          <h2 className="mb-1.5 font-heading text-xl font-semibold">Enter verification code</h2>
          <p className="mb-5 text-sm text-muted-foreground">
            We sent a 6-digit code to your email. Enter it below to continue.
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
              onChange={(e) => {
                setEmail(e.target.value)
                clearFieldError('email')
              }}
            />
            <FieldError message={fieldErrors.email} />
          </div>

          <div className="mb-4 space-y-1.5">
            <label className="text-xs font-semibold text-navy-mid">6-digit code</label>
            <OtpInput key={resetKey} value={code} onChange={handleCodeChange} disabled={submitting} />
            <div className="flex justify-center">
              <FieldError message={fieldErrors.code} />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={submitting || code.length !== 6}>
            {submitting ? 'Verifying…' : 'Verify Code'}
          </Button>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Didn&apos;t get a code?{' '}
            <a className="font-semibold text-navy-mid" href="/forgot-password">
              Request a new one
            </a>
          </p>
        </form>
      </div>
    </div>
  )
}

export default VerifyResetCodePage
