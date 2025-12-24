/**
 * useGridSelection Hook
 *
 * Manages grid row selection with Ctrl/Shift multi-select support
 * Reusable across all AG Grid instances
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { GridApi } from 'ag-grid-community';
import { UseGridSelectionReturn, GridAction } from '../types/grid.types';

interface UseGridSelectionOptions<T> {
  gridApi?: GridApi | null;
  getRowId?: (data: T) => string;
  onSelectionChange?: (selectedIds: string[], selectedData: T[]) => void;
}

export function useGridSelection<T = any>(
  options: UseGridSelectionOptions<T> = {}
): UseGridSelectionReturn<T> {
  const {
    gridApi,
    getRowId = (data: any) => data.id,
    onSelectionChange,
  } = options;

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedData, setSelectedData] = useState<T[]>([]);
  const lastSelectedIndexRef = useRef<number>(-1);

  // Clear selection when component unmounts (as per requirement)
  useEffect(() => {
    return () => {
      setSelectedIds([]);
      setSelectedData([]);
    };
  }, []);

  // Notify parent of selection changes
  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(selectedIds, selectedData);
    }
  }, [selectedIds, selectedData, onSelectionChange]);

  /**
   * Check if a row is selected
   */
  const isSelected = useCallback(
    (id: string): boolean => {
      return selectedIds.includes(id);
    },
    [selectedIds]
  );

  /**
   * Toggle selection for a single row with Ctrl/Shift support
   */
  const toggleSelection = useCallback(
    (id: string, data: T, event?: React.MouseEvent) => {
      const rowNode = gridApi?.getRowNode(id);
      const rowIndex = rowNode?.rowIndex ?? -1;

      // Get all displayed rows for range selection
      const getAllDisplayedData = (): T[] => {
        const allData: T[] = [];
        gridApi?.forEachNodeAfterFilterAndSort(node => {
          if (node.data) allData.push(node.data);
        });
        return allData;
      };

      setSelectedIds(prev => {
        let newSelectedIds: string[];
        let newSelectedData: T[];

        // CTRL+Click: Add/Remove from selection
        if (event?.ctrlKey || event?.metaKey) {
          if (prev.includes(id)) {
            // Remove from selection
            newSelectedIds = prev.filter(selectedId => selectedId !== id);
            newSelectedData = selectedData.filter(
              item => getRowId(item) !== id
            );
          } else {
            // Add to selection
            newSelectedIds = [...prev, id];
            newSelectedData = [...selectedData, data];
          }
          lastSelectedIndexRef.current = rowIndex;
        }
        // SHIFT+Click: Range selection
        else if (event?.shiftKey && lastSelectedIndexRef.current !== -1) {
          const allData = getAllDisplayedData();
          const startIndex = Math.min(lastSelectedIndexRef.current, rowIndex);
          const endIndex = Math.max(lastSelectedIndexRef.current, rowIndex);

          const rangeData = allData.slice(startIndex, endIndex + 1);
          const rangeIds = rangeData.map(getRowId);

          // Combine with existing selection
          const combinedIds = Array.from(new Set([...prev, ...rangeIds]));
          newSelectedIds = combinedIds;

          // Rebuild selected data
          const selectedDataMap = new Map(
            selectedData.map(item => [getRowId(item), item])
          );
          rangeData.forEach(item => {
            selectedDataMap.set(getRowId(item), item);
          });
          newSelectedData = Array.from(selectedDataMap.values());
        }
        // Regular Click: Add to selection (ClickUp behavior)
        else {
          if (prev.includes(id)) {
            // Clicking already-selected row: deselect it
            newSelectedIds = prev.filter(selectedId => selectedId !== id);
            newSelectedData = selectedData.filter(
              item => getRowId(item) !== id
            );
          } else {
            // Clicking new row: add to selection
            newSelectedIds = [...prev, id];
            newSelectedData = [...selectedData, data];
          }
          lastSelectedIndexRef.current = rowIndex;
        }

        // Update selected data state
        setSelectedData(newSelectedData);

        // Sync with AG Grid API
        if (gridApi) {
          gridApi.deselectAll();
          newSelectedIds.forEach(selectedId => {
            const node = gridApi.getRowNode(selectedId);
            if (node) {
              node.setSelected(true, false, 'api');
            }
          });
        }

        return newSelectedIds;
      });
    },
    [gridApi, selectedData, getRowId]
  );

  /**
   * Clear all selections
   */
  const clearSelection = useCallback(() => {
    setSelectedIds([]);
    setSelectedData([]);
    lastSelectedIndexRef.current = -1;

    if (gridApi) {
      gridApi.deselectAll();
    }
  }, [gridApi]);

  /**
   * Select all rows (currently displayed after filter/sort)
   */
  const selectAll = useCallback(
    (allData: T[]) => {
      const allIds = allData.map(getRowId);
      setSelectedIds(allIds);
      setSelectedData(allData);

      if (gridApi) {
        gridApi.selectAll();
      }
    },
    [gridApi, getRowId]
  );

  /**
   * Handle action execution
   */
  const handleAction = useCallback(
    async (action: GridAction) => {
      if (selectedIds.length === 0) return;

      // Check if action is single-only and multiple rows selected
      if (action.singleOnly && selectedIds.length > 1) {
        return;
      }

      // Execute the action handler
      await action.handler(selectedIds, selectedData);

      // Clear selection after action completes (except for view/edit)
      if (action.type !== 'view' && action.type !== 'edit') {
        clearSelection();
      }
    },
    [selectedIds, selectedData, clearSelection]
  );

  return {
    selectedIds,
    selectedData,
    selectionCount: selectedIds.length,
    isSelected,
    toggleSelection,
    clearSelection,
    selectAll,
    handleAction,
  };
}
