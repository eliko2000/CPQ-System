import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthContext';
import { Team, TeamMember } from '../types/auth.types';
import { toast } from 'sonner';

interface TeamContextType {
  teams: Team[];
  currentTeam: Team | null;
  loading: boolean;
  createTeam: (name: string, slug: string) => Promise<{ error: any }>;
  switchTeam: (teamId: string) => void;
  refreshTeams: () => Promise<void>;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshTeams = async () => {
    if (!user) {
      setTeams([]);
      setCurrentTeam(null);
      setLoading(false);
      return;
    }

    try {
      const { data: teamMembers, error } = await supabase
        .from('team_members')
        .select(
          `
          team_id,
          team:teams (*)
        `
        )
        .eq('user_id', user.id);

      if (error) throw error;

      const userTeams = teamMembers
        .map((tm: any) => tm.team)
        .filter((t: any) => t && !t.deleted_at);

      setTeams(userTeams);

      if (userTeams.length > 0) {
        const lastTeamId = localStorage.getItem('cpq_last_team_id');
        const lastTeam = userTeams.find(t => t.id === lastTeamId);

        if (lastTeam) {
          setCurrentTeam(lastTeam);
        } else if (
          !currentTeam ||
          !userTeams.find(t => t.id === currentTeam.id)
        ) {
          setCurrentTeam(userTeams[0]);
        }
      } else {
        setCurrentTeam(null);
      }
    } catch (err: any) {
      console.error('Error fetching teams:', err);
      toast.error('Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshTeams();
  }, [user]);

  useEffect(() => {
    if (currentTeam) {
      localStorage.setItem('cpq_last_team_id', currentTeam.id);
    }
  }, [currentTeam]);

  const createTeam = async (name: string, slug: string) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      console.log('🔍 DEBUG: Current session:', session);
      console.log('🔍 DEBUG: User from context:', user);

      if (!session) {
        console.error('❌ No session found!');
        toast.error('No active session. Please try logging out and back in.');
        return { error: 'No active session' };
      }

      // Create the team
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert([
          {
            name,
            slug,
            created_by: user.id,
          },
        ])
        .select()
        .single();

      if (teamError) {
        console.error('❌ Team creation failed:', teamError);
        throw teamError;
      }

      console.log('✅ Team created successfully:', team);

      // DEBUG: Check the current session before team_members insert
      const {
        data: { session: session2 },
      } = await supabase.auth.getSession();
      console.log('🔍 Session before team_members insert:', session2);

      // Manually add creator as admin (no trigger)
      console.log('📝 Attempting to add creator as admin...');
      const { error: memberError } = await supabase
        .from('team_members')
        .insert([
          {
            team_id: team.id,
            user_id: user.id,
            role: 'admin',
          },
        ]);

      if (memberError) {
        console.error('❌ Failed to add creator as admin:', memberError);
        // Try to clean up the team
        await supabase.from('teams').delete().eq('id', team.id);
        throw memberError;
      }

      console.log('✅ Added creator as admin');

      await refreshTeams();

      if (team) {
        setCurrentTeam(team);
      }

      return { error: null };
    } catch (err: any) {
      console.error('Error creating team:', err);
      return { error: err };
    }
  };

  const switchTeam = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    if (team) {
      const oldTeamName = currentTeam?.name;

      // Clear old team's cache from localStorage (don't be too aggressive)
      if (currentTeam && currentTeam.id !== teamId) {
        const oldCacheKey = `cpq-settings-cache-${currentTeam.id}`;
        localStorage.removeItem(oldCacheKey);
      }

      setCurrentTeam(team);

      // Notify components that team switched
      window.dispatchEvent(
        new CustomEvent('team-switched', {
          detail: { teamId: team.id, fromTeam: currentTeam?.id },
        })
      );

      // Show feedback toast
      if (oldTeamName) {
        toast.success(`Switched to ${team.name}`, {
          description: `You are now viewing ${team.name}'s data and settings`,
        });
      }

      // Navigate to home page on team switch (better UX)
      setTimeout(() => {
        navigate('/');
      }, 300);
    }
  };

  const value = {
    teams,
    currentTeam,
    loading,
    createTeam,
    switchTeam,
    refreshTeams,
  };

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
}

export function useTeam() {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
}
