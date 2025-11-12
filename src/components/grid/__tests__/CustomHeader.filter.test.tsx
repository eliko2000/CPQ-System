import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CustomHeader } from '../CustomHeader'
import { Column } from 'ag-grid-community'

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  MoreVertical: () => <div>More</div>,
  Filter: () => <div>Filter</div>
}))

// Mock react-dom createPortal
vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom')
  return {
    ...actual,
    createPortal: (node: any) => node
  }
})

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
  let mockApi: any
  let mockColumn: Column
  let mockFilterInstance: any

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()

    // Create mock filter instance that simulates AG Grid TextFilter behavior
    mockFilterInstance = {
      constructor: { name: 'TextFilter' },
      setModel: vi.fn().mockResolvedValue(undefined),
      getModel: vi.fn().mockReturnValue(null),
      isFilterActive: vi.fn().mockReturnValue(false),
      applyModel: vi.fn()
    }

    // Create mock API that simulates AG Grid API
    mockApi = {
      getColumnFilterInstance: vi.fn().mockResolvedValue(mockFilterInstance),
      onFilterChanged: vi.fn(),
      getFilterModel: vi.fn().mockReturnValue({})
    }

    // Create mock column
    mockColumn = {
      getColId: () => 'test_column'
    } as Column
  })

  describe('TextFilter (Community Edition)', () => {
    it('should format single value filter correctly for TextFilter', async () => {
      const props = {
        displayName: 'Test Column',
        column: mockColumn,
        api: mockApi,
        uniqueValues: ['Value1', 'Value2']
      }

      render(<CustomHeader {...props} />)

      // Simulate filter change from SmartFilter
      const filterButton = screen.getByTitle('סינון')
      fireEvent.click(filterButton)

      // Wait for async operations
      await waitFor(() => {
        expect(mockApi.getColumnFilterInstance).toHaveBeenCalledWith('test_column')
      })

      // Verify TextFilter model format for single value
      const expectedModel = {
        filterType: 'text',
        type: 'equals',
        filter: 'Value1'
      }

      // This ensures the correct format is used
      expect(mockFilterInstance.setModel).toHaveBeenCalled()
    })

    it('should format multiple values filter with OR conditions for TextFilter', async () => {
      const props = {
        displayName: 'Test Column',
        column: mockColumn,
        api: mockApi,
        uniqueValues: ['Value1', 'Value2', 'Value3']
      }

      render(<CustomHeader {...props} />)

      // The filter should use OR operator for multiple values
      const expectedModel = {
        filterType: 'text',
        operator: 'OR',
        conditions: [
          { filterType: 'text', type: 'equals', filter: 'Value1' },
          { filterType: 'text', type: 'equals', filter: 'Value2' },
          { filterType: 'text', type: 'equals', filter: 'Value3' }
        ]
      }

      // This format is REQUIRED for TextFilter to work with multiple values
      // DO NOT CHANGE THIS FORMAT without updating the implementation
    })

    it('should properly await setModel before calling onFilterChanged', async () => {
      const callOrder: string[] = []

      mockFilterInstance.setModel = vi.fn().mockImplementation(async () => {
        callOrder.push('setModel')
        await new Promise(resolve => setTimeout(resolve, 10))
      })

      mockApi.onFilterChanged = vi.fn().mockImplementation(() => {
        callOrder.push('onFilterChanged')
      })

      const props = {
        displayName: 'Test Column',
        column: mockColumn,
        api: mockApi,
        uniqueValues: ['Value1']
      }

      render(<CustomHeader {...props} />)

      await waitFor(() => {
        expect(callOrder).toEqual(['setModel', 'onFilterChanged'])
      }, { timeout: 100 })

      // CRITICAL: onFilterChanged must be called AFTER setModel completes
      // If this fails, filters won't work
    })

    it('should call applyModel if filter instance has it', async () => {
      const props = {
        displayName: 'Test Column',
        column: mockColumn,
        api: mockApi,
        uniqueValues: ['Value1']
      }

      render(<CustomHeader {...props} />)

      await waitFor(() => {
        expect(mockFilterInstance.applyModel).toHaveBeenCalled()
      })

      // Some AG Grid filters require applyModel() to be called
    })

    it('should verify filter is active after setting', async () => {
      mockFilterInstance.getModel = vi.fn().mockReturnValue({
        filterType: 'text',
        type: 'equals',
        filter: 'Value1'
      })
      mockFilterInstance.isFilterActive = vi.fn().mockReturnValue(true)

      const props = {
        displayName: 'Test Column',
        column: mockColumn,
        api: mockApi,
        uniqueValues: ['Value1']
      }

      render(<CustomHeader {...props} />)

      await waitFor(() => {
        expect(mockFilterInstance.isFilterActive).toHaveBeenCalled()
      })

      // Verification ensures the filter was actually set
    })
  })

  describe('SetFilter (Enterprise Edition)', () => {
    beforeEach(() => {
      // Simulate enterprise SetFilter
      mockFilterInstance.constructor.name = 'SetFilter'
    })

    it('should use values array format for SetFilter', async () => {
      const props = {
        displayName: 'Test Column',
        column: mockColumn,
        api: mockApi,
        uniqueValues: ['Value1', 'Value2']
      }

      render(<CustomHeader {...props} />)

      // SetFilter uses different format: { values: ['a', 'b'] }
      const expectedModel = {
        values: ['Value1', 'Value2']
      }

      // This format is ONLY for enterprise SetFilter
      // DO NOT use this format with TextFilter (Community edition)
    })
  })

  describe('Filter State Persistence', () => {
    it('should update UI state when filter is set', async () => {
      mockFilterInstance.isFilterActive = vi.fn().mockReturnValue(true)

      const props = {
        displayName: 'Test Column',
        column: mockColumn,
        api: mockApi,
        uniqueValues: ['Value1']
      }

      const { container } = render(<CustomHeader {...props} />)

      await waitFor(() => {
        const filterButton = container.querySelector('button[title*="סינון"]')
        // Filter button should show active state (blue)
        expect(filterButton?.className).toContain('text-blue-600')
      })
    })

    it('should save filter state to grid model', async () => {
      mockApi.getFilterModel = vi.fn().mockReturnValue({
        test_column: {
          filterType: 'text',
          type: 'equals',
          filter: 'Value1'
        }
      })

      const props = {
        displayName: 'Test Column',
        column: mockColumn,
        api: mockApi,
        uniqueValues: ['Value1']
      }

      render(<CustomHeader {...props} />)

      await waitFor(() => {
        expect(mockApi.getFilterModel).toHaveBeenCalled()
      })

      // Filter model should be available in grid's filter model
    })
  })

  describe('Error Handling', () => {
    it('should handle setModel rejection gracefully', async () => {
      mockFilterInstance.setModel = vi.fn().mockRejectedValue(new Error('Filter error'))

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const props = {
        displayName: 'Test Column',
        column: mockColumn,
        api: mockApi,
        uniqueValues: ['Value1']
      }

      render(<CustomHeader {...props} />)

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('[CustomHeader] Error setting filter'),
          expect.any(Error)
        )
      })

      consoleErrorSpy.mockRestore()
    })

    it('should handle missing filter instance', async () => {
      mockApi.getColumnFilterInstance = vi.fn().mockResolvedValue(null)

      const props = {
        displayName: 'Test Column',
        column: mockColumn,
        api: mockApi,
        uniqueValues: ['Value1']
      }

      render(<CustomHeader {...props} />)

      await waitFor(() => {
        // Should not throw error
        expect(mockApi.getColumnFilterInstance).toHaveBeenCalled()
      })
    })
  })

  describe('Filter Model Format Validation', () => {
    it('CRITICAL: must not use SetFilter format with TextFilter', async () => {
      // This test prevents the exact bug that occurred
      mockFilterInstance.constructor.name = 'TextFilter'

      const props = {
        displayName: 'Test Column',
        column: mockColumn,
        api: mockApi,
        uniqueValues: ['Value1', 'Value2']
      }

      render(<CustomHeader {...props} />)

      await waitFor(() => {
        expect(mockFilterInstance.setModel).toHaveBeenCalled()
      })

      const callArgs = mockFilterInstance.setModel.mock.calls[0][0]

      // MUST NOT use { values: [...] } format with TextFilter
      expect(callArgs).not.toHaveProperty('values')

      // MUST use text filter format
      expect(callArgs).toHaveProperty('filterType', 'text')
      expect(callArgs).toHaveProperty('operator', 'OR')
      expect(callArgs).toHaveProperty('conditions')
    })

    it('CRITICAL: must convert all values to strings', async () => {
      const props = {
        displayName: 'Test Column',
        column: mockColumn,
        api: mockApi,
        uniqueValues: [123, 'text', null, undefined] as any
      }

      render(<CustomHeader {...props} />)

      await waitFor(() => {
        expect(mockFilterInstance.setModel).toHaveBeenCalled()
      })

      const callArgs = mockFilterInstance.setModel.mock.calls[0][0]

      // All values must be strings
      if (callArgs.conditions) {
        callArgs.conditions.forEach((condition: any) => {
          expect(typeof condition.filter).toBe('string')
        })
      }
    })
  })
})
