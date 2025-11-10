import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'

export interface TableConfig {
  columnOrder: string[]
  columnWidths: Record<string, number>
  visibleColumns: string[]
  filterState: any // AG Grid filter model
}

export function useTableConfig(tableName: string, defaultConfig: TableConfig) {
  const [config, setConfig] = useState<TableConfig>(defaultConfig)
  const [loading, setLoading] = useState(true)

  // Load config from database
  useEffect(() => {
    loadConfig()
  }, [tableName])

  const loadConfig = async () => {
    try {
      const userId = 'default-user' // Replace with actual user ID when auth is added
      const { data, error } = await supabase
        .from('user_table_configs')
        .select('config')
        .eq('user_id', userId)
        .eq('table_name', tableName)
        .single()

      if (data?.config) {
        console.log(`[useTableConfig] Loaded config for ${tableName}:`, data.config)

        // Smart merge: Use default order and add any missing columns from saved config
        const savedConfig = data.config as TableConfig

        // Build columnOrder: Start with default order, then append saved columns not in defaults
        const newColumnOrder = [
          ...defaultConfig.columnOrder,
          ...savedConfig.columnOrder.filter(col => !defaultConfig.columnOrder.includes(col))
        ]

        // Build visibleColumns: Include saved visible columns that are in the new order,
        // plus any new default visible columns
        const newVisibleColumns = [
          ...savedConfig.visibleColumns.filter(col => newColumnOrder.includes(col)),
          ...defaultConfig.visibleColumns.filter(col => !savedConfig.visibleColumns.includes(col))
        ]

        const mergedConfig: TableConfig = {
          columnOrder: newColumnOrder,
          columnWidths: { ...savedConfig.columnWidths },
          visibleColumns: newVisibleColumns,
          filterState: savedConfig.filterState || {}
        }

        console.log(`[useTableConfig] Merged config for ${tableName}:`, mergedConfig)
        setConfig(mergedConfig)

        // Save the merged config back to database
        await supabase
          .from('user_table_configs')
          .update({
            config: mergedConfig,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .eq('table_name', tableName)
      } else {
        console.log(`[useTableConfig] No saved config for ${tableName}, using defaults`)
        setConfig(defaultConfig)
      }
    } catch (err) {
      console.error('Failed to load table config:', err)
      setConfig(defaultConfig)
    } finally {
      setLoading(false)
    }
  }

  const saveConfig = useCallback(async (newConfig: Partial<TableConfig>) => {
    const updatedConfig = { ...config, ...newConfig }
    setConfig(updatedConfig)

    try {
      const userId = 'default-user'
      console.log(`[useTableConfig] Saving config for ${tableName}:`, updatedConfig)

      const { error } = await supabase
        .from('user_table_configs')
        .upsert({
          user_id: userId,
          table_name: tableName,
          config: updatedConfig,
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
