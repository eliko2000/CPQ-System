import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { DbComponent, Component } from '../types';
import { logger } from '../lib/logger';
import { useTeam } from '../contexts/TeamContext';

// Transform UI Component to DB format
// Only includes fields that are actually present in the input (for partial updates)
function componentToDb(component: Partial<Component>): Partial<DbComponent> {
  logger.debug('[useComponents] componentToDb INPUT', {
    name: component.name,
    msrpPrice: component.msrpPrice,
    msrpCurrency: component.msrpCurrency,
    partnerDiscountPercent: component.partnerDiscountPercent,
  });

  const result: Partial<DbComponent> = {};

  if (component.name !== undefined) result.name = component.name;
  if (component.manufacturer !== undefined)
    result.manufacturer = component.manufacturer;
  if (component.manufacturerPN !== undefined)
    result.manufacturer_part_number = component.manufacturerPN;
  if (component.category !== undefined) result.category = component.category;
  if (component.componentType !== undefined)
    result.component_type = component.componentType;
  // Handle laborSubtype: only set if defined
  if (component.laborSubtype !== undefined) {
    result.labor_subtype = component.laborSubtype;
  }
  if (component.description !== undefined)
    result.description = component.description;
  if (component.unitCostUSD !== undefined)
    result.unit_cost_usd = component.unitCostUSD;
  if (component.unitCostNIS !== undefined)
    result.unit_cost_ils = component.unitCostNIS;
  if (component.unitCostEUR !== undefined)
    result.unit_cost_eur = component.unitCostEUR;
  if (component.currency !== undefined) result.currency = component.currency;
  if (component.originalCost !== undefined)
    result.original_cost = component.originalCost;
  // MSRP fields
  if (component.msrpPrice !== undefined)
    result.msrp_price = component.msrpPrice;
  if (component.msrpCurrency !== undefined)
    result.msrp_currency = component.msrpCurrency;
  if (component.partnerDiscountPercent !== undefined)
    result.partner_discount_percent = component.partnerDiscountPercent;
  if (component.supplier !== undefined) result.supplier = component.supplier;
  if (component.notes !== undefined) result.notes = component.notes;

  logger.debug('[useComponents] componentToDb OUTPUT', {
    name: result.name,
    msrp_price: result.msrp_price,
    msrp_currency: result.msrp_currency,
    partner_discount_percent: result.partner_discount_percent,
  });

  return result;
}

export function useComponents() {
  const { currentTeam } = useTeam();
  const [components, setComponents] = useState<DbComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all components with optimized query
  const fetchComponents = useCallback(
    async (options?: { limit?: number; offset?: number }) => {
      if (!currentTeam) {
        setComponents([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // OPTIMIZATION: Select only essential fields for list view
        // Full details loaded on-demand when viewing/editing
        let query = supabase
          .from('components')
          .select(
            `
          id,
          name,
          manufacturer,
          manufacturer_part_number,
          category,
          component_type,
          labor_subtype,
          unit_cost_ils,
          unit_cost_usd,
          unit_cost_eur,
          currency,
          original_cost,
          msrp_price,
          msrp_currency,
          partner_discount_percent,
          supplier,
          created_at,
          updated_at
        `
          )
          .eq('team_id', currentTeam.id)
          .neq('component_type', 'labor') // Exclude labor components (managed separately)
          .order('name');

        // OPTIMIZATION: Support pagination for large datasets
        if (options?.limit) {
          query = query.range(
            options.offset || 0,
            (options.offset || 0) + options.limit - 1
          );
        }

        const { data, error } = await query;

        if (error) throw error;

        setComponents(data || []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to fetch components'
        );
      } finally {
        setLoading(false);
      }
    },
    [currentTeam]
  );

  // Add a new component
  const addComponent = async (
    component: Omit<Component, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!currentTeam) throw new Error('No active team');

    try {
      setError(null);

      // Transform to DB format
      const dbComponent = componentToDb(component);

      // Add team_id
      const componentWithTeam = {
        ...dbComponent,
        team_id: currentTeam.id,
      };

      const { data, error } = await supabase
        .from('components')
        .insert([componentWithTeam])
        .select()
        .single();

      if (error) throw error;

      logger.info('[useComponents] INSERT successful', {
        id: data.id,
        name: data.name,
        msrp_price: data.msrp_price,
        msrp_currency: data.msrp_currency,
        partner_discount_percent: data.partner_discount_percent,
      });

      // Update state immediately with new component
      setComponents(prev => [...prev, data]);

      // Also fetch fresh data to ensure consistency
      await fetchComponents();

      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add component');
      throw err;
    }
  };

  // Update an existing component
  const updateComponent = async (id: string, updates: Partial<Component>) => {
    if (!currentTeam) throw new Error('No active team');

    try {
      setError(null);

      // Debug logging
      logger.debug('🔍 updateComponent called with:', { id, updates });

      // Transform to DB format
      const dbUpdates = componentToDb(updates);
      logger.debug('🔍 Transformed to DB format:', dbUpdates);

      const { data, error } = await supabase
        .from('components')
        .update(dbUpdates)
        .eq('id', id)
        .eq('team_id', currentTeam.id)
        .select()
        .single();

      if (error) throw error;

      logger.info('✅ Database updated successfully:', data);

      // Update state with DB format
      setComponents(prev =>
        prev.map(comp => (comp.id === id ? { ...comp, ...data } : comp))
      );
      return data;
    } catch (err) {
      logger.error('❌ Update failed:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to update component'
      );
      throw err;
    }
  };

  // Delete a component
  const deleteComponent = async (id: string) => {
    if (!currentTeam) throw new Error('No active team');

    try {
      setError(null);

      const { error } = await supabase
        .from('components')
        .delete()
        .eq('id', id)
        .eq('team_id', currentTeam.id);

      if (error) throw error;

      setComponents(prev => prev.filter(comp => comp.id !== id));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete component'
      );
      throw err;
    }
  };

  // Search components
  const searchComponents = async (query: string) => {
    if (!currentTeam) return [];

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('components')
        .select('*')
        .eq('team_id', currentTeam.id)
        .or(
          `name.ilike.%${query}%,manufacturer.ilike.%${query}%,category.ilike.%${query}%`
        )
        .order('name');

      if (error) throw error;

      return data || [];
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to search components'
      );
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Get components by category
  const getComponentsByCategory = async (category: string) => {
    if (!currentTeam) return [];

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('components')
        .select('*')
        .eq('team_id', currentTeam.id)
        .eq('category', category)
        .order('name');

      if (error) throw error;

      return data || [];
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to fetch components by category'
      );
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Load components on mount and when team changes
  useEffect(() => {
    fetchComponents();
  }, [fetchComponents]);

  return {
    components,
    loading,
    error,
    fetchComponents,
    addComponent,
    updateComponent,
    deleteComponent,
    searchComponents,
    getComponentsByCategory,
  };
}
