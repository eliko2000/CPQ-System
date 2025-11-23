/**
 * Unified Document Parser
 *
 * Routes files to Claude AI for intelligent extraction:
 * - Excel files (.xlsx, .xls, .csv) → Claude AI with spreadsheet parsing
 * - PDF files (.pdf) → Claude AI Vision
 * - Image files (JPEG, PNG, etc.) → Claude AI Vision
 *
 * All files are processed through Claude AI for maximum accuracy and consistency.
 */

import { extractComponentsFromDocument, type AIExtractionResult } from './claudeAI';
import { parseExcelFile } from './excelParser';
import { parsePDFFile } from './pdfParser';
import { logger } from '../lib/logger';

/**
 * Extraction method type
 */
export type ExtractionMethod = 'excel' | 'pdf' | 'ai' | 'unknown';

/**
 * Get the extraction method that will be used for a given file
 *
 * @param file - File to check
 * @returns The extraction method that will be used
 */
export function getExtractionMethod(file: File): ExtractionMethod {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();

  // Check for Excel/spreadsheet files - use AI for intelligent extraction
  if (
    fileType.includes('excel') ||
    fileType.includes('spreadsheet') ||
    fileName.endsWith('.xlsx') ||
    fileName.endsWith('.xls') ||
    fileName.endsWith('.csv') ||
    fileType === 'text/csv'
  ) {
    return 'ai'; // Changed to use Claude AI for better extraction quality
  }

  // Check for PDF files - use AI Vision for best quality (like Claude chat)
  if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
    return 'ai'; // Changed from 'pdf' to 'ai' for better extraction quality
  }

  // Check for image files
  if (
    fileType.startsWith('image/') ||
    fileName.endsWith('.jpg') ||
    fileName.endsWith('.jpeg') ||
    fileName.endsWith('.png') ||
    fileName.endsWith('.gif') ||
    fileName.endsWith('.webp')
  ) {
    return 'ai';
  }

  return 'unknown';
}

/**
 * Get user-friendly name for extraction method
 *
 * @param method - Extraction method
 * @param language - Language code ('en' or 'he')
 * @returns User-friendly name
 */
export function getExtractionMethodName(method: ExtractionMethod, language: 'en' | 'he' = 'he'): string {
  const names = {
    excel: { en: 'Claude AI (Excel)', he: 'Claude AI (Excel)' },
    pdf: { en: 'Claude AI (PDF)', he: 'Claude AI (PDF)' },
    ai: { en: 'Claude AI Vision', he: 'Claude AI Vision' },
    unknown: { en: 'Unknown', he: 'לא ידוע' }
  };

  return names[method][language];
}

/**
 * Parse any supported document type and extract component data
 *
 * This is the main entry point for document parsing. All files are processed
 * through Claude AI for intelligent extraction:
 * - Excel/CSV files: Claude AI reads and understands spreadsheet structure
 * - PDF files: Claude AI Vision for accurate document analysis
 * - Image files: Claude AI Vision for maximum accuracy
 *
 * All methods return the same AIExtractionResult structure.
 *
 * @param file - The document file to parse
 * @returns Promise<AIExtractionResult> - Standardized extraction result
 *
 * @example
 * ```typescript
 * const result = await parseDocument(file);
 * if (result.success) {
 *   console.log(`Extracted ${result.components.length} components`);
 *   result.components.forEach(component => {
 *     console.log(component.name, component.manufacturerPN);
 *   });
 * }
 * ```
 */
export async function parseDocument(file: File): Promise<AIExtractionResult> {
  const method = getExtractionMethod(file);

  try {
    switch (method) {
      case 'excel':
      case 'pdf':
      case 'ai': {
        // All files now use Claude AI for best accuracy
        const result = await extractComponentsFromDocument(file);

        // Add document type to metadata if not already set
        if (result.metadata && !result.metadata.documentType) {
          const fileName = file.name.toLowerCase();
          let documentType: string;

          if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
            documentType = 'excel';
          } else if (fileName.endsWith('.pdf')) {
            documentType = 'pdf';
          } else {
            documentType = 'image';
          }

          result.metadata.documentType = documentType;
        }

        return result;
      }

      case 'unknown':
      default: {
        // Unsupported file type
        return {
          success: false,
          components: [],
          metadata: {
            documentType: 'unknown',
            totalItems: 0,
          },
          confidence: 0,
          error: `Unsupported file type: ${file.type}\n\nSupported formats:\n• Excel: .xlsx, .xls, .csv\n• PDF: .pdf\n• Images: .jpg, .png, .gif, .webp`
        };
      }
    }
  } catch (error) {
    logger.error('Document parsing error:', error);

    return {
      success: false,
      components: [],
      metadata: {
        documentType: method,
        totalItems: 0,
      },
      confidence: 0,
      error: error instanceof Error
        ? `Failed to parse document: ${error.message}`
        : 'Unknown error occurred while parsing document'
    };
  }
}

/**
 * Get estimated processing time for a file
 *
 * @param file - File to estimate processing time for
 * @returns Estimated processing time in milliseconds
 */
export function getEstimatedProcessingTime(file: File): number {
  const method = getExtractionMethod(file);
  const fileSizeMB = file.size / (1024 * 1024);

  switch (method) {
    case 'excel':
    case 'pdf':
    case 'ai':
      // All files use Claude AI - typically 5-15 seconds
      // Larger files may take longer
      return Math.max(8000, Math.min(20000, 8000 + fileSizeMB * 1000));

    default:
      return 0;
  }
}

/**
 * Check if a file type is supported
 *
 * @param file - File to check
 * @returns True if file type is supported
 */
export function isSupportedFileType(file: File): boolean {
  return getExtractionMethod(file) !== 'unknown';
}

/**
 * Get list of supported file extensions
 *
 * @returns Array of supported file extensions (with dots)
 */
export function getSupportedExtensions(): string[] {
  return [
    '.xlsx',
    '.xls',
    '.csv',
    '.pdf',
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.webp'
  ];
}

/**
 * Get list of supported MIME types
 *
 * @returns Array of supported MIME types
 */
export function getSupportedMimeTypes(): string[] {
  return [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv', // .csv
    'application/csv', // .csv (alternative)
    'application/pdf', // .pdf
    'image/jpeg', // .jpg, .jpeg
    'image/png', // .png
    'image/gif', // .gif
    'image/webp' // .webp
  ];
}
