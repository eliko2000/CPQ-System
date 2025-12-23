import { useMemo, useRef, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ICellRendererParams } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Edit, Trash2 } from 'lucide-react';
import { LaborType } from '../../types/labor.types';
import { useTableConfig } from '../../hooks/useTableConfig';
import { useAppearancePreferences } from '../../hooks/useAppearancePreferences';
import { logger } from '@/lib/logger';

interface LaborTypeGridProps {
  laborTypes: LaborType[];
  onEdit: (laborType: LaborType) => void;
  onDelete: (id: string, name: string) => void;
}

export function LaborTypeGrid({
  laborTypes,
  onEdit,
  onDelete,
}: LaborTypeGridProps) {
  const { preferences } = useAppearancePreferences();
  const gridRef = useRef<AgGridReact>(null);

  // Use table configuration hook
  const { config, saveConfig, loading } = useTableConfig('labor_types', {
    columnOrder: [
      'actions',
      'name',
      'category',
      'laborSubtype',
      'type',
      'rate',
      'defaultDays',
      'description',
    ],
    columnWidths: {},
    visibleColumns: [
      'actions',
      'name',
      'category',
      'laborSubtype',
      'type',
      'rate',
      'defaultDays',
      'description',
    ],
    filterState: {},
  });

  // Get unique values for filtering
  const getUniqueValues = useCallback(
    (field: keyof LaborType): string[] => {
      const values = laborTypes
        .map(lt => String(lt[field] || ''))
        .filter(Boolean);
      return Array.from(new Set(values)).sort();
    },
    [laborTypes]
  );

  // Labor subtype labels (Hebrew)
  const getLaborSubtypeLabel = (subtype: string): string => {
    const labels: Record<string, string> = {
      engineering: 'תכנון',
      integration: 'אינטגרציה',
      development: 'פיתוח',
      testing: 'הרצה',
      commissioning: 'הטמעה',
      support_and_training: 'תמיכה והדרכה',
    };
    return labels[subtype] || subtype;
  };

  // Actions cell renderer
  const ActionsCellRenderer = (params: ICellRendererParams) => {
    const laborType = params.data as LaborType;

    return (
      <div className="flex items-center gap-2 h-full">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(laborType)}
          title="ערוך"
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDelete(laborType.id, laborType.name)}
          title="מחק"
        >
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </div>
    );
  };

  // Type cell renderer (Internal vs External)
  const TypeCellRenderer = (params: ICellRendererParams) => {
    const laborType = params.data as LaborType;

    if (laborType.isInternalLabor) {
      return (
        <Badge variant="default" className="flex items-center gap-1">
          <span className="text-base">🏢</span>
          <span>פנימי</span>
        </Badge>
      );
    } else {
      return (
        <Badge
          variant="secondary"
          className="flex items-center gap-1 bg-purple-100 text-purple-800"
        >
          <span className="text-base">👤</span>
          <span>חיצוני</span>
        </Badge>
      );
    }
  };

  // Rate cell renderer
  const RateCellRenderer = (params: ICellRendererParams) => {
    const laborType = params.data as LaborType;

    if (laborType.isInternalLabor) {
      return <span className="text-sm font-medium text-blue-600">גלובלי</span>;
    } else {
      return (
        <span className="font-semibold text-purple-600">
          ₪{(laborType.externalRate || 0).toLocaleString()}/יום
        </span>
      );
    }
  };

  // Column definitions - RTL order
  const columnDefs = useMemo(
    () => [
      {
        headerName: 'תיאור',
        field: 'description',
        sortable: true,
        filter: 'agTextColumnFilter',
        resizable: true,
        width: 200,
        cellClass: 'text-sm text-gray-600',
        filterParams: {
          buttons: ['reset'],
        },
      },
      {
        headerName: 'ימים ברירת מחדל',
        field: 'defaultDays',
        sortable: true,
        filter: 'agNumberColumnFilter',
        resizable: true,
        width: 140,
        type: 'numericColumn',
        cellClass: 'font-medium text-center',
        valueFormatter: (params: any) => {
          return params.value ? `${params.value} ימים` : '-';
        },
        filterParams: {
          buttons: ['reset'],
        },
      },
      {
        headerName: 'תעריף',
        field: 'rate',
        sortable: true,
        resizable: true,
        width: 150,
        cellRenderer: RateCellRenderer,
        comparator: (__valueA: any, __valueB: any, nodeA: any, nodeB: any) => {
          const laborTypeA = nodeA.data as LaborType;
          const laborTypeB = nodeB.data as LaborType;

          // Sort: internal labor first, then by external rate
          if (laborTypeA.isInternalLabor && !laborTypeB.isInternalLabor) {
            return -1; // Internal comes first
          }
          if (!laborTypeA.isInternalLabor && laborTypeB.isInternalLabor) {
            return 1; // Internal comes first
          }

          // Both same type - sort by external rate (internal labor rates are equal)
          const rateA = laborTypeA.externalRate || 0;
          const rateB = laborTypeB.externalRate || 0;
          return rateA - rateB;
        },
      },
      {
        headerName: 'סוג',
        field: 'type',
        sortable: true,
        filter: 'agSetColumnFilter',
        resizable: true,
        width: 120,
        cellRenderer: TypeCellRenderer,
        filterParams: {
          values: ['פנימי', 'חיצוני'],
          valueFormatter: (params: any) => params.value,
        },
        comparator: (__valueA: any, __valueB: any, nodeA: any, nodeB: any) => {
          const laborTypeA = nodeA.data as LaborType;
          const laborTypeB = nodeB.data as LaborType;
          return laborTypeA.isInternalLabor === laborTypeB.isInternalLabor
            ? 0
            : laborTypeA.isInternalLabor
              ? -1
              : 1;
        },
      },
      {
        headerName: 'תת-סוג',
        field: 'laborSubtype',
        sortable: true,
        filter: 'agSetColumnFilter',
        resizable: true,
        width: 120,
        valueFormatter: (params: any) => {
          return getLaborSubtypeLabel(params.value);
        },
        filterParams: {
          values: [
            'engineering',
            'integration',
            'development',
            'testing',
            'commissioning',
            'support_and_training',
          ],
          valueFormatter: (params: any) => getLaborSubtypeLabel(params.value),
        },
      },
      {
        headerName: 'שם',
        field: 'name',
        sortable: true,
        filter: 'agTextColumnFilter',
        resizable: true,
        width: 200,
        cellClass: 'font-semibold',
        filterParams: {
          buttons: ['reset'],
        },
      },
      {
        headerName: 'פעולות',
        field: 'actions',
        width: 120,
        pinned: (preferences?.gridDirection === 'rtl' ? 'right' : 'left') as
          | 'right'
          | 'left',
        lockPosition: true,
        cellRenderer: ActionsCellRenderer,
        suppressMovable: true,
        resizable: false,
        sortable: false,
        filter: false,
      },
    ],
    [getUniqueValues, preferences?.gridDirection]
  );

  // Handle column state change
  const handleColumnStateChange = useCallback(() => {
    if (!gridRef.current?.api) return;

    const columnState = gridRef.current.api.getColumnState();
    const columnOrder = columnState.map(col => col.colId);
    const columnWidths = columnState.reduce(
      (acc, col) => {
        if (col.width) {
          acc[col.colId] = col.width;
        }
        return acc;
      },
      {} as Record<string, number>
    );

    logger.debug('Labor Type Grid column state changed:', {
      columnOrder,
      columnWidths,
    });

    saveConfig({
      ...config,
      columnOrder,
      columnWidths,
    });
  }, [config, saveConfig]);

  // Default column configuration
  const defaultColDef = useMemo(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
      enableCellTextSelection: true,
    }),
    []
  );

  if (loading) {
    return <div className="p-4 text-center">טוען...</div>;
  }

  return (
    <div className="w-full h-full">
      <div
        className={`ag-theme-alpine ${preferences?.gridDirection === 'rtl' ? 'rtl-grid' : ''}`}
        style={{ height: '100%', width: '100%' }}
      >
        <AgGridReact
          ref={gridRef}
          rowData={laborTypes}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          rowSelection="single"
          animateRows={true}
          enableRtl={preferences?.gridDirection === 'rtl'}
          onColumnMoved={handleColumnStateChange}
          onColumnResized={handleColumnStateChange}
          onColumnVisible={handleColumnStateChange}
          pagination={true}
          paginationPageSize={20}
          domLayout="normal"
        />
      </div>
    </div>
  );
}
