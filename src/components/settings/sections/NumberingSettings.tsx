/**
 * NumberingSettings Component
 * Allows admins to configure project and quotation numbering patterns
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { useNumbering } from '../../../hooks/useNumbering';
import { NumberingConfig } from '../../../types/numbering.types';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { previewNumbers } from '../../../services/numberingService';

export const NumberingSettings: React.FC = () => {
  const { config, loading, error, updateConfig } = useNumbering();
  const [localConfig, setLocalConfig] = useState<NumberingConfig>(config);
  const [saved, setSaved] = useState(false);

  // Sync local config with hook config
  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  // Calculate preview from localConfig in real-time
  const preview = useMemo(() => {
    return previewNumbers(localConfig);
  }, [localConfig]);

  const handleSave = async () => {
    setSaved(false);
    await updateConfig(localConfig);
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const handleReset = () => {
    setLocalConfig(config);
  };

  const hasChanges = JSON.stringify(localConfig) !== JSON.stringify(config);

  return (
    <Card>
      <CardHeader>
        <CardTitle>הגדרות מספור</CardTitle>
        <CardDescription>
          הגדר את תבנית המספור עבור פרויקטים והצעות מחיר
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Success Display */}
        {saved && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm">ההגדרות נשמרו בהצלחה</span>
          </div>
        )}

        {/* Project Prefix */}
        <div className="space-y-2">
          <Label htmlFor="projectPrefix">קידומת פרויקט</Label>
          <Input
            id="projectPrefix"
            value={localConfig.projectPrefix}
            onChange={e =>
              setLocalConfig({
                ...localConfig,
                projectPrefix: e.target.value.toUpperCase(),
              })
            }
            placeholder="PRJ"
            maxLength={10}
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground">
            אותיות ומספרים בלבד (לדוגמה: PRJ, PROJ, P)
          </p>
        </div>

        {/* Quotation Prefix */}
        <div className="space-y-2">
          <Label htmlFor="quotationPrefix">קידומת הצעת מחיר</Label>
          <Input
            id="quotationPrefix"
            value={localConfig.quotationPrefix}
            onChange={e =>
              setLocalConfig({
                ...localConfig,
                quotationPrefix: e.target.value.toUpperCase(),
              })
            }
            placeholder="QT"
            maxLength={10}
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground">
            אותיות ומספרים בלבד (לדוגמה: QT, QUOTE, Q)
          </p>
        </div>

        {/* Number Padding */}
        <div className="space-y-2">
          <Label htmlFor="padding">אורך מספר (ספרות)</Label>
          <Input
            id="padding"
            type="number"
            min={1}
            max={10}
            value={localConfig.padding}
            onChange={e =>
              setLocalConfig({
                ...localConfig,
                padding: parseInt(e.target.value) || 1,
              })
            }
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground">
            מספר הספרות במספר הרץ (לדוגמה: 4 = 0001, 0002, ...)
          </p>
        </div>

        {/* Separator */}
        <div className="space-y-2">
          <Label htmlFor="separator">מפריד</Label>
          <Input
            id="separator"
            value={localConfig.separator}
            onChange={e =>
              setLocalConfig({ ...localConfig, separator: e.target.value })
            }
            placeholder="-"
            maxLength={3}
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground">
            תו המפריד בין חלקי המספר (לדוגמה: -, _, /)
          </p>
        </div>

        {/* Preview */}
        <div className="space-y-3 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="space-y-2 flex-1">
              <p className="text-sm font-medium text-blue-900">תצוגה מקדימה</p>
              <div className="space-y-1 text-sm text-blue-700">
                <div className="flex justify-between">
                  <span>פרויקט:</span>
                  <code className="bg-white px-2 py-1 rounded font-mono text-xs">
                    {preview.projectExample}
                  </code>
                </div>
                <div className="flex justify-between">
                  <span>הצעת מחיר:</span>
                  <code className="bg-white px-2 py-1 rounded font-mono text-xs">
                    {preview.quotationExample}
                  </code>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Important Notice */}
        <div className="space-y-2 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
            <div className="space-y-1 text-sm text-yellow-800">
              <p className="font-medium">הערה חשובה</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>שינוי ההגדרות ישפיע רק על פרויקטים והצעות מחיר חדשים</li>
                <li>פרויקטים והצעות מחיר קיימים ישמרו על המספור המקורי שלהם</li>
                <li>המספור ימשיך מהמספר האחרון שהוקצה</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!hasChanges || loading}
          >
            ביטול
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || loading}>
            {loading ? 'שומר...' : 'שמירת הגדרות'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
