import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './useAuth';
import { UserProfile } from '../types/auth.types';

export function useUser() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        setProfile(data);
      } catch (err: any) {
        console.error('Error fetching user profile:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      setProfile(prev => (prev ? { ...prev, ...updates } : null));
      return { error: null };
    } catch (err: any) {
      console.error('Error updating profile:', err);
      return { error: err };
    }
  };

  return {
    profile,
    loading,
    error,
    updateProfile,
    isAdmin: profile?.is_system_admin ?? false,
  };
}
