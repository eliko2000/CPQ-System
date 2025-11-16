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
  unitCostEUR?: number;
  currency: 'NIS' | 'USD' | 'EUR'; // מטבע המחיר המקורי
  originalCost: number; // המחיר המקורי במטבע המקורי
  quoteDate: string;
  quoteFileUrl: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ============ Projects (פרויקטים) ============
// Projects are organizational containers for quotations
// One project can have multiple quotation versions

export type ProjectStatus = 'active' | 'on-hold' | 'completed' | 'cancelled';

export interface ProjectMetadata {
  id: string;
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
  company_name: string;
  project_name: string;
  description?: string;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

// Form data for creating/editing projects
export interface ProjectFormData {
  companyName: string;
  projectName: string;
  description?: string;
  status: ProjectStatus;
}

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
  
  // Linked library component
  componentId?: string;
  componentName: string;
  componentCategory: string;
  isLabor: boolean; // True for labor items
  
  // Quantities and pricing
  quantity: number;
  unitPriceUSD: number;
  unitPriceILS: number;
  totalPriceUSD: number;
  totalPriceILS: number;
  
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
  
  // Risk
  riskPercent: number; // Applied to total project cost
  
  // Project info
  paymentTerms?: string;
  deliveryTime?: string;
  includeVAT: boolean;
  vatRate: number;
}

export interface QuotationCalculations {
  // Hardware vs Labor breakdown
  totalHardwareUSD: number;
  totalHardwareILS: number;
  totalLaborUSD: number;
  totalLaborILS: number;
  
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
  activeView: 'dashboard' | 'quotes' | 'quotations' | 'components' | 'projects' | 'analytics' | 'settings';
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
  unitCostEUR?: number;
  currency: 'NIS' | 'USD' | 'EUR';
  originalCost: number;
  quoteDate: string;
  notes?: string;
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

// ============ Database Schema Types ============
// These types match Supabase database schema

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
  item_name: string;
  manufacturer?: string;
  manufacturer_part_number?: string;
  quantity: number;
  unit_cost?: number;
  total_cost?: number;
  margin_percentage?: number;
  unit_price?: number;
  total_price?: number;
  notes?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  
  // Related data from joins
  component?: DbComponent;
}

export interface DbComponent {
  id: string;
  name: string;
  manufacturer?: string;
  manufacturer_part_number?: string;
  category?: string;
  description?: string;
  unit_cost_usd?: number;
  unit_cost_ils?: number;
  unit_cost_eur?: number;
  currency?: 'NIS' | 'USD' | 'EUR'; // Original currency the component was priced in
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

// ============ Supplier Quotes & Price History ============

/**
 * Supplier Quote - Tracks uploaded quote files and extraction metadata
 */
export interface SupplierQuote {
  id: string;

  // Basic quote information
  quoteNumber?: string;
  supplierName?: string;
  quoteDate?: string; // ISO date string

  // File information
  fileName: string;
  fileUrl: string;
  fileType?: 'excel' | 'pdf' | 'csv' | 'image';
  fileSizeKb?: number;

  // Processing status
  status: 'uploaded' | 'processing' | 'completed' | 'error';

  // Extraction metadata
  documentType?: 'excel' | 'pdf' | 'image' | 'unknown';
  extractionMethod?: 'native' | 'text' | 'structured' | 'ai_vision';
  confidenceScore?: number; // 0-1
  totalComponents: number;

  // Additional metadata (stores parsing details)
  metadata?: Record<string, any>;

  // Notes
  notes?: string;

  // Timestamps
  uploadDate: string; // ISO date string
  createdAt: string;
  updatedAt: string;
}

/**
 * Database schema for supplier_quotes table
 */
export interface DbSupplierQuote {
  id: string;
  quote_number?: string;
  supplier_name?: string;
  quote_date?: string;
  file_name: string;
  file_url: string;
  file_type?: string;
  file_size_kb?: number;
  status: string;
  document_type?: string;
  extraction_method?: string;
  confidence_score?: number;
  total_components: number;
  metadata?: any;
  notes?: string;
  upload_date: string;
  created_at: string;
  updated_at: string;
}

/**
 * Component Quote History - Tracks price history across multiple quotes
 */
export interface ComponentQuoteHistory {
  id: string;
  componentId: string;
  quoteId: string;

  // Price snapshot
  unitPriceNIS?: number;
  unitPriceUSD?: number;
  unitPriceEUR?: number;
  currency: 'NIS' | 'USD' | 'EUR';

  // Quote context
  quoteDate?: string; // ISO date string
  supplierName?: string;

  // Quality
  confidenceScore?: number; // 0-1

  // Status
  isCurrentPrice: boolean;

  // Timestamp
  createdAt: string;
}

/**
 * Database schema for component_quote_history table
 */
export interface DbComponentQuoteHistory {
  id: string;
  component_id: string;
  quote_id: string;
  unit_price_nis?: number;
  unit_price_usd?: number;
  unit_price_eur?: number;
  currency: string;
  quote_date?: string;
  supplier_name?: string;
  confidence_score?: number;
  is_current_price: boolean;
  created_at: string;
}

/**
 * Supplier Quote with aggregated data (for list views)
 */
export interface SupplierQuoteSummary extends SupplierQuote {
  actualComponentCount: number; // From component_quote_history
  avgConfidence?: number;
}

/**
 * Component with price history (for detail views)
 */
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

/**
 * Component Match Decision - User's choice for handling a matched component
 */
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

// ============ Legacy Types for compatibility ============

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

// ============ Document Parsing Metadata ============

/**
 * Metadata from Excel file parsing
 * Includes sheet information and detected column mappings
 */
export interface ExcelParseMetadata {
  sheetName: string;
  rowCount: number;
  columnHeaders: string[];
  detectedColumns: Record<string, number>;
  sheetsProcessed: number;
}

/**
 * Metadata from PDF file parsing
 * Includes page count and extraction method details
 */
export interface PDFParseMetadata {
  pageCount: number;
  textLength: number;
  extractionMethod: 'text' | 'structured';
  hasTabularData: boolean;
}
