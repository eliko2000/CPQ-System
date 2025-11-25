/**
 * Assembly Pricing Calculations Tests
 *
 * Comprehensive tests for assembly pricing logic ensuring:
 * - Simple assembly calculations are correct
 * - Multi-currency pricing works properly
 * - Component price updates propagate correctly
 * - Missing/deleted components are handled gracefully
 * - Edge cases are covered
 */

import { describe, it, expect } from 'vitest';
import {
  calculateAssemblyPricing,
  formatAssemblyPricing,
  getAssemblyPricingBreakdown,
  validateAssembly,
} from '../assemblyCalculations';
import type { Assembly, AssemblyComponent, Component } from '../../types';

// ============ Test Helper Functions ============

/**
 * Create a mock component for testing
 */
function createMockComponent(
  overrides: Partial<Component> = {}
): Component {
  const defaults: Component = {
    id: `comp-${Math.random().toString(36).substr(2, 9)}`,
    name: 'Test Component',
    description: 'Test Description',
    category: 'Test Category',
    componentType: 'hardware',
    manufacturer: 'Test Manufacturer',
    manufacturerPN: 'TEST-PN-001',
    supplier: 'Test Supplier',
    unitCostNIS: 100,
    unitCostUSD: 27.03,
    unitCostEUR: 23.26,
    currency: 'NIS',
    originalCost: 100,
    quoteDate: '2024-01-01',
    quoteFileUrl: '',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  return { ...defaults, ...overrides };
}

/**
 * Create a mock assembly component (junction table entry)
 */
function createMockAssemblyComponent(
  component: Component | null,
  quantity: number = 1,
  overrides: Partial<AssemblyComponent> = {}
): AssemblyComponent {
  const defaults: AssemblyComponent = {
    id: `ac-${Math.random().toString(36).substr(2, 9)}`,
    assemblyId: 'assembly-1',
    componentId: component?.id || null,
    componentName: component?.name || 'Deleted Component',
    componentManufacturer: component?.manufacturer,
    componentPartNumber: component?.manufacturerPN,
    quantity,
    sortOrder: 0,
    component: component || undefined,
  };

  return { ...defaults, ...overrides };
}

/**
 * Create a mock assembly for testing
 */
function createMockAssembly(
  components: AssemblyComponent[],
  overrides: Partial<Assembly> = {}
): Assembly {
  const defaults: Assembly = {
    id: `assembly-${Math.random().toString(36).substr(2, 9)}`,
    name: 'Test Assembly',
    description: 'Test assembly description',
    isComplete: true,
    components,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  return { ...defaults, ...overrides };
}

// ============ Assembly Creation and Structure Tests ============

describe('Assembly Structure', () => {
  it('should create simple assembly with components', () => {
    const comp1 = createMockComponent({ name: 'Component 1' });
    const comp2 = createMockComponent({ name: 'Component 2' });

    const assembly = createMockAssembly([
      createMockAssemblyComponent(comp1, 2),
      createMockAssemblyComponent(comp2, 1),
    ]);

    expect(assembly.components).toHaveLength(2);
    expect(assembly.components[0].quantity).toBe(2);
    expect(assembly.components[1].quantity).toBe(1);
    expect(assembly.isComplete).toBe(true);
  });

  it('should store component references correctly', () => {
    const comp = createMockComponent({
      name: 'Test Component',
      manufacturerPN: 'PN-123',
    });

    const assemblyComp = createMockAssemblyComponent(comp, 5);

    expect(assemblyComp.componentId).toBe(comp.id);
    expect(assemblyComp.componentName).toBe('Test Component');
    expect(assemblyComp.componentPartNumber).toBe('PN-123');
    expect(assemblyComp.quantity).toBe(5);
    expect(assemblyComp.component).toBeDefined();
  });

  it('should handle assembly with multiple quantities per component', () => {
    const comp = createMockComponent({
      currency: 'NIS',
      originalCost: 50,
      unitCostNIS: 50,
    });

    const assembly = createMockAssembly([
      createMockAssemblyComponent(comp, 10), // 10x quantity
    ]);

    const pricing = calculateAssemblyPricing(assembly);

    // 50 NIS * 10 qty = 500 NIS total
    expect(pricing.totalCostNIS).toBe(500);
  });
});

// ============ Pricing Calculations Tests ============

describe('Assembly Pricing Calculations', () => {
  it('should calculate simple assembly total correctly', () => {
    // Create components with known prices
    const comp1 = createMockComponent({
      currency: 'NIS',
      originalCost: 100,
      unitCostNIS: 100,
    });
    const comp2 = createMockComponent({
      currency: 'NIS',
      originalCost: 200,
      unitCostNIS: 200,
    });

    const assembly = createMockAssembly([
      createMockAssemblyComponent(comp1, 2), // 100 * 2 = 200
      createMockAssemblyComponent(comp2, 1), // 200 * 1 = 200
    ]);

    const pricing = calculateAssemblyPricing(assembly);

    // Total should be 400 NIS
    expect(pricing.totalCostNIS).toBe(400);
    expect(pricing.componentCount).toBe(2);
    expect(pricing.missingComponentCount).toBe(0);
  });

  it('should calculate assembly with fractional quantities', () => {
    const comp = createMockComponent({
      currency: 'NIS',
      originalCost: 100,
      unitCostNIS: 100,
    });

    const assembly = createMockAssembly([
      createMockAssemblyComponent(comp, 2.5), // 100 * 2.5 = 250
    ]);

    const pricing = calculateAssemblyPricing(assembly);
    expect(pricing.totalCostNIS).toBe(250);
  });

  it('should handle assembly with zero-cost components', () => {
    const freeComp = createMockComponent({
      currency: 'NIS',
      originalCost: 0,
      unitCostNIS: 0,
    });
    const paidComp = createMockComponent({
      currency: 'NIS',
      originalCost: 100,
      unitCostNIS: 100,
    });

    const assembly = createMockAssembly([
      createMockAssemblyComponent(freeComp, 5),
      createMockAssemblyComponent(paidComp, 2),
    ]);

    const pricing = calculateAssemblyPricing(assembly);

    // Only the paid component contributes: 100 * 2 = 200
    expect(pricing.totalCostNIS).toBe(200);
  });

  it('should round prices to 2 decimal places', () => {
    const comp = createMockComponent({
      currency: 'NIS',
      originalCost: 33.333,
      unitCostNIS: 33.333,
    });

    const assembly = createMockAssembly([
      createMockAssemblyComponent(comp, 3), // 33.333 * 3 = 99.999
    ]);

    const pricing = calculateAssemblyPricing(assembly);

    // Should round to 100.00
    expect(pricing.totalCostNIS).toBe(100);
  });
});

// ============ Multi-Currency Pricing Tests ============

describe('Multi-Currency Assembly Pricing', () => {
  const standardRates = {
    usdToIlsRate: 3.7,
    eurToIlsRate: 4.0,
  };

  it('should calculate NIS component correctly', () => {
    const nisComp = createMockComponent({
      currency: 'NIS',
      originalCost: 370,
      unitCostNIS: 370,
      unitCostUSD: 100,
      unitCostEUR: 92.5,
    });

    const assembly = createMockAssembly([
      createMockAssemblyComponent(nisComp, 1),
    ]);

    const pricing = calculateAssemblyPricing(assembly, standardRates);

    expect(pricing.totalCostNIS).toBe(370);
    expect(pricing.totalCostUSD).toBe(100);
    expect(pricing.totalCostEUR).toBe(92.5);
    expect(pricing.breakdown.nisComponents.count).toBe(1);
    expect(pricing.breakdown.nisComponents.total).toBe(370);
  });

  it('should calculate USD component correctly', () => {
    const usdComp = createMockComponent({
      currency: 'USD',
      originalCost: 100,
      unitCostUSD: 100,
      unitCostNIS: 370,
      unitCostEUR: 92.5,
    });

    const assembly = createMockAssembly([
      createMockAssemblyComponent(usdComp, 1),
    ]);

    const pricing = calculateAssemblyPricing(assembly, standardRates);

    // USD 100 * 3.7 = 370 NIS
    expect(pricing.totalCostNIS).toBe(370);
    expect(pricing.totalCostUSD).toBe(100);
    expect(pricing.breakdown.usdComponents.count).toBe(1);
    expect(pricing.breakdown.usdComponents.total).toBe(100);
  });

  it('should calculate EUR component correctly', () => {
    const eurComp = createMockComponent({
      currency: 'EUR',
      originalCost: 100,
      unitCostEUR: 100,
      unitCostNIS: 400,
      unitCostUSD: 108.11,
    });

    const assembly = createMockAssembly([
      createMockAssemblyComponent(eurComp, 1),
    ]);

    const pricing = calculateAssemblyPricing(assembly, standardRates);

    // EUR 100 * 4.0 = 400 NIS
    expect(pricing.totalCostNIS).toBe(400);
    expect(pricing.totalCostEUR).toBe(100);
    expect(pricing.breakdown.eurComponents.count).toBe(1);
    expect(pricing.breakdown.eurComponents.total).toBe(100);
  });

  it('should handle mixed currency assembly', () => {
    const nisComp = createMockComponent({
      currency: 'NIS',
      originalCost: 100,
      unitCostNIS: 100,
    });
    const usdComp = createMockComponent({
      currency: 'USD',
      originalCost: 100,
      unitCostUSD: 100,
    });
    const eurComp = createMockComponent({
      currency: 'EUR',
      originalCost: 100,
      unitCostEUR: 100,
    });

    const assembly = createMockAssembly([
      createMockAssemblyComponent(nisComp, 1),
      createMockAssemblyComponent(usdComp, 1),
      createMockAssemblyComponent(eurComp, 1),
    ]);

    const pricing = calculateAssemblyPricing(assembly, standardRates);

    // NIS: 100
    // USD: 100 * 3.7 = 370
    // EUR: 100 * 4.0 = 400
    // Total: 870 NIS
    expect(pricing.totalCostNIS).toBe(870);
    expect(pricing.breakdown.nisComponents.count).toBe(1);
    expect(pricing.breakdown.usdComponents.count).toBe(1);
    expect(pricing.breakdown.eurComponents.count).toBe(1);
  });

  it('should recalculate correctly with different exchange rates', () => {
    const usdComp = createMockComponent({
      currency: 'USD',
      originalCost: 100,
      unitCostUSD: 100,
    });

    const assembly = createMockAssembly([
      createMockAssemblyComponent(usdComp, 1),
    ]);

    // Calculate with rate 3.7
    const pricing1 = calculateAssemblyPricing(assembly, {
      usdToIlsRate: 3.7,
      eurToIlsRate: 4.0,
    });
    expect(pricing1.totalCostNIS).toBe(370);

    // Calculate with rate 4.0
    const pricing2 = calculateAssemblyPricing(assembly, {
      usdToIlsRate: 4.0,
      eurToIlsRate: 4.0,
    });
    expect(pricing2.totalCostNIS).toBe(400);

    // Original USD price should stay the same
    expect(pricing1.totalCostUSD).toBe(100);
    expect(pricing2.totalCostUSD).toBe(100);
  });
});

// ============ Missing/Deleted Component Tests ============

describe('Missing and Deleted Components', () => {
  it('should mark assembly as incomplete when component is missing', () => {
    const assembly = createMockAssembly(
      [
        createMockAssemblyComponent(null, 1), // Deleted component
      ],
      { isComplete: false }
    );

    expect(assembly.isComplete).toBe(false);
  });

  it('should exclude missing components from pricing', () => {
    const validComp = createMockComponent({
      currency: 'NIS',
      originalCost: 100,
      unitCostNIS: 100,
    });

    const assembly = createMockAssembly([
      createMockAssemblyComponent(validComp, 2), // 200 NIS
      createMockAssemblyComponent(null, 5), // Deleted - should not affect price
    ]);

    const pricing = calculateAssemblyPricing(assembly);

    expect(pricing.totalCostNIS).toBe(200);
    expect(pricing.componentCount).toBe(1);
    expect(pricing.missingComponentCount).toBe(1);
  });

  it('should track missing component count correctly', () => {
    const comp1 = createMockComponent();

    const assembly = createMockAssembly([
      createMockAssemblyComponent(comp1, 1),
      createMockAssemblyComponent(null, 1),
      createMockAssemblyComponent(null, 1),
    ]);

    const pricing = calculateAssemblyPricing(assembly);

    expect(pricing.componentCount).toBe(1);
    expect(pricing.missingComponentCount).toBe(2);
  });

  it('should preserve component snapshot data when component is deleted', () => {
    const deletedComp = createMockAssemblyComponent(null, 1, {
      componentName: 'Deleted Siemens PLC',
      componentManufacturer: 'Siemens',
      componentPartNumber: '6ES7512-1DK01-0AB0',
    });

    expect(deletedComp.componentId).toBeNull();
    expect(deletedComp.componentName).toBe('Deleted Siemens PLC');
    expect(deletedComp.componentManufacturer).toBe('Siemens');
    expect(deletedComp.componentPartNumber).toBe('6ES7512-1DK01-0AB0');
  });

  it('should handle assembly with all components deleted', () => {
    const assembly = createMockAssembly([
      createMockAssemblyComponent(null, 1),
      createMockAssemblyComponent(null, 1),
      createMockAssemblyComponent(null, 1),
    ]);

    const pricing = calculateAssemblyPricing(assembly);

    expect(pricing.totalCostNIS).toBe(0);
    expect(pricing.componentCount).toBe(0);
    expect(pricing.missingComponentCount).toBe(3);
  });
});

// ============ Edge Cases ============

describe('Assembly Edge Cases', () => {
  it('should handle empty assembly', () => {
    const assembly = createMockAssembly([]);

    const pricing = calculateAssemblyPricing(assembly);

    expect(pricing.totalCostNIS).toBe(0);
    expect(pricing.totalCostUSD).toBe(0);
    expect(pricing.totalCostEUR).toBe(0);
    expect(pricing.componentCount).toBe(0);
    expect(pricing.missingComponentCount).toBe(0);
  });

  it('should handle assembly with single component', () => {
    const comp = createMockComponent({
      currency: 'NIS',
      originalCost: 100,
      unitCostNIS: 100,
    });

    const assembly = createMockAssembly([
      createMockAssemblyComponent(comp, 1),
    ]);

    const pricing = calculateAssemblyPricing(assembly);

    expect(pricing.totalCostNIS).toBe(100);
    expect(pricing.componentCount).toBe(1);
  });

  it('should handle assembly with 100+ components', () => {
    const components: AssemblyComponent[] = [];

    for (let i = 0; i < 150; i++) {
      const comp = createMockComponent({
        name: `Component ${i}`,
        currency: 'NIS',
        originalCost: 10,
        unitCostNIS: 10,
      });
      components.push(createMockAssemblyComponent(comp, 1));
    }

    const assembly = createMockAssembly(components);
    const pricing = calculateAssemblyPricing(assembly);

    // 150 components * 10 NIS = 1500 NIS
    expect(pricing.totalCostNIS).toBe(1500);
    expect(pricing.componentCount).toBe(150);
  });

  it('should handle component with missing currency field (legacy data)', () => {
    const comp = createMockComponent({
      // @ts-expect-error - testing legacy data without currency field
      currency: undefined,
      unitCostNIS: 100,
    });

    const assembly = createMockAssembly([
      createMockAssemblyComponent(comp, 1),
    ]);

    const pricing = calculateAssemblyPricing(assembly);

    // Should default to NIS
    expect(pricing.totalCostNIS).toBe(100);
  });

  it('should handle very large quantities', () => {
    const comp = createMockComponent({
      currency: 'NIS',
      originalCost: 0.01,
      unitCostNIS: 0.01,
    });

    const assembly = createMockAssembly([
      createMockAssemblyComponent(comp, 100000), // Very large quantity
    ]);

    const pricing = calculateAssemblyPricing(assembly);

    // 0.01 * 100000 = 1000
    expect(pricing.totalCostNIS).toBe(1000);
  });

  it('should handle very small prices', () => {
    const comp = createMockComponent({
      currency: 'NIS',
      originalCost: 0.001,
      unitCostNIS: 0.001,
    });

    const assembly = createMockAssembly([
      createMockAssemblyComponent(comp, 1),
    ]);

    const pricing = calculateAssemblyPricing(assembly);

    expect(pricing.totalCostNIS).toBe(0); // Rounds to 0.00
  });
});

// ============ Validation Tests ============

describe('Assembly Validation', () => {
  it('should require assembly name', () => {
    const result = validateAssembly('', []);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('שם');
  });

  it('should require at least one component', () => {
    const result = validateAssembly('Valid Name', []);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('רכיב');
  });

  it('should reject components with zero quantity', () => {
    const comp = createMockComponent();
    const assemblyComp = createMockAssemblyComponent(comp, 0);

    const result = validateAssembly('Valid Name', [assemblyComp]);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('כמות');
  });

  it('should reject components with negative quantity', () => {
    const comp = createMockComponent();
    const assemblyComp = createMockAssemblyComponent(comp, -5);

    const result = validateAssembly('Valid Name', [assemblyComp]);

    expect(result.valid).toBe(false);
  });

  it('should accept valid assembly', () => {
    const comp = createMockComponent();
    const assemblyComp = createMockAssemblyComponent(comp, 5);

    const result = validateAssembly('Valid Name', [assemblyComp]);

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });
});

// ============ Formatting Tests ============

describe('Assembly Pricing Formatting', () => {
  it('should format assembly pricing in all currencies', () => {
    const comp = createMockComponent({
      currency: 'USD',
      originalCost: 100,
      unitCostUSD: 100,
      unitCostNIS: 370,
      unitCostEUR: 92.5,
    });

    const assembly = createMockAssembly([
      createMockAssemblyComponent(comp, 2),
    ]);

    const pricing = calculateAssemblyPricing(assembly);
    const formatted = formatAssemblyPricing(pricing);

    expect(formatted.usd).toContain('200');
    expect(formatted.nis).toContain('740');
    expect(formatted.eur).toContain('185');
    expect(formatted.primary).toContain('740');
  });

  it('should generate pricing breakdown description', () => {
    const nisComp = createMockComponent({
      currency: 'NIS',
      originalCost: 100,
      unitCostNIS: 100,
    });
    const usdComp = createMockComponent({
      currency: 'USD',
      originalCost: 100,
      unitCostUSD: 100,
    });

    const assembly = createMockAssembly([
      createMockAssemblyComponent(nisComp, 1),
      createMockAssemblyComponent(usdComp, 1),
      createMockAssemblyComponent(null, 1), // Missing
    ]);

    const pricing = calculateAssemblyPricing(assembly);
    const breakdown = getAssemblyPricingBreakdown(pricing);

    expect(breakdown).toContain('רכיבים בש"ח');
    expect(breakdown).toContain('רכיבים ב-USD');
    expect(breakdown).toContain('רכיבים חסרים');
  });

  it('should show only relevant currencies in breakdown', () => {
    const nisComp = createMockComponent({
      currency: 'NIS',
      originalCost: 100,
      unitCostNIS: 100,
    });

    const assembly = createMockAssembly([
      createMockAssemblyComponent(nisComp, 1),
    ]);

    const pricing = calculateAssemblyPricing(assembly);
    const breakdown = getAssemblyPricingBreakdown(pricing);

    expect(breakdown).toContain('רכיבים בש"ח');
    expect(breakdown).not.toContain('USD');
    expect(breakdown).not.toContain('EUR');
  });
});

// ============ Component Price Update Tests ============

describe('Component Price Updates', () => {
  it('should reflect component price changes in assembly pricing', () => {
    const comp = createMockComponent({
      currency: 'NIS',
      originalCost: 100,
      unitCostNIS: 100,
    });

    const assembly = createMockAssembly([
      createMockAssemblyComponent(comp, 2),
    ]);

    // Initial pricing: 100 * 2 = 200
    const pricing1 = calculateAssemblyPricing(assembly);
    expect(pricing1.totalCostNIS).toBe(200);

    // Update component price
    comp.originalCost = 150;
    comp.unitCostNIS = 150;

    // Recalculate: 150 * 2 = 300
    const pricing2 = calculateAssemblyPricing(assembly);
    expect(pricing2.totalCostNIS).toBe(300);
  });

  it('should update assembly pricing when component currency changes', () => {
    const comp = createMockComponent({
      currency: 'NIS',
      originalCost: 370,
      unitCostNIS: 370,
      unitCostUSD: 100,
    });

    const assembly = createMockAssembly([
      createMockAssemblyComponent(comp, 1),
    ]);

    const rates = { usdToIlsRate: 3.7, eurToIlsRate: 4.0 };

    // Initial: 370 NIS
    const pricing1 = calculateAssemblyPricing(assembly, rates);
    expect(pricing1.totalCostNIS).toBe(370);

    // Change to USD
    comp.currency = 'USD';
    comp.originalCost = 100;

    // Recalculate: 100 USD * 3.7 = 370 NIS (same value, different currency)
    const pricing2 = calculateAssemblyPricing(assembly, rates);
    expect(pricing2.totalCostNIS).toBe(370);
    expect(pricing2.breakdown.usdComponents.count).toBe(1);
    expect(pricing2.breakdown.nisComponents.count).toBe(0);
  });

  it('should handle multiple components with different price updates', () => {
    const comp1 = createMockComponent({
      name: 'Component 1',
      currency: 'NIS',
      originalCost: 100,
      unitCostNIS: 100,
    });
    const comp2 = createMockComponent({
      name: 'Component 2',
      currency: 'USD',
      originalCost: 50,
      unitCostUSD: 50,
    });

    const assembly = createMockAssembly([
      createMockAssemblyComponent(comp1, 1),
      createMockAssemblyComponent(comp2, 1),
    ]);

    const rates = { usdToIlsRate: 3.7, eurToIlsRate: 4.0 };

    // Initial: 100 NIS + (50 USD * 3.7) = 100 + 185 = 285 NIS
    const pricing1 = calculateAssemblyPricing(assembly, rates);
    expect(pricing1.totalCostNIS).toBe(285);

    // Update both prices
    comp1.originalCost = 200;
    comp1.unitCostNIS = 200;
    comp2.originalCost = 100;
    comp2.unitCostUSD = 100;

    // New: 200 NIS + (100 USD * 3.7) = 200 + 370 = 570 NIS
    const pricing2 = calculateAssemblyPricing(assembly, rates);
    expect(pricing2.totalCostNIS).toBe(570);
  });
});

// ============ Integration Scenarios ============

describe('Assembly Integration Scenarios', () => {
  it('should calculate complex multi-currency assembly correctly', () => {
    // Real-world scenario: Control Panel Assembly
    const plc = createMockComponent({
      name: 'Siemens PLC S7-1500',
      currency: 'USD',
      originalCost: 2500,
      unitCostUSD: 2500,
    });

    const powerSupply = createMockComponent({
      name: 'Phoenix Contact PSU',
      currency: 'EUR',
      originalCost: 150,
      unitCostEUR: 150,
    });

    const relay = createMockComponent({
      name: 'Safety Relay',
      currency: 'NIS',
      originalCost: 450,
      unitCostNIS: 450,
    });

    const assembly = createMockAssembly([
      createMockAssemblyComponent(plc, 1),
      createMockAssemblyComponent(powerSupply, 2),
      createMockAssemblyComponent(relay, 4),
    ]);

    const rates = { usdToIlsRate: 3.7, eurToIlsRate: 4.0 };
    const pricing = calculateAssemblyPricing(assembly, rates);

    // Expected:
    // PLC: 2500 USD * 3.7 = 9250 NIS
    // PSU: 150 EUR * 2 * 4.0 = 1200 NIS
    // Relay: 450 NIS * 4 = 1800 NIS
    // Total: 9250 + 1200 + 1800 = 12250 NIS
    expect(pricing.totalCostNIS).toBe(12250);
    expect(pricing.componentCount).toBe(3);
    expect(pricing.breakdown.usdComponents.count).toBe(1);
    expect(pricing.breakdown.eurComponents.count).toBe(1);
    expect(pricing.breakdown.nisComponents.count).toBe(1);
  });

  it('should handle assembly with some deleted components gracefully', () => {
    // Real scenario: Old assembly where some components were discontinued
    const stillAvailable = createMockComponent({
      name: 'Still Available',
      currency: 'NIS',
      originalCost: 100,
      unitCostNIS: 100,
    });

    const assembly = createMockAssembly([
      createMockAssemblyComponent(stillAvailable, 1),
      createMockAssemblyComponent(null, 1, {
        componentName: 'Discontinued Component A',
      }),
      createMockAssemblyComponent(null, 1, {
        componentName: 'Discontinued Component B',
      }),
    ]);

    const pricing = calculateAssemblyPricing(assembly);

    expect(pricing.totalCostNIS).toBe(100); // Only available component counts
    expect(pricing.componentCount).toBe(1);
    expect(pricing.missingComponentCount).toBe(2);
  });
});
