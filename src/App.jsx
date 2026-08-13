import { BrowserRouter } from 'react-router'
import { AuthProvider } from '@/context/AuthContext'
import { SubscriptionProvider } from '@/context/SubscriptionContext'
import { HuntProvider } from '@/context/HuntContext'
import { TreasureStatusProvider } from '@/context/TreasureStatusContext'
import { NotificationsProvider } from '@/context/NotificationsContext'
import { SubscriptionTiersProvider } from '@/context/SubscriptionTiersContext'
import { Toaster } from '@/components/ui/sonner'
import AppRoutes from './AppRoutes'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SubscriptionProvider>
          <TreasureStatusProvider>
            <NotificationsProvider>
              <SubscriptionTiersProvider>
                <HuntProvider>
                  <AppRoutes />
                </HuntProvider>
              </SubscriptionTiersProvider>
            </NotificationsProvider>
          </TreasureStatusProvider>
        </SubscriptionProvider>
      </AuthProvider>
      <Toaster position="top-center" richColors />
    </BrowserRouter>
  )
}

export default App
