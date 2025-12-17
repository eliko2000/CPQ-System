import React, { useState, useCallback } from 'react';
import {
  Upload,
  FileText,
  Image,
  FileSpreadsheet,
  Loader2,
  AlertCircle,
  CheckCircle,
  Sparkles,
  Zap,
  ChevronRight,
} from 'lucide-react';
import { Button } from '../ui/button';
import {
  type AIExtractionResult,
  extractColumnHeaders,
  extractComponentsFromDocument,
  type ColumnHeadersResult,
  type ColumnExtractionOptions,
} from '../../services/claudeAI';
import {
  parseDocument,
  getExtractionMethod,
  getExtractionMethodName,
  getEstimatedProcessingTime,
  type ExtractionMethod,
} from '../../services/documentParser';

export interface MSRPImportOptions {
  mode: 'none' | 'column' | 'discount';
  partnerDiscountPercent?: number;
  msrpCurrency?: 'USD' | 'NIS' | 'EUR';
}

interface IntelligentDocumentUploadProps {
  onExtractionComplete: (
    result: AIExtractionResult,
    file: File,
    msrpOptions: MSRPImportOptions
  ) => void;
  onCancel: () => void;
}

type UploadStatus =
  | 'idle'
  | 'extracting-headers'
  | 'column-selection'
  | 'analyzing'
  | 'completed'
  | 'error';

export const IntelligentDocumentUpload: React.FC<
  IntelligentDocumentUploadProps
> = ({ onExtractionComplete, onCancel }) => {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [extractionMethod, setExtractionMethod] =
    useState<ExtractionMethod>('unknown');

  // Document type selection
  const [documentType, setDocumentType] = useState<'quotation' | 'pricelist'>(
    'quotation'
  );

  // MSRP import options
  const [msrpImportMode, setMsrpImportMode] = useState<
    'none' | 'column' | 'discount'
  >('none');
  const [partnerDiscountPercent, setPartnerDiscountPercent] =
    useState<string>('');
  const [msrpCurrency, setMsrpCurrency] = useState<'USD' | 'NIS' | 'EUR'>(
    'USD'
  );

  // Column selection state (new multi-step flow)
  const [extractedHeaders, setExtractedHeaders] =
    useState<ColumnHeadersResult | null>(null);
  const [selectedPartnerColumn, setSelectedPartnerColumn] =
    useState<string>('');
  const [selectedMsrpColumn, setSelectedMsrpColumn] = useState<string>('');

  const acceptedTypes = [
    // Excel formats
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv', // .csv
    // PDF formats
    'application/pdf',
    // Image formats
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
  ];

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      const method = getExtractionMethod(droppedFile);
      if (method !== 'unknown') {
        setFile(droppedFile);
        setExtractionMethod(method);
        setError('');
      } else {
        setError(
          'סוג קובץ לא נתמך. פורמטים נתמכים: Excel (.xlsx, .xls, .csv), PDF, תמונות (JPEG, PNG, GIF, WebP)'
        );
      }
    }
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        const method = getExtractionMethod(selectedFile);
        setFile(selectedFile);
        setExtractionMethod(method);
        setError('');
      }
    },
    []
  );

  // Step 1: Extract column headers only
  const handleExtractHeaders = async () => {
    if (!file) return;

    try {
      setStatus('extracting-headers');
      setProgress(10);
      setError('');

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 80) {
            clearInterval(progressInterval);
            return 80;
          }
          return prev + 15;
        });
      }, 800);

      // Extract column headers (lightweight API call)
      const result = await extractColumnHeaders(file);

      clearInterval(progressInterval);
      setProgress(100);

      if (result.success) {
        setExtractedHeaders(result);
        setStatus('column-selection');
        setProgress(0);
      } else {
        setStatus('error');
        setError(result.error || 'Failed to extract column headers');
      }
    } catch (err) {
      setStatus('error');
      setError(
        err instanceof Error ? err.message : 'An unexpected error occurred'
      );
    }
  };

  // Step 2: Extract full components with selected columns
  const handleAnalyzeWithColumns = async () => {
    if (!file) return;

    try {
      setStatus('analyzing');
      setProgress(10);
      setError('');

      // Get estimated processing time for better UX
      const estimatedTime = getEstimatedProcessingTime(file);
      const progressSpeed = estimatedTime > 0 ? estimatedTime / 80 : 500;

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, progressSpeed);

      // Build column options if columns were selected
      const columnOptions: ColumnExtractionOptions | undefined =
        selectedPartnerColumn || selectedMsrpColumn
          ? {
              partnerPriceColumn: selectedPartnerColumn || undefined,
              msrpColumn: selectedMsrpColumn || undefined,
            }
          : undefined;

      // Extract components with column selection
      const result = await extractComponentsFromDocument(file, columnOptions);

      clearInterval(progressInterval);
      setProgress(100);

      if (result.success) {
        setStatus('completed');
        setTimeout(() => {
          // Prepare MSRP options
          const msrpOptions: MSRPImportOptions = {
            mode: msrpImportMode,
            partnerDiscountPercent:
              msrpImportMode === 'discount'
                ? parseFloat(partnerDiscountPercent)
                : undefined,
            msrpCurrency: msrpImportMode !== 'none' ? msrpCurrency : undefined,
          };
          onExtractionComplete(result, file, msrpOptions);
        }, 500);
      } else {
        setStatus('error');
        setError(result.error || 'Failed to extract data from document');
      }
    } catch (err) {
      setStatus('error');
      setError(
        err instanceof Error ? err.message : 'An unexpected error occurred'
      );
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (method: ExtractionMethod) => {
    switch (method) {
      case 'excel':
        return <FileSpreadsheet className="w-12 h-12 text-green-500" />;
      case 'pdf':
        return <FileText className="w-12 h-12 text-red-500" />;
      case 'ai':
        return <Image className="w-12 h-12 text-blue-500" />;
      default:
        return <FileText className="w-12 h-12 text-gray-500" />;
    }
  };

  const getProcessingMessage = (method: ExtractionMethod): string => {
    switch (method) {
      case 'excel':
        return 'מנתח קובץ Excel עם Claude AI... (8-15 שניות)';
      case 'pdf':
        return 'מנתח PDF עם Claude AI Vision...';
      case 'ai':
        return 'מנתח תמונה עם Claude AI Vision...';
      default:
        return 'מנתח מסמך...';
    }
  };

  const getProcessingTimeEstimate = (method: ExtractionMethod): string => {
    switch (method) {
      case 'excel':
        return 'זה עשוי לקחת 8-15 שניות - Claude AI מנתח את המבנה והנתונים';
      case 'pdf':
        return 'זה עשוי לקחת 10-20 שניות - Claude AI Vision מנתח את המסמך';
      case 'ai':
        return 'זה עשוי לקחת 8-15 שניות בהתאם למורכבות התמונה';
      default:
        return 'זה עשוי לקחת מספר שניות';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles className="w-6 h-6 text-purple-500" />
        <div>
          <h2 className="text-xl font-semibold">ייבוא מסמכים חכם</h2>
          <p className="text-sm text-muted-foreground">
            העלה Excel, PDF, או תמונה של הצעת מחיר/מחירון לחילוץ אוטומטי של
            רכיבים
          </p>
        </div>
      </div>

      {/* Upload Area */}
      {!file && status === 'idle' && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-12 text-center transition-colors
            ${isDragging ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary/50'}
          `}
        >
          <Upload
            className={`w-16 h-16 mx-auto mb-4 ${isDragging ? 'text-primary' : 'text-gray-400'}`}
          />
          <h3 className="text-lg font-medium mb-2">גרור ושחרר את הקובץ כאן</h3>
          <p className="text-sm text-muted-foreground mb-4">
            או לחץ לבחירת קובץ - Excel, PDF, או תמונה
          </p>
          <input
            type="file"
            id="file-upload"
            className="hidden"
            accept={acceptedTypes.join(',')}
            onChange={handleFileSelect}
          />
          <label htmlFor="file-upload">
            <Button variant="outline" className="cursor-pointer" asChild>
              <span>בחר קובץ</span>
            </Button>
          </label>
          <div className="mt-6 grid grid-cols-3 gap-4 text-xs text-center">
            <div className="space-y-1">
              <FileSpreadsheet className="w-8 h-8 mx-auto text-green-500" />
              <div className="font-medium">Excel/CSV</div>
              <div className="text-muted-foreground">Claude AI</div>
            </div>
            <div className="space-y-1">
              <FileText className="w-8 h-8 mx-auto text-red-500" />
              <div className="font-medium">PDF</div>
              <div className="text-muted-foreground">Claude AI Vision</div>
            </div>
            <div className="space-y-1">
              <Image className="w-8 h-8 mx-auto text-blue-500" />
              <div className="font-medium">תמונות</div>
              <div className="text-muted-foreground">Claude AI Vision</div>
            </div>
          </div>
        </div>
      )}

      {/* File Preview */}
      {file && status !== 'completed' && (
        <div className="border rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">{getFileIcon(extractionMethod)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium truncate">{file.name}</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1">
                  {extractionMethod === 'ai' && (
                    <Sparkles className="w-3 h-3" />
                  )}
                  {extractionMethod === 'excel' && <Zap className="w-3 h-3" />}
                  {getExtractionMethodName(extractionMethod, 'he')}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {formatFileSize(file.size)}
              </p>

              {status === 'analyzing' && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{getProcessingMessage(extractionMethod)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {getProcessingTimeEstimate(extractionMethod)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {status === 'idle' && (
            <div className="mt-6 space-y-3">
              {/* Show extraction method info */}
              <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
                <div className="font-medium text-blue-900 mb-1">
                  {extractionMethod === 'excel' && '🤖 ניתוח חכם עם Claude AI'}
                  {extractionMethod === 'pdf' &&
                    '🤖 ניתוח מבוסס Claude AI Vision'}
                  {extractionMethod === 'ai' &&
                    '🤖 ניתוח מבוסס Claude AI Vision'}
                </div>
                <div className="text-blue-700">
                  {extractionMethod === 'excel' &&
                    'קובץ Excel זה ינותח באמצעות Claude AI לחילוץ חכם ומדויק של רכיבים (משתמש ב-API credits)'}
                  {extractionMethod === 'pdf' &&
                    'PDF זה ינותח באמצעות Claude AI Vision למיצוי מיטבי (משתמש ב-API credits)'}
                  {extractionMethod === 'ai' &&
                    'תמונה זו תנותח באמצעות Claude AI Vision למיצוי מיטבי (משתמש ב-API credits)'}
                </div>
              </div>

              {/* Document Type Selection */}
              <div className="bg-gray-50 border border-gray-200 rounded p-4 space-y-3">
                <div className="font-medium text-gray-900 mb-2">
                  📋 סוג מסמך
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex items-center gap-3 p-3 border-2 rounded cursor-pointer transition-colors ${
                      documentType === 'quotation'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 bg-white hover:border-blue-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="documentType"
                      checked={documentType === 'quotation'}
                      onChange={() => {
                        setDocumentType('quotation');
                        setMsrpImportMode('none'); // Reset MSRP mode when switching to quotation
                      }}
                      className="mt-0"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">הצעת מחיר</div>
                      <div className="text-sm text-gray-600">
                        ייבוא רגיל של מחירי רכיבים
                      </div>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-3 p-3 border-2 rounded cursor-pointer transition-colors ${
                      documentType === 'pricelist'
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-300 bg-white hover:border-purple-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="documentType"
                      checked={documentType === 'pricelist'}
                      onChange={() => {
                        setDocumentType('pricelist');
                        setMsrpImportMode('column'); // Default to column mode for pricelist
                      }}
                      className="mt-0"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        מחירון מפיץ
                      </div>
                      <div className="text-sm text-gray-600">
                        עם MSRP והנחות שותפים
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* MSRP Import Options - Show ONLY when pricelist is selected */}
              {documentType === 'pricelist' &&
                (extractionMethod === 'ai' ||
                  extractionMethod === 'excel' ||
                  extractionMethod === 'pdf') && (
                  <div className="bg-purple-50 border border-purple-200 rounded p-4 space-y-3">
                    <div className="font-medium text-purple-900 mb-2">
                      📦 אפשרויות ייבוא MSRP (רכיבים מופצים)
                    </div>

                    {/* Option 1: File contains MSRP column */}
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="msrpMode"
                        checked={msrpImportMode === 'column'}
                        onChange={() => setMsrpImportMode('column')}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-purple-900">
                          הקובץ מכיל עמודת MSRP
                        </div>
                        <div className="text-sm text-purple-700">
                          הקובץ כולל גם מחיר שותף וגם מחיר MSRP בעמודות נפרדות
                        </div>
                      </div>
                    </label>

                    {/* Option 2: Apply partner discount */}
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="msrpMode"
                        checked={msrpImportMode === 'discount'}
                        onChange={() => setMsrpImportMode('discount')}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-purple-900">
                          החל הנחת שותף על מחירי MSRP
                        </div>
                        <div className="text-sm text-purple-700">
                          המחירים בקובץ הם MSRP, חשב מחיר שותף לפי אחוז הנחה
                        </div>
                        {msrpImportMode === 'discount' && (
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs text-purple-700 block mb-1">
                                אחוז הנחה (%)
                              </label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={partnerDiscountPercent}
                                onChange={e =>
                                  setPartnerDiscountPercent(e.target.value)
                                }
                                placeholder="34"
                                className="w-full px-2 py-1 border rounded text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-purple-700 block mb-1">
                                מטבע MSRP
                              </label>
                              <select
                                value={msrpCurrency}
                                onChange={e =>
                                  setMsrpCurrency(e.target.value as any)
                                }
                                className="w-full px-2 py-1 border rounded text-sm"
                              >
                                <option value="USD">USD ($)</option>
                                <option value="NIS">NIS (₪)</option>
                                <option value="EUR">EUR (€)</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                )}

              <div className="flex gap-2">
                <Button onClick={handleExtractHeaders} className="flex-1">
                  <ChevronRight className="w-4 h-4 mr-2" />
                  המשך לבחירת עמודות
                </Button>
                <Button variant="outline" onClick={() => setFile(null)}>
                  הסר
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Column Selection Step */}
      {status === 'column-selection' && extractedHeaders && (
        <div className="border rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-blue-500" />
            <div>
              <h3 className="text-lg font-semibold">בחר עמודות מחיר</h3>
              <p className="text-sm text-muted-foreground">
                זיהינו {extractedHeaders.columnHeaders.length} עמודות. בחר אילו
                עמודות להשתמש עבור מחירי שותף ו-MSRP.
              </p>
            </div>
          </div>

          {/* Show detected document metadata */}
          {extractedHeaders.metadata && (
            <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm space-y-1">
              {extractedHeaders.metadata.supplier && (
                <div>
                  <span className="font-medium">ספק:</span>{' '}
                  {extractedHeaders.metadata.supplier}
                </div>
              )}
              {extractedHeaders.metadata.quoteDate && (
                <div>
                  <span className="font-medium">תאריך:</span>{' '}
                  {extractedHeaders.metadata.quoteDate}
                </div>
              )}
              {extractedHeaders.metadata.currency && (
                <div>
                  <span className="font-medium">מטבע:</span>{' '}
                  {extractedHeaders.metadata.currency}
                </div>
              )}
            </div>
          )}

          {/* Partner Price Column Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">
              עמודת מחיר שותף (העלות שלך)
            </label>
            <select
              value={selectedPartnerColumn}
              onChange={e => setSelectedPartnerColumn(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="">בחר עמודה...</option>
              {extractedHeaders.columnHeaders
                .filter(
                  header =>
                    header.toLowerCase().includes('price') ||
                    header.toLowerCase().includes('cost') ||
                    header.toLowerCase().includes('unit') ||
                    header.toLowerCase().includes('מחיר')
                )
                .map((header, idx) => (
                  <option key={idx} value={header}>
                    {header}
                  </option>
                ))}
            </select>
            <p className="text-xs text-muted-foreground">
              זה המחיר שתשלם לספק (מחיר שותף/מפיץ)
            </p>
          </div>

          {/* MSRP Column Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">
              עמודת MSRP (מחיר קטלוגי - אופציונלי)
            </label>
            <select
              value={selectedMsrpColumn}
              onChange={e => setSelectedMsrpColumn(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="">אין MSRP / דלג</option>
              {extractedHeaders.columnHeaders
                .filter(
                  header =>
                    header.toLowerCase().includes('msrp') ||
                    header.toLowerCase().includes('list') ||
                    header.toLowerCase().includes('retail') ||
                    header.toLowerCase().includes('קטלוגי') ||
                    header.toLowerCase().includes('מחירון')
                )
                .map((header, idx) => (
                  <option key={idx} value={header}>
                    {header}
                  </option>
                ))}
            </select>
            <p className="text-xs text-muted-foreground">
              מחיר מחירון ליצרן (אם קיים במסמך)
            </p>
          </div>

          {/* Show all columns for reference */}
          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              הצג את כל {extractedHeaders.columnHeaders.length} העמודות שזוהו
            </summary>
            <ul className="mt-2 space-y-1 text-xs max-h-40 overflow-y-auto bg-gray-50 p-3 rounded">
              {extractedHeaders.columnHeaders.map((header, idx) => (
                <li key={idx} className="font-mono">
                  • {header}
                </li>
              ))}
            </ul>
          </details>

          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleAnalyzeWithColumns}
              className="flex-1"
              disabled={!selectedPartnerColumn}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              חלץ רכיבים
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setStatus('idle');
                setExtractedHeaders(null);
                setSelectedPartnerColumn('');
                setSelectedMsrpColumn('');
              }}
            >
              חזור
            </Button>
          </div>

          {!selectedPartnerColumn && (
            <p className="text-sm text-amber-600">
              ⚠️ יש לבחור לפחות עמודת מחיר שותף
            </p>
          )}
        </div>
      )}

      {/* Extracting Headers Progress */}
      {status === 'extracting-headers' && (
        <div className="border rounded-lg p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              <div>
                <h3 className="font-semibold">מזהה עמודות...</h3>
                <p className="text-sm text-muted-foreground">
                  קריאה קלה ל-Claude AI לזיהוי עמודות (2-5 שניות)
                </p>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && status === 'error' && (
        <div className="border border-red-200 bg-red-50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-red-900">החילוץ נכשל</h4>
              <div className="text-sm text-red-700 mt-1 whitespace-pre-line">
                {error}
              </div>
              {error.includes('API key') || error.includes('Authentication') ? (
                <div className="mt-3 p-3 bg-white border border-red-300 rounded">
                  <p className="text-xs font-medium text-red-900 mb-2">
                    מדריך הגדרה מהיר:
                  </p>
                  <ol className="text-xs text-red-700 space-y-1 list-decimal list-inside">
                    <li>
                      בקר ב-
                      <a
                        href="https://console.anthropic.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline font-medium"
                      >
                        console.anthropic.com
                      </a>
                    </li>
                    <li>צור API key (מתחיל ב-"sk-ant-")</li>
                    <li>הוסף לקובץ .env.local</li>
                    <li>הפעל מחדש את השרת (npm run dev)</li>
                  </ol>
                  <p className="text-xs text-red-600 mt-2">
                    ראה{' '}
                    <code className="bg-red-100 px-1 py-0.5 rounded">
                      QUICK_START_AI_IMPORT.md
                    </code>{' '}
                    לפרטים
                  </p>
                </div>
              ) : null}
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button size="sm" onClick={() => setFile(null)} variant="outline">
              נסה קובץ אחר
            </Button>
            <Button size="sm" onClick={handleExtractHeaders} variant="outline">
              נסה שוב
            </Button>
          </div>
        </div>
      )}

      {/* Success Display */}
      {status === 'completed' && (
        <div className="border border-green-200 bg-green-50 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <h4 className="font-medium text-green-900">הניתוח הושלם!</h4>
              <p className="text-sm text-green-700">
                נתוני הרכיבים חולצו בהצלחה. מכין תצוגה מקדימה...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="ghost" onClick={onCancel}>
          ביטול
        </Button>
        {status === 'idle' && !file && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="w-4 h-4" />
            <span>מופעל על ידי Claude AI • תמיכה בכל הפורמטים</span>
          </div>
        )}
      </div>
    </div>
  );
};
