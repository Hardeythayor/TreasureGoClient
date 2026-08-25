import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { useAuth } from '@/context/AuthContext'
import {
  disablePushNotifications,
  enablePushNotifications,
  isPushNotificationsEnabled,
} from '@/lib/beams'

function SettingsRow({ label, to, right }) {
  const content = (
    <div className="flex items-center justify-between px-4 py-3 text-sm">
      <span>{label}</span>
      {right ?? <ChevronRight className="size-4 text-muted-foreground" />}
    </div>
  )

  return to ? (
    <Link to={to} className="block hover:bg-muted/50">
      {content}
    </Link>
  ) : (
    content
  )
}

function SettingsGroup({ title, children }) {
  return (
    <section className="mb-6">
      <h3 className="mb-1.5 px-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </h3>
      <Card size="sm" className="divide-y divide-border py-0">
        <CardContent className="px-0">{children}</CardContent>
      </Card>
    </section>
  )
}

function SettingsPage() {
  const { user } = useAuth()
  const [push, setPush] = useState(false)
  const [pushBusy, setPushBusy] = useState(false)
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    isPushNotificationsEnabled().then(setPush)
  }, [])

  async function handleTogglePush(next) {
    setPushBusy(true)
    try {
      if (next) {
        if (!user?.id) throw new Error('You must be logged in to enable push notifications.')
        await enablePushNotifications(user.id)
      } else {
        await disablePushNotifications()
      }
      setPush(next)
    } catch (err) {
      toast.error(err?.message || 'Failed to update push notification settings.')
    } finally {
      setPushBusy(false)
    }
  }

  return (
    <div>
      <div className="mx-auto max-w-xl p-6">
        <SettingsGroup title="Notifications">
          <SettingsRow
            label="Push notifications"
            right={<Switch checked={push} onCheckedChange={handleTogglePush} disabled={pushBusy} />}
          />
        </SettingsGroup>
        <SettingsGroup title="Privacy">
          <SettingsRow label="Location permissions" />
        </SettingsGroup>
        <SettingsGroup title="Account">
          <SettingsRow label="Change password" />
          <SettingsRow label="Change email" />
        </SettingsGroup>
        <SettingsGroup title="App">
          <SettingsRow label="Language" to="/settings/language" />
          <SettingsRow
            label="Dark mode"
            right={<Switch checked={darkMode} onCheckedChange={setDarkMode} />}
          />
        </SettingsGroup>
      </div>
    </div>
  )
}

export default SettingsPage
