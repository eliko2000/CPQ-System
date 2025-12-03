import {
  LogOut,
  User,
  Settings,
  Shield,
  Check,
  Users,
  Plus,
  ChevronLeft,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useUser } from '../../hooks/useUser';
import { useTeam } from '../../contexts/TeamContext';
import { CreateTeamDialog } from '../teams/CreateTeamDialog';
import { JoinTeamDialog } from '../teams/JoinTeamDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '../ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';

export function UserMenu() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { profile, isAdmin } = useUser();
  const { teams, currentTeam, switchTeam } = useTeam();

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarImage src={profile?.avatar_url} alt={profile?.full_name} />
            <AvatarFallback>{getInitials(profile?.full_name)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {profile?.full_name || 'משתמש'}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {profile?.email}
            </p>
            {currentTeam && (
              <p className="text-xs leading-none text-muted-foreground pt-1">
                {currentTeam.name}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Team Management Submenu */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Users className="mr-2 h-4 w-4" />
            <span>צוות</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {teams.length > 0 && (
              <>
                <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
                  החלף צוות
                </DropdownMenuLabel>
                {teams.map(team => (
                  <DropdownMenuItem
                    key={team.id}
                    onClick={() => switchTeam(team.id)}
                    className="justify-between"
                  >
                    {team.name}
                    {currentTeam?.id === team.id && (
                      <Check className="h-4 w-4 opacity-100" />
                    )}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
              </>
            )}
            <JoinTeamDialog>
              <DropdownMenuItem onSelect={(e: Event) => e.preventDefault()}>
                <Users className="mr-2 h-4 w-4" />
                <span>הצטרף לצוות</span>
              </DropdownMenuItem>
            </JoinTeamDialog>
            <CreateTeamDialog>
              <DropdownMenuItem onSelect={(e: Event) => e.preventDefault()}>
                <Plus className="mr-2 h-4 w-4" />
                <span>צור צוות</span>
              </DropdownMenuItem>
            </CreateTeamDialog>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => navigate('/profile')}>
          <User className="mr-2 h-4 w-4" />
          <span>פרופיל</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/settings')}>
          <Settings className="mr-2 h-4 w-4" />
          <span>הגדרות</span>
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem
            className="text-red-600"
            onClick={() => navigate('/admin')}
          >
            <Shield className="mr-2 h-4 w-4" />
            <span>פאנל ניהול</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>התנתק</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
