// Performance Metrics Component - Shows KPIs for current period

import { Card, CardContent } from '../ui/card';
import {
  TrendingUp,
  TrendingDown,
  Target,
  Percent,
  DollarSign,
} from 'lucide-react';

interface PerformanceData {
  wonValue: number;
  winRate: number;
  avgMargin: number;
  wonCount: number;
  lostCount: number;
  periodLabel: string;
}

interface PerformanceMetricsProps {
  data: PerformanceData;
  previousPeriod?: Partial<PerformanceData>;
  isLoading?: boolean;
}

// Format currency for display
function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `₪${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `₪${Math.round(value / 1000)}K`;
  }
  return `₪${Math.round(value).toLocaleString()}`;
}

// Calculate percentage change
function getChange(
  current: number,
  previous: number | undefined
): number | null {
  if (previous === undefined || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  suffix = '',
  prefix = '',
}: {
  title: string;
  value: string;
  change: number | null;
  icon: React.ElementType;
  suffix?: string;
  prefix?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="p-2 bg-muted rounded-lg">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{title}</p>
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-bold">
            {prefix}
            {value}
            {suffix}
          </span>
          {change !== null && (
            <span
              className={`text-xs flex items-center ${
                change >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {change >= 0 ? (
                <TrendingUp className="h-3 w-3 ml-0.5" />
              ) : (
                <TrendingDown className="h-3 w-3 ml-0.5" />
              )}
              {change >= 0 ? '+' : ''}
              {change.toFixed(0)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function PerformanceMetrics({
  data,
  previousPeriod,
  isLoading,
}: PerformanceMetricsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="grid grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i}>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const wonChange = getChange(data.wonValue, previousPeriod?.wonValue);
  const winRateChange =
    previousPeriod?.winRate !== undefined
      ? data.winRate - previousPeriod.winRate
      : null;
  const marginChange =
    previousPeriod?.avgMargin !== undefined
      ? data.avgMargin - previousPeriod.avgMargin
      : null;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">ביצועים</h3>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
            {data.periodLabel}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            title="סה״כ נסגר"
            value={formatCurrency(data.wonValue)}
            change={wonChange}
            icon={DollarSign}
          />

          <MetricCard
            title="אחוז סגירה"
            value={isNaN(data.winRate) ? '0' : data.winRate.toFixed(0)}
            change={winRateChange}
            icon={Target}
            suffix="%"
          />

          <MetricCard
            title="רווח ממוצע"
            value={data.avgMargin.toFixed(1)}
            change={marginChange}
            icon={Percent}
            suffix="%"
          />
        </div>

        {/* Win/Loss summary */}
        <div className="mt-4 pt-3 border-t flex items-center justify-center gap-4 text-sm">
          <span className="text-muted-foreground">
            <span className="text-green-600 font-medium">{data.wonCount}</span>{' '}
            נצחונות
          </span>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground">
            <span className="text-red-600 font-medium">{data.lostCount}</span>{' '}
            הפסדים
          </span>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground">
            סה״כ{' '}
            <span className="font-medium">
              {data.wonCount + data.lostCount}
            </span>{' '}
            הצעות שנסגרו
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
