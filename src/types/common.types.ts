// Common Types - Shared utilities and UI state

// ============ Component & Labor Types ============
export type ComponentType = 'hardware' | 'software' | 'labor';
export type LaborSubtype =
  | 'engineering'
  | 'commissioning'
  | 'installation'
  | 'programming';

// ============ Currency Types ============
export type Currency = 'NIS' | 'USD' | 'EUR';

// ============ API Response Types ============
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ============ UI State ============
export interface UIState {
  activeView:
    | 'dashboard'
    | 'quotes'
    | 'quotations'
    | 'components'
    | 'projects'
    | 'analytics'
    | 'settings';
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark' | 'system';
  loading: {
    components: boolean;
    quotes: boolean;
    projects: boolean;
  };
  errors: string[];
}

export interface ModalState {
  type:
    | 'upload-quote'
    | 'add-component'
    | 'edit-component'
    | 'edit-project'
    | 'project-params'
    | null;
  data?: any;
}

// ============ Pricing Rules ============
export interface PricingRule {
  id: string;
  name: string;
  type: 'markup' | 'discount' | 'margin';
  value: number;
  valueType: 'percentage' | 'fixed';
  conditions?: PricingCondition[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PricingCondition {
  field: string;
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains';
  value: any;
}

// ============ Legacy BOM Types ============
export interface BOMLine {
  id: string;
  type: 'component' | 'custom';
  name: string;
  description?: string;
  quantity: number;
  unitCost: number;
  totalPrice: number;
  category?: string;
  manufacturer?: string;
  manufacturerPN?: string;
  supplier?: string;
  notes?: string;
}
