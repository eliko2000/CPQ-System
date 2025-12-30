// Continue Working Component - Shows most recent draft for quick access

import { Card, CardContent } from '../ui/card';
import { FileText, ArrowLeft, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import type { DbQuotation } from '../../types/quotation.types';
import { STATUS_CONFIG, PRIORITY_CONFIG } from './dashboardConfig';

interface ContinueWorkingProps {
  recentDraft: DbQuotation | null;
  isLoading?: boolean;
  onContinue?: (quotation: DbQuotation) => void;
}

// Format currency for display
function formatCurrency(value: number | null | undefined): string {
  if (!value) return '₪0';
  if (value >= 1000000) {
    return `₪${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `₪${Math.round(value / 1000)}K`;
  }
  return `₪${Math.round(value).toLocaleString()}`;
}

// Format relative time in Hebrew
function formatRelativeTime(timestamp: string): string {
  try {
    return formatDistanceToNow(new Date(timestamp), {
      addSuffix: true,
      locale: he,
    });
  } catch {
    return 'זמן לא ידוע';
  }
}

export function ContinueWorking({
  recentDraft,
  isLoading,
  onContinue,
}: ContinueWorkingProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-3"></div>
            <div className="h-6 bg-gray-200 rounded w-2/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!recentDraft) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="p-6 text-center">
          <div className="flex flex-col items-center gap-2">
            <FileText className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">אין טיוטות פעילות</p>
            <p className="text-sm text-muted-foreground">
              צור הצעת מחיר חדשה כדי להתחיל
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const statusConfig = STATUS_CONFIG[recentDraft.status] || STATUS_CONFIG.draft;
  const priorityConfig = recentDraft.priority
    ? PRIORITY_CONFIG[recentDraft.priority]
    : null;

  return (
    <Card
      className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 cursor-pointer hover:shadow-lg transition-all group"
      onClick={() => onContinue?.(recentDraft)}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">
                המשך לעבוד
              </span>
            </div>

            <h3 className="text-lg font-semibold mb-1 line-clamp-1">
              {recentDraft.customer_name}
              {recentDraft.project_name && (
                <span className="text-muted-foreground font-normal">
                  {' '}
                  - {recentDraft.project_name}
                </span>
              )}
            </h3>

            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mb-3">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatRelativeTime(recentDraft.updated_at)}
              </span>
              <span>•</span>
              <span
                className={`px-2 py-0.5 rounded text-xs ${statusConfig.color}`}
              >
                {statusConfig.label}
              </span>
              {priorityConfig && recentDraft.priority !== 'medium' && (
                <>
                  <span>•</span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs flex items-center gap-1 ${priorityConfig.color}`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${priorityConfig.dotColor}`}
                    ></span>
                    {priorityConfig.label}
                  </span>
                </>
              )}
              <span>•</span>
              <span className="font-medium text-foreground">
                {formatCurrency(recentDraft.total_price)}
              </span>
            </div>

            <div className="flex items-center gap-1 text-primary group-hover:gap-2 transition-all">
              <span className="text-sm font-medium">המשך עריכה</span>
              <ArrowLeft className="h-4 w-4" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
