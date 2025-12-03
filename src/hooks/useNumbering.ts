/**
 * useNumbering Hook
 * Custom hook for managing project and quotation numbering
 */

import { useState, useEffect, useCallback } from 'react';
import { useTeam } from '../contexts/TeamContext';
import { useAuth } from '../contexts/AuthContext';
import {
  NumberingConfig,
  DEFAULT_NUMBERING_CONFIG,
} from '../types/numbering.types';
import {
  getNumberingConfig,
  saveNumberingConfig,
  generateProjectNumber,
  generateQuotationNumber,
  validateNumberingConfig,
  previewNumbers,
} from '../services/numberingService';
import { logger } from '../lib/logger';

export function useNumbering() {
  const { currentTeam } = useTeam();
  const { user } = useAuth();
  const [config, setConfig] = useState<NumberingConfig>(
    DEFAULT_NUMBERING_CONFIG
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  // Load configuration on mount
  useEffect(() => {
    if (!currentTeam) return;

    const loadConfig = async () => {
      try {
        setLoading(true);
        const loadedConfig = await getNumberingConfig(currentTeam.id);
        setConfig(loadedConfig);
      } catch (err) {
        logger.error('Failed to load numbering config:', err);
        setError('Failed to load numbering configuration');
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, [currentTeam]);

  // Update configuration
  const updateConfig = useCallback(
    async (newConfig: NumberingConfig) => {
      if (!currentTeam) {
        setError('No active team');
        return;
      }

      if (!user) {
        setError('No authenticated user');
        return;
      }

      // Validate configuration
      const errors = validateNumberingConfig(newConfig);
      if (errors.length > 0) {
        setError(errors.join(', '));
        return;
      }

      try {
        setLoading(true);
        setError(undefined);
        await saveNumberingConfig(user.id, currentTeam.id, newConfig);
        setConfig(newConfig);
      } catch (err) {
        logger.error('Failed to save numbering config:', err);
        setError('Failed to save numbering configuration');
      } finally {
        setLoading(false);
      }
    },
    [currentTeam, user]
  );

  // Generate new project number
  const getNextProjectNumber = useCallback(async (): Promise<
    string | undefined
  > => {
    if (!currentTeam) {
      setError('No active team');
      return undefined;
    }

    try {
      setError(undefined);
      const number = await generateProjectNumber(currentTeam.id);
      return number;
    } catch (err) {
      logger.error('Failed to generate project number:', err);
      setError('Failed to generate project number');
      return undefined;
    }
  }, [currentTeam]);

  // Generate new quotation number for a project
  const getNextQuotationNumber = useCallback(
    async (projectNumber: string): Promise<string | undefined> => {
      if (!currentTeam) {
        setError('No active team');
        return undefined;
      }

      if (!projectNumber) {
        setError('Project number is required');
        return undefined;
      }

      try {
        setError(undefined);
        const number = await generateQuotationNumber(
          currentTeam.id,
          projectNumber
        );
        return number;
      } catch (err) {
        logger.error('Failed to generate quotation number:', err);
        setError('Failed to generate quotation number');
        return undefined;
      }
    },
    [currentTeam]
  );

  // Get preview of what numbers would look like
  const getPreview = useCallback(() => {
    return previewNumbers(config);
  }, [config]);

  return {
    config,
    loading,
    error,
    updateConfig,
    getNextProjectNumber,
    getNextQuotationNumber,
    getPreview,
  };
}
