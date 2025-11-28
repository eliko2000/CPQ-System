import { Component, Assembly } from '../../types';
import { Button } from '../ui/button';
import { X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  calculateAssemblyPricing,
  formatAssemblyPricing,
} from '../../utils/assemblyCalculations';
import { useEffect, useRef } from 'react';
import { CustomItemForm, CustomItemData } from './CustomItemForm';

interface AddItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tab: 'components' | 'assemblies' | 'custom';
  onTabChange: (tab: 'components' | 'assemblies' | 'custom') => void;
  searchText: string;
  onSearchChange: (text: string) => void;
  components: Component[];
  assemblies: Assembly[];
  filteredComponents: Component[];
  filteredAssemblies: Assembly[];
  onAddComponent: (component: Component) => void;
  onAddAssembly: (assembly: Assembly) => void;
  onAddCustomItem: (data: CustomItemData) => void;
  defaultMarkup?: number;
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
  onAddCustomItem,
  defaultMarkup: __defaultMarkup,
}: AddItemDialogProps) {
  const componentSelectorRef = useRef<HTMLDivElement>(null);

  // Custom click outside handler that ignores Radix UI portals
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;

      // Ignore clicks on Radix UI portals (Select dropdowns, etc.)
      if (target.closest('[data-radix-popper-content-wrapper]')) {
        return;
      }

      // Ignore clicks on Radix Select triggers and content
      if (
        target.closest('[role="combobox"]') ||
        target.closest('[role="listbox"]')
      ) {
        return;
      }

      // Close if clicked outside the dialog
      if (
        componentSelectorRef.current &&
        !componentSelectorRef.current.contains(target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

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
            onValueChange={v =>
              onTabChange(v as 'components' | 'assemblies' | 'custom')
            }
          >
            <TabsList className="mb-4">
              <TabsTrigger value="components">
                רכיבים ({components.length})
              </TabsTrigger>
              <TabsTrigger value="assemblies">
                הרכבות ({assemblies.length})
              </TabsTrigger>
              <TabsTrigger value="custom">פריט מותאם אישית</TabsTrigger>
            </TabsList>

            {/* Hide search input for custom item tab */}
            {tab !== 'custom' && (
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
            )}

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
                              {Math.round(
                                component.unitCostNIS || 0
                              ).toLocaleString('he-IL')}
                            </span>
                          </div>
                          {component.unitCostUSD && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">מחיר דולר:</span>
                              <span className="font-mono">
                                ${Math.round(component.unitCostUSD)}
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

            {/* Custom Item Tab */}
            <TabsContent value="custom" className="mt-0">
              <div className="h-[55vh]">
                <CustomItemForm
                  onSubmit={data => {
                    onAddCustomItem(data);
                    onClose();
                  }}
                  onCancel={onClose}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
