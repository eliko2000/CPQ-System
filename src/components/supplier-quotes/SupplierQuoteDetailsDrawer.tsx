/**
 * Supplier Quote Details Drawer
 *
 * Displays detailed information about a supplier quote including
 * all linked components that were added/updated from this quote
 */

import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { useSupplierQuotes } from '../../hooks/useSupplierQuotes';
import { SupplierQuote, Component } from '../../types';
import { logger } from '@/lib/logger'
import {
  X,
  FileText,
  Building2,
  Calendar,
  Package,
  TrendingUp,
  Download,
  DollarSign,
  Tag,
  Loader2
} from 'lucide-react';

interface SupplierQuoteDetailsDrawerProps {
  quoteId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function SupplierQuoteDetailsDrawer({
  quoteId,
  isOpen,
  onClose
}: SupplierQuoteDetailsDrawerProps) {
  const { getQuoteWithComponents } = useSupplierQuotes();
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<SupplierQuote | null>(null);
  const [components, setComponents] = useState<Array<{
    history: any;
    component: Component;
  }>>([]);

  useEffect(() => {
    if (isOpen && quoteId) {
      loadQuoteDetails();
    }
  }, [isOpen, quoteId]);

  const loadQuoteDetails = async () => {
    if (!quoteId) return;

    setLoading(true);
    try {
      const result = await getQuoteWithComponents(quoteId);
      if (result) {
        setQuote(result.quote);
        setComponents(result.components);
      }
    } catch (error) {
      logger.error('Error loading quote details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" dir="rtl">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="absolute left-0 top-0 h-full w-full max-w-2xl bg-background shadow-xl">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6 text-blue-500" />
              <div>
                <h2 className="text-xl font-semibold">פרטי הצעת ספק</h2>
                <p className="text-sm text-muted-foreground">
                  {quote?.fileName || 'טוען...'}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : quote ? (
              <div className="space-y-6">
                {/* Quote Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      מידע כללי
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">ספק</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <p className="font-medium">
                            {quote.supplierName || 'לא צוין'}
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">תאריך הצעה</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <p className="font-medium">
                            {quote.quoteDate
                              ? new Date(quote.quoteDate).toLocaleDateString('he-IL')
                              : 'לא צוין'}
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">מספר הצעה</p>
                        <p className="font-medium">
                          {quote.quoteNumber || 'לא צוין'}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">סטטוס</p>
                        <Badge
                          className={
                            quote.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : quote.status === 'processing'
                              ? 'bg-blue-100 text-blue-800'
                              : quote.status === 'error'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }
                        >
                          {quote.status === 'completed'
                            ? 'הושלם'
                            : quote.status === 'processing'
                            ? 'בעיבוד'
                            : quote.status === 'error'
                            ? 'שגיאה'
                            : quote.status}
                        </Badge>
                      </div>
                    </div>

                    <div className="pt-3 border-t">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            שיטת חילוץ
                          </p>
                          <p className="font-medium">
                            {quote.extractionMethod === 'native'
                              ? 'Excel מקורי'
                              : quote.extractionMethod === 'text'
                              ? 'חילוץ טקסט'
                              : quote.extractionMethod === 'structured'
                              ? 'מובנה'
                              : quote.extractionMethod === 'ai_vision'
                              ? 'AI Vision'
                              : quote.extractionMethod || 'לא זמין'}
                          </p>
                        </div>

                        <div>
                          <p className="text-sm text-muted-foreground">דיוק</p>
                          <div className="flex items-center gap-2">
                            <TrendingUp
                              className={`h-4 w-4 ${
                                (quote.confidenceScore || 0) >= 0.8
                                  ? 'text-green-600'
                                  : (quote.confidenceScore || 0) >= 0.6
                                  ? 'text-yellow-600'
                                  : 'text-red-600'
                              }`}
                            />
                            <p
                              className={`font-medium ${
                                (quote.confidenceScore || 0) >= 0.8
                                  ? 'text-green-600'
                                  : (quote.confidenceScore || 0) >= 0.6
                                  ? 'text-yellow-600'
                                  : 'text-red-600'
                              }`}
                            >
                              {quote.confidenceScore
                                ? `${(quote.confidenceScore * 100).toFixed(0)}%`
                                : 'לא זמין'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {quote.notes && (
                      <div className="pt-3 border-t">
                        <p className="text-sm text-muted-foreground">הערות</p>
                        <p className="mt-1">{quote.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Linked Components */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        רכיבים מקושרים
                      </div>
                      <Badge variant="secondary">
                        {components.length} רכיבים
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {components.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>אין רכיבים מקושרים להצעה זו</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {components.map(({ history, component }, index) => (
                          <div
                            key={history.id || index}
                            className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <h4 className="font-medium">{component.name}</h4>
                                {component.description && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {component.description}
                                  </p>
                                )}
                              </div>
                              {history.isCurrentPrice && (
                                <Badge className="bg-green-100 text-green-800">
                                  מחיר נוכחי
                                </Badge>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <p className="text-muted-foreground">יצרן</p>
                                <div className="flex items-center gap-1 mt-1">
                                  <Building2 className="h-3 w-3 text-muted-foreground" />
                                  <p>{component.manufacturer || 'לא צוין'}</p>
                                </div>
                              </div>

                              <div>
                                <p className="text-muted-foreground">מק"ט יצרן</p>
                                <div className="flex items-center gap-1 mt-1">
                                  <Tag className="h-3 w-3 text-muted-foreground" />
                                  <p className="font-mono text-xs">
                                    {component.manufacturerPN || 'לא צוין'}
                                  </p>
                                </div>
                              </div>

                              <div>
                                <p className="text-muted-foreground">קטגוריה</p>
                                <Badge variant="secondary" className="mt-1">
                                  {component.category}
                                </Badge>
                              </div>

                              <div>
                                <p className="text-muted-foreground">מחיר</p>
                                <div className="flex items-center gap-1 mt-1">
                                  <DollarSign className="h-3 w-3 text-muted-foreground" />
                                  <p className="font-medium">
                                    {history.currency === 'USD' && history.unitPriceUSD
                                      ? `$${history.unitPriceUSD.toFixed(2)}`
                                      : history.currency === 'EUR' && history.unitPriceEUR
                                      ? `€${history.unitPriceEUR.toFixed(2)}`
                                      : history.unitPriceNIS
                                      ? `₪${history.unitPriceNIS.toFixed(2)}`
                                      : 'לא זמין'}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {history.confidenceScore && (
                              <div className="mt-2 pt-2 border-t">
                                <p className="text-xs text-muted-foreground">
                                  דיוק חילוץ:{' '}
                                  <span
                                    className={`font-medium ${
                                      history.confidenceScore >= 0.8
                                        ? 'text-green-600'
                                        : history.confidenceScore >= 0.6
                                        ? 'text-yellow-600'
                                        : 'text-red-600'
                                    }`}
                                  >
                                    {(history.confidenceScore * 100).toFixed(0)}%
                                  </span>
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>לא נמצאו פרטים עבור הצעה זו</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t px-6 py-4 flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              סגור
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
