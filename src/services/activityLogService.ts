// Activity Log Service
// Handles all activity logging operations with detailed change tracking

import { supabase } from '../supabaseClient';
import { logger } from '../lib/logger';
import type {
  ActivityLog,
  ActivityLogFilters,
  ActivityLogQueryResult,
  CreateActivityLogParams,
  ChangeDetails,
  FieldChange,
  ItemChange,
} from '../types/activity.types';

// ============================================================================
// Core Logging Functions
// ============================================================================

/**
 * Create an activity log entry
 * This is the main function for logging activities
 */
export async function createActivityLog(
  params: CreateActivityLogParams
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('log_activity', {
      p_team_id: params.team_id,
      p_entity_type: params.entity_type,
      p_entity_id: params.entity_id,
      p_entity_name: params.entity_name,
      p_action_type: params.action_type,
      p_change_summary: params.change_summary,
      p_change_details: params.change_details || null,
      p_source_file_name: params.source_file_name || null,
      p_source_file_type: params.source_file_type || null,
      p_source_metadata: params.source_metadata || null,
    });

    if (error) {
      logger.error('Failed to create activity log:', error);
      return null;
    }

    return data as string;
  } catch (err) {
    logger.error('Error creating activity log:', err);
    return null;
  }
}

/**
 * Query activity logs with filters and pagination
 */
export async function queryActivityLogs(
  teamId: string,
  filters?: ActivityLogFilters,
  limit: number = 50,
  offset: number = 0
): Promise<ActivityLogQueryResult> {
  try {
    // Build query
    let query = supabase
      .from('activity_logs')
      .select('*', { count: 'exact' })
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.entityType) {
      if (Array.isArray(filters.entityType)) {
        query = query.in('entity_type', filters.entityType);
      } else {
        query = query.eq('entity_type', filters.entityType);
      }
    }

    if (filters?.entityId) {
      query = query.eq('entity_id', filters.entityId);
    }

    if (filters?.actionType) {
      if (Array.isArray(filters.actionType)) {
        query = query.in('action_type', filters.actionType);
      } else {
        query = query.eq('action_type', filters.actionType);
      }
    }

    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }

    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate.toISOString());
    }

    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate.toISOString());
    }

    // Search in change_summary, entity_name, user_name
    if (filters?.search) {
      query = query.or(
        `change_summary.ilike.%${filters.search}%,entity_name.ilike.%${filters.search}%,user_name.ilike.%${filters.search}%`
      );
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      logger.error('Failed to query activity logs:', error);
      return { logs: [], total: 0, hasMore: false };
    }

    const total = count || 0;
    const hasMore = offset + limit < total;

    return {
      logs: (data as ActivityLog[]) || [],
      total,
      hasMore,
    };
  } catch (err) {
    logger.error('Error querying activity logs:', err);
    return { logs: [], total: 0, hasMore: false };
  }
}

/**
 * Get activity logs for a specific entity
 */
export async function getEntityActivityLogs(
  teamId: string,
  entityType: string,
  entityId: string,
  limit: number = 50
): Promise<ActivityLog[]> {
  const result = await queryActivityLogs(
    teamId,
    { entityType: entityType as any, entityId },
    limit
  );
  return result.logs;
}

// ============================================================================
// Helper Functions for Change Details
// ============================================================================

/**
 * Build change details for field changes
 * Example: Changed Markup from 25% to 30%
 */
export function buildFieldChanges(
  changes: Array<{ field: string; label: string; oldValue: any; newValue: any }>
): ChangeDetails {
  const fields_changed: FieldChange[] = changes.map(change => ({
    field: change.field,
    label: change.label,
    old: change.oldValue,
    new: change.newValue,
  }));

  return { fields_changed };
}

/**
 * Build change details for items added
 * Example: Added 3 items to System 1
 */
export function buildItemsAdded(items: ItemChange[]): ChangeDetails {
  return { items_added: items };
}

/**
 * Build change details for items removed
 */
export function buildItemsRemoved(items: ItemChange[]): ChangeDetails {
  return { items_removed: items };
}

/**
 * Build change details for bulk updates
 * Example: Set all suppliers to "Acme Corp" (47 components)
 */
export function buildBulkChange(
  field: string,
  value: any,
  count: number,
  description?: string
): ChangeDetails {
  return {
    bulk_changes: {
      field,
      value,
      count,
      description,
    },
  };
}

// ============================================================================
// Specialized Logging Functions
// ============================================================================

/**
 * Log quotation items added
 */
export async function logQuotationItemsAdded(
  teamId: string,
  quotationId: string,
  quotationNumber: string,
  items: Array<{ name: string; quantity: number }>,
  systemName?: string
): Promise<void> {
  const itemCount = items.length;
  const summary = systemName
    ? `${itemCount} פריטים נוספו ל${systemName}`
    : `${itemCount} פריטים נוספו`;

  await createActivityLog({
    team_id: teamId,
    entity_type: 'quotation',
    entity_id: quotationId,
    entity_name: quotationNumber,
    action_type: 'items_added',
    change_summary: summary,
    change_details: buildItemsAdded(
      items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        action: 'added' as const,
      }))
    ),
  });
}

/**
 * Log quotation items removed
 */
export async function logQuotationItemsRemoved(
  teamId: string,
  quotationId: string,
  quotationNumber: string,
  items: Array<{ name: string; quantity: number }>,
  systemName?: string
): Promise<void> {
  const itemCount = items.length;
  const summary = systemName
    ? `${itemCount} פריטים הוסרו מ${systemName}`
    : `${itemCount} פריטים הוסרו`;

  await createActivityLog({
    team_id: teamId,
    entity_type: 'quotation',
    entity_id: quotationId,
    entity_name: quotationNumber,
    action_type: 'items_removed',
    change_summary: summary,
    change_details: buildItemsRemoved(
      items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        action: 'removed' as const,
      }))
    ),
  });
}

/**
 * Log quotation parameters changed
 */
export async function logQuotationParametersChanged(
  teamId: string,
  quotationId: string,
  quotationNumber: string,
  changes: Array<{ field: string; label: string; oldValue: any; newValue: any }>
): Promise<void> {
  const changeLabels = changes.map(c => c.label).join(', ');
  const summary = `שינוי פרמטרים: ${changeLabels}`;

  await createActivityLog({
    team_id: teamId,
    entity_type: 'quotation',
    entity_id: quotationId,
    entity_name: quotationNumber,
    action_type: 'parameters_changed',
    change_summary: summary,
    change_details: buildFieldChanges(changes),
  });
}

/**
 * Log component import from file
 */
export async function logComponentImport(
  teamId: string,
  componentId: string,
  componentName: string,
  fileName: string,
  fileType: string,
  metadata?: {
    parser?: string;
    confidence?: number;
    extractionMethod?: string;
  }
): Promise<void> {
  await createActivityLog({
    team_id: teamId,
    entity_type: 'component',
    entity_id: componentId,
    entity_name: componentName,
    action_type: 'imported',
    change_summary: `יובא מקובץ ${fileName}`,
    source_file_name: fileName,
    source_file_type: fileType,
    source_metadata: metadata,
  });
}

/**
 * Log bulk component import
 */
export async function logComponentBulkImport(
  teamId: string,
  count: number,
  fileName: string,
  fileType: string,
  metadata?: {
    parser?: string;
    confidence?: number;
    extractionMethod?: string;
  }
): Promise<void> {
  const summary = `ייבוא קבוצתי של ${count} רכיבים מקובץ ${fileName}`;

  await createActivityLog({
    team_id: teamId,
    entity_type: 'component',
    entity_id: '00000000-0000-0000-0000-000000000000', // Placeholder for bulk ops
    entity_name: `ייבוא קבוצתי (${count} רכיבים)`,
    action_type: 'bulk_import',
    change_summary: summary,
    source_file_name: fileName,
    source_file_type: fileType,
    source_metadata: { ...metadata, totalItems: count },
    change_details: buildBulkChange('import', fileName, count, 'ייבוא קבוצתי'),
  });
}

/**
 * Log bulk component update
 */
export async function logComponentBulkUpdate(
  teamId: string,
  field: string,
  fieldLabel: string,
  value: any,
  count: number
): Promise<void> {
  const summary = `עדכון קבוצתי: הוגדר ${fieldLabel} ל-"${value}" עבור ${count} רכיבים`;

  await createActivityLog({
    team_id: teamId,
    entity_type: 'component',
    entity_id: '00000000-0000-0000-0000-000000000000', // Placeholder for bulk ops
    entity_name: `עדכון קבוצתי (${count} רכיבים)`,
    action_type: 'bulk_update',
    change_summary: summary,
    change_details: buildBulkChange(field, value, count, fieldLabel),
  });
}

/**
 * Log bulk component delete
 */
export async function logComponentBulkDelete(
  teamId: string,
  count: number,
  componentNames?: string[]
): Promise<void> {
  const summary = `נמחקו ${count} רכיבים בקבוצה`;

  await createActivityLog({
    team_id: teamId,
    entity_type: 'component',
    entity_id: '00000000-0000-0000-0000-000000000000', // Placeholder for bulk ops
    entity_name: `מחיקה קבוצתית (${count} רכיבים)`,
    action_type: 'bulk_delete',
    change_summary: summary,
    change_details: componentNames
      ? buildItemsRemoved(
          componentNames.map(name => ({
            name,
            action: 'removed' as const,
          }))
        )
      : buildBulkChange('delete', 'bulk', count, 'מחיקה קבוצתית'),
  });
}

/**
 * Log quotation version created
 */
export async function logQuotationVersionCreated(
  teamId: string,
  quotationId: string,
  quotationNumber: string,
  newVersion: number
): Promise<void> {
  const summary = `נוצרה גרסה ${newVersion}`;

  await createActivityLog({
    team_id: teamId,
    entity_type: 'quotation',
    entity_id: quotationId,
    entity_name: quotationNumber,
    action_type: 'version_created',
    change_summary: summary,
  });
}
