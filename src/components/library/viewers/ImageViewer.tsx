import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCw, RefreshCw } from 'lucide-react';
import { Button } from '../../ui/button';

interface ImageViewerProps {
  file: File;
  onRequestFullscreen?: () => void;
  isFullscreen?: boolean;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
  file,
  isFullscreen,
}) => {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Reset state when switching modes
  useEffect(() => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  }, [isFullscreen]);

  // Use native wheel event listener on the container - MUST use passive: false
  // Re-attach when imageUrl changes to ensure ref is valid after image loads
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheelNative = (e: WheelEvent) => {
      // Always prevent default and stop propagation to prevent page scroll
      e.preventDefault();
      e.stopPropagation();

      // Update scale based on wheel direction
      if (e.deltaY < 0) {
        setScale(prev => Math.min(prev * 1.15, 5));
      } else {
        setScale(prev => Math.max(prev / 1.15, 0.25));
      }
    };

    // Listen on container with capture phase and passive: false to intercept scroll
    container.addEventListener('wheel', handleWheelNative, {
      passive: false,
      capture: true,
    });

    return () => {
      container.removeEventListener('wheel', handleWheelNative, {
        capture: true,
      });
    };
  }, [imageUrl]); // Re-attach when image URL changes

  const handleZoomIn = useCallback(() => {
    setScale(prev => Math.min(prev * 1.25, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale(prev => Math.max(prev / 1.25, 0.25));
  }, []);

  const handleRotate = useCallback(() => {
    setRotation(prev => (prev + 90) % 360);
  }, []);

  const handleReset = useCallback(() => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    },
    [position]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging) {
        e.preventDefault();
        setPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        });
      }
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  if (!imageUrl) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar - only zoom/rotate controls, NO fullscreen button here */}
      <div className="flex items-center justify-center p-2 border-b bg-muted/50 flex-shrink-0 gap-2">
        <Button variant="ghost" size="sm" onClick={handleZoomOut} title="הקטן">
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground min-w-[60px] text-center">
          {Math.round(scale * 100)}%
        </span>
        <Button variant="ghost" size="sm" onClick={handleZoomIn} title="הגדל">
          <ZoomIn className="h-4 w-4" />
        </Button>
        <div className="w-px h-4 bg-border mx-1" />
        <Button variant="ghost" size="sm" onClick={handleRotate} title="סובב">
          <RotateCw className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={handleReset} title="איפוס">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Image Container - pan with mouse drag, zoom with wheel */}
      <div
        ref={containerRef}
        className="flex-1 bg-muted/30 flex items-center justify-center relative"
        style={{
          touchAction: 'none',
          minHeight: '200px',
          cursor: isDragging ? 'grabbing' : 'grab',
          overflow: 'hidden',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <img
          src={imageUrl}
          alt={file.name}
          className="select-none"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            pointerEvents: 'none',
            maxWidth: scale <= 1 ? '100%' : 'none',
            maxHeight: scale <= 1 ? '100%' : 'none',
            objectFit: 'contain',
          }}
          draggable={false}
        />
      </div>

      {/* File info */}
      <div className="p-2 border-t bg-muted/50 text-xs text-muted-foreground flex-shrink-0 text-center">
        {file.name} • {(file.size / 1024).toFixed(1)} KB
      </div>
    </div>
  );
};
