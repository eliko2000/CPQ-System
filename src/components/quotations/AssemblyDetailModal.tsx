import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Assembly } from '../../types';
import { calculateAssemblyPricing, formatAssemblyPricing } from '../../utils/assemblyCalculations';
import { Badge } from '../ui/badge';
import { Package, AlertTriangle } from 'lucide-react';

interface AssemblyDetailModalProps {
  assembly: Assembly | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AssemblyDetailModal({ assembly, isOpen, onClose }: AssemblyDetailModalProps) {
  if (!assembly) return null;

  const pricing = calculateAssemblyPricing(assembly);
  const formatted = formatAssemblyPricing(pricing);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold">{assembly.name}</DialogTitle>
            {!assembly.isComplete && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                לא שלם
              </Badge>
            )}
          </div>
          {assembly.description && (
            <p className="text-sm text-muted-foreground mt-2">{assembly.description}</p>
          )}
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Pricing Summary */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="font-semibold mb-3">סיכום מחירים</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">ש"ח</div>
                <div className="text-xl font-bold">{formatted.nis}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">USD</div>
                <div className="text-xl font-bold">{formatted.usd}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">EUR</div>
                <div className="text-xl font-bold">{formatted.eur}</div>
              </div>
            </div>

            {/* Breakdown */}
            {pricing.breakdown && (
              <div className="mt-4 pt-4 border-t space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">רכיבים בש"ח:</span>
                  <span className="font-medium">
                    {pricing.breakdown.nisComponents.count} פריטים
                    {' • '}
                    ₪{pricing.breakdown.nisComponents.total.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {pricing.breakdown.usdComponents.count > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">רכיבים ב-USD:</span>
                    <span className="font-medium">
                      {pricing.breakdown.usdComponents.count} פריטים
                      {' • '}
                      ${pricing.breakdown.usdComponents.total.toFixed(2)}
                    </span>
                  </div>
                )}
                {pricing.breakdown.eurComponents.count > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">רכיבים ב-EUR:</span>
                    <span className="font-medium">
                      {pricing.breakdown.eurComponents.count} פריטים
                      {' • '}
                      €{pricing.breakdown.eurComponents.total.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Components List */}
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Package className="h-4 w-4" />
              רכיבים בהרכבה ({assembly.components.length})
            </h3>
            <div className="border rounded-lg overflow-hidden">
              {assembly.components.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  אין רכיבים בהרכבה זו
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr className="border-b">
                      <th className="text-right p-2 font-semibold">שם</th>
                      <th className="text-right p-2 font-semibold">יצרן / מק"ט</th>
                      <th className="text-center p-2 font-semibold">כמות</th>
                      <th className="text-left p-2 font-semibold">מחיר יחידה</th>
                      <th className="text-left p-2 font-semibold">סה"כ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {assembly.components.map((assemblyComp, index) => {
                      const component = assemblyComp.component;
                      const isDeleted = !component || !assemblyComp.componentId;

                      return (
                        <tr key={assemblyComp.id || index} className="hover:bg-muted/30">
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              <span className={`font-medium ${isDeleted ? 'text-muted-foreground line-through' : ''}`}>
                                {assemblyComp.componentName || 'רכיב לא ידוע'}
                              </span>
                              {isDeleted && (
                                <Badge variant="destructive" className="text-xs px-1 py-0">
                                  נמחק
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="p-2 text-muted-foreground">
                            {component ? (
                              <span>{component.manufacturer} • {component.manufacturerPN}</span>
                            ) : assemblyComp.componentManufacturer ? (
                              <span>{assemblyComp.componentManufacturer} • {assemblyComp.componentPartNumber}</span>
                            ) : (
                              <span>—</span>
                            )}
                          </td>
                          <td className="p-2 text-center font-medium">
                            {assemblyComp.quantity}
                          </td>
                          <td className="p-2 font-mono text-left">
                            {component ? (
                              `₪${component.unitCostNIS?.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="p-2 font-mono font-semibold text-left">
                            {component ? (
                              `₪${(component.unitCostNIS * assemblyComp.quantity).toLocaleString('he-IL', { minimumFractionDigits: 2 })}`
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Notes */}
          {assembly.notes && (
            <div>
              <h3 className="font-semibold mb-2">הערות</h3>
              <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                {assembly.notes}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
