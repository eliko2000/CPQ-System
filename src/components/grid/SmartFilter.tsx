import { useState, useMemo, useEffect } from 'react'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Search, X, Check } from 'lucide-react'
import { useClickOutside } from '../../hooks/useClickOutside'

interface SmartFilterProps {
  values: string[]
  selectedValues?: string[]
  onFilterChange: (selectedValues: string[]) => void
  onClose: () => void
  title: string
  position?: { top: number; left: number }
}

export function SmartFilter({ values, selectedValues: initialSelectedValues = [], onFilterChange, onClose, title, position }: SmartFilterProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedValues, setSelectedValues] = useState<string[]>(initialSelectedValues)
  const [selectAll, setSelectAll] = useState(false)
  
  const filterRef = useClickOutside<HTMLDivElement>(() => {
    onClose()
  })

  // Update selected values when prop changes
  useEffect(() => {
    setSelectedValues(initialSelectedValues)
  }, [initialSelectedValues])

  // Filter values based on search term
  const filteredValues = useMemo(() => {
    if (!searchTerm) return values
    return values.filter(value => 
      value.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [values, searchTerm])

  // Handle select all toggle
  const handleSelectAll = () => {
    const newSelectAll = !selectAll
    setSelectAll(newSelectAll)
    if (newSelectAll) {
      setSelectedValues(filteredValues)
    } else {
      setSelectedValues([])
    }
  }

  // Handle individual value selection
  const handleValueToggle = (value: string) => {
    const newSelected = selectedValues.includes(value)
      ? selectedValues.filter(v => v !== value)
      : [...selectedValues, value]
    
    setSelectedValues(newSelected)
    setSelectAll(newSelected.length === filteredValues.length && filteredValues.length > 0)
  }

  // Apply filter
  const handleApply = () => {
    onFilterChange(selectedValues)
    onClose()
  }

  // Clear filter
  const handleClear = () => {
    setSelectedValues([])
    setSelectAll(false)
    onFilterChange([])
    onClose()
  }

  // Update selectAll state when filtered values change
  useEffect(() => {
    const allSelected = filteredValues.length > 0 && 
      filteredValues.every(value => selectedValues.includes(value))
    setSelectAll(allSelected)
  }, [filteredValues, selectedValues])

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
        <h4 className="font-medium">{title}</h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-6 w-6 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="relative px-4 pb-3 flex-shrink-0">
        <Search className="absolute right-7 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="חיפוש..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pr-10"
        />
      </div>

      {/* Select All */}
      <div className="flex items-center space-x-2 space-x-reverse px-4 pb-2 border-b flex-shrink-0">
        <input
          type="checkbox"
          checked={selectAll}
          onChange={handleSelectAll}
          className="rounded"
        />
        <span className="text-sm font-medium">בחר הכל</span>
        <Badge variant="secondary" className="text-xs mr-auto">
          {filteredValues.length} ערכים
        </Badge>
      </div>

      {/* Values List - Scrollable */}
      <div className="overflow-y-auto flex-1 px-4 py-3" style={{ minHeight: '100px', maxHeight: '250px' }}>
        {filteredValues.length === 0 ? (
          <div className="text-center text-muted-foreground py-4">
            לא נמצאו ערכים
          </div>
        ) : (
          <div className="space-y-1">
            {filteredValues.map((value) => (
              <label
                key={value}
                className="flex items-center space-x-2 space-x-reverse cursor-pointer hover:bg-muted p-2 rounded"
              >
                <input
                  type="checkbox"
                  checked={selectedValues.includes(value)}
                  onChange={() => handleValueToggle(value)}
                  className="rounded"
                />
                <span className="text-sm">{value}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Actions - Fixed at bottom */}
      <div className="flex gap-2 p-4 pt-3 border-t flex-shrink-0 bg-background">
        <Button
          size="sm"
          onClick={handleApply}
          disabled={selectedValues.length === 0}
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

      {/* Selected Count */}
      {selectedValues.length > 0 && (
        <div className="px-4 pb-3 text-center flex-shrink-0">
          <Badge variant="default" className="text-xs">
            {selectedValues.length} נבחרים
          </Badge>
        </div>
      )}
    </div>
  )
}
