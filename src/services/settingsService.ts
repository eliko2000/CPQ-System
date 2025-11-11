/**
 * Settings Service
 * Manages persistent storage of user settings in Supabase
 * Provides fallback to localStorage for offline mode
 */

import { supabase } from '@/supabaseClient'

const DEFAULT_USER_ID = 'default'
const SETTINGS_CACHE_KEY = 'cpq-settings-cache'
const LAST_SYNC_KEY = 'cpq-settings-last-sync'

export interface SettingsServiceResult<T> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Load a setting from Supabase with localStorage fallback
 */
export async function loadSetting<T>(settingKey: string): Promise<SettingsServiceResult<T>> {
  try {
    // Try to load from Supabase
    const { data, error } = await supabase
      .from('user_settings')
      .select('setting_value')
      .eq('user_id', DEFAULT_USER_ID)
      .eq('setting_key', settingKey)
      .maybeSingle()

    if (error) {
      console.warn(`Failed to load setting "${settingKey}" from Supabase:`, error)
      // Fallback to localStorage
      return loadFromLocalStorage<T>(settingKey)
    }

    if (data && data.setting_value) {
      // Cache in localStorage for offline access
      cacheToLocalStorage(settingKey, data.setting_value)
      return { success: true, data: data.setting_value as T }
    }

    // No data found, try localStorage
    return loadFromLocalStorage<T>(settingKey)
  } catch (error) {
    console.error(`Error loading setting "${settingKey}":`, error)
    return loadFromLocalStorage<T>(settingKey)
  }
}

/**
 * Save a setting to Supabase and localStorage
 */
export async function saveSetting<T>(settingKey: string, settingValue: T): Promise<SettingsServiceResult<T>> {
  try {
    // Save to Supabase (upsert)
    const { error } = await supabase
      .from('user_settings')
      .upsert(
        {
          user_id: DEFAULT_USER_ID,
          setting_key: settingKey,
          setting_value: settingValue as any,
          updated_at: new Date().toISOString()
        },
        {
          onConflict: 'user_id,setting_key'
        }
      )

    if (error) {
      console.error(`Failed to save setting "${settingKey}" to Supabase:`, error)
      // Still save to localStorage as fallback
      cacheToLocalStorage(settingKey, settingValue)
      return { success: false, error: error.message }
    }

    // Also cache in localStorage
    cacheToLocalStorage(settingKey, settingValue)
    updateLastSyncTime()

    return { success: true, data: settingValue }
  } catch (error) {
    console.error(`Error saving setting "${settingKey}":`, error)
    // Save to localStorage as fallback
    cacheToLocalStorage(settingKey, settingValue)
    return { success: false, error: String(error) }
  }
}

/**
 * Load all settings from Supabase
 */
export async function loadAllSettings(): Promise<SettingsServiceResult<Record<string, any>>> {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('setting_key, setting_value')
      .eq('user_id', DEFAULT_USER_ID)

    if (error) {
      console.warn('Failed to load all settings from Supabase:', error)
      return loadAllFromLocalStorage()
    }

    if (data && data.length > 0) {
      // Convert to key-value object
      const settings: Record<string, any> = {}
      data.forEach(row => {
        settings[row.setting_key] = row.setting_value
      })

      // Cache all settings
      localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(settings))
      updateLastSyncTime()

      return { success: true, data: settings }
    }

    return loadAllFromLocalStorage()
  } catch (error) {
    console.error('Error loading all settings:', error)
    return loadAllFromLocalStorage()
  }
}

/**
 * Migrate settings from old localStorage format to Supabase
 */
export async function migrateLocalStorageToSupabase(): Promise<SettingsServiceResult<void>> {
  try {
    // Check if migration already done
    const migrationKey = 'cpq-settings-migrated'
    if (localStorage.getItem(migrationKey) === 'true') {
      return { success: true }
    }

    // Load old settings from localStorage
    const oldSettings = localStorage.getItem('cpq-settings')
    if (!oldSettings) {
      // No old settings to migrate
      localStorage.setItem(migrationKey, 'true')
      return { success: true }
    }

    const parsed = JSON.parse(oldSettings)

    // Migrate each section as a separate setting
    const migrations: Promise<any>[] = []

    for (const [key, value] of Object.entries(parsed)) {
      migrations.push(saveSetting(key, value))
    }

    await Promise.all(migrations)

    // Mark migration as complete
    localStorage.setItem(migrationKey, 'true')
    console.log('Successfully migrated settings to Supabase')

    return { success: true }
  } catch (error) {
    console.error('Error migrating settings:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Delete a setting from Supabase and localStorage
 */
export async function deleteSetting(settingKey: string): Promise<SettingsServiceResult<void>> {
  try {
    const { error } = await supabase
      .from('user_settings')
      .delete()
      .eq('user_id', DEFAULT_USER_ID)
      .eq('setting_key', settingKey)

    if (error) {
      console.error(`Failed to delete setting "${settingKey}":`, error)
      return { success: false, error: error.message }
    }

    // Also remove from localStorage cache
    removeFromLocalStorageCache(settingKey)

    return { success: true }
  } catch (error) {
    console.error(`Error deleting setting "${settingKey}":`, error)
    return { success: false, error: String(error) }
  }
}

// ============ Helper Functions ============

function loadFromLocalStorage<T>(settingKey: string): SettingsServiceResult<T> {
  try {
    const cache = localStorage.getItem(SETTINGS_CACHE_KEY)
    if (cache) {
      const parsed = JSON.parse(cache)
      if (parsed[settingKey]) {
        return { success: true, data: parsed[settingKey] as T }
      }
    }

    // Also try old format
    const oldSettings = localStorage.getItem('cpq-settings')
    if (oldSettings) {
      const parsed = JSON.parse(oldSettings)
      if (parsed[settingKey]) {
        return { success: true, data: parsed[settingKey] as T }
      }
    }

    return { success: false, error: 'Setting not found in localStorage' }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

function loadAllFromLocalStorage(): SettingsServiceResult<Record<string, any>> {
  try {
    const cache = localStorage.getItem(SETTINGS_CACHE_KEY)
    if (cache) {
      return { success: true, data: JSON.parse(cache) }
    }

    // Try old format
    const oldSettings = localStorage.getItem('cpq-settings')
    if (oldSettings) {
      return { success: true, data: JSON.parse(oldSettings) }
    }

    return { success: false, error: 'No settings found in localStorage' }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

function cacheToLocalStorage<T>(settingKey: string, settingValue: T): void {
  try {
    const cache = localStorage.getItem(SETTINGS_CACHE_KEY)
    const settings = cache ? JSON.parse(cache) : {}
    settings[settingKey] = settingValue
    localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(settings))
  } catch (error) {
    console.error('Error caching to localStorage:', error)
  }
}

function removeFromLocalStorageCache(settingKey: string): void {
  try {
    const cache = localStorage.getItem(SETTINGS_CACHE_KEY)
    if (cache) {
      const settings = JSON.parse(cache)
      delete settings[settingKey]
      localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(settings))
    }
  } catch (error) {
    console.error('Error removing from localStorage cache:', error)
  }
}

function updateLastSyncTime(): void {
  localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString())
}

export function getLastSyncTime(): Date | null {
  const lastSync = localStorage.getItem(LAST_SYNC_KEY)
  return lastSync ? new Date(lastSync) : null
}
