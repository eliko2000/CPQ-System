import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import {
  IntelligentDocumentUpload,
  type MSRPImportOptions,
} from './IntelligentDocumentUpload';
import { AIExtractionPreview } from './AIExtractionPreview';
import type { AIExtractionResult } from '../../services/claudeAI';
import type { Component } from '../../types';
import { logger } from '@/lib/logger';
import { supabase } from '../../supabaseClient';
import { useSupplierQuotes } from '../../hooks/useSupplierQuotes';
import { useComponents } from '../../hooks/useComponents';
import { toast } from 'sonner';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useTeam } from '../../contexts/TeamContext';
import { logComponentBulkImport } from '../../services/activityLogService';

interface ComponentAIImportProps {
  isOpen: boolean;
  onClose: () => void;
  /** @deprecated No longer used - components are imported internally with file history */
  onImport?: (components: Partial<Component>[]) => Promise<void>;
}

type ImportStep = 'upload' | 'preview' | 'importing' | 'complete';

export const ComponentAIImport: React.FC<ComponentAIImportProps> = ({
  isOpen,
  onClose,
  onImport: _onImport, // Deprecated - kept for backwards compatibility
}) => {
  const [step, setStep] = useState<ImportStep>('upload');
  const [extractionResult, setExtractionResult] =
    useState<AIExtractionResult | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [showSourcePanel, setShowSourcePanel] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [msrpOptions, setMsrpOptions] = useState<MSRPImportOptions>({
    mode: 'none',
  });
  const [importProgress, setImportProgress] = useState({
    current: 0,
    total: 0,
  });

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [fileSelected, setFileSelected] = useState(false);

  // Hooks for file storage and history
  const { createQuote, addComponentHistory } = useSupplierQuotes();
  const { addComponent } = useComponents();
  const { currentTeam } = useTeam();

  /**
   * Upload file to Supabase Storage
   * Returns URL if successful, or a placeholder if storage is unavailable
   */
  const uploadFileToStorage = async (file: File): Promise<string> => {
    try {
      // Generate unique file path
      const timestamp = new Date();
      const year = timestamp.getFullYear();
      const month = String(timestamp.getMonth() + 1).padStart(2, '0');
      const uuid = crypto.randomUUID();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${year}/${month}/${uuid}_${sanitizedName}`;

      logger.debug('📤 Uploading file to Supabase Storage:', filePath);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('supplier-quotes')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        logger.warn(
          'Storage upload failed, continuing without file URL:',
          error
        );
        return `placeholder://file-not-stored/${sanitizedName}`;
      }

      logger.debug('✅ File uploaded successfully:', data.path);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('supplier-quotes')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      logger.warn('Error uploading file, continuing without storage:', error);
      return `placeholder://storage-unavailable/${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    }
  };

  /**
   * Get extraction method from metadata
   */
  const getExtractionMethod = (
    metadata: AIExtractionResult['metadata']
  ): 'native' | 'text' | 'ai_vision' => {
    const docType = metadata.documentType;
    if (docType === 'excel') return 'native';
    if (docType === 'pdf') return 'text';
    if (docType === 'image') return 'ai_vision';
    return 'native'; // Default to native for unknown types
  };

  const handleExtractionComplete = (
    result: AIExtractionResult,
    file: File,
    options: MSRPImportOptions
  ) => {
    setExtractionResult(result);
    setSourceFile(file);
    setMsrpOptions(options);
    setStep('preview');
  };

  const handleConfirm = async (components: Partial<Component>[]) => {
    setStep('importing');
    setImportProgress({ current: 0, total: components.length });

    logger.info('[ComponentAIImport] onImport received components', {
      totalComponents: components.length,
      componentsWithMSRP: components.filter(c => c.msrpPrice).length,
      sampleComponent: components[0],
    });

    try {
      // Step 1: Upload file to storage (same as Supplier Quotes)
      let fileUrl = '';
      if (sourceFile) {
        logger.debug('📤 Uploading source file to storage...');
        fileUrl = await uploadFileToStorage(sourceFile);
        logger.debug('✅ File uploaded:', fileUrl);
      }

      // Step 2: Create a supplier quote record to track the import
      let createdQuote = null;
      if (sourceFile && extractionResult) {
        logger.debug('📋 Creating supplier quote record...');
        createdQuote = await createQuote({
          fileName: sourceFile.name,
          fileUrl: fileUrl,
          fileType:
            (extractionResult.metadata.documentType as
              | 'excel'
              | 'pdf'
              | 'image') || 'excel',
          fileSizeKb: Math.round(sourceFile.size / 1024),
          status: 'completed',
          documentType:
            (extractionResult.metadata.documentType as
              | 'excel'
              | 'pdf'
              | 'image'
              | 'unknown') || 'unknown',
          extractionMethod:
            (getExtractionMethod(extractionResult.metadata) as
              | 'native'
              | 'text'
              | 'structured'
              | 'ai_vision') || 'native',
          confidenceScore: extractionResult.confidence,
          totalComponents: components.length,
          supplierName: extractionResult.metadata.supplier || 'Library Import',
          quoteDate: new Date().toISOString().split('T')[0],
          metadata: {
            ...extractionResult.metadata,
            importSource: 'library_smart_import', // Mark as library import
          },
        });
        logger.debug('✅ Quote record created:', createdQuote?.id);
      }

      // Step 3: Import components and create history entries
      let successCount = 0;
      let failCount = 0;

      // Generate unique operation ID for this bulk import
      const operationId = `bulk-import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Start bulk operation tracking (suppress individual trigger logs)
      if (components.length > 1 && currentTeam) {
        try {
          await supabase.rpc('start_bulk_operation', {
            p_operation_id: operationId,
            p_team_id: currentTeam.id,
            p_operation_type: 'import',
          });
          logger.debug('Started bulk import operation:', operationId);
        } catch (error) {
          logger.warn('Failed to start bulk operation tracking:', error);
        }
      }

      for (let i = 0; i < components.length; i++) {
        const comp = components[i];
        try {
          logger.debug(
            `➕ Adding component ${i + 1}/${components.length}:`,
            comp.name
          );

          // Add component to library
          const newComponent = await addComponent({
            name: comp.name || '',
            manufacturer: comp.manufacturer || '',
            manufacturerPN: comp.manufacturerPN || '',
            supplier:
              comp.supplier || extractionResult?.metadata.supplier || '',
            category: comp.category || 'אחר',
            componentType: comp.componentType || 'hardware',
            description: comp.description || '',
            unitCostNIS: comp.unitCostNIS || 0,
            unitCostUSD: comp.unitCostUSD || 0,
            unitCostEUR: comp.unitCostEUR || 0,
            currency: comp.currency || 'USD',
            originalCost: comp.unitCostUSD || comp.unitCostNIS || 0,
            quoteDate: new Date().toISOString().split('T')[0],
            quoteFileUrl: fileUrl || undefined,
            notes: comp.notes || '',
            msrpPrice: comp.msrpPrice,
            msrpCurrency: comp.msrpCurrency,
            partnerDiscountPercent: comp.partnerDiscountPercent,
          } as Omit<Component, 'id' | 'createdAt' | 'updatedAt'>);

          // Step 4: Create component history entry (if we have a quote record)
          if (newComponent && createdQuote) {
            await addComponentHistory(newComponent.id, createdQuote.id, {
              unitPriceNIS: comp.unitCostNIS,
              unitPriceUSD: comp.unitCostUSD,
              unitPriceEUR: comp.unitCostEUR,
              currency: (comp.currency as 'NIS' | 'USD' | 'EUR') || 'USD',
              quoteDate: new Date().toISOString().split('T')[0],
              supplierName:
                extractionResult?.metadata.supplier || 'Library Import',
              isCurrentPrice: true,
            });
            logger.debug(
              `📊 Created history entry for component:`,
              newComponent.id
            );
          }

          successCount++;
          setImportProgress({ current: i + 1, total: components.length });
        } catch (error) {
          logger.error('❌ Failed to add component:', comp.name, error);
          failCount++;
        }
      }

      // End bulk operation tracking
      if (components.length > 1) {
        try {
          await supabase.rpc('end_bulk_operation', {
            p_operation_id: operationId,
          });
          logger.debug('Ended bulk import operation:', operationId);
        } catch (error) {
          logger.warn('Failed to end bulk operation tracking:', error);
        }
      }

      // Log bulk import activity (only if >1 component to avoid individual logs)
      if (currentTeam && successCount > 1 && sourceFile && extractionResult) {
        await logComponentBulkImport(
          currentTeam.id,
          successCount,
          sourceFile.name,
          extractionResult.metadata.documentType as 'excel' | 'pdf' | 'csv',
          {
            parser: getExtractionMethod(extractionResult.metadata),
            confidence: extractionResult.confidence,
          }
        );
      }

      // Show success/error toast
      if (successCount > 0) {
        toast.success(`${successCount} רכיבים יובאו בהצלחה`);
      }
      if (failCount > 0) {
        toast.error(`${failCount} רכיבים נכשלו`);
      }

      // Note: We don't call onImport anymore since we handle everything internally now.
      // The useComponents hook will automatically refresh the components list.

      setStep('complete');

      // Close after showing success briefly
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (error) {
      logger.error('Import failed:', error);
      toast.error('שגיאה בייבוא רכיבים');
      // Reset to preview to allow retry
      setStep('preview');
    }
  };

  // Check if there are unsaved changes based on the current step
  const hasUnsavedChanges = (): boolean => {
    // If in preview mode, user has uploaded a file and extracted data
    if (step === 'preview') return true;
    // If importing, definitely has unsaved work
    if (step === 'importing') return true;
    // If file is selected but not yet processed
    if (fileSelected) return true;
    // Upload and complete states have no unsaved changes
    return false;
  };

  const handleClose = () => {
    // Don't close if in fullscreen mode
    if (isFullscreen) return;

    // Check for unsaved changes
    if (hasUnsavedChanges()) {
      setShowConfirmDialog(true);
      return;
    }

    // No unsaved changes, close immediately
    performClose();
  };

  const performClose = () => {
    setStep('upload');
    setExtractionResult(null);
    setSourceFile(null);
    setShowSourcePanel(false);
    setIsFullscreen(false);
    setShowSourcePanel(false);
    setIsFullscreen(false);
    setImportProgress({ current: 0, total: 0 });
    setFileSelected(false);
    onClose();
  };

  const handleConfirmClose = () => {
    setShowConfirmDialog(false);
    performClose();
  };

  const handleCancelClose = () => {
    setShowConfirmDialog(false);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent
          className={`max-h-[90vh] transition-all duration-300 ${showSourcePanel ? 'max-w-[95vw] w-[95vw] overflow-hidden' : 'max-w-4xl overflow-y-auto'}`}
        >
          <DialogHeader>
            <DialogTitle>
              {step === 'upload' && 'Import Components with AI'}
              {step === 'preview' && 'Review Extracted Components'}
              {step === 'importing' && 'Importing Components...'}
              {step === 'complete' && 'Import Complete!'}
            </DialogTitle>
          </DialogHeader>

          {step === 'upload' && (
            <IntelligentDocumentUpload
              onExtractionComplete={handleExtractionComplete}
              onCancel={handleClose}
              onFileSelected={file => setFileSelected(!!file)}
            />
          )}

          {step === 'preview' && extractionResult && (
            <AIExtractionPreview
              extractionResult={extractionResult}
              msrpOptions={msrpOptions}
              sourceFile={sourceFile}
              onSourcePanelChange={setShowSourcePanel}
              onFullscreenChange={setIsFullscreen}
              onConfirm={handleConfirm}
              onCancel={() => setStep('upload')}
            />
          )}

          {step === 'importing' && (
            <div className="py-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-lg font-medium">Importing components...</p>
              <p className="text-sm text-muted-foreground mt-2">
                {importProgress.current} of {importProgress.total} imported
              </p>
            </div>
          )}

          {step === 'complete' && (
            <div className="py-12 text-center">
              <div className="text-green-600 mb-4">
                <svg
                  className="w-16 h-16 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p className="text-lg font-medium">
                Import completed successfully!
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {importProgress.total} components added to library
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={showConfirmDialog}
        title="שינויים לא נשמרו"
        message={
          step === 'importing'
            ? 'ייבוא רכיבים בתהליך. האם אתה בטוח שברצונך לבטל? הרכיבים לא ייובאו.'
            : 'קובץ הועלה וטרם יובא. האם אתה בטוח שברצונך לסגור? הרכיבים לא ייובאו.'
        }
        confirmText="כן, סגור"
        cancelText="חזור"
        type="warning"
        onConfirm={handleConfirmClose}
        onCancel={handleCancelClose}
      />
    </>
  );
};
