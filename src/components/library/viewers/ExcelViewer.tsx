import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Tabs, TabsList, TabsTrigger } from '../../ui/tabs';

interface ExcelViewerProps {
  file: File;
  onRequestFullscreen?: () => void;
  isFullscreen?: boolean;
}

interface SheetData {
  name: string;
  data: (string | number | null)[][];
  headers: string[];
}

export const ExcelViewer: React.FC<ExcelViewerProps> = ({ file }) => {
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const loadExcel = async () => {
      try {
        setLoading(true);
        setError('');

        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });

        const sheetsData: SheetData[] = workbook.SheetNames.map(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json<(string | number | null)[]>(
            worksheet,
            { header: 1, defval: null }
          );

          // Get headers from first row
          const headers = (jsonData[0] || []).map((h, i) =>
            h ? String(h) : `Column ${i + 1}`
          );

          return {
            name: sheetName,
            data: jsonData.slice(1), // Skip header row
            headers,
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
      {/* Toolbar with sheet tabs */}
      <div className="flex items-center justify-between border-b bg-muted/50 p-1">
        {sheets.length > 1 ? (
          <Tabs
            value={String(activeSheet)}
            onValueChange={v => setActiveSheet(Number(v))}
          >
            <TabsList className="h-8">
              {sheets.map((sheet, idx) => (
                <TabsTrigger
                  key={idx}
                  value={String(idx)}
                  className="text-xs px-3 h-6"
                >
                  {sheet.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        ) : (
          <span className="text-sm text-muted-foreground px-2">
            {sheets[0]?.name || 'Sheet 1'}
          </span>
        )}
      </div>

      {/* Table container */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 bg-muted z-10">
            <tr>
              <th className="border border-border px-2 py-1 text-left font-medium bg-muted/80 text-muted-foreground w-10">
                #
              </th>
              {currentSheet.headers.map((header, idx) => (
                <th
                  key={idx}
                  className="border border-border px-2 py-1 text-left font-medium bg-muted/80 min-w-[100px] max-w-[300px] truncate"
                  title={header}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentSheet.data.slice(0, 200).map((row, rowIdx) => (
              <tr key={rowIdx} className="hover:bg-muted/30">
                <td className="border border-border px-2 py-1 text-muted-foreground text-xs">
                  {rowIdx + 1}
                </td>
                {currentSheet.headers.map((_, colIdx) => {
                  const cellValue = row[colIdx];
                  return (
                    <td
                      key={colIdx}
                      className="border border-border px-2 py-1 max-w-[300px] truncate"
                      title={cellValue != null ? String(cellValue) : ''}
                    >
                      {cellValue != null ? String(cellValue) : ''}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {currentSheet.data.length > 200 && (
          <div className="p-2 text-center text-sm text-muted-foreground bg-muted/50 border-t">
            Showing first 200 rows of {currentSheet.data.length} total
          </div>
        )}
      </div>

      {/* File info */}
      <div className="p-2 border-t bg-muted/50 text-xs text-muted-foreground flex justify-between">
        <span>
          {file.name} • {(file.size / 1024).toFixed(1)} KB
        </span>
        <span>
          {currentSheet.data.length} rows × {currentSheet.headers.length}{' '}
          columns
        </span>
      </div>
    </div>
  );
};
