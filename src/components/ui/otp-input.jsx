import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

function OtpInput({ length = 6, value, onChange, disabled, autoFocus = true }) {
  const inputsRef = useRef([])

  useEffect(() => {
    if (autoFocus) inputsRef.current[0]?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function setDigit(index, digit) {
    const chars = value.padEnd(length, ' ').split('')
    chars[index] = digit
    onChange(chars.join('').trimEnd())
  }

  function handleChange(index, rawValue) {
    const digit = rawValue.replace(/\D/g, '').slice(-1)
    setDigit(index, digit)
    if (digit && index < length - 1) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  // A box with an existing digit clears itself first (via the native
  // deletion below, which fires handleChange('')) and keeps focus in place —
  // only once it's already empty does a second Backspace step back and
  // clear the previous box too, so holding Backspace walks left one box per
  // press instead of needing two presses per box.
  function handleKeyDown(index, e) {
    if (e.key !== 'Backspace' || value[index] || index === 0) return
    e.preventDefault()
    setDigit(index - 1, '')
    inputsRef.current[index - 1]?.focus()
  }

  // Selects the box's existing content on focus so typing (or clicking in
  // to fix one digit) immediately replaces it — without this, a box that
  // already has a digit silently rejects further input past its maxLength.
  function handleFocus(e) {
    e.target.select()
  }

  function handlePaste(e) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (!pasted) return
    onChange(pasted)
    inputsRef.current[Math.min(pasted.length, length - 1)]?.focus()
  }

  return (
    <div className="flex justify-center gap-2" onPaste={handlePaste}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => (inputsRef.current[i] = el)}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={value[i] ?? ''}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={handleFocus}
          aria-label={`Digit ${i + 1}`}
          className={cn(
            'h-12 w-10 rounded-lg border border-input bg-transparent text-center text-lg font-semibold',
            'outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        />
      ))}
    </div>
  )
}

export { OtpInput }
