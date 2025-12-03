import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useTeam } from '../contexts/TeamContext';
import { TeamMember } from '../types/auth.types';
import { toast } from 'sonner';

export function useTeamMembers(teamId?: string) {
  const { user } = useAuth();
  const { currentTeam } = useTeam();
  const activeTeamId = teamId || currentTeam?.id;

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!activeTeamId) {
      setMembers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('team_members')
        .select(
          `
          *,
          user:user_profiles (*)
        `
        )
        .eq('team_id', activeTeamId);

      if (error) throw error;
      setMembers(data as TeamMember[]);
    } catch (err: any) {
      console.error('Error fetching team members:', err);
      setError(err.message);
      toast.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  }, [activeTeamId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const addMember = async (
    email: string,
    role: 'admin' | 'member' = 'member'
  ) => {
    if (!activeTeamId) return { error: 'No active team' };
    if (!user) return { error: 'Not authenticated' };

    try {
      console.log('🔍 Looking up user by email:', email);
      const { data: users, error: userError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      console.log('👤 User lookup result:', { users, userError });

      if (userError || !users) {
        // User not found - create an invitation instead
        console.log('📧 User not found, creating invitation...');

        // Check if invitation already exists
        const { data: existingInvitation } = await supabase
          .from('team_invitations')
          .select('id, status')
          .eq('team_id', activeTeamId)
          .eq('email', email)
          .eq('status', 'pending')
          .maybeSingle();

        if (existingInvitation) {
          toast.info(`Invitation already sent to ${email}`);
          return { error: null };
        }

        // Create invitation
        const { error: inviteError } = await supabase
          .from('team_invitations')
          .insert({
            team_id: activeTeamId,
            email,
            invited_by: user.id,
            status: 'pending',
            expires_at: new Date(
              Date.now() + 7 * 24 * 60 * 60 * 1000
            ).toISOString(),
          });

        if (inviteError) {
          console.error('❌ Invitation error:', inviteError);
          toast.error(`Failed to send invitation: ${inviteError.message}`);
          throw inviteError;
        }

        toast.success(
          `Invitation sent to ${email}. They will be added to the team when they sign up.`
        );
        return { error: null };
      }

      // User exists - add them directly
      console.log('➕ User exists, adding to team:', {
        team_id: activeTeamId,
        user_id: users.id,
        role,
      });
      const { error: insertError } = await supabase
        .from('team_members')
        .insert({
          team_id: activeTeamId,
          user_id: users.id,
          role,
        });

      console.log('📊 Insert result:', { insertError });

      if (insertError) {
        // Check if it's a duplicate error (user already in team)
        if (insertError.code === '23505') {
          toast.info('User is already a member of this team');
          return { error: null };
        }

        console.error('❌ Insert error:', insertError);
        toast.error(`Failed to add member: ${insertError.message}`);
        throw insertError;
      }

      toast.success('Member added successfully');
      fetchMembers();
      return { error: null };
    } catch (err: any) {
      console.error('Error adding member:', err);
      toast.error(`Failed to add member: ${err.message || 'Unknown error'}`);
      return { error: err };
    }
  };

  const updateRole = async (userId: string, newRole: 'admin' | 'member') => {
    if (!activeTeamId) return;

    try {
      const { error } = await supabase
        .from('team_members')
        .update({ role: newRole })
        .eq('team_id', activeTeamId)
        .eq('user_id', userId);

      if (error) throw error;

      toast.success('Role updated successfully');
      fetchMembers();
      return { error: null };
    } catch (err: any) {
      console.error('Error updating role:', err);
      toast.error('Failed to update role');
      return { error: err };
    }
  };

  const removeMember = async (userId: string) => {
    if (!activeTeamId) return;

    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', activeTeamId)
        .eq('user_id', userId);

      if (error) throw error;

      toast.success('Member removed successfully');
      fetchMembers();
      return { error: null };
    } catch (err: any) {
      console.error('Error removing member:', err);
      toast.error('Failed to remove member');
      return { error: err };
    }
  };

  const isAdmin = members.find(m => m.user_id === user?.id)?.role === 'admin';

  return {
    members,
    loading,
    error,
    addMember,
    updateRole,
    removeMember,
    isAdmin,
    refreshMembers: fetchMembers,
  };
}
