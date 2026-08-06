import { Trophy, Gift, Bell } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useNotifications } from '@/context/NotificationsContext'

const ICONS = { trophy: Trophy, gift: Gift, bell: Bell }

function MessagesPage() {
  const { notifications } = useNotifications()

  return (
    <div>
      <div className="mx-auto max-w-xl space-y-2.5 p-6">
        {notifications.map(({ id, icon, title, message, time, unread }) => {
          const Icon = ICONS[icon] ?? Bell
          return (
            <Card key={id} className={cn(unread && 'bg-accent ring-gold/30')}>
              <CardContent className="flex gap-3">
                <div className="flex size-9.5 shrink-0 items-center justify-center rounded-full bg-warning-bg text-gold">
                  <Icon className="size-4.5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <strong className="text-sm">{title}</strong>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {time}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-neutral">
                    {message}
                  </p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

export default MessagesPage
