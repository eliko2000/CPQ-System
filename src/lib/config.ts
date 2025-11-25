/**
 * Environment Configuration and Validation
 *
 * This module validates required environment variables on app startup
 * and provides a type-safe configuration interface.
 *
 * IMPORTANT:
 * - All required env vars must be present or the app will fail gracefully
 * - Optional vars have defaults or can be undefined
 * - This prevents runtime errors from missing configuration
 */

import { logger } from './logger';

// Environment types
export type Environment = 'development' | 'production' | 'test';

// Configuration interface
export interface Config {
  supabase: {
    url: string;
    anonKey: string;
  };
  anthropic: {
    apiKey: string | null; // Optional - null if not provided
  };
  env: Environment;
  isDevelopment: boolean;
  isProduction: boolean;
  devMode: boolean;
  apiUrl: string;
}

/**
 * Get required environment variable
 * Throws error if not found to prevent app startup with missing config
 */
function getRequiredEnv(key: string): string {
  const value = import.meta.env[key];

  if (
    !value ||
    value === '' ||
    value.includes('placeholder') ||
    value.includes('your-')
  ) {
    const error = `Missing or invalid required environment variable: ${key}

Please check your .env.local file:
1. Copy .env.example to .env.local if you haven't already
2. Fill in the actual value for ${key}
3. Restart the development server

See README.md for setup instructions.`;

    logger.error(`Environment validation failed: ${key}`);
    throw new Error(error);
  }

  return value;
}

/**
 * Get optional environment variable
 * Returns default value if not found
 */
function getOptionalEnv(key: string, defaultValue: string = ''): string {
  const value = import.meta.env[key];
  return value || defaultValue;
}

/**
 * Validate environment configuration
 * Called once during app initialization
 */
function validateConfig(): Config {
  logger.info('Validating environment configuration...');

  try {
    // Required: Supabase configuration
    const supabaseUrl = getRequiredEnv('VITE_SUPABASE_URL');
    const supabaseAnonKey = getRequiredEnv('VITE_SUPABASE_ANON_KEY');

    // Optional: Anthropic API (AI Vision features can be disabled)
    let anthropicApiKey: string | null = null;
    const anthropicKeyValue = import.meta.env.VITE_ANTHROPIC_API_KEY;

    if (
      anthropicKeyValue &&
      anthropicKeyValue !== '' &&
      !anthropicKeyValue.includes('your-') &&
      anthropicKeyValue.startsWith('sk-ant-')
    ) {
      anthropicApiKey = anthropicKeyValue;
      logger.info('Anthropic API key found - AI Vision features enabled');
    } else {
      logger.warn(
        'Anthropic API key not configured - AI Vision features will be disabled'
      );
      logger.warn('Excel and CSV parsing will still work normally');
    }

    // Environment detection
    const mode = import.meta.env.MODE || 'development';
    const env: Environment =
      mode === 'production'
        ? 'production'
        : mode === 'test'
          ? 'test'
          : 'development';

    // Development flags
    const devMode = getOptionalEnv('VITE_DEV_MODE', 'false') === 'true';
    const apiUrl = getOptionalEnv('VITE_API_URL', 'http://localhost:3001');

    const config: Config = {
      supabase: {
        url: supabaseUrl,
        anonKey: supabaseAnonKey,
      },
      anthropic: {
        apiKey: anthropicApiKey,
      },
      env,
      isDevelopment: env === 'development',
      isProduction: env === 'production',
      devMode,
      apiUrl,
    };

    logger.info(`Environment: ${env}`);
    logger.info(`Development mode: ${devMode}`);
    logger.info('Environment configuration validated successfully');

    return config;
  } catch (error) {
    // Log error and re-throw to prevent app from starting
    logger.error('Environment configuration validation failed', error);
    throw error;
  }
}

/**
 * Validate API key format
 */
export function isValidApiKey(
  key: string | null | undefined,
  prefix: string
): boolean {
  return (
    !!key &&
    key.startsWith(prefix) &&
    !key.includes('your-') &&
    !key.includes('placeholder')
  );
}

/**
 * Validate Supabase URL format
 */
export function isValidSupabaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname.endsWith('.supabase.co') ||
      parsed.hostname === 'localhost'
    );
  } catch {
    return false;
  }
}

// Validate and export configuration
// This will run once when the module is imported
// If validation fails, the app won't start
export const config: Config = validateConfig();

// Export for tests
export { validateConfig, getRequiredEnv, getOptionalEnv };
