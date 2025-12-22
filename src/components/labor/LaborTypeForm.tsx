import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { useLaborTypes } from '../../hooks/useLaborTypes';
import { LaborType, LaborTypeFormData } from '../../types/labor.types';
import { LaborSubtype } from '../../types/common.types';

interface LaborTypeFormProps {
  laborType?: LaborType | null;
  isOpen: boolean;
  onClose: () => void;
}

export function LaborTypeForm({
  laborType,
  isOpen,
  onClose,
}: LaborTypeFormProps) {
  const { addLaborType, updateLaborType } = useLaborTypes();
  const { handleError, handleWarning, handleSuccess } = useErrorHandler();

  const [formData, setFormData] = useState<LaborTypeFormData>({
    name: '',
    laborSubtype: 'engineering',
    isInternalLabor: true,
    externalRate: undefined,
    description: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const modalRef = useClickOutside<HTMLDivElement>(() => handleClose());

  // Populate form when editing existing labor type
  useEffect(() => {
    if (laborType) {
      setFormData({
        name: laborType.name,
        laborSubtype: laborType.laborSubtype,
        isInternalLabor: laborType.isInternalLabor,
        externalRate: laborType.externalRate,
        description: laborType.description || '',
      });
    } else {
      // Reset form for new labor type
      setFormData({
        name: '',
        laborSubtype: 'engineering',
        isInternalLabor: true,
        externalRate: undefined,
        description: '',
      });
    }
  }, [laborType, isOpen]);

  const handleInputChange = (field: keyof LaborTypeFormData, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };

      // Clear external rate when switching to internal labor
      if (field === 'isInternalLabor' && value === true) {
        updated.externalRate = undefined;
      }

      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      handleWarning('שדה חסר', 'נא להזין שם לסוג העבודה');
      return;
    }

    // Validate external labor has a rate
    if (!formData.isInternalLabor && !formData.externalRate) {
      handleWarning('שדה חסר', 'עבודה חיצונית חייבת להכיל תעריף יומי');
      return;
    }

    setIsSubmitting(true);

    try {
      if (laborType) {
        // Update existing labor type
        await updateLaborType(laborType.id, formData);
        handleSuccess('סוג העבודה עודכן בהצלחה');
      } else {
        // Add new labor type
        await addLaborType(formData);
        handleSuccess('סוג העבודה נוסף בהצלחה');
      }
      onClose();
    } catch (error) {
      handleError(error, {
        toastMessage: 'שגיאה בשמירת סוג עבודה',
        context: { laborTypeName: formData.name },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card
        ref={modalRef}
        className="w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        <CardHeader className="flex-shrink-0">
          <CardTitle>
            {laborType ? 'עריכת סוג עבודה' : 'הוספת סוג עבודה חדש'}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-4 pb-4">
            {/* Basic Information */}
            <div className="space-y-3">
              <div className="border-b pb-2">
                <h3 className="text-lg font-semibold text-blue-600">
                  מידע בסיסי
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="name" className="text-sm font-medium">
                    שם סוג העבודה *
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={e => handleInputChange('name', e.target.value)}
                    placeholder="לדוגמה: מהנדס תוכנה בכיר"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="laborSubtype" className="text-sm font-medium">
                    תת-סוג עבודה *
                  </Label>
                  <Select
                    value={formData.laborSubtype}
                    onValueChange={(value: LaborSubtype) =>
                      handleInputChange('laborSubtype', value)
                    }
                  >
                    <SelectTrigger id="laborSubtype">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="engineering">
                        תכנון (Engineering)
                      </SelectItem>
                      <SelectItem value="integration">
                        אינטגרציה (Integration)
                      </SelectItem>
                      <SelectItem value="development">
                        פיתוח (Development)
                      </SelectItem>
                      <SelectItem value="testing">הרצה (Testing)</SelectItem>
                      <SelectItem value="commissioning">
                        הטמעה (Commissioning)
                      </SelectItem>
                      <SelectItem value="support_and_training">
                        תמיכה והדרכה (Support & Training)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description" className="text-sm font-medium">
                  תיאור
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={e =>
                    handleInputChange('description', e.target.value)
                  }
                  placeholder="תיאור אופציונלי..."
                  className="min-h-[80px]"
                />
              </div>
            </div>

            {/* Pricing Type */}
            <div className="space-y-3">
              <div className="border-b pb-2">
                <h3 className="text-lg font-semibold text-blue-600">תמחור</h3>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">סוג העבודה *</Label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Internal Labor Option */}
                  <div
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      formData.isInternalLabor
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-blue-300'
                    }`}
                    onClick={e => {
                      e.stopPropagation();
                      handleInputChange('isInternalLabor', true);
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="radio"
                        id="internal"
                        name="laborType"
                        checked={formData.isInternalLabor}
                        onChange={() =>
                          handleInputChange('isInternalLabor', true)
                        }
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <label
                          htmlFor="internal"
                          className="font-semibold cursor-pointer flex items-center gap-2"
                        >
                          <span className="text-xl">🏢</span>
                          עבודה פנימית (צוות)
                        </label>
                        <p className="text-sm text-gray-600 mt-1">
                          משתמש בתעריף היומי מההצעת מחיר (נקבע בהגדרות)
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* External Labor Option */}
                  <div
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      !formData.isInternalLabor
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-300 hover:border-purple-300'
                    }`}
                    onClick={e => {
                      e.stopPropagation();
                      handleInputChange('isInternalLabor', false);
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="radio"
                        id="external"
                        name="laborType"
                        checked={!formData.isInternalLabor}
                        onChange={() =>
                          handleInputChange('isInternalLabor', false)
                        }
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <label
                          htmlFor="external"
                          className="font-semibold cursor-pointer flex items-center gap-2"
                        >
                          <span className="text-xl">👤</span>
                          עבודה חיצונית (קבלן)
                        </label>
                        <p className="text-sm text-gray-600 mt-1">
                          תעריף קבוע ייעודי לקבלן/מומחה חיצוני
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* External Rate Input (conditional) */}
                {!formData.isInternalLabor && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <Label
                      htmlFor="externalRate"
                      className="text-sm font-medium"
                    >
                      תעריף יומי לעבודה חיצונית (₪) *
                    </Label>
                    <Input
                      id="externalRate"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.externalRate || ''}
                      onChange={e =>
                        handleInputChange(
                          'externalRate',
                          parseFloat(e.target.value) || undefined
                        )
                      }
                      placeholder="לדוגמה: 2500"
                      required
                      className="mt-2"
                    />
                    <p className="text-xs text-gray-600 mt-2">
                      זהו תעריף קבוע שלא ישתנה אוטומטית עם שינויים בתעריף היומי
                      הגלובלי
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                ביטול
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'שומר...' : laborType ? 'עדכן' : 'הוסף'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
