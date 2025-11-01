import React, { useState, useEffect } from 'react'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { X, Check, Hash } from 'lucide-react'
import { useClickOutside } from '../../hooks/useClickOutside'

interface NumberFilterProps {
  onFilterChange: (filterModel: any) => void
  onClose: () => void
  title: string
  position?: { top: number; left: number }
  currentFilter?: any
}

type NumberFilterType = 'all' | 'equals' | 'notEqual' | 'lessThan' | 'lessThanOrEqual' | 'greaterThan' | 'greaterThanOrEqual' | 'between'

export function NumberFilter({ onFilterChange, onClose, title, position, currentFilter }: NumberFilterProps) {
  const [filterType, setFilterType] = useState<NumberFilterType>('all')
  const [value1, setValue1] = useState('')
  const [value2, setValue2] = useState('')

  const filterRef = useClickOutside<HTMLDivElement>(() => {
    onClose()
  })

  // Initialize from current filter
  useEffect(() => {
    if (currentFilter) {
      if (currentFilter.type) {
        setFilterType(currentFilter.type)
      }
      if (currentFilter.filter !== undefined) {
        setValue1(String(currentFilter.filter))
      }
      if (currentFilter.filterTo !== undefined) {
        setValue2(String(currentFilter.filterTo))
      }
    }
  }, [currentFilter])

  const handleApply = () => {
    if (filterType === 'all') {
      onFilterChange(null)
    } else {
      const num1 = parseFloat(value1)
      const num2 = parseFloat(value2)

      if (filterType === 'between') {
        if (isNaN(num1) || isNaN(num2)) {
          alert('אנא הזן שני מספרים תקינים')
          return
        }
        onFilterChange({
          filterType: 'number',
          type: filterType,
          filter: num1,
          filterTo: num2
        })
      } else {
        if (isNaN(num1)) {
          alert('אנא הזן מספר תקין')
          return
        }
        onFilterChange({
          filterType: 'number',
          type: filterType,
          filter: num1
        })
      }
    }
    onClose()
  }

  const handleClear = () => {
    setFilterType('all')
    setValue1('')
    setValue2('')
    onFilterChange(null)
    onClose()
  }

  const filterOptions: { value: NumberFilterType; label: string; symbol?: string }[] = [
    { value: 'all', label: 'הכל' },
    { value: 'equals', label: 'שווה ל', symbol: '=' },
    { value: 'notEqual', label: 'לא שווה ל', symbol: '≠' },
    { value: 'lessThan', label: 'קטן מ', symbol: '<' },
    { value: 'lessThanOrEqual', label: 'קטן או שווה ל', symbol: '≤' },
    { value: 'greaterThan', label: 'גדול מ', symbol: '>' },
    { value: 'greaterThanOrEqual', label: 'גדול או שווה ל', symbol: '≥' },
    { value: 'between', label: 'בין', symbol: '[]' }
  ]

  const needsValue1 = filterType !== 'all'
  const needsValue2 = filterType === 'between'

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
          <Hash className="h-4 w-4 text-muted-foreground" />
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
          onChange={(e) => setFilterType(e.target.value as NumberFilterType)}
          className="w-full px-3 py-2 border border-border rounded-md bg-background"
        >
          {filterOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.symbol ? `${option.label} (${option.symbol})` : option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Number Inputs */}
      {needsValue1 && (
        <div className="mt-4 space-y-2">
          <label className="text-sm font-medium">
            {filterType === 'between' ? 'מערך' : 'ערך'}
          </label>
          <Input
            type="number"
            value={value1}
            onChange={(e) => setValue1(e.target.value)}
            placeholder="הזן מספר"
            className="w-full"
            step="any"
          />
        </div>
      )}

      {needsValue2 && (
        <div className="mt-3 space-y-2">
          <label className="text-sm font-medium">עד ערך</label>
          <Input
            type="number"
            value={value2}
            onChange={(e) => setValue2(e.target.value)}
            placeholder="הזן מספר"
            className="w-full"
            step="any"
          />
        </div>
      )}

        {/* Preview */}
        {filterType !== 'all' && value1 && (
          <div className="mt-4 p-2 bg-muted rounded text-xs">
            {filterType === 'equals' && `= ${value1}`}
            {filterType === 'notEqual' && `≠ ${value1}`}
            {filterType === 'lessThan' && `< ${value1}`}
            {filterType === 'lessThanOrEqual' && `≤ ${value1}`}
            {filterType === 'greaterThan' && `> ${value1}`}
            {filterType === 'greaterThanOrEqual' && `≥ ${value1}`}
            {filterType === 'between' && value2 && `${value1} - ${value2}`}
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
