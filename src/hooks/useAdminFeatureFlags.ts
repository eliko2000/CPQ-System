import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { logger } from '../lib/logger';
import type { FeatureFlag } from '../types/feature-flags.types';

export function useAdminFeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFlags = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .order('flag_name');

      if (error) throw error;

      setFlags(data || []);
    } catch (err: any) {
      logger.error('Error fetching feature flags:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleFlag = async (id: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('feature_flags')
        .update({ is_enabled: !currentState })
        .eq('id', id);

      if (error) throw error;

      // Optimistic update
      setFlags(prev =>
        prev.map(flag =>
          flag.id === id ? { ...flag, is_enabled: !currentState } : flag
        )
      );

      return true;
    } catch (err: any) {
      logger.error('Error toggling feature flag:', err);
      setError(err.message);
      return false;
    }
  };

  const updateFlag = async (id: string, updates: Partial<FeatureFlag>) => {
    try {
      const { error } = await supabase
        .from('feature_flags')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      setFlags(prev =>
        prev.map(flag => (flag.id === id ? { ...flag, ...updates } : flag))
      );

      return true;
    } catch (err: any) {
      logger.error('Error updating feature flag:', err);
      setError(err.message);
      return false;
    }
  };

  const createFlag = async (
    flag: Omit<FeatureFlag, 'id' | 'created_at' | 'updated_at'>
  ) => {
    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .insert([flag])
        .select()
        .single();

      if (error) throw error;

      setFlags(prev => [...prev, data]);
      return data;
    } catch (err: any) {
      logger.error('Error creating feature flag:', err);
      setError(err.message);
      return null;
    }
  };

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  return {
    flags,
    loading,
    error,
    fetchFlags,
    toggleFlag,
    updateFlag,
    createFlag,
  };
}
