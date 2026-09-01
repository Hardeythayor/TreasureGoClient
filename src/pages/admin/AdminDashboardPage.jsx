import { useEffect } from 'react'
import { toast } from 'sonner'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent } from '@/components/ui/card'
import { useAdminUsers } from '@/context/AdminUsersContext'
import { useAdminTreasures } from '@/context/AdminTreasuresContext'
import { useSubscriptionTiers } from '@/context/SubscriptionTiersContext'
import { useAdminTreasureRewards } from '@/context/AdminTreasureRewardsContext'
import { useAdminSubscriptionAnalytics } from '@/context/AdminSubscriptionAnalyticsContext'

const tooltipStyle = {
  backgroundColor: 'var(--color-card)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  fontSize: 12,
}

const axisTick = { fontSize: 11, fill: 'var(--color-muted-foreground)' }

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

function SectionLabel({ children }) {
  return (
    <h2 className="mb-2 px-0.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
      {children}
    </h2>
  )
}

function KpiCard({ label, value, loading }) {
  return (
    <Card>
      <CardContent>
        <div className="font-heading text-2xl font-bold text-navy-deep">
          {loading ? '…' : value}
        </div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  )
}

function ChartEmptyState() {
  return (
    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
      No data yet.
    </div>
  )
}

function DoughnutCard({ title, description, data, colors, loading }) {
  const total = data.reduce((sum, d) => sum + d.value, 0)

  return (
    <Card>
      <CardContent>
        <div className="mb-1 text-sm font-semibold">{title}</div>
        <p className="mb-3 text-[11px] text-muted-foreground">{description}</p>
        <div className="h-52">
          {loading ? (
            <div className="h-full animate-pulse rounded-lg bg-muted" />
          ) : total === 0 ? (
            <ChartEmptyState />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={2}
                >
                  {data.map((d, i) => (
                    <Cell key={d.name} fill={colors[i % colors.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend
                  verticalAlign="bottom"
                  height={28}
                  iconType="circle"
                  wrapperStyle={{ fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function AdminDashboardPage() {
  const { userStats, userStatsLoading, fetchUserStats } = useAdminUsers()
  const { treasures, loading: treasuresLoading, fetchTreasures } = useAdminTreasures()
  const { tiers, loading: tiersLoading, fetchTiers } = useSubscriptionTiers()
  const { stats: rewardStats, loading: rewardStatsLoading, fetchStats } = useAdminTreasureRewards()
  const {
    analytics: subscriptionAnalytics,
    loading: subscriptionAnalyticsLoading,
    fetchSubscriptionAnalytics,
  } = useAdminSubscriptionAnalytics()

  useEffect(() => {
    fetchUserStats().catch((err) => toast.error(err?.message || 'Failed to load user stats.'))
    fetchTreasures().catch((err) => toast.error(err?.message || 'Failed to load treasures.'))
    fetchTiers().catch((err) => toast.error(err?.message || 'Failed to load subscription tiers.'))
    fetchStats().catch((err) => toast.error(err?.message || 'Failed to load treasure reward analytics.'))
    fetchSubscriptionAnalytics().catch((err) =>
      toast.error(err?.message || 'Failed to load subscription analytics.'),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const treasuresFound = treasures.filter((t) => t.status === 'Found').length
  const treasuresHidden = treasures.filter((t) => t.status === 'Hidden').length
  const activeTiers = tiers.filter((t) => t.status === 'active').length

  const kpis = [
    { label: 'Total Users', value: userStats.total, loading: userStatsLoading },
    { label: 'Active Users', value: userStats.active, loading: userStatsLoading },
    { label: 'Inactive Users', value: userStats.inactive, loading: userStatsLoading },
    { label: 'Total Treasures', value: treasures.length, loading: treasuresLoading },
    { label: 'Treasures Found', value: treasuresFound, loading: treasuresLoading },
    { label: 'Active Tiers', value: activeTiers, loading: tiersLoading },
    {
      label: 'Subscription Revenue',
      value: currencyFormatter.format(subscriptionAnalytics.totalRevenue),
      loading: subscriptionAnalyticsLoading,
    },
    {
      label: 'Total Subscribers',
      value: subscriptionAnalytics.totalSubscribers,
      loading: subscriptionAnalyticsLoading,
    },
  ]

  const funnelData = [
    { name: 'Found', value: rewardStats.totalFound },
    { name: 'Rewarded', value: rewardStats.totalRewarded },
    { name: 'Pending', value: rewardStats.totalPending },
  ]
  const funnelColors = ['var(--color-chart-5)', 'var(--color-success)', 'var(--color-chart-1)']

  return (
    <div className="space-y-6">
      <div>
        <SectionLabel>Overview</SectionLabel>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {kpis.map((kpi) => (
            <KpiCard key={kpi.label} {...kpi} />
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <DoughnutCard
          title="Users"
          description="Active vs inactive accounts."
          loading={userStatsLoading}
          data={[
            { name: 'Active', value: userStats.active },
            { name: 'Inactive', value: userStats.inactive },
          ]}
          colors={['var(--color-success)', 'var(--color-danger)']}
        />

        <DoughnutCard
          title="Treasures"
          description="Current status of every treasure placed on the map."
          loading={treasuresLoading}
          data={[
            { name: 'Found', value: treasuresFound },
            { name: 'Hidden', value: treasuresHidden },
          ]}
          colors={['var(--color-chart-1)', 'var(--color-chart-2)']}
        />

        <Card>
          <CardContent>
            <div className="mb-1 text-sm font-semibold">Treasure Hunt Funnel</div>
            <p className="mb-3 text-[11px] text-muted-foreground">
              Found, rewarded, and pending treasure hunts.
            </p>
            <div className="h-52">
              {rewardStatsLoading ? (
                <div className="h-full animate-pulse rounded-lg bg-muted" />
              ) : rewardStats.totalFound === 0 ? (
                <ChartEmptyState />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnelData} barCategoryGap="35%">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--color-muted)' }} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {funnelData.map((d, i) => (
                        <Cell key={d.name} fill={funnelColors[i]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <SectionLabel>Subscriptions &amp; Revenue</SectionLabel>
        <Card>
          <CardContent>
            <div className="mb-1 text-sm font-semibold">Subscribers &amp; Revenue by Tier</div>
            <p className="mb-3 text-[11px] text-muted-foreground">
              How many users are subscribed to each tier, and how much revenue that's resulted in.
            </p>
            <div className="h-64">
              {subscriptionAnalyticsLoading ? (
                <div className="h-full animate-pulse rounded-lg bg-muted" />
              ) : subscriptionAnalytics.byTier.length === 0 ? (
                <ChartEmptyState />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subscriptionAnalytics.byTier} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="tierName" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis
                      yAxisId="subscribers"
                      tick={axisTick}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                      width={32}
                    />
                    <YAxis
                      yAxisId="revenue"
                      orientation="right"
                      tick={axisTick}
                      axisLine={false}
                      tickLine={false}
                      width={56}
                      tickFormatter={(v) => currencyFormatter.format(v)}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      cursor={{ fill: 'var(--color-muted)' }}
                      formatter={(value, name) =>
                        name === 'Revenue' ? [currencyFormatter.format(value), name] : [value, name]
                      }
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                    <Bar
                      yAxisId="subscribers"
                      dataKey="subscribers"
                      name="Subscribers"
                      fill="var(--color-chart-1)"
                      radius={[6, 6, 0, 0]}
                    />
                    <Bar
                      yAxisId="revenue"
                      dataKey="revenue"
                      name="Revenue"
                      fill="var(--color-chart-2)"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default AdminDashboardPage
