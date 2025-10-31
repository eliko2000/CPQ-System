/**
 * AG Grid Testing Utilities
 *
 * Helper functions for testing AG Grid components in Vitest/React Testing Library
 */

import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

export interface AGGridTestUtils {
  getCell: (rowIndex: number, colId: string) => HTMLElement | null;
  getCellContent: (rowIndex: number, colId: string) => string;
  editCell: (rowIndex: number, colId: string, value: string) => Promise<void>;
  clickCell: (rowIndex: number, colId: string) => Promise<void>;
  getRowCount: () => number;
  selectRow: (rowIndex: number) => void;
  dragRow: (fromIndex: number, toIndex: number) => Promise<void>;
  clickHeader: (colId: string) => Promise<void>;
  isFilterPresent: (colId: string) => boolean;
  getCellValue: (rowIndex: number, colId: string) => any;
}

/**
 * Create AG Grid testing utilities for a given grid instance
 */
export function createAGGridTestUtils(container: HTMLElement): AGGridTestUtils {
  const getGridApi = () => {
    // Find the AG Grid container
    const gridElement = container.querySelector('.ag-theme-alpine');
    if (!gridElement) {
      throw new Error('AG Grid container not found');
    }
    return gridElement;
  };

  const getCell = (rowIndex: number, colId: string): HTMLElement | null => {
    const gridApi = getGridApi();
    // Find cell by row index and column field/colId
    const colHeader = gridApi.querySelector(`[col-id="${colId}"]`);
    if (!colHeader) return null;

    const colIndex = Array.from(colHeader.parentElement?.children || [])
      .indexOf(colHeader);

    const rows = gridApi.querySelectorAll('.ag-row');
    const targetRow = rows[rowIndex];
    if (!targetRow) return null;

    const cells = targetRow.querySelectorAll('.ag-cell');
    return cells[colIndex] as HTMLElement || null;
  };

  const getCellContent = (rowIndex: number, colId: string): string => {
    const cell = getCell(rowIndex, colId);
    return cell?.textContent?.trim() || '';
  };

  const editCell = async (rowIndex: number, colId: string, value: string): Promise<void> => {
    const cell = getCell(rowIndex, colId);
    if (!cell) throw new Error(`Cell not found: row ${rowIndex}, col ${colId}`);

    // Double click to start editing
    fireEvent.doubleClick(cell);

    // Wait for editor to appear
    await waitFor(() => {
      const editor = container.querySelector('.ag-cell-editor');
      return editor !== null;
    });

    // Find and type in the editor input
    const editorInput = container.querySelector('.ag-cell-editor input') as HTMLElement;
    if (!editorInput) throw new Error('Editor input not found');

    await userEvent.clear(editorInput);
    await userEvent.type(editorInput, value);

    // Press Enter to save
    fireEvent.keyDown(editorInput, { key: 'Enter', code: 'Enter' });
  };

  const clickCell = async (rowIndex: number, colId: string): Promise<void> => {
    const cell = getCell(rowIndex, colId);
    if (!cell) throw new Error(`Cell not found: row ${rowIndex}, col ${colId}`);

    await userEvent.click(cell);
  };

  const getRowCount = (): number => {
    const gridApi = getGridApi();
    const rows = gridApi.querySelectorAll('.ag-row');
    return rows.length;
  };

  const selectRow = (rowIndex: number): void => {
    const gridApi = getGridApi();
    const rows = gridApi.querySelectorAll('.ag-row');
    const targetRow = rows[rowIndex];
    if (!targetRow) throw new Error(`Row not found: ${rowIndex}`);

    const checkbox = targetRow.querySelector('.ag-selection-checkbox') as HTMLElement;
    if (checkbox) {
      fireEvent.click(checkbox);
    }
  };

  const dragRow = async (fromIndex: number, toIndex: number): Promise<void> => {
    const gridApi = getGridApi();
    const rows = gridApi.querySelectorAll('.ag-row');
    const fromRow = rows[fromIndex] as HTMLElement;
    const toRow = rows[toIndex] as HTMLElement;

    if (!fromRow || !toRow) {
      throw new Error(`Row not found for drag operation: ${fromIndex} -> ${toIndex}`);
    }

    const dragHandle = fromRow.querySelector('.drag-handle') as HTMLElement;
    if (!dragHandle) throw new Error('Drag handle not found');

    // Simulate drag and drop
    fireEvent.dragStart(dragHandle);
    fireEvent.dragEnter(toRow);
    fireEvent.dragOver(toRow);
    fireEvent.drop(toRow);
    fireEvent.dragEnd(dragHandle);
  };

  const clickHeader = async (colId: string): Promise<void> => {
    const gridApi = getGridApi();
    const header = gridApi.querySelector(`[col-id="${colId}"]`) as HTMLElement;
    if (!header) throw new Error(`Header not found: ${colId}`);

    await userEvent.click(header);
  };

  const isFilterPresent = (colId: string): boolean => {
    const gridApi = getGridApi();
    const filterElement = gridApi.querySelector(`[col-id="${colId}"] .ag-header-cell-filter-button`);
    return filterElement !== null;
  };

  const getCellValue = (rowIndex: number, colId: string): any => {
    const cell = getCell(rowIndex, colId);
    if (!cell) return null;

    // Try to extract the raw value from cell data attributes
    const cellValue = cell.getAttribute('aria-colindex');
    return cellValue;
  };

  return {
    getCell,
    getCellContent,
    editCell,
    clickCell,
    getRowCount,
    selectRow,
    dragRow,
    clickHeader,
    isFilterPresent,
    getCellValue
  };
}

/**
 * Common AG Grid test scenarios
 */
export class AGGridTestScenarios {
  /**
   * Test basic grid functionality
   */
  static async testBasicGridOperations(utils: AGGridTestUtils) {
    // Test row count
    expect(utils.getRowCount()).toBeGreaterThan(0);

    // Test cell content retrieval
    const firstRowDescription = utils.getCellContent(0, 'description');
    expect(firstRowDescription).toBeDefined();

    // Test cell clicking
    await utils.clickCell(0, 'description');

    // Test header clicking for sorting
    await utils.clickHeader('description');
  }

  /**
   * Test cell editing functionality
   */
  static async testCellEditing(utils: AGGridTestUtils, rowIndex: number, colId: string, testValue: string) {
    const originalValue = utils.getCellContent(rowIndex, colId);

    await utils.editCell(rowIndex, colId, testValue);

    // Wait for the edit to be applied
    await waitFor(() => {
      const newValue = utils.getCellContent(rowIndex, colId);
      return newValue !== originalValue;
    });

    const newValue = utils.getCellContent(rowIndex, colId);
    expect(newValue).toBe(testValue);
  }

  /**
   * Test row drag and drop
   */
  static async testRowDragDrop(utils: AGGridTestUtils, fromIndex: number, toIndex: number) {
    const originalFromValue = utils.getCellContent(fromIndex, 'description');
    const originalToValue = utils.getCellContent(toIndex, 'description');

    await utils.dragRow(fromIndex, toIndex);

    // After drag, the values should be swapped
    const newFromValue = utils.getCellContent(fromIndex, 'description');
    const newToValue = utils.getCellContent(toIndex, 'description');

    expect(newFromValue).toBe(originalToValue);
    expect(newToValue).toBe(originalFromValue);
  }

  /**
   * Test BOM-specific calculations
   */
  static testBOMCalculations(utils: AGGridTestUtils) {
    // Test that cost calculations are present
    const totalCost = utils.getCellContent(utils.getRowCount() - 1, 'totalCost');
    expect(totalCost).toMatch(/\$\d+\.\d{2}/);

    // Test margin calculations
    const margin = utils.getCellContent(0, 'margin');
    expect(margin).toMatch(/\d+\.?\d*%/);
  }

  /**
   * Test validation messages
   */
  static testValidationMessages(container: HTMLElement, expectedMessage: string) {
    const validationMessage = screen.queryByText(expectedMessage);
    expect(validationMessage).toBeInTheDocument();
  }
}

/**
 * Mock data for AG Grid testing
 */
export const mockBOMData = [
  {
    id: 'item-1',
    itemType: 'component',
    description: 'Siemens S7-1500 PLC',
    manufacturer: 'Siemens',
    manufacturerPn: '6ES7512-1DK01-0AB0',
    supplier: 'Automation Supplier',
    quantity: 1,
    unitCost: 2500.00,
    customerPrice: 3125.00,
    margin: 25.0,
  },
  {
    id: 'item-2',
    itemType: 'component',
    description: 'Banner Photoelectric Sensor',
    manufacturer: 'Banner',
    manufacturerPn: 'QS18VN6D',
    supplier: 'Sensor Supplier',
    quantity: 4,
    unitCost: 150.00,
    customerPrice: 187.50,
    margin: 25.0,
  },
  {
    id: 'item-3',
    itemType: 'assembly',
    description: 'Control Cabinet Assembly',
    manufacturer: 'Custom',
    supplier: 'Custom Builder',
    quantity: 1,
    unitCost: 5000.00,
    customerPrice: 6500.00,
    margin: 30.0,
  }
];

/**
 * Custom render function for AG Grid components
 */
export const renderAGGridComponent = (Component: React.ComponentType<any>, props: any) => {
  const defaultProps = {
    rowData: mockBOMData,
    domLayout: 'autoHeight' as const,
    onGridReady: () => {},
    ...props
  };

  return render(Component, { props: defaultProps });
};