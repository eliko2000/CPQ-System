// Recent Activity Component - Shows team's recent actions with user avatars

import { useMemo } from 'react';
import { Card, CardContent } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { FileText, Clock, Check, Send, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import {
  useQuotationActivity,
  QuotationActivity,
} from '../../hooks/useQuotationActivity';

interface ActivityItem {
  id: string;
  type: 'quotation' | 'component' | 'project';
  action: 'created' | 'updated' | 'status_changed';
  title: string;
  description?: string;
  status?: string;
  timestamp: string;
  userEmail?: string;
  userName?: string;
  userAvatar?: string;
}

interface RecentActivityProps {
  maxItems?: number;
}

// Get initials from email
function getInitialsFromEmail(email: string): string {
  if (!email) return '?';

  // Get the part before @ and extract initials
  const localPart = email.split('@')[0];
  if (!localPart) return '?';

  // If there's a dot or underscore, split by it
  const nameParts = localPart.split(/[._-]/);
  if (nameParts.length >= 2) {
    return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
  }

  // Otherwise, take first two characters
  return localPart.slice(0, 2).toUpperCase();
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

// Get action description
function getActionDescription(action: string, status?: string): string {
  if (action === 'created') return 'נוצרה';
  if (action === 'status_changed') {
    switch (status) {
      case 'sent':
        return 'נשלחה ללקוח';
      case 'accepted':
        return 'התקבלה';
      case 'rejected':
        return 'נדחתה';
      case 'expired':
        return 'פג תוקף';
      default:
        return 'עודכן הסטטוס';
    }
  }
  return 'עודכנה';
}

// Get icon for action type
function getActionIcon(action: string, status?: string) {
  // Quotation-specific icons based on action/status
  if (action === 'status_changed') {
    switch (status) {
      case 'sent':
        return Send;
      case 'accepted':
        return Check;
      case 'rejected':
        return X;
      default:
        return FileText;
    }
  }
  return FileText;
}

// Get status color
function getStatusColor(status?: string): string {
  switch (status) {
    case 'sent':
      return 'text-blue-600';
    case 'accepted':
      return 'text-green-600';
    case 'rejected':
      return 'text-red-600';
    case 'expired':
      return 'text-orange-600';
    default:
      return 'text-muted-foreground';
  }
}

// Generate a consistent color from email
function getAvatarColor(email: string): string {
  if (!email) return 'bg-gray-400';

  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-orange-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500',
    'bg-rose-500',
  ];

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = (hash << 5) - hash + email.charCodeAt(i);
    hash = hash & hash;
  }

  return colors[Math.abs(hash) % colors.length];
}

export function RecentActivity({ maxItems = 5 }: RecentActivityProps) {
  // Fetch activity data with user emails
  const { activities, loading } = useQuotationActivity(maxItems);

  // Transform activities to activity items
  const activityItems = useMemo<ActivityItem[]>(() => {
    return activities.map((q: QuotationActivity) => {
      // Determine if this is a create or update
      const createdAt = new Date(q.created_at).getTime();
      const updatedAt = new Date(q.updated_at).getTime();
      const isNewlyCreated = Math.abs(updatedAt - createdAt) < 60000; // Within 1 minute

      // Check if status was recently changed
      const statusChangedAt = q.status_changed_at
        ? new Date(q.status_changed_at).getTime()
        : 0;
      const isStatusChange =
        statusChangedAt && Math.abs(updatedAt - statusChangedAt) < 60000;

      let action: 'created' | 'updated' | 'status_changed' = 'updated';
      if (isNewlyCreated) action = 'created';
      else if (isStatusChange) action = 'status_changed';

      return {
        id: q.id,
        type: 'quotation' as const,
        action,
        title: q.project_name || q.customer_name || 'הצעת מחיר',
        description: q.customer_name,
        status: q.status,
        timestamp: q.updated_at,
        userEmail: q.updated_by_email,
        userName: q.updated_by_name,
        userAvatar: q.updated_by_avatar,
      };
    });
  }, [activities]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-foreground mb-4">פעילות אחרונה</h3>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activityItems.length === 0) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="p-6 text-center">
          <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">אין פעילות אחרונה</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="font-semibold text-foreground mb-4">פעילות אחרונה</h3>

        <div className="space-y-3">
          {activityItems.map(item => {
            const Icon = getActionIcon(item.action, item.status);
            const actionText = getActionDescription(item.action, item.status);
            const statusColor = getStatusColor(item.status);
            const initials = item.userName
              ? item.userName
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)
              : getInitialsFromEmail(item.userEmail || '');
            const avatarColor = getAvatarColor(
              item.userEmail || item.userName || ''
            );
            const displayName =
              item.userName ||
              (item.userEmail ? item.userEmail.split('@')[0] : null);

            return (
              <div
                key={item.id}
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                {/* User Avatar - shows photo or initials fallback */}
                <Avatar className="h-8 w-8">
                  {item.userAvatar && (
                    <AvatarImage
                      src={item.userAvatar}
                      alt={displayName || 'User'}
                    />
                  )}
                  <AvatarFallback
                    className={`${avatarColor} text-white text-xs font-medium`}
                  >
                    {initials}
                  </AvatarFallback>
                </Avatar>

                {/* Activity Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${statusColor}`} />
                    <span className="font-medium text-sm truncate">
                      {item.title}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <span className={statusColor}>{actionText}</span>
                    {displayName && <span> • {displayName}</span>}
                    {item.description && item.description !== item.title && (
                      <span> • {item.description}</span>
                    )}
                  </p>
                </div>

                {/* Timestamp */}
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatRelativeTime(item.timestamp)}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
