import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as XLSX from 'xlsx';
import { parseExcelFile } from '../excelParser';

// Mock XLSX library
vi.mock('xlsx', () => ({
  read: vi.fn(),
  utils: {
    sheet_to_json: vi.fn(),
  },
}));

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
 * Helper to create mock Excel data
 */
function createMockExcelData(): any {
  return {
    SheetNames: ['Sheet1'],
    Sheets: {
      Sheet1: {}
    }
  };
}

describe('excelParser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseExcelFile - Basic Functionality', () => {
    it('should parse valid Excel file with all columns present', async () => {
      const mockWorkbook = createMockExcelData();
      const mockData = [
        ['Product Name', 'Brand', 'P/N', 'Unit Price', 'Type', 'Qty'],
        ['Siemens PLC', 'Siemens', '6ES7512-1DK01-0AB0', '$2,500.00', 'PLC', 1],
        ['Banner Sensor', 'Banner', 'Q45BB6AF300', '$150.00', 'Sensor', 4],
      ];

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(mockData);

      const file = createMockFile('quote.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const result = await parseExcelFile(file);

      expect(result.success).toBe(true);
      expect(result.components).toHaveLength(2);
      expect(result.components[0].name).toBe('Siemens PLC');
      expect(result.components[0].manufacturer).toBe('Siemens');
      expect(result.components[0].manufacturerPN).toBe('6ES7512-1DK01-0AB0');
      expect(result.components[0].unitPriceUSD).toBe(2500);
      expect(result.components[0].quantity).toBe(1);
      expect(result.components[0].category).toBe('בקרים'); // Normalized to Hebrew
    });

    it('should handle Excel file with missing optional columns', async () => {
      const mockWorkbook = createMockExcelData();
      const mockData = [
        ['Name', 'Price'],
        ['Generic Component', '100'],
        ['Another Component', '200'],
      ];

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(mockData);

      const file = createMockFile('simple.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const result = await parseExcelFile(file);

      expect(result.success).toBe(true);
      expect(result.components).toHaveLength(2);
      expect(result.components[0].name).toBe('Generic Component');
      expect(result.components[0].unitPriceUSD).toBe(100);
      expect(result.components[0].manufacturer).toBeUndefined();
      expect(result.components[0].category).toBe('אחר'); // Default category
    });

    it('should handle empty Excel file', async () => {
      const mockWorkbook = createMockExcelData();
      const mockData: any[] = [];

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(mockData);

      const file = createMockFile('empty.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const result = await parseExcelFile(file);

      expect(result.success).toBe(true);
      expect(result.components).toHaveLength(0);
      expect(result.metadata.totalItems).toBe(0);
    });

    it('should reject unsupported file types', async () => {
      const file = createMockFile('document.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      const result = await parseExcelFile(file);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported file type');
      expect(result.components).toHaveLength(0);
    });

    it('should handle corrupted/invalid Excel file', async () => {
      vi.mocked(XLSX.read).mockImplementation(() => {
        throw new Error('Invalid file format');
      });

      const file = createMockFile('corrupted.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const result = await parseExcelFile(file);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to parse Excel file');
    });

    it('should handle workbook with no sheets', async () => {
      const mockWorkbook = {
        SheetNames: [],
        Sheets: {}
      };

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);

      const file = createMockFile('nosheet.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const result = await parseExcelFile(file);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No sheets found');
    });
  });

  describe('parseExcelFile - Language Support', () => {
    it('should handle Hebrew headers', async () => {
      const mockWorkbook = createMockExcelData();
      const mockData = [
        ['שם', 'יצרן', 'קטלוגי', 'מחיר', 'כמות'],
        ['PLC סימנס', 'Siemens', '6ES7512', '2500', '1'],
      ];

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(mockData);

      const file = createMockFile('hebrew.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const result = await parseExcelFile(file);

      expect(result.success).toBe(true);
      expect(result.components).toHaveLength(1);
      expect(result.components[0].name).toBe('PLC סימנס');
      expect(result.components[0].manufacturer).toBe('Siemens');
      expect(result.components[0].manufacturerPN).toBe('6ES7512');
    });

    it('should handle English headers', async () => {
      const mockWorkbook = createMockExcelData();
      const mockData = [
        ['Product Name', 'Manufacturer', 'Part Number', 'Unit Price', 'Quantity'],
        ['Siemens PLC', 'Siemens', '6ES7512', '2500', '2'],
      ];

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(mockData);

      const file = createMockFile('english.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const result = await parseExcelFile(file);

      expect(result.success).toBe(true);
      expect(result.components).toHaveLength(1);
      expect(result.components[0].name).toBe('Siemens PLC');
      expect(result.components[0].quantity).toBe(2);
    });

    it('should handle mixed language headers', async () => {
      const mockWorkbook = createMockExcelData();
      const mockData = [
        ['Product', 'יצרן', 'Part Number', 'מחיר', 'Qty'],
        ['Mixed Product', 'Test Mfr', 'ABC123', '1000', '5'],
      ];

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(mockData);

      const file = createMockFile('mixed.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const result = await parseExcelFile(file);

      expect(result.success).toBe(true);
      expect(result.components).toHaveLength(1);
      expect(result.components[0].name).toBe('Mixed Product');
      expect(result.components[0].manufacturer).toBe('Test Mfr');
      expect(result.components[0].quantity).toBe(5);
    });
  });

  describe('parseExcelFile - Price Parsing', () => {
    it('should parse USD price with dollar sign', async () => {
      const mockWorkbook = createMockExcelData();
      const mockData = [
        ['Name', 'Price'],
        ['Component 1', '$1,234.56'],
      ];

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(mockData);

      const file = createMockFile('usd.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const result = await parseExcelFile(file);

      expect(result.success).toBe(true);
      expect(result.components[0].unitPriceUSD).toBe(1234.56);
      expect(result.components[0].currency).toBe('USD');
    });

    it('should parse NIS price with shekel sign', async () => {
      const mockWorkbook = createMockExcelData();
      const mockData = [
        ['Name', 'Price'],
        ['Component 1', '₪5,000'],
      ];

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(mockData);

      const file = createMockFile('nis.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const result = await parseExcelFile(file);

      expect(result.success).toBe(true);
      expect(result.components[0].unitPriceNIS).toBe(5000);
      expect(result.components[0].currency).toBe('NIS');
    });

    it('should parse EUR price with euro sign', async () => {
      const mockWorkbook = createMockExcelData();
      const mockData = [
        ['Name', 'Price'],
        ['Component 1', '€1,234.56'], // US format (parser handles this format)
      ];

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(mockData);

      const file = createMockFile('eur.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const result = await parseExcelFile(file);

      expect(result.success).toBe(true);
      expect(result.components[0].unitPriceEUR).toBe(1234.56);
      expect(result.components[0].currency).toBe('EUR');
    });

    it('should parse price with various number formats', async () => {
      const mockWorkbook = createMockExcelData();
      const mockData = [
        ['Name', 'Price'],
        ['Item 1', '1234.56'],    // Plain number
        ['Item 2', '1,234.56'],   // Thousands separator
        ['Item 3', '1234'],       // No decimals
      ];

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(mockData);

      const file = createMockFile('numbers.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const result = await parseExcelFile(file);

      expect(result.success).toBe(true);
      expect(result.components[0].unitPriceUSD).toBe(1234.56);
      expect(result.components[1].unitPriceUSD).toBe(1234.56);
      expect(result.components[2].unitPriceUSD).toBe(1234);
    });

    it('should handle price with currency text', async () => {
      const mockWorkbook = createMockExcelData();
      const mockData = [
        ['Name', 'Price', 'Currency'],
        ['Item 1', '1000', 'USD'],
        ['Item 2', '2000', 'NIS'],
        ['Item 3', '3000', 'EUR'],
      ];

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(mockData);

      const file = createMockFile('currency.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const result = await parseExcelFile(file);

      expect(result.success).toBe(true);
      expect(result.components[0].unitPriceUSD).toBe(1000);
      expect(result.components[1].unitPriceNIS).toBe(2000);
      expect(result.components[2].unitPriceEUR).toBe(3000);
    });

    it('should default to USD when no currency detected', async () => {
      const mockWorkbook = createMockExcelData();
      const mockData = [
        ['Name', 'Price'],
        ['Component', '500'],
      ];

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(mockData);

      const file = createMockFile('default.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const result = await parseExcelFile(file);

      expect(result.success).toBe(true);
      expect(result.components[0].currency).toBe('USD');
      expect(result.components[0].unitPriceUSD).toBe(500);
    });
  });

  describe('parseExcelFile - Column Detection', () => {
    it('should detect columns with case-insensitive matching', async () => {
      const mockWorkbook = createMockExcelData();
      const mockData = [
        ['NAME', 'MANUFACTURER', 'PRICE'],
        ['Test Component', 'Test Mfr', '100'],
      ];

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(mockData);

      const file = createMockFile('uppercase.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const result = await parseExcelFile(file);

      expect(result.success).toBe(true);
      expect(result.components[0].name).toBe('Test Component');
      expect(result.components[0].manufacturer).toBe('Test Mfr');
    });

    it('should detect columns with extra whitespace', async () => {
      const mockWorkbook = createMockExcelData();
      const mockData = [
        ['  Name  ', ' Manufacturer ', ' Price '],
        ['Component', 'Mfr', '100'],
      ];

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(mockData);

      const file = createMockFile('whitespace.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const result = await parseExcelFile(file);

      expect(result.success).toBe(true);
      expect(result.components[0].name).toBe('Component');
    });

    it('should handle various column name variations', async () => {
      const mockWorkbook = createMockExcelData();
      const mockData = [
        ['Item Name', 'Mfr Part', 'Unit Cost', 'Qty'],
        ['Component', 'ABC123', '150', '2'],
      ];

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(mockData);

      const file = createMockFile('variations.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const result = await parseExcelFile(file);

      expect(result.success).toBe(true);
      expect(result.components[0].name).toBe('Component');
      expect(result.components[0].manufacturerPN).toBe('ABC123');
      expect(result.components[0].unitPriceUSD).toBe(150);
      expect(result.components[0].quantity).toBe(2);
    });
  });

  describe('parseExcelFile - Confidence Scoring', () => {
    it('should have high confidence when all fields present', async () => {
      const mockWorkbook = createMockExcelData();
      const mockData = [
        ['Name', 'Manufacturer', 'Part Number', 'Price', 'Category', 'Quantity', 'Description'],
        ['Complete Component', 'Siemens', 'ABC123', '1000', 'PLC', '1', 'Full description'],
      ];

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(mockData);

      const file = createMockFile('complete.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const result = await parseExcelFile(file);

      expect(result.success).toBe(true);
      expect(result.components[0].confidence).toBeGreaterThan(0.9);
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it('should have lower confidence with missing fields', async () => {
      const mockWorkbook = createMockExcelData();
      const mockData = [
        ['Name'],
        ['Basic Component'],
      ];

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(mockData);

      const file = createMockFile('basic.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const result = await parseExcelFile(file);

      expect(result.success).toBe(true);
      expect(result.components[0].confidence).toBeLessThan(0.5);
    });
  });

  describe('parseExcelFile - Metadata', () => {
    it('should include sheet name in metadata', async () => {
      const mockWorkbook = {
        SheetNames: ['Price List'],
        Sheets: { 'Price List': {} }
      };
      const mockData = [
        ['Name', 'Price'],
        ['Component', '100'],
      ];

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(mockData);

      const file = createMockFile('pricelist.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const result = await parseExcelFile(file);

      expect(result.success).toBe(true);
      expect(result.metadata.sheetName).toBe('Price List');
    });

    it('should report accurate row count', async () => {
      const mockWorkbook = createMockExcelData();
      const mockData = [
        ['Name', 'Price'],
        ['Item 1', '100'],
        ['Item 2', '200'],
        ['Item 3', '300'],
      ];

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(mockData);

      const file = createMockFile('multi.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const result = await parseExcelFile(file);

      expect(result.success).toBe(true);
      expect(result.metadata.rowCount).toBe(3); // Excluding header
      expect(result.metadata.totalItems).toBe(3);
    });

    it('should list detected columns in metadata', async () => {
      const mockWorkbook = createMockExcelData();
      const mockData = [
        ['Name', 'Manufacturer', 'Price'],
        ['Component', 'Mfr', '100'],
      ];

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(mockData);

      const file = createMockFile('columns.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const result = await parseExcelFile(file);

      expect(result.success).toBe(true);
      expect(result.metadata.columnHeaders).toContain('name');
      expect(result.metadata.columnHeaders).toContain('manufacturer');
      expect(result.metadata.columnHeaders).toContain('price');
    });
  });

  describe('parseExcelFile - Edge Cases', () => {
    it('should skip empty rows', async () => {
      const mockWorkbook = createMockExcelData();
      const mockData = [
        ['Name', 'Price'],
        ['Item 1', '100'],
        [null, null],  // Empty row
        ['', ''],      // Empty strings
        ['Item 2', '200'],
      ];

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(mockData);

      const file = createMockFile('gaps.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const result = await parseExcelFile(file);

      expect(result.success).toBe(true);
      expect(result.components).toHaveLength(2);
      expect(result.components[0].name).toBe('Item 1');
      expect(result.components[1].name).toBe('Item 2');
    });

    it('should handle rows with missing name by using first non-empty cell', async () => {
      const mockWorkbook = createMockExcelData();
      const mockData = [
        ['Column1', 'Column2', 'Price'],
        ['', 'Fallback Name', '100'],
      ];

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(mockData);

      const file = createMockFile('fallback.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const result = await parseExcelFile(file);

      expect(result.success).toBe(true);
      expect(result.components).toHaveLength(1);
      expect(result.components[0].name).toBe('Fallback Name');
    });

    it('should handle special characters in data', async () => {
      const mockWorkbook = createMockExcelData();
      const mockData = [
        ['Name', 'Part Number'],
        ['Component™', 'ABC-123/456.789'],
        ['עברית & English', 'UTF-8-PN'],
      ];

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(mockData);

      const file = createMockFile('special.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const result = await parseExcelFile(file);

      expect(result.success).toBe(true);
      expect(result.components).toHaveLength(2);
      expect(result.components[0].name).toBe('Component™');
      expect(result.components[0].manufacturerPN).toBe('ABC-123/456.789');
      expect(result.components[1].name).toBe('עברית & English');
    });

    it('should handle negative and zero prices correctly', async () => {
      const mockWorkbook = createMockExcelData();
      const mockData = [
        ['Name', 'Price'],
        ['Free Item', '0'],
        ['Discount Item', '-100'],
        ['Valid Item', '100'],
      ];

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(mockData);

      const file = createMockFile('prices.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const result = await parseExcelFile(file);

      expect(result.success).toBe(true);
      // Only valid item should have price (negative and zero should be null)
      expect(result.components.find(c => c.name === 'Free Item')?.unitPriceUSD).toBeUndefined();
      expect(result.components.find(c => c.name === 'Discount Item')?.unitPriceUSD).toBeUndefined();
      expect(result.components.find(c => c.name === 'Valid Item')?.unitPriceUSD).toBe(100);
    });

    it('should support CSV files', async () => {
      const mockWorkbook = createMockExcelData();
      const mockData = [
        ['Name', 'Price'],
        ['CSV Component', '100'],
      ];

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(mockData);

      const file = createMockFile('data.csv', 'text/csv');
      const result = await parseExcelFile(file);

      expect(result.success).toBe(true);
      expect(result.components).toHaveLength(1);
      expect(result.components[0].name).toBe('CSV Component');
    });
  });

  describe('parseExcelFile - Category Normalization', () => {
    it('should normalize PLC category', async () => {
      const mockWorkbook = createMockExcelData();
      const mockData = [
        ['Name', 'Category', 'Price'],
        ['Component 1', 'PLC', '100'],
        ['Component 2', 'controller', '200'],
      ];

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(mockData);

      const file = createMockFile('categories.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const result = await parseExcelFile(file);

      expect(result.success).toBe(true);
      expect(result.components[0].category).toBe('בקרים');
      expect(result.components[1].category).toBe('בקרים');
    });

    it('should normalize sensor category', async () => {
      const mockWorkbook = createMockExcelData();
      const mockData = [
        ['Name', 'Category', 'Price'],
        ['Sensor 1', 'sensor', '100'],
      ];

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(mockData);

      const file = createMockFile('sensors.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const result = await parseExcelFile(file);

      expect(result.success).toBe(true);
      expect(result.components[0].category).toBe('חיישנים');
    });

    it('should use default category for unknown types', async () => {
      const mockWorkbook = createMockExcelData();
      const mockData = [
        ['Name', 'Category', 'Price'],
        ['Unknown', 'xyz123', '100'],
      ];

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(mockData);

      const file = createMockFile('unknown.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const result = await parseExcelFile(file);

      expect(result.success).toBe(true);
      expect(result.components[0].category).toBe('אחר');
    });
  });
});
