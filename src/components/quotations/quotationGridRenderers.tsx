import React from 'react';
import { ICellRendererParams, ValueFormatterParams } from 'ag-grid-community';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Edit, Trash2, Copy, Plus } from 'lucide-react';
import { DbQuotation } from '../../types';

// Action context interface
export interface ActionContext {
  onEdit: (data: DbQuotation) => void;
  onDelete: (data: DbQuotation) => void;
  onDuplicate: (data: DbQuotation) => void;
  onNewVersion: (data: DbQuotation) => void;
}

// Custom cell renderer for status
export const StatusRenderer = (params: ICellRendererParams) => {
  const status = params.value;
  const statusConfig = {
    draft: { label: 'טיוטה', className: 'bg-gray-100 text-gray-800' },
    sent: { label: 'נשלחה', className: 'bg-blue-100 text-blue-800' },
    accepted: { label: 'התקבלה', className: 'bg-green-100 text-green-800' },
    rejected: { label: 'נדחתה', className: 'bg-red-100 text-red-800' },
    expired: { label: 'פגה תוקף', className: 'bg-orange-100 text-orange-800' },
  };

  const config =
    statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;

  return <Badge className={config.className}>{config.label}</Badge>;
};

// Custom cell renderer for currency
export const CurrencyRenderer = (params: ValueFormatterParams) => {
  const value = params.value;
  if (value == null) return '-';

  return (
    <span className="font-mono text-sm">
      ₪{value.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
    </span>
  );
};

// Custom cell renderer for actions
export const ActionsRenderer = (params: ICellRendererParams) => {
  const { onEdit, onDelete, onDuplicate, onNewVersion } =
    params.context as ActionContext;

  return (
    <div className="flex gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onEdit(params.data)}
        className="h-8 w-8 p-0"
        title="ערוך"
      >
        <Edit className="h-3 w-3" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onDuplicate(params.data)}
        className="h-8 w-8 p-0"
        title="שכפל"
      >
        <Copy className="h-3 w-3" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onNewVersion(params.data)}
        className="h-8 w-8 p-0"
        title="גרסה חדשה"
      >
        <Plus className="h-3 w-3" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onDelete(params.data)}
        className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
        title="מחק"
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
};
