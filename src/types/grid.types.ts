/**
 * Grid Selection and Action Types
 *
 * Defines types for ClickUp-style selection toolbar system
 */

// Available action types
export type GridActionType =
  | 'view'
  | 'edit'
  | 'delete'
  | 'duplicate'
  | 'newVersion'
  | 'export';

// Action configuration
export interface GridAction {
  type: GridActionType;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'destructive' | 'outline' | 'ghost';
  singleOnly?: boolean; // If true, only available when 1 row selected
  confirmRequired?: boolean; // Show confirmation dialog
  handler: (selectedIds: string[], selectedData: any[]) => Promise<void> | void;
}

// Selection state
export interface GridSelectionState<T = any> {
  selectedIds: string[];
  selectedData: T[];
  isAllSelected: boolean;
}

// Toolbar configuration
export interface FloatingToolbarConfig {
  actions: GridAction[];
  position?: 'bottom-center' | 'top-center' | 'bottom-right';
  showCount?: boolean;
  allowClear?: boolean;
}

// Bulk operation result
export interface BulkOperationResult {
  successCount: number;
  failureCount: number;
  failures: Array<{
    id: string;
    reason: string;
    itemName?: string;
  }>;
}

// Grid selection hook return type
export interface UseGridSelectionReturn<T = any> {
  selectedIds: string[];
  selectedData: T[];
  selectionCount: number;
  isSelected: (id: string) => boolean;
  toggleSelection: (id: string, data: T, event?: React.MouseEvent) => void;
  clearSelection: () => void;
  selectAll: (allData: T[]) => void;
  handleAction: (action: GridAction) => Promise<void>;
}
