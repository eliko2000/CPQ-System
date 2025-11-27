/**
 * Component Analytics - Component usage and category analysis
 *
 * Displays:
 * - Top 10 components by quantity
 * - Category distribution (pie chart)
 * - HW:SW:Labor type ratio (progress bars)
 */

import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { ComponentAnalytics } from '../../utils/analyticsCalculations';
import { formatCurrencyILS } from '../../utils/analyticsCalculations';

interface ComponentAnalyticsProps {
  data: ComponentAnalytics;
}

export function ComponentAnalytics({ data }: ComponentAnalyticsProps) {
  // Colors for category pie chart
  const CATEGORY_COLORS = [
    '#0088FE', // Blue
    '#00C49F', // Teal
    '#FFBB28', // Yellow
    '#FF8042', // Orange
    '#8884D8', // Purple
    '#82CA9D', // Light green
    '#FFC658', // Gold
    '#8DD1E1', // Sky blue
    '#FF6B9D', // Pink
    '#A4DE6C', // Lime
  ];

  // Colors for type ratio (match quotation statistics)
  const TYPE_COLORS = {
    hardware: '#3b82f6', // blue-500
    software: '#22c55e', // green-500
    labor: '#f97316', // orange-500
  };

  // Transform type ratio for progress bars
  const typeRatioData = [
    {
      name: 'חומרה',
      value: data.typeRatio.hardware,
      color: TYPE_COLORS.hardware,
    },
    {
      name: 'תוכנה',
      value: data.typeRatio.software,
      color: TYPE_COLORS.software,
    },
    { name: 'עבודה', value: data.typeRatio.labor, color: TYPE_COLORS.labor },
  ].filter(item => item.value > 0); // Only show non-zero values

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
          <p className="font-semibold">{data.componentName || data.category}</p>
          <p className="text-sm text-gray-600">
            כמות: {data.totalQuantity || data.count}
          </p>
          {data.totalSpendILS !== undefined && (
            <p className="text-sm text-gray-600">
              סכום: {formatCurrencyILS(data.totalSpendILS)}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Top 10 Components */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">10 הרכיבים הנפוצים ביותר</CardTitle>
        </CardHeader>
        <CardContent>
          {data.topComponents.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              אין נתונים להצגה
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={data.topComponents.slice(0, 10)}
                layout="vertical"
                margin={{ left: 20, right: 30, top: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis
                  type="category"
                  dataKey="componentName"
                  tick={{ fontSize: 12 }}
                  width={150}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="totalQuantity" fill="#8884d8" name="כמות" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Category Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">התפלגות לפי קטגוריה</CardTitle>
        </CardHeader>
        <CardContent>
          {data.usageByCategory.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              אין נתונים להצגה
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={data.usageByCategory}
                  dataKey="count"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={110}
                  label={(props: any) => {
                    const payload = props.payload || {};
                    return payload.category
                      ? `${payload.category} (${payload.count})`
                      : '';
                  }}
                  labelLine={{ stroke: '#888', strokeWidth: 1 }}
                >
                  {data.usageByCategory.map((_entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Type Ratio - HW:SW:Labor */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">יחס חומרה:תוכנה:עבודה</CardTitle>
        </CardHeader>
        <CardContent>
          {typeRatioData.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              אין נתונים להצגה
            </p>
          ) : (
            <div className="space-y-4">
              {typeRatioData.map(item => (
                <div key={item.name}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">{item.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {item.value.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="h-3 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(item.value, 100)}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
