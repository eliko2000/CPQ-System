import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Assembly, Component } from '../../types';
import { useCPQ } from '../../contexts/CPQContext';
import { Trash2, Search } from 'lucide-react';
import { calculateAssemblyPricing, formatAssemblyPricing } from '../../utils/assemblyCalculations';
import { Badge } from '../ui/badge';

interface AssemblyFormProps {
  assembly?: Assembly | null;
  isOpen: boolean;
  onClose: () => void;
}

interface AssemblyComponentEntry {
  componentId: string;
  quantity: number;
  component?: Component;
}

export function AssemblyForm({ assembly, isOpen, onClose }: AssemblyFormProps) {
  const { components, addAssembly, updateAssembly } = useCPQ();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedComponents, setSelectedComponents] = useState<AssemblyComponentEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form when assembly changes
  useEffect(() => {
    if (assembly) {
      setName(assembly.name);
      setDescription(assembly.description || '');
      setNotes(assembly.notes || '');

      // Convert assembly components to form entries
      const entries: AssemblyComponentEntry[] = assembly.components
        .filter(ac => ac.componentId) // Only include non-deleted components
        .map(ac => ({
          componentId: ac.componentId!,
          quantity: ac.quantity,
          component: ac.component,
        }));
      setSelectedComponents(entries);
    } else {
      // Reset form for new assembly
      setName('');
      setDescription('');
      setNotes('');
      setSelectedComponents([]);
    }
    setError(null);
  }, [assembly, isOpen]);

  // Filter available components
  const availableComponents = useMemo(() => {
    return components.filter(comp => {
      const matchesSearch = searchTerm === '' ||
        comp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        comp.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        comp.manufacturerPN.toLowerCase().includes(searchTerm.toLowerCase());

      // Don't show already selected components
      const notSelected = !selectedComponents.some(sc => sc.componentId === comp.id);

      return matchesSearch && notSelected;
    });
  }, [components, selectedComponents, searchTerm]);

  // Calculate live pricing preview
  const pricingPreview = useMemo(() => {
    if (selectedComponents.length === 0) return null;

    // Create temporary assembly for pricing calculation
    const tempAssembly: Assembly = {
      id: 'temp',
      name: name || 'Preview',
      isComplete: true,
      components: selectedComponents.map((sc, index) => ({
        id: `temp-${index}`,
        assemblyId: 'temp',
        componentId: sc.componentId,
        componentName: sc.component?.name || '',
        quantity: sc.quantity,
        sortOrder: index,
        component: sc.component,
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const pricing = calculateAssemblyPricing(tempAssembly);
    const formatted = formatAssemblyPricing(pricing);

    return { pricing, formatted };
  }, [selectedComponents, name]);

  const handleAddComponent = (component: Component) => {
    setSelectedComponents([
      ...selectedComponents,
      {
        componentId: component.id,
        quantity: 1,
        component,
      },
    ]);
    setSearchTerm('');
  };

  const handleUpdateQuantity = (componentId: string, quantity: number) => {
    setSelectedComponents(
      selectedComponents.map(sc =>
        sc.componentId === componentId ? { ...sc, quantity: Math.max(0.01, quantity) } : sc
      )
    );
  };

  const handleRemoveComponent = (componentId: string) => {
    setSelectedComponents(selectedComponents.filter(sc => sc.componentId !== componentId));
  };

  const handleSubmit = async () => {
    setError(null);

    // Validation
    if (!name.trim()) {
      setError('שם ההרכבה הוא שדה חובה');
      return;
    }

    if (selectedComponents.length === 0) {
      setError('חייב להוסיף לפחות רכיב אחד להרכבה');
      return;
    }

    setIsSubmitting(true);

    try {
      const componentsData = selectedComponents.map(sc => ({
        componentId: sc.componentId,
        quantity: sc.quantity,
      }));

      if (assembly) {
        await updateAssembly(assembly.id, {
          name,
          description: description || undefined,
          notes: notes || undefined,
          components: componentsData,
        });
      } else {
        await addAssembly(name, componentsData, description || undefined, notes || undefined);
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save assembly');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>{assembly ? 'ערוך הרכבה' : 'הרכבה חדשה'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Name */}
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">שם ההרכבה *</label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="לדוגמה: תחנת אחיזה רובוטית"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">תיאור</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="תיאור קצר של ההרכבה..."
              rows={2}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Selected Components */}
          <div className="space-y-2">
            <label className="text-sm font-medium">רכיבים בהרכבה ({selectedComponents.length})</label>

            {selectedComponents.length === 0 ? (
              <div className="border border-dashed rounded-lg p-6 text-center text-muted-foreground">
                לא נבחרו רכיבים עדיין. חפש והוסף רכיבים למטה.
              </div>
            ) : (
              <div className="border rounded-lg divide-y">
                {selectedComponents.map((sc) => (
                  <div key={sc.componentId} className="p-3 flex items-center gap-3">
                    <div className="flex-1">
                      <div className="font-medium">{sc.component?.name || 'Unknown'}</div>
                      <div className="text-sm text-muted-foreground">
                        {sc.component?.manufacturer} • {sc.component?.manufacturerPN}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <label htmlFor={`qty-${sc.componentId}`} className="text-sm font-medium">
                        כמות:
                      </label>
                      <Input
                        id={`qty-${sc.componentId}`}
                        type="number"
                        min="0.01"
                        step="1"
                        value={sc.quantity}
                        onChange={(e) =>
                          handleUpdateQuantity(sc.componentId, parseFloat(e.target.value) || 1)
                        }
                        className="w-20"
                      />
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveComponent(sc.componentId)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Live Pricing Preview */}
          {pricingPreview && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="font-medium text-sm">תצוגה מקדימה של מחיר:</div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">NIS</div>
                  <div className="font-bold text-lg">{pricingPreview.formatted.nis}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">USD</div>
                  <div className="font-bold text-lg">{pricingPreview.formatted.usd}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">EUR</div>
                  <div className="font-bold text-lg">{pricingPreview.formatted.eur}</div>
                </div>
              </div>
              {pricingPreview.pricing.breakdown && (
                <div className="text-xs text-muted-foreground border-t pt-2 mt-2">
                  {pricingPreview.pricing.breakdown.nisComponents.count > 0 && (
                    <Badge variant="outline" className="mr-2">
                      {pricingPreview.pricing.breakdown.nisComponents.count} רכיבים בש"ח
                    </Badge>
                  )}
                  {pricingPreview.pricing.breakdown.usdComponents.count > 0 && (
                    <Badge variant="outline" className="mr-2">
                      {pricingPreview.pricing.breakdown.usdComponents.count} רכיבים ב-USD
                    </Badge>
                  )}
                  {pricingPreview.pricing.breakdown.eurComponents.count > 0 && (
                    <Badge variant="outline">
                      {pricingPreview.pricing.breakdown.eurComponents.count} רכיבים ב-EUR
                    </Badge>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Add Components */}
          <div className="space-y-2">
            <label className="text-sm font-medium">הוסף רכיבים</label>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="חפש רכיב לפי שם, יצרן, או מק&quot;ט..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>

            {searchTerm && (
              <div className="border rounded-lg max-h-60 overflow-y-auto">
                {availableComponents.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    לא נמצאו רכיבים תואמים
                  </div>
                ) : (
                  availableComponents.slice(0, 10).map((comp) => (
                    <button
                      key={comp.id}
                      onClick={() => handleAddComponent(comp)}
                      className="w-full p-3 text-right hover:bg-muted/50 border-b last:border-b-0 transition-colors"
                    >
                      <div className="font-medium">{comp.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {comp.manufacturer} • {comp.manufacturerPN} • {comp.category}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label htmlFor="notes" className="text-sm font-medium">הערות</label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="הערות נוספות..."
              rows={2}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            ביטול
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'שומר...' : assembly ? 'עדכן' : 'צור הרכבה'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
