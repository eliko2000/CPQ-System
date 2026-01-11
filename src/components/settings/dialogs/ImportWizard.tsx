import { useState, useCallback } from 'react';
import { useTeam } from '@/contexts/TeamContext';
import { Button } from '@/components/ui/button';
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
  Loader2,
  Upload,
  FileJson,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { parseImportFile, validateImportData } from '@/services/importService';
import type {
  ExportPackage,
  ImportValidationResult,
} from '@/types/import-export.types';
import { cn } from '@/lib/utils';

interface ImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: () => void;
}

type ImportStep =
  | 'upload'
  | 'password'
  | 'validating'
  | 'preview'
  | 'conflicts'
  | 'importing';

export function ImportWizard({
  open,
  onOpenChange,
  onImportComplete,
}: ImportWizardProps) {
  const { currentTeam } = useTeam();
  const [step, setStep] = useState<ImportStep>('upload');
  const [loading, setLoading] = useState(false);

  // File handling
  const [selectedFile, setSelectedFile] = useState<File>();
  const [dragActive, setDragActive] = useState(false);

  // Encryption
  const [__isEncrypted, setIsEncrypted] = useState(false);
  const [password, setPassword] = useState('');

  // Validation
  const [exportPackage, setExportPackage] = useState<ExportPackage>();
  const [validationResult, setValidationResult] =
    useState<ImportValidationResult>();

  const handleClose = () => {
    if (!loading) {
      onOpenChange(false);
      // Reset state
      setTimeout(() => {
        setStep('upload');
        setSelectedFile(undefined);
        setPassword('');
        setIsEncrypted(false);
        setExportPackage(undefined);
        setValidationResult(undefined);
      }, 300);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelect = (file: File) => {
    // Validate file type
    if (!file.name.endsWith('.json')) {
      toast.error('יש לבחור קובץ JSON');
      return;
    }

    setSelectedFile(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleParseFile = async () => {
    if (!selectedFile || !currentTeam) return;

    setLoading(true);
    setStep('validating');

    try {
      // Parse file (without password first to check if encrypted)
      const parseResult = await parseImportFile(selectedFile);

      if (!parseResult.success) {
        // Check if file is encrypted
        if (
          parseResult.error?.includes('encrypted') ||
          parseResult.error?.includes('password')
        ) {
          setIsEncrypted(true);
          setStep('password');
          setLoading(false);
          return;
        }

        throw new Error(parseResult.error);
      }

      // File parsed successfully
      setExportPackage(parseResult.data);

      // Validate data
      const validation = await validateImportData(
        parseResult.data!,
        currentTeam.id
      );
      setValidationResult(validation);

      // Show preview
      setStep('preview');
    } catch (error) {
      console.error('Import parsing failed:', error);
      toast.error(error instanceof Error ? error.message : 'פענוח הקובץ נכשל');
      setStep('upload');
    } finally {
      setLoading(false);
    }
  };

  const handleDecrypt = async () => {
    if (!selectedFile || !password || !currentTeam) return;

    setLoading(true);
    setStep('validating');

    try {
      // Parse with password
      const parseResult = await parseImportFile(selectedFile, password);

      if (!parseResult.success) {
        throw new Error(parseResult.error || 'פענוח נכשל');
      }

      // File parsed successfully
      setExportPackage(parseResult.data);

      // Validate data
      const validation = await validateImportData(
        parseResult.data!,
        currentTeam.id
      );
      setValidationResult(validation);

      // Show preview
      setStep('preview');
    } catch (error) {
      console.error('Decryption failed:', error);
      toast.error('סיסמה שגויה או קובץ פגום');
      setStep('password');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    // TODO: Implement actual import with conflict resolutions
    toast.info('ייבוא עדיין בפיתוח - פונקציונליות מלאה בקרוב');
    handleClose();
    onImportComplete?.();
  };

  const errorCount = validationResult?.errors.length || 0;
  const warningCount = validationResult?.warnings.length || 0;
  const conflictCount = validationResult?.conflicts.length || 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>ייבוא נתונים</DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'העלה קובץ ייצוא'}
            {step === 'password' && 'הקובץ מוצפן - הזן סיסמה'}
            {step === 'validating' && 'מאמת קובץ...'}
            {step === 'preview' && 'תצוגה מקדימה ואימות'}
            {step === 'conflicts' && 'פתרון קונפליקטים'}
            {step === 'importing' && 'מייבא נתונים...'}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
                dragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25',
                'hover:border-primary/50 cursor-pointer'
              )}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <FileJson className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  גרור קובץ לכאן או לחץ לבחירה
                </p>
                <p className="text-xs text-muted-foreground">קבצי JSON בלבד</p>
              </div>
              <input
                id="file-input"
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleFileInputChange}
              />
            </div>

            {selectedFile && (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <FileJson className="h-5 w-5" />
                  <div>
                    <div className="text-sm font-medium">
                      {selectedFile.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={e => {
                    e.stopPropagation();
                    setSelectedFile(undefined);
                  }}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Password (if encrypted) */}
        {step === 'password' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                הקובץ מוצפן. נא להזין את הסיסמה לפענוח.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="decryptPassword">סיסמה</Label>
              <Input
                id="decryptPassword"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="הזן סיסמת פענוח"
                onKeyDown={e => {
                  if (e.key === 'Enter' && password) {
                    handleDecrypt();
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* Step 3: Validating */}
        {step === 'validating' && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">מאמת ומעבד קובץ...</p>
          </div>
        )}

        {/* Step 4: Preview */}
        {step === 'preview' && exportPackage && validationResult && (
          <div className="space-y-4 max-h-[500px] overflow-y-auto">
            {/* Validation Status */}
            <div className="space-y-2">
              {validationResult.valid ? (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">הקובץ תקין ומוכן לייבוא</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <XCircle className="h-5 w-5" />
                  <span className="font-medium">
                    נמצאו שגיאות - לא ניתן לייבא
                  </span>
                </div>
              )}

              {errorCount > 0 && (
                <div className="text-sm text-red-600 dark:text-red-400">
                  {errorCount} שגיאות
                </div>
              )}
              {warningCount > 0 && (
                <div className="text-sm text-yellow-600 dark:text-yellow-400">
                  {warningCount} אזהרות
                </div>
              )}
              {conflictCount > 0 && (
                <div className="text-sm text-orange-600 dark:text-orange-400">
                  {conflictCount} קונפליקטים
                </div>
              )}
            </div>

            {/* Export Info */}
            <div className="border rounded-lg p-4 space-y-3">
              <div>
                <div className="text-sm font-medium">מקור:</div>
                <div className="text-sm text-muted-foreground">
                  {exportPackage.manifest.teamName}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium">תאריך ייצוא:</div>
                <div className="text-sm text-muted-foreground">
                  {new Date(exportPackage.manifest.exportedAt).toLocaleString(
                    'he-IL'
                  )}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium">נתונים:</div>
                <div className="text-sm text-muted-foreground">
                  {exportPackage.manifest.counts.components} רכיבים,{' '}
                  {exportPackage.manifest.counts.assemblies} הרכבות,{' '}
                  {exportPackage.manifest.counts.quotations} הצעות מחיר
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="border rounded-lg p-4 space-y-3">
              <div className="text-sm font-medium">תצוגה מקדימה:</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>ייווצרו:</span>
                  <span className="font-medium">
                    {validationResult.preview.toCreate.components +
                      validationResult.preview.toCreate.assemblies +
                      validationResult.preview.toCreate.quotations}{' '}
                    רשומות
                  </span>
                </div>
                {conflictCount > 0 && (
                  <div className="flex justify-between text-orange-600 dark:text-orange-400">
                    <span>קונפליקטים:</span>
                    <span className="font-medium">{conflictCount}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Errors */}
            {errorCount > 0 && (
              <div className="border border-red-200 dark:border-red-800 rounded-lg p-4 space-y-2">
                <div className="text-sm font-medium text-red-600 dark:text-red-400">
                  שגיאות:
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {validationResult.errors.map((error, idx) => (
                    <div
                      key={idx}
                      className="text-xs text-red-600 dark:text-red-400"
                    >
                      • {error.message}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings */}
            {warningCount > 0 && (
              <div className="border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 space-y-2">
                <div className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                  אזהרות:
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {validationResult.warnings.map((warning, idx) => (
                    <div
                      key={idx}
                      className="text-xs text-yellow-600 dark:text-yellow-400"
                    >
                      • {warning.message}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Conflicts */}
            {conflictCount > 0 && (
              <div className="border border-orange-200 dark:border-orange-800 rounded-lg p-4 space-y-2">
                <div className="text-sm font-medium text-orange-600 dark:text-orange-400">
                  קונפליקטים ({conflictCount}):
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {validationResult.conflicts
                    .slice(0, 5)
                    .map((conflict, idx) => (
                      <div
                        key={idx}
                        className="text-xs border-b border-orange-100 dark:border-orange-900 pb-2"
                      >
                        <div className="font-medium">{conflict.entityName}</div>
                        <div className="text-muted-foreground">
                          {conflict.message}
                        </div>
                      </div>
                    ))}
                  {conflictCount > 5 && (
                    <div className="text-xs text-muted-foreground">
                      ועוד {conflictCount - 5} קונפליקטים...
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Buttons */}
        {step !== 'validating' && step !== 'importing' && (
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={handleClose} disabled={loading}>
              ביטול
            </Button>
            <div className="flex gap-2">
              {step === 'upload' && selectedFile && (
                <Button onClick={handleParseFile} disabled={loading}>
                  <Upload className="ml-2 h-4 w-4" />
                  המשך
                </Button>
              )}
              {step === 'password' && (
                <Button onClick={handleDecrypt} disabled={!password || loading}>
                  פענח
                </Button>
              )}
              {step === 'preview' && validationResult && (
                <Button
                  onClick={handleImport}
                  disabled={!validationResult.valid || loading}
                >
                  ייבא עכשיו
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
