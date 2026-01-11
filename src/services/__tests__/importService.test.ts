import { describe, it, expect, vi } from 'vitest';
import {
  parseImportFile,
  validateImportData,
  applyImport,
} from '../importService';
import type { ExportPackage } from '@/types/import-export.types';

// Mock Supabase
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
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: { id: 'test-log-id' },
              error: null,
            })
          ),
        })),
        eq: vi.fn(() => ({
          data: null,
          error: null,
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: null,
          error: null,
        })),
      })),
      delete: vi.fn(() => ({
        in: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() => Promise.resolve({ error: null })),
        getPublicUrl: vi.fn(() => ({
          data: { publicUrl: 'http://test.com/file' },
        })),
      })),
    },
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('importService', () => {
  describe('parseImportFile', () => {
    it('should reject non-JSON files', async () => {
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      const result = await parseImportFile(file);
      expect(result.success).toBe(false);
    });
  });

  describe('validateImportData', () => {
    it('should validate basic export package structure', async () => {
      const mockPackage: ExportPackage = {
        manifest: {
          version: '1.0.0',
          schemaVersion: '1.0.0',
          exportedAt: new Date().toISOString(),
          exportedBy: 'test-user',
          teamId: 'team-1',
          teamName: 'Test Team',
          includes: {
            components: true,
            assemblies: false,
            quotations: false,
            settings: false,
            priceHistory: false,
            activityLogs: false,
            attachments: false,
          },
          counts: {
            components: 1,
            assemblies: 0,
            quotations: 0,
            quotationSystems: 0,
            quotationItems: 0,
            attachments: 0,
          },
          encryption: {
            enabled: false,
          },
        },
        data: {
          components: [
            {
              id: 'comp-1',
              name: 'Test Component',
              manufacturer: 'Test Mfg',
              manufacturer_part_number: 'TEST-001',
              category: 'PLC',
              component_type: 'hardware',
              unit_cost_usd: 100,
              unit_cost_ils: 370,
              unit_cost_eur: 90,
              currency: 'USD',
              original_cost: 100,
              team_id: 'team-1',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
        },
        relationships: {
          componentToItems: {},
          assemblyToComponents: {},
          quotationToSystems: {},
          systemToItems: {},
          componentToAssemblies: {},
        },
      };

      const result = await validateImportData(mockPackage, 'team-2');

      expect(result.valid).toBe(true);
      expect(result.schemaCompatible).toBe(true);
      expect(result.teamIdMatch).toBe(false); // Different teams
      expect(result.preview.toCreate.components).toBe(1);
    });

    it('should detect incompatible schema versions', async () => {
      const mockPackage: ExportPackage = {
        manifest: {
          version: '1.0.0',
          schemaVersion: '2.0.0', // Incompatible
          exportedAt: new Date().toISOString(),
          exportedBy: 'test-user',
          teamId: 'team-1',
          teamName: 'Test Team',
          includes: {
            components: false,
            assemblies: false,
            quotations: false,
            settings: false,
            priceHistory: false,
            activityLogs: false,
            attachments: false,
          },
          counts: {
            components: 0,
            assemblies: 0,
            quotations: 0,
            quotationSystems: 0,
            quotationItems: 0,
            attachments: 0,
          },
          encryption: {
            enabled: false,
          },
        },
        data: {},
        relationships: {
          componentToItems: {},
          assemblyToComponents: {},
          quotationToSystems: {},
          systemToItems: {},
          componentToAssemblies: {},
        },
      };

      const result = await validateImportData(mockPackage, 'team-1');

      expect(result.valid).toBe(false);
      expect(result.schemaCompatible).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('applyImport', () => {
    it('should handle empty import package', async () => {
      const mockPackage: ExportPackage = {
        manifest: {
          version: '1.0.0',
          schemaVersion: '1.0.0',
          exportedAt: new Date().toISOString(),
          exportedBy: 'test-user',
          teamId: 'team-1',
          teamName: 'Test Team',
          includes: {
            components: false,
            assemblies: false,
            quotations: false,
            settings: false,
            priceHistory: false,
            activityLogs: false,
            attachments: false,
          },
          counts: {
            components: 0,
            assemblies: 0,
            quotations: 0,
            quotationSystems: 0,
            quotationItems: 0,
            attachments: 0,
          },
          encryption: {
            enabled: false,
          },
        },
        data: {},
        relationships: {
          componentToItems: {},
          assemblyToComponents: {},
          quotationToSystems: {},
          systemToItems: {},
          componentToAssemblies: {},
        },
      };

      const result = await applyImport(mockPackage, 'team-1', [], {
        strictValidation: false,
        batchSize: 100,
      });

      expect(result.success).toBe(true);
      expect(result.data?.recordsCreated.components).toBe(0);
      expect(result.data?.recordsCreated.assemblies).toBe(0);
      expect(result.data?.recordsCreated.quotations).toBe(0);
    });

    it('should report progress during import', async () => {
      const mockPackage: ExportPackage = {
        manifest: {
          version: '1.0.0',
          schemaVersion: '1.0.0',
          exportedAt: new Date().toISOString(),
          exportedBy: 'test-user',
          teamId: 'team-1',
          teamName: 'Test Team',
          includes: {
            components: true,
            assemblies: false,
            quotations: false,
            settings: false,
            priceHistory: false,
            activityLogs: false,
            attachments: false,
          },
          counts: {
            components: 5,
            assemblies: 0,
            quotations: 0,
            quotationSystems: 0,
            quotationItems: 0,
            attachments: 0,
          },
          encryption: {
            enabled: false,
          },
        },
        data: {
          components: Array.from({ length: 5 }, (_, i) => ({
            id: `comp-${i}`,
            name: `Component ${i}`,
            manufacturer: 'Test Mfg',
            manufacturer_part_number: `TEST-${i}`,
            category: 'PLC',
            component_type: 'hardware' as const,
            unit_cost_usd: 100,
            unit_cost_ils: 370,
            unit_cost_eur: 90,
            currency: 'USD' as const,
            original_cost: 100,
            team_id: 'team-1',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })),
        },
        relationships: {
          componentToItems: {},
          assemblyToComponents: {},
          quotationToSystems: {},
          systemToItems: {},
          componentToAssemblies: {},
        },
      };

      const progressUpdates: number[] = [];
      const progressCallback = vi.fn(progress => {
        progressUpdates.push(progress.percentComplete);
      });

      const result = await applyImport(
        mockPackage,
        'team-1',
        [],
        { strictValidation: false, batchSize: 2 },
        progressCallback
      );

      expect(result.success).toBe(true);
      expect(progressCallback).toHaveBeenCalled();
      expect(progressUpdates.length).toBeGreaterThan(0);
    });
  });
});
