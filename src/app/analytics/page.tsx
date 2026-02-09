import { AnalyticsDashboard } from '@/components/analytics/analytics-dashboard'

export default function AnalyticsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
        Analytics
      </h1>
      <p className="text-zinc-500 dark:text-zinc-400 mb-8">
        Track your social media performance
      </p>

      <AnalyticsDashboard />
    </div>
  )
}
