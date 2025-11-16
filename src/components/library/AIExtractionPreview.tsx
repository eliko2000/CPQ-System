import React, { useState } from 'react';
import { CheckCircle, Edit2, Trash2, AlertTriangle, TrendingUp, Package, Sparkles, GitMerge, Plus } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import type { AIExtractionResult, AIExtractedComponent } from '../../services/claudeAI';
import type { Component, ComponentMatchDecision } from '../../types';

// Type guards for metadata
interface ExcelMetadata {
  sheetName?: string;
  rowCount?: number;
  columnHeaders?: string[];
  detectedColumns?: Record<string, number>;
  sheetsProcessed?: number;
}

interface PDFMetadata {
  pageCount?: number;
  textLength?: number;
  extractionMethod?: 'text' | 'structured';
  hasTabularData?: boolean;
}

function hasExcelMetadata(metadata: unknown): metadata is ExcelMetadata {
  return typeof metadata === 'object' && metadata !== null && 'sheetName' in metadata;
}

function hasPDFMetadata(metadata: unknown): metadata is PDFMetadata {
  return typeof metadata === 'object' && metadata !== null && 'pageCount' in metadata;
}

interface AIExtractionPreviewProps {
  extractionResult: AIExtractionResult;
  matchDecisions?: ComponentMatchDecision[];
  onConfirm: (components: Partial<Component>[], decisions: ComponentMatchDecision[]) => void;
  onCancel: () => void;
}

type ComponentStatus = 'approved' | 'modified' | 'rejected';

interface PreviewComponent extends AIExtractedComponent {
  id: string;
  status: ComponentStatus;
  isEditing: boolean;
  matchDecision?: ComponentMatchDecision;
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
  matchDecisions = [],
  onConfirm,
  onCancel,
}) => {
  const [components, setComponents] = useState<PreviewComponent[]>(
    extractionResult.components.map((c, idx) => ({
      ...c,
      id: `extracted-${idx}`,
      status: 'approved' as ComponentStatus,
      isEditing: false,
      matchDecision: matchDecisions.find(d => d.componentIndex === idx),
    }))
  );

  const [localMatchDecisions, setLocalMatchDecisions] = useState<ComponentMatchDecision[]>(matchDecisions);

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

  /**
   * Handle match decision change
   */
  const handleMatchDecision = (componentIndex: number, decision: 'accept_match' | 'create_new') => {
    setLocalMatchDecisions((prev) =>
      prev.map((d) =>
        d.componentIndex === componentIndex
          ? { ...d, userDecision: decision }
          : d
      )
    );

    // Also update the component's match decision
    setComponents((prev) =>
      prev.map((c, idx) =>
        idx === componentIndex && c.matchDecision
          ? { ...c, matchDecision: { ...c.matchDecision, userDecision: decision } }
          : c
      )
    );
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

    onConfirm(approvedComponents, localMatchDecisions);
  };

  const approvedCount = components.filter((c) => c.status === 'approved').length;
  const modifiedCount = components.filter((c) => c.status === 'modified').length;

  // Match statistics
  const matchedCount = components.filter((c) => c.matchDecision && c.matchDecision.matches.length > 0).length;
  const acceptedMatchCount = localMatchDecisions.filter((d) => d.userDecision === 'accept_match').length;
  const newComponentCount = components.length - acceptedMatchCount;

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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-blue-700 mb-1">
              <Package className="w-4 h-4" />
              <span className="text-sm font-medium">סה"כ נמצאו</span>
            </div>
            <p className="text-2xl font-bold text-blue-900">{components.length}</p>
          </div>

          <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-cyan-700 mb-1">
              <GitMerge className="w-4 h-4" />
              <span className="text-sm font-medium">זוהו קיימים</span>
            </div>
            <p className="text-2xl font-bold text-cyan-900">{matchedCount}</p>
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

        {/* Match Summary */}
        {matchedCount > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <GitMerge className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-medium text-blue-900">סיכום זיהוי רכיבים</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div>
                <span className="text-blue-700">רכיבים דומים שנמצאו:</span>
                <p className="font-bold text-blue-900">{matchedCount}</p>
              </div>
              <div>
                <span className="text-green-700">יעדכנו מחיר:</span>
                <p className="font-bold text-green-900">{acceptedMatchCount}</p>
              </div>
              <div>
                <span className="text-purple-700">יווצרו חדשים:</span>
                <p className="font-bold text-purple-900">{newComponentCount}</p>
              </div>
            </div>
            {localMatchDecisions.filter(d => d.userDecision === 'pending').length > 0 && (
              <div className="mt-2 text-xs text-blue-600 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                <span>
                  יש {localMatchDecisions.filter(d => d.userDecision === 'pending').length} רכיבים שממתינים להחלטה
                </span>
              </div>
            )}
          </div>
        )}

        {/* Document Metadata */}
        <div className="bg-gray-50 border rounded-lg p-4">
          <h3 className="text-sm font-medium mb-3">מידע על המסמך</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">שיטת חילוץ:</span>
              <p className="font-medium capitalize">
                {extractionResult.metadata.documentType === 'excel' && '⚡ Excel Parser'}
                {extractionResult.metadata.documentType === 'pdf' && '📄 PDF Parser'}
                {extractionResult.metadata.documentType === 'image' && '🤖 AI Vision'}
                {!['excel', 'pdf', 'image'].includes(extractionResult.metadata.documentType) && extractionResult.metadata.documentType}
              </p>
            </div>

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

            {/* Excel-specific metadata */}
            {hasExcelMetadata(extractionResult.metadata) && extractionResult.metadata.sheetName && (
              <div>
                <span className="text-muted-foreground">גיליון:</span>
                <p className="font-medium">{extractionResult.metadata.sheetName}</p>
              </div>
            )}

            {hasExcelMetadata(extractionResult.metadata) && extractionResult.metadata.rowCount !== undefined && (
              <div>
                <span className="text-muted-foreground">שורות:</span>
                <p className="font-medium">{extractionResult.metadata.rowCount}</p>
              </div>
            )}

            {/* PDF-specific metadata */}
            {hasPDFMetadata(extractionResult.metadata) && extractionResult.metadata.pageCount && (
              <div>
                <span className="text-muted-foreground">עמודים:</span>
                <p className="font-medium">{extractionResult.metadata.pageCount}</p>
              </div>
            )}

            {hasPDFMetadata(extractionResult.metadata) && extractionResult.metadata.extractionMethod && (
              <div>
                <span className="text-muted-foreground">סוג חילוץ:</span>
                <p className="font-medium capitalize">
                  {extractionResult.metadata.extractionMethod === 'structured' ? 'טבלאי' : 'טקסט חופשי'}
                </p>
              </div>
            )}
          </div>

          {/* Excel detected columns info */}
          {hasExcelMetadata(extractionResult.metadata) &&
           extractionResult.metadata.detectedColumns &&
           Object.keys(extractionResult.metadata.detectedColumns).length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <span className="text-xs text-muted-foreground">עמודות שזוהו:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {Object.keys(extractionResult.metadata.detectedColumns).map((col) => (
                  <span key={col} className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                    {col}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* PDF quality warning */}
          {extractionResult.metadata.documentType === 'pdf' &&
           extractionResult.confidence < 0.5 && (
            <div className="mt-3 pt-3 border-t bg-yellow-50 -mx-4 -mb-4 px-4 py-3 rounded-b-lg">
              <p className="text-xs text-yellow-800">
                💡 <strong>טיפ:</strong> איכות החילוץ מ-PDF נמוכה. לתוצאות טובות יותר, המר את ה-PDF לתמונה והשתמש בניתוח AI Vision.
              </p>
            </div>
          )}
        </div>
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

            {/* Match Information Card */}
            {component.matchDecision && component.matchDecision.matches.length > 0 && (
              <div className="mb-3 p-3 border rounded-lg bg-blue-50 border-blue-200">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <GitMerge className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">
                        זוהה רכיב דומה בספרייה
                      </span>
                      <Badge
                        variant={
                          component.matchDecision.matchType === 'exact'
                            ? 'default'
                            : component.matchDecision.matchType === 'fuzzy'
                            ? 'secondary'
                            : 'outline'
                        }
                        className="text-xs"
                      >
                        {component.matchDecision.matchType === 'exact' && '🎯 התאמה מדויקת'}
                        {component.matchDecision.matchType === 'fuzzy' && '📊 התאמה מטושטשת'}
                        {component.matchDecision.matchType === 'ai' && '🤖 התאמה סמנטית'}
                      </Badge>
                      <span className="text-xs text-blue-700 font-medium">
                        {Math.round(component.matchDecision.matches[0].confidence * 100)}% דיוק
                      </span>
                    </div>

                    <div className="text-sm space-y-1 text-blue-800">
                      <div>
                        <span className="font-medium">רכיב קיים:</span>{' '}
                        {component.matchDecision.matches[0].component.name}
                      </div>
                      {component.matchDecision.matches[0].component.manufacturerPN && (
                        <div>
                          <span className="font-medium">מק"ט:</span>{' '}
                          {component.matchDecision.matches[0].component.manufacturerPN}
                        </div>
                      )}
                      <div className="text-xs text-blue-600 mt-1">
                        {component.matchDecision.matches[0].reasoning}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      variant={
                        component.matchDecision.userDecision === 'accept_match' ? 'default' : 'outline'
                      }
                      onClick={() => {
                        const idx = parseInt(component.id.replace('extracted-', ''));
                        handleMatchDecision(idx, 'accept_match');
                      }}
                      className="gap-1 whitespace-nowrap"
                    >
                      <GitMerge className="w-3 h-3" />
                      עדכן מחיר
                    </Button>
                    <Button
                      size="sm"
                      variant={
                        component.matchDecision.userDecision === 'create_new' ? 'default' : 'outline'
                      }
                      onClick={() => {
                        const idx = parseInt(component.id.replace('extracted-', ''));
                        handleMatchDecision(idx, 'create_new');
                      }}
                      className="gap-1 whitespace-nowrap"
                    >
                      <Plus className="w-3 h-3" />
                      צור חדש
                    </Button>
                  </div>
                </div>
              </div>
            )}

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
