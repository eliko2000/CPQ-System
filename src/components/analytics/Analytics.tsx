import { useMemo } from 'react'
import { useAnalytics } from '../../hooks/useAnalytics'
import { StatisticsOverview } from './StatisticsOverview'
import { RevenueAnalytics } from './RevenueAnalytics'
import { MarginAnalytics } from './MarginAnalytics'
import { ComponentAnalytics } from './ComponentAnalytics'
import { LaborAnalytics } from './LaborAnalytics'
import { DateRangeFilter } from './DateRangeFilter'
import { CategoryFilter } from './CategoryFilter'
import { ExportButton } from './ExportButton'
import { Card, CardContent } from '../ui/card'
import { AlertCircle, Loader2 } from 'lucide-react'
import { formatMonthKey } from '../../utils/analyticsCalculations'

export function Analytics() {
  const analytics = useAnalytics()

  // Get unique categories from all quotations
  const availableCategories = useMemo(() => {
    const categories = new Set<string>()
    analytics.filteredQuotations.forEach(q => {
      q.items.forEach(item => {
        if (item.componentCategory) {
          categories.add(item.componentCategory)
        }
      })
    })
    return Array.from(categories).sort()
  }, [analytics.filteredQuotations])

  // Loading state
  if (analytics.loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" dir="rtl">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">טוען נתונים...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (analytics.error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" dir="rtl">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-destructive mb-2">
              <AlertCircle className="h-5 w-5" />
              <h3 className="font-semibold">שגיאה בטעינת נתונים</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {analytics.error.message || 'אירעה שגיאה בטעינת נתוני האנליטיקה'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Empty state - no quotations
  if (analytics.totalQuotationsCount === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" dir="rtl">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <h3 className="font-semibold text-lg mb-2">אין נתונים להצגה</h3>
            <p className="text-sm text-muted-foreground">
              טרם נוצרו הצעות מחיר במערכת.
              <br />
              התחל על ידי יצירת הצעת מחיר ראשונה כדי לצפות באנליטיקה.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Calculate date range display
  const dateRangeLabel = analytics.dateRange.label || formatDateRange(analytics.dateRange)

  return (
    <div dir="rtl" className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">אנליטיקה ומדדי ביצועים</h1>
          <p className="text-muted-foreground mt-1">
            מציג {analytics.filteredCount} הצעות מחיר
            {analytics.filteredCount !== analytics.totalQuotationsCount &&
              ` מתוך ${analytics.totalQuotationsCount} סה"כ`
            }
            {' • '}
            {dateRangeLabel}
          </p>
        </div>
        <ExportButton
          revenue={analytics.revenueMetrics}
          margin={analytics.marginMetrics}
          component={analytics.componentAnalytics}
          labor={analytics.laborMetrics}
          customer={analytics.customerMetrics}
          dateRange={analytics.dateRange}
        />
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <DateRangeFilter
          currentRange={analytics.dateRangeType}
          onRangeChange={analytics.setDateRange}
          dateRange={analytics.dateRange}
        />

        <CategoryFilter
          selectedCategories={analytics.categoryFilter}
          onCategoriesChange={analytics.setCategoryFilter}
          availableCategories={availableCategories}
        />
      </div>

      {/* KPI Overview */}
      <StatisticsOverview
        revenue={analytics.revenueMetrics}
        margin={analytics.marginMetrics}
        trends={analytics.trendMetrics}
      />

      {/* Charts Grid - Revenue & Margin Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueAnalytics data={analytics.revenueMetrics} />
        <MarginAnalytics data={analytics.marginMetrics} />
      </div>

      {/* Component & Labor Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ComponentAnalytics data={analytics.componentAnalytics} />
        <LaborAnalytics data={analytics.laborMetrics} />
      </div>
    </div>
  )
}

/**
 * Format date range for display
 */
function formatDateRange(range: { start: Date; end: Date }): string {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('he-IL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date)
  }

  return `${formatDate(range.start)} - ${formatDate(range.end)}`
}