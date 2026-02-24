import { Assembly, AssemblyWithPricing } from '../../types';
import {
  calculateAssemblyPricing,
  formatAssemblyPricing,
  getAssemblyPricingBreakdown,
} from '../../utils/assemblyCalculations';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Button } from '../ui/button';
import { Edit, Trash2, AlertTriangle, Package } from 'lucide-react';
import { Badge } from '../ui/badge';

interface AssemblyGridProps {
  assemblies: Assembly[];
  onEdit: (assembly: Assembly) => void;
  onDelete: (assemblyId: string, assemblyName: string) => void;
}

export function AssemblyGrid({
  assemblies,
  onEdit,
  onDelete,
}: AssemblyGridProps) {
  // Calculate pricing for each assembly
  const assembliesWithPricing: AssemblyWithPricing[] = assemblies.map(
    assembly => ({
      ...assembly,
      pricing: calculateAssemblyPricing(assembly),
    })
  );

  if (assemblies.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">אין הרכבות עדיין</h3>
          <p className="text-muted-foreground text-center">
            צור הרכבה ראשונה מקבוצת רכיבים
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {assembliesWithPricing.map(assembly => {
        const formatted = formatAssemblyPricing(assembly.pricing);
        const breakdown = getAssemblyPricingBreakdown(assembly.pricing);

        return (
          <Card key={assembly.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg">{assembly.name}</h3>
                    {!assembly.isComplete && (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        לא שלם
                      </Badge>
                    )}
                  </div>
                  {assembly.description && (
                    <p className="text-sm text-muted-foreground">
                      {assembly.description}
                    </p>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {/* Component count */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">רכיבים:</span>
                <span className="font-medium">
                  {assembly.pricing.componentCount}
                  {assembly.pricing.missingComponentCount > 0 && (
                    <span className="text-destructive mr-1">
                      ({assembly.pricing.missingComponentCount} חסרים)
                    </span>
                  )}
                </span>
              </div>

              {/* Pricing */}
              <div className="border-t pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">מחיר כולל:</span>
                  <span className="font-bold text-lg">{formatted.primary}</span>
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex justify-between">
                    <span>USD:</span>
                    <span>{formatted.usd}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>EUR:</span>
                    <span>{formatted.eur}</span>
                  </div>
                </div>
              </div>

              {/* Breakdown */}
              {breakdown && (
                <div
                  className="text-xs text-muted-foreground border-t pt-2 text-right"
                  dir="rtl"
                >
                  {breakdown}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => onEdit(assembly)}
                >
                  <Edit className="h-4 w-4 ml-1" />
                  ערוך
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(assembly.id, assembly.name)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
