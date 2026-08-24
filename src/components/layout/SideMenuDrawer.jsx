import { Link, useNavigate } from 'react-router'
import {
  X,
  MapPin,
  User,
  CreditCard,
  Gift,
  Settings as SettingsIcon,
  Mail,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'

const DRAWER_ITEMS = [
  { to: '/', label: 'Home', icon: MapPin },
  { to: '/profile', label: 'Profile', icon: User },
  { to: '/treasures', label: 'Treasure Pass', icon: CreditCard },
  { to: '/rewards', label: 'Rewards', icon: Gift },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
  // { to: '/settings/language', label: 'Language', icon: Globe },
  { to: '/contact', label: 'Contact Us', icon: Mail },
]

function initialsFor(name) {
  if (!name) return '?'
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function SideMenuDrawer({ open, onClose, persistOnDesktop = false }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    onClose()
    await logout()
    navigate('/login', { replace: true })
  }

  function handleNavigate() {
    // On desktop the drawer is a persistent sidebar, not an overlay — only
    // dismiss it when it's actually acting as a mobile/overlay menu.
    if (persistOnDesktop && window.innerWidth >= 768) return
    onClose()
  }

  return (
    <div
      className={cn(
        'fixed inset-0 z-30 transition-opacity duration-300',
        open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        persistOnDesktop &&
          'md:static md:inset-auto md:shrink-0 md:pointer-events-auto md:overflow-hidden md:opacity-100 md:transition-[width] md:duration-300 md:ease-in-out',
        persistOnDesktop && (open ? 'md:w-72' : 'md:w-0'),
      )}
    >
      <div
        className={cn(
          'absolute inset-0 bg-black/40',
          persistOnDesktop && 'md:hidden',
        )}
        onClick={onClose}
      />
      <div
        className={cn(
          'absolute top-0 right-0 flex h-full w-72 flex-col bg-navy-deep p-5 text-white shadow-2xl transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full',
          persistOnDesktop &&
            'md:static md:h-full md:w-72 md:translate-x-0 md:border-l md:border-white/10 md:shadow-none',
        )}
      >
        <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-full bg-linear-to-br from-gold-light to-gold font-heading font-bold text-navy-deep">
              {initialsFor(user?.name)}
            </div>
            <div>
              <div className="text-sm font-semibold">{user?.name || 'Loading…'}</div>
              <div className="text-xs text-white/60">{user?.username ? `@${user.username}` : ''}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="text-white/70 hover:text-white"
          >
            <X className="size-5" />
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {DRAWER_ITEMS.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              onClick={handleNavigate}
              className="flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm text-white/85 transition-colors hover:bg-white/5"
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
          <button
            type="button"
            onClick={handleLogout}
            className="mt-auto flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-left text-sm text-[#f0a79e] transition-colors hover:bg-white/5"
          >
            <LogOut className="size-4" />
            Logout
          </button>
        </nav>
      </div>
    </div>
  )
}

export default SideMenuDrawer
