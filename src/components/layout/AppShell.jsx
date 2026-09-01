import { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router'
import { Menu, ArrowLeft } from 'lucide-react'
import SideMenuDrawer from '@/components/layout/SideMenuDrawer'
import QuickNavPill from '@/components/layout/QuickNavPill'
import NotificationBell from '@/components/layout/NotificationBell'
import { useMessages } from '@/context/MessagesContext'

const PAGE_META = {
  '/messages': { title: 'Notifications' },
  '/treasures': { title: 'Treasure Pass Tiers' },
  '/profile': { title: 'My Profile' },
  '/rewards': { title: 'Rewards', showBack: true },
  '/settings': { title: 'Settings', showBack: true },
  '/settings/language': { title: 'Language', showBack: true },
  '/contact': { title: 'Contact Us', showBack: true },
}

function getPageMeta(pathname) {
  if (pathname.startsWith('/treasures/')) {
    const tier = pathname.split('/')[2]
    return { title: `Treasures — $${tier} Tier`, showBack: true }
  }
  return PAGE_META[pathname]
}

function AppShell() {
  const [menuOpen, setMenuOpen] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= 768,
  )
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const meta = getPageMeta(pathname)
  const title = meta?.title
  const showBack = meta?.showBack
  const { unreadCount } = useMessages()

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <header className="flex shrink-0 items-center gap-3 bg-sidebar px-4 py-2.5 text-white">
        <div className="flex shrink-0 items-center gap-1">
          <img src="/assets/green_bg_logo.png" alt="Treasure Go" className="h-9 w-9 shrink-0 object-contain" />
          <span className="text-sm font-bold tracking-wide whitespace-nowrap uppercase">
            <span className="text-white">Treasure</span> <span className="text-gold">Go</span>
          </span>
        </div>

        {title && (
          <>
            <span className="h-5 w-px shrink-0 bg-white/15" />
            <div className="flex min-w-0 items-center gap-2">
              {showBack && (
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  aria-label="Back"
                  className="shrink-0 text-white/80 hover:text-white"
                >
                  <ArrowLeft className="size-4" />
                </button>
              )}
              <span className="truncate text-sm font-medium text-white/90">
                {title}
              </span>
            </div>
          </>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-3.5">
          <Link
            to="/messages"
            aria-label="Messages"
            className="text-white/80 hover:text-white"
          >
            <NotificationBell count={unreadCount} />
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
            className="text-white/80 hover:text-white"
          >
            <Menu className="size-5" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto pb-24 md:pb-0">
          <Outlet />
        </main>

        <SideMenuDrawer
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          persistOnDesktop
        />
      </div>

      <QuickNavPill />
    </div>
  )
}

export default AppShell
