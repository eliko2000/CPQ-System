import React from 'react';
import { FileSpreadsheet, FileText, Image, FileQuestion } from 'lucide-react';
import { PdfViewer } from './PdfViewer';
import { ImageViewer } from './ImageViewer';
import { ExcelViewer } from './ExcelViewer';

interface SourceFileViewerProps {
  file: File;
  onRequestFullscreen?: () => void;
  isFullscreen?: boolean;
}

type FileType = 'pdf' | 'image' | 'excel' | 'unknown';

function getFileType(file: File): FileType {
  const extension = file.name.split('.').pop()?.toLowerCase();
  const mimeType = file.type.toLowerCase();

  // Excel files
  if (
    extension === 'xlsx' ||
    extension === 'xls' ||
    extension === 'csv' ||
    mimeType.includes('spreadsheet') ||
    mimeType.includes('excel') ||
    mimeType === 'text/csv'
  ) {
    return 'excel';
  }

  // PDF files
  if (extension === 'pdf' || mimeType === 'application/pdf') {
    return 'pdf';
  }

  // Image files
  if (
    mimeType.startsWith('image/') ||
    ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(extension || '')
  ) {
    return 'image';
  }

  return 'unknown';
}

function getFileIcon(fileType: FileType) {
  switch (fileType) {
    case 'pdf':
      return <FileText className="h-12 w-12 text-red-500" />;
    case 'excel':
      return <FileSpreadsheet className="h-12 w-12 text-green-600" />;
    case 'image':
      return <Image className="h-12 w-12 text-blue-500" />;
    default:
      return <FileQuestion className="h-12 w-12 text-muted-foreground" />;
  }
}

export const SourceFileViewer: React.FC<SourceFileViewerProps> = ({
  file,
  onRequestFullscreen,
  isFullscreen,
}) => {
  const fileType = getFileType(file);

  switch (fileType) {
    case 'pdf':
      return (
        <PdfViewer
          file={file}
          onRequestFullscreen={onRequestFullscreen}
          isFullscreen={isFullscreen}
        />
      );
    case 'image':
      return (
        <ImageViewer
          file={file}
          onRequestFullscreen={onRequestFullscreen}
          isFullscreen={isFullscreen}
        />
      );
    case 'excel':
      return (
        <ExcelViewer
          file={file}
          onRequestFullscreen={onRequestFullscreen}
          isFullscreen={isFullscreen}
        />
      );
    default:
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
          {getFileIcon(fileType)}
          <div>
            <p className="text-lg font-medium">Preview not available</p>
            <p className="text-sm text-muted-foreground mt-1">
              File type "{file.type || 'unknown'}" is not supported for preview
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            {file.name} • {(file.size / 1024).toFixed(1)} KB
          </div>
        </div>
      );
  }
};

export { getFileType };
