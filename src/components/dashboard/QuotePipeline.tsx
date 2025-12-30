// Quote Pipeline Component - Shows quotation status breakdown with values

import { Card, CardContent } from '../ui/card';
import { FileText, Send, CheckCircle2, XCircle } from 'lucide-react';
import { STATUS_CONFIG } from './dashboardConfig';

interface PipelineData {
  draft: { count: number; value: number };
  sent: { count: number; value: number };
  won: { count: number; value: number };
  lost: { count: number; value: number };
}

interface QuotePipelineProps {
  data: PipelineData;
  isLoading?: boolean;
  onStatusClick?: (status: 'draft' | 'sent' | 'won' | 'lost') => void;
}

// Format currency for display
function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `₪${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `₪${(value / 1000).toFixed(0)}K`;
  }
  return `₪${value.toFixed(0)}`;
}

// Format count for display
function formatCount(count: number, status: string): string {
  const statusNames: Record<string, string> = {
    draft: 'טיוטות',
    sent: 'נשלחו ללקוח',
    won: 'זכו',
    lost: 'הפסידו',
  };
  return `${count} ${statusNames[status] || 'הצעות מחיר'}`;
}

export function QuotePipeline({
  data,
  isLoading,
  onStatusClick,
}: QuotePipelineProps) {
  const pipelineItems = [
    {
      status: 'draft' as const,
      icon: FileText,
      iconColor: 'text-gray-600',
      bgColor: 'bg-gray-50 hover:bg-gray-100',
      borderColor: 'border-gray-200',
    },
    {
      status: 'sent' as const,
      icon: Send,
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-50 hover:bg-blue-100',
      borderColor: 'border-blue-200',
    },
    {
      status: 'won' as const,
      icon: CheckCircle2,
      iconColor: 'text-green-600',
      bgColor: 'bg-green-50 hover:bg-green-100',
      borderColor: 'border-green-200',
    },
    {
      status: 'lost' as const,
      icon: XCircle,
      iconColor: 'text-red-600',
      bgColor: 'bg-red-50 hover:bg-red-100',
      borderColor: 'border-red-200',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {pipelineItems.map(item => {
        const statusData = data[item.status];
        const Icon = item.icon;
        const config = STATUS_CONFIG[item.status];

        return (
          <Card
            key={item.status}
            className={`${item.bgColor} ${item.borderColor} border cursor-pointer transition-all hover:shadow-md`}
            onClick={() => onStatusClick?.(item.status)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">
                  {config.label}
                </span>
                <Icon className={`h-5 w-5 ${item.iconColor}`} />
              </div>
              <div className="text-2xl font-bold mb-1">
                {formatCurrency(statusData.value)}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatCount(statusData.count, item.status)}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
