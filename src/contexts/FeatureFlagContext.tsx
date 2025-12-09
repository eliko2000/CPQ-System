import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useTeam } from './TeamContext';
import { logger } from '../lib/logger';
import type {
  FeatureFlag,
  TeamFeatureAccess,
} from '../types/feature-flags.types';

export type { FeatureFlag, TeamFeatureAccess };

interface FeatureFlagContextValue {
  // Check if a feature is enabled for the current team
  isEnabled: (flagKey: string) => boolean;

  // All available feature flags
  flags: FeatureFlag[];

  // Team-specific overrides
  teamAccess: TeamFeatureAccess[];

  // Loading state
  loading: boolean;

  // Refresh flags (useful after admin changes)
  refresh: () => Promise<void>;
}

const FeatureFlagContext = createContext<FeatureFlagContextValue | undefined>(
  undefined
);

export function FeatureFlagProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentTeam } = useTeam();
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [teamAccess, setTeamAccess] = useState<TeamFeatureAccess[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFlags = async () => {
    try {
      setLoading(true);

      // Fetch all global feature flags
      const { data: flagsData, error: flagsError } = await supabase
        .from('feature_flags')
        .select('*')
        .order('flag_key', { ascending: true });

      if (flagsError) throw flagsError;

      setFlags(flagsData || []);

      // Fetch team-specific access settings if we have a team
      if (currentTeam) {
        const { data: accessData, error: accessError } = await supabase
          .from('team_feature_access')
          .select('*')
          .eq('team_id', currentTeam.id);

        if (accessError) throw accessError;

        setTeamAccess(accessData || []);
      } else {
        setTeamAccess([]);
      }
    } catch (error) {
      logger.error('Error fetching feature flags:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch flags on mount and when team changes
  useEffect(() => {
    fetchFlags();
  }, [currentTeam?.id]);

  // Subscribe to real-time changes to feature flags
  useEffect(() => {
    const flagsChannel = supabase
      .channel('feature_flags_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'feature_flags',
        },
        () => {
          fetchFlags();
        }
      )
      .subscribe();

    const teamAccessChannel = supabase
      .channel('team_feature_access_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_feature_access',
        },
        () => {
          fetchFlags();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(flagsChannel);
      supabase.removeChannel(teamAccessChannel);
    };
  }, [currentTeam?.id]);

  /**
   * Check if a feature is enabled for the current team
   * Logic:
   * 1. Find the global flag
   * 2. If global is disabled, return false
   * 3. If global is enabled, check for team-specific override
   * 4. If team override exists, use that value
   * 5. Otherwise, use global value
   */
  const isEnabled = (flagKey: string): boolean => {
    // Find the global flag
    const globalFlag = flags.find(f => f.flag_key === flagKey);

    if (!globalFlag) {
      // Flag doesn't exist, default to disabled
      logger.warn(`Feature flag not found: ${flagKey}`);
      return false;
    }

    // If global flag is disabled, always return false
    if (!globalFlag.is_enabled) {
      return false;
    }

    // If no team context, use global flag
    if (!currentTeam) {
      return globalFlag.is_enabled;
    }

    // Check for team-specific override
    const teamOverride = teamAccess.find(
      access => access.feature_flag_id === globalFlag.id
    );

    if (teamOverride !== undefined) {
      // Team override exists, use that value
      return teamOverride.is_enabled;
    }

    // No team override, use global value
    return globalFlag.is_enabled;
  };

  const refresh = async () => {
    await fetchFlags();
  };

  return (
    <FeatureFlagContext.Provider
      value={{
        isEnabled,
        flags,
        teamAccess,
        loading,
        refresh,
      }}
    >
      {children}
    </FeatureFlagContext.Provider>
  );
}

export function useFeatureFlags() {
  const context = useContext(FeatureFlagContext);
  if (context === undefined) {
    throw new Error(
      'useFeatureFlags must be used within a FeatureFlagProvider'
    );
  }
  return context;
}
