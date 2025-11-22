import { Card, CardHeader, CardTitle, CardContent } from '../ui/card'
import {
  TrendingUp,
  TrendingDown,
  FileText,
  Target,
  Percent,
  FileCheck,
  DollarSign
} from 'lucide-react'
import { formatCurrencyILS, formatPercent } from '../../utils/analyticsCalculations'
import type { RevenueMetrics, MarginMetrics, TrendMetrics } from '../../utils/analyticsCalculations'

interface StatisticsOverviewProps {
  revenue: RevenueMetrics
  margin: MarginMetrics
  trends: TrendMetrics
}

export function StatisticsOverview({ revenue, margin, trends }: StatisticsOverviewProps) {
  // Calculate active quotations (draft + sent)
  const activeQuotations = revenue.draftCount + revenue.sentCount

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Total Revenue Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">סה"כ הכנסות</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrencyILS(revenue.totalRevenue)}
          </div>
          {trends.monthOverMonthGrowth !== undefined && trends.monthOverMonthGrowth !== 0 && (
            <p className={`text-xs flex items-center gap-1 mt-1 ${
              trends.monthOverMonthGrowth >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {trends.monthOverMonthGrowth >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              <span>
                {trends.monthOverMonthGrowth >= 0 ? '+' : ''}
                {trends.monthOverMonthGrowth.toFixed(1)}% מהחודש הקודם
              </span>
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {revenue.wonCount} הצעות זכייה
          </p>
        </CardContent>
      </Card>

      {/* Pipeline Value Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">ערך צינור</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrencyILS(revenue.pipelineValue)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {revenue.draftCount} טיוטות + {revenue.sentCount} נשלחו
          </p>
        </CardContent>
      </Card>

      {/* Win Rate Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">אחוז זכייה</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatPercent(trends.winRate)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {revenue.wonCount} זכיות מתוך {revenue.wonCount + revenue.lostCount + revenue.sentCount} הצעות
          </p>
        </CardContent>
      </Card>

      {/* Average Margin Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">מרווח ממוצע</CardTitle>
          <Percent className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatPercent(margin.averageMargin)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            משוקלל לפי ערך הצעה
          </p>
        </CardContent>
      </Card>

      {/* Active Quotations Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">הצעות פעילות</CardTitle>
          <FileCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {activeQuotations}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            בתהליך עבודה
          </p>
        </CardContent>
      </Card>

      {/* Monthly Growth Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">גידול חודשי</CardTitle>
          {trends.monthOverMonthGrowth >= 0 ? (
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          )}
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${
            trends.monthOverMonthGrowth >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {trends.monthOverMonthGrowth >= 0 ? '+' : ''}
            {formatPercent(trends.monthOverMonthGrowth)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            לעומת החודש הקודם
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
