/**
 * Numbering Service
 * Handles generation of project and quotation numbers with customizable formats
 */

import { supabase } from '../supabaseClient';
import {
  NumberingConfig,
  DEFAULT_NUMBERING_CONFIG,
} from '../types/numbering.types';
import { logger } from '../lib/logger';

/**
 * Get numbering configuration for a team
 * Loads team-wide setting (any team member's config)
 */
export async function getNumberingConfig(
  teamId: string
): Promise<NumberingConfig> {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('setting_value')
      .eq('team_id', teamId)
      .eq('setting_key', 'numbering_config')
      .limit(1)
      .maybeSingle();

    if (error) {
      logger.debug('Error fetching numbering config, using defaults:', error);
      return DEFAULT_NUMBERING_CONFIG;
    }

    if (!data) {
      logger.debug('No numbering config found, using defaults');
      return DEFAULT_NUMBERING_CONFIG;
    }

    return { ...DEFAULT_NUMBERING_CONFIG, ...data.setting_value };
  } catch (error) {
    logger.error('Error fetching numbering config:', error);
    return DEFAULT_NUMBERING_CONFIG;
  }
}

/**
 * Save numbering configuration for a team
 */
export async function saveNumberingConfig(
  userId: string,
  teamId: string,
  config: NumberingConfig
): Promise<void> {
  try {
    const { error } = await supabase.from('user_settings').upsert(
      {
        user_id: userId,
        team_id: teamId,
        setting_key: 'numbering_config',
        setting_value: config,
      },
      {
        onConflict: 'user_id,setting_key',
      }
    );

    if (error) throw error;

    logger.info('Numbering config saved successfully');
  } catch (error) {
    logger.error('Error saving numbering config:', error);
    throw error;
  }
}

/**
 * Generate next project number using database function
 * Falls back to client-side generation if database function doesn't exist
 */
export async function generateProjectNumber(teamId: string): Promise<string> {
  try {
    // Get configuration
    const config = await getNumberingConfig(teamId);

    // Try to call database function first
    const { data, error } = await supabase.rpc('generate_project_number', {
      p_team_id: teamId,
      p_prefix: config.projectPrefix,
      p_padding: config.padding,
      p_separator: config.separator,
    });

    // If function exists, use it
    if (!error && data) {
      logger.info(`Generated project number: ${data}`);
      return data;
    }

    // Fallback: Generate client-side if database function doesn't exist
    logger.warn(
      'Database function not found, using fallback number generation'
    );

    // Get count of existing projects for this team
    const { count, error: countError } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId);

    if (countError) {
      logger.error('Error counting projects:', countError);
      // Use timestamp as fallback
      const timestamp = Date.now();
      return `${config.projectPrefix}${config.separator}${timestamp}`;
    }

    // Generate number based on count
    const nextNumber = (count || 0) + 1;
    const paddedNumber = nextNumber.toString().padStart(config.padding, '0');
    const projectNumber = `${config.projectPrefix}${config.separator}${paddedNumber}`;

    logger.info(`Generated fallback project number: ${projectNumber}`);
    return projectNumber;
  } catch (error) {
    logger.error('Error generating project number:', error);
    throw new Error('Failed to generate project number');
  }
}

/**
 * Generate next quotation number for a project
 * Falls back to client-side generation if database function doesn't exist
 */
export async function generateQuotationNumber(
  teamId: string,
  projectNumber: string
): Promise<string> {
  try {
    // Get configuration
    const config = await getNumberingConfig(teamId);

    // Try to call database function first
    const { data, error } = await supabase.rpc('generate_quotation_number', {
      p_team_id: teamId,
      p_project_number: projectNumber,
      p_quotation_prefix: config.quotationPrefix,
      p_padding: config.padding,
      p_separator: config.separator,
    });

    // If function exists, use it
    if (!error && data) {
      logger.info(`Generated quotation number: ${data}`);
      return data;
    }

    // Fallback: Generate client-side if database function doesn't exist
    logger.warn(
      'Database function not found, using fallback quotation number generation'
    );

    // Get project by project_number
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('project_number', projectNumber)
      .eq('team_id', teamId)
      .limit(1);

    if (projectError || !projects || projects.length === 0) {
      logger.error('Error finding project:', projectError);
      // Use timestamp as fallback
      const timestamp = Date.now();
      return `${projectNumber}${config.separator}${config.quotationPrefix}${config.separator}${timestamp}`;
    }

    const projectId = projects[0].id;

    // Count existing quotations for this project
    const { count, error: countError } = await supabase
      .from('quotations')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('team_id', teamId);

    if (countError) {
      logger.error('Error counting quotations:', countError);
      // Use timestamp as fallback
      const timestamp = Date.now();
      return `${projectNumber}${config.separator}${config.quotationPrefix}${config.separator}${timestamp}`;
    }

    // Generate number based on count
    const nextNumber = (count || 0) + 1;
    const paddedNumber = nextNumber.toString().padStart(config.padding, '0');
    const quotationNumber = `${projectNumber}${config.separator}${config.quotationPrefix}${config.separator}${paddedNumber}`;

    logger.info(`Generated fallback quotation number: ${quotationNumber}`);
    return quotationNumber;
  } catch (error) {
    logger.error('Error generating quotation number:', error);
    throw new Error('Failed to generate quotation number');
  }
}

/**
 * Validate numbering configuration
 */
export function validateNumberingConfig(config: NumberingConfig): string[] {
  const errors: string[] = [];

  if (!config.projectPrefix || config.projectPrefix.length === 0) {
    errors.push('Project prefix cannot be empty');
  }

  if (!config.quotationPrefix || config.quotationPrefix.length === 0) {
    errors.push('Quotation prefix cannot be empty');
  }

  if (config.padding < 1 || config.padding > 10) {
    errors.push('Padding must be between 1 and 10 digits');
  }

  // Separator can be empty (for formats like "PRJ0001" instead of "PRJ-0001")
  // No validation needed for separator

  // Check for invalid characters
  const validPattern = /^[A-Za-z0-9]+$/;
  if (!validPattern.test(config.projectPrefix)) {
    errors.push('Project prefix can only contain letters and numbers');
  }

  if (!validPattern.test(config.quotationPrefix)) {
    errors.push('Quotation prefix can only contain letters and numbers');
  }

  return errors;
}

/**
 * Preview what numbers would look like with given configuration
 */
export function previewNumbers(config: NumberingConfig): {
  projectExample: string;
  quotationExample: string;
} {
  const exampleProjectNum = '1'.padStart(config.padding, '0');
  const exampleQuotationNum = '1'.padStart(config.padding, '0');

  const projectExample = `${config.projectPrefix}${config.separator}${exampleProjectNum}`;
  const quotationExample = `${projectExample}${config.separator}${config.quotationPrefix}${config.separator}${exampleQuotationNum}`;

  return {
    projectExample,
    quotationExample,
  };
}
