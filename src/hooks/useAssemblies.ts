/**
 * useAssemblies Hook
 *
 * Manages assembly data with Supabase backend integration.
 * Handles CRUD operations and real-time data synchronization.
 */

import { useState, useEffect, useCallback } from 'react';
import type {
  Assembly,
  Assembly_Component,
  DbAssembly,
  _DbAssembly_Component,
  _Component,
} from '../types';
import { supabase } from '../supabaseClient';
import { logger } from '../lib/logger';

interface UseAssembliesReturn {
  assemblies: Assembly[];
  loading: boolean;
  error: string | null;
  addAssembly: (
    name: string,
    components: Array<{ componentId: string; quantity: number }>,
    description?: string,
    notes?: string
  ) => Promise<void>;
  updateAssembly: (
    id: string,
    updates: {
      name?: string;
      description?: string;
      notes?: string;
      components?: Array<{ componentId: string; quantity: number }>;
    }
  ) => Promise<void>;
  deleteAssembly: (id: string) => Promise<void>;
  checkComponentUsage: (componentId: string) => Promise<{
    isUsed: boolean;
    assemblies: Array<{ id: string; name: string }>;
  }>;
  refreshAssemblies: () => Promise<void>;
}

export function useAssemblies(): UseAssembliesReturn {
  const [assemblies, setAssemblies] = useState<Assembly[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all assemblies with their components
   */
  const fetchAssemblies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch assemblies
      const { data: assembliesData, error: assembliesError } = await supabase
        .from('assemblies')
        .select('*')
        .order('created_at', { ascending: false });

      if (assembliesError) throw assembliesError;

      if (!assembliesData || assembliesData.length === 0) {
        setAssemblies([]);
        return;
      }

      // Fetch assembly components with component details
      const { data: componentsData, error: componentsError } = await supabase
        .from('assembly_components')
        .select(
          `
          *,
          component:components(*)
        `
        )
        .in(
          'assembly_id',
          assembliesData.map((a) => a.id)
        )
        .order('sort_order', { ascending: true });

      if (componentsError) throw componentsError;

      // Map to Assembly[] format
      const mappedAssemblies: Assembly[] = assembliesData.map((dbAssembly: DbAssembly) => {
        const assemblyComponents = (componentsData || [])
          .filter((ac: any) => ac.assembly_id === dbAssembly.id)
          .map((ac: any) => {
            const assemblyComp: AssemblyComponent = {
              id: ac.id,
              assemblyId: ac.assembly_id,
              componentId: ac.component_id,
              componentName: ac.component_name,
              componentManufacturer: ac.component_manufacturer,
              componentPartNumber: ac.component_part_number,
              quantity: parseFloat(ac.quantity),
              sortOrder: ac.sort_order || 0,
            };

            // Add component data if exists
            if (ac.component) {
              assemblyComp.component = {
                id: ac.component.id,
                name: ac.component.name,
                description: ac.component.description || '',
                category: ac.component.category || 'Other',
                componentType: ac.component.component_type || 'hardware',
                laborSubtype: ac.component.labor_subtype,
                productType: ac.component.category || 'Other',
                manufacturer: ac.component.manufacturer || '',
                manufacturerPN: ac.component.manufacturer_part_number || '',
                supplier: ac.component.supplier || '',
                unitCostNIS: parseFloat(ac.component.unit_cost_ils || 0),
                unitCostUSD: parseFloat(ac.component.unit_cost_usd || 0),
                unitCostEUR: parseFloat(ac.component.unit_cost_eur || 0),
                currency: ac.component.currency || 'NIS',
                originalCost: parseFloat(ac.component.original_cost || ac.component.unit_cost_ils || 0),
                quoteDate: ac.component.created_at?.split('T')[0] || '',
                quoteFileUrl: '',
                notes: ac.component.notes,
                createdAt: ac.component.created_at,
                updatedAt: ac.component.updated_at,
              };
            }

            return assemblyComp;
          });

        return {
          id: dbAssembly.id,
          name: dbAssembly.name,
          description: dbAssembly.description,
          isComplete: dbAssembly.is_complete,
          notes: dbAssembly.notes,
          components: assemblyComponents,
          createdAt: dbAssembly.created_at,
          updatedAt: dbAssembly.updated_at,
        };
      });

      setAssemblies(mappedAssemblies);
    } catch (err: any) {
      logger.error('Error fetching assemblies:', err);
      setError(err.message || 'Failed to load assemblies');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Add a new assembly
   */
  const addAssembly = useCallback(
    async (
      name: string,
      components: Array<{ componentId: string; quantity: number }>,
      description?: string,
      notes?: string
    ) => {
      try {
        setError(null);

        // Fetch component details for snapshots
        const { data: componentDetails, error: fetchError } = await supabase
          .from('components')
          .select('id, name, manufacturer, manufacturer_part_number')
          .in(
            'id',
            components.map((c) => c.componentId)
          );

        if (fetchError) throw fetchError;

        // Create assembly
        const { data: assemblyData, error: assemblyError } = await supabase
          .from('assemblies')
          .insert({
            name,
            description,
            notes,
            is_complete: true,
          })
          .select()
          .single();

        if (assemblyError) throw assemblyError;

        // Create assembly components
        const assemblyComponents = components.map((comp, index) => {
          const componentDetail = componentDetails?.find((c) => c.id === comp.componentId);
          return {
            assembly_id: assemblyData.id,
            component_id: comp.componentId,
            component_name: componentDetail?.name || 'Unknown',
            component_manufacturer: componentDetail?.manufacturer,
            component_part_number: componentDetail?.manufacturer_part_number,
            quantity: comp.quantity,
            sort_order: index,
          };
        });

        const { error: componentsError } = await supabase
          .from('assembly_components')
          .insert(assemblyComponents);

        if (componentsError) throw componentsError;

        // Refresh assemblies
        await fetchAssemblies();
      } catch (err: any) {
        logger.error('Error adding assembly:', err);
        setError(err.message || 'Failed to add assembly');
        throw err;
      }
    },
    [fetchAssemblies]
  );

  /**
   * Update an existing assembly
   */
  const updateAssembly = useCallback(
    async (
      id: string,
      updates: {
        name?: string;
        description?: string;
        notes?: string;
        components?: Array<{ componentId: string; quantity: number }>;
      }
    ) => {
      try {
        setError(null);

        // Update assembly metadata
        const assemblyUpdates: Partial<DbAssembly> = {};
        if (updates.name !== undefined) assemblyUpdates.name = updates.name;
        if (updates.description !== undefined) assemblyUpdates.description = updates.description;
        if (updates.notes !== undefined) assemblyUpdates.notes = updates.notes;

        if (Object.keys(assemblyUpdates).length > 0) {
          const { error: updateError } = await supabase
            .from('assemblies')
            .update(assemblyUpdates)
            .eq('id', id);

          if (updateError) throw updateError;
        }

        // Update components if provided
        if (updates.components) {
          // Delete existing components
          const { error: deleteError } = await supabase
            .from('assembly_components')
            .delete()
            .eq('assembly_id', id);

          if (deleteError) throw deleteError;

          // Fetch component details for snapshots
          const { data: componentDetails, error: fetchError } = await supabase
            .from('components')
            .select('id, name, manufacturer, manufacturer_part_number')
            .in(
              'id',
              updates.components.map((c) => c.componentId)
            );

          if (fetchError) throw fetchError;

          // Insert new components
          const assemblyComponents = updates.components.map((comp, index) => {
            const componentDetail = componentDetails?.find((c) => c.id === comp.componentId);
            return {
              assembly_id: id,
              component_id: comp.componentId,
              component_name: componentDetail?.name || 'Unknown',
              component_manufacturer: componentDetail?.manufacturer,
              component_part_number: componentDetail?.manufacturer_part_number,
              quantity: comp.quantity,
              sort_order: index,
            };
          });

          const { error: insertError } = await supabase
            .from('assembly_components')
            .insert(assemblyComponents);

          if (insertError) throw insertError;

          // Check if assembly is still complete
          const isComplete = updates.components.every((c) =>
            componentDetails?.some((d) => d.id === c.componentId)
          );

          await supabase.from('assemblies').update({ is_complete: isComplete }).eq('id', id);
        }

        // Refresh assemblies
        await fetchAssemblies();
      } catch (err: any) {
        logger.error('Error updating assembly:', err);
        setError(err.message || 'Failed to update assembly');
        throw err;
      }
    },
    [fetchAssemblies]
  );

  /**
   * Delete an assembly
   */
  const deleteAssembly = useCallback(
    async (id: string) => {
      try {
        setError(null);

        const { error: deleteError } = await supabase.from('assemblies').delete().eq('id', id);

        if (deleteError) throw deleteError;

        // Refresh assemblies
        await fetchAssemblies();
      } catch (err: any) {
        logger.error('Error deleting assembly:', err);
        setError(err.message || 'Failed to delete assembly');
        throw err;
      }
    },
    [fetchAssemblies]
  );

  /**
   * Check if a component is used in any assemblies
   */
  const checkComponentUsage = useCallback(async (componentId: string) => {
    try {
      const { data, error } = await supabase
        .from('assembly_components')
        .select(
          `
          assembly_id,
          assembly:assemblies(id, name)
        `
        )
        .eq('component_id', componentId);

      if (error) throw error;

      const assemblies = (data || [])
        .map((item: any) => item.assembly)
        .filter((a: any) => a !== null)
        .map((a: any) => ({ id: a.id, name: a.name }));

      return {
        isUsed: assemblies.length > 0,
        assemblies,
      };
    } catch (err: any) {
      logger.error('Error checking component usage:', err);
      return { isUsed: false, assemblies: [] };
    }
  }, []);

  /**
   * Refresh assemblies manually
   */
  const refreshAssemblies = useCallback(async () => {
    await fetchAssemblies();
  }, [fetchAssemblies]);

  // Fetch assemblies on mount
  useEffect(() => {
    fetchAssemblies();
  }, [fetchAssemblies]);

  return {
    assemblies,
    loading,
    error,
    addAssembly,
    updateAssembly,
    deleteAssembly,
    checkComponentUsage,
    refreshAssemblies,
  };
}
