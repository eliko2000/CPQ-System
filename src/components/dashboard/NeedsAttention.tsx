// Needs Attention Component - Shows alerts for items requiring action

import { Card, CardContent } from '../ui/card';
import {
  AlertTriangle,
  Clock,
  MessageSquare,
  CalendarClock,
  AlertCircle,
  ChevronLeft,
} from 'lucide-react';
import type { DbQuotation } from '../../types/quotation.types';

interface AttentionItem {
  type: 'stale' | 'expiring' | 'awaiting' | 'followup' | 'priority';
  count: number;
  quotations: DbQuotation[];
}

interface NeedsAttentionProps {
  staleDrafts: AttentionItem;
  expiringSoon: AttentionItem;
  awaitingResponse: AttentionItem;
  followUpDue?: AttentionItem;
  highPriority?: AttentionItem;
  isLoading?: boolean;
  onItemClick?: (type: string, quotations: DbQuotation[]) => void;
}

const attentionConfig = {
  stale: {
    icon: Clock,
    title: 'טיוטות ישנות',
    subtitle: 'יותר מ-7 ימים',
    bgColor: 'bg-amber-50 hover:bg-amber-100',
    borderColor: 'border-amber-200',
    iconColor: 'text-amber-600',
    countColor: 'text-amber-700',
  },
  expiring: {
    icon: AlertTriangle,
    title: 'פג תוקף בקרוב',
    subtitle: 'השבוע',
    bgColor: 'bg-orange-50 hover:bg-orange-100',
    borderColor: 'border-orange-200',
    iconColor: 'text-orange-600',
    countColor: 'text-orange-700',
  },
  awaiting: {
    icon: MessageSquare,
    title: 'ממתין לתגובה',
    subtitle: 'יותר מ-14 ימים',
    bgColor: 'bg-blue-50 hover:bg-blue-100',
    borderColor: 'border-blue-200',
    iconColor: 'text-blue-600',
    countColor: 'text-blue-700',
  },
  followup: {
    icon: CalendarClock,
    title: 'מעקב היום',
    subtitle: 'תזכורות פעילות',
    bgColor: 'bg-purple-50 hover:bg-purple-100',
    borderColor: 'border-purple-200',
    iconColor: 'text-purple-600',
    countColor: 'text-purple-700',
  },
  priority: {
    icon: AlertCircle,
    title: 'עדיפות גבוהה',
    subtitle: 'דורש טיפול מיידי',
    bgColor: 'bg-red-50 hover:bg-red-100',
    borderColor: 'border-red-200',
    iconColor: 'text-red-600',
    countColor: 'text-red-700',
  },
};

function AttentionCard({
  item,
  type,
  onClick,
}: {
  item: AttentionItem;
  type: keyof typeof attentionConfig;
  onClick?: () => void;
}) {
  const config = attentionConfig[type];
  const Icon = config.icon;

  // Don't render if no items
  if (item.count === 0) {
    return null;
  }

  return (
    <Card
      className={`${config.bgColor} ${config.borderColor} border cursor-pointer transition-all hover:shadow-md`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-white/50`}>
              <Icon className={`h-5 w-5 ${config.iconColor}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-2xl font-bold ${config.countColor}`}>
                  {item.count}
                </span>
              </div>
              <p className="text-sm font-medium text-foreground">
                {config.title}
              </p>
              <p className="text-xs text-muted-foreground">{config.subtitle}</p>
            </div>
          </div>
          <ChevronLeft className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}

export function NeedsAttention({
  staleDrafts,
  expiringSoon,
  awaitingResponse,
  followUpDue,
  highPriority,
  isLoading,
  onItemClick,
}: NeedsAttentionProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          דורש תשומת לב
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Check if there are any items needing attention
  const hasItems =
    staleDrafts.count > 0 ||
    expiringSoon.count > 0 ||
    awaitingResponse.count > 0 ||
    (followUpDue?.count || 0) > 0 ||
    (highPriority?.count || 0) > 0;

  if (!hasItems) {
    return (
      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-6 text-center">
          <div className="flex flex-col items-center gap-2">
            <div className="p-3 bg-green-100 rounded-full">
              <AlertTriangle className="h-6 w-6 text-green-600" />
            </div>
            <p className="font-medium text-green-700">הכל מסודר!</p>
            <p className="text-sm text-green-600">
              אין פריטים הדורשים תשומת לב כרגע
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-amber-500" />
        דורש תשומת לב
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <AttentionCard
          item={staleDrafts}
          type="stale"
          onClick={() => onItemClick?.('stale', staleDrafts.quotations)}
        />
        <AttentionCard
          item={expiringSoon}
          type="expiring"
          onClick={() => onItemClick?.('expiring', expiringSoon.quotations)}
        />
        <AttentionCard
          item={awaitingResponse}
          type="awaiting"
          onClick={() => onItemClick?.('awaiting', awaitingResponse.quotations)}
        />
        {followUpDue && followUpDue.count > 0 && (
          <AttentionCard
            item={followUpDue}
            type="followup"
            onClick={() => onItemClick?.('followup', followUpDue.quotations)}
          />
        )}
        {highPriority && highPriority.count > 0 && (
          <AttentionCard
            item={highPriority}
            type="priority"
            onClick={() => onItemClick?.('priority', highPriority.quotations)}
          />
        )}
      </div>
    </div>
  );
}
