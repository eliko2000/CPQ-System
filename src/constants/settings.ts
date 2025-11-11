/**
 * Settings Constants
 * Centralized constants for component categories and table configurations
 *
 * NOTE: These functions read from localStorage cache. Settings are persisted
 * to Supabase by the settingsService and cached locally for fast access.
 */

import { loadSetting } from '@/services/settingsService'

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
  { id: 'unitCostNIS', label: 'מחיר בש"ח', field: 'unitCostNIS', defaultVisible: true },
  { id: 'unitCostUSD', label: 'מחיר בדולר', field: 'unitCostUSD', defaultVisible: true },
  { id: 'unitCostEUR', label: 'מחיר באירו', field: 'unitCostEUR', defaultVisible: false },
  { id: 'currency', label: 'מטבע', field: 'currency', defaultVisible: false },
  { id: 'quoteDate', label: 'תאריך הצעה', field: 'quoteDate', defaultVisible: true },
  { id: 'description', label: 'תיאור', field: 'description', defaultVisible: false },
  { id: 'notes', label: 'הערות', field: 'notes', defaultVisible: false },
];

export const BOM_GRID_COLUMNS: TableColumnDefinition[] = [
  { id: 'actions', label: 'פעולות', field: 'actions', defaultVisible: true },
  { id: 'number', label: 'מספר', field: 'number', defaultVisible: true },
  { id: 'name', label: 'שם פריט', field: 'name', defaultVisible: true },
  { id: 'type', label: 'סוג', field: 'type', defaultVisible: true },
  { id: 'manufacturer', label: 'יצרן', field: 'manufacturer', defaultVisible: true },
  { id: 'manufacturerPN', label: 'מק"ט יצרן', field: 'manufacturerPN', defaultVisible: true },
  { id: 'quantity', label: 'כמות', field: 'quantity', defaultVisible: true },
  { id: 'unitCost', label: 'מחיר יחידה', field: 'unitCost', defaultVisible: true },
  { id: 'totalCost', label: 'סה"כ', field: 'totalCost', defaultVisible: true },
  { id: 'notes', label: 'הערות', field: 'notes', defaultVisible: false },
];

export const QUOTATION_DATA_GRID_COLUMNS: TableColumnDefinition[] = [
  { id: 'actions', label: 'פעולות', field: 'actions', defaultVisible: true },
  { id: 'quotationNumber', label: 'מספר הצעה', field: 'quotationNumber', defaultVisible: true },
  { id: 'customerName', label: 'לקוח', field: 'customerName', defaultVisible: true },
  { id: 'projectName', label: 'שם פרויקט', field: 'projectName', defaultVisible: true },
  { id: 'status', label: 'סטטוס', field: 'status', defaultVisible: true },
  { id: 'totalPrice', label: 'סכום כולל', field: 'totalPrice', defaultVisible: true },
  { id: 'validUntil', label: 'תוקף עד', field: 'validUntil', defaultVisible: true },
  { id: 'createdAt', label: 'נוצר ב', field: 'createdAt', defaultVisible: true },
  { id: 'updatedAt', label: 'עודכן ב', field: 'updatedAt', defaultVisible: false },
];

// ============ Table Type Definition ============

export type TableType = 'component_library' | 'bom_grid' | 'quotation_data_grid';

export const TABLE_COLUMN_DEFINITIONS: Record<TableType, TableColumnDefinition[]> = {
  component_library: COMPONENT_LIBRARY_COLUMNS,
  bom_grid: BOM_GRID_COLUMNS,
  quotation_data_grid: QUOTATION_DATA_GRID_COLUMNS,
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
    console.error('Error loading component categories from cache:', error);
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
  return columns.filter(col => col.defaultVisible).map(col => col.id);
}

/**
 * Get table column configuration from cache (synced with Supabase)
 * Reads from localStorage cache for fast synchronous access
 */
export function getTableColumnSettings(tableType: TableType): string[] {
  try {
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
    console.error('Error loading table column settings from cache:', error);
  }
  return getDefaultVisibleColumns(tableType);
}
