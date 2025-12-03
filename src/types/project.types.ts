// Project Types - Project metadata and legacy project structures

import type { Currency } from './common.types';

// ============ Projects (פרויקטים) ============
// Projects are organizational containers for quotations
// One project can have multiple quotation versions

export type ProjectStatus = 'active' | 'on-hold' | 'completed' | 'cancelled';

export interface ProjectMetadata {
  id: string;
  projectNumber?: string; // Custom project number (e.g., PRJ-0001)
  companyName: string;
  projectName: string;
  description?: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}

// Project with quotation count (used in list views)
export interface ProjectSummary extends ProjectMetadata {
  quotationCount: number;
  lastQuotationUpdate?: string;
}

// Database schema type for projects
export interface DbProject {
  id: string;
  project_number?: string;
  company_name: string;
  project_name: string;
  description?: string;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
  team_id?: string;
}

// Form data for creating/editing projects
export interface ProjectFormData {
  companyName: string;
  projectName: string;
  description?: string;
  status: ProjectStatus;
}

// ============ Legacy Project Types (for compatibility) ============
export interface Project {
  id: string;
  name: string;
  customerName: string;
  description?: string;
  status: 'draft' | 'sent' | 'won' | 'lost';
  createdAt: string;
  updatedAt: string;

  // פרמטרים גלובליים של הפרויקט
  parameters: ProjectParameters;

  // תתי-מערכות
  subProjects: SubProject[];

  // חישובים סופיים
  calculations: ProjectCalculations;
}

export interface SubProject {
  id: string;
  name: string;
  description?: string;
  items: SubProjectItem[];
  subtotalNIS: number;
  subtotalUSD: number;
  currency: Currency;
  exchangeRate: number;
}

export interface SubProjectItem {
  id: string;
  componentId?: string; // Reference to Component
  name: string; // For custom items
  quantity: number;
  unitPriceNIS: number;
  unitPriceUSD?: number;
  totalPriceNIS: number;
  totalPriceUSD?: number;
  notes?: string;
}

export interface ProjectParameters {
  // פרמטרים כלליים
  currency: 'NIS' | 'USD' | 'both';
  exchangeRate: number; // שער דולר לדולר אמריקאי
  markupType: 'percentage' | 'fixed';
  markupValue: number;

  // פרמטרים פיננסיים
  includeVAT: boolean;
  vatRate: number; // אחוז מע"מ (באחוז)
  paymentTerms: string;
  warranty: string;
  deliveryTime: string;

  // הנחות
  discountType: 'percentage' | 'fixed' | 'none';
  discountValue: number;

  // עלויות נוספות
  installationCost: number;
  trainingCost: number;
  shippingCost: number;
  contingencyPercent: number;
}

export interface ProjectCalculations {
  // סיכומים בשקל חול
  totalCostNIS: number;
  totalCostUSD: number;
  totalProfitNIS: number;
  totalProfitUSD: number;

  // סיכומים לאחר הנחות
  totalAfterDiscountNIS: number;
  totalAfterDiscountUSD: number;

  // הנחות
  totalDiscountNIS: number;
  totalDiscountUSD: number;

  // עלויות נוספות
  totalAdditionalCostsNIS: number;
  totalAdditionalCostsUSD: number;

  // עלויות כוללות
  totalQuoteNIS: number;
  totalQuoteUSD: number;

  // אחוז
  totalVATNIS: number;
  totalVATUSD: number;

  // סיכום סופי ללקוח
  finalTotalNIS: number;
  finalTotalUSD: number;

  // שולי רווח
  profitMarginPercent: number;
}

// ============ Project Parameters Form Data ============
export interface ProjectParametersFormData {
  currency: 'NIS' | 'USD' | 'both';
  exchangeRate: number;
  markupType: 'percentage' | 'fixed';
  markupValue: number;
  includeVAT: boolean;
  vatRate: number;
  paymentTerms: string;
  warranty: string;
  deliveryTime: string;
  discountType: 'percentage' | 'fixed' | 'none';
  discountValue: number;
  installationCost: number;
  trainingCost: number;
  shippingCost: number;
  contingencyPercent: number;
}
