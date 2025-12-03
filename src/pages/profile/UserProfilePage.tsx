import React, { useState, useEffect } from 'react';
import { useUser } from '../../hooks/useUser';
import { useAuth } from '../../contexts/AuthContext';
import { UserAvatarUpload } from '../../components/profile/UserAvatarUpload';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export function UserProfilePage() {
  const { profile, loading: profileLoading, updateProfile } = useUser();
  const { user } = useAuth();

  const [fullName, setFullName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile?.full_name) {
      setFullName(profile.full_name);
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await updateProfile({ full_name: fullName });

      if (error) throw error;

      toast.success('Profile updated successfully');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = (url: string) => {
    // The component handles the upload and profile update
    // We just need to refresh the local state if needed,
    // but useUser subscribes to changes via re-fetching or local state update
    // The UserAvatarUpload component calls onUploadComplete after successful upload
    // We might want to trigger a refresh or just let the local state update happen
    // In this implementation, useUser updates its local state optimistically or re-fetches
  };

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-10">
      <h1 className="text-3xl font-bold mb-8">Profile Settings</h1>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Public Profile</CardTitle>
            <CardDescription>
              Manage your public profile information.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center justify-center sm:flex-row sm:justify-start gap-6">
              <UserAvatarUpload
                avatarUrl={profile?.avatar_url}
                fullName={profile?.full_name}
                onUploadComplete={handleAvatarUpload}
              />
              <div className="space-y-1 text-center sm:text-left">
                <h3 className="font-medium">Profile Picture</h3>
                <p className="text-sm text-muted-foreground">
                  Click the avatar to upload a new photo.
                </p>
              </div>
            </div>

            <form id="profile-form" onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={user?.email || ''}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Email address is managed via your account settings.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>
            </form>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button type="submit" form="profile-form" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
