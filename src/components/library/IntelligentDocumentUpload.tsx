import React, { useState, useCallback } from 'react';
import { Upload, FileText, Image, FileSpreadsheet, Loader2, AlertCircle, CheckCircle, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import { extractComponentsFromDocument, type AIExtractionResult } from '../../services/claudeAI';

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

  const acceptedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv'
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
    if (droppedFile && acceptedTypes.includes(droppedFile.type)) {
      setFile(droppedFile);
      setError('');
    } else {
      setError('Invalid file type. Please upload PDF, image, or spreadsheet files.');
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
    }
  }, []);

  const handleAnalyze = async () => {
    if (!file) return;

    try {
      setStatus('analyzing');
      setProgress(10);
      setError('');

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      // Call Claude AI to extract components
      const result = await extractComponentsFromDocument(file);

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

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="w-12 h-12 text-blue-500" />;
    if (fileType === 'application/pdf') return <FileText className="w-12 h-12 text-red-500" />;
    if (fileType.includes('spreadsheet') || fileType.includes('excel') || fileType === 'text/csv') {
      return <FileSpreadsheet className="w-12 h-12 text-green-500" />;
    }
    return <FileText className="w-12 h-12 text-gray-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles className="w-6 h-6 text-purple-500" />
        <div>
          <h2 className="text-xl font-semibold">ייבוא מסמכים חכם עם AI</h2>
          <p className="text-sm text-muted-foreground">
            העלה הצעת מחיר, מחירון או קטלוג ותן ל-AI לחלץ את נתוני הרכיבים
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
            או לחץ לבחירת קובץ
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
          <p className="text-xs text-muted-foreground mt-4">
            פורמטים נתמכים: JPEG, PNG, GIF, WebP (עד 10MB)
          </p>
        </div>
      )}

      {/* File Preview */}
      {file && status !== 'completed' && (
        <div className="border rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              {getFileIcon(file.type)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium truncate">{file.name}</h3>
              <p className="text-sm text-muted-foreground">
                {formatFileSize(file.size)} • {file.type}
              </p>

              {status === 'analyzing' && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>AI מנתח את המסמך שלך...</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    זה עשוי לקחת 5-15 שניות בהתאם למורכבות המסמך
                  </p>
                </div>
              )}
            </div>
          </div>

          {status === 'idle' && (
            <div className="mt-6 flex gap-2">
              <Button onClick={handleAnalyze} className="flex-1">
                <Sparkles className="w-4 h-4 mr-2" />
                נתח עם AI
              </Button>
              <Button variant="outline" onClick={() => setFile(null)}>
                הסר
              </Button>
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
            <span>מופעל על ידי Claude AI</span>
          </div>
        )}
      </div>
    </div>
  );
};
