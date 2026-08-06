import { NavLink, Outlet, useNavigate } from 'react-router'
import { Compass, LayoutDashboard, Users, Box, Bell, Settings, Search, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/treasures', label: 'Treasures', icon: Box },
  { to: '/admin/notifications', label: 'Notifications', icon: Bell },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
]

function AdminShell() {
  const { adminLogout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    adminLogout()
    navigate('/admin/login', { replace: true })
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="flex w-16 shrink-0 flex-col bg-sidebar text-sidebar-foreground sm:w-52">
        <div className="flex items-center gap-2 px-3 py-5 sm:px-4">
          <Compass className="size-5 shrink-0 text-gold-light" />
          <span className="hidden font-heading text-sm font-semibold text-white sm:inline">
            Treasure Go
          </span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-2">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center justify-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-white/5 sm:justify-start',
                  isActive && 'bg-sidebar-accent text-sidebar-accent-foreground',
                )
              }
            >
              <Icon className="size-4 shrink-0" />
              <span className="hidden sm:inline">{label}</span>
            </NavLink>
          ))}
          <button
            type="button"
            onClick={handleLogout}
            className="mt-auto flex items-center justify-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-white/5 sm:justify-start"
          >
            <LogOut className="size-4 shrink-0" />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </nav>
      </aside>
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-border bg-card px-6 py-3.5">
          <div className="flex w-56 items-center gap-2 rounded-lg border border-input px-3 py-1.5 text-sm text-muted-foreground">
            <Search className="size-3.5" />
            Search…
          </div>
          <div className="flex size-8 items-center justify-center rounded-full bg-linear-to-br from-gold-light to-gold text-xs font-bold text-navy-deep">
            AD
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
