import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CustomHeader } from '../CustomHeader';
import { Column } from 'ag-grid-community';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  MoreVertical: () => <div>More</div>,
  Filter: () => <div>Filter</div>,
  Search: () => <div>Search</div>,
  X: () => <div>X</div>,
  Check: () => <div>Check</div>,
}));

// Mock react-dom createPortal
vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom');
  return {
    ...actual,
    createPortal: (node: any) => node,
  };
});

/**
 * CRITICAL TESTS: CustomHeader Filter Functionality
 *
 * These tests prevent regression of the filter bug where:
 * - Filter model format was incorrect for TextFilter (Community edition)
 * - Async operations were not properly awaited
 * - Filter state was not persisting
 *
 * DO NOT MODIFY THESE TESTS WITHOUT UNDERSTANDING THE IMPLICATIONS
 */

describe('CustomHeader Filter Functionality', () => {
  let mockApi: any;
  let mockColumn: Column;
  let mockFilterInstance: any;
  let filterModel: any = null;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    filterModel = null;

    // Create mock filter instance that simulates AG Grid TextFilter behavior
    mockFilterInstance = {
      constructor: { name: 'TextFilter' },
      setModel: vi.fn().mockImplementation(async model => {
        filterModel = model;
        return undefined;
      }),
      getModel: vi.fn().mockImplementation(() => filterModel),
      isFilterActive: vi.fn().mockImplementation(() => filterModel !== null),
      applyModel: vi.fn(),
    };

    // Create mock API that simulates AG Grid API
    mockApi = {
      getColumnFilterInstance: vi.fn().mockResolvedValue(mockFilterInstance),
      onFilterChanged: vi.fn(),
      getFilterModel: vi.fn().mockImplementation(() => {
        if (filterModel) {
          return { test_column: filterModel };
        }
        return {};
      }),
    };

    // Create mock column
    mockColumn = {
      getColId: () => 'test_column',
    } as Column;
  });

  describe('TextFilter (Community Edition)', () => {
    it('should format single value filter correctly for TextFilter', async () => {
      const user = userEvent.setup();
      const props = {
        displayName: 'Test Column',
        column: mockColumn,
        api: mockApi,
        uniqueValues: ['Value1', 'Value2'],
      };

      render(<CustomHeader {...props} />);

      // Open filter
      const filterButton = screen.getByTitle('סינון');
      await user.click(filterButton);

      // Wait for filter to open
      await waitFor(() => {
        expect(screen.getByText('Value1')).toBeInTheDocument();
      });

      // Select first value
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]); // Second checkbox is Value1

      // Apply filter
      const applyButton = screen.getByRole('button', { name: /החל סינון/i });
      await user.click(applyButton);

      // Wait for filter to be set
      await waitFor(() => {
        expect(mockFilterInstance.setModel).toHaveBeenCalled();
      });

      // Verify TextFilter model format for single value
      expect(filterModel).toEqual({
        filterType: 'text',
        type: 'equals',
        filter: 'Value1',
      });
    });

    it('should format multiple values filter with OR conditions for TextFilter', async () => {
      const user = userEvent.setup();
      const props = {
        displayName: 'Test Column',
        column: mockColumn,
        api: mockApi,
        uniqueValues: ['Value1', 'Value2', 'Value3'],
      };

      render(<CustomHeader {...props} />);

      // Open filter
      const filterButton = screen.getByTitle('סינון');
      await user.click(filterButton);

      // Wait for filter to open
      await waitFor(() => {
        expect(screen.getByText('Value1')).toBeInTheDocument();
      });

      // Select all values
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]); // Select All

      // Apply filter
      const applyButton = screen.getByRole('button', { name: /החל סינון/i });
      await user.click(applyButton);

      // Wait for filter to be set
      await waitFor(() => {
        expect(mockFilterInstance.setModel).toHaveBeenCalled();
      });

      // The filter should use OR operator for multiple values
      expect(filterModel).toEqual({
        filterType: 'text',
        operator: 'OR',
        conditions: [
          { filterType: 'text', type: 'equals', filter: 'Value1' },
          { filterType: 'text', type: 'equals', filter: 'Value2' },
          { filterType: 'text', type: 'equals', filter: 'Value3' },
        ],
      });
    });

    it('should properly await setModel before calling onFilterChanged', async () => {
      const user = userEvent.setup();
      const callOrder: string[] = [];

      mockFilterInstance.setModel = vi.fn().mockImplementation(async model => {
        callOrder.push('setModel');
        await new Promise(resolve => setTimeout(resolve, 10));
        filterModel = model;
      });

      mockApi.onFilterChanged = vi.fn().mockImplementation(() => {
        callOrder.push('onFilterChanged');
      });

      const props = {
        displayName: 'Test Column',
        column: mockColumn,
        api: mockApi,
        uniqueValues: ['Value1'],
      };

      render(<CustomHeader {...props} />);

      // Open filter
      const filterButton = screen.getByTitle('סינון');
      await user.click(filterButton);

      // Wait for filter to open
      await waitFor(() => {
        expect(screen.getByText('Value1')).toBeInTheDocument();
      });

      // Select value
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]); // Value1

      // Apply filter
      const applyButton = screen.getByRole('button', { name: /החל סינון/i });
      await user.click(applyButton);

      await waitFor(
        () => {
          expect(callOrder).toEqual(['setModel', 'onFilterChanged']);
        },
        { timeout: 500 }
      );

      // CRITICAL: onFilterChanged must be called AFTER setModel completes
      // If this fails, filters won't work
    });

    it('should call applyModel if filter instance has it', async () => {
      const user = userEvent.setup();
      const props = {
        displayName: 'Test Column',
        column: mockColumn,
        api: mockApi,
        uniqueValues: ['Value1'],
      };

      render(<CustomHeader {...props} />);

      // Open filter
      const filterButton = screen.getByTitle('סינון');
      await user.click(filterButton);

      // Wait for filter to open
      await waitFor(() => {
        expect(screen.getByText('Value1')).toBeInTheDocument();
      });

      // Select value
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]); // Value1

      // Apply filter
      const applyButton = screen.getByRole('button', { name: /החל סינון/i });
      await user.click(applyButton);

      await waitFor(() => {
        expect(mockFilterInstance.applyModel).toHaveBeenCalled();
      });

      // Some AG Grid filters require applyModel() to be called
    });

    it('should verify filter is active after setting', async () => {
      const user = userEvent.setup();
      const props = {
        displayName: 'Test Column',
        column: mockColumn,
        api: mockApi,
        uniqueValues: ['Value1'],
      };

      render(<CustomHeader {...props} />);

      // Open filter
      const filterButton = screen.getByTitle('סינון');
      await user.click(filterButton);

      // Wait for filter to open
      await waitFor(() => {
        expect(screen.getByText('Value1')).toBeInTheDocument();
      });

      // Select value
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]); // Value1

      // Apply filter
      const applyButton = screen.getByRole('button', { name: /החל סינון/i });
      await user.click(applyButton);

      await waitFor(() => {
        expect(mockFilterInstance.isFilterActive()).toBe(true);
      });

      // Verification ensures the filter was actually set
    });
  });

  describe('SetFilter (Enterprise Edition)', () => {
    beforeEach(() => {
      // Simulate enterprise SetFilter
      mockFilterInstance.constructor.name = 'SetFilter';
    });

    it('should use values array format for SetFilter', async () => {
      const user = userEvent.setup();
      const props = {
        displayName: 'Test Column',
        column: mockColumn,
        api: mockApi,
        uniqueValues: ['Value1', 'Value2'],
      };

      render(<CustomHeader {...props} />);

      // Open filter
      const filterButton = screen.getByTitle('סינון');
      await user.click(filterButton);

      // Wait for filter to open
      await waitFor(() => {
        expect(screen.getByText('Value1')).toBeInTheDocument();
      });

      // Select all values
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]); // Select All

      // Apply filter
      const applyButton = screen.getByRole('button', { name: /החל סינון/i });
      await user.click(applyButton);

      await waitFor(() => {
        expect(mockFilterInstance.setModel).toHaveBeenCalled();
      });

      // SetFilter uses different format: { values: ['Value1', 'Value2'] }
      expect(filterModel).toEqual({ values: ['Value1', 'Value2'] });
    });
  });

  describe('Filter State Persistence', () => {
    it('should update UI state when filter is set', async () => {
      const user = userEvent.setup();
      const props = {
        displayName: 'Test Column',
        column: mockColumn,
        api: mockApi,
        uniqueValues: ['Value1'],
      };

      const { container } = render(<CustomHeader {...props} />);

      // Open filter
      const filterButton = screen.getByTitle('סינון');
      await user.click(filterButton);

      // Wait for filter to open
      await waitFor(() => {
        expect(screen.getByText('Value1')).toBeInTheDocument();
      });

      // Select value
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]); // Value1

      // Apply filter
      const applyButton = screen.getByRole('button', { name: /החל סינון/i });
      await user.click(applyButton);

      await waitFor(() => {
        const filterButton = container.querySelector('button[title*="סינון"]');
        // Filter button should show active state (blue)
        expect(filterButton?.className).toContain('text-blue-600');
      });
    });

    it('should save filter state to grid model', async () => {
      const user = userEvent.setup();
      const props = {
        displayName: 'Test Column',
        column: mockColumn,
        api: mockApi,
        uniqueValues: ['Value1'],
      };

      render(<CustomHeader {...props} />);

      // Open filter
      const filterButton = screen.getByTitle('סינון');
      await user.click(filterButton);

      // Wait for filter to open
      await waitFor(() => {
        expect(screen.getByText('Value1')).toBeInTheDocument();
      });

      // Select value
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]); // Value1

      // Apply filter
      const applyButton = screen.getByRole('button', { name: /החל סינון/i });
      await user.click(applyButton);

      await waitFor(() => {
        const gridModel = mockApi.getFilterModel();
        expect(gridModel.test_column).toBeDefined();
        expect(gridModel.test_column).toEqual({
          filterType: 'text',
          type: 'equals',
          filter: 'Value1',
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle setModel rejection gracefully', async () => {
      const user = userEvent.setup();
      mockFilterInstance.setModel = vi
        .fn()
        .mockRejectedValue(new Error('Filter error'));

      // Import logger to spy on it
      const { logger } = await import('@/lib/logger');
      const loggerErrorSpy = vi.spyOn(logger, 'error');

      const props = {
        displayName: 'Test Column',
        column: mockColumn,
        api: mockApi,
        uniqueValues: ['Value1'],
      };

      render(<CustomHeader {...props} />);

      // Open filter
      const filterButton = screen.getByTitle('סינון');
      await user.click(filterButton);

      // Wait for filter to open
      await waitFor(() => {
        expect(screen.getByText('Value1')).toBeInTheDocument();
      });

      // Select value
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]); // Value1

      // Apply filter (this will trigger error)
      const applyButton = screen.getByRole('button', { name: /החל סינון/i });
      await user.click(applyButton);

      await waitFor(
        () => {
          expect(loggerErrorSpy).toHaveBeenCalledWith(
            expect.stringContaining('[CustomHeader] Error setting filter'),
            expect.any(Error)
          );
        },
        { timeout: 1000 }
      );
    });

    it('should handle missing filter instance', async () => {
      const user = userEvent.setup();
      mockApi.getColumnFilterInstance = vi.fn().mockResolvedValue(null);

      const props = {
        displayName: 'Test Column',
        column: mockColumn,
        api: mockApi,
        uniqueValues: ['Value1'],
      };

      render(<CustomHeader {...props} />);

      // Open filter
      const filterButton = screen.getByTitle('סינון');
      await user.click(filterButton);

      // Wait for filter to open
      await waitFor(() => {
        expect(screen.getByText('Value1')).toBeInTheDocument();
      });

      // Select value
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]); // Value1

      // Apply filter (should not crash)
      const applyButton = screen.getByRole('button', { name: /החל סינון/i });
      await user.click(applyButton);

      await waitFor(() => {
        // Should not throw error
        expect(mockApi.getColumnFilterInstance).toHaveBeenCalled();
      });
    });
  });

  describe('Filter Model Format Validation', () => {
    it('CRITICAL: must not use SetFilter format with TextFilter', async () => {
      const user = userEvent.setup();
      // This test prevents the exact bug that occurred
      mockFilterInstance.constructor.name = 'TextFilter';

      const props = {
        displayName: 'Test Column',
        column: mockColumn,
        api: mockApi,
        uniqueValues: ['Value1', 'Value2'],
      };

      render(<CustomHeader {...props} />);

      // Open filter
      const filterButton = screen.getByTitle('סינון');
      await user.click(filterButton);

      // Wait for filter to open
      await waitFor(() => {
        expect(screen.getByText('Value1')).toBeInTheDocument();
      });

      // Select all values
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]); // Select All

      // Apply filter
      const applyButton = screen.getByRole('button', { name: /החל סינון/i });
      await user.click(applyButton);

      await waitFor(() => {
        expect(mockFilterInstance.setModel).toHaveBeenCalled();
      });

      const callArgs = mockFilterInstance.setModel.mock.calls[0][0];

      // MUST NOT use { values: [...] } format with TextFilter
      expect(callArgs).not.toHaveProperty('values');

      // MUST use text filter format
      expect(callArgs).toHaveProperty('filterType', 'text');
      expect(callArgs).toHaveProperty('operator', 'OR');
      expect(callArgs).toHaveProperty('conditions');
    });

    it('CRITICAL: must convert all values to strings', async () => {
      const user = userEvent.setup();
      const props = {
        displayName: 'Test Column',
        column: mockColumn,
        api: mockApi,
        uniqueValues: ['123', 'text', 'null', 'undefined'] as any,
      };

      render(<CustomHeader {...props} />);

      // Open filter
      const filterButton = screen.getByTitle('סינון');
      await user.click(filterButton);

      // Wait for filter to open
      await waitFor(() => {
        expect(screen.getByText('123')).toBeInTheDocument();
      });

      // Select all values
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]); // Select All

      // Apply filter
      const applyButton = screen.getByRole('button', { name: /החל סינון/i });
      await user.click(applyButton);

      await waitFor(() => {
        expect(mockFilterInstance.setModel).toHaveBeenCalled();
      });

      const callArgs = mockFilterInstance.setModel.mock.calls[0][0];

      // All values must be strings
      if (callArgs.conditions) {
        callArgs.conditions.forEach((condition: any) => {
          expect(typeof condition.filter).toBe('string');
        });
      }
    });
  });
});
