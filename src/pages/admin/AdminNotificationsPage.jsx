import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Send, Search, X, ChevronLeft, ChevronRight, Eye } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import RichTextEditor from '@/components/admin/RichTextEditor'
import { useAdminUsers } from '@/context/AdminUsersContext'
import { useSubscriptionTiers } from '@/context/SubscriptionTiersContext'
import { useAdminMessages } from '@/context/AdminMessagesContext'
import { ApiError, isApiConfigured } from '@/lib/api'
import { sendNotificationRequest } from '@/services/adminNotificationsService'

const RECIPIENT_OPTIONS = [
  { value: 'all', label: 'All Users' },
  { value: 'user', label: 'Individual User' },
  { value: 'tier', label: 'Tier-based' },
]

const MESSAGE_TYPE_OPTIONS = [
  { value: 'announcement', label: 'General Update' },
  { value: 'congratulatory', label: 'Congratulatory' },
]

const selectClass =
  'w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

const labelClass = 'text-xs font-semibold text-navy-mid'

function isMessageEmpty(html) {
  return !html || html.replace(/<[^>]*>/g, '').trim() === ''
}

function AdminNotificationsPage() {
  const { searchUsers } = useAdminUsers()
  const { fetchActiveTierOptions } = useSubscriptionTiers()
  const { messages: sentMessages, pagination, loading: historyLoading, fetchSentMessages } =
    useAdminMessages()

  const [tierOptions, setTierOptions] = useState([])
  const [historyPage, setHistoryPage] = useState(1)
  const [viewTarget, setViewTarget] = useState(null)

  useEffect(() => {
    fetchActiveTierOptions()
      .then(setTierOptions)
      .catch((err) => toast.error(err?.message || 'Failed to load subscription tiers.'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    fetchSentMessages({ page: historyPage }).catch((err) => {
      toast.error(err?.message || 'Failed to load sent history.')
    })
  }, [historyPage, fetchSentMessages])

  const [recipientType, setRecipientType] = useState('all')
  const [tierId, setTierId] = useState('')

  const [userQuery, setUserQuery] = useState('')
  const [userResults, setUserResults] = useState([])
  const [userSearching, setUserSearching] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)

  const [messageType, setMessageType] = useState('announcement')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const searchTimeoutRef = useRef(null)

  // Debounce is driven from the input's onChange rather than an effect
  // reacting to userQuery — the same search runs either way, but this
  // keeps every setState call inside an event handler instead of an effect
  // body, which is what react-hooks/set-state-in-effect asks for.
  function updateUserQuery(value) {
    setUserQuery(value)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)

    if (!value) {
      setUserResults([])
      return
    }

    setUserSearching(true)
    searchTimeoutRef.current = setTimeout(() => {
      searchUsers(value)
        .then(setUserResults)
        .catch((err) => toast.error(err?.message || 'Failed to search users.'))
        .finally(() => setUserSearching(false))
    }, 300)
  }

  function clearUserSearch() {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    setUserQuery('')
    setUserResults([])
    setUserSearching(false)
  }

  function handlePickUser(user) {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    setSelectedUser(user)
    setUserQuery('')
    setUserResults([])
  }

  function updateRecipientType(value) {
    setRecipientType(value)
    setTierId('')
    clearUserSearch()
    setSelectedUser(null)
  }

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [])

  async function handleSend() {
    if (recipientType === 'tier' && !tierId) {
      toast.error('Select a subscription tier to notify.')
      return
    }
    if (recipientType === 'user' && !selectedUser) {
      toast.error('Search for and select a user to notify.')
      return
    }
    if (!title.trim()) {
      toast.error('Enter a subject.')
      return
    }
    if (isMessageEmpty(message)) {
      toast.error('Write a message.')
      return
    }

    setSending(true)
    try {
      if (isApiConfigured()) {
        await sendNotificationRequest({
          type: recipientType,
          messageType,
          title,
          message,
          subscriptionTierId: tierId,
          userId: selectedUser?.id,
        })
      }
      toast.success('Notification sent.')
      updateRecipientType('all')
      setMessageType('announcement')
      setTitle('')
      setMessage('')
      if (historyPage === 1) {
        fetchSentMessages({ page: 1 }).catch(() => {})
      } else {
        setHistoryPage(1)
      }
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
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardContent className="space-y-3">
          <div className="text-sm font-semibold">Compose Notification</div>

          <div className="space-y-1.5">
            <label className={labelClass} htmlFor="notif-recipient">
              Recipient
            </label>
            <select
              id="notif-recipient"
              value={recipientType}
              onChange={(e) => updateRecipientType(e.target.value)}
              className={selectClass}
            >
              {RECIPIENT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {recipientType === 'tier' && (
            <div className="space-y-1.5">
              <label className={labelClass} htmlFor="notif-tier">
                Subscription Tier
              </label>
              <select
                id="notif-tier"
                required
                value={tierId}
                onChange={(e) => setTierId(e.target.value)}
                className={selectClass}
              >
                <option value="" disabled>
                  Select a tier
                </option>
                {tierOptions.map((tier) => (
                  <option key={tier.id} value={tier.id}>
                    {tier.name} (${tier.amount})
                  </option>
                ))}
              </select>
            </div>
          )}

          {recipientType === 'user' && (
            <div className="space-y-1.5">
              <label className={labelClass} htmlFor="notif-user-search">
                User
              </label>
              {selectedUser ? (
                <div className="flex items-center justify-between rounded-lg border border-input px-2.5 py-1.5 text-sm">
                  <span>
                    {selectedUser.name}{' '}
                    <span className="text-muted-foreground">({selectedUser.email})</span>
                  </span>
                  <button
                    type="button"
                    aria-label="Clear selected user"
                    onClick={() => setSelectedUser(null)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <div className="flex items-center gap-2 rounded-lg border border-input px-2.5 py-1.5 text-sm text-muted-foreground">
                    <Search className="size-3.5 shrink-0" />
                    <input
                      id="notif-user-search"
                      value={userQuery}
                      onChange={(e) => updateUserQuery(e.target.value)}
                      placeholder="Search by name or email…"
                      className="w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                  {userQuery && (
                    <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-input bg-popover shadow-lg">
                      {userSearching ? (
                        <div className="px-2.5 py-2 text-xs text-muted-foreground">Searching…</div>
                      ) : userResults.length === 0 ? (
                        <div className="px-2.5 py-2 text-xs text-muted-foreground">No users found.</div>
                      ) : (
                        userResults.map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => handlePickUser(u)}
                            className="block w-full px-2.5 py-1.5 text-left text-sm hover:bg-black/5"
                          >
                            {u.name} <span className="text-muted-foreground">({u.email})</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <label className={labelClass} htmlFor="notif-type">
              Message type
            </label>
            <select
              id="notif-type"
              value={messageType}
              onChange={(e) => setMessageType(e.target.value)}
              className={selectClass}
            >
              {MESSAGE_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className={labelClass} htmlFor="notif-subject">
              Subject
            </label>
            <Input
              id="notif-subject"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Reward instructions for Emerald Vault"
            />
          </div>

          <div className="space-y-1.5">
            <label className={labelClass}>Message</label>
            <RichTextEditor value={message} onChange={setMessage} />
          </div>

          <Button className="w-full" onClick={handleSend} disabled={sending}>
            <Send className="size-3.5" />
            {sending ? 'Sending…' : 'Send Notification'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <div className="mb-2.5 text-sm font-semibold">Sent History</div>
          <Table className="text-xs">
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historyLoading && sentMessages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Loading sent history…
                  </TableCell>
                </TableRow>
              ) : sentMessages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No messages sent yet.
                  </TableCell>
                </TableRow>
              ) : (
                sentMessages.map((h, i) => (
                  <TableRow key={h.id}>
                    <TableCell className="text-muted-foreground">
                      {(pagination.currentPage - 1) * pagination.perPage + i + 1}
                    </TableCell>
                    <TableCell>{h.to}</TableCell>
                    <TableCell>
                      <Badge variant="warning">{h.messageTypeLabel}</Badge>
                    </TableCell>
                    <TableCell>{h.date}</TableCell>
                    <TableCell>
                      <Badge variant="success">Sent</Badge>
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        aria-label="View message"
                        onClick={() => setViewTarget(h)}
                        className="text-navy-mid hover:text-navy-deep"
                      >
                        <Eye className="size-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {pagination.total > 0 && (
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Showing {(pagination.currentPage - 1) * pagination.perPage + 1}–
                {Math.min(pagination.currentPage * pagination.perPage, pagination.total)} of{' '}
                {pagination.total}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  disabled={pagination.currentPage <= 1}
                  onClick={() => setHistoryPage((p) => p - 1)}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <span>
                  Page {pagination.currentPage} of {pagination.lastPage}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  disabled={pagination.currentPage >= pagination.lastPage}
                  onClick={() => setHistoryPage((p) => p + 1)}
                  aria-label="Next page"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={viewTarget != null} onOpenChange={(open) => !open && setViewTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{viewTarget?.title}</DialogTitle>
            <DialogDescription>
              To {viewTarget?.to} · {viewTarget?.date}
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2">
            <Badge variant="warning">{viewTarget?.messageTypeLabel}</Badge>
            <Badge variant="success">Sent</Badge>
          </div>

          <div
            className="text-sm leading-relaxed text-foreground [&_a]:text-navy-mid [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5"
            dangerouslySetInnerHTML={{ __html: viewTarget?.message ?? '' }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AdminNotificationsPage
