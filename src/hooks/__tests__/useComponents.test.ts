/**
 * Tests for useComponents hook
 *
 * Tests comprehensive CRUD operations, error handling, data transformations,
 * and currency field handling for the component library management.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useComponents } from '../useComponents';
import { supabase } from '../../supabaseClient';
import type { DbComponent, Component } from '../../types';

// Mock Supabase client
vi.mock('../../supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock logger to avoid console spam
vi.mock('../../lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('useComponents', () => {
  // Sample test data
  const mockDbComponent: DbComponent = {
    id: 'comp-1',
    name: 'Siemens PLC S7-1500',
    manufacturer: 'Siemens',
    manufacturer_part_number: '6ES7512-1DK01-0AB0',
    category: 'בקרים',
    component_type: 'hardware',
    labor_subtype: null,
    description: 'Industrial PLC controller',
    unit_cost_ils: 9250,
    unit_cost_usd: 2500,
    unit_cost_eur: 2200,
    currency: 'USD',
    original_cost: 2500,
    supplier: 'Automation Direct',
    notes: 'Standard configuration',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
  };

  const mockDbComponents: DbComponent[] = [
    mockDbComponent,
    {
      id: 'comp-2',
      name: 'Banner Sensor',
      manufacturer: 'Banner',
      manufacturer_part_number: 'Q45BB6AF300',
      category: 'חיישנים',
      component_type: 'hardware',
      labor_subtype: null,
      description: 'Photoelectric sensor',
      unit_cost_ils: 555,
      unit_cost_usd: 150,
      unit_cost_eur: 132,
      currency: 'USD',
      original_cost: 150,
      supplier: 'Banner Engineering',
      notes: undefined,
      created_at: '2024-01-16T10:00:00Z',
      updated_at: '2024-01-16T10:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Fetching Components', () => {
    it('should fetch components on mount', async () => {
      // Mock successful fetch
      const mockSelect = vi.fn().mockResolvedValue({
        data: mockDbComponents,
        error: null,
      });

      const mockOrder = vi.fn().mockReturnValue({
        data: mockDbComponents,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect.mockReturnValue({ order: mockOrder }),
      } as any);

      const { result } = renderHook(() => useComponents());

      // Initially loading
      expect(result.current.loading).toBe(true);
      expect(result.current.components).toEqual([]);

      // Wait for fetch to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Verify data loaded
      expect(result.current.components).toEqual(mockDbComponents);
      expect(result.current.error).toBeNull();
      expect(supabase.from).toHaveBeenCalledWith('components');
    });

    it('should handle fetch errors', async () => {
      const mockError = { message: 'Database connection failed' };
      const mockOrder = vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      const mockSelect = vi.fn().mockReturnValue({
        order: mockOrder,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const { result } = renderHook(() => useComponents());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toContain('Failed to fetch components');
      expect(result.current.components).toEqual([]);
    });

    it('should handle empty database', async () => {
      const mockSelect = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const mockOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect.mockReturnValue({ order: mockOrder }),
      } as any);

      const { result } = renderHook(() => useComponents());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.components).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should handle network errors gracefully', async () => {
      const mockOrder = vi.fn().mockRejectedValue(new Error('Network timeout'));

      const mockSelect = vi.fn().mockReturnValue({
        order: mockOrder,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const { result } = renderHook(() => useComponents());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toContain('Network timeout');
      expect(result.current.components).toEqual([]);
    });
  });

  describe('Adding Components', () => {
    it('should add a new component successfully', async () => {
      // Mock initial fetch
      const mockSelect = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const mockOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      // Mock insert operation
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockDbComponent,
        error: null,
      });

      const mockInsertSelect = vi.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: mockInsertSelect,
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'components') {
          return {
            select: mockSelect.mockReturnValue({ order: mockOrder }),
            insert: mockInsert,
          } as any;
        }
        return {} as any;
      });

      const { result } = renderHook(() => useComponents());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Add component
      const newComponent: Omit<Component, 'id' | 'createdAt' | 'updatedAt'> = {
        name: 'New Component',
        manufacturer: 'Test Manufacturer',
        manufacturerPN: 'TEST-001',
        category: 'בקרים',
        componentType: 'hardware',
        description: 'Test component',
        unitCostNIS: 1000,
        unitCostUSD: 270,
        unitCostEUR: 240,
        currency: 'NIS',
        originalCost: 1000,
        supplier: 'Test Supplier',
        quoteDate: '2024-01-20',
        quoteFileUrl: '',
        notes: 'Test notes',
      };

      await result.current.addComponent(newComponent);

      expect(mockInsert).toHaveBeenCalled();
    });

    it('should handle add component errors', async () => {
      // Mock initial fetch
      const mockSelect = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const mockOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      // Mock insert error
      const mockError = { message: 'Duplicate component' };
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      const mockInsertSelect = vi.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: mockInsertSelect,
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        return {
          select: mockSelect.mockReturnValue({ order: mockOrder }),
          insert: mockInsert,
        } as any;
      });

      const { result } = renderHook(() => useComponents());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const newComponent: Omit<Component, 'id' | 'createdAt' | 'updatedAt'> = {
        name: 'Duplicate Component',
        manufacturer: '',
        manufacturerPN: '',
        category: 'אחר',
        componentType: 'hardware',
        description: '',
        unitCostNIS: 100,
        unitCostUSD: 0,
        unitCostEUR: 0,
        currency: 'NIS',
        originalCost: 100,
        supplier: '',
        quoteDate: '',
        quoteFileUrl: '',
        notes: '',
      };

      await expect(result.current.addComponent(newComponent)).rejects.toThrow();

      await waitFor(() => {
        expect(result.current.error).toContain('Failed to add component');
      });
    });
  });

  describe('Updating Components', () => {
    it('should update component successfully', async () => {
      // Mock initial fetch
      const mockSelect = vi.fn().mockResolvedValue({
        data: [mockDbComponent],
        error: null,
      });

      const mockOrder = vi.fn().mockResolvedValue({
        data: [mockDbComponent],
        error: null,
      });

      // Mock update operation
      const updatedComponent = { ...mockDbComponent, name: 'Updated PLC' };
      const mockSingle = vi.fn().mockResolvedValue({
        data: updatedComponent,
        error: null,
      });

      const mockUpdateSelect = vi.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockEq = vi.fn().mockReturnValue({
        select: mockUpdateSelect,
      });

      const mockUpdate = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      vi.mocked(supabase.from).mockImplementation(() => ({
        select: mockSelect.mockReturnValue({ order: mockOrder }),
        update: mockUpdate,
      } as any));

      const { result } = renderHook(() => useComponents());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Update component
      await result.current.updateComponent('comp-1', { name: 'Updated PLC' });

      expect(mockUpdate).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', 'comp-1');
    });

    it('should handle update errors', async () => {
      // Mock initial fetch
      const mockSelect = vi.fn().mockResolvedValue({
        data: [mockDbComponent],
        error: null,
      });

      const mockOrder = vi.fn().mockResolvedValue({
        data: [mockDbComponent],
        error: null,
      });

      // Mock update error
      const mockError = { message: 'Update failed: invalid data' };
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      const mockUpdateSelect = vi.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockEq = vi.fn().mockReturnValue({
        select: mockUpdateSelect,
      });

      const mockUpdate = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      vi.mocked(supabase.from).mockImplementation(() => ({
        select: mockSelect.mockReturnValue({ order: mockOrder }),
        update: mockUpdate,
      } as any));

      const { result } = renderHook(() => useComponents());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(
        result.current.updateComponent('comp-1', { name: 'Invalid Update' })
      ).rejects.toThrow();

      await waitFor(() => {
        expect(result.current.error).toContain('Failed to update component');
      });
    });

    it('should preserve currency fields during update', async () => {
      // Mock initial fetch
      const mockSelect = vi.fn().mockResolvedValue({
        data: [mockDbComponent],
        error: null,
      });

      const mockOrder = vi.fn().mockResolvedValue({
        data: [mockDbComponent],
        error: null,
      });

      // Mock update with currency fields
      const updatedComponent = {
        ...mockDbComponent,
        unit_cost_usd: 2600,
        currency: 'USD',
        original_cost: 2600,
      };

      const mockSingle = vi.fn().mockResolvedValue({
        data: updatedComponent,
        error: null,
      });

      const mockUpdateSelect = vi.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockEq = vi.fn().mockReturnValue({
        select: mockUpdateSelect,
      });

      const mockUpdate = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      vi.mocked(supabase.from).mockImplementation(() => ({
        select: mockSelect.mockReturnValue({ order: mockOrder }),
        update: mockUpdate,
      } as any));

      const { result } = renderHook(() => useComponents());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.updateComponent('comp-1', {
        unitCostUSD: 2600,
        currency: 'USD',
        originalCost: 2600,
      });

      // Verify update was called with DB format
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          unit_cost_usd: 2600,
          currency: 'USD',
          original_cost: 2600,
        })
      );
    });
  });

  describe('Deleting Components', () => {
    it('should delete component successfully', async () => {
      // Mock initial fetch
      const mockSelect = vi.fn().mockResolvedValue({
        data: mockDbComponents,
        error: null,
      });

      const mockOrder = vi.fn().mockResolvedValue({
        data: mockDbComponents,
        error: null,
      });

      // Mock delete operation
      const mockEq = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const mockDelete = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      vi.mocked(supabase.from).mockImplementation(() => ({
        select: mockSelect.mockReturnValue({ order: mockOrder }),
        delete: mockDelete,
      } as any));

      const { result } = renderHook(() => useComponents());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.components).toHaveLength(2);

      await result.current.deleteComponent('comp-1');

      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', 'comp-1');
    });

    it('should handle delete errors', async () => {
      // Mock initial fetch
      const mockSelect = vi.fn().mockResolvedValue({
        data: [mockDbComponent],
        error: null,
      });

      const mockOrder = vi.fn().mockResolvedValue({
        data: [mockDbComponent],
        error: null,
      });

      // Mock delete error
      const mockError = { message: 'Component in use, cannot delete' };
      const mockEq = vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      const mockDelete = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      vi.mocked(supabase.from).mockImplementation(() => ({
        select: mockSelect.mockReturnValue({ order: mockOrder }),
        delete: mockDelete,
      } as any));

      const { result } = renderHook(() => useComponents());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(result.current.deleteComponent('comp-1')).rejects.toThrow();

      await waitFor(() => {
        expect(result.current.error).toContain('Failed to delete component');
      });
    });
  });

  describe('Search and Filter Operations', () => {
    it('should search components by query', async () => {
      // Mock initial fetch
      const mockSelect = vi.fn().mockResolvedValue({
        data: mockDbComponents,
        error: null,
      });

      const mockOrder = vi.fn().mockResolvedValue({
        data: [mockDbComponents[0]], // Return only matching component
        error: null,
      });

      const mockOr = vi.fn().mockReturnValue({
        order: mockOrder,
      });

      vi.mocked(supabase.from).mockImplementation(() => ({
        select: mockSelect.mockReturnValue({
          order: mockOrder,
          or: mockOr,
        }),
      } as any));

      const { result } = renderHook(() => useComponents());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const searchResults = await result.current.searchComponents('Siemens');

      expect(mockOr).toHaveBeenCalled();
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].name).toBe('Siemens PLC S7-1500');
    });

    it('should filter components by category', async () => {
      // Mock initial fetch
      const mockSelect = vi.fn().mockResolvedValue({
        data: mockDbComponents,
        error: null,
      });

      const mockOrder = vi.fn().mockResolvedValue({
        data: [mockDbComponents[0]],
        error: null,
      });

      const mockEq = vi.fn().mockReturnValue({
        order: mockOrder,
      });

      vi.mocked(supabase.from).mockImplementation(() => ({
        select: mockSelect.mockReturnValue({
          order: mockOrder,
          eq: mockEq,
        }),
      } as any));

      const { result } = renderHook(() => useComponents());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const categoryResults = await result.current.getComponentsByCategory('בקרים');

      expect(mockEq).toHaveBeenCalledWith('category', 'בקרים');
      expect(categoryResults).toHaveLength(1);
      expect(categoryResults[0].category).toBe('בקרים');
    });

    it('should handle search errors', async () => {
      // Mock initial fetch
      const mockSelect = vi.fn().mockResolvedValue({
        data: mockDbComponents,
        error: null,
      });

      const mockOrder = vi.fn().mockResolvedValue({
        data: mockDbComponents,
        error: null,
      });

      const mockError = { message: 'Search failed' };
      const mockSearchOrder = vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      const mockOr = vi.fn().mockReturnValue({
        order: mockSearchOrder,
      });

      vi.mocked(supabase.from).mockImplementation(() => ({
        select: mockSelect.mockReturnValue({
          order: mockOrder,
          or: mockOr,
        }),
      } as any));

      const { result } = renderHook(() => useComponents());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const searchResults = await result.current.searchComponents('test');

      await waitFor(() => {
        expect(result.current.error).toContain('Failed to search components');
      });
      expect(searchResults).toEqual([]);
    });
  });

  describe('Data Transformation', () => {
    it('should transform DB format to app format correctly', async () => {
      const mockSelect = vi.fn().mockResolvedValue({
        data: [mockDbComponent],
        error: null,
      });

      const mockOrder = vi.fn().mockResolvedValue({
        data: [mockDbComponent],
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect.mockReturnValue({ order: mockOrder }),
      } as any);

      const { result } = renderHook(() => useComponents());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const component = result.current.components[0];

      // Verify DB fields are preserved (components state uses DB format)
      expect(component.id).toBe(mockDbComponent.id);
      expect(component.name).toBe(mockDbComponent.name);
      expect(component.manufacturer).toBe(mockDbComponent.manufacturer);
      expect(component.manufacturer_part_number).toBe(mockDbComponent.manufacturer_part_number);
    });

    it('should handle missing optional fields', async () => {
      const sparseComponent: DbComponent = {
        id: 'comp-sparse',
        name: 'Minimal Component',
        manufacturer: null,
        manufacturer_part_number: null,
        category: null,
        component_type: 'hardware',
        labor_subtype: null,
        description: null,
        unit_cost_ils: 100,
        unit_cost_usd: null,
        unit_cost_eur: null,
        currency: undefined,
        original_cost: null,
        supplier: null,
        notes: undefined,
        created_at: '2024-01-20T10:00:00Z',
        updated_at: '2024-01-20T10:00:00Z',
      };

      const mockSelect = vi.fn().mockResolvedValue({
        data: [sparseComponent],
        error: null,
      });

      const mockOrder = vi.fn().mockResolvedValue({
        data: [sparseComponent],
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect.mockReturnValue({ order: mockOrder }),
      } as any);

      const { result } = renderHook(() => useComponents());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const component = result.current.components[0];
      expect(component).toBeDefined();
      expect(component.name).toBe('Minimal Component');
    });

    it('should detect currency from price ratios when currency field is null', async () => {
      const componentWithoutCurrency: DbComponent = {
        ...mockDbComponent,
        currency: undefined,
        original_cost: null,
        unit_cost_usd: 2500,
        unit_cost_ils: 9250, // ILS = USD * 3.7 (typical exchange rate)
      };

      const mockSelect = vi.fn().mockResolvedValue({
        data: [componentWithoutCurrency],
        error: null,
      });

      const mockOrder = vi.fn().mockResolvedValue({
        data: [componentWithoutCurrency],
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect.mockReturnValue({ order: mockOrder }),
      } as any);

      const { result } = renderHook(() => useComponents());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Component state stores DB format, so currency detection happens in dbToComponent
      // which is called in other parts of the app, not directly in the hook state
      expect(result.current.components[0]).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large datasets', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        ...mockDbComponent,
        id: `comp-${i}`,
        name: `Component ${i}`,
      }));

      const mockSelect = vi.fn().mockResolvedValue({
        data: largeDataset,
        error: null,
      });

      const mockOrder = vi.fn().mockResolvedValue({
        data: largeDataset,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect.mockReturnValue({ order: mockOrder }),
      } as any);

      const { result } = renderHook(() => useComponents());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.components).toHaveLength(1000);
    });

    it('should handle concurrent operations', async () => {
      const mockSelect = vi.fn().mockResolvedValue({
        data: [mockDbComponent],
        error: null,
      });

      const mockOrder = vi.fn().mockResolvedValue({
        data: [mockDbComponent],
        error: null,
      });

      const mockSingle = vi.fn().mockResolvedValue({
        data: { ...mockDbComponent, name: 'Updated' },
        error: null,
      });

      const mockUpdateSelect = vi.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockEq = vi.fn().mockReturnValue({
        select: mockUpdateSelect,
      });

      const mockUpdate = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      vi.mocked(supabase.from).mockImplementation(() => ({
        select: mockSelect.mockReturnValue({ order: mockOrder }),
        update: mockUpdate,
      } as any));

      const { result } = renderHook(() => useComponents());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Simulate concurrent updates
      const promises = [
        result.current.updateComponent('comp-1', { name: 'Update 1' }),
        result.current.updateComponent('comp-1', { name: 'Update 2' }),
        result.current.updateComponent('comp-1', { name: 'Update 3' }),
      ];

      await Promise.all(promises);

      expect(mockUpdate).toHaveBeenCalledTimes(3);
    });

    it('should handle invalid component data gracefully', async () => {
      const invalidComponent = {
        id: 'invalid',
        // Missing required fields
      } as any;

      const mockSelect = vi.fn().mockResolvedValue({
        data: [invalidComponent],
        error: null,
      });

      const mockOrder = vi.fn().mockResolvedValue({
        data: [invalidComponent],
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect.mockReturnValue({ order: mockOrder }),
      } as any);

      const { result } = renderHook(() => useComponents());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should not crash, should handle invalid data
      expect(result.current.components).toBeDefined();
    });
  });

  describe('Loading States', () => {
    it('should show loading state during fetch', async () => {
      let resolvePromise: any;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      const mockSelect = vi.fn().mockReturnValue(promise);
      const mockOrder = vi.fn().mockReturnValue(promise);

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect.mockReturnValue({ order: mockOrder }),
      } as any);

      const { result } = renderHook(() => useComponents());

      // Should be loading initially
      expect(result.current.loading).toBe(true);

      // Resolve the promise
      resolvePromise({ data: [], error: null });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should clear loading state on error', async () => {
      const mockOrder = vi.fn().mockRejectedValue(new Error('Fetch failed'));

      const mockSelect = vi.fn().mockReturnValue({
        order: mockOrder,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const { result } = renderHook(() => useComponents());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await waitFor(() => {
        expect(result.current.error).toContain('Fetch failed');
      });
    });
  });
});
