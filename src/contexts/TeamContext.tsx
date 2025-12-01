import React, { createContext, useContext, useEffect, useState } from 'react';
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
      // Fetch teams the user is a member of
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
        .filter((t: any) => t && !t.deleted_at); // Filter out deleted teams

      setTeams(userTeams);

      // Set current team if not set or if current team is not in the list
      if (userTeams.length > 0) {
        // Try to recover last active team from local storage
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

  // Persist current team selection
  useEffect(() => {
    if (currentTeam) {
      localStorage.setItem('cpq_last_team_id', currentTeam.id);
    }
  }, [currentTeam]);

  const createTeam = async (name: string, slug: string) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      // 1. Create the team
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert([{ name, slug }])
        .select()
        .single();

      if (teamError) throw teamError;

      // 2. Add user as admin member (this might be handled by a trigger, but let's be safe)
      // Actually, our RLS policy for 'teams' INSERT usually requires the user to be added as a member
      // Let's check if the trigger handled it or if we need to do it manually.
      // Based on our schema, we have a trigger `on_team_created_add_creator`

      await refreshTeams();

      // Set the new team as current
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
      setCurrentTeam(team);
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
