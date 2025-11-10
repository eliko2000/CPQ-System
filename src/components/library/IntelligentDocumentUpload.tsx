import React, { useState, useCallback } from 'react';
import { Upload, FileText, Image, FileSpreadsheet, Loader2, AlertCircle, CheckCircle, Sparkles, Zap } from 'lucide-react';
import { Button } from '../ui/button';
import { type AIExtractionResult } from '../../services/claudeAI';
import {
  parseDocument,
  getExtractionMethod,
  getExtractionMethodName,
  getEstimatedProcessingTime,
  type ExtractionMethod
} from '../../services/documentParser';

interface IntelligentDocumentUploadProps {
  onExtractionComplete: (result: AIExtractionResult) => void;
  onCancel: () => void;
}

type UploadStatus = 'idle' | 'uploading' | 'analyzing' | 'completed' | 'error';

export const IntelligentDocumentUpload: React.FC<IntelligentDocumentUploadProps> = ({
  onExtractionComplete,
  onCancel,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [extractionMethod, setExtractionMethod] = useState<ExtractionMethod>('unknown');

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
    'image/webp'
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
        setError('סוג קובץ לא נתמך. פורמטים נתמכים: Excel (.xlsx, .xls, .csv), PDF, תמונות (JPEG, PNG, GIF, WebP)');
      }
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const method = getExtractionMethod(selectedFile);
      setFile(selectedFile);
      setExtractionMethod(method);
      setError('');
    }
  }, []);

  const handleAnalyze = async () => {
    if (!file) return;

    try {
      setStatus('analyzing');
      setProgress(10);
      setError('');

      // Get estimated processing time for better UX
      const estimatedTime = getEstimatedProcessingTime(file);
      const progressSpeed = estimatedTime > 0 ? estimatedTime / 80 : 500; // Reach 90% in estimated time

      // Simulate progress updates based on file type
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, progressSpeed);

      // Use unified document parser (automatically routes to correct parser)
      const result = await parseDocument(file);

      clearInterval(progressInterval);
      setProgress(100);

      if (result.success) {
        setStatus('completed');
        setTimeout(() => {
          onExtractionComplete(result);
        }, 500);
      } else {
        setStatus('error');
        setError(result.error || 'Failed to extract data from document');
      }
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
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
            העלה Excel, PDF, או תמונה של הצעת מחיר/מחירון לחילוץ אוטומטי של רכיבים
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
          <Upload className={`w-16 h-16 mx-auto mb-4 ${isDragging ? 'text-primary' : 'text-gray-400'}`} />
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
            <div className="flex-shrink-0">
              {getFileIcon(extractionMethod)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium truncate">{file.name}</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1">
                  {extractionMethod === 'ai' && <Sparkles className="w-3 h-3" />}
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
                  {extractionMethod === 'pdf' && '🤖 ניתוח מבוסס Claude AI Vision'}
                  {extractionMethod === 'ai' && '🤖 ניתוח מבוסס Claude AI Vision'}
                </div>
                <div className="text-blue-700">
                  {extractionMethod === 'excel' && 'קובץ Excel זה ינותח באמצעות Claude AI לחילוץ חכם ומדויק של רכיבים (משתמש ב-API credits)'}
                  {extractionMethod === 'pdf' && 'PDF זה ינותח באמצעות Claude AI Vision למיצוי מיטבי (משתמש ב-API credits)'}
                  {extractionMethod === 'ai' && 'תמונה זו תנותח באמצעות Claude AI Vision למיצוי מיטבי (משתמש ב-API credits)'}
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleAnalyze} className="flex-1">
                  {extractionMethod === 'excel' && <Zap className="w-4 h-4 mr-2" />}
                  {extractionMethod === 'pdf' && <FileText className="w-4 h-4 mr-2" />}
                  {extractionMethod === 'ai' && <Sparkles className="w-4 h-4 mr-2" />}
                  נתח מסמך
                </Button>
                <Button variant="outline" onClick={() => setFile(null)}>
                  הסר
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && status === 'error' && (
        <div className="border border-red-200 bg-red-50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-red-900">החילוץ נכשל</h4>
              <div className="text-sm text-red-700 mt-1 whitespace-pre-line">{error}</div>
              {error.includes('API key') || error.includes('Authentication') ? (
                <div className="mt-3 p-3 bg-white border border-red-300 rounded">
                  <p className="text-xs font-medium text-red-900 mb-2">מדריך הגדרה מהיר:</p>
                  <ol className="text-xs text-red-700 space-y-1 list-decimal list-inside">
                    <li>בקר ב-<a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="underline font-medium">console.anthropic.com</a></li>
                    <li>צור API key (מתחיל ב-"sk-ant-")</li>
                    <li>הוסף לקובץ .env.local</li>
                    <li>הפעל מחדש את השרת (npm run dev)</li>
                  </ol>
                  <p className="text-xs text-red-600 mt-2">
                    ראה <code className="bg-red-100 px-1 py-0.5 rounded">QUICK_START_AI_IMPORT.md</code> לפרטים
                  </p>
                </div>
              ) : null}
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button size="sm" onClick={() => setFile(null)} variant="outline">
              נסה קובץ אחר
            </Button>
            <Button size="sm" onClick={handleAnalyze} variant="outline">
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
