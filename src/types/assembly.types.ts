// Assembly Types - Component assemblies and pricing calculations

import type { Component } from './component.types';

// ============ Assemblies (הרכבות) ============

/**
 * Assembly - A collection of components that form a complete unit
 * Total price is calculated dynamically from constituent components
 */
export interface Assembly {
  id: string;
  name: string;
  description?: string;
  isComplete: boolean; // False if any referenced components were deleted
  notes?: string;
  components: AssemblyComponent[]; // Linked components with quantities
  createdAt: string;
  updatedAt: string;
}

/**
 * Assembly Component - Junction table entry linking component to assembly
 * Stores snapshot data in case component is deleted
 */
export interface AssemblyComponent {
  id: string;
  assemblyId: string;
  componentId: string | null; // Null if component was deleted
  componentName: string; // Snapshot - preserved even if component deleted
  componentManufacturer?: string; // Snapshot for reference
  componentPartNumber?: string; // Snapshot for reference
  quantity: number;
  sortOrder: number;

  // Populated from joined component data (if component still exists)
  component?: Component;
}

/**
 * Database schema for assemblies table
 */
export interface DbAssembly {
  id: string;
  name: string;
  description?: string;
  is_complete: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Database schema for assembly_components table
 */
export interface DbAssemblyComponent {
  id: string;
  assembly_id: string;
  component_id: string | null;
  component_name: string;
  component_manufacturer?: string;
  component_part_number?: string;
  quantity: number;
  sort_order: number;
  created_at: string;
}

/**
 * Calculated pricing breakdown for an assembly
 * Respects each component's original currency
 */
export interface AssemblyPricing {
  totalCostNIS: number;
  totalCostUSD: number;
  totalCostEUR: number;
  componentCount: number;
  missingComponentCount: number; // Components that were deleted

  // Breakdown by currency (sum of components in their original currency)
  breakdown: {
    nisComponents: { count: number; total: number };
    usdComponents: { count: number; total: number };
    eurComponents: { count: number; total: number };
  };
}

/**
 * Assembly with calculated pricing (for display)
 */
export interface AssemblyWithPricing extends Assembly {
  pricing: AssemblyPricing;
}
