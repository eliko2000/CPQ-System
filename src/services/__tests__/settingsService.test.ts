/**
 * Settings Service Tests
 * Tests for Supabase settings persistence
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadSetting,
  saveSetting,
  migrateLocalStorageToSupabase,
} from '../settingsService';

// Mock Supabase client
vi.mock('@/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(() =>
        Promise.resolve({
          data: { user: { id: 'test-user-id' } },
          error: null,
        })
      ),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() =>
              Promise.resolve({ data: null, error: null })
            ),
          })),
        })),
      })),
      upsert: vi.fn(() => Promise.resolve({ error: null })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
        })),
      })),
    })),
  },
}));

describe('settingsService', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('saveSetting', () => {
    it('should save setting to cache', async () => {
      const testData = { categories: ['Test1', 'Test2'] };

      await saveSetting('componentCategories', testData);

      const cache = localStorage.getItem('cpq-settings-cache');
      expect(cache).toBeTruthy();

      const parsed = JSON.parse(cache!);
      expect(parsed.componentCategories).toEqual(testData);
    });

    it('should cache complex settings object', async () => {
      const testData = {
        component_library: ['col1', 'col2'],
        bom_grid: ['col3', 'col4'],
      };

      await saveSetting('tableColumns', testData);

      const cache = localStorage.getItem('cpq-settings-cache');
      const parsed = JSON.parse(cache!);
      expect(parsed.tableColumns).toEqual(testData);
    });
  });

  describe('loadSetting', () => {
    it('should load setting from cache', async () => {
      const testData = { categories: ['Test1', 'Test2'] };
      localStorage.setItem(
        'cpq-settings-cache',
        JSON.stringify({
          componentCategories: testData,
        })
      );

      const result = await loadSetting('componentCategories');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(testData);
    });

    it('should return error when setting not found', async () => {
      const result = await loadSetting('nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should fallback to old localStorage format', async () => {
      const testData = { categories: ['Test1', 'Test2'] };
      localStorage.setItem(
        'cpq-settings',
        JSON.stringify({
          componentCategories: testData,
        })
      );

      const result = await loadSetting('componentCategories');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(testData);
    });
  });

  describe('migrateLocalStorageToSupabase', () => {
    it('should not migrate if already migrated', async () => {
      localStorage.setItem('cpq-settings-migrated', 'true');

      const result = await migrateLocalStorageToSupabase();

      expect(result.success).toBe(true);
    });

    it('should mark migration complete when no old settings exist', async () => {
      const result = await migrateLocalStorageToSupabase();

      expect(result.success).toBe(true);
      expect(localStorage.getItem('cpq-settings-migrated')).toBe('true');
    });

    it('should migrate old settings', async () => {
      const oldSettings = {
        componentCategories: { categories: ['Test1'] },
        tableColumns: { component_library: ['col1'] },
      };
      localStorage.setItem('cpq-settings', JSON.stringify(oldSettings));

      const result = await migrateLocalStorageToSupabase();

      expect(result.success).toBe(true);
      expect(localStorage.getItem('cpq-settings-migrated')).toBe('true');
    });
  });

  describe('Category persistence workflow', () => {
    it('should persist category changes across saves and loads', async () => {
      const categories = { categories: ['בקרים', 'חיישנים', 'חדש'] };

      // Save categories
      await saveSetting('componentCategories', categories);

      // Load categories
      const result = await loadSetting<{ categories: string[] }>(
        'componentCategories'
      );

      expect(result.success).toBe(true);
      expect(result.data?.categories).toContain('חדש');
      expect(result.data?.categories).toHaveLength(3);
    });
  });

  describe('Table columns persistence workflow', () => {
    it('should persist table column changes', async () => {
      const tableSettings = {
        component_library: ['actions', 'name', 'manufacturer'],
        bom_grid: ['number', 'name'],
        quotation_data_grid: ['quotationNumber', 'customerName'],
      };

      // Save table settings
      await saveSetting('tableColumns', tableSettings);

      // Load table settings
      const result = await loadSetting('tableColumns');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(tableSettings);
    });
  });

  describe('Team-scoped settings', () => {
    it('should save settings with team_id', async () => {
      const testData = { categories: ['Test1', 'Test2'] };
      const teamId = 'team-123';

      await saveSetting('componentCategories', testData, teamId);

      const cache = localStorage.getItem(`cpq-settings-cache-${teamId}`);
      expect(cache).toBeTruthy();
      const parsed = JSON.parse(cache!);
      expect(parsed.componentCategories).toEqual(testData);
    });

    it('should load settings filtered by team_id', async () => {
      const testData = { categories: ['TeamA'] };
      const teamId = 'team-123';

      localStorage.setItem(
        `cpq-settings-cache-${teamId}`,
        JSON.stringify({ componentCategories: testData })
      );

      const result = await loadSetting('componentCategories', teamId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(testData);
    });

    it('should isolate settings between teams', async () => {
      const teamAData = { categories: ['CategoryA'] };
      const teamBData = { categories: ['CategoryB'] };

      await saveSetting('componentCategories', teamAData, 'team-A');
      await saveSetting('componentCategories', teamBData, 'team-B');

      const resultA = await loadSetting('componentCategories', 'team-A');
      const resultB = await loadSetting('componentCategories', 'team-B');

      expect(resultA.data).toEqual(teamAData);
      expect(resultB.data).toEqual(teamBData);
    });

    it('should use default cache when no teamId provided', async () => {
      const testData = { categories: ['Default'] };

      await saveSetting('componentCategories', testData);

      const cache = localStorage.getItem('cpq-settings-cache');
      expect(cache).toBeTruthy();
    });
  });
});
