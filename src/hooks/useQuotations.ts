import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { DbQuotation, DbQuotationSystem, DbQuotationItem } from '../types'

export function useQuotations() {
  const [quotations, setQuotations] = useState<DbQuotation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch all quotations with their systems and items
  const fetchQuotations = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data, error } = await supabase
        .from('quotations')
        .select(`
          *,
          quotation_systems (
            *,
            quotation_items (
              *,
              component:components (*)
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      setQuotations(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch quotations')
    } finally {
      setLoading(false)
    }
  }

  // Add a new quotation
  const addQuotation = async (quotation: Omit<DbQuotation, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setError(null)
      
      const { data, error } = await supabase
        .from('quotations')
        .insert([quotation])
        .select()
        .single()

      if (error) throw error
      
      setQuotations(prev => [data, ...prev])
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add quotation')
      throw err
    }
  }

  // Update an existing quotation
  const updateQuotation = async (id: string, updates: Partial<DbQuotation>) => {
    try {
      setError(null)
      
      const { data, error } = await supabase
        .from('quotations')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      
      setQuotations(prev => 
        prev.map(quot => quot.id === id ? { ...quot, ...data } : quot)
      )
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update quotation')
      throw err
    }
  }

  // Delete a quotation
  const deleteQuotation = async (id: string) => {
    try {
      setError(null)
      
      const { error } = await supabase
        .from('quotations')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      setQuotations(prev => prev.filter(quot => quot.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete quotation')
      throw err
    }
  }

  // Get a single quotation with all related data
  const getQuotation = async (id: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const { data, error } = await supabase
        .from('quotations')
        .select(`
          *,
          quotation_systems (
            *,
            quotation_items (
              *,
              component:components (*)
            )
          )
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch quotation')
      return null
    } finally {
      setLoading(false)
    }
  }

  // Add a system to a quotation
  const addQuotationSystem = async (system: Omit<DbQuotationSystem, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setError(null)
      
      const { data, error } = await supabase
        .from('quotation_systems')
        .insert([system])
        .select()
        .single()

      if (error) throw error
      
      // Update local state
      setQuotations(prev => 
        prev.map(quot => 
          quot.id === system.quotation_id 
            ? { 
                ...quot, 
                quotation_systems: [...(quot.quotation_systems || []), data]
              }
            : quot
        )
      )
      
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add quotation system')
      throw err
    }
  }

  // Update a quotation system
  const updateQuotationSystem = async (id: string, updates: Partial<DbQuotationSystem>) => {
    try {
      setError(null)
      
      const { data, error } = await supabase
        .from('quotation_systems')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      
      // Update local state
      setQuotations(prev => 
        prev.map(quot => ({
          ...quot,
          quotation_systems: quot.quotation_systems?.map(sys => 
            sys.id === id ? { ...sys, ...data } : sys
          ) || []
        }))
      )
      
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update quotation system')
      throw err
    }
  }

  // Delete a quotation system
  const deleteQuotationSystem = async (id: string) => {
    try {
      setError(null)
      
      const { error } = await supabase
        .from('quotation_systems')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      // Update local state
      setQuotations(prev => 
        prev.map(quot => ({
          ...quot,
          quotation_systems: quot.quotation_systems?.filter(sys => sys.id !== id) || []
        }))
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete quotation system')
      throw err
    }
  }

  // Add an item to a quotation system
  const addQuotationItem = async (item: Omit<DbQuotationItem, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setError(null)
      
      const { data, error } = await supabase
        .from('quotation_items')
        .insert([item])
        .select(`
          *,
          component:components (*)
        `)
        .single()

      if (error) throw error
      
      // Update local state
      setQuotations(prev => 
        prev.map(quot => ({
          ...quot,
          quotation_systems: quot.quotation_systems?.map(sys => 
            sys.id === item.quotation_system_id 
              ? { 
                  ...sys, 
                  quotation_items: [...(sys.quotation_items || []), data]
                }
              : sys
          ) || []
        }))
      )
      
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add quotation item')
      throw err
    }
  }

  // Update a quotation item
  const updateQuotationItem = async (id: string, updates: Partial<DbQuotationItem>) => {
    try {
      setError(null)
      
      const { data, error } = await supabase
        .from('quotation_items')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          component:components (*)
        `)
        .single()

      if (error) throw error
      
      // Update local state
      setQuotations(prev => 
        prev.map(quot => ({
          ...quot,
          quotation_systems: quot.quotation_systems?.map(sys => ({
            ...sys,
            quotation_items: sys.quotation_items?.map(item => 
              item.id === id ? { ...item, ...data } : item
            ) || []
          })) || []
        }))
      )
      
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update quotation item')
      throw err
    }
  }

  // Delete a quotation item
  const deleteQuotationItem = async (id: string) => {
    try {
      setError(null)
      
      const { error } = await supabase
        .from('quotation_items')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      // Update local state
      setQuotations(prev => 
        prev.map(quot => ({
          ...quot,
          quotation_systems: quot.quotation_systems?.map(sys => ({
            ...sys,
            quotation_items: sys.quotation_items?.filter(item => item.id !== id) || []
          })) || []
        }))
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete quotation item')
      throw err
    }
  }

  // Load quotations on mount
  useEffect(() => {
    fetchQuotations()
  }, [])

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
    deleteQuotationItem
  }
}
