// Document Parsing Types - Metadata for Excel and PDF parsing

// ============ Document Parsing Metadata ============

/**
 * Metadata from Excel file parsing
 * Includes sheet information and detected column mappings
 */
export interface ExcelParseMetadata {
  sheetName: string;
  rowCount: number;
  columnHeaders: string[];
  detectedColumns: Record<string, number>;
  sheetsProcessed: number;
}

/**
 * Metadata from PDF file parsing
 * Includes page count and extraction method details
 */
export interface PDFParseMetadata {
  pageCount: number;
  textLength: number;
  extractionMethod: 'text' | 'structured';
  hasTabularData: boolean;
}
