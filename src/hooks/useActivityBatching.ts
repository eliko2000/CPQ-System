/**
 * Hook for batching activity log entries
 *
 * Consolidates rapid sequential actions into a single log entry
 * Example: Adding 5 items quickly → "Added 5 items" (not 5 separate logs)
 */

import { useRef, useCallback } from 'react';
import { logger } from '@/lib/logger';

interface BatchedItem {
  name: string;
  quantity: number;
}

interface BatchedItemAddition {
  teamId: string;
  quotationId: string;
  quotationName: string;
  systemName?: string;
  items: BatchedItem[];
}

interface ParameterChange {
  field: string;
  label: string;
  oldValue: any;
  newValue: any;
}

interface BatchedParameterChanges {
  teamId: string;
  quotationId: string;
  quotationName: string;
  changes: Map<string, ParameterChange>; // Map by field name to track latest change
}

const BATCH_WINDOW_MS = 3000; // 3 seconds to consolidate actions

export function useItemAdditionBatching(
  logFunction: (
    teamId: string,
    quotationId: string,
    quotationName: string,
    items: BatchedItem[],
    systemName?: string
  ) => Promise<void>
) {
  const batchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const batchDataRef = useRef<BatchedItemAddition | null>(null);

  const flushBatch = useCallback(async () => {
    if (batchDataRef.current && batchDataRef.current.items.length > 0) {
      const { teamId, quotationId, quotationName, systemName, items } =
        batchDataRef.current;

      logger.debug('[Activity Batching] Flushing item batch:', {
        itemCount: items.length,
        systemName,
      });

      await logFunction(teamId, quotationId, quotationName, items, systemName);
      batchDataRef.current = null;
    }
  }, [logFunction]);

  const addToBatch = useCallback(
    (
      teamId: string,
      quotationId: string,
      quotationName: string,
      item: BatchedItem,
      systemName?: string
    ) => {
      // Clear existing timer
      if (batchTimerRef.current) {
        clearTimeout(batchTimerRef.current);
      }

      // Initialize or update batch data
      if (!batchDataRef.current) {
        batchDataRef.current = {
          teamId,
          quotationId,
          quotationName,
          systemName,
          items: [],
        };
      }

      // Add item to batch
      batchDataRef.current.items.push(item);

      logger.debug('[Activity Batching] Added to item batch:', {
        item,
        totalItems: batchDataRef.current.items.length,
      });

      // Set timer to flush after batch window
      batchTimerRef.current = setTimeout(() => {
        flushBatch();
      }, BATCH_WINDOW_MS);
    },
    [flushBatch]
  );

  return { addToBatch, flushBatch };
}

export function useParameterChangeBatching(
  logFunction: (
    teamId: string,
    quotationId: string,
    quotationName: string,
    changes: ParameterChange[]
  ) => Promise<void>
) {
  const batchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const batchDataRef = useRef<BatchedParameterChanges | null>(null);

  const flushBatch = useCallback(async () => {
    if (batchDataRef.current && batchDataRef.current.changes.size > 0) {
      const { teamId, quotationId, quotationName, changes } =
        batchDataRef.current;

      const changeArray = Array.from(changes.values());

      logger.debug('[Activity Batching] Flushing parameter batch:', {
        changeCount: changeArray.length,
        fields: changeArray.map(c => c.field),
      });

      await logFunction(teamId, quotationId, quotationName, changeArray);
      batchDataRef.current = null;
    }
  }, [logFunction]);

  const addToBatch = useCallback(
    (
      teamId: string,
      quotationId: string,
      quotationName: string,
      change: ParameterChange
    ) => {
      // Clear existing timer
      if (batchTimerRef.current) {
        clearTimeout(batchTimerRef.current);
      }

      // Initialize or update batch data
      if (!batchDataRef.current) {
        batchDataRef.current = {
          teamId,
          quotationId,
          quotationName,
          changes: new Map(),
        };
      }

      // Update or add change (Map ensures we only track latest value per field)
      const existingChange = batchDataRef.current.changes.get(change.field);
      if (existingChange) {
        // Keep original oldValue, update to latest newValue
        existingChange.newValue = change.newValue;
      } else {
        batchDataRef.current.changes.set(change.field, change);
      }

      logger.debug('[Activity Batching] Added to parameter batch:', {
        field: change.field,
        oldValue: change.oldValue,
        newValue: change.newValue,
        totalFields: batchDataRef.current.changes.size,
      });

      // Don't auto-flush with timer - wait for manual flush on dialog close
      // This prevents logging until user actually exits the quotation
    },
    []
  );

  return { addToBatch, flushBatch };
}
