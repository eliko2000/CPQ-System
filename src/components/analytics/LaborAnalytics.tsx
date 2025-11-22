/**
 * Labor Analytics - Labor distribution and trends
 *
 * Displays:
 * - Labor subtype distribution (engineering, commissioning, installation)
 * - Labor cost trend over time
 * - Material vs labor heavy quotations count
 */

import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { formatCurrencyILS, formatMonthKey } from '../../utils/analyticsCalculations';
import type { LaborMetrics } from '../../utils/analyticsCalculations';

interface LaborAnalyticsProps {
  data: LaborMetrics;
}

export function LaborAnalytics({ data }: LaborAnalyticsProps) {
  // Colors for labor subtypes (matching quotation statistics)
  const LABOR_COLORS = {
    engineering: '#3b82f6',    // blue-500
    commissioning: '#f97316',  // orange-500
    installation: '#22c55e'    // green-500
  };

  // Transform labor by subtype for pie chart
  const laborSubtypeData = [
    {
      name: 'הנדסה',
      value: data.laborBySubtype.engineering.costILS,
      days: data.laborBySubtype.engineering.days,
      percent: data.laborBySubtype.engineering.percent,
      color: LABOR_COLORS.engineering
    },
    {
      name: 'הרצה',
      value: data.laborBySubtype.commissioning.costILS,
      days: data.laborBySubtype.commissioning.days,
      percent: data.laborBySubtype.commissioning.percent,
      color: LABOR_COLORS.commissioning
    },
    {
      name: 'התקנה',
      value: data.laborBySubtype.installation.costILS,
      days: data.laborBySubtype.installation.days,
      percent: data.laborBySubtype.installation.percent,
      color: LABOR_COLORS.installation
    }
  ].filter(item => item.value > 0); // Only show non-zero values

  // Transform material vs labor for bar chart
  const materialVsLaborData = [
    { type: 'עתירות חומרים', count: data.materialHeavyCount },
    { type: 'עתירות עבודה', count: data.laborHeavyCount }
  ];

  // Custom tooltip for pie chart
  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
          <p className="font-semibold">{data.name}</p>
          <p className="text-sm text-gray-600">ימי עבודה: {data.days.toFixed(1)}</p>
          <p className="text-sm text-gray-600">עלות: {formatCurrencyILS(data.value)}</p>
          <p className="text-sm text-gray-600">אחוז: {data.percent.toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for line chart
  const LineTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
          <p className="font-semibold">{formatMonthKey(payload[0].payload.month)}</p>
          <p className="text-sm text-gray-600">{formatCurrencyILS(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Labor Subtype Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">התפלגות סוגי עבודה</CardTitle>
        </CardHeader>
        <CardContent>
          {laborSubtypeData.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">אין נתוני עבודה</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Pie Chart */}
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={laborSubtypeData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    label={(entry) => `${entry.name}`}
                  >
                    {laborSubtypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              {/* Summary Stats */}
              <div className="flex flex-col justify-center space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">סה"כ ימי עבודה</p>
                  <p className="text-3xl font-bold text-orange-600">{data.totalLaborDays.toFixed(1)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">סה"כ עלות עבודה</p>
                  <p className="text-xl font-bold text-orange-700">{formatCurrencyILS(data.totalLaborCostILS)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">ממוצע % עבודה</p>
                  <p className="text-xl font-bold text-orange-700">{data.avgLaborPercentPerQuotation.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Labor Cost Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">מגמת עלות עבודה לאורך זמן</CardTitle>
        </CardHeader>
        <CardContent>
          {data.laborTrend.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">אין נתונים להצגה</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart
                data={data.laborTrend}
                margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  tickFormatter={(value) => formatMonthKey(value)}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  tickFormatter={(value) => `₪${(value / 1000).toFixed(0)}K`}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip content={<LineTooltip />} />
                <Line
                  type="monotone"
                  dataKey="laborCostILS"
                  stroke="#f97316"
                  strokeWidth={2}
                  name="עלות עבודה"
                  dot={{ fill: '#f97316', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Material vs Labor Heavy */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">סיווג הצעות לפי סוג</CardTitle>
        </CardHeader>
        <CardContent>
          {data.materialHeavyCount === 0 && data.laborHeavyCount === 0 ? (
            <p className="text-center text-muted-foreground py-8">אין נתונים להצגה</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                data={materialVsLaborData}
                margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="type"
                  tick={{ fontSize: 12 }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number) => [`${value} הצעות מחיר`, 'מספר']}
                />
                <Bar dataKey="count" fill="#8884d8" name="מספר הצעות" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}

          {/* Summary text */}
          <div className="mt-4 text-center text-sm text-muted-foreground">
            <p>
              {data.materialHeavyCount} הצעות עתירות חומרים (60%+ חומרים)
              • {data.laborHeavyCount} הצעות עתירות עבודה (60%+ עבודה)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
