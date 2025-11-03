import { useState, useEffect } from 'react'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { X, Check, Calendar } from 'lucide-react'
import { useClickOutside } from '../../hooks/useClickOutside'

interface DateFilterProps {
  onFilterChange: (filterModel: any) => void
  onClose: () => void
  title: string
  position?: { top: number; left: number }
  currentFilter?: any
}

type DateFilterType = 'all' | 'equals' | 'before' | 'after' | 'between' | 'lastWeek' | 'lastMonth' | 'lastYear' | 'thisWeek' | 'thisMonth' | 'thisYear'

export function DateFilter({ onFilterChange, onClose, title, position, currentFilter }: DateFilterProps) {
  const [filterType, setFilterType] = useState<DateFilterType>('all')
  const [date1, setDate1] = useState('')
  const [date2, setDate2] = useState('')

  const filterRef = useClickOutside<HTMLDivElement>(() => {
    onClose()
  })

  // Initialize from current filter
  useEffect(() => {
    if (currentFilter) {
      if (currentFilter.type) {
        setFilterType(currentFilter.type)
      }
      if (currentFilter.dateFrom) {
        setDate1(currentFilter.dateFrom)
      }
      if (currentFilter.dateTo) {
        setDate2(currentFilter.dateTo)
      }
    }
  }, [currentFilter])

  const getDateRange = (type: DateFilterType): { from?: string; to?: string } => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    switch (type) {
      case 'lastWeek': {
        const lastWeekStart = new Date(today)
        lastWeekStart.setDate(today.getDate() - 7)
        return { from: lastWeekStart.toISOString().split('T')[0], to: today.toISOString().split('T')[0] }
      }
      case 'lastMonth': {
        const lastMonthStart = new Date(today)
        lastMonthStart.setMonth(today.getMonth() - 1)
        return { from: lastMonthStart.toISOString().split('T')[0], to: today.toISOString().split('T')[0] }
      }
      case 'lastYear': {
        const lastYearStart = new Date(today)
        lastYearStart.setFullYear(today.getFullYear() - 1)
        return { from: lastYearStart.toISOString().split('T')[0], to: today.toISOString().split('T')[0] }
      }
      case 'thisWeek': {
        const dayOfWeek = today.getDay()
        const thisWeekStart = new Date(today)
        thisWeekStart.setDate(today.getDate() - dayOfWeek)
        return { from: thisWeekStart.toISOString().split('T')[0], to: today.toISOString().split('T')[0] }
      }
      case 'thisMonth': {
        const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
        return { from: thisMonthStart.toISOString().split('T')[0], to: today.toISOString().split('T')[0] }
      }
      case 'thisYear': {
        const thisYearStart = new Date(today.getFullYear(), 0, 1)
        return { from: thisYearStart.toISOString().split('T')[0], to: today.toISOString().split('T')[0] }
      }
      default:
        return {}
    }
  }

  const handleApply = () => {
    if (filterType === 'all') {
      onFilterChange(null)
    } else {
      let filterModel: any = { filterType: 'date', type: filterType }

      if (filterType === 'equals' || filterType === 'before' || filterType === 'after') {
        if (!date1) {
          alert('אנא בחר תאריך')
          return
        }
        filterModel.dateFrom = date1
      } else if (filterType === 'between') {
        if (!date1 || !date2) {
          alert('אנא בחר שני תאריכים')
          return
        }
        filterModel.dateFrom = date1
        filterModel.dateTo = date2
      } else {
        // Preset ranges
        const range = getDateRange(filterType)
        filterModel.dateFrom = range.from
        filterModel.dateTo = range.to
      }

      onFilterChange(filterModel)
    }
    onClose()
  }

  const handleClear = () => {
    setFilterType('all')
    setDate1('')
    setDate2('')
    onFilterChange(null)
    onClose()
  }

  const filterOptions: { value: DateFilterType; label: string }[] = [
    { value: 'all', label: 'הכל' },
    { value: 'equals', label: 'שווה ל' },
    { value: 'before', label: 'לפני' },
    { value: 'after', label: 'אחרי' },
    { value: 'between', label: 'בין' },
    { value: 'lastWeek', label: 'שבוע אחרון' },
    { value: 'lastMonth', label: 'חודש אחרון' },
    { value: 'lastYear', label: 'שנה אחרונה' },
    { value: 'thisWeek', label: 'השבוע' },
    { value: 'thisMonth', label: 'החודש' },
    { value: 'thisYear', label: 'השנה' }
  ]

  const needsDate1 = ['equals', 'before', 'after', 'between'].includes(filterType)
  const needsDate2 = filterType === 'between'

  return (
    <div
      ref={filterRef}
      className="fixed bg-background border border-border rounded-md shadow-lg z-[999999] min-w-80 flex flex-col"
      style={{
        top: `${position?.top || 0}px`,
        left: `${position?.left || 0}px`,
        maxHeight: '500px'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <h4 className="font-medium">{title}</h4>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-6 w-6 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content - Scrollable */}
      <div className="overflow-y-auto flex-1 px-4">
        {/* Filter Type Selection */}
        <div className="space-y-3">
        <label className="text-sm font-medium">סוג סינון</label>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as DateFilterType)}
          className="w-full px-3 py-2 border border-border rounded-md bg-background"
        >
          {filterOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Date Inputs */}
      {needsDate1 && (
        <div className="mt-4 space-y-2">
          <label className="text-sm font-medium">
            {filterType === 'between' ? 'מתאריך' : 'תאריך'}
          </label>
          <Input
            type="date"
            value={date1}
            onChange={(e) => setDate1(e.target.value)}
            className="w-full"
          />
        </div>
      )}

      {needsDate2 && (
        <div className="mt-3 space-y-2">
          <label className="text-sm font-medium">עד תאריך</label>
          <Input
            type="date"
            value={date2}
            onChange={(e) => setDate2(e.target.value)}
            className="w-full"
          />
        </div>
      )}

        {/* Preview */}
        {filterType !== 'all' && (
          <div className="mt-4 p-2 bg-muted rounded text-xs">
            {filterType === 'equals' && date1 && `תאריך: ${new Date(date1).toLocaleDateString('he-IL')}`}
            {filterType === 'before' && date1 && `לפני: ${new Date(date1).toLocaleDateString('he-IL')}`}
            {filterType === 'after' && date1 && `אחרי: ${new Date(date1).toLocaleDateString('he-IL')}`}
            {filterType === 'between' && date1 && date2 &&
              `בין: ${new Date(date1).toLocaleDateString('he-IL')} - ${new Date(date2).toLocaleDateString('he-IL')}`}
            {['lastWeek', 'lastMonth', 'lastYear', 'thisWeek', 'thisMonth', 'thisYear'].includes(filterType) &&
              filterOptions.find(o => o.value === filterType)?.label}
          </div>
        )}
      </div>

      {/* Actions - Fixed at bottom */}
      <div className="flex gap-2 p-4 pt-3 border-t flex-shrink-0 bg-background">
        <Button
          size="sm"
          onClick={handleApply}
          disabled={filterType === 'all'}
          className="flex-1"
        >
          <Check className="h-4 w-4 ml-1" />
          החל סינון
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleClear}
          className="flex-1"
        >
          נקה
        </Button>
      </div>
    </div>
  )
}
