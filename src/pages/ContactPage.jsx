import { useState } from 'react'
import { toast } from 'sonner'
import { Mail, Copy } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ApiError, isApiConfigured } from '@/lib/api'
import { sendContactMessageRequest } from '@/services/contactService'

function ContactPage() {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSending(true)
    try {
      if (isApiConfigured()) {
        await sendContactMessageRequest({ subject, message })
      }
      toast.success('Message sent — we usually reply within 24 hours.')
      setSubject('')
      setMessage('')
    } catch (err) {
      const reachedBackend = err instanceof ApiError && err.status > 0
      toast.error(
        reachedBackend
          ? err.message
          : 'Unable to reach the server. Please check your connection and try again.',
      )
    } finally {
      setSending(false)
    }
  }

  return (
    <div>
      <div className="mx-auto grid max-w-3xl gap-4 p-6 sm:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col items-center text-center">
            <Mail className="size-7 text-gold" />
            <p className="my-3 text-sm text-neutral">
              We usually reply within 24 hours.
            </p>
            <div className="flex items-center gap-2 rounded-lg bg-accent px-3 py-2 font-mono text-xs">
              treasuregolive@gmail.com
              <Copy className="size-3.5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-navy-mid" htmlFor="subject">
                  Subject
                </label>
                <Input
                  id="subject"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Issue with reward delivery"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-navy-mid" htmlFor="message">
                  Message
                </label>
                <textarea
                  id="message"
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us what's going on…"
                  className="min-h-24 w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>
              <Button type="submit" className="w-full" disabled={sending}>
                {sending ? 'Sending…' : 'Send Message'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ContactPage
