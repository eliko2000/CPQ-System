// Component Types - Library component definitions and database schema

import type { ComponentType, LaborSubtype, Currency } from './common.types';

// ============ Components (רכיבים) ============
export interface Component {
  id: string;
  name: string;
  description?: string;
  category: string;
  componentType: ComponentType; // Hardware, Software, or Labor
  laborSubtype?: LaborSubtype; // For labor components: engineering, commissioning, installation, programming
  productType?: string; // סוג מוצר כמו "שסתומים", "חיישנים", וכו'
  manufacturer: string;
  manufacturerPN: string;
  supplier: string;
  unitCostNIS: number;
  unitCostUSD?: number;
  unitCostEUR?: number;
  currency: Currency; // מטבע המחיר המקורי
  originalCost: number; // המחיר המקורי במטבע המקורי
  quoteDate: string;
  quoteFileUrl: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ============ Database Schema Types ============
export interface DbComponent {
  id: string;
  name: string;
  manufacturer?: string;
  manufacturer_part_number?: string;
  category?: string;
  component_type: 'hardware' | 'software' | 'labor';
  labor_subtype?:
    | 'engineering'
    | 'commissioning'
    | 'installation'
    | 'programming';
  description?: string;
  unit_cost_usd?: number;
  unit_cost_ils?: number;
  unit_cost_eur?: number;
  currency?: Currency; // Original currency the component was priced in
  original_cost?: number; // Original cost in the original currency
  supplier?: string;
  supplier_part_number?: string;
  lead_time_days?: number;
  min_order_quantity?: number;
  notes?: string;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

// ============ Form Types ============
export interface ComponentFormData {
  name: string;
  description?: string;
  category: string;
  productType?: string;
  manufacturer: string;
  manufacturerPN: string;
  supplier: string;
  unitCostNIS: number;
  unitCostUSD?: number;
  unitCostEUR?: number;
  currency: Currency;
  originalCost: number;
  quoteDate: string;
  notes?: string;
}

// ============ Component with Price History ============
export interface ComponentWithHistory extends Component {
  priceHistory: Array<{
    quoteId: string;
    quoteNumber?: string;
    supplierName?: string;
    quoteDate?: string;
    unitPriceUSD?: number;
    unitPriceNIS?: number;
    currency: string;
    isCurrent: boolean;
  }>;
  quoteCount: number;
  minPriceUSD?: number;
  maxPriceUSD?: number;
  avgPriceUSD?: number;
}

// ============ Component Matching ============
export interface ComponentMatchDecision {
  componentIndex: number; // Index in the extracted components array
  matchType: 'exact' | 'fuzzy' | 'ai' | 'none';
  matches: Array<{
    component: Component;
    confidence: number;
    reasoning: string;
  }>;
  userDecision: 'pending' | 'accept_match' | 'create_new';
  selectedMatchId?: string; // If multiple matches, which component ID to use
}
