import { useState } from 'react'
import { supabase } from '../supabaseClient'

export function useSupabase() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clearError = () => setError(null)

  return {
    loading,
    error,
    setError,
    clearError,
    setLoading,
    supabase
  }
}
