// Quick Actions Component - Common action buttons

import { Card, CardContent } from '../ui/card';
import { Plus, FileText, Package, Upload } from 'lucide-react';

interface QuickActionsProps {
  onNewQuote?: () => void;
  onAddComponent?: () => void;
  onUploadFile?: () => void;
  onNewProject?: () => void;
}

interface ActionButtonProps {
  icon: React.ElementType;
  label: string;
  description?: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
}

function ActionButton({
  icon: Icon,
  label,
  description,
  onClick,
  variant = 'secondary',
}: ActionButtonProps) {
  const variantStyles = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'bg-muted hover:bg-muted/80',
    ghost: 'hover:bg-muted',
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 p-4 rounded-lg transition-all ${variantStyles[variant]} w-full text-right`}
    >
      <div
        className={`p-2 rounded-lg ${
          variant === 'primary' ? 'bg-white/20' : 'bg-background'
        }`}
      >
        <Icon
          className={`h-5 w-5 ${
            variant === 'primary'
              ? 'text-primary-foreground'
              : 'text-muted-foreground'
          }`}
        />
      </div>
      <div className="flex-1">
        <p className="font-medium text-sm">{label}</p>
        {description && (
          <p
            className={`text-xs ${
              variant === 'primary'
                ? 'text-primary-foreground/70'
                : 'text-muted-foreground'
            }`}
          >
            {description}
          </p>
        )}
      </div>
    </button>
  );
}

export function QuickActions({
  onNewQuote,
  onAddComponent,
  onUploadFile,
  onNewProject,
}: QuickActionsProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="font-semibold text-foreground mb-3">פעולות מהירות</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <ActionButton
            icon={Plus}
            label="הצעת מחיר חדשה"
            description="צור הצעה ללקוח"
            onClick={onNewQuote}
            variant="primary"
          />

          <ActionButton
            icon={FileText}
            label="פרויקט חדש"
            description="צור פרויקט חדש"
            onClick={onNewProject}
          />

          <ActionButton
            icon={Package}
            label="הוסף רכיב"
            description="לספריית הרכיבים"
            onClick={onAddComponent}
          />

          <ActionButton
            icon={Upload}
            label="העלה קובץ"
            description="ייבוא מאקסל/PDF"
            onClick={onUploadFile}
          />
        </div>
      </CardContent>
    </Card>
  );
}
