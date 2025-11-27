import { describe, it, expect } from 'vitest';
import { convertDbQuotationToQuotationProject } from '../utils';
import { DbQuotation } from '../../types';

describe('convertDbQuotationToQuotationProject', () => {
  it('should preserve assemblyId when converting quotation items from database', () => {
    // Mock database quotation with an assembly item
    const mockDbQuotation: DbQuotation = {
      id: 'quotation-123',
      quotation_number: 'Q-2025-001',
      version: 1,
      customer_name: 'Test Customer',
      customer_email: undefined,
      project_id: undefined,
      project_name: 'Test Project',
      project_description: undefined,
      currency: 'ILS',
      exchange_rate: 3.7,
      eur_to_ils_rate: 4.0,
      margin_percentage: 25,
      status: 'draft',
      valid_until_date: undefined,
      terms: undefined,
      notes: undefined,
      total_cost: 0,
      total_price: 0,
      risk_percentage: 10,
      created_at: '2025-01-22T00:00:00Z',
      updated_at: '2025-01-22T00:00:00Z',
      quotation_systems: [
        {
          id: 'system-123',
          quotation_id: 'quotation-123',
          system_name: 'Test System',
          system_description: undefined,
          quantity: 1,
          sort_order: 1,
          created_at: '2025-01-22T00:00:00Z',
          updated_at: '2025-01-22T00:00:00Z',
          quotation_items: [
            {
              id: 'item-123',
              quotation_system_id: 'system-123',
              component_id: undefined,
              assembly_id: 'assembly-456', // Assembly item
              item_name: 'Test Assembly',
              manufacturer: '',
              manufacturer_part_number: '',
              item_type: 'hardware',
              labor_subtype: undefined,
              quantity: 1,
              unit_cost: 5000,
              total_cost: 5000,
              margin_percentage: 25,
              unit_price: 5000,
              total_price: 5000,
              notes: 'הרכבה',
              sort_order: 1,
              original_currency: 'NIS',
              original_cost: 5000,
              created_at: '2025-01-22T00:00:00Z',
              updated_at: '2025-01-22T00:00:00Z',
            },
            {
              id: 'item-456',
              quotation_system_id: 'system-123',
              component_id: 'component-789', // Regular component item
              assembly_id: undefined,
              item_name: 'Test Component',
              manufacturer: 'Test Mfg',
              manufacturer_part_number: 'TEST-123',
              item_type: 'hardware',
              labor_subtype: undefined,
              quantity: 2,
              unit_cost: 1000,
              total_cost: 2000,
              margin_percentage: 25,
              unit_price: 1000,
              total_price: 2000,
              notes: undefined,
              sort_order: 2,
              original_currency: 'USD',
              original_cost: 270.27,
              created_at: '2025-01-22T00:00:00Z',
              updated_at: '2025-01-22T00:00:00Z',
              component: {
                id: 'component-789',
                name: 'Test Component',
                manufacturer: 'Test Mfg',
                manufacturer_part_number: 'TEST-123',
                category: 'בקרים',
                description: undefined,
                unit_cost_usd: 270.27,
                unit_cost_ils: 1000,
                unit_cost_eur: undefined,
                currency: 'USD',
                original_cost: 270.27,
                supplier: 'Test Supplier',
                supplier_part_number: undefined,
                lead_time_days: undefined,
                min_order_quantity: undefined,
                notes: undefined,
                is_active: true,
                component_type: 'hardware',
                created_at: '2025-01-22T00:00:00Z',
                updated_at: '2025-01-22T00:00:00Z',
              },
            },
          ],
        },
      ],
    };

    const result = convertDbQuotationToQuotationProject(mockDbQuotation);

    // Verify the conversion created the correct number of items
    expect(result.items).toHaveLength(2);

    // Find the assembly item
    const assemblyItem = result.items.find(item => item.id === 'item-123');
    expect(assemblyItem).toBeDefined();

    // CRITICAL: Verify assemblyId is preserved
    expect(assemblyItem?.assemblyId).toBe('assembly-456');
    expect(assemblyItem?.componentName).toBe('Test Assembly');
    expect(assemblyItem?.componentId).toBeUndefined(); // Optional field not set

    // Find the regular component item
    const componentItem = result.items.find(item => item.id === 'item-456');
    expect(componentItem).toBeDefined();

    // Verify regular component has componentId but no assemblyId
    expect(componentItem?.componentId).toBe('component-789');
    expect(componentItem?.assemblyId).toBeUndefined(); // Optional field not set
    expect(componentItem?.componentName).toBe('Test Component');
  });

  it('should handle items without assembly_id or component_id', () => {
    const mockDbQuotation: DbQuotation = {
      id: 'quotation-123',
      quotation_number: 'Q-2025-001',
      version: 1,
      customer_name: 'Test Customer',
      customer_email: undefined,
      project_id: undefined,
      project_name: 'Test Project',
      project_description: undefined,
      currency: 'ILS',
      exchange_rate: 3.7,
      eur_to_ils_rate: 4.0,
      margin_percentage: 25,
      status: 'draft',
      valid_until_date: undefined,
      terms: undefined,
      notes: undefined,
      total_cost: 0,
      total_price: 0,
      risk_percentage: 10,
      created_at: '2025-01-22T00:00:00Z',
      updated_at: '2025-01-22T00:00:00Z',
      quotation_systems: [
        {
          id: 'system-123',
          quotation_id: 'quotation-123',
          system_name: 'Test System',
          system_description: undefined,
          quantity: 1,
          sort_order: 1,
          created_at: '2025-01-22T00:00:00Z',
          updated_at: '2025-01-22T00:00:00Z',
          quotation_items: [
            {
              id: 'item-123',
              quotation_system_id: 'system-123',
              component_id: undefined,
              assembly_id: undefined, // Custom item (no component, no assembly)
              item_name: 'Custom Labor Item',
              manufacturer: '',
              manufacturer_part_number: '',
              item_type: 'labor',
              labor_subtype: 'engineering',
              quantity: 5,
              unit_cost: 1000,
              total_cost: 5000,
              margin_percentage: 25,
              unit_price: 1000,
              total_price: 5000,
              notes: undefined,
              sort_order: 1,
              original_currency: 'NIS',
              original_cost: 1000,
              created_at: '2025-01-22T00:00:00Z',
              updated_at: '2025-01-22T00:00:00Z',
            },
          ],
        },
      ],
    };

    const result = convertDbQuotationToQuotationProject(mockDbQuotation);

    expect(result.items).toHaveLength(1);
    const item = result.items[0];

    // Custom items should have neither componentId nor assemblyId
    expect(item.componentId).toBeUndefined(); // Optional field not set
    expect(item.assemblyId).toBeUndefined(); // Optional field not set
    expect(item.itemType).toBe('labor');
    expect(item.laborSubtype).toBe('engineering');
  });
});
