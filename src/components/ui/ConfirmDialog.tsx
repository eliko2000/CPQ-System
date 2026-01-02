import { useState, useEffect } from 'react';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Input } from './input';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
  requireConfirmation?: boolean;
  confirmationText?: string;
  confirmationPlaceholder?: string;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'אישור',
  cancelText = 'ביטול',
  type = 'danger',
  onConfirm,
  onCancel,
  requireConfirmation = false,
  confirmationText = '',
  confirmationPlaceholder = 'הקלד כאן לאישור',
}: ConfirmDialogProps) {
  const [inputValue, setInputValue] = useState('');
  const [isConfirmEnabled, setIsConfirmEnabled] =
    useState(!requireConfirmation);

  // Reset input when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setInputValue('');
      setIsConfirmEnabled(!requireConfirmation);
    }
  }, [isOpen, requireConfirmation]);

  // Check if input matches confirmation text
  useEffect(() => {
    if (requireConfirmation && confirmationText) {
      setIsConfirmEnabled(inputValue === confirmationText);
    }
  }, [inputValue, requireConfirmation, confirmationText]);

  if (!isOpen) return null;

  const typeStyles = {
    danger: 'text-red-600 bg-red-50 border-red-200',
    warning: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    info: 'text-blue-600 bg-blue-50 border-blue-200',
  };

  const iconColors = {
    danger: 'text-red-600',
    warning: 'text-yellow-600',
    info: 'text-blue-600',
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 pointer-events-auto">
      <Card className={`w-full max-w-md border-2 ${typeStyles[type]}`}>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <AlertTriangle className={`h-12 w-12 ${iconColors[type]}`} />
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-center text-muted-foreground whitespace-pre-line">
            {message}
          </p>

          {requireConfirmation && confirmationText && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground text-center">
                הקלד <span className="font-bold">"{confirmationText}"</span>{' '}
                לאישור:
              </p>
              <Input
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                placeholder={confirmationPlaceholder}
                className="text-center"
                autoFocus
              />
            </div>
          )}

          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={onCancel} className="flex-1">
              {cancelText}
            </Button>
            <Button
              onClick={onConfirm}
              disabled={!isConfirmEnabled}
              className={`flex-1 ${
                type === 'danger'
                  ? 'bg-red-600 hover:bg-red-700 text-white disabled:bg-red-300'
                  : type === 'warning'
                    ? 'bg-yellow-600 hover:bg-yellow-700 text-white disabled:bg-yellow-300'
                    : 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-300'
              }`}
            >
              {confirmText}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
