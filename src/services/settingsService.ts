/**
 * Settings Service
 * Manages persistent storage of user settings in Supabase
 * Provides fallback to localStorage for offline mode
 */

import { supabase } from '@/supabaseClient';
import { logger } from '@/lib/logger';

const DEFAULT_USER_ID = 'default';
const SETTINGS_CACHE_KEY = 'cpq-settings-cache';
const LAST_SYNC_KEY = 'cpq-settings-last-sync';

/**
 * Get cache key with optional team scope
 */
function getCacheKey(teamId?: string): string {
  return teamId ? `${SETTINGS_CACHE_KEY}-${teamId}` : SETTINGS_CACHE_KEY;
}

export interface SettingsServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Load a setting from Supabase with localStorage fallback
 */
export async function loadSetting<T>(
  settingKey: string,
  teamId?: string
): Promise<SettingsServiceResult<T>> {
  try {
    // Build query based on scope
    let query = supabase
      .from('user_settings')
      .select('setting_value')
      .eq('setting_key', settingKey);

    if (teamId) {
      // Team-scoped settings: shared across all team members
      query = query.eq('team_id', teamId);
    } else {
      // Personal settings: per-user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const userId = user?.id || DEFAULT_USER_ID;
      query = query.eq('user_id', userId).is('team_id', null);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      logger.warn(
        `Failed to load setting "${settingKey}" from Supabase:`,
        error
      );
      // Fallback to localStorage
      return loadFromLocalStorage<T>(settingKey, teamId);
    }

    if (data && data.setting_value) {
      // Cache in localStorage for offline access
      cacheToLocalStorage(settingKey, data.setting_value, teamId);
      return { success: true, data: data.setting_value as T };
    }

    // No data found, try localStorage
    return loadFromLocalStorage<T>(settingKey, teamId);
  } catch (error) {
    logger.error(`Error loading setting "${settingKey}":`, error);
    return loadFromLocalStorage<T>(settingKey, teamId);
  }
}

/**
 * Save a setting to Supabase and localStorage
 */
export async function saveSetting<T>(
  settingKey: string,
  settingValue: T,
  teamId?: string
): Promise<SettingsServiceResult<T>> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id || DEFAULT_USER_ID;

    if (teamId) {
      // Team-scoped settings: check if row exists, then update or insert
      const { data: existing } = await supabase
        .from('user_settings')
        .select('id')
        .eq('team_id', teamId)
        .eq('setting_key', settingKey)
        .maybeSingle();

      let error;
      if (existing) {
        // Update existing team setting
        const result = await supabase
          .from('user_settings')
          .update({
            setting_value: settingValue as any,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
        error = result.error;
      } else {
        // Insert new team setting
        const result = await supabase.from('user_settings').insert({
          setting_key: settingKey,
          setting_value: settingValue as any,
          team_id: teamId,
          user_id: userId,
          updated_at: new Date().toISOString(),
        });
        error = result.error;
      }

      if (error) {
        logger.error(`Failed to save team setting "${settingKey}":`, error);
        cacheToLocalStorage(settingKey, settingValue, teamId);
        return { success: false, error: error.message };
      }
    } else {
      // Personal settings: use upsert
      const { error } = await supabase.from('user_settings').upsert(
        {
          setting_key: settingKey,
          setting_value: settingValue as any,
          user_id: userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,setting_key' }
      );

      if (error) {
        logger.error(`Failed to save personal setting "${settingKey}":`, error);
        cacheToLocalStorage(settingKey, settingValue, teamId);
        return { success: false, error: error.message };
      }
    }

    // Also cache in localStorage
    cacheToLocalStorage(settingKey, settingValue, teamId);
    updateLastSyncTime();

    return { success: true, data: settingValue };
  } catch (error) {
    logger.error(`Error saving setting "${settingKey}":`, error);
    // Save to localStorage as fallback
    cacheToLocalStorage(settingKey, settingValue, teamId);
    return { success: false, error: String(error) };
  }
}

/**
 * Load all settings from Supabase
 */
export async function loadAllSettings(
  teamId?: string
): Promise<SettingsServiceResult<Record<string, any>>> {
  try {
    // Build query based on scope
    let query = supabase
      .from('user_settings')
      .select('setting_key, setting_value');

    if (teamId) {
      // Team-scoped settings: shared across all team members
      query = query.eq('team_id', teamId);
    } else {
      // Personal settings: per-user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const userId = user?.id || DEFAULT_USER_ID;
      query = query.eq('user_id', userId).is('team_id', null);
    }

    const { data, error } = await query;

    if (error) {
      logger.warn('Failed to load all settings from Supabase:', error);
      return loadAllFromLocalStorage(teamId);
    }

    if (data && data.length > 0) {
      // Convert to key-value object
      const settings: Record<string, any> = {};
      data.forEach(row => {
        settings[row.setting_key] = row.setting_value;
      });

      // Cache all settings
      const cacheKey = getCacheKey(teamId);
      localStorage.setItem(cacheKey, JSON.stringify(settings));
      updateLastSyncTime();

      return { success: true, data: settings };
    }

    return loadAllFromLocalStorage(teamId);
  } catch (error) {
    logger.error('Error loading all settings:', error);
    return loadAllFromLocalStorage(teamId);
  }
}

/**
 * Migrate settings from old localStorage format to Supabase
 */
export async function migrateLocalStorageToSupabase(): Promise<
  SettingsServiceResult<void>
> {
  try {
    // Check if migration already done
    const migrationKey = 'cpq-settings-migrated';
    if (localStorage.getItem(migrationKey) === 'true') {
      return { success: true };
    }

    // Load old settings from localStorage
    const oldSettings = localStorage.getItem('cpq-settings');
    if (!oldSettings) {
      // No old settings to migrate
      localStorage.setItem(migrationKey, 'true');
      return { success: true };
    }

    const parsed = JSON.parse(oldSettings);

    // Migrate each section as a separate setting
    const migrations: Promise<any>[] = [];

    for (const [key, value] of Object.entries(parsed)) {
      migrations.push(saveSetting(key, value));
    }

    await Promise.all(migrations);

    // Mark migration as complete
    localStorage.setItem(migrationKey, 'true');
    logger.info('Successfully migrated settings to Supabase');

    return { success: true };
  } catch (error) {
    logger.error('Error migrating settings:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Delete a setting from Supabase and localStorage
 */
export async function deleteSetting(
  settingKey: string,
  teamId?: string
): Promise<SettingsServiceResult<void>> {
  try {
    // Build query based on scope
    let query = supabase
      .from('user_settings')
      .delete()
      .eq('setting_key', settingKey);

    if (teamId) {
      // Team-scoped settings: shared across all team members
      query = query.eq('team_id', teamId);
    } else {
      // Personal settings: per-user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const userId = user?.id || DEFAULT_USER_ID;
      query = query.eq('user_id', userId).is('team_id', null);
    }

    const { error } = await query;

    if (error) {
      logger.error(`Failed to delete setting "${settingKey}":`, error);
      return { success: false, error: error.message };
    }

    // Also remove from localStorage cache
    removeFromLocalStorageCache(settingKey, teamId);

    return { success: true };
  } catch (error) {
    logger.error(`Error deleting setting "${settingKey}":`, error);
    return { success: false, error: String(error) };
  }
}

// ============ Helper Functions ============

function loadFromLocalStorage<T>(
  settingKey: string,
  teamId?: string
): SettingsServiceResult<T> {
  try {
    const cacheKey = getCacheKey(teamId);
    const cache = localStorage.getItem(cacheKey);
    if (cache) {
      const parsed = JSON.parse(cache);
      if (parsed[settingKey]) {
        return { success: true, data: parsed[settingKey] as T };
      }
    }

    // Also try old format for backward compatibility
    const oldSettings = localStorage.getItem('cpq-settings');
    if (oldSettings) {
      const parsed = JSON.parse(oldSettings);
      if (parsed[settingKey]) {
        return { success: true, data: parsed[settingKey] as T };
      }
    }

    return { success: false, error: 'Setting not found in localStorage' };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

function loadAllFromLocalStorage(
  teamId?: string
): SettingsServiceResult<Record<string, any>> {
  try {
    const cacheKey = getCacheKey(teamId);
    const cache = localStorage.getItem(cacheKey);
    if (cache) {
      return { success: true, data: JSON.parse(cache) };
    }

    // Try old format for backward compatibility
    const oldSettings = localStorage.getItem('cpq-settings');
    if (oldSettings) {
      return { success: true, data: JSON.parse(oldSettings) };
    }

    return { success: false, error: 'No settings found in localStorage' };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

function cacheToLocalStorage<T>(
  settingKey: string,
  settingValue: T,
  teamId?: string
): void {
  try {
    const cacheKey = getCacheKey(teamId);
    const cache = localStorage.getItem(cacheKey);
    const settings = cache ? JSON.parse(cache) : {};
    settings[settingKey] = settingValue;
    localStorage.setItem(cacheKey, JSON.stringify(settings));
  } catch (error) {
    logger.error('Error caching to localStorage:', error);
  }
}

function removeFromLocalStorageCache(
  settingKey: string,
  teamId?: string
): void {
  try {
    const cacheKey = getCacheKey(teamId);
    const cache = localStorage.getItem(cacheKey);
    if (cache) {
      const settings = JSON.parse(cache);
      delete settings[settingKey];
      localStorage.setItem(cacheKey, JSON.stringify(settings));
    }
  } catch (error) {
    logger.error('Error removing from localStorage cache:', error);
  }
}

function updateLastSyncTime(): void {
  localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
}

export function getLastSyncTime(): Date | null {
  const lastSync = localStorage.getItem(LAST_SYNC_KEY);
  return lastSync ? new Date(lastSync) : null;
}
