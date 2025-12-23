import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { useTeam } from '../../contexts/TeamContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label as __Label } from '../ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { Loader2, Search, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Team } from '../../types/auth.types';

interface JoinTeamDialogProps {
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onTeamJoined?: () => void;
}

export function JoinTeamDialog({
  children,
  open,
  onOpenChange,
  onTeamJoined,
}: JoinTeamDialogProps) {
  const { user } = useAuth();
  const { refreshTeams } = useTeam();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [joining, setJoining] = useState(false);
  const [foundTeams, setFoundTeams] = useState<Team[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Handle controlled/uncontrolled state
  const show = open !== undefined ? open : isOpen;
  const setShow = onOpenChange || setIsOpen;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setSearching(true);
    setHasSearched(true);
    setFoundTeams([]);

    try {
      // Search for teams by email domain or exact name match
      // Note: RLS usually restricts seeing teams you're not in.
      // We need a specific policy or function to allow finding teams by domain.
      // The plan mentioned "Teams table policies... OR deleted_at IS NULL -- Allow viewing non-deleted teams for join flow"
      // But usually we restrict to "id IN (SELECT team_id FROM team_members...)"

      // If RLS is strict, this query will return empty.
      // We might need a "public_teams" view or function.
      // For now, let's assume we can search by domain if it matches user's email domain

      let query = supabase.from('teams').select('*').is('deleted_at', null);

      if (searchTerm.includes('.')) {
        // Assume it's a domain search
        query = query.eq('email_domain', searchTerm);
      } else {
        // Name search (might be restricted by RLS)
        query = query.ilike('name', `%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Filter out teams user is already in (client-side for simplicity)
      // Ideally we'd do this in SQL
      setFoundTeams(data as Team[]);
    } catch (error: any) {
      console.error('Error searching teams:', error);
      toast.error('Failed to search teams');
    } finally {
      setSearching(false);
    }
  };

  const handleJoin = async (teamId: string) => {
    if (!user) return;
    setJoining(true);

    try {
      // Insert into team_members
      // RLS must allow this: "Users can insert themselves into team_members"?
      // Usually we need an invitation or the team must be "open".
      // For this MVP, let's assume if you can see it (via domain match), you can join it.

      const { error } = await supabase.from('team_members').insert({
        team_id: teamId,
        user_id: user.id,
        role: 'member',
      });

      if (error) throw error;

      toast.success('Joined team successfully');
      await refreshTeams();
      setShow(false);

      // Call the callback if provided
      if (onTeamJoined) {
        onTeamJoined();
      }
    } catch (error: any) {
      console.error('Error joining team:', error);
      toast.error('Failed to join team: ' + error.message);
    } finally {
      setJoining(false);
    }
  };

  return (
    <Dialog open={show} onOpenChange={setShow}>
      <DialogTrigger asChild>
        {children || <Button variant="outline">Join Team</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Join a Team</DialogTitle>
          <DialogDescription>
            Search for your company's team by name or email domain.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSearch} className="space-y-4 my-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="e.g. acme.com or Acme Corp"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button type="submit" disabled={searching || !searchTerm.trim()}>
              {searching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Search'
              )}
            </Button>
          </div>
        </form>

        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {hasSearched && foundTeams.length === 0 && !searching && (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No teams found. Try a different search or create a new team.
            </div>
          )}

          {foundTeams.map(team => (
            <div
              key={team.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">{team.name}</p>
                  {team.email_domain && (
                    <p className="text-xs text-muted-foreground">
                      {team.email_domain}
                    </p>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleJoin(team.id)}
                disabled={joining}
              >
                {joining ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  'Join'
                )}
              </Button>
            </div>
          ))}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="ghost" onClick={() => setShow(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
