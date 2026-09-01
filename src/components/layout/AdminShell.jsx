import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router'
import { LayoutDashboard, Users, Box, CreditCard, Gift, Inbox, Bell, Settings, Search, LogOut, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { useAdminMessagesFeed } from '@/context/AdminMessagesFeedContext'
import NotificationBell from '@/components/layout/NotificationBell'

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/treasures', label: 'Treasures', icon: Box },
  { to: '/admin/subscription-tiers', label: 'Subscription Tiers', icon: CreditCard },
  { to: '/admin/treasure-rewards', label: 'Treasure Rewards', icon: Gift },
  { to: '/admin/messages', label: 'Messages', icon: Inbox },
  { to: '/admin/notifications', label: 'Notifications', icon: Bell },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
]

function AdminShell() {
  const { adminLogout } = useAuth()
  const { unreadCount } = useAdminMessagesFeed()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleLogout() {
    setMenuOpen(false)
    await adminLogout()
    navigate('/admin/login', { replace: true })
  }

  function handleNavigate() {
    setMenuOpen(false)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div
        className={cn(
          'fixed inset-0 z-30 bg-black/40 transition-opacity duration-300 md:hidden',
          menuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={() => setMenuOpen(false)}
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground shadow-2xl transition-transform duration-300 ease-in-out',
          menuOpen ? 'translate-x-0' : '-translate-x-full',
          'md:static md:w-52 md:translate-x-0 md:shadow-none',
        )}
      >
        <div className="flex items-center justify-between gap-2 px-4 py-4">
          <div className="flex items-center gap-1">
            <img src="/assets/green_bg_logo.png" alt="Treasure Go" className="h-9 w-9 shrink-0 object-contain" />
            <span className="text-sm font-bold tracking-wide whitespace-nowrap uppercase">
              <span className="text-white">Treasure</span> <span className="text-gold">Go</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
            className="text-white/70 hover:text-white md:hidden"
          >
            <X className="size-5" />
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-2">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={handleNavigate}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-white/5',
                  isActive && 'bg-sidebar-accent text-sidebar-accent-foreground',
                )
              }
            >
              <Icon className="size-4 shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
          <button
            type="button"
            onClick={handleLogout}
            className="mt-auto flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-[#f0a79e] transition-colors hover:bg-white/5"
          >
            <LogOut className="size-4 shrink-0" />
            <span>Log out</span>
          </button>
        </nav>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3.5 sm:px-6">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className="text-navy-mid md:hidden"
          >
            <Menu className="size-5" />
          </button>
          <div className="hidden w-56 items-center gap-2 rounded-lg border border-input px-3 py-1.5 text-sm text-muted-foreground sm:flex">
            <Search className="size-3.5" />
            Search…
          </div>
          <div className="ml-auto flex items-center gap-3.5 sm:ml-0">
            <Link to="/admin/messages" aria-label="Messages" className="text-navy-mid">
              <NotificationBell count={unreadCount} />
            </Link>
            <div className="flex size-8 items-center justify-center rounded-full bg-linear-to-br from-gold-light to-gold text-xs font-bold text-navy-deep">
              AD
            </div>
          </div>
        </div>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AdminShell
