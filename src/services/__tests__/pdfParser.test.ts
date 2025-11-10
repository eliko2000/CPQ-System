import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parsePDFFile } from '../pdfParser';

// Mock pdf-parse library (CommonJS module)
const mockPdfParse = vi.fn();
vi.mock('pdf-parse', () => mockPdfParse);

/**
 * Helper to create a mock File object with arrayBuffer support
 */
function createMockFile(
  name: string,
  type: string,
  content: ArrayBuffer = new ArrayBuffer(0)
): File {
  const blob = new Blob([content], { type });
  const file = new File([blob], name, { type });

  // Mock arrayBuffer method since it may not be available in test environment
  if (!file.arrayBuffer) {
    Object.defineProperty(file, 'arrayBuffer', {
      value: async () => content,
      writable: false,
    });
  }

  return file;
}

/**
 * Helper to create mock PDF parse result
 */
function createMockPDFResult(text: string, pages: number = 1) {
  return {
    numpages: pages,
    numrender: pages,
    info: {},
    metadata: {},
    text,
    version: '1.0',
  };
}

describe('pdfParser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parsePDFFile - Basic Functionality', () => {
    it('should parse PDF with clear text and tables', async () => {
      const pdfText = `
SUPPLIER QUOTATION

Part Number: ABC123    Price: $1,500.00
Description: Siemens PLC S7-1500

Part Number: XYZ789    Price: $250.00
Description: Banner Sensor Q45
      `;

      mockPdfParse.mockResolvedValue(createMockPDFResult(pdfText));

      const file = createMockFile('quote.pdf', 'application/pdf');
      const result = await parsePDFFile(file);

      expect(result.success).toBe(true);
      expect(result.components.length).toBeGreaterThan(0);
      expect(result.metadata.documentType).toBe('pdf');
      expect(result.metadata.pageCount).toBe(1);
    });

    it('should parse PDF with tabular structure', async () => {
      const pdfText = `
Item          Part Number       Price       Qty
Component A   PN-001           $1000       2
Component B   PN-002           $500        5
Component C   PN-003           $250        10
      `;

      mockPdfParse.mockResolvedValue(createMockPDFResult(pdfText));

      const file = createMockFile('table.pdf', 'application/pdf');
      const result = await parsePDFFile(file);

      expect(result.success).toBe(true);
      expect(result.metadata.hasTabularData).toBe(true);
      expect(result.metadata.extractionMethod).toBe('structured');
    });

    it('should parse PDF with free-text format', async () => {
      const pdfText = `
Dear Customer,

Please find our quotation below:

Product: Siemens PLC Controller
Part Number: 6ES7512-1DK01-0AB0
Price: USD 2,500.00

Product: Banner Photoelectric Sensor
P/N: Q45BB6AF300
Price: $150.00

Thank you for your business.
      `;

      mockPdfParse.mockResolvedValue(createMockPDFResult(pdfText));

      const file = createMockFile('freetext.pdf', 'application/pdf');
      const result = await parsePDFFile(file);

      expect(result.success).toBe(true);
      expect(result.metadata.extractionMethod).toBe('text');
      expect(result.components.length).toBeGreaterThan(0);
    });

    it('should handle empty PDF', async () => {
      mockPdfParse.mockResolvedValue(createMockPDFResult('', 1));

      const file = createMockFile('empty.pdf', 'application/pdf');
      const result = await parsePDFFile(file);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No text content found');
      expect(result.components).toHaveLength(0);
    });

    it('should handle corrupted/invalid PDF file', async () => {
      mockPdfParse.mockRejectedValue(new Error('Invalid PDF structure'));

      const file = createMockFile('corrupted.pdf', 'application/pdf');
      const result = await parsePDFFile(file);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to parse PDF file');
    });

    it('should reject non-PDF files', async () => {
      const file = createMockFile('document.docx', 'application/msword');
      const result = await parsePDFFile(file);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported file type');
      expect(result.components).toHaveLength(0);
    });
  });

  describe('parsePDFFile - Pattern Matching', () => {
    it('should extract prices from various USD formats', async () => {
      const pdfText = `
Product 1: $1,234.56
Product 2: 2345.67 USD
Product 3: USD 3456.78
      `;

      mockPdfParse.mockResolvedValue(createMockPDFResult(pdfText));

      const file = createMockFile('prices.pdf', 'application/pdf');
      const result = await parsePDFFile(file);

      expect(result.success).toBe(true);
      const prices = result.components.map(c => c.unitPriceUSD).filter(p => p !== undefined);
      expect(prices.length).toBeGreaterThan(0);
    });

    it('should extract prices in NIS/ILS format', async () => {
      const pdfText = `
Item 1    ₪5,000
Item 2    2500 NIS
Item 3    ILS 7500
      `;

      mockPdfParse.mockResolvedValue(createMockPDFResult(pdfText));

      const file = createMockFile('nis.pdf', 'application/pdf');
      const result = await parsePDFFile(file);

      expect(result.success).toBe(true);
      const nisComponents = result.components.filter(c => c.currency === 'NIS');
      expect(nisComponents.length).toBeGreaterThan(0);
    });

    it('should extract prices in EUR format', async () => {
      const pdfText = `
Component A    €1,500.00
Component B    2000 EUR
Component C    EUR 2500
      `;

      mockPdfParse.mockResolvedValue(createMockPDFResult(pdfText));

      const file = createMockFile('eur.pdf', 'application/pdf');
      const result = await parsePDFFile(file);

      expect(result.success).toBe(true);
      const eurComponents = result.components.filter(c => c.currency === 'EUR');
      expect(eurComponents.length).toBeGreaterThan(0);
    });

    it('should extract part numbers with various patterns', async () => {
      const pdfText = `
Product A - P/N: ABC-123-456
Product B - Part Number: XYZ789
Product C - PN: DEF-999
Product D - Part#: GHI123
Product E - Catalog No: JKL456
      `;

      mockPdfParse.mockResolvedValue(createMockPDFResult(pdfText));

      const file = createMockFile('partnumbers.pdf', 'application/pdf');
      const result = await parsePDFFile(file);

      expect(result.success).toBe(true);
      const withPN = result.components.filter(c => c.manufacturerPN);
      expect(withPN.length).toBeGreaterThan(0);
    });

    it('should extract product names from text', async () => {
      const pdfText = `
Siemens S7-1500 PLC
P/N: 6ES7512-1DK01-0AB0
Price: $2,500.00

Banner Photoelectric Sensor Q45
Part Number: Q45BB6AF300
Price: USD 150.00
      `;

      mockPdfParse.mockResolvedValue(createMockPDFResult(pdfText));

      const file = createMockFile('names.pdf', 'application/pdf');
      const result = await parsePDFFile(file);

      expect(result.success).toBe(true);
      const withNames = result.components.filter(c => c.name);
      expect(withNames.length).toBeGreaterThan(0);
    });
  });

  describe('parsePDFFile - Metadata', () => {
    it('should extract page count correctly', async () => {
      const pdfText = 'Multi-page PDF content';
      mockPdfParse.mockResolvedValue(createMockPDFResult(pdfText, 5));

      const file = createMockFile('multipage.pdf', 'application/pdf');
      const result = await parsePDFFile(file);

      expect(result.metadata.pageCount).toBe(5);
    });

    it('should calculate text length', async () => {
      const pdfText = 'This is a test PDF with some content to measure length';
      mockPdfParse.mockResolvedValue(createMockPDFResult(pdfText));

      const file = createMockFile('content.pdf', 'application/pdf');
      const result = await parsePDFFile(file);

      expect(result.metadata.textLength).toBe(pdfText.length);
    });

    it('should detect extraction method (structured vs text)', async () => {
      const structuredText = `
Item          Part Number       Price
Component A   PN-001           $1000
Component B   PN-002           $500
      `;

      mockPdfParse.mockResolvedValue(createMockPDFResult(structuredText));

      const file = createMockFile('structured.pdf', 'application/pdf');
      const result = await parsePDFFile(file);

      expect(result.metadata.extractionMethod).toBe('structured');
      expect(result.metadata.hasTabularData).toBe(true);
    });

    it('should report total items extracted', async () => {
      const pdfText = `
Product 1    P/N: ABC123    $100
Product 2    P/N: DEF456    $200
Product 3    P/N: GHI789    $300
      `;

      mockPdfParse.mockResolvedValue(createMockPDFResult(pdfText));

      const file = createMockFile('items.pdf', 'application/pdf');
      const result = await parsePDFFile(file);

      expect(result.metadata.totalItems).toBe(result.components.length);
      expect(result.metadata.totalItems).toBeGreaterThan(0);
    });
  });

  describe('parsePDFFile - Confidence Scoring', () => {
    it('should have lower confidence for text-only extraction', async () => {
      const pdfText = `
Random text without structured data
Some more text here
And even more text
      `;

      mockPdfParse.mockResolvedValue(createMockPDFResult(pdfText));

      const file = createMockFile('unstructured.pdf', 'application/pdf');
      const result = await parsePDFFile(file);

      if (result.components.length > 0) {
        expect(result.components[0].confidence).toBeLessThan(0.7);
      }
    });

    it('should increase confidence with more data fields', async () => {
      const pdfText = `
Product: Siemens PLC
Part Number: ABC123
Price: $1,500.00
      `;

      mockPdfParse.mockResolvedValue(createMockPDFResult(pdfText));

      const file = createMockFile('complete.pdf', 'application/pdf');
      const result = await parsePDFFile(file);

      if (result.components.length > 0) {
        const componentWithAllData = result.components.find(
          c => c.name && c.manufacturerPN && (c.unitPriceUSD || c.unitPriceNIS || c.unitPriceEUR)
        );
        if (componentWithAllData) {
          expect(componentWithAllData.confidence).toBeGreaterThanOrEqual(0.5);
        }
      }
    });

    it('should cap PDF confidence at 0.9', async () => {
      const pdfText = `
Complete Product Data
Name: Test Component
Part Number: FULL-DATA-123
Price: $999.99
Manufacturer: Test Mfr
      `;

      mockPdfParse.mockResolvedValue(createMockPDFResult(pdfText));

      const file = createMockFile('maxconfidence.pdf', 'application/pdf');
      const result = await parsePDFFile(file);

      if (result.components.length > 0) {
        result.components.forEach(component => {
          expect(component.confidence).toBeLessThanOrEqual(0.9);
        });
      }
    });

    it('should provide low confidence warning when appropriate', async () => {
      const pdfText = `
Vague data
Something: $100
      `;

      mockPdfParse.mockResolvedValue(createMockPDFResult(pdfText));

      const file = createMockFile('lowconf.pdf', 'application/pdf');
      const result = await parsePDFFile(file);

      // If no components found or very low confidence, should have warning
      if (result.components.length === 0 || result.confidence < 0.5) {
        expect(result.error).toBeDefined();
        expect(typeof result.error).toBe('string');
      }
    });
  });

  describe('parsePDFFile - Edge Cases', () => {
    it('should handle PDF with no extractable component data', async () => {
      const pdfText = `
This is just a letter without any product information.
No prices, no part numbers, nothing relevant.
Just plain text.
      `;

      mockPdfParse.mockResolvedValue(createMockPDFResult(pdfText));

      const file = createMockFile('letter.pdf', 'application/pdf');
      const result = await parsePDFFile(file);

      expect(result.success).toBe(true);
      expect(result.components).toHaveLength(0);
      expect(result.error).toContain('No structured component data found');
    });

    it('should handle PDF with mixed languages', async () => {
      const pdfText = `
מוצר: PLC סימנס
מק"ט: ABC123
מחיר: $1,500

Product: Sensor
Part Number: XYZ789
Price: ₪500
      `;

      mockPdfParse.mockResolvedValue(createMockPDFResult(pdfText));

      const file = createMockFile('mixed.pdf', 'application/pdf');
      const result = await parsePDFFile(file);

      expect(result.success).toBe(true);
    });

    it('should handle PDF with special characters', async () => {
      const pdfText = `
Product™: Component®
P/N: ABC-123/456.789
Price: $1,234.56 ± $50
      `;

      mockPdfParse.mockResolvedValue(createMockPDFResult(pdfText));

      const file = createMockFile('special.pdf', 'application/pdf');
      const result = await parsePDFFile(file);

      expect(result.success).toBe(true);
    });

    it('should handle very large PDF text', async () => {
      const largePdfText = Array(10000).fill('Product Line PN-001 $100\n').join('');
      mockPdfParse.mockResolvedValue(createMockPDFResult(largePdfText));

      const file = createMockFile('large.pdf', 'application/pdf');
      const result = await parsePDFFile(file);

      expect(result.success).toBe(true);
      expect(result.metadata.textLength).toBeGreaterThan(100000);
    });

    it('should handle PDF with only whitespace after parsing', async () => {
      const pdfText = '     \n\n\n     \t\t\t     ';
      mockPdfParse.mockResolvedValue(createMockPDFResult(pdfText));

      const file = createMockFile('whitespace.pdf', 'application/pdf');
      const result = await parsePDFFile(file);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No text content found');
    });

    it('should detect tabular structure correctly', async () => {
      const tabularText = `
Col1          Col2          Col3
Data1         Data2         Data3
Data4         Data5         Data6
Data7         Data8         Data9
      `;

      mockPdfParse.mockResolvedValue(createMockPDFResult(tabularText));

      const file = createMockFile('table2.pdf', 'application/pdf');
      const result = await parsePDFFile(file);

      expect(result.metadata.hasTabularData).toBe(true);
    });

    it('should handle prices without thousands separators', async () => {
      const pdfText = `
Item 1: $1234.56
Item 2: $5678
Item 3: 9999.99 USD
      `;

      mockPdfParse.mockResolvedValue(createMockPDFResult(pdfText));

      const file = createMockFile('nothousands.pdf', 'application/pdf');
      const result = await parsePDFFile(file);

      expect(result.success).toBe(true);
      expect(result.components.length).toBeGreaterThan(0);
    });
  });

  describe('parsePDFFile - Currency Detection', () => {
    it('should correctly detect USD currency', async () => {
      const pdfText = `
Item: Test Component
Price: $1,000 USD
      `;

      mockPdfParse.mockResolvedValue(createMockPDFResult(pdfText));

      const file = createMockFile('usd.pdf', 'application/pdf');
      const result = await parsePDFFile(file);

      const usdComponent = result.components.find(c => c.currency === 'USD');
      expect(usdComponent).toBeDefined();
    });

    it('should correctly detect NIS currency', async () => {
      const pdfText = `
פריט: רכיב בדיקה
מחיר: ₪1,000
      `;

      mockPdfParse.mockResolvedValue(createMockPDFResult(pdfText));

      const file = createMockFile('nis2.pdf', 'application/pdf');
      const result = await parsePDFFile(file);

      const nisComponent = result.components.find(c => c.currency === 'NIS');
      expect(nisComponent).toBeDefined();
    });

    it('should correctly detect EUR currency', async () => {
      const pdfText = `
Article: Test Component
Prix: €1,500 EUR
      `;

      mockPdfParse.mockResolvedValue(createMockPDFResult(pdfText));

      const file = createMockFile('eur2.pdf', 'application/pdf');
      const result = await parsePDFFile(file);

      const eurComponent = result.components.find(c => c.currency === 'EUR');
      expect(eurComponent).toBeDefined();
    });
  });

  describe('parsePDFFile - Category Detection', () => {
    it('should normalize categories from product names', async () => {
      const pdfText = `
Siemens PLC Controller
P/N: ABC123
Price: $1,000

Banner Sensor Q45
P/N: DEF456
Price: $200

Motor Drive System
P/N: GHI789
Price: $500
      `;

      mockPdfParse.mockResolvedValue(createMockPDFResult(pdfText));

      const file = createMockFile('categories.pdf', 'application/pdf');
      const result = await parsePDFFile(file);

      expect(result.success).toBe(true);
      // Check that at least one category was assigned
      const hasCategories = result.components.some(c => c.category && c.category !== 'אחר');
      expect(hasCategories).toBe(true);
    });

    it('should use default category for unknown types', async () => {
      const pdfText = `
Random Component - P/N: ABC123 - $100
      `;

      mockPdfParse.mockResolvedValue(createMockPDFResult(pdfText));

      const file = createMockFile('unknown.pdf', 'application/pdf');
      const result = await parsePDFFile(file);

      if (result.components.length > 0) {
        expect(result.components[0].category).toBe('אחר');
      }
    });
  });

  describe('parsePDFFile - Multi-column and Complex Layouts', () => {
    it('should handle pipe-separated tabular data', async () => {
      const pdfText = `
Item | Part Number | Price | Qty
Component A | PN-001 | $1,000 | 2
Component B | PN-002 | $500 | 5
      `;

      mockPdfParse.mockResolvedValue(createMockPDFResult(pdfText));

      const file = createMockFile('pipes.pdf', 'application/pdf');
      const result = await parsePDFFile(file);

      expect(result.metadata.hasTabularData).toBe(true);
      expect(result.components.length).toBeGreaterThan(0);
    });

    it('should handle tab-separated data', async () => {
      const pdfText = `Item\tPart Number\tPrice
Component A\tPN-001\t$1,000
Component B\tPN-002\t$500`;

      mockPdfParse.mockResolvedValue(createMockPDFResult(pdfText));

      const file = createMockFile('tabs.pdf', 'application/pdf');
      const result = await parsePDFFile(file);

      expect(result.metadata.hasTabularData).toBe(true);
    });
  });

  describe('parsePDFFile - Error Messages and Suggestions', () => {
    it('should suggest AI extraction for scanned documents', async () => {
      mockPdfParse.mockResolvedValue(createMockPDFResult('', 1));

      const file = createMockFile('scanned.pdf', 'application/pdf');
      const result = await parsePDFFile(file);

      expect(result.success).toBe(false);
      expect(result.error).toContain('scanned document');
      expect(result.error).toContain('AI extraction');
    });

    it('should suggest AI extraction for complex PDFs with no data', async () => {
      const pdfText = 'Some text but no components';
      mockPdfParse.mockResolvedValue(createMockPDFResult(pdfText));

      const file = createMockFile('complex.pdf', 'application/pdf');
      const result = await parsePDFFile(file);

      expect(result.error).toContain('AI extraction');
    });
  });
});
