import React, { useState, useEffect } from 'react';
import { useTeam } from '../../../contexts/TeamContext';
import { useTeamMembers } from '../../../hooks/useTeamMembers';
import { supabase } from '../../../supabaseClient';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../ui/card';
import { ManageTeamMembersDialog } from '../../teams/ManageTeamMembersDialog';
import { toast } from 'sonner';
import { Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function TeamSettings() {
  const { currentTeam, refreshTeams } = useTeam();
  const { isAdmin } = useTeamMembers(currentTeam?.id);
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [emailDomain, setEmailDomain] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (currentTeam) {
      setName(currentTeam.name);
      setSlug(currentTeam.slug);
      setEmailDomain(currentTeam.email_domain || '');
    }
  }, [currentTeam]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTeam || !isAdmin) return;

    setSaving(true);
    try {
      const updates: any = {
        name,
        email_domain: emailDomain || null,
      };

      const { error } = await supabase
        .from('teams')
        .update(updates)
        .eq('id', currentTeam.id);

      if (error) throw error;

      toast.success('Team settings updated');
      refreshTeams();
    } catch (error: any) {
      console.error('Error updating team:', error);
      toast.error('Failed to update team');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (!currentTeam || !isAdmin) return;

    if (
      !confirm(
        'Are you sure you want to delete this team? This action cannot be undone.'
      )
    ) {
      return;
    }

    setDeleting(true);
    try {
      // Soft delete via function
      const { error } = await supabase.rpc('soft_delete_team', {
        target_team_id: currentTeam.id,
      });

      if (error) throw error;

      toast.success('Team deleted successfully');
      await refreshTeams();
      navigate('/'); // Redirect to dashboard
    } catch (error: any) {
      console.error('Error deleting team:', error);
      toast.error('Failed to delete team');
    } finally {
      setDeleting(false);
    }
  };

  if (!currentTeam) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">No active team selected.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle>General Information</CardTitle>
          <CardDescription>
            Update your team's basic information.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form id="team-form" onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Team Name</Label>
              <Input
                id="name"
                value={name}
                onChange={e => setName(e.target.value)}
                disabled={!isAdmin}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Team Slug</Label>
              <Input id="slug" value={slug} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">
                Unique identifier for your team (cannot be changed).
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="domain">Email Domain</Label>
              <Input
                id="domain"
                value={emailDomain}
                onChange={e => setEmailDomain(e.target.value)}
                placeholder="e.g. acme.com"
                disabled={!isAdmin}
              />
              <p className="text-xs text-muted-foreground">
                Automatically suggest this team to users with this email domain.
              </p>
            </div>
          </form>
        </CardContent>
        {isAdmin && (
          <CardFooter className="flex justify-end">
            <Button type="submit" form="team-form" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </CardFooter>
        )}
      </Card>

      {/* Members Management */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>Manage who has access to your team.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            View and manage team members, invite new users, and update roles.
          </p>
          <ManageTeamMembersDialog teamId={currentTeam.id}>
            <Button variant="outline" className="w-full sm:w-auto">
              Manage Members
            </Button>
          </ManageTeamMembersDialog>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      {isAdmin && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              Irreversible actions for your team.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Deleting a team will remove access for all members. Data is
              soft-deleted for 90 days before permanent removal.
            </p>
            <Button
              variant="destructive"
              onClick={handleDeleteTeam}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete Team
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
