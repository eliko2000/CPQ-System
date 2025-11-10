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
      const { data, error: _error } = await supabase
        .from('user_table_configs')
        .select('config')
        .eq('user_id', userId)
        .eq('table_name', tableName)
        .single()

      if (data?.config) {
        console.log(`[useTableConfig] Loaded config for ${tableName}:`, data.config)
        setConfig(data.config)
      } else {
        console.log(`[useTableConfig] No saved config for ${tableName}, using defaults`)
      }
    } catch (err) {
      console.error('Failed to load table config:', err)
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
