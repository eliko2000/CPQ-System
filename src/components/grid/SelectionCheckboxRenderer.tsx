/**
 * SelectionCheckboxRenderer
 *
 * AG Grid cell renderer for row selection checkboxes
 * Supports click-to-select with row highlighting
 */

import { ICellRendererParams } from 'ag-grid-community';
import { Checkbox } from '../ui/checkbox';

interface SelectionCheckboxRendererProps extends ICellRendererParams {
  onSelectionToggle?: (id: string, data: any, event: React.MouseEvent) => void;
  isSelected?: (id: string) => boolean;
}

export const SelectionCheckboxRenderer = (
  props: SelectionCheckboxRendererProps
) => {
  const { data, onSelectionToggle, isSelected } = props;

  if (!data) return null;

  const handleChange = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (onSelectionToggle && data.id) {
      onSelectionToggle(data.id, data, event);
    }
  };

  const checked = isSelected ? isSelected(data.id) : false;

  return (
    <div
      className="flex items-center justify-center h-full"
      onClick={handleChange}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={() => {}} // Handled by onClick above
        className="cursor-pointer"
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
