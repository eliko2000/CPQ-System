import React, { useState, useEffect } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '../../ui/button';

interface PdfViewerProps {
  file: File;
  onRequestFullscreen?: () => void;
  isFullscreen?: boolean;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  file,
  onRequestFullscreen,
  isFullscreen,
}) => {
  const [pdfUrl, setPdfUrl] = useState<string>('');

  useEffect(() => {
    // Create a URL for the PDF file
    const url = URL.createObjectURL(file);
    setPdfUrl(url);

    // Cleanup: revoke the URL when component unmounts
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  if (!pdfUrl) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading PDF...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b bg-muted/50 flex-shrink-0 pointer-events-auto">
        <div className="text-xs text-muted-foreground">
          {file.name} • {(file.size / 1024).toFixed(1)} KB
        </div>
        {onRequestFullscreen && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRequestFullscreen}
            title={isFullscreen ? 'יציאה ממסך מלא' : 'מסך מלא'}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {/* PDF Viewer - Using browser's native PDF viewer */}
      <div className="flex-1 overflow-hidden relative">
        <iframe
          src={pdfUrl}
          className="absolute inset-0 w-full h-full border-0"
          title={file.name}
          style={{
            pointerEvents: 'auto',
          }}
        />
      </div>
    </div>
  );
};
