import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  parseDocument,
  getExtractionMethod,
  getExtractionMethodName,
  getEstimatedProcessingTime,
  isSupportedFileType,
  getSupportedExtensions,
  getSupportedMimeTypes,
} from '../documentParser';
import { parseExcelFile } from '../excelParser';
import { parsePDFFile } from '../pdfParser';
import { extractComponentsFromDocument } from '../claudeAI';
import type { AIExtractionResult } from '../claudeAI';

// Mock the parser functions
vi.mock('../excelParser', () => ({
  parseExcelFile: vi.fn(),
}));

vi.mock('../pdfParser', () => ({
  parsePDFFile: vi.fn(),
}));

vi.mock('../claudeAI', () => ({
  extractComponentsFromDocument: vi.fn(),
}));

/**
 * Helper to create a mock File object
 */
function createMockFile(name: string, type: string, size: number = 1024): File {
  const content = new ArrayBuffer(size);
  const blob = new Blob([content], { type });
  return new File([blob], name, { type });
}

/**
 * Helper to create a mock AIExtractionResult
 */
function createMockResult(success: boolean, components: any[] = []): AIExtractionResult {
  return {
    success,
    components,
    metadata: {
      documentType: 'test',
      totalItems: components.length,
    },
    confidence: 0.8,
  };
}

describe('documentParser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getExtractionMethod', () => {
    it('should detect Excel files by MIME type', () => {
      const file = createMockFile('data.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(getExtractionMethod(file)).toBe('excel');
    });

    it('should detect Excel files by extension', () => {
      const file = createMockFile('data.xlsx', 'application/octet-stream');
      expect(getExtractionMethod(file)).toBe('excel');
    });

    it('should detect XLS files', () => {
      const file = createMockFile('data.xls', 'application/vnd.ms-excel');
      expect(getExtractionMethod(file)).toBe('excel');
    });

    it('should detect CSV files', () => {
      const file = createMockFile('data.csv', 'text/csv');
      expect(getExtractionMethod(file)).toBe('excel');
    });

    it('should detect PDF files by MIME type', () => {
      const file = createMockFile('document.pdf', 'application/pdf');
      expect(getExtractionMethod(file)).toBe('pdf');
    });

    it('should detect PDF files by extension', () => {
      const file = createMockFile('document.pdf', 'application/octet-stream');
      expect(getExtractionMethod(file)).toBe('pdf');
    });

    it('should detect image files by MIME type', () => {
      const jpegFile = createMockFile('image.jpg', 'image/jpeg');
      expect(getExtractionMethod(jpegFile)).toBe('ai');

      const pngFile = createMockFile('image.png', 'image/png');
      expect(getExtractionMethod(pngFile)).toBe('ai');

      const gifFile = createMockFile('image.gif', 'image/gif');
      expect(getExtractionMethod(gifFile)).toBe('ai');

      const webpFile = createMockFile('image.webp', 'image/webp');
      expect(getExtractionMethod(webpFile)).toBe('ai');
    });

    it('should detect image files by extension', () => {
      const jpgFile = createMockFile('image.jpg', 'application/octet-stream');
      expect(getExtractionMethod(jpgFile)).toBe('ai');

      const jpegFile = createMockFile('image.jpeg', 'application/octet-stream');
      expect(getExtractionMethod(jpegFile)).toBe('ai');

      const pngFile = createMockFile('image.png', 'application/octet-stream');
      expect(getExtractionMethod(pngFile)).toBe('ai');
    });

    it('should return unknown for unsupported file types', () => {
      const file = createMockFile('document.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(getExtractionMethod(file)).toBe('unknown');
    });

    it('should handle files with mixed case extensions', () => {
      const file = createMockFile('DATA.XLSX', 'application/octet-stream');
      expect(getExtractionMethod(file)).toBe('excel');
    });
  });

  describe('getExtractionMethodName', () => {
    it('should return English names when language is en', () => {
      expect(getExtractionMethodName('excel', 'en')).toBe('Excel Parser');
      expect(getExtractionMethodName('pdf', 'en')).toBe('PDF Parser');
      expect(getExtractionMethodName('ai', 'en')).toBe('AI Vision');
      expect(getExtractionMethodName('unknown', 'en')).toBe('Unknown');
    });

    it('should return Hebrew names when language is he', () => {
      expect(getExtractionMethodName('excel', 'he')).toBe('מנתח Excel');
      expect(getExtractionMethodName('pdf', 'he')).toBe('מנתח PDF');
      expect(getExtractionMethodName('ai', 'he')).toBe('AI Vision');
      expect(getExtractionMethodName('unknown', 'he')).toBe('לא ידוע');
    });

    it('should default to Hebrew when no language specified', () => {
      expect(getExtractionMethodName('excel')).toBe('מנתח Excel');
    });
  });

  describe('parseDocument - Routing', () => {
    it('should route Excel files to parseExcelFile', async () => {
      const mockResult = {
        ...createMockResult(true, [{ name: 'Component 1' }]),
        metadata: {
          documentType: 'excel',
          totalItems: 1,
        }
      };
      vi.mocked(parseExcelFile).mockResolvedValue(mockResult);

      const file = createMockFile('data.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const result = await parseDocument(file);

      expect(parseExcelFile).toHaveBeenCalledWith(file);
      expect(result.success).toBe(true);
      expect(result.metadata.documentType).toBe('excel');
    });

    it('should route PDF files to parsePDFFile', async () => {
      const mockResult = createMockResult(true, [{ name: 'Component 1' }]);
      vi.mocked(parsePDFFile).mockResolvedValue(mockResult);

      const file = createMockFile('document.pdf', 'application/pdf');
      const result = await parseDocument(file);

      expect(parsePDFFile).toHaveBeenCalledWith(file);
      expect(result.success).toBe(true);
    });

    it('should route image files to extractComponentsFromDocument', async () => {
      const mockResult = {
        ...createMockResult(true, [{ name: 'Component 1' }]),
        metadata: {
          documentType: undefined as any, // Will be set by parseDocument
          totalItems: 1,
        }
      };
      vi.mocked(extractComponentsFromDocument).mockResolvedValue(mockResult);

      const file = createMockFile('image.png', 'image/png');
      const result = await parseDocument(file);

      expect(extractComponentsFromDocument).toHaveBeenCalledWith(file);
      expect(result.success).toBe(true);
      expect(result.metadata.documentType).toBe('image');
    });

    it('should return error for unsupported file types', async () => {
      const file = createMockFile('document.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      const result = await parseDocument(file);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported file type');
      expect(result.error).toContain('Supported formats');
    });
  });

  describe('parseDocument - Error Handling', () => {
    it('should handle Excel parser errors gracefully', async () => {
      vi.mocked(parseExcelFile).mockRejectedValue(new Error('Excel parsing failed'));

      const file = createMockFile('data.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const result = await parseDocument(file);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to parse document');
    });

    it('should handle PDF parser errors gracefully', async () => {
      vi.mocked(parsePDFFile).mockRejectedValue(new Error('PDF parsing failed'));

      const file = createMockFile('document.pdf', 'application/pdf');
      const result = await parseDocument(file);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to parse document');
    });

    it('should handle AI extraction errors gracefully', async () => {
      vi.mocked(extractComponentsFromDocument).mockRejectedValue(new Error('AI extraction failed'));

      const file = createMockFile('image.png', 'image/png');
      const result = await parseDocument(file);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to parse document');
    });

    it('should include document type in error result', async () => {
      vi.mocked(parseExcelFile).mockRejectedValue(new Error('Test error'));

      const file = createMockFile('data.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const result = await parseDocument(file);

      expect(result.metadata.documentType).toBe('excel');
    });
  });

  describe('parseDocument - Low Confidence PDF Handling', () => {
    it('should add AI suggestion tip for low confidence PDF results', async () => {
      const lowConfidenceResult = createMockResult(true, [{ name: 'Component 1' }]);
      lowConfidenceResult.confidence = 0.2;

      vi.mocked(parsePDFFile).mockResolvedValue(lowConfidenceResult);

      const file = createMockFile('document.pdf', 'application/pdf');
      const result = await parseDocument(file);

      expect(result.error).toContain('AI extraction');
    });

    it('should not modify high confidence PDF results', async () => {
      const highConfidenceResult = createMockResult(true, [{ name: 'Component 1' }]);
      highConfidenceResult.confidence = 0.8;

      vi.mocked(parsePDFFile).mockResolvedValue(highConfidenceResult);

      const file = createMockFile('document.pdf', 'application/pdf');
      const result = await parseDocument(file);

      expect(result.confidence).toBe(0.8);
    });
  });

  describe('parseDocument - Metadata Enhancement', () => {
    it('should add documentType to Excel results if missing', async () => {
      const mockResult: AIExtractionResult = {
        success: true,
        components: [],
        metadata: {
          documentType: undefined as any,
          totalItems: 0,
        },
        confidence: 0.8,
      };

      vi.mocked(parseExcelFile).mockResolvedValue(mockResult);

      const file = createMockFile('data.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const result = await parseDocument(file);

      expect(result.metadata.documentType).toBe('excel');
    });

    it('should add documentType to AI results if missing', async () => {
      const mockResult: AIExtractionResult = {
        success: true,
        components: [],
        metadata: {
          documentType: undefined as any,
          totalItems: 0,
        },
        confidence: 0.8,
      };

      vi.mocked(extractComponentsFromDocument).mockResolvedValue(mockResult);

      const file = createMockFile('image.png', 'image/png');
      const result = await parseDocument(file);

      expect(result.metadata.documentType).toBe('image');
    });
  });

  describe('getEstimatedProcessingTime', () => {
    it('should estimate fast processing for Excel files', () => {
      const file = createMockFile('data.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 500 * 1024);
      const time = getEstimatedProcessingTime(file);

      expect(time).toBeLessThan(1000); // Less than 1 second
      expect(time).toBeGreaterThan(0);
    });

    it('should cap Excel processing time at 500ms', () => {
      const largeFile = createMockFile('large.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 100 * 1024 * 1024);
      const time = getEstimatedProcessingTime(largeFile);

      expect(time).toBeLessThanOrEqual(500);
    });

    it('should estimate moderate processing for PDF files', () => {
      const file = createMockFile('document.pdf', 'application/pdf', 1024 * 1024);
      const time = getEstimatedProcessingTime(file);

      expect(time).toBeGreaterThan(300);
      expect(time).toBeLessThan(3000);
    });

    it('should cap PDF processing time at 2000ms', () => {
      const largeFile = createMockFile('large.pdf', 'application/pdf', 100 * 1024 * 1024);
      const time = getEstimatedProcessingTime(largeFile);

      expect(time).toBeLessThanOrEqual(2000);
    });

    it('should estimate 10 seconds for AI processing', () => {
      const file = createMockFile('image.png', 'image/png');
      const time = getEstimatedProcessingTime(file);

      expect(time).toBe(10000);
    });

    it('should return 0 for unknown file types', () => {
      const file = createMockFile('document.docx', 'application/msword');
      const time = getEstimatedProcessingTime(file);

      expect(time).toBe(0);
    });

    it('should scale Excel processing time with file size', () => {
      const smallFile = createMockFile('small.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 100 * 1024);
      const mediumFile = createMockFile('medium.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 500 * 1024);

      const smallTime = getEstimatedProcessingTime(smallFile);
      const mediumTime = getEstimatedProcessingTime(mediumFile);

      expect(mediumTime).toBeGreaterThan(smallTime);
    });
  });

  describe('isSupportedFileType', () => {
    it('should return true for Excel files', () => {
      const xlsxFile = createMockFile('data.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(isSupportedFileType(xlsxFile)).toBe(true);

      const xlsFile = createMockFile('data.xls', 'application/vnd.ms-excel');
      expect(isSupportedFileType(xlsFile)).toBe(true);

      const csvFile = createMockFile('data.csv', 'text/csv');
      expect(isSupportedFileType(csvFile)).toBe(true);
    });

    it('should return true for PDF files', () => {
      const file = createMockFile('document.pdf', 'application/pdf');
      expect(isSupportedFileType(file)).toBe(true);
    });

    it('should return true for image files', () => {
      const jpgFile = createMockFile('image.jpg', 'image/jpeg');
      expect(isSupportedFileType(jpgFile)).toBe(true);

      const pngFile = createMockFile('image.png', 'image/png');
      expect(isSupportedFileType(pngFile)).toBe(true);

      const gifFile = createMockFile('image.gif', 'image/gif');
      expect(isSupportedFileType(gifFile)).toBe(true);

      const webpFile = createMockFile('image.webp', 'image/webp');
      expect(isSupportedFileType(webpFile)).toBe(true);
    });

    it('should return false for unsupported files', () => {
      const docxFile = createMockFile('document.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(isSupportedFileType(docxFile)).toBe(false);

      const txtFile = createMockFile('document.txt', 'text/plain');
      expect(isSupportedFileType(txtFile)).toBe(false);
    });
  });

  describe('getSupportedExtensions', () => {
    it('should return array of supported extensions', () => {
      const extensions = getSupportedExtensions();

      expect(extensions).toContain('.xlsx');
      expect(extensions).toContain('.xls');
      expect(extensions).toContain('.csv');
      expect(extensions).toContain('.pdf');
      expect(extensions).toContain('.jpg');
      expect(extensions).toContain('.jpeg');
      expect(extensions).toContain('.png');
      expect(extensions).toContain('.gif');
      expect(extensions).toContain('.webp');
    });

    it('should return extensions with dots', () => {
      const extensions = getSupportedExtensions();

      extensions.forEach(ext => {
        expect(ext.startsWith('.')).toBe(true);
      });
    });
  });

  describe('getSupportedMimeTypes', () => {
    it('should return array of supported MIME types', () => {
      const mimeTypes = getSupportedMimeTypes();

      expect(mimeTypes).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(mimeTypes).toContain('application/vnd.ms-excel');
      expect(mimeTypes).toContain('text/csv');
      expect(mimeTypes).toContain('application/csv');
      expect(mimeTypes).toContain('application/pdf');
      expect(mimeTypes).toContain('image/jpeg');
      expect(mimeTypes).toContain('image/png');
      expect(mimeTypes).toContain('image/gif');
      expect(mimeTypes).toContain('image/webp');
    });

    it('should include alternative CSV MIME type', () => {
      const mimeTypes = getSupportedMimeTypes();

      expect(mimeTypes).toContain('text/csv');
      expect(mimeTypes).toContain('application/csv');
    });
  });

  describe('Integration Tests', () => {
    it('should process Excel file end-to-end', async () => {
      const mockResult = createMockResult(true, [
        { name: 'Component 1', unitPriceUSD: 100 },
        { name: 'Component 2', unitPriceUSD: 200 },
      ]);
      vi.mocked(parseExcelFile).mockResolvedValue(mockResult);

      const file = createMockFile('data.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const result = await parseDocument(file);

      expect(result.success).toBe(true);
      expect(result.components).toHaveLength(2);
      expect(result.metadata.totalItems).toBe(2);
    });

    it('should process PDF file end-to-end', async () => {
      const mockResult = createMockResult(true, [
        { name: 'Component 1', manufacturerPN: 'ABC123' },
      ]);
      vi.mocked(parsePDFFile).mockResolvedValue(mockResult);

      const file = createMockFile('quote.pdf', 'application/pdf');
      const result = await parseDocument(file);

      expect(result.success).toBe(true);
      expect(result.components).toHaveLength(1);
    });

    it('should process image file end-to-end', async () => {
      const mockResult = createMockResult(true, [
        { name: 'Component 1', confidence: 0.95 },
      ]);
      vi.mocked(extractComponentsFromDocument).mockResolvedValue(mockResult);

      const file = createMockFile('screenshot.png', 'image/png');
      const result = await parseDocument(file);

      expect(result.success).toBe(true);
      expect(result.components).toHaveLength(1);
    });
  });

  describe('Return Value Structure Consistency', () => {
    it('should return consistent AIExtractionResult structure for all file types', async () => {
      const mockResult = createMockResult(true, [{ name: 'Test' }]);

      vi.mocked(parseExcelFile).mockResolvedValue(mockResult);
      vi.mocked(parsePDFFile).mockResolvedValue(mockResult);
      vi.mocked(extractComponentsFromDocument).mockResolvedValue(mockResult);

      const excelFile = createMockFile('data.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const pdfFile = createMockFile('doc.pdf', 'application/pdf');
      const imageFile = createMockFile('img.png', 'image/png');

      const excelResult = await parseDocument(excelFile);
      const pdfResult = await parseDocument(pdfFile);
      const imageResult = await parseDocument(imageFile);

      // All should have the same structure
      [excelResult, pdfResult, imageResult].forEach(result => {
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('components');
        expect(result).toHaveProperty('metadata');
        expect(result).toHaveProperty('confidence');
        expect(result.metadata).toHaveProperty('documentType');
        expect(result.metadata).toHaveProperty('totalItems');
      });
    });

    it('should return consistent error structure for all file types', async () => {
      vi.mocked(parseExcelFile).mockRejectedValue(new Error('Excel error'));
      vi.mocked(parsePDFFile).mockRejectedValue(new Error('PDF error'));
      vi.mocked(extractComponentsFromDocument).mockRejectedValue(new Error('AI error'));

      const excelFile = createMockFile('data.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const pdfFile = createMockFile('doc.pdf', 'application/pdf');
      const imageFile = createMockFile('img.png', 'image/png');

      const excelResult = await parseDocument(excelFile);
      const pdfResult = await parseDocument(pdfFile);
      const imageResult = await parseDocument(imageFile);

      // All should have error structure
      [excelResult, pdfResult, imageResult].forEach(result => {
        expect(result.success).toBe(false);
        expect(result).toHaveProperty('error');
        expect(result.components).toHaveLength(0);
        expect(result.confidence).toBe(0);
      });
    });
  });
});
