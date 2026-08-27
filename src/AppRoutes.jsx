import { Routes, Route } from 'react-router'
import AppShell from '@/components/layout/AppShell'
import AdminShell from '@/components/layout/AdminShell'
import RequireAuth from '@/components/auth/RequireAuth'
import RequireAdminAuth from '@/components/auth/RequireAdminAuth'
import LoginPage from '@/pages/LoginPage'
import SignupPage from '@/pages/SignupPage'
import ForgotPasswordPage from '@/pages/ForgotPasswordPage'
import VerifyResetCodePage from '@/pages/VerifyResetCodePage'
import ResetPasswordPage from '@/pages/ResetPasswordPage'
import VerifyEmailPage from '@/pages/VerifyEmailPage'
import HomePage from '@/pages/HomePage'
import MessagesPage from '@/pages/MessagesPage'
import TreasuresPage from '@/pages/TreasuresPage'
import TierTreasuresPage from '@/pages/TierTreasuresPage'
import ProfilePage from '@/pages/ProfilePage'
import RewardsPage from '@/pages/RewardsPage'
import SettingsPage from '@/pages/SettingsPage'
import LanguagePage from '@/pages/LanguagePage'
import ContactPage from '@/pages/ContactPage'
import CelebrationPage from '@/pages/CelebrationPage'
import RewardDetailPage from '@/pages/RewardDetailPage'
import AdminLoginPage from '@/pages/admin/AdminLoginPage'
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage'
import AdminUsersPage from '@/pages/admin/AdminUsersPage'
import AdminUserDetailPage from '@/pages/admin/AdminUserDetailPage'
import AdminTreasuresPage from '@/pages/admin/AdminTreasuresPage'
import AdminSubscriptionTiersPage from '@/pages/admin/AdminSubscriptionTiersPage'
import AdminTreasureRewardsPage from '@/pages/admin/AdminTreasureRewardsPage'
import AdminMessagesPage from '@/pages/admin/AdminMessagesPage'
import AdminNotificationsPage from '@/pages/admin/AdminNotificationsPage'
import AdminSettingsPage from '@/pages/admin/AdminSettingsPage'

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/verify-reset-code" element={<VerifyResetCodePage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route element={<RequireAuth />}>
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/" element={<HomePage />} />
        <Route path="/hunt/:id/found" element={<CelebrationPage />} />
        <Route path="/hunt/:id/reward" element={<RewardDetailPage />} />

        <Route element={<AppShell />}>
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/treasures" element={<TreasuresPage />} />
          <Route path="/treasures/:tier" element={<TierTreasuresPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/rewards" element={<RewardsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/language" element={<LanguagePage />} />
          <Route path="/contact" element={<ContactPage />} />
        </Route>
      </Route>

      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route element={<RequireAdminAuth />}>
        <Route path="/admin" element={<AdminShell />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="users/:id" element={<AdminUserDetailPage />} />
          <Route path="treasures" element={<AdminTreasuresPage />} />
          <Route path="subscription-tiers" element={<AdminSubscriptionTiersPage />} />
          <Route path="treasure-rewards" element={<AdminTreasureRewardsPage />} />
          <Route path="messages" element={<AdminMessagesPage />} />
          <Route path="notifications" element={<AdminNotificationsPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default AppRoutes
