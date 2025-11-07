import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { DbComponent, Component } from '../types'

// Transform UI Component to DB format
function componentToDb(component: Partial<Component>): Partial<DbComponent> {
  return {
    name: component.name,
    manufacturer: component.manufacturer,
    manufacturer_part_number: component.manufacturerPN,
    category: component.category,
    description: component.description,
    unit_cost_usd: component.unitCostUSD,
    unit_cost_ils: component.unitCostNIS,
    unit_cost_eur: component.unitCostEUR,
    supplier: component.supplier,
    notes: component.notes,
    is_active: true
  }
}

// Transform DB format to UI Component
function dbToComponent(dbComp: DbComponent): Component {
  return {
    id: dbComp.id,
    name: dbComp.name,
    manufacturer: dbComp.manufacturer || '',
    manufacturerPN: dbComp.manufacturer_part_number || '',
    category: dbComp.category || 'אחר',
    description: dbComp.description || '',
    unitCostNIS: dbComp.unit_cost_ils || 0,
    unitCostUSD: dbComp.unit_cost_usd || 0,
    unitCostEUR: dbComp.unit_cost_eur || 0,
    supplier: dbComp.supplier || '',
    currency: 'NIS',
    originalCost: dbComp.unit_cost_ils || 0,
    quoteDate: new Date().toISOString().split('T')[0],
    quoteFileUrl: '',
    notes: dbComp.notes || '',
    createdAt: dbComp.created_at,
    updatedAt: dbComp.updated_at
  }
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

      // Transform to DB format
      const dbUpdates = componentToDb(updates)

      const { data, error } = await supabase
        .from('components')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      // Update state with DB format
      setComponents(prev =>
        prev.map(comp => comp.id === id ? { ...comp, ...data } : comp)
      )
      return data
    } catch (err) {
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
