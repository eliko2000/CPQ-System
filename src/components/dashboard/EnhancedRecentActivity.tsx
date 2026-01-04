// Enhanced Recent Activity Component
// Comprehensive activity log with filtering, search, and detailed change tracking

import { useState, useMemo } from 'react';
import { Card, CardContent } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Clock,
  Search,
  FileText,
  Package,
  FolderKanban,
  Plus,
  Edit,
  Trash,
  ArrowRight,
  Minus,
  Settings,
  Layers,
  Upload,
  Download,
  GitBranch,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Filter,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useActivityLog } from '../../hooks/useActivityLog';
import { useCPQ } from '../../contexts/CPQContext';
import type {
  EntityType,
  ActionType,
  FormattedActivity,
} from '../../types/activity.types';

interface EnhancedRecentActivityProps {
  initialLimit?: number;
  showFilters?: boolean;
}

// Icon mapping
const ICON_MAP: Record<string, React.ElementType> = {
  Plus,
  Edit,
  Trash,
  ArrowRight,
  Minus,
  Settings,
  Layers,
  Upload,
  Download,
  GitBranch,
  FileText,
};

export function EnhancedRecentActivity({
  initialLimit = 50,
  showFilters = true,
}: EnhancedRecentActivityProps) {
  const {
    setActiveView,
    setCurrentQuotation,
    setModal,
    components,
    quotations,
  } = useCPQ();

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState<EntityType | 'all'>(
    'all'
  );
  const [actionTypeFilter, setActionTypeFilter] = useState<ActionType | 'all'>(
    'all'
  );
  const [dateRangeFilter, setDateRangeFilter] = useState<
    'all' | 'today' | 'week' | 'month'
  >('all');
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  // Collapse/expand states
  const [isHidden, setIsHidden] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const MINIMAL_ITEMS = 5;

  // Build filters for the hook
  const filters = useMemo(() => {
    const filterObj: any = {};

    if (searchQuery) {
      filterObj.search = searchQuery;
    }

    if (entityTypeFilter !== 'all') {
      filterObj.entityType = entityTypeFilter;
    }

    if (actionTypeFilter !== 'all') {
      filterObj.actionType = actionTypeFilter;
    }

    // Date range filters
    if (dateRangeFilter !== 'all') {
      const now = new Date();
      if (dateRangeFilter === 'today') {
        const startOfDay = new Date(now.setHours(0, 0, 0, 0));
        filterObj.startDate = startOfDay;
      } else if (dateRangeFilter === 'week') {
        const weekAgo = new Date(now.setDate(now.getDate() - 7));
        filterObj.startDate = weekAgo;
      } else if (dateRangeFilter === 'month') {
        const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
        filterObj.startDate = monthAgo;
      }
    }

    return Object.keys(filterObj).length > 0 ? filterObj : undefined;
  }, [searchQuery, entityTypeFilter, actionTypeFilter, dateRangeFilter]);

  // Fetch activity logs
  const {
    logs,
    loading,
    hasMore: __hasMore,
    loadMore: __loadMore,
  } = useActivityLog({
    filters,
    initialLimit,
    autoRefresh: true, // Real-time updates
  });

  // Handle entity click - navigate to entity
  const handleEntityClick = (log: FormattedActivity) => {
    if (log.entity_type === 'quotation') {
      // Find quotation in the quotations list
      const quotation = quotations.find(q => q.id === log.entity_id);
      if (quotation) {
        setCurrentQuotation(quotation);
      }
      setActiveView('quotations');
    } else if (log.entity_type === 'component') {
      // Find component and open edit modal
      const component = components.find(c => c.id === log.entity_id);
      if (component) {
        // Navigate to library view first
        setActiveView('components');
        // Then set modal after a brief delay to ensure view is rendered
        setTimeout(() => {
          setModal({
            type: 'edit-component',
            data: component,
          });
        }, 100);
      } else {
        setActiveView('components');
      }
    } else if (log.entity_type === 'project') {
      // Navigate to projects view
      setActiveView('projects');
      // TODO: Set current project if available
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setEntityTypeFilter('all');
    setActionTypeFilter('all');
    setDateRangeFilter('all');
  };

  // Check if any filters are active
  const hasActiveFilters =
    searchQuery ||
    entityTypeFilter !== 'all' ||
    actionTypeFilter !== 'all' ||
    dateRangeFilter !== 'all';

  // Render change details
  const renderChangeDetails = (log: FormattedActivity) => {
    if (!log.change_details) return null;

    const details = log.change_details;

    return (
      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
        {/* Field changes */}
        {details.fields_changed &&
          details.fields_changed.length > 0 &&
          details.fields_changed.map((change, idx) => (
            <div key={idx}>
              • {change.label}: {formatValue(change.old)} ←{' '}
              <span className="font-medium text-foreground">
                {formatValue(change.new)}
              </span>
            </div>
          ))}

        {/* Items added */}
        {details.items_added && details.items_added.length > 0 && (
          <div>
            {details.items_added.map((item, idx) => (
              <div key={idx}>
                • {item.name}
                {item.quantity && ` (כמות: ${item.quantity})`}
              </div>
            ))}
          </div>
        )}

        {/* Items removed */}
        {details.items_removed && details.items_removed.length > 0 && (
          <div>
            {details.items_removed.map((item, idx) => (
              <div key={idx}>
                • {item.name}
                {item.quantity && ` (כמות: ${item.quantity})`}
              </div>
            ))}
          </div>
        )}

        {/* Bulk changes */}
        {details.bulk_changes && (
          <div>
            • {details.bulk_changes.description || details.bulk_changes.field}:{' '}
            "{formatValue(details.bulk_changes.value)}" (
            {details.bulk_changes.count} פריטים)
          </div>
        )}
      </div>
    );
  };

  // Render source file info
  const renderSourceInfo = (log: FormattedActivity) => {
    if (!log.source_file_name) return null;

    return (
      <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
        <Upload className="h-3 w-3" />
        <span>מקור: {log.source_file_name}</span>
        {log.source_metadata?.confidence && (
          <span className="text-xs text-muted-foreground">
            ({Math.round(log.source_metadata.confidence * 100)}% ביטחון)
          </span>
        )}
      </div>
    );
  };

  // Loading state
  if (loading && logs.length === 0) {
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

  // Hidden state - show only collapsed header
  if (isHidden) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">פעילות אחרונה</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsHidden(false)}
              className="h-8 px-3"
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (logs.length === 0) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="p-6 text-center">
          <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">אין פעילות אחרונה</p>
        </CardContent>
      </Card>
    );
  }

  // Determine which logs to display
  const displayedLogs = isExpanded ? logs : logs.slice(0, MINIMAL_ITEMS);
  const hasMoreLogs = logs.length > MINIMAL_ITEMS;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">פעילות אחרונה</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {logs.length} פעילויות
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsHidden(true)}
              className="h-8 px-2"
            >
              <EyeOff className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Compact Filters */}
        {showFilters && (
          <div className="space-y-2">
            {/* Search + Filter Toggle */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="חיפוש פעילויות..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pr-9 h-9 text-sm"
                />
              </div>
              <Button
                variant={filtersExpanded ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFiltersExpanded(!filtersExpanded)}
                className="h-9 px-3"
              >
                <Filter className="h-3.5 w-3.5" />
              </Button>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-9 px-3"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            {/* Expanded Filter Dropdowns */}
            {filtersExpanded && (
              <div className="grid grid-cols-3 gap-2">
                {/* Entity Type */}
                <Select
                  value={entityTypeFilter}
                  onValueChange={value =>
                    setEntityTypeFilter(value as EntityType | 'all')
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="ישות" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל הישויות</SelectItem>
                    <SelectItem value="quotation">הצעות מחיר</SelectItem>
                    <SelectItem value="component">רכיבים</SelectItem>
                    <SelectItem value="project">פרויקטים</SelectItem>
                  </SelectContent>
                </Select>

                {/* Action Type */}
                <Select
                  value={actionTypeFilter}
                  onValueChange={value =>
                    setActionTypeFilter(value as ActionType | 'all')
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="פעולה" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל הפעולות</SelectItem>
                    <SelectItem value="created">נוצר</SelectItem>
                    <SelectItem value="updated">עודכן</SelectItem>
                    <SelectItem value="deleted">נמחק</SelectItem>
                    <SelectItem value="status_changed">שינוי סטטוס</SelectItem>
                    <SelectItem value="items_added">פריטים נוספו</SelectItem>
                    <SelectItem value="items_removed">פריטים הוסרו</SelectItem>
                    <SelectItem value="parameters_changed">
                      שינוי פרמטרים
                    </SelectItem>
                    <SelectItem value="bulk_update">עדכון קבוצתי</SelectItem>
                    <SelectItem value="bulk_import">ייבוא קבוצתי</SelectItem>
                    <SelectItem value="imported">יובא</SelectItem>
                  </SelectContent>
                </Select>

                {/* Date Range */}
                <Select
                  value={dateRangeFilter}
                  onValueChange={value =>
                    setDateRangeFilter(
                      value as 'all' | 'today' | 'week' | 'month'
                    )
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="תאריך" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל הזמן</SelectItem>
                    <SelectItem value="today">היום</SelectItem>
                    <SelectItem value="week">שבוע אחרון</SelectItem>
                    <SelectItem value="month">חודש אחרון</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {/* Activity List */}
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {displayedLogs.map(log => {
            const IconComponent = ICON_MAP[log.actionIcon] || FileText;
            const EntityIcon =
              log.entity_type === 'quotation'
                ? FileText
                : log.entity_type === 'component'
                  ? Package
                  : FolderKanban;

            return (
              <div
                key={log.id}
                className="p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border"
              >
                <div className="flex items-start gap-3">
                  {/* User Avatar */}
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    {log.user_avatar_url && (
                      <AvatarImage
                        src={log.user_avatar_url}
                        alt={log.user_name || log.user_email || 'User'}
                      />
                    )}
                    <AvatarFallback
                      className={`${log.userAvatarColor} text-white text-xs font-medium`}
                    >
                      {log.userInitials}
                    </AvatarFallback>
                  </Avatar>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Main action line */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <IconComponent className={`h-4 w-4 ${log.actionColor}`} />
                      <span className="font-medium text-sm">
                        {log.change_summary}
                      </span>
                    </div>

                    {/* Metadata line */}
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                      <span>
                        {log.user_name || log.user_email?.split('@')[0]}
                      </span>
                      <span>•</span>
                      <span>{log.relativeTime}</span>
                      {log.entity_name && (
                        <>
                          <span>•</span>
                          <button
                            onClick={() => handleEntityClick(log)}
                            className="inline-flex items-center gap-1 hover:text-foreground hover:underline"
                          >
                            <EntityIcon className="h-3 w-3" />
                            <span>{log.entity_name}</span>
                            <ExternalLink className="h-3 w-3" />
                          </button>
                        </>
                      )}
                    </div>

                    {/* Change details */}
                    {renderChangeDetails(log)}

                    {/* Source file info */}
                    {renderSourceInfo(log)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Expand/Collapse button */}
        {hasMoreLogs && (
          <div className="text-center pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full mt-2"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4 ml-2" />
                  <span>הצג פחות</span>
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 ml-2" />
                  <span>הצג עוד ({logs.length - MINIMAL_ITEMS})</span>
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Helper to format values for display
function formatValue(value: any): string {
  if (value === null || value === undefined) return 'לא זמין';
  if (typeof value === 'boolean') return value ? 'כן' : 'לא';
  if (typeof value === 'number') {
    // Format numbers with appropriate precision
    if (value % 1 === 0) return value.toString();
    return value.toFixed(2);
  }
  return String(value);
}
