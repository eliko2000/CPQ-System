/**
 * Analytics Calculations Index
 * Re-exports all analytics calculation functions and types
 */

// Export all types
export * from './types';

// Export helper functions
export * from './helpers';

// Export calculation modules
export * from './revenueCalculations';
export * from './marginCalculations';
export * from './componentAnalytics';
export * from './laborMetrics';

// Note: Trend metrics, customer metrics, and utility functions
// are still available in ../analyticsCalculations.ts for backward compatibility
// These will be migrated in a future iteration
