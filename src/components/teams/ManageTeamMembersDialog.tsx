import React, { useState } from 'react';
import { useTeamMembers } from '../../hooks/useTeamMembers';
import { useTeamInvitations } from '../../hooks/useTeamInvitations';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import {
  Loader2,
  Trash2,
  UserPlus,
  Shield,
  User,
  Mail,
  X,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';

interface ManageTeamMembersDialogProps {
  children?: React.ReactNode;
  teamId?: string;
}

export function ManageTeamMembersDialog({
  children,
  teamId,
}: ManageTeamMembersDialogProps) {
  const { user } = useAuth();
  const { members, loading, addMember, updateRole, removeMember, isAdmin } =
    useTeamMembers(teamId);

  const {
    invitations,
    loading: invitationsLoading,
    deleteInvitation,
    refreshInvitations,
  } = useTeamInvitations(teamId);

  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberEmail.trim()) return;

    setAdding(true);
    try {
      const { error } = await addMember(newMemberEmail);
      if (error) {
        toast.error(error.message || 'Failed to add member');
      } else {
        setNewMemberEmail('');
        // Refresh invitations to show newly created ones
        await refreshInvitations();
      }
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteInvitation = async (invitationId: string) => {
    if (confirm('Are you sure you want to delete this invitation?')) {
      await deleteInvitation(invitationId);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const pendingInvitations = invitations.filter(
    inv => inv.status === 'pending'
  );

  console.log('📋 All invitations:', invitations);
  console.log('⏳ Pending invitations:', pendingInvitations);
  console.log('👥 Is admin:', isAdmin);

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children || <Button variant="outline">Manage Members</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Team Members</DialogTitle>
          <DialogDescription>
            Manage who has access to this team.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Add Member Form */}
          {isAdmin && (
            <form onSubmit={handleAddMember} className="flex gap-2 items-end">
              <div className="grid w-full gap-1.5">
                <Label htmlFor="email">Add Member</Label>
                <Input
                  id="email"
                  placeholder="Email address"
                  type="email"
                  value={newMemberEmail}
                  onChange={e => setNewMemberEmail(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={adding || !newMemberEmail}>
                {adding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                <span className="ml-2 sr-only sm:not-sr-only">Add</span>
              </Button>
            </form>
          )}

          {/* Members List */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">
              Current Members ({members.length})
            </h4>

            {loading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {members.map(member => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between bg-muted/30 p-2 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={member.user?.avatar_url} />
                        <AvatarFallback>
                          {getInitials(member.user?.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium leading-none">
                          {member.user?.full_name || 'Unknown User'}
                          {member.user_id === user?.id && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              (You)
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {member.user?.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isAdmin && member.user_id !== user?.id ? (
                        <>
                          <Select
                            defaultValue={member.role}
                            onValueChange={(value: 'admin' | 'member') =>
                              updateRole(member.user_id, value)
                            }
                          >
                            <SelectTrigger className="w-[100px] h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="member">Member</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive/90"
                            onClick={() => {
                              if (
                                confirm(
                                  'Are you sure you want to remove this member?'
                                )
                              ) {
                                removeMember(member.user_id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <div className="flex items-center gap-1 px-2 py-1 bg-secondary rounded text-xs font-medium">
                          {member.role === 'admin' ? (
                            <Shield className="h-3 w-3 mr-1" />
                          ) : (
                            <User className="h-3 w-3 mr-1" />
                          )}
                          {member.role === 'admin' ? 'Admin' : 'Member'}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Invitations */}
          {isAdmin && pendingInvitations.length > 0 && (
            <div className="space-y-4 border-t pt-4">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pending Invitations ({pendingInvitations.length})
              </h4>

              {invitationsLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2">
                  {pendingInvitations.map(invitation => (
                    <div
                      key={invitation.id}
                      className="flex items-center justify-between bg-blue-50 dark:bg-blue-950/20 p-2 rounded-lg border border-blue-200 dark:border-blue-900"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                          <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium leading-none">
                            {invitation.email}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Expires:{' '}
                            {new Date(
                              invitation.expires_at
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          Pending
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive/90"
                          onClick={() => handleDeleteInvitation(invitation.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
