/**
 * SelectionCheckboxRenderer
 *
 * AG Grid cell renderer for row selection checkboxes
 * ClickUp-style: Checkbox only visible on row hover or when selected
 */

import { ICellRendererParams } from 'ag-grid-community';
import { Checkbox } from '../ui/checkbox';

interface SelectionCheckboxRendererProps extends ICellRendererParams {
  onSelectionToggle?: (
    id: string,
    data: any,
    event: React.MouseEvent | React.PointerEvent
  ) => void;
  isSelected?: (id: string) => boolean;
}

export const SelectionCheckboxRenderer = (
  props: SelectionCheckboxRendererProps
) => {
  const { data, onSelectionToggle, isSelected } = props;

  if (!data) return null;

  const handleClick = (event: React.PointerEvent) => {
    // CRITICAL: Stop propagation to prevent cell click from opening component
    event.stopPropagation();

    if (onSelectionToggle && data.id) {
      onSelectionToggle(data.id, data, event);
    }
  };

  const checked = isSelected ? isSelected(data.id) : false;

  return (
    <div
      className={`flex items-center justify-center h-full selection-checkbox-cell ${checked ? 'checkbox-selected' : ''}`}
      onPointerDown={handleClick}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={() => {}} // Handled by onPointerDown above
        className="cursor-pointer checkbox-hover-target focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:outline-none focus-visible:ring-0 !border !border-zinc-900"
        style={{
          opacity: checked ? 1 : 0,
          transition: 'opacity 0.15s ease',
          pointerEvents: 'none', // Let the parent div handle all pointer events
        }}
      />
    </div>
  );
};

/**
 * Header checkbox renderer for "Select All" functionality
 */
interface SelectionHeaderRendererProps {
  onSelectAll?: () => void;
  onClearAll?: () => void;
  isAllSelected?: boolean;
  isSomeSelected?: boolean;
}

export const SelectionHeaderRenderer = (
  props: SelectionHeaderRendererProps
) => {
  const { onSelectAll, onClearAll, isAllSelected, isSomeSelected } = props;

  const handleChange = () => {
    if (isAllSelected) {
      onClearAll?.();
    } else {
      onSelectAll?.();
    }
  };

  return (
    <div className="flex items-center justify-center h-full">
      <Checkbox
        checked={isAllSelected}
        // @ts-expect-error - indeterminate is valid
        indeterminate={isSomeSelected && !isAllSelected}
        onCheckedChange={handleChange}
        className="cursor-pointer"
      />
    </div>
  );
};
