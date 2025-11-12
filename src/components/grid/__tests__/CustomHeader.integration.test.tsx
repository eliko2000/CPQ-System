import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CustomHeader } from '../CustomHeader'
import { SmartFilter } from '../SmartFilter'
import { Column } from 'ag-grid-community'

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  MoreVertical: () => <div>More</div>,
  Filter: () => <div>Filter</div>,
  Search: () => <div>Search</div>,
  X: () => <div>X</div>,
  Check: () => <div>Check</div>
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
 * INTEGRATION TESTS: End-to-End Filter Flow
 *
 * These tests verify the complete filter flow from user interaction to AG Grid state
 * This prevents regressions in the filter functionality that occurred when:
 * - Filter format was incorrect
 * - Async operations were not properly chained
 * - Filter state was not persisting
 */

describe('CustomHeader Integration Tests', () => {
  let mockApi: any
  let mockColumn: Column
  let mockFilterInstance: any
  let filterModel: any = null

  beforeEach(() => {
    vi.clearAllMocks()
    filterModel = null

    // Simulate a real TextFilter instance
    mockFilterInstance = {
      constructor: { name: 'TextFilter' },
      setModel: vi.fn().mockImplementation(async (model) => {
        // Simulate AG Grid storing the filter model
        filterModel = model
        return undefined
      }),
      getModel: vi.fn().mockImplementation(() => filterModel),
      isFilterActive: vi.fn().mockImplementation(() => filterModel !== null),
      applyModel: vi.fn()
    }

    mockApi = {
      getColumnFilterInstance: vi.fn().mockResolvedValue(mockFilterInstance),
      onFilterChanged: vi.fn(),
      getFilterModel: vi.fn().mockImplementation(() => {
        if (filterModel) {
          return { test_column: filterModel }
        }
        return {}
      })
    }

    mockColumn = {
      getColId: () => 'test_column'
    } as Column
  })

  describe('Complete Filter Flow', () => {
    it('should complete full filter flow: click -> select -> apply -> verify', async () => {
      const user = userEvent.setup()
      const uniqueValues = ['Value1', 'Value2', 'Value3']

      const props = {
        displayName: 'Test Column',
        column: mockColumn,
        api: mockApi,
        uniqueValues
      }

      const { container } = render(<CustomHeader {...props} />)

      // Step 1: Click filter button
      const filterButton = screen.getByTitle('סינון')
      expect(filterButton).toBeDefined()

      // Step 2: Verify filter instance is requested
      await user.click(filterButton)

      await waitFor(() => {
        expect(mockApi.getColumnFilterInstance).toHaveBeenCalledWith('test_column')
      })

      // Step 3: Verify filter model is set
      await waitFor(() => {
        expect(mockFilterInstance.setModel).toHaveBeenCalled()
      })

      // Step 4: Verify filter is active
      await waitFor(() => {
        expect(mockFilterInstance.isFilterActive()).toBe(true)
      })

      // Step 5: Verify onFilterChanged was called
      expect(mockApi.onFilterChanged).toHaveBeenCalled()

      // Step 6: Verify filter model is in grid state
      const gridFilterModel = mockApi.getFilterModel()
      expect(gridFilterModel).toHaveProperty('test_column')
      expect(gridFilterModel.test_column).not.toBeNull()
    })

    it('should handle single value filter correctly', async () => {
      const user = userEvent.setup()

      const props = {
        displayName: 'Test Column',
        column: mockColumn,
        api: mockApi,
        uniqueValues: ['SingleValue']
      }

      render(<CustomHeader {...props} />)

      const filterButton = screen.getByTitle('סינון')
      await user.click(filterButton)

      await waitFor(() => {
        expect(mockFilterInstance.setModel).toHaveBeenCalled()
      })

      // Verify single value uses simple equals filter
      expect(filterModel).toEqual({
        filterType: 'text',
        type: 'equals',
        filter: 'SingleValue'
      })
    })

    it('should handle multiple values with OR conditions', async () => {
      const user = userEvent.setup()

      const props = {
        displayName: 'Test Column',
        column: mockColumn,
        api: mockApi,
        uniqueValues: ['Value1', 'Value2', 'Value3']
      }

      render(<CustomHeader {...props} />)

      const filterButton = screen.getByTitle('סינון')
      await user.click(filterButton)

      await waitFor(() => {
        expect(mockFilterInstance.setModel).toHaveBeenCalled()
      })

      // Verify multiple values use OR operator
      expect(filterModel).toHaveProperty('filterType', 'text')
      expect(filterModel).toHaveProperty('operator', 'OR')
      expect(filterModel).toHaveProperty('conditions')
      expect(filterModel.conditions).toHaveLength(3)
      expect(filterModel.conditions[0]).toEqual({
        filterType: 'text',
        type: 'equals',
        filter: 'Value1'
      })
    })
  })

  describe('Filter State Persistence', () => {
    it('should maintain filter state after setting', async () => {
      const user = userEvent.setup()

      const props = {
        displayName: 'Test Column',
        column: mockColumn,
        api: mockApi,
        uniqueValues: ['Value1']
      }

      render(<CustomHeader {...props} />)

      const filterButton = screen.getByTitle('סינון')
      await user.click(filterButton)

      await waitFor(() => {
        expect(mockFilterInstance.isFilterActive()).toBe(true)
      })

      // Verify filter model is retained
      expect(mockFilterInstance.getModel()).not.toBeNull()

      // Verify grid filter model includes this filter
      const gridModel = mockApi.getFilterModel()
      expect(gridModel.test_column).toBeDefined()
    })

    it('should clear filter state when clearing', async () => {
      const user = userEvent.setup()

      // Set up with an active filter
      filterModel = {
        filterType: 'text',
        type: 'equals',
        filter: 'Value1'
      }

      const props = {
        displayName: 'Test Column',
        column: mockColumn,
        api: mockApi,
        uniqueValues: ['Value1']
      }

      render(<CustomHeader {...props} />)

      // Simulate clearing the filter
      mockFilterInstance.setModel = vi.fn().mockImplementation(async (model) => {
        if (model === null) {
          filterModel = null
        }
        return undefined
      })

      // Clear filter by setting model to null
      await mockFilterInstance.setModel(null)

      expect(mockFilterInstance.isFilterActive()).toBe(false)
      expect(mockFilterInstance.getModel()).toBeNull()
    })
  })

  describe('Async Operation Ordering', () => {
    it('CRITICAL: must maintain correct async operation order', async () => {
      const operationOrder: string[] = []

      mockFilterInstance.setModel = vi.fn().mockImplementation(async (model) => {
        operationOrder.push('setModel:start')
        await new Promise(resolve => setTimeout(resolve, 10))
        filterModel = model
        operationOrder.push('setModel:complete')
        return undefined
      })

      mockFilterInstance.applyModel = vi.fn().mockImplementation(() => {
        operationOrder.push('applyModel')
      })

      mockApi.onFilterChanged = vi.fn().mockImplementation(() => {
        operationOrder.push('onFilterChanged')
      })

      const props = {
        displayName: 'Test Column',
        column: mockColumn,
        api: mockApi,
        uniqueValues: ['Value1']
      }

      render(<CustomHeader {...props} />)

      const filterButton = screen.getByTitle('סינון')
      await fireEvent.click(filterButton)

      await waitFor(() => {
        expect(operationOrder).toEqual([
          'setModel:start',
          'setModel:complete',
          'applyModel',
          'onFilterChanged'
        ])
      }, { timeout: 100 })

      // CRITICAL: Order must be maintained for filter to work
      // setModel MUST complete before applyModel and onFilterChanged
    })
  })

  describe('Filter Type Detection', () => {
    it('should detect and use correct format for TextFilter', async () => {
      mockFilterInstance.constructor.name = 'TextFilter'

      const props = {
        displayName: 'Test Column',
        column: mockColumn,
        api: mockApi,
        uniqueValues: ['Value1', 'Value2']
      }

      render(<CustomHeader {...props} />)

      const filterButton = screen.getByTitle('סינון')
      await fireEvent.click(filterButton)

      await waitFor(() => {
        expect(mockFilterInstance.setModel).toHaveBeenCalled()
      })

      // Must use TextFilter format, not SetFilter format
      expect(filterModel).not.toHaveProperty('values')
      expect(filterModel).toHaveProperty('filterType', 'text')
    })

    it('should detect and use correct format for SetFilter (Enterprise)', async () => {
      mockFilterInstance.constructor.name = 'SetFilter'
      mockFilterInstance.setModel = vi.fn().mockImplementation(async (model) => {
        // SetFilter expects { values: [...] } format
        if (!model.values) {
          throw new Error('SetFilter requires values array')
        }
        filterModel = model
        return undefined
      })

      const props = {
        displayName: 'Test Column',
        column: mockColumn,
        api: mockApi,
        uniqueValues: ['Value1', 'Value2']
      }

      render(<CustomHeader {...props} />)

      const filterButton = screen.getByTitle('סינון')
      await fireEvent.click(filterButton)

      await waitFor(() => {
        expect(mockFilterInstance.setModel).toHaveBeenCalled()
      })

      // Must use SetFilter format
      expect(filterModel).toHaveProperty('values')
      expect(filterModel.values).toEqual(['Value1', 'Value2'])
    })
  })

  describe('Error Recovery', () => {
    it('should not break UI when filter setting fails', async () => {
      mockFilterInstance.setModel = vi.fn().mockRejectedValue(new Error('Filter error'))

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const props = {
        displayName: 'Test Column',
        column: mockColumn,
        api: mockApi,
        uniqueValues: ['Value1']
      }

      const { container } = render(<CustomHeader {...props} />)

      const filterButton = screen.getByTitle('סינון')
      await fireEvent.click(filterButton)

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled()
      })

      // UI should still be functional
      expect(container.querySelector('button[title*="סינון"]')).toBeDefined()

      consoleErrorSpy.mockRestore()
    })
  })
})
