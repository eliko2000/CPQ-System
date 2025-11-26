import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { User } from 'lucide-react';

export function SecuritySettings() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>משתמשים והרשאות</CardTitle>
          <CardDescription>ניהול משתמשים והרשאות גישה</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <div className="font-medium">מנהל מערכת</div>
              <div className="text-sm text-muted-foreground">
                גישה מלאה לכל הפונקציות
              </div>
            </div>
            <Badge>1 משתמש</Badge>
          </div>
          <Button variant="outline" className="w-full">
            <User className="h-4 w-4 ml-2" />
            הוסף משתמש
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>הגדרות אבטחה</CardTitle>
          <CardDescription>הגדרות אבטחה כלליות</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-reverse space-x-2">
            <input type="checkbox" id="requireLogin" defaultChecked />
            <label htmlFor="requireLogin" className="text-sm">
              דרוש התחברות
            </label>
          </div>
          <div className="flex items-center space-x-reverse space-x-2">
            <input type="checkbox" id="sessionTimeout" defaultChecked />
            <label htmlFor="sessionTimeout" className="text-sm">
              ניתוק אוטומטי אחרי חוסר פעילות
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              זמן ניתוק (דקות)
            </label>
            <Input type="number" defaultValue="30" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
