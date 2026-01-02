/**
 * BulkFieldEditor
 *
 * ClickUp-style bulk field editor with dropdown menu and popover editor.
 * Used in the floating action toolbar for bulk editing component fields.
 */

import { useState, useCallback, useRef } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface BulkFieldConfig {
  key: string;
  label: string;
  type: 'text' | 'select';
  options?: string[]; // For select type
  clearable?: boolean; // Show "נקה" checkbox (default: true)
}

export interface BulkFieldUpdate {
  field: string;
  value: string;
  clear: boolean;
}

interface BulkFieldEditorProps {
  fields: BulkFieldConfig[];
  onSave: (update: BulkFieldUpdate) => Promise<void>;
  disabled?: boolean;
}

export function BulkFieldEditor({
  fields,
  onSave,
  disabled,
}: BulkFieldEditorProps) {
  const [selectedField, setSelectedField] = useState<BulkFieldConfig | null>(
    null
  );
  const [value, setValue] = useState('');
  const [clear, setClear] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  const resetEditor = useCallback(() => {
    setValue('');
    setClear(false);
    setSelectedField(null);
    setShowEditor(false);
  }, []);

  const handleFieldSelect = useCallback((field: BulkFieldConfig) => {
    setSelectedField(field);
    setValue('');
    setClear(false);
    setShowEditor(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!selectedField) return;

    setIsSubmitting(true);
    try {
      await onSave({
        field: selectedField.key,
        value: value.trim(),
        clear,
      });
      resetEditor();
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedField, value, clear, onSave, resetEditor]);

  const handleCancel = useCallback(() => {
    resetEditor();
  }, [resetEditor]);

  const handleClearToggle = useCallback((checked: boolean) => {
    setClear(checked);
    if (checked) setValue('');
  }, []);

  const hasChanges = clear || value.trim().length > 0;

  return (
    <div className="relative">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || showEditor}
            className="h-9 px-4"
          >
            שדות
            <ChevronDown className="h-4 w-4 mr-2" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="min-w-[140px]">
          {fields.map(field => (
            <DropdownMenuItem
              key={field.key}
              onClick={() => handleFieldSelect(field)}
              className="cursor-pointer"
            >
              {field.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Editor Panel - appears next to the button when a field is selected */}
      {showEditor && selectedField && (
        <div
          ref={editorRef}
          className="absolute bottom-full mb-2 right-0 w-64 p-4 bg-popover border rounded-md shadow-lg z-50"
          dir="rtl"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">{selectedField.label}</span>
              {selectedField.clearable !== false && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="bulk-clear"
                    checked={clear}
                    onCheckedChange={checked => handleClearToggle(!!checked)}
                    disabled={isSubmitting}
                  />
                  <Label
                    htmlFor="bulk-clear"
                    className="text-xs text-muted-foreground cursor-pointer"
                  >
                    נקה
                  </Label>
                </div>
              )}
            </div>

            {selectedField.type === 'select' && selectedField.options ? (
              <Select
                value={value}
                onValueChange={setValue}
                disabled={clear || isSubmitting}
              >
                <SelectTrigger
                  className={cn('w-full', clear && 'opacity-50 bg-muted')}
                >
                  <SelectValue placeholder="בחר..." />
                </SelectTrigger>
                <SelectContent>
                  {selectedField.options.map(opt => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={value}
                onChange={e => setValue(e.target.value)}
                disabled={clear || isSubmitting}
                placeholder={
                  clear ? 'השדה יימחק' : `הזן ${selectedField.label}...`
                }
                className={cn(clear && 'opacity-50 bg-muted')}
                autoFocus
              />
            )}

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                ביטול
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!hasChanges || isSubmitting}
              >
                {isSubmitting ? 'שומר...' : 'שמור'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
