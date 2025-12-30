import { ICellRendererParams, ValueFormatterParams } from 'ag-grid-community';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Edit, Trash2, Copy, Plus, AlertCircle } from 'lucide-react';
import { DbQuotation } from '../../types';
import type { QuotationPriority } from '../../types/quotation.types';

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

// Priority configuration
const priorityConfig: Record<
  QuotationPriority,
  { label: string; className: string; dotClass: string }
> = {
  low: {
    label: 'נמוך',
    className: 'bg-gray-100 text-gray-700',
    dotClass: 'bg-gray-400',
  },
  medium: {
    label: 'בינוני',
    className: 'bg-blue-100 text-blue-700',
    dotClass: 'bg-blue-400',
  },
  high: {
    label: 'גבוה',
    className: 'bg-orange-100 text-orange-700',
    dotClass: 'bg-orange-400',
  },
  urgent: {
    label: 'דחוף',
    className: 'bg-red-100 text-red-700',
    dotClass: 'bg-red-500',
  },
};

// Custom cell renderer for priority
export const PriorityRenderer = (params: ICellRendererParams) => {
  const priority = (params.value as QuotationPriority) || 'medium';
  const config = priorityConfig[priority] || priorityConfig.medium;

  return (
    <Badge className={`${config.className} flex items-center gap-1`}>
      <span className={`w-2 h-2 rounded-full ${config.dotClass}`}></span>
      {config.label}
    </Badge>
  );
};

// Custom cell renderer for follow-up date with urgency indicator
export const FollowUpDateRenderer = (params: ICellRendererParams) => {
  if (!params.value) return <span className="text-muted-foreground">-</span>;

  const followUpDate = new Date(params.value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  followUpDate.setHours(0, 0, 0, 0);

  const isOverdue = followUpDate < today;
  const isToday = followUpDate.getTime() === today.getTime();

  const formattedDate = followUpDate.toLocaleDateString('he-IL');

  if (isOverdue) {
    return (
      <span className="text-red-600 font-medium flex items-center gap-1">
        <AlertCircle className="h-3 w-3" />
        {formattedDate}
      </span>
    );
  }

  if (isToday) {
    return <span className="text-orange-600 font-medium">היום</span>;
  }

  return <span>{formattedDate}</span>;
};

// Export priority options for cell editor
export const QUOTATION_PRIORITY_OPTIONS = [
  { value: 'low', label: 'נמוך' },
  { value: 'medium', label: 'בינוני' },
  { value: 'high', label: 'גבוה' },
  { value: 'urgent', label: 'דחוף' },
];
