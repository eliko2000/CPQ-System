import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { getTableColumnSettings, TableType } from '../constants/settings'

export interface TableConfig {
  columnOrder: string[]
  columnWidths: Record<string, number>
  visibleColumns: string[] // Read-only, loaded from settings
  filterState: any // AG Grid filter model
}

interface SavedTableConfig {
  columnOrder: string[]
  columnWidths: Record<string, number>
  filterState: any
  // visibleColumns is NOT saved - always loaded from user_settings
}

export function useTableConfig(tableName: string, defaultConfig: TableConfig) {
  const [config, setConfig] = useState<TableConfig>(defaultConfig)
  const [loading, setLoading] = useState(true)

  // Load config from database
  useEffect(() => {
    loadConfig()
  }, [tableName])

  // Listen for settings updates and reload visible columns
  useEffect(() => {
    const handleSettingsUpdate = () => {
      console.log(`[useTableConfig] Settings updated, reloading visible columns for ${tableName}`)
      const newVisibleColumns = getTableColumnSettings(tableName as TableType)
      setConfig(prev => ({ ...prev, visibleColumns: newVisibleColumns }))
    }

    // Listen for storage events (settings changes)
    window.addEventListener('storage', handleSettingsUpdate)

    // Listen for custom settings update event
    window.addEventListener('cpq-settings-updated', handleSettingsUpdate)

    return () => {
      window.removeEventListener('storage', handleSettingsUpdate)
      window.removeEventListener('cpq-settings-updated', handleSettingsUpdate)
    }
  }, [tableName])

  const loadConfig = async () => {
    try {
      const userId = 'default-user' // Replace with actual user ID when auth is added

      // Always load visible columns from settings (user_settings table)
      const visibleColumnsFromSettings = getTableColumnSettings(tableName as TableType)
      console.log(`[useTableConfig] Loaded visible columns from settings for ${tableName}:`, visibleColumnsFromSettings)

      const { data, error: _error } = await supabase
        .from('user_table_configs')
        .select('config')
        .eq('user_id', userId)
        .eq('table_name', tableName)
        .single()

      if (data?.config) {
        console.log(`[useTableConfig] Loaded saved config for ${tableName}:`, data.config)

        const savedConfig = data.config as SavedTableConfig

        // Build columnOrder: Start with default order, then append saved columns not in defaults
        const newColumnOrder = [
          ...defaultConfig.columnOrder,
          ...savedConfig.columnOrder.filter(col => !defaultConfig.columnOrder.includes(col))
        ]

        const mergedConfig: TableConfig = {
          columnOrder: newColumnOrder,
          columnWidths: { ...savedConfig.columnWidths },
          visibleColumns: visibleColumnsFromSettings, // Always from settings
          filterState: savedConfig.filterState || {}
        }

        console.log(`[useTableConfig] Merged config for ${tableName}:`, mergedConfig)
        setConfig(mergedConfig)
      } else {
        console.log(`[useTableConfig] No saved config for ${tableName}, using defaults with settings visible columns`)
        setConfig({
          ...defaultConfig,
          visibleColumns: visibleColumnsFromSettings // Always from settings
        })
      }
    } catch (err) {
      console.error('Failed to load table config:', err)
      // Even on error, use settings for visible columns
      const visibleColumnsFromSettings = getTableColumnSettings(tableName as TableType)
      setConfig({
        ...defaultConfig,
        visibleColumns: visibleColumnsFromSettings
      })
    } finally {
      setLoading(false)
    }
  }

  const saveConfig = useCallback(async (newConfig: Partial<TableConfig>) => {
    const updatedConfig = { ...config, ...newConfig }
    setConfig(updatedConfig)

    try {
      const userId = 'default-user'

      // Extract only the fields we want to save (NOT visibleColumns)
      const configToSave: SavedTableConfig = {
        columnOrder: updatedConfig.columnOrder,
        columnWidths: updatedConfig.columnWidths,
        filterState: updatedConfig.filterState
        // visibleColumns is intentionally excluded - it's always loaded from user_settings
      }

      console.log(`[useTableConfig] Saving config for ${tableName}:`, configToSave)

      const { error } = await supabase
        .from('user_table_configs')
        .upsert({
          user_id: userId,
          table_name: tableName,
          config: configToSave,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,table_name'
        })

      if (error) {
        console.error(`[useTableConfig] Error saving config:`, error)
      } else {
        console.log(`[useTableConfig] Successfully saved config for ${tableName}`)
      }
    } catch (err) {
      console.error(`[useTableConfig] Failed to save config for ${tableName}:`, err)
    }
  }, [config, tableName])

  return { config, saveConfig, loading }
}
