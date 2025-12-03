import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeam } from '../../contexts/TeamContext';
import { CreateTeamDialog } from '../../components/teams/CreateTeamDialog';
import { JoinTeamDialog } from '../../components/teams/JoinTeamDialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Users, Plus, Building2 } from 'lucide-react';

export function TeamOnboardingPage() {
  const navigate = useNavigate();
  const { teams, refreshTeams } = useTeam();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);

  // If user already has teams, redirect to dashboard
  if (teams.length > 0) {
    navigate('/');
    return null;
  }

  const handleTeamCreated = async () => {
    await refreshTeams();
    navigate('/');
  };

  const handleTeamJoined = async () => {
    await refreshTeams();
    navigate('/');
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center p-4"
      dir="rtl"
    >
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            ברוכים הבאים ל-RadiaQ AI
          </h1>
          <p className="text-lg text-muted-foreground">
            כדי להתחיל, צור צוות חדש או הצטרף לצוות קיים
          </p>
        </div>

        {/* Options */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Create Team Card */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-primary/50">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">צור צוות חדש</CardTitle>
              </div>
              <CardDescription className="text-base">
                התחל צוות חדש והזמן חברי צוות להצטרף אליך
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-6 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span>אתה תהיה מנהל הצוות</span>
                </li>
                <li className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>הזמן חברי צוות ללא הגבלה</span>
                </li>
                <li className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  <span>התחל עם מרחב עבודה ריק</span>
                </li>
              </ul>
              <CreateTeamDialog
                open={showCreateDialog}
                onOpenChange={setShowCreateDialog}
                onTeamCreated={handleTeamCreated}
              >
                <Button className="w-full" size="lg">
                  <Plus className="ml-2 h-5 w-5" />
                  צור צוות חדש
                </Button>
              </CreateTeamDialog>
            </CardContent>
          </Card>

          {/* Join Team Card */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-primary/50">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">הצטרף לצוות קיים</CardTitle>
              </div>
              <CardDescription className="text-base">
                הצטרף לצוות של הארגון שלך באמצעות דומיין האימייל
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-6 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span>גישה לנתונים משותפים</span>
                </li>
                <li className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>שתף פעולה עם חברי הצוות</span>
                </li>
                <li className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  <span>התחל לעבוד מיד</span>
                </li>
              </ul>
              <JoinTeamDialog
                open={showJoinDialog}
                onOpenChange={setShowJoinDialog}
                onTeamJoined={handleTeamJoined}
              >
                <Button className="w-full" variant="outline" size="lg">
                  <Users className="ml-2 h-5 w-5" />
                  הצטרף לצוות
                </Button>
              </JoinTeamDialog>
            </CardContent>
          </Card>
        </div>

        {/* Footer Note */}
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            תוכל תמיד ליצור צוותים נוספים או להצטרף לצוותים אחרים מההגדרות
          </p>
        </div>
      </div>
    </div>
  );
}
