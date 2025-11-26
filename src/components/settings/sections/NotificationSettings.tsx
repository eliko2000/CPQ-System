import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../ui/card';
import { Input } from '../../ui/input';

export function NotificationSettings() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>התראות מערכת</CardTitle>
          <CardDescription>הגדרות התראות ודיוורים</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">התראות דוא"ל</div>
                <div className="text-sm text-muted-foreground">
                  קבל התראות בדוא"ל
                </div>
              </div>
              <input type="checkbox" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">התראות דפדפן</div>
                <div className="text-sm text-muted-foreground">
                  התראות בדפדפן
                </div>
              </div>
              <input type="checkbox" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">התראות הצעות</div>
                <div className="text-sm text-muted-foreground">
                  עדכונים על הצעות מחיר
                </div>
              </div>
              <input type="checkbox" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">התראות מערכת</div>
                <div className="text-sm text-muted-foreground">
                  עדכוני מערכת ותחזוקה
                </div>
              </div>
              <input type="checkbox" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>כתובות דוא"ל</CardTitle>
          <CardDescription>ניהול כתובות לקבלת התראות</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              כתובת דוא"ל ראשית
            </label>
            <Input type="email" placeholder="admin@company.com" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              כתובות נוספות
            </label>
            <Input placeholder="email1@company.com, email2@company.com" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
