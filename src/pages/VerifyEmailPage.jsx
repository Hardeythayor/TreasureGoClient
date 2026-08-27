import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { MailCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OtpInput } from '@/components/ui/otp-input'
import { FieldError } from '@/components/ui/field-error'
import { useAuth } from '@/context/AuthContext'
import { getFieldErrors } from '@/lib/formErrors'

const RESEND_COOLDOWN_SECONDS = 30

function VerifyEmailPage() {
  const { user, verifyEmail, resendVerificationCode } = useAuth()
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [resetKey, setResetKey] = useState(0)
  const verifyingRef = useRef(false)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  if (user?.emailVerifiedAt) {
    return <Navigate to="/" replace />
  }

  async function handleVerify(submittedCode) {
    if (verifyingRef.current) return
    verifyingRef.current = true
    setError('')
    setFieldErrors({})
    setVerifying(true)
    try {
      await verifyEmail(submittedCode)
      toast.success('Email verified.')
      navigate('/', { replace: true })
    } catch (err) {
      const fields = getFieldErrors(err)
      setFieldErrors(fields)
      setError(
        Object.keys(fields).length
          ? ''
          : err.message || 'Invalid verification code. Please try again.',
      )
      // Clears the boxes and refocuses the first one, rather than making
      // the user manually backspace through a rejected code.
      setCode('')
      setResetKey((k) => k + 1)
    } finally {
      setVerifying(false)
      verifyingRef.current = false
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
    if (fieldErrors.code) {
      setFieldErrors((prev) => {
        const nextErrors = { ...prev }
        delete nextErrors.code
        return nextErrors
      })
    }
    if (next.length === 6) {
      handleVerify(next)
    }
  }

  async function handleResend() {
    setResending(true)
    try {
      await resendVerificationCode()
      toast.success('Verification code sent.')
      setCooldown(RESEND_COOLDOWN_SECONDS)
    } catch (err) {
      toast.error(err?.message || 'Failed to resend verification code.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-gold-light/20 text-gold">
          <MailCheck className="size-7" />
        </div>
        <h1 className="font-heading text-xl font-semibold">Verify your email</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Enter the 6-digit code we sent to{' '}
          <span className="font-medium text-foreground">{user?.email}</span>
        </p>

        <form onSubmit={handleSubmit} className="mt-6">
          {error && (
            <div className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
              {error}
            </div>
          )}

          <OtpInput key={resetKey} value={code} onChange={handleCodeChange} disabled={verifying} />
          <div className="mt-2 flex justify-center">
            <FieldError message={fieldErrors.code} />
          </div>

          <Button type="submit" className="mt-5 w-full" disabled={verifying || code.length !== 6}>
            {verifying ? 'Verifying…' : 'Verify Email'}
          </Button>
        </form>

        <p className="mt-5 text-xs text-muted-foreground">
          Didn&apos;t receive a code?{' '}
          <button
            type="button"
            onClick={handleResend}
            disabled={resending || cooldown > 0}
            className="font-semibold text-navy-mid hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
          >
            {resending ? 'Sending…' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
          </button>
        </p>
      </div>
    </div>
  )
}

export default VerifyEmailPage
