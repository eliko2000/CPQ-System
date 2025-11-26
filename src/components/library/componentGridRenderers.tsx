import { ICellRendererParams } from 'ag-grid-community';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Edit, Trash2, Eye, Copy } from 'lucide-react';
import { Component } from '../../types';

// Custom cell renderer for component name
export const NameCellRenderer = (params: ICellRendererParams) => (
  <div className="py-1">
    <div className="font-medium">{params.value}</div>
  </div>
);

// Custom cell renderer for category badge
export const CategoryBadgeRenderer = (params: ICellRendererParams) => (
  <Badge variant="secondary" className="text-xs">
    {params.value}
  </Badge>
);

// Custom cell renderer for currency badge
export const CurrencyBadgeRenderer = (params: ICellRendererParams) => (
  <Badge variant="outline" className="text-xs">
    {params.value}
  </Badge>
);

// Action context interface
export interface ComponentActionsContext {
  onEdit: (component: Component) => void;
  onDelete: (componentId: string, componentName: string) => void;
  onDuplicate?: (component: Component) => void;
  onView?: (component: Component) => void;
}

// Custom cell renderer for actions
export const ActionsRenderer = (params: ICellRendererParams) => {
  const { onEdit, onDelete, onView, onDuplicate } =
    params.context as ComponentActionsContext;

  return (
    <div className="flex gap-1 items-center justify-center">
      {onView && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onView(params.data)}
          className="h-8 w-8 p-0"
          title="צפה"
        >
          <Eye className="h-3 w-3" />
        </Button>
      )}
      {onDuplicate && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDuplicate(params.data)}
          className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800"
          title="שכפל"
        >
          <Copy className="h-3 w-3" />
        </Button>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onEdit(params.data)}
        className="h-8 w-8 p-0"
        title="ערוך"
      >
        <Edit className="h-3 w-3" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onDelete(params.data.id, params.data.name)}
        className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
        title="מחק"
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
};
