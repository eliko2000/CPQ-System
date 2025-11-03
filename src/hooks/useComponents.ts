import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { DbComponent } from '../types'

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
  const addComponent = async (component: Omit<DbComponent, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setError(null)
      
      const { data, error } = await supabase
        .from('components')
        .insert([component])
        .select()
        .single()

      if (error) throw error
      
      setComponents(prev => [...prev, data])
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add component')
      throw err
    }
  }

  // Update an existing component
  const updateComponent = async (id: string, updates: Partial<DbComponent>) => {
    try {
      setError(null)
      
      const { data, error } = await supabase
        .from('components')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      
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
