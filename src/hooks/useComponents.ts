import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { DbComponent, Component } from '../types'
import { logger } from '../lib/logger'

// Transform UI Component to DB format
// Only includes fields that are actually present in the input (for partial updates)
function componentToDb(component: Partial<Component>): Partial<DbComponent> {
  const result: Partial<DbComponent> = {};

  if (component.name !== undefined) result.name = component.name;
  if (component.manufacturer !== undefined) result.manufacturer = component.manufacturer;
  if (component.manufacturerPN !== undefined) result.manufacturer_part_number = component.manufacturerPN;
  if (component.category !== undefined) result.category = component.category;
  if (component.componentType !== undefined) result.component_type = component.componentType;
  // Handle laborSubtype: only set if defined
  if (component.laborSubtype !== undefined) {
    result.labor_subtype = component.laborSubtype;
  }
  if (component.description !== undefined) result.description = component.description;
  if (component.unitCostUSD !== undefined) result.unit_cost_usd = component.unitCostUSD;
  if (component.unitCostNIS !== undefined) result.unit_cost_ils = component.unitCostNIS;
  if (component.unitCostEUR !== undefined) result.unit_cost_eur = component.unitCostEUR;
  if (component.currency !== undefined) result.currency = component.currency;
  if (component.originalCost !== undefined) result.original_cost = component.originalCost;
  if (component.supplier !== undefined) result.supplier = component.supplier;
  if (component.notes !== undefined) result.notes = component.notes;

  return result;
}

// Transform DB format to UI Component
function dbToComponent(dbComp: DbComponent): Component {
  logger.debug('📥 dbToComponent converting:', {
    id: dbComp.id,
    name: dbComp.name,
    component_type: dbComp.component_type,
    labor_subtype: dbComp.labor_subtype // Added for debugging
  })

  // CRITICAL: Properly detect original currency
  // If original_cost and currency are set in DB, use them
  // Otherwise, detect which price field has the highest value (likely the original)
  let detectedCurrency: 'NIS' | 'USD' | 'EUR' = dbComp.currency || 'NIS'
  let detectedOriginalCost: number = dbComp.original_cost || 0

  // If no original_cost in DB, detect from price fields
  if (!dbComp.original_cost || dbComp.original_cost === 0) {
    const ils = dbComp.unit_cost_ils || 0
    const usd = dbComp.unit_cost_usd || 0
    const eur = dbComp.unit_cost_eur || 0

    // Find which price is non-zero and likely the original
    // Heuristic: If USD or EUR price exists and is significantly different from ILS/rate,
    // it's likely the original
    if (usd > 0 && ils > 0) {
      // Check if ILS looks like a conversion from USD (ILS ≈ USD × 3-5)
      const ratio = ils / usd
      if (ratio >= 3 && ratio <= 5) {
        // ILS is likely converted from USD, so USD is original
        detectedCurrency = 'USD'
        detectedOriginalCost = usd
      } else {
        // ILS doesn't match USD conversion, so ILS is likely original
        detectedCurrency = 'NIS'
        detectedOriginalCost = ils
      }
    } else if (eur > 0 && ils > 0) {
      // Check if ILS looks like a conversion from EUR (ILS ≈ EUR × 3.5-5)
      const ratio = ils / eur
      if (ratio >= 3.5 && ratio <= 5) {
        // ILS is likely converted from EUR, so EUR is original
        detectedCurrency = 'EUR'
        detectedOriginalCost = eur
      } else {
        // ILS doesn't match EUR conversion, so ILS is likely original
        detectedCurrency = 'NIS'
        detectedOriginalCost = ils
      }
    } else if (usd > 0) {
      detectedCurrency = 'USD'
      detectedOriginalCost = usd
    } else if (eur > 0) {
      detectedCurrency = 'EUR'
      detectedOriginalCost = eur
    } else {
      detectedCurrency = 'NIS'
      detectedOriginalCost = ils
    }
  }

  const result = {
    id: dbComp.id,
    name: dbComp.name,
    manufacturer: dbComp.manufacturer || '',
    manufacturerPN: dbComp.manufacturer_part_number || '',
    category: dbComp.category || 'אחר',
    componentType: dbComp.component_type || 'hardware',
    laborSubtype: dbComp.labor_subtype || undefined, // Explicitly convert null to undefined
    description: dbComp.description || '',
    unitCostNIS: dbComp.unit_cost_ils || 0,
    unitCostUSD: dbComp.unit_cost_usd || 0,
    unitCostEUR: dbComp.unit_cost_eur || 0,
    supplier: dbComp.supplier || '',
    currency: detectedCurrency,
    originalCost: detectedOriginalCost,
    quoteDate: new Date().toISOString().split('T')[0],
    quoteFileUrl: '',
    notes: dbComp.notes || '',
    createdAt: dbComp.created_at,
    updatedAt: dbComp.updated_at
  }

  logger.debug('📥 dbToComponent result:', {
    id: result.id,
    name: result.name,
    componentType: result.componentType,
    laborSubtype: result.laborSubtype, // Added for debugging
    currency: result.currency,
    originalCost: result.originalCost,
    unitCostILS: result.unitCostNIS,
    unitCostUSD: result.unitCostUSD,
    unitCostEUR: result.unitCostEUR
  })
  return result
}

export function useComponents() {
  const [components, setComponents] = useState<DbComponent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch all components
  const fetchComponents = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data, error } = await supabase
        .from('components')
        .select('*')
        .order('name')

      if (error) throw error
      
      setComponents(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch components')
    } finally {
      setLoading(false)
    }
  }

  // Add a new component
  const addComponent = async (component: Omit<Component, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setError(null)

      // Transform to DB format
      const dbComponent = componentToDb(component)

      const { data, error } = await supabase
        .from('components')
        .insert([dbComponent])
        .select()
        .single()

      if (error) throw error

      // Update state immediately with new component
      setComponents(prev => [...prev, data])

      // Also fetch fresh data to ensure consistency
      await fetchComponents()

      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add component')
      throw err
    }
  }

  // Update an existing component
  const updateComponent = async (id: string, updates: Partial<Component>) => {
    try {
      setError(null)

      // Debug logging
      logger.debug('🔍 updateComponent called with:', { id, updates })

      // Transform to DB format
      const dbUpdates = componentToDb(updates)
      logger.debug('🔍 Transformed to DB format:', dbUpdates)

      const { data, error } = await supabase
        .from('components')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      logger.info('✅ Database updated successfully:', data)

      // Update state with DB format
      setComponents(prev =>
        prev.map(comp => comp.id === id ? { ...comp, ...data } : comp)
      )
      return data
    } catch (err) {
      logger.error('❌ Update failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to update component')
      throw err
    }
  }

  // Delete a component
  const deleteComponent = async (id: string) => {
    try {
      setError(null)
      
      const { error } = await supabase
        .from('components')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      setComponents(prev => prev.filter(comp => comp.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete component')
      throw err
    }
  }

  // Search components
  const searchComponents = async (query: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const { data, error } = await supabase
        .from('components')
        .select('*')
        .or(`name.ilike.%${query}%,manufacturer.ilike.%${query}%,category.ilike.%${query}%`)
        .order('name')

      if (error) throw error
      
      return data || []
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search components')
      return []
    } finally {
      setLoading(false)
    }
  }

  // Get components by category
  const getComponentsByCategory = async (category: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const { data, error } = await supabase
        .from('components')
        .select('*')
        .eq('category', category)
        .order('name')

      if (error) throw error
      
      return data || []
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch components by category')
      return []
    } finally {
      setLoading(false)
    }
  }

  // Load components on mount
  useEffect(() => {
    fetchComponents()
  }, [])

  return {
    components,
    loading,
    error,
    fetchComponents,
    addComponent,
    updateComponent,
    deleteComponent,
    searchComponents,
    getComponentsByCategory
  }
}
