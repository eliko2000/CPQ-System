import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatPercent } from '../../utils/analyticsCalculations';
import type { MarginMetrics } from '../../utils/analyticsCalculations';

interface MarginAnalyticsProps {
  data: MarginMetrics;
}

export function MarginAnalytics({ data }: MarginAnalyticsProps) {
  // Color scale for margin distribution
  const getMarginColor = (range: string): string => {
    if (range.includes('0-10')) return '#ef4444'; // red
    if (range.includes('10-20')) return '#f97316'; // orange
    if (range.includes('20-30')) return '#22c55e'; // green
    return '#10b981'; // bright green
  };

  // Transform margin by type data for chart
  const marginByTypeData = [
    { type: 'חומרה', margin: data.marginByType.hw },
    { type: 'תוכנה', margin: data.marginByType.sw },
    { type: 'עבודה', margin: data.marginByType.labor }
  ];

  return (
    <div className="space-y-6">
      {/* Margin Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>התפלגות מרווחים</CardTitle>
        </CardHeader>
        <CardContent>
          {data.marginDistribution.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              אין נתוני מרווחים להצגה
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.marginDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip
                  formatter={(value: number) => [value, 'מספר הצעות']}
                  labelStyle={{ direction: 'rtl' }}
                  contentStyle={{ direction: 'rtl', textAlign: 'right' }}
                />
                <Bar dataKey="count" name="מספר הצעות">
                  {data.marginDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getMarginColor(entry.range)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          <div className="mt-4 flex items-center justify-center gap-6 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: '#ef4444' }}></div>
              <span>נמוך (0-10%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: '#f97316' }}></div>
              <span>בינוני (10-20%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: '#22c55e' }}></div>
              <span>טוב (20-30%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: '#10b981' }}></div>
              <span>מצוין (30%+)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Margin by Type */}
      <Card>
        <CardHeader>
          <CardTitle>מרווח לפי סוג רכיב</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={marginByTypeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="type" />
              <YAxis tickFormatter={(value) => `${value}%`} />
              <Tooltip
                formatter={(value: number) => [`${value.toFixed(1)}%`, 'מרווח']}
                labelStyle={{ direction: 'rtl' }}
                contentStyle={{ direction: 'rtl', textAlign: 'right' }}
              />
              <Bar dataKey="margin" fill="#8884d8" name="מרווח">
                {marginByTypeData.map((entry, index) => {
                  // Color based on margin value
                  let fillColor = '#94a3b8'; // default gray
                  if (entry.margin >= 30) fillColor = '#10b981'; // green
                  else if (entry.margin >= 20) fillColor = '#22c55e'; // light green
                  else if (entry.margin >= 10) fillColor = '#f97316'; // orange
                  else if (entry.margin > 0) fillColor = '#ef4444'; // red

                  return <Cell key={`cell-${index}`} fill={fillColor} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Min/Max Margins */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">מרווח גבוה ביותר</CardTitle>
          </CardHeader>
          <CardContent>
            {data.maxMargin.quotationId ? (
              <>
                <p className="text-3xl font-bold text-green-600">
                  {formatPercent(data.maxMargin.value)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {data.maxMargin.quotationName || `הצעה: ${data.maxMargin.quotationId.slice(0, 8)}...`}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">אין נתונים</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">מרווח נמוך ביותר</CardTitle>
          </CardHeader>
          <CardContent>
            {data.minMargin.quotationId ? (
              <>
                <p className="text-3xl font-bold text-red-600">
                  {formatPercent(data.minMargin.value)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {data.minMargin.quotationName || `הצעה: ${data.minMargin.quotationId.slice(0, 8)}...`}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">אין נתונים</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Average Margin Summary */}
      <Card>
        <CardHeader>
          <CardTitle>מרווח ממוצע כללי</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <p className="text-4xl font-bold" style={{
              color: data.averageMargin >= 30 ? '#10b981' :
                     data.averageMargin >= 20 ? '#22c55e' :
                     data.averageMargin >= 10 ? '#f97316' : '#ef4444'
            }}>
              {formatPercent(data.averageMargin)}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              ממוצע משוקלל לפי ערך הצעה
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
