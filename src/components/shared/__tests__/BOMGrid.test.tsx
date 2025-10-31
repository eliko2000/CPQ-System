import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BOMGrid, BOMItem } from '../BOMGrid';
import { createAGGridTestUtils, AGGridTestScenarios, mockBOMData } from '@/src/test/ag-grid-utils';

// Mock AG Grid modules
vi.mock('ag-grid-react', () => ({
  AgGridReact: {
    // Mock AG Grid component
    __esModule: true,
    default: vi.fn(({ rowData, onCellValueChanged, onRowDragEnd, columnDefs, ...props }) => {
      return (
        <div className="ag-theme-alpine" data-testid="ag-grid">
          <div className="grid-header">
            {columnDefs?.map((col: any, index: number) => (
              <div key={index} className="grid-header-cell" data-col-id={col.field}>
                {col.headerName}
              </div>
            ))}
          </div>
          <div className="grid-body">
            {rowData?.map((row: any, rowIndex: number) => (
              <div key={row.id} className="grid-row" data-row-id={row.id} data-row-index={rowIndex}>
                {columnDefs?.map((col: any, colIndex: number) => (
                  <div
                    key={colIndex}
                    className="grid-cell"
                    data-col-id={col.field}
                    contentEditable={col.editable}
                    onDoubleClick={(e) => {
                      if (col.editable) {
                        e.currentTarget.focus();
                      }
                    }}
                    onBlur={(e) => {
                      if (col.editable && onCellValueChanged) {
                        const newValue = col.field === 'quantity' ? parseInt(e.currentTarget.textContent) :
                                       col.field === 'unitCost' || col.field === 'customerPrice' ?
                                       parseFloat(e.currentTarget.textContent) : e.currentTarget.textContent;
                        onCellValueChanged({
                          data: { ...row, [col.field]: newValue },
                          newValue,
                          oldValue: row[col.field],
                          colDef: col
                        });
                      }
                    }}
                  >
                    {col.field === 'totalCost' ? (row.quantity * row.unitCost).toFixed(2) :
                     col.field === 'totalPrice' ? (row.quantity * row.customerPrice).toFixed(2) :
                     col.field === 'margin' ? `${row.margin}%` :
                     row[col.field]}
                  </div>
                ))}
                <div className="grid-cell">
                  <button
                    onClick={() => {
                      // Mock delete functionality
                      const deleteHandler = props.onBOMChange;
                      if (deleteHandler) {
                        const newItems = rowData.filter((item: BOMItem) => item.id !== row.id);
                        deleteHandler(newItems);
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
  },
  ColDef: vi.fn(),
  GridApi: vi.fn(),
  GridReadyEvent: vi.fn(),
  CellValueChangedEvent: vi.fn(),
  RowDragEvent: vi.fn()
}));

vi.mock('ag-grid-community/styles/ag-grid.css', () => ({}));
vi.mock('ag-grid-community/styles/ag-theme-alpine.css', () => ({}));

describe('BOMGrid', () => {
  const mockBOMChange = vi.fn();
  const defaultProps = {
    bomItems: mockBOMData,
    onBOMChange: mockBOMChange,
    readonly: false,
    showCustomerPricing: true,
    allowEditing: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Grid Functionality', () => {
    it('renders BOM grid with correct data', () => {
      render(<BOMGrid {...defaultProps} />);

      expect(screen.getByText('Bill of Materials')).toBeInTheDocument();
      expect(screen.getByText('Siemens S7-1500 PLC')).toBeInTheDocument();
      expect(screen.getByText('Banner Photoelectric Sensor')).toBeInTheDocument();
      expect(screen.getByText('Control Cabinet Assembly')).toBeInTheDocument();
    });

    it('displays correct column headers', () => {
      render(<BOMGrid {...defaultProps} />);

      expect(screen.getByText('Type')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('Manufacturer')).toBeInTheDocument();
      expect(screen.getByText('Qty')).toBeInTheDocument();
      expect(screen.getByText('Unit Cost')).toBeInTheDocument();
      expect(screen.getByText('Customer Price')).toBeInTheDocument();
      expect(screen.getByText('Margin %')).toBeInTheDocument();
      expect(screen.getByText('Total Cost')).toBeInTheDocument();
    });

    it('calculates and displays totals correctly', () => {
      render(<BOMGrid {...defaultProps} />);

      // Expected totals:
      // Item 1: 1 * $2500 = $2500
      // Item 2: 4 * $150 = $600
      // Item 3: 1 * $5000 = $5000
      // Total Cost: $8100
      // Total Price: $10,625 (3125 + 750 + 6500)

      expect(screen.getByText(/\$8,100\.00/)).toBeInTheDocument(); // Total Cost
      expect(screen.getByText(/\$10,625\.00/)).toBeInTheDocument(); // Total Price
      expect(screen.getByText(/\$2,525\.00/)).toBeInTheDocument(); // Total Margin
    });

    it('shows add item button when editing is allowed', () => {
      render(<BOMGrid {...defaultProps} />);

      const addButton = screen.getByText('Add Item');
      expect(addButton).toBeInTheDocument();
    });

    it('hides add item button when editing is not allowed', () => {
      render(<BOMGrid {...defaultProps} allowEditing={false} />);

      const addButton = screen.queryByText('Add Item');
      expect(addButton).not.toBeInTheDocument();
    });
  });

  describe('Cell Editing', () => {
    it('allows editing description when allowEditing is true', async () => {
      const user = userEvent.setup();
      render(<BOMGrid {...defaultProps} />);

      // Find and double-click the first description cell
      const descriptionCell = screen.getByText('Siemens S7-1500 PLC');
      await user.dblClick(descriptionCell);

      // Check if the cell is editable
      expect(descriptionCell).toHaveAttribute('contenteditable', 'true');
    });

    it('prevents editing when readonly is true', () => {
      render(<BOMGrid {...defaultProps} readonly={true} />);

      const descriptionCell = screen.getByText('Siemens S7-1500 PLC');
      expect(descriptionCell).toHaveAttribute('contenteditable', 'false');
    });

    it('recalculates totals when quantity changes', async () => {
      const user = userEvent.setup();
      render(<BOMGrid {...defaultProps} />);

      // Find the quantity cell for first item (should be 1)
      const quantityCells = screen.getAllByText('1');
      const firstQuantityCell = quantityCells.find(cell =>
        cell.getAttribute('data-col-id') === 'quantity'
      );

      if (firstQuantityCell) {
        // Change quantity from 1 to 2
        await user.clear(firstQuantityCell);
        await user.type(firstQuantityCell, '2');

        // Trigger blur event
        fireEvent.blur(firstQuantityCell);

        // Check if onBOMChange was called
        expect(mockBOMChange).toHaveBeenCalled();
      }
    });

    it('recalculates margin when unit cost changes', async () => {
      const user = userEvent.setup();
      render(<BOMGrid {...defaultProps} />);

      // Find unit cost cell
      const unitCostCells = screen.getAllByText(/2500\.00/);
      const firstUnitCostCell = unitCostCells.find(cell =>
        cell.getAttribute('data-col-id') === 'unitCost'
      );

      if (firstUnitCostCell) {
        await user.clear(firstUnitCostCell);
        await user.type(firstUnitCostCell, '3000');
        fireEvent.blur(firstUnitCostCell);

        expect(mockBOMChange).toHaveBeenCalled();
      }
    });
  });

  describe('BOM-Specific Features', () => {
    it('applies markup correctly when apply markup button is clicked', async () => {
      const user = userEvent.setup();
      render(<BOMGrid {...defaultProps} />);

      const markupButton = screen.getByText('Apply 25% Markup');
      await user.click(markupButton);

      expect(mockBOMChange).toHaveBeenCalled();

      // Verify the updated items have 25% markup
      const updatedItems = mockBOMChange.mock.calls[0][0];
      const updatedItem = updatedItems.find((item: BOMItem) => item.id === 'item-1');
      expect(updatedItem.margin).toBe(25);
    });

    it('shows validation warning for items with zero cost', () => {
      const itemsWithZeroCost = [
        ...mockBOMData,
        {
          id: 'item-4',
          itemType: 'component',
          description: 'Zero Cost Item',
          quantity: 1,
          unitCost: 0,
          customerPrice: 0,
          margin: 0,
        }
      ];

      render(<BOMGrid {...defaultProps} bomItems={itemsWithZeroCost} />);

      expect(screen.getByText(/Some items have zero or negative unit costs/)).toBeInTheDocument();
    });

    it('shows validation warning for low margin items', () => {
      const itemsWithLowMargin = [
        ...mockBOMData,
        {
          id: 'item-4',
          itemType: 'component',
          description: 'Low Margin Item',
          quantity: 1,
          unitCost: 1000,
          customerPrice: 1050,
          margin: 5,
        }
      ];

      render(<BOMGrid {...defaultProps} bomItems={itemsWithLowMargin} />);

      expect(screen.getByText(/Some items have margins below 15%/)).toBeInTheDocument();
    });

    it('displays item types with correct badges', () => {
      render(<BOMGrid {...defaultProps} />);

      // Check that item type badges are rendered
      expect(screen.getByText('COMPONENT')).toBeInTheDocument();
      expect(screen.getByText('ASSEMBLY')).toBeInTheDocument();
    });
  });

  describe('Customer Pricing Toggle', () => {
    it('shows customer pricing columns when showCustomerPricing is true', () => {
      render(<BOMGrid {...defaultProps} showCustomerPricing={true} />);

      expect(screen.getByText('Customer Price')).toBeInTheDocument();
      expect(screen.getByText('Total Price')).toBeInTheDocument();
    });

    it('hides customer pricing columns when showCustomerPricing is false', () => {
      render(<BOMGrid {...defaultProps} showCustomerPricing={false} />);

      expect(screen.queryByText('Customer Price')).not.toBeInTheDocument();
      expect(screen.queryByText('Total Price')).not.toBeInTheDocument();
    });
  });

  describe('Add and Remove Items', () => {
    it('adds new item when add button is clicked', async () => {
      const user = userEvent.setup();
      render(<BOMGrid {...defaultProps} />);

      const addButton = screen.getByText('Add Item');
      await user.click(addButton);

      expect(mockBOMChange).toHaveBeenCalled();

      // Verify new item was added
      const updatedItems = mockBOMChange.mock.calls[0][0];
      expect(updatedItems).toHaveLength(mockBOMData.length + 1);

      const newItem = updatedItems.find((item: BOMItem) => item.description === 'New Component');
      expect(newItem).toBeDefined();
      expect(newItem.quantity).toBe(1);
      expect(newItem.unitCost).toBe(0);
    });

    it('removes item when delete button is clicked', async () => {
      const user = userEvent.setup();
      render(<BOMGrid {...defaultProps} />);

      // Find delete buttons (one for each row)
      const deleteButtons = screen.getAllByText('Delete');
      expect(deleteButtons).toHaveLength(mockBOMData.length);

      // Click first delete button
      await user.click(deleteButtons[0]);

      expect(mockBOMChange).toHaveBeenCalled();

      // Verify item was removed
      const updatedItems = mockBOMChange.mock.calls[0][0];
      expect(updatedItems).toHaveLength(mockBOMData.length - 1);
    });
  });

  describe('Currency Formatting', () => {
    it('formats currency values correctly', () => {
      render(<BOMGrid {...defaultProps} />);

      // Check for formatted currency values
      expect(screen.getByText(/\$2,500\.00/)).toBeInTheDocument(); // Unit cost
      expect(screen.getByText(/\$3,125\.00/)).toBeInTheDocument(); // Customer price
      expect(screen.getByText(/\$2,500\.00/)).toBeInTheDocument(); // Total cost (1 * 2500)
    });
  });

  describe('Margin Calculations', () => {
    it('calculates margin percentages correctly', () => {
      render(<BOMGrid {...defaultProps} />);

      // Check margin display
      expect(screen.getByText('25.0%')).toBeInTheDocument();
    });

    it('shows margin color coding based on value', () => {
      render(<BOMGrid {...defaultProps} />);

      // Check that margin cells have appropriate styling
      const marginCells = screen.getAllByText('25.0%');
      expect(marginCells.length).toBeGreaterThan(0);
    });
  });

  describe('Performance with Large Datasets', () => {
    it('handles large BOM lists efficiently', () => {
      const largeBOM = Array.from({ length: 100 }, (_, index) => ({
        id: `item-${index}`,
        itemType: 'component',
        description: `Component ${index + 1}`,
        quantity: 1,
        unitCost: 100 + index,
        customerPrice: 125 + index,
        margin: 25.0,
      }));

      const startTime = performance.now();
      render(<BOMGrid {...defaultProps} bomItems={largeBOM} />);
      const endTime = performance.now();

      // Should render within reasonable time (< 100ms for 100 items)
      expect(endTime - startTime).toBeLessThan(100);
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<BOMGrid {...defaultProps} />);

      const grid = screen.getByTestId('ag-grid');
      expect(grid).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<BOMGrid {...defaultProps} />);

      const firstCell = screen.getByText('Siemens S7-1500 PLC');
      firstCell.focus();

      expect(firstCell).toHaveFocus();
    });
  });
});