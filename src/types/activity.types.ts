// Activity Logging Types
// Comprehensive type definitions for the activity logging system

export type EntityType = 'quotation' | 'component' | 'project';

export type ActionType =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'status_changed'
  | 'items_added'
  | 'items_removed'
  | 'items_updated'
  | 'parameters_changed'
  | 'bulk_update'
  | 'bulk_import'
  | 'bulk_delete'
  | 'imported'
  | 'exported'
  | 'version_created';

// Hebrew action labels
export const ACTION_LABELS_HE: Record<ActionType, string> = {
  created: 'נוצר',
  updated: 'עודכן',
  deleted: 'נמחק',
  status_changed: 'שינוי סטטוס',
  items_added: 'פריטים נוספו',
  items_removed: 'פריטים הוסרו',
  items_updated: 'פריטים עודכנו',
  parameters_changed: 'שינוי פרמטרים',
  bulk_update: 'עדכון קבוצתי',
  bulk_import: 'ייבוא קבוצתי',
  bulk_delete: 'מחיקה קבוצתית',
  imported: 'יובא',
  exported: 'יוצא',
  version_created: 'גרסה חדשה',
};

// Hebrew entity type labels
export const ENTITY_LABELS_HE: Record<EntityType, string> = {
  quotation: 'הצעת מחיר',
  component: 'רכיב',
  project: 'פרויקט',
};

// Field change detail
export interface FieldChange {
  field: string; // Technical field name: "margin_percentage"
  label: string; // User-friendly label: "Markup"
  old: any; // Old value
  new: any; // New value
}

// Item change detail (for quotation items)
export interface ItemChange {
  name: string; // Item name
  quantity?: number; // Quantity added/removed/updated
  action?: 'added' | 'removed' | 'updated'; // Specific action
  [key: string]: any; // Additional properties
}

// Bulk change detail
export interface BulkChange {
  field: string; // Field that was changed
  value: any; // New value applied
  count: number; // Number of items affected
  description?: string; // Optional description
}

// Change details structure (JSONB in database)
export interface ChangeDetails {
  fields_changed?: FieldChange[]; // Field-level changes
  items_added?: ItemChange[]; // Items added to quotation
  items_removed?: ItemChange[]; // Items removed from quotation
  items_updated?: ItemChange[]; // Items updated in quotation
  parameters?: Record<string, { old: any; new: any }>; // Parameter changes
  bulk_changes?: BulkChange; // Bulk update details
  [key: string]: any; // Allow for extension
}

// Source metadata for imports
export interface SourceMetadata {
  parser?: string; // "excel", "pdf", "ai_vision"
  confidence?: number; // AI extraction confidence (0-1)
  extractionMethod?: string; // Specific extraction method used
  totalItems?: number; // Total items extracted
  [key: string]: any; // Additional metadata
}

// Activity log record (from database)
export interface ActivityLog {
  id: string;
  team_id: string;

  // Entity information
  entity_type: EntityType;
  entity_id: string;
  entity_name: string | null; // Quotation number, component name, project name

  // Action details
  action_type: ActionType;
  change_summary: string; // Human-readable summary
  change_details: ChangeDetails | null; // Detailed changes

  // Source tracking (for imports)
  source_file_name: string | null;
  source_file_type: string | null; // "excel", "pdf", "csv"
  source_metadata: SourceMetadata | null;

  // User tracking
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  user_avatar_url: string | null;

  // Timestamps
  created_at: string;
}

// Activity log filters (for querying)
export interface ActivityLogFilters {
  entityType?: EntityType | EntityType[]; // Filter by entity type
  entityId?: string; // Filter by specific entity
  actionType?: ActionType | ActionType[]; // Filter by action type
  userId?: string; // Filter by user
  startDate?: Date; // Filter by date range start
  endDate?: Date; // Filter by date range end
  search?: string; // Search in change_summary, entity_name, user_name
}

// Pagination options
export interface PaginationOptions {
  limit?: number; // Number of items per page (default: 50)
  offset?: number; // Offset for pagination
}

// Activity log query result
export interface ActivityLogQueryResult {
  logs: ActivityLog[];
  total: number;
  hasMore: boolean;
}

// Activity log creation params (for manual logging)
export interface CreateActivityLogParams {
  team_id: string;
  entity_type: EntityType;
  entity_id: string;
  entity_name: string;
  action_type: ActionType;
  change_summary: string;
  change_details?: ChangeDetails;
  source_file_name?: string;
  source_file_type?: string;
  source_metadata?: SourceMetadata;
}

// Helper type for formatted activity display
export interface FormattedActivity extends ActivityLog {
  // Additional computed fields for UI
  relativeTime: string; // "5 minutes ago"
  actionIcon: string; // Icon name for the action
  actionColor: string; // Color class for the action
  entityLink: string; // Link to the entity
  userInitials: string; // User initials for avatar
  userAvatarColor: string; // Avatar background color
}
