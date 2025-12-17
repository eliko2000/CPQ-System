// Quotation Types - Quotation projects, items, systems, and calculations

import type { ComponentType, LaborSubtype, Currency } from './common.types';
import type { DbProject } from './project.types';
import type { DbComponent } from './component.types';

// ============ Quotation Projects (פרויקטי הצעות מחיר) ============
export interface QuotationProject {
  id: string;
  name: string;
  customerName: string;
  description?: string;
  projectId?: string; // Link to project
  projectName?: string; // Project name for display
  status: 'draft' | 'sent' | 'won' | 'lost';
  createdAt: string;
  updatedAt: string;

  // Systems for this quotation
  systems: QuotationSystem[];

  // Project-level parameters
  parameters: QuotationParameters;

  // All items in the quotation
  items: QuotationItem[];

  // Calculated totals
  calculations: QuotationCalculations;
}

export interface QuotationSystem {
  id: string;
  name: string;
  description?: string;
  order: number; // For display order
  quantity: number; // Number of systems (usually 1, but can be 2+)
  createdAt: string;
}

export interface QuotationItem {
  id: string;
  systemId: string;
  systemOrder: number; // System's order (1, 2, 3...)
  itemOrder: number; // Item's order within system (1, 2, 3...)
  displayNumber: string; // "1.1", "1.2", "2.1", etc.

  // Linked library component or assembly
  componentId?: string;
  componentName: string;
  componentCategory: string;
  itemType: ComponentType; // Hardware, Software, or Labor
  laborSubtype?: LaborSubtype; // For labor items: engineering, commissioning, installation, programming

  // Assembly tracking
  assemblyId?: string; // Link to assembly in library if this is an assembly line item

  // Custom item flag (for items created directly in quotation, not from library)
  isCustomItem?: boolean; // If true, componentId will be null/undefined

  // Quantities and pricing
  quantity: number;
  unitPriceUSD: number;
  unitPriceILS: number;
  unitPriceEUR?: number; // EUR pricing (optional)
  totalPriceUSD: number;
  totalPriceILS: number;

  // Original currency tracking (to preserve original price when rates change)
  originalCurrency?: Currency;
  originalCost?: number; // Price in original currency

  // MSRP pricing (for distributed components)
  msrpPrice?: number; // MSRP list price
  msrpCurrency?: Currency; // Currency of MSRP price
  useMsrpPricing?: boolean; // Toggle: true = use MSRP, false = use cost + margin

  // Markup
  itemMarkupPercent: number; // Default from project, can override

  // Calculated customer price
  customerPriceILS: number;

  // Metadata
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuotationParameters {
  // Exchange rates
  usdToIlsRate: number;
  eurToIlsRate: number;

  // Pricing
  markupPercent: number; // Default markup for all items
  dayWorkCost: number; // Cost per day for labor
  profitPercent: number; // Target profit percentage
  useMsrpPricing?: boolean; // Global toggle to use MSRP pricing for items that have it

  // Risk
  riskPercent: number; // Applied to total project cost

  // Project info
  paymentTerms?: string;
  deliveryTime?: string;
  includeVAT: boolean;
  vatRate: number;
}

export interface QuotationCalculations {
  // Type breakdown (HW/SW/Labor)
  totalHardwareUSD: number;
  totalHardwareILS: number;
  totalSoftwareUSD: number;
  totalSoftwareILS: number;
  totalLaborUSD: number;
  totalLaborILS: number;

  // Labor subtype breakdown
  totalEngineeringILS: number;
  totalCommissioningILS: number;
  totalInstallationILS: number;
  totalProgrammingILS: number;

  // Subtotals
  subtotalUSD: number;
  subtotalILS: number;

  // Customer price before risk
  totalCustomerPriceILS: number;

  // Risk addition
  riskAdditionILS: number;

  // Final totals
  totalQuoteILS: number;
  totalVATILS: number;
  finalTotalILS: number;

  // Profit calculations
  totalCostILS: number;
  totalProfitILS: number;
  profitMarginPercent: number;
}

// ============ Database Schema Types ============
export interface DbQuotation {
  id: string;
  quotation_number: string;
  version?: number;
  customer_name: string;
  customer_email?: string;
  project_name?: string;
  project_description?: string;
  project_id?: string; // Link to projects table
  currency: string;
  exchange_rate: number;
  eur_to_ils_rate?: number;
  margin_percentage: number;
  risk_percentage?: number;
  use_msrp_pricing?: boolean; // Global toggle for MSRP pricing
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  valid_until_date?: string;
  terms?: string;
  notes?: string;
  total_cost?: number;
  total_price?: number;
  created_at: string;
  updated_at: string;

  // Related data from joins
  quotation_systems?: DbQuotationSystem[];
  project?: DbProject; // Optional joined project data
}

export interface DbQuotationSystem {
  id: string;
  quotation_id: string;
  system_name: string;
  system_description?: string;
  quantity: number;
  unit_cost?: number;
  total_cost?: number;
  margin_percentage?: number;
  unit_price?: number;
  total_price?: number;
  sort_order: number;
  created_at: string;
  updated_at: string;

  // Related data from joins
  quotation_items?: DbQuotationItem[];
}

export interface DbQuotationItem {
  id: string;
  quotation_system_id: string;
  component_id?: string;
  assembly_id?: string; // Link to assembly if this item represents an assembly
  is_custom_item?: boolean; // Custom items created directly in quotation (not from library)
  item_name: string;
  manufacturer?: string;
  manufacturer_part_number?: string;
  item_type: 'hardware' | 'software' | 'labor';
  labor_subtype?:
    | 'engineering'
    | 'commissioning'
    | 'installation'
    | 'programming';
  quantity: number;
  unit_cost?: number;
  total_cost?: number;
  margin_percentage?: number;
  unit_price?: number;
  total_price?: number;
  notes?: string;
  sort_order: number;
  // Currency tracking for proper exchange rate handling
  original_currency?: Currency;
  original_cost?: number;
  // MSRP pricing (for distributed components)
  msrp_price?: number;
  msrp_currency?: Currency;
  partner_discount_percent?: number;
  created_at: string;
  updated_at: string;

  // Related data from joins
  component?: DbComponent;
}
