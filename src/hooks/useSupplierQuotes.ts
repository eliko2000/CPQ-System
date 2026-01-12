/**
 * useSupplierQuotes Hook
 *
 * Manages supplier quotes and component price history
 * Provides CRUD operations and integration with component matching
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import {
  SupplierQuote,
  ComponentQuoteHistory,
  DbSupplierQuote,
  DbComponentQuoteHistory,
} from '../types';
import type { AIExtractedComponent } from '../services/claudeAI';
import {
  findComponentMatches,
  MatchResult,
} from '../services/componentMatcher';
import { logger } from '../lib/logger';
import { useTeam } from '../contexts/TeamContext';

// ============================================
// Transform Functions
// ============================================

function dbToSupplierQuote(db: DbSupplierQuote): SupplierQuote {
  return {
    id: db.id,
    quoteNumber: db.quote_number,
    supplierName: db.supplier_name,
    quoteDate: db.quote_date,
    fileName: db.file_name,
    fileUrl: db.file_url,
    fileType: db.file_type as any,
    fileSizeKb: db.file_size_kb,
    status: db.status as any,
    documentType: db.document_type as any,
    extractionMethod: db.extraction_method as any,
    confidenceScore: db.confidence_score,
    totalComponents: db.total_components,
    metadata: db.metadata,
    notes: db.notes,
    uploadDate: db.upload_date,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

function supplierQuoteToDb(
  quote: Partial<SupplierQuote>
): Partial<DbSupplierQuote> {
  return {
    quote_number: quote.quoteNumber,
    supplier_name: quote.supplierName,
    quote_date: quote.quoteDate,
    file_name: quote.fileName,
    file_url: quote.fileUrl,
    file_type: quote.fileType,
    file_size_kb: quote.fileSizeKb,
    status: quote.status,
    document_type: quote.documentType,
    extraction_method: quote.extractionMethod,
    confidence_score: quote.confidenceScore,
    total_components: quote.totalComponents,
    metadata: quote.metadata,
    notes: quote.notes,
  };
}

function dbToComponentQuoteHistory(
  db: DbComponentQuoteHistory
): ComponentQuoteHistory {
  return {
    id: db.id,
    componentId: db.component_id,
    quoteId: db.quote_id,
    unitPriceNIS: db.unit_price_nis,
    unitPriceUSD: db.unit_price_usd,
    unitPriceEUR: db.unit_price_eur,
    currency: db.currency as any,
    quoteDate: db.quote_date,
    supplierName: db.supplier_name,
    confidenceScore: db.confidence_score,
    isCurrentPrice: db.is_current_price,
    createdAt: db.created_at,
  };
}

// ============================================
// Hook
// ============================================

export function useSupplierQuotes() {
  const { currentTeam } = useTeam();
  const [quotes, setQuotes] = useState<SupplierQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ============================================
  // Fetch All Quotes
  // ============================================
  const fetchQuotes = useCallback(async () => {
    if (!currentTeam) {
      setQuotes([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('supplier_quotes')
        .select('*')
        .eq('team_id', currentTeam.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setQuotes((data || []).map(dbToSupplierQuote));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch quotes';
      setError(errorMessage);
      logger.error('Error fetching supplier quotes:', err);
    } finally {
      setLoading(false);
    }
  }, [currentTeam]);

  // ============================================
  // Get Single Quote
  // ============================================
  const getQuote = useCallback(
    async (id: string): Promise<SupplierQuote | null> => {
      if (!currentTeam) return null;

      try {
        const { data, error } = await supabase
          .from('supplier_quotes')
          .select('*')
          .eq('id', id)
          .eq('team_id', currentTeam.id)
          .single();

        if (error) throw error;
        if (!data) return null;

        return dbToSupplierQuote(data);
      } catch (err) {
        logger.error('Error fetching quote:', err);
        return null;
      }
    },
    [currentTeam]
  );

  // ============================================
  // Get Quote with Component History
  // ============================================
  const getQuoteWithComponents = useCallback(
    async (id: string) => {
      if (!currentTeam) return null;

      try {
        const { data, error } = await supabase
          .from('supplier_quotes')
          .select(
            `
          *,
          component_quote_history (
            *,
            component:components (*)
          )
        `
          )
          .eq('id', id)
          .eq('team_id', currentTeam.id)
          .single();

        if (error) throw error;
        if (!data) return null;

        return {
          quote: dbToSupplierQuote(data),
          components: (data.component_quote_history || []).map((h: any) => ({
            history: dbToComponentQuoteHistory(h),
            component: h.component,
          })),
        };
      } catch (err) {
        logger.error('Error fetching quote with components:', err);
        return null;
      }
    },
    [currentTeam]
  );

  // ============================================
  // Create Quote
  // ============================================
  const createQuote = useCallback(
    async (
      quote: Omit<
        SupplierQuote,
        'id' | 'createdAt' | 'updatedAt' | 'uploadDate'
      >
    ): Promise<SupplierQuote | null> => {
      if (!currentTeam) {
        setError('No active team');
        return null;
      }

      try {
        setError(null);

        const dbQuote = supplierQuoteToDb(quote);

        // Add team_id
        const quoteWithTeam = {
          ...dbQuote,
          team_id: currentTeam.id,
        };

        const { data, error } = await supabase
          .from('supplier_quotes')
          .insert([quoteWithTeam])
          .select()
          .single();

        if (error) throw error;
        if (!data) throw new Error('No data returned from insert');

        const newQuote = dbToSupplierQuote(data);

        // Update local state
        setQuotes(prev => [newQuote, ...prev]);

        return newQuote;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to create quote';
        setError(errorMessage);
        logger.error('Error creating quote:', err);
        return null;
      }
    },
    [currentTeam]
  );

  // ============================================
  // Update Quote
  // ============================================
  const updateQuote = useCallback(
    async (
      id: string,
      updates: Partial<SupplierQuote>
    ): Promise<SupplierQuote | null> => {
      if (!currentTeam) {
        setError('No active team');
        return null;
      }

      try {
        setError(null);

        const dbUpdates = supplierQuoteToDb(updates);

        const { data, error } = await supabase
          .from('supplier_quotes')
          .update(dbUpdates)
          .eq('id', id)
          .eq('team_id', currentTeam.id)
          .select()
          .single();

        if (error) throw error;
        if (!data) throw new Error('No data returned from update');

        const updatedQuote = dbToSupplierQuote(data);

        // Update local state
        setQuotes(prev => prev.map(q => (q.id === id ? updatedQuote : q)));

        return updatedQuote;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to update quote';
        setError(errorMessage);
        logger.error('Error updating quote:', err);
        return null;
      }
    },
    [currentTeam]
  );

  // ============================================
  // Delete Quote
  // ============================================
  const deleteQuote = useCallback(
    async (id: string): Promise<boolean> => {
      if (!currentTeam) {
        setError('No active team');
        return false;
      }

      try {
        setError(null);

        // First, get the quote to extract file path
        const { data: quote, error: fetchError } = await supabase
          .from('supplier_quotes')
          .select('file_url')
          .eq('id', id)
          .eq('team_id', currentTeam.id)
          .single();

        if (fetchError) throw fetchError;

        // Delete from database (with team_id check for security)
        const { error: deleteError } = await supabase
          .from('supplier_quotes')
          .delete()
          .eq('id', id)
          .eq('team_id', currentTeam.id);

        if (deleteError) throw deleteError;

        // Delete file from storage if it exists and belongs to this team
        if (quote?.file_url) {
          try {
            // Extract file path from URL
            // URL format: https://[project].supabase.co/storage/v1/object/public/supplier-quotes/[path]
            const urlMatch = quote.file_url.match(
              /\/storage\/v1\/object\/[^/]+\/[^/]+\/(.+)$/
            );

            if (urlMatch) {
              const filePath = urlMatch[1];

              // SECURITY: Only delete if path starts with current team's ID
              if (filePath.startsWith(`${currentTeam.id}/`)) {
                logger.debug(`Deleting file from storage: ${filePath}`);
                const { error: storageError } = await supabase.storage
                  .from('supplier-quotes')
                  .remove([filePath]);

                if (storageError) {
                  logger.warn(
                    'Failed to delete file from storage:',
                    storageError
                  );
                  // Don't fail the whole operation if storage deletion fails
                }
              } else {
                logger.warn(
                  `Skipping file deletion - path does not belong to current team: ${filePath}`
                );
              }
            }
          } catch (storageErr) {
            logger.warn('Error deleting file from storage:', storageErr);
            // Continue - database record is already deleted
          }
        }

        // Update local state
        setQuotes(prev => prev.filter(q => q.id !== id));

        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to delete quote';
        setError(errorMessage);
        logger.error('Error deleting quote:', err);
        return false;
      }
    },
    [currentTeam]
  );

  // ============================================
  // Add Component to Quote History
  // ============================================
  const addComponentHistory = useCallback(
    async (
      componentId: string,
      quoteId: string,
      historyData: {
        unitPriceNIS?: number;
        unitPriceUSD?: number;
        unitPriceEUR?: number;
        currency: 'NIS' | 'USD' | 'EUR';
        quoteDate?: string;
        supplierName?: string;
        confidenceScore?: number;
        isCurrentPrice?: boolean;
      }
    ): Promise<ComponentQuoteHistory | null> => {
      if (!currentTeam) return null;

      try {
        // Check if this combination already exists
        const { data: existing } = await supabase
          .from('component_quote_history')
          .select('id')
          .eq('component_id', componentId)
          .eq('quote_id', quoteId)
          .eq('team_id', currentTeam.id)
          .single();

        if (existing) {
          logger.debug('⏭️  History entry already exists, skipping...');
          return null; // Already exists, skip
        }

        const { data, error } = await supabase
          .from('component_quote_history')
          .insert([
            {
              component_id: componentId,
              quote_id: quoteId,
              unit_price_nis: historyData.unitPriceNIS,
              unit_price_usd: historyData.unitPriceUSD,
              unit_price_eur: historyData.unitPriceEUR,
              currency: historyData.currency,
              quote_date: historyData.quoteDate,
              supplier_name: historyData.supplierName,
              confidence_score: historyData.confidenceScore,
              is_current_price: historyData.isCurrentPrice || false,
              team_id: currentTeam.id,
            },
          ])
          .select()
          .single();

        if (error) throw error;
        if (!data) throw new Error('No data returned');

        return dbToComponentQuoteHistory(data);
      } catch (err) {
        logger.error('Error adding component history:', err);
        return null;
      }
    },
    [currentTeam]
  );

  // ============================================
  // Get Component Price History
  // ============================================
  const getComponentHistory = useCallback(
    async (componentId: string): Promise<ComponentQuoteHistory[]> => {
      if (!currentTeam) return [];

      try {
        const { data, error } = await supabase
          .from('component_quote_history')
          .select('*')
          .eq('component_id', componentId)
          .eq('team_id', currentTeam.id)
          .order('quote_date', { ascending: false });

        if (error) throw error;

        return (data || []).map(dbToComponentQuoteHistory);
      } catch (err) {
        logger.error('Error fetching component history:', err);
        return [];
      }
    },
    [currentTeam]
  );

  // ============================================
  // Search Quotes
  // ============================================
  const searchQuotes = useCallback(
    async (query: string): Promise<SupplierQuote[]> => {
      if (!currentTeam) return [];

      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from('supplier_quotes')
          .select('*')
          .eq('team_id', currentTeam.id)
          .or(
            `file_name.ilike.%${query}%,supplier_name.ilike.%${query}%,quote_number.ilike.%${query}%`
          )
          .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map(dbToSupplierQuote);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to search quotes';
        setError(errorMessage);
        logger.error('Error searching quotes:', err);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [currentTeam]
  );

  // ============================================
  // Filter Quotes
  // ============================================
  const filterQuotes = useCallback(
    async (filters: {
      supplier?: string;
      dateFrom?: string;
      dateTo?: string;
      status?: string;
    }): Promise<SupplierQuote[]> => {
      if (!currentTeam) return [];

      try {
        setLoading(true);
        setError(null);

        let query = supabase
          .from('supplier_quotes')
          .select('*')
          .eq('team_id', currentTeam.id);

        if (filters.supplier) {
          query = query.eq('supplier_name', filters.supplier);
        }

        if (filters.dateFrom) {
          query = query.gte('quote_date', filters.dateFrom);
        }

        if (filters.dateTo) {
          query = query.lte('quote_date', filters.dateTo);
        }

        if (filters.status) {
          query = query.eq('status', filters.status);
        }

        query = query.order('created_at', { ascending: false });

        const { data, error } = await query;

        if (error) throw error;

        return (data || []).map(dbToSupplierQuote);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to filter quotes';
        setError(errorMessage);
        logger.error('Error filtering quotes:', err);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [currentTeam]
  );

  // ============================================
  // Process Quote with Component Matching
  // ============================================
  const processQuoteWithMatching = useCallback(
    async (
      _quoteId: string,
      extractedComponents: AIExtractedComponent[]
    ): Promise<MatchResult[]> => {
      try {
        const matchResults: MatchResult[] = [];

        for (const extractedComp of extractedComponents) {
          const matchResult = await findComponentMatches(extractedComp);
          matchResults.push(matchResult);
        }

        return matchResults;
      } catch (err) {
        logger.error('Error processing quote with matching:', err);
        return [];
      }
    },
    []
  );

  // ============================================
  // Load quotes on mount
  // ============================================
  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  // ============================================
  // Return
  // ============================================
  return {
    quotes,
    loading,
    error,
    fetchQuotes,
    getQuote,
    getQuoteWithComponents,
    createQuote,
    updateQuote,
    deleteQuote,
    addComponentHistory,
    getComponentHistory,
    searchQuotes,
    filterQuotes,
    processQuoteWithMatching,
  };
}
