import { Link, useLocation } from 'react-router'
import { MessageSquare, MapPin, ListChecks } from 'lucide-react'
import { cn } from '@/lib/utils'

export const QUICK_NAV = [
  { to: '/messages', icon: MessageSquare, label: 'Messages' },
  { to: '/', icon: MapPin, label: 'Hunt' },
  { to: '/treasures', icon: ListChecks, label: 'Categories' },
]

function QuickNavPill() {
  const { pathname } = useLocation()

  return (
    <nav className="fixed inset-x-0 bottom-6 z-10 mx-auto flex w-fit gap-1.5 rounded-full bg-white p-1.5 shadow-lg md:hidden">
      {QUICK_NAV.map(({ to, icon: Icon, label }) => {
        const active = pathname === to
        return (
          <Link
            key={label}
            to={to}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3.5 py-2 text-navy-mid transition-colors',
              active ? 'bg-gold text-navy-deep' : 'hover:bg-black/5',
            )}
          >
            <Icon className="size-4" />
            <span className="text-xs font-medium whitespace-nowrap">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

export default QuickNavPill
