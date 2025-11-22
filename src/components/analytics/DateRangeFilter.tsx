import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { Calendar } from 'lucide-react'

interface DateRangeFilterProps {
  currentRange: '30d' | '90d' | 'year' | 'all'
  onRangeChange: (range: '30d' | '90d' | 'year' | 'all') => void
  dateRange: { start: Date; end: Date; label?: string }
}

export function DateRangeFilter({ currentRange, onRangeChange, dateRange }: DateRangeFilterProps) {
  const ranges = [
    { value: '30d' as const, label: '30 ימים' },
    { value: '90d' as const, label: '90 ימים' },
    { value: 'year' as const, label: 'שנה' },
    { value: 'all' as const, label: 'הכל' }
  ]

  return (
    <Card className="p-4">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">טווח תאריכים</span>
        </div>

        <div className="flex gap-2">
          {ranges.map((range) => (
            <Button
              key={range.value}
              variant={currentRange === range.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => onRangeChange(range.value)}
            >
              {range.label}
            </Button>
          ))}
        </div>

        <div className="text-xs text-muted-foreground">
          {dateRange.start.toLocaleDateString('he-IL')} - {dateRange.end.toLocaleDateString('he-IL')}
        </div>
      </div>
    </Card>
  )
}
