/**
 * Document Converters for AI Import
 * Converts PDF and Excel files to formats Claude Vision API can process
 */

import * as pdfjsLib from 'pdfjs-dist';
import * as XLSX from 'xlsx';

// Configure PDF.js worker
// @ts-ignore - pdf.js types can be tricky
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Convert a PDF file to images (one per page)
 * Returns array of base64-encoded images
 */
export async function convertPdfToImages(file: File): Promise<{
  images: Array<{ data: string; mediaType: 'image/png'; pageNumber: number }>;
  totalPages: number;
}> {
  try {
    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Load PDF document
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPages = pdf.numPages;

    const images: Array<{ data: string; mediaType: 'image/png'; pageNumber: number }> = [];

    // Convert each page to image
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdf.getPage(pageNum);

      // Set scale for good quality (2 = 2x resolution)
      const scale = 2.0;
      const viewport = page.getViewport({ scale });

      // Create canvas
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('Failed to get canvas context');
      }

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // Render PDF page to canvas
      await page.render({
        canvasContext: context,
        viewport: viewport,
        canvas: canvas,
      }).promise;

      // Convert canvas to base64 PNG
      const imageData = canvas.toDataURL('image/png');
      const base64Data = imageData.split(',')[1]; // Remove "data:image/png;base64," prefix

      images.push({
        data: base64Data,
        mediaType: 'image/png',
        pageNumber: pageNum,
      });
    }

    return { images, totalPages };
  } catch (error) {
    console.error('PDF conversion error:', error);
    throw new Error(
      `Failed to convert PDF to images: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Convert Excel/CSV file to structured text that Claude can analyze
 * Returns formatted text representation of the spreadsheet
 */
export async function convertExcelToText(file: File): Promise<string> {
  try {
    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Parse workbook
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    // Process all sheets
    let fullText = '';

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];

      // Convert to JSON for structured data
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Add sheet header
      fullText += `\n\n=== Sheet: ${sheetName} ===\n\n`;

      // Convert to formatted table text
      if (Array.isArray(jsonData) && jsonData.length > 0) {
        // Format each row
        for (const row of jsonData) {
          if (Array.isArray(row)) {
            const formattedRow = row
              .map((cell) => {
                if (cell === null || cell === undefined) return '';
                return String(cell);
              })
              .join(' | ');
            fullText += formattedRow + '\n';
          }
        }
      } else {
        fullText += '(Empty sheet)\n';
      }
    }

    return fullText.trim();
  } catch (error) {
    console.error('Excel conversion error:', error);
    throw new Error(
      `Failed to convert Excel to text: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Convert Excel to HTML table for better structure preservation
 */
export async function convertExcelToHtml(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    let html = '<html><body>';

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];

      html += `<h2>Sheet: ${sheetName}</h2>`;
      html += XLSX.utils.sheet_to_html(worksheet);
    }

    html += '</body></html>';
    return html;
  } catch (error) {
    console.error('Excel to HTML conversion error:', error);
    throw new Error(
      `Failed to convert Excel to HTML: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Detect if file is a spreadsheet format
 */
export function isSpreadsheetFile(file: File): boolean {
  const spreadsheetTypes = [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.oasis.opendocument.spreadsheet',
    'text/csv',
  ];

  return spreadsheetTypes.includes(file.type) || file.name.match(/\.(xlsx?|csv|ods)$/i) !== null;
}

/**
 * Detect if file is a PDF
 */
export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

/**
 * Detect if file is an image
 */
export function isImageFile(file: File): boolean {
  const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  return imageTypes.includes(file.type);
}
