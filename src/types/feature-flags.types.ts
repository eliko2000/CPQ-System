/**
 * Shared type definitions for feature flags system
 */

export interface FeatureFlag {
  id: string;
  flag_key: string;
  flag_name: string;
  description: string | null;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface TeamFeatureAccess {
  id: string;
  team_id: string;
  feature_flag_id: string;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}
