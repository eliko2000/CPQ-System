/**
 * FloatingActionToolbar
 *
 * ClickUp-style floating toolbar that appears when grid rows are selected
 * Fixed bottom-center positioning with smooth animations
 */

import React, { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { X } from 'lucide-react';
import { GridAction } from '../../types/grid.types';
import { cn } from '../../lib/utils';

interface FloatingActionToolbarProps {
  selectedCount: number;
  actions: GridAction[];
  onClear: () => void;
  onAction: (action: GridAction) => void;
  className?: string;
}

export const FloatingActionToolbar: React.FC<FloatingActionToolbarProps> = ({
  selectedCount,
  actions,
  onClear,
  onAction,
  className,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  // Smooth fade-in animation when selection changes
  useEffect(() => {
    if (selectedCount > 0) {
      // Small delay for smooth appearance
      const timer = setTimeout(() => setIsVisible(true), 50);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [selectedCount]);

  // Don't render if no selection
  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
        'bg-white dark:bg-gray-800 rounded-xl shadow-2xl',
        'border border-gray-200 dark:border-gray-700',
        'transition-all duration-300 ease-out',
        isVisible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-4 pointer-events-none',
        className
      )}
      dir="rtl"
    >
      <div className="flex items-center gap-3 px-6 py-3">
        {/* Selection Count Badge */}
        <Badge
          variant="secondary"
          className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-3 py-1 text-sm font-semibold"
        >
          ✓ {selectedCount} נבחרו
        </Badge>

        {/* Divider */}
        <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {actions.map(action => {
            // Disable single-only actions when multiple rows selected
            const isDisabled = action.singleOnly && selectedCount > 1;

            return (
              <Button
                key={action.type}
                variant={action.variant || 'outline'}
                size="sm"
                onClick={() => onAction(action)}
                disabled={isDisabled}
                className={cn(
                  'h-9 px-4',
                  action.variant === 'destructive' &&
                    'hover:bg-red-600 hover:text-white'
                )}
                title={
                  isDisabled
                    ? 'פעולה זו זמינה רק עבור שורה בודדת'
                    : action.label
                }
              >
                {action.icon && <action.icon className="h-4 w-4 ml-2" />}
                {action.label}
              </Button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />

        {/* Clear Selection Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="h-9 px-3 hover:bg-gray-100 dark:hover:bg-gray-700"
          title="נקה בחירה"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
