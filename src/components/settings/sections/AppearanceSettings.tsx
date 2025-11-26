import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../ui/card';

export function AppearanceSettings() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>עיצוב ממשק</CardTitle>
          <CardDescription>הגדרות מראה והתנהגות הממשק</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">ערכת נושא</label>
            <select className="w-full p-2 border rounded-md">
              <option value="light">בהיר</option>
              <option value="dark">כהה</option>
              <option value="system">ברירת מחדל מערכת</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">שפה</label>
            <select className="w-full p-2 border rounded-md">
              <option value="he">עברית</option>
              <option value="en">English</option>
            </select>
          </div>
          <div className="flex items-center space-x-reverse space-x-2">
            <input type="checkbox" id="compactMode" />
            <label htmlFor="compactMode" className="text-sm">
              מצב קומפקטי
            </label>
          </div>
          <div className="flex items-center space-x-reverse space-x-2">
            <input type="checkbox" id="showTooltips" defaultChecked />
            <label htmlFor="showTooltips" className="text-sm">
              הצג טיפים
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>התנהגות ממשק</CardTitle>
          <CardDescription>הגדרות התנהגות ואינטראקציה</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-reverse space-x-2">
            <input type="checkbox" id="autoSave" defaultChecked />
            <label htmlFor="autoSave" className="text-sm">
              שמירה אוטומטית
            </label>
          </div>
          <div className="flex items-center space-x-reverse space-x-2">
            <input type="checkbox" id="confirmActions" defaultChecked />
            <label htmlFor="confirmActions" className="text-sm">
              אישור פעולות מסוכנות
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              פריטים בעמוד
            </label>
            <select className="w-full p-2 border rounded-md">
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
