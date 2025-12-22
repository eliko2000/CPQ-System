import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import {
  LaborType,
  DbLaborType,
  LaborTypeFormData,
} from '../types/labor.types';
import { useTeam } from '../contexts/TeamContext';
import { logger } from '@/lib/logger';

/**
 * Hook for managing labor types (internal team labor vs external contractors)
 * Separate from components library for cleaner architecture
 */
export function useLaborTypes() {
  const { currentTeam } = useTeam();
  const [laborTypes, setLaborTypes] = useState<LaborType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Convert DB labor type to frontend type
  const dbToLaborType = useCallback((db: DbLaborType): LaborType => {
    return {
      id: db.id,
      name: db.name,
      laborSubtype: db.labor_subtype,
      isInternalLabor: db.is_internal_labor,
      externalRate: db.external_rate,
      description: db.description,
      isActive: db.is_active,
      createdAt: db.created_at,
      updatedAt: db.updated_at,
    };
  }, []);

  // Load labor types from Supabase
  const loadLaborTypes = useCallback(async () => {
    if (!currentTeam?.id) {
      logger.warn('No current team - skipping labor types load', {
        currentTeam,
      });
      setLaborTypes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      logger.info('Loading labor types for team:', currentTeam.id);
      const { data, error: fetchError } = await supabase
        .from('labor_types')
        .select('*')
        .eq('team_id', currentTeam.id)
        .eq('is_active', true)
        .order('name');

      if (fetchError) {
        logger.error('Supabase error loading labor types:', fetchError);
        throw fetchError;
      }

      logger.info('Raw labor types data from DB:', data);
      const laborTypesData = (data || []).map(dbToLaborType);
      setLaborTypes(laborTypesData);

      logger.info(`Loaded ${laborTypesData.length} labor types`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      logger.error('Error loading labor types:', errorMessage);
      setError(errorMessage);
      setLaborTypes([]);
    } finally {
      setLoading(false);
    }
  }, [currentTeam?.id, dbToLaborType]);

  // Add new labor type
  const addLaborType = useCallback(
    async (formData: LaborTypeFormData): Promise<LaborType> => {
      if (!currentTeam?.id) {
        throw new Error('No team selected');
      }

      // Validate external labor has a rate
      if (!formData.isInternalLabor && !formData.externalRate) {
        throw new Error('External labor must have a rate per day');
      }

      try {
        const { data, error: insertError } = await supabase
          .from('labor_types')
          .insert({
            team_id: currentTeam.id,
            name: formData.name,
            labor_subtype: formData.laborSubtype,
            is_internal_labor: formData.isInternalLabor,
            external_rate: formData.externalRate,
            description: formData.description,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        if (!data) throw new Error('No data returned from insert');

        logger.info(`Added labor type: ${formData.name}`);

        // Reload to refresh list
        await loadLaborTypes();

        return dbToLaborType(data);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        logger.error('Error adding labor type:', errorMessage);
        throw new Error(`Failed to add labor type: ${errorMessage}`);
      }
    },
    [currentTeam?.id, loadLaborTypes, dbToLaborType]
  );

  // Update existing labor type
  const updateLaborType = useCallback(
    async (id: string, updates: Partial<LaborTypeFormData>): Promise<void> => {
      // Validate if changing to external labor, must have rate
      if (
        updates.isInternalLabor === false &&
        !updates.externalRate &&
        updates.externalRate !== 0
      ) {
        // Check if the existing labor type has an external rate
        const existing = laborTypes.find(lt => lt.id === id);
        if (!existing?.externalRate) {
          throw new Error('External labor must have a rate per day');
        }
      }

      try {
        const updateData: Partial<DbLaborType> = {};

        if (updates.name !== undefined) updateData.name = updates.name;
        if (updates.laborSubtype !== undefined)
          updateData.labor_subtype = updates.laborSubtype;
        if (updates.isInternalLabor !== undefined)
          updateData.is_internal_labor = updates.isInternalLabor;
        if (updates.externalRate !== undefined)
          updateData.external_rate = updates.externalRate;
        if (updates.description !== undefined)
          updateData.description = updates.description;

        const { error: updateError } = await supabase
          .from('labor_types')
          .update(updateData)
          .eq('id', id);

        if (updateError) throw updateError;

        logger.info(`Updated labor type: ${id}`);

        // Reload to refresh list
        await loadLaborTypes();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        logger.error('Error updating labor type:', errorMessage);
        throw new Error(`Failed to update labor type: ${errorMessage}`);
      }
    },
    [laborTypes, loadLaborTypes]
  );

  // Soft delete labor type
  const deleteLaborType = useCallback(
    async (id: string): Promise<void> => {
      try {
        const { error: deleteError } = await supabase
          .from('labor_types')
          .update({ is_active: false })
          .eq('id', id);

        if (deleteError) throw deleteError;

        logger.info(`Deleted labor type: ${id}`);

        // Reload to refresh list
        await loadLaborTypes();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        logger.error('Error deleting labor type:', errorMessage);
        throw new Error(`Failed to delete labor type: ${errorMessage}`);
      }
    },
    [loadLaborTypes]
  );

  // Load labor types when team changes
  useEffect(() => {
    loadLaborTypes();
  }, [loadLaborTypes]);

  return {
    laborTypes,
    loading,
    error,
    addLaborType,
    updateLaborType,
    deleteLaborType,
    reload: loadLaborTypes,
  };
}
