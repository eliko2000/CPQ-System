import React, { useState, useEffect } from 'react';
import { Maximize2, Minimize2, Table, Eye, Loader2 } from 'lucide-react';
import { Button } from '../../ui/button';
import { Tabs, TabsList, TabsTrigger } from '../../ui/tabs';
import * as XLSX from 'xlsx';
import { supabase } from '@/supabaseClient';

interface ExcelViewerProps {
  file: File;
  onRequestFullscreen?: () => void;
  isFullscreen?: boolean;
}

interface SheetData {
  name: string;
  html: string;
  rowCount: number;
  colCount: number;
}

export const ExcelViewer: React.FC<ExcelViewerProps> = ({
  file,
  onRequestFullscreen,
  isFullscreen,
}) => {
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [viewMode, setViewMode] = useState<'table' | 'excel'>('table');
  const [officeViewerUrl, setOfficeViewerUrl] = useState<string>('');
  const [uploadingToViewer, setUploadingToViewer] = useState(false);

  useEffect(() => {
    const loadExcel = async () => {
      try {
        setLoading(true);
        setError('');

        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, {
          type: 'array',
          cellStyles: true,
          cellHTML: true,
        });

        const sheetsData: SheetData[] = workbook.SheetNames.map(sheetName => {
          const worksheet = workbook.Sheets[sheetName];

          // Convert to HTML with styling
          const html = XLSX.utils.sheet_to_html(worksheet, {
            id: `sheet-${sheetName}`,
            editable: false,
          });

          // Get row and column count
          const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
          const rowCount = range.e.r + 1;
          const colCount = range.e.c + 1;

          return {
            name: sheetName,
            html,
            rowCount,
            colCount,
          };
        });

        setSheets(sheetsData);
        setActiveSheet(0);
      } catch (err) {
        console.error('Error loading Excel:', err);
        setError('Failed to load Excel file. The file may be corrupted.');
      } finally {
        setLoading(false);
      }
    };

    loadExcel();
  }, [file]);

  const handleExcelViewMode = async () => {
    if (officeViewerUrl) {
      // Already uploaded, just switch view
      setViewMode('excel');
      return;
    }

    // Upload file to Supabase storage temporarily
    setUploadingToViewer(true);
    try {
      // Generate unique filename with timestamp
      const timestamp = Date.now();
      const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `temp-excel-previews/${timestamp}-${safeFileName}`;

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('temp-files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        setError('Failed to prepare Excel preview. Please use Table view.');
        setUploadingToViewer(false);
        return;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('temp-files')
        .getPublicUrl(filePath);

      if (!urlData.publicUrl) {
        setError('Failed to get preview URL. Please use Table view.');
        setUploadingToViewer(false);
        return;
      }

      // Create Office Online viewer URL
      const encodedUrl = encodeURIComponent(urlData.publicUrl);
      const viewerUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodedUrl}`;

      setOfficeViewerUrl(viewerUrl);
      setViewMode('excel');

      // Schedule cleanup after 1 hour
      setTimeout(
        async () => {
          try {
            await supabase.storage.from('temp-files').remove([filePath]);
          } catch (err) {
            console.error('Cleanup error:', err);
          }
        },
        60 * 60 * 1000
      );
    } catch (err) {
      console.error('Error preparing Excel view:', err);
      setError('Failed to prepare Excel preview. Please use Table view.');
    } finally {
      setUploadingToViewer(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Loading spreadsheet...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-destructive">
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const currentSheet = sheets[activeSheet];

  if (!currentSheet) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground">No data found in file</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b bg-muted/50 p-2 flex-shrink-0 pointer-events-auto">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="text-xs text-muted-foreground truncate">
            {file.name} • {(file.size / 1024).toFixed(1)} KB
          </div>
          <div className="w-px h-4 bg-border" />

          {/* View Mode Toggle */}
          <div className="flex gap-1">
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="h-7 px-2 text-xs"
              title="Table view"
            >
              <Table className="h-3 w-3 mr-1" />
              Table
            </Button>
            <Button
              variant={viewMode === 'excel' ? 'default' : 'ghost'}
              size="sm"
              onClick={handleExcelViewMode}
              disabled={uploadingToViewer}
              className="h-7 px-2 text-xs"
              title="Excel Online view (requires internet)"
            >
              {uploadingToViewer ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Eye className="h-3 w-3 mr-1" />
              )}
              Excel
            </Button>
          </div>
        </div>
        {onRequestFullscreen && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRequestFullscreen}
            title={isFullscreen ? 'יציאה ממסך מלא' : 'מסך מלא'}
            className="flex-shrink-0 pointer-events-auto"
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {/* Content */}
      {viewMode === 'excel' && officeViewerUrl ? (
        <div className="flex-1 overflow-hidden relative">
          <iframe
            src={officeViewerUrl}
            className="absolute inset-0 w-full h-full border-0"
            title={`Excel Online - ${file.name}`}
            style={{
              pointerEvents: 'auto',
            }}
          />
        </div>
      ) : (
        <>
          {/* Sheet Tabs for Table View */}
          {sheets.length > 1 && (
            <div className="border-b bg-muted/50 p-1 pointer-events-auto">
              <Tabs
                value={String(activeSheet)}
                onValueChange={v => setActiveSheet(Number(v))}
              >
                <TabsList className="h-7">
                  {sheets.map((sheet, idx) => (
                    <TabsTrigger
                      key={idx}
                      value={String(idx)}
                      className="text-xs px-2 h-5"
                    >
                      {sheet.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          )}

          {/* Table View */}
          <div className="flex-1 overflow-auto pointer-events-auto bg-white dark:bg-gray-900 p-4">
            <style>
              {`
                /* Excel-like styling for the table */
                #sheet-${currentSheet.name} {
                  border-collapse: collapse;
                  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
                  font-size: 11pt;
                  width: auto;
                  background: white;
                }

                #sheet-${currentSheet.name} td,
                #sheet-${currentSheet.name} th {
                  border: 1px solid #d0d0d0;
                  padding: 4px 8px;
                  min-width: 64px;
                  text-align: left;
                  vertical-align: bottom;
                  white-space: nowrap;
                  background: white;
                }

                #sheet-${currentSheet.name} th {
                  background: #f0f0f0;
                  font-weight: 600;
                  color: #333;
                }

                #sheet-${currentSheet.name} tr:hover td {
                  background: #f8f8f8;
                }

                /* Dark mode support */
                .dark #sheet-${currentSheet.name},
                .dark #sheet-${currentSheet.name} td,
                .dark #sheet-${currentSheet.name} th {
                  background: #1a1a1a;
                  color: #e0e0e0;
                  border-color: #404040;
                }

                .dark #sheet-${currentSheet.name} th {
                  background: #2a2a2a;
                  color: #e0e0e0;
                }

                .dark #sheet-${currentSheet.name} tr:hover td {
                  background: #252525;
                }
              `}
            </style>
            <div
              dangerouslySetInnerHTML={{ __html: currentSheet.html }}
              className="excel-content"
            />
          </div>

          {/* File info footer */}
          <div className="p-2 border-t bg-muted/50 text-xs text-muted-foreground flex justify-between flex-shrink-0 pointer-events-auto">
            <span>{currentSheet.name || 'Sheet'}</span>
            <span>
              {currentSheet.rowCount} rows × {currentSheet.colCount} columns
            </span>
          </div>
        </>
      )}
    </div>
  );
};
