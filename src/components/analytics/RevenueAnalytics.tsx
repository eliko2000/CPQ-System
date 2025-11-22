import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatCurrencyILS, formatMonthKey } from '../../utils/analyticsCalculations';
import type { RevenueMetrics } from '../../utils/analyticsCalculations';

interface RevenueAnalyticsProps {
  data: RevenueMetrics;
}

export function RevenueAnalytics({ data }: RevenueAnalyticsProps) {
  // Transform data for monthly revenue chart
  const monthlyRevenueData = data.revenueByMonth.map(item => ({
    month: formatMonthKey(item.month),
    revenue: item.revenue
  }));

  // Transform data for revenue by status chart
  const revenueByStatusData = [
    { status: 'טיוטות', value: data.draftCount, color: '#94a3b8' },
    { status: 'נשלחו', value: data.sentCount, color: '#3b82f6' },
    { status: 'זכו', value: data.wonCount, color: '#22c55e' },
    { status: 'הפסידו', value: data.lostCount, color: '#ef4444' }
  ];

  return (
    <div className="space-y-6">
      {/* Monthly Revenue Trend */}
      <Card>
        <CardHeader>
          <CardTitle>מגמת הכנסות חודשית</CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyRevenueData.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              אין נתוני הכנסות להצגה
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyRevenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  tickFormatter={(value) => `₪${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrencyILS(value), 'הכנסות']}
                  labelStyle={{ direction: 'rtl' }}
                  contentStyle={{ direction: 'rtl', textAlign: 'right' }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#8884d8"
                  strokeWidth={2}
                  name="הכנסות"
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Revenue by Status */}
      <Card>
        <CardHeader>
          <CardTitle>הצעות לפי סטטוס</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={revenueByStatusData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" />
              <YAxis />
              <Tooltip
                formatter={(value: number) => [value, 'מספר הצעות']}
                labelStyle={{ direction: 'rtl' }}
                contentStyle={{ direction: 'rtl', textAlign: 'right' }}
              />
              <Bar dataKey="value" name="מספר הצעות">
                {revenueByStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Revenue Summary */}
      <Card>
        <CardHeader>
          <CardTitle>סיכום הכנסות</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">סה"כ הכנסות</p>
              <p className="text-2xl font-bold">{formatCurrencyILS(data.totalRevenue)}</p>
              <p className="text-xs text-muted-foreground mt-1">מהצעות שזכו</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">ממוצע הצעה</p>
              <p className="text-2xl font-bold">{formatCurrencyILS(data.averageWonValue)}</p>
              <p className="text-xs text-muted-foreground mt-1">בהצעות שזכו</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">הצעות שזכו</p>
              <p className="text-2xl font-bold">{data.wonCount}</p>
              <p className="text-xs text-muted-foreground mt-1">מתוך {data.wonCount + data.lostCount + data.sentCount} נשלחו</p>
            </div>
          </div>

          {/* Pipeline Value */}
          <div className="mt-6 pt-6 border-t">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">ערך צינור (Pipeline)</p>
                <p className="text-xl font-semibold">{formatCurrencyILS(data.pipelineValue)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">הצעות פתוחות</p>
                <p className="text-xl font-semibold">{data.draftCount + data.sentCount}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
