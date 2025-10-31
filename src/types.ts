// Core Types for CPQ System - Redesigned for specific business needs

// ============ Components (רכיבים) ============
export interface Component {
  id: string;
  name: string;
  description?: string;
  category: string;
  productType?: string; // סוג מוצר כמו "שסתומים", "חיישנים", וכו'
  manufacturer: string;
  manufacturerPN: string;
  supplier: string;
  unitCostNIS: number;
  unitCostUSD?: number;
  currency: 'NIS' | 'USD' | 'EUR'; // מטבע המחיר המקורי
  originalCost: number; // המחיר המקורי במטבע המקורי
  quoteDate: string;
  quoteFileUrl: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ============ Projects (פרויקטים) ============
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
  currency: 'NIS' | 'USD';
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

// ============ Quote Processing ============
export interface QuoteDocument {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  uploadDate: string;
  status: 'uploaded' | 'processing' | 'completed' | 'error';
  extractedData?: ExtractedQuoteData;
  validatedComponents?: ValidatedComponent[];
  errors?: string[];
}

export interface ExtractedQuoteData {
  supplier: string;
  quoteDate: string;
  items: ExtractedItem[];
  confidence: number;
}

export interface ExtractedItem {
  name: string;
  description?: string;
  manufacturer?: string;
  manufacturerPN?: string;
  quantity?: number;
  unitPrice?: number;
  confidence: number;
}

export interface ValidatedComponent {
  extractedItem: ExtractedItem;
  status: 'approved' | 'modified' | 'rejected';
  componentData?: Partial<Component>;
  notes?: string;
}

// ============ UI State ============
export interface UIState {
  activeView: 'dashboard' | 'quotes' | 'components' | 'projects' | 'analytics';
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
  type: 'upload-quote' | 'add-component' | 'edit-component' | 'edit-project' | 'project-params' | null;
  data?: any;
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
  currency: 'NIS' | 'USD' | 'EUR';
  originalCost: number;
  quoteDate: string;
  notes?: string;
}

export interface ProjectFormData {
  name: string;
  customerName: string;
  description?: string;
}

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

// ============ Assemblies (אסמבלים) ============
export interface Assembly {
  id: string;
  name: string;
  description?: string;
  components: AssemblyComponent[];
  totalCost: number;
  totalPrice: number;
  margin: number;
  createdAt: string;
  updatedAt: string;
}

export interface AssemblyComponent {
  componentId: string;
  quantity: number;
  unitCost: number;
  unitPrice: number;
  totalCost: number;
  totalPrice: number;
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

// ============ Legacy Types for compatibility ============
export interface SupplierQuote {
  id: string;
  fileName: string;
  fileUrl: string;
  status: 'uploaded' | 'processing' | 'completed' | 'error';
  uploadDate: string;
  extractedData?: ExtractedQuoteData;
  validatedComponents?: ValidatedComponent[];
  errors?: string[];
}

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
