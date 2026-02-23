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
  Search,
  Loader2,
  RotateCcw,
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
import {
  checkTavilyAvailable,
  setTavilyTeamContext,
  identifyComponent,
  type ComponentSearchResult,
} from '@/services/tavilySearch';

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
  originalIndex: number; // Original index from extraction (doesn't change on deletion)
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

/**
 * Reverse a part number to fix RTL extraction issues.
 *
 * Two character types:
 *   Type 1 (non-letter): digits, dots, dashes, slashes — stay together as one group
 *   Type 2 (letter):     A-Z, a-z — stay together as one group
 *
 * Split into alternating type-1 and type-2 groups, then REVERSE their order.
 * Applying twice restores the original (involutory).
 *
 * Strings with NO letters are returned unchanged — pure type-1 strings have
 * no inherent direction to fix.
 *
 * Examples:
 *   "2240.KD.00"        ↔ ".00KD2240."     (groups: "2240." + "KD" + ".00")
 *   "CL12/0B-OOA"       ↔ "OOA-B12/0CL"   (groups: "CL" + "12/0" + "B" + "-" + "OOA")
 *   "2246.01M"          ↔ "M2246.01"       (groups: "2246.01" + "M")
 *   "P2240.12.37"       ↔ "2240.12.37P"
 *   "5822.32S"          ↔ "S32.5822"        — wait, S is type-2, 5822.32 is type-1
 *   "BLACK0425TBU"      ↔ "TBU0425BLACK"
 *   "2241.52.00.39.02"  → unchanged (no letters)
 *
 * Space-separated: reverse word order, then apply within each word.
 */
function reversePartNumber(pn: string): string {
  if (!pn) return pn;
  // No letters → no directional information → leave unchanged
  if (!/[A-Za-z]/.test(pn)) return pn;

  const reverseToken = (token: string): string => {
    if (!/[A-Za-z]/.test(token)) return token;
    // Type 1 = non-letter chars (digits, dots, dashes, etc. — all grouped together)
    // Type 2 = letter chars (A-Za-z — grouped together)
    const segments = token.match(/[A-Za-z]+|[^A-Za-z]+/g);
    if (!segments || segments.length <= 1) return token;
    return [...segments].reverse().join('');
  };

  if (pn.includes(' ')) {
    return pn.trim().split(/\s+/).reverse().map(reverseToken).join(' ');
  }

  return reverseToken(pn);
}

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
        originalIndex: idx, // Store original index for match decision tracking
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

  // Enrichment state
  const [enrichingIds, setEnrichingIds] = useState<Set<string>>(new Set());
  const [enrichmentConflict, setEnrichmentConflict] = useState<{
    componentId: string;
    searchResult: ComponentSearchResult;
    originalData: PreviewComponent;
  } | null>(null);

  // Check if Tavily is available - use state to handle async initialization
  const [tavilyAvailable, setTavilyAvailable] = useState<boolean>(false);

  // Set team context and check Tavily availability on mount and when team changes
  useEffect(() => {
    // Set team context first, then check availability
    setTavilyTeamContext(currentTeam?.id);

    // Check availability after team context is set
    checkTavilyAvailable().then(available => {
      setTavilyAvailable(available);
      if (available) {
        logger.info('Tavily search is available', { teamId: currentTeam?.id });
      }
    });

    // Listen for API key updates
    const handleTavilyUpdate = () => {
      checkTavilyAvailable().then(setTavilyAvailable);
    };
    window.addEventListener('cpq-tavily-api-key-updated', handleTavilyUpdate);

    return () => {
      window.removeEventListener(
        'cpq-tavily-api-key-updated',
        handleTavilyUpdate
      );
    };
  }, [currentTeam?.id]);

  /**
   * Handle enrichment for a single component
   */
  const handleEnrichComponent = async (id: string) => {
    const component = components.find(c => c.id === id);
    if (!component) return;

    // Start loading
    setEnrichingIds(prev => new Set(prev).add(id));

    try {
      // Build search query - prefer notes (often contains model code) or manufacturerPN
      // Notes field often has the actual model code like "SPB1 80 ED-65 G1/4-AG"
      // which gives better search results than internal part numbers like "10.01.06.03504"
      const searchQuery =
        component.notes || component.manufacturerPN || component.name || '';
      if (!searchQuery) {
        logger.warn('No search query available for component', { id });
        return;
      }

      const result = await identifyComponent(
        searchQuery,
        component.manufacturer,
        component.description
      );

      logger.info('Enrichment search result', { id, searchQuery, result });

      if (result.success) {
        // Check if there are conflicts (different data than what we have)
        const hasConflict =
          (result.productTypeHebrew &&
            component.name &&
            result.productTypeHebrew !== component.name) ||
          (result.manufacturer &&
            component.manufacturer &&
            result.manufacturer !== component.manufacturer);

        if (hasConflict) {
          // Show conflict resolution dialog
          setEnrichmentConflict({
            componentId: id,
            searchResult: result,
            originalData: component,
          });
        } else {
          // No conflict - auto-apply enrichment
          applyEnrichment(id, result);
        }
      } else {
        logger.warn('Enrichment search failed', { id, error: result.error });
      }
    } catch (error) {
      logger.error('Enrichment error', { id, error });
    } finally {
      setEnrichingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  /**
   * Apply enrichment results to a component
   * Creates a descriptive name by combining product type with original details
   */
  const applyEnrichment = (id: string, result: ComponentSearchResult) => {
    setComponents(prev =>
      prev.map(c => {
        if (c.id !== id) return c;

        const updated = { ...c };

        // Update name if we found a product type
        if (result.productTypeHebrew) {
          const originalName = c.name || '';
          const hasHebrew = /[\u0590-\u05FF]/.test(originalName);

          // If original name is a model code (no Hebrew), combine with product type
          // e.g., "AI 0,75-8 BU" + "כבל" → "כבל AI 0,75-8 BU"
          if (!hasHebrew && originalName) {
            updated.name = `${result.productTypeHebrew} ${originalName}`;
          } else if (!originalName || originalName === c.manufacturerPN) {
            // No name or name equals part number - use product type + part number
            updated.name = c.manufacturerPN
              ? `${result.productTypeHebrew} ${c.manufacturerPN}`
              : result.productTypeHebrew;
          }
          // If already has Hebrew, keep original (don't overwrite good names)
        }

        // Update manufacturer if found and not already set
        if (result.manufacturer && !c.manufacturer) {
          updated.manufacturer = result.manufacturer;
        }

        // Update description if found and not already set
        if (result.description && !c.description) {
          updated.description = result.description;
        }

        // Add enrichment note
        if (result.productType) {
          updated.notes = c.notes
            ? `${c.notes} | זוהה: ${result.productType}`
            : `זוהה: ${result.productType}`;
        }

        updated.status = 'modified';
        return updated;
      })
    );
  };

  /**
   * Handle conflict resolution - user chose to keep original
   */
  const handleRejectEnrichment = () => {
    setEnrichmentConflict(null);
  };

  /**
   * Handle conflict resolution - user chose specific fields
   */
  const handlePartialEnrichment = (fields: {
    name?: boolean;
    manufacturer?: boolean;
  }) => {
    if (!enrichmentConflict) return;

    const { componentId, searchResult } = enrichmentConflict;

    setComponents(prev =>
      prev.map(c => {
        if (c.id !== componentId) return c;

        const updated = { ...c };

        if (fields.name && searchResult.productTypeHebrew) {
          updated.name = searchResult.productTypeHebrew;
        }

        if (fields.manufacturer && searchResult.manufacturer) {
          updated.manufacturer = searchResult.manufacturer;
        }

        updated.status = 'modified';
        return updated;
      })
    );

    setEnrichmentConflict(null);
  };

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
    // Log description field changes for debugging
    if (field === 'description') {
      logger.debug('[AIExtractionPreview] Description field changed', {
        componentId: id,
        newValue: value,
      });
    }

    setComponents(prev =>
      prev.map(c => {
        if (c.id !== id) return c;

        // Create updated component with field change
        // Explicitly spread all properties to ensure nothing is lost
        const updated: PreviewComponent = {
          ...c,
          [field]: value,
          status: 'modified' as ComponentStatus,
        };

        return updated;
      })
    );
  };

  const handleDelete = (id: string) => {
    // Find the component and its original index
    const component = components.find(c => c.id === id);

    if (!component) return;

    // Remove the component
    setComponents(prev => prev.filter(c => c.id !== id));

    // CRITICAL: Remove the match decision using originalIndex
    // Deletion means the component won't be imported, so no decision is needed
    setLocalMatchDecisions(prev =>
      prev.filter(d => d.componentIndex !== component.originalIndex)
    );
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
      prev.map(c =>
        c.originalIndex === componentIndex && c.matchDecision
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

  /**
   * Get pending match decisions that still need user input
   * Since we remove decisions when components are deleted, we can simply
   * check for pending status without verifying component existence
   */
  const getPendingDecisions = () => {
    return localMatchDecisions.filter(d => d.userDecision === 'pending');
  };

  const handleConfirm = () => {
    // Validate: Check for pending match decisions
    const pendingDecisions = getPendingDecisions();
    if (pendingDecisions.length > 0) {
      // Show error message to user
      alert(
        `יש ${pendingDecisions.length} רכיבים דומים שממתינים להחלטה. אנא בחר האם לעדכן מחיר או ליצור רכיב חדש עבור כל רכיב לפני המשך.`
      );
      return;
    }
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
          description: c.description,
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

  // Calculate pending decisions
  // Since we remove decisions when deleting components, just count pending status
  const pendingDecisionsCount = localMatchDecisions.filter(
    d => d.userDecision === 'pending'
  ).length;

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'גבוהה';
    if (confidence >= 0.6) return 'בינונית';
    return 'נמוכה';
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
        {localMatchDecisions.length > 0 && (
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
            {pendingDecisionsCount > 0 && (
              <div className="mt-2 text-xs text-purple-600 bg-purple-50 px-3 py-2 rounded flex items-center gap-1 border border-purple-200">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium">
                  יש {pendingDecisionsCount} רכיבים שממתינים להחלטה - בחר "עדכן
                  מחיר" או "צור חדש" עבור כל רכיב
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
                  '⚡ מנתח אקסל'}
                {extractionResult.metadata.documentType === 'pdf' &&
                  '📄 מנתח PDF'}
                {extractionResult.metadata.documentType === 'image' &&
                  '🤖 ראיית מכונה AI'}
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
        {components.map(component => {
          // Check if this component has a pending decision
          const hasPendingDecision =
            component.matchDecision &&
            component.matchDecision.matches.length > 0 &&
            component.matchDecision.userDecision === 'pending';

          return (
            <div
              key={component.id}
              className={`border rounded-lg p-4 transition-all ${
                component.status === 'rejected'
                  ? 'opacity-50 bg-gray-50'
                  : hasPendingDecision
                    ? 'border-purple-400 bg-purple-50 shadow-md'
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
                          handleFieldChange(
                            component.id,
                            'name',
                            e.target.value
                          )
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
                  {/* Toggle button: Edit when not editing, Confirm when editing */}
                  <Button
                    size="sm"
                    variant={component.isEditing ? 'default' : 'outline'}
                    onClick={() => {
                      if (component.isEditing) {
                        // When editing, clicking confirms and exits edit mode
                        handleStatusChange(component.id, 'approved');
                      } else {
                        // When not editing, clicking enters edit mode
                        handleEdit(component.id);
                      }
                    }}
                    title={component.isEditing ? 'אשר' : 'ערוך'}
                  >
                    {component.isEditing ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <Edit2 className="w-4 h-4" />
                    )}
                  </Button>
                  {/* Enrich Button */}
                  {tavilyAvailable && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEnrichComponent(component.id)}
                      disabled={enrichingIds.has(component.id)}
                      title="העשר מידע מהאינטרנט"
                    >
                      {enrichingIds.has(component.id) ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4 text-blue-500" />
                      )}
                    </Button>
                  )}
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
                              component.matchDecision.matches[0].confidence *
                                100
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
                              <span dir="ltr" className="text-left">
                                {
                                  component.matchDecision.matches[0].component
                                    .manufacturerPN
                                }
                              </span>
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
                            handleMatchDecision(
                              component.originalIndex,
                              'accept_match'
                            );
                          }}
                          className="gap-1 whitespace-nowrap"
                        >
                          <GitMerge className="w-3 h-3" />
                          עדכן מחיר
                        </Button>
                        <Button
                          size="sm"
                          variant={
                            component.matchDecision.userDecision ===
                            'create_new'
                              ? 'default'
                              : 'outline'
                          }
                          onClick={() => {
                            handleMatchDecision(
                              component.originalIndex,
                              'create_new'
                            );
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
                    <label className="text-xs text-muted-foreground">
                      תיאור
                    </label>
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
                    <label className="text-xs text-muted-foreground">
                      יצרן
                    </label>
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
                    <label className="text-xs text-muted-foreground">
                      מק"ט
                    </label>
                    <div className="flex gap-1">
                      <Input
                        dir="ltr"
                        style={{ direction: 'ltr', unicodeBidi: 'isolate' }}
                        className="text-left flex-1"
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
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        title="הפוך סדר (RTL fix)"
                        onClick={() =>
                          handleFieldChange(
                            component.id,
                            'manufacturerPN',
                            reversePartNumber(component.manufacturerPN || '')
                          )
                        }
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </div>
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
                      onValueChange={(
                        value: 'hardware' | 'software' | 'labor'
                      ) =>
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
                            <SelectItem
                              key={subtype.value}
                              value={subtype.value}
                            >
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
                          handleFieldChange(
                            component.id,
                            'unitPriceUSD',
                            value
                          );
                        } else if (component.currency === 'EUR') {
                          handleFieldChange(
                            component.id,
                            'unitPriceEUR',
                            value
                          );
                        } else {
                          handleFieldChange(
                            component.id,
                            'unitPriceNIS',
                            value
                          );
                        }
                      }}
                      placeholder="0.00"
                    />
                  </div>
                  {/* Notes - Full width */}
                  <div className="col-span-2">
                    <label className="text-xs text-muted-foreground">
                      הערות
                    </label>
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
                  <div className="flex items-center gap-1">
                    <p
                      dir="ltr"
                      style={{ direction: 'ltr', unicodeBidi: 'isolate' }}
                      className={`font-medium truncate text-left ${component.potentialRTLIssue ? 'text-amber-600' : ''}`}
                    >
                      {component.manufacturerPN || '—'}
                    </p>
                    {component.manufacturerPN && (
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground p-0.5 rounded"
                        title="הפוך סדר (RTL fix)"
                        onClick={e => {
                          e.stopPropagation();
                          handleFieldChange(
                            component.id,
                            'manufacturerPN',
                            reversePartNumber(component.manufacturerPN || '')
                          );
                        }}
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    )}
                  </div>
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
                              -{component.partnerDiscountPercent.toFixed(1)}%
                              הנחה
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
          );
        })}
      </div>

      {/* Enrichment Conflict Resolution Dialog */}
      {enrichmentConflict && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <Search className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-semibold">נמצא מידע נוסף</h3>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              החיפוש מצא מידע שונה מהמידע הקיים. בחר אילו שדות לעדכן:
            </p>

            <div className="space-y-3 mb-6">
              {/* Name comparison */}
              {enrichmentConflict.searchResult.productTypeHebrew &&
                enrichmentConflict.originalData.name !==
                  enrichmentConflict.searchResult.productTypeHebrew && (
                  <div className="border rounded p-3">
                    <div className="text-sm font-medium mb-2">שם רכיב:</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-gray-100 p-2 rounded">
                        <div className="text-xs text-muted-foreground">
                          קיים:
                        </div>
                        <div>{enrichmentConflict.originalData.name || '—'}</div>
                      </div>
                      <div className="bg-blue-100 p-2 rounded">
                        <div className="text-xs text-blue-600">מהחיפוש:</div>
                        <div>
                          {enrichmentConflict.searchResult.productTypeHebrew}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              {/* Manufacturer comparison */}
              {enrichmentConflict.searchResult.manufacturer &&
                enrichmentConflict.originalData.manufacturer !==
                  enrichmentConflict.searchResult.manufacturer && (
                  <div className="border rounded p-3">
                    <div className="text-sm font-medium mb-2">יצרן:</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-gray-100 p-2 rounded">
                        <div className="text-xs text-muted-foreground">
                          קיים:
                        </div>
                        <div>
                          {enrichmentConflict.originalData.manufacturer || '—'}
                        </div>
                      </div>
                      <div className="bg-blue-100 p-2 rounded">
                        <div className="text-xs text-blue-600">מהחיפוש:</div>
                        <div>
                          {enrichmentConflict.searchResult.manufacturer}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleRejectEnrichment}>
                שמור קיים
              </Button>
              <Button
                onClick={() =>
                  handlePartialEnrichment({
                    name: !!enrichmentConflict.searchResult.productTypeHebrew,
                    manufacturer: false,
                  })
                }
              >
                עדכן שם
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* RTL Document Warnings */}
      {extractionResult.warnings && extractionResult.warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-medium text-amber-900">אזהרות RTL</h4>
              <p className="text-sm text-amber-700 mt-1">
                מסמך זה זוהה כמסמך עברי (RTL). מומלץ לבדוק שמספרי המק״ט לא
                התהפכו.
              </p>
              {extractionResult.warnings.filter(
                w => w.type === 'potential_reversal'
              ).length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs font-medium text-amber-800">
                    רכיבים שעשויים להיות מושפעים:
                  </p>
                  <ul className="text-xs text-amber-700 list-disc list-inside">
                    {extractionResult.warnings
                      .filter(w => w.type === 'potential_reversal')
                      .map((w, i) => (
                        <li key={i}>{w.message}</li>
                      ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
        <div className="flex gap-2 items-center">
          <div className="text-sm text-muted-foreground mr-4">
            {approvedCount + modifiedCount} רכיבים ייובאו
          </div>
          {pendingDecisionsCount > 0 && (
            <div className="text-xs text-purple-600 bg-purple-50 px-3 py-1 rounded border border-purple-200 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              <span>{pendingDecisionsCount} ממתינים להחלטה</span>
            </div>
          )}
          <Button
            onClick={handleConfirm}
            disabled={
              approvedCount + modifiedCount === 0 || pendingDecisionsCount > 0
            }
            className="min-w-[120px]"
            title={
              pendingDecisionsCount > 0
                ? 'אנא קבל החלטה עבור כל הרכיבים הדומים לפני הייבוא'
                : approvedCount + modifiedCount === 0
                  ? 'אין רכיבים לייבוא'
                  : ''
            }
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
            className="fixed inset-0 z-[9999] bg-background flex flex-col pointer-events-auto"
            onMouseDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
          >
            {/* Fullscreen Header */}
            <div className="flex items-center justify-between p-3 border-b bg-muted/50 flex-shrink-0 pointer-events-auto">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm font-medium">{sourceFile.name}</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={exitFullscreen}
                className="gap-2 pointer-events-auto"
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
