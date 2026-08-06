import { BrowserRouter } from 'react-router'
import { AuthProvider } from '@/context/AuthContext'
import { SubscriptionProvider } from '@/context/SubscriptionContext'
import { HuntProvider } from '@/context/HuntContext'
import { TreasureStatusProvider } from '@/context/TreasureStatusContext'
import { NotificationsProvider } from '@/context/NotificationsContext'
import AppRoutes from './AppRoutes'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SubscriptionProvider>
          <TreasureStatusProvider>
            <NotificationsProvider>
              <HuntProvider>
                <AppRoutes />
              </HuntProvider>
            </NotificationsProvider>
          </TreasureStatusProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
