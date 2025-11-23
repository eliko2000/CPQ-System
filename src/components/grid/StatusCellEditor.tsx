import React, { forwardRef, useImperativeHandle, useState, useRef, useEffect } from 'react'
import { ICellEditorParams } from 'ag-grid-community'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'

export interface StatusOption {
  value: string
  label: string
}

interface StatusCellEditorProps extends ICellEditorParams {
  options: StatusOption[]
  onStatusChange?: (id: string, newStatus: string) => Promise<void>
}

export const StatusCellEditor = forwardRef((props: StatusCellEditorProps, ref) => {
  const [value, setValue] = useState(props.value)
  const selectRef = useRef<HTMLSelectElement>(null)

  useEffect(() => {
    // Focus the select element when editor opens
    if (selectRef.current) {
      selectRef.current.focus()
    }
  }, [])

  useImperativeHandle(ref, () => ({
    getValue() {
      logger.debug('getValue() called, returning:', value)
      return value
    },
    isCancelAfterEnd() {
      const shouldCancel = value === props.value
      logger.debug('isCancelAfterEnd() called:', { value, propsValue: props.value, shouldCancel })
      return shouldCancel
    }
  }))

  const handleChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = event.target.value
    const oldValue = props.value
    logger.debug('StatusCellEditor - Value changed:', { old: oldValue, new: newValue })

    // Update local state
    setValue(newValue)

    // If we have a custom status change handler, use it (same as modal approach)
    if (props.onStatusChange && props.data?.id) {
      try {
        logger.debug('StatusCellEditor - Calling onStatusChange handler')
        await props.onStatusChange(props.data.id, newValue)

        // Update the cell data
        if (props.node && props.colDef.field) {
          props.data[props.colDef.field] = newValue
          props.api.refreshCells({ rowNodes: [props.node], force: true })
        }

        toast.success('הסטטוס עודכן בהצלחה')
        logger.debug('StatusCellEditor - Status updated successfully')
      } catch (error) {
        logger.error('StatusCellEditor - Failed to update status:', error)
        toast.error('שגיאה בעדכון סטטוס')

        // Revert to old value on error
        setValue(oldValue)
        if (props.node && props.colDef.field && props.data) {
          props.data[props.colDef.field] = oldValue
          props.api.refreshCells({ rowNodes: [props.node], force: true })
        }
      }
    }

    // Stop editing
    setTimeout(() => {
      if (props.api) {
        props.api.stopEditing(true) // Cancel edit to prevent valueSetter from firing
      }
    }, 50)
  }

  return (
    <select
      ref={selectRef}
      value={value}
      onChange={handleChange}
      className="w-full h-full px-2 py-1 border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
      dir="rtl"
    >
      {props.options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
})

StatusCellEditor.displayName = 'StatusCellEditor'

// Project status options
export const PROJECT_STATUS_OPTIONS: StatusOption[] = [
  { value: 'active', label: 'פעיל' },
  { value: 'on-hold', label: 'בהמתנה' },
  { value: 'completed', label: 'הושלם' },
  { value: 'cancelled', label: 'בוטל' }
]

// Quotation status options
export const QUOTATION_STATUS_OPTIONS: StatusOption[] = [
  { value: 'draft', label: 'טיוטה' },
  { value: 'sent', label: 'נשלחה' },
  { value: 'accepted', label: 'התקבלה' },
  { value: 'rejected', label: 'נדחתה' },
  { value: 'expired', label: 'פג תוקף' }
]
