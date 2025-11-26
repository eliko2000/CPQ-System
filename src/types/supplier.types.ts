// Supplier Types - Supplier quotes, price history, and document parsing

import type { Currency } from './common.types';
import type { Component } from './component.types';

// ============ Supplier Quotes & Price History ============

/**
 * Supplier Quote - Tracks uploaded quote files and extraction metadata
 */
export interface SupplierQuote {
  id: string;

  // Basic quote information
  quoteNumber?: string;
  supplierName?: string;
  quoteDate?: string; // ISO date string

  // File information
  fileName: string;
  fileUrl: string;
  fileType?: 'excel' | 'pdf' | 'csv' | 'image';
  fileSizeKb?: number;

  // Processing status
  status: 'uploaded' | 'processing' | 'completed' | 'error';

  // Extraction metadata
  documentType?: 'excel' | 'pdf' | 'image' | 'unknown';
  extractionMethod?: 'native' | 'text' | 'structured' | 'ai_vision';
  confidenceScore?: number; // 0-1
  totalComponents: number;

  // Additional metadata (stores parsing details)
  metadata?: Record<string, any>;

  // Notes
  notes?: string;

  // Timestamps
  uploadDate: string; // ISO date string
  createdAt: string;
  updatedAt: string;
}

/**
 * Database schema for supplier_quotes table
 */
export interface DbSupplierQuote {
  id: string;
  quote_number?: string;
  supplier_name?: string;
  quote_date?: string;
  file_name: string;
  file_url: string;
  file_type?: string;
  file_size_kb?: number;
  status: string;
  document_type?: string;
  extraction_method?: string;
  confidence_score?: number;
  total_components: number;
  metadata?: any;
  notes?: string;
  upload_date: string;
  created_at: string;
  updated_at: string;
}

/**
 * Component Quote History - Tracks price history across multiple quotes
 */
export interface ComponentQuoteHistory {
  id: string;
  componentId: string;
  quoteId: string;

  // Price snapshot
  unitPriceNIS?: number;
  unitPriceUSD?: number;
  unitPriceEUR?: number;
  currency: Currency;

  // Quote context
  quoteDate?: string; // ISO date string
  supplierName?: string;

  // Quality
  confidenceScore?: number; // 0-1

  // Status
  isCurrentPrice: boolean;

  // Timestamp
  createdAt: string;
}

/**
 * Database schema for component_quote_history table
 */
export interface DbComponentQuoteHistory {
  id: string;
  component_id: string;
  quote_id: string;
  unit_price_nis?: number;
  unit_price_usd?: number;
  unit_price_eur?: number;
  currency: string;
  quote_date?: string;
  supplier_name?: string;
  confidence_score?: number;
  is_current_price: boolean;
  created_at: string;
}

/**
 * Supplier Quote with aggregated data (for list views)
 */
export interface SupplierQuoteSummary extends SupplierQuote {
  actualComponentCount: number; // From component_quote_history
  avgConfidence?: number;
}

// ============ Quote Processing ============
export interface QuoteDocument {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  uploadDate: string;
  status: 'uploaded' | 'processing' | 'completed' | 'error';
  extractedData?: ExtractedQuoteData;
  validatedComponents?: ValidatedComponent[];
  errors?: string[];
}

export interface ExtractedQuoteData {
  supplier: string;
  quoteDate: string;
  items: ExtractedItem[];
  confidence: number;
}

export interface ExtractedItem {
  name: string;
  description?: string;
  manufacturer?: string;
  manufacturerPN?: string;
  quantity?: number;
  unitPrice?: number;
  confidence: number;
}

export interface ValidatedComponent {
  extractedItem: ExtractedItem;
  status: 'approved' | 'modified' | 'rejected';
  componentData?: Partial<Component>;
  notes?: string;
}
