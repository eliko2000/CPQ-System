import {
  forwardRef,
  useImperativeHandle,
  useState,
  useRef,
  useEffect,
} from 'react';
import { ICellEditorParams } from 'ag-grid-community';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

export interface StatusOption {
  value: string;
  label: string;
}

interface StatusCellEditorProps extends ICellEditorParams {
  options: StatusOption[];
  onStatusChange?: (id: string, newStatus: string) => Promise<void>;
}

export const StatusCellEditor = forwardRef(
  (props: StatusCellEditorProps, ref) => {
    const [value, setValue] = useState(props.value);
    const selectRef = useRef<HTMLSelectElement>(null);

    useEffect(() => {
      // Focus and open the select on mount
      if (selectRef.current) {
        selectRef.current.focus();
        // Try to programmatically open the dropdown
        selectRef.current.click();
      }
    }, []);

    useImperativeHandle(ref, () => ({
      getValue() {
        return value;
      },
      isCancelAfterEnd() {
        // Always cancel - we handle the update ourselves in handleChange via onStatusChange
        // This prevents AG Grid's onCellValueChanged from firing and reverting the change
        return true;
      },
    }));

    const handleChange = async (
      event: React.ChangeEvent<HTMLSelectElement>
    ) => {
      const newValue = event.target.value;
      const oldValue = props.value;

      if (newValue === oldValue) {
        props.api?.stopEditing(true);
        return;
      }

      logger.debug('StatusCellEditor - Value changed:', {
        old: oldValue,
        new: newValue,
      });
      setValue(newValue);

      // If we have a custom status change handler, use it
      if (props.onStatusChange && props.data?.id) {
        try {
          await props.onStatusChange(props.data.id, newValue);

          // Update the cell data directly
          if (props.node && props.colDef.field) {
            props.data[props.colDef.field] = newValue;
            props.api.refreshCells({ rowNodes: [props.node], force: true });
          }

          toast.success('הסטטוס עודכן בהצלחה');
        } catch (error) {
          logger.error('StatusCellEditor - Failed to update status:', error);
          toast.error('שגיאה בעדכון סטטוס');

          // Revert
          setValue(oldValue);
          if (props.node && props.colDef.field && props.data) {
            props.data[props.colDef.field] = oldValue;
            props.api.refreshCells({ rowNodes: [props.node], force: true });
          }
        }
      }

      // Stop editing
      setTimeout(() => {
        props.api?.stopEditing(true);
      }, 50);
    };

    return (
      <select
        ref={selectRef}
        value={value}
        onChange={handleChange}
        className="w-full h-full px-2 py-1 border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        dir="rtl"
      >
        {props.options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }
);

StatusCellEditor.displayName = 'StatusCellEditor';

// Project status options
export const PROJECT_STATUS_OPTIONS: StatusOption[] = [
  { value: 'active', label: 'פעיל' },
  { value: 'on-hold', label: 'בהמתנה' },
  { value: 'completed', label: 'הושלם' },
  { value: 'cancelled', label: 'בוטל' },
];

// Quotation status options
export const QUOTATION_STATUS_OPTIONS: StatusOption[] = [
  { value: 'draft', label: 'טיוטה' },
  { value: 'sent', label: 'נשלחה' },
  { value: 'accepted', label: 'התקבלה' },
  { value: 'rejected', label: 'נדחתה' },
  { value: 'expired', label: 'פג תוקף' },
];
