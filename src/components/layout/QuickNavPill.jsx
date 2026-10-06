import { Link, useLocation } from 'react-router'
import { MessageSquare, MapPin, ListChecks } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMessages } from '@/context/MessagesContext'

export const QUICK_NAV = [
  { to: '/messages', icon: MessageSquare, label: 'Messages' },
  { to: '/', icon: MapPin, label: 'Map' },
  { to: '/treasures', icon: ListChecks, label: 'List' },
]

// Shared by this pill and HomePage's own desktop vertical nav (both render
// the same QUICK_NAV items) so the Messages icon's unread badge only has
// to be built once.
export function NavIcon({ icon: Icon, unreadBadge, className }) {
  return (
    <span className="relative inline-flex">
      <Icon className={className} />
      {unreadBadge > 0 && (
        <span className="absolute -top-1 -right-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-destructive px-0.5 text-[9px] leading-none font-bold text-white">
          {unreadBadge > 9 ? '9+' : unreadBadge}
        </span>
      )}
    </span>
  )
}

function QuickNavPill() {
  const { pathname } = useLocation()
  const { unreadCount } = useMessages()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 flex bg-white pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-2px_12px_rgba(0,0,0,0.08)] md:hidden">
      {QUICK_NAV.map(({ to, icon: Icon, label }) => {
        const active = pathname === to
        return (
          <Link
            key={label}
            to={to}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-1 py-2.5 transition-colors',
              active ? 'font-semibold text-navy-deep' : 'text-black hover:bg-black/5',
            )}
          >
            <NavIcon
              icon={Icon}
              unreadBadge={to === '/messages' ? unreadCount : 0}
              className="size-5"
            />
            <span className="text-[11px] leading-none whitespace-nowrap">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

export default QuickNavPill
