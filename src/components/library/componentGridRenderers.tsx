import { ICellRendererParams } from 'ag-grid-community';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Edit, Trash2, Eye, Copy } from 'lucide-react';
import { Component } from '../../types';

// Action context interface
export interface ComponentActionContext {
  onEdit: (component: Component) => void;
  onDelete: (componentId: string, componentName: string) => void;
  onDuplicate?: (component: Component) => void;
  onView?: (component: Component) => void;
}

// Custom cell renderer for actions
export const ComponentActionsRenderer = (params: ICellRendererParams) => {
  const { onEdit, onDelete, onDuplicate, onView } =
    params.context as ComponentActionContext;

  if (!params.data) return null;

  return (
    <div className="flex gap-1 items-center justify-center">
      {onView && (
        <Button
          variant="outline"
          size="sm"
          onClick={e => {
            e.stopPropagation();
            onView(params.data);
          }}
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
          onClick={e => {
            e.stopPropagation();
            onDuplicate(params.data);
          }}
          className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800"
          title="שכפל"
        >
          <Copy className="h-3 w-3" />
        </Button>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={e => {
          e.stopPropagation();
          onEdit(params.data);
        }}
        className="h-8 w-8 p-0"
        title="ערוך"
      >
        <Edit className="h-3 w-3" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={e => {
          e.stopPropagation();
          onDelete(params.data.id, params.data.name);
        }}
        className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
        title="מחק"
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
};

// Custom cell renderer for category badge
export const CategoryRenderer = (params: ICellRendererParams) => {
  if (!params.value) return null;
  return (
    <Badge variant="secondary" className="text-xs">
      {params.value}
    </Badge>
  );
};

// Custom cell renderer for currency badge
export const CurrencyBadgeRenderer = (params: ICellRendererParams) => {
  if (!params.value) return null;
  return (
    <Badge variant="outline" className="text-xs">
      {params.value}
    </Badge>
  );
};
