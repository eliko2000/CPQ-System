import { useState } from 'react';
import { useTeam } from '@/contexts/TeamContext';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  Download,
  Lock,
  FileJson,
  FileSpreadsheet,
} from 'lucide-react';
import { toast } from 'sonner';
import { exportData } from '@/services/exportService';
import {
  createJSONBlob,
  generateJSONFilename,
} from '@/services/formatHandlers/jsonHandler';
import { encryptExportPackage } from '@/utils/encryption';
import type {
  ExportOptions,
  ExportFormat,
  ExportStatus,
} from '@/types/import-export.types';

interface ExportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ExportStep = 'select' | 'options' | 'review' | 'exporting';

export function ExportWizard({ open, onOpenChange }: ExportWizardProps) {
  const { currentTeam } = useTeam();
  const [step, setStep] = useState<ExportStep>('select');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({
    status: 'preparing' as ExportStatus,
    percent: 0,
    message: '',
  });

  // Step 1: Entity selection
  const [selectedEntities, setSelectedEntities] = useState({
    components: true,
    assemblies: true,
    quotations: true,
    settings: true,
  });

  // Step 2: Options
  const [includeHistory, setIncludeHistory] = useState(true);
  const [includeActivityLogs, setIncludeActivityLogs] = useState(false);
  const [includeAttachments, setIncludeAttachments] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('json');
  const [useEncryption, setUseEncryption] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [description, setDescription] = useState('');

  const handleClose = () => {
    if (!loading) {
      onOpenChange(false);
      // Reset state after closing
      setTimeout(() => {
        setStep('select');
        setSelectedEntities({
          components: true,
          assemblies: true,
          quotations: true,
          settings: true,
        });
        setIncludeHistory(true);
        setIncludeActivityLogs(false);
        setIncludeAttachments(false);
        setUseEncryption(true);
        setPassword('');
        setConfirmPassword('');
        setDescription('');
      }, 300);
    }
  };

  const handleNext = () => {
    if (step === 'select') {
      // Validate at least one entity selected
      if (!Object.values(selectedEntities).some(v => v)) {
        toast.error('יש לבחור לפחות ישות אחת לייצוא');
        return;
      }
      setStep('options');
    } else if (step === 'options') {
      // Validate password if encryption enabled
      if (useEncryption) {
        if (!password) {
          toast.error('נא להזין סיסמה');
          return;
        }
        if (password.length < 8) {
          toast.error('הסיסמה חייבת להיות לפחות 8 תווים');
          return;
        }
        if (password !== confirmPassword) {
          toast.error('הסיסמאות אינן תואמות');
          return;
        }
      }
      setStep('review');
    }
  };

  const handleBack = () => {
    if (step === 'options') setStep('select');
    else if (step === 'review') setStep('options');
  };

  const handleExport = async () => {
    if (!currentTeam) {
      toast.error('לא נמצא צוות פעיל');
      return;
    }

    setLoading(true);
    setStep('exporting');

    try {
      const options: ExportOptions = {
        includeComponents: selectedEntities.components,
        includeAssemblies: selectedEntities.assemblies,
        includeQuotations: selectedEntities.quotations,
        includeSettings: selectedEntities.settings,
        includePriceHistory: includeHistory,
        includeActivityLogs: includeActivityLogs,
        includeAttachments: includeAttachments,
        format,
        encryptData: useEncryption,
        password: useEncryption ? password : undefined,
        description,
      };

      console.log('ExportWizard - Export options:', {
        includeQuotations: options.includeQuotations,
        selectedEntities,
      });

      // Export data
      const result = await exportData(
        currentTeam.id,
        options,
        (status, percent, message) => {
          setProgress({ status, percent, message });
        }
      );

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Export failed');
      }

      let blob: Blob;
      let filename: string;

      // Handle encryption
      if (useEncryption && password) {
        const encrypted = await encryptExportPackage(result.data, password);
        const encryptedJson = JSON.stringify(encrypted, null, 2);
        blob = new Blob([encryptedJson], { type: 'application/json' });
        filename = generateJSONFilename(
          currentTeam.name,
          result.data.manifest.exportedAt
        );
      } else {
        blob = createJSONBlob(result.data);
        filename = generateJSONFilename(
          currentTeam.name,
          result.data.manifest.exportedAt
        );
      }

      // Trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('הייצוא הושלם בהצלחה');
      handleClose();
    } catch (error) {
      console.error('Export failed:', error);
      toast.error(error instanceof Error ? error.message : 'הייצוא נכשל');
      setStep('review');
    } finally {
      setLoading(false);
    }
  };

  const totalSelected = Object.values(selectedEntities).filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>ייצוא נתונים</DialogTitle>
          <DialogDescription>
            {step === 'select' && 'בחר את הישויות לייצוא'}
            {step === 'options' && 'הגדר אפשרויות ייצוא'}
            {step === 'review' && 'סקירה אחרונה לפני ייצוא'}
            {step === 'exporting' && 'מייצא נתונים...'}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Entity Selection */}
        {step === 'select' && (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="components"
                  checked={selectedEntities.components}
                  onCheckedChange={checked =>
                    setSelectedEntities(prev => ({
                      ...prev,
                      components: checked as boolean,
                    }))
                  }
                />
                <Label htmlFor="components" className="flex-1 cursor-pointer">
                  <div className="font-medium">רכיבים (Component Library)</div>
                  <div className="text-xs text-muted-foreground">
                    כל רכיבי הקטלוג עם מחירים ומטבע מקורי
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="assemblies"
                  checked={selectedEntities.assemblies}
                  onCheckedChange={checked =>
                    setSelectedEntities(prev => ({
                      ...prev,
                      assemblies: checked as boolean,
                    }))
                  }
                />
                <Label htmlFor="assemblies" className="flex-1 cursor-pointer">
                  <div className="font-medium">הרכבות (Assemblies/BOMs)</div>
                  <div className="text-xs text-muted-foreground">
                    הרכבות עם מבני רכיבים מקוננים
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="quotations"
                  checked={selectedEntities.quotations}
                  onCheckedChange={checked =>
                    setSelectedEntities(prev => ({
                      ...prev,
                      quotations: checked as boolean,
                    }))
                  }
                />
                <Label htmlFor="quotations" className="flex-1 cursor-pointer">
                  <div className="font-medium">הצעות מחיר (Quotations)</div>
                  <div className="text-xs text-muted-foreground">
                    פרויקטי הצעות מחיר עם מערכות ופריטים
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="settings"
                  checked={selectedEntities.settings}
                  onCheckedChange={checked =>
                    setSelectedEntities(prev => ({
                      ...prev,
                      settings: checked as boolean,
                    }))
                  }
                />
                <Label htmlFor="settings" className="flex-1 cursor-pointer">
                  <div className="font-medium">הגדרות (Settings)</div>
                  <div className="text-xs text-muted-foreground">
                    שערי חליפין, תמחור, קטגוריות
                  </div>
                </Label>
              </div>
            </div>

            <div className="pt-2 text-sm text-muted-foreground">
              נבחרו {totalSelected} מתוך 4 ישויות
            </div>
          </div>
        )}

        {/* Step 2: Options */}
        {step === 'options' && (
          <div className="space-y-4">
            <div className="space-y-3">
              <h4 className="text-sm font-medium">נתונים נוספים</h4>

              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="priceHistory"
                  checked={includeHistory}
                  onCheckedChange={checked =>
                    setIncludeHistory(checked as boolean)
                  }
                />
                <Label htmlFor="priceHistory" className="cursor-pointer">
                  כלול היסטוריית מחירים
                </Label>
              </div>

              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="activityLogs"
                  checked={includeActivityLogs}
                  onCheckedChange={checked =>
                    setIncludeActivityLogs(checked as boolean)
                  }
                />
                <Label htmlFor="activityLogs" className="cursor-pointer">
                  כלול יומני פעילות
                </Label>
              </div>

              <div className="space-y-1">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    id="attachments"
                    checked={includeAttachments}
                    onCheckedChange={checked =>
                      setIncludeAttachments(checked as boolean)
                    }
                  />
                  <Label htmlFor="attachments" className="cursor-pointer">
                    כלול קבצים מצורפים (הצעות מחיר ספקים)
                  </Label>
                </div>
                {includeAttachments && (
                  <p className="text-xs text-muted-foreground pr-6">
                    שים לב: הכללת קבצים מצורפים תגדיל משמעותית את גודל הקובץ
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="format">פורמט קובץ</Label>
              <Select
                value={format}
                onValueChange={value => setFormat(value as ExportFormat)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">
                    <div className="flex items-center gap-2">
                      <FileJson className="h-4 w-4" />
                      <span>JSON (מומלץ)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="excel" disabled>
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      <span>Excel (בקרוב)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3 border-t pt-3">
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="encryption"
                  checked={useEncryption}
                  onCheckedChange={checked =>
                    setUseEncryption(checked as boolean)
                  }
                />
                <Label
                  htmlFor="encryption"
                  className="cursor-pointer flex items-center gap-2"
                >
                  <Lock className="h-4 w-4" />
                  <span>הצפן קובץ עם סיסמה</span>
                </Label>
              </div>

              {useEncryption && (
                <div className="space-y-3 pr-6">
                  <div className="space-y-2">
                    <Label htmlFor="password">סיסמה</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="לפחות 8 תווים"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">אימות סיסמה</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="הזן שוב את הסיסמה"
                    />
                  </div>
                  <p className="text-xs text-yellow-600 dark:text-yellow-400">
                    ⚠️ שמור את הסיסמה במקום בטוח - לא ניתן לשחזר קבצים מוצפנים
                    ללא הסיסמה
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">תיאור (אופציונלי)</Label>
              <Input
                id="description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="תיאור הייצוא לעיון עתידי"
              />
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 'review' && (
          <div className="space-y-4">
            <div className="rounded-lg border p-4 space-y-3">
              <div>
                <div className="text-sm font-medium">ישויות לייצוא:</div>
                <div className="text-sm text-muted-foreground">
                  {selectedEntities.components && '✓ רכיבים '}
                  {selectedEntities.assemblies && '✓ הרכבות '}
                  {selectedEntities.quotations && '✓ הצעות מחיר '}
                  {selectedEntities.settings && '✓ הגדרות'}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium">נתונים נוספים:</div>
                <div className="text-sm text-muted-foreground">
                  {includeHistory ? '✓ היסטוריית מחירים ' : ''}
                  {includeActivityLogs ? '✓ יומני פעילות ' : ''}
                  {includeAttachments ? '✓ קבצים מצורפים' : ''}
                  {!includeHistory &&
                    !includeActivityLogs &&
                    !includeAttachments &&
                    'אין'}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium">פורמט:</div>
                <div className="text-sm text-muted-foreground">
                  {format.toUpperCase()}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium">הצפנה:</div>
                <div className="text-sm text-muted-foreground">
                  {useEncryption ? '✓ קובץ מוצפן עם סיסמה' : '✗ ללא הצפנה'}
                </div>
              </div>

              {description && (
                <div>
                  <div className="text-sm font-medium">תיאור:</div>
                  <div className="text-sm text-muted-foreground">
                    {description}
                  </div>
                </div>
              )}
            </div>

            <p className="text-sm text-muted-foreground">
              הקובץ יורד אוטומטית לתיקיית ההורדות שלך.
            </p>
          </div>
        )}

        {/* Step 4: Exporting */}
        {step === 'exporting' && (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="text-center">
                <div className="text-sm font-medium">{progress.message}</div>
                <div className="text-xs text-muted-foreground">
                  {progress.percent}% הושלם
                </div>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Footer Buttons */}
        {step !== 'exporting' && (
          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={step === 'select' || loading}
            >
              חזור
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={handleClose} disabled={loading}>
                ביטול
              </Button>
              {step !== 'review' && (
                <Button onClick={handleNext} disabled={loading}>
                  הבא
                </Button>
              )}
              {step === 'review' && (
                <Button onClick={handleExport} disabled={loading}>
                  <Download className="ml-2 h-4 w-4" />
                  ייצא עכשיו
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
