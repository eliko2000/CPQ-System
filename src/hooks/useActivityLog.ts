// useActivityLog Hook
// Manages activity log fetching, filtering, and real-time updates

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useTeam } from '../contexts/TeamContext';
import { logger } from '../lib/logger';
import { queryActivityLogs } from '../services/activityLogService';
import type {
  ActivityLog,
  ActivityLogFilters,
  FormattedActivity,
  EntityType,
  ActionType,
} from '../types/activity.types';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';

// ============================================================================
// Hook
// ============================================================================

export interface UseActivityLogOptions {
  filters?: ActivityLogFilters;
  initialLimit?: number;
  autoRefresh?: boolean; // Enable real-time updates
}

export function useActivityLog(options: UseActivityLogOptions = {}) {
  const { currentTeam } = useTeam();
  const { filters, initialLimit = 50, autoRefresh = false } = options;

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);

  // Fetch activity logs
  const fetchLogs = useCallback(
    async (loadMore = false) => {
      if (!currentTeam) {
        setLogs([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const currentOffset = loadMore ? offset : 0;
        const result = await queryActivityLogs(
          currentTeam.id,
          filters,
          initialLimit,
          currentOffset
        );

        if (loadMore) {
          setLogs(prev => [...prev, ...result.logs]);
        } else {
          setLogs(result.logs);
        }

        setTotal(result.total);
        setHasMore(result.hasMore);
        setOffset(currentOffset + result.logs.length);
      } catch (err) {
        logger.error('Failed to fetch activity logs:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch logs');
      } finally {
        setLoading(false);
      }
    },
    [currentTeam, filters, initialLimit, offset]
  );

  // Load more logs
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchLogs(true);
    }
  }, [loading, hasMore, fetchLogs]);

  // Reset and refetch
  const refetch = useCallback(() => {
    setOffset(0);
    fetchLogs(false);
  }, [fetchLogs]);

  // Initial fetch
  useEffect(() => {
    setOffset(0); // Reset offset when filters change
    fetchLogs(false);
  }, [currentTeam, filters]);

  // Real-time updates
  useEffect(() => {
    if (!autoRefresh || !currentTeam) return;

    const channel = supabase
      .channel('activity_logs_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs',
          filter: `team_id=eq.${currentTeam.id}`,
        },
        payload => {
          logger.info('New activity log received:', payload);
          // Add new log to the beginning
          setLogs(prev => [payload.new as ActivityLog, ...prev]);
          setTotal(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [autoRefresh, currentTeam]);

  // Format logs for display
  const formattedLogs = useMemo<FormattedActivity[]>(() => {
    return logs.map(log => formatActivityLog(log));
  }, [logs]);

  return {
    logs: formattedLogs,
    loading,
    error,
    hasMore,
    total,
    loadMore,
    refetch,
  };
}

// ============================================================================
// Formatting Helpers
// ============================================================================

/**
 * Format an activity log for display
 */
function formatActivityLog(log: ActivityLog): FormattedActivity {
  return {
    ...log,
    relativeTime: formatRelativeTime(log.created_at),
    actionIcon: getActionIcon(log.action_type),
    actionColor: getActionColor(log.action_type, log.entity_type),
    entityLink: getEntityLink(log.entity_type, log.entity_id),
    userInitials: getUserInitials(log.user_name, log.user_email),
    userAvatarColor: getAvatarColor(log.user_email || log.user_name || ''),
  };
}

/**
 * Format relative time in Hebrew
 */
function formatRelativeTime(timestamp: string): string {
  try {
    return formatDistanceToNow(new Date(timestamp), {
      addSuffix: true,
      locale: he,
    });
  } catch {
    return 'זמן לא ידוע';
  }
}

/**
 * Get icon name for action type
 */
function getActionIcon(actionType: ActionType): string {
  const iconMap: Record<ActionType, string> = {
    created: 'Plus',
    updated: 'Edit',
    deleted: 'Trash',
    status_changed: 'ArrowRight',
    items_added: 'Plus',
    items_removed: 'Minus',
    items_updated: 'Edit',
    parameters_changed: 'Settings',
    bulk_update: 'Layers',
    bulk_import: 'Upload',
    bulk_delete: 'Trash',
    imported: 'Upload',
    exported: 'Download',
    version_created: 'GitBranch',
  };

  return iconMap[actionType] || 'FileText';
}

/**
 * Get color class for action type
 */
function getActionColor(
  actionType: ActionType,
  entityType: EntityType
): string {
  // Status-based colors
  if (actionType === 'created') return 'text-green-600';
  if (actionType === 'deleted' || actionType === 'bulk_delete')
    return 'text-red-600';
  if (actionType === 'status_changed') return 'text-blue-600';
  if (actionType === 'imported' || actionType === 'bulk_import')
    return 'text-purple-600';
  if (actionType === 'bulk_update') return 'text-yellow-600';

  // Entity-based colors
  if (entityType === 'quotation') return 'text-blue-600';
  if (entityType === 'component') return 'text-orange-600';
  if (entityType === 'project') return 'text-indigo-600';

  return 'text-muted-foreground';
}

/**
 * Get link to entity
 */
function getEntityLink(entityType: EntityType, entityId: string): string {
  // These would be actual routes in your application
  if (entityType === 'quotation') {
    return `/quotations/${entityId}`;
  }
  if (entityType === 'component') {
    return `/components/${entityId}`;
  }
  if (entityType === 'project') {
    return `/projects/${entityId}`;
  }
  return '#';
}

/**
 * Get user initials from name or email
 */
function getUserInitials(name?: string | null, email?: string | null): string {
  if (name) {
    const parts = name.split(' ').filter(p => p.length > 0);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  if (email) {
    const localPart = email.split('@')[0];
    const nameParts = localPart.split(/[._-]/);
    if (nameParts.length >= 2) {
      return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
    }
    return localPart.slice(0, 2).toUpperCase();
  }

  return '?';
}

/**
 * Generate consistent avatar color from email/name
 */
function getAvatarColor(identifier: string): string {
  if (!identifier) return 'bg-gray-400';

  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-orange-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500',
    'bg-rose-500',
  ];

  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = (hash << 5) - hash + identifier.charCodeAt(i);
    hash = hash & hash;
  }

  return colors[Math.abs(hash) % colors.length];
}
