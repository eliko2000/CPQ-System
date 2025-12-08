import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { getTableColumnSettings, TableType } from '../constants/settings';
import { logger } from '../lib/logger';
import { useTeam } from '../contexts/TeamContext';
import { useUser } from './useUser';

export interface TableConfig {
  columnOrder: string[];
  columnWidths: Record<string, number>;
  visibleColumns: string[]; // Read-only, loaded from settings
  filterState: any; // AG Grid filter model
}

interface SavedTableConfig {
  columnOrder: string[];
  columnWidths: Record<string, number>;
  filterState: any;
  visibleColumns: string[]; // Now saved to persist user column choices
}

export function useTableConfig(tableName: string, defaultConfig: TableConfig) {
  const { currentTeam } = useTeam();
  const { profile } = useUser();
  const [config, setConfig] = useState<TableConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);

  // Load config from database
  useEffect(() => {
    loadConfig();
  }, [tableName, currentTeam, profile]);

  // Listen for settings updates and reload visible columns
  useEffect(() => {
    const handleSettingsUpdate = () => {
      // Removed excessive logging to reduce re-renders
      // logger.debug(
      //   `[useTableConfig] Settings updated, reloading visible columns for ${tableName}`
      // );
      const newVisibleColumns = getTableColumnSettings(tableName as TableType);
      setConfig(prev => ({ ...prev, visibleColumns: newVisibleColumns }));
    };

    // Listen for storage events (settings changes)
    window.addEventListener('storage', handleSettingsUpdate);

    // Listen for custom settings update event
    window.addEventListener('cpq-settings-updated', handleSettingsUpdate);

    return () => {
      window.removeEventListener('storage', handleSettingsUpdate);
      window.removeEventListener('cpq-settings-updated', handleSettingsUpdate);
    };
  }, [tableName]);

  const loadConfig = async () => {
    if (!currentTeam || !profile) {
      // Don't set loading false yet - wait for team/profile to be available
      return;
    }

    try {
      // Always load visible columns from settings (user_settings table)
      const visibleColumnsFromSettings = getTableColumnSettings(
        tableName as TableType
      );
      // Removed excessive logging to reduce re-renders
      // logger.debug(
      //   `[useTableConfig] Loaded visible columns from settings for ${tableName}:`,
      //   visibleColumnsFromSettings
      // );

      const { data, error } = await supabase
        .from('user_table_configs')
        .select('config')
        .eq('user_id', profile.id)
        .eq('team_id', currentTeam.id)
        .eq('table_name', tableName)
        .maybeSingle();

      // Log but don't throw on expected errors (no record yet)
      if (error && error.code !== 'PGRST116') {
        logger.warn(
          `[useTableConfig] Error loading config for ${tableName}:`,
          error
        );
      }

      if (data?.config) {
        // Removed excessive logging to reduce re-renders
        // logger.debug(
        //   `[useTableConfig] Loaded saved config for ${tableName}:`,
        //   data.config
        // );
        // logger.debug(
        //   `[useTableConfig] Raw columnWidths from DB:`,
        //   data.config.columnWidths
        // );

        const savedConfig = data.config as SavedTableConfig;

        // Build columnOrder: Start with default order, then append saved columns not in defaults
        const newColumnOrder = [
          ...defaultConfig.columnOrder,
          ...savedConfig.columnOrder.filter(
            col => !defaultConfig.columnOrder.includes(col)
          ),
        ];

        const mergedConfig: TableConfig = {
          columnOrder: newColumnOrder,
          columnWidths: { ...savedConfig.columnWidths },
          visibleColumns:
            savedConfig.visibleColumns || visibleColumnsFromSettings, // Use saved columns, fallback to settings
          filterState: savedConfig.filterState || {},
        };

        // Removed excessive logging to reduce re-renders
        // logger.debug(
        //   `[useTableConfig] Merged config for ${tableName}:`,
        //   mergedConfig
        // );
        setConfig(mergedConfig);
      } else {
        // Removed excessive logging to reduce re-renders
        // logger.debug(
        //   `[useTableConfig] No saved config for ${tableName}, using defaults with settings visible columns`
        // );
        setConfig({
          ...defaultConfig,
          visibleColumns: visibleColumnsFromSettings, // Use settings for first load
        });
      }
    } catch (err) {
      logger.error('Failed to load table config:', err);
      // Even on error, use settings for visible columns
      const visibleColumnsFromSettings = getTableColumnSettings(
        tableName as TableType
      );
      setConfig({
        ...defaultConfig,
        visibleColumns: visibleColumnsFromSettings,
      });
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = useCallback(
    async (newConfig: Partial<TableConfig>) => {
      // Removed excessive logging to reduce re-renders
      // console.trace('[useTableConfig] saveConfig called with:', newConfig);
      if (!currentTeam || !profile) return;

      const updatedConfig = { ...config, ...newConfig };
      setConfig(updatedConfig);

      try {
        // Save all config fields including visibleColumns for persistence
        const configToSave: SavedTableConfig = {
          columnOrder: updatedConfig.columnOrder,
          columnWidths: updatedConfig.columnWidths,
          filterState: updatedConfig.filterState,
          visibleColumns: updatedConfig.visibleColumns, // Now saved to persist user choices
        };

        // Reduced logging - only log on errors or important events
        // logger.debug(
        //   `[useTableConfig] Saving config for ${tableName}:`,
        //   configToSave
        // );
        // logger.debug(
        //   `[useTableConfig] columnWidths details:`,
        //   JSON.stringify(configToSave.columnWidths)
        // );

        const { error } = await supabase.from('user_table_configs').upsert(
          {
            user_id: profile.id,
            team_id: currentTeam.id,
            table_name: tableName,
            config: configToSave,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,team_id,table_name',
          }
        );

        if (error) {
          logger.error(`[useTableConfig] Error saving config:`, error);
        }
        // Removed success log to reduce noise
        // else {
        //   logger.debug(
        //     `[useTableConfig] Successfully saved config for ${tableName}`
        //   );
        // }
      } catch (err) {
        logger.error(
          `[useTableConfig] Failed to save config for ${tableName}:`,
          err
        );
      }
    },
    [config, tableName, currentTeam, profile]
  );

  return { config, saveConfig, loading };
}
