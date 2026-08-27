import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Trophy, Gift, Bell, ChevronLeft, ChevronRight, Trash2, CheckCheck } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAdminMessagesFeed } from '@/context/AdminMessagesFeedContext'

const ICONS = { trophy: Trophy, gift: Gift, bell: Bell }

function AdminMessagesPage() {
  const {
    messages,
    pagination,
    loading,
    fetchMessages,
    markRead,
    deleteMessage,
    markAllRead,
    deleteAll,
  } = useAdminMessagesFeed()
  const [page, setPage] = useState(1)
  const [bulkWorking, setBulkWorking] = useState(false)

  useEffect(() => {
    fetchMessages({ page }).catch((err) => {
      toast.error(err?.message || 'Failed to load messages.')
    })
  }, [page, fetchMessages])

  function handleOpen(message) {
    if (!message.unread) return
    markRead(message.id).catch((err) => {
      toast.error(err?.message || 'Failed to mark message as read.')
    })
  }

  function handleDelete(e, message) {
    e.stopPropagation()
    if (!window.confirm('Delete this message?')) return
    deleteMessage(message.id).catch((err) => {
      toast.error(err?.message || 'Failed to delete message.')
    })
  }

  async function handleMarkAllRead() {
    setBulkWorking(true)
    try {
      await markAllRead()
      toast.success('All messages marked as read.')
    } catch (err) {
      toast.error(err?.message || 'Failed to mark all as read.')
    } finally {
      setBulkWorking(false)
    }
  }

  async function handleDeleteAll() {
    const count = pagination.total
    if (!window.confirm(`Delete all ${count} message${count === 1 ? '' : 's'}? This can't be undone.`)) {
      return
    }
    setBulkWorking(true)
    try {
      await deleteAll()
      toast.success('All messages deleted.')
    } catch (err) {
      toast.error(err?.message || 'Failed to delete all messages.')
    } finally {
      setBulkWorking(false)
    }
  }

  const unreadCount = messages.filter((m) => m.unread).length

  return (
    <div>
      <div className="mx-auto max-w-xl space-y-2.5">
        {messages.length > 0 && (
          <div className="flex items-center justify-between gap-2 px-0.5 pb-1">
            <span className="text-xs text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleMarkAllRead}
                disabled={unreadCount === 0 || bulkWorking}
                aria-label="Mark all as read"
              >
                <CheckCheck className="size-3.5" />
                <span className="hidden sm:inline">Mark all read</span>
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDeleteAll}
                disabled={bulkWorking}
                aria-label="Delete all messages"
              >
                <Trash2 className="size-3.5" />
                <span className="hidden sm:inline">Delete all</span>
              </Button>
            </div>
          </div>
        )}

        {loading && messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">Loading messages…</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">No messages yet.</p>
        ) : (
          messages.map((m) => {
            const { id, icon, title, message, time, unread } = m
            const Icon = ICONS[icon] ?? Bell
            return (
              <Card
                key={id}
                onClick={() => handleOpen(m)}
                className={cn('relative', unread && 'cursor-pointer bg-accent ring-gold/30')}
              >
                <button
                  type="button"
                  onClick={(e) => handleDelete(e, m)}
                  aria-label="Delete message"
                  className="absolute top-2 right-2 text-destructive hover:text-destructive/80"
                >
                  <Trash2 className="size-4" />
                </button>
                <CardContent className="flex gap-3">
                  <div className="flex size-9.5 shrink-0 items-center justify-center rounded-full bg-warning-bg text-gold">
                    <Icon className="size-4.5" />
                  </div>
                  <div className="min-w-0 flex-1 pr-5">
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-sm">{title}</strong>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {time}
                      </span>
                    </div>
                    <div
                      className="mt-0.5 text-xs leading-relaxed text-neutral [&_a]:text-navy-mid [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-0.5 [&_ul]:list-disc [&_ul]:pl-5"
                      dangerouslySetInnerHTML={{ __html: message }}
                    />
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}

        {pagination.total > 0 && (
          <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
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
                onClick={() => setPage((p) => p - 1)}
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
                onClick={() => setPage((p) => p + 1)}
                aria-label="Next page"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminMessagesPage
