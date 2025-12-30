// Hook for fetching quotation activity with user info for dashboard

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useTeam } from '../contexts/TeamContext';
import { logger } from '../lib/logger';

export interface QuotationActivity {
  id: string;
  team_id: string;
  quotation_number: string;
  customer_name: string;
  project_name?: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  total_price?: number;
  created_at: string;
  updated_at: string;
  status_changed_at?: string;
  updated_by?: string;
  updated_by_email?: string;
  updated_by_name?: string;
  updated_by_avatar?: string;
}

export function useQuotationActivity(limit: number = 10) {
  const { currentTeam } = useTeam();
  const [activities, setActivities] = useState<QuotationActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = useCallback(async () => {
    if (!currentTeam) {
      setActivities([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('quotation_activity')
        .select('*')
        .eq('team_id', currentTeam.id)
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      setActivities(data || []);
    } catch (err) {
      logger.error('Failed to fetch quotation activity:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch activity');
    } finally {
      setLoading(false);
    }
  }, [currentTeam, limit]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  return {
    activities,
    loading,
    error,
    refetch: fetchActivities,
  };
}
