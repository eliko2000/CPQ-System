import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../ui/card';
import { Input } from '../../ui/input';

export function GeneralSettings() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>הגדרות בסיסיות</CardTitle>
          <CardDescription>הגדרות כלליות של המערכת</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                שם המערכת
              </label>
              <Input defaultValue="RadiaQ AI" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                גרסת מערכת
              </label>
              <Input defaultValue="1.0.0" disabled />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              תיאור מערכת
            </label>
            <Input defaultValue="מערכת CPQ חכמה לניהול הצעות מחיר לפרויקטי רובוטיקה" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>הגדרות אזור זמן</CardTitle>
          <CardDescription>הגדרות זמן ותאריכים</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">אזור זמן</label>
              <select className="w-full p-2 border rounded-md">
                <option value="Asia/Jerusalem">ישראל (GMT+2)</option>
                <option value="UTC">UTC (GMT+0)</option>
                <option value="America/New_York">ניו יורק (GMT-5)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                פורמט תאריך
              </label>
              <select className="w-full p-2 border rounded-md">
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
