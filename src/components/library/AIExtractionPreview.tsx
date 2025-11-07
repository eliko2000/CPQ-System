import React, { useState } from 'react';
import { CheckCircle, Edit2, Trash2, AlertTriangle, TrendingUp, Package, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import type { AIExtractionResult, AIExtractedComponent } from '../../services/claudeAI';
import type { Component } from '../../types';

interface AIExtractionPreviewProps {
  extractionResult: AIExtractionResult;
  onConfirm: (components: Partial<Component>[]) => void;
  onCancel: () => void;
}

type ComponentStatus = 'approved' | 'modified' | 'rejected';

interface PreviewComponent extends AIExtractedComponent {
  id: string;
  status: ComponentStatus;
  isEditing: boolean;
}

const CATEGORIES = [
  'בקרים',
  'חיישנים',
  'אקטואטורים',
  'מנועים',
  'ספקי כוח',
  'תקשורת',
  'בטיחות',
  'מכני',
  'כבלים ומחברים',
  'אחר',
];

export const AIExtractionPreview: React.FC<AIExtractionPreviewProps> = ({
  extractionResult,
  onConfirm,
  onCancel,
}) => {
  const [components, setComponents] = useState<PreviewComponent[]>(
    extractionResult.components.map((c, idx) => ({
      ...c,
      id: `extracted-${idx}`,
      status: 'approved' as ComponentStatus,
      isEditing: false,
    }))
  );

  const handleStatusChange = (id: string, status: ComponentStatus) => {
    setComponents((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status, isEditing: false } : c))
    );
  };

  const handleEdit = (id: string) => {
    setComponents((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isEditing: !c.isEditing } : c))
    );
  };

  const handleFieldChange = (id: string, field: keyof AIExtractedComponent, value: any) => {
    setComponents((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, [field]: value, status: 'modified' as ComponentStatus } : c
      )
    );
  };

  const handleDelete = (id: string) => {
    setComponents((prev) => prev.filter((c) => c.id !== id));
  };

  const handleConfirm = () => {
    const approvedComponents = components
      .filter((c) => c.status !== 'rejected')
      .map((c): Partial<Component> => ({
        name: c.name,
        description: c.description,
        category: c.category || 'אחר',
        manufacturer: c.manufacturer || '',
        manufacturerPN: c.manufacturerPN || '',
        supplier: c.supplier || extractionResult.metadata.supplier || '',
        unitCostNIS: c.unitPriceNIS || 0,
        unitCostUSD: c.unitPriceUSD,
        unitCostEUR: c.unitPriceEUR,
        currency: c.currency || 'NIS',
        originalCost: c.unitPriceNIS || c.unitPriceUSD || c.unitPriceEUR || 0,
        quoteDate: c.quoteDate || extractionResult.metadata.quoteDate || new Date().toISOString().split('T')[0],
        quoteFileUrl: '', // Will be set when saved
        notes: c.notes,
      }));

    onConfirm(approvedComponents);
  };

  const approvedCount = components.filter((c) => c.status === 'approved').length;
  const modifiedCount = components.filter((c) => c.status === 'modified').length;

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-purple-500" />
          <h2 className="text-xl font-semibold">סקירת רכיבים שחולצו</h2>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-blue-700 mb-1">
              <Package className="w-4 h-4" />
              <span className="text-sm font-medium">סה"כ נמצאו</span>
            </div>
            <p className="text-2xl font-bold text-blue-900">{components.length}</p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-700 mb-1">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">אושרו</span>
            </div>
            <p className="text-2xl font-bold text-green-900">{approvedCount}</p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-yellow-700 mb-1">
              <Edit2 className="w-4 h-4" />
              <span className="text-sm font-medium">שונו</span>
            </div>
            <p className="text-2xl font-bold text-yellow-900">{modifiedCount}</p>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-purple-700 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm font-medium">רמת ביטחון</span>
            </div>
            <p className="text-2xl font-bold text-purple-900">
              {Math.round(extractionResult.confidence * 100)}%
            </p>
          </div>
        </div>

        {/* Document Metadata */}
        {extractionResult.metadata.supplier && (
          <div className="bg-gray-50 border rounded-lg p-4">
            <h3 className="text-sm font-medium mb-2">מידע על המסמך</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {extractionResult.metadata.supplier && (
                <div>
                  <span className="text-muted-foreground">ספק:</span>
                  <p className="font-medium">{extractionResult.metadata.supplier}</p>
                </div>
              )}
              {extractionResult.metadata.quoteDate && (
                <div>
                  <span className="text-muted-foreground">תאריך:</span>
                  <p className="font-medium">{extractionResult.metadata.quoteDate}</p>
                </div>
              )}
              {extractionResult.metadata.currency && (
                <div>
                  <span className="text-muted-foreground">מטבע:</span>
                  <p className="font-medium">{extractionResult.metadata.currency}</p>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">סוג:</span>
                <p className="font-medium capitalize">{extractionResult.metadata.documentType}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Components List */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
        {components.map((component) => (
          <div
            key={component.id}
            className={`border rounded-lg p-4 transition-all ${
              component.status === 'rejected'
                ? 'opacity-50 bg-gray-50'
                : component.status === 'modified'
                ? 'border-yellow-300 bg-yellow-50'
                : 'border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {component.isEditing ? (
                    <Input
                      value={component.name}
                      onChange={(e) => handleFieldChange(component.id, 'name', e.target.value)}
                      className="font-medium"
                    />
                  ) : (
                    <h4 className="font-medium">{component.name}</h4>
                  )}
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${getConfidenceColor(
                      component.confidence
                    )}`}
                  >
                    {getConfidenceLabel(component.confidence)}
                  </span>
                </div>
                {component.description && !component.isEditing && (
                  <p className="text-sm text-muted-foreground">{component.description}</p>
                )}
              </div>

              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant={component.status === 'approved' ? 'default' : 'outline'}
                  onClick={() => handleStatusChange(component.id, 'approved')}
                  title="Approve"
                >
                  <CheckCircle className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEdit(component.id)}
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(component.id)}
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </div>

            {component.isEditing && (
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-xs text-muted-foreground">יצרן</label>
                  <Input
                    value={component.manufacturer || ''}
                    onChange={(e) => handleFieldChange(component.id, 'manufacturer', e.target.value)}
                    placeholder="יצרן"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">מק"ט</label>
                  <Input
                    value={component.manufacturerPN || ''}
                    onChange={(e) => handleFieldChange(component.id, 'manufacturerPN', e.target.value)}
                    placeholder='מק"ט'
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">קטגוריה</label>
                  <Select
                    value={component.category || 'אחר'}
                    onValueChange={(value: string) => handleFieldChange(component.id, 'category', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">מחיר (₪)</label>
                  <Input
                    type="number"
                    value={component.unitPriceNIS || ''}
                    onChange={(e) =>
                      handleFieldChange(component.id, 'unitPriceNIS', parseFloat(e.target.value))
                    }
                    placeholder="0.00"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">יצרן:</span>
                <p className="font-medium truncate">{component.manufacturer || '—'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">מק"ט:</span>
                <p className="font-medium truncate">{component.manufacturerPN || '—'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">קטגוריה:</span>
                <p className="font-medium">{component.category || '—'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">מחירים:</span>
                <div className="flex gap-2">
                  {component.unitPriceNIS && (
                    <p className={`font-medium ${component.currency === 'NIS' ? 'text-green-600' : ''}`}>
                      ₪{component.unitPriceNIS.toFixed(2)}
                    </p>
                  )}
                  {component.unitPriceUSD && (
                    <p className={`font-medium ${component.currency === 'USD' ? 'text-green-600' : ''}`}>
                      ${component.unitPriceUSD.toFixed(2)}
                    </p>
                  )}
                  {component.unitPriceEUR && (
                    <p className={`font-medium ${component.currency === 'EUR' ? 'text-green-600' : ''}`}>
                      €{component.unitPriceEUR.toFixed(2)}
                    </p>
                  )}
                  {!component.unitPriceNIS && !component.unitPriceUSD && !component.unitPriceEUR && '—'}
                </div>
              </div>
            </div>

            {component.notes && (
              <div className="mt-2 text-xs text-muted-foreground bg-gray-100 p-2 rounded">
                <span className="font-medium">הערות:</span> {component.notes}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Low Confidence Warning */}
      {extractionResult.confidence < 0.7 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-yellow-900">מומלץ לבדוק</h4>
              <p className="text-sm text-yellow-700 mt-1">
                רמת הביטחון של ה-AI בחילוץ זה היא מתחת ל-70%. אנא בדוק את כל השדות בקפידה לפני הייבוא.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between items-center pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          ביטול
        </Button>
        <div className="flex gap-2">
          <div className="text-sm text-muted-foreground mr-4">
            {approvedCount + modifiedCount} רכיבים ייובאו
          </div>
          <Button
            onClick={handleConfirm}
            disabled={approvedCount + modifiedCount === 0}
            className="min-w-[120px]"
          >
            ייבא לספרייה
          </Button>
        </div>
      </div>
    </div>
  );
};
