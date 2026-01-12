/**
 * Supplier Quote Import Component
 *
 * Enhanced version of ComponentAIImport that:
 * 1. Uploads file to Supabase Storage
 * 2. Saves quote metadata to supplier_quotes table
 * 3. Runs smart component matching (exact/fuzzy/AI)
 * 4. Shows match results in preview
 * 5. Creates component history entries
 *
 * Shared between ComponentLibrary and SupplierQuotesPage
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { IntelligentDocumentUpload } from '../library/IntelligentDocumentUpload';
import { AIExtractionPreview } from '../library/AIExtractionPreview';
import { useSupplierQuotes } from '../../hooks/useSupplierQuotes';
import { useComponents } from '../../hooks/useComponents';
import { useTeam } from '../../contexts/TeamContext';
import { supabase } from '../../supabaseClient';
import type { AIExtractionResult } from '../../services/claudeAI';
import type {
  Component,
  SupplierQuote,
  ComponentMatchDecision,
} from '../../types';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { logger } from '@/lib/logger';

interface SupplierQuoteImportProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (quote: SupplierQuote) => void;
}

type ImportStep = 'upload' | 'matching' | 'preview' | 'importing' | 'complete';

export const SupplierQuoteImport: React.FC<SupplierQuoteImportProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<ImportStep>('upload');
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [fileSelected, setFileSelected] = useState(false);
  const [extractionResult, setExtractionResult] =
    useState<AIExtractionResult | null>(null);
  const [_uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [importProgress, setImportProgress] = useState({
    current: 0,
    total: 0,
  });
  const [createdQuote, setCreatedQuote] = useState<SupplierQuote | null>(null);
  const [matchDecisions, setMatchDecisions] = useState<
    ComponentMatchDecision[]
  >([]);

  const { createQuote, addComponentHistory, processQuoteWithMatching } =
    useSupplierQuotes();
  const { addComponent } = useComponents();
  const { currentTeam } = useTeam();

  /**
   * Upload file to Supabase Storage
   * Returns URL if successful, or a placeholder if storage is unavailable
   */
  const uploadFileToStorage = async (file: File): Promise<string> => {
    try {
      if (!currentTeam) {
        throw new Error('No active team');
      }

      // Generate unique file path with team isolation
      const timestamp = new Date();
      const year = timestamp.getFullYear();
      const month = String(timestamp.getMonth() + 1).padStart(2, '0');
      const uuid = crypto.randomUUID();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${currentTeam.id}/${year}/${month}/${uuid}_${sanitizedName}`;

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
        logger.warn(
          '💡 TIP: Check Supabase Dashboard → Storage → Create "supplier-quotes" bucket if missing'
        );

        // Return a placeholder URL instead of null
        // This allows the import to continue even if storage fails
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
      logger.warn(
        '💡 TIP: To fix this, create "supplier-quotes" bucket in Supabase Dashboard'
      );

      // Show warning toast but don't block the import
      toast.warning('הקובץ לא נשמר באחסון, אך הייבוא ימשיך', {
        description: 'בדוק את הגדרות Supabase Storage',
      });

      // Return placeholder instead of null
      return `placeholder://storage-unavailable/${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    }
  };

  /**
   * Handle extraction complete - save file, create quote, and run smart matching
   */
  const handleExtractionComplete = async (
    result: AIExtractionResult,
    file: File
  ) => {
    logger.debug('📋 Extraction complete:', result);

    setExtractionResult(result);
    setUploadedFile(file);

    // Upload file to storage
    const fileUrl = await uploadFileToStorage(file);
    if (!fileUrl) {
      toast.error('שגיאה בהעלאת הקובץ');
      return;
    }

    // Create quote record
    const quote = await createQuote({
      fileName: file.name,
      fileUrl: fileUrl,
      fileType: (result.metadata.documentType as any) || 'excel',
      fileSizeKb: Math.round(file.size / 1024),
      status: 'completed',
      documentType: (result.metadata.documentType as any) || 'unknown',
      extractionMethod:
        (getExtractionMethod(result.metadata) as any) || 'native',
      confidenceScore: result.confidence,
      totalComponents: result.components.length,
      supplierName: result.metadata.supplier,
      quoteDate: result.metadata.quoteDate,
      metadata: result.metadata,
    });

    if (!quote) {
      toast.error('שגיאה בשמירת ההצעה');
      return;
    }

    logger.debug('✅ Quote saved:', quote);
    setCreatedQuote(quote);

    // Run smart matching for all components
    setStep('matching');
    await runSmartMatching(quote, result.components);
  };

  /**
   * Get extraction method from metadata
   */
  const getExtractionMethod = (metadata: any): string => {
    const docType = metadata.documentType;
    if (docType === 'excel') return 'native';
    if (docType === 'pdf') return metadata.extractionMethod || 'text';
    if (docType === 'image') return 'ai_vision';
    return 'unknown';
  };

  /**
   * Run smart matching for all components
   */
  const runSmartMatching = async (quote: SupplierQuote, components: any[]) => {
    try {
      logger.debug(
        '🔍 Running smart matching for',
        components.length,
        'components...'
      );

      const decisions: ComponentMatchDecision[] = [];

      // Process each component with smart matching
      for (let i = 0; i < components.length; i++) {
        const component = components[i];
        logger.debug(
          `\n🔍 Matching component ${i + 1}/${components.length}:`,
          component.name
        );

        // Run smart matching (3-tier: exact/fuzzy/AI)
        const matchResults = await processQuoteWithMatching(quote.id, [
          component,
        ]);
        const matchResult = matchResults[0];

        if (!matchResult) {
          logger.warn('⚠️  No match result returned for:', component.name);
          decisions.push({
            componentIndex: i,
            matchType: 'none',
            matches: [],
            userDecision: 'pending',
          });
          continue;
        }

        // Create match decision with default to 'pending' (user must choose)
        const decision: ComponentMatchDecision = {
          componentIndex: i,
          matchType: matchResult.matchType,
          matches: matchResult.matches,
          userDecision: 'pending', // Always pending - user must decide
          selectedMatchId:
            matchResult.matches.length > 0
              ? matchResult.matches[0].component.id
              : undefined,
        };

        decisions.push(decision);

        logger.debug(`✅ Match result: ${matchResult.matchType}`, {
          hasMatches: matchResult.matches.length > 0,
          topConfidence: matchResult.matches[0]?.confidence,
        });
      }

      // Store decisions and show preview
      setMatchDecisions(decisions);
      setStep('preview');

      logger.debug('✅ Smart matching complete:', {
        total: decisions.length,
        withMatches: decisions.filter(d => d.matches.length > 0).length,
        exact: decisions.filter(d => d.matchType === 'exact').length,
        fuzzy: decisions.filter(d => d.matchType === 'fuzzy').length,
        ai: decisions.filter(d => d.matchType === 'ai').length,
        none: decisions.filter(d => d.matchType === 'none').length,
      });
    } catch (error) {
      logger.error('❌ Smart matching failed:', error);
      toast.error('שגיאה בזיהוי רכיבים קיימים');
      // Continue to preview even if matching fails
      setMatchDecisions([]);
      setStep('preview');
    }
  };

  /**
   * Handle import confirmation with user decisions
   */
  const handleConfirm = async (
    components: Partial<Component>[],
    decisions: ComponentMatchDecision[]
  ) => {
    if (!createdQuote) {
      toast.error('שגיאה: הצעה לא נמצאה');
      return;
    }

    setStep('importing');
    setImportProgress({ current: 0, total: components.length });

    try {
      let importedCount = 0;
      let updatedCount = 0;
      let newCount = 0;

      // Process each component based on user decision
      for (let i = 0; i < components.length; i++) {
        const comp = components[i];
        const decision = decisions.find(d => d.componentIndex === i);

        logger.debug(
          `\n📦 Processing component ${i + 1}/${components.length}:`,
          comp.name
        );

        // Check user decision
        if (
          decision &&
          decision.userDecision === 'accept_match' &&
          decision.matches.length > 0
        ) {
          // User accepted the match - add to history
          const matchedComponent = decision.selectedMatchId
            ? decision.matches.find(
                m => m.component.id === decision.selectedMatchId
              )?.component
            : decision.matches[0].component;

          if (matchedComponent) {
            logger.debug(
              `✅ User accepted match: ${matchedComponent.name} (${decision.matchType} match)`
            );

            // First, clear the "current price" flag from ALL previous quotes for this component
            logger.debug(
              `🔄 Clearing 'current price' from previous quotes for component:`,
              matchedComponent.id
            );
            await supabase
              .from('component_quote_history')
              .update({ is_current_price: false })
              .eq('component_id', matchedComponent.id)
              .eq('is_current_price', true);

            // Now add the new price history entry with current price flag set to true
            await addComponentHistory(matchedComponent.id, createdQuote.id, {
              unitPriceNIS: comp.unitCostNIS,
              unitPriceUSD: comp.unitCostUSD,
              unitPriceEUR: comp.unitCostEUR,
              currency: comp.currency || 'USD',
              quoteDate: createdQuote.quoteDate,
              supplierName: createdQuote.supplierName,
              confidenceScore: decision.matches[0].confidence,
              isCurrentPrice: true, // Mark this as the new current price
            });

            // Also update the component's main price fields
            logger.debug(`💰 Updating component's current price`);
            await supabase
              .from('components')
              .update({
                unit_cost_nis: comp.unitCostNIS,
                unit_cost_usd: comp.unitCostUSD,
                unit_cost_eur: comp.unitCostEUR,
                currency: comp.currency || 'USD',
                updated_at: new Date().toISOString(),
              })
              .eq('id', matchedComponent.id);

            updatedCount++;
            logger.debug(`📊 Added to price history and updated current price`);
          }
        } else {
          // User wants to create new component (or no match found)
          logger.debug('✨ Creating new component');

          const newComponent = await addComponent({
            name: comp.name || '',
            manufacturer: comp.manufacturer || '',
            manufacturerPN: comp.manufacturerPN || '',
            supplier: comp.supplier || createdQuote.supplierName || '',
            category: comp.category || 'אחר',
            componentType: 'hardware', // Default to hardware for imported components
            description: comp.description || '',
            unitCostNIS: comp.unitCostNIS || 0,
            unitCostUSD: comp.unitCostUSD || 0,
            unitCostEUR: comp.unitCostEUR || 0,
            currency: comp.currency || 'USD',
            originalCost: comp.unitCostUSD || comp.unitCostNIS || 0,
            quoteDate:
              createdQuote.quoteDate || new Date().toISOString().split('T')[0],
            quoteFileUrl: createdQuote.fileUrl,
            notes: comp.notes || '',
          });

          if (newComponent) {
            // Add to history for new component
            await addComponentHistory(newComponent.id, createdQuote.id, {
              unitPriceNIS: comp.unitCostNIS,
              unitPriceUSD: comp.unitCostUSD,
              unitPriceEUR: comp.unitCostEUR,
              currency: comp.currency || 'USD',
              quoteDate: createdQuote.quoteDate,
              supplierName: createdQuote.supplierName,
              isCurrentPrice: true, // New component uses this as current price
            });

            newCount++;
            logger.debug(`✅ New component created`);
          }
        }

        importedCount++;
        setImportProgress({ current: importedCount, total: components.length });
      }

      setStep('complete');

      // Show success message
      const message = `${newCount} רכיבים חדשים נוספו, ${updatedCount} רכיבים קיימים עודכנו`;
      toast.success(message);

      // Close after showing success briefly
      setTimeout(() => {
        handleClose();
        if (onSuccess && createdQuote) {
          onSuccess(createdQuote);
        }
      }, 2000);
    } catch (error) {
      logger.error('Import failed:', error);
      toast.error('שגיאה בייבוא רכיבים');
      // Reset to preview to allow retry
      setStep('preview');
    }
  };

  const handleClose = () => {
    setStep('upload');
    setExtractionResult(null);
    setUploadedFile(null);
    setCreatedQuote(null);
    setMatchDecisions([]);
    setImportProgress({ current: 0, total: 0 });
    setFileSelected(false);
    setShowExitConfirm(false);
    onClose();
  };

  const hasUnsavedWork = () => {
    // Complete state has no unsaved work - import finished successfully
    if (step === 'complete') return false;

    return (
      fileSelected ||
      step !== 'upload' ||
      _uploadedFile !== null ||
      extractionResult !== null
    );
  };

  const handleInteractOutside = (e: any) => {
    if (hasUnsavedWork()) {
      e.preventDefault();
      setShowExitConfirm(true);
    }
  };

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={open => {
          if (!open) {
            if (hasUnsavedWork()) {
              setShowExitConfirm(true);
            } else {
              handleClose();
            }
          }
        }}
      >
        <DialogContent
          className="max-w-4xl max-h-[90vh] overflow-y-auto"
          onInteractOutside={handleInteractOutside}
          onEscapeKeyDown={handleInteractOutside}
        >
          <DialogHeader>
            <DialogTitle>
              {step === 'upload' && 'העלאת הצעת ספק'}
              {step === 'matching' && 'מזהה רכיבים קיימים...'}
              {step === 'preview' && 'בדיקת רכיבים שחולצו'}
              {step === 'importing' && 'מייבא רכיבים...'}
              {step === 'complete' && 'הייבוא הושלם!'}
            </DialogTitle>
          </DialogHeader>

          {step === 'upload' && (
            <IntelligentDocumentUpload
              onExtractionComplete={handleExtractionComplete}
              onCancel={handleClose}
              onFileSelected={file => setFileSelected(!!file)}
            />
          )}

          {step === 'matching' && (
            <div className="py-12 text-center" dir="rtl">
              <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
              <p className="text-lg font-medium">מריץ זיהוי חכם של רכיבים...</p>
              <p className="text-sm text-muted-foreground mt-2">
                בודק אם הרכיבים כבר קיימים בספרייה
              </p>
              <div className="text-xs text-muted-foreground mt-4 space-y-1">
                <p>🔍 שלב 1: חיפוש התאמה מדויקת</p>
                <p>📊 שלב 2: ניתוח התאמה מטושטשת</p>
                <p>🤖 שלב 3: בדיקה סמנטית באמצעות AI</p>
              </div>
            </div>
          )}

          {step === 'preview' && extractionResult && (
            <AIExtractionPreview
              extractionResult={extractionResult}
              matchDecisions={matchDecisions}
              onConfirm={handleConfirm}
              onCancel={() => setStep('upload')}
            />
          )}

          {step === 'importing' && (
            <div className="py-12 text-center" dir="rtl">
              <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
              <p className="text-lg font-medium">מייבא רכיבים...</p>
              <p className="text-sm text-muted-foreground mt-2">
                {importProgress.current} מתוך {importProgress.total} יובאו
              </p>
              <p className="text-xs text-muted-foreground mt-4">
                🤖 מריץ זיהוי חכם של רכיבים קיימים...
              </p>
            </div>
          )}

          {step === 'complete' && (
            <div className="py-12 text-center" dir="rtl">
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
              <p className="text-lg font-medium">הייבוא הושלם בהצלחה!</p>
              <p className="text-sm text-muted-foreground mt-2">
                {importProgress.total} רכיבים עובדו
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={showExitConfirm}
        title="ביטול ייבוא"
        message="הייבוא יבוטל והשינויים לא יישמרו. האם אתה בטוח?"
        confirmText="כן, בטל ייבוא"
        cancelText="המשך בייבוא"
        type="warning"
        onConfirm={handleClose}
        onCancel={() => setShowExitConfirm(false)}
      />
    </>
  );
};
