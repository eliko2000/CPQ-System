import { Component, Assembly } from '../../types';
import { Button } from '../ui/button';
import { X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  calculateAssemblyPricing,
  formatAssemblyPricing,
} from '../../utils/assemblyCalculations';
import { useClickOutside } from '../../hooks/useClickOutside';

interface AddItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tab: 'components' | 'assemblies';
  onTabChange: (tab: 'components' | 'assemblies') => void;
  searchText: string;
  onSearchChange: (text: string) => void;
  components: Component[];
  assemblies: Assembly[];
  filteredComponents: Component[];
  filteredAssemblies: Assembly[];
  onAddComponent: (component: Component) => void;
  onAddAssembly: (assembly: Assembly) => void;
}

export function AddItemDialog({
  isOpen,
  onClose,
  tab,
  onTabChange,
  searchText,
  onSearchChange,
  components,
  assemblies,
  filteredComponents,
  filteredAssemblies,
  onAddComponent,
  onAddAssembly,
}: AddItemDialogProps) {
  const componentSelectorRef = useClickOutside<HTMLDivElement>(onClose);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        ref={componentSelectorRef}
        className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden"
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              בחר רכיב מהספרייה
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Tabs */}
          <Tabs
            value={tab}
            onValueChange={v => onTabChange(v as 'components' | 'assemblies')}
          >
            <TabsList className="mb-4">
              <TabsTrigger value="components">
                רכיבים ({components.length})
              </TabsTrigger>
              <TabsTrigger value="assemblies">
                הרכבות ({assemblies.length})
              </TabsTrigger>
            </TabsList>

            <div className="mb-4">
              <input
                type="text"
                value={searchText}
                onChange={e => onSearchChange(e.target.value)}
                placeholder={
                  tab === 'components'
                    ? 'חפש לפי שם, יצרן או קטגוריה...'
                    : 'חפש הרכבה לפי שם או תיאור...'
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>

            {/* Components Tab */}
            <TabsContent value="components" className="mt-0">
              <div className="overflow-y-auto max-h-[50vh]">
                {filteredComponents.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">
                      לא נמצאו רכיבים התואמים לחיפוש
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredComponents.map(component => (
                      <div
                        key={component.id}
                        className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                        onClick={() => onAddComponent(component)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-gray-900">
                            {component.name}
                          </h4>
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {component.category}
                          </span>
                        </div>

                        <p className="text-sm text-gray-600 mb-3">
                          {component.manufacturer}
                        </p>

                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">מחיר יחידה:</span>
                            <span className="font-mono">
                              ₪
                              {component.unitCostNIS?.toLocaleString('he-IL', {
                                minimumFractionDigits: 2,
                              }) || '0.00'}
                            </span>
                          </div>
                          {component.unitCostUSD && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">מחיר דולר:</span>
                              <span className="font-mono">
                                ${component.unitCostUSD.toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Assemblies Tab */}
            <TabsContent value="assemblies" className="mt-0">
              <div className="overflow-y-auto max-h-[50vh]">
                {filteredAssemblies.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">
                      לא נמצאו הרכבות התואמות לחיפוש
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredAssemblies.map(assembly => {
                      const pricing = calculateAssemblyPricing(assembly);
                      const formatted = formatAssemblyPricing(pricing);
                      return (
                        <div
                          key={assembly.id}
                          className="border border-gray-200 rounded-lg p-4 hover:border-green-300 hover:shadow-md transition-all cursor-pointer"
                          onClick={() => onAddAssembly(assembly)}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium text-gray-900">
                              {assembly.name}
                            </h4>
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                              {pricing.componentCount} רכיבים
                            </span>
                          </div>

                          {assembly.description && (
                            <p className="text-sm text-gray-600 mb-3">
                              {assembly.description}
                            </p>
                          )}

                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">מחיר כולל:</span>
                              <span className="font-mono font-semibold">
                                {formatted.nis}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatted.usd} • {formatted.eur}
                            </div>
                          </div>

                          {!assembly.isComplete && (
                            <div className="mt-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                              ⚠ הרכבה לא שלמה
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
