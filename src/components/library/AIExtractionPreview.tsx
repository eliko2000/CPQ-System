import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle,
  Edit2,
  Trash2,
  AlertTriangle,
  TrendingUp,
  Package,
  Sparkles,
  GitMerge,
  Plus,
  FileText,
  PanelLeftClose,
  PanelLeft,
  Maximize2,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Badge } from '../ui/badge';
import type {
  AIExtractionResult,
  AIExtractedComponent,
} from '../../services/claudeAI';
import type { Component, ComponentMatchDecision } from '../../types';
import { normalizeComponentPrices } from '../../utils/currencyConversion';
import type { MSRPImportOptions } from './IntelligentDocumentUpload';
import {
  getComponentCategories,
  CATEGORIES_UPDATED_EVENT,
} from '../../constants/settings';
import { logger } from '@/lib/logger';
import { useTeam } from '../../contexts/TeamContext';
import { SourceFileViewer } from './viewers';

// Type guards for metadata
interface ExcelMetadata {
  sheetName?: string;
  rowCount?: number;
  columnHeaders?: string[];
  detectedColumns?: Record<string, number>;
  sheetsProcessed?: number;
}

interface PDFMetadata {
  pageCount?: number;
  textLength?: number;
  extractionMethod?: 'text' | 'structured';
  hasTabularData?: boolean;
}

function hasExcelMetadata(metadata: unknown): metadata is ExcelMetadata {
  return (
    typeof metadata === 'object' && metadata !== null && 'sheetName' in metadata
  );
}

function hasPDFMetadata(metadata: unknown): metadata is PDFMetadata {
  return (
    typeof metadata === 'object' && metadata !== null && 'pageCount' in metadata
  );
}

interface AIExtractionPreviewProps {
  extractionResult: AIExtractionResult;
  msrpOptions?: MSRPImportOptions; // Optional - not all callers provide it
  matchDecisions?: ComponentMatchDecision[];
  sourceFile?: File | null; // Original file for side-by-side preview
  onSourcePanelChange?: (isOpen: boolean) => void; // Callback when source panel toggles
  onFullscreenChange?: (isFullscreen: boolean) => void; // Callback when fullscreen state changes
  onConfirm: (
    components: Partial<Component>[],
    decisions: ComponentMatchDecision[]
  ) => void;
  onCancel: () => void;
}

type ComponentStatus = 'approved' | 'modified' | 'rejected';

interface PreviewComponent extends AIExtractedComponent {
  id: string;
  status: ComponentStatus;
  isEditing: boolean;
  matchDecision?: ComponentMatchDecision;
  marginPercent?: number; // Per-item margin override (if different from global)
  hasMarginOverride?: boolean; // Tracks if this item has custom margin
}

const COMPONENT_TYPES = [
  { value: 'hardware', label: 'חומרה' },
  { value: 'software', label: 'תוכנה' },
  { value: 'labor', label: 'עבודה' },
] as const;

const LABOR_SUBTYPES = [
  { value: 'engineering', label: 'הנדסה' },
  { value: 'commissioning', label: 'הפעלה' },
  { value: 'installation', label: 'התקנה' },
  { value: 'programming', label: 'תכנות' },
] as const;

export const AIExtractionPreview: React.FC<AIExtractionPreviewProps> = ({
  extractionResult,
  msrpOptions,
  matchDecisions = [],
  sourceFile,
  onSourcePanelChange,
  onFullscreenChange,
  onConfirm,
  onCancel,
}) => {
  // State for showing/hiding source file panel
  const [showSourcePanel, setShowSourcePanel] = useState(false);
  // State for fullscreen mode
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Toggle source panel and notify parent
  const toggleSourcePanel = (show: boolean) => {
    setShowSourcePanel(show);
    onSourcePanelChange?.(show);
  };

  // Notify parent when fullscreen state changes
  useEffect(() => {
    onFullscreenChange?.(isFullscreen);
  }, [isFullscreen, onFullscreenChange]);

  // Handle entering fullscreen
  const enterFullscreen = useCallback(() => {
    setIsFullscreen(true);
  }, []);

  // Handle exiting fullscreen
  const exitFullscreen = useCallback(() => {
    setIsFullscreen(false);
  }, []);

  // Get current team for team-scoped settings
  const { currentTeam } = useTeam();

  // Load team-specific categories dynamically
  const [categories, setCategories] = useState<string[]>(() =>
    getComponentCategories(currentTeam?.id)
  );

  // Global margin % state (for discount mode)
  const [globalMarginPercent, setGlobalMarginPercent] = useState<number>(
    msrpOptions?.partnerDiscountPercent || 25
  );

  const [components, setComponents] = useState<PreviewComponent[]>(
    extractionResult.components.map((c, idx) => {
      const processedComponent = { ...c };

      // Mode A: File contains dual columns (Partner + MSRP)
      // Claude AI already extracted both prices, now calculate discount %
      if (c.msrpPrice && c.msrpCurrency) {
        logger.debug('[AIExtractionPreview] Mode A detected - dual columns', {
          componentIndex: idx,
          componentName: c.name,
          msrpPrice: c.msrpPrice,
          msrpCurrency: c.msrpCurrency,
          unitPriceUSD: c.unitPriceUSD,
          unitPriceNIS: c.unitPriceNIS,
          unitPriceEUR: c.unitPriceEUR,
        });

        // Calculate discount % from extracted prices
        const partnerPrice =
          c.msrpCurrency === 'USD'
            ? c.unitPriceUSD
            : c.msrpCurrency === 'NIS'
              ? c.unitPriceNIS
              : c.msrpCurrency === 'EUR'
                ? c.unitPriceEUR
                : 0;

        if (partnerPrice && c.msrpPrice) {
          // Discount % = (MSRP - Partner) / MSRP × 100
          const discountPercent =
            ((c.msrpPrice - partnerPrice) / c.msrpPrice) * 100;
          processedComponent.partnerDiscountPercent =
            Math.round(discountPercent * 100) / 100; // Round to 2 decimals

          logger.debug('[AIExtractionPreview] Calculated discount %', {
            componentIndex: idx,
            msrpPrice: c.msrpPrice,
            partnerPrice: partnerPrice,
            discountPercent: processedComponent.partnerDiscountPercent,
          });
        }
      }
      // Mode B: Apply user-entered discount % to prices
      else if (
        msrpOptions?.mode === 'discount' &&
        msrpOptions.partnerDiscountPercent
      ) {
        logger.debug('[AIExtractionPreview] Mode B detected - discount %', {
          componentIndex: idx,
          componentName: c.name,
          mode: msrpOptions.mode,
          partnerDiscountPercent: msrpOptions.partnerDiscountPercent,
          msrpCurrency: msrpOptions.msrpCurrency,
        });
        const discount = msrpOptions.partnerDiscountPercent / 100;
        const msrpCurrency = msrpOptions?.msrpCurrency || 'USD';

        // Prices in file are MSRP, calculate partner price
        if (msrpCurrency === 'USD' && c.unitPriceUSD) {
          processedComponent.msrpPrice = c.unitPriceUSD;
          processedComponent.msrpCurrency = 'USD';
          processedComponent.partnerDiscountPercent =
            msrpOptions.partnerDiscountPercent;
          processedComponent.unitPriceUSD = c.unitPriceUSD * (1 - discount);
        } else if (msrpCurrency === 'NIS' && c.unitPriceNIS) {
          processedComponent.msrpPrice = c.unitPriceNIS;
          processedComponent.msrpCurrency = 'NIS';
          processedComponent.partnerDiscountPercent =
            msrpOptions.partnerDiscountPercent;
          processedComponent.unitPriceNIS = c.unitPriceNIS * (1 - discount);
        } else if (msrpCurrency === 'EUR' && c.unitPriceEUR) {
          processedComponent.msrpPrice = c.unitPriceEUR;
          processedComponent.msrpCurrency = 'EUR';
          processedComponent.partnerDiscountPercent =
            msrpOptions.partnerDiscountPercent;
          processedComponent.unitPriceEUR = c.unitPriceEUR * (1 - discount);
        }
      }
      // Mode C: Regular import (no MSRP)
      // No processing needed

      return {
        ...processedComponent,
        id: `extracted-${idx}`,
        status: 'approved' as ComponentStatus,
        isEditing: false,
        matchDecision: matchDecisions.find(d => d.componentIndex === idx),
      };
    })
  );

  // Reload categories when team context becomes available or changes
  useEffect(() => {
    setCategories(getComponentCategories(currentTeam?.id));
  }, [currentTeam?.id]);

  // Listen for category updates from settings
  useEffect(() => {
    const handleCategoriesUpdated = () => {
      setCategories(getComponentCategories(currentTeam?.id));
    };

    window.addEventListener(CATEGORIES_UPDATED_EVENT, handleCategoriesUpdated);
    return () => {
      window.removeEventListener(
        CATEGORIES_UPDATED_EVENT,
        handleCategoriesUpdated
      );
    };
  }, [currentTeam?.id]);

  const [localMatchDecisions, setLocalMatchDecisions] =
    useState<ComponentMatchDecision[]>(matchDecisions);

  // Bulk edit state
  const [bulkManufacturer, setBulkManufacturer] = useState<string>('');
  const [bulkSupplier, setBulkSupplier] = useState<string>('');

  const handleStatusChange = (id: string, status: ComponentStatus) => {
    setComponents(prev =>
      prev.map(c => (c.id === id ? { ...c, status, isEditing: false } : c))
    );
  };

  const handleEdit = (id: string) => {
    setComponents(prev =>
      prev.map(c => (c.id === id ? { ...c, isEditing: !c.isEditing } : c))
    );
  };

  const handleFieldChange = (
    id: string,
    field: keyof AIExtractedComponent,
    value: any
  ) => {
    setComponents(prev =>
      prev.map(c =>
        c.id === id
          ? { ...c, [field]: value, status: 'modified' as ComponentStatus }
          : c
      )
    );
  };

  const handleDelete = (id: string) => {
    setComponents(prev => prev.filter(c => c.id !== id));
  };

  /**
   * Handle match decision change
   */
  const handleMatchDecision = (
    componentIndex: number,
    decision: 'accept_match' | 'create_new'
  ) => {
    setLocalMatchDecisions(prev =>
      prev.map(d =>
        d.componentIndex === componentIndex
          ? { ...d, userDecision: decision }
          : d
      )
    );

    // Also update the component's match decision
    setComponents(prev =>
      prev.map((c, idx) =>
        idx === componentIndex && c.matchDecision
          ? {
              ...c,
              matchDecision: { ...c.matchDecision, userDecision: decision },
            }
          : c
      )
    );
  };

  /**
   * Apply bulk manufacturer and supplier to all components
   */
  const handleBulkApply = () => {
    setComponents(prev =>
      prev.map(c => ({
        ...c,
        manufacturer: bulkManufacturer || c.manufacturer,
        supplier: bulkSupplier || c.supplier,
        status:
          (bulkManufacturer || bulkSupplier) && c.status === 'approved'
            ? ('modified' as ComponentStatus)
            : c.status,
      }))
    );
  };

  /**
   * Recalculate partner price from MSRP based on margin %
   * Formula: Partner Price = MSRP × (1 - Margin% / 100)
   */
  const recalculatePriceFromMargin = (
    msrpPrice: number,
    msrpCurrency: 'USD' | 'NIS' | 'EUR',
    marginPercent: number
  ) => {
    const discountFactor = 1 - marginPercent / 100;
    const partnerPrice = msrpPrice * discountFactor;

    // Return partner price in all three currencies
    // Only the MSRP currency is calculated, others remain undefined
    if (msrpCurrency === 'USD') {
      return {
        unitPriceUSD: partnerPrice,
        unitPriceNIS: undefined,
        unitPriceEUR: undefined,
      };
    } else if (msrpCurrency === 'NIS') {
      return {
        unitPriceUSD: undefined,
        unitPriceNIS: partnerPrice,
        unitPriceEUR: undefined,
      };
    } else {
      return {
        unitPriceUSD: undefined,
        unitPriceNIS: undefined,
        unitPriceEUR: partnerPrice,
      };
    }
  };

  /**
   * Handle global margin change - recalculate all components without overrides
   */
  const handleGlobalMarginChange = (newMargin: number) => {
    setGlobalMarginPercent(newMargin);

    // Recalculate all components that don't have margin override
    setComponents(prev =>
      prev.map(c => {
        // Skip if no MSRP or has manual override
        if (!c.msrpPrice || !c.msrpCurrency || c.hasMarginOverride) {
          return c;
        }

        // Recalculate partner price from MSRP
        const newPrices = recalculatePriceFromMargin(
          c.msrpPrice,
          c.msrpCurrency,
          newMargin
        );

        return {
          ...c,
          ...newPrices,
          partnerDiscountPercent: newMargin,
          marginPercent: newMargin,
          status: 'modified' as ComponentStatus,
        };
      })
    );
  };

  /**
   * Handle per-item margin change - mark as override and recalculate
   */
  const handleItemMarginChange = (id: string, newMargin: number) => {
    setComponents(prev =>
      prev.map(c => {
        if (c.id !== id || !c.msrpPrice || !c.msrpCurrency) {
          return c;
        }

        // Recalculate partner price from MSRP
        const newPrices = recalculatePriceFromMargin(
          c.msrpPrice,
          c.msrpCurrency,
          newMargin
        );

        return {
          ...c,
          ...newPrices,
          partnerDiscountPercent: newMargin,
          marginPercent: newMargin,
          hasMarginOverride: true,
          status: 'modified' as ComponentStatus,
        };
      })
    );
  };

  // NOTE: handleSwapPrices function removed - was unused in current implementation
  // It was intended for swapping partner and MSRP columns if Claude AI extracts them in wrong order
  // Can be re-added if needed for 'column' mode in the future

  const handleConfirm = () => {
    const approvedComponents = components
      .filter(c => c.status !== 'rejected')
      .map((c): Partial<Component> => {
        // Normalize prices - ensure all currencies are calculated
        const normalizedPrices = normalizeComponentPrices({
          unitCostNIS: c.unitPriceNIS,
          unitCostUSD: c.unitPriceUSD,
          unitCostEUR: c.unitPriceEUR,
          currency: c.currency,
          originalCost: c.unitPriceNIS || c.unitPriceUSD || c.unitPriceEUR || 0,
        });

        const component = {
          name: c.name,
          description: c.description,
          category: c.category || 'אחר',
          manufacturer: c.manufacturer || '',
          manufacturerPN: c.manufacturerPN || '',
          supplier: c.supplier || extractionResult.metadata.supplier || '',
          unitCostNIS: normalizedPrices.unitCostNIS,
          unitCostUSD: normalizedPrices.unitCostUSD,
          unitCostEUR: normalizedPrices.unitCostEUR,
          currency: normalizedPrices.currency,
          originalCost: normalizedPrices.originalCost,
          // MSRP fields
          msrpPrice: c.msrpPrice,
          msrpCurrency: c.msrpCurrency,
          partnerDiscountPercent: c.partnerDiscountPercent,
          quoteDate:
            c.quoteDate ||
            extractionResult.metadata.quoteDate ||
            new Date().toISOString().split('T')[0],
          quoteFileUrl: '', // Will be set when saved
          notes: c.notes,
        };

        logger.debug('[AIExtractionPreview] Passing component to onConfirm', {
          componentName: c.name,
          msrpPrice: component.msrpPrice,
          msrpCurrency: component.msrpCurrency,
          partnerDiscountPercent: component.partnerDiscountPercent,
          unitPriceUSD: component.unitCostUSD,
          unitPriceNIS: component.unitCostNIS,
        });

        return component;
      });

    logger.info('[AIExtractionPreview] Confirming import', {
      totalComponents: approvedComponents.length,
      componentsWithMSRP: approvedComponents.filter(c => c.msrpPrice).length,
    });

    onConfirm(approvedComponents, localMatchDecisions);
  };

  const approvedCount = components.filter(c => c.status === 'approved').length;
  const modifiedCount = components.filter(c => c.status === 'modified').length;

  // Match statistics
  const matchedCount = components.filter(
    c => c.matchDecision && c.matchDecision.matches.length > 0
  ).length;
  const acceptedMatchCount = localMatchDecisions.filter(
    d => d.userDecision === 'accept_match'
  ).length;
  const newComponentCount = components.length - acceptedMatchCount;

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  // Main content JSX (extracted for reuse in split panel)
  const mainContent = (
    <div className="space-y-6 h-full overflow-y-auto">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-500" />
            <h2 className="text-xl font-semibold">סקירת רכיבים שחולצו</h2>
          </div>
          {/* View Source Button */}
          {sourceFile && (
            <Button
              variant={showSourcePanel ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleSourcePanel(!showSourcePanel)}
              className="gap-2"
            >
              {showSourcePanel ? (
                <>
                  <PanelLeftClose className="w-4 h-4" />
                  הסתר מקור
                </>
              ) : (
                <>
                  <PanelLeft className="w-4 h-4" />
                  הצג מקור
                </>
              )}
            </Button>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-blue-700 mb-1">
              <Package className="w-4 h-4" />
              <span className="text-sm font-medium">סה"כ נמצאו</span>
            </div>
            <p className="text-2xl font-bold text-blue-900">
              {components.length}
            </p>
          </div>

          <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-cyan-700 mb-1">
              <GitMerge className="w-4 h-4" />
              <span className="text-sm font-medium">זוהו קיימים</span>
            </div>
            <p className="text-2xl font-bold text-cyan-900">{matchedCount}</p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-700 mb-1">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">אושרו</span>
            </div>
            <p className="text-2xl font-bold text-green-900">{approvedCount}</p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-yellow-700 mb-1">
              <Edit2 className="w-4 h-4" />
              <span className="text-sm font-medium">שונו</span>
            </div>
            <p className="text-2xl font-bold text-yellow-900">
              {modifiedCount}
            </p>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-purple-700 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm font-medium">רמת ביטחון</span>
            </div>
            <p className="text-2xl font-bold text-purple-900">
              {Math.round(extractionResult.confidence * 100)}%
            </p>
          </div>
        </div>

        {/* Match Summary */}
        {matchedCount > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <GitMerge className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-medium text-blue-900">
                סיכום זיהוי רכיבים
              </h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div>
                <span className="text-blue-700">רכיבים דומים שנמצאו:</span>
                <p className="font-bold text-blue-900">{matchedCount}</p>
              </div>
              <div>
                <span className="text-green-700">יעדכנו מחיר:</span>
                <p className="font-bold text-green-900">{acceptedMatchCount}</p>
              </div>
              <div>
                <span className="text-purple-700">יווצרו חדשים:</span>
                <p className="font-bold text-purple-900">{newComponentCount}</p>
              </div>
            </div>
            {localMatchDecisions.filter(d => d.userDecision === 'pending')
              .length > 0 && (
              <div className="mt-2 text-xs text-blue-600 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                <span>
                  יש{' '}
                  {
                    localMatchDecisions.filter(
                      d => d.userDecision === 'pending'
                    ).length
                  }{' '}
                  רכיבים שממתינים להחלטה
                </span>
              </div>
            )}
          </div>
        )}

        {/* Global Margin Edit Section - Show only in discount mode */}
        {msrpOptions?.mode === 'discount' && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <h3 className="text-sm font-medium text-green-900">
                שולי רווח גלובליים - החל על כל הרכיבים
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div className="space-y-1">
                <label className="text-xs text-green-700 font-medium">
                  אחוז שולי רווח (%)
                </label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={globalMarginPercent}
                  onChange={e =>
                    handleGlobalMarginChange(parseFloat(e.target.value) || 0)
                  }
                  className="bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-green-700 font-medium">
                  נוסחה
                </label>
                <div className="text-xs text-green-600 font-mono bg-white p-2 rounded border">
                  מחיר שותף = MSRP × (1 - {globalMarginPercent}%)
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-green-700 font-medium">
                  דוגמה
                </label>
                <div className="text-xs text-green-600 bg-white p-2 rounded border">
                  MSRP $100 → שותף $
                  {(100 * (1 - globalMarginPercent / 100)).toFixed(2)}
                </div>
              </div>
            </div>
            <p className="text-xs text-green-600 mt-2">
              💡 שינוי שולי הרווח הגלובליים יחושב מחדש את כל הרכיבים (פרט לאלה
              שעודכנו ידנית)
            </p>
          </div>
        )}

        {/* Bulk Edit Section */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Edit2 className="w-5 h-5 text-purple-600" />
            <h3 className="text-sm font-medium text-purple-900">
              עריכה קבוצתית - החל על כל הרכיבים
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-purple-700 font-medium">
                יצרן
              </label>
              <Input
                value={bulkManufacturer}
                onChange={e => setBulkManufacturer(e.target.value)}
                placeholder="השאר ריק כדי לשמור קיים"
                className="bg-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-purple-700 font-medium">ספק</label>
              <Input
                value={bulkSupplier}
                onChange={e => setBulkSupplier(e.target.value)}
                placeholder="השאר ריק כדי לשמור קיים"
                className="bg-white"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleBulkApply}
                disabled={!bulkManufacturer && !bulkSupplier}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                החל על הכל
              </Button>
            </div>
          </div>
          <p className="text-xs text-purple-600 mt-2">
            💡 שדות ריקים ישמרו את הערכים הקיימים של כל רכיב
          </p>
        </div>

        {/* Document Metadata */}
        <div className="bg-gray-50 border rounded-lg p-4">
          <h3 className="text-sm font-medium mb-3">מידע על המסמך</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">שיטת חילוץ:</span>
              <p className="font-medium capitalize">
                {extractionResult.metadata.documentType === 'excel' &&
                  '⚡ Excel Parser'}
                {extractionResult.metadata.documentType === 'pdf' &&
                  '📄 PDF Parser'}
                {extractionResult.metadata.documentType === 'image' &&
                  '🤖 AI Vision'}
                {!['excel', 'pdf', 'image'].includes(
                  extractionResult.metadata.documentType
                ) && extractionResult.metadata.documentType}
              </p>
            </div>

            {extractionResult.metadata.supplier && (
              <div>
                <span className="text-muted-foreground">ספק:</span>
                <p className="font-medium">
                  {extractionResult.metadata.supplier}
                </p>
              </div>
            )}

            {extractionResult.metadata.quoteDate && (
              <div>
                <span className="text-muted-foreground">תאריך:</span>
                <p className="font-medium">
                  {extractionResult.metadata.quoteDate}
                </p>
              </div>
            )}

            {extractionResult.metadata.currency && (
              <div>
                <span className="text-muted-foreground">מטבע:</span>
                <p className="font-medium">
                  {extractionResult.metadata.currency}
                </p>
              </div>
            )}

            {/* Excel-specific metadata */}
            {hasExcelMetadata(extractionResult.metadata) &&
              extractionResult.metadata.sheetName && (
                <div>
                  <span className="text-muted-foreground">גיליון:</span>
                  <p className="font-medium">
                    {extractionResult.metadata.sheetName}
                  </p>
                </div>
              )}

            {hasExcelMetadata(extractionResult.metadata) &&
              extractionResult.metadata.rowCount !== undefined && (
                <div>
                  <span className="text-muted-foreground">שורות:</span>
                  <p className="font-medium">
                    {extractionResult.metadata.rowCount}
                  </p>
                </div>
              )}

            {/* PDF-specific metadata */}
            {hasPDFMetadata(extractionResult.metadata) &&
              extractionResult.metadata.pageCount && (
                <div>
                  <span className="text-muted-foreground">עמודים:</span>
                  <p className="font-medium">
                    {extractionResult.metadata.pageCount}
                  </p>
                </div>
              )}

            {hasPDFMetadata(extractionResult.metadata) &&
              extractionResult.metadata.extractionMethod && (
                <div>
                  <span className="text-muted-foreground">סוג חילוץ:</span>
                  <p className="font-medium capitalize">
                    {extractionResult.metadata.extractionMethod === 'structured'
                      ? 'טבלאי'
                      : 'טקסט חופשי'}
                  </p>
                </div>
              )}
          </div>

          {/* Excel detected columns info */}
          {hasExcelMetadata(extractionResult.metadata) &&
            extractionResult.metadata.detectedColumns &&
            Object.keys(extractionResult.metadata.detectedColumns).length >
              0 && (
              <div className="mt-3 pt-3 border-t">
                <span className="text-xs text-muted-foreground">
                  עמודות שזוהו:
                </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {Object.keys(extractionResult.metadata.detectedColumns).map(
                    col => (
                      <span
                        key={col}
                        className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded"
                      >
                        {col}
                      </span>
                    )
                  )}
                </div>
              </div>
            )}

          {/* PDF quality warning */}
          {extractionResult.metadata.documentType === 'pdf' &&
            extractionResult.confidence < 0.5 && (
              <div className="mt-3 pt-3 border-t bg-yellow-50 -mx-4 -mb-4 px-4 py-3 rounded-b-lg">
                <p className="text-xs text-yellow-800">
                  💡 <strong>טיפ:</strong> איכות החילוץ מ-PDF נמוכה. לתוצאות
                  טובות יותר, המר את ה-PDF לתמונה והשתמש בניתוח AI Vision.
                </p>
              </div>
            )}
        </div>
      </div>

      {/* Components List */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
        {components.map(component => (
          <div
            key={component.id}
            className={`border rounded-lg p-4 transition-all ${
              component.status === 'rejected'
                ? 'opacity-50 bg-gray-50'
                : component.status === 'modified'
                  ? 'border-yellow-300 bg-yellow-50'
                  : 'border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {component.isEditing ? (
                    <Input
                      value={component.name}
                      onChange={e =>
                        handleFieldChange(component.id, 'name', e.target.value)
                      }
                      className="font-medium"
                    />
                  ) : (
                    <h4 className="font-medium">{component.name}</h4>
                  )}
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${getConfidenceColor(
                      component.confidence
                    )}`}
                  >
                    {getConfidenceLabel(component.confidence)}
                  </span>
                </div>
                {component.description && !component.isEditing && (
                  <p className="text-sm text-muted-foreground">
                    {component.description}
                  </p>
                )}
              </div>

              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant={
                    component.status === 'approved' ? 'default' : 'outline'
                  }
                  onClick={() => handleStatusChange(component.id, 'approved')}
                  title="אשר"
                >
                  <CheckCircle className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEdit(component.id)}
                  title="ערוך"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(component.id)}
                  title="מחק"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </div>

            {/* Match Information Card */}
            {component.matchDecision &&
              component.matchDecision.matches.length > 0 && (
                <div className="mb-3 p-3 border rounded-lg bg-blue-50 border-blue-200">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <GitMerge className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">
                          זוהה רכיב דומה בספרייה
                        </span>
                        <Badge
                          variant={
                            component.matchDecision.matchType === 'exact'
                              ? 'default'
                              : component.matchDecision.matchType === 'fuzzy'
                                ? 'secondary'
                                : 'outline'
                          }
                          className="text-xs"
                        >
                          {component.matchDecision.matchType === 'exact' &&
                            '🎯 התאמה מדויקת'}
                          {component.matchDecision.matchType === 'fuzzy' &&
                            '📊 התאמה מטושטשת'}
                          {component.matchDecision.matchType === 'ai' &&
                            '🤖 התאמה סמנטית'}
                        </Badge>
                        <span className="text-xs text-blue-700 font-medium">
                          {Math.round(
                            component.matchDecision.matches[0].confidence * 100
                          )}
                          % דיוק
                        </span>
                      </div>

                      <div className="text-sm space-y-1 text-blue-800">
                        <div>
                          <span className="font-medium">רכיב קיים:</span>{' '}
                          {component.matchDecision.matches[0].component.name}
                        </div>
                        {component.matchDecision.matches[0].component
                          .manufacturerPN && (
                          <div>
                            <span className="font-medium">מק"ט:</span>{' '}
                            {
                              component.matchDecision.matches[0].component
                                .manufacturerPN
                            }
                          </div>
                        )}
                        <div className="text-xs text-blue-600 mt-1">
                          {component.matchDecision.matches[0].reasoning}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        variant={
                          component.matchDecision.userDecision ===
                          'accept_match'
                            ? 'default'
                            : 'outline'
                        }
                        onClick={() => {
                          const idx = parseInt(
                            component.id.replace('extracted-', '')
                          );
                          handleMatchDecision(idx, 'accept_match');
                        }}
                        className="gap-1 whitespace-nowrap"
                      >
                        <GitMerge className="w-3 h-3" />
                        עדכן מחיר
                      </Button>
                      <Button
                        size="sm"
                        variant={
                          component.matchDecision.userDecision === 'create_new'
                            ? 'default'
                            : 'outline'
                        }
                        onClick={() => {
                          const idx = parseInt(
                            component.id.replace('extracted-', '')
                          );
                          handleMatchDecision(idx, 'create_new');
                        }}
                        className="gap-1 whitespace-nowrap"
                      >
                        <Plus className="w-3 h-3" />
                        צור חדש
                      </Button>
                    </div>
                  </div>
                </div>
              )}

            {component.isEditing && (
              <div className="grid grid-cols-2 gap-3 mb-3">
                {/* Description - Full width */}
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground">תיאור</label>
                  <textarea
                    value={component.description || ''}
                    onChange={e =>
                      handleFieldChange(
                        component.id,
                        'description',
                        e.target.value
                      )
                    }
                    placeholder="תיאור הרכיב"
                    className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">יצרן</label>
                  <Input
                    value={component.manufacturer || ''}
                    onChange={e =>
                      handleFieldChange(
                        component.id,
                        'manufacturer',
                        e.target.value
                      )
                    }
                    placeholder="יצרן"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">מק"ט</label>
                  <Input
                    value={component.manufacturerPN || ''}
                    onChange={e =>
                      handleFieldChange(
                        component.id,
                        'manufacturerPN',
                        e.target.value
                      )
                    }
                    placeholder='מק"ט'
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">
                    קטגוריה
                  </label>
                  <Select
                    value={component.category || 'אחר'}
                    onValueChange={(value: string) =>
                      handleFieldChange(component.id, 'category', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="בחר קטגוריה" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">
                    סוג רכיב
                  </label>
                  <Select
                    value={component.componentType || 'hardware'}
                    onValueChange={(value: 'hardware' | 'software' | 'labor') =>
                      handleFieldChange(component.id, 'componentType', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="בחר סוג" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPONENT_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {component.componentType === 'labor' && (
                  <div>
                    <label className="text-xs text-muted-foreground">
                      סוג עבודה
                    </label>
                    <Select
                      value={component.laborSubtype || undefined}
                      onValueChange={(
                        value:
                          | 'engineering'
                          | 'commissioning'
                          | 'installation'
                          | 'programming'
                      ) =>
                        handleFieldChange(component.id, 'laborSubtype', value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="בחר סוג עבודה" />
                      </SelectTrigger>
                      <SelectContent>
                        {LABOR_SUBTYPES.map(subtype => (
                          <SelectItem key={subtype.value} value={subtype.value}>
                            {subtype.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <label className="text-xs text-muted-foreground">
                    מחיר (
                    {component.currency === 'USD'
                      ? '$'
                      : component.currency === 'EUR'
                        ? '€'
                        : '₪'}
                    )
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={
                      component.currency === 'USD'
                        ? component.unitPriceUSD || ''
                        : component.currency === 'EUR'
                          ? component.unitPriceEUR || ''
                          : component.unitPriceNIS || ''
                    }
                    onChange={e => {
                      const value = parseFloat(e.target.value) || 0;
                      if (component.currency === 'USD') {
                        handleFieldChange(component.id, 'unitPriceUSD', value);
                      } else if (component.currency === 'EUR') {
                        handleFieldChange(component.id, 'unitPriceEUR', value);
                      } else {
                        handleFieldChange(component.id, 'unitPriceNIS', value);
                      }
                    }}
                    placeholder="0.00"
                  />
                </div>
                {/* Notes - Full width */}
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground">הערות</label>
                  <textarea
                    value={component.notes || ''}
                    onChange={e =>
                      handleFieldChange(component.id, 'notes', e.target.value)
                    }
                    placeholder="הערות נוספות"
                    className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                    rows={2}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">יצרן:</span>
                <p className="font-medium truncate">
                  {component.manufacturer || '—'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">מק"ט:</span>
                <p className="font-medium truncate">
                  {component.manufacturerPN || '—'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">קטגוריה:</span>
                <p className="font-medium">{component.category || '—'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">סוג:</span>
                <p className="font-medium">
                  {component.componentType === 'hardware'
                    ? 'חומרה'
                    : component.componentType === 'software'
                      ? 'תוכנה'
                      : component.componentType === 'labor'
                        ? 'עבודה'
                        : '—'}
                  {component.componentType === 'labor' &&
                    component.laborSubtype &&
                    ` (${
                      component.laborSubtype === 'engineering'
                        ? 'הנדסה'
                        : component.laborSubtype === 'commissioning'
                          ? 'הפעלה'
                          : component.laborSubtype === 'installation'
                            ? 'התקנה'
                            : component.laborSubtype === 'programming'
                              ? 'תכנות'
                              : ''
                    })`}
                </p>
              </div>
              {/* Price Display - Different layouts based on MSRP mode */}
              {component.msrpPrice && msrpOptions?.mode === 'discount' ? (
                <>
                  {/* Mode: Discount - Show Partner Price | Margin % | MSRP */}
                  <div>
                    <span className="text-muted-foreground">מחיר שותף:</span>
                    <div className="flex gap-2 flex-wrap">
                      {component.msrpCurrency === 'USD' &&
                        component.unitPriceUSD && (
                          <p className="font-medium text-blue-600">
                            ${component.unitPriceUSD.toFixed(2)}
                          </p>
                        )}
                      {component.msrpCurrency === 'NIS' &&
                        component.unitPriceNIS && (
                          <p className="font-medium text-blue-600">
                            ₪{component.unitPriceNIS.toFixed(2)}
                          </p>
                        )}
                      {component.msrpCurrency === 'EUR' &&
                        component.unitPriceEUR && (
                          <p className="font-medium text-blue-600">
                            €{component.unitPriceEUR.toFixed(2)}
                          </p>
                        )}
                    </div>
                  </div>

                  <div>
                    <span className="text-muted-foreground">שולי רווח:</span>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={
                          component.marginPercent ||
                          component.partnerDiscountPercent ||
                          globalMarginPercent
                        }
                        onChange={e =>
                          handleItemMarginChange(
                            component.id,
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-20 h-8 text-sm"
                      />
                      <span className="text-sm">%</span>
                      {component.hasMarginOverride && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                          ידני
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-muted-foreground">MSRP:</span>
                    <p className="font-medium text-purple-600">
                      {component.msrpCurrency === 'USD' &&
                        `$${component.msrpPrice.toFixed(2)}`}
                      {component.msrpCurrency === 'NIS' &&
                        `₪${component.msrpPrice.toFixed(2)}`}
                      {component.msrpCurrency === 'EUR' &&
                        `€${component.msrpPrice.toFixed(2)}`}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  {/* Regular mode - Show prices normally */}
                  <div>
                    <span className="text-muted-foreground">
                      {component.msrpPrice ? 'מחיר שותף:' : 'מחירים:'}
                    </span>
                    <div className="flex gap-2 flex-wrap">
                      {component.unitPriceNIS && (
                        <p
                          className={`font-medium ${component.currency === 'NIS' ? 'text-green-600' : ''}`}
                        >
                          ₪{component.unitPriceNIS.toFixed(2)}
                        </p>
                      )}
                      {component.unitPriceUSD && (
                        <p
                          className={`font-medium ${component.currency === 'USD' ? 'text-green-600' : ''}`}
                        >
                          ${component.unitPriceUSD.toFixed(2)}
                        </p>
                      )}
                      {component.unitPriceEUR && (
                        <p
                          className={`font-medium ${component.currency === 'EUR' ? 'text-green-600' : ''}`}
                        >
                          €{component.unitPriceEUR.toFixed(2)}
                        </p>
                      )}
                      {!component.unitPriceNIS &&
                        !component.unitPriceUSD &&
                        !component.unitPriceEUR &&
                        '—'}
                    </div>
                  </div>
                  {/* MSRP Display */}
                  {component.msrpPrice && (
                    <div>
                      <span className="text-muted-foreground">MSRP:</span>
                      <div className="flex gap-2 items-center">
                        <p className="font-medium text-purple-600">
                          {component.msrpCurrency === 'USD' &&
                            `$${component.msrpPrice.toFixed(2)}`}
                          {component.msrpCurrency === 'NIS' &&
                            `₪${component.msrpPrice.toFixed(2)}`}
                          {component.msrpCurrency === 'EUR' &&
                            `€${component.msrpPrice.toFixed(2)}`}
                        </p>
                        {component.partnerDiscountPercent && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                            -{component.partnerDiscountPercent.toFixed(1)}% הנחה
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {component.notes && (
              <div className="mt-2 text-xs text-muted-foreground bg-gray-100 p-2 rounded">
                <span className="font-medium">הערות:</span> {component.notes}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Low Confidence Warning */}
      {extractionResult.confidence < 0.7 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-yellow-900">מומלץ לבדוק</h4>
              <p className="text-sm text-yellow-700 mt-1">
                רמת הביטחון של ה-AI בחילוץ זה היא מתחת ל-70%. אנא בדוק את כל
                השדות בקפידה לפני הייבוא.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between items-center pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          ביטול
        </Button>
        <div className="flex gap-2">
          <div className="text-sm text-muted-foreground mr-4">
            {approvedCount + modifiedCount} רכיבים ייובאו
          </div>
          <Button
            onClick={handleConfirm}
            disabled={approvedCount + modifiedCount === 0}
            className="min-w-[120px]"
          >
            ייבא לספרייה
          </Button>
        </div>
      </div>
    </div>
  );

  // Fullscreen overlay for file viewer - rendered via Portal to escape dialog
  const fullscreenOverlay =
    isFullscreen && sourceFile
      ? createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-background flex flex-col"
            onMouseDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
          >
            {/* Fullscreen Header */}
            <div className="flex items-center justify-between p-3 border-b bg-muted/50 flex-shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm font-medium">{sourceFile.name}</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={exitFullscreen}
                className="gap-2"
              >
                <PanelLeftClose className="w-4 h-4" />
                חזור לייבוא
              </Button>
            </div>
            {/* Fullscreen Content - use key to force fresh state */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <SourceFileViewer
                key={`fullscreen-${sourceFile.name}`}
                file={sourceFile}
                isFullscreen
              />
            </div>
          </div>,
          document.body
        )
      : null;

  // If source panel is shown and we have a source file, render with split layout
  if (showSourcePanel && sourceFile) {
    return (
      <>
        {fullscreenOverlay}
        <div className="flex min-h-[700px] gap-4">
          {/* Main Content - Left Side (keeps original width ~900px) */}
          <div className="w-[900px] flex-shrink-0 overflow-y-auto overflow-x-hidden">
            {mainContent}
          </div>

          {/* Source File Panel - Right Side (fixed width to avoid horizontal scroll) */}
          <div className="w-[450px] flex-shrink-0 border rounded-lg bg-background flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b bg-muted/50">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium truncate max-w-[250px]">
                  {sourceFile.name}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={enterFullscreen}
                  className="h-7 w-7 p-0"
                  title="מסך מלא"
                >
                  <Maximize2 className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleSourcePanel(false)}
                  className="h-7 w-7 p-0"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </Button>
              </div>
            </div>
            {/* File viewer - no scroll here, handled inside viewer */}
            <div className="flex-1 min-h-0">
              <SourceFileViewer key="panel" file={sourceFile} />
            </div>
          </div>
        </div>
      </>
    );
  }

  // Default: render without split panel
  return (
    <>
      {fullscreenOverlay}
      {mainContent}
    </>
  );
};
