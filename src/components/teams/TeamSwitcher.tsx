import { useState } from 'react';
import { useTeam } from '../../contexts/TeamContext';
import { CreateTeamDialog } from './CreateTeamDialog';
import { JoinTeamDialog } from './JoinTeamDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import { ChevronsUpDown, Check, Plus, Users } from 'lucide-react';
import { cn } from '../../lib/utils';

export function TeamSwitcher({ collapsed = false }: { collapsed?: boolean }) {
  const { teams, currentTeam, switchTeam } = useTeam();
  const [open, setOpen] = useState(false);

  if (collapsed) {
    return (
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-md"
            title={currentTeam?.name || 'Select Team'}
          >
            <Users className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Teams</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {teams.map(team => (
            <DropdownMenuItem
              key={team.id}
              onClick={() => switchTeam(team.id)}
              className="justify-between"
            >
              {team.name}
              {currentTeam?.id === team.id && <Check className="h-4 w-4" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <JoinTeamDialog>
            <DropdownMenuItem onSelect={(e: Event) => e.preventDefault()}>
              <Users className="mr-2 h-4 w-4" />
              Join Team
            </DropdownMenuItem>
          </JoinTeamDialog>
          <CreateTeamDialog>
            <DropdownMenuItem onSelect={(e: Event) => e.preventDefault()}>
              <Plus className="mr-2 h-4 w-4" />
              Create Team
            </DropdownMenuItem>
          </CreateTeamDialog>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <span className="truncate">{currentTeam?.name || 'Select Team'}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[200px] p-0">
        <DropdownMenuLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
          Teams
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {teams.length === 0 ? (
          <div className="p-2 text-sm text-muted-foreground text-center">
            No teams found
          </div>
        ) : (
          teams.map(team => (
            <DropdownMenuItem
              key={team.id}
              onClick={() => {
                switchTeam(team.id);
                setOpen(false);
              }}
              className="justify-between"
            >
              {team.name}
              {currentTeam?.id === team.id && (
                <Check className="h-4 w-4 opacity-100" />
              )}
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <JoinTeamDialog>
          <DropdownMenuItem
            onSelect={(e: Event) => e.preventDefault()}
            className="cursor-pointer"
          >
            <Users className="mr-2 h-4 w-4" />
            Join Existing Team
          </DropdownMenuItem>
        </JoinTeamDialog>
        <CreateTeamDialog>
          <DropdownMenuItem
            onSelect={(e: Event) => e.preventDefault()}
            className="cursor-pointer"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create New Team
          </DropdownMenuItem>
        </CreateTeamDialog>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
