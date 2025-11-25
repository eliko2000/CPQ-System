/**
 * Tests for useQuotations hook
 *
 * Tests comprehensive CRUD operations for quotations, systems, and items,
 * error handling, data transformations, and multi-currency preservation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useQuotations } from '../useQuotations';
import { supabase } from '../../supabaseClient';
import type { DbQuotation, DbQuotationSystem, DbQuotationItem } from '../../types';

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

describe('useQuotations', () => {
  // Sample test data
  const mockQuotationItem: DbQuotationItem = {
    id: 'item-1',
    quotation_system_id: 'system-1',
    component_id: 'comp-1',
    item_name: 'Siemens PLC',
    manufacturer: 'Siemens',
    manufacturer_part_number: '6ES7512-1DK01-0AB0',
    quantity: 2,
    unit_cost: 2500,
    total_cost: 5000,
    margin_percentage: 25,
    unit_price: 3125,
    total_price: 6250,
    original_currency: 'USD',
    original_cost: 2500,
    notes: null,
    sort_order: 0,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
  };

  const mockQuotationSystem: DbQuotationSystem = {
    id: 'system-1',
    quotation_id: 'quot-1',
    system_name: 'Main Control System',
    system_description: 'Primary automation system',
    quantity: 1,
    unit_cost: 10000,
    total_cost: 10000,
    margin_percentage: 25,
    unit_price: 12500,
    total_price: 12500,
    sort_order: 0,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    quotation_items: [mockQuotationItem],
  };

  const mockQuotation: DbQuotation = {
    id: 'quot-1',
    quotation_number: 'Q-2024-001',
    version: 1,
    customer_name: 'Acme Corp',
    customer_email: 'contact@acme.com',
    project_name: 'Factory Automation',
    project_description: 'Complete automation solution',
    project_id: null,
    currency: 'ILS',
    exchange_rate: 3.7,
    margin_percentage: 25,
    status: 'draft',
    valid_until_date: '2024-06-30',
    terms: 'Standard payment terms',
    notes: 'Important project',
    total_cost: 10000,
    total_price: 12500,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    quotation_systems: [mockQuotationSystem],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Fetching Quotations', () => {
    it('should fetch quotations with nested systems and items on mount', async () => {
      const mockOrder = vi.fn().mockResolvedValue({
        data: [mockQuotation],
        error: null,
      });

      const mockSelect = vi.fn().mockReturnValue({
        order: mockOrder,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const { result } = renderHook(() => useQuotations());

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.quotations).toHaveLength(1);
      expect(result.current.quotations[0].quotation_number).toBe('Q-2024-001');
      expect(result.current.quotations[0].quotation_systems).toHaveLength(1);
      expect(result.current.quotations[0].quotation_systems[0].quotation_items).toHaveLength(1);
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

      const { result } = renderHook(() => useQuotations());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Database connection failed');
      expect(result.current.quotations).toEqual([]);
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

      const { result } = renderHook(() => useQuotations());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.quotations).toEqual([]);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Getting Single Quotation', () => {
    it('should fetch single quotation by ID', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockQuotation,
        error: null,
      });

      const mockEq = vi.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const { result } = renderHook(() => useQuotations());

      const quotation = await result.current.getQuotation('quot-1');

      expect(quotation).toBeDefined();
      expect(quotation?.quotation_number).toBe('Q-2024-001');
      expect(mockEq).toHaveBeenCalledWith('id', 'quot-1');
    });

    it('should return null on fetch error', async () => {
      const mockError = { message: 'Quotation not found' };
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      const mockEq = vi.fn().mockReturnValue({
        single: mockSingle,
      });

      const _mockGetSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      // Mock for initial fetch
      const mockOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const _mockListSelect = vi.fn().mockReturnValue({
        order: mockOrder,
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'quotations') {
          return {
            select: vi.fn().mockImplementation((fields: string) => {
              // If selecting with nested fields, return for getQuotation
              if (fields.includes('quotation_systems')) {
                return { eq: mockEq };
              }
              // Otherwise return for list fetch
              return { order: mockOrder };
            }),
          } as any;
        }
        return {} as any;
      });

      const { result } = renderHook(() => useQuotations());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const quotation = await result.current.getQuotation('non-existent');

      expect(quotation).toBeNull();
      await waitFor(() => {
        expect(result.current.error).toContain('Quotation not found');
      });
    });
  });

  describe('Adding Quotations', () => {
    it('should add new quotation successfully', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockQuotation,
        error: null,
      });

      const mockInsertSelect = vi.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: mockInsertSelect,
      });

      // Mock initial fetch
      const mockOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const mockSelect = vi.fn().mockReturnValue({
        order: mockOrder,
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'quotations') {
          return {
            select: mockSelect,
            insert: mockInsert,
          } as any;
        }
        return {} as any;
      });

      const { result } = renderHook(() => useQuotations());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const newQuotation: Omit<DbQuotation, 'id' | 'created_at' | 'updated_at'> = {
        quotation_number: 'Q-2024-002',
        version: 1,
        customer_name: 'New Customer',
        customer_email: null,
        project_name: 'New Project',
        project_description: null,
        project_id: null,
        currency: 'ILS',
        exchange_rate: 3.7,
        margin_percentage: 25,
        status: 'draft',
        valid_until_date: null,
        terms: null,
        notes: null,
        total_cost: 0,
        total_price: 0,
        quotation_systems: [],
      };

      const added = await result.current.addQuotation(newQuotation);

      expect(mockInsert).toHaveBeenCalled();
      expect(added).toBeDefined();
    });

    it('should handle add quotation errors', async () => {
      const mockError = { message: 'Duplicate quotation number' };
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

      const mockOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const mockSelect = vi.fn().mockReturnValue({
        order: mockOrder,
      });

      vi.mocked(supabase.from).mockImplementation(() => ({
        select: mockSelect,
        insert: mockInsert,
      } as any));

      const { result } = renderHook(() => useQuotations());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const newQuotation: Omit<DbQuotation, 'id' | 'created_at' | 'updated_at'> = {
        quotation_number: 'Q-2024-001', // Duplicate
        version: 1,
        customer_name: 'Test',
        customer_email: null,
        project_name: null,
        project_description: null,
        project_id: null,
        currency: 'ILS',
        exchange_rate: 3.7,
        margin_percentage: 25,
        status: 'draft',
        valid_until_date: null,
        terms: null,
        notes: null,
        total_cost: 0,
        total_price: 0,
        quotation_systems: [],
      };

      await expect(result.current.addQuotation(newQuotation)).rejects.toThrow();

      await waitFor(() => {
        expect(result.current.error).toContain('Failed to add quotation');
      });
    });
  });

  describe('Updating Quotations', () => {
    it('should update quotation successfully', async () => {
      const _updatedQuotation = { ...mockQuotation, customer_name: 'Updated Corp' };

      const mockSingle = vi.fn().mockResolvedValue({
        data: updatedQuotation,
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

      const mockOrder = vi.fn().mockResolvedValue({
        data: [mockQuotation],
        error: null,
      });

      const mockSelect = vi.fn().mockReturnValue({
        order: mockOrder,
      });

      vi.mocked(supabase.from).mockImplementation(() => ({
        select: mockSelect,
        update: mockUpdate,
      } as any));

      const { result } = renderHook(() => useQuotations());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.updateQuotation('quot-1', { customer_name: 'Updated Corp' });

      expect(mockUpdate).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', 'quot-1');
    });

    it('should preserve nested data when updating quotation', async () => {
      const _updatedQuotation = { ...mockQuotation, status: 'sent' };

      const mockSingle = vi.fn().mockResolvedValue({
        data: { status: 'sent' }, // DB only returns updated fields
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

      const mockOrder = vi.fn().mockResolvedValue({
        data: [mockQuotation],
        error: null,
      });

      const mockSelect = vi.fn().mockReturnValue({
        order: mockOrder,
      });

      vi.mocked(supabase.from).mockImplementation(() => ({
        select: mockSelect,
        update: mockUpdate,
      } as any));

      const { result } = renderHook(() => useQuotations());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.updateQuotation('quot-1', { status: 'sent' });

      // Verify nested quotation_systems are preserved
      const updated = result.current.quotations.find(q => q.id === 'quot-1');
      expect(updated?.quotation_systems).toBeDefined();
      expect(updated?.quotation_systems).toHaveLength(1);
    });

    it('should handle update errors', async () => {
      const mockError = { message: 'Update failed: validation error' };
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

      const mockOrder = vi.fn().mockResolvedValue({
        data: [mockQuotation],
        error: null,
      });

      const mockSelect = vi.fn().mockReturnValue({
        order: mockOrder,
      });

      vi.mocked(supabase.from).mockImplementation(() => ({
        select: mockSelect,
        update: mockUpdate,
      } as any));

      const { result } = renderHook(() => useQuotations());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(
        result.current.updateQuotation('quot-1', { status: 'invalid-status' as any })
      ).rejects.toThrow();

      await waitFor(() => {
        expect(result.current.error).toContain('Failed to update quotation');
      });
    });
  });

  describe('Deleting Quotations', () => {
    it('should delete quotation successfully', async () => {
      const mockEq = vi.fn().mockResolvedValue({
        error: null,
      });

      const mockDelete = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      const mockOrder = vi.fn().mockResolvedValue({
        data: [mockQuotation],
        error: null,
      });

      const mockSelect = vi.fn().mockReturnValue({
        order: mockOrder,
      });

      vi.mocked(supabase.from).mockImplementation(() => ({
        select: mockSelect,
        delete: mockDelete,
      } as any));

      const { result } = renderHook(() => useQuotations());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.deleteQuotation('quot-1');

      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', 'quot-1');
    });

    it('should handle delete errors', async () => {
      const mockError = { message: 'Cannot delete: quotation is locked' };
      const mockEq = vi.fn().mockResolvedValue({
        error: mockError,
      });

      const mockDelete = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      const mockOrder = vi.fn().mockResolvedValue({
        data: [mockQuotation],
        error: null,
      });

      const mockSelect = vi.fn().mockReturnValue({
        order: mockOrder,
      });

      vi.mocked(supabase.from).mockImplementation(() => ({
        select: mockSelect,
        delete: mockDelete,
      } as any));

      const { result } = renderHook(() => useQuotations());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(result.current.deleteQuotation('quot-1')).rejects.toThrow();

      await waitFor(() => {
        expect(result.current.error).toContain('Failed to delete quotation');
      });
    });
  });

  describe('Quotation Systems Operations', () => {
    it('should add quotation system successfully', async () => {
      const newSystem: Omit<DbQuotationSystem, 'id' | 'created_at' | 'updated_at'> = {
        quotation_id: 'quot-1',
        system_name: 'Secondary System',
        system_description: null,
        quantity: 1,
        unit_cost: 5000,
        total_cost: 5000,
        margin_percentage: 25,
        unit_price: 6250,
        total_price: 6250,
        sort_order: 1,
        quotation_items: [],
      };

      const mockSingle = vi.fn().mockResolvedValue({
        data: { ...newSystem, id: 'system-2' },
        error: null,
      });

      const mockInsertSelect = vi.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: mockInsertSelect,
      });

      const mockOrder = vi.fn().mockResolvedValue({
        data: [mockQuotation],
        error: null,
      });

      const mockSelect = vi.fn().mockReturnValue({
        order: mockOrder,
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => ({
        select: mockSelect,
        insert: mockInsert,
      } as any));

      const { result } = renderHook(() => useQuotations());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.addQuotationSystem(newSystem);

      expect(mockInsert).toHaveBeenCalled();
    });

    it('should update quotation system successfully', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: { ...mockQuotationSystem, system_name: 'Updated System' },
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

      const mockOrder = vi.fn().mockResolvedValue({
        data: [mockQuotation],
        error: null,
      });

      const mockSelect = vi.fn().mockReturnValue({
        order: mockOrder,
      });

      vi.mocked(supabase.from).mockImplementation(() => ({
        select: mockSelect,
        update: mockUpdate,
      } as any));

      const { result } = renderHook(() => useQuotations());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.updateQuotationSystem('system-1', { system_name: 'Updated System' });

      expect(mockUpdate).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', 'system-1');
    });

    it('should delete quotation system successfully', async () => {
      const mockEq = vi.fn().mockResolvedValue({
        error: null,
      });

      const mockDelete = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      const mockOrder = vi.fn().mockResolvedValue({
        data: [mockQuotation],
        error: null,
      });

      const mockSelect = vi.fn().mockReturnValue({
        order: mockOrder,
      });

      vi.mocked(supabase.from).mockImplementation(() => ({
        select: mockSelect,
        delete: mockDelete,
      } as any));

      const { result } = renderHook(() => useQuotations());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.deleteQuotationSystem('system-1');

      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', 'system-1');
    });
  });

  describe('Quotation Items Operations', () => {
    it('should add quotation item successfully', async () => {
      const newItem: Omit<DbQuotationItem, 'id' | 'created_at' | 'updated_at'> = {
        quotation_system_id: 'system-1',
        component_id: 'comp-2',
        item_name: 'Banner Sensor',
        manufacturer: 'Banner',
        manufacturer_part_number: 'Q45BB6AF300',
        quantity: 4,
        unit_cost: 150,
        total_cost: 600,
        margin_percentage: 25,
        unit_price: 187.5,
        total_price: 750,
        original_currency: 'USD',
        original_cost: 150,
        notes: null,
        sort_order: 1,
      };

      const mockSingle = vi.fn().mockResolvedValue({
        data: { ...newItem, id: 'item-2' },
        error: null,
      });

      const mockInsertSelect = vi.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: mockInsertSelect,
      });

      const mockOrder = vi.fn().mockResolvedValue({
        data: [mockQuotation],
        error: null,
      });

      const mockSelect = vi.fn().mockReturnValue({
        order: mockOrder,
      });

      vi.mocked(supabase.from).mockImplementation(() => ({
        select: mockSelect,
        insert: mockInsert,
      } as any));

      const { result } = renderHook(() => useQuotations());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.addQuotationItem(newItem);

      expect(mockInsert).toHaveBeenCalled();
    });

    it('should update quotation item successfully', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: { ...mockQuotationItem, quantity: 3 },
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

      const mockOrder = vi.fn().mockResolvedValue({
        data: [mockQuotation],
        error: null,
      });

      const mockSelect = vi.fn().mockReturnValue({
        order: mockOrder,
      });

      vi.mocked(supabase.from).mockImplementation(() => ({
        select: mockSelect,
        update: mockUpdate,
      } as any));

      const { result } = renderHook(() => useQuotations());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.updateQuotationItem('item-1', { quantity: 3 });

      expect(mockUpdate).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', 'item-1');
    });

    it('should delete quotation item successfully', async () => {
      const mockEq = vi.fn().mockResolvedValue({
        error: null,
      });

      const mockDelete = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      const mockOrder = vi.fn().mockResolvedValue({
        data: [mockQuotation],
        error: null,
      });

      const mockSelect = vi.fn().mockReturnValue({
        order: mockOrder,
      });

      vi.mocked(supabase.from).mockImplementation(() => ({
        select: mockSelect,
        delete: mockDelete,
      } as any));

      const { result } = renderHook(() => useQuotations());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.deleteQuotationItem('item-1');

      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', 'item-1');
    });
  });

  describe('Currency Preservation', () => {
    it('should preserve original currency in quotation items', async () => {
      const quotationWithCurrency = {
        ...mockQuotation,
        quotation_systems: [
          {
            ...mockQuotationSystem,
            quotation_items: [
              {
                ...mockQuotationItem,
                original_currency: 'USD',
                original_cost: 2500,
              },
            ],
          },
        ],
      };

      const mockOrder = vi.fn().mockResolvedValue({
        data: [quotationWithCurrency],
        error: null,
      });

      const mockSelect = vi.fn().mockReturnValue({
        order: mockOrder,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const { result } = renderHook(() => useQuotations());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const quotation = result.current.quotations[0];
      const item = quotation.quotation_systems[0].quotation_items[0];

      expect(item.original_currency).toBe('USD');
      expect(item.original_cost).toBe(2500);
    });
  });

  describe('Edge Cases', () => {
    it('should handle quotations without systems', async () => {
      const quotationWithoutSystems = {
        ...mockQuotation,
        quotation_systems: [],
      };

      const mockOrder = vi.fn().mockResolvedValue({
        data: [quotationWithoutSystems],
        error: null,
      });

      const mockSelect = vi.fn().mockReturnValue({
        order: mockOrder,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const { result } = renderHook(() => useQuotations());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.quotations[0].quotation_systems).toEqual([]);
    });

    it('should handle visibility change events', async () => {
      const mockOrder = vi.fn().mockResolvedValue({
        data: [mockQuotation],
        error: null,
      });

      const mockSelect = vi.fn().mockReturnValue({
        order: mockOrder,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      renderHook(() => useQuotations());

      // Simulate visibility change
      Object.defineProperty(document, 'visibilityState', {
        writable: true,
        value: 'visible',
      });

      const event = new Event('visibilitychange');
      document.dispatchEvent(event);

      // Wait for refetch
      await waitFor(() => {
        expect(mockSelect).toHaveBeenCalledTimes(2); // Initial + refetch
      });
    });

    it('should handle window focus events', async () => {
      const mockOrder = vi.fn().mockResolvedValue({
        data: [mockQuotation],
        error: null,
      });

      const mockSelect = vi.fn().mockReturnValue({
        order: mockOrder,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      renderHook(() => useQuotations());

      // Simulate window focus
      const event = new Event('focus');
      window.dispatchEvent(event);

      // Wait for refetch
      await waitFor(() => {
        expect(mockSelect).toHaveBeenCalledTimes(2); // Initial + refetch
      });
    });
  });
});
