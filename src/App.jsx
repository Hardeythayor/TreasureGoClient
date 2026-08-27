import { BrowserRouter } from 'react-router'
import { AuthProvider } from '@/context/AuthContext'
import { SubscriptionProvider } from '@/context/SubscriptionContext'
import { HuntProvider } from '@/context/HuntContext'
import { TreasureStatusProvider } from '@/context/TreasureStatusContext'
import { NotificationsProvider } from '@/context/NotificationsContext'
import { SubscriptionTiersProvider } from '@/context/SubscriptionTiersContext'
import { AdminTreasuresProvider } from '@/context/AdminTreasuresContext'
import { AdminUsersProvider } from '@/context/AdminUsersContext'
import { AdminTreasureRewardsProvider } from '@/context/AdminTreasureRewardsContext'
import { AdminMessagesProvider } from '@/context/AdminMessagesContext'
import { AdminMessagesFeedProvider } from '@/context/AdminMessagesFeedContext'
import { RewardsProvider } from '@/context/RewardsContext'
import { MessagesProvider } from '@/context/MessagesContext'
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
                <AdminTreasuresProvider>
                  <AdminUsersProvider>
                    <AdminTreasureRewardsProvider>
                      <AdminMessagesProvider>
                        <AdminMessagesFeedProvider>
                          <RewardsProvider>
                            <MessagesProvider>
                              <HuntProvider>
                                <AppRoutes />
                              </HuntProvider>
                            </MessagesProvider>
                          </RewardsProvider>
                        </AdminMessagesFeedProvider>
                      </AdminMessagesProvider>
                    </AdminTreasureRewardsProvider>
                  </AdminUsersProvider>
                </AdminTreasuresProvider>
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
