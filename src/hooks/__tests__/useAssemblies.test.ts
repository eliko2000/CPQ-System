/**
 * Tests for useAssemblies hook
 *
 * Tests comprehensive CRUD operations for assemblies and assembly components,
 * error handling, data transformations, and component usage tracking.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAssemblies } from '../useAssemblies';
import { supabase } from '../../supabaseClient';
import type { DbAssembly } from '../../types';

// Mock Supabase client
vi.mock('../../supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock logger
vi.mock('../../lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('useAssemblies', () => {
  // Sample test data
  const mockComponent = {
    id: 'comp-1',
    name: 'Siemens PLC',
    description: 'Industrial controller',
    category: 'בקרים',
    component_type: 'hardware',
    labor_subtype: null,
    manufacturer: 'Siemens',
    manufacturer_part_number: '6ES7512-1DK01-0AB0',
    supplier: 'Automation Direct',
    unit_cost_ils: 9250,
    unit_cost_usd: 2500,
    unit_cost_eur: 2200,
    currency: 'USD',
    original_cost: 2500,
    notes: null,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
  };

  const mockAssemblyComponent = {
    id: 'ac-1',
    assembly_id: 'asm-1',
    component_id: 'comp-1',
    component_name: 'Siemens PLC',
    component_manufacturer: 'Siemens',
    component_part_number: '6ES7512-1DK01-0AB0',
    quantity: 2,
    sort_order: 0,
    component: mockComponent,
  };

  const mockDbAssembly: DbAssembly = {
    id: 'asm-1',
    name: 'Standard Control Cabinet',
    description: 'Pre-configured control cabinet',
    is_complete: true,
    notes: 'Standard configuration for factory automation',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Fetching Assemblies', () => {
    it('should fetch assemblies with components on mount', async () => {
      const mockAssembliesOrder = vi.fn().mockResolvedValue({
        data: [mockDbAssembly],
        error: null,
      });

      const mockAssembliesSelect = vi.fn().mockReturnValue({
        order: mockAssembliesOrder,
      });

      const mockComponentsOrder = vi.fn().mockResolvedValue({
        data: [mockAssemblyComponent],
        error: null,
      });

      const mockComponentsIn = vi.fn().mockReturnValue({
        order: mockComponentsOrder,
      });

      const mockComponentsSelect = vi.fn().mockReturnValue({
        in: mockComponentsIn,
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'assemblies') {
          return { select: mockAssembliesSelect } as any;
        }
        if (table === 'assembly_components') {
          return { select: mockComponentsSelect } as any;
        }
        return {} as any;
      });

      const { result } = renderHook(() => useAssemblies());

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.assemblies).toHaveLength(1);
      expect(result.current.assemblies[0].name).toBe(
        'Standard Control Cabinet'
      );
      expect(result.current.assemblies[0].components).toHaveLength(1);
      expect(result.current.error).toBeNull();
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

      const { result } = renderHook(() => useAssemblies());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Database connection failed');
      expect(result.current.assemblies).toEqual([]);
    });

    it('should handle empty database', async () => {
      const mockOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const mockSelect = vi.fn().mockReturnValue({
        order: mockOrder,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const { result } = renderHook(() => useAssemblies());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.assemblies).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should handle assemblies without components', async () => {
      const mockAssembliesOrder = vi.fn().mockResolvedValue({
        data: [mockDbAssembly],
        error: null,
      });

      const mockAssembliesSelect = vi.fn().mockReturnValue({
        order: mockAssembliesOrder,
      });

      const mockComponentsOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const mockComponentsIn = vi.fn().mockReturnValue({
        order: mockComponentsOrder,
      });

      const mockComponentsSelect = vi.fn().mockReturnValue({
        in: mockComponentsIn,
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'assemblies') {
          return { select: mockAssembliesSelect } as any;
        }
        if (table === 'assembly_components') {
          return { select: mockComponentsSelect } as any;
        }
        return {} as any;
      });

      const { result } = renderHook(() => useAssemblies());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.assemblies).toHaveLength(1);
      expect(result.current.assemblies[0].components).toEqual([]);
    });
  });

  describe('Adding Assemblies', () => {
    it('should add new assembly with components successfully', async () => {
      // Mock component details fetch
      const mockComponentsIn = vi.fn().mockResolvedValue({
        data: [
          {
            id: 'comp-1',
            name: 'Siemens PLC',
            manufacturer: 'Siemens',
            manufacturer_part_number: '6ES7512-1DK01-0AB0',
          },
        ],
        error: null,
      });

      const mockComponentsSelect = vi.fn().mockReturnValue({
        in: mockComponentsIn,
      });

      // Mock assembly insert
      const mockAssemblySingle = vi.fn().mockResolvedValue({
        data: mockDbAssembly,
        error: null,
      });

      const mockAssemblyInsertSelect = vi.fn().mockReturnValue({
        single: mockAssemblySingle,
      });

      const mockAssemblyInsert = vi.fn().mockReturnValue({
        select: mockAssemblyInsertSelect,
      });

      // Mock assembly components insert
      const mockComponentsInsert = vi.fn().mockResolvedValue({
        error: null,
      });

      // Mock refresh fetch
      const mockRefreshOrder = vi.fn().mockResolvedValue({
        data: [mockDbAssembly],
        error: null,
      });

      const mockRefreshSelect = vi.fn().mockReturnValue({
        order: mockRefreshOrder,
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'components') {
          return { select: mockComponentsSelect } as any;
        }
        if (table === 'assemblies') {
          return {
            select: mockRefreshSelect,
            insert: mockAssemblyInsert,
          } as any;
        }
        if (table === 'assembly_components') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
            insert: mockComponentsInsert,
          } as any;
        }
        return {} as any;
      });

      const { result } = renderHook(() => useAssemblies());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.addAssembly(
        'New Assembly',
        [{ componentId: 'comp-1', quantity: 2 }],
        'Test description',
        'Test notes'
      );

      expect(mockAssemblyInsert).toHaveBeenCalled();
      expect(mockComponentsInsert).toHaveBeenCalled();
    });

    it('should handle add assembly errors', async () => {
      const mockError = { message: 'Duplicate assembly name' };

      const mockComponentsIn = vi.fn().mockResolvedValue({
        data: [mockComponent],
        error: null,
      });

      const mockComponentsSelect = vi.fn().mockReturnValue({
        in: mockComponentsIn,
      });

      const mockAssemblySingle = vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      const mockAssemblyInsertSelect = vi.fn().mockReturnValue({
        single: mockAssemblySingle,
      });

      const mockAssemblyInsert = vi.fn().mockReturnValue({
        select: mockAssemblyInsertSelect,
      });

      const mockOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const mockSelect = vi.fn().mockReturnValue({
        order: mockOrder,
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'components') {
          return { select: mockComponentsSelect } as any;
        }
        if (table === 'assemblies') {
          return {
            select: mockSelect,
            insert: mockAssemblyInsert,
          } as any;
        }
        return {} as any;
      });

      const { result } = renderHook(() => useAssemblies());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(
        result.current.addAssembly('Duplicate', [
          { componentId: 'comp-1', quantity: 1 },
        ])
      ).rejects.toThrow();

      await waitFor(() => {
        expect(result.current.error).toContain('Duplicate assembly name');
      });
    });
  });

  describe('Updating Assemblies', () => {
    it('should update assembly metadata successfully', async () => {
      const mockEq = vi.fn().mockReturnValue({
        error: null,
      });

      const mockUpdateReturn = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      const mockAssembliesOrder = vi.fn().mockResolvedValue({
        data: [mockDbAssembly],
        error: null,
      });

      const mockAssembliesSelect = vi.fn().mockReturnValue({
        order: mockAssembliesOrder,
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'assemblies') {
          return {
            select: mockAssembliesSelect,
            update: mockUpdateReturn,
          } as any;
        }
        if (table === 'assembly_components') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          } as any;
        }
        return {} as any;
      });

      const { result } = renderHook(() => useAssemblies());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.updateAssembly('asm-1', {
        name: 'Updated Assembly',
        description: 'Updated description',
      });

      expect(mockUpdateReturn).toHaveBeenCalled();
    });

    it('should update assembly components successfully', async () => {
      const mockDeleteEq = vi.fn().mockReturnValue({
        error: null,
      });

      const mockDeleteReturn = vi.fn().mockReturnValue({
        eq: mockDeleteEq,
      });

      const mockComponentsIn = vi.fn().mockResolvedValue({
        data: [mockComponent],
        error: null,
      });

      const mockComponentsSelect = vi.fn().mockReturnValue({
        in: mockComponentsIn,
      });

      const mockInsert = vi.fn().mockResolvedValue({
        error: null,
      });

      const mockUpdateEq = vi.fn().mockReturnValue({
        error: null,
      });

      const mockUpdateReturn = vi.fn().mockReturnValue({
        eq: mockUpdateEq,
      });

      const mockAssembliesOrder = vi.fn().mockResolvedValue({
        data: [mockDbAssembly],
        error: null,
      });

      const mockAssembliesSelect = vi.fn().mockReturnValue({
        order: mockAssembliesOrder,
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'components') {
          return { select: mockComponentsSelect } as any;
        }
        if (table === 'assemblies') {
          return {
            select: mockAssembliesSelect,
            update: mockUpdateReturn,
          } as any;
        }
        if (table === 'assembly_components') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
            delete: mockDeleteReturn,
            insert: mockInsert,
          } as any;
        }
        return {} as any;
      });

      const { result } = renderHook(() => useAssemblies());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.updateAssembly('asm-1', {
        components: [
          { componentId: 'comp-1', quantity: 3 },
          { componentId: 'comp-2', quantity: 1 },
        ],
      });

      expect(mockDeleteReturn).toHaveBeenCalled();
      expect(mockInsert).toHaveBeenCalled();
    });

    it('should handle update errors', async () => {
      const mockError = { message: 'Update failed: validation error' };

      const mockUpdateEq = vi.fn().mockResolvedValue({
        error: mockError,
      });

      const mockUpdateReturn = vi.fn().mockReturnValue({
        eq: mockUpdateEq,
      });

      const mockAssembliesOrder = vi.fn().mockResolvedValue({
        data: [mockDbAssembly],
        error: null,
      });

      const mockAssembliesSelect = vi.fn().mockReturnValue({
        order: mockAssembliesOrder,
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'assemblies') {
          return {
            select: mockAssembliesSelect,
            update: mockUpdateReturn,
          } as any;
        }
        if (table === 'assembly_components') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          } as any;
        }
        return {} as any;
      });

      const { result } = renderHook(() => useAssemblies());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(
        result.current.updateAssembly('asm-1', { name: '' })
      ).rejects.toThrow();

      await waitFor(() => {
        expect(result.current.error).toContain(
          'Update failed: validation error'
        );
      });
    });
  });

  describe('Deleting Assemblies', () => {
    it('should delete assembly successfully', async () => {
      const mockDeleteEq = vi.fn().mockResolvedValue({
        error: null,
      });

      const mockDelete = vi.fn().mockReturnValue({
        eq: mockDeleteEq,
      });

      const mockAssembliesOrder = vi.fn().mockResolvedValue({
        data: [mockDbAssembly],
        error: null,
      });

      const mockAssembliesSelect = vi.fn().mockReturnValue({
        order: mockAssembliesOrder,
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'assemblies') {
          return {
            select: mockAssembliesSelect,
            delete: mockDelete,
          } as any;
        }
        if (table === 'assembly_components') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          } as any;
        }
        return {} as any;
      });

      const { result } = renderHook(() => useAssemblies());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.deleteAssembly('asm-1');

      expect(mockDelete).toHaveBeenCalled();
      expect(mockDeleteEq).toHaveBeenCalledWith('id', 'asm-1');
    });

    it('should handle delete errors', async () => {
      const mockError = { message: 'Cannot delete: assembly in use' };

      const mockDeleteEq = vi.fn().mockResolvedValue({
        error: mockError,
      });

      const mockDelete = vi.fn().mockReturnValue({
        eq: mockDeleteEq,
      });

      const mockAssembliesOrder = vi.fn().mockResolvedValue({
        data: [mockDbAssembly],
        error: null,
      });

      const mockAssembliesSelect = vi.fn().mockReturnValue({
        order: mockAssembliesOrder,
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'assemblies') {
          return {
            select: mockAssembliesSelect,
            delete: mockDelete,
          } as any;
        }
        if (table === 'assembly_components') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          } as any;
        }
        return {} as any;
      });

      const { result } = renderHook(() => useAssemblies());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(result.current.deleteAssembly('asm-1')).rejects.toThrow();

      await waitFor(() => {
        expect(result.current.error).toContain(
          'Cannot delete: assembly in use'
        );
      });
    });
  });

  describe('Component Usage Tracking', () => {
    it('should check if component is used in assemblies', async () => {
      const mockUsageData = [
        {
          assembly_id: 'asm-1',
          assembly: {
            id: 'asm-1',
            name: 'Standard Control Cabinet',
          },
        },
      ];

      const mockEq = vi.fn().mockResolvedValue({
        data: mockUsageData,
        error: null,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'assembly_components') {
          return { select: mockSelect } as any;
        }
        if (table === 'assemblies') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          } as any;
        }
        return {} as any;
      });

      const { result } = renderHook(() => useAssemblies());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const usage = await result.current.checkComponentUsage('comp-1');

      expect(usage.isUsed).toBe(true);
      expect(usage.assemblies).toHaveLength(1);
      expect(usage.assemblies[0].name).toBe('Standard Control Cabinet');
    });

    it('should return empty result when component not used', async () => {
      const mockEq = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'assembly_components') {
          return { select: mockSelect } as any;
        }
        if (table === 'assemblies') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          } as any;
        }
        return {} as any;
      });

      const { result } = renderHook(() => useAssemblies());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const usage = await result.current.checkComponentUsage('comp-unused');

      expect(usage.isUsed).toBe(false);
      expect(usage.assemblies).toEqual([]);
    });

    it('should handle component usage check errors gracefully', async () => {
      const mockError = { message: 'Database error' };

      const mockEq = vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'assembly_components') {
          return { select: mockSelect } as any;
        }
        if (table === 'assemblies') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          } as any;
        }
        return {} as any;
      });

      const { result } = renderHook(() => useAssemblies());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const usage = await result.current.checkComponentUsage('comp-1');

      // Should return safe default on error
      expect(usage.isUsed).toBe(false);
      expect(usage.assemblies).toEqual([]);
    });
  });

  describe('Refresh Functionality', () => {
    it('should manually refresh assemblies', async () => {
      const mockAssembliesOrder = vi.fn().mockResolvedValue({
        data: [mockDbAssembly],
        error: null,
      });

      const mockAssembliesSelect = vi.fn().mockReturnValue({
        order: mockAssembliesOrder,
      });

      const mockComponentsOrder = vi.fn().mockResolvedValue({
        data: [mockAssemblyComponent],
        error: null,
      });

      const mockComponentsIn = vi.fn().mockReturnValue({
        order: mockComponentsOrder,
      });

      const mockComponentsSelect = vi.fn().mockReturnValue({
        in: mockComponentsIn,
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'assemblies') {
          return { select: mockAssembliesSelect } as any;
        }
        if (table === 'assembly_components') {
          return { select: mockComponentsSelect } as any;
        }
        return {} as any;
      });

      const { result } = renderHook(() => useAssemblies());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Clear initial fetch call count
      vi.clearAllMocks();

      await result.current.refreshAssemblies();

      expect(supabase.from).toHaveBeenCalledWith('assemblies');
      expect(mockAssembliesSelect).toHaveBeenCalled();
    });
  });

  describe('Data Transformation', () => {
    it('should transform DB format to app format correctly', async () => {
      const mockAssembliesOrder = vi.fn().mockResolvedValue({
        data: [mockDbAssembly],
        error: null,
      });

      const mockAssembliesSelect = vi.fn().mockReturnValue({
        order: mockAssembliesOrder,
      });

      const mockComponentsOrder = vi.fn().mockResolvedValue({
        data: [mockAssemblyComponent],
        error: null,
      });

      const mockComponentsIn = vi.fn().mockReturnValue({
        order: mockComponentsOrder,
      });

      const mockComponentsSelect = vi.fn().mockReturnValue({
        in: mockComponentsIn,
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'assemblies') {
          return { select: mockAssembliesSelect } as any;
        }
        if (table === 'assembly_components') {
          return { select: mockComponentsSelect } as any;
        }
        return {} as any;
      });

      const { result } = renderHook(() => useAssemblies());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const assembly = result.current.assemblies[0];

      // Verify transformation from DB format
      expect(assembly.id).toBe(mockDbAssembly.id);
      expect(assembly.name).toBe(mockDbAssembly.name);
      expect(assembly.isComplete).toBe(mockDbAssembly.is_complete);
      expect(assembly.components[0].componentId).toBe('comp-1');
      expect(assembly.components[0].quantity).toBe(2);
    });

    it('should handle missing component details gracefully', async () => {
      const componentWithoutDetails = {
        ...mockAssemblyComponent,
        component: null,
      };

      const mockAssembliesOrder = vi.fn().mockResolvedValue({
        data: [mockDbAssembly],
        error: null,
      });

      const mockAssembliesSelect = vi.fn().mockReturnValue({
        order: mockAssembliesOrder,
      });

      const mockComponentsOrder = vi.fn().mockResolvedValue({
        data: [componentWithoutDetails],
        error: null,
      });

      const mockComponentsIn = vi.fn().mockReturnValue({
        order: mockComponentsOrder,
      });

      const mockComponentsSelect = vi.fn().mockReturnValue({
        in: mockComponentsIn,
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'assemblies') {
          return { select: mockAssembliesSelect } as any;
        }
        if (table === 'assembly_components') {
          return { select: mockComponentsSelect } as any;
        }
        return {} as any;
      });

      const { result } = renderHook(() => useAssemblies());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const assembly = result.current.assemblies[0];
      expect(assembly.components[0].component).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle large number of assemblies', async () => {
      const largeDataset = Array.from({ length: 100 }, (_, i) => ({
        ...mockDbAssembly,
        id: `asm-${i}`,
        name: `Assembly ${i}`,
      }));

      const mockAssembliesOrder = vi.fn().mockResolvedValue({
        data: largeDataset,
        error: null,
      });

      const mockAssembliesSelect = vi.fn().mockReturnValue({
        order: mockAssembliesOrder,
      });

      const mockComponentsOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const mockComponentsIn = vi.fn().mockReturnValue({
        order: mockComponentsOrder,
      });

      const mockComponentsSelect = vi.fn().mockReturnValue({
        in: mockComponentsIn,
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'assemblies') {
          return { select: mockAssembliesSelect } as any;
        }
        if (table === 'assembly_components') {
          return { select: mockComponentsSelect } as any;
        }
        return {} as any;
      });

      const { result } = renderHook(() => useAssemblies());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.assemblies).toHaveLength(100);
    });
  });
});
