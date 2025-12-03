import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { DbQuotation, DbQuotationSystem, DbQuotationItem } from '../types';
import { logger } from '../lib/logger';
import { useTeam } from '../contexts/TeamContext';

export function useQuotations() {
  const { currentTeam } = useTeam();
  const [quotations, setQuotations] = useState<DbQuotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all quotations with their systems and items
  const fetchQuotations = useCallback(async () => {
    if (!currentTeam) {
      setQuotations([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('quotations')
        .select(
          `
          *,
          quotation_systems (
            *,
            quotation_items (
              *,
              component:components (*)
            )
          )
        `
        )
        .eq('team_id', currentTeam.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setQuotations(data || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch quotations'
      );
    } finally {
      setLoading(false);
    }
  }, [currentTeam]);

  // Add a new quotation
  const addQuotation = async (
    quotation: Omit<DbQuotation, 'id' | 'created_at' | 'updated_at' | 'team_id'>
  ) => {
    if (!currentTeam) {
      logger.error('Cannot add quotation: No active team');
      throw new Error('No active team');
    }

    try {
      setError(null);

      const quotationWithTeam = {
        ...quotation,
        team_id: currentTeam.id,
      };

      logger.debug('Adding quotation with team_id:', {
        team_id: currentTeam.id,
        quotation_number: quotation.quotation_number,
      });

      const { data, error } = await supabase
        .from('quotations')
        .insert([quotationWithTeam])
        .select(
          `
          *,
          quotation_systems (
            *,
            quotation_items (
              *,
              component:components (*)
            )
          )
        `
        )
        .single();

      if (error) {
        logger.error('Quotation insert error:', error);
        throw error;
      }

      setQuotations(prev => [data, ...prev]);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add quotation');
      throw err;
    }
  };

  // Update an existing quotation
  const updateQuotation = async (id: string, updates: Partial<DbQuotation>) => {
    if (!currentTeam) throw new Error('No active team');

    try {
      setError(null);
      logger.debug('useQuotations - updateQuotation called:', { id, updates });

      const { data, error } = await supabase
        .from('quotations')
        .update(updates)
        .eq('id', id)
        .eq('team_id', currentTeam.id) // Ensure team ownership
        .select()
        .single();

      if (error) throw error;

      logger.debug('useQuotations - Database updated, returned data:', data);

      // Only update the changed fields, preserve nested quotation_systems
      setQuotations(prev => {
        const updated = prev.map(quot => {
          if (quot.id === id) {
            // Merge only the updated fields, don't overwrite nested data
            const merged = { ...quot, ...updates };
            logger.debug('useQuotations - Merging quotation:', {
              old: quot,
              updates,
              merged,
            });
            return merged;
          }
          return quot;
        });
        logger.debug('useQuotations - State updated with new quotations array');
        return updated;
      });
      return data;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update quotation'
      );
      throw err;
    }
  };

  // Delete a quotation
  const deleteQuotation = async (id: string) => {
    if (!currentTeam) throw new Error('No active team');

    try {
      setError(null);

      const { error } = await supabase
        .from('quotations')
        .delete()
        .eq('id', id)
        .eq('team_id', currentTeam.id); // Ensure team ownership

      if (error) throw error;

      setQuotations(prev => prev.filter(quot => quot.id !== id));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete quotation'
      );
      throw err;
    }
  };

  // Get a single quotation with all related data
  const getQuotation = async (id: string) => {
    if (!currentTeam) return null;

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('quotations')
        .select(
          `
          *,
          quotation_systems (
            *,
            quotation_items (
              *,
              component:components (*)
            )
          )
        `
        )
        .eq('id', id)
        .eq('team_id', currentTeam.id) // Ensure team ownership
        .single();

      if (error) throw error;

      return data;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch quotation'
      );
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Add a system to a quotation
  const addQuotationSystem = async (
    system: Omit<
      DbQuotationSystem,
      'id' | 'created_at' | 'updated_at' | 'team_id'
    >
  ) => {
    if (!currentTeam) throw new Error('No active team');

    try {
      setError(null);

      const systemWithTeam = {
        ...system,
        team_id: currentTeam.id,
      };

      const { data, error } = await supabase
        .from('quotation_systems')
        .insert([systemWithTeam])
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setQuotations(prev =>
        prev.map(quot =>
          quot.id === system.quotation_id
            ? {
                ...quot,
                quotation_systems: [...(quot.quotation_systems || []), data],
              }
            : quot
        )
      );

      return data;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to add quotation system'
      );
      throw err;
    }
  };

  // Update a quotation system
  const updateQuotationSystem = async (
    id: string,
    updates: Partial<DbQuotationSystem>
  ) => {
    if (!currentTeam) throw new Error('No active team');

    try {
      setError(null);

      const { data, error } = await supabase
        .from('quotation_systems')
        .update(updates)
        .eq('id', id)
        .eq('team_id', currentTeam.id)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setQuotations(prev =>
        prev.map(quot => ({
          ...quot,
          quotation_systems:
            quot.quotation_systems?.map(sys =>
              sys.id === id ? { ...sys, ...data } : sys
            ) || [],
        }))
      );

      return data;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update quotation system'
      );
      throw err;
    }
  };

  // Delete a quotation system
  const deleteQuotationSystem = async (id: string) => {
    if (!currentTeam) throw new Error('No active team');

    try {
      setError(null);

      const { error } = await supabase
        .from('quotation_systems')
        .delete()
        .eq('id', id)
        .eq('team_id', currentTeam.id);

      if (error) throw error;

      // Update local state
      setQuotations(prev =>
        prev.map(quot => ({
          ...quot,
          quotation_systems:
            quot.quotation_systems?.filter(sys => sys.id !== id) || [],
        }))
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete quotation system'
      );
      throw err;
    }
  };

  // Add an item to a quotation system
  const addQuotationItem = async (
    item: Omit<DbQuotationItem, 'id' | 'created_at' | 'updated_at' | 'team_id'>
  ) => {
    if (!currentTeam) throw new Error('No active team');

    try {
      setError(null);

      const itemWithTeam = {
        ...item,
        team_id: currentTeam.id,
      };

      const { data, error } = await supabase
        .from('quotation_items')
        .insert([itemWithTeam])
        .select(
          `
          *,
          component:components (*)
        `
        )
        .single();

      if (error) throw error;

      // Update local state
      setQuotations(prev =>
        prev.map(quot => ({
          ...quot,
          quotation_systems:
            quot.quotation_systems?.map(sys =>
              sys.id === item.quotation_system_id
                ? {
                    ...sys,
                    quotation_items: [...(sys.quotation_items || []), data],
                  }
                : sys
            ) || [],
        }))
      );

      return data;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to add quotation item'
      );
      throw err;
    }
  };

  // Update a quotation item
  const updateQuotationItem = async (
    id: string,
    updates: Partial<DbQuotationItem>
  ) => {
    if (!currentTeam) throw new Error('No active team');

    try {
      setError(null);

      const { data, error } = await supabase
        .from('quotation_items')
        .update(updates)
        .eq('id', id)
        .eq('team_id', currentTeam.id)
        .select(
          `
          *,
          component:components (*)
        `
        )
        .single();

      if (error) throw error;

      // Update local state
      setQuotations(prev =>
        prev.map(quot => ({
          ...quot,
          quotation_systems:
            quot.quotation_systems?.map(sys => ({
              ...sys,
              quotation_items:
                sys.quotation_items?.map(item =>
                  item.id === id ? { ...item, ...data } : item
                ) || [],
            })) || [],
        }))
      );

      return data;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update quotation item'
      );
      throw err;
    }
  };

  // Delete a quotation item
  const deleteQuotationItem = async (id: string) => {
    if (!currentTeam) throw new Error('No active team');

    try {
      setError(null);

      const { error } = await supabase
        .from('quotation_items')
        .delete()
        .eq('id', id)
        .eq('team_id', currentTeam.id);

      if (error) throw error;

      // Update local state
      setQuotations(prev =>
        prev.map(quot => ({
          ...quot,
          quotation_systems:
            quot.quotation_systems?.map(sys => ({
              ...sys,
              quotation_items:
                sys.quotation_items?.filter(item => item.id !== id) || [],
            })) || [],
        }))
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete quotation item'
      );
      throw err;
    }
  };

  // Duplicate quotation with all systems and items
  const duplicateQuotation = async (
    sourceQuotationId: string,
    newQuotationNumber: string,
    newVersion?: number
  ) => {
    if (!currentTeam) throw new Error('No active team');

    try {
      setError(null);

      // Fetch full quotation with systems and items
      const sourceQuotation = await getQuotation(sourceQuotationId);
      if (!sourceQuotation) throw new Error('Source quotation not found');

      // Create new quotation (preserving project_id link)
      const newQuotation = await addQuotation({
        quotation_number: newQuotationNumber,
        version: newVersion || 1,
        customer_name: sourceQuotation.customer_name,
        customer_email: sourceQuotation.customer_email,
        project_name: `${sourceQuotation.project_name || ''} (עותק)`,
        project_description: sourceQuotation.project_description,
        project_id: sourceQuotation.project_id, // Preserve project link
        currency: sourceQuotation.currency,
        exchange_rate: sourceQuotation.exchange_rate,
        margin_percentage: sourceQuotation.margin_percentage,
        status: 'draft',
        total_cost: 0,
        total_price: 0,
        terms: sourceQuotation.terms,
        notes: sourceQuotation.notes,
        valid_until_date: sourceQuotation.valid_until_date,
      });

      if (!newQuotation) throw new Error('Failed to create quotation');

      // Copy systems and items
      if (sourceQuotation.quotation_systems) {
        for (const sourceSystem of sourceQuotation.quotation_systems) {
          const newSystem = await addQuotationSystem({
            quotation_id: newQuotation.id,
            system_name: sourceSystem.system_name,
            system_description: sourceSystem.system_description,
            quantity: sourceSystem.quantity,
            unit_cost: sourceSystem.unit_cost,
            total_cost: sourceSystem.total_cost,
            margin_percentage: sourceSystem.margin_percentage,
            unit_price: sourceSystem.unit_price,
            total_price: sourceSystem.total_price,
            sort_order: sourceSystem.sort_order,
          });

          if (newSystem && sourceSystem.quotation_items) {
            for (const sourceItem of sourceSystem.quotation_items) {
              await addQuotationItem({
                quotation_system_id: newSystem.id,
                component_id: sourceItem.component_id,
                assembly_id: sourceItem.assembly_id,
                item_name: sourceItem.item_name,
                manufacturer: sourceItem.manufacturer,
                manufacturer_part_number: sourceItem.manufacturer_part_number,
                item_type: sourceItem.item_type,
                labor_subtype: sourceItem.labor_subtype,
                quantity: sourceItem.quantity,
                unit_cost: sourceItem.unit_cost,
                total_cost: sourceItem.total_cost,
                margin_percentage: sourceItem.margin_percentage,
                unit_price: sourceItem.unit_price,
                total_price: sourceItem.total_price,
                original_currency: sourceItem.original_currency,
                original_cost: sourceItem.original_cost,
                notes: sourceItem.notes,
                sort_order: sourceItem.sort_order,
              });
            }
          }
        }
      }

      // Fetch the complete new quotation
      return await getQuotation(newQuotation.id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to duplicate quotation'
      );
      throw err;
    }
  };

  // Load quotations on mount and when team changes
  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  // Refetch quotations when window/tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchQuotations();
      }
    };

    const handleFocus = () => {
      fetchQuotations();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchQuotations]);

  return {
    quotations,
    loading,
    error,
    fetchQuotations,
    getQuotation,
    addQuotation,
    updateQuotation,
    deleteQuotation,
    addQuotationSystem,
    updateQuotationSystem,
    deleteQuotationSystem,
    addQuotationItem,
    updateQuotationItem,
    deleteQuotationItem,
    duplicateQuotation,
  };
}
