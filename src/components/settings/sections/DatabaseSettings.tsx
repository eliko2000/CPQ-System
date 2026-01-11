import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Download, Upload, Database, FileJson, Shield } from 'lucide-react';
import { ExportWizard } from '../dialogs/ExportWizard';
import { ImportWizard } from '../dialogs/ImportWizard';

interface DatabaseSettingsProps {
  isAdmin?: boolean;
}

export function DatabaseSettings({ isAdmin = true }: DatabaseSettingsProps) {
  const [showExportWizard, setShowExportWizard] = useState(false);
  const [showImportWizard, setShowImportWizard] = useState(false);

  return (
    <div className="space-y-6">
      {/* Admin-only warning */}
      {!isAdmin && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-center gap-3">
          <Shield className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            רק מנהלי צוות יכולים לייצא ולייבא נתונים
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            <CardTitle>ייבוא וייצוא מלא</CardTitle>
          </div>
          <CardDescription>גיבוי מלא ושחזור של כל נתוני המערכת</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg space-y-3">
            <div className="flex items-start gap-3">
              <FileJson className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1">
                <div className="text-sm font-medium">ייצוא מערכת מלא</div>
                <div className="text-xs text-muted-foreground">
                  ייצא את כל הרכיבים, ההרכבות, הצעות המחיר וההגדרות לקובץ JSON
                  מוצפן. מושלם לגיבוי תקופתי ושיתוף נתונים בין צוותים.
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowExportWizard(true)}
                disabled={!isAdmin}
                className="flex-1"
              >
                <Download className="h-4 w-4 ml-2" />
                ייצוא מלא
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowImportWizard(true)}
                disabled={!isAdmin}
                className="flex-1"
              >
                <Upload className="h-4 w-4 ml-2" />
                ייבוא מקובץ
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">מה כלול בייצוא?</div>
            <ul className="text-xs text-muted-foreground space-y-1 pr-4">
              <li>✓ כל רכיבי הקטלוג עם מחירון והיסטוריה</li>
              <li>✓ הרכבות (BOMs) עם מבנים מקוננים</li>
              <li>✓ הצעות מחיר עם מערכות ופריטים</li>
              <li>✓ הגדרות מערכת (שערי חליפין, תמחור)</li>
              <li>✓ שמירה על מטבע מקורי ומזהים ייחודיים</li>
              <li>✓ הצפנה מלאה עם סיסמה (AES-256)</li>
            </ul>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span>
                כל פעולות הייצוא והייבוא נרשמות ביומן ביקורת למעקב מלא
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>גיבוי אוטומטי</CardTitle>
          <CardDescription>תזמון גיבויים אוטומטיים (בפיתוח)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span>גיבוי אחרון:</span>
                <span className="font-medium">לא בוצע גיבוי</span>
              </div>
              <div className="flex justify-between">
                <span>גיבוי אוטומטי:</span>
                <Badge variant="secondary">כבוי</Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-reverse space-x-2">
            <input type="checkbox" id="autoBackup" disabled />
            <label
              htmlFor="autoBackup"
              className="text-sm text-muted-foreground"
            >
              גיבוי אוטומטי יומי (בקרוב)
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <ExportWizard
        open={showExportWizard}
        onOpenChange={setShowExportWizard}
      />
      <ImportWizard
        open={showImportWizard}
        onOpenChange={setShowImportWizard}
        onImportComplete={() => {
          // Refresh data after import
          window.location.reload();
        }}
      />
    </div>
  );
}
