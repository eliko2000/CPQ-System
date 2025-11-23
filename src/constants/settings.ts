/**
 * Settings Constants
 * Centralized constants for component categories and table configurations
 *
 * NOTE: These functions read from localStorage cache. Settings are persisted
 * to Supabase by the settingsService and cached locally for fast access.
 */

import { loadSetting } from '@/services/settingsService'
import { logger } from '@/lib/logger'

// ============ Component Categories ============

export const DEFAULT_COMPONENT_CATEGORIES = [
  'בקרים',
  'חיישנים',
  'אקטואטורים',
  'מנועים',
  'ספקי כוח',
  'תקשורת',
  'בטיחות',
  'מכני',
  'כבלים ומחברים',
  'אחר'
] as const;

// ============ Table Column Definitions ============

export interface TableColumnDefinition {
  id: string;
  label: string;
  field: string;
  defaultVisible: boolean;
}

export const COMPONENT_LIBRARY_COLUMNS: TableColumnDefinition[] = [
  { id: 'actions', label: 'פעולות', field: 'actions', defaultVisible: true },
  { id: 'manufacturerPN', label: 'מק"ט יצרן', field: 'manufacturerPN', defaultVisible: true },
  { id: 'name', label: 'שם רכיב', field: 'name', defaultVisible: true },
  { id: 'manufacturer', label: 'יצרן', field: 'manufacturer', defaultVisible: true },
  { id: 'supplier', label: 'ספק', field: 'supplier', defaultVisible: true },
  { id: 'category', label: 'קטגוריה', field: 'category', defaultVisible: true },
  { id: 'componentType', label: 'סוג', field: 'componentType', defaultVisible: true },
  { id: 'unitCostNIS', label: 'מחיר בש"ח', field: 'unitCostNIS', defaultVisible: true },
  { id: 'unitCostUSD', label: 'מחיר בדולר', field: 'unitCostUSD', defaultVisible: true },
  { id: 'unitCostEUR', label: 'מחיר באירו', field: 'unitCostEUR', defaultVisible: false },
  { id: 'currency', label: 'מטבע', field: 'currency', defaultVisible: false },
  { id: 'quoteDate', label: 'תאריך הצעה', field: 'quoteDate', defaultVisible: true },
  { id: 'description', label: 'תיאור', field: 'description', defaultVisible: false },
  { id: 'notes', label: 'הערות', field: 'notes', defaultVisible: false },
];

// BOM grid columns are defined in REVERSE order to match the AG Grid RTL display
// Actual display order will be: id, itemType, description, ... totalPrice, actions
export const BOM_GRID_COLUMNS: TableColumnDefinition[] = [
  { id: 'actions', label: 'פעולות', field: 'actions', defaultVisible: true },
  { id: 'totalPrice', label: 'מחיר כולל', field: 'totalPrice', defaultVisible: true },
  { id: 'totalCost', label: 'עלות כוללת', field: 'totalCost', defaultVisible: true },
  { id: 'margin', label: 'מרווח %', field: 'margin', defaultVisible: true },
  { id: 'customerPrice', label: 'מחיר ללקוח', field: 'customerPrice', defaultVisible: true },
  { id: 'unitCost', label: 'מחיר יחידה', field: 'unitCost', defaultVisible: true },
  { id: 'quantity', label: 'כמות', field: 'quantity', defaultVisible: true },
  { id: 'supplier', label: 'ספק', field: 'supplier', defaultVisible: true },
  { id: 'manufacturerPn', label: 'מק"ט יצרן', field: 'manufacturerPn', defaultVisible: true },
  { id: 'manufacturer', label: 'יצרן', field: 'manufacturer', defaultVisible: true },
  { id: 'description', label: 'תיאור', field: 'description', defaultVisible: true },
  { id: 'itemType', label: 'סוג', field: 'itemType', defaultVisible: true },
  { id: 'id', label: 'סמן', field: 'id', defaultVisible: true },
];

export const QUOTATION_DATA_GRID_COLUMNS: TableColumnDefinition[] = [
  { id: 'actions', label: 'פעולות', field: 'actions', defaultVisible: true },
  { id: 'customer_name', label: 'לקוח', field: 'customer_name', defaultVisible: true },
  { id: 'project_name', label: 'שם פרויקט', field: 'project_name', defaultVisible: true },
  { id: 'version', label: 'גרסה', field: 'version', defaultVisible: true },
  { id: 'status', label: 'סטטוס', field: 'status', defaultVisible: true },
  { id: 'displayTotalPrice', label: 'מחיר סופי', field: 'displayTotalPrice', defaultVisible: true },
  { id: 'created_at', label: 'תאריך יצירה', field: 'created_at', defaultVisible: true },
  { id: 'updated_at', label: 'תאריך עדכון', field: 'updated_at', defaultVisible: false },
];

export const QUOTATION_EDITOR_COLUMNS: TableColumnDefinition[] = [
  { id: 'actions', label: 'פעולות', field: 'actions', defaultVisible: true },
  { id: 'displayNumber', label: 'מס"ד', field: 'displayNumber', defaultVisible: true },
  { id: 'componentName', label: 'שם פריט', field: 'componentName', defaultVisible: true },
  { id: 'quantity', label: 'כמות', field: 'quantity', defaultVisible: true },
  { id: 'unitPriceILS', label: 'מחיר יחידה', field: 'unitPriceILS', defaultVisible: true },
  { id: 'totalPriceUSD', label: 'מחיר נטו דולר', field: 'totalPriceUSD', defaultVisible: true },
  { id: 'totalPriceILS', label: 'מחיר נטו שקלים', field: 'totalPriceILS', defaultVisible: true },
  { id: 'customerPriceILS', label: 'מחיר ללקוח', field: 'customerPriceILS', defaultVisible: true },
];

export const PROJECTS_LIST_COLUMNS: TableColumnDefinition[] = [
  { id: 'projectName', label: 'שם פרויקט', field: 'projectName', defaultVisible: true },
  { id: 'companyName', label: 'שם חברה', field: 'companyName', defaultVisible: true },
  { id: 'status', label: 'סטטוס', field: 'status', defaultVisible: true },
  { id: 'quotationCount', label: 'מספר הצעות מחיר', field: 'quotationCount', defaultVisible: true },
  { id: 'createdAt', label: 'תאריך יצירה', field: 'createdAt', defaultVisible: true },
  { id: 'actions', label: 'פעולות', field: 'actions', defaultVisible: true },
];

// ============ Table Type Definition ============

export type TableType = 'component_library' | 'bom_grid' | 'quotation_data_grid' | 'quotation_editor' | 'projects_list';

export const TABLE_COLUMN_DEFINITIONS: Record<TableType, TableColumnDefinition[]> = {
  component_library: COMPONENT_LIBRARY_COLUMNS,
  bom_grid: BOM_GRID_COLUMNS,
  quotation_data_grid: QUOTATION_DATA_GRID_COLUMNS,
  quotation_editor: QUOTATION_EDITOR_COLUMNS,
  projects_list: PROJECTS_LIST_COLUMNS,
};

// ============ Helper Functions ============

/**
 * Event to notify components when categories change
 */
export const CATEGORIES_UPDATED_EVENT = 'cpq-categories-updated';

/**
 * Dispatch event to notify all components that categories have been updated
 */
export function notifyCategoriesUpdated(): void {
  window.dispatchEvent(new CustomEvent(CATEGORIES_UPDATED_EVENT));
}

/**
 * Get component categories from cache (synced with Supabase)
 * Reads from localStorage cache for fast synchronous access
 */
export function getComponentCategories(): string[] {
  try {
    // Try new cache format first
    const cache = localStorage.getItem('cpq-settings-cache');
    if (cache) {
      const parsed = JSON.parse(cache);
      if (parsed.componentCategories?.categories && Array.isArray(parsed.componentCategories.categories)) {
        return parsed.componentCategories.categories;
      }
    }

    // Fallback to old format for backward compatibility
    const oldSettings = localStorage.getItem('cpq-settings');
    if (oldSettings) {
      const parsed = JSON.parse(oldSettings);
      if (parsed.componentCategories?.categories && Array.isArray(parsed.componentCategories.categories)) {
        return parsed.componentCategories.categories;
      }
    }
  } catch (error) {
    logger.error('Error loading component categories from cache:', error);
  }
  return [...DEFAULT_COMPONENT_CATEGORIES];
}

/**
 * Load component categories from Supabase asynchronously
 * Use this on app initialization to sync cache with database
 */
export async function loadComponentCategoriesFromSupabase(): Promise<string[]> {
  const result = await loadSetting<{ categories: string[] }>('componentCategories');
  if (result.success && result.data?.categories) {
    return result.data.categories;
  }
  return [...DEFAULT_COMPONENT_CATEGORIES];
}

/**
 * Get default visible columns for a table
 */
export function getDefaultVisibleColumns(tableType: TableType): string[] {
  const columns = TABLE_COLUMN_DEFINITIONS[tableType];

  // Guard against undefined columns (invalid table type)
  if (!columns) {
    logger.warn(`Invalid table type: "${tableType}". Returning empty array.`);
    return [];
  }

  return columns.filter(col => col.defaultVisible).map(col => col.id);
}

/**
 * Get table column configuration from cache (synced with Supabase)
 * Reads from localStorage cache for fast synchronous access
 */
export function getTableColumnSettings(tableType: TableType): string[] {
  try {
    // Guard against invalid table types
    if (!TABLE_COLUMN_DEFINITIONS[tableType]) {
      logger.warn(`Invalid table type: "${tableType}". Returning empty array.`);
      return [];
    }

    // Try new cache format first
    const cache = localStorage.getItem('cpq-settings-cache');
    if (cache) {
      const parsed = JSON.parse(cache);
      if (parsed.tableColumns && parsed.tableColumns[tableType]) {
        return parsed.tableColumns[tableType];
      }
    }

    // Fallback to old format for backward compatibility
    const oldSettings = localStorage.getItem('cpq-settings');
    if (oldSettings) {
      const parsed = JSON.parse(oldSettings);
      if (parsed.tableColumns && parsed.tableColumns[tableType]) {
        return parsed.tableColumns[tableType];
      }
    }
  } catch (error) {
    logger.error('Error loading table column settings from cache:', error);
  }
  return getDefaultVisibleColumns(tableType);
}
