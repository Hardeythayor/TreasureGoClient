import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import PasswordChecklist from 'react-password-checklist'
import { ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { PasswordInput } from '@/components/ui/password-input'
import { FieldError } from '@/components/ui/field-error'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { useAuth } from '@/context/AuthContext'
import { getFieldErrors } from '@/lib/formErrors'
import {
  disablePushNotifications,
  enablePushNotifications,
  isPushNotificationsEnabled,
} from '@/lib/beams'

const PASSWORD_RULES = ['minLength', 'capital', 'number', 'specialChar', 'match']

function SettingsRow({ label, to, right, onClick }) {
  const content = (
    <div className="flex items-center justify-between px-4 py-3 text-sm">
      <span>{label}</span>
      {right ?? <ChevronRight className="size-4 text-muted-foreground" />}
    </div>
  )

  if (to) {
    return (
      <Link to={to} className="block hover:bg-muted/50">
        {content}
      </Link>
    )
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="block w-full text-left hover:bg-muted/50">
        {content}
      </button>
    )
  }

  return content
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

const labelClass = 'text-xs font-semibold text-navy-mid'

const EMPTY_PASSWORD_FORM = { currentPassword: '', newPassword: '', passwordConfirmation: '' }

const PASSWORD_FIELD_KEY_MAP = {
  currentPassword: 'current_password',
  newPassword: 'new_password',
  passwordConfirmation: 'password_confirmation',
}

function SettingsPage() {
  const { user, changePassword } = useAuth()
  const [push, setPush] = useState(false)
  const [pushBusy, setPushBusy] = useState(false)

  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [passwordForm, setPasswordForm] = useState(EMPTY_PASSWORD_FORM)
  const [passwordFieldErrors, setPasswordFieldErrors] = useState({})
  const [newPasswordValid, setNewPasswordValid] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

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

  function openPasswordDialog() {
    setPasswordForm(EMPTY_PASSWORD_FORM)
    setPasswordFieldErrors({})
    setPasswordDialogOpen(true)
  }

  function updatePasswordField(field) {
    return (e) => {
      setPasswordForm((f) => ({ ...f, [field]: e.target.value }))
      const backendKey = PASSWORD_FIELD_KEY_MAP[field] ?? field
      setPasswordFieldErrors((prev) => {
        if (!prev[backendKey]) return prev
        const next = { ...prev }
        delete next[backendKey]
        return next
      })
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    if (!newPasswordValid) {
      toast.error('Please meet all password requirements.')
      return
    }

    setPasswordFieldErrors({})
    setChangingPassword(true)
    try {
      await changePassword(passwordForm)
      toast.success('Password changed.')
      setPasswordDialogOpen(false)
    } catch (err) {
      const fields = getFieldErrors(err)
      setPasswordFieldErrors(fields)
      if (Object.keys(fields).length === 0) {
        toast.error(err?.message || 'Failed to change your password.')
      }
    } finally {
      setChangingPassword(false)
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
          <SettingsRow label="Change password" onClick={openPasswordDialog} />
          {/* <SettingsRow label="Change email" /> */}
        </SettingsGroup>
        {/* <SettingsGroup title="App">
          <SettingsRow label="Language" to="/settings/language" />
          <SettingsRow
            label="Dark mode"
            right={<Switch checked={darkMode} onCheckedChange={setDarkMode} />}
          />
        </SettingsGroup> */}
      </div>

      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>Enter your current password and a new one.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleChangePassword} className="space-y-3">
            <div className="space-y-1">
              <label className={labelClass} htmlFor="current-password">
                Current Password
              </label>
              <PasswordInput
                id="current-password"
                required
                autoComplete="current-password"
                value={passwordForm.currentPassword}
                onChange={updatePasswordField('currentPassword')}
              />
              <FieldError message={passwordFieldErrors.current_password} />
            </div>

            <div className="space-y-1">
              <label className={labelClass} htmlFor="new-password">
                New Password
              </label>
              <PasswordInput
                id="new-password"
                required
                autoComplete="new-password"
                value={passwordForm.newPassword}
                onChange={updatePasswordField('newPassword')}
              />
              <FieldError message={passwordFieldErrors.new_password} />
            </div>

            <div className="space-y-1">
              <label className={labelClass} htmlFor="new-password-confirmation">
                Confirm New Password
              </label>
              <PasswordInput
                id="new-password-confirmation"
                required
                autoComplete="new-password"
                value={passwordForm.passwordConfirmation}
                onChange={updatePasswordField('passwordConfirmation')}
              />
              <FieldError message={passwordFieldErrors.password_confirmation} />
              {passwordForm.newPassword && (
                <PasswordChecklist
                  rules={PASSWORD_RULES}
                  minLength={8}
                  value={passwordForm.newPassword}
                  valueAgain={passwordForm.passwordConfirmation}
                  onChange={setNewPasswordValid}
                  className="space-y-1"
                  itemClassName="text-[11px]"
                  iconSize={12}
                  validTextColor="#16a34a"
                  invalidTextColor="#71717a"
                />
              )}
            </div>

            <DialogFooter className="mt-2">
              <DialogClose asChild>
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={changingPassword}>
                {changingPassword ? 'Saving…' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SettingsPage
