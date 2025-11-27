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
function createMockResult(
  success: boolean,
  components: any[] = []
): AIExtractionResult {
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
    it('should detect Excel files by MIME type and route to AI', () => {
      const file = createMockFile(
        'data.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      expect(getExtractionMethod(file)).toBe('ai');
    });

    it('should detect Excel files by extension and route to AI', () => {
      const file = createMockFile('data.xlsx', 'application/octet-stream');
      expect(getExtractionMethod(file)).toBe('ai');
    });

    it('should detect XLS files and route to AI', () => {
      const file = createMockFile('data.xls', 'application/vnd.ms-excel');
      expect(getExtractionMethod(file)).toBe('ai');
    });

    it('should detect CSV files and route to AI', () => {
      const file = createMockFile('data.csv', 'text/csv');
      expect(getExtractionMethod(file)).toBe('ai');
    });

    it('should detect PDF files by MIME type and route to AI', () => {
      const file = createMockFile('document.pdf', 'application/pdf');
      expect(getExtractionMethod(file)).toBe('ai');
    });

    it('should detect PDF files by extension and route to AI', () => {
      const file = createMockFile('document.pdf', 'application/octet-stream');
      expect(getExtractionMethod(file)).toBe('ai');
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
      const file = createMockFile(
        'document.docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
      expect(getExtractionMethod(file)).toBe('unknown');
    });

    it('should handle files with mixed case extensions', () => {
      const file = createMockFile('DATA.XLSX', 'application/octet-stream');
      expect(getExtractionMethod(file)).toBe('ai');
    });
  });

  describe('getExtractionMethodName', () => {
    it('should return English names when language is en', () => {
      expect(getExtractionMethodName('excel', 'en')).toBe('Claude AI (Excel)');
      expect(getExtractionMethodName('pdf', 'en')).toBe('Claude AI (PDF)');
      expect(getExtractionMethodName('ai', 'en')).toBe('Claude AI Vision');
      expect(getExtractionMethodName('unknown', 'en')).toBe('Unknown');
    });

    it('should return Hebrew names when language is he', () => {
      expect(getExtractionMethodName('excel', 'he')).toBe('Claude AI (Excel)');
      expect(getExtractionMethodName('pdf', 'he')).toBe('Claude AI (PDF)');
      expect(getExtractionMethodName('ai', 'he')).toBe('Claude AI Vision');
      expect(getExtractionMethodName('unknown', 'he')).toBe('לא ידוע');
    });

    it('should default to Hebrew when no language specified', () => {
      expect(getExtractionMethodName('excel')).toBe('Claude AI (Excel)');
    });
  });

  describe('parseDocument - Routing', () => {
    it('should route Excel files to Claude AI', async () => {
      const mockResult = {
        ...createMockResult(true, [{ name: 'Component 1' }]),
        metadata: {
          documentType: undefined as any, // Will be set by parseDocument
          totalItems: 1,
        },
      };
      vi.mocked(extractComponentsFromDocument).mockResolvedValue(mockResult);

      const file = createMockFile(
        'data.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      const result = await parseDocument(file);

      expect(extractComponentsFromDocument).toHaveBeenCalledWith(file);
      expect(result.success).toBe(true);
      expect(result.metadata.documentType).toBe('excel');
    });

    it('should route PDF files to Claude AI', async () => {
      const mockResult = {
        ...createMockResult(true, [{ name: 'Component 1' }]),
        metadata: {
          documentType: undefined as any,
          totalItems: 1,
        },
      };
      vi.mocked(extractComponentsFromDocument).mockResolvedValue(mockResult);

      const file = createMockFile('document.pdf', 'application/pdf');
      const result = await parseDocument(file);

      expect(extractComponentsFromDocument).toHaveBeenCalledWith(file);
      expect(result.success).toBe(true);
      expect(result.metadata.documentType).toBe('pdf');
    });

    it('should route image files to Claude AI', async () => {
      const mockResult = {
        ...createMockResult(true, [{ name: 'Component 1' }]),
        metadata: {
          documentType: undefined as any, // Will be set by parseDocument
          totalItems: 1,
        },
      };
      vi.mocked(extractComponentsFromDocument).mockResolvedValue(mockResult);

      const file = createMockFile('image.png', 'image/png');
      const result = await parseDocument(file);

      expect(extractComponentsFromDocument).toHaveBeenCalledWith(file);
      expect(result.success).toBe(true);
      expect(result.metadata.documentType).toBe('image');
    });

    it('should return error for unsupported file types', async () => {
      const file = createMockFile(
        'document.docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
      const result = await parseDocument(file);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported file type');
      expect(result.error).toContain('Supported formats');
    });
  });

  describe('parseDocument - Error Handling', () => {
    it('should handle Claude AI errors for Excel files gracefully', async () => {
      vi.mocked(extractComponentsFromDocument).mockRejectedValue(
        new Error('AI extraction failed')
      );

      const file = createMockFile(
        'data.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      const result = await parseDocument(file);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to parse document');
      expect(result.metadata.documentType).toBe('ai');
    });

    it('should handle Claude AI errors for PDF files gracefully', async () => {
      vi.mocked(extractComponentsFromDocument).mockRejectedValue(
        new Error('AI extraction failed')
      );

      const file = createMockFile('document.pdf', 'application/pdf');
      const result = await parseDocument(file);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to parse document');
      expect(result.metadata.documentType).toBe('ai');
    });

    it('should handle Claude AI errors for image files gracefully', async () => {
      vi.mocked(extractComponentsFromDocument).mockRejectedValue(
        new Error('AI extraction failed')
      );

      const file = createMockFile('image.png', 'image/png');
      const result = await parseDocument(file);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to parse document');
      expect(result.metadata.documentType).toBe('ai');
    });

    it('should include extraction method in error result', async () => {
      vi.mocked(extractComponentsFromDocument).mockRejectedValue(
        new Error('Test error')
      );

      const file = createMockFile(
        'data.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      const result = await parseDocument(file);

      expect(result.metadata.documentType).toBe('ai');
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

      vi.mocked(extractComponentsFromDocument).mockResolvedValue(mockResult);

      const file = createMockFile(
        'data.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      const result = await parseDocument(file);

      expect(result.metadata.documentType).toBe('excel');
    });

    it('should add documentType to PDF results if missing', async () => {
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

      const file = createMockFile('document.pdf', 'application/pdf');
      const result = await parseDocument(file);

      expect(result.metadata.documentType).toBe('pdf');
    });

    it('should add documentType to image results if missing', async () => {
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

    it('should not override existing documentType', async () => {
      const mockResult: AIExtractionResult = {
        success: true,
        components: [],
        metadata: {
          documentType: 'excel',
          totalItems: 0,
        },
        confidence: 0.8,
      };

      vi.mocked(extractComponentsFromDocument).mockResolvedValue(mockResult);

      const file = createMockFile(
        'data.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      const result = await parseDocument(file);

      expect(result.metadata.documentType).toBe('excel');
    });
  });

  describe('getEstimatedProcessingTime', () => {
    it('should estimate AI processing time for Excel files', () => {
      const file = createMockFile(
        'data.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        500 * 1024
      );
      const time = getEstimatedProcessingTime(file);

      expect(time).toBeGreaterThanOrEqual(8000); // At least 8 seconds
      expect(time).toBeLessThanOrEqual(20000); // At most 20 seconds
    });

    it('should estimate AI processing time for PDF files', () => {
      const file = createMockFile(
        'document.pdf',
        'application/pdf',
        1024 * 1024
      );
      const time = getEstimatedProcessingTime(file);

      expect(time).toBeGreaterThanOrEqual(8000);
      expect(time).toBeLessThanOrEqual(20000);
    });

    it('should estimate AI processing time for image files', () => {
      const file = createMockFile('image.png', 'image/png');
      const time = getEstimatedProcessingTime(file);

      expect(time).toBeGreaterThanOrEqual(8000);
      expect(time).toBeLessThanOrEqual(20000);
    });

    it('should return 0 for unknown file types', () => {
      const file = createMockFile('document.docx', 'application/msword');
      const time = getEstimatedProcessingTime(file);

      expect(time).toBe(0);
    });

    it('should scale processing time with file size', () => {
      const smallFile = createMockFile(
        'small.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        100 * 1024
      );
      const largeFile = createMockFile(
        'large.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        10 * 1024 * 1024
      );

      const smallTime = getEstimatedProcessingTime(smallFile);
      const largeTime = getEstimatedProcessingTime(largeFile);

      expect(largeTime).toBeGreaterThan(smallTime);
    });

    it('should cap processing time at 20 seconds', () => {
      const hugeFile = createMockFile(
        'huge.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        100 * 1024 * 1024
      );
      const time = getEstimatedProcessingTime(hugeFile);

      expect(time).toBeLessThanOrEqual(20000);
    });

    it('should have minimum processing time of 8 seconds', () => {
      const tinyFile = createMockFile(
        'tiny.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        1024
      );
      const time = getEstimatedProcessingTime(tinyFile);

      expect(time).toBeGreaterThanOrEqual(8000);
    });
  });

  describe('isSupportedFileType', () => {
    it('should return true for Excel files', () => {
      const xlsxFile = createMockFile(
        'data.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
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
      const docxFile = createMockFile(
        'document.docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
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

      expect(mimeTypes).toContain(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
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
    it('should process Excel file end-to-end with Claude AI', async () => {
      const mockResult = {
        ...createMockResult(true, [
          { name: 'Component 1', unitPriceUSD: 100 },
          { name: 'Component 2', unitPriceUSD: 200 },
        ]),
        metadata: {
          documentType: undefined as any,
          totalItems: 2,
        },
      };
      vi.mocked(extractComponentsFromDocument).mockResolvedValue(mockResult);

      const file = createMockFile(
        'data.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      const result = await parseDocument(file);

      expect(extractComponentsFromDocument).toHaveBeenCalledWith(file);
      expect(result.success).toBe(true);
      expect(result.components).toHaveLength(2);
      expect(result.metadata.totalItems).toBe(2);
      expect(result.metadata.documentType).toBe('excel');
    });

    it('should process PDF file end-to-end with Claude AI', async () => {
      const mockResult = {
        ...createMockResult(true, [
          { name: 'Component 1', manufacturerPN: 'ABC123' },
        ]),
        metadata: {
          documentType: undefined as any,
          totalItems: 1,
        },
      };
      vi.mocked(extractComponentsFromDocument).mockResolvedValue(mockResult);

      const file = createMockFile('quote.pdf', 'application/pdf');
      const result = await parseDocument(file);

      expect(extractComponentsFromDocument).toHaveBeenCalledWith(file);
      expect(result.success).toBe(true);
      expect(result.components).toHaveLength(1);
      expect(result.metadata.documentType).toBe('pdf');
    });

    it('should process image file end-to-end with Claude AI', async () => {
      const mockResult = {
        ...createMockResult(true, [{ name: 'Component 1', confidence: 0.95 }]),
        metadata: {
          documentType: undefined as any,
          totalItems: 1,
        },
      };
      vi.mocked(extractComponentsFromDocument).mockResolvedValue(mockResult);

      const file = createMockFile('screenshot.png', 'image/png');
      const result = await parseDocument(file);

      expect(extractComponentsFromDocument).toHaveBeenCalledWith(file);
      expect(result.success).toBe(true);
      expect(result.components).toHaveLength(1);
      expect(result.metadata.documentType).toBe('image');
    });
  });

  describe('Return Value Structure Consistency', () => {
    it('should return consistent AIExtractionResult structure for all file types', async () => {
      const excelFile = createMockFile(
        'data.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      const pdfFile = createMockFile('doc.pdf', 'application/pdf');
      const imageFile = createMockFile('img.png', 'image/png');

      // Create fresh mock result for each call to avoid mutation issues
      const createFreshMockResult = () => ({
        ...createMockResult(true, [{ name: 'Test' }]),
        metadata: {
          documentType: undefined as any,
          totalItems: 1,
        },
      });

      // Mock for Excel file
      vi.mocked(extractComponentsFromDocument).mockResolvedValueOnce(
        createFreshMockResult()
      );
      const excelResult = await parseDocument(excelFile);

      // Mock for PDF file
      vi.mocked(extractComponentsFromDocument).mockResolvedValueOnce(
        createFreshMockResult()
      );
      const pdfResult = await parseDocument(pdfFile);

      // Mock for image file
      vi.mocked(extractComponentsFromDocument).mockResolvedValueOnce(
        createFreshMockResult()
      );
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

      // Document types should be correctly set based on file extension
      expect(excelResult.metadata.documentType).toBe('excel');
      expect(pdfResult.metadata.documentType).toBe('pdf');
      expect(imageResult.metadata.documentType).toBe('image');
    });

    it('should return consistent error structure for all file types', async () => {
      vi.mocked(extractComponentsFromDocument).mockRejectedValue(
        new Error('AI error')
      );

      const excelFile = createMockFile(
        'data.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
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
        expect(result.metadata.documentType).toBe('ai'); // Error includes extraction method
      });
    });
  });
});
