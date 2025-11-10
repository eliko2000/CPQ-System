/**
 * Unified Document Parser
 *
 * Routes files to the appropriate parser based on file type:
 * - Excel files (.xlsx, .xls, .csv) → parseExcelFile()
 * - PDF files (.pdf) → parsePDFFile()
 * - Image files (JPEG, PNG, etc.) → extractComponentsFromDocument() [AI]
 *
 * All parsers return the same AIExtractionResult structure for consistency.
 */

import { extractComponentsFromDocument, type AIExtractionResult } from './claudeAI';
import { parseExcelFile } from './excelParser';
import { parsePDFFile } from './pdfParser';

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

  // Check for Excel/spreadsheet files
  if (
    fileType.includes('excel') ||
    fileType.includes('spreadsheet') ||
    fileName.endsWith('.xlsx') ||
    fileName.endsWith('.xls') ||
    fileName.endsWith('.csv') ||
    fileType === 'text/csv'
  ) {
    return 'excel';
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
    excel: { en: 'Excel Parser', he: 'מנתח Excel' },
    pdf: { en: 'PDF Parser', he: 'מנתח PDF' },
    ai: { en: 'AI Vision', he: 'AI Vision' },
    unknown: { en: 'Unknown', he: 'לא ידוע' }
  };

  return names[method][language];
}

/**
 * Parse any supported document type and extract component data
 *
 * This is the main entry point for document parsing. It automatically
 * routes to the appropriate parser based on file type:
 * - Excel/CSV files use fast, reliable spreadsheet parsing
 * - PDF files use Claude AI Vision for maximum accuracy (like Claude chat)
 * - Image files use Claude AI Vision for maximum accuracy
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
      case 'excel': {
        // Excel files: Fast, reliable, no AI cost
        const result = await parseExcelFile(file);

        // Add document type to metadata if not already set
        if (result.metadata && !result.metadata.documentType) {
          result.metadata.documentType = 'excel';
        }

        return result;
      }

      case 'pdf': {
        // PDF files: Text extraction with pattern matching
        const result = await parsePDFFile(file);

        // If confidence is very low, suggest using AI
        if (result.confidence < 0.3) {
          return {
            ...result,
            error: result.error
              ? `${result.error}\n\n💡 Tip: For better results with complex PDFs, convert to image and use AI extraction.`
              : '⚠️ Low confidence extraction. For better results, convert PDF to image and use AI extraction.'
          };
        }

        return result;
      }

      case 'ai': {
        // Image and PDF files: Use Claude Vision API for best accuracy
        const result = await extractComponentsFromDocument(file);

        // Add document type to metadata if not already set
        if (result.metadata && !result.metadata.documentType) {
          const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
          result.metadata.documentType = isPDF ? 'pdf' : 'image';
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
          error: `Unsupported file type: ${file.type}\n\nSupported formats:\n• Excel: .xlsx, .xls, .csv\n• PDF: .pdf (text-based)\n• Images: .jpg, .png, .gif, .webp`
        };
      }
    }
  } catch (error) {
    console.error('Document parsing error:', error);

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
      // Excel parsing is very fast
      return Math.min(500, 100 + fileSizeMB * 50);

    case 'pdf':
      // PDF parsing depends on page count (estimate based on size)
      return Math.min(2000, 300 + fileSizeMB * 100);

    case 'ai':
      // AI extraction takes 5-15 seconds
      return 10000; // 10 seconds average

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
