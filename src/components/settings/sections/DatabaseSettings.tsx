import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Download, Upload } from 'lucide-react';

export function DatabaseSettings() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>גיבוי נתונים</CardTitle>
          <CardDescription>ניהול גיבויים ושחזור נתונים</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Button className="w-full">
              <Download className="h-4 w-4 ml-2" />
              גיבוי מיידי
            </Button>
            <Button variant="outline" className="w-full">
              <Upload className="h-4 w-4 ml-2" />
              שחזר מגיבוי
            </Button>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span>גיבוי אחרון:</span>
                <span className="font-medium">לא בוצע גיבוי</span>
              </div>
              <div className="flex justify-between">
                <span>גודל מסד נתונים:</span>
                <span className="font-medium">~2.5 MB</span>
              </div>
              <div className="flex justify-between">
                <span>גיבוי אוטומטי:</span>
                <Badge variant="secondary">כבוי</Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-reverse space-x-2">
            <input type="checkbox" id="autoBackup" />
            <label htmlFor="autoBackup" className="text-sm">
              גיבוי אוטומטי יומי
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ייבוא וייצוא</CardTitle>
          <CardDescription>ייבוא וייצוא נתונים מקובצים</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline" className="w-full">
              <Download className="h-4 w-4 ml-2" />
              ייצא רכיבים
            </Button>
            <Button variant="outline" className="w-full">
              <Upload className="h-4 w-4 ml-2" />
              ייבא רכיבים
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline" className="w-full">
              <Download className="h-4 w-4 ml-2" />
              ייצא הצעות
            </Button>
            <Button variant="outline" className="w-full">
              <Upload className="h-4 w-4 ml-2" />
              ייבא הצעות
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            פורמטים נתמכים: CSV, Excel, JSON
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
