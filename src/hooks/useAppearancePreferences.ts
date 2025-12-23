import { useState, useEffect } from 'react';
import { loadSetting } from '@/services/settingsService';
import { useTeam } from '@/contexts/TeamContext';
import { logger } from '@/lib/logger';

interface AppearancePreferences {
  itemsPerPage: number;
  compactMode: boolean;
  showTooltips: boolean;
  autoSave: boolean;
  confirmActions: boolean;
  gridDirection?: 'ltr' | 'rtl';
}

const DEFAULT_PREFERENCES: AppearancePreferences = {
  itemsPerPage: 25,
  compactMode: false,
  showTooltips: true,
  autoSave: true,
  confirmActions: true,
};

export function useAppearancePreferences() {
  const { currentTeam } = useTeam();
  const [preferences, setPreferences] =
    useState<AppearancePreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);

  // Load preferences on mount and team change
  useEffect(() => {
    loadPreferences();
  }, [currentTeam?.id]);

  // Listen for settings updates
  useEffect(() => {
    const handleUpdate = (event: CustomEvent) => {
      setPreferences(event.detail);
    };

    window.addEventListener(
      'appearance-preferences-updated',
      handleUpdate as EventListener
    );
    return () => {
      window.removeEventListener(
        'appearance-preferences-updated',
        handleUpdate as EventListener
      );
    };
  }, []);

  const loadPreferences = async () => {
    setLoading(true);
    try {
      const result = await loadSetting<AppearancePreferences>(
        'appearancePreferences',
        currentTeam?.id
      );
      if (result.success && result.data) {
        setPreferences(result.data);
      } else {
        setPreferences(DEFAULT_PREFERENCES);
      }
    } catch (error) {
      logger.error('Error loading appearance preferences:', error);
      setPreferences(DEFAULT_PREFERENCES);
    } finally {
      setLoading(false);
    }
  };

  return { preferences, loading };
}
