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
  RefreshCw,
  SkipForward,
  FileEdit,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  parseImportFile,
  validateImportData,
  applyImport,
} from '@/services/importService';
import type {
  ExportPackage,
  ImportValidationResult,
  ConflictResolution,
  DataConflict,
  ImportProgress,
} from '@/types/import-export.types';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

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
  | 'importing'
  | 'complete';

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
  const [importResult, setImportResult] = useState<any>();

  // Conflict resolution
  const [resolutions, setResolutions] = useState<ConflictResolution[]>([]);

  // Import progress
  const [importProgress, setImportProgress] = useState<ImportProgress>();

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

  const handleResolveConflicts = () => {
    if (!validationResult) return;

    // Initialize resolutions with default strategy (skip)
    const defaultResolutions: ConflictResolution[] =
      validationResult.conflicts.map(conflict => ({
        conflictId: conflict.entityId,
        entityId: conflict.entityId,
        entityType: conflict.entityType,
        resolution: 'skip',
      }));

    setResolutions(defaultResolutions);
    setStep('conflicts');
  };

  const handleConflictResolutionChange = (
    conflict: DataConflict,
    resolution: 'update' | 'skip' | 'create_new'
  ) => {
    setResolutions(prev =>
      prev.map(r =>
        r.entityId === conflict.entityId
          ? {
              ...r,
              resolution,
              newId:
                resolution === 'create_new' ? crypto.randomUUID() : undefined,
            }
          : r
      )
    );
  };

  const handleImport = async () => {
    if (!exportPackage || !currentTeam) return;

    setLoading(true);
    setStep('importing');

    try {
      const result = await applyImport(
        exportPackage,
        currentTeam.id,
        resolutions,
        {
          strictValidation: false,
          batchSize: 100,
        },
        progress => {
          setImportProgress(progress);
        }
      );

      if (!result.success) {
        throw new Error(result.error || 'Import failed');
      }

      const data = result.data!;

      // Save result for display
      setImportResult(data);

      // Log errors to console
      if (data.errors.length > 0) {
        console.error('Import errors:', data.errors);
        data.errors.forEach(error => {
          console.error(`  - [${error.entityType}] ${error.message}`);
        });
      }
      if (data.warnings.length > 0) {
        console.warn('Import warnings:', data.warnings);
        data.warnings.forEach(warning => {
          console.warn(`  - [${warning.entityType}] ${warning.message}`);
        });
      }

      toast.success(
        `ייבוא הושלם בהצלחה! נוצרו ${data.recordsCreated.components + data.recordsCreated.assemblies + data.recordsCreated.quotations} רשומות`,
        {
          description: `עודכנו: ${data.recordsUpdated.components + data.recordsUpdated.assemblies + data.recordsUpdated.quotations}, דולגו: ${data.recordsSkipped.components + data.recordsSkipped.assemblies + data.recordsSkipped.quotations}`,
          duration: 10000,
        }
      );

      if (data.errors.length > 0) {
        toast.warning(`${data.errors.length} שגיאות במהלך הייבוא`, {
          description: 'בדוק את הקונסול לפרטים',
          duration: 10000,
        });
      }

      // Show completion step
      setStep('complete');
      // DON'T call onImportComplete here - let user see results first
    } catch (error) {
      console.error('Import failed:', error);
      toast.error(error instanceof Error ? error.message : 'הייבוא נכשל');
      setStep('preview');
    } finally {
      setLoading(false);
    }
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
            {step === 'complete' && 'ייבוא הושלם'}
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

        {/* Step 5: Conflict Resolution */}
        {step === 'conflicts' && validationResult && (
          <div className="space-y-4 max-h-[500px] overflow-y-auto">
            <div className="text-sm text-muted-foreground">
              בחר איך לטפל בכל קונפליקט:
            </div>

            <div className="space-y-3">
              {validationResult.conflicts.map((conflict, idx) => {
                const currentResolution = resolutions.find(
                  r => r.entityId === conflict.entityId
                );

                return (
                  <div
                    key={idx}
                    className="border rounded-lg p-4 space-y-3 bg-card"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          {conflict.entityName}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {conflict.message}
                        </div>
                      </div>
                      <div className="text-xs text-orange-600 dark:text-orange-400 px-2 py-1 bg-orange-50 dark:bg-orange-900/20 rounded">
                        {conflict.type === 'duplicate_id'
                          ? 'ID קיים'
                          : 'מפתח עסקי קיים'}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={
                          currentResolution?.resolution === 'update'
                            ? 'default'
                            : 'outline'
                        }
                        className="flex-1"
                        onClick={() =>
                          handleConflictResolutionChange(conflict, 'update')
                        }
                      >
                        <RefreshCw className="ml-2 h-3 w-3" />
                        עדכן קיים
                      </Button>
                      <Button
                        size="sm"
                        variant={
                          currentResolution?.resolution === 'skip'
                            ? 'default'
                            : 'outline'
                        }
                        className="flex-1"
                        onClick={() =>
                          handleConflictResolutionChange(conflict, 'skip')
                        }
                      >
                        <SkipForward className="ml-2 h-3 w-3" />
                        דלג
                      </Button>
                      <Button
                        size="sm"
                        variant={
                          currentResolution?.resolution === 'create_new'
                            ? 'default'
                            : 'outline'
                        }
                        className="flex-1"
                        onClick={() =>
                          handleConflictResolutionChange(conflict, 'create_new')
                        }
                      >
                        <FileEdit className="ml-2 h-3 w-3" />
                        צור חדש
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 6: Importing Progress */}
        {step === 'importing' && importProgress && (
          <div className="space-y-6 py-8">
            <div className="text-center space-y-2">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <div className="text-sm font-medium">
                מייבא {importProgress.currentEntity === 'component' && 'רכיבים'}
                {importProgress.currentEntity === 'assembly' && 'הרכבות'}
                {importProgress.currentEntity === 'quotation' && 'הצעות מחיר'}
                {importProgress.currentEntity === 'setting' && 'הגדרות'}
              </div>
              <div className="text-xs text-muted-foreground">
                אצווה {importProgress.currentBatch} מתוך{' '}
                {importProgress.totalBatches}
              </div>
            </div>

            <div className="space-y-2">
              <Progress value={importProgress.percentComplete} />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {importProgress.recordsProcessed} /{' '}
                  {importProgress.totalRecords} רשומות
                </span>
                <span>{Math.round(importProgress.percentComplete)}%</span>
              </div>
            </div>

            {(importProgress.errors > 0 || importProgress.warnings > 0) && (
              <div className="text-center text-xs space-y-1">
                {importProgress.errors > 0 && (
                  <div className="text-red-600 dark:text-red-400">
                    {importProgress.errors} שגיאות
                  </div>
                )}
                {importProgress.warnings > 0 && (
                  <div className="text-yellow-600 dark:text-yellow-400">
                    {importProgress.warnings} אזהרות
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 7: Complete */}
        {step === 'complete' && importResult && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3 py-4">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
              <div className="text-lg font-medium">ייבוא הושלם בהצלחה!</div>
            </div>

            {/* Summary */}
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">נוצרו:</span>
                <span className="font-medium text-green-600">
                  {importResult.recordsCreated.components +
                    importResult.recordsCreated.assemblies +
                    importResult.recordsCreated.quotations}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">עודכנו:</span>
                <span className="font-medium text-blue-600">
                  {importResult.recordsUpdated.components +
                    importResult.recordsUpdated.assemblies +
                    importResult.recordsUpdated.quotations}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">דולגו:</span>
                <span className="font-medium text-gray-600">
                  {importResult.recordsSkipped.components +
                    importResult.recordsSkipped.assemblies +
                    importResult.recordsSkipped.quotations}
                </span>
              </div>
            </div>

            {/* Errors */}
            {importResult.errors && importResult.errors.length > 0 && (
              <div className="border border-red-200 rounded-lg p-4 space-y-2">
                <div className="font-medium text-red-600 flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  שגיאות ({importResult.errors.length}):
                </div>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {importResult.errors.map((error: any, idx: number) => (
                    <div
                      key={idx}
                      className="text-xs text-red-600 bg-red-50 p-2 rounded"
                    >
                      <div className="font-medium">{error.entityType}</div>
                      <div>{error.message}</div>
                      {error.entityName && (
                        <div className="text-muted-foreground">
                          {error.entityName}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings */}
            {importResult.warnings && importResult.warnings.length > 0 && (
              <div className="border border-yellow-200 rounded-lg p-4 space-y-2">
                <div className="font-medium text-yellow-600 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  אזהרות ({importResult.warnings.length}):
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {importResult.warnings.map((warning: any, idx: number) => (
                    <div
                      key={idx}
                      className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded"
                    >
                      <div className="font-medium">{warning.entityType}</div>
                      <div>{warning.message}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Buttons */}
        {step !== 'validating' && step !== 'importing' && (
          <div className="flex justify-between pt-4">
            {step !== 'complete' && (
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                ביטול
              </Button>
            )}
            {step === 'complete' && (
              <Button
                onClick={() => {
                  // Call completion callback AFTER user closes dialog
                  onImportComplete?.();
                  handleClose();
                }}
                className="w-full"
              >
                סגור
              </Button>
            )}
            {step !== 'complete' && (
              <div className="flex gap-2">
                {step === 'upload' && selectedFile && (
                  <Button onClick={handleParseFile} disabled={loading}>
                    <Upload className="ml-2 h-4 w-4" />
                    המשך
                  </Button>
                )}
                {step === 'password' && (
                  <Button
                    onClick={handleDecrypt}
                    disabled={!password || loading}
                  >
                    פענח
                  </Button>
                )}
                {step === 'preview' && validationResult && (
                  <>
                    {conflictCount > 0 && (
                      <Button
                        onClick={handleResolveConflicts}
                        disabled={loading}
                      >
                        פתור קונפליקטים ({conflictCount})
                      </Button>
                    )}
                    {conflictCount === 0 && (
                      <Button
                        onClick={handleImport}
                        disabled={!validationResult.valid || loading}
                      >
                        ייבא עכשיו
                      </Button>
                    )}
                  </>
                )}
                {step === 'conflicts' && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setStep('preview')}
                      disabled={loading}
                    >
                      חזור
                    </Button>
                    <Button onClick={handleImport} disabled={loading}>
                      ייבא עכשיו
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
