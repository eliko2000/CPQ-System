import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Switch } from '../ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Badge } from '../ui/badge';
import { Loader2, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import type {
  FeatureFlag,
  TeamFeatureAccess as TeamFeatureAccessType,
} from '../../types/feature-flags.types';

interface Team {
  id: string;
  name: string;
  slug: string;
}

interface TeamFeatureAccessTableProps {
  flags: FeatureFlag[];
}

export function TeamFeatureAccessTable({ flags }: TeamFeatureAccessTableProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamAccess, setTeamAccess] = useState<TeamFeatureAccessType[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch all teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, slug')
        .is('deleted_at', null)
        .order('name', { ascending: true });

      if (teamsError) throw teamsError;

      // Fetch all team feature access records
      const { data: accessData, error: accessError } = await supabase
        .from('team_feature_access')
        .select('*');

      if (accessError) throw accessError;

      setTeams(teamsData || []);
      setTeamAccess(accessData || []);
    } catch (error) {
      console.error('Error fetching team access data:', error);
      toast.error('Failed to load team feature access');
    } finally {
      setLoading(false);
    }
  };

  const toggleTeamFeature = async (
    teamId: string,
    flagId: string,
    currentValue: boolean | undefined
  ) => {
    const key = `${teamId}-${flagId}`;
    setUpdating(key);

    try {
      // Find existing access record
      const existing = teamAccess.find(
        access => access.team_id === teamId && access.feature_flag_id === flagId
      );

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('team_feature_access')
          .update({ is_enabled: !currentValue })
          .eq('id', existing.id);

        if (error) throw error;

        // Update local state
        setTeamAccess(prev =>
          prev.map(access =>
            access.id === existing.id
              ? { ...access, is_enabled: !currentValue }
              : access
          )
        );
      } else {
        // Create new record (override global setting)
        const { data, error } = await supabase
          .from('team_feature_access')
          .insert({
            team_id: teamId,
            feature_flag_id: flagId,
            is_enabled: !currentValue,
          })
          .select()
          .single();

        if (error) throw error;

        // Add to local state
        setTeamAccess(prev => [...prev, data]);
      }

      toast.success('Team feature access updated');
    } catch (error) {
      console.error('Error updating team feature access:', error);
      toast.error('Failed to update team feature access');
    } finally {
      setUpdating(null);
    }
  };

  const getFeatureStatus = (
    teamId: string,
    flag: FeatureFlag
  ): boolean | undefined => {
    const access = teamAccess.find(
      a => a.team_id === teamId && a.feature_flag_id === flag.id
    );

    // If there's a team-specific setting, return it
    if (access !== undefined) {
      return access.is_enabled;
    }

    // Otherwise, return undefined to indicate "use global"
    return undefined;
  };

  const isUpdating = (teamId: string, flagId: string): boolean => {
    return updating === `${teamId}-${flagId}`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (teams.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No teams found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Feature Access</CardTitle>
        <CardDescription>
          Override global feature flags for specific teams. Leave unset to use
          global setting.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Team</TableHead>
                {flags.map(flag => (
                  <TableHead key={flag.id} className="text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs font-medium">
                        {flag.flag_name}
                      </span>
                      <Badge
                        variant={flag.is_enabled ? 'default' : 'secondary'}
                        className="text-[10px]"
                      >
                        Global: {flag.is_enabled ? 'ON' : 'OFF'}
                      </Badge>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {teams.map(team => (
                <TableRow key={team.id}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{team.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {team.slug}
                      </span>
                    </div>
                  </TableCell>
                  {flags.map(flag => {
                    const status = getFeatureStatus(team.id, flag);
                    const isGlobal = status === undefined;
                    const effectiveStatus = isGlobal ? flag.is_enabled : status;

                    return (
                      <TableCell key={flag.id} className="text-center">
                        <div className="flex flex-col items-center gap-2">
                          <Switch
                            checked={effectiveStatus}
                            onCheckedChange={() =>
                              toggleTeamFeature(
                                team.id,
                                flag.id,
                                effectiveStatus
                              )
                            }
                            disabled={isUpdating(team.id, flag.id)}
                          />
                          {isGlobal ? (
                            <Badge variant="outline" className="text-[10px]">
                              Using Global
                            </Badge>
                          ) : (
                            <Badge
                              variant={status ? 'default' : 'destructive'}
                              className="text-[10px]"
                            >
                              Override: {status ? 'ON' : 'OFF'}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 p-4 bg-muted rounded-md">
          <h4 className="text-sm font-semibold mb-2">How it works:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>
              • <strong>Using Global:</strong> Team uses the global feature flag
              setting
            </li>
            <li>
              • <strong>Override:</strong> Team has a custom setting that
              overrides the global value
            </li>
            <li>
              • Global must be ON for any team to use a feature (overrides
              cannot enable a globally disabled feature)
            </li>
            <li>
              • Click the switch to toggle between global and override settings
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
