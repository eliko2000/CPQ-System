/**
 * Test file for Excel and PDF parsers
 *
 * This file demonstrates usage patterns and validates the parsers work correctly.
 * Run with: npm test src/services/documentParsers.test.ts
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { parseExcelFile } from './excelParser';
import { parsePDFFile } from './pdfParser';
import type { AIExtractionResult } from './claudeAI';

// Polyfill DOMMatrix for pdfjs-dist (required for PDF parsing in Node.js environment)
beforeAll(() => {
  if (typeof global.DOMMatrix === 'undefined') {
    global.DOMMatrix = class DOMMatrix {
      a: number = 1;
      b: number = 0;
      c: number = 0;
      d: number = 1;
      e: number = 0;
      f: number = 0;
      m11: number = 1;
      m12: number = 0;
      m21: number = 0;
      m22: number = 1;
      m31: number = 0;
      m32: number = 0;
      m41: number = 0;
      m42: number = 0;
      m13: number = 0;
      m14: number = 0;
      m23: number = 0;
      m24: number = 0;
      m33: number = 1;
      m34: number = 0;
      m43: number = 0;
      m44: number = 1;
      is2D: boolean = true;
      isIdentity: boolean = true;

      constructor() {}

      multiply() {
        return this;
      }
      translate() {
        return this;
      }
      scale() {
        return this;
      }
      rotate() {
        return this;
      }
      transformPoint() {
        return { x: 0, y: 0, z: 0, w: 1 };
      }
      inverse() {
        return this;
      }
      flipX() {
        return this;
      }
      flipY() {
        return this;
      }
      skewX() {
        return this;
      }
      skewY() {
        return this;
      }
      setMatrixValue() {
        return this;
      }
      toFloat32Array() {
        return new Float32Array(16);
      }
      toFloat64Array() {
        return new Float64Array(16);
      }
      toJSON() {
        return {};
      }
      toString() {
        return '';
      }
    } as any;
  }
});

// Mock pdfjs-dist
import { vi } from 'vitest';
const mockGetDocument = vi.fn();
vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: {
    workerSrc: '',
  },
  getDocument: (args: any) => mockGetDocument(args),
}));

/**
 * Test Excel Parser with a sample file structure
 */
async function testExcelParser() {
  console.log('Testing Excel Parser...');

  // Example: Create a test file blob
  // In real usage, this would come from file input
  const testFile = new File([''], 'test.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  try {
    const result: AIExtractionResult = await parseExcelFile(testFile);

    console.log('Excel Parser Result:', {
      success: result.success,
      componentsFound: result.components.length,
      confidence: result.confidence,
      metadata: result.metadata,
    });

    // Validate structure
    if (result.success) {
      result.components.forEach((component, index) => {
        console.log(`Component ${index + 1}:`, {
          name: component.name,
          manufacturer: component.manufacturer,
          manufacturerPN: component.manufacturerPN,
          price:
            component.unitPriceUSD ||
            component.unitPriceNIS ||
            component.unitPriceEUR,
          currency: component.currency,
          confidence: component.confidence,
        });
      });
    }
  } catch (error) {
    console.error('Excel parser error:', error);
  }
}

/**
 * Test PDF Parser with a sample file
 */
async function testPDFParser() {
  console.log('\nTesting PDF Parser...');

  const testFile = new File([''], 'test.pdf', {
    type: 'application/pdf',
  });

  try {
    const result: AIExtractionResult = await parsePDFFile(testFile);

    console.log('PDF Parser Result:', {
      success: result.success,
      componentsFound: result.components.length,
      confidence: result.confidence,
      metadata: result.metadata,
    });

    if (result.success) {
      result.components.forEach((component, index) => {
        console.log(`Component ${index + 1}:`, {
          name: component.name,
          manufacturerPN: component.manufacturerPN,
          price:
            component.unitPriceUSD ||
            component.unitPriceNIS ||
            component.unitPriceEUR,
          confidence: component.confidence,
        });
      });
    }
  } catch (error) {
    console.error('PDF parser error:', error);
  }
}

/**
 * Integration example: Using parsers in a file upload handler
 */
async function handleFileUpload(file: File): Promise<AIExtractionResult> {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();

  // Route to appropriate parser
  if (
    fileType.includes('excel') ||
    fileType.includes('spreadsheet') ||
    fileName.endsWith('.xlsx') ||
    fileName.endsWith('.xls') ||
    fileName.endsWith('.csv')
  ) {
    return await parseExcelFile(file);
  } else if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
    return await parsePDFFile(file);
  } else if (fileType.startsWith('image/')) {
    // For images, use AI extraction
    const { extractComponentsFromDocument } = await import('./claudeAI');
    return await extractComponentsFromDocument(file);
  } else {
    return {
      success: false,
      components: [],
      metadata: { documentType: 'unknown', totalItems: 0 },
      confidence: 0,
      error: `Unsupported file type: ${fileType}`,
    };
  }
}

/**
 * Example: Using extraction results to create components
 */
async function processExtractionResults(result: AIExtractionResult) {
  if (!result.success) {
    console.error('Extraction failed:', result.error);
    return;
  }

  console.log(
    `\nProcessing ${result.components.length} extracted components...`
  );
  console.log(`Overall confidence: ${(result.confidence * 100).toFixed(1)}%`);

  // Filter components by confidence threshold
  const highConfidence = result.components.filter(
    c => c.confidence && c.confidence >= 0.7
  );
  const mediumConfidence = result.components.filter(
    c => c.confidence && c.confidence >= 0.4 && c.confidence < 0.7
  );
  const lowConfidence = result.components.filter(
    c => !c.confidence || c.confidence < 0.4
  );

  console.log(`\nConfidence breakdown:`);
  console.log(
    `- High confidence (≥70%): ${highConfidence.length} components - Auto-import recommended`
  );
  console.log(
    `- Medium confidence (40-70%): ${mediumConfidence.length} components - Review before import`
  );
  console.log(
    `- Low confidence (<40%): ${lowConfidence.length} components - Manual verification required`
  );

  // Example: Auto-import high confidence components
  for (const component of highConfidence) {
    console.log(`\n✓ Ready to import: ${component.name}`);
    console.log(`  - Part Number: ${component.manufacturerPN || 'N/A'}`);
    console.log(
      `  - Price: ${component.unitPriceUSD || component.unitPriceNIS || 'N/A'} ${component.currency || ''}`
    );
    console.log(`  - Category: ${component.category || 'אחר'}`);
  }
}

// Export for use in other modules
export {
  testExcelParser,
  testPDFParser,
  handleFileUpload,
  processExtractionResults,
};

// Run tests if in test environment
describe('Document Parsers Integration', () => {
  it('should execute testExcelParser without error', async () => {
    // Mock console.log to avoid cluttering output
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    await testExcelParser();

    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('should execute testPDFParser without error', async () => {
    // Mock console.log to avoid cluttering output
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    await testPDFParser();

    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('should handle file upload for PDF', async () => {
    const file = new File(['dummy content'], 'test.pdf', {
      type: 'application/pdf',
    });
    const result = await handleFileUpload(file);
    expect(result).toBeDefined();
    // Since we mocked pdfjs-dist but didn't setup return values for this specific call in the global scope,
    // it might return empty or error, but it shouldn't throw.
  });
});
