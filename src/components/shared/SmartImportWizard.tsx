/**
 * Smart Import Wizard - Unified Component Import System
 *
 * Combines ALL features from ComponentAIImport and SupplierQuoteImport:
 * ✅ AI file extraction (Excel/PDF/Images)
 * ✅ 3-tier duplicate detection (exact/fuzzy/AI)
 * ✅ MSRP pricing with global/per-item margins
 * ✅ Source file viewer with fullscreen
 * ✅ Bulk editing (manufacturer/supplier)
 * ✅ Match decision UI with confidence scores
 * ✅ Price history management
 * ✅ Activity logging
 * ✅ Team-scoped categories
 *
 * Used by BOTH:
 * - Component Library → "Import with AI" button
 * - Supplier Quotes → "Upload Quote" button
 *
 * Behavior is IDENTICAL regardless of entry point.
 */

import React, { useState } from 'react';
import { Dialog, DialogContent } from '../ui/dialog';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import {
  IntelligentDocumentUpload,
  type MSRPImportOptions,
} from '../library/IntelligentDocumentUpload';
import { AIExtractionPreview } from '../library/AIExtractionPreview';
import { useSupplierQuotes } from '../../hooks/useSupplierQuotes';
import { useComponents } from '../../hooks/useComponents';
import { useTeam } from '../../contexts/TeamContext';
import { supabase } from '../../supabaseClient';
import { findComponentMatches } from '../../services/componentMatcher';
import { logComponentBulkImport } from '../../services/activityLogService';
import type { AIExtractionResult } from '../../services/claudeAI';
import type {
  Component,
  ComponentMatchDecision,
  SupplierQuote,
} from '../../types';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { logger } from '@/lib/logger';
import { compareTwoStrings } from 'string-similarity';

// ============================================
// Types
// ============================================

interface SmartImportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (quote: SupplierQuote) => void;
}

type ImportStep = 'upload' | 'matching' | 'preview' | 'importing' | 'complete';

// ============================================
// Main Component
// ============================================

export const SmartImportWizard: React.FC<SmartImportWizardProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  // ============================================
  // State
  // ============================================
  const [step, setStep] = useState<ImportStep>('upload');
  const [extractionResult, setExtractionResult] =
    useState<AIExtractionResult | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [msrpOptions, setMsrpOptions] = useState<MSRPImportOptions>({
    mode: 'none',
  });
  const [showSourcePanel, setShowSourcePanel] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fileSelected, setFileSelected] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [createdQuote, setCreatedQuote] = useState<SupplierQuote | null>(null);
  const [matchDecisions, setMatchDecisions] = useState<
    ComponentMatchDecision[]
  >([]);
  const [importProgress, setImportProgress] = useState({
    current: 0,
    total: 0,
  });

  // ============================================
  // Hooks
  // ============================================
  const { createQuote, addComponentHistory } = useSupplierQuotes();
  const { addComponent } = useComponents();
  const { currentTeam } = useTeam();

  // ============================================
  // Helper Functions
  // ============================================

  /**
   * Upload file to Supabase Storage
   */
  const uploadFileToStorage = async (file: File): Promise<string> => {
    try {
      const timestamp = new Date();
      const year = timestamp.getFullYear();
      const month = String(timestamp.getMonth() + 1).padStart(2, '0');
      const uuid = crypto.randomUUID();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${year}/${month}/${uuid}_${sanitizedName}`;

      logger.debug('📤 Uploading file to Supabase Storage:', filePath);

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
  ): 'native' | 'text' | 'ai_vision' | 'structured' => {
    const docType = metadata.documentType;
    if (docType === 'excel') return 'native';
    if (docType === 'pdf') return 'text';
    if (docType === 'image') return 'ai_vision';
    return 'native';
  };

  /**
   * Check if supplier is really different (not just a typo)
   */
  const isSupplierReallyDifferent = (
    newSupplier: string,
    existingSupplier: string
  ): boolean => {
    if (!newSupplier || !existingSupplier) return false;

    const similarity = compareTwoStrings(
      newSupplier.toLowerCase().trim(),
      existingSupplier.toLowerCase().trim()
    );

    // If similarity < 70%, consider it a different supplier
    return similarity < 0.7;
  };

  // ============================================
  // Step 1: Handle Extraction Complete
  // ============================================

  const handleExtractionComplete = async (
    result: AIExtractionResult,
    file: File,
    options: MSRPImportOptions
  ) => {
    logger.debug('📋 Extraction complete:', result);

    setExtractionResult(result);
    setSourceFile(file);
    setMsrpOptions(options);

    // Upload file to storage
    const fileUrl = await uploadFileToStorage(file);

    // Create quote record
    const quote = await createQuote({
      fileName: file.name,
      fileUrl: fileUrl,
      fileType:
        (result.metadata.documentType as 'excel' | 'pdf' | 'image') || 'excel',
      fileSizeKb: Math.round(file.size / 1024),
      status: 'completed',
      documentType:
        (result.metadata.documentType as
          | 'excel'
          | 'pdf'
          | 'image'
          | 'unknown') || 'unknown',
      extractionMethod: getExtractionMethod(result.metadata),
      confidenceScore: result.confidence,
      totalComponents: result.components.length,
      supplierName: result.metadata.supplier || 'Import',
      quoteDate:
        result.metadata.quoteDate || new Date().toISOString().split('T')[0],
      metadata: {
        ...result.metadata,
        msrpMode: options.mode,
        importSource: 'smart_import_wizard',
      },
    });

    if (!quote) {
      toast.error('שגיאה בשמירת הקובץ');
      return;
    }

    logger.debug('✅ Quote saved:', quote.id);
    setCreatedQuote(quote);

    // Run smart matching
    setStep('matching');
    await runSmartMatching(quote, result.components);
  };

  // ============================================
  // Step 2: Run Smart Matching (3-Tier)
  // ============================================

  const runSmartMatching = async (
    __quote: SupplierQuote,
    components: any[]
  ) => {
    try {
      logger.debug(
        '🔍 Running smart matching for',
        components.length,
        'components...'
      );

      const decisions: ComponentMatchDecision[] = [];

      for (let i = 0; i < components.length; i++) {
        const component = components[i];
        logger.debug(
          `🔍 Matching component ${i + 1}/${components.length}:`,
          component.name
        );

        // Run 3-tier matching: exact → fuzzy → AI
        const matchResult = await findComponentMatches(component);

        if (!matchResult) {
          logger.warn('⚠️ No match result returned for:', component.name);
          decisions.push({
            componentIndex: i,
            matchType: 'none',
            matches: [],
            userDecision: 'create_new', // Auto-select create new for no matches
          });
          continue;
        }

        // Create match decision
        let userDecision: 'pending' | 'accept_match' | 'create_new' = 'pending';

        // Auto-select based on match type
        if (matchResult.matchType === 'exact') {
          // Exact match (100%) - auto-select update but allow override
          userDecision = 'accept_match';
          logger.debug('✅ Exact match - auto-selected UPDATE');
        } else if (matchResult.matchType === 'none') {
          // No match - auto-select create new
          userDecision = 'create_new';
          logger.debug('✅ No match - auto-selected CREATE NEW');
        } else {
          // Fuzzy/AI match - require user decision
          userDecision = 'pending';
          logger.debug('⚠️ Fuzzy/AI match - REQUIRES USER DECISION');
        }

        const decision: ComponentMatchDecision = {
          componentIndex: i,
          matchType: matchResult.matchType,
          matches: matchResult.matches,
          userDecision,
          selectedMatchId:
            matchResult.matches.length > 0
              ? matchResult.matches[0].component.id
              : undefined,
        };

        decisions.push(decision);

        logger.debug(`Match result: ${matchResult.matchType}`, {
          hasMatches: matchResult.matches.length > 0,
          topConfidence: matchResult.matches[0]?.confidence,
          decision: userDecision,
        });
      }

      setMatchDecisions(decisions);
      setStep('preview');

      logger.debug('✅ Smart matching complete:', {
        total: decisions.length,
        exactAutoSelected: decisions.filter(d => d.matchType === 'exact')
          .length,
        requiresDecision: decisions.filter(d => d.userDecision === 'pending')
          .length,
        createNew: decisions.filter(d => d.userDecision === 'create_new')
          .length,
      });
    } catch (error) {
      logger.error('❌ Smart matching failed:', error);
      toast.error('שגיאה בזיהוי רכיבים קיימים');
      setMatchDecisions([]);
      setStep('preview');
    }
  };

  // ============================================
  // Step 3: Handle Import Confirmation
  // ============================================

  const handleConfirm = async (
    components: Partial<Component>[],
    decisions: ComponentMatchDecision[]
  ) => {
    if (!createdQuote) {
      toast.error('שגיאה: הצעה לא נמצאה');
      return;
    }

    // Validate: All matches must have a decision
    const pendingDecisions = decisions.filter(
      d => d.matches.length > 0 && d.userDecision === 'pending'
    );

    if (pendingDecisions.length > 0) {
      toast.error(`יש ${pendingDecisions.length} רכיבים שדורשים החלטה`);
      return;
    }

    setStep('importing');
    setImportProgress({ current: 0, total: components.length });

    try {
      let updatedCount = 0;
      let newCount = 0;

      // Generate unique operation ID for bulk import tracking
      const operationId = `bulk-import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Start bulk operation tracking
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

      // Process each component
      for (let i = 0; i < components.length; i++) {
        const comp = components[i];
        const decision = decisions.find(d => d.componentIndex === i);

        logger.debug(
          `📦 Processing component ${i + 1}/${components.length}:`,
          comp.name
        );

        if (
          decision &&
          decision.userDecision === 'accept_match' &&
          decision.matches.length > 0
        ) {
          // User accepted match - update existing component
          const matchedComponent = decision.selectedMatchId
            ? decision.matches.find(
                m => m.component.id === decision.selectedMatchId
              )?.component
            : decision.matches[0].component;

          if (matchedComponent) {
            logger.debug(
              `✅ Updating existing component: ${matchedComponent.name}`
            );

            // Clear "current price" flag from previous quotes
            await supabase
              .from('component_quote_history')
              .update({ is_current_price: false })
              .eq('component_id', matchedComponent.id)
              .eq('is_current_price', true);

            // Add new price history
            await addComponentHistory(matchedComponent.id, createdQuote.id, {
              unitPriceNIS: comp.unitCostNIS,
              unitPriceUSD: comp.unitCostUSD,
              unitPriceEUR: comp.unitCostEUR,
              currency: comp.currency || 'USD',
              quoteDate: createdQuote.quoteDate,
              supplierName: createdQuote.supplierName,
              confidenceScore: decision.matches[0].confidence,
              isCurrentPrice: true,
            });

            // Update component's current price
            const updateData: any = {
              unit_cost_nis: comp.unitCostNIS,
              unit_cost_usd: comp.unitCostUSD,
              unit_cost_eur: comp.unitCostEUR,
              currency: comp.currency || 'USD',
              updated_at: new Date().toISOString(),
            };

            // Check if supplier is really different (not just a typo)
            if (comp.supplier && matchedComponent.supplier) {
              if (
                isSupplierReallyDifferent(
                  comp.supplier,
                  matchedComponent.supplier
                )
              ) {
                logger.debug(
                  `⚠️ Supplier really different: "${comp.supplier}" vs "${matchedComponent.supplier}" - creating new component instead`
                );
                // Don't update - create new component instead
                const newComponent = await addComponent({
                  ...comp,
                  name: comp.name || '',
                  category: comp.category || 'אחר',
                  componentType: comp.componentType || 'hardware',
                  quoteDate: createdQuote.quoteDate,
                  quoteFileUrl: createdQuote.fileUrl,
                } as Omit<Component, 'id' | 'createdAt' | 'updatedAt'>);

                if (newComponent) {
                  await addComponentHistory(newComponent.id, createdQuote.id, {
                    unitPriceNIS: comp.unitCostNIS,
                    unitPriceUSD: comp.unitCostUSD,
                    unitPriceEUR: comp.unitCostEUR,
                    currency: comp.currency || 'USD',
                    quoteDate: createdQuote.quoteDate,
                    supplierName: createdQuote.supplierName,
                    isCurrentPrice: true,
                  });
                  newCount++;
                }
                setImportProgress({ current: i + 1, total: components.length });
                continue;
              }
            }

            await supabase
              .from('components')
              .update(updateData)
              .eq('id', matchedComponent.id);

            updatedCount++;
          }
        } else {
          // Create new component
          logger.debug('✨ Creating new component');

          const newComponent = await addComponent({
            name: comp.name || '',
            manufacturer: comp.manufacturer || '',
            manufacturerPN: comp.manufacturerPN || '',
            supplier: comp.supplier || createdQuote.supplierName || '',
            category: comp.category || 'אחר',
            componentType: comp.componentType || 'hardware',
            description: comp.description || '',
            unitCostNIS: comp.unitCostNIS || 0,
            unitCostUSD: comp.unitCostUSD || 0,
            unitCostEUR: comp.unitCostEUR || 0,
            currency: comp.currency || 'USD',
            originalCost: comp.unitCostUSD || comp.unitCostNIS || 0,
            quoteDate: createdQuote.quoteDate,
            quoteFileUrl: createdQuote.fileUrl,
            notes: comp.notes || '',
            msrpPrice: comp.msrpPrice,
            msrpCurrency: comp.msrpCurrency,
            partnerDiscountPercent: comp.partnerDiscountPercent,
          } as Omit<Component, 'id' | 'createdAt' | 'updatedAt'>);

          if (newComponent) {
            await addComponentHistory(newComponent.id, createdQuote.id, {
              unitPriceNIS: comp.unitCostNIS,
              unitPriceUSD: comp.unitCostUSD,
              unitPriceEUR: comp.unitCostEUR,
              currency: comp.currency || 'USD',
              quoteDate: createdQuote.quoteDate,
              supplierName: createdQuote.supplierName,
              isCurrentPrice: true,
            });
            newCount++;
          }
        }

        setImportProgress({ current: i + 1, total: components.length });
      }

      // End bulk operation tracking
      if (components.length > 1 && currentTeam) {
        try {
          await supabase.rpc('end_bulk_operation', {
            p_operation_id: operationId,
          });
          logger.debug('Ended bulk import operation:', operationId);
        } catch (error) {
          logger.warn('Failed to end bulk operation tracking:', error);
        }
      }

      // Log bulk import activity
      if (
        currentTeam &&
        newCount + updatedCount > 1 &&
        sourceFile &&
        extractionResult
      ) {
        await logComponentBulkImport(
          currentTeam.id,
          newCount + updatedCount,
          sourceFile.name,
          extractionResult.metadata.documentType as 'excel' | 'pdf' | 'csv',
          {
            parser: getExtractionMethod(extractionResult.metadata),
            confidence: extractionResult.confidence,
          }
        );
      }

      setStep('complete');

      // Show success message
      const message =
        newCount > 0 && updatedCount > 0
          ? `${newCount} רכיבים חדשים נוספו, ${updatedCount} רכיבים קיימים עודכנו`
          : newCount > 0
            ? `${newCount} רכיבים חדשים נוספו`
            : `${updatedCount} רכיבים קיימים עודכנו`;

      toast.success(message);

      // Auto-close after 1.5 seconds
      setTimeout(() => {
        performClose();
        if (onSuccess && createdQuote) {
          onSuccess(createdQuote);
        }
      }, 1500);
    } catch (error) {
      logger.error('Import failed:', error);
      toast.error('שגיאה בייבוא רכיבים');
      setStep('preview');
    }
  };

  // ============================================
  // Dialog Management
  // ============================================

  const hasUnsavedChanges = (): boolean => {
    if (step === 'complete') return false;
    if (step === 'preview' || step === 'matching' || step === 'importing')
      return true;
    if (fileSelected) return true;
    return false;
  };

  const handleClose = () => {
    if (isFullscreen) return;

    if (hasUnsavedChanges()) {
      setShowConfirmDialog(true);
      return;
    }

    performClose();
  };

  const performClose = () => {
    setStep('upload');
    setExtractionResult(null);
    setSourceFile(null);
    setMsrpOptions({ mode: 'none' });
    setShowSourcePanel(false);
    setIsFullscreen(false);
    setFileSelected(false);
    setCreatedQuote(null);
    setMatchDecisions([]);
    setImportProgress({ current: 0, total: 0 });
    setShowConfirmDialog(false);
    onClose();
  };

  // ============================================
  // Render
  // ============================================

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent
          className={`max-h-[90vh] transition-all duration-300 ${
            showSourcePanel
              ? 'max-w-[95vw] w-[95vw] overflow-hidden'
              : 'max-w-4xl overflow-y-auto'
          }`}
        >
          {/* DialogHeader removed - Hebrew titles are shown in component content */}

          {/* Step 1: Upload */}
          {step === 'upload' && (
            <IntelligentDocumentUpload
              onExtractionComplete={handleExtractionComplete}
              onCancel={handleClose}
              onFileSelected={file => setFileSelected(!!file)}
            />
          )}

          {/* Step 2: Matching */}
          {step === 'matching' && (
            <div className="py-12 text-center" dir="rtl">
              <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
              <p className="text-lg font-medium">מריץ זיהוי חכם של רכיבים...</p>
              <p className="text-sm text-muted-foreground mt-2">
                בודק אם הרכיבים כבר קיימים בספרייה
              </p>
              <div className="text-xs text-muted-foreground mt-4 space-y-1">
                <p>🎯 Tier 1: Exact Match (Manufacturer + Part Number)</p>
                <p>📊 Tier 2: Fuzzy Logic (String Similarity)</p>
                <p>🤖 Tier 3: AI Semantic Analysis</p>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && extractionResult && (
            <AIExtractionPreview
              extractionResult={extractionResult}
              msrpOptions={msrpOptions}
              matchDecisions={matchDecisions}
              sourceFile={sourceFile}
              onSourcePanelChange={setShowSourcePanel}
              onFullscreenChange={setIsFullscreen}
              onConfirm={handleConfirm}
              onCancel={() => setStep('upload')}
            />
          )}

          {/* Step 4: Importing */}
          {step === 'importing' && (
            <div className="py-12 text-center">
              <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
              <p className="text-lg font-medium">מייבא רכיבים...</p>
              <p className="text-sm text-muted-foreground mt-2">
                יובאו {importProgress.current} מתוך {importProgress.total}
              </p>
            </div>
          )}

          {/* Step 5: Complete */}
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
              <p className="text-lg font-medium">הייבוא הושלם בהצלחה!</p>
              <p className="text-sm text-muted-foreground mt-2">
                {importProgress.total} רכיבים עובדו
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
            ? 'ייבוא רכיבים בתהליך. האם אתה בטוח שברצונך לבטל?'
            : 'קובץ הועלה וטרם יובא. האם אתה בטוח שברצונך לסגור?'
        }
        confirmText="כן, סגור"
        cancelText="חזור"
        type="warning"
        onConfirm={() => {
          setShowConfirmDialog(false);
          performClose();
        }}
        onCancel={() => setShowConfirmDialog(false)}
      />
    </>
  );
};
