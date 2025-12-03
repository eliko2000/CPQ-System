import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useTeam } from '../contexts/TeamContext';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export interface TeamInvitation {
  id: string;
  team_id: string;
  email: string;
  invited_by: string | null;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  expires_at: string;
}

export function useTeamInvitations(teamId?: string) {
  const { user } = useAuth();
  const { currentTeam } = useTeam();
  const activeTeamId = teamId || currentTeam?.id;

  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvitations = useCallback(async () => {
    if (!activeTeamId) {
      setInvitations([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('team_id', activeTeamId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvitations(data || []);
    } catch (err: any) {
      console.error('Error fetching team invitations:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activeTeamId]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const createInvitation = async (
    email: string
  ): Promise<{ error: string | null }> => {
    if (!activeTeamId) return { error: 'No active team' };
    if (!user) return { error: 'Not authenticated' };

    try {
      // Check if invitation already exists
      const { data: existing } = await supabase
        .from('team_invitations')
        .select('id, status')
        .eq('team_id', activeTeamId)
        .eq('email', email)
        .eq('status', 'pending')
        .maybeSingle();

      if (existing) {
        toast.info('Invitation already sent to this email');
        return { error: null };
      }

      const { error } = await supabase.from('team_invitations').insert({
        team_id: activeTeamId,
        email,
        invited_by: user.id,
        status: 'pending',
        expires_at: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000
        ).toISOString(), // 7 days
      });

      if (error) throw error;

      toast.success(`Invitation sent to ${email}`);
      fetchInvitations();
      return { error: null };
    } catch (err: any) {
      console.error('Error creating invitation:', err);
      toast.error(`Failed to send invitation: ${err.message}`);
      return { error: err.message };
    }
  };

  const deleteInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('team_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;

      toast.success('Invitation deleted');
      fetchInvitations();
      return { error: null };
    } catch (err: any) {
      console.error('Error deleting invitation:', err);
      toast.error('Failed to delete invitation');
      return { error: err.message };
    }
  };

  const resendInvitation = async (invitationId: string) => {
    try {
      // Update the expires_at date
      const { error } = await supabase
        .from('team_invitations')
        .update({
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000
          ).toISOString(),
        })
        .eq('id', invitationId);

      if (error) throw error;

      toast.success('Invitation resent');
      fetchInvitations();
      return { error: null };
    } catch (err: any) {
      console.error('Error resending invitation:', err);
      toast.error('Failed to resend invitation');
      return { error: err.message };
    }
  };

  return {
    invitations,
    loading,
    error,
    createInvitation,
    deleteInvitation,
    resendInvitation,
    refreshInvitations: fetchInvitations,
  };
}
