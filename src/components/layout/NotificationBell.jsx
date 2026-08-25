import { Bell } from 'lucide-react'
import { cn } from '@/lib/utils'

function NotificationBell({ count = 0, className }) {
  const showBadge = count > 0

  return (
    <span className={cn('relative inline-flex', className)}>
      <Bell className="size-5" />
      {showBadge && (
        <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-none font-semibold text-white">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </span>
  )
}

export default NotificationBell
