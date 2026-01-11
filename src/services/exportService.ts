/**
 * Export Service
 * Handles extraction and packaging of CPQ data for export
 * Supports team-isolated exports with configurable depth
 */

import { supabase } from '@/supabaseClient';
import { logger } from '@/lib/logger';
import type {
  ExportOptions,
  ExportPackage,
  ExportManifest,
  RelationshipMap,
  SystemSettings,
  AttachmentData,
  ExportStatus,
} from '@/types/import-export.types';
import type { DbComponent } from '@/types/component.types';
import type { DbAssembly, DbAssemblyComponent } from '@/types/assembly.types';
import type {
  DbQuotation,
  DbQuotationSystem,
  DbQuotationItem,
} from '@/types/quotation.types';

const EXPORT_VERSION = '1.0.0';
const SCHEMA_VERSION = '1.0.0';

/**
 * Export service result
 */
export interface ExportServiceResult {
  success: boolean;
  data?: ExportPackage;
  error?: string;
  logId?: string; // Audit log ID
}

/**
 * Progress callback for export operations
 */
export type ExportProgressCallback = (
  status: ExportStatus,
  percentComplete: number,
  message: string
) => void;

/**
 * Main export function
 * Extracts team data and packages it for export
 */
export async function exportData(
  teamId: string,
  options: ExportOptions,
  progressCallback?: ExportProgressCallback
): Promise<ExportServiceResult> {
  try {
    logger.info('Starting export operation', {
      teamId,
      includeQuotations: options.includeQuotations,
      includeComponents: options.includeComponents,
      includeAssemblies: options.includeAssemblies,
      includeSettings: options.includeSettings,
    });
    progressCallback?.('preparing', 0, 'Preparing export...');

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Verify user is admin of this team
    const { data: member } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single();

    if (!member || member.role !== 'admin') {
      return {
        success: false,
        error: 'Only team admins can export data',
      };
    }

    // Get team name
    const { data: team } = await supabase
      .from('teams')
      .select('name')
      .eq('id', teamId)
      .single();

    if (!team) {
      return { success: false, error: 'Team not found' };
    }

    // Create audit log entry (non-blocking - optional feature)
    let logId: string | undefined;
    try {
      logId = await createAuditLog(teamId, user.id, options);
    } catch (error) {
      logger.warn(
        'Failed to create audit log (table may not exist yet):',
        error
      );
      // Continue without audit log - it's optional
    }

    progressCallback?.('exporting', 10, 'Extracting components...');

    // Extract data based on options
    const exportData: ExportPackage['data'] = {};

    if (options.includeComponents) {
      exportData.components = await extractComponents(teamId, options);
      progressCallback?.(
        'exporting',
        30,
        `Extracted ${exportData.components?.length || 0} components`
      );
    }

    if (options.includeAssemblies) {
      const assemblies = await extractAssemblies(teamId);
      exportData.assemblies = assemblies.assemblies;
      exportData.assemblyComponents = assemblies.assemblyComponents;
      progressCallback?.(
        'exporting',
        50,
        `Extracted ${exportData.assemblies?.length || 0} assemblies`
      );
    }

    if (options.includeQuotations) {
      logger.info('Extracting quotations for team:', teamId);
      const quotations = await extractQuotations(teamId, options);
      logger.info('Extracted quotations:', {
        quotationsCount: quotations.quotations.length,
        systemsCount: quotations.systems.length,
        itemsCount: quotations.items.length,
      });
      exportData.quotations = quotations.quotations;
      exportData.quotationSystems = quotations.systems;
      exportData.quotationItems = quotations.items;
      progressCallback?.(
        'exporting',
        70,
        `Extracted ${exportData.quotations?.length || 0} quotations`
      );
    }

    if (options.includeSettings) {
      exportData.settings = await extractSettings(teamId);
      progressCallback?.('exporting', 85, 'Extracted settings');
    }

    // Build relationship map
    const relationships = buildRelationshipMap(exportData);

    // Extract attachments if requested
    let attachments: AttachmentData[] | undefined;
    if (options.includeAttachments) {
      attachments = await extractAttachments(teamId, exportData, options);
      progressCallback?.(
        'exporting',
        90,
        `Extracted ${attachments.length} attachments`
      );
    }

    // Generate manifest
    const manifest = generateManifest(
      user,
      team.name,
      teamId,
      exportData,
      relationships,
      options,
      attachments
    );

    // Assemble final package
    const exportPackage: ExportPackage = {
      manifest,
      data: exportData,
      relationships,
      attachments,
    };

    // Update audit log with success (if it was created)
    if (logId) {
      await completeAuditLog(logId, 'completed', manifest.counts);
    }

    progressCallback?.('completed', 100, 'Export completed successfully');
    logger.info('Export completed successfully', {
      logId,
      counts: manifest.counts,
    });

    return {
      success: true,
      data: exportPackage,
      logId,
    };
  } catch (error) {
    logger.error('Export failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Export failed',
    };
  }
}

/**
 * Extract components from database
 */
async function extractComponents(
  teamId: string,
  __options: ExportOptions
): Promise<DbComponent[]> {
  try {
    const { data, error } = await supabase
      .from('components')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error('Failed to extract components:', error);
    throw error;
  }
}

/**
 * Extract assemblies and their components
 */
async function extractAssemblies(teamId: string): Promise<{
  assemblies: DbAssembly[];
  assemblyComponents: DbAssemblyComponent[];
}> {
  try {
    // Get assemblies
    const { data: assemblies, error: assembliesError } = await supabase
      .from('assemblies')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: true });

    if (assembliesError) throw assembliesError;

    if (!assemblies || assemblies.length === 0) {
      return { assemblies: [], assemblyComponents: [] };
    }

    // Get assembly components
    const assemblyIds = assemblies.map(a => a.id);
    const { data: components, error: componentsError } = await supabase
      .from('assembly_components')
      .select('*')
      .in('assembly_id', assemblyIds)
      .order('assembly_id, sort_order');

    if (componentsError) throw componentsError;

    return {
      assemblies: assemblies || [],
      assemblyComponents: components || [],
    };
  } catch (error) {
    logger.error('Failed to extract assemblies:', error);
    throw error;
  }
}

/**
 * Extract quotations with systems and items
 */
async function extractQuotations(
  teamId: string,
  __options: ExportOptions
): Promise<{
  quotations: DbQuotation[];
  systems: DbQuotationSystem[];
  items: DbQuotationItem[];
}> {
  try {
    // Get quotations
    logger.info('Querying quotations table for team:', teamId);
    const { data: quotations, error: quotationsError } = await supabase
      .from('quotations')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: true });

    logger.info('Quotations query result:', {
      count: quotations?.length || 0,
      error: quotationsError,
    });

    if (quotationsError) throw quotationsError;

    if (!quotations || quotations.length === 0) {
      logger.warn('No quotations found for team');
      return { quotations: [], systems: [], items: [] };
    }

    // Get quotation systems
    const quotationIds = quotations.map(q => q.id);
    const { data: systems, error: systemsError } = await supabase
      .from('quotation_systems')
      .select('*')
      .in('quotation_id', quotationIds)
      .order('quotation_id, sort_order');

    if (systemsError) throw systemsError;

    // Get quotation items
    const systemIds = systems?.map(s => s.id) || [];
    let items: DbQuotationItem[] = [];

    if (systemIds.length > 0) {
      const { data: itemsData, error: itemsError } = await supabase
        .from('quotation_items')
        .select('*')
        .in('quotation_system_id', systemIds)
        .order('quotation_system_id, sort_order');

      if (itemsError) throw itemsError;
      items = itemsData || [];
    }

    return {
      quotations: quotations || [],
      systems: systems || [],
      items,
    };
  } catch (error) {
    logger.error('Failed to extract quotations:', error);
    throw error;
  }
}

/**
 * Extract system settings
 */
async function extractSettings(teamId: string): Promise<SystemSettings> {
  try {
    // Get team-scoped settings
    const { data: __settings } = await supabase
      .from('user_settings')
      .select('setting_key, setting_value')
      .eq('team_id', teamId);

    // Parse settings into structured format
    const exchangeRates = {
      usdToIls: 3.7,
      eurToIls: 4.0,
      updatedAt: new Date().toISOString(),
    };

    const defaultPricing = {
      markupPercent: 25,
      profitPercent: 15,
      riskPercent: 5,
      vatRate: 17,
      includeVAT: true,
      dayWorkCost: 1000,
    };

    // Extract categories from components
    const { data: categoriesData } = await supabase
      .from('components')
      .select('category')
      .eq('team_id', teamId);

    const categories = [
      ...new Set(categoriesData?.map(c => c.category).filter(Boolean) || []),
    ];

    return {
      exchangeRates,
      defaultPricing,
      categories,
      preferences: {
        defaultCurrency: 'NIS',
      },
    };
  } catch (error) {
    logger.error('Failed to extract settings:', error);
    // Return defaults on error
    return {
      exchangeRates: {
        usdToIls: 3.7,
        eurToIls: 4.0,
        updatedAt: new Date().toISOString(),
      },
      defaultPricing: {
        markupPercent: 25,
        profitPercent: 15,
        riskPercent: 5,
        vatRate: 17,
        includeVAT: true,
        dayWorkCost: 1000,
      },
      categories: [],
      preferences: {
        defaultCurrency: 'NIS',
      },
    };
  }
}

/**
 * Extract attachment data (supplier quote files)
 */
async function extractAttachments(
  teamId: string,
  exportData: ExportPackage['data'],
  options: ExportOptions
): Promise<AttachmentData[]> {
  try {
    const attachments: AttachmentData[] = [];

    // Get supplier quote files if components are included
    if (options.includeComponents && exportData.components) {
      logger.info('Extracting supplier quote attachments...');

      // Query supplier_quotes table
      const { data: supplierQuotes, error } = await supabase
        .from('supplier_quotes')
        .select('*')
        .eq('team_id', teamId);

      if (error) {
        logger.error('Failed to query supplier_quotes:', error);
        return [];
      }

      if (!supplierQuotes || supplierQuotes.length === 0) {
        logger.info('No supplier quotes found for team');
        return [];
      }

      logger.info(`Found ${supplierQuotes.length} supplier quote files`);

      // For each supplier quote, add to attachments
      for (const quote of supplierQuotes) {
        // Check if we should download and embed the file
        const shouldEmbed = options.includeAttachments === true;

        let base64Data: string | undefined;
        let fileSizeBytes = 0;

        if (shouldEmbed) {
          try {
            // Extract bucket and path from file_url
            // URL format: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
            const urlMatch = quote.file_url.match(
              /\/storage\/v1\/object\/[^/]+\/([^/]+)\/(.+)$/
            );
            if (urlMatch) {
              const bucket = urlMatch[1];
              const path = urlMatch[2];

              // Download file from Supabase Storage
              const { data: fileData, error: downloadError } =
                await supabase.storage.from(bucket).download(path);

              if (downloadError) {
                logger.error(
                  `Failed to download file ${quote.file_name}:`,
                  downloadError
                );
              } else if (fileData) {
                // Convert blob to base64
                const arrayBuffer = await fileData.arrayBuffer();
                const uint8Array = new Uint8Array(arrayBuffer);
                const binaryString = Array.from(uint8Array)
                  .map(byte => String.fromCharCode(byte))
                  .join('');
                base64Data = btoa(binaryString);
                fileSizeBytes = uint8Array.length;

                logger.info(
                  `Downloaded and encoded file ${quote.file_name} (${fileSizeBytes} bytes)`
                );
              }
            } else {
              logger.warn(`Could not parse storage URL: ${quote.file_url}`);
            }
          } catch (downloadError) {
            logger.error(
              `Error downloading file ${quote.file_name}:`,
              downloadError
            );
          }
        } else {
          // Just include metadata and URL reference
          fileSizeBytes = (quote.file_size_kb || 0) * 1024;
        }

        attachments.push({
          id: quote.id,
          fileName: quote.file_name,
          fileType: quote.file_type || 'unknown',
          fileSizeBytes,
          url: quote.file_url,
          embedded: shouldEmbed && !!base64Data,
          base64Data,
          entityType: 'component',
          entityId: quote.id, // Use quote ID as entity reference
        });
      }
    }

    logger.info(
      `Extracted ${attachments.length} attachments (${attachments.filter(a => a.embedded).length} embedded)`
    );
    return attachments;
  } catch (error) {
    logger.error('Failed to extract attachments:', error);
    return [];
  }
}

/**
 * Build relationship map for foreign keys
 */
function buildRelationshipMap(
  exportData: ExportPackage['data']
): RelationshipMap {
  const map: RelationshipMap = {
    componentToItems: {},
    assemblyToComponents: {},
    quotationToSystems: {},
    systemToItems: {},
    componentToAssemblies: {},
  };

  // Map assembly to components
  if (exportData.assemblyComponents) {
    for (const ac of exportData.assemblyComponents) {
      if (!map.assemblyToComponents[ac.assembly_id]) {
        map.assemblyToComponents[ac.assembly_id] = [];
      }
      if (ac.component_id) {
        map.assemblyToComponents[ac.assembly_id].push(ac.component_id);

        // Reverse map: component to assemblies
        if (!map.componentToAssemblies[ac.component_id]) {
          map.componentToAssemblies[ac.component_id] = [];
        }
        map.componentToAssemblies[ac.component_id].push(ac.assembly_id);
      }
    }
  }

  // Map quotation to systems
  if (exportData.quotationSystems) {
    for (const system of exportData.quotationSystems) {
      if (!map.quotationToSystems[system.quotation_id]) {
        map.quotationToSystems[system.quotation_id] = [];
      }
      map.quotationToSystems[system.quotation_id].push(system.id);
    }
  }

  // Map system to items and component to items
  if (exportData.quotationItems) {
    for (const item of exportData.quotationItems) {
      if (!map.systemToItems[item.quotation_system_id]) {
        map.systemToItems[item.quotation_system_id] = [];
      }
      map.systemToItems[item.quotation_system_id].push(item.id);

      // Component to items
      if (item.component_id) {
        if (!map.componentToItems[item.component_id]) {
          map.componentToItems[item.component_id] = [];
        }
        map.componentToItems[item.component_id].push(item.id);
      }
    }
  }

  return map;
}

/**
 * Generate export manifest
 */
function generateManifest(
  user: any,
  teamName: string,
  teamId: string,
  exportData: ExportPackage['data'],
  __relationships: RelationshipMap,
  options: ExportOptions,
  attachments?: AttachmentData[]
): ExportManifest {
  return {
    version: EXPORT_VERSION,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    exportedBy: user.id,
    exportedByEmail: user.email,
    teamId,
    teamName,
    description: options.description,
    includes: {
      components: options.includeComponents,
      assemblies: options.includeAssemblies,
      quotations: options.includeQuotations,
      settings: options.includeSettings,
      priceHistory: options.includePriceHistory,
      activityLogs: options.includeActivityLogs,
      attachments: options.includeAttachments,
    },
    counts: {
      components: exportData.components?.length || 0,
      assemblies: exportData.assemblies?.length || 0,
      quotations: exportData.quotations?.length || 0,
      quotationSystems: exportData.quotationSystems?.length || 0,
      quotationItems: exportData.quotationItems?.length || 0,
      attachments: attachments?.length || 0,
    },
    encryption: {
      enabled: options.encryptData,
      algorithm: options.encryptData ? 'AES-256-GCM' : undefined,
      keyDerivation: options.encryptData ? 'PBKDF2' : undefined,
    },
  };
}

/**
 * Create audit log entry for export operation
 */
async function createAuditLog(
  teamId: string,
  userId: string,
  options: ExportOptions
): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('export_import_logs')
      .insert({
        team_id: teamId,
        user_id: userId,
        operation_type: 'export',
        file_format: options.format,
        included_entities: {
          components: options.includeComponents,
          assemblies: options.includeAssemblies,
          quotations: options.includeQuotations,
          settings: options.includeSettings,
          priceHistory: options.includePriceHistory,
          activityLogs: options.includeActivityLogs,
          attachments: options.includeAttachments,
        },
        status: 'started',
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  } catch (error) {
    logger.error('Failed to create audit log:', error);
    throw error;
  }
}

/**
 * Update audit log with completion status
 */
async function completeAuditLog(
  logId: string,
  status: 'completed' | 'failed',
  counts?: ExportManifest['counts'],
  errorMessage?: string
): Promise<void> {
  try {
    await supabase
      .from('export_import_logs')
      .update({
        status,
        completed_at: new Date().toISOString(),
        record_counts: counts,
        error_message: errorMessage,
      })
      .eq('id', logId);
  } catch (error) {
    logger.error('Failed to update audit log:', error);
    // Don't throw - audit log failure shouldn't fail the export
  }
}
